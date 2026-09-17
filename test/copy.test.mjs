/**
 * copy.ts 的纯函数门禁：trigger 的四路文案回退链。
 *
 * 这段逻辑此前是四条互相复制的嵌套三目（drift 风险最高、零测试覆盖），
 * 抽出来后用假 t 把六种组合钉死：目录命中 / 命中但无档位 / 加载中 / 无选择 /
 * 不在目录（原始 id 回退）/ 不在目录且有档位。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dmsTriggerCopy } from '../src/client/copy.ts'

/** 假 t：带参数时把参数序列化进结果，便于断言模板参数。 */
const t = (key, params) => (params === undefined ? key : `${key}${JSON.stringify(params)}`)

const current = (provider, model, reasoningEffort) => ({
  provider,
  model,
  ...reasoningEffort === undefined ? {} : { reasoningEffort },
})

test('目录命中 + 有档位：可见文本拼档位，title 带供应商，aria 用 ariaEffort 模板', () => {
  const copy = dmsTriggerCopy({
    current: current('p', 'm', 'high'),
    modelName: 'V4 Flash',
    providerName: 'DeepSeek',
    effortLabel: 'High',
    waiting: false,
  }, t)
  assert.equal(copy.modelLabel, 'V4 Flash')
  assert.equal(copy.providerLabel, 'DeepSeek')
  assert.equal(copy.label, 'V4 Flash · High')
  assert.equal(copy.title, 'DeepSeek · V4 Flash · High')
  assert.equal(copy.aria, 'trigger.ariaEffort{"model":"DeepSeek V4 Flash","effort":"High"}')
})

test('目录命中 + 无档位（非推理模型）：不拼档位，aria 退回 aria 模板', () => {
  const copy = dmsTriggerCopy({
    current: current('p', 'm'),
    modelName: 'V4 Flash',
    providerName: 'DeepSeek',
    effortLabel: undefined,
    waiting: false,
  }, t)
  assert.equal(copy.label, 'V4 Flash')
  assert.equal(copy.title, 'DeepSeek · V4 Flash')
  assert.equal(copy.aria, 'trigger.aria{"model":"DeepSeek V4 Flash"}')
})

test('无选择 + 目录仍在加载：加载文案，provider 行不渲染', () => {
  const copy = dmsTriggerCopy({
    current: null,
    modelName: undefined,
    providerName: undefined,
    effortLabel: undefined,
    waiting: true,
  }, t)
  assert.equal(copy.modelLabel, 'trigger.loading')
  assert.equal(copy.providerLabel, undefined)
  assert.equal(copy.label, 'trigger.loading')
  assert.equal(copy.title, 'trigger.loading')
  assert.equal(copy.aria, 'trigger.loading')
})

test('无选择 + 未在加载：回退到「选择模型」与 selectAria', () => {
  const copy = dmsTriggerCopy({
    current: null,
    modelName: undefined,
    providerName: undefined,
    effortLabel: undefined,
    waiting: false,
  }, t)
  assert.equal(copy.modelLabel, 'trigger.fallback')
  assert.equal(copy.aria, 'trigger.selectAria')
})

test('不在目录（routable 但未广告）：显示 provider/model 原始 id，不显示供应商行', () => {
  const copy = dmsTriggerCopy({
    current: current('ghost-provider', 'ghost-model'),
    modelName: undefined,
    providerName: undefined,
    effortLabel: undefined,
    waiting: false,
  }, t)
  assert.equal(copy.modelLabel, 'ghost-provider/ghost-model')
  assert.equal(copy.providerLabel, undefined)
  assert.equal(copy.label, 'ghost-provider/ghost-model')
  assert.equal(copy.title, 'ghost-provider/ghost-model')
  assert.equal(copy.aria, 'trigger.aria{"model":"ghost-provider/ghost-model"}')
})

test('不在目录但解析到档位名：原始 id 与档位一起显示，aria 用 ariaEffort', () => {
  const copy = dmsTriggerCopy({
    current: current('ghost-provider', 'ghost-model', 'max'),
    modelName: undefined,
    providerName: undefined,
    effortLabel: 'Max',
    waiting: false,
  }, t)
  assert.equal(copy.label, 'ghost-provider/ghost-model · Max')
  assert.equal(copy.aria, 'trigger.ariaEffort{"model":"ghost-provider/ghost-model","effort":"Max"}')
})

test('不在目录且 current 为 null 的竞态：waiting 与 fallback 的判定优先于原始 id 拼接', () => {
  // current === null 时永远走 loading/fallback，不会拼出 "null/null"
  const copy = dmsTriggerCopy({
    current: null,
    modelName: undefined,
    providerName: undefined,
    effortLabel: 'High',
    waiting: false,
  }, t)
  assert.equal(copy.modelLabel, 'trigger.fallback')
  assert.equal(copy.label, 'trigger.fallback · High')
})
