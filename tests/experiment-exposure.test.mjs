import test from 'node:test'
import assert from 'node:assert/strict'
import { createExperiment, createLab, labParameterTarget } from '../src/game/sim.ts'
import { equivalentChallenge, recordExperimentExposure } from '../src/game/experiment-exposure.ts'
import { labChallengeStatus } from '../src/game/save.ts'

test('free previews of the same mathematical input expose the matching strategy challenge', () => {
  assert.deepEqual(equivalentChallenge(createExperiment('dijkstra',1)),{kind:'dijkstra',parameter:4})
  assert.deepEqual(equivalentChallenge(createExperiment('maxflow',1)),{kind:'maxflow',parameter:3})
  assert.equal(equivalentChallenge(createExperiment('dijkstra',0)),null)
  assert.equal(equivalentChallenge(createExperiment('reduction')),null)
  const knapsack=createExperiment('knapsack',0,{capacity:6,w1:2,v1:4,w2:2,v2:4,w3:3,v3:5,w4:4,v4:7})
  assert.deepEqual(equivalentChallenge(knapsack),{kind:'knapsack',parameter:6})
  const before=globalThis.window,values=new Map()
  globalThis.window={localStorage:{getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)}}
  try {recordExperimentExposure(knapsack);assert.equal(labChallengeStatus('knapsack',1,6).exposed,true);assert.equal(labChallengeStatus('knapsack',1,5).exposed,false)} finally {if(before===undefined)delete globalThis.window;else globalThis.window=before}
})

test('strategy parameter names identify the actual edge that changes in both input families', () => {
  assert.equal(labParameterTarget(createLab('dijkstra',0)),'a→c')
  assert.equal(labParameterTarget(createLab('dijkstra',1)),'b→d')
  assert.equal(labParameterTarget(createLab('maxflow',0)),'s→a')
  assert.equal(labParameterTarget(createLab('maxflow',1)),'s→b')
  assert.equal(labParameterTarget(createLab('knapsack',0)),null)
})
