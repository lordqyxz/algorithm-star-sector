import type { CourseMission, TraceEdge, TraceFrame, TraceNode } from '../types'
import { record } from './trace'

type Edge = [number, number, number]
type Graph = { n: number; edges: Edge[]; start?: number }
const graphs: Record<string, [Graph, Graph]> = {
  repr: [
    {
      n: 4,
      edges: [
        [0, 1, 2],
        [0, 2, 5],
        [1, 2, 1],
        [2, 3, 3],
      ],
    },
    {
      n: 5,
      edges: [
        [0, 1, 1],
        [1, 2, 4],
        [1, 3, 2],
        [3, 4, 1],
        [2, 4, 3],
      ],
    },
  ],
  search: [
    {
      n: 6,
      start: 0,
      edges: [
        [0, 1, 1],
        [0, 2, 1],
        [1, 3, 1],
        [2, 4, 1],
        [3, 5, 1],
        [4, 5, 1],
      ],
    },
    {
      n: 6,
      start: 2,
      edges: [
        [0, 1, 1],
        [1, 2, 1],
        [2, 3, 1],
        [2, 4, 1],
        [4, 5, 1],
        [3, 5, 1],
      ],
    },
  ],
  components: [
    {
      n: 7,
      edges: [
        [0, 1, 1],
        [1, 2, 1],
        [2, 0, 1],
        [2, 3, 1],
        [3, 4, 1],
        [4, 3, 1],
        [4, 5, 1],
        [5, 6, 1],
        [6, 5, 1],
      ],
    },
    {
      n: 6,
      edges: [
        [0, 1, 1],
        [1, 0, 1],
        [1, 2, 1],
        [2, 3, 1],
        [3, 2, 1],
        [4, 5, 1],
        [5, 4, 1],
      ],
    },
  ],
  topo: [
    {
      n: 6,
      edges: [
        [0, 2, 1],
        [1, 2, 1],
        [1, 3, 1],
        [2, 4, 1],
        [3, 4, 1],
        [4, 5, 1],
      ],
    },
    {
      n: 5,
      edges: [
        [0, 1, 1],
        [0, 2, 1],
        [1, 3, 1],
        [2, 3, 1],
        [3, 4, 1],
      ],
    },
  ],
  shortest: [
    {
      n: 5,
      start: 0,
      edges: [
        [0, 1, 4],
        [0, 2, 1],
        [2, 1, 2],
        [1, 3, 1],
        [2, 3, 5],
        [3, 4, 3],
      ],
    },
    {
      n: 5,
      start: 0,
      edges: [
        [0, 1, 2],
        [0, 2, 7],
        [1, 2, 1],
        [1, 3, 6],
        [2, 3, 2],
        [3, 4, 1],
      ],
    },
  ],
  floyd: [
    {
      n: 4,
      edges: [
        [0, 1, 5],
        [0, 3, 10],
        [1, 2, 3],
        [2, 3, 1],
        [3, 0, 2],
      ],
    },
    {
      n: 5,
      edges: [
        [0, 1, 4],
        [0, 4, 20],
        [1, 2, 2],
        [2, 3, 3],
        [3, 4, 1],
        [4, 0, 8],
      ],
    },
  ],
  mst: [
    {
      n: 6,
      edges: [
        [0, 1, 4],
        [0, 2, 3],
        [1, 2, 1],
        [1, 3, 2],
        [2, 3, 4],
        [2, 4, 5],
        [3, 4, 2],
        [3, 5, 7],
        [4, 5, 3],
      ],
    },
    {
      n: 5,
      edges: [
        [0, 1, 2],
        [0, 2, 6],
        [1, 2, 3],
        [1, 3, 5],
        [2, 3, 1],
        [2, 4, 4],
        [3, 4, 2],
      ],
    },
  ],
  critical: [
    {
      n: 6,
      edges: [
        [0, 1, 3],
        [0, 2, 2],
        [1, 3, 4],
        [2, 3, 5],
        [2, 4, 3],
        [3, 5, 2],
        [4, 5, 4],
      ],
    },
    {
      n: 5,
      edges: [
        [0, 1, 2],
        [0, 2, 4],
        [1, 3, 5],
        [2, 3, 2],
        [2, 4, 3],
        [3, 4, 2],
      ],
    },
  ],
  multistage: [
    {
      n: 6,
      edges: [
        [0, 1, 2],
        [0, 2, 5],
        [1, 3, 4],
        [1, 4, 6],
        [2, 3, 2],
        [2, 4, 1],
        [3, 5, 3],
        [4, 5, 2],
      ],
    },
    {
      n: 6,
      edges: [
        [0, 1, 3],
        [0, 2, 2],
        [1, 3, 2],
        [1, 4, 5],
        [2, 3, 4],
        [2, 4, 1],
        [3, 5, 3],
        [4, 5, 4],
      ],
    },
  ],
  flow: [
    {
      n: 6,
      start: 0,
      edges: [
        [0, 1, 8],
        [0, 2, 5],
        [1, 2, 3],
        [1, 3, 5],
        [2, 4, 7],
        [3, 4, 3],
        [3, 5, 6],
        [4, 5, 8],
      ],
    },
    {
      n: 6,
      start: 0,
      edges: [
        [0, 1, 7],
        [0, 2, 6],
        [1, 3, 4],
        [1, 4, 3],
        [2, 3, 2],
        [2, 4, 5],
        [3, 5, 6],
        [4, 5, 7],
      ],
    },
  ],
  mincost: [
    {
      n: 4,
      start: 0,
      edges: [
        [0, 1, 2],
        [0, 2, 2],
        [1, 2, 1],
        [1, 3, 2],
        [2, 3, 2],
      ],
    },
    {
      n: 5,
      start: 0,
      edges: [
        [0, 1, 2],
        [0, 2, 2],
        [1, 2, 1],
        [1, 3, 2],
        [2, 3, 2],
        [3, 4, 3],
      ],
    },
  ],
}
const coords = (n: number): TraceNode[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `v${i}`,
    value: String.fromCharCode(65 + i),
    x: n === 1 ? 0.5 : 0.08 + (0.84 * i) / (n - 1),
    y: i % 2 ? 0.68 : 0.28,
  }))
