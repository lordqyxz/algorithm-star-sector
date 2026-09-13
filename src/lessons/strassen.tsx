import { useState } from 'react'
import { DesignNotes, type DesignInsight } from '@/components/DesignNotes'
import { ExamplePicker, type ExampleOption } from '@/components/ExamplePicker'
import { LessonShell } from '@/components/LessonShell'
import type { ComplexityProfileData } from '@/components/ComplexityProfile'
import type { MetricItem } from '@/components/CalcDesk'
import { TracePlayer } from '@/engine/TracePlayer'
import { recordTrace, type TraceEvent } from '@/engine/events'
import type { MatrixScene, Tone, Trace } from '@/engine/trace'
import { useLessonPlayback } from '@/hooks/useLessonPlayback'

/** 演示数据与算法分离：本文件 = 数据集 + Strassen 2×2 生成器（产出 Trace）+ 播放器装配。 */

type Mat2 = [[number, number], [number, number]]
type StrassenExample = ExampleOption & { a: Mat2; b: Mat2 }

// 以下四组的 C、S、M 全部算术已用 node 脚本逐一验证。
const strassenExamples: readonly StrassenExample[] = [
  { id: 'classic', label: 'CLRS 课堂例', detail: 'C=[[18,14],[62,66]]', a: [[1, 3], [7, 5]], b: [[6, 8], [4, 2]] },
  { id: 'negative', label: '含负数块', detail: 'C=[[12,-1],[7,15]]，负数也照拼', a: [[2, -1], [3, 4]], b: [[5, 1], [-2, 3]] },
  { id: 'identity', label: '单位矩阵', detail: 'I·B=B：对账最稳的一组', a: [[1, 0], [0, 1]], b: [[5, 7], [2, 3]] },
  { id: 'mixed', label: '再换一组', detail: 'C=[[16,34],[15,14]]', a: [[4, 2], [1, 6]], b: [[3, 8], [2, 1]] },
]

const strassenCode = [
  { code: 'C11 = A11·B11 + A12·B21', note: '朴素：每个 C 块要 2 次块乘法' },
  { code: 'C12 = A11·B12 + A12·B22' },
  { code: 'C21 = A21·B11 + A22·B21' },
  { code: 'C22 = A21·B12 + A22·B22', note: '四个式子 = 8 次块乘法 + 4 次块加法' },
  { code: 'S1..S10 = 块的 10 次加减', note: '先把块组合进 S 寄存器' },
  { code: 'M1 = S1·S2 … M7 = S9·S10', note: '只做 7 次乘法' },
  { code: 'C11 = M1+M4-M5+M7;  C12 = M3+M5', note: '组合回 C 的上排' },
  { code: 'C21 = M2+M4;  C22 = M1-M2+M3+M6', note: '组合回 C 的下排' },
]

function naiveMultiply(a: Mat2, b: Mat2): Mat2 {
  return [
    [a[0][0] * b[0][0] + a[0][1] * b[1][0], a[0][0] * b[0][1] + a[0][1] * b[1][1]],
    [a[1][0] * b[0][0] + a[1][1] * b[1][0], a[1][0] * b[0][1] + a[1][1] * b[1][1]],
  ]
}

/** 真实执行 Strassen：S1..S10、M1..M7、四个组合式，全部由输入算出。 */
function strassenData(a: Mat2, b: Mat2) {
  const a11 = a[0][0]
  const a12 = a[0][1]
  const a21 = a[1][0]
  const a22 = a[1][1]
  const b11 = b[0][0]
  const b12 = b[0][1]
  const b21 = b[1][0]
  const b22 = b[1][1]
  const s = [
    a11 + a22, b11 + b22, a21 + a22, b12 - b22, b21 - b11,
    a11 + a12, a21 - a11, b11 + b12, a12 - a22, b21 + b22,
  ]
  const m = [s[0] * s[1], s[2] * b11, a11 * s[3], a22 * s[4], s[5] * b22, s[6] * s[7], s[8] * s[9]]
  const c: Mat2 = [
    [m[0] + m[3] - m[4] + m[6], m[2] + m[4]],
    [m[1] + m[3], m[0] - m[1] + m[2] + m[5]],
  ]
  return { s, m, c }
}

const blockName = (matrix: string, row: number, col: number) => `${matrix}${['11', '12', '21', '22'][row * 2 + col]}`

