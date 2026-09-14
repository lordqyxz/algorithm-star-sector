import { Container, Graphics, Rectangle, Text } from 'pixi.js'
import { animate } from 'animejs'
import type { Game, GameScene } from '../core/app'
import { makeLevelChrome, overlayDim, countersRow, ShelfView, type ShelfCell } from '../core/level-ui'
import { C, makeButton, makePanel, makeText, SPACE } from '../core/ui'
import { initMerge, mergePick, mergeMedal, medalNames } from '../sim'
import { loadSave, saveRecord } from '../save'
import type { GameLevel, MergeLevel } from '../types'
import { openLevel } from '../core/open'
import { MapScene } from './MapScene'

const QUEUE_X = 60
const QUEUE_Y = 190
const OUT_X = 24
const OUT_Y = 330
const CELL = 46
const GAP = 6

/** 归并关：两列有序恒星流，每次只能取队首，谁小谁先走——合并不变量的身体感受。 */
export class MergeScene implements GameScene {
  readonly container = new Container()
  private leftShelf: ShelfView
  private rightShelf: ShelfView
  private outShelf: ShelfView
  private dynamic: Container
  private state = initMerge([])
  private savedKeys = new Set<string>()
  private flashTimer: number | null = null
  private keyHandler: (event: KeyboardEvent) => void

  constructor(private game: Game, private level: MergeLevel, private rest: readonly GameLevel[]) {
    const chrome = makeLevelChrome(this.container, { title: level.title + ' · ' + level.destination, brief: level.brief, onBack: () => this.backToMap() })
    this.leftShelf = new ShelfView({ x: QUEUE_X, y: QUEUE_Y })
    this.rightShelf = new ShelfView({ x: QUEUE_X, y: QUEUE_Y + 64 })
    this.outShelf = new ShelfView({ x: OUT_X, y: OUT_Y })
    this.dynamic = chrome.dynamic
    chrome.container.addChild(this.leftShelf.container, this.rightShelf.container, this.outShelf.container)

    makeText(chrome.container, 24, 160, '左列', { size: 12, color: SPACE.muted, family: 'ui-monospace, Menlo, monospace' })
    makeText(chrome.container, 24, 224, '右列', { size: 12, color: SPACE.muted, family: 'ui-monospace, Menlo, monospace' })
    makeText(chrome.container, 24, 300, '合并输出（点击队列取队首；快捷键 L / R）', { size: 11, color: SPACE.faint })

    this.leftShelf.container.eventMode = 'static'
    this.leftShelf.container.cursor = 'pointer'
    this.leftShelf.container.hitArea = new Rectangle(QUEUE_X - 8, QUEUE_Y - 12, 420, CELL + 24)
    this.leftShelf.container.on('pointerdown', () => this.pick('left'))
    this.rightShelf.container.eventMode = 'static'
    this.rightShelf.container.cursor = 'pointer'
    this.rightShelf.container.hitArea = new Rectangle(QUEUE_X - 8, QUEUE_Y + 52, 420, CELL + 24)
    this.rightShelf.container.on('pointerdown', () => this.pick('right'))

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
    const shelf = side === 'left' ? this.leftShelf : this.rightShelf
    shelf.container.x += 6
    window.setTimeout(() => { shelf.container.x -= 6 }, 90)
  }

  private refresh(level: MergeLevel) {
    const state = this.state
    const toCell = (card: { id: string; value: number }, tone: ShelfCell['tone']) => ({ id: card.id, value: card.value, tone })
    const leftCells = state.left.map((card, index) => toCell(card, index === 0 ? 'focus' : 'default'))
    const rightCells = state.right.map((card, index) => toCell(card, index === 0 ? 'focus' : 'default'))
    const outCells = state.out.map(card => toCell(card, 'sorted'))
    this.leftShelf.setState(leftCells)
    this.rightShelf.setState(rightCells)
    this.outShelf.setState(outCells)

    this.dynamic.removeChildren().forEach(child => child.destroy({ children: true }))
    countersRow(this.dynamic, 420, [
      { text: '取牌 ' + state.attempts + ' / 最优 ' + level.par.attempts, color: SPACE.text },
      { text: '已合并 ' + state.out.length + ' / ' + (state.out.length + state.left.length + state.right.length), color: C.green },
    ])

    if (state.done) this.drawWin(level)
  }

  private drawWin(level: MergeLevel) {
    const medal = mergeMedal(this.state.attempts, level.par.attempts)
    const save = loadSave()
    const previous = save[level.variants[0].id]
    const medalRank = { bronze: 1, silver: 2, gold: 3 } as const
    if (!previous || medalRank[medal] >= medalRank[previous.medal]) {
      saveRecord({ ...save, [level.variants[0].id]: { medal, moves: this.state.attempts, compares: this.state.out.length } })
    }
    if (this.savedKeys.has(level.id)) return
    this.savedKeys.add(level.id)

    overlayDim(this.dynamic)
    makePanel(this.dynamic, 200, 130, 560, 270, { stroke: C.greenBorder, fill: 0xf0fbf6 })
    makeText(this.dynamic, 232, 158, medalNames[medal] + '（' + this.state.attempts + ' 次取牌）', { size: 21, color: C.green, weight: '800' })
    makeText(this.dynamic, 232, 200, '合并两条有序队列：每次比较队首、取走较小者——n 张牌恰好 n 次取牌就能完成。', { size: 13, color: C.ink, wordWrap: 500, lineHeight: 20 })
    makeText(this.dynamic, 232, 252, this.state.attempts <= level.par.attempts ? '零失误合并：你已经把"合并"变成了肌肉记忆。' : '多出的取牌来自取错队首——回想"谁小谁先走"。', { size: 12, color: C.muted, wordWrap: 500 })
    makeButton(this.dynamic, { x: 232, y: 328, w: 120, label: '再来一次', variant: 'outline', onTap: () => { this.state = initMerge(level.variants[0].cells); this.refresh(level) } })
    if (this.rest.length > 0) makeButton(this.dynamic, { x: 368, y: 328, w: 120, label: '下一关', variant: 'solid', onTap: () => openLevel(this.game, this.rest[0], this.rest.slice(1)) })
    makeButton(this.dynamic, { x: this.rest.length > 0 ? 504 : 368, y: 328, w: 120, label: '返回地图', variant: 'ghost', onTap: () => this.backToMap() })
  }

  private backToMap() {
    this.game.switch(g => new MapScene(g), '返航 → 地球 · 雁栖湖')
  }

  destroy() {
    window.removeEventListener('keydown', this.keyHandler)
    this.container.destroy({ children: true })
  }
}
