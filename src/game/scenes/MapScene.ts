import { Container, Graphics } from 'pixi.js'
import type { Game, GameScene } from '../core/app'
import { C, makePanel, makeText, SPACE } from '../core/ui'
import { lyOf, nextMilestone, rankOf } from '../core/xp'
import { gameLevels } from '../levels'
import { loadSave } from '../save'
import { CommandScene } from './CommandScene'
import { LevelScene } from './LevelScene'

/** 王国地图：区域、关卡节点、解锁与奖章进度。 */
export class MapScene implements GameScene {
  readonly container = new Container()

  constructor(private game: Game) {
    const save = loadSave()
    makeText(this.container, 44, 44, '算法星域 · 太阳邻域', { size: 30, weight: '800', color: SPACE.text })
    makeText(this.container, 44, 88, '把能量矩阵整理有序，逐段驶向真实的恒星。步数和比较次数，就是你的航行战绩。', { size: 13, color: SPACE.muted })
    const totalVariants = gameLevels.reduce((count, item) => count + item.variants.length, 0)
    const doneVariants = Object.keys(save).length
    const ly = lyOf(save, gameLevels)
    const rank = rankOf(ly)
    const milestone = nextMilestone(ly)
    makeText(this.container, 642, 44, `航行里程 ${ly.toFixed(2)} 光年`, { size: 13, color: SPACE.text, family: 'ui-monospace, Menlo, monospace' })
    makeText(this.container, 642, 66, `称号：${rank.title}`, { size: 11, color: SPACE.muted, family: 'ui-monospace, Menlo, monospace' })
    makeText(this.container, 24, 410, milestone ? `下一站：${milestone.note}（还需 ${(milestone.at - ly).toFixed(2)} 光年）` : '太阳邻域四大航段全部点亮。', { size: 12, color: SPACE.muted })

    makePanel(this.container, 44, 124, 872, 96, { stroke: C.purpleBorder, fill: C.purpleBg })
    makeText(this.container, 64, 142, '任务控制 · 国科大雁栖湖', { size: 15, weight: '800', color: C.purple })
    makeText(this.container, 64, 166, '绿色货架代表"已整理区"——它就是插入排序的循环不变量：每次拿起新牌、放回正确的洞，不变量都向前长大一格。奖章只看一件事：你有没有靠撤销过关。博学笃志，格物明德。', { size: 12, color: C.muted, wordWrap: 830, lineHeight: 19 })

    gameLevels.forEach((level, index) => {
      const next = gameLevels[index + 1] ?? null
      const unlocked = index === 0 || gameLevels[index - 1].variants.some(variant => save[variant.id])
      const node = new Container()
      node.position.set(24 + index * 234, 252)
      this.container.addChild(node)
      makePanel(node, 0, 0, 220, 152, { stroke: unlocked ? C.border : 0x3a4d6b, fill: unlocked ? 0xffffff : 0x101a29, radius: 12 })
      makeText(node, 18, 16, String(index + 1), { size: 15, color: unlocked ? C.blue : C.muted, family: 'ui-monospace, Menlo, monospace', weight: '800' })
      makeText(node, 64, 17, unlocked ? level.destination : '', { size: 10, color: C.muted })
      makeText(node, 46, 16, unlocked ? '' : '未解锁', { size: 11, color: C.faint })
      makeText(node, 18, 46, level.title, { size: 17, weight: '800', color: unlocked ? C.ink : SPACE.text })
      makeText(node, 18, 74, level.kind === 'command' ? `[指令卡] ${level.variants.length} 项挑战` : `${level.variants.length} 个挑战`, { size: 11, color: unlocked ? C.muted : C.muted })
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
      makeText(node, 18, 126, unlocked ? '进入关卡 →' : '完成前一航段后解锁', { size: 11, color: unlocked ? C.blue : C.muted, weight: '700' })
      if (unlocked) {
        node.eventMode = 'static'
        node.cursor = 'pointer'
        node.on('pointerdown', () => this.game.switch(g => level.kind === 'execute' ? new LevelScene(g, level, next) : new CommandScene(g, level, next), `启航 → ${level.destination}`))
      }
    })

    makeText(this.container, 44, 446, '三个 DLC 在校准中：深场（深度学习与 Transformer）· 巡天（机器学习原理与应用）· 盖亚（模式识别经典算法）。', { size: 12, color: SPACE.muted })
  }

  destroy() {
    this.container.destroy({ children: true })
  }
}
