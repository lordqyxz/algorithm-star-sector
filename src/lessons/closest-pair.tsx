import { useState } from 'react'
import { DesignNotes, type DesignInsight } from '@/components/DesignNotes'
import { ExamplePicker, type ExampleOption } from '@/components/ExamplePicker'
import { LessonShell } from '@/components/LessonShell'
import type { ComplexityProfileData } from '@/components/ComplexityProfile'
import type { MetricItem } from '@/components/CalcDesk'
import { TracePlayer } from '@/engine/TracePlayer'
import { recordTrace, type TraceEvent } from '@/engine/events'
import type { RegionTone, ShapeScene, ShapeShape, Trace } from '@/engine/trace'
import { useLessonPlayback } from '@/hooks/useLessonPlayback'

/** 演示数据与算法分离：本文件 = 数据集 + 最近点对分治生成器（产出 Trace）+ 播放器装配。 */

type Point = { id: string; x: number; y: number; side: 'left' | 'right' }
type PointPair = { first: Point; second: Point; distance: number }
type PointExample = ExampleOption & { points: Omit<Point, 'side'>[] }

const pointExamples: readonly PointExample[] = [
  { id: 'classroom', label: '课堂混合点集', detail: '跨界最近：C–E', points: [{ id: 'A', x: 1, y: 1 }, { id: 'B', x: 2, y: 5 }, { id: 'C', x: 4, y: 2 }, { id: 'D', x: 5, y: 6 }, { id: 'E', x: 6, y: 2 }, { id: 'F', x: 8, y: 7 }, { id: 'G', x: 9, y: 1 }, { id: 'H', x: 10, y: 4 }] },
  { id: 'cross', label: '跨界候选更近', detail: '中线两侧各有近邻', points: [{ id: 'A', x: 1, y: 1 }, { id: 'B', x: 2, y: 6 }, { id: 'C', x: 4, y: 2 }, { id: 'D', x: 5, y: 6 }, { id: 'E', x: 5.5, y: 2 }, { id: 'F', x: 8, y: 7 }, { id: 'G', x: 9, y: 1 }, { id: 'H', x: 10, y: 4 }] },
  { id: 'spread', label: '分散点集', detail: '局部答案已经很小', points: [{ id: 'A', x: 1, y: 1 }, { id: 'B', x: 2, y: 6 }, { id: 'C', x: 4, y: 2 }, { id: 'D', x: 5, y: 7 }, { id: 'E', x: 7, y: 2 }, { id: 'F', x: 8, y: 6 }, { id: 'G', x: 10, y: 1 }, { id: 'H', x: 11, y: 5 }] },
  { id: 'dense', label: '中线附近密集', detail: '条带候选更多', points: [{ id: 'A', x: 1, y: 1 }, { id: 'B', x: 2, y: 2 }, { id: 'C', x: 3, y: 6 }, { id: 'D', x: 4, y: 5 }, { id: 'E', x: 5, y: 2 }, { id: 'F', x: 6, y: 3 }, { id: 'G', x: 9, y: 1 }, { id: 'H', x: 11, y: 6 }] },
]

function distance(first: Point, second: Point) {
  return Math.hypot(first.x - second.x, first.y - second.y)
}

/** 真实执行的候选扫描：每个通过 predicate 的点对都计一次比较，更优则计入 δ 更新。 */
type PairStats = { pairs: number; updates: number; crossPairs: number }

