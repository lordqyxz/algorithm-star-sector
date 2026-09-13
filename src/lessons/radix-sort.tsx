import { useState } from 'react'
import { DesignNotes, type DesignInsight } from '@/components/DesignNotes'
import { ExamplePicker, type ExampleOption } from '@/components/ExamplePicker'
import { LessonShell } from '@/components/LessonShell'
import type { ComplexityProfileData } from '@/components/ComplexityProfile'
import type { MetricItem } from '@/components/CalcDesk'
import { TracePlayer } from '@/engine/TracePlayer'
import { arrayScene, recordTrace, tokenLabel, tokenize, type TraceEvent } from '@/engine/events'
import type { BucketScene, SceneCell, Tone, Trace } from '@/engine/trace'
import { useLessonPlayback } from '@/hooks/useLessonPlayback'

/** 演示数据与算法分离：本文件 = 数据集 + 算法生成器（产出 Trace）+ 播放器装配。 */

type SortExample = ExampleOption & { values: number[] }
type Tok = { value: number; tag?: string; seed: number }

/** 三位十进制数，LSD 从个位（pos = 0）跑到百位（pos = 2），每轮值域 0..9。 */
const DIGITS = 3
const digitNames = ['个位', '十位', '百位']

const radixExamples: readonly SortExample[] = [
  { id: 'clrs', label: 'CLRS 例题', detail: '[329,457,657,839,436,720,355,271]', values: [329, 457, 657, 839, 436, 720, 355, 271] },
  { id: 'duplicates', label: '重复键', detail: '[329,457,657,839,436,720,329,271] 查稳定', values: [329, 457, 657, 839, 436, 720, 329, 271] },
  { id: 'aligned', label: '整齐三位', detail: '[111,222,333,444]', values: [111, 222, 333, 444] },
  { id: 'descending', label: '逐位递减', detail: '[987,876,765,654,543,432,321,210]', values: [987, 876, 765, 654, 543, 432, 321, 210] },
]

const radixCode = [
  { code: 'RADIX-SORT(A, d)', note: 'd = 位数；i = 1 表示个位，LSD 低位先行' },
  { code: '  for i = 1 to d', note: '每轮一个"按位稳定计数排序"' },
  { code: '    按第 i 位数字稳定计数排序 A', note: '第 i 轮只看第 i 位数字（0..9）' },
  { code: '      分桶：digit = 第 i 位数字', note: '沿当前数组从左到右扫描入桶，桶内保持先后' },
  { code: '      收集：桶 0..9 依次接回 A', note: '桶内不重排——上一轮的相对顺序原样保留' },
]

const label = tokenLabel
const digitOf = (value: number, pos: number) => Math.floor(value / 10 ** pos) % 10

function arrayCells(order: readonly Tok[], pos: number | null, mode: 'digit' | 'from', tone: Tone): SceneCell[] {
  return order.map(token => ({
    id: `t${token.seed}`,
    label: label(token),
    caption: pos === null
      ? undefined
      : mode === 'digit'
        ? `${digitNames[pos]}=${digitOf(token.value, pos)}`
        : `来自桶 ${digitOf(token.value, pos)}`,
    tone,
  }))
}

function bucketCells(group: readonly Tok[]): SceneCell[] {
  return group.map(token => ({ id: `t${token.seed}`, label: label(token) }))
}

function bucketView(groups: readonly Tok[][], pos: number, finished: boolean): BucketScene {
  return {
    kind: 'buckets',
    id: 'buckets',
    label: finished ? '分桶已收空' : `按${digitNames[pos]}分桶（桶内保持先后）`,
    buckets: groups.map((group, d) => ({
      id: `d${d}`,
      label: `桶 ${d}`,
      range: finished ? undefined : `${digitNames[pos]}=${d}`,
      cells: bucketCells(group),
    })),
  }
}

const tagsOf = (order: readonly Tok[]) => order.filter(token => token.tag).map(label)

