import { useState } from 'react'
import { DesignNotes, type DesignInsight } from '@/components/DesignNotes'
import { ExamplePicker, type ExampleOption } from '@/components/ExamplePicker'
import { LessonShell } from '@/components/LessonShell'
import type { ComplexityProfileData } from '@/components/ComplexityProfile'
import type { MetricItem } from '@/components/CalcDesk'
import { TracePlayer } from '@/engine/TracePlayer'
import { arrayScene, recordTrace, tokenLabel, tokenize, type TraceEvent } from '@/engine/events'
import type { MatrixScene, PointerTag, RegionLabel, SceneCell, Tone, Trace } from '@/engine/trace'
import { useLessonPlayback } from '@/hooks/useLessonPlayback'

/** 演示数据与算法分离：本文件 = 数据集 + BFPRT-SELECT 生成器（产出 Trace）+ 播放器装配。 */

type Tok = { value: number; tag?: string; seed: number }
type MomExample = ExampleOption & { values: number[] }

const momExamples: readonly MomExample[] = [
  { id: 'class15', label: '课堂 15 数', detail: '[21,4,8,15,1,9,3,12,7,17,5,11,2,14,6]', values: [21, 4, 8, 15, 1, 9, 3, 12, 7, 17, 5, 11, 2, 14, 6] },
  { id: 'qsworst', label: '快排最坏输入', detail: '[1..15] · 末尾主元链式分区', values: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] },
  { id: 'dup15', label: '重复组', detail: '同值带身份 7A/7B/7C 查分组', values: [7, 3, 7, 3, 7, 2, 8, 2, 8, 2, 5, 1, 5, 9, 1] },
  { id: 'n25', label: '25 数 · 5 组', detail: '⌈n/5⌉=5 组的完整推演', values: [11, 6, 3, 18, 9, 24, 2, 15, 7, 20, 5, 13, 1, 10, 16, 22, 8, 4, 19, 12, 25, 14, 23, 17, 21] },
]

const selectCode = [
  { code: 'SELECT(A, k)', note: '在最坏情况下也线性地找第 k 小（1 起下标）' },
  { code: '  分组：每 5 个一组', note: '⌈n/5⌉ 组，末组可不足 5 个' },
  { code: '  组内插入排序，取中位数 mᵢ', note: '组内是常数规模：O(1)' },
  { code: '  M = SELECT({mᵢ}, ⌈组数/2⌉)', note: '递归求中位数的中位数' },
  { code: '  以 M 三路分区：<M | =M | >M', note: '两侧至少约 3n/10 的元素被确定' },
  { code: '  if k ≤ |<M|: return SELECT(<M, k)' },
  { code: '  if k ≤ |<M|+|=M|: return M', note: 'M 本身就是答案' },
  { code: '  return SELECT(>M, k−|<M|−|=M|)', note: '只递归一侧，且该侧 ≤ 7n/10' },
]

/** 组内插入排序（真实执行，返回比较次数）：5 个数是常数规模。 */
function insertionSortGroup(group: readonly Tok[]): { sorted: Tok[]; compares: number } {
  const arr = group.slice()
  let compares = 0
  for (let j = 1; j < arr.length; j += 1) {
    const key = arr[j]
    let i = j - 1
    while (i >= 0) {
      compares += 1
      if (arr[i].value > key.value) {
        arr[i + 1] = arr[i]
        i -= 1
      } else break
    }
    arr[i + 1] = key
  }
  return { sorted: arr, compares }
}

/** 拍① 对手演示：以末尾元素为主元的 Lomuto 分区（真实执行）。 */
function tailPartition(toks: readonly Tok[]): { arr: Tok[]; pivotIdx: number; leftCount: number; rightCount: number; compares: number } {
  const arr = toks.slice()
  const pivot = arr[arr.length - 1]
  let boundary = 0
  let compares = 0
  for (let scan = 0; scan < arr.length - 1; scan += 1) {
    compares += 1
    if (arr[scan].value <= pivot.value) {
      ;[arr[boundary], arr[scan]] = [arr[scan], arr[boundary]]
      boundary += 1
    }
  }
  ;[arr[boundary], arr[arr.length - 1]] = [arr[arr.length - 1], arr[boundary]]
  return { arr, pivotIdx: boundary, leftCount: boundary, rightCount: arr.length - 1 - boundary, compares }
}

