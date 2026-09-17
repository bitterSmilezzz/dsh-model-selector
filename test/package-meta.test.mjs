/**
 * Shipped-artifact and manifest gates.
 *
 * `lib/client.js` is what a browser actually runs, and `package.json` is what
 * DSH-Store's admission review reads. Neither is checked by tsc, and both have
 * drifted before: the single-pane rewrite left 26 retired class names in the
 * stylesheet, and a hand-copied SVG set sat beside the primitives the host
 * already ships. These assertions fence the ways that can happen again —
 * a vendored copy of an official module, a loader id that no longer matches the
 * package name, CSS that never reaches the browser, permission claims the
 * bundle contradicts, and (new) **build output that never got `git add`ed**.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const bundlePath = join(root, 'lib', 'client.js')
const bundle = existsSync(bundlePath) ? readFileSync(bundlePath, 'utf8') : null
const clientDir = join(root, 'src', 'client')
// Collected from disk, not hard-coded: a new client module that nobody listed
// here used to be invisible to the retired-class scan below.
const clientSources = readdirSync(clientDir)
  .filter((name) => ['.ts', '.tsx'].includes(extname(name)))
  .sort()
const clientSource = clientSources
  .map((name) => readFileSync(join(clientDir, name), 'utf8'))
  .join('\n')

/** Class names the single-pane rewrite deleted; none may come back. */
const RETIRED = [
  'dms-adapt-panel', 'dms-advanced', 'dms-check', 'dms-description', 'dms-effort-head',
  'dms-menu-separator', 'dms-model-back', 'dms-model-chevron', 'dms-model-effort',
  'dms-model-error', 'dms-model-group-title', 'dms-model-menu', 'dms-model-name',
  'dms-model-pane', 'dms-model-root', 'dms-model-row', 'dms-model-row-effort',
  'dms-model-row-name', 'dms-model-status', 'dms-model-trigger', 'dms-modelName',
  'dms-option', 'dms-optionCopy', 'dms-providerTag', 'dms-row-chevron', 'dms-selected',
]

const stylesText = readFileSync(join(clientDir, 'styles.ts'), 'utf8')
/** Class tokens the stylesheet declares (comments are not shipped rules). */
const styledClasses = new Set()
// `export const CSS: string = \`…\`` — the annotation is optional so an explicit
// type (added to keep tsc from writing a 19KB literal-type d.ts) does not make
// this parser silently see nothing.
for (const match of (stylesText.match(/export const CSS(?:\s*:\s*string)?\s*=\s*(?:String\.raw)?`([\s\S]*?)`/)?.[1] ?? '')
  .replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/\.(-?[A-Za-z_][\w-]*)/g)) styledClasses.add(match[1])

/** `(?<![\w-])name(?![\w-])` — a class token, not the tail of a longer one. */
function classPattern(name) {
  return new RegExp(`(?<![\\w-])${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w-])`)
}

test('the client bundle is built and loadable', () => {
  assert.ok(bundle !== null, 'lib/client.js missing — run pnpm build')
  assert.ok(bundle.length > 200, `lib/client.js is ${String(bundle.length)}B`)
  // The loader registers the module under this id; drift makes the bundle unreachable.
  const id = bundle.match(/\bid:\s*"([^"]+)"/)?.[1]
  assert.equal(id, pkg.name, 'loader id must equal the package name')
  assert.match(bundle, /^window\.__ModuleLoader__\.load\(/, 'not a client-modules bundle')
})

