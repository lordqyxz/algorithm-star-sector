import type { Game } from './app'
import type { GameLevel } from '../types'
import { LevelScene } from '../scenes/LevelScene'
import { CommandScene } from '../scenes/CommandScene'
import { ProbeScene } from '../scenes/ProbeScene'
import { MergeScene } from '../scenes/MergeScene'

/** 按关卡类型分发到对应场景；rest 是后续航段（供"下一关"链）。 */
export function openLevel(game: Game, level: GameLevel, rest: readonly GameLevel[]): void {
  game.switch(g => {
    switch (level.kind) {
      case 'execute': return new LevelScene(g, level, rest)
      case 'command': return new CommandScene(g, level, rest)
      case 'probe': return new ProbeScene(g, level, rest)
      case 'merge': return new MergeScene(g, level, rest)
    }
  }, `启航 → ${level.destination}`)
}
