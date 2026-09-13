import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { animate, stagger } from 'animejs'
import { ArrayView, type DataCell } from '@/components/ArrayView'
import { CalcDesk } from '@/components/CalcDesk'
import { DesignNotes, type DesignInsight } from '@/components/DesignNotes'
import { ExamplePicker, type ExampleOption } from '@/components/ExamplePicker'
import { FormulaReadout, ConclusionBox } from '@/components/FormulaReadout'
import { LegendStrip } from '@/components/LegendStrip'
import { LessonShell } from '@/components/LessonShell'
import { MoveCallout } from '@/components/MoveCallout'
import { PredictionPrompt, type PredictionData } from '@/components/PredictionPrompt'
import { StabilityExample } from '@/components/StabilityExample'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ComplexityProfileData } from '@/components/ComplexityProfile'
import { useLessonPlayback } from '@/hooks/useLessonPlayback'
import { useStepScene } from '@/hooks/useStepScene'

type HeapStep = {
  title: string
  formula: string
  array: number[]
  sorted: number
  active: number[]
  equation: string
  invariant: string
  note: string
  conclusion: string
  prediction?: PredictionData
}

type HeapExample = ExampleOption & { values: number[] }

const heapExamples: readonly HeapExample[] = [
  { id: 'mixed', label: '课堂混合序列', detail: '[4,10,3,5,1]', values: [4, 10, 3, 5, 1] },
  { id: 'heap', label: '已经是大根堆', detail: '[10,5,3,4,1]', values: [10, 5, 3, 4, 1] },
  { id: 'ascending', label: '接近最忙的升序', detail: '[1,2,3,4,5]', values: [1, 2, 3, 4, 5] },
  { id: 'duplicates', label: '重复键·查身份', detail: '[4,1,4,3,2]', values: [4, 1, 4, 3, 2] },
]

function siftDown(array: number[], start: number, heapSize: number) {
  let index = start
  while (true) {
    const left = index * 2 + 1
    const right = left + 1
    let largest = index
    if (left < heapSize && array[left] > array[largest]) largest = left
    if (right < heapSize && array[right] > array[largest]) largest = right
    if (largest === index) return
    ;[array[index], array[largest]] = [array[largest], array[index]]
    index = largest
  }
}

const heapCode = [
  { code: 'l = 2i+1,  r = 2i+2', note: '数组下标直接给出父子关系' },
  { code: 'largest = i' },
  { code: 'if A[l] > A[largest]: largest = l' },
  { code: 'if A[r] > A[largest]: largest = r' },
  { code: 'if largest ≠ i', note: '移动依据：最大的是否还不是父节点' },
  { code: '  exchange A[i] ↔ A[largest]' },
  { code: '  siftDown(largest)', note: '只沿一条高度 log n 的路径继续' },
]

