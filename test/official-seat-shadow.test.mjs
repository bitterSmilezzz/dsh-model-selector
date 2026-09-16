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
const SEAT = 'conversation.input.model'

test('官方 ui-model-selection 仍不声明 priority：本插件的 -1 遮蔽才成立', () => {
  assert.ok(
    existsSync(OFFICIAL_CLIENT),
    `找不到官方包产物 ${OFFICIAL_CLIENT}：先按 dsh-plugins 契约安装依赖（不要跑裸 pnpm install）`,
  )
  const official = readFileSync(OFFICIAL_CLIENT, 'utf8')
  assert.ok(
    official.includes(SEAT),
    '官方包不再注册 conversation.input.model 座位：遮蔽策略需重新评估（也许整个 -1 都不再需要）',
  )
  assert.doesNotMatch(
    official,
    /priority\s*:/,
    '官方开始声明 priority 了：先看它的值是否 <= -1（会让官方赢），再重新评估本插件的遮蔽策略',
  )
})
