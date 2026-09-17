/**
 * dsh-model-selector — trigger 文案回退链的纯函数（node 可测）。
 *
 * 从 ModelSelect.tsx 原样搬出：四条近乎互相复制的表达式（可见文本 / title /
 * aria）含三层嵌套三目，是本组件里 drift 风险最高的一段，抽出来用假 t 直接测。
 */
import type { ModelSelection } from '@deepseek-ai/dsh-api-session-controller/types'
import type { Translate } from '@deepseek-ai/dsh-client-ui-slots'

/**
 * 本模块用到的字典键。用具体联合而不是 string：调用处传进来的
 * `TranslateNS<'modelSelector'>` 参数逆变后要求这些键必须真的在字典里 ——
 * 字典改名会在编译期报错，而不是运行时渲染出原始 key。
 */
export type TriggerKey =
  | 'trigger.fallback'
  | 'trigger.loading'
  | 'trigger.selectAria'
  | 'trigger.aria'
  | 'trigger.ariaEffort'

/** 文案输入：目录命中的名字优先，命中不到时回退到原始 id。 */
export interface TriggerCopyInput {
  current: ModelSelection | null
  /** 当前选中项在目录里的名称；不在目录中时为 undefined。 */
  modelName: string | undefined
  /** 当前选中项所属供应商名；不在目录中时为 undefined。 */
  providerName: string | undefined
  /** 当前生效的推理档位名；模型无推理或档位未解析时为 undefined。 */
  effortLabel: string | undefined
  /** current 为 null 且目录仍在加载。 */
  waiting: boolean
}

/** trigger 的四路文案。 */
export interface TriggerCopy {
  modelLabel: string
  providerLabel: string | undefined
  /** 可见文本（`·` 拼接 effort）。 */
  label: string
  /** title：供应商 · 可见文本。 */
  title: string
  /** aria-label：读屏可听到模型 + 档位。 */
  aria: string
}

/**
 * trigger 文案。目录成员资格只是参考（routable 契约）：current 匹配不到任何
 * group 不代表没有选择 —— 此时显示 provider/model 原始 id，而不是「选择模型」。
 */
export function dmsTriggerCopy(input: TriggerCopyInput, t: Translate<TriggerKey>): TriggerCopy {
  const { current, modelName, providerName, effortLabel, waiting } = input
  const modelLabel = modelName
    ?? (waiting
      ? t('trigger.loading')
      : current === null ? t('trigger.fallback') : `${current.provider}/${current.model}`)
  // 供应商名只在目录命中时才有意义（原始 id 回退态不显示供应商行）。
  const providerLabel = modelName === undefined ? void 0 : providerName
  const label = effortLabel === undefined ? modelLabel : `${modelLabel} · ${effortLabel}`
  const title = providerLabel === undefined ? label : `${providerLabel} · ${label}`
  const named = providerLabel === undefined ? modelLabel : `${providerLabel} ${modelLabel}`
  // aria 的模型部分：目录命中时用「供应商 模型名」，回退态用原始 id（与可见文本同源）。
  const ariaModel = modelName === undefined ? (current === null ? null : `${current.provider}/${current.model}`) : named
  const aria = waiting
    ? t('trigger.loading')
    : ariaModel === null
      ? t('trigger.selectAria')
      : effortLabel === undefined
        ? t('trigger.aria', { model: ariaModel })
        : t('trigger.ariaEffort', { model: ariaModel, effort: effortLabel })
  return { modelLabel, providerLabel, label, title, aria }
}
