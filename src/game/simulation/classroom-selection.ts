import type { CourseMission, TraceFrame, TraceItem } from '../types'
import { record } from './trace'

type Entry = { id: string; value: number }
const entries = (values: readonly number[], prefix = 'a'): Entry[] =>
  values.map((value, i) => ({ id: `${prefix}${i}`, value }))
const show = (xs: readonly Entry[], active: readonly string[] = []): TraceItem[] =>
  xs.map((x) => ({ id: x.id, value: x.value, tone: active.includes(x.id) ? 'active' : undefined }))
const group = (id: string, xs: readonly Entry[]) => ({ id, items: show(xs) })
const emit = (frames: TraceFrame[], op: TraceFrame['op'], formula: string, counters: TraceFrame['counters'], extra: Partial<TraceFrame> = {}) =>
  record(frames, { op, formula, counters, ...extra })

// Source: 第 5章-PPT-N2.md, physical slides 11–15. Three-way partition makes rank well-defined with duplicates.
const bfprtInputs = [
  { values: [12, 3, 8, 3, 16, 7, 10, 3, 5, 14, 9], rank: 6 },
  { values: [21, 8, 15, 4, 8, 19, 2, 11, 8, 17, 6, 8, 8], rank: 9 },
] as const
function bfprt(variant: 0 | 1): TraceFrame[] {
  const { values, rank } = bfprtInputs[variant]
  const original = entries(values)
  const frames: TraceFrame[] = []
  let comparisons = 0
  const counts = (size: number, target: number, depth: number) => ({ comparisons, size, rank: target, depth })
  emit(frames, 'start', `rank=${rank}; n=${original.length}`, counts(original.length, rank, 0), { items: show(original) })
  const sortSmall = (xs: Entry[]): Entry[] => {
    const a = xs.slice()
    for (let i = 1; i < a.length; i++) {
      let j = i
      while (j > 0) {
        comparisons++
        if (a[j - 1].value <= a[j].value) break
        ;[a[j - 1], a[j]] = [a[j], a[j - 1]]
        j--
      }
    }
    return a
  }
  const select = (xs: Entry[], target: number, depth: number): Entry => {
    if (xs.length <= 5) {
      const ordered = sortSmall(xs)
      emit(frames, 'select', `small group: sorted rank ${target}/${xs.length}`, counts(xs.length, target, depth), {
        items: show(ordered, [ordered[target - 1].id]), groups: [group('small sorted group', ordered)],
      })
      return ordered[target - 1]
    }
    const chunks: Entry[][] = []
    const medians: Entry[] = []
    for (let i = 0; i < xs.length; i += 5) {
      const sorted = sortSmall(xs.slice(i, i + 5))
      chunks.push(sorted)
      medians.push(sorted[Math.floor((sorted.length - 1) / 2)])
    }
    emit(frames, 'split', `${xs.length} items -> ${chunks.length} groups of at most five`, counts(xs.length, target, depth), {
      items: show(xs, medians.map((x) => x.id)), groups: chunks.map((chunk, i) => group(`group ${i + 1}`, chunk)),
    })
    emit(frames, 'select', `median candidates=${medians.length}; select rank ${Math.ceil(medians.length / 2)}`, counts(medians.length, Math.ceil(medians.length / 2), depth + 1), {
      items: show(medians), groups: [group('group medians', medians)],
    })
    const pivot = select(medians, Math.ceil(medians.length / 2), depth + 1)
    const less: Entry[] = [], equal: Entry[] = [], greater: Entry[] = []
    for (const x of xs) {
      comparisons++
      if (x.value < pivot.value) less.push(x)
      else {
        comparisons++
        if (x.value > pivot.value) greater.push(x)
        else equal.push(x)
      }
    }
    emit(frames, 'split', `pivot=${pivot.value}; |<|=${less.length}, |=|=${equal.length}, |>|=${greater.length}`, counts(xs.length, target, depth), {
      items: show(xs, [pivot.id]), groups: [group('< pivot', less), group('= pivot', equal), group('> pivot', greater)],
    })
    if (target <= less.length) return select(less, target, depth + 1)
    if (target <= less.length + equal.length) return equal[0]
    return select(greater, target - less.length - equal.length, depth + 1)
  }
  const answer = select(original, rank, 0)
  emit(frames, 'done', `rank ${rank} = ${answer.value}`, counts(original.length, rank, 0), {
    items: show(original, [answer.id]), output: [{ id: answer.id, value: answer.value }], result: answer.value,
  })
  return frames
}

