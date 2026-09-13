import { renderToString } from 'katex'
import 'katex/dist/katex.min.css'
import { cn } from '@/lib/utils'

type FormulaProps = {
  latex: string
  display?: boolean
  className?: string
  ariaLabel?: string
}

/**
 * The single math entry point for lessons. Keep the source as LaTeX so a new
 * lesson only has to describe the expression, not hand-build markup for it.
 */
export function Formula({ latex, display = false, className, ariaLabel }: FormulaProps) {
  const html = renderToString(latex, {
    displayMode: display,
    output: 'htmlAndMathml',
    throwOnError: false,
    strict: 'ignore',
    trust: false,
  })

  return <span className={cn('formula-katex', display && 'formula-katex-display', className)} aria-label={ariaLabel} data-latex={latex} dangerouslySetInnerHTML={{ __html: html }} />
}
