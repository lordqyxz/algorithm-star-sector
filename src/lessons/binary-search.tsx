import { useState } from 'react'
import { DesignNotes, type DesignInsight } from '@/components/DesignNotes'
import { ExamplePicker, type ExampleOption } from '@/components/ExamplePicker'
import { LessonShell } from '@/components/LessonShell'
import type { ComplexityProfileData } from '@/components/ComplexityProfile'
import type { MetricItem } from '@/components/CalcDesk'
import { TracePlayer } from '@/engine/TracePlayer'
import { arrayScene, recordTrace, type TraceEvent } from '@/engine/events'
import type { PointerTag, RegionLabel, SceneCell, Tone, Trace } from '@/engine/trace'
import { useLessonPlayback } from '@/hooks/useLessonPlayback'

/** 演示数据与算法分离：本文件 = 数据集 + 二分查找生成器（产出 Trace）+ 播放器装配。 */

type SearchExample = ExampleOption & { values: number[]; target: number }

const searchExamples: readonly SearchExample[] = [
  { id: 'typical', label: '典型查找', detail: 'x=34 · 3 次比较', values: [2, 3, 5, 8, 13, 21, 34, 55], target: 34 },
  { id: 'first-mid', label: '最好情形', detail: 'x=8 · 1 次命中', values: [2, 3, 5, 8, 13, 21, 34, 55], target: 8 },
  { id: 'deepest', label: '最深处命中', detail: 'x=55 · 最坏路径', values: [2, 3, 5, 8, 13, 21, 34, 55], target: 55 },
  { id: 'absent', label: '目标不存在', detail: 'x=7 · 查到区间为空', values: [2, 3, 5, 8, 13, 21, 34, 55], target: 7 },
]

const searchCode = [
  { code: 'while low ≤ high', note: '区间非空才继续' },
  { code: '  mid = ⌊(low+high)/2⌋', note: '取区间中点，一次探测' },
  { code: '  if x = A[mid]: return mid' },
  { code: '  if x < A[mid]: high = mid - 1', note: '移动依据：x 更小，右半全部排除' },
  { code: '  else: low = mid + 1', note: 'x 更大，左半全部排除' },
  { code: 'return NOT-FOUND', note: '区间为空仍没找到 → x 不存在' },
]

