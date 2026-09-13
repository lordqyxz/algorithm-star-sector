import { ArrowLeftRight, ArrowRight } from 'lucide-react'

type StabilityExampleProps = {
  title?: string
  statement: string
  /** Identity tokens such as `4A`, `4B` before the operation. */
  before: readonly string[]
  after: readonly string[]
  stable: boolean
  note?: string
}

/**
 * The shared stability checkpoint: duplicates carry distinct identities so the
 * learner can *see* order being kept or broken, not just read about it.
 */
export function StabilityExample({ title = '稳定性检查：相等键的身份', statement, before, after, stable, note }: StabilityExampleProps) {
  return <section className={['stability-example', stable ? 'is-stable' : 'is-unstable'].join(' ')}>
    <span>{title}</span>
    <div className="stability-sequence">
      {before.map(token => <b key={`before-${token}`} className="stability-token">{token}</b>)}
      {stable ? <ArrowRight size={15} aria-hidden="true" /> : <ArrowLeftRight size={15} aria-hidden="true" />}
      {after.map(token => <b key={`after-${token}`} className="stability-token">{token}</b>)}
      <span className="stability-order-note">{stable ? 'A→B 保持为 A→B' : 'A→B 可能变成 B→A'}</span>
    </div>
    <small>{statement}{note ? ` ${note}` : ''}</small>
  </section>
}
