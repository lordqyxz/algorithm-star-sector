import type { CourseMission, TraceFrame, TraceItem } from '../types'
import { record } from './trace'

const it = (
  id: string,
  value: string | number,
  tone?: TraceItem['tone'],
): TraceItem => ({ id, value, tone })
const frame = (
  op: TraceFrame['op'],
  formula: string,
  counters: TraceFrame['counters'],
  extra: Omit<TraceFrame, 'op' | 'formula' | 'counters'> = {},
): TraceFrame => ({ op, formula, counters, ...extra })
const snap = (frames: TraceFrame[], f: TraceFrame) => record(frames, f)
const mission = (
  id: string,
  sources: CourseMission['sources'],
  trace: CourseMission['trace'],
): CourseMission => ({ id, chapter: 'optimization', sources, trace })

function setCover(v: 0 | 1): TraceFrame[] {
  const sets = v
      ? [
          [0, 1, 3],
          [1, 2],
          [2, 3, 4],
          [0, 4],
        ]
      : [
          [0, 1, 2],
          [2, 3],
          [3, 4, 5],
          [0, 4, 5],
        ],
    universe = v ? 5 : 6
  const f: TraceFrame[] = [],
    left = new Set(Array.from({ length: universe }, (_, i) => i)),
    chosen: number[] = []
  let steps = 0
  snap(
    f,
    frame(
      'start',
      `choose the set covering most uncovered elements; U={0…${universe - 1}}`,
      { uncovered: universe },
      {
        groups: sets.map((s, i) => ({
          id: `S${i}`,
          items: s.map((x) => it(`S${i}e${x}`, x)),
        })),
      },
    ),
  )
  while (left.size) {
    const scores = sets
        .map((s, i) => ({ i, n: s.filter((x) => left.has(x)).length }))
        .sort((a, b) => b.n - a.n || a.i - b.i),
      pick = scores[0]!
    if (!pick.n) break
    chosen.push(pick.i)
    steps++
    for (const x of sets[pick.i]!) left.delete(x)
    snap(
      f,
      frame(
        'select',
        `pick S${pick.i}: ${pick.n} newly covered; remaining=${left.size}`,
        {
          steps,
          uncovered: left.size,
          selected: chosen.length,
        },
        {
          groups: sets.map((s, i) => ({
            id: `S${i}`,
            items: s.map((x) =>
              it(
                `S${i}e${x}`,
                x,
                chosen.includes(i)
                  ? 'settled'
                  : left.has(x)
                    ? undefined
                    : 'muted',
              ),
            ),
          })),
          output: chosen.map((i) => it(`chosen${i}`, `S${i}`, 'settled')),
        },
      ),
    )
  }
  snap(
    f,
    frame(
      'done',
      `cover size=${chosen.length}; greedy ≤ H(d)·OPT, d=${Math.max(...sets.map((s) => s.length))}`,
      {
        sets: chosen.length,
        uncovered: left.size,
        maximumSetSize: Math.max(...sets.map((s) => s.length)),
      },
      { output: chosen.map((i) => it(`final${i}`, `S${i}`, 'settled')) },
    ),
  )
  return f
}

