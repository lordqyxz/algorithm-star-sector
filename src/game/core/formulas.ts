import type { TraceFrame } from '../types'

const formulas: Record<string, string> = {
  'structure-sequence': String.raw`M_{\mathrm{insert}}=n-p,\quad M_{\mathrm{delete}}=n-p-1`,
  'structure-lists': String.raw`p.next=q,\quad q.prev=p`,
  'structure-stack-recursion': String.raw`T(n)=T(n-1)+\Theta(1)`,
  'structure-queues': String.raw`front=(front+1)\bmod C`,
  'structure-strings-kmp': String.raw`j>0\land P[j]\ne T[i]\;\Rightarrow\;j=\pi[j-1]`,
  'structure-arrays-matrices': String.raw`\operatorname{addr}(i,j)=\operatorname{base}+(i\,C+j)\,s`,
  'structure-generalized-list': String.raw`\operatorname{walk}([h|t])=\operatorname{walk}(h)\mathbin{\Vert}\operatorname{walk}(t)`,
  'structure-hashing-search': String.raw`h(k)=k\bmod m`,
  'structure-memory-allocation': String.raw`\min\{b_i\mid b_i\ge s\}`,
  'structure-memory-safety': String.raw`0\le offset<capacity`,
  'structure-stack-queue-variants': String.raw`push(x): S'=S\mathbin{\|}[x]`,
  'structure-searches': String.raw`T_{binary}(n)=T_{binary}(n/2)+\Theta(1)`,
  'structure-memory-strategies': String.raw`\sum_i size_i\le capacity`,
  'structure-complexity-counting': String.raw`T(n)=\sum_{i=1}^{n} cost(i)`,
  'structure-string-operations': String.raw`|s\mathbin{\|}t|=|s|+|t|`,
  'foundation-modeling': String.raw`\{P(\mathrm{input})\}\;\mathrm{algorithm}\;\{Q(\mathrm{output})\}`,
  'foundation-mathematics': String.raw`\sum_{i=1}^{n}i=\frac{n(n+1)}{2}`,
  'foundation-asymptotics': String.raw`f(n)=O(g(n))\iff\exists c>0,n_0:\forall n\ge n_0,\;0\le f(n)\le cg(n)`,
  'foundation-correctness': String.raw`\{P\}\;C\;\{Q\}`,
  'tree-properties': String.raw`|E|=|V|-1\quad\text{(tree)}`,
  'tree-traversals': String.raw`T(n)=\Theta(n)`,
  'tree-threaded': String.raw`\operatorname{rightThread}(x)=\operatorname{succ}_{\mathrm{inorder}}(x)`,
  'tree-general-conversion': String.raw`\begin{aligned}\mathrm{left}(x)&=\mathrm{firstChild}(x)\\\mathrm{right}(x)&=\mathrm{nextSibling}(x)\end{aligned}`,
  'tree-huffman': String.raw`WPL=\sum_{i=1}^{n}w_i\ell_i`,
  'tree-bst': String.raw`\forall u\in L_x,\;k_u<k_x;\quad\forall v\in R_x,\;k_v>k_x`,
  'tree-avl': String.raw`|height(left)-height(right)|\le1`,
  'tree-btree': String.raw`t-1\le |\mathrm{keys}(x)|\le2t-1\quad(x\ne\mathrm{root})`,
  'tree-23': String.raw`|\mathrm{keys}(x)|\in\{1,2\},\quad c(x)\in\{0,2,3\}`,
  'tree-red-black': String.raw`blackHeight(left)=blackHeight(right)`,
  'tree-heap': String.raw`k_{\mathrm{parent}}\le k_{\mathrm{child}}`,
  'tree-union-find': String.raw`T_{amortized}(m,n)=O(m\alpha(n))`,
  'tree-trie': String.raw`T_{lookup}=O(|key|)`,
  'tree-optimal-search': String.raw`r^*=\arg\min_{i\le r\le j}\left|\sum_{k=i}^{r-1}w_k-\sum_{k=r+1}^{j}w_k\right|`,
  'g-representations': String.raw`A\in\mathbb{R}^{|V|\times|V|},\quad A_{uv}=w(u,v)\;\text{on edges}`,
  'g-search': String.raw`T_{BFS}=T_{DFS}=O(|V|+|E|)`,
  'g-components-scc': String.raw`T_{SCC}=O(|V|+|E|)`,
  'g-topology': String.raw`indegree(v)=0\;\Rightarrow\;v\text{ is next}`,
  'g-shortest-path': String.raw`d[v]\leftarrow\min(d[v],d[u]+w(u,v))`,
  'g-floyd-warshall': String.raw`D^{(k)}_{ij}=\min(D^{(k-1)}_{ij},D^{(k-1)}_{ik}+D^{(k-1)}_{kj})`,
  'g-mst': String.raw`\min_{T\;\mathrm{spanning\ tree\ of}\;G}\;\sum_{e\in T}w(e)`,
  'g-critical-path': String.raw`E[v]=\max_{(u,v)\in E}(E[u]+w(u,v))`,
  'g-multistage': String.raw`F(v)=\min_{(v,u)\in E}(w(v,u)+F(u))`,
  'g-max-flow': String.raw`\max |f|=\min_{(S,T)}capacity(S,T)`,
  'g-min-cost-flow': String.raw`\begin{gathered}\min\sum_e c_e f_e\\ |f|=F_{\max}\\ 0\le f_e\le u_e\end{gathered}`,
  'sort-insertion-direct': String.raw`A[0..i-1]\text{ sorted};\;insert(A[i])`,
  'sort-insertion-binary': String.raw`p=\operatorname{upperBound}(A[0..i),A[i])`,
  'sort-shell': String.raw`A[j]\gets A[j-h],\quad j\gets j-h\quad\text{while }A[j-h]>\mathrm{key}`,
  'sort-bubble': String.raw`A[i]>A[i+1]\;\Rightarrow\;swap(A[i],A[i+1])`,
  'sort-selection': String.raw`m=\arg\min_{j\ge i}A[j]`,
  'sort-tournament': String.raw`winner(x,y)=\min(x,y)`,
  'sort-heap': String.raw`A[0]=\max A[0..h),\quad A[h..n)\;\mathrm{sorted}`,
  'sort-quick': String.raw`T(n)=T(k)+T(n-k-1)+\Theta(n)`,
  'sort-merge': String.raw`T(n)=2T(n/2)+\Theta(n)`,
  'sort-bucket': String.raw`b(x)=\min\!\left(3,\left\lfloor\frac{x-\min A}{w}\right\rfloor\right)`,
  'sort-radix': String.raw`stableSort(A, digit_i),\quad i=0,\ldots,d-1`,
  'sort-counting': String.raw`C[x]=|\{a\in A:a=x\}|`,
  'external-kway-merge': String.raw`passes=\lceil\log_k r\rceil`,
  'external-replacement-selection': String.raw`|H_{\mathrm{active}}|+|H_{\mathrm{frozen}}|\le M`,
  'external-optimal-merge': String.raw`cost=\sum_i w_i\,depth_T(i)`,
  'divide-recursion-tree': String.raw`W_i=a^i f(n/b^i)`,
  'divide-master-theorem': String.raw`T(n)=aT(n/b)+\Theta(n^d)`,
  'divide-hanoi': String.raw`H(n)=2H(n-1)+1=2^n-1`,
  'divide-quickselect': String.raw`\mathbb{E}[T(n)]=O(n),\quad T_{\max}(n)=\Theta(n^2)`,
  'divide-closest-pair': String.raw`\delta=\min(\delta_L,\delta_R);\quad |x-x_m|<\delta`,
  'divide-strassen': String.raw`T(n)=7T(n/2)+\Theta(n^2)`,
  'divide-fft': String.raw`X_k=E_k+\omega_n^kO_k`,
  'divide-comparison-lower-bound': String.raw`h\ge\lceil\log_2(n!)\rceil=\Omega(n\log n)`,
  'divide-matrix-multiply': String.raw`C_{ij}\mathrel{+}=A_{ik}B_{kj}`,
  'greedy-fractional-knapsack': String.raw`\text{choose by decreasing }v_i/w_i`,
  'greedy-job-deadline': String.raw`\text{profit-descending; latest free slot}\le d_i`,
  'greedy-activity-selection': String.raw`j=\arg\min_{i:\,s_i\ge f_{\mathrm{last}}} f_i`,
  'greedy-johnson-flowshop': String.raw`\min(a_i,b_i)\text{ on }M_1\Rightarrow front;\;M_2\Rightarrow back`,
  'dp-knapsack-01': String.raw`\begin{gathered}D_{i,c}=\begin{cases}A,&c<w_i\\\max(A,B),&c\ge w_i\end{cases}\\ A=D_{i-1,c}\\ B=D_{i-1,c-w_i}+v_i\end{gathered}`,
  'dp-matrix-chain': String.raw`m[i,j]=\min_{i\le k<j}\{m[i,k]+m[k+1,j]+p_ip_{k+1}p_{j+1}\}`,
  'dp-optimal-bst': String.raw`E[i,j]=\min_{i\le r<j}\!\left(E[i,r]+E[r+1,j]+W[i,j]\right)`,
  'dp-lcs': String.raw`L[i,j]=\begin{cases}L[i-1,j-1]+1,&x_i=y_j\\\max(L[i-1,j],L[i,j-1]),&x_i\ne y_j\end{cases}`,
  'dp-flowshop-exact': String.raw`C_2[S]=\min_{j\in S}\{\max(C_1[S\setminus\{j\}]+a_j,C_2[S\setminus\{j\}])+b_j\}`,
  'advanced-subset-sum': String.raw`\sum_{i\in S}w_i=T`,
  'advanced-n-queens': String.raw`c_i\ne c_j\land|c_i-c_j|\ne|i-j|`,
  'advanced-graph-coloring': String.raw`(u,v)\in E\Rightarrow color(u)\ne color(v)`,
  'advanced-backtracking-tsp': String.raw`\min_{tour}\sum_{(u,v)\in tour}w(u,v)`,
  'advanced-bb-knapsack': String.raw`UB(S)=value(S)+\text{fractionalBound}(remaining)`,
  'advanced-bb-tsp': String.raw`LB(p)=\operatorname{cost}(p)+\min_{v\ne\operatorname{last}(p)}w(\operatorname{last}(p),v)`,
  'advanced-bb-puzzle15': String.raw`f(n)=g(n)+h_{Manhattan}(n)`,
  'advanced-circuit-density': String.raw`D(\pi)=\max_{1\le k<n}\!\left|\{N:N\cap P_k\ne\varnothing,\;N\setminus P_k\ne\varnothing\}\right|`,
  'advanced-circuit-grid': String.raw`\min\sum_{(u,v)\in path}w(u,v)`,
  'advanced-np-certificates': String.raw`x\in L\Rightarrow\exists c:V(x,c)=1`,
  'advanced-randomized': String.raw`\mathbb{E}[T(n)]`,
  'advanced-simplex': String.raw`\max c^Tx\quad\text{s.t. }Ax\le b,\;x\ge0`,
  'advanced-bb-shortest-path': String.raw`v_{\mathrm{LC}}=\arg\min_{v\in Q}d[v]`,
  'advanced-randomized-evidence': String.raw`\widehat\pi=4\,\frac{N_{\mathrm{inside}}}{N}`,
  'advanced-backtracking-knapsack': String.raw`\max\sum_i v_i x_i\quad\text{s.t. }\sum_i w_i x_i\le W,\;x_i\in\{0,1\}`,
  'advanced-turing-language': String.raw`L(M)=\{x:M\text{ accepts }x\}`,
  'advanced-lp-standard': String.raw`\max c^Tx\quad\text{s.t. }Ax=b,\;x\ge0`,
  'advanced-lp-degeneracy': String.raw`x_B=B^{-1}b,\quad x_{B_i}=0\text{ for some }i`,
  'approx-set-cover-greedy': String.raw`S^*=\arg\max_{S\in\mathcal{S}}|S\cap U_{\mathrm{uncovered}}|`,
  'approx-subset-sum-fptas': String.raw`(1-\varepsilon)OPT\le value(S)\le OPT`,
  'approx-vertex-cover-matching': String.raw`|C|\le2|M|\le2|C^*|`,
  'approx-metric-tsp-mst': String.raw`cost(Tour)\le2\,cost(MST)\le2\,OPT`,
  'approx-knapsack-fptas': String.raw`value(S)\ge(1-\varepsilon)OPT`,
  'heuristic-tabu-search': String.raw`x_{t+1}=\arg\min_{y\in N(x_t)\setminus Tabu}f(y)`,
  'heuristic-simulated-annealing': String.raw`\Pr[accept]=\min(1,e^{-\Delta/T})`,
  'heuristic-genetic-algorithm': String.raw`P_{t+1}=Select(Mutate(Crossover(P_t)))`,
  'neural-perceptron-gradient': String.raw`w\leftarrow w-\eta\nabla_w L(w)`,
}

