import { useState } from 'react'
import { DesignNotes, type DesignInsight } from '@/components/DesignNotes'
import { ExamplePicker, type ExampleOption } from '@/components/ExamplePicker'
import { LessonShell } from '@/components/LessonShell'
import type { ComplexityProfileData } from '@/components/ComplexityProfile'
import type { MetricItem } from '@/components/CalcDesk'
import { TracePlayer } from '@/engine/TracePlayer'
import { arrayScene, recordTrace, tokenLabel, tokenize, type TraceEvent } from '@/engine/events'
import type { PointerTag, RegionLabel, SceneCell, Tone, Trace } from '@/engine/trace'
import { useLessonPlayback } from '@/hooks/useLessonPlayback'

/** 演示数据与算法分离：本文件 = 数据集 + 末位主元快速排序生成器（产出 Trace）+ 播放器装配。 */

type Tok = { value: number; tag?: string; seed: number }
type QuickExample = ExampleOption & { values: number[] }

const quickExamples: readonly QuickExample[] = [
  { id: 'mixed', label: '课堂混合序列', detail: '[7,2,1,6,8,5,3,4]', values: [7, 2, 1, 6, 8, 5, 3, 4] },
  { id: 'sorted', label: '已排序·坏主元', detail: '[1,2,3,4,5,6,7,8]', values: [1, 2, 3, 4, 5, 6, 7, 8] },
  { id: 'reverse', label: '逆序·坏主元', detail: '[8,7,6,5,4,3,2,1]', values: [8, 7, 6, 5, 4, 3, 2, 1] },
  { id: 'duplicates', label: '重复键·查身份', detail: '[4,2,7,4,1,4,3]', values: [4, 2, 7, 4, 1, 4, 3] },
]

const partitionCode = [
  { code: 'x = A[r]', note: '取最后一个元素作为主元' },
  { code: 'i = p - 1' },
  { code: 'for j = p to r - 1' },
  { code: '  if A[j] ≤ x', note: '移动依据：A[j] 是否不大于主元' },
  { code: '    i = i + 1' },
  { code: '    exchange A[i] with A[j]' },
  { code: 'exchange A[i+1] with A[r]', note: '主元落到左右区的分界' },
]

/** 纯函数预览：末位主元分区后的确定结果（供 prediction；主扫描逐拍真实执行同一算法）。 */
function partitionPreview(tokens: readonly Tok[]): { array: Tok[]; pivotIndex: number } {
  const array = tokens.slice()
  const pivotValue = array[array.length - 1].value
  let boundary = 0
  for (let scan = 0; scan < array.length - 1; scan += 1) {
    if (array[scan].value <= pivotValue) {
      ;[array[boundary], array[scan]] = [array[scan], array[boundary]]
      boundary += 1
    }
  }
  ;[array[boundary], array[array.length - 1]] = [array[array.length - 1], array[boundary]]
  return { array, pivotIndex: boundary }
}

