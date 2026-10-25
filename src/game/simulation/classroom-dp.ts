import type { CourseMission, TraceFrame, TraceItem } from '../types'
import { record } from './trace'

const tile = (id: string, value: number | string, tone?: TraceItem['tone']): TraceItem => ({ id, value, tone })
const push = (frames: TraceFrame[], frame: TraceFrame) => record(frames, frame)

function lis(variant: 0 | 1): TraceFrame[] {
  const a = variant ? [7, 7, 3, 4, 4, 6, 2, 8] : [3, 5, 9, 5, 12, 8, 11, 1]
  const n = a.length, length = Array<number>(n).fill(0), previous = Array<number>(n).fill(-1), frames: TraceFrame[] = []
  const view = (active = -1, chosen: number[] = []): Pick<TraceFrame, 'items' | 'matrix' | 'output'> => ({
    items: a.map((x, i) => ({ ...tile(`a${i}`, x, chosen.includes(i) ? 'settled' : i === active ? 'active' : undefined), label: String(i + 1) })),
    matrix: { rows: ['A', 'L', 'π'], columns: a.map((_, i) => String(i + 1)), values: [a, length.map((x) => x || '·'), previous.map((x, i) => length[i] ? x < 0 ? '∅' : x + 1 : '·')], active: active < 0 ? undefined : [1, active], links: active < 0 || previous[active] < 0 ? [] : [{ from: [1, previous[active]], to: [1, active] }] },
    output: chosen.map((i) => tile(`selected-a${i}`, a[i]!, 'settled')),
  })
  push(frames, { op: 'start', formula: `L_i=1+\\max_{k<i,\\ A_k\\leq A_i}L_k;\\quad A=[${a.join(',')}]`, counters: { n }, ...view() })
  for (let i = 0; i < n; i++) {
    length[i] = 1
    for (let k = 0; k < i; k++) {
      const eligible = a[k]! <= a[i]!
      const candidate = eligible ? length[k]! + 1 : 0
      push(frames, { op: 'compare', formula: `A_{${k + 1}}=${a[k]} ${eligible ? '\\leq' : '>'} A_{${i + 1}}=${a[i]};\\quad ${eligible ? `L_{${k + 1}}+1=${candidate}` : '\\mathrm{ineligible}'}`, counters: { i: i + 1, k: k + 1, candidate, current: length[i]! }, ...view(i) })
      if (candidate > length[i]!) {
        length[i] = candidate
        previous[i] = k
        push(frames, { op: 'update', formula: `L_{${i + 1}}=${length[i]};\\quad \\pi_{${i + 1}}=${k + 1}`, counters: { i: i + 1, length: length[i]!, predecessor: k + 1 }, ...view(i) })
      }
    }
    push(frames, { op: 'select', formula: `L_{${i + 1}}=${length[i]};\\quad \\pi_{${i + 1}}=${previous[i] < 0 ? '\\varnothing' : previous[i] + 1}`, counters: { i: i + 1, length: length[i]! }, ...view(i) })
  }
  let end = 0
  for (let i = 1; i < n; i++) if (length[i]! > length[end]!) end = i
  const chosen: number[] = []
  for (let cur = end; cur >= 0; cur = previous[cur]!) {
    chosen.unshift(cur)
    push(frames, { op: 'visit', formula: `\\pi_{${cur + 1}}=${previous[cur] < 0 ? '\\varnothing' : previous[cur] + 1}`, counters: { recovering: cur + 1, selected: chosen.length }, ...view(cur, chosen) })
  }
  push(frames, { op: 'done', formula: `\\max_i L_i=${length[end]};\\quad ${chosen.map((i) => a[i]).join('\\leq')}`, counters: { length: length[end]!, end: end + 1 }, ...view(-1, chosen), result: { length: length[end]!, indices: chosen, values: chosen.map((i) => a[i]!) } })
  return frames
}

