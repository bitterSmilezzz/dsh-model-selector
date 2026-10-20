# dsh-model-selector 缺陷与优化审计（2026-10-20）

审计对象：`@bittersmilezzz/dsh-model-selector` 0.4.3（源码 `src/` 共 2,878 行，测试 123 项）。
环境：运行中的 DeepSeek Harness 桌面端 web 面（`http://127.0.0.1:52510`），
Playwright + CDP，browser-session cookie 按 `browser-auth.ts` 算法本地签发。

本文件只记录**可复现**的问题：每条都有现象、根因（file:line）、取证方法与修复状态。
推测项一律标注「未取证」，不与已验证结论混排。

---

## 一、本轮已修复（P1）

### 1. 滑杆上的方向键 / Home / End 被菜单劫持，焦点被抢进列表

- **现象**：焦点在推理强度滑杆上按 `ArrowUp`，焦点跳到模型行（`role=menuitemradio`）；
  按 `Home` 跳到首个分组头（`role=menuitem`）。滑杆自身的调档因此只能靠左右键。
- **根因**：`ModelSelect.tsx:978` 的 `onNonInput: !(target instanceof HTMLInputElement)`。
  0.4.0 起滑杆已从原生 `<input type=range>` 换成 `div[role=slider]`
  （`ModelSelect.tsx:367-384`，原因是原生控件会在深色菜单上闪一帧白色焦点环），
  该判据随之失效 —— `keys.ts` 里「滑杆不劫持」的分支再也走不到。
- **取证**：滑杆 `tagName === 'DIV'`；`ArrowUp` 后 `document.activeElement` 为
  `dms-model-option`、`Home` 后为 `dms-groupHeader`。
- **修复**：`keys.ts` 新增 `dmsOnNonInput({ isNativeInput, inEffortSlider })`，
  调用点按 `.dms-effort` 归属折算；补 2 条回归测试（现 123 项全绿）。
- **复核**：修复后 `ArrowUp`/`Home` 焦点始终留在 `dms-effort-input`，档位正常变化。

### 2. 打开菜单不聚焦搜索框，Tab 直接离开并关闭菜单

- **现象**：点开菜单后焦点仍在 trigger；按 Tab 落到语音输入按钮，菜单被 `onBlur` 关闭。
  键盘用户无法到达搜索框与模型列表（只能靠方向键盲进列表）。
- **根因**：聚焦 effect（`ModelSelect.tsx:714-733`）在菜单首帧执行，而首帧菜单是
  `visibility: hidden`（`menuPos === null`，避免从 `(0,0)` 闪一下）。
  Chromium 对 `visibility: hidden` 元素调用 `focus()` 是空操作，之后没有任何代码再聚焦。
- **取证**：给 `HTMLElement.prototype.focus` 打补丁，唯一一次调用是
  `cls=dms-searchInput, menuVisibility=hidden, left=0px`；最终 `activeElement` 为 `dms-trigger`。
- **修复**：`focusedForOpenRef` 一次性标志 + 依赖 `menuPos`，定位完成后再聚焦；
  若焦点已在菜单内则不抢。复核：打开后焦点为 `dms-searchInput`，Tab 落到选中行且菜单保持打开。

### 3. 「已是当前模型」提示永不消失，且压住两行模型不可点

- **现象**：点中当前模型后提示一直挂在列表底部；5s 后仍在。提示与两行模型几何重叠
  （`便宜模型 · routing group`、`性价比模型 · routing group`），且 `pointer-events: auto`，
  这两行鼠标点不到。
- **根因**：提示只在「再次选择 / 清词 / 关闭菜单」时清除（`ModelSelect.tsx:802/962/1127/1137`），
  没有超时；样式只修了不透明度（0.4.3），没处理命中测试。
- **修复**：新增 `NOTICE_TTL_MS = 4e3` 自动收起；`.dms-notice` 加 `pointer-events: none`。
- **复核**：提示 4.2s 后 `text=""`、`display:none`；下方行可正常点击。

### 4. 提示的 live region 被 `:empty{display:none}` 从无障碍树摘掉

- **现象**：注释声明「容器常驻以保证首次播报」，但 CSS 用 `:empty { display: none }`
  （`styles.ts:339`）。元素从 `display:none` 变为可见属于「插入式 live region」，
  部分 AT 不播报 —— 恰恰是注释想避免的情形。
- **修复**：视觉卡片改 `aria-hidden="true"`，播报改走常驻 clip 式 `.dms-sr[role="status"]`
  （`clip` 隐藏不移出无障碍树）。
