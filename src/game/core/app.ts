import { Application, Container, Graphics, Text } from 'pixi.js'
import { animate } from 'animejs'
import { makeSpaceBackdrop, SPACE } from './ui'

/**
 * 算法星域游戏内核（PixiJS 原生）。
 * 游戏拥有自己的场景栈：场景是带生命周期的容器，Game 负责创建 Application、
 * 切换场景、统一销毁。玩法规则仍然只住在 src/game/sim.ts（纯函数 + 命令日志）。
 */

export type GameScene = { container: Container; destroy(): void }
export type SceneFactory = (game: Game) => GameScene

export const STAGE_WIDTH = 960
export const STAGE_HEIGHT = 600

export class Game {
  readonly app: Application = new Application()
  private current: GameScene | null = null

  async init(parent: HTMLElement) {
    await this.app.init({
      width: STAGE_WIDTH,
      height: STAGE_HEIGHT,
      backgroundAlpha: 0,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      antialias: true,
      preference: 'webgl',
    })
    parent.appendChild(this.app.canvas)
  }

  switch(factory: SceneFactory, transit?: string) {
    if (this.current) {
      this.app.stage.removeChild(this.current.container)
      this.current.destroy()
    }
    this.current = factory(this)
    makeSpaceBackdrop(this.current.container, STAGE_WIDTH, STAGE_HEIGHT)
    this.app.stage.addChild(this.current.container)
    if (transit) this.playTransit(transit)
  }

  /** 星际航行转场：星光拉线 + 目的地航标。 */
  private playTransit(label: string) {
    const overlay = new Container()
    const randSeedBase = Date.now() % 100000
    const lines = new Graphics()
    for (let i = 0; i < 26; i += 1) {
      const y = (i / 26) * STAGE_HEIGHT + Math.random() * 18
      const x = Math.random() * STAGE_WIDTH
      const len = 60 + Math.random() * 190
      lines.moveTo(x, y)
      lines.lineTo(x + len, y)
      lines.stroke({ width: 1.2, color: SPACE.star, alpha: 0.5 })
    }
    const tag = new Text({ text: label, style: { fontFamily: 'Inter, "PingFang SC", sans-serif', fontSize: 20, fontWeight: '700', fill: SPACE.text, letterSpacing: 2 } })
    tag.anchor.set(0.5)
    tag.position.set(STAGE_WIDTH / 2, STAGE_HEIGHT / 2)
    overlay.addChild(lines, tag)
    this.app.stage.addChild(overlay)
    overlay.eventMode = 'none'
    animate(overlay, { alpha: [1, 0], duration: 900, delay: 350, ease: 'inOut(2)', onComplete: () => overlay.destroy({ children: true }) })
    animate(lines, { x: [-120, 40], duration: 900, ease: 'out(3)' })
    void randSeedBase
  }

  destroy() {
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
