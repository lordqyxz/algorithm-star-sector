import { useState } from 'react'
import { DesignNotes, type DesignInsight } from '@/components/DesignNotes'
import { ExamplePicker, type ExampleOption } from '@/components/ExamplePicker'
import { LessonShell } from '@/components/LessonShell'
import type { ComplexityProfileData } from '@/components/ComplexityProfile'
import type { MetricItem } from '@/components/CalcDesk'
import { TracePlayer } from '@/engine/TracePlayer'
import { arrayScene, recordTrace, tokenize, type TraceEvent } from '@/engine/events'
import type { BarItem, RegionLabel, SceneCell, Trace } from '@/engine/trace'
import { useLessonPlayback } from '@/hooks/useLessonPlayback'

/**
 * 演示数据与算法分离：本文件 = 数据集 + 快排主元对照生成器（产出 Trace）+ 播放器装配。
 * 量化主角：n=8 上"确定性末位主元 vs 随机主元"的比较次数（最坏 28 / 抽样均值 22 / 期望 17）。
 */

/** mulberry32：固定种子的确定性 PRNG——StrictMode 双渲染、重播、换步都不改变抽签结果。 */
function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type Tok = { value: number; tag?: string; seed: number }
/** 一轮分区：p/r 为 0 起闭区间，k 为抽中的主元下标（对换前），left/right 为两侧元素数。 */
type Round = { p: number; r: number; k: number; pivot: number; comps: number; left: number; right: number; size: number }
type RunResult = { compares: number; rounds: Round[] }

type RaExample = ExampleOption & {
  values: number[]
  mode: 'det-sorted' | 'sampled' | 'det-reversed' | 'perm'
  /** sampled：8 颗抽样种子；perm：[随机对照种子]；det 不用。 */
  seeds: number[]
}

const raExamples: readonly RaExample[] = [
  { id: 'opponent', label: '对手点单 · 已排序', detail: '[1..8] · 末位主元最坏 28 次', values: [1, 2, 3, 4, 5, 6, 7, 8], mode: 'det-sorted', seeds: [] },
  { id: 'sampled', label: '随机主元 · 抽样 8 次', detail: '同一数组 · 8 颗固定种子 · 均值 22', values: [1, 2, 3, 4, 5, 6, 7, 8], mode: 'sampled', seeds: [11, 4, 44, 9, 53, 7, 207, 341] },
  { id: 'reversed', label: '逆序 · 同一条链', detail: '[8..1] · 仍是 28 次', values: [8, 7, 6, 5, 4, 3, 2, 1], mode: 'det-reversed', seeds: [] },
  { id: 'perm', label: '乱序对照 · 无靶可打', detail: '[3,7,1,8,2,6,4,5] · det 14 / 随机 14', values: [3, 7, 1, 8, 2, 6, 4, 5], mode: 'perm', seeds: [7] },
]

const raCode = [
  { code: 'sort(A, p, r)', note: '对区间 [p..r] 排序（1 起下标）' },
  { code: '  if p ≥ r: return', note: '空区间或单元素天然有序' },
  { code: '  k = SELECT(p, r)', note: '确定性：永远 k=r；随机化：等概率掷骰子' },
  { code: '  exchange A[k] ↔ A[r]', note: '抽中的主元换到末位' },
  { code: '  q = PARTITION(A, p, r)', note: '分区成本 = 区间长 − 1 次比较' },
  { code: '  sort(A, p, q−1); sort(A, q+1, r)', note: '两侧分别递归' },
]

/** 纯函数：完整执行快排并记录每轮分区。seed=null 为确定性末位主元；否则 mulberry32 掷骰子抽主元。 */
function quicksortRounds(values: readonly number[], seed: number | null): RunResult {
  const a = values.slice()
  const rand = seed === null ? null : mulberry32(seed)
  let compares = 0
  const rounds: Round[] = []
  const sort = (p: number, r: number): void => {
    if (p >= r) return
    const size = r - p + 1
    const k = rand === null ? r : p + Math.floor(rand() * size)
    const t = a[k]
    a[k] = a[r]
    a[r] = t
    const x = a[r]
    let i = p - 1
    for (let j = p; j < r; j += 1) {
      compares += 1
      if (a[j] <= x) {
        i += 1
        const w = a[i]
        a[i] = a[j]
        a[j] = w
      }
    }
    const w = a[i + 1]
    a[i + 1] = a[r]
    a[r] = w
    rounds.push({ p, r, k, pivot: x, comps: r - p, left: i + 1 - p, right: r - i - 1, size })
    sort(p, i)
    sort(i + 2, r)
  }
  sort(0, values.length - 1)
  return { compares, rounds }
}

/** 在令牌副本上复现一轮分区：先对换主元到末位，再做 ≤ 主元进左区的划分与归位。 */
function applyRound(work: Tok[], round: Round): void {
  const t = work[round.k]
  work[round.k] = work[round.r]
  work[round.r] = t
  let i = round.p - 1
  for (let j = round.p; j < round.r; j += 1) {
    if (work[j].value <= round.pivot) {
      i += 1
      const w = work[i]
      work[i] = work[j]
      work[j] = w
    }
  }
  const w = work[i + 1]
  work[i + 1] = work[round.r]
  work[round.r] = w
}