/** M1..M7 的定义：参与哪些块、喂给哪些 C 块、LaTeX 展开。 */
const mDefs = [
  { plain: 'M1 = S1·S2 = (A11+A22)(B11+B22)', latex: String.raw`S_1\cdot S_2=(A_{11}+A_{22})(B_{11}+B_{22})`, aBlocks: [[0, 0], [1, 1]], bBlocks: [[0, 0], [1, 1]], feeds: 'C11, C22', why: '对角和乘对角和：一次乘积同时服务两个 C 块。' },
  { plain: 'M2 = S3·B11 = (A21+A22)·B11', latex: String.raw`S_3\cdot B_{11}=(A_{21}+A_{22})B_{11}`, aBlocks: [[1, 0], [1, 1]], bBlocks: [[0, 0]], feeds: 'C21, C22', why: 'A 的下排之和乘 B11：把 B11 的贡献一次算足。' },
  { plain: 'M3 = A11·S4 = A11·(B12-B22)', latex: String.raw`A_{11}\cdot S_4=A_{11}(B_{12}-B_{22})`, aBlocks: [[0, 0]], bBlocks: [[0, 1], [1, 1]], feeds: 'C12, C22', why: 'B 的上排之差被 A11 放大。' },
  { plain: 'M4 = A22·S5 = A22·(B21-B11)', latex: String.raw`A_{22}\cdot S_5=A_{22}(B_{21}-B_{11})`, aBlocks: [[1, 1]], bBlocks: [[1, 0], [0, 0]], feeds: 'C11, C21', why: 'B 的下排减上排，再交给 A22。' },
  { plain: 'M5 = S6·B22 = (A11+A12)·B22', latex: String.raw`S_6\cdot B_{22}=(A_{11}+A_{12})B_{22}`, aBlocks: [[0, 0], [0, 1]], bBlocks: [[1, 1]], feeds: 'C12', why: 'A 的上排之和直接为 C12 服务。' },
  { plain: 'M6 = S7·S8 = (A21-A11)(B11+B12)', latex: String.raw`S_7\cdot S_8=(A_{21}-A_{11})(B_{11}+B_{12})`, aBlocks: [[1, 0], [0, 0]], bBlocks: [[0, 0], [0, 1]], feeds: 'C22', why: '两条差相乘，专补 C22。' },
  { plain: 'M7 = S9·S10 = (A12-A22)(B21+B22)', latex: String.raw`S_9\cdot S_{10}=(A_{12}-A_{22})(B_{21}+B_{22})`, aBlocks: [[0, 1], [1, 1]], bBlocks: [[1, 0], [1, 1]], feeds: 'C11', why: '最后一条差积，专补 C11。' },
] as const

const parens = (value: number) => (value < 0 ? `(${value})` : `${value}`)

function matrixScene(id: string, label: string, mat: Mat2, toneFor: (row: number, col: number) => Tone, captionFor?: (row: number, col: number) => string, caption?: string): MatrixScene {
  return {
    kind: 'matrix',
    id,
    label,
    rows: mat.map((row, rowIndex) => row.map((value, colIndex) => ({ id: `${id}-${rowIndex}-${colIndex}`, label: value, tone: toneFor(rowIndex, colIndex), caption: captionFor?.(rowIndex, colIndex) }))),
    caption,
  }
}

