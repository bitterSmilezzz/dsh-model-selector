/**
 * ModelSelect: the enhanced composer model seat (`conversation.input.model`).
 *
 * A single-pane menu (simpler than the shipped two-level root menu): opening
 * the seat lands directly on the model list — search box + collapsible
 * provider groups — with the current model's effort slider pinned inline at
 * the bottom of the menu, so switching models and tuning reasoning effort
 * both happen in one surface without an intermediate page.
 *
 * Data and submission ride the SAME per-session directory the /model popup
 * shares (via `modelDirectories`), so a switch made here is what the popup
 * shows next and vice versa. Icons, Toast and the menu fit/dismiss hooks are
 * reused from @deepseek-ai/dsh-client-ui-primitives at runtime; colors
 * come from `--dsw-*` tokens in the injected stylesheet.
 */
import * as react from 'react'
import { zh as zhDict, en as enDict } from './locales.ts'
// Runtime reuse of the official primitives (already an external in
// tsdown.config.ts and a platform module in the web loader): Toast is the
// sanctioned surface for a rejected selection, and the two hooks fit/dismiss
// the open menu. The list itself stays hand-rolled — primitives' Menu renders
// every entry (footer included) as a <button role="menuitem">, which cannot
// host the effort range input or the search field.
import { Toast, IconWarningOutline16, IconChevronDownOutline14, IconCheckOutline14, IconCloseFill14, useAnchoredMaxHeight, useDismissOnOutsidePointer } from '@deepseek-ai/dsh-client-ui-primitives'

export { zhDict, enDict }
// Type-only: official model-selection directory types (the enhanced seat's
// data contract — same shared per-session directory the /model popup reads).
import type { ModelDirectoryState } from '@deepseek-ai/dsh-client-ui-model-selection/client'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import type { SnapshotStore } from '@deepseek-ai/dsh-client-store'
// Effort helpers live in effort.ts (pure, no JSX/DOM) so node --test can cover them.
import { dmsClampIndex, dmsEffortIndex, dmsEffectiveEffortIndex, dmsSliderLevels, maxEffortOf } from './effort.ts'
// Type-only: the model catalog carrier types (moved here in dsh alpha.2).
import type { ModelSelection, ModelProviderGroup } from '@deepseek-ai/dsh-api-session-controller/types'

/** Per-session model directory snapshot (official state shape). */
type DirectoryState = ModelDirectoryState
/** The enhanced seat's injected business face. */
/** 搜索索引条目：模型 + 其搜索 haystack + 选中载荷。 */
type ModelChoice = {
	group: ModelProviderGroup
	model: ModelProviderGroup["models"][number]
	haystack: string
	selection: ModelSelection
}

interface EffortSliderProps {
  state: DirectoryState
  select: (selection: ModelSelection) => Promise<boolean>
  t: TranslateNS<'modelSelector'>
}