const roundRegions = (round: Round): RegionLabel[] => {
  const pv = round.p + round.left
  const regions: RegionLabel[] = []
  if (round.left > 0) regions.push({ from: round.p, to: pv - 1, label: `左区 ≤ ${round.pivot} · ${round.left} 个`, tone: 'blue' })
  regions.push({ from: pv, to: pv, label: `主元 ${round.pivot} 归位`, tone: 'orange' })
  if (round.right > 0) regions.push({ from: pv + 1, to: round.r, label: `右区 > ${round.pivot} · ${round.right} 个`, tone: 'yellow' })
  return regions
}

/** 数据集①：确定性末位主元遇上已排序输入——对手模型的完整链条。 */
function* detStory(example: RaExample, tokens: Tok[], worst: number): Generator<TraceEvent> {
  const n = tokens.length
  const isSorted = example.mode === 'det-sorted'
  const { compares: total, rounds } = quicksortRounds(example.values, null)
  const work = tokens.slice()
  const settled = new Array<boolean>(n).fill(false)
  let compares = 0
  const settledCount = () => settled.filter(Boolean).length
  const metrics = (): MetricItem[] => [
    { label: '最坏参照', value: worst, tone: 'purple' },
    { label: '累计比较', value: compares, tone: 'orange' },
    { label: '已归位', value: `${settledCount()} / ${n}`, tone: 'blue' },
  ]
  const cellsOf = (pivotIdx: number): SceneCell[] => work.map((token, index) => ({
    id: `t${token.seed}`,
    label: String(token.value),
    tone: index === pivotIdx ? 'pivot' : settled[index] ? 'sorted' : 'default',
  }))

  yield { t: 'scene', scene: arrayScene('shelf', isSorted ? '已排序输入 [1..8]：末位主元的死刑判决' : '逆序输入 [8..1]：链从另一头长', cellsOf(n - 1), { indexes: true, pointers: [{ index: n - 1, label: '末位主元', tone: 'orange' }] }) }
  yield { t: 'metrics', metrics: metrics() }
  yield { t: 'legend', legend: [{ tone: 'pivot', label: '主元/分界（橙）' }, { tone: 'focus', label: '左区 ≤ 主元（蓝）' }, { tone: 'key', label: '右区 > 主元（黄）' }, { tone: 'sorted', label: '位置已确定' }] }
  yield { t: 'message', step: {
    title: isSorted ? '对手模型：确定性算法的行为，输入完全可预测' : '换个方向再点一次单：逆序输入同样是极值链',
    tab: '对手模型',
    question: '对手知道你的主元规则，会递上什么输入？',
    formula: String.raw`k=r\;\text{（末位主元）}\Rightarrow\text{极值输入：每层切出}(n{-}1)\mid 1\mid 0\ \text{或}\ 0\mid 1\mid (n{-}1)`,
    formulaHint: `末位元素永远是（或永远是）区间极值：${isSorted ? '8,7,6,…' : '1,8,2,7,…'} 逐层成为主元`,
    equation: String.raw`\text{总比较}=7+6+\cdots+1=\frac{8\times 7}{2}=${worst}`,
    invariant: '主元规则没有变——变的是输入；规则对输入毫无防御。',
    note: isSorted
      ? '确定性算法在同一输入上的行为序列完全相同：对手只要递上"每层主元都是最大值"的输入，28 次比较就跑不掉。'
      : '升序让主元永远是最大值；逆序让主元永远是最小值——两个方向的现成靶子，对手任选其一。',
    conclusion: '逐层验证这条链，看成本怎么累加。',
    pseudocode: { lines: raCode, active: [0, 1, 2] },
    prediction: isSorted
      ? {
          prompt: '第一轮分区：主元 8 会把 8 个元素切成 左|1|右 各几个？',
          options: ['左 7 | 右 0：主元是最大值', '左 0 | 右 7：主元是最小值', '左 4 | 右 3：对半切'],
          answer: 0,
          explanation: '末位主元 8 是全组最大，其余 7 个全部 ≤ 8 进左区——切出 7|1|0，这正是最坏链的第一节。',
        }
      : {
          prompt: '主元 1 是最小值：分区结束后 1 会被换到哪个位置？',
          options: ['最左端 A[1]：左区 0 个', '最右端不动', '正中间'],
          answer: 0,
          explanation: '其余 7 个全部 > 1 留在右区，主元 1 与 A[1] 对换后归位最左——切出 0|1|7，链换了个方向继续长。',
        },
  } }
  yield { t: 'step' }

  for (let i = 0; i < rounds.length; i += 1) {
    const round = rounds[i]
    const pv = round.p + round.left
    applyRound(work, round)
    const displaced = work[round.r]
    settled[pv] = true
    compares += round.comps
    const prefix = rounds.slice(0, i + 1).map(item => item.comps).join('+')
    yield { t: 'cells', scene: 'shelf', cells: cellsOf(pv) }
    yield { t: 'pointers', scene: 'shelf', pointers: [{ index: pv, label: '主元', tone: 'orange' }] }
    yield { t: 'regions', scene: 'shelf', regions: roundRegions(round) }
    yield { t: 'metrics', metrics: metrics() }
    yield { t: 'message', step: {
      title: `第 ${i + 1} 层：主元 ${round.pivot} → ${round.left} | 1 | ${round.right}，成本 ${round.comps} 次`,
      tab: `第 ${i + 1} 层`,
      formula: String.raw`\text{第 }${i + 1}\text{ 层成本}=${round.size}-1=${round.comps}`,
      moves: pv !== round.r ? { kind: 'swap', title: `主元 ${round.pivot} 归位第 ${pv + 1} 格`, moves: [{ token: String(round.pivot), from: `第 ${round.r + 1} 格`, to: `第 ${pv + 1} 格` }, { token: String(displaced.value), from: `第 ${pv + 1} 格`, to: `第 ${round.r + 1} 格` }], verdict: `主元是区间最小值：归位左端，右区整体保留` } : undefined,
      judge: round.left === round.size - 1
        ? { entries: [{ left: `主元 ${round.pivot}`, op: '≥', right: '其余全部', holds: true, action: `${round.left} 个进左区，0 个在右——链继续` }] }
        : { entries: [{ left: `主元 ${round.pivot}`, op: '≤', right: '其余全部', holds: true, action: `${round.right} 个留右区，0 个在左——链继续` }] },
      equation: `${prefix}=${compares}`,
      invariant: `主元 ${round.pivot} 的位置从此固定；已归位 ${settledCount()} 个，其余元素相对主元的关系已定。`,
      note: pv !== round.r ? '主元是最小值：对换到左端后，右区整体保留——链从另一头长出来。' : '零交换：已排序输入里主元本就是最大值，其余元素"顺流"进左区。',
      conclusion: i < rounds.length - 1 ? '区间缩短一格，成本同步降一。' : '链条走完：算总账。',
      pseudocode: { lines: raCode, active: [2, 3, 4, 5] },
    } }
    yield { t: 'step' }
  }

  const levelBars: BarItem[] = rounds.map((round, index) => ({ id: `lv${index}`, display: String(round.comps), value: round.comps, caption: `第 ${index + 1} 层 · 主元 ${round.pivot}`, tone: 'default' }))
  levelBars.push({ id: 'total', display: String(total), value: total, caption: `${rounds.length} 层合计`, tone: 'sorted' })
  yield { t: 'scene', scene: { kind: 'bars', id: 'chain', label: '链式退化：每层成本 + 总账', unit: '比较次数', bars: levelBars } }
  yield { t: 'metrics', metrics: metrics() }
  yield { t: 'message', step: {
    title: `总账：${rounds.length} 层成本 ${rounds.map(round => round.comps).join('+')} = ${total} 次`,
    tab: '总账',
    formula: String.raw`${rounds.map(round => round.comps).join('+')}=${total}=\frac{8\times 7}{2}`,
    equation: String.raw`\text{每层成本}=\text{区间长}-1\Rightarrow\text{链式退化：}\Theta(n^2)`,
    invariant: '每层只让 1 个主元归位，区间只缩短 1——层层数降，总成本就是等差求和。',
    note: '绿色柱是七层合计 28 次：对手递上这份输入，确定性算法一分不少地照单全收。',
    conclusion: '规则是公开的，输入是自由的——这正是随机化要解开的死结。',
    pseudocode: { lines: raCode, active: [] },
    prediction: isSorted
      ? {
          prompt: '对手换成逆序输入 [8,7,…,1]：末位主元会比较多少次？',
          options: ['还是 28：主元变成最小值，链从另一头长', '少于 28：逆序更均匀', '多于 28：逆序更糟'],
          answer: 0,
          explanation: '主元每层仍是最小值：切出 0|1|7，链只是换向，7+6+…+1 一次不少——"极值主元"才是最坏的根源，与升序降序无关。',
        }
      : {
          prompt: '把逆序的每层成本序列与升序相比？',
          options: ['完全相同：都是 7,6,…,1 的链', '逆序少一层', '逆序每层更贵'],
          answer: 0,
          explanation: '极值主元造成链式退化，与方向无关——对手手里有两个方向的现成靶子。',
        },
  } }
  yield { t: 'step' }
  yield { t: 'metrics', metrics: metrics() }
  yield { t: 'message', step: {
    title: '结论：对手模型成立——公开规则就是可瞄准的靶子',
    tab: '结论',
    formula: String.raw`\text{确定性末位主元：最坏 }1+2+\cdots+(n-1)=\frac{n(n-1)}{2}=${worst}`,
    equation: String.raw`P[\text{最坏}\mid\text{对手}]=1`,
    invariant: '算法一行未改：输入决定命运——这就是确定性算法的软肋。',
    note: '对手总能递上最坏输入，28 次比较必然发生。下一组数据：把主元选择权交给骰子。',
    conclusion: '同一数组、同一套 PARTITION，只换"谁选主元"。',
    pseudocode: { lines: raCode, active: [] },
  } }
  yield { t: 'step' }
}

