import type { CourseMission, TraceFrame, TraceItem, TraceNode } from '../types'
import { record } from './trace'

const emit = (frames: TraceFrame[], op: TraceFrame['op'], formula: string, counters: TraceFrame['counters'], extra: Partial<TraceFrame> = {}) =>
  record(frames, { op, formula, counters, ...extra })
const item = (id: string, value: string | number, tone?: TraceItem['tone']): TraceItem => ({ id, value, tone })

// Each clause has exactly three distinct variables; literal sign is independent of variable identity.
const satCases = [
  { n: 4, clauses: [[[0, true], [1, false], [2, true]], [[0, false], [2, false], [3, true]], [[1, true], [2, true], [3, false]], [[0, true], [1, true], [3, true]]], bits: [1, 0, 1, 0] },
  { n: 5, clauses: [[[0, false], [1, true], [4, true]], [[1, false], [2, true], [3, false]], [[0, true], [3, true], [4, false]], [[0, false], [2, false], [4, false]]], bits: [0, 1, 0, 1, 0] },
] as const
function max3sat(variant: 0 | 1): TraceFrame[] {
  const { n, clauses, bits } = satCases[variant], frames: TraceFrame[] = []
  const label = (clause: typeof clauses[number]) => clause.map(([i, positive]) => `${positive ? '' : '¬'}x${i + 1}`).join(' ∨ ')
  const satisfied = (clause: typeof clauses[number], assignment: readonly number[]) => clause.some(([i, positive]) => Boolean(assignment[i]) === positive)
  const variables = bits.map((b, i) => item(`x${i + 1}`, `x${i + 1}=${b}`))
  const shown = (seen: number) => clauses.map((c, i) => item(`C${i + 1}`, `C${i + 1}: ${label(c)} ${i < seen ? (satisfied(c, bits) ? '✓' : '✗') : '?'}`, i < seen ? (satisfied(c, bits) ? 'settled' : 'red') : undefined))
  emit(frames, 'start', `P(C_j unsatisfied)=(1/2)^3=1/8; E[Y]=${clauses.length}×7/8=${7 * clauses.length}/8`, { variables: n, clauses: clauses.length, expectedNumerator: 7 * clauses.length, expectedDenominator: 8, checked: 0, satisfied: 0 }, { items: shown(0), groups: [{ id: 'independent fair assignment', items: variables }] })
  let count = 0
  clauses.forEach((clause, i) => {
    if (satisfied(clause, bits)) count++
    emit(frames, 'compare', `C${i + 1}=(${label(clause)}): ${satisfied(clause, bits) ? 1 : 0}; Y_so_far=${count}`, { checked: i + 1, satisfied: count, expectedNumerator: 7 * clauses.length, expectedDenominator: 8 }, { items: shown(i + 1), groups: [{ id: 'assignment', items: variables }] })
  })
  let total = 0
  for (let mask = 0; mask < 1 << n; mask++) {
    const a = Array.from({ length: n }, (_, i) => (mask >> i) & 1)
    total += clauses.filter(c => satisfied(c, a)).length
  }
  const expectation = total / (1 << n)
  emit(frames, 'done', `sample Y=${count}; exact E[Y]=${total}/${1 << n}=${expectation}=7m/8; E[Y]≥7OPT/8`, { checked: clauses.length, satisfied: count, expectedNumerator: total, expectedDenominator: 1 << n, assignments: 1 << n }, { items: shown(clauses.length), output: [item('sample', count), item('expected', expectation)], result: { sample: count, expectation, assignments: 1 << n, totalSatisfied: total, clauses: clauses.map(c => c.map(([variable, positive]) => ({ variable, positive }))), bits: [...bits] } })
  return frames
}

