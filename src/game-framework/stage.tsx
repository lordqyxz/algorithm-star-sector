/**
 * 算法王国游戏框架 · 舞台层
 *
 * Actor = 身份稳定的格位实体：React 按 id 持久化 DOM 节点，位置变化只改
 * transform，由 CSS transition 自动补间（reduced-motion 时全局媒体查询会把
 * 过渡压到近零）。这就是"移动真实数字"的引擎化落地：状态里只有逻辑位置。
 */
import type { CSSProperties, ReactNode } from 'react'

export type StageActor = {
  /** 稳定身份；跨帧相同的 id 会被补间移动而不是重建。 */
  id: string
  /** 逻辑格位（0 起）。 */
  col: number
  row?: number
  /** 语义外观：复用 game-cell 的色调类（sorted/key/hole 等）。 */
  kind?: string
  label: ReactNode
  caption?: string
  title?: string
}

type StageProps = {
  cols: number
  rows?: number
  cellSize?: number
  gap?: number
  actors: readonly StageActor[]
  /** 静态空位（洞）：不参与补间的占位格。 */
  slots?: readonly { col: number; row?: number; kind?: string; label?: ReactNode }[]
  ariaLabel?: string
}

export function Stage({ cols, rows = 1, cellSize = 46, gap = 7, actors, slots = [], ariaLabel }: StageProps) {
  const at = (col: number, row: number): CSSProperties => ({ transform: `translate(${col * (cellSize + gap)}px, ${row * (cellSize + gap)}px)`, width: cellSize, height: cellSize })
  return <div className="gf-stage" role="img" aria-label={ariaLabel} style={{ width: cols * (cellSize + gap) - gap, height: rows * (cellSize + gap) - gap }}>
    {slots.map((slot, index) => <span key={`slot-${index}`} className={`gf-actor gf-slot ${slot.kind ?? ''}`} style={at(slot.col, slot.row ?? 0)} aria-hidden="true">{slot.label ?? ''}</span>)}
    {actors.map(actor => <span key={actor.id} className={`gf-actor ${actor.kind ?? ''}`} style={at(actor.col, actor.row ?? 0)} title={actor.title}>
      {actor.label}
      {actor.caption ? <small>{actor.caption}</small> : null}
    </span>)}
  </div>
}
