/**
 * dsh-model-selector — EffortSlider 的 canvas 辐射特效模块。
 *
 * 从 ModelSelect.tsx 原样搬出（原 EffortSlider 组件内的 330 行状态机里，
 * 绘制与动画循环约占一半且与 React 状态解耦）：
 *  - dmsDrawRadiation：纯绘制函数，state（progress/dragging）与主题都由参数
 *    传入，不读组件闭包——同一帧可被 pointer 事件、rAF 循环、主题变化各路径复用。
 *  - useEffortCanvas：canvas 生命周期（尺寸/DPR、ResizeObserver、主题
 *    MutationObserver、visibilitychange、prefers-reduced-motion）与相位缓动
 *    动画循环。外部通过 radiationRef 更新 target/dragging 驱动重绘，hook
 *    返回的 redraw 注册到组件侧 ref（preview 变化时组件直接调它触发一帧）。
 */
import * as react from 'react';
/** 绘制状态的最小契约：进度（0..1）+ 是否拖拽（拖拽时加速/改粒子参数）。 */
export interface RadiationState {
    progress: number;
    dragging: boolean;
    /** 目标进度；undefined 表示尚未初始化（首帧同步起跳，不做缓动）。 */
    target?: number;
}
/**
 * 纯绘制：把滑块进度画成拖尾辐射（列能量 + 径向光晕 + 粒子流 + 热核光斑）。
 * 全部可变量（尺寸、相位、进度、拖拽态、深浅色）都来自参数——无模块级状态。
 */
export declare function dmsDrawRadiation(context: CanvasRenderingContext2D, width: number, height: number, time: number, state: RadiationState, isDark: boolean): void;
/**
 * 辐射画布生命周期 hook：尺寸/DPR 自适应、主题变化监听、动画循环与相位时钟。
 *
 * 外部契约：
 *  - radiationRef.current.target / .dragging 由组件在 preview/忙态变化时更新，
 *    hook 的动画循环按 target 做指数缓动（拖动中每帧逼近 target，回弹时渐近）；
 *  - 返回的 redraw 应注册到组件侧 ref，供事件驱动的重绘（拖动一帧、主题翻转）
 *    即时调用；挂载时画首帧并把 progress 直接对齐 target（打开菜单不闪中间态）。
 *
 * 动画成本：拖拽时只画事件驱动帧（pointer 移动触发的单帧），循环空闲时
 * 一帧即停——画布不常驻 rAF，CPU 占用只在缓动回弹窗口内存在。
 */
export declare function useEffortCanvas(canvasRef: react.RefObject<HTMLCanvasElement | null>, radiationRef: react.MutableRefObject<RadiationState>): () => void;
//# sourceMappingURL=effortCanvas.d.ts.map