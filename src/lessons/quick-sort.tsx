import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { animate, stagger } from 'animejs'
import { ArrayView, type DataCell, type PointerTag, type RegionLabel } from '@/components/ArrayView'
import { CalcDesk } from '@/components/CalcDesk'
import { CompareJudge, type CompareEntry } from '@/components/CompareJudge'
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

type Token = { value: number; tag?: string; seed: number }

type QuickStep = {
  title: string
  formula: string
  tokens: Token[]
  pivot: number
  pivotValue: number
  left: Token[]
  right: Token[]
  focus: number[]
  settled: boolean
  equation: string
  invariant: string
  note: string
  conclusion: string
  comparisons: number
  prediction?: PredictionData
}

type QuickExample = ExampleOption & { values: number[] }

const quickExamples: readonly QuickExample[] = [
  { id: 'mixed', label: '课堂混合序列', detail: '[7,2,1,6,8,5,3,4]', values: [7, 2, 1, 6, 8, 5, 3, 4] },
  { id: 'sorted', label: '已排序·坏主元', detail: '[1,2,3,4,5,6,7,8]', values: [1, 2, 3, 4, 5, 6, 7, 8] },
  { id: 'reverse', label: '逆序·坏主元', detail: '[8,7,6,5,4,3,2,1]', values: [8, 7, 6, 5, 4, 3, 2, 1] },
  { id: 'duplicates', label: '重复键·查身份', detail: '[4,2,7,4,1,4,3]', values: [4, 2, 7, 4, 1, 4, 3] },
]

/** Duplicate values get A/B/C suffixes so identity survives every swap. */
function tokenize(values: number[]): Token[] {
  const counts = new Map<number, number>()
  values.forEach(value => counts.set(value, (counts.get(value) ?? 0) + 1))
  const seen = new Map<number, number>()
  return values.map((value, seed) => {
    const duplicated = (counts.get(value) ?? 0) > 1
    const letter = String.fromCharCode(65 + (seen.get(value) ?? 0))
    seen.set(value, (seen.get(value) ?? 0) + 1)
    return { value, tag: duplicated ? `${value}${letter}` : undefined, seed }
  })
}

function label(token: Token) {
  return token.tag ?? String(token.value)
}

function partitionTokens(tokens: Token[]) {
  const array = tokens.slice()
  const pivotValue = array[array.length - 1].value
  let boundary = 0
  for (let scan = 0; scan < array.length - 1; scan += 1) {
    if (array[scan].value <= pivotValue) {
      ;[array[boundary], array[scan]] = [array[scan], array[boundary]]
      boundary += 1
    }
  }
  ;[array[boundary], array[array.length - 1]] = [array[array.length - 1], array[boundary]]
  return { array, pivotIndex: boundary, pivotValue }
}

const partitionCode = [
  { code: 'x = A[r]', note: '取最后一个元素作为主元' },
  { code: 'i = p - 1' },
  { code: 'for j = p to r - 1' },
  { code: '  if A[j] ≤ x', note: '移动依据：A[j] 是否不大于主元' },
  { code: '    i = i + 1' },
  { code: '    exchange A[i] with A[j]' },
  { code: 'exchange A[i+1] with A[r]', note: '主元落到左右区的分界' },
]

