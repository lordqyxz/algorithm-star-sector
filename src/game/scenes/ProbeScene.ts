import { Container, Graphics } from 'pixi.js'
import type { Game, GameScene } from '../core/app'
import { makeLevelChrome, overlayDim, countersRow, ShelfView } from '../core/level-ui'
import { C, makeButton, makePanel, makeText, SPACE } from '../core/ui'
import { initProbe, probeAt, probeMedal, medalNames } from '../sim'
import { loadSave, saveRecord } from '../save'
import { MapScene } from './MapScene'
import type { GameLevel, ProbeLevel } from '../types'
import { openLevel } from '../core/open'

const SHELF_X = 48
const SHELF_Y = 196

/** 探测关：二分查找——玩家亲手选探测点，每次排除一半候选区间。 */
export class ProbeScene implements GameScene {
  readonly container = new Container()
  private shelf: ShelfView
  private hits = new Container()
  private dynamic: Container
  private state = initProbe([] as number[])
  private savedKeys = new Set<string>()
  private keyHandler: (event: KeyboardEvent) => void

  constructor(private game: Game, private level: ProbeLevel, private rest: readonly GameLevel[]) {
    const chrome = makeLevelChrome(this.container, { title: `${level.title} · ${level.destination}`, brief: level.brief, onBack: () => this.backToMap() })
    this.dynamic = chrome.dynamic
    this.shelf = new ShelfView({ x: SHELF_X, y: SHELF_Y })
    chrome.container.addChild(this.shelf.container)
    this.container.addChild(this.hits)
    this.state = initProbe(level.variants[0].cells)

    makeText(chrome.controls, 24, 292, '探测规则：点击紫色区间内的恒星直接探测——每次探测排除一半。快捷键：数字键 = 格号探测。', { size: 11, color: SPACE.faint, wordWrap: 900 })

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
    this.shelf.setState(cells.map((value, index) => ({ id: `v${index}`, value, tone: tones[index] as 'sorted' | 'muted' | 'default' })), {
      bracket: ps.low <= ps.high ? { from: ps.low, to: ps.high, color: C.purple } : undefined,
      pointers: [{ index: ps.low, label: 'low', tone: 'blue' }, { index: ps.high, label: 'high', tone: 'orange' }],
    })

    this.hits.removeChildren().forEach(child => child.destroy({ children: true }))
    if (!ps.done) {
      for (let index = ps.low; index <= ps.high; index += 1) {
        const hit = new Graphics()
        hit.rect(SHELF_X + index * (46 + 6) - 2, SHELF_Y - 2, 50, 50)
        hit.fill({ color: 0xffffff, alpha: 0.001 })
        hit.eventMode = 'static'
        hit.cursor = 'pointer'
        hit.on('pointerdown', () => this.probe(index))
        this.hits.addChild(hit)
      }
    }

    countersRow(this.dynamic, 268, [
      { text: `🔍 探测次数 ${ps.attempts.length} / 最优 ${level.par.probes}`, color: SPACE.text },
      { text: `剩余区间 ${Math.max(0, ps.high - ps.low + 1)} / ${cells.length}`, color: SPACE.muted },
      { text: `目标光谱 ${target}`, color: C.purple },
    ])

    ps.attempts.slice(-4).forEach((attempt, displayIndex) => {
      const index = ps.attempts.indexOf(attempt)
      const verdict = attempt.result === 'found' ? '命中' : attempt.result === 'low' ? '偏低 → 排除左半' : '偏高 → 排除右半'
      const color = attempt.result === 'found' ? C.green : attempt.result === 'low' ? C.orange : C.muted
      makeText(this.dynamic, 24, 298 + displayIndex * 22, `第 ${index + 1} 次探测 A[${attempt.index + 1}] = ${attempt.value}：${verdict}`, { size: 12, color, family: 'ui-monospace, Menlo, monospace' })
    })

    if (ps.done) this.drawWin(level)
  }

  private drawWin(level: ProbeLevel) {
    const probes = this.state.attempts.length
    const medal = probeMedal(probes, level.par.probes)
    const save = loadSave()
    const previous = save[level.variants[0].id]
    const medalRank = { bronze: 1, silver: 2, gold: 3 } as const
    if (!previous || medalRank[medal] >= medalRank[previous.medal]) {
      saveRecord({ ...save, [level.variants[0].id]: { medal, moves: probes, compares: probes } })
    }
    if (this.savedKeys.has(level.id)) return
    this.savedKeys.add(level.id)

    overlayDim(this.dynamic)
    makePanel(this.dynamic, 200, 150, 560, 260, { stroke: C.greenBorder, fill: 0xf0fbf6 })
    makeText(this.dynamic, 232, 178, `${medalNames[medal]}（${probes} 次探测）`, { size: 21, color: C.green, weight: '800' })
    makeText(this.dynamic, 232, 218, `⌈log₂16⌉ = 4：每一次探测都把候选排除一半——这就是对数。`, { size: 13, color: C.ink })
    makeText(this.dynamic, 232, 246, probes <= level.par.probes ? '你完美复现了二分查找的排除效率！' : '对照 4 次的纪录想一想：哪一次探测没有落在中点附近？', { size: 12, color: C.muted, wordWrap: 500 })
    makeButton(this.dynamic, { x: 232, y: 330, w: 120, label: '再探一次', variant: 'outline', onTap: () => { this.state = initProbe(level.variants[0].cells); this.refresh(level) } })
    if (this.rest.length > 0) makeButton(this.dynamic, { x: 368, y: 330, w: 120, label: '下一关', variant: 'solid', onTap: () => openLevel(this.game, this.rest[0], this.rest.slice(1)) })
    makeButton(this.dynamic, { x: this.rest.length > 0 ? 504 : 368, y: 330, w: 120, label: '返回地图', variant: 'ghost', onTap: () => this.backToMap() })
  }

  private backToMap() {
    this.game.switch(g => new MapScene(g), '返航 → 太阳邻域')
  }

  destroy() {
    window.removeEventListener('keydown', this.keyHandler)
    this.container.destroy({ children: true })
  }
}
