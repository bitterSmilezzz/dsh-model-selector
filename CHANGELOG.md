# 更新日志

本文件记录 dsh-model-selector 面向使用者的对外变更。格式参考
[Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循
[语义化版本](https://semver.org/lang/zh-CN/)。

本 CHANGELOG 自 0.1.17 起建立并回填：更早的历史以 GitHub Release 与 git tag 为准。

## [0.3.6] - 2026-09-25

### 测试

- 新增 `test/deps-double-listing.test.mjs`（3 条）：把「`@deepseek-ai/*` 依赖必须
  peer+dev 双列」「两侧版本范围一致（cordis / schemastery 按宽松策略豁免）」
  「src/test 零引用的 peer 必须标 optional」三条判据钉住。Code Review 发现 dsh-notify
  有一项零引用 peer 漏标 optional，而本仓与 asr-voice 都没有这条守卫，等于同一把尺子
  三仓只量了一仓。现三仓齐平（asr-voice v0.4.4 首发该守卫），防止口径再次分裂。
  无运行时行为变化、无 `lib/` 产物变化。

## [0.3.5] - 2026-09-25

### 修复

- **EffortSlider 的忙态判据补齐 `pending`**（Code Review 发现，中危）：`0.1.7-rc.2`
  起官方目录在 `select()` 入口即写 `pending`，而 `status` 要等 RPC 返回才翻到
  `selecting`。上一轮适配改了 `commit()` 早退与 `ModelSelect` 主忙态两处，却漏了
  `EffortSlider` 内部这处 `dmsEffortBusy(committing, state.status)`——在那段窗口期内，
  拖动与键盘路径仍会被接受（RPC 最终仍被 `commit()` 拦下，不会打到旧模型），但已产生
  preview 视觉变化，且 `is-busy` / `aria-disabled` 未置位，视觉与辅助技术反馈短暂不一致。
  现改为 `dmsEffortBusy(committing, state.status, state.pending)`。

### 测试

- 补一条**调用点级**守卫：`src/**/*.tsx` 里每一处 `dmsEffortBusy(` 调用都必须传三个
  实参（含 `pending`）。原有 `test/effort.test.mjs` 只覆盖纯函数本体，覆盖不到
  「某一处调用漏传参」这类问题——本轮正是这样漏过去的。

## [0.3.4] - 2026-09-25

### 测试

- 补 `retainedEffort` 早退分支残留旧值的行为钉子（Code Review 复核建议）：官方目录
  `syncInputs()` 在 catalog 未 ready / 未投影时用条件展开写入，`retainedEffort` 会保留
  上一次的值而非清空；新增用例钉住「旧值原样返回」「显式 `undefined` 返回 undefined」
  「空串透传」三种形状，防止未来有人顺手改成 `reasoning === undefined ? undefined : …`。
  无运行时行为变化。

## [0.3.3] - 2026-09-25

### 适配

- **跟进 DSH `0.1.7-rc.2` 官方 `ui-model-selection` 的目录「未决选择」语义**
  （`pending`）：`dmsEffortBusy` 的判据从 `status === 'selecting'` 改为
  `pending !== null`。官方目录在 `select()` 一被调用时就写入 `pending`，而 `status`
  要等 RPC 推进才翻到 `selecting`——只看 status 的这个窗口期里，滑杆拖动会被接受并与
  在途的模型切换交错（目录 select 是 last-writer-wins，effort RPC 会打到旧模型上）。
  老运行时（rc.1 及更早）没有 `pending` 字段，`undefined` 时自动退回 `status` 判据，
  向前兼容不变。
- **已选模型离开 catalog 时 effort 文案回落 `retainedEffort`**：rc.2 官方目录把
  `current` 改为「保留态」（模型/提供商从 catalog 消失后仍保留该选择），官方
  `ModelSelect` 的 `effortLabel` 在 `reasoning === undefined` 时回落到
  `state.retainedEffort`。本插件原实现直接返回 `undefined`，trigger 会莫名丢掉档位名。
  现抽出纯函数 `dmsRetainedEffortLabel` 并同规则回落。
- 定位依据：本轮 Code Review（外部 Agent 链路失败后退到本会话后台只读 agent）发现
  rc.1→rc.2 上游实为 346 commits / 3429 files 的大版本（此前 CHANGELOG「仅新增字段」
  的表述不准确，已在本段更正）；本插件上一轮零源码改动之所以正确，靠的是契约点
  (`conversation.input.model` 仍为 single、官方仍未声明 priority) 恰好没动 + 两侧钉子
  测试全绿，而非上游没动。
- 测试：新增 4 条用例（pending 优先 / pending 缺省回退 / retainedEffort 回落 /
  老运行时无该字段），`effort.test.mjs` 29 条全绿，全仓 117 条全绿 + 双 program
  typecheck + `pnpm build`。

## [0.3.2] - 2026-09-24

### 变更

- **`@deepseek-ai/*` 依赖对齐到 DSH `0.1.7-rc.2`**：peerDependencies 与 devDependencies
  双列同步升级（`dsh-api-session-controller` / `dsh-client-locale` / `dsh-client-store` /
  `dsh-client-ui-conversation` / `dsh-client-ui-model-selection` / `dsh-client-ui-primitives` /
  `dsh-client-ui-renderer` / `dsh-client-ui-slots` / `dsh-session`）。
- **未做源码适配**：已核对 rc.1→rc.2 的破坏性变更面——`conversation.input.model`
  座位仍是 `single`，官方占用者仍未声明 `priority`（本插件 `priority: -1` 遮蔽继续成立）；
  `ModelSelectInjected` 四成员签名不变；`ModelDirectoryState` 仅新增 `pending` 与可选
  `retainedEffort` 字段；官方删除的 `conversation.blocks` composer 发布逻辑本插件 0 处引用。
- 验证：113 用例全绿 + host/client 双 program typecheck + `pnpm build`（`lib/` 与全新构建
  逐字节一致，发布门禁的 `git diff --exit-code -- lib` 可通过）。

## [0.3.1] - 2026-09-24

### 修复

- **`useAnchoredMaxHeight` 的 margin 依赖改为显式**：此前不传第 4 参，靠官方默认
  `MARGIN = 12` 恰好与本插件的 `MENU_VIEWPORT_MARGIN` 相等。这是隐式巧合——上游一旦改
  默认值，本菜单与官方 Menu 的贴边距离会一边 12px 一边 N px 地静默漂移，菜单自身毫无
  察觉。现显式传 `MENU_VIEWPORT_MARGIN`，由
  `test/official-seat-shadow.test.mjs` 反向钉住「两边仍相等」（官方改了会红，届时再决定
  跟随还是显式分叉）。

### 工程

- `official-seat-shadow.test.mjs` 的 MARGIN 定位改为「函数名之前最后一个 `const MARGIN`
  声明」，替掉原先的固定 900px 字符窗口：窗口是对第三方 bundle 排版（import 数量、注释
  长短）的脆弱耦合，上游任何无关重排都会让测试红，而报错信息会误导成「成本契约变了」。
  新增一条「margin 依赖是显式的」钉子（反证过：去掉第 4 参即红）。

## [0.3.0] - 2026-09-23

### 工程

- **适配 DSH 0.1.7-rc.1 的官方图标批量改名**（源头 `4937343a5e`）：
  `IconWarningOutline16` / `IconChevronDownOutline14` / `IconCheckOutline14` /
  `IconCloseFill14` → 对应的 `…Regular`，旧名在上游已全部移除。
  四处图标都**显式传 `size={14}`**：实测这四个旧名 artwork 的默认 size 本来就是 14
  （命名与实现不一致是上游自身的坑），而新版 `Regular` 默认 `size=16`，
  不传会把 Toast 图标和菜单内的勾/叉视觉放大 2px。
- 依赖对齐：`@deepseek-ai/*` 全部 devDependencies 与 peerDependencies 抬到
  `^0.1.7-rc.1`；`useAnchoredMaxHeight` 新增第 4 个可选参 `margin`（默认 `MARGIN=12`，
  向后兼容，本菜单的 `MENU_VIEWPORT_MARGIN` 无需改）。

### 修复

- **菜单关闭判据改用 `visibilityState`**：原先用 `!document.hasFocus()` 判「窗口
  失焦」，在 iframe / 多文档场景（桌面端 WebView 承载、页面被嵌进别的文档）下，
  用户点击 iframe 外的区域时该值为 false，会把「焦点只是被外层文档拿走」误判成
  窗口失焦 → 菜单静默关掉。`hidden` 只在文档真正不可见（切标签页 / 最小化 /
  锁屏）时为真，与「用户不在看这个页面」的语义一致。


### 修复

- **修复向上弹菜单时模型列表被头部栏挤出可视区（P0）**：`useAnchoredMaxHeight` 的语义是
  「浮层底缘固定、向上生长，只钳顶缘」，trigger 靠近视口顶部时 `maxHeight` 被钳得很小；
  而 `.dms-status` / `.dms-error` / `.dms-failures` / `.dms-more` 全是 `flex: 0 0 auto`
  不参与收缩，头部 40-100px 占完后 `.dms-groups` 可视高度趋近 0，且 `.dms-menu` 是
  `overflow:hidden`——用户看到错误条却看不到也滚不到任何模型行。现在这些栏改为
  可收缩 + 相对高度上限（`flex: 0 1 auto` + `max-height: 40%/30%/20%` + 自身滚动），
  `.dms-groups` 保留 32px 保底，最坏情况是栏内自己滚动。
- **修复迟到超时回滚覆盖新提交**：快速连拖滑杆时，提交 A 的 12s 超时定时器晚于提交 B
  的成功才 reject，回滚路径没有纪元闸，会把用户已成功的 B 覆盖回 A 提交前的档位。
  现在 catch 与 finally 都先查 `commitEpochRef.current === epochAtCommit`
  （迟到 settled 属于旧意图链，不得回滚新链、也不得释放新提交的 committing 锁）。

### 变更

- 适配 DSH 0.1.6-alpha.2：`select` 契约从 `Promise<boolean>` 改为透传官方
  `RemoteResult<void> | undefined`，失败播报改用 `error.code/message`；不可选会话
  （undefined = subagent 会话）显式区分，不再当失败处理。

### 无障碍

- 搜索 0 命中时 `aria-expanded` 同步收起（原先声称已展开却指向不渲染的 listbox）。
- 搜索结果行补 `id` / `aria-setsize` / `aria-posinset`：截断到 100 条时 AT 能播报
  「这是 N 条中的第几条」，Memo 比较器同步纳入这两个 prop。

### 工程

- 新增依赖侧钉子：`MENU_VIEWPORT_MARGIN` 必须等于官方 `useAnchoredMaxHeight` 里
  未导出的 `MARGIN`（原先只在注释里声称一致）。

## [0.2.0] - 2026-09-17

多视角审查（React 正确性 / 无障碍 / 测试与发布链路）后的集中修复与加固。

### 修复

- **菜单水平钳位坐标系**：钳位算的是视口坐标，却直接写进 `.dms-root` 内的
  `absolute` 元素 `left` —— 参考系相差 root 左缘。窄窗口下菜单整体右移，横向溢出
  （`rect.right > innerWidth`）时甚至整幅画到屏外，恰是钳位要避免的现象。
- **拖动落回同一档时旋钮停在两档之间**：`commit()` 的「同档早退」跳过了 preview
  归一化，而拖动落点是未取整的分数；旋钮/进度条/画布会停在档位之间且没有 effect
  会纠正它（键盘路径不受影响）。
- **搜索漏检**：匹配用 `toLowerCase()` 后取下标切原串，而大小写/变音符折叠会改变
  码位长度 —— `İstanbul`（U+0130）用 ASCII 小写名 `istanbul` 根本搜不到。改为
  NFKD 折叠匹配 + 仅在长度不变时给高亮区间（宁可不高亮，也不画错位置）。
- **非规范档位 id 被当成「最强档」自动提交**：`maxEffortOf` 对并列未知 rank 取首个，
  于是适配器自造的档位（如 `turbo`）可能被当作最强档提交并被宿主拒绝（用户看到
  「切换失败」）。现在只自动提交已知档位（`off` 除外），否则交给宿主默认档。
- **空态优先级**：目录为空而用户又输了关键词时显示「没有匹配『x』的模型」，把用户
  引向改关键词；真相是「没有可用的模型」。无模型判定现在优先。
- **IME 确认键误切模型**：WebKit 在 `compositionend` 后补发的 Enter 带
  `isComposing === false`，中文候选上屏会直接选中首个命中并切换模型。现在除
  `isComposing` 外还认 `keyCode 229`。
- **busy 期间的悬挂菜单**：选择在途时 `onBlur` 直接返回，焦点离开菜单也不关，
  而 Escape 已不再冒泡到菜单（keydown 目标在菜单外）—— 只能靠鼠标点一下才收起。
  现在失焦照常关闭，与外部点击路径语义一致。
- **迟到 `close(true)` 抢焦点**：RPC 在途期间用户关掉菜单/移走焦点后，成功回调
  仍会 `close(true)` 把焦点从用户当前控件抢回 trigger，并清掉刚输入的搜索词。
  现在只在菜单仍打开时才关。
- **菜单内点击误关菜单**：点击内边距/标签/分组间隙等非可聚焦区域会让浏览器把焦点
  收回 body，`onBlur` 误判为「离开菜单」。现在 relatedTarget 为空时只有窗口失焦
  才关（菜单外点击由 outside-pointer 路径判定）。
- **Escape 分层把 trigger 当「菜单内」**：焦点在 trigger 上按 Esc 会被清词逻辑拽进
  搜索框，要按两次才关。
- **`locked` 关闭菜单后焦点掉回 body**：trigger 已禁用时 `focus()` 是空操作，键盘
  用户丢失位置。现在退到 root 容器（`tabIndex=-1`）承接。
- **effort 提交失败点亮「加载失败」条**：错误来源标记缺失，滑杆失败会渲染出
  加载错误条 + 无用的「重新加载」按钮。
- **迟到采纳缺模型身份判据**：超时回滚期间生效模型被外部改写时，旧模型的档位表
  算出的结果会被写回 UI（显示一个后端并未生效的档位）。判据增加「生效模型未变」。
- **同步 effect 依赖缺档位集合**：同一模型、档位个数不变但档位 id 变了（目录刷新
  把 `high` 换成 `xhigh`）时读数落到原始 id、preview 与新档位错位。

### 无障碍

- **选中行的键盘焦点完全不可见**：`:focus-visible` 与选中态用了同一个背景 token，
  而 roving 的默认落点恰恰优先选中行。焦点指示改为内描边，与选中/悬停三态两两可辨。
- **组头参与 Tab 序**：组头此前恒 `tabIndex=-1`，而「全部折叠」时 roving 默认落点
  正是首个组头 —— 没有任何元素承接 `tabIndex=0`，Tab 直接跳过整个列表。现在活动
  组头可 Tab（其余仍 -1）。
- **搜索框补 combobox 语义**：`role="combobox"` + `aria-expanded` + `aria-autocomplete`，
  搜索态结果容器为 `listbox`、行用 `option` + `aria-selected`（分组态仍是 menu /
  menuitemradio）。
- **live region 常驻**：命中计数、notice、滑杆错误此前是「插入式」live region，各
  AT 上首次播报不可靠；现在容器常驻、内容随状态更新。0 命中时不再同帧播报两条。
- **失败可见**：目录加载失败、分组失败改 `role="alert"`；`aria-busy` 从 `.dms-menu`
  移到 `role=menu` 容器，不再罩住 live region 压制播报。
- **`aria-controls` 悬空修正**：空态时结果容器不渲染，不再指向不存在的 id。
- 方向键/Home/End 在无行可去时不再吞键（搜索框内仍可移光标）；「推理」徽标的说明
  补一条视觉隐藏的 `role=note`（原先只在 `title` 上，键盘/读屏用户拿不到）。

### 变更

- 抽纯函数模块：`search.ts`（折叠/命中窗口/高亮/空态）、`keys.ts`（键盘状态机/环绕
  下标）、`copy.ts`（trigger 文案链）；行键构造收敛到 `roving.ts` 的
  `dmsRowKey`/`dmsHeaderKey`（此前 5 处各拼模板串，一次局部改名就能静默废掉 roving）。
- 座位优先级提成导出常量 `SEAT_PRIORITY`（测试改为值断言，不再扫源码文本）。
- `choose` 引用稳定化（busy/current/choices/open 经 ref 读取），Toast `onDone` 与
  滑杆失败回调稳定化：一次模型切换不再让数百行的自定义 memo 全线失效。
- `styles.ts` 的 CSS 常量加显式 `: string` 注解：`lib/types/client/styles.d.ts`
  从 19KB 字面量类型缩到几十字节。
- `files` 精确列出（不再把 `lib/tsbuildinfo` 打进本地 tarball），新增
  `validate:registry` 脚本（DSH-Store「可验证」条款）。

### 测试与发布

- 新增测试：`test/search.test.mjs`、`test/keys.test.mjs`、`test/copy.test.mjs`、
  `test/choose.test.mjs`（含 U+0130 漏检、非规范档位、Escape 分层、IME 兜底等回归）。
- **mtime 新鲜度检查换成内容指纹**：旧检查在 `git clone` 后必然 FAIL（git 按路径
  字典序写盘）、`touch` 又能绕过，且完全没覆盖真正被浏览器执行的 `lib/client.js`。
  现在 `tsdown.config.ts` 注入源码 sha256，测试比对 bundle 里的指纹与现算值。
- **座位遮蔽守卫改为值断言**：旧实现扫源码文本，一行注释即可绕过（实测）；现在读
  导出常量 + 断言 bundle 里的 `priority: -1`，并定向检查官方座位的 `kind: 'single'`
  / `scope: 'session'`（「single → chain」那一半此前从未被检查）。
- 新增 `lib/` 产物跟踪门禁（build 出新文件忘 `git add` 会被 CI 拦下）、字典解析改
  花括号配平、权限 deny-list 补 `sendBeacon`/`EventSource`/`Worker`/`indexedDB` 等。
- **新增 CI**（`.github/workflows/ci.yml`）：push/PR 跑 install → typecheck → test →
  build → `git diff --exit-code -- lib`（入库产物必须等于重建结果）。
- **publish.yml 加前置校验**：typecheck/test/build + lib 一致性 + CHANGELOG 段落
  存在性，发布成功后打 tag 并推送。

## [0.1.21] - 2026-09-16

### 变更

- **无运行时行为变更**：`lib/` 未改动，本版只新增守卫测试与文档。
- 新增**依赖侧守卫测试** `test/official-seat-shadow.test.mjs`：钉住「官方 `ui-model-selection`
  注册 `conversation.input.model` 时仍不声明 `priority`」——这是本插件 `priority: -1` 遮蔽
  成立的前提。官方若开始声明优先级（尤其 `<= -1`）或把该座位改成 chain，测试立即变红，
  而不是等用户先发现模型选择器变回了官方原生 UI。
- `README`「已知风险」补两处说明：守卫测试的存在；以及提交第三方商城（DSH-Store）时该遮蔽
  机制需要解释的要点（走官方 slot shadowing 语义，未禁用/替换任何官方 entry）。
- 回归测试 74 → 75 项。

## [0.1.20] - 2026-09-16

### 变更

- **无 UI 行为变更**：`lib/client.js` 的 loader id 与 `<style data-plugin>` 值对齐包名
  （`@bittersmilezzz/dsh-model-selector`，此前是短名 `dsh-model-selector`），source map 随
  注释再生；用户可见行为不变。
- **记录两处「官方原语不采纳」的判据**（与既有的「不用官方 `Menu`」并列，写进代码注释）：
  - 官方 `useAnchoredPosition` 的水平起点恒为 anchor 左缘、`side` 由调用方写死、返回 `fixed`
    坐标；本插件菜单默认右缘对齐 seat，且需按 trigger 上下空间自动选边，改用它等于同时改
    默认对齐、方向策略与定位模型 → 属用户可见的行为变更，故保留自研测量。
  - 官方 `Menu` 把每个条目渲染为 `<button role="menuitem">`，无法承载 effort 滑杆与搜索框。
- **新增座位契约回归测试**：钉住 `conversation.input.model` 单槽的 `priority: -1` 遮蔽关系
  （官方同名座位未传 priority 即默认 0）。官方若改该座位默认优先级、或把它从 `single` 改成
  `chain`，测试会立刻变红，而不是静默回退成官方 `ModelSelect`。
- 回归测试 73 → 74 项，双半区 typecheck 与构建全绿。

## [0.1.19] - 2026-09-15

### 变更

- **DSH 兼容**：`@deepseek-ai/*` 依赖线对齐 DSH `0.1.6-alpha.1`（peer 与 dev 双声明，约束为
  `^0.1.6-alpha.1`），并同步 `pnpm-workspace.yaml` 的 release-age 例外清单。
- 本版为纯依赖对齐，**无功能与行为变更**。双半区 typecheck、构建与 73 项回归测试全绿。

## [0.1.18] - 2026-09-13

### 变更

- **包名迁移**：`dsh-model-selector` → **`@bittersmilezzz/dsh-model-selector`**，以便发布到 npm
  registry（原短名在 npm 上已被其他作者占用）。同步更新的加载契约：`package.json` name、
  `cordis.patch.yml` 的 bundle `name`（`id` 保持短原名，实例标识不随包名变）、客户端 bundle 的
  `window.__ModuleLoader__.load({ id })`、样式注入的 `data-plugin` 标记。
  功能、配置 schema 与 UI 文案均未改动。
- **npm 首次发布**：本版是包进入 npm registry 的首个版本。
- **桌面端兼容**：客户端平台模块（`react`、`react-dom`、`@deepseek-ai/dsh-client-ui-slots`、
  `@deepseek-ai/dsh-client-ui-primitives`、`@deepseek-ai/dsh-client-store`）改标为
  **optional peer**（`peerDependenciesMeta`）。它们由 DSH 客户端的冻结模块表在运行时提供，
  不属于宿主共享包；不标 optional 会被 Desktop 的 profile 校验以 `requires missing …` 拒绝加载。

## [0.1.17] - 2026-09-12

### 新增

- **推理强度滑杆重构**：滑杆的绘制与拖动从 `ModelSelect.tsx` 的 330 行状态机中拆出
  为独立模块——`effortCanvas.ts`（canvas 辐射特效与相位缓动动画循环）与
  `effortDrag.ts`（指针拖动状态机）。拖动中途组件重渲染不再中断拖动，指针拖出输入条
  或菜单外时由 window 捕获阶段兜底。纯几何换算抽出为可测函数 `dmsPointerRaw`。
- **菜单 roving tabindex**：模型列表可达数百行，此前每行都是 Tab 停靠点，Tab 键会
  陷入行海。现在只让"活动行"留在 Tab 序里（WAI-ARIA menu 模式的通行做法），其余行
  `tabindex=-1`、仅方向键可达；默认落点按搜索态/分组态分别决策（选中行在折叠组内时
  落到首个可见行）。

### 修复

- **提交超时回滚护栏**：滑杆提交超时回滚后，迟到的成功响应不再被无条件忽略——
  当自回滚以来没有新提交改写档位、提交纪元未推进且无拖动/提交在途时，补一次 UI 同步，
  消除"UI 已回滚但后端实际已生效"的错位态。其他情况以新操作链为准。
- **终止事件幂等**：`pointercancel` 终态后平台补发的迟到 `pointerup` 不再触发重复的
  提交/回滚回调。
- **外部点击关闭后还焦**：点击菜单外关闭菜单时把焦点还给触发按钮。
- **Escape 分层**：Esc 先清搜索词，再关闭菜单，两级语义互不吞并。
- **locked 态翻转时关闭菜单**：会话锁定后菜单自动收起，避免残留可交互的失效菜单。
- **滚动与尺寸监听收敛**：测量监听改为按需动态挂载，减少常驻 scroll/resize 监听。

### 变更

- `prefers-reduced-motion: reduce` 覆盖范围扩展到折叠箭头、滑杆与 canvas 特效。
- 空态占位样式补回列表区原有位置（消息不再贴到菜单顶部）。
- **DSH 兼容**：`@deepseek-ai/*` 依赖线对齐 DSH `0.1.5-rc.2`（peer 与 dev 双声明）。
  官方 `ui-model-selection` 重写 `ModelSelect.tsx` 属**差异化增强**而非重叠——官方
  仍无搜索框、无推理滑杆、弹出方向固定向上；本插件的菜单方向自适应与搜索能力保持
  独有。

### 验证

- 双半区 typecheck（host + client）零错误，构建通过。
- 测试 **73/73** 通过（`node --test test/*.test.mjs`），新增 `effort.test.mjs`、
  `menu-fit.test.mjs`、`roving.test.mjs`。

## [0.1.16] - 2026-09-03

### 变更

- 卸载守卫（组件卸载后不再更新状态）、passive scroll 节流、分组头补 `aria` 语义。

[0.3.1]: https://github.com/bitterSmilezzz/dsh-model-selector/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/bitterSmilezzz/dsh-model-selector/compare/v0.1.17...v0.3.0
[0.1.17]: https://github.com/bitterSmilezzz/dsh-model-selector/compare/v0.1.16...v0.1.17
[0.1.16]: https://github.com/bitterSmilezzz/dsh-model-selector/releases/tag/v0.1.16
