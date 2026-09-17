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
import type { Context as ClientContext } from '@deepseek-ai/cordis';
/**
 * 座位优先级。ui-conversation 把 `conversation.input.model` 声明为 kind 'single'
 * （单槽按 priority 升序取最低者渲染），官方占用者
 * （@deepseek-ai/dsh-client-ui-model-selection）注册时不传 priority（即默认 0），
 * 故 -1 恒胜出。**改这个值等于静默换回官方 UI** —— test/plugin-contract.test.mjs
 * 直接断言本常量（而不是扫源码文本，那样一行注释就能骗过它），注册处也不许再写裸字面量。
 */
export declare const SEAT_PRIORITY = -1;
/** Required services: the registry, session lookup, locale, the slot seat, and the model directory's Remote faces. */
export declare const inject: string[];
/**
 * Client plugin body: register the dictionaries and stylesheet, then take the
 * model seat over the shared directory once `modelDirectories` appears.
 * @param ctx - client root context.
 */
export declare function apply(ctx: ClientContext): void;
//# sourceMappingURL=index.d.ts.map