/** 真实执行二分查找：每次比较一拍，命中与未命中两条路径都由循环真实走出来。 */
function* runBinarySearch(example: SearchExample): Generator<TraceEvent> {
  const { values, target } = example
  const n = values.length
  let low = 1
  let high = n
  let probes = 0
  let midPosition: number | undefined
  let midValue: number | undefined
  let foundIndex: number | undefined
  let finished = false
  const intervalSizes: number[] = []

  const metrics = (): MetricItem[] => [
    { label: '当前区间长度', value: Math.max(0, high - low + 1) },
    { label: '已用比较次数', value: probes, tone: 'orange' },
    { label: '线性扫描最坏', value: n, tone: 'purple' },
  ]

  const cells = (): SceneCell[] => values.map((value, index) => {
    const position = index + 1
    const inInterval = position >= low && position <= high
    const isMid = midPosition === position
    const isFound = foundIndex === position
    return { id: `v${position}`, label: value, tone: (isFound ? 'sorted' : isMid ? 'focus' : inInterval || (finished && foundIndex === undefined) ? 'default' : 'muted') as Tone }
  })

  const pointers = (): PointerTag[] => {
    if (finished || midPosition === undefined) return []
    return [
      { index: low - 1, label: 'lo', tone: 'blue' },
      { index: midPosition - 1, label: 'mid', tone: 'dark' },
      { index: high - 1, label: 'hi', tone: 'orange' },
    ]
  }

  const regions = (): RegionLabel[] => {
    const list: RegionLabel[] = []
    if (low > 1) list.push({ from: 0, to: low - 2, label: '已排除 < x', tone: 'blue' })
    if (!finished && high >= low) list.push({ from: low - 1, to: high - 1, label: `当前区间 [${low}, ${high}]`, tone: 'purple' })
    if (!finished && high < n) list.push({ from: high, to: n - 1, label: '已排除 > x', tone: 'orange' })
    return list
  }

  yield { t: 'scene', scene: arrayScene('line', '有序数组：lo / mid / hi 三个指针', cells(), { indexes: true, regions: regions() }) }
  yield { t: 'metrics', metrics: metrics() }
  yield { t: 'legend', legend: [{ tone: 'focus', label: '当前 mid' }, { tone: 'muted', label: '已排除' }, { tone: 'sorted', label: '命中目标' }] }
  yield {
    t: 'message',
    step: {
      title: `在 ${n} 个有序数里找 x=${target}：不逐个比，先问中点`,
      tab: '问题',
      question: '这一步，公式记录了哪次排除？',
      formula: `\\text{区间 }[1,${n}]\\text{，长度 }${n}\\ ;\\ x=${target}`,
      equation: `\\text{线性扫描最坏 }${n}\\text{ 次；二分每次只问 }1\\text{ 个中点}`,
      invariant: 'x 若存在，一定还在当前区间 [low, high] 里。',
      note: '有序性是全部依据：比较一次中点，就能排除整整一半区间。',
      conclusion: '下一步：算出第一个 mid，用一次比较决定去左还是去右。',
      pseudocode: { lines: searchCode, active: [0, 1] },
      prediction: { prompt: `low=1、high=${n}，第一次 mid = ⌊(low+high)/2⌋ 会指到第几位？`, options: ['第 4 位', '第 1 位', '第 8 位'], answer: 0, explanation: `⌊(1+${n})/2⌋=${Math.floor((1 + n) / 2)}，即 A[4]=${values[3]}；第一位探测点由下取整决定。` },
    },
  }
  yield { t: 'step' }

  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    const probed = values[mid - 1]
    probes += 1
    intervalSizes.push(high - low + 1)
    const intervalBefore = high - low + 1
    midPosition = mid
    midValue = probed

    if (probed === target) {
      foundIndex = mid
      finished = true
      yield { t: 'cells', scene: 'line', cells: cells() }
      yield { t: 'pointers', scene: 'line', pointers: pointers() }
      yield { t: 'regions', scene: 'line', regions: regions() }
      yield { t: 'metrics', metrics: metrics() }
      yield {
        t: 'message',
        step: {
          title: `第 ${probes} 次比较：A[${mid}]=${probed} 正中目标`,
          tab: '结论',
          question: '这一步，公式记录了哪次排除？',
          formula: `mid=\\lfloor(${low}+${high})/2\\rfloor=${mid}\\ ;\\ A[${mid}]=${probed}=x`,
          equation: `\\text{命中：}\\ ${probes}\\text{ 次比较}\\ll\\text{线性扫描 }${n}\\text{ 次}`,
          judge: { title: '判断依据：一次比较决定丢哪一半', entries: [{ left: `A[${mid}]=${probed}`, op: '=', right: `x=${target}`, holds: true, action: '直接命中' }], note: `本轮区间从 ${intervalBefore} 缩到 ${Math.max(0, high - low + 1)}；比较只有 1 次，排除的元素却有 ${intervalBefore - Math.max(0, high - low + 1)} 个。` },
          invariant: 'x 一直没离开过当前区间；这次它就是中点本身。',
          note: '区间每次只缩一半，命中路径的长度就是树高量级。',
          conclusion: `找到 x=${target}：二分用 ${probes} 次比较完成，线性扫描最坏要 ${n} 次。`,
          pseudocode: { lines: searchCode, active: [0, 1, 2] },
        },
      }
      yield { t: 'step' }
      break
    }

    const goLeft = probed > target
    const nextLow = goLeft ? low : mid + 1
    const nextHigh = goLeft ? mid - 1 : high
    const afterSize = Math.max(0, nextHigh - nextLow + 1)
    low = nextLow
    high = nextHigh
    yield { t: 'cells', scene: 'line', cells: cells() }
    yield { t: 'pointers', scene: 'line', pointers: pointers() }
    yield { t: 'regions', scene: 'line', regions: regions() }
    yield { t: 'metrics', metrics: metrics() }
    yield {
      t: 'message',
      step: {
        title: `第 ${probes} 次比较：A[${mid}]=${probed} ${goLeft ? '>' : '<'} x=${target}，${goLeft ? '右半' : '左半'}全部排除`,
        tab: `第 ${probes} 次比较`,
        question: '这一步，公式记录了哪次排除？',
        formula: `A[${mid}]=${probed}${goLeft ? '>' : '<'}${target}\\Rightarrow x\\in[${nextLow},${nextHigh}]`,
        equation: `\\text{区间 }${intervalBefore}\\to ${afterSize}\\text{：一次比较排除一半}`,
        judge: { title: '判断依据：一次比较决定丢哪一半', entries: [{ left: `A[${mid}]=${probed}`, op: goLeft ? '>' : '<', right: `x=${target}`, holds: true, action: goLeft ? '中点右侧整段排除，只留左半' : '中点左侧整段排除，只留右半' }], note: `本轮区间从 ${intervalBefore} 缩到 ${afterSize}；比较只有 1 次，排除的元素却有 ${intervalBefore - afterSize} 个。` },
        invariant: `被排除的${goLeft ? '右半' : '左半'}全部${goLeft ? '大于' : '小于'} x，x 若存在仍在新区间内。`,
        note: `有序数组保证 A[${mid}] 一侧的每个元素都不可能等于 x，所以可以整段丢弃。`,
        conclusion: afterSize > 0 ? `区间缩到 [${nextLow}, ${nextHigh}]，继续问新中点。` : '区间变空：x 不在数组里，查找结束。',
        pseudocode: { lines: searchCode, active: [0, 1, goLeft ? 3 : 4] },
        prediction: afterSize > 0 ? { prompt: `新区间 [${nextLow}, ${nextHigh}] 长度 ${afterSize}，下一次 mid = ⌊(${nextLow}+${nextHigh})/2⌋ 指到谁？`, options: [`第 ${Math.floor((nextLow + nextHigh) / 2)} 位`, `第 ${nextLow} 位`, `第 ${nextHigh} 位`], answer: 0, explanation: `⌊(${nextLow}+${nextHigh})/2⌋=${Math.floor((nextLow + nextHigh) / 2)}；每一拍都是"算中点 → 比一次 → 丢一半"。` } : undefined,
      },
    }
    yield { t: 'step' }
  }

  if (!finished) {
    finished = true
    midPosition = undefined
    midValue = undefined
    yield { t: 'cells', scene: 'line', cells: cells() }
    yield { t: 'pointers', scene: 'line', pointers: pointers() }
    yield { t: 'regions', scene: 'line', regions: regions() }
    yield { t: 'metrics', metrics: metrics() }
    yield {
      t: 'message',
      step: {
        title: `区间为空：${probes} 次比较证明 x=${target} 不存在`,
        tab: '结论',
        question: '这一步，公式记录了哪次排除？',
        formula: `\\text{low}>\\text{high}\\Rightarrow\\text{NOT-FOUND}\\ ;\\ ${probes}\\text{ 次比较}`,
        equation: `\\lceil\\log_2(${n}+1)\\rceil=${Math.ceil(Math.log2(n + 1))}\\ge ${probes}\\text{：最坏路径的长度}`,
        judge: { title: '为什么“没找到”也可信', entries: [{ left: 'low', op: '>', right: 'high', holds: true, action: '区间为空：x 不属于数组' }], note: '每一轮排除都有序性背书，所以空区间是可靠结论，不是放弃。' },
        invariant: '每一轮排除的一半都确实不可能包含 x，所以"没找到"也是可靠结论。',
        note: `线性扫描要确认不存在同样需要 ${n} 次比较；二分把最坏次数压到 ⌈log₂(n+1)⌉。`,
        conclusion: `二分查找的代价是对数级：区间 8→4→2→1，比较次数不超过 ⌈log₂n⌉。`,
        pseudocode: { lines: searchCode, active: [0, 5] },
        prediction: { prompt: '如果数组无序，二分的"丢一半"还成立吗？', options: ['不成立，排除一半失去依据', '仍然成立，mid 照算', '只要排一次序就永远成立'], answer: 0, explanation: '"A[mid] 一侧不可能含 x"完全依赖有序性；无序时一次比较排除不了任何一半。' },
      },
    }
    yield { t: 'step' }
  }

  const saved = n - probes
  yield { t: 'cells', scene: 'line', cells: values.map((value, index) => ({ id: `v${index + 1}`, label: value, tone: (foundIndex === index + 1 ? 'sorted' : 'muted') as Tone, caption: foundIndex === index + 1 ? '命中目标' : undefined })) }
  yield { t: 'pointers', scene: 'line', pointers: [] }
  yield { t: 'regions', scene: 'line', regions: [] }
  yield { t: 'metrics', metrics: [
    { label: '已比较轮数', value: probes, tone: 'orange' },
    { label: '区间长度轨迹', value: intervalSizes.join('→'), tone: 'blue' },
    { label: '线性扫描对照', value: n, tone: 'purple' },
    { label: '比线性扫描省', value: saved, tone: 'green' },
  ] }
  yield {
    t: 'message',
    step: {
      title: foundIndex !== undefined ? `完成：x=${target} 命中 A[${foundIndex}]，共 ${probes} 次比较` : `完成：${probes} 次比较证明 x=${target} 不存在`,
      tab: '完成',
      question: '这一步，公式记录了哪次排除？',
      formula: foundIndex !== undefined
        ? `x=${target}=A[${foundIndex}];\\ \\text{比较 }${probes}\\text{ 次}\\ll\\text{线性 }${n}\\text{ 次}`
        : `x=${target}\\notin A;\\ \\text{比较 }${probes}\\text{ 次}\\ll\\text{线性 }${n}\\text{ 次}`,
      equation: `\\lceil\\log_2(${n}+1)\\rceil=${Math.ceil(Math.log2(n + 1))}\\ge ${probes};\\ \\text{线性扫描 }${n}\\text{ 次}`,
      invariant: '每一轮"算中点 → 比一次 → 丢一半"都有序性背书：命中与不存在都是可靠结论。',
      note: `比较轨迹：区间 ${intervalSizes.join('→')}，每次比较排除一半；线性扫描同样的问题最坏要 ${n} 次。`,
      conclusion: '换一个目标或数据集再跑一遍：x=8 一次命中（最好），x=55 走满树高（最坏），不存在的 x=7 也要走到区间为空。',
      pseudocode: { lines: searchCode, active: [] },
    },
  }
  yield { t: 'step' }
}

