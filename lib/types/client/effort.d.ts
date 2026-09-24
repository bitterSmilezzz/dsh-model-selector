/**
 * dsh-model-selector — 推理强度档位的纯函数。
 *
 * 从 ModelSelect.tsx 原样搬出（无 JSX、无 DOM、无模块级副作用），以便用
 * node --test 直接跑源码：滑块钳位、档位映射与「取模型最强档」都是易错且
 * 用户可见的逻辑，留在 .tsx 里则无法脱离 React 测试。
 */
import type { ModelDirectoryState } from '@deepseek-ai/dsh-client-ui-model-selection/client';
import type { ModelProviderGroup, ModelReasoning } from '@deepseek-ai/dsh-api-session-controller/types';
/** One model effort level as advertised by the adapter. */
export type EffortLevel = ModelReasoning['efforts'][number];
/** Per-session model directory snapshot (official state shape). */
export type DirectoryState = ModelDirectoryState;
/** The selected model entry, or undefined when nothing resolves. */
export type ModelEntry = ModelProviderGroup['models'][number];
/** Canonical strength order of pi-ai thinking levels (strongest = highest). */
export declare const EFFORT_RANK: {
    off: number;
    minimal: number;
    low: number;
    medium: number;
    high: number;
    xhigh: number;
    max: number;
};
/** The strongest thinking level a model offers, or undefined for none. */
export declare function maxEffortOf(reasoning: ModelReasoning): string | undefined;
/**
 * 已知档位的秩；适配器自造的非规范 id（如 'turbo'）返回 undefined —— 与
 * 「已知但秩为 0」（off）区分开。maxEffortOf 对并列的未知档取首个，把它当
 * 「最强档」提交等于随机挑一个档、还可能被宿主拒，故调用方必须先过这一关。
 */
export declare function dmsEffortRank(id: string): number | undefined;
/** 选中模型时的自动档位决策。 */
export interface ChoosePlan {
    /** 随选择提交的档位 id；undefined = 不提交 reasoningEffort（交给宿主用模型默认档）。 */
    effort: string | undefined;
    /** 是否播报「已自动选到最强思考档」：只有确实替用户做了决定（提交档 ≠ 模型默认档）才播。 */
    autoRaised: boolean;
}
/**
 * 选择模型时自动落到最强档的决策（从 choose() 搬出并修正）：
 *  - 非推理模型 / 无档位 → 不提交 effort；
 *  - 最强档是 'off'（模型只提供 off）→ 不提交；
 *  - 最强档是**非规范 id**（rank 未知）→ 不提交：maxEffortOf 对并列未知档取
 *    首个，把它当「最强」提交会挑错档甚至被宿主拒（用户看到「切换失败」）；
 *  - 否则提交已知最强档；只有它不等于模型声明的默认档时才播报落点。
 */
export declare function dmsChoosePlan(reasoning: ModelReasoning | undefined): ChoosePlan;
export declare function dmsEffortIndex(levels: readonly EffortLevel[], id: string | undefined): number;
/** 索引钳位：档位数为 0 时返回 0，四舍五入后落在 [0, count-1]。 */
export declare function dmsClampIndex(value: number, count: number): number;
/**
 * 指针水平位置 → 档位原始值（未四舍五入，拖动中途可落在两档之间；落点由
 * 提交方 clamp）。输入条退化（宽度 ≤ 0 或档位数 < 2）时保持当前值不动。
 */
export declare function dmsPointerRaw(clientX: number, left: number, width: number, levelCount: number, current: number): number;
export declare function dmsCurrentModel(state: DirectoryState): ModelEntry | undefined;
/**
 * trigger 的 effort 文案：已选模型在 catalog 中查不到时（rc.2 官方目录「保留态」：
 * current 仍留着，模型/提供商已离开目录）回落到目录的 `retainedEffort`。
 * 官方 ModelSelect 同规则——不回落会让 trigger 在模型离开目录后莫名丢掉档位名。
 * 老运行时（rc.1 及更早）无 retainedEffort 字段，回落值为 undefined，行为不变。
 */
export declare function dmsRetainedEffortLabel(state: DirectoryState): string | undefined;
/** 当前生效档位：用户已选优先，其次模型默认，最后取中间档。 */
export declare function dmsEffectiveEffortIndex(levels: readonly EffortLevel[], state: DirectoryState): number;
/** 滑块档位：少于两档（无法构成滑杆）时返回空数组。 */
export declare function dmsSliderLevels(state: DirectoryState): readonly EffortLevel[];
/**
 * 滑杆是否处于忙态：自身提交中，或共享目录上有任一 select 在途
 * （目录 select 是 last-writer-wins，模型切换在途时再发 effort RPC 会与
 * 它交错——effort 打到旧模型上，与模型切换互相覆盖；choose() 按同一状态
 * 拒绝了模型点击，滑杆必须同规则拒绝交互）。
 *
 * 目录在途的判据是 `pending !== null`（DSH 0.1.7-rc.2 起官方目录语义）：
 * 它比 `status === 'selecting'` 早一步置位——`select()` 一被调用就记下
 * pending，RPC 未返回前 status 仍是 idle/ready。只按 status 判断存在一个
 * 窗口期：pending 已写入而 status 未翻，此时拖动会被接受并与在途的 select
 * 交错。旧运行时没有 pending 字段（rc.1 及更早），`pending` 为 undefined
 * 时退回 status 判据，保证向后兼容。
 */
export declare function dmsEffortBusy(committing: boolean, status: DirectoryState['status'], pending?: DirectoryState['pending']): boolean;
/**
 * 超时回滚后 select 迟到成功是否应采纳并同步 UI：
 * 只有当自回滚以来没有任何新的提交改写 committedRef（仍等于回滚前的档位）、
 * 提交纪元未推进（epoch === epochAtCommit，即期间没有发起过新提交——提交失败
 * 回滚后 committedRef 会回到与上一轮回滚相同的值，值比较无法区分「无新提交」
 * 与「新提交失败回滚」，纪元才能区分）、当前无拖动/提交在途，**且生效模型仍是
 * 发起提交时的那个**（sameModel）时，迟到结果才仍对应当前唯一的意图链——此时
 * UI 处于「回滚但后端已生效」的错位态，应补一次同步而不是保持回滚。
 * 否则以新操作链为准：模型被外部改写（另一入口切换 / 宿主推送新投影 / 重连后
 * 同步出别的选择）时，next/index 是在旧模型的档位表上算出来的，写回 UI 会显示
 * 一个后端并未生效的档位。
 */
export declare function dmsShouldAdoptLateSuccess(committed: string, previous: string, dragging: boolean, committing: boolean, epoch: number, epochAtCommit: number, sameModel: boolean): boolean;
/**
 * 拖动终止事件是否对应当前活动拖动：pointerActive 为假（拖动已结束/从未开始）
 * 或事件 pointerId 与活动指针不一致（迟到/重复事件——典型是 pointercancel 终态
 * 后平台补发的 pointerup）时返回 false，调用方应幂等跳过终止动作：不清状态、
 * 不触发提交/回滚回调。pointerId 缺省（blur 兜底提交，无事件对象）时只要求
 * 拖动仍在进行中。
 */
export declare function dmsIsActiveDrag(pointerActive: boolean, activePointerId: number | null, pointerId: number | undefined): boolean;
//# sourceMappingURL=effort.d.ts.map