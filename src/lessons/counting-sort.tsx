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

/** 固定值域 0..6（C 共 7 格）：k 只需 ≥ 输入最大值，多出一格只是余量，不会出错。 */
const K = 6

const countingExamples: readonly SortExample[] = [
  { id: 'mixed', label: '课堂混合', detail: '[3,0,4,2,4,1,3,0]', values: [3, 0, 4, 2, 4, 1, 3, 0] },
  { id: 'sorted', label: '已经有序', detail: '[0,1,2,3,4,5]', values: [0, 1, 2, 3, 4, 5] },
  { id: 'reverse', label: '逆序感', detail: '[5,4,3,2,1,0,5,4]', values: [5, 4, 3, 2, 1, 0, 5, 4] },
  { id: 'duplicates', label: '重复键', detail: '[4,1,4,2,4,3,0,4] 查稳定', values: [4, 1, 4, 2, 4, 3, 0, 4] },
]

const countingCode = [
  { code: 'COUNTING-SORT(A, B, k)', note: 'k = 值域上界；值 v 直接当 C 的下标，这里 C[0..6] 共 7 格' },
  { code: '  for j = 1 to A.length', note: '第 1 遍扫描：只读值，不比较' },
  { code: '    C[A[j]] = C[A[j]] + 1', note: '值 v 出现一次，C[v] 加一' },
  { code: '  for i = 1 to k', note: '第 2 遍：前缀和把"次数"翻译成"排名"' },
  { code: '    C[i] = C[i] + C[i-1]', note: 'C[i] = 值 ≤ i 的元素个数' },
  { code: '  for j = A.length downto 1', note: '第 3 遍：从后往前——稳定性的全部秘密' },
  { code: '    B[C[A[j]]] = A[j]', note: 'C[v] 给出值 v 块的最右空位' },
  { code: '    C[A[j]] = C[A[j]] - 1', note: '占用一格后指针左移，把左边的空位留给下一个相等键' },
]

const label = tokenLabel

function inputCells(tokens: readonly Tok[], focus: number, mutedFrom: number, caption: string | undefined): SceneCell[] {
  return tokens.map((token, index) => ({
    id: `t${token.seed}`,
    label: label(token),
    caption: index === focus ? caption : undefined,
    tone: index === focus ? 'focus' : index >= mutedFrom ? 'muted' : 'default',
  }))
}

function countCells(counts: readonly number[], focus: number): SceneCell[] {
  return counts.map((count, value) => ({
    id: `c${value}`,
    label: count,
    caption: `${value}`,
    tone: value === focus ? 'focus' : 'default',
  }))
}

function outputCells(output: readonly (Tok | null)[], focus: number): SceneCell[] {
  return output.map((token, index) => token
    ? { id: `b${index}`, label: label(token), caption: `来自 A[${token.seed + 1}]`, tone: index === focus ? 'focus' : 'sorted' }
    : { id: `b${index}`, label: '·', caption: '空位', tone: 'muted' })
}

