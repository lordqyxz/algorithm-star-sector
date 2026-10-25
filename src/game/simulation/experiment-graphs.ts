import type { TraceEdge, TraceFrame, TraceNode } from '../types'
import type { ExperimentAction, ExperimentAdapter, ExperimentBase, ExperimentChoice, ExperimentFact, ExperimentField, ExperimentReport, ExperimentTransition } from './experiment-types'

type WeightedEdge = { id: string; from: string; to: string; weight: number }
type CapacityEdge = { id: string; from: string; to: string; capacity: number }
type Evidence = { key: string; vars?: Record<string, string | number>; targets?: string[]; tone?: ExperimentFact['tone'] }
export type DijkstraExperiment = ExperimentBase & {
  kind: 'dijkstra'
  nodes: string[]
  edges: WeightedEdge[]
  distance: Record<string, number>
  previous: Record<string, string | null>
  settled: string[]
  scannedAt: Record<string, number>
  last: Evidence
  oldDistance?: number
  changedNode?: string
  pathChanges: { node: string; old: number; current: number; oldPath: string; newPath: string; via: string; weight: number; base: number }[]
}
export type MaxFlowExperiment = ExperimentBase & {
  kind: 'maxflow'
  nodes: string[]
  edges: CapacityEdge[]
  flow: Record<string, number>
  path: string[]
  pathEdges: string[]
  total: number
  last: Evidence
  lastChanges: { id: string; before: number; after: number }[]
  lastAugment: { id: string; from: string; to: string; signedDelta: number; residualAfter: number; reverse: boolean }[]
}
const at: Record<string, [number, number]> = {
  s: [.08,.5], a:[.34,.18], b:[.34,.82], c:[.65,.18], d:[.65,.82], t:[.92,.5],
}
const nodesView = (ids: string[], labels: (id: string) => string, tone: (id: string) => TraceNode['tone']): TraceNode[] =>
  ids.map(id => ({ id, value: id.toUpperCase(), label: labels(id), x: at[id][0], y: at[id][1], tone: tone(id) }))
const fact = (kind: 'dijkstra' | 'maxflow', suffix: string, vars?: Evidence['vars'], targets?: string[], tone?: ExperimentFact['tone']): ExperimentFact =>
  ({ key: `experiment.${kind}.${suffix}`, vars, targets, tone })
