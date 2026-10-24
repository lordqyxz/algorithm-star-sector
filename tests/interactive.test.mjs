import test from 'node:test'
import assert from 'node:assert/strict'
import katex from 'katex'
import { applyLabAction, createLab, labChoices, labDemoAction, labFrame, labHint, labIsComplete, labParameter, labReference, labSummary } from '../src/game/simulation/interactive.ts'

const step = (state, action) => {
  const result = applyLabAction(state, action)
  assert.equal(result.changed, true, JSON.stringify({ kind: state.kind, phase: state.phase, action, feedback: result.feedback }))
  assert.notEqual(result.state, state)
  return result.state
}
const reject = (state, action) => {
  const before = structuredClone(state)
  const result = applyLabAction(state, action)
  assert.equal(result.changed, false)
  assert.equal(result.state, state)
  assert.deepEqual(state, before)
  assert.ok(result.feedback.key)
}
const shortestByEnumeration = state => {
  const distances = { s: 0 }
  for (const target of state.nodes.filter(n => n !== 's')) {
    const walk = (node, distance, seen) => {
      if (node === target) return distance
      return Math.min(Infinity, ...state.edges.filter(e => e.from === node && !seen.has(e.to)).map(e => walk(e.to, distance + e.weight, new Set([...seen, e.to]))))
    }
    distances[target] = walk('s', 0, new Set(['s']))
  }
  return distances
}
const subsetOptimum = (items, capacity) => {
  let best = 0
  for (let mask = 0; mask < 1 << items.length; mask++) {
    const selected = items.filter((_, i) => mask & (1 << i))
    if (selected.reduce((sum, item) => sum + item.weight, 0) <= capacity) best = Math.max(best, selected.reduce((sum, item) => sum + item.value, 0))
  }
  return best
}
const minCut = state => {
  const middle = state.nodes.filter(n => n !== 's' && n !== 't')
  let best = Infinity
  for (let mask = 0; mask < 1 << middle.length; mask++) {
    const side = new Set(['s', ...middle.filter((_, i) => mask & (1 << i))])
    best = Math.min(best, state.edges.filter(e => side.has(e.from) && !side.has(e.to)).reduce((sum, e) => sum + e.capacity, 0))
  }
  return best
}

test('parameters are bounded and reference values use independent combinatorial answers', () => {
  for (const kind of ['dijkstra', 'knapsack', 'maxflow']) for (const variant of [0, 1]) {
    const range = labParameter(kind)
    assert.throws(() => createLab(kind, variant, range.min - 1), RangeError)
    assert.throws(() => createLab(kind, variant, range.max + 1), RangeError)
    for (let parameter = range.min; parameter <= range.max; parameter += range.step) {
      const state = createLab(kind, variant, parameter)
      const expected = kind === 'dijkstra' ? shortestByEnumeration(state).t : kind === 'knapsack' ? subsetOptimum(state.items, parameter) : minCut(state)
      assert.equal(labReference(state).value, expected)
      assert.equal(state.parameter, parameter)
      assert.deepEqual(createLab(kind, variant, parameter), state)
      assert.ok(labChoices(state).length)
    }
  }
})

test('Dijkstra accepts equal minima, relaxes in any edge order, and computes true predecessors', () => {
  for (const variant of [0, 1]) for (const parameter of [1, 4, 9]) {
    let state = createLab('dijkstra', variant, parameter)
    const expected = shortestByEnumeration(state)
    reject(state, { type: 'settle', node: 't' })
    while (!labIsComplete(state)) {
      if (state.phase === 'settle') {
        const minimum = Math.min(...state.nodes.filter(n => !state.settled.includes(n)).map(n => state.distance[n]))
        const ties = state.nodes.filter(n => !state.settled.includes(n) && state.distance[n] === minimum)
        state = step(state, { type: 'settle', node: ties.at(-1) })
      } else {
        reject(state, { type: 'settle', node: 't' })
        state = step(state, { type: 'relax', edge: state.pending.at(-1) })
      }
    }
    assert.deepEqual(state.distance, expected)
    for (const node of state.nodes.filter(n => n !== 's')) {
      const predecessor = state.previous[node]
      const edge = state.edges.find(e => e.from === predecessor && e.to === node)
      assert.ok(edge)
      assert.equal(state.distance[predecessor] + edge.weight, state.distance[node])
    }
    assert.equal(labFrame(state).result.distance.t, expected.t)
    assert.equal(labSummary(state).value, expected.t)
    assert.equal(labChoices(state).length, 0)
  }
  let tied = createLab('dijkstra', 0, 4)
  tied = step(tied, { type: 'settle', node: 's' })
  for (const edge of ['sb', 'sa']) tied = step(tied, { type: 'relax', edge })
  assert.equal(tied.distance.a, tied.distance.b)
  assert.equal(applyLabAction(tied, { type: 'settle', node: 'a' }).changed, true)
  assert.equal(applyLabAction(tied, { type: 'settle', node: 'b' }).changed, true)
})

