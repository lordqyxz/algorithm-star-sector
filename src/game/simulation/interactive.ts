import type { TraceEdge, TraceFrame, TraceNode } from '../types'

export type LabKind = 'dijkstra' | 'knapsack' | 'maxflow'
export type LabFeedback = {
  key: string
  vars?: Record<string, string | number>
  targets?: string[]
}
export type LabAction =
  | { type: 'settle'; node: string }
  | { type: 'relax'; edge: string }
  | { type: 'cell'; row: number; capacity: number }
  | { type: 'dependency'; row: number; capacity: number }
  | { type: 'decision'; take: boolean }
  | { type: 'backtrack'; take: boolean }
  | { type: 'extend'; edge: string }
  | { type: 'pop' | 'clear' }
  | { type: 'augment'; amount: number }
export type LabChoice = {
  id: string
  key: string
  vars?: Record<string, string | number>
  action: LabAction
  targets?: string[]
}
export type LabResult = {
  state: LabState
  changed: boolean
  feedback: LabFeedback
  complete: boolean
}

type GraphEdge = { id: string; from: string; to: string; weight: number }
type FlowEdge = { id: string; from: string; to: string; capacity: number }
type Item = { id: string; weight: number; value: number }
type Base = { variant: 0 | 1; parameter: number; last: string }
export type DijkstraLab = Base & {
  kind: 'dijkstra'
  phase: 'settle' | 'relax' | 'done'
  nodes: string[]
  edges: GraphEdge[]
  distance: Record<string, number>
  previous: Record<string, string | null>
  settled: string[]
  current: string | null
  pending: string[]
}
export type KnapsackLab = Base & {
  kind: 'knapsack'
  items: Item[]
  capacity: number
  table: number[][]
  row: number
  phase: 'cell' | 'dependency' | 'decision' | 'backtrack' | 'done'
  selected: { row: number; capacity: number } | null
  dependency: { row: number; capacity: number } | null
  backtrackRow: number
  backtrackCapacity: number
  chosen: string[]
}
export type MaxFlowLab = Base & {
  kind: 'maxflow'
  phase: 'path' | 'bottleneck' | 'done'
  nodes: string[]
  edges: FlowEdge[]
  flow: Record<string, number>
  path: string[]
  pathEdges: string[]
  total: number
}
export type LabState = DijkstraLab | KnapsackLab | MaxFlowLab

const positions: Record<string, [number, number]> = {
  s: [0.08, 0.5],
  a: [0.34, 0.18],
  b: [0.35, 0.8],
  c: [0.65, 0.18],
  d: [0.66, 0.8],
  t: [0.92, 0.5],
}
const target = (row: number, capacity: number) => `cell:${row}:${capacity}`
const nodeTarget = (id: string) => `node:${id}`
const edgeTarget = (from: string, to: string) => `edge:${from}:${to}`
const dEdgeTarget = (state: DijkstraLab, id: string) => {
  const e = state.edges.find((e) => e.id === id)!
  return edgeTarget(e.from, e.to)
}
const fEdgeTarget = (state: MaxFlowLab, id: string) => {
  const e = residuals(state).find((e) => e.id === id)!
  return edgeTarget(e.from, e.to)
}
const bad = (
  state: LabState,
  key: string,
  vars?: LabFeedback['vars'],
  targets?: string[],
): LabResult => ({
  state,
  changed: false,
  feedback: { key, vars, targets },
  complete: labIsComplete(state),
})
const good = (
  state: LabState,
  key: string,
  vars?: LabFeedback['vars'],
  targets?: string[],
): LabResult => ({
  state,
  changed: true,
  feedback: { key, vars, targets },
  complete: labIsComplete(state),
})

export function labParameter(kind: LabKind): {
  min: number
  max: number
  step: number
  default: number
} {
  return kind === 'knapsack'
    ? { min: 4, max: 10, step: 1, default: 7 }
    : { min: 1, max: 9, step: 1, default: kind === 'dijkstra' ? 4 : 2 }
}

