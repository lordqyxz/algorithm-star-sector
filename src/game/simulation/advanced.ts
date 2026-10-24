import type { CourseMission, TraceFrame } from '../types'
import { record } from './trace'

type Item = {
  id: string
  value: string | number
  label?: string
  tone?: 'active' | 'settled' | 'muted' | 'red' | 'black'
}
const it = (id: string, value: string | number, tone?: Item['tone']): Item => ({
  id,
  value,
  tone,
})
const base = (
  op: TraceFrame['op'],
  formula: string,
  counters: TraceFrame['counters'],
): TraceFrame => ({ op, formula, counters })
const pack = (
  id: string,
  chapter: string,
  sources: CourseMission['sources'],
  make: (v: 0 | 1) => TraceFrame[],
): CourseMission => ({
  id,
  chapter,
  sources: [
    'advanced-backtracking-knapsack',
    'advanced-n-queens',
    'advanced-bb-knapsack',
    'advanced-bb-tsp',
  ].includes(id)
    ? [...sources, 'ai']
    : sources,
  trace: make,
})

function subset(v: 0 | 1): TraceFrame[] {
  const a = v ? [2, 4, 5, 7] : [3, 4, 5, 8],
    target = v ? 11 : 9,
    frames: TraceFrame[] = []
  const stack: { i: number; sum: number; chosen: number[] }[] = [
    { i: 0, sum: 0, chosen: [] },
  ]
  let calls = 0,
    pruned = 0,
    answer: number[] = []
  record(frames, {
    ...base('start', `subset-sum: target=${target}; choose or skip each item`, {
      calls,
      pruned,
    }),
    items: a.map((x, i) => ({ id: `w${i}`, value: x, label: `w${i}` })),
  })
  while (stack.length && !answer.length) {
    const s = stack.pop()!
    calls++
    if (s.sum === target) {
      answer = s.chosen
      record(frames, {
        ...base('done', `${s.chosen.map((i) => a[i]).join('+')}=${target}`, {
          calls,
          pruned,
        }),
        output: s.chosen.map((i) => it(`w${i}`, a[i], 'settled')),
      })
      break
    }
    if (
      s.i === a.length ||
      s.sum > target ||
      s.sum + a.slice(s.i).reduce((x, y) => x + y, 0) < target
    ) {
      pruned++
      record(frames, {
        ...base(
          'reject',
          `sum=${s.sum}; remaining upper bound=${s.sum + a.slice(s.i).reduce((x, y) => x + y, 0)}`,
          { calls, pruned },
        ),
        items: [
          {
            id: 'partial',
            value: s.chosen.map((i) => a[i]).join('+') || '∅',
            tone: 'muted',
          },
        ],
      })
      continue
    }
    const i = s.i
    stack.push(
      { i: i + 1, sum: s.sum, chosen: s.chosen },
      { i: i + 1, sum: s.sum + a[i], chosen: [...s.chosen, i] },
    )
    record(frames, {
      ...base(
        'split',
        `branch w${i}=${a[i]}: include (sum=${s.sum + a[i]}) / exclude (sum=${s.sum})`,
        { calls, pruned },
      ),
      items: a.map((x, j) => ({
        id: `w${j}`,
        value: x,
        tone: j === i ? 'active' : s.chosen.includes(j) ? 'settled' : undefined,
      })),
    })
  }
  return frames
}

function backtrackingKnapsack(v: 0 | 1): TraceFrame[] {
  const w = v ? [2, 3, 4, 5] : [2, 3, 4, 6],
    p = v ? [6, 8, 9, 10] : [4, 5, 8, 9],
    cap = v ? 8 : 7,
    frames: TraceFrame[] = []
  let calls = 0,
    pruned = 0,
    best = 0
  const picked: number[] = []
  record(frames, {
    ...base(
      'start',
      `DFS include/exclude by item; capacity=${cap}; prune only overweight partial choices (no relaxation bound)`,
      { calls, pruned, best },
    ),
    items: w.map((x, i) => ({
      id: `item${i}`,
      value: `weight ${x}, value ${p[i]}`,
    })),
  })
  function visit(i: number, weight: number, value: number) {
    calls++
    if (weight > cap) {
      pruned++
      record(frames, {
        ...base(
          'reject',
          `partial weight ${weight} exceeds capacity ${cap}; descendants cannot become feasible`,
          { calls, pruned, best },
        ),
        output: [it('partial-weight', weight, 'red')],
      })
      return
    }
    if (i === w.length) {
      if (value > best) {
        best = value
        record(frames, {
          ...base(
            'update',
            `feasible leaf value ${value} improves incumbent ${best}`,
            { calls, pruned, best },
          ),
          output: picked.map((j) =>
            it(`item${j}`, `w${w[j]} v${p[j]}`, 'settled'),
          ),
        })
      }
      return
    }
    record(frames, {
      ...base('split', `item ${i}: DFS explores include then exclude`, {
        calls,
        pruned,
        best,
      }),
      items: w.map((x, j) => ({
        id: `item${j}`,
        value: `w${x} v${p[j]}`,
        tone: j === i ? 'active' : picked.includes(j) ? 'settled' : undefined,
      })),
    })
    picked.push(i)
    visit(i + 1, weight + w[i], value + p[i])
    picked.pop()
    visit(i + 1, weight, value)
  }
  visit(0, 0, 0)
  record(frames, {
    ...base(
      'done',
      `best feasible leaf value=${best}; explored ${calls} recursive calls and pruned overweight branches`,
      { calls, pruned, best },
    ),
    output: [it('best', best, 'settled')],
  })
  return frames
}

function queens(v: 0 | 1): TraceFrame[] {
  const n = v ? 5 : 4,
    frames: TraceFrame[] = [],
    cols: number[] = []
  let tried = 0,
    backtracks = 0
  record(frames, {
    ...base(
      'start',
      `place one queen per row; reject shared columns or diagonals`,
      { tried, backtracks },
    ),
    matrix: {
      rows: Array.from({ length: n }, (_, i) => `r${i}`),
      columns: Array.from({ length: n }, (_, i) => `c${i}`),
      values: Array.from({ length: n }, () => Array(n).fill('·')),
    },
  })
  function visit(r: number): boolean {
    if (r === n) return true
    for (let c = 0; c < n; c++) {
      tried++
      const safe = cols.every(
        (old, rr) => old !== c && Math.abs(old - c) !== r - rr,
      )
      record(frames, {
        ...base(
          safe ? 'select' : 'reject',
          `row ${r}, col ${c}: ${safe ? 'no column/diagonal conflict' : 'attacked by an earlier queen'}`,
          { tried, backtracks },
        ),
        matrix: {
          rows: Array.from({ length: n }, (_, i) => `r${i}`),
          columns: Array.from({ length: n }, (_, i) => `c${i}`),
          values: Array.from({ length: n }, (_, rr) =>
            Array.from({ length: n }, (_, cc) =>
              cols[rr] === cc
                ? 'Q'
                : rr === r && cc === c
                  ? safe
                    ? 'Q?'
                    : '×'
                  : '·',
            ),
          ),
          active: [r, c],
        },
      })
      if (!safe) continue
      cols.push(c)
      if (visit(r + 1)) return true
      cols.pop()
      backtracks++
      record(frames, {
        ...base('remove', `row ${r - 1} choice removed; resume row ${r}`, {
          tried,
          backtracks,
        }),
        output: cols.map((x, rr) => it(`q${rr}`, `r${rr}c${x}`)),
      })
    }
    return false
  }
  visit(0)
  record(frames, {
    ...base('done', `solution columns by row = [${cols.join(', ')}]`, {
      tried,
      backtracks,
    }),
    output: cols.map((c, r) => it(`q${r}`, `r${r}c${c}`, 'settled')),
  })
  return frames
}