function* runRadixSort(values: readonly number[]): Generator<TraceEvent> {
  const tokens = tokenize(values)
  const n = tokens.length
  let work = tokens.slice()
  let writes = 0
  let round = 0
  const metrics = (): MetricItem[] => [
    { label: '元素间比较', value: 0, tone: 'orange' },
    { label: '已完成轮次', value: `${round} / ${DIGITS}`, tone: 'blue' },
    { label: '累计写入', value: writes, tone: 'purple' },
  ]

  yield { t: 'scene', scene: arrayScene('array', 'A · 当前顺序', arrayCells(work, null, 'digit', 'default'), { indexes: true }) }
  yield { t: 'scene', scene: bucketView(Array.from({ length: 10 }, () => []), 0, false) }
  yield { t: 'metrics', metrics: metrics() }
  yield { t: 'legend', legend: [{ tone: 'target', label: '本轮按当前位分桶' }, { tone: 'sorted', label: '最终就位' }, { tone: 'muted', label: '空桶' }] }
  yield {
    t: 'message',
    step: {
      title: `问题：${DIGITS} 位十进制数，LSD 从个位开始`,
      tab: '问题',
      formula: String.raw`d=${DIGITS},\ k=10;\ T(n)=\Theta(d(n+k))`,
      formulaHint: `每轮只看一个数位（0..9 共 10 个桶），d=${DIGITS} 轮接力。`,
      equation: String.raw`\text{每轮一个稳定计数排序 }n+k\text{ 步},\ d\text{ 轮合计 }d(n+k)`,
      invariant: '每轮结束后：数组按"已处理过的低位"有序——高位这一轮还没动。',
      note: 'LSD 基数排序把排序拆成 d 轮"按位分拣"：每轮用稳定计数排序按当前位重排，桶内不重排。排序零件就是上一节的计数排序。',
      conclusion: '先看个位怎么分桶。',
      pseudocode: { lines: radixCode, active: [0, 1] },
    },
  }
  yield { t: 'step' }

  for (let pos = 0; pos < DIGITS; pos += 1) {
    round = pos + 1
    // 真正执行按位稳定计数排序：计数 → 前缀和 → 逆序放置
    const counts = new Array<number>(10).fill(0)
    for (const token of work) counts[digitOf(token.value, pos)] += 1
    for (let d = 1; d < 10; d += 1) counts[d] += counts[d - 1]
    const next: Tok[] = new Array(n)
    for (let j = n - 1; j >= 0; j -= 1) {
      const d = digitOf(work[j].value, pos)
      next[counts[d] - 1] = work[j]
      counts[d] -= 1
    }
    // 展示用分桶视图：与计数排序结果等价（桶内 = 按当前数组顺序）
    const groups: Tok[][] = Array.from({ length: 10 }, () => [])
    for (const token of work) groups[digitOf(token.value, pos)].push(token)
    const beforeTags = tagsOf(work)
    const afterTags = tagsOf(next)

    // 分桶拍
    writes += n
    yield { t: 'cells', scene: 'array', cells: arrayCells(work, pos, 'digit', 'target') }
    for (let d = 0; d < 10; d += 1) yield { t: 'bucket', scene: 'buckets', bucket: `d${d}`, cells: bucketCells(groups[d]) }
    yield { t: 'metrics', metrics: metrics() }
    yield {
      t: 'message',
      step: {
        title: `第 ${round} 轮分桶：只看${digitNames[pos]}`,
        tab: `${digitNames[pos]}·分桶`,
        formula: pos === 0 ? String.raw`b(v) = v \bmod 10` : String.raw`b(v) = \left\lfloor v/10^{${pos}}\right\rfloor \bmod 10`,
        formulaHint: `例：${label(work[0])} 的${digitNames[pos]}是 ${digitOf(work[0].value, pos)}，所以进桶 ${digitOf(work[0].value, pos)}。`,
        equation: String.raw`\text{本轮写入 }${n}\text{ 次，元素间比较 }0\text{ 次}`,
        invariant: '桶内顺序 = 当前数组顺序：当前位相同的数不交换先后。',
        note: round === 1
          ? '第 1 轮没有"上一轮结果"可沿用；从这轮起，每轮收集都会把桶内先后原样带走。'
          : `第 ${round} 轮只看${digitNames[pos]}，但桶内的先后沿用第 ${round - 1} 轮的结果。`,
        conclusion: '桶 0..9 依次接回。',
        moves: {
          kind: 'one-way',
          title: `按${digitNames[pos]}归桶`,
          moves: groups.flatMap((group, d) => group.length > 0 ? [{ token: `[${group.map(label).join(', ')}]`, from: '当前数组', to: `桶 ${d}` }] : []),
          verdict: `只读${digitNames[pos]}数字入桶，不做任何比较。`,
        },
        prediction: pos === 0
          ? { prompt: '第 1 轮只按个位分桶并收集，数组此刻整体有序了吗？', options: ['没有：个位有序只是铺垫，后面还有十位、百位', '已经完全有序', '只有个位是 0 的数有序'], answer: 0, explanation: '每轮只保证"按当前位有序"。整体顺序要等百位轮结束；而个位轮的成果靠"稳定"被后续轮次保留。' }
          : pos === 1
            ? { prompt: '两个十位相同的数（桶号一样），谁先进桶？', options: ['按当前数组顺序：上一轮的结果说了算', '数值小的先', '随机'], answer: 0, explanation: '分桶沿当前数组从左到右扫描：先进桶的先被收集。上一轮排出的相对顺序就这样被"携带"进下一轮——这就是每轮必须稳定的理由。' }
            : undefined,
        pseudocode: { lines: radixCode, active: [2, 3] },
      },
    }
    yield { t: 'step' }

    // 收集拍
    writes += n
    work = next
    let acc = 0
    const collectMoves = groups.map((group, d) => {
      const start = acc
      acc += group.length
      return { group, d, start, end: acc }
    }).filter(item => item.group.length > 0)
      .map(item => ({ token: `[${item.group.map(label).join(', ')}]`, from: `桶 ${item.d}`, to: item.start + 1 === item.end ? `A[${item.end}]` : `A[${item.start + 1}..${item.end}]` }))
    yield { t: 'cells', scene: 'array', cells: arrayCells(work, pos, 'from', pos === DIGITS - 1 ? 'sorted' : 'default') }
    yield { t: 'metrics', metrics: metrics() }
    yield {
      t: 'message',
      step: {
        title: `第 ${round} 轮收集：桶 0..9 依次接回`,
        tab: `${digitNames[pos]}·收集`,
        formula: String.raw`A \gets \text{桶}0 \to \text{桶}1 \to \cdots \to \text{桶}9`,
        formulaHint: `本轮之后数组按${digitNames[pos]}有序${round > 1 ? `；${digitNames[pos]}相同的组内保持上一轮顺序` : ''}。`,
        equation: String.raw`\text{本轮写入 }${n}\text{ 次；累计 }${writes}\text{ 次，比较 }0\text{ 次}`,
        invariant: `第 ${round} 轮只看${digitNames[pos]}，但收集顺序沿用第 ${round - 1} 轮的结果——桶内不重排。`,
        note: `这就是接力规则：${digitNames[pos]}不同的数已经分层；${digitNames[pos]}相同的数，先后完全继承上一轮。`,
        conclusion: round === DIGITS ? '最高位排完，数组全序。' : `带着本轮成果进入${digitNames[pos + 1]}。`,
        moves: { kind: 'one-way', title: '按桶号接回数组', moves: collectMoves, verdict: '桶号递增给出区间顺序；桶内保持进桶时的先后。' },
        stability: beforeTags.length > 0
          ? { statement: `带身份的相等键收集后仍是 ${afterTags.join(' → ')}：当前位相同的数按进桶顺序原样出来。`, before: beforeTags, after: afterTags, stable: true, note: `${digitNames[pos]} 相同不重排——上一轮定下的相对顺序原样保留。` }
          : undefined,
        prediction: pos === DIGITS - 1
          ? { prompt: '百位轮结束后，个位轮和十位轮的排序成果去哪了？', options: ['都还在：高位相同的数按低位结果排列', '被百位覆盖了', '只剩百位有序'], answer: 0, explanation: '百位不同的数已按百位分层；百位相同的组内顺序完全继承十位轮，十位相同的又继承个位轮——三轮接力合成全序。' }
          : undefined,
        pseudocode: { lines: radixCode, active: [4] },
      },
    }
    yield { t: 'step' }
  }

  // 完成
  const finalTags = tagsOf(work)
  yield { t: 'cells', scene: 'array', cells: arrayCells(work, null, 'digit', 'sorted') }
  yield { t: 'scene', scene: bucketView(Array.from({ length: 10 }, () => []), 0, true) }
  yield { t: 'metrics', metrics: metrics() }
  yield {
    t: 'message',
    step: {
      title: `完成：${DIGITS} 轮稳定计数排序接力`,
      tab: '完成',
      formula: String.raw`T(n)=\Theta(d(n+k))=\Theta(${DIGITS}\times(${n}+10))`,
      formulaHint: '每一轮的分桶与收集都零比较——复杂度与输入分布无关。',
      equation: String.raw`\text{累计写入 }${writes}\text{ 次（每轮 }2n\text{），元素间比较 }0\text{ 次}`,
      invariant: '每一轮都稳定 ⇒ 整体稳定：相等键每轮都按进桶顺序原样出来。',
      note: '最好、平均、最差同为 Θ(d(n+k))——d、k 固定时成本与输入分布无关。真正的边界是位数 d 变大或位数不齐（1 和 9999999 混排会白白空转）。',
      conclusion: '定长键（整数、日期、定长字符串）都适用这套"按位接力"。',
      stability: finalTags.length > 0
        ? { title: '稳定性证据：三轮之后的身份顺序', statement: `输入 ${tagsOf(tokens).join(' → ')}，最终 ${finalTags.join(' → ')}——每一轮都稳定，整体就稳定。`, before: tagsOf(tokens), after: finalTags, stable: true }
        : undefined,
      pseudocode: { lines: radixCode, active: [] },
    },
  }
  yield { t: 'step' }
}

