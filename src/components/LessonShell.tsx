import { useRef } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import { Pause, Play, RotateCcw, SkipBack, SkipForward } from 'lucide-react'
import { Gauge } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ComplexityProfile, type ComplexityProfileData } from '@/components/ComplexityProfile'
import { Progress } from '@/components/ui/progress'

type LessonShellProps = {
  eyebrow: string
  title: string
  description: string
  steps: string[]
  step: number
  onStepChange: (step: number) => void
  playing: boolean
  onTogglePlaying: () => void
  onReplay: () => void
  complexity: ComplexityProfileData
  examplePicker?: ReactNode
  /** Optional playback-speed cycling surfaced by useLessonPlayback. */
  speed?: number
  onCycleSpeed?: () => void
  children: ReactNode
}

export function LessonShell({ eyebrow, title, description, steps, step, onStepChange, playing, onTogglePlaying, onReplay, complexity, examplePicker, speed, onCycleSpeed, children }: LessonShellProps) {
  const stepRefs = useRef<Array<HTMLButtonElement | null>>([])
  const focusStep = (next: number) => {
    onStepChange(next)
    requestAnimationFrame(() => stepRefs.current[next]?.focus())
  }
  const handleStepKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const next = event.key === 'ArrowRight' || event.key === 'ArrowDown'
      ? Math.min(index + 1, steps.length - 1)
      : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
        ? Math.max(index - 1, 0)
        : event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? steps.length - 1
            : index
    if (next !== index) {
      event.preventDefault()
      focusStep(next)
    }
  }

  return (
    <section className="lesson-shell">
      <div className="lesson-header">
        <div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2><p className="lesson-description">{description}</p></div>
        <div className="lesson-index"><span>STEP</span><strong>{String(step + 1).padStart(2, '0')}</strong><small>/ {String(steps.length).padStart(2, '0')}</small></div>
      </div>
      <div className="lesson-controls" role="group" aria-label={`${title}步骤控制`}>
        <div className="lesson-step-list" role="tablist" aria-label={`${title}步骤`}>
          {steps.map((label, index) => <Button key={label} ref={element => { stepRefs.current[index] = element }} type="button" role="tab" tabIndex={index === step ? 0 : -1} aria-selected={index === step} variant={index === step ? 'default' : 'ghost'} size="sm" className="lesson-step" onClick={() => onStepChange(index)} onKeyDown={event => handleStepKeyDown(event, index)}>{String(index + 1).padStart(2, '0')} {label}</Button>)}
        </div>
        <div className="lesson-actions">
          <Button variant="outline" size="sm" aria-label="上一步" disabled={step === 0} onClick={() => onStepChange(step - 1)}><SkipBack size={15} />上一步</Button>
          <Button size="sm" aria-label="下一步" disabled={step === steps.length - 1} onClick={() => onStepChange(step + 1)}><SkipForward size={15} />下一步</Button>
          <Button variant="outline" size="sm" onClick={onTogglePlaying}>{playing ? <Pause size={15} /> : <Play size={15} />}{playing ? '暂停' : '自动播放'}</Button>
          {onCycleSpeed ? <Button variant="outline" size="sm" aria-label="切换播放速度" onClick={onCycleSpeed}><Gauge size={15} />{speed ?? 1}×</Button> : null}
          <Button variant="ghost" size="sm" onClick={onReplay}><RotateCcw size={15} />重播</Button>
        </div>
      </div>
      <Progress className="lesson-progress" value={(step / Math.max(1, steps.length - 1)) * 100} aria-label="教学进度" />
      {examplePicker}
      {children}
      <ComplexityProfile profile={complexity} />
    </section>
  )
}
