import { useState } from 'react'
import type { MetricItem } from '@/components/CalcDesk'
import type { ComplexityProfileData } from '@/components/ComplexityProfile'
import { DesignNotes, type DesignInsight } from '@/components/DesignNotes'
import { ExamplePicker, type ExampleOption } from '@/components/ExamplePicker'
import { LessonShell } from '@/components/LessonShell'
import { TracePlayer } from '@/engine/TracePlayer'
import { recordTrace, type TraceEvent } from '@/engine/events'
import type { BarItem, BarScene, ShapeScene, ShapeShape, Trace } from '@/engine/trace'
import { useLessonPlayback } from '@/hooks/useLessonPlayback'

/**
 * 演示数据与算法分离：本文件 = 三组函数对 + 渐近记号推演生成器（产出 Trace）+ 播放器装配。
 * 全部曲线由逐点折线现场计算（0..window 等步采样），Trace 内只含数字与字符串，可整体 JSON 化。
 */

type PairId = 'same' | 'apart' | 'trap'
type AsympExample = ExampleOption & { kind: PairId }
type JudgeEntrySpec = { left: string; op: string; right: string; holds: boolean; action: string }
type NoteSpec = { x: number; y: number; text: string; tone?: 'blue' | 'green' | 'purple' | 'orange' | 'yellow' | 'default'; size?: number }

const asympExamples: readonly AsympExample[] = [
  { id: 'same', kind: 'same', label: '同阶', detail: 'f=2n²+100 vs g=n²' },
  { id: 'apart', kind: 'apart', label: '差一阶', detail: 'f=n vs g=n²' },
  { id: 'trap', kind: 'trap', label: '常数陷阱', detail: 'f=n+100 vs g=n' },
]

type PairDef = {
  fText: string
  gText: string
  fLatex: string
  gLatex: string
  f: (n: number) => number
  g: (n: number) => number
  ratio: (n: number) => string
  ratioLimit: string
  readTrend: string
  beat2Conclusion: string
  oC: number
  oN0: number
  oBound: (n: number) => number
  oEquation: string
  oJudge: JudgeEntrySpec[]
  oCheckpoints: string
  beat4Formula: string
  beat4Conclusion: string
  omegaJudge: JudgeEntrySpec[]
  omegaEquation: string
  omegaNote: string
  omegaGraphNote: NoteSpec
  omegaConclusion: string
  thetaFormula: string
  thetaEquation: string
  thetaJudge: JudgeEntrySpec[]
  thetaNotes: NoteSpec[]
  thetaNote: string
  thetaConclusion: string
  thetaUpper?: (n: number) => number
  readN: number
  window: number
  vmax: number
}

const round2 = (x: number) => String(Math.round(x * 100) / 100)