/** 拍⑤ 真实执行：以 M 为准的三路分区（每个元素与 M 比一次）。 */
function threeWayPartition(toks: readonly Tok[], m: number): { arr: Tok[]; lt: number; eq: number; gt: number } {
  const lt: Tok[] = []
  const eq: Tok[] = []
  const gt: Tok[] = []
  for (const token of toks) {
    if (token.value < m) lt.push(token)
    else if (token.value === m) eq.push(token)
    else gt.push(token)
  }
  return { arr: [...lt, ...eq, ...gt], lt: lt.length, eq: eq.length, gt: gt.length }
}

const cell = (token: Tok, tone?: Tone, caption?: string): SceneCell => ({ id: `t${token.seed}`, label: tokenLabel(token), tone, caption })

/** 分组矩阵：每组一行 5 格；行结构可以整体替换（拍① 单行未分组 → 拍② 分组）。 */
function groupsMatrix(rows: readonly (readonly Tok[])[], caption: string, toneFor: (token: Tok) => Tone | undefined, label: string): MatrixScene {
  return {
    kind: 'matrix',
    id: 'groups',
    label,
    caption,
    rows: rows.map(row => row.map(token => cell(token, toneFor(token)))),
  }
}

function* runMedianOfMedians(values: readonly number[]): Generator<TraceEvent> {
  const tokens = tokenize(values)
  const original = tokens.slice()
  const n = tokens.length
  const groupCount = Math.ceil(n / 5)
  const k = Math.ceil(n / 2)
  const guarantee = 3 * Math.ceil(groupCount / 2) - 2
  let compares = 0
  let medianCount = 0
  const metrics = (): MetricItem[] => [
    { label: '组数 ⌈n/5⌉', value: groupCount, tone: 'blue' },
    { label: '中位数集合', value: `${medianCount} / ${groupCount}`, tone: 'green' },
    { label: '保证丢弃 ≥', value: guarantee, tone: 'purple' },
    { label: '累计比较', value: compares, tone: 'orange' },
  ]

  // ── 拍① 对手出场：末尾主元的快排为什么会翻车 ──
  const tail = tailPartition(original)
  compares += tail.compares
  const pivotValue = original[n - 1].value
  const chain = tail.leftCount === 0 || tail.rightCount === 0
  const balanced = Math.min(tail.leftCount, tail.rightCount) * 6 >= Math.max(tail.leftCount, tail.rightCount) * 5
  const tailRegions: RegionLabel[] = []
  if (tail.leftCount > 0) tailRegions.push({ from: 0, to: tail.pivotIdx - 1, label: `≤${pivotValue}：${tail.leftCount} 个`, tone: 'blue' })
  tailRegions.push({ from: tail.pivotIdx, to: tail.pivotIdx, label: `主元 p=${pivotValue}`, tone: 'orange' })
  if (tail.rightCount > 0) tailRegions.push({ from: tail.pivotIdx + 1, to: n - 1, label: `>${pivotValue}：${tail.rightCount} 个`, tone: 'yellow' })
  yield { t: 'scene', scene: groupsMatrix([original], '还没分组——先看对手快排', () => 'muted', '分组矩阵（待命）') }
  yield { t: 'scene', scene: arrayScene('shelf', '分区视图 · 末尾主元（对手演示）', original.map((token, index) => cell(token, index === tail.pivotIdx ? 'pivot' : 'default')), { indexes: true, regions: tailRegions, pointers: [{ index: tail.pivotIdx, label: `p=${pivotValue}`, tone: 'orange' }] }) }
  yield { t: 'metrics', metrics: metrics() }
  yield { t: 'legend', legend: [{ tone: 'pivot', label: '主元（p 或 M）' }, { tone: 'key', label: '组中位数' }, { tone: 'target', label: 'M：中位数的中位数' }, { tone: 'sorted', label: '已确定一侧' }, { tone: 'muted', label: '未参与上下文' }] }
  yield { t: 'message', step: {
    title: chain ? `反例现场：末尾主元 ${pivotValue} 把数组切成 ${tail.leftCount} | ${tail.rightCount}` : `对手出场：末尾主元把数组切成 ${tail.leftCount} | ${tail.rightCount}`,
    tab: '对手快排',
    question: '为什么"期望 Θ(n log n)"的快排不够用？',
    formula: String.raw`T(${n})=T(${Math.max(tail.leftCount, tail.rightCount)})+O(${n})\Rightarrow\Theta(n^2)\ \text{（链式最坏）}`,
    formulaHint: `分区形状见下方"分区视图"：≤${pivotValue} 的 ${tail.leftCount} 个 | 主元 | >${pivotValue} 的 ${tail.rightCount} 个`,
    equation: String.raw`\text{选择要的是"最坏也线性"，不能指望每次抽签走运}`,
    invariant: '此刻数组还没被 SELECT 碰过——先看清对手的失败模式。',
    note: chain
      ? '每次都切出一侧 0 个：递推 T(n)=T(n−1)+O(n)，n+(n−1)+…+1=Θ(n²)。这是固定输入必然触发的最坏情况——期望线性救不了确定性场景。'
      : `本组切出 ${tail.leftCount} | ${tail.rightCount}，还没退化；但存在固定输入（如已排序）让 T(n)=T(n−1)+O(n) 一路链式到 Θ(n²)。只要主元"靠抽签"，最坏情况就无法排除。`,
    conclusion: '选择算法必须自己制造好主元——第一步：把数组按 5 个一组分组。',
    pseudocode: { lines: selectCode, active: [] },
    prediction: {
      prompt: `以末尾 ${pivotValue} 为主元，这次分区切成了什么形状？`,
      options: ['接近对半（约一半 | 一半）', '链式：一侧 0 个', '两侧都有元素，但大小悬殊'],
      answer: chain ? 1 : balanced ? 0 : 2,
      explanation: `实测切出 ${tail.leftCount} | ${tail.rightCount}。链式分区让 T(n)=T(n−1)+O(n) 累加成 Θ(n²)——这正是 BFPRT 要亲手消灭的可能性。`,
    },
  } }
  yield { t: 'step' }

  // ── 拍② 按 5 个一组分组 ──
  const groups: Tok[][] = []
  for (let start = 0; start < n; start += 5) groups.push(original.slice(start, start + 5))
  yield { t: 'scene', scene: groupsMatrix(groups, `按 5 个一组：${groupCount} 组${n % 5 === 0 ? '' : `（末组 ${n % 5} 个）`}`, () => 'default', '分组矩阵 · 每行一组') }
  yield { t: 'scene', scene: arrayScene('shelf', '分区视图 · 待命（先分组挑主元）', original.map(token => cell(token, 'muted')), { indexes: true, regions: [], pointers: [] }) }
  yield { t: 'metrics', metrics: metrics() }
  yield { t: 'message', step: {
    title: `按 5 个一组：${n} 个数分成 ${groupCount} 组`,
    tab: '分组',
    question: '为什么不直接排序？',
    formula: String.raw`\lceil n/5\rceil=${groupCount}\ \text{组}\times 5\ \text{个，每行一组}`,
    formulaHint: '矩阵每一行就是一组；元素的格子身份从未变过。',
    equation: String.raw`\text{每组只求中位数：组内常数代价}，\ \text{不需要组内全序}`,
    invariant: '元素一个不少：分组只是重新画格子，不改任何内容。',
    note: '分组是 SELECT 的第一道工序。组越小，中位数集合越大；组越大，每组信息越多——组大小是整个算法的命门，最后一拍见分晓。',
    conclusion: '逐组插入排序，把每组的中位数提取到中位数集合。',
    pseudocode: { lines: selectCode, active: [1] },
    prediction: {
      prompt: '为什么每组取 5 个，而不是 3 个？',
      options: ['3 个一组时 1/3+2/3=1，递推不收敛；5 个一组 1/5+7/10=0.9<1', '3 个一组算中位数太慢', '5 只是工程习惯，没有理论原因'],
      answer: 0,
      explanation: '每组 3 个时保底只丢约 n/3，递归剩 2n/3：T(n)≤T(n/3)+T(2n/3)+O(n) 的规模和 = n，退化为 Θ(n log n)；每组 5 个才把最坏一侧压到 7n/10，保证收敛。',
    },
  } }
  yield { t: 'step' }

  // ── 拍③ 逐组插入排序，提取中位数（每组一拍） ──
  const medians: Tok[] = []
  const groupSorted: Tok[][] = []
  for (let g = 0; g < groupCount; g += 1) {
    const { sorted, compares: groupCompares } = insertionSortGroup(groups[g])
    groupSorted.push(sorted)
    const median = sorted[Math.floor((sorted.length - 1) / 2)]
    medians.push(median)
    medianCount = medians.length
    compares += groupCompares
    yield { t: 'scene', scene: groupsMatrix(groupSorted, `组 ${g + 1} 排序完毕，中位数 ${tokenLabel(median)} 浮出`, token => {
      if (groups[g].some(member => member.seed === token.seed)) return token.seed === median.seed ? 'key' : 'default'
      return medians.slice(0, g).some(m => m.seed === token.seed) ? 'key' : 'muted'
    }, '分组矩阵 · 提取中位数') }
    yield { t: 'scene', scene: arrayScene('medians', `中位数集合（${medianCount}/${groupCount}）`, medians.map(token => cell(token, 'default')), { indexes: true }) }
    yield { t: 'metrics', metrics: metrics() }
    yield { t: 'message', step: {
      title: `组 ${g + 1}：插入排序后中位数 = ${tokenLabel(median)}`,
      tab: `组 ${g + 1} 中位数`,
      question: '一个中位数替全组说出了什么？',
      formula: String.raw`m_{${g + 1}}=\text{${tokenLabel(median)}}\ \text{（组内中位，组内 }${groupCompares}\text{ 次比较）}=O(1)`,
      formulaHint: `看矩阵第 ${g + 1} 行：中位数左边 2 个更小、右边 2 个更大（末组按实际个数）。`,
      judge: { entries: [
        { left: '组内 5 个数', op: '→', right: '排序取中位数', holds: true, action: `${groupCompares} 次比较 · 与 n 无关` },
        { left: `m=${tokenLabel(median)}`, op: '≥', right: '同组 2 个数', holds: true, action: '中位数拖上 3 个元素：自己 + 2 个更大的' },
      ] },
      moves: { kind: 'one-way', title: `中位数 ${tokenLabel(median)} 流入中位数集合`, moves: [{ token: tokenLabel(median), from: `组 ${g + 1}`, to: `中位数集合（第 ${medianCount} 个）` }], verdict: '组内排序的副产品：中位数免费带着"2 大 2 小"的信息。' },
      invariant: `已提取 ${medianCount} 个中位数；其余元素从未离开自己的组。`,
      note: '插入排序在 5 个数上最多 10 次比较：组内成本与 n 无关，全部组合计仍是 O(n)。',
      conclusion: g + 1 < groupCount ? `继续提取组 ${g + 2} 的中位数。` : '中位数集合齐了——对它递归求中位数。',
      pseudocode: { lines: selectCode, active: [2] },
    } }
    yield { t: 'step' }
  }

  // ── 拍④ 递归求中位数的中位数 M ──
  const medSorted = medians.slice().sort((a, b) => a.value - b.value)
  const M = medSorted[Math.ceil(groupCount / 2) - 1]
  const medSet = medSorted.map(token => `\\text{${tokenLabel(token)}}`).join(',')
  yield { t: 'scene', scene: groupsMatrix(groupSorted, `M=${tokenLabel(M)}：中位数集合的正中位`, token => {
    const isMedian = medians.some(member => member.seed === token.seed)
    if (!isMedian) return 'muted'
    return token.seed === M.seed ? 'target' : 'key'
  }, '分组矩阵 · M 升格') }
  yield { t: 'scene', scene: arrayScene('medians', `中位数集合 · 取第 ⌈${groupCount}/2⌉ 个`, medSorted.map(token => cell(token, token.seed === M.seed ? 'target' : 'default')), { indexes: true }) }
  yield { t: 'metrics', metrics: metrics() }
  yield { t: 'message', step: {
    title: `递归求中位数的中位数：M = ${tokenLabel(M)}`,
    tab: `M=${tokenLabel(M)}`,
    question: 'M 有多好？',
    formula: String.raw`M=\text{SELECT}\left(\{${medSet}\},\ \left\lceil ${groupCount}/2\right\rceil\right)=\text{${tokenLabel(M)}}`,
    formulaHint: '对中位数集合再跑一次 SELECT——这就是 T(n) 里的 T(n/5) 项。',
    equation: String.raw`\text{一半中位数}\ge M\ \Rightarrow\ \text{每个中位数拖 3 个元素}`,
    judge: { entries: [{ left: `M=${tokenLabel(M)}`, op: '≥', right: `⌈组数/2⌉−1 个其他中位数`, holds: true, action: 'M 排在中位数集合的正中，不会太偏' }] },
    moves: { kind: 'one-way', title: `M=${tokenLabel(M)} 升格为主元候选`, moves: [{ token: tokenLabel(M), from: '中位数集合', to: '主元 M' }], verdict: '递归只对 ⌈n/5⌉ 个中位数做——成本 T(n/5)。' },
    invariant: 'M 是"中位数的中位数"：不保证是全局中位数，但保证不会太偏。',
    note: `这一步对 ${groupCount} 个中位数递归调用 SELECT。M 未必是真中位数，但下一拍会看到它"足够好"：足够让最坏情况也收敛。`,
    conclusion: '用 M 对全数组做一次真实分区，看它到底能确定多少元素。',
    pseudocode: { lines: selectCode, active: [3] },
    prediction: {
      prompt: 'M 一定能保证丢掉多少元素？',
      options: [`至少约 3n/10（n=${n} 时 ≥ ${guarantee} 个）——无论输入多坏`, '至少约 n/2——M 接近真中位数', '可能只丢 1 个——M 偏向一侧时就完了'],
      answer: 0,
      explanation: `一半中位数 ≥ M，每个中位数又拖 2 个同组元素：至少 3⌈⌈n/5⌉/2⌉−2 = ${guarantee} 个元素确定在 M 的一侧。M 不完美，但"最坏也丢约 30%"已经足够收敛。`,
    },
  } }
  yield { t: 'step' }

  // ── 拍⑤ 用 M 三路分区（真实执行）：最坏只丢约 3n/10 ──
  const part = threeWayPartition(original, M.value)
  compares += n
  const le = part.lt + part.eq
  const ge = part.eq + part.gt
  const partRegions: RegionLabel[] = []
  if (part.lt > 0) partRegions.push({ from: 0, to: part.lt - 1, label: `＜M：${part.lt} 个`, tone: 'blue' })
  if (part.eq > 0) partRegions.push({ from: part.lt, to: part.lt + part.eq - 1, label: `=M：${part.eq} 个`, tone: 'orange' })
  if (part.gt > 0) partRegions.push({ from: part.lt + part.eq, to: n - 1, label: `＞M：${part.gt} 个`, tone: 'yellow' })
  const direction = k <= part.lt
    ? `在 ＜M 区：递归左区继续找第 ${k} 小`
    : k <= le
      ? '恰好是 M 本身（k 落在 =M 带）'
      : `在 ＞M 区：递归右区找第 ${k - le} 小`
  const mPointer: PointerTag[] = part.eq > 0 ? [{ index: part.lt, label: `M=${M.value}`, tone: 'purple' }] : []
  yield { t: 'scene', scene: groupsMatrix(groupSorted, `M=${tokenLabel(M)} 已就位，分区完成`, token => {
    const isMedian = medians.some(member => member.seed === token.seed)
    if (!isMedian) return 'muted'
    return token.seed === M.seed ? 'target' : 'key'
  }, '分组矩阵 · M 已就位') }
  yield { t: 'scene', scene: arrayScene('shelf', `分区视图 · 以 M=${M.value} 三路分区`, part.arr.map((token, index) => cell(token, index < part.lt ? 'sorted' : index < le ? 'pivot' : 'sorted')), { indexes: true, regions: partRegions, pointers: mPointer }) }
  yield { t: 'metrics', metrics: metrics() }
  yield { t: 'message', step: {
    title: `用 M=${tokenLabel(M)} 分区：≤M 共 ${le} 个，≥M 共 ${ge} 个——最坏只丢约 30%`,
    tab: `分区 M=${tokenLabel(M)}`,
    question: 'M 到底"确定"了多少元素？',
    formula: String.raw`3\left\lceil\left\lceil n/5\right\rceil/2\right\rceil-2=3\cdot${Math.ceil(groupCount / 2)}-2=${guarantee}\approx\frac{3n}{10}`,
    formulaHint: `括号直接读出两侧个数：≤M ${le} 个、≥M ${ge} 个，都 ≥ 保证值 ${guarantee}（n=${n} 时 3n/10=${(3 * n / 10).toFixed(1)}）。`,
    equation: String.raw`\text{最坏递归规模}\le n-${guarantee}=${n - guarantee}\approx\tfrac{7n}{10}`,
    judge: { entries: [
      { left: `≤M 的 ${le} 个`, op: '≥', right: `保证 ${guarantee}`, holds: true, action: '最坏也至少确定这么多' },
      { left: `≥M 的 ${ge} 个`, op: '≥', right: `保证 ${guarantee}`, holds: true, action: '另一侧同理' },
    ], note: '一半中位数各拖 3 个元素，扣掉 M 自己的组和末组余量后，两侧的保守下界就是 3⌈⌈n/5⌉/2⌉−2。' },
    moves: { kind: 'one-way', title: '三路分区：每个元素与 M 比一次，各就各位', moves: [
      { token: `＜M 的 ${part.lt} 个`, to: '左区' },
      { token: `＝M 的 ${part.eq} 个`, to: '中带' },
      { token: `＞M 的 ${part.gt} 个`, to: '右区' },
    ], verdict: '分区真实执行：一次扫描、n 次比较，双向关系一次定死。' },
    invariant: '每个元素"相对 M 的位置"从此确定——无论递归走哪一侧，这些关系都不再改变。',
    note: `第 ${k} 小的去向：${direction}。n=${n}：公式保证 ${guarantee} 个（约 3n/10=${(3 * n / 10).toFixed(1)}），${n === 15 ? '保守地说 15 个数每边至少 3 个；' : '25 个数每边至少 7 个；'}本次实测两侧分别 ${le} 个和 ${ge} 个。就算最坏，进入递归的也只剩 ${n - guarantee} ≈ 7n/10 个。`,
    conclusion: '两侧都有至少约 3n/10 的元素被焊死——这是与快排最坏 Θ(n²) 的本质区别。',
    pseudocode: { lines: selectCode, active: k <= part.lt ? [4, 5] : k <= le ? [4, 6] : [4, 7] },
  } }
  yield { t: 'step' }

  // ── 拍⑥ 递推式与收敛 ──
  yield { t: 'message', step: {
    title: '递推式：1/5 + 7/10 = 0.9 < 1，收敛到 Θ(n)',
    tab: '收敛 Θ(n)',
    question: '为什么这次不会再退化？',
    formula: String.raw`T(n)\le T(\tfrac{n}{5})+T(\tfrac{7n}{10})+O(n)\Rightarrow\Theta(n)`,
    formulaHint: `T(n/5)=对 ${groupCount} 个中位数的递归；T(7n/10)=最坏一侧的递归（本组 ${n} → ≤${n - guarantee}）。`,
    equation: String.raw`\tfrac{1}{5}+\tfrac{7}{10}=\tfrac{9}{10}<1:\ \text{子问题规模之和}<n\Rightarrow\text{几何收敛}`,
    invariant: '每层 O(n) 的分组、取中位数、分区都是真实执行的；递归规模之和永远 < n。',
    note: '对比：快排最坏 T(n)=T(n−1)+O(n)，规模和 = n−1+n > n，累加成 Θ(n²)。BFPRT 用 O(n) 挑主元的钱把最坏一侧压到 7n/10——0.9<1，几何级数收敛，最坏也是 Θ(n)。',
    conclusion: 'SELECT 的最坏复杂度被焊死在 Θ(n)：不再依赖输入的善意，也不依赖抽签的运气。',
    pseudocode: { lines: selectCode, active: [] },
  } }
  yield { t: 'step' }
}

