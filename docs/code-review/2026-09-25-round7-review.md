# 2026-09-25 DSH 周期性维护（第七轮）· 只读 Code Review

## 审查范围

本轮上游无新提交：`git ls-remote origin refs/heads/master` 与本地 `origin/master`
同为 `477b4f4205`，本地 HEAD 领先两个历史补丁 commit（rc.2 之后的 sensevoice redirect
与 pi-ai sessionHeader）。npm 侧 `dist-tags` 为 `alpha: 0.1.7-alpha.2` / `next: 0.1.7-rc.2`
/ `latest: 0.1.5-rc.3`，三插件 devDeps/peerDeps 均已对齐 `^0.1.7-rc.2` 线。

因此本轮主体是**对第六轮修复的复核**（第六轮报告：`docs/code-review/2026-09-25-round6-review.md`）。

| 仓库 | 审查范围 | 受审 commit | 主题 |
| --- | --- | --- | --- |
| deepseek-harness | `477b4f4205..d5eb3665ce` | `06cb7fff23`、`b6f17f0dc4`、`d5eb3665ce` | pi-ai sessionHeader 校验 + 静态 headers 遮蔽；sensevoice 每跳 manual 重定向；本轮新增的 body 关闭与两个静默丢失修复 |
| dsh-notify | `9b74549..f2c6911` | `a0b4d89`、`d90dce0`、`aef32d3`、`f2c6911` | displayReason 本地化；退役 inject 契约移除；口径守卫加强；审批窗口加固 |
| dsh-model-selector | `7dce904..5d0731b` | `0111b9b`、`e5a188f`、`da720c9`、`5d0731b` | effort 忙态 pending + retainedEffort 钉子；口径守卫移植与加强 |
| dsh-asr-voice | `b49f2ea..a705955` | `7fcb8ab`、`a705955` | 零引用 peer optional；口径守卫加强 |

### 执行方式与失败记录

- **外部 Agent 两路均失败**：`antigravity`（任务无详情返回，与上两轮同模式）；
  `zcode`（`host process exited (code=1)`，stderr：`无法定位 CLI ZCode Built-in Provider Config`）。
- 退路：由本会话的后台只读 agent 完成审查（任务提示自包含：仓库绝对路径、commit 范围、
  上一轮修复清单、审查重点、「只读、不修改文件、不推远端」约束）。审查中该 agent 另做了
  本机回环 fetch 实验（起临时 localhost server 观测 `redirect:'manual'` 行为、读 undici
  源码确认 urlList 语义）与变异测试，沙箱与探针均已清理，未修改被审仓库。

---

## 逐条发现

### N1 · 主仓库 · `packages/experimental/speech-to-text-sensevoice/src/runtime.ts:83-96`（修复前）· **中** · 终止跳的 3xx 响应体不关闭

`requestAsset` 对**继续跟随**的跳 `await response.body?.cancel()`，但对**终止循环**的那个
3xx（`location === null` / 超 hop 预算 / 畸形 `Location`）原样返回，把关闭责任留给调用方。
`downloadAsset` 的 `!response.ok` 分支确实会兜底 cancel，所以线上不泄漏；但责任是隐式的，
doc comment 也没有声明，且没有任何断言钉住「budget 耗尽时不泄漏 body」。

**处置：已修**（见下文「修复清单」）。

### N2 · 主仓库 · `runtime.ts:58-65` · **中**（审查误判，实测纠正）· 协议降级重定向被报为会中止回落链

审查员本地实验（无 TLS server）得出「http→https 降级抛 TypeError → reason unknown → 重抛不换源」。
本会话用本机回环复测后**推翻该结论**：

| 场景 | fetch 抛出 | `classifyDownloadFailure` 判定 | 回落链 |
| --- | --- | --- | --- |
| `Location: https://127.0.0.1:1/x` | `TypeError('fetch failed')`，cause `bad port`（code undefined） | `network`（message 精确匹配 `'fetch failed'`） | **正常回落** |
| `Location: file:///etc/passwd` | `TypeError('fetch failed')`，cause code undefined | `network` | **正常回落** |
| 裸 `TypeError('fetch failed not implemented... yet...')`（message 不精确） | — | `unknown` | 中止 |

即：真实部署中命中协议降级/非 http scheme 时，回落链**不会**中断（归类为 `network`
→ 走 fallback）。审查员是把「无 cause.code 的特殊 message」形态当成了普遍情况。

**处置：不修**（结论以实测为准；`classifyDownloadFailure` 已有 message 级归类，行为正确）。

