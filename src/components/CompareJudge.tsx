import { Check, X } from 'lucide-react'

export type CompareEntry = {
  left: string
  op: string
  right: string
  holds: boolean
  action: string
}

type CompareJudgeProps = {
  title?: string
  entries: readonly CompareEntry[]
  note?: string
}

/**
 * The judgment basis: every movement of an element is licensed by a comparison
 * shown here — pair, operator, outcome badge, and the action it caused.
 */
export function CompareJudge({ title = '比较判断：这一步为什么移动', entries, note }: CompareJudgeProps) {
  return <section className="compare-judge">
    <span>{title}</span>
    <div className="judge-rows">
      {entries.map((entry, index) => <div className="judge-row" key={[index, entry.left, entry.op, entry.right, entry.action].join('-')}>
        <b>{entry.left}</b><code>{entry.op}</code><b>{entry.right}</b>
        <span className={`judge-verdict ${entry.holds ? 'go' : 'stay'}`}>{entry.holds ? <Check size={14} aria-hidden="true" /> : <X size={14} aria-hidden="true" />}{entry.action}</span>
      </div>)}
    </div>
    {note ? <small>{note}</small> : null}
  </section>
}
