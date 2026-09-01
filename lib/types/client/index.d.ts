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
/** Required services: the registry, session lookup, locale, the slot seat, and the model directory's Remote faces. */
export declare const inject: string[];
/**
 * Client plugin body: register the dictionaries and stylesheet, then take the
 * model seat over the shared directory once `modelDirectories` appears.
 * @param ctx - client root context.
 */
export declare function apply(ctx: ClientContext): void;
//# sourceMappingURL=index.d.ts.map