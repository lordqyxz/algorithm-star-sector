import test from 'node:test'
import assert from 'node:assert/strict'
import { knapsackExperiment as k } from '../src/game/simulation/experiment-knapsack.ts'

const act = (state, action) => k.apply(state, action).state
const select = (state, row, capacity) => act(state, { type: 'selectCell', row, capacity })
const connect = (state, take, row, capacity) => act(state, { type: 'connectDependency', take, row, capacity })
const oracle = (state) => {
  let best = 0
  for (let mask = 0; mask < 16; mask++) {
    let w = 0, v = 0
    for (let i = 0; i < 4; i++) if (mask & (1 << i)) { w += state.input.weights[i]; v += state.input.values[i] }
    if (w <= state.input.capacity) best = Math.max(best, v)
  }
  return best
}
const prefixOracle = (state, row, capacity) => {
  let best = 0
  for (let mask = 0; mask < 1 << row; mask++) {
    let weight = 0, value = 0
    for (let i = 0; i < row; i++) if (mask & (1 << i)) { weight += state.input.weights[i]; value += state.input.values[i] }
    if (weight <= capacity) best = Math.max(best, value)
  }
  return best
}

test('bounded flat input validates every field', () => {
  const state = k.create(0, { capacity: 12, w1: 9, v1: 20, w4: 1, v4: 1 })
  assert.deepEqual(k.fields(state).map((f) => f.id), ['capacity', 'w1', 'v1', 'w2', 'v2', 'w3', 'v3', 'w4', 'v4'])
  for (const bad of [{ capacity: 0 }, { capacity: 13 }, { w2: 0 }, { w2: 10 }, { v3: 21 }, { w1: 2.5 }, { extra: 2 }, { v4: NaN }])
    assert.throws(() => k.create(0, bad), RangeError)
})

test('matrix frame exposes four clickable item cards with current weights and values', () => {
  const state = k.create(0, { w1: 9, v1: 20, w4: 1, v4: 1 })
  const frame = k.frame(state)
  assert.ok(frame.matrix)
  assert.deepEqual(frame.items.map((x) => x.id), ['item1', 'item2', 'item3', 'item4'])
  assert.deepEqual(frame.items.map((x) => x.value), state.input.weights.map((w, i) => `w=${w} · v=${state.input.values[i]}`))
  assert.deepEqual(frame.items.map((x) => x.label), ['i=1', 'i=2', 'i=3', 'i=4'])
  assert.equal(frame.groups, undefined)
  const selected = act(state, { type: 'toggleItem', id: 'item4' })
  assert.equal(k.frame(selected).items[3].tone, 'settled')
})

test('all cells are selectable; wrong same-row dependency stays draft and cannot write', () => {
  let state = select(k.create(0), 2, 5)
  assert.ok(k.choices(state).some((x) => x.action.type === 'selectCell' && x.action.row === 3 && x.action.capacity === 2))
  state = connect(state, false, 1, 5)
  state = connect(state, true, 2, 2)
  assert.equal(state.draftDependency.take.row, 2)
  assert.equal(k.frame(state).matrix.links[1].from[0], 2)
  assert.equal(k.report(state).strategy.key, 'experiment.knapsack.policyHolds')
  const rejected = k.apply(state, { type: 'write', take: true })
  assert.equal(rejected.changed, false)
  assert.equal(rejected.state, state)
  assert.equal(state.cells['2:5'], undefined)
  assert.equal(state.costs.decisions, 0)
})

test('study computes prerequisites once, without filling the selected cell', () => {
  let state = select(k.create(0), 3, 5)
  state = act(state, { type: 'studyCell' })
  assert.equal(state.cells['3:5'], undefined)
  assert.ok(state.cells['2:5'])
  assert.ok(state.cells['2:1'])
  assert.equal(k.frame(state).matrix.values[3][5], '?')
  const auto = state.costs.autoCells
  state = act(state, { type: 'studyCell' })
  assert.equal(state.costs.autoCells, auto)
})

test('every cell candidate agrees with independent subset enumeration', () => {
  for (const v of [0, 1]) {
    const initial = k.create(v)
    for (let row = 1; row <= 4; row++) for (let capacity = 0; capacity <= initial.input.capacity; capacity++) {
      let state = select(initial, row, capacity)
      state = connect(state, false, row - 1, capacity)
      const weight = initial.input.weights[row - 1]
      if (weight <= capacity) state = connect(state, true, row - 1, capacity - weight)
      const skip = act(state, { type: 'write', take: false })
      assert.equal(skip.cells[`${row}:${capacity}`].value, prefixOracle(initial, row - 1, capacity))
      if (weight <= capacity) {
        const take = act(state, { type: 'write', take: true })
        assert.equal(take.cells[`${row}:${capacity}`].value, initial.input.values[row - 1] + prefixOracle(initial, row - 1, capacity - weight))
        assert.equal(Math.max(skip.cells[`${row}:${capacity}`].value, take.cells[`${row}:${capacity}`].value), prefixOracle(initial, row, capacity))
      } else assert.equal(skip.cells[`${row}:${capacity}`].value, prefixOracle(initial, row, capacity))
    }
  }
})

test('nonterminal cell can keep a feasible inferior choice, then invalidate descendants when rewritten', () => {
  let state = select(k.create(0), 2, 5)
  state = connect(state, false, 1, 5)
  state = connect(state, true, 1, 2)
  state = act(state, { type: 'write', take: false })
  assert.equal(state.cells['2:5'].value, 4)
  assert.equal(state.policy, false)
  assert.equal(state.costs.decisions, 1)
  state = select(state, 3, 5)
  state = connect(state, false, 2, 5)
  state = connect(state, true, 2, 1)
  state = act(state, { type: 'write', take: false })
  assert.ok(state.cells['3:5'])
  state = select(state, 2, 5)
  state = connect(state, false, 1, 5)
  state = connect(state, true, 1, 2)
  state = act(state, { type: 'write', take: true })
  assert.equal(state.cells['2:5'].value, 9)
  assert.equal(state.cells['3:5'], undefined)
  assert.equal(state.policy, true)
})

