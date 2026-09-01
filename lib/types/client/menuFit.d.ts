/**
 * dsh-model-selector — 菜单弹出方向与高度钳位的纯函数。
 *
 * 从 ModelSelect.tsx 原样搬出（无 JSX、无 DOM、无模块级副作用），以便用
 * node --test 直接跑源码：方向决策（向上 vs 向下弹）和向下弹的高度钳位都是
 * 用户可见且曾在矮窗口/滚动场景出过 bug 的逻辑，留在 .tsx 里则无法脱离
 * 浏览器测试。
 */
/** 菜单设计最大高度（px）；实际由 useAnchoredMaxHeight 按视口可用空间钳位。 */
export declare const MENU_MAX_HEIGHT = 420;
/** 与视口边缘保留的距离；对齐 primitives 里未导出的 MARGIN。 */
export declare const MENU_VIEWPORT_MARGIN = 12;
/**
 * 向上弹当且仅当 trigger 上方可用空间不小于下方可用空间：
 * 取上下两侧中空间更大的一侧，避免矮窗口把面板挤到视口下沿外面。
 */
export declare function dmsMenuAbove(triggerTop: number, triggerBottom: number, viewportHeight: number): boolean;
/** 向下弹时按 trigger 下方空间钳位菜单高度（top-anchored，不能复用向上弹的 fit）。 */
export declare function dmsBelowMaxHeight(triggerBottom: number, viewportHeight: number, cap: number): number;
/**
 * 菜单水平钳位：默认右锚定（right:0，与 seat 右缘对齐）；seat 右缘左侧放不下
 * 整幅菜单（seat 靠输入区左下 + 窄窗口）时，返回钳到视口内的 left 值，调用方
 * 改用 left 锚定。返回 undefined 表示保持默认右锚定。
 * menuWidth 传菜单实际渲染宽度（offsetWidth），与 CSS `min(280px, 100vw-32px)` 解耦。
 */
export declare function dmsMenuLeft(rootRight: number, menuWidth: number, viewportWidth: number, margin: number): number | undefined;
//# sourceMappingURL=menuFit.d.ts.map