function* runCountingSort(values: readonly number[]): Generator<TraceEvent> {
  const tokens = tokenize(values)
  const n = tokens.length
  const counts = new Array<number>(K + 1).fill(0)
  const output: (Tok | null)[] = new Array(n).fill(null)
  let scanned = 0
  let cWrites = 0
  let placed = 0
  const metrics = (): MetricItem[] => [
    { label: '元素间比较', value: 0, tone: 'orange' },
    { label: '已扫描', value: `${scanned} / ${n}`, tone: 'blue' },
    { label: 'C 写入次数', value: cWrites, tone: 'purple' },
    { label: '已放置', value: `${placed} / ${n}`, tone: 'green' },
  ]

  yield { t: 'scene', scene: arrayScene('input', 'A · 输入数组', inputCells(tokens, -1, -1, undefined), { indexes: true }) }
  yield { t: 'scene', scene: arrayScene('count', 'C · 计数 → 排名（下标 = 值）', countCells(counts, -1)) }
  yield { t: 'scene', scene: arrayScene('output', 'B · 输出数组', outputCells(output, -1), { indexes: true }) }
  yield { t: 'metrics', metrics: metrics() }
  yield { t: 'legend', legend: [{ tone: 'focus', label: '正在读的元素 / 刚更新的格子' }, { tone: 'sorted', label: 'B 中已就位' }, { tone: 'muted', label: '空位 / 已输出' }] }
  yield {
    t: 'message',
    step: {
      title: '先立规矩：值就是下标，一次比较都不做',
      tab: '规矩',
      formula: String.raw`n=${n},\ k=${K};\ \text{值 }v\in[0,${K}]\text{ 直接当 }C\text{ 的下标}`,
      formulaHint: `C 行有 ${K + 1} 格（下标 0..${K}，比最大值多一格也无妨），B 行 ${n} 个空位等待落位。`,
      equation: String.raw`\text{三次线性扫描：计数 }n\;+\;\text{前缀和 }k\;+\;\text{放置 }n`,
      invariant: 'C[v] 永远等于"值 v 到目前为止出现的次数"——记账不涉及任何两两比较。',
      note: '计数排序不比较元素：它用"值当下标"直接记账。三遍扫描之后，B 就是有序的输出。',
      conclusion: '从 A[1] 开始逐个计数。',
      pseudocode: { lines: countingCode, active: [0] },
    },
  }
  yield { t: 'step' }

  // 第 1 遍：逐个计数（A[i] → C[A[i]]）
  for (let j = 0; j < n; j += 1) {
    const token = tokens[j]
    const v = token.value
    counts[v] += 1
    cWrites += 1
    scanned = j + 1
    yield { t: 'cells', scene: 'input', cells: inputCells(tokens, j, n, `→ C[${v}]`) }
    yield { t: 'cells', scene: 'count', cells: countCells(counts, v) }
    yield { t: 'metrics', metrics: metrics() }
    yield {
      t: 'message',
      step: {
        title: `A[${j + 1}]=${label(token)} → C[${v}] += 1，记账完成`,
        tab: `计数 ${label(token)}`,
        formula: `C[${v}] = C[${v}] + 1 = ${counts[v]}`,
        formulaHint: `图上证据：A 行第 ${j + 1} 格正被读出；C 行第 ${v} 格刚加一。`,
        equation: String.raw`\text{读值 }${v}\ \Rightarrow\ \text{下标 }${v}\text{ 加一（没有比较任何两个元素）}`,
        invariant: 'C[v] 仍是值 v 到目前为止的出现次数。',
        note: token.tag
          ? `${label(token)} 与同值兄弟共用同一个计数格 C[${v}]——记账不分身份，放置阶段才恢复先后。`
          : '看"元素间比较"计数器：始终是 0。位置不是比出来的，是按值算出来的。',
        conclusion: j === n - 1 ? '计齐了：接下来把"次数"变成"排名"。' : '继续读下一个元素。',
        moves: { kind: 'one-way', title: `${label(token)} 按值入账`, moves: [{ token: label(token), from: `A[${j + 1}]`, to: `C[${v}]` }], verdict: '只读值、加计数：值本身就是 C 的下标。' },
        prediction: j === 0
          ? { prompt: '整个计数阶段，任意两个元素之间要做多少次比较？', options: ['0 次：值自己就是下标', 'n−1 次：至少要比出大小', 'Θ(n log n) 次'], answer: 0, explanation: '计数排序从不比较两个元素——读出 A[j] 的值，直接在 C 的对应格加一。"元素间比较"计数器会一直是 0。' }
          : undefined,
        pseudocode: { lines: countingCode, active: [1, 2] },
      },
    }
    yield { t: 'step' }
  }

  // 第 2 遍：前缀和（次数 → 排名）
  for (let i = 1; i <= K; i += 1) {
    counts[i] += counts[i - 1]
    cWrites += 1
    const inherited = counts[i] === counts[i - 1]
    yield { t: 'cells', scene: 'count', cells: countCells(counts, i) }
    yield { t: 'metrics', metrics: metrics() }
    yield {
      t: 'message',
      step: {
        title: `前缀和：C[${i}] = C[${i}] + C[${i - 1}] = ${counts[i]}`,
        tab: `排名 ${i}`,
        formula: `C[${i}] = C[${i}] + C[${i - 1}] = ${counts[i]}`,
        formulaHint: inherited
          ? `值 ${i} 没出现：C[${i}] 原样继承 C[${i - 1}]——排名不跳变。`
          : `含义：值 ≤ ${i} 的元素共 ${counts[i]} 个——这就是值 ${i} 块的最右位置。`,
        equation: String.raw`C[i]=\left|\{j: A[j]\le i\}\right|\ \Rightarrow\ \text{值 }${i}\text{ 块的右端名次}`,
        invariant: 'C[i] 从"出现次数"变成"≤ i 的元素个数"，且只增不减。',
        note: inherited
          ? `k 偏大只是多扫一格：C[${i}] 继承左邻，不会破坏任何排名。`
          : '前缀和把"每个值出现几次"累成"有多少元素不超过 i"——这就是最终名次。',
        conclusion: i === K ? '排名表就绪：开始逆序放置。' : '继续累加下一格。',
        prediction: i === 1
          ? { prompt: '前缀和算完后，C[i] 的含义变成了什么？', options: ['值 i 出现的次数（没变）', '值 ≤ i 的元素个数：i 块的最右名次', '值 i 的元素应放的下标'], answer: 1, explanation: `C[i] 累加了 C[0..i]：值 ≤ i 的元素个数。对值 i 的最后一个元素来说，这个数正好是它在 B 里的最终位置。` }
          : undefined,
        pseudocode: { lines: countingCode, active: [3, 4] },
      },
    }
    yield { t: 'step' }
  }

  // 第 3 遍：逆序扫描放置（稳定性关键）
  for (let j = n - 1; j >= 0; j -= 1) {
    const token = tokens[j]
    const v = token.value
    const pos = counts[v]
    counts[v] -= 1
    cWrites += 1
    placed += 1
    output[pos - 1] = token
    const dupGroup = tokens.filter(item => item.value === v && item.tag).map(label)
    const groupComplete = dupGroup.length > 1 && tokens.findIndex(item => item.value === v) === j
    yield { t: 'cells', scene: 'input', cells: inputCells(tokens, j, j + 1, `→ B[${pos}]`) }
    yield { t: 'cells', scene: 'count', cells: countCells(counts, v) }
    yield { t: 'cells', scene: 'output', cells: outputCells(output, pos - 1) }
    yield { t: 'metrics', metrics: metrics() }
    yield {
      t: 'message',
      step: {
        title: `逆序读到 A[${j + 1}]=${label(token)} → 落进 B[${pos}]`,
        tab: `放置 ${label(token)}`,
        formula: `B[${pos}] = ${label(token)};\\ C[${v}] = ${counts[v]}`,
        formulaHint: `C[${v}] 当时等于 ${pos}：值 ≤ ${v} 的共 ${pos} 个，${label(token)} 拿走值 ${v} 块的最右空位。`,
        equation: String.raw`\text{逆序扫描} + C[v]\text{ 占位后左移} \Rightarrow \text{先出现的相等键永远落更左}`,
        invariant: '已放置的元素不再移动；C[v] 始终指向值 v 块的下一个空位。',
        note: token.tag
          ? `${label(token)} 在数组里更靠右，所以先被逆序扫到，先拿走值 ${v} 块的最右空位 B[${pos}]；更早出现的同值兄弟随后会落在紧邻左边的空位。`
          : `C[${v}] 给出最终位置后立刻减一：如果左边还有同值元素，它会拿到紧邻的空位。`,
        conclusion: placed === n ? '最后一个元素落位，B 就是排好序的 A。' : '继续往左扫描。',
        moves: { kind: 'one-way', title: `${label(token)} 按排名落位`, moves: [{ token: label(token), from: `A[${j + 1}]`, to: `B[${pos}]` }], verdict: `C[${v}]=${pos} 给出位置，落位后 C[${v}] 左移一格。` },
        stability: groupComplete
          ? { statement: `值 ${v} 的整组身份已放置完毕：${dupGroup.join(' → ')} 的先后与输入一致——逆序扫描让先出现的相等键落在更左的空位。`, before: dupGroup, after: dupGroup, stable: true, note: '如果改成正序扫描，先出现的相等键会先占据更右的空位，身份顺序就会颠倒。' }
          : undefined,
        prediction: placed === 1
          ? { prompt: '逆序扫描时，先被读到的相等键（比如 4B）会落进值块的最右还是最左空位？', options: ['最右空位：C[v] 存的是 ≤ v 的个数', '最左空位：和正序扫描一样', '随机：看运气'], answer: 0, explanation: 'C[v] 是"值 ≤ v 的元素个数"，正好是值块的右端位置。先扫到的（更靠右出现的）相等键先占右位，后扫到的落左边——4A→4B 顺序保持。' }
          : undefined,
        pseudocode: { lines: countingCode, active: [5, 6, 7] },
      },
    }
    yield { t: 'step' }
  }

  // 完成 + 复杂度
  const dupValue = tokens.find(token => token.tag)?.value
  const beforeOrder = dupValue === undefined ? [] : tokens.filter(token => token.value === dupValue).map(label)
  const afterOrder = dupValue === undefined ? [] : output.filter((token): token is Tok => token !== null && token.value === dupValue).map(label)
  yield { t: 'cells', scene: 'input', cells: inputCells(tokens, -1, 0, undefined) }
  yield { t: 'cells', scene: 'count', cells: countCells(counts, -1) }
  yield { t: 'cells', scene: 'output', cells: outputCells(output, -1) }
  yield { t: 'metrics', metrics: metrics() }
  yield {
    t: 'message',
    step: {
      title: `完成：0 次元素间比较，${cWrites} 次 C 写入`,
      tab: '完成',
      formula: String.raw`T(n,k)=\Theta(n+k)=\Theta(${n}+${K})`,
      formulaHint: '三遍扫描的每一步都能在上图指出来：计数、前缀和、放置。',
      equation: String.raw`${n}+${K}+${n}=${2 * n + K}\ (\text{次基本步骤});\ \text{元素间比较}=0`,
      invariant: '输出 B 全局有序；相等键的输入先后在 B 中原样保留。',
      note: '最好、平均、最差同为 Θ(n+k)：没有比较就没有逆序对惩罚，输入分布只改变常数。这正是"非比较"的意义——比较排序的 Ω(n log n) 下界管不到它，代价是 O(k) 空间与"键是 0..k 的整数"这个前提。',
      conclusion: '换个数据集再看：有序、逆序、重复键，成本几乎不变——这就是线性时间排序的底气。',
      stability: beforeOrder.length > 1
        ? { title: '稳定性证据：输出里的身份顺序', statement: `输入 ${beforeOrder.join(' → ')}，输出 ${afterOrder.join(' → ')}——相等键保序，由逆序扫描放置保证。`, before: beforeOrder, after: afterOrder, stable: true }
        : undefined,
      pseudocode: { lines: countingCode, active: [] },
    },
  }
  yield { t: 'step' }
}

