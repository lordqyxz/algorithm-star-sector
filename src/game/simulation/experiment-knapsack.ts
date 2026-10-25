import type { TraceFrame } from '../types'
import type { ExperimentAction, ExperimentAdapter, ExperimentBase, ExperimentChoice, ExperimentFact, ExperimentField, ExperimentReport, ExperimentTransition } from './experiment-types'

type CellRef = { row: number; capacity: number }
type Cell = { value: number; mask: number; source: 'auto' | 'manual'; certified: boolean }
type Draft = { skip?: CellRef; take?: CellRef }
export type KnapsackExperiment = ExperimentBase & {
  kind: 'knapsack'
  input: { capacity: number; weights: number[]; values: number[] }
  cells: Record<string, Cell>
  selectedCell: CellRef | null
  draftDependency: Draft
  selectedItems: string[]
}

const itemId = (i: number) => `item${i + 1}`
const key = (row: number, capacity: number) => `${row}:${capacity}`
const fact = (key: string, vars?: Record<string, string | number>, tone?: ExperimentFact['tone'], targets?: string[]): ExperimentFact => ({ key, vars, tone, targets })
const same = (a: CellRef | undefined, b: CellRef) => !!a && a.row === b.row && a.capacity === b.capacity
const base: Cell = { value: 0, mask: 0, source: 'auto', certified: true }
const presets = [
  { capacity: 7, weights: [2, 3, 4, 5], values: [4, 5, 7, 8] },
  { capacity: 8, weights: [2, 3, 5, 6], values: [4, 6, 10, 12] },
] as const

function checkedInput(variant: 0 | 1, overrides: Record<string, number> = {}): KnapsackExperiment['input'] {
  const preset = presets[variant]
  const allowed = new Set(['capacity', ...Array.from({ length: 4 }, (_, i) => [`w${i + 1}`, `v${i + 1}`]).flat()])
  for (const [name, value] of Object.entries(overrides)) {
    if (!allowed.has(name) || !Number.isInteger(value) || !Number.isFinite(value)) throw new RangeError(`Invalid knapsack input: ${name}`)
  }
  const capacity = overrides.capacity ?? preset.capacity
  const weights = preset.weights.map((x, i) => overrides[`w${i + 1}`] ?? x)
  const values = preset.values.map((x, i) => overrides[`v${i + 1}`] ?? x)
  if (capacity < 1 || capacity > 12 || weights.some((x) => x < 1 || x > 9) || values.some((x) => x < 1 || x > 20)) throw new RangeError('Knapsack input out of range')
  return { capacity, weights, values }
}

function create(variant: 0 | 1, input?: Record<string, number>): KnapsackExperiment {
  return { kind: 'knapsack', variant, input: checkedInput(variant, input), verified: false, policy: true,
    costs: { userActions: 0, decisions: 0, autoCells: 0, tests: 0 }, cells: {}, selectedCell: null,
    draftDependency: {}, selectedItems: [] }
}

function at(state: KnapsackExperiment, row: number, capacity: number): Cell | undefined {
  return row === 0 ? base : state.cells[key(row, capacity)]
}

/** Fill only prerequisites, never the target cell. Existing manual choices remain authoritative. */
function expand(state: KnapsackExperiment, row: number, capacity: number): number {
  if (row === 0 || state.cells[key(row, capacity)]) return 0
  const skipCount = expand(state, row - 1, capacity)
  const weight = state.input.weights[row - 1]!
  const takeCount = weight <= capacity ? expand(state, row - 1, capacity - weight) : 0
  const skip = at(state, row - 1, capacity)!
  const take = weight <= capacity ? at(state, row - 1, capacity - weight)! : undefined
  const takeValue = take ? state.input.values[row - 1]! + take.value : -Infinity
  const best = takeValue > skip.value
    ? { value: takeValue, mask: take!.mask | (1 << (row - 1)) }
    : { value: skip.value, mask: skip.mask }
  state.cells[key(row, capacity)] = { ...best, source: 'auto', certified: best.value === reference(state, row, capacity) }
  return skipCount + takeCount + 1
}

