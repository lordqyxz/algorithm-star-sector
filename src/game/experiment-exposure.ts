import { createLab, labParameter, type LabKind } from './sim'
import type { ExperimentState } from './simulation/experiments'
import { markLabChallenge } from './save'

/** Free previews disclose answers, so an identical strategy challenge is no longer unseen. */
export function equivalentChallenge(state: ExperimentState): { kind: LabKind; parameter: number } | null {
  if (state.kind === 'reduction') return null
  const range = labParameter(state.kind)
  for (let parameter = range.min; parameter <= range.max; parameter += range.step) {
    const challenge = createLab(state.kind, 1, parameter)
    if (state.kind === 'dijkstra' && challenge.kind === 'dijkstra' && state.edges.length === challenge.edges.length && state.edges.every(edge => challenge.edges.some(other => other.id === edge.id && other.from === edge.from && other.to === edge.to && other.weight === edge.weight))) return { kind: state.kind, parameter }
    if (state.kind === 'maxflow' && challenge.kind === 'maxflow' && state.edges.length === challenge.edges.length && state.edges.every(edge => challenge.edges.some(other => other.id === edge.id && other.from === edge.from && other.to === edge.to && other.capacity === edge.capacity))) return { kind: state.kind, parameter }
    if (state.kind === 'knapsack' && challenge.kind === 'knapsack' && state.input.capacity === challenge.capacity && state.input.weights.every((weight, i) => weight === challenge.items[i].weight && state.input.values[i] === challenge.items[i].value)) return { kind: state.kind, parameter }
  }
  return null
}
export function recordExperimentExposure(state: ExperimentState) {
  const match = equivalentChallenge(state)
  if (match) markLabChallenge(match.kind, 1, match.parameter, { exposed: true })
}