// Source: 第 5章-PPT-N2.md, physical slides 16–20 (heap method on slide 18).
const topkInputs = [
  { values: [9, 2, 14, 7, 14, 5, 11, 3, 18], k: 4 },
  { values: [4, 20, 6, 17, 1, 20, 12, 8, 15, 3], k: 3 },
] as const
function topk(variant: 0 | 1): TraceFrame[] {
  const { values, k } = topkInputs[variant]
  const source = entries(values), heap: Entry[] = [], frames: TraceFrame[] = []
  let comparisons = 0, seen = 0
  const counts = () => ({ seen, heapSize: heap.length, capacity: k, comparisons })
  const snap = (op: TraceFrame['op'], formula: string, current?: Entry) => emit(frames, op, formula, counts(), {
    items: show(source, current ? [current.id] : []),
    groups: [group('min heap: retained top k', heap)],
    nodes: heap.map((x, i) => ({ id: x.id, value: x.value, x: (i + 1) / (heap.length + 1), y: i === 0 ? 0.2 : 0.3 + Math.floor(Math.log2(i + 1)) * 0.2 })),
    edges: heap.slice(1).map((x, i) => ({ from: heap[Math.floor(i / 2)].id, to: x.id, directed: true })),
  })
  const less = (a: Entry, b: Entry) => { comparisons++; return a.value < b.value }
  const up = (i: number) => {
    while (i > 0) {
      const p = Math.floor((i - 1) / 2)
      if (!less(heap[i], heap[p])) break
      ;[heap[i], heap[p]] = [heap[p], heap[i]]
      i = p
    }
  }
  const down = (start: number) => {
    let i = start
    while (true) {
      const l = 2 * i + 1, r = l + 1
      if (l >= heap.length) break
      let child = l
      if (r < heap.length && less(heap[r], heap[l])) child = r
      if (!less(heap[child], heap[i])) break
      ;[heap[i], heap[child]] = [heap[child], heap[i]]
      i = child
    }
  }
  snap('start', `n=${source.length}, capacity=${k}`)
  for (const x of source) {
    seen++
    if (heap.length < k) {
      heap.push(x); up(heap.length - 1)
      snap('insert', `fill heap: ${heap.length}/${k}`, x)
    } else {
      comparisons++
      if (x.value <= heap[0].value) snap('reject', `${x.value} <= root ${heap[0].value}`, x)
      else {
        const old = heap[0]
        heap[0] = x; down(0)
        snap('update', `${x.value} replaces root ${old.value}`, x)
      }
    }
  }
  const output = heap.slice().sort((a, b) => b.value - a.value || a.id.localeCompare(b.id))
  emit(frames, 'done', `sorted retained values: ${output.map((x) => x.value).join(',')}`, counts(), {
    items: show(source), groups: [group('min heap', heap)], output: show(output), result: output.map((x) => x.value),
  })
  return frames
}

// Source: 第 5章-PPT-N2.md, physical slides 3–7.
const minmaxInputs = [[8, 2, 13, 5, 1, 10, 7, 14], [9, 4, 11, 2, 15, 3, 8]] as const
function minmax(variant: 0 | 1): TraceFrame[] {
  const source = entries(minmaxInputs[variant]), frames: TraceFrame[] = []
  let comparisons = 0
  let min: Entry, max: Entry, at: number
  const counts = (seen: number) => ({ seen, comparisons, bound: Math.ceil(3 * source.length / 2) - 2 })
  emit(frames, 'start', `n=${source.length}; pair neighbors before updating extrema`, counts(0), { items: show(source) })
  if (source.length % 2) { min = max = source[0]; at = 1 }
  else {
    comparisons++
    ;[min, max] = source[0].value < source[1].value ? [source[0], source[1]] : [source[1], source[0]]
    at = 2
    emit(frames, 'compare', `first pair: min=${min.value}, max=${max.value}`, counts(at), {
      items: show(source, [source[0].id, source[1].id]), groups: [group('min', [min]), group('max', [max])],
    })
  }
  for (; at + 1 < source.length; at += 2) {
    const a = source[at], b = source[at + 1]
    comparisons++
    const small = a.value < b.value ? a : b, large = a.value < b.value ? b : a
    emit(frames, 'compare', `pair ${a.value},${b.value} -> smaller ${small.value}, larger ${large.value}`, counts(at + 2), {
      items: show(source, [a.id, b.id]), groups: [group('smaller candidate', [small]), group('larger candidate', [large])],
    })
    comparisons++
    if (small.value < min.value) min = small
    comparisons++
    if (large.value > max.value) max = large
    emit(frames, 'update', `min=${min.value}, max=${max.value}`, counts(at + 2), {
      items: show(source, [min.id, max.id]), groups: [group('min', [min]), group('max', [max])],
    })
  }
  if (at < source.length) {
    const x = source[at]
    comparisons++
    if (x.value < min.value) min = x
    comparisons++
    if (x.value > max.value) max = x
    emit(frames, 'update', `single tail ${x.value}: min=${min.value}, max=${max.value}`, counts(source.length), {
      items: show(source, [x.id]), groups: [group('min', [min]), group('max', [max])],
    })
  }
  emit(frames, 'done', `min=${min.value}, max=${max.value}; comparisons=${comparisons}`, counts(source.length), {
    items: show(source, [min.id, max.id]), output: show([min, max]), result: { min: min.value, max: max.value, comparisons },
  })
  return frames
}