export const buildRadixTrace = (example: SortExample): Trace => recordTrace('SANDBOX 08 · RADIX SORT', 'LSD 从个位到百位：每轮一个稳定计数排序，收集时桶内沿用上一轮的相对顺序——三轮接力排定三位数。', runRadixSort(example.values))

const radixInsight: DesignInsight = {
  observation: 'LSD 的接力规则只有一句话：第 d 轮只看第 d 位，但收集时桶内保持第 d−1 轮定下的相对顺序——于是高位相同时，低位先前的排序自动生效。',
  contrasts: [
    { alternative: 'MSD（高位优先）', whyNot: '第一轮就能大幅分组，但每个桶要各自递归子排序、实现与栈开销都更大；LSD 每轮跑同一个稳定计数排序，一条循环、天然稳定。' },
    { alternative: '直接比较整个数', whyNot: 'Θ(n log n) 且对任意可比较键通用；基数排序换成 Θ(d(n+k))，d、k 小且固定时更快，代价是键必须可拆位。' },
  ],
  transfer: { prompt: '对负数做 LSD 基数排序，按现在的取位公式会出什么问题？', options: ['负号没有数字位：要先分离符号或整体平移成非负数', '没问题：取位自动处理', '只需要多跑一轮'], answer: 0, explanation: 'digit = ⌊v/10^i⌋ mod 10 对负数不成立（取模得负）。工程做法是按符号分两组分别排，或全体加偏移量——这正是"键可拆位"前提的边界条件。' },
}