const transition = <S extends ExperimentBase>(state: S, changed: boolean, feedback: ExperimentFact): ExperimentTransition<S> => ({ state, changed, feedback })
const clone = <T>(x: T): T => structuredClone(x)
const validInput = <E extends {id:string}>(edges: E[], input: Record<string,number> | undefined): void => {
  if (!input) return
  const ids = new Set(edges.map(e=>e.id))
  for (const [id,value] of Object.entries(input)) if (!ids.has(id) || !Number.isInteger(value) || value<0 || value>9) throw new RangeError(`invalid graph field ${id}`)
}
const dCases: WeightedEdge[][] = [
  [['sa','s','a',2],['sb','s','b',2],['ac','a','c',4],['bc','b','c',4],['bd','b','d',3],['cd','c','d',1],['ct','c','t',3],['dt','d','t',2]],
  [['sa','s','a',3],['sb','s','b',1],['ba','b','a',2],['ac','a','c',2],['bc','b','c',6],['bd','b','d',4],['cd','c','d',1],['ct','c','t',4],['dt','d','t',2]],
].map(list=>list.map(([id,from,to,weight])=>({id:id as string,from:from as string,to:to as string,weight:weight as number})))
const fCases: CapacityEdge[][] = [
  [['sa','s','a',3],['sb','s','b',2],['ab','a','b',2],['at','a','t',2],['bt','b','t',2]],
  [['sa','s','a',3],['sb','s','b',3],['ab','a','b',2],['at','a','t',2],['bt','b','t',3]],
].map(list=>list.map(([id,from,to,capacity])=>({id:id as string,from:from as string,to:to as string,capacity:capacity as number})))
const dCosts = () => ({ userActions:0, relaxations:0, edgeScans:0, settles:0, tests:0 })
const fCosts = () => ({ userActions:0, augmentations:0, edgeUpdates:0, tests:0 })
const dNode = (id: string) => `node:${id}`
const dEdge = (id: string) => `edge:${id}`
const distanceLabel = (x: number) => Number.isFinite(x) ? String(x) : '∞'
const pathTo = (previous: Record<string,string|null>, node: string): string => {
  const path: string[] = [], seen = new Set<string>()
  for (let current: string | null = node; current && !seen.has(current); current = previous[current]) { path.push(current); seen.add(current) }
  return path.at(-1)==='s' ? path.reverse().join('→') : '∅'
}
const dReachable = (s: DijkstraExperiment): Set<string> => {const seen=new Set(['s']);const q=['s'];for(const u of q)for(const e of s.edges)if(e.from===u&&!seen.has(e.to)){seen.add(e.to);q.push(e.to)}return seen}
const dComplete = (s: DijkstraExperiment) => [...dReachable(s)].every(id=>s.settled.includes(id)) && s.edges.every(e=>!Number.isFinite(s.distance[e.from])||s.scannedAt[e.id]===s.distance[e.from])
const dOracle = (s: DijkstraExperiment): Record<string, number> => {
  const dist=Object.fromEntries(s.nodes.map(id=>[id,id==='s'?0:Infinity])) as Record<string,number>, used=new Set<string>()
  while(true){const u=s.nodes.filter(id=>!used.has(id)).sort((a,b)=>dist[a]-dist[b])[0];if(!u||!Number.isFinite(dist[u]))break;used.add(u);for(const e of s.edges)if(e.from===u)dist[e.to]=Math.min(dist[e.to],dist[u]+e.weight)}
  return dist
}
const dEvidence = (s:DijkstraExperiment): ExperimentFact[] => {
  const out=[fact('dijkstra','costEvidence',{ actions:s.costs.userActions, scans:s.costs.edgeScans, improvements:s.costs.relaxations })]
  for(const change of s.pathChanges)out.push(fact('dijkstra','distanceChange',{node:change.node,old:distanceLabel(change.old),current:distanceLabel(change.current),oldPath:change.oldPath,newPath:change.newPath,via:change.via,weight:change.weight,base:change.base},[dNode(change.node),dEdge(s.edges.find(e=>e.from===change.via&&e.to===change.node)!.id)]))
  if(s.verified&&dComplete(s)){const oracle=dOracle(s);const mismatch=s.nodes.find(id=>oracle[id]!==s.distance[id]);if(mismatch)out.push(fact('dijkstra','mismatch',{node:mismatch,observed:distanceLabel(s.distance[mismatch]),reference:distanceLabel(oracle[mismatch])},[dNode(mismatch)],'witness'));else out.push(fact('dijkstra','instanceMatch'))}
  return out
}
function dCreate(variant:0|1,input?:Record<string,number>):DijkstraExperiment {
  const edges=clone(dCases[variant]);validInput(edges,input);for(const e of edges)if(input?.[e.id]!==undefined)e.weight=input[e.id]
  const nodes=['s','a','b','c','d','t']
  return {kind:'dijkstra',variant,verified:false,policy:true,costs:dCosts(),nodes,edges,distance:Object.fromEntries(nodes.map(id=>[id,id==='s'?0:Infinity])),previous:Object.fromEntries(nodes.map(id=>[id,null])),settled:[],scannedAt:{},last:{key:'experiment.dijkstra.start'},pathChanges:[]}
}
function dChoices(s:DijkstraExperiment):ExperimentChoice[] {
  const choices:ExperimentChoice[]=[]
  for(const id of s.nodes)if(Number.isFinite(s.distance[id])&&!s.settled.includes(id))choices.push({id:`settle:${id}`,key:'experiment.dijkstra.settleChoice',vars:{node:id,distance:s.distance[id]},action:{type:'settle',id},targets:[dNode(id)]})
  for(const id of s.nodes)if(Number.isFinite(s.distance[id])&&s.edges.some(e=>e.from===id))choices.push({id:`expand:${id}`,key:'experiment.dijkstra.expandChoice',vars:{node:id},action:{type:'expand',id},targets:[dNode(id)]})
  for(const e of s.edges)if(Number.isFinite(s.distance[e.from]))choices.push({id:`relax:${e.id}`,key:'experiment.dijkstra.relaxChoice',vars:{from:e.from,to:e.to,weight:e.weight},action:{type:'relax',id:e.id},targets:[dEdge(e.id)]})
  choices.push({id:'verify',key:'experiment.dijkstra.verifyChoice',action:{type:'verify'}})
  return choices
}
function dApply(s:DijkstraExperiment,a:ExperimentAction):ExperimentTransition<DijkstraExperiment> {
  const reject=(suffix:string)=>transition(s,false,fact('dijkstra',suffix,undefined,a.id?[a.type==='relax'?dEdge(a.id):dNode(a.id)]:undefined,'bad'))
  if(a.type==='verify'){const next=clone(s);next.verified=true;next.costs.tests++;next.costs.userActions++;next.last={key:'experiment.dijkstra.verified'};return transition(next,true,fact('dijkstra','verified',undefined,undefined,'good'))}
  if(a.type==='settle'){
    const id=a.id;if(!id||!s.nodes.includes(id)||!Number.isFinite(s.distance[id])||s.settled.includes(id))return reject('invalidSettle')
    const remaining=s.nodes.filter(n=>Number.isFinite(s.distance[n])&&!s.settled.includes(n)),minimum=Math.min(...remaining.map(n=>s.distance[n]))
    const stale=s.edges.some(e=>s.settled.includes(e.from)&&s.scannedAt[e.id]!==s.distance[e.from])
    const next=clone(s);next.settled.push(id);next.policy&&=s.distance[id]===minimum&&!stale;next.verified=false;next.costs.settles++;next.costs.userActions++;next.changedNode=undefined;next.oldDistance=undefined;next.pathChanges=[]
    next.last={key:next.policy?'experiment.dijkstra.settled':'experiment.dijkstra.earlyMark',vars:{node:id,distance:s.distance[id],minimum},targets:[dNode(id)]}
    return transition(next,true,{...next.last,tone:next.policy?'good':'caution'})
  }
  if(a.type==='relax'||a.type==='expand'){
    const edges=a.type==='relax'?s.edges.filter(e=>e.id===a.id):s.edges.filter(e=>e.from===a.id)
    if(!edges.length||edges.some(e=>!Number.isFinite(s.distance[e.from])))return reject('invalidEdge')
    const next=clone(s);next.changedNode=undefined;next.oldDistance=undefined;next.pathChanges=[];next.policy&&=edges.every(e=>s.settled.includes(e.from));let improved=0
    for(const e of edges){const old=next.distance[e.to],base=next.distance[e.from],candidate=base+e.weight;next.scannedAt[e.id]=base;next.costs.edgeScans++;if(candidate<old){const oldPath=Number.isFinite(old)?pathTo(next.previous,e.to):'∅',newPath=`${pathTo(next.previous,e.from)}→${e.to}`;next.distance[e.to]=candidate;next.previous[e.to]=e.from;next.oldDistance=old;next.changedNode=e.to;next.pathChanges.push({node:e.to,old,current:candidate,oldPath,newPath,via:e.from,weight:e.weight,base});next.costs.relaxations++;improved++;if(next.settled.includes(e.to))next.policy=false}}
    next.verified=false;next.costs.userActions++;next.last={key:a.type==='expand'?'experiment.dijkstra.expanded':improved?'experiment.dijkstra.improved':'experiment.dijkstra.noImprovement',vars:{node:a.id??'',scanned:edges.length,improved},targets:edges.map(e=>dEdge(e.id))}
    return transition(next,true,{...next.last,tone:next.policy?'good':'caution'})
  }
  return reject('unknownAction')
}
function dFrame(s:DijkstraExperiment):TraceFrame {
  const nodes=nodesView(s.nodes,id=>`${distanceLabel(s.distance[id])}${s.settled.includes(id)?s.policy?' ✓':' !':' ?'}`,id=>s.settled.includes(id)?s.policy?'settled':'black':Number.isFinite(s.distance[id])?'active':'muted')
  const edges:TraceEdge[]=s.edges.map(e=>({from:e.from,to:e.to,directed:true,weight:e.weight,tone:s.previous[e.to]===e.from?'active':s.scannedAt[e.id]!==undefined?'settled':'muted'}))
  return {op:s.verified&&s.policy&&dComplete(s)&&s.nodes.every(id=>dOracle(s)[id]===s.distance[id])?'done':'update',formula:dFormula(s),nodes,edges,output:s.nodes.map(id=>({id:`distance:${id}`,value:distanceLabel(s.distance[id]),label:id})),counters:{...s.costs,settled:s.settled.length,policy:s.policy?1:0,verified:s.verified?1:0},result:{distance:clone(s.distance),previous:clone(s.previous),settled:[...s.settled],policy:s.policy,complete:dComplete(s)}}
}
function dReport(s:DijkstraExperiment):ExperimentReport {
  const complete=dComplete(s), oracle=s.verified&&complete?dOracle(s):null, match=oracle&&s.nodes.every(id=>oracle[id]===s.distance[id])
  const conclusion=!s.verified||!complete?fact('dijkstra','pending', {remaining:s.nodes.filter(id=>dReachable(s).has(id)&&!s.settled.includes(id)).length}):!match?fact('dijkstra','inconsistent',undefined,undefined,'witness'):s.policy?fact('dijkstra','certificate',undefined,undefined,'good'):fact('dijkstra','instanceMatchNoPolicy',undefined,undefined,'caution')
  return {feasibility:fact('dijkstra','feasible',undefined,undefined,'good'),strategy:fact('dijkstra',s.policy?'strategyOk':'strategyDeparted',undefined,undefined,s.policy?'good':'caution'),conclusion,evidence:dEvidence(s),summary:{...s.last,tone:s.policy?'good':'caution'}}
}
function dFields(s:DijkstraExperiment):ExperimentField[]{return s.edges.map(e=>({id:e.id,key:'experiment.dijkstra.weightField',vars:{from:e.from,to:e.to},value:e.weight,min:0,max:9,step:1}))}
function dFormula(s:DijkstraExperiment):string {if(s.changedNode&&s.oldDistance!==undefined){const e=s.edges.find(e=>e.to===s.changedNode&&e.from===s.previous[s.changedNode]);if(e)return `d(${e.from})+w(${e.from},${e.to})=${distanceLabel(s.distance[e.from])}+${e.weight}=${distanceLabel(s.distance[e.to])}`}return 'd(v)←min(d(v),d(u)+w(u,v))'}
export const dijkstraExperiment:ExperimentAdapter<DijkstraExperiment>={create:dCreate,choices:dChoices,apply:dApply,frame:dFrame,report:dReport,fields:dFields,formula:dFormula}