function subsetFptas(v: 0 | 1): TraceFrame[] {
  const a = v ? [8, 7, 6, 5, 4] : [8, 7, 5, 4, 3],
    target = v ? 15 : 14,
    eps = 0.25,
    f: TraceFrame[] = []
  let list = [0],
    trims = 0
  snap(
    f,
    frame(
      'start',
      `subset sum ≤ ${target}; ε=${eps}; retain sorted sums after trimming`,
      { items: a.length, epsilon: eps, states: 1 },
      { items: a.map((x, i) => it(`a${i}`, x)) },
    ),
  )
  for (let i = 0; i < a.length; i++) {
    const merged = [
        ...list,
        ...list.map((x) => x + a[i]!).filter((x) => x <= target),
      ].sort((x, y) => x - y),
      delta = eps / (2 * a.length),
      kept: number[] = []
    for (const x of merged)
      if (!kept.length || x > kept.at(-1)! * (1 + delta)) {
        kept.push(x)
      } else trims++
    list = kept
    snap(
      f,
      frame(
        'update',
        `add ${a[i]}; trim sums within factor 1+ε/(2n)=${(1 + delta).toFixed(3)}`,
        { item: i + 1, states: list.length, trims, largest: list.at(-1) ?? 0 },
        {
          items: list.map((x, j) => it(`sum${j}`, x)),
          output: [it('best', list.at(-1) ?? 0, 'settled')],
        },
      ),
    )
  }
  snap(
    f,
    frame(
      'done',
      `best=${list.at(-1) ?? 0} ≤ target; value ≥ (1−ε)·OPT (trimmed-list FPTAS)`,
      {
        best: list.at(-1) ?? 0,
        target,
        epsilon: eps,
        states: list.length,
        trims,
      },
      { output: [it('answer', list.at(-1) ?? 0, 'settled')] },
    ),
  )
  return f
}

function vertexCover(v: 0 | 1): TraceFrame[] {
  const edges = v
      ? [
          [0, 1],
          [1, 2],
          [2, 3],
          [3, 4],
          [4, 0],
          [1, 4],
        ]
      : [
          [0, 1],
          [1, 2],
          [2, 3],
          [3, 0],
          [0, 2],
        ],
    n = v ? 5 : 4,
    f: TraceFrame[] = [],
    uncovered = edges.map((_, i) => i),
    cover = new Set<number>()
  let rounds = 0
  snap(
    f,
    frame(
      'start',
      'take any uncovered edge (u,v), add both endpoints; matching edges are disjoint',
      { edges: edges.length, cover: 0, matching: 0 },
      {
        nodes: Array.from({ length: n }, (_, i) => ({
          id: `v${i}`,
          value: `v${i}`,
          x: 0.15 + (i % 3) * 0.34,
          y: 0.2 + Math.floor(i / 3) * 0.5,
        })),
        edges: edges.map(([a, b]) => ({ from: `v${a}`, to: `v${b}` })),
      },
    ),
  )
  while (uncovered.length) {
    const ei = uncovered.shift()!,
      [a, b] = edges[ei]!
    rounds++
    cover.add(a)
    cover.add(b)
    const gone = uncovered.filter(
      (j) => edges[j]!.includes(a) || edges[j]!.includes(b),
    )
    for (const j of gone) uncovered.splice(uncovered.indexOf(j), 1)
    snap(
      f,
      frame(
        'select',
        `matched edge e${ei}=(${a},${b}); add both endpoints and remove incident edges`,
        {
          rounds,
          matching: rounds,
          cover: cover.size,
          uncovered: uncovered.length,
        },
        {
          nodes: Array.from({ length: n }, (_, i) => ({
            id: `v${i}`,
            value: `v${i}`,
            x: 0.15 + (i % 3) * 0.34,
            y: 0.2 + Math.floor(i / 3) * 0.5,
            tone: cover.has(i) ? 'settled' : undefined,
          })),
          edges: edges.map(([x, y], j) => ({
            from: `v${x}`,
            to: `v${y}`,
            tone: uncovered.includes(j) ? undefined : 'muted',
          })),
        },
      ),
    )
  }
  snap(
    f,
    frame(
      'done',
      `cover=${cover.size}; maximal matching size=${rounds}; |C|=2|M| ≤ 2·OPT`,
      { cover: cover.size, matching: rounds, uncovered: 0 },
      { output: [...cover].map((x) => it(`v${x}`, `v${x}`, 'settled')) },
    ),
  )
  return f
}