const PAIRS: Record<PairId, PairDef> = {
  same: {
    fText: '2n²+100',
    gText: 'n²',
    fLatex: '2n^2+100',
    gLatex: 'n^2',
    f: n => 2 * n * n + 100,
    g: n => n * n,
    ratio: n => round2((2 * n * n + 100) / (n * n)),
    ratioLimit: String.raw`\frac{f(n)}{g(n)}=\frac{2n^2+100}{n^2}=2+\frac{100}{n^2}\ \longrightarrow\ 2`,
    readTrend: '一路读：n=4 比值 8.25 → n=16 比值 2.39 → n=32 比值 2.1。常数 100 的领先被 n² 逐步稀释，比值稳稳落向 2——纯常数倍。',
    beat2Conclusion: '比值趋于常数 2：同阶的种子在这里。',
    oC: 3,
    oN0: 10,
    oBound: n => 3 * n * n,
    oEquation: String.raw`2n^2+100 \le 3n^2 \iff n^2 \ge 100 \iff n \ge 10`,
    oJudge: [
      { left: 'f(4)=132', op: '>', right: '3g(4)=48', holds: false, action: 'n=4 < n₀=10：不夹没关系' },
      { left: 'f(16)=612', op: '≤', right: '3g(16)=768', holds: true, action: 'n=16 ≥ n₀：夹住' },
      { left: 'f(32)=2148', op: '≤', right: '3g(32)=3072', holds: true, action: 'n=32 ≥ n₀：恒夹住' },
    ],
    oCheckpoints: String.raw`f(4)=132>48=3g(4);\quad f(16)=612\le 768=3g(16);\quad f(32)=2148\le 3072=3g(32)`,
    beat4Formula: String.raw`n<n_0:\ 132>48\ \text{不夹};\quad n\ge 10:\ \text{恒夹}`,
    beat4Conclusion: '上界成立：2n²+100 = O(n²)——但这还不够"同阶"，先看一个陷阱。',
    omegaJudge: [{ left: 'f(32)=2148', op: '≥', right: 'g(32)=1024', holds: true, action: 'f−g = n²+100 ≥ 0 恒成立：下界在手' }],
    omegaEquation: String.raw`2n^2+100 \ge 1\cdot n^2 \iff n^2+100 \ge 0\ \text{恒成立}`,
    omegaNote: '绿线 g 全程压在 f 下面：f−g = n²+100 ≥ 0，下界从 n=1 就成立（c₂=1, n₀=1）。',
    omegaGraphNote: { x: 110, y: 70, text: '下界就是 g 自己：f − g = n² + 100 ≥ 0', tone: 'green' },
    omegaConclusion: '下界到手：f 不仅被罩住，还压得住 g。',
    thetaFormula: String.raw`n^2 \le 2n^2+100 \le 3n^2 \quad (n \ge 10)`,
    thetaEquation: String.raw`c_2=1:\ n^2 \le 2n^2+100;\quad c_1=3:\ 2n^2+100 \le 3n^2\ (n\ge 10)`,
    thetaJudge: [
      { left: '下界：f(32)=2148', op: '≥', right: '1·g(32)=1024', holds: true, action: '下界成立（c₂=1）' },
      { left: '上界：f(32)=2148', op: '≤', right: '3·g(32)=3072', holds: true, action: '上界成立（c₁=3）→ Θ(n²)' },
    ],
    thetaNotes: [],
    thetaNote: '下界用 c₂=1（g 自己就行），上界用 c₁=3：绿色地板与紫色虚线天花板把 f 围进阴影区——"2n²+100 与 n² 是什么关系？"的答案就是 Θ。',
    thetaConclusion: '两条界都揽住 f：f 与 g 同阶，记作 f = Θ(n²)。',
    thetaUpper: n => 3 * n * n,
    readN: 32,
    window: 32,
    vmax: 3072,
  },
  apart: {
    fText: 'n',
    gText: 'n²',
    fLatex: 'n',
    gLatex: 'n^2',
    f: n => n,
    g: n => n * n,
    ratio: n => round2(n / (n * n)),
    ratioLimit: String.raw`\frac{f(n)}{g(n)}=\frac{n}{n^2}=\frac{1}{n}\ \longrightarrow\ 0`,
    readTrend: '一路读：n=4 比值 0.25 → n=16 比值 0.06 → n=32 比值 0.03。比值按 1/n 归零——f 不是差常数，是差一个幂。',
    beat2Conclusion: '比值趋于 0：f 被 g 远远甩开。',
    oC: 2,
    oN0: 1,
    oBound: n => 2 * n * n,
    oEquation: String.raw`n \le 2n^2 \iff 1 \le 2n \iff n \ge 1`,
    oJudge: [
      { left: 'f(1)=1', op: '≤', right: '2g(1)=2', holds: true, action: 'n₀=1：第一步就夹住' },
      { left: 'f(16)=16', op: '≤', right: '2g(16)=512', holds: true, action: '线性远低于平方：宽松但真实' },
      { left: 'f(32)=32', op: '≤', right: '2g(32)=2048', holds: true, action: '上界成立：f=O(n²)' },
    ],
    oCheckpoints: String.raw`f(1)=1\le 2=2g(1);\quad f(16)=16\le 512=2g(16);\quad f(32)=32\le 2048=2g(32)`,
    beat4Formula: String.raw`n_0=1:\ \text{从第一步就夹住}`,
    beat4Conclusion: '上界成立：n = O(n²)——但注意，这个界松得离谱。',
    omegaJudge: [{ left: 'f(32)=32', op: '≥', right: 'c·g(32)=1024c', holds: false, action: 'n₀ 越大需要的 c 越小 → 无正常数：Ω 不成立' }],
    omegaEquation: String.raw`n \ge c\,n^2 \iff c \le \frac{1}{n} \to 0\ \Rightarrow\ \text{无正常数 } c`,
    omegaNote: '想找 c 使 c·n² ≤ n 对一切 n≥n₀ 成立：n=32 时 c ≤ 1/32，n=3200 时 c ≤ 1/3200……n₀ 越大 c 越小，不存在正的 c。',
    omegaGraphNote: { x: 100, y: 70, text: 'f ≥ c·n²？n 越大需要的 c 越小 → 无正常数', tone: 'orange' },
    omegaConclusion: 'Ω 不成立——f 与 g 之间隔着整整一阶。',
    thetaFormula: String.raw`n \le n^2\ \text{成立；}\ c\,n^2 \le n\ \text{无解}`,
    thetaEquation: String.raw`\text{上界成立}:\ n \le n^2;\quad \text{下界无解}:\ c\,n^2 \le n\ \text{对大 } n\ \text{必失败}`,
    thetaJudge: [
      { left: '上界：f(32)=32', op: '≤', right: 'g(32)=1024', holds: true, action: '上界成立：O(n²) 没问题' },
      { left: '下界：f(32)=32', op: '≥', right: 'g(32)=1024', holds: false, action: '下界失败：差整整一阶，Θ 拒绝' },
    ],
    thetaNotes: [
      { x: 130, y: 84, text: '上界 g=n²：罩得住', tone: 'green' },
      { x: 130, y: 108, text: '下界 c·n²：不存在', tone: 'purple' },
      { x: 130, y: 132, text: 'Θ 拒绝：差一阶', tone: 'orange' },
    ],
    thetaNote: '上界 g=n² 罩得住 n；但下界 c·n² ≤ n 对大 n 必然失败——差一阶 = 夹逼失败。',
    thetaConclusion: '只有一边：夹逼失败——n 与 n² 不同阶。',
    readN: 32,
    window: 32,
    vmax: 1024,
  },
  trap: {
    fText: 'n+100',
    gText: 'n',
    fLatex: 'n+100',
    gLatex: 'n',
    f: n => n + 100,
    g: n => n,
    ratio: n => round2((n + 100) / n),
    ratioLimit: String.raw`\frac{f(n)}{g(n)}=\frac{n+100}{n}=1+\frac{100}{n}\ \longrightarrow\ 1`,
    readTrend: '一路读：n=4 比值 26 → n=16 比值 7.25 → n=32 比值 4.13。那 100 的领先正在被规模吞掉，比值落向 1。',
    beat2Conclusion: '比值趋于 1：那 100 只是起跑时的领先。',
    oC: 2,
    oN0: 100,
    oBound: n => 2 * n,
    oEquation: String.raw`n+100 \le 2n \iff 100 \le n\quad (c=2,\ n_0=100)`,
    oJudge: [
      { left: 'f(32)=132', op: '>', right: '2g(32)=64', holds: false, action: 'n=32 < n₀=100：还没夹住' },
      { left: 'f(100)=200', op: '≤', right: '2g(100)=200', holds: true, action: 'n=n₀：天花板恰好接住（等号）' },
      { left: 'f(140)=240', op: '≤', right: '2g(140)=280', holds: true, action: 'n>n₀：恒夹住' },
    ],
    oCheckpoints: String.raw`f(32)=132>64=2g(32);\quad f(100)=200\le 200=2g(100);\quad f(140)=240\le 280=2g(140)`,
    beat4Formula: String.raw`n=32:\ 132>64\ \text{还没夹};\quad n\ge 100:\ \text{恒夹}`,
    beat4Conclusion: '上界成立：n+100 = O(n)——常数终被规模吞掉。',
    omegaJudge: [{ left: 'f(140)=240', op: '≥', right: 'g(140)=140', holds: true, action: 'f−g = 100 ≥ 0 恒成立：下界在手' }],
    omegaEquation: String.raw`n+100 \ge 1\cdot n \iff 100 \ge 0\ \text{恒成立}`,
    omegaNote: '绿线 g 全程在 f 下面：差距恒为 100，下界成立（c₂=1, n₀=1）。',
    omegaGraphNote: { x: 110, y: 70, text: '下界就是 g 自己：f − g = 100 ≥ 0', tone: 'green' },
    omegaConclusion: '下界到手：f 不仅被罩住，还压得住 g。',
    thetaFormula: String.raw`n \le n+100 \le 2n \quad (n \ge 100)`,
    thetaEquation: String.raw`c_2=1:\ n \le n+100;\quad c_1=2:\ n+100 \le 2n\ (n\ge 100)`,
    thetaJudge: [
      { left: '下界：f(140)=240', op: '≥', right: '1·g(140)=140', holds: true, action: '下界成立（c₂=1）' },
      { left: '上界：f(140)=240', op: '≤', right: '2·g(140)=280', holds: true, action: '上界成立（c₁=2）→ Θ(n)' },
    ],
    thetaNotes: [{ x: 250, y: 132, text: '虚线 2n 在 n₀=100 处恰好接到 f', tone: 'purple' }],
    thetaNote: '下界用 c₂=1（g 自己就行），上界用 c₁=2：虚线 2n 在 n₀=100 处恰好接到 f，之后永远压住——同阶盖章。',
    thetaConclusion: '两条界都揽住 f：f 与 g 同阶，记作 f = Θ(n)。',
    thetaUpper: n => 2 * n,
    readN: 140,
    window: 140,
    vmax: 280,
  },
}

