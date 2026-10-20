window.__ModuleLoader__.load({
	id: "@bittersmilezzz/dsh-model-selector",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		//#region \0rolldown/runtime.js
		var __create = Object.create;
		var __defProp = Object.defineProperty;
		var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
		var __getOwnPropNames = Object.getOwnPropertyNames;
		var __getProtoOf = Object.getPrototypeOf;
		var __hasOwnProp = Object.prototype.hasOwnProperty;
		var __copyProps = (to, from, except, desc) => {
			if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
				key = keys[i];
				if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
					get: ((k) => from[k]).bind(null, key),
					enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
				});
			}
			return to;
		};
		var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", {
			value: mod,
			enumerable: true
		}) : target, mod));
		//#endregion
		let react = require("react");
		react = __toESM(react, 1);
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react_dom = require("react-dom");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/locales.ts
		/**
		* `modelSelector` namespace dictionaries for the enhanced model seat.
		*
		* Simplified Chinese is the key-set source of truth; the English dictionary is
		* checked complete against it. Product copy is Chinese-first per repo style.
		*/
		const zh = {
			"trigger.fallback": "选择模型",
			"trigger.loading": "正在加载模型…",
			"trigger.selectAria": "选择模型",
			"trigger.aria": "选择模型，当前 {model}",
			"trigger.ariaEffort": "选择模型，当前 {model}，推理等级 {effort}",
			"menu.aria": "模型列表",
			"menu.effort": "推理等级",
			"search.placeholder": "搜索模型",
			"search.clearAria": "清除搜索",
			"search.noMatch": "没有匹配“{query}”的模型。",
			"search.status": "{count} 个结果",
			"search.more": "仅显示前 {shown} 条（共 {total} 条命中），请细化关键词。",
			"group.toggleAria": "{name}（{count} 个模型）",
			"effort.providerDefault": "Default",
			"status.loading": "正在刷新模型列表…",
			"error.action": "模型操作失败：{message}",
			"action.reload": "重新加载",
			"warning.groupLoad": "{name} 加载失败：{message}",
			"empty.models": "没有可用的模型。",
			"empty.efforts": "当前模型未提供推理等级。",
			"effort.failed": "档位切换未生效（后端未接受），已恢复原档位",
			"effort.timeout": "档位切换超时，已恢复原档位",
			"notice.already": "已是当前模型，无需切换",
			"notice.selectFailed": "切换失败，请重试",
			"toast.effortAuto": "已自动选到最强思考档：{effort}",
			"badge.reasoning": "推理",
			"badge.reasoningHint": "支持思考等级，切换后自动选到最大思考强度"
		};
		const en = {
			"trigger.fallback": "Select model",
			"trigger.loading": "Loading models…",
			"trigger.selectAria": "Select model",
			"trigger.aria": "Select model, current {model}",
			"trigger.ariaEffort": "Select model, current {model}, reasoning effort {effort}",
			"menu.aria": "Model list",
			"menu.effort": "Effort",
			"search.placeholder": "Search models",
			"search.clearAria": "Clear search",
			"search.noMatch": "No models match “{query}”.",
			"search.status": "{count} results",
			"search.more": "Showing first {shown} of {total} matches; refine your query.",
			"group.toggleAria": "{name} ({count} models)",
			"effort.providerDefault": "Default",
			"status.loading": "Refreshing model list…",
			"error.action": "Model operation failed: {message}",
			"action.reload": "Reload",
			"warning.groupLoad": "{name} failed to load: {message}",
			"empty.models": "No models available.",
			"empty.efforts": "This model provides no reasoning effort levels.",
			"effort.failed": "Failed to switch effort (backend rejected); restored",
			"effort.timeout": "Timed out switching effort; restored",
			"notice.already": "Already the current model",
			"notice.selectFailed": "Switch failed, please try again",
			"toast.effortAuto": "Auto-selected the strongest reasoning level: {effort}",
			"badge.reasoning": "Reasoning",
			"badge.reasoningHint": "Supports reasoning levels; switches land on the strongest"
		};
		//#endregion
		//#region src/client/effort.ts
		/** Canonical strength order of pi-ai thinking levels (strongest = highest). */
		const EFFORT_RANK = {
			off: 0,
			minimal: 1,
			low: 2,
			medium: 3,
			high: 4,
			xhigh: 5,
			max: 6
		};
		/** The strongest thinking level a model offers, or undefined for none. */
		function maxEffortOf(reasoning) {
			let best;
			for (const effort of reasoning.efforts) {
				const rank = EFFORT_RANK[effort.id] ?? 0;
				if (best === void 0 || rank > best.rank) best = {
					id: effort.id,
					rank
				};
			}
			return best?.id;
		}
		/**
		* 已知档位的秩；适配器自造的非规范 id（如 'turbo'）返回 undefined —— 与
		* 「已知但秩为 0」（off）区分开。maxEffortOf 对并列的未知档取首个，把它当
		* 「最强档」提交等于随机挑一个档、还可能被宿主拒，故调用方必须先过这一关。
		*/
		function dmsEffortRank(id) {
			return Object.prototype.hasOwnProperty.call(EFFORT_RANK, id) ? EFFORT_RANK[id] : void 0;
		}
		/**
		* 选择模型时自动落到最强档的决策（从 choose() 搬出并修正）：
		*  - 非推理模型 / 无档位 → 不提交 effort；
		*  - 最强档是 'off'（模型只提供 off）→ 不提交；
		*  - 最强档是**非规范 id**（rank 未知）→ 不提交：maxEffortOf 对并列未知档取
		*    首个，把它当「最强」提交会挑错档甚至被宿主拒（用户看到「切换失败」）；
		*  - 否则提交已知最强档；只有它不等于模型声明的默认档时才播报落点。
		*/
		function dmsChoosePlan(reasoning) {
			if (reasoning === void 0) return {
				effort: void 0,
				autoRaised: false
			};
			const best = maxEffortOf(reasoning);
			if (best === void 0 || best === "off" || dmsEffortRank(best) === void 0) return {
				effort: void 0,
				autoRaised: false
			};
			return {
				effort: best,
				autoRaised: best !== reasoning.defaultEffort
			};
		}
		function dmsEffortIndex(levels, id) {
			return levels.findIndex((level) => level.id === id);
		}
		/** 索引钳位：档位数为 0 时返回 0，四舍五入后落在 [0, count-1]。 */
		function dmsClampIndex(value, count) {
			if (count <= 0) return 0;
			return Math.max(0, Math.min(count - 1, Math.round(value)));
		}
		/**
		* 指针水平位置 → 档位原始值（未四舍五入，拖动中途可落在两档之间；落点由
		* 提交方 clamp）。输入条退化（宽度 ≤ 0 或档位数 < 2）时保持当前值不动。
		*/
		function dmsPointerRaw(clientX, left, width, levelCount, current) {
			if (width <= 0 || levelCount < 2) return current;
			return Math.max(0, Math.min(levelCount - 1, (clientX - left) / width * (levelCount - 1)));
		}
		function dmsCurrentModel(state) {
			if (state.current === null) return void 0;
			const current = state.current;
			return state.groups.find((g) => g.id === current.provider)?.models.find((m) => m.id === current.model) ?? void 0;
		}
		/**
		* trigger 的 effort 文案：已选模型在 catalog 中查不到时（rc.2 官方目录「保留态」：
		* current 仍留着，模型/提供商已离开目录）回落到目录的 `retainedEffort`。
		* 官方 ModelSelect 同规则——不回落会让 trigger 在模型离开目录后莫名丢掉档位名。
		* 老运行时（rc.1 及更早）无 retainedEffort 字段，回落值为 undefined，行为不变。
		*/
		function dmsRetainedEffortLabel(state) {
			return state.retainedEffort ?? void 0;
		}
		/** 当前生效档位：用户已选优先，其次模型默认，最后取中间档。 */
		function dmsEffectiveEffortIndex(levels, state) {
			const reasoning = dmsCurrentModel(state)?.reasoning;
			const current = dmsEffortIndex(levels, state.current?.reasoningEffort);
			if (current >= 0) return current;
			const fallback = dmsEffortIndex(levels, reasoning?.defaultEffort);
			if (fallback >= 0) return fallback;
			return Math.floor((levels.length - 1) / 2);
		}
		/** 滑块档位：少于两档（无法构成滑杆）时返回空数组。 */
		function dmsSliderLevels(state) {
			const efforts = dmsCurrentModel(state)?.reasoning?.efforts;
			return efforts !== void 0 && efforts.length >= 2 ? efforts : [];
		}
		/**
		* 滑杆是否处于忙态：自身提交中，或共享目录上有任一 select 在途
		* （目录 select 是 last-writer-wins，模型切换在途时再发 effort RPC 会与
		* 它交错——effort 打到旧模型上，与模型切换互相覆盖；choose() 按同一状态
		* 拒绝了模型点击，滑杆必须同规则拒绝交互）。
		*
		* 目录在途的判据是 `pending !== null`（DSH 0.1.7-rc.2 起官方目录语义）：
		* 它比 `status === 'selecting'` 早一步置位——`select()` 一被调用就记下
		* pending，RPC 未返回前 status 仍是 idle/ready。只按 status 判断存在一个
		* 窗口期：pending 已写入而 status 未翻，此时拖动会被接受并与在途的 select
		* 交错。旧运行时没有 pending 字段（rc.1 及更早），`pending` 为 undefined
		* 时退回 status 判据，保证向后兼容。
		*/
		function dmsEffortBusy(committing, status, pending) {
			return committing || (pending !== void 0 ? pending !== null : status === "selecting");
		}
		/**
		* 超时回滚后 select 迟到成功是否应采纳并同步 UI：
		* 只有当自回滚以来没有任何新的提交改写 committedRef（仍等于回滚前的档位）、
		* 提交纪元未推进（epoch === epochAtCommit，即期间没有发起过新提交——提交失败
		* 回滚后 committedRef 会回到与上一轮回滚相同的值，值比较无法区分「无新提交」
		* 与「新提交失败回滚」，纪元才能区分）、当前无拖动/提交在途，**且生效模型仍是
		* 发起提交时的那个**（sameModel）时，迟到结果才仍对应当前唯一的意图链——此时
		* UI 处于「回滚但后端已生效」的错位态，应补一次同步而不是保持回滚。
		* 否则以新操作链为准：模型被外部改写（另一入口切换 / 宿主推送新投影 / 重连后
		* 同步出别的选择）时，next/index 是在旧模型的档位表上算出来的，写回 UI 会显示
		* 一个后端并未生效的档位。
		*/
		function dmsShouldAdoptLateSuccess(committed, previous, dragging, committing, epoch, epochAtCommit, sameModel) {
			return sameModel && committed === previous && epoch === epochAtCommit && !dragging && !committing;
		}
		/**
		* 拖动终止事件是否对应当前活动拖动：pointerActive 为假（拖动已结束/从未开始）
		* 或事件 pointerId 与活动指针不一致（迟到/重复事件——典型是 pointercancel 终态
		* 后平台补发的 pointerup）时返回 false，调用方应幂等跳过终止动作：不清状态、
		* 不触发提交/回滚回调。pointerId 缺省（blur 兜底提交，无事件对象）时只要求
		* 拖动仍在进行中。
		*/
		function dmsIsActiveDrag(pointerActive, activePointerId, pointerId) {
			if (!pointerActive) return false;
			if (pointerId !== void 0 && activePointerId !== pointerId) return false;
			return true;
		}
		//#endregion
		//#region src/client/effortParticles.ts
		/**
		* dsh-model-selector — 最高档（Ultra/Max）的稀疏粒子层。
		*
		* Codex 的思考等级条只有最后一档带动态效果：蓝紫渐变填充上漂着细小的白色粒子，
		* 其余档位完全静止。本模块只负责这一件事——用 canvas 在填充区内画十几颗缓慢
		* 漂移、轻微闪烁的 1px 白点；不发光、不拖尾、不叠加模糊，避免回到「AI 光效」。
		*
		* 约束：
		*  - 仅当 `active`（最高档）时启动 rAF，离开立即取消；菜单关闭随组件卸载停止。
		*  - 尊重 `prefers-reduced-motion`：只画一帧静态星点，不循环。
		*  - 主题无关：粒子是白色半透明，深浅色底都成立。
		*/
		/** 每帧最多 18 颗，够铺满 ~200px 的填充区又不至于变成星空。 */
		const COUNT = 18;
		/** mulberry32：确定性伪随机，避免每次打开菜单粒子分布完全一样又不用 Math.random。 */
		function mulberry32(seed) {
			let a = seed >>> 0;
			return () => {
				a = a + 1831565813 >>> 0;
				let t = a;
				t = Math.imul(t ^ t >>> 15, t | 1);
				t ^= t + Math.imul(t ^ t >>> 7, t | 61);
				return ((t ^ t >>> 14) >>> 0) / 4294967296;
			};
		}
		/**
		* 在 `ref` 指向的 canvas 上绘制最高档粒子。
		* @param ref - 填充区内的 canvas；未挂载或 inactive 时不启动循环。
		* @param active - 是否处于最高档。
		*/
		function useMaxParticles(ref, active) {
			react.useEffect(() => {
				const canvas = ref.current;
				const context = canvas?.getContext("2d") ?? null;
				if (canvas === null || context === null) return;
				if (!active) {
					context.clearRect(0, 0, canvas.width, canvas.height);
					return;
				}
				const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
				let frame = 0;
				let width = 1;
				let height = 1;
				const fit = () => {
					const rect = canvas.getBoundingClientRect();
					width = Math.max(1, rect.width);
					height = Math.max(1, rect.height);
					const dpr = window.devicePixelRatio || 1;
					canvas.width = Math.round(width * dpr);
					canvas.height = Math.round(height * dpr);
					context.setTransform(dpr, 0, 0, dpr, 0, 0);
				};
				fit();
				const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(fit);
				observer?.observe(canvas);
				const random = mulberry32(2654435769);
				const particles = Array.from({ length: COUNT }, () => ({
					x: random() * width,
					y: 3 + random() * Math.max(1, height - 6),
					radius: .6 + random() * .9,
					vx: 2 + random() * 7,
					vy: -.8 + random() * 1.6,
					phase: random() * Math.PI * 2,
					twinkle: .5 + random() * .9
				}));
				const draw = (time) => {
					context.clearRect(0, 0, width, height);
					for (const particle of particles) {
						if (!reduced) {
							particle.x += particle.vx / 60;
							particle.y += particle.vy / 60;
							if (particle.x > width + 2) {
								particle.x = -2;
								particle.y = 3 + random() * Math.max(1, height - 6);
							}
							if (particle.y < -2) particle.y = height + 2;
							if (particle.y > height + 2) particle.y = -2;
						}
						const wave = Math.sin(time * .001 * particle.twinkle + particle.phase);
						const alpha = reduced ? .55 : .3 + .5 * wave * wave;
						context.beginPath();
						context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
						context.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(3)})`;
						context.fill();
					}
					if (!reduced) frame = requestAnimationFrame(draw);
				};
				if (reduced) draw(0);
				else frame = requestAnimationFrame(draw);
				return () => {
					cancelAnimationFrame(frame);
					observer?.disconnect();
					context.clearRect(0, 0, width, height);
				};
			}, [active, ref]);
		}
		//#endregion
		//#region src/client/effortDrag.ts
		/**
		* dsh-model-selector — EffortSlider 的指针拖动状态机。
		*
		* 从 ModelSelect.tsx 原样搬出（原 EffortSlider 的 8 个 ref 指针生命周期）：
		* 拖动只认发起时记录的活动 pointerId，window 捕获阶段的 move/up/cancel 兜底
		* 指针拖出输入条/菜单外的场景；取消（pointercancel / 触控失控）走回滚回调，
		* 不提交。几何换算（clientX → 档位原始值）与忙态判定都经由回调外接，
		* hook 本身不读组件状态，拖动中途组件重渲染（preview setState）不会中断拖动。
		*/
		/**
		* 拖动中由 pointerId 校验的几何换算：raw = (clientX - left) / width 映射到档位区间。
		* 输入条退化（宽度 ≤ 0 / 档位数 < 2）时返回 fallback（当前值，不跳档）。
		*/
		function rawFromPointer(input, clientX, levelCount, fallback) {
			const bounds = input.getBoundingClientRect();
			return dmsPointerRaw(clientX, bounds.left, bounds.width, levelCount, fallback);
		}
		function useEffortDrag({ levelCount, canStart, onPreview, onCommit, onRollback, inputRef, draggingRef }) {
			const [dragging, setDragging] = react.useState(false);
			const pointerActiveRef = react.useRef(false);
			const activePointerIdRef = react.useRef(null);
			const lastRawRef = react.useRef(0);
			const callbacksRef = react.useRef({
				levelCount,
				canStart,
				onPreview,
				onCommit,
				onRollback
			});
			callbacksRef.current = {
				levelCount,
				canStart,
				onPreview,
				onCommit,
				onRollback
			};
			const showPointerPreview = react.useCallback((input, clientX) => {
				const raw = rawFromPointer(input, clientX, callbacksRef.current.levelCount(), lastRawRef.current);
				lastRawRef.current = raw;
				callbacksRef.current.onPreview(raw);
			}, []);
			const beginDragging = react.useCallback((input, pointerId, clientX) => {
				pointerActiveRef.current = true;
				activePointerIdRef.current = pointerId;
				draggingRef.current = true;
				setDragging(true);
				showPointerPreview(input, clientX);
				try {
					if (!input.hasPointerCapture(pointerId)) input.setPointerCapture(pointerId);
				} catch (cause) {
					console.debug("[dms-effort] setPointerCapture failed", cause);
				}
			}, [showPointerPreview]);
			const moveDragging = react.useCallback((input, pointerId, clientX) => {
				if (!pointerActiveRef.current || activePointerIdRef.current !== pointerId) return;
				showPointerPreview(input, clientX);
			}, [showPointerPreview]);
			const stopDragging = react.useCallback((input, pointerId, clientX) => {
				if (!dmsIsActiveDrag(pointerActiveRef.current, activePointerIdRef.current, pointerId)) return;
				const raw = clientX === void 0 ? lastRawRef.current : rawFromPointer(input, clientX, callbacksRef.current.levelCount(), lastRawRef.current);
				lastRawRef.current = raw;
				pointerActiveRef.current = false;
				activePointerIdRef.current = null;
				draggingRef.current = false;
				setDragging(false);
				if (pointerId !== void 0 && input.hasPointerCapture(pointerId)) input.releasePointerCapture(pointerId);
				callbacksRef.current.onCommit(raw);
			}, []);
			const cancelDragging = (pointerId) => {
				if (!dmsIsActiveDrag(pointerActiveRef.current, activePointerIdRef.current, pointerId)) return;
				pointerActiveRef.current = false;
				activePointerIdRef.current = null;
				draggingRef.current = false;
				setDragging(false);
				callbacksRef.current.onRollback();
			};
			const globalMoveRef = react.useRef(() => {});
			const globalEndRef = react.useRef(() => {});
			const globalCancelRef = react.useRef(() => {});
			globalMoveRef.current = (event) => {
				const input = inputRef.current;
				if (input !== null) moveDragging(input, event.pointerId, event.clientX);
			};
			globalEndRef.current = (event) => {
				const input = inputRef.current;
				if (input !== null) stopDragging(input, event.pointerId, event.clientX);
			};
			globalCancelRef.current = (event) => cancelDragging(event.pointerId);
			react.useEffect(() => {
				if (!dragging) return;
				const move = (event) => globalMoveRef.current(event);
				const end = (event) => globalEndRef.current(event);
				const cancel = (event) => globalCancelRef.current(event);
				window.addEventListener("pointermove", move, true);
				window.addEventListener("pointerup", end, true);
				window.addEventListener("pointercancel", cancel, true);
				return () => {
					window.removeEventListener("pointermove", move, true);
					window.removeEventListener("pointerup", end, true);
					window.removeEventListener("pointercancel", cancel, true);
				};
			}, [dragging]);
			return {
				dragging,
				draggingRef,
				handlers: {
					onPointerDown: (event) => {
						if (!callbacksRef.current.canStart()) return;
						event.preventDefault();
						event.currentTarget.focus({ preventScroll: true });
						beginDragging(event.currentTarget, event.pointerId, event.clientX);
					},
					onPointerMove: (event) => moveDragging(event.currentTarget, event.pointerId, event.clientX),
					onPointerUp: (event) => stopDragging(event.currentTarget, event.pointerId, event.clientX),
					onPointerCancel: (event) => {
						if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
						cancelDragging(event.pointerId);
					},
					onBlur: () => {
						const input = inputRef.current;
						if (input !== null) stopDragging(input);
					}
				}
			};
		}
		/**
		* 向上弹当且仅当 trigger 上方可用空间不小于下方可用空间：
		* 取上下两侧中空间更大的一侧，避免矮窗口把面板挤到视口下沿外面。
		*/
		function dmsMenuAbove(triggerTop, triggerBottom, viewportHeight) {
			return triggerTop >= viewportHeight - triggerBottom;
		}
		/** 向上弹时按 trigger 上方空间钳位菜单高度（bottom-anchored，不能复用向下弹的公式）。 */
		function dmsAboveMaxHeight(triggerTop, cap) {
			return Math.max(0, Math.min(cap, triggerTop - 12));
		}
		/** 向下弹时按 trigger 下方空间钳位菜单高度（top-anchored，不能复用向上弹的公式）。 */
		function dmsBelowMaxHeight(triggerBottom, viewportHeight, cap) {
			return Math.max(0, Math.min(cap, viewportHeight - triggerBottom - 12));
		}
		//#endregion
		//#region src/client/roving.ts
		/**
		* dsh-model-selector — 菜单 roving tabindex 的纯决策逻辑（node 可测）。
		*
		* 模型列表可达数百行，若每行都是 Tab 停靠点，Tab 键会陷入行海；roving
		* tabindex（WAI-ARIA menu 模式的通行做法）只让「活动行」留在 Tab 序里，
		* 其余行 tabindex=-1、仅方向键可达。本模块只负责一件事：给定当前渲染的
		* 行集合与选中行，算出 Tab 从搜索框进入列表时应停靠的默认行键。
		*/
		/**
		* 模型行键的**唯一构造点**：菜单 DOM 的 `data-row-key`、roving 决策与行焦点
		* 回调必须同源。此前这三处各自拼模板串，一次局部改名就能让 dmsDefaultRowKey
		* 返回的键匹配不到任何行（Tab 落点静默失效），且测试拿自制副本验证不到。
		*/
		function dmsRowKey(providerId, modelId) {
			return `${providerId}\u0000${modelId}`;
		}
		/** 组头行键（分组视图里组头也参与方向键导航）。 */
		function dmsHeaderKey(providerId) {
			return `header:${providerId}`;
		}
		/**
		* Tab 默认落点：搜索态取「选中行若在命中集内，否则首个命中」；分组态取
		* 「选中行若可见，否则首个可见模型行」；全部折叠（无可见模型行）时回退到
		* 首个组头。返回 null 表示当前没有任何可聚焦行（空态由菜单外的 role=status
		* 播报，列表容器不渲染）。
		*/
		function dmsDefaultRowKey(set) {
			if (set.hitKeys !== null) {
				if (set.hitKeys.length === 0) return null;
				return set.selectedKey !== null && set.hitKeys.includes(set.selectedKey) ? set.selectedKey : set.hitKeys[0];
			}
			if (set.modelKeys.length > 0) return set.selectedKey !== null && set.modelKeys.includes(set.selectedKey) ? set.selectedKey : set.modelKeys[0];
			return set.headerKeys[0] ?? null;
		}
		//#endregion
		//#region src/client/search.ts
		/**
		* 搜索归一化：NFKD 分解 → 去组合标记 → 小写。
		*
		* 比裸 `toLowerCase()` 宽容：`'İstanbul'` 能被 `'istanbul'` 命中（裸 toLowerCase
		* 把 U+0130 折成 `'i̇'` 两个码位，与 ASCII `'i'` 反而不匹配 → 漏检；`'café'` 同理）。
		* 注意它**可能改变码位长度**，所以不能用它的下标去切原串 —— 高亮区间另走
		* {@link dmsNameHit}，只在长度不变时给区间。
		*/
		function dmsFold(text) {
			return text.normalize("NFKD").replace(/\p{M}+/gu, "").toLowerCase();
		}
		/** 搜索词归一化（去首尾空白后折叠）。空串 = 非搜索态。 */
		function dmsNormalizeQuery(raw) {
			return dmsFold(raw.trim());
		}
		/** 模型条目的搜索文本（haystack）。与 choices 构建处同源，避免两处漂移。 */
		function dmsHaystack(group, model) {
			return dmsFold(`${model.name}\n${model.description ?? ""}\n${group.name}\n${model.id}\n${group.id}`);
		}
		/**
		* 名称内的命中区间：折叠后长度不变时用下标定位；长度变化（含会改变码位数的
		* 大小写/变音符映射）时返回 null —— 宁可不高亮，也不能用错位的区间去切原串
		* （那会把高亮画到别的字符上，甚至越界）。
		*/
		function dmsNameHit(name, normalizedQuery) {
			if (normalizedQuery === "") return null;
			const folded = dmsFold(name);
			if (folded.length !== name.length) return null;
			const at = folded.indexOf(normalizedQuery);
			return at < 0 ? null : {
				start: at,
				end: at + normalizedQuery.length
			};
		}
		/**
		* 搜索：遍历 choices 计数全部命中，只构造窗口内（前 limit 条）的渲染条目 ——
		* 宽泛关键词（单字母）命中数百条时，每次击键省掉数百次对象分配与名称匹配；
		* total 单独累计，播报与「仅显示前 N 条」提示仍然准确。
		*/
		function dmsSearchHits(choices, normalizedQuery, limit) {
			if (normalizedQuery === "") return null;
			const items = [];
			let total = 0;
			for (const choice of choices) {
				if (!choice.haystack.includes(normalizedQuery)) continue;
				total += 1;
				if (items.length >= limit) continue;
				items.push({
					group: choice.group,
					model: choice.model,
					nameHit: dmsNameHit(choice.model.name, normalizedQuery)
				});
			}
			return {
				items,
				total
			};
		}
		/**
		* 空态判定：**无模型优先于无命中** —— 目录为空而用户又输了关键词时，真相是
		* 「没有可用的模型」（该引导用户去配置/加载目录），不是「没有匹配关键词的模型」
		* （那会引导用户去改关键词，而无论改什么都不会有结果）。
		*/
		function dmsMenuEmptyState(input) {
			if (input.status === "ready" && input.choiceCount === 0) return "noModels";
			if (input.searching && input.hitCount === 0) return "noHits";
			return null;
		}
		//#endregion
		//#region src/client/keys.ts
		/**
		* 按键 → 动作。无行可去时对方向键/Home/End 返回 none 而不是吞键：列表为空
		* （加载中/无命中/全折叠）时搜索框里的上下键仍应有移光标语义，preventDefault
		* 由调用方在真正执行动作时才发。
		*/
		function dmsMenuKeyAction(input) {
			if (input.composing) return { type: "none" };
			const { key, open, fromSearch, inMenu, onNonInput, hasQuery, rowCount, hitCount } = input;
			if (key === "Escape" && open) {
				if (hasQuery && inMenu) return {
					type: "clearQuery",
					focusSearch: !fromSearch
				};
				return { type: "close" };
			}
			if (!open) return { type: "none" };
			if ((key === "ArrowDown" || key === "ArrowUp") && (onNonInput || fromSearch)) {
				if (rowCount === 0) return { type: "none" };
				return {
					type: "moveFocus",
					offset: key === "ArrowDown" ? 1 : -1
				};
			}
			if ((key === "Home" || key === "End") && onNonInput) {
				if (rowCount === 0) return { type: "none" };
				return {
					type: "focusEdge",
					last: key === "End"
				};
			}
			if (key === "Enter" && fromSearch && hitCount > 0) return { type: "chooseFirstHit" };
			return { type: "none" };
		}
		/**
		* roving 环绕下标：焦点不在任何行上（activeIndex < 0）时向下从首行进、向上从
		* 末行进；已在某行上时按 offset 循环。length <= 0 返回 -1（无可去之处）。
		*/
		function dmsNextRowIndex(activeIndex, offset, length) {
			if (length <= 0) return -1;
			return ((activeIndex < 0 ? offset > 0 ? -1 : 0 : activeIndex) + offset + length) % length;
		}
		//#endregion
		//#region src/client/copy.ts
		/**
		* trigger 文案。目录成员资格只是参考（routable 契约）：current 匹配不到任何
		* group 不代表没有选择 —— 此时显示 provider/model 原始 id，而不是「选择模型」。
		*/
		function dmsTriggerCopy(input, t) {
			const { current, modelName, providerName, effortLabel, waiting } = input;
			const modelLabel = modelName ?? (waiting ? t("trigger.loading") : current === null ? t("trigger.fallback") : `${current.provider}/${current.model}`);
			const providerLabel = modelName === void 0 ? void 0 : providerName;
			const label = effortLabel === void 0 ? modelLabel : `${modelLabel} · ${effortLabel}`;
			const title = providerLabel === void 0 ? label : `${providerLabel} · ${label}`;
			const named = providerLabel === void 0 ? modelLabel : `${providerLabel} ${modelLabel}`;
			const ariaModel = modelName === void 0 ? current === null ? null : `${current.provider}/${current.model}` : named;
			return {
				modelLabel,
				providerLabel,
				label,
				title,
				aria: waiting ? t("trigger.loading") : ariaModel === null ? t("trigger.selectAria") : effortLabel === void 0 ? t("trigger.aria", { model: ariaModel }) : t("trigger.ariaEffort", {
					model: ariaModel,
					effort: effortLabel
				})
			};
		}
		//#endregion
		//#region src/client/ModelSelect.tsx
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
		const IconChevronDown = /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutlineRegular, { size: 14 });
		const IconCheck = /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCheckOutlineRegular, { size: 14 });
		const IconClear = /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseFillRegular, { size: 14 });
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
		const EffortSlider = react.memo(function EffortSlider({ state, select, t, onSelectFailure }) {
			const levels = dmsSliderLevels(state);
			const [effort, setEffort] = react.useState(() => levels[dmsEffectiveEffortIndex(levels, state)]?.id ?? "");
			const [preview, setPreview] = react.useState(() => dmsEffectiveEffortIndex(levels, state));
			const [committing, setCommitting] = react.useState(false);
			const [localError, setLocalError] = react.useState(null);
			const stateRef = react.useRef(state);
			stateRef.current = state;
			const particlesRef = react.useRef(null);
			const inputRef = react.useRef(null);
			const committedRef = react.useRef("");
			const committingRef = react.useRef(false);
			const previewRef = react.useRef(0);
			const draggingRef = react.useRef(false);
			const commitTimerRef = react.useRef(null);
			const mountedRef = react.useRef(false);
			const commitEpochRef = react.useRef(0);
			const available = state.current !== null && levels.length >= 2;
			const busy = dmsEffortBusy(committing, state.status, state.pending);
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
			}, [
				available,
				levels,
				state.current?.provider,
				state.current?.model,
				state.current?.reasoningEffort
			]);
			react.useEffect(() => {
				previewRef.current = preview;
			}, [preview]);
			const isMax = levels.length >= 2 && preview >= levels.length - 1 - 1e-6;
			useMaxParticles(particlesRef, isMax);
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
			const showPointerPreview = react.useCallback((raw) => {
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
			const commit = react.useCallback(async (raw) => {
				if (dmsEffortBusy(committingRef.current, state.status, state.pending)) return;
				const index = dmsClampIndex(raw, levels.length);
				const next = levels[index]?.id;
				if (next === void 0) return;
				if (next === committedRef.current) {
					previewRef.current = index;
					setPreview(index);
					setEffort(next);
					return;
				}
				committingRef.current = true;
				const previous = committedRef.current;
				commitEpochRef.current += 1;
				const epochAtCommit = commitEpochRef.current;
				setCommitting(true);
				setLocalError(null);
				previewRef.current = index;
				setPreview(index);
				setEffort(next);
				try {
					const current = state.current;
					if (current === null) throw new Error(t("empty.efforts"));
					const modelKeyAtCommit = dmsRowKey(current.provider, current.model);
					const result = await new Promise((resolve, reject) => {
						let settled = false;
						const timer = window.setTimeout(() => {
							if (settled) return;
							settled = true;
							commitTimerRef.current = null;
							reject(new Error(t("effort.timeout")));
						}, EFFORT_COMMIT_TIMEOUT_MS);
						commitTimerRef.current = timer;
						select({
							provider: current.provider,
							model: current.model,
							reasoningEffort: next
						}).then((result) => {
							if (settled) {
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
						}, (cause) => {
							if (settled) return;
							settled = true;
							window.clearTimeout(timer);
							commitTimerRef.current = null;
							reject(cause);
						});
					});
					if (result === void 0 || !result.ok) {
						if (result !== void 0) console.warn("[dsh-model-selector] effort select failed:", result.error);
						throw new Error(t("effort.failed"));
					}
					if (mountedRef.current) {
						committedRef.current = next;
						previewRef.current = index;
						setEffort(next);
						setPreview(index);
					}
				} catch (cause) {
					if (commitEpochRef.current === epochAtCommit) {
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
					if (commitEpochRef.current === epochAtCommit) {
						committingRef.current = false;
						if (mountedRef.current) setCommitting(false);
					}
				}
			}, [
				levels,
				select,
				state,
				t,
				onSelectFailure
			]);
			const drag = useEffortDrag({
				levelCount: () => levels.length,
				canStart: () => !busy,
				onPreview: showPointerPreview,
				onCommit: (raw) => void commit(raw),
				onRollback: rollback,
				inputRef,
				draggingRef
			});
			const { dragging } = drag;
			react.useEffect(() => {
				previewRef.current = preview;
			}, [preview]);
			const onKeyDown = (event) => {
				const current = dmsClampIndex(preview, levels.length);
				let target;
				if (event.key === "ArrowLeft" || event.key === "ArrowDown" || event.key === "PageDown") target = Math.max(0, current - 1);
				else if (event.key === "ArrowRight" || event.key === "ArrowUp" || event.key === "PageUp") target = Math.min(levels.length - 1, current + 1);
				else if (event.key === "Home") target = 0;
				else if (event.key === "End") target = levels.length - 1;
				if (target === void 0) return;
				event.preventDefault();
				if (busy) return;
				commit(target);
			};
			if (!available) return null;
			const count = levels.length;
			const effortName = levels[dmsEffortIndex(levels, effort)]?.name ?? effort;
			const effortDesc = levels[dmsEffortIndex(levels, effort)]?.description;
			const style = { "--dms-thumb-left": `calc(10px + (100% - 20px) * ${preview / (count - 1)})` };
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: `dms-effort${dragging ? " is-dragging" : ""}${error === null ? "" : " is-error"}${isMax ? " is-max" : ""}`,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dms-effort-slider",
						style,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dms-effort-track",
								"aria-hidden": "true",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: "dms-effort-fill",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("canvas", {
										ref: particlesRef,
										className: "dms-effort-particles"
									})
								}), levels.map((level, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: `dms-effort-dot${index <= preview + 1e-6 ? " is-on" : ""}`,
									style: { left: `calc(12px + (100% - 24px) * ${index / (count - 1)})` }
								}, level.id))]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								ref: inputRef,
								className: "dms-effort-input",
								role: "slider",
								tabIndex: busy ? -1 : 0,
								"aria-label": t("menu.effort"),
								"aria-valuemin": 0,
								"aria-valuemax": count - 1,
								"aria-valuenow": Math.round(preview * 100) / 100,
								"aria-valuetext": effortName,
								"aria-disabled": busy,
								onPointerDown: drag.handlers.onPointerDown,
								onPointerMove: drag.handlers.onPointerMove,
								onPointerUp: drag.handlers.onPointerUp,
								onPointerCancel: drag.handlers.onPointerCancel,
								onBlur: drag.handlers.onBlur,
								onKeyDown
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dms-effort-knob",
								"aria-hidden": "true"
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dms-effort-value",
						title: effortDesc ?? effortName,
						children: effortName
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dms-sr",
						role: "status",
						children: error ?? ""
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dms-effort-error",
						children: error ?? ""
					})
				]
			});
		});
		/**
		* 菜单里的一行模型。独立成 memo 组件：目录可能数百行，搜索输入每击键都会
		* 重建菜单内容，行 props（group/model 引用、selected/busy/rowKey、稳定的
		* onChoose）稳定时 React 直接跳过 reconcile，只重渲染真正变化的那行。
		*
		* 自定义比较器（默认浅比较的补充）：nameHit 是每次击键新建的对象（引用必变），
		* 但 100 条命中里绝大多数命中区间不变——按值比较 start/end，值相同即跳过
		* 重渲染，搜索才不卡顿。
		*/
		const ModelOption = react.memo(function ModelOption({ group, model, showProvider, selected, rowKey, active, searchMode, onRowFocus, nameHit, setsize, posinset, t, onChoose }) {
			const hit = nameHit === void 0 || nameHit === null || nameHit.start === nameHit.end ? null : [
				model.name.slice(0, nameHit.start),
				model.name.slice(nameHit.start, nameHit.end),
				model.name.slice(nameHit.end)
			];
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
				type: "button",
				role: searchMode ? "option" : "menuitemradio",
				"aria-checked": searchMode ? void 0 : selected,
				"aria-selected": searchMode ? selected : void 0,
				id: searchMode ? `dms-opt-${encodeURIComponent(rowKey)}` : void 0,
				"aria-setsize": searchMode && setsize !== void 0 && setsize > posinset ? setsize : void 0,
				"aria-posinset": searchMode && posinset !== void 0 ? posinset : void 0,
				"data-row-key": rowKey,
				tabIndex: active ? 0 : -1,
				className: `dms-model-option${selected ? " dms-model-optionSelected" : ""}`,
				title: model.description === void 0 ? model.name : `${model.name} — ${model.description}`,
				onFocus: () => onRowFocus(rowKey),
				onClick: () => onChoose({
					provider: group.id,
					model: model.id
				}),
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					className: "dms-model-option-copy",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: "dms-nameRow",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dms-model-option-name",
								children: hit === null ? model.name : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
									hit[0],
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "dms-hit",
										children: hit[1]
									}),
									hit[2]
								] })
							}), model.reasoning !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dms-badge",
								title: t("badge.reasoningHint"),
								children: t("badge.reasoning")
							})]
						}),
						model.description !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dms-model-option-desc",
							children: model.description
						}),
						showProvider && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dms-model-option-provider",
							children: group.name
						})
					]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "dms-model-check",
					"aria-hidden": "true",
					children: selected ? IconCheck : null
				})]
			});
		}, (prev, next) => {
			if (prev.group !== next.group) return false;
			if (prev.model !== next.model) return false;
			if (prev.showProvider !== next.showProvider) return false;
			if (prev.selected !== next.selected) return false;
			if (prev.rowKey !== next.rowKey) return false;
			if (prev.active !== next.active) return false;
			if (prev.searchMode !== next.searchMode) return false;
			if (prev.onRowFocus !== next.onRowFocus) return false;
			if (prev.t !== next.t) return false;
			if (prev.onChoose !== next.onChoose) return false;
			if (prev.setsize !== next.setsize) return false;
			if (prev.posinset !== next.posinset) return false;
			if (prev.nameHit === next.nameHit) return true;
			if (prev.nameHit === null || prev.nameHit === void 0) return false;
			if (next.nameHit === null || next.nameHit === void 0) return false;
			return prev.nameHit.start === next.nameHit.start && prev.nameHit.end === next.nameHit.end;
		});
		function ModelSelect({ locked, available, directory, load, select, t }) {
			const state = react.useSyncExternalStore(directory.subscribe, directory.getSnapshot);
			const [open, setOpen] = react.useState(false);
			const [menuAbove, setMenuAbove] = react.useState(true);
			const [query, setQuery] = react.useState("");
			const [collapsed, setCollapsed] = react.useState(() => /* @__PURE__ */ new Set());
			const [notice, setNotice] = react.useState(null);
			const [activeRowKey, setActiveRowKey] = react.useState(null);
			const onRowFocus = react.useCallback((key) => {
				setActiveRowKey(key);
			}, []);
			const [toast, setToast] = react.useState(null);
			const toastSeqRef = react.useRef(0);
			const showToast = react.useCallback((text, failed = true) => {
				toastSeqRef.current += 1;
				setToast({
					seq: toastSeqRef.current,
					text,
					failed
				});
			}, []);
			const markSelectFailure = react.useCallback(() => {
				lastActionRef.current = "select";
			}, []);
			const dismissToast = react.useCallback(() => {
				setToast(null);
			}, []);
			const lastActionRef = react.useRef("load");
			const rootRef = react.useRef(null);
			const triggerRef = react.useRef(null);
			const searchRef = react.useRef(null);
			const lastLoadRef = react.useRef(0);
			const loadRef = react.useRef(load);
			loadRef.current = load;
			const id = react.useId();
			const choices = react.useMemo(() => state.groups.flatMap((group) => group.models.map((model) => ({
				group,
				model,
				haystack: dmsHaystack(group, model),
				selection: {
					provider: group.id,
					model: model.id,
					...model.reasoning?.defaultEffort === void 0 ? {} : { reasoningEffort: model.reasoning.defaultEffort }
				}
			}))), [state.groups]);
			const currentChoice = react.useMemo(() => {
				const current = state.current;
				if (current === null) return void 0;
				return choices.find((c) => c.selection.provider === current.provider && c.selection.model === current.model);
			}, [choices, state.current]);
			const reasoning = currentChoice?.model.reasoning;
			const effectiveEffort = state.current?.reasoningEffort ?? reasoning?.defaultEffort;
			const effortLabel = reasoning === void 0 ? dmsRetainedEffortLabel(state) : effectiveEffort === void 0 ? t("effort.providerDefault") : reasoning.efforts.find((level) => level.id === effectiveEffort)?.name ?? effectiveEffort;
			const busy = dmsEffortBusy(false, state.status, state.pending);
			const pendingModelSwitch = state.pending !== null && state.current !== null && (state.pending.provider !== state.current.provider || state.pending.model !== state.current.model);
			const chooseInputRef = react.useRef({
				busy,
				current: state.current,
				choices,
				open
			});
			chooseInputRef.current = {
				busy,
				current: state.current,
				choices,
				open
			};
			const normalized = dmsNormalizeQuery(query);
			const hits = react.useMemo(() => dmsSearchHits(choices, normalized, MAX_VISIBLE_HITS), [choices, normalized]);
			const visibleModelKeys = react.useMemo(() => state.groups.flatMap((g) => collapsed.has(g.id) ? [] : g.models.map((m) => dmsRowKey(g.id, m.id))), [state.groups, collapsed]);
			const defaultRowKey = react.useMemo(() => dmsDefaultRowKey({
				hitKeys: hits === null ? null : hits.items.map((h) => dmsRowKey(h.group.id, h.model.id)),
				modelKeys: visibleModelKeys,
				headerKeys: state.groups.map((g) => dmsHeaderKey(g.id)),
				selectedKey: state.current === null ? null : dmsRowKey(state.current.provider, state.current.model)
			}), [
				hits,
				visibleModelKeys,
				state.groups,
				state.current
			]);
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
				if (!available || open) return;
				if (state.status === "selecting" || state.pending !== null) return;
				if (Date.now() - lastLoadRef.current < DIRECTORY_STALE_MS && state.status === "ready" && state.groups.length > 0) return;
				lastActionRef.current = "load";
				lastLoadRef.current = Date.now();
				loadRef.current();
			}, [
				available,
				open,
				state.status,
				state.pending,
				state.groups.length
			]);
			const [showLoading, setShowLoading] = react.useState(false);
			react.useEffect(() => {
				if (!open || state.status !== "loading") {
					setShowLoading(false);
					return;
				}
				const timer = window.setTimeout(() => setShowLoading(true), 250);
				return () => window.clearTimeout(timer);
			}, [open, state.status]);
			const menuRef = react.useRef(null);
			const [menuMaxHeight, setMenuMaxHeight] = react.useState(420);
			const [lockedHeight, setLockedHeight] = react.useState(null);
			const [lockedPos, setLockedPos] = react.useState(null);
			react.useLayoutEffect(() => {
				if (!open) return;
				const measure = () => {
					const trigger = triggerRef.current;
					if (trigger === null) return;
					const rect = trigger.getBoundingClientRect();
					const above = dmsMenuAbove(rect.top, rect.bottom, window.innerHeight);
					setMenuAbove(above);
					setMenuMaxHeight(above ? dmsAboveMaxHeight(rect.top, 420) : dmsBelowMaxHeight(rect.bottom, window.innerHeight, 420));
				};
				measure();
				let raf = 0;
				const onViewportChange = () => {
					if (raf !== 0) return;
					raf = requestAnimationFrame(() => {
						raf = 0;
						measure();
					});
				};
				window.addEventListener("resize", onViewportChange, { passive: true });
				window.addEventListener("scroll", onViewportChange, {
					capture: true,
					passive: true
				});
				return () => {
					if (raf !== 0) cancelAnimationFrame(raf);
					window.removeEventListener("resize", onViewportChange);
					window.removeEventListener("scroll", onViewportChange, { capture: true });
				};
			}, [open]);
			const menuPos = (0, _deepseek_ai_dsh_client_ui_primitives.useAnchoredPosition)({
				open,
				anchorRef: triggerRef,
				panelRef: menuRef,
				side: menuAbove ? "top" : "bottom",
				align: "end",
				gap: 8,
				margin: 12
			});
			react.useEffect(() => {
				if (!open) return;
				searchRef.current?.focus();
			}, [open]);
			react.useEffect(() => {
				if (!open) return;
				const release = () => {
					setLockedHeight(null);
					setLockedPos(null);
				};
				window.addEventListener("resize", release);
				return () => window.removeEventListener("resize", release);
			}, [open]);
			const scrollSelectedIntoView = () => {
				const list = menuRef.current?.querySelector(".dms-groups");
				if (list === null || list === void 0) return;
				const maxScroll = list.scrollHeight - list.clientHeight;
				if (list.scrollTop > maxScroll) list.scrollTop = Math.max(0, maxScroll);
				const selected = state.current;
				const row = list.querySelector("[role=\"menuitemradio\"][aria-checked=\"true\"]");
				if (row === null) {
					if (selected === null) return;
					const section = list.querySelector(`section[data-group-id="${globalThis.CSS.escape(selected.provider)}"]`);
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
				const headerHeight = header === null || header === void 0 ? 0 : header.getBoundingClientRect().height;
				if (rowRect.top < listRect.top + headerHeight) list.scrollTop += rowRect.top - (listRect.top + headerHeight);
				else if (rowRect.bottom > listRect.bottom) list.scrollTop += rowRect.bottom - listRect.bottom;
			};
			const expandedProviderRef = react.useRef(null);
			react.useLayoutEffect(() => {
				if (!open) {
					expandedProviderRef.current = null;
					return;
				}
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
			}, [
				open,
				state.groups,
				state.current?.provider,
				state.current?.model,
				collapsed,
				hits
			]);
			const show = react.useCallback(() => {
				setOpen(true);
				if (state.status === "error" || state.groups.length === 0 || Date.now() - lastLoadRef.current > DIRECTORY_STALE_MS) reload();
			}, [
				state.status,
				state.groups.length,
				reload
			]);
			const focusTrigger = () => {
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
				setLockedHeight(null);
				setLockedPos(null);
				if (restoreFocus) queueMicrotask(focusTrigger);
			}, []);
			const dismissOnOutsidePointer = react.useCallback(() => {
				close(true);
			}, [close]);
			react.useEffect(() => {
				if (!open) return;
				const onPointerDown = (event) => {
					const target = event.target;
					if (!(target instanceof Node)) return;
					if (rootRef.current?.contains(target) === true) return;
					if (menuRef.current?.contains(target) === true) return;
					dismissOnOutsidePointer();
				};
				document.addEventListener("pointerdown", onPointerDown, true);
				return () => document.removeEventListener("pointerdown", onPointerDown, true);
			}, [open, dismissOnOutsidePointer]);
			react.useEffect(() => {
				if (locked && open) close(true);
			}, [
				locked,
				open,
				close
			]);
			const choose = react.useCallback((selection) => {
				const { busy: isBusy, current, choices: catalog } = chooseInputRef.current;
				if (isBusy) return;
				if (current?.provider === selection.provider && current.model === selection.model) {
					setNotice(t("notice.already"));
					return;
				}
				const target = catalog.find((c) => c.selection.provider === selection.provider && c.selection.model === selection.model);
				const plan = dmsChoosePlan(target?.model.reasoning);
				const full = {
					provider: selection.provider,
					model: selection.model,
					...plan.effort === void 0 ? {} : { reasoningEffort: plan.effort }
				};
				lastActionRef.current = "select";
				const autoName = plan.effort === void 0 ? "" : target?.model.reasoning?.efforts.find((level) => level.id === plan.effort)?.name ?? plan.effort;
				(async () => {
					try {
						const result = await new Promise((resolve, reject) => {
							let settled = false;
							const timer = window.setTimeout(() => {
								if (settled) return;
								settled = true;
								reject(new Error(t("notice.selectFailed")));
							}, EFFORT_COMMIT_TIMEOUT_MS);
							select(full).then((settledResult) => {
								if (settled) return;
								settled = true;
								window.clearTimeout(timer);
								resolve(settledResult);
							}, (cause) => {
								if (settled) return;
								settled = true;
								window.clearTimeout(timer);
								reject(cause);
							});
						});
						if (result === void 0 || !result.ok) {
							const message = result !== void 0 ? `${result.error.code}: ${result.error.message}` : directory.getSnapshot().error;
							showToast(message !== null ? t("error.action", { message }) : t("notice.selectFailed"));
							return;
						}
						if (chooseInputRef.current.open) close(true);
						if (plan.autoRaised) showToast(t("toast.effortAuto", { effort: autoName }), false);
					} catch {
						showToast(t("notice.selectFailed"));
					}
				})();
			}, [
				select,
				t,
				directory,
				close,
				showToast
			]);
			const toggleCollapse = react.useCallback((groupId) => {
				setCollapsed((prev) => {
					const next = new Set(prev);
					if (next.has(groupId)) next.delete(groupId);
					else next.add(groupId);
					return next;
				});
			}, []);
			if (!available) return null;
			const moveFocus = (offset) => {
				const menu = menuRef.current;
				if (menu === null) return;
				const items = [...menu.querySelectorAll("[data-row-key]")];
				if (items.length === 0) return;
				items[dmsNextRowIndex(items.findIndex((item) => item === document.activeElement), offset, items.length)]?.focus();
			};
			const focusEdge = (last) => {
				const items = menuRef.current?.querySelectorAll("[data-row-key]");
				if (items === void 0 || items.length === 0) return;
				(last ? items[items.length - 1] : items[0])?.focus();
			};
			const onRootKeyDown = (event) => {
				const target = event.target;
				const action = dmsMenuKeyAction({
					key: event.key,
					composing: event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229,
					open,
					fromSearch: target instanceof HTMLInputElement && target === searchRef.current,
					inMenu: menuRef.current?.contains(document.activeElement) === true,
					onNonInput: !(target instanceof HTMLInputElement),
					hasQuery: query !== "",
					rowCount: menuRef.current?.querySelectorAll("[data-row-key]").length ?? 0,
					hitCount: hits?.items.length ?? 0
				});
				switch (action.type) {
					case "none": return;
					case "clearQuery":
						event.preventDefault();
						setNotice(null);
						setQuery("");
						if (action.focusSearch) searchRef.current?.focus();
						return;
					case "close":
						event.preventDefault();
						close(true);
						return;
					case "moveFocus":
						event.preventDefault();
						moveFocus(action.offset);
						return;
					case "focusEdge":
						event.preventDefault();
						focusEdge(action.last);
						return;
					case "chooseFirstHit": {
						const first = hits?.items[0];
						if (first === void 0) return;
						event.preventDefault();
						choose({
							provider: first.group.id,
							model: first.model.id
						});
						return;
					}
				}
			};
			const onBlur = (event) => {
				const related = event.relatedTarget;
				if (related instanceof Node && (rootRef.current?.contains(related) === true || menuRef.current?.contains(related) === true)) return;
				if (related instanceof Node) {
					close();
					return;
				}
				if (document.visibilityState === "hidden") close();
			};
			const trigger = dmsTriggerCopy({
				current: state.current,
				modelName: currentChoice?.model.name,
				providerName: currentChoice?.group.name,
				effortLabel,
				waiting: state.current === null && state.status === "loading"
			}, t);
			const renderErrorStrip = () => {
				if (state.error !== null && lastActionRef.current === "load") return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dms-error",
					role: "alert",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("error.action", { message: state.error }) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: "dms-retry",
						onClick: reload,
						children: t("action.reload")
					})]
				});
				return null;
			};
			const renderFailures = (failures) => failures.map((failure) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dms-warning",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("warning.groupLoad", {
					name: failure.name,
					message: failure.message
				}) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: "dms-retry",
					onClick: reload,
					children: t("action.reload")
				})]
			}, failure.id));
			const emptyState = dmsMenuEmptyState({
				status: state.status,
				choiceCount: choices.length,
				searching: hits !== null,
				hitCount: hits?.total ?? 0
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				ref: rootRef,
				className: "dms-root",
				tabIndex: -1,
				onKeyDown: onRootKeyDown,
				onBlur,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						ref: triggerRef,
						type: "button",
						className: "dms-trigger",
						"aria-label": trigger.aria,
						"aria-haspopup": "menu",
						"aria-expanded": open,
						"aria-controls": open ? `${id}-menu` : void 0,
						title: trigger.title,
						disabled: locked,
						onClick: () => open ? close() : show(),
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dms-triggerLabel",
								children: trigger.modelLabel
							}),
							trigger.providerLabel !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dms-triggerProvider",
								children: trigger.providerLabel
							}),
							effortLabel !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dms-triggerEffort",
								children: effortLabel
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: `dms-chevron${open ? " dms-chevronOpen" : ""}`,
								"aria-hidden": "true",
								children: IconChevronDown
							})
						]
					}),
					open ? (0, react_dom.createPortal)(/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						id: `${id}-menu`,
						ref: menuRef,
						onKeyDown: onRootKeyDown,
						style: {
							left: (lockedPos ?? menuPos)?.left ?? 0,
							top: (lockedPos ?? menuPos)?.top ?? 0,
							maxHeight: menuMaxHeight,
							height: lockedHeight ?? void 0,
							visibility: menuPos === null ? "hidden" : void 0
						},
						onPointerDownCapture: (event) => {
							const target = event.target instanceof Element ? event.target : null;
							if (target === null || target.closest(".dms-effort") === null) return;
							setLockedHeight((current) => current ?? menuRef.current?.offsetHeight ?? null);
							setLockedPos((current) => current ?? (menuPos === null ? null : {
								left: Number(menuPos.left),
								top: Number(menuPos.top)
							}));
						},
						className: "dms-menu dms-menuModel" + (menuAbove ? "" : " dms-menuBelow"),
						children: [
							showLoading && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "dms-status",
								role: "status",
								children: t("status.loading")
							}),
							renderErrorStrip(),
							state.failures.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "dms-failures",
								role: "alert",
								children: renderFailures(state.failures)
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dms-search",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									ref: searchRef,
									type: "text",
									className: "dms-searchInput",
									value: query,
									placeholder: t("search.placeholder"),
									"aria-label": t("search.placeholder"),
									role: "combobox",
									"aria-expanded": hits !== null && hits.total > 0,
									"aria-autocomplete": "list",
									"aria-controls": emptyState === null ? `${id}-groups` : void 0,
									autoComplete: "off",
									enterKeyHint: "search",
									spellCheck: false,
									onChange: (event) => {
										setNotice(null);
										setQuery(event.target.value);
									}
								}), query !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: "dms-searchClear",
									"aria-label": t("search.clearAria"),
									onClick: () => {
										setNotice(null);
										setQuery("");
										searchRef.current?.focus();
									},
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										"aria-hidden": "true",
										className: "dms-icon-slot",
										children: IconClear
									})
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dms-sr",
								role: "status",
								children: hits !== null && hits.total > 0 ? t("search.status", { count: String(hits.total) }) : ""
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dms-sr",
								role: "note",
								children: t("badge.reasoningHint")
							}),
							emptyState === "noHits" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "dms-empty dms-groupsFill",
								role: "status",
								children: t("search.noMatch", { query: query.trim() })
							}),
							emptyState === "noModels" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "dms-empty dms-groupsFill",
								role: "status",
								children: t("empty.models")
							}),
							emptyState === null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "dms-groups",
								id: `${id}-groups`,
								role: hits !== null ? "listbox" : "menu",
								"aria-busy": state.status === "loading" || busy,
								"data-model-switch": pendingModelSwitch ? "true" : void 0,
								"aria-label": t("menu.aria"),
								children: hits !== null ? hits.items.map((hit, index) => {
									const rowKey = dmsRowKey(hit.group.id, hit.model.id);
									return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ModelOption, {
										group: hit.group,
										model: hit.model,
										showProvider: true,
										selected: state.current?.provider === hit.group.id && state.current.model === hit.model.id,
										rowKey,
										active: rowKey === activeRowKey,
										searchMode: true,
										onRowFocus,
										nameHit: hit.nameHit,
										setsize: hits.total,
										posinset: index + 1,
										t,
										onChoose: choose
									}, rowKey);
								}) : state.groups.map((group) => {
									const headingId = `${id}-${group.id}`;
									const headerKey = dmsHeaderKey(group.id);
									const isCollapsed = collapsed.has(group.id);
									return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
										"data-group-id": group.id,
										role: "group",
										"aria-labelledby": headingId,
										className: "dms-group",
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
											type: "button",
											role: "menuitem",
											"data-row-key": headerKey,
											tabIndex: activeRowKey === headerKey ? 0 : -1,
											className: "dms-groupHeader",
											"aria-expanded": !isCollapsed,
											"aria-label": t("group.toggleAria", {
												name: group.name,
												count: String(group.models.length)
											}),
											onFocus: () => onRowFocus(headerKey),
											onClick: () => toggleCollapse(group.id),
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: `dms-groupChevron${isCollapsed ? " dms-groupChevronClosed" : ""}`,
													"aria-hidden": "true",
													children: IconChevronDown
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													id: headingId,
													className: "dms-groupName",
													children: group.name
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: "dms-groupCount",
													children: group.models.length
												})
											]
										}), !isCollapsed && group.models.map((model) => {
											const rowKey = dmsRowKey(group.id, model.id);
											return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ModelOption, {
												group,
												model,
												showProvider: false,
												selected: state.current?.provider === group.id && state.current.model === model.id,
												rowKey,
												active: rowKey === activeRowKey,
												searchMode: false,
												onRowFocus,
												t,
												onChoose: choose
											}, rowKey);
										})]
									}, group.id);
								})
							}),
							hits !== null && hits.total > MAX_VISIBLE_HITS && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "dms-more",
								role: "note",
								children: t("search.more", {
									shown: String(MAX_VISIBLE_HITS),
									total: String(hits.total)
								})
							}),
							state.current !== null && dmsSliderLevels(state).length >= 2 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dms-effortFooter",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dms-effortFooterLabel",
									children: t("menu.effort")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EffortSlider, {
									state,
									select,
									t,
									onSelectFailure: markSelectFailure
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "dms-notice",
								role: "status",
								children: notice ?? ""
							})
						]
					}), document.body) : null,
					toast !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Toast, {
						text: toast.text,
						icon: toast.failed ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconWarningOutlineRegular, { size: 14 }) : void 0,
						anchor: rootRef.current?.closest("[data-composer-card]") ?? null,
						onDone: dismissToast
					}, toast.seq)
				]
			});
		}
		//#endregion
		//#region src/client/styles.ts
		/**
		* Stylesheet for the enhanced model seat.
		*
		* Injected as one `<style data-plugin="@bittersmilezzz/dsh-model-selector">` tag by the client
		* apply and removed again on unload. Class names are prefixed `dms-` so they
		* cannot collide with CSS-module hashes from other plugins. Colors come only
		* from `--dsw-*` theme tokens, matching the shipped Menu material.
		*
		* 显式 `: string` 注解：不加注解时 tsc 会把整份 CSS 推断成字面量类型并写进
		* lib/types/client/styles.d.ts（19KB 的 d.ts 只为声明一个常量），发布包里
		* 白白多出十几 KB 且每次改样式都全量重写。
		*/
		const CSS = `
.dms-root {
  position: relative;
  min-width: 0;
}
/* root 只作为焦点落点（tabIndex=-1）：不画焦点环，真正的可聚焦控件在它内部。 */
.dms-root:focus { outline: none; }

.dms-trigger {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  max-width: min(420px, calc(100vw - 48px));
  height: 28px;
  padding: 0 4px 0 8px;
  border: none;
  border-radius: 24px;
  outline: none;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font-size: 13px;
  line-height: 20px;
  font-weight: 500;
  cursor: pointer;
}
.dms-trigger:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover); }
.dms-trigger:focus-visible { box-shadow: 0 0 0 2px var(--dsw-alias-border-l3); }
.dms-trigger:disabled { color: var(--dsw-alias-label-dimmed); cursor: default; }

.dms-triggerLabel {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 20px;
}
.dms-triggerEffort {
  flex: 0 0 auto;
  line-height: 20px;
  color: var(--dsw-alias-label-caption);
}
.dms-triggerProvider {
  flex: 0 0 auto;
  max-width: 88px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--dsw-alias-label-caption);
  font-size: 11px;
  line-height: 20px;
  font-weight: 400;
}

