import { useState } from 'react'
import { DesignNotes, type DesignInsight } from '@/components/DesignNotes'
import { ExamplePicker, type ExampleOption } from '@/components/ExamplePicker'
import { LessonShell } from '@/components/LessonShell'
import type { ComplexityProfileData } from '@/components/ComplexityProfile'
import type { MetricItem } from '@/components/CalcDesk'
import { TracePlayer } from '@/engine/TracePlayer'
import { recordTrace, tokenLabel, tokenize, type TraceEvent } from '@/engine/events'
import type { JudgeEntry, SceneCell, Tone, Trace, TreeScene } from '@/engine/trace'
import { useLessonPlayback } from '@/hooks/useLessonPlayback'

/** 演示数据与算法分离：本文件 = 数据集 + 归并排序生成器（产出 Trace）+ 播放器装配。 */

type Tok = { value: number; tag?: string; seed: number }
type MergeExample = ExampleOption & { values: number[] }

const mergeExamples: readonly MergeExample[] = [
  { id: 'mixed', label: '课堂混合序列', detail: '[8,3,7,4,1,6,2,5]', values: [8, 3, 7, 4, 1, 6, 2, 5] },
  { id: 'sorted', label: '已经有序', detail: '[1,2,3,4,5,6,7,8]', values: [1, 2, 3, 4, 5, 6, 7, 8] },
  { id: 'reverse', label: '完全逆序', detail: '[8,7,6,5,4,3,2,1]', values: [8, 7, 6, 5, 4, 3, 2, 1] },
  { id: 'duplicates', label: '重复键', detail: '[4,1,4,2,4,3,4,2]', values: [4, 1, 4, 2, 4, 3, 4, 2] },
]

const mergeCode = [
  { code: 'L = A[p..q],  R = A[q+1..r]', note: '把左右两半各自拷贝成有序队列' },
  { code: 'i = 1,  j = 1', note: '两个队列都从队首开始' },
  { code: 'for k = p to r', note: '逐格回填原数组' },
  { code: '  if L[i] ≤ R[j]', note: '相等时先取左侧，保证稳定' },
  { code: '    A[k] = L[i],  i = i + 1' },
  { code: '  else A[k] = R[j],  j = j + 1' },
  { code: '把 L[i..] 与 R[j..] 的剩余部分接上', note: '一边取空后，另一边整体拷贝' },
]

/** 拆分阶段第 level 层的分组：单组规模 n/2^level，共 2^level 组，按原顺序切分。 */
function splitGroups(tokens: readonly Tok[], level: number): Tok[][] {
  const size = tokens.length >> level
  const groups: Tok[][] = []
  for (let start = 0; start < tokens.length; start += size) groups.push(tokens.slice(start, start + size))
  return groups
}

/** 一组序列 → 树的一层；单组规模 > 1 时组与组之间放一个空位作视觉分隔。 */
function groupsToLevel(groups: readonly Tok[][], toneFor: (token: Tok) => Tone): (SceneCell | null)[] {
  const cells: (SceneCell | null)[] = []
  groups.forEach((group, groupIndex) => {
    if (groupIndex > 0 && group.length > 1) cells.push(null)
    group.forEach(token => cells.push({ id: `t${token.seed}`, label: tokenLabel(token), tone: toneFor(token) }))
  })
  return cells
}

function levelCount(tokens: readonly Tok[]): number {
  return Math.log2(tokens.length) + 1
}

function treeGaps(levelCount: number): number[] {
  return Array.from({ length: levelCount }, (_, level) => (level === levelCount - 1 ? 26 : Math.max(8, 40 >> level)))
}

/** 拆分阶段的递归树：只显示已揭示的前 revealed 层，currentLevel 为当前正在看的层。 */
function splitTree(tokens: readonly Tok[], revealed: number, currentLevel: number): TreeScene {
  const total = levelCount(tokens)
  const levels: (SceneCell | null)[][] = []
  for (let level = 0; level < Math.min(revealed, total); level += 1) {
    const groups = splitGroups(tokens, level)
    levels.push(groupsToLevel(groups, () => (level === currentLevel ? 'target' : 'default')))
  }
  return { kind: 'tree', id: 'recTree', label: '递归树：每一层的实际数字', levels, gaps: treeGaps(total) }
}