function coloring(v: 0 | 1): TraceFrame[] {
  const edges = v
      ? [
          [0, 1],
          [1, 2],
          [2, 3],
          [3, 0],
          [0, 2],
        ]
      : [
          [0, 1],
          [1, 2],
          [2, 0],
          [2, 3],
        ],
    colors = 3,
    assignment: number[] = [],
    frames: TraceFrame[] = []
  let tried = 0,
    rejected = 0
  const graph = (active = -1, candidate = -1) => ({
    nodes: Array.from({ length: 4 }, (_, i) => ({
      id: `v${i}`,
      value:
        i === active && candidate >= 0
          ? `try ${candidate}`
          : assignment[i] === undefined
            ? '?'
            : String(assignment[i]),
      x: i % 2,
      y: Math.floor(i / 2),
      tone:
        i === active
          ? ('active' as const)
          : assignment[i] === undefined
            ? undefined
            : ('settled' as const),
    })),
    edges: edges.map(([a, b]) => ({
      from: `v${a}`,
      to: `v${b}`,
      tone:
        assignment[a] !== undefined &&
        assignment[b] !== undefined &&
        assignment[a] === assignment[b]
          ? ('red' as const)
          : undefined,
    })),
  })
  record(frames, {
    ...base('start', `${colors}-coloring: adjacent vertices must differ`, {
      tried,
      rejected,
    }),
    ...graph(),
  })
  function visit(u: number): boolean {
    if (u === 4) return true
    for (let c = 0; c < colors; c++) {
      tried++
      const conflict = edges.some(
        ([a, b]) =>
          (a === u && assignment[b] === c) || (b === u && assignment[a] === c),
      )
      if (conflict) {
        rejected++
        record(frames, {
          ...base(
            'reject',
            `color ${c} at v${u} matches an already colored neighbor`,
            { tried, rejected },
          ),
          ...graph(u, c),
        })
        continue
      }
      assignment[u] = c
      record(frames, {
        ...base(
          'select',
          `assign v${u} → color ${c}; check its incident edges`,
          { tried, rejected },
        ),
        ...graph(u),
      })
      if (visit(u + 1)) return true
      assignment.pop()
      record(frames, {
        ...base(
          'remove',
          `color ${c} at v${u} leads to a dead end; undo this choice`,
          { tried, rejected },
        ),
        ...graph(u),
      })
    }
    return false
  }
  visit(0)
  record(frames, {
    ...base('done', `proper coloring found; every edge has unlike endpoints`, {
      tried,
      rejected,
    }),
    ...graph(),
    output: assignment.map((c, i) => it(`v${i}`, `color ${c}`, 'settled')),
  })
  return frames
}

function tspBacktrack(v: 0 | 1): TraceFrame[] {
  const m = v
      ? [
          [0, 3, 8, 5],
          [3, 0, 4, 7],
          [8, 4, 0, 2],
          [5, 7, 2, 0],
        ]
      : [
          [0, 2, 9, 6],
          [2, 0, 4, 7],
          [9, 4, 0, 3],
          [6, 7, 3, 0],
        ],
    n = 4,
    frames: TraceFrame[] = []
  let best = Infinity,
    explored = 0
  const path = [0],
    used = new Set([0])
  record(frames, {
    ...base(
      'start',
      'enumerate Hamiltonian tours; retain the cheapest complete cycle',
      { explored, best: 0 },
    ),
    matrix: {
      rows: ['A', 'B', 'C', 'D'],
      columns: ['A', 'B', 'C', 'D'],
      values: m,
    },
  })
  function go(cost: number) {
    if (path.length === n) {
      explored++
      const total = cost + m[path[n - 1]][0]
      if (total < best) best = total
      record(frames, {
        ...base(
          'update',
          `tour ${path.map((x) => 'ABCD'[x]).join('→')}→A costs ${total}; best=${best}`,
          { explored, best },
        ),
        output: path.map((x, i) =>
          it(
            `city${x}`,
            'ABCD'[x],
            i === path.length - 1 ? 'active' : 'settled',
          ),
        ),
      })
      return
    }
    const u = path.at(-1)!
    for (let w = 1; w < n; w++)
      if (!used.has(w)) {
        used.add(w)
        path.push(w)
        go(cost + m[u][w])
        path.pop()
        used.delete(w)
      }
  }
  go(0)
  record(frames, {
    ...base(
      'done',
      `minimum tour cost=${best}; ${explored} complete tours checked`,
      { explored, best },
    ),
    output: [0, 1, 2, 3].map((x) => it(`city${x}`, 'ABCD'[x], 'settled')),
  })
  return frames
}

const backtrackingMissions: CourseMission[] = [
  pack('advanced-subset-sum', 'search-space', ['advanced', 'design'], subset),
  pack('advanced-n-queens', 'search-space', ['advanced', 'design'], queens),
  pack(
    'advanced-graph-coloring',
    'search-space',
    ['advanced', 'design'],
    coloring,
  ),
  pack(
    'advanced-backtracking-tsp',
    'search-space',
    ['advanced', 'design'],
    tspBacktrack,
  ),
]

