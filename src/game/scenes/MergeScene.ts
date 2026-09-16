import { Container, Rectangle } from 'pixi.js'
import type { Game, GameScene } from '../core/app'
import { makeLevelChrome, overlayDim, countersRow, CellRowView, drawMilestones, levelHeading, type CellRowCell } from '../core/level-ui'
import { C, makeButton, makePanel, makeText } from '../core/ui'
import { initMerge, mergePick, mergeMedal } from '../sim'
import { loadSave, saveRecord } from '../save'
import { lyOf } from '../core/xp'
import { t, zh, medalName, type LevelId } from '../locale'
import type { GameLevel, MergeLevel } from '../types'
import { openLevel } from '../core/open'
import { gameLevels } from '../levels'
import { MapScene } from './MapScene'

const QUEUE_X = 60
const QUEUE_Y = 190
const OUT_X = 24
const OUT_Y = 330
const CELL = 46
const GAP = 6

/** 归并关：两股有序恒星流，每次只能取队首，光度小者先入列——汇合不变量的身体感受。 */
export class MergeScene implements GameScene {
  readonly container = new Container()
  private leftRail: CellRowView
  private rightRail: CellRowView
  private outRail: CellRowView
  private dynamic: Container
  private state = initMerge([])
  private savedKeys = new Set<string>()
  private flashTimer: number | null = null
  private keyHandler: (event: KeyboardEvent) => void