// Sources: 第 3章-PPT-N2_v3.md physical slide 39; 试题_20221120.md physical slide 1, problem II.
const kwayInputs = [
  [[1, 6, 12], [2, 7, 10], [3, 4, 13], [5, 8, 9, 11]],
  [[0, 5, 5], [1, 3, 9], [2, 6], [4, 7, 8]],
] as const
function kway(variant: 0 | 1): TraceFrame[] {
  const runs = kwayInputs[variant].map((xs, r) => entries(xs, `r${r}-`))
  type Head = { entry: Entry; run: number; index: number }
  const heap: Head[] = [], output: Entry[] = [], frames: TraceFrame[] = []
  const positions = runs.map(() => 0)
  let comparisons = 0
  const n = runs.reduce((sum, r) => sum + r.length, 0), k = runs.length
  const counts = () => ({ emitted: output.length, total: n, heapSize: heap.length, comparisons })
  const visible = () => ({
    groups: [group('heap heads', heap.map((h) => h.entry)), ...runs.map((r, i) => group(`run ${i + 1}: remaining`, r.slice(positions[i])))],
    items: show(heap.map((h) => h.entry)), output: show(output),
  })
  const less = (a: Head, b: Head) => {
    comparisons++
    return a.entry.value < b.entry.value || (a.entry.value === b.entry.value && a.run < b.run)
  }
  const push = (x: Head) => {
    heap.push(x)
    let i = heap.length - 1
    while (i > 0) {
      const p = Math.floor((i - 1) / 2)
      if (!less(heap[i], heap[p])) break
      ;[heap[i], heap[p]] = [heap[p], heap[i]]; i = p
    }
  }
  const pop = (): Head => {
    const root = heap[0], last = heap.pop()!
    if (heap.length) {
      heap[0] = last
      let i = 0
      while (2 * i + 1 < heap.length) {
        const l = 2 * i + 1, r = l + 1
        let child = l
        if (r < heap.length && less(heap[r], heap[l])) child = r
        if (!less(heap[child], heap[i])) break
        ;[heap[i], heap[child]] = [heap[child], heap[i]]; i = child
      }
    }
    return root
  }
  emit(frames, 'start', `${k} sorted runs, total ${n} items`, counts(), { groups: runs.map((r, i) => group(`run ${i + 1}`, r)) })
  runs.forEach((run, i) => { if (run.length) push({ entry: run[0], run: i, index: 0 }) })
  emit(frames, 'insert', `one head from each nonempty run; heap size=${heap.length}`, counts(), visible())
  while (heap.length) {
    const head = pop()
    output.push(head.entry)
    positions[head.run] = head.index + 1
    emit(frames, 'merge', `emit ${head.entry.value} from run ${head.run + 1}`, counts(), visible())
    const next = runs[head.run][head.index + 1]
    if (next) {
      push({ entry: next, run: head.run, index: head.index + 1 })
      emit(frames, 'insert', `advance run ${head.run + 1} to ${next.value}`, counts(), visible())
    }
  }
  emit(frames, 'done', `${output.length} items emitted in ascending order`, counts(), { ...visible(), result: output.map((x) => x.value) })
  return frames
}

