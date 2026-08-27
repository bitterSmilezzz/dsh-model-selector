# AGENTS.md

本仓库是 DeepSeek Harness（DSH）插件仓库，隶属 `dsh-plugins` 伞仓库体系（伞目录下所有插件
仓库的契约统一治理）。

**⚑ 硬性约束（必须执行）**：本仓库的所有开发与发布工作，**一律遵守伞仓库根契约**
[`../dsh-plugins/AGENTS.md`](../dsh-plugins/AGENTS.md)（契约**单一来源**在伞仓库，本文件只作
指针、不复制内容——改契约只改伞仓库那一份）。打开本仓库的 agent 在动手前必须先读伞仓库
AGENTS.md 及其 NOTES 索引；任务结束前按伞仓库约定把经验落档到 `dsh-plugins/NOTES.md`。

必读要点索引（详见伞仓库 AGENTS.md，此处不展开）：

- **DSH-Store 准入契约**（⚑ 强制）：第三方商城 [DSH-Store](https://github.com/AI-Scarlett/dsh-safe-plugin-manager)
  的上架门禁——固定源发布 / manifest 一致 / 入口唯一且**不动任何 `@deepseek-ai/*` 官方组件**
  （含禁止 `disabled: true` 禁用官方 entry）/ 命名空间合规 / 生命周期脚本透明 / 权限保守披露 /
  README 完整 / 可验证。发布与上架前逐条自检；被拒绝（blocked）按 `statusReason` 整改后重提，
  不绕过门禁直接分发。
- **DSH 官方规则契约**（⚑ 强制）：不改 DSH 源码、契约先查 Inspect Provider、遵循官方插件
  开发规范、不破坏官方行为。
- **Pi 契约约束**（⚑ 强制）：核心最小化、不内置重功能、Context 是最贵资源、代码即真相、
  Bash 足够用等。
- **本地开发纪律**：改完立即 `git add + commit`，不攒变更；稳定后 push。
