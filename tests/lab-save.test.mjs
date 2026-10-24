import test from 'node:test'
import assert from 'node:assert/strict'
import { loadLabSave, saveLabRecord } from '../src/game/save.ts'

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