const buildMedianTrace = (example: MomExample): Trace => recordTrace('SANDBOX 12 · MEDIAN OF MEDIANS', '中位数的中位数（BFPRT）：用线性预算挑一个"足够好"的主元，保证每层最坏也丢约 3n/10——选择的最坏情况被焊死在 Θ(n)。', runMedianOfMedians(example.values))

const momInsight: DesignInsight = {
  observation: '中位数的中位数不追求完美主元，只追求"最坏也确定丢掉 3n/10"——一个 0.9<1 的几何收敛，把选择的最坏情况焊死在 Θ(n)。',
  contrasts: [
    { alternative: '随机化选择（RANDOMIZED-SELECT）', whyNot: '期望 Θ(n) 且常数更小，但最坏仍 Θ(n²)；BFPRT 多花线性预算，换来对任何输入都成立的最坏界。' },
    { alternative: '每组取 3 个', whyNot: '保底丢弃掉到约 n/3，递归剩 2n/3：1/3+2/3=1 不收敛，退化为 Θ(n log n)——组大小是收敛性的生命线。' },
  ],
  transfer: { prompt: '若把每组改成 7 个，递推式和收敛性会怎样？', options: ['T(n)≤T(n/7)+T(5n/7)+O(n)，1/7+5/7=6/7<1，仍 Θ(n)', '1/7+5/7=1，不收敛', '组越大越慢，变成 Θ(n log n)'], answer: 0, explanation: '每组 7 个：一半中位数各拖 4 个元素，保底丢约 2n/7，递归剩 5n/7；1/7+5/7=6/7<1 依然收敛。5 只是能收敛的最小组大小，7、9 也成立，只是组内排序成本略涨。' },
}

