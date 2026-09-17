/**
 * dsh-model-selector — 搜索匹配、高亮区间与列表空态的纯函数（node 可测）。
 *
 * 从 ModelSelect.tsx 原样搬出：归一化、haystack 构造、命中窗口截断、名称高亮
 * 区间与「无模型 / 无命中」的优先级都是用户可见且曾经出过错的分支，留在 .tsx
 * 里只能靠浏览器手测。
 */
import type { ModelProviderGroup, ModelSelection } from '@deepseek-ai/dsh-api-session-controller/types';
/** 搜索索引条目：模型 + 折叠后的 haystack + 选中载荷。 */
export interface SearchChoice {
    group: ModelProviderGroup;
    model: ModelProviderGroup['models'][number];
    /** dmsFold 之后的搜索文本（名称/描述/供应商名/id）。 */
    haystack: string;
    selection: ModelSelection;
}
/** 搜索命中的渲染条目。 */
export interface SearchHit {
    group: ModelProviderGroup;
    model: ModelProviderGroup['models'][number];
    /** 名称内的命中区间（原串坐标）；null = 命中落在描述/供应商/id 上，或无法安全定位。 */
    nameHit: {
        start: number;
        end: number;
    } | null;
}
/** 搜索结果：items 为窗口内条目（渲染用），total 为命中总数（播报/截断提示用）。 */
export interface SearchResult {
    items: SearchHit[];
    total: number;
}
/**
 * 搜索归一化：NFKD 分解 → 去组合标记 → 小写。
 *
 * 比裸 `toLowerCase()` 宽容：`'İstanbul'` 能被 `'istanbul'` 命中（裸 toLowerCase
 * 把 U+0130 折成 `'i̇'` 两个码位，与 ASCII `'i'` 反而不匹配 → 漏检；`'café'` 同理）。
 * 注意它**可能改变码位长度**，所以不能用它的下标去切原串 —— 高亮区间另走
 * {@link dmsNameHit}，只在长度不变时给区间。
 */
export declare function dmsFold(text: string): string;
/** 搜索词归一化（去首尾空白后折叠）。空串 = 非搜索态。 */
export declare function dmsNormalizeQuery(raw: string): string;
/** 模型条目的搜索文本（haystack）。与 choices 构建处同源，避免两处漂移。 */
export declare function dmsHaystack(group: ModelProviderGroup, model: ModelProviderGroup['models'][number]): string;
/**
 * 名称内的命中区间：折叠后长度不变时用下标定位；长度变化（含会改变码位数的
 * 大小写/变音符映射）时返回 null —— 宁可不高亮，也不能用错位的区间去切原串
 * （那会把高亮画到别的字符上，甚至越界）。
 */
export declare function dmsNameHit(name: string, normalizedQuery: string): {
    start: number;
    end: number;
} | null;
/**
 * 搜索：遍历 choices 计数全部命中，只构造窗口内（前 limit 条）的渲染条目 ——
 * 宽泛关键词（单字母）命中数百条时，每次击键省掉数百次对象分配与名称匹配；
 * total 单独累计，播报与「仅显示前 N 条」提示仍然准确。
 */
export declare function dmsSearchHits(choices: readonly SearchChoice[], normalizedQuery: string, limit: number): SearchResult | null;
/** 列表区空态：'noModels' = 目录里没有模型，'noHits' = 搜索无命中，null = 正常渲染列表。 */
export type MenuEmptyState = 'noModels' | 'noHits' | null;
/**
 * 空态判定：**无模型优先于无命中** —— 目录为空而用户又输了关键词时，真相是
 * 「没有可用的模型」（该引导用户去配置/加载目录），不是「没有匹配关键词的模型」
 * （那会引导用户去改关键词，而无论改什么都不会有结果）。
 */
export declare function dmsMenuEmptyState(input: {
    status: string;
    choiceCount: number;
    searching: boolean;
    hitCount: number;
}): MenuEmptyState;
//# sourceMappingURL=search.d.ts.map