export function createLab(
  kind: LabKind,
  variant: 0 | 1,
  parameter = labParameter(kind).default,
): LabState {
  const range = labParameter(kind)
  if (
    !Number.isInteger(parameter) ||
    parameter < range.min ||
    parameter > range.max
  )
    throw new RangeError('lab parameter')
  if (kind === 'dijkstra') {
    const edges: GraphEdge[] =
      variant === 0
        ? [
            { id: 'sa', from: 's', to: 'a', weight: 2 },
            { id: 'sb', from: 's', to: 'b', weight: 2 },
            { id: 'ac', from: 'a', to: 'c', weight: parameter },
            { id: 'bc', from: 'b', to: 'c', weight: 4 },
            { id: 'bd', from: 'b', to: 'd', weight: 3 },
            { id: 'cd', from: 'c', to: 'd', weight: 1 },
            { id: 'ct', from: 'c', to: 't', weight: 3 },
            { id: 'dt', from: 'd', to: 't', weight: 2 },
          ]
        : [
            { id: 'sa', from: 's', to: 'a', weight: 3 },
            { id: 'sb', from: 's', to: 'b', weight: 1 },
            { id: 'ba', from: 'b', to: 'a', weight: 2 },
            { id: 'ac', from: 'a', to: 'c', weight: 2 },
            { id: 'bc', from: 'b', to: 'c', weight: 6 },
            { id: 'bd', from: 'b', to: 'd', weight: parameter },
            { id: 'cd', from: 'c', to: 'd', weight: 1 },
            { id: 'ct', from: 'c', to: 't', weight: 4 },
            { id: 'dt', from: 'd', to: 't', weight: 2 },
          ]
    const nodes = ['s', 'a', 'b', 'c', 'd', 't']
    return {
      kind,
      variant,
      parameter,
      last: 'start',
      phase: 'settle',
      nodes,
      edges,
      distance: Object.fromEntries(
        nodes.map((n) => [n, n === 's' ? 0 : Infinity]),
      ),
      previous: Object.fromEntries(nodes.map((n) => [n, null])),
      settled: [],
      current: null,
      pending: [],
    }
  }
  if (kind === 'knapsack') {
    const items = (
      variant === 0
        ? [
            [2, 3],
            [3, 4],
            [4, 5],
            [5, 8],
          ]
        : [
            [2, 4],
            [2, 4],
            [3, 5],
            [4, 7],
          ]
    ).map(([weight, value], i) => ({ id: `item:i${i}`, weight, value }))
    const table = Array.from(
      { length: 5 },
      () => Array(parameter + 1).fill(0) as number[],
    )
    for (let i = 1; i <= 4; i++)
      for (let c = 1; c <= parameter; c++) {
        const item = items[i - 1]
        table[i][c] = Math.max(
          table[i - 1][c],
          item.weight <= c
            ? item.value + table[i - 1][c - item.weight]
            : -Infinity,
        )
      }
    return {
      kind,
      variant,
      parameter,
      last: 'start',
      items,
      capacity: parameter,
      table,
      row: 1,
      phase: 'cell',
      selected: null,
      dependency: null,
      backtrackRow: 4,
      backtrackCapacity: parameter,
      chosen: [],
    }
  }
  const edges: FlowEdge[] =
    variant === 0
      ? [
          { id: 'sa', from: 's', to: 'a', capacity: parameter },
          { id: 'sb', from: 's', to: 'b', capacity: 2 },
          { id: 'ab', from: 'a', to: 'b', capacity: 2 },
          { id: 'at', from: 'a', to: 't', capacity: 2 },
          { id: 'bt', from: 'b', to: 't', capacity: 2 },
        ]
      : [
          { id: 'sa', from: 's', to: 'a', capacity: 3 },
          { id: 'sb', from: 's', to: 'b', capacity: parameter },
          { id: 'ab', from: 'a', to: 'b', capacity: 2 },
          { id: 'at', from: 'a', to: 't', capacity: 2 },
          { id: 'bt', from: 'b', to: 't', capacity: 3 },
        ]
  return {
    kind,
    variant,
    parameter,
    last: 'start',
    phase: 'path',
    nodes: ['s', 'a', 'b', 't'],
    edges,
    flow: Object.fromEntries(edges.map((e) => [e.id, 0])),
    path: ['s'],
    pathEdges: [],
    total: 0,
  }
}

function residuals(state: MaxFlowLab) {
  return state.edges.flatMap((e) => [
    {
      id: `${e.id}:f`,
      from: e.from,
      to: e.to,
      remaining: e.capacity - state.flow[e.id],
      origin: e.id,
      reverse: false,
    },
    {
      id: `${e.id}:r`,
      from: e.to,
      to: e.from,
      remaining: state.flow[e.id],
      origin: e.id,
      reverse: true,
    },
  ])
}

