import test from 'node:test'
import assert from 'node:assert/strict'
import {
  classroomGreedyStringsMissions, postOffices, minCostRefuel, rabinKarpAll,
  buildAutomaton, automatonAll, prefixFunction, kmpAll,
} from '../src/game/simulation/classroom-greedy-strings.ts'

const mission = id => classroomGreedyStringsMissions.find(x => x.id === id)

test('five missions have deterministic independent snapshots and computed answers', () => {
  assert.equal(classroomGreedyStringsMissions.length, 5)
  for (const item of classroomGreedyStringsMissions) for (const variant of [0, 1]) {
    const frames = item.trace(variant)
    assert.deepEqual(frames, item.trace(variant), item.id)
    assert.equal(frames[0].op, 'start')
    assert.equal(frames.at(-1).op, 'done')
    assert.ok(frames.length > 3)
    assert.ok(frames.at(-1).result !== undefined)
    const first = structuredClone(frames[0])
    frames.at(-1).items?.push({ id: 'mutation', value: 1 })
    assert.deepEqual(frames[0], first)
    for (const frame of frames) {
      assert.ok(frame.formula)
      assert.ok(Object.values(frame.counters).every(v => typeof v !== 'number' || Number.isFinite(v)))
    }
  }
  assert.equal(mission('ppt-greedy-refuel').trace(0).at(-1).result.cost, 60)
})

test('post offices cover every ordered house and match brute force minimum', () => {
  const radius = 2
  for (let mask = 1; mask < 1 << 8; mask++) {
    const houses = Array.from({ length: 8 }, (_, x) => x).filter(x => mask & (1 << x))
    const offices = postOffices(houses, radius)
    assert.ok(houses.every(h => offices.some(p => Math.abs(h - p) <= radius)))
    // An optimum may always place centers at a resident +/- R or a resident itself.
    const candidates = [...new Set(houses.flatMap(h => [h - radius, h, h + radius]))]
    let best = Infinity
    for (let chosen = 0; chosen < 1 << candidates.length; chosen++) {
      const count = chosen.toString(2).replaceAll('0', '').length
      if (count >= best) continue
      if (houses.every(h => candidates.some((p, i) => chosen & (1 << i) && Math.abs(h - p) <= radius))) best = count
    }
    assert.equal(offices.length, best, String(houses))
  }
})

test('refuel agrees with discrete exact minimum cost over small prices and distances', () => {
  const oracle = (positions, prices, cap) => {
    const dp = Array.from({ length: positions.length }, () => Array(cap + 1).fill(Infinity))
    dp[0][0] = 0
    for (let i = 0; i < positions.length - 1; i++) {
      for (let fuel = 0; fuel <= cap; fuel++) for (let buy = 0; buy <= cap - fuel; buy++) {
        const left = fuel + buy - (positions[i + 1] - positions[i])
        if (left >= 0) dp[i + 1][left] = Math.min(dp[i + 1][left], dp[i][fuel] + buy * prices[i])
      }
    }
    return Math.min(...dp.at(-1))
  }
  for (let d1 = 1; d1 <= 3; d1++) for (let d2 = 1; d2 <= 3; d2++)
    for (let p0 = 1; p0 <= 4; p0++) for (let p1 = 1; p1 <= 4; p1++) {
      const positions = [0, d1, d1 + d2], prices = [p0, p1, 0]
      const plan = minCostRefuel(positions, prices, 3)
      assert.equal(plan.cost, oracle(positions, prices, 3), JSON.stringify({ positions, prices }))
      assert.equal(plan.remainingAt.at(-1) >= 0, true)
      assert.ok(plan.purchases.every(x => x >= 0 && x <= 3))
    }
  for (let d1 = 1; d1 <= 3; d1++) for (let d2 = 1; d2 <= 3; d2++) for (let d3 = 1; d3 <= 3; d3++)
    for (let p0 = 1; p0 <= 3; p0++) for (let p1 = 1; p1 <= 3; p1++) for (let p2 = 1; p2 <= 3; p2++) {
      const positions = [0, d1, d1 + d2, d1 + d2 + d3], prices = [p0, p1, p2, 0]
      const plan = minCostRefuel(positions, prices, 3)
      assert.equal(plan.cost, oracle(positions, prices, 3), JSON.stringify({ positions, prices }))
    }
  assert.equal(minCostRefuel([0, 4], [2, 0], 3), null)
})

test('all string algorithms report every offset including overlap and verify hash collisions', () => {
  const words = ['']
  for (let len = 1; len <= 5; len++) {
    const count = 1 << len
    for (let bits = 0; bits < count; bits++) words.push(Array.from({ length: len }, (_, i) => bits & (1 << i) ? 'b' : 'a').join(''))
  }
  for (const text of words) for (const pattern of words.filter(x => x && x.length <= 3)) {
    const expected = []
    for (let i = 0; i + pattern.length <= text.length; i++) if (text.slice(i, i + pattern.length) === pattern) expected.push(i)
    assert.deepEqual(rabinKarpAll(text, pattern, 3, 2).matches, expected, `RK ${text}/${pattern}`)
    assert.deepEqual(automatonAll(text, pattern), expected, `DFA ${text}/${pattern}`)
    assert.deepEqual(kmpAll(text, pattern), expected, `KMP ${text}/${pattern}`)
  }
  assert.deepEqual(kmpAll('aaaaa', 'aaa'), [0, 1, 2])
  const collision = rabinKarpAll('abba', 'ba', 3, 2)
  assert.deepEqual(collision.matches, [2])
  assert.ok(collision.collisions.length > 0)
  assert.deepEqual(prefixFunction('ababaca'), [0, 0, 1, 2, 3, 0, 1])
  const symbols = ['a', 'b']
  const table = buildAutomaton('aba', symbols)
  assert.equal(table[3][0], 1, 'accepting state retains overlap on a')
})
