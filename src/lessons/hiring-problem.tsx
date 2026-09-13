import { useState } from 'react'
import { DesignNotes, type DesignInsight } from '@/components/DesignNotes'
import { ExamplePicker, type ExampleOption } from '@/components/ExamplePicker'
import { LessonShell } from '@/components/LessonShell'
import type { ComplexityProfileData } from '@/components/ComplexityProfile'
import type { MetricItem } from '@/components/CalcDesk'
import { TracePlayer } from '@/engine/TracePlayer'
import { arrayScene, recordTrace, type TraceEvent } from '@/engine/events'
import type { BarItem, PointerTag, SceneCell, Trace } from '@/engine/trace'
import { useLessonPlayback } from '@/hooks/useLessonPlayback'

/**
 * 演示数据与算法分离：本文件 = 数据集 + HIRING-ASSISTANT 生成器（产出 Trace）+ 播放器装配。
 * 成本模型：c_i = 1（面试）、c_h = 5（雇佣）；总成本 = m·c_i + X·c_h，X = 雇佣次数。
 */

/** mulberry32：固定种子的确定性 PRNG——StrictMode 双渲染不改变洗牌结果。 */
function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** 固定种子的 Fisher-Yates：随机顺序数据集的"随机"也必须可复现。 */
function seededShuffle(values: readonly number[], seed: number): number[] {
  const rand = mulberry32(seed)
  const a = values.slice()
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1))
    const t = a[i]
    a[i] = a[j]
    a[j] = t
  }
  return a
}

const SHUFFLE_SEED = 5
const randomOrder = seededShuffle([1, 2, 3, 4, 5, 6, 7, 8], SHUFFLE_SEED)

type HireExample = ExampleOption & {
  order: number[]
  story: 'worst' | 'best' | 'random' | 'wave'
}

const hireExamples: readonly HireExample[] = [
  { id: 'ascending', label: '升序 · 步步升级', detail: '[1..8] · 雇 8 次 · 48 万', order: [1, 2, 3, 4, 5, 6, 7, 8], story: 'worst' },
  { id: 'descending', label: '降序 · 一步到位', detail: '[8..1] · 雇 1 次 · 13 万', order: [8, 7, 6, 5, 4, 3, 2, 1], story: 'best' },
  { id: 'random', label: '随机顺序 · 固定种子', detail: `种子 ${SHUFFLE_SEED} → [${randomOrder.join(',')}]`, order: randomOrder, story: 'random' },
  { id: 'wave', label: '波动 · 前缀最大', detail: '[3,5,2,7,1,6,4,8] · 雇 4 次 · 28 万', order: [3, 5, 2, 7, 1, 6, 4, 8], story: 'wave' },
]

const CI = 1
const CH = 5

const hireCode = [
  { code: 'HIRING-ASSISTANT(C)', note: '候选人按给定顺序逐个到达（流式）' },
  { code: '  best = 0', note: '岗位空缺：0 分垫底，第一位总能上岗' },
  { code: '  for i = 1 to m', note: 'm = 8 位候选人' },
  { code: '    interview(C[i]); pay c_i', note: '面试成本 1 万——不管雇不雇都要付' },
  { code: '    if C[i] > best', note: '唯一能省的是雇佣：只比现任所有人都好才换' },
  { code: '      hire(C[i]); pay c_h; best = C[i]', note: '雇佣成本 5 万：辞旧迎新' },
]

