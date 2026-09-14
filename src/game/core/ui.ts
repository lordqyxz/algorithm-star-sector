import { Container, Graphics, Text } from 'pixi.js'

/** 深空航行主题（真实天文意象：银河带 + 背景恒星，位置用固定种子保证可复现）。 */
export const SPACE = {
  bg: 0x0b1220,
  band: 0x1c2742,
  text: 0xd9e3f3,
  muted: 0x8fa3c0,
  faint: 0x5a6c88,
  star: 0xffffff,
} as const

export function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** 银河带 + 背景恒星（作为场景最底层；银河带倾斜方向与银道面意象一致）。 */
export function makeSpaceBackdrop(parent: Container, width: number, height: number, seed = 20260913): void {
  const backdrop = new Container()
  const sky = new Graphics()
  sky.rect(0, 0, width, height)
  sky.fill({ color: SPACE.bg })
  const band = new Graphics()
  band.rect(0, height * 0.42, width, height * 0.22)
  band.fill({ color: SPACE.band, alpha: 0.5 })
  backdrop.addChild(sky, band)
  const rand = mulberry32(seed)
  const stars = new Graphics()
  for (let i = 0; i < 130; i += 1) {
    const x = rand() * width
    const y = rand() * height
    const r = 0.5 + rand() * 1.4
    stars.circle(x, y, r)
    stars.fill({ color: SPACE.star, alpha: 0.25 + rand() * 0.65 })
  }
  backdrop.addChild(stars)
  parent.addChildAt(backdrop, 0)
}

/** 游戏 UI 工具：与站点一致的语义色与面板语言。 */

export const C = {
  bg: 0xeef2f7,
  panel: 0xffffff,
  border: 0xd7e0eb,
  ink: 0x172235,
  muted: 0x607087,
  faint: 0x9aa8ba,
  blue: 0x2f60d6,
  blueBg: 0xe7edff,
  green: 0x12866d,
  greenBg: 0xdcf4ec,
  greenBorder: 0x74c9ae,
  orange: 0xd96643,
  orangeBg: 0xfff0e9,
  yellow: 0xb27800,
  yellowBg: 0xfff0bf,
  purple: 0x7659d5,
  purpleBg: 0xf7f4ff,
  purpleBorder: 0xc5b9ec,
  cellBg: 0xf3f6f9,
  cellBorder: 0xcbd5e2,
  dim: 0x172235,
  disabled: 0x2a3a55,
  disabledBorder: 0x51637f,
} as const

export const SANS = 'Inter, "PingFang SC", "Microsoft YaHei", sans-serif'
export const MONO = 'ui-monospace, Menlo, monospace'

export type FontWeight = 'normal' | 'bold' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900'

export function makeText(parent: Container, x: number, y: number, content: string, opts: { size?: number; color?: number; family?: string; weight?: FontWeight; anchorX?: number; anchorY?: number; wordWrap?: number; lineHeight?: number } = {}): Text {
  const t = new Text({ text: content, resolution: 3, style: {
    fontFamily: opts.family ?? SANS,
    fontSize: opts.size ?? 14,
    fontWeight: opts.weight ?? '400',
    fill: opts.color ?? C.ink,
    wordWrap: opts.wordWrap !== undefined,
    wordWrapWidth: opts.wordWrap ?? 0,
    lineHeight: opts.lineHeight ?? 0,
    breakWords: true,
  } })
  t.position.set(x, y)
  if (opts.anchorX !== undefined || opts.anchorY !== undefined) t.anchor.set(opts.anchorX ?? 0, opts.anchorY ?? 0)
  parent.addChild(t)
  return t
}

export function makePanel(parent: Container, x: number, y: number, w: number, h: number, opts: { fill?: number; stroke?: number; radius?: number; alpha?: number } = {}): Graphics {
  const g = new Graphics()
  g.roundRect(x, y, w, h, opts.radius ?? 11)
  g.fill({ color: opts.fill ?? C.panel, alpha: opts.alpha ?? 1 })
  g.stroke({ width: 1, color: opts.stroke ?? C.border })
  parent.addChild(g)
  return g
}

export type ButtonHandle = { container: Container; setEnabled: (enabled: boolean) => void; setLabel: (label: string) => void }

/** 动作字形：给按钮一个"一眼看懂"的图形暗示（箭头/天平/探测环/循环等）。 */
export type GlyphKind = 'pick' | 'compare' | 'shift' | 'drop' | 'probe' | 'merge' | 'loop' | 'undo'