type Activity = { id: string; start: number; finish: number; weight: number }
function weightedInterval(variant: 0 | 1): TraceFrame[] {
  const input: Activity[] = variant
    ? [{ id: 'A', start: 0, finish: 2, weight: 5 }, { id: 'B', start: 1, finish: 3, weight: 6 }, { id: 'C', start: 2, finish: 5, weight: 6 }, { id: 'D', start: 3, finish: 5, weight: 5 }, { id: 'E', start: 5, finish: 7, weight: 4 }]
    : [{ id: 'A', start: 1, finish: 3, weight: 5 }, { id: 'B', start: 2, finish: 5, weight: 6 }, { id: 'C', start: 3, finish: 6, weight: 5 }, { id: 'D', start: 5, finish: 7, weight: 4 }, { id: 'E', start: 6, finish: 9, weight: 7 }, { id: 'F', start: 8, finish: 10, weight: 5 }]
  const a = [...input].sort((x, y) => x.finish - y.finish || x.start - y.start || x.id.localeCompare(y.id))
  const n = a.length, p = Array<number>(n + 1).fill(0), opt = Array<number>(n + 1).fill(0), take = Array<boolean>(n + 1).fill(false), frames: TraceFrame[] = []
  const view = (active = 0, chosen: number[] = [], activeSolved = true): Pick<TraceFrame, 'groups' | 'matrix' | 'output'> => ({
    groups: a.map((x, i) => ({ id: x.id, items: [tile(`${x.id}-start`, x.start), tile(`${x.id}-finish`, x.finish), tile(`${x.id}-weight`, x.weight, chosen.includes(i + 1) ? 'settled' : active === i + 1 ? 'active' : undefined)] })),
    matrix: { rows: ['f', 's', 'w', 'p', 'OPT'], columns: a.map((x) => x.id), values: [a.map((x) => x.finish), a.map((x) => x.start), a.map((x) => x.weight), p.slice(1).map((x, i) => i + 1 <= active ? x : '·'), opt.slice(1).map((x, i) => i + 1 < active ? x : i + 1 === active ? activeSolved ? x : '?' : '·')], active: active ? [4, active - 1] : undefined, links: active && p[active] ? [{ from: [4, p[active]! - 1], to: [4, active - 1] }] : [] },
    output: chosen.map((i) => tile(`picked-${a[i - 1]!.id}`, a[i - 1]!.id, 'settled')),
  })
  push(frames, { op: 'start', formula: 'OPT(0)=0;\\quad OPT(i)=\\max\\{OPT(i-1),w_i+OPT(p(i))\\}', counters: { n }, ...view() })
  for (let i = 1; i <= n; i++) {
    let lo = 1, hi = i - 1, best = 0
    while (lo <= hi) {
      const mid = (lo + hi) >> 1
      if (a[mid - 1]!.finish <= a[i - 1]!.start) { best = mid; lo = mid + 1 } else hi = mid - 1
    }
    p[i] = best
    const include = a[i - 1]!.weight + opt[best]!, exclude = opt[i - 1]!
    push(frames, { op: 'compare', formula: `p(${i})=${best};\\quad ${a[i - 1]!.weight}+OPT(${best})=${include}\\quad\\mathrm{vs}\\quad OPT(${i - 1})=${exclude}`, counters: { i, predecessor: best, include, exclude }, ...view(i, [], false) })
    take[i] = include > exclude
    opt[i] = take[i] ? include : exclude
    push(frames, { op: 'update', formula: `OPT(${i})=\\max\\{${exclude},${include}\\}=${opt[i]}`, counters: { i, best: opt[i]!, selected: Number(take[i]) }, ...view(i) })
  }
  const chosen: number[] = []
  for (let i = n; i > 0;) {
    if (take[i]) { chosen.unshift(i); push(frames, { op: 'select', formula: `OPT(${i})=w_${i}+OPT(${p[i]})`, counters: { recovering: i, selected: chosen.length }, ...view(n, chosen) }); i = p[i]! }
    else { push(frames, { op: 'reject', formula: `OPT(${i})=OPT(${i - 1})`, counters: { recovering: i, selected: chosen.length }, ...view(n, chosen) }); i-- }
  }
  push(frames, { op: 'done', formula: `OPT(${n})=${opt[n]}`, counters: { benefit: opt[n]!, selected: chosen.length }, ...view(n, chosen), result: { benefit: opt[n]!, ids: chosen.map((i) => a[i - 1]!.id) } })
  return frames
}

