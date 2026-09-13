import type { ExecuteLevel } from '@/game/types'

/** 排序平原 M0：插入排序三关。关卡全部是数据；par 由标准插入排序逐变体手工验证。 */
export const gameLevels: readonly ExecuteLevel[] = [
  {
    id: 'insertion-01',
    title: '第一箱',
    brief: '绿色货架已经整理好。拿起下一张牌，和左邻比较，决定右移还是放下——这就是插入排序的全部。',
    lesson: 'insertion-sort',
    variants: [
      {
        id: 'insertion-01-base',
        label: '新手上路',
        detail: '4 张牌',
        cells: [3, 1, 2, 4],
        par: { moves: 5, compares: 4 },
        prediction: { prompt: '拿起 1 之后，洞的左边是 3。与左邻比较后会发生什么？', options: ['3 右移一格，洞向左挪', '1 直接放回原地', '3 和 1 同时消失'], answer: 0, explanation: '3 > 1，所以 3 要给 1 让位：3 右移一格，洞向左挪一格，再继续比较。', when: 'first-compare' },
      },
    ],
  },
  {
    id: 'insertion-02',
    title: '驿站分拣',
    brief: '同样的动作，不同的货。切换下面的挑战，感受"输入的样子"如何改变你的步数。',
    lesson: 'insertion-sort',
    variants: [
      { id: 'insertion-02-base', label: '课堂混合', detail: '6 张牌', cells: [5, 2, 4, 6, 1, 3], par: { moves: 14, compares: 12 } },
      { id: 'insertion-02-sorted', label: '已经有序', detail: '最好情形', cells: [1, 2, 3, 4, 5, 6], par: { moves: 5, compares: 5 } },
      { id: 'insertion-02-reversed', label: '完全逆序', detail: '最坏情形', cells: [6, 5, 4, 3, 2, 1], par: { moves: 20, compares: 15 } },
    ],
  },
  {
    id: 'insertion-03',
    title: '逆风局',
    brief: '全逆序的货架：每张牌都要越过前面所有牌。打完这一关，你会亲眼数出 n(n−1)/2。',
    lesson: 'insertion-sort',
    variants: [
      { id: 'insertion-03-base', label: '完全逆序', detail: '6 张牌', cells: [6, 5, 4, 3, 2, 1], par: { moves: 20, compares: 15 }, prediction: { prompt: '6 张全逆序的牌，完成整理总共要比较多少次？', options: ['15 次 = 5+4+3+2+1', '6 次', '30 次'], answer: 0, explanation: '第 j 张牌要和前面 j−1 张都比一遍，加起来 5+4+3+2+1=15=n(n−1)/2——这就是最坏情况 Θ(n²) 的来源。', when: 'done' } },
      { id: 'insertion-03-nearly', label: '近似有序', detail: '只错一处', cells: [1, 2, 3, 5, 4, 6], par: { moves: 6, compares: 6 } },
    ],
  },
]