/** Derive the edited edge from the actual input family, rather than a scene-side name. */
export function labParameterTarget(state: LabState): string | null {
  if (state.kind === 'knapsack') return null
  const range = labParameter(state.kind)
  const low = createLab(state.kind, state.variant, range.min)
  const high = createLab(state.kind, state.variant, range.max)
  if (low.kind === 'dijkstra' && high.kind === 'dijkstra') {
    const edge = low.edges.find(item => high.edges.some(other => other.id === item.id && other.weight !== item.weight))
    return edge ? `${edge.from}→${edge.to}` : null
  }
  if (low.kind === 'maxflow' && high.kind === 'maxflow') {
    const edge = low.edges.find(item => high.edges.some(other => other.id === item.id && other.capacity !== item.capacity))
    return edge ? `${edge.from}→${edge.to}` : null
  }
  return null
}
function reachable(state: MaxFlowLab) {
  const seen = new Set(['s']),
    queue = ['s'],
    edges = residuals(state)
  for (let i = 0; i < queue.length; i++)
    for (const e of edges)
      if (e.from === queue[i] && e.remaining > 0 && !seen.has(e.to)) {
        seen.add(e.to)
        queue.push(e.to)
      }
  return seen
}
export function labIsComplete(state: LabState): boolean {
  return state.kind === 'dijkstra'
    ? state.settled.length === state.nodes.length && state.current === null
    : state.kind === 'knapsack'
      ? state.phase === 'done'
      : !reachable(state).has('t') && state.pathEdges.length === 0
}

export type LabSummary = {
  value: number
  labelKey: string
  vars: Record<string, string | number>
}
export function labReference(state: LabState): LabSummary {
  if (state.kind === 'dijkstra') {
    const visit = (node: string, seen: Set<string>): number =>
      node === 't'
        ? 0
        : Math.min(
            Infinity,
            ...state.edges
              .filter((e) => e.from === node && !seen.has(e.to))
              .map((e) => e.weight + visit(e.to, new Set([...seen, e.to]))),
          )
    const value = visit('s', new Set(['s']))
    return {
      value,
      labelKey: 'lab.summary.distance',
      vars: { value, target: 't' },
    }
  }
  if (state.kind === 'knapsack') {
    let value = 0
    for (let mask = 0; mask < 16; mask++) {
      const selected = state.items.filter((_, i) => mask & (1 << i))
      if (
        selected.reduce((sum, item) => sum + item.weight, 0) <= state.capacity
      )
        value = Math.max(
          value,
          selected.reduce((sum, item) => sum + item.value, 0),
        )
    }
    return {
      value,
      labelKey: 'lab.summary.optimum',
      vars: { value, capacity: state.capacity },
    }
  }
  let value = Infinity
  const internal = state.nodes.filter((n) => n !== 's' && n !== 't')
  for (let mask = 0; mask < 1 << internal.length; mask++) {
    const side = new Set(['s', ...internal.filter((_, i) => mask & (1 << i))])
    value = Math.min(
      value,
      state.edges
        .filter((e) => side.has(e.from) && !side.has(e.to))
        .reduce((sum, e) => sum + e.capacity, 0),
    )
  }
  return { value, labelKey: 'lab.summary.flow', vars: { value } }
}
export function labSummary(state: LabState): LabSummary {
  const value =
    state.kind === 'dijkstra'
      ? state.distance.t
      : state.kind === 'knapsack'
        ? state.chosen.reduce(
            (sum, id) =>
              sum + state.items.find((item) => item.id === id)!.value,
            0,
          )
        : state.total
  return {
    value,
    labelKey:
      state.kind === 'dijkstra'
        ? 'lab.summary.distance'
        : state.kind === 'knapsack'
          ? 'lab.summary.optimum'
          : 'lab.summary.flow',
    vars: { value, complete: labIsComplete(state) ? 1 : 0 },
  }
}