function tsp(v: 0 | 1): TraceFrame[] {
  const points = v
    ? [
        [0, 0],
        [3, 0],
        [4, 3],
        [0, 4],
        [2, 2],
      ]
    : [
        [0, 0],
        [3, 0],
        [4, 3],
        [0, 4],
      ]
  const n = points.length
  const d = points.map(([x1, y1]) =>
    points.map(([x2, y2]) => Math.hypot(x1 - x2, y1 - y2)),
  )
  const f: TraceFrame[] = [],
    used = new Set([0]),
    tree: number[][] = Array.from({ length: n }, () => [])
  let cost = 0
  snap(
    f,
    frame(
      'start',
      'Euclidean distances are symmetric and satisfy triangle inequality; build an MST',
      { cities: n, mstEdges: 0, mstCost: 0 },
      {
        matrix: {
          rows: Array.from({ length: n }, (_, i) => `c${i}`),
          columns: Array.from({ length: n }, (_, i) => `c${i}`),
          values: d,
        },
      },
    ),
  )
  while (used.size < n) {
    let best: { a: number; b: number; w: number } | undefined
    for (const a of used)
      for (let b = 0; b < n; b++)
        if (!used.has(b) && (!best || d[a]![b]! < best.w))
          best = { a, b, w: d[a]![b]! }
    if (!best) break
    used.add(best.b)
    tree[best.a]!.push(best.b)
    tree[best.b]!.push(best.a)
    cost += best.w
    snap(
      f,
      frame(
        'insert',
        `MST edge c${best.a}—c${best.b} has weight ${best.w.toFixed(2)}`,
        { mstEdges: used.size - 1, mstCost: cost },
        {
          nodes: Array.from({ length: n }, (_, i) => ({
            id: `c${i}`,
            value: `c${i}`,
            x: 0.12 + (i % 3) * 0.35,
            y: 0.2 + Math.floor(i / 3) * 0.5,
            tone: used.has(i) ? 'settled' : undefined,
          })),
          edges: tree.flatMap((ns, a) =>
            ns
              .filter((b) => a < b)
              .map((b) => ({ from: `c${a}`, to: `c${b}`, weight: d[a]![b]! })),
          ),
        },
      ),
    )
  }
  const order: number[] = []
  function walk(u: number, p: number) {
    order.push(u)
    for (const w of tree[u]!) if (w !== p) walk(w, u)
  }
  walk(0, -1)
  order.push(0)
  const tourCost = order.slice(1).reduce((s, x, i) => s + d[order[i]!]![x]!, 0)
  snap(
    f,
    frame(
      'done',
      `preorder tour costs ${tourCost.toFixed(2)}; shortcut repeats by triangle inequality; ≤2·OPT`,
      { mstCost: cost, tourCost, ratio: tourCost / cost, cities: n },
      {
        output: order.map((x, i) =>
          it(
            `tour${i}`,
            `c${x}`,
            i === order.length - 1 ? 'settled' : undefined,
          ),
        ),
      },
    ),
  )
  return f
}