export const buildBinaryTrace = (example: SearchExample): Trace => recordTrace('SANDBOX 14 · BINARY SEARCH', '有序数组允许一次比较排除一半区间：查找的代价从 n 次压到 log₂n 次，依据全部来自有序性。', runBinarySearch(example))

const binarySearchInsight: DesignInsight = {
  observation: '有序性是预付成本：先付一次 Θ(n log n) 排序，之后每次查询只付 Θ(log n)——数据结构设计的本质是把成本搬到付得最少的地方。',
  contrasts: [
    { alternative: '哈希表查找', whyNot: '平均 O(1) 更快，但要付哈希函数与额外空间，且不支持"第 k 小/范围查询"——有序数组顺带就能做。' },
    { alternative: '在链表上二分', whyNot: '取中点要 O(n)，对数优势全部消失——随机访问能力是二分的前提，设计时要检查数据结构是否支撑算法假设。' },
  ],
  transfer: { prompt: '数据还要支持频繁插入，二分还合适吗？', options: ['不合适：有序数组插入要整体挪动 Θ(n)', '合适：查询还是 log n', '换无序数组更好'], answer: 0, explanation: '查询多、数据静 → 二分；插入删除多 → 平衡树或哈希更合适——按操作配比选结构，而不是背"哪个最快"。' },
}