const trapOn2 = { window: 32, vmax: 1024, n0: 11 }
const flipSpec = { window: 32, vmax: 1024 }

const sampleNs = (window: number): number[] => {
  const step = window <= 32 ? 1 : 2
  const ns: number[] = []
  for (let n = 0; n <= window; n += step) ns.push(n)
  return ns
}

type CurveSpec = { id: string; values: number[]; tone: 'blue' | 'green' | 'purple' | 'orange' | 'yellow'; dashed?: boolean; label?: string; labelDy?: number }
type GraphSpec = {
  label: string
  window: number
  vmax: number
  ns: number[]
  curves: CurveSpec[]
  n0?: { value: number; label: string }
  shadeFrom?: number
  notes?: NoteSpec[]
}

function graphScene(spec: GraphSpec): ShapeScene {
  const xOf = (n: number) => 40 + (n / spec.window) * 560
  const yOf = (v: number) => 320 - Math.min(1, Math.max(0, v / spec.vmax)) * 290
  const shapes: ShapeShape[] = [
    { shape: 'line', id: 'ax-x', x1: 40, y1: 320, x2: 620, y2: 320, width: 2 },
    { shape: 'line', id: 'ax-y', x1: 40, y1: 320, x2: 40, y2: 24, width: 2 },
    { shape: 'text', id: 'ax-n', x: 606, y: 337, text: 'n', size: 12 },
    { shape: 'text', id: 'ax-v', x: 10, y: 32, text: '值', size: 12 },
  ]
  if (spec.shadeFrom !== undefined) {
    shapes.push({ shape: 'rect', id: 'shade', x: xOf(spec.shadeFrom), y: 24, w: Math.max(0, 620 - xOf(spec.shadeFrom)), h: 296, tone: 'green', opacity: 0.15 })
  }
  if (spec.n0) {
    shapes.push({ shape: 'line', id: 'n0-line', x1: xOf(spec.n0.value), y1: 320, x2: xOf(spec.n0.value), y2: 24, tone: 'purple', dashed: true })
    shapes.push({ shape: 'text', id: 'n0-label', x: xOf(spec.n0.value) + 6, y: 40, text: spec.n0.label, tone: 'purple', size: 12 })
  }
  for (const curve of spec.curves) {
    shapes.push({
      shape: 'path',
      id: curve.id,
      d: spec.ns.map((n, i) => `${i === 0 ? 'M' : 'L'} ${xOf(n).toFixed(1)} ${yOf(curve.values[i]).toFixed(1)}`).join(' '),
      tone: curve.tone,
      dashed: curve.dashed,
    })
    if (curve.label) {
      const vEnd = curve.values[curve.values.length - 1]
      shapes.push({ shape: 'text', id: `${curve.id}-label`, x: Math.min(xOf(spec.window) - 118, 500), y: Math.max(24, yOf(vEnd) + (curve.labelDy ?? -8)), text: curve.label, tone: curve.tone, size: 13 })
    }
  }
  for (const [index, note] of (spec.notes ?? []).entries()) {
    shapes.push({ shape: 'text', id: `note-${index}`, x: note.x, y: note.y, text: note.text, tone: note.tone, size: note.size })
  }
  return { kind: 'shapes', id: 'graph', label: spec.label, width: 640, height: 360, shapes }
}

const NS = [1, 2, 4, 8, 16, 32]

