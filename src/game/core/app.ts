import { Application, Container } from 'pixi.js'

/**
 * 算法王国游戏内核（PixiJS 原生）。
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

  switch(factory: SceneFactory) {
    if (this.current) {
      this.app.stage.removeChild(this.current.container)
      this.current.destroy()
    }
    this.current = factory(this)
    this.app.stage.addChild(this.current.container)
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
