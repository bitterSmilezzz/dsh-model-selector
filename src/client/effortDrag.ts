/**
 * dsh-model-selector — EffortSlider 的指针拖动状态机。
 *
 * 从 ModelSelect.tsx 原样搬出（原 EffortSlider 的 8 个 ref 指针生命周期）：
 * 拖动只认发起时记录的活动 pointerId，window 捕获阶段的 move/up/cancel 兜底
 * 指针拖出输入条/菜单外的场景；取消（pointercancel / 触控失控）走回滚回调，
 * 不提交。几何换算（clientX → 档位原始值）与忙态判定都经由回调外接，
 * hook 本身不读组件状态，拖动中途组件重渲染（preview setState）不会中断拖动。
 */
import * as react from 'react'
import { dmsPointerRaw } from './effort.ts'

export interface EffortDragHandlers {
  onPointerDown: (event: react.PointerEvent<HTMLInputElement>) => void
  onPointerMove: (event: react.PointerEvent<HTMLInputElement>) => void
  onPointerUp: (event: react.PointerEvent<HTMLInputElement>) => void
  onPointerCancel: (event: react.PointerEvent<HTMLInputElement>) => void
  onBlur: () => void
}

export interface UseEffortDragOptions {
  /** 当前档位数（levels.length），拖动态期间变化时以最新值为准。 */
  levelCount: () => number
  /** 忙态（提交中/目录 select 在途）时拒绝新开拖动。 */
  canStart: () => boolean
  /** 拖动中预览（组件侧乐观 setState）；返回值供组件更新其当前 raw ref。 */
  onPreview: (raw: number) => void
  /** 拖动结束（pointerup / blur 兜底）时提交；拖出后归位也会提交同一档。 */
  onCommit: (raw: number) => void
  /** 取消（pointercancel / 触控失控）时回滚到已提交档，不提交。 */
  onRollback: () => void
  inputRef: react.RefObject<HTMLInputElement | null>
  /** 拖动活状态（true = 指针按下未结束）。组件与 hook 共享同一 ref：
   *  组件侧用它守卫「拖动态不被打断」（commit 迟到采纳判定、目录同步 effect）。 */
  draggingRef: react.MutableRefObject<boolean>
}

/**
 * 拖动中由 pointerId 校验的几何换算：raw = (clientX - left) / width 映射到档位区间。
 * 输入条退化（宽度 ≤ 0 / 档位数 < 2）时返回 fallback（当前值，不跳档）。
 */
function rawFromPointer(input: HTMLInputElement, clientX: number, levelCount: number, fallback: number): number {
  const bounds = input.getBoundingClientRect();
  return dmsPointerRaw(clientX, bounds.left, bounds.width, levelCount, fallback);
}

