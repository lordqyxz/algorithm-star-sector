import { applyExperiment, createExperiment, experimentFields, experimentKinds, type ExperimentAction, type ExperimentKind, type ExperimentState } from './simulation/experiments'

export type ExperimentBranch = {
  id: number
  kind: ExperimentKind
  variant: 0 | 1
  input: Record<string, number>
  actions: ExperimentAction[]
  cursor: number
}
export type ExperimentEvent = { type: 'execute' | 'seek' | 'input' | 'pin' | 'swap'; branch: number; step: number; action?: string; accepted?: boolean }
export type ExperimentSession = {
  version: 1
  active: ExperimentBranch
  comparison: ExperimentBranch | null
  attempts: number
  nextId: number
  events: ExperimentEvent[]
}
const storageKey = 'algorithmia-experiments-v1'
const memory = new Map<ExperimentKind, ExperimentSession>()
const clone = <T>(value: T): T => structuredClone(value)
const inputOf = (state: ExperimentState) => Object.fromEntries(experimentFields(state).map(field => [field.id, field.value]))
const event = (session: ExperimentSession, value: ExperimentEvent) => {
  session.events = [...session.events, value].slice(-2000)
}
export function createExperimentSession(kind: ExperimentKind, variant: 0 | 1 = 0, input?: Record<string, number>): ExperimentSession {
  const state = createExperiment(kind, variant, input)
  return { version: 1, active: { id: 1, kind, variant, input: inputOf(state), actions: [], cursor: 0 }, comparison: null, attempts: 0, nextId: 2, events: [] }
}
function branchState(branch: ExperimentBranch, full = false): ExperimentState {
  let state = createExperiment(branch.kind, branch.variant, branch.input)
  const limit = full ? branch.actions.length : branch.cursor
  for (let i = 0; i < limit; i++) {
    const result = applyExperiment(state, branch.actions[i])
    if (!result.changed) throw new Error('Unreplayable experiment command')
    state = result.state
  }
  return state
}
export function experimentSessionState(session: ExperimentSession, comparison = false): ExperimentState {
  const branch = comparison ? session.comparison : session.active
  if (!branch) throw new Error('No comparison branch')
  return branchState(branch)
}
export function commitExperiment(session: ExperimentSession, action: ExperimentAction) {
  const previous = experimentSessionState(session)
  let result = applyExperiment(previous, action)
  if (result.changed && session.active.cursor >= 1000) result = { state: previous, changed: false, feedback: { key: 'experiment.ui.historyLimit', tone: 'caution' } }
  const next = clone(session)
  next.attempts++
  if (result.changed) {
    if (next.active.cursor < next.active.actions.length) {
      next.comparison = { ...clone(next.active), cursor: next.active.actions.length }
      next.active = { ...clone(next.active), id: next.nextId++, actions: next.active.actions.slice(0, next.active.cursor) }
    }
    next.active.actions.push(clone(action))
    next.active.cursor++
  }
  event(next, { type: 'execute', branch: next.active.id, step: next.active.cursor, action: action.type, accepted: result.changed })
  return { session: next, result }
}
export function seekExperiment(session: ExperimentSession, cursor: number): ExperimentSession {
  if (!Number.isSafeInteger(cursor) || cursor < 0 || cursor > session.active.actions.length) throw new RangeError('Experiment cursor')
  const next = clone(session)
  next.active.cursor = cursor
  event(next, { type: 'seek', branch: next.active.id, step: cursor })
  return next
}
export function pinExperiment(session: ExperimentSession): ExperimentSession {
  const next = clone(session)
  next.comparison = { ...clone(next.active), id: next.nextId++ }
  event(next, { type: 'pin', branch: next.comparison.id, step: next.comparison.cursor })
  return next
}
export function swapExperimentBranches(session: ExperimentSession): ExperimentSession {
  if (!session.comparison) return session
  const next = clone(session)
  const previous = next.active
  next.active = next.comparison!
  next.comparison = previous
  event(next, { type: 'swap', branch: next.active.id, step: next.active.cursor })
  return next
}
export function changeExperimentInput(session: ExperimentSession, input: Record<string, number>, variant: 0 | 1 = session.active.variant): ExperimentSession {
  const state = createExperiment(session.active.kind, variant, input)
  const next = clone(session)
  next.comparison = clone(next.active)
  next.active = { id: next.nextId++, kind: state.kind, variant, input: inputOf(state), actions: [], cursor: 0 }
  event(next, { type: 'input', branch: next.active.id, step: 0 })
  return next
}