function buildHeapSteps(values: number[]): HeapStep[] {
  const n = values.length
  const allIndexes = values.map((_, index) => index)
  const heap = values.slice()
  for (let index = Math.floor(n / 2) - 1; index >= 0; index -= 1) siftDown(heap, index, n)
  const built = heap.slice()
  const extracted = built.slice()
  ;[extracted[0], extracted[n - 1]] = [extracted[n - 1], extracted[0]]
  const afterExtract = extracted.slice()
  const restored = extracted.slice()
  siftDown(restored, 0, n - 1)
  const afterHeapify = restored.slice()
  const sorted = values.slice().sort((a, b) => a - b)
  const rootChildren = built.slice(1, 3).join(', ')
  return [
    { title: '先看数组：最大值还没有浮到顶端', formula: '\\text{目标：构造大根堆}', array: values.slice(), sorted: 0, active: allIndexes, equation: '\\text{父节点}\\ge\\text{子节点}', invariant: '完全二叉树的形状不变：下标 i 的孩子永远是 2i+1 和 2i+2。', note: '数组下标 i 的孩子是 2i+1 和 2i+2；先把它看成一棵完全二叉树。', conclusion: '下一步从最后一个非叶节点开始向上修复。' },
    { title: `自底向上建堆：${values[0]} 找到自己的位置`, formula: '\\text{局部修复：}' + built[0] + '\\ge ' + rootChildren, array: built, sorted: 0, active: allIndexes.slice(0, 3), equation: '\\operatorname{siftDown}(0):' + values[0] + '\\to ' + built[0], invariant: '每修复一个节点，以它为根的子树就永远保持堆序。', note: '每次只把一个节点向下交换到合适位置；已经修好的子树继续保持堆序。', conclusion: `现在根节点 ${built[0]} 是当前未排序区间的最大值。`, prediction: { prompt: '把数组建成大根堆后，当前最大值应该出现在哪里？', options: ['根节点', '数组最后一个位置', '中间某个叶子'], answer: 0, explanation: '堆序保证父节点不小于孩子，所以全局最大值一定在根；这正是下一轮可以直接取走它的原因。' } },
    { title: '交换根和末尾：把最大值固定', formula: '\\text{最大值 }' + built[0] + '\\text{进入有序后缀}', array: afterExtract, sorted: 1, active: allIndexes.slice(0, Math.min(3, n - 1)), equation: 'A[0]\\leftrightarrow A[' + (n - 1) + ']', invariant: '有序后缀里的元素不再参与比较，也不会再被移动。', note: '根节点是最大值，所以把它放到数组末尾；未排序区间缩短一个。', conclusion: '交换破坏了根部堆序，下一步只需重新修复未排序部分。' },
    { title: '重新堆化：继续固定下一个最大值', formula: '\\text{未排序区间的根 }' + afterHeapify[0] + '\\text{重新满足堆序}', array: afterHeapify, sorted: 1, active: allIndexes.slice(0, Math.min(3, n - 1)), equation: '\\operatorname{heapify}(0,\\ldots,' + (n - 2) + ')', invariant: `已经固定的 ${built[0]} 不参与比较；堆序只在未排序区间内维持。`, note: `每轮只修复从根开始的一条路径，已经固定的 ${built[0]} 不再参与比较。`, conclusion: '重复“取根、交换、堆化”，有序后缀会逐步变长。' },
    { title: '结束：有序后缀扩展成完整答案', formula: '\\text{结果：}' + sorted.join(' \\le '), array: sorted, sorted: n, active: [], equation: '\\text{建立堆 }O(n)+n\\text{ 次堆化 }O(n\\log n)', invariant: '整组数字有序，且每一轮都拿走了当前剩余部分的最大值。', note: '每轮拿走一个最大值；堆高是 log n，重复 n 次得到 Θ(n log n)。', conclusion: '堆排序把“找最大值”变成了“维护根节点”，额外空间是 O(1)。', prediction: { prompt: `根节点 ${afterExtract[afterExtract.length - 1]} 与末尾交换后，未排序区间还满足堆序吗？`, options: ['满足，交换不会影响堆', '不满足，需要从根重新堆化', '只有叶子节点需要重排'], answer: 1, explanation: '新根可能小于孩子，所以只需沿较大的孩子向下修复。' } },
  ]
}

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
  const steps = buildHeapSteps(example.values)
  const playback = useLessonPlayback(steps.length)
  return <HeapSortScene steps={steps} step={playback.step} setStep={playback.setStep} playing={playback.playing} onTogglePlaying={playback.togglePlaying} onReplay={playback.replay} speed={playback.speed} onCycleSpeed={playback.cycleSpeed} examplePicker={<ExamplePicker examples={heapExamples} value={exampleId} onChange={id => { playback.reset(); setExampleId(id) }} />} />
}