test('knapsack key-cell decisions permit ties and finish with a valid actual item subset', () => {
  for (const variant of [0, 1]) for (const capacity of [4, 7, 10]) {
    let state = createLab('knapsack', variant, capacity)
    reject(state, { type: 'decision', take: true })
    for (let row = 1; row <= 4; row++) {
      const cellCapacity = capacity
      state = step(state, { type: 'cell', row, capacity: cellCapacity })
      const item = state.items[row - 1]
      const dependencyCapacity = cellCapacity >= item.weight ? cellCapacity - item.weight : cellCapacity
      reject(state, { type: 'dependency', row: row - 1, capacity: cellCapacity + 1 })
      state = step(state, { type: 'dependency', row: row - 1, capacity: dependencyCapacity })
      const skip = subsetOptimum(state.items.slice(0, row - 1), cellCapacity)
      const take = cellCapacity >= item.weight ? item.value + subsetOptimum(state.items.slice(0, row - 1), cellCapacity - item.weight) : -Infinity
      reject(state, { type: 'decision', take: take !== Math.max(take, skip) })
      state = step(state, { type: 'decision', take: take === Math.max(take, skip) })
    }
    while (!labIsComplete(state)) {
      const { backtrackRow: row, backtrackCapacity: c } = state, item = state.items[row - 1]
      const skip = subsetOptimum(state.items.slice(0, row - 1), c)
      const take = c >= item.weight ? item.value + subsetOptimum(state.items.slice(0, row - 1), c - item.weight) : -Infinity
      state = step(state, { type: 'backtrack', take: take === Math.max(take, skip) })
    }
    const selected = state.items.filter(item => state.chosen.includes(item.id))
    assert.ok(selected.reduce((sum, item) => sum + item.weight, 0) <= capacity)
    assert.equal(selected.reduce((sum, item) => sum + item.value, 0), subsetOptimum(state.items, capacity))
    assert.equal(labFrame(state).result.optimum, subsetOptimum(state.items, capacity))
    assert.equal(labSummary(state).value, subsetOptimum(state.items, capacity))
  }
  let tie = createLab('knapsack', 1, 6)
  for (let row = 1; row <= 4; row++) {
    tie = step(tie, { type: 'cell', row, capacity: 6 })
    tie = step(tie, { type: 'dependency', row: row - 1, capacity: 6 - tie.items[row - 1].weight })
    const item = tie.items[row - 1], skip = tie.table[row - 1][6], take = item.value + tie.table[row - 1][6 - item.weight]
    tie = step(tie, { type: 'decision', take: take >= skip })
  }
  tie = step(tie, { type: 'backtrack', take: true })
  tie = step(tie, { type: 'backtrack', take: false })
  assert.equal(tie.backtrackRow, 2)
  assert.equal(tie.backtrackCapacity, 2)
  assert.equal(applyLabAction(tie, { type: 'backtrack', take: true }).changed, true)
  assert.equal(applyLabAction(tie, { type: 'backtrack', take: false }).changed, true)
})

test('knapsack dependency hint keeps original capacity when item does not fit', () => {
  let state = createLab('knapsack', 0, 4)
  while (state.row < 4) state = step(state, labDemoAction(state))
  state = step(state, { type: 'cell', row: 4, capacity: 4 })
  assert.deepEqual(labHint(state, 2).targets, ['cell:3:4'])
  assert.equal(labHint(state, 2).vars.capacity, 4)
  reject(state, { type: 'dependency', row: 3, capacity: 0 })
  state = step(state, { type: 'dependency', row: 3, capacity: 4 })
  assert.equal(state.phase, 'decision')
  assert.equal(applyLabAction(state, { type: 'decision', take: true }).feedback.vars.take, '-∞')
})

