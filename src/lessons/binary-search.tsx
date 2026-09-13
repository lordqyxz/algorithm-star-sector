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
import { PredictionPrompt, type PredictionData } from '@/components/PredictionPrompt'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ComplexityProfileData } from '@/components/ComplexityProfile'
import { useLessonPlayback } from '@/hooks/useLessonPlayback'
import { useStepScene } from '@/hooks/useStepScene'

type ProbeResult = 'found' | 'left' | 'right'

type SearchStep = {
  title: string
  formula: string
  /** 1-based interval after this step's elimination. */
  low: number
  high: number
  mid?: number
  midValue?: number
  result?: ProbeResult
  foundIndex?: number
  probes: number
  intervalBefore: number
  equation: string
  invariant: string
  note: string
  conclusion: string
  finished: boolean
  prediction?: PredictionData
}

type SearchExample = ExampleOption & { values: number[]; target: number }

const searchExamples: readonly SearchExample[] = [
  { id: 'typical', label: '典型查找', detail: 'x=34 · 3 次比较', values: [2, 3, 5, 8, 13, 21, 34, 55], target: 34 },
  { id: 'first-mid', label: '最好情形', detail: 'x=8 · 1 次命中', values: [2, 3, 5, 8, 13, 21, 34, 55], target: 8 },
  { id: 'deepest', label: '最深处命中', detail: 'x=55 · 最坏路径', values: [2, 3, 5, 8, 13, 21, 34, 55], target: 55 },
  { id: 'absent', label: '目标不存在', detail: 'x=7 · 查到区间为空', values: [2, 3, 5, 8, 13, 21, 34, 55], target: 7 },
]

const searchCode = [
  { code: 'while low ≤ high', note: '区间非空才继续' },
  { code: '  mid = ⌊(low+high)/2⌋', note: '取区间中点，一次探测' },
  { code: '  if x = A[mid]: return mid' },
  { code: '  if x < A[mid]: high = mid - 1', note: '移动依据：x 更小，右半全部排除' },
  { code: '  else: low = mid + 1', note: 'x 更大，左半全部排除' },
  { code: 'return NOT-FOUND', note: '区间为空仍没找到 → x 不存在' },
]

function buildSearchSteps(example: SearchExample): SearchStep[] {
  const { values, target } = example
  const n = values.length
  const steps: SearchStep[] = []
  let low = 1
  let high = n
  let probes = 0
  steps.push({
    title: `在 ${n} 个有序数里找 x=${target}：不逐个比，先问中点`,
    formula: `\\text{区间 }[1,${n}]\\text{，长度 }${n}\\ ;\\ x=${target}`,
    low, high, probes: 0, intervalBefore: n,
    equation: `\\text{线性扫描最坏 }${n}\\text{ 次；二分每次只问 }1\\text{ 个中点}`,
    invariant: 'x 若存在，一定还在当前区间 [low, high] 里。',
    note: '有序性是全部依据：比较一次中点，就能排除整整一半区间。',
    conclusion: '下一步：算出第一个 mid，用一次比较决定去左还是去右。',
    finished: false,
    prediction: { prompt: `low=1、high=${n}，第一次 mid = ⌊(low+high)/2⌋ 会指到第几位？`, options: ['第 4 位', '第 1 位', '第 8 位'], answer: 0, explanation: `⌊(1+${n})/2⌋=${Math.floor((1 + n) / 2)}，即 A[4]=${values[3]}；第一位探测点由下取整决定。` },
  })
  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    const midValue = values[mid - 1]
    probes += 1
    const intervalBefore = high - low + 1
    if (midValue === target) {
      steps.push({
        title: `第 ${probes} 次比较：A[${mid}]=${midValue} 正中目标`,
        formula: `mid=\\lfloor(${low}+${high})/2\\rfloor=${mid}\\ ;\\ A[${mid}]=${midValue}=x`,
        low, high, mid, midValue, result: 'found', foundIndex: mid, probes, intervalBefore,
        equation: `\\text{命中：}\\ ${probes}\\text{ 次比较}\\ll\\text{线性扫描 }${n}\\text{ 次}`,
        invariant: 'x 一直没离开过当前区间；这次它就是中点本身。',
        note: '区间每次只缩一半，命中路径的长度就是树高量级。',
        conclusion: `找到 x=${target}：二分用 ${probes} 次比较完成，线性扫描最坏要 ${n} 次。`,
        finished: true,
      })
      return steps
    }
    const goLeft = midValue > target
    const nextLow = goLeft ? low : mid + 1
    const nextHigh = goLeft ? mid - 1 : high
    steps.push({
      title: `第 ${probes} 次比较：A[${mid}]=${midValue} ${goLeft ? '>' : '<'} x=${target}，${goLeft ? '右半' : '左半'}全部排除`,
      formula: `A[${mid}]=${midValue}${goLeft ? '>' : '<'}${target}\\Rightarrow x\\in[${goLeft ? low : mid + 1},${goLeft ? mid - 1 : high}]`,
      low: nextLow, high: nextHigh, mid, midValue, result: goLeft ? 'left' : 'right', probes, intervalBefore,
      equation: `\\text{区间 }${intervalBefore}\\to ${Math.max(0, nextHigh - nextLow + 1)}\\text{：一次比较排除一半}`,
      invariant: `被排除的${goLeft ? '右半' : '左半'}全部${goLeft ? '大于' : '小于'} x，x 若存在仍在新区间内。`,
      note: `有序数组保证 A[${mid}] 一侧的每个元素都不可能等于 x，所以可以整段丢弃。`,
      conclusion: nextLow <= nextHigh ? `区间缩到 [${nextLow}, ${nextHigh}]，继续问新中点。` : '区间变空：x 不在数组里，查找结束。',
      finished: false,
      prediction: nextLow <= nextHigh ? { prompt: `新区间 [${nextLow}, ${nextHigh}] 长度 ${nextHigh - nextLow + 1}，下一次 mid = ⌊(${nextLow}+${nextHigh})/2⌋ 指到谁？`, options: [`第 ${Math.floor((nextLow + nextHigh) / 2)} 位`, `第 ${nextLow} 位`, `第 ${nextHigh} 位`], answer: 0, explanation: `⌊(${nextLow}+${nextHigh})/2⌋=${Math.floor((nextLow + nextHigh) / 2)}；每一拍都是"算中点 → 比一次 → 丢一半"。` } : undefined,
    })
    low = nextLow
    high = nextHigh
  }
  steps.push({
    title: `区间为空：${probes} 次比较证明 x=${target} 不存在`,
    formula: `\\text{low}>\\text{high}\\Rightarrow\\text{NOT-FOUND}\\ ;\\ ${probes}\\text{ 次比较}`,
    low, high, probes, intervalBefore: 0,
    equation: `\\lceil\\log_2(${n}+1)\\rceil=${Math.ceil(Math.log2(n + 1))}\\ge ${probes}\\text{：最坏路径的长度}`,
    invariant: '每一轮排除的一半都确实不可能包含 x，所以"没找到"也是可靠结论。',
    note: `线性扫描要确认不存在同样需要 ${n} 次比较；二分把最坏次数压到 ⌈log₂(n+1)⌉。`,
    conclusion: `二分查找的代价是对数级：区间 8→4→2→1，比较次数不超过 ⌈log₂n⌉。`,
    finished: true,
    prediction: { prompt: '如果数组无序，二分的"丢一半"还成立吗？', options: ['不成立，排除一半失去依据', '仍然成立，mid 照算', '只要排一次序就永远成立'], answer: 0, explanation: '"A[mid] 一侧不可能含 x"完全依赖有序性；无序时一次比较排除不了任何一半。' },
  })
  return steps
}

