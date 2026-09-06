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
import { dmsClampIndex, dmsEffortIndex, dmsEffectiveEffortIndex, dmsEffortBusy, dmsShouldAdoptLateSuccess, dmsSliderLevels, maxEffortOf } from './effort.ts'
// 辐射画布（绘制纯函数 + 动画循环 hook）与指针拖动状态机：从 EffortSlider
// 组件内拆分独立成模块，组件本体只保留档位/提交/渲染三件事。
import { useEffortCanvas } from './effortCanvas.ts'
import { useEffortDrag } from './effortDrag.ts'
// Menu direction/clamp helpers likewise (pure — the direction flip and the
// below-clamp are user-visible and were previously only browser-testable).
import { MENU_MAX_HEIGHT, MENU_VIEWPORT_MARGIN, dmsMenuAbove, dmsBelowMaxHeight, dmsMenuLeft } from './menuFit.ts'
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

/** 搜索命中的渲染条目：只装渲染窗口内的命中（窗口外只计数，见 hits memo）。 */
type SearchHit = {
	group: ModelProviderGroup
	model: ModelProviderGroup["models"][number]
	nameHit: { start: number; end: number } | null
}

/** 搜索命中结果：items 为窗口内条目（渲染用），total 为命中总数（播报/截断提示用）。 */
type SearchResult = { items: SearchHit[]; total: number }

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
/** effort select RPC 的超时护栏：官方 select 无超时契约，RPC 永久挂起时
 * 必须释放滑杆的 committing 锁并回滚，否则滑杆被锁死到菜单关闭。 */
