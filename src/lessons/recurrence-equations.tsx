import { useState } from 'react'
import { DesignNotes, type DesignInsight } from '@/components/DesignNotes'
import { ExamplePicker, type ExampleOption } from '@/components/ExamplePicker'
import { LessonShell } from '@/components/LessonShell'
import type { ComplexityProfileData } from '@/components/ComplexityProfile'
import type { MetricItem } from '@/components/CalcDesk'
import { TracePlayer } from '@/engine/TracePlayer'
import { recordTrace, type TraceEvent } from '@/engine/events'
import type { BarScene, SceneCell, Tone, Trace, TreeScene } from '@/engine/trace'
import { useLessonPlayback } from '@/hooks/useLessonPlayback'

/** 演示数据与算法分离：本文件 = 数据集（三种递归式）+ 递归树生成器（产出 Trace）+ 播放器装配。 */

type RecurrenceKind = 'halve' | 'chain' | 'double'
type RecurrenceExample = ExampleOption & { kind: RecurrenceKind; n: number }

// 每层节点数、每层工作量、总量均已用 node 脚本验证：16×5=80、8+…+1=36、2⁸-1=255。
const recurrenceExamples: readonly RecurrenceExample[] = [
  { id: 'halve', label: '平衡分治', detail: 'T(n)=2T(n/2)+n，n=16 → 总量 80', kind: 'halve', n: 16 },
  { id: 'chain', label: '减一递推', detail: 'T(n)=T(n-1)+n，n=8 → 总量 36', kind: 'chain', n: 8 },
  { id: 'double', label: '指数分叉', detail: 'T(n)=2T(n-1)+1，n=8 → 总量 255', kind: 'double', n: 8 },
]

const recurrenceCode = [
  { code: '展开：T(规模) = a·T(新规模) + 本层工作', note: '每个节点做同一件事：分出去 + 自己干' },
  { code: '宽度：第 i 层节点数 = a^i', note: '每层分叉 a 倍' },
  { code: '高度：规模减半 → log₂n 层；减 1 → n 层', note: '树高由"规模怎么变"决定' },
  { code: '求和：总量 = Σ 每层工作量', note: '柱状图逐层相加' },
  { code: '主导：最大的一列决定 Θ', note: 'r = 相邻层工作量之比' },
]

type RecLevel = { nodes: number; work: number; total: number }

/** 真实按递归式展开：返回每一层的节点数、单节点工作量与该层总量。 */
function levelsOf(kind: RecurrenceKind, n: number): RecLevel[] {
  const levels: RecLevel[] = []
  if (kind === 'halve') {
    for (let i = 0; ; i += 1) {
      const nodes = 2 ** i
      const work = n / nodes
      levels.push({ nodes, work, total: nodes * work })
      if (nodes === n) break
    }
  } else if (kind === 'chain') {
    for (let i = 0; i < n; i += 1) levels.push({ nodes: 1, work: n - i, total: n - i })
  } else {
    for (let i = 0; i < n; i += 1) levels.push({ nodes: 2 ** i, work: 1, total: 2 ** i })
  }
  return levels
}

/** 一层最多画 4 个真实节点；更深的层折叠成"×N"数量标注，保证任何宽度都不裁切。 */
const VISIBLE_MAX = 4

function treeSceneOf(levels: readonly RecLevel[], upTo: number, focusLevel: number): TreeScene {
  const gaps = [44, 28, 16, 12, 10, 10, 10, 10]
  return {
    kind: 'tree',
    id: 'rtree',
    label: '递归树：每层一行，×N 是折叠层',
    gaps: gaps.slice(0, upTo + 1),
    levels: levels.slice(0, upTo + 1).map((level, levelIndex) => {
      if (level.nodes <= VISIBLE_MAX) {
        return Array.from({ length: level.nodes }, (_, nodeIndex): SceneCell => ({
          id: `n${levelIndex}-${nodeIndex}`,
          label: level.work,
          caption: `第 ${levelIndex} 层：${level.nodes} 个节点 × 每个工作量 ${level.work}`,
          tone: levelIndex === focusLevel ? 'focus' : 'default',
        }))
      }
      return [{
        id: `sum${levelIndex}`,
        label: `×${level.nodes}`,
        caption: `第 ${levelIndex} 层：${level.nodes} 个节点 × 每个工作量 ${level.work}（节点太多，折叠标注）`,
        tone: 'target',
      }]
    }),
  }
}