export const buildCountingTrace = (example: SortExample): Trace => recordTrace('SANDBOX 07 · COUNTING SORT', '值直接当数组下标记账：三遍线性扫描完成排序，全程零次元素间比较——逆序扫描放置保住相等键的身份。', runCountingSort(example.values))

const countingInsight: DesignInsight = {
  observation: '把"比较大小"换成"按值记账"：值本身就是 C 的下标，前缀和把次数翻译成最终名次——正确性不依赖任何一次元素间比较。',
  contrasts: [
    { alternative: '比较排序（快排/归并）', whyNot: '对任意可比较键通用、不挑值域，但要付 Ω(n log n) 下界；计数排序 k=O(n) 时线性，却锁死在"0..k 的整数键 + O(k) 空间"上。' },
    { alternative: '正序扫描放置', whyNot: '位置照样能填对，但相等键会逆序落进输出（不稳定）；把 for 改成 downto 一行，就是稳定性的全部代价。' },
  ],
  transfer: { prompt: '键从"整数 0..k"换成"任意字符串"，计数排序还能直接跑吗？', options: ['不能：得先把键映射成小范围整数（比如按首字符分桶）', '能：字符串也能当数组下标', '能：只要数组开得够大'], answer: 0, explanation: '数组下标必须是 0..k 的整数。字符串要先做一次"键 → 整数"的映射——基数排序每一轮干的就是这件事。' },
}