.dms-chevron,
.dms-groupChevron {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  line-height: 0;
}
.dms-chevron {
  color: var(--dsw-alias-label-caption);
  transition: transform 120ms ease;
}
.dms-chevronOpen { transform: rotate(180deg); }
.dms-groupChevron {
  color: var(--dsw-alias-label-tertiary);
  transition: transform 120ms ease;
}
.dms-groupChevronClosed { transform: rotate(-90deg); }
.dms-model-check svg { display: block; }

.dms-menu {
  /* 官方 useAnchoredPosition 返回视口坐标：fixed 定位让它不再依赖 .dms-root
     的 padding box，免去 root 左缘减法那一层坐标系转换。 */
  position: fixed;
  /* portal 到 body 后不再受 composer 祖先层叠上下文限制。 */
  z-index: 1000;
  display: flex;
  flex-direction: column;
  width: min(280px, calc(100vw - 32px));
  overflow: hidden;
  padding: 4px 0 4px 4px;
  box-sizing: border-box;
  border: 1px solid var(--dsw-alias-border-inverted);
  border-radius: 12px;
  /* 官方 --dsw-specific-menu 是「玻璃」色：非 macOS 只有 58%（浅色）/45%（深色）
     不透明，必须靠 MenuSurface 的 backdrop blur 才不露出下层文字。本插件把菜单
     portal 到 body，没有那层 material，于是 Web/Linux profile 下正文会直接透过
     菜单（会话正文与模型行叠在一起）。这里把同一主题菜单色叠到不透明的
     bg-layer-2 上：颜色仍是主题菜单色，但背景不再随下方内容变化。
     内层浮层（status/more）和吸顶分组头继承同一个合成面，避免它们又透出列表行。 */
  --dms-surface: linear-gradient(var(--dsw-specific-menu, transparent), var(--dsw-specific-menu, transparent)), var(--dsw-alias-bg-layer-2, #fff);
  background: var(--dms-surface);
  box-shadow: var(--dsw-shadow-lv3);
  color: var(--dsw-alias-label-primary);
  animation: dms-menu-in 150ms cubic-bezier(.22,1,.36,1);
  --dsh-scrollbar-thumb: var(--dsw-alias-scrollbar-bg-l2);
  --dsh-scrollbar-thumb-hover: var(--dsw-alias-scrollbar-hover-l2);
}
.dms-menuModel { border-right: none; }
.dms-menuBelow {
  animation-name: dms-menu-in-below;
}

/* 菜单头部的「非列表」栏（loading / 空态 / 错误条 / 失败条 / 截断提示）：
   一律允许收缩（flex-shrink 1）且各自限高，让 .dms-groups 始终保住可滚动
   的最小可视高度。2026-09-21 修复的 P0：向上弹时 useAnchoredMaxHeight 会把
   maxHeight 钳到「trigger 底缘 - 12px」（底缘固定、向上生长的语义），trigger
   靠近视口顶部时该值很小；原先这些栏是 flex: 0 0 auto 完全不收缩，头部
   40-100px 全部占完后 .dms-groups 的可视高度趋近 0，而 .dms-menu 是
   overflow:hidden —— 用户看到错误条却看不到也滚不到任何模型行。
   现在给它们统一的上限（相对菜单高度）+ overflow，最坏情况是栏内自己滚动。 */
.dms-empty {
  flex: 0 1 auto;
  min-height: 0;
  max-height: 40%;
  overflow-y: auto;
  padding: 10px;
  color: var(--dsw-alias-label-tertiary);
  font-size: 13px;
  line-height: 20px;
}

/* 顶部状态条改成浮层：加载/错误提示出现或消失时不再改变菜单高度。
   菜单是向上锚定的，高度一变顶边就位移，列表会整块上下跳（桌面 App 录屏实测）。 */
.dms-status {
  position: absolute;
  z-index: 7;
  /* 放在搜索框下方：即使真的加载较久，也不会盖住输入框。 */
  top: 42px;
  left: 4px;
  right: 4px;
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--dms-surface);
  box-shadow: var(--dsw-shadow-lv3);
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
  line-height: 18px;
}