// 图标直接用 primitives 的组件（此前本仓自带一份逐字节相同的 SVG 副本）；
// 图标组件只接受 size/className，aria-hidden 由调用处的包装元素承载。
const IconChevronDown = <IconChevronDownOutline14 />;
const IconCheck = <IconCheckOutline14 />;
const IconClear = <IconCloseFill14 />;
/**
* How long a successfully loaded directory snapshot is trusted before the
* menu re-fetches it over RPC. The snapshot lives in the per-session store,
* so reopening the menu within this window costs zero RPC and zero re-render.
*/
const DIRECTORY_STALE_MS = 3e4;
/** 搜索命中渲染上限：宽泛关键词（如单字母）命中数百条时避免 DOM 爆炸。 */
const MAX_VISIBLE_HITS = 100;
/** 菜单设计最大高度（px）；实际由 useAnchoredMaxHeight 按视口可用空间钳位。 */
const MENU_MAX_HEIGHT = 420;
/** 与视口边缘保留的距离；对齐 primitives 里未导出的 MARGIN。 */
const MENU_VIEWPORT_MARGIN = 12;
// ── 推理强度滑块（移植自 dsh-reasoning-effort：辐射特效 + 档位随模型自动适配）──
function dmsDrawRadiation(context: CanvasRenderingContext2D, width: number, height: number, time: number, state: { progress: number; dragging: boolean }): void {
  const origin = state.progress * width;
  const isDark = document.body.hasAttribute("data-ds-dark-theme");
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
export function EffortSlider({ state, select, t }: EffortSliderProps) {
	const levels = dmsSliderLevels(state);
	const [effort, setEffort] = react.useState("");
	const [preview, setPreview] = react.useState(0);
	const [committing, setCommitting] = react.useState(false);
	const [dragging, setDragging] = react.useState(false);
	const [localError, setLocalError] = react.useState<string | null>(null);
	const canvasRef = react.useRef<HTMLCanvasElement | null>(null);
	const inputRef = react.useRef(null);
	const committedRef = react.useRef("");
	const committingRef = react.useRef(false);
	const previewRef = react.useRef(0);
	const draggingRef = react.useRef(false);
	const pointerActiveRef = react.useRef(false);
	const activePointerIdRef = react.useRef<number | null>(null);
	const globalPointerMoveRef = react.useRef<((event: PointerEvent) => void) | null>(null);
	const globalPointerEndRef = react.useRef<((event: PointerEvent) => void) | null>(null);
	const globalPointerCancelRef = react.useRef<((event: PointerEvent) => void) | null>(null);
	const radiationRef = react.useRef<{ progress: number; dragging: boolean; target?: number }>({ progress: 0.5, dragging: false });
	const redrawRef = react.useRef<(() => void) | null>(null);
	const available = state.current !== null && levels.length >= 2;
	const busy = committing;
	const error = localError ?? state.error;
	react.useEffect(() => {
		if (!available || committingRef.current || draggingRef.current) return;
		const index = dmsEffectiveEffortIndex(levels, state);
		const next = levels[index]?.id ?? "";
		committedRef.current = next;
		previewRef.current = index;
		setEffort(next);
		setPreview(index);
		setLocalError(null);
	}, [available, levels.length, state.current?.provider, state.current?.model, state.current?.reasoningEffort]);
	react.useEffect(() => {
		previewRef.current = preview;
		radiationRef.current.target = levels.length >= 2 ? preview / (levels.length - 1) : 0.5;
		redrawRef.current?.();
	}, [preview, levels.length]);
	react.useEffect(() => {
		radiationRef.current.dragging = dragging;
		redrawRef.current?.();
	}, [dragging]);
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
				const k = r.dragging ? 0.55 : 0.12;
				r.progress += (r.target - r.progress) * k;
				if (Math.abs(r.target - r.progress) < 0.002) r.progress = r.target;
			}
			dmsDrawRadiation(context, width, height, phase, r);
			if (r.dragging) return false;
			return r.target !== void 0 && Math.abs(r.target - r.progress) > 0.002;
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
		resizeObserver.observe(canvas);
		themeObserver.observe(document.body, { attributes: true, attributeFilter: ["data-ds-dark-theme"] });
		document.addEventListener("visibilitychange", onVisibility);
		redrawRef.current = redraw;
		resize();
		draw();
		if (!reducedMotion.matches && !document.hidden) frame = window.requestAnimationFrame(loop);
		return () => {
			window.cancelAnimationFrame(frame);
			resizeObserver.disconnect();
			themeObserver.disconnect();
			document.removeEventListener("visibilitychange", onVisibility);
			redrawRef.current = null;
		};
	}, []);
	const rollback = react.useCallback(() => {
		const previous = committedRef.current;
		previewRef.current = Math.max(0, dmsEffortIndex(levels, previous));
		pointerActiveRef.current = false;
		activePointerIdRef.current = null;
		draggingRef.current = false;
		setEffort(previous);
		setPreview(Math.max(0, dmsEffortIndex(levels, previous)));
		setDragging(false);
	}, [levels]);
	const commit = react.useCallback(async (raw: number): Promise<void> => {
		if (committingRef.current) return;
		committingRef.current = true;
		const previous = committedRef.current;
		setDragging(false);
		setCommitting(true);
		setLocalError(null);
		const optimisticIndex = dmsClampIndex(raw, levels.length);
		const optimistic = levels[optimisticIndex]?.id;
		if (optimistic !== void 0) {
			previewRef.current = optimisticIndex;
			setPreview(optimisticIndex);
			setEffort(optimistic);
		}
		try {
			const current = state.current;
			if (current === null) throw new Error(t("empty.efforts"));
			const index = dmsClampIndex(raw, levels.length);
			const next = levels[index]?.id;
			if (next === void 0) throw new Error(t("empty.efforts"));
			// 落回已提交的同一档：不发多余 RPC，否则菜单会被 selecting 状态闪一次灰。
			if (next === committedRef.current) return;
			previewRef.current = index;
			setPreview(index);
			setEffort(next);
			const ok = await select({ provider: current.provider, model: current.model, reasoningEffort: next });
			if (!ok) throw new Error(t("effort.failed"));
			committedRef.current = next;
			previewRef.current = index;
			setEffort(next);
			setPreview(index);
		} catch (cause) {
			const restore = Math.max(0, dmsEffortIndex(levels, previous));
			committedRef.current = previous;
			previewRef.current = restore;
			setEffort(previous);
			setPreview(restore);
			setLocalError(cause instanceof Error ? cause.message : String(cause));
		} finally {
			committingRef.current = false;
			setCommitting(false);
		}
	}, [levels, select, state, t]);
	const rawFromPointer = (input: HTMLInputElement, clientX: number): number => {
		const bounds = input.getBoundingClientRect();
		if (bounds.width <= 0 || levels.length < 2) return previewRef.current;
		return Math.max(0, Math.min(levels.length - 1, (clientX - bounds.left) / bounds.width * (levels.length - 1)));
	};
	const showPointerPreview = (raw: number): void => {
		previewRef.current = raw;
		setPreview(raw);
		setEffort(levels[dmsClampIndex(raw, levels.length)]?.id ?? "");
	};
	const beginDragging = (input: HTMLInputElement, pointerId: number, clientX: number): void => {
		pointerActiveRef.current = true;
		activePointerIdRef.current = pointerId;
		draggingRef.current = true;
		setDragging(true);
		showPointerPreview(rawFromPointer(input, clientX));
		try {
			if (!input.hasPointerCapture(pointerId)) input.setPointerCapture(pointerId);
		} catch {
		}
	};
	const moveDragging = (input: HTMLInputElement, pointerId: number, clientX: number): void => {
		if (!pointerActiveRef.current || activePointerIdRef.current !== pointerId) return;
		showPointerPreview(rawFromPointer(input, clientX));
	};
	const stopDragging = (input: HTMLInputElement, pointerId?: number, clientX?: number): void => {
		if (!pointerActiveRef.current) return;
		if (pointerId !== void 0 && activePointerIdRef.current !== pointerId) return;
		const raw = clientX === void 0 ? previewRef.current : rawFromPointer(input, clientX);
		pointerActiveRef.current = false;
		activePointerIdRef.current = null;
		draggingRef.current = false;
		if (pointerId !== void 0 && input.hasPointerCapture(pointerId)) {
			input.releasePointerCapture(pointerId);
		}
		showPointerPreview(raw);
		void commit(raw);
	};
	globalPointerMoveRef.current = (event) => {
		const input = inputRef.current;
		if (input !== null) moveDragging(input, event.pointerId, event.clientX);
	};
	globalPointerEndRef.current = (event) => {
		const input = inputRef.current;
		if (input !== null) stopDragging(input, event.pointerId, event.clientX);
	};
	globalPointerCancelRef.current = (event: PointerEvent): void => {
		if (activePointerIdRef.current !== event.pointerId) return;
		rollback();
	};
	react.useEffect(() => {
		const move = (event: PointerEvent) => globalPointerMoveRef.current?.(event);
		const end = (event: PointerEvent) => globalPointerEndRef.current?.(event);
		const cancel = (event: PointerEvent) => globalPointerCancelRef.current?.(event);
		window.addEventListener("pointermove", move, true);
		window.addEventListener("pointerup", end, true);
		window.addEventListener("pointercancel", cancel, true);
		return () => {
			window.removeEventListener("pointermove", move, true);
			window.removeEventListener("pointerup", end, true);
			window.removeEventListener("pointercancel", cancel, true);
		};
	}, []);
	const onKeyDown = (event: react.KeyboardEvent<HTMLInputElement>): void => {
		const current = dmsClampIndex(Number(event.currentTarget.value), levels.length);
		let target;
		if (event.key === "ArrowLeft" || event.key === "ArrowDown" || event.key === "PageDown") {
			target = Math.max(0, current - 1);
		} else if (event.key === "ArrowRight" || event.key === "ArrowUp" || event.key === "PageUp") {
			target = Math.min(levels.length - 1, current + 1);
		} else if (event.key === "Home") {
			target = 0;
		} else if (event.key === "End") {
			target = levels.length - 1;
		}
		if (target === void 0) return;
		event.preventDefault();
		void commit(target);
	};
	if (!available) return null;
	const count = levels.length;
	const effortName = levels[dmsEffortIndex(levels, effort)]?.name ?? effort;
	const effortDesc = levels[dmsEffortIndex(levels, effort)]?.description;
	const progress = preview / (count - 1) * 100;
	const style = { "--dms-progress": `${progress}%` } as react.CSSProperties;
	return (
		<div
			className={`dms-effort${dragging ? " is-dragging" : ""}${busy ? " is-busy" : ""}${error === null ? "" : " is-error"}`}
		>
			<div
				className="dms-effort-slider"
				style={style}
			>
				<div className="dms-effort-track" aria-hidden="true" />
				<div className="dms-effort-fx" aria-hidden="true">
					<canvas ref={canvasRef} className="dms-effort-canvas" />
					<span className="dms-effort-flare" />
				</div>
				<input
					ref={inputRef}
					className="dms-effort-input"
					type="range"
					min="0"
					max={count - 1}
					step="0.01"
					value={preview}
					disabled={busy}
					aria-label={t("menu.effort")}
					aria-valuetext={effortName}
					onChange={(event: react.ChangeEvent<HTMLInputElement>) => {
						const raw = Number(event.currentTarget.value);
						showPointerPreview(raw);
					}}
					onPointerDown={(event: react.PointerEvent<HTMLInputElement>) => {
						event.preventDefault();
						event.currentTarget.focus();
						beginDragging(event.currentTarget, event.pointerId, event.clientX);
					}}
					onPointerMove={(event: react.PointerEvent<HTMLInputElement>) => moveDragging(event.currentTarget, event.pointerId, event.clientX)}
					onPointerUp={(event: react.PointerEvent<HTMLInputElement>) => stopDragging(event.currentTarget, event.pointerId, event.clientX)}
					onPointerCancel={(event: react.PointerEvent<HTMLInputElement>) => {
						if (event.currentTarget.hasPointerCapture(event.pointerId)) {
							event.currentTarget.releasePointerCapture(event.pointerId);
						}
						rollback();
					}}
					onBlur={(event: react.FocusEvent<HTMLInputElement>) => {
						stopDragging(event.currentTarget);
					}}
					onKeyDown={onKeyDown}
				/>
				<span className="dms-effort-knob" aria-hidden="true" />
			</div>
			<span className="dms-effort-value">{effortName}</span>
			{effortDesc === undefined ? null : <span className="dms-effort-desc">{effortDesc}</span>}
			{error === null ? null : <span className="dms-effort-sr" role="status">{error}</span>}
			{error === null ? null : <div className="dms-effort-error">{error}</div>}
		</div>
	);
}