function* runStrassen(a: Mat2, b: Mat2): Generator<TraceEvent> {
  const { s, m, c } = strassenData(a, b)
  const naive = naiveMultiply(a, b)
  let mults = 0
  let adds = 0

  const metrics = (): MetricItem[] => [
    { label: 'Strassen 乘法', value: mults, tone: 'orange' },
    { label: 'Strassen 加减', value: adds, tone: 'blue' },
    { label: '朴素乘法对照', value: 8, tone: 'purple' },
  ]

  const idleTone = (): Tone => 'default'
  const placeholderC = (): MatrixScene => ({
    kind: 'matrix',
    id: 'matC',
    label: '矩阵 C（待拼出）',
    rows: [[0, 1], [1, 0]].map((row, rowIndex) => row.map((_, colIndex) => ({ id: `matC-${rowIndex}-${colIndex}`, label: '·', tone: 'muted' as Tone }))),
    caption: '四个块都还是占位符 ·，等七个 M 来拼',
  })

  // 拍 1：朴素分块，8 次乘法
  yield { t: 'scene', scene: matrixScene('matA', '矩阵 A（块视角）', a, idleTone, undefined, 'A11 A12 在上排，A21 A22 在下排') }
  yield { t: 'scene', scene: matrixScene('matB', '矩阵 B（块视角）', b, idleTone, undefined, '行乘列：A 的行配 B 的列') }
  yield { t: 'scene', scene: placeholderC() }
  yield { t: 'metrics', metrics: metrics() }
  yield {
    t: 'legend',
    legend: [
      { tone: 'focus', label: '当前计算涉及的块' },
      { tone: 'key', label: '被组合进 S 的块' },
      { tone: 'sorted', label: '已拼出的 C 块' },
      { tone: 'muted', label: '本拍不参与' },
    ],
  }
  yield {
    t: 'message',
    step: {
      title: '普通分块乘法：四个式子要 8 次块乘法',
      tab: '朴素 8 乘',
      formula: String.raw`C_{11}=A_{11}B_{11}+A_{12}B_{21}\quad(\text{四式同理})`,
      formulaHint: '每算一个 C 块要 2 次块乘法 + 1 次块加法，四个块共 8 乘 4 加。',
      equation: String.raw`4\ \text{式}\times 2\ \text{乘}=8\ \text{次乘法},\ \ 4\ \text{次加法}`,
      invariant: '矩阵 A、B 一个数都没动——分块只是换了一种"看"它们的方式。',
      note: '递归放大这个差距：8 次块乘法就是 8 个子问题。Strassen 的赌注：这 8 次乘法里有冗余，能不能只用 7 次？',
      conclusion: '先付 10 次加减的"手续费"，把块组合进 S 寄存器。',
      pseudocode: { lines: strassenCode, active: [0, 1, 2, 3] },
    },
  }
  yield { t: 'step' }

  // 拍 2：S1..S10 准备（10 次加减）
  adds += 10
  yield { t: 'scene', scene: matrixScene('matA', '矩阵 A（块视角）', a, () => 'key', undefined, 'A 的四个块都要被组合进 S') }
  yield { t: 'scene', scene: matrixScene('matB', '矩阵 B（块视角）', b, () => 'key', undefined, 'B 的四个块也要被组合进 S') }
  yield { t: 'scene', scene: placeholderC() }
  yield { t: 'metrics', metrics: metrics() }
  yield {
    t: 'message',
    step: {
      title: 'Strassen 准备：10 次块加减，装满 S1..S10',
      tab: '加减准备',
      formula: String.raw`S_1=A_{11}+A_{22},\ S_2=B_{11}+B_{22},\ \ldots,\ S_{10}=B_{21}+B_{22}`,
      formulaHint: '黄色块正被组合：4 个 S 来自 A，4 个来自 B，还有 2 个是纯 B 或纯 A 的差。',
      equation: String.raw`10\ \text{次加减先付成本}\Longleftrightarrow\text{换后面少一次乘法}`,
      moves: {
        kind: 'one-way',
        title: '块的加/减结果流进 S 寄存器',
        moves: [
          { token: `S1=A11+A22=${s[0]}`, from: 'A 的对角块', to: 'S1' },
          { token: `S2=B11+B22=${s[1]}`, from: 'B 的对角块', to: 'S2' },
          { token: `S3=A21+A22=${s[2]}`, from: 'A 的下排', to: 'S3' },
          { token: `S4=B12-B22=${s[3]}`, from: 'B 上排减下', to: 'S4' },
          { token: `S5=B21-B11=${s[4]}`, from: 'B 下排减上', to: 'S5' },
          { token: `S6=A11+A12=${s[5]}`, from: 'A 的上排', to: 'S6' },
          { token: `S7=A21-A11=${s[6]}`, from: 'A 下排减上', to: 'S7' },
          { token: `S8=B11+B12=${s[7]}`, from: 'B 的上排', to: 'S8' },
          { token: `S9=A12-A22=${s[8]}`, from: 'A 对角差', to: 'S9' },
          { token: `S10=B21+B22=${s[9]}`, from: 'B 的下排', to: 'S10' },
        ],
        verdict: '加减是"便宜"运算：10 次加减换来乘法从 8 次降到 7 次。',
      },
      invariant: 'S 只是块的加减组合，没有任何乘法发生——原始信息一个不丢。',
      conclusion: 'S 备好了：每个 M 只需要一两个 S，现在逐个算乘积。',
      pseudocode: { lines: strassenCode, active: [4] },
    },
  }
  yield { t: 'step' }

  // 拍 3-9：M1..M7 逐个计算
  const blockTone = (blocks: readonly (readonly [number, number])[]) => (row: number, col: number): Tone => blocks.some(([r, c]) => r === row && c === col) ? 'focus' : 'default'
  for (let k = 0; k < 7; k += 1) {
    mults = k + 1
    const def = mDefs[k]
    const operandPair = [
      `${parens(s[0])}\\times${parens(s[1])}`,
      `${parens(s[2])}\\times${parens(b[0][0])}`,
      `${parens(a[0][0])}\\times${parens(s[3])}`,
      `${parens(a[1][1])}\\times${parens(s[4])}`,
      `${parens(s[5])}\\times${parens(b[1][1])}`,
      `${parens(s[6])}\\times${parens(s[7])}`,
      `${parens(s[8])}\\times${parens(s[9])}`,
    ][k]
    yield { t: 'scene', scene: matrixScene('matA', '矩阵 A（块视角）', a, blockTone(def.aBlocks), (row, col) => `A 块 ${blockName('A', row, col)}${def.aBlocks.some(([r, c]) => r === row && c === col) ? '参与本积' : ''}`) }
    yield { t: 'scene', scene: matrixScene('matB', '矩阵 B（块视角）', b, blockTone(def.bBlocks), (row, col) => `B 块 ${blockName('B', row, col)}${def.bBlocks.some(([r, c]) => r === row && c === col) ? '参与本积' : ''}`) }
    yield { t: 'scene', scene: placeholderC() }
    yield { t: 'metrics', metrics: metrics() }
    yield {
      t: 'message',
      step: {
        title: `${def.plain} = ${m[k]}（第 ${k + 1} / 7 次乘法）`,
        tab: `M${k + 1}=${m[k]}`,
        formula: String.raw`M_{${k + 1}}=${def.latex}=${operandPair}=${m[k]}`,
        formulaHint: `高亮块就是本积的全部输入：${def.aBlocks.map(([r, cCol]) => blockName('A', r, cCol)).join('、')} 与 ${def.bBlocks.map(([r, cCol]) => blockName('B', r, cCol)).join('、')}。`,
        equation: String.raw`M_{${k + 1}}\to ${def.feeds}`,
        invariant: 'A、B 的块原封不动：M 只是S 寄存器（或块）的一次乘法，读数不写数。',
        note: def.why,
        conclusion: k < 6 ? `第 ${k + 1} 个乘积到手，还差 ${6 - k} 个。` : '七个乘积集齐——比朴素的 8 次整整少一次。',
        prediction: k === 6
          ? {
              prompt: '为什么只省 1 次乘法，就能改变复杂度的指数？',
              options: ['乘法决定递归分支：8T(n/2) → 7T(n/2)，指数从 log₂8=3 降到 log₂7≈2.807', '省下的乘法会被编译器自动优化掉', '其实指数没变，只是常数变小了'],
              answer: 0,
              explanation: '块乘法会递归到底：每层 8 分支 → Θ(n³)，7 分支 → Θ(n^2.807)。省的是"递归分支数"，不是一次孤立的运算。',
            }
          : undefined,
        pseudocode: { lines: strassenCode, active: [5] },
      },
    }
    yield { t: 'step' }
  }

  // 拍 10：组合出 C，并与朴素结果对账
  adds += 8
  yield { t: 'scene', scene: matrixScene('matA', '矩阵 A（块视角）', a, () => 'muted', undefined, '七个 M 已把 A、B 的信息用完') }
  yield { t: 'scene', scene: matrixScene('matB', '矩阵 B（块视角）', b, () => 'muted', undefined, '七个 M 已把 A、B 的信息用完') }
  yield {
    t: 'scene',
    scene: matrixScene('matC', '矩阵 C（Strassen 结果）', c, () => 'sorted', (row, col) => `C 块 ${blockName('C', row, col)}=${c[row][col]}`, '四个块全部由 M 的加减拼出'),
  }
  yield { t: 'metrics', metrics: metrics() }
  yield {
    t: 'message',
    step: {
      title: `组合出 C：七个 M 拼出四个块，与朴素结果完全一致`,
      tab: '拼 C',
      formula: String.raw`C_{11}=M_1+M_4-M_5+M_7=${c[0][0]}`,
      formulaHint: `M1=${m[0]}，M4=${m[3]}，M5=${m[4]}，M7=${m[6]}；另外三块见右侧组合式。`,
      equation: String.raw`C_{12}=M_3+M_5,\quad C_{21}=M_2+M_4,\quad C_{22}=M_1-M_2+M_3+M_6`,
      moves: {
        kind: 'one-way',
        title: 'M 寄存器汇入 C 的四个块',
        moves: [
          { token: `M1+M4-M5+M7=${c[0][0]}`, from: 'M1 M4 M5 M7', to: `C11=${c[0][0]}` },
          { token: `M3+M5=${c[0][1]}`, from: 'M3 M5', to: `C12=${c[0][1]}` },
          { token: `M2+M4=${c[1][0]}`, from: 'M2 M4', to: `C21=${c[1][0]}` },
          { token: `M1-M2+M3+M6=${c[1][1]}`, from: 'M1 M2 M3 M6', to: `C22=${c[1][1]}` },
        ],
        verdict: '每个 C 块都是 M 的固定组合——加减共 18 次（10 次准备 + 8 次组合）。',
      },
      judge: {
        title: '对账：Strassen 结果 vs 朴素结果',
        entries: [
          { left: `Strassen C11=${c[0][0]}`, op: '=', right: `朴素 C11=${naive[0][0]}`, holds: c[0][0] === naive[0][0], action: '一致' },
          { left: `Strassen C12=${c[0][1]}`, op: '=', right: `朴素 C12=${naive[0][1]}`, holds: c[0][1] === naive[0][1], action: '一致' },
          { left: `Strassen C21=${c[1][0]}`, op: '=', right: `朴素 C21=${naive[1][0]}`, holds: c[1][0] === naive[1][0], action: '一致' },
          { left: `Strassen C22=${c[1][1]}`, op: '=', right: `朴素 C22=${naive[1][1]}`, holds: c[1][1] === naive[1][1], action: '一致' },
        ],
        note: '四块全对上：7 乘 18 加与 8 乘 4 加答案相同——省掉的乘法被加减补偿了。',
      },
      invariant: '结果矩阵与朴素算法逐块相等：Strassen 改变的是运算的"账目"，不是答案。',
      conclusion: '7 次乘法 + 18 次加减，换来与 8 次乘法完全一致的结果。',
      pseudocode: { lines: strassenCode, active: [6, 7] },
    },
  }
  yield { t: 'step' }

  // 拍 11：递归对比与结论
  yield { t: 'scene', scene: matrixScene('matA', '矩阵 A（块视角）', a, () => 'default', undefined, '递归到底时，块就是标量') }
  yield { t: 'scene', scene: matrixScene('matB', '矩阵 B（块视角）', b, () => 'default', undefined, '递归到底时，块就是标量') }
  yield { t: 'scene', scene: matrixScene('matC', '矩阵 C（Strassen 结果）', c, () => 'sorted', (row, col) => `C 块 ${blockName('C', row, col)}=${c[row][col]}`, '答案不变，账目变了') }
  yield {
    t: 'metrics',
    metrics: [
      ...metrics(),
      { label: 'n=1024 乘法量级', value: '10.7亿 → 2.8亿', tone: 'green' },
    ],
  }
  yield {
    t: 'message',
    step: {
      title: '递归对比：8 分支 Θ(n³) vs 7 分支 Θ(n^2.807)',
      tab: '递归对比',
      formula: String.raw`T(n)=7T(n/2)+\Theta(n^2)\Rightarrow\Theta(n^{\log_2 7})\approx\Theta(n^{2.807})`,
      formulaHint: '块乘法逐层递归：分支数才是指数的来源。',
      equation: String.raw`8T(n/2)+\Theta(n^2)\Rightarrow\Theta(n^3)\quad vs\quad 7T(n/2)+\Theta(n^2)\Rightarrow\Theta(n^{2.807})`,
      invariant: '两种递归答对同一道题：变的只是每层的分支数 8 → 7。',
      note: 'n=1024 时标量乘法约 10.7 亿 → 2.8 亿（≈3.8 倍差距）。后续改进：Winograd 变体、Coppersmith–Winograd（指数≈2.37）——指数更低但常数巨大，实践少用。',
      prediction: {
        prompt: '递归拆到 1×1 标量时，还该继续用 Strassen 吗？',
        options: ['该：Strassen 处处都比朴素快', '不该：n 很小时 10 次加减的开销超过省下的乘法，工程实现会在阈值以下切回朴素乘法', '无所谓：两种一样快'],
        answer: 1,
        explanation: 'Θ 记号藏了常数：小规模时 18 次加减比 1 次乘法更贵。真实矩阵库都在阈值以下切回朴素乘法——渐近优势只在 n 足够大时兑现。',
      },
      conclusion: '省下的不是一次乘法，是一条递归分支——指数就这样被撬动。',
      pseudocode: { lines: strassenCode, active: [] },
    },
  }
  yield { t: 'step' }
}

