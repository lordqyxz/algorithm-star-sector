import test from 'node:test'
import assert from 'node:assert/strict'
import { advancedMissions, branchBoundMissions, complexityMissions, randomizedMissions, randomizedVerificationMissions, optimizationCoreMissions, shortestPathSearchMissions, foundationalMissions } from '../src/game/simulation/advanced.ts'

const all=[...advancedMissions,...branchBoundMissions,...complexityMissions,...randomizedMissions,...randomizedVerificationMissions,...optimizationCoreMissions,...shortestPathSearchMissions,...foundationalMissions]
const by=id=>all.find(x=>x.id===id)
const final=(id,v=0)=>by(id).trace(v).at(-1)

test('advanced traces have two deterministic, immutable, bounded variants',()=>{
  for(const mission of all) for(const v of [0,1]) {
    const frames=mission.trace(v); assert.ok(frames.length>=3,mission.id); assert.equal(frames[0].op,'start'); assert.equal(frames.at(-1).op,'done')
    assert.deepEqual(mission.trace(v),frames)
    for(const frame of frames)for(const value of Object.values(frame.counters))if(typeof value==='number')assert.ok(Number.isFinite(value),`${mission.id}: finite counters only`)
    assert.ok(frames.every(f=>(f.nodes?.length??0)<=12 && (f.matrix?.rows.length??0)<=8 && (f.matrix?.columns.length??0)<=10),mission.id)
    for(const frame of frames){for(const node of frame.nodes??[]){assert.ok(Number.isFinite(node.x)&&node.x>=0&&node.x<=1,`${mission.id}: x normalized`);assert.ok(Number.isFinite(node.y)&&node.y>=0&&node.y<=1,`${mission.id}: y normalized`)}if(frame.edges){const ids=new Set((frame.nodes??[]).map(n=>n.id));assert.ok(frame.nodes,`${mission.id}: edges need same-frame nodes`);for(const edge of frame.edges){assert.ok(ids.has(edge.from),`${mission.id}: missing ${edge.from}`);assert.ok(ids.has(edge.to),`${mission.id}: missing ${edge.to}`)}}}
    if(frames[1]?.items) { const past=structuredClone(frames[0]); frames[1].items[0].value='changed'; assert.deepEqual(frames[0],past) }
  }
})

test('backtracking produces feasible witnesses and exact tiny optima',()=>{
  for(let v=0;v<2;v++) {
    const ss=final('advanced-subset-sum',v), target=v?11:9, vals=v?[2,4,5,7]:[3,4,5,8]
    assert.equal(ss.output.reduce((s,x)=>s+Number(x.value),0),target); assert.ok(ss.output.every(x=>vals.includes(x.value)))
    const q=final('advanced-n-queens',v).output.map(x=>Number(x.value.match(/c(\d+)/)[1]))
    assert.equal(q.length,v?5:4); for(let i=0;i<q.length;i++)for(let j=0;j<i;j++)assert.ok(q[i]!==q[j]&&Math.abs(q[i]-q[j])!==i-j)
    const coloring=final('advanced-graph-coloring',v).output; assert.equal(coloring.length,4)
    const tsp=final('advanced-backtracking-tsp',v);const d=v?[[0,3,8,5],[3,0,4,7],[8,4,0,2],[5,7,2,0]]:[[0,2,9,6],[2,0,4,7],[9,4,0,3],[6,7,3,0]]
    const brute=[];function perm(a,left){if(!left.length){brute.push(a.reduce((s,x,i)=>s+d[x][a[i+1]??0],0));return}for(const x of left)perm([...a,x],left.filter(y=>y!==x))}perm([0],[1,2,3]);assert.equal(tsp.counters.best,Math.min(...brute))
  }
})