const storyCopy = {
  worst: {
    introTitle: '成本模型：面试人人要付，雇佣按次计费',
    introConclusion: '升序队伍：每个都打破纪录——预测一下 X。',
    introPrediction: {
      prompt: '升序队伍 [1..8]：每个人都比现任强，X = ?',
      options: ['8 次：每次面试都触发换人', '1 次', '4 次'],
      answer: 0,
      explanation: '第 i 位 > 前 i−1 位全部 → 每一位都是前缀严格最大值：8 次雇佣、总成本 8+40=48 万——这就是最坏。',
    },
    summaryTitle: '总账：48 万——最贵的到来顺序',
    summaryFormula: String.raw`C=8\times 1+8\times 5=${8 + 8 * CH}`,
    summaryEquation: String.raw`X=m=8:\ \text{每一步都升级——}c_h\text{ 付满}`,
    summaryNote: '40 万花在换人上：面试便宜、雇佣昂贵时，"步步升级"是最贵的走法。',
    summaryConclusion: '最坏的 X=m。换个顺序，同样的 8 个人会便宜得多。',
    summaryPrediction: {
      prompt: '把这支队伍倒过来（[8,7,…,1]），X 变成几次？',
      options: ['1 次：8 分第一个来，没人能超越', '仍是 8 次', '0 次：直接不雇'],
      answer: 0,
      explanation: '第一位即全局最大 → 只雇 1 次、总成本 13 万。顺序一换，成本差 3.7 倍——顺序就是一切。',
    },
    conclusionNote: '升序输入 = 招聘的"已排序最坏输入"：每个候选人都打破纪录。',
  },
  best: {
    introTitle: '成本模型：面试人人要付，雇佣按次计费',
    introConclusion: '第一位就是全局最强 8 分——后面还会有人上岗吗？',
    introPrediction: {
      prompt: '第一位是全局最强（8 分），后面 7 位还会有人上岗吗？',
      options: ['0 次：没人能严格超过 8', '还有 1 次', '还有很多次'],
      answer: 0,
      explanation: '雇佣条件是"严格大于现任最佳"，8 已经是天花板——后面 7 次面试照付面试费，但 5 万的雇佣费一次都不用出。',
    },
    summaryTitle: '总账：13 万——最便宜的到来顺序',
    summaryFormula: String.raw`C=8\times 1+1\times 5=${8 + CH}`,
    summaryEquation: String.raw`X=1:\ \text{首任即最强}`,
    summaryNote: '面试成本 8 万一分不少，雇佣成本压到 5 万——这是这支队伍能达到的下限。',
    summaryConclusion: '但"最好"是运气：对手递上升序队伍，总成本立刻翻近 4 倍。',
    summaryPrediction: {
      prompt: '把这支队伍正过来（[1,2,…,8]），X 变成几次？',
      options: ['8 次：每一步都升级', '仍是 1 次', '2 次'],
      answer: 0,
      explanation: '升序让每位候选人都打破纪录 → 8 次雇佣、48 万。同样 8 个人，顺序决定 13 万还是 48 万。',
    },
    conclusionNote: '降序输入 = 招聘的"最好情况"：运气无法依赖，只能靠随机顺序兜底。',
  },
  random: {
    introTitle: '成本模型：面试人人要付，雇佣按次计费',
    introConclusion: '随机顺序：边走边记账。',
    introPrediction: {
      prompt: '无论顺序怎么排，面试成本最少是多少？',
      options: ['8 万：每个人都要面一次', '0 万：可以跳过弱的', '5 万'],
      answer: 0,
      explanation: '在线约束：不见到本人无法评分，m·c_i 是刚性支出——随机顺序能压的只有雇佣次数 X。',
    },
    summaryTitle: '总账：23 万——贴近期望的一跑',
    summaryFormula: String.raw`C=8\times 1+3\times 5=${8 + 3 * CH}`,
    summaryEquation: String.raw`X=3\ \ vs\ \ E[X]=H_8\approx 2.72`,
    summaryNote: '雇佣 5、7、8 三位：3 次略高于期望 2.72 次——固定种子的一次抽样就在期望附近晃。',
    summaryConclusion: '为什么"随机顺序"能压住 X？下一拍给证明。',
    summaryPrediction: undefined,
    conclusionNote: '随机顺序把雇佣次数从最坏 m 次压到期望 H_m ≈ ln m 次。',
  },
  wave: {
    introTitle: '成本模型：面试人人要付，雇佣按次计费',
    introConclusion: '波动队伍：预测第 3 位（2 分）的命运。',
    introPrediction: {
      prompt: '第 3 位候选人只有 2 分，他会被雇佣吗？',
      options: ['不会：现任已是 5 分', '会：便宜的也先用', '看他潜力'],
      answer: 0,
      explanation: '判定只看"是否超过现任最佳"：2 < 5 直接拒绝——波动队伍里大部分面试都是这种陪跑。',
    },
    summaryTitle: '总账：28 万——4 次前缀严格最大',
    summaryFormula: String.raw`C=8\times 1+4\times 5=${8 + 4 * CH}`,
    summaryEquation: String.raw`X=4:\ \text{前缀最大值 }3,5,7,8`,
    summaryNote: '雇佣次数 = 前缀严格最大值的个数：3、5、7、8 各上岗一次，其余四位白付面试费。',
    summaryConclusion: '雇佣次数只由"刷新纪录"的次数决定——这正是期望分析要数的对象。',
    summaryPrediction: {
      prompt: '随机打乱这支队伍，雇佣次数的期望是多少？',
      options: ['H_8 ≈ 2.7 次', '仍是 4 次', '8 次'],
      answer: 0,
      explanation: '任意顺序下 E[X] = H_8 ≈ 2.717——固定顺序只是这个期望的一次抽样，4 次略高于期望很正常。',
    },
    conclusionNote: '波动输入介于最好与最坏之间：雇佣次数 = 前缀严格最大值个数。',
  },
}