### N3 · 主仓库 · `packages/experimental/speech-to-text-sensevoice/tests/installer.spec.ts:163-165` · **中** · 注释把 stand-in 局限误归因为 `Response` 能力

原注释称「`Response` cannot carry a final URL, so a followed redirect would report the
redirecting origin here」。审查员实测证明相反：`redirect:'manual'` 下 undici 不 push
urlList，`response.url` **就是**最终跳的 URL，实现也正确取了它；stand-in 拿不到只因为
`new Response(...)` 不设 `url`。注释会让未来读者误以为生产环境 `source` 报不出真实 origin。

**处置：已修**（注释改为事实描述，并顺带修正同文件「Nine hops」措辞：实际是 8 次跳转 +
1 次终止请求 = 9 次 fetch）。

### N4 · dsh-notify / dsh-model-selector / dsh-asr-voice · `test/deps-double-listing.test.mjs` · **中** · 零引用扫描把注释当引用（三仓同款）

判据是 `readFileSync(file, 'utf8').includes(name)`。本会话做了变异实证：把
`src/client/index.ts` 里唯一真实 import 换成注释 `// provider: @deepseek-ai/dsh-client-ui-plugin-manager/client`
并剥掉该包的 optional 标记 → **守卫仍全绿**。asr-voice 版的头注释宣称「比对真实 import /
from 子句引用（排除注释与测试自身说明文字）」，实现却与 notify 版一字不差——注释宣称 A、
代码做 B，两仓都有。

当前无实际漏网（逐仓核实所有非 optional 的 `@deepseek-ai/*` peer 在 src/test 都有真实
import），但这条钉子的存在目的就是「防止再漏」，把注释当引用的尺子量不出下一次漏标。

**处置：已修**（三仓统一）。

### N5 · dsh-notify · `test/approval-callsite.test.mjs:24-27` · **低** · 4000 字符魔法窗口 + `indexOf` 定位到 import 行

`events.indexOf('NOTIFY_EVENTS.approval')` 找到的是**常量 import 行**（`NOTIFY_EVENTS`
定义在 `notify-policy.ts`，import 在 `notify-events.ts` 更靠前）而非 handler 起点；窗口宽度
固定 4000 字符，当前 handler 全长 3183，余量 817——审批分支一旦增长，超出部分静默不再被
`doesNotMatch` 覆盖。

**处置：已修**（改从 `ctx.on(NOTIFY_EVENTS.approval` 定位，右边界取下一个 `ctx.on(`，
无固定宽度；并加「切片里应包含 approvalDetailOf」自检）。

### N6 · dsh-model-selector · `test/plugin-contract.test.mjs:369-378` · **低** · `dmsEffortBusy` 守卫对多行调用不匹配

正则 `/dmsEffortBusy\(([^)]*)\)/g` 的 `[^)]*` 不含换行，三处调用目前都是单行；若有人格式化
成多行则静默漏扫。另：注释剥离 `.replace(/(^|[^:])\/\/[^\n]*/g, '$1')` 会误伤字符串里的
`//`（如 `'https://…'`），实际无害（`dmsEffortBusy(` 不出现在这种字符串里）。

**处置：不修（记录项）**。多行调用是假设性形态，改正则需引入多行解析，收益低于风险；
本轮已修的两条（N4/N5）覆盖同类「守卫强度不足」的高价值面。

### N7 · 主仓库 · `packages/llm/llm-pi-ai/src/adapter.ts:229-233`（修复前）· **低** · `sessionHeader: '__proto__'` 静默不发

`dynamic[sessionHeader] = sessionId` 是 bracket assignment，`obj['__proto__'] = v` 设置的是
原型而非 own property，`Object.keys` 为空 → session id 整个不发且不报错。`assertValidHeaders`
挡不住（实测 `new Headers([['__proto__','v']])` 在 Node 成功）。失败模式是「不发 header」
而非「发错值」，网关会以 400 报出来，实战概率极低。

**处置：已修**（见下文；`Object.assign` 同样有 setter 陷阱，故用 `fromEntries` 的 spread）。

### N8 · 主仓库 · `packages/llm/llm-pi-ai/src/config.ts:451-453`（修复前）· **低** · 空串 `sessionHeader` 合法通过校验却静默不发

`sessionHeader: ''` 时 `{ '': 'session' }`，实测 `new Headers([['','v']])` 不抛 → 校验通过，
运行期 `if (sessionHeader && sessionId)` 判假 → 静默不发。与 `headers: {'': 'v'}` 处境相同，
非本轮新引入；但本轮专门给 sessionHeader 加了校验，补非空是零成本的。

**处置：已修**（见下文）。

### 未发现问题的部分（正面确认）

