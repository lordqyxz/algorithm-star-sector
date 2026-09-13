import { useState } from 'react'
import { DesignNotes, type DesignInsight } from '@/components/DesignNotes'
import { ExamplePicker, type ExampleOption } from '@/components/ExamplePicker'
import { LessonShell } from '@/components/LessonShell'
import type { ComplexityProfileData } from '@/components/ComplexityProfile'
import type { MetricItem } from '@/components/CalcDesk'
import { TracePlayer } from '@/engine/TracePlayer'
import { arrayScene, recordTrace, tokenLabel, tokenize, type TraceEvent } from '@/engine/events'
import type { PointerTag, RegionLabel, SceneCell, Trace } from '@/engine/trace'
import { useLessonPlayback } from '@/hooks/useLessonPlayback'

/** 演示数据与算法分离：本文件 = 数据集 + RANDOMIZED-SELECT 生成器（产出 Trace）+ 播放器装配。 */

/** mulberry32：固定种子的确定性 PRNG——StrictMode 双渲染不改变抽签结果。 */
function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type Tok = { value: number; tag?: string; seed: number }
type SelectExample = ExampleOption & { values: number[]; k: number; seed: number }

const selectExamples: readonly SelectExample[] = [
  { id: 'k1', label: 'k=1 · 找最小', detail: '[7,2,1,6,8,5,3,4] · k=1', values: [7, 2, 1, 6, 8, 5, 3, 4], k: 1, seed: 20 },
  { id: 'k4', label: 'k=4 · 找中位', detail: '[7,2,1,6,8,5,3,4] · k=4', values: [7, 2, 1, 6, 8, 5, 3, 4], k: 4, seed: 20 },
  { id: 'k8', label: 'k=8 · 找最大', detail: '[7,2,1,6,8,5,3,4] · k=8', values: [7, 2, 1, 6, 8, 5, 3, 4], k: 8, seed: 20 },
  { id: 'k5-dup', label: 'k=5 · 命中 4B', detail: '[4,2,7,4,1,4,3] · k=5 查身份', values: [4, 2, 7, 4, 1, 4, 3], k: 5, seed: 4 },
]

const selectCode = [
  { code: 'RANDOMIZED-SELECT(A, p, r, k)', note: '在 [p..r] 内找第 k 小（1 起下标）' },
  { code: '  if p = r: return A[p]', note: '区间只剩一个元素即答案' },
  { code: '  q = RANDOM(p, r); A[q] ↔ A[r]', note: '随机抽主元换到末位' },
  { code: '  x = A[r]; i = p - 1' },
  { code: '  for j = p to r - 1' },
  { code: '    if A[j] ≤ x: i++; A[i] ↔ A[j]', note: '与快排相同的 PARTITION' },
  { code: '  A[i+1] ↔ A[r]' },
  { code: '  pos = q - p + 1', note: '主元是区间内第 pos 小' },
  { code: '  if k = pos: return A[q]', note: '主元即答案' },
  { code: '  if k < pos: return SELECT(A, p, q-1, k)', note: '只递归一侧' },
  { code: '  return SELECT(A, q+1, r, k-pos)', note: '右侧：减去已确定的 pos 个' },
]

