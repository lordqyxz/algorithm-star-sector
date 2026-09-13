import { useState } from 'react'
import { DesignNotes, type DesignInsight } from '@/components/DesignNotes'
import { ExamplePicker, type ExampleOption } from '@/components/ExamplePicker'
import { LessonShell } from '@/components/LessonShell'
import type { ComplexityProfileData } from '@/components/ComplexityProfile'
import type { MetricItem } from '@/components/CalcDesk'
import { TracePlayer } from '@/engine/TracePlayer'
import { arrayScene, recordTrace, type TraceEvent } from '@/engine/events'
import type { SceneCell, Tone, Trace } from '@/engine/trace'
import { useLessonPlayback } from '@/hooks/useLessonPlayback'

/** 演示数据与算法分离：本文件 = 数据集 + 分治最大子数组生成器（产出 Trace）+ 播放器装配。 */

type SubarrayExample = ExampleOption & { values: number[] }

const subarrayExamples: readonly SubarrayExample[] = [
  { id: 'classic', label: '课堂基准', detail: '答案 7：段 [4,-1,-2,1,5]', values: [-2, -3, 4, -1, -2, 1, 5, -3] },
  { id: 'all-negative', label: '全负数组', detail: '答案 -1：缩成单个元素', values: [-3, -1, -2, -5, -4, -2, -6, -1] },
  { id: 'cross-wins', label: '跨界更优', detail: '跨中候选 14 击败左右两半', values: [-1, 8, -9, 4, 5, -2, 7, -3] },
  { id: 'near-positive', label: '近正序列', detail: '答案 12：几乎整段数组', values: [2, 3, -1, 4, 2, -2, 3, 1] },
]

const subarrayCode = [
  { code: 'if low = high: return A[low]', note: '基例：单元素问题自己就是答案' },
  { code: 'mid = ⌊(low + high) / 2⌋', note: '切一刀：分界线不偏不倚' },
  { code: 'L = FIND-MAX-SUB(A, low, mid)', note: '候选一：完全在左半' },
  { code: 'R = FIND-MAX-SUB(A, mid+1, high)', note: '候选二：完全在右半' },
  { code: 'C = FIND-CROSS(A, low, mid, high)', note: '候选三：恰好压住中线' },
  { code: 'return max(L, R, C)', note: '三选一：三者必居其一、只居其一' },
  { code: 'CROSS: left-sum = -∞; sum = 0' },
  { code: 'for i = mid downto low', note: '从 mid 向左逐格累加' },
  { code: '  sum = sum + A[i]', note: '累加和实时变化' },
  { code: '  if sum > left-sum: left-sum = sum', note: '留下最大的累加和与它的起点' },
  { code: 'CROSS: right-sum = -∞; sum = 0' },
  { code: 'for j = mid+1 to high', note: '从 mid+1 向右逐格累加' },
  { code: '  sum = sum + A[j]' },
  { code: '  if sum > right-sum: right-sum = sum' },
  { code: 'return left-sum + right-sum', note: '两段拼起来，就是跨中最优段' },
]

type Candidate = { sum: number; lo: number; hi: number }

/** 真实执行的分治最大子数组（0-based，闭区间）；顶层调用的三拍由生成器逐步展开。 */
function maxSubDC(values: readonly number[], lo: number, hi: number): Candidate {
  if (lo === hi) return { sum: values[lo], lo, hi }
  const mid = Math.floor((lo + hi) / 2)
  const left = maxSubDC(values, lo, mid)
  const right = maxSubDC(values, mid + 1, hi)
  const cross = maxCrossing(values, lo, mid, hi)
  return cross.sum >= left.sum && cross.sum >= right.sum ? cross : left.sum >= right.sum ? left : right
}

function maxCrossing(values: readonly number[], lo: number, mid: number, hi: number): Candidate {
  let leftSum = -Infinity
  let run = 0
  let leftLo = mid
  for (let i = mid; i >= lo; i -= 1) {
    run += values[i]
    if (run > leftSum) { leftSum = run; leftLo = i }
  }
  let rightSum = -Infinity
  run = 0
  let rightHi = mid + 1
  for (let j = mid + 1; j <= hi; j += 1) {
    run += values[j]
    if (run > rightSum) { rightSum = run; rightHi = j }
  }
  return { sum: leftSum + rightSum, lo: leftLo, hi: rightHi }
}

