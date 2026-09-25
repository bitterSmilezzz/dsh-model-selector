# 2026-09-25 Code Review（第八轮）— DSH 周期性维护四仓库

> 审查方式：外部 Agent（antigravity 调用失败：任务无详情返回失败，与第五/六/七轮同模式；
> zcode provider 故障：`无法定位 CLI ZCode Built-in Provider Config`）→ 按规程退路由**本会话
> 后台只读 agent** 执行审查，任务提示自包含（仓库绝对路径、commit 范围、改动意图、已知陷阱、
> 只读约束）。审查 agent 未修改任何被审仓库文件、未执行 git 写操作、未跑 build。

## 一、审查范围

| 仓库 | commit 范围 | 重点文件 |
| --- | --- | --- |
| deepseek-harness | `477b4f4205..HEAD`（`06cb7fff23`、`b6f17f0dc4`、`d5eb3665ce`）+ 工作树未提交修复 | `packages/llm/llm-pi-ai/src/{adapter,config}.ts`、`packages/experimental/speech-to-text-sensevoice/src/runtime.ts`、`tests/installer.spec.ts`、`lib/` 产物 |
| dsh-notify | `HEAD~2..HEAD`（`aef32d3`、`f2c6911`，tag `v0.3.6`） | `test/deps-double-listing.test.mjs`、`test/approval-callsite.test.mjs`、`package.json` |
| dsh-model-selector | `HEAD~1..HEAD`（`5d0731b`，tag `v0.3.7`） | `test/deps-double-listing.test.mjs`、`test/official-seat-shadow.test.mjs` |
| dsh-asr-voice | `HEAD~1..HEAD`（`a705955`，tag `v0.4.5`） | `test/deps-double-listing.test.mjs`、`package.json` |

审查 agent 另做了独立取证：pi-ai `node_modules` 实际 header 合并路径（`Object.assign`）、
`@vitest/expect` 的 `toBe` 签名、`stripComments`/`referencesPackage` 变异敏感度。

## 二、发现与处置（6 条）

| # | 仓库 | 位置 | 严重度 | 处置 |
| --- | --- | --- | --- | --- |
| R1 | 主仓库 sensevoice | `lib/index.js` | 高 | **已修**：`lib/index.js`（package `main`，`dsh web` 实际加载物）是旧产物，缺 manual redirect 与 3 处 body cancel → 重跑该包 tsdown 追上 `lib/types/` |
| R2 | 主仓库 pi-ai | `src/config.ts:451-458` | 中 | **已修**：`sessionHeader` 与 attribution 保留名（`user-agent`）冲突时 attribution 后合并覆盖它，配了等于白配且无诊断 → 解析期冲突检查抛错 + 4 条回归 |
| R3 | 主仓库 pi-ai | `src/adapter.ts:230-241` | 中 | **已修**（改注释承诺 + 补钉子）：`__proto__` 名称即使成为 own property，pi-ai 侧 `Object.assign` 仍会丢弃（触发原型 setter），原注释"header 会随请求发出"超出实现 → 注释改为准确表述，并把 pi-ai 落地限制钉进测试 |
| R4 | 主仓库 sensevoice | `src/runtime.ts:67-89` | 低 | **已修**：两段连续 JSDoc（功能文档 + 导出理由）合并为一段 |
| R5 | dsh-asr-voice | `test/deps-double-listing.test.mjs:121` | 低 | **已修**：`root3` 正则路径派生改为复用文件头 `root` |
| R6 | 主仓库 sensevoice | `tests/installer.spec.ts:250-259` | — | **无问题**（审查确认本轮先行修复正确且完整：vitest 4 `toBe` 单参 + 同目录 10 个 spec 零残留） |

### 附带确认「无问题」项（7 条）

- sensevoice `requestAsset` 五个退出分支的 body 关闭覆盖 100%，18 次请求的 hop 预算钉子有效；
- sensevoice 回退链（`downloadAsset` → `prepareRuntime` 换 origin）未被破坏，`requestAsset` 签名兼容；
- pi-ai 主路径 sessionHeader（合法名 + sessionId + 静态同名头降级）行为正确、测试完备；
- notify `referencesPackage`/`stripComments` 判据与变异钉子共用同一函数，不会搭便车（实测退化为 `includes` → 2 条钉子同时红）；
- notify `approval-callsite` 窗口切片随文件增长自适应，窗口内取词点唯一；
- model-selector 座位遮蔽双侧钉子（`priority:-1` + 官方无 priority）未过度宽泛；
- asr-voice 补标的 optional peer 与零引用事实相符。

### 脱敏扫描

4 个仓库审查窗口 diff（含 `lib/` 产物与 `package.json`）扫描：密钥 / token / `/Users/<name>`
绝对路径 / 邮箱 / 内网 IP / `localhost:<port>` / `link:`|`file:` 本地依赖 → **0 命中**。

## 三、修复后的反向验证（全部「破坏 → 变红 → 恢复 → 全绿」）

1. **R2**：把 `collision` 计算改为恒 `undefined`（`false as string | undefined && …`）→
   adapter.spec 的 3 条 attribution 钉子精确红（`expected [Function] to throw error including
   'has a sessionHeader that collides…'`），恢复后 pi-ai **351/351** 全绿。
2. **R3**：把 `fromEntries` spread 退化为 `dynamic[sessionHeader] = sessionId` bracket assignment
   → `__proto__` 钉子红（`expected undefined to be 'session-1'`），恢复后 351/351 全绿。
3. **R1**：`lib/index.js` 重建后 `redirect: "manual"` 命中、`requestAsset` 三处 `body?.cancel()`
   齐备（与 `lib/types/runtime.js` 一致）。
4. **R5**：asr-voice 改后 **336/336** 全绿（该守卫的变异敏感度第七轮已反向验证，本轮不变）。

## 四、修复后全量验证矩阵

| 检查 | 结果 |
| --- | --- |
| `tsc -b tsconfig.host.json` | EXIT 0，0 行输出 |
| `tsc -b tsconfig.client.json` | EXIT 0，0 行输出 |
| pi-ai + sensevoice vitest | **460 / 460**（pi-ai 351、sensevoice 109） |
| `apps/cli/lib/bin.js -V` | `0.1.7-rc.2` |
| `--profile web --dump-config` | **EXIT 0，stderr 0 行** |
| pi-ai `lib/index.js` 含新校验 | 命中 `collides with` 1 处 |
| dsh-notify test / typecheck | **122** / EXIT 0 |
| dsh-model-selector test / typecheck | **124** / EXIT 0 |
| dsh-asr-voice test / typecheck | **336** / EXIT 0 |
| 三插件 `git diff lib` | 空（产物与源码同步） |

## 五、结论

- **高危 0 条，中危 2 条（R2、R3），低危 2 条（R4、R5），全部已修**；主仓库 1 条高危产物
  不同步（R1）已修。无遗留问题，无待用户决策项。
- 本轮先行发现并修复的 `toBe(x, 'msg')` TS2554 回归（vitest 4 `toBe` 单参）经独立审查确认
  为必要且完整，保留在主仓库同一 commit 内。
