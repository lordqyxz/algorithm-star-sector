import { useState } from 'react'
import { DesignNotes, type DesignInsight } from '@/components/DesignNotes'
import { ExamplePicker, type ExampleOption } from '@/components/ExamplePicker'
import { LessonShell } from '@/components/LessonShell'
import type { ComplexityProfileData } from '@/components/ComplexityProfile'
import type { MetricItem } from '@/components/CalcDesk'
import { TracePlayer } from '@/engine/TracePlayer'
import { arrayScene, recordTrace, tokenLabel, tokenize, type TraceEvent } from '@/engine/events'
import type { JudgeEntry, SceneCell, Tone, Trace, TraceStep, TreeScene } from '@/engine/trace'
import { useLessonPlayback } from '@/hooks/useLessonPlayback'

/** 演示数据与算法分离：本文件 = 数据集 + 原地堆排序生成器（产出 Trace）+ 播放器装配。 */

type Tok = { value: number; tag?: string; seed: number }
type HeapExample = ExampleOption & { values: number[] }

const heapExamples: readonly HeapExample[] = [
  { id: 'mixed', label: '课堂混合序列', detail: '[4,10,3,5,1]', values: [4, 10, 3, 5, 1] },
  { id: 'heap', label: '已经是大根堆', detail: '[10,5,3,4,1]', values: [10, 5, 3, 4, 1] },
  { id: 'ascending', label: '接近最忙的升序', detail: '[1,2,3,4,5]', values: [1, 2, 3, 4, 5] },
  { id: 'duplicates', label: '重复键·查身份', detail: '[4,1,4,3,2]', values: [4, 1, 4, 3, 2] },
]

const heapCode = [
  { code: 'l = 2i+1,  r = 2i+2', note: '数组下标直接给出父子关系' },
  { code: 'largest = i' },
  { code: 'if A[l] > A[largest]: largest = l' },
  { code: 'if A[r] > A[largest]: largest = r' },
  { code: 'if largest ≠ i', note: '移动依据：最大的是否还不是父节点' },
  { code: '  exchange A[i] ↔ A[largest]' },
  { code: '  siftDown(largest)', note: '只沿一条高度 log n 的路径继续' },
]

/** 完全二叉树视图：0 起下标按层展开，null 表示该层空位。 */
function heapTreeScene(heap: readonly Tok[], toneFor: (index: number) => Tone): TreeScene {
  const levels: (SceneCell | null)[][] = []
  let level = 0
  while ((1 << level) - 1 < heap.length) {
    const start = (1 << level) - 1
    levels.push(Array.from({ length: 1 << level }, (_, slot) => {
      const index = start + slot
      return index < heap.length ? { id: `n${heap[index].seed}`, label: tokenLabel(heap[index]), tone: toneFor(index) } : null
    }))
    level += 1
  }
  return { kind: 'tree', id: 'heapTree', label: '堆排序完全二叉树', levels }
}

type StopInfo = { index: number; largest: number; leaf: boolean; entries: JudgeEntry[] }
type SwapInfo = { index: number; largest: number; mover: Tok; winner: Tok; entries: JudgeEntry[] }
type StepDraft = Omit<TraceStep, 'scenes' | 'metrics' | 'legend'>

