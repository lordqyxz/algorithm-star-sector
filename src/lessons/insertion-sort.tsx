import { useState } from 'react'
import { DesignNotes, type DesignInsight } from '@/components/DesignNotes'
import { ExamplePicker, type ExampleOption } from '@/components/ExamplePicker'
import { LessonShell } from '@/components/LessonShell'
import type { ComplexityProfileData } from '@/components/ComplexityProfile'
import type { MetricItem } from '@/components/CalcDesk'
import { TracePlayer } from '@/engine/TracePlayer'
import { arrayScene, recordTrace, tokenLabel, tokenize, type TraceEvent } from '@/engine/events'
import type { SceneCell, Trace } from '@/engine/trace'
import { useLessonPlayback } from '@/hooks/useLessonPlayback'

/** 演示数据与算法分离：本文件 = 数据集 + 算法生成器（产出 Trace）+ 播放器装配。 */

type SortExample = ExampleOption & { values: number[] }
type Tok = { value: number; tag?: string; seed: number }

const insertionExamples: readonly SortExample[] = [
  { id: 'mixed', label: '课堂混合', detail: '[5,2,4,6,1,3]', values: [5, 2, 4, 6, 1, 3] },
  { id: 'sorted', label: '已经有序', detail: '最好 Θ(n)', values: [1, 2, 3, 4, 5, 6] },
  { id: 'reversed', label: '完全逆序', detail: '最坏 Θ(n²)', values: [6, 5, 4, 3, 2, 1] },
  { id: 'duplicates', label: '重复键', detail: '4A/4B/4C 查稳定', values: [4, 2, 4, 1, 4, 3] },
]

const insertionCode = [
  { code: 'for j = 2 to A.length', note: '绿色前缀逐张长大' },
  { code: '  key = A[j]', note: '拿起第一张未整理的牌' },
  { code: '  i = j - 1' },
  { code: '  while i > 0 and A[i] > key', note: '移动依据：左邻是否更大' },
  { code: '    A[i+1] = A[i]', note: '左邻右移一格，洞左移' },
  { code: '    i = i - 1' },
  { code: '  A[i+1] = key', note: '落到洞里；相等键不越过 → 稳定' },
]

const label = (token: Tok) => token.tag ?? String(token.value)

/** 洞里显示暂存的 key（sorting.at 的 ITEM IN MEMORY 语义），其余格子按区域着色。 */
function cellsOf(work: Tok[], sortedCount: number, held: Tok | null, hole: number, focus: number): SceneCell[] {
  return work.map((token, index) => {
    if (held && index === hole) return { id: 'hole', label: label(held), caption: '暂存', tone: 'key' }
    return {
      id: `t${token.seed}`,
      label: label(token),
      tone: index === focus ? 'focus' : index < sortedCount ? 'sorted' : 'default',
    }
  })
}

