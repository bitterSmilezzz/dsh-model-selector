/**
 * dsh-model-selector — trigger 文案回退链的纯函数（node 可测）。
 *
 * 从 ModelSelect.tsx 原样搬出：四条近乎互相复制的表达式（可见文本 / title /
 * aria）含三层嵌套三目，是本组件里 drift 风险最高的一段，抽出来用假 t 直接测。
 */
import type { ModelSelection } from '@deepseek-ai/dsh-api-session-controller/types';
import type { Translate } from '@deepseek-ai/dsh-client-ui-slots';
/**
 * 本模块用到的字典键。用具体联合而不是 string：调用处传进来的
 * `TranslateNS<'modelSelector'>` 参数逆变后要求这些键必须真的在字典里 ——
 * 字典改名会在编译期报错，而不是运行时渲染出原始 key。
 */
export type TriggerKey = 'trigger.fallback' | 'trigger.loading' | 'trigger.selectAria' | 'trigger.aria' | 'trigger.ariaEffort';
/** 文案输入：目录命中的名字优先，命中不到时回退到原始 id。 */
export interface TriggerCopyInput {
    current: ModelSelection | null;
    /** 当前选中项在目录里的名称；不在目录中时为 undefined。 */
    modelName: string | undefined;
    /** 当前选中项所属供应商名；不在目录中时为 undefined。 */
    providerName: string | undefined;
    /** 当前生效的推理档位名；模型无推理或档位未解析时为 undefined。 */
    effortLabel: string | undefined;
    /** current 为 null 且目录仍在加载。 */
    waiting: boolean;
}
/** trigger 的四路文案。 */
export interface TriggerCopy {
    modelLabel: string;
    providerLabel: string | undefined;
    /** 可见文本（`·` 拼接 effort）。 */
    label: string;
    /** title：供应商 · 可见文本。 */
    title: string;
    /** aria-label：读屏可听到模型 + 档位。 */
    aria: string;
}
/**
 * trigger 文案。目录成员资格只是参考（routable 契约）：current 匹配不到任何
 * group 不代表没有选择 —— 此时显示 provider/model 原始 id，而不是「选择模型」。
 */
export declare function dmsTriggerCopy(input: TriggerCopyInput, t: Translate<TriggerKey>): TriggerCopy;
//# sourceMappingURL=copy.d.ts.map