function knapsack(v: 0 | 1): TraceFrame[] {
  const items = v
      ? [
          { w: 3, p: 8 },
          { w: 4, p: 9 },
          { w: 5, p: 11 },
          { w: 2, p: 5 },
        ]
      : [
          { w: 2, p: 6 },
          { w: 3, p: 7 },
          { w: 4, p: 9 },
          { w: 5, p: 10 },
        ],
    cap = v ? 8 : 7,
    eps = 0.25,
    n = items.length,
    K = (eps * Math.max(...items.map((x) => x.p))) / n,
    scaled = items.map((x) => Math.floor(x.p / K)),
    limit = scaled.reduce((a, b) => a + b, 0),
    dp = Array(limit + 1).fill(Infinity)
  dp[0] = 0
  const f: TraceFrame[] = [],
    stages: number[][] = [dp.slice()]
  snap(
    f,
    frame(
      'start',
      `profit scale K=ε·Pmax/n=${K.toFixed(2)}; DP[scaled profit]=minimum weight`,
      { capacity: cap, epsilon: eps, scale: K, profitStates: limit + 1 },
      { items: items.map((x, i) => it(`i${i}`, `w${x.w},p${x.p}`)) },
    ),
  )
  items.forEach((item, i) => {
    for (let p = limit; p >= scaled[i]!; p--)
      dp[p] = Math.min(dp[p]!, dp[p - scaled[i]!]! + item.w)
    stages.push(dp.slice())
    const best = dp.reduce((z, w, p) => (w <= cap ? p : z), 0)
    const width = 10
    const rowCount = Math.ceil(dp.length / width)
    const matrix = {
      rows: Array.from({ length: rowCount }, (_, row) => {
        const first = row * width
        return `p${first}–${Math.min(first + width - 1, limit)}`
      }),
      columns: Array.from({ length: width }, (_, column) => `p+${column}`),
      values: Array.from({ length: rowCount }, (_, row) =>
        Array.from({ length: width }, (_, column) => {
          const value = dp[row * width + column]
          return value === undefined
            ? '—'
            : Number.isFinite(value)
              ? value
              : '∞'
        }),
      ),
    }
    snap(
      f,
      frame(
        'update',
        `item ${i}: update DP backward so it is used at most once`,
        {
          items: i + 1,
          reachable: dp.filter((x) => Number.isFinite(x)).length,
          bestScaledProfit: best,
          bestWeight: dp[best]!,
          profitStates: dp.length,
        },
        { matrix },
      ),
    )
  })
  let p = dp.reduce((z, w, i) => (w <= cap ? i : z), 0),
    remain = cap,
    chosen: number[] = []
  for (let i = n; i > 0; i--) {
    if (
      stages[i]![p] !== stages[i - 1]![p] &&
      p >= scaled[i - 1]! &&
      stages[i - 1]![p - scaled[i - 1]!]! + items[i - 1]!.w === stages[i]![p]
    ) {
      chosen.push(i - 1)
      remain -= items[i - 1]!.w
      p -= scaled[i - 1]!
    }
  }
  const profit = chosen.reduce((s, i) => s + items[i]!.p, 0)
  snap(
    f,
    frame(
      'done',
      `chosen profit=${profit}, weight=${cap - remain}; ≥(1−ε)·OPT for 0/1 knapsack`,
      { profit, weight: cap - remain, capacity: cap, epsilon: eps, scale: K },
      {
        output: chosen.map((i) =>
          it(`i${i}`, `w${items[i]!.w},p${items[i]!.p}`, 'settled'),
        ),
      },
    ),
  )
  return f
}

function tabu(v: 0 | 1): TraceFrame[] {
  const f: TraceFrame[] = [],
    values = Array.from({ length: v ? 5 : 4 }, (_, i) => i),
    tabuList: number[] = []
  let x = 0,
    best = 0,
    iterations = 0
  const score = (z: number) => Math.abs(z - (v ? 3 : 2))
  snap(
    f,
    frame(
      'start',
      `minimize f(x)=|x−${v ? 3 : 2}| on integer states; tabu tenure=2`,
      { state: x, best, score: score(x), iteration: 0 },
      { items: values.map((z) => it(`x${z}`, z)) },
    ),
  )
  for (let k = 1; k <= 4; k++) {
    const candidates = [x - 1, x + 1].filter(
      (z) => z >= 0 && z < values.length && !tabuList.includes(z),
    )
    if (candidates.length === 0) break
    const next = candidates.sort((a, b) => score(a) - score(b))[0]!
    tabuList.push(x)
    if (tabuList.length > 2) tabuList.shift()
    x = next
    iterations = k
    if (score(x) < score(best)) best = x
    snap(
      f,
      frame(
        'update',
        `iteration ${k}: choose best admissible neighbor; tabu=${tabuList.join(',') || '∅'}`,
        {
          iteration: k,
          state: x,
          score: score(x),
          best,
          bestScore: score(best),
          tabu: tabuList.join(','),
        },
        {
          items: values.map((z, i) =>
            it(
              `x${z}`,
              z,
              i === x ? 'active' : i === best ? 'settled' : undefined,
            ),
          ),
        },
      ),
    )
  }
  snap(
    f,
    frame(
      'done',
      `best seen x=${best}, f=${score(best)}; tabu search has no global-optimum guarantee`,
      { state: x, best, bestScore: score(best), iterations },
      { output: [it('best', best, 'settled')] },
    ),
  )
  return f
}

