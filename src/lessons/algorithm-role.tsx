import { useState } from 'react'
import type { MetricItem } from '@/components/CalcDesk'
import type { ComplexityProfileData } from '@/components/ComplexityProfile'
import { DesignNotes, type DesignInsight } from '@/components/DesignNotes'
import { ExamplePicker, type ExampleOption } from '@/components/ExamplePicker'
import { LessonShell } from '@/components/LessonShell'
import { TracePlayer } from '@/engine/TracePlayer'
import { arrayScene, recordTrace, type TraceEvent } from '@/engine/events'
import type { RegionLabel, SceneCell, Trace } from '@/engine/trace'
import { useLessonPlayback } from '@/hooks/useLessonPlayback'

/** 演示数据与算法分离：本文件 = 数据集 + 求最大值三版本生成器（产出 Trace）+ 播放器装配。 */

type RoleExample = ExampleOption & { values: number[] }

const roleExamples: readonly RoleExample[] = [
  { id: 'classroom', label: '课堂混合', detail: '[3,1,4,1,5,9,2,6]', values: [3, 1, 4, 1, 5, 9, 2, 6] },
  { id: 'negative', label: '全负数组', detail: '[-3,-1,-4,-1,-5] 暴露 bug B', values: [-3, -1, -4, -1, -5] },
  { id: 'single', label: '单元素边界', detail: '[7] 循环一次都不跑', values: [7] },
]

/** bug A 的指定反例：8 个数，最大值 9 恰好躺在末尾。 */
const bugACounter = [3, 1, 4, 1, 5, 2, 6, 9]
/** bug B 的指定反例：全负数组，初值 0 永远赢不了。 */
const bugBCounter = [-3, -1, -4, -1, -5]

/** 正确版 MAXIMUM：max-so-far 从 A[1] 起，逐个比较更新。 */
function runCorrect(values: readonly number[]): number {
  let max = values[0]
  for (let i = 1; i < values.length; i += 1) if (max < values[i]) max = values[i]
  return max
}

/** bug A：循环只到 n-1，末元素 A[n] 永远不被比较。 */
function runBugA(values: readonly number[]): { max: number; index: number } {
  let max = values[0]
  let index = 0
  for (let i = 1; i < values.length - 1; i += 1) if (max < values[i]) { max = values[i]; index = i }
  return { max, index }
}

/** bug B：初值 0（而不是 A[1]），全负输入答案错。 */
function runBugB(values: readonly number[]): number {
  let max = 0
  for (let i = 1; i < values.length; i += 1) if (max < values[i]) max = values[i]
  return max
}

const correctCode = [
  { code: 'max ← A[1]', note: '初始化：不变量从这里成立' },
  { code: 'for i ← 2 to n', note: '逐个检查剩余元素' },
  { code: '  if max < A[i] then max ← A[i]', note: '比较并按需更新 max-so-far' },
  { code: 'return max', note: '终止：不变量蕴含输出正确' },
]

const bugACode = [
  { code: 'max ← A[1]', note: '初始化与正确版相同' },
  { code: 'for i ← 2 to n-1', note: 'BUG：上界少一格，A[n] 永远不被比较' },
  { code: '  if max < A[i] then max ← A[i]', note: '比较逻辑本身没坏' },
  { code: 'return max', note: '覆盖被砍，输出不再有保证' },
]

const bugBCode = [
  { code: 'max ← 0', note: 'BUG：初值假设了"数组里有正数"' },
  { code: 'for i ← 2 to n', note: '循环范围与正确版相同' },
  { code: '  if max < A[i] then max ← A[i]', note: '全负输入时条件永远为假' },
  { code: 'return max', note: '输出的是一个从未被输入兑现的 0' },
]

/** maxIdx=绿色已确定格、focusIdx=橙色正在比较格、missedIdx=pivot 被漏格、muted=整排落选。 */
const benchCells = (values: readonly number[], maxIdx: number, focusIdx: number, missedIdx: number, muted: boolean): SceneCell[] =>
  values.map((value, index): SceneCell => ({
    id: `c${index}`,
    label: value,
    tone: muted
      ? 'muted'
      : missedIdx === index
        ? 'pivot'
        : focusIdx === index
          ? 'focus'
          : maxIdx === index
            ? 'sorted'
            : 'default',
  }))