function reference(state: KnapsackExperiment, row: number, capacity: number): number {
  const dp = Array(capacity + 1).fill(0) as number[]
  for (let i = 0; i < row; i++) for (let c = capacity; c >= state.input.weights[i]!; c--)
    dp[c] = Math.max(dp[c]!, dp[c - state.input.weights[i]!]! + state.input.values[i]!)
  return dp[capacity]!
}

function oracle(state: KnapsackExperiment): number {
  let best = 0
  for (let mask = 0; mask < 16; mask++) {
    let weight = 0, value = 0
    for (let i = 0; i < 4; i++) if (mask & (1 << i)) { weight += state.input.weights[i]!; value += state.input.values[i]! }
    if (weight <= state.input.capacity) best = Math.max(best, value)
  }
  return best
}

function totals(state: KnapsackExperiment): { weight: number; value: number } {
  return state.selectedItems.reduce((sum, id) => {
    const i = Number(id.slice(4)) - 1
    return { weight: sum.weight + state.input.weights[i]!, value: sum.value + state.input.values[i]! }
  }, { weight: 0, value: 0 })
}

function refreshPolicy(state: KnapsackExperiment): void {
  let allCertified = true
  for (const [coord, cell] of Object.entries(state.cells)) {
    const [row, capacity] = coord.split(':').map(Number)
    cell.certified = cell.value === reference(state, row!, capacity!)
    if (!cell.certified) allCertified = false
  }
  state.policy = allCertified
}

