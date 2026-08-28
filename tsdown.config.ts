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
 * The banner/intro/footer and externals below reproduce the official
 * tsdown.client.ts contract verbatim (PLATFORM_MODULES + the runtime
 * preload row) so the emitted client.js is interchangeable with one built
 * inside the monorepo.
 */
import { defineConfig } from 'tsdown'

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
    name: 'dsh-model-selector/client',
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
    },
    outputOptions: {
      entryFileNames: 'client.js',
      banner: 'window.__ModuleLoader__.load({ id: "dsh-model-selector", factory: (require) => {',
      footer: 'return module.exports; } });',
      intro: 'var module = { exports: {} }; var exports = module.exports;',
    },
  },
])