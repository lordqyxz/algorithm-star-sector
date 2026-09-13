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

/** 演示数据与算法分离：本文件 = 数据集 + 随机化快排生成器（产出 Trace）+ 播放器装配。 */

/** mulberry32：固定种子的确定性 PRNG——StrictMode 双渲染、重播、换步都不改变抽签结果。 */
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
type RqsExample = ExampleOption & { values: number[]; seed: number }

const rqsExamples: readonly RqsExample[] = [
  { id: 'sorted', label: '已排序·确定性最坏', detail: '[1,2,3,4,5,6,7,8] · 末位主元最坏 28 次', values: [1, 2, 3, 4, 5, 6, 7, 8], seed: 9 },
  { id: 'reversed', label: '逆序·同样最坏', detail: '[8,7,6,5,4,3,2,1]', values: [8, 7, 6, 5, 4, 3, 2, 1], seed: 20 },
  { id: 'mixed', label: '课堂混合序列', detail: '[7,2,1,6,8,5,3,4]', values: [7, 2, 1, 6, 8, 5, 3, 4], seed: 11 },
  { id: 'duplicates', label: '重复键·查身份', detail: '[4,2,7,4,1,4,3] · 4A/4B/4C', values: [4, 2, 7, 4, 1, 4, 3], seed: 20 },
]

const rqsCode = [
  { code: 'QUICKSORT(A, p, r)', note: '对区间 [p..r] 排序（1 起下标）' },
  { code: '  if p < r' },
  { code: '    q = RANDOM(p, r)', note: '每个元素等概率 1/n 被抽中' },
  { code: '    exchange A[q] with A[r]', note: '抽中的主元先换到末位' },
  { code: '    x = A[r]; i = p - 1' },
  { code: '    for j = p to r - 1' },
  { code: '      if A[j] ≤ x', note: '移动依据：A[j] 是否不大于主元' },
  { code: '        i = i + 1; exchange A[i] with A[j]' },
  { code: '    exchange A[i+1] with A[r]', note: '主元落到左右区的分界' },
  { code: '    QUICKSORT(A, p, i); QUICKSORT(A, i+2, r)', note: '两侧分别递归' },
]

/** 纯函数预览：主元 x 会把 [p..r] 切成多大的两侧（≤ 的进左区）。 */
function partitionPreview(tokens: readonly Tok[], p: number, r: number): { left: number; right: number } {
  const x = tokens[r].value
  const left = tokens.slice(p, r).filter(token => token.value <= x).length
  return { left, right: r - p - left }
}