function* runHeapSort(values: readonly number[]): Generator<TraceEvent> {
  const tokens = tokenize(values)
  const n = tokens.length
  const heap = tokens.slice()
  const originalRootValue = values[0]
  let compares = 0
  let sortedCount = 0

  const metrics = (heapSize: number): MetricItem[] => [
    { label: '未排序区间', value: heapSize },
    { label: '已固定最大值', value: sortedCount, tone: 'green' },
    { label: '累计比较', value: compares, tone: 'orange' },
  ]
  function* sync(heapSize: number, marks: Record<number, Tone>): Generator<TraceEvent> {
    const toneFor = (index: number): Tone => marks[index] ?? (index >= heapSize ? 'sorted' : 'default')
    yield { t: 'scene', scene: heapTreeScene(heap, toneFor) }
    yield { t: 'scene', scene: arrayScene('heapArr', '堆排序数组状态', heap.map((token, index) => ({ id: `a${token.seed}`, label: tokenLabel(token), tone: toneFor(index) })), { indexes: true }) }
  }
  const heapStability = { statement: '交换根和末尾时，同值元素可能换位；重复键数据集里能看到两个 4 的身份顺序被改变。', before: ['4A', '4B'], after: ['4B', '4A'], stable: false }

  /** 真实 siftDown：每轮先比较（计入 compares），产生交换则成拍（kind down），停止时由 stopStep 封拍。 */
  function* siftDown(start: number, heapSize: number, stopStep: (info: StopInfo) => StepDraft, swapStep: (info: SwapInfo) => StepDraft): Generator<TraceEvent> {
    let index = start
    for (;;) {
      const left = index * 2 + 1
      const right = left + 1
      let largest = index
      const entries: JudgeEntry[] = []
      if (left < heapSize) {
        compares += 1
        const leftIsLarger = heap[left].value > heap[index].value
        if (leftIsLarger) largest = left
        entries.push({ left: `左孩 A[${left + 1}]=${tokenLabel(heap[left])}`, op: '>', right: `A[${index + 1}]=${tokenLabel(heap[index])}`, holds: leftIsLarger, action: leftIsLarger ? '左孩更大，暂记为最大' : '左孩不更大，最大仍是父节点' })
      }
      if (right < heapSize) {
        compares += 1
        const target = largest
        const rightIsLarger = heap[right].value > heap[target].value
        if (rightIsLarger) largest = right
        entries.push({ left: `右孩 A[${right + 1}]=${tokenLabel(heap[right])}`, op: '>', right: `A[${target + 1}]=${tokenLabel(heap[target])}`, holds: rightIsLarger, action: rightIsLarger ? '右孩更大，记为最大' : '右孩不更大' })
      }
      if (largest === index) {
        const leaf = left >= heapSize
        const marks: Record<number, Tone> = { [index]: 'key' }
        if (left < heapSize) marks[left] = 'target'
        if (right < heapSize) marks[right] = 'target'
        yield* sync(heapSize, marks)
        yield { t: 'metrics', metrics: metrics(heapSize) }
        yield { t: 'message', step: stopStep({ index, largest, leaf, entries }) }
        yield { t: 'step' }
        return
      }
      const mover = heap[index]
      const winner = heap[largest]
      ;[heap[index], heap[largest]] = [heap[largest], heap[index]]
      yield* sync(heapSize, { [index]: 'key', [largest]: 'target' })
      yield { t: 'metrics', metrics: metrics(heapSize) }
      yield { t: 'message', step: swapStep({ index, largest, mover, winner, entries }) }
      yield { t: 'step' }
      index = largest
    }
  }

  // ── 拍① 看数组：整组数字被看成完全二叉树（原拍保留）──
  const allMarks: Record<number, Tone> = {}
  tokens.forEach((_, index) => { allMarks[index] = 'target' })
  yield* sync(n, allMarks)
  yield { t: 'metrics', metrics: metrics(n) }
  yield { t: 'legend', legend: [{ tone: 'focus', label: '堆化路径' }, { tone: 'key', label: '正在交换 / 下沉的元素' }, { tone: 'sorted', label: '有序后缀' }] }
  yield { t: 'message', step: {
    title: '先看数组：最大值还没有浮到顶端',
    tab: '看数组',
    formula: String.raw`\text{目标：构造大根堆}`,
    equation: String.raw`\text{父节点}\ge\text{子节点}`,
    invariant: '完全二叉树的形状不变：下标 i 的孩子永远是 2i+1 和 2i+2。',
    note: '数组下标 i 的孩子是 2i+1 和 2i+2；先把它看成一棵完全二叉树。',
    conclusion: '下一步从最后一个非叶节点开始向上修复。',
    pseudocode: { lines: heapCode, active: [0] },
  } }
  yield { t: 'step' }

  // ── 建堆：自底向上，每个非叶节点真实 siftDown ──
  for (let node = Math.floor(n / 2) - 1; node >= 0; node -= 1) {
    const isRoot = node === 0
    yield* siftDown(node, n,
      ({ index, leaf, entries }) => {
        if (isRoot) {
          const builtRoot = heap[0].value
          return {
            title: `自底向上建堆：${originalRootValue} 找到自己的位置`,
            tab: '建堆',
            formula: String.raw`\text{局部修复：}${builtRoot}\ge ${heap.slice(1, 3).map(token => token.value).join(', ')}`,
            equation: String.raw`\operatorname{siftDown}(0):${originalRootValue}\to ${builtRoot}`,
            invariant: '每修复一个节点，以它为根的子树就永远保持堆序。',
            note: '每次只把一个节点向下交换到合适位置；已经修好的子树继续保持堆序。',
            conclusion: `现在根节点 ${builtRoot} 是当前未排序区间的最大值。`,
            moves: { kind: 'down', title: '堆化：节点沿比较路径下沉', moves: [{ token: String(originalRootValue), from: '原根', to: '下沉' }, { token: String(builtRoot), from: '胜出者', to: '新根' }], verdict: '父节点必须 ≥ 子节点，谁大谁当根。', note: '箭头表示同一个位置上的数字经过比较与交换，直到父节点 ≥ 子节点。' },
            judge: entries.length > 0 ? { entries } : undefined,
            pseudocode: { lines: heapCode, active: [1, 2, 3, 4, 5] },
            prediction: { prompt: '把数组建成大根堆后，当前最大值应该出现在哪里？', options: ['根节点', '数组最后一个位置', '中间某个叶子'], answer: 0, explanation: '堆序保证父节点不小于孩子，所以全局最大值一定在根；这正是下一轮可以直接取走它的原因。' },
          }
        }
        return {
          title: leaf ? `自底向上：A[${index + 1}] 已是叶子，无需下沉` : `自底向上：A[${index + 1}]=${tokenLabel(heap[index])} 已不小于孩子，无需下沉`,
          tab: '建堆',
          formula: leaf
            ? String.raw`\text{A}[${index + 1}]\text{ 无孩子：天然满足堆序}`
            : String.raw`\text{A}[${index + 1}]=${heap[index].value}\ge \text{较大孩子}\Rightarrow\text{无需下沉}`,
          equation: String.raw`\text{siftDown}(${index})\text{ 立即结束}`,
          invariant: '每修复一个节点，以它为根的子树就永远保持堆序。',
          note: '只沿一条路径检查：孩子不比父节点大，这里就已经是堆。',
          conclusion: '继续修复前一个非叶节点。',
          judge: entries.length > 0 ? { entries } : undefined,
          pseudocode: { lines: heapCode, active: [1, 2, 3, 4] },
        }
      },
      ({ index, largest, mover, winner, entries }) => ({
        title: `下沉：A[${index + 1}]=${tokenLabel(mover)} < 较大孩子 A[${largest + 1}]=${tokenLabel(winner)}，交换`,
        tab: '建堆',
        formula: String.raw`\text{A}[${index + 1}]=${mover.value}<\text{较大孩子 A}[${largest + 1}]=${winner.value}\Rightarrow\text{交换下沉}`,
        equation: String.raw`\text{exchange A}[${index + 1}]\leftrightarrow \text{A}[${largest + 1}]`,
        invariant: '每修复一个节点，以它为根的子树就永远保持堆序。',
        note: '父节点必须 ≥ 子节点：与较大的孩子交换后，原父节点继续向下找位置。',
        conclusion: largest * 2 + 1 < n ? '继续与新的孩子比较。' : '已到达叶子：这个节点找到了自己的位置。',
        moves: { kind: 'down', title: `${tokenLabel(mover)} 沿较大孩子方向下沉一层`, moves: [{ token: tokenLabel(mover), from: `A[${index + 1}]`, to: `A[${largest + 1}]` }, { token: tokenLabel(winner), from: `A[${largest + 1}]`, to: `A[${index + 1}]` }], verdict: '父节点必须 ≥ 子节点，谁大谁当根。' },
        judge: { entries },
        pseudocode: { lines: heapCode, active: [1, 2, 3, 4, 5] },
      }))
  }

  // ── 排序：每轮根交付到有序后缀（kind swap），再真实堆化（kind down）──
  const firstMax = heap[0]
  for (let end = n - 1; end >= 1; end -= 1) {
    const isFirst = end === n - 1
    const heapSize = end
    const maxTok = heap[0]
    const tailTok = heap[end]
    ;[heap[0], heap[end]] = [heap[end], heap[0]]
    sortedCount = n - end
    yield* sync(heapSize, { 0: 'key' })
    yield { t: 'metrics', metrics: metrics(heapSize) }
    yield { t: 'message', step: isFirst ? {
      title: '交换根和末尾：把最大值固定',
      tab: '取最大值',
      formula: String.raw`\text{最大值 }${maxTok.value}\text{进入有序后缀}`,
      equation: String.raw`A[0]\leftrightarrow A[${n - 1}]`,
      invariant: '有序后缀里的元素不再参与比较，也不会再被移动。',
      note: '根节点是最大值，所以把它放到数组末尾；未排序区间缩短一个。',
      conclusion: '交换破坏了根部堆序，下一步只需重新修复未排序部分。',
      moves: { kind: 'swap', title: '交换：最大值从根流向有序后缀', moves: [{ token: tokenLabel(maxTok), from: 'A[0]', to: `A[${n - 1}]` }, { token: tokenLabel(tailTok), from: `A[${n - 1}]`, to: 'A[0]' }], verdict: '根是未排序区间的最大值，末尾是唯一可以和它交换的原地空位。', note: `交换后：A[0] = ${heap[0].value}，A[${n - 1}] = ${maxTok.value}；绿色区域已经不再参与堆化。` },
      stability: heapStability,
      pseudocode: { lines: heapCode, active: [5] },
    } : {
      title: `交换根和末尾：固定第 ${sortedCount} 个最大值`,
      tab: `取最大值·${sortedCount}`,
      formula: String.raw`\text{最大值 }${maxTok.value}\text{进入有序后缀}`,
      equation: String.raw`A[0]\leftrightarrow A[${end}]`,
      invariant: '有序后缀里的元素不再参与比较，也不会再被移动。',
      note: '重复“取根、交换、堆化”，有序后缀会逐步变长。',
      conclusion: '交换破坏了根部堆序，下一步只需重新修复未排序部分。',
      moves: { kind: 'swap', title: `最大值 ${tokenLabel(maxTok)} 与末尾交换`, moves: [{ token: tokenLabel(maxTok), from: 'A[0]', to: `A[${end}]` }, { token: tokenLabel(tailTok), from: `A[${end}]`, to: 'A[0]' }], verdict: '根是未排序区间的最大值，末尾是唯一可以和它交换的原地空位。' },
      stability: heapStability,
      pseudocode: { lines: heapCode, active: [5] },
    } }
    yield { t: 'step' }

    const newRoot = heap[0]
    const comparesBeforeRound = compares
    yield* siftDown(0, heapSize,
      ({ index, leaf, entries }) => isFirst ? {
        title: '重新堆化：继续固定下一个最大值',
        tab: '再堆化',
        formula: String.raw`\text{未排序区间的根 }${heap[0].value}\text{重新满足堆序}`,
        equation: String.raw`\operatorname{heapify}(0,\ldots,${n - 2})`,
        invariant: `已经固定的 ${maxTok.value} 不参与比较；堆序只在未排序区间内维持。`,
        note: `每轮只修复从根开始的一条路径，已经固定的 ${maxTok.value} 不再参与比较。`,
        conclusion: '重复“取根、交换、堆化”，有序后缀会逐步变长。',
        moves: { kind: 'down', title: '重新堆化：新根向下，较大孩子向上', moves: [{ token: tokenLabel(newRoot), from: '交换后的新根', to: '沿路径下沉' }, { token: tokenLabel(heap[0]), from: '胜出者', to: '修复后的根' }], verdict: '只比较父子，谁大谁上移；新根太小就继续下沉。', note: '只沿一条高度为 log n 的路径移动，已经固定的后缀不再比较。' },
        judge: entries.length > 0 ? { entries } : undefined,
        stability: heapStability,
        pseudocode: { lines: heapCode, active: [6] },
      } : {
        title: leaf ? `下沉结束：A[${index + 1}]=${tokenLabel(heap[index])} 已是叶子` : `下沉结束：A[${index + 1}]=${tokenLabel(heap[index])} ≥ 较大孩子，堆序恢复`,
        tab: '再堆化',
        formula: leaf
          ? String.raw`\text{A}[${index + 1}]\text{ 无孩子：路径修复完成}`
          : String.raw`\text{A}[${index + 1}]=${heap[index].value}\ge \text{较大孩子}\Rightarrow\text{堆序恢复}`,
        equation: String.raw`\text{本轮堆化比较 }${compares - comparesBeforeRound}\text{ 次}`,
        invariant: `已经固定的 ${maxTok.value} 不参与比较；堆序只在未排序区间内维持。`,
        note: '只沿一条高度为 log n 的路径移动，已经固定的后缀不再比较。',
        conclusion: '继续：取根、交换、堆化。',
        judge: entries.length > 0 ? { entries } : undefined,
        pseudocode: { lines: heapCode, active: [6] },
      },
      ({ index, largest, mover, winner, entries }) => ({
        title: `下沉：A[${index + 1}]=${tokenLabel(mover)} < 较大孩子 A[${largest + 1}]=${tokenLabel(winner)}，交换`,
        tab: '再堆化',
        formula: String.raw`\text{A}[${index + 1}]=${mover.value}<\text{较大孩子 A}[${largest + 1}]=${winner.value}\Rightarrow\text{交换下沉}`,
        equation: String.raw`\text{exchange A}[${index + 1}]\leftrightarrow \text{A}[${largest + 1}]`,
        invariant: '只动一条路径：已经固定的后缀不参与，其余子树堆序毫发无损。',
        note: '与较大的孩子交换，父 ≥ 子才可能成立；原父节点继续向下找位置。',
        conclusion: '继续与新的孩子比较。',
        moves: { kind: 'down', title: `${tokenLabel(mover)} 沿较大孩子方向下沉一层`, moves: [{ token: tokenLabel(mover), from: `A[${index + 1}]`, to: `A[${largest + 1}]` }, { token: tokenLabel(winner), from: `A[${largest + 1}]`, to: `A[${index + 1}]` }], verdict: '谁大谁上移：较大孩子升位，新根下沉一层。' },
        judge: { entries },
        pseudocode: { lines: heapCode, active: [1, 2, 3, 4, 5] },
      }))
  }
  sortedCount = n

  // ── 末拍 完成（原拍保留）──
  const sortedValues = values.slice().sort((a, b) => a - b)
  yield* sync(0, {})
  yield { t: 'metrics', metrics: metrics(0) }
  yield { t: 'message', step: {
    title: '结束：有序后缀扩展成完整答案',
    tab: '完成',
    formula: `\\text{结果：}${sortedValues.join(' \\le ')}`,
    equation: String.raw`\text{建立堆 }O(n)+n\text{ 次堆化 }O(n\log n)`,
    invariant: '整组数字有序，且每一轮都拿走了当前剩余部分的最大值。',
    note: '每轮拿走一个最大值；堆高是 log n，重复 n 次得到 Θ(n log n)。',
    conclusion: '堆排序把"找最大值"变成了"维护根节点"，额外空间是 O(1)。',
    pseudocode: { lines: heapCode, active: [] },
    prediction: { prompt: `根节点 ${firstMax.value} 与末尾交换后，未排序区间还满足堆序吗？`, options: ['满足，交换不会影响堆', '不满足，需要从根重新堆化', '只有叶子节点需要重排'], answer: 1, explanation: '新根可能小于孩子，所以只需沿较大的孩子向下修复。' },
  } }
  yield { t: 'step' }
}

