import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  dmsClampIndex,
  dmsCurrentModel,
  dmsEffortIndex,
  dmsEffectiveEffortIndex,
  dmsSliderLevels,
  maxEffortOf,
  EFFORT_RANK,
} from '../src/client/effort.ts'

const levels = (ids) => ids.map((id) => ({ id, label: id.toUpperCase() }))

function stateOf({ current = null, provider = 'p1', model = 'm1', efforts = null, defaultEffort = undefined } = {}) {
  const reasoning = efforts === null ? undefined : { efforts: levels(efforts ?? []), defaultEffort }
  return {
    current: current ? { provider, model, reasoningEffort: current } : null,
    groups: [{ id: provider, models: [{ id: model, reasoning }] }],
  }
}

test('EFFORT_RANK：档位序从 off 到 max 单调递增', () => {
  const ordered = ['off', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max']
  ordered.forEach((id, i) => {
    assert.equal(EFFORT_RANK[id], i)
  })
})

test('maxEffortOf：取最强档，与出现顺序无关', () => {
  assert.equal(maxEffortOf({ efforts: levels(['low', 'max', 'off']) }), 'max')
  assert.equal(maxEffortOf({ efforts: levels(['off', 'low']) }), 'low')
})

test('maxEffortOf：无档位返回 undefined', () => {
  assert.equal(maxEffortOf({ efforts: [] }), undefined)
})

test('maxEffortOf：未知档按 rank 0 参与比较（非规范 id 不会被判成"无档位"）', () => {
  assert.equal(maxEffortOf({ efforts: levels(['turbo']) }), 'turbo')
  assert.equal(maxEffortOf({ efforts: levels(['turbo', 'low']) }), 'low')
})

test('maxEffortOf：多个未知档并列时保留首个（rank 同为 0 不覆盖）', () => {
  assert.equal(maxEffortOf({ efforts: levels(['turbo', 'warp']) }), 'turbo')
})

test('dmsEffortIndex：命中返回下标，未命中与 undefined 返回 -1', () => {
  const l = levels(['off', 'low', 'high'])
  assert.equal(dmsEffortIndex(l, 'low'), 1)
  assert.equal(dmsEffortIndex(l, 'nope'), -1)
  assert.equal(dmsEffortIndex(l, undefined), -1)
  assert.equal(dmsEffortIndex([], 'off'), -1)
})

test('dmsClampIndex：0 档恒为 0，四舍五入并夹在 [0, count-1]', () => {
  assert.equal(dmsClampIndex(5, 0), 0)
  assert.equal(dmsClampIndex(5, -3), 0)
  assert.equal(dmsClampIndex(-10, 4), 0)
  assert.equal(dmsClampIndex(99, 4), 3)
  assert.equal(dmsClampIndex(1.4, 4), 1)
  assert.equal(dmsClampIndex(1.6, 4), 2)
  assert.equal(dmsClampIndex(2.5, 4), 3)
})

test('dmsCurrentModel：current 为 null、供应商缺失、模型缺失均返回 undefined', () => {
  assert.equal(dmsCurrentModel(stateOf({})), undefined)
  assert.notEqual(dmsCurrentModel(stateOf({ current: 'low', efforts: ['low'] })), undefined)
  const s = stateOf({ current: 'low', efforts: ['low'] })
  s.current.provider = 'ghost'
  assert.equal(dmsCurrentModel(s), undefined)
  const s2 = stateOf({ current: 'low', efforts: ['low'] })
  s2.current.model = 'ghost'
  assert.equal(dmsCurrentModel(s2), undefined)
})

test('dmsSliderLevels：少于两档不给滑杆（避免滑杆只有一个位置）', () => {
  assert.deepEqual([...dmsSliderLevels(stateOf({}))], [])
  assert.deepEqual([...dmsSliderLevels(stateOf({ current: 'low', efforts: ['low'] }))], [])
  assert.equal(dmsSliderLevels(stateOf({ current: 'low', efforts: ['low', 'high'] })).length, 2)
})

test('dmsEffectiveEffortIndex：用户已选优先', () => {
  const s = stateOf({ current: 'high', efforts: ['off', 'low', 'high'], defaultEffort: 'off' })
  assert.equal(dmsEffectiveEffortIndex(dmsSliderLevels(s), s), 2)
})

test('dmsEffectiveEffortIndex：已选值不在本模型档位内则退到模型默认档', () => {
  const s = stateOf({ current: 'max', efforts: ['off', 'low', 'high'], defaultEffort: 'low' })
  assert.equal(dmsEffectiveEffortIndex(dmsSliderLevels(s), s), 1)
})

test('dmsEffectiveEffortIndex：两者都不在则取中间档', () => {
  const s = stateOf({ current: 'ghost', efforts: ['off', 'low', 'medium', 'high'], defaultEffort: 'ghost' })
  assert.equal(dmsEffectiveEffortIndex(dmsSliderLevels(s), s), 1)
  const s2 = stateOf({ current: 'ghost', efforts: ['off', 'low', 'medium', 'high', 'max'], defaultEffort: undefined })
  assert.equal(dmsEffectiveEffortIndex(dmsSliderLevels(s2), s2), 2)
})

test('dmsEffectiveEffortIndex：无 reasoning（非推理模型）时不抛异常', () => {
  const s = stateOf({})
  assert.equal(dmsEffectiveEffortIndex([], s), -1)
})
