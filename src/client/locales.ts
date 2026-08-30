/**
* `modelSelector` namespace dictionaries for the enhanced model seat.
*
* Simplified Chinese is the key-set source of truth; the English dictionary is
* checked complete against it. Product copy is Chinese-first per repo style.
*/
export const zh = {
"trigger.fallback": "选择模型",
"trigger.selectAria": "选择模型",
"trigger.aria": "选择模型，当前 {model}",
"trigger.ariaEffort": "选择模型，当前 {model}，推理等级 {effort}",
"menu.model": "模型",
"menu.effort": "推理等级",
"search.placeholder": "搜索模型",
"search.clearAria": "清除搜索",
"search.noMatch": "没有匹配“{query}”的模型。",
	"search.more": "仅显示前 {shown} 条（共 {total} 条命中），请细化关键词。",
"group.toggleAria": "{name}（{count} 个模型）",
"effort.providerDefault": "Default",
"status.loading": "正在刷新模型列表…",
"error.action": "模型操作失败：{message}",
"action.reload": "重新加载",
"warning.groupLoad": "{name} 加载失败：{message}",
"empty.models": "没有可用的模型。",
"empty.efforts": "当前模型未提供推理等级。",
"effort.failed": "档位切换未生效（后端未接受），已恢复原档位",
"notice.already": "已是当前模型，无需切换",
"notice.selectFailed": "切换失败，请重试",
"notice.alreadyEffort": "已是当前推理等级",
"badge.reasoning": "推理",
"badge.reasoningHint": "支持思考等级，切换后自动选到最大思考强度"
};


export const en = {
	"trigger.fallback": "Select model",
	"trigger.selectAria": "Select model",
	"trigger.aria": "Select model, current {model}",
	"trigger.ariaEffort": "Select model, current {model}, reasoning effort {effort}",
	"menu.model": "Model",
	"menu.effort": "Effort",
	"search.placeholder": "Search models",
	"search.clearAria": "Clear search",
	"search.noMatch": "No models match “{query}”.",
	"search.more": "Showing first {shown} of {total} matches; refine your query.",
	"group.toggleAria": "{name} ({count} models)",
	"effort.providerDefault": "Default",
	"status.loading": "Refreshing model list…",
	"error.action": "Model operation failed: {message}",
	"action.reload": "Reload",
	"warning.groupLoad": "{name} failed to load: {message}",
	"empty.models": "No models available.",
	"empty.efforts": "This model provides no reasoning effort levels.",
	"effort.failed": "Failed to switch effort (backend rejected); restored",
	"notice.already": "Already the current model",
"notice.selectFailed": "Switch failed, please try again",
	"notice.alreadyEffort": "Already the current effort",
	"badge.reasoning": "Reasoning",
	"badge.reasoningHint": "Supports reasoning levels; switches land on the strongest"
};
declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The enhanced model seat copy. */
    modelSelector: keyof typeof zh
  }
}