type Graph = { weights: number[]; edges: [number, number][] }
const weightedCases: Graph[] = [
  { weights: [2, 3, 4, 2], edges: [[0, 1], [1, 2], [2, 0], [2, 3]] },
  { weights: [2, 2, 2, 1, 3], edges: [[0, 1], [1, 2], [2, 0], [3, 4]] },
]
function optimumCover(graph: Graph) {
  let best = Infinity, selected: number[] = []
  for (let mask = 0; mask < 1 << graph.weights.length; mask++) {
    if (!graph.edges.every(([u, v]) => (mask & (1 << u)) || (mask & (1 << v)))) continue
    const cost = graph.weights.reduce((s, w, i) => s + ((mask >> i & 1) ? w : 0), 0)
    if (cost < best) { best = cost; selected = graph.weights.flatMap((_, i) => mask >> i & 1 ? [i] : []) }
  }
  return { cost: best, selected }
}
function weightedVertexCover(variant: 0 | 1): TraceFrame[] {
  const graph = weightedCases[variant], { weights, edges } = graph, frames: TraceFrame[] = []
  const nodes = (x: readonly number[], chosen: readonly number[] = []): TraceNode[] => weights.map((w, i) => ({ id: `v${i}`, value: `v${i + 1}:w${w},x${x[i]}`, x: 0.14 + (i % 3) * 0.35, y: 0.22 + Math.floor(i / 3) * 0.5, tone: chosen.includes(i) ? 'settled' : undefined }))
  const links = edges.map(([u, v], i) => ({ from: `v${u}`, to: `v${v}`, weight: `e${i + 1}` }))
  emit(frames, 'start', `min Σw_v x_v; 0≤x_v≤1; each edge requires x_u+x_v≥1`, { vertices: weights.length, edges: edges.length }, { nodes: nodes(weights.map(() => 0)), edges: links, items: edges.map(([u, v], i) => item(`e${i + 1}`, `x${u + 1}+x${v + 1}≥1`)) })
  // Demonstration-only exhaustive search over {0, 1/2, 1}^n. Half-integrality of vertex-cover LP ensures an optimum here.
  let best = Infinity, x: number[] = []
  for (let code = 0; code < 3 ** weights.length; code++) {
    let rest = code
    const candidate = weights.map(() => { const value = (rest % 3) / 2; rest = Math.floor(rest / 3); return value })
    if (!edges.every(([u, v]) => candidate[u] + candidate[v] >= 1)) continue
    const cost = candidate.reduce((sum, value, i) => sum + value * weights[i], 0)
    if (cost < best) { best = cost; x = candidate }
  }
  for (const [i, [u, v]] of edges.entries()) emit(frames, 'compare', `e${i + 1}: x${u + 1}+x${v + 1}=${x[u]}+${x[v]}=${x[u] + x[v]}≥1`, { lpCost: best, checked: i + 1, edges: edges.length }, { nodes: nodes(x), edges: links, items: edges.map(([a, b], j) => item(`e${j + 1}`, `x${a + 1}+x${b + 1}=${x[a] + x[b]}`, j === i ? 'active' : undefined)) })
  const chosen = x.flatMap((value, i) => value >= 0.5 ? [i] : []), cost = chosen.reduce((sum, i) => sum + weights[i], 0)
  const integer = optimumCover(graph)
  emit(frames, 'done', `w(C)=${cost}≤2 LP*=${2 * best}≤2 OPT=${2 * integer.cost}`, { lpCost: best, roundedCost: cost, integerOptimum: integer.cost, roundedVertices: chosen.length }, { nodes: nodes(x, chosen), edges: links, output: chosen.map(i => item(`v${i}`, `v${i + 1}:w${weights[i]}`)), result: { weights: [...weights], edges: edges.map(e => [...e]), fractional: x, lpCost: best, rounded: chosen, roundedCost: cost, integerOptimum: integer.cost, optimumCover: integer.selected } })
  return frames
}

const radixCases = [[15, 3, 8, 3, 12, 7], [24, 5, 18, 5, 12, 0, 23]] as const
function radixBaseN(variant: 0 | 1): TraceFrame[] {
  const input = radixCases[variant], n = input.length, frames: TraceFrame[] = []
  type Entry = { id: string; value: number }
  let a: Entry[] = input.map((value, i) => ({ id: `a${i}`, value })), writes = 0
  const shown = (xs: readonly Entry[]) => xs.map((e, i) => ({ id: e.id, value: e.value, label: String(i) }))
  emit(frames, 'start', `0≤a<n²=${n * n}; a=pn+q, 0≤p,q<${n}`, { n, base: n, writes }, { items: shown(a), groups: [{ id: 'base-n digits', items: a.map(e => item(e.id, `${e.value}=(${Math.floor(e.value / n)},${e.value % n})_${n}`)) }] })
  for (const [pass, digit] of [['low', (x: number) => x % n], ['high', (x: number) => Math.floor(x / n)]] as const) {
    const counts = Array(n).fill(0) as number[]
    for (const e of a) counts[digit(e.value)]++
    emit(frames, 'update', `${pass} digit counts by bucket 0…${n - 1}`, { pass, writes, counted: n }, { items: shown(a), groups: [{ id: 'counts', items: counts.map((v, i) => item(`bucket${i}`, v)) }] })
    const cumulative = counts.slice()
    for (let i = 1; i < n; i++) cumulative[i] += cumulative[i - 1]
    emit(frames, 'update', `${pass} cumulative C[d]=number of entries with digit≤d`, { pass, writes, cumulativeTotal: cumulative[n - 1] }, { items: shown(a), groups: [{ id: 'cumulative', items: cumulative.map((v, i) => item(`bucket${i}`, v)) }] })
    const output: Entry[] = Array(n)
    for (let i = n - 1; i >= 0; i--) {
      const e = a[i], d = digit(e.value), target = --cumulative[d]
      output[target] = e; writes++
      emit(frames, 'insert', `${pass}: scan right→left; ${e.value} digit ${d} → slot ${target}`, { pass, scan: i, digit: d, target, writes }, { items: shown(a), output: Array.from({ length: n }, (_, j) => output[j] ? item(output[j].id, output[j].value, 'settled') : item(`empty${j}`, '□', 'muted')), groups: [{ id: 'next positions', items: cumulative.map((v, j) => item(`bucket${j}`, v)) }] })
    }
    a = output
    emit(frames, 'merge', `${pass} stable counting pass complete`, { pass, writes }, { items: shown(a) })
  }
  emit(frames, 'done', `two stable counting passes; O(n+n)+O(n+n)=O(n)`, { n, passes: 2, writes }, { items: shown(a), output: shown(a), result: a.map(e => ({ id: e.id, value: e.value })) })
  return frames
}

