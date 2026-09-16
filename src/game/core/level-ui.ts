import { Container, Graphics, Sprite, Text } from 'pixi.js'
import { animate } from 'animejs'
import { C, makeButton, makePanel, makeText, SPACE, type ButtonHandle, type FontWeight } from './ui'
import type { Game, GameScene } from './app'
import { eventsBetween, type Milestone } from './xp'
import { t, zh, type AlgoId } from '../locale'
import { makeSprite, spriteTexture, type SpriteKey } from './sprites'

/**
 * 游戏关卡可复用资产层：
 * - CellRowView：身份保持的格行视图（所有"排列/整备/定位/汇合"类关卡的共同资产）
 * - makeLevelChrome：关卡框架（标题/算法名称牌/简报/返回/控制层/动态层），统一层级关系
 * - drawAlgoPlate / drawCaseRuler：算法名称牌与最好-本次-最坏三态标尺
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

/** 程序化贴图：燃料棒包壳（高光 + 阴影 + 包壳导轨 + 铆钉），数字仍由调用方叠加。 */
export function paintFuelRodCell(body: Graphics, cell: number, theme: { fill: number; stroke: number; text: number }, asSlot: boolean): void {
  body.clear()
  const r = 8
  if (asSlot) {
    paintSocket(body, cell)
    return
  }
  // 基底
  body.roundRect(0, 0, cell, cell, r)
  body.fill({ color: theme.fill })
  body.stroke({ width: 1, color: theme.stroke })
  // 燃料棒包壳导轨（左右两条竖筋）
  body.roundRect(4, 6, 3.5, cell - 12, 1.75).fill({ color: theme.stroke, alpha: 0.5 })
  body.roundRect(cell - 7.5, 6, 3.5, cell - 12, 1.75).fill({ color: theme.stroke, alpha: 0.5 })
  // 顶部高光 + 底部阴影（体积感）
  body.roundRect(3, 3, cell - 6, cell * 0.32, 6).fill({ color: 0xffffff, alpha: 0.16 })
  body.roundRect(3, cell * 0.74, cell - 6, cell * 0.2, 5).fill({ color: 0x000000, alpha: 0.1 })
  // 四角铆钉
  for (const [rx, ry] of [[8, 8], [cell - 8, 8], [8, cell - 8], [cell - 8, cell - 8]]) {
    body.circle(rx, ry, 1.4).fill({ color: theme.stroke, alpha: 0.55 })
  }
}

/** 程序化贴图：空槽 = 下凹插座（深色内嵌 + 内框 + 四角 L 型限位 + 向下放入箭头）。 */
export function paintSocket(body: Graphics, cell: number): void {
  body.roundRect(0, 0, cell, cell, 8)
  body.fill({ color: 0x0d1626 })
  body.stroke({ width: 1, color: 0x3a4d6b })
  body.roundRect(5, 5, cell - 10, cell - 10, 6).stroke({ width: 1, color: 0x26354f })
  const inset = 3
  const tick = 7
  for (const [px, py, dx, dy] of [[inset, inset, 1, 1], [cell - inset, inset, -1, 1], [inset, cell - inset, 1, -1], [cell - inset, cell - inset, -1, -1]]) {
    body.moveTo(px + dx * tick, py + dy * 2).lineTo(px + dx * 2, py + dy * 2).lineTo(px + dx * 2, py + dy * tick)
    body.stroke({ width: 2, color: 0x53708f })
  }
  const c = cell / 2
  body.moveTo(c - 5, c - 3).lineTo(c, c + 3).lineTo(c + 5, c - 3)
  body.stroke({ width: 2, color: 0x53708f })
}
export class CellRowView {
  readonly container = new Container()
  private views = new Map<string, { container: Container; body: Graphics; sprite: Sprite; label: Text; kind: CellRowTone; col: number }>()
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
        const sprite = new Sprite()
        sprite.visible = false
        const label = new Text({ text: '', resolution: 3, style: { fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 18, fontWeight: '800' } })
        label.anchor.set(0.5)
        label.position.set(cell / 2, cell / 2)
        container.addChild(body, sprite, label)
        container.position.set(this.opts.x + index * (cell + gap), this.opts.y)
        this.cellsLayer.addChild(container)
        this.paint({ body, sprite }, label, item, options.slotAt === index)
        this.views.set(item.id, { container, body, sprite, label, kind: item.tone, col: index })
        return
      }
      if (view.kind !== item.tone) { view.kind = item.tone }
      this.paint({ body: view.body, sprite: view.sprite }, view.label, item, options.slotAt === index)
      if (options.slotAt !== index) view.label.text = String(item.value)
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

  private paint(layers: { body: Graphics; sprite: Sprite }, label: Text, item: CellRowCell, asSlot: boolean) {
    const { body, sprite } = layers
    const key: SpriteKey | null = asSlot || item.tone === 'slot' ? 'socket' : item.tone === 'default' ? 'rodDefault' : item.tone === 'sorted' ? 'rodSorted' : item.tone === 'focus' ? 'rodFocus' : item.tone === 'key' ? 'rodKey' : item.tone === 'pivot' ? 'rodPivot' : item.tone === 'target' ? 'rodTarget' : item.tone === 'muted' ? 'rodMuted' : null
    const texture = key ? spriteTexture(key) : null
    if (texture) {
      body.clear()
      sprite.texture = texture
      sprite.width = this.cell
      sprite.height = this.cell
      sprite.visible = true
    } else {
      paintFuelRodCell(body, this.cell, cellRowPalette[item.tone], asSlot || item.tone === 'slot')
      sprite.visible = false
    }
    label.text = asSlot || item.tone === 'slot' ? '' : String(item.value)
    label.style.fill = cellRowPalette[item.tone].text
  }

  destroy() {
    this.container.destroy({ children: true })
  }
}