export function labChoices(state: LabState): LabChoice[] {
  if (labIsComplete(state)) return []
  if (state.kind === 'dijkstra') {
    if (state.current)
      return state.pending.map((id) => ({
        id: `relax-${id}`,
        key: 'lab.choice.relax',
        vars: { edge: id },
        action: { type: 'relax', edge: id },
        targets: [dEdgeTarget(state, id)],
      }))
    return state.nodes
      .filter((n) => !state.settled.includes(n))
      .map((node) => ({
        id: `settle-${node}`,
        key: 'lab.choice.settle',
        vars: {
          node,
          distance: Number.isFinite(state.distance[node])
            ? state.distance[node]
            : '∞',
        },
        action: { type: 'settle', node },
        targets: [nodeTarget(node)],
      }))
  }
  if (state.kind === 'knapsack') {
    if (state.phase === 'cell')
      return Array.from({ length: state.capacity }, (_, i) => ({
        id: target(state.row, i + 1),
        key: 'lab.choice.cell',
        vars: { row: state.row, capacity: i + 1 },
        action: { type: 'cell', row: state.row, capacity: i + 1 },
        targets: [target(state.row, i + 1)],
      }))
    if (state.phase === 'dependency') {
      const { row, capacity } = state.selected!
      return Array.from({ length: state.capacity + 1 }, (_, c) => ({
        id: target(row - 1, c),
        key: 'lab.choice.dependency',
        vars: { row: row - 1, capacity: c },
        action: { type: 'dependency', row: row - 1, capacity: c },
        targets: [target(row - 1, c)],
      }))
    }
    if (state.phase === 'decision')
      return [false, true].map((take) => ({
        id: `decision-${take}`,
        key: take ? 'lab.choice.take' : 'lab.choice.skip',
        action: { type: 'decision', take },
        targets: [target(state.selected!.row, state.selected!.capacity)],
      }))
    return [false, true].map((take) => ({
      id: `backtrack-${take}`,
      key: take ? 'lab.choice.take' : 'lab.choice.skip',
      action: { type: 'backtrack', take },
      targets: [
        target(state.backtrackRow, state.backtrackCapacity),
        state.items[state.backtrackRow - 1].id,
      ],
    }))
  }
  const pathEnd = state.path.at(-1)!
  const choices: LabChoice[] =
    state.path.at(-1) === 't'
      ? Array.from(
          new Set(
            state.pathEdges.map(
              (id) => residuals(state).find((e) => e.id === id)!.remaining,
            ),
          ),
        )
          .concat([1, 2, 3, 4, 5, 6, 7, 8, 9])
          .filter((n, i, a) => a.indexOf(n) === i)
          .sort((a, b) => a - b)
          .map((amount) => ({
            id: `augment-${amount}`,
            key: 'lab.choice.augment',
            vars: { amount },
            action: { type: 'augment', amount },
            targets: state.pathEdges.map((id) => fEdgeTarget(state, id)),
          }))
      : residuals(state)
          .filter((e) => e.from === pathEnd && !state.path.includes(e.to))
          .map((e) => ({
            id: `extend-${e.id}`,
            key: 'lab.choice.extend',
            vars: { edge: e.id, remaining: e.remaining },
            action: { type: 'extend', edge: e.id },
            targets: [edgeTarget(e.from, e.to)],
          }))
  if (state.pathEdges.length)
    choices.push(
      {
        id: 'pop',
        key: 'lab.choice.pop',
        action: { type: 'pop' },
        targets: [fEdgeTarget(state, state.pathEdges.at(-1)!)],
      },
      {
        id: 'clear',
        key: 'lab.choice.clear',
        action: { type: 'clear' },
        targets: state.pathEdges.map((id) => fEdgeTarget(state, id)),
      },
    )
  return choices
}

