import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { animate } from 'animejs'
import { CalcDesk } from '@/components/CalcDesk'
import { DesignNotes, type DesignInsight } from '@/components/DesignNotes'
import { ExamplePicker, type ExampleOption } from '@/components/ExamplePicker'
import { FormulaReadout, ConclusionBox } from '@/components/FormulaReadout'
import { LegendStrip } from '@/components/LegendStrip'
import { LessonShell } from '@/components/LessonShell'
import { MoveCallout } from '@/components/MoveCallout'
import { PredictionPrompt, type PredictionData } from '@/components/PredictionPrompt'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ComplexityProfileData } from '@/components/ComplexityProfile'
import { useLessonPlayback } from '@/hooks/useLessonPlayback'
import { useStepScene } from '@/hooks/useStepScene'

type Point = { id: string; x: number; y: number; side: 'left' | 'right' }
type PointPair = { first: Point; second: Point; distance: number }
type PointExample = ExampleOption & { points: Omit<Point, 'side'>[] }
type PointStep = {
  title: string
  formula: string
  left: string
  right: string
  delta: string
  equation: string
  invariant: string
  note: string
  conclusion: string
  layer: number
  points: Point[]
  splitX: number
  deltaNumber: number
  leftPair?: PointPair
  rightPair?: PointPair
  crossPair?: PointPair
  finalPair?: PointPair
  prediction?: PredictionData
}

const pointExamples: readonly PointExample[] = [
  { id: 'classroom', label: '课堂混合点集', detail: '跨界最近：C–E', points: [{ id: 'A', x: 1, y: 1 }, { id: 'B', x: 2, y: 5 }, { id: 'C', x: 4, y: 2 }, { id: 'D', x: 5, y: 6 }, { id: 'E', x: 6, y: 2 }, { id: 'F', x: 8, y: 7 }, { id: 'G', x: 9, y: 1 }, { id: 'H', x: 10, y: 4 }] },
  { id: 'cross', label: '跨界候选更近', detail: '中线两侧各有近邻', points: [{ id: 'A', x: 1, y: 1 }, { id: 'B', x: 2, y: 6 }, { id: 'C', x: 4, y: 2 }, { id: 'D', x: 5, y: 6 }, { id: 'E', x: 5.5, y: 2 }, { id: 'F', x: 8, y: 7 }, { id: 'G', x: 9, y: 1 }, { id: 'H', x: 10, y: 4 }] },
  { id: 'spread', label: '分散点集', detail: '局部答案已经很小', points: [{ id: 'A', x: 1, y: 1 }, { id: 'B', x: 2, y: 6 }, { id: 'C', x: 4, y: 2 }, { id: 'D', x: 5, y: 7 }, { id: 'E', x: 7, y: 2 }, { id: 'F', x: 8, y: 6 }, { id: 'G', x: 10, y: 1 }, { id: 'H', x: 11, y: 5 }] },
  { id: 'dense', label: '中线附近密集', detail: '条带候选更多', points: [{ id: 'A', x: 1, y: 1 }, { id: 'B', x: 2, y: 2 }, { id: 'C', x: 3, y: 6 }, { id: 'D', x: 4, y: 5 }, { id: 'E', x: 5, y: 2 }, { id: 'F', x: 6, y: 3 }, { id: 'G', x: 9, y: 1 }, { id: 'H', x: 11, y: 6 }] },
]

function distance(first: Point, second: Point) {
  return Math.hypot(first.x - second.x, first.y - second.y)
}

function findClosestPair(points: Point[], predicate: (first: Point, second: Point) => boolean = () => true) {
  let best: PointPair | undefined
  for (let firstIndex = 0; firstIndex < points.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < points.length; secondIndex += 1) {
      const first = points[firstIndex]
      const second = points[secondIndex]
      if (!predicate(first, second)) continue
      const candidate = { first, second, distance: distance(first, second) }
      if (!best || candidate.distance < best.distance) best = candidate
    }
  }
  return best
}

function formatDistance(value: number | undefined) {
  return value === undefined ? '—' : value.toFixed(2).replace(/\.?(0+)$/, '')
}

function pairLabel(pair: PointPair | undefined) {
  return pair ? `${pair.first.id}–${pair.second.id}` : '—'
}

function chooseClosest(...pairs: Array<PointPair | undefined>) {
  return pairs.filter((pair): pair is PointPair => Boolean(pair)).sort((first, second) => first.distance - second.distance)[0]
}

const closestCode = [
  { code: 'DIVIDE：按 x 画中线，分成左右两半', note: '一刀切开，点各归各半' },
  { code: 'CONQUER：递归求两半的最近点对', note: '得到 δL 与 δR' },
  { code: 'COMBINE：检查中线两侧 2δ 条带', note: '跨界候选才可能推翻局部答案' },
]