const buildStrassenTrace = (example: StrassenExample): Trace => recordTrace('SANDBOX 16 · STRASSEN', '先把 8 次块乘法拆开看，再用 10 次加减换来 7 次乘法——少一条递归分支，指数就此改变。', runStrassen(example.a, example.b))

const strassenInsight: DesignInsight = {
  observation: '2×2 分块乘法的 8 个乘积有冗余：先用 10 次加减把块组合进 S1..S10，7 个精心设计的乘积 M1..M7 就足以拼出全部四个 C 块——乘法是递归的种子，加减只是账面成本。',
  contrasts: [
    { alternative: '朴素分块乘法', whyNot: '8 次块乘法直接对应四个公式，最好理解也好实现；但递归指数 log₂8=3，大矩阵上被 7 分支的 Strassen 反超。' },
    { alternative: 'Coppersmith–Winograd 一系极限算法', whyNot: '指数更低（≈2.37），但常数与实现复杂度巨大，实践中反而不用——渐近最优 ≠ 工程最优。' },
  ],
  transfer: { prompt: '递归式 T(n)=aT(n/2)+Θ(n²)：指数由什么决定？', options: ['log₂a：分支数每 +1，指数就抬高一点', '由 Θ(n²) 的系数决定', '由矩阵大小 n 决定'], answer: 0, explanation: '主方法：f(n) 与 n^log₂a 同阶时 T(n)=Θ(n^log₂a · log n)。Strassen 把 a 从 8 压到 7，指数从 3 降到 2.807。' },
}

