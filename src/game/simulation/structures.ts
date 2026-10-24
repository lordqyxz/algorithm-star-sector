import type { CourseMission, TraceFrame } from '../types'
import { record } from './trace'

const make = (
  op: TraceFrame['op'],
  formula: string,
  counters: TraceFrame['counters'],
  extra: Omit<TraceFrame, 'op' | 'formula' | 'counters'> = {},
): TraceFrame => ({ op, formula, counters, ...extra })
const push = (out: TraceFrame[], frame: TraceFrame) => record(out, frame)
const item = (
  id: string,
  value: string | number,
  tone?: TraceFrame['items'] extends (infer T)[] | undefined
    ? T extends { tone?: infer U }
      ? U
      : never
    : never,
) => ({ id, value, tone })
const mission = (
  id: string,
  chapter: CourseMission['chapter'],
  trace: CourseMission['trace'],
): CourseMission => ({ id, chapter, sources: ['structures'], trace })

function traceLists(variant: 0 | 1): TraceFrame[] {
  const values = variant ? [2, 5, 9, 14] : [1, 4, 8]
  const at = variant ? 2 : 1
  const out: TraceFrame[] = []
  const ids = values.map((_, i) => `n${i}`)
  const nodes = values.map((value, i) => ({
    id: ids[i],
    value,
    x: 0.15 + i * 0.18,
    y: 0.5,
  }))
  const links = (circular = false) =>
    ids.flatMap((id, i) => {
      const next =
        i + 1 < ids.length ? ids[i + 1] : circular ? ids[0] : undefined
      return next ? [{ from: id, to: next, directed: true }] : []
    })
  push(
    out,
    make(
      'start',
      'Singly linked list: each node stores next; head has no predecessor',
      { length: ids.length },
      { nodes, edges: links() },
    ),
  )
  const newId = 'inserted'
  ids.splice(at, 0, newId)
  values.splice(at, 0, variant ? 7 : 6)
  nodes.splice(at, 0, { id: newId, value: values[at], x: 0, y: 0.25 })
  nodes.forEach((node, i) => {
    node.x = 0.12 + i * 0.15
  })
  push(
    out,
    make(
      'insert',
      'Doubly linked insertion updates prev.next and next.prev',
      { index: at, length: ids.length, linkWrites: 4 },
      {
        nodes,
        edges: [
          ...links(),
          ...ids
            .slice(1)
            .map((id, i) => ({ from: id, to: ids[i], directed: true })),
        ],
      },
    ),
  )
  push(
    out,
    make(
      'visit',
      'Circular linked list: tail.next points to head; stop when traversal returns to head',
      { visited: ids.length, returnedToHead: 1 },
      { nodes, edges: links(true) },
    ),
  )
  push(
    out,
    make(
      'done',
      'Singly, doubly, and circular links preserve node identity while changing pointers',
      {
        length: ids.length,
        head: Number(ids[0] === 'n0'),
        tail: Number(ids.at(-1) !== ids[0]),
      },
      {
        nodes,
        edges: [
          ...links(true),
          ...ids
            .slice(1)
            .map((id, i) => ({ from: id, to: ids[i], directed: true })),
        ],
      },
    ),
  )
  return out
}

function traceCircularQueue(variant: 0 | 1): TraceFrame[] {
  const capacity = variant ? 5 : 4
  const ring: (number | null)[] = Array(capacity).fill(null)
  const out: TraceFrame[] = []
  let front = 0,
    rear = 0,
    size = 0
  const snapshot = (active = -1) =>
    ring.map((value, index) =>
      item(
        `slot${index}`,
        value ?? 'empty',
        index === active ? 'active' : undefined,
      ),
    )
  const enqueue = (value: number) => {
    if (size === capacity) throw new Error('queue full')
    ring[rear] = value
    const insertedAt = rear
    rear = (rear + 1) % capacity
    size++
    push(
      out,
      make(
        'insert',
        'Circular queue: A[rear] = x; rear = (rear + 1) mod capacity',
        { capacity, front, rear, size, value },
        { items: snapshot(insertedAt) },
      ),
    )
  }
  const dequeue = () => {
    if (!size) throw new Error('queue empty')
    const removed = ring[front]!
    const removedAt = front
    ring[front] = null
    front = (front + 1) % capacity
    size--
    push(
      out,
      make(
        'remove',
        'Circular queue: remove A[front]; front = (front + 1) mod capacity',
        { capacity, front, rear, size, removed },
        { items: snapshot(removedAt) },
      ),
    )
    return removed
  }
  push(
    out,
    make(
      'start',
      'Fixed ring buffer stores front, rear, and size; no elements shift',
      { capacity, front, rear, size },
      { items: snapshot() },
    ),
  )
  const first = variant ? [6, 3, 9, 12] : [5, 2, 8]
  first.forEach(enqueue)
  dequeue()
  dequeue()
  enqueue(variant ? 15 : 6)
  enqueue(variant ? 18 : 9)
  push(
    out,
    make(
      'done',
      'Modulo indices wrap rear to a freed slot while FIFO order stays intact',
      { capacity, front, rear, size, wrapped: Number(rear < front) },
      {
        items: snapshot(),
        output: Array.from({ length: size }, (_, i) =>
          item(`out${i}`, ring[(front + i) % capacity]!),
        ),
      },
    ),
  )
  return out
}

function traceGeneralizedList(variant: 0 | 1): TraceFrame[] {
  type G = string | G[]
  const structure: G[] = variant ? ['a', ['b', ['c', 'd']]] : ['x', ['y', 'z']]
  const out: TraceFrame[] = []
  const nodes: { id: string; value: string; x: number; y: number }[] = []
  const edges: { from: string; to: string; directed: boolean }[] = []
  let serial = 0
  const build = (value: G, parent?: string, depth = 0): string => {
    const id = `g${serial++}`
    nodes.push({
      id,
      value: Array.isArray(value) ? 'list' : value,
      x: Math.min(0.08 + (nodes.length % 8) * 0.12, 0.92),
      y: Math.min(0.15 + depth * 0.22, 0.85),
    })
    if (parent) edges.push({ from: parent, to: id, directed: true })
    if (Array.isArray(value))
      value.forEach((child) => build(child, id, depth + 1))
    return id
  }
  structure.forEach((value) => build(value))
  push(
    out,
    make(
      'start',
      'Generalized list nodes contain atoms or child-list references',
      {
        nodes: nodes.length,
        atoms: nodes.filter((n) => n.value !== 'list').length,
      },
      { nodes, edges },
    ),
  )
  let visits = 0
  const visit = (value: G): void => {
    const node = nodes[visits]
    visits++
    if (Array.isArray(value)) value.forEach(visit)
    push(
      out,
      make(
        'visit',
        Array.isArray(value)
          ? 'DFS enters child list, visits its elements, then returns'
          : 'DFS visits atom',
        { visits, depthFirst: 1 },
        {
          nodes: nodes.map((n) => ({
            ...n,
            tone: n.id === node.id ? 'active' : undefined,
          })),
          edges,
        },
      ),
    )
  }
  structure.forEach(visit)
  push(
    out,
    make(
      'done',
      'Each node is reached once by depth-first traversal: O(V + E)',
      { visits, atoms: nodes.filter((n) => n.value !== 'list').length },
      { nodes, edges },
    ),
  )
  return out
}