export function applyLabAction(state: LabState, action: LabAction): LabResult {
  if (labIsComplete(state)) return bad(state, 'lab.feedback.complete')
  if (state.kind === 'dijkstra') {
    if (action.type === 'settle') {
      if (state.current)
        return bad(
          state,
          'lab.feedback.relaxFirst',
          { node: state.current },
          state.pending.map((id) => dEdgeTarget(state, id)),
        )
      const min = Math.min(
        ...state.nodes
          .filter((n) => !state.settled.includes(n))
          .map((n) => state.distance[n]),
      )
      if (
        !state.nodes.includes(action.node) ||
        state.settled.includes(action.node) ||
        state.distance[action.node] !== min
      )
        return bad(
          state,
          'lab.feedback.minimum',
          {
            minimum: min,
            current: Number.isFinite(state.distance[action.node])
              ? state.distance[action.node]
              : '∞',
          },
          state.nodes
            .filter(
              (n) => !state.settled.includes(n) && state.distance[n] === min,
            )
            .map(nodeTarget),
        )
      const pending = state.edges
        .filter((e) => e.from === action.node)
        .map((e) => e.id)
      return good(
        {
          ...state,
          last: 'settle',
          settled: [...state.settled, action.node],
          current: pending.length ? action.node : null,
          pending,
          phase:
            state.settled.length + 1 === state.nodes.length
              ? 'done'
              : pending.length
                ? 'relax'
                : 'settle',
        },
        'lab.feedback.settled',
        { node: action.node, distance: min },
        [nodeTarget(action.node)],
      )
    }
    if (action.type !== 'relax') return bad(state, 'lab.feedback.invalid')
    if (!state.current || !state.pending.includes(action.edge))
      return bad(
        state,
        'lab.feedback.edgePending',
        undefined,
        state.pending.map((id) => dEdgeTarget(state, id)),
      )
    const edge = state.edges.find((e) => e.id === action.edge)!
    const candidate = state.distance[edge.from] + edge.weight
    const distance = { ...state.distance },
      previous = { ...state.previous }
    const improved = candidate < distance[edge.to]
    if (improved) {
      distance[edge.to] = candidate
      previous[edge.to] = edge.from
    }
    const pending = state.pending.filter((id) => id !== action.edge)
    return good(
      {
        ...state,
        last: 'relax',
        distance,
        previous,
        pending,
        current: pending.length ? state.current : null,
        phase: pending.length ? 'relax' : 'settle',
      },
      improved ? 'lab.feedback.improved' : 'lab.feedback.unchanged',
      { node: edge.to, candidate, distance: distance[edge.to] },
      [edgeTarget(edge.from, edge.to), nodeTarget(edge.to)],
    )
  }
  if (state.kind === 'knapsack') {
    if (state.phase === 'cell' && action.type === 'cell') {
      if (action.row !== state.row || action.capacity !== state.capacity)
        return bad(
          state,
          'lab.feedback.cellReady',
          { row: state.row, capacity: state.capacity },
          [target(state.row, state.capacity)],
        )
      return good(
        {
          ...state,
          last: 'select',
          phase: 'dependency',
          selected: { row: action.row, capacity: action.capacity },
        },
        'lab.feedback.cellSelected',
        { row: action.row, capacity: action.capacity },
        [target(action.row, action.capacity)],
      )
    }
    if (state.phase === 'dependency' && action.type === 'dependency') {
      const { row, capacity } = state.selected!,
        item = state.items[row - 1]
      const required =
        capacity >= item.weight ? capacity - item.weight : capacity
      if (action.row !== row - 1 || action.capacity !== required)
        return bad(
          state,
          'lab.feedback.dependency',
          { row: row - 1, capacity: required },
          [target(row - 1, required)],
        )
      return good(
        {
          ...state,
          last: 'select',
          phase: 'decision',
          dependency: { row: action.row, capacity: action.capacity },
        },
        'lab.feedback.dependencySelected',
        { row: action.row, capacity: action.capacity },
        [target(action.row, action.capacity)],
      )
    }
    if (state.phase === 'decision' && action.type === 'decision') {
      const { row, capacity } = state.selected!,
        item = state.items[row - 1]
      const skip = state.table[row - 1][capacity]
      const take =
        capacity >= item.weight
          ? item.value + state.table[row - 1][capacity - item.weight]
          : -Infinity
      if ((action.take ? take : skip) !== state.table[row][capacity])
        return bad(
          state,
          'lab.feedback.decision',
          {
            skip,
            take: Number.isFinite(take) ? take : '-∞',
            best: state.table[row][capacity],
          },
          [target(row, capacity)],
        )
      const nextRow = row + 1
      return good(
        {
          ...state,
          last: 'update',
          row: nextRow,
          phase: nextRow > 4 ? 'backtrack' : 'cell',
          selected: null,
          dependency: null,
        },
        'lab.feedback.rowComputed',
        { row, value: state.table[row][capacity] },
        [target(row, capacity)],
      )
    }
    if (state.phase === 'backtrack' && action.type === 'backtrack') {
      const row = state.backtrackRow,
        capacity = state.backtrackCapacity,
        item = state.items[row - 1]
      const skip = state.table[row - 1][capacity],
        take =
          capacity >= item.weight
            ? item.value + state.table[row - 1][capacity - item.weight]
            : -Infinity
      if ((action.take ? take : skip) !== state.table[row][capacity])
        return bad(
          state,
          'lab.feedback.backtrack',
          { row, capacity, best: state.table[row][capacity] },
          [target(row, capacity), item.id],
        )
      const nextRow = row - 1
      return good(
        {
          ...state,
          last: nextRow ? 'select' : 'done',
          backtrackRow: nextRow,
          backtrackCapacity: action.take ? capacity - item.weight : capacity,
          chosen: action.take ? [item.id, ...state.chosen] : state.chosen,
          phase: nextRow ? 'backtrack' : 'done',
        },
        action.take ? 'lab.feedback.itemTaken' : 'lab.feedback.itemSkipped',
        { item: row, capacity },
        [item.id, target(row, capacity)],
      )
    }
    return bad(state, 'lab.feedback.phase')
  }
  if (action.type === 'pop') {
    if (!state.pathEdges.length) return bad(state, 'lab.feedback.emptyPath')
    return good(
      {
        ...state,
        last: 'remove',
        phase: 'path',
        path: state.path.slice(0, -1),
        pathEdges: state.pathEdges.slice(0, -1),
      },
      'lab.feedback.pathPopped',
    )
  }
  if (action.type === 'clear') {
    if (!state.pathEdges.length) return bad(state, 'lab.feedback.emptyPath')
    return good(
      { ...state, last: 'remove', phase: 'path', path: ['s'], pathEdges: [] },
      'lab.feedback.pathCleared',
    )
  }
  if (action.type === 'extend') {
    if (state.path.at(-1) === 't')
      return bad(state, 'lab.feedback.augmentFirst', undefined, state.pathEdges)
    const edge = residuals(state).find((e) => e.id === action.edge)
    if (
      !edge ||
      edge.from !== state.path.at(-1) ||
      edge.remaining <= 0 ||
      state.path.includes(edge.to)
    )
      return bad(
        state,
        'lab.feedback.residual',
        { current: state.path.at(-1)! },
        residuals(state)
          .filter(
            (e) =>
              e.from === state.path.at(-1) &&
              e.remaining > 0 &&
              !state.path.includes(e.to),
          )
          .map((e) => edgeTarget(e.from, e.to)),
      )
    return good(
      {
        ...state,
        last: 'select',
        phase: edge.to === 't' ? 'bottleneck' : 'path',
        path: [...state.path, edge.to],
        pathEdges: [...state.pathEdges, edge.id],
      },
      'lab.feedback.pathExtended',
      { remaining: edge.remaining },
      [edgeTarget(edge.from, edge.to)],
    )
  }
  if (action.type === 'augment') {
    if (state.path.at(-1) !== 't') return bad(state, 'lab.feedback.reachSink')
    const residual = residuals(state),
      bottleneck = Math.min(
        ...state.pathEdges.map(
          (id) => residual.find((e) => e.id === id)!.remaining,
        ),
      )
    if (action.amount !== bottleneck)
      return bad(
        state,
        'lab.feedback.bottleneck',
        { bottleneck, amount: action.amount },
        state.pathEdges
          .filter(
            (id) => residual.find((e) => e.id === id)!.remaining === bottleneck,
          )
          .map((id) => fEdgeTarget(state, id)),
      )
    const flow = { ...state.flow }
    for (const id of state.pathEdges) {
      const edge = residual.find((e) => e.id === id)!
      flow[edge.origin] += edge.reverse ? -bottleneck : bottleneck
    }
    const next: MaxFlowLab = {
      ...state,
      last: 'update',
      phase: 'path',
      flow,
      path: ['s'],
      pathEdges: [],
      total: state.total + bottleneck,
    }
    next.phase = labIsComplete(next) ? 'done' : 'path'
    return good(
      next,
      'lab.feedback.augmented',
      { amount: bottleneck, total: state.total + bottleneck },
      state.pathEdges.map((id) => fEdgeTarget(state, id)),
    )
  }
  return bad(state, 'lab.feedback.invalid')
}