const radixComplexity: ComplexityProfileData = {
  title: '基数排序：d 轮 × 稳定计数排序，成本不看输入脸色',
  subtitle: 'CLRS RADIX-SORT（LSD）：每轮按一个数位做稳定计数排序，k = 10。',
  cases: [
    { label: '最好', complexity: 'Θ(d(n+k))', condition: '没有更幸运的输入：d 轮、每轮 n+k 步是定数，第一轮就"看起来有序"也照样跑完。', example: '[111,222,333,444]（第一轮后已有序，后两轮空转）', explanation: '每轮稳定计数排序花 n+k；d 轮合计 d(n+k)。', tone: 'best' },
    { label: '平均', complexity: 'Θ(d(n+k))', condition: 'd 位十进制整数，数位值域 k=10。', example: '[329,457,657,839,436,720,355,271]', explanation: '3 轮 × (8+10) 步；d、k 固定时就是线性。', tone: 'average' },
    { label: '最差', complexity: 'Θ(d(n+k))', condition: '仍不变——比较排序的 n log n 与 n² 分岔在这里不存在；真正要防的是 d 变大或位数不齐。', example: '[987,876,765,654,543,432,321,210]', explanation: '键变长（d ↑）成本线性放大；k 也可换成"按字节"来调常数。', tone: 'worst' },
  ],
  footer: '位数不齐（1 和 999999999 混排）会浪费轮次——先补齐位数或分组处理；基数排序赢在 d、k 小且固定，输在"键必须可拆位"。',
  stability: { status: 'stable', label: '稳定排序', statement: '每一轮都用稳定排序：当前位相同的数在收集时保留低位轮定下的先后。329A、329B 三轮之后仍是 329A → 329B。', before: '329A → 329B', after: '329A → 329B' },
}

export function RadixSortLesson() {
  const [exampleId, setExampleId] = useState(radixExamples[0].id)
  const example = radixExamples.find(item => item.id === exampleId) ?? radixExamples[0]
  const trace = buildRadixTrace(example)
  const playback = useLessonPlayback(trace.steps.length)
  return <LessonShell eyebrow={trace.eyebrow} title={trace.steps[playback.step].title} description={trace.description} steps={trace.steps.map(item => item.tab ?? '推演')} step={playback.step} onStepChange={playback.setStep} playing={playback.playing} onTogglePlaying={playback.togglePlaying} onReplay={playback.replay} speed={playback.speed} onCycleSpeed={playback.cycleSpeed} complexity={radixComplexity} examplePicker={<ExamplePicker examples={radixExamples} value={exampleId} onChange={id => { playback.reset(); setExampleId(id) }} />}>
    <TracePlayer trace={trace} step={playback.step} />
    <DesignNotes insight={radixInsight} />
  </LessonShell>
}
