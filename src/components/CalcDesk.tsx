import { Formula } from '@/components/Formula'
import type { PseudoLine } from '@/components/PseudoCode'
import { PseudoCode } from '@/components/PseudoCode'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export type MetricItem = { label: string; value: string | number; tone?: 'blue' | 'green' | 'orange' | 'purple' }

/** One live counter; the value must be readable somewhere on the canvas. */
export function Metric({ label, value, tone }: MetricItem) {
  return <div className={['metric', tone ? `metric-${tone}` : ''].filter(Boolean).join(' ')}><span>{label}</span><strong>{value}</strong></div>
}

type CalcDeskProps = {
  title?: string
  metrics?: readonly MetricItem[]
  /** LaTeX measurement of the current visual state. */
  equation?: string
  /** The quantity this step leaves unchanged (loop invariant). */
  invariant?: string
  pseudocode?: { lines: readonly PseudoLine[]; active: readonly number[] }
  note?: string
}

/**
 * The right-hand calculation desk shared by all lessons: live counters on top,
 * the formula measured from the visual, the loop invariant, the code trace, and
 * one-line explanation — always in this order, so every lesson reads the same.
 */
export function CalcDesk({ title = '计算台', metrics = [], equation, invariant, pseudocode, note }: CalcDeskProps) {
  return <Card>
    <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
    <CardContent>
      {metrics.length > 0 && <div className="metric-list">{metrics.map(metric => <Metric key={metric.label} label={metric.label} value={metric.value} tone={metric.tone} />)}</div>}
      {equation ? <div className="equation-box"><Formula latex={equation} /></div> : null}
      {invariant ? <p className="calc-invariant"><b>不变量</b>{invariant}</p> : null}
      {pseudocode ? <PseudoCode lines={pseudocode.lines} active={pseudocode.active} /> : null}
      {note ? <p className="muted-copy">{note}</p> : null}
    </CardContent>
  </Card>
}