function knapsack(v: 0 | 1): TraceFrame[] {
  const w = v ? [2, 3, 4, 5] : [2, 3, 4, 6],
    p = v ? [6, 8, 9, 10] : [4, 5, 8, 9],
    cap = v ? 8 : 7,
    frames: TraceFrame[] = []
  let best = 0,
    expanded = 0,
    pruned = 0
  type N = { i: number; w: number; p: number; take: number[] }
  const q: N[] = [{ i: 0, w: 0, p: 0, take: [] }]
  record(frames, {
    ...base(
      'start',
      `capacity=${cap}; fractional-knapsack relaxation supplies an optimistic bound`,
      { expanded, pruned, best },
    ),
    items: w.map((x, i) => ({ id: `item${i}`, value: `w${x}, p${p[i]}` })),
  })
  while (q.length) {
    const s = q.pop()!
    expanded++
    if (s.w > cap) {
      pruned++
      record(frames, {
        ...base('reject', `weight ${s.w} exceeds capacity ${cap}`, {
          expanded,
          pruned,
          best,
        }),
        items: [it('weight', s.w, 'red')],
      })
      continue
    }
    if (s.i === w.length) {
      best = Math.max(best, s.p)
      record(frames, {
        ...base('update', `feasible profit=${s.p}; incumbent=${best}`, {
          expanded,
          pruned,
          best,
        }),
        output: s.take.map((i) =>
          it(`item${i}`, `w${w[i]} p${p[i]}`, 'settled'),
        ),
      })
      continue
    }
    let rem = cap - s.w,
      ub = s.p
    for (let j = s.i; j < w.length && rem > 0; j++) {
      let f = Math.min(1, rem / w[j])
      ub += f * p[j]
      rem -= f * w[j]
    }
    if (ub <= best) {
      pruned++
      record(frames, {
        ...base('reject', `upper bound ${ub.toFixed(1)} ≤ incumbent ${best}`, {
          expanded,
          pruned,
          best,
        }),
        items: [it('bound', ub.toFixed(1), 'muted')],
      })
      continue
    }
    q.push(
      { i: s.i + 1, w: s.w, p: s.p, take: s.take },
      { i: s.i + 1, w: s.w + w[s.i], p: s.p + p[s.i], take: [...s.take, s.i] },
    )
    record(frames, {
      ...base(
        'split',
        `item ${s.i}: include or exclude; node bound=${ub.toFixed(1)}`,
        { expanded, pruned, best },
      ),
      items: w.map((x, i) => ({
        id: `item${i}`,
        value: `${x}/${p[i]}`,
        tone: i === s.i ? 'active' : undefined,
      })),
    })
  }
  record(frames, {
    ...base('done', `optimal feasible profit=${best}`, {
      expanded,
      pruned,
      best,
    }),
    output: [it('profit', best, 'settled')],
  })
  return frames
}

function bbtsp(v: 0 | 1): TraceFrame[] {
  const distances = v
    ? [
        [0, 3, 8, 5],
        [3, 0, 4, 7],
        [8, 4, 0, 2],
        [5, 7, 2, 0],
      ]
    : [
        [0, 2, 9, 6],
        [2, 0, 4, 7],
        [9, 4, 0, 3],
        [6, 7, 3, 0],
      ]
  const frames: TraceFrame[] = []
  let incumbent = Infinity
  let expanded = 0
  let pruned = 0
  type Node = { path: number[]; cost: number }
  const queue: Node[] = [{ path: [0], cost: 0 }]
  const displayedIncumbent = () =>
    Number.isFinite(incumbent) ? incumbent : '∞'

  record(frames, {
    ...base(
      'start',
      'LC queue by path cost; prune with path cost plus a minimum outgoing edge',
      {
        expanded,
        pruned,
        incumbent: 0,
      },
    ),
    matrix: {
      rows: ['A', 'B', 'C', 'D'],
      columns: ['A', 'B', 'C', 'D'],
      values: distances,
    },
  })

  while (queue.length) {
    queue.sort((a, b) => a.cost - b.cost)
    const node = queue.shift()!
    expanded++
    const current = node.path.at(-1)!

    if (node.path.length === 4) {
      const tourCost = node.cost + distances[current][0]
      incumbent = Math.min(incumbent, tourCost)
      record(frames, {
        ...base(
          'update',
          `complete tour cost ${tourCost}; incumbent=${incumbent}`,
          { expanded, pruned, incumbent },
        ),
        output: node.path.map((city) =>
          it(`city${city}`, 'ABCD'[city], 'settled'),
        ),
      })
      continue
    }

    for (let next = 1; next < 4; next++) {
      if (node.path.includes(next)) continue
      const cost = node.cost + distances[current][next]
      const bound =
        cost + Math.min(...distances[next].filter((_, city) => city !== next))
      if (bound >= incumbent) {
        pruned++
        record(frames, {
          ...base(
            'reject',
            `partial ${node.path
              .concat(next)
              .map((city) => 'ABCD'[city])
              .join(
                '→',
              )}: lower bound ${bound} ≥ incumbent ${displayedIncumbent()}`,
            {
              expanded,
              pruned,
              incumbent: displayedIncumbent(),
            },
          ),
          output: [it('bound', bound, 'muted')],
        })
      } else {
        queue.push({ path: [...node.path, next], cost })
      }
    }

    record(frames, {
      ...base(
        'visit',
        `expand ${node.path.map((city) => 'ABCD'[city]).join('→')}; queued=${queue.length}`,
        {
          expanded,
          pruned,
          incumbent: displayedIncumbent(),
        },
      ),
      output: node.path.map((city) =>
        it(`city${city}`, 'ABCD'[city], 'active'),
      ),
    })
  }

  record(frames, {
    ...base('done', `best tour cost=${incumbent}`, {
      expanded,
      pruned,
      incumbent,
    }),
    output: [it('tour-cost', incumbent, 'settled')],
  })
  return frames
}

