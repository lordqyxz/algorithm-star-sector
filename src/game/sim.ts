import type { Card, ExecuteCommand, ExecuteState, LevelVariant, MedalTone } from '@/game/types'

/**
 * 模拟层：纯函数，是游戏规则的唯一权威。
 * `pick` 只允许拿"已整理区"右侧第一张牌——这正是插入排序的循环变量 j；
 * `shift` 必须先 `compare` 且结论为 greater；`drop` 在洞到达最左时可免比较（短路边界）。
 * 渲染层与存档层对具体规则无感知。
 */
export function initialExecuteState(variant: { cells: readonly number[] }): ExecuteState {
  return {
    cells: variant.cells.map((value, index) => ({ id: `c${index}`, value })),
    sortedCount: 1,
    held: null,
    hole: null,
    verdict: null,
    compares: 0,
    moves: 0,
    done: false,
  }
}

export function executeCommand(state: ExecuteState, command: ExecuteCommand): ExecuteState {
  const cells = state.cells.map(cell => ({ ...cell }))
  switch (command.type) {
    case 'pick': {
      if (state.held || state.done || state.sortedCount >= cells.length) return state
      const picked = cells[state.sortedCount]
      return { ...state, cells, held: { ...picked }, hole: state.sortedCount, verdict: null }
    }
    case 'compare': {
      if (!state.held || state.hole === null || state.hole === 0) return state
      const verdict = cells[state.hole - 1].value > state.held.value ? 'greater' as const : 'less-equal' as const
      return { ...state, verdict, compares: state.compares + 1 }
    }
    case 'shift': {
      if (!state.held || state.hole === null || state.hole === 0 || state.verdict !== 'greater') return state
      cells[state.hole] = cells[state.hole - 1]
      return { ...state, cells, hole: state.hole - 1, verdict: null, moves: state.moves + 1 }
    }
    case 'drop': {
      if (!state.held || state.hole === null) return state
      if (state.hole !== 0 && state.verdict !== 'less-equal') return state
      cells[state.hole] = state.held
      const sortedCount = state.sortedCount + 1
      return { ...state, cells, held: null, hole: null, verdict: null, sortedCount, moves: state.moves + 1, done: sortedCount === cells.length }
    }
  }
}

/** 命令日志 → 状态。撤销 = 日志回滚，计数器随状态真实回退（零惩罚）。 */
export function foldExecute(variant: { cells: readonly number[] }, commands: readonly ExecuteCommand[]): ExecuteState {
  return commands.reduce(executeCommand, initialExecuteState(variant))
}

export function canExecute(state: ExecuteState, command: ExecuteCommand['type']) {
  switch (command) {
    case 'pick': return !state.held && !state.done && state.sortedCount < state.cells.length
    case 'compare': return Boolean(state.held) && state.hole !== null && state.hole > 0
    case 'shift': return Boolean(state.held) && state.hole !== null && state.hole > 0 && state.verdict === 'greater'
    case 'drop': return Boolean(state.held) && state.hole !== null && (state.hole === 0 || state.verdict === 'less-equal')
  }
}

export const commandLabels: Record<ExecuteCommand['type'], string> = {
  pick: '拿起下一张',
  compare: '与左邻比较',
  shift: '右移一格',
  drop: '放回洞里',
}

/** 奖章只看"是否用了撤销"：完成即铜、撤销≤2 银、零撤销金（零惩罚，重开不扣分）。 */
export function medalFor(undoCount: number): MedalTone {
  return undoCount === 0 ? 'gold' : undoCount <= 2 ? 'silver' : 'bronze'
}

export const medalNames: Record<MedalTone, string> = { gold: '金牌', silver: '银牌', bronze: '铜牌' }

/* —— 指挥关：程序执行器 ——
 * 程序 = 指令卡序列 + 指令指针。每步执行一张卡：动作卡走 executeCommand
 * （守卫天然处理分支，被忽略的"空转"计入运行步但不进命令日志），
 * 'loop' 在未完成时跳回程序开头。总步数上限防死循环。
 * 只影响状态的命令进入 log，foldExecute(log) 与操演关完全同构。 */

export type ProgramState = { pc: number; steps: number; finished: boolean; log: ExecuteCommand[] }

export const programStepCap = 200

export function initProgram(): ProgramState {
  return { pc: 0, steps: 0, finished: false, log: [] }
}

