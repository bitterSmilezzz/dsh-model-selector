/**
 * dsh-model-selector — EffortSlider 的指针拖动状态机。
 *
 * 从 ModelSelect.tsx 原样搬出（原 EffortSlider 的 8 个 ref 指针生命周期）：
 * 拖动只认发起时记录的活动 pointerId，window 捕获阶段的 move/up/cancel 兜底
 * 指针拖出输入条/菜单外的场景；取消（pointercancel / 触控失控）走回滚回调，
 * 不提交。几何换算（clientX → 档位原始值）与忙态判定都经由回调外接，
 * hook 本身不读组件状态，拖动中途组件重渲染（preview setState）不会中断拖动。
 */
import * as react from 'react';
export interface EffortDragHandlers {
    onPointerDown: (event: react.PointerEvent<HTMLInputElement>) => void;
    onPointerMove: (event: react.PointerEvent<HTMLInputElement>) => void;
    onPointerUp: (event: react.PointerEvent<HTMLInputElement>) => void;
    onPointerCancel: (event: react.PointerEvent<HTMLInputElement>) => void;
    onBlur: () => void;
}
export interface UseEffortDragOptions {
    /** 当前档位数（levels.length），拖动态期间变化时以最新值为准。 */
    levelCount: () => number;
    /** 忙态（提交中/目录 select 在途）时拒绝新开拖动。 */
    canStart: () => boolean;
    /** 拖动中预览（组件侧乐观 setState）；返回值供组件更新其当前 raw ref。 */
    onPreview: (raw: number) => void;
    /** 拖动结束（pointerup / blur 兜底）时提交；拖出后归位也会提交同一档。 */
    onCommit: (raw: number) => void;
    /** 取消（pointercancel / 触控失控）时回滚到已提交档，不提交。 */
    onRollback: () => void;
    inputRef: react.RefObject<HTMLInputElement | null>;
    /** 拖动活状态（true = 指针按下未结束）。组件与 hook 共享同一 ref：
     *  组件侧用它守卫「拖动态不被打断」（commit 迟到采纳判定、目录同步 effect）。 */
    draggingRef: react.MutableRefObject<boolean>;
}
export declare function useEffortDrag({ levelCount, canStart, onPreview, onCommit, onRollback, inputRef, draggingRef }: UseEffortDragOptions): {
    dragging: boolean;
    draggingRef: react.MutableRefObject<boolean>;
    handlers: EffortDragHandlers;
};
//# sourceMappingURL=effortDrag.d.ts.map