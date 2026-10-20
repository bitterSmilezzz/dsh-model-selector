/**
 * Opaque menu surface gate.
 *
 * `--dsw-specific-menu` is a translucent “glass” token (58% alpha in light,
 * 45% in dark outside macOS). Official menus paint it inside a `MenuSurface`
 * that adds a backdrop blur; this plugin portals its menu straight to
 * `document.body`, so painting the token alone lets transcript text and list
 * rows show through the popup on the Web/Linux profile.
 *
 * The fix composites the theme tint over the opaque `--dsw-alias-bg-layer-2`
 * fill and reuses that composite for every surface inside the menu. These
 * assertions read both the source stylesheet and the committed bundle so the
 * fix cannot silently regress to a bare translucent paint.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

/** CSS payload of the source stylesheet or the built client bundle. */
function cssOf(text) {
  const match = text.match(/export const CSS(?:\s*:\s*string)?\s*=\s*`([\s\S]*?)`/)
    ?? text.match(/const CSS(?:\s*:\s*string)?\s*=\s*`([\s\S]*?)`/)
  assert.ok(match, 'no CSS payload found — the extraction pattern needs updating')
  return match[1]
}

/** The declaration block of one selector (comments were stripped from the payload source). */
function rule(css, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = new RegExp(`${escaped}\\s*\\{([^}]*)\\}`).exec(css)
  assert.ok(match, `missing rule for ${selector}`)
  return match[1]
}

const sourceCss = cssOf(readFileSync(join(root, 'src', 'client', 'styles.ts'), 'utf8'))
const builtCss = cssOf(readFileSync(join(root, 'lib', 'client.js'), 'utf8'))

test('menu tint is composited over an opaque base instead of painted raw', () => {
  for (const [label, css] of [['source', sourceCss], ['bundle', builtCss]]) {
    assert.match(
      css,
      /--dms-surface:\s*linear-gradient\(var\(--dsw-specific-menu,\s*transparent\),\s*var\(--dsw-specific-menu,\s*transparent\)\),\s*var\(--dsw-alias-bg-layer-2,\s*#fff\)/,
      `${label}: --dms-surface must layer the menu tint over an opaque fill`,
    )
    assert.doesNotMatch(css, /background:\s*var\(--dsw-specific-menu\)/, `${label}: bare translucent menu paint is back`)
  }
})

test('the popup and its inner layers all use the opaque composite', () => {
  for (const [label, css] of [['source', sourceCss], ['bundle', builtCss]]) {
    for (const selector of ['.dms-menu', '.dms-status', '.dms-more', '.dms-groupHeader']) {
      assert.match(
        rule(css, selector),
        /background:\s*var\(--dms-surface\)/,
        `${label}: ${selector} must inherit the opaque composite`,
      )
    }
  }
})
