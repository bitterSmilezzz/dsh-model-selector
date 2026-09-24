/**
 * Plugin contract gates — the package.json ↔ source ↔ artifact invariants
 * that DSH-Store admission review and the host Loader rely on, none of which
 * tsc checks:
 *
 *  - every `@deepseek-ai/*` module the source imports must be declared
 *    (peer or dev) so resolution is reproducible;
 *  - every module the emitted client .d.ts tree references must be a peer
 *    dependency (browser consumers typecheck against the shipped types);
 *  - `dsh.client.inject` must contain no ghosts: each entry must actually be
 *    imported by the source (the host Loader injects each listed module);
 *  - every `exports`/`main`/`types` target must point at a file the build
 *    actually emits (a declared types path that never exists breaks the
 *    package for every consumer);
 *  - the loader id, plugin name and patch manifest id must agree;
 *  - the composer model seat must keep targeting the shipped
 *    `conversation.input.model` slot at priority -1 (the single-slot
 *    shadowing contract, otherwise the official ModelSelect silently
 *    returns and the enhanced UI disappears) — asserted at VALUE level
 *    (the exported `SEAT_PRIORITY` constant), because the previous
 *    source-text scan was satisfied by a single comment line;
 *  - `lib/` (committed build output) must correspond to the current
 *    `src/client`: content-level, via the sha256 fingerprint tsdown writes
 *    into `lib/client.js`, plus a one-to-one check of the emitted `.d.ts`
 *    file set. mtime is gone: git writes `lib/` before `src/` on clone
 *    (so a clean checkout used to fail) and `touch` used to clear it.
 *    A missing `lib/` is a FAILURE here, not a silent skip — the repo
 *    commits `lib/`, so absence is the anomaly.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))

/**
 * `src/client` 下全部 .ts/.tsx 的源码指纹 —— **必须与 tsdown.config.ts 里的 srcHash()
 * 逐字节等价**（配置是 TS、测试是 MJS，没有可共享的模块，只能两处重复；漂移会让
 * 「产物指纹」测试变红，不会静默放行）：
 * 相对路径（`/` 分隔）排序 → 依次 sha256(路径 + \0 + 内容 + \0) → hex。
 */
function srcHash(dir) {
  const files = []
  const walk = (current) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = join(current, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (/\.(ts|tsx)$/.test(entry.name)) files.push(full)
    }
  }
  walk(dir)
  const rel = (file) => relative(dir, file).split(sep).join('/')
  files.sort((a, b) => (rel(a) < rel(b) ? -1 : rel(a) > rel(b) ? 1 : 0))
  const hash = createHash('sha256')
  for (const file of files) {
    hash.update(rel(file))
    hash.update('\0')
    hash.update(readFileSync(file))
    hash.update('\0')
  }
  return hash.digest('hex')
}

/** Relative posix paths of every .ts/.tsx under `dir` (recursive). */
function sourceFiles(dir) {
  const out = []
  const walk = (current) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = join(current, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (/\.(ts|tsx)$/.test(entry.name)) out.push(relative(dir, full).split(sep).join('/'))
    }
  }
  walk(dir)
  return out.sort()
}

/**
 * The source text of the `{...}` block opening at `open` — braces balanced, with
 * string literals and comments skipped. Used to scope assertions to one object
 * literal instead of "the rest of the file" (a `slice(start)` tail lets an
 * unrelated occurrence, or a commented-out line, satisfy the assertion).
 */
function balancedSlice(text, open) {
  let depth = 0
  let i = open
  while (i < text.length) {
    const ch = text[i]
    if (ch === '"' || ch === "'" || ch === '`') {
      const quote = ch
      i += 1
      while (i < text.length) {
        if (text[i] === '\\') { i += 2; continue }
        if (text[i] === quote) { i += 1; break }
        i += 1
      }
      continue
    }
    if (ch === '/' && text[i + 1] === '/') {
      const nl = text.indexOf('\n', i)
      i = nl === -1 ? text.length : nl + 1
      continue
    }
    if (ch === '/' && text[i + 1] === '*') {
      const end = text.indexOf('*/', i + 2)
      i = end === -1 ? text.length : end + 2
      continue
    }
    if (ch === '{') depth += 1
    else if (ch === '}') {
      depth -= 1
      if (depth === 0) return text.slice(open, i + 1)
    }
    i += 1
  }
  return text.slice(open)
}

/** `text` with block and line comments removed (a commented-out literal must never satisfy a gate). */
function stripComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1')
}

/** All `@deepseek-ai/*` packages imported anywhere under src/ (subpaths normalized). */
function srcImports() {
  const out = new Set()
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (/\.(ts|tsx)$/.test(entry.name)) {
        const text = readFileSync(full, 'utf8')
        for (const m of text.matchAll(/from ['"](@deepseek-ai\/[^'"]+)['"]/g)) {
          out.add(m[1].match(/@deepseek-ai\/[^/]+/)?.[0] ?? m[1])
        }
      }
    }
  }
  walk(join(root, 'src'))
  return out
}

