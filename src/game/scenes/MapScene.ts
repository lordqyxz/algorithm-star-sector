import { Container, Graphics } from 'pixi.js'
import type { Game, GameScene } from '../core/app'
import { C, makePanel, makeText } from '../core/ui'
import { gameLevels } from '../levels'
import { loadSave } from '../save'
import { LevelScene } from './LevelScene'

/** 王国地图：区域、关卡节点、解锁与奖章进度。 */
export class MapScene implements GameScene {
  readonly container = new Container()

  constructor(private game: Game) {
    const save = loadSave()
    makeText(this.container, 44, 44, '算法王国 · 排序平原', { size: 30, weight: '800' })
    makeText(this.container, 44, 88, '你是驿站的新分拣员：亲手把货架整理有序。步数和比较次数就是你的复杂度成绩单。', { size: 13, color: C.muted })
    const doneVariants = Object.keys(save).length
    makeText(this.container, 742, 50, `进度 ${doneVariants}/6`, { size: 13, color: C.muted, family: 'ui-monospace, Menlo, monospace' })

    makePanel(this.container, 44, 124, 872, 96, { stroke: C.purpleBorder, fill: C.purpleBg })
    makeText(this.container, 64, 142, '中央广场 · 算法学院', { size: 15, weight: '800', color: C.purple })
    makeText(this.container, 64, 166, '绿色货架代表"已整理区"——它就是插入排序的循环不变量：每次拿起新牌、放回正确的洞，不变量都向前长大一格。奖章只看一件事：你有没有靠撤销过关。', { size: 12, color: C.muted, wordWrap: 830, lineHeight: 19 })

    gameLevels.forEach((level, index) => {
      const unlocked = index === 0 || gameLevels[index - 1].variants.some(variant => save[variant.id])
      const node = new Container()
      node.position.set(44 + index * 300, 252)
      this.container.addChild(node)
      makePanel(node, 0, 0, 268, 152, { stroke: unlocked ? C.border : 0xe1e7ef, fill: 0xffffff, radius: 12, alpha: unlocked ? 1 : 0.55 })
      makeText(node, 18, 16, String(index + 1), { size: 15, color: unlocked ? C.blue : C.faint, family: 'ui-monospace, Menlo, monospace', weight: '800' })
      makeText(node, 46, 16, unlocked ? '' : '未解锁', { size: 11, color: C.faint })
      makeText(node, 18, 46, level.title, { size: 17, weight: '800', color: unlocked ? C.ink : C.faint })
      makeText(node, 18, 74, `${level.variants.length} 个挑战 · ${level.brief.slice(0, 14)}…`, { size: 11, color: unlocked ? C.muted : C.faint })
      level.variants.forEach((variant, variantIndex) => {
        const record = save[variant.id]
        const medalColor = record ? (record.medal === 'gold' ? 0xf2c85d : record.medal === 'silver' ? 0xd9e0ea : 0xe0a979) : 0xe1e7ef
        const dot = new Graphics()
        dot.circle(0, 0, 6)
        dot.fill({ color: medalColor })
        dot.stroke({ width: 1, color: record ? 0x8a99ad : 0xcbd5e2 })
        dot.position.set(18 + variantIndex * 20, 108)
        node.addChild(dot)
      })
      makeText(node, 18, 126, '进入关卡 →', { size: 11, color: unlocked ? C.blue : C.faint, weight: '700' })
      if (unlocked) {
        node.eventMode = 'static'
        node.cursor = 'pointer'
        node.on('pointerdown', () => this.game.switch(g => new LevelScene(g, index)))
      }
    })

    makeText(this.container, 44, 446, '更多区域（归并城堡、快速比武场、堆雪山）在后续版本开放。', { size: 12, color: C.faint })
  }

  destroy() {
    this.container.destroy({ children: true })
  }
}
