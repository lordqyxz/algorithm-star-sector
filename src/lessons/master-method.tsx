import { useState } from 'react'
import { DesignNotes, type DesignInsight } from '@/components/DesignNotes'
import { ExamplePicker, type ExampleOption } from '@/components/ExamplePicker'
import { LessonShell } from '@/components/LessonShell'
import type { ComplexityProfileData } from '@/components/ComplexityProfile'
import type { MetricItem } from '@/components/CalcDesk'
import { TracePlayer } from '@/engine/TracePlayer'
import { recordTrace, type TraceEvent } from '@/engine/events'
import type { BarScene, Trace } from '@/engine/trace'
import type { PredictionData } from '@/components/PredictionPrompt'
import { useLessonPlayback } from '@/hooks/useLessonPlayback'

/** 演示数据与算法分离：本文件 = 数据集（三个 f(m) 场景 × 规模 n）+ 递归树每层工作量生成器（产出 Trace）+ 播放器装配。 */

type MasterScenario = {
  id: string
  title: (n: number) => string
  formula: (n: number) => string
  fLabel: string
  f: (m: number) => number
  ratio: string
  r: number
  note: (levels: readonly number[]) => string
  conclusion: (levels: readonly number[]) => string
  prediction?: (n: number, levels: readonly number[]) => PredictionData
}

const A = 2
const B = 2

/** 真实按 T(n)=aT(n/b)+f(n) 展开每层：W_i = a^i · f(n/b^i)，直到规模降到 1。 */
function levelsOf(n: number, f: (m: number) => number): number[] {
  const levels: number[] = []
  for (let i = 0; ; i += 1) {
    const m = n / B ** i
    levels.push(B ** i * f(m))
    if (m <= 1) break
  }
  return levels
}

const masterScenarios: readonly MasterScenario[] = [
  {
    id: 'equal',
    title: n => `场景一：每层都有 ${n} 的工作量`,
    formula: n => `T(${n})=2T(${n / 2})+${n}`,
    fLabel: 'f(m)=m',
    f: m => m,
    ratio: 'r=1',
    r: 1,
    note: levels => `柱高逐层读出工作量：${levels.join('→')}，相邻柱子等高。`,
    conclusion: levels => `相邻两层一样长；${levels.length} 层相加，所以总量是 Θ(n log n)。`,
    prediction: (n, levels) => ({ prompt: `当每层工作量都是 ${n} 时，哪一层会主导总复杂度？`, options: ['根部，因为它最先出现', '每层贡献相同，要看层数', '叶子，因为它数量最多'], answer: 1, explanation: `每层都是 ${n}，差别来自层数；${levels.length} 层各贡献 ${n}，所以总量是 ${n}×${levels.length}，也就是 Θ(n log n)。` }),
  },
  {
    id: 'grow',
    title: () => '场景二：改变 f(m)，看柱子改变方向',
    formula: () => 'W_i=a^i f(n/b^i)',
    fLabel: 'f(m)=1',
    f: () => 1,
    ratio: 'r=2',
    r: 2,
    note: levels => `柱高序列 ${levels.join('→')}：每往下一层，工作量乘 2。`,
    conclusion: () => '越往下越大，叶子层主导，答案接近 Θ(n)。',
    prediction: (_n, levels) => ({ prompt: '相邻层比例 r=2，意味着从上一层到下一层发生了什么？', options: ['工作量减半', '工作量保持不变', '工作量翻倍'], answer: 2, explanation: `柱高序列 ${levels.join('→')}，每往下一层工作量都乘 2，因此叶子层主导。` }),
  },
  {
    id: 'shrink',
    title: () => '场景三：根部开始主导',
    formula: () => 'W_i=a^i(n/b^i)^2',
    fLabel: 'f(m)=m^2',
    f: m => m * m,
    ratio: 'r=0.5',
    r: 0.5,
    note: levels => `柱高序列 ${levels.join('→')}：每往下一层，工作量减半。`,
    conclusion: () => '越往下越小，根部主导，答案接近 Θ(n²)。',
  },
]

type MasterExample = ExampleOption & { n: number }

const masterExamples: readonly MasterExample[] = [
  { id: 'n16', label: '课堂基准 n=16', detail: '三场景 · 5 层', n: 16 },
  { id: 'n8', label: '小规模 n=8', detail: '三场景 · 4 层', n: 8 },
  { id: 'n32', label: '大规模 n=32', detail: '三场景 · 6 层', n: 32 },
]

const masterCode = [
  { code: '展开：T(n) = a·T(n/b) + f(n)', note: '本课固定 a=2、b=2' },
  { code: '每层：W_i = a^i · f(n/b^i)', note: '柱高就是该层的 Wᵢ' },
  { code: '求和：总量 = Σ Wᵢ', note: '柱子逐根相加' },
  { code: '比值：r = Wᵢ₊₁ / Wᵢ，与 1 比大小', note: 'r=1 / r>1 / r<1 定主导' },
]

