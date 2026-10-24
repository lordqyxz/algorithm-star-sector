import type { CourseMission, TraceFrame, TraceItem } from '../types'
import { record } from './trace'

type Entry = { id: string; value: number }
type RunResult = { frames: TraceFrame[] }

const variants = [
  [28, 13, 26, 13, 11, 27, 22],
  [49, 44, 37, 33, 26, 15, 11],
] as const
const countVariants = [
  [4, 1, 3, 4, 1, 0, 3, 2],
  [7, 0, 5, 7, 2, 0, 4, 2],
] as const
const src = {
  elementary: ['combined', 'structures'] as CourseMission['sources'],
  heap: ['combined', 'structures', 'design'] as CourseMission['sources'],
  divide: ['combined', 'structures', 'design'] as CourseMission['sources'],
  buckets: ['combined', 'structures', 'advanced'] as CourseMission['sources'],
  external: ['combined', 'structures', 'advanced'] as CourseMission['sources'],
  optimal: ['combined', 'design', 'advanced'] as CourseMission['sources'],
}

function run(id: string, variant: 0 | 1): RunResult {
  const input =
    id === 'sort-counting' ? countVariants[variant] : variants[variant]
  const a: Entry[] = input.map((value, i) => ({ id: `item-${i}`, value }))
  const frames: TraceFrame[] = []
  let comparisons = 0,
    moves = 0
  const it = (
    xs: readonly Entry[],
    active: readonly string[] = [],
    settled: readonly string[] = [],
  ): TraceItem[] =>
    xs.map((x, i) => ({
      id: x.id,
      value: x.value,
      label: String(i),
      tone: active.includes(x.id)
        ? 'active'
        : settled.includes(x.id)
          ? 'settled'
          : undefined,
    }))
  const snap = (
    op: TraceFrame['op'],
    formula: string,
    xs: readonly Entry[] = a,
    active: readonly string[] = [],
    extra: Partial<TraceFrame> = {},
  ) =>
    record(frames, {
      op,
      formula,
      items: it(xs, active),
      counters: { comparisons, moves },
      ...extra,
    })
  const heldSnap = (
    op: TraceFrame['op'],
    formula: string,
    key: Entry,
    hole: number,
    active: readonly string[] = [],
  ) => {
    const row = a.map((x, i) =>
      i === hole
        ? {
            id: `hole-${i}`,
            value: '□',
            label: String(i),
            tone: 'muted' as const,
          }
        : {
            id: x.id,
            value: x.value,
            label: String(i),
            tone: active.includes(x.id) ? ('active' as const) : undefined,
          },
    )
    record(frames, {
      op,
      formula,
      items: row,
      groups: [
        {
          id: 'held-key',
          items: [
            { id: key.id, value: key.value, label: 'held', tone: 'active' },
          ],
        },
      ],
      counters: { comparisons, moves },
    })
  }
  const compare = (
    x: Entry,
    y: Entry,
    why = 'compare left.value with right.value',
  ): number => {
    comparisons++
    snap('compare', why, a, [x.id, y.id])
    return x.value - y.value
  }
  const start = (formula = 'input = original sequence') =>
    snap('start', formula)
  const done = (
    xs: readonly Entry[] = a,
    formula = 'output[i] <= output[i+1] for every adjacent pair',
    extraCounters: Record<string, number | string> = {},
  ) => {
    record(frames, {
      op: 'done',
      formula,
      items: it(
        xs,
        [],
        xs.map((x) => x.id),
      ),
      output: xs.map((x, i) => ({
        id: x.id,
        value: x.value,
        label: String(i),
        tone: 'settled',
      })),
      counters: { comparisons, moves, ...extraCounters },
    })
  }
  const exchange = (i: number, j: number) => {
    if (i === j) return
    const x = a[i]!
    a[i] = a[j]!
    a[j] = x
    moves += 3
    snap('swap', `swap(${i},${j}); three assignments`, a, [a[i]!.id, a[j]!.id])
  }
  start()

  if (id === 'sort-insertion-direct' || id === 'sort-insertion-binary') {
    for (let i = 1; i < a.length; i++) {
      const key = a[i]!
      let lo = 0,
        hi = i
      let hole = i
      if (id.endsWith('binary')) {
        while (lo < hi) {
          const mid = (lo + hi) >>> 1
          comparisons++
          heldSnap(
            'compare',
            'find first prefix position with a[mid].value > heldKey.value',
            key,
            hole,
            [a[mid]!.id],
          )
          if (a[mid]!.value <= key.value) lo = mid + 1
          else hi = mid
        }
      } else {
        lo = i
        while (lo > 0) {
          comparisons++
          heldSnap(
            'compare',
            'compare predecessor.value with heldKey.value',
            key,
            hole,
            [a[lo - 1]!.id],
          )
          if (a[lo - 1]!.value <= key.value) break
          lo--
        }
      }
      for (let j = i; j > lo; j--) {
        a[j] = a[j - 1]!
        hole = j - 1
        moves++
        heldSnap(
          'update',
          `move ${a[j]!.id} one slot right; source becomes hole`,
          key,
          hole,
          [a[j]!.id],
        )
      }
      a[lo] = key
      moves++
      snap('insert', `place held key ${key.id} at index ${lo}`)
    }
    done()
  } else if (id === 'sort-bubble') {
    for (let end = a.length - 1; end > 0; end--) {
      let changed = false
      for (let i = 0; i < end; i++)
        if (
          compare(
            a[i]!,
            a[i + 1]!,
            'compare adjacent values; larger value moves right',
          ) > 0
        ) {
          exchange(i, i + 1)
          changed = true
        }
      if (!changed) break
    }
    done()
  } else if (id === 'sort-selection' || id === 'sort-tournament') {
    if (id === 'sort-selection') {
      for (let i = 0; i < a.length; i++) {
        let min = i
        for (let j = i + 1; j < a.length; j++)
          if (
            compare(
              a[min]!,
              a[j]!,
              'keep the index of the smallest remaining value',
            ) > 0
          )
            min = j
        exchange(i, min)
        snap('select', `minimum of suffix [${i},${a.length}) is fixed at ${i}`)
      }
    } else {
      const output: Entry[] = []
      const size = 1 << Math.ceil(Math.log2(a.length)),
        tree: (Entry | null)[] = Array(size * 2).fill(null)
      for (let i = 0; i < a.length; i++) tree[size + i] = a[i]!
      const winnerAt = (node: number) => {
        const l = tree[node * 2],
          r = tree[node * 2 + 1]
        if (!l) return r
        if (!r) return l
        return compare(
          l,
          r,
          'tournament match: smaller value advances; left wins ties',
        ) <= 0
          ? l
          : r
      }
      const drawTree = (formula: string, activeNode = 1) => {
        const depth = Math.log2(size)
        const nodes = tree.slice(1).map((x, i) => {
          const node = i + 1,
            level = Math.floor(Math.log2(node)),
            pos = node - (1 << level)
          return {
            id: `tournament-${node}`,
            value: x?.value ?? '∞',
            x: (pos + 0.5) / (1 << level),
            y: depth ? level / depth : 0,
            tone: node === activeNode ? ('active' as const) : undefined,
          }
        })
        const edges = Array.from({ length: size - 1 }, (_, i) => i + 1).flatMap(
          (node) => [
            { from: `tournament-${node}`, to: `tournament-${node * 2}` },
            { from: `tournament-${node}`, to: `tournament-${node * 2 + 1}` },
          ],
        )
        snap(
          'update',
          formula,
          a,
          tree[activeNode] ? [tree[activeNode]!.id] : [],
          { nodes, edges },
        )
      }
      for (let node = size - 1; node >= 1; node--) tree[node] = winnerAt(node)
      drawTree(
        'build winner tree: each parent stores the smaller child; padded leaves are ∞',
      )
      while (tree[1]) {
        const winner = tree[1]!,
          leaf = size + a.findIndex((x) => x.id === winner.id)
        output.push(winner)
        moves++
        tree[leaf] = null
        let node = leaf
        drawTree(
          `emit ${winner.id}; deactivate its leaf and replay only its ancestor path`,
          node,
        )
        while (node > 1) {
          node >>= 1
          tree[node] = winnerAt(node)
          drawTree(
            `recompute tournament ancestor ${node} from its two children`,
            node,
          )
        }
      }
      a.splice(0, a.length, ...output)
    }
    done()
  } else if (id === 'sort-shell') {
    for (
      let gap = Math.floor(a.length / 2);
      gap > 0;
      gap = Math.floor(gap / 2)
    ) {
      for (let i = gap; i < a.length; i++) {
        const key = a[i]!
        let j = i,
          hole = i
        while (j >= gap) {
          comparisons++
          heldSnap(
            'compare',
            `compare gap-${gap} predecessor with heldKey.value`,
            key,
            hole,
            [a[j - gap]!.id],
          )
          if (a[j - gap]!.value <= key.value) break
          a[j] = a[j - gap]!
          moves++
          hole = j - gap
          j -= gap
          heldSnap(
            'update',
            `move ${a[j]!.id} forward by gap ${gap}; source becomes hole`,
            key,
            hole,
            [a[j]!.id],
          )
        }
        a[j] = key
        moves++
        snap('insert', `place held key ${key.id} at gap-sorted index ${j}`)
      }
    }
    done()
  } else if (id === 'sort-heap') {
    const heapFrame = (op: TraceFrame['op'], formula: string, n: number) => {
      const depth = Math.floor(Math.log2(a.length))
      return snap(op, formula, a, [], {
        nodes: a.map((x, i) => {
          const level = Math.floor(Math.log2(i + 1)),
            pos = i + 1 - (1 << level)
          return {
            id: x.id,
            value: x.value,
            x: (pos + 0.5) / (1 << level),
            y: depth ? level / depth : 0,
            tone: i < n ? undefined : 'settled',
          }
        }),
        edges: a.flatMap((x, i) =>
          i < n
            ? [2 * i + 1, 2 * i + 2]
                .filter((j) => j < n)
                .map((j) => ({ from: x.id, to: a[j]!.id }))
            : [],
        ),
      })
    }
    const sift = (n: number, root: number) => {
      for (;;) {
        let m = root,
          l = root * 2 + 1,
          r = l + 1
        if (
          l < n &&
          compare(a[l]!, a[m]!, 'choose larger child for max-heap') > 0
        )
          m = l
        if (
          r < n &&
          compare(a[r]!, a[m]!, 'compare right child with current largest') > 0
        )
          m = r
        if (m === root) return
        exchange(root, m)
        root = m
        heapFrame('update', 'parent.value >= each child.value', n)
      }
    }
    for (let i = (a.length >>> 1) - 1; i >= 0; i--) sift(a.length, i)
    heapFrame('select', 'build max-heap: parent.value >= child.value', a.length)
    for (let n = a.length; n > 1; n--) {
      exchange(0, n - 1)
      heapFrame(
        'remove',
        'move heap maximum to the next fixed suffix position',
        n - 1,
      )
      sift(n - 1, 0)
    }
    done()
  } else if (id === 'sort-quick') {
    const q = (lo: number, hi: number) => {
      if (lo >= hi) return
      const pivot = a[hi]!
      let p = lo
      for (let i = lo; i < hi; i++)
        if (
          compare(a[i]!, pivot, 'Lomuto partition: value <= last-item pivot') <=
          0
        ) {
          if (p !== i) exchange(p, i)
          p++
        }
      exchange(p, hi)
      snap('select', `pivot ${pivot.id} settles at index ${p}`)
      q(lo, p - 1)
      q(p + 1, hi)
    }
    q(0, a.length - 1)
    done()
  } else if (id === 'sort-merge') {
    const ms = (lo: number, hi: number): Entry[] => {
      if (hi - lo < 2) return a.slice(lo, hi)
      const mid = (lo + hi) >>> 1
      const left = ms(lo, mid),
        right = ms(mid, hi)
      snap('split', `split [${lo},${hi}) at ${mid}`, a, [], {
        groups: [
          { id: `left-${lo}-${mid}`, items: it(left) },
          { id: `right-${mid}-${hi}`, items: it(right) },
        ],
      })
      const out: Entry[] = []
      let i = 0,
        j = 0
      while (i < left.length && j < right.length)
        out.push(
          compare(left[i]!, right[j]!, 'take smaller front; left wins ties') <=
            0
            ? left[i++]!
            : right[j++]!,
        )
      out.push(...left.slice(i), ...right.slice(j))
      for (let k = 0; k < out.length; k++) {
        a[lo + k] = out[k]!
        moves++
      }
      snap(
        'merge',
        `merge [${lo},${mid}) and [${mid},${hi}) into [${lo},${hi})`,
        a,
        out.map((x) => x.id),
        { groups: [{ id: `merged-${lo}-${hi}`, items: it(out) }] },
      )
      return out
    }
    a.splice(0, a.length, ...ms(0, a.length))
    done()
  } else if (id === 'sort-bucket') {
    const min = Math.min(...a.map((x) => x.value)),
      max = Math.max(...a.map((x) => x.value)),
      width = Math.max(1, Math.ceil((max - min + 1) / 4))
    const buckets: Entry[][] = Array.from({ length: 4 }, () => [])
    for (const x of a) {
      const b = Math.min(3, Math.floor((x.value - min) / width))
      buckets[b]!.push(x)
      moves++
      snap(
        'insert',
        `${x.value} maps to bounded bucket ${b} = floor((value-${min})/${width})`,
        a,
        [x.id],
        {
          groups: buckets.map((xs, i) => ({
            id: `bucket-${i}`,
            items: it(xs),
          })),
        },
      )
    }
    for (const b of buckets)
      for (let i = 1; i < b.length; i++) {
        const key = b[i]!
        let j = i
        while (j > 0) {
          comparisons++
          snap('compare', 'compare adjacent values within this bucket', b, [
            b[j - 1]!.id,
            key.id,
          ])
          if (b[j - 1]!.value <= key.value) break
          b[j] = b[j - 1]!
          moves++
          snap('update', `shift ${b[j]!.id} right within its bucket`, b, [
            b[j]!.id,
          ])
          j--
        }
        b[j] = key
        moves++
        snap('insert', `insert ${key.id} in bucket order`, b, [key.id])
      }
    const out = buckets.flat()
    a.splice(0, a.length, ...out)
    moves += out.length
    snap('merge', 'concatenate ordered buckets in ascending bucket index')
    done()
  } else if (id === 'sort-radix') {
    for (
      let place = 1;
      place <= Math.max(...a.map((x) => x.value));
      place *= 10
    ) {
      const groups: Entry[][] = Array.from({ length: 10 }, () => [])
      for (const x of a) {
        const d = Math.floor(x.value / place) % 10
        groups[d]!.push(x)
        moves++
        snap(
          'insert',
          `stable distribute ${x.id} to digit group ${d} at place ${place}`,
          a,
          [x.id],
          {
            groups: groups.map((xs, i) => ({
              id: `digit-${place}-${i}`,
              items: it(xs),
            })),
          },
        )
      }
      a.splice(0, a.length, ...groups.flat())
      snap(
        'merge',
        `collect digit groups 0 through 9 at place ${place}; stable order preserved`,
      )
    }
    done()
  } else if (id === 'sort-counting') {
    const min = Math.min(...a.map((x) => x.value)),
      max = Math.max(...a.map((x) => x.value)),
      frequency = Array(max - min + 1).fill(0) as number[],
      prefix = Array(max - min + 1).fill(0) as number[],
      output: (Entry | null)[] = Array(a.length).fill(null)
    const matrix = (active?: [number, number]) => ({
      rows: ['frequency', 'prefix positions'],
      columns: frequency.map((_, i) => String(i + min)),
      values: [frequency, prefix],
      ...(active ? { active } : {}),
    })
    for (const x of a) {
      frequency[x.value - min]++
      moves++
      snap('update', `frequency[value=${x.value}] += 1`, a, [x.id], {
        matrix: matrix([0, x.value - min]),
        counters: { comparisons: 0, moves, range: max - min + 1 },
      })
    }
    let total = 0
    for (let i = 0; i < frequency.length; i++) {
      total += frequency[i]!
      prefix[i] = total
      snap(
        'update',
        `prefix[value=${i + min}] = sum of frequencies through value ${i + min}`,
        a,
        [],
        {
          matrix: matrix([1, i]),
          counters: { comparisons: 0, moves, range: max - min + 1 },
        },
      )
    }
    for (let i = a.length - 1; i >= 0; i--) {
      const x = a[i]!,
        slot = x.value - min,
        pos = prefix[slot]! - 1
      prefix[slot] = pos
      output[pos] = x
      moves++
      snap(
        'insert',
        `scan right-to-left: place ${x.id} at prefix[value=${x.value}]-1 = ${pos}`,
        a,
        [x.id],
        {
          matrix: matrix([1, slot]),
          groups: [
            {
              id: 'stable-output',
              items: output.map((item, j) =>
                item
                  ? {
                      id: item.id,
                      value: item.value,
                      label: String(j),
                      tone: 'settled',
                    }
                  : {
                      id: `output-hole-${j}`,
                      value: '□',
                      label: String(j),
                      tone: 'muted',
                    },
              ),
            },
          ],
          counters: {
            comparisons: 0,
            moves,
            range: max - min + 1,
            prefixTotal: total,
          },
        },
      )
    }
    const sorted = output as Entry[]
    a.splice(0, a.length, ...sorted)
    done(
      sorted,
      'bounded integer keys: prefix[value] is the last free stable position; all values placed once',
      { comparisons: 0, range: max - min + 1 },
    )
  } else if (id === 'external-kway-merge') {
    const runIndexes =
      variant === 0
        ? [
            [1, 2, 0],
            [4, 3],
            [6, 5],
          ]
        : [
            [6, 5, 4],
            [3, 2],
            [1, 0],
          ]
    const runs: Entry[][] = runIndexes.map((indexes) =>
      indexes.map((i) => a[i]!),
    )
    const blockSize = 2,
      outputBlockSize = 3,
      loaded = runs.map(() => 0),
      buffers = runs.map(() => [] as Entry[]),
      outBlock: Entry[] = [],
      out: Entry[] = []
    let blockReads = 0,
      blockWrites = 0
    const externalFrame = (
      op: TraceFrame['op'],
      formula: string,
      active: string[] = [],
    ) =>
      record(frames, {
        op,
        formula,
        items: it(out, active),
        groups: [
          ...runs.flatMap((r, i) => [
            { id: `input-buffer-${i}`, items: it(buffers[i]!) },
            { id: `run-tail-${i}`, items: it(r.slice(loaded[i]!)) },
          ]),
          { id: 'output-buffer', items: it(outBlock) },
        ],
        counters: {
          comparisons,
          moves,
          blockReads,
          blockWrites,
          inputBlockSize: blockSize,
          outputBlockSize,
        },
      })
    record(frames, {
      op: 'split',
      formula:
        'merge phase input: three sorted runs stored on disk; no full run is resident',
      groups: runs.map((r, i) => ({ id: `sorted-run-${i}`, items: it(r) })),
      counters: { comparisons, moves, blockReads, blockWrites },
    })
    const refill = (i: number) => {
      if (buffers[i]!.length || loaded[i]! >= runs[i]!.length) return
      const end = Math.min(loaded[i]! + blockSize, runs[i]!.length)
      buffers[i]!.push(...runs[i]!.slice(loaded[i]!, end))
      const count = end - loaded[i]!
      loaded[i] = end
      blockReads++
      moves += count
      externalFrame(
        'update',
        `read block ${blockReads} of ${count} records from run ${i} into its finite input buffer`,
      )
    }
    while (out.length < a.length) {
      for (let i = 0; i < runs.length; i++) refill(i)
      const heads = buffers
        .map((b, run) => ({ x: b[0], run }))
        .filter((h) => h.x)
      let best = heads[0]!
      for (const h of heads.slice(1)) {
        comparisons++
        externalFrame(
          'compare',
          `compare buffered fronts ${best.x!.value} and ${h.x!.value}`,
          [best.x!.id, h.x!.id],
        )
        if (best.x!.value > h.x!.value) best = h
      }
      const emitted = buffers[best.run]!.shift()!
      outBlock.push(emitted)
      out.push(emitted)
      moves++
      externalFrame(
        'insert',
        `move ${emitted.value} from run ${best.run}'s input buffer to the output buffer`,
        [emitted.id],
      )
      if (outBlock.length === outputBlockSize) {
        outBlock.length = 0
        blockWrites++
        externalFrame(
          'merge',
          `flush output block ${blockWrites} (${outputBlockSize} records) to disk`,
        )
      }
    }
    if (outBlock.length) {
      const partial = outBlock.length
      outBlock.length = 0
      blockWrites++
      externalFrame(
        'merge',
        `flush final partial output block ${blockWrites} (${partial} records) to disk`,
      )
    }
    a.splice(0, a.length, ...out)
    done(
      out,
      'output blocks concatenate to a nondecreasing permutation of the input',
      { blockReads, blockWrites, inputBlockSize: blockSize, outputBlockSize },
    )
  } else if (id === 'external-replacement-selection') {
    const capacity = 3,
      inputBlockSize = 2,
      outputBlockSize = 2,
      heap: Entry[] = [],
      frozen: Entry[] = [],
      runs: Entry[][] = []
    let fetched = 0,
      blockReads = 0,
      blockWrites = 0
    const inputBuffer: Entry[] = []
    const nextInput = (): Entry | undefined => {
      if (!inputBuffer.length && fetched < a.length) {
        const end = Math.min(fetched + inputBlockSize, a.length)
        inputBuffer.push(...a.slice(fetched, end))
        const count = end - fetched
        fetched = end
        blockReads++
        snap(
          'update',
          `read input block ${blockReads} (${count} records) into replacement-selection buffer`,
          [],
          [],
          {
            groups: [
              { id: 'input-buffer', items: it(inputBuffer) },
              { id: 'active-heap', items: it(heap) },
              { id: 'frozen', items: it(frozen) },
              { id: 'current-run', items: it(runs.at(-1) ?? []) },
            ],
            counters: {
              comparisons,
              moves,
              blockReads,
              blockWrites,
              inputBlockSize,
              outputBlockSize,
            },
          },
        )
      }
      return inputBuffer.shift()
    }
    const push = (x: Entry) => {
      heap.push(x)
      let i = heap.length - 1
      while (i > 0) {
        const p = (i - 1) >>> 1
        if (
          compare(
            heap[i]!,
            heap[p]!,
            'min-heap order while adding to replacement-selection heap',
          ) >= 0
        )
          break
        ;[heap[i], heap[p]] = [heap[p]!, heap[i]!]
        i = p
      }
    }
    const pop = () => {
      const x = heap[0]!
      const tail = heap.pop()!
      if (heap.length) {
        heap[0] = tail
        let i = 0
        for (;;) {
          let m = i,
            l = i * 2 + 1,
            r = l + 1
          if (
            l < heap.length &&
            compare(
              heap[l]!,
              heap[m]!,
              'restore min-heap after emitting root',
            ) < 0
          )
            m = l
          if (
            r < heap.length &&
            compare(heap[r]!, heap[m]!, 'choose smallest heap child') < 0
          )
            m = r
          if (m === i) break
          ;[heap[i], heap[m]] = [heap[m]!, heap[i]!]
          i = m
        }
      }
      return x
    }
    while (heap.length < capacity) {
      const x = nextInput()
      if (!x) break
      push(x)
    }
    let current: Entry[] = [],
      last = -Infinity
    while (heap.length || frozen.length) {
      if (!heap.length) {
        runs.push(current)
        const closed = current
        blockWrites += Math.ceil(closed.length / outputBlockSize)
        current = []
        for (const x of frozen.splice(0)) push(x)
        last = -Infinity
        snap(
          'split',
          `close sorted run (${closed.length} records → ${Math.ceil(closed.length / outputBlockSize)} output blocks); thaw frozen heap`,
          [],
          [],
          {
            groups: [
              { id: 'closed-run', items: it(closed) },
              { id: 'active-heap', items: it(heap) },
              { id: 'frozen', items: it(frozen) },
            ],
            counters: {
              comparisons,
              moves,
              blockReads,
              blockWrites,
              inputBlockSize,
              outputBlockSize,
            },
          },
        )
      }
      const x = pop()
      current.push(x)
      last = x.value
      moves++
      const next = nextInput()
      if (next) {
        if (next.value >= last) push(next)
        else {
          frozen.push(next)
          snap(
            'update',
            `${next.value} < emitted ${last}: freeze ${next.id} for next run`,
            [],
            [next.id],
            {
              groups: [
                { id: 'input-buffer', items: it(inputBuffer) },
                { id: 'active-heap', items: it(heap) },
                { id: 'frozen', items: it(frozen) },
                { id: 'current-run', items: it(current) },
              ],
              counters: {
                comparisons,
                moves,
                blockReads,
                blockWrites,
                inputBlockSize,
                outputBlockSize,
              },
            },
          )
        }
      }
      snap(
        'remove',
        `emit min ${x.value} while run remains nondecreasing`,
        [],
        [x.id],
        {
          groups: [
            { id: 'input-buffer', items: it(inputBuffer) },
            { id: 'active-heap', items: it(heap) },
            { id: 'frozen', items: it(frozen) },
            { id: 'current-run', items: it(current) },
          ],
          counters: {
            comparisons,
            moves,
            blockReads,
            blockWrites,
            inputBlockSize,
            outputBlockSize,
          },
        },
      )
    }
    if (current.length) {
      runs.push(current)
      blockWrites += Math.ceil(current.length / outputBlockSize)
      snap(
        'split',
        `close final sorted run (${current.length} records → ${Math.ceil(current.length / outputBlockSize)} output blocks)`,
        [],
        [],
        {
          groups: [{ id: 'closed-run', items: it(current) }],
          counters: {
            comparisons,
            moves,
            blockReads,
            blockWrites,
            inputBlockSize,
            outputBlockSize,
          },
        },
      )
    }
    const out = runs.flat()
    a.splice(0, a.length, ...out)
    snap('merge', 'initial sorted runs reside on disk for a later k-way merge')
    done(
      out,
      'for each initial run r: r[i] <= r[i+1]; every input identity emitted once',
      { blockReads, blockWrites, inputBlockSize, outputBlockSize },
    )
  } else if (id === 'external-optimal-merge') {
    type Node = { weight: number; id: string; left?: Node; right?: Node }
    let forest: Node[] = variants[variant].map((x, i) => ({
      weight: x,
      id: `file-${i}`,
    }))
    let cost = 0
    while (forest.length > 1) {
      forest.sort((x, y) => x.weight - y.weight || x.id.localeCompare(y.id))
      const l = forest.shift()!,
        r = forest.shift()!
      const w = l.weight + r.weight
      cost += w
      const parent: Node = {
        weight: w,
        id: `merge-${forest.length}-${l.id}-${r.id}`,
        left: l,
        right: r,
      }
      forest.push(parent)
      moves++
      snap(
        'merge',
        `merge two smallest files: ${l.weight}+${r.weight}=${w}; cumulative I/O cost += ${w}`,
        a,
        [],
        {
          nodes: [
            { id: l.id, value: l.weight, x: 0.25, y: 1 },
            { id: r.id, value: r.weight, x: 0.75, y: 1 },
            { id: parent.id, value: w, x: 0.5, y: 0 },
          ],
          edges: [
            { from: l.id, to: parent.id },
            { from: r.id, to: parent.id },
          ],
          counters: { comparisons, moves, cumulativeCost: cost },
        },
      )
    }
    done(
      a,
      `minimum total merge cost = sum of each internal merge weight = ${cost}`,
      { cumulativeCost: cost },
    )
  }
  return { frames }
}

const specs: [string, string, CourseMission['sources']][] = [
  ...[
    'sort-insertion-direct',
    'sort-insertion-binary',
    'sort-shell',
    'sort-bubble',
    'sort-selection',
    'sort-tournament',
  ].map(
    (id) =>
      [id, 'sorting', src.elementary] as [
        string,
        string,
        CourseMission['sources'],
      ],
  ),
  ['sort-heap', 'sorting', src.heap],
  ['sort-quick', 'sorting', src.divide],
  ['sort-merge', 'sorting', src.divide],
  ['sort-bucket', 'sorting', src.buckets],
  ['sort-radix', 'sorting', src.buckets],
  ['sort-counting', 'sorting', ['combined', 'ai']],
  ['external-kway-merge', 'external', src.external],
  ['external-replacement-selection', 'external', src.external],
  ['external-optimal-merge', 'external', src.optimal],
]
export const sortingMissions: CourseMission[] = specs.map(
  ([id, chapter, sources]) => ({
    id,
    chapter,
    sources,
    trace: (variant) => run(id, variant).frames,
  }),
)
