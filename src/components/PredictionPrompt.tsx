import { useEffect, useId, useState } from 'react'
import { Check, Lightbulb, RotateCcw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

export type PredictionData = {
  prompt: string
  options: string[]
  answer: number
  explanation: string
}

type PredictionPromptProps = PredictionData

export function PredictionPrompt({ prompt, options, answer, explanation }: PredictionPromptProps) {
  const [selected, setSelected] = useState<number | null>(null)
  const titleId = useId()
  const answered = selected !== null
  const correct = selected === answer

  useEffect(() => setSelected(null), [prompt])

  return (
    <section className={`prediction-card ${answered ? (correct ? 'is-correct' : 'is-incorrect') : ''}`} aria-labelledby={titleId}>
      <div className="prediction-heading">
        <div className="prediction-icon" aria-hidden="true"><Lightbulb size={16} /></div>
        <div>
          <span className="prediction-kicker">先猜一步</span>
          <h3 id={titleId}>{prompt}</h3>
        </div>
      </div>
      <div className="prediction-options" role="group" aria-label="预测答案">
        {options.map((option, index) => (
          <button
            key={[index, option].join('-')}
            type="button"
            className="prediction-option"
            aria-pressed={selected === index}
            onClick={() => setSelected(index)}
          >
            <span>{String.fromCharCode(65 + index)}</span>{option}
          </button>
        ))}
      </div>
      {answered && (
        <div className="prediction-feedback" role="status">
          <strong>{correct ? <><Check size={15} />判断正确</> : <><X size={15} />先记住这个反例</>}</strong>
          <span>{explanation}</span>
          {!correct && <Button type="button" variant="ghost" size="sm" onClick={() => setSelected(null)}><RotateCcw size={14} />再想一次</Button>}
        </div>
      )}
    </section>
  )
}
