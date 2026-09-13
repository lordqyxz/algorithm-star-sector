import { MapScene } from './scenes/MapScene'
import { startGame, type Game } from './core/app'

/** 游戏入口：创建内核并落到王国地图。学院/沙盘不经过这里（React 域）。 */
export async function startAlgorithmia(parent: HTMLElement): Promise<Game> {
  const game = await startGame(parent)
  game.switch(g => new MapScene(g))
  return game
}
