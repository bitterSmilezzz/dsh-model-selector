/**
 * Dead-code gates for the two surfaces a typecheck can't reach:
 * the injected stylesheet and the copy dictionary.
 *
 * Both directions are asserted, because both broke in the single-pane
 * rewrite: a class the TSX uses but the stylesheet never declares renders
 * unstyled (that was the selected-row and provider-tag bug), and a class the
 * stylesheet declares that nothing uses is weight shipped to every session.
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

/** Class tokens declared as selectors in the stylesheet (comments stripped first). */
function styledClasses() {
  const css = readFileSync(join(clientDir, 'styles.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
  const out = new Set()
  for (const match of css.matchAll(/\.(-?[A-Za-z_][\w-]*)/g)) out.add(match[1])
  return out
}

/** String literals inside one `className` value, honouring nested braces. */
function classLiterals(text, from) {
  const found = []
  let i = from
  let depth = 0
  while (i < text.length) {
    const ch = text[i]
    if (ch === '{') depth += 1
    else if (ch === '}') {
      if (depth === 0) break
      depth -= 1
    } else if (ch === "'" || ch === '"' || ch === '`') {
      const quote = ch
      let j = i + 1
      let literal = ''
      while (j < text.length && text[j] !== quote) {
        if (text[j] === '\\') j += 1
        literal += text[j]
        j += 1
      }
      // Template holes (${...}) may hold more class literals; keep scanning past them.
      for (const hole of literal.matchAll(/\$\{([^}]*)\}/g)) found.push(...hole[1].match(/['"`]([^'"`]*)['"`]/g) ?? [])
      found.push(quote + literal.replace(/\$\{[^}]*\}/g, ' ') + quote)
      i = j
    }
    i += 1
  }
  return found
}

/** Class tokens the components actually put on elements. */
function usedClasses(files) {
  const out = new Set()
  for (const { text } of files) {
    for (const match of text.matchAll(/\bclassName=(?:"|'|`|\{)/g)) {
      const start = match.index + 'className='.length
      const opener = text[start]
      const values = opener === '{'
        ? classLiterals(text, start + 1)
        : [text.slice(start, start + text.slice(start + 1).indexOf(opener) + 2)]
      for (const value of values) {
        for (const token of value.replace(/^['"`]|['"`]$/g, '').split(/\s+/)) {
          if (/^-?[A-Za-z_][\w-]*$/.test(token)) out.add(token)
        }
      }
    }
  }
  return out
}

function dictKeys(name) {
  const text = readFileSync(join(clientDir, 'locales.ts'), 'utf8')
  const body = text.slice(text.indexOf(`const ${name}`))
  const end = body.indexOf('\n};')
  const keys = new Set()
  for (const match of body.slice(0, end).matchAll(/^\s*"([^"]+)":/gm)) keys.add(match[1])
  return keys
}

const files = sources()
const styled = styledClasses()
const used = usedClasses(files)

test('every styled class is used by a component', () => {
  // Only our own namespaces: the stylesheet declares nothing that a host owns.
  const ours = [...styled].filter((name) => name.startsWith('dms-') || name.startsWith('is-'))
  assert.deepEqual(ours.filter((name) => !used.has(name)).sort(), [])
})

test('every class a component sets has a stylesheet rule', () => {
  assert.deepEqual([...used].filter((name) => !styled.has(name)).sort(), [])
})

test('zh and en dictionaries expose the same keys', () => {
  const zh = dictKeys('zh')
  const en = dictKeys('en')
  assert.deepEqual([...zh].sort(), [...en].sort())
  assert.ok(zh.size > 0, 'key extraction found nothing — the parser needs fixing')
})

test('every dictionary key is referenced and every reference resolves', () => {
  const zh = dictKeys('zh')
  const referenced = new Set()
  for (const { name, text } of files) {
    if (name === 'locales.ts') continue
    for (const match of text.matchAll(/\bt\(\s*['"]([\w.]+\.[\w.]+)['"]/g)) referenced.add(match[1])
  }
  assert.deepEqual([...referenced].filter((key) => !zh.has(key)).sort(), [], 't() called with an undefined key')
  assert.deepEqual([...zh].filter((key) => !referenced.has(key)).sort(), [], 'dictionary key nothing renders')
})
