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
			"trigger.selectAria": "选择模型",
			"trigger.aria": "选择模型，当前 {model}",
			"trigger.ariaEffort": "选择模型，当前 {model}，推理等级 {effort}",
			"menu.model": "模型",
			"menu.effort": "推理等级",
			"search.placeholder": "搜索模型",
			"search.clearAria": "清除搜索",
			"search.noMatch": "没有匹配“{query}”的模型。",
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
			"notice.already": "已是当前模型，无需切换",
			"notice.selectFailed": "切换失败，请重试",
			"notice.alreadyEffort": "已是当前推理等级",
			"badge.reasoning": "推理",
			"badge.reasoningHint": "支持思考等级，切换后自动选到最大思考强度"
		};
		const en = {
			"trigger.fallback": "Select model",
			"trigger.selectAria": "Select model",
			"trigger.aria": "Select model, current {model}",
			"trigger.ariaEffort": "Select model, current {model}, reasoning effort {effort}",
			"menu.model": "Model",
			"menu.effort": "Effort",
			"search.placeholder": "Search models",
			"search.clearAria": "Clear search",
			"search.noMatch": "No models match “{query}”.",
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
			"notice.already": "Already the current model",
			"notice.selectFailed": "Switch failed, please try again",
			"notice.alreadyEffort": "Already the current effort",
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
		* shows next and vice versa. Icons are inline SVG paths copied from
		* @deepseek-ai/dsh-client-ui-primitives (no runtime dependency); colors
		* come from `--dsw-*` tokens in the injected stylesheet.
		*/
		const IconChevronDown = /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
			width: "14",
			height: "14",
			viewBox: "0 0 14 14",
			fill: "none",
			"aria-hidden": "true",
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
				d: "M11.8486 5.5L11.4238 5.92383L8.69727 8.65137C8.44157 8.90706 8.21562 9.13382 8.01172 9.29785C7.79912 9.46883 7.55595 9.61756 7.25 9.66602C7.08435 9.69222 6.91565 9.69222 6.75 9.66602C6.44405 9.61756 6.20088 9.46883 5.98828 9.29785C5.78438 9.13382 5.55843 8.90706 5.30273 8.65137L2.57617 5.92383L2.15137 5.5L3 4.65137L3.42383 5.07617L6.15137 7.80273C6.42595 8.07732 6.59876 8.24849 6.74023 8.3623C6.87291 8.46904 6.92272 8.47813 6.9375 8.48047C6.97895 8.48703 7.02105 8.48703 7.0625 8.48047C7.07728 8.47813 7.12709 8.46904 7.25977 8.3623C7.40124 8.24849 7.57405 8.07732 7.84863 7.80273L10.5762 5.07617L11 4.65137L11.8486 5.5Z",
				fill: "currentColor"
			})
		});
		const IconCheck = /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
			width: "14",
			height: "14",
			viewBox: "0 0 14 14",
			fill: "none",
			"aria-hidden": "true",
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
				d: "M11.5635 4.58984L7.61426 9.07715C7.35154 9.37561 7.11346 9.64812 6.89453 9.84668C6.66593 10.054 6.38519 10.2506 6.01465 10.3164C5.82079 10.3508 5.62207 10.3529 5.42773 10.3213C5.0561 10.2609 4.77266 10.0674 4.54102 9.86328C4.31926 9.66791 4.07752 9.39911 3.81055 9.10449L2.44531 7.59863L3.55664 6.59082L4.92188 8.09766C5.21256 8.41844 5.38878 8.61191 5.53223 8.73828C5.61022 8.80699 5.65253 8.83192 5.66895 8.83984C5.69648 8.84429 5.72449 8.84467 5.75195 8.83984C5.72657 8.84451 5.75564 8.85422 5.88672 8.73535C6.02833 8.60692 6.20225 8.41088 6.48828 8.08594L10.4385 3.59961L11.5635 4.58984Z",
				fill: "currentColor"
			})
		});
		const IconClear = /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
			width: "14",
			height: "14",
			viewBox: "0 0 14 14",
			fill: "none",
			"aria-hidden": "true",
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
				d: "M10.6074 4.40278L8.00975 6.99973L10.6074 9.59739L9.59736 10.6074L6.9997 8.00978L4.40274 10.6074L3.3927 9.59739L5.98966 6.99973L3.3927 4.40278L4.40274 3.39273L6.9997 5.98969L9.59736 3.39273L10.6074 4.40278Z",
				fill: "currentColor"
			})
		});
		/**
		* How long a successfully loaded directory snapshot is trusted before the
		* menu re-fetches it over RPC. The snapshot lives in the per-session store,
		* so reopening the menu within this window costs zero RPC and zero re-render.
		*/
		const DIRECTORY_STALE_MS = 3e4;
		/** 搜索命中渲染上限：宽泛关键词（如单字母）命中数百条时避免 DOM 爆炸。 */
		const MAX_VISIBLE_HITS = 100;
		function dmsDrawRadiation(context, width, height, time, state) {
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
		function EffortSlider({ state, directory, select, t }) {
			const levels = dmsSliderLevels(state);
			const [effort, setEffort] = react.useState("");
			const [preview, setPreview] = react.useState(0);
			const [committing, setCommitting] = react.useState(false);
			const [dragging, setDragging] = react.useState(false);
			const [localError, setLocalError] = react.useState(null);
			const canvasRef = react.useRef(null);
			const inputRef = react.useRef(null);
			const committedRef = react.useRef("");
			const committingRef = react.useRef(false);
			const previewRef = react.useRef(0);
			const draggingRef = react.useRef(false);
			const pointerActiveRef = react.useRef(false);
			const activePointerIdRef = react.useRef(null);
			const globalPointerMoveRef = react.useRef(null);
			const globalPointerEndRef = react.useRef(null);
			const globalPointerCancelRef = react.useRef(null);
			const radiationRef = react.useRef({
				progress: .5,
				dragging: false
			});
			const redrawRef = react.useRef(null);
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
						const k = r.dragging ? .55 : .12;
						r.progress += (r.target - r.progress) * k;
						if (Math.abs(r.target - r.progress) < .002) r.progress = r.target;
					}
					dmsDrawRadiation(context, width, height, phase, r);
					if (r.dragging) return false;
					return r.target !== void 0 && Math.abs(r.target - r.progress) > .002;
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
				resizeObserver.observe(canvas);
				themeObserver.observe(document.body, {
					attributes: true,
					attributeFilter: ["data-ds-dark-theme"]
				});
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
			const commit = react.useCallback(async (raw) => {
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
					previewRef.current = index;
					setPreview(index);
					setEffort(next);
					if (!await select({
						provider: current.provider,
						model: current.model,
						reasoningEffort: next
					})) throw new Error(t("effort.failed"));
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
			}, [
				directory,
				levels,
				select,
				state,
				t
			]);
			const rawFromPointer = (input, clientX) => {
				const bounds = input.getBoundingClientRect();
				if (bounds.width <= 0 || levels.length < 2) return previewRef.current;
				return Math.max(0, Math.min(levels.length - 1, (clientX - bounds.left) / bounds.width * (levels.length - 1)));
			};
			const showPointerPreview = (raw) => {
				previewRef.current = raw;
				setPreview(raw);
				setEffort(levels[dmsClampIndex(raw, levels.length)]?.id ?? "");
			};
			const beginDragging = (input, pointerId, clientX) => {
				pointerActiveRef.current = true;
				activePointerIdRef.current = pointerId;
				draggingRef.current = true;
				setDragging(true);
				showPointerPreview(rawFromPointer(input, clientX));
				try {
					if (!input.hasPointerCapture(pointerId)) input.setPointerCapture(pointerId);
				} catch {}
			};
			const moveDragging = (input, pointerId, clientX) => {
				if (!pointerActiveRef.current || activePointerIdRef.current !== pointerId) return;
				showPointerPreview(rawFromPointer(input, clientX));
			};
			const stopDragging = (input, pointerId, clientX) => {
				if (!pointerActiveRef.current) return;
				if (pointerId !== void 0 && activePointerIdRef.current !== pointerId) return;
				const raw = clientX === void 0 ? previewRef.current : rawFromPointer(input, clientX);
				pointerActiveRef.current = false;
				activePointerIdRef.current = null;
				draggingRef.current = false;
				if (pointerId !== void 0 && input.hasPointerCapture(pointerId)) input.releasePointerCapture(pointerId);
				showPointerPreview(raw);
				commit(raw);
			};
			globalPointerMoveRef.current = (event) => {
				const input = inputRef.current;
				if (input !== null) moveDragging(input, event.pointerId, event.clientX);
			};
			globalPointerEndRef.current = (event) => {
				const input = inputRef.current;
				if (input !== null) stopDragging(input, event.pointerId, event.clientX);
			};
			globalPointerCancelRef.current = (event) => {
				if (activePointerIdRef.current !== event.pointerId) return;
				rollback();
			};
			react.useEffect(() => {
				const move = (event) => globalPointerMoveRef.current?.(event);
				const end = (event) => globalPointerEndRef.current?.(event);
				const cancel = (event) => globalPointerCancelRef.current?.(event);
				window.addEventListener("pointermove", move, true);
				window.addEventListener("pointerup", end, true);
				window.addEventListener("pointercancel", cancel, true);
				return () => {
					window.removeEventListener("pointermove", move, true);
					window.removeEventListener("pointerup", end, true);
					window.removeEventListener("pointercancel", cancel, true);
				};
			}, []);
			const onKeyDown = (event) => {
				const current = dmsClampIndex(Number(event.currentTarget.value), levels.length);
				let target;
				if (event.key === "ArrowLeft" || event.key === "ArrowDown" || event.key === "PageDown") target = Math.max(0, current - 1);
				else if (event.key === "ArrowRight" || event.key === "ArrowUp" || event.key === "PageUp") target = Math.min(levels.length - 1, current + 1);
				else if (event.key === "Home") target = 0;
				else if (event.key === "End") target = levels.length - 1;
				if (target === void 0) return;
				event.preventDefault();
				commit(target);
			};
			if (!available) return null;
			const count = levels.length;
			const effortName = levels[dmsEffortIndex(levels, effort)]?.name ?? effort;
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
								disabled: busy,
								"aria-label": t("menu.effort"),
								"aria-valuetext": effortName,
								onChange: (event) => {
									const raw = Number(event.currentTarget.value);
									showPointerPreview(raw);
								},
								onPointerDown: (event) => {
									event.preventDefault();
									event.currentTarget.focus();
									beginDragging(event.currentTarget, event.pointerId, event.clientX);
								},
								onPointerMove: (event) => moveDragging(event.currentTarget, event.pointerId, event.clientX),
								onPointerUp: (event) => stopDragging(event.currentTarget, event.pointerId, event.clientX),
								onPointerCancel: (event) => {
									if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
									rollback();
								},
								onBlur: (event) => {
									stopDragging(event.currentTarget);
								},
								onKeyDown
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dms-effort-knob",
								"aria-hidden": "true"
							})
						]
					}),
					error === null ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dms-effort-sr",
						role: "status",
						children: error
					}),
					error === null ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dms-effort-error",
						children: error
					})
				]
			});
		}
		function ModelSelect({ locked, available, directory, load, select, t }) {
			const state = react.useSyncExternalStore(directory.subscribe, directory.getSnapshot);
			const [open, setOpen] = react.useState(false);
			const [menuAbove, setMenuAbove] = react.useState(true);
			const [query, setQuery] = react.useState("");
			const [collapsed, setCollapsed] = react.useState(() => /* @__PURE__ */ new Set());
			const [notice, setNotice] = react.useState(null);
			const lastActionRef = react.useRef("load");
			const rootRef = react.useRef(null);
			const triggerRef = react.useRef(null);
			const searchRef = react.useRef(null);
			const itemRefs = react.useRef([]);
			const lastLoadRef = react.useRef(0);
			const lastGroupsKeyRef = react.useRef(null);
			const choicesCacheRef = react.useRef([]);
			const id = react.useId();
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
					if (Date.now() - lastLoadRef.current < DIRECTORY_STALE_MS && state.status === "ready" && state.groups.length > 0) return;
					lastActionRef.current = "load";
					lastLoadRef.current = Date.now();
					load();
				}
			}, [available, load]);
			react.useEffect(() => {
				if (!open) return;
				const closeOutside = (event) => {
					if (!rootRef.current?.contains(event.target)) setOpen(false);
				};
				document.addEventListener("mousedown", closeOutside);
				return () => {
					document.removeEventListener("mousedown", closeOutside);
				};
			}, [open]);
			react.useEffect(() => {
				if (!open) return;
				const measure = () => {
					const trigger = triggerRef.current;
					if (trigger === null) return;
					const rect = trigger.getBoundingClientRect();
					setMenuAbove(rect.top >= 440);
				};
				measure();
				window.addEventListener("resize", measure);
				return () => window.removeEventListener("resize", measure);
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
			const moveFocus = (offset) => {
				const items = itemRefs.current.filter((item) => item !== null);
				if (items.length === 0) return;
				const active = items.findIndex((item) => item === document.activeElement);
				items[((active < 0 ? offset > 0 ? -1 : 0 : active) + offset + items.length) % items.length]?.focus();
			};
			const onRootKeyDown = (event) => {
				if (event.key === "Escape" && open) {
					event.preventDefault();
					close(true);
					return;
				}
				if (!open) return;
				const target = event.target;
				const fromSearch = target instanceof HTMLInputElement && target === searchRef.current;
				if ((event.key === "ArrowDown" || event.key === "ArrowUp") && (!(target instanceof HTMLInputElement) || fromSearch)) {
					event.preventDefault();
					moveFocus(event.key === "ArrowDown" ? 1 : -1);
					return;
				}
				if (event.key === "Enter" && !(target instanceof HTMLButtonElement)) {
					if (hits !== null && hits.length > 0) {
						event.preventDefault();
						const first = hits[0];
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
			const choose = (selection) => {
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
				select(full).then((accepted) => {
					if (accepted && rootRef.current !== null) close(true);
					else if (!accepted) setNotice(t("notice.selectFailed"));
				});
			};
			const toggleCollapse = (groupId) => {
				setCollapsed((prev) => {
					const next = new Set(prev);
					if (next.has(groupId)) next.delete(groupId);
					else next.add(groupId);
					return next;
				});
			};
			const modelLabel = currentChoice?.model.name ?? t("trigger.fallback");
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
				return (node) => {
					itemRefs.current[at] = node;
				};
			};
			const renderModelOption = (group, model, showProvider) => {
				const selected = state.current?.provider === group.id && state.current.model === model.id;
				return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					ref: itemRef(),
					type: "button",
					className: `dms-model-option${selected ? " dms-model-optionSelected" : ""}`,
					title: model.name,
					disabled: busy,
					onClick: () => {
						choose({
							provider: group.id,
							model: model.id
						});
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: "dms-model-option-copy",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dms-model-option-name",
								children: model.name
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
						children: selected ? IconCheck : null
					})]
				});
			};
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
				if (state.error !== null && lastActionRef.current === "select") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "dms-error",
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("error.action", { message: state.error }) })
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
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					ref: triggerRef,
					type: "button",
					className: "dms-trigger",
					"aria-label": triggerAria,
					"aria-haspopup": "true",
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
							children: IconChevronDown
						})
					]
				}), open ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					id: `${id}-menu`,
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
								children: IconClear
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dms-groups",
							children: [hits !== null ? hits.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "dms-empty",
								children: t("search.noMatch", { query: query.trim() })
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [hits.slice(0, MAX_VISIBLE_HITS).map((hit) => renderModelOption(hit.group, hit.model, true)), hits.length > MAX_VISIBLE_HITS && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "dms-more",
								children: t("search.more", {
									shown: String(MAX_VISIBLE_HITS),
									total: String(hits.length)
								})
							})] }) : state.groups.map((group) => {
								const headingId = `${id}-${group.id}`;
								const isCollapsed = collapsed.has(group.id);
								return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
									role: "group",
									"aria-labelledby": headingId,
									className: "dms-group",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
										type: "button",
										id: headingId,
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
												children: IconChevronDown
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: "dms-groupName",
												children: group.name
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: "dms-groupCount",
												children: group.models.length
											})
										]
									}), !isCollapsed && group.models.map((model) => renderModelOption(group, model, false))]
								}, group.id);
							}), hits === null && state.status === "ready" && choices.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "dms-empty",
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
								directory,
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
				}) : null]
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
.dms-check svg { display: block; }