function apply(original: KnapsackExperiment, action: ExperimentAction): ExperimentTransition<KnapsackExperiment> {
  const state = structuredClone(original)
  const done = (feedback: ExperimentFact, changed = true): ExperimentTransition<KnapsackExperiment> => ({ state: changed ? state : original, changed, feedback })
  const selected = state.selectedCell
  if (action.type === 'selectCell') {
    const { row, capacity } = action
    if (!Number.isInteger(row) || !Number.isInteger(capacity) || row! < 1 || row! > 4 || capacity! < 0 || capacity! > state.input.capacity) return done(fact('experiment.knapsack.invalidCell', undefined, 'bad'), false)
    state.selectedCell = { row: row!, capacity: capacity! }
    state.draftDependency = {}
    state.costs.userActions++
    return done(fact('experiment.knapsack.cellSelected', { row: row!, capacity: capacity! }, 'neutral', [key(row!, capacity!)]))
  }
  if (action.type === 'connectDependency') {
    if (!selected || typeof action.take !== 'boolean' || !Number.isInteger(action.row) || !Number.isInteger(action.capacity) || action.row! < 0 || action.row! > 4 || action.capacity! < 0 || action.capacity! > state.input.capacity) return done(fact('experiment.knapsack.invalidDependency', undefined, 'bad'), false)
    const target = { row: action.row!, capacity: action.capacity! }
    state.draftDependency[action.take ? 'take' : 'skip'] = target
    state.costs.userActions++
    const expected = { row: selected.row - 1, capacity: selected.capacity - (action.take ? state.input.weights[selected.row - 1]! : 0) }
    const valid = expected.capacity >= 0 && same(target, expected)
    const sameRow = target.row === selected.row
    return done(fact(valid ? 'experiment.knapsack.dependencyValid' : sameRow ? 'experiment.knapsack.sameRowRisk' : 'experiment.knapsack.dependencyWrong',
      { row: target.row, capacity: target.capacity, expectedRow: expected.row, expectedCapacity: expected.capacity }, valid ? 'good' : 'bad', [key(target.row, target.capacity), key(selected.row, selected.capacity)]))
  }
  if (action.type === 'studyCell') {
    if (!selected) return done(fact('experiment.knapsack.selectFirst', undefined, 'bad'), false)
    const auto = expand(state, selected.row - 1, selected.capacity) +
      (state.input.weights[selected.row - 1]! <= selected.capacity ? expand(state, selected.row - 1, selected.capacity - state.input.weights[selected.row - 1]!) : 0)
    state.costs.userActions++
    state.costs.autoCells += auto
    refreshPolicy(state)
    const tainted = Object.values(state.cells).filter((cell) => !cell.certified).length
    return done(fact(tainted ? 'experiment.knapsack.studiedTainted' : 'experiment.knapsack.studied', { autoCells: auto, tainted }, tainted ? 'caution' : 'neutral', [key(selected.row, selected.capacity)]))
  }
  if (action.type === 'write') {
    if (!selected || typeof action.take !== 'boolean') return done(fact('experiment.knapsack.selectFirst', undefined, 'bad'), false)
    const weight = state.input.weights[selected.row - 1]!
    const skipRef = { row: selected.row - 1, capacity: selected.capacity }
    const takeRef = { row: selected.row - 1, capacity: selected.capacity - weight }
    if (!same(state.draftDependency.skip, skipRef) || weight <= selected.capacity && !same(state.draftDependency.take, takeRef)) return done(fact('experiment.knapsack.connectBoth', undefined, 'bad'), false)
    if (action.take && weight > selected.capacity) return done(fact('experiment.knapsack.tooHeavy', { weight, capacity: selected.capacity }, 'bad'), false)
    const auto = expand(state, skipRef.row, skipRef.capacity) + (weight <= selected.capacity ? expand(state, takeRef.row, takeRef.capacity) : 0)
    const skip = at(state, skipRef.row, skipRef.capacity)!
    const take = weight <= selected.capacity ? at(state, takeRef.row, takeRef.capacity)! : undefined
    const chosen: Cell = action.take
      ? { value: take!.value + state.input.values[selected.row - 1]!, mask: take!.mask | (1 << (selected.row - 1)), source: 'manual', certified: false }
      : { value: skip.value, mask: skip.mask, source: 'manual', certified: false }
    for (const coord of Object.keys(state.cells)) if (Number(coord.split(':')[0]) > selected.row) delete state.cells[coord]
    state.cells[key(selected.row, selected.capacity)] = chosen
    state.costs.userActions++
    state.costs.decisions++
    state.costs.autoCells += auto
    state.verified = false
    refreshPolicy(state)
    const best = Math.max(skip.value, take ? take.value + state.input.values[selected.row - 1]! : -Infinity)
    const certified = state.cells[key(selected.row, selected.capacity)]!.certified
    return done(fact(certified ? 'experiment.knapsack.cellWritten' : chosen.value === best ? 'experiment.knapsack.taintedCellWritten' : 'experiment.knapsack.feasibleLesserCell',
      { row: selected.row, capacity: selected.capacity, value: chosen.value, best, autoCells: auto }, certified ? 'good' : 'caution', [key(selected.row, selected.capacity)]))
  }
  if (action.type === 'toggleItem') {
    const index = Number(action.id?.slice(4)) - 1
    if (action.id !== itemId(index) || index < 0 || index > 3) return done(fact('experiment.knapsack.invalidItem', undefined, 'bad'), false)
    state.selectedItems = state.selectedItems.includes(action.id!) ? state.selectedItems.filter((id) => id !== action.id) : [...state.selectedItems, action.id!].sort()
    state.verified = false
    state.costs.userActions++
    const total = totals(state)
    return done(fact(total.weight > state.input.capacity ? 'experiment.knapsack.overweightDraft' : 'experiment.knapsack.subsetChanged', { weight: total.weight, value: total.value, capacity: state.input.capacity }, total.weight > state.input.capacity ? 'bad' : 'neutral', state.selectedItems))
  }
  if (action.type === 'useCellSolution') {
    if (!selected || !at(state, selected.row, selected.capacity)) return done(fact('experiment.knapsack.cellUnknown', undefined, 'bad'), false)
    const mask = at(state, selected.row, selected.capacity)!.mask
    state.selectedItems = state.input.weights.flatMap((_, i) => mask & (1 << i) ? [itemId(i)] : [])
    state.verified = false
    state.costs.userActions++
    const total = totals(state)
    return done(fact('experiment.knapsack.cellSolutionUsed', { weight: total.weight, value: total.value, row: selected.row, capacity: selected.capacity }, 'neutral', state.selectedItems))
  }
  if (action.type === 'verify') {
    state.verified = true
    state.costs.userActions++
    state.costs.tests++
    const total = totals(state), best = oracle(state)
    return done(fact(total.weight > state.input.capacity ? 'experiment.knapsack.overweight' : total.value === best ? 'experiment.knapsack.optimalCertificate' : 'experiment.knapsack.feasibleNotOptimal',
      { weight: total.weight, value: total.value, optimum: best }, total.weight > state.input.capacity ? 'bad' : total.value === best ? 'good' : 'caution', state.selectedItems))
  }
  return done(fact('experiment.knapsack.unknownAction', undefined, 'bad'), false)
}

