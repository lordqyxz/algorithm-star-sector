import type { GameLevel, SaveData } from '../types'

/**
 * 航行里程（经验）系统：完成航段获得其真实距离的光年，
 * 里程对应的称号梯度全部使用真实天文里程碑。
 * 里程是派生状态——由存档按最佳奖章折算，不单独持久化。
 */
export const medalLyFactor = { gold: 1, silver: 0.6, bronze: 0.3 } as const

export function lyOf(save: SaveData, levels: readonly GameLevel[]): number {
  let total = 0
  for (const level of levels) {
    const record = save[level.variants[0]?.id ?? '']
    if (record) total += level.ly * medalLyFactor[record.medal]
  }
  return Math.round(total * 100) / 100
}

export type LyRank = { at: number; title: string; note: string }

/** 梯度全部对应真实天文学：奥尔特云外缘约 1 光年量级；其余为真实天体距离。 */
export const lyRanks: readonly LyRank[] = [
  { at: 0, title: '地面待命', note: '国科大雁栖湖 · 任务控制中心' },
  { at: 1, title: '穿越奥尔特云', note: '奥尔特云外缘约 1 光年量级' },
  { at: 4.24, title: '比邻星访客', note: '半人马座 α 星 C · 4.24 光年' },
  { at: 10, title: '天狼航员', note: '天狼星 · 8.6 光年' },
  { at: 25, title: '织女领航员', note: '织女星 · 25 光年' },
  { at: 40.7, title: '共振航行员', note: 'TRAPPIST-1 · 40.7 光年' },
  { at: 78.5, title: '太阳邻域全图领航员', note: '太阳邻域四大航段全通' },
]

export function rankOf(ly: number): LyRank {
  return [...lyRanks].reverse().find(rank => ly >= rank.at) ?? lyRanks[0]
}

export function nextMilestone(ly: number): LyRank | null {
  return lyRanks.find(rank => rank.at > ly) ?? null
}
