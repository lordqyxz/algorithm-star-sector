import test from 'node:test'
import assert from 'node:assert/strict'
import { classroomGraphsMissions } from '../src/game/simulation/classroom-graphs.ts'

const run=(id,v)=>classroomGraphsMissions.find(m=>m.id===id).trace(v)
const final=(id,v)=>run(id,v).at(-1).result
const samePartition=(a,b)=>{for(let i=0;i<a.length;i++)for(let j=0;j<a.length;j++)assert.equal(a[i]===a[j],b[i]===b[j],`edges ${i}, ${j}`)}

test('five deterministic immutable traces keep node and edge identity',()=>{
  assert.equal(classroomGraphsMissions.length,5)
  for(const m of classroomGraphsMissions)for(const v of [0,1]){
    const frames=m.trace(v);assert.equal(frames[0].op,'start');assert.equal(frames.at(-1).op,'done');assert.deepEqual(frames,m.trace(v))
    assert.ok(Object.isFrozen(frames)&&frames.every(Object.isFrozen))
    for(const f of frames){const ids=new Set((f.nodes??[]).map(n=>n.id));for(const n of f.nodes??[])assert.ok(n.x>=0&&n.x<=1&&n.y>=0&&n.y<=1);for(const e of f.edges??[])assert.ok(ids.has(e.from)&&ids.has(e.to));for(const x of Object.values(f.counters))if(typeof x==='number')assert.ok(Number.isFinite(x))}
  }
})

test('DFS discovery/finish intervals and all four edge classes match an independent recursive walk',()=>{
  for(const v of [0,1]){const r=final('ppt-graph-dfs-classification',v),n=r.d.length,d=Array(n).fill(0),f=Array(n).fill(0),color=Array(n).fill(0),classes=Array(r.edges.length).fill('');let clock=0
    const adj=Array.from({length:n},()=>[]);r.edges.forEach(([u,w],i)=>adj[u].push([w,i]));adj.forEach(list=>list.sort((a,b)=>a[0]-b[0]))
    const visit=u=>{color[u]=1;d[u]=++clock;for(const [w,i] of adj[u]){if(!color[w]){classes[i]='tree';visit(w)}else classes[i]=color[w]===1?'back':d[u]<d[w]?'forward':'cross'}color[u]=2;f[u]=++clock}
    for(let u=0;u<n;u++)if(!color[u])visit(u)
    assert.deepEqual(r.d,d);assert.deepEqual(r.f,f);assert.deepEqual(r.classes,classes);assert.deepEqual(new Set(classes),new Set(['tree','back','forward','cross']))
    for(let u=0;u<n;u++)assert.ok(d[u]<f[u]);for(let i=0;i<r.edges.length;i++){const [u,w]=r.edges[i];if(classes[i]==='tree'||classes[i]==='forward')assert.ok(d[u]<d[w]&&f[w]<f[u]);if(classes[i]==='back')assert.ok(d[w]<d[u]&&f[u]<f[w]);if(classes[i]==='cross')assert.ok(f[w]<d[u])}
  }
})

test('undirected articulation points and edge blocks match deletion and simple-cycle oracles',()=>{
  for(const v of [0,1]){const r=final('ppt-graph-biconnected',v),n=r.d.length,es=r.edges
    const cc=removed=>{const seen=new Set();let count=0;for(let s=0;s<n;s++){if(s===removed||seen.has(s))continue;count++;const q=[s];seen.add(s);for(const u of q)for(const [a,b] of es){const w=a===u?b:b===u?a:-1;if(w>=0&&w!==removed&&!seen.has(w)){seen.add(w);q.push(w)}}}return count}
    const baseline=cc(-1),cuts=Array.from({length:n},(_,i)=>i).filter(i=>cc(i)>baseline);assert.deepEqual(r.cuts,cuts);assert.ok(r.components.every(c=>c>0))
    const group=es.map((_,i)=>i);const root=i=>group[i]===i?i:group[i]=root(group[i]);const union=(a,b)=>{group[root(a)]=root(b)}
    for(let start=0;start<n;start++){const walk=(u,vertices,path)=>{for(let ei=0;ei<es.length;ei++){const [a,b]=es[ei],w=a===u?b:b===u?a:-1;if(w<0)continue;if(w===start&&path.length>=2){const cyc=[...path,ei];for(let i=1;i<cyc.length;i++)union(cyc[0],cyc[i])}else if(!vertices.has(w)&&path.length<n-1)walk(w,new Set([...vertices,w]),[...path,ei])}};walk(start,new Set([start]),[])}
    samePartition(r.components,group.map((_,i)=>root(i)))
  }
  assert.ok(final('ppt-graph-biconnected',1).cuts.includes(0),'second graph exercises root with two DFS children')
})