function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (1664525 * s + 1013904223) >>> 0
    return s / 4294967296
  }
}
function anneal(v: 0 | 1): TraceFrame[] {
  const f: TraceFrame[] = [],
    rand = rng(v ? 91 : 37),
    path = v ? [0, 2, 4, 6, 8] : [0, 1, 2, 3, 4],
    seed = v ? 91 : 37
  const target = v ? 6 : 3,
    energy = (index: number) => Math.abs(path[index]! - target)
  let x = 0,
    best = x,
    temperature = 4
  snap(
    f,
    frame(
      'start',
      `energy E(x)=|x−${target}|; accept uphill Δ with probability exp(−Δ/T); seed=${seed}`,
      { seed, state: path[x]!, energy: energy(x), temperature },
      { items: path.map((z, i) => it(`s${i}`, z)) },
    ),
  )
  for (let k = 1; k <= 6; k++) {
    const previous = x
    const candidate = Math.max(
      0,
      Math.min(path.length - 1, x + (rand() < 0.5 ? -1 : 1)),
    )
    const delta = energy(candidate) - energy(x),
      probability = delta <= 0 ? 1 : Math.exp(-delta / temperature),
      draw = rand(),
      accept = draw < probability
    if (accept) x = candidate
    if (energy(x) < energy(best)) best = x
    snap(
      f,
      frame(
        accept ? 'update' : 'reject',
        `T=${temperature.toFixed(2)} Δ=${delta}; u=${draw.toFixed(2)} ${accept ? '<' : '≥'} exp(−Δ/T)=${probability.toFixed(2)}`,
        {
          iteration: k,
          previousState: path[previous]!,
          state: path[x]!,
          energy: energy(x),
          candidate: path[candidate]!,
          delta,
          temperature,
          probability,
          draw,
          best: path[best]!,
        },
        {
          items: path.map((z, i) =>
            it(
              `s${i}`,
              z,
              i === x ? 'active' : i === best ? 'settled' : undefined,
            ),
          ),
        },
      ),
    )
    temperature *= 0.65
  }
  snap(
    f,
    frame(
      'done',
      `best visited state=${path[best]}, energy=${energy(best)}; cooling schedule is a heuristic, not a proof`,
      { seed, best: path[best]!, bestEnergy: energy(best), iterations: 6 },
      { output: [it('best', path[best]!, 'settled')] },
    ),
  )
  return f
}

function genetic(v: 0 | 1): TraceFrame[] {
  const seed = v ? 23 : 17,
    r = rng(seed),
    f: TraceFrame[] = [],
    target = v ? '11010' : '10110',
    fitness = (s: string) => [...s].filter((c, i) => c === target[i]).length
  let pop = v
    ? ['00000', '11111', '10001', '01110']
    : ['00000', '11111', '10101', '01010']
  snap(
    f,
    frame(
      'start',
      `maximize bit matches to target ${target}; fixed seed=${seed}; feasible encoding: 5-bit strings`,
      { seed, generation: 0, best: Math.max(...pop.map(fitness)) },
      { groups: pop.map((s, i) => ({ id: `p${i}`, items: [it(`g${i}`, s)] })) },
    ),
  )
  for (let g = 1; g <= 3; g++) {
    const ranked = [...pop].sort((a, b) => fitness(b) - fitness(a)),
      a = ranked[0]!,
      b = ranked[1]!,
      cut = 1 + Math.floor(r() * 4)
    let child = a.slice(0, cut) + b.slice(cut)
    const pos = Math.floor(r() * 5)
    child =
      child.slice(0, pos) +
      (child[pos] === '1' ? '0' : '1') +
      child.slice(pos + 1)
    pop = [a, b, child, ranked[2]!]
    snap(
      f,
      frame(
        'update',
        `generation ${g}: select top two; crossover at ${cut}; mutate bit ${pos}`,
        {
          seed,
          generation: g,
          crossover: cut,
          mutation: pos,
          best: Math.max(...pop.map(fitness)),
          childFitness: fitness(child),
        },
        {
          groups: pop.map((s, i) => ({
            id: `p${i}`,
            items: [it(`g${g}-${i}`, s, i === 2 ? 'active' : undefined)],
          })),
        },
      ),
    )
  }
  const best = [...pop].sort((a, b) => fitness(b) - fitness(a))[0]!
  snap(
    f,
    frame(
      'done',
      `best=${best}; fitness=${fitness(best)}/5; finite seeded run does not guarantee global optimum`,
      { seed, bestFitness: fitness(best), population: pop.length },
      { output: [it('best', best, 'settled')] },
    ),
  )
  return f
}

