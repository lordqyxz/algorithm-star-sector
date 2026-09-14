import { Container, Graphics, Text } from 'pixi.js'
import { animate } from 'animejs'
import type { Game, GameScene } from '../core/app'
import { C, makeButton, makePanel, makeText, SPACE, type ButtonHandle } from '../core/ui'
import { ShelfView } from '../core/level-ui'
import { executeLevels } from '../levels'
import { openLevel } from '../core/open'
import type { GameLevel } from '../types'
import { canExecute, foldExecute, medalFor, medalNames } from '../sim'
import { loadSave, saveRecord } from '../save'
import { CommandScene } from './CommandScene'
import { MapScene } from './MapScene'
import type { ExecuteCommand, ExecuteLevel as LevelData, LevelVariant, SaveData } from '../types'

type ExecuteStateView = ReturnType<typeof foldExecute>

const CELL = 46
const GAP = 7
const RADIUS = 8

const palette = {
  default: { fill: C.cellBg, stroke: C.cellBorder, text: C.muted },
  sorted: { fill: C.greenBg, stroke: C.greenBorder, text: C.green },
  hole: { fill: 0xffffff, stroke: 0xd3dce6, text: 0xffffff },
  key: { fill: C.yellowBg, stroke: C.yellow, text: C.yellow },
} as const

type CellView = { container: Container; body: Graphics; label: Text; kind: keyof typeof palette; col: number }

function drawCell(body: Graphics, label: Text, kind: keyof typeof palette, value: number) {
  const theme = palette[kind]
  body.clear()
  body.roundRect(0, 0, CELL, CELL, RADIUS)
  body.fill({ color: theme.fill })
  body.stroke({ width: 1, color: theme.stroke })
  label.text = kind === 'hole' ? '' : String(value)
  label.style.fill = theme.text
}

/** 操演关：拿起、比较、右移、放下。规则来自 sim.ts；本场景只做表现与输入。 */
export class LevelScene implements GameScene {
  readonly container = new Container()
  private level: LevelData
  private variantId: string
  private commands: ExecuteCommand[] = []
  private undoCount = 0
  private answered = new Set<string>()
  private predictionChoice: { variantId: string; index: number } | null = null
  private savedKeys = new Set<string>()
  private cellViews = new Map<string, CellView>()
  private shelf: ShelfView
  private controls = new Container()
  private dynamic = new Container()
  private chipLayer = new Container()
  private buttons: Record<'pick' | 'compare' | 'shift' | 'drop' | 'undo', ButtonHandle>
  private keyHandler: (event: KeyboardEvent) => void

