import test from 'node:test'
import assert from 'node:assert/strict'
import { sortingMissions } from '../src/game/simulation/sorting.ts'

const expectedIds = ['sort-insertion-direct','sort-insertion-binary','sort-shell','sort-bubble','sort-selection','sort-tournament','sort-heap','sort-quick','sort-merge','sort-bucket','sort-radix','sort-counting','external-kway-merge','external-replacement-selection','external-optimal-merge']
const sortedIds = expectedIds.filter(id => id !== 'external-replacement-selection' && id !== 'external-optimal-merge')
const missionById = new Map(sortingMissions.map(m => [m.id, m]))

test('all missions have deterministic complete start and done traces for both variants', () => {
  assert.deepEqual(sortingMissions.map(m => m.id), expectedIds)
  for (const mission of sortingMissions) for (const variant of [0, 1]) {
    const a = mission.trace(variant), b = mission.trace(variant)
    assert.ok(a.length >= 3, mission.id)
    assert.equal(a[0].op, 'start')
    assert.equal(a.at(-1).op, 'done')
    assert.deepEqual(a, b)
  }
})

test('all trace coordinates are normalized and every edge references a displayed node', () => {
  for (const mission of sortingMissions) for (const variant of [0, 1]) for (const frame of mission.trace(variant)) {
    const nodeIds = new Set((frame.nodes ?? []).map(n => n.id))
    for (const node of frame.nodes ?? []) {
      assert.ok(Number.isFinite(node.x) && node.x >= 0 && node.x <= 1, `${mission.id}: x=${node.x}`)
      assert.ok(Number.isFinite(node.y) && node.y >= 0 && node.y <= 1, `${mission.id}: y=${node.y}`)
    }
    for (const edge of frame.edges ?? []) {
      assert.ok(nodeIds.has(edge.from), `${mission.id}: missing edge source ${edge.from}`)
      assert.ok(nodeIds.has(edge.to), `${mission.id}: missing edge target ${edge.to}`)
    }
  }
})

test('sorting missions produce the native numeric reference order and preserve identities', () => {
  for (const id of sortedIds) for (const variant of [0, 1]) {
    const frames = missionById.get(id).trace(variant), start = frames[0].items, out = frames.at(-1).output
    assert.deepEqual(out.map(x => x.value), start.map(x => x.value).sort((a, b) => a - b), id)
    assert.deepEqual([...out.map(x => x.id)].sort(), [...start.map(x => x.id)].sort(), id)
  }
})

test('stable algorithms retain duplicate input identity order', () => {
  for (const id of ['sort-insertion-direct','sort-insertion-binary','sort-bubble','sort-merge','sort-radix','sort-counting']) {
    const frames = missionById.get(id).trace(0)
    const originals = frames[0].items, output = frames.at(-1).output
    for (const value of new Set(originals.map(x => x.value))) {
      const expected = originals.filter(x => x.value === value).map(x => x.id)
      const actual = output.filter(x => x.value === value).map(x => x.id)
      assert.deepEqual(actual, expected, id)
    }
  }
})

test('counting sort uses bounded integer keys, visible frequencies and prefixes, with no key comparisons', () => {
  for (const variant of [0, 1]) {
    const frames = missionById.get('sort-counting').trace(variant), input = frames[0].items.map(x => x.value), done = frames.at(-1)
    assert.ok(input.every(x => Number.isInteger(x) && x >= 0 && x <= 7))
    assert.deepEqual(done.output.map(x => x.value), [...input].sort((a, b) => a - b))
    assert.equal(done.counters.comparisons, 0)
    assert.ok(frames.some(f => f.matrix?.rows?.includes('frequency')))
    assert.ok(frames.some(f => f.matrix?.rows?.includes('prefix positions')))
    assert.ok(frames.some(f => f.groups?.some(g => g.id === 'stable-output')))
  }
})

test('insertion and shell held-key frames show every identity exactly once across row and held group', () => {
  for (const id of ['sort-insertion-direct','sort-insertion-binary','sort-shell']) {
    const frames = missionById.get(id).trace(0)
    for (const f of frames.filter(x => x.groups?.some(g => g.id === 'held-key'))) {
      const ids = [...f.items.map(x => x.id), ...f.groups.find(g => g.id === 'held-key').items.map(x => x.id)]
      assert.equal(new Set(ids).size, ids.length, `${id}: ${f.formula}`)
      assert.ok(f.items.some(x => x.value === '□'))
    }
  }
})

test('tournament extraction replays only one root-to-leaf path per emitted winner', () => {
  const frames = missionById.get('sort-tournament').trace(0)
  const height = Math.ceil(Math.log2(frames[0].items.length))
  const emissions = frames.map((f, i) => f.op === 'remove' ? i : -1).filter(i => i >= 0)
  for (let k = 1; k < emissions.length; k++) {
    const compares = frames.slice(emissions[k - 1] + 1, emissions[k]).filter(f => f.op === 'compare').length
    assert.ok(compares <= height, `expected <=${height} replay comparisons, got ${compares}`)
  }
})

