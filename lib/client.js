window.__ModuleLoader__.load({
	id: "dsh-model-selector",
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
		*/
		function dmsEffortBusy(committing, status) {
			return committing || status === "selecting";
		}
		/**
		* 超时回滚后 select 迟到成功是否应采纳并同步 UI：
		* 只有当自回滚以来没有任何新的提交改写 committedRef（仍等于回滚前的档位）、
		* 提交纪元未推进（epoch === epochAtCommit，即期间没有发起过新提交——提交失败
		* 回滚后 committedRef 会回到与上一轮回滚相同的值，值比较无法区分「无新提交」
		* 与「新提交失败回滚」，纪元才能区分）、且当前无拖动/提交在途时，迟到结果才
		* 仍对应当前唯一的意图链——此时 UI 处于「回滚但后端已生效」的错位态，应补
		* 一次同步而不是保持回滚。否则以新操作链为准。
		*/
		function dmsShouldAdoptLateSuccess(committed, previous, dragging, committing, epoch, epochAtCommit) {
			return committed === previous && epoch === epochAtCommit && !dragging && !committing;
		}
		//#endregion
		//#region src/client/effortCanvas.ts
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
		/** 拖动时辐射推挤的缓动系数（越小越跟手），非拖拽时回弹系数。 */
		const DRAG_EASE = .55;
		const IDLE_EASE = .12;
		const SETTLE_EPSILON = .002;
		/**
		* 纯绘制：把滑块进度画成拖尾辐射（列能量 + 径向光晕 + 粒子流 + 热核光斑）。
		* 全部可变量（尺寸、相位、进度、拖拽态、深浅色）都来自参数——无模块级状态。
		*/
		function dmsDrawRadiation(context, width, height, time, state, isDark) {
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
				const delta = x + cell * .5 - origin;
				const distance = Math.abs(delta);
				const phaseA = distance / 10 - time * .0074 * speed;
				const phaseB = distance / 23 - time * .0041 * speed + 1.7;
				const phaseC = distance / 40 - time * .0022 * speed + 3.4;
				const sinA = Math.max(0, Math.sin(phaseA));
				const sinB = Math.max(0, Math.sin(phaseB));
				const sinC = Math.max(0, Math.sin(phaseC));
				const waveA = Math.pow(sinA, 2.6);
				const waveB = Math.pow(sinB, 3.2);
				const waveC = Math.pow(sinC, 4);
				const crest = Math.pow(sinA, 15) + Math.pow(sinB, 18) * .78;
				const wave = Math.min(1, waveA * .76 + waveB * .58 + waveC * .32);
				const trail = .38 + .62 * Math.exp(-distance / 90);
				const pillar = Math.pow(Math.max(0, Math.sin(x / 20 + time * .0016)), 3) * .27;
				const columnEnergy = trail * (wave * 1.04 + pillar + crest * .32);
				if (columnEnergy > .012) {
					const nearness = Math.max(0, 1 - distance / 140);
					context.fillStyle = `rgba(${isDark ? Math.round(42 + 124 * nearness + 75 * wave) : Math.round(28 + 58 * nearness + 15 * wave)}, ${isDark ? Math.round(56 + 58 * nearness + 44 * crest) : Math.round(88 + 72 * nearness + 30 * crest)}, ${isDark ? Math.round(175 + 72 * nearness + 8 * wave) : Math.round(182 + 62 * nearness)}, ${isDark ? Math.min(.88, columnEnergy * .72) : Math.min(.62, columnEnergy * .54)})`;
					context.fillRect(x, 0, 3, height);
				}
				for (let y = 0; y < height; y += cell) {
					const deltaY = y + cell * .5 - height * .5;
					const radial = Math.hypot(delta / 38, deltaY / 11);
					const halo = Math.exp(-radial * .96) * 1.08;
					const verticalShape = .58 + .42 * Math.cos(deltaY / height * Math.PI);
					const grain = .72 + .28 * Math.sin(x * .73 + y * 1.31 + time * .006);
					const alpha = Math.min(.96, (columnEnergy * .88 + halo + crest * .19) * verticalShape * grain);
					if (alpha < .035) continue;
					const hot = Math.max(0, 1 - radial / 2.4);
					context.fillStyle = `rgba(${isDark ? Math.round(54 + 148 * hot + 42 * wave + 35 * crest) : Math.round(25 + 72 * hot + 12 * wave)}, ${isDark ? Math.round(68 + 78 * hot + 46 * crest) : Math.round(98 + 72 * hot + 24 * crest)}, ${isDark ? Math.round(186 + 64 * hot) : Math.round(194 + 56 * hot)}, ${isDark ? alpha : alpha * .72})`;
					context.fillRect(x, y, 3, 3);
				}
			}
			for (let i = 0; i < 14; i += 1) {
				const particleX = origin - (time * (state.dragging ? .16 : .065) * (.78 + i % 5 * .09) + i * 23) % Math.max(30, origin + 64);
				if (particleX < -24 || particleX > width + 16) continue;
				const particleY = 3 + (i * 13 + Math.sin(time * .003 + i) * 5) % Math.max(7, height - 6);
				const length = 4 + i % 4 * 4 + (state.dragging ? 6 : 0);
				const alpha = .28 + i % 5 * .1;
				const streak = context.createLinearGradient(particleX, 0, particleX + length, 0);
				streak.addColorStop(0, isDark ? "rgba(72,118,255,0)" : "rgba(24,94,184,0)");
				streak.addColorStop(.68, isDark ? `rgba(112,135,255,${alpha})` : `rgba(36,108,202,${alpha * .72})`);
				streak.addColorStop(1, isDark ? `rgba(236,222,255,${Math.min(1, alpha + .26)})` : `rgba(103,175,248,${Math.min(.82, alpha + .18)})`);
				context.fillStyle = streak;
				context.fillRect(particleX, particleY, length, i % 3 === 0 ? 2 : 1);
			}
			const glow = context.createRadialGradient(origin, height / 2, 0, origin, height / 2, 24);
			glow.addColorStop(0, isDark ? "rgba(255,255,255,.82)" : "rgba(255,255,255,.86)");
			glow.addColorStop(.14, isDark ? "rgba(183,190,255,.54)" : "rgba(162,210,255,.48)");
			glow.addColorStop(.44, isDark ? "rgba(103,74,255,.28)" : "rgba(37,112,207,.22)");
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
		function useEffortCanvas(canvasRef, radiationRef) {
			const redrawRef = react.useRef(null);
			react.useEffect(() => {
				const canvas = canvasRef.current;
				if (canvas === null) return;
				const context = canvas.getContext("2d");
				if (context === null) return;
				const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
				let width = 1;
				let height = 1;
				let frame = 0;
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
				const draw = () => {
					const r = radiationRef.current;
					if (r.target !== void 0) {
						const k = r.dragging ? DRAG_EASE : IDLE_EASE;
						r.progress += (r.target - r.progress) * k;
						if (Math.abs(r.target - r.progress) < SETTLE_EPSILON) r.progress = r.target;
					}
					const isDark = document.body.hasAttribute("data-ds-dark-theme");
					dmsDrawRadiation(context, width, height, phase, r, isDark);
					if (r.dragging) return false;
					return r.target !== void 0 && Math.abs(r.target - r.progress) > SETTLE_EPSILON;
				};
				const loop = (time) => {
					if (lastFrameAt !== 0) phase += time - lastFrameAt;
					lastFrameAt = time;
					if (draw() && !document.hidden) frame = window.requestAnimationFrame(loop);
					else {
						frame = 0;
						lastFrameAt = 0;
					}
				};
				const redraw = () => {
					if (reducedMotion.matches) {
						draw();
						return;
					}
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
				const resolutionQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
				const onResolutionChange = () => {
					resize();
					draw();
				};
				if (resolutionQuery.addEventListener !== void 0) resolutionQuery.addEventListener("change", onResolutionChange);
				else resolutionQuery.addListener(onResolutionChange);
				resizeObserver.observe(canvas);
				themeObserver.observe(document.body, {
					attributes: true,
					attributeFilter: ["data-ds-dark-theme"]
				});
				document.addEventListener("visibilitychange", onVisibility);
				redrawRef.current = redraw;
				resize();
				const r = radiationRef.current;
				if (r.target !== void 0) r.progress = r.target;
				draw();
				if (!reducedMotion.matches && !document.hidden) frame = window.requestAnimationFrame(loop);
				return () => {
					window.cancelAnimationFrame(frame);
					resizeObserver.disconnect();
					themeObserver.disconnect();
					if (resolutionQuery.removeEventListener !== void 0) resolutionQuery.removeEventListener("change", onResolutionChange);
					else resolutionQuery.removeListener(onResolutionChange);
					document.removeEventListener("visibilitychange", onVisibility);
					redrawRef.current = null;
				};
			}, [canvasRef, radiationRef]);
			return react.useCallback(() => redrawRef.current?.(), []);
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
				if (!pointerActiveRef.current) return;
				if (pointerId !== void 0 && activePointerIdRef.current !== pointerId) return;
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
				if (activePointerIdRef.current !== pointerId) return;
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
			}, []);
			return {
				dragging,
				draggingRef,
				handlers: {
					onPointerDown: (event) => {
						if (!callbacksRef.current.canStart()) return;
						event.preventDefault();
						event.currentTarget.focus();
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
		/** 向下弹时按 trigger 下方空间钳位菜单高度（top-anchored，不能复用向上弹的 fit）。 */
		function dmsBelowMaxHeight(triggerBottom, viewportHeight, cap) {
			return Math.max(0, Math.min(cap, viewportHeight - triggerBottom - 12));
		}
		/**
		* 菜单水平钳位：默认右锚定（right:0，与 seat 右缘对齐）；seat 右缘左侧放不下
		* 整幅菜单（seat 靠输入区左下 + 窄窗口）、或 seat 右缘本身已越出视口右缘
		* （页面横向溢出/缩放时 rect.right 可大于 innerWidth，右锚定会把整幅菜单
		* 拖出屏外）时，返回钳到视口内的 left 值，调用方改用 left 锚定。
		* 返回 undefined 表示保持默认右锚定。
		* menuWidth 传菜单实际渲染宽度（offsetWidth），与 CSS `min(280px, 100vw-32px)` 解耦。
		*/
		function dmsMenuLeft(rootRight, menuWidth, viewportWidth, margin) {
			if (rootRight - menuWidth >= margin && rootRight <= viewportWidth - margin) return void 0;
			return Math.min(Math.max(margin, rootRight - menuWidth), Math.max(margin, viewportWidth - margin - menuWidth));
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
		const IconChevronDown = /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, {});
		const IconCheck = /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCheckOutline14, {});
		const IconClear = /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseFill14, {});
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
		const EffortSlider = react.memo(function EffortSlider({ state, select, t }) {
			const levels = dmsSliderLevels(state);
			const [effort, setEffort] = react.useState(() => levels[dmsEffectiveEffortIndex(levels, state)]?.id ?? "");
			const [preview, setPreview] = react.useState(() => dmsEffectiveEffortIndex(levels, state));
			const [committing, setCommitting] = react.useState(false);
			const [localError, setLocalError] = react.useState(null);
			const canvasRef = react.useRef(null);
			const inputRef = react.useRef(null);
			const committedRef = react.useRef("");
			const committingRef = react.useRef(false);
			const previewRef = react.useRef(0);
			const draggingRef = react.useRef(false);
			const commitTimerRef = react.useRef(null);
			const mountedRef = react.useRef(false);
			const commitEpochRef = react.useRef(0);
			const radiationRef = react.useRef({
				progress: levels.length >= 2 ? dmsEffectiveEffortIndex(levels, state) / (levels.length - 1) : .5,
				dragging: false
			});
			const redrawRef = react.useRef(null);
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
			}, [
				available,
				levels.length,
				state.current?.provider,
				state.current?.model,
				state.current?.reasoningEffort
			]);
			react.useEffect(() => {
				previewRef.current = preview;
				radiationRef.current.target = levels.length >= 2 ? preview / (levels.length - 1) : .5;
				redrawRef.current?.();
			}, [preview, levels.length]);
			const redraw = useEffortCanvas(canvasRef, radiationRef);
			react.useEffect(() => {
				redrawRef.current = redraw;
				return () => {
					redrawRef.current = null;
				};
			}, [redraw]);
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
				if (dmsEffortBusy(committingRef.current, state.status)) return;
				const index = dmsClampIndex(raw, levels.length);
				const next = levels[index]?.id;
				if (next === void 0 || next === committedRef.current) return;
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
					if (!await new Promise((resolve, reject) => {
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
						}).then((accepted) => {
							if (settled) {
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
						}, (cause) => {
							if (settled) return;
							settled = true;
							window.clearTimeout(timer);
							commitTimerRef.current = null;
							reject(cause);
						});
					})) throw new Error(t("effort.failed"));
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
			}, [
				levels,
				select,
				state,
				t
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
				radiationRef.current.dragging = dragging;
				redrawRef.current?.();
			}, [dragging]);
			const onKeyDown = (event) => {
				const current = dmsClampIndex(Number(event.currentTarget.value), levels.length);
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
			const style = { "--dms-progress": `${preview / (count - 1) * 100}%` };
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: `dms-effort${dragging ? " is-dragging" : ""}${busy ? " is-busy" : ""}${error === null ? "" : " is-error"}`,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dms-effort-slider",
						style,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "dms-effort-track",
								"aria-hidden": "true"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dms-effort-fx",
								"aria-hidden": "true",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("canvas", {
									ref: canvasRef,
									className: "dms-effort-canvas"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "dms-effort-flare" })]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								ref: inputRef,
								className: "dms-effort-input",
								type: "range",
								min: "0",
								max: count - 1,
								step: "0.01",
								value: preview,
								"aria-disabled": busy,
								"aria-label": t("menu.effort"),
								"aria-valuetext": effortName,
								onChange: (event) => {
									const raw = Number(event.currentTarget.value);
									showPointerPreview(raw);
								},
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
						children: effortName
					}),
					effortDesc === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dms-effort-desc",
						children: effortDesc
					}),
					error === null ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dms-sr",
						role: "status",
						children: error
					}),
					error === null ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dms-effort-error",
						children: error
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
		const ModelOption = react.memo(function ModelOption({ group, model, showProvider, selected, busy, rowKey, nameHit, t, onChoose }) {
			const hit = nameHit === void 0 || nameHit === null || nameHit.start === nameHit.end ? null : [
				model.name.slice(0, nameHit.start),
				model.name.slice(nameHit.start, nameHit.end),
				model.name.slice(nameHit.end)
			];
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
				type: "button",
				role: "menuitemradio",
				"aria-checked": selected,
				"data-row-key": rowKey,
				className: `dms-model-option${selected ? " dms-model-optionSelected" : ""}`,
				title: model.description === void 0 ? model.name : `${model.name} — ${model.description}`,
				"aria-disabled": busy,
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
			if (prev.busy !== next.busy) return false;
			if (prev.rowKey !== next.rowKey) return false;
			if (prev.t !== next.t) return false;
			if (prev.onChoose !== next.onChoose) return false;
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
			const lastActionRef = react.useRef("load");
			const rootRef = react.useRef(null);
			const triggerRef = react.useRef(null);
			const searchRef = react.useRef(null);
			const lastLoadRef = react.useRef(0);
			const id = react.useId();
			const choices = react.useMemo(() => state.groups.flatMap((group) => group.models.map((model) => ({
				group,
				model,
				haystack: `${model.name}\n${model.description ?? ""}\n${group.name}\n${model.id}\n${group.id}`.toLowerCase(),
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
			const effortLabel = reasoning === void 0 ? void 0 : effectiveEffort === void 0 ? t("effort.providerDefault") : reasoning.efforts.find((level) => level.id === effectiveEffort)?.name ?? effectiveEffort;
			const busy = state.status === "selecting";
			const normalized = query.trim().toLowerCase();
			const hits = react.useMemo(() => {
				if (normalized === "") return null;
				const items = [];
				let total = 0;
				for (const choice of choices) {
					if (!choice.haystack.includes(normalized)) continue;
					total += 1;
					if (items.length >= MAX_VISIBLE_HITS) continue;
					let nameHit = null;
					const at = choice.model.name.toLowerCase().indexOf(normalized);
					if (at >= 0) nameHit = {
						start: at,
						end: at + normalized.length
					};
					items.push({
						group: choice.group,
						model: choice.model,
						nameHit
					});
				}
				return {
					items,
					total
				};
			}, [choices, normalized]);
			const reload = react.useCallback(() => {
				lastActionRef.current = "load";
				lastLoadRef.current = Date.now();
				load();
			}, [load]);
			react.useEffect(() => {
				if (available) {
					if (Date.now() - lastLoadRef.current < DIRECTORY_STALE_MS && state.status === "ready" && state.groups.length > 0) return;
					lastActionRef.current = "load";
					lastLoadRef.current = Date.now();
					load();
				}
			}, [available, load]);
			const menuRef = react.useRef(null);
			const menuMaxHeight = (0, _deepseek_ai_dsh_client_ui_primitives.useAnchoredMaxHeight)(menuRef, 420, open);
			const [belowMaxHeight, setBelowMaxHeight] = react.useState(420);
			const [menuLeft, setMenuLeft] = react.useState(void 0);
			react.useLayoutEffect(() => {
				if (!open) return;
				const measure = () => {
					const trigger = triggerRef.current;
					if (trigger === null) return;
					const rect = trigger.getBoundingClientRect();
					setMenuAbove(dmsMenuAbove(rect.top, rect.bottom, window.innerHeight));
					setBelowMaxHeight(dmsBelowMaxHeight(rect.bottom, window.innerHeight, 420));
					const menuWidth = menuRef.current?.offsetWidth ?? 0;
					setMenuLeft(dmsMenuLeft(rect.right, menuWidth, window.innerWidth, 12));
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
			react.useEffect(() => {
				if (!open) return;
				searchRef.current?.focus();
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
				state.current,
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
			const close = react.useCallback((restoreFocus = false) => {
				setOpen(false);
				setNotice(null);
				setQuery("");
				if (restoreFocus) queueMicrotask(() => {
					triggerRef.current?.focus();
				});
			}, []);
			const dismissOnOutsidePointer = react.useCallback(() => {
				close();
			}, [close]);
			(0, _deepseek_ai_dsh_client_ui_primitives.useDismissOnOutsidePointer)(rootRef, open, dismissOnOutsidePointer);
			const choose = react.useCallback((selection) => {
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
				const autoRaised = effort !== void 0 && effort !== target?.model.reasoning?.defaultEffort;
				const autoName = target?.model.reasoning?.efforts.find((level) => level.id === effort)?.name ?? effort ?? "";
				(async () => {
					try {
						if (!await new Promise((resolve, reject) => {
							let settled = false;
							const timer = window.setTimeout(() => {
								if (settled) return;
								settled = true;
								reject(new Error(t("notice.selectFailed")));
							}, EFFORT_COMMIT_TIMEOUT_MS);
							select(full).then((ok) => {
								if (settled) return;
								settled = true;
								window.clearTimeout(timer);
								resolve(ok);
							}, (cause) => {
								if (settled) return;
								settled = true;
								window.clearTimeout(timer);
								reject(cause);
							});
						})) {
							const message = directory.getSnapshot().error;
							showToast(message !== null ? t("error.action", { message }) : t("notice.selectFailed"));
							return;
						}
						if (rootRef.current !== null) {
							close(true);
							if (autoRaised) showToast(t("toast.effortAuto", { effort: autoName }), false);
						}
					} catch {
						showToast(t("notice.selectFailed"));
					}
				})();
			}, [
				busy,
				state.current,
				choices,
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
				const active = items.findIndex((item) => item === document.activeElement);
				items[((active < 0 ? offset > 0 ? -1 : 0 : active) + offset + items.length) % items.length]?.focus();
			};
			const focusEdge = (last) => {
				const items = menuRef.current?.querySelectorAll("[data-row-key]");
				if (items === void 0 || items.length === 0) return;
				(last ? items[items.length - 1] : items[0])?.focus();
			};
			const onRootKeyDown = (event) => {
				if (event.nativeEvent.isComposing) return;
				const target = event.target;
				if (event.key === "Escape" && open) {
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
					event.preventDefault();
					moveFocus(event.key === "ArrowDown" ? 1 : -1);
					return;
				}
				if ((event.key === "Home" || event.key === "End") && !(target instanceof HTMLInputElement)) {
					event.preventDefault();
					focusEdge(event.key === "End");
					return;
				}
				if (event.key === "Enter" && fromSearch) {
					if (hits !== null && hits.items.length > 0) {
						event.preventDefault();
						const first = hits.items[0];
						choose({
							provider: first.group.id,
							model: first.model.id
						});
					}
				}
			};
			const onBlur = (event) => {
				if (busy) return;
				const related = event.relatedTarget;
				if (related instanceof Node) {
					if (rootRef.current?.contains(related)) return;
					close();
					return;
				}
				close();
			};
			const waiting = state.current === null && state.status === "loading";
			const modelLabel = currentChoice?.model.name ?? (waiting ? t("trigger.loading") : state.current === null ? t("trigger.fallback") : `${state.current.provider}/${state.current.model}`);
			const providerLabel = currentChoice?.group.name;
			const triggerLabel = effortLabel === void 0 ? modelLabel : `${modelLabel} · ${effortLabel}`;
			const triggerTitle = providerLabel === void 0 ? triggerLabel : `${providerLabel} · ${triggerLabel}`;
			const triggerAria = waiting ? t("trigger.loading") : currentChoice === void 0 ? state.current === null ? t("trigger.selectAria") : t("trigger.aria", { model: `${state.current.provider}/${state.current.model}` }) : effortLabel === void 0 ? t("trigger.aria", { model: providerLabel === void 0 ? modelLabel : `${providerLabel} ${modelLabel}` }) : t("trigger.ariaEffort", {
				model: providerLabel === void 0 ? modelLabel : `${providerLabel} ${modelLabel}`,
				effort: effortLabel
			});
			const renderErrorStrip = () => {
				if (state.error !== null && lastActionRef.current === "load") return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dms-error",
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
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				ref: rootRef,
				className: "dms-root",
				onKeyDown: onRootKeyDown,
				onBlur,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						ref: triggerRef,
						type: "button",
						className: "dms-trigger",
						"aria-label": triggerAria,
						"aria-haspopup": "menu",
						"aria-expanded": open,
						"aria-controls": open ? `${id}-menu` : void 0,
						title: triggerTitle,
						disabled: locked,
						onClick: () => open ? close() : show(),
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dms-triggerLabel",
								children: modelLabel
							}),
							providerLabel !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dms-triggerProvider",
								children: providerLabel
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
					open ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						id: `${id}-menu`,
						ref: menuRef,
						style: {
							maxHeight: menuAbove ? menuMaxHeight : belowMaxHeight,
							...menuLeft === void 0 ? null : {
								left: menuLeft,
								right: "auto"
							}
						},
						className: "dms-menu dms-menuModel" + (menuAbove ? "" : " dms-menuBelow"),
						"aria-busy": state.status === "loading" || busy,
						children: [
							state.status === "loading" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "dms-status",
								children: t("status.loading")
							}),
							renderErrorStrip(),
							state.failures.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "dms-failures",
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
									"aria-controls": `${id}-groups`,
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
							hits !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dms-sr",
								role: "status",
								children: t("search.status", { count: String(hits.total) })
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dms-groups",
								id: `${id}-groups`,
								role: "menu",
								"aria-label": t("menu.aria"),
								children: [hits !== null ? hits.items.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: "dms-empty",
									role: "status",
									children: t("search.noMatch", { query: query.trim() })
								}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [hits.items.map((hit) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ModelOption, {
									group: hit.group,
									model: hit.model,
									showProvider: true,
									selected: state.current?.provider === hit.group.id && state.current.model === hit.model.id,
									busy,
									rowKey: `${hit.group.id}\u0000${hit.model.id}`,
									nameHit: hit.nameHit,
									t,
									onChoose: choose
								}, `${hit.group.id}\u0000${hit.model.id}`)), hits.total > MAX_VISIBLE_HITS && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: "dms-more",
									role: "note",
									children: t("search.more", {
										shown: String(MAX_VISIBLE_HITS),
										total: String(hits.total)
									})
								})] }) : state.groups.map((group) => {
									const headingId = `${id}-${group.id}`;
									const isCollapsed = collapsed.has(group.id);
									return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
										"data-group-id": group.id,
										role: "group",
										"aria-labelledby": headingId,
										className: "dms-group",
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
											type: "button",
											role: "menuitem",
											className: "dms-groupHeader",
											"aria-expanded": !isCollapsed,
											"aria-label": t("group.toggleAria", {
												name: group.name,
												count: String(group.models.length)
											}),
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
										}), !isCollapsed && group.models.map((model) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ModelOption, {
											group,
											model,
											showProvider: false,
											selected: state.current?.provider === group.id && state.current.model === model.id,
											busy,
											rowKey: `${group.id}\u0000${model.id}`,
											t,
											onChoose: choose
										}, `${group.id}\u0000${model.id}`))]
									}, group.id);
								}), hits === null && state.status === "ready" && choices.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: "dms-empty",
									role: "status",
									children: t("empty.models")
								})]
							}),
							state.current !== null && dmsSliderLevels(state).length >= 2 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dms-effortFooter",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dms-effortFooterLabel",
									children: t("menu.effort")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EffortSlider, {
									state,
									select,
									t
								})]
							}),
							notice !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "dms-notice",
								role: "status",
								children: notice
							})
						]
					}) : null,
					toast !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Toast, {
						text: toast.text,
						icon: toast.failed ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconWarningOutline16, {}) : void 0,
						anchor: rootRef.current?.closest("[data-composer-card]") ?? null,
						onDone: () => {
							setToast(null);
						}
					}, toast.seq)
				]
			});
		}
		//#endregion
		//#region src/client/styles.ts
		/**
		* Stylesheet for the enhanced model seat.
		*
		* Injected as one `<style data-plugin="dsh-model-selector">` tag by the client
		* apply and removed again on unload. Class names are prefixed `dms-` so they
		* cannot collide with CSS-module hashes from other plugins. Colors come only
		* from `--dsw-*` theme tokens, matching the shipped Menu material.
		*/
		const CSS = `
.dms-root {
  position: relative;
  min-width: 0;
}

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
  position: absolute;
  right: 0;
  bottom: calc(100% + 8px);
  z-index: 20;
  display: flex;
  flex-direction: column;
  width: min(280px, calc(100vw - 32px));
  overflow: hidden;
  padding: 4px 0 4px 4px;
  box-sizing: border-box;
  border: 1px solid var(--dsw-alias-border-inverted);
  border-radius: 12px;
  background: var(--dsw-specific-menu);
  box-shadow: var(--dsw-shadow-lv3);
  color: var(--dsw-alias-label-primary);
  animation: dms-menu-in 150ms cubic-bezier(.22,1,.36,1);
  --dsh-scrollbar-thumb: var(--dsw-alias-scrollbar-bg-l2);
  --dsh-scrollbar-thumb-hover: var(--dsw-alias-scrollbar-hover-l2);
}
.dms-menuModel { border-right: none; }
.dms-menuBelow {
  bottom: auto;
  top: calc(100% + 8px);
  animation-name: dms-menu-in-below;
}

.dms-status,
.dms-empty {
  flex: 0 0 auto;
  padding: 10px;
  color: var(--dsw-alias-label-tertiary);
  font-size: 13px;
  line-height: 20px;
}

.dms-more {
  flex: 0 0 auto;
  padding: 8px 12px;
  border-top: 1px solid var(--dsw-alias-border-l1, transparent);
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  line-height: 18px;
}

/* Provider-load failure strip: capped and scrollable so a long list of failed
   groups can never squeeze the model list out of the menu (E4). */
.dms-failures {
  flex: 0 0 auto;
  max-height: 96px;
  min-height: 0;
  overflow-y: auto;
}

.dms-error,
.dms-warning {
  flex: 0 0 auto;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
  padding: 7px 8px;
  border-radius: 8px;
  background: var(--dsw-alias-interactive-bg-hover-danger);
  color: var(--dsw-alias-state-error-primary);
  font-size: 12px;
  line-height: 18px;
}
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

.dms-groups { flex: 1 1 auto; min-height: 0; overflow-y: auto; contain: content; }
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
  background: var(--dsw-specific-menu);
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
.dms-notice {
  flex: 0 0 auto;
  margin: 4px 0 0;
  padding: 6px 10px;
  border-radius: 8px;
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
  line-height: 18px;
}
.dms-effort {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  width: 100%;
  min-width: 0;
  min-height: 32px;
  color: var(--dsw-alias-label-secondary);
  user-select: none;
  box-sizing: border-box;
}
/* 档位读数：拖动时实时跟随 preview，替代此前只有读屏能看到的 aria-valuetext。 */
.dms-effort-value {
  flex: 0 0 auto;
  margin-left: 8px;
  min-width: 3.2em;
  color: var(--dsw-alias-label-primary);
  font-size: 11px;
  line-height: 16px;
  text-align: right;
}
/* 官方契约的 efforts[].description，整行展示在滑杆下方。 */
.dms-effort-desc {
  flex: 1 0 100%;
  margin-top: 2px;
  color: var(--dsw-alias-label-tertiary);
  font-size: 10px;
  line-height: 14px;
}
.dms-effort-slider {
  --dms-progress: 50%;
  position: relative;
  width: 100%;
  height: 30px;
  flex: 1 1 0;
  min-width: 0;
  border-radius: 999px;
  isolation: isolate;
  transition: filter 180ms ease;
}
.dms-effort-track {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: inherit;
  background: linear-gradient(100deg, #03040a 0%, #071126 22%, #101d4c 45%, #302262 70%, #5d35a0 100%);
  box-shadow:
    inset 0 1px 0 rgba(189, 199, 255, .15),
    inset 0 -1px 0 rgba(0, 0, 0, .55),
    0 3px 10px rgba(12, 17, 55, .34);
}
.dms-effort-track::after {
  content: "";
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 18% 45%, rgba(82, 130, 255, .12), transparent 24%),
    linear-gradient(90deg, rgba(0, 0, 0, .28), transparent 42%, rgba(168, 113, 255, .12));
  pointer-events: none;
}
.dms-effort-fx {
  position: absolute;
  z-index: 1;
  inset: 0;
  overflow: hidden;
  border-radius: inherit;
  pointer-events: none;
}
.dms-effort-canvas {
  position: absolute;
  z-index: 2;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 1;
  image-rendering: pixelated;
  mix-blend-mode: screen;
  transition: filter 140ms ease;
}
.dms-effort-flare {
  position: absolute;
  z-index: 3;
  transition: left 70ms linear, filter 140ms ease;
  top: 50%;
  left: var(--dms-progress);
  width: 78px;
  height: 46px;
  border-radius: 50%;
  background: radial-gradient(ellipse at 100% 50%, rgba(255,255,255,.96) 0 4%, rgba(188,189,255,.8) 11%, rgba(106,87,255,.5) 28%, rgba(105,31,255,.2) 49%, transparent 74%);
  filter: blur(2px) saturate(1.25);
  mix-blend-mode: screen;
  transform: translate(-100%, -50%);
  pointer-events: none;
}
.dms-effort-flare::before,
.dms-effort-flare::after {
  content: "";
  position: absolute;
  inset: 50% auto auto 100%;
  border-radius: 999px;
  transform: translate(-50%, -50%);
}
.dms-effort-flare::before {
  width: 52px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(100,160,255,.42), #f1ecff, rgba(193,82,255,.65), transparent);
  box-shadow: 0 0 7px #9b7cff, 0 0 13px rgba(72,132,255,.64);
}
.dms-effort-flare::after {
  width: 1px;
  height: 20px;
  background: linear-gradient(180deg, transparent, rgba(196,190,255,.84), transparent);
  box-shadow: 0 0 7px #9c7cff;
}
.dms-effort-knob {
  position: absolute;
  z-index: 4;
  top: 50%;
  left: clamp(14px, var(--dms-progress), calc(100% - 14px));
  width: 28px;
  height: 28px;
  border: 1px solid rgba(255,255,255,.94);
  border-radius: 50%;
  background: #fff;
  box-shadow:
    0 0 0 2px rgba(92,105,255,.12),
    0 0 14px rgba(121,82,255,.48),
    0 2px 7px rgba(0,0,0,.3);
  transform: translate(-50%, -50%);
  transition: left 240ms cubic-bezier(.22,1,.36,1), transform 160ms ease, box-shadow 180ms ease;
  pointer-events: none;
}
.dms-effort-input {
  position: absolute;
  z-index: 5;
  inset: -5px 0;
  width: 100%;
  height: calc(100% + 10px);
  margin: 0;
  opacity: 0;
  cursor: grab;
  touch-action: none;
}
.dms-effort-input:active { cursor: grabbing; }
.dms-effort-input:focus-visible + .dms-effort-knob {
  outline: 2px solid var(--dsw-static-blue-400);
  outline-offset: 2px;
}
.dms-effort.is-dragging .dms-effort-canvas {
  filter: saturate(1.45) brightness(1.28) contrast(1.06);
}
.dms-effort.is-dragging .dms-effort-flare {
  filter: blur(1.5px) saturate(1.6) brightness(1.42);
  transition: none;
}
.dms-effort.is-dragging .dms-effort-knob {
  transform: translate(-50%, -50%) scale(1.07);
  transition: none;
  box-shadow:
    0 0 0 3px rgba(113,115,255,.25),
    0 0 20px rgba(74,145,255,.86),
    0 0 31px rgba(171,53,255,.66),
    0 3px 8px rgba(0,0,0,.32);
}
.dms-effort.is-error .dms-effort-slider {
  outline: 1px solid var(--dsw-alias-state-error-secondary);
  outline-offset: 2px;
}
.dms-effort.is-busy { opacity: .72; }
.dms-effort-error { flex: 1 0 100%; margin-top: 8px; padding: 6px 10px; border-radius: 8px; color: var(--dsw-alias-state-error-primary, #c83e4d); background: var(--dsw-alias-state-error-tertiary, rgba(220,55,70,.08)); font-size: 11px; line-height: 1.5; }
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
/* 方向键导航把焦点落在选项上，此前没有任何焦点指示。 */
.dms-model-option:focus-visible { background: var(--dsw-alias-interactive-bg-hover); }
/* 当前选中行：仅靠勾号不足以在密集列表里定位。 */
.dms-model-optionSelected { background: var(--dsw-alias-interactive-bg-hover); }
.dms-model-optionSelected .dms-model-option-name { font-weight: 600; }
/* select 进行中：官方以 disabled 变灰表达，这里用 aria-busy 驱动同样的视觉、
   不夺键盘焦点（aria-disabled 保连续性，见 ModelOption）。 */
.dms-menu[aria-busy="true"] .dms-model-option { color: var(--dsw-alias-label-dimmed); }
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
body:not([data-ds-dark-theme]) .dms-effort-slider {
  filter: none;
}
body:not([data-ds-dark-theme]) .dms-effort-track {
  background: var(--dsw-static-blue-75, #e5f0ff);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.9),
    inset 0 0 0 1px rgba(80,133,194,.14),
    0 3px 10px rgba(48,101,165,.13);
}
body:not([data-ds-dark-theme]) .dms-effort-track::before {
  content: "";
  position: absolute;
  z-index: 0;
  inset: 0 auto 0 0;
  width: var(--dms-progress);
  border-radius: inherit;
  background: linear-gradient(90deg, #fff 0%, #e2f0ff 20%, #a8d0fb 57%, #438fdf 100%);
  transition: width 240ms cubic-bezier(.22,1,.36,1);
}
body:not([data-ds-dark-theme]) .dms-effort.is-dragging .dms-effort-track::before {
  transition: none;
}
body:not([data-ds-dark-theme]) .dms-effort-track::after {
  z-index: 1;
  background: linear-gradient(90deg, rgba(255,255,255,.48), transparent 34%, rgba(23,101,201,.07));
}
body:not([data-ds-dark-theme]) .dms-effort-canvas {
  opacity: .78;
  mix-blend-mode: multiply;
}
body:not([data-ds-dark-theme]) .dms-effort-flare {
  background: radial-gradient(ellipse at 100% 50%, rgba(255,255,255,.98) 0 5%, rgba(204,231,255,.88) 13%, rgba(91,162,241,.48) 31%, rgba(37,111,207,.16) 53%, transparent 75%);
  filter: blur(2px) saturate(1.12);
}
body:not([data-ds-dark-theme]) .dms-effort-flare::before {
  background: linear-gradient(90deg, transparent, rgba(116,177,244,.34), #fff, rgba(66,139,225,.58), transparent);
  box-shadow: 0 0 7px rgba(58,133,222,.5), 0 0 13px rgba(104,176,255,.38);
}
body:not([data-ds-dark-theme]) .dms-effort-flare::after {
  background: linear-gradient(180deg, transparent, rgba(255,255,255,.94), transparent);
  box-shadow: 0 0 7px rgba(64,137,224,.44);
}
body:not([data-ds-dark-theme]) .dms-effort-knob {
  border-color: rgba(126,160,197,.32);
  box-shadow:
    0 0 0 2px rgba(58,124,207,.09),
    0 0 13px rgba(48,118,207,.3),
    0 3px 8px rgba(39,77,119,.18);
}
body:not([data-ds-dark-theme]) .dms-effort.is-dragging .dms-effort-knob {
  box-shadow:
    0 0 0 3px rgba(36,105,192,.15),
    0 0 20px rgba(25,100,201,.45),
    0 3px 8px rgba(39,77,119,.18);
}
@media (prefers-reduced-motion: reduce) {
  .dms-chevron,
  .dms-groupChevron,
  .dms-effort-knob,
  .dms-effort-flare,
  body:not([data-ds-dark-theme]) .dms-effort-track::before { transition: none; }
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
				tag.dataset.plugin = "dsh-model-selector";
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
							select: (selection) => available ? directory.select(selection).then(() => true, (error) => {
								console.warn("[dsh-model-selector] select failed:", error);
								return false;
							}) : Promise.resolve(false)
						};
					}
				}, ModelSelect));
			});
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map