function traceHashing(variant: 0 | 1): TraceFrame[] {
  const keys = variant ? [18, 28, 38, 12] : [23, 33, 43, 14]
  const capacity = 10
  const slots: (number | null)[] = Array(capacity).fill(null)
  const buckets: number[][] = Array.from({ length: capacity }, () => [])
  const out: TraceFrame[] = []
  let probes = 0
  push(
    out,
    make(
      'start',
      'Hash linear probing: h(k) = k mod m; chaining stores values in bucket lists',
      { capacity, probes },
      { items: slots.map((v, i) => item(`s${i}`, v ?? 'empty')) },
    ),
  )
  for (const key of keys) {
    const bucket = key % capacity
    buckets[bucket].push(key)
    let index = bucket
    while (slots[index] !== null) {
      index = (index + 1) % capacity
      probes++
    }
    slots[index] = key
    probes++
    push(
      out,
      make(
        'insert',
        'Linear probing checks consecutive slots; chaining appends to bucket h(k)',
        { key, bucket, slot: index, probes },
        {
          items: slots.map((v, i) =>
            item(`s${i}`, v ?? 'empty', i === index ? 'settled' : undefined),
          ),
          groups: [
            {
              id: `bucket-${bucket}`,
              items: buckets[bucket].map((v, i) => item(`b${bucket}-${i}`, v)),
            },
          ],
        },
      ),
    )
  }
  const target = keys[1]
  const bucket = target % capacity
  let chainComparisons = 0
  while (buckets[bucket][chainComparisons] !== target) chainComparisons++
  let index = bucket,
    probeComparisons = 1
  while (slots[index] !== target) {
    index = (index + 1) % capacity
    probeComparisons++
  }
  push(
    out,
    make(
      'done',
      'Chaining scans its bucket; linear probing follows the same insertion probe sequence',
      {
        key: target,
        chainComparisons: chainComparisons + 1,
        linearProbeComparisons: probeComparisons,
        keys: keys.length,
      },
      {
        groups: [
          {
            id: `bucket-${bucket}`,
            items: buckets[bucket].map((v, i) => item(`chain${i}`, v)),
          },
        ],
        output: [item('found', target)],
      },
    ),
  )
  return out
}

function traceMemorySafety(variant: 0 | 1): TraceFrame[] {
  const values = [10, 20, 30]
  const out: TraceFrame[] = []
  let alive = false,
    errors = 0,
    validReads = 0
  push(
    out,
    make(
      'start',
      'Access requires a live allocation and an index in [0, length)',
      { length: values.length, errors, validReads },
      { items: values.map((v, i) => item(`m${i}`, v)) },
    ),
  )
  const allocate = () => {
    alive = true
    push(
      out,
      make(
        'select',
        'allocate marks the region live',
        { alive: 1, errors },
        { items: values.map((v, i) => item(`m${i}`, v)) },
      ),
    )
  }
  const read = (index: number) => {
    const valid = alive && index >= 0 && index < values.length
    if (valid) validReads++
    else errors++
    push(
      out,
      make(
        valid ? 'visit' : 'reject',
        !alive
          ? 'read rejected: use after free'
          : `read index ${index}; valid iff 0 <= index < length`,
        { index, alive: Number(alive), errors, validReads },
        {
          items: values.map((v, i) =>
            item(`m${i}`, v, i === index && !valid ? 'red' : undefined),
          ),
          output: valid ? [item('read-value', values[index])] : [],
        },
      ),
    )
  }
  const free = () => {
    const valid = alive
    if (!valid) errors++
    else alive = false
    push(
      out,
      make(
        valid ? 'remove' : 'reject',
        valid
          ? 'free changes live allocation to released'
          : 'free rejected: double free',
        { alive: Number(alive), errors, validReads },
        { items: valid ? [] : values.map((v, i) => item(`m${i}`, v, 'red')) },
      ),
    )
  }
  allocate()
  if (variant) {
    read(values.length)
    free()
    free()
  } else {
    free()
    read(1)
  }
  push(
    out,
    make(
      'done',
      'Bounds, allocation lifetime, and single-free ownership checks reject invalid operations',
      { errors, validReads, alive: Number(alive) },
      { output: [] },
    ),
  )
  return out
}

