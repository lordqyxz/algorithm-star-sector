import type { CourseMission, TraceFrame, TraceItem, TraceNode } from '../types'
import { record } from './trace'

const emit = (frames: TraceFrame[], op: TraceFrame['op'], formula: string, counters: TraceFrame['counters'], extra: Partial<TraceFrame> = {}) => record(frames, { op, formula, counters, ...extra })
const freeze = <T>(x: T): T => { if (x && typeof x === 'object') { Object.freeze(x); for (const v of Object.values(x)) freeze(v) } return x }
const tile = (id: string, value: string | number, tone?: TraceItem['tone']): TraceItem => ({ id, value, tone })

// Physical slides 17–21, chapter 2: the crossing answer uses a nonempty suffix and prefix.
const arrayCases = [[-2, 3, -1, 5, -6, 4, 2, -1], [-8, -3, -6, -2, -5, -4]] as const
type Segment = { lo: number; hi: number; sum: number }
function maxSubarray(variant: 0 | 1): TraceFrame[] {
  const a = arrayCases[variant], frames: TraceFrame[] = []
  const better = (x: Segment, y: Segment) => y.sum > x.sum || y.sum === x.sum && (y.lo < x.lo || y.lo === x.lo && y.hi < x.hi) ? y : x
  const view = (lo: number, hi: number, active: number[] = [], chosen?: Segment): TraceItem[] => a.map((value, i) => ({ id: `a${i}`, value, label: String(i + 1), tone: chosen && i >= chosen.lo && i <= chosen.hi ? 'settled' : active.includes(i) ? 'active' : i >= lo && i <= hi ? undefined : 'muted' }))
  emit(frames, 'start', `M(l,r)=\\max\\{M(l,m),M(m+1,r),S_L+S_R\\};\\quad A=[${a.join(',')}]`, { n: a.length }, { items: view(0, a.length - 1) })
  const solve = (lo: number, hi: number): Segment => {
    if (lo === hi) {
      const answer = { lo, hi, sum: a[lo] }
      emit(frames, 'select', `M(${lo + 1},${hi + 1})=A_{${lo + 1}}=${a[lo]}`, { lo: lo + 1, hi: hi + 1, best: answer.sum }, { items: view(lo, hi, [lo], answer), result: answer })
      return answer
    }
    const mid = (lo + hi) >> 1
    emit(frames, 'split', `[${lo + 1},${hi + 1}]\\to[${lo + 1},${mid + 1}],[${mid + 2},${hi + 1}]`, { lo: lo + 1, mid: mid + 1, hi: hi + 1 }, { items: view(lo, hi, [mid, mid + 1]) })
    const left = solve(lo, mid), right = solve(mid + 1, hi)
    let suffix = -Infinity, suffixStart = mid, running = 0
    for (let i = mid; i >= lo; i--) {
      running += a[i]
      if (running > suffix || running === suffix && i < suffixStart) { suffix = running; suffixStart = i }
      emit(frames, 'compare', `\\sum_{k=${i + 1}}^{${mid + 1}}A_k=${running};\\quad S_L=${suffix}`, { lo: lo + 1, mid: mid + 1, hi: hi + 1, candidate: running, suffix }, { items: view(lo, hi, Array.from({ length: mid - i + 1 }, (_, k) => i + k)), result: { candidate: running, suffix, suffixStart } })
    }
    let prefix = -Infinity, prefixEnd = mid + 1
    running = 0
    for (let j = mid + 1; j <= hi; j++) {
      running += a[j]
      if (running > prefix) { prefix = running; prefixEnd = j }
      emit(frames, 'compare', `\\sum_{k=${mid + 2}}^{${j + 1}}A_k=${running};\\quad S_R=${prefix}`, { lo: lo + 1, mid: mid + 1, hi: hi + 1, candidate: running, prefix }, { items: view(lo, hi, Array.from({ length: j - mid }, (_, k) => mid + 1 + k)), result: { candidate: running, prefix, prefixEnd } })
    }
    const cross = { lo: suffixStart, hi: prefixEnd, sum: suffix + prefix }
    const answer = better(better(left, right), cross)
    emit(frames, 'merge', `\\max\\{${left.sum},${right.sum},${suffix}+${prefix}=${cross.sum}\\}=${answer.sum}`, { lo: lo + 1, mid: mid + 1, hi: hi + 1, left: left.sum, right: right.sum, suffix, prefix, cross: cross.sum, best: answer.sum }, { items: view(lo, hi, Array.from({ length: cross.hi - cross.lo + 1 }, (_, k) => cross.lo + k), answer), result: { left, right, cross, answer } })
    return answer
  }
  const answer = solve(0, a.length - 1)
  emit(frames, 'done', `\\max_{1\\leq i\\leq j\\leq ${a.length}}\\sum_{k=i}^{j}A_k=${answer.sum}`, { sum: answer.sum, from: answer.lo + 1, to: answer.hi + 1 }, { items: view(0, a.length - 1, [], answer), output: a.slice(answer.lo, answer.hi + 1).map((x, i) => tile(`a${answer.lo + i}`, x, 'settled')), result: { values: [...a], ...answer } })
  return frames
}

