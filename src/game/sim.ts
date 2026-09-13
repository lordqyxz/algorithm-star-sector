import type { ExecuteCommand, ExecuteState, LevelVariant, MedalTone } from '@/game/types'

/**
 * 模拟层：纯函数，是游戏规则的唯一权威。
 * `pick` 只允许拿"已整理区"右侧第一张牌——这正是插入排序的循环变量 j；
 * `shift` 必须先 `compare` 且结论为 greater；`drop` 在洞到达最左时可免比较（短路边界）。
 * 渲染层与存档层对具体规则无感知。
 */
export function initialExecuteState(variant: LevelVariant): ExecuteState {
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
export function foldExecute(variant: LevelVariant, commands: readonly ExecuteCommand[]): ExecuteState {
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
