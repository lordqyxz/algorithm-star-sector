import { useEffect, useState } from 'react'
import { ArrowRight, CornerDownRight, MousePointerClick, RotateCcw, Scale, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DesignNotes } from '@/components/DesignNotes'
import { ExamplePicker } from '@/components/ExamplePicker'
import { PredictionPrompt } from '@/components/PredictionPrompt'
import type { ExecuteCommand, ExecuteLevel, MedalTone, SaveData, SaveRecord } from '@/game/types'
import { canExecute, commandLabels, foldExecute, initialExecuteState, medalFor, medalNames } from '@/game/sim'

const medalRank: Record<MedalTone, number> = { bronze: 1, silver: 2, gold: 3 }

type ExecuteLevelProps = {
  level: ExecuteLevel
  save: SaveData
  onSave: (variantId: string, record: SaveRecord) => void
  onBack: () => void
  onNext?: () => void
}

export function ExecuteLevelScreen({ level, save, onSave, onBack, onNext }: ExecuteLevelProps) {
  const [variantId, setVariantId] = useState(level.variants[0].id)
  const variant = level.variants.find(item => item.id === variantId) ?? level.variants[0]
  const [commands, setCommands] = useState<ExecuteCommand[]>([])
  const [undoCount, setUndoCount] = useState(0)
  const [answeredPredictions, setAnsweredPredictions] = useState<string[]>([])
  const state = foldExecute(variant, commands)

  useEffect(() => { setCommands([]); setUndoCount(0) }, [variantId])
  useEffect(() => {
    if (!state.done) return
    const medal = medalFor(undoCount)
    const previous = save[variant.id]
    if (!previous || medalRank[medal] > medalRank[previous.medal]) onSave(variant.id, { medal, moves: state.moves, compares: state.compares })
  }, [state.done]) // eslint-disable-line react-hooks/exhaustive-deps

  const run = (command: ExecuteCommand['type']) => {
    if (!canExecute(state, command)) return
    setCommands(log => [...log, { type: command } as ExecuteCommand])
  }
  const undo = () => {
    if (commands.length === 0) return
    setCommands(log => log.slice(0, -1))
    setUndoCount(count => count + 1)
  }
  const restart = () => { setCommands([]); setUndoCount(0) }
  const gateVisible = variant.prediction && !answeredPredictions.includes(variant.id) && (variant.prediction.when === 'done' ? state.done : state.compares >= 1)
  const verdictText = state.verdict === 'greater'
    ? `${state.cells[(state.hole ?? 1) - 1].value} > ${state.held?.value}：左邻更大，要给它让位`
    : state.verdict === 'less-equal'
      ? `${state.cells[(state.hole ?? 1) - 1].value} ≤ ${state.held?.value}：找到位置，可以放下`
      : state.hole === 0 && state.held
        ? '洞已到最左端：免比较，直接放下（这就是 while i>0 的短路边界）'
        : '还没有比较结论：先"与左邻比较"，再决定右移还是放下'

  return <section className="game-screen">
    <div className="game-screen-header">
      <div>
        <p className="eyebrow">SORTING PLAINS · {level.title}</p>
        <h2>{level.title}</h2>
        <p className="game-brief">{level.brief}</p>
      </div>
      <div className="game-header-actions">
        {onNext ? <Button variant="outline" size="sm" onClick={onNext}>下一关</Button> : null}
        <Button variant="outline" size="sm" onClick={onBack}>返回地图</Button>
      </div>
    </div>
    <ExamplePicker examples={level.variants.map(item => ({ id: item.id, label: item.label, detail: item.detail }))} value={variantId} onChange={setVariantId} />
    <Card>
      <CardContent>
        <div className="game-hand" aria-label="手上的牌">
          <span className="game-hand-label">手</span>
          {state.held
            ? <span key={state.held.id} className="game-cell key">{state.held.value}</span>
            : <span className="game-cell empty">空</span>}
          <span className="game-hand-hint">{state.held ? '洞在货架上的虚线格' : '点「拿起下一张」取走绿色区右侧第一张牌'}</span>
        </div>
        <div className="game-shelf" aria-label="货架">
          {state.cells.map((cell, index) => {
            const isHole = state.hole === index
            const isSorted = index < state.sortedCount && !isHole
            return <span key={cell.id} className={['game-cell', isHole ? 'hole' : isSorted ? 'sorted' : ''].filter(Boolean).join(' ')} aria-label={`第 ${index + 1} 格${isHole ? '（洞）' : isSorted ? '（已整理）' : ''}`}>{isHole ? '' : cell.value}</span>
          })}
        </div>
        <p className={`game-verdict ${state.verdict ? `is-${state.verdict}` : ''}`} role="status">{verdictText}</p>
        <div className="game-controls" role="group" aria-label="动作">
          <Button size="sm" disabled={!canExecute(state, 'pick')} onClick={() => run('pick')}><MousePointerClick size={15} />{commandLabels.pick}</Button>
          <Button size="sm" disabled={!canExecute(state, 'compare')} onClick={() => run('compare')}><Scale size={15} />{commandLabels.compare}</Button>
          <Button size="sm" disabled={!canExecute(state, 'shift')} onClick={() => run('shift')}><ArrowRight size={15} />{commandLabels.shift}</Button>
          <Button size="sm" disabled={!canExecute(state, 'drop')} onClick={() => run('drop')}><CornerDownRight size={15} />{commandLabels.drop}</Button>
          <Button variant="outline" size="sm" disabled={commands.length === 0} onClick={undo}><RotateCcw size={15} />撤销（{undoCount}）</Button>
          <Button variant="ghost" size="sm" onClick={restart}>重开本关</Button>
        </div>
        <div className="game-counters">
          <span><b>⚡ 步数</b>{state.moves} <small>/ 最优 {variant.par.moves}</small></span>
          <span><b>🔍 比较</b>{state.compares} <small>/ 最优 {variant.par.compares}</small></span>
          <span><b>已整理</b>{state.sortedCount} / {state.cells.length}</span>
        </div>
        {gateVisible && variant.prediction ? <PredictionPrompt {...variant.prediction} /> : null}
        {state.done && variant.insight ? <DesignNotes insight={variant.insight} /> : null}
        {state.done ? (
          <div className="game-win" role="status">
            <div className="game-win-medal"><Trophy size={18} /><strong>{medalNames[medalFor(undoCount)]}</strong><span>用了 {undoCount} 次撤销</span></div>
            <p>⚡ {state.moves} 步（最优 {variant.par.moves}） · 🔍 {state.compares} 次比较（最优 {variant.par.compares}）</p>
            <small>{state.moves === variant.par.moves && state.compares === variant.par.compares ? '完美复现标准插入排序的动作数！' : '对照理论最优想一想：差距发生在哪几张牌上？'}</small>
            <div className="game-win-actions">
              <Button variant="outline" size="sm" onClick={restart}>再玩一次</Button>
              {onNext ? <Button size="sm" onClick={onNext}>下一关</Button> : <Button size="sm" onClick={onBack}>返回地图</Button>}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  </section>
}
