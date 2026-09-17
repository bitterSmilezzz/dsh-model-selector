/**
 * effort.ts 里「选中模型时的自动拉档决策」门禁。
 *
 * choose() 此前用字面量比较 `max === 'off'` 并把 maxEffortOf 的结果直接提交：
 * 适配器给出非规范档位 id（'turbo'）时，maxEffortOf 取并列 rank 0 的**首个**，
 * 于是可能把最弱的档当「最强档」提交、还被宿主拒（用户看到「切换失败」）。
 * dmsChoosePlan 把判据收敛成「已知 rank 的档位才自动提交」。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dmsChoosePlan, dmsEffortRank, maxEffortOf } from '../src/client/effort.ts'

const levels = (ids) => ids.map((id) => ({ id, name: id.toUpperCase() }))
const reasoning = (ids, defaultEffort) => ({
  efforts: levels(ids),
  ...defaultEffort === undefined ? {} : { defaultEffort },
})

test('dmsEffortRank：已知档给秩，非规范 id 给 undefined（与 off 的 0 区分）', () => {
  assert.equal(dmsEffortRank('off'), 0)
  assert.equal(dmsEffortRank('high'), 4)
  assert.equal(dmsEffortRank('max'), 6)
  assert.equal(dmsEffortRank('turbo'), undefined)
  assert.equal(dmsEffortRank(''), undefined)
  assert.equal(dmsEffortRank('constructor'), undefined, '原型链上的键不算已知档位')
})

test('dmsChoosePlan：非推理模型 / 无档位 / 只有 off 都不提交 effort', () => {
  assert.deepEqual(dmsChoosePlan(undefined), { effort: undefined, autoRaised: false })
  assert.deepEqual(dmsChoosePlan(reasoning([])), { effort: undefined, autoRaised: false })
  assert.deepEqual(dmsChoosePlan(reasoning(['off'])), { effort: undefined, autoRaised: false })
})

test('dmsChoosePlan：提交已知最强档，默认档相同则不播报', () => {
  assert.deepEqual(dmsChoosePlan(reasoning(['off', 'low'])), { effort: 'low', autoRaised: true })
  assert.deepEqual(dmsChoosePlan(reasoning(['off', 'low'], 'low')), { effort: 'low', autoRaised: false })
  assert.deepEqual(dmsChoosePlan(reasoning(['low', 'high', 'max'])), { effort: 'max', autoRaised: true })
  assert.deepEqual(dmsChoosePlan(reasoning(['low', 'high', 'max'], 'max')), { effort: 'max', autoRaised: false })
})

test('dmsChoosePlan：非规范档位 id 不自动提交（回归：曾把首个未知档当最强档）', () => {
  // maxEffortOf 对并列 rank 0 取首个 —— 但它并不是「最强」，不能替用户提交
  assert.equal(maxEffortOf(reasoning(['turbo'])), 'turbo')
  assert.deepEqual(dmsChoosePlan(reasoning(['turbo'])), { effort: undefined, autoRaised: false })
  assert.deepEqual(dmsChoosePlan(reasoning(['turbo', 'warp'])), { effort: undefined, autoRaised: false })
  // 有已知档时已知档胜出，非规范档不影响结论
  assert.deepEqual(dmsChoosePlan(reasoning(['turbo', 'low'])), { effort: 'low', autoRaised: true })
  assert.deepEqual(dmsChoosePlan(reasoning(['turbo', 'off', 'high'])), { effort: 'high', autoRaised: true })
})

test('dmsChoosePlan：默认档是非规范 id 时仍按已知最强档提交并播报', () => {
  assert.deepEqual(dmsChoosePlan(reasoning(['low', 'high'], 'turbo')), { effort: 'high', autoRaised: true })
})