function* runHiringProblem(example: HireExample): Generator<TraceEvent> {
  const copy = storyCopy[example.story]
  const order = example.order
  const m = order.length
  const states: ('pending' | 'hired' | 'rejected')[] = order.map(() => 'pending')
  let best = 0
  let bestPos = -1
  let interviews = 0
  let hires = 0
  const total = () => interviews * CI + hires * CH
  const metrics = (): MetricItem[] => [
    { label: '已面试数', value: interviews, tone: 'blue' },
    { label: '已雇佣 X', value: hires, tone: 'green' },
    { label: '面试成本', value: `${interviews * CI} 万`, tone: 'orange' },
    { label: '雇佣成本', value: `${hires * CH} 万`, tone: 'purple' },
    { label: '总成本', value: `${total()} 万`, tone: 'orange' },
  ]
  const bars = (): BarItem[] => [
    { id: 'interview', display: String(interviews * CI), value: interviews * CI, caption: `面试 ${interviews}×${CI} 万`, tone: 'focus' },
    { id: 'hire', display: String(hires * CH), value: hires * CH, caption: `雇佣 ${hires}×${CH} 万`, tone: 'pivot' },
    { id: 'total', display: String(total()), value: total(), caption: '总成本（越小越好）', tone: 'sorted' },
  ]
  const cellsOf = (): SceneCell[] => order.map((quality, index) => ({
    id: `c${index}`,
    label: quality,
    caption: states[index] === 'hired' ? '上岗' : states[index] === 'rejected' ? '拒绝' : '待面试',
    tone: states[index] === 'hired' ? 'sorted' : states[index] === 'rejected' ? 'muted' : 'default',
  }))
  const pointers = (current: number): PointerTag[] => {
    const tags: PointerTag[] = [{ index: current, label: `i = ${current + 1}`, tone: 'blue' }]
    if (bestPos >= 0) tags.push({ index: bestPos, label: '现任最佳', tone: 'purple' })
    return tags
  }

  yield { t: 'scene', scene: arrayScene('shelf', `候选质量分流式到来：${order.join(',')}（分数越高越好）`, cellsOf(), { indexes: true }) }
  yield { t: 'scene', scene: { kind: 'bars', id: 'cost', label: '成本堆积：面试（蓝）+ 雇佣（橙）= 总成本（绿）', unit: '万元', max: m * CI + m * CH, bars: bars() } }
  yield { t: 'metrics', metrics: metrics() }
  yield { t: 'legend', legend: [{ tone: 'sorted', label: '已上岗' }, { tone: 'focus', label: '正在面试' }, { tone: 'muted', label: '看过未雇' }] }
  yield { t: 'message', step: {
    title: copy.introTitle,
    tab: '成本模型',
    question: '总成本里，哪部分与到来顺序无关？',
    formula: String.raw`C=m\cdot c_i+X\cdot c_h=${m}\times 1+X\times ${CH}`,
    formulaHint: `c_i = ${CI} 万/次面试；c_h = ${CH} 万/次雇佣；X = 雇佣次数`,
    equation: String.raw`X=\#\{i:\;C_i>\max(C_1,\ldots,C_{i-1})\}`,
    invariant: '面试成本 m·c_i 固定——到来顺序唯一能优化的变量是雇佣次数 X。',
    note: '候选人按给定顺序流式到来：见一个面一个，只有比现任所有人都好才雇（旧人离开、新人上岗，花 5 万）。',
    conclusion: copy.introConclusion,
    pseudocode: { lines: hireCode, active: [0, 1] },
    prediction: copy.introPrediction,
  } }
  yield { t: 'step' }

  for (let i = 0; i < m; i += 1) {
    const quality = order[i]
    interviews += 1
    const prevBest = best
    const hired = quality > best
    if (hired) {
      hires += 1
      best = quality
      bestPos = i
      states[i] = 'hired'
    } else {
      states[i] = 'rejected'
    }
    yield { t: 'cells', scene: 'shelf', cells: cellsOf() }
    yield { t: 'pointers', scene: 'shelf', pointers: pointers(i) }
    yield { t: 'bars', scene: 'cost', bars: bars() }
    yield { t: 'metrics', metrics: metrics() }
    yield { t: 'message', step: hired ? {
      title: i === 0 ? `第 ${i + 1} 位（${quality} 分）：岗位空缺——首位上岗` : `第 ${i + 1} 位（${quality} 分）：刷新纪录——雇佣`,
      tab: `面试 ${quality} 分`,
      formula: String.raw`C_{${i + 1}}=${quality} > ${prevBest}\Rightarrow X+1,\ \text{总成本}+${CH}`,
      moves: { kind: 'one-way', title: prevBest > 0 ? `${quality} 分入职，${prevBest} 分离岗` : `${quality} 分成为首位上岗者`, moves: [{ token: `${quality} 分`, from: `第 ${i + 1} 面试席`, to: '现任最佳岗位' }], verdict: `${quality} > 现任 ${prevBest}：值得花 ${CH} 万换人` },
      judge: { entries: [{ left: `${quality} 分`, op: '>', right: prevBest > 0 ? `现任 ${prevBest} 分` : '空缺（0 分垫底）', holds: true, action: `雇佣：支付 ${CH} 万，best 更新为 ${quality}` }] },
      equation: String.raw`\text{总成本}=${interviews}\times 1+${hires}\times ${CH}=${total()}\text{ 万}`,
      invariant: '现任最佳永远等于已面试者的最大值——雇佣判定只跟这个量比。',
      note: '指示器变量视角：这一位让 X_i = 1。',
      conclusion: '下一位。',
      pseudocode: { lines: hireCode, active: [2, 3, 4, 5] },
    } : {
      title: `第 ${i + 1} 位（${quality} 分）：不超过现任——拒绝`,
      tab: `面试 ${quality} 分`,
      formula: String.raw`C_{${i + 1}}=${quality}\le ${best}\Rightarrow\text{只付面试费 }${CI}\text{ 万}`,
      judge: { entries: [{ left: `${quality} 分`, op: '≤', right: `现任 ${best} 分`, holds: false, action: `不雇佣——省下 ${CH} 万换人费` }] },
      equation: String.raw`\text{总成本}=${interviews}\times 1+${hires}\times ${CH}=${total()}\text{ 万}`,
      invariant: '现任最佳不变：X_i = 0，但 1 万面试费照付。',
      note: '拒绝是免费的下限保护：面试费沉没，雇佣费省下。',
      conclusion: '下一位。',
      pseudocode: { lines: hireCode, active: [2, 3, 4] },
    } }
    yield { t: 'step' }
  }

  yield { t: 'bars', scene: 'cost', bars: bars() }
  yield { t: 'metrics', metrics: metrics() }
  yield { t: 'message', step: {
    title: copy.summaryTitle,
    tab: '总账',
    formula: copy.summaryFormula,
    equation: copy.summaryEquation,
    invariant: '面试成本 8 万一分不少；总账的全部弹性都在雇佣成本上。',
    note: copy.summaryNote,
    conclusion: copy.summaryConclusion,
    pseudocode: { lines: hireCode, active: [] },
    prediction: copy.summaryPrediction,
  } }
  yield { t: 'step' }

  if (example.story === 'random') {
    yield { t: 'metrics', metrics: metrics() }
    yield { t: 'message', step: {
      title: '期望分析：第 i 位是"迄今最佳"的概率 = 1/i',
      tab: '期望分析',
      question: '第 i 个候选人是迄今最好的概率是多少？',
      formula: String.raw`P(X_i=1)=\tfrac{1}{i}\Rightarrow E[X]=\sum_{i=1}^{8}\tfrac{1}{i}=H_8\approx 2.717`,
      formulaHint: '前 i 个位置的相对次序均匀分布："最大"等概率落在任何一位',
      equation: String.raw`E[C]=8\times 1+H_8\times 5\approx 8+13.59=21.6\text{ 万}`,
      invariant: '面试成本 8 万雷打不动；期望分析只针对雇佣次数 X。',
      note: '指示器随机变量：X = ΣX_i，其中 X_i = 1{第 i 位是前 i 位最大}。期望的线性性让"雇几次"变成一道概率求和——本次实跑 X=3，期望 2.72，对得上。',
      conclusion: '把"雇几次"从命运变成期望——这就是随机顺序的兜底能力。',
      pseudocode: { lines: hireCode, active: [] },
      prediction: {
        prompt: '第 i 个候选人是迄今最好的概率是多少？',
        options: ['1/i：前 i 位每个都等概率排第一', '1/8：与 i 无关', '1/2'],
        answer: 0,
        explanation: '前 i 位的相对排名均匀分布，最大值落在第 i 位的概率是 1/i；求和 Σ1/i = H_8 ≈ 2.717——对数增长。',
      },
    } }
    yield { t: 'step' }
  }

  yield { t: 'metrics', metrics: metrics() }
  yield { t: 'message', step: {
    title: '结论：随机顺序把最坏 m 次压到期望 ln m 次',
    tab: '结论',
    formula: String.raw`E[X]=H_m\approx\ln m+0.577,\quad C=m\cdot c_i+E[X]\cdot c_h`,
    equation: example.story === 'random'
      ? String.raw`X_{\text{升序}}=8,\quad X_{\text{降序}}=1,\quad E[X]=H_8\approx 2.717`
      : String.raw`\text{本组 }X=${hires},\quad E[X]=H_8\approx 2.717`,
    invariant: '无论输入长什么样：面试成本不可省，随机顺序只优化雇佣次数。',
    note: `${copy.conclusionNote} m=1000 时期望仅 H_1000 ≈ 7.5 次——对数增长，这就是"随机顺序"换来的指数级改善。`,
    conclusion: '指示器随机变量 X = ΣX_i 把"雇几次"变成概率求和——期望分析的通用套路。',
    pseudocode: { lines: hireCode, active: [] },
  } }
  yield { t: 'step' }
}

