import type { TraceFrame } from '../types'

export type ExperimentKind = 'dijkstra' | 'knapsack' | 'maxflow' | 'reduction'
export type ExperimentTone = 'neutral' | 'good' | 'caution' | 'bad' | 'witness'
export type ExperimentFact = {
  key: string
  vars?: Record<string, string | number>
  tone?: ExperimentTone
  targets?: string[]
}
export type ExperimentAction = {
  type: string
  id?: string
  row?: number
  capacity?: number
  take?: boolean
  amount?: number
  professor?: string
}
export type ExperimentChoice = {
  id: string
  key: string
  vars?: Record<string, string | number>
  action: ExperimentAction
  targets?: string[]
  /** Clickable objects can be narrower than all objects highlighted by the action. */
  hitTargets?: string[]
}
export type ExperimentField = {
  id: string
  key: string
  vars?: Record<string, string | number>
  value: number
  min: number
  max: number
  step: number
}
export type ExperimentBase = {
  kind: ExperimentKind
  variant: 0 | 1
  verified: boolean
  policy: boolean
  costs: Record<string, number>
}
export type ExperimentReport = {
  feasibility: ExperimentFact
  strategy: ExperimentFact
  conclusion: ExperimentFact
  evidence: ExperimentFact[]
  summary: ExperimentFact
}
export type ExperimentTransition<S extends ExperimentBase> = {
  state: S
  changed: boolean
  feedback: ExperimentFact
}
export type ExperimentAdapter<S extends ExperimentBase> = {
  create(variant: 0 | 1, input?: Record<string, number>): S
  choices(state: S): ExperimentChoice[]
  apply(state: S, action: ExperimentAction): ExperimentTransition<S>
  frame(state: S): TraceFrame
  report(state: S): ExperimentReport
  fields(state: S): ExperimentField[]
  formula(state: S): string
}
