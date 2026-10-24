import { animate } from 'animejs'
import { Container, Graphics, Rectangle, Text } from 'pixi.js'
import type {
  TraceEdge,
  TraceFrame,
  TraceItem,
  TraceNode,
  TraceTone,
} from '../types'
import { t } from '../locale'

const P = {
  bg: 0x050d11,
  panel: 0x09191e,
  text: 0xe9eee8,
  muted: 0xa0b6b7,
  cyan: 0x9bd8da,
  copper: 0xc7996b,
  success: 0x91ba93,
  red: 0xd98272,
  border: 0x294146,
  black: 0x111719,
}
const FONT = 'Avenir Next, "PingFang SC", "Microsoft YaHei", sans-serif'
const MONO = 'ui-monospace, Menlo, monospace'
type Entity = {
  view: Container
  body: Graphics
  label: Text
  detail: Text
  signature: string
  animation: ReturnType<typeof animate> | null
}
type Box = {
  x: number
  y: number
  w: number
  h: number
  maxRow?: number
  maxCol?: number
}

/** Pixi-native, data-faithful renderer for deterministic course snapshots. */
export class TraceView {
  readonly container = new Container()
  private entities = new Map<string, Entity>()
  private layers: Container[] = []
  private reduced =
    typeof window !== 'undefined' &&
    (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false)
  private matrixScroll = { row: 0, col: 0 }
  private groupScroll = 0
  private matrixHit: Box | null = null
  private readonly onWheel = (event: WheelEvent) => {
    if (!this.matrixHit) return
    const r = this.container.getBounds()
    const canvas = document.querySelector('canvas')
    const canvasRect = canvas?.getBoundingClientRect()
    const px = event.clientX - (canvasRect?.left ?? 0),
      py = event.clientY - (canvasRect?.top ?? 0)
    const localX = px - r.x,
      localY = py - r.y
    if (
      localX < this.matrixHit.x ||
      localX > this.matrixHit.x + this.matrixHit.w ||
      localY < this.matrixHit.y ||
      localY > this.matrixHit.y + this.matrixHit.h
    )
      return
    if (event.shiftKey)
      this.matrixScroll.col = Math.max(
        0,
        this.matrixScroll.col + Math.sign(event.deltaY) * 3,
      )
    else
      this.matrixScroll.row = Math.max(
        0,
        this.matrixScroll.row + Math.sign(event.deltaY) * 2,
      )
    this.matrixScroll.col = Math.min(
      this.matrixScroll.col,
      this.matrixHit.maxCol ?? 0,
    )
    this.matrixScroll.row = Math.min(
      this.matrixScroll.row,
      this.matrixHit.maxRow ?? 0,
    )
    this.redraw()
    event.preventDefault()
  }
  private frame: TraceFrame | null = null
  private width = 0
  private height = 0
  private matrixShape = ''
  private groupShape = ''
  private layoutSignature = ''
  private animateEntities = false
  private previousPositions = new Map<
    string,
    { x: number; y: number; w: number; h: number }
  >()
  private currentPositions = new Map<
    string,
    { x: number; y: number; w: number; h: number }
  >()
  private readonly textWidths = new Map<string, number>()
  private showMoveArrows = false
  private graphLayout: 'graph' | 'tree' | 'spatial' = 'graph'

  constructor() {
    this.container.eventMode = 'static'
    if (typeof window !== 'undefined')
      window.addEventListener('wheel', this.onWheel, { passive: false })
  }

  update(
    frame: TraceFrame,
    width: number,
    height: number,
    layout: 'graph' | 'tree' | 'spatial' = 'graph',
  ): void {
    this.graphLayout = layout
    const shape = frame.matrix
      ? `${frame.matrix.rows.length}x${frame.matrix.columns.length}`
      : ''
    if (shape !== this.matrixShape) this.matrixScroll = { row: 0, col: 0 }
    this.matrixShape = shape
    const groupShape =
      frame.groups?.map((g) => `${g.id}:${g.items.length}`).join('|') ?? ''
    if (groupShape !== this.groupShape) this.groupScroll = 0
    this.groupShape = groupShape
    this.frame = frame
    this.width = Math.max(1, width)
    this.height = Math.max(1, height)
    this.redraw()
  }

  private outputPanelHeight(items: TraceItem[], panelWidth: number): number {
    const contentWidth = Math.max(1, panelWidth - 78)
    const cols = Math.max(1, Math.min(7, Math.floor((contentWidth + 4) / 52)))
    const cellWidth = (contentWidth - (cols - 1) * 4) / cols
    const wide = items.some(
      (it) =>
        this.measureTextWidth(
          it.label ? `${it.label}: ${it.value}` : String(it.value),
        ) >
        cellWidth * 1.65,
    )
    if (!wide) return 30 + Math.ceil(items.length / cols) * 60
    const rowWidth = Math.max(80, contentWidth - 12)
    const rowsHeight = items.reduce(
      (sum, it) =>
        sum +
        Math.max(
          42,
          Math.ceil(
            this.measureTextWidth(
              it.label ? `${it.label}: ${it.value}` : String(it.value),
            ) / rowWidth,
          ) *
            19 +
            16,
        ),
      0,
    )
    return 30 + rowsHeight
  }