function puzzleAStar(v: 0 | 1): TraceFrame[] {
  const goal = [...Array.from({ length: 15 }, (_, i) => i + 1), 0],
    start = goal.slice()
  if (v) {
    ;[start[14], start[15]] = [start[15], start[14]]
  } else {
    ;[start[14], start[15]] = [start[15], start[14]]
    ;[start[13], start[14]] = [start[14], start[13]]
  }
  const frames: TraceFrame[] = []
  let expanded = 0
  const h = (a: number[]) =>
      a.reduce(
        (s, x, i) =>
          x
            ? s +
              Math.abs(Math.floor((x - 1) / 4) - Math.floor(i / 4)) +
              Math.abs(((x - 1) % 4) - (i % 4))
            : s,
        0,
      ),
    key = (a: number[]) => a.join(',')
  const open = [{ a: start, g: 0 }],
    best = new Map([[key(start), 0]]),
    closed = new Set<string>()
  const draw = (a: number[]) => [
    a.slice(0, 4),
    a.slice(4, 8),
    a.slice(8, 12),
    a.slice(12, 16),
  ]
  record(frames, {
    ...base(
      'start',
      `A*: open ordered by f=g+h; Manhattan h=${h(start)}; each move costs 1`,
      { expanded, open: 1 },
    ),
    matrix: {
      rows: ['1', '2', '3', '4'],
      columns: ['1', '2', '3', '4'],
      values: draw(start),
    },
  })
  while (open.length) {
    open.sort((x, y) => x.g + h(x.a) - y.g - h(y.a))
    const cur = open.shift()!,
      k = key(cur.a)
    if (closed.has(k)) continue
    closed.add(k)
    expanded++
    if (k === key(goal)) {
      record(frames, {
        ...base(
          'done',
          `goal removed from min-f open set; optimal path cost g=${cur.g}`,
          { expanded, g: cur.g, h: 0, open: open.length },
        ),
        matrix: {
          rows: ['1', '2', '3', '4'],
          columns: ['1', '2', '3', '4'],
          values: draw(cur.a),
        },
      })
      return frames
    }
    const z = cur.a.indexOf(0),
      next = [
        z - 4,
        z + 4,
        ...(z % 4 ? [z - 1] : []),
        ...(z % 4 < 3 ? [z + 1] : []),
      ].filter((i) => i >= 0 && i < 16)
    for (const j of next) {
      const a = cur.a.slice()
      ;[a[z], a[j]] = [a[j], a[z]]
      const g = cur.g + 1,
        kk = key(a)
      if (closed.has(kk) || g >= (best.get(kk) ?? Infinity)) continue
      best.set(kk, g)
      open.push({ a, g })
      record(frames, {
        ...base(
          'relax',
          `move blank to ${j}; candidate g=${g}, Manhattan h=${h(a)}, f=${g + h(a)}; open=${open.length}`,
          { expanded, g, h: h(a), f: g + h(a), open: open.length },
        ),
        matrix: {
          rows: ['1', '2', '3', '4'],
          columns: ['1', '2', '3', '4'],
          values: draw(a),
        },
      })
    }
  }
  record(frames, {
    ...base('done', 'open set exhausted; no solution', { expanded, open: 0 }),
  })
  return frames
}
function circuit(v: 0 | 1): TraceFrame[] {
  const nets = v
      ? [
          [0, 1],
          [1, 2],
          [2, 3],
          [0, 3],
          [0, 2],
        ]
      : [
          [0, 1, 2],
          [0, 3],
          [1, 3],
          [2, 3],
        ],
    frames: TraceFrame[] = []
  let best = Infinity,
    expanded = 0,
    pruned = 0
  const order: number[] = [],
    profile: number[] = []
  const cut = (mask: number) =>
    nets.filter(
      (net) =>
        net.some((x) => (mask >> x) & 1) && net.some((x) => !((mask >> x) & 1)),
    ).length
  function visit(mask: number, peak: number) {
    if (mask === 15) {
      expanded++
      if (peak < best) {
        best = peak
        record(frames, {
          ...base(
            'update',
            `block order ${order.map((i) => `B${i + 1}`).join('→')}; cut densities=${profile.join(',')}; peak=${peak}`,
            { expanded, pruned, best },
          ),
          output: order.map((i) => it(`block${i}`, `B${i + 1}`, 'settled')),
        })
      }
      return
    }
    if (peak >= best) {
      pruned++
      record(frames, {
        ...base(
          'reject',
          `current maximum cut density ${peak} ≥ incumbent ${best}; future cuts cannot reduce it`,
          { expanded, pruned, best },
        ),
        items: [it('lower-bound', peak, 'muted')],
      })
      return
    }
    for (let b = 0; b < 4; b++)
      if (!((mask >> b) & 1)) {
        order.push(b)
        const m = mask | (1 << b),
          d = cut(m)
        profile.push(d)
        visit(m, Math.max(peak, d))
        profile.pop()
        order.pop()
      }
  }
  const labels = ['B1', 'B2', 'B3', 'B4']
  record(frames, {
    ...base(
      'start',
      'PCB ordering objective: minimize the maximum number of nets crossing any cut between placed and unplaced blocks',
      { expanded, pruned, best: 0 },
    ),
    matrix: {
      rows: nets.map((_, i) => `N${i + 1}`),
      columns: labels,
      values: nets.map((net) =>
        labels.map((_, i) => (net.includes(i) ? 1 : 0)),
      ),
    },
  })
  visit(0, 0)
  record(frames, {
    ...base(
      'done',
      `minimum peak cut density=${best}; exhaustive branch-and-bound expanded ${expanded} complete orders`,
      { expanded, pruned, best },
    ),
    output: [it('peak-cut', best, 'settled')],
  })
  return frames
}

function circuitGrid(v: 0 | 1): TraceFrame[] {
  const width = 5,
    start = 0,
    goal = 24,
    blocked = new Set(v ? [2, 7, 12, 17] : [6, 7, 8, 13, 18]),
    frames: TraceFrame[] = [],
    manhattan = (cell: number) =>
      Math.abs(Math.floor(cell / width) - Math.floor(goal / width)) +
      Math.abs((cell % width) - (goal % width)),
    neighbors = (cell: number) =>
      [cell - width, cell + 1, cell + width, cell - 1].filter(
        (n) =>
          n >= 0 &&
          n < 25 &&
          Math.abs(Math.floor(n / width) - Math.floor(cell / width)) +
            Math.abs((n % width) - (cell % width)) ===
            1 &&
          !blocked.has(n),
      )
  let shownVisits = 0
  const grid = (path: number[] = [], current = -1) =>
    Array.from({ length: 5 }, (_, r) =>
      Array.from({ length: 5 }, (_, c) => {
        const id = r * 5 + c
        return id === start
          ? 'S'
          : id === goal
            ? 'T'
            : blocked.has(id)
              ? '#'
              : id === current
                ? '@'
                : path.includes(id)
                  ? '*'
                  : '.'
      }),
    )
  record(frames, {
    ...base(
      'start',
      'Obstacle-grid routing: unit wire cost per 4-neighbor step; first find a BFS incumbent, then verify/improve with DFS branch-and-bound',
      { expanded: 0, best: 0, pruned: 0 },
    ),
    matrix: {
      rows: ['r0', 'r1', 'r2', 'r3', 'r4'],
      columns: ['c0', 'c1', 'c2', 'c3', 'c4'],
      values: grid(),
    },
  })
  const queue = [start],
    parent = new Map<number, number>([[start, -1]]),
    dist = new Map<number, number>([[start, 0]])
  while (queue.length) {
    const u = queue.shift()!
    if (shownVisits++ < 6)
      record(frames, {
        ...base(
          'visit',
          `FIFO BFS expands cell (${u % 5},${Math.floor(u / 5)}) at wire cost ${dist.get(u)}; first discovery fixes its minimum unit cost`,
          { expanded: shownVisits, frontier: queue.length, best: 0, pruned: 0 },
        ),
        matrix: {
          rows: ['r0', 'r1', 'r2', 'r3', 'r4'],
          columns: ['c0', 'c1', 'c2', 'c3', 'c4'],
          values: grid([], u),
        },
      })
    if (u === goal) break
    for (const n of neighbors(u))
      if (!dist.has(n)) {
        dist.set(n, dist.get(u)! + 1)
        parent.set(n, u)
        queue.push(n)
      }
  }
  if (!dist.has(goal)) {
    record(frames, {
      ...base('done', 'no route connects source to destination', {
        expanded: dist.size,
        best: 0,
        pruned: 0,
      }),
      matrix: {
        rows: ['r0', 'r1', 'r2', 'r3', 'r4'],
        columns: ['c0', 'c1', 'c2', 'c3', 'c4'],
        values: grid(),
      },
    })
    return frames
  }
  const bfsPath: number[] = []
  for (let c = goal; c !== -1; c = parent.get(c) ?? -1) bfsPath.push(c)
  bfsPath.reverse()
  let best = bfsPath.length - 1,
    bestPath = bfsPath.slice(),
    expanded = 0,
    pruned = 0
  record(frames, {
    ...base(
      'update',
      `BFS found a ${best}-wire route; use it as an incumbent for DFS search`,
      { expanded, best, pruned },
    ),
    matrix: {
      rows: ['r0', 'r1', 'r2', 'r3', 'r4'],
      columns: ['c0', 'c1', 'c2', 'c3', 'c4'],
      values: grid(bestPath),
    },
  })
  const path = [start],
    seen = new Set(path)
  function dfs(u: number) {
    expanded++
    if (u === goal) {
      if (path.length - 1 < best) {
        best = path.length - 1
        bestPath = path.slice()
        record(frames, {
          ...base('update', `shorter complete route has ${best} wires`, {
            expanded,
            best,
            pruned,
          }),
          matrix: {
            rows: ['r0', 'r1', 'r2', 'r3', 'r4'],
            columns: ['c0', 'c1', 'c2', 'c3', 'c4'],
            values: grid(bestPath),
          },
        })
      }
      return
    }
    const lower = path.length - 1 + manhattan(u)
    if (lower >= best) {
      pruned++
      if (pruned <= 5)
        record(frames, {
          ...base(
            'reject',
            `prefix cost ${path.length - 1} + Manhattan lower bound ${manhattan(u)} ≥ incumbent ${best}`,
            { expanded, best, pruned },
          ),
          matrix: {
            rows: ['r0', 'r1', 'r2', 'r3', 'r4'],
            columns: ['c0', 'c1', 'c2', 'c3', 'c4'],
            values: grid(path, u),
          },
        })
      return
    }
    for (const n of neighbors(u))
      if (!seen.has(n)) {
        seen.add(n)
        path.push(n)
        dfs(n)
        path.pop()
        seen.delete(n)
      }
  }
  dfs(start)
  record(frames, {
    ...base(
      'done',
      `minimum grid wire length=${best}; BFS and branch-bound agree`,
      { expanded, best, pruned },
    ),
    matrix: {
      rows: ['r0', 'r1', 'r2', 'r3', 'r4'],
      columns: ['c0', 'c1', 'c2', 'c3', 'c4'],
      values: grid(bestPath),
    },
    output: bestPath.map((cell) =>
      it(`cell${cell}`, `${cell % 5},${Math.floor(cell / 5)}`, 'settled'),
    ),
  })
  return frames
}