const binarySearchComplexity: ComplexityProfileData = {
  title: '二分查找：有序性换来对数级比较次数',
  subtitle: '每次比较排除一半区间；代价是输入必须有序（或先付一次排序成本）。',
  cases: [
    { label: '最好', complexity: 'Θ(1)', condition: '目标恰好是第一个 mid。', example: 'n=8 时 x=A[4]=8', explanation: '一次比较直接命中，与 n 无关。', tone: 'best' },
    { label: '平均', complexity: 'Θ(log n)', condition: '目标随机位于有序数组中。', example: 'n=8：8→4→2→1，约 3 次', explanation: '每轮区间减半，比较次数约 log₂n。', tone: 'average' },
    { label: '最坏', complexity: 'Θ(log n)', condition: '目标在最后一层，或根本不存在。', example: 'n=8 找 x=55 或 x=7', explanation: '要走到区间为空，仍只是 ⌈log₂(n+1)⌉ 次。', tone: 'worst' },
  ],
  footer: '对比线性扫描 Θ(n)：n=10⁶ 时二分最多约 20 次比较；但若数组无序，先排序要 Θ(n log n)。',
}

export function BinarySearchLesson() {
  const [exampleId, setExampleId] = useState(searchExamples[0].id)
  const example = searchExamples.find(item => item.id === exampleId) ?? searchExamples[0]
  const steps = buildSearchSteps(example)
  const playback = useLessonPlayback(steps.length)
  return <BinarySearchScene example={example} steps={steps} step={playback.step} setStep={playback.setStep} playing={playback.playing} onTogglePlaying={playback.togglePlaying} onReplay={playback.replay} speed={playback.speed} onCycleSpeed={playback.cycleSpeed} examplePicker={<ExamplePicker examples={searchExamples} value={exampleId} onChange={id => { playback.reset(); setExampleId(id) }} />} />
}