const pairBars = (pair: PairDef, focusLast: boolean): BarItem[] => {
  const max = Math.max(...NS.map(pair.f))
  return NS.map((n, index) => ({
    id: `n${n}`,
    display: String(pair.f(n)),
    value: pair.f(n),
    caption: `g(${n})=${pair.g(n)} · 比值 ${pair.ratio(n)}`,
    tone: focusLast && index === NS.length - 1 ? 'focus' : undefined,
  }))
}

const barsSceneOf = (label: string, max: number, bars: BarItem[]): BarScene => ({ kind: 'bars', id: 'vals', label, max, unit: 'n=1..32', bars })

const ladderBars: BarItem[] = [
  { id: 'o-1', display: '1', value: 1, caption: '常数' },
  { id: 'o-log', display: '5', value: 5, caption: 'log₂n' },
  { id: 'o-n', display: '32', value: 32, caption: 'n' },
  { id: 'o-nlogn', display: '160', value: 160, caption: 'n log n' },
  { id: 'o-n2', display: '1024', value: 1024, caption: 'n²', tone: 'focus' },
  { id: 'o-2n', display: '2³²', value: 4294967296, caption: '≈43 亿', tone: 'target' },
]

const asympCode = [
  { code: '输入：f, g, 常数 c > 0, 起点 n₀', note: 'O 的"证人"是一对 (c, n₀)' },
  { code: 'for n = n₀, n₀+1, …：', note: '从 n₀ 起逐点检查' },
  { code: '  若 f(n) > c·g(n)：这个 (c, n₀) 失败', note: '一次失败就否证这条上界' },
  { code: '全程通过 → f = O(g)（有证人）', note: '数学证明覆盖所有 n；检查只覆盖算过的点' },
]

