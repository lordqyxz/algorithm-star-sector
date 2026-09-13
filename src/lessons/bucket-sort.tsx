import { useState } from 'react'
import { DesignNotes, type DesignInsight } from '@/components/DesignNotes'
import { ExamplePicker, type ExampleOption } from '@/components/ExamplePicker'
import { LessonShell } from '@/components/LessonShell'
import type { ComplexityProfileData } from '@/components/ComplexityProfile'
import type { MetricItem } from '@/components/CalcDesk'
import { TracePlayer } from '@/engine/TracePlayer'
import { arrayScene, recordTrace, tokenLabel, tokenize, type TraceEvent } from '@/engine/events'
import type { SceneCell, Trace } from '@/engine/trace'
import { useLessonPlayback } from '@/hooks/useLessonPlayback'

/** 演示数据与算法分离：本文件 = 数据集 + 算法生成器（产出 Trace）+ 播放器装配。 */

type SortExample = ExampleOption & { values: number[] }
type Tok = { value: number; tag?: string; seed: number }

/** 输入均匀落在 [0,1)，n = 8：桶号 b(v) = ⌊n·v⌋，桶 i 收容 [i/8, (i+1)/8)。 */
const N_BUCKETS = 8

const bucketExamples: readonly SortExample[] = [
  { id: 'uniform', label: '均匀分布', detail: '[0.42,0.01,0.73,0.24,0.95,0.36,0.60,0.08]', values: [0.42, 0.01, 0.73, 0.24, 0.95, 0.36, 0.6, 0.08] },
  { id: 'clustered', label: '聚簇·最坏', detail: '[0.05,0.11,0.02,0.19,0.07,0.14,0.03,0.09]', values: [0.05, 0.11, 0.02, 0.19, 0.07, 0.14, 0.03, 0.09] },
  { id: 'uniform2', label: '另一组均匀', detail: '[0.55,0.12,0.88,0.31,0.67,0.04,0.79,0.26]', values: [0.55, 0.12, 0.88, 0.31, 0.67, 0.04, 0.79, 0.26] },
  { id: 'equals', label: '含相等值', detail: '[0.30,0.30,0.55,0.10,0.80,0.30,0.65,0.20] 查稳定', values: [0.3, 0.3, 0.55, 0.1, 0.8, 0.3, 0.65, 0.2] },
]

const bucketCode = [
  { code: 'BUCKET-SORT(A)', note: 'n = A.length；先备好 n 个空桶' },
  { code: '  for j = 1 to n', note: '分布阶段：逐个入桶' },
  { code: '    把 A[j] 放入桶 ⌊n·A[j]⌋', note: '桶号由数值直接算出，不做比较' },
  { code: '  for i = 0 to n - 1', note: '整理阶段：逐桶收拾' },
  { code: '    insertion-sort(bucket[i])', note: '均匀假设下每桶期望 O(1) 个元素' },
  { code: '  依序串接 bucket[0..n-1]', note: '桶号递增 ⇒ 直接首尾相接，零比较' },
]

const label = tokenLabel
const bucketOf = (value: number) => Math.min(N_BUCKETS - 1, Math.floor(N_BUCKETS * value))
const rangeOf = (b: number) => `[${(b / N_BUCKETS).toFixed(3)}, ${((b + 1) / N_BUCKETS).toFixed(3)})`

function inputCells(tokens: readonly Tok[], focus: number, mutedFrom: number): SceneCell[] {
  return tokens.map((token, index) => ({
    id: `t${token.seed}`,
    label: label(token),
    caption: index === focus ? `→ 桶 ${bucketOf(token.value)}` : `桶${bucketOf(token.value)}`,
    tone: index === focus ? 'focus' : index >= mutedFrom ? 'muted' : 'default',
  }))
}

function bucketWorkCells(work: readonly Tok[], sortedCount: number, held: Tok | null, hole: number, focus: number): SceneCell[] {
  return work.map((token, index) => {
    if (held && index === hole) return { id: 'hole', label: label(held), caption: '暂存', tone: 'key' }
    return {
      id: `t${token.seed}`,
      label: label(token),
      tone: index === focus ? 'focus' : index < sortedCount ? 'sorted' : 'default',
    }
  })
}

function outputCells(entries: readonly { token: Tok; b: number }[]): SceneCell[] {
  return entries.map((entry, index) => ({
    id: `b${index}`,
    label: label(entry.token),
    caption: `来自桶 ${entry.b}`,
    tone: 'sorted',
  }))
}

