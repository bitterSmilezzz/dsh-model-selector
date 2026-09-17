/**
 * 座位遮蔽的**依赖侧**钉子：本插件用 `priority: -1` 遮蔽官方
 * `@deepseek-ai/dsh-client-ui-model-selection` 的同名座位 `conversation.input.model`
 * （single 槽，渲染语义是「按 priority 升序取最低者」，本仓库的
 * `plugin-contract.test.mjs` 已从本插件源码侧钉住 -1）。
 *
 * 之所以还要钉依赖侧：官方当前注册该座位时**不传 priority**（即默认 0），本插件的 -1
 * 才会胜出。官方哪天显式声明 priority（尤其 <= -1）、或把该座位从 single 改成 chain，
 * 遮蔽就会**静默失效**——用户看到的是官方原生选择器而不是本插件。这条测试先变红，
 * 提醒重新评估策略，而不是等用户发现 UI 变了。
 *
 * 升级 `@deepseek-ai/*` 依赖后若它变红：去读官方 `packages/client/ui-model-selection/src/client/index.ts`
 * 的座位注册，重新评估遮蔽（不要改断言糊过去）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const OFFICIAL_CLIENT = join(
  root,
  'node_modules/@deepseek-ai/dsh-client-ui-model-selection/lib/client.js',
)
/** 座位**声明**侧（kind/scope）在 ui-conversation 的契约里，不在占用者包里。 */
const OFFICIAL_SEAT_DTS = join(
  root,
  'node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/types/client/contract/slots.d.ts',
)
const SEAT = 'conversation.input.model'

/**
 * The `{...}` block opening at `open` — braces balanced, string literals and
 * comments skipped. Scoping an assertion to one declaration/registration
 * literal is the point: a whole-artifact regex is satisfied by any occurrence
 * anywhere (the old `doesNotMatch(/priority\s*:/)` over the entire official
 * bundle went red the day the official package used the word `priority` in a
 * function that has nothing to do with this seat).
 */
function balancedSlice(text, open) {
  let depth = 0
  let i = open
  while (i < text.length) {
    const ch = text[i]
    if (ch === '"' || ch === "'" || ch === '`') {
      const quote = ch
      i += 1
      while (i < text.length) {
        if (text[i] === '\\') { i += 2; continue }
        if (text[i] === quote) { i += 1; break }
        i += 1
      }
      continue
    }
    if (ch === '/' && text[i + 1] === '/') {
      const nl = text.indexOf('\n', i)
      i = nl === -1 ? text.length : nl + 1
      continue
    }
    if (ch === '/' && text[i + 1] === '*') {
      const end = text.indexOf('*/', i + 2)
      i = end === -1 ? text.length : end + 2
      continue
    }
    if (ch === '{') depth += 1
    else if (ch === '}') {
      depth -= 1
      if (depth === 0) return text.slice(open, i + 1)
    }
    i += 1
  }
  return text.slice(open)
}

test('官方 ui-model-selection 仍不声明 priority：本插件的 -1 遮蔽才成立', () => {
  assert.ok(
    existsSync(OFFICIAL_CLIENT),
    `找不到官方包产物 ${OFFICIAL_CLIENT}：先按 dsh-plugins 契约安装依赖（不要跑裸 pnpm install）`,
  )
  const official = readFileSync(OFFICIAL_CLIENT, 'utf8')
  const seatAt = official.indexOf(SEAT)
  assert.notEqual(
    seatAt,
    -1,
    '官方包不再注册 conversation.input.model 座位：遮蔽策略需重新评估（也许整个 -1 都不再需要）',
  )
  // 只看该座位**注册处**的那个对象字面量：官方在别处（无关座位/无关函数）用 priority
  // 不该让这条测试假红，而这里声明 priority 才是真正会让遮蔽失效的情况。
  const registerAt = official.indexOf('slots.register(', seatAt)
  assert.notEqual(
    registerAt,
    -1,
    '官方不再用 slots.register 注册该座位（可能换了注册 API）：遮蔽策略需重新评估',
  )
  const open = official.indexOf('{', registerAt)
  assert.notEqual(open, -1, '官方注册处的参数形状变了：遮蔽策略需重新评估')
  const registration = balancedSlice(official, open)
  assert.match(
    registration,
    /name:\s*["']conversation\.input\.model["']/,
    '官方注册处的座位名变了：遮蔽策略需重新评估',
  )
  assert.doesNotMatch(
    registration,
    /priority\s*:/,
    '官方开始在该座位注册处声明 priority 了：先看它的值是否 <= -1（会让官方赢），再重新评估本插件的遮蔽策略',
  )
})

test('官方 ui-conversation 仍把 conversation.input.model 声明为 single/session 座位', () => {
  // 文档一直声称「本插件靠 single 槽的 lowest-priority-wins 遮蔽」，但这条声明侧的
  // 前提此前从未被任何测试读过。官方把 kind 改成 chain（每项都参与渲染）时，-1 就不再
  // 意味着「赢」，而是「多渲染一个」。
  assert.ok(
    existsSync(OFFICIAL_SEAT_DTS),
    `找不到官方座位声明 ${OFFICIAL_SEAT_DTS}：先按 dsh-plugins 契约安装依赖（不要跑裸 pnpm install）`,
  )
  const dts = readFileSync(OFFICIAL_SEAT_DTS, 'utf8')
  const seatAt = dts.indexOf(`'${SEAT}'`)
  assert.notEqual(seatAt, -1, `官方 ui-conversation 不再声明 ${SEAT} 座位：遮蔽策略需重新评估`)
  const open = dts.indexOf('{', seatAt)
  assert.notEqual(open, -1, `${SEAT} 的声明形状变了（不再是对象字面量）：遮蔽策略需重新评估`)
  const declaration = balancedSlice(dts, open)
  assert.match(
    declaration,
    /kind:\s*'single'/,
    `${SEAT} 不再是 single 槽：-1 不再等于「赢」，遮蔽策略需重新评估`,
  )
  assert.match(
    declaration,
    /scope:\s*'session'/,
    `${SEAT} 不再是 session 作用域：本插件按 sessionId 构造注入面的前提变了`,
  )
})