test('runtime externals are exactly react plus official primitives', () => {
  const externals = [...bundle.matchAll(/\brequire\("([^"]+)"\)/g)].map((m) => m[1]).sort()
  // Adding an official module here is an admission-review event, not a refactor.
  assert.deepEqual(externals, [
    '@deepseek-ai/dsh-client-ui-primitives',
    'react',
    'react/jsx-runtime',
  ])
})

test('every declared inject edge is a peer dependency that resolves', () => {
  const declared = pkg.dsh.client.inject
  assert.ok(Array.isArray(declared) && declared.length > 0)
  for (const id of declared) {
    assert.ok(id in pkg.peerDependencies, `${id} is injected but not a peerDependency`)
    assert.ok(existsSync(join(root, 'node_modules', ...id.split('/'))), `${id} is not installed`)
  }
  // The one module the bundle really requires must be declared.
  assert.ok(declared.includes('@deepseek-ai/dsh-client-ui-primitives'))
})

test('the bundle ships every live stylesheet rule', () => {
  assert.ok(styledClasses.size > 0, 'no stylesheet payload found in the source — the parser needs fixing')
  // Match against the shipped stylesheet only: class names also appear in the
  // component code, so a whole-bundle substring test passes even when a rule
  // has been renamed out of the CSS (a mutation round proved exactly that).
  const shipped = bundle.match(/const CSS(?:\s*:\s*string)?\s*=\s*`([\s\S]*?)`/)?.[1]
  assert.ok(shipped !== undefined && shipped.length > 500, 'no CSS payload in the bundle')
  const missing = [...styledClasses].filter((name) => !classPattern(name).test(shipped))
  assert.deepEqual(missing.sort(), [], 'styled classes absent from the built stylesheet')
})

test('retired class names stay deleted in source and bundle', () => {
  assert.ok(styledClasses.size > 0)
  for (const name of RETIRED) {
    assert.ok(!classPattern(name).test(stylesText), `${name} is back in src/client/styles.ts`)
    assert.ok(!classPattern(name).test(bundle), `${name} is back in lib/client.js`)
    assert.ok(!classPattern(name).test(clientSource), `${name} is set by a component again`)
  }
})

test('the bundle contradicts no permission claim made in the README', () => {
  // README promises: no own network access, no host file or credential access,
  // and no persisted preferences yet (batch D would have to be disclosed first).
  for (const forbidden of [
    /require\("node:/, /child_process/, /\bfetch\s*\(/, /XMLHttpRequest/, /\bnew WebSocket\b/,
    /localStorage/, /sessionStorage/, /\beval\(/,
  ]) {
    assert.ok(!forbidden.test(bundle), `bundle contains ${String(forbidden)}`)
  }
  // Same promise, the APIs the first list predates. Each of these either opens a
  // network path (sendBeacon / EventSource / Worker / dynamic import), reaches
  // host or persisted state (indexedDB / caches / document.cookie), and none of
  // them has a legitimate use in a seat that only renders a menu. If one ever
  // becomes necessary, disclose it in the README first — then delete it here.
  for (const forbidden of [
    /\bnavigator\s*\.\s*sendBeacon\b/, /\bEventSource\b/, /\bnew\s+Worker\b/,
    /\bindexedDB\b/, /\bcaches\s*\./, /\bdocument\s*\.\s*cookie\b/, /\bimport\s*\(/,
  ]) {
    assert.ok(!forbidden.test(bundle), `bundle contains ${String(forbidden)} — 与 README 的权限声明冲突`)
  }
})

test('every file under lib/ is tracked by git (a fresh build must be committed)', (t) => {
  // `actions/checkout` only publishes tracked files: a build that emits a NEW
  // artifact (a split-out module's .d.ts, a new chunk) is invisible to every
  // other gate — and to CI's `git diff --exit-code -- lib`, which cannot see
  // untracked files. Hence this gate, both directions.
  let tracked
  let untracked
  try {
    const git = (args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' })
    git(['rev-parse', '--is-inside-work-tree'])
    tracked = git(['ls-files', 'lib']).split('\n').filter(Boolean).sort()
    // `--exclude-standard` applies .gitignore, so *.tsbuildinfo / .DS_Store do
    // not count as "uncommitted build output".
    untracked = git(['ls-files', '--others', '--exclude-standard', '--', 'lib']).split('\n').filter(Boolean).sort()
  } catch (error) {
    // Not a git work tree (e.g. tests run from an unpacked tarball): the gate is
    // inapplicable, not failing. Skipping loudly beats a false red.
    const why = String(error.stderr ?? error.message).split('\n')[0]
    t.skip(`不在 git 工作树里，跳过 lib/ 跟踪门禁（${why}）`)
    return
  }
  assert.deepEqual(
    untracked,
    [],
    'lib/ 里有未跟踪的构建产物：跑 pnpm build 后记得 git add（CI 的 git diff 看不见未跟踪文件）',
  )
  assert.deepEqual(
    tracked.filter((file) => !existsSync(join(root, file))),
    [],
    'lib/ 里有已跟踪但磁盘上不存在的文件：产物被删了却没 git rm —— 请跑 pnpm build 后提交',
  )
})
