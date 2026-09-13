import type { ReactNode } from 'react'
import { ArrowDown, ArrowLeftRight, ArrowRight, ArrowUp } from 'lucide-react'

export type MoveKind = 'one-way' | 'swap' | 'up' | 'down'

export type MoveEntry = { token: string; from?: string; to?: string }

type MoveCalloutProps = {
  title: string
  /** `one-way` renders →, a true swap renders ⇄; pick the one the operation really is. */
  kind?: MoveKind
  moves: readonly MoveEntry[]
  /** One sentence: why the element is allowed to move (the comparison it won/lost). */
  verdict?: string
  note?: string
}

const moveIcons: Record<MoveKind, ReactNode> = {
  'one-way': <ArrowRight size={15} aria-hidden="true" />,
  swap: <ArrowLeftRight size={15} aria-hidden="true" />,
  up: <ArrowUp size={15} aria-hidden="true" />,
  down: <ArrowDown size={15} aria-hidden="true" />,
}

/**
 * Directional value flow with the actual numbers riding the arrow (AGENTS.md
 * exchange rule). Compose one callout per teaching beat; arrows must match the
 * real operation: one-way for partition/merge/shift, swap only for true swaps.
 */
export function MoveCallout({ title, kind = 'one-way', moves, verdict, note }: MoveCalloutProps) {
  return <section className="exchange-callout move-callout">
    <span>{title}</span>
    <div className="exchange-flow">
      {moves.map((move, index) => <span className="move-flow" key={[index, move.token, move.from ?? '', move.to ?? ''].join('-')}>
        {move.from ? <span className="exchange-flow-label">{move.from}</span> : null}
        <b>{move.token}</b>
        {moveIcons[kind]}
        {move.to ? <span className="exchange-flow-label">{move.to}</span> : null}
      </span>)}
    </div>
    {verdict ? <b className="move-verdict">判断依据：{verdict}</b> : null}
    {note ? <small>{note}</small> : null}
  </section>
}
