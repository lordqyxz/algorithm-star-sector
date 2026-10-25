import test from 'node:test'
import assert from 'node:assert/strict'
import { classroomSelectionMissions } from '../src/game/simulation/classroom-selection.ts'

const bfprt = [
  { values: [12, 3, 8, 3, 16, 7, 10, 3, 5, 14, 9], rank: 6 },
  { values: [21, 8, 15, 4, 8, 19, 2, 11, 8, 17, 6, 8, 8], rank: 9 },
]
const topk = [
  { values: [9, 2, 14, 7, 14, 5, 11, 3, 18], k: 4 },
  { values: [4, 20, 6, 17, 1, 20, 12, 8, 15, 3], k: 3 },
]
const minmax = [[8, 2, 13, 5, 1, 10, 7, 14], [9, 4, 11, 2, 15, 3, 8]]
const tournament = [
  { values: [5, 2, 7, 9, 1, 3, 8, 6], k: 3 },
  { values: [12, 4, 12, 7, 9, 2, 15], k: 4 },
]
const kway = [
  [[1, 6, 12], [2, 7, 10], [3, 4, 13], [5, 8, 9, 11]],
  [[0, 5, 5], [1, 3, 9], [2, 6], [4, 7, 8]],
]
const run = (id, variant) => classroomSelectionMissions.find((x) => x.id === id).trace(variant)

test('five classroom selection and merge traces are deterministic snapshots', () => {
  assert.equal(classroomSelectionMissions.length, 5)
  for (const m of classroomSelectionMissions) for (const v of [0, 1]) {
    const a = m.trace(v), b = m.trace(v)
    assert.deepEqual(a, b)
    assert.equal(a[0].op, 'start')
    assert.equal(a.at(-1).op, 'done')
    assert.deepEqual(m.sources, ['classroom'])
    for (const frame of a) {
      assert.ok(frame.formula.length)
      assert.ok(Object.values(frame.counters).every((x) => typeof x === 'string' || Number.isFinite(x)))
      if (frame.nodes && frame.edges) {
        const ids = new Set(frame.nodes.map((n) => n.id))
        for (const edge of frame.edges) {
          assert.ok(ids.has(edge.from))
          assert.ok(ids.has(edge.to))
        }
      }
    }
    const former = structuredClone(a[0])
    a.at(-1).items?.push({ id: 'mutation', value: -1 })
    assert.deepEqual(a[0], former)
  }
})

test('BFPRT returns sorted-order statistic and exposes real three-way partitions', () => {
  for (const [v, c] of bfprt.entries()) {
    const frames = run('ppt-select-bfprt', v)
    assert.equal(frames.at(-1).result, c.values.toSorted((a, b) => a - b)[c.rank - 1])
    if (v === 1) assert.ok(frames.some((f) => f.groups?.some((g) => g.id === '= pivot' && g.items.length > 1)))
    for (const f of frames.filter((f) => f.groups?.some((g) => g.id === '< pivot'))) {
      const [lo, eq, hi] = f.groups
      assert.equal(lo.items.length + eq.items.length + hi.items.length, f.items.length)
      assert.ok(lo.items.every((x) => x.value < eq.items[0].value))
      assert.ok(hi.items.every((x) => x.value > eq.items[0].value))
    }
  }
})

test('capacity-k heap retains exactly the largest k, including duplicate values', () => {
  for (const [v, c] of topk.entries()) {
    const frames = run('ppt-select-topk', v)
    assert.deepEqual(frames.at(-1).result, c.values.toSorted((a, b) => b - a).slice(0, c.k))
    for (const f of frames) {
      const heap = f.groups?.find((g) => g.id.startsWith('min heap'))?.items ?? []
      assert.ok(heap.length <= c.k)
      if (heap.length) assert.equal(heap[0].value, Math.min(...heap.map((x) => x.value)))
    }
  }
})

test('pairwise minmax matches enumeration and exact comparison bound', () => {
  for (const [v, values] of minmax.entries()) {
    const end = run('ppt-select-minmax', v).at(-1)
    assert.deepEqual(end.result, { min: Math.min(...values), max: Math.max(...values), comparisons: Math.ceil(3 * values.length / 2) - 2 })
  }
})

test('winner tree replays only champion ancestors and returns top k', () => {
  for (const [v, c] of tournament.entries()) {
    const frames = run('ppt-select-tournament-topk', v)
    assert.deepEqual(frames.at(-1).result, c.values.toSorted((a, b) => b - a).slice(0, c.k))
    const build = frames.slice(1, c.values.length)
    assert.equal(build.length, c.values.length - 1)
    assert.equal(build.at(-1).counters.comparisons, c.values.length - 1)
    const selected = frames.filter((f) => f.op === 'select')
    assert.equal(selected.length, c.k)
    for (const f of frames) {
      if (!f.nodes) continue
      assert.equal(f.nodes.length, 2 * c.values.length - 1)
      assert.equal(f.edges.length, 2 * c.values.length - 2)
      const nodes = new Map(f.nodes.map((node) => [Number(node.id.slice(6)), node]))
      for (const node of f.nodes) {
        assert.ok(Number.isFinite(node.x) && node.x >= 0 && node.x <= 1)
        assert.ok(Number.isFinite(node.y) && node.y >= 0 && node.y <= 1)
      }
      const span = (index) => {
        const node = nodes.get(index)
        if (index >= c.values.length) return [node.x, node.x]
        const left = span(2 * index), right = span(2 * index + 1)
        assert.ok(left[1] < right[0], `variant ${v}: subtree ${index} branches overlap`)
        assert.ok(nodes.get(2 * index).x < node.x && node.x < nodes.get(2 * index + 1).x)
        return [left[0], right[1]]
      }
      span(1)
    }
    for (let i = 0; i < selected.length; i++) {
      const start = frames.indexOf(selected[i])
      const stop = i + 1 < selected.length ? frames.indexOf(selected[i + 1]) : frames.length - 1
      const updates = frames.slice(start + 1, stop).filter((f) => f.op === 'update')
      assert.ok(updates.length <= Math.ceil(Math.log2(c.values.length)))
      const prior = selected[i].nodes
      const touched = new Set(updates.flatMap((f) => f.nodes.filter((n) => n.tone === 'active').map((n) => n.id)))
      const last = updates.at(-1)?.nodes ?? prior
      for (const node of prior) if (!touched.has(node.id))
        assert.deepEqual(last.find((n) => n.id === node.id).value, node.value)
    }
  }
})

test('heap k-way merge emits globally sorted multiset from actual runs', () => {
  for (const [v, runs] of kway.entries()) {
    const frames = run('ppt-merge-kway', v)
    assert.deepEqual(frames.at(-1).result, runs.flat().toSorted((a, b) => a - b))
    const emitted = frames.filter((f) => f.op === 'merge')
    assert.equal(emitted.length, runs.flat().length)
    emitted.forEach((f, i) => assert.equal(f.output.length, i + 1))
  }
})
