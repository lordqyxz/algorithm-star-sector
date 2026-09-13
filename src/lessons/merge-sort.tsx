import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { animate, stagger } from 'animejs'
import { CalcDesk } from '@/components/CalcDesk'
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

type MergeExample = ExampleOption & { values: number[] }
type MergeRow = { count: number; groups: number[][]; work: string }
type MergeStep = { title: string; formula: string; count: number; size: number; total: number; equation: string; invariant: string; note: string; conclusion: string; visible: number; focus: number; rows: MergeRow[]; sortedValues: number[]; prediction?: PredictionData }

const mergeExamples: readonly MergeExample[] = [
  { id: 'mixed', label: '课堂混合序列', detail: '[8,3,7,4,1,6,2,5]', values: [8, 3, 7, 4, 1, 6, 2, 5] },
  { id: 'sorted', label: '已经有序', detail: '[1,2,3,4,5,6,7,8]', values: [1, 2, 3, 4, 5, 6, 7, 8] },
  { id: 'reverse', label: '完全逆序', detail: '[8,7,6,5,4,3,2,1]', values: [8, 7, 6, 5, 4, 3, 2, 1] },
  { id: 'duplicates', label: '重复键', detail: '[4,1,4,2,4,3,4,2]', values: [4, 1, 4, 2, 4, 3, 4, 2] },
]

function buildSortRows(values: number[]): MergeRow[] {
  const rows: MergeRow[] = []
  for (let size = values.length; size >= 1; size /= 2) {
    const groups = []
    for (let start = 0; start < values.length; start += size) groups.push(values.slice(start, start + size))
    rows.push({ count: groups.length, groups, work: `${groups.length} × ${size} = ${values.length}` })
    if (size === 1) break
  }
  return rows
}

const mergeCode = [
  { code: 'L = A[p..q],  R = A[q+1..r]', note: '把左右两半各自拷贝成有序队列' },
  { code: 'i = 1,  j = 1', note: '两个队列都从队首开始' },
  { code: 'for k = p to r', note: '逐格回填原数组' },
  { code: '  if L[i] ≤ R[j]', note: '相等时先取左侧，保证稳定' },
  { code: '    A[k] = L[i],  i = i + 1' },
  { code: '  else A[k] = R[j],  j = j + 1' },
  { code: '把 L[i..] 与 R[j..] 的剩余部分接上', note: '一边取空后，另一边整体拷贝' },
]

function buildSortSteps(values: number[]): MergeStep[] {
  const n = values.length
  const half = n / 2
  const quarter = n / 4
  const levels = Math.log2(n)
  const rows = buildSortRows(values)
  const sortedValues = values.slice().sort((a, b) => a - b)
  return [
    { title: `初始问题：给 ${n} 个数字排序`, formula: String.raw`T(${n})=2T(${half})+${n}`, count: 1, size: n, total: n, equation: String.raw`1\times ${n}=${n}`, invariant: `还没有拆分：问题数 × 单题规模相乘不变，1 × ${n} = ${n}，一个数字都没有少。`, note: '先看这一层：问题数 × 单题规模。', conclusion: '下一步：让第一刀真的发生。', visible: 1, focus: 0, rows, sortedValues },
    { title: '第一次拆分：一个问题变成两个', formula: String.raw`T(${n})=4T(${quarter})+2\times ${half}+${n}`, count: 2, size: half, total: n, equation: String.raw`2\times ${half}=${n}`, invariant: `问题数翻倍、单题规模减半，两者相乘不变：这一层仍处理 ${n} 个数字。`, note: '问题数翻倍，单题规模减半；这一层仍处理全部数字。', conclusion: `公式新增的 2×${half}，就是拆分后新出现的第二层工作。`, visible: 2, focus: 1, rows, sortedValues, prediction: { prompt: '拆分后，第二层一共还要处理多少个数字？', options: [`${rows[0].groups.flat().length} 个`, `${rows[1].groups.flat().length} 个`, `${rows[0].groups.flat().length * 2} 个`], answer: 0, explanation: `拆分改变问题数量和规模，但这一层的总工作量仍然是 ${rows[0].groups.flat().length}。` } },
    { title: '到达基例：单个数字不用再排序', formula: String.raw`T(${n})=${n}T(1)+\cdots`, count: n, size: 1, total: n, equation: String.raw`${n}\times 1=${n}`, invariant: `到达基例后树高不再增长：${n} 个单元素问题天然有序，加起来仍是 ${n} 个数字。`, note: `${n}→${half}→${quarter}→1，减半 ${levels} 次，所以 L=log₂${n}。`, conclusion: `树底部 ${n} 个单元素问题对应 ${n}T(1)，递归在基例停下。`, visible: 4, focus: rows.length - 1, rows, sortedValues },
    { title: '向上合并：把小答案合成大答案', formula: String.raw`T(${n})=${n}+\cdots+${n}+\text{基例成本}`, count: n / 2, size: 2, total: n, equation: String.raw`\text{每个合并层处理 }${n}\text{ 个数字}`, invariant: `合并只用线性扫描：相等键先取左侧；这一层处理的数字总数仍是 ${n}。`, note: '两个有序小组只需线性扫描即可合并；相等键先取左侧元素。', conclusion: '合并阶段把局部有序答案拼成更大的有序答案。', visible: 4, focus: -1, rows, sortedValues, prediction: { prompt: '合并两个有序数组时，为什么只需要看两个队首？', options: ['队首是各自剩余部分的最小值', '其他数字已经自动消失', '因为数组长度必须相等'], answer: 0, explanation: '每个子数组已经有序，所以各自队首就是当前最小候选；取出较小者并推进一个指针即可。' } },
    { title: '得到复杂度：每层 n，共 log₂n 层', formula: String.raw`T(${n})\approx ${levels}\times ${n}=n\log_2 n`, count: levels, size: n, total: n * levels, equation: String.raw`${n}+\cdots+${n}=${levels}\times ${n}`, invariant: `每一层的总工作量都等于 ${n} 个数字，变化的只有层数 log₂${n}。`, note: '每层变宽，但层数只按对数增长。', conclusion: '拆小 → 解决基例 → 合并，因此归并排序是 Θ(n log n)。', visible: 4, focus: -1, rows, sortedValues },
  ]
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
  const steps = buildSortSteps(example.values)
  const playback = useLessonPlayback(steps.length)
  return <MergeSortScene steps={steps} step={playback.step} setStep={playback.setStep} playing={playback.playing} onTogglePlaying={playback.togglePlaying} onReplay={playback.replay} speed={playback.speed} onCycleSpeed={playback.cycleSpeed} examplePicker={<ExamplePicker examples={mergeExamples} value={exampleId} onChange={id => { playback.reset(); setExampleId(id) }} />} />
}

