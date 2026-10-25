import test from 'node:test'
import assert from 'node:assert/strict'
import katex from 'katex'
import { dijkstraExperiment as D, maxflowExperiment as F, maxflowResidual } from '../src/game/simulation/experiment-graphs.ts'

const act=(adapter,s,action)=>{const result=adapter.apply(s,action);assert.ok(result.changed,`${action.type}:${action.id??''}`);return result.state}
const bellman=s=>{const d=Object.fromEntries(s.nodes.map(id=>[id,id==='s'?0:Infinity]));for(let i=1;i<s.nodes.length;i++)for(const e of s.edges)d[e.to]=Math.min(d[e.to],d[e.from]+e.weight);return d}
const cut=s=>{let best=Infinity;const mids=s.nodes.filter(x=>x!=='s'&&x!=='t');for(let mask=0;mask<1<<mids.length;mask++){const side=new Set(['s',...mids.filter((_,i)=>mask>>i&1)]);best=Math.min(best,s.edges.filter(e=>side.has(e.from)&&!side.has(e.to)).reduce((sum,e)=>sum+e.capacity,0))}return best}
const flowFeasible=s=>{const balance=Object.fromEntries(s.nodes.map(id=>[id,0]));for(const e of s.edges){assert.ok(s.flow[e.id]>=0&&s.flow[e.id]<=e.capacity);balance[e.from]-=s.flow[e.id];balance[e.to]+=s.flow[e.id]}assert.equal(balance.s,-s.total);assert.equal(balance.t,s.total);for(const id of s.nodes.filter(x=>x!=='s'&&x!=='t'))assert.equal(balance[id],0)}
const fields=(adapter,s)=>{for(const field of adapter.fields(s)){assert.ok(field.value>=0&&field.value<=9);assert.equal(field.min,0);assert.equal(field.max,9)}}

test('Dijkstra greedy routes earn a certificate only after explicit verify',()=>{
  for(const v of [0,1])for(const input of [undefined,{sa:0,ct:1}]){
    let s=D.create(v,input);fields(D,s);assert.equal(D.report(s).conclusion.key,'experiment.dijkstra.pending')
    while(true){const next=s.nodes.filter(id=>Number.isFinite(s.distance[id])&&!s.settled.includes(id)).sort((a,b)=>s.distance[a]-s.distance[b])[0];if(!next)break;s=act(D,s,{type:'settle',id:next});if(s.edges.some(e=>e.from===next))s=act(D,s,{type:'expand',id:next})}
    assert.deepEqual(s.distance,bellman(s));assert.equal(D.report(s).conclusion.key,'experiment.dijkstra.pending');s=act(D,s,{type:'verify'});assert.equal(D.report(s).conclusion.key,'experiment.dijkstra.certificate');assert.equal(s.policy,true)
    const frame=D.frame(s);assert.ok(frame.nodes.every(n=>n.x>=0&&n.x<=1&&n.y>=0&&n.y<=1));assert.ok(frame.edges.every(e=>frame.nodes.some(n=>n.id===e.from)&&frame.nodes.some(n=>n.id===e.to)))
  }
})

test('Dijkstra premature mark remains a policy departure and later improvement is visible',()=>{
  let s=D.create(0);s=act(D,s,{type:'settle',id:'s'});s=act(D,s,{type:'expand',id:'s'});s=act(D,s,{type:'settle',id:'a'});s=act(D,s,{type:'expand',id:'a'});s=act(D,s,{type:'settle',id:'c'});assert.equal(s.policy,false);s=act(D,s,{type:'expand',id:'c'});s=act(D,s,{type:'settle',id:'d'});assert.equal(s.distance.d,7);s=act(D,s,{type:'expand',id:'b'});assert.equal(s.distance.d,5);assert.equal(s.oldDistance,7);assert.equal(s.changedNode,'d');assert.equal(s.previous.d,'b');assert.ok(D.report(s).evidence.some(e=>e.key==='experiment.dijkstra.distanceChange'&&e.vars.old==='7'&&e.vars.current==='5'))
  assert.ok(D.report(s).evidence.some(e=>e.key==='experiment.dijkstra.distanceChange'&&e.vars.oldPath==='s→a→c→d'&&e.vars.newPath==='s→b→d'&&e.vars.base===2&&e.vars.weight===3))
  s=act(D,s,{type:'settle',id:'b'});s=act(D,s,{type:'expand',id:'d'});s=act(D,s,{type:'settle',id:'t'});s=act(D,s,{type:'verify'});assert.equal(s.policy,false);assert.notEqual(D.report(s).conclusion.key,'experiment.dijkstra.certificate')
  const before=structuredClone(s),invalid=D.apply(s,{type:'relax',id:'ghost'});assert.equal(invalid.changed,false);assert.strictEqual(invalid.state,s);assert.deepEqual(s,before)
})