const strassenComplexity: ComplexityProfileData = {
  title: 'Strassen：省一次乘法，降一级指数',
  subtitle: '两种分块乘法答对同一道题，差别只在每层的递归分支数。',
  cases: [
    { label: '朴素分块', complexity: 'Θ(n³)', condition: 'T(n)=8T(n/2)+Θ(n²)：每层 8 个子问题。', example: 'n=1024：约 10.7 亿次标量乘法', explanation: 'log₂8=3，主方法直接给出三次方。', tone: 'method' },
    { label: 'Strassen', complexity: 'Θ(n^2.807)', condition: 'T(n)=7T(n/2)+Θ(n²)：每层 7 个子问题。', example: 'n=1024：约 2.8 亿次（≈3.8 倍差距）', explanation: 'log₂7≈2.807；加减次数从 4 涨到 18，被指数优势覆盖。', tone: 'method' },
    { label: '工程实现', complexity: '阈值混合', condition: 'n 小于阈值（几十到几百）切回朴素，只在大矩阵走 Strassen。', example: 'BLAS 类矩阵库的常用做法', explanation: '数值稳定性与常数开销让纯 Strassen 不划算——渐近优势要够大才兑现。', tone: 'method' },
  ],
  footer: '指数并未止步：Winograd 变体把加减再压缩，Coppersmith–Winograd 及后续工作把指数推到 ≈2.37——但常数太大，实用仍是 Strassen 阈值混合。',
}

export function StrassenLesson() {
  const [exampleId, setExampleId] = useState(strassenExamples[0].id)
  const example = strassenExamples.find(item => item.id === exampleId) ?? strassenExamples[0]
  const trace = buildStrassenTrace(example)
  const playback = useLessonPlayback(trace.steps.length)
  return <LessonShell eyebrow={trace.eyebrow} title={trace.steps[playback.step].title} description={trace.description} steps={trace.steps.map(item => item.tab ?? '推演')} step={playback.step} onStepChange={playback.setStep} playing={playback.playing} onTogglePlaying={playback.togglePlaying} onReplay={playback.replay} speed={playback.speed} onCycleSpeed={playback.cycleSpeed} complexity={strassenComplexity} examplePicker={<ExamplePicker examples={strassenExamples} value={exampleId} onChange={id => { playback.reset(); setExampleId(id) }} />}>
    <TracePlayer trace={trace} step={playback.step} />
    <DesignNotes insight={strassenInsight} />
  </LessonShell>
}