- **复核**：`document.querySelectorAll('.dms-menu .dms-sr[role="status"]')` 第三个节点
  携带「已是当前模型，无需切换」，且不在 `display:none` 状态。

---

## 二、待修（P2，已定位未改）

### 5. 切到其他 App 时菜单不关

- **根因**：`onBlur` 在 `relatedTarget === null` 时只认
  `document.visibilityState === 'hidden'`（`ModelSelect.tsx:1006`）。
  alt-tab 切到别的应用时该值通常是 `visible`（是否变 `hidden` 取决于窗口遮挡检测），
  菜单会悬挂，并保留搜索词。
- **未取证说明**：headless 环境没有真实窗口遮蔽，无法复现；结论基于规范语义 + 代码路径，
  建议在真机上复核（切到全屏应用再回来）。
- **建议**：监听 `window.blur` 且此时 `visibilityState === 'visible'` 时关闭；
  不要退回 `document.hasFocus()` 单判据（iframe 场景会误关，原注释已论证）。

### 6. 忙态点击模型静默无反馈

- **根因**：`choose()` 开头 `if (isBusy) return;`（`ModelSelect.tsx:836-837`）。
- **建议**：复用 notice/toast 播报「正在切换，请稍候」，或把行置 `aria-disabled`。

### 7. effort 提交时整块列表 `aria-busy`

- **根因**：`aria-busy={state.status === 'loading' || busy}`（`ModelSelect.tsx:1173`），
  `busy` 含 effort 提交；视觉侧已用 `data-model-switch` 区分，语义侧没有。
- **建议**：`aria-busy` 只跟随 `pendingModelSwitch || loading`。

### 8. 超时常量语义复用

- `EFFORT_COMMIT_TIMEOUT_MS`（12s）同时用于模型切换（`ModelSelect.tsx:867`）。
  两者失败语义不同，建议拆成 `SELECT_TIMEOUT_MS` / `EFFORT_TIMEOUT_MS`。

---

## 三、可优化（P3）

| 项 | 现状 | 依据 | 建议 |
| --- | --- | --- | --- |
| 9. 菜单全量渲染 | 打开时渲染 105 行 / 641 元素，DOM→下一帧 85ms | 本轮实测（105 rows, 652 nodes） | 当前在预算内；若要压，试 `.dms-group { content-visibility: auto; contain-intrinsic-size: … }` 或默认折叠非当前分组，需复测 |
| 10. 两个 resize 监听 | `ModelSelect.tsx:683` 与 `712` 各挂一个 `window resize` | 监听器探针：插件每次打开新增 2×resize + 1×scroll + 1×pointerdown | 合并为一个 measure/release 回调 |
| 11. `dmsSliderLevels()` 每渲染新建数组 | `effort.ts:124-127` | 代码阅读 | `useMemo` 按 `state.current` 的 efforts 引用缓存，减少滑杆同步 effect 空跑 |
| 12. `inject` 双重声明 | `index.ts:47` 的 `inject` 已含 `modelDirectories`，`69` 行又 `ctx.inject` 等一次 | 代码阅读 | 保留一种即可（语义等价） |
| 13. 无「打开菜单」快捷键 | 只能点 trigger | 交互检查 | 可选：`⌘K`/`/` 聚焦，需先确认不冲突 |

---

## 四、上一轮性能结论的更正

先前把「首次打开菜单后 listeners +131」记为插件成本，本轮用 `EventTarget.prototype.addEventListener`
打补丁按调用栈归属，结论更正：

- 一次开/关共新增 **137** 个监听器：**插件 4 个**（2×window resize、1×window scroll、
  1×document pointerdown），**应用侧 133 个**（`document.body` 上按事件类型成组注册，
  来自 `index-CN7NIWNw.js` 的既有实现，与本插件无关）。
- 因此该项不再作为插件缺陷；插件侧真正的可动项是上表第 10 项（两个 resize 合并）。

---

## 五、结论

- **P1 四条已修并在真机复核**：滑杆键盘劫持、搜索框聚焦竞态、提示常驻+挡点击、live region 被摘出无障碍树。
- **P2 四条已定位**：alt-tab 不关菜单（需真机确认）、忙态无反馈、`aria-busy` 语义过宽、超时常量复用。
- **P3 五项为可选优化**：全量渲染、监听合并、数组缓存、inject 去重、快捷键。
- 插件产物：`lib/client.js` 94.1 kB（gzip 28.8 kB），注入 CSS 16,321 B / 95 条规则；
  这些在 P3 落地时一并复测。
