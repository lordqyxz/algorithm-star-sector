import { useEffect, useRef } from 'react'
import { Application, Container, Graphics, Text } from 'pixi.js'
import { animate } from 'animejs'

/**
 * 游戏表现层（PixiJS v8，指令式懒挂载）。
 * React 模拟层仍是唯一事实源：本组件把格子快照渲染成 Pixi 容器树。
 * Sprite 以格子 id 为身份跨帧持久；坐标变化用 anime.js 做缓动插值
 * （reduced-motion 时直接落位，不生成中间帧）。
 */

export type PixiCell = { id: string; value: number; kind: 'default' | 'sorted' | 'hole' }

const CELL = 46
const GAP = 7
const RADIUS = 8

const palette = {
  default: { fill: 0xf3f6f9, stroke: 0xcbd5e2, text: 0x607087 },
  sorted: { fill: 0xdcf4ec, stroke: 0x74c9ae, text: 0x12866d },
  hole: { fill: 0xffffff, stroke: 0xd3dce6, text: 0xffffff },
} as const

type CellView = { container: Container; body: Graphics; label: Text; kind: PixiCell['kind']; col: number }

function drawCell(body: Graphics, label: Text, kind: PixiCell['kind'], value: number) {
  const theme = palette[kind]
  body.clear()
  body.roundRect(0, 0, CELL, CELL, RADIUS)
  body.fill({ color: theme.fill })
  body.stroke({ width: 1, color: theme.stroke })
  label.text = kind === 'hole' ? '' : String(value)
  label.style.fill = theme.text
}

export function PixiShelf({ cells, ariaLabel }: { cells: readonly PixiCell[]; ariaLabel?: string }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const appRef = useRef<Application | null>(null)
  const viewsRef = useRef<Map<string, CellView>>(new Map())
  const cellsRef = useRef(cells)
  cellsRef.current = cells
  const reconcileRef = useRef<() => void>(() => {})

  useEffect(() => {
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    reconcileRef.current = () => {
      const app = appRef.current
      if (!app) return
      const snapshot = cellsRef.current
      const width = Math.max(1, snapshot.length * (CELL + GAP) - GAP)
      if (app.renderer.width !== width) app.renderer.resize(width, CELL)
      const seen = new Set<string>()
      snapshot.forEach((cell, index) => {
        seen.add(cell.id)
        let view = viewsRef.current.get(cell.id)
        if (!view) {
          const container = new Container()
          const body = new Graphics()
          const label = new Text({ text: '', style: { fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 18, fontWeight: '800' } })
          label.anchor.set(0.5)
          label.position.set(CELL / 2, CELL / 2)
          container.addChild(body, label)
          container.position.set(index * (CELL + GAP), 0)
          app.stage.addChild(container)
          drawCell(body, label, cell.kind, cell.value)
          viewsRef.current.set(cell.id, { container, body, label, kind: cell.kind, col: index })
          return
        }
        if (view.kind !== cell.kind) {
          view.kind = cell.kind
          drawCell(view.body, view.label, cell.kind, cell.value)
        }
        const targetX = index * (CELL + GAP)
        if (view.col !== index) {
          view.col = index
          if (reduceMotion) view.container.position.set(targetX, 0)
          else animate(view.container, { x: targetX, duration: 220, ease: 'out(3)' })
        }
      })
      viewsRef.current.forEach((view, id) => {
        if (!seen.has(id)) {
          view.container.destroy({ children: true })
          viewsRef.current.delete(id)
        }
      })
    }
  })

  useEffect(() => {
    let cancelled = false
    const host = hostRef.current
    if (!host) return
    void (async () => {
      const app = new Application()
      await app.init({
        width: Math.max(1, cellsRef.current.length * (CELL + GAP) - GAP),
        height: CELL,
        backgroundAlpha: 0,
        resolution: Math.min(window.devicePixelRatio || 1, 2),
        autoDensity: true,
        antialias: true,
        preference: 'webgl',
      })
      if (cancelled) {
        app.destroy(true, { children: true })
        return
      }
      app.canvas.setAttribute('aria-hidden', 'true')
      host.appendChild(app.canvas)
      appRef.current = app
      reconcileRef.current()
    })()
    return () => {
      cancelled = true
      const app = appRef.current
      appRef.current = null
      viewsRef.current.clear()
      if (app) app.destroy(true, { children: true })
      host.textContent = ''
    }
  }, [])

  useEffect(() => { reconcileRef.current() }, [cells])

  return <div ref={hostRef} className="gf-pixi-host" role="img" aria-label={ariaLabel} />
}

export default PixiShelf
