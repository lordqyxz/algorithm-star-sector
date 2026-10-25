import type { CourseMission, TraceEdge, TraceFrame, TraceNode } from '../types'
import { record } from './trace'

const letter = (i: number) => String.fromCharCode(65 + i)
const freeze = <T>(x: T): T => { if (x && typeof x === 'object') { Object.freeze(x); for (const v of Object.values(x)) freeze(v) } return x }
const mission = (id: string, chapter: string, run: (v: 0 | 1) => TraceFrame[]): CourseMission => ({ id, chapter, sources: ['classroom'], trace: v => freeze(run(v)) })
const graphNodes = (n: number): TraceNode[] => Array.from({ length: n }, (_, i) => ({ id: `v${i}`, value: letter(i), x: .12 + .76 * (i % 3) / 2, y: .18 + .62 * Math.floor(i / 3) / Math.max(1, Math.ceil(n / 3) - 1) }))

const dfsCases: [number, [number, number][]][] = [
  [4, [[0,1],[0,2],[0,3],[1,2],[2,0],[3,2]]],
  [5, [[0,1],[0,2],[0,3],[1,2],[2,0],[3,2],[3,4],[4,1]]],
]
function dfsTrace(v: 0 | 1): TraceFrame[] {
  const [n, es] = dfsCases[v], frames: TraceFrame[] = [], d = Array(n).fill(0), f = Array(n).fill(0), parent = Array(n).fill(-1), color = Array(n).fill(0), classes = Array(es.length).fill(''), nodes = graphNodes(n)
  const adj = Array.from({length:n}, () => [] as number[])
  es.forEach(([u], i) => adj[u].push(i)); adj.forEach(a => a.sort((i,j) => es[i][1]-es[j][1]))
  let time = 0, examined = 0
  const snapshot = (op: TraceFrame['op'], formula: string, active = -1) => record(frames, { op, formula, nodes: nodes.map((node,i) => ({...node, label: d[i] ? `${d[i]}/${f[i] || '·'}` : '·', tone: color[i]===1?'active':color[i]===2?'settled':'muted'})), edges: es.map(([a,b],i) => ({from:`v${a}`, to:`v${b}`, directed:true, weight:classes[i] || undefined, tone:i===active?'active':classes[i]?'settled':'muted'})), counters:{time, examined, discovered:d.filter(Boolean).length, finished:f.filter(Boolean).length}, result:{d:[...d], f:[...f], parent:[...parent], classes:[...classes], edges:es.map(e=>[...e])} })
  snapshot('start', 'DFS: d(u) < f(u); neighbors A→Z')
  const visit = (u: number) => { color[u]=1; d[u]=++time; snapshot('visit', `d(${letter(u)})=${d[u]}`)
    for (const ei of adj[u]) { const w=es[ei][1]; examined++; if (!color[w]) { classes[ei]='tree'; parent[w]=u; snapshot('select', `${letter(u)}→${letter(w)}: white ⇒ tree`, ei); visit(w) } else { classes[ei]=color[w]===1?'back':d[u]<d[w]?'forward':'cross'; snapshot('compare', `${letter(u)}→${letter(w)}: ${classes[ei]}`, ei) } }
    color[u]=2; f[u]=++time; snapshot('update', `f(${letter(u)})=${f[u]}`)
  }
  for (let u=0;u<n;u++) if (!color[u]) visit(u)
  snapshot('done', 'tree / back / forward / cross from d,f intervals')
  return frames
}

