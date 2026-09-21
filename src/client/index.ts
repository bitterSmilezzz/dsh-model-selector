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
// Type-only: pulls the ui-renderer Context merge (ctx.slots), moved here in dsh alpha.2.
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
// Type-only: pulls the session controller Context merge (ctx.sessions) in alpha.2.
import type {} from '@deepseek-ai/dsh-api-session-controller/client'
// Type-only: pulls the ui-conversation SlotMap merge (the input model seat).
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: pulls the model-selection plugin's Context merge (ctx.modelDirectories)
// plus the injected face type the seat registration hands to the component.
import type { ModelSelectInjected } from '@deepseek-ai/dsh-client-ui-model-selection/client'
import { ModelSelect, zhDict, enDict } from './ModelSelect.tsx'
import { CSS } from './styles.ts'

/** Dictionary namespace owned by this plugin. */
const NS = 'modelSelector'

/**
 * 座位优先级。ui-conversation 把 `conversation.input.model` 声明为 kind 'single'
 * （单槽按 priority 升序取最低者渲染），官方占用者
 * （@deepseek-ai/dsh-client-ui-model-selection）注册时不传 priority（即默认 0），
 * 故 -1 恒胜出。**改这个值等于静默换回官方 UI** —— test/plugin-contract.test.mjs
 * 直接断言本常量（而不是扫源码文本，那样一行注释就能骗过它），注册处也不许再写裸字面量。
 */
export const SEAT_PRIORITY = -1

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
    tag.dataset.plugin = '@bittersmilezzz/dsh-model-selector'
    tag.textContent = CSS
    document.head.appendChild(tag)
    return () => {
      tag.remove()
    }
  }, 'dsh-model-selector: styles')
  ctx.inject(['modelDirectories'], (scope) => {
    const models = scope.modelDirectories
    const sessions = scope.sessions
    // 有意的座位层重叠，勿当 bug「修掉」：官方 @deepseek-ai/dsh-client-ui-model-selection
    // 自带同名座位（packages/client/ui-model-selection/src/client/index.ts:177，
    // 未传 priority → 默认 0），本插件靠 priority: -1 遮蔽它。ui-conversation 把该座位
    // 声明为 single/session（kind: 'single'; scope: 'session'），single 槽「priority 升序
    // 取最低者渲染」，故 -1 恒胜出。两者共用同一份 ctx.modelDirectories 会话目录，
    // 任一入口的切换就是另一入口的显示——重叠是设计取舍，不是冲突。
    // 重新评估触发条件：官方若改动该座位的默认优先级、或把它从 single 改成 chain
    // （chain 每项都参与渲染，遮蔽不生效），此遮蔽即失效，不能默认仍然成立。
    scope.slots.inject('conversation.input.model', () => scope.slots.register({
      name: 'conversation.input.model',
      locale: NS,
      priority: SEAT_PRIORITY,
      inject: (sessionId: string): ModelSelectInjected => {
        const sid = sessionId as SessionId
        const directory = models.directoryFor(sid)
        const available = sessions.subagentAddress(sid) === undefined
        return {
          available,
          directory: directory.store,
          load: () => {
            if (available) directory.load().catch((error: unknown) => { console.warn('[dsh-model-selector] directory.load failed:', error) })
          },
          // alpha.2 契约：直接透传 directory.select 的 RemoteResult（失败详情随 error
          // 回给调用方播报），不可选时 Promise.resolve(undefined)（与官方注册同款）。
          select: (selection) => available
            ? directory.select(selection)
            : Promise.resolve(undefined),
        }
      },
    }, ModelSelect))
  })
}
