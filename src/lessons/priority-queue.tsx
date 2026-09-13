import { useState } from 'react'
import { DesignNotes, type DesignInsight } from '@/components/DesignNotes'
import { ExamplePicker, type ExampleOption } from '@/components/ExamplePicker'
import { LessonShell } from '@/components/LessonShell'
import type { ComplexityProfileData } from '@/components/ComplexityProfile'
import type { MetricItem } from '@/components/CalcDesk'
import { TracePlayer } from '@/engine/TracePlayer'
import { arrayScene, recordTrace, tokenLabel, tokenize, type TraceEvent } from '@/engine/events'
import type { PredictionData } from '@/components/PredictionPrompt'
import type { SceneCell, Tone, Trace, TreeScene } from '@/engine/trace'
import { useLessonPlayback } from '@/hooks/useLessonPlayback'

/** 演示数据与算法分离：本文件 = 操作流数据集 + 大根堆 INSERT/EXTRACT-MAX 生成器（产出 Trace）+ 播放器装配。 */

type Tok = { value: number; tag?: string; seed: number }
type PqExample = ExampleOption & { ops: number[] }

const pqExamples: readonly PqExample[] = [
  { id: 'mixed', label: '混合操作流', detail: '[9,14,3,7] · 上浮有停有走', ops: [9, 14, 3, 7] },
  { id: 'ascending', label: '升序 · 最坏上浮', detail: '[3,7,9,14] 每次插入都顶到根', ops: [3, 7, 9, 14] },
  { id: 'descending', label: '降序 · 最好', detail: '[14,9,7,3] 插入立即停', ops: [14, 9, 7, 3] },
  { id: 'duplicates', label: '重复键 · 查身份', detail: '[5,5,2,5] → 5A/5B/5C 不换位', ops: [5, 5, 2, 5] },
]

/** MAX-HEAP-INSERT 与 HEAP-EXTRACT-MAX 合并短行（CLRS 1 起下标）。 */
const pqCode = [
  { code: 'MAX-HEAP-INSERT(A, key)', note: '插入 = 追加 + 上浮' },
  { code: '  A[A.size+1] = key；i = A.size+1', note: '追加到完全二叉树的下一个空位' },
  { code: '  while i > 1 and A[⌊i/2⌋] < A[i]', note: '上浮条件：父节点更小' },
  { code: '    exchange A[i] ↔ A[⌊i/2⌋]；i = ⌊i/2⌋', note: '交换上浮一层' },
  { code: 'HEAP-EXTRACT-MAX(A)', note: '取最大 = 交付根 + 末尾补位 + 下沉' },
  { code: '  max = A[1]；A[1] = A[A.size]', note: '根交付输出，末尾元素补根' },
  { code: '  A.size = A.size − 1' },
  { code: '  SIFT-DOWN(1)：与较大孩子交换下沉', note: '直到孩子都不更大' },
]

/** 按层数组 → 树场景：null 表示该层空位；最后一层按 2^L 补齐。 */
function treeSceneOf(heap: readonly Tok[], toneFor: (index: number) => Tone | undefined, label: string): TreeScene {
  const levels: (SceneCell | null)[][] = []
  let level = 0
  while ((1 << level) - 1 < heap.length) {
    const start = (1 << level) - 1
    const width = 1 << level
    levels.push(Array.from({ length: width }, (_, slot) => {
      const index = start + slot
      return index < heap.length ? { id: `n${heap[index].seed}`, label: tokenLabel(heap[index]), tone: toneFor(index) } : null
    }))
    level += 1
  }
  return { kind: 'tree', id: 'heapTree', label, levels }
}