const countingComplexity: ComplexityProfileData = {
  title: '计数排序：三遍线性扫描，与输入分布无关',
  subtitle: 'CLRS COUNTING-SORT：值当数组下标记账，前缀和变排名，逆序扫描放置。',
  cases: [
    { label: '最好', complexity: 'Θ(n+k)', condition: '值域紧凑且覆盖均匀（如 0..5 全出现）——三遍扫描一遍不少，"最好"只是常数更小。', example: '[0,1,2,3,4,5]', explanation: '计数 n + 前缀 k + 放置 n = 2n+k 次写入，0 次比较。', tone: 'best' },
    { label: '平均', complexity: 'Θ(n+k)', condition: '任意输入：阶数不看分布脸色，每个元素恰好被读两次、写一次。', example: '[3,0,4,2,4,1,3,0]', explanation: 'k 略大于 max(A) 时多扫几格，仍是 Θ(n+k)。', tone: 'average' },
    { label: '最差', complexity: 'Θ(n+k)', condition: '没有更坏的形状：没有比较就没有逆序对惩罚；只有值域 k 变大才推高成本。', example: '[5,4,3,2,1,0,5,4]', explanation: 'k ≫ n 时 Θ(n+k) 被 k 主导——值域是这条命门的参数。', tone: 'worst' },
  ],
  footer: '比较排序证明过下界 Ω(n log n)，但前提是"排序必须靠比较"。计数排序按值记账、一次元素间比较都不做，所以绕开了它——代价是 O(k) 辅助空间与"键是 0..k 的整数"这个前提。',
  stability: { status: 'stable', label: '稳定排序', statement: '逆序扫描放置 + C[v] 占位后左移：先出现的相等键总是落进更左的空位，身份顺序与输入一致。', before: '4A → 4B', after: '4A → 4B' },
}

export function CountingSortLesson() {
  const [exampleId, setExampleId] = useState(countingExamples[0].id)
  const example = countingExamples.find(item => item.id === exampleId) ?? countingExamples[0]
  const trace = buildCountingTrace(example)
  const playback = useLessonPlayback(trace.steps.length)
  return <LessonShell eyebrow={trace.eyebrow} title={trace.steps[playback.step].title} description={trace.description} steps={trace.steps.map(item => item.tab ?? '推演')} step={playback.step} onStepChange={playback.setStep} playing={playback.playing} onTogglePlaying={playback.togglePlaying} onReplay={playback.replay} speed={playback.speed} onCycleSpeed={playback.cycleSpeed} complexity={countingComplexity} examplePicker={<ExamplePicker examples={countingExamples} value={exampleId} onChange={id => { playback.reset(); setExampleId(id) }} />}>
    <TracePlayer trace={trace} step={playback.step} />
    <DesignNotes insight={countingInsight} />
  </LessonShell>
}