function buildQuickSteps(values: number[]): QuickStep[] {
  const n = values.length
  const tokens = tokenize(values)
  const partitioned = partitionTokens(tokens)
  const left = partitioned.array.slice(0, partitioned.pivotIndex)
  const right = partitioned.array.slice(partitioned.pivotIndex + 1)
  const sorted = tokens.slice().sort((a, b) => a.value - b.value)
  const sortedPivot = sorted.findIndex(token => token.seed === partitioned.array[partitioned.pivotIndex].seed)
  const focusAll = tokens.map((_, index) => index)
  const group = (items: Token[]) => `[${items.map(label).join(', ')}]`
  return [
    { title: '先选主元：把“全部比较”变成一次扫描', formula: `\\text{主元 }p=${partitioned.pivotValue}\\text{，扫描其余 }${n - 1}\\text{ 个元素}`, tokens, pivot: n - 1, pivotValue: partitioned.pivotValue, left, right, focus: [0], settled: false, equation: 'T(n)=T(k)+T(n-k-1)+O(n)', invariant: `主元 ${partitioned.pivotValue} 尚未移动，整组数字还在原位。`, note: '主元会把数组分成“小于 p”和“大于 p”两侧；本轮扫描成本是线性的。', conclusion: `下一步逐个判断：谁应该留在 ${partitioned.pivotValue} 的左边？`, comparisons: 0, prediction: { prompt: `以 ${partitioned.pivotValue} 为主元时，哪些数字应该进入左分区？`, options: [left.length ? left.map(label).join('、') : '没有数字', right.length ? right.map(label).join('、') : '没有数字', '全部数字都要交换'], answer: 0, explanation: `分区会把不大于 ${partitioned.pivotValue} 的元素放入左侧，其余元素留在右侧；主元最后落在两者之间。` } },
    { title: '分区扫描：小的放左边，大的放右边', formula: `\\left\\{${left.length ? left.map(label).join(',') : '\\varnothing'}\\right\\} < ${partitioned.pivotValue} < \\left\\{${right.length ? right.map(label).join(',') : '\\varnothing'}\\right\\}`, tokens: partitioned.array, pivot: partitioned.pivotIndex, pivotValue: partitioned.pivotValue, left, right, focus: focusAll, settled: false, equation: `L=\\{${left.map(label).join(',')}\\};\\quad R=\\{${right.map(label).join(',')}\\}`, invariant: '扫描过的每个元素都已经被放到正确的一侧；分区只看相对主元的大小。', note: '分区只决定相对主元的位置，不要求左右内部已经有序；相等键也可能被交换跨过。', conclusion: `分区完成后，主元 ${partitioned.pivotValue} 的最终位置已经确定。`, comparisons: n - 1 },
    { title: '主元归位：递归规模真的变小了', formula: `${partitioned.pivotValue}\\text{ 左边 }${left.length}\\text{ 个，右边 }${right.length}\\text{ 个：}${left.length}\\mid 1\\mid ${right.length}`, tokens: partitioned.array, pivot: partitioned.pivotIndex, pivotValue: partitioned.pivotValue, left, right, focus: [], settled: false, equation: `T(${n})=T(${left.length})+T(${right.length})+O(${n})`, invariant: `主元 ${partitioned.pivotValue} 所在位置就是它在最终答案里的位置。`, note: '主元不再参与递归；问题被拆成两个更小的子数组。', conclusion: '接下来只对左区间和右区间重复同一套分区动作。', comparisons: n - 1 },
    { title: '继续递归：两个子问题分别收敛', formula: `\\text{左右区间继续分区，直到长度 }\\le 1`, tokens: sorted, pivot: sortedPivot, pivotValue: partitioned.pivotValue, left, right, focus: [], settled: true, equation: `T(${left.length})+T(${right.length})\\to\\text{更小的子问题}`, invariant: '每次主元归位都会留下一个已确定的位置；基例是长度 0 或 1 的区间。', note: '每次主元归位都会留下一个已确定的位置；基例是长度 0 或 1 的区间。', conclusion: '如果分区比较均衡，递归树高度约为 log₂n。', comparisons: n - 1 },
    { title: '复杂度取决于分区形状', formula: `\\text{当前分区：}${left.length}\\mid 1\\mid ${right.length}\\ ;\\quad \\Theta(n\\log n)\\text{ 或 }\\Theta(n^2)`, tokens: sorted, pivot: sortedPivot, pivotValue: partitioned.pivotValue, left, right, focus: [], settled: true, equation: `${left.length}\\mid 1\\mid ${right.length}\\to\\text{每层扫描 }O(${n})`, invariant: '每一层递归都要扫描自己的区间一次，合计仍是线性的。', note: '每层都要扫描 n 个元素，但树高由主元把数组切得是否均衡决定。', conclusion: '快速排序快不快，不只看“分区”两个字，还要看主元让递归树长什么样。', comparisons: n - 1, prediction: { prompt: '如果主元每次都把数组切成 0 和 n−1，两边的递归树会怎样？', options: ['高度约 log₂n', '退化成一条链，高度约 n', '不会再递归'], answer: 1, explanation: '每层仍扫描近 n 个元素，但只减少一个元素，求和变成 n+(n−1)+…=Θ(n²)。' } },
  ]
}