function findClosestPair(points: Point[], stats: PairStats, phase: 'half' | 'cross', predicate: (first: Point, second: Point) => boolean = () => true) {
  let best: PointPair | undefined
  for (let firstIndex = 0; firstIndex < points.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < points.length; secondIndex += 1) {
      const first = points[firstIndex]
      const second = points[secondIndex]
      if (!predicate(first, second)) continue
      stats.pairs += 1
      if (phase === 'cross') stats.crossPairs += 1
      const candidate = { first, second, distance: distance(first, second) }
      if (!best || candidate.distance < best.distance) {
        best = candidate
        stats.updates += 1
      }
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

function* runClosestPair(example: PointExample): Generator<TraceEvent> {
  const splitX = (example.points[3].x + example.points[4].x) / 2
  const points: Point[] = example.points.map(point => ({ ...point, side: point.x < splitX ? 'left' as const : 'right' as const }))
  const leftPoints = points.filter(point => point.side === 'left')
  const rightPoints = points.filter(point => point.side === 'right')
  const stats: PairStats = { pairs: 0, updates: 0, crossPairs: 0 }

  let leftPair: PointPair | undefined
  let rightPair: PointPair | undefined
  let crossPair: PointPair | undefined
  let finalPair: PointPair | undefined
  let deltaNumber = Infinity

  const screen = (point: Point) => ({ x: 48 + point.x * 43, y: 278 - point.y * 30 })

  /** 原 SVG 的 show(layer) 逻辑：每拍按层揭示坐标轴/中线/局部连线/条带/跨界连线。 */
  const planeScene = (layer: number): ShapeScene => {
    const shapes: ShapeShape[] = [
      { shape: 'line', id: 'axis', x1: 48, y1: 278, x2: 565, y2: 278, width: 1.5 },
    ]
    const splitScreenX = 48 + splitX * 43
    if (layer >= 3) {
      const stripWidth = Math.min(480, deltaNumber * 2 * 43)
      shapes.push({ shape: 'rect', id: 'strip', x: splitScreenX - stripWidth / 2, y: 42, w: stripWidth, h: 236, tone: 'key', opacity: 0.15 })
    }
    if (layer >= 1) {
      shapes.push({ shape: 'line', id: 'split', x1: splitScreenX, y1: 34, x2: splitScreenX, y2: 282, tone: 'purple', dashed: true, width: 2.5 })
      shapes.push({ shape: 'text', id: 'split-label', x: splitScreenX + 7, y: 54, text: `中线 x = ${splitX.toFixed(1)}` })
    }
    const addPair = (pair: PointPair | undefined, id: string, lineTone: RegionTone) => {
      if (!pair) return
      const first = screen(pair.first)
      const second = screen(pair.second)
      shapes.push({ shape: 'line', id: `${id}-line`, x1: first.x, y1: first.y, x2: second.x, y2: second.y, tone: lineTone })
      shapes.push({ shape: 'text', id: `${id}-label`, x: (first.x + second.x) / 2, y: Math.min(first.y, second.y) - 10, text: `${pairLabel(pair)}=${formatDistance(pair.distance)}` })
    }
    if (layer >= 2) {
      addPair(leftPair, 'left', 'blue')
      addPair(rightPair, 'right', 'orange')
    }
    if (layer >= 3) addPair(crossPair, 'cross', 'yellow')
    const finalIds = layer >= 4 && finalPair ? new Set([finalPair.first.id, finalPair.second.id]) : new Set<string>()
    for (const point of points) {
      const position = screen(point)
      const isFinal = finalIds.has(point.id)
      shapes.push({ shape: 'circle', id: `dot-${point.id}`, x: position.x, y: position.y, r: isFinal ? 10 : 8, tone: isFinal ? 'sorted' : point.side === 'left' ? 'focus' : 'pivot', label: point.id, labelDy: position.y > 225 ? 21 : -14 })
    }
    return { kind: 'shapes', id: 'plane', label: '点集：距离是图上的线段', width: 600, height: 330, shapes }
  }

  const metrics = (deltaLeft: string | number, deltaRight: string | number, delta: string | number, showCross: boolean): MetricItem[] => [
    { label: '左半边最小距离 δL', value: deltaLeft },
    { label: '右半边最小距离 δR', value: deltaRight },
    { label: '当前最好 δ', value: delta, tone: 'green' },
    { label: '候选点对数', value: stats.pairs, tone: 'orange' },
    { label: 'δ 更新次数', value: stats.updates, tone: 'purple' },
    ...(showCross ? [{ label: '跨界候选数', value: stats.crossPairs, tone: 'blue' } as MetricItem] : []),
  ]

  yield { t: 'scene', scene: planeScene(0) }
  yield { t: 'metrics', metrics: metrics('—', '—', '—', false) }
  yield { t: 'legend', legend: [{ tone: 'focus', label: '左半边的点' }, { tone: 'pivot', label: '右半边的点' }, { tone: 'key', label: '中线条带候选' }, { tone: 'sorted', label: '全局最近点对' }] }
  yield {
    t: 'message',
    step: {
      title: '看问题：从所有点对中找最小距离',
      tab: '看问题',
      question: '这一步，公式记录了图上的什么？',
      formula: String.raw`\text{目标：}\min d(P_i,P_j)`,
      equation: String.raw`\text{枚举所有点对作为候选}`,
      invariant: `还没有排除任何点：全部 ${points.length} 个点都是候选。`,
      note: `暴力枚举要比较 ${points.length}×${points.length} 级别的点对。`,
      conclusion: '下一步：画中线，把大问题分成左右两个小问题。',
      pseudocode: { lines: closestCode, active: [] },
    },
  }
  yield { t: 'step' }

  yield { t: 'scene', scene: planeScene(1) }
  yield { t: 'metrics', metrics: metrics('待求', '待求', '待求', false) }
  yield {
    t: 'message',
    step: {
      title: '一刀分开：点集变成左右两半',
      tab: '分开',
      question: '这一步，公式记录了图上的什么？',
      formula: String.raw`P=P_l\cup P_r`,
      equation: String.raw`${points.length}\text{ 个点}\to\text{左 }${leftPoints.length}+\text{右 }${rightPoints.length}`,
      invariant: '分半只按 x 坐标进行：全局最近点对要么在左半、右半，要么横跨中线。',
      note: '最近点对可能在一边，也可能跨过中线。',
      conclusion: '中线出现了，但还不能宣布答案。',
      pseudocode: { lines: closestCode, active: [0] },
    },
  }
  yield { t: 'step' }

  leftPair = findClosestPair(leftPoints, stats, 'half')
  rightPair = findClosestPair(rightPoints, stats, 'half')
  deltaNumber = Math.min(leftPair?.distance ?? Infinity, rightPair?.distance ?? Infinity)
  // 预测文案需要引用跨界候选（原实现预先算好）；用独立计数器预览，不计入正式计数。
  const stripPredicate = (first: Point, second: Point) => first.side !== second.side && Math.abs(first.x - splitX) <= deltaNumber && Math.abs(second.x - splitX) <= deltaNumber
  const crossPredicate = (first: Point, second: Point) => first.side !== second.side
  const crossPreview = findClosestPair(points, { pairs: 0, updates: 0, crossPairs: 0 }, 'cross', stripPredicate) ?? findClosestPair(points, { pairs: 0, updates: 0, crossPairs: 0 }, 'cross', crossPredicate)
  yield { t: 'scene', scene: planeScene(2) }
  yield { t: 'metrics', metrics: metrics(formatDistance(leftPair?.distance), formatDistance(rightPair?.distance), formatDistance(deltaNumber), false) }
  yield {
    t: 'message',
    step: {
      title: '各自求解：先得到两个局部答案',
      tab: '局部解',
      question: '这一步，公式记录了图上的什么？',
      formula: String.raw`\delta=\min(${formatDistance(leftPair?.distance)},${formatDistance(rightPair?.distance)})=${formatDistance(deltaNumber)}`,
      equation: String.raw`\delta=\min(\delta_L,\delta_R)=${formatDistance(deltaNumber)}`,
      invariant: `δL、δR 只覆盖各自半边：全局答案要么是它们之一，要么横跨中线。`,
      note: `${pairLabel(leftPair)}、${pairLabel(rightPair)} 是各自局部最短。`,
      conclusion: '局部最短不一定是全局最短，还要检查边界。',
      prediction: { prompt: '左右两边的最近距离已经算出，可以直接宣布全局答案了吗？', options: ['可以，局部最优就是全局最优', '不可以，还要检查中线附近的跨界点对', '不能比较小数'], answer: 1, explanation: `${pairLabel(crossPreview)} 横跨中线，距离 ${formatDistance(crossPreview?.distance)}；分治法必须在合并阶段保留跨界候选。` },
      pseudocode: { lines: closestCode, active: [1] },
    },
  }
  yield { t: 'step' }

  crossPair = findClosestPair(points, stats, 'cross', stripPredicate) ?? findClosestPair(points, stats, 'cross', crossPredicate)
  finalPair = chooseClosest(leftPair, rightPair, crossPair)
  yield { t: 'scene', scene: planeScene(3) }
  yield { t: 'metrics', metrics: metrics(formatDistance(leftPair?.distance), formatDistance(rightPair?.distance), `${formatDistance(deltaNumber)} → ${formatDistance(crossPair?.distance)}`, true) }
  yield {
    t: 'message',
    step: {
      title: '检查条带：只看可能跨界的候选',
      tab: '条带',
      question: '这一步，公式记录了图上的什么？',
      formula: String.raw`\text{条带宽度}=2\delta=${formatDistance(deltaNumber * 2)}\ ;\ \text{${pairLabel(crossPair)}}=${formatDistance(crossPair?.distance)}`,
      equation: '\\text{' + pairLabel(crossPair) + '}=' + formatDistance(crossPair?.distance),
      invariant: '条带只剔除离中线超过 δ 的点：保留下来的跨界候选一个都不丢。',
      note: '跨界点离中线超过 δ，就不可能更近；条带只保留必要候选。',
      conclusion: `${pairLabel(crossPair)} 横跨中线，距离 ${formatDistance(crossPair?.distance)}，可能推翻局部答案。`,
      pseudocode: { lines: closestCode, active: [2] },
    },
  }
  yield { t: 'step' }

  yield { t: 'scene', scene: planeScene(4) }
  yield { t: 'metrics', metrics: metrics(formatDistance(leftPair?.distance), formatDistance(rightPair?.distance), formatDistance(finalPair?.distance), true) }
  yield {
    t: 'message',
    step: {
      title: '全局答案：跨界候选赢了',
      tab: '答案',
      question: '这一步，公式记录了图上的什么？',
      formula: '\\delta^*=\\text{' + pairLabel(finalPair) + '}=' + formatDistance(finalPair?.distance) + '\\ ;\\ T(n)=2T(n/2)+O(n)',
      equation: '\\min(' + formatDistance(leftPair?.distance) + ',' + formatDistance(rightPair?.distance) + ',' + formatDistance(crossPair?.distance) + ')=' + formatDistance(finalPair?.distance),
      invariant: '左半、右半、跨界三个候选取最小：全局最近点对必然是其中之一。',
      note: '递归树处理两半，条带扫描负责线性合并。',
      moves: {
        kind: 'one-way',
        title: '合并：左、右、跨界三个候选汇成全局答案',
        moves: [
          { token: `${pairLabel(leftPair)} = ${formatDistance(leftPair?.distance)}`, from: '左局部答案 δL', to: '取最小' },
          { token: `${pairLabel(rightPair)} = ${formatDistance(rightPair?.distance)}`, from: '右局部答案 δR', to: '取最小' },
          { token: `${pairLabel(crossPair)} = ${formatDistance(crossPair?.distance)}`, from: '跨界候选', to: '取最小' },
        ],
        verdict: `三者取最小：${pairLabel(finalPair)} = ${formatDistance(finalPair?.distance)} 胜出，它就是全局最近点对。`,
        note: '递归树处理两半，条带扫描负责线性合并；每个候选都对应图上一条真实的距离比较。',
      },
      conclusion: '整体复杂度 Θ(n log n)：分成两半，各自求解，再线性合并。',
      pseudocode: { lines: closestCode, active: [2] },
    },
  }
  yield { t: 'step' }

  yield { t: 'metrics', metrics: metrics(formatDistance(leftPair?.distance), formatDistance(rightPair?.distance), formatDistance(finalPair?.distance), true) }
  yield {
    t: 'message',
    step: {
      title: `完成：${pairLabel(finalPair)} = ${formatDistance(finalPair?.distance)} 就是全局最近点对`,
      tab: '完成',
      question: '这一步，公式记录了图上的什么？',
      formula: '\\delta^*=\\text{' + pairLabel(finalPair) + '}=' + formatDistance(finalPair?.distance),
      equation: String.raw`T(n)=2T(n/2)+O(n)\Rightarrow\Theta(n\log n)`,
      invariant: '左半、右半、跨界三个候选取最小：全局最近点对必然是其中之一。',
      note: `本次真实执行：候选点对 ${stats.pairs} 个、δ 更新 ${stats.updates} 次、跨界候选 ${stats.crossPairs} 个——条带把合并阶段的比较压到必要候选。`,
      conclusion: '换一组点集再跑一遍：跨界更近、分散点集、中线密集——条带候选越多，几何性质替算法省下的比较就越明显。',
      pseudocode: { lines: closestCode, active: [] },
    },
  }
  yield { t: 'step' }
}

export const buildClosestPairTrace = (example: PointExample): Trace => recordTrace('SANDBOX 04 · CLOSEST PAIR', '局部答案还不够：只有检查中线附近的候选，才能得到全局最近点对。', runClosestPair(example))

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
  const trace = buildClosestPairTrace(example)
  const playback = useLessonPlayback(trace.steps.length)
  return <LessonShell eyebrow={trace.eyebrow} title={trace.steps[playback.step].title} description={trace.description} steps={trace.steps.map(item => item.tab ?? '推演')} step={playback.step} onStepChange={playback.setStep} playing={playback.playing} onTogglePlaying={playback.togglePlaying} onReplay={playback.replay} speed={playback.speed} onCycleSpeed={playback.cycleSpeed} complexity={closestPairComplexity} examplePicker={<ExamplePicker examples={pointExamples} value={exampleId} onChange={id => { playback.reset(); setExampleId(id) }} />}>
    <TracePlayer trace={trace} step={playback.step} />
    <DesignNotes insight={closestPairInsight} />
  </LessonShell>
}
