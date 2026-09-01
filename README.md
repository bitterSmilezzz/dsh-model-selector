# dsh-model-selector

DeepSeek Harness (DSH) 的**增强模型选择器（Model Selector）**：单层菜单（搜索 + 分组）+ 底部内联推理强度（Reasoning Effort）滑杆。从 dsh-ui-tweaks 按功能拆分出的独立插件包。

## 功能

- 替换官方输入区的模型选择 seat（`conversation.input.model`，shadow 方式叠加，不禁用官方组件）
- 单层模型菜单：名称搜索过滤 + 提供商分组折叠，选中行与供应商标可见高亮
- 菜单高度按视口实测钳位，弹出方向自适应（取上下空间更大一侧），矮窗口自动收不溢出
- 键盘可完整操作：方向键在结果间移动、搜索框内 Enter 选中首个命中、Escape 关闭并还原焦点
- 选中模型后可展开底部内联**推理强度滑杆**，实时显示当前档位名与该档位说明
- 切换被宿主拒绝时，失败原因用官方 Toast 在输入区上方播报（菜单已关闭也能看到）
- 选择推理模型会自动落到**最强思考档**，并在成功后提示落到的档位（行上有「推理」标记说明）
- 与 `/model` 弹窗共用官方 `modelDirectories` 目录，两处实时同步

## 安装

```bash
dsh plugin --profile <profile> add github:bitterSmilezzz/dsh-model-selector
# 或本地路径
dsh plugin --profile <profile> add <path-to-repo>
```

启用后刷新浏览器页面（web profile），模型选择器即替换输入区原 seat。

## 配置

无设置项（纯 UI 插件），不占用「设置 → 插件 → 配置」卡片位。

## 外部依赖

- macOS / Windows / Linux 通用，无系统级依赖。
- 运行时依赖 DSH web profile（client 半区），需要 `@deepseek-ai/dsh-client-ui-slots` 等官方注入包（见 package.json peerDependencies）。
- 生命周期脚本：**无**（无 preinstall/install/postinstall/prepare）。

## 权限

**权限等级：low**。纯 client UI：不注册 host 工具、不读写宿主文件、不访问凭据、不发起自有网络请求。

模型目录与切换动作走**官方 session RPC**（`ctx.remote.session` 的目录加载与 `selectModel`），与官方模型选择器使用同一条通道、同一份 `modelDirectories` 目录状态；除此之外不与宿主通信。UI 反馈（Toast、图标、浮层定位）运行时复用官方 `@deepseek-ai/dsh-client-ui-primitives`。

## 已知风险

- 通过 slot 优先级（priority: -1）**shadow 官方 seat**：若官方后续改动该 seat 的注入面（`ModelSelectInjected`），需同步适配；这是官方认可的 slot 叠加机制，并非禁用官方 entry。
- 与其它也 shadow `conversation.input.model` 的插件同时安装时，优先级决定渲染赢家，可能互相覆盖（本插件优先级 -1 最低，默认胜出）。

## 开发

标准双半区结构，`lib/` 为构建产物：

```bash
pnpm install
pnpm typecheck   # 双 program（host + client）
pnpm build       # tsc host + tsdown client bundle
```

## License

MIT