function* runPriorityQueue(ops: readonly number[]): Generator<TraceEvent> {
  const tokens = tokenize(ops)
  const heap: Tok[] = []
  const output: Tok[] = []
  let opIndex = -1
  let riseSteps = 0
  let sinkSteps = 0
  let risePrediction: PredictionData | undefined = {
    prompt: '它会上浮到哪、什么时候停？',
    options: ['与父比较：父更小就换，直到父更大或到根', '固定上浮一层就停', '一路浮到叶子层'],
    answer: 0,
    explanation: '上浮的判据只有一条：父节点是否比它小。堆高 ⌊log₂n⌋ 就是上浮步数的上界——与输入分布无关。',
  }
  let sinkPrediction: PredictionData | undefined = {
    prompt: '下沉修复应该和哪个孩子比较？',
    options: ['两个孩子中较大的那个', '固定和左孩子比', '两个孩子各换一遍'],
    answer: 0,
    explanation: '只有与较大孩子交换才能保住"父 ≥ 子"；若与较小的孩子交换，更大的孩子会悬在新父头顶，堆序立刻破功。',
  }
  const metrics = (): MetricItem[] => [
    { label: '堆大小', value: heap.length, tone: 'blue' },
    { label: '堆高 ⌊log₂n⌋', value: heap.length > 0 ? Math.floor(Math.log2(heap.length)) : 0, tone: 'purple' },
    { label: '本次上浮/下沉步数', value: `${riseSteps} 升 / ${sinkSteps} 沉`, tone: 'orange' },
    { label: '输出区', value: output.length > 0 ? output.map(tokenLabel).join('、') : '（空）', tone: 'green' },
  ]
  /** 每拍同步三视图：树（主）、堆数组（1-based）、操作流；交付后追加输出区。consumed=操作流中已完成的操作数。 */
  function* syncScenes(toneFor: (index: number) => Tone | undefined, treeLabel: string, hasOutput: boolean, consumed: number): Generator<TraceEvent> {
    yield { t: 'scene', scene: treeSceneOf(heap, toneFor, treeLabel) }
    yield { t: 'scene', scene: arrayScene('heapArr', `堆数组（1-based 下标）· ${heap.length} 个`, heap.map((token, index) => ({ id: `a${token.seed}`, label: tokenLabel(token), tone: toneFor(index) })), { indexes: true }) }
    yield { t: 'scene', scene: arrayScene('stream', '操作流（INSERT 依次消费）', tokens.map((token, index) => ({ id: `s${token.seed}`, label: tokenLabel(token), tone: index < consumed ? 'muted' : index === consumed ? 'focus' : 'default' })), { indexes: true }) }
    if (hasOutput) {
      yield { t: 'scene', scene: arrayScene('output', '输出区（EXTRACT-MAX 交付，天然降序）', output.map(token => ({ id: `o${token.seed}`, label: tokenLabel(token), tone: 'sorted' as Tone })), { indexes: true }) }
    }
  }

  // ── 拍① 接口与三种实现对比 ──
  opIndex = 0
  yield* syncScenes(() => undefined, '堆树（空）——父 ≥ 子的完全二叉树', false, 0)
  yield { t: 'metrics', metrics: metrics() }
  yield { t: 'legend', legend: [{ tone: 'focus', label: '比较对象 / 当前操作' }, { tone: 'key', label: '上浮/下沉中的元素' }, { tone: 'sorted', label: '已交付输出' }, { tone: 'muted', label: '已消费的操作' }] }
  yield { t: 'message', step: {
    title: '接口先行：优先队列只要两个操作',
    tab: '接口',
    question: '同样支持"插入 + 取最大"，成本差在哪里？',
    formula: String.raw`\text{优先队列接口：}\ \text{INSERT}(x)\ \text{与}\ \text{EXTRACT-MAX}()`,
    formulaHint: '本沙盘只演"堆"这种实现；另两种写进右侧备注做对比。',
    equation: String.raw`\text{无序数组：插入}O(1)\text{、取最大}O(n)\quad \text{有序数组：取最大}O(1)\text{、插入}O(n)\quad \text{堆：都}O(\log n)`,
    invariant: '堆只承诺偏序"父 ≥ 子"：不维护全序，所以每次只需修一条路径。',
    note: '无序数组：插入 O(1)，取最大要全扫 O(n)；有序数组：取最大 O(1)，插入要整体挪动 O(n)；堆：插入与取最大都是 O(log n)——把"找最值"摊销成"维护堆序"。',
    conclusion: '从操作流里取第一个数：先追加，再决定要不要上浮。',
    pseudocode: { lines: pqCode, active: [] },
  } }
  yield { t: 'step' }

  // ── 拍②③ 逐个 INSERT：追加末尾 + 上浮 ──
  for (opIndex = 0; opIndex < tokens.length; opIndex += 1) {
    const incoming = tokens[opIndex]
    heap.push(incoming)
    riseSteps = 0
    const appendIndex = heap.length - 1
    yield* syncScenes(index => (index === appendIndex ? 'key' : 'default'), `INSERT(${tokenLabel(incoming)})：追加到下一个空位`, false, opIndex)
    yield { t: 'metrics', metrics: metrics() }
    yield { t: 'message', step: {
      title: `INSERT(${tokenLabel(incoming)})：追加到末尾 A[${heap.length}]`,
      tab: `插入 ${tokenLabel(incoming)}`,
      question: '新元素先放哪？',
      formula: String.raw`A[${heap.length}]=\text{${tokenLabel(incoming)}}\ \text{（完全二叉树的下一个空位）}`,
      formulaHint: '树视图与数组视图同拍：数组末尾就是树的下一层最左空位。',
      moves: { kind: 'one-way', title: `${tokenLabel(incoming)} 从操作流进入堆`, moves: [{ token: tokenLabel(incoming), from: '操作流', to: `末尾 A[${heap.length}]` }], verdict: '形状优先：完全二叉树只有这一个空位可放。' },
      invariant: '完全二叉树形状不变：下标 i 的父节点永远是 ⌊i/2⌋（1 起下标）。',
      note: '此刻堆序可能被破坏——只有新元素到父节点的这一条路径可能违规，别的节点之间依然父 ≥ 子。',
      conclusion: heap.length > 1 ? '与父节点比较，决定上浮还是停住。' : '它已是唯一的节点（根）：上浮检查立即结束。',
      pseudocode: { lines: pqCode, active: [1] },
    } }
    yield { t: 'step' }

    // 上浮：与父比较，父更小就交换（真实 siftUp）
    let i = appendIndex
    while (i > 0) {
      const p = (i - 1) >> 1
      if (heap[p].value < heap[i].value) {
        riseSteps += 1
        const child = heap[i]
        const parent = heap[p]
        ;[heap[p], heap[i]] = [heap[i], heap[p]]
        yield* syncScenes(index => (index === p ? 'key' : index === i ? 'focus' : 'default'), `上浮：${tokenLabel(child)} > 父 ${tokenLabel(parent)}，交换`, false, opIndex)
        yield { t: 'metrics', metrics: metrics() }
        yield { t: 'message', step: {
          title: `上浮：A[${i + 1}]=${tokenLabel(child)} > 父 A[${p + 1}]=${tokenLabel(parent)}，交换`,
          tab: `上浮 ${tokenLabel(child)}·${riseSteps}`,
          question: '凭什么它有资格再上一层？',
          formula: String.raw`\text{A}[${i + 1}]=${child.value}>\text{A}[${p + 1}]=${parent.value}\Rightarrow\text{交换上浮}`,
          formulaHint: `树视图里高亮的一对父子就是本次比较；数组视图同步交换。`,
          judge: { entries: [{ left: `A[${i + 1}]=${tokenLabel(child)}`, op: '>', right: `父 A[${p + 1}]=${tokenLabel(parent)}`, holds: true, action: '父更小 → 交换，孩子上浮一层' }] },
          moves: { kind: 'up', title: `${tokenLabel(child)} 沿父子路径上浮一层`, moves: [{ token: tokenLabel(child), from: `A[${i + 1}]`, to: `A[${p + 1}]（父位）` }], verdict: `${tokenLabel(child)} > ${tokenLabel(parent)}：子比父大，堆序要求换位。` },
          invariant: '除了这条路径，其余父子关系依然父 ≥ 子——上浮只修一条路。',
          note: `父节点 ${tokenLabel(parent)} 同时落到 A[${i + 1}]：交换是双向的，树形状不变。已走 ${riseSteps} 步，堆高上界 ⌊log₂${heap.length}⌋=${Math.max(0, Math.floor(Math.log2(heap.length)))}。`,
          conclusion: p > 0 ? `继续与新的父节点 A[${((p - 1) >> 1) + 1}] 比较。` : '它已到达根：上浮到此为止。',
          pseudocode: { lines: pqCode, active: [2, 3] },
          prediction: risePrediction,
        } }
        yield { t: 'step' }
        risePrediction = undefined
        i = p
      } else break
    }
    // 上浮停止拍
    const settled = heap[i]
    if (i === 0) {
      yield* syncScenes(index => (index === 0 ? 'focus' : 'default'), `上浮结束：${tokenLabel(settled)} 停在根`, false, opIndex + 1)
      yield { t: 'metrics', metrics: metrics() }
      yield { t: 'message', step: {
        title: `上浮结束：${tokenLabel(settled)} 已到根 A[1]`,
        tab: `上浮停·${tokenLabel(settled)}`,
        question: '为什么到这里就保证堆序了？',
        formula: String.raw`\text{本次上浮 }${riseSteps}\text{ 步}\le\lfloor\log_2 ${heap.length}\rfloor=\text{堆高上界}`,
        formulaHint: '路径上的每一对父子都已恢复"父 ≥ 子"。',
        judge: { entries: [{ left: `A[1]=${tokenLabel(settled)}`, op: '=', right: '根（没有父节点）', holds: true, action: '已到根，停止上浮' }] },
        invariant: '堆序不变量恢复：堆中每个父节点 ≥ 它的孩子。',
        note: `本次 INSERT 共上浮 ${riseSteps} 步。升序流会步步顶到根（最坏 ⌊log₂n⌋ 步）；降序流 0 步就停——上界不变。`,
        conclusion: '堆已恢复堆序，处理操作流的下一个数。',
        pseudocode: { lines: pqCode, active: [2] },
        prediction: risePrediction,
      } }
      yield { t: 'step' }
      risePrediction = undefined
    } else {
      const p = (i - 1) >> 1
      const parent = heap[p]
      const equalCase = parent.value === settled.value
      yield* syncScenes(index => (index === p ? 'focus' : 'default'), `上浮停止：父 ≥ 新元素`, false, opIndex + 1)
      yield { t: 'metrics', metrics: metrics() }
      yield { t: 'message', step: {
        title: `上浮停止：父 A[${p + 1}]=${tokenLabel(parent)} ≥ A[${i + 1}]=${tokenLabel(settled)}`,
        tab: `上浮停·${tokenLabel(settled)}`,
        question: '为什么不用继续换？',
        formula: String.raw`\text{A}[${p + 1}]=${parent.value}\ge \text{A}[${i + 1}]=${settled.value}\Rightarrow\text{停}`,
        formulaHint: 'judge 行给出了停止依据：父节点不比它更小。',
        judge: { entries: [{ left: `父 A[${p + 1}]=${tokenLabel(parent)}`, op: '≥', right: `A[${i + 1}]=${tokenLabel(settled)}`, holds: false, action: equalCase ? '相等不上浮 → 停在父节点下方' : '父不更小 → 停止上浮，堆序恢复' }] },
        invariant: '堆序不变量恢复：堆中每个父节点 ≥ 它的孩子。',
        note: equalCase ? `${tokenLabel(parent)} 与 ${tokenLabel(settled)} 值相等：上浮条件是"父更小"，相等不触发交换——5B 停在 5A 下方，两个身份原地保留。` : `本次 INSERT 共上浮 ${riseSteps} 步即停：父节点本来就更大，路径之上天然堆序完好。`,
        conclusion: '堆已恢复堆序，处理操作流的下一个数。',
        pseudocode: { lines: pqCode, active: [2] },
        prediction: risePrediction,
      } }
      yield { t: 'step' }
      risePrediction = undefined
    }
  }
  opIndex = tokens.length

  // ── 拍④⑤ EXTRACT-MAX：根交付 + 末尾补根 + 下沉 ──
  const maxTok = heap[0]
  const filler = heap.pop()!
  if (heap.length > 0) heap[0] = filler
  output.push(maxTok)
  sinkSteps = 0
  yield* syncScenes(index => (heap.length > 0 && index === 0 ? 'key' : 'default'), `EXTRACT-MAX：${tokenLabel(maxTok)} 交付，${filler && heap.length > 0 ? tokenLabel(filler) : '（堆已空）'}补根`, true, tokens.length)
  yield { t: 'metrics', metrics: metrics() }
  yield { t: 'message', step: {
    title: `EXTRACT-MAX：根 ${tokenLabel(maxTok)} 交付输出区，末尾 ${heap.length > 0 ? tokenLabel(filler) : '—'} 补根`,
    tab: `交付 ${tokenLabel(maxTok)}`,
    question: '根被取走后，谁来补这个空位？',
    formula: String.raw`\text{max}=\text{A}[1]=\text{${tokenLabel(maxTok)}};\quad \text{A}[1]\leftarrow \text{A}[${heap.length + 1}]=\text{${heap.length > 0 ? tokenLabel(filler) : '∅'}}`,
    formulaHint: '输出区（右下卡）出现第一个交付值；堆大小减一。',
    moves: { kind: 'one-way', title: '根 → 输出区；末尾 → 根（两次单向搬运）', moves: [
      { token: tokenLabel(maxTok), from: '根 A[1]', to: '输出区' },
      ...(heap.length > 0 ? [{ token: tokenLabel(filler), from: `末尾 A[${heap.length + 1}]`, to: '根 A[1]' }] : []),
    ], verdict: '保持完全二叉树形状只有一种便宜做法：拿末尾补根。' },
    invariant: '树形状完好：除新根外，所有子树依然满足堆序。',
    note: '为什么不用较大孩子直接升根？那会让最底层空洞、破坏完全二叉树，数组下标的父子公式也随之失效。形状不变，堆序交给下沉修复。',
    conclusion: '新根可能偏小——沿较大孩子方向下沉修复。',
    pseudocode: { lines: pqCode, active: [5, 6] },
    prediction: {
      prompt: '根交付后，谁会补上根的位置？',
      options: ['数组末尾的最后一个元素', '根的较大孩子直接升根', '输出区腾出的空位回到堆里'],
      answer: 0,
      explanation: '末尾补根是唯一保持完全二叉树形状的选择：形状一破，"下标 i 的孩子是 2i、2i+1"的整套数组表示法就失效了。',
    },
  } }
  yield { t: 'step' }

  // 下沉：与较大孩子比较（真实 siftDown）
  let down = 0
  for (;;) {
    const size = heap.length
    const l = 2 * down + 1
    const r = l + 1
    let largest = down
    if (l < size && heap[l].value > heap[largest].value) largest = l
    if (r < size && heap[r].value > heap[largest].value) largest = r
    if (largest === down) {
      const fillerNow = heap[down]
      const leaf = l >= size
      const biggestChild = heap[largest]
      yield* syncScenes(index => (!leaf && index === largest ? 'focus' : index === down ? 'key' : 'default'), `下沉停止：${tokenLabel(fillerNow)} 找到位置`, true, tokens.length)
      yield { t: 'metrics', metrics: metrics() }
      yield { t: 'message', step: {
        title: leaf ? `下沉结束：${tokenLabel(fillerNow)} 已是叶子 A[${down + 1}]` : `下沉停止：A[${down + 1}]=${tokenLabel(fillerNow)} ≥ 较大孩子 ${tokenLabel(biggestChild)}`,
        tab: '下沉停',
        question: '怎么确认堆序已经恢复？',
        formula: leaf
          ? String.raw`\text{A}[${down + 1}]=\text{${tokenLabel(fillerNow)}}\ \text{无孩子：路径修复完成}`
          : String.raw`\text{A}[${down + 1}]=${fillerNow.value}\ge \text{较大孩子}=${biggestChild.value}\Rightarrow\text{堆序恢复}`,
        formulaHint: '本次 EXTRACT-MAX 共下沉 ' + sinkSteps + ' 步；每一层只比较 1–2 次。',
        judge: { entries: [leaf
          ? { left: `A[${down + 1}]=${tokenLabel(fillerNow)}`, op: '—', right: '无孩子（叶子）', holds: true, action: '到底了，堆序恢复' }
          : { left: `A[${down + 1}]=${tokenLabel(fillerNow)}`, op: '≥', right: `较大孩子 A[${largest + 1}]=${tokenLabel(biggestChild)}`, holds: true, action: '父不小于孩子 → 停止下沉' }] },
        invariant: '堆序不变量恢复：堆中每个父节点 ≥ 它的孩子。',
        note: leaf ? '元素沉到叶子层：下面没有孩子，路径到此自然结束。' : '父节点不小于较大的孩子，其余孩子更小——整条路径修复完毕。相等值（如 5C 与 5B）也满足父 ≥ 子，不触发交换。',
        conclusion: 'EXTRACT-MAX 完成：输出区已拿到当前最大值，堆继续服务下一个请求。',
        pseudocode: { lines: pqCode, active: [7] },
        prediction: sinkPrediction,
      } }
      yield { t: 'step' }
      sinkPrediction = undefined
      break
    }
    sinkSteps += 1
    const mover = heap[down]
    const winner = heap[largest]
    const hasRight = r < size
    const leftChild = heap[l]
    const rightChild = hasRight ? heap[r] : null
    ;[heap[down], heap[largest]] = [heap[largest], heap[down]]
    yield* syncScenes(index => (index === largest ? 'key' : index === down ? 'focus' : 'default'), `下沉：${tokenLabel(mover)} < 较大孩子 ${tokenLabel(winner)}，交换`, true, tokens.length)
    yield { t: 'metrics', metrics: metrics() }
    yield { t: 'message', step: {
      title: `下沉：A[${down + 1}]=${tokenLabel(mover)} < 较大孩子 A[${largest + 1}]=${tokenLabel(winner)}，交换`,
      tab: `下沉·${sinkSteps}`,
      question: '为什么必须挑较大的孩子换上来？',
      formula: String.raw`\text{A}[${down + 1}]=${mover.value}<\text{较大孩子}=\text{A}[${largest + 1}]=${winner.value}\Rightarrow\text{交换下沉}`,
      formulaHint: 'judge 第一行展示两个孩子谁更大；第二行是与较大孩子的交换判据。',
      judge: { entries: [
        ...(hasRight && rightChild ? [{ left: `左孩 A[${l + 1}]=${tokenLabel(leftChild)}`, op: leftChild.value >= rightChild.value ? '≥' : '<', right: `右孩 A[${r + 1}]=${tokenLabel(rightChild)}`, holds: true, action: `较大孩子是${largest === l ? '左' : '右'}孩` }] : []),
        { left: `A[${down + 1}]=${tokenLabel(mover)}`, op: '<', right: `较大孩子 A[${largest + 1}]=${tokenLabel(winner)}`, holds: true, action: '较大孩子升位，自己下沉一层' },
      ] },
      moves: { kind: 'down', title: `${tokenLabel(mover)} 沿较大孩子方向下沉一层`, moves: [{ token: tokenLabel(mover), from: `A[${down + 1}]`, to: `A[${largest + 1}]` }], verdict: `${tokenLabel(winner)} 是两个孩子中较大的：与它交换，父 ≥ 子才可能成立。` },
      invariant: '只动一条路径：其余子树的堆序在下沉过程中毫发无损。',
      note: `已下沉 ${sinkSteps} 步，剩余路径 ≤ 堆高 ⌊log₂${heap.length}⌋。${hasRight ? '换之前先比两个孩子：' : ''}若与较小的孩子交换，较大的孩子会悬在新父头顶，堆序立即破功。`,
      conclusion: largest < heap.length - 1 ? '继续与新位置的孩子们比较。' : '再看一眼：它是否还需要继续下沉。',
      pseudocode: { lines: pqCode, active: [7] },
      prediction: sinkPrediction,
    } }
    yield { t: 'step' }
    sinkPrediction = undefined
    down = largest
  }

  // ── 拍⑥ 复杂度总结 ──
  yield* syncScenes(() => 'default', '堆序恢复：一次完整的 INSERT + EXTRACT-MAX', true, tokens.length)
  yield { t: 'metrics', metrics: metrics() }
  yield { t: 'message', step: {
    title: '复杂度总结：都由堆高 ⌊log₂n⌋ 决定',
    tab: '复杂度',
    question: '堆凭什么两种操作都不超标？',
    formula: String.raw`\text{INSERT}=\text{EXTRACT-MAX}=O(\log n),\quad \text{BUILD-HEAP}=O(n)`,
    formulaHint: '上浮与下沉都只走一条根到叶的路径：步数 ≤ 堆高。',
    equation: String.raw`\text{堆高}=\lfloor\log_2 n\rfloor;\quad \sum_{h=0}^{\lfloor\log_2 n\rfloor}\tfrac{n}{2^{h+1}}\cdot h\le 2n\Rightarrow\text{BUILD-HEAP}=O(n)`,
    invariant: '无论操作流是升序、降序还是重复键：堆的成本上界与输入分布无关。',
    note: '升序流步步顶到根（最坏上浮），降序流立即停（最好）——但上界都一样。BUILD-HEAP 自底向上建堆：一半节点是叶子（零下沉），按高度加权求和收敛到 O(n)，而不是 n·log n。',
    conclusion: '下次需要"反复取最值"，先想起堆：维护偏序，比维护全序便宜一个 log 因子。',
    pseudocode: { lines: pqCode, active: [] },
  } }
  yield { t: 'step' }
}