.dms-more {
  position: absolute;
  z-index: 7;
  left: 4px;
  right: 4px;
  bottom: 46px;
  max-height: 20%;
  overflow-y: auto;
  padding: 8px 12px;
  border-radius: 8px;
  background: var(--dms-surface);
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  line-height: 18px;
}

/* Provider-load failure strip: capped and scrollable so a long list of failed
   groups can never squeeze the model list out of the menu (E4). */
.dms-failures {
  position: absolute;
  z-index: 7;
  top: 4px;
  left: 4px;
  right: 4px;
  max-height: min(96px, 30%);
  overflow-y: auto;
  border-radius: 8px;
}

.dms-error,
.dms-warning {
  position: absolute;
  z-index: 7;
  top: 4px;
  left: 4px;
  right: 4px;
  max-height: 40%;
  overflow-y: auto;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  padding: 7px 8px;
  border-radius: 8px;
  background: var(--dsw-alias-interactive-bg-hover-danger);
  color: var(--dsw-alias-state-error-primary);
  font-size: 12px;
  line-height: 18px;
}
.dms-warning { position: static; }
.dms-warning {
  background: var(--dsw-alias-bg-module-platform);
  color: var(--dsw-alias-state-warn-label);
}
.dms-retry {
  flex: 0 0 auto;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: inherit;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}
