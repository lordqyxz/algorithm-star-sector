import type { CommandLevel, ExecuteLevel, GameLevel, MergeLevel, ProbeLevel } from '@/game/types'

/** 排序平原 M0：插入排序三关。关卡全部是数据；par 由标准插入排序逐变体手工验证。 */
export const executeLevels: readonly ExecuteLevel[] = [
  {
    kind: 'execute',
    id: 'insertion-01',
    destination: '比邻星（半人马座 α 星 C）',
    ly: 4.24,
    title: '首航 · 比邻星',
    brief: '首段航程目的地：比邻星，距地球 4.24 光年，最近的恒星，拥有一颗宜居带行星 Proxima b。拿起下一张牌，和左邻比较，决定右移还是放下。',
    lesson: 'insertion-sort',
    variants: [
      {
        id: 'insertion-01-base',
        label: '新手上路',
        detail: '4 张牌',
        cells: [3, 1, 2, 4],
        par: { moves: 5, compares: 4 },
        prediction: { prompt: '拿起 1 之后，洞的左边是 3。与左邻比较后会发生什么？', options: ['3 右移一格，洞向左挪', '1 直接放回原地', '3 和 1 同时消失'], answer: 0, explanation: '3 > 1，所以 3 要给 1 让位：3 右移一格，洞向左挪一格，再继续比较。', when: 'first-compare' },
        insight: {
          observation: '绿色货架是循环不变量：拿起、比较、右移、放下，每个动作都只在"不破坏绿色区"的前提下进行——正确性不靠检查全局，只靠维护这一条局部性质。',
          contrasts: [
            { alternative: '选择排序（每轮找最小值放到最前）', whyNot: '比较次数固定 n²/2，不看输入脸色、移动更少；但相等键会跨越（不稳定），也无法在有序输入上提前收工——插入排序能拿到 Θ(n) 的最好情况。' },
          ],
          transfer: { prompt: '如果货架是链表而不是数组，"右移一格"会变成什么？', options: ['不用右移：找到位置后改两个指针即可插入', '还是要逐格右移', '链表不能插入排序'], answer: 0, explanation: '数组插入要搬动后面所有元素；链表插入只改指针——"找位置"仍要逐个比较，但"腾位置"的成本消失了。' },
        },
      },
    ],
  },
  {
    kind: 'execute',
    id: 'insertion-02',
    destination: '天狼星（夜空最亮恒星，双星系统）',
    ly: 8.6,
    title: '天狼双星 · 分拣',
    brief: '同样的动作，不同的货。切换下面的挑战，感受"输入的样子"如何改变你的步数。',
    lesson: 'insertion-sort',
    variants: [
      { id: 'insertion-02-base', label: '课堂混合', detail: '6 张牌', cells: [5, 2, 4, 6, 1, 3], par: { moves: 14, compares: 12 }, insight: {
        observation: '同一个算法，输入的样子决定代价：有序 5 步（Θ(n)）、逆序 20 步（Θ(n²)）——谈复杂度永远要带上"输入条件"这三个字。',
        contrasts: [
          { alternative: '二分插入（用二分找插入位置）', whyNot: '比较次数降到 Θ(n log n)，但右移步数一步都省不掉——移动是插入排序的硬成本，省比较不省移动。' },
        ],
        transfer: { prompt: '二分插入排序的整体复杂度是？', options: ['仍是 Θ(n²)：移动步数不变', 'Θ(n log n)：比较和移动都省了', 'Θ(n)'], answer: 0, explanation: '二分只优化"找位置"；每次插入平均仍要搬动一半元素，总移动量还是 n²/4 量级。' },
      } },
      { id: 'insertion-02-sorted', label: '已经有序', detail: '最好情形', cells: [1, 2, 3, 4, 5, 6], par: { moves: 5, compares: 5 } },
      { id: 'insertion-02-reversed', label: '完全逆序', detail: '最坏情形', cells: [6, 5, 4, 3, 2, 1], par: { moves: 20, compares: 15 } },
    ],
  },
  {
    kind: 'execute',
    id: 'insertion-03',
    destination: '织女星（天琴座 α，带岩屑盘）',
    ly: 25.0,
    title: '织女 · 逆风航段',
    brief: '全逆序的能量矩阵：每张牌都要越过前面所有牌。打完这一关，你会亲眼数出 n(n−1)/2。',
    lesson: 'insertion-sort',
    variants: [
      { id: 'insertion-03-base', label: '完全逆序', detail: '6 张牌', cells: [6, 5, 4, 3, 2, 1], par: { moves: 20, compares: 15 }, insight: {
        observation: '最坏情况能被精确数出来：n(n−1)/2。好的算法设计要回答"最坏会怎样"，而不只是"平均还不错"。',
        contrasts: [
          { alternative: '归并排序', whyNot: '用 O(n) 辅助空间换掉最坏情况：任何输入都封顶 Θ(n log n)——"空间换保障"是分治的经典交易。' },
        ],
        transfer: { prompt: '要按"最坏情况"做预算（如实时系统、被对手构造输入的服务），应优先选？', options: ['归并这类有最坏界保证的算法', '平均快但最坏会崩的算法', '随便哪个都行'], answer: 0, explanation: '对手输入会让"平均很快"的算法长期踩在最坏情况上；有最坏界保证的算法才能被写进 SLA。' },
      }, prediction: { prompt: '6 张全逆序的牌，完成整理总共要比较多少次？', options: ['15 次 = 5+4+3+2+1', '6 次', '30 次'], answer: 0, explanation: '第 j 张牌要和前面 j−1 张都比一遍，加起来 5+4+3+2+1=15=n(n−1)/2——这就是最坏情况 Θ(n²) 的来源。', when: 'done' } },
      { id: 'insertion-03-nearly', label: '近似有序', detail: '只错一处', cells: [1, 2, 3, 5, 4, 6], par: { moves: 6, compares: 6 } },
    ],
  },
]