function buildPointSteps(example: PointExample): PointStep[] {
  const splitX = (example.points[3].x + example.points[4].x) / 2
  const points = example.points.map(point => ({ ...point, side: point.x < splitX ? 'left' as const : 'right' as const }))
  const leftPoints = points.filter(point => point.side === 'left')
  const rightPoints = points.filter(point => point.side === 'right')
  const leftPair = findClosestPair(leftPoints)
  const rightPair = findClosestPair(rightPoints)
  const deltaNumber = Math.min(leftPair?.distance ?? Infinity, rightPair?.distance ?? Infinity)
  const crossPair = findClosestPair(points, (first, second) => first.side !== second.side && Math.abs(first.x - splitX) <= deltaNumber && Math.abs(second.x - splitX) <= deltaNumber) ?? findClosestPair(points, (first, second) => first.side !== second.side)
  const finalPair = chooseClosest(leftPair, rightPair, crossPair)
  const shared = { points, splitX, deltaNumber, leftPair, rightPair, crossPair, finalPair }
  return [
    { ...shared, title: '看问题：从所有点对中找最小距离', formula: String.raw`\text{目标：}\min d(P_i,P_j)`, left: '—', right: '—', delta: '—', equation: String.raw`\text{枚举所有点对作为候选}`, invariant: `还没有排除任何点：全部 ${points.length} 个点都是候选。`, note: `暴力枚举要比较 ${points.length}×${points.length} 级别的点对。`, conclusion: '下一步：画中线，把大问题分成左右两个小问题。', layer: 0 },
    { ...shared, title: '一刀分开：点集变成左右两半', formula: String.raw`P=P_l\cup P_r`, left: '待求', right: '待求', delta: '待求', equation: String.raw`${points.length}\text{ 个点}\to\text{左 }${leftPoints.length}+\text{右 }${rightPoints.length}`, invariant: '分半只按 x 坐标进行：全局最近点对要么在左半、右半，要么横跨中线。', note: '最近点对可能在一边，也可能跨过中线。', conclusion: '中线出现了，但还不能宣布答案。', layer: 1 },
    { ...shared, title: '各自求解：先得到两个局部答案', formula: String.raw`\delta=\min(${formatDistance(leftPair?.distance)},${formatDistance(rightPair?.distance)})=${formatDistance(deltaNumber)}`, left: formatDistance(leftPair?.distance), right: formatDistance(rightPair?.distance), delta: formatDistance(deltaNumber), equation: String.raw`\delta=\min(\delta_L,\delta_R)=${formatDistance(deltaNumber)}`, invariant: `δL、δR 只覆盖各自半边：全局答案要么是它们之一，要么横跨中线。`, note: `${pairLabel(leftPair)}、${pairLabel(rightPair)} 是各自局部最短。`, conclusion: '局部最短不一定是全局最短，还要检查边界。', layer: 2, prediction: { prompt: '左右两边的最近距离已经算出，可以直接宣布全局答案了吗？', options: ['可以，局部最优就是全局最优', '不可以，还要检查中线附近的跨界点对', '不能比较小数'], answer: 1, explanation: `${pairLabel(crossPair)} 横跨中线，距离 ${formatDistance(crossPair?.distance)}；分治法必须在合并阶段保留跨界候选。` } },
    { ...shared, title: '检查条带：只看可能跨界的候选', formula: String.raw`\text{条带宽度}=2\delta=${formatDistance(deltaNumber * 2)}\ ;\ \text{${pairLabel(crossPair)}}=${formatDistance(crossPair?.distance)}`, left: formatDistance(leftPair?.distance), right: formatDistance(rightPair?.distance), delta: `${formatDistance(deltaNumber)} → ${formatDistance(crossPair?.distance)}`, equation: '\\text{' + pairLabel(crossPair) + '}=' + formatDistance(crossPair?.distance), invariant: '条带只剔除离中线超过 δ 的点：保留下来的跨界候选一个都不丢。', note: '跨界点离中线超过 δ，就不可能更近；条带只保留必要候选。', conclusion: `${pairLabel(crossPair)} 横跨中线，距离 ${formatDistance(crossPair?.distance)}，可能推翻局部答案。`, layer: 3 },
    { ...shared, title: '全局答案：跨界候选赢了', formula: '\\delta^*=\\text{' + pairLabel(finalPair) + '}=' + formatDistance(finalPair?.distance) + '\\ ;\\ T(n)=2T(n/2)+O(n)', left: formatDistance(leftPair?.distance), right: formatDistance(rightPair?.distance), delta: formatDistance(finalPair?.distance), equation: '\\min(' + formatDistance(leftPair?.distance) + ',' + formatDistance(rightPair?.distance) + ',' + formatDistance(crossPair?.distance) + ')=' + formatDistance(finalPair?.distance), invariant: '左半、右半、跨界三个候选取最小：全局最近点对必然是其中之一。', note: '递归树处理两半，条带扫描负责线性合并。', conclusion: '整体复杂度 Θ(n log n)：分成两半，各自求解，再线性合并。', layer: 4 },
  ]
}