.dms-retry:focus-visible { box-shadow: 0 0 0 2px var(--dsw-alias-border-l3); }

/* Search box pinned above the scrollable list. */
.dms-search {
  position: relative;
  margin-bottom: 4px;
  margin-right: 4px;
  flex: 0 0 auto;
}
.dms-searchInput {
  box-sizing: border-box;
  width: 100%;
  height: 30px;
  padding: 0 30px 0 10px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 8px;
  outline: none;
  background: var(--dsw-alias-bg-input);
  color: var(--dsw-alias-label-primary);
  font-size: 13px;
  line-height: 18px;
}
.dms-searchInput::placeholder { color: var(--dsw-alias-label-tertiary); }
.dms-searchInput:focus-visible { box-shadow: 0 0 0 2px var(--dsw-alias-border-l3); }
.dms-searchClear {
  position: absolute;
  top: 0;
  right: 0;
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--dsw-alias-label-tertiary);
  cursor: pointer;
}
.dms-searchClear:hover { color: var(--dsw-alias-label-primary); }
/* 键盘焦点此前在这三个可聚焦控件上完全隐身（上轮只补了模型行）。 */
.dms-searchClear:focus-visible {
  border-radius: 8px;
  box-shadow: 0 0 0 2px var(--dsw-alias-border-l3);
}
/* 图标组件只收 size/className，装饰性 aria-hidden 只能包一层 span；contents 让它不占布局。 */
.dms-icon-slot { display: contents; }

