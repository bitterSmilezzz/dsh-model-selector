# dsh-model-selector 缺陷与优化审计（2026-10-20）

审计对象：`@bittersmilezzz/dsh-model-selector` 0.4.3（源码 `src/` 共 2,878 行，测试 123 项）。
环境：运行中的 DeepSeek Harness 桌面端 web 面（`http://127.0.0.1:52510`），
Playwright + CDP，browser-session cookie 按 `browser-auth.ts` 算法本地签发。

本文件只记录**可复现**的问题：每条都有现象、根因（file:line）、取证方法与修复状态。
推测项一律标注「未取证」，不与已验证结论混排。

轮次：第 1 轮（键盘/焦点/提示）· 第 2 轮（无障碍 + 并发重入）· 第 3 轮（英文界面 + P3 优化，见「八」）。

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

---

## 六、第 2 轮（2026-10-20 第二轮）

### 14. 同一帧内连点两行会发出两条 select RPC（last-writer-wins 互相覆盖）

- **现象**：菜单里快速点两行，`aria-label` 变了 **2** 次（即两次 select 都落地），
  最终模型是后一条，前一条被静默覆盖。
- **根因**：`choose()` 的忙态来自 store 快照（`ModelSelect.tsx:859` 的
  `chooseInputRef.current.busy`）。两次点击落在同一帧时，React 尚未因
  `pending` 重渲染，目录也还没写 `pending`，两次都判定「不忙」全部放行；
  `busy` 的 `dmsEffortBusy` 依赖 `state.pending`，而 pending 由 RPC 入口异步写入。
- **取证**：`MutationObserver` 监听 trigger 的 `aria-label`，同一帧 `a.click(); b.click()`
  记录到 2 次变更。
- **修复**：新增同步 `selectingRef`，在调用瞬间置位、`finally` 复位；
  与 `busy` 一起做守卫（`ModelSelect.tsx:858-885`）。
- **复核**：同一帧连点两行，`aria-label` 只变 **1** 次。

### 15. 忙态点击无反馈（第 1 轮 P2#6 已修）

- **修复**：忙态不再静默 `return`，改播报 `notice.busy`（「正在切换，请稍候」/
  「Switching, please wait」），走与「已是当前模型」同一条提示通道。

### 16. `aria-busy` 把 effort 提交也算「列表忙」（第 1 轮 P2#7 已修）

- **修复**：`aria-busy` 改用 `pendingModelSwitch`（`ModelSelect.tsx:1199` 附近），
  只有「换模型」与加载才置位；effort 提交不再让读屏反复宣布列表忙碌。

### 17. 无障碍扫描：15 处对比度不足 + 3 处可达名不匹配（全部修复）

工具：axe-core 4.x，`wcag2a/wcag2aa/wcag21a/wcag21aa`，浅/深两套主题各扫一次。

**对比度**（菜单底面不透明，故直接按菜单底色计算）：

| 元素 | 原值 | 原比 | 改为 | 现比 |
| --- | --- | --- | --- | --- |
| 分组名 12px/500 | `label-tertiary` #81858c | 3.71 | `label-secondary` #61666b | 5.80 |
| 分组计数 | `label-dimmed` #e1e5ee | **1.26** | `label-secondary` | 5.80 |
| 「推理」徽标 10px | `label-caption` #adb2b8 | **2.13** | `label-secondary` | 5.80 |
| 模型描述 10px | `label-tertiary` | 3.71 | `label-secondary` | 5.80 |
| 供应商名 10px | `label-dimmed` | 1.26 | `label-tertiary` #81858c | 4.79 |
| 档位读数 11px | `blue-500` #3b82f6 | 3.68 | `blue-600` #2563eb | 5.17 |
| 最高档读数 | `#8b5cf6` | 4.23 | `#7c3aed` | 5.70 |
| 滑杆左标签 11px | `label-tertiary` | 3.71 | `label-secondary` | 5.80 |

深色主题另有覆盖：档位读数 `blue-400` #60a5fa（6.18:1）、最高档 `#a78bfa`（5.77:1）
——`blue-600`/`#7c3aed` 在深色底上只有 3.04/2.76:1。

**可达名不匹配**（`label-content-name-mismatch`）：

