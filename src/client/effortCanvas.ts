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
import * as react from 'react'

/** 绘制状态的最小契约：进度（0..1）+ 是否拖拽（拖拽时加速/改粒子参数）。 */
export interface RadiationState {
  progress: number
  dragging: boolean
  /** 目标进度；undefined 表示尚未初始化（首帧同步起跳，不做缓动）。 */
  target?: number
}

/** 拖动时辐射推挤的缓动系数（越小越跟手），非拖拽时回弹系数。 */
const DRAG_EASE = 0.55
const IDLE_EASE = 0.12
const SETTLE_EPSILON = 0.002

/**
 * 纯绘制：把滑块进度画成拖尾辐射（列能量 + 径向光晕 + 粒子流 + 热核光斑）。
 * 全部可变量（尺寸、相位、进度、拖拽态、深浅色）都来自参数——无模块级状态。
 */
export function dmsDrawRadiation(context: CanvasRenderingContext2D, width: number, height: number, time: number, state: RadiationState, isDark: boolean): void {
  const origin = state.progress * width;
  const cell = 4;
  const speed = state.dragging ? 2.8 : 1;
  context.clearRect(0, 0, width, height);
  if (origin <= 0) return;
  context.save();
  context.beginPath();
  context.rect(0, 0, origin, height);
  context.clip();
  for (let x = 0; x < origin; x += cell) {
    const delta = x + cell * 0.5 - origin;
    const distance = Math.abs(delta);
    const phaseA = distance / 10 - time * 74e-4 * speed;
    const phaseB = distance / 23 - time * 41e-4 * speed + 1.7;
    const phaseC = distance / 40 - time * 22e-4 * speed + 3.4;
    const sinA = Math.max(0, Math.sin(phaseA));
    const sinB = Math.max(0, Math.sin(phaseB));
    const sinC = Math.max(0, Math.sin(phaseC));
    const waveA = Math.pow(sinA, 2.6);
    const waveB = Math.pow(sinB, 3.2);
    const waveC = Math.pow(sinC, 4);
    const crest = Math.pow(sinA, 15) + Math.pow(sinB, 18) * 0.78;
    const wave = Math.min(1, waveA * 0.76 + waveB * 0.58 + waveC * 0.32);
    const trail = 0.38 + 0.62 * Math.exp(-distance / 90);
    const pillar = Math.pow(Math.max(0, Math.sin(x / 20 + time * 16e-4)), 3) * 0.27;
    const columnEnergy = trail * (wave * 1.04 + pillar + crest * 0.32);
    if (columnEnergy > 0.012) {
      const nearness = Math.max(0, 1 - distance / 140);
      const red = isDark ? Math.round(42 + 124 * nearness + 75 * wave) : Math.round(28 + 58 * nearness + 15 * wave);
      const green = isDark ? Math.round(56 + 58 * nearness + 44 * crest) : Math.round(88 + 72 * nearness + 30 * crest);
      const blue = isDark ? Math.round(175 + 72 * nearness + 8 * wave) : Math.round(182 + 62 * nearness);
      const alpha = isDark ? Math.min(0.88, columnEnergy * 0.72) : Math.min(0.62, columnEnergy * 0.54);
      context.fillStyle = `rgba(${red}, ${green}, ${blue}, ${alpha})`;
      context.fillRect(x, 0, cell - 1, height);
    }
    for (let y = 0; y < height; y += cell) {
      const deltaY = y + cell * 0.5 - height * 0.5;
      const radial = Math.hypot(delta / 38, deltaY / 11);
      const halo = Math.exp(-radial * 0.96) * 1.08;
      const verticalShape = 0.58 + 0.42 * Math.cos(deltaY / height * Math.PI);
      const grain = 0.72 + 0.28 * Math.sin(x * 0.73 + y * 1.31 + time * 6e-3);
      const alpha = Math.min(0.96, (columnEnergy * 0.88 + halo + crest * 0.19) * verticalShape * grain);
      if (alpha < 0.035) continue;
      const hot = Math.max(0, 1 - radial / 2.4);
      const red = isDark ? Math.round(54 + 148 * hot + 42 * wave + 35 * crest) : Math.round(25 + 72 * hot + 12 * wave);
      const green = isDark ? Math.round(68 + 78 * hot + 46 * crest) : Math.round(98 + 72 * hot + 24 * crest);
      const blue = isDark ? Math.round(186 + 64 * hot) : Math.round(194 + 56 * hot);
      context.fillStyle = `rgba(${red}, ${green}, ${blue}, ${isDark ? alpha : alpha * 0.72})`;
      context.fillRect(x, y, cell - 1, cell - 1);
    }
  }
  for (let i = 0; i < 14; i += 1) {
    const travel = (time * (state.dragging ? 0.16 : 0.065) * (0.78 + i % 5 * 0.09) + i * 23) % Math.max(30, origin + 64);
    const particleX = origin - travel;
    if (particleX < -24 || particleX > width + 16) continue;
    const particleY = 3 + (i * 13 + Math.sin(time * 3e-3 + i) * 5) % Math.max(7, height - 6);
    const length = 4 + i % 4 * 4 + (state.dragging ? 6 : 0);
    const alpha = 0.28 + i % 5 * 0.1;
    const streak = context.createLinearGradient(particleX, 0, particleX + length, 0);
    streak.addColorStop(0, isDark ? "rgba(72,118,255,0)" : "rgba(24,94,184,0)");
    streak.addColorStop(0.68, isDark ? `rgba(112,135,255,${alpha})` : `rgba(36,108,202,${alpha * 0.72})`);
    streak.addColorStop(1, isDark ? `rgba(236,222,255,${Math.min(1, alpha + 0.26)})` : `rgba(103,175,248,${Math.min(0.82, alpha + 0.18)})`);
    context.fillStyle = streak;
    context.fillRect(particleX, particleY, length, i % 3 === 0 ? 2 : 1);
  }
  const glow = context.createRadialGradient(origin, height / 2, 0, origin, height / 2, 24);
  glow.addColorStop(0, isDark ? "rgba(255,255,255,.82)" : "rgba(255,255,255,.86)");
  glow.addColorStop(0.14, isDark ? "rgba(183,190,255,.54)" : "rgba(162,210,255,.48)");
  glow.addColorStop(0.44, isDark ? "rgba(103,74,255,.28)" : "rgba(37,112,207,.22)");
  glow.addColorStop(1, isDark ? "rgba(86,31,210,0)" : "rgba(25,91,181,0)");
  context.fillStyle = glow;
  context.fillRect(origin - 26, 0, 52, height);
  context.restore();
}

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
export function useEffortCanvas(canvasRef: react.RefObject<HTMLCanvasElement | null>, radiationRef: react.MutableRefObject<RadiationState>): () => void {
  const redrawRef = react.useRef<(() => void) | null>(null);
  react.useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) return;
    const context = canvas.getContext("2d");
    if (context === null) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let width = 1;
    let height = 1;
    let frame = 0;
    // Phase clock advances only while the loop runs, so a frozen (idle)
    // effect resumes at the exact wave phase it paused at — no jump.
    let phase = 0;
    let lastFrameAt = 0;
    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(1, bounds.width);
      height = Math.max(1, bounds.height);
      canvas.width = Math.max(1, Math.round(width * ratio));
      canvas.height = Math.max(1, Math.round(height * ratio));
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    // Draw one frame at the current phase; returns true while the effect
    // should keep animating (still easing toward its target).
    // Idle = one static frame, zero further CPU — the loop only runs while
    // the glow is settling, instead of forever.
    // While dragging, stop after a single frame: every pointer move bumps
    // `preview` and redraw() draws one event-driven frame, so the glow
    // follows the knob without a back-to-back repaint stream. Continuously
    // repainting this mix-blend canvas is what flickered the whole menu.
    const draw = (): boolean => {
      const r = radiationRef.current;
      if (r.target !== void 0) {
        const k = r.dragging ? DRAG_EASE : IDLE_EASE;
        r.progress += (r.target - r.progress) * k;
        if (Math.abs(r.target - r.progress) < SETTLE_EPSILON) r.progress = r.target;
      }
      // 主题在这里（每次 draw 时）读取一次：dmsDrawRadiation 保持参数输入、
      // 无 DOM 依赖可测；主题翻转由 themeObserver → draw() 即时取到新值。
      const isDark = document.body.hasAttribute("data-ds-dark-theme");
      dmsDrawRadiation(context, width, height, phase, r, isDark);
      if (r.dragging) return false;
      return r.target !== void 0 && Math.abs(r.target - r.progress) > SETTLE_EPSILON;
    };
    const loop = (time: number): void => {
      if (lastFrameAt !== 0) phase += time - lastFrameAt;
      lastFrameAt = time;
      if (draw() && !document.hidden) {
        frame = window.requestAnimationFrame(loop);
      } else {
        frame = 0;
        lastFrameAt = 0;
      }
    };
    const redraw = () => {
      if (reducedMotion.matches) {
        draw();
        return;
      }
      // Restart the loop on demand (pointer/theme/preview changes);
      // a running loop already draws every frame, so no extra draw here.
      if (frame === 0 && !document.hidden) {
        lastFrameAt = 0;
        frame = window.requestAnimationFrame(loop);
      }
    };
    const resizeObserver = new ResizeObserver(() => {
      resize();
      draw();
    });
    const themeObserver = new MutationObserver(() => draw());
    const onVisibility = () => {
      if (!document.hidden) redraw();
    };
    // 跨屏（窗口拖到另一台显示器）时 devicePixelRatio 变化：canvas 的 CSS
    // 尺寸不变，ResizeObserver 不会触发，位图分辨率停留在旧 DPR → 模糊。
    // 按当前 DPR 构造 resolution 媒体查询，DPR 一变旧查询即失配 → change。
    const resolutionQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
    const onResolutionChange = () => {
      resize();
      draw();
    };
    if (resolutionQuery.addEventListener !== void 0) {
      resolutionQuery.addEventListener("change", onResolutionChange);
    } else {
      resolutionQuery.addListener(onResolutionChange); // 旧版 WebKit
    }
    resizeObserver.observe(canvas);
    themeObserver.observe(document.body, { attributes: true, attributeFilter: ["data-ds-dark-theme"] });
    document.addEventListener("visibilitychange", onVisibility);
    redrawRef.current = redraw;
    resize();
    // 首帧直接把进度对齐 target（若已初始化）：菜单打开瞬间不展示中间进度。
    const r = radiationRef.current;
    if (r.target !== void 0) r.progress = r.target;
    draw();
    if (!reducedMotion.matches && !document.hidden) frame = window.requestAnimationFrame(loop);
    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      themeObserver.disconnect();
      if (resolutionQuery.removeEventListener !== void 0) {
        resolutionQuery.removeEventListener("change", onResolutionChange);
      } else {
        resolutionQuery.removeListener(onResolutionChange);
      }
      document.removeEventListener("visibilitychange", onVisibility);
      redrawRef.current = null;
    };
  }, [canvasRef, radiationRef]);
  return react.useCallback(() => redrawRef.current?.(), []);
}
