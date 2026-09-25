/**
 * `@deepseek-ai/*` 依赖双列 + 零引用 peer optional 口径守卫。
 *
 * 两条判据都对着 package.json 与源码真实引用跑，防的是「错列不抛错、不报编译错，
 * 只在某一侧静默失效」这一类问题：
 *
 * 1. 双列：每个 `@deepseek-ai/*` 依赖必须同时出现在 peerDependencies 与
 *    devDependencies。只列 peer 会让本地 typecheck / 构建拿不到类型；只列 dev 会让
 *    宿主侧 peer 校验缺声明。
 * 2. 零引用 ⇒ optional：`src/` 与 `test/` 全库 0 引用的 `@deepseek-ai/*` peer 必须标
 *    optional。同为「为宿主侧类型面声明、插件自身不直接引用」的依赖，不能一项标了
 *    一项没标（asr-voice 与 dsh-notify 各按同一把尺子修正过一次漏标）。
 *
 * 关于 optional 的语义边界（与包管理器行为有关，与运行时准入无关）：宿主侧 peer
 * 兼容校验（`evaluatePluginCompatibility`）只比较 `@deepseek-ai/dsh*` 的版本区间，
 * **不读 peerDependenciesMeta**；`optional` 只影响安装期的必要性判定。故标 optional
 * 不会掩盖任何「理应声明」的依赖，只是让「未安装」从报错降级为跳过。
 *
 * 排除项：`@deepseek-ai/cordis` 与 `@deepseek-ai/schemastery` 刻意 peer 宽于 dev
 * （peer `^4.0.2` / dev `^4.0.3`），属既有宽松策略，只要求「两侧都在」。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * 判断一段源码是否**真的**引用了某个包（排除注释、字符串与说明文字）。
 *
 * 只用子串 includes(name) 是不合格的尺子：注释里点名该包（「由下面的零引用测试钩住」
 * 之类）会被当成已引用，于是一条为了「防止再漏标 optional」而存在的键子，恶恶量不
 * 出下一次漏标。这里先削掉块注释，再逐行削掉引号外的行注释，最后只认 import 子句的
 * 真实形态：from '<pkg>' / from '<pkg>/sub'，以及动态 import('<pkg>')。包名按整体
 * 匹配，pkg 与 pkg-extra 之间不会互相冒认。
 */
function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((line) => {
      let quote = null
      for (let i = 0; i < line.length; i++) {
        const ch = line[i]
        if (quote) {
          if (ch === '\\') { i++; continue }
          if (ch === quote) quote = null
          continue
        }
        if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue }
        if (ch === '/' && line[i + 1] === '/') return line.slice(0, i)
      }
      return line
    })
    .join('\n')
}

/**
 * 口径的可复用形式：给定「源码集合 + peerDependenciesMeta + peer 名单」，
 * 返回零引用却未标 optional 的包名列表。变异验证与真实口径共用
 * 同一份判断，避免「测试里拼一份、口径里另拼一份」导致的恒真。
 */
function findUnmarkedOptionalPeers(sources, meta, peerNames) {
  return peerNames.filter((name) => meta[name]?.optional !== true
    && !sources.some((source) => referencesPackage(source, name)))
}

function referencesPackage(source, name) {
  const stripped = stripComments(source)
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`\\bfrom\\s*['"]${escaped}(?:/[^'"]*)?['"]|\\bimport\\s*\\(\\s*['"]${escaped}(?:/[^'"]*)?['"]`).test(stripped)
}


/** 仅要求两侧都在、不要求范围一致的依赖（宽松策略豁免）。 */
const RANGE_EXEMPT = new Set(['@deepseek-ai/cordis', '@deepseek-ai/schemastery'])

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..')
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))

test('@deepseek-ai/* 依赖同时出现在 peerDependencies 与 devDependencies', () => {
  const peer = new Set(Object.keys(pkg.peerDependencies ?? {}))
  const dev = new Set(Object.keys(pkg.devDependencies ?? {}))
  const all = new Set([...peer, ...dev].filter(k => k.startsWith('@deepseek-ai/')))

  const peerOnly = [...all].filter(k => !dev.has(k))
  const devOnly = [...all].filter(k => !peer.has(k))

  assert.deepEqual(peerOnly, [],
    `只列了 peerDependencies（本地解析不到类型）：${peerOnly.join(', ') || '(无)'}`)
  assert.deepEqual(devOnly, [],
    `只列了 devDependencies（宿主侧 peer 校验缺声明）：${devOnly.join(', ') || '(无)'}`)
})

