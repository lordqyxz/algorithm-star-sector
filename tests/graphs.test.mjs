import test from 'node:test'
import assert from 'node:assert/strict'
import { graphsMissions } from '../src/game/simulation/graphs.ts'

const run = (id, variant = 0) => graphsMissions.find(m => m.id === id).trace(variant)
const done = id => run(id).filter(f => f.op === 'done').at(-1)
test('graph missions expose deterministic immutable two-variant traces', () => {
  assert.equal(graphsMissions.length, 11)
  for (const m of graphsMissions) for (const v of [0, 1]) {
    const a = m.trace(v), b = m.trace(v)
    assert.deepEqual(a, b, `${m.id} variant ${v}`)
    assert.ok(Object.isFrozen(m.sources) || Array.isArray(m.sources))
    assert.ok(a.length >= 3)
    assert.equal(a[0].op, 'start')
    assert.equal(a.at(-1).op, 'done')
    assert.ok(Object.isFrozen(a) && a.every(frame => Object.isFrozen(frame)))
  }
})
test('shortest paths, MST, topological order, and AOE use computed values', () => {
  assert.deepEqual(run('g-shortest-path').filter(f=>f.op==='done')[0].output.map(x=>x.value), [0,3,1,4,7])
  assert.equal(run('g-shortest-path',1).filter(f=>f.op==='done').at(-1).counters.negativeCycle, 1)
  assert.deepEqual(done('g-mst').output.map(x=>x.value), [5,11])
  const topo = done('g-topology').output.map(x=>x.value)
  assert.equal(topo.length, 6)
  const pos = new Map(topo.map((x,i)=>[x,i]))
  for (const [a,b] of [['A','C'],['B','C'],['B','D'],['C','E'],['D','E'],['E','F']]) assert.ok(pos.get(a)<pos.get(b))
  const critical = done('g-critical-path')
  assert.equal(critical.counters.projectDuration, 9)
  assert.ok(critical.counters.criticalVertices >= 2)
  const criticalActivities = critical.edges.filter(e => e.tone === 'active')
  const criticalAdj = new Map()
  for (const e of criticalActivities) criticalAdj.set(e.from, [...(criticalAdj.get(e.from) ?? []), [e.to, Number(String(e.weight).split(' / ')[0])]])
  const pathDurations = (node, target, seen=new Set()) => node===target ? [0] : (criticalAdj.get(node) ?? []).flatMap(([to,w])=>seen.has(to)?[]:pathDurations(to,target,new Set([...seen,node])).map(rest=>w+rest))
  assert.ok(pathDurations('v0','v5').includes(critical.counters.projectDuration))
})
test('maximum flow and min-cost flow totals match reference networks', () => {
  assert.equal(done('g-max-flow').counters.flow, 12)
  assert.deepEqual(done('g-min-cost-flow').output.map(x=>x.value), [4,16])
})
test('matrix and Floyd-Warshall traces expose actual state', () => {
  const repr = run('g-representations')[1]
  assert.equal(repr.matrix.values.length, 4)
  assert.equal(repr.matrix.values[0][1], 2)
  const fw = run('g-floyd-warshall')
  const updates = fw.filter(f => f.op === 'update')
  assert.ok(updates.length > 0)
  assert.ok(updates.some(f => f.matrix.values[0][3] === 9))
})