/** 数据集②：同一已排序数组，随机主元抽样 8 次——第 1 次真实执行，其余压缩报成本。 */
function* sampledStory(example: RaExample, tokens: Tok[], worst: number): Generator<TraceEvent> {
  const n = tokens.length
  const seeds = example.seeds
  const runs = seeds.map(seed => quicksortRounds(example.values, seed))
  const meanOf = (count: number): { sum: number; mean: string } => {
    const sum = runs.slice(0, count).reduce((acc, run) => acc + run.compares, 0)
    return { sum, mean: (sum / count).toFixed(1) }
  }
  const work = tokens.slice()
  const settled = new Array<boolean>(n).fill(false)
  let runCompares = 0
  const barItems: BarItem[] = []
  const metrics = (mean: string): MetricItem[] => [
    { label: '最坏参照', value: worst, tone: 'purple' },
    { label: '本次运行比较', value: runCompares, tone: 'orange' },
    { label: '抽样均值', value: mean, tone: 'blue' },
  ]
  const cellsOf = (pivotIdx: number, focusIdx: number): SceneCell[] => work.map((token, index) => ({
    id: `t${token.seed}`,
    label: String(token.value),
    tone: index === pivotIdx ? 'pivot' : index === focusIdx ? 'focus' : settled[index] ? 'sorted' : 'default',
  }))

  // ── 抽样 1 · 第 1 骰：随机化思想 + 预测（对手还能点单吗）──
  const first = runs[0].rounds[0]
  const tail = work[first.r]
  yield { t: 'scene', scene: arrayScene('shelf', '同一份已排序输入，这次算法先掷骰子', cellsOf(first.k, first.r), { indexes: true, pointers: [{ index: first.k, label: '骰子掷中', tone: 'purple' }, { index: first.r, label: '末位', tone: 'orange' }] }) }
  yield { t: 'metrics', metrics: metrics('—') }
  yield { t: 'legend', legend: [{ tone: 'pivot', label: '骰子抽中的主元' }, { tone: 'sorted', label: '位置已确定' }, { tone: 'focus', label: '正在处理' }] }
  yield { t: 'message', step: {
    title: '随机化思想：算法先掷骰子，对手的剧本作废',
    tab: '掷骰子',
    question: '对手还能递上"必输"的输入吗？',
    formula: String.raw`k=\text{RAND}(1,8)=${first.k + 1}\Rightarrow\text{主元 }x=${first.pivot}`,
    moves: { kind: 'swap', title: `骰子掷中第 ${first.k + 1} 格：A[${first.k + 1}] 与 A[${first.r + 1}] 对换，主元 ${first.pivot} 就位末尾`, moves: [{ token: String(first.pivot), from: `第 ${first.k + 1} 格`, to: `第 ${first.r + 1} 格` }, { token: String(tail.value), from: `第 ${first.r + 1} 格`, to: `第 ${first.k + 1} 格` }], verdict: `每个位置等概率 1/8 被掷中——这次运气落在 ${first.pivot} 上` },
    invariant: '数组内容对换前后是同一组数字；变的只是"谁当主元"。',
    note: '输入还是那份已排序数组，但它的"必输属性"失效了：下一颗骰子掷到哪，输入说了不算。',
    conclusion: `主元 ${first.pivot} 落位末尾，开始分区——重点看"成本"怎么记。`,
    pseudocode: { lines: raCode, active: [2, 3] },
    prediction: {
      prompt: '对手还能构造必输的输入吗？',
      options: ['不能：输入无法预测算法的随机选择', '能：已排序输入仍然是必输', '能：换成交替排列就行'],
      answer: 0,
      explanation: '输入是死的，骰子是活的：同一个输入每次运行的主元序列都不同，"必输输入"失去定义——最坏只能等骰子自己连续倒霉。',
    },
  } }
  yield { t: 'step' }

  // ── 抽样 1 · 第 1 刀归位：完整展示 ──
  applyRound(work, first)
  const displaced = work[first.r]
  settled[first.p + first.left] = true
  runCompares += first.comps
  yield { t: 'cells', scene: 'shelf', cells: cellsOf(first.p + first.left, -1) }
  yield { t: 'pointers', scene: 'shelf', pointers: [{ index: first.p + first.left, label: '主元', tone: 'orange' }] }
  yield { t: 'regions', scene: 'shelf', regions: roundRegions(first) }
  yield { t: 'metrics', metrics: metrics('—') }
  yield { t: 'message', step: {
    title: `主元 ${first.pivot} 归位：${first.left} | 1 | ${first.right}，本轮成本 ${first.comps} 次`,
    tab: '第 1 刀',
    formula: String.raw`${first.left}\mid 1\mid ${first.right}\Rightarrow\text{本轮 }${first.size}-1=${first.comps}\text{ 次比较}`,
    moves: first.p + first.left !== first.r ? { kind: 'swap', title: `主元 ${first.pivot} 归位`, moves: [{ token: String(first.pivot), from: `第 ${first.r + 1} 格`, to: `第 ${first.p + first.left + 1} 格` }, { token: String(displaced.value), from: `第 ${first.p + first.left + 1} 格`, to: `第 ${first.r + 1} 格` }], verdict: '主元与左区末端对换，落进左右分界' } : undefined,
    judge: { entries: [{ left: `区间 ${first.size}`, op: '−1 =', right: `${first.comps} 次比较`, holds: true, action: '每个元素恰好与主元比一次' }] },
    equation: `${first.comps}=\\text{累计比较}`,
    invariant: `主元 ${first.pivot} 位置固定；左右两区内部还没排，但相对主元已定。`,
    note: '第一刀就切得挺匀（4|1|3）——运气不错，但运气本身也是要被计量的对象。',
    conclusion: '递归进左右两区：骰子继续掷。',
    pseudocode: { lines: raCode, active: [4, 5] },
  } }
  yield { t: 'step' }

  // ── 抽样 1 · 第 2-4 刀：压缩成一拍一因果（抽签 → 切分 → 成本）──
  for (let i = 1; i < runs[0].rounds.length; i += 1) {
    const round = runs[0].rounds[i]
    applyRound(work, round)
    settled[round.p + round.left] = true
    runCompares += round.comps
    yield { t: 'cells', scene: 'shelf', cells: cellsOf(round.p + round.left, -1) }
    yield { t: 'pointers', scene: 'shelf', pointers: [{ index: round.p + round.left, label: '主元', tone: 'orange' }] }
    yield { t: 'regions', scene: 'shelf', regions: roundRegions(round) }
    yield { t: 'metrics', metrics: metrics('—') }
    yield { t: 'message', step: {
      title: `第 ${i + 1} 骰：主元 ${round.pivot} → ${round.left} | 1 | ${round.right}，成本 ${round.comps} 次`,
      tab: `第 ${i + 1} 骰`,
      formula: String.raw`x=${round.pivot}:\ ${round.left}\mid 1\mid ${round.right}\Rightarrow+${round.comps}\text{ 次}`,
      judge: { entries: [{ left: `区间 [${round.p + 1}..${round.r + 1}]`, op: '−1 =', right: `${round.comps} 次比较`, holds: true, action: `主元 ${round.pivot} 归位第 ${round.p + round.left + 1} 格` }] },
      equation: `${runs[0].rounds.slice(0, i + 1).map(item => item.comps).join('+')}=${runCompares}`,
      invariant: '每次抽签独立、等概率：切分形状只由这一骰决定。',
      note: '压缩展示：抽签与分区在这一拍真实执行完毕，只报切分与成本。',
      conclusion: i < runs[0].rounds.length - 1 ? '继续掷。' : '全部归位：抽样 1 跑完。',
      pseudocode: { lines: raCode, active: [2, 3, 4] },
    } }
    yield { t: 'step' }
  }

  // ── 抽样 1 完成：立起第一根成本柱 ──
  barItems.push({ id: 's0', display: String(runs[0].compares), value: runs[0].compares, caption: `种子 ${seeds[0]}`, tone: 'focus' })
  yield { t: 'scene', scene: { kind: 'bars', id: 'sample', label: '抽样运行成本：同一输入，不同骰子（紫柱 = 打满最坏）', unit: '比较次数', max: worst, bars: barItems.map(bar => ({ ...bar })) } }
  yield { t: 'metrics', metrics: metrics(meanOf(1).mean) }
  yield { t: 'message', step: {
    title: `抽样 1 完成：种子 ${seeds[0]} → ${runs[0].compares} 次比较`,
    tab: '抽样 1',
    formula: String.raw`c_{1}=${runs[0].compares}=${runs[0].rounds.map(round => round.comps).join('+')}\quad x:${runs[0].rounds.map(round => round.pivot).join('\\to ')}`,
    equation: String.raw`\bar c_{1}=${meanOf(1).mean}\quad(\text{最坏 }${worst})`,
    invariant: '输入始终是同一个已排序数组 [1..8]——变的只有每拍的骰子。',
    question: '这一跑是幸运还是倒霉？',
    note: '主元 5→3→2→7，四刀几乎全中位数：这次抽样只花 13 次，远低于最坏 28。',
    conclusion: `同一输入换 ${seeds.length - 1} 颗新种子，看成本怎么晃。`,
    pseudocode: { lines: raCode, active: [] },
  } }
  yield { t: 'step' }

  // ── 抽样 2-8：一拍一颗种子，柱子逐根立起 ──
  for (let s = 1; s < runs.length; s += 1) {
    const run = runs[s]
    const stat = meanOf(s + 1)
    const fresh = tokens.slice()
    work.splice(0, work.length, ...fresh)
    settled.fill(false)
    runCompares = run.compares
    const diceCell = run.rounds[0].k
    yield { t: 'cells', scene: 'shelf', cells: work.map((token, index) => ({ id: `t${token.seed}`, label: String(token.value), tone: index === diceCell ? 'pivot' : 'default' })) }
    yield { t: 'pointers', scene: 'shelf', pointers: [{ index: diceCell, label: '骰子掷中', tone: 'purple' }] }
    yield { t: 'regions', scene: 'shelf', regions: [] }
    barItems.push({ id: `s${s}`, display: String(run.compares), value: run.compares, caption: `种子 ${seeds[s]}`, tone: run.compares === worst ? 'pivot' : 'default' })
    yield { t: 'bars', scene: 'sample', bars: barItems.map(bar => ({ ...bar })) }
    yield { t: 'metrics', metrics: metrics(stat.mean) }
    yield { t: 'message', step: {
      title: s === runs.length - 1 ? `抽样 ${s + 1}：骰子全倒霉——${run.compares} 次，最坏本尊现身` : `抽样 ${s + 1}：种子 ${seeds[s]} → ${run.compares} 次比较`,
      tab: `抽样 ${s + 1}`,
      formula: String.raw`c_{${s + 1}}=${run.compares}\quad x:${run.rounds.map(round => round.pivot).join('\\to ')}`,
      equation: String.raw`\bar c_{${s + 1}}=\tfrac{${runs.slice(0, s + 1).map(item => item.compares).join('+')}}{${s + 1}}=${stat.mean}`,
      judge: run.compares === worst ? { entries: [{ left: '7 次抽签', op: '全部', right: '极值主元', holds: true, action: `链式退化满血出现：${worst} 次比较` }] } : { entries: [{ left: `抽样 ${s + 1}`, op: '→', right: `${run.compares} 次`, holds: true, action: '同一输入，另一串骰子结果' }] },
      invariant: '输入仍是那份已排序数组；柱子记录的只是"这次骰子怎么掷"。',
      note: s === runs.length - 1
        ? '七次抽签次次抽中极值主元（1,8,7,6,5,2 一路切链）：28 次比较原封不动地出现了。它没被消除——只是从"对手点单"变成了"骰子倒霉"。'
        : `切分 ${run.rounds.map(round => `${round.left}|1|${round.right}`).join('，')}：新种子重跑同一数组，主元序列完全不同。`,
      conclusion: s < runs.length - 1 ? '换下一颗种子。' : '八根柱立起来了：算均值，对照最坏。',
      pseudocode: { lines: raCode, active: [2, 3, 4] },
    } }
    yield { t: 'step' }
  }

  // ── 均值与期望 ──
  const stat = meanOf(runs.length)
  const meanBar: BarItem = { id: 'mean', display: stat.mean, value: Math.round(parseFloat(stat.mean)), caption: `${runs.length} 次抽样均值`, tone: 'sorted' }
  yield { t: 'bars', scene: 'sample', bars: [...barItems.map(bar => ({ ...bar })), meanBar] }
  yield { t: 'metrics', metrics: metrics(stat.mean) }
  yield { t: 'message', step: {
    title: `均值 ≈ ${stat.mean}：期望把成本钉在 n log n 附近`,
    tab: '均值与期望',
    question: '随机化能把最坏情况彻底消除吗？',
    formula: String.raw`\bar c=\tfrac{${runs.map(run => run.compares).join('+')}}{${runs.length}}=${stat.mean}`,
    formulaHint: '绿色柱 = 抽样均值；紫色柱 = 抽样 8 打满最坏 28',
    equation: String.raw`E[C]=2(n{+}1)H_n-4n=2\cdot 9\times 2.72-32\approx 17`,
    invariant: '算法与输入都没变：期望脱离了输入分布，由骰子决定。',
    note: `${runs.length} 次抽样的均值（${stat.mean}）绕着理论期望（≈17）晃动——样本太少了；但无论怎么晃，都离最坏 ${worst} 很远。渐近意义上 E[C]≈2n ln n = Θ(n log n)。`,
    conclusion: `最坏 ${worst} 仍在场上，但它不再听对手指挥。`,
    pseudocode: { lines: raCode, active: [] },
    prediction: {
      prompt: '随机化能把最坏情况彻底消除吗？',
      options: [`不能：最坏仍是 ${worst} 次，只是变成小概率事件`, '能：随机化后永远不会退化', '能：只要种子保密'],
      answer: 0,
      explanation: `抽样 8 的那根高柱就是证据：骰子连续倒霉时 ${worst} 次照样发生。随机化改变的是最坏的触发概率（从"必然"到约 (1/n)^n），不是上界。`,
    },
  } }
  yield { t: 'step' }

  // ── 结论 ──
  yield { t: 'metrics', metrics: metrics(stat.mean) }
  yield { t: 'message', step: {
    title: '结论：最坏输入不存在了，只有倒霉的骰子',
    tab: '结论',
    formula: String.raw`P[\text{最坏}]\approx(1/n)^n\to 0,\quad E[C]=\Theta(n\log n)`,
    equation: String.raw`\text{抽样均值 }${stat.mean}\quad vs\quad \text{最坏 }${worst}`,
    invariant: '对比数据集①：同一个输入，确定性必然 28 次，随机化每次成本都不同。',
    note: '确定性世界：对手递上已排序输入，28 次必然发生。随机化世界：性能由算法自己的骰子决定——"最坏输入"失去定义，只剩小概率的"倒霉骰子"。',
    conclusion: '随机化不消除最坏，只让它变成小概率——这就是对手模型的解药。',
    pseudocode: { lines: raCode, active: [] },
  } }
  yield { t: 'step' }
}