function* runRandomizedQuickSort(example: RqsExample): Generator<TraceEvent> {
  const tokens = tokenize(example.values)
  const n = tokens.length
  const work = tokens.slice()
  const rand = mulberry32(example.seed)
  const settled = new Array<boolean>(n).fill(false)
  const partitionLog: { size: number; comps: number }[] = []
  let compares = 0
  let swaps = 0
  const worst = (n * (n - 1)) / 2
  const hasDup = tokens.some(token => token.tag !== undefined)
  const metrics = (): MetricItem[] => [
    { label: '末位主元最坏对照', value: worst, tone: 'purple' },
    { label: '随机版累计比较', value: compares, tone: 'orange' },
    { label: '累计交换', value: swaps, tone: 'blue' },
  ]
  const cells = (focus: number, pivotIdx: number): SceneCell[] => work.map((token, index) => ({
    id: `t${token.seed}`,
    label: tokenLabel(token),
    tone: index === pivotIdx ? 'pivot' : index === focus ? 'focus' : settled[index] ? 'sorted' : 'default',
  }))
  const intervalCells = (): SceneCell[] => work.map((token, index) => ({ id: `t${token.seed}`, label: tokenLabel(token), tone: settled[index] ? 'sorted' : 'default' }))
  const pointOf = (pivotIdx: number, scan: number, boundary: number): PointerTag[] => {
    const tags: PointerTag[] = [{ index: pivotIdx, label: '主元', tone: 'orange' }]
    if (scan >= 0) tags.push({ index: scan, label: 'j 扫描', tone: 'blue' })
    if (boundary >= 0) tags.push({ index: boundary, label: 'i 左区边界', tone: 'purple' })
    return tags
  }

  yield { t: 'scene', scene: arrayScene('shelf', '随机化快速排序：A[1..n]', cells(-1, n - 1), { indexes: true, pointers: pointOf(n - 1, -1, -1) }) }
  yield { t: 'metrics', metrics: metrics() }
  yield { t: 'legend', legend: [{ tone: 'pivot', label: '主元' }, { tone: 'focus', label: '正在扫描' }, { tone: 'sorted', label: '位置已确定' }] }

  // ── 拍① 坏消息：末位主元遇上（逆）有序输入，每层切出 n−1 | 0 ──
  yield { t: 'message', step: {
    title: '坏消息：末位主元遇上排好序的输入',
    tab: '坏消息',
    formula: `T(n)=T(n-1)+O(n)`,
    equation: `1+2+\\cdots+${n - 1}=${worst}`,
    invariant: `主元取末位这条规则本身没有变——变的是输入，而规则对输入毫无防御。`,
    note: `已排序输入让末位主元永远是最大（或最小）值：每层分区切出 ${n - 1}|0，递归树退化成一条链。这不是倒霉，是确定性规则的必然。`,
    conclusion: '改成随机抽主元：让"切得多烂"由抽签决定，而不是由对手决定。',
    pseudocode: { lines: rqsCode, active: [0, 1] },
    prediction: {
      prompt: `随机化之后，这次运行还会退化成 ${worst} 次比较吗？`,
      options: ['一定还会：输入已经排好序', '不一定：除非每次抽主元都恰好抽中极值', '随机化能保证最坏也是 Θ(n log n)'],
      answer: 1,
      explanation: `最坏仍是 Θ(n²)，但触发它需要 n 次抽签全部最倒霉（概率约 (1/n)^n）；期望比较约 2n·ln n = Θ(n log n)。随机化改变的是"谁能稳定触发最坏"。`,
    },
  } }
  yield { t: 'step' }

  // ── 拍②③ 顶层：随机抽主元 + 逐拍真实执行 PARTITION ──
  for (let round = 0; ; round += 1) {
    // 找下一个未确定的区间 [p..r]
    let p = 0
    while (p < n && settled[p]) p += 1
    if (p >= n) break
    let r = p
    while (r + 1 < n && !settled[r + 1]) r += 1

    if (p === r) { settled[p] = true; continue }
    const size = r - p + 1

    // 抽主元：RANDOM(p, r)，与末位交换
    const q = p + Math.floor(rand() * (r - p + 1))
    const picked = work[q]
    if (q !== r) {
      const tail = work[r]
      work[q] = tail
      work[r] = picked
      swaps += 1
    }
    yield { t: 'cells', scene: 'shelf', cells: cells(q === r ? r : q, r) }
    yield { t: 'pointers', scene: 'shelf', pointers: pointOf(r, -1, -1) }
    yield { t: 'metrics', metrics: metrics() }
    const preview = partitionPreview(work, p, r)
    yield { t: 'message', step: {
      title: round === 0 ? `随机抽主元：A[${q + 1}]=${tokenLabel(picked)} 被抽中` : `递归抽主元 [${p + 1}..${r + 1}]：抽中 ${tokenLabel(picked)}`,
      tab: round === 0 ? '抽主元' : `抽主元 ${tokenLabel(picked)}`,
      formula: `q=\\text{RANDOM}(${p + 1},${r + 1})=${q + 1}\\Rightarrow\\text{主元 }x=${picked.value}`,
      moves: { kind: 'swap', title: `A[${q + 1}] 与 A[${r + 1}] 对换：主元就位末尾`, moves: [{ token: tokenLabel(picked), from: `第 ${q + 1} 格`, to: `第 ${r + 1} 格` }, { token: tokenLabel(work[q]), from: `第 ${r + 1} 格`, to: `第 ${q + 1} 格` }], verdict: `每个元素等概率 1/${size} 被抽中` },
      invariant: '抽签只决定"谁当主元"，数组内容在对换后不变——PARTITION 还没开始。',
      note: round === 0 ? '随机化把主元选择权交给抽签：没有哪个固定输入能预判结果。' : '每个递归区间都重新抽签——每层独立、等概率。',
      conclusion: round === 0 ? `先预测：主元 ${picked.value} 会把 ${size} 个元素切成怎样的两侧？` : '接下来执行 PARTITION。',
      pseudocode: { lines: rqsCode, active: [2, 3] },
      prediction: round === 0 ? {
        prompt: `主元 ${picked.value} 会把区间切成 左|右 各多少个？（≤ 主元进左区）`,
        options: [`左 ${preview.left} 个 / 右 ${preview.right} 个`, `左 ${preview.right} 个 / 右 ${preview.left} 个`, '无法预测：主元是随机的'],
        answer: 0,
        explanation: `主元虽随机，但抽中之后分区结果完全确定：数一数 ≤ ${picked.value} 的有 ${preview.left} 个。随机的只是"切哪里"，不是"怎么切"。`,
      } : undefined,
    } }
    yield { t: 'step' }

    // PARTITION：逐拍比较 + 交换（顶层逐拍展示，深层压缩为小结）
    const x = work[r].value
    let i = p - 1
    let compsThis = 0
    const detailed = round === 0
    for (let j = p; j < r; j += 1) {
      compares += 1
      compsThis += 1
      const scanned = work[j]
      const goLeft = scanned.value <= x
      let swappedWith = -1
      if (goLeft) {
        i += 1
        if (i !== j) {
          const moved = work[i]
          work[i] = scanned
          work[j] = moved
          swaps += 1
          swappedWith = i
        }
      }
      if (detailed) {
        yield { t: 'cells', scene: 'shelf', cells: cells(j, r) }
        yield { t: 'pointers', scene: 'shelf', pointers: pointOf(r, j, Math.max(i, p - 1)) }
        yield { t: 'metrics', metrics: metrics() }
        const swapMoves = swappedWith >= 0 ? {
          moves: { kind: 'swap' as const, title: `${tokenLabel(scanned)} 进左区，${tokenLabel(work[swappedWith])} 让位`, moves: [{ token: tokenLabel(scanned), from: `第 ${j + 1} 格`, to: `第 ${i + 1} 格` }, { token: tokenLabel(work[swappedWith]), from: `第 ${i + 1} 格`, to: `第 ${j + 1} 格` }], verdict: `${tokenLabel(scanned)} ≤ 主元 ${x}，并入左区（i 右移一格）` },
        } : {}
        yield { t: 'message', step: {
          title: `比较 A[${j + 1}]=${tokenLabel(scanned)} 与主元 ${x}：${goLeft ? '进左区' : '留在右区'}`,
          tab: `扫描 ${tokenLabel(scanned)}`,
          formula: goLeft ? `A[${j + 1}]=${scanned.value}\\le x=${x}\\Rightarrow\\text{左区扩张}` : `A[${j + 1}]=${scanned.value}>x=${x}\\Rightarrow\\text{原地不动}`,
          ...swapMoves,
          judge: { entries: [{ left: tokenLabel(scanned), op: '≤', right: `主元 ${x}`, holds: goLeft, action: goLeft ? `i 右移，${swappedWith >= 0 ? `与 A[${i + 1}] 交换` : '本就紧邻边界，无需交换'}` : '留在右区，i 不动' }] },
          invariant: `扫描过的元素都已在正确的一侧；左区 [${p + 1}..${i + 1}] 内全部 ≤ ${x}。`,
          note: '每个元素只和主元比一次——分区一轮的成本正好是区间长减一。',
          conclusion: `继续扫描 A[${j + 2}]。`,
          pseudocode: { lines: rqsCode, active: [5, 6, 7] },
        } }
        yield { t: 'step' }
      }
    }
    // 主元归位
    const pivotFinal = i + 1
    let settleSwapped = false
    if (pivotFinal !== r) {
      const tail = work[r]
      work[r] = work[pivotFinal]
      work[pivotFinal] = tail
      swaps += 1
      settleSwapped = true
    }
    settled[pivotFinal] = true
    const leftSize = pivotFinal - p
    const rightSize = r - pivotFinal
    const regions: RegionLabel[] = []
    if (leftSize > 0) regions.push({ from: p, to: pivotFinal - 1, label: `左区 ≤ ${x} · ${leftSize} 个`, tone: 'blue' })
    regions.push({ from: pivotFinal, to: pivotFinal, label: `主元 ${x} 归位`, tone: 'orange' })
    if (rightSize > 0) regions.push({ from: pivotFinal + 1, to: r, label: `右区 > ${x} · ${rightSize} 个`, tone: 'yellow' })
    partitionLog.push({ size, comps: compsThis })
    yield { t: 'cells', scene: 'shelf', cells: cells(-1, pivotFinal) }
    yield { t: 'pointers', scene: 'shelf', pointers: pointOf(pivotFinal, -1, -1) }
    yield { t: 'regions', scene: 'shelf', regions }
    yield { t: 'metrics', metrics: metrics() }
    yield { t: 'message', step: {
      title: `主元 ${x} 归位：${leftSize} | 1 | ${rightSize}`,
      tab: `归位 ${x}`,
      formula: `${leftSize}\\mid 1\\mid ${rightSize}\\Rightarrow T(${size})=T(${leftSize})+T(${rightSize})+O(${size})`,
      moves: settleSwapped ? { kind: 'swap', title: `主元 ${x} 与 A[${pivotFinal + 1}] 对换，落到分界`, moves: [{ token: String(x), from: `第 ${r + 1} 格`, to: `第 ${pivotFinal + 1} 格` }, { token: tokenLabel(work[r]), from: `第 ${pivotFinal + 1} 格`, to: `第 ${r + 1} 格` }], verdict: '主元左侧全部 ≤ 它，右侧全部 > 它——这个位置就是最终位置' } : undefined,
      judge: { entries: [{ left: `本轮 ${compsThis} 次比较`, op: '→', right: `左 ${leftSize} / 右 ${rightSize}`, holds: true, action: `主元 ${x} 的最终位置确定` }] },
      invariant: `主元 ${x} 的位置永远不再改变；两侧内部尚未有序，但相对主元的关系已定。`,
      note: detailed ? '递归只发生在两侧区间内——公式里的 T(左)、T(右) 就是接下来要抽签的区间。' : '本轮压缩展示：比较在后台逐个真实执行，计数已累计。',
      conclusion: leftSize > 1 || rightSize > 1 ? '对剩余区间继续：抽主元 → 分区。' : '剩余区间长度 ≤ 1，天然有序。',
      pseudocode: { lines: rqsCode, active: [7, 8] },
    } }
    yield { t: 'step' }
  }

  // ── 拍④ 递归收敛：区间长度逐层下降，比较计数随之下降 ──
  yield { t: 'scene', scene: { kind: 'bars', id: 'converge', label: '每轮分区的比较次数（柱下数字 = 该轮区间长度）', unit: '比较次数', bars: partitionLog.map((item, index) => ({ id: `p${index}`, display: `${item.size}`, value: item.comps, caption: `${item.comps} 次`, tone: index === 0 ? 'pivot' : 'default' })) } }
  yield { t: 'cells', scene: 'shelf', cells: intervalCells() }
  yield { t: 'pointers', scene: 'shelf', pointers: [] }
  yield { t: 'regions', scene: 'shelf', regions: [] }
  yield { t: 'metrics', metrics: metrics() }
  yield { t: 'message', step: {
    title: `递归收敛：${partitionLog.length} 次分区，区间长度逐层下降`,
    tab: '递归收敛',
    formula: `\\text{区间长度：}${partitionLog.map(item => item.size).join('\\to ')}`,
    equation: `${partitionLog.map(item => item.comps).join('+')}=${compares}`,
    invariant: `每次分区都让至少一个元素归位——区间长度严格下降，递归必然终止。`,
    note: `柱高 = 该轮分区的比较次数（区间长 − 1）。均衡时区间对数下降、树高约 log₂n；一旦某轮切出 0|${n - 1}，才会滑向最坏的 ${worst} 次。`,
    conclusion: '把本次的计数与最坏对照放到一起看。',
    pseudocode: { lines: rqsCode, active: [9] },
  } }
  yield { t: 'step' }

  // ── 拍⑤ 期望分析 + 稳定性证据 ──
  const dupTokens = tokens.filter(token => token.tag !== undefined)
  const beforeOrder = dupTokens.map(tokenLabel)
  const afterOrder = work.filter(token => token.tag !== undefined).map(tokenLabel)
  const identityPreserved = beforeOrder.join(',') === afterOrder.join(',')
  yield { t: 'metrics', metrics: metrics() }
  yield { t: 'message', step: {
    title: `期望分析：本次 ${compares} 次 vs 最坏 ${worst} 次`,
    tab: '期望分析',
    formula: `\\text{本次 }${compares}\\text{ 次}\\;vs\\;\\text{最坏 }${worst}\\text{ 次}`,
    equation: `E[C]\\approx 2n\\ln n\\;(\\text{n=8 理论期望约 }17)`,
    invariant: '算法一行未改：随机化没有消除最坏情况，只是让它不再听命于输入。',
    note: `n=8 时差距还不明显；n=1000：期望 ≈ 2n·ln n ≈ 13800 次，最坏 ≈ n(n−1)/2 ≈ 499500 次——相差约 36 倍，n 越大差距越爆炸。`,
    conclusion: '期望 Θ(n log n)；最坏仍是 Θ(n²)，但那需要每次抽签都最倒霉——小概率事件，且与输入无关。',
    pseudocode: { lines: rqsCode, active: [] },
    stability: hasDup ? {
      title: '稳定性检查：4A/4B/4C 的身份',
      statement: '分区的交换不回头看相等键：本次运行身份顺序' + (identityPreserved ? '恰好保持，但快排不承诺这一点' : '被交换打乱——快排不稳定'),
      before: beforeOrder,
      after: afterOrder,
      stable: identityPreserved,
      note: '无论本次是否保序，换一个种子就可能换位——稳定性要看"是否总是保序"。',
    } : undefined,
    prediction: {
      prompt: 'n=1000 时，期望比较与最坏比较大约差多少倍？',
      options: ['约 4 倍', '约 36 倍', '差不多，都是线性'],
      answer: 1,
      explanation: '期望 ≈ 2n·ln n ≈ 13800，最坏 ≈ n(n−1)/2 ≈ 499500：对数因子与线性因子的差距随 n 持续放大——这正是随机化要保住的东西。',
    },
  } }
  yield { t: 'step' }
}