const buildHeapSortTrace = (example: HeapExample): Trace => recordTrace('SANDBOX 02 · HEAP SORT', '把数组看成完全二叉树：根节点负责交付当前最大值，堆化负责修复被交换破坏的局部关系；同值元素的身份也会被单独检查。', runHeapSort(example.values))

const heapSortInsight: DesignInsight = {
  observation: '"反复取最大值"这个朴素需求被改写成"维护堆序"：建一次堆 Θ(n)，之后每次取最大只修复一条对数长度的路径。',
  contrasts: [
    { alternative: '无序数组每次线性找最大', whyNot: '每次 Θ(n)、共 n 次合计 Θ(n²)；堆把"找"的成本摊到"维护"上，一次堆化只走一条路径。' },
    { alternative: '维护一个有序数组', whyNot: '取最大 O(1) 很快，但插入新元素要整体挪动 Θ(n)；堆让插入和取出都是 O(log n)。' },
  ],
  transfer: { prompt: '自底向上建堆是 Θ(n) 而不是 n·log n，为什么？', options: ['一半以上是叶子、根本不下沉，按高度加权求和收敛到 O(n)', '建堆不需要比较', '因为数组已经有序'], answer: 0, explanation: '一半节点是叶子（下沉 0 步），只有少数节点走全高；Σ(节点数×高度) 对 log n 收敛，总量仍是 O(n)。' },
}

