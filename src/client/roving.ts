/**
 * dsh-model-selector — 菜单 roving tabindex 的纯决策逻辑（node 可测）。
 *
 * 模型列表可达数百行，若每行都是 Tab 停靠点，Tab 键会陷入行海；roving
 * tabindex（WAI-ARIA menu 模式的通行做法）只让「活动行」留在 Tab 序里，
 * 其余行 tabindex=-1、仅方向键可达。本模块只负责一件事：给定当前渲染的
 * 行集合与选中行，算出 Tab 从搜索框进入列表时应停靠的默认行键。
 */
export interface RovingRowSet {
  /** 搜索命中行键（渲染顺序）；null = 非搜索态（分组视图）。 */
  hitKeys: readonly string[] | null
  /** 分组视图中可见（未折叠）的模型行键（渲染顺序）。 */
  modelKeys: readonly string[]
  /** 分组视图中全部组头键（组头始终渲染，即使组被折叠）。 */
  headerKeys: readonly string[]
  /** 当前选中行键；null = 尚无选中。 */
  selectedKey: string | null
}

/**
 * Tab 默认落点：搜索态取「选中行若在命中集内，否则首个命中」；分组态取
 * 「选中行若可见，否则首个可见模型行」；全部折叠（无可见模型行）时回退到
 * 首个组头。返回 null 表示当前没有任何可聚焦行（空态由菜单外的 role=status
 * 播报，列表容器不渲染）。
 */
export function dmsDefaultRowKey(set: RovingRowSet): string | null {
  if (set.hitKeys !== null) {
    if (set.hitKeys.length === 0) return null
    return set.selectedKey !== null && set.hitKeys.includes(set.selectedKey) ? set.selectedKey : set.hitKeys[0]!
  }
  if (set.modelKeys.length > 0) {
    return set.selectedKey !== null && set.modelKeys.includes(set.selectedKey) ? set.selectedKey : set.modelKeys[0]!
  }
  return set.headerKeys[0] ?? null
}