function* runRandomizedSelect(example: SelectExample): Generator<TraceEvent> {
  const tokens = tokenize(example.values)
  const n = tokens.length
  const work = tokens.slice()
  const rand = mulberry32(example.seed)
  const excluded = new Array<boolean>(n).fill(false)
  let compares = 0
  const k0 = example.k
  const metrics = (kk: number, size: number, dropped: number): MetricItem[] => [
    { label: '剩余区间', value: size, tone: 'blue' },
    { label: '剩余 k', value: kk, tone: 'green' },
    { label: '本轮丢弃', value: dropped, tone: 'purple' },
    { label: '累计比较', value: compares, tone: 'orange' },
  ]
  const cells = (focus: number, pivotIdx: number, answerIdx: number): SceneCell[] => work.map((token, index) => ({
    id: `t${token.seed}`,
    label: tokenLabel(token),
    caption: index === answerIdx ? `第 ${k0} 小` : undefined,
    tone: index === answerIdx ? 'target' : index === pivotIdx ? 'pivot' : index === focus ? 'focus' : excluded[index] ? 'muted' : 'default',
  }))
  const pointOf = (pivotIdx: number, scan: number): PointerTag[] => {
    const tags: PointerTag[] = []
    if (pivotIdx >= 0) tags.push({ index: pivotIdx, label: '主元', tone: 'orange' })
    if (scan >= 0) tags.push({ index: scan, label: 'j 扫描', tone: 'blue' })
    return tags
  }

  yield { t: 'scene', scene: arrayScene('shelf', `RANDOMIZED-SELECT：找第 ${k0} 小`, cells(-1, -1, -1), { indexes: true }) }
  yield { t: 'metrics', metrics: metrics(k0, n, 0) }
  yield { t: 'legend', legend: [{ tone: 'pivot', label: '主元' }, { tone: 'focus', label: '正在扫描' }, { tone: 'target', label: '答案/候选' }, { tone: 'muted', label: '已丢弃' }] }

  // ── 拍① 问题声明 ──
  yield { t: 'message', step: {
    title: `问题：第 ${k0} 顺序统计量（第 ${k0} 小）`,
    tab: '问题',
    formula: `\\text{SELECT}(A,${k0})=\\text{第 }${k0}\\text{ 小的元素}`,
    equation: `\\text{先排序再取：}\\Theta(n\\log n)\\quad vs\\quad \\text{选择：期望 }\\Theta(n)`,
    invariant: '第 k 小由"值的多重集"决定——找它不需要把其他元素排好。',
    note: `排序把所有 ${n} 个元素都排好，只为回答一个排名；选择只确定"一个元素的排名"。${tokens.some(t => t.tag) ? '本组数据带重复键身份 4A/4B/4C——k=5 会精确命中其中一个。' : '随机抽主元 + 分区，每次只保留一侧。'}`,
    conclusion: '第一步：随机抽主元，做一次真实分区。',
    pseudocode: { lines: selectCode, active: [0] },
  } }
  yield { t: 'step' }

  let kk = k0
  let p = 0
  let r = n - 1
  let level = 0
  let answer: Tok | null = null
  let answerIdx = -1

  while (p < r) {
    const size = r - p + 1
    // ── 随机抽主元 ──
    const q0 = p + Math.floor(rand() * (r - p + 1))
    const picked = work[q0]
    if (q0 !== r) {
      work[q0] = work[r]
      work[r] = picked
    }
    yield { t: 'cells', scene: 'shelf', cells: cells(-1, r, -1) }
    yield { t: 'pointers', scene: 'shelf', pointers: pointOf(r, -1) }
    yield { t: 'metrics', metrics: metrics(kk, size, 0) }
    yield { t: 'message', step: {
      title: level === 0 ? `随机抽主元：A[${q0 + 1}]=${tokenLabel(picked)} 被抽中` : `递归 [${p + 1}..${r + 1}]：抽中主元 ${tokenLabel(picked)}`,
      tab: level === 0 ? '抽主元' : `抽主元 ${tokenLabel(picked)}`,
      formula: `q=\\text{RANDOM}(${p + 1},${r + 1})=${q0 + 1}\\Rightarrow\\text{主元 }x=${picked.value}`,
      moves: { kind: 'swap', title: `A[${q0 + 1}] 与 A[${r + 1}] 对换：主元就位末尾`, moves: [{ token: tokenLabel(picked), from: `第 ${q0 + 1} 格`, to: `第 ${r + 1} 格` }, { token: tokenLabel(work[q0]), from: `第 ${r + 1} 格`, to: `第 ${q0 + 1} 格` }], verdict: `每个元素等概率 1/${size} 被抽中` },
      invariant: '抽签不改内容：主元换到末位后，PARTITION 才开始。',
      note: level === 0 ? '与随机化快排共用同一个 RANDOMIZED-PARTITION——选择的成本结构来自分区。' : '每一层递归都重新抽签：期望一次丢掉约一半剩余区间。',
      conclusion: '执行 PARTITION：小的进左区，大的留右区。',
      pseudocode: { lines: selectCode, active: [2] },
    } }
    yield { t: 'step' }

    // ── PARTITION：逐拍比较 + 交换（首层逐拍，深层压缩） ──
    const x = picked.value
    let i = p - 1
    for (let j = p; j < r; j += 1) {
      compares += 1
      const scanned = work[j]
      const goLeft = scanned.value <= x
      if (goLeft) {
        i += 1
        if (i !== j) {
          const moved = work[i]
          work[i] = scanned
          work[j] = moved
        }
      }
      if (level === 0) {
        yield { t: 'cells', scene: 'shelf', cells: cells(j, r, -1) }
        yield { t: 'pointers', scene: 'shelf', pointers: pointOf(r, j) }
        yield { t: 'metrics', metrics: metrics(kk, size, 0) }
        yield { t: 'message', step: {
          title: `比较 A[${j + 1}]=${tokenLabel(scanned)} 与主元 ${x}：${goLeft ? '进左区' : '留在右区'}`,
          tab: `扫描 ${tokenLabel(scanned)}`,
          formula: goLeft ? `A[${j + 1}]=${scanned.value}\\le x=${x}\\Rightarrow\\text{左区扩张}` : `A[${j + 1}]=${scanned.value}>x=${x}\\Rightarrow\\text{原地不动}`,
          judge: { entries: [{ left: tokenLabel(scanned), op: '≤', right: `主元 ${x}`, holds: goLeft, action: goLeft ? '并入左区，i 右移' : '留在右区，i 不动' }] },
          invariant: `扫描过的元素都已在正确的一侧；左区内全部 ≤ ${x}。`,
          note: '分区一轮 = 区间长减一次比较，每个元素只和主元比一次。',
          conclusion: `继续扫描 A[${j + 2}]。`,
          pseudocode: { lines: selectCode, active: [4, 5] },
        } }
        yield { t: 'step' }
      }
    }
    // 主元归位
    const q = i + 1
    if (q !== r) {
      const tail = work[r]
      work[r] = work[q]
      work[q] = tail
    }
    const pos = q - p + 1
    const leftSize = q - p
    const rightSize = r - q
    const regions: RegionLabel[] = []
    if (leftSize > 0) regions.push({ from: p, to: q - 1, label: `左区 ≤ ${x} · ${leftSize} 个`, tone: 'blue' })
    regions.push({ from: q, to: q, label: `主元 ${x} · 排名 ${pos}`, tone: 'orange' })
    if (rightSize > 0) regions.push({ from: q + 1, to: r, label: `右区 > ${x} · ${rightSize} 个`, tone: 'yellow' })
    if (level === 0) {
      yield { t: 'cells', scene: 'shelf', cells: cells(-1, q, -1) }
      yield { t: 'pointers', scene: 'shelf', pointers: pointOf(q, -1) }
      yield { t: 'regions', scene: 'shelf', regions }
      yield { t: 'metrics', metrics: metrics(kk, size, 0) }
      yield { t: 'message', step: {
        title: `主元 ${x} 归位：它在区间内排第 ${pos} 小`,
        tab: `归位 ${x}`,
        formula: `${leftSize}\\mid 1\\mid ${rightSize}\\Rightarrow\\text{pos}=q-p+1=${pos}`,
        judge: { entries: [{ left: `本轮 ${r - p} 次比较`, op: '→', right: `左 ${leftSize} / 右 ${rightSize}`, holds: true, action: `主元 ${x} 的全局排名随之确定` }] },
        invariant: `主元 ${x} 与"比它小的 ${leftSize} 个"的关系永远成立——排名不再改变。`,
        note: `分区的副产品就是排名：不需要额外计算，pos = 左区个数 + 1。`,
        conclusion: `先预测：第 ${k0} 小会在哪一侧？`,
        pseudocode: { lines: selectCode, active: [6, 7] },
        prediction: {
          prompt: `主元 ${x} 排名第 ${pos}，要找第 ${k0} 小——答案在哪里？`,
          options: ['左区（答案 < 主元）', '主元本身', '右区（答案 > 主元）'],
          answer: kk < pos ? 0 : kk === pos ? 1 : 2,
          explanation: `k=${kk} 与 pos=${pos} 比较：${kk < pos ? `k < pos，答案比主元小，在左区` : kk === pos ? 'k = pos，主元恰好就是要找的元素' : `k > pos，答案比主元大，在右区找第 ${kk - pos} 小`}。`,
        },
      } }
      yield { t: 'step' }
    }

    // ── 判断递归方向 / 命中 ──
    if (kk === pos) {
      answer = work[q]
      answerIdx = q
      break
    }
    const goLeftSide = kk < pos
    const keptFrom = goLeftSide ? p : q + 1
    const keptTo = goLeftSide ? q - 1 : r
    const kept = keptTo - keptFrom + 1
    const dropped = size - kept - 1
    for (let idx = p; idx <= r; idx += 1) {
      if (idx === q) continue
      excluded[idx] = idx < keptFrom || idx > keptTo
    }
    const keptRegions: RegionLabel[] = [{ from: keptFrom, to: keptTo, label: goLeftSide ? `左区：继续找第 ${kk} 小` : `右区：继续找第 ${kk - pos} 小`, tone: 'purple' }]
    yield { t: 'cells', scene: 'shelf', cells: cells(-1, q, -1) }
    yield { t: 'regions', scene: 'shelf', regions: keptRegions }
    yield { t: 'metrics', metrics: metrics(kk, kept, dropped) }
    yield { t: 'message', step: {
      title: goLeftSide ? `k=${kk} < pos=${pos}：去左区，丢弃右区与主元` : kk > pos && level === 0 ? `k=${kk} > pos=${pos}：去右区，找第 ${kk - pos} 小` : `k=${kk} ${kk < pos ? '<' : '>'} pos=${pos}：去${goLeftSide ? '左' : '右'}区`,
      tab: `丢弃 ${dropped} 个`,
      formula: `k=${kk}\\;${kk < pos ? '<' : '>'}\\;\\text{pos}=${pos}\\Rightarrow\\text{递归}${goLeftSide ? '左' : '右'}区`,
      judge: {
        entries: [
          { left: `k=${kk}`, op: '≤', right: `左区 ${leftSize} 个`, holds: kk <= leftSize, action: kk <= leftSize ? '成立：答案在左区' : '不成立' },
          { left: `k=${kk}`, op: '=', right: `主元排名 ${pos}`, holds: kk === pos, action: kk === pos ? '主元即答案' : '不成立' },
          { left: `k=${kk}`, op: '>', right: `主元排名 ${pos}`, holds: kk > pos, action: kk > pos ? `去右区找第 ${kk - pos} 小` : '不成立' },
        ],
        note: '三条规则恰好一条成立——分区一次，问题规模直接砍掉一侧。',
      },
      invariant: `被丢弃的元素与第 ${kk} 小无关：它们的排名区间与 k 不相交。`,
      note: level === 0 ? '灰色（muted）= 本轮确定不需要的一侧；只保留紫色区间继续递归。' : '同一套规则，每一层递归都只走一侧。',
      conclusion: `区间 ${size} → ${kept}。`,
      pseudocode: { lines: selectCode, active: [7, 8, 9, 10] },
    } }
    yield { t: 'step' }

    if (level === 0) {
      // ── 区间缩短：递推式 + 预测 ──
      yield { t: 'cells', scene: 'shelf', cells: cells(-1, -1, -1) }
      yield { t: 'regions', scene: 'shelf', regions: [{ from: keptFrom, to: keptTo, label: `剩余 ${kept} 个`, tone: 'purple' }] }
      yield { t: 'metrics', metrics: metrics(kk, kept, dropped) }
      yield { t: 'message', step: {
        title: `区间缩短：${size} → ${kept}（本轮丢弃 ${dropped} 个）`,
        tab: `区间 ${size}→${kept}`,
        formula: `T(${size})=T(${kept})+O(${size})`,
        equation: `\\text{期望每次丢一半：}${size}\\to\\approx${Math.ceil(size / 2)}`,
        invariant: `剩余区间内仍包含"原始问题"的第 ${kk} 小——丢弃从不误伤答案。`,
        note: `T(n) = T(一侧) + O(n)：只递归一侧是选择与排序的本质区别；随机主元让"一侧"期望只有一半大。`,
        conclusion: '对剩余区间重复：抽主元 → 分区 → 判断方向。',
        pseudocode: { lines: selectCode, active: [kk < pos ? 9 : 10] },
        prediction: {
          prompt: `若每次都走运丢掉一半，累计比较大约是多少？`,
          options: ['约 2n（n + n/2 + n/4 + …）', '约 n²', '约 n log n'],
          answer: 0,
          explanation: '每层成本是当层区间长：n + n/2 + n/4 + … 是几何级数，收敛到 2n——这就是期望 Θ(n) 的来源。',
        },
      } }
      yield { t: 'step' }
    }

    kk = goLeftSide ? kk : kk - pos
    p = keptFrom
    r = keptTo
    level += 1
  }

  // ── 命中（区间长度 1 的基例也在这里收束） ──
  if (answer === null) {
    answer = work[p]
    answerIdx = p
    excluded.forEach((_, idx) => { excluded[idx] = idx !== p })
  }
  compares += 0
  yield { t: 'cells', scene: 'shelf', cells: cells(-1, -1, answerIdx) }
  yield { t: 'pointers', scene: 'shelf', pointers: pointOf(-1, -1) }
  yield { t: 'regions', scene: 'shelf', regions: [{ from: answerIdx, to: answerIdx, label: `答案 · 第 ${k0} 小`, tone: 'purple' }] }
  yield { t: 'metrics', metrics: metrics(0, 1, 0) }
  yield { t: 'message', step: {
    title: `命中：第 ${k0} 小 = ${tokenLabel(answer)}`,
    tab: `命中 ${tokenLabel(answer)}`,
    formula: `\\text{SELECT}(A,${k0})=${answer.value}`,
    equation: `\\text{命中身份 }${tokenLabel(answer)}\\;(\\text{原数组的第 }${answer.seed + 1}\\text{ 位})`,
    invariant: `答案的值由多重集决定；带身份的数据集证明命中的是"哪一个"重复键。`,
    note: tokens.some(t => t.tag) ? `${tokenLabel(answer)} 是值 ${answer.value} 的第 ${String.fromCharCode(65 + (tokens.filter(t => t.value === answer.value && t.seed <= answer.seed).length - 1))} 个出现——k=${k0} 落在它的排名区间内，分区链一路把它留下来。` : '整个过程中其余元素从未被排序——选择只付了"确定一个排名"的钱。',
    conclusion: `共 ${compares} 次比较找到答案；对比排序的 Θ(n log n)，选择期望只要 Θ(n)。`,
    pseudocode: { lines: selectCode, active: [1, 8] },
  } }
  yield { t: 'step' }

  // ── 复杂度 ──
  yield { t: 'cells', scene: 'shelf', cells: cells(-1, -1, answerIdx) }
  yield { t: 'metrics', metrics: metrics(0, 1, 0) }
  yield { t: 'message', step: {
    title: '复杂度：期望 Θ(n)，最坏 Θ(n²)，仍胜过排序',
    tab: '复杂度',
    formula: `\\text{期望 }\\Theta(n)\\quad \\text{最坏 }\\Theta(n^2)\\quad \\text{排序下界 }\\Omega(n\\log n)`,
    equation: `${n}+\\tfrac{${n}}{2}+\\tfrac{${n}}{4}+\\cdots\\le 2${n}`,
    invariant: '每次分区真实执行 O(区间长)；期望层数由"每次丢一半"决定。',
    note: `最坏：主元每次都抽中极值，只丢 1 个，(n−1)+(n−2)+…=Θ(n²)——但概率随 n 缩小。期望：几何级数 ≤ 2n。排序回答"所有排名"，选择只回答"一个排名"。`,
    conclusion: '只要一个排名时，随机化选择比排序便宜一个 log 因子。',
    pseudocode: { lines: selectCode, active: [] },
  } }
  yield { t: 'step' }
}