/** Every official package referenced by the emitted client declaration tree. */
function clientDtsReferences() {
  const out = new Set()
  const base = join(root, 'lib', 'types', 'client')
  if (!existsSync(base)) return out
  for (const name of readdirSync(base)) {
    if (!name.endsWith('.d.ts')) continue
    const text = readFileSync(join(base, name), 'utf8')
    for (const m of text.matchAll(/from ['"](@deepseek-ai\/[^'"]+)['"]/g)) {
      out.add(m[1].match(/@deepseek-ai\/[^/]+/)?.[0] ?? m[1])
    }
  }
  return out
}

const sourceImports = srcImports()
const dtsReferences = clientDtsReferences()
const official = (n) => n.startsWith('@deepseek-ai/')
const declaredDeps = new Set([
  ...Object.keys(pkg.peerDependencies ?? {}),
  ...Object.keys(pkg.devDependencies ?? {}),
])

test('every @deepseek-ai import in src is declared (peer or dev)', () => {
  const missing = [...sourceImports].filter((n) => official(n) && !declaredDeps.has(n)).sort()
  assert.deepEqual(missing, [], 'src imports undeclared official modules')
})

test('every official module the client d.ts tree references is a peer dependency', () => {
  const missing = [...dtsReferences].filter((n) => !(n in (pkg.peerDependencies ?? {}))).sort()
  assert.deepEqual(missing, [], 'shipped client types reference non-peer official modules')
})

test('dsh.client.inject contains no ghosts — every entry is imported by src', () => {
  const inject = pkg.dsh?.client?.inject ?? []
  assert.ok(Array.isArray(inject) && inject.length > 0, 'no dsh.client.inject declared')
  const ghosts = inject.filter((id) => !sourceImports.has(id)).sort()
  assert.deepEqual(ghosts, [], 'inject entries the source never imports')
})

test('every inject entry is a declared peer dependency', () => {
  const inject = pkg.dsh?.client?.inject ?? []
  const missing = inject.filter((id) => !(id in (pkg.peerDependencies ?? {}))).sort()
  assert.deepEqual(missing, [], 'inject entries missing from peerDependencies')
})

test('every exports/main/types target resolves to a file the build emits', () => {
  const targets = []
  if (pkg.main) targets.push(['main', pkg.main])
  if (pkg.types) targets.push(['types', pkg.types])
  for (const [subpath, spec] of Object.entries(pkg.exports ?? {})) {
    const node = typeof spec === 'string' ? { default: spec } : spec
    if (node.types) targets.push([`exports["${subpath}"].types`, node.types])
    if (node.default) targets.push([`exports["${subpath}"].default`, node.default])
    if (subpath === './cordis.patch.yml') targets.push([`exports["${subpath}"]`, spec])
  }
  for (const [label, target] of targets) {
    if (typeof target !== 'string' || target.startsWith('./src')) continue
    assert.ok(existsSync(join(root, target)), `${label} → ${target} does not exist (run pnpm build)`)
  }
})

test('every file in the files array exists (nothing broken at pack time)', () => {
  for (const entry of pkg.files ?? []) {
    assert.ok(existsSync(join(root, entry)), `files entry "${entry}" does not exist`)
  }
})

test('loader id, plugin name and patch manifest name all agree with the package name', () => {
  const bundle = join(root, 'lib', 'client.js')
  if (existsSync(bundle)) {
    const id = readFileSync(bundle, 'utf8').match(/\bid:\s*"([^"]+)"/)?.[1]
    assert.equal(id, pkg.name, 'bundle loader id must equal the package name')
  }
  const patch = join(root, 'cordis.patch.yml')
  if (existsSync(patch)) {
    // The insert row loads the package by `name`; its `id` is the entry
    // identifier later patches target, so it stays the short repo name and is
    // deliberately NOT bound to the package name (npm renames keep loading).
    const text = readFileSync(patch, 'utf8')
    assert.ok(
      text.includes(`name: '${pkg.name}'`) || text.includes(`name: ${pkg.name}`),
      'cordis.patch.yml name must equal the package name',
    )
  }
})

