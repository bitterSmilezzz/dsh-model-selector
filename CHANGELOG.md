# 更新日志

本文件记录 dsh-model-selector 面向使用者的对外变更。格式参考
[Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循
[语义化版本](https://semver.org/lang/zh-CN/)。

本 CHANGELOG 自 0.1.17 起建立并回填：更早的历史以 GitHub Release 与 git tag 为准。

## [0.1.20] - 2026-09-16

### 变更

- **无运行时行为变更**：`lib/client.js` 与 `lib/types/*.d.ts` 逐字节未变，仅 source map 随注释再生。
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

[未发布]: https://github.com/bitterSmilezzz/dsh-model-selector/compare/v0.1.17...HEAD
[0.1.17]: https://github.com/bitterSmilezzz/dsh-model-selector/compare/v0.1.16...v0.1.17
[0.1.16]: https://github.com/bitterSmilezzz/dsh-model-selector/releases/tag/v0.1.16