  private redraw(): void {
    const frame = this.frame
    if (!frame) return
    for (const entity of this.entities.values()) {
      this.cancelEntityAnimation(entity)
      entity.view.parent?.removeChild(entity.view)
    }
    for (const child of this.container.removeChildren())
      child.destroy({ children: true })
    this.layers = []
    this.matrixHit = null
    this.currentPositions = new Map()
    const w = this.width,
      h = this.height,
      pad = 8,
      gap = 8
    const addLayer = () => {
      const layer = new Container()
      this.layers.push(layer)
      this.container.addChild(layer)
      return layer
    }
    const panel = (
      box: Box,
      title: string,
      layer: Container,
      outline: boolean,
    ) => {
      const g = new Graphics()
      if (outline)
        g.roundRect(box.x, box.y, box.w, box.h, 5)
          .fill({ color: P.panel, alpha: 0.55 })
          .stroke({ width: 1, color: P.border })
      else
        g.moveTo(box.x, box.y + 21)
          .lineTo(box.x + box.w, box.y + 21)
          .stroke({ width: 1, color: P.border, alpha: 0.55 })
      layer.addChild(g)
      this.text(layer, title, box.x + 8, box.y + 5, 14, P.muted, true)
    }
    const contentTop = 24
    const full = {
      x: pad,
      y: contentTop,
      w: w - pad * 2,
      h: Math.max(1, h - contentTop - pad),
    }
    const hasGraph = !!frame.nodes?.length
    const hasMatrix = !!frame.matrix
    const hasItems = !!frame.items?.length
    const hasGroups = !!frame.groups?.length
    const hasOutput = !!frame.output?.length
    if (hasOutput) {
      full.h = Math.max(
        1,
        full.h -
          Math.min(
            full.h - 40,
            this.outputPanelHeight(frame.output ?? [], full.w),
          ),
      )
    }
    const layouts: { kind: string; box: Box }[] = []
    if (hasGraph && hasMatrix) {
      if (w >= 650) {
        const left = Math.floor((full.w - gap) * 0.48)
        layouts.push(
          { kind: 'graph', box: { ...full, w: left } },
          {
            kind: 'matrix',
            box: { ...full, x: full.x + left + gap, w: full.w - left - gap },
          },
        )
      } else {
        const top = Math.floor((full.h - gap) * 0.48)
        layouts.push(
          { kind: 'graph', box: { ...full, h: top } },
          {
            kind: 'matrix',
            box: { ...full, y: full.y + top + gap, h: full.h - top - gap },
          },
        )
      }
    } else if (hasGraph && hasItems) {
      const top = Math.floor((full.h - gap) * 0.54)
      layouts.push(
        { kind: 'graph', box: { ...full, h: top } },
        {
          kind: 'items',
          box: { ...full, y: full.y + top + gap, h: full.h - top - gap },
        },
      )
    } else if (hasGraph) layouts.push({ kind: 'graph', box: full })
    else if (hasMatrix) layouts.push({ kind: 'matrix', box: full })
    else if (hasItems && hasGroups) {
      const top = Math.floor((full.h - gap) * 0.55)
      layouts.push(
        { kind: 'items', box: { ...full, h: top } },
        {
          kind: 'groups',
          box: { ...full, y: full.y + top + gap, h: full.h - top - gap },
        },
      )
    } else if (hasItems) layouts.push({ kind: 'items', box: full })
    else if (hasGroups) layouts.push({ kind: 'groups', box: full })
    else if (!hasOutput) layouts.push({ kind: 'empty', box: full })
    const signature = `${w}x${h}|${layouts.map((x) => `${x.kind}:${Math.round(x.box.w)}x${Math.round(x.box.h)}`).join('|')}`
    this.animateEntities = signature === this.layoutSignature
    this.showMoveArrows = this.animateEntities
    this.layoutSignature = signature

    const occupied = new Set<string>()
    for (const { kind, box } of layouts) {
      const layer = addLayer()
      panel(
        box,
        kind === 'graph' ? 'GRAPH' : kind.toUpperCase(),
        layer,
        kind === 'graph' || kind === 'matrix',
      )
      const inner = {
        x: box.x + 6,
        y: box.y + 25,
        w: Math.max(1, box.w - 12),
        h: Math.max(1, box.h - 30),
      }
      if (kind === 'graph')
        this.drawGraph(
          frame.nodes ?? [],
          frame.edges ?? [],
          inner,
          layer,
          occupied,
        )
      else if (kind === 'matrix' && frame.matrix)
        this.drawMatrix(frame.matrix, inner, layer)
      else if (kind === 'items')
        this.drawItems(frame.items ?? [], inner, layer, occupied, 'item')
      else if (kind === 'groups')
        this.drawGroups(frame.groups ?? [], inner, layer, occupied)
      else if (kind === 'output')
        this.drawItems(frame.output ?? [], inner, layer, occupied, 'output')
    }
    if (hasOutput) {
      const out = frame.output ?? []
      const outputHeight = this.outputPanelHeight(out, w - pad * 2)
      const box = {
        x: pad,
        y: h - pad - outputHeight,
        w: w - pad * 2,
        h: outputHeight,
      }
      const layer = addLayer()
      panel(box, 'OUTPUT', layer, false)
      this.drawItems(
        out,
        { x: box.x + 70, y: box.y + 25, w: box.w - 78, h: box.h - 28 },
        layer,
        occupied,
        'output',
      )
    }
    for (const [key, e] of this.entities)
      if (!occupied.has(key)) {
        this.cancelEntityAnimation(e)
        e.view.parent?.removeChild(e.view)
        e.view.destroy({ children: true })
        this.entities.delete(key)
      }
    this.previousPositions = this.currentPositions
    // The container is the clipping boundary owned by the scene; this hit area also keeps touch/pointer bounds finite.
    const clip = new Graphics()
      .rect(0, 0, w, h)
      .fill({ color: 0xffffff, alpha: 1 })
    this.container.addChild(clip)
    this.container.mask = clip
    this.container.hitArea = new Rectangle(0, 0, w, h)
  }