const closestPairInsight: DesignInsight = {
  observation: '几何性质替算法干活：距离超过 δ 的点对不可能更近，于是中线条带把跨界候选压缩到寥寥几个——合并阶段从"全比"变成"只查必要的"。',
  contrasts: [
    { alternative: '暴力枚举所有点对', whyNot: 'Θ(n²) 在 n 大时不可行；分治压到 Θ(n log n)，代价是预处理要按 x 排序、条带内还要按 y 扫描。' },
    { alternative: '只算左右两半的答案', whyNot: '会漏掉跨界最近对（本课数据集就是反例）——分治的正确性永远在"合并"这一步补全。' },
  ],
  transfer: { prompt: '条带宽度为什么取 2δ 而不是 δ？', options: ['最近点对可能分居中线两侧，两端点各自到中线的距离都可能达到 δ', '条带越宽越保险', 'δ 是点的直径'], answer: 0, explanation: '跨界点对的两个端点分属两侧，各自离中线最多 δ；以中线为中心、两侧各 δ 的 2δ 条带才不漏候选。' },
}

const closestPairComplexity: ComplexityProfileData = {
  title: '最近点对：数据形状不改变分治的阶数',
  subtitle: '以下是标准分治版本：先排序，再递归求左右答案，最后检查中线条带。',
  cases: [
    { label: '最好', complexity: 'Θ(n log n)', condition: '点很分散，也不能跳过分治和条带检查。', example: '均匀分布：(0,0)、(10,0)、(0,10)…', explanation: '距离大小会改变常数，但算法仍要完成排序、分半和合并。', tone: 'best' },
    { label: '平均', complexity: 'Θ(n log n)', condition: '点是随机分布的平面点。', example: '随机点集：P₁…Pₙ', explanation: '平均情况下条带候选较少，但递归树和排序成本仍在。', tone: 'average' },
    { label: '最差', complexity: 'Θ(n log n)', condition: '很多点靠近中线，条带候选变多。', example: 'Pᵢ=(5±εᵢ, yᵢ)', explanation: '条带检查可能更忙，但几何性质仍把合并限制在线性规模。', tone: 'worst' },
  ],
  footer: '若改成暴力枚举所有点对，才会变成 Θ(n²)；本动画展示的是分治版。',
}

export function ClosestPairLesson() {
  const [exampleId, setExampleId] = useState(pointExamples[0].id)
  const example = pointExamples.find(item => item.id === exampleId) ?? pointExamples[0]
  const steps = buildPointSteps(example)
  const playback = useLessonPlayback(steps.length)
  return <PointLesson steps={steps} step={playback.step} setStep={playback.setStep} playing={playback.playing} onTogglePlaying={playback.togglePlaying} onReplay={playback.replay} speed={playback.speed} onCycleSpeed={playback.cycleSpeed} examplePicker={<ExamplePicker examples={pointExamples} value={exampleId} onChange={id => { playback.reset(); setExampleId(id) }} />} />
}

