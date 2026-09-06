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
export declare function dmsEffortIndex(levels: readonly EffortLevel[], id: string | undefined): number;
/** 索引钳位：档位数为 0 时返回 0，四舍五入后落在 [0, count-1]。 */
export declare function dmsClampIndex(value: number, count: number): number;
/**
 * 指针水平位置 → 档位原始值（未四舍五入，拖动中途可落在两档之间；落点由
 * 提交方 clamp）。输入条退化（宽度 ≤ 0 或档位数 < 2）时保持当前值不动。
 */
export declare function dmsPointerRaw(clientX: number, left: number, width: number, levelCount: number, current: number): number;
export declare function dmsCurrentModel(state: DirectoryState): ModelEntry | undefined;
/** 当前生效档位：用户已选优先，其次模型默认，最后取中间档。 */
export declare function dmsEffectiveEffortIndex(levels: readonly EffortLevel[], state: DirectoryState): number;
/** 滑块档位：少于两档（无法构成滑杆）时返回空数组。 */
export declare function dmsSliderLevels(state: DirectoryState): readonly EffortLevel[];
/**
 * 滑杆是否处于忙态：自身提交中，或共享目录上有任一 select 在途
 * （目录 select 是 last-writer-wins，模型切换在途时再发 effort RPC 会与
 * 它交错——effort 打到旧模型上，与模型切换互相覆盖；choose() 按同一状态
 * 拒绝了模型点击，滑杆必须同规则拒绝交互）。
 */
export declare function dmsEffortBusy(committing: boolean, status: DirectoryState['status']): boolean;
/**
 * 超时回滚后 select 迟到成功是否应采纳并同步 UI：
 * 只有当自回滚以来没有任何新的提交改写 committedRef（仍等于回滚前的档位）、
 * 提交纪元未推进（epoch === epochAtCommit，即期间没有发起过新提交——提交失败
 * 回滚后 committedRef 会回到与上一轮回滚相同的值，值比较无法区分「无新提交」
 * 与「新提交失败回滚」，纪元才能区分）、且当前无拖动/提交在途时，迟到结果才
 * 仍对应当前唯一的意图链——此时 UI 处于「回滚但后端已生效」的错位态，应补
 * 一次同步而不是保持回滚。否则以新操作链为准。
 */
export declare function dmsShouldAdoptLateSuccess(committed: string, previous: string, dragging: boolean, committing: boolean, epoch: number, epochAtCommit: number): boolean;
/**
 * 拖动终止事件是否对应当前活动拖动：pointerActive 为假（拖动已结束/从未开始）
 * 或事件 pointerId 与活动指针不一致（迟到/重复事件——典型是 pointercancel 终态
 * 后平台补发的 pointerup）时返回 false，调用方应幂等跳过终止动作：不清状态、
 * 不触发提交/回滚回调。pointerId 缺省（blur 兜底提交，无事件对象）时只要求
 * 拖动仍在进行中。
 */
export declare function dmsIsActiveDrag(pointerActive: boolean, activePointerId: number | null, pointerId: number | undefined): boolean;
//# sourceMappingURL=effort.d.ts.map