test('the composer model seat keeps targeting the shipped conversation.input.model slot', () => {
  const src = readFileSync(join(root, 'src', 'client', 'index.ts'), 'utf8')

  // 值级断言：常量本身必须是 -1。扫源码文本（例如「注册处出现过 -1」）会被一行注释骗过，
  // 所以这里直接取常量声明里的数字（注释先剔掉，`// export const SEAT_PRIORITY = -1` 不算数），
  // 再单独钉住「注册处引用的是这个常量而不是裸字面量」。
  // ui-conversation 把该座位声明为 kind 'single'（单槽，priority 升序取最低者渲染），官方
  // 占用者（@deepseek-ai/dsh-client-ui-model-selection）注册时不传 priority（即默认 0），
  // 故 -1 恒胜出。**改这个值等于静默换回官方 UI。**
  const declared = stripComments(src).match(/export\s+const\s+SEAT_PRIORITY\s*(?::\s*[^=]+?)?=\s*(-?\d+)/)
  assert.ok(declared, 'src/client/index.ts no longer declares `export const SEAT_PRIORITY = <number>`')
  assert.equal(
    Number(declared[1]),
    -1,
    'SEAT_PRIORITY must stay -1 (single slot renders the LOWEST priority; the shipped occupant is at default 0)',
  )

  const injectAt = src.indexOf("scope.slots.inject('conversation.input.model'")
  assert.notEqual(injectAt, -1, "src/client/index.ts no longer injects the 'conversation.input.model' seat")
  const registerAt = src.indexOf('slots.register(', injectAt)
  assert.notEqual(registerAt, -1, 'the shipped seat must still be taken over with slots.register')
  // The registration must be the injection's own callback, not some later, unrelated one.
  assert.ok(
    registerAt - injectAt < 200,
    'slots.register is no longer the conversation.input.model injection callback',
  )
  // Scope every structural assertion to THIS registration's options object literal (braces
  // balanced) instead of `slice(start)` to EOF: a tail slice is satisfied by any occurrence
  // anywhere below, comments included.
  const open = src.indexOf('{', registerAt)
  const seatRaw = balancedSlice(src, open)
  const seat = stripComments(seatRaw)
  assert.match(seat, /name:\s*'conversation\.input\.model'/, 'register() must keep the same named seat')
  assert.match(
    seat,
    /priority:\s*SEAT_PRIORITY\b/,
    'the seat must pass the SEAT_PRIORITY constant (a bare literal escapes the value gate above)',
  )
  // Raw, not stripped: a commented-out `// priority: -1` is exactly the bypass this gate closes.
  assert.doesNotMatch(
    seatRaw,
    /priority:\s*-?\d/,
    'the seat must not hard-code a priority number — a commented-out literal also fails here',
  )
  // Remaining options as currently implemented: own dictionary namespace and
  // the per-session injected face.
  assert.match(seat, /locale:\s*NS\b/, 'the seat keeps its own dictionary namespace')
  assert.match(seat, /inject:\s*\(sessionId:\s*string\)/, 'the seat still builds its injected face from the session id')
  // register(options, Component) — the component is the SECOND argument, right after the object.
  assert.match(
    src.slice(open + seatRaw.length, open + seatRaw.length + 40),
    /^\s*,\s*ModelSelect\s*\)/,
    "the seat must still render this plugin's ModelSelect",
  )

  // 源码侧对了还不够：浏览器跑的是 lib/client.js。常量会被 tsdown 内联成字面量，产物里必须
  // 真的出现 -1（同样剔掉注释），否则就是「源码改了没重建」。断言同样**收敛到产物里那个注册
  // 对象字面量**：整份 bundle 里随便一处 `priority: -1`（哪怕是别的座位或字符串）都不算数。
  const bundlePath = join(root, 'lib', 'client.js')
  assert.ok(existsSync(bundlePath), 'lib/client.js 缺失（仓库把 lib/ 入库，缺失即异常）—— 请跑 pnpm build')
  const bundle = readFileSync(bundlePath, 'utf8')
  const shippedRegisterAt = bundle.indexOf('slots.register(')
  assert.notEqual(shippedRegisterAt, -1, 'lib/client.js 里没有 slots.register —— 请跑 pnpm build')
  const shippedSeat = stripComments(balancedSlice(bundle, bundle.indexOf('{', shippedRegisterAt)))
  assert.match(
    shippedSeat,
    /name:\s*["']conversation\.input\.model["']/,
    'lib/client.js 的注册对象不是 conversation.input.model 座位 —— 请跑 pnpm build',
  )
  assert.match(
    shippedSeat,
    /priority:\s*-1\b/,
    'lib/client.js 里该座位注册处没有 priority: -1 —— 产物与源码不一致，请跑 pnpm build 后提交 lib/',
  )
})