export const branchBoundMissions: CourseMission[] = [
  pack(
    'advanced-bb-knapsack',
    'search-space',
    ['advanced', 'design'],
    knapsack,
  ),
  pack('advanced-bb-tsp', 'search-space', ['advanced', 'design'], bbtsp),
  pack(
    'advanced-bb-puzzle15',
    'search-space',
    ['advanced', 'design'],
    puzzleAStar,
  ),
  pack(
    'advanced-circuit-density',
    'search-space',
    ['advanced', 'design'],
    circuit,
  ),
  pack(
    'advanced-circuit-grid',
    'search-space',
    ['advanced', 'design'],
    circuitGrid,
  ),
]

function np(v: 0 | 1): TraceFrame[] {
  const frames: TraceFrame[] = [],
    clauses = v
      ? [
          [
            { x: 1, s: 1 },
            { x: 1, s: 1 },
            { x: 1, s: 1 },
          ],
          [
            { x: 1, s: -1 },
            { x: 1, s: -1 },
            { x: 1, s: -1 },
          ],
        ]
      : [
          [
            { x: 1, s: 1 },
            { x: 2, s: -1 },
            { x: 3, s: 1 },
          ],
          [
            { x: 1, s: -1 },
            { x: 2, s: 1 },
            { x: 3, s: -1 },
          ],
        ],
    nodes = clauses.flatMap((c, ci) =>
      c.map((l, i) => ({
        id: `c${ci}l${i}`,
        value: `${l.s < 0 ? '¬' : ''}x${l.x}`,
        x: (i % 3) / 2,
        y: ci,
      })),
    ),
    edges: [number, number][] = []
  for (let i = 0; i < 3; i++)
    for (let j = 3; j < 6; j++) {
      const a = clauses[0][i],
        b = clauses[1][j - 3]
      if (a.x !== b.x || a.s === b.s) edges.push([i, j])
    }
  const satisfiable = edges.length > 0,
    chosen = satisfiable ? [0, edges[0][1]] : [],
    checks = chosen.length ? 1 : 0
  record(frames, {
    ...base(
      'start',
      `P asks whether a solution can be found in polynomial time; NP asks whether a proposed YES certificate can be checked in polynomial time. Reduce this 3-SAT instance to CLIQUE`,
      { vertices: 6, edges: edges.length, certificateChecks: 0 },
    ),
    nodes,
    edges: edges.map(([a, b]) => ({ from: nodes[a].id, to: nodes[b].id })),
  })
  record(frames, {
    ...base(
      'split',
      `reduction creates ${edges.length} compatibility edges; a size-2 clique picks one noncontradictory literal from each clause`,
      { vertices: 6, edges: edges.length, certificateChecks: 0 },
    ),
    nodes,
    edges: edges.map(([a, b]) => ({
      from: nodes[a].id,
      to: nodes[b].id,
      tone: 'active',
    })),
  })
  if (satisfiable) {
    record(frames, {
      ...base(
        'compare',
        `certificate (${nodes[chosen[0]].value}, ${nodes[chosen[1]].value}) is an edge: both chosen literals can be true`,
        { vertices: 6, edges: edges.length, certificateChecks: 1 },
      ),
      nodes,
      edges: edges.map(([a, b]) => ({
        from: nodes[a].id,
        to: nodes[b].id,
        tone: a === chosen[0] && b === chosen[1] ? 'settled' : undefined,
      })),
    })
  } else
    record(frames, {
      ...base(
        'reject',
        'no compatibility edge: this instance has no size-2 clique and is unsatisfiable',
        { vertices: 6, edges: 0, certificateChecks: 0 },
      ),
      nodes,
      edges: [],
    })
  record(frames, {
    ...base(
      'done',
      satisfiable
        ? 'the supplied clique is a polynomially checkable YES certificate; reduction is 3-SAT → CLIQUE'
        : 'this tiny instance has no clique certificate; one example does not solve general CLIQUE',
      { vertices: 6, edges: edges.length, certificateChecks: checks },
    ),
    nodes,
    edges: edges.map(([a, b]) => ({ from: nodes[a].id, to: nodes[b].id })),
    output: chosen.map((i) => it(nodes[i].id, nodes[i].value, 'settled')),
  })
  return frames
}

