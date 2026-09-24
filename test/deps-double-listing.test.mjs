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
  const unmarked = []
  for (const name of Object.keys(pkg.peerDependencies ?? {})) {
    if (!name.startsWith('@deepseek-ai/')) continue
    if (meta[name]?.optional === true) continue
    const referenced = files.some((file) => readFileSync(file, 'utf8').includes(name))
    if (!referenced) unmarked.push(name)
  }
  assert.deepEqual(unmarked, [],
    `以下 @deepseek-ai/* peer 在 src/ 与 test/ 零引用却未标 optional：${unmarked.join(', ') || '(无)'}`)
})
