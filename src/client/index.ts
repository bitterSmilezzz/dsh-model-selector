/**
 * dsh-model-selector — browser half.
 *
 * Replaces the shipped `conversation.input.model` seat with an enhanced one
 * (provider-group collapse + name search) while keeping the exact shared
 * per-session directory (`ctx.modelDirectories`) the /model popup reads, so
 * both entries stay in sync. Shadowing is the sanctioned seam: the slot is
 * `single`, so a registration at a LOWER priority than the shipped occupant
 * (default 0) becomes the rendered winner.
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
// Type-only: pulls the ui-conversation SlotMap merge (the input model seat).
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: pulls the model-selection plugin's Context merge (ctx.modelDirectories)
// plus the injected face type the seat registration hands to the component.
import type { ModelSelectInjected } from '@deepseek-ai/dsh-client-ui-model-selection/client'
import type {} from '@deepseek-ai/dsh-client-ui-model-selection/client'
import { ModelSelect, zhDict, enDict } from './ModelSelect.tsx'
import { CSS } from './styles.ts'

/** Dictionary namespace owned by this plugin. */
const NS = 'modelSelector'

/** Required services: the registry, session lookup, locale, the slot seat, and the model directory's Remote faces. */
export const inject = [
  'slots',
  'sessions',
  'locale',
  'modelDirectories',
  'remote',
  'remote.session',
]

/**
 * Client plugin body: register the dictionaries and stylesheet, then take the
 * model seat over the shared directory once `modelDirectories` appears.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, {
    zh: zhDict,
    en: enDict,
  }), 'dsh-model-selector: dictionaries')
  ctx.effect(() => {
    const tag = document.createElement('style')
    tag.dataset.plugin = 'dsh-model-selector'
    tag.textContent = CSS
    document.head.appendChild(tag)
    return () => {
      tag.remove()
    }
  }, 'dsh-model-selector: styles')
  ctx.inject(['modelDirectories'], (scope) => {
    const models = scope.modelDirectories
    const sessions = scope.sessions
    scope.slots.inject('conversation.input.model', () => scope.slots.register({
      name: 'conversation.input.model',
      locale: NS,
      priority: -1,
      inject: (sessionId: SessionId): ModelSelectInjected => {
        const directory = models.directoryFor(sessionId)
        const available = sessions.subagentAddress(sessionId) === undefined
        return {
          available,
          directory: directory.store,
          load: () => {
            if (available) directory.load().catch(() => {})
          },
          select: (selection) => available ? directory.select(selection).then(() => true, () => false) : Promise.resolve(false),
        }
      },
    }, ModelSelect))
  })
}