test('radix sort demonstrates stable LSD passes over multiple digit places', () => {
  for (const variant of [0, 1]) {
    const passes = missionById.get('sort-radix').trace(variant).filter(f => f.op === 'merge' && f.formula.includes('place'))
    assert.ok(passes.length >= 2)
  }
})

test('last-item quicksort exposes the reversed-input quadratic case', () => {
  const frames = missionById.get('sort-quick').trace(1)
  assert.equal(frames.at(-1).counters.comparisons, 21)
  assert.match(frames.at(-1).formula, /output\[i\]/)
})

test('heap frames show the actual array tree and satisfy max-heap order', () => {
  const frames = missionById.get('sort-heap').trace(0)
  const built = frames.find(f => f.formula.startsWith('build max-heap'))
  assert.ok(built?.nodes?.length)
  for (let i = 0; i < built.nodes.length; i++) for (const child of [2 * i + 1, 2 * i + 2]) if (child < built.nodes.length) assert.ok(built.nodes[i].value >= built.nodes[child].value)
  assert.ok(frames.some(f => f.edges?.length))
})

test('replacement selection emits real monotone runs and preserves all records', () => {
  for (const variant of [0, 1]) {
    const frames = missionById.get('external-replacement-selection').trace(variant)
    const completed = frames.flatMap(f => (f.groups ?? []).filter(g => g.id === 'closed-run').map(g => g.items.map(x => x.value)))
    const closedCount = completed.reduce((sum, run) => sum + run.length, 0)
    const finalPartial = frames.at(-1).output.map(x => x.value).slice(closedCount)
    if (finalPartial?.length) completed.push(finalPartial)
    assert.ok(completed.length >= 2)
    for (const xs of completed) for (let i = 1; i < xs.length; i++) assert.ok(xs[i - 1] <= xs[i])
    const start = frames[0].items.map(x => x.id).sort(), output = frames.at(-1).output.map(x => x.id).sort()
    assert.deepEqual(output, start)
  }
})

test('k-way merge only emits sorted output and advances real run fronts', () => {
  const frames = missionById.get('external-kway-merge').trace(0)
  const out = frames.at(-1).output.map(x => x.value)
  assert.deepEqual(out, [...out].sort((a, b) => a - b))
  assert.equal(frames.at(-1).counters.blockReads, 4)
  assert.equal(frames.at(-1).counters.blockWrites, 3)
  assert.ok(frames.some(f => f.formula.startsWith('read block')))
  assert.ok(frames.some(f => f.formula.startsWith('flush output block')))
  for (const f of frames) for (const g of f.groups ?? []) {
    if (g.id.startsWith('input-buffer-')) assert.ok(g.items.length <= 2)
    if (g.id === 'output-buffer') assert.ok(g.items.length <= 3)
  }
})

test('replacement selection reports bounded memory and input/output block I/O', () => {
  for (const variant of [0, 1]) {
    const frames = missionById.get('external-replacement-selection').trace(variant)
    const done = frames.at(-1)
    assert.ok(done.counters.blockReads > 0)
    assert.ok(done.counters.blockWrites > 0)
    assert.equal(done.counters.inputBlockSize, 2)
    assert.equal(done.counters.outputBlockSize, 2)
    assert.equal(done.counters.blockReads, 4)
    assert.ok(frames.some(f => f.groups?.some(g => g.id === 'input-buffer')))
    const closedRuns = frames.flatMap(f => (f.groups ?? []).filter(g => g.id === 'closed-run').map(g => g.items.length))
    const unclosedTail = done.output.length - closedRuns.reduce((sum, n) => sum + n, 0)
    const allRunLengths = [...closedRuns, ...(unclosedTail ? [unclosedTail] : [])]
    assert.equal(done.counters.blockWrites, allRunLengths.reduce((sum, n) => sum + Math.ceil(n / 2), 0))
    for (const f of frames) for (const g of f.groups ?? []) {
      if (g.id === 'active-heap') assert.ok(g.items.length <= 3)
      if (g.id === 'input-buffer') assert.ok(g.items.length <= 2)
    }
  }
})

test('optimal merge cost matches brute-force minimum over every pair order', () => {
  const brute = weights => {
    if (weights.length <= 1) return 0
    let best = Infinity
    for (let i = 0; i < weights.length; i++) for (let j = i + 1; j < weights.length; j++) {
      const sum = weights[i] + weights[j], rest = weights.filter((_, k) => k !== i && k !== j)
      best = Math.min(best, sum + brute([...rest, sum]))
    }
    return best
  }
  for (const variant of [0, 1]) {
    const frames = missionById.get('external-optimal-merge').trace(variant), expected = brute(frames[0].items.map(x => x.value))
    assert.equal(frames.at(-1).counters.cumulativeCost, expected)
    assert.ok(frames.slice(1, -1).every(f => f.op === 'merge'))
  }
})