function MergeSortScene({ steps, step, setStep, playing, onTogglePlaying, onReplay, speed, onCycleSpeed, examplePicker }: { steps: MergeStep[]; step: number; setStep: (value: number) => void; playing: boolean; onTogglePlaying: () => void; onReplay: () => void; speed: number; onCycleSpeed: () => void; examplePicker: ReactNode }) {
  const state = steps[step]
  const scopeRef = useRef<HTMLDivElement>(null)
  useStepScene(scopeRef, () => {
    if (scopeRef.current?.querySelector('.sort-row.current')) animate('.sort-row.current', { opacity: [0.35, 1], translateX: [-10, 0], duration: 400, ease: 'out(3)' })
    if (scopeRef.current?.querySelector('.sort-formula')) animate('.sort-formula', { opacity: [0.5, 1], duration: 320, delay: stagger(35) })
    if (scopeRef.current?.querySelector('.stability-token')) animate('.stability-token', { translateY: [-7, 0], opacity: [0.45, 1], duration: 360, delay: stagger(55), ease: 'out(3)' })
  }, [step])
  const mergeLeft = state.rows[1].groups[0].slice().sort((a, b) => a - b).join(', ')
  const mergeRight = state.rows[1].groups[1].slice().sort((a, b) => a - b).join(', ')
  return (
    <LessonShell eyebrow="ANIMATION 01 · MERGE SORT" title={state.title} description="数字真的被分开、比较、合并；每一层的工作量都能从数组读出来，相等键还会保留身份顺序。" steps={['初始', '拆分', '基例', '合并', '复杂度']} step={step} onStepChange={setStep} playing={playing} onTogglePlaying={onTogglePlaying} onReplay={onReplay} complexity={mergeSortComplexity} speed={speed} onCycleSpeed={onCycleSpeed} examplePicker={examplePicker}>
      <div ref={scopeRef} className="lesson-canvas">
        <FormulaReadout question="这一步，公式记录了什么？" latex={state.formula} className="sort-formula" />
        <div className="lesson-grid">
          <Card>
            <CardHeader><CardTitle>递归树：每一层的实际数字</CardTitle></CardHeader>
            <CardContent>
              <div className="tree-rows">
                {state.rows.map((row, level) => (
                  <div key={level} className={['sort-row', 'tree-row', level === state.focus ? 'current' : ''].filter(Boolean).join(' ')} hidden={level >= state.visible}>
                    <span>第 {level} 层<br /><b>{row.count} 个问题</b></span>
                    <div className="node-row">
                      {row.groups.map((group, groupIndex) => (
                        <span className="number-group" key={[level, groupIndex].join('-')}>
                          {group.map((value, valueIndex) => <i key={[level, groupIndex, value, valueIndex].join('-')} className={['number-node', 'node-' + level].join(' ')}>{value}</i>)}
                        </span>
                      ))}
                    </div>
                    <em>{row.work}</em>
                  </div>
                ))}
              </div>
              <LegendStrip items={[{ tone: 'focus', label: '当前正在看的层' }, { tone: 'sorted', label: '合并完成的输出' }]} />
              {step >= 3 && (
                <MoveCallout title="合并：两个有序小组把数字送入输出" kind="one-way" moves={[{ token: `[${mergeLeft}]`, from: '左半（已有序）', to: '输出' }, { token: `[${mergeRight}]`, from: '右半（已有序）', to: '输出' }]} verdict="两个队列都已有序，队首就是各自剩余部分的最小值，较小者先进入输出。" note={`每取出一个队首，输出指针前进一格；这一层仍处理 ${state.sortedValues.length} 个数字。`} />
              )}
              {step >= 3 && <StabilityExample statement="当键值都为 4 时，先取左侧的 4A，再取右侧的 4B。" before={['4A', '4B']} after={['4A', '4B']} stable />}
              {step === 4 && <div className="sorted-output"><span>当前序列的最终输出</span><b>[{state.sortedValues.join(', ')}]</b></div>}
            </CardContent>
          </Card>
          <CalcDesk metrics={[{ label: '这一层有多少个问题', value: state.count }, { label: '每个问题有多大', value: state.size }, { label: '整层工作量', value: state.total, tone: 'green' }]} equation={state.equation} invariant={state.invariant} pseudocode={{ lines: mergeCode, active: step === 3 ? [0, 1, 2, 3] : [] }} note={state.note} />
        </div>
        {state.prediction ? <PredictionPrompt {...state.prediction} /> : null}
        <ConclusionBox>{state.conclusion}</ConclusionBox>
      </div>
    </LessonShell>
  )
}
