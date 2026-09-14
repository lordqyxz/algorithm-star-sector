import type { CommandLevel, ExecuteLevel, GameLevel, MergeLevel, ProbeLevel } from '@/game/types'

/**
 * 排序平原 M0：插入排序三关 + 指挥/探测/归并各一关。关卡全部是数据；par 由标准算法逐变体验证。
 * 文案（title/destination/brief/variant label/detail/prediction）在 locale.ts，按 id 对应。
 * 整备对象随军衔纪元升级：比邻星=燃料棒（功率）→ 天狼=谐振水晶（谐振频率）→ 织女=相位晶体（相位差）。
 */
export const executeLevels: readonly ExecuteLevel[] = [
  {
    kind: 'execute',
    id: 'insertion-01',
    ly: 4.24,
    variants: [
      {
        id: 'insertion-01-base',
        cells: [3, 1, 2, 4],
        par: { moves: 5, compares: 4 },
        prediction: { answer: 0, when: 'first-compare' },
      },
    ],
  },
  {
    kind: 'execute',
    id: 'insertion-02',
    ly: 8.6,
    variants: [
      { id: 'insertion-02-base', cells: [5, 2, 4, 6, 1, 3], par: { moves: 14, compares: 12 } },
      { id: 'insertion-02-sorted', cells: [1, 2, 3, 4, 5, 6], par: { moves: 5, compares: 5 } },
      { id: 'insertion-02-reversed', cells: [6, 5, 4, 3, 2, 1], par: { moves: 20, compares: 15 } },
    ],
  },
  {
    kind: 'execute',
    id: 'insertion-03',
    ly: 25.0,
    variants: [
      {
        id: 'insertion-03-base',
        cells: [6, 5, 4, 3, 2, 1],
        par: { moves: 20, compares: 15 },
        prediction: { answer: 0, when: 'done' },
      },
      { id: 'insertion-03-nearly', cells: [1, 2, 3, 5, 4, 6], par: { moves: 6, compares: 6 } },
    ],
  },
]

/** 指挥关：HRM 式指令模块。最优程序 = 抓取/比对/右移/放回/循环，恰 5 条。 */
const commandLevels: readonly CommandLevel[] = [
  {
    kind: 'command',
    id: 'insertion-cmd-01',
    ly: 40.7,
    slots: 6,
    cards: ['pick', 'compare', 'shift', 'drop', 'loop'],
    par: { cards: 5 },
    variants: [
      { id: 'insertion-cmd-01-base', cells: [3, 1, 2, 4], prediction: { answer: 0 } },
    ],
  },
]

const probeLevels: readonly ProbeLevel[] = [
  {
    kind: 'probe',
    id: 'barnard-probe-01',
    ly: 5.96,
    variants: [
      { id: 'barnard-probe-01-base', cells: [2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 2584], target: 233 },
    ],
    par: { probes: 4 },
  },
]

const mergeLevels: readonly MergeLevel[] = [
  {
    kind: 'merge',
    id: 'pleiades-merge-01',
    ly: 444,
    variants: [
      { id: 'pleiades-merge-01-base', cells: [21, 3, 44, 7, 15, 2, 38, 11] },
    ],
    par: { attempts: 8 },
  },
]

export const gameLevels: readonly GameLevel[] = [executeLevels[0], ...probeLevels, executeLevels[1], executeLevels[2], ...commandLevels, ...mergeLevels]
