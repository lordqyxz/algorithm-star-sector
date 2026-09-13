import type { ReactNode } from 'react'
import { Formula } from '@/components/Formula'

/**
 * The "formula reads the visual" strip shared by every lesson: a fixed question,
 * the LaTeX measurement of the current step, and an optional hint that points
 * back at the on-screen evidence.
 */
export function FormulaReadout({ question = '这一步，公式记录了什么？', latex, hint, className }: { question?: string; latex: string; hint?: string; className?: string }) {
  return <div className={['formula-readout', className].filter(Boolean).join(' ')}>
    <span>{question}</span>
    <Formula latex={latex} display />
    {hint ? <small>{hint}</small> : null}
  </div>
}

export function ConclusionBox({ children }: { children: ReactNode }) {
  return <div className="conclusion-box">{children}</div>
}