// Physical slides 54–59, chapter 6: fixed-order dominoes, each with two orientations.
const dominoCases = [
  [[1, 4], [2, 6], [3, 5], [1, 7], [2, 4], [3, 6]],
  [[2, 3], [1, 5], [4, 4], [2, 7], [1, 6]],
] as const
function dominoLongest(variant: 0 | 1): TraceFrame[] {
  const cards = dominoCases[variant], n = cards.length, frames: TraceFrame[] = []
  const id = (i: number, o: number) => `d${i}-${o}`
  const side = (i: number, o: number): [number, number] => o ? [cards[i][1], cards[i][0]] : [cards[i][0], cards[i][1]]
  const nodes: TraceNode[] = [tile('s', 's') as TraceNode, ...cards.flatMap((_, i) => [0, 1].map(o => ({ ...tile(id(i, o), `${side(i, o)[0]}|${side(i, o)[1]}`), x: .13 + .72 * i / Math.max(1, n - 1), y: o ? .72 : .28 }))), tile('t', 't') as TraceNode]
  nodes[0].x = .03; nodes[0].y = .5; nodes.at(-1)!.x = .97; nodes.at(-1)!.y = .5
  const edges = [0, 1].map(o => ({ from: 's', to: id(0, o), directed: true, weight: 0 }))
  for (let i = 0; i < n - 1; i++) for (let o = 0; o < 2; o++) for (let p = 0; p < 2; p++) edges.push({ from: id(i, o), to: id(i + 1, p), directed: true, weight: side(i, o)[1] * side(i + 1, p)[0] })
  for (let o = 0; o < 2; o++) edges.push({ from: id(n - 1, o), to: 't', directed: true, weight: 0 })
  const d = Array.from({ length: n }, () => [-Infinity, -Infinity]), parent = Array.from({ length: n }, () => [-1, -1])
  const snap = (op: TraceFrame['op'], formula: string, stage: number, active?: [number, number, number, number]) => emit(frames, op, formula, { stage, best: stage < 0 ? 0 : Math.max(...d[Math.min(stage, n - 1)]) }, { nodes: nodes.map(node => ({ ...node, label: node.id === 's' || node.id === 't' ? undefined : Number.isFinite(d[Number(node.id.slice(1, -2))]?.[Number(node.id.at(-1))]) ? String(d[Number(node.id.slice(1, -2))][Number(node.id.at(-1))]) : '−∞', tone: active && node.id === id(active[2], active[3]) ? 'active' : undefined })), edges: edges.map(e => ({ ...e, tone: active && e.from === id(active[0], active[1]) && e.to === id(active[2], active[3]) ? 'active' : undefined })), matrix: { rows: ['0', '1'], columns: cards.map((_, i) => String(i + 1)), values: [0, 1].map(o => cards.map((_, i) => Number.isFinite(d[i][o]) ? d[i][o] : '−∞')), active: active ? [active[3], active[2]] : undefined, links: active ? [{ from: [active[1], active[0]], to: [active[3], active[2]] }] : [] }, result: { distances: d.map(row => [...row]), parents: parent.map(row => [...row]) } })
  snap('start', 'D(s)=0;\\quad D(v)=\\max_{u\\to v}\\{D(u)+w(u,v)\\}', -1)
  for (let o = 0; o < 2; o++) { d[0][o] = 0; snap('select', `D_{1,${o}}=D(s)+0=0`, 0) }
  for (let i = 0; i < n - 1; i++) for (let o = 0; o < 2; o++) for (let p = 0; p < 2; p++) {
    const weight = side(i, o)[1] * side(i + 1, p)[0], candidate = d[i][o] + weight
    snap('compare', `D_{${i + 1},${o}}+${side(i, o)[1]}\\cdot${side(i + 1, p)[0]}=${d[i][o]}+${weight}=${candidate}`, i, [i, o, i + 1, p])
    if (candidate > d[i + 1][p]) { d[i + 1][p] = candidate; parent[i + 1][p] = o; snap('relax', `D_{${i + 2},${p}}=${candidate};\\quad P_{${i + 2},${p}}=${o}`, i + 1, [i, o, i + 1, p]) }
  }
  let orientation = d[n - 1][1] > d[n - 1][0] ? 1 : 0
  const choice = Array(n).fill(0)
  for (let i = n - 1; i >= 0; i--) { choice[i] = orientation; snap('visit', `P_{${i + 1},${orientation}}=${i ? parent[i][orientation] : 's'}`, i); orientation = parent[i][orientation] }
  const score = Math.max(...d[n - 1])
  emit(frames, 'done', `D(t)=\\max\\{D_{${n},0},D_{${n},1}\\}=${score}`, { score, cards: n }, { nodes: nodes.map(node => ({ ...node, tone: node.id === 's' || node.id === 't' || choice.some((o, i) => node.id === id(i, o)) ? 'settled' : 'muted' })), edges: edges.map(e => ({ ...e, tone: e.from === 's' && e.to === id(0, choice[0]) || e.to === 't' && e.from === id(n - 1, choice[n - 1]) || choice.slice(0, -1).some((o, i) => e.from === id(i, o) && e.to === id(i + 1, choice[i + 1])) ? 'settled' : 'muted' })), output: choice.map((o, i) => tile(id(i, o), `${side(i, o)[0]}|${side(i, o)[1]}`, 'settled')), result: { cards: cards.map(c => [...c]), orientations: choice, score } })
  return frames
}