type CellPaint = {
  /** 正在累加的区段（黄色）。 */
  key?: [number, number]
  focus?: number
  focusCaption?: string
  /** 扫描中当前最优位置或跨中候选（紫色）。 */
  best?: number
  bestCaption?: string
  target?: [number, number]
  targetCaption?: string
  /** 已确定的局部最优 / 最终胜者（绿色）。 */
  winner?: [number, number]
  winnerCaption?: string
  winner2?: [number, number]
  winner2Caption?: string
  /** 落选候选（灰色虚化）。 */
  muted?: [number, number]
}

function paintCells(values: readonly number[], paint: CellPaint): SceneCell[] {
  const within = (index: number, range?: [number, number]) => range !== undefined && index >= range[0] && index <= range[1]
  return values.map((value, index) => {
    let tone: Tone = 'default'
    let caption: string | undefined
    if (within(index, paint.muted)) { tone = 'muted'; caption = '落选候选' }
    if (within(index, paint.winner)) { tone = 'sorted'; caption = paint.winnerCaption ?? '胜者段' }
    if (within(index, paint.winner2)) { tone = 'sorted'; caption = paint.winner2Caption ?? '胜者段' }
    if (within(index, paint.target)) { tone = 'target'; caption = paint.targetCaption ?? '跨中候选' }
    if (within(index, paint.key)) { tone = 'key'; caption = '正在累加' }
    if (paint.best === index) { tone = 'target'; caption = paint.bestCaption ?? '当前最优' }
    if (paint.focus === index) { tone = 'focus'; caption = paint.focusCaption }
    return { id: `a${index}`, label: value, tone, caption }
  })
}

