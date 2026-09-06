import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dmsDefaultRowKey } from '../src/client/roving.ts'

/** 与 ModelSelect 的行键构造保持一致（组id\u0000模型id / header:组id）。 */
const hit = (g, m) => `${g}\u0000${m}`
const header = (g) => `header:${g}`

test('搜索态：选中行在命中集内时以选中行为默认落点', () => {
  assert.equal(dmsDefaultRowKey({
    hitKeys: [hit('p1', 'm1'), hit('p1', 'm2')],
    modelKeys: [],
    headerKeys: [],
    selectedKey: hit('p1', 'm2'),
  }), hit('p1', 'm2'))
})

test('搜索态：选中行不在命中集内时落到首个命中', () => {
  assert.equal(dmsDefaultRowKey({
    hitKeys: [hit('p1', 'm2'), hit('p2', 'm3')],
    modelKeys: [],
    headerKeys: [],
    selectedKey: hit('p1', 'm1'),
  }), hit('p1', 'm2'))
})

test('搜索态：无选中时落到首个命中', () => {
  assert.equal(dmsDefaultRowKey({
    hitKeys: [hit('p1', 'm2')],
    modelKeys: [],
    headerKeys: [],
    selectedKey: null,
  }), hit('p1', 'm2'))
})

test('搜索态：无命中返回 null（空态由菜单外的 role=status 承担）', () => {
  assert.equal(dmsDefaultRowKey({
    hitKeys: [],
    modelKeys: [],
    headerKeys: [],
    selectedKey: hit('p1', 'm1'),
  }), null)
})

test('分组态：选中行可见时以选中行为默认落点', () => {
  assert.equal(dmsDefaultRowKey({
    hitKeys: null,
    modelKeys: [hit('p1', 'm1'), hit('p1', 'm2')],
    headerKeys: [header('p1')],
    selectedKey: hit('p1', 'm1'),
  }), hit('p1', 'm1'))
})

test('分组态：选中行在折叠组内（不可见）时落到首个可见模型行', () => {
  assert.equal(dmsDefaultRowKey({
    hitKeys: null,
    modelKeys: [hit('p1', 'm2'), hit('p2', 'm3')],
    headerKeys: [header('p1'), header('p2')],
    selectedKey: hit('p1', 'm1'),
  }), hit('p1', 'm2'))
})

test('分组态：无选中时落到首个可见模型行', () => {
  assert.equal(dmsDefaultRowKey({
    hitKeys: null,
    modelKeys: [hit('p1', 'm2')],
    headerKeys: [header('p1')],
    selectedKey: null,
  }), hit('p1', 'm2'))
})

test('分组态：全部折叠（无可见模型行）时回退首个组头', () => {
  assert.equal(dmsDefaultRowKey({
    hitKeys: null,
    modelKeys: [],
    headerKeys: [header('p1'), header('p2')],
    selectedKey: hit('p1', 'm1'),
  }), header('p1'))
})

test('分组态：连组头都没有（空目录）时返回 null', () => {
  assert.equal(dmsDefaultRowKey({
    hitKeys: null,
    modelKeys: [],
    headerKeys: [],
    selectedKey: null,
  }), null)
})
