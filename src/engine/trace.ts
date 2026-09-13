import type { PredictionData } from '@/components/PredictionPrompt'
import type { PseudoLine } from '@/components/PseudoCode'
import type { LegendItem } from '@/components/LegendStrip'
import type { MetricItem } from '@/components/CalcDesk'

/**
 * 演示数据格式（Trace Format）v1
 *
 * 一节课 = 一条 Trace（可 JSON 序列化）：算法生成器产出事件流，recordTrace 把
 * 事件折叠成 TraceStep 快照序列，TracePlayer 是唯一渲染器。
 * 语义色调全站统一：focus=当前处理、key=暂存键、pivot=主元/分界、
 * sorted=已确定、target=目标/候选、muted=已排除。
 */

export type Tone = 'default' | 'focus' | 'key' | 'pivot' | 'sorted' | 'target' | 'muted'
export type PointerTone = 'dark' | 'blue' | 'orange' | 'green' | 'purple' | 'yellow'
export type RegionTone = 'blue' | 'orange' | 'green' | 'purple' | 'yellow'

/** 所有 label 都必须是 string | number，保证 Trace 可以原样存成 JSON。 */
export type SceneCell = { id: string; label: string | number; caption?: string; tone?: Tone }

export type PointerTag = { id: string; index: number; label: string; tone?: PointerTone }
export type RegionLabel = { id: string; from: number; to: number; label: string; tone?: RegionTone }

export type ArrayScene = {
  kind: 'array'
  id: string
  label?: string
  indexes?: boolean
  cells: SceneCell[]
  pointers?: PointerTag[]
  regions?: RegionLabel[]
}

/** 按层组织的树（堆、递归树）；null 表示该层该位的空位。 */
export type TreeScene = {
  kind: 'tree'
  id: string
  label?: string
  levels: (SceneCell | null)[][]
  gaps?: number[]
}

export type BucketBox = { id: string; label: string; range?: string; cells: SceneCell[] }
export type BucketScene = {
  kind: 'buckets'
  id: string
  label?: string
  buckets: BucketBox[]
}

export type MatrixScene = {
  kind: 'matrix'
  id: string
  label?: string
  rows: SceneCell[][]
  caption?: string
}

export type BarItem = { id: string; display: string; value: number; caption?: string; tone?: Tone }
export type BarScene = {
  kind: 'bars'
  id: string
  label?: string
  max?: number
  unit?: string
  bars: BarItem[]
}

export type ShapeShape =
  | { shape: 'line'; id: string; x1: number; y1: number; x2: number; y2: number; tone?: RegionTone; dashed?: boolean; width?: number }
  | { shape: 'circle'; id: string; x: number; y: number; r: number; tone?: Tone | RegionTone; label?: string; labelDy?: number }
  | { shape: 'rect'; id: string; x: number; y: number; w: number; h: number; tone?: Tone | RegionTone; opacity?: number; dashed?: boolean }
  | { shape: 'text'; id: string; x: number; y: number; text: string; tone?: Tone | RegionTone; size?: number }
  | { shape: 'path'; id: string; d: string; tone?: RegionTone; dashed?: boolean }

/** 通用 SVG 画布（点集、函数曲线、条带区域等自定义几何）。 */
export type ShapeScene = {
  kind: 'shapes'
  id: string
  label?: string
  width: number
  height: number
  shapes: ShapeShape[]
}

export type Scene = ArrayScene | TreeScene | BucketScene | MatrixScene | BarScene | ShapeScene

export type MoveSpec = {
  kind: 'one-way' | 'swap' | 'up' | 'down'
  title: string
  moves: { token: string; from?: string; to?: string }[]
  verdict?: string
  note?: string
}

export type JudgeEntry = { left: string; op: string; right: string; holds: boolean; action: string }
export type JudgeSpec = { title?: string; entries: JudgeEntry[]; note?: string }

export type StabilitySpec = {
  title?: string
  statement: string
  before: string[]
  after: string[]
  stable: boolean
  note?: string
}

export type TraceStep = {
  /** 步骤标题（LessonShell 的大标题）。 */
  title: string
  /** 步进标签页短文案；缺省用 "01/02/…"。 */
  tab?: string
  question?: string
  formula: string
  formulaHint?: string
  scenes: Scene[]
  legend?: LegendItem[]
  moves?: MoveSpec
  judge?: JudgeSpec
  stability?: StabilitySpec
  metrics: MetricItem[]
  equation?: string
  invariant?: string
  pseudocode?: { lines: readonly PseudoLine[]; active: readonly number[] }
  note?: string
  conclusion: string
  prediction?: PredictionData
}

export type Trace = {
  eyebrow: string
  description: string
  steps: TraceStep[]
}
