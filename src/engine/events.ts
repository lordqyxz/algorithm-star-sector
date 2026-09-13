import type { MetricItem } from '@/components/CalcDesk'
import type { LegendItem } from '@/components/LegendStrip'
import type { ArrayScene, BarItem, Scene, SceneCell, Tone, Trace, TraceStep } from '@/engine/trace'

/**
 * 事件流 → 演示数据。算法写成纯生成器，逐步 yield 事件；
 * `step` 事件把当前场景快照 + 叙事封存为一个 TraceStep。
 * 场景快照是深拷贝，事件之后再改场景不影响已封存的步骤。
 */
export type TraceEvent =
  | { t: 'scene'; scene: Scene }
  | { t: 'cells'; scene: string; cells: SceneCell[] }
  | { t: 'cell'; scene: string; index: number; label?: string | number; caption?: string | null; tone?: Tone }
  | { t: 'pointers'; scene: string; pointers: ArrayScene['pointers'] }
  | { t: 'regions'; scene: string; regions: ArrayScene['regions'] }
  | { t: 'swap'; scene: string; i: number; j: number }
  | { t: 'bucket'; scene: string; bucket: string; cells: SceneCell[] }
  | { t: 'bars'; scene: string; bars: BarItem[] }
  | { t: 'metrics'; metrics: MetricItem[] }
  | { t: 'legend'; legend: LegendItem[] }
  | { t: 'message'; step: Omit<TraceStep, 'scenes' | 'metrics' | 'legend'> }
  | { t: 'step' }

type ArraySceneMut = Extract<Scene, { kind: 'array' }>

function cloneScene(scene: Scene): Scene {
  switch (scene.kind) {
    case 'array':
      return { ...scene, cells: scene.cells.map(cell => ({ ...cell })), pointers: scene.pointers?.map(tag => ({ ...tag })), regions: scene.regions?.map(region => ({ ...region })) }
    case 'tree':
      return { ...scene, levels: scene.levels.map(level => level.map(cell => (cell ? { ...cell } : null))) }
    case 'buckets':
      return { ...scene, buckets: scene.buckets.map(bucket => ({ ...bucket, cells: bucket.cells.map(cell => ({ ...cell })) })) }
    case 'matrix':
      return { ...scene, rows: scene.rows.map(row => row.map(cell => ({ ...cell }))) }
    case 'bars':
      return { ...scene, bars: scene.bars.map(bar => ({ ...bar })) }
    case 'shapes':
      return { ...scene, shapes: scene.shapes.map(shape => ({ ...shape })) }
  }
}

export function recordTrace(eyebrow: string, description: string, events: Iterable<TraceEvent>): Trace {
  const scenes = new Map<string, Scene>()
  let metrics: MetricItem[] = []
  let legend: LegendItem[] | undefined
  let pending: Omit<TraceStep, 'scenes' | 'metrics' | 'legend'> | null = null
  const steps: TraceStep[] = []
  const seal = () => {
    if (pending) steps.push({ ...pending, scenes: [...scenes.values()].map(cloneScene), metrics, legend })
    pending = null
  }
  for (const event of events) {
    switch (event.t) {
      case 'scene': scenes.set(event.scene.id, cloneScene(event.scene)); break
      case 'cells': {
        const scene = scenes.get(event.scene)
        if (scene?.kind === 'array') scene.cells = event.cells.map(cell => ({ ...cell }))
        break
      }
      case 'cell': {
        const scene = scenes.get(event.scene)
        if (scene?.kind === 'array' && scene.cells[event.index]) {
          const cell = { ...scene.cells[event.index] }
          if (event.label !== undefined) cell.label = event.label
          if (event.caption !== undefined) cell.caption = event.caption ?? undefined
          if (event.tone !== undefined) cell.tone = event.tone
          scene.cells[event.index] = cell
        }
        break
      }
      case 'pointers': {
        const scene = scenes.get(event.scene)
        if (scene?.kind === 'array') scene.pointers = event.pointers?.map(tag => ({ ...tag }))
        break
      }
      case 'regions': {
        const scene = scenes.get(event.scene)
        if (scene?.kind === 'array') scene.regions = event.regions?.map(region => ({ ...region }))
        break
      }
      case 'swap': {
        const scene = scenes.get(event.scene)
        if (scene?.kind === 'array') {
          const cells = scene.cells.slice()
          const cell = { ...cells[event.i] }
          cells[event.i] = { ...cells[event.j] }
          cells[event.j] = cell
          scene.cells = cells
        }
        break
      }
      case 'bucket': {
        const scene = scenes.get(event.scene)
        if (scene?.kind === 'buckets') scene.buckets = scene.buckets.map(bucket => (bucket.id === event.bucket ? { ...bucket, cells: event.cells.map(cell => ({ ...cell })) } : bucket))
        break
      }
      case 'bars': {
        const scene = scenes.get(event.scene)
        if (scene?.kind === 'bars') scene.bars = event.bars.map(bar => ({ ...bar }))
        break
      }
      case 'metrics': metrics = event.metrics; break
      case 'legend': legend = event.legend; break
      case 'message': pending = event.step; break
      case 'step': seal(); break
    }
  }
  seal()
  return { eyebrow, description, steps }
}

/** 重复值获得 A/B/C 身份后缀；返回带稳定 seed 的令牌，供场景单元与 React key 复用。 */
export function tokenize(values: readonly number[]): { value: number; tag?: string; seed: number }[] {
  const counts = new Map<number, number>()
  values.forEach(value => counts.set(value, (counts.get(value) ?? 0) + 1))
  const seen = new Map<number, number>()
  return values.map((value, seed) => {
    const duplicated = (counts.get(value) ?? 0) > 1
    const letter = String.fromCharCode(65 + (seen.get(value) ?? 0))
    seen.set(value, (seen.get(value) ?? 0) + 1)
    return { value, tag: duplicated ? `${value}${letter}` : undefined, seed }
  })
}

export function tokenLabel(token: { value: number; tag?: string }) {
  return token.tag ?? String(token.value)
}

export function cellsOfTokens(tokens: readonly { value: number; tag?: string; seed: number }[], tone?: Tone | ((token: { value: number; tag?: string; seed: number }, index: number) => Tone | undefined), caption?: (token: { value: number; tag?: string; seed: number }, index: number) => string | undefined): SceneCell[] {
  return tokens.map((token, index) => ({
    id: `t${token.seed}`,
    label: tokenLabel(token),
    caption: caption?.(token, index),
    tone: typeof tone === 'function' ? tone(token, index) : tone,
  }))
}

export function arrayScene(id: string, label: string, cells: SceneCell[], extra: Partial<ArraySceneMut> = {}): ArraySceneMut {
  return { kind: 'array', id, label, cells, ...extra }
}