function rodCutting(variant: 0 | 1): TraceFrame[] {
  const price = variant ? [0, 2, 5, 6, 9, 10, 13] : [0, 1, 4, 5, 7, 8, 9]
  const n = price.length - 1, revenue = Array<number>(n + 1).fill(0), cut = Array<number>(n + 1).fill(0), frames: TraceFrame[] = []
  const view = (active = 0, pieces: number[] = [], candidateSplit?: number, focus = active): Pick<TraceFrame, 'items' | 'matrix' | 'output'> => ({
    items: price.slice(1).map((x, i) => ({ ...tile(`price-${i + 1}`, x, active === i + 1 ? 'active' : undefined), label: String(i + 1) })),
    matrix: { rows: ['p', 'R', 'C'], columns: price.slice(1).map((_, i) => String(i + 1)), values: [price.slice(1), revenue.slice(1).map((x, i) => i + 1 <= active ? x : '·'), cut.slice(1).map((x, i) => i + 1 <= active ? x : '·')], active: focus ? [1, focus - 1] : undefined, links: focus && (candidateSplit ?? cut[focus]) && (candidateSplit ?? cut[focus])! < focus ? [...new Set([(candidateSplit ?? cut[focus])! - 1, focus - (candidateSplit ?? cut[focus])! - 1])].map((source) => ({ from: [1, source] as [number, number], to: [1, focus - 1] as [number, number] })) : [] },
    output: pieces.map((x, i) => tile(`piece-${i}`, x, 'settled')),
  })
  push(frames, { op: 'start', formula: 'R(0)=0;\\quad R(k)=\\max\\{p_k,\\max_{1\\leq i\\leq\\lfloor k/2\\rfloor}(R(i)+R(k-i))\\}', counters: { n }, ...view() })
  for (let k = 1; k <= n; k++) {
    revenue[k] = price[k]!
    cut[k] = k
    push(frames, { op: 'update', formula: `R(${k})\\geq p_${k}=${price[k]}`, counters: { length: k, candidate: price[k]!, best: revenue[k]! }, ...view(k) })
    for (let i = 1; i <= Math.floor(k / 2); i++) {
      const candidate = revenue[i]! + revenue[k - i]!
      push(frames, { op: 'compare', formula: `R(${i})+R(${k - i})=${revenue[i]}+${revenue[k - i]}=${candidate}`, counters: { length: k, cut: i, candidate, best: revenue[k]! }, ...view(k, [], i) })
      if (candidate > revenue[k]!) { revenue[k] = candidate; cut[k] = i; push(frames, { op: 'update', formula: `R(${k})=${candidate};\\quad C(${k})=${i}`, counters: { length: k, cut: i, best: candidate }, ...view(k) }) }
    }
  }
  const pieces: number[] = []
  function recover(k: number): void {
    if (!k) return
    if (cut[k] === k) pieces.push(k)
    else { recover(cut[k]!); recover(k - cut[k]!) }
    push(frames, { op: 'select', formula: `C(${k})=${cut[k]};\\quad ${pieces.map((x) => `p_${x}`).join('+')}=${pieces.reduce((s, x) => s + price[x]!, 0)}`, counters: { recovering: k, pieces: pieces.length }, ...view(n, pieces, undefined, k) })
  }
  recover(n)
  push(frames, { op: 'done', formula: `R(${n})=${revenue[n]};\\quad ${pieces.map((x) => price[x]).join('+')}=${revenue[n]}`, counters: { revenue: revenue[n]!, pieces: pieces.length }, ...view(n, pieces), result: { revenue: revenue[n]!, pieces } })
  return frames
}

