import { useRef } from 'react'
import { animate, stagger } from 'animejs'
import { CalcDesk } from '@/components/CalcDesk'
import { DesignNotes, type DesignInsight } from '@/components/DesignNotes'
import { FormulaReadout, ConclusionBox } from '@/components/FormulaReadout'
import { LegendStrip } from '@/components/LegendStrip'
import { LessonShell } from '@/components/LessonShell'
import { PredictionPrompt, type PredictionData } from '@/components/PredictionPrompt'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ComplexityProfileData } from '@/components/ComplexityProfile'
import { useLessonPlayback } from '@/hooks/useLessonPlayback'
import { useStepScene } from '@/hooks/useStepScene'

type MasterScene = { title: string; formula: string; levels: number[]; label: string; ratio: string; note: string; invariant: string; conclusion: string; prediction?: PredictionData }

const scenes: readonly MasterScene[] = [
  { title: '场景一：每层都有 16 的工作量', formula: 'T(16)=2T(8)+16', levels: [16, 16, 16, 16, 16], label: 'f(m)=m', ratio: 'r=1', note: '柱高逐层读出工作量：16→16→16→16→16，相邻柱子等高。', invariant: 'a、b、n 固定，只改变 f(m)，每层工作量序列随之改变。', conclusion: '相邻两层一样长；5 层相加，所以总量是 Θ(n log n)。', prediction: { prompt: '当每层工作量都是 16 时，哪一层会主导总复杂度？', options: ['根部，因为它最先出现', '每层贡献相同，要看层数', '叶子，因为它数量最多'], answer: 1, explanation: '每层都是 16，差别来自层数；5 层各贡献 16，所以总量是 16×5，也就是 Θ(n log n)。' } },
  { title: '场景二：改变 f(m)，看柱子改变方向', formula: 'W_i=a^i f(n/b^i)', levels: [1, 2, 4, 8, 16], label: 'f(m)=1', ratio: 'r=2', note: '柱高序列 1→2→4→8→16：每往下一层，工作量乘 2。', invariant: 'a、b、n 固定，只改变 f(m)，每层工作量序列随之改变。', conclusion: '越往下越大，叶子层主导，答案接近 Θ(n)。', prediction: { prompt: '相邻层比例 r=2，意味着从上一层到下一层发生了什么？', options: ['工作量减半', '工作量保持不变', '工作量翻倍'], answer: 2, explanation: '柱高序列 1→2→4→8→16，每往下一层工作量都乘 2，因此叶子层主导。' } },
  { title: '场景三：根部开始主导', formula: 'W_i=a^i(n/b^i)^2', levels: [256, 128, 64, 32, 16], label: 'f(m)=m^2', ratio: 'r=0.5', note: '柱高序列 256→128→64→32→16：每往下一层，工作量减半。', invariant: 'a、b、n 固定，只改变 f(m)，每层工作量序列随之改变。', conclusion: '越往下越小，根部主导，答案接近 Θ(n²)。' },
]

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
  const playback = useLessonPlayback(scenes.length)
  return <MasterMethodScene steps={scenes} step={playback.step} setStep={playback.setStep} playing={playback.playing} onTogglePlaying={playback.togglePlaying} onReplay={playback.replay} speed={playback.speed} onCycleSpeed={playback.cycleSpeed} />
}

function MasterMethodScene({ steps, step, setStep, playing, onTogglePlaying, onReplay, speed, onCycleSpeed }: { steps: readonly MasterScene[]; step: number; setStep: (value: number) => void; playing: boolean; onTogglePlaying: () => void; onReplay: () => void; speed: number; onCycleSpeed: () => void }) {
  const state = steps[step]
  const scopeRef = useRef<HTMLDivElement>(null)
  useStepScene(scopeRef, () => {
    if (scopeRef.current?.querySelector('.master-bar')) animate('.master-bar', { scaleY: [0.35, 1], duration: 500, delay: stagger(60), ease: 'out(3)' })
  }, [step])
  return (
    <LessonShell eyebrow="SANDBOX 05 · MASTER METHOD" title={state.title} description="先把整层工作量算出来，再看相邻两层的比例 r 决定谁在主导。" steps={['平衡', '叶子主导', '根部主导']} step={step} onStepChange={setStep} playing={playing} onTogglePlaying={onTogglePlaying} onReplay={onReplay} complexity={masterMethodComplexity} speed={speed} onCycleSpeed={onCycleSpeed}>
      <div ref={scopeRef} className="lesson-canvas">
        <FormulaReadout question="公式不是结论，它是柱状图的读数" latex={state.formula} hint={`${state.label} · ${state.ratio}`} className="master-formula" />
        <div className="master-layout">
          <Card>
            <CardHeader><CardTitle>递归树每层总工作量</CardTitle></CardHeader>
            <CardContent>
              <div className="bar-chart" aria-label="递归树每层工作量柱状图">
                {state.levels.map((value, index) => <div className="bar-column" key={index}><div className="bar-value">{value}</div><div className="master-bar" style={{ height: `${Math.max(7, value / 256 * 190)}px` }} /><span>第 {index} 层</span></div>)}
              </div>
              <LegendStrip items={[{ tone: 'focus', label: '柱高 = 该层工作量 Wᵢ' }, { tone: 'target', label: '相邻柱高比 r 决定主导层' }]} />
            </CardContent>
          </Card>
          <CalcDesk metrics={[{ label: '本场景的 f(m)', value: state.label }, { label: '根部工作量 W₀', value: state.levels[0], tone: 'blue' }, { label: '叶子层工作量', value: state.levels[state.levels.length - 1], tone: 'orange' }, { label: '相邻层比例', value: state.ratio, tone: 'green' }]} equation={String.raw`W_i = a^i f(n / b^i);\quad ${state.ratio}`} invariant={state.invariant} note={state.note} />
        </div>
        {state.prediction ? <PredictionPrompt {...state.prediction} /> : null}
        <DesignNotes insight={masterInsight} />
        <ConclusionBox>{state.conclusion}</ConclusionBox>
      </div>
    </LessonShell>
  )
}