const edgesView = (g: Graph, directed = false, active = -1): TraceEdge[] =>
  g.edges.map(([u, v, w], i) => ({
    from: `v${u}`,
    to: `v${v}`,
    weight: w,
    directed,
    tone: i === active ? 'active' : 'muted',
  }))
const freezeTree = <T>(x: T): T => {
  if (x && typeof x === 'object') {
    Object.freeze(x)
    for (const v of Object.values(x as object)) freezeTree(v)
  }
  return x
}
function mission(
  id: string,
  key: string,
  run: (g: Graph, f: TraceFrame[], variant: number) => void,
): CourseMission {
  return {
    id,
    chapter: 'graphs',
    sources: ['combined', 'structures', 'design', 'advanced', 'ai'],
    trace: (v) => {
      const f: TraceFrame[] = []
      const g = graphs[key][v]
      record(f, {
        op: 'start',
        formula: 'G=(V,E)',
        nodes: coords(g.n),
        edges: edgesView(
          g,
          [
            'topo',
            'floyd',
            'critical',
            'multistage',
            'flow',
            'mincost',
          ].includes(key) ||
            (key === 'components' && v === 1) ||
            (key === 'shortest' && v === 1),
        ),
        counters: { vertices: g.n, edges: g.edges.length },
      })
      run(g, f, v)
      return freezeTree(f)
    },
  }
}
const push = (f: TraceFrame[], frame: TraceFrame) => record(f, frame)
const pathHas = (path: number[], u: number, v: number) =>
  path.some((x, i) => x === u && path[i + 1] === v)
