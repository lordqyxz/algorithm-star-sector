import type { TraceFrame, TraceNode } from '../types'
import type { ExperimentAction, ExperimentAdapter, ExperimentBase, ExperimentChoice, ExperimentFact, ExperimentReport, ExperimentTransition } from './experiment-types'

type Edge = { id: string; u: string; v: string }
type Counterexample = {
  subset: string[]
  sourceCover: boolean
  sourceWithinK: boolean
  targetCovered: boolean
  targetWithinK: boolean
  missingEdge?: string
  missingTopic?: string
}
type Check = {
  structural: boolean
  enumerated: number
  equivalent: boolean
  problems: string[]
  mappingWitness?: Counterexample
  sourceDecision: boolean
  targetDecision: boolean
  decisionMismatch: boolean
}

export type ReductionExperiment = ExperimentBase & {
  kind: 'reduction'
  vertices: string[]
  edges: Edge[]
  sourceBudget: number
  targetBudget: number
  /** Keyed by edge id; absence means that topic has not been constructed. */
  topics: Record<string, string[]>
  selectedEdge: string | null
  witness: string[]
  argument: 'forward' | 'backward' | 'size' | null
  check: Check | null
}

const graphs = [
  { vertices: ['a', 'b', 'c', 'd'], edges: [['a', 'b'], ['b', 'c'], ['a', 'c'], ['c', 'd']], k: 2 },
  { vertices: ['a', 'b', 'c', 'd', 'e'], edges: [['a', 'b'], ['b', 'c'], ['c', 'd'], ['d', 'e'], ['a', 'e']], k: 2 },
] as const
const sourcePositions = [
  [[0.10, 0.20], [0.40, 0.20], [0.25, 0.55], [0.40, 0.82]],
  [[0.25, 0.12], [0.421, 0.383], [0.356, 0.775], [0.144, 0.775], [0.079, 0.383]],
] as const
const fact = (key: string, vars?: ExperimentFact['vars'], tone?: ExperimentFact['tone'], targets?: string[]): ExperimentFact => ({ key: `experiment.reduction.${key}`, vars, tone, targets })
const member = (vertex: string) => `p:${vertex}`
const vertexId = (vertex: string) => `v:${vertex}`
const topicId = (edgeId: string) => `topic:${edgeId}`
const ids = (xs: readonly string[]) => xs.join(',') || '∅'
const edge = (state: ReductionExperiment, id: string | undefined) => state.edges.find(e => e.id === id)
const clone = (state: ReductionExperiment): ReductionExperiment => structuredClone(state)
const invalidate = (state: ReductionExperiment) => { state.verified = false; state.check = null }
const formulaFor = (state: ReductionExperiment): string => {
  const selected = state.selectedEdge ? edge(state, state.selectedEdge) : undefined
  const members = selected ? state.topics[selected.id] ?? [] : []
  const set = members.length ? `\\{${members.map(p => `p_{${p.slice(2)}}`).join(',')}\\}` : '\\varnothing'
  const mapping = selected
    ? `e_{${selected.id}}=(${selected.u},${selected.v})\\mapsto P_{${selected.id}}=${set}`
    : `|V|=${state.vertices.length},\\;|E|=${state.edges.length}`
  return `\\begin{gathered}${mapping}\\\\ k_G=${state.sourceBudget},\\;k_P=${state.targetBudget},\\;|S|=${state.witness.length}\\end{gathered}`
}

function inspect(state: ReductionExperiment): Check {
  const problems: string[] = []
  for (const e of state.edges) {
    const list = state.topics[e.id]
    if (!list) { problems.push(`missing:${e.id}`); continue }
    if (list.length !== 2 || !list.includes(member(e.u)) || !list.includes(member(e.v))) problems.push(`members:${e.id}`)
  }
  if (state.targetBudget !== state.sourceBudget) problems.push('budget')
  const n = state.vertices.length
  let mappingWitness: Counterexample | undefined
  let sourceDecision = false, targetDecision = false
  for (let mask = 0; mask < 1 << n; mask++) {
    const subset = state.vertices.filter((_, i) => (mask & (1 << i)) !== 0)
    const sourceWithinK = subset.length <= state.sourceBudget
    const targetWithinK = subset.length <= state.targetBudget
    const missingEdge = state.edges.find(e => !subset.includes(e.u) && !subset.includes(e.v))?.id
    const missingTopic = Object.entries(state.topics).find(([, list]) => !list.some(p => subset.includes(p.slice(2))))?.[0]
    const sourceCover = !missingEdge, targetCovered = !missingTopic
    const sourceAccepts = sourceCover && sourceWithinK, targetAccepts = targetCovered && targetWithinK
    sourceDecision ||= sourceAccepts
    targetDecision ||= targetAccepts
    if (!mappingWitness && (sourceCover !== targetCovered || sourceAccepts !== targetAccepts)) {
      mappingWitness = { subset, sourceCover, sourceWithinK, targetCovered, targetWithinK, missingEdge, missingTopic }
    }
  }
  return { structural: problems.length === 0, enumerated: 1 << n, equivalent: !mappingWitness, problems, mappingWitness, sourceDecision, targetDecision, decisionMismatch: sourceDecision !== targetDecision }
}

