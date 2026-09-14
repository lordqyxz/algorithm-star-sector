import { Container, Graphics, Text } from 'pixi.js'
import { animate } from 'animejs'
import { C, makeButton, makePanel, makeText, SPACE, type ButtonHandle, type FontWeight } from './ui'
import type { Game, GameScene } from './app'
import { eventsBetween, type Milestone } from './xp'
import { t, zh } from '../locale'

/**
 * 游戏关卡可复用资产层：
 * - CellRowView：身份保持的格行视图（所有"排列/整备/定位/汇合"类关卡的共同资产）
 * - makeLevelChrome：关卡框架（标题/简报/返回/控制层/动态层），统一层级关系
 * - overlayDim / countersRow / drawMilestones：覆盖层、计数控件与里程碑庆祝行
 * 规则层（各关 sim）与本层完全解耦。
 */

export type CellRowTone = 'default' | 'sorted' | 'focus' | 'key' | 'pivot' | 'target' | 'muted' | 'slot'

export const cellRowPalette: Record<CellRowTone, { fill: number; stroke: number; text: number }> = {
  default: { fill: 0xf3f6f9, stroke: 0xcbd5e2, text: 0x607087 },
  sorted: { fill: 0xdcf4ec, stroke: 0x74c9ae, text: 0x12866d },
  focus: { fill: 0xe7edff, stroke: 0x2f60d6, text: 0x2f60d6 },
  key: { fill: 0xfff0bf, stroke: 0xb27800, text: 0xb27800 },
  pivot: { fill: 0xfff0e9, stroke: 0xd96643, text: 0xd96643 },
  target: { fill: 0xf7f4ff, stroke: 0x7659d5, text: 0x7659d5 },
  muted: { fill: 0x1c2742, stroke: 0x3a4d6b, text: 0x8fa3c0 },
  slot: { fill: 0xffffff, stroke: 0xd3dce6, text: 0xffffff },
}

export type CellRowCell = { id: string; value: number | string; tone: CellRowTone }
export type CellRowPointer = { index: number; label: string; tone?: 'dark' | 'blue' | 'orange' | 'green' | 'purple' | 'yellow' }
export type CellRowBracket = { from: number; to: number; label?: string; color?: number }

const pointerColors: Record<NonNullable<CellRowPointer['tone']>, number> = {
  dark: 0x172235, blue: 0x2f60d6, orange: 0xd96643, green: 0x12866d, purple: 0x7659d5, yellow: 0xb27800,
}

export class CellRowView {
  readonly container = new Container()
  private views = new Map<string, { container: Container; body: Graphics; label: Text; kind: CellRowTone; col: number }>()
  private bracket = new Graphics()
  private cellsLayer = new Container()
  private pointers = new Container()
  private cell: number
  private gap: number

  constructor(private opts: { x: number; y: number; cell?: number; gap?: number }) {
    this.cell = opts.cell ?? 46
    this.gap = opts.gap ?? 7
    this.container.addChild(this.bracket, this.cellsLayer, this.pointers)
  }