function traceMemoryStrategies(variant: 0 | 1): TraceFrame[] {
  const out: TraceFrame[] = []
  type Block = { start: number; size: number; free: boolean }
  const tags: Block[] = [
    { start: 0, size: 8, free: false },
    { start: 8, size: 8, free: true },
    { start: 16, size: 8, free: false },
    { start: 24, size: 8, free: true },
  ]
  const blocks = new Map<number, Block>([
    [0, { start: 0, size: 64, free: true }],
  ])
  const show = () =>
    [...blocks.values()]
      .sort((a, b) => a.start - b.start)
      .map((b) =>
        item(`b${b.start}`, `${b.start}:${b.size}:${b.free ? 'free' : 'used'}`),
      )
  const showTags = () =>
    tags.map((b) =>
      item(`tag${b.start}`, `${b.start}:${b.size}:${b.free ? 'free' : 'used'}`),
    )
  push(
    out,
    make(
      'start',
      'Boundary tags track each physical block size and free state; buddy arena starts as one free block',
      { tagBlocks: tags.length, freeBytes: 64, blocks: 1 },
      {
        groups: [
          { id: 'boundary-tags', items: showTags() },
          { id: 'buddy-arena', items: show() },
        ],
      },
    ),
  )
  for (const releasedStart of [0, 16]) {
    const released = tags.find((b) => b.start === releasedStart)!
    released.free = true
    let index = tags.indexOf(released)
    let tagMerges = 0
    while (true) {
      if (index > 0 && tags[index - 1].free) {
        const left = tags[index - 1],
          current = tags[index]
        tags.splice(index - 1, 2, {
          start: left.start,
          size: left.size + current.size,
          free: true,
        })
        index--
        tagMerges++
        continue
      }
      if (index + 1 < tags.length && tags[index + 1].free) {
        const current = tags[index],
          right = tags[index + 1]
        tags.splice(index, 2, {
          start: current.start,
          size: current.size + right.size,
          free: true,
        })
        tagMerges++
        continue
      }
      break
    }
    push(
      out,
      make(
        'merge',
        'Boundary tags check both physical neighbors and coalesce each adjacent free block',
        {
          releasedStart,
          mergedBlockSize: tags[index].size,
          tagMerges,
          tagBlocks: tags.length,
        },
        {
          groups: [
            { id: 'boundary-tags', items: showTags() },
            { id: 'buddy-arena', items: show() },
          ],
        },
      ),
    )
  }
  const need = variant ? 16 : 8
  let block = blocks.get(0)!
  while (block.size > need) {
    blocks.delete(block.start)
    const half = block.size / 2
    blocks.set(block.start, { start: block.start, size: half, free: true })
    blocks.set(block.start + half, {
      start: block.start + half,
      size: half,
      free: true,
    })
    block = blocks.get(block.start)!
    push(
      out,
      make(
        'split',
        'Buddy allocator splits a free block into two equal aligned halves',
        {
          splitSize: half * 2,
          buddySize: half,
          freeBlocks: [...blocks.values()].filter((b) => b.free).length,
        },
        { groups: [{ id: 'arena', items: show() }] },
      ),
    )
  }
  block.free = false
  push(
    out,
    make(
      'select',
      'Allocate the leftmost buddy block that fits the request',
      { address: block.start, allocatedBytes: block.size },
      { groups: [{ id: 'arena', items: show() }] },
    ),
  )
  block.free = true
  push(
    out,
    make(
      'remove',
      'Release marks the allocated buddy block free before coalescing',
      { address: block.start, releasedBytes: block.size },
      { groups: [{ id: 'arena', items: show() }] },
    ),
  )
  let merges = 0
  while (block.size < 64) {
    const buddyStart = block.start ^ block.size
    const buddy = blocks.get(buddyStart)
    if (!buddy || !buddy.free || buddy.size !== block.size) break
    const low = Math.min(block.start, buddy.start)
    blocks.delete(block.start)
    blocks.delete(buddy.start)
    block = { start: low, size: block.size * 2, free: true }
    blocks.set(low, block)
    merges++
    push(
      out,
      make(
        'merge',
        'Buddy address = start XOR blockSize; merge only with a free equal-size buddy',
        { buddyStart, mergedStart: low, mergedSize: block.size, merges },
        { groups: [{ id: 'arena', items: show() }] },
      ),
    )
  }
  push(
    out,
    make(
      'done',
      'Boundary-tag state records adjacent free blocks; buddy coalescing checks aligned XOR partners',
      {
        freeBytes: [...blocks.values()]
          .filter((b) => b.free)
          .reduce((n, b) => n + b.size, 0),
        blocks: blocks.size,
        merges,
      },
      { output: show() },
    ),
  )
  return out
}

function traceKmp(variant: 0 | 1): TraceFrame[] {
  const pattern = variant ? 'ABABAC' : 'ABABC'
  const text = variant ? 'ABABABAC' : 'ABABDABABC'
  const out: TraceFrame[] = []
  const patternItems = (active = -1) =>
    [...pattern].map((c, i) =>
      item(`p${i}`, c, i === active ? 'active' : undefined),
    )
  const textItems = (active = -1) =>
    [...text].map((c, i) =>
      item(`t${i}`, c, i === active ? 'active' : undefined),
    )
  let naiveComparisons = 0,
    naiveMatch = -1
  push(
    out,
    make(
      'start',
      'Naive search checks each alignment; KMP builds reusable prefix lengths',
      {
        textLength: text.length,
        patternLength: pattern.length,
        naiveComparisons,
      },
      { items: patternItems() },
    ),
  )
  for (
    let start = 0;
    start <= text.length - pattern.length && naiveMatch < 0;
    start++
  ) {
    let j = 0
    while (j < pattern.length) {
      naiveComparisons++
      const index = start + j
      const equal = text[index] === pattern[j]
      push(
        out,
        make(
          'compare',
          'Naive search: compare T[start + j] with P[j]',
          { start, patternIndex: j, naiveComparisons },
          { items: textItems(index), output: patternItems(j) },
        ),
      )
      if (!equal) break
      j++
    }
    if (j === pattern.length) naiveMatch = start
  }
  const lps = Array(pattern.length).fill(0)
  let len = 0,
    i = 1,
    prefixComparisons = 0
  while (i < pattern.length) {
    prefixComparisons++
    if (pattern[i] === pattern[len]) {
      lps[i++] = ++len
    } else if (len > 0) {
      len = lps[len - 1]
    } else {
      lps[i++] = 0
    }
    push(
      out,
      make(
        'update',
        'KMP prefix build: LPS[i] is longest proper prefix that is also suffix',
        { index: i - 1, matchedPrefix: len, prefixComparisons },
        {
          items: patternItems(i - 1),
          output: lps.map((v, j) => item(`l${j}`, v)),
        },
      ),
    )
  }
  let ti = 0,
    pi = 0,
    kmpComparisons = 0,
    kmpMatch = -1
  while (ti < text.length) {
    kmpComparisons++
    const equal = text[ti] === pattern[pi]
    if (equal) {
      ti++
      pi++
      if (pi === pattern.length) {
        kmpMatch = ti - pi
        break
      }
    } else if (pi > 0) {
      pi = lps[pi - 1]
    } else {
      ti++
    }
    push(
      out,
      make(
        'compare',
        'KMP mismatch reuses LPS; text index never moves backward',
        { textIndex: ti, patternIndex: pi, kmpComparisons },
        { items: textItems(ti), output: lps.map((v, j) => item(`l${j}`, v)) },
      ),
    )
  }
  push(
    out,
    make(
      'done',
      'Naive search checks each alignment; KMP reuses LPS so text index never retreats',
      {
        naiveComparisons,
        prefixComparisons,
        kmpComparisons,
        naiveMatchIndex: naiveMatch,
        kmpMatchIndex: kmpMatch,
        matchesAgree: Number(naiveMatch === kmpMatch),
      },
      {
        output:
          kmpMatch < 0 ? [] : [...pattern].map((c, j) => item(`match${j}`, c)),
      },
    ),
  )
  return out
}

