/**
 * Randomised rounds over the effort helpers.
 *
 * `effort.test.mjs` pins the hand-picked cases; this file looks for the ones
 * nobody thought of. The slider's output feeds a canvas (`progress * width`)
 * and a `select()` RPC, so a single NaN or out-of-range index is either an
 * invisible render break or a request the host rejects. Every snapshot shape
 * the official directory can actually deliver is fair game: current pointing
 * at a provider that failed to load, `reasoningEffort` that no longer exists
 * after a model switch, an adapter advertising non-canonical level ids.
 *
 * Seeded, so a failure reproduces with the seed printed in the message.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  EFFORT_RANK,
  dmsClampIndex,
  dmsCurrentModel,
  dmsEffectiveEffortIndex,
  dmsSliderLevels,
  maxEffortOf,
} from '../src/client/effort.ts'

/** Deterministic PRNG (mulberry32) — no Math.random, so rounds replay exactly. */
function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const CANONICAL = Object.keys(EFFORT_RANK)
/** Adapters are not required to use canonical ids; nothing may assume they do. */
const ODD_IDS = ['turbo', 'ultra', 'OFF', 'off ', 'thinking', '', 'max']

function pick(rand, list) {
  return list[Math.floor(rand() * list.length)]
}

function makeLevel(rand) {
  const id = rand() < 0.75 ? pick(rand, CANONICAL) : pick(rand, ODD_IDS)
  const level = { id, name: `${id}-name` }
  if (rand() < 0.6) level.description = `${id} description`
  return level
}

/** A random, structurally valid ModelDirectoryState. */
function makeState(rand) {
  const groupCount = Math.floor(rand() * 4)
  const groups = []
  for (let g = 0; g < groupCount; g += 1) {
    const models = []
    for (let m = 0, n = Math.floor(rand() * 4); m < n; m += 1) {
      const model = { id: `m${String(g)}-${String(m)}`, name: `model ${String(g)}/${String(m)}` }
      if (rand() < 0.8) {
        const efforts = []
        for (let e = 0, count = Math.floor(rand() * 8); e < count; e += 1) efforts.push(makeLevel(rand))
        model.reasoning = { efforts }
        // defaultEffort may be one of the levels, an unknown id, or absent.
        const roll = rand()
        if (roll < 0.6 && efforts.length > 0) model.reasoning.defaultEffort = pick(rand, efforts).id
        else if (roll < 0.8) model.reasoning.defaultEffort = pick(rand, [...CANONICAL, 'ghost'])
      }
      models.push(model)
    }
    groups.push({ id: `p${String(g)}`, name: `provider ${String(g)}`, models })
  }
  let current = null
  if (rand() < 0.85 && groups.length > 0) {
    const group = rand() < 0.1
      ? { id: 'p-gone', models: [] }
      : pick(rand, groups)
    const model = rand() < 0.1 || group.models.length === 0
      ? { id: 'm-gone' }
      : pick(rand, group.models)
    current = { provider: group.id, model: model.id }
    const efforts = model.reasoning?.efforts ?? []
    const roll = rand()
    if (roll < 0.45 && efforts.length > 0) current.reasoningEffort = pick(rand, efforts).id
    else if (roll < 0.6) current.reasoningEffort = pick(rand, [...CANONICAL, 'ghost'])
  }
  return {
    current,
    routable: rand() < 0.9,
    groups,
    failures: rand() < 0.2 ? [{ id: 'p-fail', name: 'failed provider', message: 'boom' }] : [],
    status: pick(rand, ['idle', 'loading', 'ready']),
    error: rand() < 0.15 ? 'some host error' : null,
  }
}

const ROUNDS = 4000
const SEED = 0x5e1f

test(`fuzz round ${ROUNDS}×: the slider never receives an out-of-range or non-finite index`, () => {
  const rand = rng(SEED)
  for (let round = 0; round < ROUNDS; round += 1) {
    const state = makeState(rand)
    const where = `seed ${String(SEED)} round ${String(round)}`
    const levels = dmsSliderLevels(state)
    // The component gates on `length >= 2`; the helper must never return 1.
    assert.ok(levels.length === 0 || levels.length >= 2, `${where}: slider got ${String(levels.length)} level(s)`)
    if (levels.length < 2) continue
    const index = dmsEffectiveEffortIndex(levels, state)
    assert.ok(Number.isInteger(index), `${where}: index ${String(index)} is not an integer`)
    assert.ok(index >= 0 && index < levels.length, `${where}: index ${String(index)} out of [0, ${String(levels.length - 1)}]`)
    assert.ok(levels[index] !== undefined, `${where}: no level at index ${String(index)}`)
    // This quotient is what the canvas multiplies by its width.
    const progress = index / (levels.length - 1)
    assert.ok(Number.isFinite(progress) && progress >= 0 && progress <= 1, `${where}: progress ${String(progress)}`)
    // A user pick that still exists must win over every fallback.
    const picked = levels.findIndex((level) => level.id === state.current?.reasoningEffort)
    if (picked >= 0) assert.equal(index, picked, `${where}: ignored the user's effort`)
  }
})