/** 数据集④：乱序排列上的对照实验——确定性 14 次 vs 随机主元 14 次 vs 最坏 28。 */
function* permStory(example: RaExample, tokens: Tok[], worst: number): Generator<TraceEvent> {
  const n = tokens.length
  const det = quicksortRounds(example.values, null)
  const randRun = quicksortRounds(example.values, example.seeds[0])
  const work = tokens.slice()
  const settled = new Array<boolean>(n).fill(false)
  let compares = 0
  const settledCount = () => settled.filter(Boolean).length
  const metrics = (): MetricItem[] => [
    { label: '最坏参照', value: worst, tone: 'purple' },
    { label: '累计比较', value: compares, tone: 'orange' },
    { label: '已归位', value: `${settledCount()} / ${n}`, tone: 'blue' },
  ]
  const cellsOf = (pivotIdx: number): SceneCell[] => work.map((token, index) => ({
    id: `t${token.seed}`,
    label: String(token.value),
    tone: index === pivotIdx ? 'pivot' : settled[index] ? 'sorted' : 'default',
  }))

  yield { t: 'scene', scene: arrayScene('shelf', '乱序排列 [3,7,1,8,2,6,4,5]：对手没有现成靶子', cellsOf(n - 1), { indexes: true, pointers: [{ index: n - 1, label: '末位主元', tone: 'orange' }] }) }
  yield { t: 'metrics', metrics: metrics() }
  yield { t: 'legend', legend: [{ tone: 'pivot', label: '主元/骰子抽中' }, { tone: 'sorted', label: '位置已确定' }, { tone: 'focus', label: '正在处理' }] }
  yield { t: 'message', step: {
    title: '换靶场：乱序排列上，末位主元不再走运',
    tab: '换靶场',
    question: '没有现成的"已排序"靶子，确定性规则还危险吗？',
    formula: String.raw`x=A[8]=5:\ \le 5\ \text{的有 }4\text{ 个}\Rightarrow 4\mid 1\mid 3`,
    equation: String.raw`\text{最坏参照 }${worst}\text{ 仍挂着——但这次主元不是极值}`,
    invariant: '规则没变：永远取末位。变的只是输入不再配合它。',
    note: '确定性算法的性能完全由输入摆布：已排序是 28，乱序可能好得多——好输入是运气，不是保障。',
    conclusion: '逐层跑完确定性版本，记总账。',
    pseudocode: { lines: raCode, active: [0, 1, 2] },
    prediction: {
      prompt: '末位主元 5 会把 [3,7,1,8,2,6,4,5] 切成 左|1|右 各几个？',
      options: ['左 4 | 右 3', '左 3 | 右 4', '左 6 | 右 1'],
      answer: 0,
      explanation: '数一数 ≤ 5 的元素：3、1、2、4 共 4 个进左区，7、8、6 留右区——第一刀不偏不倚。',
    },
  } }
  yield { t: 'step' }

  for (let i = 0; i < det.rounds.length; i += 1) {
    const round = det.rounds[i]
    const pv = round.p + round.left
    applyRound(work, round)
    settled[pv] = true
    compares += round.comps
    yield { t: 'cells', scene: 'shelf', cells: cellsOf(pv) }
    yield { t: 'pointers', scene: 'shelf', pointers: [{ index: pv, label: '主元', tone: 'orange' }] }
    yield { t: 'regions', scene: 'shelf', regions: roundRegions(round) }
    yield { t: 'metrics', metrics: metrics() }
    yield { t: 'message', step: {
      title: `第 ${i + 1} 层：主元 ${round.pivot} → ${round.left} | 1 | ${round.right}，成本 ${round.comps} 次`,
      tab: `第 ${i + 1} 层`,
      formula: String.raw`\text{第 }${i + 1}\text{ 层成本}=（区间长 }${round.size}\text{）}-1=${round.comps}`,
      judge: { entries: [{ left: `主元 ${round.pivot}`, op: round.left >= round.right ? '≥' : '≤', right: '对侧元素', holds: true, action: `${round.left} 个进左、${round.right} 个在右——两区都能继续` }] },
      equation: `${det.rounds.slice(0, i + 1).map(item => item.comps).join('+')}=${compares}`,
      invariant: `主元 ${round.pivot} 位置固定；层层数降，但不再是"每次只减一"的链。`,
      note: '两侧都在缩短：这一刀的形状由输入决定——运气好就均衡，运气差就链式。',
      conclusion: i < det.rounds.length - 1 ? '继续分区。' : '确定性版本跑完：算总账。',
      pseudocode: { lines: raCode, active: [2, 3, 4, 5] },
    } }
    yield { t: 'step' }
  }

  yield { t: 'metrics', metrics: metrics() }
  yield { t: 'message', step: {
    title: `确定性总账：${det.compares} 次——乱序输入没给它靶子`,
    tab: '总账',
    formula: String.raw`${det.rounds.map(round => round.comps).join('+')}=${det.compares}`,
    equation: String.raw`${det.compares}\ll ${worst}\quad(\text{最坏参照})`,
    invariant: '同一个算法：输入好就 14 次，输入坏就 28 次——命运完全在输入手里。',
    note: '同一规则，换个输入就从 28 掉到 14。但"好"只是这份输入的运气：对手仍可随时换回有序输入打出 28。',
    conclusion: '同一排列换骰子再跑一次，看期望落在哪。',
    pseudocode: { lines: raCode, active: [] },
  } }
  yield { t: 'step' }

  const diceCell = randRun.rounds[0].k
  work.splice(0, work.length, ...tokens.slice())
  settled.fill(false)
  compares = det.compares
  yield { t: 'cells', scene: 'shelf', cells: work.map((token, index) => ({ id: `t${token.seed}`, label: String(token.value), tone: index === diceCell ? 'pivot' : 'default' })) }
  yield { t: 'pointers', scene: 'shelf', pointers: [{ index: diceCell, label: '骰子掷中', tone: 'purple' }] }
  yield { t: 'regions', scene: 'shelf', regions: [] }
  yield { t: 'metrics', metrics: metrics() }
  yield { t: 'message', step: {
    title: `换骰子重跑同一排列：${randRun.compares} 次比较（种子 ${example.seeds[0]}）`,
    tab: '换骰子',
    question: '随机主元会把这个输入跑得明显更快吗？',
    formula: String.raw`c=${randRun.compares}\quad x:${randRun.rounds.map(round => round.pivot).join('\\to ')}`,
    equation: String.raw`c_{\text{det}}=${det.compares}=c_{\text{rand}}\ll ${worst}`,
    invariant: '输入与最坏参照都没变；随机化在这里没有提速，也没有变慢。',
    note: `主元序列 ${randRun.rounds.map(round => round.pivot).join('→')}，${randRun.rounds.length} 刀切完：与确定性版本成本相当——好输入上随机化本来就不欠债。`,
    conclusion: '把两条成本放一起看。',
    pseudocode: { lines: raCode, active: [2, 3, 4] },
    prediction: {
      prompt: '随机主元会把这个输入跑得明显更快吗？',
      options: ['不会：期望仍是 Θ(n log n)，随机化买的是保险不是提速', '会：随机化总比确定性快', '会：随机化永远更少比较'],
      answer: 0,
      explanation: `好输入上两种主元成本相当（本次 ${det.compares} vs ${randRun.compares}）；随机化的收益在坏输入上——把 ${worst} 从"必然"变成"小概率"。`,
    },
  } }
  yield { t: 'step' }

  const compareBars: BarItem[] = [
    { id: 'det', display: String(det.compares), value: det.compares, caption: '确定性末位主元', tone: 'default' },
    { id: 'rand', display: String(randRun.compares), value: randRun.compares, caption: `随机主元 · 种子 ${example.seeds[0]}`, tone: 'focus' },
    { id: 'worst', display: String(worst), value: worst, caption: '最坏参照（有序输入）', tone: 'pivot' },
  ]
  yield { t: 'scene', scene: { kind: 'bars', id: 'compare', label: '同一排列的三种成本', unit: '比较次数', bars: compareBars } }
  yield { t: 'metrics', metrics: metrics() }
  yield { t: 'message', step: {
    title: '对照：14 / 14 / 28——随机化不提速，只兜底',
    tab: '对照',
    formula: String.raw`${det.compares}=${randRun.compares}\ll ${worst}`,
    equation: String.raw`\text{好输入：期望不变差}\quad\text{坏输入：最坏}\to\text{小概率}`,
    invariant: '三根柱共享同一个最坏参照：随机化改的是"谁来触发它"。',
    note: '确定性算法把命运交给输入，随机化把命运收归骰子——保险的费用是零（这里），赔付条件是极小概率。',
    conclusion: '这就是"随机化算法"一课的全部要点。',
    pseudocode: { lines: raCode, active: [] },
  } }
  yield { t: 'step' }
}