const bccCases: [number, [number,number][]][] = [
  [7, [[0,1],[1,2],[2,0],[1,3],[3,4],[4,5],[5,3],[3,6]]],
  [8, [[0,1],[0,2],[1,2],[0,3],[3,4],[4,5],[5,3],[4,6],[6,7]]],
]
function bccTrace(v: 0 | 1): TraceFrame[] {
  const [n, es] = bccCases[v], frames:TraceFrame[]=[], d=Array(n).fill(0), low=Array(n).fill(0), parent=Array(n).fill(-1), component=Array(es.length).fill(0), cuts=new Set<number>(), stack:number[]=[], nodes=graphNodes(n), adj=Array.from({length:n},()=>[] as number[])
  es.forEach(([a,b],i)=>{adj[a].push(i);adj[b].push(i)}); adj.forEach((list,u)=>list.sort((i,j)=>{const a=es[i][0]===u?es[i][1]:es[i][0], b=es[j][0]===u?es[j][1]:es[j][0];return a-b}))
  let clock=0, count=0
  const snap=(op:TraceFrame['op'], formula:string, active=-1)=>record(frames,{op,formula,nodes:nodes.map((node,i)=>({...node,label:d[i]?`${d[i]}/${low[i]}`:'·',tone:cuts.has(i)?'red':d[i]?'settled':'muted'})),edges:es.map(([a,b],i)=>({from:`v${a}`,to:`v${b}`,weight:component[i]?`B${component[i]}`:undefined,tone:i===active?'active':component[i]?'settled':'muted'})),output:stack.map(i=>({id:`e${i}`,value:`${letter(es[i][0])}${letter(es[i][1])}`})),counters:{visited:d.filter(Boolean).length, edgeStack:stack.length, components:count, cutVertices:cuts.size},result:{d:[...d],low:[...low],parent:[...parent],components:[...component],cuts:[...cuts].sort((a,b)=>a-b),edges:es.map(e=>[...e])}})
  snap('start','undirected: low(u)=min(d(u), back-edge d, child low)')
  const visit=(u:number, pe=-1)=>{d[u]=low[u]=++clock;let children=0;snap('visit',`d(${letter(u)})=low(${letter(u)})=${clock}`)
    for(const ei of adj[u]) {if(ei===pe)continue;const w=es[ei][0]===u?es[ei][1]:es[ei][0]
      if(!d[w]) {parent[w]=u;children++;stack.push(ei);snap('select',`${letter(u)}–${letter(w)}: push tree edge`,ei);visit(w,ei);low[u]=Math.min(low[u],low[w]);snap('update',`low(${letter(u)})=min(low,low(${letter(w)}))`,ei)
        if(low[w]>=d[u]) {if(pe!==-1 || children>1)cuts.add(u);count++;let popped:number;do {popped=stack.pop()!;component[popped]=count}while(popped!==ei);snap('split',`low(${letter(w)})≥d(${letter(u)}): pop B${count}`,ei)}
      } else if(d[w]<d[u]) {stack.push(ei);low[u]=Math.min(low[u],d[w]);snap('update',`back edge: low(${letter(u)})=min(low,d(${letter(w)}))`,ei)}
    }
  }
  for(let i=0;i<n;i++)if(!d[i])visit(i)
  snap('done','root cut iff ≥2 DFS children; every edge belongs to one BCC')
  return frames
}

