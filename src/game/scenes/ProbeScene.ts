import { Container, Graphics } from 'pixi.js'
import type { Game, GameScene } from '../core/app'
import { makeLevelChrome, overlayDim, countersRow, CellRowView, drawMilestones, levelHeading } from '../core/level-ui'
import { C, makeButton, makePanel, makeText } from '../core/ui'
import { initProbe, probeAt, probeMedal } from '../sim'
import { loadSave, saveRecord } from '../save'
import { lyOf } from '../core/xp'
import { t, zh, medalName, type LevelId } from '../locale'
import { MapScene } from './MapScene'
import type { GameLevel, ProbeLevel } from '../types'
import { openLevel } from '../core/open'
import { gameLevels } from '../levels'

const RAIL_X = 48
const RAIL_Y = 196

/** 探测关：二分查找——深空定位。玩家亲手选探测点，每次排除一半候选区间。 */
export class ProbeScene implements GameScene {
  readonly container = new Container()
  private rail: CellRowView
  private hits = new Container()
  private dynamic: Container
  private state = initProbe([] as number[])
  private savedKeys = new Set<string>()
  private keyHandler: (event: KeyboardEvent) => void

  constructor(private game: Game, private level: ProbeLevel, private rest: readonly GameLevel[]) {
    const text = zh.level[this.level.id as LevelId]
    const chrome = makeLevelChrome(this.container, { title: levelHeading(text), brief: text.brief, algo: level.algo, onBack: () => this.backToMap() })
    this.dynamic = chrome.dynamic
    this.rail = new CellRowView({ x: RAIL_X, y: RAIL_Y })
    chrome.container.addChild(this.rail.container)
    this.container.addChild(this.hits)
    this.state = initProbe(level.variants[0].cells)

    makeText(chrome.controls, 24, 292, t('ui.probeRule'), { size: 11, color: C.faint, wordWrap: 900 })

    this.keyHandler = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const index = Number(event.key)
      if (!Number.isNaN(index) && index >= 1) this.probe(index - 1)
    }
    window.addEventListener('keydown', this.keyHandler)
    this.refresh(level)
  }

  private probe(index: number) {
    this.state = probeAt(this.level.variants[0].cells, this.level.variants[0].target, this.state, index)
    this.refresh(this.level)
  }

  private refresh(level: ProbeLevel) {
    const ps = this.state
    const cells = level.variants[0].cells
    const target = level.variants[0].target
    this.dynamic.removeChildren().forEach(child => child.destroy({ children: true }))

    const tones = cells.map((value, index) => {
      if (ps.done && ps.found && value === target && index === ps.attempts[ps.attempts.length - 1]?.index) return 'sorted'
      if (index < ps.low || index > ps.high) return 'muted'
      return 'default'
    })
    this.rail.setState(cells.map((value, index) => ({ id: `v${index}`, value, tone: tones[index] as 'sorted' | 'muted' | 'default' })), {
      bracket: ps.low <= ps.high ? { from: ps.low, to: ps.high, color: C.purple } : undefined,
      pointers: [{ index: ps.low, label: 'low', tone: 'blue' }, { index: ps.high, label: 'high', tone: 'orange' }],
    })

    this.hits.removeChildren().forEach(child => child.destroy({ children: true }))
    if (!ps.done) {
      for (let index = ps.low; index <= ps.high; index += 1) {
        const hit = new Graphics()
        hit.rect(RAIL_X + index * (46 + 6) - 2, RAIL_Y - 2, 50, 50)
        hit.fill({ color: 0xffffff, alpha: 0.001 })
        hit.eventMode = 'static'
        hit.cursor = 'pointer'
        hit.on('pointerdown', () => this.probe(index))
        this.hits.addChild(hit)
      }
    }

    countersRow(this.dynamic, 268, [
      { text: t('ui.probeCount', { n: ps.attempts.length, m: level.par.probes }) },
      { text: t('ui.remainRange', { n: Math.max(0, ps.high - ps.low + 1), m: cells.length }), color: C.muted },
      { text: t('ui.targetSpectrum', { n: target }), color: C.purple },
    ])

    ps.attempts.slice(-4).forEach((attempt, displayIndex) => {
      const index = ps.attempts.indexOf(attempt)
      const verdict = attempt.result === 'found' ? t('ui.probeHit') : attempt.result === 'low' ? t('ui.probeLow') : t('ui.probeHigh')
      const color = attempt.result === 'found' ? C.green : attempt.result === 'low' ? C.orange : C.muted
      makeText(this.dynamic, 24, 298 + displayIndex * 22, t('ui.probeAttempt', { i: index + 1, idx: attempt.index + 1, v: attempt.value, verdict }), { size: 12, color, family: 'ui-monospace, Menlo, monospace' })
    })

    if (ps.done) this.drawWin(level)
  }

  private drawWin(level: ProbeLevel) {
    const probes = this.state.attempts.length
    const medal = probeMedal(probes, level.par.probes)
    const saveBefore = loadSave()
    const previous = saveBefore[level.variants[0].id]
    const medalRank = { bronze: 1, silver: 2, gold: 3 } as const
    let finalSave = saveBefore
    if (!previous || medalRank[medal] >= medalRank[previous.medal]) {
      finalSave = { ...saveBefore, [level.variants[0].id]: { medal, moves: probes, compares: probes } }
      saveRecord(finalSave)
    }
    if (this.savedKeys.has(level.id)) return
    this.savedKeys.add(level.id)
    const oldLy = lyOf(saveBefore, gameLevels)
    const newLy = lyOf(finalSave, gameLevels)
    const lyGained = Math.round((newLy - oldLy) * 100) / 100

    overlayDim(this.dynamic)
    makePanel(this.dynamic, 200, 150, 560, 290, { stroke: C.greenBorder, fill: 0xf0fbf6 })
    makeText(this.dynamic, 232, 172, `${t('ui.probeWinLine', { medal: medalName(medal), n: probes })} · ${t('ui.lyGain', { ly: lyGained.toFixed(2) })}`, { size: 21, color: C.green, weight: '800' })
    makeText(this.dynamic, 232, 212, t('ui.probeWinLog', { n: level.variants[0].cells.length, m: level.par.probes }), { size: 13, color: C.ink })
    const hintY = drawMilestones(this.dynamic, 232, 246, oldLy, newLy)
    makeText(this.dynamic, 232, hintY + 4, probes <= level.par.probes ? t('ui.probeWinPerfect') : t('ui.probeWinHint', { m: level.par.probes }), { size: 12, color: C.muted, wordWrap: 500 })
    makeButton(this.dynamic, { x: 232, y: hintY + 96 > 340 ? 340 : hintY + 96, w: 120, label: t('ui.probeAgain'), variant: 'outline', onTap: () => { this.state = initProbe(level.variants[0].cells); this.refresh(level) } })
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