/** 算法名称牌：给每一关一个稳定的算法身份（名称在 locale.algo 词表，数据层只持 AlgoId）。 */
export function drawAlgoPlate(parent: Container, opts: { x: number; y: number; algo: AlgoId; anchorX?: 0 | 1 }): void {
  const algo = zh.algo[opts.algo]
  const text = makeText(parent, 0, opts.y, t('ui.algoPlate', { name: algo.name, en: algo.en }), { size: 12, weight: '800', color: SPACE.text })
  const keyline = new Graphics()
  if (opts.anchorX === 1) {
    text.x = opts.x - text.width - 12
    keyline.roundRect(opts.x - 6, opts.y + 4, 6, 6, 2).fill({ color: C.yellow })
  } else {
    text.x = opts.x + 12
    keyline.roundRect(opts.x, opts.y + 4, 6, 6, 2).fill({ color: C.yellow })
  }
  parent.addChild(keyline)
}

/**
 * 三态标尺：把「本次比对次数」放到 最好 n−1 与 最坏 n(n−1)/2 的同一把尺上读数。
 * 同规模输入，落点由输入形态决定——随机输入落在中段，这正是平均情形的图像来源。
 * 返回标尺块之后的下一行 y。
 */
export function drawCaseRuler(parent: Container, x: number, y: number, n: number, you: number): number {
  const width = 496
  const best = n - 1
  const worst = (n * (n - 1)) / 2
  const pos = (value: number) => x + (width * value) / worst
  makeText(parent, x, y, t('ui.caseRulerTitle', { n }), { size: 11, color: C.muted })
  const barY = y + 34
  const graphics = new Graphics()
  graphics.roundRect(x, barY, width, 6, 3).fill({ color: C.cellBg }).stroke({ width: 1, color: C.cellBorder })
  graphics.rect(pos(best) - 1, barY - 6, 2, 18).fill({ color: C.green })
  graphics.rect(x + width - 1, barY - 6, 2, 18).fill({ color: C.orange })
  const px = Math.max(x + 2, Math.min(x + width - 2, pos(you)))
  graphics.rect(px - 1, barY - 10, 2, 26).fill({ color: C.yellow })
  graphics.circle(px, barY + 3, 3.5).fill({ color: C.yellow }).stroke({ width: 1.5, color: 0xffffff })
  parent.addChild(graphics)
  makeText(parent, Math.max(x + 36, Math.min(x + width - 36, px)), y + 14, t('ui.caseYou', { n: you }), { size: 11, weight: '800', color: C.yellow, anchorX: 0.5 })
  makeText(parent, Math.max(x + 40, pos(best)), barY + 16, t('ui.caseBest', { n: best }), { size: 10, color: C.green, anchorX: 0.5, family: 'ui-monospace, Menlo, monospace' })
  makeText(parent, x + width, barY + 16, t('ui.caseWorst', { n: worst }), { size: 10, color: C.orange, anchorX: 1, family: 'ui-monospace, Menlo, monospace' })
  return barY + 34
}

/** 关卡框架：标题/算法名称牌/简报/返回 + 控制层（按钮）+ 动态层（覆盖层最后渲染，永远在按钮之上）。 */
export type LevelChrome = { container: Container; controls: Container; dynamic: Container }

export function makeLevelChrome(parent: Container, opts: { title: string; brief: string; algo?: AlgoId; onBack: () => void }): LevelChrome {
  makeText(parent, 24, 20, opts.title, { size: 20, weight: '800', color: SPACE.text })
  if (opts.algo) {
    drawAlgoPlate(parent, { x: 24, y: 55, algo: opts.algo })
    makeText(parent, 24, 74, opts.brief, { size: 12, color: SPACE.muted, wordWrap: 840 })
  } else {
    makeText(parent, 24, 52, opts.brief, { size: 12, color: SPACE.muted, wordWrap: 840 })
  }
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
  // 整行均匀分布：首列左对齐、末列右对齐、中间列居中，撑满 24..936 有效宽度。
  const n = items.length
  const span = 912
  items.forEach((item, index) => {
    const first = index === 0
    const last = index === n - 1
    const x = first || n === 1 ? 24 : last ? 936 : 24 + (span / (n - 1)) * index
    makeText(parent, x, y, item.text, { size: 13, color: item.color ?? SPACE.text, family: 'ui-monospace, Menlo, monospace', anchorX: last && n > 1 ? 1 : 0 })
  })
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

/** 关卡标题：title 已含目的地主名时不再重复拼接 destination（避免「比邻星 · 比邻星（…）」）。 */
export function levelHeading(text: { title: string; destination: string }): string {
  const base = text.destination.split('（')[0]
  return text.title.includes(base) ? text.title : `${text.title} · ${text.destination}`
}

export { makeButton, type ButtonHandle, type FontWeight }