const buildPriorityQueueTrace = (example: PqExample): Trace => recordTrace('SANDBOX 13 · PRIORITY QUEUE', '大根堆优先队列：INSERT 上浮、EXTRACT-MAX 下沉——把"反复找最值"变成"维护堆序"，两种操作都只花堆高 ⌊log₂n⌋ 的钱。', runPriorityQueue(example.ops))

const pqInsight: DesignInsight = {
  observation: '堆把"反复取最值"改写成"维护偏序"：只承诺父 ≥ 子、不维护全序，于是插入与取出都只需修复一条 ⌊log₂n⌋ 长的路径。',
  contrasts: [
    { alternative: '无序数组', whyNot: '插入 O(1) 便宜，但每次取最大要全扫 O(n)；反复取最值合计 Θ(n²)——成本全押在"找"上。' },
    { alternative: '有序数组', whyNot: '取最大 O(1)，但插入要整体挪动 Θ(n)——成本全押在"排"上；堆让两种操作都是 O(log n)。' },
  ],
  transfer: { prompt: 'Dijkstra 每轮要"取出当前距离最小的点"，并可能"更新其他点的距离"。选哪种实现？', options: ['小根堆：EXTRACT-MIN 与 DECREASE-KEY 都是 O(log n)', '无序数组更简单，够用了', '必须先把所有点排好序'], answer: 0, explanation: '这正是优先队列的教科书场景：大根堆取反就是小根堆；每次 EXTRACT-MIN 后的松弛对应 DECREASE-KEY——两者都只花堆高的钱，总复杂度 O((V+E) log V)。' },
}

