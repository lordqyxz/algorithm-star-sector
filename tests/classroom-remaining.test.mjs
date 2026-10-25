import test from 'node:test'
import assert from 'node:assert/strict'
import { classroomRemainingMissions } from '../src/game/simulation/classroom-remaining.ts'

const run = (id, variant) => classroomRemainingMissions.find(m => m.id === id).trace(variant)

test('three remaining classroom traces are deterministic, frozen, and graph-complete', () => {
  assert.equal(classroomRemainingMissions.length, 3)
  for (const mission of classroomRemainingMissions) for (const variant of [0, 1]) {
    const frames = mission.trace(variant)
    assert.deepEqual(frames, mission.trace(variant))
    assert.equal(frames[0].op, 'start')
    assert.equal(frames.at(-1).op, 'done')
    assert.deepEqual(mission.sources, ['classroom'])
    assert.ok(Object.isFrozen(frames) && frames.every(Object.isFrozen))
    for (const frame of frames) {
      assert.ok(frame.formula)
      assert.ok(Object.values(frame.counters).every(x => typeof x === 'string' || Number.isFinite(x)))
      const nodeIds = new Set(frame.nodes?.map(x => x.id) ?? [])
      for (const node of frame.nodes ?? []) assert.ok(node.x >= 0 && node.x <= 1 && node.y >= 0 && node.y <= 1)
      for (const edge of frame.edges ?? []) { assert.ok(nodeIds.has(edge.from)); assert.ok(nodeIds.has(edge.to)) }
    }
  }
})

test('divide and conquer maximum subarray agrees with all nonempty contiguous intervals', () => {
  for (const variant of [0, 1]) {
    const frames = run('ppt-divide-max-subarray', variant)
    const { values, lo, hi, sum } = frames.at(-1).result
    let brute = -Infinity
    for (let i = 0; i < values.length; i++) for (let j = i, s = 0; j < values.length; j++) { s += values[j]; brute = Math.max(brute, s) }
    assert.equal(sum, brute)
    assert.equal(values.slice(lo, hi + 1).reduce((a, b) => a + b, 0), sum)
    assert.ok(frames.some(f => f.op === 'merge' && f.counters.cross === f.counters.suffix + f.counters.prefix))
    if (variant === 1) assert.ok(sum < 0 && lo === hi)
  }
})

test('fixed-order domino orientation path agrees with independent exhaustive enumeration', () => {
  for (const variant of [0, 1]) {
    const frames = run('ppt-dp-multistage-longest', variant)
    const { cards, orientations, score } = frames.at(-1).result
    const side = (i, o) => o ? [cards[i][1], cards[i][0]] : cards[i]
    let brute = -Infinity
    for (let mask = 0; mask < 1 << cards.length; mask++) {
      let total = 0
      for (let i = 0; i + 1 < cards.length; i++) total += side(i, mask >> i & 1)[1] * side(i + 1, mask >> (i + 1) & 1)[0]
      brute = Math.max(brute, total)
    }
    assert.equal(score, brute)
    assert.equal(orientations.length, cards.length)
    assert.equal(orientations.reduce((total, _, i) => i ? total + side(i - 1, orientations[i - 1])[1] * side(i, orientations[i])[0] : 0, 0), score)
    assert.equal(frames[0].nodes.length, 2 * cards.length + 2)
    assert.equal(frames[0].edges.length, 4 * (cards.length - 1) + 4)
    assert.ok(frames.some(f => f.op === 'relax' && f.matrix.links.length))
  }
})

test('BFS two-coloring matches exhaustive assignments and reports a valid odd cycle', () => {
  for (const variant of [0, 1]) {
    const frames = run('ppt-graph-bipartite-color', variant)
    const { bipartite, colors, cycle, edges, components } = frames.at(-1).result
    const n = colors.length
    const possible = Array.from({ length: 1 << n }, (_, mask) => edges.every(([u, v]) => ((mask >> u) & 1) !== ((mask >> v) & 1))).some(Boolean)
    assert.equal(bipartite, possible)
    assert.equal(components, 2)
    if (possible) { assert.ok(colors.every(c => c === 0 || c === 1)); assert.ok(edges.every(([u, v]) => colors[u] !== colors[v])) }
    else {
      assert.equal(cycle[0], cycle.at(-1))
      assert.equal((cycle.length - 1) % 2, 1)
      assert.ok(cycle.slice(0, -1).every((u, i) => edges.some(([a, b]) => a === u && b === cycle[i + 1] || b === u && a === cycle[i + 1])))
      assert.ok(frames.some(f => f.op === 'reject' && f.output.length === cycle.length))
    }
  }
})
