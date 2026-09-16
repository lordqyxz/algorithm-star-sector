import { Application, Container, Graphics, Text } from 'pixi.js'
import { animate } from 'animejs'
import { SPACE, makeSpaceBackdrop } from './ui'
import { loadSprites } from './sprites'

/**
 * 游戏内核（PixiJS 原生）。
 * 游戏拥有自己的场景栈：场景是带生命周期的容器，Game 负责创建 Application、
 * 切换场景、统一销毁。玩法规则仍然只住在 src/game/sim.ts（纯函数 + 命令日志）。
 */

export type GameScene = { container: Container; destroy(): void }
export type SceneFactory = (game: Game) => GameScene

export const STAGE_WIDTH = 960
export const STAGE_HEIGHT = 600

const TAU = Math.PI * 2
/** 跃迁星流用色：白心 + 冷蓝 + 暖金，避免单一纯白的塑料感。 */
const WARP_COLORS = [0xf4f8ff, 0xf4f8ff, 0x9fc0ff, 0x9fc0ff, 0xffd98a, 0x7fd4ff]

export class Game {
  readonly app: Application = new Application()
  private current: GameScene | null = null
  private host: HTMLElement | null = null
  private observer: ResizeObserver | null = null
  private background = new Container()

  async init(parent: HTMLElement) {
    this.host = parent
    await this.app.init({
      width: STAGE_WIDTH,
      height: STAGE_HEIGHT,
      backgroundAlpha: 0,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
      antialias: true,
      preference: 'webgl',
    })
    parent.appendChild(this.app.canvas)
    // 预载程序化贴图资产（缺失时全站回退矢量绘制）。
    await loadSprites()
    this.app.stage.addChild(this.background)
    this.fit()
    if (typeof ResizeObserver !== 'undefined') {
      this.observer = new ResizeObserver(() => this.fit())
      this.observer.observe(parent)
    }
  }

  /** 画布 1:1 适配容器（文字不发虚），世界坐标按 960×600 等比缩放并居中。 */
  private fit() {
    const host = this.host
    if (!host) return
    const w = Math.max(1, host.clientWidth)
    const h = Math.max(1, host.clientHeight)
    if (this.app.renderer.width !== w || this.app.renderer.height !== h) this.app.renderer.resize(w, h)
    const scale = Math.min(w / STAGE_WIDTH, h / STAGE_HEIGHT)
    this.app.stage.scale.set(scale)
    this.app.stage.position.set((w - STAGE_WIDTH * scale) / 2, (h - STAGE_HEIGHT * scale) / 2)
    this.background.removeChildren().forEach(child => child.destroy({ children: true }))
    makeSpaceBackdrop(this.background, w / scale + 40, h / scale + 40)
    this.background.position.set(-20, -20)
  }

  switch(factory: SceneFactory, transit?: string) {
    if (this.current) {
      this.app.stage.removeChild(this.current.container)
      this.current.destroy()
    }
    this.current = factory(this)
    this.app.stage.addChild(this.current.container)
    this.fit()
    if (transit) this.playTransit(transit)
  }