- 分组头用 `aria-label="{name}（{count} 个模型）"` 覆盖了可见文本「DeepSeek 2」，
  读屏与语音控制取词对不上。改为**不用 aria-label**：可达名由「可见名称 + 可见数字
  + clip 隐藏单位」自然拼成 `DeepSeek 2 个模型`，可见文本完整包含其中。
- 顺带删掉因此失去引用的 `group.toggleAria` 键（字典守卫测试当场抓到）。

**复核**：浅色与深色主题 axe 均 **no violations**；123 项测试全绿；伞仓门禁 22/22。

---

## 七、第 2 轮后仍待处理

| 项 | 状态 |
| --- | --- |
| P2#5 切到其他 App 菜单不关 | 仍未取证（需真机窗口遮蔽） |
| P3#9–13 | 未动 |
| 版本发布 | 第 1、2 轮共 9 条修复尚未发版（当前 tag `v0.4.3`，`main` 已领先 2 个提交） |

---

## 八、第 3 轮（2026-10-20 第三轮）

### 18. 英文界面走查

以 `locale: en-US` 打开真实界面，逐项核对文案与布局：

- 触发按钮、占位符、分组名、徽标、滑杆标签、空态、右下读数**全部正确切换**
  （`Search models` / `Reasoning` / `Effort` / `No models match “zzz-nothing”.`）。
- **无截断**：`.dms-badge`、`.dms-effort-value` 的 `scrollWidth === clientWidth`；
  菜单宽度恒为 280px，`documentElement.scrollWidth` 未超视口。
- 长模型名（routing group 自带中文长描述）仍按设计省略号截断，`title` 提供全文 —— 这是预期行为。
- **结论**：英文侧无缺陷。唯一可议之处是 `routing group` 这类**模型名本身**来自目录数据，
  切到英文也不翻译（正确：属于用户/后端数据，按 i18n 规则不得翻译）。

### 19. 合并重复的 resize 监听（P3#10 已修）

- **原状**：`ModelSelect.tsx` 有两个独立的 `window.addEventListener('resize')`
  —— 一个在布局测量 effect 里（rAF 合并后 measure），一个在「释放高度锁」effect 里。
- **取证**：监听器探针按调用栈归属，插件每次打开菜单新增 **4** 个监听器
  （window resize ×2、window scroll ×1、document pointerdown ×1）。
- **修复**：把「释放高度锁」并入已有的 `onViewportChange` rAF 回调，删除第二个 effect。
- **复核**：插件侧新增监听器变为 **3** 个（`window::resize 1`、`window::scroll 1`、
  `document::pointerdown 1`）。

### 20. `dmsSliderLevels()` 每次渲染返回新数组（P3#11 已修）

- **根因**：`effort.ts:124-127` 对 `efforts.length < 2` 返回新的 `[]` 字面量；正常路径返回
  `reasoning.efforts`（这一支本来稳定）。滑杆把它直接用作 effect 依赖，空档位时
  （非推理模型）同步 effect 每渲染必跑一次，而该 effect 内部 `setState` —— 多一轮提交。
- **修复**：在 `EffortSlider` 内以 `efforts` 引用为依赖 `useMemo` 包住 `dmsSliderLevels(state)`
  （保留「少于两档不给滑杆」规则仍只在 `effort.ts` 一处）。
- **复核**：菜单静止 300ms 内 DOM 变更 **0** 次（无自激重渲染）；123 项测试全绿。

### 21. 打开延迟复测（P3#9 不成立）

补齐冷/热两档数据后，此前记的 85ms 不再成立：

| 场景 | 实测 |
| --- | --- |
| 冷启动后首次打开 | **21 ms** |
| 连续开关（热） | **12 / 10 / 9 / 8 ms**（中位 ~9ms） |

即：先前 85ms 是含首帧布局与目录首次加载的一次性测量，稳态打开接近一帧。
**P3#9（全量渲染 105 行）在稳态下不是问题**，虚拟化/折叠默认值不作为建议提出。

---

## 九、第 3 轮后剩余

| 项 | 状态 |
| --- | --- |
| P2#5 切到其他 App 菜单不关 | 仍未取证（headless 无窗口遮蔽） |
| P3#12 `inject` 双重声明 | 语义等价、无运行时影响，建议随下次重构顺带处理 |
| P3#13 打开菜单快捷键 | 属新功能而非缺陷，未做 |
| 发版 | 三轮共 12 条修复未发版（tag `v0.4.3`，`main` 领先 4 个提交） |
