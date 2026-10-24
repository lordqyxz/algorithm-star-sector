import test from 'node:test'
import assert from 'node:assert/strict'
import { structuresMissions } from '../src/game/simulation/structures.ts'

test('structure missions are deterministic computed traces with valid snapshots', () => {
  assert.equal(structuresMissions.length, 19)
  for (const mission of structuresMissions) {
    for (const variant of [0, 1]) {
      const a = mission.trace(variant)
      const b = mission.trace(variant)
      assert.deepEqual(a, b, mission.id)
      assert.equal(a[0].op, 'start', mission.id)
      assert.equal(a.at(-1).op, 'done', mission.id)
      assert.ok(a.length >= 3, mission.id)
      for (const frame of a) {
        for (const value of Object.values(frame.counters)) {
          if (typeof value === 'number') assert.ok(Number.isFinite(value), `${mission.id}: ${value}`)
        }
        for (const node of frame.nodes ?? []) {
          assert.ok(node.x >= 0 && node.x <= 1 && node.y >= 0 && node.y <= 1, mission.id)
        }
        const nodeIds = new Set((frame.nodes ?? []).map(node => node.id))
        for (const edge of frame.edges ?? []) {
          assert.ok(nodeIds.has(edge.from) && nodeIds.has(edge.to), mission.id)
        }
        if (frame.matrix) {
          assert.ok(frame.matrix.rows.length <= 8 && frame.matrix.columns.length <= 10, mission.id)
          assert.equal(frame.matrix.values.length, frame.matrix.rows.length, mission.id)
          for (const row of frame.matrix.values) assert.equal(row.length, frame.matrix.columns.length, mission.id)
        }
        for (const group of frame.groups ?? []) assert.ok(group.items.length <= 10, mission.id)
        assert.ok((frame.items?.length ?? 0) <= 100, mission.id)
      }
      if (a.length > 1) {
        const snapshot = structuredClone(a[0])
        a.at(-1).formula = 'changed'
        assert.deepEqual(a[0], snapshot, `${mission.id}: snapshots do not share mutable state`)
      }
    }
  }
})

const last = id => structuresMissions.find(m => m.id === id).trace(0).at(-1)
test('sequence, string, hashing, search, and matrix traces expose computed results', () => {
  const inserted = structuresMissions.find(m => m.id === 'structure-sequence').trace(0).find(f => f.op === 'insert')
  assert.deepEqual(inserted.output.map(x => x.value), [3, 5, 7, 11, 15])
  assert.equal(last('structure-strings-kmp').counters.naiveMatchIndex, 5)
  assert.equal(last('structure-strings-kmp').counters.kmpMatchIndex, 5)
  assert.equal(last('structure-strings-kmp').counters.matchesAgree, 1)
  assert.ok(last('structure-hashing-search').counters.linearProbeComparisons >= 1)
  const search = last('structure-searches')
  assert.equal(search.counters.index, 5)
  assert.ok(search.counters.sequentialComparisons > search.counters.binaryComparisons)
  assert.equal(structuresMissions.find(m => m.id === 'structure-arrays-matrices').trace(0).find(f => f.op === 'update').counters.symmetric, 6)
})

