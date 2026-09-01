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
 *  - the loader id, plugin name and patch manifest id must agree.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))

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

test('loader id, plugin name and patch manifest id all agree with the package name', () => {
  const bundle = join(root, 'lib', 'client.js')
  if (existsSync(bundle)) {
    const id = readFileSync(bundle, 'utf8').match(/\bid:\s*"([^"]+)"/)?.[1]
    assert.equal(id, pkg.name, 'bundle loader id must equal the package name')
  }
  const patch = join(root, 'cordis.patch.yml')
  if (existsSync(patch)) {
    assert.ok(readFileSync(patch, 'utf8').includes(`id: ${pkg.name}`), 'cordis.patch.yml id must equal the package name')
  }
})

test('the client type declaration is not stale relative to its sources', () => {
  const clientTypesDir = join(root, 'lib', 'types', 'client')
  if (!existsSync(clientTypesDir)) return // build freshness is covered by the exports test above
  const newestSrc = (dir) => {
    let newest = 0
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) newest = Math.max(newest, newestSrc(full))
      else if (/\.(ts|tsx)$/.test(entry.name)) newest = Math.max(newest, statSync(full).mtimeMs)
    }
    return newest
  }
  const newestClientSrc = newestSrc(join(root, 'src', 'client'))
  const oldestDts = Math.min(...readdirSync(clientTypesDir).map((n) => statSync(join(clientTypesDir, n)).mtimeMs))
  assert.ok(oldestDts >= newestClientSrc, `client d.ts stale: src/client is newer (run pnpm build)`)
})