const buildRqsTrace = (example: RqsExample): Trace => recordTrace('SANDBOX 10 · RANDOMIZED QUICKSORT', '末位主元遇上已排序输入会退化成 Θ(n²)；随机抽主元把"最坏输入"变成"小概率事件"——同一套 PARTITION，换一种抽签方式。', runRandomizedQuickSort(example))

const rqsInsight: DesignInsight = {
  observation: '随机化的全部作用，是把"最坏情况由输入决定"改成"最坏情况由随机数决定"——固定输入（例如已排序数组）再也无法稳定打出 Θ(n²)，因为那需要每一次抽签都抽中极值。',
  contrasts: [
    { alternative: '三数取中（固定规则选主元）', whyNot: '对常见数据更稳，但规则是公开的：存在专门构造的"中介人序列"能让它每次都切出 0|n−1，仍可被打到 Θ(n²)。' },
    { alternative: '中位数的中位数（BFPRT 确定性主元）', whyNot: '保证最坏 Θ(n log n)，但每层要多花 O(n) 挑主元，常数明显更大——用确定性换掉概率，排序场景里很少值得。' },
  ],
  transfer: { prompt: '如果对手提前知道你的随机数种子，随机化快排还安全吗？', options: ['不安全：对手能构造让每次抽签都抽中极值的输入', '安全：随机化与种子无关', '只对已排序输入安全'], answer: 0, explanation: '随机化的安全性建立在"对手无法预测随机数"上；种子一旦泄露，随机化退化成确定性算法——这也是安全场景必须用密码学安全随机数的原因。' },
}