function* runMaximumSubarray(values: readonly number[]): Generator<TraceEvent> {
  const n = values.length
  const lo = 0
  const hi = n - 1
  const mid = Math.floor((lo + hi) / 2)
  const totalSegments = (n * (n + 1)) / 2

  let compares = 0
  let running = 0
  let scanning: 'left' | 'right' | null = null
  let leftResult: Candidate | null = null
  let rightResult: Candidate | null = null
  let crossKnown = false
  let crossSum = 0

  const metrics = (): MetricItem[] => [
    { label: '累计比较', value: compares, tone: 'orange' },
    { label: '当前累加和', value: scanning === null ? '—' : running, tone: 'blue' },
    { label: '跨中最佳和', value: crossKnown ? crossSum : '—', tone: 'green' },
    { label: '候选和（左/右/跨）', value: leftResult && rightResult ? `${leftResult.sum} / ${rightResult.sum} / ${crossKnown ? crossSum : '…'}` : '…', tone: 'purple' },
  ]

  // 拍 1：问题声明
  yield { t: 'scene', scene: arrayScene('line', '主数组：候选段都会标在它上面', paintCells(values, {}), { indexes: true }) }
  yield { t: 'metrics', metrics: metrics() }
  yield {
    t: 'legend',
    legend: [
      { tone: 'focus', label: '正在累加的格子' },
      { tone: 'key', label: '当前累加段' },
      { tone: 'target', label: '扫描中的最优位置' },
      { tone: 'sorted', label: '已确定的候选 / 最终胜者' },
      { tone: 'muted', label: '落选候选' },
    ],
  }
  yield {
    t: 'message',
    step: {
      title: `问题：在 ${n} 个数里找一段连续元素，使和最大`,
      tab: '问题',
      formula: String.raw`\max_{1\le i\le j\le ${n}}\ \sum_{k=i}^{j}A[k]`,
      formulaHint: '只挑一段连续元素：不重排、不跳格。',
      equation: String.raw`\text{暴力枚举：}\tfrac{n(n+1)}{2}=\tfrac{${n}\cdot${n + 1}}{2}=${totalSegments}\ \text{段}\Rightarrow\Theta(n^2)`,
      invariant: '元素的值和先后顺序一个都不变——问题只关心"从哪到哪"。',
      note: `暴力把 ${totalSegments} 段全部加一遍要 Θ(n²)。分治只看三个候选：完全在左半、完全在右半、或恰好压住分界线。`,
      conclusion: '先切一刀：mid 把数组分成两半。',
      pseudocode: { lines: subarrayCode, active: [0] },
    },
  }
  yield { t: 'step' }

  // 拍 2：分半 + 预测
  yield { t: 'cells', scene: 'line', cells: paintCells(values, {}) }
  yield { t: 'regions', scene: 'line', regions: [
    { id: 'rg-left', from: lo, to: mid, label: `左半 A[1..${mid + 1}]`, tone: 'blue' },
    { id: 'rg-right', from: mid + 1, to: hi, label: `右半 A[${mid + 2}..${n}]`, tone: 'orange' },
  ] }
  yield { t: 'pointers', scene: 'line', pointers: [{ id: 'pmid', index: mid, label: 'mid', tone: 'purple' }] }
  yield { t: 'metrics', metrics: metrics() }
  yield {
    t: 'message',
    step: {
      title: `切一刀：mid = ${mid + 1}，数组分成了两半`,
      tab: '分半',
      formula: String.raw`\text{mid}=\left\lfloor\tfrac{1+${n}}{2}\right\rfloor=${mid + 1}`,
      formulaHint: '蓝色括号是左半，橙色括号是右半，mid 压在分界线上。',
      equation: String.raw`T(n)=2T(n/2)+\Theta(n)`,
      invariant: '数组没有被重排：分半只是画两条括号，问题规模各减一半。',
      note: '递归式怎么读：2 个子问题、每个规模 n/2、本层还要花 Θ(n) 做一次跨中扫描。',
      conclusion: '左右两半各自递归；但"从左半伸进右半"的段，两边递归都看不见——先记下这个缺口。',
      prediction: {
        prompt: '跨中点候选为什么必须同时包含 A[mid] 和 A[mid+1]？',
        options: ['不包含也行：递归反正会把它们算进来', '它是"压住分界线"的定义：缺任何一侧，它就是左半或右半内部的段，已被递归覆盖', '因为数组长度是偶数'],
        answer: 1,
        explanation: '跨界段的定义就是同时压住分界线两侧；缺一侧就掉进左半或右半的子问题里。左、右、跨三个候选合起来才不重不漏。',
      },
      pseudocode: { lines: subarrayCode, active: [0, 1] },
    },
  }
  yield { t: 'step' }

  // 拍 3：左半最佳（递归返回）
  leftResult = maxSubDC(values, lo, mid)
  yield { t: 'cells', scene: 'line', cells: paintCells(values, { winner: [leftResult.lo, leftResult.hi], winnerCaption: '左半最佳' }) }
  yield { t: 'regions', scene: 'line', regions: [
    { id: 'rg-lbest', from: leftResult.lo, to: leftResult.hi, label: `左半最佳：和 ${leftResult.sum}`, tone: 'green' },
    { id: 'rg-right', from: mid + 1, to: hi, label: `右半 A[${mid + 2}..${n}]`, tone: 'orange' },
  ] }
  yield { t: 'metrics', metrics: metrics() }
  yield {
    t: 'message',
    step: {
      title: `左半递归返回：最优段和 ${leftResult.sum}`,
      tab: '左半',
      formula: String.raw`A[1..${mid + 1}]\text{ 内的最优段}=A[${leftResult.lo + 1}..${leftResult.hi + 1}]=${leftResult.sum}`,
      formulaHint: '绿色括号就是左半的答案段，递归已经把它定死了。',
      equation: String.raw`T(${mid + 1})\text{：同样的三候选，规模减半}`,
      invariant: '左半内部的最优段不跨中线——无论它是不是全局答案，都不会丢。',
      note: '全负输入时它会缩成单个元素：任何延伸都只会更负。这正是"候选可以是单元素"的来源。',
      conclusion: '同一个问题在右半重演一遍。',
      pseudocode: { lines: subarrayCode, active: [2] },
    },
  }
  yield { t: 'step' }

  // 拍 4：右半最佳（递归返回）
  rightResult = maxSubDC(values, mid + 1, hi)
  yield { t: 'cells', scene: 'line', cells: paintCells(values, { winner: [leftResult.lo, leftResult.hi], winnerCaption: '左半最佳', winner2: [rightResult.lo, rightResult.hi], winner2Caption: '右半最佳' }) }
  yield { t: 'regions', scene: 'line', regions: [
    { id: 'rg-lbest', from: leftResult.lo, to: leftResult.hi, label: `左半最佳：和 ${leftResult.sum}`, tone: 'green' },
    { id: 'rg-rbest', from: rightResult.lo, to: rightResult.hi, label: `右半最佳：和 ${rightResult.sum}`, tone: 'green' },
  ] }
  yield { t: 'metrics', metrics: metrics() }
  yield {
    t: 'message',
    step: {
      title: `右半递归返回：最优段和 ${rightResult.sum}`,
      tab: '右半',
      formula: String.raw`A[${mid + 2}..${n}]\text{ 内的最优段}=A[${rightResult.lo + 1}..${rightResult.hi + 1}]=${rightResult.sum}`,
      formulaHint: '两个绿色括号：左右两半各自的局部答案都已确定。',
      equation: String.raw`T(n/2)+T(n/2)\ \text{完成，只差跨中候选}`,
      invariant: '左右两个候选都只在自己的半边里——它们都没有压住中线。',
      note: '还缺第三种形状：同时踩着 mid 和 mid+1 的段。',
      conclusion: '接下来用两次线性扫描，把跨中候选拼出来。',
      pseudocode: { lines: subarrayCode, active: [3] },
    },
  }
  yield { t: 'step' }

  // 拍 5-8：左扫（从 mid 向左逐格累加）
  scanning = 'left'
  running = 0
  let leftSum = -Infinity
  let bestI = mid
  for (let i = mid; i >= lo; i -= 1) {
    const prevBest = leftSum
    running += values[i]
    compares += 1
    const holds = running > leftSum
    if (holds) { leftSum = running; bestI = i }
    const bestText = prevBest === -Infinity ? '-∞' : String(prevBest)
    yield { t: 'cells', scene: 'line', cells: paintCells(values, { key: [i, mid], focus: i, focusCaption: `sum=${running}`, best: bestI, bestCaption: `left-sum=${leftSum}` }) }
    yield { t: 'pointers', scene: 'line', pointers: [{ id: 'pi', index: i, label: 'i', tone: 'yellow' }, { id: 'pmid', index: mid, label: 'mid', tone: 'purple' }] }
    yield { t: 'regions', scene: 'line', regions: [{ id: 'rg-lscan', from: i, to: mid, label: `累加 A[${i + 1}..${mid + 1}]`, tone: 'yellow' }] }
    yield { t: 'metrics', metrics: metrics() }
    yield {
      t: 'message',
      step: {
        title: `左扫：加上 A[${i + 1}]=${values[i]}，累加和 ${running}`,
        tab: `左扫 A[${i + 1}]`,
        formula: String.raw`sum=${running - values[i]}+(${values[i]})=${running}`,
        formulaHint: '黄色括号是从 mid 向左的累加段；蓝色格子是刚加进来的。',
        equation: holds
          ? String.raw`${running}>\text{left-sum}(${bestText})\Rightarrow\text{更新为 }${running}`
          : String.raw`${running}\le\text{left-sum}(${bestText})\Rightarrow\text{保留 }${leftSum}`,
        judge: { title: '这一格的累加和，值不值得记下？', entries: [{ left: `sum=${running}`, op: '>', right: `left-sum=${bestText}`, holds, action: holds ? `left-sum 更新为 ${leftSum}（起点 A[${bestI + 1}]）` : '不更新：再往左只会拖累这个后缀' }] },
        invariant: 'left-sum 始终是"必须在 A[mid] 结尾"的最优和——从 mid 向左的每个后缀都被枚举到。',
        conclusion: i > lo ? '继续向左一格累加。' : `左扫完成：left-sum = ${leftSum}，起点 A[${bestI + 1}]。`,
        pseudocode: { lines: subarrayCode, active: i === mid ? [6, 7, 8, 9] : [7, 8, 9] },
      },
    }
    yield { t: 'step' }
  }

  // 拍 9-12：右扫（从 mid+1 向右逐格累加）
  scanning = 'right'
  running = 0
  let rightSum = -Infinity
  let bestJ = mid + 1
  for (let j = mid + 1; j <= hi; j += 1) {
    const prevBest = rightSum
    running += values[j]
    compares += 1
    const holds = running > rightSum
    if (holds) { rightSum = running; bestJ = j }
    const bestText = prevBest === -Infinity ? '-∞' : String(prevBest)
    yield { t: 'cells', scene: 'line', cells: paintCells(values, { key: [mid + 1, j], focus: j, focusCaption: `sum=${running}`, best: bestJ, bestCaption: `right-sum=${rightSum}` }) }
    yield { t: 'pointers', scene: 'line', pointers: [{ id: 'pj', index: j, label: 'j', tone: 'orange' }, { id: 'pmid', index: mid, label: 'mid', tone: 'purple' }] }
    yield { t: 'regions', scene: 'line', regions: [{ id: 'rg-rscan', from: mid + 1, to: j, label: `累加 A[${mid + 2}..${j + 1}]`, tone: 'yellow' }] }
    yield { t: 'metrics', metrics: metrics() }
    yield {
      t: 'message',
      step: {
        title: `右扫：加上 A[${j + 1}]=${values[j]}，累加和 ${running}`,
        tab: `右扫 A[${j + 1}]`,
        formula: String.raw`sum=${running - values[j]}+(${values[j]})=${running}`,
        formulaHint: '黄色括号是从 mid+1 向右的累加段；橙色指针 j 是刚加进来的格子。',
        equation: holds
          ? String.raw`${running}>\text{right-sum}(${bestText})\Rightarrow\text{更新为 }${running}`
          : String.raw`${running}\le\text{right-sum}(${bestText})\Rightarrow\text{保留 }${rightSum}`,
        judge: { title: '这一格的累加和，值不值得记下？', entries: [{ left: `sum=${running}`, op: '>', right: `right-sum=${bestText}`, holds, action: holds ? `right-sum 更新为 ${rightSum}（终点 A[${bestJ + 1}]）` : '不更新：再往右只会拖累这个前缀' }] },
        invariant: 'right-sum 始终是"必须从 A[mid+1] 开始"的最优和——从 mid+1 向右的每个前缀都被枚举到。',
        conclusion: j < hi ? '继续向右一格累加。' : `右扫完成：right-sum = ${rightSum}，终点 A[${bestJ + 1}]。`,
        pseudocode: { lines: subarrayCode, active: j === mid + 1 ? [10, 11, 12, 13] : [11, 12, 13] },
      },
    }
    yield { t: 'step' }
  }

  // 拍 13：两和汇合成跨中候选
  scanning = null
  crossSum = leftSum + rightSum
  crossKnown = true
  yield { t: 'cells', scene: 'line', cells: paintCells(values, { target: [bestI, bestJ], targetCaption: '跨中候选' }) }
  yield { t: 'regions', scene: 'line', regions: [{ id: 'rg-cross', from: bestI, to: bestJ, label: `跨中候选：和 ${crossSum}`, tone: 'purple' }] }
  yield { t: 'pointers', scene: 'line', pointers: [{ id: 'pmid', index: mid, label: 'mid', tone: 'purple' }] }
  yield { t: 'metrics', metrics: metrics() }
  yield {
    t: 'message',
    step: {
      title: `cross = left-sum + right-sum = ${leftSum} + ${rightSum} = ${crossSum}`,
      tab: '拼合',
      formula: String.raw`cross=${leftSum}+${rightSum}=${crossSum}`,
      formulaHint: `紫色段 A[${bestI + 1}..${bestJ + 1}] 同时压住分界线两侧。`,
      equation: String.raw`\text{必须在 mid 结尾的最优}+\text{必须从 mid+1 开始的最优}=\text{跨中最优}`,
      moves: {
        kind: 'one-way',
        title: '两个部分和汇合成跨中候选',
        moves: [
          { token: `left-sum=${leftSum}`, from: `A[${bestI + 1}..${mid + 1}]（mid 结尾）`, to: 'cross' },
          { token: `right-sum=${rightSum}`, from: `A[${mid + 2}..${bestJ + 1}]（mid+1 开头）`, to: 'cross' },
        ],
        verdict: `两段拼起来恰好是 A[${bestI + 1}..${bestJ + 1}]，和为 ${crossSum}——跨界段在 mid 处必被切成这样两半，没有第三种形状。`,
      },
      invariant: '两个方向各自取最优，拼出的段必然是跨中最优——任何跨界段都被 mid 切成"左尾巴 + 右头"。',
      conclusion: '第三个候选到手：左、右、跨三者的答案都齐了。',
      pseudocode: { lines: subarrayCode, active: [14] },
    },
  }
  yield { t: 'step' }

  // 拍 14：三选一 + 预测
  const leftFirst = leftResult.sum >= rightResult.sum
  const finalist = leftFirst ? leftResult : rightResult
  const crossWinsFinal = crossSum >= finalist.sum
  const winner: Candidate = crossWinsFinal ? { sum: crossSum, lo: bestI, hi: bestJ } : finalist
  const mutedRanges = (crossWinsFinal
    ? [[leftResult.lo, leftResult.hi], [rightResult.lo, rightResult.hi]]
    : winner === leftResult
      ? [[rightResult.lo, rightResult.hi], [bestI, bestJ]]
      : [[leftResult.lo, leftResult.hi], [bestI, bestJ]]
  ).filter(([a, b]) => !(a >= winner.lo && b <= winner.hi)) as [number, number][]
  yield {
    t: 'cells',
    scene: 'line',
    cells: values.map((value, index) => {
      if (index >= winner.lo && index <= winner.hi) return { id: `a${index}`, label: value, tone: 'sorted' as Tone, caption: '最终胜者' }
      const isMuted = mutedRanges.some(([a, b]) => index >= a && index <= b)
      return { id: `a${index}`, label: value, tone: (isMuted ? 'muted' : 'default') as Tone, caption: isMuted ? '落选候选' : undefined }
    }),
  }
  yield { t: 'regions', scene: 'line', regions: [{ id: 'rg-winner', from: winner.lo, to: winner.hi, label: `最大子数组：和 ${winner.sum}`, tone: 'green' }] }
  yield { t: 'metrics', metrics: metrics() }
  yield {
    t: 'message',
    step: {
      title: `三选一：全局答案是和 ${winner.sum} 的段`,
      tab: '三选一',
      formula: String.raw`\max(\text{左}\ ${leftResult.sum},\ \text{右}\ ${rightResult.sum},\ \text{跨}\ ${crossSum})=${winner.sum}`,
      formulaHint: '绿色括号是胜者段；灰化的两段是落选候选。',
      equation: crossWinsFinal
        ? String.raw`\text{跨中候选胜出：}${crossSum}\ge\max(${leftResult.sum},\ ${rightResult.sum})`
        : String.raw`\text{${leftFirst ? '左' : '右'}半候选胜出：}${finalist.sum}>\text{跨中}\ ${crossSum}`,
      judge: {
        title: '三个候选，谁最大？',
        entries: [
          { left: `左半 ${leftResult.sum}`, op: leftFirst ? '≥' : '<', right: `右半 ${rightResult.sum}`, holds: leftFirst, action: leftFirst ? '左半候选晋级（相等取左）' : '右半候选晋级' },
          { left: `晋级者 ${finalist.sum}`, op: crossWinsFinal ? '≤' : '>', right: `跨中 ${crossSum}`, holds: crossWinsFinal, action: crossWinsFinal ? '跨中候选就是全局最优' : '晋级者就是全局最优' },
        ],
      },
      invariant: '三个候选覆盖了所有可能的段：任何段要么整体在左、要么整体在右、要么压住中线——三选一必然正确。',
      prediction: {
        prompt: '如果数组全是负数，最大子数组是什么？',
        options: ['空数组：和为 0 最安全', '单个元素：全数组里的最大值', '整个数组：负得最少的一段'],
        answer: 1,
        explanation: 'CLRS 约定子数组非空：全为负时任何延伸都只会更负，最优解缩到单个最大元素——这也是三候选框架仍然正确的原因。',
      },
      conclusion: '答案落定：本层递归返回，上层继续同样的一套动作。',
      pseudocode: { lines: subarrayCode, active: [5] },
    },
  }
  yield { t: 'step' }

  // 拍 15：复杂度收尾
  yield { t: 'metrics', metrics: metrics() }
  yield {
    t: 'message',
    step: {
      title: `复杂度：本层 ${compares} 次比较，整体 Θ(n log n)`,
      tab: '复杂度',
      formula: String.raw`T(n)=2T(n/2)+\Theta(n)\Rightarrow\Theta(n\log n)`,
      formulaHint: '绿色括号仍是全局答案；每一层都做一次这样线性的跨中扫描。',
      equation: String.raw`\Theta(n)\ \text{每层}\times\log_2 n\ \text{层}=\Theta(n\log n)`,
      invariant: '每一层"左、右、跨"三候选的比较结构不变——变的只是问题规模。',
      note: '对照：暴力全枚举 Θ(n²)；Kadane 一遍扫描 Θ(n) 更快。分治的价值在框架可迁移——最近点对、Strassen 都靠"左、右、跨"这一招。',
      conclusion: '换组输入再跑一遍：全负、跨界更优、近正——三个候选总有一个说真话。',
      pseudocode: { lines: subarrayCode, active: [] },
    },
  }
  yield { t: 'step' }
}

