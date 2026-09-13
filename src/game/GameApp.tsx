import { useState } from 'react'
import { Lock, Map as MapIcon, Route, Sparkles, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ExecuteLevelScreen } from '@/game/ExecuteLevel'
import { gameLevels } from '@/game/levels'
import { loadSave, saveRecord } from '@/game/save'
import type { SaveData, SaveRecord } from '@/game/types'

/** 《算法王国》M0：地图 + 操演关。世界层只是壳，规则全部在模拟层。 */
export function GameApp({ onOpenCodex }: { onOpenCodex?: () => void }) {
  const [save, setSave] = useState<SaveData>(() => loadSave())
  const [activeLevel, setActiveLevel] = useState<string | null>(null)
  const levelIndex = gameLevels.findIndex(item => item.id === activeLevel)
  const level = levelIndex >= 0 ? gameLevels[levelIndex] : null
  const isUnlocked = (index: number) => index === 0 || gameLevels[index - 1].variants.some(variant => save[variant.id])
  const totalVariants = gameLevels.reduce((count, item) => count + item.variants.length, 0)
  const doneVariants = Object.keys(save).length
  const handleSave = (variantId: string, record: SaveRecord) => {
    setSave(current => {
      const next = { ...current, [variantId]: record }
      saveRecord(next)
      return next
    })
  }
  const resetProgress = () => {
    if (window.confirm('确定清空全部奖章进度吗？')) { setSave({}); saveRecord({}) }
  }

  if (level) {
    return <ExecuteLevelScreen level={level} save={save} onSave={handleSave} onBack={() => setActiveLevel(null)} onNext={levelIndex + 1 < gameLevels.length ? () => setActiveLevel(gameLevels[levelIndex + 1].id) : undefined} />
  }

  return <section className="game-screen">
    <div className="game-screen-header">
      <div>
        <p className="eyebrow">ALGORITHMIA · SORTING PLAINS</p>
        <h2>算法王国 · 排序平原</h2>
        <p className="game-brief">你是驿站的新分拣员：亲手把货架整理有序。步数和比较次数就是你的复杂度成绩单。</p>
      </div>
      <div className="game-header-actions">
        <span className="game-progress">进度 {doneVariants}/{totalVariants}</span>
        <Button variant="ghost" size="sm" aria-label="清空进度" onClick={resetProgress}><Trash2 size={15} />清空进度</Button>
      </div>
    </div>
    <Card className="game-plaza">
      <CardContent>
        <div className="game-plaza-head"><Sparkles size={17} /><strong>中央广场 · 算法学院</strong></div>
        <p>绿色货架代表"已整理区"——它就是插入排序的<b>循环不变量</b>：每次拿起新牌、放回正确的洞，不变量都向前长大一格。奖章只看一件事：你有没有靠撤销过关。想看算法的逐拍推演与设计思路，去学院的<b>沙盘推演</b>室。</p>
        {onOpenCodex ? <Button variant="outline" size="sm" onClick={onOpenCodex}>进入学院 · 打开沙盘推演</Button> : null}
      </CardContent>
    </Card>
    <div className="game-map" aria-label="区域地图">
      {gameLevels.map((item, index) => {
        const unlocked = isUnlocked(index)
        return <div className="game-map-item" key={item.id}>
          {index > 0 ? <span className="game-map-link" aria-hidden="true">→</span> : null}
          <button type="button" className={`game-node ${unlocked ? '' : 'locked'}`} disabled={!unlocked} aria-label={`进入关卡 ${item.title}`} onClick={() => setActiveLevel(item.id)}>
            <span className="game-node-head"><b>{index + 1}</b>{unlocked ? <MapIcon size={15} /> : <Lock size={15} />}</span>
            <strong>{item.title}</strong>
            <small>{item.variants.length} 个挑战</small>
            <span className="game-node-medals">
              {item.variants.map(variant => { const record = save[variant.id]; return <i key={variant.id} className={`medal-dot ${record ? record.medal : 'none'}`} title={variant.label} /> })}
            </span>
          </button>
        </div>
      })}
    </div>
    <p className="game-map-foot"><Route size={14} />更多区域（归并城堡、快速比武场、堆雪山）在后续版本开放。</p>
  </section>
}
