import { useRef } from 'react'
import { animate, stagger } from 'animejs'
import { Formula } from '@/components/Formula'
import { ArrayView } from '@/components/ArrayView'
import { CalcDesk } from '@/components/CalcDesk'
import { CompareJudge } from '@/components/CompareJudge'
import { FormulaReadout, ConclusionBox } from '@/components/FormulaReadout'
import { LegendStrip } from '@/components/LegendStrip'
import { MoveCallout } from '@/components/MoveCallout'
import { PredictionPrompt } from '@/components/PredictionPrompt'
import { StabilityExample } from '@/components/StabilityExample'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useStepScene } from '@/hooks/useStepScene'
import type { BarScene, BucketScene, MatrixScene, Scene, ShapeScene, Trace, TreeScene } from '@/engine/trace'

const shapeColors: Record<string, string> = {
  default: '#172235', focus: '#2f60d6', key: '#b27800', pivot: '#d96643',
  sorted: '#12866d', target: '#7659d5', muted: '#9aa8ba',
  blue: '#2f60d6', orange: '#d96643', green: '#12866d', purple: '#7659d5', yellow: '#b27800',
}

function TreeView({ scene }: { scene: TreeScene }) {
  return <div className="heap-tree" aria-label={scene.label}>
    {scene.levels.map((level, levelIndex) => <div className="heap-level" key={levelIndex} style={scene.gaps ? { gap: scene.gaps[levelIndex] ? `${scene.gaps[levelIndex]}px` : undefined } : undefined}>
      {level.map((cell, cellIndex) => cell
        ? <span key={cell.id} className={`heap-node ${cell.tone && cell.tone !== 'default' ? cell.tone : ''}`} title={cell.caption}>{cell.label}</span>
        : <span key={`empty-${levelIndex}-${cellIndex}`} className="heap-node empty" aria-hidden="true" />)}
    </div>)}
  </div>
}

function BucketView({ scene }: { scene: BucketScene }) {
  return <div className="bucket-strip" aria-label={scene.label}>
    {scene.buckets.map(bucket => <div className="bucket-row" key={bucket.id}>
      <span className="bucket-label">{bucket.label}{bucket.range ? <small>{bucket.range}</small> : null}</span>
      <span className="bucket-box">{bucket.cells.length > 0 ? bucket.cells.map(cell => <span key={cell.id} className={`data-cell ${cell.tone && cell.tone !== 'default' ? cell.tone : ''}`} title={cell.caption}>{cell.label}</span>) : <span className="bucket-empty">空</span>}</span>
    </div>)}
  </div>
}

function MatrixView({ scene }: { scene: MatrixScene }) {
  return <figure className="matrix-figure" aria-label={scene.label}>
    <div className="matrix-grid" style={{ gridTemplateColumns: `repeat(${scene.rows[0]?.length ?? 1}, minmax(0, 1fr))` }}>
      {scene.rows.flatMap((row, rowIndex) => row.map((cell, cellIndex) => <span key={cell.id} className={`matrix-cell ${cell.tone && cell.tone !== 'default' ? cell.tone : ''}`} title={cell.caption}>{cell.label}</span>))}
    </div>
    {scene.caption ? <figcaption>{scene.caption}</figcaption> : null}
  </figure>
}

function BarView({ scene }: { scene: BarScene }) {
  const max = scene.max ?? Math.max(...scene.bars.map(bar => bar.value), 1)
  return <div className="mini-bars" aria-label={scene.label}>
    {scene.bars.map(bar => <div key={bar.id} className={`mini-bar ${bar.tone && bar.tone !== 'default' ? bar.tone : ''}`} title={bar.caption}>
      <b>{bar.display}</b>
      <i style={{ height: `${Math.max(4, (bar.value / max) * 108)}px` }} />
      {bar.caption ? <span>{bar.caption}</span> : null}
    </div>)}
    {scene.unit ? <span className="bar-unit">{scene.unit}</span> : null}
  </div>
}

function ShapeView({ scene }: { scene: ShapeScene }) {
  const color = (tone?: string) => shapeColors[tone ?? 'default'] ?? shapeColors.default
  return <svg className="point-canvas" viewBox={`0 0 ${scene.width} ${scene.height}`} role="img" aria-label={scene.label}>
    {scene.shapes.map(shape => {
      switch (shape.shape) {
        case 'line': return <line key={shape.id} x1={shape.x1} y1={shape.y1} x2={shape.x2} y2={shape.y2} stroke={color(shape.tone)} strokeWidth={shape.width ?? 2} strokeDasharray={shape.dashed ? '6 5' : undefined} />
        case 'rect': return <rect key={shape.id} x={shape.x} y={shape.y} width={shape.w} height={shape.h} rx={4} fill={color(shape.tone)} opacity={shape.opacity ?? 0.18} stroke={shape.dashed ? color(shape.tone) : undefined} strokeDasharray={shape.dashed ? '5 4' : undefined} />
        case 'circle': return <g key={shape.id}><circle cx={shape.x} cy={shape.y} r={shape.r} fill={color(shape.tone)} stroke="#fff" strokeWidth={2} />{shape.label ? <text className="shape-label" x={shape.x - 10} y={shape.y + (shape.labelDy ?? -14)} fill={color('default')}>{shape.label}</text> : null}</g>
        case 'text': return <text key={shape.id} className="shape-label" x={shape.x} y={shape.y} fontSize={shape.size ?? 13} fill={color(shape.tone)}>{shape.text}</text>
        case 'path': return <path key={shape.id} d={shape.d} fill="none" stroke={color(shape.tone)} strokeWidth={2.5} strokeDasharray={shape.dashed ? '6 5' : undefined} />
      }
    })}
  </svg>
}