const buildSubarrayTrace = (example: SubarrayExample): Trace => recordTrace('SANDBOX 15 · MAXIMUM SUBARRAY', '切开数组：答案只可能在左半、右半、或恰好压住分界线——三候选三选一，不重不漏。', runMaximumSubarray(example.values))

const subarrayInsight: DesignInsight = {
  observation: '切一刀之后，最优段只有三种落点：完全在左半、完全在右半、或恰好压住中线——前两种交给递归，第三种用两次线性累加拼出，"不重不漏"由此成立。',
  contrasts: [
    { alternative: 'Kadane 单遍扫描', whyNot: '一遍循环 Θ(n)、O(1) 空间，比分治快；但它是一条只服务本问题的专用不变量。分治的"左、右、跨"框架还能搬到最近点对与 Strassen。' },
    { alternative: '只递归左右两半、不算跨界', whyNot: '省掉 Θ(n) 扫描看似更快，但跨界候选常常正是全局最优（本课 4 组数据里 3 组如此）——漏掉它直接算错。' },
  ],
  transfer: { prompt: '最近点对也"切一刀"：分界线两侧的点什么时候需要互相检查？', options: ['只查距离中线不超过 δ 的条带里的点', '左侧每个点都要和右侧每个点比一遍', '跨界永远不可能是最优，不用查'], answer: 0, explanation: 'δ=min(左最优, 右最优) 之后，只有条带内的点对可能打破纪录，且每个点只需检查常数个邻居——把候选收窄到线性规模，和"跨中扫描"是同一招。' },
}