const binarySearchComplexity: ComplexityProfileData = {
  title: '二分查找：有序性换来对数级比较次数',
  subtitle: '每次比较排除一半区间；代价是输入必须有序（或先付一次排序成本）。',
  cases: [
    { label: '最好', complexity: 'Θ(1)', condition: '目标恰好是第一个 mid。', example: 'n=8 时 x=A[4]=8', explanation: '一次比较直接命中，与 n 无关。', tone: 'best' },
    { label: '平均', complexity: 'Θ(log n)', condition: '目标随机位于有序数组中。', example: 'n=8：8→4→2→1，约 3 次', explanation: '每轮区间减半，比较次数约 log₂n。', tone: 'average' },
    { label: '最坏', complexity: 'Θ(log n)', condition: '目标在最后一层，或根本不存在。', example: 'n=8 找 x=55 或 x=7', explanation: '要走到区间为空，仍只是 ⌈log₂(n+1)⌉ 次。', tone: 'worst' },
  ],
  footer: '对比线性扫描 Θ(n)：n=10⁶ 时二分最多约 20 次比较；但若数组无序，先排序要 Θ(n log n)。',
}

export function BinarySearchLesson() {
  const [exampleId, setExampleId] = useState(searchExamples[0].id)
  const example = searchExamples.find(item => item.id === exampleId) ?? searchExamples[0]
  const trace = buildBinaryTrace(example)
  const playback = useLessonPlayback(trace.steps.length)
  return <LessonShell eyebrow={trace.eyebrow} title={trace.steps[playback.step].title} description={trace.description} steps={trace.steps.map(item => item.tab ?? '推演')} step={playback.step} onStepChange={playback.setStep} playing={playback.playing} onTogglePlaying={playback.togglePlaying} onReplay={playback.replay} speed={playback.speed} onCycleSpeed={playback.cycleSpeed} complexity={binarySearchComplexity} examplePicker={<ExamplePicker examples={searchExamples} value={exampleId} onChange={id => { playback.reset(); setExampleId(id) }} />}>
    <TracePlayer trace={trace} step={playback.step} />
    <DesignNotes insight={binarySearchInsight} />
  </LessonShell>
}