const committeeCases = [
  { n: 4, edges: [[0, 1], [1, 2], [2, 0], [2, 3]], k: 2 },
  { n: 5, edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0]], k: 2 },
] as const
function committee(variant: 0 | 1): TraceFrame[] {
  const { n, edges, k } = committeeCases[variant], frames: TraceFrame[] = []
  const professors = Array.from({ length: n }, (_, i) => item(`p${i}`, `p${i + 1}`))
  const topics = edges.map(([u, v], i) => ({ id: `T${i + 1}`, items: [professors[u], professors[v]] }))
  const nodes: TraceNode[] = professors.map((p, i) => ({ ...p, x: 0.12 + (i % 3) * 0.36, y: 0.22 + Math.floor(i / 3) * 0.5 }))
  const links = edges.map(([u, v], i) => ({ from: `p${u}`, to: `p${v}`, weight: `T${i + 1}` }))
  emit(frames, 'start', `VC(G,k) → committee(P_i={endpoints of e_i},k); k=${k}`, { vertices: n, topics: edges.length, k }, { nodes, edges: links, groups: topics })
  topics.forEach((t, i) => emit(frames, 'insert', `e${i + 1}=(${edges[i][0] + 1},${edges[i][1] + 1}) → ${t.id}={p${edges[i][0] + 1},p${edges[i][1] + 1}}`, { mapped: i + 1, topics: edges.length, k }, { nodes, edges: links, groups: topics.slice(0, i + 1) }))
  let best = n + 1, witness: number[] = [], equivalent = true
  for (let mask = 0; mask < 1 << n; mask++) {
    const chosen = professors.flatMap((_, i) => mask >> i & 1 ? [i] : [])
    const cover = edges.every(([u, v]) => chosen.includes(u) || chosen.includes(v))
    const committeeValid = topics.every(t => t.items.some(p => chosen.includes(Number(p.id.slice(1)))))
    equivalent &&= cover === committeeValid
    if (cover && chosen.length < best) { best = chosen.length; witness = chosen }
  }
  const decision = best <= k
  emit(frames, 'select', `small-example minimum S={${witness.map(i => `p${i + 1}`).join(',')}}; |S|=${best}${decision ? '≤' : '>'}k=${k}; every T_i intersects S`, { minimumSize: best, k, decision: decision ? 'YES' : 'NO', verifiedTopics: topics.length }, { nodes: nodes.map((p, i) => ({ ...p, tone: witness.includes(i) ? 'settled' : undefined })), edges: links, groups: topics })
  emit(frames, 'done', `VC(G,k) ⇔ committee(P,k); min VC=min committee=${best}; k=${k} ⇒ ${decision ? 'YES' : 'NO'}`, { minimumCover: best, minimumCommittee: best, k, decision: decision ? 'YES' : 'NO', equivalentSubsets: 1 << n }, { nodes, edges: links, output: witness.map(i => professors[i]), result: { n, edges: edges.map(e => [...e]), topics: topics.map(t => t.items.map(p => Number(p.id.slice(1)))), k, minimumCover: best, minimumCommittee: best, witness, decision, equivalent } })
  return frames
}

export const classroomApproxExamMissions: CourseMission[] = [
  { id: 'ppt-approx-max3sat', chapter: 'optimization', sources: ['classroom'], trace: max3sat },
  { id: 'ppt-approx-weighted-vertex-cover', chapter: 'optimization', sources: ['classroom'], trace: weightedVertexCover },
  { id: 'ppt-sort-radix-base-n', chapter: 'sorting', sources: ['classroom'], trace: radixBaseN },
  { id: 'ppt-np-review-committee', chapter: 'complexity', sources: ['classroom'], trace: committee },
]
