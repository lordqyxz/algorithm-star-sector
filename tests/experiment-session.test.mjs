import test from 'node:test'
import assert from 'node:assert/strict'
import { applyExperiment, createExperiment } from '../src/game/sim.ts'
import { createExperimentSession, commitExperiment, experimentSessionState, seekExperiment, pinExperiment, swapExperimentBranches, changeExperimentInput, decodeExperimentSession, loadExperimentSession, saveExperimentSession } from '../src/game/experiment-session.ts'

const withStorage = run => {
  const previous = globalThis.window
  const values = new Map([['algorithmia-course-v1', '{"existing":true}'], ['algorithmia-labs-v1','{"old":true}']])
  globalThis.window = { localStorage: { getItem: key => values.get(key) ?? null, setItem: (key,value) => values.set(key,value) } }
  try { run(values) } finally { if (previous === undefined) delete globalThis.window; else globalThis.window = previous }
}
const settle = { type: 'settle', id: 's' }
const expand = { type: 'expand', id: 's' }

test('preview is a pure proposed transition without actual cost or history', () => {
  const state = createExperiment('dijkstra')
  const before = structuredClone(state)
  const preview = applyExperiment(state, settle)
  assert.ok(preview.changed)
  assert.equal(preview.state.costs.settles, 1)
  assert.deepEqual(state, before)
  assert.equal(state.costs.settles, 0)
})

test('seek preserves future; a new command keeps the full old future as a distinct comparison', () => {
  let session = createExperimentSession('dijkstra')
  session = commitExperiment(session, settle).session
  session = commitExperiment(session, expand).session
  const full = experimentSessionState(session)
  const originalId = session.active.id
  session = seekExperiment(session, 1)
  assert.equal(session.active.actions.length, 2)
  assert.equal(experimentSessionState(session).costs.edgeScans, 0)
  assert.deepEqual(experimentSessionState(seekExperiment(session, 2)), full)
  session = commitExperiment(session, { type:'relax', id:'sa' }).session
  assert.equal(session.comparison.id, originalId)
  assert.notEqual(session.active.id, originalId)
  assert.deepEqual(experimentSessionState(session, true), full)
  assert.equal(session.active.actions.length, 2)
  assert.equal(session.events.at(-1).branch, session.active.id)
  assert.equal(session.events.at(-1).step, session.active.cursor)
  assert.equal(session.attempts, 3)
})

test('pin gives a distinct immutable branch identity and swapping can resume its future', () => {
  let session = pinExperiment(createExperimentSession('dijkstra'))
  assert.notEqual(session.active.id, session.comparison.id)
  const pinned = experimentSessionState(session, true)
  session = commitExperiment(session, settle).session
  assert.deepEqual(experimentSessionState(session, true), pinned)
  session = swapExperimentBranches(session)
  assert.deepEqual(experimentSessionState(session), pinned)
  assert.equal(experimentSessionState(session, true).costs.settles, 1)
})

test('input editing keeps old values and evidence in comparison and starts the new input from zero', () => {
  let session = commitExperiment(createExperimentSession('dijkstra'), settle).session
  const before = structuredClone(session)
  session = changeExperimentInput(session, { ...session.active.input, sa: 9 })
  assert.deepEqual(experimentSessionState(session, true), experimentSessionState(before))
  assert.equal(session.active.input.sa, 9)
  assert.equal(session.comparison.input.sa, 2)
  assert.equal(session.active.cursor, 0)
  assert.equal(experimentSessionState(session).costs.settles, 0)
  assert.throws(() => changeExperimentInput(session, { sa: 99 }))
  assert.equal(session.active.input.sa, 9)
})

test('serialized sessions replay at cursor with all futures preserved and reject corrupted metadata', () => {
  let session = commitExperiment(createExperimentSession('dijkstra'), settle).session
  session = commitExperiment(session, expand).session
  session = seekExperiment(pinExperiment(session), 1)
  const decoded = decodeExperimentSession(JSON.parse(JSON.stringify(session)), 'dijkstra')
  assert.deepEqual(experimentSessionState(decoded), experimentSessionState(session))
  assert.deepEqual(experimentSessionState(decoded, true), experimentSessionState(session, true))
  for (const mutate of [
    value => { value.active.input.sa = 99 },
    value => { value.nextId = -5 },
    value => { value.events = [{ type: 'junk', branch:0, step:0 }] },
    value => { value.comparison.id = value.active.id },
  ]) { const bad=structuredClone(session); mutate(bad); assert.throws(() => decodeExperimentSession(bad, 'dijkstra')) }
  const badBudget=createExperimentSession('reduction');badBudget.active.input.sourceBudget=99
  assert.throws(()=>decodeExperimentSession(badBudget,'reduction'))
})

test('bad storage is retained in recovery before a new session is saved; unrelated progress stays untouched', () => withStorage(values => {
  const raw='{"dijkstra":{"version":99,"userData":"keep"}}'
  values.set('algorithmia-experiments-v1',raw)
  const session=loadExperimentSession('dijkstra')
  assert.equal(values.get('algorithmia-experiments-v1'),raw)
  saveExperimentSession(session)
  const backups=[...values.entries()].filter(([key])=>key.startsWith('algorithmia-experiments-v1:recovery:'))
  assert.ok(backups.some(([,value])=>value===raw))
  assert.equal(values.get('algorithmia-course-v1'),'{"existing":true}')
  assert.equal(values.get('algorithmia-labs-v1'),'{"old":true}')
}))

test('invalid submissions affect attempts only, not branch costs; unavailable storage retains the active session', () => withStorage(() => {
  let session=createExperimentSession('dijkstra')
  const invalid=commitExperiment(session,{type:'settle',id:'t'})
  assert.equal(invalid.result.changed,false)
  assert.equal(invalid.session.attempts,1)
  assert.deepEqual(experimentSessionState(invalid.session).costs,experimentSessionState(session).costs)
  session=commitExperiment(invalid.session,settle).session
  globalThis.window.localStorage.getItem=()=>{throw Error('blocked')}
  globalThis.window.localStorage.setItem=()=>{throw Error('blocked')}
  saveExperimentSession(session)
  assert.deepEqual(loadExperimentSession('dijkstra'),session)
}))
