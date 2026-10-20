/**
 * dsh-model-selector — 菜单键盘状态机的纯决策逻辑（node 可测）。
 *
 * 从 ModelSelect.tsx 的 onRootKeyDown 原样搬出（无 JSX、无 DOM、无模块级
 * 副作用）：Escape 分层、搜索框内方向键进列表、Home/End 跳首末、Enter 选
 * 首个命中，都是分支密集且易被「顺手改坏」的用户可见逻辑，留在 .tsx 里
 * 只能靠浏览器手测。事件处理器只做 dispatch，分支判定全在这里。
 */
/**
 * 焦点所在的控件是否自己消费方向键/Home/End。
 *
 * 判据不能只看「是不是 HTMLInputElement」：0.4.0 把原生 `<input type=range>`
 * 换成 `div[role=slider]` 之后，滑杆已不是 input，若仍按 input 判据，滑杆上的
 * ArrowUp/ArrowDown 会被菜单当成「进列表」而把焦点抢走、Home/End 会跳首末行
 * （实机可复现）。因此调用方把「焦点在滑杆内」显式传进来，这里统一收敛。
 * @param target - 焦点目标的两个事实：是否原生 input、是否在 effort 滑杆内。
 * @returns true 表示按键归该控件，菜单不得劫持。
 */
export declare function dmsOnNonInput(target: {
    isNativeInput: boolean;
    inEffortSlider: boolean;
}): boolean;
/** 键盘事件归一化后的输入面。 */
export interface MenuKeyInput {
    /** event.key（按原样比较，不做大小写归一）。 */
    key: string;
    /**
     * IME 组合输入中。调用方除 isComposing 外还要折算 Safari 的 keyCode 229：
     * WebKit 在 compositionend 之后补发的那次 Enter 带 isComposing === false，
     * 只有 keyCode 229 能识别 —— 否则中文候选上屏会直接选中首个命中、切换模型。
     */
    composing: boolean;
    /** 菜单是否打开。 */
    open: boolean;
    /** 焦点是否在搜索框内。 */
    fromSearch: boolean;
    /** 焦点是否在菜单容器内（搜索框/行/滑杆；trigger 不算）。 */
    inMenu: boolean;
    /** 焦点是否不在任何自管按键的控件上（原生 input / effort 滑杆；方向键归它们调档）。 */
    onNonInput: boolean;
    /** 搜索词是否非空。 */
    hasQuery: boolean;
    /** 当前可聚焦的行数（搜索态 = 命中数，分组态 = 组头 + 可见模型行）。 */
    rowCount: number;
    /** 搜索命中总数（Enter 选中首个命中的判据）。 */
    hitCount: number;
}
/** 决策结果：调用方据此执行副作用（preventDefault 由调用方按需决定）。 */
export type MenuKeyAction = {
    type: 'none';
} | {
    type: 'clearQuery';
    focusSearch: boolean;
} | {
    type: 'close';
} | {
    type: 'moveFocus';
    offset: number;
} | {
    type: 'focusEdge';
    last: boolean;
} | {
    type: 'chooseFirstHit';
};
/**
 * 按键 → 动作。无行可去时对方向键/Home/End 返回 none 而不是吞键：列表为空
 * （加载中/无命中/全折叠）时搜索框里的上下键仍应有移光标语义，preventDefault
 * 由调用方在真正执行动作时才发。
 */
export declare function dmsMenuKeyAction(input: MenuKeyInput): MenuKeyAction;
/**
 * roving 环绕下标：焦点不在任何行上（activeIndex < 0）时向下从首行进、向上从
 * 末行进；已在某行上时按 offset 循环。length <= 0 返回 -1（无可去之处）。
 */
export declare function dmsNextRowIndex(activeIndex: number, offset: number, length: number): number;
//# sourceMappingURL=keys.d.ts.map