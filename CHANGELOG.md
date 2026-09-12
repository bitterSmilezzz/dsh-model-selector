# 更新日志

本文件记录 dsh-model-selector 面向使用者的对外变更。格式参考
[Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循
[语义化版本](https://semver.org/lang/zh-CN/)。

本 CHANGELOG 自 0.1.17 起建立并回填：更早的历史以 GitHub Release 与 git tag 为准。

## [未发布]

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