const EFFORT_COMMIT_TIMEOUT_MS = 12e3;
// ── 推理强度滑块（移植自 dsh-reasoning-effort：辐射特效 + 档位随模型自动适配）──
// 绘制与动画循环见 ./effortCanvas.ts（dmsDrawRadiation / useEffortCanvas），
// 指针拖动状态机见 ./effortDrag.ts（useEffortDrag）；本组件只做档位状态、
// 提交/回滚与渲染。
export const EffortSlider = react.memo(function EffortSlider({ state, select, t }: EffortSliderProps) {
	const levels = dmsSliderLevels(state);
	// 惰性初始化到当前生效档：useState("")/0 会让菜单打开的第一帧档位名为空、
	// 进度闪 0%，随后才被同步 effect 纠正（首帧即正确，无闪烁）。
	const [effort, setEffort] = react.useState(() => levels[dmsEffectiveEffortIndex(levels, state)]?.id ?? "");
	const [preview, setPreview] = react.useState(() => dmsEffectiveEffortIndex(levels, state));
	const [committing, setCommitting] = react.useState(false);
	const [localError, setLocalError] = react.useState<string | null>(null);
	const canvasRef = react.useRef<HTMLCanvasElement | null>(null);
	const inputRef = react.useRef<HTMLInputElement | null>(null);
	const committedRef = react.useRef("");
	const committingRef = react.useRef(false);
	const previewRef = react.useRef(0);
	const draggingRef = react.useRef(false);
	// 提交超时定时器句柄 + 挂载标志：菜单关闭（EffortSlider 卸载）时由 cleanup
	// clearTimeout 并置 unmounted——迟到成功采纳/超时回滚的 setState 只在挂载期
	// 跑，卸载后不再触碰 React 状态，定时器也不必在卸载后继续空转。
	const commitTimerRef = react.useRef<number | null>(null);
	const mountedRef = react.useRef(false);
	// 提交纪元：单调递增，迟到采纳判据靠它区分「无新提交」与「新提交失败回滚」。
	const commitEpochRef = react.useRef(0);
	// 辐射状态由组件持有：preview 变化/拖动时更新 target/dragging 驱动重绘；
	// progress 惰性对齐当前档位（打开菜单首帧即正确，无中间态缓动）。useRef
	// 初始化表达式每次渲染都会求值但仅首帧生效，这里取首次渲染的档位作起点。
	const radiationRef = react.useRef<{ progress: number; dragging: boolean; target?: number }>({
		progress: levels.length >= 2 ? dmsEffectiveEffortIndex(levels, state) / (levels.length - 1) : 0.5,
		dragging: false,
	});
	const redrawRef = react.useRef<(() => void) | null>(null);
	const available = state.current !== null && levels.length >= 2;
	const busy = dmsEffortBusy(committing, state.status);
	const error = localError;
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
	const redraw = useEffortCanvas(canvasRef, radiationRef);
	react.useEffect(() => {
		redrawRef.current = redraw;
		return () => { redrawRef.current = null; };
	}, [redraw]);
	// 卸载清理：迟到的 select settle 不再 setState（迟到成功采纳/超时回滚的
	// setState 都经 mountedRef 守卫）；未决的超时定时器直接清除——组件已卸载，
	// 回滚/采纳都无人可见，定时器没有存在的意义。
	react.useEffect(() => {
		mountedRef.current = true;
		return () => {
			mountedRef.current = false;
			if (commitTimerRef.current !== null) {
				window.clearTimeout(commitTimerRef.current);
				commitTimerRef.current = null;
			}
		};
	}, []);
	const showPointerPreview = react.useCallback((raw: number): void => {
		previewRef.current = raw;
		setPreview(raw);
		setEffort(levels[dmsClampIndex(raw, levels.length)]?.id ?? "");
	}, [levels]);
	const rollback = react.useCallback(() => {
		const previous = committedRef.current;
		previewRef.current = Math.max(0, dmsEffortIndex(levels, previous));
		setEffort(previous);
		setPreview(Math.max(0, dmsEffortIndex(levels, previous)));
	}, [levels]);
	const commit = react.useCallback(async (raw: number): Promise<void> => {
		if (dmsEffortBusy(committingRef.current, state.status)) return;
		// 先按钳位后的档位判断是否无操作：落回已提交的同一档（含拖动归位、键盘
		// 重复按当前档）时，不发多余 RPC，也不闪本地 busy 灰——原实现把这次早退
		// 放在 setCommitting(true)/乐观 setState 之后，同一档提交仍会闪一次。
		// levels 非空时 clamp 保证 index ∈ [0, count-1]，next 不可能为 undefined。
		const index = dmsClampIndex(raw, levels.length);
		const next = levels[index]?.id;
		if (next === void 0 || next === committedRef.current) return;
		committingRef.current = true;
		const previous = committedRef.current;
		// 提交纪元：每次发起新提交单调递增。迟到采纳判据用它区分「无新提交」与
		// 「新提交失败回滚」——两者 committedRef 都会回到 previous，值比较无法
		// 区分，纪元未变才说明迟到结果仍属当前唯一意图链。
		commitEpochRef.current += 1;
		const epochAtCommit = commitEpochRef.current;
		// 注意：这里不重置 dragging——commit 的唯二入口是拖动结束（stopDragging
		// 已先 setDragging(false)）与键盘（本就非拖拽），无需防御性复位。
		setCommitting(true);
		setLocalError(null);
		previewRef.current = index;
		setPreview(index);
		setEffort(next);
		try {
			const current = state.current;
			if (current === null) throw new Error(t("empty.efforts"));
			// 超时护栏：官方 select 无超时契约，把它包进带 12s 定时的 Promise——
			// 超时即视为失败（回滚 + 播报），并释放 committing 锁。select 迟到的
			// resolve 不直接丢弃：若它确认了新档位且自回滚以来没有新提交改写
			// committedRef（回滚态仍对应本次提交链），把 UI/committedRef 同步回
			// 实际已生效的档位；迟到的 reject 保持回滚态。timer 在 select 先完成
			// 时清除，不泄漏空转定时器。
			const ok = await new Promise<boolean>((resolve, reject) => {
				let settled = false;
				const timer = window.setTimeout(() => {
					if (settled) return;
					settled = true;
					commitTimerRef.current = null;
					reject(new Error(t("effort.timeout")));
				}, EFFORT_COMMIT_TIMEOUT_MS);
				// 定时器句柄进 ref：菜单关闭（本组件卸载）时由 cleanup 直接
				// clearTimeout，不再依赖 Promise 闭包把定时器活到 select 迟到 settle。
				commitTimerRef.current = timer;
				select({ provider: current.provider, model: current.model, reasoningEffort: next }).then(
					(accepted) => {
						if (settled) {
							// 迟到成功且实际生效：committedRef 还是回滚前的 previous
							// 且提交纪元未推进（期间没有新的提交/拖动改写它），说明
							// 回滚态对应用户当前唯一意图链，后端已确认新档位——补一次
							// UI 同步，消除「UI 回滚、后端已改档」的错位；否则以新
							// 操作链为准不覆盖（新提交失败回滚后 committedRef 值与
							// 上一轮相同，纪元未推进才说明没有新提交）。
							// 判定收敛到 dmsShouldAdoptLateSuccess（effort.ts，node 可测）。
							if (accepted && mountedRef.current && dmsShouldAdoptLateSuccess(committedRef.current, previous, draggingRef.current, committingRef.current, commitEpochRef.current, epochAtCommit)) {
								committedRef.current = next;
								previewRef.current = index;
								setEffort(next);
								setPreview(index);
								setLocalError(null);
							}
							return;
						}
						settled = true;
						window.clearTimeout(timer);
						commitTimerRef.current = null;
						resolve(accepted);
					},
					(cause: unknown) => {
						if (settled) return;
						settled = true;
						window.clearTimeout(timer);
						commitTimerRef.current = null;
						reject(cause);
					},
				);
			});
			if (!ok) throw new Error(t("effort.failed"));
			if (mountedRef.current) {
				committedRef.current = next;
				previewRef.current = index;
				setEffort(next);
				setPreview(index);
			}
		} catch (cause) {
			const restore = Math.max(0, dmsEffortIndex(levels, previous));
			committedRef.current = previous;
			previewRef.current = restore;
			if (mountedRef.current) {
				setEffort(previous);
				setPreview(restore);
				setLocalError(cause instanceof Error ? cause.message : String(cause));
			}
		} finally {
			committingRef.current = false;
			if (mountedRef.current) setCommitting(false);
		}
	}, [levels, select, state, t]);
	// 指针拖动状态机（pointer 生命周期 + window 兜底监听）在 effortDrag.ts；
	// commit/rollback/showPointerPreview 作回调外接——hook 经 callbacksRef 持有
	// 最新闭包，事件触发时取到当前渲染的函数。
	const drag = useEffortDrag({
		levelCount: () => levels.length,
		canStart: () => !busy,
		onPreview: showPointerPreview,
		onCommit: (raw) => void commit(raw),
		onRollback: rollback,
		inputRef,
		draggingRef,
	});
	const { dragging } = drag;
	// 拖动态同步到辐射状态与画布（preview effect 已处理 target，这里只切 dragging 速度）。
	react.useEffect(() => {
		radiationRef.current.dragging = dragging;
		redrawRef.current?.();
	}, [dragging]);
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
		// 忙态（自身提交中/共享目录 select 在途）吞掉按键：必须先 preventDefault，
		// 否则 range input 的原生步进会改 DOM value，与受控值漂移。
		event.preventDefault();
		if (busy) return;
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
					aria-disabled={busy}
					aria-label={t("menu.effort")}
					aria-valuetext={effortName}
					onChange={(event: react.ChangeEvent<HTMLInputElement>) => {
						const raw = Number(event.currentTarget.value);
						showPointerPreview(raw);
					}}
					onPointerDown={drag.handlers.onPointerDown}
					onPointerMove={drag.handlers.onPointerMove}
					onPointerUp={drag.handlers.onPointerUp}
					onPointerCancel={drag.handlers.onPointerCancel}
					onBlur={drag.handlers.onBlur}
					onKeyDown={onKeyDown}
				/>
				<span className="dms-effort-knob" aria-hidden="true" />
			</div>
			<span className="dms-effort-value">{effortName}</span>
			{effortDesc === undefined ? null : <span className="dms-effort-desc">{effortDesc}</span>}
			{error === null ? null : <span className="dms-sr" role="status">{error}</span>}
			{error === null ? null : <div className="dms-effort-error">{error}</div>}
		</div>
	);
});