const residualEdges = (
  capacity: number[][],
  path: number[],
  weight: (u: number, v: number, remaining: number) => string | number,
): TraceEdge[] => {
  const edges: TraceEdge[] = capacity.flatMap((row, u) =>
    row.flatMap((remaining, v) =>
      remaining > 0
        ? [
            {
              from: `v${u}`,
              to: `v${v}`,
              weight: weight(u, v, remaining),
              directed: true,
              tone: pathHas(path, u, v)
                ? ('active' as const)
                : ('muted' as const),
            },
          ]
        : [],
    ),
  )
  for (let i = 0; i < path.length - 1; i++) {
    const u = path[i],
      v = path[i + 1]
    if (capacity[u][v] === 0)
      edges.push({
        from: `v${u}`,
        to: `v${v}`,
        weight: weight(u, v, 0),
        saturated: true,
        directed: true,
        tone: 'active',
      })
  }
  return edges
}
const val = (x: number) => (Number.isFinite(x) ? x : '∞')
const directed = (g: Graph) => g.edges.map(([a, b, w]) => [a, b, w] as Edge)
const adjacency = (g: Graph, reverse = false, directedOnly = false) => {
  const a: number[][] = Array.from({ length: g.n }, () => [])
  for (const [u, v] of g.edges) {
    a[reverse ? v : u].push(reverse ? u : v)
    if (!directedOnly) a[reverse ? u : v].push(reverse ? v : u)
  }
  for (const x of a) x.sort((p, q) => p - q)
  return a
}
const result = (
  f: TraceFrame[],
  g: Graph,
  formula: string,
  output: (number | string)[],
  counters: Record<string, number | string> = {},
  isDirected = true,
  edgeOverride?: TraceEdge[],
) =>
  push(f, {
    op: 'done',
    formula,
    nodes: coords(g.n),
    edges: edgeOverride ?? edgesView(g, isDirected),
    output: output.map((x, i) => ({ id: `o${i}`, value: x, label: String(i) })),
    counters,
  })