export function labHint(state: LabState, level = 1): LabFeedback {
  if (labIsComplete(state)) return { key: 'lab.hint.complete' }
  if (state.kind === 'dijkstra') {
    if (state.current)
      return {
        key: 'lab.hint.relax',
        vars: level > 1 ? { node: state.current } : undefined,
        targets:
          level > 1
            ? state.pending.slice(0, 1).map((id) => dEdgeTarget(state, id))
            : [],
      }
    const min = Math.min(
      ...state.nodes
        .filter((n) => !state.settled.includes(n))
        .map((n) => state.distance[n]),
    )
    return {
      key: 'lab.hint.minimum',
      vars: level > 1 ? { distance: min } : undefined,
      targets:
        level > 1
          ? state.nodes
              .filter(
                (n) => !state.settled.includes(n) && state.distance[n] === min,
              )
              .map(nodeTarget)
          : [],
    }
  }
  if (state.kind === 'knapsack') {
    if (state.phase === 'cell')
      return {
        key: 'lab.hint.cell',
        vars:
          level > 1 ? { row: state.row, capacity: state.capacity } : undefined,
        targets: level > 1 ? [target(state.row, state.capacity)] : [],
      }
    if (state.phase === 'dependency') {
      const { row, capacity } = state.selected!,
        weight = state.items[row - 1].weight,
        required = weight <= capacity ? capacity - weight : capacity
      return {
        key: 'lab.hint.dependency',
        vars: level > 1 ? { row: row - 1, capacity: required } : undefined,
        targets: level > 1 ? [target(row - 1, required)] : [],
      }
    }
    if (state.phase === 'decision' || state.phase === 'backtrack') {
      const row =
        state.phase === 'decision' ? state.selected!.row : state.backtrackRow
      const capacity =
        state.phase === 'decision'
          ? state.selected!.capacity
          : state.backtrackCapacity
      const item = state.items[row - 1],
        skip = state.table[row - 1][capacity]
      const fits = item.weight <= capacity
      const take = fits
        ? item.value + state.table[row - 1][capacity - item.weight]
        : null
      return {
        key:
          state.phase === 'decision'
            ? 'lab.hint.decision'
            : 'lab.hint.backtrack',
        vars:
          level > 1
            ? { skip, take: take ?? '—', best: state.table[row][capacity] }
            : undefined,
        targets:
          level > 1
            ? [
                target(row - 1, capacity),
                ...(fits ? [target(row - 1, capacity - item.weight)] : []),
              ]
            : [],
      }
    }
    return { key: 'lab.hint.complete' }
  }
  if (state.path.at(-1) === 't')
    return {
      key: 'lab.hint.bottleneck',
      vars:
        level > 1
          ? {
              amount: Math.min(
                ...state.pathEdges.map(
                  (id) => residuals(state).find((e) => e.id === id)!.remaining,
                ),
              ),
            }
          : undefined,
      targets:
        level > 1 ? state.pathEdges.map((id) => fEdgeTarget(state, id)) : [],
    }
  return {
    key: 'lab.hint.path',
    targets:
      level > 1
        ? labChoices(state)
            .filter(
              (c) =>
                c.action.type === 'extend' &&
                residuals(state).find(
                  (e) =>
                    e.id ===
                    (c.action as Extract<LabAction, { type: 'extend' }>).edge,
                )!.remaining > 0,
            )
            .flatMap((c) => c.targets ?? [])
        : [],
  }
}

