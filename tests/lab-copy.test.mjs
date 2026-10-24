import test from 'node:test'
import assert from 'node:assert/strict'
import { createLab, labChoices, applyLabAction, labIsComplete, labParameter, labDemoAction, labHint, labReference, labSummary } from '../src/game/sim.ts'
import { t } from '../src/game/locale.ts'

test('all reachable lab choices, feedback and both hint levels resolve complete localized copy', () => {
  let configurations = 0
  const check = entry => {
    const copy = t(entry.key ?? entry.labelKey, entry.vars)
    assert.doesNotMatch(copy, /\{[A-Za-z][A-Za-z0-9_]*\}/, `${entry.key}: unresolved interpolation`)
    assert.ok(copy.trim())
  }
  for (const kind of ['dijkstra','knapsack','maxflow']) {
    const range = labParameter(kind)
    for (const variant of [0,1]) for (let parameter = range.min; parameter <= range.max; parameter += range.step) {
      let state = createLab(kind, variant, parameter)
      configurations++
      for (let guard = 0; !labIsComplete(state) && guard < 200; guard++) {
        for (const choice of labChoices(state)) { check(choice); check(applyLabAction(state, choice.action).feedback) }
        check(labHint(state,1)); check(labHint(state,2))
        const result = applyLabAction(state,labDemoAction(state))
        assert.ok(result.changed)
        state = result.state
      }
      assert.ok(labIsComplete(state))
      check(labReference(state)); check(labSummary(state))
    }
  }
  assert.equal(configurations, 50)
})

test('each visible parameter can change a computed outcome rather than only presentation',()=>{
  for(const kind of ['dijkstra','knapsack','maxflow'])for(const variant of [0,1]){
    const range=labParameter(kind)
    assert.notEqual(labReference(createLab(kind,variant,range.min)).value,labReference(createLab(kind,variant,range.max)).value,`${kind}/${variant}: meaningful condition change`)
  }
})