const bugARegions = (n: number): RegionLabel[] =>
  n >= 2
    ? [
        { from: 1, to: n - 2, label: `循环范围 [2..${n - 1}]`, tone: 'blue' },
        { from: n - 1, to: n - 1, label: `漏掉的格子 A[${n}]`, tone: 'purple' },
      ]
    : [{ from: 0, to: 0, label: '循环 [2..0]：一次都不跑', tone: 'purple' }]

const invariantMetric = (value: string, broken = false): MetricItem => ({ label: '不变量校验', value, tone: broken ? 'orange' : 'purple' })

function* runAlgorithmRole(example: RoleExample): Generator<TraceEvent> {
  const values = example.values
  const n = values.length
  const correct = runCorrect(values)

  // ── 拍 1：问题的规格 ─────────────────────────────────────────────
  yield { t: 'scene', scene: arrayScene('bench', '输入数组：规格说清"什么算对"，代码才有对错可言', benchCells(values, -1, -1, -1, false), { indexes: true }) }
  yield { t: 'legend', legend: [
    { tone: 'sorted', label: 'max-so-far（不变量）' },
    { tone: 'focus', label: '正在比较' },
    { tone: 'pivot', label: '被漏掉的格子' },
    { tone: 'muted', label: '已比较落选' },
  ] }
  yield { t: 'metrics', metrics: [
    { label: '输入规模 n', value: n, tone: 'blue' },
    { label: '要求的输出', value: 'max(A)', tone: 'green' },
    invariantMetric('待建立'),
  ] }
  yield {
    t: 'message',
    step: {
      title: '问题的规格：输入、输出与正确性',
      tab: '规格',
      question: '一个问题由什么定义？',
      formula: String.raw`\text{MAXIMUM}(A):\ \text{输入 }A[1..${n}]\ \longrightarrow\ \text{输出 }\max\{A_1,\ \dots,\ A_n\}`,
      formulaHint: '三卡式规格：输入（n 个数的数组）｜输出（最大元素）｜正确性（对每个合法输入都输出正确答案）。',
      equation: String.raw`\text{正确}\ \equiv\ \forall\ \text{合法输入}\ A:\ \text{输出}=\max\{A_1,\dots,A_n\}`,
      invariant: '正确性是"对所有合法输入"的断言，不是对某一次运行结果的满意度。',
      note: '算法的角色：把问题规格变成逐步执行的机械过程。接下来三个版本执行同一个规格——一个正确版、两个带 bug 的版本，看正确性如何被建立、又如何被打破。',
      conclusion: '先看正确版 MAXIMUM 怎么跑。',
      pseudocode: { lines: correctCode, active: [] },
    },
  }
  yield { t: 'step' }

  // ── 拍 2：正确版初始化，立下不变量 ──────────────────────────────
  yield { t: 'cells', scene: 'bench', cells: benchCells(values, 0, -1, -1, false) }
  yield { t: 'pointers', scene: 'bench', pointers: [{ index: 0, label: 'max', tone: 'green' }] }
  yield { t: 'metrics', metrics: [
    { label: '已检查', value: `1 / ${n}`, tone: 'blue' },
    { label: '当前 max', value: values[0], tone: 'green' },
    { label: '累计比较', value: 0, tone: 'orange' },
    invariantMetric('前 1 个成立'),
  ] }
  yield {
    t: 'message',
    step: {
      title: '正确版上桌：max-so-far 从 A[1] 起步',
      tab: '初始化',
      formula: String.raw`max \leftarrow A[1]=${values[0]}`,
      formulaHint: '绿色格 = max-so-far 的家；它之后每拍都要接受"仍是前缀最大值"的检验。',
      equation: String.raw`\text{循环不变量：}max=\max\{A_1,\ \dots,\ A_i\}`,
      invariant: '初始化即成立：只看第 1 个元素时，A[1] 就是它的最大值。',
      note: 'max-so-far = "目前为止见过的最大值"，是本课的主角：每一拍都要验证它仍等于前 i 个元素的最大值。',
      conclusion: n > 1 ? '带着不变量，进入第 2 个元素。' : '单元素输入：循环马上要面对"一次都不跑"的边界。',
      pseudocode: { lines: correctCode, active: [0] },
    },
  }
  yield { t: 'step' }

  // ── 拍 3..：正确版逐个比较（每拍一次比较 + 一次不变量校验）─────
  if (n === 1) {
    yield { t: 'cells', scene: 'bench', cells: benchCells(values, 0, -1, -1, false) }
    yield { t: 'pointers', scene: 'bench', pointers: [{ index: 0, label: 'max', tone: 'green' }] }
    yield { t: 'metrics', metrics: [
      { label: '已检查', value: '1 / 1', tone: 'blue' },
      { label: '当前 max', value: values[0], tone: 'green' },
      { label: '累计比较', value: 0, tone: 'orange' },
      invariantMetric('前 1 个成立'),
    ] }
    yield {
      t: 'message',
      step: {
        title: '边界：循环条件 i=2 > n=1，一次都不跑',
        tab: '零次循环',
        formula: String.raw`i=2 > n=${n}\ \Rightarrow\ \text{循环体零次执行}`,
        formulaHint: 'for 循环允许零次迭代——这也是合法执行。',
        equation: String.raw`\text{没有比较发生}：max\ \text{保持初值}`,
        invariant: '初始化后不再有任何操作：不变量原样交付给终止条件。',
        note: '边界输入是正确性定义的一部分："对所有合法输入"包括最小的那个。',
        conclusion: '终止：直接输出 max。',
        pseudocode: { lines: correctCode, active: [1] },
      },
    }
    yield { t: 'step' }
    yield {
      t: 'message',
      step: {
        title: `终止即输出：max = A[1] = ${values[0]}`,
        tab: `返回 ${values[0]}`,
        formula: String.raw`return\ max=${values[0]}`,
        formulaHint: '单元素数组的最大值就是它自己。',
        equation: String.raw`max=\max\{A_1\}=${values[0]}\ \Rightarrow\ \text{输出正确}`,
        invariant: '终止时刻不变量覆盖全部元素 → 输出必然正确。',
        note: '单元素边界喂不出任何 bug（后面两个 bug 版在它面前也都侥幸）——反例需要更刁钻的输入。',
        conclusion: '正确版在所有三组输入上都会这样收尾——由不变量保证，不是运气。',
        pseudocode: { lines: correctCode, active: [3] },
      },
    }
    yield { t: 'step' }
  } else {
    let max = values[0]
    let maxIdx = 0
    for (let k = 2; k <= n; k += 1) {
      const v = values[k - 1]
      const updates = max < v
      const last = k === n
      const nextMax = updates ? v : max
      const nextMaxIdx = updates ? k - 1 : maxIdx
      yield { t: 'cells', scene: 'bench', cells: benchCells(values, nextMaxIdx, updates ? -1 : k - 1, -1, false) }
      yield { t: 'pointers', scene: 'bench', pointers: [{ index: nextMaxIdx, label: 'max', tone: 'green' }, { index: k - 1, label: 'i', tone: 'orange' }] }
      yield { t: 'metrics', metrics: [
        { label: '已检查', value: `${k} / ${n}`, tone: 'blue' },
        { label: '当前 max', value: nextMax, tone: 'green' },
        { label: '累计比较', value: k - 1, tone: 'orange' },
        invariantMetric(`前 ${k} 个成立`),
      ] }
      yield {
        t: 'message',
        step: {
          title: updates
            ? `比较 A[${k}]：${max} 让位，max ← ${v}${last ? '，循环收工' : ''}`
            : `比较 A[${k}]：${max} 守住 max-so-far${last ? '，循环收工' : ''}`,
          tab: last ? `A[${k}] 终` : `A[${k}]`,
          formula: updates
            ? String.raw`max=${max} < A[${k}]=${v}\ \Rightarrow\ max \leftarrow ${v}${last ? `;\ return\ max=${v}` : ''}`
            : String.raw`max=${max} \ge A[${k}]=${v}\ \Rightarrow\ max\ \text{不变}${last ? `;\ return\ max=${max}` : ''}`,
          formulaHint: `图上证据：绿色格 = max-so-far（第 ${nextMaxIdx + 1} 位），橙色 i 指针 = 刚检查的 A[${k}]。`,
          equation: String.raw`\text{已检查 }${k}\text{ 个}:\ max=\max\{A_1,\dots,A_{${k}}\}=${nextMax}`,
          invariant: `不变量保持：比较结束后，max 仍等于前 ${k} 个元素的最大值（绿色格可逐个验证）。`,
          judge: { entries: [{ left: `max=${max}`, op: '<', right: `A[${k}]=${v}`, holds: updates, action: updates ? `max ← ${v}：max-so-far 换人` : 'max 不变：现任守住' }] },
          ...(updates ? { moves: { kind: 'one-way' as const, title: 'max-so-far 头衔转移', moves: [{ token: `${v}`, from: `A[${k}]`, to: 'max-so-far' }], verdict: `${max} < ${v}：新冠军入场` } } : {}),
          note: updates
            ? `${max} 被 ${v} 超越：max-so-far 的头衔移到第 ${k} 位，公式里的 max 立刻改写。`
            : `${v} 不比 ${max} 大：什么都不用改——"不更新"也是不变量允许范围内的合法动作。`,
          conclusion: last ? `输出 max=${nextMax}。正确版在所有合法输入上都这样收尾——由不变量保证。` : '带着不变量，检查下一个元素。',
          pseudocode: { lines: correctCode, active: last ? [1, 2, 3] : [1, 2] },
        },
      }
      yield { t: 'step' }
      if (updates) { max = v; maxIdx = k - 1 }
    }
  }

  // ── ④ bug A：循环只到 n-1 ──────────────────────────────────────
  const bugAResult = runBugA(values)
  const missedIdx = n >= 2 ? n - 1 : -1
  yield { t: 'cells', scene: 'bench', cells: benchCells(values, bugAResult.index, -1, missedIdx, false) }
  yield { t: 'regions', scene: 'bench', regions: bugARegions(n) }
  yield { t: 'pointers', scene: 'bench', pointers: [{ index: bugAResult.index, label: 'max', tone: 'green' }] }
  yield { t: 'metrics', metrics: [
    { label: '已检查', value: `${n >= 2 ? n - 1 : 1} / ${n}`, tone: 'blue' },
    { label: '当前 max', value: bugAResult.max, tone: 'green' },
    { label: '累计比较', value: Math.max(0, n - 2), tone: 'orange' },
    invariantMetric(n >= 2 ? `仅 [1..${n - 1}] 内成立` : '空循环，平凡成立', true),
  ] }
  yield {
    t: 'message',
    step: {
      title: n >= 2 ? '换上 bug A：循环只到 n-1，A[n] 永远不被比较' : '换上 bug A：循环 [2..0] 一次都不跑',
      tab: 'bug A',
      formula: String.raw`for\ i \leftarrow 2\ \text{to}\ n-1\quad(\text{正确版是 } n)`,
      formulaHint: '紫色格 = 被漏掉的末元素；蓝色括号 = 被砍短的循环范围。',
      equation: String.raw`\text{输出 }${bugAResult.max}\quad\text{正确答案是 }${correct}`,
      invariant: `bug A 的不变量在它自己的小范围内依然成立——坏的不是"维护"，是"覆盖范围"。`,
      note: n >= 2
        ? `在你的输入上它输出 ${bugAResult.max}——和正确答案一样！漏掉的 A[${n}]=${values[n - 1]} 恰好不是最大值，bug 蒙混过关。`
        : 'n=1：循环 [2..0] 一次都不跑，直接返回 A[1]——碰巧正确。单元素喂不出反例。',
      conclusion: '哪种输入会抓到它？下一拍上反例。',
      prediction: {
        prompt: '循环到 n-1 就停：哪种输入会暴露这个 bug？',
        options: ['最大值恰好躺在末尾 A[n]', '最大值在最前面 A[1]', '任何输入都会暴露它'],
        answer: 0,
        explanation: '循环永远到不了 A[n]：只有最大值住在末尾时，它才会被整体漏掉——比如把 9 挪到末尾的 [3,1,4,1,5,2,6,9]。',
      },
      pseudocode: { lines: bugACode, active: [1] },
    },
  }
  yield { t: 'step' }

  // 反例：8 个数，最大值 9 在末尾
  const counterCorrect = runCorrect(bugACounter)
  const counterBug = runBugA(bugACounter)
  yield {
    t: 'scene',
    scene: arrayScene('bench', `反例输入 [${bugACounter.join(',')}]：最大值 9 挪到了末尾`, benchCells(bugACounter, counterBug.index, -1, 7, false), { indexes: true, regions: bugARegions(8), pointers: [{ index: counterBug.index, label: 'max', tone: 'green' }] }),
  }
  yield { t: 'metrics', metrics: [
    { label: '已检查', value: '7 / 8', tone: 'blue' },
    { label: '当前 max', value: counterBug.max, tone: 'green' },
    { label: '累计比较', value: 6, tone: 'orange' },
    invariantMetric('仅 [1..7] 内成立', true),
  ] }
  yield {
    t: 'message',
    step: {
      title: '反例上桌：把最大值挪到末尾 A[8]',
      tab: '反例上桌',
      formula: String.raw`\text{扫描在 } i=7\ \text{停}:\ max\ \text{一路更新到 } ${counterBug.max}`,
      formulaHint: '更新链 3→4→5→6 全部发生在循环范围内；末尾的 9（紫色格）没轮到比较。',
      equation: String.raw`3\to4\to5\to6:\ \text{更新链止步于 }A[7]`,
      invariant: '不变量在 [1..7] 内步步成立——但循环范围被砍掉一格，覆盖不再等于全数组。',
      note: '同一个 bug，在上一拍那组输入上侥幸过关；反例只做了一件事：把最大值 9 挪到循环够不着的位置。反例就是正确性证明要堵住的输入。',
      conclusion: '循环收工——A[8] 从未被比较。',
      pseudocode: { lines: bugACode, active: [1, 2] },
    },
  }
  yield { t: 'step' }

  yield { t: 'metrics', metrics: [
    { label: '已检查', value: '7 / 8', tone: 'blue' },
    { label: '当前 max', value: counterBug.max, tone: 'green' },
    { label: '累计比较', value: 6, tone: 'orange' },
    invariantMetric('对 [1..8] 不成立：覆盖被砍', true),
  ] }
  yield {
    t: 'message',
    step: {
      title: `错误答案：输出 ${counterBug.max}，正确答案 ${counterCorrect}`,
      tab: 'bugA 输错',
      formula: String.raw`return\ max=${counterBug.max}\ \ne\ ${counterCorrect}=\max\{A_1,\dots,A_8\}`,
      formulaHint: '比较判断区给出实锤：输出的 6 与正确答案 9 对不上。',
      equation: String.raw`\text{漏检 }A[8]=9\ \Rightarrow\ \text{答案错}`,
      invariant: '终止时的不变量只覆盖 [1..7]：它蕴含"前 7 个的最大值是 6"，而不是"全数组最大值是 6"。',
      judge: { entries: [{ left: `输出 ${counterBug.max}`, op: '≠', right: `正确答案 ${counterCorrect}`, holds: false, action: '循环少一格，答案就错——反例实锤' }] },
      note: '把循环上界改回 n，反例立刻失效——修复 bug = 修复被破坏的证明步骤（这里是终止覆盖）。',
      conclusion: '测试这组输入会立刻报警；但如果只测 [3,1,4,1,5,9,2,6]，bug 继续潜伏。',
      pseudocode: { lines: bugACode, active: [3] },
    },
  }
  yield { t: 'step' }

  // ── ⑤ bug B：初值 0，全负输入 ─────────────────────────────────
  const negCorrect = runCorrect(bugBCounter)
  yield {
    t: 'scene',
    scene: arrayScene('bench', `全负输入 [${bugBCounter.join(',')}]：初值 0 不在数组里`, benchCells(bugBCounter, -1, -1, -1, false), { indexes: true, pointers: [] }),
  }
  yield { t: 'metrics', metrics: [
    { label: '已比较', value: `0 / ${bugBCounter.length}`, tone: 'blue' },
    { label: '当前 max', value: 0, tone: 'green' },
    { label: '累计比较', value: 0, tone: 'orange' },
    invariantMetric('破坏：0 不是前 1 个的最大值', true),
  ] }
  yield {
    t: 'message',
    step: {
      title: '换上 bug B：max 从 0 起步',
      tab: 'bug B',
      formula: String.raw`max \leftarrow 0\quad(\text{而不是 } A[1]=${bugBCounter[0]})`,
      formulaHint: '初值 0 不在这排格子里——它是一个对输入内容的假设。',
      equation: String.raw`\text{不变量在初始化就失败}:\ 0 \ne ${bugBCounter[0]}=\max\{A_1\}`,
      invariant: '初始化是不变量的第一根支柱：max=0 对全负数组根本不是"前 1 个的最大值"。',
      note: example.id === 'negative'
        ? '就是你手里这组输入——全负数组是初值假设的照妖镜。'
        : example.id === 'single'
          ? '连 [7] 都能暴露它：max=0、循环一次不跑，输出 0 而不是 7——单元素并不总是弱输入。'
          : '正数输入会掩盖它：0 会被真正的最大值超越（bug B 在 [3,1,4,1,5,9,2,6] 上也碰巧输出 9）。',
      conclusion: '带着这个从未被兑现的起点，进入循环。',
      prediction: {
        prompt: '全负数组 [-3,-1,-4,-1,-5] 用 max=0 初始化，会输出什么？',
        options: ['0：没有任何元素超过初值', '-5：数组里的最小值', '-1：数组的最大值'],
        answer: 0,
        explanation: '四次比较全是 0 < 负数 = 假，max 纹丝不动停在 0——初值成了一个从未被输入兑现的"答案"。',
      },
      pseudocode: { lines: bugBCode, active: [0] },
    },
  }
  yield { t: 'step' }

  yield { t: 'cells', scene: 'bench', cells: benchCells(bugBCounter, -1, -1, -1, true) }
  yield { t: 'metrics', metrics: [
    { label: '已比较', value: `4 / ${bugBCounter.length}`, tone: 'blue' },
    { label: '当前 max', value: 0, tone: 'green' },
    { label: '累计比较', value: 4, tone: 'orange' },
    invariantMetric('破坏：max 不在数组里', true),
  ] }
  yield {
    t: 'message',
    step: {
      title: '全负数组：0 四次落选，纹丝不动',
      tab: '全负落选',
      formula: String.raw`\forall i\in[2,5]:\ 0 < A[i]\ \text{为假}\ \Rightarrow\ max\ \text{不动}`,
      formulaHint: '灰色格 = 已比较落选；每一格都试过挑战 0，全部失败。',
      equation: String.raw`0<-1\ \text{假},\ 0<-4\ \text{假},\ 0<-1\ \text{假},\ 0<-5\ \text{假}`,
      invariant: 'max=0 自始至终不等于任何前缀的最大值——不变量零成立，"保持"无从谈起。',
      judge: {
        entries: bugBCounter.slice(1).map((v, i) => ({ left: 'max=0', op: '<', right: `A[${i + 2}]=${v}`, holds: false, action: 'max 不动' })),
      },
      note: 'A[1] 也没被读过：init 跳过了它。正确版用 A[1] 起步，正是为了让不变量从第一步就踩在真实数据上。',
      conclusion: '循环走满全程，max 仍是 0。',
      pseudocode: { lines: bugBCode, active: [1, 2] },
    },
  }
  yield { t: 'step' }

  yield { t: 'metrics', metrics: [
    { label: '已比较', value: `4 / ${bugBCounter.length}`, tone: 'blue' },
    { label: '当前 max', value: 0, tone: 'green' },
    { label: '累计比较', value: 4, tone: 'orange' },
    invariantMetric('破坏：三步证明断在初始化', true),
  ] }
  yield {
    t: 'message',
    step: {
      title: '错误答案：输出 0，正确答案 -1',
      tab: 'bugB 输错',
      formula: String.raw`return\ max=0\ \ne\ ${negCorrect}=\max\{A_1,\dots,A_5\}`,
      formulaHint: '正确版在同一输入上输出 -1（第 2 位那个元素）。',
      equation: String.raw`\text{初值假设被全负输入戳穿}：0\ \text{从未被任何元素超越}`,
      invariant: '初始化破坏 → 保持无意义 → 终止时"不变量蕴含输出正确"当然也落空：三步证明断在第一环。',
      judge: { entries: [{ left: '输出 0', op: '≠', right: `正确答案 ${negCorrect}`, holds: false, action: '初值假设被全负输入戳穿' }] },
      note: '修复就是正确版第 1 行：max ← A[1]。初值必须来自输入自身，不能来自对输入的假设（"总有正数"就是假设）。',
      conclusion: '两个反例各断一根支柱：bug A 砍终止覆盖，bug B 毁初始化——正确性 = 三步一起成立。',
      pseudocode: { lines: bugBCode, active: [3] },
    },
  }
  yield { t: 'step' }

  // ── ⑥ 总结 ─────────────────────────────────────────────────────
  yield { t: 'metrics', metrics: [
    { label: '正确版检查', value: `${n} / ${n}`, tone: 'blue' },
    { label: '正确版比较', value: Math.max(0, n - 1), tone: 'orange' },
    invariantMetric('成立'),
  ] }
  yield {
    t: 'message',
    step: {
      title: '正确性 = 不变量 + 终止，测试只能找反例',
      tab: '总结',
      formula: String.raw`\text{初始化成立}\ \wedge\ \text{保持}\ \Rightarrow\ \text{终止时}\ max=\max\{A_1,\dots,A_n\}`,
      formulaHint: '三步证明：初始化 → 保持 → 终止蕴含输出正确。',
      equation: String.raw`\text{正确性}=\text{对每个合法输入都输出正确答案}`,
      invariant: '初始化：max=A[1] 时成立；保持：每步只在不变量允许下修改；终止：循环走满 [2..n]，不变量覆盖全数组。',
      note: '测试与证明分工：测试找反例便宜但不完备（bug A 在课堂数据上就蒙混过关）；不变量证明给出对所有输入的保证——Dijkstra：测试只能证明 bug 存在，不能证明不存在。',
      conclusion: '算法的角色至此完整：规格定义"对"，不变量证明"对"，反例检验"错"。下一课回答"多快"——渐近记号。',
      pseudocode: { lines: correctCode, active: [] },
    },
  }
  yield { t: 'step' }
}