const buildSelectTrace = (example: SelectExample): Trace => recordTrace('SANDBOX 11 · ORDER STATISTICS', 'RANDOMIZED-SELECT：分区一次就确定一个排名，只保留一侧递归——期望 Θ(n) 找到第 k 小，不需要把数组排好。', runRandomizedSelect(example))

const selectInsight: DesignInsight = {
  observation: '分区一次就确定一个元素的全局排名——"确定排名"是比"全序"便宜一个 log 因子的原语；RANDOMIZED-SELECT 每轮只保留一侧，n + n/2 + n/4 + … 收敛到 2n。',
  contrasts: [
    { alternative: '先排序再取第 k', whyNot: 'Θ(n log n) 且顺带回答所有排名；只要一个排名时，多付的 log 因子全是浪费。' },
    { alternative: '中位数的中位数（确定性选择）', whyNot: '最坏 Θ(n) 无需运气，但每层多花 O(n) 挑主元，常数约是随机版的数倍——工程上随机版几乎总是更快。' },
  ],
  transfer: { prompt: '如果要"最小的 k 个数"（不只第 k 小），怎么改最省？', options: ['先 SELECT 第 k 小，再线性扫一遍收集 ≤ 它的元素：Θ(n)', '必须完整排序后取前 k 个', '对每个 i=1..k 各跑一遍 SELECT：Θ(kn)'], answer: 0, explanation: 'TOP-K = 一次选择定位第 k 小的值 + 一遍线性扫描——两趟线性，无需全排序；排序把 k 个以外的元素也排好了，纯属多余。' },
}