function* runQuickSort(values: readonly number[]): Generator<TraceEvent> {
  const tokens = tokenize(values)
  const n = tokens.length
  const work = tokens.slice()
  const settled = new Array<boolean>(n).fill(false)
  const preview = partitionPreview(work)
  const pvTok = work[n - 1]
  const pv = pvTok.value
  let totalCompares = 0
  let totalSwaps = 0
  let roundCompares = 0

  const metrics = (scanSize: number, pivotPos: string, pivotTone: 'blue' | 'green', partitionCompares: number): MetricItem[] => [
    { label: '本轮扫描元素', value: scanSize },
    { label: '主元位置', value: pivotPos, tone: pivotTone },
    { label: '分区比较次数', value: partitionCompares, tone: 'orange' },
    { label: '累计比较', value: totalCompares, tone: 'orange' },
    { label: '累计交换', value: totalSwaps, tone: 'blue' },
  ]
  const cells = (marks: Record<number, Tone>): SceneCell[] => work.map((token, index) => ({
    id: `t${token.seed}`,
    label: tokenLabel(token),
    tone: marks[index] ?? (settled[index] ? 'sorted' : 'default'),
  }))
  const pointOf = (pivotIdx: number, scan: number, boundary: number): PointerTag[] => {
    const tags: PointerTag[] = [{ index: pivotIdx, label: '主元', tone: 'orange' }]
    if (scan >= 0) tags.push({ index: scan, label: '扫描', tone: 'blue' })
    if (boundary >= 0) tags.push({ index: boundary, label: 'i 左区边界', tone: 'purple' })
    return tags
  }
  const group = (items: readonly Tok[]) => `[${items.map(tokenLabel).join(', ')}]`
  const sceneLabel = '快速排序数组：对象保留身份'
  const quickStability = { statement: '分区交换可能改变相等键顺序；重复键数据集里可以直接看到 4A、4B 是否换位。', before: ['4A', '4B'], after: ['4B', '4A'], stable: false }

  // ── 拍① 选主元（原拍保留）──
  const leftPreview = preview.array.slice(0, preview.pivotIndex)
  const rightPreview = preview.array.slice(preview.pivotIndex + 1)
  yield { t: 'scene', scene: arrayScene('shelf', sceneLabel, cells({ [n - 1]: 'pivot' }), { indexes: true, pointers: pointOf(n - 1, 0, -1) }) }
  yield { t: 'metrics', metrics: metrics(n, '待定', 'blue', 0) }
  yield { t: 'legend', legend: [{ tone: 'pivot', label: '主元' }, { tone: 'focus', label: '扫描中' }, { tone: 'key', label: '左区边界' }, { tone: 'sorted', label: '位置已确定' }] }
  yield { t: 'message', step: {
    title: '先选主元：把“全部比较”变成一次扫描',
    tab: '选主元',
    formula: `\\text{主元 }p=${pv}\\text{，扫描其余 }${n - 1}\\text{ 个元素}`,
    equation: 'T(n)=T(k)+T(n-k-1)+O(n)',
    invariant: `主元 ${pv} 尚未移动，整组数字还在原位。`,
    note: '主元会把数组分成“小于 p”和“大于 p”两侧；本轮扫描成本是线性的。',
    conclusion: `下一步逐个判断：谁应该留在 ${pv} 的左边？`,
    pseudocode: { lines: partitionCode, active: [0] },
    prediction: {
      prompt: `以 ${pv} 为主元时，哪些数字应该进入左分区？`,
      options: [leftPreview.length ? leftPreview.map(tokenLabel).join('、') : '没有数字', rightPreview.length ? rightPreview.map(tokenLabel).join('、') : '没有数字', '全部数字都要交换'],
      answer: 0,
      explanation: `分区会把不大于 ${pv} 的元素放入左侧，其余元素留在右侧；主元最后落在两者之间。`,
    },
  } }
  yield { t: 'step' }

  // ── 分区扫描：逐拍真实执行，每拍一次比较（可能伴随一次交换）──
  let boundary = -1
  for (let scan = 0; scan < n - 1; scan += 1) {
    totalCompares += 1
    roundCompares += 1
    const scanned = work[scan]
    const goLeft = scanned.value <= pv
    let displaced: Tok | null = null
    if (goLeft) {
      boundary += 1
      if (boundary !== scan) {
        displaced = work[boundary]
        work[boundary] = scanned
        work[scan] = displaced
        totalSwaps += 1
      }
    }
    const marks: Record<number, Tone> = { [n - 1]: 'pivot', [scan]: 'focus' }
    const regions: RegionLabel[] = []
    if (boundary >= 0) regions.push({ from: 0, to: boundary, label: `左区 ≤ ${pv} · ${boundary + 1} 个`, tone: 'blue' })
    regions.push({ from: n - 1, to: n - 1, label: '主元', tone: 'orange' })
    yield { t: 'scene', scene: arrayScene('shelf', sceneLabel, cells(marks), { indexes: true, pointers: pointOf(n - 1, scan, boundary), regions }) }
    yield { t: 'metrics', metrics: metrics(n, '待定', 'blue', roundCompares) }
    yield { t: 'message', step: {
      title: `扫描 A[${scan + 1}]=${tokenLabel(scanned)}：${goLeft ? '进左区' : '留在右区'}`,
      tab: `扫描 ${tokenLabel(scanned)}`,
      formula: goLeft
        ? `A[${scan + 1}]=${scanned.value}\\le x=${pv}\\Rightarrow\\text{左区扩张}`
        : `A[${scan + 1}]=${scanned.value}>x=${pv}\\Rightarrow\\text{原地不动}`,
      ...(displaced ? {
        moves: { kind: 'swap' as const, title: `${tokenLabel(scanned)} 进左区，${tokenLabel(displaced)} 让位`, moves: [{ token: tokenLabel(scanned), from: `第 ${scan + 1} 格`, to: `第 ${boundary + 1} 格` }, { token: tokenLabel(displaced), from: `第 ${boundary + 1} 格`, to: `第 ${scan + 1} 格` }], verdict: `${tokenLabel(scanned)} ≤ 主元 ${pv}，并入左区（i 右移一格）` },
      } : {}),
      judge: { entries: [{ left: tokenLabel(scanned), op: goLeft ? '≤' : '>', right: `主元 ${pv}`, holds: goLeft, action: goLeft ? (displaced ? `i 右移，与 A[${boundary + 1}] 交换` : 'i 右移，本就紧邻边界，无需交换') : '留在右区，i 不动' }] },
      invariant: boundary >= 0 ? `扫描过的元素都已在正确的一侧；左区 [1..${boundary + 1}] 内全部 ≤ ${pv}。` : '扫描过的元素都已在正确的一侧；左区还没有元素。',
      note: '每个元素只和主元比一次——分区一轮的成本正好是区间长减一。',
      conclusion: scan < n - 2 ? `继续扫描 A[${scan + 2}]。` : '扫描完成：主元准备归位。',
      pseudocode: { lines: partitionCode, active: goLeft ? [2, 3, 4, 5] : [2, 3] },
    } }
    yield { t: 'step' }
  }

  // ── 分区完成（原拍保留）──
  const leftCount = boundary + 1
  const rightCount = n - 1 - leftCount
  const leftTokens = work.slice(0, leftCount)
  const rightTokens = work.slice(leftCount, n - 1)
  yield { t: 'scene', scene: arrayScene('shelf', sceneLabel, cells({ [n - 1]: 'pivot' }), { indexes: true, pointers: pointOf(n - 1, -1, boundary), regions: [
    ...(leftCount > 0 ? [{ from: 0, to: boundary, label: `左区 ≤ ${pv} · ${leftCount} 个`, tone: 'blue' as const }] : []),
    { from: n - 1, to: n - 1, label: '主元', tone: 'orange' as const },
  ] }) }
  yield { t: 'metrics', metrics: metrics(n, '待定', 'blue', roundCompares) }
  yield { t: 'message', step: {
    title: '分区扫描：小的放左边，大的放右边',
    tab: '分区',
    formula: `\\left\\{${leftTokens.length ? leftTokens.map(tokenLabel).join(',') : '\\varnothing'}\\right\\} < ${pv} < \\left\\{${rightTokens.length ? rightTokens.map(tokenLabel).join(',') : '\\varnothing'}\\right\\}`,
    equation: `L=\\{${leftTokens.map(tokenLabel).join(',')}\\};\\quad R=\\{${rightTokens.map(tokenLabel).join(',')}\\}`,
    invariant: '扫描过的每个元素都已经被放到正确的一侧；分区只看相对主元的大小。',
    note: '分区只决定相对主元的位置，不要求左右内部已经有序；相等键也可能被交换跨过。',
    conclusion: `分区完成后，主元 ${pv} 的最终位置已经确定。`,
    moves: { kind: 'one-way', title: '分区：数字沿主元两侧流向正确区间', moves: [{ token: group(leftTokens), to: '左区 ≤ p' }, { token: `p=${pv}`, to: '固定位置' }, { token: group(rightTokens), to: '右区 > p' }], note: '箭头表示“放到主元哪一侧”；这一步只分区，不要求左右内部已经有序。' },
    judge: { title: '分区判断：每个元素只和主元比一次', entries: [
      ...(leftTokens.length > 0 ? [{ left: tokenLabel(leftTokens[0]), op: '≤', right: String(pv), holds: true, action: `${tokenLabel(leftTokens[0])} 进左区` }] : []),
      ...(rightTokens.length > 0 ? [{ left: tokenLabel(rightTokens[0]), op: '>', right: String(pv), holds: false, action: `${tokenLabel(rightTokens[0])} 留右区` }] : []),
    ], note: `本轮共 ${roundCompares} 次比较，全部来自“与主元比大小”，元素之间互不比较。` },
    stability: quickStability,
    pseudocode: { lines: partitionCode, active: [2, 3] },
  } }
  yield { t: 'step' }

  // ── 主元归位（原拍保留）：真实的落位交换 ──
  const pivotPos = boundary + 1
  let settleDisplaced: Tok | null = null
  if (pivotPos !== n - 1) {
    settleDisplaced = work[pivotPos]
    work[pivotPos] = pvTok
    work[n - 1] = settleDisplaced
    totalSwaps += 1
  }
  settled[pivotPos] = true
  yield { t: 'scene', scene: arrayScene('shelf', sceneLabel, cells({ [pivotPos]: 'pivot' }), { indexes: true, pointers: pointOf(pivotPos, -1, -1), regions: [
    ...(leftCount > 0 ? [{ from: 0, to: pivotPos - 1, label: `左区 ≤ ${pv} · ${leftCount} 个`, tone: 'blue' as const }] : []),
    { from: pivotPos, to: pivotPos, label: `主元 ${pv} 归位`, tone: 'orange' as const },
    ...(rightCount > 0 ? [{ from: pivotPos + 1, to: n - 1, label: `右区 > ${pv} · ${rightCount} 个`, tone: 'yellow' as const }] : []),
  ] }) }
  yield { t: 'metrics', metrics: metrics(n, `第 ${pivotPos + 1} 位`, 'green', roundCompares) }
  yield { t: 'message', step: {
    title: '主元归位：递归规模真的变小了',
    tab: '主元归位',
    formula: `${pv}\\text{ 左边 }${leftCount}\\text{ 个，右边 }${rightCount}\\text{ 个：}${leftCount}\\mid 1\\mid ${rightCount}`,
    equation: `T(${n})=T(${leftCount})+T(${rightCount})+O(${n})`,
    invariant: `主元 ${pv} 所在位置就是它在最终答案里的位置。`,
    note: '主元不再参与递归；问题被拆成两个更小的子数组。',
    conclusion: '接下来只对左区间和右区间重复同一套分区动作。',
    ...(settleDisplaced ? { moves: { kind: 'swap' as const, title: `主元 ${pv} 与 A[${pivotPos + 1}] 对换，落到分界`, moves: [{ token: tokenLabel(pvTok), from: `第 ${n} 格`, to: `第 ${pivotPos + 1} 格` }, { token: tokenLabel(settleDisplaced), from: `第 ${pivotPos + 1} 格`, to: `第 ${n} 格` }], verdict: '主元左侧全部 ≤ 它，右侧全部 > 它——这个位置就是最终位置' } } : {}),
    stability: quickStability,
    pseudocode: { lines: partitionCode, active: [6] },
  } }
  yield { t: 'step' }

  // ── 递归分区：深层压缩为小结，比较与交换在后台逐个真实执行 ──
  function* sortRange(lo: number, hi: number): Generator<TraceEvent> {
    if (lo >= hi) {
      if (lo === hi) settled[lo] = true
      return
    }
    const size = hi - lo + 1
    const xTok = work[hi]
    const x = xTok.value
    const comparesBefore = totalCompares
    let b = lo - 1
    for (let s = lo; s < hi; s += 1) {
      totalCompares += 1
      if (work[s].value <= x) {
        b += 1
        if (b !== s) {
          const d = work[b]
          work[b] = work[s]
          work[s] = d
          totalSwaps += 1
        }
      }
    }
    const pos = b + 1
    let settleDisplacedLocal: Tok | null = null
    if (pos !== hi) {
      settleDisplacedLocal = work[pos]
      work[pos] = xTok
      work[hi] = settleDisplacedLocal
      totalSwaps += 1
    }
    settled[pos] = true
    const leftN = pos - lo
    const rightN = hi - pos
    yield { t: 'scene', scene: arrayScene('shelf', sceneLabel, cells({ [pos]: 'pivot' }), { indexes: true, pointers: pointOf(pos, -1, -1), regions: [
      ...(leftN > 0 ? [{ from: lo, to: pos - 1, label: `左区 ≤ ${x} · ${leftN} 个`, tone: 'blue' as const }] : []),
      { from: pos, to: pos, label: `主元 ${x} 归位`, tone: 'orange' as const },
      ...(rightN > 0 ? [{ from: pos + 1, to: hi, label: `右区 > ${x} · ${rightN} 个`, tone: 'yellow' as const }] : []),
    ] }) }
    yield { t: 'metrics', metrics: metrics(size, `第 ${pos + 1} 位`, 'green', hi - lo) }
    yield { t: 'message', step: {
      title: `递归分区 [${lo + 1}..${hi + 1}]：主元 ${x} 归位`,
      tab: `递归 ${size}`,
      formula: `${leftN}\\mid 1\\mid ${rightN}\\Rightarrow T(${size})=T(${leftN})+T(${rightN})+O(${size})`,
      ...(settleDisplacedLocal ? { moves: { kind: 'swap' as const, title: `主元 ${x} 与 A[${pos + 1}] 对换，落到分界`, moves: [{ token: tokenLabel(xTok), from: `第 ${hi + 1} 格`, to: `第 ${pos + 1} 格` }, { token: tokenLabel(settleDisplacedLocal), from: `第 ${pos + 1} 格`, to: `第 ${hi + 1} 格` }], verdict: '主元左侧全部 ≤ 它，右侧全部 > 它——这个位置就是最终位置' } } : {}),
      judge: { entries: [{ left: `本轮 ${hi - lo} 次比较`, op: '→', right: `左 ${leftN} / 右 ${rightN}`, holds: true, action: `主元 ${x} 的最终位置确定` }] },
      invariant: '每次主元归位都会留下一个已确定的位置；基例是长度 0 或 1 的区间。',
      note: `本轮压缩展示：${totalCompares - comparesBefore} 次比较在后台逐个真实执行，计数已累计。`,
      conclusion: leftN > 1 || rightN > 1 ? '对剩余区间继续分区。' : '剩余区间长度 ≤ 1，天然有序。',
      stability: quickStability,
      pseudocode: { lines: partitionCode, active: [6] },
    } }
    yield { t: 'step' }
    yield* sortRange(lo, pos - 1)
    yield* sortRange(pos + 1, hi)
  }
  yield* sortRange(0, pivotPos - 1)
  yield* sortRange(pivotPos + 1, n - 1)

  // ── 继续递归（原拍保留）：递归已在真实执行中收敛 ──
  yield { t: 'scene', scene: arrayScene('shelf', sceneLabel, cells({ [pivotPos]: 'pivot' }), { indexes: true, pointers: pointOf(pivotPos, -1, -1) }) }
  yield { t: 'metrics', metrics: metrics(n, `第 ${pivotPos + 1} 位`, 'green', roundCompares) }
  yield { t: 'message', step: {
    title: '继续递归：两个子问题分别收敛',
    tab: '继续递归',
    formula: String.raw`\text{左右区间继续分区，直到长度 }\le 1`,
    equation: `T(${leftCount})+T(${rightCount})\\to\\text{更小的子问题}`,
    invariant: '每次主元归位都会留下一个已确定的位置；基例是长度 0 或 1 的区间。',
    note: '每次主元归位都会留下一个已确定的位置；基例是长度 0 或 1 的区间。',
    conclusion: '如果分区比较均衡，递归树高度约为 log₂n。',
    stability: quickStability,
    pseudocode: { lines: partitionCode, active: [] },
  } }
  yield { t: 'step' }

  // ── 末拍 复杂度（原拍保留）──
  yield { t: 'scene', scene: arrayScene('shelf', sceneLabel, cells({ [pivotPos]: 'pivot' }), { indexes: true, pointers: pointOf(pivotPos, -1, -1) }) }
  yield { t: 'metrics', metrics: metrics(n, `第 ${pivotPos + 1} 位`, 'green', roundCompares) }
  yield { t: 'message', step: {
    title: '复杂度取决于分区形状',
    tab: '复杂度',
    formula: `\\text{当前分区：}${leftCount}\\mid 1\\mid ${rightCount}\\ ;\\quad \\Theta(n\\log n)\\text{ 或 }\\Theta(n^2)`,
    equation: `${leftCount}\\mid 1\\mid ${rightCount}\\to\\text{每层扫描 }O(${n})`,
    invariant: '每一层递归都要扫描自己的区间一次，合计仍是线性的。',
    note: '每层都要扫描 n 个元素，但树高由主元把数组切得是否均衡决定。',
    conclusion: '快速排序快不快，不只看“分区”两个字，还要看主元让递归树长什么样。',
    pseudocode: { lines: partitionCode, active: [] },
    prediction: {
      prompt: '如果主元每次都把数组切成 0 和 n−1，两边的递归树会怎样？',
      options: ['高度约 log₂n', '退化成一条链，高度约 n', '不会再递归'],
      answer: 1,
      explanation: '每层仍扫描近 n 个元素，但只减少一个元素，求和变成 n+(n−1)+…=Θ(n²)。',
    },
  } }
  yield { t: 'step' }
}