function barsSceneOf(levels: readonly number[]): BarScene {
  return {
    kind: 'bars',
    id: 'wbars',
    label: '递归树每层总工作量',
    max: Math.max(...levels),
    unit: '每层工作量',
    bars: levels.map((work, index) => ({ id: `l${index}`, display: String(work), value: work, caption: `第 ${index} 层` })),
  }
}

function dominantOf(r: number) {
  return r === 1 ? '每层等量' : r > 1 ? '叶子层' : '根部'
}

function* runMasterMethod(example: MasterExample): Generator<TraceEvent> {
  const { n } = example
  const levelsByScenario = masterScenarios.map(scenario => levelsOf(n, scenario.f))
  const totals = levelsByScenario.map(levels => levels.reduce((sum, work) => sum + work, 0))

  const metrics = (scenarioIndex: number): MetricItem[] => {
    const scenario = masterScenarios[scenarioIndex]
    const levels = levelsByScenario[scenarioIndex]
    return [
      { label: '本场景的 f(m)', value: scenario.fLabel },
      { label: '根部工作量 W₀', value: levels[0], tone: 'blue' },
      { label: '叶子层工作量', value: levels[levels.length - 1], tone: 'orange' },
      { label: '相邻层比例', value: scenario.ratio, tone: 'green' },
      { label: '展开层数', value: levels.length, tone: 'purple' },
      { label: '累计工作量', value: totals[scenarioIndex] },
    ]
  }

  yield { t: 'scene', scene: barsSceneOf(levelsByScenario[0]) }
  yield { t: 'metrics', metrics: metrics(0) }
  yield { t: 'legend', legend: [{ tone: 'focus', label: '柱高 = 该层工作量 Wᵢ' }, { tone: 'target', label: '相邻柱高比 r 决定主导层' }] }
  yield {
    t: 'message',
    step: {
      title: masterScenarios[0].title(n),
      tab: '平衡',
      question: '公式不是结论，它是柱状图的读数',
      formula: masterScenarios[0].formula(n),
      formulaHint: `${masterScenarios[0].fLabel} · ${masterScenarios[0].ratio}`,
      equation: String.raw`W_i = a^i f(n / b^i);\quad ${masterScenarios[0].ratio}`,
      invariant: 'a、b、n 固定，只改变 f(m)，每层工作量序列随之改变。',
      note: masterScenarios[0].note(levelsByScenario[0]),
      conclusion: masterScenarios[0].conclusion(levelsByScenario[0]),
      prediction: masterScenarios[0].prediction?.(n, levelsByScenario[0]),
      pseudocode: { lines: masterCode, active: [0, 1] },
    },
  }
  yield { t: 'step' }

  yield { t: 'scene', scene: barsSceneOf(levelsByScenario[1]) }
  yield { t: 'metrics', metrics: metrics(1) }
  yield {
    t: 'message',
    step: {
      title: masterScenarios[1].title(n),
      tab: '叶子主导',
      question: '公式不是结论，它是柱状图的读数',
      formula: masterScenarios[1].formula(n),
      formulaHint: `${masterScenarios[1].fLabel} · ${masterScenarios[1].ratio}`,
      equation: String.raw`W_i = a^i f(n / b^i);\quad ${masterScenarios[1].ratio}`,
      invariant: 'a、b、n 固定，只改变 f(m)，每层工作量序列随之改变。',
      note: masterScenarios[1].note(levelsByScenario[1]),
      conclusion: masterScenarios[1].conclusion(levelsByScenario[1]),
      prediction: masterScenarios[1].prediction?.(n, levelsByScenario[1]),
      pseudocode: { lines: masterCode, active: [1] },
    },
  }
  yield { t: 'step' }

  yield { t: 'scene', scene: barsSceneOf(levelsByScenario[2]) }
  yield { t: 'metrics', metrics: metrics(2) }
  yield {
    t: 'message',
    step: {
      title: masterScenarios[2].title(n),
      tab: '根部主导',
      question: '公式不是结论，它是柱状图的读数',
      formula: masterScenarios[2].formula(n),
      formulaHint: `${masterScenarios[2].fLabel} · ${masterScenarios[2].ratio}`,
      equation: String.raw`W_i = a^i f(n / b^i);\quad ${masterScenarios[2].ratio}`,
      invariant: 'a、b、n 固定，只改变 f(m)，每层工作量序列随之改变。',
      note: masterScenarios[2].note(levelsByScenario[2]),
      conclusion: masterScenarios[2].conclusion(levelsByScenario[2]),
      pseudocode: { lines: masterCode, active: [1] },
    },
  }
  yield { t: 'step' }

  yield { t: 'metrics', metrics: [
    { label: `场景一总量（${masterScenarios[0].ratio}）`, value: totals[0], tone: 'blue' },
    { label: `场景二总量（${masterScenarios[1].ratio}）`, value: totals[1], tone: 'orange' },
    { label: `场景三总量（${masterScenarios[2].ratio}）`, value: totals[2], tone: 'purple' },
    { label: '展开层数', value: levelsByScenario[0].length, tone: 'green' },
  ] }
  yield {
    t: 'message',
    step: {
      title: '收束：一个比值 r 定三种命运',
      tab: '收束',
      question: '公式不是结论，它是柱状图的读数',
      formula: String.raw`r=\tfrac{W_{i+1}}{W_i}:\ r=1\Rightarrow\Theta(n\log n);\ r>1\Rightarrow\Theta(n);\ r<1\Rightarrow\Theta(n^2)`,
      equation: String.raw`\text{三个场景的逐层求和}=${totals[0]},\ ${totals[1]},\ ${totals[2]}\quad(a=${A},b=${B},n=${n})`,
      invariant: 'a、b、n 固定，只改变 f(m)，每层工作量序列随之改变。',
      note: `主导层分别是${dominantOf(masterScenarios[0].r)}、${dominantOf(masterScenarios[1].r)}、${dominantOf(masterScenarios[2].r)}：同一副递归骨架，f(m) 决定柱形方向——这正是主方法三情形的几何直觉。`,
      conclusion: '主方法把"画树、算每层、找主导"压缩成查表：比较 f(n) 与 n^logᵦa，一个比值定 Θ。',
      pseudocode: { lines: masterCode, active: [2, 3] },
    },
  }
  yield { t: 'step' }
}