function* runBucketSort(values: readonly number[]): Generator<TraceEvent> {
  const tokens = tokenize(values)
  const n = tokens.length
  const buckets: Tok[][] = Array.from({ length: N_BUCKETS }, () => [])
  let distributed = 0
  let cmps = 0
  let outputCount = 0
  const metrics = (): MetricItem[] => [
    { label: '桶内比较', value: cmps, tone: 'orange' },
    { label: '已分桶', value: `${distributed} / ${n}`, tone: 'blue' },
    { label: '非空桶', value: buckets.filter(group => group.length > 0).length, tone: 'purple' },
    { label: '已输出', value: `${outputCount} / ${n}`, tone: 'green' },
  ]

  yield { t: 'scene', scene: arrayScene('input', 'A · 输入数组（caption 标桶号）', inputCells(tokens, -1, -1), { indexes: true }) }
  yield {
    t: 'scene',
    scene: {
      kind: 'buckets',
      id: 'buckets',
      label: '8 个桶：桶 i 收容 [i/8, (i+1)/8) 的值',
      buckets: buckets.map((group, b) => ({ id: `bkt${b}`, label: `桶 ${b}`, range: rangeOf(b), cells: group.map(token => ({ id: `t${token.seed}`, label: label(token) })) })),
    },
  }
  yield { t: 'scene', scene: arrayScene('output', 'B · 输出数组', Array.from({ length: n }, (_, index) => ({ id: `b${index}`, label: '·', caption: '空位', tone: 'muted' })), { indexes: true }) }
  yield { t: 'metrics', metrics: metrics() }
  yield { t: 'legend', legend: [{ tone: 'focus', label: '正在分桶 / 正在比较' }, { tone: 'key', label: '桶内暂存的 key' }, { tone: 'sorted', label: '桶内有序 / 已输出' }, { tone: 'muted', label: '空位 / 已入桶' }] }
  yield {
    t: 'message',
    step: {
      title: '先立假设：n 个值均匀落在 [0,1)',
      tab: '假设',
      formula: String.raw`b(v)=\lfloor n\cdot v\rfloor=\lfloor ${N_BUCKETS}\times ${tokens[0].value}\rfloor=${bucketOf(tokens[0].value)}`,
      formulaHint: `共 ${N_BUCKETS} 个桶：桶 i 收容 ${rangeOf(0)}、${rangeOf(1)}… 的值，区间不重叠。`,
      equation: String.raw`\text{桶号}=\lfloor n\cdot v\rfloor:\ \text{数值大小}\to\text{桶号}\to\text{全局名次}`,
      invariant: '桶 i 与桶 i+1 的区间不重叠：桶号递增 ⇒ 跨桶的先后已经由桶号给出。',
      note: '桶排序赌的是"均匀"：n 个数撒进 n 个桶，期望每桶 O(1) 个。这个假设撑起后面全部复杂度——也是它唯一的软肋。',
      conclusion: '把第一个值按桶号放进桶里。',
      pseudocode: { lines: bucketCode, active: [0] },
    },
  }
  yield { t: 'step' }

  // 分布阶段：逐个入桶（零比较）
  for (let j = 0; j < n; j += 1) {
    const token = tokens[j]
    const b = bucketOf(token.value)
    buckets[b].push(token)
    distributed = j + 1
    yield { t: 'cells', scene: 'input', cells: inputCells(tokens, j, j + 1) }
    yield { t: 'bucket', scene: 'buckets', bucket: `bkt${b}`, cells: buckets[b].map(item => ({ id: `t${item.seed}`, label: label(item) })) }
    yield { t: 'metrics', metrics: metrics() }
    yield {
      t: 'message',
      step: {
        title: `A[${j + 1}]=${label(token)} → 桶 ${b}`,
        tab: `分桶 ${label(token)}`,
        formula: String.raw`b(${token.value})=\lfloor ${N_BUCKETS}\times ${token.value}\rfloor=${b}`,
        formulaHint: `桶 ${b} 的区间是 ${rangeOf(b)}——数值落进哪个区间，就进哪个桶。`,
        equation: String.raw`\text{分桶不比较：桶号由数值直接算出}`,
        invariant: '桶 i 只收容 [i/8,(i+1)/8) 的值；桶号递增 ⇒ 全局顺序由桶号给出。',
        note: j === 0
          ? '整个过程没有任何元素间比较——和计数排序一样，"位置"是算出来的。'
          : token.tag
            ? `${label(token)} 与同值兄弟进同一个桶：桶内先后 = 进桶先后，后面交给插入排序收拾。`
            : '桶内按进桶顺序排列，乱序留给桶内插入排序。',
        conclusion: j === n - 1 ? '分完了：桶号已给出全局顺序，桶内还乱着。' : '继续分下一个。',
        moves: { kind: 'one-way', title: `${label(token)} 按桶号入桶`, moves: [{ token: label(token), from: `A[${j + 1}]`, to: `桶 ${b}` }], verdict: `b(v)=⌊8×${token.value}⌋=${b}：数值映射到区间，不需要比较。` },
        prediction: j === 0
          ? { prompt: '0.42 会进哪个桶？', options: ['桶 3：⌊8×0.42⌋=⌊3.36⌋', '桶 4：0.42 约等于一半', '桶 42：直接乘 100'], answer: 0, explanation: '桶号公式 b(v)=⌊n·v⌋：⌊8×0.42⌋=⌊3.36⌋=3，落进区间 [0.375, 0.5) 的桶。数值大小直接映射到区间编号。' }
          : undefined,
        pseudocode: { lines: bucketCode, active: [1, 2] },
      },
    }
    yield { t: 'step' }
  }

  // 整理阶段：桶内插入排序（唯一付"比较费"的地方）
  const maxBucketSize = Math.max(...buckets.map(group => group.length), 0)
  yield { t: 'metrics', metrics: metrics() }
  yield {
    t: 'message',
    step: {
      title: `桶内插入排序：最大桶 ${maxBucketSize} 个元素`,
      tab: '桶内',
      formula: String.raw`\text{非空桶 }${buckets.filter(group => group.length > 0).length}\text{ 个，}\max_i n_i=${maxBucketSize}`,
      formulaHint: maxBucketSize > 1 ? '超过 1 个元素的桶才需要整理；其余桶天然有序。' : '每个桶至多 1 个元素——均匀假设兑现，零桶内比较。',
      equation: String.raw`E\left[\sum_i n_i^2\right]=n\left(2-\tfrac{1}{n}\right)=O(n)`,
      invariant: '桶内元素不会跑出桶：插入排序只在桶内调整次序。',
      note: '为什么用插入排序？均匀假设下每桶期望 O(1) 个元素，插入排序的小常数最划算、零开销起步；只有分布退化（全落一桶）时它才暴露 Θ(n²)。',
      conclusion: maxBucketSize > 1 ? '对超过 1 个元素的桶逐个整理，比较都发生在桶内。' : '直接进入串接。',
      pseudocode: { lines: bucketCode, active: [3, 4] },
    },
  }
  yield { t: 'step' }

  for (let b = 0; b < N_BUCKETS; b += 1) {
    const group = buckets[b]
    if (group.length < 2) continue
    // 直接在桶数组上原地插入排序：串接阶段读到的是排好序的桶
    const work = group
    const groupSortedCount = { value: 1 }
    for (let j = 1; j < work.length; j += 1) {
      const key = work[j]
      let hole = j
      let settled = false
      while (hole > 0) {
        const left = work[hole - 1]
        cmps += 1
        if (left.value > key.value) {
          work[hole] = left
          hole -= 1
          yield { t: 'bucket', scene: 'buckets', bucket: `bkt${b}`, cells: bucketWorkCells(work, groupSortedCount.value, key, hole, hole + 1) }
          yield { t: 'metrics', metrics: metrics() }
          yield {
            t: 'message',
            step: {
              title: `桶 ${b} 内：${label(left)} > key=${label(key)}，${label(left)} 右移`,
              tab: '右移',
              formula: String.raw`${label(left)} > \text{key}=${label(key)} \Rightarrow \text{右移}`,
              formulaHint: `这是桶 ${b} 的第 ${j} 个插入中的比较；桶内累计 ${cmps} 次。`,
              equation: String.raw`\text{桶内比较累计 }${cmps}\text{ 次（出不了桶）}`,
              invariant: 'key 暂存在洞里；桶内已整理前缀仍然有序。',
              note: '和插入排序完全一样：比较发生在桶内，两个元素都出不了自己的桶。',
              conclusion: '继续与桶内左邻比较。',
              moves: { kind: 'one-way', title: `${label(left)} 给 key 让位`, moves: [{ token: label(left), from: `第 ${hole} 位`, to: `第 ${hole + 1} 位` }], verdict: `${label(left)} > key=${label(key)}，key 要插在它左边。` },
              judge: { title: `桶 ${b} 内比较`, entries: [{ left: label(left), op: '>', right: `key=${label(key)}`, holds: true, action: `${label(left)} 右移一格` }] },
              pseudocode: { lines: bucketCode, active: [4] },
            },
          }
          yield { t: 'step' }
        } else {
          work[hole] = key
          groupSortedCount.value = j + 1
          settled = true
          const equal = left.value === key.value
          const dupGroup = work.filter(item => item.value === key.value && item.tag).map(label)
          yield { t: 'bucket', scene: 'buckets', bucket: `bkt${b}`, cells: bucketWorkCells(work, groupSortedCount.value, null, -1, -1) }
          yield { t: 'metrics', metrics: metrics() }
          yield {
            t: 'message',
            step: {
              title: `桶 ${b} 内：${label(left)} ≤ key=${label(key)}，key 落到第 ${hole + 1} 位`,
              tab: `落位 ${label(key)}`,
              formula: String.raw`${label(left)} \le \text{key}=${label(key)} \Rightarrow \text{key 放进第 }${hole + 1}\text{ 位}`,
              formulaHint: `桶 ${b} 的有序前缀扩大到 ${groupSortedCount.value} 个元素。`,
              equation: String.raw`\text{桶内比较累计 }${cmps}\text{ 次}`,
              invariant: '桶内有序前缀扩大一格；相等键不互相跨越。',
              note: equal
                ? `${label(left)} 与 key 相等：严格大于才右移，key 落在它右边——身份顺序保持，这就是桶内稳定的关键。`
                : '不比 key 大就停止右移：让位停止的位置就是 key 的家。',
              conclusion: '桶内前缀又大了一格。',
              moves: { kind: 'one-way', title: `${label(key)} 落位`, moves: [{ token: label(key), from: '暂存', to: `第 ${hole + 1} 位` }], verdict: `${label(left)} ≤ key=${label(key)}，右移停止。` },
              judge: { title: `桶 ${b} 内比较`, entries: [{ left: label(left), op: '≤', right: `key=${label(key)}`, holds: false, action: '停止右移，key 落位' }] },
              stability: equal && dupGroup.length > 1
                ? { statement: `值 ${key.value} 的身份组按进桶顺序落位：${dupGroup.join(' → ')}——桶内插入排序用"严格大于"判断，相等键不跨越。`, before: dupGroup, after: dupGroup, stable: true, note: '若桶内换成会跨越相等键的排序，整体稳定性就丢了。' }
                : undefined,
              pseudocode: { lines: bucketCode, active: [4] },
            },
          }
          yield { t: 'step' }
          break
        }
      }
      if (!settled) {
        work[hole] = key
        groupSortedCount.value = j + 1
        yield { t: 'bucket', scene: 'buckets', bucket: `bkt${b}`, cells: bucketWorkCells(work, groupSortedCount.value, null, -1, -1) }
        yield { t: 'metrics', metrics: metrics() }
        yield {
          t: 'message',
          step: {
            title: `key=${label(key)} 是桶 ${b} 内最小，落到第 1 位`,
            tab: `落位 ${label(key)}`,
            formula: String.raw`\text{key}=${label(key)}\text{ 一路最小} \Rightarrow \text{落到桶首}`,
            formulaHint: `桶 ${b} 的有序前缀扩大到 ${groupSortedCount.value} 个元素。`,
            equation: String.raw`\text{桶内比较累计 }${cmps}\text{ 次}`,
            invariant: '桶内有序前缀扩大一格。',
            note: '把左邻都比了一遍还到桶首：key 就是这个桶当前最小的元素。',
            conclusion: '桶内前缀又大了一格。',
            moves: { kind: 'one-way', title: `${label(key)} 落到桶首`, moves: [{ token: label(key), from: '暂存', to: '第 1 位' }], verdict: '没有更小的左邻，key 就是桶内最小。' },
            pseudocode: { lines: bucketCode, active: [4] },
          },
        }
        yield { t: 'step' }
      }
    }
  }

  // 串接阶段：桶 0..7 依序接回
  let acc = 0
  const outputEntries: { token: Tok; b: number }[] = []
  const concatMoves = buckets.flatMap((group, b) => {
    const start = acc
    acc += group.length
    group.forEach(token => outputEntries.push({ token, b }))
    return group.length > 0 ? [{ token: `[${group.map(label).join(', ')}]`, from: `桶 ${b}`, to: start + 1 === acc ? `B[${acc}]` : `B[${start + 1}..${acc}]` }] : []
  })
  outputCount = n
  yield { t: 'cells', scene: 'output', cells: outputCells(outputEntries) }
  yield { t: 'metrics', metrics: metrics() }
  yield {
    t: 'message',
    step: {
      title: '依序串接：桶 0 → 桶 7',
      tab: '串接',
      formula: String.raw`B=\text{桶}0\,\|\,\text{桶}1\,\|\cdots\|\,\text{桶}7`,
      formulaHint: '每个桶的输出区间由前面桶的大小累加得到——相邻桶之间不需要任何比较。',
      equation: String.raw`\text{输出写入 }${n}\text{ 次，桶间比较 }0\text{ 次}`,
      invariant: '桶内有序 + 桶号递增 ⇒ 串接结果全局有序。',
      note: '桶 i 的所有值都小于桶 i+1 的所有值（区间不重叠）——桶号就是全局名次，串接是零比较的。',
      conclusion: 'B 就是排好序的输入。',
      moves: { kind: 'one-way', title: '按桶号接回输出', moves: concatMoves, verdict: '桶间无需比较：桶号递增给出全局顺序。' },
      prediction: { prompt: '串接桶的时候，桶与桶之间还需要再比较吗？', options: ['不需要：桶号已经给出全局顺序', '需要：相邻桶还要比一次', '只需要比第一个桶'], answer: 0, explanation: '桶 i 收容 [i/8,(i+1)/8)，区间不重叠且递增——桶号递增就是全局顺序，串接零比较。' },
      pseudocode: { lines: bucketCode, active: [5] },
    },
  }
  yield { t: 'step' }

  // 完成 + 复杂度
  const dupValue = tokens.find(token => token.tag)?.value
  const beforeOrder = dupValue === undefined ? [] : tokens.filter(token => token.value === dupValue).map(label)
  const afterOrder = dupValue === undefined ? [] : buckets.flatMap(group => group.filter(token => token.value === dupValue)).sort((a, b2) => a.value - b2.value).map(label)
  yield { t: 'cells', scene: 'input', cells: inputCells(tokens, -1, 0) }
  yield { t: 'metrics', metrics: metrics() }
  yield {
    t: 'message',
    step: {
      title: `完成：${cmps} 次桶内比较，分桶与串接零比较`,
      tab: '完成',
      formula: String.raw`\text{本次：分桶 }${n}+\text{桶内比较 }${cmps}+\text{串接 }${n}`,
      formulaHint: '比较只发生在桶内——桶的个数与桶号公式决定了"桶内还剩多少事"。',
      equation: String.raw`\text{均匀 }O(n)\quad\text{全落一桶 }\Theta(n^2)`,
      invariant: '桶间保序 + 桶内插入排序稳定 ⇒ 整体稳定（条件：桶内排序必须稳定）。',
      note: 'best Θ(n+k)：均匀散开、每桶 O(1)；average Θ(n)：均匀假设的期望 E[Σnᵢ²]=n(2−1/n)；worst Θ(n²)：全部挤进一个桶，退化为一次插入排序。稳定性是"条件稳定"：桶内用稳定插入排序则稳定。',
      conclusion: '把宝押在分布上：输入越均匀，桶排序越接近线性——这是它和比较排序最大的分工差异。',
      stability: beforeOrder.length > 1
        ? { title: '稳定性证据：输出里的身份顺序', statement: `输入 ${beforeOrder.join(' → ')}，输出 ${afterOrder.join(' → ')}——桶间保序，桶内插入排序不让相等键跨越。`, before: beforeOrder, after: afterOrder, stable: true, note: '桶内排序换成会跨越相等键的算法，这一条就不成立了。' }
        : undefined,
      pseudocode: { lines: bucketCode, active: [] },
    },
  }
  yield { t: 'step' }
}