const pqComplexity: ComplexityProfileData = {
  title: '优先队列：三种操作的成本由堆高决定',
  subtitle: '大根堆只维护"父 ≥ 子"的偏序，换来 INSERT 与 EXTRACT-MAX 的双对数保证。',
  cases: [
    { label: 'INSERT', complexity: 'Θ(log n)', condition: '由堆高决定，与输入分布无关。', example: '升序流 [3,7,9,14]：每次顶到根，走满堆高', explanation: '上浮最多 ⌊log₂n⌋ 步；降序流 0 步即停——上界不变。', tone: 'method' },
    { label: 'EXTRACT-MAX', complexity: 'Θ(log n)', condition: '由堆高决定，与输入分布无关。', example: '交付根后末尾补根，沿较大孩子下沉', explanation: '下沉同样最多 ⌊log₂n⌋ 步，每层只比较 1–2 次。', tone: 'method' },
    { label: 'BUILD-HEAP', complexity: 'Θ(n)', condition: '由堆高决定，与输入分布无关。', example: '自底向上 siftDown：一半节点是叶子、零成本', explanation: 'Σ n/2^(h+1)·h ≤ 2n：低层节点多、下沉短，求和线性。', tone: 'method' },
  ],
  footer: '与输入分布无关：堆的成本上界对任何操作序列都成立——这是相对"有序数组"最关键的差别。',
}

export function PriorityQueueLesson() {
  const [exampleId, setExampleId] = useState(pqExamples[0].id)
  const example = pqExamples.find(item => item.id === exampleId) ?? pqExamples[0]
  const trace = buildPriorityQueueTrace(example)
  const playback = useLessonPlayback(trace.steps.length)
  return <LessonShell eyebrow={trace.eyebrow} title={trace.steps[playback.step].title} description={trace.description} steps={trace.steps.map(item => item.tab ?? '推演')} step={playback.step} onStepChange={playback.setStep} playing={playback.playing} onTogglePlaying={playback.togglePlaying} onReplay={playback.replay} speed={playback.speed} onCycleSpeed={playback.cycleSpeed} complexity={pqComplexity} examplePicker={<ExamplePicker examples={pqExamples} value={exampleId} onChange={id => { playback.reset(); setExampleId(id) }} />}>
    <TracePlayer trace={trace} step={playback.step} />
    <DesignNotes insight={pqInsight} />
  </LessonShell>
}
