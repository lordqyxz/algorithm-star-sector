import test from 'node:test'
import assert from 'node:assert/strict'
import katex from 'katex'
import { reductionExperiment as model } from '../src/game/simulation/experiment-reduction.ts'

function act(state, action) {
  const transition = model.apply(state, action)
  assert.equal(transition.changed, true, JSON.stringify(action))
  return transition.state
}
function build(variant) {
  let state = model.create(variant)
  for (const edge of state.edges) {
    state = act(state, { type: 'addTopic', id: edge.id })
    state = act(state, { type: 'toggleMember', professor: `p:${edge.u}` })
    state = act(state, { type: 'toggleMember', professor: `p:${edge.v}` })
  }
  return state
}
function oracle(state) {
  let equivalent = true
  for (let mask = 0; mask < 1 << state.vertices.length; mask++) {
    const subset = state.vertices.filter((_, i) => mask >> i & 1)
    const source = subset.length <= state.sourceBudget && state.edges.every(e => subset.includes(e.u) || subset.includes(e.v))
    const target = subset.length <= state.targetBudget && Object.values(state.topics).every(list => list.some(p => subset.includes(p.slice(2))))
    equivalent &&= source === target
  }
  return equivalent
}

test('correct per-edge construction passes structural and all-subsets checks for YES and NO inputs', () => {
  for (const variant of [0, 1]) {
    const state = build(variant), before = structuredClone(state)
    const verified = act(state, { type: 'verify' })
    assert.deepEqual(state, before, 'apply must not mutate the old snapshot')
    assert.equal(verified.verified, true)
    assert.equal(verified.check.structural, true)
    assert.equal(verified.check.equivalent, true)
    assert.equal(verified.check.decisionMismatch, false)
    assert.equal(verified.check.sourceDecision, variant === 0)
    assert.equal(verified.check.targetDecision, variant === 0)
    assert.equal(verified.check.enumerated, 1 << verified.vertices.length)
    assert.equal(verified.costs.tests, 1)
    assert.equal(verified.costs.enumeratedSets, 1 << verified.vertices.length)
    assert.equal(verified.costs.links, 2 * verified.edges.length)
    assert.equal(model.report(verified).conclusion.key, 'experiment.reduction.instancePassed')
    assert.equal(oracle(verified), true)
    for (let mask = 0; mask < 1 << verified.vertices.length; mask++) {
      const subset = verified.vertices.filter((_, i) => mask >> i & 1)
      const cover = verified.edges.every(e => subset.includes(e.u) || subset.includes(e.v))
      const committee = verified.edges.every(e => verified.topics[e.id].some(p => subset.includes(p.slice(2))))
      assert.equal(cover, committee, `both directions for ${variant}:${mask}`)
      assert.equal(subset.length <= verified.sourceBudget, subset.length <= verified.targetBudget)
    }
    let hasSolution = false
    for (let mask = 0; mask < 1 << verified.vertices.length; mask++) {
      const subset = verified.vertices.filter((_, i) => mask >> i & 1)
      hasSolution ||= subset.length <= verified.sourceBudget && verified.edges.every(e => subset.includes(e.u) || subset.includes(e.v))
    }
    assert.equal(hasSolution, variant === 0)
  }
})

test('bad lists remain editable, expose a concrete directional counterexample, and repair', () => {
  let state = build(0)
  state = act(state, { type: 'chooseEdge', id: 'ab' })
  state = act(state, { type: 'toggleMember', professor: 'p:a' })
  assert.deepEqual(state.topics.ab, ['p:b'])
  const wrong = act(state, { type: 'verify' })
  assert.equal(wrong.verified, false)
  assert.equal(wrong.check.structural, false)
  assert.equal(wrong.check.equivalent, false)
  assert.equal(wrong.check.sourceDecision, true)
  assert.equal(wrong.check.targetDecision, true)
  assert.equal(wrong.check.decisionMismatch, false)
  const c = wrong.check.mappingWitness
  assert.ok(c)
  assert.notEqual(c.sourceCover && c.sourceWithinK, c.targetCovered && c.targetWithinK)
  assert.equal(model.report(wrong).conclusion.tone, 'witness')
  assert.equal(model.report(wrong).conclusion.key, 'experiment.reduction.mappingWitnessMismatch')
  assert.equal(model.report(wrong).evidence.find(e => e.key.endsWith('mappingWitnessDetail')).tone, 'witness')
  state = act(wrong, { type: 'toggleMember', professor: 'p:a' })
  assert.equal(state.check, null)
  const fixed = act(state, { type: 'verify' })
  assert.equal(fixed.verified, true)
  assert.equal(fixed.costs.tests, 2)
})