/** 真实递归归并（稳定：相等键先取左侧），返回有序结果与真实计数。 */
function sortCounting(list: readonly Tok[]): { out: Tok[]; compares: number; writes: number } {
  if (list.length <= 1) return { out: list.slice(), compares: 0, writes: 0 }
  const mid = list.length >> 1
  const left = sortCounting(list.slice(0, mid))
  const right = sortCounting(list.slice(mid))
  const out: Tok[] = []
  let i = 0
  let j = 0
  let compares = left.compares + right.compares
  let writes = left.writes + right.writes
  while (i < left.out.length && j < right.out.length) {
    compares += 1
    if (left.out[i].value <= right.out[j].value) out.push(left.out[i++])
    else out.push(right.out[j++])
    writes += 1
  }
  while (i < left.out.length) { out.push(left.out[i++]); writes += 1 }
  while (j < right.out.length) { out.push(right.out[j++]); writes += 1 }
  return { out, compares, writes }
}

/** 合并阶段递归树：第 0 层 = 被写回的工作数组，第 1 层 = 两个有序队列 L/R，其余层保持拆分状态。 */
function mergePhaseTree(tokens: readonly Tok[], written: readonly (Tok | null)[], lFront: number, rFront: number, L: readonly Tok[], R: readonly Tok[]): TreeScene {
  const levelCount = Math.log2(tokens.length) + 1
  const zero: (SceneCell | null)[] = written.map((tok, index) => tok
    ? { id: `o${tok.seed}`, label: tokenLabel(tok), tone: 'sorted' }
    : { id: `t${tokens[index].seed}`, label: tokenLabel(tokens[index]), tone: 'default' })
  const queueLevel = (queue: readonly Tok[], consumed: number): SceneCell[] => queue.map((token, index) => ({
    id: `t${token.seed}`,
    label: tokenLabel(token),
    tone: index < consumed ? 'muted' : index === consumed ? 'target' : 'default',
  }))
  const one: (SceneCell | null)[] = [...queueLevel(L, lFront)]
  if (L.length > 1) one.push(null)
  one.push(...queueLevel(R, rFront))
  const levels: (SceneCell | null)[][] = [zero, one]
  for (let level = 2; level < levelCount; level += 1) levels.push(groupsToLevel(splitGroups(tokens, level), () => 'default'))
  return { kind: 'tree', id: 'recTree', label: '递归树：每一层的实际数字', levels, gaps: treeGaps(levelCount) }
}

