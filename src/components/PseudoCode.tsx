export type PseudoLine = { code: string; note?: string }

type PseudoCodeProps = {
  lines: readonly PseudoLine[]
  active: readonly number[]
  label?: string
}

/**
 * VisuAlgo-style code trace: each step records which pseudocode lines run,
 * and the panel highlights exactly those lines. Lines are short CLRS-style
 * fragments; the measurement formula stays in the equation box.
 */
export function PseudoCode({ lines, active, label = '伪代码：当前执行到哪一行' }: PseudoCodeProps) {
  return <div className="pseudo-code" role="img" aria-label={label}>
    {lines.map((line, index) => <span key={index} className={['pseudo-line', active.includes(index) ? 'active' : ''].filter(Boolean).join(' ')} title={line.note}><i>{String(index + 1).padStart(2, '0')}</i><code>{line.code}</code></span>)}
  </div>
}