const momComplexity: ComplexityProfileData = {
  title: '中位数的中位数：最坏情况线性选择',
  subtitle: 'BFPRT 用 O(n) 的挑主元成本，把 SELECT 的最坏情况焊死在 Θ(n)。',
  cases: [
    { label: '最好', complexity: 'Θ(n)', condition: '每层 M 接近真中位数，两侧近似对半，递归规模缩得最快。', example: 'n=15：T(3)+T(11)+O(15)', explanation: '每层的分组、取中位数、分区一次都不能省——快的是递归侧，不是每层。', tone: 'best' },
    { label: '平均', complexity: 'Θ(n)', condition: '任意输入：分组与三路分区都是全量线性扫描。', example: '随机、重复键、已排序一视同仁', explanation: '每层成本 n·(9/10)ⁱ 求和仍是线性；不存在能让它退化的输入分布。', tone: 'average' },
    { label: '最差', complexity: 'Θ(n)', condition: '即使 M 每次都只保底丢 3n/10。', example: '人为构造让 M 偏到 30% 边界', explanation: '1/5+7/10=0.9<1 仍收敛——这正是 BFPRT 存在的意义。', tone: 'worst' },
  ],
  footer: '对比：RANDOMIZED-SELECT 期望 Θ(n) 但最坏 Θ(n²)；BFPRT 常数更大（每组 5 个还要递归挑主元），工程上常折中为"三取一"或随机化。',
}

export function MedianOfMediansLesson() {
  const [exampleId, setExampleId] = useState(momExamples[0].id)
  const example = momExamples.find(item => item.id === exampleId) ?? momExamples[0]
  const trace = buildMedianTrace(example)
  const playback = useLessonPlayback(trace.steps.length)
  return <LessonShell eyebrow={trace.eyebrow} title={trace.steps[playback.step].title} description={trace.description} steps={trace.steps.map(item => item.tab ?? '推演')} step={playback.step} onStepChange={playback.setStep} playing={playback.playing} onTogglePlaying={playback.togglePlaying} onReplay={playback.replay} speed={playback.speed} onCycleSpeed={playback.cycleSpeed} complexity={momComplexity} examplePicker={<ExamplePicker examples={momExamples} value={exampleId} onChange={id => { playback.reset(); setExampleId(id) }} />}>
    <TracePlayer trace={trace} step={playback.step} />
    <DesignNotes insight={momInsight} />
  </LessonShell>
}
