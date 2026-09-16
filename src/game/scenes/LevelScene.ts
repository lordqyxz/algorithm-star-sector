import { Container, Graphics, Text } from 'pixi.js'
import type { Game, GameScene } from '../core/app'
import { C, makeButton, makePanel, makeText, SPACE, type ButtonHandle, type GlyphKind } from '../core/ui'
import { CellRowView, cellRowPalette, drawAlgoPlate, drawCaseRuler, drawMilestones, levelHeading, paintFuelRodCell, paintSocket } from '../core/level-ui'
import { gameLevels } from '../levels'
import { openLevel } from '../core/open'
import { t, zh, medalName, type LevelId, type VariantId, type PredictionId } from '../locale'
import type { GameLevel } from '../types'
import { canExecute, foldExecute, medalFor } from '../sim'
import { loadSave, saveRecord } from '../save'
import { makeSprite, spritesReady } from '../core/sprites'
import { lyOf } from '../core/xp'
import { CommandScene } from './CommandScene'
import { MapScene } from './MapScene'
import type { ExecuteCommand, ExecuteLevel as LevelData, ExecuteVariant, SaveData } from '../types'

type ExecuteStateView = ReturnType<typeof foldExecute>

const CELL = 46
const GAP = 7
const RADIUS = 8

const palette = {
  default: { fill: C.cellBg, stroke: C.cellBorder, text: C.muted },
  sorted: { fill: C.greenBg, stroke: C.greenBorder, text: C.green },
  slot: { fill: 0xffffff, stroke: 0xd3dce6, text: 0xffffff },
  key: { fill: C.yellowBg, stroke: C.yellow, text: C.yellow },
} as const

type CellView = { container: Container; body: Graphics; label: Text; kind: keyof typeof palette; col: number }

function drawCell(body: Graphics, label: Text, kind: keyof typeof palette, value: number) {
  const theme = palette[kind]
  body.clear()
  body.roundRect(0, 0, CELL, CELL, RADIUS)
  body.fill({ color: theme.fill })
  body.stroke({ width: 1, color: theme.stroke })
  label.text = kind === 'slot' ? '' : String(value)
  label.style.fill = theme.text
}

/** 操演关：抓取、比对、右移、放回。规则来自 sim.ts；本场景只做表现与输入。整备对象随军衔纪元升级。 */
export class LevelScene implements GameScene {
  readonly container = new Container()
  private level: LevelData
  private variantId: string
  private commands: ExecuteCommand[] = []
  private undoCount = 0
  private answered = new Set<string>()
  private predictionChoice: { variantId: string; index: number } | null = null
  /** 本次完成的结算数据（存档/航程只算一次，覆盖层随 refresh 重绘）。 */
  private winInfo: { variantId: string; lyGained: number; oldLy: number; newLy: number } | null = null
  private cellViews = new Map<string, CellView>()
  private rail: CellRowView
  private controls = new Container()
  private dynamic = new Container()
  private chipLayer = new Container()
  private buttons: Record<'pick' | 'compare' | 'shift' | 'drop' | 'undo', ButtonHandle>
  private keyHandler: (event: KeyboardEvent) => void

