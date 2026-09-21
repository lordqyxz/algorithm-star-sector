import type { AlgoId } from '../locale'
import type { GameLevel, SaveData } from '../types'

/**
 * 航行里程（经验）系统：完成航段获得其真实距离的光年，
 * 军衔与引擎沿「交叉里程碑」阶梯升级——晋升一档、换装一档，门槛严格交替。
 * 里程是派生状态——由存档按最佳奖章折算，不单独持久化；
 * 中文词表在 locale.ts（rank.R01 / engine.E01），本文件只持有常量 id。
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

/** 图鉴解锁态：任一对应航段有记录即解锁（派生自存档，不单独持久化）。 */
export function unlockedAlgos(save: SaveData, levels: readonly GameLevel[]): Set<AlgoId> {
  const set = new Set<AlgoId>()
  for (const level of levels) {
    if (level.variants.some(variant => Boolean(save[variant.id]))) set.add(level.algo)
  }
  return set
}

export type RankId = 'R01' | 'R02' | 'R03' | 'R04' | 'R05' | 'R06' | 'R07' | 'R08' | 'R09' | 'R10'
export type EngineId = 'E01' | 'E02' | 'E03' | 'E04' | 'E05' | 'E06' | 'E07' | 'E08' | 'E09' | 'E10'

export type Milestone = { at: number; kind: 'rank'; id: RankId } | { at: number; kind: 'engine'; id: EngineId }

/**
 * 军衔/引擎交叉里程碑（门槛升序，晋升与换装交替出现）。
 * 首档 R01/E01 是 0 光年的初始状态，不进此表。
 * 引擎最大航速与航段距离量级同步递增：聚变纪元 → 反物质 1c 亚光速极限 → 折跃纪元 → 虚空纪元。
 */
export const milestones: readonly Milestone[] = [
  { at: 1.3, kind: 'rank', id: 'R02' },
  { at: 2.2, kind: 'engine', id: 'E02' },
  { at: 4.24, kind: 'rank', id: 'R03' },
  { at: 5.5, kind: 'engine', id: 'E03' },
  { at: 8.6, kind: 'rank', id: 'R04' },
  { at: 10, kind: 'engine', id: 'E04' },
  { at: 16, kind: 'rank', id: 'R05' },
  { at: 20, kind: 'engine', id: 'E05' },
  { at: 30, kind: 'rank', id: 'R06' },
  { at: 35, kind: 'engine', id: 'E06' },
  { at: 50, kind: 'rank', id: 'R07' },
  { at: 60, kind: 'engine', id: 'E07' },
  { at: 100, kind: 'rank', id: 'R08' },
  { at: 150, kind: 'engine', id: 'E08' },
  { at: 400, kind: 'rank', id: 'R09' },
  { at: 800, kind: 'engine', id: 'E09' },
  { at: 26000, kind: 'rank', id: 'R10' },
  { at: 100000, kind: 'engine', id: 'E10' },
]

/** 当前军衔：里程已达的最高 rank 里程碑（未跨档时为 R01 学徒）。 */
export function rankOf(ly: number): RankId {
  let id: RankId = 'R01'
  for (const milestone of milestones) if (milestone.kind === 'rank' && ly >= milestone.at) id = milestone.id
  return id
}

/** 当前引擎：里程已达的最高 engine 里程碑（未跨档时为 E01 聚变待命）。 */
export function engineOf(ly: number): EngineId {
  let id: EngineId = 'E01'
  for (const milestone of milestones) if (milestone.kind === 'engine' && ly >= milestone.at) id = milestone.id
  return id
}

/** 下一个待跨越的里程碑（军衔或引擎），供「下一站」读数；全部点亮后返回 null。 */
export function nextMilestone(ly: number): Milestone | null {
  return milestones.find(milestone => milestone.at > ly) ?? null
}

/** 本次通关跨越的里程碑（结算页按序渲染晋升/换装庆祝行）。 */
export function eventsBetween(oldLy: number, newLy: number): readonly Milestone[] {
  return milestones.filter(milestone => milestone.at > oldLy && milestone.at <= newLy)
}