test('queue, memory safety, linked lists, hashing, and buddy operations mutate concrete state', () => {
  for (const variant of [0, 1]) {
    const queue = structuresMissions.find(m => m.id === 'structure-queues').trace(variant).at(-1)
    assert.equal(queue.counters.wrapped, 1)
    assert.ok(queue.counters.rear < queue.counters.front)
    assert.deepEqual(queue.output.map(x => x.value), variant ? [9, 12, 15, 18] : [8, 6, 9])

    const safety = structuresMissions.find(m => m.id === 'structure-memory-safety').trace(variant).at(-1)
    assert.equal(safety.counters.errors, variant ? 2 : 1)
    assert.equal(safety.counters.validReads, 0)
    assert.equal(safety.counters.alive, 0)

    const list = structuresMissions.find(m => m.id === 'structure-lists').trace(variant)
    const circular = list.find(f => f.op === 'visit')
    assert.ok(circular.edges.some(e => e.to === circular.nodes[0].id))
    assert.ok(!circular.nodes.some(n => n.id === 'head-copy'))

    const buddy = structuresMissions.find(m => m.id === 'structure-memory-strategies').trace(variant)
    assert.ok(buddy.filter(f => f.op === 'merge').some(f => f.counters.mergedSize === (variant ? 32 : 16)))
    assert.equal(buddy.at(-1).counters.merges, variant ? 2 : 3)
    assert.ok(buddy.at(-1).output.some(x => x.value === '0:64:free'))
    assert.ok(buddy.some(f => f.counters.mergedBlockSize === 16), 'boundary tags coalesce adjacent released blocks')
    assert.ok(buddy.some(f => f.counters.mergedBlockSize === 32), 'boundary tags merge the newly adjacent free ranges in both directions')

    const allocation = structuresMissions.find(m => m.id === 'structure-memory-allocation').trace(variant)
    assert.ok(allocation.every(f => f.op !== 'merge'), 'allocation trace does not claim coalescing without freeing')
    assert.equal(allocation.at(-1).counters.successful, 4)
    assert.equal(allocation.at(-1).counters.allocatedBytes, variant ? 83 : 55)
  }
})

test('string operations and foundations missions compute their stated outcomes', () => {
  for (const variant of [0, 1]) {
    const stringTrace = structuresMissions.find(m => m.id === 'structure-string-operations').trace(variant)
    assert.equal(stringTrace.at(-1).counters.sameValues, 1)
    assert.ok(stringTrace.find(f => f.formula.startsWith('Concatenate')).counters.sequentialCopies > 0)
    assert.ok(stringTrace.find(f => f.formula.startsWith('Insert X')).counters.sequentialShifts > 0)

    const model = structuresMissions.find(m => m.id === 'foundation-modeling').trace(variant).at(-1)
    assert.equal(model.counters.precondition, 1)
    assert.equal(model.counters.postcondition, 1)

    const math = structuresMissions.find(m => m.id === 'foundation-mathematics').trace(variant).at(-1)
    assert.equal(math.counters.computedSum, variant ? 136 : 36)
    assert.equal(math.counters.divisions, variant ? 4 : 3)
    assert.equal(math.counters.recurrence, variant ? 80 : 32)

    const asymptotics = structuresMissions.find(m => m.id === 'foundation-asymptotics').trace(variant)
    assert.ok(asymptotics.filter(f => f.op === 'compare').every(f => f.counters.sampleHolds === 1))
    assert.ok(asymptotics.at(-1).formula.includes('not proof'))

    const correctness = structuresMissions.find(m => m.id === 'foundation-correctness').trace(variant)
    assert.equal(correctness[0].counters.invariant, 1)
    assert.ok(correctness.slice(1, -1).every(f => f.counters.invariant === 1))
    assert.equal(correctness.at(-1).counters.invariant, 1)
    assert.ok(correctness.at(-1).formula.includes('does not prove all inputs'))

    const operations = structuresMissions.find(m => m.id === 'structure-string-operations').trace(variant)
    assert.equal(operations.find(f => f.formula.startsWith('Substring')).groups[0].items.map(x => x.value).join(''), variant ? 'HI' : 'AT')
    assert.equal(operations.at(-1).output.map(x => x.value).join(''), variant ? 'SXIP' : 'DXTA')

    const linked = structuresMissions.find(m => m.id === 'structure-stack-queue-variants').trace(variant)
    assert.equal(linked.at(-1).counters.arrayQueueSize, linked.at(-1).counters.linkedQueueSize)
    assert.equal(linked.find(f => f.formula.startsWith('Linked queue enqueue')).counters.linkedLinkWrites, 1)
  }
})