const escapeText = (value: string): string =>
  value.replace(/[\\{}$&#_%]/g, (char) => `\\${char}`).replace(/\s+/g, '\\,')

function texValue(value: number | string): string {
  if (typeof value === 'number') {
    if (Number.isNaN(value)) return String.raw`\mathrm{NaN}`
    if (!Number.isFinite(value))
      return value < 0 ? String.raw`-\infty` : String.raw`\infty`
    return String(value)
  }
  if (/^-?\d+(\.\d+)?$/.test(value)) return value
  if (value === '∞') return String.raw`\infty`
  if (value === '×') return String.raw`\times`
  const symbols: Record<string, string> = {
    '≤': String.raw`\le`,
    '≥': String.raw`\ge`,
    '≠': String.raw`\ne`,
    '∞': String.raw`\infty`,
    '×': String.raw`\times`,
    '→': String.raw`\to`,
    '←': String.raw`\leftarrow`,
    '∅': String.raw`\varnothing`,
    '−': '-',
  }
  if (/[≤≥≠∞×→←∅−]/.test(value))
    return value
      .split(/([≤≥≠∞×→←∅−])/)
      .filter(Boolean)
      .map((part) =>
        symbols[part]
          ? `{${symbols[part]}}`
          : String.raw`\text{${escapeText(part)}}`,
      )
      .join('')
  return String.raw`\text{${escapeText(value)}}`
}

/** Symbolic reference relation for a mission, independent of the current frame prose. */
export function missionFormula(id: string, frame: TraceFrame): string {
  return formulas[id] ?? stateFormula(frame)
}

/** A short equation containing only values present in this rendered frame. */
export function stateFormula(frame: TraceFrame): string {
  const active = frame.matrix?.active
  if (frame.matrix && active) {
    const [row, column] = active
    const value = frame.matrix.values[row]?.[column]
    if (value !== undefined)
      return String.raw`M_{${texValue(frame.matrix.rows[row])},\,${texValue(frame.matrix.columns[column])}}=${texValue(value)}`
  }

  const counters = Object.entries(frame.counters).slice(0, 3)
  if (counters.length)
    return (
      String.raw`\begin{aligned}` +
      counters
        .map(
          ([key, value]) =>
            String.raw`\mathrm{${escapeText(key)}}=${texValue(value)}`,
        )
        .join(String.raw`\\ `) +
      String.raw`\end{aligned}`
    )

  if (frame.nodes?.length || frame.edges?.length)
    return String.raw`|V|=${frame.nodes?.length ?? 0},\quad |E|=${frame.edges?.length ?? 0}`

  const length = frame.items?.length ?? frame.output?.length ?? 0
  if (length) return String.raw`n=${length}`
  return String.raw`\varnothing`
}
