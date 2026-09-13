import { Container, Graphics, Text } from 'pixi.js'

/** 算法王国 UI 工具：与站点一致的语义色与面板语言。 */

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
} as const

export const SANS = 'Inter, "PingFang SC", "Microsoft YaHei", sans-serif'
export const MONO = 'ui-monospace, Menlo, monospace'

export type FontWeight = 'normal' | 'bold' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900'

export function makeText(parent: Container, x: number, y: number, content: string, opts: { size?: number; color?: number; family?: string; weight?: FontWeight; anchorX?: number; anchorY?: number; wordWrap?: number; lineHeight?: number } = {}): Text {
  const t = new Text({ text: content, style: {
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

export function makeButton(parent: Container, opts: { x: number; y: number; w: number; h?: number; label: string; variant?: 'solid' | 'outline' | 'ghost'; size?: number; onTap: () => void }): ButtonHandle {
  const h = opts.h ?? 34
  const variant = opts.variant ?? 'solid'
  const container = new Container()
  container.position.set(opts.x, opts.y)
  const bg = new Graphics()
  const draw = (enabled: boolean) => {
    bg.clear()
    bg.roundRect(0, 0, opts.w, h, 7)
    if (variant === 'solid') {
      bg.fill({ color: C.blue, alpha: enabled ? 1 : 0.35 })
    } else if (variant === 'outline') {
      bg.fill({ color: 0xffffff })
      bg.stroke({ width: 1, color: enabled ? 0xcbd5e2 : 0xe1e7ef })
    } else {
      bg.fill({ color: 0xffffff, alpha: enabled ? 0.7 : 0.25 })
    }
  }
  const label = new Text({ text: opts.label, style: { fontFamily: SANS, fontSize: opts.size ?? 13, fontWeight: '700', fill: variant === 'solid' ? 0xffffff : variant === 'ghost' ? C.muted : C.ink } })
  label.anchor.set(0.5)
  label.position.set(opts.w / 2, h / 2)
  container.addChild(bg, label)
  let enabled = true
  container.eventMode = 'static'
  container.cursor = 'pointer'
  container.on('pointerdown', () => { if (enabled) opts.onTap() })
  draw(enabled)
  parent.addChild(container)
  return {
    container,
    setEnabled: (value: boolean) => { enabled = value; draw(value); container.cursor = value ? 'pointer' : 'default' },
    setLabel: (value: string) => { label.text = value },
  }
}
