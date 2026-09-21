import { Container, Graphics, Text } from 'pixi.js'
import type { Game, GameScene } from '../core/app'
import { C, makeButton, makePanel, makeText, SPACE, type ButtonHandle } from '../core/ui'
import { CellRowView, drawAlgoPlate, drawMilestones, levelHeading, openDossierOverlay } from '../core/level-ui'
import { commandMedal, foldExecute, initProgram, programStep, programStepCap } from '../sim'
import { loadSave, saveRecord } from '../save'
import { lyOf } from '../core/xp'
import { t, zh, medalName, type LevelId } from '../locale'
import { MapScene } from './MapScene'
import { openLevel } from '../core/open'
import { gameLevels } from '../levels'
import type { Card, CommandLevel, GameLevel, SaveData } from '../types'

const CELL = 46
const GAP = 7
const RADIUS = 8

const palette = {
  default: { fill: C.cellBg, stroke: C.cellBorder, text: C.muted },
  sorted: { fill: C.greenBg, stroke: C.greenBorder, text: C.green },
} as const

const cardTheme: Record<Card, { fill: number; text: number; label: string; key: string }> = {
  pick: { fill: C.blue, text: 0xffffff, label: t('ui.cmdPick'), key: '1' },
  compare: { fill: C.purple, text: 0xffffff, label: t('ui.cmdCompare'), key: '2' },
  shift: { fill: C.orange, text: 0xffffff, label: t('ui.cmdShift'), key: '3' },
  drop: { fill: C.green, text: 0xffffff, label: t('ui.cmdDrop'), key: '4' },
  loop: { fill: 0x172235, text: 0xffffff, label: t('ui.cmdLoop'), key: '5' },
}

type CellView = { container: Container; body: Graphics; label: Text; kind: keyof typeof palette; col: number }

function drawCell(body: Graphics, label: Text, kind: keyof typeof palette, value: number) {
  const theme = palette[kind]
  body.clear()
  body.roundRect(0, 0, CELL, CELL, RADIUS)
  body.fill({ color: theme.fill })
  body.stroke({ width: 1, color: theme.stroke })
  label.text = String(value)
  label.style.fill = theme.text
}

/** 指挥关：把动作写成指令程序，交给自动整备机执行。 */
export class CommandScene implements GameScene {
  readonly container = new Container()
  private variantId: string
  private program: Card[] = []
  private runner = initProgram()
  private running = false
  private runTimer: number | null = null
  private savedKeys = new Set<string>()
  private dossierClose: (() => void) | null = null
  private cellViews = new Map<string, CellView>()
  private rail: CellRowView
  private dynamic = new Container()
  private programLayer = new Container()
  private paletteLayer = new Container()
  private runButton: ButtonHandle
  private keyHandler: (event: KeyboardEvent) => void