// Physical slides 19–22, chapter 8: repeat BFS from every still-white component root.
const colorCases = [
  { n: 7, edges: [[0, 1], [1, 2], [2, 3], [4, 5], [5, 6]] },
  { n: 7, edges: [[0, 1], [1, 2], [2, 3], [4, 5], [5, 6], [6, 4]] },
] as const
function bipartite(variant: 0 | 1): TraceFrame[] {
  const { n, edges } = colorCases[variant], frames: TraceFrame[] = [], color = Array(n).fill(-1), parent = Array(n).fill(-1), depth = Array(n).fill(-1), queue: number[] = []
  const adj = Array.from({ length: n }, () => [] as number[])
  for (const [u, v] of edges) { adj[u].push(v); adj[v].push(u) }
  adj.forEach(row => row.sort((a, b) => a - b))
  let components = 0, checked = 0, active: [number, number] | undefined
  const snap = (op: TraceFrame['op'], formula: string, cycle: number[] = []) => emit(frames, op, formula, { components, colored: color.filter(x => x >= 0).length, checked, queue: queue.join(','), cycleLength: cycle.length ? cycle.length - 1 : 0 }, { nodes: Array.from({ length: n }, (_, i) => ({ ...tile(`v${i}`, String.fromCharCode(65 + i), color[i] < 0 ? 'muted' : color[i] ? 'black' : 'red'), x: .15 + .7 * (i % 4) / 3, y: .22 + .56 * Math.floor(i / 4), label: color[i] < 0 ? '·' : String(color[i]) })), edges: edges.map(([u, v]) => ({ from: `v${u}`, to: `v${v}`, tone: active && (active[0] === u && active[1] === v || active[0] === v && active[1] === u) ? 'active' : cycle.some((x, i) => i && (x === u && cycle[i - 1] === v || x === v && cycle[i - 1] === u)) ? 'red' : 'muted' })), output: cycle.map((x, i) => tile(`cycle-${i}`, String.fromCharCode(65 + x), 'red')), result: { colors: [...color], parent: [...parent], depth: [...depth], cycle: [...cycle], edges: edges.map(e => [...e]) } })
  const oddCycle = (u: number, v: number): number[] => {
    const up: number[] = [], vp: number[] = []
    for (let x = u; x >= 0; x = parent[x]) up.push(x)
    for (let x = v; x >= 0; x = parent[x]) vp.push(x)
    let i = up.length - 1, j = vp.length - 1
    while (i >= 0 && j >= 0 && up[i] === vp[j]) { i--; j-- }
    return [...up.slice(0, i + 2), ...vp.slice(0, j + 1).reverse(), u]
  }
  snap('start', 'color(v)=white;\\quad color(child)=1-color(parent)')
  for (let root = 0; root < n; root++) {
    if (color[root] >= 0) continue
    components++; color[root] = 0; depth[root] = 0; queue.push(root)
    snap('select', `color(${root + 1})=0;\\quad component=${components}`)
    while (queue.length) {
      const u = queue.shift()!
      snap('visit', `u=${u + 1};\\quad color(u)=${color[u]}`)
      for (const v of adj[u]) {
        checked++; active = [u, v]
        if (color[v] < 0) { color[v] = 1 - color[u]; parent[v] = u; depth[v] = depth[u] + 1; queue.push(v); snap('update', `color(${v + 1})=1-color(${u + 1})=${color[v]}`) }
        else if (color[v] === color[u]) {
          const cycle = oddCycle(u, v)
          snap('reject', `color(${u + 1})=color(${v + 1})=${color[u]};\\quad |C|=${cycle.length - 1}`, cycle)
          emit(frames, 'done', `\\exists C:|C|=${cycle.length - 1}\\equiv1\\pmod2`, { components, checked, bipartite: 0, cycleLength: cycle.length - 1 }, { nodes: frames.at(-1)!.nodes, edges: frames.at(-1)!.edges, output: frames.at(-1)!.output, result: { bipartite: false, colors: [...color], cycle, edges: edges.map(e => [...e]), components } })
          return frames
        } else snap('compare', `color(${u + 1})=${color[u]}\\ne color(${v + 1})=${color[v]}`)
      }
    }
  }
  active = undefined
  emit(frames, 'done', `\\forall (u,v)\\in E:\\ color(u)\\ne color(v)`, { components, checked, bipartite: 1 }, { nodes: frames.at(-1)!.nodes, edges: frames.at(-1)!.edges, result: { bipartite: true, colors: [...color], cycle: [], edges: edges.map(e => [...e]), components } })
  return frames
}

export const classroomRemainingMissions: CourseMission[] = [
  { id: 'ppt-divide-max-subarray', chapter: 'divide', sources: ['classroom'], trace: v => freeze(maxSubarray(v)) },
  { id: 'ppt-dp-multistage-longest', chapter: 'dynamic', sources: ['classroom'], trace: v => freeze(dominoLongest(v)) },
  { id: 'ppt-graph-bipartite-color', chapter: 'graphs', sources: ['classroom'], trace: v => freeze(bipartite(v)) },
]