type Arc={to:number;rev:number;cap:number;initial:number;original:number}
function flowGraph(n:number, es:[number,number,number][]) {const g=Array.from({length:n},()=>[] as Arc[]);es.forEach(([u,v,c],index)=>{const a:Arc={to:v,rev:g[v].length,cap:c,initial:c,original:index},b:Arc={to:u,rev:g[u].length,cap:0,initial:0,original:index};g[u].push(a);g[v].push(b)});return g}
const flowCases:[number,[number,number,number][]][]=[
  [6,[[0,1,1],[0,2,1],[1,3,1],[1,4,1],[2,3,1],[3,5,1],[4,5,1]]],
  [7,[[0,1,2],[0,2,2],[1,3,1],[1,4,1],[2,3,1],[2,4,1],[3,5,1],[4,5,2],[5,6,3],[4,6,1]]],
]
function dinicTrace(v:0|1):TraceFrame[]{
  const [n,es]=flowCases[v],g=flowGraph(n,es),frames:TraceFrame[]=[],levels=Array(n).fill(-1),nodes=graphNodes(n);let phase=0,flow=0,augmentations=0,reverseUses=0,lastPushed=0,active:[number,number][]=[]
  const snap=(op:TraceFrame['op'],formula:string)=>record(frames,{op,formula,nodes:nodes.map((node,i)=>({...node,label:levels[i]<0?'∞':String(levels[i]),tone:levels[i]<0?'muted':'settled'})),edges:g.flatMap((list,u)=>list.filter(a=>a.cap>0 || a.initial>0 || active.some(([x,y])=>x===u&&y===a.to)).map(a=>({from:`v${u}`,to:`v${a.to}`,directed:true,weight:a.initial?`${a.initial-a.cap}/${a.initial}`:active.some(([x,y])=>x===u&&y===a.to)?`r:${a.cap+lastPushed}→${a.cap}`:`r:${a.cap}`,tone:active.some(([x,y])=>x===u&&y===a.to)?'active':a.cap>0&&levels[u]>=0&&levels[a.to]===levels[u]+1?'settled':'muted',saturated:a.cap===0&&active.some(([x,y])=>x===u&&y===a.to)}))),counters:{phase,flow,augmentations,reverseUses,levelT:levels[n-1],path:active.length?[active[0][0],...active.map(([,w])=>w)].join('→'):''},result:{flow,levels:[...levels],residual:es.map(([u,w,c],i)=>({u,w,capacity:c,flow:c-g[u].find(a=>a.to===w&&a.original===i&&a.initial===c)!.cap})),phase,reverseUses}})
  snap('start','f=0; BFS uses positive residual capacity')
  while(true){levels.fill(-1);levels[0]=0;const q=[0];for(let qi=0;qi<q.length;qi++){const u=q[qi];for(const a of g[u])if(a.cap>0&&levels[a.to]<0){levels[a.to]=levels[u]+1;q.push(a.to)}}active=[];if(levels[n-1]<0)break;phase++;snap('visit',`BFS phase ${phase}: level(t)=${levels[n-1]}`);const ptr=Array(n).fill(0)
    const send=(u:number,amount:number,path:[number,number][]):number=>{if(u===n-1){active=path;return amount}for(;ptr[u]<g[u].length;ptr[u]++){const a=g[u][ptr[u]];if(a.cap<=0||levels[a.to]!==levels[u]+1)continue;const pushed=send(a.to,Math.min(amount,a.cap),[...path,[u,a.to]]);if(pushed){a.cap-=pushed;g[a.to][a.rev].cap+=pushed;if(a.initial===0)reverseUses++;return pushed}}return 0}
    while(true){const pushed=send(0,Infinity,[]);if(!pushed)break;flow+=pushed;lastPushed=pushed;augmentations++;snap('update',`blocking-flow DFS: Δ=${pushed}, |f|=${flow}`)}active=[];snap('split',`phase ${phase} blocked: no s→t path in this level graph`)
  }
  snap('done',`BFS cannot reach t; |f|=${flow}=minimum cut`);return frames
}

