import test from 'node:test'
import assert from 'node:assert/strict'
import { labChallengeKey, labChallengeStatus, loadLabSave, markLabChallenge, saveLabRecord } from '../src/game/save.ts'

const withStorage = run => {
  const before=globalThis.window
  const values=new Map([['algorithmia-course-v1','{"existing":true}']])
  globalThis.window={localStorage:{getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)}}
  try { run(values) } finally { if(before===undefined)delete globalThis.window;else globalThis.window=before }
}

test('lab progress keeps independent and assisted evidence separate without overwriting course records',()=>withStorage(values=>{
  const independentMetrics={steps:16,hints:0,errors:0,variant:1,parameter:7}
  const assistedMetrics={steps:16,hints:2,errors:1,variant:0,parameter:7}
  saveLabRecord('knapsack',{viewed:true})
  saveLabRecord('knapsack',{independent:'2026-10-24T10:00:00.000Z',independentMetrics})
  saveLabRecord('knapsack',{assisted:'2026-10-24T10:05:00.000Z',assistedMetrics,last:{mode:'practice',variant:0,parameter:7,actions:[{type:'cell',row:1,capacity:7}],hints:2,errors:1}})
  const record=loadLabSave().knapsack
  assert.deepEqual(record.independentMetrics,independentMetrics)
  assert.deepEqual(record.assistedMetrics,assistedMetrics)
  assert.equal(record.viewed,true)
  assert.equal(record.last.mode,'practice')
  assert.deepEqual(record.last.actions,[{type:'cell',row:1,capacity:7}])
  assert.equal(values.get('algorithmia-course-v1'),'{"existing":true}')
}))

test('malformed lab storage and unsupported attempts cannot become executable history',()=>withStorage(values=>{
  values.set('algorithmia-labs-v1','invalid JSON')
  assert.deepEqual(loadLabSave(),{})
  values.set('algorithmia-labs-v1',JSON.stringify({dijkstra:{viewed:true,last:{mode:'unknown',variant:0,parameter:4,actions:[],hints:0,errors:0}},maxflow:{last:{mode:'practice',variant:2,parameter:2,actions:[],hints:0,errors:0}}}))
  assert.equal(loadLabSave().dijkstra.viewed,true)
  assert.equal(loadLabSave().dijkstra.last,undefined)
  assert.equal(loadLabSave().maxflow.last,undefined)
}))

test('challenge exposure survives reruns and restores from the versioned input ledger',()=>withStorage(values=>{
  const key=labChallengeKey('dijkstra',1,8)
  assert.equal(key,'v2:dijkstra:1:8')
  assert.deepEqual(labChallengeStatus('dijkstra',1,8),{exposed:false,completed:false})
  markLabChallenge('dijkstra',1,8,{exposed:true})
  markLabChallenge('dijkstra',1,8,{completed:true})
  assert.deepEqual(labChallengeStatus('dijkstra',1,8),{exposed:true,completed:true})
  assert.deepEqual(JSON.parse(values.get('algorithmia-lab-exposure-v2'))[key],{exposed:true,completed:true})
  // A restarted scene asks the same stable key; neither reset nor replay clears it.
  assert.equal(labChallengeStatus('dijkstra',1,8).exposed,true)
  assert.deepEqual(labChallengeStatus('dijkstra',1,7),{exposed:false,completed:false})
}))

test('storage failure retains challenge exposure in session memory',()=>withStorage(values=>{
  globalThis.window.localStorage.setItem=()=>{throw Error('quota')}
  markLabChallenge('knapsack',1,10,{exposed:true})
  assert.equal(labChallengeStatus('knapsack',1,10).exposed,true)
  assert.equal(values.has('algorithmia-lab-exposure-v2'),false)
}))

test('legacy independent result stays separate from judgement v2; malformed ledger is ignored',()=>withStorage(values=>{
  saveLabRecord('maxflow',{independent:'old-date',independentMetrics:{steps:10,hints:0,errors:0,variant:1,parameter:6}})
  let record=loadLabSave().maxflow
  assert.equal(record.independent,'old-date')
  assert.equal(record.independentV2,undefined)
  saveLabRecord('maxflow',{independentV2:'new-date',independentMetricsV2:{steps:9,hints:0,errors:0,variant:1,parameter:7,judgementVersion:2}})
  record=loadLabSave().maxflow
  assert.equal(record.independent,'old-date')
  assert.equal(record.independentV2,'new-date')
  assert.equal(record.independentMetricsV2.judgementVersion,2)
  values.set('algorithmia-labs-v1',JSON.stringify({maxflow:{independent:'old-date',independentV2:'forged',independentMetricsV2:{steps:-1,hints:0,errors:0,variant:1,parameter:7,judgementVersion:2}}}))
  assert.equal(loadLabSave().maxflow.independentV2,undefined)
  assert.equal(loadLabSave().maxflow.independent,'old-date')
  values.set('algorithmia-lab-exposure-v2',JSON.stringify({'v2:maxflow:1:9':{exposed:'yes',completed:false},'v1:maxflow:1:8':{exposed:true,completed:true}}))
  assert.deepEqual(labChallengeStatus('maxflow',1,9),{exposed:false,completed:false})
}))
