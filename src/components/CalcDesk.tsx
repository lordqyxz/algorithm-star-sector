import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Formula } from '@/components/Formula'
import { PseudoCode, type PseudoLine } from '@/components/PseudoCode'
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
 * The right-hand calculation desk shared by all lessons: live counters and the
 * formula stay visible on every beat (渐进式披露的常驻层)；pseudocode, invariant
 * and note fold into a collapsible evidence drawer so mid-beats stay focused.
 */
export function CalcDesk({ title = '计算台', metrics = [], equation, invariant, pseudocode, note }: CalcDeskProps) {
  const [evidenceOpen, setEvidenceOpen] = useState(false)
  const evidenceParts = [invariant ? '不变量' : null, pseudocode ? `伪代码 ${pseudocode.lines.length} 行` : null, note ? '注解' : null].filter(Boolean)
  const hasEvidence = evidenceParts.length > 0
  return <Card>
    <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
    <CardContent>
      {metrics.length > 0 && <div className="metric-list">{metrics.map(metric => <Metric key={metric.label} label={metric.label} value={metric.value} tone={metric.tone} />)}</div>}
      {equation ? <div className="equation-box"><Formula latex={equation} /></div> : null}
      {hasEvidence ? <>
        <button type="button" className="evidence-toggle" aria-expanded={evidenceOpen} onClick={() => setEvidenceOpen(open => !open)}>
          <ChevronDown size={14} className={evidenceOpen ? 'evidence-chevron open' : 'evidence-chevron'} aria-hidden="true" />
          推演依据：{evidenceParts.join(' · ')}
        </button>
        {evidenceOpen ? <div className="evidence-body">
          {invariant ? <p className="calc-invariant"><b>不变量</b>{invariant}</p> : null}
          {pseudocode ? <PseudoCode lines={pseudocode.lines} active={pseudocode.active} /> : null}
          {note ? <p className="muted-copy">{note}</p> : null}
        </div> : null}
      </> : null}
    </CardContent>
  </Card>
}
