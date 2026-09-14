import { Container, Graphics, Text } from 'pixi.js'
import { animate } from 'animejs'
import type { Game, GameScene } from '../core/app'
import { C, makeButton, makePanel, makeText, SPACE, type ButtonHandle } from '../core/ui'
import { commandMedal, foldExecute, initProgram, medalNames, programStep, programStepCap } from '../sim'
import { loadSave, saveRecord } from '../save'
import { LevelScene } from './LevelScene'
import { MapScene } from './MapScene'
import type { Card, CommandLevel, ExecuteCommand, ExecuteState, GameLevel, SaveData } from '../types'

const CELL = 46
const GAP = 7
const RADIUS = 8

const palette = {
  default: { fill: C.cellBg, stroke: C.cellBorder, text: C.muted },
  sorted: { fill: C.greenBg, stroke: C.greenBorder, text: C.green },
} as const

const cardTheme: Record<Card, { fill: number; text: number; label: string; key: string }> = {
  pick: { fill: C.blue, text: 0xffffff, label: '拿起', key: '1' },
  compare: { fill: C.purple, text: 0xffffff, label: '比较', key: '2' },
  shift: { fill: C.orange, text: 0xffffff, label: '右移', key: '3' },
  drop: { fill: C.green, text: 0xffffff, label: '放下', key: '4' },
  loop: { fill: 0x172235, text: 0xffffff, label: '循环', key: '5' },
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

/** 指挥关：把动作写成指令程序，运行让小精灵自己整理货架。 */
export class CommandScene implements GameScene {
  readonly container = new Container()
  private level: CommandLevel
  private next: GameLevel | null
  private variantId: string
  private program: Card[] = []
  private runner = initProgram()
  private running = false
  private runTimer: number | null = null
  private savedKeys = new Set<string>()
  private cellViews = new Map<string, CellView>()
  private shelfLayer = new Container()
  private dynamic = new Container()
  private programLayer = new Container()
  private paletteLayer = new Container()
  private runButton: ButtonHandle
  private keyHandler: (event: KeyboardEvent) => void

  constructor(private game: Game, level: CommandLevel, next: GameLevel | null) {
    this.level = level
    this.next = next
    this.variantId = level.variants[0].id

    makeText(this.container, 24, 20, `${this.level.title} · ${this.level.destination}`, { size: 20, weight: '800', color: SPACE.text })
    makeText(this.container, 24, 52, this.level.brief, { size: 12, color: SPACE.muted, wordWrap: 700 })
    makeButton(this.container, { x: 936 - 96, y: 20, w: 96, label: '返回地图', variant: 'outline', onTap: () => this.backToMap() })
    this.container.addChild(this.shelfLayer)
    this.container.addChild(this.dynamic)
    this.container.addChild(this.programLayer)
    this.container.addChild(this.paletteLayer)

    makeText(this.container, 24, 96, '指令卡（点击放入程序槽，点槽移除）', { size: 12, color: SPACE.muted })
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

    makeText(this.container, 24, 178, `程序槽（${this.level.slots} 格）`, { size: 12, color: SPACE.muted })
    this.runButton = makeButton(this.container, { x: 640, y: 282, w: 120, label: '运行 ▶ [空格]', variant: 'solid', onTap: () => this.toggleRun() })
    makeButton(this.container, { x: 768, y: 282, w: 90, label: '单步', variant: 'outline', onTap: () => { this.stopRun(); this.tick() } })
    makeButton(this.container, { x: 866, y: 282, w: 70, label: '清空', variant: 'ghost', onTap: () => { this.stopRun(); this.program = []; this.runner = initProgram(); this.refresh() } })

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
        makeText(this.dynamic, 24, 470, '程序在 200 步内没有完成——检查循环卡：它必须在动作卡之后，才能不断回到开头。', { size: 12, color: C.orange, wordWrap: 900 })
      }
      if (this.state.done) this.drawWin()
    }
  }

  private syncShelf(state: ExecuteState) {
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const seen = new Set<string>()
    state.cells.forEach((cell, index) => {
      seen.add(cell.id)
      const kind = index < state.sortedCount ? 'sorted' : 'default'
      let view = this.cellViews.get(cell.id)
      if (!view) {
        const container = new Container()
        const body = new Graphics()
        const label = new Text({ text: '', style: { fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 18, fontWeight: '800' } })
        label.anchor.set(0.5)
        label.position.set(CELL / 2, CELL / 2)
        container.addChild(body, label)
        container.position.set(24 + index * (CELL + GAP), 214)
        this.shelfLayer.addChild(container)
        drawCell(body, label, kind, cell.value)
        this.cellViews.set(cell.id, { container, body, label, kind, col: index })
        return
      }
      if (view.kind !== kind) { view.kind = kind; drawCell(view.body, view.label, kind, cell.value) }
      const targetX = 24 + index * (CELL + GAP)
      if (view.col !== index) {
        view.col = index
        if (reduceMotion) view.container.position.set(targetX, 214)
        else animate(view.container, { x: targetX, duration: 220, ease: 'out(3)' })
      }
    })
    this.cellViews.forEach((view, id) => {
      if (!seen.has(id)) { view.container.destroy({ children: true }); this.cellViews.delete(id) }
    })
  }

  private refresh() {
    const state = this.state
    this.syncShelf(state)
    this.runButton.setLabel(this.running ? '暂停 ⏸ [空格]' : '运行 ▶ [空格]')

    this.dynamic.removeChildren().forEach(child => child.destroy({ children: true }))
    makeText(this.dynamic, 24, 352, `⚡ 运行步数 ${this.runner.steps}${this.runner.steps >= programStepCap ? ' / 上限' : ''}`, { size: 13, color: SPACE.text, family: 'ui-monospace, Menlo, monospace' })
    makeText(this.dynamic, 260, 352, `已整理 ${state.sortedCount} / ${state.cells.length}`, { size: 13, color: C.green, family: 'ui-monospace, Menlo, monospace' })
    makeText(this.dynamic, 460, 352, `卡片数 ${this.program.length} / ${this.level.slots}（金 ≤ ${this.level.par.cards}）`, { size: 13, color: SPACE.text, family: 'ui-monospace, Menlo, monospace' })

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

  private drawWin() {
    this.stopRun()
    const medal = commandMedal(this.program.length, this.level.par.cards)
    const save = loadSave()
    const previous = save[this.variant.id]
    const medalRank = { bronze: 1, silver: 2, gold: 3 } as const
    if (!previous || medalRank[medal] > medalRank[previous.medal]) {
      const next: SaveData = { ...save, [this.variant.id]: { medal, moves: this.runner.steps, compares: this.program.length } }
      saveRecord(next)
    }
    if (this.savedKeys.has(this.variant.id)) return
    this.savedKeys.add(this.variant.id)
    const lyGained = Math.round(this.level.ly * ({ gold: 1, silver: 0.6, bronze: 0.3 } as const)[medal] * 100) / 100

    const dim = makePanel(this.dynamic, 0, 0, 960, 600, { fill: C.dim, alpha: 0.35, radius: 0 })
    dim.eventMode = 'static'
    makePanel(this.dynamic, 200, 150, 560, 280, { stroke: C.greenBorder, fill: 0xf0fbf6 })
    makeText(this.dynamic, 232, 178, `${medalNames[medal]}（${this.program.length} 张卡）· 航程 +${lyGained.toFixed(2)} 光年`, { size: 19, color: C.green, weight: '800' })
    makeText(this.dynamic, 232, 222, `⚡ 运行 ${this.runner.steps} 步 · 💾 程序 ${this.program.length} / ${this.level.slots} 槽（最优 ${this.level.par.cards} 张）`, { size: 14, color: C.ink, family: 'ui-monospace, Menlo, monospace' })
    makeText(this.dynamic, 232, 252, this.program.length <= this.level.par.cards ? '最小指令程序达成——循环把重复动作压缩成了一张卡。' : '还有压缩空间：哪张卡出现的规律可以交给循环？', { size: 12, color: C.muted, wordWrap: 500 })
    makeButton(this.dynamic, { x: 232, y: 340, w: 120, label: '重新设计', variant: 'outline', onTap: () => { this.program = []; this.runner = initProgram(); this.refresh() } })
    if (this.next) makeButton(this.dynamic, { x: 368, y: 340, w: 120, label: '下一关', variant: 'solid', onTap: () => { const target = this.next!; this.game.switch(g => target.kind === 'execute' ? new LevelScene(g, target, null) : new CommandScene(g, target, null), `启航 → ${target.destination}`) } })
    makeButton(this.dynamic, { x: this.next ? 504 : 368, y: 340, w: 120, label: '返回地图', variant: 'ghost', onTap: () => this.backToMap() })
  }

  private backToMap() {
    this.stopRun()
    this.game.switch(g => new MapScene(g), '返航 → 地球 · 雁栖湖')
  }

  destroy() {
    this.stopRun()
    window.removeEventListener('keydown', this.keyHandler)
    this.container.destroy({ children: true })
  }
}

