/**
 * Dead-code gates for the two surfaces a typecheck can't reach:
 * the injected stylesheet and the copy dictionary.
 *
 * Both directions are asserted, because both broke in the single-pane
 * rewrite: a class the TSX uses but the stylesheet never declares renders
 * unstyled (that was the selected-row and provider-tag bug), and a class the
 * stylesheet declares that nothing uses is weight shipped to every session.
 *
 * The parsers, not the sources, are the fragile part — an earlier dead-CSS
 * cleanup was abandoned because the scanner reported live classes as dead
 * (template holes were tokenised raw). So every rule the scanners rely on is
 * pinned by the self-tests at the bottom of this file: if a parser degrades to
 * "sees nothing", it fails loudly instead of clearing the gate vacuously.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, extname } from 'node:path'
import { fileURLToPath } from 'node:url'

const clientDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'client')

/** Read every source file in the client half (tsx included — node can't import it). */
function sources() {
  return readdirSync(clientDir)
    .filter((name) => ['.ts', '.tsx'].includes(extname(name)))
    .map((name) => ({ name, text: readFileSync(join(clientDir, name), 'utf8') }))
}

/** Skip a quoted literal starting at `i`; returns the index just past its closer. */
function skipLiteral(text, i) {
  const quote = text[i]
  let j = i + 1
  while (j < text.length) {
    if (text[j] === '\\') { j += 2; continue }
    if (text[j] === quote) return j + 1
    j += 1
  }
  return j
}

/** Split a template literal body (without its backticks) into static runs and `${…}` holes. */
function splitTemplate(body) {
  const statics = []
  const holes = []
  let run = ''
  let i = 0
  while (i < body.length) {
    if (body[i] === '$' && body[i + 1] === '{') {
      let depth = 1
      let j = i + 2
      while (j < body.length && depth > 0) {
        if (body[j] === '{') depth += 1
        else if (body[j] === '}') depth -= 1
        j += 1
      }
      statics.push(run)
      run = ''
      holes.push(body.slice(i + 2, Math.max(i + 2, j - 1)))
      i = j
      continue
    }
    run += body[i]
    i += 1
  }
  statics.push(run)
  return { statics, holes }
}

/** Class-bearing string contents in a source slice, templates unwrapped recursively. */
function stringParts(text) {
  const out = []
  for (const match of text.matchAll(/(['"`])((?:\\.|(?!\1)[^\\])*)\1/g)) {
    if (match[1] !== '`') {
      out.push(match[2])
      continue
    }
    const { statics, holes } = splitTemplate(match[2])
    out.push(...statics)
    for (const hole of holes) out.push(...stringParts(hole))
  }
  return out
}

/** `${…}` hole bodies of every template literal in a source slice. */
function templateHoles(text) {
  const out = []
  for (const match of text.matchAll(/`((?:\\.|[^`\\])*)`/g)) out.push(...splitTemplate(match[1]).holes)
  return out
}

/** The value expression of every `className` attribute (quotes kept). */
function classExpressions(text) {
  const out = []
  for (const match of text.matchAll(/className\s*=\s*/g)) {
    let i = match.index + match[0].length
    if (text[i] === '{') {
      i += 1
      const start = i
      let depth = 0
      while (i < text.length) {
        const ch = text[i]
        if (ch === '"' || ch === "'" || ch === '`') { i = skipLiteral(text, i); continue }
        if (ch === '{') depth += 1
        else if (ch === '}') {
          if (depth === 0) break
          depth -= 1
        }
        i += 1
      }
      out.push(text.slice(start, i))
      continue
    }
    const end = skipLiteral(text, i)
    out.push(text.slice(i, end))
  }
  return out
}

/** Class tokens declared as selectors in a stylesheet source. */
function styledClasses(css) {
  const out = new Set()
  // Comments first: a commented-out `.dms-retired {}` is not a shipped rule.
  for (const match of css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/\.(-?[A-Za-z_][\w-]*)/g)) out.add(match[1])
  return out
}

/** Class tokens a component source actually puts on elements. */
function usedClasses(text) {
  const out = new Set()
  for (const expr of classExpressions(text)) {
    for (const part of stringParts(expr)) {
      for (const token of part.split(/\s+/)) {
        if (/^-?[A-Za-z_][\w-]*$/.test(token)) out.add(token)
      }
    }
  }
  return out
}

/** Keys of one dictionary object literal in locales.ts source. */
function dictKeys(localesText, name) {
  const body = localesText.slice(localesText.indexOf(`const ${name}`))
  const end = body.indexOf('\n};')
  const keys = new Set()
  for (const match of body.slice(0, end).matchAll(/^\s*"([^"]+)":/gm)) keys.add(match[1])
  return keys
}