export function drawGlyph(g: Graphics, kind: GlyphKind, x: number, y: number, color: number): void {
  switch (kind) {
    case 'pick':
      g.moveTo(x + 7, y)
      g.lineTo(x + 1, y + 8)
      g.lineTo(x + 5, y + 8)
      g.lineTo(x + 5, y + 13)
      g.lineTo(x + 9, y + 13)
      g.lineTo(x + 9, y + 8)
      g.lineTo(x + 13, y + 8)
      g.closePath()
      g.fill({ color })
      break
    case 'compare':
      g.moveTo(x + 1, y + 4)
      g.lineTo(x + 13, y + 4)
      g.moveTo(x + 1, y + 10)
      g.lineTo(x + 13, y + 10)
      g.stroke({ width: 2, color })
      g.circle(x + 3.5, y + 4, 2.6)
      g.circle(x + 10.5, y + 10, 2.6)
      g.fill({ color })
      break
    case 'shift':
      g.rect(x, y + 5.5, 8, 3)
      g.fill({ color })
      g.moveTo(x + 8, y + 1.5)
      g.lineTo(x + 14, y + 7)
      g.lineTo(x + 8, y + 12.5)
      g.closePath()
      g.fill({ color })
      break
    case 'drop':
      g.moveTo(x + 7, y)
      g.lineTo(x + 1, y + 6)
      g.lineTo(x + 5, y + 6)
      g.lineTo(x + 5, y + 10)
      g.lineTo(x + 9, y + 10)
      g.lineTo(x + 9, y + 6)
      g.lineTo(x + 13, y + 6)
      g.closePath()
      g.fill({ color })
      g.rect(x - 1, y + 12, 16, 2.5)
      g.fill({ color })
      break
    case 'probe':
      g.circle(x + 7, y + 7, 5.5)
      g.stroke({ width: 2, color })
      g.moveTo(x + 7, y)
      g.lineTo(x + 7, y + 3.5)
      g.moveTo(x + 7, y + 10.5)
      g.lineTo(x + 7, y + 14)
      g.moveTo(x, y + 7)
      g.lineTo(x + 3.5, y + 7)
      g.moveTo(x + 10.5, y + 7)
      g.lineTo(x + 14, y + 7)
      g.stroke({ width: 2, color })
      break
    case 'merge':
      g.moveTo(x, y + 2)
      g.lineTo(x + 5, y + 2)
      g.lineTo(x + 5, y + 5)
      g.lineTo(x + 9, y + 5)
      g.lineTo(x + 9, y + 2)
      g.lineTo(x + 14, y + 2)
      g.moveTo(x, y + 12)
      g.lineTo(x + 5, y + 12)
      g.lineTo(x + 5, y + 9)
      g.lineTo(x + 9, y + 9)
      g.lineTo(x + 9, y + 12)
      g.lineTo(x + 14, y + 12)
      g.stroke({ width: 2, color })
      g.moveTo(x + 5.5, y + 6)
      g.lineTo(x + 8.5, y + 6)
      g.lineTo(x + 7, y + 8.5)
      g.closePath()
      g.fill({ color })
      break
    case 'loop':
      g.arc(x + 7, y + 7, 5.5, -2.4, 3.6)
      g.stroke({ width: 2, color })
      g.moveTo(x + 11, y + 0.5)
      g.lineTo(x + 14.5, y + 3.5)
      g.lineTo(x + 9.5, y + 5)
      g.closePath()
      g.fill({ color })
      break
    case 'undo':
      g.arc(x + 7, y + 7, 5.5, -0.8, 3.4)
      g.stroke({ width: 2, color })
      g.moveTo(x + 0.5, y + 1)
      g.lineTo(x + 4.5, y + 3)
      g.lineTo(x + 0.5, y + 5.5)
      g.closePath()
      g.fill({ color })
      break
  }
}

export function makeButton(parent: Container, opts: { x: number; y: number; w: number; h?: number; label: string; variant?: 'solid' | 'outline' | 'ghost'; size?: number; icon?: GlyphKind; onTap: () => void }): ButtonHandle {
  const h = opts.h ?? 34
  const variant = opts.variant ?? 'solid'
  const container = new Container()
  container.position.set(opts.x, opts.y)
  const bg = new Graphics()
  const draw = (enabled: boolean) => {
    bg.clear()
    bg.roundRect(0, 0, opts.w, h, 7)
    if (variant === 'solid') {
      bg.fill({ color: enabled ? C.blue : C.disabled })
    } else if (variant === 'outline') {
      bg.fill({ color: 0xffffff, alpha: enabled ? 1 : 0.45 })
      bg.stroke({ width: 1, color: enabled ? 0xcbd5e2 : C.disabledBorder })
    } else {
      bg.fill({ color: 0xffffff, alpha: enabled ? 0.7 : 0.25 })
    }
  }
  const label = new Text({ text: opts.label, resolution: 3, style: { fontFamily: SANS, fontSize: opts.size ?? 13, fontWeight: '700', fill: variant === 'solid' ? 0xffffff : variant === 'ghost' ? C.muted : C.ink } })
  label.anchor.set(0.5, 0.5)
  const iconColor = variant === 'solid' ? 0xffffff : variant === 'ghost' ? C.muted : C.blue
  if (opts.icon) {
    const glyph = new Graphics()
    drawGlyph(glyph, opts.icon, 11, h / 2 - 7.5, iconColor)
    container.addChild(bg, glyph, label)
    label.position.set(opts.w / 2 + 9, h / 2)
  } else {
    container.addChild(bg, label)
    label.position.set(opts.w / 2, h / 2)
  }
  let enabled = true
  container.eventMode = 'static'
  container.cursor = 'pointer'
  container.on('pointerdown', () => { if (enabled) opts.onTap() })
  const applyEnabled = (value: boolean) => {
    draw(value)
    label.alpha = value ? 1 : 0.55
    if (opts.icon) label.position.set(opts.w / 2 + 9, h / 2)
    container.cursor = value ? 'pointer' : 'default'
  }
  applyEnabled(true)
  parent.addChild(container)
  return {
    container,
    setEnabled: (value: boolean) => { enabled = value; applyEnabled(value) },
    setLabel: (value: string) => { label.text = value },
  }
}