test('branch-and-bound returns feasible values and exact knapsack optimum',()=>{
  for(let v=0;v<2;v++){const f=final('advanced-bb-knapsack',v),w=v?[2,3,4,5]:[2,3,4,6],p=v?[6,8,9,10]:[4,5,8,9],cap=v?8:7;let best=0;for(let mask=0;mask<16;mask++){let tw=0,tp=0;for(let i=0;i<4;i++)if(mask>>i&1){tw+=w[i];tp+=p[i]}if(tw<=cap)best=Math.max(best,tp)}assert.equal(f.counters.best,best)
    const d2=v?[[0,3,8,5],[3,0,4,7],[8,4,0,2],[5,7,2,0]]:[[0,2,9,6],[2,0,4,7],[9,4,0,3],[6,7,3,0]],tourCosts=[];function tourPerm(path,left){if(!left.length){tourCosts.push(path.reduce((s,x,i)=>s+d2[x][path[i+1]??0],0));return}for(const x of left)tourPerm([...path,x],left.filter(y=>y!==x))}tourPerm([0],[1,2,3]);assert.equal(final('advanced-bb-tsp',v).counters.incumbent,Math.min(...tourCosts));assert.equal(final('advanced-bb-puzzle15',v).counters.h,0);assert.equal(final('advanced-bb-puzzle15',v).counters.g,v?1:2)
    const nets=v?[[0,1],[1,2],[2,3],[0,3],[0,2]]:[[0,1,2],[0,3],[1,3],[2,3]],cuts=order=>{let mask=0,peak=0;for(const b of order){mask|=1<<b;peak=Math.max(peak,nets.filter(net=>net.some(x=>mask>>x&1)&&net.some(x=>!(mask>>x&1))).length)}return peak},scores=[];function permutations(a,left){if(!left.length){scores.push(cuts(a));return}for(const x of left)permutations([...a,x],left.filter(y=>y!==x))}permutations([],[0,1,2,3]);assert.equal(final('advanced-circuit-density',v).counters.best,Math.min(...scores))
    const grid=final('advanced-circuit-grid',v),blocked=new Set(v?[2,7,12,17]:[6,7,8,13,18]),q=[[0,0]],dist=new Map([[0,0]]);while(q.length){const [u,d]=q.shift();if(u===24)break;for(const n of [u-5,u+1,u+5,u-1])if(n>=0&&n<25&&Math.abs(Math.floor(n/5)-Math.floor(u/5))+Math.abs(n%5-u%5)===1&&!blocked.has(n)&&!dist.has(n)){dist.set(n,d+1);q.push([n,d+1])}}assert.equal(grid.counters.best,dist.get(24));const path=grid.output.map(x=>Number(x.id.slice(4)));assert.equal(path[0],0);assert.equal(path.at(-1),24);assert.equal(path.length-1,grid.counters.best);for(let i=0;i<path.length;i++){assert.ok(!blocked.has(path[i]));if(i)assert.equal(Math.abs(Math.floor(path[i]/5)-Math.floor(path[i-1]/5))+Math.abs(path[i]%5-path[i-1]%5),1)}
  }
})

test('additional foundations show distinct DFS, TM membership, and LP transformations/statuses',()=>{
  for(let v=0;v<2;v++){
    const w=v?[2,3,4,5]:[2,3,4,6],p=v?[6,8,9,10]:[4,5,8,9],cap=v?8:7;let optimum=0;for(let mask=0;mask<16;mask++){let tw=0,tp=0;for(let i=0;i<4;i++)if(mask>>i&1){tw+=w[i];tp+=p[i]}if(tw<=cap)optimum=Math.max(optimum,tp)}assert.equal(final('advanced-backtracking-knapsack',v).counters.best,optimum)
    const tm=final('advanced-turing-language',v);assert.match(tm.formula,v?/∉ L/:/∈ L/);assert.ok(tm.counters.step>=2)
    const lp=final('advanced-lp-standard',v);assert.equal(lp.counters.feasible,1);const x=lp.output.find(i=>i.id==='x').value,y=lp.output.find(i=>i.id==='y').value,s1=4-x-y,s2=x-y-1;assert.equal(x+y+s1,4);assert.ok(s2>=0);assert.equal(x-y-s2,1)
    const deg=final('advanced-lp-degeneracy',v);assert.equal(deg.counters.unbounded,v?1:undefined);assert.equal(deg.counters.degenerate,v?undefined:1)
  }
})

test('complexity, randomized, simplex and shortest path traces expose checkable outcomes',()=>{
  for(let v=0;v<2;v++){const np=final('advanced-np-certificates',v);assert.equal(np.counters.edges,v?0:6);assert.equal(np.counters.certificateChecks,v?0:1);assert.deepEqual(randomizedMissions[0].trace(v).at(-1).output.map(x=>x.value),[1,2,3,4,5,6,7,8]);const random=final('advanced-randomized-evidence',v),pi=by('advanced-randomized-evidence').trace(v).find(f=>f.counters.samples===16);assert.equal(random.counters.verified,1);assert.ok(pi.counters.estimate>=0&&pi.counters.estimate<=4);assert.equal(final('advanced-simplex',v).counters.pivots,2);assert.ok(Math.abs(final('advanced-simplex',v).counters.objective-(v?40/3:9))<1e-8);assert.equal(final('advanced-bb-shortest-path',v).output[0].value,4)}
})