test('advanced knapsack hints show both source candidates and respect overweight branches', () => {
  let state = createLab('knapsack', 0, 4)
  state = step(state, { type: 'cell', row: 1, capacity: 4 })
  state = step(state, { type: 'dependency', row: 0, capacity: 2 })
  assert.deepEqual(labHint(state, 1).targets, [])
  assert.deepEqual(labHint(state, 2).vars, { skip: 0, take: 3, best: 3 })
  assert.deepEqual(labHint(state, 2).targets, ['cell:0:4', 'cell:0:2'])
  while (state.phase !== 'backtrack') state = step(state, labDemoAction(state))
  assert.deepEqual(labHint(state, 2).vars, { skip: 5, take: '—', best: 5 })
  assert.deepEqual(labHint(state, 2).targets, ['cell:3:4'])
})

test('interactive formulas parse and state both knapsack branches and both residual directions', () => {
  for (const kind of ['dijkstra', 'knapsack', 'maxflow']) {
    const formula = labFrame(createLab(kind, 0)).formula
    assert.doesNotThrow(() => katex.renderToString(formula, { throwOnError: true, strict: 'error' }))
    if (kind === 'knapsack') {
      assert.match(formula, /c<w_i/)
      assert.match(formula, /c\\geq w_i/)
    }
    if (kind === 'maxflow') {
      assert.match(formula, /r_\{uv\}=c_\{uv\}-f_\{uv\}/)
      assert.match(formula, /r_\{vu\}=f_\{uv\}/)
    }
  }
})

const extendPath = (state, ids) => ids.reduce((current, edge) => step(current, { type: 'extend', edge }), state)
test('flow accepts a non-BFS path and later uses reverse residual edges to reach min cut', () => {
  let state = createLab('maxflow', 0, 2)
  reject(state, { type: 'extend', edge: 'ab:r' })
  state = extendPath(state, ['sa:f', 'ab:f', 'bt:f'])
  assert.equal(state.phase, 'bottleneck')
  reject(state, { type: 'augment', amount: 1 })
  state = step(state, { type: 'augment', amount: 2 })
  assert.equal(state.flow.ab, 2)
  state = extendPath(state, ['sb:f', 'ab:r', 'at:f'])
  assert.ok(state.pathEdges.includes('ab:r'))
  state = step(state, { type: 'augment', amount: 2 })
  assert.equal(state.flow.ab, 0)
  assert.equal(state.total, 4)
  assert.equal(state.total, minCut(state))
  assert.equal(labFrame(state).result.cutCapacity, state.total)
  assert.equal(labSummary(state).value, state.total)
  assert.equal(labIsComplete(state), true)
})

test('flow path edits, invalid cycles, snapshot replay, and hint targets are deterministic', () => {
  let state = createLab('maxflow', 1, 3)
  const start = structuredClone(state)
  state = step(state, { type: 'extend', edge: 'sa:f' })
  reject(state, { type: 'extend', edge: 'sa:r' })
  const saved = structuredClone(state)
  state = step(state, { type: 'extend', edge: 'ab:f' })
  state = step(state, { type: 'pop' })
  assert.deepEqual(state.path, saved.path)
  assert.deepEqual(state.pathEdges, saved.pathEdges)
  state = step(state, { type: 'clear' })
  assert.deepEqual(state.path, start.path)
  assert.deepEqual(state.pathEdges, start.pathEdges)
  const a = step(saved, { type: 'extend', edge: 'at:f' })
  const b = step(structuredClone(saved), { type: 'extend', edge: 'at:f' })
  assert.deepEqual(a, b)
  assert.ok(labHint(saved, 2).targets.every(id => id.startsWith('edge:')))
  assert.ok(labChoices(saved).every(choice => choice.targets?.every(id => id.startsWith('edge:'))))
})

test('demo actions finish both variants at parameter bounds using the same rules', () => {
  for (const kind of ['dijkstra', 'knapsack', 'maxflow']) for (const variant of [0, 1]) {
    const { min, max } = labParameter(kind)
    for (const parameter of [min, max]) {
      let state = createLab(kind, variant, parameter)
      const reference = labReference(state).value
      let steps = 0
      while (!labIsComplete(state) && steps < 200) {
        const action = labDemoAction(state)
        assert.ok(action, `${kind}/${variant}/${parameter}: demo stuck`)
        state = step(state, action)
        steps++
      }
      assert.ok(labIsComplete(state), `${kind}/${variant}/${parameter}: >200 steps`)
      assert.equal(labDemoAction(state), null)
      assert.equal(labSummary(state).value, reference)
      assert.equal(labFrame(state).op, 'done')
    }
  }
})