export type ResidualArc = { id:string; from:string; to:string; capacity:number; original:string; reverse:boolean }
export function maxflowResidual(s:MaxFlowExperiment):ResidualArc[]{return s.edges.flatMap(e=>[{id:e.id,from:e.from,to:e.to,capacity:e.capacity-s.flow[e.id],original:e.id,reverse:false},{id:`rev:${e.id}`,from:e.to,to:e.from,capacity:s.flow[e.id],original:e.id,reverse:true}])}
const fReachable=(s:MaxFlowExperiment):Set<string>=>{const seen=new Set(['s']),q=['s'],arcs=maxflowResidual(s);for(const u of q)for(const a of arcs)if(a.from===u&&a.capacity>0&&!seen.has(a.to)){seen.add(a.to);q.push(a.to)}return seen}
const fBottleneck=(s:MaxFlowExperiment):number=>Math.min(...s.pathEdges.map(id=>maxflowResidual(s).find(a=>a.id===id)?.capacity??0))
const fFeasible=(s:MaxFlowExperiment):boolean=>{const bal=Object.fromEntries(s.nodes.map(id=>[id,0])) as Record<string,number>;for(const e of s.edges){const f=s.flow[e.id];if(f<0||f>e.capacity)return false;bal[e.from]-=f;bal[e.to]+=f}return bal.s===-s.total&&bal.t===s.total&&s.nodes.filter(id=>id!=='s'&&id!=='t').every(id=>bal[id]===0)}
const fCut=(s:MaxFlowExperiment)=>{const side=fReachable(s),crossing=s.edges.filter(e=>side.has(e.from)&&!side.has(e.to));return {side,crossing,capacity:crossing.reduce((sum,e)=>sum+e.capacity,0)}}
function fCreate(variant:0|1,input?:Record<string,number>):MaxFlowExperiment {const edges=clone(fCases[variant]);validInput(edges,input);for(const e of edges)if(input?.[e.id]!==undefined)e.capacity=input[e.id];return {kind:'maxflow',variant,verified:false,policy:true,costs:fCosts(),nodes:['s','a','b','t'],edges,flow:Object.fromEntries(edges.map(e=>[e.id,0])),path:['s'],pathEdges:[],total:0,last:{key:'experiment.maxflow.start'},lastChanges:[],lastAugment:[]}}
function fChoices(s:MaxFlowExperiment):ExperimentChoice[]{const choices:ExperimentChoice[]=[];if(s.path.at(-1)!=='t'){for(const arc of maxflowResidual(s))if(arc.from===s.path.at(-1)&&arc.capacity>0&&!s.path.includes(arc.to))choices.push({id:`extend:${arc.id}`,key:'experiment.maxflow.extendChoice',vars:{from:arc.from,to:arc.to,residual:arc.capacity},action:{type:'extend',id:arc.id},targets:[dEdge(arc.id)]})}if(s.pathEdges.length){choices.push({id:'pop',key:'experiment.maxflow.popChoice',action:{type:'pop'}});choices.push({id:'clear',key:'experiment.maxflow.clearChoice',action:{type:'clear'}});if(s.path.at(-1)==='t')choices.push({id:'augment',key:'experiment.maxflow.augmentChoice',action:{type:'augment',amount:fBottleneck(s)}})}choices.push({id:'verify',key:'experiment.maxflow.verifyChoice',action:{type:'verify'}});return choices}
function fApply(s: MaxFlowExperiment, a: ExperimentAction): ExperimentTransition<MaxFlowExperiment> {
  const reject = (suffix: string) => transition(s, false, fact('maxflow', suffix, undefined, a.id ? [dEdge(a.id)] : undefined, 'bad'))
  if (a.type === 'verify') {
    const next = clone(s)
    next.verified = true
    next.lastAugment = []
    next.lastChanges = []
    next.costs.tests++
    next.costs.userActions++
    next.last = { key: 'experiment.maxflow.verified' }
    return transition(next, true, fact('maxflow', 'verified', undefined, undefined, 'good'))
  }
  if (a.type === 'extend') {
    const arc = maxflowResidual(s).find(e => e.id === a.id)
    if (!arc || arc.from !== s.path.at(-1) || arc.capacity <= 0 || s.path.includes(arc.to) || s.path.at(-1) === 't') return reject('invalidExtension')
    const next = clone(s)
    next.path.push(arc.to)
    next.pathEdges.push(arc.id)
    next.lastAugment = []
    next.lastChanges = []
    next.verified = false
    next.costs.userActions++
    next.last = { key: 'experiment.maxflow.extended', vars: { from: arc.from, to: arc.to, residual: arc.capacity }, targets: [dEdge(arc.id)] }
    return transition(next, true, { ...next.last, tone: 'good' })
  }
  if (a.type === 'pop' || a.type === 'clear') {
    if (!s.pathEdges.length) return reject('emptyPath')
    const next = clone(s)
    if (a.type === 'pop') { next.path.pop(); next.pathEdges.pop() }
    else { next.path = ['s']; next.pathEdges = [] }
    next.lastAugment = []
    next.lastChanges = []
    next.verified = false
    next.costs.userActions++
    next.last = { key: a.type === 'pop' ? 'experiment.maxflow.popped' : 'experiment.maxflow.cleared' }
    return transition(next, true, { ...next.last, tone: 'good' })
  }
  if (a.type === 'augment') {
    const bottleneck = fBottleneck(s)
    if (s.path.at(-1) !== 't' || !Number.isInteger(a.amount) || !a.amount || a.amount < 1 || a.amount > bottleneck) return reject('invalidAugment')
    const next = clone(s), amount = a.amount
    const usedArcs = s.pathEdges.map(id => maxflowResidual(s).find(e => e.id === id)!)
    next.lastChanges = []
    for (const arc of usedArcs) {
      const before = next.flow[arc.original]
      next.flow[arc.original] += arc.reverse ? -amount : amount
      next.lastChanges.push({ id: arc.original, before, after: next.flow[arc.original] })
    }
    const after = maxflowResidual(next)
    next.lastAugment = usedArcs.map(arc => ({
      id: arc.id, from: arc.from, to: arc.to, reverse: arc.reverse,
      signedDelta: arc.reverse ? -amount : amount,
      residualAfter: after.find(e => e.id === arc.id)!.capacity,
    }))
    next.total += amount
    const usedFullBottleneck = amount === bottleneck
    next.policy &&= usedFullBottleneck
    next.path = ['s']
    next.pathEdges = []
    next.verified = false
    next.costs.userActions++
    next.costs.augmentations++
    next.costs.edgeUpdates += usedArcs.length
    next.last = { key: usedFullBottleneck ? 'experiment.maxflow.augmented' : 'experiment.maxflow.partialAugment', vars: { amount, bottleneck, total: next.total }, targets: usedArcs.map(arc => dEdge(arc.id)), tone: usedFullBottleneck ? 'good' : 'caution' }
    return transition(next, true, next.last)
  }
  return reject('unknownAction')
}
function fFrame(s: MaxFlowExperiment): TraceFrame {
  const draft = new Set(s.pathEdges)
  const recent = new Map(s.lastAugment.map(arc => [arc.id, arc]))
  const highlighted = draft.size ? draft : new Set(recent.keys())
  const activeNodes = draft.size ? new Set(s.path) : new Set(s.lastAugment.flatMap(arc => [arc.from, arc.to]))
  const cut = s.verified && !fReachable(s).has('t') && fFeasible(s) ? fCut(s) : null
  const certified = cut !== null && cut.capacity === s.total
  const crossing = new Set(certified ? cut.crossing.map(e => e.id) : [])
  const nodes = nodesView(
    s.nodes,
    id => certified ? `${id === 's' ? `|f|=${s.total} ` : ''}∈${cut.side.has(id) ? 'S' : 'T'}` : id === 's' ? `|f|=${s.total}` : id === 't' ? 'sink' : id,
    id => certified ? cut.side.has(id) ? 'settled' : 'black' : activeNodes.has(id) ? 'active' : 'settled',
  )
  const edges: TraceEdge[] = maxflowResidual(s)
    .filter(arc => !arc.reverse || arc.capacity > 0 || highlighted.has(arc.id))
    .map(arc => {
      const event = recent.get(arc.id)
      const weight = arc.reverse
        ? `r:${arc.capacity}${event ? `,−${Math.abs(event.signedDelta)}` : ''}`
        : `${s.flow[arc.original]}/${s.edges.find(e => e.id === arc.original)!.capacity}${event ? `,+${event.signedDelta}` : ''}`
      return { from: arc.from, to: arc.to, directed: true, weight, tone: highlighted.has(arc.id) || !arc.reverse && crossing.has(arc.id) ? 'active' : arc.reverse ? 'black' : 'muted', saturated: arc.capacity === 0 }
    })
  return {
    op: certified ? 'done' : 'update',
    formula: fFormula(s), nodes, edges,
    output: s.edges.map(e => ({ id: `flow:${e.id}`, value: `${s.flow[e.id]}/${e.capacity}`, label: e.id })),
    counters: { ...s.costs, flow: s.total, verified: s.verified ? 1 : 0 },
    result: { flow: clone(s.flow), total: s.total, path: [...s.path], pathEdges: [...s.pathEdges], lastAugment: clone(s.lastAugment), policy: s.policy, feasible: fFeasible(s), cut: certified ? { side: [...cut.side], crossing: [...crossing], capacity: cut.capacity } : null },
  }
}
function fReport(s: MaxFlowExperiment): ExperimentReport {
  const reachable = fReachable(s), finished = !reachable.has('t'), cut = s.verified && finished ? fCut(s) : null
  const conclusion = !s.verified || !finished
    ? fact('maxflow', 'pending')
    : !fFeasible(s) || cut?.capacity !== s.total
      ? fact('maxflow', 'inconsistent', undefined, undefined, 'witness')
      : fact('maxflow', 'certificate', { flow: s.total, cut: cut.capacity, side: [...cut.side].join(','), crossing: cut.crossing.map(e => e.id).join(',') }, cut.crossing.map(e => dEdge(e.id)), 'good')
  const evidence = [fact('maxflow', 'costEvidence', { actions: s.costs.userActions, augmentations: s.costs.augmentations, edgeUpdates: s.costs.edgeUpdates })]
  for (const change of s.lastChanges) evidence.push(fact('maxflow', 'edgeChange', { edge: change.id, before: change.before, after: change.after }, [dEdge(change.id)]))
  for (const arc of s.lastAugment.filter(arc => arc.reverse)) {
    const change = s.lastChanges.find(item => item.id === arc.id.slice(4))!
    evidence.push(fact('maxflow', 'reverseChange', { edge: change.id, from: arc.from, to: arc.to, amount: Math.abs(arc.signedDelta), before: change.before, after: change.after }, [dEdge(arc.id), dEdge(change.id)]))
  }
  if (cut) evidence.push(fact('maxflow', 'cutEvidence', { capacity: cut.capacity, flow: s.total, side: [...cut.side].join(',') }, cut.crossing.map(e => dEdge(e.id))))
  return {
    feasibility: fact('maxflow', fFeasible(s) ? 'feasible' : 'infeasible', undefined, undefined, fFeasible(s) ? 'good' : 'bad'),
    strategy: fact('maxflow', s.policy ? 'strategyOk' : 'strategyDeparted', undefined, undefined, s.policy ? 'good' : 'caution'),
    conclusion, evidence, summary: { ...s.last, tone: s.last.tone ?? (s.policy ? 'good' : 'caution') },
  }
}
function fFields(s:MaxFlowExperiment):ExperimentField[]{return s.edges.map(e=>({id:e.id,key:'experiment.maxflow.capacityField',vars:{from:e.from,to:e.to},value:e.capacity,min:0,max:9,step:1}))}
function fFormula(s:MaxFlowExperiment):string {
  const cut = s.verified && !fReachable(s).has('t') && fFeasible(s) ? fCut(s) : null
  const last = cut && cut.capacity === s.total
    ? `|f|&=C(S,T)=${cut.capacity}`
    : s.pathEdges.length
      ? String.raw`0<\Delta&\leq\min_{e\in P}r_f(e)`
      : `|f|&=${s.total}`
  return String.raw`\begin{aligned}r_{uv}&=c_{uv}-f_{uv}\\r_{vu}&=f_{uv}\\${last}\end{aligned}`
}
export const maxflowExperiment:ExperimentAdapter<MaxFlowExperiment>={create:fCreate,choices:fChoices,apply:fApply,frame:fFrame,report:fReport,fields:fFields,formula:fFormula}