function* runAsymptotic(example: AsympExample): Generator<TraceEvent> {
  const P = PAIRS[example.kind]
  const ns = sampleNs(P.window)
  const fVals = ns.map(P.f)
  const gVals = ns.map(P.g)
  const oVals = ns.map(P.oBound)
  const f32 = P.f(32)
  const g32 = P.g(32)

  // ── 拍 1：增长率直觉 ────────────────────────────────────────────
  yield { t: 'scene', scene: graphScene({ label: `增长率画布：f=${P.fText} 与 g=${P.gText}`, window: P.window, vmax: P.vmax, ns, curves: [
    { id: 'curve-f', values: fVals, tone: 'blue', label: `f=${P.fText}` },
    { id: 'curve-g', values: gVals, tone: 'green', label: `g=${P.gText}` },
  ] }) }
  yield { t: 'scene', scene: barsSceneOf('数值表：柱高 = f(n)，柱脚标 g(n) 与比值', Math.max(...NS.map(P.f)), pairBars(P, false)) }
  yield { t: 'legend', legend: [
    { tone: 'focus', label: 'f：被判断的函数' },
    { tone: 'sorted', label: 'g：基准函数' },
    { tone: 'pivot', label: 'n₀：分界线' },
    { tone: 'target', label: 'c·g：上下界' },
  ] }
  yield { t: 'metrics', metrics: [
    { label: '当前 n', value: 32, tone: 'blue' },
    { label: 'f(32)', value: f32, tone: 'orange' },
    { label: 'g(32)', value: g32, tone: 'purple' },
    { label: '比值 f/g', value: P.ratio(32), tone: 'green' },
  ] }
  yield {
    t: 'message',
    step: {
      title: '增长率直觉：两条曲线上桌',
      tab: '直觉',
      question: '两条曲线最后会怎么分开？',
      formula: String.raw`f(n)=${P.fLatex},\quad g(n)=${P.gLatex}`,
      formulaHint: '蓝线 = f，绿线 = g；柱状图给出 n=1,2,4,8,16,32 的逐点数值。',
      equation: String.raw`f(32)=${f32},\quad g(32)=${g32},\quad \frac{f(32)}{g(32)}=${P.ratio(32)}`,
      invariant: '本课只关心"规模 n 变大后"的行为——小 n 时的领先不算数。',
      note: example.kind === 'trap'
        ? '画布拉远到 n=140：这个陷阱要在 n₀=100 附近才现形，柱状表先看 n≤32 的部分。'
        : '先别急着说谁快——把"快"变成可测的量：下一拍逐列读比值。',
      conclusion: '先别下结论——下一拍逐列读表。',
    },
  }
  yield { t: 'step' }

  // ── 拍 2：逐列读表 ─────────────────────────────────────────────
  yield { t: 'bars', scene: 'vals', bars: pairBars(P, true) }
  yield { t: 'metrics', metrics: [
    { label: '当前 n', value: 32, tone: 'blue' },
    { label: 'f(32)', value: f32, tone: 'orange' },
    { label: 'g(32)', value: g32, tone: 'purple' },
    { label: '比值 f(32)/g(32)', value: P.ratio(32), tone: 'green' },
  ] }
  yield {
    t: 'message',
    step: {
      title: '逐列读表：比值走向何方',
      tab: '读表',
      formula: P.ratioLimit,
      formulaHint: '黄色高亮柱 = n=32 那一列；每根柱脚都标着当列的 g 与比值。',
      equation: String.raw`n=4:\ ${P.ratio(4)};\quad n=16:\ ${P.ratio(16)};\quad n=32:\ ${P.ratio(32)}`,
      invariant: '函数对本身没变——变的是读它的方式：从"值差多少"改成"比值趋向哪"。',
      note: P.readTrend,
      conclusion: P.beat2Conclusion,
    },
  }
  yield { t: 'step' }

  // ── 拍 3：大 O 定义 ────────────────────────────────────────────
  yield { t: 'scene', scene: graphScene({ label: `大 O：天花板 c·g=${P.oC}${P.gText}，n₀=${P.oN0} 起恒夹`, window: P.window, vmax: P.vmax, ns, curves: [
    { id: 'curve-f', values: fVals, tone: 'blue', label: `f=${P.fText}` },
    { id: 'curve-g', values: gVals, tone: 'green', label: `g=${P.gText}` },
    { id: 'curve-ub', values: oVals, tone: 'purple', dashed: true, label: `c·g=${P.oC}${P.gText}` },
  ], n0: { value: P.oN0, label: `n₀=${P.oN0}` }, shadeFrom: P.oN0 }) }
  yield { t: 'metrics', metrics: [
    { label: '证人 c', value: P.oC, tone: 'purple' },
    { label: '证人 n₀', value: P.oN0, tone: 'purple' },
    { label: 'f(32)', value: f32, tone: 'orange' },
    { label: `c·g(32)=${P.oC}·${P.g(32)}`, value: P.oBound(32), tone: 'green' },
  ] }
  yield {
    t: 'message',
    step: {
      title: '大 O：给增长画一条天花板',
      tab: '大 O',
      formula: String.raw`f=O(g)\iff \exists c>0,\ n_0:\ \forall n \ge n_0,\ f(n) \le c\,g(n)`,
      formulaHint: '紫色虚线 = c·g 天花板；绿色阴影 = n≥n₀ 的"承诺生效区"。',
      equation: P.oEquation,
      invariant: '大 O 是"迟早被罩住"的承诺：n₀ 之前随它去，n₀ 之后一步不许超。',
      note: `天花板画在 c·g=${P.oC}${P.gText}：从 n₀=${P.oN0} 起，f 的一切波动都被罩进阴影区。大 O 的证人就是这对 (c, n₀)=(${P.oC}, ${P.oN0})。`,
      conclusion: '下一拍验证：n₀ 前后两副面孔。',
      pseudocode: { lines: asympCode, active: [0, 1] },
    },
  }
  yield { t: 'step' }

  // ── 拍 4：验证上界 ─────────────────────────────────────────────
  yield { t: 'metrics', metrics: [
    { label: '当前 n', value: 32, tone: 'blue' },
    { label: 'f(32)', value: f32, tone: 'orange' },
    { label: 'c·g(32)', value: P.oBound(32), tone: 'green' },
    { label: '比值 f/g', value: P.ratio(32), tone: 'purple' },
  ] }
  yield {
    t: 'message',
    step: {
      title: '验证上界：n₀ 之前可以不夹',
      tab: '验证 O',
      formula: P.beat4Formula,
      formulaHint: '三个检查点：判断区的每一行都对应图上一个 n。',
      equation: P.oCheckpoints,
      invariant: '函数对与天花板都没变——变的只是 n 的取值区间。',
      judge: { entries: P.oJudge },
      note: 'O 的承诺从 n₀ 才开始兑现：之前 f 可以在天花板上面乱跳（图上 n<n₀ 的空白区）。验证覆盖的只是采样点；数学证明才覆盖所有 n。',
      conclusion: P.beat4Conclusion,
      pseudocode: { lines: asympCode, active: [1, 2] },
    },
  }
  yield { t: 'step' }

  // ── 拍 5：常数陷阱（固定展台：n+100 vs n²）────────────────────
  const trapOn2Ns = sampleNs(trapOn2.window)
  yield { t: 'scene', scene: graphScene({ label: '展台：f=n+100 vs g=n²——一次函数被平方函数罩住', window: trapOn2.window, vmax: trapOn2.vmax, ns: trapOn2Ns, curves: [
    { id: 'curve-f', values: trapOn2Ns.map(n => n + 100), tone: 'blue', label: 'f=n+100' },
    { id: 'curve-g', values: trapOn2Ns.map(n => n * n), tone: 'green', label: 'g=n²（上界）' },
  ], n0: { value: trapOn2.n0, label: 'n₀=11' }, shadeFrom: trapOn2.n0 }) }
  yield { t: 'metrics', metrics: [
    { label: '当前 n', value: 32, tone: 'blue' },
    { label: 'f(32)=n+100', value: 132, tone: 'orange' },
    { label: 'g(32)=n²', value: 1024, tone: 'purple' },
    { label: '比值 f/g', value: round2(132 / 1024), tone: 'green' },
  ] }
  yield {
    t: 'message',
    step: {
      title: '常数陷阱：n+100 也是 O(n²)',
      tab: '陷阱 O(n²)',
      formula: String.raw`n+100 \le 1\cdot n^2 \iff n \ge 11`,
      formulaHint: '绿线 n² 从 n₀=11 起全程压住蓝线——阴影区里 f 再也没冒过头。',
      equation: String.raw`f(11)=111 \le 121=n^2;\quad f(10)=110 > 100=n^2`,
      invariant: 'O 只承诺上界：一次函数被平方函数罩住，毫无压力。',
      note: '同一条 n+100：它是 O(n)（c=2, n₀=100），也是 O(n²)（c=1, n₀=11），甚至是 O(2ⁿ)——O 越宽松越容易满足。',
      conclusion: '预测答案：是！n+100 是 O(n²)——但这只说明上界宽松，不说明它是平方级。',
      prediction: {
        prompt: 'n+100 是 O(n²) 吗？',
        options: ['是：O 只是上界，n+100 ≤ c·n² 迟早成立', '否：一次函数不能被平方函数罩住', '要看 n₀ 取多大才说得了'],
        answer: 0,
        explanation: '是！n+100 ≤ n² 从 n=11 起成立（c=1, n₀=11）。O 只承诺"不超过"，越宽松越容易满足——它甚至是 O(2ⁿ)；要表达"刚好同阶"得用 Θ。',
      },
      pseudocode: { lines: asympCode, active: [1, 2] },
    },
  }
  yield { t: 'step' }

  // ── 拍 6：换一条天花板（固定展台：n+100 vs n）─────────────────
  const trapPair = PAIRS.trap
  const trapNs = sampleNs(trapPair.window)
  yield { t: 'scene', scene: graphScene({ label: '展台：f=n+100 vs g=n——线性天花板在 n₀=100 接管', window: trapPair.window, vmax: trapPair.vmax, ns: trapNs, curves: [
    { id: 'curve-f', values: trapNs.map(n => n + 100), tone: 'blue', label: 'f=n+100' },
    { id: 'curve-g', values: trapNs.map(n => n), tone: 'green', label: 'g=n' },
    { id: 'curve-ub', values: trapNs.map(n => 2 * n), tone: 'purple', dashed: true, label: 'c·g=2n' },
  ], n0: { value: 100, label: 'n₀=100' }, shadeFrom: 100 }) }
  yield { t: 'metrics', metrics: [
    { label: '当前 n', value: 140, tone: 'blue' },
    { label: 'f(140)', value: 240, tone: 'orange' },
    { label: '2·g(140)', value: 280, tone: 'green' },
    { label: '比值 f/g', value: round2(240 / 140), tone: 'purple' },
  ] }
  yield {
    t: 'message',
    step: {
      title: '换一条天花板：n+100 是 O(n)',
      tab: '天花板 O(n)',
      formula: String.raw`n+100 \le 2n \iff n \ge 100`,
      formulaHint: '虚线 2n 恰好在 n₀=100 处接到 f——那 100 的起跑领先被规模追平。',
      equation: String.raw`f(100)=200=2\cdot 100;\quad f(140)=240 \le 280=2\cdot 140`,
      invariant: '天花板换成了线性 2n：一次函数的天花板是一次函数，不是平方。',
      note: '常数陷阱的本质：常数是固定的，规模是增长的。图上两条线在 n₀=100 相交，之后线性天花板永远压住 f——"n+100 是 O(n)"：常数终会被规模吞掉。',
      conclusion: 'n+100 的真身是线性——但"同阶"要等 Θ 盖章（第 9 拍）。',
      pseudocode: { lines: asympCode, active: [1, 2] },
    },
  }
  yield { t: 'step' }

  // ── 拍 7：大 Ω ────────────────────────────────────────────────
  yield { t: 'scene', scene: graphScene({ label: `大 Ω：f=${P.fText} 能否压住 g=${P.gText}`, window: P.window, vmax: P.vmax, ns, curves: [
    { id: 'curve-f', values: fVals, tone: 'blue', label: `f=${P.fText}` },
    { id: 'curve-g', values: gVals, tone: 'green', label: `g=${P.gText}` },
  ], notes: [P.omegaGraphNote] }) }
  yield { t: 'metrics', metrics: [
    { label: '当前 n', value: P.window, tone: 'blue' },
    { label: `f(${P.window})`, value: P.f(P.window), tone: 'orange' },
    { label: `g(${P.window})`, value: P.g(P.window), tone: 'purple' },
    { label: '比值 f/g', value: P.ratio(P.window), tone: 'green' },
  ] }
  yield {
    t: 'message',
    step: {
      title: '大 Ω：反方向的承诺',
      tab: 'Ω 下界',
      formula: String.raw`f=\Omega(g)\iff \exists c>0,\ n_0:\ \forall n \ge n_0,\ f(n) \ge c\,g(n)`,
      formulaHint: '把不等式反过来问：f 至少是 g 的 c 倍吗？',
      equation: P.omegaEquation,
      invariant: 'Ω 是对"不会更好"的承诺：f 至少要压住 c·g——方向由谁是 f 决定。',
      judge: { entries: P.omegaJudge },
      note: `${P.omegaNote}（把比较方向反过来，同一个检查器即可验证下界。）`,
      conclusion: P.omegaConclusion,
      pseudocode: { lines: asympCode, active: [1, 2] },
    },
  }
  yield { t: 'step' }

  // ── 拍 8：角色对调（固定展台：n² vs n）────────────────────────
  const flipNs = sampleNs(flipSpec.window)
  yield { t: 'scene', scene: graphScene({ label: '展台：f=n² vs g=n——把角色对调，Ω 显然成立', window: flipSpec.window, vmax: flipSpec.vmax, ns: flipNs, curves: [
    { id: 'curve-f', values: flipNs.map(n => n * n), tone: 'blue', label: 'f=n²' },
    { id: 'curve-g', values: flipNs.map(n => n), tone: 'green', label: 'g=n' },
  ] }) }
  yield { t: 'metrics', metrics: [
    { label: '当前 n', value: 32, tone: 'blue' },
    { label: 'f(32)=n²', value: 1024, tone: 'orange' },
    { label: 'g(32)=n', value: 32, tone: 'purple' },
    { label: '比值 f/g', value: '32', tone: 'green' },
  ] }
  yield {
    t: 'message',
    step: {
      title: '把角色对调：n² 是 Ω(n)',
      tab: '对调 Ω',
      formula: String.raw`n^2 \ge 1\cdot n \quad (\forall n \ge 1)`,
      formulaHint: '同一条数对换个方向读：n 是 O(n²)，n² 是 Ω(n)。',
      equation: String.raw`f(32)=1024 \ge 32=g(32)`,
      invariant: '曲线没变，变的是断言方向——Ω 刻画"至少多大"。',
      judge: { entries: [{ left: 'f(32)=1024', op: '≥', right: '1·g(32)=32', holds: true, action: '平方压住线性：Ω 显然成立' }] },
      note: 'Ω 最常见的用途是问题难度下界：任何比较排序都要 Ω(n log n)——"至少这么慢，谁也别想赖账"。',
      conclusion: '下界语句是承诺书：它保护的是"没有更快的奇迹"。',
      pseudocode: { lines: asympCode, active: [1, 2] },
    },
  }
  yield { t: 'step' }

  // ── 拍 9：Θ 夹逼 ──────────────────────────────────────────────
  if (P.thetaUpper) {
    const upperVals = ns.map(P.thetaUpper)
    yield { t: 'scene', scene: graphScene({ label: `Θ 夹逼：c₂·g ≤ f ≤ c₁·g（n₀=${P.oN0}）`, window: P.window, vmax: P.vmax, ns, curves: [
      { id: 'curve-f', values: fVals, tone: 'blue', label: `f=${P.fText}` },
      { id: 'curve-g', values: gVals, tone: 'green', label: `g=${P.gText}（下界）` },
      { id: 'curve-ub', values: upperVals, tone: 'purple', dashed: true, label: `c·g=${P.oC}${P.gText}（上界）` },
    ], n0: { value: P.oN0, label: `n₀=${P.oN0}` }, shadeFrom: P.oN0, notes: P.thetaNotes }) }
  } else {
    yield { t: 'scene', scene: graphScene({ label: 'Θ 夹逼：上界够得着，下界永远缺席', window: P.window, vmax: P.vmax, ns, curves: [
      { id: 'curve-f', values: fVals, tone: 'blue', label: `f=${P.fText}` },
      { id: 'curve-g', values: gVals, tone: 'green', label: `g=${P.gText}（上界）` },
    ], notes: P.thetaNotes }) }
  }
  yield { t: 'metrics', metrics: P.thetaUpper
    ? [
        { label: '下界 c₂', value: 1, tone: 'green' },
        { label: '上界 c₁', value: P.oC, tone: 'purple' },
        { label: 'n₀', value: P.oN0, tone: 'blue' },
        { label: `比值 f/g @${P.readN}`, value: P.ratio(P.readN), tone: 'orange' },
      ]
    : [
        { label: '下界 c₂', value: '不存在', tone: 'green' },
        { label: '上界 c₁', value: 1, tone: 'purple' },
        { label: 'n₀', value: '—', tone: 'blue' },
        { label: `比值 f/g @${P.readN}`, value: P.ratio(P.readN), tone: 'orange' },
      ] }
  yield {
    t: 'message',
    step: {
      title: 'Θ：上下界一起夹住才算同阶',
      tab: 'Θ 夹逼',
      formula: P.thetaFormula,
      formulaHint: P.thetaUpper ? '绿色 g 是地板，紫色虚线是天花板——f 被夹在中间的阴影区里。' : '只有上面的界：地板不存在，夹逼失败。',
      equation: P.thetaEquation,
      invariant: 'Θ 的定义就是"同时拿到 O 和 Ω"：两条界一起夹住 f。',
      note: P.thetaNote,
      conclusion: P.thetaConclusion,
      prediction: {
        prompt: '2n²+100 与 n² 是什么关系？',
        options: ['Θ：同阶——常数与低阶项被忽略', 'O 但不是 Ω：只是上界', 'Ω 但不是 O：只是下界'],
        answer: 0,
        explanation: '下界 n² ≤ 2n²+100 与上界 2n²+100 ≤ 3n²（n≥10）同时成立——两边夹住就是 Θ(n²)。',
      },
      pseudocode: { lines: asympCode, active: [1, 2] },
    },
  }
  yield { t: 'step' }

  // ── 拍 10：夹逼读数 ───────────────────────────────────────────
  yield { t: 'metrics', metrics: [
    { label: '读数 n', value: P.readN, tone: 'blue' },
    { label: `f(${P.readN})`, value: P.f(P.readN), tone: 'orange' },
    { label: `g(${P.readN})`, value: P.g(P.readN), tone: 'purple' },
    { label: '比值 f/g', value: P.ratio(P.readN), tone: 'green' },
  ] }
  yield {
    t: 'message',
    step: {
      title: '夹逼读数：每一边都要证人',
      tab: '夹逼读数',
      formula: String.raw`\Theta(g)\ \equiv\ O(g)\ \wedge\ \Omega(g)`,
      formulaHint: '判断区逐行核对：下界一行、上界一行，都打勾才算同阶。',
      equation: P.thetaEquation,
      invariant: '曲线与两条界都没变——变的是把"图上夹住"落成"逐行核对"。',
      judge: { entries: P.thetaJudge },
      note: '上界说"不会更差"，下界说"不会更好"，两边都有证人才算同阶——Θ 是工程上真正想要的断言。',
      conclusion: P.thetaConclusion,
      pseudocode: { lines: asympCode, active: [1, 2] },
    },
  }
  yield { t: 'step' }

  // ── 拍 11：增长阶梯 ───────────────────────────────────────────
  yield { t: 'scene', scene: barsSceneOf('增长阶梯：六挡增长率（n=32 时的函数值）', 4294967296, ladderBars) }
  yield { t: 'metrics', metrics: [
    { label: '当前 n', value: 32, tone: 'blue' },
    { label: 'log₂32', value: 5, tone: 'green' },
    { label: 'n²', value: 1024, tone: 'orange' },
    { label: '2³²', value: '≈43 亿', tone: 'purple' },
  ] }
  yield {
    t: 'message',
    step: {
      title: '增长阶梯：六挡增长率排排坐',
      tab: '增长阶梯',
      formula: String.raw`1 < \log n < n < n\log n < n^2 < 2^n \quad (n=32)`,
      formulaHint: '柱高按真值画：2ⁿ 的柱子把其余五根压成地缝——这就是指数挡的样子。',
      equation: String.raw`\log_2 32=5;\quad n\log n=160;\quad n^2=1024;\quad 2^{32}=4294967296`,
      invariant: '梯子的顺序对常数因子不敏感——这正是渐近记号"忽略常数"的威力。',
      note: '比较排序的下界 n log n、平方级暴力、指数爆炸都在同一架梯子上；2³²≈43 亿——n=32 时指数挡已经数不完。',
      conclusion: '选算法就是选挡位：先用渐近记号定挡，再谈常数与实现。',
    },
  }
  yield { t: 'step' }

  // ── 拍 12：总结 ───────────────────────────────────────────────
  yield { t: 'metrics', metrics: [
    { label: 'O', value: '上界：f ≤ c·g', tone: 'blue' },
    { label: 'Ω', value: '下界：f ≥ c·g', tone: 'purple' },
    { label: 'Θ', value: '两界夹住 = 同阶', tone: 'green' },
  ] }
  yield {
    t: 'message',
    step: {
      title: '总结：选型的第一把尺子',
      tab: '总结',
      formula: String.raw`\Theta(g) \;=\; O(g) \;\cap\; \Omega(g)`,
      formulaHint: '三句话带走：O 管最坏不超过、Ω 管最好不低于、Θ 管到底同谁一阶。',
      equation: String.raw`\text{渐近记号忽略常数与低阶项，只回答：规模变大后谁主导}`,
      invariant: 'n+100 在 n<100 时确实大于 n——但渐近赢家要到大 n 才兑现；小规模的反直觉不推翻阶的排序。',
      note: '工程选型的顺序：先用 Θ 定挡位（决定大 n 的命运），再看常数因子与实现细节（小规模可能反转）。只测小数据会把 n+100 误判成"比 n 大很多"。',
      conclusion: '渐近记号是选型的第一把尺子：先看挡位，再拧螺丝。',
    },
  }
  yield { t: 'step' }
}