test('Dijkstra input fields validate and restart without inherited search state',()=>{
  for(const bad of [{sa:-1},{sa:10},{sa:1.5},{unknown:1}])assert.throws(()=>D.create(0,bad),RangeError)
  const a=act(D,D.create(0),{type:'settle',id:'s'}),b=D.create(0,{ac:0});assert.equal(b.costs.userActions,0);assert.deepEqual(b.settled,[]);assert.equal(b.edges.find(e=>e.id==='ac').weight,0);assert.equal(a.edges.find(e=>e.id==='ac').weight,4)
  const early=act(D,D.create(0),{type:'relax',id:'sa'});assert.equal(early.policy,false)
})

test('maxflow permits partial augmentation, reverse rerouting, and independent cut certificates',()=>{
  for(const v of [0,1])for(const input of [undefined,{sa:1,bt:1}]){
    let s=F.create(v,input);fields(F,s);assert.equal(F.report(s).conclusion.key,'experiment.maxflow.pending')
    const findPath=()=>{const stack=[['s',[],new Set(['s'])]];const arcs=maxflowResidual(s);while(stack.length){const [u,ids,seen]=stack.pop();if(u==='t')return ids;for(const a of arcs.filter(a=>a.from===u&&a.capacity>0&&!seen.has(a.to)).reverse())stack.push([a.to,[...ids,a.id],new Set([...seen,a.to])])}return null}
    let first=true,didPartial=false;while(true){const ids=findPath();if(!ids)break;for(const id of ids)s=act(F,s,{type:'extend',id});const bottleneck=Math.min(...ids.map(id=>maxflowResidual(s).find(a=>a.id===id).capacity));const amount=first?1:bottleneck;didPartial ||= amount<bottleneck;first=false;const previous=s;const invalid=F.apply(s,{type:'augment',amount:bottleneck+1});assert.equal(invalid.changed,false);assert.strictEqual(invalid.state,previous);s=act(F,s,{type:'augment',amount});flowFeasible(s)}
    assert.equal(F.report(s).conclusion.key,'experiment.maxflow.pending');s=act(F,s,{type:'verify'});assert.equal(s.total,cut(s));assert.equal(F.report(s).conclusion.key,'experiment.maxflow.certificate');assert.equal(s.policy,!didPartial)
    const frame=F.frame(s);assert.ok(frame.nodes.every(n=>n.x>=0&&n.x<=1&&n.y>=0&&n.y<=1));assert.ok(frame.edges.every(e=>frame.nodes.some(n=>n.id===e.from)&&frame.nodes.some(n=>n.id===e.to)))
    const side=new Set(['s']),queue=['s'];for(const u of queue)for(const arc of maxflowResidual(s))if(arc.from===u&&arc.capacity>0&&!side.has(arc.to)){side.add(arc.to);queue.push(arc.to)}
    const crossing=s.edges.filter(e=>side.has(e.from)&&!side.has(e.to))
    assert.deepEqual(new Set(frame.result.cut.side),side)
    assert.deepEqual(new Set(frame.result.cut.crossing),new Set(crossing.map(e=>e.id)))
    assert.equal(frame.result.cut.capacity,s.total)
    for(const node of frame.nodes){assert.ok(node.label.includes(side.has(node.id)?'∈S':'∈T'));assert.equal(node.tone,side.has(node.id)?'settled':'black')}
    for(const edge of crossing)assert.ok(frame.edges.some(e=>e.from===edge.from&&e.to===edge.to&&e.tone==='active'&&e.weight===`${s.flow[edge.id]}/${edge.capacity}`))
    for(const edge of frame.edges.filter(e=>e.tone==='active'))assert.ok(crossing.some(x=>x.from===edge.from&&x.to===edge.to),'only original cut edges are highlighted after certificate')
  }
})

test('maxflow reverse residual arc decreases original flow with before/after evidence',()=>{
  let s=F.create(0);for(const id of ['sa','ab','bt'])s=act(F,s,{type:'extend',id});s=act(F,s,{type:'augment',amount:2});assert.equal(s.flow.ab,2)
  for(const id of ['sb','rev:ab','at'])s=act(F,s,{type:'extend',id});assert.ok(F.frame(s).edges.some(e=>e.from==='b'&&e.to==='a'&&e.tone==='active'&&e.weight==='r:2'));s=act(F,s,{type:'augment',amount:2});assert.equal(s.flow.ab,0);assert.ok(s.lastChanges.some(e=>e.id==='ab'&&e.before===2&&e.after===0));flowFeasible(s)
  const committed=F.frame(s)
  assert.ok(committed.edges.some(e=>e.from==='b'&&e.to==='a'&&e.directed&&e.tone==='active'&&e.weight==='r:0,−2'))
  assert.ok(committed.result.lastAugment.some(e=>e.id==='rev:ab'&&e.signedDelta===-2&&e.residualAfter===0))
  assert.ok(F.report(s).evidence.some(e=>e.key==='experiment.maxflow.reverseChange'&&e.vars.before===2&&e.vars.after===0&&e.vars.amount===2))
  const past=structuredClone(s),bad=F.apply(s,{type:'extend',id:'rev:ab'});assert.equal(bad.changed,false);assert.deepEqual(s,past)
  s=act(F,s,{type:'extend',id:'sa'});assert.deepEqual(s.lastAugment,[])
})