const quickSortComplexity: ComplexityProfileData = {
  title: '快速排序：主元条件决定递归树高度',
  subtitle: '每一层都要做 Θ(n) 的分区；最好、平均、最差的差异来自子问题是否均衡。',
  cases: [
    { label: '最好', complexity: 'Θ(n log n)', condition: '每次主元都接近中位数，左右各约一半。', example: '中位主元：4 | [1,2,3] [5,6,7,8]', explanation: '递归树高度约 log₂n，每层合计扫描 n 个元素。', tone: 'best' },
    { label: '平均', complexity: 'Θ(n log n)', condition: '随机排列，或随机选择主元；这是期望复杂度。', example: '随机输入：[7,2,1,6,8,5,3,4]', explanation: '极端不平衡会被多数较平衡的分区抵消，期望树高为对数级。', tone: 'average' },
    { label: '最差', complexity: 'Θ(n²)', condition: '主元每次都是最小或最大，切成 0 和 n−1。', example: '已排序：[1,2,3,4,5,6,7,8]', explanation: '递归树退化成链：n+(n−1)+…+1。', tone: 'worst' },
  ],
  footer: '随机化快速排序把最坏输入变成低概率事件，但单次运行仍可能出现不平衡分区。',
  stability: { status: 'unstable', label: '通常不稳定', statement: '分区时的交换可能让相等键跨过彼此；除非额外设计稳定分区和辅助空间。', before: '4A → 4B', after: '4B → 4A' },
}

export function QuickSortLesson() {
  const [exampleId, setExampleId] = useState(quickExamples[0].id)
  const example = quickExamples.find(item => item.id === exampleId) ?? quickExamples[0]
  const steps = buildQuickSteps(example.values)
  const playback = useLessonPlayback(steps.length)
  return <QuickSortScene steps={steps} step={playback.step} setStep={playback.setStep} playing={playback.playing} onTogglePlaying={playback.togglePlaying} onReplay={playback.replay} speed={playback.speed} onCycleSpeed={playback.cycleSpeed} examplePicker={<ExamplePicker examples={quickExamples} value={exampleId} onChange={id => { playback.reset(); setExampleId(id) }} />} />
}