  constructor(private game: Game, level: LevelData, private rest: readonly GameLevel[]) {
    this.level = level
    this.variantId = this.level.variants[0].id

    makeText(this.container, 24, 20, `${this.level.title} · ${this.level.destination}`, { size: 20, weight: '800', color: SPACE.text })
    makeText(this.container, 24, 52, this.level.brief, { size: 12, color: SPACE.muted, wordWrap: 700 })
    makeButton(this.container, { x: 936 - 96, y: 20, w: 96, label: '返回地图', variant: 'outline', onTap: () => this.backToMap() })
    this.shelf = new ShelfView({ x: 24, y: 178 })
    this.container.addChild(this.chipLayer)
    this.container.addChild(this.shelf.container)
    this.controls = new Container()
    this.container.addChild(this.controls)
    // dynamic 最后加入：预测门/结算覆盖层永远压在货架与按钮之上
    this.container.addChild(this.dynamic)

    const y = { chips: 86, hand: 128, shelf: 178, verdict: 244, buttons: 292, counters: 344, keys: 380 }
    this.buttons = {
      pick: makeButton(this.controls, { x: 24, y: y.buttons, w: 132, label: '拿起下一张 [P]', icon: 'pick', onTap: () => this.run('pick') }),
      compare: makeButton(this.controls, { x: 164, y: y.buttons, w: 132, label: '与左邻比较 [C]', icon: 'compare', onTap: () => this.run('compare') }),
      shift: makeButton(this.controls, { x: 304, y: y.buttons, w: 118, label: '右移一格 [S]', icon: 'shift', onTap: () => this.run('shift') }),
      drop: makeButton(this.controls, { x: 430, y: y.buttons, w: 118, label: '放回洞里 [D]', icon: 'drop', onTap: () => this.run('drop') }),
      undo: makeButton(this.controls, { x: 556, y: y.buttons, w: 118, label: `撤销 ${this.undoCount} [U]`, variant: 'outline', icon: 'undo', onTap: () => this.undo() }),
    }
    makeButton(this.controls, { x: 682, y: y.buttons, w: 96, label: '重开 [R]', variant: 'ghost', onTap: () => this.restart() })
    makeText(this.controls, 24, y.keys, '零惩罚：撤销和重开都不影响奖章——奖章只看你是否靠撤销过关。', { size: 11, color: SPACE.faint })

    this.keyHandler = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const map: Record<string, () => void> = { p: () => this.run('pick'), c: () => this.run('compare'), s: () => this.run('shift'), d: () => this.run('drop'), u: () => this.undo(), r: () => this.restart() }
      const action = map[event.key.toLowerCase()]
      if (action) { event.preventDefault(); action() }
    }
    window.addEventListener('keydown', this.keyHandler)
    this.refresh()
  }

  private get variant(): LevelVariant {
    return this.level.variants.find(item => item.id === this.variantId) ?? this.level.variants[0]
  }

  private get state() {
    return foldExecute(this.variant, this.commands)
  }

  private run(command: ExecuteCommand['type']) {
    if (!canExecute(this.state, command)) return
    this.commands = [...this.commands, { type: command } as ExecuteCommand]
    this.refresh()
  }

  private undo() {
    if (this.commands.length === 0) return
    this.commands = this.commands.slice(0, -1)
    this.undoCount += 1
    this.refresh()
  }

  private restart() {
    this.commands = []
    this.undoCount = 0
    this.refresh()
  }

  private backToMap() {
    this.game.switch(g => new MapScene(g))
  }

  private refresh() {
    const state = this.state
    const variant = this.variant
    this.chipLayer.removeChildren().forEach(child => child.destroy({ children: true }))
    this.level.variants.forEach(item => {
      const active = item.id === this.variantId
      makeButton(this.chipLayer, { x: 24 + this.level.variants.indexOf(item) * 150, y: 86, w: 140, h: 30, label: `${item.label} · ${item.detail}`, variant: active ? 'solid' : 'outline', size: 11, onTap: () => { this.variantId = item.id; this.commands = []; this.undoCount = 0; this.predictionChoice = null; this.refresh() } })
    })

    this.syncShelf(state)

    this.dynamic.removeChildren().forEach(child => child.destroy({ children: true }))
    makeText(this.dynamic, 24, 128, '手', { size: 12, color: SPACE.faint, family: 'ui-monospace, Menlo, monospace' })
    if (state.held) {
      makePanel(this.dynamic, 46, 118, CELL, CELL, { fill: palette.key.fill, stroke: palette.key.stroke, radius: RADIUS })
      makeText(this.dynamic, 46 + CELL / 2, 118 + CELL / 2, String(state.held.value), { size: 17, color: palette.key.text, family: 'ui-monospace, Menlo, monospace', anchorX: 0.5, anchorY: 0.5, weight: '800' })
      makeText(this.dynamic, 102, 130, '暂存的 key；货架上的虚线格是洞', { size: 11, color: SPACE.faint })
    } else {
      makePanel(this.dynamic, 46, 118, CELL, CELL, { fill: 0xffffff, stroke: C.cellBorder, radius: RADIUS })
      makeText(this.dynamic, 46 + CELL / 2, 118 + CELL / 2, '空', { size: 12, color: C.faint, anchorX: 0.5, anchorY: 0.5 })
      makeText(this.dynamic, 102, 130, '点「拿起下一张」取走绿色区右侧第一张牌', { size: 11, color: SPACE.faint })
    }

    const holeText = state.verdict === 'greater' && state.hole !== null
      ? `${state.cells[state.hole - 1].value} > ${state.held?.value}：左邻更大，要给它让位`
      : state.verdict === 'less-equal' && state.hole !== null
        ? `${state.cells[state.hole - 1].value} ≤ ${state.held?.value}：找到位置，可以放下`
        : state.hole === 0 && state.held
          ? '洞已到最左端：免比较，直接放下（这就是 while i>0 的短路边界）'
          : '还没有比较结论：先「与左邻比较」，再决定右移还是放下'
    const verdictColor = state.verdict === 'greater' ? C.orange : state.verdict === 'less-equal' ? C.green : SPACE.muted
    makeText(this.dynamic, 24, 248, holeText, { size: 13, color: verdictColor, weight: '700', wordWrap: 900, lineHeight: 18 })

    makeText(this.dynamic, 24, 344, `⚡ 步数 ${state.moves} / 最优 ${variant.par.moves}`, { size: 13, color: SPACE.text, family: 'ui-monospace, Menlo, monospace' })
    makeText(this.dynamic, 260, 344, `🔍 比较 ${state.compares} / 最优 ${variant.par.compares}`, { size: 13, color: SPACE.text, family: 'ui-monospace, Menlo, monospace' })
    makeText(this.dynamic, 520, 344, `已整理 ${state.sortedCount} / ${state.cells.length}`, { size: 13, color: C.green, family: 'ui-monospace, Menlo, monospace' })

    const gate = variant.prediction && !this.answered.has(variant.id) && (variant.prediction.when === 'done' ? state.done : !state.done && state.compares >= 1) ? variant.prediction : null
    const blocked = Boolean(gate) || state.done
    this.buttons.pick.setEnabled(!blocked && canExecute(state, 'pick'))
    this.buttons.compare.setEnabled(!blocked && canExecute(state, 'compare'))
    this.buttons.shift.setEnabled(!blocked && canExecute(state, 'shift'))
    this.buttons.drop.setEnabled(!blocked && canExecute(state, 'drop'))
    this.buttons.undo.setEnabled(!blocked && this.commands.length > 0)
    this.buttons.undo.setLabel(`撤销 ${this.undoCount} [U]`)
    if (state.done) this.drawWin(state, variant)
    if (gate) this.drawPrediction(variant, state.done)
  }

  private syncShelf(state: ExecuteStateView) {
    this.shelf.setState(state.cells.map((cell, index) => ({
      id: cell.id,
      value: cell.value,
      tone: state.hole === index ? 'hole' : index < state.sortedCount ? 'sorted' : 'default',
    })), { holeAt: state.hole })
  }

  private drawPrediction(variant: LevelVariant, done: boolean) {
    const prediction = variant.prediction!
    const dim = makePanel(this.dynamic, 0, 0, 960, 600, { fill: C.dim, alpha: 0.35, radius: 0 }); dim.eventMode = 'static'
    makePanel(this.dynamic, 120, 130, 720, 300, { stroke: C.yellow, fill: 0xfffaf0 })
    makeText(this.dynamic, 148, 152, '先猜一步', { size: 12, color: C.yellow, weight: '800' })
    makeText(this.dynamic, 148, 176, prediction.prompt, { size: 14, weight: '700', wordWrap: 660, lineHeight: 20 })
    const choice = this.predictionChoice?.variantId === variant.id ? this.predictionChoice : null
    prediction.options.forEach((option, index) => {
      const correct = index === prediction.answer
      const revealed = choice !== null
      const label = `${String.fromCharCode(65 + index)}  ${option}`
      makeButton(this.dynamic, { x: 148, y: 216 + index * 46, w: 664, h: 38, label, variant: revealed ? (correct ? 'outline' : 'ghost') : 'outline', size: 12, onTap: () => { this.predictionChoice = { variantId: variant.id, index }; this.refresh() } })
    })
    if (choice) {
      const correct = choice.index === prediction.answer
      makeText(this.dynamic, 148, 356, correct ? '✓ 判断正确' : '✗ 再看一眼图上的证据', { size: 13, color: correct ? C.green : C.orange, weight: '800' })
      makeText(this.dynamic, 148, 378, prediction.explanation, { size: 12, color: C.muted, wordWrap: 660, lineHeight: 18 })
      makeButton(this.dynamic, { x: 668, y: 374, w: 96, label: done ? '查看结算' : '继续', variant: 'solid', onTap: () => { this.answered.add(variant.id); this.predictionChoice = null; this.refresh() } })
    }
  }

  private drawWin(state: ExecuteStateView, variant: LevelVariant) {
    const medal = medalFor(this.undoCount)
    const save = loadSave()
    const previous = save[variant.id]
    const medalRank = { bronze: 1, silver: 2, gold: 3 } as const
    if (!previous || medalRank[medal] >= medalRank[previous.medal]) {
      const next: SaveData = { ...save, [variant.id]: { medal, moves: state.moves, compares: state.compares } }
      saveRecord(next)
    }
    if (this.savedKeys.has(variant.id)) return
    this.savedKeys.add(variant.id)
    const lyGained = Math.round(this.level.ly * ({ gold: 1, silver: 0.6, bronze: 0.3 } as const)[medal] * 100) / 100

    const dim = makePanel(this.dynamic, 0, 0, 960, 600, { fill: C.dim, alpha: 0.35, radius: 0 }); dim.eventMode = 'static'
    makePanel(this.dynamic, 200, 150, 560, 260, { stroke: C.greenBorder, fill: 0xf0fbf6 })
    makeText(this.dynamic, 232, 178, `${medalNames[medal]}（用了 ${this.undoCount} 次撤销）· 航程 +${lyGained.toFixed(2)} 光年`, { size: 19, color: C.green, weight: '800' })
    makeText(this.dynamic, 232, 220, `⚡ ${state.moves} 步（最优 ${variant.par.moves}） · 🔍 ${state.compares} 次比较（最优 ${variant.par.compares}）`, { size: 14, color: C.ink, family: 'ui-monospace, Menlo, monospace' })
    makeText(this.dynamic, 232, 250, state.moves === variant.par.moves && state.compares === variant.par.compares ? '完美复现标准插入排序的动作数！' : '对照理论最优想一想：差距发生在哪几张牌上？', { size: 12, color: C.muted, wordWrap: 500 })
    makeButton(this.dynamic, { x: 232, y: 340, w: 120, label: '再玩一次', variant: 'outline', onTap: () => this.restart() })
    if (this.rest.length > 0) makeButton(this.dynamic, { x: 368, y: 340, w: 120, label: '下一关', variant: 'solid', onTap: () => openLevel(this.game, this.rest[0], this.rest.slice(1)) })
    makeButton(this.dynamic, { x: this.rest.length > 0 ? 504 : 368, y: 340, w: 120, label: '返回地图', variant: 'ghost', onTap: () => this.backToMap() })
  }

  destroy() {
    window.removeEventListener('keydown', this.keyHandler)
    this.container.destroy({ children: true })
  }
}