const buildHireTrace = (example: HireExample): Trace => recordTrace('SANDBOX 21 · HIRING PROBLEM', '面试 1 万必付、雇佣 5 万按次计：随机到来顺序把雇佣次数从最坏 m 压到期望 ln m——指示器随机变量的标准应用。', runHiringProblem(example))

const hireInsight: DesignInsight = {
  observation: '指示器随机变量把"雇几次"变成概率求和：E[X] = ΣP(第 i 位是前 i 位最大) = Σ1/i = H_m ≈ ln m——期望分析的标准武器。',
  contrasts: [
    { alternative: '先全部面试完再录用最好的', whyNot: '没有"先到先上岗"的业务约束时最优，但招聘是流式决策：候选人不会等你——在线算法用期望最优兜底。' },
  ],
  transfer: { prompt: 'm=1000 时期望雇佣次数大约是？', options: ['约 ln 1000 ≈ 7 次', '500 次', '999 次'], answer: 0, explanation: 'H_1000 ≈ 7.49——对数增长，这就是"随机顺序"带来的指数级改善。' },
}

const hireComplexity: ComplexityProfileData = {
  title: '招聘问题：雇佣次数由到来顺序决定',
  subtitle: 'm=8、c_i=1 万、c_h=5 万：总成本 = 8 + 5X，唯一变量是雇佣次数 X。',
  cases: [
    { label: '最好', complexity: 'Θ(m) + 1 次雇佣', condition: '候选按质量降序到来：首任即全局最强。', example: '[8,7,6,5,4,3,2,1] → 总成本 13 万', explanation: 'X=1：后续 7 次面试只付 1 万/次，雇佣费一分不多。', tone: 'method' },
    { label: '期望', complexity: 'Θ(m) + H_m 次雇佣', condition: '候选按随机顺序到来。', example: 'E[X] = H₈ ≈ 2.72 → 总成本 ≈ 21.6 万', explanation: 'E[X] = Σ1/i = ln m + O(1)；m=1000 时仅约 7.5 次。', tone: 'method' },
    { label: '最差', complexity: 'Θ(m) + m 次雇佣', condition: '候选按质量升序到来：每位都打破纪录。', example: '[1,2,…,8] → 总成本 48 万', explanation: 'X=m：每一步都花 5 万换人——"步步升级"的灾难。', tone: 'method' },
  ],
  footer: '面试成本不可省，随机顺序只优化雇佣次数。',
}

export function HiringProblemLesson() {
  const [exampleId, setExampleId] = useState(hireExamples[0].id)
  const example = hireExamples.find(item => item.id === exampleId) ?? hireExamples[0]
  const trace = buildHireTrace(example)
  const playback = useLessonPlayback(trace.steps.length)
  return <LessonShell eyebrow={trace.eyebrow} title={trace.steps[playback.step].title} description={trace.description} steps={trace.steps.map(item => item.tab ?? '推演')} step={playback.step} onStepChange={playback.setStep} playing={playback.playing} onTogglePlaying={playback.togglePlaying} onReplay={playback.replay} speed={playback.speed} onCycleSpeed={playback.cycleSpeed} complexity={hireComplexity} examplePicker={<ExamplePicker examples={hireExamples} value={exampleId} onChange={id => { playback.reset(); setExampleId(id) }} />}>
    <TracePlayer trace={trace} step={playback.step} />
    <DesignNotes insight={hireInsight} />
  </LessonShell>
}
