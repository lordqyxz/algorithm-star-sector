import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createExperiment, experimentChoices, applyExperiment, experimentFields, experimentReport } from '../src/game/sim.ts'
import { t, zh } from '../src/game/locale.ts'

const cases=[]
function plan(name,kind,variant,actions) {
  let state=createExperiment(kind,variant)
  const input=Object.fromEntries(experimentFields(state).map(field=>[field.id,field.value]))
  const steps=[]
  const add=action=>{
    const choice=experimentChoices(state).find(choice=>Object.entries(action).every(([key,value])=>key==='amount'||choice.action[key]===value))
    if(!choice)throw Error(`${name}: missing choice ${JSON.stringify(action)}`)
    const result=applyExperiment(state,action)
    const report=experimentReport(result.state)
    steps.push({label:t(choice.key,choice.vars),id:choice.id,action,changed:result.changed,costs:result.state.costs,policy:result.state.policy,verified:result.state.verified,report:[report.feasibility.key,report.strategy.key,report.conclusion.key],feedback:t(result.feedback.key,result.feedback.vars)})
    state=result.state
  }
  actions(add,()=>state)
  cases.push({name,kind,variant,title:zh.experiment.kinds[kind],input,steps})
}
const finishDijkstra=(add,get)=>{
  for(let guard=0;guard<20;guard++){
    const s=get(),next=s.nodes.filter(id=>!s.settled.includes(id)&&Number.isFinite(s.distance[id])).sort((a,b)=>s.distance[a]-s.distance[b])[0]
    if(!next)break
    add({type:'settle',id:next})
    if(get().edges.some(edge=>edge.from===next))add({type:'expand',id:next})
  }
  add({type:'verify'})
}
for(const variant of [0,1]) plan(`dijkstra-valid-${variant}`,'dijkstra',variant,finishDijkstra)
plan('dijkstra-early','dijkstra',0,(add,get)=>{add({type:'settle',id:'s'});add({type:'expand',id:'s'});add({type:'settle',id:'a'});add({type:'expand',id:'a'});add({type:'settle',id:'c'});add({type:'expand',id:'c'});finishDijkstra(add,get)})
for(const variant of [0,1]) plan(`knapsack-solution-${variant}`,'knapsack',variant,(add,get)=>{
  const c=get().input.capacity,w=get().input.weights[3]
  add({type:'selectCell',row:4,capacity:c});add({type:'studyCell'})
  add({type:'connectDependency',row:3,capacity:c,take:false});add({type:'connectDependency',row:3,capacity:c-w,take:true})
  add({type:'write',take:true});add({type:'useCellSolution'});add({type:'verify'})
})
plan('knapsack-draft','knapsack',0,(add,get)=>{
  add({type:'selectCell',row:1,capacity:2});add({type:'connectDependency',row:1,capacity:2,take:true});add({type:'write',take:true})
  add({type:'connectDependency',row:0,capacity:2,take:false});add({type:'connectDependency',row:0,capacity:0,take:true});add({type:'write',take:false})
  add({type:'selectCell',row:3,capacity:2});add({type:'studyCell'});add({type:'toggleItem',id:'item3'});add({type:'toggleItem',id:'item4'});add({type:'verify'})
})
const path=(add,edges,amount)=>{for(const id of edges)add({type:'extend',id});add({type:'augment',amount})}
plan('maxflow-reverse','maxflow',0,add=>{path(add,['sa','ab','bt'],2);path(add,['sb','rev:ab','at'],2);add({type:'verify'})})
plan('maxflow-partial','maxflow',0,add=>{
  for(const id of ['sa','ab','bt'])add({type:'extend',id})
  add({type:'augment',amount:3});add({type:'augment',amount:1});path(add,['sa','ab','bt'],1);path(add,['sb','rev:ab','at'],2);add({type:'verify'})
})
const construct=(add,get)=>{for(const e of get().edges){add({type:'chooseEdge',id:e.id});add({type:'addTopic',id:e.id});add({type:'toggleMember',professor:`p:${e.u}`});add({type:'toggleMember',professor:`p:${e.v}`})}}
for(const variant of [0,1])plan(`reduction-valid-${variant}`,'reduction',variant,(add,get)=>{construct(add,get);add({type:'verify'});add({type:'argument',id:'forward'});add({type:'argument',id:'backward'})})
plan('reduction-counterexample','reduction',0,(add,get)=>{
  construct(add,get);add({type:'chooseEdge',id:'ab'});add({type:'toggleMember',professor:'p:b'});add({type:'toggleVertex',id:'v:b'});add({type:'toggleVertex',id:'v:c'});add({type:'verify'})
  add({type:'toggleMember',professor:'p:a'});add({type:'verify'});add({type:'toggleMember',professor:'p:a'});add({type:'toggleMember',professor:'p:b'});add({type:'verify'})
})
mkdirSync('.playwright-cli',{recursive:true});mkdirSync('/tmp/sector-round2/screenshots',{recursive:true})
writeFileSync('.playwright-cli/experiment-plans.json',JSON.stringify(cases))
const options={url:process.env.SITE_URL||'http://127.0.0.1:4173/',width:Number(process.env.VIEWPORT_WIDTH||1280)}
const audit=`window.__auditText=(${readFileSync('tests/browser-text-bounds.js','utf8')});`
writeFileSync('.playwright-cli/experiment-checks.generated.js',`async page=>{await page.addInitScript({content:${JSON.stringify(audit)}});return (${readFileSync('tests/browser-experiments.js','utf8')})(page,${JSON.stringify(cases)},${JSON.stringify(options)});}`)
writeFileSync('.playwright-cli/experiment-pointer.generated.js',`async page=>{await page.addInitScript({content:${JSON.stringify(audit)}});return (${readFileSync('tests/browser-experiment-pointer.js','utf8')})(page,${JSON.stringify(options)});}`)
console.log(`${cases.length} experiment scenarios exported`)
