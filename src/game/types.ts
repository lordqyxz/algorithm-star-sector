/**
 * 《算法星域》数据层：关卡即数据资产（version 字段为将来迁移留位）。
 * 模拟层 simulate(state, command) 是唯一权威；本文件只有数据，没有规则。
 */

import type { DesignInsight } from '@/components/DesignNotes'

export type MedalTone = 'gold' | 'silver' | 'bronze'

/** 操演关的玩家命令（Command 模式：命令日志即可完整重放/撤销）。 */
export type ExecuteCommand =
  | { type: 'pick' }
  | { type: 'compare' }
  | { type: 'shift' }
  | { type: 'drop' }

/** 指挥关的指令卡：四个动作 + 循环跳转（跳回程序开头）。 */
export type Card = ExecuteCommand['type'] | 'loop'

export type ExecuteState = {
  cells: { id: string; value: number }[]
  /** 绿色"已整理区"边界：[0, sortedCount) 已排序。 */
  sortedCount: number
  /** 手上的 key；拿起后原位成为"洞"。 */
  held: { id: string; value: number } | null
  /** 洞的位置（= 被拿起元素的下标，右移后向左移动）。 */
  hole: number | null
  /** 最近一次比较的结论。 */
  verdict: 'greater' | 'less-equal' | null
  compares: number
  moves: number
  done: boolean
}

export type LevelVariant = {
  id: string
  label: string
  detail: string
  cells: number[]
  /** 理论最优（标准插入排序）：用于结算页对比。 */
  par: { moves: number; compares: number }
  /** 通关后解锁的设计思路（关键观察/取舍/迁移题）。 */
  insight?: DesignInsight
  prediction?: { prompt: string; options: string[]; answer: number; explanation: string; when: 'first-compare' | 'done' }
}

export type ExecuteLevel = {
  kind: 'execute'
  id: string
  /** 真实天体目的地（关卡的航段），ly 为其真实距离（光年）。 */
  destination: string
  ly: number
  title: string
  brief: string
  lesson: string
  variants: LevelVariant[]
}

export type CommandVariant = { id: string; label: string; detail: string; cells: number[]; prediction?: { prompt: string; options: string[]; answer: number; explanation: string } }

/** 指挥关：把动作写成指令程序；指令槽稀缺是教学点。 */
export type CommandLevel = {
  kind: 'command'
  id: string
  destination: string
  ly: number
  title: string
  brief: string
  lesson: string
  slots: number
  cards: readonly Card[]
  par: { cards: number }
  variants: readonly CommandVariant[]
}

export type GameLevel = ExecuteLevel | CommandLevel

export type SaveRecord = { medal: MedalTone; moves: number; compares: number }
export type SaveData = { [levelVariantId: string]: SaveRecord }