function barsSceneOf(levels: readonly RecLevel[], toneFor: (index: number) => Tone | undefined): BarScene {
  const max = Math.max(...levels.map(level => level.total))
  return {
    kind: 'bars',
    id: 'wbars',
    label: '每层工作量：柱高 = 该层总量',
    max,
    unit: '每层总量',
    bars: levels.map((level, index) => ({ id: `l${index}`, display: String(level.total), value: level.total, caption: `第 ${index} 层`, tone: toneFor(index) })),
  }
}

function* runRecurrenceTree(example: RecurrenceExample): Generator<TraceEvent> {
  const { kind, n } = example
  const levels = levelsOf(kind, n)
  const last = levels.length - 1
  const total = levels.reduce((sum, level) => sum + level.total, 0)
  const nodeSum = levels.reduce((sum, level) => sum + level.nodes, 0)
  const leaf = levels[last]
  const expanded = (count: number): MetricItem[] => [
    { label: '本层节点数', value: levels[Math.min(count - 1, last)].nodes, tone: 'blue' },
    { label: '本层工作量', value: levels[Math.min(count - 1, last)].total, tone: 'orange' },
    { label: '已展开层数', value: count, tone: 'purple' },
    { label: '累计工作量', value: levels.slice(0, count).reduce((sum, level) => sum + level.total, 0), tone: 'green' },
  ]

  // 拍 1：读递归式
  yield { t: 'scene', scene: treeSceneOf(levels, 0, 0) }
  yield { t: 'metrics', metrics: expanded(1) }
  yield {
    t: 'legend',
    legend: [
      { tone: 'focus', label: '刚展开的一层' },
      { tone: 'target', label: '折叠层（节点太多，标数量）' },
      { tone: 'key', label: '正在读数的柱子' },
    ],
  }
  yield {
    t: 'message',
    step: {
      title: `读递归式：T(${n}) 里谁是子问题、谁是本层工作`,
      tab: '读式',
      formula: kind === 'halve'
        ? String.raw`T(${n})=2\,T(${n / 2})+${n}`
        : kind === 'chain'
          ? String.raw`T(${n})=T(${n - 1})+${n}`
          : String.raw`T(${n})=2\,T(${n - 1})+1`,
      formulaHint: '树根就是 T(n)：一个规模 n 的问题，外加本层的非递归工作。',
      equation: kind === 'halve'
        ? String.raw`\underbrace{2T(${n / 2})}_{\text{子问题：}2\text{ 个}}+\underbrace{${n}}_{\text{本层工作}}`
        : kind === 'chain'
          ? String.raw`\underbrace{T(${n - 1})}_{\text{子问题：}1\text{ 个}}+\underbrace{${n}}_{\text{本层工作}}`
          : String.raw`\underbrace{2T(${n - 1})}_{\text{子问题：}2\text{ 个}}+\underbrace{1}_{\text{本层工作}}`,
      invariant: '读式子先分清两件事：分出去什么（子问题），自己干多少（本层工作）——树上的每个节点都在重复这两件事。',
      note: `系数 a 决定每层分几叉；T 的参数怎么变决定树有多高；加的那一项就是本层工作量（本例树根为 ${levels[0].total}）。`,
      conclusion: '往下展开一层，看看孩子长什么样。',
      pseudocode: { lines: recurrenceCode, active: [0] },
    },
  }
  yield { t: 'step' }

  // 拍 2：展开一层 + 预测
  yield { t: 'scene', scene: treeSceneOf(levels, 1, 1) }
  yield { t: 'metrics', metrics: expanded(2) }
  yield {
    t: 'message',
    step: {
      title: kind === 'halve' ? '展开一层：2 个孩子，每个工作量减半' : kind === 'chain' ? '展开一层：只有 1 个孩子，工作量减 1' : '展开一层：2 个孩子，工作量还是 1',
      tab: '展开一层',
      formula: kind === 'halve'
        ? String.raw`T(${n})=2\,T(${n / 2})+${n}\Rightarrow \text{第 1 层：}2\text{ 个节点}\times${levels[1].work}=${levels[1].total}`
        : kind === 'chain'
          ? String.raw`T(${n})=T(${n - 1})+${n}\Rightarrow \text{第 1 层：}1\text{ 个节点}\times${levels[1].work}`
          : String.raw`T(${n})=2\,T(${n - 1})+1\Rightarrow \text{第 1 层：}2\text{ 个节点}\times1`,
      formulaHint: '新的一行就是刚从根分出来的孩子；它们的规模由 T 的参数决定。',
      equation: kind === 'halve'
        ? String.raw`\text{宽度}\times2,\ \text{单点工作量}\div2\Rightarrow\text{本层总量仍 }${levels[1].total}`
        : kind === 'chain'
          ? String.raw`\text{宽度不变，规模只减 }1`
          : String.raw`\text{宽度}\times2,\ \text{单点工作量不变}\Rightarrow\text{本层总量翻倍}`,
      invariant: '每个节点都忠实执行同一条递归式：树是被"读"出来的，不是画手摆的。',
      note: kind === 'halve'
        ? '翻倍与减半正在互相抵消——记住这个感觉，第 4 拍用柱子验证。'
        : kind === 'chain'
          ? '规模每次只减 1：这不是分叉树，是一条链。'
          : '规模只减 1、宽度却翻倍：两股力量不抵消，这是危险的信号。',
      conclusion: '按同样的规则继续展开，直到问题小到不能再分。',
      prediction: kind === 'halve'
        ? {
            prompt: '展开到第 2 层（4 个节点）时，这一层的总工作量是多少？',
            options: [`还是 ${n}`, `缩成 ${n / 2}`, `缩成 ${n / 4}`],
            answer: 0,
            explanation: `节点数 ×2、每节点工作量 ÷2，乘积不变：第 2 层是 ${levels[2].nodes}×${levels[2].work}=${levels[2].total}。每层等量正是 T(n)=2T(n/2)+n 的标志。`,
          }
        : kind === 'chain'
          ? {
              prompt: 'T(n)=T(n-1)+n 拆到底要展开多少层？',
              options: ['log₂8≈3 层', '8 层', '2⁸=256 层'],
              answer: 1,
              explanation: '规模每次只减 1：8→7→…→1，共 8 层。对数层数只属于"规模减半"的形态。',
            }
          : {
              prompt: '每个节点生 2 个孩子、规模只减 1：n=8 时整棵树共有多少节点？',
              options: ['约 64 个', '2⁸-1=255 个', '约 24 个'],
              answer: 1,
              explanation: '每层节点数翻倍：1+2+4+…+128=2⁸-1=255。宽度指数增长、高度却是线性，两头一起爆炸。',
            },
      pseudocode: { lines: recurrenceCode, active: [1] },
    },
  }
  yield { t: 'step' }

  // 拍 3：展开到底 + 柱状图登场
  yield { t: 'scene', scene: treeSceneOf(levels, last, last) }
  yield { t: 'scene', scene: barsSceneOf(levels, () => 'key') }
  yield {
    t: 'metrics',
    metrics: [
      { label: '本层节点数', value: leaf.nodes, tone: 'blue' },
      { label: '本层工作量', value: leaf.total, tone: 'orange' },
      { label: '树高（层数）', value: levels.length, tone: 'purple' },
      { label: '节点总数', value: nodeSum, tone: 'green' },
    ],
  }
  yield {
    t: 'message',
    step: {
      title: kind === 'halve' ? '展开到底：规模减半 4 次，共 5 层' : kind === 'chain' ? '展开到底：规模每次只减 1，共 8 层' : '展开到底：8 层，每层节点翻倍',
      tab: '展开到底',
      formula: kind === 'halve'
        ? String.raw`${n}\to${n / 2}\to${n / 4}\to2\to1:\ \log_2 ${n}=4\ \text{次减半，共 }${levels.length}\ \text{层}`
        : kind === 'chain'
          ? String.raw`${n}\to${n - 1}\to\cdots\to1:\ \text{规模每次只减 1，共 }${n}\ \text{层}`
          : String.raw`${n}\to${n - 1}\to\cdots\to1:\ ${n}\ \text{层，每层节点翻倍}`,
      formulaHint: '叶子层被高亮；×N 是折叠层：节点太多时只标数量。',
      equation: kind === 'halve'
        ? String.raw`2^i\ \text{个节点}\times\tfrac{n}{2^i}=n\quad(\text{每层总量都是 }${n})`
        : kind === 'chain'
          ? String.raw`1\ \text{个节点}\times(n-i)\quad(\text{第 }i\text{ 层工作量从 }${n}\text{ 递减到 }1)`
          : String.raw`2^i\ \text{个节点}\times1=2^i\quad(\text{每层工作量}=\text{节点数})`,
      invariant: '树形由递归式唯一决定：分几个（宽度）、规模怎么变（高度）、本层干多少（柱高）。',
      note: kind === 'halve'
        ? `叶子层共 ${leaf.nodes} 个规模 1 的子问题，该层总量 ${leaf.total}——和根一样。柱状图上每根柱子都一样高。`
        : kind === 'chain'
          ? `叶子只有 1 个节点、干 1 的活；柱子从 ${n} 一路递减到 1。`
          : `叶子层 ${leaf.nodes} 个节点、该层总量 ${leaf.total}——柱子从 1 一路翻倍到 ${leaf.total}。`,
      conclusion: '树形定型。接下来把每根柱子加起来，就是总工作量。',
      pseudocode: { lines: recurrenceCode, active: [2] },
    },
  }
  yield { t: 'step' }

  // 拍 4：逐层求和
  yield { t: 'scene', scene: treeSceneOf(levels, last, last) }
  yield { t: 'scene', scene: barsSceneOf(levels, () => 'key') }
  yield {
    t: 'metrics',
    metrics: [
      { label: '本层节点数', value: leaf.nodes, tone: 'blue' },
      { label: '本层工作量', value: leaf.total, tone: 'orange' },
      { label: '树高（层数）', value: levels.length, tone: 'purple' },
      { label: '累计工作量', value: total, tone: 'green' },
    ],
  }
  yield {
    t: 'message',
    step: {
      title: kind === 'halve' ? `逐层求和：${n}+${n}+${n}+${n}+${n} = ${total}` : kind === 'chain' ? `逐层求和：${n}+${n - 1}+…+1 = ${total}` : `逐层求和：1+2+4+…+${leaf.total} = ${total}`,
      tab: '求和',
      formula: kind === 'halve'
        ? String.raw`W_i=${n}\ (\text{常数})\Rightarrow ${n}+${n}+${n}+${n}+${n}=${total}`
        : kind === 'chain'
          ? String.raw`W_i=${n}-i\ (\text{递减})\Rightarrow ${n}+${n - 1}+\cdots+1=${total}`
          : String.raw`W_i=2^i\ (\text{翻倍})\Rightarrow 1+2+4+\cdots+${leaf.total}=${total}`,
      formulaHint: '黄色柱子就是刚读出的每层工作量；公式只是把它们加起来。',
      equation: kind === 'halve'
        ? String.raw`${n}\cdot(\log_2 ${n}+1)=${n}\cdot${levels.length}=${total}`
        : kind === 'chain'
          ? String.raw`\tfrac{${n}\cdot(${n}+1)}{2}=${total}`
          : String.raw`2^{${n}}-1=${total}`,
      invariant: '求和的每一项都能在柱状图上指出来——公式是柱子的读数，不是凭空写下的。',
      note: kind === 'halve'
        ? `每层 ${n}、共 ${levels.length} 层：总量 ${total}。`
        : kind === 'chain'
          ? `三角形求和：${n}(${n}+1)/2=${total}，最大的柱子在根部。`
          : `几何级数：最后一根柱子独占 ${Math.round((leaf.total / total) * 100)}% 的总量——指数形态的标志。`,
      conclusion: '柱子读完了：现在看哪一列在主导总量。',
      prediction: kind === 'halve'
        ? {
            prompt: '三种形态里，哪种"每层工作量相同"？',
            options: ['T(n)=2T(n/2)+n：节点翻倍与规模减半相互抵消', 'T(n)=T(n-1)+n：越往下越少', 'T(n)=2T(n-1)+1：越往下越多'],
            answer: 0,
            explanation: '平衡分治的标志就是每层等量：总量的乘子只剩层数 log₂n——这正是 Θ(n log n) 的来源。',
          }
        : undefined,
      pseudocode: { lines: recurrenceCode, active: [3] },
    },
  }
  yield { t: 'step' }

  // 拍 5：主导项与结论
  yield { t: 'scene', scene: treeSceneOf(levels, last, last) }
  yield {
    t: 'scene',
    scene: barsSceneOf(levels, index => {
      if (kind === 'halve') return 'target'
      if (kind === 'chain') return index === 0 ? 'target' : undefined
      return index === last ? 'target' : undefined
    }),
  }
  yield {
    t: 'metrics',
    metrics: [
      { label: '主导层', value: kind === 'halve' ? '每层等量' : kind === 'chain' ? '根部（第 0 层）' : '叶子（最后一层）', tone: 'orange' },
      { label: '本层工作量', value: kind === 'halve' ? n : kind === 'chain' ? levels[0].total : leaf.total, tone: 'blue' },
      { label: '树高（层数）', value: levels.length, tone: 'purple' },
      { label: '累计工作量', value: total, tone: 'green' },
    ],
  }
  yield {
    t: 'message',
    step: {
      title: kind === 'halve' ? `主导项：每层等量 × 对数层高 = Θ(n log n)` : kind === 'chain' ? '主导项：根部最大，总量被 n² 收编 = Θ(n²)' : '主导项：叶子层独占一半，指数爆炸 = Θ(2ⁿ)',
      tab: '结论',
      formula: kind === 'halve'
        ? String.raw`T(n)=\Theta(n\log n)`
        : kind === 'chain'
          ? String.raw`T(n)=\Theta(n^2)`
          : String.raw`T(n)=\Theta(2^n)`,
      formulaHint: '紫色柱子就是主导层：它（们）决定 Θ 里的指数。',
      equation: kind === 'halve'
        ? String.raw`r=\tfrac{W_{i+1}}{W_i}=1\Rightarrow\text{谁都不独大，乘子是层数 }\log_2 n`
        : kind === 'chain'
          ? String.raw`r=\tfrac{n-i-1}{n-i}<1\Rightarrow\text{柱子递减，根部主导：}\tfrac{${n}(${n}+1)}{2}=${total}`
          : String.raw`r=\tfrac{W_{i+1}}{W_i}=2>1\Rightarrow\text{叶子主导：}\tfrac{${leaf.total}}{${total}}\approx\text{一半}`,
      invariant: '相邻层工作量之比 r：r=1 每层等量、r<1 递减、r>1 翻倍——一个比值定三种命运。',
      note: kind === 'halve'
        ? `实例：${n}×${levels.length}=${total}。归并排序、分治最大子数组都是这个形态。`
        : kind === 'chain'
          ? `实例：${total}≈${n}²/2。简单选择、插入排序的最坏计数就是这个三角形。`
          : `实例：${total}=${nodeSum} 个节点。汉诺塔、不加记忆化的"枚举所有子集"都是这个形态——不记忆化就爆炸。`,
      conclusion: '读递归式三件事：分几个（宽度）、规模怎么变（高度）、本层干多少（柱高）——主方法把这三步变成速查表。',
      pseudocode: { lines: recurrenceCode, active: [4] },
    },
  }
  yield { t: 'step' }
}