.dms-menu {
  position: absolute;
  right: 0;
  bottom: calc(100% + 8px);
  z-index: 20;
  display: flex;
  flex-direction: column;
  width: min(280px, calc(100vw - 32px));
  max-height: min(420px, calc(100vh - 96px));
  overflow: hidden;
  padding: 4px 0 4px 4px;
  border: 1px solid var(--dsw-alias-border-inverted);
  border-radius: 12px;
  background: var(--dsw-specific-menu);
  box-shadow: var(--dsw-shadow-lv3);
  color: var(--dsw-alias-label-primary);
  --dsh-scrollbar-thumb: var(--dsw-alias-scrollbar-bg-l2);
  --dsh-scrollbar-thumb-hover: var(--dsw-alias-scrollbar-hover-l2);
}
.dms-menuModel { border-right: none; }
.dms-menuBelow {
  bottom: auto;
  top: calc(100% + 8px);
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
  background: transparent;
  color: inherit;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}

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
.dms-groupName {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dms-groupCount { flex: 0 0 auto; color: var(--dsw-alias-label-dimmed); font-weight: 400; }

.dms-option {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: 38px;
  padding: 6px 8px;
  border: none;
  border-radius: 10px;
  outline: none;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}
.dms-option:hover:not(:disabled),
.dms-option:focus-visible { background: var(--dsw-alias-interactive-bg-hover); }
.dms-option.dms-selected { background: var(--dsw-alias-interactive-bg-hover); }
.dms-option:disabled { color: var(--dsw-alias-label-dimmed); cursor: default; }

.dms-optionCopy {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}
.dms-nameRow {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}
.dms-modelName {
  flex: 0 1 auto;
  min-width: 0;
  overflow: hidden;
  color: inherit;
  font-size: 14px;
  line-height: 20px;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
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
.dms-description {
  overflow: hidden;
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  line-height: 18px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dms-providerTag {
  overflow: hidden;
  color: var(--dsw-alias-label-dimmed);
  font-size: 12px;
  line-height: 18px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dms-check {
  display: grid;
  place-items: center;
  flex: 0 0 18px;
  color: var(--dsw-alias-label-primary);
}

.dms-effort {
  display: flex;
  align-items: center;
  width: 100%;
  min-width: 0;
  height: 32px;
  color: var(--dsw-alias-label-secondary);
  user-select: none;
  box-sizing: border-box;
}
.dms-effort-slider {
  --dms-progress: 50%;
  position: relative;
  width: 100%;
  height: 30px;
  flex: 1 1 auto;
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
  transition: left 240ms cubic-bezier(.22,1,.36,1), filter 140ms ease;
  top: 50%;
  left: var(--dms-progress);
  width: 78px;
  height: 46px;
  border-radius: 50%;
  background: radial-gradient(ellipse at 100% 50%, rgba(255,255,255,.96) 0 4%, rgba(188,189,255,.8) 11%, rgba(106,87,255,.5) 28%, rgba(105,31,255,.2) 49%, transparent 74%);
  filter: blur(2px) saturate(1.25);
  mix-blend-mode: screen;
  transform: translate(-100%, -50%);
  transition: left 70ms linear, filter 140ms ease;
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
.dms-effort-error { margin-top: 8px; padding: 6px 10px; border-radius: 8px; color: var(--dsw-alias-state-error-primary, #c83e4d); background: var(--dsw-alias-state-error-tertiary, rgba(220,55,70,.08)); font-size: 11px; line-height: 1.5; }
.dms-effort-sr {
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
.dms-model-root {
  position: relative;
  display: inline-flex;
  min-width: 0;
}
.dms-model-trigger {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  max-width: 230px;
  height: 28px;
  padding: 0 8px 0 10px;
  border: 0;
  border-radius: 9px;
  color: var(--dsw-alias-label-primary, #15171b);
  background: transparent;
  font: inherit;
  cursor: pointer;
  transition: background 140ms ease;
}
.dms-model-trigger:hover,
.dms-model-trigger[aria-expanded="true"] {
  background: var(--dsw-alias-fill-tertiary, rgba(120,125,140,.1));
}
.dms-model-trigger:disabled { cursor: not-allowed; opacity: .5; }
.dms-model-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  line-height: 1;
}
.dms-model-effort {
  flex: 0 0 auto;
  color: var(--dsw-static-deepseek-500, #4d70ff);
  font-size: 12px;
  line-height: 1;
}
.dms-model-chevron {
  flex: 0 0 auto;
  width: 7px;
  height: 7px;
  margin: -3px 1px 0 3px;
  border-right: 1.5px solid currentColor;
  border-bottom: 1.5px solid currentColor;
  opacity: .55;
  transform: rotate(45deg);
  transition: transform 150ms ease, margin 150ms ease;
}
.dms-model-trigger[aria-expanded="true"] .dms-model-chevron {
  margin-top: 3px;
  transform: rotate(225deg);
}
.dms-model-menu {
  position: absolute;
  right: 0;
  bottom: calc(100% + 8px);
  z-index: 1200;
  width: min(312px, calc(100vw - 32px));
  overflow: hidden;
  border: 1px solid var(--dsw-alias-stroke-secondary, rgba(121,126,145,.2));
  border-radius: 16px;
  color: var(--dsw-alias-label-primary, #15171b);
  background: var(--dsw-alias-bg-elevated, #fff);
  box-shadow: 0 14px 42px rgba(18, 24, 42, .18), 0 3px 10px rgba(18, 24, 42, .08);
  animation: dms-menu-in 150ms cubic-bezier(.22,1,.36,1);
}
.dms-advanced {
  padding: 14px;
}
.dms-menu-separator {
  height: 1px;
  background: var(--dsw-alias-stroke-secondary, rgba(121,126,145,.16));
}
.dms-model-row,
.dms-model-option,
.dms-model-back {
  width: 100%;
  border: 0;
  color: inherit;
  background: transparent;
  font: inherit;
  cursor: pointer;
}
.dms-model-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 8px;
  min-height: 45px;
  padding: 0 14px;
  text-align: left;
}
.dms-model-row:hover,
.dms-model-option:hover,
.dms-model-back:hover { background: var(--dsw-alias-fill-tertiary, rgba(120,125,140,.09)); }
.dms-model-row-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; }
.dms-model-row-effort { color: var(--dsw-static-deepseek-500, #4d70ff); font-size: 12px; }
.dms-row-chevron { font-size: 20px; line-height: 1; opacity: .42; }
.dms-model-pane { max-height: min(390px, 60vh); overflow-y: auto; padding: 7px; }
.dms-model-back {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 34px;
  padding: 0 8px;
  border-radius: 8px;
  text-align: left;
  color: var(--dsw-alias-label-secondary, #686c75);
  font-size: 12px;
}
.dms-model-group-title { padding: 10px 9px 5px; color: var(--dsw-alias-label-tertiary, #9296a0); font-size: 11px; }
.dms-model-option {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 20px;
  align-items: center;
  gap: 8px;
  min-height: 38px;
  padding: 7px 9px;
  border-radius: 9px;
  text-align: left;
}
.dms-model-option-copy { min-width: 0; }
.dms-model-option-name { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; }
.dms-model-option-desc { display: block; margin-top: 3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--dsw-alias-label-tertiary, #9296a0); font-size: 10px; }
.dms-model-check { color: var(--dsw-static-deepseek-500, #4d70ff); font-size: 15px; text-align: center; }
.dms-model-status { padding: 14px; color: var(--dsw-alias-label-tertiary, #9296a0); font-size: 12px; text-align: center; }
.dms-model-error { margin: 8px; padding: 8px 10px; border-radius: 8px; color: var(--dsw-alias-state-error-primary, #c83e4d); background: var(--dsw-alias-state-error-tertiary, rgba(220,55,70,.08)); font-size: 11px; }
body[data-ds-dark-theme] .dms-model-menu {
  border-color: rgba(136, 145, 180, .2);
  color: var(--dsw-alias-label-primary, #f2f4f8);
  background: var(--dsw-alias-bg-elevated, #202126);
  box-shadow: 0 18px 46px rgba(0,0,0,.48), 0 3px 12px rgba(0,0,0,.32);
}
body[data-ds-dark-theme] .dms-model-trigger { color: var(--dsw-alias-label-primary, #f2f4f8); }
@keyframes dms-menu-in {
  from { opacity: 0; transform: translateY(5px) scale(.98); }
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
body[data-ds-dark-theme] .dms-adapt-panel {
  background: rgba(20, 22, 30, .5);
}
@media (prefers-reduced-motion: reduce) {
  .dms-effort-knob,
  .dms-effort-flare,
  body:not([data-ds-dark-theme]) .dms-effort-track::before { transition: none; }
  .dms-model-menu { animation: none; }
}
.dms-effort-head { padding: 0 14px 6px; color: var(--dsw-alias-label-tertiary, #9296a0); font-size: 11px; }

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