  /** 星际航行转场：三维透视星流（warp jump）+ 目的地航标。全部插值由 ticker 手动驱动。 */
  private playTransit(label: string) {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const overlay = new Container()
    overlay.eventMode = 'none'
    const tag = new Text({ text: label, resolution: 3, style: { fontFamily: 'Inter, "PingFang SC", sans-serif', fontSize: 22, fontWeight: '700', fill: SPACE.text, letterSpacing: 4 } })
    tag.anchor.set(0.5)
    tag.position.set(STAGE_WIDTH / 2, STAGE_HEIGHT / 2)
    tag.alpha = 0
    overlay.addChild(tag)
    this.app.stage.addChild(overlay)

    // 三段节奏：0.10s 亮起 → 0.55s 全速巡航 → 0.30s 收束，总时长约 0.95s。
    const T_RAMP = 0.10
    const T_HOLD = 0.55
    const T_FADE = 0.30
    const T_TOTAL = T_RAMP + T_HOLD + T_FADE

    if (reduced) {
      // 减动效路径：无星流，仅航标缓慢淡入淡出。
      let gone = false
      const slow = () => {
        if (gone) return
        tag.alpha = 1
        setTimeout(() => { gone = true }, 700)
      }
      this.app.ticker.add(slow)
      const fade = setInterval(() => {
        overlay.alpha -= 0.05
        if (overlay.alpha <= 0) {
          clearInterval(fade)
          this.app.ticker.remove(slow)
          overlay.destroy({ children: true })
        }
      }, 50)
      return
    }

    // —— 三维星流：每颗星持有 (方位角 a, 种子半径 r, 深度 z)，z 递减，
    // 投影半径 = r * FOCAL / z，前后两帧投影点连线即放射状拉丝。——
    const CX = STAGE_WIDTH / 2
    const CY = STAGE_HEIGHT / 2
    const FOCAL = 0.7
    const FAR = 3.2
    const NEAR = 0.08
    const SPEED = 3.2 // 深度单位/秒
    const WARP_COLORS = [0xf4f8ff, 0xf4f8ff, 0x9fc0ff, 0x9fc0ff, 0xffd98a, 0x7fd4ff]

    const spawn = (anywhere: boolean) => ({
      a: Math.random() * Math.PI * 2,
      r: 16 + Math.random() * 130,
      z: anywhere ? NEAR + Math.random() * (FAR - NEAR) : FAR,
      c: WARP_COLORS[(Math.random() * WARP_COLORS.length) | 0],
      px: 0, py: 0,
    })
    const stars = Array.from({ length: 240 }, () => {
      const s = spawn(true)
      const k = FOCAL / s.z
      s.px = CX + Math.cos(s.a) * s.r * k
      s.py = CY + Math.sin(s.a) * s.r * k * 0.72
      return s
    })

    const veil = new Graphics()
    veil.rect(0, 0, STAGE_WIDTH, STAGE_HEIGHT).fill({ color: 0x04070f, alpha: 0.65 })
    const core = new Graphics()
    const g = new Graphics()
    g.blendMode = 'add'
    core.blendMode = 'add'
    overlay.addChild(g, core, veil)
    overlay.addChildAt(veil, 0)

    let elapsed = 0
    let last = performance.now()
    const tick = () => {
      const now = performance.now()
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      elapsed += dt
      // 手动插值整体透明度，不依赖外部动画库。
      overlay.alpha = elapsed < T_RAMP
        ? elapsed / T_RAMP
        : elapsed < T_RAMP + T_HOLD ? 1
        : Math.max(0, 1 - (elapsed - T_RAMP - T_HOLD) / T_FADE)
      if (elapsed >= T_TOTAL) {
        this.app.ticker.remove(tick)
        overlay.destroy({ children: true })
        return
      }
      g.clear()
      core.clear()
      for (const s of stars) {
        s.z -= SPEED * dt
        if (s.z <= NEAR) {
          Object.assign(s, spawn(false))
          const k = FOCAL / s.z
          s.px = CX + Math.cos(s.a) * s.r * k
          s.py = CY + Math.sin(s.a) * s.r * k * 0.72
        }
        const k = FOCAL / s.z
        const x = CX + Math.cos(s.a) * s.r * k
        const y = CY + Math.sin(s.a) * s.r * k * 0.72
        const nearness = 1 - (s.z - NEAR) / (FAR - NEAR)
        g.moveTo(s.px, s.py)
          .lineTo(x, y)
          .stroke({ width: 0.6 + nearness * 3, color: s.c, alpha: 0.25 + nearness * 0.75, cap: 'round' })
        s.px = x
        s.py = y
      }
      // 中心能量核 + 起跳冲击环。
      const pulse = 5 + Math.sin(elapsed * 12) * 2
      core.circle(CX, CY, pulse).fill({ color: 0xffffff, alpha: 0.9 })
      core.circle(CX, CY, pulse * 3).fill({ color: 0x9fc0ff, alpha: 0.15 })
      if (elapsed < 0.35) {
        const rr = 20 + elapsed * 900
        core.circle(CX, CY, rr).stroke({ width: 2.5, color: 0xbfd8ff, alpha: 0.5 * (1 - elapsed / 0.35) })
      }
      // 航标：巡航段淡入，收束段淡出。
      const tagIn = Math.min(1, Math.max(0, (elapsed - 0.18) / 0.2))
      const tagOut = elapsed < 0.62 ? 1 : Math.max(0, 1 - (elapsed - 0.62) / 0.28)
      tag.alpha = tagIn * tagOut
      const sc = 0.94 + 0.06 * Math.min(1, Math.max(0, (elapsed - 0.18) / 0.3))
      tag.scale.set(sc)
    }
    this.app.ticker.add(tick)
  }


  destroy() {
    this.observer?.disconnect()
    this.observer = null
    this.current?.destroy()
    this.current = null
    this.app.destroy(true, { children: true })
  }
}

export async function startGame(parent: HTMLElement): Promise<Game> {
  const game = new Game()
  await game.init(parent)
  return game
}