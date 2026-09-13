import type { CSSProperties, ReactNode } from 'react'

export type DataCellTone = 'default' | 'focus' | 'key' | 'pivot' | 'sorted' | 'target' | 'muted'

export type DataCell = {
  /** Stable identity across steps (for example `4A`); React keys must reuse it. */
  id: string
  label: ReactNode
  caption?: string
  tone?: DataCellTone
}

export type PointerTag = { index: number; label: string; tone?: 'dark' | 'blue' | 'orange' | 'green' | 'purple' | 'yellow' }
export type RegionLabel = { from: number; to: number; label: string; tone?: 'blue' | 'orange' | 'green' | 'purple' | 'yellow' }

type ArrayViewProps = {
  cells: readonly DataCell[]
  ariaLabel?: string
  /** Show position numbers 1..n under the cells (CLRS pseudocode is 1-based). */
  indexes?: boolean
  /** Pointer chips (lo/mid/hi, i/j) rendered above the row. */
  pointers?: readonly PointerTag[]
  /** Non-overlapping inclusive ranges rendered as labeled brackets below the row. */
  regions?: readonly RegionLabel[]
}

const slotColumns = (count: number): CSSProperties => ({ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` })

/**
 * The shared array view: one row of identity-stable cells with optional pointer
 * chips, index numbers, and region brackets. Every array-based lesson composes
 * it instead of re-inventing chips, so colors and semantics stay identical.
 */
export function ArrayView({ cells, ariaLabel, indexes = false, pointers = [], regions = [] }: ArrayViewProps) {
  const count = Math.max(1, cells.length)
  return <div className="data-view" role="img" aria-label={ariaLabel}>
    {pointers.length > 0 && <div className="data-row" style={slotColumns(count)}>{Array.from({ length: count }, (_, index) => <span className="data-slot" key={index}>{pointers.filter(tag => tag.index === index).map(tag => <span key={tag.label} className={`pointer-chip ${tag.tone ?? 'dark'}`}>{tag.label}</span>)}</span>)}</div>}
    <div className="data-row" style={slotColumns(count)}>{cells.map(cell => <span key={cell.id} className={['data-cell', cell.tone && cell.tone !== 'default' ? cell.tone : ''].filter(Boolean).join(' ')}>{cell.label}{cell.caption ? <small>{cell.caption}</small> : null}</span>)}</div>
    {indexes && <div className="data-row" style={slotColumns(count)}>{cells.map((cell, index) => <span className="data-index" key={cell.id}>{index + 1}</span>)}</div>}
    {regions.length > 0 && <div className="data-row" style={slotColumns(count)}>{regions.map((region, index) => <span key={[index, region.label].join('-')} className={`data-region ${region.tone ?? 'blue'}`} style={{ gridColumn: `${region.from + 1} / ${region.to + 2}` }}>{region.label}</span>)}</div>}
  </div>
}