function BinarySearchScene({ example, steps, step, setStep, playing, onTogglePlaying, onReplay, speed, onCycleSpeed, examplePicker }: { example: SearchExample; steps: SearchStep[]; step: number; setStep: (value: number) => void; playing: boolean; onTogglePlaying: () => void; onReplay: () => void; speed: number; onCycleSpeed: () => void; examplePicker: ReactNode }) {
  const state = steps[step]
  const scopeRef = useRef<HTMLDivElement>(null)
  useStepScene(scopeRef, () => {
    if (scopeRef.current?.querySelector('.data-cell.focus')) animate('.data-cell.focus', { scale: [0.86, 1], opacity: [0.45, 1], duration: 420, ease: 'out(3)' })
    if (scopeRef.current?.querySelector('.data-cell.muted')) animate('.data-cell.muted', { opacity: [1, 0.45], duration: 380, delay: stagger(25), ease: 'out(3)' })
  }, [step])
  const n = steps[0].high
  const cells: DataCell[] = Array.from({ length: n }, (_, index) => {
    const position = index + 1
    const inInterval = position >= state.low && position <= state.high
    const isMid = state.mid === position
    const isFound = state.foundIndex === position
    return {
      id: `v${position}`,
      label: example.values[index],
      tone: isFound ? 'sorted' : isMid ? 'focus' : inInterval || state.finished && state.foundIndex === undefined ? 'default' : 'muted',
    }
  })
  const pointers: PointerTag[] = []
  if (!state.finished && state.mid !== undefined) {
    pointers.push({ index: state.low - 1, label: 'lo', tone: 'blue' })
    pointers.push({ index: state.mid - 1, label: 'mid', tone: 'dark' })
    pointers.push({ index: state.high - 1, label: 'hi', tone: 'orange' })
  }
  const regions: RegionLabel[] = []
  if (state.low > 1) regions.push({ from: 0, to: state.low - 2, label: '已排除 < x', tone: 'blue' })
  if (!state.finished && state.high >= state.low) regions.push({ from: state.low - 1, to: state.high - 1, label: `当前区间 [${state.low}, ${state.high}]`, tone: 'purple' })
  if (!state.finished && state.high < n) regions.push({ from: state.high, to: n - 1, label: '已排除 > x', tone: 'orange' })
  const judge: CompareEntry[] = state.mid === undefined ? [] : [{
    left: `A[${state.mid}]=${state.midValue}`,
    op: state.result === 'left' ? '>' : state.result === 'right' ? '<' : '=',
    right: `x=${example.target}`,
    holds: state.result !== 'found',
    action: state.result === 'left' ? '中点右侧整段排除，只留左半' : state.result === 'right' ? '中点左侧整段排除，只留右半' : '直接命中',
  }]
  return (
    <LessonShell eyebrow="ANIMATION 14 · BINARY SEARCH" title={state.title} description="有序数组允许一次比较排除一半区间：查找的代价从 n 次压到 log₂n 次，依据全部来自有序性。" steps={steps.map(item => item.title.startsWith('在 ') ? '问题' : item.finished ? '结论' : `第 ${item.probes} 次比较`)} step={step} onStepChange={setStep} playing={playing} onTogglePlaying={onTogglePlaying} onReplay={onReplay} complexity={binarySearchComplexity} speed={speed} onCycleSpeed={onCycleSpeed} examplePicker={examplePicker}>
      <div ref={scopeRef} className="lesson-canvas">
        <FormulaReadout question="这一步，公式记录了哪次排除？" latex={state.formula} />
        <div className="lesson-grid">
          <Card>
            <CardHeader><CardTitle>有序数组：lo / mid / hi 三个指针</CardTitle></CardHeader>
            <CardContent>
              <ArrayView cells={cells} ariaLabel="二分查找区间状态" indexes pointers={pointers} regions={regions} />
              <LegendStrip items={[{ tone: 'focus', label: '当前 mid' }, { tone: 'muted', label: '已排除' }, { tone: 'sorted', label: '命中目标' }]} />
              {judge.length > 0 && <CompareJudge title="判断依据：一次比较决定丢哪一半" entries={judge} note={`本轮区间从 ${state.intervalBefore} 缩到 ${Math.max(0, state.high - state.low + 1)}；比较只有 1 次，排除的元素却有 ${state.intervalBefore - Math.max(0, state.high - state.low + 1)} 个。`} />}
              {state.finished && state.foundIndex === undefined && <CompareJudge title={'为什么“没找到”也可信'} entries={[{ left: 'low', op: '>', right: 'high', holds: true, action: '区间为空：x 不属于数组' }]} note="每一轮排除都有序性背书，所以空区间是可靠结论，不是放弃。" />}
            </CardContent>
          </Card>
          <CalcDesk metrics={[{ label: '当前区间长度', value: Math.max(0, state.high - state.low + 1) }, { label: '已用比较次数', value: state.probes, tone: 'orange' }, { label: '线性扫描最坏', value: n, tone: 'purple' }]} equation={state.equation} invariant={state.invariant} pseudocode={{ lines: searchCode, active: state.finished && state.foundIndex === undefined ? [0, 5] : state.finished ? [0, 1, 2] : [0, 1, state.result === 'left' ? 3 : 4] }} note={state.note} />
        </div>
        {state.prediction ? <PredictionPrompt {...state.prediction} /> : null}
        <ConclusionBox>{state.conclusion}</ConclusionBox>
      </div>
    </LessonShell>
  )
}