  /** cells 必须带稳定 id；tone 决定外观；slotAt 让该格显示为空（机械臂抓持后的空槽语义）。 */
  setState(cells: readonly CellRowCell[], options: { pointers?: readonly CellRowPointer[]; bracket?: CellRowBracket; slotAt?: number | null } = {}) {
    const cell = this.cell
    const gap = this.gap
    this.bracket.clear()
    const bracket = options.bracket
    if (bracket && bracket.to >= bracket.from) {
      const x = this.opts.x + bracket.from * (cell + gap) - 4
      const w = (bracket.to - bracket.from + 1) * (cell + gap) - gap + 8
      this.bracket.roundRect(x, this.opts.y - 7, w, cell + 14, 10)
      this.bracket.stroke({ width: 1.5, color: bracket.color ?? C.purple })
    }
    this.pointers.removeChildren().forEach(child => child.destroy({ children: true }))
    for (const pointer of options.pointers ?? []) {
      const px = this.opts.x + pointer.index * (cell + gap) + cell / 2
      const chip = new Text({ text: pointer.label, resolution: 3, style: { fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 10, fontWeight: '800', fill: 0xffffff } })
      chip.anchor.set(0.5)
      chip.position.set(px, this.opts.y - 18)
      const pill = new Graphics()
      pill.roundRect(px - chip.width / 2 - 5, this.opts.y - 27, chip.width + 10, 18, 5)
      pill.fill({ color: pointerColors[pointer.tone ?? 'dark'] })
      this.pointers.addChild(pill, chip)
    }
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const seen = new Set<string>()
    cells.forEach((item, index) => {
      seen.add(item.id)
      let view = this.views.get(item.id)
      if (!view) {
        const container = new Container()
        const body = new Graphics()
        const label = new Text({ text: '', resolution: 3, style: { fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 18, fontWeight: '800' } })
        label.anchor.set(0.5)
        label.position.set(cell / 2, cell / 2)
        container.addChild(body, label)
        container.position.set(this.opts.x + index * (cell + gap), this.opts.y)
        this.cellsLayer.addChild(container)
        this.paint(body, label, item, options.slotAt === index)
        this.views.set(item.id, { container, body, label, kind: item.tone, col: index })
        return
      }
      if (view.kind !== item.tone) { view.kind = item.tone; this.paint(view.body, view.label, item, options.slotAt === index) }
      else if (options.slotAt !== index) view.label.text = String(item.value)
      const targetX = this.opts.x + index * (cell + gap)
      if (view.col !== index) {
        view.col = index
        if (reduceMotion) view.container.position.set(targetX, this.opts.y)
        else animate(view.container, { x: targetX, duration: 220, ease: 'out(3)' })
      }
    })
    this.views.forEach((view, id) => {
      if (!seen.has(id)) { view.container.destroy({ children: true }); this.views.delete(id) }
    })
  }

  private paint(body: Graphics, label: Text, item: CellRowCell, asSlot: boolean) {
    const theme = cellRowPalette[item.tone]
    body.clear()
    body.roundRect(0, 0, this.cell, this.cell, 8)
    body.fill({ color: theme.fill })
    body.stroke({ width: 1, color: theme.stroke })
    label.text = asSlot || item.tone === 'slot' ? '' : String(item.value)
    label.style.fill = theme.text
  }

  destroy() {
    this.container.destroy({ children: true })
  }
}

/** 关卡框架：标题/简报/返回 + 控制层（按钮）+ 动态层（覆盖层最后渲染，永远在按钮之上）。 */
export type LevelChrome = { container: Container; controls: Container; dynamic: Container }

export function makeLevelChrome(parent: Container, opts: { title: string; brief: string; onBack: () => void }): LevelChrome {
  makeText(parent, 24, 20, opts.title, { size: 20, weight: '800', color: SPACE.text })
  makeText(parent, 24, 52, opts.brief, { size: 12, color: SPACE.muted, wordWrap: 760 })
  makeButton(parent, { x: 936 - 96, y: 20, w: 96, label: t('ui.backToMap'), variant: 'outline', onTap: opts.onBack })
  const controls = new Container()
  const dynamic = new Container()
  parent.addChild(controls, dynamic)
  return { container: parent, controls, dynamic }
}

export function overlayDim(dynamic: Container, width = 960, height = 600) {
  const dim = makePanel(dynamic, 0, 0, width, height, { fill: C.dim, alpha: 0.35, radius: 0 })
  dim.eventMode = 'static'
}

export function countersRow(parent: Container, y: number, items: readonly { text: string; color?: number }[]) {
  items.forEach((item, index) => makeText(parent, 24 + index * 236, y, item.text, { size: 13, color: item.color ?? SPACE.text, family: 'ui-monospace, Menlo, monospace' }))
}

/** 结算页里程碑庆祝行：按序渲染本次跨越的晋升/换装事件，返回下一行 y。 */
export function drawMilestones(parent: Container, x: number, y: number, oldLy: number, newLy: number): number {
  const crossed = eventsBetween(oldLy, newLy)
  for (const milestone of crossed as readonly Milestone[]) {
    const text = milestone.kind === 'rank'
      ? t('ui.promote', { title: zh.rank[milestone.id].title, note: zh.rank[milestone.id].note })
      : t('ui.engineSwap', { name: zh.engine[milestone.id].name, speed: zh.engine[milestone.id].speed })
    makeText(parent, x, y, text, { size: 13, color: 0xf2c85d, weight: '800' })
    y += 21
  }
  return y
}

export { makeButton, type ButtonHandle, type FontWeight }