const matchingCases:[number,number,[number,number][]][]=[
  [3,3,[[0,0],[0,1],[1,0],[2,1],[2,2]]],
  [4,3,[[0,0],[0,2],[1,0],[1,1],[2,1],[2,2],[3,2]]],
]
function matchingTrace(v:0|1):TraceFrame[]{
  const [left,right,pairs]=matchingCases[v],n=left+right+2,s=0,t=n-1,es:[number,number,number][]=[];for(let u=0;u<left;u++)es.push([s,1+u,1]);for(const [u,w] of pairs)es.push([1+u,1+left+w,1]);for(let w=0;w<right;w++)es.push([1+left+w,t,1]);const g=flowGraph(n,es),frames:TraceFrame[]=[];const nodes:TraceNode[]=[{id:'v0',value:'s',x:.08,y:.5},...Array.from({length:left},(_,u)=>({id:`v${1+u}`,value:`U${u+1}`,x:.36,y:.12+.76*u/Math.max(1,left-1)})),...Array.from({length:right},(_,w)=>({id:`v${1+left+w}`,value:`W${w+1}`,x:.65,y:.12+.76*w/Math.max(1,right-1)})),{id:`v${t}`,value:'t',x:.94,y:.5}];let size=0,augmentations=0;let path:number[]=[]
  const matches=()=>pairs.filter(([u,w])=>g[1+u].some(a=>a.to===1+left+w&&a.initial===1&&a.cap===0)).map(([u,w])=>[u,w])
  const snap=(op:TraceFrame['op'],formula:string)=>record(frames,{op,formula,nodes,edges:g.flatMap((list,u)=>list.filter(a=>a.initial>0||a.cap>0||path.some((x,j)=>x===u&&path[j+1]===a.to)).map(a=>({from:`v${u}`,to:`v${a.to}`,directed:true,weight:a.initial?`${a.initial-a.cap}/${a.initial}`:path.some((x,j)=>x===u&&path[j+1]===a.to)?`r:${a.cap+1}→${a.cap}`:`r:${a.cap}`,tone:path.some((x,j)=>x===u&&path[j+1]===a.to)?'active':a.initial&&a.cap===0?'settled':'muted'} as TraceEdge))),output:matches().map(([u,w])=>({id:`m${u}`,value:`U${u+1}–W${w+1}`})),counters:{size,augmentations,left,right,path:path.join('→')},result:{size,matches:matches(),pairs:pairs.map(e=>[...e]),path:[...path]}})
  snap('start','s→U→W→t: every arc has capacity 1')
  while(true){const prev=Array.from({length:n},()=>null as null|[number,number]);const q=[s];prev[s]=[-1,-1];for(let qi=0;qi<q.length&&prev[t]===null;qi++){const u=q[qi];for(let ai=0;ai<g[u].length;ai++){const a=g[u][ai];if(a.cap>0&&prev[a.to]===null){prev[a.to]=[u,ai];q.push(a.to)}}}if(prev[t]===null)break;path=[];let cur=t;while(cur!==s){path.push(cur);const [u,ai]=prev[cur]!;const a=g[u][ai];a.cap--;g[cur][a.rev].cap++;cur=u}path.push(s);path.reverse();size++;augmentations++;snap('update',`augment unit path; |M|=|f|=${size}`)}path=[];snap('done',`recover every U→W arc carrying unit flow: |M|=${size}`);return frames
}

function queensTrace(v:0|1):TraceFrame[]{const n=v?5:4,frames:TraceFrame[]=[],queue:number[][]=[[]];let expanded=0,tried=0,pruned=0,solution:number[]=[];const board=(cols:number[],candidate?:[number,number,boolean])=>({rows:Array.from({length:n},(_,i)=>`r${i+1}`),columns:Array.from({length:n},(_,i)=>`c${i+1}`),values:Array.from({length:n},(_,r)=>Array.from({length:n},(_,c)=>cols[r]===c?'Q':candidate?.[0]===r&&candidate[1]===c?candidate[2]?'Q?':'×':'·')),active:candidate?[candidate[0],candidate[1]] as [number,number]:undefined})
  const snap=(op:TraceFrame['op'],formula:string,cols:number[],candidate?:[number,number,boolean])=>record(frames,{op,formula,matrix:board(cols,candidate),output:queue.slice(0,8).map((q,i)=>({id:`q-${q.join('-')||'root'}`,value:`${q.length}:${q.map(c=>c+1).join('')||'∅'}`})),counters:{n,expanded,tried,pruned,queue:queue.length,depth:cols.length},result:{solution:[...solution],current:[...cols],queue:queue.map(q=>[...q]),expanded,tried,pruned}})
  snap('start','FIFO queue starts with root at depth 0',[])
  while(queue.length){const cols=queue.shift()!;expanded++;snap('visit',`dequeue depth ${cols.length}; expand next row`,cols);if(cols.length===n){solution=cols;snap('done',`first FIFO solution: [${cols.map(c=>c+1).join(',')}]`,cols);break}const r=cols.length;for(let c=0;c<n;c++){tried++;const safe=cols.every((old,rr)=>old!==c&&Math.abs(old-c)!==r-rr);if(!safe)pruned++;if(safe)queue.push([...cols,c]);snap(safe?'select':'reject',safe?`B(${r+1},${c+1})=1: enqueue`:`B(${r+1},${c+1})=0: prune`,cols,[r,c,safe])}}
  return frames}

export const classroomGraphsMissions: CourseMission[] = [
  mission('ppt-graph-dfs-classification','graphs',dfsTrace),
  mission('ppt-graph-biconnected','graphs',bccTrace),
  mission('ppt-graph-dinic','graphs',dinicTrace),
  mission('ppt-graph-bipartite-matching','graphs',matchingTrace),
  mission('ppt-search-queens-fifo','search-space',queensTrace),
]