export function useEffortDrag({ levelCount, canStart, onPreview, onCommit, onRollback, inputRef, draggingRef }: UseEffortDragOptions) {
  const [dragging, setDragging] = react.useState(false);
  const pointerActiveRef = react.useRef(false);
  const activePointerIdRef = react.useRef<number | null>(null);
  // 拖动中最近一次预览的 raw：blur 兜底提交（无 clientX）时用它。
  const lastRawRef = react.useRef(0);
  // 回调经 ref 转发，hook 内部的事件处理器始终持有最新闭包（组件重渲染不重建监听）。
  const callbacksRef = react.useRef({ levelCount, canStart, onPreview, onCommit, onRollback });
  callbacksRef.current = { levelCount, canStart, onPreview, onCommit, onRollback };

  const showPointerPreview = react.useCallback((input: HTMLInputElement, clientX: number): void => {
    const raw = rawFromPointer(input, clientX, callbacksRef.current.levelCount(), lastRawRef.current);
    lastRawRef.current = raw;
    callbacksRef.current.onPreview(raw);
  }, []);

  const beginDragging = react.useCallback((input: HTMLInputElement, pointerId: number, clientX: number): void => {
    pointerActiveRef.current = true;
    activePointerIdRef.current = pointerId;
    draggingRef.current = true;
    setDragging(true);
    showPointerPreview(input, clientX);
    try {
      if (!input.hasPointerCapture(pointerId)) input.setPointerCapture(pointerId);
    } catch {
    }
  }, [showPointerPreview]);

  const moveDragging = react.useCallback((input: HTMLInputElement, pointerId: number, clientX: number): void => {
    if (!pointerActiveRef.current || activePointerIdRef.current !== pointerId) return;
    showPointerPreview(input, clientX);
  }, [showPointerPreview]);

  const stopDragging = react.useCallback((input: HTMLInputElement, pointerId?: number, clientX?: number): void => {
    if (!pointerActiveRef.current) return;
    if (pointerId !== void 0 && activePointerIdRef.current !== pointerId) return;
    const raw = clientX === void 0 ? lastRawRef.current : rawFromPointer(input, clientX, callbacksRef.current.levelCount(), lastRawRef.current);
    lastRawRef.current = raw;
    pointerActiveRef.current = false;
    activePointerIdRef.current = null;
    draggingRef.current = false;
    setDragging(false);
    if (pointerId !== void 0 && input.hasPointerCapture(pointerId)) {
      input.releasePointerCapture(pointerId);
    }
    callbacksRef.current.onCommit(raw);
  }, []);

  // 取消路径的公共清理：pointercancel 是终态事件（规范上不再有该指针的后续事件），
  // 但部分平台/浏览器在 cancel 后仍会补发 pointerup——不清干净会把「取消」误当成
  // 正常提交。此函数校验活动指针、清空全部拖动状态、回滚不提交，幂等（第二次调用
  // 因 activePointerIdRef 已清空而直接返回）。blur 兜底共用 stopDragging 的
  // pointerActiveRef 守卫，双触发路径不会产生重复 commit。
  const cancelDragging = (pointerId: number): void => {
    if (activePointerIdRef.current !== pointerId) return;
    pointerActiveRef.current = false;
    activePointerIdRef.current = null;
    draggingRef.current = false;
    setDragging(false);
    callbacksRef.current.onRollback();
  };

  // 全局兜底监听：拖动中指针移出输入条/菜单仍留在窗口内时，move/up 由 window 捕获。
  const globalMoveRef = react.useRef<(event: PointerEvent) => void>(() => {});
  const globalEndRef = react.useRef<(event: PointerEvent) => void>(() => {});
  const globalCancelRef = react.useRef<(event: PointerEvent) => void>(() => {});
  globalMoveRef.current = (event) => {
    const input = inputRef.current;
    if (input !== null) moveDragging(input, event.pointerId, event.clientX);
  };
  globalEndRef.current = (event) => {
    const input = inputRef.current;
    if (input !== null) stopDragging(input, event.pointerId, event.clientX);
  };
  globalCancelRef.current = (event: PointerEvent): void => cancelDragging(event.pointerId);
  react.useEffect(() => {
    const move = (event: PointerEvent) => globalMoveRef.current(event);
    const end = (event: PointerEvent) => globalEndRef.current(event);
    const cancel = (event: PointerEvent) => globalCancelRef.current(event);
    window.addEventListener("pointermove", move, true);
    window.addEventListener("pointerup", end, true);
    window.addEventListener("pointercancel", cancel, true);
    return () => {
      window.removeEventListener("pointermove", move, true);
      window.removeEventListener("pointerup", end, true);
      window.removeEventListener("pointercancel", cancel, true);
    };
  }, []);

  const handlers: EffortDragHandlers = {
    onPointerDown: (event: react.PointerEvent<HTMLInputElement>) => {
      // 忙态（模型切换/提交在途）不开新拖拽：目录 select 是
      // last-writer-wins，交错的 effort RPC 会打到旧模型上。
      if (!callbacksRef.current.canStart()) return;
      event.preventDefault();
      event.currentTarget.focus();
      beginDragging(event.currentTarget, event.pointerId, event.clientX);
    },
    onPointerMove: (event: react.PointerEvent<HTMLInputElement>) => moveDragging(event.currentTarget, event.pointerId, event.clientX),
    onPointerUp: (event: react.PointerEvent<HTMLInputElement>) => stopDragging(event.currentTarget, event.pointerId, event.clientX),
    onPointerCancel: (event: react.PointerEvent<HTMLInputElement>) => {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      cancelDragging(event.pointerId);
    },
    onBlur: () => {
      const input = inputRef.current;
      if (input !== null) stopDragging(input);
    },
  };

  return {
    dragging,
    draggingRef,
    handlers,
  };
}
