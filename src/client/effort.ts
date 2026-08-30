/**
 * dsh-model-selector — 推理强度档位的纯函数。
 *
 * 从 ModelSelect.tsx 原样搬出（无 JSX、无 DOM、无模块级副作用），以便用
 * node --test 直接跑源码：滑块钳位、档位映射与「取模型最强档」都是易错且
 * 用户可见的逻辑，留在 .tsx 里则无法脱离 React 测试。
 */
import type { ModelDirectoryState } from '@deepseek-ai/dsh-client-ui-model-selection/client'
import type { ModelProviderGroup, ModelReasoning } from '@deepseek-ai/dsh-api-session-controller/types'

/** One model effort level as advertised by the adapter. */
export type EffortLevel = ModelReasoning['efforts'][number]
/** Per-session model directory snapshot (official state shape). */
export type DirectoryState = ModelDirectoryState
/** The selected model entry, or undefined when nothing resolves. */
export type ModelEntry = ModelProviderGroup['models'][number]

/** Canonical strength order of pi-ai thinking levels (strongest = highest). */
export const EFFORT_RANK = {
  off: 0,
  minimal: 1,
  low: 2,
  medium: 3,
  high: 4,
  xhigh: 5,
  max: 6,
}

/** The strongest thinking level a model offers, or undefined for none. */
export function maxEffortOf(reasoning: ModelReasoning): string | undefined {
  let best
  for (const effort of reasoning.efforts) {
    const rank = EFFORT_RANK[effort.id as keyof typeof EFFORT_RANK] ?? 0
    if (best === void 0 || rank > best.rank) best = {
      id: effort.id,
      rank,
    }
  }
  return best?.id
}

export function dmsEffortIndex(levels: readonly EffortLevel[], id: string | undefined): number {
  return levels.findIndex((level) => level.id === id)
}

/** 索引钳位：档位数为 0 时返回 0，四舍五入后落在 [0, count-1]。 */
export function dmsClampIndex(value: number, count: number): number {
  if (count <= 0) return 0
  return Math.max(0, Math.min(count - 1, Math.round(value)))
}

export function dmsCurrentModel(state: DirectoryState): ModelEntry | undefined {
  if (state.current === null) return void 0
  const current = state.current
  const group = state.groups.find((g) => g.id === current.provider)
  const model = group?.models.find((m) => m.id === current.model)
  return model ?? void 0
}

/** 当前生效档位：用户已选优先，其次模型默认，最后取中间档。 */
export function dmsEffectiveEffortIndex(levels: readonly EffortLevel[], state: DirectoryState): number {
  const reasoning = dmsCurrentModel(state)?.reasoning
  const current = dmsEffortIndex(levels, state.current?.reasoningEffort)
  if (current >= 0) return current
  const fallback = dmsEffortIndex(levels, reasoning?.defaultEffort)
  if (fallback >= 0) return fallback
  return Math.floor((levels.length - 1) / 2)
}

/** 滑块档位：少于两档（无法构成滑杆）时返回空数组。 */
export function dmsSliderLevels(state: DirectoryState): readonly EffortLevel[] {
  const efforts = dmsCurrentModel(state)?.reasoning?.efforts
  return efforts !== void 0 && efforts.length >= 2 ? efforts : []
}