test('flow draft pop and clear do not alter actual flow; costs count only submitted work',()=>{
  let s=F.create(1);const initial=structuredClone(s);assert.equal(F.apply(s,{type:'pop'}).changed,false);assert.deepEqual(s,initial)
  s=act(F,s,{type:'extend',id:'sa'});s=act(F,s,{type:'extend',id:'ab'});s=act(F,s,{type:'pop'});assert.deepEqual(s.path,['s','a']);s=act(F,s,{type:'clear'});assert.deepEqual(s.path,['s']);assert.equal(s.total,0);assert.equal(s.costs.augmentations,0);assert.equal(s.costs.edgeUpdates,0);assert.equal(s.costs.userActions,4)
  for(const bad of [{sa:-1},{sa:10},{sa:0.5},{nope:2}])assert.throws(()=>F.create(0,bad),RangeError)
})

test('a full augmentation after an earlier partial one reports this step accurately',()=>{
  let s=F.create(0)
  for(const id of ['sa','at'])s=act(F,s,{type:'extend',id})
  let result=F.apply(s,{type:'augment',amount:1});assert.equal(result.changed,true);s=result.state
  assert.equal(result.feedback.key,'experiment.maxflow.partialAugment');assert.equal(result.feedback.tone,'caution');assert.equal(s.policy,false)
  for(const id of ['sa','at'])s=act(F,s,{type:'extend',id})
  result=F.apply(s,{type:'augment',amount:1});assert.equal(result.changed,true);s=result.state
  assert.equal(result.feedback.key,'experiment.maxflow.augmented');assert.equal(result.feedback.tone,'good')
  assert.equal(s.last.key,'experiment.maxflow.augmented');assert.equal(s.policy,false)
  assert.equal(F.report(s).summary.tone,'good')
  assert.equal(F.report(s).strategy.key,'experiment.maxflow.strategyDeparted')
})

test('valid preview transitions never mutate the supplied experiment state',()=>{
  for(const [adapter,state,action] of [
    [D,D.create(0),{type:'settle',id:'s'}],
    [F,F.create(0),{type:'extend',id:'sa'}],
  ]){
    const before=structuredClone(state),result=adapter.apply(state,action)
    assert.equal(result.changed,true)
    assert.deepEqual(state,before)
    assert.notStrictEqual(result.state,state)
    assert.equal(state.costs.userActions,0)
    assert.equal(result.state.costs.userActions,1)
  }
})

test('each graph experiment records only its own cost family',()=>{
  assert.deepEqual(Object.keys(D.create(0).costs).sort(),['edgeScans','relaxations','settles','tests','userActions'])
  assert.deepEqual(Object.keys(F.create(0).costs).sort(),['augmentations','edgeUpdates','tests','userActions'])
})

test('an early verify is a test, not a completion marker or answer reveal',()=>{
  for(const [adapter,state] of [[D,D.create(0)],[F,F.create(0)]]){
    const checked=act(adapter,state,{type:'verify'})
    assert.equal(adapter.frame(checked).op,'update')
    assert.ok(adapter.report(checked).conclusion.key.endsWith('.pending'))
    assert.equal(checked.costs.tests,1)
    assert.ok(!adapter.report(state).evidence.some(e=>e.key.endsWith('.mismatch')||e.key.endsWith('.cutEvidence')))
  }
})

test('graph experiment formulas parse in strict KaTeX at draft, reverse and certificate stages',()=>{
  const parse=(adapter,state)=>{const formula=adapter.formula(state);assert.doesNotThrow(()=>katex.renderToString(formula,{output:'mathml',throwOnError:true,trust:false,strict:'error'}),formula);assert.equal(adapter.frame(state).formula,formula)}
  for(const v of [0,1]){
    let d=D.create(v);parse(D,d);d=act(D,d,{type:'settle',id:'s'});parse(D,d);d=act(D,d,{type:'expand',id:'s'});parse(D,d)
    let f=F.create(v);parse(F,f);for(const id of ['sa','ab','bt']){f=act(F,f,{type:'extend',id});parse(F,f)}f=act(F,f,{type:'augment',amount:2});parse(F,f)
    for(const id of ['sb','rev:ab','at']){f=act(F,f,{type:'extend',id});parse(F,f)}f=act(F,f,{type:'augment',amount:1});parse(F,f)
    while(true){const arcs=maxflowResidual(f),queue=[['s',[],new Set(['s'])]];let path=null;while(queue.length){const [u,ids,seen]=queue.shift();if(u==='t'){path=ids;break}for(const arc of arcs)if(arc.from===u&&arc.capacity>0&&!seen.has(arc.to))queue.push([arc.to,[...ids,arc.id],new Set([...seen,arc.to])])}if(!path)break;for(const id of path)f=act(F,f,{type:'extend',id});const amount=Math.min(...path.map(id=>maxflowResidual(f).find(a=>a.id===id).capacity));f=act(F,f,{type:'augment',amount})}
    f=act(F,f,{type:'verify'});parse(F,f);assert.match(F.formula(f),/C\(S,T\)=\d+/);assert.match(F.formula(f),/r_\{vu\}/)
  }
})