function traceStringOperations(variant: 0 | 1): TraceFrame[] {
  type Char = { id: string; value: string }
  const a = [...(variant ? 'SHIP' : 'DATA')].map((value, i) => ({
    id: `a${i}`,
    value,
  }))
  const b = [...(variant ? 'LOG' : 'LAB')].map((value, i) => ({
    id: `b${i}`,
    value,
  }))
  const out: TraceFrame[] = []
  const view = (xs: Char[]) => xs.map((c) => item(c.id, c.value))
  const edges = (xs: Char[]) =>
    xs
      .slice(0, -1)
      .map((c, i) => ({ from: c.id, to: xs[i + 1].id, directed: true }))
  push(
    out,
    make(
      'start',
      'Sequential string = contiguous characters; linked string = nodes joined by next pointers',
      { aLength: a.length, bLength: b.length },
      {
        groups: [
          { id: 'array-A', items: view(a) },
          { id: 'linked-A', items: view(a) },
        ],
        nodes: a.map((c, i) => ({ ...c, x: 0.15 + i * 0.2, y: 0.6 })),
        edges: edges(a),
      },
    ),
  )
  const concat = [
    ...a.map((c) => ({ ...c, id: `copy-${c.id}` })),
    ...b.map((c) => ({ ...c, id: `copy-${c.id}` })),
  ]
  const linkedConcat = [...a, ...b]
  push(
    out,
    make(
      'insert',
      'Concatenate: sequential storage copies |A| + |B| chars; linked storage links tailA to headB',
      {
        resultLength: concat.length,
        sequentialCopies: concat.length,
        linkedLinkWrites: 1,
      },
      {
        groups: [
          { id: 'array-concat', items: view(concat) },
          { id: 'linked-concat', items: view(linkedConcat) },
        ],
        nodes: linkedConcat.map((c, i) => ({
          ...c,
          x: 0.08 + i * 0.12,
          y: 0.6,
        })),
        edges: edges(linkedConcat),
      },
    ),
  )
  const arraySub = a.slice(1, 3).map((c) => ({ ...c, id: `sub-${c.id}` }))
  push(
    out,
    make(
      'select',
      'Substring [1, 3): visit two source positions; sequential output copies two chars',
      { start: 1, endExclusive: 3, sequentialCopies: 2, linkedVisits: 2 },
      {
        groups: [
          { id: 'array-substring', items: view(arraySub) },
          { id: 'linked-substring', items: view(a.slice(1, 3)) },
        ],
      },
    ),
  )
  const arrayInsert = [...a.slice(0, 2), { id: 'x', value: 'X' }, ...a.slice(2)]
  const linkedInsert = [
    ...a.slice(0, 2),
    { id: 'x', value: 'X' },
    ...a.slice(2),
  ]
  push(
    out,
    make(
      'insert',
      'Insert X at index 2: sequential storage shifts suffix; linked storage changes links',
      { index: 2, sequentialShifts: a.length - 2, linkedLinkWrites: 2 },
      {
        groups: [
          { id: 'array-insert', items: view(arrayInsert) },
          { id: 'linked-insert', items: view(linkedInsert) },
        ],
        nodes: linkedInsert.map((c, i) => ({
          ...c,
          x: 0.1 + i * 0.16,
          y: 0.55,
        })),
        edges: edges(linkedInsert),
      },
    ),
  )
  const arrayDelete = arrayInsert.filter((_, i) => i !== 1)
  const linkedDelete = linkedInsert.filter((_, i) => i !== 1)
  push(
    out,
    make(
      'remove',
      'Delete index 1: sequential storage shifts suffix; linked storage bypasses the removed node',
      {
        index: 1,
        sequentialShifts: arrayInsert.length - 2,
        linkedLinkWrites: 1,
        deletedId: arrayInsert[1].id,
      },
      {
        groups: [
          { id: 'array-delete', items: view(arrayDelete) },
          { id: 'linked-delete', items: view(linkedDelete) },
        ],
        nodes: linkedDelete.map((c, i) => ({
          ...c,
          x: 0.1 + i * 0.18,
          y: 0.5,
        })),
        edges: edges(linkedDelete),
      },
    ),
  )
  push(
    out,
    make(
      'done',
      'Sequential string edits move or copy character ranges; linked string edits relink nodes',
      {
        length: arrayDelete.length,
        sameValues: Number(
          arrayDelete.map((c) => c.value).join('') ===
            linkedDelete.map((c) => c.value).join(''),
        ),
      },
      { output: view(arrayDelete) },
    ),
  )
  return out
}

function traceFoundationModeling(variant: 0 | 1): TraceFrame[] {
  const input = variant ? [8, 3, 6, 1] : [5, 2, 4, 1]
  const out: TraceFrame[] = []
  push(
    out,
    make(
      'start',
      'Task: order finite input records by key; output is same keys in nondecreasing order',
      { inputCount: input.length },
      {
        groups: [
          { id: 'input', items: input.map((v, i) => item(`in${i}`, v)) },
          { id: 'output', items: [] },
        ],
      },
    ),
  )
  push(
    out,
    make(
      'select',
      'ADT: sequence supports read(i), insert(i,x), delete(i); precondition indices are in range',
      {
        arrayReadCost: 1,
        arrayInsertMoves: input.length - 1,
        linkedReadCost: input.length,
        linkedInsertLinkWrites: 2,
      },
      {
        groups: [
          { id: 'array', items: input.map((v, i) => item(`a${i}`, v)) },
          { id: 'linked', items: input.map((v, i) => item(`l${i}`, v)) },
        ],
      },
    ),
  )
  const prefix: number[] = []
  let comparisons = 0
  for (const value of input) {
    let at = 0
    while (at < prefix.length && prefix[at] < value) {
      at++
      comparisons++
    }
    if (at < prefix.length) comparisons++
    prefix.splice(at, 0, value)
    push(
      out,
      make(
        'insert',
        'Algorithm: insert each key into its ordered prefix; seen prefix remains sorted',
        {
          seen: prefix.length,
          comparisons,
          inserted: value,
          insertionIndex: at,
        },
        {
          groups: [
            {
              id: 'ordered-prefix',
              items: prefix.map((v, i) => item(`p${i}`, v)),
            },
          ],
        },
      ),
    )
  }
  const precondition = Number(input.every(Number.isFinite))
  const postcondition = Number(
    prefix.every((v, i) => i === 0 || prefix[i - 1] <= v) &&
      [...prefix].sort((a, b) => a - b).join() ===
        [...input].sort((a, b) => a - b).join(),
  )
  push(
    out,
    make(
      'done',
      'Postcondition: output is ordered and preserves input keys',
      { precondition, postcondition, comparisons },
      { output: prefix.map((v, i) => item(`out${i}`, v)) },
    ),
  )
  return out
}