export function labDemoAction(state: LabState): LabAction | null {
  if (labIsComplete(state)) return null
  if (state.kind === 'dijkstra') {
    if (state.current) return { type: 'relax', edge: state.pending[0] }
    const minimum = Math.min(
      ...state.nodes
        .filter((n) => !state.settled.includes(n))
        .map((n) => state.distance[n]),
    )
    return {
      type: 'settle',
      node: state.nodes.find(
        (n) => !state.settled.includes(n) && state.distance[n] === minimum,
      )!,
    }
  }
  if (state.kind === 'knapsack') {
    if (state.phase === 'cell')
      return { type: 'cell', row: state.row, capacity: state.capacity }
    if (state.phase === 'dependency') {
      const { row, capacity } = state.selected!,
        item = state.items[row - 1]
      return {
        type: 'dependency',
        row: row - 1,
        capacity: item.weight <= capacity ? capacity - item.weight : capacity,
      }
    }
    if (state.phase === 'decision') {
      const { row, capacity } = state.selected!,
        item = state.items[row - 1]
      return {
        type: 'decision',
        take:
          item.weight <= capacity &&
          item.value + state.table[row - 1][capacity - item.weight] >=
            state.table[row - 1][capacity],
      }
    }
    const row = state.backtrackRow,
      capacity = state.backtrackCapacity,
      item = state.items[row - 1]
    return {
      type: 'backtrack',
      take:
        item.weight <= capacity &&
        item.value + state.table[row - 1][capacity - item.weight] >=
          state.table[row - 1][capacity],
    }
  }
  if (state.path.at(-1) === 't')
    return {
      type: 'augment',
      amount: Math.min(
        ...state.pathEdges.map(
          (id) => residuals(state).find((e) => e.id === id)!.remaining,
        ),
      ),
    }
  const current = state.path.at(-1)!,
    edges = residuals(state).filter((e) => e.remaining > 0)
  const queue: { node: string; first: string | null }[] = [
      { node: current, first: null },
    ],
    seen = new Set(state.path)
  for (let i = 0; i < queue.length; i++) {
    for (const edge of edges.filter(
      (e) => e.from === queue[i].node && !seen.has(e.to),
    )) {
      const first = queue[i].first ?? edge.id
      if (edge.to === 't') return { type: 'extend', edge: first }
      seen.add(edge.to)
      queue.push({ node: edge.to, first })
    }
  }
  return state.pathEdges.length ? { type: 'clear' } : null
}