const buildAsympTrace = (example: AsympExample): Trace => recordTrace('SANDBOX 19 · ASYMPTOTIC NOTATION', '三组函数对逐拍夹逼：O 画天花板、Ω 铺地板、Θ 两边一起夹——渐近记号忽略常数与低阶项，只回答"规模变大后谁主导"。', runAsymptotic(example))

const asympInsight: DesignInsight = {
  observation: '渐近记号忽略常数与低阶项，只回答"规模变大后谁主导"——这是工程上选算法的第一把尺子。',
  contrasts: [
    { alternative: '只测小规模数据比较快慢', whyNot: 'n+100 在 n<100 时比 n 大、小规模上插入排序常比快排快——渐近赢家要到大 n 才兑现，选型要看实际规模。' },
    { alternative: '只报一个宽松的 O 了事', whyNot: '"是 O(n²)"对 O(n) 的算法同样成立——宽松上界信息量趋零；有意义的断言是 Θ 或紧的上界。' },
  ],
  transfer: { prompt: '一个算法是 O(n²) 也可能是 O(n)，"是 O(n)"说明什么？', options: ['什么都没保证，O 是上界不是同阶', '它就是平方级', '它很快'], answer: 0, explanation: '说"是 O(n²)"也可能是 O(n)、O(1)——有意义的断言是 Θ 或紧的上界。' },
}

