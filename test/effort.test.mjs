import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  dmsClampIndex,
  dmsCurrentModel,
  dmsEffortIndex,
  dmsEffectiveEffortIndex,
  dmsEffortBusy,
  dmsShouldAdoptLateSuccess,
  dmsSliderLevels,
  dmsPointerRaw,
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

test('dmsEffortBusy：自身提交中或目录上有 select 在途都算忙（滑杆拒绝交互）', () => {
  for (const status of ['idle', 'loading', 'ready', 'error']) {
    assert.equal(dmsEffortBusy(false, status), false, `status=${status} 且未在提交 → 不忙`)
  }
  // 共享目录的 select 是 last-writer-wins：模型切换在途时滑杆必须同样拒绝，
  // 否则 effort RPC 与模型切换交错、打到旧模型上（第七轮回归防护）。
  assert.equal(dmsEffortBusy(false, 'selecting'), true, '模型切换在途 → 忙')
  assert.equal(dmsEffortBusy(true, 'ready'), true, '自身提交中 → 忙')
  assert.equal(dmsEffortBusy(true, 'selecting'), true, '两者叠加 → 忙')
})

test('dmsShouldAdoptLateSuccess：回滚后无新提交/无拖动时采纳迟到成功', () => {
  // committedRef 仍等于回滚前的 previous、无拖动、无提交在途 → 迟到成功仍对应当前链
  assert.equal(dmsShouldAdoptLateSuccess('low', 'low', false, false), true)
})

test('dmsShouldAdoptLateSuccess：新提交已改写 committedRef 时不采纳', () => {
  // 用户超时后又提交成功到别的档（committedRef 已变成 'high'）→ 迟到结果作废
  assert.equal(dmsShouldAdoptLateSuccess('high', 'low', false, false), false)
})

test('dmsShouldAdoptLateSuccess：拖动中或提交在途时不采纳（防止覆盖活动操作）', () => {
  assert.equal(dmsShouldAdoptLateSuccess('low', 'low', true, false), false, '拖动中')
  assert.equal(dmsShouldAdoptLateSuccess('low', 'low', false, true), false, '提交在途')
})

test('dmsPointerRaw：指针水平位置线性映射到档位区间（未取整，拖动中途落两档之间）', () => {
  // 4 档（0..3）：宽 300，起点 100 → 指针在左缘=0、中点=1.5、右缘=3
  assert.equal(dmsPointerRaw(100, 100, 300, 4, 0), 0)
  assert.equal(dmsPointerRaw(250, 100, 300, 4, 0), 1.5)
  assert.equal(dmsPointerRaw(400, 100, 300, 4, 0), 3)
  // 越界双向夹在 [0, count-1]
  assert.equal(dmsPointerRaw(50, 100, 300, 4, 0), 0)
  assert.equal(dmsPointerRaw(999, 100, 300, 4, 0), 3)
})

test('dmsPointerRaw：输入条退化时保持当前值（宽度 ≤ 0 或档位数 < 2）', () => {
  assert.equal(dmsPointerRaw(250, 100, 0, 4, 2), 2)
  assert.equal(dmsPointerRaw(250, 100, -5, 4, 2), 2)
  assert.equal(dmsPointerRaw(250, 100, 300, 1, 1), 1)
  assert.equal(dmsPointerRaw(250, 100, 300, 0, 0), 0)
})