const rqsComplexity: ComplexityProfileData = {
  title: '随机化快速排序：期望与最坏由"谁"决定',
  subtitle: '分区每层 Θ(n)；随机抽主元让期望脱离输入分布，最坏只剩小概率。',
  cases: [
    { label: '最好', complexity: 'Θ(n log n)', condition: '每次主元接近中位数，左右均衡。', example: '[7,2,1,6,8,5,3,4] + 均衡抽签', explanation: '递归树高约 log₂n，每层合计扫描 n 个元素。', tone: 'best' },
    { label: '平均（期望）', complexity: 'Θ(n log n)', condition: '任意输入 + 随机主元：期望比较 ≈ 2n·ln n。', example: 'n=8：期望约 17 次（本次实跑 22 次）', explanation: '极端不平衡被多数均衡分区抵消；期望与输入是否有序无关。', tone: 'average' },
    { label: '最差', complexity: 'Θ(n²)', condition: '每次抽签都抽中最值，切成 0|n−1。', example: '[1,2,3,4,5,6,7,8] + 连续倒霉抽签', explanation: 'n+(n−1)+…+1；概率约 (1/n)^n，随 n 指数缩小——固定输入无法稳定触发。', tone: 'worst' },
  ],
  footer: '随机化不改变最坏情况的上界，改变的是"谁能触发它"。',
  stability: { status: 'unstable', label: '不稳定排序', statement: '分区交换可能让相等键跨过彼此；重复键数据集里 4A、4B、4C 的最终顺序由抽签与交换共同决定。', before: '4A → 4B', after: '4B → 4A' },
}

export function RandomizedQuickSortLesson() {
  const [exampleId, setExampleId] = useState(rqsExamples[0].id)
  const example = rqsExamples.find(item => item.id === exampleId) ?? rqsExamples[0]
  const trace = buildRqsTrace(example)
  const playback = useLessonPlayback(trace.steps.length)
  return <LessonShell eyebrow={trace.eyebrow} title={trace.steps[playback.step].title} description={trace.description} steps={trace.steps.map(item => item.tab ?? '推演')} step={playback.step} onStepChange={playback.setStep} playing={playback.playing} onTogglePlaying={playback.togglePlaying} onReplay={playback.replay} speed={playback.speed} onCycleSpeed={playback.cycleSpeed} complexity={rqsComplexity} examplePicker={<ExamplePicker examples={rqsExamples} value={exampleId} onChange={id => { playback.reset(); setExampleId(id) }} />}>
    <TracePlayer trace={trace} step={playback.step} />
    <DesignNotes insight={rqsInsight} />
  </LessonShell>
}