// Source: 第 5章-PPT-N2.md, physical slides 19–20. This retains prior matches, unlike full tournament sort.
const tournamentInputs = [
  { values: [5, 2, 7, 9, 1, 3, 8, 6], k: 3 },
  { values: [12, 4, 12, 7, 9, 2, 15], k: 4 },
] as const
function tournamentTopk(variant: 0 | 1): TraceFrame[] {
  const { values, k } = tournamentInputs[variant]
  const source = entries(values)
  const n = source.length
  // Leaves occupy [n, 2n); every internal match and leaf keeps its own id.
  const winners: (Entry | null)[] = Array(2 * n).fill(null)
  const output: Entry[] = [], frames: TraceFrame[] = []
  let comparisons = 0, touched = 0
  const x = Array<number>(2 * n).fill(0)
  const depth = Array<number>(2 * n).fill(0)
  const leafNodes: number[] = []
  const leafRank = Array<number>(2 * n).fill(0)
  const place = (index: number, d: number): number => {
    depth[index] = d
    if (index >= n) {
      leafRank[index] = leafNodes.length
      leafNodes.push(index)
      return x[index] = 0.07 + leafRank[index] * 0.86 / Math.max(1, n - 1)
    }
    return x[index] = (place(2 * index, d + 1) + place(2 * index + 1, d + 1)) / 2
  }
  place(1, 0)
  for (let i = 0; i < n; i++) winners[leafNodes[i]] = source[i]
  const maxDepth = Math.max(...depth.slice(1))
  const counts = () => ({ emitted: output.length, target: k, comparisons, touched })
  const view = (active: number[] = []): Partial<TraceFrame> => ({
    items: show(source, output.map((e) => e.id)),
    nodes: Array.from({ length: 2 * n - 1 }, (_, p) => {
      const i = p + 1, winner = winners[i]
      return {
        id: `match-${i}`, value: winner?.value ?? '−∞',
        label: i >= n ? `leaf ${leafRank[i] + 1}` : `match ${i}`,
        x: x[i], y: 0.08 + depth[i] * 0.84 / Math.max(1, maxDepth),
        tone: active.includes(i) ? 'active' as const : undefined,
      }
    }),
    edges: Array.from({ length: 2 * n - 2 }, (_, p) => {
      const child = p + 2
      return { from: `match-${child}`, to: `match-${Math.floor(child / 2)}`, directed: true,
        tone: active.includes(child) ? 'active' as const : undefined }
    }),
    output: show(output),
  })
  const replay = (i: number) => {
    const a = winners[2 * i], b = winners[2 * i + 1]
    if (!a) winners[i] = b
    else if (!b) winners[i] = a
    else {
      comparisons++
      winners[i] = a.value > b.value || (a.value === b.value && Number(a.id.slice(1)) < Number(b.id.slice(1))) ? a : b
    }
  }
  emit(frames, 'start', `n=${n}, take top ${k}; leaves keep original identity`, counts(), view())
  for (let i = n - 1; i >= 1; i--) {
    replay(i)
    emit(frames, 'compare', `match ${i} winner=${winners[i]?.value}; comparisons=${comparisons}`, counts(), view([i, 2 * i, 2 * i + 1]))
  }
  for (let round = 0; round < k; round++) {
    const champion = winners[1]!
    let leaf = leafNodes[Number(champion.id.slice(1))]
    const path = [leaf]
    for (let p = Math.floor(leaf / 2); p >= 1; p = Math.floor(p / 2)) path.push(p)
    output.push(champion)
    emit(frames, 'select', `champion ${champion.value} from leaf ${leafRank[leaf] + 1}`, counts(), view(path))
    winners[leaf] = null
    while (leaf > 1) {
      leaf = Math.floor(leaf / 2)
      touched++
      replay(leaf)
      emit(frames, 'update', `replay ancestor ${leaf}; winner=${winners[leaf]?.value ?? '−∞'}`, counts(), view(path))
    }
  }
  emit(frames, 'done', `top ${k}: ${output.map((e) => e.value).join(',')}`, counts(), {
    ...view(), result: output.map((e) => e.value),
  })
  return frames
}

export const classroomSelectionMissions: CourseMission[] = [
  { id: 'ppt-select-bfprt', chapter: 'divide', sources: ['classroom'], trace: bfprt },
  { id: 'ppt-select-topk', chapter: 'divide', sources: ['classroom'], trace: topk },
  { id: 'ppt-select-minmax', chapter: 'divide', sources: ['classroom'], trace: minmax },
  { id: 'ppt-merge-kway', chapter: 'external', sources: ['classroom'], trace: kway },
  { id: 'ppt-select-tournament-topk', chapter: 'divide', sources: ['classroom'], trace: tournamentTopk },
]
