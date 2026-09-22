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
import type { ModelDirectoryState, ModelSelectInjected } from '@deepseek-ai/dsh-client-ui-model-selection/client'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import type { SnapshotStore } from '@deepseek-ai/dsh-client-store'
// Effort helpers live in effort.ts (pure, no JSX/DOM) so node --test can cover them.
import { dmsChoosePlan, dmsClampIndex, dmsEffortIndex, dmsEffectiveEffortIndex, dmsEffortBusy, dmsShouldAdoptLateSuccess, dmsSliderLevels } from './effort.ts'
// 辐射画布（绘制纯函数 + 动画循环 hook）与指针拖动状态机：从 EffortSlider
// 组件内拆分独立成模块，组件本体只保留档位/提交/渲染三件事。
import { useEffortCanvas } from './effortCanvas.ts'
import { useEffortDrag } from './effortDrag.ts'
// Menu direction/clamp helpers likewise (pure — the direction flip and the
// below-clamp are user-visible and were previously only browser-testable).
import { MENU_MAX_HEIGHT, MENU_VIEWPORT_MARGIN, dmsMenuAbove, dmsBelowMaxHeight, dmsMenuLeft } from './menuFit.ts'
// roving tabindex 的默认落点决策与行键构造（纯函数，node 可测——行键格式必须
// 与渲染出的 data-row-key 同源，否则默认落点静默失效）。
import { dmsDefaultRowKey, dmsHeaderKey, dmsRowKey } from './roving.ts'
// 搜索（归一化/命中窗口/高亮区间/空态）与键盘状态机：分支密集的用户可见逻辑，
// 全部抽成纯函数模块（node 可测），事件处理器只做 dispatch。
import { dmsHaystack, dmsMenuEmptyState, dmsNormalizeQuery, dmsSearchHits } from './search.ts'
import type { SearchChoice, SearchResult } from './search.ts'
import { dmsMenuKeyAction, dmsNextRowIndex } from './keys.ts'
import { dmsTriggerCopy } from './copy.ts'
// Type-only: the model catalog carrier types (moved here in dsh alpha.2).
import type { ModelSelection, ModelProviderGroup } from '@deepseek-ai/dsh-api-session-controller/types'

/** Per-session model directory snapshot (official state shape). */
type DirectoryState = ModelDirectoryState

/** 官方座位注入面的 select 结果（alpha.2 契约：RemoteResult，或 undefined = 该会话不可选）。 */
type SelectResult = Awaited<ReturnType<ModelSelectInjected['select']>>