function* runRandomizedAlgorithms(example: RaExample): Generator<TraceEvent> {
  const tokens = tokenize(example.values)
  const n = tokens.length
  const worst = (n * (n - 1)) / 2
  if (example.mode === 'sampled') {
    yield* sampledStory(example, tokens, worst)
    return
  }
  if (example.mode === 'perm') {
    yield* permStory(example, tokens, worst)
    return
  }
  yield* detStory(example, tokens, worst)
}

const buildRaTrace = (example: RaExample): Trace => recordTrace('SANDBOX 20 · RANDOMIZED ALGORITHMS', '确定性快排的最坏 28 次比较可以被对手"点单"；随机主元让同一输入每次成本都不同——把最坏输入变成小概率事件。', runRandomizedAlgorithms(example))

const raInsight: DesignInsight = {
  observation: '随机化把"最坏输入"变成"小概率事件"：性能不再由输入决定，而由算法自己的骰子决定——对手的必胜剧本因此失效。',
  contrasts: [
    { alternative: '把输入洗牌再喂给确定性算法', whyNot: '也可行（随机化输入），但要求掌握全部输入；随机主元在流式/对抗场景更通用——两者的期望相同。' },
  ],
  transfer: { prompt: '哈希表遇到对抗输入会退化成链，标准解法是？', options: ['随机化哈希种子（对抗者无法预测哈希函数）', '换链表', '限制输入长度'], answer: 0, explanation: '与随机主元同理：让算法行为不可预测，退化输入就从"必然"变成"小概率"。' },
}

