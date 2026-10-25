import test from 'node:test'
import assert from 'node:assert/strict'
import { classroomDpMissions } from '../src/game/simulation/classroom-dp.ts'

const mission = (id) => classroomDpMissions.find((m) => m.id === id)
const last = (m, v) => m.trace(v).at(-1).result

test('course LIS is nondecreasing and agrees with exhaustive subsequences and predecessor chain', () => {
  for (const v of [0, 1]) {
    const frames = mission('ppt-dp-lis').trace(v)
    const values = frames[0].items.map((x) => x.value)
    const got = frames.at(-1).result
    let best = 0
    for (let mask = 1; mask < 1 << values.length; mask++) {
      const seq = values.filter((_, i) => mask & (1 << i))
      if (seq.every((x, i) => i === 0 || seq[i - 1] <= x)) best = Math.max(best, seq.length)
    }
    assert.equal(got.length, best)
    assert.deepEqual(got.values, got.indices.map((i) => values[i]))
    assert.ok(got.values.every((x, i) => i === 0 || got.values[i - 1] <= x))
    assert.ok(got.values.some((x, i) => i > 0 && got.values[i - 1] === x))
    assert.ok(frames.some((f) => f.op === 'visit' && f.output.length))
    assert.equal(frames[0].op, 'start')
    assert.equal(frames.at(-1).op, 'done')
  }
})

test('weighted intervals agree with exhaustive compatible subsets', () => {
  for (const v of [0, 1]) {
    const frames = mission('ppt-dp-weighted-interval').trace(v)
    const a = frames[0].groups.map((g) => ({ id: g.id, s: g.items[0].value, f: g.items[1].value, w: g.items[2].value }))
    const got = frames.at(-1).result
    for (const frame of frames.filter((f) => f.op === 'compare')) {
      const column = frame.counters.i - 1
      assert.equal(frame.matrix.values[4][column], '?')
      assert.equal(frame.matrix.values[3][column], frame.counters.predecessor)
      for (let i = 0; i < column; i++) assert.equal(typeof frame.matrix.values[4][i], 'number')
    }
    let best = 0
    for (let mask = 0; mask < 1 << a.length; mask++) {
      const picked = a.filter((_, i) => mask & (1 << i))
      if (picked.every((x, i) => i === 0 || picked[i - 1].f <= x.s)) best = Math.max(best, picked.reduce((sum, x) => sum + x.w, 0))
    }
    assert.equal(got.benefit, best)
    const picked = got.ids.map((id) => a.find((x) => x.id === id))
    assert.ok(picked.every((x, i) => i === 0 || picked[i - 1].f <= x.s))
    assert.equal(picked.reduce((sum, x) => sum + x.w, 0), best)
  }
})

test('rod cutting agrees with exhaustive compositions', () => {
  for (const v of [0, 1]) {
    const frames = mission('ppt-dp-rod-cutting').trace(v)
    const price = [0, ...frames[0].items.map((x) => x.value)]
    const n = price.length - 1
    const oracle = (k) => k === 0 ? 0 : Math.max(...Array.from({ length: k }, (_, i) => price[i + 1] + oracle(k - i - 1)))
    const got = frames.at(-1).result
    assert.equal(got.revenue, oracle(n))
    assert.equal(got.pieces.reduce((a, b) => a + b, 0), n)
    assert.equal(got.pieces.reduce((a, b) => a + price[b], 0), got.revenue)
    assert.equal(frames.length, v ? 27 : 26)
    for (const frame of frames.filter((f) => f.op === 'compare')) {
      const k = frame.counters.length, i = frame.counters.cut
      const expected = [...new Set([i - 1, k - i - 1])].map((source) => ({ from: [1, source], to: [1, k - 1] }))
      assert.deepEqual(frame.matrix.links, expected)
    }
    for (const frame of frames.filter((f) => f.op === 'update' && f.counters.cut)) {
      const k = frame.counters.length, i = frame.counters.cut
      const expected = [...new Set([i - 1, k - i - 1])].map((source) => ({ from: [1, source], to: [1, k - 1] }))
      assert.deepEqual(frame.matrix.links, expected)
    }
    for (const frame of frames.filter((f) => f.op === 'select')) {
      const k = frame.counters.recovering, i = frame.matrix.values[2][k - 1]
      const expected = i < k ? [...new Set([i - 1, k - i - 1])].map((source) => ({ from: [1, source], to: [1, k - 1] })) : []
      assert.deepEqual(frame.matrix.links, expected)
    }
  }
})

test('market divide and conquer agrees with all ordered pairs, including a loss', () => {
  for (const v of [0, 1]) {
    const frames = mission('ppt-divide-market').trace(v)
    const buy = frames[0].groups.map((g) => g.items[0].value)
    const sell = frames[0].groups.map((g) => g.items[1].value)
    let best = -Infinity
    for (let i = 0; i < buy.length; i++) for (let j = i; j < buy.length; j++) best = Math.max(best, sell[j] - buy[i])
    const got = frames.at(-1).result
    assert.equal(got.profit, best)
    assert.ok(got.buy <= got.sell)
    assert.equal(sell[got.sell] - buy[got.buy], best)
    assert.ok(frames.some((f) => f.op === 'merge' && typeof f.counters.cross === 'number'))
  }
  assert.deepEqual(last(mission('ppt-divide-market'), 1), { profit: -3, buy: 0, sell: 0 })
})

test('traces are deterministic snapshots with stable object identifiers', () => {
  for (const m of classroomDpMissions) for (const v of [0, 1]) {
    const frames = m.trace(v)
    assert.deepEqual(frames, m.trace(v))
    for (const f of frames) {
      assert.ok(f.formula.length)
      for (const row of f.matrix?.values ?? []) assert.equal(row.length, f.matrix.columns.length)
      assert.equal(new Set(f.items?.map((x) => x.id)).size, f.items?.length ?? 0)
    }
    assert.ok(frames.at(-1).result)
  }
})