interface EffortSliderProps {
  state: DirectoryState
  select: ModelSelectInjected['select']
  t: TranslateNS<'modelSelector'>
  /** 提交失败（超时/拒绝）时回调：让菜单把错误条归到「加载失败」之外（见 renderErrorStrip）。 */
  onSelectFailure: () => void
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
* 调法：调大 → 打开更省（RPC/重渲染都免），但目录侧改动要等窗口过期才可见；
* 调小 → 目录更新更实时。目录内容由官方 modelDirectories 推送，本值只影响
* 打开瞬间是否信任快照。
*/
const DIRECTORY_STALE_MS = 3e4;
/** 搜索命中渲染上限：宽泛关键词（如单字母）命中数百条时避免 DOM 爆炸。
 * 调法：调大 → 宽泛搜索看到更多命中（渲染与搜索成本线性上升）；调小 → 更省。 */
const MAX_VISIBLE_HITS = 100;
/** effort select RPC 的超时护栏：官方 select 无超时契约，RPC 永久挂起时
 * 必须释放滑杆的 committing 锁并回滚，否则滑杆被锁死到菜单关闭。
 * 调法：后端/网络慢时调大避免误回滚（滑杆锁死时间随之变长）；调小更早释放交互。 */
const EFFORT_COMMIT_TIMEOUT_MS = 12e3;
// ── 推理强度滑块（移植自 dsh-reasoning-effort：辐射特效 + 档位随模型自动适配）──
// 绘制与动画循环见 ./effortCanvas.ts（dmsDrawRadiation / useEffortCanvas），
// 指针拖动状态机见 ./effortDrag.ts（useEffortDrag）；本组件只做档位状态、
// 提交/回滚与渲染。
export const EffortSlider = react.memo(function EffortSlider({ state, select, t, onSelectFailure }: EffortSliderProps) {
	const levels = dmsSliderLevels(state);
	// 惰性初始化到当前生效档：useState("")/0 会让菜单打开的第一帧档位名为空、
	// 进度闪 0%，随后才被同步 effect 纠正（首帧即正确，无闪烁）。
	const [effort, setEffort] = react.useState(() => levels[dmsEffectiveEffortIndex(levels, state)]?.id ?? "");
	const [preview, setPreview] = react.useState(() => dmsEffectiveEffortIndex(levels, state));
	const [committing, setCommitting] = react.useState(false);
	const [localError, setLocalError] = react.useState<string | null>(null);
	// 最新 state 经 ref 读取：迟到 settle 的判定要看「此刻」的生效模型，而不是
	// 提交发起时闭包里捕获的那份（见 dmsShouldAdoptLateSuccess 的 sameModel）。
	const stateRef = react.useRef(state);
	stateRef.current = state;
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
		// levels 进依赖：同一模型、档位个数不变但档位 id 变了（适配器/目录刷新把
		// high 换成 xhigh）时也要重同步，否则读数落到原始 id、preview 与新档位错位。
	}, [available, levels, state.current?.provider, state.current?.model, state.current?.reasoningEffort]);
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
		if (next === void 0) return;
		// 落回已提交的同一档（拖动归位、键盘重复按当前档）：不发多余 RPC，也不闪
		// 本地 busy 灰——但必须把 preview 归一化回整档。raw 是未取整的分数（见
		// dmsPointerRaw），不归一化会让旋钮/进度条/画布停在两档之间，而同步 effect
		// 因依赖未变不会重跑纠正它（此前只有指针路径会留下这个残影）。
		if (next === committedRef.current) {
			previewRef.current = index;
			setPreview(index);
			setEffort(next);
			return;
		}
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
			// 提交时的模型身份：迟到采纳必须确认生效模型仍是这一个 —— next/index 是在
			// 这份档位表上算出来的，模型被外部改写后写回 UI 会显示一个后端并未生效的档位。
			const modelKeyAtCommit = dmsRowKey(current.provider, current.model);
			// 超时护栏：官方 select 无超时契约，把它包进带 12s 定时的 Promise——
			// 超时即视为失败（回滚 + 播报），并释放 committing 锁。select 迟到的
			// resolve 不直接丢弃：若它确认了新档位且自回滚以来没有新提交改写
			// committedRef（回滚态仍对应本次提交链），把 UI/committedRef 同步回
			// 实际已生效的档位；迟到的 reject 保持回滚态。timer 在 select 先完成
			// 时清除，不泄漏空转定时器。
			const result = await new Promise<SelectResult>((resolve, reject) => {
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
					(result) => {
						if (settled) {
							// 迟到成功且实际生效：committedRef 还是回滚前的 previous
							// 且提交纪元未推进（期间没有新的提交/拖动改写它），说明
							// 回滚态对应用户当前唯一意图链，后端已确认新档位——补一次
							// UI 同步，消除「UI 回滚、后端已改档」的错位；否则以新
							// 操作链为准不覆盖（新提交失败回滚后 committedRef 值与
							// 上一轮相同，纪元未推进才说明没有新提交）。
							// 判定收敛到 dmsShouldAdoptLateSuccess（effort.ts，node 可测）。
							const latest = stateRef.current.current;
							const sameModel = latest !== null && dmsRowKey(latest.provider, latest.model) === modelKeyAtCommit;
							if (result?.ok === true && mountedRef.current && dmsShouldAdoptLateSuccess(committedRef.current, previous, draggingRef.current, committingRef.current, commitEpochRef.current, epochAtCommit, sameModel)) {
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
						resolve(result);
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
			if (result === undefined || !result.ok) {
				if (result !== undefined) console.warn('[dsh-model-selector] effort select failed:', result.error);
				throw new Error(t("effort.failed"));
			}
			if (mountedRef.current) {
				committedRef.current = next;
				previewRef.current = index;
				setEffort(next);
				setPreview(index);
			}
		} catch (cause) {
			// 迟到超时/失败不得回滚新意图链：提交 B 快速成功后，提交 A 的 12s 定时器
			// 才到点 reject——此时 committedRef 已是 B 的结果，若按 A 的 previous
			// 回滚就会把用户已成功的 B 覆盖掉（dmsShouldAdoptLateSuccess 只保护
			// 「迟到成功」路径，回滚路径必须自己查纪元闸）。
			if (commitEpochRef.current === epochAtCommit) {
				// 通知菜单把错误归到「档位切换」而不是「目录加载」：否则 effort 提交失败
				// 会点亮加载错误条 + 无用的「重新加载」按钮（见 renderErrorStrip）。
				onSelectFailure();
				const restore = Math.max(0, dmsEffortIndex(levels, previous));
				committedRef.current = previous;
				previewRef.current = restore;
				if (mountedRef.current) {
					setEffort(previous);
					setPreview(restore);
					setLocalError(cause instanceof Error ? cause.message : String(cause));
				}
			}
		} finally {
			// 同上：迟到 settled 的 finally 不得释放新提交的 committing 锁（否则
			// 新提交仍在途，UI 已显示可操作，连点可发起第三条提交）。
			if (commitEpochRef.current === epochAtCommit) {
				committingRef.current = false;
				if (mountedRef.current) setCommitting(false);
			}
		}
	}, [levels, select, state, t, onSelectFailure]);
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
			{/* 错误：视觉隐藏的 role=status 供读屏播报，可见错误块同文案。两处容器都
			    常驻（空时 :empty 隐藏）—— 插入式 live region 的首次播报不可靠。 */}
			<span className="dms-sr" role="status">{error ?? ''}</span>
			<div className="dms-effort-error">{error ?? ''}</div>
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
	/** roving tabindex：true = 当前活动行（唯一可 Tab 到的模型行，其余 -1）。 */
	active: boolean
	/** 搜索态（结果列表是 listbox）：行用 option + aria-selected；分组态用 menuitemradio。 */
	searchMode: boolean
	/** 行聚焦回调（箭头导航/点击/程序化 focus 都经它同步活动行键）。 */
	onRowFocus: (key: string) => void
	/** 搜索命中且命中落在名称内时的片段区间（高亮）；undefined/null = 不标。 */
	nameHit?: { start: number; end: number } | null
	/** 搜索态的集合规模（总命中数）与该行 1-based 序号：截断到 MAX_VISIBLE_HITS
	 *  时 AT 需要知道「这是 N 条中的第几条」。分组态不传（menu 无 setsize 语义）。 */
	setsize?: number | undefined
	posinset?: number | undefined
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
const ModelOption = react.memo(function ModelOption({ group, model, showProvider, selected, busy, rowKey, active, searchMode, onRowFocus, nameHit, setsize, posinset, t, onChoose }: ModelOptionProps) {
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
			// 搜索态的结果容器是 listbox（搜索框是 combobox，见 .dms-searchInput），
			// 行必须用 option + aria-selected；分组态是 ARIA menu，行用 menuitemradio
			// + aria-checked。两套语义不能混用（menuitemradio 在 listbox 里无效）。
			role={searchMode ? "option" : "menuitemradio"}
			aria-checked={searchMode ? undefined : selected}
			aria-selected={searchMode ? selected : undefined}
			// 搜索态给行一个 id：combobox 的 aria-activedescendant 与「这是 N 条中的
			// 第几条」播报都要求 option 可被引用。rowKey 内含 '\u0000' 分隔符
			// （dmsRowKey），作 HTML id 合法但不可读，编码成可读形式。
			id={searchMode ? `dms-opt-${encodeURIComponent(rowKey)}` : undefined}
			// 结果被截断到 MAX_VISIBLE_HITS 时，AT 需要知道集合规模与本行位置，
			// 否则用户无法感知「只显示了前 100 条」。分组态是 ARIA menu，无 setsize 语义。
			aria-setsize={searchMode && setsize !== undefined && setsize > posinset! ? setsize : undefined}
			aria-posinset={searchMode && posinset !== undefined ? posinset : undefined}
			data-row-key={rowKey}
			tabIndex={active ? 0 : -1}
			className={`dms-model-option${selected ? " dms-model-optionSelected" : ""}`}
			title={model.description === undefined ? model.name : `${model.name} — ${model.description}`}
			aria-disabled={busy}
			onFocus={() => onRowFocus(rowKey)}
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
	if (prev.active !== next.active) return false;
	if (prev.searchMode !== next.searchMode) return false;
	if (prev.onRowFocus !== next.onRowFocus) return false;
	if (prev.t !== next.t) return false;
	if (prev.onChoose !== next.onChoose) return false;
	// 截断规模/序号：搜索词变化引起 total 或排序变化时必须重渲染。
	if (prev.setsize !== next.setsize) return false;
	if (prev.posinset !== next.posinset) return false;
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
  select: ModelSelectInjected['select']
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
	// roving tabindex 的活动行键：全列表只有这一行 tabindex=0（其余 -1，仅方向键
	// 可达），Tab 从搜索框进列表落在它上面。行焦点移动经 onRowFocus 更新；行集合
	// 变化（打开/搜索/折叠/选中迁移）时由下方 effect 重置到默认落点。
	const [activeRowKey, setActiveRowKey] = react.useState<string | null>(null);
	const onRowFocus = react.useCallback((key: string): void => {
		setActiveRowKey(key);
	}, []);
	// 菜单内 notice 会随 close() 一起清掉，失败原因必须落在菜单外的瞬时横幅上
	// （官方 seat 正是用 Toast 播报 select 拒绝）。seq 递增让同一段文案可重播。
	const [toast, setToast] = react.useState<{ seq: number; text: string; failed: boolean } | null>(null);
	const toastSeqRef = react.useRef(0);
	const showToast = react.useCallback((text: string, failed = true): void => {
		toastSeqRef.current += 1;
		setToast({ seq: toastSeqRef.current, text, failed });
	}, []);
	// 稳定引用：这两个回调作为 props 传给 EffortSlider / Toast。内联箭头会让
	// 子组件的 effect 依赖每次渲染都变（Toast 的卸载定时器被重启、滑杆 memo 失效）。
	// markSelectFailure 把错误来源标成「切换」：否则 effort 提交失败会点亮
	// 菜单里的「目录加载失败」条 + 无用的「重新加载」按钮（见 renderErrorStrip）。
	const markSelectFailure = react.useCallback((): void => {
		lastActionRef.current = "select";
	}, []);
	const dismissToast = react.useCallback((): void => {
		setToast(null);
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
	const choices = react.useMemo<readonly SearchChoice[]>(
		() => state.groups.flatMap((group) => group.models.map((model) => ({
			group,
			model,
			haystack: dmsHaystack(group, model),
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
	// choose 的最新输入面经 ref 读取：choose 因此不随 busy/current/choices/open 抖动
	// —— 它作为行 props 传进 ModelOption，引用一变数百行的自定义 memo 就全线失效。
	const chooseInputRef = react.useRef({ busy, current: state.current, choices, open });
	chooseInputRef.current = { busy, current: state.current, choices, open };
	const normalized = dmsNormalizeQuery(query);
	// 归一化可能改变码位长度（见 dmsFold），因此匹配与高亮全部走 search.ts 的
	// 纯函数：haystack 已折叠、高亮只在长度不变时给区间，不再用小写串下标切原串。
	const hits = react.useMemo<SearchResult | null>(
		() => dmsSearchHits(choices, normalized, MAX_VISIBLE_HITS),
		[choices, normalized],
	);
	// roving tabindex 的默认落点（Tab 从搜索框进列表的停靠行）：选中行优先、
	// 其次首个可见模型行、全折叠时回退首个组头。纯决策在 roving.ts（node 可测），
	// 行键构造同样来自那里 —— 渲染出的 data-row-key 与这里的键必须同源。
	const visibleModelKeys = react.useMemo(
		() => state.groups.flatMap((g) => (collapsed.has(g.id) ? [] : g.models.map((m) => dmsRowKey(g.id, m.id)))),
		[state.groups, collapsed],
	);
	const defaultRowKey = react.useMemo(() => dmsDefaultRowKey({
		hitKeys: hits === null ? null : hits.items.map((h) => dmsRowKey(h.group.id, h.model.id)),
		modelKeys: visibleModelKeys,
		headerKeys: state.groups.map((g) => dmsHeaderKey(g.id)),
		selectedKey: state.current === null ? null : dmsRowKey(state.current.provider, state.current.model),
	}), [hits, visibleModelKeys, state.groups, state.current]);
	// 行集合/选中变化时把 tabindex=0 的默认行同步到当前渲染集；菜单关闭清空。
	// 焦点已在行上（onRowFocus 改写过 activeRowKey）时，只要默认落点没变本
	// effect 不重跑，活动行保持用户最后聚焦的那行。
	react.useEffect(() => {
		if (!open) {
			setActiveRowKey(null);
			return;
		}
		setActiveRowKey(defaultRowKey);
	}, [open, defaultRowKey]);
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
	// useAnchoredMaxHeight 只适配「底边固定、向上生长」的底部锚定浮层：fit 读的是
	// 浮层自身底缘与视口顶缘的距离。向下弹（menuAbove=false）时面板改为顶边固定，
	// hook 度量的底缘是向下弹出后的位置，返回值在渲染处（maxHeight 三目）被忽略——
	// 继续挂监听只白付测量：每次 scroll/resize 都未节流 getBoundingClientRect +
	// setState 重渲染。向下弹期间把被测 ref 换成恒 null 的空 ref，hook 的 layout
	// effect 因 el === null 整体跳过（不注册监听、不测量）；方向翻回向上时 ref 换回
	// menuRef，effect 因 ref 身份变化重跑并立即 fit——翻向后的钳位是新鲜测量
	// （原实现 signal 不变不重跑，翻回时用的还是向下弹期间留下的旧值）。
	const inactiveMenuRef = react.useRef<HTMLDivElement | null>(null);
	const menuMaxHeight = useAnchoredMaxHeight(menuAbove ? menuRef : inactiveMenuRef, MENU_MAX_HEIGHT, open);
	const [belowMaxHeight, setBelowMaxHeight] = react.useState(MENU_MAX_HEIGHT);
	// 为何不采纳官方 useAnchoredPosition（与文件头「不用官方 Menu」并列的第二个不采纳决定）：
	// 该 hook 的水平起点固定是 anchor 左缘（left = rect.left，仅越界时钳进视口），没有
	// 「右缘对齐 anchor 右缘」这种模式；而本菜单默认就是右锚定（.dms-menu 的 right:0，与
	// seat 右缘对齐），只有右侧放不下时才钳到视口内改用 left。方向也不由 hook 决定：
	// side 是调用方写死的 'top' | 'bottom'，而这里要按 trigger 上下空间自动选边
	// （dmsMenuAbove）；且 hook 返回的是 fixed 定位坐标，本菜单是 .dms-root 内的
	// absolute + bottom/right 锚定，采纳它等于同时改默认对齐、方向策略与定位模型——
	// 属用户可见的运行时行为变更，故保留自研测量。
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
			// dmsMenuLeft 的入参/返回值都是**视口坐标**，而 .dms-menu 是 .dms-root
			// （position: relative）内的 absolute 元素 —— left 的参考系是 root 的
			// padding box。不减去 root 左缘的话，钳位一旦生效菜单整体右移
			// rootRect.left；横向溢出（rect.right > innerWidth）那一支更会把整幅
			// 菜单画到屏外，恰是这次钳位要避免的现象。
			const menuWidth = menuRef.current?.offsetWidth ?? 0;
			const left = dmsMenuLeft(rect.right, menuWidth, window.innerWidth, MENU_VIEWPORT_MARGIN);
			const rootLeft = rootRef.current?.getBoundingClientRect().left ?? 0;
			setMenuLeft(left === undefined ? undefined : left - rootLeft);
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
	// 还焦：优先 trigger；trigger 被 locked 禁用时 focus() 是空操作（焦点会掉回
	// body，下一次 Tab 从文档开头重来），退到 root 容器（tabIndex=-1）承接。
	const focusTrigger = (): void => {
		const trigger = triggerRef.current;
		if (trigger !== null && !trigger.disabled) {
			trigger.focus();
			return;
		}
		rootRef.current?.focus();
	};
	const close = react.useCallback((restoreFocus = false) => {
		setOpen(false);
		setNotice(null);
		setQuery("");
		if (restoreFocus) queueMicrotask(focusTrigger);
	}, []);
	// 外部 pointerdown 关闭与 Escape 一致走 close(true)：搜索框随菜单卸载后
	// 焦点落回 trigger（此前焦点直接掉 body）。hook 只以 false 调用 setter，
	// 忽略参数即可。
	const dismissOnOutsidePointer = react.useCallback(() => {
		close(true);
	}, [close]);
	useDismissOnOutsidePointer(rootRef, open, dismissOnOutsidePointer);
	// locked 翻转（会话移除/失活/页面 inert 等）时若菜单还开着直接关闭：
	// trigger 已禁用，挂着的菜单没有可交互入口；close(true) 顺带清掉搜索词与
	// notice，并把焦点从即将卸载的菜单里接出来（focusTrigger 因 trigger disabled
	// 落到 root 容器，不让焦点掉回 body）。
	react.useEffect(() => {
		if (locked && open) close(true);
	}, [locked, open, close]);
	const choose = react.useCallback((selection: ModelSelection): void => {
		const { busy: isBusy, current, choices: catalog } = chooseInputRef.current;
		if (isBusy) return;
		if (current?.provider === selection.provider && current.model === selection.model) {
			setNotice(t("notice.already"));
			return;
		}
		const target = catalog.find((c) => c.selection.provider === selection.provider && c.selection.model === selection.model);
		// 自动拉档决策收敛到 dmsChoosePlan（effort.ts，node 可测）：非规范档位 id
		// 不再被当成「最强档」提交（那会挑错档、甚至被宿主拒绝）。
		const plan = dmsChoosePlan(target?.model.reasoning);
		const full: ModelSelection = {
			provider: selection.provider,
			model: selection.model,
			...plan.effort === void 0 ? {} : { reasoningEffort: plan.effort }
		};
		lastActionRef.current = "select";
		const autoName = plan.effort === void 0
			? ""
			: target?.model.reasoning?.efforts.find((level) => level.id === plan.effort)?.name ?? plan.effort;
		// 超时护栏与 EffortSlider.commit() 同款：目录 select 无超时契约，RPC 永久
		// 挂起时若不加护栏，status='selecting' 由 store 持有、本插件无法复位，交互
		// 永久锁死。超时/拒绝都按切换失败播报 Toast（复用既有文案，不新增 key）；
		// 不强行复位 store——目录 settle 后状态自然回到 ready，与 effort commit 一致。
		// 迟到的 settle 一律忽略：成功与否都会经共享目录写回，UI 无需再动作。
		void (async () => {
			try {
				const result = await new Promise<SelectResult>((resolve, reject) => {
					let settled = false;
					const timer = window.setTimeout(() => {
						if (settled) return;
						settled = true;
						reject(new Error(t("notice.selectFailed")));
					}, EFFORT_COMMIT_TIMEOUT_MS);
					select(full).then(
						(settledResult) => {
							if (settled) return;
							settled = true;
							window.clearTimeout(timer);
							resolve(settledResult);
						},
						(cause: unknown) => {
							if (settled) return;
							settled = true;
							window.clearTimeout(timer);
							reject(cause);
						},
					);
				});
				if (result === undefined || !result.ok) {
					// alpha.2 契约：失败详情随 RemoteResult.error 回来；契约缺席
					// （undefined = 该会话不可选）时回退目录快照的错误（旧行为）。
					const message = result !== undefined
						? `${result.error.code}: ${result.error.message}`
						: directory.getSnapshot().error;
					showToast(message !== null ? t("error.action", { message }) : t("notice.selectFailed"));
					return;
				}
				// 只有菜单仍开着时才关（并清搜索词、还焦）：用户在 RPC 在途期间已经
				// 关掉菜单/移走焦点时，这里的 close(true) 会把焦点从用户当前所在
				// 控件抢回 trigger，还会清掉用户刚输入的搜索词。Toast 与 open 无关，
				// 照常播报。
				if (chooseInputRef.current.open) close(true);
				if (plan.autoRaised) showToast(t("toast.effortAuto", { effort: autoName }), false);
			} catch {
				// 超时 / select 拒绝：都按切换失败播报（防御性 catch 同时杜绝
				// unhandled rejection——未来注入面变更也不会让它漏出去）。
				showToast(t("notice.selectFailed"));
			}
		})();
		// 依赖只剩稳定引用（注入面的 select/t、目录 store、close/showToast 都是
		// useCallback([]) 或 props 缓存）：busy/current/choices/open 一律经
		// chooseInputRef 读最新值 —— 否则一次模型切换就让 choose 换引用，数百行的
		// ModelOption 自定义 memo 全线失效。
	}, [select, t, directory, close, showToast]);
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
	// 收集的 ref 数组（那既阻止行级 memo，又把副作用塞进 render）。环绕下标
	// 收敛到 dmsNextRowIndex（keys.ts，node 可测）。
	const moveFocus = (offset: number): void => {
		const menu = menuRef.current;
		if (menu === null) return;
		const items = [...menu.querySelectorAll<HTMLButtonElement>('[data-row-key]')];
		if (items.length === 0) return;
		const active = items.findIndex((item) => item === document.activeElement);
		items[dmsNextRowIndex(active, offset, items.length)]?.focus();
	};
	// Home/End 跳首/末行（WAI-ARIA menu 标准键；搜索框内不劫持——那是移光标键）。
	const focusEdge = (last: boolean): void => {
		const items = menuRef.current?.querySelectorAll<HTMLButtonElement>('[data-row-key]');
		if (items === undefined || items.length === 0) return;
		(last ? items[items.length - 1] : items[0])?.focus();
	};
	// 按键 → 动作的判定全部收敛在 dmsMenuKeyAction（keys.ts，node 可测）；
	// 这里只做 dispatch 与副作用（preventDefault 只在真的执行动作时才发，
	// 无行可去时不吞键）。
	const onRootKeyDown = (event: react.KeyboardEvent<HTMLDivElement>): void => {
		const target = event.target;
		const action = dmsMenuKeyAction({
			key: event.key,
			// IME 组合输入期间不劫持按键：Enter 是候选上屏确认、方向键在候选窗翻页、
			// Escape 是取消组合。除 isComposing 外还要认 keyCode 229 —— WebKit 在
			// compositionend 之后补发的那次 Enter 带 isComposing === false，不挡就会把
			// 「候选上屏」当成「选中首个命中」直接切模型。
			composing: event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229,
			open,
			fromSearch: target instanceof HTMLInputElement && target === searchRef.current,
			// 「菜单内」= 菜单容器（搜索框/行/滑杆）；trigger 不算 —— 焦点在 trigger 上
			// 按 Escape 应当直接关菜单，而不是被清词逻辑拽进搜索框。
			inMenu: menuRef.current?.contains(document.activeElement) === true,
			onNonInput: !(target instanceof HTMLInputElement),
			hasQuery: query !== "",
			rowCount: menuRef.current?.querySelectorAll('[data-row-key]').length ?? 0,
			hitCount: hits?.items.length ?? 0,
		});
		switch (action.type) {
			case 'none':
				return;
			case 'clearQuery':
				event.preventDefault();
				setNotice(null);
				setQuery("");
				if (action.focusSearch) searchRef.current?.focus();
				return;
			case 'close':
				event.preventDefault();
				close(true);
				return;
			case 'moveFocus':
				event.preventDefault();
				moveFocus(action.offset);
				return;
			case 'focusEdge':
				event.preventDefault();
				focusEdge(action.last);
				return;
			case 'chooseFirstHit': {
				const first = hits?.items[0];
				if (first === undefined) return;
				event.preventDefault();
				choose({ provider: first.group.id, model: first.model.id });
				return;
			}
		}
	};
	const onBlur = (event: react.FocusEvent<HTMLDivElement>): void => {
		const related = event.relatedTarget;
		// 焦点仍在 root 内（菜单、搜索框、滑杆、root 自身）：不关。
		if (related instanceof Node && rootRef.current?.contains(related) === true) return;
		// 焦点落到 root 外的可聚焦元素（Tab 出去）：关。不再豁免 busy —— 否则在途
		// 选择期间会留下「焦点已在菜单外、Escape 也关不掉」的悬挂菜单（keydown
		// 不再冒泡到 root），而菜单外的点击本就有 outside-pointer 路径兜底。
		if (related instanceof Node) {
			close();
			return;
		}
		// relatedTarget 为 null：只有窗口失焦（alt-tab / 切到别的应用）才关。点击菜单内的
		// 非可聚焦区域（内边距、标签、分组间隙）也会让浏览器把焦点收回 body，但那是菜单内
		// 操作，不该关菜单。
		// ⚠ 判据用 `visibilityState` 而不是 `document.hasFocus()`：后者在 iframe /
		// 多文档场景（桌面端 WebView 承载、或页面被嵌进别的文档）下，用户点击
		// iframe 外的区域时返回 false，会把「焦点只是被外层文档拿走」误判成窗口
		// 失焦 → 菜单静默关掉。`hidden` 只在文档真正不可见（切标签页 / 最小化 /
		// 锁屏）时为真，与「用户不在看这个页面」的语义一致。
		if (document.visibilityState === 'hidden') close();
	};
	// 标签兜底链收敛到 dmsTriggerCopy（copy.ts，node 可测）：目录成员资格只是
	// 参考（routable 契约），current 匹配不到 group 时显示 provider/model 原始
	// id，而不是「选择模型」。
	const trigger = dmsTriggerCopy({
		current: state.current,
		modelName: currentChoice?.model.name,
		providerName: currentChoice?.group.name,
		effortLabel,
		waiting: state.current === null && state.status === "loading",
	}, t);
	const renderErrorStrip = () => {
		// Load failures only: a rejected select is announced by the Toast, which
		// also survives closing the menu (see choose()). role=alert：菜单打开时
		// 焦点在搜索框，失败条插在它上方，读屏用户不浏览过去就不知道有失败。
		if (state.error !== null && lastActionRef.current === "load") {
			return (
				<div className="dms-error" role="alert">
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
	// 列表区的空态：判定收敛到 dmsMenuEmptyState（search.ts，node 可测）—— 无模型
	// 优先于无命中（目录为空时不该引导用户去改关键词）。空态播报节点必须放在
	// role=menu 容器外（menu 内容模型只允许菜单节点），视觉位置由 .dms-groupsFill
	// 的弹性占位补回，空态时列表容器本身不渲染。
	const emptyState = dmsMenuEmptyState({
		status: state.status,
		choiceCount: choices.length,
		searching: hits !== null,
		hitCount: hits?.total ?? 0,
	});
	return (
		// tabIndex=-1：root 只作为「焦点落点」承接（locked 关闭菜单时 trigger 已
		// 禁用，不能让焦点掉回 body；点击菜单内非可聚焦区域时浏览器把焦点交给它，
		// onBlur 便不会误判成「焦点离开菜单」）。不进 Tab 序。
		<div ref={rootRef} className="dms-root" tabIndex={-1} onKeyDown={onRootKeyDown} onBlur={onBlur}>
			<button
				ref={triggerRef}
				type="button"
				className="dms-trigger"
				aria-label={trigger.aria}
				aria-haspopup="menu"
				aria-expanded={open}
				aria-controls={open ? `${id}-menu` : undefined}
				title={trigger.title}
				disabled={locked}
				onClick={() => (open ? close() : show())}
			>
				<span className="dms-triggerLabel">{trigger.modelLabel}</span>
				{trigger.providerLabel !== undefined && <span className="dms-triggerProvider">{trigger.providerLabel}</span>}
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
				>
					{state.status === 'loading' && <div className="dms-status" role="status">{t('status.loading')}</div>}
					{renderErrorStrip()}
					{/* role=alert 挂容器：一次 load 可能多家供应商同时失败，逐条 alert
					    会连播数遍。 */}
					{state.failures.length > 0 && <div className="dms-failures" role="alert">{renderFailures(state.failures)}</div>}
					<div className="dms-search">
						<input
							ref={searchRef}
							type="text"
							className="dms-searchInput"
							value={query}
							placeholder={t('search.placeholder')}
							aria-label={t('search.placeholder')}
							// 输入即过滤一个结果列表 → combobox 语义（APG「Editable
							// Combobox With List Autocomplete」）。aria-expanded 只在搜索态
							// 为 true：那时结果容器才是 listbox；非搜索态的分组视图是 menu，
							// 不冒充「展开的建议列表」。
							// 0 命中时同步收起：listbox 容器不渲染（见下），声称「已展开」
							// 会让读尸用户听到一个指向空集的 combo（空态文案由 role=status
							// 那条 live region 承担播报，不依赖 expanded）。
							role="combobox"
							aria-expanded={hits !== null && hits.total > 0}
							aria-autocomplete="list"
							// 空态时结果容器不渲染，指向它就是悬空 IDREF（官方 trigger
							// 同款处理：关闭/不存在时省略 aria-controls）。
							aria-controls={emptyState === null ? `${id}-groups` : undefined}
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
					{/* 搜索结果播报：容器常驻（内容随状态更新）—— 插入式 live region 在各
					    AT 上行为不一致，可能整条漏播。0 命中时不播计数（空态文案已承担），
					    避免同帧两条 role=status 重复播报。 */}
					<span className="dms-sr" role="status">
						{hits !== null && hits.total > 0 ? t('search.status', { count: String(hits.total) }) : ''}
					</span>
					{/* 推理标记的说明：只挂在 title 上则键盘/读屏用户拿不到，这里补一条
					    视觉隐藏的静态说明（role=note，不冒充菜单项）。 */}
					<span className="dms-sr" role="note">{t('badge.reasoningHint')}</span>
					{/* 空态（无命中/无模型）与「仅显示前 N 条」note 全部在结果容器外：
					    menu/listbox 的直接内容模型只允许菜单/选项节点，live region 会被
					    菜单导航跳过、静态说明不该冒充选项。视觉位置由 .dms-groupsFill
					    （空态）与容器后的 .dms-more 保持。 */}
					{emptyState === 'noHits' && (
						<div className="dms-empty dms-groupsFill" role="status">{t('search.noMatch', { query: query.trim() })}</div>
					)}
					{emptyState === 'noModels' && (
						<div className="dms-empty dms-groupsFill" role="status">{t('empty.models')}</div>
					)}
					{emptyState === null && (
					<div
						className="dms-groups"
						id={`${id}-groups`}
						// 搜索态是 listbox（combobox 的弹层，行用 option）；分组态是 menu
						// （行用 menuitemradio）。aria-busy 从 .dms-menu 移到这里：它罩住
						// live region 会压制播报，而 menu 容器自身才是「内容仍在变」的子树。
						role={hits !== null ? 'listbox' : 'menu'}
						aria-busy={state.status === 'loading' || busy}
						aria-label={t("menu.aria")}
					>
						{hits !== null
							? hits.items.map((hit, index) => {
								const rowKey = dmsRowKey(hit.group.id, hit.model.id);
								return (
									<ModelOption
										key={rowKey}
										group={hit.group}
										model={hit.model}
										showProvider
										selected={state.current?.provider === hit.group.id && state.current.model === hit.model.id}
										busy={busy}
										rowKey={rowKey}
										active={rowKey === activeRowKey}
										searchMode
										onRowFocus={onRowFocus}
										nameHit={hit.nameHit}
										setsize={hits.total}
										posinset={index + 1}
										t={t}
										onChoose={choose}
									/>
								);
							})
							: state.groups.map((group) => {
								const headingId = `${id}-${group.id}`;
								const headerKey = dmsHeaderKey(group.id);
								const isCollapsed = collapsed.has(group.id);
								return (
									<section key={group.id} data-group-id={group.id} role="group" aria-labelledby={headingId} className="dms-group">
										{/* 组头参与 roving 导航（data-row-key + onFocus 同步活动行键）：
										    折叠/展开对键盘可达，且「全部折叠」时 dmsDefaultRowKey
										    回退到的正是组头 —— 它必须能承接 tabIndex=0，否则
										    Tab 会直接跳过整个列表（活动行键落空）。非活动组头
										    仍是 -1，数百行不会撑爆 Tab 停靠点。role=menuitem +
										    aria-expanded 是 ARIA menu 模式里「可展开菜单项」的语义。 */}
<button
											type="button"
											role="menuitem"
											data-row-key={headerKey}
											tabIndex={activeRowKey === headerKey ? 0 : -1}
											className="dms-groupHeader"
											aria-expanded={!isCollapsed}
											aria-label={t('group.toggleAria', { name: group.name, count: String(group.models.length) })}
											onFocus={() => onRowFocus(headerKey)}
											onClick={() => toggleCollapse(group.id)}
										>
											<span className={`dms-groupChevron${isCollapsed ? ' dms-groupChevronClosed' : ''}`} aria-hidden="true">
												{IconChevronDown}
											</span>
											<span id={headingId} className="dms-groupName">{group.name}</span>
											<span className="dms-groupCount">{group.models.length}</span>
										</button>
										{!isCollapsed && group.models.map((model) => {
											const rowKey = dmsRowKey(group.id, model.id);
											return (
												<ModelOption
													key={rowKey}
													group={group}
													model={model}
													showProvider={false}
													selected={state.current?.provider === group.id && state.current.model === model.id}
													busy={busy}
													rowKey={rowKey}
													active={rowKey === activeRowKey}
													searchMode={false}
													onRowFocus={onRowFocus}
													t={t}
													onChoose={choose}
												/>
											);
										})}
									</section>
								);
							})}
					</div>
					)}
					{hits !== null && hits.total > MAX_VISIBLE_HITS && (
						// role=note：静态辅助说明，从菜单项语义里退出来。
						<div className="dms-more" role="note">{t('search.more', { shown: String(MAX_VISIBLE_HITS), total: String(hits.total) })}</div>
					)}
					{state.current !== null && dmsSliderLevels(state).length >= 2 && (
						<div className="dms-effortFooter">
							<span className="dms-effortFooterLabel">{t('menu.effort')}</span>
							<EffortSlider state={state} select={select} t={t} onSelectFailure={markSelectFailure} />
						</div>
					)}
					{/* notice 容器常驻（空时 :empty 隐藏）：插入式 live region 的首次播报
					    在各 AT 上不可靠，「已是当前模型」这类反馈只有这一条通道。 */}
					<div className="dms-notice" role="status">{notice ?? ''}</div>
				</div>
			) : null}
			{toast !== null && (
				<Toast
					key={toast.seq}
					text={toast.text}
					icon={toast.failed ? <IconWarningOutline16 /> : undefined}
					anchor={rootRef.current?.closest<HTMLElement>("[data-composer-card]") ?? null}
					onDone={dismissToast}
				/>
			)}
		</div>
	);
}