function traceFoundationMathematics(variant: 0 | 1): TraceFrame[] {
  const n = variant ? 16 : 8,
    out: TraceFrame[] = []
  let sum = 0
  for (let k = 1; k <= n; k++) sum += k
  push(
    out,
    make(
      'start',
      '1 + 2 + ... + n = n(n + 1) / 2',
      { n, computedSum: sum, formulaSum: (n * (n + 1)) / 2 },
      {
        output: Array.from({ length: Math.min(n, 10) }, (_, i) =>
          item(`term${i + 1}`, i + 1),
        ),
      },
    ),
  )
  let value = n,
    divisions = 0
  while (value > 1) {
    value = Math.floor(value / 2)
    divisions++
  }
  push(
    out,
    make(
      'update',
      'Repeated halving reaches 1 in log2(n) steps for power-of-two n',
      { n, quotient: value, divisions, log2: Math.log2(n) },
      {
        output: Array.from({ length: divisions + 1 }, (_, i) =>
          item(`half${i}`, n / 2 ** i),
        ),
      },
    ),
  )
  let size = 1,
    recurrence = 1,
    depth = 0
  while (size < n) {
    recurrence = 2 * recurrence + 2 * size
    size *= 2
    depth++
    push(
      out,
      make(
        'update',
        'T(2m) = 2T(m) + 2m, T(1) = 1',
        { depth, size, recurrence },
        { output: [item(`T${size}`, recurrence)] },
      ),
    )
  }
  push(
    out,
    make(
      'done',
      'Arithmetic sum, logarithmic halving, and recurrence values follow their definitions',
      { n, computedSum: sum, divisions, recurrence, depth },
      {
        output: [
          item('sum', sum),
          item('log2', divisions),
          item('Tn', recurrence),
        ],
      },
    ),
  )
  return out
}

function traceFoundationAsymptotics(variant: 0 | 1): TraceFrame[] {
  const a = variant ? 4 : 3,
    b = variant ? 3 : 2,
    d = variant ? 2 : 1
  const cUpper = a + b + d,
    cLower = a,
    out: TraceFrame[] = []
  push(
    out,
    make(
      'start',
      'f(n) = a*n^2 + b*n + d; asymptotic witnesses quantify for all n >= n0',
      { a, b, d, n0: 1 },
      { output: [item('f', `${a}n^2+${b}n+${d}`)] },
    ),
  )
  for (const n of [1, 2, 4, 8]) {
    const f = a * n * n + b * n + d,
      lower = cLower * n * n,
      upper = cUpper * n * n
    push(
      out,
      make(
        'compare',
        'Sample check: cLower*g(n) <= f(n) <= cUpper*g(n)',
        {
          n,
          f,
          g: n * n,
          cLower,
          lower,
          cUpper,
          upper,
          sampleHolds: Number(lower <= f && f <= upper),
        },
        { items: [item('lower', lower), item('f', f), item('upper', upper)] },
      ),
    )
  }
  push(
    out,
    make(
      'done',
      'O uses upper witness; Omega uses lower witness; Theta needs both. For n>=1, n<=n^2 and 1<=n^2 prove these bounds; samples alone are not proof.',
      { n0: 1, cUpper, cLower, a, b, d },
      {
        output: [
          item('O', `c=${cUpper}, n0=1`),
          item('Omega', `c=${cLower}, n0=1`),
          item('Theta', 'both witnesses'),
        ],
      },
    ),
  )
  return out
}

function traceFoundationCorrectness(variant: 0 | 1): TraceFrame[] {
  const values = variant ? [3, 1, 4, 2, 5] : [2, 4, 1, 3]
  const out: TraceFrame[] = []
  let sum = 0
  push(
    out,
    make(
      'start',
      'Invariant before iteration i: sum equals sum of A[0..i)',
      { i: 0, sum, expectedPrefixSum: 0, invariant: 1 },
      { items: values.map((v, j) => item(`a${j}`, v)) },
    ),
  )
  for (let i = 0; i < values.length; i++) {
    sum += values[i]
    const expected = values.slice(0, i + 1).reduce((x, y) => x + y, 0)
    push(
      out,
      make(
        'update',
        'Maintenance: add A[i], so sum equals sum of A[0..i+1)',
        {
          i: i + 1,
          added: values[i],
          sum,
          expectedPrefixSum: expected,
          invariant: Number(sum === expected),
        },
        {
          items: values.map((v, j) =>
            item(`a${j}`, v, j === i ? 'active' : undefined),
          ),
          output: [item('sum', sum)],
        },
      ),
    )
  }
  const total = values.reduce((x, y) => x + y, 0)
  push(
    out,
    make(
      'done',
      'Termination: i=n makes the invariant state the whole-input sum. A finite run illustrates proof obligations; it does not prove all inputs.',
      {
        i: values.length,
        n: values.length,
        sum,
        total,
        invariant: Number(sum === total),
        termination: 1,
      },
      { output: [item('total', sum)] },
    ),
  )
  return out
}

