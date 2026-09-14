/**
 * 游戏数据层：关卡即数据资产（version 字段为将来迁移留位）。
 * 模拟层 simulate(state, command) 是唯一权威；本文件只有数据，没有规则。
 * 面向用户的文案一律存于 locale.ts，本文件只持有键（level/variant/prediction 词条按 id 对应）。
 */

export type MedalTone = 'gold' | 'silver' | 'bronze'

/** 操演关的玩家命令（Command 模式：命令日志即可完整重放/撤销）。 */
export type ExecuteCommand =
  | { type: 'pick' }
  | { type: 'compare' }
  | { type: 'shift' }
  | { type: 'drop' }

/** 指挥关的指令模块：四个动作 + 循环跳转（跳回程序开头）。 */
export type Card = ExecuteCommand['type'] | 'loop'

export type ExecuteState = {
  cells: { id: string; value: number }[]
  /** 绿色"已整备区"边界：[0, sortedCount) 已有序。 */
  sortedCount: number
  /** 机械臂夹持的单元；抓取后原位成为"空槽"。 */
  held: { id: string; value: number } | null
  /** 空槽的位置（= 被抓取单元的下标，右移后向左移动）。 */
  hole: number | null
  /** 最近一次比对的结论。 */
  verdict: 'greater' | 'less-equal' | null
  compares: number
  moves: number
  done: boolean
}

/** 预测门：题目文本在 locale.prediction[variantId]，这里只留判定数据。 */
export type PredictionGate = { answer: number; when: 'first-compare' | 'done' }

export type ExecuteVariant = {
  id: string
  cells: number[]
  /** 理论最优（标准插入排序）：用于结算页对比。 */
  par: { moves: number; compares: number }
  prediction?: PredictionGate
}

export type ExecuteLevel = {
  kind: 'execute'
  id: string
  /** 真实天体目的地（关卡的航段），ly 为其真实距离（光年）。 */
  ly: number
  variants: readonly ExecuteVariant[]
}

export type CommandLevel = {
  kind: 'command'
  id: string
  ly: number
  slots: number
  cards: readonly Card[]
  par: { cards: number }
  variants: readonly { id: string; cells: number[]; prediction?: { answer: number } }[]
}

export type ProbeLevel = {
  kind: 'probe'
  id: string
  ly: number
  variants: readonly { id: string; cells: number[]; target: number }[]
  par: { probes: number }
}

export type MergeLevel = {
  kind: 'merge'
  id: string
  ly: number
  variants: readonly { id: string; cells: number[] }[]
  par: { attempts: number }
}

export type GameLevel = ExecuteLevel | ProbeLevel | CommandLevel | MergeLevel

export type SaveRecord = { medal: MedalTone; moves: number; compares: number }
export type SaveData = { [levelVariantId: string]: SaveRecord }