- **pi-ai reserved set 与展开顺序**：`{...dynamic, ...filtered(headers), ...attribution}` 逐条
  推演无误——sessionHeader 名进 reserved ⇒ 静态同名条目（任意大小写）被 filter 掉 ⇒ 不双写；
  attribution 仍最后铺 ⇒ `user-agent` 最高。无误伤：attribution 只有 `user-agent` 一个名字。
  `attribution > sessionHeader > static headers` 的优先级声明与实现相符。
  `assertValidHeaders` 的 `field` 参数覆盖两个调用点，错误信息含 provider + field + entry name。
- **sensevoice `matchesAsset`**：`size` + `sha256` 双判足以防同长度替换。
- **hop 预算边界**：自环实测 9 次 fetch（hops 0..8），即最多 8 次跳转 + 1 次终止请求，
  `hops === MAX_REDIRECTS` 的判定正确。
- **optional peer ↔ inject 服务核对**（本轮新增 optional 是否会致回调永不执行）：

  | 仓库 | inject 服务 | 提供者包 | 提供者是否 optional | 结论 |
  | --- | --- | --- | --- | --- |
  | dsh-notify | slots / locale / configForms | ui-renderer / locale / ui-settings | 否 | 安全 |
  | dsh-notify (scoped) | connection / webServer | client-connection / host-webserver | 否 | 安全 |
  | dsh-model-selector | modelDirectories | client-store | **是** | 既有设计（web profile 必装），非本轮新增 |
  | dsh-asr-voice | slots / locale / configForms | ui-renderer / locale / ui-settings | 否 | 安全 |
  | dsh-asr-voice (scoped) | sessions / connection / remote | dsh-session / client-connection / api-gateway | 否 | 安全 |

  本轮新标的三个 optional（notify 的 `dsh-client-ui-settings-plugins`、asr 的 `dsh-agent` /
  `dsh-api-remotes`）经逐仓核实都不在任何 `ctx.inject([...])` 列表里，不构成静默失效。
  三插件的设置卡片均注册在 apply 顶层、未被包进 inject（notify `src/client/index.ts:68`、
  asr `src/client/index.ts:200-203` 的注释与代码一致）。
- **dsh-asr-voice**（除 N4）：未发现其他问题。
- **dsh-model-selector**（除 N4/N6）：`EffortSlider` 的 `state.pending` 判据正确且第三参
  可选，是纯增量；`retainedEffort` 三条钉子语义正确。

---

## 修复清单

| 编号 | 仓库 | 严重度 | 处置 | commit |
| --- | --- | --- | --- | --- |
| N1 | 主仓库 sensevoice | 中 | **已修**：walk 对终止跳的 3xx 也 `await response.body?.cancel()`；doc comment 声明该契约；`requestAsset` 改为 export 供直接单测（端到端测不出责任方，因为调用方失败路径也 cancel） | `d5eb3665ce` |
| N3 | 主仓库 sensevoice | 中 | **已修**：注释改为「stand-in 不设 `Response.url`；生产中 manual 模式下 `Response.url` 即最终跳 URL，`source` 取的是真实服务字节的 origin」；「Nine hops」改为「8 次跳转 + 1 次终止请求」 | `d5eb3665ce` |
| N4 | notify / model-selector / asr-voice | 中 | **已修**（三仓同一把尺子）：新增 `stripComments`（剥块注释 + 逐行剥引号外的行注释）与 `referencesPackage`（只认 `from '<pkg>'` / `from '<pkg>/sub'` / 动态 `import('<pkg>')`，包名整体匹配）；判据抽成 `findUnmarkedOptionalPeers` 纯函数，由真实口径守卫与变异钉子**共用同一份**；新增 2 条单元钉子 | `f2c6911` / `5d0731b` / `a705955` |
| N5 | dsh-notify | 低 | **已修**：窗口改从 `ctx.on(NOTIFY_EVENTS.approval` 起、到下一个 `ctx.on(` 止，去掉固定 4000；加切片自检 | `f2c6911` |
| N7 | 主仓库 pi-ai | 低 | **已修**：合并对象改为 `Object.fromEntries([[sessionHeader, sessionId]])` 的 spread（`Object.assign` 也有 setter 陷阱，故不用） | `d5eb3665ce` |
| N8 | 主仓库 pi-ai | 低 | **已修**：`resolveProfiles` 对空串 `sessionHeader` 抛错（与 `provider` / `displayName` / `baseURL` 的非空要求对齐） | `d5eb3665ce` |
| N2 | 主仓库 sensevoice | — | **不修**：审查结论被本会话实测推翻（协议降级/非 http scheme 均归 `network`，回落链不中断）。详见 N2 的实测表 | — |
| N6 | dsh-model-selector | 低 | **不修（记录项）**：多行调用是假设性形态，改正则需多行解析，收益低于风险 | — |