/* 列表区：菜单里唯一的弹性主体。max-height 被 useAnchoredMaxHeight 钳得很小
   （trigger 靠近视口顶 + 向上弹）时，32px 保底让「至少见到一行模型」始终成立
   —— 头部各栏此时按自己的 max-height 百分比上限收缩（见 .dms-status 等）。 */
.dms-groups { flex: 1 1 auto; min-height: 32px; overflow-y: auto; contain: content; }
/* 空态占位：空态播报节点在 role=menu 容器外，用与 .dms-groups 同款弹性布局
   补回列表区本来的位置（不挤压其余栏，消息也不会贴到菜单顶部）。 */
.dms-groupsFill { flex: 1 1 auto; min-height: 0; overflow-y: auto; contain: content; }
.dms-group + .dms-group { margin-top: 4px; }

/* Collapsible provider header: a full-width toggle button. */
.dms-groupHeader {
  position: sticky;
  top: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 4px;
  width: 100%;
  padding: 5px 8px 3px;
  border: none;
  outline: none;
  background: var(--dms-surface);
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  line-height: 18px;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
}
.dms-groupHeader:hover { color: var(--dsw-alias-label-primary); }
.dms-groupHeader:focus-visible { box-shadow: inset 0 0 0 2px var(--dsw-alias-border-l3); }
.dms-groupName {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dms-groupCount { flex: 0 0 auto; color: var(--dsw-alias-label-dimmed); font-weight: 400; }

.dms-nameRow {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}
.dms-badge {
  flex: 0 0 auto;
  padding: 0 6px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 999px;
  color: var(--dsw-alias-label-caption);
  font-size: 10px;
  line-height: 16px;
  font-weight: 500;
}
/* 不透明浮层：提示压在模型列表行之上，此前用 hover tint（6%~8% alpha）作底、
   secondary 作字色，菜单表面 / 列表行 / 提示三层文字互相透出，无法辨认。
   底色改用实色 overlay 面，加描边与投影分隔，文字提到 label-primary。 */
.dms-notice {
  position: absolute;
  z-index: 7;
  left: 4px;
  right: 4px;
  bottom: 46px;
  padding: 7px 10px;
  border-radius: 8px;
  background: var(--dsw-alias-bg-overlay);
  border: 1px solid var(--dsw-alias-border-l2);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.16);
  color: var(--dsw-alias-label-primary);
  font-size: 12px;
  line-height: 18px;
}
/* 常驻 live region（内容随状态更新）：空时收起，不占位。 */
.dms-notice:empty { display: none; }
.dms-effort {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  width: 100%;
  min-width: 0;
  /* 固定行高：档位名/说明文字长短不参与布局，菜单高度与滑杆位置不会跳动。 */
  height: 32px;
  color: var(--dsw-alias-label-secondary);
  user-select: none;
  box-sizing: border-box;
}
/* 档位读数：拖动时实时跟随 preview，替代此前只有读屏能看到的 aria-valuetext。 */
.dms-effort-value {
  flex: 0 0 auto;
  /* 固定槽位（min-width 4em）+ 右对齐：文字贴住行右缘，同时宽度不随档位名
     长短变化——否则拖动时轨道长度会跟着档位文字来回伸缩。4em 可完整容纳
     Medium/Xhigh；更长的本地化档位名仍可自然撑开。 */
  margin-left: 8px;
  width: auto;
  min-width: 4em;
  color: var(--dsw-static-blue-500, #3b82f6);
  font-size: 11px;
  line-height: 16px;
  text-align: right;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.dms-effort.is-max .dms-effort-value { color: #8b5cf6; }
.dms-effort-slider {
  /* 由组件写入：滑块中心位置（相对轨道），两端各留 10px（滑块半径）。 */
  --dms-thumb-left: 10px;
  position: relative;
  width: 100%;
  height: 30px;
  /* 不能用 flex-basis: 0：轨道主轴（横向）是宽度时它会被读成「主尺寸 0」，
     滑块宽度不生长，刚打开/重渲染后回跳到轨道起点。 */
  flex: 1 1 auto;
  min-width: 0;
  isolation: isolate;
  /* 常驻合成层：拖动/提交时只有本层重绘，不会波及整个 fixed 菜单
     （实机表现为松手瞬间菜单闪白）。 */
  transform: translateZ(0);
  backface-visibility: hidden;
}
/* Codex 式轨道：一条中性灰胶囊，档位点直接落在轨道上。 */
.dms-effort-track {
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  height: 20px;
  transform: translateY(-50%);
  border-radius: 999px;
  background: rgba(255, 255, 255, .10);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.05), inset 0 -1px 0 rgba(0,0,0,.30);
  overflow: hidden;
}
.dms-effort-fill {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: var(--dms-thumb-left);
  border-radius: 999px;
  background: var(--dsw-static-blue-500, #3b82f6);
  /* 不做 background 过渡：跳进/跳出最高档时只换渐变色，避免中间帧把渐变
     与底下轨道混成一片发灰/发白。 */
  transition: width 200ms cubic-bezier(.22,1,.36,1);
  overflow: hidden;
}
/* 只有最高档（Ultra/Max）换成蓝紫渐变 + 粒子；其余档位保持实心蓝、完全静止。 */
.dms-effort.is-max .dms-effort-fill {
  background: linear-gradient(90deg, var(--dsw-static-blue-500, #3b82f6) 0%, #6d5cff 55%, #a855f7 100%);
}
.dms-effort-particles {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
.dms-effort-dot {
  position: absolute;
  top: 50%;
  width: 3px;
  height: 3px;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  background: rgba(255, 255, 255, .26);
  transition: background 160ms ease;
}
.dms-effort-dot.is-on { background: rgba(255, 255, 255, .62); }
.dms-effort-knob {
  position: absolute;
  z-index: 4;
  top: 50%;
  left: var(--dms-thumb-left);
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0,0,0,.35), 0 0 0 .5px rgba(0,0,0,.08);
  transform: translate(-50%, -50%);
  transition: left 200ms cubic-bezier(.22,1,.36,1), transform 120ms ease;
  pointer-events: none;
}
.dms-effort-input {
  /* 自定义 slider 的命中层：透明 div，不参与绘制（原生 range 的白色焦点环问题
     见 ModelSelect.tsx 的说明）。 */
  position: absolute;
  z-index: 5;
  inset: -5px 0;
  width: 100%;
  height: calc(100% + 10px);
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  outline: none;
  cursor: grab;
  touch-action: none;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}
.dms-effort-input:active { cursor: grabbing; }
.dms-effort-input:focus-visible + .dms-effort-knob {
  outline: 2px solid var(--dsw-static-blue-400);
  outline-offset: 2px;
}
/* 拖动时滑块跟手，不保留上一段过渡；松手磁吸由 React 的 preview 回写照常。 */
.dms-effort.is-dragging .dms-effort-fill,
.dms-effort.is-dragging .dms-effort-knob { transition: none; }
.dms-effort.is-dragging .dms-effort-knob { transform: translate(-50%, -50%) scale(1.06); }
.dms-effort.is-error .dms-effort-slider {
  outline: 1px solid var(--dsw-alias-state-error-secondary);
  outline-offset: 2px;
}
.dms-effort-error { flex: 1 0 100%; margin-top: 8px; padding: 6px 10px; border-radius: 8px; color: var(--dsw-alias-state-error-primary, #c83e4d); background: var(--dsw-alias-state-error-tertiary, rgba(220,55,70,.08)); font-size: 11px; line-height: 1.5; }
/* 常驻容器（内容随状态更新）：空时收起，不占位。 */
.dms-effort-error:empty { display: none; }
/* 视觉隐藏工具类（SR 播报/错误原文：不占布局但可被读屏读到）。 */
.dms-sr {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
.dms-model-option {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 20px;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: 38px;
  padding: 7px 9px;
  border: 0;
  border-radius: 9px;
  color: inherit;
  background: transparent;
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.dms-model-option:hover { background: var(--dsw-alias-fill-tertiary, rgba(120,125,140,.09)); }
.dms-model-option-copy { min-width: 0; }
.dms-model-option-name { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; }
/* 搜索命中片段：名称内标下划线（命中描述/供应商时不标，见 nameHit）。 */
.dms-hit {
  text-decoration: underline;
  text-decoration-color: var(--dsw-static-blue-400, #4d70ff);
  text-decoration-thickness: 2px;
  text-underline-offset: 3px;
}
.dms-model-option-desc { display: block; margin-top: 3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--dsw-alias-label-tertiary, #9296a0); font-size: 10px; }
.dms-model-check { color: var(--dsw-static-deepseek-500, #4d70ff); font-size: 15px; text-align: center; }
/* 方向键导航把焦点落在选项上。选中态是「背景 + 加粗 + 勾号」，悬停是「背景」，
   两者与焦点指示必须两两可辨 —— 只用同一个 hover 背景 token 会让「焦点落在
   选中行上」完全不可见（roving 的默认落点恰恰优先选中行）。 */
.dms-model-option:focus-visible {
  background: var(--dsw-alias-interactive-bg-hover);
  box-shadow: inset 0 0 0 2px var(--dsw-alias-border-l3);
}
/* 当前选中行：仅靠勾号不足以在密集列表里定位。 */
.dms-model-optionSelected { background: var(--dsw-alias-interactive-bg-hover); }
.dms-model-optionSelected .dms-model-option-name { font-weight: 600; }
/* select 进行中：官方以 disabled 变灰表达，这里用 aria-busy 驱动同样的视觉、
   不夺键盘焦点（aria-disabled 保连续性，见 ModelOption）。aria-busy 挂在
   role=menu/listbox 容器上（.dms-groups）—— 挂在外层 .dms-menu 会罩住
   live region、压制其播报。 */
/* 只有「换模型」压灰列表；aria-busy 仍保留给读屏，但 loading / effort 提交不再
   触发整片变灰（松手瞬间的明暗闪动来自这里）。 */
.dms-groups[data-model-switch="true"] .dms-model-option { color: var(--dsw-alias-label-dimmed); }
/* 搜索结果里的供应商标是区分跨供应商同名模型的唯一线索，之前无任何样式。 */
.dms-model-option-provider {
  display: block;
  margin-top: 2px;
  overflow: hidden;
  color: var(--dsw-alias-label-dimmed, #9296a0);
  font-size: 10px;
  line-height: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
@keyframes dms-menu-in {
  from { opacity: 0; transform: translateY(5px) scale(.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes dms-menu-in-below {
  from { opacity: 0; transform: translateY(-5px) scale(.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
body:not([data-ds-dark-theme]) .dms-effort-track {
  background: #e9e9e9;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.65);
}
body:not([data-ds-dark-theme]) .dms-effort-dot { background: rgba(0,0,0,.18); }
body:not([data-ds-dark-theme]) .dms-effort-dot.is-on { background: rgba(255,255,255,.78); }
body:not([data-ds-dark-theme]) .dms-effort-knob {
  box-shadow: 0 1px 3px rgba(0,0,0,.22), 0 0 0 .5px rgba(0,0,0,.06);
}
@media (prefers-reduced-motion: reduce) {
  .dms-chevron,
  .dms-groupChevron,
  .dms-effort-fill,
  .dms-effort-dot,
  .dms-effort-knob { transition: none; }
  .dms-menu { animation: none; }
}

/* Inline effort footer pinned below the scrollable model list (single-pane
   menu: switching models and adjusting effort both live in one surface). */
.dms-effortFooter {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 4px 4px 0 0;
  padding: 6px 10px;
  border-top: 1px solid var(--dsw-alias-border-l2);
}
.dms-effortFooterLabel {
  flex: 0 0 auto;
  color: var(--dsw-alias-label-tertiary);
  font-size: 11px;
  line-height: 18px;
  white-space: nowrap;
}
.dms-effortFooter .dms-effort { flex: 1 1 auto; min-width: 0; }

`;
		//#endregion
		//#region src/client/index.ts
		/** Dictionary namespace owned by this plugin. */
		const NS = "modelSelector";
		/**
		* 座位优先级。ui-conversation 把 `conversation.input.model` 声明为 kind 'single'
		* （单槽按 priority 升序取最低者渲染），官方占用者
		* （@deepseek-ai/dsh-client-ui-model-selection）注册时不传 priority（即默认 0），
		* 故 -1 恒胜出。**改这个值等于静默换回官方 UI** —— test/plugin-contract.test.mjs
		* 直接断言本常量（而不是扫源码文本，那样一行注释就能骗过它），注册处也不许再写裸字面量。
		*/
		const SEAT_PRIORITY = -1;
		/** Required services: the registry, session lookup, locale, the slot seat, and the model directory's Remote faces. */
		const inject = [
			"slots",
			"sessions",
			"locale",
			"modelDirectories",
			"remote",
			"remote.session"
		];
		/**
		* Client plugin body: register the dictionaries and stylesheet, then take the
		* model seat over the shared directory once `modelDirectories` appears.
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "dsh-model-selector: dictionaries");
			ctx.effect(() => {
				const tag = document.createElement("style");
				tag.dataset.plugin = "@bittersmilezzz/dsh-model-selector";
				tag.textContent = CSS;
				document.head.appendChild(tag);
				return () => {
					tag.remove();
				};
			}, "dsh-model-selector: styles");
			ctx.inject(["modelDirectories"], (scope) => {
				const models = scope.modelDirectories;
				const sessions = scope.sessions;
				scope.slots.inject("conversation.input.model", () => scope.slots.register({
					name: "conversation.input.model",
					locale: NS,
					priority: -1,
					inject: (sessionId) => {
						const sid = sessionId;
						const directory = models.directoryFor(sid);
						const available = sessions.subagentAddress(sid) === void 0;
						return {
							available,
							directory: directory.store,
							load: () => {
								if (available) directory.load().catch((error) => {
									console.warn("[dsh-model-selector] directory.load failed:", error);
								});
							},
							select: (selection) => available ? directory.select(selection) : Promise.resolve(void 0)
						};
					}
				}, ModelSelect));
			});
		}
		//#endregion
		exports.SEAT_PRIORITY = SEAT_PRIORITY;
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
		/* __DMS_SRC_HASH__ = "9f51689599be72d2b4f6c3203bb2c62cf499a5f84ad61d9826eac2b5dbadab93" */	}
});

//# sourceMappingURL=client.js.map