function randomized(v: 0 | 1): TraceFrame[] {
  const input = v ? [8, 1, 7, 3, 5, 2, 6, 4] : [7, 2, 8, 1, 5, 3, 6, 4],
    seed = v ? 19 : 11,
    frames: TraceFrame[] = []
  let state = seed,
    draws = 0,
    comparisons = 0
  const rand = (n: number) => {
    state = (state * 48271) % 2147483647
    draws++
    return state % n
  }
  record(frames, {
    ...base(
      'start',
      `seed=${seed}; recursively choose a uniform random pivot; partition by comparisons (Sherwood quicksort)`,
      { draws, comparisons },
    ),
    items: input.map((x, i) => ({ id: `x${i}`, value: x })),
  })
  function sort(a: number[]): number[] {
    if (a.length < 2) return a
    const pivot = a[rand(a.length)],
      less: number[] = [],
      equal: number[] = [],
      greater: number[] = []
    for (const x of a) {
      comparisons++
      if (x < pivot) less.push(x)
      else if (x > pivot) greater.push(x)
      else equal.push(x)
    }
    record(frames, {
      ...base(
        'split',
        `pivot=${pivot}; ${less.length} smaller, ${equal.length} equal, ${greater.length} larger; recurse on strict sides`,
        { draws, comparisons },
      ),
      groups: [
        { id: 'less', items: less.map((x, i) => it(`l${i}`, x)) },
        { id: 'equal', items: equal.map((x, i) => it(`e${i}`, x, 'active')) },
        { id: 'greater', items: greater.map((x, i) => it(`g${i}`, x)) },
      ],
    })
    return [...sort(less), ...equal, ...sort(greater)]
  }
  const sorted = sort(input)
  record(frames, {
    ...base(
      'done',
      `partition recursion yields exact sorted output; comparisons=${comparisons}; expected O(n log n), worst O(n²)`,
      { draws, comparisons },
    ),
    output: sorted.map((x, i) => it(`sorted${i}`, x, 'settled')),
  })
  return frames
}

function simplex(v: 0 | 1): TraceFrame[] {
  const frames: TraceFrame[] = []
  let pivots = 0
  const a = v
      ? [
          [2, 1, 1, 0, 8],
          [1, 2, 0, 1, 8],
          [-3, -2, 0, 0, 0],
        ]
      : [
          [1, 1, 1, 0, 4],
          [2, 1, 0, 1, 5],
          [-3, -2, 0, 0, 0],
        ],
    basis = [2, 3],
    names = ['x', 'y', 's1', 's2']
  const cols = ['x', 'y', 's1', 's2', 'rhs']
  record(frames, {
    ...base(
      'start',
      `maximize 3x+2y; slacks s1,s2 form the initial basis; tableau columns: ${cols.join(', ')}`,
      { pivots },
    ),
    matrix: {
      rows: ['constraint 1', 'constraint 2', 'objective'],
      columns: cols,
      values: a,
    },
  })
  while (true) {
    const col = a[2].slice(0, 4).findIndex((x) => x < 0)
    if (col < 0) break
    let row = -1,
      ratio = Infinity
    for (let r = 0; r < 2; r++)
      if (a[r][col] > 0) {
        const q = a[r][4] / a[r][col]
        if (q < ratio) {
          ratio = q
          row = r
        }
      }
    if (row < 0) break
    const pivot = a[row][col],
      leaving = names[basis[row]]
    for (let c = 0; c < 5; c++) a[row][c] /= pivot
    for (let r = 0; r < 3; r++)
      if (r !== row) {
        const f = a[r][col]
        for (let c = 0; c < 5; c++) a[r][c] -= f * a[row][c]
      }
    basis[row] = col
    pivots++
    record(frames, {
      ...base(
        'update',
        `Bland entering rule: ${names[col]}; ratio test leaves ${leaving}; pivot=${pivot}; basis=[${basis.map((i) => names[i]).join(', ')}]`,
        { pivots },
      ),
      matrix: {
        rows: ['constraint 1', 'constraint 2', 'objective'],
        columns: cols,
        values: a,
        active: [row, col],
      },
    })
  }
  const solution = [0, 0]
  basis.forEach((b, r) => {
    if (b < 2) solution[b] = a[r][4]
  })
  record(frames, {
    ...base(
      'done',
      `optimal basic solution x=${solution[0]}, y=${solution[1]}, objective=${a[2][4]}; all reduced costs nonnegative`,
      { pivots, x: solution[0], y: solution[1], objective: a[2][4] },
    ),
    matrix: {
      rows: ['constraint 1', 'constraint 2', 'objective'],
      columns: cols,
      values: a,
    },
  })
  return frames
}

export const complexityMissions: CourseMission[] = [
  pack(
    'advanced-np-certificates',
    'complexity',
    ['advanced', 'design', 'ai'],
    np,
  ),
]
export const randomizedMissions: CourseMission[] = [
  pack(
    'advanced-randomized',
    'complexity',
    ['advanced', 'design', 'ai'],
    randomized,
  ),
]
export const optimizationCoreMissions: CourseMission[] = [
  pack(
    'advanced-simplex',
    'optimization',
    ['advanced', 'design', 'ai'],
    simplex,
  ),
]