const buildRecurrenceTrace = (example: RecurrenceExample): Trace => recordTrace('SANDBOX 17 · RECURRENCE', '把递归式画成树：宽度看分几个、高度看规模怎么变、柱高看每层干多少——三种形态三种命运。', runRecurrenceTree(example))

const recurrenceInsight: DesignInsight = {
  observation: '递归式的命运由一个比值决定：相邻两层工作量之比 r。r=1 每层等量（乘上层数 → n log n）、r<1 递减（根部主导 → 多项式）、r>1 翻倍（叶子主导 → 指数）。',
  contrasts: [
    { alternative: '代代入展开硬算', whyNot: '每个递归式都要重新推一遍；递归树把"结构 + 每层工作量"直接画出来，任何形态都能第一眼看出主导层。' },
    { alternative: '只背主方法三情形', whyNot: '主方法有适用边界（子问题必须均分、f(n) 为正）；T(n)=T(n-1)+n 这类"减法型"递归式它管不了，递归树仍然可用。' },
  ],
  transfer: { prompt: 'T(n)=2T(n/2)+n 与 T(n)=2T(n-1)+1 都"分 2 个"，为什么一个 n log n、一个 2ⁿ？', options: ['规模减半让树高只有 log₂n；只减 1 让树高达到 n，翻倍叠翻倍', '因为加的项不同：n 比 1 大', '两者其实同阶'], answer: 0, explanation: '分叉数决定每层宽度，规模变化决定树高。宽度同样是 2^i，但高度 log₂n 与 n 的差别把总量从 n log n 拉到 2ⁿ。' },
}