test('Dinic equals exhaustive min cut and conserves every residual flow',()=>{
  for(const v of [0,1]){const frames=run('ppt-graph-dinic',v),r=frames.at(-1).result,n=r.levels.length,es=r.residual;let min=Infinity
    for(let mask=1;mask<(1<<n);mask++){if(!(mask&1)||mask&(1<<(n-1)))continue;let cap=0;for(const e of es)if((mask>>e.u&1)&&!(mask>>e.w&1))cap+=e.capacity;min=Math.min(min,cap)}
    assert.equal(r.flow,min);const balance=Array(n).fill(0);for(const e of es){assert.ok(e.flow>=0&&e.flow<=e.capacity);balance[e.u]-=e.flow;balance[e.w]+=e.flow}assert.equal(balance[0],-r.flow);assert.equal(balance[n-1],r.flow);assert.ok(balance.slice(1,-1).every(x=>x===0))
    const phases=frames.filter(f=>f.op==='visit').map(f=>f.counters.levelT);assert.ok(phases.every((x,i)=>i===0||x>phases[i-1]));assert.ok(frames.some(f=>f.op==='split'))
  }
  assert.ok(final('ppt-graph-dinic',0).reverseUses>0)
})

test('Dinic augmentation paths include every vertex and display residual reverse capacities',()=>{
  for(const v of [0,1])for(const frame of run('ppt-graph-dinic',v)){
    for(const edge of frame.edges)assert.ok(!String(edge.weight).endsWith('/0'),`invalid residual label ${edge.weight}`)
    if(frame.op!=='update')continue
    const path=String(frame.counters.path).split('→').map(Number)
    assert.equal(path[0],0)
    assert.equal(path.at(-1),frame.nodes.length-1)
    assert.equal(path.length,frame.counters.levelT+1)
    for(let i=0;i+1<path.length;i++)assert.ok(frame.edges.some(e=>e.from===`v${path[i]}`&&e.to===`v${path[i+1]}`&&e.directed===true&&e.tone==='active'),`missing ${path[i]}→${path[i+1]}`)
  }
  assert.ok(run('ppt-graph-dinic',0).some(f=>f.op==='update'&&f.edges.some(e=>e.tone==='active'&&String(e.weight).startsWith('r:'))))
})

test('unit-flow matching equals exhaustive matching cardinality and uses disjoint eligible edges',()=>{
  for(const v of [0,1]){const r=final('ppt-graph-bipartite-matching',v),left=run('ppt-graph-bipartite-matching',v)[0].counters.left,edges=r.pairs
    const search=(u,used)=>u===left?0:Math.max(search(u+1,used),...edges.filter(([a,w])=>a===u&&!(used>>w&1)).map(([,w])=>1+search(u+1,used|1<<w)))
    assert.equal(r.size,search(0,0));assert.equal(r.matches.length,r.size);assert.equal(new Set(r.matches.map(([u])=>u)).size,r.size);assert.equal(new Set(r.matches.map(([,w])=>w)).size,r.size);for(const pair of r.matches)assert.ok(edges.some(e=>e[0]===pair[0]&&e[1]===pair[1]))
  }
})

test('each matching augmentation draws every directed residual arc, including reroutes',()=>{
  for(const v of [0,1])for(const frame of run('ppt-graph-bipartite-matching',v).filter(f=>f.op==='update')){
    const path=frame.result.path
    assert.ok(path.length>=4)
    for(let i=0;i+1<path.length;i++)assert.ok(frame.edges.some(e=>e.from===`v${path[i]}`&&e.to===`v${path[i+1]}`&&e.directed===true&&e.tone==='active'),`missing ${path[i]}→${path[i+1]}`)
    assert.equal(frame.result.matches.length,frame.counters.size)
    assert.equal(frame.output.length,frame.counters.size)
  }
  const reroute=run('ppt-graph-bipartite-matching',0).filter(f=>f.op==='update').at(-1)
  assert.ok(reroute.edges.some(e=>e.tone==='active'&&String(e.weight).startsWith('r:')),'third path uses and draws a reverse residual arc')
})

test('queen trace follows FIFO depth and returns first legal leaf',()=>{
  for(const v of [0,1]){const frames=run('ppt-search-queens-fifo',v),r=frames.at(-1).result,n=v?5:4,depths=frames.filter(f=>f.op==='visit').map(f=>f.counters.depth);assert.ok(depths.every((d,i)=>i===0||d>=depths[i-1]));assert.equal(r.solution.length,n)
    for(let i=0;i<n;i++)for(let j=0;j<i;j++)assert.ok(r.solution[i]!==r.solution[j]&&Math.abs(r.solution[i]-r.solution[j])!==i-j)
    const q=[[]];let first;while(q.length){const cols=q.shift();if(cols.length===n){first=cols;break}for(let c=0;c<n;c++)if(cols.every((old,row)=>old!==c&&Math.abs(old-c)!==cols.length-row))q.push([...cols,c])}assert.deepEqual(r.solution,first);assert.equal(r.expanded,depths.length)
  }
})

test('queen enqueue snapshots show the newly queued child immediately',()=>{
  for(const v of [0,1])for(const frame of run('ppt-search-queens-fifo',v)){
    assert.equal(frame.counters.queue,frame.result.queue.length)
    if(frame.op==='select'){
      const col=frame.matrix.active[1]
      assert.deepEqual(frame.result.queue.at(-1),[...frame.result.current,col])
      if(frame.result.queue.length<=8)assert.ok(frame.output.some(item=>item.id===`q-${frame.result.queue.at(-1).join('-')}`))
    }
  }
})