export function labFrame(state: LabState): TraceFrame {
  if (state.kind === 'dijkstra') {
    const nodes: TraceNode[] = state.nodes.map((id) => ({
      id,
      value: Number.isFinite(state.distance[id]) ? state.distance[id] : '∞',
      label: id,
      x: positions[id][0],
      y: positions[id][1],
      tone:
        state.current === id
          ? 'active'
          : state.settled.includes(id)
            ? 'settled'
            : undefined,
    }))
    const edges: TraceEdge[] = state.edges.map((e) => ({
      from: e.from,
      to: e.to,
      weight: e.weight,
      directed: true,
      tone: state.pending.includes(e.id) ? 'active' : undefined,
    }))
    return {
      op: labIsComplete(state)
        ? 'done'
        : state.last === 'settle'
          ? 'visit'
          : state.last === 'relax'
            ? 'relax'
            : 'start',
      formula: 'd(v)\\gets\\min(d(v),d(u)+w(u,v))',
      nodes,
      edges,
      counters: {
        settled: state.settled.length,
        current: state.current ?? '',
        pending: state.pending.length,
      },
      result: { distance: state.distance, previous: state.previous },
    }
  }
  if (state.kind === 'knapsack') {
    return {
      op: labIsComplete(state)
        ? 'done'
        : state.last === 'select'
          ? 'select'
          : state.last === 'update'
            ? 'update'
            : 'start',
      formula: String.raw`D[i,c]=\begin{cases}D[i-1,c],&c<w_i\\\max(D[i-1,c],v_i+D[i-1,c-w_i]),&c\geq w_i\end{cases}`,
      items: state.items.map((item) => ({
        id: item.id,
        value: item.value,
        label: `w=${item.weight}`,
        tone: state.chosen.includes(item.id) ? 'active' : undefined,
      })),
      matrix: {
        rows: Array.from({ length: 5 }, (_, i) => String(i)),
        columns: Array.from({ length: state.capacity + 1 }, (_, i) =>
          String(i),
        ),
        values: state.table.map((r, i) =>
          r.map((v) =>
            i === 0 ||
            state.phase === 'backtrack' ||
            state.phase === 'done' ||
            i < state.row
              ? v
              : '',
          ),
        ),
        active: state.selected
          ? [state.selected.row, state.selected.capacity]
          : state.phase === 'backtrack'
            ? [state.backtrackRow, state.backtrackCapacity]
            : undefined,
      },
      counters: {
        capacity: state.capacity,
        row: state.row,
        optimum: labIsComplete(state) ? state.table[4][state.capacity] : '',
        selectedWeight: state.chosen.reduce(
          (n, id) => n + state.items.find((item) => item.id === id)!.weight,
          0,
        ),
        selectedValue: state.chosen.reduce(
          (n, id) => n + state.items.find((item) => item.id === id)!.value,
          0,
        ),
      },
      result: {
        optimum: state.table[4][state.capacity],
        chosen: state.chosen,
        table: state.table,
      },
    }
  }
  const residual = residuals(state),
    seen = reachable(state),
    nodes: TraceNode[] = state.nodes.map((id) => ({
      id,
      value: id,
      x: positions[id][0],
      y: positions[id][1],
      tone: state.path.includes(id) ? 'active' : undefined,
    }))
  const edges: TraceEdge[] = residual
    .filter((e) => e.remaining > 0 || state.pathEdges.includes(e.id))
    .map((e) => ({
      from: e.from,
      to: e.to,
      directed: true,
      weight: e.remaining,
      tone: state.pathEdges.includes(e.id) ? 'active' : undefined,
      saturated: e.remaining === 0,
    }))
  const cut = state.edges
    .filter((e) => seen.has(e.from) && !seen.has(e.to))
    .map((e) => e.id)
  return {
    op: labIsComplete(state)
      ? 'done'
      : state.last === 'update'
        ? 'update'
        : state.last === 'select'
          ? 'select'
          : 'start',
    formula: labIsComplete(state)
      ? '|f|=c(S,T)'
      : String.raw`r_{uv}=c_{uv}-f_{uv},\quad r_{vu}=f_{uv}`,
    nodes,
    edges,
    counters: {
      flow: state.total,
      path: state.path.join('→'),
      bottleneck:
        state.path.at(-1) === 't'
          ? Math.min(
              ...state.pathEdges.map(
                (id) => residual.find((e) => e.id === id)!.remaining,
              ),
            )
          : 0,
      cutCapacity: labIsComplete(state)
        ? state.edges
            .filter((e) => cut.includes(e.id))
            .reduce((n, e) => n + e.capacity, 0)
        : '',
    },
    result: {
      flow: state.total,
      edgeFlow: state.flow,
      cut: labIsComplete(state) ? cut : [],
      cutCapacity: labIsComplete(state)
        ? state.edges
            .filter((e) => cut.includes(e.id))
            .reduce((n, e) => n + e.capacity, 0)
        : undefined,
    },
  }
}