function lcPath(v: 0 | 1): TraceFrame[] {
  const edges = v
      ? [
          [0, 1, 3],
          [0, 2, 1],
          [2, 1, 1],
          [1, 3, 2],
          [2, 3, 7],
        ]
      : [
          [0, 1, 2],
          [0, 2, 5],
          [1, 2, 1],
          [1, 3, 5],
          [2, 3, 1],
        ],
    frames: TraceFrame[] = []
  let expanded = 0,
    pruned = 0
  const dist = [Infinity, Infinity, Infinity, Infinity],
    parent = [-1, -1, -1, -1]
  dist[0] = 0
  const q = [0]
  record(frames, {
    ...base(
      'start',
      'LC branch-and-bound: priority queue ordered by path cost (lower bound); FIFO explores arrival order',
      { expanded, pruned },
    ),
    nodes: ['S', 'A', 'B', 'T'].map((x, i) => ({
      id: `n${i}`,
      value: x,
      x: i % 2,
      y: Math.floor(i / 2),
    })),
    edges: edges.map(([a, b, w]) => ({
      from: `n${a}`,
      to: `n${b}`,
      weight: w,
      directed: true,
    })),
  })
  while (q.length) {
    if (v) q.sort((a, b) => dist[a] - dist[b])
    const u = q.shift()!
    expanded++
    for (const [a, b, w] of edges)
      if (a === u) {
        const nd = dist[u] + w
        if (nd < dist[b]) {
          dist[b] = nd
          parent[b] = u
          if (!q.includes(b)) q.push(b)
          record(frames, {
            ...base(
              'relax',
              `${'SABT'[u]}→${'SABT'[b]}: candidate ${nd}; queued labels [${q.map((x) => `${'SABT'[x]}:${dist[x]}`).join(', ')}]`,
              { expanded, pruned },
            ),
            output: dist.map((x, i) =>
              it(
                `n${i}`,
                Number.isFinite(x) ? x : '∞',
                i === b ? 'active' : undefined,
              ),
            ),
          })
        }
      }
    if (v && u === 3) {
      record(frames, {
        ...base('done', `min-cost queue removes target at cost=${dist[3]}`, {
          expanded,
          pruned,
        }),
        output: [it('path-cost', dist[3], 'settled')],
        nodes: ['S', 'A', 'B', 'T'].map((x, i) => ({
          id: `n${i}`,
          value: x,
          x: i % 2,
          y: Math.floor(i / 2),
        })),
        edges: edges.map(([a, b, w]) => ({
          from: `n${a}`,
          to: `n${b}`,
          weight: w,
          directed: true,
          tone: parent[b] === a ? 'settled' : undefined,
        })),
      })
      return frames
    }
  }
  record(frames, {
    ...base(
      'done',
      `${v ? 'LC' : 'FIFO'} queue exhausted; shortest cost=${dist[3]}`,
      { expanded, pruned },
    ),
    output: [it('path-cost', dist[3], 'settled')],
  })
  return frames
}
export const shortestPathSearchMissions: CourseMission[] = [
  pack(
    'advanced-bb-shortest-path',
    'search-space',
    ['advanced', 'design'],
    lcPath,
  ),
]

function randomizedTests(v: 0 | 1): TraceFrame[] {
  const seed = v ? 29 : 17
  let state = seed
  const rand = (n: number) => {
    state = (state * 48271) % 2147483647
    return state % n
  }
  const frames: TraceFrame[] = []
  let inside = 0
  const points = Array.from({ length: 16 }, (_, i) => {
    const x = rand(100) / 100,
      y = rand(100) / 100,
      hit = x * x + y * y <= 1
    if (hit) inside++
    return {
      id: `p${i}`,
      value: `(${x.toFixed(2)},${y.toFixed(2)})${hit ? ' in' : ''}`,
      label: hit ? 'in disk' : 'outside',
    }
  })
  record(frames, {
    ...base(
      'start',
      `Monte Carlo π estimate: 4 × inside / samples; seed=${seed}`,
      { samples: 16, inside, estimate: (4 * inside) / 16 },
    ),
    items: points,
  })
  record(frames, {
    ...base(
      'update',
      `16 bounded random points; ${inside} fell inside the quarter circle; estimate=${((4 * inside) / 16).toFixed(2)}`,
      { samples: 16, inside, estimate: (4 * inside) / 16 },
    ),
    items: points.map((p) => ({
      ...p,
      tone: String(p.value).endsWith('in') ? 'settled' : 'muted',
    })),
  })
  const n = v ? 17 : 9,
    baseN = 2
  let d = n - 1,
    s = 0
  while (d % 2 === 0) {
    d /= 2
    s++
  }
  let x = 1
  for (let e = 0; e < d; e++) x = (x * baseN) % n
  let pass = x === 1 || x === n - 1
  record(frames, {
    ...base(
      'compare',
      `Miller–Rabin: n−1=2^${s}·${d}; a=${baseN}, x₀=a^d mod n=${x}; t independent random bases bound composite false-acceptance by 4^-t`,
      { n, base: baseN, s, d, residue: x },
    ),
    output: [it('x0', x, x === 1 || x === n - 1 ? 'settled' : 'active')],
  })
  for (let r = 1; r < s && !pass; r++) {
    x = (x * x) % n
    pass = x === n - 1
    record(frames, {
      ...base(
        'update',
        `square x${r - 1} modulo ${n}: x${r}=${x}; ${pass ? 'reaches n−1' : 'continue witness check'}`,
        { n, base: baseN, s, d, residue: x, round: r },
      ),
      output: [it(`x${r}`, x, pass ? 'settled' : 'active')],
    })
  }
  record(frames, {
    ...base(
      'update',
      `base ${baseN} ${pass ? 'passes' : 'witnesses compositeness'}; one passing base is only a probable-prime result`,
      { n, base: baseN, s, d, residue: x, passes: pass ? 1 : 0 },
    ),
    output: [
      it('base-result', pass ? 'pass' : 'composite', pass ? 'settled' : 'red'),
    ],
  })
  const input = v ? [9, 1, 7, 3, 8, 2, 6, 4, 5] : [8, 2, 7, 1, 6, 3, 5, 4, 9],
    k = 4
  let remaining = input.slice(),
    rank = k,
    selected = 0,
    steps = 0
  while (true) {
    const pivot = remaining[rand(remaining.length)],
      left = remaining.filter((x) => x < pivot),
      equal = remaining.filter((x) => x === pivot),
      right = remaining.filter((x) => x > pivot)
    steps++
    record(frames, {
      ...base(
        'split',
        `random pivot ${pivot}; partition active candidates into <, =, >`,
        { steps, rank },
      ),
      groups: [
        { id: 'less', items: left.map((x, i) => it(`l${i}`, x)) },
        { id: 'equal', items: equal.map((x, i) => it(`e${i}`, x, 'active')) },
        { id: 'greater', items: right.map((x, i) => it(`g${i}`, x)) },
      ],
    })
    if (rank < left.length) remaining = left
    else if (rank >= left.length + equal.length) {
      rank -= left.length + equal.length
      remaining = right
    } else {
      selected = pivot
      break
    }
  }
  const expected = input.slice().sort((a, b) => a - b)[k]
  record(frames, {
    ...base(
      'done',
      `Las Vegas selection returns rank ${k}: ${selected}; exact verification ${selected === expected ? 'passes' : 'fails'}; runtime depends on pivots`,
      { steps, rank: k, verified: selected === expected ? 1 : 0 },
    ),
    output: [
      it('selected', selected, 'settled'),
      it('verified', selected === expected ? 'exact' : 'error', 'settled'),
    ],
  })
  return frames
}
export const randomizedVerificationMissions: CourseMission[] = [
  pack(
    'advanced-randomized-evidence',
    'complexity',
    ['advanced', 'design', 'ai'],
    randomizedTests,
  ),
]