interface ModelOptionProps {
	group: ModelProviderGroup
	model: ModelProviderGroup['models'][number]
	showProvider: boolean
	selected: boolean
	busy: boolean
	/** 键盘导航用的稳定行标识：菜单内 `[data-row-key]` 查询即按 DOM 顺序聚焦。 */
	rowKey: string
	/** 搜索命中且命中落在名称内时的片段区间（高亮）；undefined/null = 不标。 */
	nameHit?: { start: number; end: number } | null
	t: TranslateNS<'modelSelector'>
	onChoose: (selection: ModelSelection) => void
}
/**
 * 菜单里的一行模型。独立成 memo 组件：目录可能数百行，搜索输入每击键都会
 * 重建菜单内容，行 props（group/model 引用、selected/busy/rowKey、稳定的
 * onChoose）稳定时 React 直接跳过 reconcile，只重渲染真正变化的那行。
 *
 * 自定义比较器（默认浅比较的补充）：nameHit 是每次击键新建的对象（引用必变），
 * 但 100 条命中里绝大多数命中区间不变——按值比较 start/end，值相同即跳过
 * 重渲染，搜索才不卡顿。
 */
const ModelOption = react.memo(function ModelOption({ group, model, showProvider, selected, busy, rowKey, nameHit, t, onChoose }: ModelOptionProps) {
	const hit = nameHit === undefined || nameHit === null || nameHit.start === nameHit.end
		? null
		: [
			model.name.slice(0, nameHit.start),
			model.name.slice(nameHit.start, nameHit.end),
			model.name.slice(nameHit.end),
		];
	return (
		<button
			type="button"
			role="menuitemradio"
			aria-checked={selected}
			data-row-key={rowKey}
			className={`dms-model-option${selected ? " dms-model-optionSelected" : ""}`}
			title={model.description === undefined ? model.name : `${model.name} — ${model.description}`}
			aria-disabled={busy}
			onClick={() => onChoose({ provider: group.id, model: model.id })}
		>
			<span className="dms-model-option-copy">
				<span className="dms-nameRow">
					<span className="dms-model-option-name">
						{hit === null ? model.name : <>
							{hit[0]}<span className="dms-hit">{hit[1]}</span>{hit[2]}
						</>}
					</span>
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
}, (prev, next) => {
	if (prev.group !== next.group) return false;
	if (prev.model !== next.model) return false;
	if (prev.showProvider !== next.showProvider) return false;
	if (prev.selected !== next.selected) return false;
	if (prev.busy !== next.busy) return false;
	if (prev.rowKey !== next.rowKey) return false;
	if (prev.t !== next.t) return false;
	if (prev.onChoose !== next.onChoose) return false;
	// 引用相同（含都是 null/undefined）即视为未变化；否则按值比较命中区间。
	if (prev.nameHit === next.nameHit) return true;
	if (prev.nameHit === null || prev.nameHit === void 0) return false;
	if (next.nameHit === null || next.nameHit === void 0) return false;
	return prev.nameHit.start === next.nameHit.start && prev.nameHit.end === next.nameHit.end;
});

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
	const showToast = react.useCallback((text: string, failed = true): void => {
		toastSeqRef.current += 1;
		setToast({ seq: toastSeqRef.current, text, failed });
	}, []);
	const lastActionRef = react.useRef<"load" | "select">("load");
	const rootRef = react.useRef<HTMLDivElement | null>(null);
	const triggerRef = react.useRef<HTMLButtonElement | null>(null);
	const searchRef = react.useRef<HTMLInputElement | null>(null);
	const lastLoadRef = react.useRef(0);
	const id = react.useId();
	// 模型目录稳定时，haystack 索引不随 select/状态抖动重建：仅在 groups 引用
	// 真正变化（新 load 结果）时重建 400+ 条搜索索引。useMemo 保证 group 引用
	// 未变时 choices 引用稳定，currentChoice/hits 的 useMemo 依赖它也不会抖动。
	const choices = react.useMemo<readonly ModelChoice[]>(
		() => state.groups.flatMap((group) => group.models.map((model) => ({
			group,
			model,
			haystack: `${model.name}\n${model.description ?? ""}\n${group.name}\n${model.id}\n${group.id}`.toLowerCase(),
			selection: {
				provider: group.id,
				model: model.id,
				...model.reasoning?.defaultEffort === void 0 ? {} : { reasoningEffort: model.reasoning.defaultEffort }
			}
		}))),
		[state.groups],
	);
	const currentChoice = react.useMemo(() => {
		const current = state.current;
		if (current === null) return void 0;
		return choices.find((c) => c.selection.provider === current.provider && c.selection.model === current.model);
	}, [choices, state.current]);
	const reasoning = currentChoice?.model.reasoning;
	const effectiveEffort = state.current?.reasoningEffort ?? reasoning?.defaultEffort;
	const effortLabel = reasoning === void 0 ? void 0 : effectiveEffort === void 0 ? t("effort.providerDefault") : reasoning.efforts.find((level) => level.id === effectiveEffort)?.name ?? effectiveEffort;
	const busy = state.status === "selecting";
	const normalized = query.trim().toLowerCase();
	const hits = react.useMemo<SearchResult | null>(() => {
		if (normalized === "") return null;
		const items: SearchHit[] = [];
		let total = 0;
		for (const choice of choices) {
			if (!choice.haystack.includes(normalized)) continue;
			total += 1;
			// 渲染窗口已满：只计数不构造对象——宽泛关键词（单字母）命中数百条时，
			// 每次击键省掉数百次 `{group, model, nameHit}` 分配；nameHit 的 indexOf
			// 也只在窗口内做（高亮只消费窗口内条目）。总数单独累计，播报与
			// 「仅显示前 N 条」提示仍然准确。
			if (items.length >= MAX_VISIBLE_HITS) continue;
			let nameHit: { start: number; end: number } | null = null;
			const at = choice.model.name.toLowerCase().indexOf(normalized);
			if (at >= 0) nameHit = { start: at, end: at + normalized.length };
			items.push({ group: choice.group, model: choice.model, nameHit });
		}
		return { items, total };
	}, [choices, normalized]);
	const reload = react.useCallback(() => {
		lastActionRef.current = "load";
		lastLoadRef.current = Date.now();
		load();
	}, [load]);
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
	// 水平钳位：seat 右缘放不下整幅菜单（窄窗口）时改为 left 锚定，undefined = 默认右锚定。
	const [menuLeft, setMenuLeft] = react.useState<number | undefined>(undefined);
	// 布局生效前测量（对齐 useAnchoredMaxHeight 的 useLayoutEffect 模式）：
	// 用 useEffect 会在首帧绘制后才翻转方向/水平锚定，向下弹或左夹取场景
	// 菜单先按默认（向上弹 + 右锚定）画一帧再跳位，肉眼可见闪错位。
	react.useLayoutEffect(() => {
		if (!open) return;
		const measure = () => {
			const trigger = triggerRef.current;
			if (trigger === null) return;
			const rect = trigger.getBoundingClientRect();
			// 取上下两侧中空间更大的一侧：只有上方放不下时才向下弹。
			// 原先要求上方空出满高（MENU_MAX_HEIGHT + 20），窗口一矮就反而把面板
			// 挤到视口下沿外面。
			setMenuAbove(dmsMenuAbove(rect.top, rect.bottom, window.innerHeight));
			// Downward the panel is top-anchored, so the hook's own fit would feed
			// back on itself; clamp against the space below the trigger instead.
			setBelowMaxHeight(dmsBelowMaxHeight(rect.bottom, window.innerHeight, MENU_MAX_HEIGHT));
			// 水平：菜单实际渲染宽度为准（offsetWidth），右锚定放不下时钳到视口内。
			const menuWidth = menuRef.current?.offsetWidth ?? 0;
			setMenuLeft(dmsMenuLeft(rect.right, menuWidth, window.innerWidth, MENU_VIEWPORT_MARGIN));
		};
		measure();
		let raf = 0;
		// scroll 捕获阶段每帧触发，resize 也高频；rAF 合并同帧多次触发，
		// passive 声明让浏览器不必等我们作 preventDefault。
		const onViewportChange = () => {
			if (raf !== 0) return;
			raf = requestAnimationFrame(() => {
				raf = 0;
				measure();
			});
		};
		window.addEventListener("resize", onViewportChange, { passive: true });
		window.addEventListener("scroll", onViewportChange, { capture: true, passive: true });
		return () => {
			if (raf !== 0) cancelAnimationFrame(raf);
			window.removeEventListener("resize", onViewportChange);
			window.removeEventListener("scroll", onViewportChange, { capture: true });
		};
	}, [open]);
	react.useEffect(() => {
		if (!open) return;
		searchRef.current?.focus();
	}, [open]);
	// 打开即把当前选中行滚进可视区：选中模型在长列表深处时不用手动翻找。
	// 手动改 scrollTop 而不用 scrollIntoView，避免连带滚动页面/其它祖先容器。
	// 吸顶分组头（sticky top:0）会盖住滚到容器顶缘的行：偏移量按所在组的
	// 头部实际高度让位，否则「滚到了」却看不见。
	// 依赖补全：目录异步加载完成（state.groups 引用变化）后重新定位——原实现
	// 只依赖 [open]，加载完成晚于开合的那次渲染时选中行永远不会滚进可视区。
	// useLayoutEffect（而非 queueMicrotask）：DOM 已在提交阶段就绪，同步滚动
	// 不产生首帧跳动；且此时行/头部尺寸可测。
	const scrollSelectedIntoView = (): void => {
		const list = menuRef.current?.querySelector(".dms-groups");
		if (list === null || list === void 0) return;
		// 折叠/展开/目录刷新改变内容高度后，scrollTop 可能超出新的可滚上限
		// （浏览器不自动钳回，滚动条下方露出空白），先钳回合法区间再定位。
		const maxScroll = list.scrollHeight - list.clientHeight;
		if (list.scrollTop > maxScroll) list.scrollTop = Math.max(0, maxScroll);
		// 选中行不在 DOM（选中组被折叠 / 搜索把选中模型滤掉）时，退而滚动到
		// 选中项所在分组（含折叠态，让用户看到「当前模型在那个组」）。
		const selected = state.current;
		const row = list.querySelector('[role="menuitemradio"][aria-checked="true"]');
		if (row === null) {
			if (selected === null) return;
			const section = list.querySelector<HTMLElement>(`section[data-group-id="${globalThis.CSS.escape(selected.provider)}"]`);
			if (section === null) return;
			const sectionRect = section.getBoundingClientRect();
			const listRect = list.getBoundingClientRect();
			if (sectionRect.top < listRect.top) list.scrollTop += sectionRect.top - listRect.top;
			else if (sectionRect.bottom > listRect.bottom) list.scrollTop += sectionRect.bottom - listRect.bottom;
			return;
		}
		const rowRect = row.getBoundingClientRect();
		const listRect = list.getBoundingClientRect();
		const header = row.closest("section")?.querySelector(".dms-groupHeader");
		const headerHeight = header === null || header === undefined ? 0 : header.getBoundingClientRect().height;
		if (rowRect.top < listRect.top + headerHeight) list.scrollTop += rowRect.top - (listRect.top + headerHeight);
		else if (rowRect.bottom > listRect.bottom) list.scrollTop += rowRect.bottom - listRect.bottom;
	};
	// 打开瞬间自动展开选中组（若被折叠）。用 ref 记录「本次打开周期已自动展开过
	// 哪个 provider」：layout effect 依赖含 collapsed，若不拦截，用户手动折叠
	// 选中组时 effect 会立刻把它重新展开——折叠功能对选中组形同失效。
	// 只在 provider 首次解析到（含异步 load 完成后）且处于折叠态时展开一次，
	// 之后同 provider 的手动折叠不再被抢。
	const expandedProviderRef = react.useRef<string | null>(null);
	react.useLayoutEffect(() => {
		if (!open) {
			expandedProviderRef.current = null;
			return;
		}
		// 搜索命中渲染期间不滚动/不自动展开：命中列表替换了分组 DOM，滚动测量
		// 没有意义；且每次击键 hits 引用都变化——提前返回避免每次击键重跑
		// querySelector×2 + getBoundingClientRect×3 的定位测量（当前模型命中时
		// 还会写 scrollTop）。查询清空（hits 回 null）后本 effect 因 deps 变化
		// 重跑，滚动/展开行为与首次打开、异步加载完成场景保持一致。
		if (hits !== null) return;
		const provider = state.current?.provider ?? null;
		if (provider !== null && provider !== expandedProviderRef.current && collapsed.has(provider)) {
			expandedProviderRef.current = provider;
			setCollapsed((prev) => {
				if (!prev.has(provider)) return prev;
				const next = new Set(prev);
				next.delete(provider);
				return next;
			});
		}
		scrollSelectedIntoView();
	}, [open, state.groups, state.current, collapsed, hits]);
	// show/close/choose/toggleCollapse 四个 useCallback 必须全部位于下方
	// `if (!available) return null` 早退之前：hooks 数量不得随渲染分支变化
	// （React 会直接抛 "Rendered more hooks than during the previous render"）。
	const show = react.useCallback(() => {
		setOpen(true);
		if (state.status === "error" || state.groups.length === 0 || Date.now() - lastLoadRef.current > DIRECTORY_STALE_MS) reload();
	}, [state.status, state.groups.length, reload]);
	const close = react.useCallback((restoreFocus = false) => {
		setOpen(false);
		setNotice(null);
		setQuery("");
		if (restoreFocus) queueMicrotask(() => {
			triggerRef.current?.focus();
		});
	}, []);
	// 外部 pointerdown 关闭走 close() 的清理语义（清搜索词 + notice），与
	// Escape/失焦/选中成功一致——直接 setOpen(false) 会留下次打开时的残留词与
	// 旧提示。hook 只以 false 调用 setter，忽略参数即可。
	const dismissOnOutsidePointer = react.useCallback(() => {
		close();
	}, [close]);
	useDismissOnOutsidePointer(rootRef, open, dismissOnOutsidePointer);
	const choose = react.useCallback((selection: ModelSelection): void => {
		if (busy) return;
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
		// 超时护栏与 EffortSlider.commit() 同款：目录 select 无超时契约，RPC 永久
		// 挂起时若不加护栏，status='selecting' 由 store 持有、本插件无法复位，交互
		// 永久锁死。超时/拒绝都按切换失败播报 Toast（复用既有文案，不新增 key）；
		// 不强行复位 store——目录 settle 后状态自然回到 ready，与 effort commit 一致。
		// 迟到的 settle 一律忽略：成功与否都会经共享目录写回，UI 无需再动作。
		void (async () => {
			try {
				const accepted = await new Promise<boolean>((resolve, reject) => {
					let settled = false;
					const timer = window.setTimeout(() => {
						if (settled) return;
						settled = true;
						reject(new Error(t("notice.selectFailed")));
					}, EFFORT_COMMIT_TIMEOUT_MS);
					select(full).then(
						(ok) => {
							if (settled) return;
							settled = true;
							window.clearTimeout(timer);
							resolve(ok);
						},
						(cause: unknown) => {
							if (settled) return;
							settled = true;
							window.clearTimeout(timer);
							reject(cause);
						},
					);
				});
				if (!accepted) {
					const message = directory.getSnapshot().error;
					showToast(message !== null ? t("error.action", { message }) : t("notice.selectFailed"));
					return;
				}
				if (rootRef.current !== null) {
					close(true);
					if (autoRaised) showToast(t("toast.effortAuto", { effort: autoName }), false);
				}
			} catch {
				// 超时 / select 拒绝：都按切换失败播报（防御性 catch 同时杜绝
				// unhandled rejection——未来注入面变更也不会让它漏出去）。
				showToast(t("notice.selectFailed"));
			}
		})();
	}, [busy, state.current, choices, select, t, directory, close, showToast]);
	const toggleCollapse = react.useCallback((groupId: string): void => {
		setCollapsed((prev) => {
			const next = new Set(prev);
			if (next.has(groupId)) next.delete(groupId);
			else next.add(groupId);
			return next;
		});
	}, []);
	if (!available) return null;
	// 键盘导航：按 DOM 顺序查询菜单内全部行（data-row-key），不再依赖渲染期
	// 收集的 ref 数组（那既阻止行级 memo，又把副作用塞进 render）。
	const moveFocus = (offset: number): void => {
		const menu = menuRef.current;
		if (menu === null) return;
		const items = [...menu.querySelectorAll<HTMLButtonElement>('[data-row-key]')];
		if (items.length === 0) return;
		const active = items.findIndex((item) => item === document.activeElement);
		// 焦点不在任何行上（在搜索框等菜单内控件）时：向下从首行进、向上从末行进（环绕）；
		// 已在某行上时按 offset 循环。
		const start = active < 0 ? (offset > 0 ? -1 : 0) : active;
		items[(start + offset + items.length) % items.length]?.focus();
	};
	// Home/End 跳首/末行（WAI-ARIA menu 标准键；搜索框内不劫持——那是移光标键）。
	const focusEdge = (last: boolean): void => {
		const items = menuRef.current?.querySelectorAll<HTMLButtonElement>('[data-row-key]');
		if (items === undefined || items.length === 0) return;
		(last ? items[items.length - 1] : items[0])?.focus();
	};
	const onRootKeyDown = (event: react.KeyboardEvent<HTMLDivElement>): void => {
		// IME 组合输入期间不劫持按键：Enter 是候选上屏确认、方向键在候选窗翻页、
		// Escape 是取消组合——此时关菜单/选首个命中/移焦点都是抢用户的输入。
		if (event.nativeEvent.isComposing) return;
		const target = event.target;
		if (event.key === "Escape" && open) {
			// 搜索框内有关键词时 Escape 先清词（输入白打太亏），再按一次才关菜单。
			if (target instanceof HTMLInputElement && target === searchRef.current && query !== "") {
				setNotice(null);
				setQuery("");
				return;
			}
			event.preventDefault();
			close(true);
			return;
		}
		if (!open) return;
		const fromSearch = target instanceof HTMLInputElement && target === searchRef.current;
		if ((event.key === "ArrowDown" || event.key === "ArrowUp") && (!(target instanceof HTMLInputElement) || fromSearch)) {
			// 搜索框自动聚焦后箭头原本只在输入框内移光标（键盘导航死路）；现在
			// 搜索框内方向键也进入结果列表（effort 滑杆的 range input 不受影响）。
			event.preventDefault();
			moveFocus(event.key === "ArrowDown" ? 1 : -1);
			return;
		}
		if ((event.key === "Home" || event.key === "End") && !(target instanceof HTMLInputElement)) {
			event.preventDefault();
			focusEdge(event.key === "End");
			return;
		}
		// 只有搜索框内的 Enter 才选中第一个命中：焦点落在 effort 滑杆（range
		// input）等其它控件时，Enter 不应把用户的选择抢走。
		if (event.key === "Enter" && fromSearch) {
			if (hits !== null && hits.items.length > 0) {
				event.preventDefault();
				const first = hits.items[0]!;
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
	// 标签兜底对齐官方：目录成员资格只是参考（routable 契约），current 匹配不到
	// group 不代表没有选择——此时显示 provider/model 原始 id，而不是「选择模型」。
	const waiting = state.current === null && state.status === "loading";
	const modelLabel = currentChoice?.model.name
		?? (waiting
			? t("trigger.loading")
			: state.current === null ? t("trigger.fallback") : `${state.current.provider}/${state.current.model}`);
	const providerLabel = currentChoice?.group.name;
	const triggerLabel = effortLabel === void 0 ? modelLabel : `${modelLabel} · ${effortLabel}`;
	const triggerTitle = providerLabel === void 0 ? triggerLabel : `${providerLabel} · ${triggerLabel}`;
	const triggerAria = waiting ? t("trigger.loading") : currentChoice === void 0 ? (state.current === null ? t("trigger.selectAria") : t("trigger.aria", { model: `${state.current.provider}/${state.current.model}` })) : effortLabel === void 0 ? t("trigger.aria", { model: providerLabel === void 0 ? modelLabel : `${providerLabel} ${modelLabel}` }) : t("trigger.ariaEffort", {
		model: providerLabel === void 0 ? modelLabel : `${providerLabel} ${modelLabel}`,
		effort: effortLabel
	});
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
				aria-haspopup="menu"
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
					style={{
						maxHeight: menuAbove ? menuMaxHeight : belowMaxHeight,
						...(menuLeft === undefined ? null : { left: menuLeft, right: "auto" }),
					}}
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
							aria-controls={`${id}-groups`}
							autoComplete="off"
							enterKeyHint="search"
							spellCheck={false}
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
					{/* 搜索结果的屏幕阅读器播报：命中总数变化时由 role=status 播报，
					    视觉隐藏（.dms-sr）；放在 role=menu 容器外，不污染菜单内容模型。 */}
					{hits !== null && (
						<span className="dms-sr" role="status">{t('search.status', { count: String(hits.total) })}</span>
					)}
					<div className="dms-groups" id={`${id}-groups`} role="menu" aria-label={t("menu.aria")}>
						{hits !== null
							? hits.items.length === 0
								// role=status：空结果即时播报；与 role=menu 的直接子节点
								// 内容模型（仅 menuitem/group）冲突最小——live region 会被
								// 菜单导航跳过，不作为可选行参与键盘焦点。
								? <div className="dms-empty" role="status">{t('search.noMatch', { query: query.trim() })}</div>
								: <>
										{/* items 已在 memo 内截断到 MAX_VISIBLE_HITS，map 直渲无需下标守卫 */}
										{hits.items.map((hit) => (
											<ModelOption
												key={`${hit.group.id}\u0000${hit.model.id}`}
												group={hit.group}
												model={hit.model}
												showProvider
												selected={state.current?.provider === hit.group.id && state.current.model === hit.model.id}
												busy={busy}
												rowKey={`${hit.group.id}\u0000${hit.model.id}`}
												nameHit={hit.nameHit}
												t={t}
												onChoose={choose}
											/>
										))}
									{hits.total > MAX_VISIBLE_HITS && (
										// role=note：静态辅助说明，从菜单项语义里退出来。
										<div className="dms-more" role="note">{t('search.more', { shown: String(MAX_VISIBLE_HITS), total: String(hits.total) })}</div>
									)}
								</>
							: state.groups.map((group) => {
								const headingId = `${id}-${group.id}`;
								const isCollapsed = collapsed.has(group.id);
								return (
									<section key={group.id} data-group-id={group.id} role="group" aria-labelledby={headingId} className="dms-group">
<button
												type="button"
												role="menuitem"
												className="dms-groupHeader"
												aria-expanded={!isCollapsed}
											aria-label={t('group.toggleAria', { name: group.name, count: String(group.models.length) })}
											onClick={() => toggleCollapse(group.id)}
										>
											<span className={`dms-groupChevron${isCollapsed ? ' dms-groupChevronClosed' : ''}`} aria-hidden="true">
												{IconChevronDown}
											</span>
											<span id={headingId} className="dms-groupName">{group.name}</span>
											<span className="dms-groupCount">{group.models.length}</span>
										</button>
										{!isCollapsed && group.models.map((model) => (
											<ModelOption
												key={`${group.id}\u0000${model.id}`}
												group={group}
												model={model}
												showProvider={false}
												selected={state.current?.provider === group.id && state.current.model === model.id}
												busy={busy}
												rowKey={`${group.id}\u0000${model.id}`}
												t={t}
												onChoose={choose}
											/>
										))}
									</section>
								);
							})}
						{hits === null && state.status === 'ready' && choices.length === 0 && (
							<div className="dms-empty" role="status">{t('empty.models')}</div>
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