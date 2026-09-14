import { MapScene } from './scenes/MapScene'
import { startGame, type Game } from './core/app'

/** 游戏入口：创建内核并落到星域地图。站点外壳（React）只负责挂载与卸载。 */
export async function startAlgorithmia(parent: HTMLElement): Promise<Game> {
  const game = await startGame(parent)
  game.switch(g => new MapScene(g))
  return game
}