function turingLanguage(v: 0 | 1): TraceFrame[] {
  const tape = v ? ['0', '0', '□'] : ['0', '1', '□']
  let head = 0,
    state = 'q0',
    step = 0
  const frames: TraceFrame[] = []
  const accept = 'accept',
    reject = 'reject'
  const snapshot = (op: TraceFrame['op'], formula: string): TraceFrame => ({
    ...base(op, formula, { step, head }),
    items: tape.map((x, i) => ({
      id: `cell${i}`,
      value: x,
      label: `${i}${i === head ? ` · ${state}` : ''}`,
      tone: i === head ? 'active' : undefined,
    })),
  })
  record(
    frames,
    snapshot(
      'start',
      'Deterministic TM decides L={01}: one tape, finite control, head moves; decide membership, not an optimum',
    ),
  )
  while (state !== accept && state !== reject && step < 5) {
    const symbol = tape[head] ?? '□'
    if (state === 'q0' && symbol === '0') {
      state = 'q1'
      head++
    } else if (state === 'q1' && symbol === '1') {
      state = 'q2'
      head++
    } else if (state === 'q2' && symbol === '□') state = accept
    else state = reject
    step++
    record(
      frames,
      snapshot(
        state === accept ? 'done' : state === reject ? 'reject' : 'visit',
        `δ step ${step}: read ${symbol}; control=${state}; head=${head}`,
      ),
    )
  }
  if (state === accept || state === reject)
    record(
      frames,
      snapshot(
        'done',
        `input ${tape.slice(0, -1).join('')} ${state === 'accept' ? '∈' : '∉'} L; a decider halts on every input`,
      ),
    )
  return frames
}

function lpStandard(v: 0 | 1): TraceFrame[] {
  const frames: TraceFrame[] = []
  record(frames, {
    ...base(
      'start',
      'x is unrestricted; y≥0; constraints x+y≤4 and x−y≥1; example feasible point (x,y)=(2,1)',
      { equations: 0 },
    ),
    items: [it('x', 'free'), it('y', '≥0')],
  })
  record(frames, {
    ...base(
      'split',
      'replace free x by x⁺−x⁻ with both parts nonnegative; add slack s1 to ≤ and subtract surplus s2 from ≥',
      { equations: 2 },
    ),
    matrix: {
      rows: ['x+y≤4', 'x−y≥1'],
      columns: ['x⁺', 'x⁻', 'y', 's1', 's2', 'rhs'],
      values: [
        [1, -1, 1, 1, 0, 4],
        [1, -1, -1, 0, -1, 1],
      ],
    },
  })
  const feasible = v ? [3, 1] : [2, 1],
    slack1 = 4 - (feasible[0] + feasible[1]),
    surplus = feasible[0] - feasible[1] - 1
  record(frames, {
    ...base(
      'done',
      `equalities: x⁺−x⁻+y+s1=4; x⁺−x⁻−y−s2=1; witness x=${feasible[0]}, y=${feasible[1]}, s1=${slack1}, s2=${surplus}`,
      { equations: 2, feasible: 1 },
    ),
    matrix: {
      rows: ['equality 1', 'equality 2'],
      columns: ['x⁺', 'x⁻', 'y', 's1', 's2', 'rhs'],
      values: [
        [1, -1, 1, 1, 0, 4],
        [1, -1, -1, 0, -1, 1],
      ],
    },
    output: feasible.map((x, i) => it(i ? 'y' : 'x', x, 'settled')),
  })
  return frames
}

function lpDegeneracy(v: 0 | 1): TraceFrame[] {
  const frames: TraceFrame[] = []
  if (!v) {
    const a = [
        [1, 1, 1, 0, 1],
        [1, 0, 0, 1, 1],
        [-1, -1, 0, 0, 0],
      ],
      basis = ['s1', 's2']
    record(frames, {
      ...base(
        'start',
        'Maximize x1+x2; constraints x1+x2≤1, x1≤1; initial slack basis; equal ratio test illustrates a degenerate BFS after pivot',
        { pivots: 0 },
      ),
      matrix: {
        rows: ['constraint 1', 'constraint 2', 'objective'],
        columns: ['x1', 'x2', 's1', 's2', 'rhs'],
        values: a,
      },
    })
    const col = 0,
      row = 0,
      p = a[row][col],
      leaving = basis[row]
    for (let c = 0; c < 5; c++) a[row][c] /= p
    for (let r = 0; r < 3; r++)
      if (r !== row) {
        const f = a[r][col]
        for (let c = 0; c < 5; c++) a[r][c] -= f * a[row][c]
      }
    basis[row] = 'x1'
    record(frames, {
      ...base(
        'update',
        `Bland: lowest-index improving variable x1 enters; tied ratios are 1, choose basic s1 to leave; new basic s2=0 is degenerate`,
        { pivots: 1, degenerate: 1 },
      ),
      matrix: {
        rows: ['constraint 1', 'constraint 2', 'objective'],
        columns: ['x1', 'x2', 's1', 's2', 'rhs'],
        values: a,
        active: [row, col],
      },
    })
    record(frames, {
      ...base(
        'done',
        'finite optimum: objective row has no negative reduced cost; BFS x1=1,x2=0,s2=0; degenerate pivots can repeat a vertex, Bland tie rules prevent cycling',
        { pivots: 1, degenerate: 1, optimal: 1 },
      ),
      matrix: {
        rows: ['constraint 1', 'constraint 2', 'objective'],
        columns: ['x1', 'x2', 's1', 's2', 'rhs'],
        values: a,
      },
    })
  } else {
    const a = [[-1, 0]]
    record(frames, {
      ...base(
        'start',
        'Maximize x with x≥0 and no upper constraint; tableau has an improving x column but no positive constraint coefficient for a leaving row',
        { pivots: 0 },
      ),
      matrix: { rows: ['objective'], columns: ['x', 'rhs'], values: a },
    })
    record(frames, {
      ...base(
        'reject',
        'no constraint row can bound the improving x direction; therefore no leaving variable exists',
        { pivots: 0, improvingColumn: 1 },
      ),
      matrix: { rows: ['objective'], columns: ['x', 'rhs'], values: a },
    })
    record(frames, {
      ...base(
        'done',
        'unbounded: improving direction has no limiting row; this is not an infeasible case',
        { pivots: 0, unbounded: 1 },
      ),
      matrix: { rows: ['objective'], columns: ['x', 'rhs'], values: a },
    })
  }
  return frames
}

export const foundationalMissions: CourseMission[] = [
  pack(
    'advanced-backtracking-knapsack',
    'search-space',
    ['advanced', 'design'],
    backtrackingKnapsack,
  ),
  pack(
    'advanced-turing-language',
    'complexity',
    ['advanced', 'design', 'ai'],
    turingLanguage,
  ),
  pack(
    'advanced-lp-standard',
    'optimization',
    ['advanced', 'design'],
    lpStandard,
  ),
  pack(
    'advanced-lp-degeneracy',
    'optimization',
    ['advanced', 'design'],
    lpDegeneracy,
  ),
]
export const advancedMissions: CourseMission[] = [
  ...backtrackingMissions,
  ...branchBoundMissions,
  ...complexityMissions,
  ...randomizedMissions,
  ...optimizationCoreMissions,
  ...shortestPathSearchMissions,
  ...randomizedVerificationMissions,
  ...foundationalMissions,
]