function* runInsertionSort(values: readonly number[]): Generator<TraceEvent> {
  const tokens = tokenize(values)
  const n = tokens.length
  const work = tokens.slice()
  let sortedCount = 1
  let compares = 0
  let moves = 0
  let firstShiftSeen = false
  const metrics = (): MetricItem[] => [
    { label: '已整理前缀', value: `${sortedCount} / ${n}`, tone: 'green' },
    { label: '累计比较', value: compares, tone: 'orange' },
    { label: '累计移动', value: moves, tone: 'purple' },
  ]
  yield { t: 'scene', scene: arrayScene('shelf', '货架：绿色区已有序', cellsOf(work, 1, null, -1, -1), { indexes: true }) }
  yield { t: 'metrics', metrics: metrics() }
  yield { t: 'legend', legend: [{ tone: 'sorted', label: '已整理区（不变量）' }, { tone: 'key', label: '暂存的 key' }, { tone: 'focus', label: '正在右移' }] }
  yield {
    t: 'message',
    step: {
      title: '先立规矩：前 1 张牌天然有序',
      tab: '规矩',
      formula: String.raw`A[1..1]\text{ 已排序};\ \text{目标：逐张插入使前缀始终有序}`,
      equation: String.raw`\text{循环不变量：每次操作后 }A[1..j-1]\text{ 仍有序}`,
      invariant: '绿色区永远有序——拿起、比较、右移、放下都不破坏它。',
      note: '插入排序 = 逐张把未整理区的第一张牌插进绿色区的正确位置。',
      conclusion: '拿起第 2 张牌，开始第一次插入。',
      pseudocode: { lines: insertionCode, active: [0] },
    },
  }
  yield { t: 'step' }
  for (let j = 1; j < n; j += 1) {
    const key = work[j]
    let hole = j
    yield { t: 'cells', scene: 'shelf', cells: cellsOf(work, sortedCount, key, hole, -1) }
    yield { t: 'message', step: { title: `拿起 key=${label(key)}（第 ${j + 1} 张）`, tab: `取 key=${label(key)}`, formula: `key=A[${j + 1}]=${key.value}`, equation: String.raw`\text{绿色区 }[1..${j}]\text{ 有序，洞腾出后逐个比较}`, invariant: '绿色区仍有序；key 暂存在洞里。', note: '接下来把 key 与左邻逐个比较，更大的右移一格。', conclusion: `与左邻 A[${j}] 比较。`, pseudocode: { lines: insertionCode, active: [1, 2] } } }
    yield { t: 'step' }
    while (hole > 0) {
      compares += 1
      const left = work[hole - 1]
      if (left.value > key.value) {
        moves += 1
        work[hole] = left
        hole -= 1
        yield { t: 'cells', scene: 'shelf', cells: cellsOf(work, sortedCount, key, hole, hole + 1) }
        yield { t: 'metrics', metrics: metrics() }
        yield { t: 'message', step: { title: `比较：${label(left)} > key=${label(key)}，${label(left)} 右移一格`, tab: '右移', formula: `A[${hole + 2}]=${left.value}>key=${key.value}\Rightarrow\text{右移}`, equation: `比较 ${compares} 次，移动 ${moves} 次`, invariant: 'key 仍暂存在洞里；让位后的区域依然有序。', note: `${label(left)} 比 key 大，key 要插在它左边，所以它右移一格腾位。`, conclusion: '继续与新的左邻比较。', moves: { kind: 'one-way', title: `key=${label(key)} 要去左边，${label(left)} 让位`, moves: [{ token: label(left), from: `第 ${hole + 1} 格`, to: `第 ${hole + 2} 格` }], verdict: `${label(left)} > key=${label(key)}，让位给 key。` }, judge: { entries: [{ left: label(left), op: '>', right: `key=${label(key)}`, holds: true, action: `${label(left)} 右移一格` }] }, pseudocode: { lines: insertionCode, active: [3, 4, 5] }, prediction: firstShiftSeen ? undefined : { prompt: `${label(left)} 右移后，洞现在在第几格？`, options: [`第 ${hole + 1} 格`, `第 ${hole + 2} 格`, '还在原地'], answer: 0, explanation: `右移是把洞向左传：让位的元素去了第 ${hole + 2} 格，洞落到第 ${hole + 1} 格，继续与左邻比较。` } } }
        yield { t: 'step' }
        firstShiftSeen = true
      } else {
        yield { t: 'cells', scene: 'shelf', cells: cellsOf(work, sortedCount, key, hole, hole - 1) }
        yield { t: 'metrics', metrics: metrics() }
        yield { t: 'message', step: { title: `比较：${label(left)} ≤ key=${label(key)}，停止右移`, tab: '停', formula: `A[${hole}]=${left.value}\le key=${key.value}\Rightarrow\text{停}`, equation: `比较 ${compares} 次，移动 ${moves} 次`, invariant: '绿色区仍有序；key 的家就是当前洞。', note: `${label(left)} 不比 key 大，说明洞就是 key 的位置；相等键也不右移，这就是稳定的来源。`, conclusion: '把 key 放进洞里。', judge: { entries: [{ left: label(left), op: '≤', right: `key=${label(key)}`, holds: false, action: '停止右移，key 落位' }] }, pseudocode: { lines: insertionCode, active: [3, 4] } } }
        yield { t: 'step' }
        break
      }
    }
    work[hole] = key
    moves += 1
    sortedCount = j + 1
    yield { t: 'cells', scene: 'shelf', cells: cellsOf(work, sortedCount, null, -1, -1) }
    yield { t: 'metrics', metrics: metrics() }
    yield { t: 'message', step: { title: `key=${label(key)} 落位：绿色区长大到 ${sortedCount} 张`, tab: `落位 ${label(key)}`, formula: `A[${hole + 1}]=key=${key.value};\ \text{前缀 }[1..${sortedCount}]\text{ 有序}`, equation: `比较 ${compares} 次，移动 ${moves} 次`, invariant: `循环不变量再次成立：绿色区扩大一格且仍有序。`, note: '这一张牌插入完成，绿色区右边界右移一格。', conclusion: j === n - 1 ? '最后一张已落位，货架全序。' : '拿起下一张未整理的牌。', pseudocode: { lines: insertionCode, active: [6] } } }
    yield { t: 'step' }
  }
  yield { t: 'metrics', metrics: metrics() }
  yield { t: 'message', step: { title: `完成：${compares} 次比较、${moves} 次移动`, tab: '完成', formula: `\text{本次输入：}${compares}\text{ 次比较},\ ${moves}\text{ 次移动}`, equation: String.raw`\text{最坏（全逆序）：}\sum_{j=2}^{n}(j-1)=\tfrac{n(n-1)}{2}`, invariant: `整排货架有序；绿色区覆盖全部 ${n} 张牌。`, note: '已有序输入只需 n−1 次比较、0 次移动（Θ(n)）；全逆序要 n(n−1)/2 次（Θ(n²)）——复杂度由输入条件决定。', conclusion: '换个数据集再玩一次：有序、逆序、重复键，感受同一段代码的三种命运。', pseudocode: { lines: insertionCode, active: [] } } }
  yield { t: 'step' }
}

