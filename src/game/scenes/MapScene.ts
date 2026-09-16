import { Container, Graphics } from 'pixi.js'
import type { Game, GameScene } from '../core/app'
import { C, makePanel, makeText, SPACE } from '../core/ui'
import { rankOf, engineOf, nextMilestone, lyOf } from '../core/xp'
import { gameLevels } from '../levels'
import { loadSave } from '../save'
import { openLevel } from '../core/open'
import { t, zh, type LevelId } from '../locale'
import { CommandScene } from './CommandScene'
import { LevelScene } from './LevelScene'

/** 王国地图：区域、关卡节点、解锁与奖章进度。文案全部走词表。 */
export class MapScene implements GameScene {
  readonly container = new Container()

  constructor(private game: Game) {
    const save = loadSave()
    makeText(this.container, 44, 44, t('map.title'), { size: 30, weight: '800', color: SPACE.text })
    makeText(this.container, 44, 88, t('map.intro'), { size: 13, color: SPACE.muted })
    const ly = lyOf(save, gameLevels)
    const rank = rankOf(ly)
    const engine = engineOf(ly)
    const milestone = nextMilestone(ly)
    makeText(this.container, 936, 44, t('map.lyReadout', { ly: ly.toFixed(2) }), { size: 13, color: SPACE.text, family: 'ui-monospace, Menlo, monospace', anchorX: 1 })
    makeText(this.container, 936, 66, t('map.rankEngine', { rank: zh.rank[rank].title, engine: zh.engine[engine].name, speed: zh.engine[engine].speed }), { size: 11, color: SPACE.muted, family: 'ui-monospace, Menlo, monospace', anchorX: 1 })
    const milestoneLabel = milestone
      ? milestone.kind === 'rank' ? zh.rank[milestone.id].title : `${zh.engine[milestone.id].name}（${zh.engine[milestone.id].speed}）`
      : ''
    makeText(this.container, 24, 558, milestone ? t('map.milestone', { label: milestoneLabel, ly: (milestone.at - ly).toFixed(2) }) : t('map.allLit'), { size: 12, color: SPACE.muted })

    makePanel(this.container, 24, 124, 912, 96, { stroke: C.purpleBorder, fill: C.purpleBg })
    makeText(this.container, 44, 142, t('map.taskControl'), { size: 15, weight: '800', color: C.purple })
    makeText(this.container, 44, 166, t('map.taskControlBody'), { size: 12, color: C.muted, wordWrap: 880, lineHeight: 19 })

    gameLevels.forEach((level, index) => {
      const unlocked = index === 0 || gameLevels[index - 1].variants.some(variant => save[variant.id])
      const node = new Container()
      node.position.set(24 + (index % 3) * 320, index < 3 ? 244 : 408)
      this.container.addChild(node)
      makePanel(node, 0, 0, 290, 148, { stroke: unlocked ? C.border : 0x3a4d6b, fill: unlocked ? 0xffffff : 0x101a29, radius: 12 })
      makeText(node, 18, 16, String(index + 1), { size: 15, color: unlocked ? C.blue : C.muted, family: 'ui-monospace, Menlo, monospace', weight: '800' })
      const text = zh.level[level.id as LevelId]
      makeText(node, 64, 17, unlocked ? text.destination : '', { size: 10, color: C.muted })
      makeText(node, 46, 16, unlocked ? '' : t('map.lockedShort'), { size: 11, color: C.faint })
      makeText(node, 18, 46, text.title, { size: 17, weight: '800', color: unlocked ? C.ink : SPACE.text })
      makeText(node, 18, 74, level.kind === 'command' ? t('map.commandChallenge', { n: level.variants.length }) : t('map.challengeCount', { n: level.variants.length }), { size: 11, color: unlocked ? C.muted : C.muted })
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
      makeText(node, 18, 126, unlocked ? t('map.enter') : t('map.locked'), { size: 11, color: unlocked ? C.blue : C.muted, weight: '700' })
      if (unlocked) {
        node.eventMode = 'static'
        node.cursor = 'pointer'
        node.on('pointerdown', () => openLevel(this.game, level, gameLevels.slice(index + 1)))
      }
    })

    makeText(this.container, 24, 578, t('map.dlc'), { size: 12, color: SPACE.faint })
  }

  destroy() {
    this.container.destroy({ children: true })
  }
}