const buildQuickSortTrace = (example: QuickExample): Trace => recordTrace('SANDBOX 03 · QUICK SORT', '主元把一次线性扫描变成两个递归子问题；真正决定复杂度的是分区是否均衡，同值元素的身份也会被检查。', runQuickSort(example.values))

const quickSortInsight: DesignInsight = {
  observation: '分区只需要一次线性扫描，就能让一个元素（主元）落到它的最终位置——“排序全部”被化归为“确定一个 + 排左右两半”。',
  contrasts: [
    { alternative: '归并排序（先递归后合并）', whyNot: '归并的合并需要 O(n) 辅助数组；快排用原地交换省掉它，代价是相等键可能被交换跨过（不稳定）。' },
    { alternative: '固定取末尾做主元', whyNot: '已排序输入会让分区每次切成 0 和 n−1，退化成 Θ(n²)；随机化主元用小成本把最坏情况变成小概率事件。' },
  ],
  transfer: { prompt: '快排和归并都把问题分成两半，线性工作量的花法有什么本质不同？', options: ['快排花在递归前的"分"（分区），归并花在递归后的"合"（合并）', '快排不需要做任何工作', '归并不需要比较'], answer: 0, explanation: '两者都是 Θ(n log n)，但线性成本的位置不同：分区在递归前、合并在递归后——这决定了空间、稳定性与缓存表现的差异。' },
}

