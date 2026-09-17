/**
 * search.ts 的纯函数门禁：归一化、高亮区间、命中窗口与空态判定。
 *
 * 重点钉住两类曾经出错的边界：
 *  - 大小写/变音符折叠会改变码位长度（`'İ'.toLowerCase()` 是 `'i̇'` 两个码位），
 *    用折叠串的下标去切原串会错位甚至漏检 —— 匹配要宽容、高亮要安全；
 *  - 空态优先级：目录为空时不能显示「没有匹配关键词的模型」（那会引导用户去改
 *    关键词，而无论改什么都不会有结果）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  dmsFold,
  dmsHaystack,
  dmsMenuEmptyState,
  dmsNameHit,
  dmsNormalizeQuery,
  dmsSearchHits,
} from '../src/client/search.ts'

const group = (id, name, models) => ({ id, name, models })
const model = (id, name, extra = {}) => ({ id, name, ...extra })

function choiceOf(g, m) {
  return { group: g, model: m, haystack: dmsHaystack(g, m), selection: { provider: g.id, model: m.id } }
}

test('dmsFold：大小写、变音符与 U+0130 都折叠到可匹配的形态', () => {
  assert.equal(dmsFold('GPT-4o'), 'gpt-4o')
  assert.equal(dmsFold('café'), 'cafe')
  // U+0130（İ）裸 toLowerCase 会折成 'i̇'（i + U+0307）两个码位，与 ASCII 'i' 不匹配
  assert.equal(dmsFold('İstanbul'), 'istanbul')
  assert.equal(dmsFold('中文模型'), '中文模型')
  assert.equal(dmsFold(''), '')
})

test('dmsNormalizeQuery：去首尾空白后再折叠；空串 = 非搜索态', () => {
  assert.equal(dmsNormalizeQuery('  GPT  '), 'gpt')
  assert.equal(dmsNormalizeQuery('   '), '')
  assert.equal(dmsNormalizeQuery('İSTANBUL'), 'istanbul')
})

test('dmsNameHit：普通命中给原串区间（查询需已折叠）', () => {
  assert.deepEqual(dmsNameHit('DeepSeek V4', 'deepseek'), { start: 0, end: 8 })
  assert.deepEqual(dmsNameHit('deepseek-v4', 'v4'), { start: 9, end: 11 })
  assert.equal(dmsNameHit('deepseek', 'gpt'), null)
  assert.equal(dmsNameHit('deepseek', ''), null)
})

test('dmsNameHit：折叠改变码位长度时不给区间（宁可不标，也不能错位）', () => {
  // 'İstanbul' 的折叠串长度与原串一致（8）：区间可用，且这正是裸 toLowerCase
  // 漏检的那个用例（'i̇stanbul'.indexOf('istanbul') === -1）。
  assert.deepEqual(dmsNameHit('İstanbul', 'istanbul'), { start: 0, end: 8 })
  // 组合序列 'e' + U+0301：折叠后长度从 7 变 6，下标无法安全映射回原串。
  assert.equal(dmsNameHit('e\u0301clair', 'eclair'), null)
})

test('dmsHaystack：名称/描述/供应商名/两个 id 都进搜索文本', () => {
  const g = group('p-deepseek', 'DeepSeek', [])
  const m = model('deepseek-v4', 'V4 Flash', { description: '快速模型' })
  const hay = dmsHaystack(g, m)
  for (const needle of ['v4 flash', '快速模型', 'deepseek', 'deepseek-v4', 'p-deepseek']) {
    assert.ok(hay.includes(needle), `haystack 缺 ${needle}`)
  }
})

test('dmsSearchHits：空查询返回 null（非搜索态）', () => {
  const g = group('p', 'P', [])
  assert.equal(dmsSearchHits([choiceOf(g, model('m', 'M'))], '', 10), null)
})

test('dmsSearchHits：窗口截断只影响 items，total 仍计全部命中', () => {
  const g = group('p', 'Provider', [])
  const choices = ['alpha', 'beta', 'gamma', 'delta', 'epsilon'].map((n) => choiceOf(g, model(n, `Model ${n}`)))
  const result = dmsSearchHits(choices, 'model', 2)
  assert.equal(result.total, 5)
  assert.equal(result.items.length, 2)
  assert.deepEqual(result.items.map((h) => h.model.id), ['alpha', 'beta'])
})

test('dmsSearchHits：命中落在描述/供应商/id 上时 nameHit 为 null（不标错位置）', () => {
  const g = group('p-vendor', 'Vendor', [])
  const m = model('v4', 'V4', { description: '支持超长上下文' })
  const hit = dmsSearchHits([choiceOf(g, m)], '超长', 10)
  assert.equal(hit.total, 1)
  assert.equal(hit.items[0].nameHit, null)
  // 命中名称时给出区间
  const named = dmsSearchHits([choiceOf(g, m)], 'v4', 10)
  assert.deepEqual(named.items[0].nameHit, { start: 0, end: 2 })
})

test('dmsSearchHits：含 U+0130 的模型名能被 ASCII 小写名搜到（漏检回归）', () => {
  const g = group('p', 'Provider', [])
  const m = model('istanbul', 'İstanbul Model')
  const result = dmsSearchHits([choiceOf(g, m)], 'istanbul', 10)
  assert.equal(result.total, 1)
  assert.deepEqual(result.items[0].nameHit, { start: 0, end: 8 })
})

test('dmsMenuEmptyState：无模型优先于无命中', () => {
  // 目录为空 + 有搜索词：真相是「没有可用的模型」，不是「没有匹配关键词的模型」
  assert.equal(dmsMenuEmptyState({ status: 'ready', choiceCount: 0, searching: true, hitCount: 0 }), 'noModels')
  assert.equal(dmsMenuEmptyState({ status: 'ready', choiceCount: 0, searching: false, hitCount: 0 }), 'noModels')
  assert.equal(dmsMenuEmptyState({ status: 'ready', choiceCount: 3, searching: true, hitCount: 0 }), 'noHits')
  assert.equal(dmsMenuEmptyState({ status: 'ready', choiceCount: 3, searching: true, hitCount: 2 }), null)
  assert.equal(dmsMenuEmptyState({ status: 'ready', choiceCount: 3, searching: false, hitCount: 0 }), null)
  // 加载中不显示「没有可用的模型」（那会误导用户以为目录是空的）
  assert.equal(dmsMenuEmptyState({ status: 'loading', choiceCount: 0, searching: false, hitCount: 0 }), null)
})