function choices(state: KnapsackExperiment): ExperimentChoice[] {
  const cells: ExperimentChoice[] = []
  for (let row = 1; row <= 4; row++) for (let capacity = 0; capacity <= state.input.capacity; capacity++)
    cells.push({ id: `select-${row}-${capacity}`, key: 'experiment.knapsack.selectCell', vars: { row, capacity }, action: { type: 'selectCell', row, capacity }, targets: [key(row, capacity)] })
  const selected = state.selectedCell
  if (!selected) return [...cells, ...state.input.weights.map((_, i) => ({ id: `toggle-${itemId(i)}`, key: 'experiment.knapsack.toggleItem', vars: { item: i + 1 }, action: { type: 'toggleItem', id: itemId(i) }, targets: [itemId(i)] })), { id: 'verify', key: 'experiment.knapsack.verify', action: { type: 'verify' } }]
  const weight = state.input.weights[selected.row - 1]!
  const deps: ExperimentChoice[] = [
    { id: 'connect-skip', key: 'experiment.knapsack.connectSkip', action: { type: 'connectDependency', take: false, row: selected.row - 1, capacity: selected.capacity }, targets: [key(selected.row - 1, selected.capacity)] },
    { id: 'connect-same-row', key: 'experiment.knapsack.connectSameRow', action: { type: 'connectDependency', take: true, row: selected.row, capacity: selected.capacity }, targets: [key(selected.row, selected.capacity)], hitTargets: [] },
  ]
  if (weight <= selected.capacity) deps.push({ id: 'connect-take', key: 'experiment.knapsack.connectTake', action: { type: 'connectDependency', take: true, row: selected.row - 1, capacity: selected.capacity - weight }, targets: [key(selected.row - 1, selected.capacity - weight)] })
  return [...deps,
    { id: 'study', key: 'experiment.knapsack.studyCell', action: { type: 'studyCell' } },
    { id: 'write-skip', key: 'experiment.knapsack.writeSkip', action: { type: 'write', take: false } },
    { id: 'write-take', key: 'experiment.knapsack.writeTake', action: { type: 'write', take: true } },
    { id: 'use-cell-solution', key: 'experiment.knapsack.useCellSolution', action: { type: 'useCellSolution' } },
    ...state.input.weights.map((_, i) => ({ id: `toggle-${itemId(i)}`, key: 'experiment.knapsack.toggleItem', vars: { item: i + 1 }, action: { type: 'toggleItem', id: itemId(i) }, targets: [itemId(i)] })),
    { id: 'verify', key: 'experiment.knapsack.verify', action: { type: 'verify' } }, ...cells]
}

function formula(state: KnapsackExperiment): string {
  const selected = state.selectedCell
  if (!selected) return 'D(i,c)=\\max\\{D(i-1,c),v_i+D(i-1,c-w_i)\\}'
  const { row, capacity } = selected, weight = state.input.weights[row - 1]!, value = state.input.values[row - 1]!
  const read = (r: number, c: number): string => {
    const cell = at(state, r, c)
    return cell ? cell.certified ? String(cell.value) : `${cell.value}^{?}` : '?'
  }
  const skip = read(row - 1, capacity)
  const take = weight <= capacity ? read(row - 1, capacity - weight) : undefined
  return take === undefined ? `D(${row},${capacity})=D(${row - 1},${capacity})=${skip}`
    : `D(${row},${capacity})=\\max\\{${skip},${value}+${take}\\}`
}