const raComplexity: ComplexityProfileData = {
  title: '快排主元选择：谁来决定最坏情况',
  subtitle: 'n=8 实测：确定性最坏 28 次比较；8 次随机抽样均值 22；理论期望 ≈ 17。',
  cases: [
    { label: '确定性 · 最坏', complexity: 'Θ(n²)', condition: '对手递上（逆）有序输入：每层主元都是极值。', example: '[1..8] → 7+6+…+1 = 28 次', explanation: '末位主元规则公开，对手可以精确构造最坏输入——必然触发。', tone: 'method' },
    { label: '随机化 · 期望', complexity: 'Θ(n log n)', condition: '任意输入 + 每层等概率抽主元。', example: 'E = 2(n+1)Hₙ−4n ≈ 17（n=8）；抽样均值 22', explanation: '期望与输入分布无关：极端切分被均衡切分在期望中抵消，渐近 2n ln n。', tone: 'method' },
    { label: '随机化 · 最坏', complexity: 'Θ(n²)', condition: '每次抽签都抽中极值，概率约 (1/n)^n。', example: '抽样 8（种子 341）→ 28 次', explanation: '上界没变，但触发它的不再是"某个输入"，而是"连续倒霉的骰子"。', tone: 'method' },
  ],
  footer: '随机化不改变最坏上界，改变的是"谁能稳定触发它"——对手让位给骰子。',
}

export function RandomizedAlgorithmsLesson() {
  const [exampleId, setExampleId] = useState(raExamples[0].id)
  const example = raExamples.find(item => item.id === exampleId) ?? raExamples[0]
  const trace = buildRaTrace(example)
  const playback = useLessonPlayback(trace.steps.length)
  return <LessonShell eyebrow={trace.eyebrow} title={trace.steps[playback.step].title} description={trace.description} steps={trace.steps.map(item => item.tab ?? '推演')} step={playback.step} onStepChange={playback.setStep} playing={playback.playing} onTogglePlaying={playback.togglePlaying} onReplay={playback.replay} speed={playback.speed} onCycleSpeed={playback.cycleSpeed} complexity={raComplexity} examplePicker={<ExamplePicker examples={raExamples} value={exampleId} onChange={id => { playback.reset(); setExampleId(id) }} />}>
    <TracePlayer trace={trace} step={playback.step} />
    <DesignNotes insight={raInsight} />
  </LessonShell>
}