  constructor(private game: Game, level: LevelData, private rest: readonly GameLevel[]) {
    this.level = level
    this.variantId = this.level.variants[0].id
    const text = zh.level[this.level.id as LevelId]

    makeText(this.container, 24, 20, levelHeading(text), { size: 20, weight: '800', color: SPACE.text })
    drawAlgoPlate(this.container, { x: 24, y: 55, algo: this.level.algo })
    makeText(this.container, 24, 74, text.brief, { size: 12, color: SPACE.muted, wordWrap: 840 })
    makeButton(this.container, { x: 936 - 96, y: 20, w: 96, label: t('ui.backToMap'), variant: 'outline', onTap: () => this.backToMap() })
    this.rail = new CellRowView({ x: 24, y: 222 })
    this.container.addChild(this.chipLayer)
    this.container.addChild(this.rail.container)
    this.controls = new Container()
    this.container.addChild(this.controls)
    // dynamic 最后加入：预测门/结算覆盖层永远压在整备轨与按钮之上
    this.container.addChild(this.dynamic)

    const y = { chips: 128, arm: 170, rail: 222, verdict: 296, buttons: 344, counters: 396, keys: 432 }
    const { unit, slot } = text
    // 控制行流式布局：按钮宽度随文本自适应，从左到右排列，避免文字溢出或互相覆盖
    const defs: { key: 'pick' | 'compare' | 'shift' | 'drop' | 'undo'; label: string; icon?: GlyphKind; variant?: 'solid' | 'outline'; onTap: () => void }[] = [
      { key: 'pick', label: t('ui.pick', { unit }), icon: 'pick', onTap: () => this.run('pick') },
      { key: 'compare', label: t('ui.compare'), icon: 'compare', onTap: () => this.run('compare') },
      { key: 'shift', label: t('ui.shift'), icon: 'shift', onTap: () => this.run('shift') },
      { key: 'drop', label: t('ui.drop', { slot }), icon: 'drop', onTap: () => this.run('drop') },
      { key: 'undo', label: t('ui.undo', { n: this.undoCount }), variant: 'outline', icon: 'undo', onTap: () => this.undo() },
    ]
    this.buttons = {} as typeof this.buttons
    let bx = 24
    for (const def of defs) {
      const btn = makeButton(this.controls, { x: bx, y: y.buttons, label: def.label, icon: def.icon, variant: def.variant, onTap: def.onTap })
      this.buttons[def.key] = btn
      bx += Math.ceil(btn.container.width) + 8
    }
    makeButton(this.controls, { x: bx, y: y.buttons, label: t('ui.restart'), variant: 'ghost', onTap: () => this.restart() })
    // 控件行整体居中：总宽 = 末尾 x - 起点 - 末位间距。
    const ctrTotal = bx - 24 - 8
    const ctrShift = Math.max(0, (912 - ctrTotal) / 2)
    this.controls.children.forEach(child => { child.x += ctrShift })
    makeText(this.controls, 24, y.keys, t('ui.zeroPenalty'), { size: 11, color: SPACE.faint })

    this.keyHandler = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const map: Record<string, () => void> = { p: () => this.run('pick'), c: () => this.run('compare'), s: () => this.run('shift'), d: () => this.run('drop'), u: () => this.undo(), r: () => this.restart() }
      const action = map[event.key.toLowerCase()]
      if (action) { event.preventDefault(); action() }
    }
    window.addEventListener('keydown', this.keyHandler)
    this.refresh()
  }

  private get variant() {
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
    this.winInfo = null
    this.refresh()
  }

  private backToMap() {
    this.game.switch(g => new MapScene(g))
  }

  private refresh() {
    const state = this.state
    const variant = this.variant
    this.chipLayer.removeChildren().forEach(child => child.destroy({ children: true }))
    let chipX = 24
    this.level.variants.forEach(item => {
      const active = item.id === this.variantId
      const chip = zh.variant[item.id as VariantId]
      const btn = makeButton(this.chipLayer, { x: chipX, y: 128, h: 30, label: `${chip.label} · ${chip.detail}`, variant: active ? 'solid' : 'outline', size: 11, onTap: () => { this.variantId = item.id; this.commands = []; this.undoCount = 0; this.predictionChoice = null; this.winInfo = null; this.refresh() } })
      chipX += Math.ceil(btn.container.width) + 10
    })
    const chipTotal = chipX - 24 - 10
    const chipShift = Math.max(0, (912 - chipTotal) / 2)
    this.chipLayer.children.forEach(child => { child.x += chipShift })

    this.syncRail(state)

    const { unit, holder, place, slot } = zh.level[this.level.id as LevelId]
    this.dynamic.removeChildren().forEach(child => child.destroy({ children: true }))
    this.drawArmUnit(state.held)
    if (state.held) {
      makeText(this.dynamic, 46 + CELL / 2, 164 + CELL / 2, String(state.held.value), { size: 17, color: palette.key.text, family: 'ui-monospace, Menlo, monospace', anchorX: 0.5, anchorY: 0.5, weight: '800' })
      makeText(this.dynamic, 102, 176, t('ui.armHeldHint', { holder, unit, place, slot }), { size: 11, color: SPACE.faint })
    } else {
      makeText(this.dynamic, 102, 176, t('ui.armEmptyHint', { holder, pick: t('ui.pickPlain', { unit }), unit }), { size: 11, color: SPACE.faint })
    }

    const compareLabel = t('ui.comparePlain')
    const verdictText = state.verdict === 'greater' && state.hole !== null
      ? t('ui.verdictGreater', { left: state.cells[state.hole - 1].value, held: state.held?.value ?? '' })
      : state.verdict === 'less-equal' && state.hole !== null
        ? t('ui.verdictLessEqual', { left: state.cells[state.hole - 1].value, held: state.held?.value ?? '' })
        : state.hole === 0 && state.held
          ? t('ui.verdictEdge', { slot })
          : t('ui.verdictNone', { compare: compareLabel })
    const verdictColor = state.verdict === 'greater' ? C.orange : state.verdict === 'less-equal' ? C.green : SPACE.muted
    makeText(this.dynamic, 24, 300, verdictText, { size: 13, color: verdictColor, weight: '700', wordWrap: 900, lineHeight: 18 })

    makeText(this.dynamic, 24, 396, t('ui.moves', { n: state.moves, m: variant.par.moves }), { size: 13, color: SPACE.text, family: 'ui-monospace, Menlo, monospace' })
    makeText(this.dynamic, 344, 396, t('ui.compares', { n: state.compares, m: variant.par.compares }), { size: 13, color: SPACE.text, family: 'ui-monospace, Menlo, monospace' })
    makeText(this.dynamic, 664, 396, t('ui.sortedCount', { n: state.sortedCount, m: state.cells.length }), { size: 13, color: C.green, family: 'ui-monospace, Menlo, monospace' })

    const gate = variant.prediction && !this.answered.has(variant.id) && (variant.prediction.when === 'done' ? state.done : !state.done && state.compares >= 1) ? variant.prediction : null
    const blocked = Boolean(gate) || state.done
    this.buttons.pick.setEnabled(!blocked && canExecute(state, 'pick'))
    this.buttons.compare.setEnabled(!blocked && canExecute(state, 'compare'))
    this.buttons.shift.setEnabled(!blocked && canExecute(state, 'shift'))
    this.buttons.drop.setEnabled(!blocked && canExecute(state, 'drop'))
    this.buttons.undo.setEnabled(!blocked && this.commands.length > 0)
    this.buttons.undo.setLabel(t('ui.undo', { n: this.undoCount }))
    if (state.done) this.drawWin(state, variant)
    if (gate) this.drawPrediction(variant, state.done)
  }

  /** 机械臂装置：立柱 + 关节 + 双爪。持握时爪指闭合夹住燃料棒，空载时爪指外张、下方是下凹插座。 */
  private drawArmUnit(held: ExecuteStateView['held']) {
    const cx = 46 + CELL / 2
    const topY = 102
    const slotY = 164
    if (spritesReady()) {
      // 贴图路径：立柱 / 夹爪 / 安装座 / 插座 / 燃料棒 全部用生成的 PNG。
      const column = makeSprite('armColumn', 14, 62)
      if (column) column.position.set(cx - 7, topY - 9)
      const claw = makeSprite(held ? 'clawClosed' : 'clawOpen', 70, 44)
      if (claw) claw.position.set(cx - 35, slotY - 20)
      const mount = makeSprite('railMount', 50, 8)
      if (mount) mount.position.set(cx - 25, slotY + CELL - 4)
      for (const part of [column, claw, mount]) { if (part) this.dynamic.addChild(part) }
      if (held) {
        const glow = new Graphics()
        glow.roundRect(42, slotY - 4, CELL + 8, CELL + 8, 11).stroke({ width: 2, color: 0xb27800, alpha: 0.35 })
        const rod = makeSprite('rodKey', CELL, CELL)
        this.dynamic.addChild(glow)
        if (rod) { rod.position.set(46, slotY); this.dynamic.addChild(rod) }
      } else {
        const socket = makeSprite('socket', CELL, CELL)
        if (socket) { socket.position.set(46, slotY); this.dynamic.addChild(socket) }
      }
      return
    }
    // 矢量回退：资产缺失时保持可玩。
    const g = new Graphics()
    g.rect(cx - 3, topY + 9, 6, slotY - 23 - topY).fill({ color: 0x22314a })
    g.rect(cx - 3, topY + 9, 2, slotY - 23 - topY).fill({ color: 0x5c7ba3 })
    g.circle(cx, topY, 9).fill({ color: 0x2c3e5c }).stroke({ width: 1, color: 0x53708f })
    g.circle(cx, topY, 3).fill({ color: 0x9db3d0 })
    g.circle(cx, slotY - 14, 5).fill({ color: 0x2c3e5c }).stroke({ width: 1, color: 0x53708f })
    const spread = held ? 13 : 19
    for (const side of [-1, 1]) {
      const fx = cx + side * spread
      g.roundRect(fx - 2.5, slotY - 12, 5, 22, 2).fill({ color: 0x3d5478 })
      g.roundRect(side < 0 ? fx - 2 : fx - 3.5, slotY + 7, 5.5, 5, 1.5).fill({ color: 0x53708f })
    }
    g.roundRect(cx - 20, slotY + CELL, 40, 4, 2).fill({ color: 0x22314a })
    this.dynamic.addChild(g)
    if (held) {
      const glow = new Graphics()
      glow.roundRect(42, slotY - 4, CELL + 8, CELL + 8, 11).stroke({ width: 2, color: 0xb27800, alpha: 0.35 })
      const rod = new Graphics()
      paintFuelRodCell(rod, CELL, cellRowPalette.key, false)
      rod.position.set(46, slotY)
      this.dynamic.addChild(glow, rod)
    } else {
      const socket = new Graphics()
      paintSocket(socket, CELL)
      socket.position.set(46, slotY)
      this.dynamic.addChild(socket)
    }
  }
  private syncRail(state: ExecuteStateView) {
    this.rail.setState(state.cells.map((cell, index) => ({
      id: cell.id,
      value: cell.value,
      tone: state.hole === index ? 'slot' : index < state.sortedCount ? 'sorted' : 'default',
    })), { slotAt: state.hole })
  }

  private drawPrediction(variant: ExecuteVariant, done: boolean) {
    const gate = variant.prediction!
    const prediction = zh.prediction[variant.id as PredictionId]
    const dim = makePanel(this.dynamic, 0, 0, 960, 600, { fill: C.dim, alpha: 0.35, radius: 0 }); dim.eventMode = 'static'
    makePanel(this.dynamic, 120, 130, 720, 300, { stroke: C.yellow, fill: 0xfffaf0 })
    makeText(this.dynamic, 148, 152, t('ui.predictionTitle'), { size: 12, color: C.yellow, weight: '800' })
    makeText(this.dynamic, 148, 176, prediction.prompt, { size: 14, weight: '700', wordWrap: 660, lineHeight: 20 })
    const choice = this.predictionChoice?.variantId === variant.id ? this.predictionChoice : null
    prediction.options.forEach((option, index) => {
      const correct = index === gate.answer
      const revealed = choice !== null
      const label = `${String.fromCharCode(65 + index)}  ${option}`
      makeButton(this.dynamic, { x: 148, y: 216 + index * 46, w: 664, h: 38, label, variant: revealed ? (correct ? 'outline' : 'ghost') : 'outline', size: 12, onTap: () => { this.predictionChoice = { variantId: variant.id, index }; this.refresh() } })
    })
    if (choice) {
      const correct = choice.index === gate.answer
      makeText(this.dynamic, 148, 356, correct ? t('ui.predictionOk') : t('ui.predictionRetry'), { size: 13, color: correct ? C.green : C.orange, weight: '800' })
      makeText(this.dynamic, 148, 378, prediction.explanation, { size: 12, color: C.muted, wordWrap: 660, lineHeight: 18 })
      makeButton(this.dynamic, { x: 668, y: 374, w: 96, label: done ? t('ui.predictionSeeResult') : t('ui.predictionContinue'), variant: 'solid', onTap: () => { this.answered.add(variant.id); this.predictionChoice = null; this.refresh() } })
    }
  }

  private drawWin(state: ExecuteStateView, variant: LevelData['variants'][number]) {
    // 存档与航程结算只在「本次完成」时计算一次；覆盖层随每次 refresh 重绘——
    // 通关预测门作答（查看结算）与重玩通关后，结算页都必须仍然可见。
    let win = this.winInfo
    if (win?.variantId !== variant.id) {
      const medal = medalFor(this.undoCount)
      const saveBefore = loadSave()
      const previous = saveBefore[variant.id]
      const medalRank = { bronze: 1, silver: 2, gold: 3 } as const
      let finalSave: SaveData = saveBefore
      if (!previous || medalRank[medal] >= medalRank[previous.medal]) {
        finalSave = { ...saveBefore, [variant.id]: { medal, moves: state.moves, compares: state.compares } }
        saveRecord(finalSave)
      }
      const oldLy = lyOf(saveBefore, gameLevels)
      const newLy = lyOf(finalSave, gameLevels)
      win = { variantId: variant.id, lyGained: Math.round((newLy - oldLy) * 100) / 100, oldLy, newLy }
      this.winInfo = win
    }
    const medal = medalFor(this.undoCount)

    const dim = makePanel(this.dynamic, 0, 0, 960, 600, { fill: C.dim, alpha: 0.35, radius: 0 }); dim.eventMode = 'static'
    makePanel(this.dynamic, 200, 150, 560, 300, { stroke: C.greenBorder, fill: 0xf0fbf6 })
    makeText(this.dynamic, 232, 170, t('ui.winLine', { medal: medalName(medal), n: this.undoCount, ly: win.lyGained.toFixed(2) }), { size: 19, color: C.green, weight: '800' })
    makeText(this.dynamic, 232, 200, t('ui.winStats', { moves: state.moves, m1: variant.par.moves, compares: state.compares, m2: variant.par.compares }), { size: 14, color: C.ink, family: 'ui-monospace, Menlo, monospace' })
    // 三态标尺：本次比对次数落在 最好 n−1 与 最坏 n(n−1)/2 之间的哪里。
    const rulerEnd = drawCaseRuler(this.dynamic, 232, 224, variant.cells.length, state.compares)
    const unit = zh.level[this.level.id as LevelId].unit
    const hintY = drawMilestones(this.dynamic, 232, rulerEnd, win.oldLy, win.newLy)
    makeText(this.dynamic, 232, hintY + 2, state.moves === variant.par.moves && state.compares === variant.par.compares ? t('ui.winPerfect') : t('ui.winCompareHint', { unit }), { size: 12, color: C.muted, wordWrap: 500 })
    const btnY = Math.min(hintY + 26, 412)
    makeButton(this.dynamic, { x: 232, y: btnY, w: 120, label: t('ui.winAgain'), variant: 'outline', onTap: () => this.restart() })
    if (this.rest.length > 0) makeButton(this.dynamic, { x: 368, y: btnY, w: 120, label: t('ui.nextLevel'), variant: 'solid', onTap: () => openLevel(this.game, this.rest[0], this.rest.slice(1)) })
    makeButton(this.dynamic, { x: this.rest.length > 0 ? 504 : 368, y: btnY, w: 120, label: t('ui.backToMap'), variant: 'ghost', onTap: () => this.backToMap() })
  }

  destroy() {
    window.removeEventListener('keydown', this.keyHandler)
    this.container.destroy({ children: true })
  }
}