function* runMergeSort(values: readonly number[]): Generator<TraceEvent> {
  const tokens = tokenize(values)
  const n = tokens.length
  const half = n / 2
  const quarter = n / 4
  const levels = Math.log2(n)
  const L = sortCounting(tokens.slice(0, half)).out
  const R = sortCounting(tokens.slice(half)).out
  const full = sortCounting(tokens)
  const written: (Tok | null)[] = Array.from({ length: n }, () => null)
  let compares = 0
  let writes = 0
  const metrics = (count: number, size: number, total: number): MetricItem[] => [
    { label: '这一层有多少个问题', value: count },
    { label: '每个问题有多大', value: size },
    { label: '整层工作量', value: total, tone: 'green' },
    { label: '累计比较', value: compares, tone: 'orange' },
    { label: '已写回元素', value: `${writes} / ${n}`, tone: 'purple' },
  ]
  const mergeStability = { statement: '当键值都为 4 时，先取左侧的 4A，再取右侧的 4B。', before: ['4A', '4B'], after: ['4A', '4B'], stable: true }

  // ── 拍① 初始问题：整层数字还没拆分 ──
  yield { t: 'scene', scene: splitTree(tokens, 1, 0) }
  yield { t: 'metrics', metrics: metrics(1, n, n) }
  yield { t: 'legend', legend: [{ tone: 'focus', label: '当前正在看的层' }, { tone: 'sorted', label: '合并完成的输出' }, { tone: 'target', label: '正在比较的队首候选' }, { tone: 'muted', label: '已取走的队首' }] }
  yield { t: 'message', step: {
    title: `初始问题：给 ${n} 个数字排序`,
    tab: '初始',
    formula: String.raw`T(${n})=2T(${half})+${n}`,
    equation: String.raw`1\times ${n}=${n}`,
    invariant: `还没有拆分：问题数 × 单题规模相乘不变，1 × ${n} = ${n}，一个数字都没有少。`,
    note: '先看这一层：问题数 × 单题规模。',
    conclusion: '下一步：让第一刀真的发生。',
    pseudocode: { lines: mergeCode, active: [] },
  } }
  yield { t: 'step' }

  // ── 拍② 第一次拆分 ──
  yield { t: 'scene', scene: splitTree(tokens, 2, 1) }
  yield { t: 'metrics', metrics: metrics(2, half, n) }
  yield { t: 'message', step: {
    title: '第一次拆分：一个问题变成两个',
    tab: '拆分',
    formula: String.raw`T(${n})=4T(${quarter})+2\times ${half}+${n}`,
    equation: String.raw`2\times ${half}=${n}`,
    invariant: `问题数翻倍、单题规模减半，两者相乘不变：这一层仍处理 ${n} 个数字。`,
    note: '问题数翻倍，单题规模减半；这一层仍处理全部数字。',
    conclusion: `公式新增的 2×${half}，就是拆分后新出现的第二层工作。`,
    pseudocode: { lines: mergeCode, active: [] },
    prediction: {
      prompt: '拆分后，第二层一共还要处理多少个数字？',
      options: [`${n} 个`, `${n} 个`, `${2 * n} 个`],
      answer: 0,
      explanation: `拆分改变问题数量和规模，但这一层的总工作量仍然是 ${n}。`,
    },
  } }
  yield { t: 'step' }

  // ── 拍③ 到达基例 ──
  yield { t: 'scene', scene: splitTree(tokens, levelCount(tokens), levelCount(tokens) - 1) }
  yield { t: 'metrics', metrics: metrics(n, 1, n) }
  yield { t: 'message', step: {
    title: '到达基例：单个数字不用再排序',
    tab: '基例',
    formula: String.raw`T(${n})=${n}T(1)+\cdots`,
    equation: String.raw`${n}\times 1=${n}`,
    invariant: `到达基例后树高不再增长：${n} 个单元素问题天然有序，加起来仍是 ${n} 个数字。`,
    note: `${n}→${half}→${quarter}→1，减半 ${levels} 次，所以 L=log₂${n}。`,
    conclusion: `树底部 ${n} 个单元素问题对应 ${n}T(1)，递归在基例停下。`,
    pseudocode: { lines: mergeCode, active: [] },
  } }
  yield { t: 'step' }

  // ── 拍④ 向上合并：递归已在幕下真实完成，L/R 是真实排好序的两半 ──
  const mergeLeft = `[${L.map(tokenLabel).join(', ')}]`
  const mergeRight = `[${R.map(tokenLabel).join(', ')}]`
  yield { t: 'scene', scene: mergePhaseTree(tokens, written, 0, 0, L, R) }
  yield { t: 'metrics', metrics: metrics(half, 2, n) }
  yield { t: 'message', step: {
    title: '向上合并：把小答案合成大答案',
    tab: '合并',
    formula: String.raw`T(${n})=${n}+\cdots+${n}+\text{基例成本}`,
    equation: String.raw`\text{每个合并层处理 }${n}\text{ 个数字}`,
    invariant: `合并只用线性扫描：相等键先取左侧；这一层处理的数字总数仍是 ${n}。`,
    note: '两个有序小组只需线性扫描即可合并；相等键先取左侧元素。',
    conclusion: '合并阶段把局部有序答案拼成更大的有序答案。',
    moves: { kind: 'one-way', title: '合并：两个有序小组把数字送入输出', moves: [{ token: mergeLeft, from: '左半（已有序）', to: '输出' }, { token: mergeRight, from: '右半（已有序）', to: '输出' }], verdict: '两个队列都已有序，队首就是各自剩余部分的最小值，较小者先进入输出。', note: `每取出一个队首，输出指针前进一格；这一层仍处理 ${n} 个数字。` },
    stability: mergeStability,
    pseudocode: { lines: mergeCode, active: [0, 1, 2, 3] },
    prediction: {
      prompt: '合并两个有序数组时，为什么只需要看两个队首？',
      options: ['队首是各自剩余部分的最小值', '其他数字已经自动消失', '因为数组长度必须相等'],
      answer: 0,
      explanation: '每个子数组已经有序，所以各自队首就是当前最小候选；取出较小者并推进一个指针即可。',
    },
  } }
  yield { t: 'step' }

  // ── 拍⑤… 顶层合并真实执行：每拍一次比较 + 一次写回 ──
  let i = 0
  let j = 0
  for (let k = 0; k < n; k += 1) {
    const leftFront = i < L.length ? L[i] : null
    const rightFront = j < R.length ? R[j] : null
    let taken: Tok
    let fromSide: string
    let active: readonly number[]
    let formula: string
    let judge: JudgeEntry[]
    let note: string
    if (leftFront && rightFront) {
      compares += 1
      const takeLeft = leftFront.value <= rightFront.value
      taken = takeLeft ? leftFront : rightFront
      if (takeLeft) i += 1
      else j += 1
      fromSide = takeLeft ? '左队列队首' : '右队列队首'
      active = takeLeft ? [2, 3, 4] : [2, 3, 5]
      formula = takeLeft
        ? String.raw`\text{L 队首 }${tokenLabel(leftFront)}\le \text{R 队首 }${tokenLabel(rightFront)}\Rightarrow\text{先取左侧}`
        : String.raw`\text{L 队首 }${tokenLabel(leftFront)}>\text{R 队首 }${tokenLabel(rightFront)}\Rightarrow\text{取右侧}`
      judge = [{ left: `L 队首 ${tokenLabel(leftFront)}`, op: takeLeft ? '≤' : '>', right: `R 队首 ${tokenLabel(rightFront)}`, holds: takeLeft, action: takeLeft ? `${tokenLabel(leftFront)} 写回输出（相等键先取左侧）` : `${tokenLabel(rightFront)} 更小，写回输出` }]
      note = takeLeft && leftFront.value === rightFront.value ? '相等键先取左侧——这就是归并排序稳定的来源。' : '较小队首写回后，所在队列的指针前进一格。'
    } else {
      taken = (leftFront ?? rightFront)!
      if (leftFront) i += 1
      else j += 1
      fromSide = leftFront ? '左队列剩余' : '右队列剩余'
      active = [6]
      formula = String.raw`\text{一队已取空：}${tokenLabel(taken)}\text{ 无需比较直接写回}`
      judge = [{ left: tokenLabel(taken), op: '—', right: '另一队列已取空', holds: true, action: '剩余部分整体接上，无需比较' }]
      note = '一边取空后，另一边的剩余部分天然有序，整体拷贝即可。'
    }
    written[k] = taken
    writes += 1
    yield { t: 'scene', scene: mergePhaseTree(tokens, written, i, j, L, R) }
    yield { t: 'metrics', metrics: metrics(half, 2, n) }
    yield { t: 'message', step: {
      title: `写回 A[${k + 1}]：${tokenLabel(taken)} 来自${fromSide}`,
      tab: `写回 ${k + 1}/${n}`,
      formula,
      equation: `比较 ${compares} 次 · 已写回 ${writes} / ${n}`,
      invariant: `输出前缀 [1..${k + 1}] 已有序；两个队列的剩余部分仍各自有序，队首即下一轮最小候选。`,
      note,
      conclusion: k < n - 1 ? '继续比较两个队首。' : '两个队列都已取空：本次合并完成，输出整体有序。',
      moves: { kind: 'one-way', title: `${tokenLabel(taken)} 写回输出`, moves: [{ token: tokenLabel(taken), from: fromSide, to: `输出第 ${k + 1} 格` }], verdict: '每拍只前进一个输出格：合并的总成本就是这一层的元素个数。' },
      judge: { entries: judge },
      stability: mergeStability,
      pseudocode: { lines: mergeCode, active },
    } }
    yield { t: 'step' }
  }

  // ── 末拍 复杂度总结 ──
  yield { t: 'metrics', metrics: [...metrics(levels, n, n * levels), { label: '全排序累计比较', value: full.compares, tone: 'blue' }] }
  yield { t: 'message', step: {
    title: '得到复杂度：每层 n，共 log₂n 层',
    tab: '复杂度',
    formula: String.raw`T(${n})\approx ${levels}\times ${n}=n\log_2 n`,
    equation: String.raw`${n}+\cdots+${n}=${levels}\times ${n}`,
    invariant: `每一层的总工作量都等于 ${n} 个数字，变化的只有层数 log₂${n}。`,
    note: '每层变宽，但层数只按对数增长。',
    conclusion: '拆小 → 解决基例 → 合并，因此归并排序是 Θ(n log n)。',
    pseudocode: { lines: mergeCode, active: [] },
  } }
  yield { t: 'step' }
}