function readBranch(value: unknown, kind: ExperimentKind): ExperimentBranch {
  if (!value || typeof value !== 'object') throw new Error('Experiment branch')
  const branch = value as ExperimentBranch
  if (branch.kind !== kind || ![0,1].includes(branch.variant) || !Number.isSafeInteger(branch.id) || branch.id < 1 || !Array.isArray(branch.actions) || branch.actions.length > 1000 || !Number.isSafeInteger(branch.cursor) || branch.cursor < 0 || branch.cursor > branch.actions.length || !branch.input || typeof branch.input !== 'object' || Object.values(branch.input).some(value => typeof value !== 'number' || !Number.isFinite(value))) throw new Error('Experiment branch shape')
  if (branch.actions.some(action => !action || typeof action !== 'object' || typeof action.type !== 'string' || Object.values(action).some(value => value !== undefined && !['string','number','boolean'].includes(typeof value)))) throw new Error('Experiment action')
  const initial = createExperiment(kind, branch.variant, branch.input)
  const fields = experimentFields(initial)
  if (fields.length !== Object.keys(branch.input).length || fields.some(field => branch.input[field.id] !== field.value)) throw new Error('Noncanonical experiment input')
  branchState(branch, true)
  return clone(branch)
}
export function decodeExperimentSession(value: unknown, kind: ExperimentKind): ExperimentSession {
  if (!value || typeof value !== 'object') throw new Error('Experiment session')
  const input = value as ExperimentSession
  if (input.version !== 1 || !Number.isSafeInteger(input.attempts) || input.attempts < 0) throw new Error('Experiment version')
  const active = readBranch(input.active, kind)
  const comparison = input.comparison === null ? null : readBranch(input.comparison, kind)
  if (comparison?.id === active.id || !Number.isSafeInteger(input.nextId) || input.nextId <= Math.max(active.id, comparison?.id ?? 0) || input.nextId >= Number.MAX_SAFE_INTEGER - 1000) throw new Error('Experiment branch identities')
  if (!Array.isArray(input.events) || input.events.length > 2000 || input.events.some(item => !item || !['execute','seek','input','pin','swap'].includes(item.type) || !Number.isSafeInteger(item.branch) || item.branch < 1 || !Number.isSafeInteger(item.step) || item.step < 0 || item.action !== undefined && typeof item.action !== 'string' || item.accepted !== undefined && typeof item.accepted !== 'boolean')) throw new Error('Experiment events')
  return { version: 1, active, comparison, attempts: input.attempts, nextId: input.nextId, events: clone(input.events) }
}
export function loadExperimentSession(kind: ExperimentKind): ExperimentSession {
  try {
    const data = JSON.parse(window.localStorage.getItem(storageKey) ?? '{}')
    if (data?.[kind]) {
      const session = decodeExperimentSession(data[kind], kind)
      memory.set(kind, clone(session))
      return session
    }
  } catch { /* Preserve unreadable storage; start a fresh active session. */ }
  return clone(memory.get(kind) ?? createExperimentSession(kind))
}
export function saveExperimentSession(session: ExperimentSession) {
  const kind = session.active.kind
  memory.set(kind, clone(session))
  try {
    const raw = window.localStorage.getItem(storageKey)
    let data: Record<string, unknown> = {}
    if (raw !== null) {
      let invalid = false
      try {
        const value = JSON.parse(raw)
        if (!value || typeof value !== 'object' || Array.isArray(value)) invalid = true
        else {
          data = value
          if (data[kind] !== undefined) decodeExperimentSession(data[kind], kind)
        }
      } catch { invalid = true }
      if (invalid) {
        // Back up before writing; if backup fails, the original remains untouched.
        const backup = `${storageKey}:recovery:${kind}:${Date.now()}`
        window.localStorage.setItem(backup, raw)
      }
    }
    window.localStorage.setItem(storageKey, JSON.stringify({ ...data, [kind]: session }))
  } catch { /* The scene and memory copy remain usable without browser storage. */ }
}
export function loadExperimentSummaries() {
  return experimentKinds.flatMap(kind => {
    try {
      const value = JSON.parse(window.localStorage.getItem(storageKey) ?? '{}')?.[kind]
      if (!value && !memory.has(kind)) return []
      const session = value ? decodeExperimentSession(value, kind) : memory.get(kind)!
      return [{ kind, steps: session.active.cursor, branches: session.comparison ? 2 : 1, attempts: session.attempts }]
    } catch { return [] }
  })
}