export const graphsMissions: CourseMission[] = [
  mission('g-representations', 'repr', (g, f) => {
    const a = Array.from({ length: g.n }, () => Array(g.n).fill(0))
    for (const [u, v, w] of g.edges) {
      a[u][v] = w
      a[v][u] = w
    }
    const list = Array.from({ length: g.n }, (_, u) =>
      g.edges.flatMap(([x, y, w]) =>
        x === u ? [[y, w]] : y === u ? [[x, w]] : [],
      ),
    )
    push(f, {
      op: 'update',
      formula: 'adj[u] stores neighbors; matrix[u][v] stores edge weight',
      nodes: coords(g.n),
      edges: edgesView(g),
      matrix: {
        rows: Array.from({ length: g.n }, (_, i) => `v${i}`),
        columns: Array.from({ length: g.n }, (_, i) => `v${i}`),
        values: a,
      },
      output: list.map((x, i) => ({
        id: `list${i}`,
        value:
          x.map(([v, w]) => `${String.fromCharCode(65 + v)}:${w}`).join(' ') ||
          '∅',
        label: String.fromCharCode(65 + i),
      })),
      counters: {
        vertices: g.n,
        undirectedEdges: g.edges.length,
        matrixCells: g.n * g.n,
      },
    })
    result(
      f,
      g,
      'undirected: degree sum = 2|E|',
      [g.edges.length, g.n * g.n],
      { spaceList: g.n + 2 * g.edges.length, spaceMatrix: g.n * g.n },
      false,
    )
  }),
  mission('g-search', 'search', (g, f) => {
    const a = adjacency(g),
      s = g.start ?? 0
    for (const [name, qkind] of [
      ['DFS', 'stack'],
      ['BFS', 'queue'],
    ]) {
      const seen = new Set<number>(),
        order: number[] = []
      const q = [s]
      while (q.length) {
        const u = qkind === 'stack' ? q.pop()! : q.shift()!
        if (seen.has(u)) continue
        seen.add(u)
        order.push(u)
        const next = a[u].filter((x) => !seen.has(x))
        q.push(...(qkind === 'stack' ? [...next].reverse() : next))
        push(f, {
          op: 'visit',
          formula: `${name}: mark ${u} when removed; frontier is ${qkind}`,
          nodes: coords(g.n).map((n, i) => ({
            ...n,
            tone: i === u ? 'active' : seen.has(i) ? 'settled' : 'muted',
          })),
          edges: edgesView(g, false),
          output: order.map((x, i) => ({
            id: `visit${i}`,
            value: String.fromCharCode(65 + x),
          })),
          counters: { visited: order.length, frontier: q.length },
        })
      }
      result(
        f,
        g,
        `${name} visits each vertex/edge at most once`,
        order.map((x) => String.fromCharCode(65 + x)),
        { visited: order.length },
        false,
      )
    }
  }),
  mission('g-components-scc', 'components', (g, f, v) => {
    const a = adjacency(g, false, v === 1),
      seen = new Set<number>(),
      groups: number[][] = []
    const dfs = (u: number, out: number[]) => {
      seen.add(u)
      out.push(u)
      for (const x of a[u]) if (!seen.has(x)) dfs(x, out)
    }
    if (v === 0) {
      for (let i = 0; i < g.n; i++)
        if (!seen.has(i)) {
          const c: number[] = []
          dfs(i, c)
          groups.push(c)
        }
      push(f, {
        op: 'done',
        formula:
          'undirected connected component = maximal mutually reachable set',
        nodes: coords(g.n),
        groups: groups.map((x, i) => ({
          id: `c${i}`,
          items: x.map((u) => ({
            id: `v${u}`,
            value: String.fromCharCode(65 + u),
            tone: 'settled',
          })),
        })),
        counters: { components: groups.length },
      })
      result(
        f,
        g,
        'connected components',
        groups.map((x) => x.map((y) => String.fromCharCode(65 + y)).join('')),
        {},
        false,
      )
    } else {
      const order: number[] = [],
        vis = new Set<number>()
      const visit = (u: number) => {
        vis.add(u)
        for (const x of a[u]) if (!vis.has(x)) visit(x)
        order.push(u)
      }
      for (let i = 0; i < g.n; i++) if (!vis.has(i)) visit(i)
      const r = adjacency(g, true, true)
      seen.clear()
      const dfs2 = (u: number, out: number[]) => {
        seen.add(u)
        out.push(u)
        for (const x of r[u]) if (!seen.has(x)) dfs2(x, out)
      }
      for (const u of order.reverse())
        if (!seen.has(u)) {
          const c: number[] = []
          dfs2(u, c)
          groups.push(c)
        }
      push(f, {
        op: 'update',
        formula: 'Kosaraju: DFS finish order, then DFS on reversed edges',
        nodes: coords(g.n),
        edges: edgesView(g, true),
        counters: { finishOrder: order.join(',') },
      })
      result(
        f,
        g,
        'SCC partition',
        groups.map((x) => x.map((y) => String.fromCharCode(65 + y)).join('')),
        { components: groups.length },
      )
    }
  }),
  mission('g-topology', 'topo', (g, f, v) => {
    const e = directed(g)
    if (v === 1) e.push([g.n - 1, 0, 1])
    const d = Array(g.n).fill(0)
    for (const [u, w] of e) d[w]++
    const q = d.map((x, i) => (x === 0 ? i : -1)).filter((x) => x >= 0),
      order: number[] = []
    push(f, {
      op: 'start',
      formula: 'indegree[v] = number of incoming edges',
      nodes: coords(g.n),
      edges: e.map(([a, b]) => ({
        from: `v${a}`,
        to: `v${b}`,
        directed: true,
      })),
      counters: { zeroIndegree: q.length },
    })
    while (q.length) {
      const u = q.shift()!
      order.push(u)
      for (const [a, b] of e) if (a === u && --d[b] === 0) q.push(b)
      push(f, {
        op: 'remove',
        formula: 'Kahn: remove indegree-0 vertex; decrement outgoing indegrees',
        nodes: coords(g.n),
        edges: e.map(([a, b]) => ({
          from: `v${a}`,
          to: `v${b}`,
          directed: true,
        })),
        output: order.map((x) => ({
          id: `t${x}`,
          value: String.fromCharCode(65 + x),
        })),
        counters: { ready: q.length, removed: order.length },
      })
    }
    const cyclic = order.length !== g.n
    result(
      f,
      g,
      cyclic
        ? 'removed < |V| ⇒ directed cycle remains'
        : 'all vertices removed ⇒ valid topological order',
      cyclic
        ? [
            'cycle',
            ...d.flatMap((x, i) =>
              x > 0 ? [String.fromCharCode(65 + i)] : [],
            ),
          ]
        : order.map((x) => String.fromCharCode(65 + x)),
      { removed: order.length, cycle: cyclic ? 1 : 0 },
    )
  }),
  mission('g-shortest-path', 'shortest', (g, f, v) => {
    if (v === 0) {
      const d = Array(g.n).fill(Infinity),
        settled = new Set<number>(),
        source = g.start ?? 0
      d[source] = 0
      let relaxations = 0
      while (settled.size < g.n) {
        let u = -1
        for (let i = 0; i < g.n; i++)
          if (!settled.has(i) && (u < 0 || d[i] < d[u])) u = i
        if (u < 0 || !Number.isFinite(d[u])) break
        settled.add(u)
        push(f, {
          op: 'visit',
          formula: `Dijkstra: extract unsettled minimum d[${u}]=${d[u]}; finalize it`,
          nodes: coords(g.n).map((n, i) => ({
            ...n,
            value: val(d[i]),
            tone: i === u ? 'active' : settled.has(i) ? 'settled' : 'muted',
          })),
          edges: edgesView(g, false),
          counters: { settled: settled.size, relaxations },
        })
        for (const [a, b, w] of g.edges) {
          const vtx = a === u ? b : b === u ? a : -1
          if (vtx >= 0 && !settled.has(vtx) && d[u] + w < d[vtx]) {
            d[vtx] = d[u] + w
            relaxations++
            push(f, {
              op: 'relax',
              formula: `d[${vtx}] ← min(d[${vtx}], ${d[u]} + ${w})`,
              nodes: coords(g.n).map((n, i) => ({
                ...n,
                value: val(d[i]),
                tone:
                  i === vtx ? 'active' : settled.has(i) ? 'settled' : 'muted',
              })),
              edges: edgesView(g, false),
              counters: { settled: settled.size, relaxations },
            })
          }
        }
      }
      result(
        f,
        g,
        'Dijkstra requires nonnegative edge weights; settled distances never improve',
        d.map(val),
        { settled: settled.size, relaxations },
        false,
      )
    } else {
      const be = directed(g).filter(([u, v]) => !(u === 1 && v === 2))
      be.push([1, 2, -2], [2, 1, 1])
      const d = Array(g.n).fill(Infinity)
      d[g.start ?? 0] = 0
      for (let i = 1; i < g.n; i++) {
        let changed = false
        for (const [u, v, w] of be)
          if (d[u] + w < d[v]) {
            d[v] = d[u] + w
            changed = true
          }
        push(f, {
          op: 'relax',
          formula: `Bellman–Ford pass ${i}: relax each directed edge`,
          nodes: coords(g.n).map((n, j) => ({ ...n, value: val(d[j]) })),
          edges: be.map(([a, b, w]) => ({
            from: `v${a}`,
            to: `v${b}`,
            weight: w,
            directed: true,
            tone: w < 0 ? 'red' : 'muted',
          })),
          counters: { pass: i, changed: changed ? 1 : 0 },
        })
        if (!changed) break
      }
      const negativeCycle = be.some(([u, v, w]) => d[u] + w < d[v])
      push(f, {
        op: 'done',
        formula:
          'one extra edge pass improves a reachable distance ⇢ reachable negative cycle',
        nodes: coords(g.n).map((n, i) => ({
          ...n,
          value: val(d[i]),
          tone: i === 1 || i === 2 ? 'red' : undefined,
        })),
        edges: be.map(([a, b, w]) => ({
          from: `v${a}`,
          to: `v${b}`,
          weight: w,
          directed: true,
          tone: w < 0 ? 'red' : 'muted',
        })),
        output: d.map((x, i) => ({ id: `bf${i}`, value: val(x) })),
        counters: { passes: g.n - 1, negativeCycle: negativeCycle ? 1 : 0 },
      })
    }
  }),
  mission('g-floyd-warshall', 'floyd', (g, f) => {
    const d = Array.from({ length: g.n }, (_, i) =>
      Array.from({ length: g.n }, (_, j) => (i === j ? 0 : Infinity)),
    )
    for (const [u, v, w] of g.edges) d[u][v] = w
    for (let k = 0; k < g.n; k++)
      for (let i = 0; i < g.n; i++)
        for (let j = 0; j < g.n; j++)
          if (d[i][k] + d[k][j] < d[i][j]) {
            const old = d[i][j]
            d[i][j] = d[i][k] + d[k][j]
            push(f, {
              op: 'update',
              formula: `D[${i},${j}] ← min(${val(old)}, ${val(d[i][k])} + ${val(d[k][j])}) = ${d[i][j]}`,
              nodes: coords(g.n),
              matrix: {
                rows: Array.from({ length: g.n }, (_, x) => `v${x}`),
                columns: Array.from({ length: g.n }, (_, x) => `v${x}`),
                values: d.map((r) => r.map(val)),
                active: [i, j],
              },
              counters: { intermediate: k, updates: f.length },
            })
          }
    result(
      f,
      g,
      'after each k, paths may use internal vertices ≤ k',
      d.flat().map(val),
      { updates: f.length },
    )
  }),
  mission('g-mst', 'mst', (g, f, v) => {
    const chosen: Edge[] = []
    if (v === 0) {
      const used = new Set([0])
      while (used.size < g.n) {
        const e = g.edges
          .filter(([a, b]) => used.has(a) !== used.has(b))
          .sort((a, b) => a[2] - b[2])[0]
        if (!e) break
        chosen.push(e)
        used.add(used.has(e[0]) ? e[1] : e[0])
        push(f, {
          op: 'select',
          formula: `Prim: cheapest edge crossing tree cut, weight ${e[2]}`,
          nodes: coords(g.n),
          edges: edgesView({ ...g, edges: chosen }, false, chosen.length - 1),
          counters: {
            treeVertices: used.size,
            weight: chosen.reduce((s, x) => s + x[2], 0),
          },
        })
      }
    } else {
      const p = Array.from({ length: g.n }, (_, i) => i),
        find = (x: number): number => (p[x] === x ? x : (p[x] = find(p[x])))
      for (const e of [...g.edges].sort((a, b) => a[2] - b[2])) {
        const a = find(e[0]),
          b = find(e[1])
        if (a !== b) {
          p[a] = b
          chosen.push(e)
        }
        push(f, {
          op: a !== b ? 'select' : 'reject',
          formula: `Kruskal: accept iff endpoints are in different sets (weight ${e[2]})`,
          nodes: coords(g.n),
          edges: edgesView({ ...g, edges: [e] }, false),
          counters: {
            accepted: chosen.length,
            weight: chosen.reduce((s, x) => s + x[2], 0),
          },
        })
      }
    }
    result(
      f,
      g,
      'MST has |V|−1 edges and minimum total weight',
      [chosen.length, chosen.reduce((s, x) => s + x[2], 0)],
      { edges: chosen.length, weight: chosen.reduce((s, x) => s + x[2], 0) },
      false,
    )
  }),
  mission('g-critical-path', 'critical', (g, f) => {
    const indeg = Array(g.n).fill(0)
    for (const [u, v] of g.edges) indeg[v]++
    const q = indeg.map((x, i) => (x === 0 ? i : -1)).filter((x) => x >= 0),
      o: number[] = []
    while (q.length) {
      const u = q.shift()!
      o.push(u)
      for (const [a, b] of g.edges) if (a === u && --indeg[b] === 0) q.push(b)
    }
    const early = Array(g.n).fill(0)
    for (const u of o)
      for (const [a, b, w] of g.edges)
        if (a === u) early[b] = Math.max(early[b], early[u] + w)
    const finish = Math.max(...early)
    const late = Array(g.n).fill(finish)
    for (const u of [...o].reverse())
      for (const [a, b, w] of g.edges)
        if (a === u) late[u] = Math.min(late[u], late[b] - w)
    push(f, {
      op: 'update',
      formula:
        'AOE: earliest=max predecessor finish; latest=min successor latest−duration',
      nodes: coords(g.n).map((n, i) => ({
        ...n,
        label: `E${early[i]}/L${late[i]}`,
      })),
      edges: edgesView(g, true),
      counters: { projectDuration: finish },
    })
    const activityEdges: TraceEdge[] = g.edges.map(([u, v, w]) => {
      const slack = late[v] - w - early[u]
      return {
        from: `v${u}`,
        to: `v${v}`,
        weight: `${w} / slack ${slack}`,
        directed: true,
        tone: slack === 0 ? 'active' : 'muted',
      }
    })
    result(
      f,
      g,
      'activitySlack=(latest[v]−duration)−earliest[u]; zero-slack activities form the critical path',
      late.map((x, i) => x - early[i]),
      {
        projectDuration: finish,
        criticalVertices: late.filter((x, i) => x === early[i]).length,
        criticalActivities: activityEdges.filter((e) => e.tone === 'active')
          .length,
      },
      true,
      activityEdges,
    )
  }),
  mission('g-multistage', 'multistage', (g, f) => {
    const d = Array(g.n).fill(Infinity),
      next = Array(g.n).fill(-1)
    d[g.n - 1] = 0
    for (let u = g.n - 2; u >= 0; u--)
      for (const [a, b, w] of g.edges)
        if (a === u && w + d[b] < d[u]) {
          d[u] = w + d[b]
          next[u] = b
          push(f, {
            op: 'update',
            formula: `cost[${u}] = min(c(${u},v) + cost[v])`,
            nodes: coords(g.n).map((n, i) => ({
              ...n,
              value: val(d[i]),
              tone: i === u ? 'active' : undefined,
            })),
            edges: edgesView(g, true),
            counters: { stage: u, updates: f.length },
          })
        }
    let path = [0]
    while (path.at(-1) !== g.n - 1 && next[path.at(-1)!] !== -1)
      path.push(next[path.at(-1)!])
    result(
      f,
      g,
      'DAG backward DP: best suffix cost, not topological discovery order',
      [val(d[0]), ...path.map((x) => String.fromCharCode(65 + x))],
      { cost: val(d[0]), pathLength: path.length },
    )
  }),
  mission('g-max-flow', 'flow', (g, f) => {
    const c = Array.from({ length: g.n }, () => Array(g.n).fill(0))
    for (const [u, v, w] of g.edges) c[u][v] = w
    let total = 0,
      aug = 0
    while (true) {
      const p = Array(g.n).fill(-1),
        q = [0]
      p[0] = 0
      while (q.length && p[g.n - 1] === -1) {
        const u = q.shift()!
        for (let v = 0; v < g.n; v++)
          if (p[v] === -1 && c[u][v] > 0) {
            p[v] = u
            q.push(v)
          }
      }
      if (p[g.n - 1] === -1) break
      let b = Infinity
      for (let v = g.n - 1; v !== 0; v = p[v]) b = Math.min(b, c[p[v]][v])
      const path: number[] = []
      for (let v = g.n - 1; v !== 0; v = p[v]) path.unshift(v)
      path.unshift(0)
      for (let v = g.n - 1; v !== 0; v = p[v]) {
        const u = p[v]
        c[u][v] -= b
        c[v][u] += b
      }
      total += b
      aug++
      push(f, {
        op: 'update',
        formula: `augment ${b}; residual forward capacity decreases, reverse capacity increases`,
        nodes: coords(g.n),
        edges: residualEdges(c, path, (_u, _v, remaining) => remaining),
        counters: {
          augmentation: aug,
          bottleneck: b,
          flow: total,
          path: path.join('→'),
        },
      })
    }
    result(
      f,
      g,
      'Edmonds–Karp stops when no residual s→t path; max-flow=min-cut',
      [total, aug],
      { flow: total, augmentations: aug },
    )
  }),
  mission('g-min-cost-flow', 'mincost', (g, f) => {
    const n = g.n,
      cap = Array.from({ length: n }, () => Array(n).fill(0)),
      cost = Array.from({ length: n }, () => Array(n).fill(0))
    for (const [u, v, w] of g.edges) {
      cap[u][v] = w
      cost[u][v] = 1 + ((u + v) % 4)
      cost[v][u] = -cost[u][v]
    }
    let flow = 0,
      total = 0
    while (true) {
      const d = Array(n).fill(Infinity),
        p = Array(n).fill(-1)
      d[0] = 0
      for (let k = 0; k < n - 1; k++)
        for (let u = 0; u < n; u++)
          for (let v = 0; v < n; v++)
            if (cap[u][v] > 0 && d[u] + cost[u][v] < d[v]) {
              d[v] = d[u] + cost[u][v]
              p[v] = u
            }
      if (p[n - 1] === -1) break
      let b = Infinity
      for (let v = n - 1; v !== 0; v = p[v]) b = Math.min(b, cap[p[v]][v])
      const path: number[] = []
      for (let v = n - 1; v !== 0; v = p[v]) path.unshift(v)
      path.unshift(0)
      for (let v = n - 1; v !== 0; v = p[v]) {
        const u = p[v]
        cap[u][v] -= b
        cap[v][u] += b
      }
      flow += b
      total += b * d[n - 1]
      push(f, {
        op: 'relax',
        formula: `shortest residual path cost=${d[n - 1]}; reverse arcs carry negative cost`,
        nodes: coords(n),
        edges: residualEdges(
          cap,
          path,
          (u, v, remaining) => `${remaining} / ${cost[u][v]}`,
        ),
        counters: { flow, cost: total, augmentation: b, path: path.join('→') },
      })
    }
    result(
      f,
      g,
      'successive shortest augmenting paths; reverse arcs allow rerouting',
      [flow, total],
      { flow, cost: total },
    )
  }),
]