function frame(state: KnapsackExperiment): TraceFrame {
  const selected = state.selectedCell, total = totals(state)
  const verifiedOptimum = state.verified ? oracle(state) : undefined
  const optimalSubset = state.verified && total.weight <= state.input.capacity && total.value === verifiedOptimum
  const links = selected ? [state.draftDependency.skip, state.draftDependency.take].filter((x): x is CellRef => !!x).map((x) => ({ from: [x.row, x.capacity] as [number, number], to: [selected.row, selected.capacity] as [number, number] })) : []
  return { op: optimalSubset ? 'done' : state.verified ? 'update' : selected ? 'select' : 'start', formula: formula(state),
    items: state.input.weights.map((weight, i) => ({ id: itemId(i), value: `w=${weight} · v=${state.input.values[i]}`, label: `i=${i + 1}`, tone: state.selectedItems.includes(itemId(i)) ? 'settled' : undefined })),
    matrix: { rows: ['0', '1', '2', '3', '4'], columns: Array.from({ length: state.input.capacity + 1 }, (_, c) => String(c)),
      values: Array.from({ length: 5 }, (_, row) => Array.from({ length: state.input.capacity + 1 }, (_, capacity) => {
        if (row === 0) return 0
        const cell = at(state, row, capacity)
        return cell ? cell.certified ? cell.value : `${cell.value}?` : '?'
      })),
      active: selected ? [selected.row, selected.capacity] : undefined, links },
    output: [...state.selectedItems.map((id) => ({ id: `chosen-${id}`, value: id, tone: 'settled' as const })),
      { id: 'total-weight', value: total.weight, label: 'w' }, { id: 'total-value', value: total.value, label: 'v' }],
    counters: { weight: total.weight, value: total.value, capacity: state.input.capacity, userActions: state.costs.userActions!, decisions: state.costs.decisions!, autoCells: state.costs.autoCells!, tests: state.costs.tests! },
    result: state.verified ? { items: [...state.selectedItems], weight: total.weight, value: total.value, optimum: verifiedOptimum, feasible: total.weight <= state.input.capacity, optimal: optimalSubset } : undefined }
}

function report(state: KnapsackExperiment): ExperimentReport {
  const total = totals(state), feasible = total.weight <= state.input.capacity
  const best = state.verified ? oracle(state) : undefined
  return { feasibility: fact(feasible ? 'experiment.knapsack.feasible' : 'experiment.knapsack.overweight', { weight: total.weight, capacity: state.input.capacity, excess: Math.max(0, total.weight - state.input.capacity) }, feasible ? 'good' : 'bad', state.selectedItems),
    strategy: fact(state.policy ? 'experiment.knapsack.policyHolds' : 'experiment.knapsack.policyDeviated', { decisions: state.costs.decisions! }, state.policy ? 'good' : 'caution'),
    conclusion: fact(!state.verified ? 'experiment.knapsack.unverified' : !feasible ? 'experiment.knapsack.noCertificate' : total.value === best ? 'experiment.knapsack.optimalCertificate' : 'experiment.knapsack.feasibleNotOptimal', { value: total.value, optimum: best ?? '?' }, !state.verified ? 'neutral' : feasible && total.value === best ? 'good' : 'caution', state.selectedItems),
    evidence: [fact('experiment.knapsack.subsetEvidence', { weight: total.weight, value: total.value, capacity: state.input.capacity }, feasible ? 'good' : 'bad', state.selectedItems),
      fact('experiment.knapsack.cellEvidence', { manual: Object.values(state.cells).filter((x) => x.source === 'manual').length, automatic: state.costs.autoCells! }, 'neutral'),
      ...(Object.values(state.cells).some((cell) => !cell.certified) ? [fact('experiment.knapsack.taintedCells', { count: Object.values(state.cells).filter((cell) => !cell.certified).length }, 'caution')] : [])],
    summary: fact('experiment.knapsack.costSummary', { userActions: state.costs.userActions!, decisions: state.costs.decisions!, autoCells: state.costs.autoCells!, tests: state.costs.tests! }, 'neutral') }
}

function fields(state: KnapsackExperiment): ExperimentField[] {
  return [{ id: 'capacity', key: 'experiment.knapsack.fieldCapacity', value: state.input.capacity, min: 1, max: 12, step: 1 },
    ...state.input.weights.flatMap((weight, i) => [
      { id: `w${i + 1}`, key: 'experiment.knapsack.fieldWeight', vars: { item: i + 1 }, value: weight, min: 1, max: 9, step: 1 },
      { id: `v${i + 1}`, key: 'experiment.knapsack.fieldValue', vars: { item: i + 1 }, value: state.input.values[i]!, min: 1, max: 20, step: 1 },
    ])]
}

export const knapsackExperiment: ExperimentAdapter<KnapsackExperiment> = { create, choices, apply, frame, report, fields, formula }