function HeapSortScene({ steps, step, setStep, playing, onTogglePlaying, onReplay, speed, onCycleSpeed, examplePicker }: { steps: HeapStep[]; step: number; setStep: (value: number) => void; playing: boolean; onTogglePlaying: () => void; onReplay: () => void; speed: number; onCycleSpeed: () => void; examplePicker: ReactNode }) {
  const state = steps[step]
  const beforeExtract = steps[1]?.array ?? state.array
  const afterExtract = steps[2]?.array ?? state.array
  const afterHeapify = steps[3]?.array ?? state.array
  const lastIndex = beforeExtract.length - 1
  const scopeRef = useRef<HTMLDivElement>(null)
  useStepScene(scopeRef, () => {
    if (scopeRef.current?.querySelector('.heap-node.active')) animate('.heap-node.active', { scale: [0.86, 1], opacity: [0.45, 1], duration: 420, delay: stagger(45), ease: 'out(3)' })
    if (scopeRef.current?.querySelector('.stability-token')) animate('.stability-token', { translateY: [-7, 0], opacity: [0.45, 1], duration: 360, delay: stagger(55), ease: 'out(3)' })
  }, [step])
  const cellTone = (index: number): DataCell['tone'] => state.active.includes(index) ? 'focus' : index >= state.array.length - state.sorted ? 'sorted' : 'default'
  const cells: DataCell[] = state.array.map((value, index) => ({ id: `${value}#${index}`, label: value, tone: cellTone(index) }))
  return (
    <LessonShell eyebrow="SANDBOX 02 · HEAP SORT" title={state.title} description="把数组看成完全二叉树：根节点负责交付当前最大值，堆化负责修复被交换破坏的局部关系；同值元素的身份也会被单独检查。" steps={['看数组', '建堆', '取最大值', '再堆化', '完成']} step={step} onStepChange={setStep} playing={playing} onTogglePlaying={onTogglePlaying} onReplay={onReplay} complexity={heapSortComplexity} speed={speed} onCycleSpeed={onCycleSpeed} examplePicker={examplePicker}>
      <div ref={scopeRef} className="lesson-canvas">
        <FormulaReadout question="这一步，公式记录了哪条堆序关系？" latex={state.formula} />
        <div className="heap-layout">
          <Card>
            <CardHeader><CardTitle>完全二叉树视图</CardTitle></CardHeader>
            <CardContent>
              <div className="heap-tree" aria-label="堆排序完全二叉树">
                <div className="heap-level">{[0].map(index => <HeapNode key={index} value={state.array[index]} active={state.active.includes(index)} sorted={index >= state.array.length - state.sorted} />)}</div>
                <div className="heap-level">{[1, 2].map(index => <HeapNode key={index} value={state.array[index]} active={state.active.includes(index)} sorted={index >= state.array.length - state.sorted} />)}</div>
                <div className="heap-level">{[3, 4].map(index => <HeapNode key={index} value={state.array[index]} active={state.active.includes(index)} sorted={index >= state.array.length - state.sorted} />)}</div>
              </div>
              <div className="heap-array">
                <ArrayView cells={cells} ariaLabel="堆排序数组状态" indexes />
              </div>
              <LegendStrip items={[{ tone: 'focus', label: '堆化路径' }, { tone: 'sorted', label: '有序后缀' }]} />
              {step === 1 && (
                <MoveCallout title="堆化：节点沿比较路径下沉" kind="down" moves={[{ token: String(steps[0].array[0]), from: '原根', to: '下沉' }, { token: String(state.array[0]), from: '胜出者', to: '新根' }]} verdict="父节点必须 ≥ 子节点，谁大谁当根。" note="箭头表示同一个位置上的数字经过比较与交换，直到父节点 ≥ 子节点。" />
              )}
              {step === 2 && (
                <MoveCallout title="交换：最大值从根流向有序后缀" kind="swap" moves={[{ token: String(beforeExtract[0]), from: `A[0]`, to: `A[${lastIndex}]` }, { token: String(beforeExtract[lastIndex]), from: `A[${lastIndex}]`, to: 'A[0]' }]} verdict="根是未排序区间的最大值，末尾是唯一可以和它交换的原地空位。" note={`交换后：A[0] = ${afterExtract[0]}，A[${lastIndex}] = ${afterExtract[lastIndex]}；绿色区域已经不再参与堆化。`} />
              )}
              {step === 3 && (
                <MoveCallout title="重新堆化：新根向下，较大孩子向上" kind="down" moves={[{ token: String(afterExtract[0]), from: '交换后的新根', to: '沿路径下沉' }, { token: String(afterHeapify[0]), from: '胜出者', to: '修复后的根' }]} verdict="只比较父子，谁大谁上移；新根太小就继续下沉。" note="只沿一条高度为 log n 的路径移动，已经固定的后缀不再比较。" />
              )}
              {step >= 2 && <StabilityExample statement="交换根和末尾时，同值元素可能换位；重复键数据集里能看到两个 4 的身份顺序被改变。" before={['4A', '4B']} after={['4B', '4A']} stable={false} />}
            </CardContent>
          </Card>
          <CalcDesk metrics={[{ label: '未排序区间', value: state.array.length - state.sorted }, { label: '已固定最大值', value: state.sorted, tone: 'green' }]} equation={state.equation} invariant={state.invariant} pseudocode={{ lines: heapCode, active: step === 0 ? [0] : step === 1 ? [1, 2, 3, 4, 5] : step === 2 ? [5] : step === 3 ? [6] : [] }} note={state.note} />
        </div>
        {state.prediction ? <PredictionPrompt {...state.prediction} /> : null}
        <DesignNotes insight={heapSortInsight} />
        <ConclusionBox>{state.conclusion}</ConclusionBox>
      </div>
    </LessonShell>
  )
}

function HeapNode({ value, active, sorted }: { value: number; active: boolean; sorted: boolean }) { return <span className={`heap-node ${active ? 'active' : ''} ${sorted ? 'sorted' : ''}`}>{value}</span> }