function QuickSortScene({ steps, step, setStep, playing, onTogglePlaying, onReplay, speed, onCycleSpeed, examplePicker }: { steps: QuickStep[]; step: number; setStep: (value: number) => void; playing: boolean; onTogglePlaying: () => void; onReplay: () => void; speed: number; onCycleSpeed: () => void; examplePicker: ReactNode }) {
  const state = steps[step]
  const scopeRef = useRef<HTMLDivElement>(null)
  useStepScene(scopeRef, () => {
    if (scopeRef.current?.querySelector('.data-cell.focus')) animate('.data-cell.focus', { scale: [0.88, 1], opacity: [0.5, 1], duration: 420, delay: stagger(35), ease: 'out(3)' })
    if (scopeRef.current?.querySelector('.stability-token')) animate('.stability-token', { translateY: [-7, 0], opacity: [0.45, 1], duration: 360, delay: stagger(55), ease: 'out(3)' })
  }, [step])
  const cells: DataCell[] = state.tokens.map((token, index) => ({
    id: `${token.value}#${token.seed}`,
    label: label(token),
    tone: index === state.pivot ? 'pivot' : state.focus.includes(index) ? 'focus' : state.settled ? 'sorted' : 'default',
  }))
  const group = (items: Token[]) => `[${items.map(label).join(', ')}]`
  const scanIndex = state.focus.find(index => index !== state.pivot)
  const pointers: PointerTag[] = [{ index: state.pivot, label: '主元', tone: 'orange' }]
  if (scanIndex !== undefined && step < 2) pointers.push({ index: scanIndex, label: '扫描', tone: 'blue' })
  const regions: RegionLabel[] = step === 1 ? [
    ...(state.left.length > 0 ? [{ from: 0, to: state.pivot - 1, label: `左区 ≤ ${state.pivotValue}`, tone: 'blue' as const }] : []),
    { from: state.pivot, to: state.pivot, label: '主元', tone: 'orange' as const },
    ...(state.right.length > 0 ? [{ from: state.pivot + 1, to: state.tokens.length - 1, label: `右区 > ${state.pivotValue}`, tone: 'yellow' as const }] : []),
  ] : []
  const judge: CompareEntry[] = state.left.slice(0, 1).map(token => ({ left: label(token), op: '≤', right: String(state.pivotValue), holds: true, action: `${label(token)} 进左区` })).concat(state.right.slice(0, 1).map(token => ({ left: label(token), op: '>', right: String(state.pivotValue), holds: false, action: `${label(token)} 留右区` })))
  return (
    <LessonShell eyebrow="ANIMATION 03 · QUICK SORT" title={state.title} description="主元把一次线性扫描变成两个递归子问题；真正决定复杂度的是分区是否均衡，同值元素的身份也会被检查。" steps={['选主元', '分区', '主元归位', '继续递归', '复杂度']} step={step} onStepChange={setStep} playing={playing} onTogglePlaying={onTogglePlaying} onReplay={onReplay} complexity={quickSortComplexity} speed={speed} onCycleSpeed={onCycleSpeed} examplePicker={examplePicker}>
      <div ref={scopeRef} className="lesson-canvas">
        <FormulaReadout question="这一步，公式记录了哪次分区？" latex={state.formula} />
        <div className="quick-layout">
          <Card>
            <CardHeader><CardTitle>数组分区：对象保留身份</CardTitle></CardHeader>
            <CardContent>
              <ArrayView cells={cells} ariaLabel="快速排序数组状态" pointers={pointers} regions={regions} />
              <LegendStrip items={[{ tone: 'pivot', label: '主元' }, { tone: 'focus', label: '扫描中' }, { tone: 'sorted', label: '位置已确定' }]} />
              {step === 1 && <CompareJudge title="分区判断：每个元素只和主元比一次" entries={judge} note={`本轮共 ${state.comparisons} 次比较，全部来自“与主元比大小”，元素之间互不比较。`} />}
              {step >= 1 && (
                <MoveCallout title="分区：数字沿主元两侧流向正确区间" kind="one-way" moves={[{ token: group(state.left), to: '左区 ≤ p' }, { token: `p=${state.pivotValue}`, to: '固定位置' }, { token: group(state.right), to: '右区 > p' }]} note="箭头表示“放到主元哪一侧”；这一步只分区，不要求左右内部已经有序。" />
              )}
              {step >= 1 && <StabilityExample statement="分区交换可能改变相等键顺序；重复键数据集里可以直接看到 4A、4B 是否换位。" before={['4A', '4B']} after={['4B', '4A']} stable={false} />}
            </CardContent>
          </Card>
          <CalcDesk metrics={[{ label: '本轮扫描元素', value: state.tokens.length }, { label: '主元位置', value: step < 2 ? '待定' : `第 ${state.pivot + 1} 位`, tone: step < 2 ? 'blue' : 'green' }, { label: '分区比较次数', value: step === 0 ? 0 : state.comparisons, tone: 'orange' }]} equation={state.equation} invariant={state.invariant} pseudocode={{ lines: partitionCode, active: step === 0 ? [0] : step === 1 ? [2, 3] : step === 2 ? [6] : [] }} note={state.note} />
        </div>
        {state.prediction ? <PredictionPrompt {...state.prediction} /> : null}
        <ConclusionBox>{state.conclusion}</ConclusionBox>
      </div>
    </LessonShell>
  )
}