function renderScene(scene: Scene) {
  switch (scene.kind) {
    case 'array': return <ArrayView cells={scene.cells} ariaLabel={scene.label} indexes={scene.indexes} pointers={scene.pointers} regions={scene.regions} />
    case 'tree': return <TreeView scene={scene} />
    case 'buckets': return <BucketView scene={scene} />
    case 'matrix': return <MatrixView scene={scene} />
    case 'bars': return <BarView scene={scene} />
    case 'shapes': return <ShapeView scene={scene} />
  }
}

/**
 * 唯一的演示渲染器：输入一条 Trace 和当前步号，输出完整教学画布。
 * 所有课程共享同一套布局顺序与视觉语言；课程文件只负责产出数据。
 */
export function TracePlayer({ trace, step }: { trace: Trace; step: number }) {
  const state = trace.steps[step]
  const scopeRef = useRef<HTMLDivElement>(null)
  useStepScene(scopeRef, () => {
    if (scopeRef.current?.querySelector('.data-cell.focus')) animate('.data-cell.focus', { scale: [0.9, 1], opacity: [0.5, 1], duration: 420, delay: stagger(30), ease: 'out(3)' })
    if (scopeRef.current?.querySelector('.heap-node.active')) animate('.heap-node.active', { scale: [0.86, 1], opacity: [0.5, 1], duration: 420, ease: 'out(3)' })
    if (scopeRef.current?.querySelector('.pseudo-line.active')) animate('.pseudo-line.active', { opacity: [0.4, 1], duration: 340, ease: 'out(3)' })
  }, [step])
  const [primary, ...rest] = state.scenes
  if (step === trace.steps.length - 1 && trace.steps.length > 1) {
    const summary = state.summary ?? {}
    return <div ref={scopeRef} className="lesson-canvas">
      <div className="summary-hero"><p className="eyebrow">SANDBOX SUMMARY</p><h3>{summary.headline ?? state.title}</h3></div>
      <div className="summary-verdict"><b>结论</b><span>{summary.verdict ?? state.conclusion}</span></div>
      <div className="summary-stats">{(summary.stats ?? state.metrics).map(metric => <div key={metric.label} className={['metric', metric.tone ? `metric-${metric.tone}` : ''].filter(Boolean).join(' ')}><span>{metric.label}</span><strong>{metric.value}</strong></div>)}</div>
      {state.formula ? <div className="summary-formula"><Formula latex={state.formula} display /></div> : null}
      {state.prediction ? <PredictionPrompt {...state.prediction} /> : null}
    </div>
  }
  return <div ref={scopeRef} className="lesson-canvas">
    <FormulaReadout question={state.question ?? '这一步，公式记录了什么？'} latex={state.formula} hint={state.formulaHint} />
    <div className="lesson-grid">
      <Card>
        <CardHeader><CardTitle>{primary.label ?? '演示区'}</CardTitle></CardHeader>
        <CardContent>
          {renderScene(primary)}
          {state.legend ? <LegendStrip items={state.legend} /> : null}
          {state.moves ? <MoveCallout kind={state.moves.kind} title={state.moves.title} moves={state.moves.moves} verdict={state.moves.verdict} note={state.moves.note} /> : null}
          {state.judge ? <CompareJudge title={state.judge.title} entries={state.judge.entries} note={state.judge.note} /> : null}
          {state.stability ? <StabilityExample title={state.stability.title} statement={state.stability.statement} before={state.stability.before} after={state.stability.after} stable={state.stability.stable} note={state.stability.note} /> : null}
        </CardContent>
      </Card>
      <CalcDesk metrics={state.metrics} equation={state.equation} invariant={state.invariant} pseudocode={state.pseudocode} note={state.note} />
    </div>
    {rest.length > 0 && <div className="scene-row">{rest.map(scene => <Card key={scene.id}><CardHeader><CardTitle>{scene.label ?? scene.id}</CardTitle></CardHeader><CardContent>{renderScene(scene)}</CardContent></Card>)}</div>}
    {state.prediction ? <PredictionPrompt {...state.prediction} /> : null}
    <ConclusionBox>{state.conclusion}</ConclusionBox>
  </div>
}