const asympComplexity: ComplexityProfileData = {
  title: '渐近记号三卡：上界、下界、夹逼',
  subtitle: '概念课没有最好/平均/最差——三张卡是三种断言强度。',
  cases: [
    { label: 'O：上界', complexity: 'f ≤ c·g（n ≥ n₀）', condition: '存在常数 c>0 与 n₀，使 n≥n₀ 后 f(n) ≤ c·g(n)。', example: 'n+100 ≤ 2n（n≥100）→ O(n)', explanation: '只承诺"不会更差"——宽松的上界（如 O(n²)）也可能对 O(n) 的算法成立。', tone: 'method' },
    { label: 'Ω：下界', complexity: 'f ≥ c·g（n ≥ n₀）', condition: '存在 c>0 与 n₀，使 n≥n₀ 后 f(n) ≥ c·g(n)。', example: '2n²+100 ≥ n²（恒成立）→ Ω(n²)', explanation: '承诺"不会更好"——常用来陈述问题难度下界（比较排序 Ω(n log n)）。', tone: 'method' },
    { label: 'Θ：同阶', complexity: 'c₂g ≤ f ≤ c₁g', condition: '同时是 O(g) 与 Ω(g)：上下界都夹得住。', example: 'n ≤ n+100 ≤ 2n（n≥100）→ Θ(n)', explanation: '工程选型真正想要的断言：增长率同阶，常数与低阶项被忽略。', tone: 'method' },
  ],
  footer: 'O 回答"最坏多坏"，Ω 回答"最好多好"，Θ 回答"到底多快"——报价时用 Θ，免责时用 O。',
}

export function AsymptoticNotationLesson() {
  const [exampleId, setExampleId] = useState(asympExamples[0].id)
  const example = asympExamples.find(item => item.id === exampleId) ?? asympExamples[0]
  const trace = buildAsympTrace(example)
  const playback = useLessonPlayback(trace.steps.length)
  return <LessonShell eyebrow={trace.eyebrow} title={trace.steps[playback.step].title} description={trace.description} steps={trace.steps.map(item => item.tab ?? '推演')} step={playback.step} onStepChange={playback.setStep} playing={playback.playing} onTogglePlaying={playback.togglePlaying} onReplay={playback.replay} speed={playback.speed} onCycleSpeed={playback.cycleSpeed} complexity={asympComplexity} examplePicker={<ExamplePicker examples={asympExamples} value={exampleId} onChange={id => { playback.reset(); setExampleId(id) }} />}>
    <TracePlayer trace={trace} step={playback.step} />
    <DesignNotes insight={asympInsight} />
  </LessonShell>
}
