import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  dmsMenuAbove,
  dmsBelowMaxHeight,
  dmsMenuLeft,
  MENU_MAX_HEIGHT,
  MENU_VIEWPORT_MARGIN,
} from '../src/client/menuFit.ts'

test('dmsMenuAbove：上方空间不小于下方空间时向上弹', () => {
  // trigger 中部：上 450 / 下 420 —— 上方大，向上弹
  assert.equal(dmsMenuAbove(450, 480, 900), true)
  // 上 600 / 下 270 —— 明显上方大，向上弹
  assert.equal(dmsMenuAbove(600, 630, 900), true)
})

test('dmsMenuAbove：下方空间更大时向下弹', () => {
  // trigger 贴近顶部：上 100 / 下 772 —— 向下弹
  assert.equal(dmsMenuAbove(100, 128, 900), false)
  // 上 0 / 下 900 —— 顶部贴边，向下弹
  assert.equal(dmsMenuAbove(0, 30, 900), false)
})

test('dmsMenuAbove：窗口变矮时不再要求上方空出满高', () => {
  // 矮窗口 400：trigger 上 201 / 下 229 —— 上方(201) < 下方(171)? 否，
  // 201 >= 400-229=171 成立 → 仍向上（这正是旧 bug 的回归防护：原逻辑
  // rect.top >= 440 在矮窗口永远 false，会把面板挤到下沿外）。
  assert.equal(dmsMenuAbove(201, 229, 400), true)
  // 更极端：上 100 / 下 100，矮窗口也向上（相等取上）
  assert.equal(dmsMenuAbove(100, 128, 228), true)
})

test('dmsBelowMaxHeight：按下方可用空间钳位', () => {
  // 正常情况：下方空间足够时取设计上限
  assert.equal(dmsBelowMaxHeight(100, 900, MENU_MAX_HEIGHT), MENU_MAX_HEIGHT)
  // 下方空间不足：减去视口边距
  assert.equal(dmsBelowMaxHeight(600, 900, MENU_MAX_HEIGHT), 900 - 600 - MENU_VIEWPORT_MARGIN)
  // 触发点贴底：钳到 0（不回负）
  assert.equal(dmsBelowMaxHeight(890, 900, MENU_MAX_HEIGHT), 0)
  assert.equal(dmsBelowMaxHeight(950, 900, MENU_MAX_HEIGHT), 0)
  // cap 更小时取 cap
  assert.equal(dmsBelowMaxHeight(100, 900, 200), 200)
})

test('dmsMenuLeft：seat 右缘放得下整幅菜单时保持右锚定', () => {
  // 桌面宽视口：seat 右缘 500，菜单 280 → 左缘 220 ≥ 边距 12，保持 right:0
  assert.equal(dmsMenuLeft(500, 280, 1200, MENU_VIEWPORT_MARGIN), undefined)
  // 恰好放下（左缘 == 边距）也算放得下
  assert.equal(dmsMenuLeft(292, 280, 1200, MENU_VIEWPORT_MARGIN), undefined)
})

test('dmsMenuLeft：窄窗口钳到视口左缘边距', () => {
  // seat 右缘 200，菜单 280 → 溢出 92px，钳到 left=12
  assert.equal(dmsMenuLeft(200, 280, 600, MENU_VIEWPORT_MARGIN), MENU_VIEWPORT_MARGIN)
  // seat 右缘为 0（极端）也不回负
  assert.equal(dmsMenuLeft(0, 280, 600, MENU_VIEWPORT_MARGIN), MENU_VIEWPORT_MARGIN)
})

test('dmsMenuLeft：视口放不下菜单+双边距时优先保左缘', () => {
  // 右缘边距保不住（vw-边距-宽 < 边距）时取左缘边距；右缘不越界由 CSS
  // 宽度 min(280px, 100vw-32px) 兜底，这里只验证函数自身钳形。
  assert.equal(dmsMenuLeft(150, 280, 300, MENU_VIEWPORT_MARGIN), MENU_VIEWPORT_MARGIN)
  assert.equal(dmsMenuLeft(100, 280, 200, MENU_VIEWPORT_MARGIN), MENU_VIEWPORT_MARGIN)
})

test('常量对齐设计意图', () => {
  assert.equal(MENU_MAX_HEIGHT, 420)
  assert.equal(MENU_VIEWPORT_MARGIN, 12)
})