const subarrayComplexity: ComplexityProfileData = {
  title: '最大子数组：三种解法，三个代价',
  subtitle: '同一个问题，三套设计；分治（本课）介于暴力与 Kadane 之间，但框架可迁移。',
  cases: [
    { label: '暴力枚举', complexity: 'Θ(n²)', condition: '双重循环枚举全部 i≤j 段，与输入好坏无关。', example: 'n=8：36 段逐段求和', explanation: '外层起点、内层终点，每段 O(1) 增量求和，共 n(n+1)/2 段。', tone: 'method' },
    { label: '分治（本课）', complexity: 'Θ(n log n)', condition: '任意输入：T(n)=2T(n/2)+Θ(n)，最好=平均=最差。', example: '[-2,-3,4,-1,-2,1,5,-3] → 7', explanation: 'log n 层递归，每层一次线性的跨中双向扫描。', tone: 'method' },
    { label: 'Kadane 单遍', complexity: 'Θ(n)', condition: '任意输入：一遍扫描，维护"以当前位置结尾的最大和"。', example: '同输入只需 8 步', explanation: 'best_ending=max(A[i], best_ending+A[i])，全局取最大，O(1) 额外空间。', tone: 'method' },
  ],
  footer: 'Kadane Θ(n) 是本问题的速度冠军，暴力 Θ(n²) 是下限参照；分治 Θ(n log n) 赢在模板可复用——跨中候选这一招能带走。',
}

export function MaximumSubarrayLesson() {
  const [exampleId, setExampleId] = useState(subarrayExamples[0].id)
  const example = subarrayExamples.find(item => item.id === exampleId) ?? subarrayExamples[0]
  const trace = buildSubarrayTrace(example)
  const playback = useLessonPlayback(trace.steps.length)
  return <LessonShell eyebrow={trace.eyebrow} title={trace.steps[playback.step].title} description={trace.description} steps={trace.steps.map(item => item.tab ?? '推演')} step={playback.step} onStepChange={playback.setStep} playing={playback.playing} onTogglePlaying={playback.togglePlaying} onReplay={playback.replay} speed={playback.speed} onCycleSpeed={playback.cycleSpeed} complexity={subarrayComplexity} examplePicker={<ExamplePicker examples={subarrayExamples} value={exampleId} onChange={id => { playback.reset(); setExampleId(id) }} />}>
    <TracePlayer trace={trace} step={playback.step} />
    <DesignNotes insight={subarrayInsight} />
  </LessonShell>
}