function witnessFact(state: ReductionExperiment): ExperimentFact {
  const subset = state.witness
  const missingEdge = state.edges.find(e => !subset.includes(e.u) && !subset.includes(e.v))
  const missingTopic = Object.entries(state.topics).find(([, list]) => !list.some(p => subset.includes(p.slice(2))))?.[0]
  return fact('witness', {
    subset: ids(subset), size: subset.length,
    sourceCover: missingEdge ? 0 : 1, sourceWithinK: subset.length <= state.sourceBudget ? 1 : 0,
    targetCovered: missingTopic ? 0 : 1, targetWithinK: subset.length <= state.targetBudget ? 1 : 0,
    missingEdge: missingEdge?.id ?? '∅', missingTopic: missingTopic ?? '∅',
  }, 'neutral', [missingEdge ? `e:${missingEdge.id}` : '', missingTopic ? topicId(missingTopic) : ''].filter(Boolean))
}

export const reductionExperiment: ExperimentAdapter<ReductionExperiment> = {
  create(variant, input = {}) {
    const graph = graphs[variant]
    if (!graph) throw new RangeError('unknown reduction variant')
    const n = graph.vertices.length
    for (const key of Object.keys(input)) if (key !== 'sourceBudget' && key !== 'targetBudget') throw new RangeError(`unknown reduction field: ${key}`)
    const budget = (key: 'sourceBudget' | 'targetBudget') => {
      if (!(key in input)) return graph.k
      const value = input[key]
      if (!Number.isInteger(value) || value < 0 || value > n) throw new RangeError(`invalid ${key}`)
      return value
    }
    return {
      kind: 'reduction', variant, verified: false, policy: true,
      costs: { userActions: 0, tests: 0, enumeratedSets: 0, links: 0 },
      vertices: [...graph.vertices], edges: graph.edges.map(([u, v]) => ({ id: `${u}${v}`, u, v })),
      sourceBudget: budget('sourceBudget'), targetBudget: budget('targetBudget'),
      topics: {}, selectedEdge: null, witness: [], argument: null, check: null,
    }
  },
  choices(state) {
    const choices: ExperimentChoice[] = [
      ...state.edges.map(e => ({ id: `choose:${e.id}`, key: 'experiment.reduction.choiceEdge', vars: { edge: e.id }, action: { type: 'chooseEdge', id: e.id }, targets: [`e:${e.id}`, topicId(e.id)] })),
      ...state.vertices.map(v => ({ id: `witness:${v}`, key: 'experiment.reduction.choiceWitness', vars: { vertex: v }, action: { type: 'toggleVertex', id: vertexId(v) }, targets: [vertexId(v), member(v)], hitTargets: [vertexId(v)] })),
      { id: 'verify', key: 'experiment.reduction.choiceVerify', action: { type: 'verify' } },
      ...(['forward', 'backward', 'size'] as const).map(id => ({ id: `argument:${id}`, key: `experiment.reduction.choiceArgument${id[0].toUpperCase()}${id.slice(1)}`, action: { type: 'argument', id } })),
    ]
    if (state.selectedEdge) {
      if (!state.topics[state.selectedEdge]) choices.push({ id: `topic:${state.selectedEdge}`, key: 'experiment.reduction.choiceTopic', vars: { edge: state.selectedEdge }, action: { type: 'addTopic', id: state.selectedEdge } })
      if (state.topics[state.selectedEdge]) for (const v of state.vertices) choices.push({ id: `member:${state.selectedEdge}:${v}`, key: 'experiment.reduction.choiceMember', vars: { professor: v }, action: { type: 'toggleMember', professor: member(v) }, targets: [topicId(state.selectedEdge), member(v)], hitTargets: [member(v)] })
    }
    return choices
  },
  apply(state, action): ExperimentTransition<ReductionExperiment> {
    const next = clone(state)
    const reject = (reason: string): ExperimentTransition<ReductionExperiment> => ({ state, changed: false, feedback: fact(reason, undefined, 'bad') })
    if (action.type === 'chooseEdge') {
      if (!edge(state, action.id)) return reject('invalidEdge')
      if (state.selectedEdge === action.id) return { state, changed: false, feedback: fact('selectedEdge', { edge: action.id! }) }
      next.selectedEdge = action.id!
    } else if (action.type === 'addTopic') {
      if (!edge(state, action.id)) return reject('invalidEdge')
      if (state.topics[action.id!]) return reject('topicExists')
      next.topics[action.id!] = []
      next.selectedEdge = action.id!
      invalidate(next)
    } else if (action.type === 'toggleMember') {
      const id = state.selectedEdge, professor = action.professor
      if (!id || !state.topics[id] || !professor || !state.vertices.some(v => member(v) === professor)) return reject('invalidMember')
      const list = next.topics[id]
      if (list.includes(professor)) next.topics[id] = list.filter(p => p !== professor)
      else { list.push(professor); next.costs.links++ }
      invalidate(next)
    } else if (action.type === 'toggleVertex') {
      const vertex = action.id?.startsWith('v:') ? action.id.slice(2) : ''
      if (!state.vertices.includes(vertex)) return reject('invalidVertex')
      next.witness = state.witness.includes(vertex) ? state.witness.filter(v => v !== vertex) : [...state.witness, vertex]
    } else if (action.type === 'setSourceBudget' || action.type === 'setTargetBudget') {
      if (!Number.isInteger(action.amount) || action.amount! < 0 || action.amount! > state.vertices.length) return reject('invalidBudget')
      const key = action.type === 'setSourceBudget' ? 'sourceBudget' : 'targetBudget'
      if (state[key] === action.amount) return { state, changed: false, feedback: fact('budgetUnchanged') }
      next[key] = action.amount!
      invalidate(next)
    } else if (action.type === 'verify') {
      next.check = inspect(next)
      next.costs.tests++
      next.costs.enumeratedSets += next.check.enumerated
      next.verified = next.check.structural && next.check.equivalent && !next.check.decisionMismatch
    } else if (action.type === 'argument') {
      if (!['forward', 'backward', 'size'].includes(action.id ?? '')) return reject('invalidArgument')
      next.argument = action.id as ReductionExperiment['argument']
    } else return reject('invalidAction')
    next.costs.userActions++
    const feedback = action.type === 'verify'
      ? next.check!.decisionMismatch
        ? fact('decisionMismatch', { source: next.check!.sourceDecision ? 'YES' : 'NO', target: next.check!.targetDecision ? 'YES' : 'NO' }, 'witness')
        : next.check!.mappingWitness
          ? fact('mappingWitnessMismatch', { subset: ids(next.check!.mappingWitness.subset), edge: next.check!.mappingWitness.missingEdge ?? '∅', topic: next.check!.mappingWitness.missingTopic ?? '∅' }, 'witness', [next.check!.mappingWitness.missingEdge ? `e:${next.check!.mappingWitness.missingEdge}` : '', next.check!.mappingWitness.missingTopic ? topicId(next.check!.mappingWitness.missingTopic) : ''].filter(Boolean))
        : next.check!.structural ? fact('verifiedInstance', { count: next.check!.enumerated }, 'good') : fact('structureMismatch', { count: next.check!.problems.length }, 'caution')
      : action.type === 'toggleVertex' ? witnessFact(next) : fact('changed', undefined, 'neutral')
    return { state: next, changed: true, feedback }
  },
  fields(state) {
    return [
      { id: 'sourceBudget', key: 'experiment.reduction.sourceBudget', value: state.sourceBudget, min: 0, max: state.vertices.length, step: 1 },
      { id: 'targetBudget', key: 'experiment.reduction.targetBudget', value: state.targetBudget, min: 0, max: state.vertices.length, step: 1 },
    ]
  },
  formula(state) {
    return formulaFor(state)
  },
  frame(state): TraceFrame {
    const n = state.vertices.length, m = state.edges.length
    const sourceNodes: TraceNode[] = state.vertices.map((v, i) => ({ id: vertexId(v), value: v, x: sourcePositions[state.variant][i][0], y: sourcePositions[state.variant][i][1], tone: state.witness.includes(v) ? 'active' : undefined }))
    const professorNodes: TraceNode[] = state.vertices.map((v, i) => ({ id: member(v), value: `p${v}`, x: 0.89, y: 0.12 + i * 0.17, tone: state.witness.includes(v) ? 'active' : undefined }))
    const topicNodes: TraceNode[] = state.edges.flatMap((e, i) => state.topics[e.id] ? [{ id: topicId(e.id), value: `T${e.id}`, x: 0.62, y: 0.12 + i * (0.76 / Math.max(1, m - 1)), tone: state.selectedEdge === e.id ? 'active' as const : undefined }] : [])
    const sourceEdges = state.edges.map(e => ({ from: vertexId(e.u), to: vertexId(e.v), weight: e.id, tone: state.selectedEdge === e.id ? 'active' as const : undefined }))
    const memberEdges = state.edges.flatMap(e => (state.topics[e.id] ?? []).map(p => ({ from: topicId(e.id), to: p, tone: state.selectedEdge === e.id ? 'active' as const : undefined })))
    return {
      op: state.verified ? 'done' : state.check ? 'compare' : 'start', formula: formulaFor(state),
      nodes: [...sourceNodes, ...topicNodes, ...professorNodes], edges: [...sourceEdges, ...memberEdges],
      groups: state.edges.map(e => ({ id: topicId(e.id), items: (state.topics[e.id] ?? []).map(p => ({ id: p, value: p })) })),
      matrix: { rows: state.edges.map(e => `T${e.id}`), columns: state.vertices.map(v => `p${v}`), values: state.edges.map(e => state.vertices.map(v => state.topics[e.id] ? (state.topics[e.id].includes(member(v)) ? 1 : 0) : '—')) },
      counters: { vertices: n, edges: m, topics: Object.keys(state.topics).length, memberships: Object.values(state.topics).reduce((sum, list) => sum + list.length, 0), sourceBudget: state.sourceBudget, targetBudget: state.targetBudget, witnessSize: state.witness.length, ...state.costs },
      result: { verified: state.verified, structural: state.check?.structural ?? false, equivalent: state.check?.equivalent ?? false, sourceDecision: state.check?.sourceDecision ?? null, targetDecision: state.check?.targetDecision ?? null, decisionMismatch: state.check?.decisionMismatch ?? false, mappingWitness: state.check?.mappingWitness ? structuredClone(state.check.mappingWitness) : null },
    }
  },
  report(state): ExperimentReport {
    const check = state.check
    const evidence: ExperimentFact[] = [witnessFact(state)]
    if (check) evidence.push(fact('enumeratedInstance', { count: check.enumerated }, 'neutral'))
    for (const problem of check?.problems ?? []) {
      if (problem === 'budget') {
        evidence.push(fact('problemBudget', { source: state.sourceBudget, target: state.targetBudget }, 'caution'))
      } else {
        const [kind, id] = problem.split(':')
        if (kind === 'missing') evidence.push(fact('problemMissingTopic', { topic: id }, 'caution', [`e:${id}`, topicId(id)]))
        if (kind === 'members') {
          const e = edge(state, id)!
          evidence.push(fact('problemMembers', { topic: id, members: ids(state.topics[id] ?? []), expected: `${member(e.u)},${member(e.v)}` }, 'caution', [`e:${id}`, topicId(id)]))
        }
      }
    }
    if (check) evidence.push(fact('decisionComparison', { source: check.sourceDecision ? 'YES' : 'NO', target: check.targetDecision ? 'YES' : 'NO' }, check.decisionMismatch ? 'witness' : 'neutral'))
    if (check?.mappingWitness) {
      const c = check.mappingWitness
      evidence.push(fact('mappingWitnessDetail', { subset: ids(c.subset), sourceCover: Number(c.sourceCover), sourceWithinK: Number(c.sourceWithinK), targetCovered: Number(c.targetCovered), targetWithinK: Number(c.targetWithinK), missingEdge: c.missingEdge ?? '∅', missingTopic: c.missingTopic ?? '∅' }, 'witness', [c.missingEdge ? `e:${c.missingEdge}` : '', c.missingTopic ? topicId(c.missingTopic) : ''].filter(Boolean)))
    }
    if (state.argument) evidence.push(fact(`argument${state.argument[0].toUpperCase()}${state.argument.slice(1)}`, { vertices: state.vertices.length, edges: state.edges.length }, 'neutral'))
    return {
      feasibility: check ? check.structural ? fact('structureValid', undefined, 'good') : fact('structureInvalid', { count: check.problems.length }, 'caution') : fact('draft', { topics: Object.keys(state.topics).length, edges: state.edges.length }),
      strategy: fact('direction', undefined, 'neutral'),
      conclusion: state.verified ? fact('instancePassed', { count: check!.enumerated }, 'good') : check?.decisionMismatch ? fact('decisionMismatch', { source: check.sourceDecision ? 'YES' : 'NO', target: check.targetDecision ? 'YES' : 'NO' }, 'witness') : check?.mappingWitness ? fact('mappingWitnessMismatch', { subset: ids(check.mappingWitness.subset), edge: check.mappingWitness.missingEdge ?? '∅', topic: check.mappingWitness.missingTopic ?? '∅' }, 'witness') : check ? fact('cannotClaimReduction', undefined, 'caution') : fact('unverified'),
      evidence,
      summary: fact('costSummary', { actions: state.costs.userActions, tests: state.costs.tests, sets: state.costs.enumeratedSets, links: state.costs.links }),
    }
  },
}