  constructor(private game: Game, private level: MergeLevel, private rest: readonly GameLevel[]) {
    const text = zh.level[this.level.id as LevelId]
    const chrome = makeLevelChrome(this.container, { title: levelHeading(text), brief: text.brief, algo: level.algo, onBack: () => this.backToMap() })
    this.leftRail = new CellRowView({ x: QUEUE_X, y: QUEUE_Y })
    this.rightRail = new CellRowView({ x: QUEUE_X, y: QUEUE_Y + 64 })
    this.outRail = new CellRowView({ x: OUT_X, y: OUT_Y })
    this.dynamic = chrome.dynamic
    chrome.container.addChild(this.leftRail.container, this.rightRail.container, this.outRail.container)

    makeText(chrome.container, 24, 160, t('ui.leftStream'), { size: 12, color: C.muted, family: 'ui-monospace, Menlo, monospace' })
    makeText(chrome.container, 24, 238, t('ui.rightStream'), { size: 12, color: C.muted, family: 'ui-monospace, Menlo, monospace' })
    makeText(chrome.container, 24, 300, t('ui.mergeOutput'), { size: 11, color: C.faint })

    this.leftRail.container.eventMode = 'static'
    this.leftRail.container.cursor = 'pointer'
    this.leftRail.container.hitArea = new Rectangle(QUEUE_X - 8, QUEUE_Y - 12, 420, CELL + 24)
    this.leftRail.container.on('pointerdown', () => this.pick('left'))
    this.rightRail.container.eventMode = 'static'
    this.rightRail.container.cursor = 'pointer'
    this.rightRail.container.hitArea = new Rectangle(QUEUE_X - 8, QUEUE_Y + 52, 420, CELL + 24)
    this.rightRail.container.on('pointerdown', () => this.pick('right'))

    this.keyHandler = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const key = event.key.toLowerCase()
      if (key === 'l') this.pick('left')
      if (key === 'r') this.pick('right')
    }
    window.addEventListener('keydown', this.keyHandler)
    this.state = initMerge(level.variants[0].cells)
    this.refresh(level)
  }

  private pick(side: 'left' | 'right') {
    const { state, ok } = mergePick(this.state, side)
    this.state = state
    if (!ok) this.flashReject(side)
    this.refresh(this.level)
  }

  private flashReject(side: 'left' | 'right') {
    const rail = side === 'left' ? this.leftRail : this.rightRail
    rail.container.x += 6
    window.setTimeout(() => { rail.container.x -= 6 }, 90)
  }

  private refresh(level: MergeLevel) {
    const state = this.state
    const toCell = (card: { id: string; value: number }, tone: CellRowCell['tone']) => ({ id: card.id, value: card.value, tone })
    const leftCells = state.left.map((card, index) => toCell(card, index === 0 ? 'focus' : 'default'))
    const rightCells = state.right.map((card, index) => toCell(card, index === 0 ? 'focus' : 'default'))
    const outCells = state.out.map(card => toCell(card, 'sorted'))
    this.leftRail.setState(leftCells)
    this.rightRail.setState(rightCells)
    this.outRail.setState(outCells)

    this.dynamic.removeChildren().forEach(child => child.destroy({ children: true }))
    countersRow(this.dynamic, 420, [
      { text: t('ui.takeCount', { n: state.attempts, m: level.par.attempts }) },
      { text: t('ui.mergedCount', { n: state.out.length, m: state.out.length + state.left.length + state.right.length }), color: C.green },
    ])

    if (state.done) this.drawWin(level)
  }

  private drawWin(level: MergeLevel) {
    const medal = mergeMedal(this.state.attempts, level.par.attempts)
    const saveBefore = loadSave()
    const previous = saveBefore[level.variants[0].id]
    const medalRank = { bronze: 1, silver: 2, gold: 3 } as const
    let finalSave = saveBefore
    if (!previous || medalRank[medal] >= medalRank[previous.medal]) {
      finalSave = { ...saveBefore, [level.variants[0].id]: { medal, moves: this.state.attempts, compares: this.state.out.length } }
      saveRecord(finalSave)
    }
    if (this.savedKeys.has(level.id)) return
    this.savedKeys.add(level.id)
    const oldLy = lyOf(saveBefore, gameLevels)
    const newLy = lyOf(finalSave, gameLevels)
    const lyGained = Math.round((newLy - oldLy) * 100) / 100

    overlayDim(this.dynamic)
    makePanel(this.dynamic, 200, 130, 560, 290, { stroke: C.greenBorder, fill: 0xf0fbf6 })
    makeText(this.dynamic, 232, 158, `${t('ui.mergeWinLine', { medal: medalName(medal), n: this.state.attempts })} · ${t('ui.lyGain', { ly: lyGained.toFixed(2) })}`, { size: 19, color: C.green, weight: '800' })
    makeText(this.dynamic, 232, 200, t('ui.mergeWinRule', { n: this.state.out.length + this.state.left.length + this.state.right.length }), { size: 13, color: C.ink, wordWrap: 500, lineHeight: 20 })
    const hintY = drawMilestones(this.dynamic, 232, 248, oldLy, newLy)
    makeText(this.dynamic, 232, hintY + 4, this.state.attempts <= level.par.attempts ? t('ui.mergeWinPerfect') : t('ui.mergeWinMiss'), { size: 12, color: C.muted, wordWrap: 500 })
    makeButton(this.dynamic, { x: 232, y: hintY + 96 > 340 ? 340 : hintY + 96, w: 120, label: t('ui.mergeAgain'), variant: 'outline', onTap: () => { this.state = initMerge(level.variants[0].cells); this.refresh(level) } })
    if (this.rest.length > 0) makeButton(this.dynamic, { x: 368, y: hintY + 96 > 340 ? 340 : hintY + 96, w: 120, label: t('ui.nextLevel'), variant: 'solid', onTap: () => openLevel(this.game, this.rest[0], this.rest.slice(1)) })
    makeButton(this.dynamic, { x: this.rest.length > 0 ? 504 : 368, y: hintY + 96 > 340 ? 340 : hintY + 96, w: 120, label: t('ui.backToMap'), variant: 'ghost', onTap: () => this.backToMap() })
  }

  private backToMap() {
    this.game.switch(g => new MapScene(g), t('ui.backTransit'))
  }

  destroy() {
    window.removeEventListener('keydown', this.keyHandler)
    this.container.destroy({ children: true })
  }
}