interface ModelSelectProps {
  locked: boolean
  available: boolean
  directory: SnapshotStore<ModelDirectoryState>
  load: () => void
  select: (selection: ModelSelection) => Promise<boolean>
  t: TranslateNS<'modelSelector'>
}
export function ModelSelect({ locked, available, directory, load, select, t }: ModelSelectProps) {
	const state = react.useSyncExternalStore(directory.subscribe, directory.getSnapshot);
	const [open, setOpen] = react.useState(false);
	// 弹出方向自适应：菜单向上弹出（bottom 定位），但 trigger 距视口顶部
	// 空间不足时（新会话/页面中部）改为向下弹出，避免搜索框与选项溢出视口。
	const [menuAbove, setMenuAbove] = react.useState(true);
	const [query, setQuery] = react.useState("");
	const [collapsed, setCollapsed] = react.useState<Set<string>>(() => new Set());
	const [notice, setNotice] = react.useState<string | null>(null);
	// 菜单内 notice 会随 close() 一起清掉，失败原因必须落在菜单外的瞬时横幅上
	// （官方 seat 正是用 Toast 播报 select 拒绝）。seq 递增让同一段文案可重播。
	const [toast, setToast] = react.useState<{ seq: number; text: string; failed: boolean } | null>(null);
	const toastSeqRef = react.useRef(0);
	const showToast = (text: string, failed = true): void => {
		toastSeqRef.current += 1;
		setToast({ seq: toastSeqRef.current, text, failed });
	};
	const lastActionRef = react.useRef<"load" | "select">("load");
	const rootRef = react.useRef<HTMLDivElement | null>(null);
	const triggerRef = react.useRef<HTMLButtonElement | null>(null);
	const searchRef = react.useRef<HTMLInputElement | null>(null);
	const itemRefs = react.useRef<(HTMLButtonElement | null)[]>([]);
	const lastLoadRef = react.useRef(0);
	const lastGroupsKeyRef = react.useRef<readonly ModelProviderGroup[] | null>(null);
	const choicesCacheRef = react.useRef<ModelChoice[]>([]);
	const id = react.useId();
	// 模型目录稳定时，haystack 索引不随 select/状态抖动重建：仅在 groups 引用
	// 真正变化（新 load 结果）时重建 400+ 条搜索索引。
	{
		const groupsKey = state.groups;
		if (lastGroupsKeyRef.current !== groupsKey) {
			lastGroupsKeyRef.current = groupsKey;
			choicesCacheRef.current = groupsKey.flatMap((group) => group.models.map((model) => ({
				group,
				model,
				haystack: `${model.name}\n${model.description ?? ""}\n${group.name}\n${model.id}\n${group.id}`.toLowerCase(),
				selection: {
					provider: group.id,
					model: model.id,
					...model.reasoning?.defaultEffort === void 0 ? {} : { reasoningEffort: model.reasoning.defaultEffort }
				}
			})));
		}
	}
	const choices = choicesCacheRef.current;
	const currentChoice = choices[react.useMemo(() => state.current === null ? -1 : choices.findIndex((c) => c.selection.provider === state.current?.provider && c.selection.model === state.current.model), [choices, state.current])];
	const reasoning = currentChoice?.model.reasoning;
	const effectiveEffort = state.current?.reasoningEffort ?? reasoning?.defaultEffort;
	const effortLabel = reasoning === void 0 ? void 0 : effectiveEffort === void 0 ? t("effort.providerDefault") : reasoning.efforts.find((level) => level.id === effectiveEffort)?.name ?? effectiveEffort;
	const busy = state.status === "selecting";
	const normalized = query.trim().toLowerCase();
	const hits = react.useMemo(() => {
		if (normalized === "") return null;
		const found = [];
		for (const choice of choices) if (choice.haystack.includes(normalized)) found.push({
			group: choice.group,
			model: choice.model
		});
		return found;
	}, [choices, normalized]);
	const reload = () => {
		lastActionRef.current = "load";
		lastLoadRef.current = Date.now();
		load();
	};
	react.useEffect(() => {
		if (available) {
			// 目录新鲜度守卫：inject 重跑会重建 load 引用触发本 effect，30s 内已有
			// 有效目录时不重复全量 load（show() 打开路径已有同款守卫）。
			if (Date.now() - lastLoadRef.current < DIRECTORY_STALE_MS && state.status === "ready" && state.groups.length > 0) return;
			lastActionRef.current = "load";
			lastLoadRef.current = Date.now();
			load();
		}
	}, [available, load]);
	// 菜单高度按视口实测钳位（原先 CSS 写死 min(420px, 100vh - 96px)），
	// composer 变高/窗口变小时自动收，不再溢出。
	const menuRef = react.useRef<HTMLDivElement | null>(null);
	// Hook fits a bottom-anchored overlay only — the menu growing upward.
	const menuMaxHeight = useAnchoredMaxHeight(menuRef, MENU_MAX_HEIGHT, open);
	const [belowMaxHeight, setBelowMaxHeight] = react.useState(MENU_MAX_HEIGHT);
	useDismissOnOutsidePointer(rootRef, open, setOpen);
	react.useEffect(() => {
		if (!open) return;
		const measure = () => {
			const trigger = triggerRef.current;
			if (trigger === null) return;
			const rect = trigger.getBoundingClientRect();
			// 取上下两侧中空间更大的一侧：只有上方放不下时才向下弹。
			// 原先要求上方空出满高（MENU_MAX_HEIGHT + 20），窗口一矮就反而把面板
			// 挤到视口下沿外面。
			setMenuAbove(rect.top >= window.innerHeight - rect.bottom);
			// Downward the panel is top-anchored, so the hook's own fit would feed
			// back on itself; clamp against the space below the trigger instead.
			setBelowMaxHeight(Math.max(0, Math.min(MENU_MAX_HEIGHT, window.innerHeight - rect.bottom - MENU_VIEWPORT_MARGIN)));
		};
		measure();
		window.addEventListener("resize", measure);
		window.addEventListener("scroll", measure, true);
		return () => {
			window.removeEventListener("resize", measure);
			window.removeEventListener("scroll", measure, true);
		};
	}, [open]);
	const resetTransient = () => {
		setQuery("");
	};
	react.useEffect(() => {
		if (!open) return;
		searchRef.current?.focus();
	}, [open]);
	if (!available) return null;
	const show = () => {
		setOpen(true);
		if (state.status === "error" || state.groups.length === 0 || Date.now() - lastLoadRef.current > DIRECTORY_STALE_MS) reload();
	};
	const close = (restoreFocus = false) => {
		setOpen(false);
		setNotice(null);
		resetTransient();
		if (restoreFocus) queueMicrotask(() => {
			triggerRef.current?.focus();
		});
	};
	const moveFocus = (offset: number): void => {
		const items = itemRefs.current.filter((item) => item !== null);
		if (items.length === 0) return;
		const active = items.findIndex((item) => item === document.activeElement);
		items[((active < 0 ? offset > 0 ? -1 : 0 : active) + offset + items.length) % items.length]?.focus();
	};
	const onRootKeyDown = (event: react.KeyboardEvent<HTMLDivElement>): void => {
		if (event.key === "Escape" && open) {
			event.preventDefault();
			close(true);
			return;
		}
		if (!open) return;
		const target = event.target;
		const fromSearch = target instanceof HTMLInputElement && target === searchRef.current;
		if ((event.key === "ArrowDown" || event.key === "ArrowUp") && (!(target instanceof HTMLInputElement) || fromSearch)) {
			// 搜索框自动聚焦后箭头原本只在输入框内移光标（键盘导航死路）；现在
			// 搜索框内方向键也进入结果列表（effort 滑杆的 range input 不受影响）。
			event.preventDefault();
			moveFocus(event.key === "ArrowDown" ? 1 : -1);
			return;
		}
		if (event.key === "Enter" && !(target instanceof HTMLButtonElement)) {
			// 搜索框（或其他非按钮焦点）回车 = 选中第一个搜索命中；无查询/无命中不动作。
			if (hits !== null && hits.length > 0) {
				event.preventDefault();
				const first = hits[0]!;
				choose({ provider: first.group.id, model: first.model.id });
			}
		}
	};
	const onBlur = (event: react.FocusEvent<HTMLDivElement>): void => {
		if (busy) return;
		const related = event.relatedTarget;
		if (related instanceof Node) {
			if (rootRef.current?.contains(related)) return;
			close();
			return;
		}
		// relatedTarget 为 null（窗口失焦 alt-tab / 焦点落到不可聚焦区域）也收起菜单。
		close();
	};
	const choose = (selection: ModelSelection): void => {
		if (state.current?.provider === selection.provider && state.current.model === selection.model) {
			setNotice(t("notice.already"));
			return;
		}
		const target = choices.find((c) => c.selection.provider === selection.provider && c.selection.model === selection.model);
		const max = target?.model.reasoning === void 0 ? void 0 : maxEffortOf(target.model.reasoning);
		const effort = max === "off" ? void 0 : max;
		const full = {
			provider: selection.provider,
			model: selection.model,
			...effort === void 0 ? {} : { reasoningEffort: effort }
		};
		lastActionRef.current = "select";
		// 自动拉档只有「高于模型自己声明的默认档」时才算替用户做了决定，此时播报落点。
		const autoRaised = effort !== void 0 && effort !== target?.model.reasoning?.defaultEffort;
		const autoName = target?.model.reasoning?.efforts.find((level) => level.id === effort)?.name ?? effort ?? "";
		select(full).then((accepted) => {
			if (!accepted) {
				const message = directory.getSnapshot().error;
				showToast(message !== null ? t("error.action", { message }) : t("notice.selectFailed"));
				return;
			}
			if (rootRef.current !== null) close(true);
			if (autoRaised) showToast(t("toast.effortAuto", { effort: autoName }), false);
		});
	};
	const toggleCollapse = (groupId: string): void => {
		setCollapsed((prev) => {
			const next = new Set(prev);
			if (next.has(groupId)) next.delete(groupId);
			else next.add(groupId);
			return next;
		});
	};
	const modelLabel = currentChoice?.model.name ?? (state.status === "loading" && state.groups.length === 0 ? t("trigger.loading") : t("trigger.fallback"));
	const providerLabel = currentChoice?.group.name;
	const triggerLabel = effortLabel === void 0 ? modelLabel : `${modelLabel} · ${effortLabel}`;
	const triggerTitle = providerLabel === void 0 ? triggerLabel : `${providerLabel} · ${triggerLabel}`;
	const triggerAria = currentChoice === void 0 ? t("trigger.selectAria") : effortLabel === void 0 ? t("trigger.aria", { model: providerLabel === void 0 ? modelLabel : `${providerLabel} ${modelLabel}` }) : t("trigger.ariaEffort", {
		model: providerLabel === void 0 ? modelLabel : `${providerLabel} ${modelLabel}`,
		effort: effortLabel
	});
	itemRefs.current.length = 0;
	let itemIndex = 0;
	const itemRef = () => {
		const at = itemIndex++;
		return (node: HTMLButtonElement | null): void => {
			itemRefs.current[at] = node;
		};
	};
	const renderModelOption = (group: ModelProviderGroup, model: ModelProviderGroup['models'][number], showProvider: boolean) => {
		const selected = state.current?.provider === group.id && state.current.model === model.id;
		return (
			<button
				ref={itemRef()}
				type="button"
				role="menuitemradio"
				aria-checked={selected}
				className={`dms-model-option${selected ? " dms-model-optionSelected" : ""}`}
				title={model.name}
				disabled={busy}
				onClick={() => {
					choose({
						provider: group.id,
						model: model.id
					});
				}}
			>
				<span className="dms-model-option-copy">
					<span className="dms-nameRow">
						<span className="dms-model-option-name">{model.name}</span>
						{model.reasoning !== undefined && <span className="dms-badge" title={t("badge.reasoningHint")}>{t("badge.reasoning")}</span>}
					</span>
					{model.description !== undefined && <span className="dms-model-option-desc">{model.description}</span>}
					{showProvider && <span className="dms-model-option-provider">{group.name}</span>}
				</span>
				<span className="dms-model-check" aria-hidden="true">
					{selected ? IconCheck : null}
				</span>
			</button>
		);
	};
	const renderErrorStrip = () => {
		// Load failures only: a rejected select is announced by the Toast, which
		// also survives closing the menu (see choose()).
		if (state.error !== null && lastActionRef.current === "load") {
			return (
				<div className="dms-error">
					<span>{t("error.action", { message: state.error })}</span>
					<button type="button" className="dms-retry" onClick={reload}>{t("action.reload")}</button>
				</div>
			);
		}
		return null;
	};
	const renderFailures = (failures: DirectoryState['failures']) => failures.map((failure) => (
		<div key={failure.id} className="dms-warning">
			<span>{t("warning.groupLoad", { name: failure.name, message: failure.message })}</span>
			<button type="button" className="dms-retry" onClick={reload}>{t("action.reload")}</button>
		</div>
	));
	return (
		<div ref={rootRef} className="dms-root" onKeyDown={onRootKeyDown} onBlur={onBlur}>
			<button
				ref={triggerRef}
				type="button"
				className="dms-trigger"
				aria-label={triggerAria}
				aria-haspopup="true"
				aria-expanded={open}
				aria-controls={open ? `${id}-menu` : undefined}
				title={triggerTitle}
				disabled={locked}
				onClick={() => (open ? close() : show())}
			>
				<span className="dms-triggerLabel">{modelLabel}</span>
				{providerLabel !== undefined && <span className="dms-triggerProvider">{providerLabel}</span>}
				{effortLabel !== undefined && <span className="dms-triggerEffort">{effortLabel}</span>}
				<span className={`dms-chevron${open ? " dms-chevronOpen" : ""}`} aria-hidden="true">
					{IconChevronDown}
				</span>
			</button>
			{open ? (
				<div
					id={`${id}-menu`}
					ref={menuRef}
					style={{ maxHeight: menuAbove ? menuMaxHeight : belowMaxHeight }}
					className={'dms-menu dms-menuModel' + (menuAbove ? '' : ' dms-menuBelow')}
					aria-busy={state.status === 'loading' || busy}
				>
					{state.status === 'loading' && <div className="dms-status">{t('status.loading')}</div>}
					{renderErrorStrip()}
					{state.failures.length > 0 && <div className="dms-failures">{renderFailures(state.failures)}</div>}
					<div className="dms-search">
						<input
							ref={searchRef}
							type="text"
							className="dms-searchInput"
							value={query}
							placeholder={t('search.placeholder')}
							aria-label={t('search.placeholder')}
							onChange={(event: react.ChangeEvent<HTMLInputElement>) => {
								setNotice(null);
								setQuery(event.target.value);
							}}
						/>
						{query !== '' && (
							<button
								type="button"
								className="dms-searchClear"
								aria-label={t('search.clearAria')}
								onClick={() => {
									setNotice(null);
									setQuery('');
									searchRef.current?.focus();
								}}
							>
								<span aria-hidden="true" className="dms-icon-slot">{IconClear}</span>
							</button>
						)}
					</div>
					<div className="dms-groups" role="menu" aria-label={t("menu.aria")}>
						{hits !== null
							? hits.length === 0
								? <div className="dms-empty">{t('search.noMatch', { query: query.trim() })}</div>
								: <>
									{hits.slice(0, MAX_VISIBLE_HITS).map((hit) => renderModelOption(hit.group, hit.model, true))}
									{hits.length > MAX_VISIBLE_HITS && (
										<div className="dms-more">{t('search.more', { shown: String(MAX_VISIBLE_HITS), total: String(hits.length) })}</div>
									)}
								</>
							: state.groups.map((group) => {
								const headingId = `${id}-${group.id}`;
								const isCollapsed = collapsed.has(group.id);
								return (
									<section key={group.id} role="group" aria-labelledby={headingId} className="dms-group">
										<button
											type="button"
											role="menuitemcheckbox"
											className="dms-groupHeader"
											aria-expanded={!isCollapsed}
											aria-checked={!isCollapsed}
											aria-label={t('group.toggleAria', { name: group.name, count: String(group.models.length) })}
											onClick={() => toggleCollapse(group.id)}
										>
											<span className={`dms-groupChevron${isCollapsed ? ' dms-groupChevronClosed' : ''}`} aria-hidden="true">
												{IconChevronDown}
											</span>
											<span id={headingId} className="dms-groupName">{group.name}</span>
											<span className="dms-groupCount">{group.models.length}</span>
										</button>
										{!isCollapsed && group.models.map((model) => renderModelOption(group, model, false))}
									</section>
								);
							})}
						{hits === null && state.status === 'ready' && choices.length === 0 && (
							<div className="dms-empty">{t('empty.models')}</div>
						)}
					</div>
					{state.current !== null && dmsSliderLevels(state).length >= 2 && (
						<div className="dms-effortFooter">
							<span className="dms-effortFooterLabel">{t('menu.effort')}</span>
							<EffortSlider state={state} select={select} t={t} />
						</div>
					)}
					{notice !== null && <div className="dms-notice" role="status">{notice}</div>}
				</div>
			) : null}
			{toast !== null && (
				<Toast
					key={toast.seq}
					text={toast.text}
					icon={toast.failed ? <IconWarningOutline16 /> : undefined}
					anchor={rootRef.current?.closest<HTMLElement>("[data-composer-card]") ?? null}
					onDone={() => { setToast(null); }}
				/>
			)}
		</div>
	);
}