/**
 * 产物新鲜度（内容级，不看 mtime）。
 *
 * 以前这里比 mtime，两个方向都是假的：`git clone` 后 git 按路径字典序写盘（`lib/` 早于
 * `src/`），干净 checkout 里 oldestDts < newestClientSrc **必然成立**，而开发者工作树里恒通过；
 * `touch lib/types/client/*.d.ts` 又能把红色刷绿。现在：
 *
 *  - `lib/client.js` 侧靠 tsdown 注入的 `__DMS_SRC_HASH__` 指纹（内容级：改一个字符就变）。
 *    它只证明「产物是不是当前源码构建的」——手改产物正文它看不见，那由 CI 的
 *    `pnpm build && git diff --exit-code -- lib` 兜底；
 *  - `lib/types/client/*.d.ts` 侧无法注入常量，改为断言「.d.ts 文件集合与 src/client 源文件
 *    集合一一对应」——新增/删除源文件而不重建就会红。**d.ts 的内容一致性同样由 CI 兜底**：
 *    .github/workflows/ci.yml 里 `pnpm build && git diff --exit-code -- lib`（外加未跟踪产物检查）。
 *
 * 这里刻意**不**在产物缺失时静默跳过：仓库把 lib/ 入库，干净 checkout 里没有 lib/ 才是异常。
 * 所以从 tarball 解压、没跑过 build 的目录跑 `pnpm test` 会红 —— 这是期望行为（CI 先 install、
 * 再 test、再 build；build 后 lib/ 必须与提交一致）。
 */
test('lib/ 是当前源码的构建产物（内容指纹；请先 pnpm build）', () => {
  const bundlePath = join(root, 'lib', 'client.js')
  assert.ok(
    existsSync(bundlePath),
    'lib/ 未构建：lib/client.js 不存在（仓库把 lib/ 入库，缺失即异常）—— 请跑 pnpm build',
  )
  const shipped = readFileSync(bundlePath, 'utf8').match(/\b__DMS_SRC_HASH__\s*=\s*"([0-9a-f]{64})"/)?.[1]
  assert.ok(
    shipped !== undefined,
    'lib/client.js 里没有 __DMS_SRC_HASH__ 指纹 —— 产物是在加指纹之前构建的，请跑 pnpm build',
  )
  const actual = srcHash(join(root, 'src', 'client'))
  assert.equal(
    shipped,
    actual,
    'lib/client.js 的源码指纹与 src/client 现算的指纹不一致：源码改了没重建 —— 请跑 pnpm build 后提交 lib/',
  )
})

test('lib/types/client 的 .d.ts 集合与 src/client 的源文件集合一一对应', () => {
  const dtsDir = join(root, 'lib', 'types', 'client')
  assert.ok(
    existsSync(dtsDir),
    'lib/types/client 未构建（仓库把 lib/ 入库，缺失即异常）—— 请跑 pnpm build',
  )
  const expected = sourceFiles(join(root, 'src', 'client'))
    .map((name) => name.replace(/\.tsx?$/, '.d.ts'))
    .sort()
  const actual = readdirSync(dtsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.d.ts'))
    .map((entry) => entry.name)
    .sort()
  assert.deepEqual(
    actual,
    expected,
    'lib/types/client 的声明文件与 src/client 的源文件对不上（新增/删除了源文件却没重建）—— 请跑 pnpm build；d.ts 的**内容**一致性由 CI 的 `pnpm build && git diff --exit-code -- lib` 兜底',
  )
})


test('每一处 dmsEffortBusy 调用都传入 pending（rc.2 目录在途判据）', () => {
  // 值级守卫：dmsEffortBusy 的第三参 pending 决定「select() 入口即忙」这段窗口期
  // （status 要等 RPC 返回才翻到 selecting）。漏传一处的后果不会崩、也不会打错
  // 模型（commit() 自己那处会拦），只是滑杆在窗口期仍可交互、视觉/aria 反馈不一致
  // —— 2026-09-25 的 Code Review 正是这样漏过一处（EffortSlider 内部），故在此钉住
  // 调用点本身：源码里 dmsEffortBusy( 的每一次调用都必须有三个实参。
  const root2 = dirname(fileURLToPath(import.meta.url))
  const files = []
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (/\.tsx?$/.test(entry.name)) files.push(full)
    }
  }
  walk(join(root2, '..', 'src'))
  const offenders = []
  for (const file of files) {
    // 剔掉注释再扫：注释里提到函数名不等于有一次调用（与 SEAT_PRIORITY 的
    // 值级断言同理，避免被文字骗过）。
    const text = readFileSync(file, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/[^\n]*/g, '$1')
    const calls = text.match(/dmsEffortBusy\(([^)]*)\)/g) ?? []
    for (const call of calls) {
      const args = call.slice('dmsEffortBusy('.length, -1)
        .split(',')
        .map((part) => part.trim())
        .filter((part) => part !== '')
      if (args.length < 3) {
        offenders.push(`${relative(root2, file)}: ${call}`)
      }
    }
  }
  assert.deepEqual(offenders, [], '以下 dmsEffortBusy 调用缺少 pending 第三参（rc.2 窗口期会漏判忙态）')
})