const heapSortComplexity: ComplexityProfileData = {
  title: '堆排序：建堆快，但反复取最大值决定阶数',
  subtitle: '标准原地堆排序的建堆是 Θ(n)，后续 n 次取最大值和堆化把总时间推到 Θ(n log n)。',
  cases: [
    { label: '最好', complexity: 'Θ(n log n)', condition: '输入本来就是大根堆。', example: '[10,5,3,4,1]', explanation: '建堆几乎不动，但每次取根仍要维护剩余堆。', tone: 'best' },
    { label: '平均', complexity: 'Θ(n log n)', condition: '输入是随机排列。', example: '[4,10,3,5,1]', explanation: '每轮处理的堆高平均仍带来对数级堆化成本。', tone: 'average' },
    { label: '最差', complexity: 'Θ(n log n)', condition: '输入接近升序，建大根堆和后续交换都更忙。', example: '[1,2,3,4,5,6,7,8]', explanation: '常数可能变大，但提取 n 个元素的对数级路径仍存在。', tone: 'worst' },
  ],
  footer: '空间复杂度是 O(1)（不计输入数组）；堆排序的标准实现不是稳定排序。',
  stability: { status: 'unstable', label: '不稳定排序', statement: '根和末尾的原地交换可能跨过同值元素，让它们的身份顺序改变。', before: '4A → 4B', after: '4B → 4A' },
}

export function HeapSortLesson() {
  const [exampleId, setExampleId] = useState(heapExamples[0].id)
  const example = heapExamples.find(item => item.id === exampleId) ?? heapExamples[0]
  const trace = buildHeapSortTrace(example)
  const playback = useLessonPlayback(trace.steps.length)
  return <LessonShell eyebrow={trace.eyebrow} title={trace.steps[playback.step].title} description={trace.description} steps={trace.steps.map(item => item.tab ?? '推演')} step={playback.step} onStepChange={playback.setStep} playing={playback.playing} onTogglePlaying={playback.togglePlaying} onReplay={playback.replay} speed={playback.speed} onCycleSpeed={playback.cycleSpeed} complexity={heapSortComplexity} examplePicker={<ExamplePicker examples={heapExamples} value={exampleId} onChange={id => { playback.reset(); setExampleId(id) }} />}>
    <TracePlayer trace={trace} step={playback.step} />
    <DesignNotes insight={heapSortInsight} />
  </LessonShell>
}