const buildRoleTrace = (example: RoleExample): Trace => recordTrace('SANDBOX 18 · ALGORITHM CORRECTNESS', '同一个"求最大值"规格，三个版本逐拍执行：正确版靠不变量赢，两个 bug 版各断一根支柱——正确性是证出来的，不是测出来的。', runAlgorithmRole(example))

const roleInsight: DesignInsight = {
  observation: '正确性不是测出来的，是证出来的：循环不变量 + 终止 = 输出正确。',
  contrasts: [
    { alternative: '只靠多跑测试', whyNot: '测试只能证明存在 bug，不能证明没有——Dijkstra；不变量给出对所有输入的保证。' },
    { alternative: '换一个"看起来更稳"的初值（如 max=-∞）', whyNot: '能修 bug B，但仍是约定而非证明；max ← A[1] 让初值来自输入自身，不变量从第一步就踩在真实数据上。' },
  ],
  transfer: { prompt: '插入排序的不变量是什么？', options: ['前 j-1 个元素已排序', '数组已经有序', 'key 是最大值'], answer: 0, explanation: '插入排序维护"前缀已排序"，与最大值问题维护"max-so-far 是前缀最大"同一套路。' },
}

const roleComplexity: ComplexityProfileData = {
  title: '算法的角色：规格、不变量、反例',
  subtitle: '概念课没有最好/平均/最差——三张卡是正确性工作的三件套。',
  cases: [
    { label: '规格', complexity: '输入 → 输出', condition: '先说清楚合法输入长什么样、输出必须是什么。', example: 'MAXIMUM：n 个数的数组 → 最大元素', explanation: '没有规格，"正确"无从谈起——测试和证明都需要先知道"对"的定义。', tone: 'method' },
    { label: '不变量', complexity: '正确性工具', condition: '初始化成立 + 每步保持 + 终止时蕴含输出正确。', example: 'max-so-far = 前 i 个元素的最大值', explanation: '归纳证明的算法版：把"对所有前缀都对"压缩成一条可局部检查的性质。', tone: 'method' },
    { label: '反例', complexity: '暴露 bug 的输入', condition: '专挑代码覆盖不到的角落：末元素、全负、单元素。', example: '[3,1,4,1,5,2,6,9] 让 bug A 输出 6', explanation: '一个反例足以否证；找不到反例也不等于正确——证明才能保证。', tone: 'method' },
  ],
  footer: '测试与证明互补：测试找反例便宜但不完备，不变量证明完备但要花力气——核心算法两样都要。',
}

export function AlgorithmRoleLesson() {
  const [exampleId, setExampleId] = useState(roleExamples[0].id)
  const example = roleExamples.find(item => item.id === exampleId) ?? roleExamples[0]
  const trace = buildRoleTrace(example)
  const playback = useLessonPlayback(trace.steps.length)
  return <LessonShell eyebrow={trace.eyebrow} title={trace.steps[playback.step].title} description={trace.description} steps={trace.steps.map(item => item.tab ?? '推演')} step={playback.step} onStepChange={playback.setStep} playing={playback.playing} onTogglePlaying={playback.togglePlaying} onReplay={playback.replay} speed={playback.speed} onCycleSpeed={playback.cycleSpeed} complexity={roleComplexity} examplePicker={<ExamplePicker examples={roleExamples} value={exampleId} onChange={id => { playback.reset(); setExampleId(id) }} />}>
    <TracePlayer trace={trace} step={playback.step} />
    <DesignNotes insight={roleInsight} />
  </LessonShell>
}