  constructor(private game: Game, private level: CommandLevel, private rest: readonly GameLevel[]) {
    this.variantId = level.variants[0].id
    const text = zh.level[this.level.id as LevelId]

    makeText(this.container, 24, 20, levelHeading(text), { size: 20, weight: '800', color: SPACE.text })
    makeText(this.container, 24, 52, text.brief, { size: 12, color: SPACE.muted, wordWrap: 700 })
    // 标题区右侧放算法名称牌（左列被简报/指令面板占满）。
    drawAlgoPlate(this.container, { x: 936, y: 58, algo: level.algo, anchorX: 1 })
    makeButton(this.container, { x: 936 - 96, y: 20, w: 96, label: t('ui.backToMap'), variant: 'outline', onTap: () => this.backToMap() })
    this.rail = new CellRowView({ x: 24, y: 214 })
    this.container.addChild(this.rail.container)
    this.container.addChild(this.dynamic)
    this.container.addChild(this.programLayer)
    this.container.addChild(this.paletteLayer)

    makeText(this.container, 24, 96, t('ui.cmdPaletteHint'), { size: 12, color: SPACE.muted })
    this.level.cards.forEach((card, index) => {
      const theme = cardTheme[card]
      const chip = new Container()
      chip.position.set(24 + index * 96, 118)
      const body = new Graphics()
      body.roundRect(0, 0, 86, 40, 8)
      body.fill({ color: theme.fill })
      const label = new Text({ text: `${theme.label} [${theme.key}]`, style: { fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: '700', fill: theme.text } })
      label.anchor.set(0.5)
      label.position.set(43, 20)
      chip.addChild(body, label)
      chip.eventMode = 'static'
      chip.cursor = 'pointer'
      chip.on('pointerdown', () => { if (!this.running && this.program.length < this.level.slots) { this.program = [...this.program, card]; this.refresh() } })
      this.paletteLayer.addChild(chip)
    })

    makeText(this.container, 24, 178, t('ui.programSlots', { n: this.level.slots }), { size: 12, color: SPACE.muted })
    this.runButton = makeButton(this.container, { x: 640, y: 282, w: 120, label: t('ui.run'), variant: 'solid', onTap: () => this.toggleRun() })
    makeButton(this.container, { x: 768, y: 282, w: 90, label: t('ui.singleStep'), variant: 'outline', onTap: () => { this.stopRun(); this.tick() } })
    makeButton(this.container, { x: 866, y: 282, w: 70, label: t('ui.clear'), variant: 'ghost', onTap: () => { this.stopRun(); this.program = []; this.runner = initProgram(); this.refresh() } })

    this.keyHandler = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (event.code === 'Space') { event.preventDefault(); this.toggleRun(); return }
      if (event.key === 'Backspace') { event.preventDefault(); if (!this.running) { this.program = this.program.slice(0, -1); this.refresh() } return }
      const index = Number(event.key) - 1
      const card = this.level.cards[index]
      if (card && !this.running && this.program.length < this.level.slots) { event.preventDefault(); this.program = [...this.program, card]; this.refresh() }
    }
    window.addEventListener('keydown', this.keyHandler)
    this.refresh()
  }

  private get variant() {
    return this.level.variants.find(item => item.id === this.variantId) ?? this.level.variants[0]
  }

  private get state() {
    return foldExecute(this.variant, this.runner.log)
  }

  private toggleRun() {
    if (this.running) { this.stopRun(); this.refresh(); return }
    if (this.program.length === 0 || this.runner.finished) return
    this.running = true
    this.runTimer = window.setInterval(() => this.tick(), 260)
    this.refresh()
  }

  private stopRun() {
    if (this.runTimer !== null) { window.clearInterval(this.runTimer); this.runTimer = null }
    this.running = false
  }

  private tick() {
    const before = this.runner
    const { ps } = programStep(this.variant, this.program, this.runner)
    this.runner = ps
    if (ps !== before) this.refresh()
    if (ps.finished || ps.steps >= programStepCap) {
      this.stopRun()
      if (ps.steps >= programStepCap && !this.state.done) {
        makeText(this.dynamic, 24, 470, t('ui.programTimeout'), { size: 12, color: C.orange, wordWrap: 900 })
      }
      if (this.state.done) this.drawWin()
    }
  }

  private syncRail(state: ReturnType<typeof foldExecute>) {
    this.rail.setState(state.cells.map((cell, index) => ({
      id: cell.id,
      value: cell.value,
      tone: index < state.sortedCount ? 'sorted' : 'default',
    })))
  }

  private refresh() {
    const state = this.state
    this.syncRail(state)
    this.runButton.setLabel(this.running ? t('ui.pause') : t('ui.run'))

    this.dynamic.removeChildren().forEach(child => child.destroy({ children: true }))
    makeText(this.dynamic, 24, 352, t('ui.runSteps', { n: this.runner.steps, cap: this.runner.steps >= programStepCap ? t('ui.runStepsCapped') : '' }), { size: 13, color: SPACE.text, family: 'ui-monospace, Menlo, monospace' })
    makeText(this.dynamic, 260, 352, t('ui.sortedCount', { n: state.sortedCount, m: state.cells.length }), { size: 13, color: C.green, family: 'ui-monospace, Menlo, monospace' })
    makeText(this.dynamic, 460, 352, t('ui.cardsUsed', { n: this.program.length, m: this.level.slots, par: this.level.par.cards }), { size: 13, color: SPACE.text, family: 'ui-monospace, Menlo, monospace' })

    this.programLayer.removeChildren().forEach(child => child.destroy({ children: true }))
    Array.from({ length: this.level.slots }, (_, index) => {
      const card = this.program[index]
      const slot = new Container()
      slot.position.set(24 + index * 96, 216)
      const body = new Graphics()
      body.roundRect(0, 0, 86, 40, 8)
      if (card) {
        const theme = cardTheme[card]
        body.fill({ color: theme.fill })
        const label = new Text({ text: theme.label, style: { fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: '700', fill: theme.text } })
        label.anchor.set(0.5)
        label.position.set(43, 20)
        slot.addChild(body, label)
        if (this.runner.pc === index && this.running) {
          const ring = new Graphics(); ring.roundRect(-3, -3, 92, 46, 10); ring.stroke({ width: 2, color: C.yellow }); slot.addChild(ring)
        }
        if (!this.running) {
          slot.eventMode = 'static'; slot.cursor = 'pointer'
          slot.on('pointerdown', () => { this.program = this.program.filter((_, i) => i !== index); this.runner = initProgram(); this.refresh() })
        }
      } else {
        body.stroke({ width: 1, color: C.cellBorder })
        body.fill({ color: 0xffffff, alpha: 0.6 })
      }
      this.programLayer.addChild(slot)
    })

    if (state.done) this.drawWin()
  }

  private openDossier() {
    if (this.dossierClose) return
    this.dossierClose = openDossierOverlay(this.container, { algo: this.level.algo, onClose: () => { this.dossierClose = null } })
  }

  private drawWin() {
    this.stopRun()
    const medal = commandMedal(this.program.length, this.level.par.cards)
    const saveBefore = loadSave()
    const previous = saveBefore[this.variant.id]
    const medalRank = { bronze: 1, silver: 2, gold: 3 } as const
    let finalSave: SaveData = saveBefore
    if (!previous || medalRank[medal] >= medalRank[previous.medal]) {
      finalSave = { ...saveBefore, [this.variant.id]: { medal, moves: this.runner.steps, compares: this.program.length } }
      saveRecord(finalSave)
    }
    if (this.savedKeys.has(this.variant.id)) return
    this.savedKeys.add(this.variant.id)
    const oldLy = lyOf(saveBefore, gameLevels)
    const newLy = lyOf(finalSave, gameLevels)
    const lyGained = Math.round((newLy - oldLy) * 100) / 100

    const dim = makePanel(this.dynamic, 0, 0, 960, 600, { fill: C.dim, alpha: 0.35, radius: 0 })
    dim.eventMode = 'static'
    makePanel(this.dynamic, 200, 150, 560, 300, { stroke: C.greenBorder, fill: 0xf0fbf6 })
    makeText(this.dynamic, 232, 172, t('ui.cmdWinLine', { medal: medalName(medal), n: this.program.length, ly: lyGained.toFixed(2) }), { size: 19, color: C.green, weight: '800' })
    makeText(this.dynamic, 232, 210, t('ui.cmdWinStats', { n: this.runner.steps, a: this.program.length, b: this.level.slots, par: this.level.par.cards }), { size: 14, color: C.ink, family: 'ui-monospace, Menlo, monospace' })
    const hintY = drawMilestones(this.dynamic, 232, 244, oldLy, newLy)
    makeText(this.dynamic, 232, hintY + 4, this.program.length <= this.level.par.cards ? t('ui.cmdWinOptimal') : t('ui.cmdWinCompress'), { size: 12, color: C.muted, wordWrap: 500 })
    const btnY = hintY + 96 > 380 ? 380 : hintY + 96
    makeButton(this.dynamic, { x: 232, y: btnY, w: 112, label: t('ui.dossierOpen'), variant: 'outline', onTap: () => this.openDossier() })
    makeButton(this.dynamic, { x: 360, y: btnY, w: 112, label: t('ui.redesign'), variant: 'outline', onTap: () => { this.program = []; this.runner = initProgram(); this.refresh() } })
    if (this.rest.length > 0) makeButton(this.dynamic, { x: 488, y: btnY, w: 112, label: t('ui.nextLevel'), variant: 'solid', onTap: () => openLevel(this.game, this.rest[0], this.rest.slice(1)) })
    makeButton(this.dynamic, { x: this.rest.length > 0 ? 616 : 488, y: btnY, w: 112, label: t('ui.backToMap'), variant: 'ghost', onTap: () => this.backToMap() })
  }

  private backToMap() {
    this.stopRun()
    this.game.switch(g => new MapScene(g), t('ui.backTransit'))
  }

  destroy() {
    this.stopRun()
    this.dossierClose?.()
    window.removeEventListener('keydown', this.keyHandler)
    this.container.destroy({ children: true })
  }
}