function traceStackQueueVariants(variant: 0 | 1): TraceFrame[] {
  const values = variant ? [7, 4, 9] : [6, 2, 8]
  const out: TraceFrame[] = []
  const arrayStack: number[] = []
  const linkedStack: { id: string; value: number; next?: string }[] = []
  const arrayQueue = [...values]
  const linkedQueue: { id: string; value: number; next?: string }[] =
    values.map((value, i) => ({
      id: `q${i}`,
      value,
      next: i + 1 < values.length ? `q${i + 1}` : undefined,
    }))
  let stackSerial = 0
  const stackNodes = () =>
    linkedStack.map((node, i) => ({ ...node, x: 0.5, y: 0.15 + i * 0.18 }))
  const stackEdges = () =>
    linkedStack.flatMap((node) =>
      node.next ? [{ from: node.id, to: node.next, directed: true }] : [],
    )
  push(
    out,
    make(
      'start',
      'Array and linked stacks implement LIFO; linked head is the stack top',
      { stackSize: 0, queueSize: values.length },
      {
        groups: [
          { id: 'array-stack', items: [] },
          { id: 'linked-stack', items: [] },
          {
            id: 'array-queue',
            items: arrayQueue.map((v, i) => item(`aq${i}`, v)),
          },
        ],
        nodes: linkedQueue.map((n, i) => ({
          id: n.id,
          value: n.value,
          x: 0.15 + i * 0.2,
          y: 0.75,
        })),
        edges: linkedQueue
          .slice(0, -1)
          .map((n, i) => ({
            from: n.id,
            to: linkedQueue[i + 1].id,
            directed: true,
          })),
      },
    ),
  )
  for (const value of values) {
    arrayStack.push(value)
    const id = `st${stackSerial++}`
    linkedStack.unshift({ id, value, next: linkedStack[0]?.id })
    push(
      out,
      make(
        'insert',
        'Stack push: array top increments; linked push updates head.next',
        {
          stackSize: arrayStack.length,
          arrayTop: arrayStack.length - 1,
          linkedTop: linkedStack[0].value,
        },
        {
          groups: [
            {
              id: 'array-stack',
              items: arrayStack.map((v, i) => item(`as${i}`, v)),
            },
            {
              id: 'linked-stack',
              items: linkedStack.map((n, i) =>
                item(n.id, n.value, i === 0 ? 'active' : undefined),
              ),
            },
          ],
          nodes: stackNodes(),
          edges: stackEdges(),
        },
      ),
    )
  }
  const arrayPop = arrayStack.pop()!
  const linkedPop = linkedStack.shift()!
  push(
    out,
    make(
      'remove',
      'Stack pop removes top/head; both representations return the same value',
      {
        arrayPop,
        linkedPop: linkedPop.value,
        match: Number(arrayPop === linkedPop.value),
        stackSize: arrayStack.length,
      },
      {
        groups: [
          {
            id: 'array-stack',
            items: arrayStack.map((v, i) => item(`as${i}`, v)),
          },
          {
            id: 'linked-stack',
            items: linkedStack.map((n) => item(n.id, n.value)),
          },
        ],
        nodes: stackNodes(),
        edges: stackEdges(),
      },
    ),
  )
  const removed = arrayQueue.shift()!
  const linkedRemoved = linkedQueue.shift()!
  push(
    out,
    make(
      'remove',
      'Linked queue dequeue advances head; array queue dequeue shifts remaining elements',
      {
        removed,
        linkedRemoved: linkedRemoved.value,
        arrayShifts: arrayQueue.length,
        queueSize: arrayQueue.length,
        head: linkedQueue[0]?.id ?? 'empty',
      },
      {
        groups: [
          {
            id: 'array-queue',
            items: arrayQueue.map((v, i) => item(`aq${i}`, v)),
          },
          {
            id: 'linked-queue',
            items: linkedQueue.map((n) => item(n.id, n.value)),
          },
        ],
        nodes: linkedQueue.map((n, i) => ({
          id: n.id,
          value: n.value,
          x: 0.15 + i * 0.2,
          y: 0.75,
        })),
        edges: linkedQueue
          .slice(0, -1)
          .map((n, i) => ({
            from: n.id,
            to: linkedQueue[i + 1].id,
            directed: true,
          })),
      },
    ),
  )
  const appended = { id: 'qnew', value: variant ? 11 : 10 }
  linkedQueue.at(-1)!.next = appended.id
  linkedQueue.push(appended)
  arrayQueue.push(appended.value)
  push(
    out,
    make(
      'insert',
      'Linked queue enqueue writes oldTail.next and advances tail; array queue appends at rear',
      {
        value: appended.value,
        head: linkedQueue[0].id,
        tail: appended.id,
        queueSize: linkedQueue.length,
        linkedLinkWrites: 1,
      },
      {
        groups: [
          {
            id: 'array-queue',
            items: arrayQueue.map((v, i) => item(`aq${i}`, v)),
          },
          {
            id: 'linked-queue',
            items: linkedQueue.map((n) => item(n.id, n.value)),
          },
        ],
        nodes: linkedQueue.map((n, i) => ({
          id: n.id,
          value: n.value,
          x: 0.1 + i * 0.16,
          y: 0.75,
        })),
        edges: linkedQueue
          .slice(0, -1)
          .map((n, i) => ({
            from: n.id,
            to: linkedQueue[i + 1].id,
            directed: true,
          })),
      },
    ),
  )
  push(
    out,
    make(
      'done',
      'LIFO stack and FIFO queue operations update their actual top/head/tail state',
      {
        arrayStackSize: arrayStack.length,
        linkedStackSize: linkedStack.length,
        arrayQueueSize: arrayQueue.length,
        linkedQueueSize: linkedQueue.length,
      },
      { output: arrayQueue.map((v, i) => item(`out${i}`, v)) },
    ),
  )
  return out
}