function PointLesson({ steps, step, setStep, playing, onTogglePlaying, onReplay, speed, onCycleSpeed, examplePicker }: { steps: PointStep[]; step: number; setStep: (value: number) => void; playing: boolean; onTogglePlaying: () => void; onReplay: () => void; speed: number; onCycleSpeed: () => void; examplePicker: ReactNode }) {
  const state = steps[step]
  const scopeRef = useRef<HTMLDivElement>(null)
  useStepScene(scopeRef, () => {
    if (scopeRef.current?.querySelector('.point-visual')) animate('.point-visual', { opacity: [0.55, 1], duration: 420, ease: 'out(3)' })
  }, [step])
  const show = (layer: number) => state.layer >= layer
  const screen = (point: Point) => ({ x: 48 + point.x * 43, y: 278 - point.y * 30 })
  const renderPair = (pair: PointPair | undefined, className: string, opacity: number) => {
    if (!pair) return null
    const first = screen(pair.first)
    const second = screen(pair.second)
    return <><line className={`pair-line ${className}`} x1={first.x} y1={first.y} x2={second.x} y2={second.y} opacity={opacity} /><text className="distance-label" x={(first.x + second.x) / 2} y={Math.min(first.y, second.y) - 10} opacity={opacity}>{pairLabel(pair)}={formatDistance(pair.distance)}</text></>
  }
  const splitScreenX = 48 + state.splitX * 43
  const stripWidth = Math.min(480, state.deltaNumber * 2 * 43)
  const finalIds = show(4) && state.finalPair ? new Set([state.finalPair.first.id, state.finalPair.second.id]) : new Set<string>()
  return (
    <LessonShell eyebrow="SANDBOX 04 · CLOSEST PAIR" title={state.title} description="局部答案还不够：只有检查中线附近的候选，才能得到全局最近点对。" steps={['看问题', '分开', '局部解', '条带', '答案']} step={step} onStepChange={setStep} playing={playing} onTogglePlaying={onTogglePlaying} onReplay={onReplay} complexity={closestPairComplexity} speed={speed} onCycleSpeed={onCycleSpeed} examplePicker={examplePicker}>
      <div ref={scopeRef} className="lesson-canvas">
        <FormulaReadout question="这一步，公式记录了图上的什么？" latex={state.formula} className="point-visual" />
        <div className="lesson-grid">
          <Card>
            <CardHeader><CardTitle>点集：距离是图上的线段</CardTitle></CardHeader>
            <CardContent>
              <svg className="point-canvas" viewBox="0 0 600 330" role="img" aria-label="最近点对分治过程">
                <line className="axis" x1="48" y1="278" x2="565" y2="278" />
                <rect className="strip" x={splitScreenX - stripWidth / 2} y="42" width={stripWidth} height="236" rx="4" opacity={show(3) ? .2 : 0} />
                <line className="split-line" x1={splitScreenX} y1="34" x2={splitScreenX} y2="282" opacity={show(1) ? 1 : 0} />
                <text className="svg-note" x={splitScreenX + 7} y="54" opacity={show(1) ? 1 : 0}>中线 x = {state.splitX.toFixed(1)}</text>
                {renderPair(state.leftPair, 'left-pair', show(2) ? 1 : 0)}
                {renderPair(state.rightPair, 'right-pair', show(2) ? 1 : 0)}
                {renderPair(state.crossPair, 'cross-pair', show(3) ? 1 : 0)}
                {state.points.map(point => { const position = screen(point); return <g key={point.id}><circle className={`point-dot ${point.side} ${finalIds.has(point.id) ? 'final' : ''}`} cx={position.x} cy={position.y} r={finalIds.has(point.id) ? 10 : 8} /><text className="point-label" x={position.x - 12} y={position.y + (position.y > 225 ? 21 : -14)}>{point.id}</text></g> })}
              </svg>
              <LegendStrip items={[{ tone: 'focus', label: '左半边的点' }, { tone: 'pivot', label: '右半边的点' }, { tone: 'key', label: '中线条带候选' }, { tone: 'sorted', label: '全局最近点对' }]} />
              {step === 4 && (
                <MoveCallout title="合并：左、右、跨界三个候选汇成全局答案" kind="one-way" moves={[{ token: `${pairLabel(state.leftPair)} = ${formatDistance(state.leftPair?.distance)}`, from: '左局部答案 δL', to: '取最小' }, { token: `${pairLabel(state.rightPair)} = ${formatDistance(state.rightPair?.distance)}`, from: '右局部答案 δR', to: '取最小' }, { token: `${pairLabel(state.crossPair)} = ${formatDistance(state.crossPair?.distance)}`, from: '跨界候选', to: '取最小' }]} verdict={`三者取最小：${pairLabel(state.finalPair)} = ${formatDistance(state.finalPair?.distance)} 胜出，它就是全局最近点对。`} note="递归树处理两半，条带扫描负责线性合并；每个候选都对应图上一条真实的距离比较。" />
              )}
            </CardContent>
          </Card>
          <CalcDesk metrics={[{ label: '左半边最小距离 δL', value: state.left }, { label: '右半边最小距离 δR', value: state.right }, { label: '当前最好 δ', value: state.delta, tone: 'green' }]} equation={state.equation} invariant={state.invariant} pseudocode={{ lines: closestCode, active: step === 1 ? [0] : step === 2 ? [1] : step >= 3 ? [2] : [] }} note={state.note} />
        </div>
        {state.prediction ? <PredictionPrompt {...state.prediction} /> : null}
        <DesignNotes insight={closestPairInsight} />
        <ConclusionBox>{state.conclusion}</ConclusionBox>
      </div>
    </LessonShell>
  )
}