export const buildBucketTrace = (example: SortExample): Trace => recordTrace('SANDBOX 09 · BUCKET SORT', '把 [0,1) 的值按桶号撒进 n 个桶：桶间天然有序、桶内插入排序兜底——期望线性，退化平方。', runBucketSort(example.values))

const bucketInsight: DesignInsight = {
  observation: '桶排序的全部赌注是均匀假设：n 个数撒进 n 个桶，期望每桶 O(1) 个——桶号给出全局顺序，桶内只剩常数工作。',
  contrasts: [
    { alternative: '计数排序', whyNot: '同样利用值域结构且严格线性、稳定，但要求键是 0..k 的整数；桶排序接受连续实数，把"计数格"换成"区间桶"，代价是分布偏斜时退到 Θ(n²)。' },
    { alternative: '桶内改用归并排序', whyNot: '最坏能压到 Θ(n log n)，但每个桶都要付合并与辅助空间的开销——均匀情形每桶 O(1) 个元素，插入排序反而零浪费。' },
  ],
  transfer: { prompt: '输入全挤在 [0.80,0.90)，还是 8 个桶，会发生什么？怎么救？', options: ['全落进桶 6/7 退化成插入排序；按 min/max 缩放桶号即可摊开', '仍然均匀，不会有事', '把桶数减到 2 个反而更好'], answer: 0, explanation: 'b(v)=⌊8v⌋ 对 [0.80,0.90) 只会给出 6 或 7——一个桶装下所有元素就是 Θ(n²)。改用 b(v)=⌊8·(v−min)/(max−min)⌋ 把挤在一起的值重新摊开。' },
}