const selectComplexity: ComplexityProfileData = {
  title: '顺序统计量：只回答一个排名，就不付全序的钱',
  subtitle: 'RANDOMIZED-SELECT 与快排共用分区，但每轮只递归一侧。',
  cases: [
    { label: '最好', complexity: 'Θ(n)', condition: '第一次分区的主元恰好是答案。', example: 'k 恰好 = 主元排名', explanation: 'n−1 次比较立即命中，一次分区收工。', tone: 'best' },
    { label: '平均（期望）', complexity: 'Θ(n)', condition: '随机主元：每轮期望丢掉约一半剩余区间。', example: 'n + n/2 + n/4 + … ≤ 2n', explanation: '几何级数收敛——期望线性，与输入分布无关。', tone: 'average' },
    { label: '最差', complexity: 'Θ(n²)', condition: '每次抽中最值，只丢 1 个。', example: '每轮 0|n−1 的链式分区', explanation: '(n−1)+(n−2)+…=Θ(n²)；概率随 n 缩小，固定输入无法稳定触发。', tone: 'worst' },
  ],
  footer: 'SELECT 期望 Θ(n) 击败"排序取第 k"的 Θ(n log n)——前提是你只要一个排名，不要全序。',
}

export function OrderStatisticsLesson() {
  const [exampleId, setExampleId] = useState(selectExamples[0].id)
  const example = selectExamples.find(item => item.id === exampleId) ?? selectExamples[0]
  const trace = buildSelectTrace(example)
  const playback = useLessonPlayback(trace.steps.length)
  return <LessonShell eyebrow={trace.eyebrow} title={trace.steps[playback.step].title} description={trace.description} steps={trace.steps.map(item => item.tab ?? '推演')} step={playback.step} onStepChange={playback.setStep} playing={playback.playing} onTogglePlaying={playback.togglePlaying} onReplay={playback.replay} speed={playback.speed} onCycleSpeed={playback.cycleSpeed} complexity={selectComplexity} examplePicker={<ExamplePicker examples={selectExamples} value={exampleId} onChange={id => { playback.reset(); setExampleId(id) }} />}>
    <TracePlayer trace={trace} step={playback.step} />
    <DesignNotes insight={selectInsight} />
  </LessonShell>
}