### 修复后验证（全部实跑）

| 仓库 | test | typecheck | build | lib 同步 |
| --- | --- | --- | --- | --- |
| deepseek-harness（pi-ai + sensevoice） | **456 / 456**（pi-ai 347=345+2 新，sensevoice 108=107+1 新） | EXIT 0 | — | `lib/index.js` 重新构建后含新逻辑，git 无差异 |
| deepseek-harness（全局） | pi-ai 345 / sensevoice 28 历史基线 | — | — | — |
| dsh-notify | **122 / 122**（原 120，+2） | EXIT 0 | EXIT 0 | `git diff lib` 空 |
| dsh-model-selector | **124 / 124**（原 122，+2） | EXIT 0 | EXIT 0 | `git diff lib` 空 |
| dsh-asr-voice | **336 / 336**（原 334，+2） | EXIT 0 | EXIT 0 | `git diff lib` 空 |

主仓库四步验证：`dsh-current/lib/bin.js -V` = `0.1.7-rc.2`；pi-ai 补丁在 `lib/index.js`
（`sessionHeader` 10 处）；`--profile web --dump-config` **EXIT 0 且 stderr 0 行**、
无 `disabling profile plugin`；lockfile 零改动。

### 反向验证（确认新钉子非恒真）

1. **N4 口径守卫（三仓同法）**：把 `referencesPackage` 退化为 `includes`（保留 stripComments）
   → `referencesPackage：只认真实 import 形态` 与 `零引用扫描不会被注释喂成恒真` **两条同时变红**；
   恢复后全绿。另做端到端变异：把 notify `src/client/index.ts` 的真实 import 换成注释并剥掉
   optional → 修复前守卫全绿（证明原判据失能），修复后同类操作会被点名。
2. **N5 审批窗口**：把 `approvalDetailOf(req, preferenceOf())` 改成 `req.reason`
   → 两条调用点断言**同时变红**；恢复后全绿。
3. **N1 body 关闭**：去掉终止跳的 `await response.body?.cancel()`
   → `bodyUsed` 钉子精确变红（`expected false to be true`）；恢复后全绿。
   注：第一版钉子用「cancel 次数 ≥ downloads.length」断言，实测**无法捕获**该变异
   （`downloadAsset` 的兜底 cancel 让总数仍达标）——这正是 AGENTS.md 记录的「搭便车恒真」
   形态，故改为导出 `requestAsset` 直接单测 + `bodyUsed` 判据。
4. **N7/N8**：同时把 `fromEntries` 换回 bracket assign、并删掉空串校验
   → `rejects an empty sessionHeader` 与 `rejects __proto__ as a sessionHeader` **两条同时变红**；
   恢复后全绿。

---

## 归档判断（官方功能重叠比对）

本轮上游无新提交，逐项复核既有候选：

| 候选 | 结论 |
| --- | --- |
| 官方 `ui-model-selection` `conversation.input.model` 座位 ↔ dsh-model-selector | **不重复**：官方单槽渲染者不声明 priority，本插件 `priority:-1` 遮蔽属经决策保留设计；插件侧 `test/plugin-contract.test.mjs` 与依赖侧 `test/official-seat-shadow.test.mjs` 双侧钉子均在位（本轮 124 用例全绿含此条） |
| 官方 `client-ui-voice-input`（web profile 已装 `dsh-experimental-voice-input-bundle`）↔ dsh-asr-voice | **不重复**：官方注册 `conversation.input.activity`，本插件注册 `conversation.input.right`（不同座位）；官方走本地 sensevoice，本插件多供应商云 ASR + LLM 润色 + 实时半双工对话 + 热键/长按。扩展价值明确，**不归档** |
| 官方系统通知 ↔ dsh-notify | **不重复**：官方无系统级桌面通知实现（`packages/` 下 `terminal-notifier` 0 命中） |
| 官方 `approval/request` `displayReason` ↔ notify 本地化取词 | **不重复**：host 半区无官方 LocaleFace，notify 的 `localizedTextOf`/`approvalDetailOf` 已在 v0.3.5 适配并在 `notify-policy.ts` 注释中如实标注与官方 `resolveText` 「同向但不等价」 |

**结论：三个插件均不归档。未发现新的功能重叠候选。**

---

## 安全 / 脱敏自查