test('@deepseek-ai/dsh-* 依赖两侧版本范围一致（cordis / schemastery 豁免）', () => {
  const peer = pkg.peerDependencies ?? {}
  const dev = pkg.devDependencies ?? {}
  const mismatched = []
  for (const [name, range] of Object.entries(peer)) {
    if (!name.startsWith('@deepseek-ai/')) continue
    if (RANGE_EXEMPT.has(name)) continue
    if (dev[name] === undefined) continue
    if (dev[name] !== range) mismatched.push(`${name}: peer ${range} vs dev ${dev[name]}`)
  }
  assert.deepEqual(mismatched, [],
    `同一依赖两侧版本范围不一致：\n  ${mismatched.join('\n  ') || '(无)'}`)
})

test('src/test 零引用的 @deepseek-ai/* peer 必须标 optional（口径守卫）', () => {
  const files = []
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules') continue
        walk(full)
      } else if (/\.(ts|tsx|mts|js|mjs)$/.test(entry.name) && entry.name !== 'deps-double-listing.test.mjs') {
        files.push(full)
      }
    }
  }
  walk(join(root, 'src'))
  walk(join(root, 'test'))

  const meta = pkg.peerDependenciesMeta ?? {}
  const unmarked = findUnmarkedOptionalPeers(
    files.map((file) => readFileSync(file, 'utf8')),
    meta,
    Object.keys(pkg.peerDependencies ?? {}).filter((name) => name.startsWith('@deepseek-ai/')),
  )
  assert.deepEqual(unmarked, [],
    `以下 @deepseek-ai/* peer 在 src/ 与 test/ 零引用却未标 optional：${unmarked.join(', ') || '(无)'}`)
})
test('referencesPackage：只认真实 import 形态，注释与字符串里的包名不算引用', () => {
  const pkg = '@deepseek-ai/dsh-agent'
  const cases = [
    [`import {} from '${pkg}'`, true, '静态 import'],
    [`import type { X } from '${pkg}/sub'`, true, '带子路径的类型 import'],
    [`export * from "${pkg}"`, true, 're-export'],
    [`const m = await import('${pkg}')`, true, '动态 import'],
    [`const u = 'https://x.dev/y'\nimport {} from '${pkg}'`, true, '前一行有 URL 字符串'],
    [`// provider: ${pkg}`, false, '行注释点名不算引用'],
    [`  // import {} from '${pkg}'`, false, '缩进行的注释也不算'],
    [`const u = 'https://x.dev/y' // import {} from '${pkg}'`, false, '行尾注释'],
    [`/* ${pkg} 由下面的测试钩住 */`, false, '块注释点名不算引用'],
    [`const s = '${pkg} appears in a string'`, false, '字符串里的包名不算引用'],
    ['const t = `template ' + pkg + ' inside`', false, '模板字符串里的包名不算引用'],
    [`import {} from '${pkg}-extra'`, false, '包名前缀不冒认'],
  ]
  for (const [source, expected, label] of cases) {
    assert.equal(referencesPackage(source, pkg), expected, `${label}: ${JSON.stringify(source)}`)
  }
  // 反证这条键子存在的理由：裸 includes 会把上面每一条 false 情形都判成「已引用」。
  assert.equal(`// ${pkg}`.includes(pkg), true, 'includes 会把注释当引用（正是要排除的）')
})

test('零引用扫描不会被注释喂成恒真（变异验证，与口径共用同一判据）', () => {
  const pkg = '@deepseek-ai/dsh-agent'
  // 伪引用：包名只出现在注释里（包括把完整 import 语句写进注释）。
  const pseudoSource = `// 供应商声明：${pkg}\n// import {} from '${pkg}'`
  const bare = { [pkg]: {} }
  const marked = { [pkg]: { optional: true } }

  assert.deepEqual(findUnmarkedOptionalPeers([pseudoSource], bare, [pkg]), [pkg],
    '含注释的伪引用应该被判为零引用：若返回 [] 说明这把尺子把注释当引用了')
  assert.deepEqual(findUnmarkedOptionalPeers([`import {} from '${pkg}'`], bare, [pkg]), [],
    '真实 import 应该让该包逃脱判定')
  assert.deepEqual(findUnmarkedOptionalPeers([pseudoSource], marked, [pkg]), [],
    '已标 optional 的包不进列表')
  assert.ok(pseudoSource.includes(pkg),
    '反证：裸 includes 会把这份只含注释的代码当成已引用，而口径不会')
})
