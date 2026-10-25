import test from 'node:test'
import assert from 'node:assert/strict'
import { classroomApproxExamMissions } from '../src/game/simulation/classroom-approx-exam.ts'

const run = (id, variant) => classroomApproxExamMissions.find(m => m.id === id).trace(variant)
const coverage = (edges, selected) => edges.every(([u, v]) => selected.includes(u) || selected.includes(v))

test('all four traces are deterministic, finite, and preserve past snapshots', () => {
  assert.equal(classroomApproxExamMissions.length, 4)
  for (const mission of classroomApproxExamMissions) for (const variant of [0, 1]) {
    const trace = mission.trace(variant)
    assert.deepEqual(trace, mission.trace(variant))
    assert.equal(trace[0].op, 'start')
    assert.equal(trace.at(-1).op, 'done')
    assert.ok(trace.every(f => f.formula && Object.values(f.counters).every(x => typeof x === 'string' || Number.isFinite(x))))
    for (const f of trace) if (f.edges) {
      const ids = new Set(f.nodes.map(n => n.id))
      assert.ok(f.edges.every(e => ids.has(e.from) && ids.has(e.to)))
    }
  }
})

test('every visible row is dense and contains valid item objects', () => {
  const check = (row, context) => {
    for (let i = 0; i < row.length; i++) {
      assert.ok(i in row, `${context}[${i}] is a sparse hole`)
      assert.ok(row[i] && typeof row[i] === 'object', `${context}[${i}] is missing`)
      assert.equal(typeof row[i].id, 'string', `${context}[${i}] has no id`)
      assert.ok(row[i].id.length > 0, `${context}[${i}] has an empty id`)
      assert.ok(typeof row[i].value === 'string' || typeof row[i].value === 'number', `${context}[${i}] has no value`)
    }
  }
  for (const mission of classroomApproxExamMissions) for (const variant of [0, 1]) {
    mission.trace(variant).forEach((frame, step) => {
      if (frame.items) check(frame.items, `${mission.id}/${variant}/${step}/items`)
      if (frame.output) check(frame.output, `${mission.id}/${variant}/${step}/output`)
      for (const group of frame.groups ?? []) check(group.items, `${mission.id}/${variant}/${step}/groups/${group.id}`)
    })
  }
})

test('MAX-3-SAT clauses have three distinct variables and exact expectation 7m/8', () => {
  for (const variant of [0, 1]) {
    const { result } = run('ppt-approx-max3sat', variant).at(-1)
    const { clauses, bits, expectation, sample } = result
    assert.ok(clauses.every(c => c.length === 3 && new Set(c.map(l => l.variable)).size === 3))
    const satisfied = (clause, assignment) => clause.some(l => Boolean(assignment[l.variable]) === l.positive)
    assert.equal(sample, clauses.filter(c => satisfied(c, bits)).length)
    let total = 0
    for (let mask = 0; mask < 1 << bits.length; mask++) {
      const assignment = bits.map((_, i) => mask >> i & 1)
      total += clauses.filter(c => satisfied(c, assignment)).length
    }
    assert.equal(expectation, total / (1 << bits.length))
    assert.equal(expectation, 7 * clauses.length / 8)
  }
})

test('weighted VC fractional solution is feasible and optimal among half-integral vertices', () => {
  for (const variant of [0, 1]) {
    const { result: r } = run('ppt-approx-weighted-vertex-cover', variant).at(-1)
    const { weights, edges, fractional, lpCost, rounded, roundedCost, integerOptimum } = r
    assert.ok(fractional.every(x => [0, 0.5, 1].includes(x)))
    assert.ok(edges.every(([u, v]) => fractional[u] + fractional[v] >= 1))
    assert.equal(lpCost, fractional.reduce((sum, x, i) => sum + x * weights[i], 0))
    let oracleLP = Infinity, oracleInteger = Infinity
    for (let code = 0; code < 3 ** weights.length; code++) {
      let rest = code
      const x = weights.map(() => { const v = rest % 3 / 2; rest = Math.floor(rest / 3); return v })
      if (edges.every(([u, v]) => x[u] + x[v] >= 1)) oracleLP = Math.min(oracleLP, x.reduce((s, v, i) => s + v * weights[i], 0))
    }
    for (let mask = 0; mask < 1 << weights.length; mask++) {
      const picked = weights.flatMap((_, i) => mask >> i & 1 ? [i] : [])
      if (coverage(edges, picked)) oracleInteger = Math.min(oracleInteger, picked.reduce((s, i) => s + weights[i], 0))
    }
    assert.equal(lpCost, oracleLP)
    assert.equal(integerOptimum, oracleInteger)
    if (variant === 1) assert.deepEqual(new Set(fractional), new Set([0, 0.5, 1]))
    assert.deepEqual(rounded, fractional.flatMap((x, i) => x >= 0.5 ? [i] : []))
    assert.ok(coverage(edges, rounded))
    assert.equal(roundedCost, rounded.reduce((s, i) => s + weights[i], 0))
    assert.ok(roundedCost <= 2 * lpCost && lpCost <= integerOptimum)
  }
})

test('two stable base-n counting passes match numeric sort and retain equal-key ids', () => {
  const sources = [[15, 3, 8, 3, 12, 7], [24, 5, 18, 5, 12, 0, 23]]
  for (const variant of [0, 1]) {
    const trace = run('ppt-sort-radix-base-n', variant), output = trace.at(-1).result
    const expected = sources[variant].map((value, i) => ({ id: `a${i}`, value })).sort((a, b) => a.value - b.value)
    assert.deepEqual(output, expected)
    assert.equal(trace.at(-1).counters.writes, 2 * sources[variant].length)
    assert.equal(trace.filter(f => f.op === 'insert').length, 2 * sources[variant].length)
    for (const f of trace.filter(f => f.op === 'merge')) {
      const digit = f.counters.pass === 'low' ? x => x.value % sources[variant].length : x => Math.floor(x.value / sources[variant].length)
      const ordered = f.items.map(x => ({ id: x.id, value: x.value }))
      assert.ok(ordered.every((x, i) => !i || digit(ordered[i - 1]) <= digit(x)))
    }
  }
})

test('VC to committee construction preserves every subset and minimum cardinality', () => {
  for (const variant of [0, 1]) {
    const r = run('ppt-np-review-committee', variant).at(-1).result
    let minimum = r.n + 1
    for (let mask = 0; mask < 1 << r.n; mask++) {
      const chosen = Array.from({ length: r.n }, (_, i) => i).filter(i => mask >> i & 1)
      const cover = coverage(r.edges, chosen)
      const committee = r.topics.every(list => list.some(i => chosen.includes(i)))
      assert.equal(cover, committee)
      if (cover) minimum = Math.min(minimum, chosen.length)
    }
    assert.equal(r.minimumCover, minimum)
    assert.equal(r.minimumCommittee, minimum)
    assert.ok(coverage(r.edges, r.witness))
    assert.equal(r.decision, minimum <= r.k)
    assert.equal(r.decision, variant === 0)
    assert.equal(run('ppt-np-review-committee', variant).at(-1).counters.decision, variant === 0 ? 'YES' : 'NO')
  }
})