test(`fuzz round: the fallback chain is user → model default → middle`, () => {
  const rand = rng(SEED + 1)
  for (let round = 0; round < ROUNDS; round += 1) {
    const state = makeState(rand)
    const levels = dmsSliderLevels(state)
    if (levels.length < 2) continue
    const where = `seed ${String(SEED + 1)} round ${String(round)}`
    const index = dmsEffectiveEffortIndex(levels, state)
    const model = dmsCurrentModel(state)
    assert.ok(model !== undefined, `${where}: available slider without a current model`)
    const picked = levels.findIndex((level) => level.id === state.current?.reasoningEffort)
    const fallback = levels.findIndex((level) => level.id === model.reasoning?.defaultEffort)
    const expected = picked >= 0 ? picked : fallback >= 0 ? fallback : Math.floor((levels.length - 1) / 2)
    assert.equal(index, expected, `${where}: wrong fallback step (picked=${String(picked)} fallback=${String(fallback)})`)
  }
})

test(`fuzz round: dmsCurrentModel only ever returns a model from the snapshot`, () => {
  const rand = rng(SEED + 2)
  for (let round = 0; round < ROUNDS; round += 1) {
    const state = makeState(rand)
    const model = dmsCurrentModel(state)
    if (model === undefined) continue
    const found = state.groups.some((group) => group.models.some((entry) => entry === model))
    assert.ok(found, `seed ${String(SEED + 2)} round ${String(round)}: returned a model no group offers`)
  }
})

test(`fuzz round: maxEffortOf returns a real id, ranked highest, and is stable`, () => {
  const rand = rng(SEED + 3)
  for (let round = 0; round < ROUNDS; round += 1) {
    const efforts = []
    const count = Math.floor(rand() * 8)
    for (let e = 0; e < count; e += 1) efforts.push(makeLevel(rand))
    const reasoning = { efforts }
    const where = `seed ${String(SEED + 3)} round ${String(round)}`
    const best = maxEffortOf(reasoning)
    if (efforts.length === 0) {
      assert.equal(best, undefined, `${where}: empty reasoning must have no strongest level`)
      continue
    }
    assert.ok(efforts.some((level) => level.id === best), `${where}: ${String(best)} is not one of the advertised levels`)
    assert.equal(maxEffortOf(reasoning), best, `${where}: not idempotent`)
    const rankOf = (id) => EFFORT_RANK[id] ?? 0
    const maxRank = Math.max(...efforts.map((level) => rankOf(level.id)))
    assert.equal(rankOf(best), maxRank, `${where}: ${String(best)} is weaker than another level`)
    if (efforts.every((level => rankOf(level.id) === 0))) {
      assert.equal(best, efforts[0].id, `${where}: all-unknown levels must keep the first, not the last`)
    }
  }
})

test('the helpers never mutate the snapshot they read', () => {
  const rand = rng(SEED + 4)
  for (let round = 0; round < 500; round += 1) {
    const state = makeState(rand)
    const before = JSON.stringify(state)
    const levels = dmsSliderLevels(state)
    dmsEffectiveEffortIndex(levels, state)
    dmsCurrentModel(state)
    for (const level of levels) maxEffortOf({ efforts: [level, ...levels] })
    assert.equal(JSON.stringify(state), before, `seed ${String(SEED + 4)} round ${String(round)}: snapshot mutated`)
  }
})

test('clamp round: dmsClampIndex stays in range for every finite input', () => {
  const rand = rng(SEED + 5)
  for (let round = 0; round < 5000; round += 1) {
    const count = Math.floor(rand() * 9) - 1 // includes 0 and -1
    const value = (rand() - 0.5) * Math.pow(10, Math.floor(rand() * 12))
    const index = dmsClampIndex(value, count)
    const where = `seed ${String(SEED + 5)} round ${String(round)} (value=${String(value)} count=${String(count)})`
    if (count <= 0) {
      assert.equal(index, 0, `${where}: empty slider must clamp to 0`)
      continue
    }
    assert.ok(Number.isInteger(index), `${where}: ${String(index)} is not an integer`)
    assert.ok(index >= 0 && index <= count - 1, `${where}: ${String(index)} outside [0, ${String(count - 1)}]`)
  }
  // Pinned edges: the ±Infinity and NaN contracts the callers rely on.
  assert.equal(dmsClampIndex(Number.POSITIVE_INFINITY, 4), 3)
  assert.equal(dmsClampIndex(Number.NEGATIVE_INFINITY, 4), 0)
  // NaN is deliberately not swallowed. Unreachable from the UI: the pointer path
  // guards `bounds.width > 0` and the keyboard path reads a range input's value.
  assert.ok(Number.isNaN(dmsClampIndex(Number.NaN, 4)))
})
