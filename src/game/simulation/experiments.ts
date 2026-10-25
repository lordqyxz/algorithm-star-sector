import { dijkstraExperiment, maxflowExperiment, type DijkstraExperiment, type MaxFlowExperiment } from './experiment-graphs'
import { knapsackExperiment, type KnapsackExperiment } from './experiment-knapsack'
import { reductionExperiment, type ReductionExperiment } from './experiment-reduction'
import type { ExperimentAdapter, ExperimentKind, ExperimentAction } from './experiment-types'

export type ExperimentState = DijkstraExperiment | KnapsackExperiment | MaxFlowExperiment | ReductionExperiment
export type { ExperimentKind, ExperimentAction, ExperimentChoice, ExperimentFact, ExperimentField, ExperimentReport } from './experiment-types'
export const experimentKinds: ExperimentKind[] = ['dijkstra', 'knapsack', 'maxflow', 'reduction']
const adapters = { dijkstra: dijkstraExperiment, knapsack: knapsackExperiment, maxflow: maxflowExperiment, reduction: reductionExperiment }
// Creation and dispatch always use the same discriminant; no serialized state enters this boundary.
const adapter = (kind: ExperimentKind) => adapters[kind] as unknown as ExperimentAdapter<ExperimentState>
export const createExperiment = (kind: ExperimentKind, variant: 0 | 1 = 0, input?: Record<string, number>) => adapter(kind).create(variant, input)
export const experimentChoices = (state: ExperimentState) => adapter(state.kind).choices(state)
export const applyExperiment = (state: ExperimentState, action: ExperimentAction) => adapter(state.kind).apply(state, action)
export const experimentFrame = (state: ExperimentState) => adapter(state.kind).frame(state)
export const experimentReport = (state: ExperimentState) => adapter(state.kind).report(state)
export const experimentFields = (state: ExperimentState) => adapter(state.kind).fields(state)
export const experimentFormula = (state: ExperimentState) => adapter(state.kind).formula(state)

/** Readings of diagram objects; execution costs have their own localized panel. */
export function experimentReading(state: ExperimentState): string {
  if (state.kind === 'dijkstra') {
    const distance = (id: string) => Number.isFinite(state.distance[id]) ? String(state.distance[id]) : String.raw`\infty`
    return String.raw`d_s=${distance('s')},\quad d_t=${distance('t')},\quad |S|=${state.settled.length}`
  }
  if (state.kind === 'maxflow') return String.raw`|f|=${state.total},\quad |P|=${state.pathEdges.length}`
  if (state.kind === 'reduction') return String.raw`|V|=${state.vertices.length},\quad |E|=${state.edges.length},\quad |T|=${Object.keys(state.topics).length}`
  const cell = state.selectedCell
  if (cell) {
    const value = state.cells[`${cell.row}:${cell.capacity}`]
    const reading = value ? `${value.value}${value.certified ? '' : '^{?}'}` : '?'
    return String.raw`D_{${cell.row},${cell.capacity}}=${reading}`
  }
  return String.raw`W=${state.input.capacity},\quad |S|=${state.selectedItems.length}`
}