test('automatic descendants of a low manual cell remain visibly uncertified until invalidated', () => {
  let state = select(k.create(0), 1, 2)
  state = connect(state, false, 0, 2)
  state = connect(state, true, 0, 0)
  state = act(state, { type: 'write', take: false })
  assert.equal(state.cells['1:2'].value, 0)
  assert.equal(state.cells['1:2'].certified, false)
  state = select(state, 3, 2)
  const studied = k.apply(state, { type: 'studyCell' })
  state = studied.state
  assert.equal(studied.feedback.key, 'experiment.knapsack.studiedTainted')
  assert.equal(state.cells['2:2'].value, 0)
  assert.equal(state.cells['2:2'].source, 'auto')
  assert.equal(state.cells['2:2'].certified, false)
  assert.equal(k.frame(state).matrix.values[2][2], '0?')
  assert.match(k.formula(state), /0\^\{\?\}/)
  assert.equal(k.report(state).strategy.key, 'experiment.knapsack.policyDeviated')
  assert.ok(k.report(state).evidence.some((x) => x.key === 'experiment.knapsack.taintedCells'))
  assert.equal(state.costs.autoCells, 1)
  state = select(state, 1, 2)
  state = connect(state, false, 0, 2)
  state = connect(state, true, 0, 0)
  state = act(state, { type: 'write', take: true })
  assert.equal(state.cells['1:2'].value, 4)
  assert.equal(state.cells['1:2'].certified, true)
  assert.equal(state.cells['2:2'], undefined)
  assert.equal(state.policy, true)
  assert.equal(state.costs.autoCells, 1)
})

test('equal-valued branches both accepted and cell solution restores actual item set', () => {
  let state = k.create(0, { capacity: 4, w1: 2, v1: 5, w2: 2, v2: 5 })
  state = select(state, 2, 2)
  state = connect(state, false, 1, 2)
  state = connect(state, true, 1, 0)
  const skip = act(state, { type: 'write', take: false })
  const take = act(state, { type: 'write', take: true })
  assert.equal(skip.cells['2:2'].value, 5)
  assert.equal(take.cells['2:2'].value, 5)
  assert.equal(skip.policy, true)
  assert.equal(take.policy, true)
  assert.notDeepEqual(skip.cells['2:2'].mask, take.cells['2:2'].mask)
  const picked = act(take, { type: 'useCellSolution' })
  assert.deepEqual(picked.selectedItems, ['item2'])
  assert.equal(k.frame(picked).counters.value, 5)
})

test('subset verify uses exhaustive oracle and never substitutes the reference value', () => {
  for (const v of [0, 1]) {
    let state = k.create(v)
    state = act(state, { type: 'toggleItem', id: 'item1' })
    state = act(state, { type: 'verify' })
    const result = k.frame(state).result
    assert.equal(result.optimum, oracle(state))
    assert.equal(result.value, state.input.values[0])
    assert.equal(result.optimal, result.value === result.optimum)
    assert.equal(state.costs.tests, 1)
  }
  let overweight = k.create(0)
  for (const i of [1, 2, 3, 4]) overweight = act(overweight, { type: 'toggleItem', id: `item${i}` })
  assert.equal(k.report(overweight).feasibility.key, 'experiment.knapsack.overweight')
  overweight = act(overweight, { type: 'verify' })
  assert.equal(k.frame(overweight).result.feasible, false)
  assert.equal(k.frame(overweight).result.optimal, false)
})

test('done requires an actually optimal feasible selected subset', () => {
  const initial = k.create(0)
  const empty = act(initial, { type: 'verify' })
  assert.equal(k.frame(empty).op, 'update')
  assert.equal(k.frame(empty).result.optimal, false)

  const lesser = act(act(initial, { type: 'toggleItem', id: 'item1' }), { type: 'verify' })
  assert.equal(k.frame(lesser).op, 'update')
  assert.equal(k.frame(lesser).result.feasible, true)

  let heavy = initial
  for (const i of [1, 2, 3, 4]) heavy = act(heavy, { type: 'toggleItem', id: `item${i}` })
  heavy = act(heavy, { type: 'verify' })
  assert.equal(k.frame(heavy).op, 'update')
  assert.equal(k.frame(heavy).result.feasible, false)

  let best = initial
  for (const i of [2, 3]) best = act(best, { type: 'toggleItem', id: `item${i}` })
  best = act(best, { type: 'verify' })
  assert.equal(k.frame(best).result.value, oracle(best))
  assert.equal(k.frame(best).op, 'done')
})

test('input edit creates a fresh independent branch and action log replays exactly', () => {
  const input = { capacity: 6, w1: 3, v1: 7 }
  const original = k.create(0)
  const actions = [
    { type: 'selectCell', row: 1, capacity: 2 },
    { type: 'connectDependency', take: false, row: 0, capacity: 2 },
    { type: 'write', take: false },
    { type: 'toggleItem', id: 'item2' },
    { type: 'verify' },
  ]
  const run = () => actions.reduce(act, k.create(0, input))
  assert.deepEqual(run(), run())
  assert.equal(original.cells['1:2'], undefined)
  assert.equal(run().input.capacity, 6)
  assert.equal(run().costs.userActions, actions.length)
})