const files = sources()
const styled = styledClasses(readFileSync(join(clientDir, 'styles.ts'), 'utf8'))
const used = new Set(files.flatMap(({ text }) => [...usedClasses(text)]))
const localesText = readFileSync(join(clientDir, 'locales.ts'), 'utf8')

test('every styled class is used by a component', () => {
  // Only our own namespaces: the stylesheet declares nothing that a host owns.
  const ours = [...styled].filter((name) => name.startsWith('dms-') || name.startsWith('is-'))
  assert.deepEqual(ours.filter((name) => !used.has(name)).sort(), [])
})

test('every class a component sets has a stylesheet rule', () => {
  assert.deepEqual([...used].filter((name) => !styled.has(name)).sort(), [])
})

test('zh and en dictionaries expose the same keys', () => {
  const zh = dictKeys(localesText, 'zh')
  const en = dictKeys(localesText, 'en')
  assert.ok(zh.size > 0 && en.size > 0, 'key extraction found nothing — the parser needs fixing')
  assert.deepEqual([...zh].sort(), [...en].sort())
})

test('every dictionary key is referenced and every reference resolves', () => {
  const zh = dictKeys(localesText, 'zh')
  const referenced = new Set()
  for (const { name, text } of files) {
    if (name === 'locales.ts') continue
    for (const match of text.matchAll(/\bt\(\s*['"]([\w.]+\.[\w.]+)['"]/g)) referenced.add(match[1])
  }
  assert.deepEqual([...referenced].filter((key) => !zh.has(key)).sort(), [], 't() called with an undefined key')
  assert.deepEqual([...zh].filter((key) => !referenced.has(key)).sort(), [], 'dictionary key nothing renders')
})

test('no class name is assembled from a runtime value', () => {
  // The gate above only sees literals, so an interpolated identifier would
  // smuggle a class past it — the exact blind spot that made two earlier
  // dead-CSS audits unusable. Holes may only select between string literals.
  for (const { name, text } of files) {
    for (const expr of classExpressions(text)) {
      for (const hole of templateHoles(expr)) {
        assert.match(hole, /['"`]/, `${name}: className hole yields no literal: \${${hole}}`)
      }
    }
    assert.ok(
      !/className\s*=\s*\{\s*[A-Za-z_$][\w$.]*\s*\}/.test(text),
      `${name}: className={variable} — the class gate cannot see through it`,
    )
  }
})

// ---------- parser self-tests: a scanner that sees nothing must not pass ----------

test('self-test: stylesheet parser skips commented-out rules', () => {
  const parsed = styledClasses('.dms-live { color: red }\n/* .dms-retired { color: blue } */\n.dms-translate .dms-x { transform: translateX(50.5%) }')
  assert.deepEqual([...parsed].sort(), ['dms-live', 'dms-translate', 'dms-x'])
})

test('self-test: component parser reads template holes, ternaries and concatenation', () => {
  const tsx = [
    '<a className={`dms-x${on ? " dms-xOn" : ""}`} />',
    '<b className={\'dms-y\' + (below ? \'\' : \' dms-yBelow\')} />',
    '<c className="dms-z" />',
    '<d className={cls ? `dms-w dms-w${size}` : \'dms-w\'} />',
  ].join('\n')
  assert.deepEqual(
    [...usedClasses(tsx)].sort(),
    ['dms-w', 'dms-x', 'dms-xOn', 'dms-y', 'dms-yBelow', 'dms-z'],
  )
})

test('self-test: both drift directions are reported, not swallowed', () => {
  const parsedStyled = styledClasses('.dms-used { color: red } .dms-dead { color: blue }')
  const parsedUsed = usedClasses('<i className="dms-used dms-unstyled" />')
  assert.deepEqual([...parsedStyled].filter((n) => !parsedUsed.has(n)).sort(), ['dms-dead'])
  assert.deepEqual([...parsedUsed].filter((n) => !parsedStyled.has(n)).sort(), ['dms-unstyled'])
})

test('self-test: dictionary and reference parsers are not vacuous', () => {
  const sample = 'const zh = {\n  "a.b": "x",\n  "a.c": "y",\n};\nconst en = {\n  "a.b": "x",\n};'
  assert.deepEqual([...dictKeys(sample, 'zh')].sort(), ['a.b', 'a.c'])
  assert.deepEqual([...dictKeys(sample, 'en')].sort(), ['a.b'])
  assert.deepEqual(
    [...dictKeys('const zh = {};', 'zh')],
    [],
    'an empty dictionary must parse as empty so the vacuity guard can fire',
  )
})