const quickSortComplexity: ComplexityProfileData = {
  title: '快速排序：主元条件决定递归树高度',
  subtitle: '每一层都要做 Θ(n) 的分区；最好、平均、最差的差异来自子问题是否均衡。',
  cases: [
    { label: '最好', complexity: 'Θ(n log n)', condition: '每次主元都接近中位数，左右各约一半。', example: '中位主元：4 | [1,2,3] [5,6,7,8]', explanation: '递归树高度约 log₂n，每层合计扫描 n 个元素。', tone: 'best' },
    { label: '平均', complexity: 'Θ(n log n)', condition: '随机排列，或随机选择主元；这是期望复杂度。', example: '随机输入：[7,2,1,6,8,5,3,4]', explanation: '极端不平衡会被多数较平衡的分区抵消，期望树高为对数级。', tone: 'average' },
    { label: '最差', complexity: 'Θ(n²)', condition: '主元每次都是最小或最大，切成 0 和 n−1。', example: '已排序：[1,2,3,4,5,6,7,8]', explanation: '递归树退化成链：n+(n−1)+…+1。', tone: 'worst' },
  ],
  footer: '随机化快速排序把最坏输入变成低概率事件，但单次运行仍可能出现不平衡分区。',
  stability: { status: 'unstable', label: '通常不稳定', statement: '分区时的交换可能让相等键跨过彼此；除非额外设计稳定分区和辅助空间。', before: '4A → 4B', after: '4B → 4A' },
}

export function QuickSortLesson() {
  const [exampleId, setExampleId] = useState(quickExamples[0].id)
  const example = quickExamples.find(item => item.id === exampleId) ?? quickExamples[0]
  const trace = buildQuickSortTrace(example)
  const playback = useLessonPlayback(trace.steps.length)
  return <LessonShell eyebrow={trace.eyebrow} title={trace.steps[playback.step].title} description={trace.description} steps={trace.steps.map(item => item.tab ?? '推演')} step={playback.step} onStepChange={playback.setStep} playing={playback.playing} onTogglePlaying={playback.togglePlaying} onReplay={playback.replay} speed={playback.speed} onCycleSpeed={playback.cycleSpeed} complexity={quickSortComplexity} examplePicker={<ExamplePicker examples={quickExamples} value={exampleId} onChange={id => { playback.reset(); setExampleId(id) }} />}>
    <TracePlayer trace={trace} step={playback.step} />
    <DesignNotes insight={quickSortInsight} />
  </LessonShell>
}