- 全部 commit 的完整 diff（含 `lib/` 产物）已扫描：`sk-` / `ghp_` / `AKIA` / `AIza` /
  `xox[baprs]-` / `npm_` / `_authToken` / `-----BEGIN … PRIVATE KEY-----` / `password`|`secret`
  赋值 / 绝对路径（`/Users/<name>`） / 邮箱 / 内网 IP / `localhost:<port>` / `link:`|`file:`
  → **0 命中**。
- 本报告不含密钥与绝对路径（仓库名 + 相对路径指代）。
- 未削弱任何认证、授权或输入校验：本轮新增的是**拒绝**（空串 sessionHeader）与**显式化**
  （body 关闭责任、注释与实现一致）。

## 总计

| # | 仓库 | 位置 | 严重度 | 处置 |
| --- | --- | --- | --- | --- |
| N1 | 主仓库 sensevoice | `src/runtime.ts:83-96` | 中 | 已修 `d5eb3665ce` |
| N2 | 主仓库 sensevoice | `src/runtime.ts:58-65` | — | 不修（审查误判，已实测推翻） |
| N3 | 主仓库 sensevoice | `tests/installer.spec.ts:163-165` | 中 | 已修 `d5eb3665ce` |
| N4 | 三插件 | `test/deps-double-listing.test.mjs` | 中 | 已修 3 commits |
| N5 | dsh-notify | `test/approval-callsite.test.mjs:24-27` | 低 | 已修 `f2c6911` |
| N6 | dsh-model-selector | `test/plugin-contract.test.mjs:369-378` | 低 | 记录项，不修 |
| N7 | 主仓库 pi-ai | `src/adapter.ts:229-233` | 低 | 已修 `d5eb3665ce` |
| N8 | 主仓库 pi-ai | `src/config.ts:451-453` | 低 | 已修 `d5eb3665ce` |

**必须修：0 条遗留**（原 2 条中危 N1/N3、1 条中危 N4、3 条低危 N5/N7/N8 均已修）。
**剩余记录项：N6**（model-selector 多行调用守卫，假设性形态）。

## 复核（2026-09-25 修复后）

### 复核范围

本报告的「逐条发现」已按上表逐条实修；复核由本会话执行（外部 Agent 两路失败，见「执行方式」），
覆盖 4 个 commit（`d5eb3665ce` / `f2c6911` / `5d0731b` / `a705955`）的全部源码与测试改动。

### 复核发现的三个「修复自身」问题（均已当场处置）

1. **N4 首版钉子无效**：初版变异测试只在测试内部独立构造伪源码，未复用守卫判据 —— 把真实
   守卫改回 `includes` 后钉子**不变红**。已改为抽出 `findUnmarkedOptionalPeers` 纯函数，
   让真实口径守卫与变异钉子**共用同一份判据**（「测试里拼一份、口径里另拼一份」正是恒真的
   常见来源）。改后再变异即红（见反向验证 1）。
2. **N4 行注释剥离正则误伤自身**：初版用 `/(^|[^:'"`])\/\/[^\n]*/g` 剥行注释，把测试文件
   头部 import 行当成注释吃掉，导致文件语法错误（`SyntaxError: missing ) after argument list`）。
   已改用逐行 + 引号状态机的 `stripComments`，14 条形态用例全过（含 `code // import ... from`
   行尾注释、模板字符串内的包名、包名前缀不冒认）。
3. **N1 首版钉子搭便车**：初版用「cancel 次数 ≥ downloads.length」断言，去掉终止跳 cancel 后
   **不变红**（`downloadAsset` 失败路径的兜底 cancel 让总数仍达标）。已改为 `requestAsset`
   导出后直接单测 + `bodyUsed` 判据，变异即精确变红（见反向验证 3）。
4. **N7 首版修复无效**：初版用 `Object.assign(dynamic, Object.fromEntries(...))`，实测
   `__proto__` 仍为 undefined —— `Object.assign` 对 `__proto__` 键同样走 setter。已改为
   `fromEntries` 结果的**直接 spread**，测试转绿。

### 复核结论

4 个 commit：test + typecheck + build 全绿（456 / 122 / 124 / 336），lib 与 HEAD 一致，
主仓库四步验证全绿（含 `--profile web --dump-config` EXIT 0 / stderr 0 行）。
8 条发现中 5 条实修、1 条实测推翻、1 条记录；4 组反向验证全部通过「破坏 → 变红」。
修复过程中另发现并处置 4 个「修复自身」的缺陷（首版钉子恒真 ×2、正则自伤 ×1、
`Object.assign` setter 陷阱 ×1）。

**无遗留未修的高危 / 中危问题。**
