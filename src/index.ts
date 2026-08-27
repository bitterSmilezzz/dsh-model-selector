/**
 * dsh-model-selector — host half.
 *
 * Pure UI plugin: the empty apply exists so the plugin appears in the host
 * Loader (and its `dsh.client` declaration is scanned into the browser
 * roster); the browser half ships via `exports["./client"]`.
 */
import type { Context } from '@deepseek-ai/cordis'

export const name = 'dsh-model-selector'

export const inject: string[] = []

/** Host plugin body — no host-side behavior for this surface plugin. */
export function apply(_ctx: Context): void {}
