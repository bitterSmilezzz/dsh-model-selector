/**
 * Standalone tsdown config for dsh-model-selector — the official clientBundle
 * browser shape, self-contained (this repo is not inside the deepseek-harness
 * monorepo, so the workspace helper cannot be imported).
 *
 * Emits one artifact:
 *  - lib/client.js — browser half, closure-factory artifact: the bundle
 *    calls window.__ModuleLoader__.load({ id, factory }) and resolves
 *    externals through the loader module table (runtime require).
 *
 * The host half (lib/index.js) is emitted by tsc (tsconfig.host.json) with
 * rewriteRelativeImportExtensions, mirroring the official node-half build.
 *
 * The banner/intro and externals below reproduce the official tsdown.client.ts
 * contract verbatim (PLATFORM_MODULES + the runtime preload row) so the emitted
 * client.js is interchangeable with one built inside the monorepo. The only
 * addition is a `__DMS_SRC_HASH__` fingerprint comment appended to the footer
 * (see srcHash below) — a comment after `return module.exports;`, with no
 * runtime effect and nothing added to the module's exports or to window.
 */
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { defineConfig } from 'tsdown'

/**
 * `src/client` 下全部 .ts/.tsx 的源码指纹（sha256 hex）。
 *
 * 为什么需要它：`lib/` 是**入库的构建产物**，浏览器跑的是 `lib/client.js`，而「源码改了没重建」
 * 以前只能靠 mtime 判断 —— mtime 在 `git clone` 后由 git 按路径字典序写盘决定（`lib/` 早于
 * `src/`，于是干净 checkout 里必然「过期」，而开发者工作树里恒通过），`touch lib/types/client/*.d.ts`
 * 又能骗过去。指纹是内容级的：源码改了没重建 → 产物里的指纹 ≠ 现算指纹，一个字符都跑不掉。
 *
 * 它只回答「产物是不是当前源码构建出来的」：手改产物**正文**不会被它发现（那由 CI 的
 * `pnpm build && git diff --exit-code -- lib` 兜底），手改指纹那一行则会让它红。
 *
 * 算法（**必须与 test/plugin-contract.test.mjs 里的 srcHash() 完全一致**；两处重复是刻意的：
 * 配置是 TS、测试是 MJS，没有可共享的模块 —— 一旦漂移，那条测试会红，不会静默放行）：
 *   1. 递归收集目录下所有 .ts/.tsx；
 *   2. 按**相对路径**（统一 `/` 分隔）排序；
 *   3. 依次把「相对路径 + \0 + 文件内容 + \0」喂给 sha256（带上路径是为了让重命名/移动也能被察觉）；
 *   4. 取 hex 摘要。
 */
function srcHash(dir: string): string {
  const files: string[] = []
  const walk = (current: string): void => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = join(current, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (/\.(ts|tsx)$/.test(entry.name)) files.push(full)
    }
  }
  walk(dir)
  const rel = (file: string): string => relative(dir, file).split(sep).join('/')
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

// 构建总是从包根目录跑（pnpm build / pnpm bundle）；显式报错好过悄悄算出一枚空指纹。
const CLIENT_SRC = join(process.cwd(), 'src', 'client')
if (!existsSync(CLIENT_SRC)) {
  throw new Error(`tsdown.config.ts: 找不到 ${CLIENT_SRC} —— 请从包根目录运行构建（pnpm build）`)
}
const SRC_HASH = srcHash(CLIENT_SRC)

/** Module-table specifiers the browser half requests instead of inlining. */
const EXTERNALS = [
  'react',
  'react/jsx-runtime',
  'react-dom',
  'react-dom/client',
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-ui-primitives',
]

export default defineConfig([
  {
    name: '@bittersmilezzz/dsh-model-selector/client',
    entry: { client: 'src/client/index.ts' },
    outDir: 'lib',
    format: 'cjs',
    platform: 'browser',
    target: 'es2024',
    fixedExtension: false,
    dts: false,
    sourcemap: true,
    clean: false,
    deps: {
      neverBundle: (specifier) => EXTERNALS.includes(specifier),
      alwaysBundle: (specifier) => !EXTERNALS.includes(specifier),
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'production'),
      'import.meta.env.MODE': JSON.stringify(process.env.NODE_ENV ?? 'production'),
      'import.meta.env': JSON.stringify({ MODE: process.env.NODE_ENV ?? 'production' }),
      // 源码指纹的解析入口。注意 `define` 只做**字符串替换**：只有当源码真的引用了
      // `__DMS_SRC_HASH__` 时它才会出现在产物里，而本仓库不为了构建往 src/ 塞假引用，
      // 所以指纹另外经 footer 注释无条件写进产物（见下）——两者同源于 SRC_HASH，不可能
      // 互相矛盾；这一行是给「将来源码真的要引用该常量」留的解析入口。
      __DMS_SRC_HASH__: JSON.stringify(SRC_HASH),
    },
    outputOptions: {
      entryFileNames: 'client.js',
      banner: 'window.__ModuleLoader__.load({ id: "@bittersmilezzz/dsh-model-selector", factory: (require) => {',
      // 指纹必须**无条件**出现在产物里（它是 test/plugin-contract.test.mjs 判断「产物是否
      // 对应当前源码」的唯一依据，不能依赖源码引用）。实测（rolldown v1.2.5，tsdown 0.22.14）：
      //   - intro 里一个未被引用的 `var __DMS_SRC_HASH__ = "…"` → 被 tree-shaking 丢掉；
      //   - intro 里的同名单行注释 → 随死代码一起丢掉；
      //   - `module.__DMS_SRC_HASH__ = "…"`（intro）与 `globalThis.… = "…"`（intro）都能活下来，
      //     但前者污染本插件的导出对象、后者污染 window，都不该为了一个构建指纹去动运行时；
      //   - 挂在 footer 的 `return module.exports;` 之后的注释 → 保留，且 banner/intro 与官方
      //     tsdown.client.ts 契约保持逐字一致。
      footer: `return module.exports; /* __DMS_SRC_HASH__ = ${JSON.stringify(SRC_HASH)} */ } });`,
      intro: 'var module = { exports: {} }; var exports = module.exports;',
    },
  },
])