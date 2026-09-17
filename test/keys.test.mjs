/**
 * keys.ts 的纯函数门禁：菜单键盘状态机与 roving 环绕下标。
 *
 * 这些分支此前只活在 onRootKeyDown 里，靠浏览器手测；其中三条是审查发现的
 * 真实缺陷（都写成回归用例）：
 *  - Escape 分层把 trigger 也算「菜单内」→ 焦点在 trigger 上按 Esc 被清词逻辑拽走；
 *  - 列表为空时仍吞掉搜索框的上下键（什么也不发生）；
 *  - Safari 的 IME 确认 Enter（isComposing=false，keyCode 229）没有兜底。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dmsMenuKeyAction, dmsNextRowIndex } from '../src/client/keys.ts'

/** 默认输入：菜单开着、焦点在搜索框、有 3 行、命中 3 条。 */
function input(overrides = {}) {
  return {
    key: 'ArrowDown',
    composing: false,
    open: true,
    fromSearch: true,
    inMenu: true,
    onNonInput: false,
    hasQuery: false,
    rowCount: 3,
    hitCount: 3,
    ...overrides,
  }
}

test('组合输入期间任何按键都不劫持（isComposing / Safari 的 keyCode 229 由调用方折算）', () => {
  for (const key of ['Enter', 'Escape', 'ArrowDown', 'Home', 'End']) {
    assert.deepEqual(dmsMenuKeyAction(input({ key, composing: true, hasQuery: true })), { type: 'none' }, key)
  }
})

test('Escape：查询非空且焦点在菜单内时只清词，焦点不在搜索框才还焦', () => {
  assert.deepEqual(
    dmsMenuKeyAction(input({ key: 'Escape', hasQuery: true, fromSearch: true })),
    { type: 'clearQuery', focusSearch: false },
  )
  // 焦点在列表行上：清词会让命中行卸载，焦点还回搜索框（避免掉 body）
  assert.deepEqual(
    dmsMenuKeyAction(input({ key: 'Escape', hasQuery: true, fromSearch: false, onNonInput: true })),
    { type: 'clearQuery', focusSearch: true },
  )
})

test('Escape：焦点在 trigger（不在菜单内）时直接关，不被清词逻辑拽进搜索框', () => {
  // 回归：旧实现用 rootRef.contains 判定「菜单内」，trigger 也在 root 里，
  // 于是「打开菜单后马上按 Esc」会被清词 + 抢焦点，要按两次才关。
  assert.deepEqual(
    dmsMenuKeyAction(input({ key: 'Escape', hasQuery: true, inMenu: false, fromSearch: false, onNonInput: true })),
    { type: 'close' },
  )
})

test('Escape：查询为空时关菜单；菜单未打开时不动', () => {
  assert.deepEqual(dmsMenuKeyAction(input({ key: 'Escape', hasQuery: false })), { type: 'close' })
  assert.deepEqual(dmsMenuKeyAction(input({ key: 'Escape', hasQuery: true, open: false })), { type: 'none' })
})

test('方向键：搜索框内或焦点不在 input 上时进列表，滑杆上不劫持', () => {
  assert.deepEqual(dmsMenuKeyAction(input({ key: 'ArrowDown' })), { type: 'moveFocus', offset: 1 })
  assert.deepEqual(
    dmsMenuKeyAction(input({ key: 'ArrowUp', fromSearch: false, onNonInput: true })),
    { type: 'moveFocus', offset: -1 },
  )
  // range 滑杆（input）上的方向键归它自己调档
  assert.deepEqual(
    dmsMenuKeyAction(input({ key: 'ArrowUp', fromSearch: false, onNonInput: false })),
    { type: 'none' },
  )
})

test('方向键：无行可去时不吞键（搜索框里上下键仍可移光标）', () => {
  assert.deepEqual(dmsMenuKeyAction(input({ key: 'ArrowDown', rowCount: 0 })), { type: 'none' })
  assert.deepEqual(dmsMenuKeyAction(input({ key: 'ArrowUp', rowCount: 0 })), { type: 'none' })
})

test('Home/End：仅焦点不在 input 上时跳首末；无行时不吞键', () => {
  assert.deepEqual(
    dmsMenuKeyAction(input({ key: 'End', fromSearch: false, onNonInput: true })),
    { type: 'focusEdge', last: true },
  )
  assert.deepEqual(
    dmsMenuKeyAction(input({ key: 'Home', fromSearch: false, onNonInput: true })),
    { type: 'focusEdge', last: false },
  )
  // 搜索框内的 Home/End 是移光标键
  assert.deepEqual(dmsMenuKeyAction(input({ key: 'Home' })), { type: 'none' })
  assert.deepEqual(
    dmsMenuKeyAction(input({ key: 'End', fromSearch: false, onNonInput: true, rowCount: 0 })),
    { type: 'none' },
  )
})

test('Enter：只有搜索框内且有命中时才选首个命中', () => {
  assert.deepEqual(dmsMenuKeyAction(input({ key: 'Enter' })), { type: 'chooseFirstHit' })
  assert.deepEqual(dmsMenuKeyAction(input({ key: 'Enter', hitCount: 0 })), { type: 'none' })
  // 焦点在滑杆等控件上：Enter 不该把用户的选择抢走
  assert.deepEqual(
    dmsMenuKeyAction(input({ key: 'Enter', fromSearch: false, onNonInput: false })),
    { type: 'none' },
  )
})

test('dmsNextRowIndex：环绕、入口方向与退化输入', () => {
  // 已在某行上：按 offset 循环
  assert.equal(dmsNextRowIndex(0, 1, 3), 1)
  assert.equal(dmsNextRowIndex(2, 1, 3), 0)
  assert.equal(dmsNextRowIndex(0, -1, 3), 2)
  // 焦点不在任何行上：向下从首行进、向上从末行进
  assert.equal(dmsNextRowIndex(-1, 1, 3), 0)
  assert.equal(dmsNextRowIndex(-1, -1, 3), 2)
  // 单行：怎么走都停在它上面
  assert.equal(dmsNextRowIndex(0, 1, 1), 0)
  assert.equal(dmsNextRowIndex(-1, -1, 1), 0)
  // 无可去之处
  assert.equal(dmsNextRowIndex(0, 1, 0), -1)
  assert.equal(dmsNextRowIndex(-1, -1, -1), -1)
})