test('a budget change is a structural error even when a particular answer happens to match', () => {
  const no = build(1)
  const changed = act(no, { type: 'setTargetBudget', amount: 3 })
  const checked = act(changed, { type: 'verify' })
  assert.equal(checked.check.structural, false)
  assert.equal(checked.check.equivalent, false)
  assert.equal(checked.check.mappingWitness.sourceWithinK, false)
  assert.equal(checked.check.mappingWitness.targetWithinK, true)
  assert.equal(checked.check.decisionMismatch, true)
  assert.equal(checked.verified, false)
  const restored = act(checked, { type: 'setTargetBudget', amount: 2 })
  assert.equal(act(restored, { type: 'verify' }).verified, true)
})

test('selected witness may violate cover or budget, and professor/topic objects remain distinct', () => {
  let state = build(0)
  state = act(state, { type: 'toggleVertex', id: 'v:a' })
  const evidence = model.report(state).evidence[0]
  assert.equal(evidence.vars.size, 1)
  assert.equal(evidence.vars.sourceCover, 0)
  const frame = model.frame(state)
  const ids = frame.nodes.map(n => n.id)
  assert.equal(new Set(ids).size, ids.length)
  assert.ok(ids.some(id => id.startsWith('v:')) && ids.some(id => id.startsWith('p:')) && ids.some(id => id.startsWith('topic:')))
  assert.ok(frame.edges.every(e => ids.includes(e.from) && ids.includes(e.to)))
  assert.ok(frame.nodes.every(n => n.x >= 0 && n.x <= 1 && n.y >= 0 && n.y <= 1))
  const counterexampleState = act(act(state, { type: 'setTargetBudget', amount: 0 }), { type: 'verify' })
  const result = model.frame(counterexampleState).result
  result.mappingWitness.subset.push('invented')
  assert.ok(!counterexampleState.check.mappingWitness.subset.includes('invented'))
})

test('an empty topic produces a genuine global decision mismatch', () => {
  let state = build(0)
  state = act(state, { type: 'chooseEdge', id: 'ab' })
  state = act(state, { type: 'toggleMember', professor: 'p:a' })
  state = act(state, { type: 'toggleMember', professor: 'p:b' })
  const checked = act(state, { type: 'verify' })
  assert.equal(checked.check.sourceDecision, true)
  assert.equal(checked.check.targetDecision, false)
  assert.equal(checked.check.decisionMismatch, true)
  assert.equal(model.report(checked).conclusion.key, 'experiment.reduction.decisionMismatch')
  assert.equal(model.frame(checked).result.decisionMismatch, true)
})

test('target decision quantifies only constructed topics while structural checks still reject omissions', () => {
  const noSource = act(model.create(1), { type: 'verify' })
  assert.equal(noSource.check.sourceDecision, false)
  assert.equal(noSource.check.targetDecision, true, 'zero target topics are covered by the empty committee')
  assert.equal(noSource.check.decisionMismatch, true)
  assert.equal(noSource.check.structural, false)
  assert.equal(noSource.verified, false)

  const yesStart = model.create(0)
  assert.equal(model.report(yesStart).evidence[0].vars.targetCovered, 1)
  const yesNoTopics = act(yesStart, { type: 'verify' })
  assert.equal(yesNoTopics.check.sourceDecision, true)
  assert.equal(yesNoTopics.check.targetDecision, true)
  assert.equal(yesNoTopics.check.structural, false)
  assert.equal(yesNoTopics.verified, false)

  const oneEmptyTopic = act(yesStart, { type: 'addTopic', id: 'ab' })
  assert.equal(model.report(oneEmptyTopic).evidence[0].vars.targetCovered, 0)
  const checked = act(oneEmptyTopic, { type: 'verify' })
  assert.equal(checked.check.sourceDecision, true)
  assert.equal(checked.check.targetDecision, false, 'an actual empty professor list cannot be covered')
  assert.equal(checked.check.decisionMismatch, true)
  assert.equal(checked.check.structural, false)
})