export const structuresMissions: CourseMission[] = [
  mission('structure-sequence', 'linear', (variant) => {
    const a = variant ? [4, 8, 12, 16, 20] : [3, 7, 11, 15]
    const pos = variant ? 2 : 1
    const value = variant ? 10 : 5
    const out: TraceFrame[] = []
    let writes = 0
    push(
      out,
      make(
        'start',
        'n = length(A); insertion at p',
        { n: a.length, writes },
        { items: a.map((v, i) => item(`a${i}`, v)), output: [] },
      ),
    )
    for (let i = a.length - 1; i >= pos; i--) {
      a[i + 1] = a[i]
      writes++
      push(
        out,
        make(
          'update',
          'A[i+1] = A[i]',
          { n: a.length - 1, writes, index: i },
          {
            items: a.map((v, j) =>
              item(`a${j}`, v, j === i + 1 ? 'active' : undefined),
            ),
            output: [],
          },
        ),
      )
    }
    a[pos] = value
    writes++
    push(
      out,
      make(
        'insert',
        'A[p] = x; shift cost = n - p',
        { n: a.length - 1, writes, position: pos },
        {
          items: a.map((v, i) =>
            item(`a${i}`, v, i === pos ? 'settled' : undefined),
          ),
          output: a.map((v, i) => item(`r${i}`, v)),
        },
      ),
    )
    for (let i = pos; i < a.length - 1; i++) {
      a[i] = a[i + 1]
      writes++
      push(
        out,
        make(
          'remove',
          'A[i] = A[i+1]',
          { n: a.length - 1, writes, index: i },
          {
            items: a
              .slice(0, -1)
              .map((v, j) => item(`d${j}`, v, j === i ? 'active' : undefined)),
            output: [],
          },
        ),
      )
    }
    a.pop()
    push(
      out,
      make(
        'done',
        'insert shifts n - p; delete shifts n - p - 1',
        { n: a.length, writes },
        {
          items: a.map((v, i) => item(`f${i}`, v, 'settled')),
          output: a.map((v, i) => item(`o${i}`, v)),
        },
      ),
    )
    return out
  }),
  mission('structure-lists', 'linear', traceLists),
  mission('structure-stack-recursion', 'foundations', (variant) => {
    const tokens = variant ? ['[', '{', '}', ' ]'] : ['(', '[', ')', ']']
    const pairs: Record<string, string> = { ')': '(', ']': '[', '}': '{' }
    const out: TraceFrame[] = [],
      stack: string[] = []
    let reads = 0,
      errors = 0
    push(
      out,
      make(
        'start',
        'Stack follows LIFO; recursive calls use the same call-stack rule',
        { reads, depth: 0, errors },
        {
          items: tokens.map((v, i) => item(`t${i}`, v.trim())),
          groups: [{ id: 'stack', items: [] }],
        },
      ),
    )
    tokens.forEach((raw, i) => {
      const token = raw.trim()
      reads++
      if ('([{'.includes(token)) stack.push(token)
      else {
        const top = stack.pop()
        if (top !== pairs[token]) errors++
      }
      push(
        out,
        make(
          errors ? 'reject' : 'visit',
          'Opening delimiter pushes; closing delimiter must match popped top',
          { reads, depth: stack.length, errors },
          {
            items: tokens.map((v, j) =>
              item(
                `t${j}`,
                v.trim(),
                j === i ? (errors ? 'red' : 'active') : undefined,
              ),
            ),
            groups: [
              { id: 'stack', items: stack.map((x, j) => item(`s${j}`, x)) },
            ],
          },
        ),
      )
    })
    const balanced = Number(errors === 0 && stack.length === 0)
    push(
      out,
      make(
        'done',
        'Balanced iff every close matches the top and the stack ends empty',
        { reads, depth: stack.length, errors, balanced },
        {
          groups: [
            { id: 'stack', items: stack.map((x, j) => item(`s${j}`, x)) },
          ],
        },
      ),
    )
    return out
  }),
  mission('structure-queues', 'linear', traceCircularQueue),
  mission('structure-strings-kmp', 'strings', traceKmp),
  mission('structure-arrays-matrices', 'strings', (variant) => {
    const rows = variant ? 3 : 2,
      cols = variant ? 4 : 3,
      m = Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) => r * cols + c + 1),
      )
    const out: TraceFrame[] = []
    push(
      out,
      make(
        'start',
        'row-major address = base + ((i * columns) + j) * elementSize',
        { rows, columns: cols },
        {
          matrix: {
            rows: Array.from({ length: rows }, (_, i) => `r${i}`),
            columns: Array.from({ length: cols }, (_, i) => `c${i}`),
            values: m,
          },
        },
      ),
    )
    const i = rows - 1,
      j = cols - 1,
      offset = i * cols + j
    push(
      out,
      make(
        'select',
        'offset = i * columns + j',
        { row: i, column: j, offset, elementSize: 4, byteOffset: offset * 4 },
        {
          matrix: {
            rows: Array.from({ length: rows }, (_, i) => `r${i}`),
            columns: Array.from({ length: cols }, (_, i) => `c${i}`),
            values: m,
            active: [i, j],
          },
        },
      ),
    )
    const sym = [
      [1, 2, 3],
      [2, 4, 5],
      [3, 5, 6],
    ]
    const packed: number[] = []
    for (let r = 0; r < 3; r++)
      for (let c = r; c < 3; c++) packed.push(sym[r][c])
    const sparse = [
      [0, 0, 5],
      [0, 0, 0],
      [2, 0, 0],
    ]
    const triples = sparse.flatMap((row, r) =>
      row.flatMap((v, c) => (v ? [r, c, v] : [])),
    )
    push(
      out,
      make(
        'update',
        'symmetric upper triangle stores n(n+1)/2 values; sparse triples store (row,column,value)',
        { dense: 9, symmetric: packed.length, nonzeros: triples.length / 3 },
        {
          matrix: {
            rows: ['r0', 'r1', 'r2'],
            columns: ['c0', 'c1', 'c2'],
            values: sym,
          },
        },
      ),
    )
    push(
      out,
      make(
        'done',
        'compression saves space when stored entries are fewer than dense cells',
        { dense: 9, compressed: packed.length, nonzeros: triples.length / 3 },
        {
          output: [
            ...packed.map((v, k) => item(`u${k}`, v)),
            ...triples.map((v, k) => item(`t${k}`, v)),
          ],
        },
      ),
    )
    return out
  }),
  mission('structure-generalized-list', 'foundations', traceGeneralizedList),
  mission('structure-hashing-search', 'search', traceHashing),
  mission('structure-memory-allocation', 'memory', (variant) => {
    const requests = variant ? [18, 31, 9, 25] : [12, 20, 7, 16],
      initial = [32, 48, 24, 40]
    const out: TraceFrame[] = []
    const free = initial.map((size, i) => ({
      id: `b${i}`,
      size,
      start: initial.slice(0, i).reduce((a, b) => a + b, 0),
    }))
    let allocatedBytes = 0,
      successful = 0
    const show = () => free.map((b) => item(b.id, `${b.start}:${b.size}`))
    push(
      out,
      make(
        'start',
        'First-fit chooses first adequate block; best-fit chooses smallest adequate block',
        {
          freeBlocks: free.length,
          freeBytes: initial.reduce((a, b) => a + b, 0),
          allocatedBytes,
        },
        { groups: [{ id: 'free', items: show() }] },
      ),
    )
    for (const need of requests) {
      const candidates = free
        .filter((b) => b.size >= need)
        .sort((a, b) => a.start - b.start)
      const chosen = variant
        ? [...candidates].sort((a, b) => a.size - b.size)[0]
        : candidates[0]
      if (!chosen) {
        push(
          out,
          make(
            'reject',
            'Allocation fails when no remaining free block is large enough',
            { request: need, freeBlocks: free.length, allocatedBytes },
            { groups: [{ id: 'free', items: show() }] },
          ),
        )
        continue
      }
      const oldSize = chosen.size,
        oldStart = chosen.start
      chosen.size -= need
      chosen.start += need
      allocatedBytes += need
      successful++
      if (!chosen.size) free.splice(free.indexOf(chosen), 1)
      push(
        out,
        make(
          'select',
          variant
            ? 'Best-fit allocates from the smallest adequate free block'
            : 'First-fit allocates from the first adequate free block',
          {
            request: need,
            allocated: need,
            allocationStart: oldStart,
            remainder: oldSize - need,
            freeBlocks: free.length,
            allocatedBytes,
          },
          { groups: [{ id: 'free', items: show() }] },
        ),
      )
    }
    push(
      out,
      make(
        'done',
        'Free ranges show remaining external fragmentation; this trace performs allocation only',
        {
          requests: requests.length,
          successful,
          allocatedBytes,
          freeBlocks: free.length,
          freeBytes: free.reduce((n, b) => n + b.size, 0),
          largestFree: Math.max(0, ...free.map((b) => b.size)),
        },
        { output: show() },
      ),
    )
    return out
  }),
  mission('structure-memory-safety', 'memory', traceMemorySafety),
  mission('structure-stack-queue-variants', 'linear', traceStackQueueVariants),
  mission('structure-searches', 'search', (variant) => {
    const a = variant
      ? [2, 5, 9, 14, 21, 28, 35, 42]
      : [1, 4, 7, 11, 16, 20, 25, 31]
    const target = variant ? 28 : 20
    const out: TraceFrame[] = []
    push(
      out,
      make(
        'start',
        'Search target in a sorted sequence with four methods',
        { length: a.length, target },
        { items: a.map((v, i) => item(`a${i}`, v)) },
      ),
    )
    let seq = 0
    for (; seq < a.length && a[seq] !== target; seq++)
      push(
        out,
        make(
          'compare',
          'Sequential search: compare A[i] with target',
          { algorithm: 1, index: seq, comparisons: seq + 1 },
          {
            items: a.map((v, i) =>
              item(`s${i}`, v, i === seq ? 'active' : undefined),
            ),
          },
        ),
      )
    push(
      out,
      make(
        'visit',
        'Sequential search: stop at first equal key',
        { algorithm: 1, index: seq, comparisons: seq + 1 },
        { output: [item('seq-result', target)] },
      ),
    )
    const block = Math.ceil(Math.sqrt(a.length))
    let boundary = 0,
      bc = 0
    while (
      boundary < a.length &&
      a[Math.min(boundary + block - 1, a.length - 1)] < target
    ) {
      bc++
      boundary += block
    }
    let bi = boundary
    while (bi < a.length && a[bi] !== target) {
      bc++
      bi++
    }
    push(
      out,
      make(
        'select',
        'Block search: locate block boundary, then scan inside the block',
        { algorithm: 2, blockSize: block, comparisons: bc, index: bi },
        {
          items: a.map((v, i) =>
            item(
              `b${i}`,
              v,
              i >= boundary && i < boundary + block ? 'active' : undefined,
            ),
          ),
        },
      ),
    )
    let lo = 0,
      hi = a.length - 1,
      cc = 0
    while (lo <= hi) {
      cc++
      const mid = (lo + hi) >> 1
      if (a[mid] === target) {
        lo = mid
        break
      }
      if (a[mid] < target) lo = mid + 1
      else hi = mid - 1
    }
    push(
      out,
      make(
        'select',
        'Binary search: halve the sorted candidate interval',
        { algorithm: 3, comparisons: cc, index: lo },
        {
          items: a.map((v, i) =>
            item(`c${i}`, v, i === lo ? 'settled' : undefined),
          ),
        },
      ),
    )
    let fib2 = 0,
      fib1 = 1,
      fib = fib2 + fib1
    while (fib < a.length) {
      fib2 = fib1
      fib1 = fib
      fib = fib2 + fib1
    }
    let off = -1,
      fc = 0
    while (fib > 1) {
      const ix = Math.min(off + fib2, a.length - 1)
      fc++
      if (a[ix] < target) {
        fib = fib1
        fib1 = fib2
        fib2 = fib - fib1
        off = ix
      } else if (a[ix] > target) {
        fib = fib2
        fib1 -= fib2
        fib2 = fib - fib1
      } else {
        off = ix
        break
      }
    }
    if (fib1 && off + 1 < a.length && a[off + 1] !== target) fc++
    push(
      out,
      make(
        'done',
        'Fibonacci search: shrink the candidate interval by Fibonacci offsets',
        {
          algorithm: 4,
          sequentialComparisons: seq + 1,
          blockComparisons: bc,
          binaryComparisons: cc,
          fibonacciComparisons: fc,
          index: target === a[off + 1] ? off + 1 : target === a[off] ? off : -1,
        },
        { output: [item('target', target)] },
      ),
    )
    return out
  }),
  mission('structure-memory-strategies', 'memory', traceMemoryStrategies),
  mission('structure-complexity-counting', 'foundations', (variant) => {
    const a = variant ? [5, 1, 4, 2, 3] : [4, 1, 3, 2]
    const n = a.length
    const out: TraceFrame[] = []
    let compares = 0,
      writes = 0
    push(
      out,
      make(
        'start',
        'ADT specifies operations; implementation supplies representation and cost',
        { n, compares, writes, extraSpace: 0 },
        { items: a.map((v, i) => item(`v${i}`, v)) },
      ),
    )
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n - i - 1; j++) {
        compares++
        push(
          out,
          make(
            'compare',
            'Bubble sort: compare adjacent pair; count one key comparison',
            { n, compares, writes, i, j },
            {
              items: a.map((v, k) =>
                item(`v${k}`, v, k === j || k === j + 1 ? 'active' : undefined),
              ),
            },
          ),
        )
        if (a[j] > a[j + 1]) {
          ;[a[j], a[j + 1]] = [a[j + 1], a[j]]
          writes += 2
          push(
            out,
            make(
              'swap',
              'Bubble sort: swap only when left key is greater',
              { n, compares, writes, i, j },
              {
                items: a.map((v, k) =>
                  item(
                    `v${k}`,
                    v,
                    k === j || k === j + 1 ? 'active' : undefined,
                  ),
                ),
              },
            ),
          )
        }
      }
    }
    push(
      out,
      make(
        'done',
        'Correctness: adjacent order is restored; time Θ(n²), auxiliary space Θ(1); O upper bound, Ω lower bound',
        { n, compares, writes, extraSpace: 1 },
        { output: a.map((v, i) => item(`sorted${i}`, v)) },
      ),
    )
    return out
  }),
  mission('structure-string-operations', 'strings', traceStringOperations),
  mission('foundation-modeling', 'foundations', traceFoundationModeling),
  mission('foundation-mathematics', 'foundations', traceFoundationMathematics),
  mission('foundation-asymptotics', 'foundations', traceFoundationAsymptotics),
  mission('foundation-correctness', 'foundations', traceFoundationCorrectness),
]