export function programStep(variant: { cells: readonly number[] }, program: readonly Card[], ps: ProgramState): { ps: ProgramState; changed: boolean; card: Card | null } {
  if (ps.finished || program.length === 0 || ps.steps >= programStepCap) return { ps, changed: false, card: null }
  const card = program[ps.pc % program.length]
  if (card === 'loop') {
    const state = foldExecute(variant, ps.log)
    if (state.done) return { ps: { ...ps, finished: true }, changed: false, card }
    return { ps: { ...ps, pc: 0, steps: ps.steps + 1 }, changed: false, card }
  }
  const state = foldExecute(variant, ps.log)
  const next = executeCommand(state, { type: card } as ExecuteCommand)
  const changed = next !== state
  const pc = (ps.pc + 1) % program.length
  return { ps: { pc, steps: ps.steps + 1, finished: next.done, log: changed ? [...ps.log, { type: card } as ExecuteCommand] : ps.log }, changed, card }
}

/** 指挥关奖章按卡片数（指令槽稀缺）：金 ≤par、银 ≤par+2、铜=完成。 */
export function commandMedal(cardsUsed: number, par: number): MedalTone {
  return cardsUsed <= par ? 'gold' : cardsUsed <= par + 2 ? 'silver' : 'bronze'
}

/* —— 探测关：二分查找 ——
 * 玩家亲手选探测点：每次探测排除一半候选区间，探测次数就是 log₂n 的身体感受。 */

export type ProbeAttempt = { index: number; value: number; result: 'found' | 'low' | 'high' }
export type ProbeState = { low: number; high: number; attempts: ProbeAttempt[]; done: boolean; found: boolean }

export function initProbe(cells: readonly number[]): ProbeState {
  return { low: 0, high: cells.length - 1, attempts: [], done: cells.length === 0, found: false }
}

export function probeAt(cells: readonly number[], target: number, ps: ProbeState, index: number): ProbeState {
  if (ps.done || index < ps.low || index > ps.high) return ps
  const value = cells[index]
  if (value === target) return { ...ps, attempts: [...ps.attempts, { index, value, result: 'found' }], done: true, found: true }
  if (value < target) return { ...ps, attempts: [...ps.attempts, { index, value, result: 'low' }], low: index + 1 }
  return { ...ps, attempts: [...ps.attempts, { index, value, result: 'high' }], high: index - 1 }
}

/** 探测关奖章按探测次数：金 ≤⌈log₂n⌉、银 +1、铜=完成。 */
export function probeMedal(probes: number, par: number): MedalTone {
  return probes <= par ? 'gold' : probes <= par + 1 ? 'silver' : 'bronze'
}

/* —— 归并关：双队首选择 ——
 * 两列已排序的恒星流，每次只能取队首；取了较大的一侧立即被拒（这就是合并不变量的身体感受）。 */

export type MergeCard = { id: string; value: number }
export type MergeState = { left: MergeCard[]; right: MergeCard[]; out: MergeCard[]; attempts: number; done: boolean }

export function initMerge(cells: readonly number[]): MergeState {
  const half = Math.floor(cells.length / 2)
  const card = (value: number, seed: number) => ({ id: `m${seed}`, value })
  const left = cells.slice(0, half).map((v, i) => card(v, i)).sort((a, b) => a.value - b.value)
  const right = cells.slice(half).map((v, i) => card(v, half + i)).sort((a, b) => a.value - b.value)
  return { left, right, out: [], attempts: 0, done: cells.length === 0 }
}

export function mergePick(state: MergeState, side: 'left' | 'right'): { state: MergeState; ok: boolean } {
  if (state.done) return { state, ok: false }
  const queue = side === 'left' ? state.left : state.right
  if (queue.length === 0) return { state, ok: false }
  const other = side === 'left' ? state.right : state.left
  const chosen = queue[0]
  if (other.length > 0 && chosen.value > other[0].value) return { state: { ...state, attempts: state.attempts + 1 }, ok: false }
  const next: MergeState = {
    left: side === 'left' ? state.left.slice(1) : state.left,
    right: side === 'right' ? state.right.slice(1) : state.right,
    out: [...state.out, chosen],
    attempts: state.attempts + 1,
    done: state.left.length + state.right.length === 1,
  }
  return { state: next, ok: true }
}

/** 归并关奖章按取牌次数：金 = 零失误（n 次）、银 ≤n+2、铜=完成。 */
export function mergeMedal(attempts: number, optimal: number): MedalTone {
  return attempts <= optimal ? 'gold' : attempts <= optimal + 2 ? 'silver' : 'bronze'
}