test('invalid actions and argument viewing do not manufacture construction proof', () => {
  const start = model.create(0)
  const invalid = model.apply(start, { type: 'toggleMember', professor: 'p:a' })
  assert.equal(invalid.changed, false)
  assert.equal(invalid.state, start)
  const view = act(start, { type: 'argument', id: 'forward' })
  assert.equal(view.verified, false)
  assert.equal(view.check, null)
  assert.ok(model.report(view).evidence.some(e => e.key.endsWith('argumentForward')))
  assert.equal(start.costs.userActions, 0)
  assert.throws(() => model.create(0, { sourceBudget: 99 }), RangeError)
  assert.throws(() => model.create(0, { targetBudget: -1 }), RangeError)
  assert.throws(() => model.create(0, { targetBudget: 1.5 }), RangeError)
  assert.throws(() => model.create(0, { unknown: 2 }), RangeError)
  assert.deepEqual(model.fields(start).map(f => [f.id, f.min, f.max]), [['sourceBudget', 0, 4], ['targetBudget', 0, 4]])
  assert.ok(model.choices(start).some(choice => choice.action.type === 'chooseEdge'))
  assert.ok(!model.choices(start).some(choice => choice.action.type === 'toggleMember'))
})

test('all reduction formula stages parse as strict TeX, including empty and full topic lists', () => {
  for (const variant of [0, 1]) {
    let state = model.create(variant)
    const stages = [state]
    state = act(state, { type: 'chooseEdge', id: state.edges[0].id }); stages.push(state)
    state = act(state, { type: 'addTopic', id: state.edges[0].id }); stages.push(state)
    state = act(state, { type: 'toggleMember', professor: `p:${state.edges[0].u}` }); stages.push(state)
    state = act(state, { type: 'toggleMember', professor: `p:${state.edges[0].v}` }); stages.push(state)
    state = act(state, { type: 'setTargetBudget', amount: 0 }); stages.push(state)
    state = act(state, { type: 'verify' }); stages.push(state)
    for (const [i, snapshot] of stages.entries()) {
      const formula = model.formula(snapshot)
      assert.equal(model.frame(snapshot).formula, formula)
      assert.doesNotThrow(() => katex.renderToString(formula, { output: 'mathml', throwOnError: true, trust: false, strict: 'error' }), `variant ${variant}, stage ${i}: ${formula}`)
    }
    assert.match(model.formula(stages[2]), /\\varnothing/)
    assert.match(model.formula(stages[4]), /\\\{p_\{/)
  }
})

test('source graph edges have distinct clickable geometry without crossing vertices or each other', () => {
  const distanceToSegment = (p, a, b) => {
    const dx = b.x - a.x, dy = b.y - a.y
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)))
    return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy)
  }
  const orientation = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)
  for (const variant of [0, 1]) {
    const state = model.create(variant), frame = model.frame(state)
    const nodes = new Map(frame.nodes.filter(n => n.id.startsWith('v:')).map(n => [n.id.slice(2), n]))
    assert.ok([...nodes.values()].every(n => n.x < 0.48 && n.x >= 0 && n.y >= 0 && n.y <= 1))
    for (const e of state.edges) {
      const a = nodes.get(e.u), b = nodes.get(e.v)
      for (const [id, p] of nodes) if (id !== e.u && id !== e.v)
        assert.ok(distanceToSegment(p, a, b) > 0.02, `${variant}:${id} lies on ${e.id}`)
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
      for (const other of state.edges) if (other.id !== e.id)
        assert.ok(distanceToSegment(mid, nodes.get(other.u), nodes.get(other.v)) > 0.025, `${variant}:${e.id} midpoint is ambiguous with ${other.id}`)
    }
    for (let i = 0; i < state.edges.length; i++) for (let j = i + 1; j < state.edges.length; j++) {
      const e = state.edges[i], f = state.edges[j]
      if ([e.u, e.v].some(id => id === f.u || id === f.v)) continue
      const a = nodes.get(e.u), b = nodes.get(e.v), c = nodes.get(f.u), d = nodes.get(f.v)
      const crosses = orientation(a, b, c) * orientation(a, b, d) < 0 && orientation(c, d, a) * orientation(c, d, b) < 0
      assert.equal(crosses, false, `${variant}:${e.id} crosses ${f.id}`)
    }
  }
})