export const buildMasterTrace = (example: MasterExample): Trace => recordTrace('SANDBOX 05 · MASTER METHOD', '先把整层工作量算出来，再看相邻两层的比例 r 决定谁在主导。', runMasterMethod(example))

const masterInsight: DesignInsight = {
  observation: '无数层的求和被压缩成一个比值：相邻层工作量之比 r 与 1 的关系，一眼定出"根部 / 每层 / 叶子"谁主导。',
  contrasts: [
    { alternative: '逐层展开硬算求和', whyNot: '通用但每个递归式都要重算一遍；主方法把常见形态变成 O(1) 分类——代价是有适用边界（多项式差距与正则条件）。' },
  ],
  transfer: { prompt: 'a=1 的递归式（如 T(n)=T(n/2)+n）还能用主方法吗？', options: ['能：n^log₂1=1，f(n)=n 大一个多项式量级，情形 3 适用 → Θ(n)', '不能，a 必须 > 1', '只能画递归树'], answer: 0, explanation: 'a=1 完全合法：叶子层总量是常数，非递归工作 n 主导，整体 Θ(n)——二分查找的代价正是这个形态。' },
}

const masterMethodComplexity: ComplexityProfileData = {
  title: '主方法本身不定义最好、平均、最差',
  subtitle: '它不是处理输入的排序算法，而是根据 a、b、f(n) 给递归式分类。',
  cases: [
    { label: '情形 1', complexity: 'Θ(n^logᵦa)', condition: 'f(n) 比 n^logᵦa 小一个多项式量级。', example: 'T(n)=2T(n/2)+Θ(1)', explanation: '递归树的叶子层总量主导。', tone: 'method' },
    { label: '情形 2', complexity: 'Θ(n^logᵦa log n)', condition: 'f(n) 与 n^logᵦa 同阶。', example: '归并：2T(n/2)+Θ(n)', explanation: '每层工作量接近，层数 log n 把它们累加起来。', tone: 'method' },
    { label: '情形 3', complexity: 'Θ(f(n))', condition: 'f(n) 比 n^logᵦa 大一个多项式量级，且满足正则条件。', example: 'T(n)=2T(n/2)+Θ(n²)', explanation: '根部和上层的非递归工作主导。', tone: 'method' },
  ],
  footer: '要讨论最好/平均/最差，先回到被分析的算法：主元形状、输入排列或几何分布才是条件。',
}

export function MasterMethodLesson() {
  const [exampleId, setExampleId] = useState(masterExamples[0].id)
  const example = masterExamples.find(item => item.id === exampleId) ?? masterExamples[0]
  const trace = buildMasterTrace(example)
  const playback = useLessonPlayback(trace.steps.length)
  return <LessonShell eyebrow={trace.eyebrow} title={trace.steps[playback.step].title} description={trace.description} steps={trace.steps.map(item => item.tab ?? '推演')} step={playback.step} onStepChange={playback.setStep} playing={playback.playing} onTogglePlaying={playback.togglePlaying} onReplay={playback.replay} speed={playback.speed} onCycleSpeed={playback.cycleSpeed} complexity={masterMethodComplexity} examplePicker={<ExamplePicker examples={masterExamples} value={exampleId} onChange={id => { playback.reset(); setExampleId(id) }} />}>
    <TracePlayer trace={trace} step={playback.step} />
    <DesignNotes insight={masterInsight} />
  </LessonShell>
}