/** 指挥关：HRM 式指令卡。最优程序 = 拿起/比较/右移/放下/循环，恰 5 张。 */
const commandLevels: readonly CommandLevel[] = [
  {
    kind: 'command',
    id: 'insertion-cmd-01',
    destination: 'TRAPPIST-1（七行星轨道共振链）',
    ly: 40.7,
    title: 'TRAPPIST-1 · 共振指令',
    brief: 'TRAPPIST-1 距地球 40.7 光年，七颗行星处于接近轨道共振的链条上。把四个动作写成指令程序——循环卡就是你的共振链。',
    lesson: 'insertion-sort',
    slots: 6,
    cards: ['pick', 'compare', 'shift', 'drop', 'loop'],
    par: { cards: 5 },
    variants: [
      { id: 'insertion-cmd-01-base', label: '4 张牌', detail: '训练营', cells: [3, 1, 2, 4], prediction: { prompt: '用 5 张卡为什么就能排好任意 4 张牌？', options: ['循环卡让 4 个动作自动重复，直到全部有序', '因为 4 张牌只需要 4 张卡', '小精灵自己会排序'], answer: 0, explanation: '循环 = while 全表有序之前反复执行：拿起/比较/右移/放下每个动作都可能发生多次——5 张卡 = 4 个动作 + 1 个循环，这就是"用循环消除重复"。' } },
    ],
  },
]

const probeLevels: readonly ProbeLevel[] = [
  {
    kind: 'probe',
    id: 'barnard-probe-01',
    destination: '巴纳德星（红矮星，5.96 光年）',
    ly: 5.96,
    title: '巴纳德 · 光谱探测',
    brief: '巴纳德星是第二近的恒星系统。16 颗候选恒星的光谱已按编号排好——目标光谱 233 藏在其中。每次探测排除一半，4 次内锁定它。',
    lesson: 'binary-search',
    variants: [
      { id: 'barnard-probe-01-base', label: '16 颗恒星', detail: '⌈log₂16⌉ = 4', cells: [2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 2584], target: 233 },
    ],
    par: { probes: 4 },
  },
]

const mergeLevels: readonly MergeLevel[] = [
  {
    kind: 'merge',
    id: 'pleiades-merge-01',
    destination: '昴星团（444 光年 · 七姊妹疏散星团）',
    ly: 444,
    title: '昴星团 · 合并队列',
    brief: '本星际泡的边界在昴星团。两列已排好的恒星流要合并成一列——每次只能取两列的队首，谁小谁先走。取错会被直接拒绝。',
    lesson: 'merge-sort',
    variants: [
      { id: 'pleiades-merge-01-base', label: '8 颗恒星', detail: '零失误', cells: [21, 3, 44, 7, 15, 2, 38, 11] },
    ],
    par: { attempts: 8 },
  },
]

export const gameLevels: readonly GameLevel[] = [executeLevels[0], ...probeLevels, executeLevels[1], executeLevels[2], ...commandLevels, ...mergeLevels]