const buildMergeSortTrace = (example: MergeExample): Trace => recordTrace('SANDBOX 01 · MERGE SORT', '数字真的被分开、比较、合并；每一层的工作量都能从数组读出来，相等键还会保留身份顺序。', runMergeSort(example.values))

const mergeSortInsight: DesignInsight = {
  observation: '整个算法的地基是一句话：合并两个有序数组只需线性扫描。把"排序"化归为"合并"，分治才有意义。',
  contrasts: [
    { alternative: '快速排序', whyNot: '省掉 O(n) 辅助空间且更缓存友好，代价是不稳定、最坏 Θ(n²)；归并对任何输入都封顶 Θ(n log n) 且稳定。' },
    { alternative: '插入排序直接排大数组', whyNot: '逆序输入 Θ(n²)；归并用 log₂n 层线性合并把最坏情况压到 Θ(n log n)。' },
  ],
  transfer: { prompt: '归并排序在链表上比在数组上更有优势，为什么？', options: ['链表合并只需改指针，不需要 O(n) 辅助数组', '链表天然有序', '数组不能归并'], answer: 0, explanation: '数组合并要开辅助数组；链表的拆分与合并都是指针操作——所以归并是链表排序的主流选择。' },
}

const mergeSortComplexity: ComplexityProfileData = {
  title: '归并排序：三种输入都保持同一个阶数',
  subtitle: '这里指标准自顶向下归并排序；每次都拆分，并把每层子数组线性合并。',
  cases: [
    { label: '最好', complexity: 'Θ(n log n)', condition: '输入已经有序，但标准实现仍会递归和合并。', example: '[1,2,3,4,5,6,7,8]', explanation: '有序可能减少比较次数，但不会减少递归层数和每层处理。', tone: 'best' },
    { label: '平均', complexity: 'Θ(n log n)', condition: '元素是随机排列的。', example: '[8,3,7,4,1,6,2,5]', explanation: '每层处理 n 个元素，递归树高度约 log₂n。', tone: 'average' },
    { label: '最差', complexity: 'Θ(n log n)', condition: '输入逆序或两个子数组交错，合并比较更充分。', example: '[8,7,6,5,4,3,2,1]', explanation: '比较次数的常数变大，但每层仍只做线性合并。', tone: 'worst' },
  ],
  footer: '如果额外加入“左右已经有序就直接跳过合并”的优化，最好情况可以降到 Θ(n)；当前动画展示的是标准版本。',
  stability: { status: 'stable', label: '稳定排序', statement: '相等键的相对顺序不改变；合并时两边键相等，先取左边元素。', before: '4A → 4B', after: '4A → 4B' },
}

export function MergeSortLesson() {
  const [exampleId, setExampleId] = useState(mergeExamples[0].id)
  const example = mergeExamples.find(item => item.id === exampleId) ?? mergeExamples[0]
  const trace = buildMergeSortTrace(example)
  const playback = useLessonPlayback(trace.steps.length)
  return <LessonShell eyebrow={trace.eyebrow} title={trace.steps[playback.step].title} description={trace.description} steps={trace.steps.map(item => item.tab ?? '推演')} step={playback.step} onStepChange={playback.setStep} playing={playback.playing} onTogglePlaying={playback.togglePlaying} onReplay={playback.replay} speed={playback.speed} onCycleSpeed={playback.cycleSpeed} complexity={mergeSortComplexity} examplePicker={<ExamplePicker examples={mergeExamples} value={exampleId} onChange={id => { playback.reset(); setExampleId(id) }} />}>
    <TracePlayer trace={trace} step={playback.step} />
    <DesignNotes insight={mergeSortInsight} />
  </LessonShell>
}