type Trade = { buy: number; sell: number; profit: number }
function market(variant: 0 | 1): TraceFrame[] {
  const buy = variant ? [10, 9, 8, 7, 6, 5] : [8, 6, 5, 2, 6, 4]
  const sell = variant ? [7, 6, 5, 4, 3, 2] : [3, 4, 5, 1, 3, 7]
  const frames: TraceFrame[] = [], n = buy.length
  const better = (a: Trade, b: Trade): Trade => b.profit > a.profit || b.profit === a.profit && (b.buy < a.buy || b.buy === a.buy && b.sell < a.sell) ? b : a
  const view = (lo: number, hi: number, active: number[] = [], trade?: Trade): Pick<TraceFrame, 'groups' | 'output'> => ({
    groups: buy.map((b, i) => ({ id: `market-${i}`, items: [tile(`buy-${i}`, b, active.includes(i) ? 'active' : undefined), tile(`sell-${i}`, sell[i]!, active.includes(i) ? 'active' : undefined)] })),
    output: trade ? [tile(`trade-buy-${trade.buy}`, trade.buy + 1, 'settled'), tile(`trade-sell-${trade.sell}`, trade.sell + 1, 'settled'), tile('profit', trade.profit, 'settled')] : [],
  })
  push(frames, { op: 'start', formula: `\\max_{1\\leq i\\leq j\\leq ${n}}(S_j-B_i)`, counters: { n }, ...view(0, n - 1) })
  function solve(lo: number, hi: number): Trade {
    if (lo === hi) { const base = { buy: lo, sell: lo, profit: sell[lo]! - buy[lo]! }; push(frames, { op: 'select', formula: `S_${lo + 1}-B_${lo + 1}=${sell[lo]}-${buy[lo]}=${base.profit}`, counters: { left: lo + 1, right: hi + 1, profit: base.profit }, ...view(lo, hi, [lo], base) }); return base }
    const mid = (lo + hi) >> 1
    push(frames, { op: 'split', formula: `[${lo + 1},${hi + 1}]\\to[${lo + 1},${mid + 1}],[${mid + 2},${hi + 1}]`, counters: { left: lo + 1, mid: mid + 1, right: hi + 1 }, ...view(lo, hi, [mid, mid + 1]) })
    const left = solve(lo, mid), right = solve(mid + 1, hi)
    let minBuy = lo, maxSell = mid + 1
    for (let i = lo + 1; i <= mid; i++) if (buy[i]! < buy[minBuy]!) minBuy = i
    for (let j = mid + 2; j <= hi; j++) if (sell[j]! > sell[maxSell]!) maxSell = j
    const cross = { buy: minBuy, sell: maxSell, profit: sell[maxSell]! - buy[minBuy]! }
    const answer = better(better(left, right), cross)
    push(frames, { op: 'merge', formula: `\\max\\{${left.profit},${right.profit},S_${maxSell + 1}-B_${minBuy + 1}=${sell[maxSell]}-${buy[minBuy]}=${cross.profit}\\}=${answer.profit}`, counters: { left: left.profit, right: right.profit, cross: cross.profit, profit: answer.profit }, ...view(lo, hi, [minBuy, maxSell], answer) })
    return answer
  }
  const best = solve(0, n - 1)
  push(frames, { op: 'done', formula: `S_${best.sell + 1}-B_${best.buy + 1}=${sell[best.sell]}-${buy[best.buy]}=${best.profit}`, counters: { profit: best.profit, buy: best.buy + 1, sell: best.sell + 1 }, ...view(0, n - 1, [best.buy, best.sell], best), result: { profit: best.profit, buy: best.buy, sell: best.sell } })
  return frames
}

export const classroomDpMissions: CourseMission[] = [
  { id: 'ppt-dp-lis', chapter: 'dynamic', sources: ['classroom'], trace: lis },
  { id: 'ppt-dp-weighted-interval', chapter: 'dynamic', sources: ['classroom'], trace: weightedInterval },
  { id: 'ppt-dp-rod-cutting', chapter: 'dynamic', sources: ['classroom'], trace: rodCutting },
  { id: 'ppt-divide-market', chapter: 'divide', sources: ['classroom'], trace: market },
]