const recurrenceComplexity: ComplexityProfileData = {
  title: '递归式三形态：一个比值 r 定命运',
  subtitle: 'r = 相邻两层工作量之比；它决定主导层在根、在每层、还是在叶子。',
  cases: [
    { label: '平衡分治', complexity: 'Θ(n log n)', condition: 'T(n)=2T(n/2)+n：每层总量 n，共 log₂n+1 层。', example: 'n=16：5 层 × 16 = 80', explanation: 'r=1，谁都不独大，层数成为乘子——归并排序同款。', tone: 'method' },
    { label: '减一递推', complexity: 'Θ(n²)', condition: 'T(n)=T(n-1)+n：每层 1 个节点，工作量 n 递减到 1。', example: 'n=8：8+7+…+1=36', explanation: 'r<1，根部主导；三角形求和 n(n+1)/2——简单排序的最坏计数同款。', tone: 'method' },
    { label: '指数分叉', complexity: 'Θ(2ⁿ)', condition: 'T(n)=2T(n-1)+1：每层节点翻倍、树高 n。', example: 'n=8：2⁸-1=255 个节点', explanation: 'r>1，叶子层独占约一半总量——不记忆化的暴力枚举同款。', tone: 'method' },
  ],
  footer: '主方法 T(n)=aT(n/b)+f(n) 把"画树 → 算每层 → 找主导"系统化成三种情形；遇到减法型或非均分递归式时，回到递归树手画一遍。',
}

export function RecurrenceEquationsLesson() {
  const [exampleId, setExampleId] = useState(recurrenceExamples[0].id)
  const example = recurrenceExamples.find(item => item.id === exampleId) ?? recurrenceExamples[0]
  const trace = buildRecurrenceTrace(example)
  const playback = useLessonPlayback(trace.steps.length)
  return <LessonShell eyebrow={trace.eyebrow} title={trace.steps[playback.step].title} description={trace.description} steps={trace.steps.map(item => item.tab ?? '推演')} step={playback.step} onStepChange={playback.setStep} playing={playback.playing} onTogglePlaying={playback.togglePlaying} onReplay={playback.replay} speed={playback.speed} onCycleSpeed={playback.cycleSpeed} complexity={recurrenceComplexity} examplePicker={<ExamplePicker examples={recurrenceExamples} value={exampleId} onChange={id => { playback.reset(); setExampleId(id) }} />}>
    <TracePlayer trace={trace} step={playback.step} />
    <DesignNotes insight={recurrenceInsight} />
  </LessonShell>
}