  private text(
    parent: Container,
    value: string,
    x: number,
    y: number,
    size: number,
    color: number,
    bold = false,
    mono = false,
    anchorX = 0,
    anchorY = 0.5,
    wrapWidth = 240,
  ): Text {
    const t = new Text({
      text: value,
      resolution: 3,
      style: {
        fontFamily: mono ? MONO : FONT,
        fontSize: Math.max(14, size),
        fontWeight: bold ? '700' : '500',
        fill: color,
        wordWrap: true,
        wordWrapWidth: Math.max(20, wrapWidth),
      },
    })
    t.position.set(x, y)
    t.anchor.set(anchorX, anchorY)
    parent.addChild(t)
    return t
  }
  private measureTextWidth(
    value: string,
    size = 14,
    mono = false,
    bold = false,
  ): number {
    const key = `${value}|${size}|${mono}|${bold}`
    const cached = this.textWidths.get(key)
    if (cached !== undefined) return cached
    let width: number
    if (typeof document === 'undefined')
      width = [...value].reduce(
        (sum, c) => sum + (c.charCodeAt(0) > 255 ? size : size * 0.6),
        0,
      )
    else {
      const measured = new Text({
        text: value,
        resolution: 3,
        style: {
          fontFamily: mono ? MONO : FONT,
          fontSize: size,
          fontWeight: bold ? '700' : '500',
        },
      })
      width = measured.width
      measured.destroy()
    }
    this.textWidths.set(key, width)
    return width
  }
  private tone(tone: TraceTone | undefined): number {
    return tone === 'active'
      ? P.cyan
      : tone === 'settled'
        ? P.success
        : tone === 'red'
          ? P.red
          : tone === 'black'
            ? P.black
            : tone === 'muted'
              ? P.muted
              : P.text
  }
  private cancelEntityAnimation(entity: Entity): void {
    entity.animation?.cancel()
    entity.animation = null
  }
  private entity(
    id: string,
    value: string | number,
    label: string | undefined,
    tone: TraceTone | undefined,
    x: number,
    y: number,
    w: number,
    h: number,
    parent: Container,
    occupied: Set<string>,
    prefix: string,
  ): Entity {
    const key = `${prefix}:${id}`
    occupied.add(key)
    this.currentPositions.set(key, { x, y, w, h })
    const prior = this.previousPositions.get(key)
    if (
      prefix !== 'node' &&
      this.showMoveArrows &&
      prior &&
      (Math.abs(prior.x - x) > 3 || Math.abs(prior.y - y) > 3)
    )
      this.drawMoveArrow(parent, prior, { x, y, w, h })
    let e = this.entities.get(key)
    const v = String(value),
      labelText = label ?? ''
    if (!e) {
      const view = new Container(),
        body = new Graphics(),
        val = this.text(
          view,
          v,
          0,
          0,
          14,
          P.text,
          true,
          true,
          0.5,
          0.5,
          Math.max(26, w - 8),
        ),
        detail = this.text(
          view,
          labelText,
          0,
          0,
          14,
          P.muted,
          false,
          false,
          0.5,
          0.5,
          Math.max(26, w - 8),
        )
      view.addChildAt(body, 0)
      parent.addChild(view)
      e = { view, body, label: val, detail, signature: '', animation: null }
      this.entities.set(key, e)
      view.position.set(x, y)
    } else if (e.view.parent !== parent) {
      this.cancelEntityAnimation(e)
      e.view.parent?.removeChild(e.view)
      parent.addChild(e.view)
    }
    const color = this.tone(tone)
    const sig = `${v}|${labelText}|${color}|${w}|${h}`
    if (sig !== e.signature) {
      e.body
        .clear()
        .roundRect(0, 0, w, h, 6)
        .fill({ color: color === P.black ? P.black : P.panel })
        .stroke({
          width: tone === 'active' ? 2 : 1,
          color:
            tone === 'black' ? P.muted : color === P.text ? P.border : color,
          alpha: tone === 'muted' ? 0.45 : 0.9,
        })
      e.label.text = v
      e.label.style.fill = tone === 'black' ? P.text : color
      e.label.position.set(w / 2, labelText ? h * 0.42 : h / 2)
      e.detail.text = labelText
      e.detail.position.set(w / 2, h * 0.79)
      e.detail.visible = !!labelText
      e.signature = sig
    }
    e.label.style.wordWrapWidth = Math.max(26, w - 8)
    e.detail.style.wordWrapWidth = Math.max(26, w - 8)
    this.cancelEntityAnimation(e)
    if (this.reduced || !this.animateEntities) e.view.position.set(x, y)
    else e.animation = animate(e.view, { x, y, duration: 240, ease: 'out(3)' })
    return e
  }
  private drawItems(
    items: TraceItem[],
    box: Box,
    parent: Container,
    occupied: Set<string>,
    prefix: string,
  ): void {
    if (!items.length) return
    if (prefix === 'output') {
      const contentWidth = Math.max(1, box.w)
      const cols = Math.max(1, Math.min(7, Math.floor((contentWidth + 4) / 52)))
      const cellWidth = (contentWidth - (cols - 1) * 4) / cols
      const wide = items.some(
        (it) =>
          this.measureTextWidth(
            it.label ? `${it.label}: ${it.value}` : String(it.value),
          ) >
          cellWidth * 1.65,
      )
      if (wide) {
        let y = box.y
        for (const it of items) {
          const value = it.label ? `${it.label}: ${it.value}` : String(it.value)
          const rowH = Math.max(
            40,
            Math.ceil(this.measureTextWidth(value) / Math.max(50, box.w - 12)) *
              19 +
              16,
          )
          const e = this.entity(
            it.id,
            value,
            undefined,
            it.tone,
            box.x,
            y,
            box.w,
            rowH,
            parent,
            occupied,
            prefix,
          )
          e.label.anchor.set(0, 0.5)
          e.label.position.set(10, rowH / 2)
          e.label.style.fontSize = 14
          e.label.style.fontWeight = '500'
          e.label.style.wordWrapWidth = Math.max(32, box.w - 20)
          e.detail.visible = false
          y += rowH
        }
        return
      }
    }
    if (
      prefix === 'item' &&
      items.every((it) => typeof it.value === 'number')
    ) {
      this.drawNumericBars(items, box, parent, occupied)
      return
    }
    const cols = Math.max(1, Math.min(7, Math.floor((box.w + 4) / 52))),
      cellW = (box.w - (cols - 1) * 4) / cols,
      cellH = 54
    items.forEach((it, i) => {
      const col = i % cols,
        row = Math.floor(i / cols)
      const e = this.entity(
        it.id,
        it.value,
        it.label,
        it.tone,
        box.x + col * (cellW + 4),
        box.y + row * 60,
        cellW,
        cellH,
        parent,
        occupied,
        prefix,
      )
      e.label.style.fontSize = 20
      e.label.position.set(cellW / 2, cellH * 0.42)
      e.detail.position.set(cellW / 2, cellH * 0.8)
    })
  }
  private drawNumericBars(
    items: TraceItem[],
    box: Box,
    parent: Container,
    occupied: Set<string>,
  ): void {
    const compact = box.w < 600,
      cols = Math.max(
        1,
        Math.min(compact ? 6 : 10, Math.floor((box.w + 6) / 50)),
      ),
      gap = compact ? 4 : 6,
      cellW = (box.w - gap * (cols - 1)) / cols,
      rows = Math.ceil(items.length / cols),
      rowH = box.h / rows
    const values = items.map((it) => Number(it.value)),
      min = Math.min(0, ...values),
      max = Math.max(0, ...values),
      range = max - min
    items.forEach((it, i) => {
      const col = i % cols,
        row = Math.floor(i / cols),
        x = box.x + col * (cellW + gap),
        y = box.y + row * rowH,
        barTop = y + 24,
        barBottom = y + Math.max(28, rowH - 22),
        usable = Math.max(0, barBottom - barTop),
        axisY = range === 0 ? barBottom : barTop + (max / range) * usable
      const value = Number(it.value),
        barH = range === 0 ? 0 : (Math.abs(value) / range) * usable,
        top = value >= 0 ? axisY - barH : axisY
      const e = this.entity(
        it.id,
        it.value,
        it.label,
        it.tone,
        x,
        y,
        cellW,
        rowH,
        parent,
        occupied,
        'item',
      )
      const color =
        it.tone === 'active'
          ? P.cyan
          : it.tone === 'settled'
            ? P.success
            : it.tone === 'red'
              ? P.red
              : it.tone === 'black'
                ? P.black
                : P.muted
      e.body
        .clear()
        .moveTo(0, axisY - y)
        .lineTo(cellW, axisY - y)
        .stroke({ width: 1, color: P.border })
      if (barH > 0)
        e.body
          .rect(
            Math.max(2, cellW * 0.16),
            top - y,
            cellW - Math.max(4, cellW * 0.32),
            barH,
          )
          .fill({ color, alpha: it.tone === 'muted' ? 0.56 : 0.94 })
      e.label.text = String(it.value)
      e.label.anchor.set(0.5, value >= 0 ? 1 : 0)
      e.label.position.set(
        cellW / 2,
        value >= 0
          ? Math.max(22, top - y - 3)
          : Math.min(rowH - 16, top - y + barH + 3),
      )
      e.label.style.fontFamily = MONO
      e.label.style.fontSize = 20
      e.label.style.fontWeight = '500'
      e.label.style.fill =
        it.tone === 'active'
          ? P.cyan
          : it.tone === 'settled'
            ? P.success
            : P.text
      e.detail.text = it.label ?? String(i)
      e.detail.anchor.set(0.5, 0.5)
      e.detail.position.set(cellW / 2, rowH - 10)
      e.detail.style.fontSize = 14
      e.detail.style.fill = P.muted
      e.detail.visible = true
      e.signature = `bar:${value}:${it.tone}:${it.label}:${cellW}:${rowH}`
    })
  }
  private drawMoveArrow(
    parent: Container,
    from: { x: number; y: number; w: number; h: number },
    to: { x: number; y: number; w: number; h: number },
  ): void {
    const x1 = from.x + from.w / 2,
      y1 = from.y + from.h / 2,
      x2 = to.x + to.w / 2,
      y2 = to.y + to.h / 2,
      dx = x2 - x1,
      dy = y2 - y1,
      len = Math.hypot(dx, dy)
    if (len < 8) return
    const ux = dx / len,
      uy = dy / len,
      endX = x2 - ux * 12,
      endY = y2 - uy * 12,
      head = 7
    const g = new Graphics()
      .moveTo(x1, y1)
      .lineTo(endX, endY)
      .stroke({ width: 1.5, color: P.copper, alpha: 0.78 })
    g.moveTo(endX, endY)
      .lineTo(endX - ux * head - uy * 4, endY - uy * head + ux * 4)
      .lineTo(endX - ux * head + uy * 4, endY - uy * head - ux * 4)
      .closePath()
      .fill({ color: P.copper, alpha: 0.9 })
    parent.addChildAt(g, Math.max(0, parent.children.length - 1))
  }
  private drawGroups(
    groups: { id: string; items: TraceItem[] }[],
    box: Box,
    parent: Container,
    occupied: Set<string>,
  ): void {
    const cols = Math.max(1, Math.min(7, Math.floor((box.w + 4) / 96))),
      cw = (box.w - (cols - 1) * 4) / cols
    const rows: {
      group: string
      items: TraceItem[]
      head?: boolean
      height: number
    }[] = []
    for (const group of groups) {
      const titleRows = Math.max(
        1,
        Math.ceil((group.id.length * 8) / Math.max(40, box.w - 8)),
      )
      rows.push({
        group: group.id,
        items: [],
        head: true,
        height: Math.max(30, titleRows * 18 + 8),
      })
      for (let i = 0; i < group.items.length; i += cols) {
        const items = group.items.slice(i, i + cols)
        const contentLines = Math.max(
          1,
          ...items.map(
            (it) =>
              Math.ceil(
                (String(it.value).length * 7.5) / Math.max(32, cw - 10),
              ) +
              (it.label
                ? Math.ceil((it.label.length * 7.5) / Math.max(32, cw - 10))
                : 0),
          ),
        )
        rows.push({
          group: group.id,
          items,
          height: Math.max(50, contentLines * 17 + 12),
        })
      }
    }
    const totalHeight = rows.reduce((sum, row) => sum + row.height, 0)
    const needsNav = totalHeight > box.h
    const contentH = Math.max(1, box.h - (needsNav ? 28 : 0))
    this.groupScroll = Math.max(
      0,
      Math.min(this.groupScroll, Math.max(0, rows.length - 1)),
    )
    const shown: { row: (typeof rows)[number]; index: number }[] = []
    let used = 0
    for (let i = this.groupScroll; i < rows.length; i++) {
      if (shown.length && used + rows[i].height > contentH) break
      shown.push({ row: rows[i], index: i })
      used += rows[i].height
    }
    const nextIndex = this.groupScroll + shown.length
    shown.forEach((row, ri) => {
      const item = row.row,
        y =
          box.y +
          shown.slice(0, ri).reduce((sum, entry) => sum + entry.row.height, 0)
      if (item.head)
        this.text(
          parent,
          item.group,
          box.x + 2,
          y + item.height / 2,
          14,
          P.copper,
          true,
          false,
          0,
          0.5,
          box.w - 4,
        )
      else
        item.items.forEach((it, i) => {
          const valueLines = Math.max(
            1,
            Math.ceil((String(it.value).length * 7.5) / Math.max(32, cw - 10)),
          )
          const detailLines = it.label
            ? Math.max(
                1,
                Math.ceil((it.label.length * 7.5) / Math.max(32, cw - 10)),
              )
            : 0
          const cardH = item.height - 4
          const view = this.entity(
            it.id,
            it.value,
            it.label,
            it.tone,
            box.x + i * (cw + 4),
            y + 2,
            cw,
            cardH,
            parent,
            occupied,
            `group:${item.group}`,
          )
          view.label.position.set(cw / 2, 6 + valueLines * 8.5)
          view.detail.position.set(cw / 2, cardH - 6 - detailLines * 8.5)
        })
    })
    if (needsNav)
      this.navigation(
        parent,
        box,
        () => {
          this.groupScroll = Math.max(
            0,
            this.groupScroll - Math.max(1, shown.length),
          )
          this.redraw()
        },
        () => {
          this.groupScroll = Math.min(rows.length - 1, nextIndex)
          this.redraw()
        },
        'GROUPS',
        this.groupScroll > 0,
        nextIndex < rows.length,
      )
  }
  private drawGraph(
    nodes: TraceNode[],
    edges: TraceEdge[],
    box: Box,
    parent: Container,
    occupied: Set<string>,
  ): void {
    if (!nodes.length) return
    const labelBounds = { ...box }
    if (this.graphLayout === 'spatial') {
      const side = Math.max(1, Math.min(box.w - 80, box.h - 50))
      box = {
        ...box,
        x: box.x + (box.w - side) / 2,
        y: box.y + (box.h - side) / 2,
        w: side,
        h: side,
      }
    }
    const layer = new Graphics()
    parent.addChildAt(layer, Math.max(0, parent.children.length - 1))
    const sizes = new Map<string, { w: number; h: number; wide: boolean }>()
    for (const n of nodes) {
      const label = String(n.value)
      const wide = label.length > 4
      sizes.set(n.id, {
        wide,
        w:
          this.graphLayout === 'spatial'
            ? 12
            : wide
              ? Math.max(68, Math.min(150, label.length * 8 + 18))
              : 42,
        h: this.graphLayout === 'spatial' ? 12 : wide ? 48 : 42,
      })
    }

    // Reconstruct tree and forest levels from actual edges. This also lays out
    // intermediate Huffman queues as separate trees instead of stacking nodes
    // at their coarse snapshot coordinates.
    const desired = new Map<string, { x: number; y: number }>()
    const parentId = new Map(nodes.map((n) => [n.id, n.id]))
    const find = (id: string): string => {
      const p = parentId.get(id)!
      if (p === id) return id
      const r = find(p)
      parentId.set(id, r)
      return r
    }
    const union = (a: string, b: string) => {
      const ra = find(a),
        rb = find(b)
      if (ra !== rb) parentId.set(rb, ra)
    }
    for (const e of edges)
      if (parentId.has(e.from) && parentId.has(e.to)) union(e.from, e.to)
    const components = new Map<string, TraceNode[]>()
    for (const n of nodes) {
      const root = find(n.id)
      components.set(root, [...(components.get(root) ?? []), n])
    }
    const isForest =
      this.graphLayout === 'tree' &&
      edges.length === nodes.length - components.size
    type BranchLayout = {
      nodes: TraceNode[]
      spans: Map<string, { first: number; last: number; depth: number }>
      leaves: number
      depth: number
    }
    const branches: BranchLayout[] = []
    const rank = (value: string) =>
      /left|^0$|left-child/i.test(value)
        ? -1
        : /right|^1$|right-child/i.test(value)
          ? 1
          : 0
    let forestValid = isForest
    if (isForest) {
      for (const branchNodes of components.values()) {
        const ids = new Set(branchNodes.map((n) => n.id)),
          branchEdges = edges.filter((e) => ids.has(e.from) && ids.has(e.to))
        const indegree = new Map(branchNodes.map((n) => [n.id, 0])),
          outdegree = new Map(branchNodes.map((n) => [n.id, 0]))
        for (const e of branchEdges) {
          indegree.set(e.to, (indegree.get(e.to) ?? 0) + 1)
          outdegree.set(e.from, (outdegree.get(e.from) ?? 0) + 1)
        }
        const sources = branchNodes.filter((n) => indegree.get(n.id) === 0),
          sinks = branchNodes.filter((n) => outdegree.get(n.id) === 0)
        const reverse = sources.length !== 1 && sinks.length === 1
        const root =
          !reverse && sources.length === 1
            ? sources[0]
            : reverse
              ? sinks[0]
              : undefined
        if (!root) {
          forestValid = false
          break
        }
        const children = new Map<string, TraceEdge[]>()
        for (const e of branchEdges) {
          const p = reverse ? e.to : e.from
          children.set(p, [...(children.get(p) ?? []), e])
        }
        for (const list of children.values())
          list.sort((a, b) => {
            const aw = String(a.weight ?? ''),
              bw = String(b.weight ?? ''),
              d = rank(aw) - rank(bw)
            if (d) return d
            return (
              (nodes.find((n) => n.id === (reverse ? a.from : a.to))?.x ?? 0) -
              (nodes.find((n) => n.id === (reverse ? b.from : b.to))?.x ?? 0)
            )
          })
        let leaf = 0,
          maxDepth = 0,
          visited = 0
        const spans = new Map<
          string,
          { first: number; last: number; depth: number }
        >()
        const place = (
          id: string,
          depth: number,
          active: Set<string>,
        ): { first: number; last: number } => {
          if (active.has(id)) throw new Error('not a forest')
          active.add(id)
          visited++
          maxDepth = Math.max(maxDepth, depth)
          const kids = children.get(id) ?? []
          let first: number, last: number
          if (!kids.length) {
            first = leaf
            last = leaf++
          } else {
            const intervals = kids.map((e) =>
              place(reverse ? e.from : e.to, depth + 1, active),
            )
            first = intervals[0].first
            last = intervals.at(-1)!.last
          }
          spans.set(id, { first, last, depth })
          active.delete(id)
          return { first, last }
        }
        try {
          place(root.id, 0, new Set())
        } catch {
          visited = 0
        }
        if (visited !== branchNodes.length) {
          forestValid = false
          break
        }
        branches.push({
          nodes: branchNodes,
          spans,
          leaves: leaf,
          depth: maxDepth,
        })
      }
      if (forestValid) {
        const totalLeaves = branches.reduce((sum, b) => sum + b.leaves, 0),
          gaps = Math.max(0, branches.length - 1),
          slots = totalLeaves + gaps,
          maxDepth = Math.max(0, ...branches.map((b) => b.depth))
        let offset = 0
        for (const branch of branches) {
          for (const n of branch.nodes) {
            const span = branch.spans.get(n.id)!
            const slot = offset + (span.first + span.last) / 2
            desired.set(n.id, {
              x: slots <= 1 ? 0.5 : slot / (slots - 1),
              y: maxDepth ? 0.12 + (0.76 * span.depth) / maxDepth : 0.5,
            })
          }
          offset += branch.leaves + 1
        }
      }
    }
    if (!desired.size)
      for (const n of nodes) desired.set(n.id, { x: n.x, y: n.y })

    // Pack each visual level so compound B-tree keys and Huffman weights keep
    // their own space. Relative left-to-right order and tree levels are preserved.
    const levels = new Map<number, TraceNode[]>()
    for (const n of nodes) {
      const y = desired.get(n.id)!.y,
        key = Math.round(y * 1000)
      levels.set(key, [...(levels.get(key) ?? []), n])
    }
    const centers = new Map<
      string,
      { x: number; y: number; w: number; h: number; node: TraceNode }
    >()
    if (this.graphLayout !== 'tree') {
      for (const n of nodes) {
        const size = sizes.get(n.id)!
        const px =
          this.graphLayout === 'spatial'
            ? 0
            : Math.min(
                box.w / 3,
                Math.max(...[...sizes.values()].map((s) => s.w / 2)) + 8,
              )
        const py =
          this.graphLayout === 'spatial'
            ? 0
            : Math.min(
                box.h / 3,
                Math.max(...[...sizes.values()].map((s) => s.h / 2)) + 8,
              )
        centers.set(n.id, {
          x: box.x + px + n.x * (box.w - 2 * px),
          y: box.y + py + n.y * (box.h - 2 * py),
          w: size.w,
          h: size.h,
          node: n,
        })
      }
    } else
      for (const row of levels.values()) {
        row.sort((a, b) => desired.get(a.id)!.x - desired.get(b.id)!.x)
        const total =
          row.reduce((sum, n) => sum + sizes.get(n.id)!.w, 0) +
          Math.max(0, row.length - 1) * 12
        const scale =
          total > box.w
            ? Math.max(
                0.45,
                (box.w - Math.max(0, row.length - 1) * 12) /
                  row.reduce((sum, n) => sum + sizes.get(n.id)!.w, 0),
              )
            : 1
        const widths = row.map((n) => sizes.get(n.id)!.w * scale),
          heights = row.map((n) => sizes.get(n.id)!.h)
        const packedWidth =
          widths.reduce((a, b) => a + b, 0) + Math.max(0, row.length - 1) * 12
        let x = box.x + Math.max(0, (box.w - packedWidth) / 2)
        row.forEach((n, i) => {
          const w = widths[i],
            h = heights[i],
            desiredX = box.x + desired.get(n.id)!.x * box.w
          const left = x + w / 2
          const remaining =
            widths.slice(i + 1).reduce((sum, value) => sum + value, 0) +
            Math.max(0, row.length - i - 1) * 12
          const right = box.x + box.w - remaining - w / 2
          const center = Math.max(left, Math.min(right, desiredX))
          const y =
            box.y +
            Math.max(
              h / 2 + 3,
              Math.min(box.h - h / 2 - 2, desired.get(n.id)!.y * box.h),
            )
          centers.set(n.id, { x: center, y, w, h, node: n })
          x = center + w / 2 + 12
        })
      }
    const nodeBoxes = [...centers.values()].map((p) => ({
      x: p.x - p.w / 2 - 4,
      y: p.y - p.h / 2 - 4,
      w: p.w + 8,
      h: p.h + 8,
    }))
    const placedLabels: { x: number; y: number; w: number; h: number }[] = []
    const overlaps = (
      a: { x: number; y: number; w: number; h: number },
      b: { x: number; y: number; w: number; h: number },
    ) =>
      a.x < b.x + b.w + 3 &&
      a.x + a.w + 3 > b.x &&
      a.y < b.y + b.h + 3 &&
      a.y + a.h + 3 > b.y
    const positional = new Set([
      'left',
      'right',
      'left-child',
      'right-child',
      'left-sibling',
      'right-sibling',
    ])
    for (const e of edges) {
      const a = centers.get(e.from),
        b = centers.get(e.to)
      if (!a || !b) continue
      const dx = b.x - a.x,
        dy = b.y - a.y,
        len = Math.hypot(dx, dy) || 1,
        ux = dx / len,
        uy = dy / len
      const endpoint = (p: typeof a, dirX: number, dirY: number) =>
        1 / Math.sqrt((dirX / (p.w / 2)) ** 2 + (dirY / (p.h / 2)) ** 2)
      const ra = endpoint(a, ux, uy),
        rb = endpoint(b, ux, uy)
      const sx = a.x + ux * ra,
        sy = a.y + uy * ra,
        ex = b.x - ux * rb,
        ey = b.y - uy * rb
      const color = this.tone(e.tone)
      layer
        .moveTo(sx, sy)
        .lineTo(ex, ey)
        .stroke({
          width: e.tone === 'active' ? 2.2 : 1.25,
          color,
          alpha: e.tone === 'muted' ? 0.48 : 0.9,
        })
      if (e.directed) {
        const ah = 6,
          ax = ex - ux * ah,
          ay = ey - uy * ah
        layer
          .moveTo(ex, ey)
          .lineTo(ax - uy * 3, ay + ux * 3)
          .lineTo(ax + uy * 3, ay - ux * 3)
          .closePath()
          .fill({ color, alpha: 0.92 })
      }
      if (
        e.weight === undefined ||
        positional.has(String(e.weight).toLowerCase())
      )
        continue
      const label = e.saturated
          ? t('course.saturatedEdge', { value: String(e.weight) })
          : String(e.weight),
        lw = Math.max(28, this.measureTextWidth(label, 14, true, true) + 12),
        lh = 24
      let best:
        | { x: number; y: number; w: number; h: number; score: number }
        | undefined
      for (const t of [0.5, 0.36, 0.64, 0.22, 0.78, 0.1, 0.9])
        for (const offset of [14, 22, 32, 44, 58, 74])
          for (const sign of [-1, 1]) {
            const cx = sx + (ex - sx) * t - uy * offset * sign,
              cy = sy + (ey - sy) * t + ux * offset * sign
            const r = { x: cx - lw / 2, y: cy - lh / 2, w: lw, h: lh }
            const outside =
              r.x < box.x ||
              r.y < box.y ||
              r.x + r.w > box.x + box.w ||
              r.y + r.h > box.y + box.h
            const collisions =
              nodeBoxes.filter((n) => overlaps(r, n)).length +
              placedLabels.filter((n) => overlaps(r, n)).length
            const score =
              (outside ? 10000 : 0) +
              collisions * 1000 +
              Math.abs(t - 0.5) * 10 +
              offset * 0.08
            if (!best || score < best.score) best = { ...r, score }
          }
      if (best) {
        placedLabels.push(best)
        const bg = new Graphics()
          .roundRect(best.x, best.y, best.w, best.h, 5)
          .fill({ color: P.panel, alpha: 0.96 })
          .stroke({ width: 1, color: P.border, alpha: 0.8 })
        parent.addChild(bg)
        this.text(
          parent,
          label,
          best.x + best.w / 2,
          best.y + best.h / 2,
          14,
          e.tone === 'red' ? P.red : P.copper,
          true,
          true,
          0.5,
          0.5,
          best.w - 6,
        )
      }
    }
    for (const n of nodes) {
      const p = centers.get(n.id)!,
        x = p.x - p.w / 2,
        y = p.y - p.h / 2
      this.entity(
        n.id,
        n.value,
        n.label,
        n.tone,
        x,
        y,
        p.w,
        p.h,
        parent,
        occupied,
        'node',
      )
      const ent = this.entities.get(`node:${n.id}`)!
      if (this.graphLayout === 'spatial') {
        // Keep the measured point fixed; only its coordinate label may move.
        const lw = this.measureTextWidth(String(n.value), 14, true) + 14
        const lh = 26
        let best:
          | { x: number; y: number; w: number; h: number; score: number }
          | undefined
        for (const gap of [12, 30, 48]) {
          const candidates = [
            [p.x + gap, p.y - lh / 2],
            [p.x - gap - lw, p.y - lh / 2],
            [p.x - lw / 2, p.y - gap - lh],
            [p.x - lw / 2, p.y + gap],
            [p.x + gap, p.y - gap - lh],
            [p.x - gap - lw, p.y + gap],
            [p.x - gap - lw, p.y - gap - lh],
            [p.x + gap, p.y + gap],
          ]
          for (const [x, y] of candidates) {
            const r = { x, y, w: lw, h: lh }
            const outside =
              x < labelBounds.x ||
              y < labelBounds.y ||
              x + lw > labelBounds.x + labelBounds.w ||
              y + lh > labelBounds.y + labelBounds.h
            const collisions = [...nodeBoxes, ...placedLabels].filter((other) =>
              overlaps(r, other),
            ).length
            const score = (outside ? 10000 : 0) + collisions * 1000 + gap
            if (!best || score < best.score) best = { ...r, score }
          }
        }
        if (best) {
          placedLabels.push(best)
          const cx = best.x + lw / 2,
            cy = best.y + lh / 2
          const nearestX = Math.max(best.x, Math.min(best.x + lw, p.x))
          const nearestY = Math.max(best.y, Math.min(best.y + lh, p.y))
          const leader = new Graphics()
            .moveTo(p.x, p.y)
            .lineTo(nearestX, nearestY)
            .stroke({ color: this.tone(n.tone), alpha: 0.45, width: 1 })
            .roundRect(best.x, best.y, lw, lh, 4)
            .fill({ color: P.panel, alpha: 0.96 })
          parent.addChildAt(leader, Math.max(0, parent.children.length - 1))
          ent.label.style.wordWrapWidth = lw
          ent.label.position.set(cx - x, cy - y)
        }
        ent.body
          .clear()
          .circle(6, 6, n.tone === 'active' ? 5 : 4)
          .fill(this.tone(n.tone))
          .stroke({ width: 1.5, color: P.panel })
        ent.detail.visible = false
        continue
      }
      if (sizes.get(n.id)!.wide)
        ent.body
          .clear()
          .roundRect(0, 0, p.w, p.h, 7)
          .fill({ color: n.tone === 'black' ? P.black : P.panel })
          .stroke({
            width: n.tone === 'active' ? 2.5 : 1.5,
            color: n.tone === 'black' ? P.muted : this.tone(n.tone),
          })
      else
        ent.body
          .clear()
          .circle(p.w / 2, p.h / 2, Math.min(p.w, p.h) / 2)
          .fill({ color: n.tone === 'black' ? P.black : P.panel })
          .stroke({
            width: n.tone === 'active' ? 2.5 : 1.5,
            color: n.tone === 'black' ? P.muted : this.tone(n.tone),
          })
      ent.label.position.set(p.w / 2, p.h / 2)
      ent.label.style.fontSize = 14
      ent.label.style.fontWeight = '500'
      ent.detail.visible = false
    }
  }
  private drawMatrix(
    m: {
      rows: string[]
      columns: string[]
      values: (number | string)[][]
      active?: [number, number]
    },
    box: Box,
    parent: Container,
  ): void {
    const rows = m.rows.length,
      cols = m.columns.length
    const rowHeader = Math.max(
      44,
      Math.min(
        160,
        Math.max(
          0,
          ...m.rows.map((x) => this.measureTextWidth(x, 14, false, true)),
        ) + 22,
      ),
    )
    const interior = Math.max(1, box.w - rowHeader - 8)
    const widestHeader = Math.max(
      0,
      ...m.columns.map((x) => this.measureTextWidth(x, 14, false, true)),
    )
    const widestValue = Math.max(
      0,
      ...m.values.flat().map((x) => this.measureTextWidth(String(x), 14, true)),
    )
    const desiredCell = Math.max(
      48,
      Math.min(112, Math.max(widestHeader, widestValue) + 18),
    )
    const cellW = Math.min(desiredCell, interior / Math.min(cols, 8))
    const visibleCols = Math.max(1, Math.floor(interior / cellW))
    const headerH = Math.max(
      24,
      Math.min(76, Math.ceil(widestHeader / Math.max(24, cellW - 10)) * 17 + 8),
    )
    const cellH = Math.max(
      28,
      Math.min(72, Math.ceil(widestValue / Math.max(24, cellW - 10)) * 17 + 8),
    )
    const workY = box.y + 23,
      workH = Math.max(1, box.h - 23)
    let visibleRows = Math.max(1, Math.floor((workH - headerH - 4) / cellH))
    let needsNav = rows > visibleRows || cols > visibleCols
    if (needsNav)
      visibleRows = Math.max(1, Math.floor((workH - headerH - 31) / cellH))
    needsNav = rows > visibleRows || cols > visibleCols
    if (needsNav)
      visibleRows = Math.max(1, Math.floor((workH - headerH - 31) / cellH))
    const maxRow = Math.max(0, rows - visibleRows),
      maxCol = Math.max(0, cols - visibleCols)
    this.matrixScroll.row = Math.min(this.matrixScroll.row, maxRow)
    this.matrixScroll.col = Math.min(this.matrixScroll.col, maxCol)
    this.matrixHit = { ...box, maxRow, maxCol }
    const startR = this.matrixScroll.row,
      startC = this.matrixScroll.col
    const endR = Math.min(rows, startR + visibleRows),
      endC = Math.min(cols, startC + visibleCols)
    const tableW = rowHeader + visibleCols * cellW
    const renderedRows = endR - startR
    const tableH = headerH + renderedRows * cellH
    const gridX =
      box.x + (cols <= visibleCols ? Math.max(0, (box.w - tableW) / 2) : 0)
    const gridY =
      workY + (rows <= visibleRows ? Math.max(0, (workH - tableH) / 2) : 0)
    this.text(
      parent,
      `rows ${startR + 1}–${endR}/${rows}   cols ${startC + 1}–${endC}/${cols}`,
      box.x + box.w,
      box.y + 6,
      14,
      P.muted,
      false,
      true,
      1,
      0.5,
      box.w,
    )
    const g = new Graphics()
    parent.addChild(g)
    for (let c = startC; c < endC; c++) {
      const x = gridX + rowHeader + (c - startC) * cellW
      g.roundRect(x, gridY, cellW - 3, headerH - 3, 3)
        .fill({ color: P.panel })
        .stroke({ width: 1, color: P.border })
      this.text(
        parent,
        m.columns[c] ?? String(c),
        x + (cellW - 3) / 2,
        gridY + (headerH - 3) / 2,
        14,
        P.copper,
        true,
        false,
        0.5,
        0.5,
        cellW - 10,
      )
    }
    for (let r = startR; r < endR; r++) {
      const y = gridY + headerH + (r - startR) * cellH
      this.text(
        parent,
        m.rows[r] ?? String(r),
        gridX + rowHeader - 5,
        y + cellH / 2,
        14,
        P.muted,
        true,
        false,
        1,
        0.5,
        rowHeader - 10,
      )
      for (let c = startC; c < endC; c++) {
        const x = gridX + rowHeader + (c - startC) * cellW,
          active = m.active?.[0] === r && m.active?.[1] === c
        g.roundRect(x, y, cellW - 3, cellH - 3, 3)
          .fill({ color: active ? 0x153137 : P.panel })
          .stroke({ width: 1, color: active ? P.cyan : P.border })
        this.text(
          parent,
          String(m.values[r]?.[c] ?? ''),
          x + (cellW - 3) / 2,
          y + (cellH - 3) / 2,
          14,
          active ? P.cyan : P.text,
          false,
          true,
          0.5,
          0.5,
          cellW - 10,
        )
      }
    }
    if (needsNav)
      this.navigation(
        parent,
        box,
        () => {
          this.matrixScroll.row = Math.max(
            0,
            this.matrixScroll.row - visibleRows,
          )
          this.matrixScroll.col = Math.max(
            0,
            this.matrixScroll.col - visibleCols,
          )
          this.redraw()
        },
        () => {
          this.matrixScroll.row = Math.min(
            maxRow,
            this.matrixScroll.row + visibleRows,
          )
          this.matrixScroll.col = Math.min(
            maxCol,
            this.matrixScroll.col + visibleCols,
          )
          this.redraw()
        },
        'MATRIX',
        this.matrixScroll.row > 0 || this.matrixScroll.col > 0,
        this.matrixScroll.row < maxRow || this.matrixScroll.col < maxCol,
      )
  }
  private navigation(
    parent: Container,
    box: Box,
    back: () => void,
    next: () => void,
    label: string,
    canBack: boolean,
    canNext: boolean,
  ): void {
    const y = box.y + box.h - 27,
      h = 26,
      w = 36,
      gap = 5,
      total = w * 2 + gap + 50,
      x = box.x + box.w - total
    const add = (
      caption: string,
      bx: number,
      enabled: boolean,
      fn: () => void,
    ) => {
      const c = new Container()
      c.position.set(bx, y)
      const g = new Graphics()
        .roundRect(0, 0, w, h, 5)
        .fill({ color: enabled ? 0x10282d : P.panel })
        .stroke({ width: 1, color: enabled ? P.cyan : P.border })
      c.addChild(g)
      this.text(
        c,
        caption,
        w / 2,
        h / 2,
        14,
        enabled ? P.cyan : P.muted,
        true,
        true,
        0.5,
        0.5,
        w - 2,
      )
      c.eventMode = enabled ? 'static' : 'none'
      if (enabled) {
        c.cursor = 'pointer'
        c.on('pointertap', fn)
      }
      parent.addChild(c)
    }
    this.text(
      parent,
      label,
      x - 50,
      y + h / 2,
      14,
      P.muted,
      true,
      false,
      0,
      0.5,
      48,
    )
    add('‹', x, canBack, back)
    add('›', x + w + gap, canNext, next)
  }
  destroy(): void {
    if (typeof window !== 'undefined')
      window.removeEventListener('wheel', this.onWheel)
    for (const e of this.entities.values()) {
      this.cancelEntityAnimation(e)
      e.view.parent?.removeChild(e.view)
      e.view.destroy({ children: true })
    }
    this.entities.clear()
    this.container.destroy({ children: true })
    this.frame = null
  }
}