function perceptron(v: 0 | 1): TraceFrame[] {
  const data = v
      ? [
          [0, 0, 0],
          [0, 1, 1],
          [1, 0, 1],
          [1, 1, 1],
        ]
      : [
          [0, 0, 0],
          [0, 1, 0],
          [1, 0, 0],
          [1, 1, 1],
        ],
    f: TraceFrame[] = [],
    weights = [0, 0],
    rate = 0.2
  let bias = 0
  const sigmoid = (z: number) => 1 / (1 + Math.exp(-z))
  const loss = () =>
    data.reduce((s, [x, y, t]) => {
      const p = sigmoid(weights[0] * x + weights[1] * y + bias)
      return s + (p - t) ** 2 / 2
    }, 0) / data.length
  snap(
    f,
    frame(
      'start',
      `one sigmoid neuron: p=σ(w₁x₁+w₂x₂+b); squared error; learning rate=${rate}`,
      { epoch: 0, loss: loss(), w1: weights[0], w2: weights[1], bias },
      { items: data.map((d, i) => it(`d${i}`, `${d[0]},${d[1]}→${d[2]}`)) },
    ),
  )
  for (let e = 1; e <= 30; e++) {
    let gw = [0, 0],
      gb = 0
    for (const [x, y, t] of data) {
      const p = sigmoid(weights[0] * x + weights[1] * y + bias),
        err = p - t,
        d = err * p * (1 - p)
      gw[0] += d * x
      gw[1] += d * y
      gb += d
    }
    weights[0] -= (rate * gw[0]) / data.length
    weights[1] -= (rate * gw[1]) / data.length
    bias -= (rate * gb) / data.length
    if (e % 5 === 0)
      snap(
        f,
        frame(
          'update',
          `epoch ${e}: ∇w = mean[(p−y)p(1−p)x]; w ← w−η∇w`,
          {
            epoch: e,
            loss: loss(),
            w1: weights[0],
            w2: weights[1],
            bias,
            learningRate: rate,
          },
          {
            items: data.map((d, i) => {
              const p = sigmoid(weights[0] * d[0] + weights[1] * d[1] + bias)
              return it(`d${i}`, `${p.toFixed(2)} / ${d[2]}`)
            }),
          },
        ),
      )
  }
  snap(
    f,
    frame(
      'done',
      `final mean half squared error=${loss().toFixed(4)}; gradient descent lowers training loss, not a universal guarantee`,
      { epoch: 30, loss: loss(), w1: weights[0], w2: weights[1], bias },
      { output: weights.map((w, i) => it(`w${i}`, w.toFixed(3), 'settled')) },
    ),
  )
  return f
}

export const optimizationMissions: CourseMission[] = [
  mission('approx-set-cover-greedy', ['advanced'], setCover),
  mission('approx-subset-sum-fptas', ['advanced'], subsetFptas),
  mission('approx-vertex-cover-matching', ['advanced'], vertexCover),
  mission('approx-metric-tsp-mst', ['advanced'], tsp),
  mission('approx-knapsack-fptas', ['advanced'], knapsack),
  mission('heuristic-tabu-search', ['advanced'], tabu),
  mission('heuristic-simulated-annealing', ['advanced'], anneal),
  mission('heuristic-genetic-algorithm', ['advanced'], genetic),
  mission('neural-perceptron-gradient', ['ai', 'design'], perceptron),
]