const bucketComplexity: ComplexityProfileData = {
  title: '桶排序：复杂度押在输入分布上',
  subtitle: 'CLRS BUCKET-SORT：n 个均匀桶 + 桶内插入排序 + 依序串接。',
  cases: [
    { label: '最好', complexity: 'Θ(n+k)', condition: '数据均匀散开：每桶 O(1) 个元素，桶内几乎不用比较。', example: '[0.42,0.01,0.73,0.24,0.95,0.36,0.60,0.08]', explanation: '分桶 Θ(n) + 串接 Θ(k)，桶内只剩常数工作。', tone: 'best' },
    { label: '平均', complexity: 'Θ(n)', condition: '（期望）输入独立同均匀分布 U[0,1)。', example: '[0.55,0.12,0.88,0.31,0.67,0.04,0.79,0.26]', explanation: 'E[Σnᵢ²] = n(2−1/n) = O(n)：均匀假设把桶内平方项压成线性。', tone: 'average' },
    { label: '最差', complexity: 'Θ(n²)', condition: '分布严重偏斜：全部元素落进同一个桶。', example: '[0.05,0.11,0.02,0.19,0.07,0.14,0.03,0.09]（6/8 挤进桶 0）', explanation: '桶内插入排序面对 n 个元素就是 Θ(n²)。', tone: 'worst' },
  ],
  footer: '桶号公式是可替换零件：按 min/max 缩放、按分位数分桶都能对冲偏斜输入；稳定性则完全由桶内排序决定。',
  stability: { status: 'conditional', label: '条件稳定', statement: '桶间按桶号天然保序；整体稳定性 = 桶内排序的稳定性。本实现用"严格大于才右移"的插入排序，0.3A、0.3B、0.3C 不会互相跨越。', before: '0.3A → 0.3B', after: '0.3A → 0.3B' },
}

export function BucketSortLesson() {
  const [exampleId, setExampleId] = useState(bucketExamples[0].id)
  const example = bucketExamples.find(item => item.id === exampleId) ?? bucketExamples[0]
  const trace = buildBucketTrace(example)
  const playback = useLessonPlayback(trace.steps.length)
  return <LessonShell eyebrow={trace.eyebrow} title={trace.steps[playback.step].title} description={trace.description} steps={trace.steps.map(item => item.tab ?? '推演')} step={playback.step} onStepChange={playback.setStep} playing={playback.playing} onTogglePlaying={playback.togglePlaying} onReplay={playback.replay} speed={playback.speed} onCycleSpeed={playback.cycleSpeed} complexity={bucketComplexity} examplePicker={<ExamplePicker examples={bucketExamples} value={exampleId} onChange={id => { playback.reset(); setExampleId(id) }} />}>
    <TracePlayer trace={trace} step={playback.step} />
    <DesignNotes insight={bucketInsight} />
  </LessonShell>
}