const buildInsertionTrace = (example: SortExample): Trace => recordTrace('SANDBOX 06 · INSERTION SORT', '拿起、比较、右移、放下——四个动作就是插入排序的全部；绿色区是不变量。', runInsertionSort(example.values))

const insertionInsight: DesignInsight = {
  observation: '绿色前缀是循环不变量：每个动作都只在"不破坏前缀有序"的前提下进行——正确性不靠检查全局，只靠维护这一条局部性质。',
  contrasts: [
    { alternative: '选择排序（每轮找最小值）', whyNot: '比较次数固定 n²/2、不看输入脸色；相等键会跨越（不稳定），也无法在有序输入上提前收工——插入排序能拿到 Θ(n)。' },
    { alternative: '二分插入', whyNot: '比较降到 Θ(n log n)，但移动步数一步省不掉——移动才是插入排序的硬成本。' },
  ],
  transfer: { prompt: '如果货架是链表，"右移一格"会变成什么？', options: ['不用右移：找到位置后改两个指针即可插入', '还是要逐格右移', '链表不能插入排序'], answer: 0, explanation: '数组插入要搬动后续元素；链表插入只改指针——"找位置"仍要逐个比较，但"腾位置"的成本消失了。' },
}

const insertionComplexity: ComplexityProfileData = {
  title: '插入排序：复杂度由输入条件决定',
  subtitle: '标准原地插入排序：逐张把未整理区的第一张牌插进有序前缀。',
  cases: [
    { label: '最好', complexity: 'Θ(n)', condition: '输入已经有序：每张只比较一次，零移动。', example: '[1,2,3,4,5,6]', explanation: 'while 条件第一次就为假，前缀检查即收工。', tone: 'best' },
    { label: '平均', complexity: 'Θ(n²)', condition: '随机排列：平均每张越过一半前缀。', example: '[5,2,4,6,1,3]', explanation: '期望移动约 n²/4，比较约 n²/4。', tone: 'average' },
    { label: '最差', complexity: 'Θ(n²)', condition: '完全逆序：每张要越过全部前缀。', example: '[6,5,4,3,2,1]', explanation: '比较与移动都是 n(n−1)/2。', tone: 'worst' },
  ],
  footer: '二分插入可以把比较压到 Θ(n log n)，但移动不变——这是插入排序的硬成本。',
  stability: { status: 'stable', label: '稳定排序', statement: '相等键不右移、不越过：后拿的 key 落在相等键的右边，身份顺序保持。', before: '4A → 4B', after: '4A → 4B' },
}

export function InsertionSortLesson() {
  const [exampleId, setExampleId] = useState(insertionExamples[0].id)
  const example = insertionExamples.find(item => item.id === exampleId) ?? insertionExamples[0]
  const trace = buildInsertionTrace(example)
  const playback = useLessonPlayback(trace.steps.length)
  return <LessonShell eyebrow={trace.eyebrow} title={trace.steps[playback.step].title} description={trace.description} steps={trace.steps.map(item => item.tab ?? '推演')} step={playback.step} onStepChange={playback.setStep} playing={playback.playing} onTogglePlaying={playback.togglePlaying} onReplay={playback.replay} speed={playback.speed} onCycleSpeed={playback.cycleSpeed} complexity={insertionComplexity} examplePicker={<ExamplePicker examples={insertionExamples} value={exampleId} onChange={id => { playback.reset(); setExampleId(id) }} />}>
    <TracePlayer trace={trace} step={playback.step} />
    <DesignNotes insight={insertionInsight} />
  </LessonShell>
}
