export const siteIntro = {
  eyebrow: 'ALGORITHMIA · SANDBOX ROADMAP',
  title: '把算法的“为什么”打穿',
  description: '在算法王国里先玩关卡、再进沙盘推演：每个概念都可以亲手操作，也可以逐拍观看它的设计与代价。',
}

export type LessonStatus = 'ready' | 'dev'
export type LessonColor = 'slate' | 'yellow' | 'blue' | 'purple' | 'green' | 'orange'

export type AlgorithmLesson = {
  id: string
  label: string
  detail: string
  color: LessonColor
  status: LessonStatus
}

export type AlgorithmChapter = {
  id: string
  label: string
  title: string
  detail: string
  lessons: readonly AlgorithmLesson[]
}

export type AlgorithmPart = {
  id: string
  label: string
  chapters: readonly AlgorithmChapter[]
}

export const algorithmParts: readonly AlgorithmPart[] = [
  {
    id: 'foundations',
    label: 'I · 基础',
    chapters: [
      {
        id: 'chapter-1',
        label: '第 1 章',
        title: '算法与计算',
        detail: '问题、算法与正确性',
        lessons: [
          { id: 'algorithm-role', label: '算法的角色', detail: '问题、输入、输出与正确性', color: 'slate', status: 'dev' },
        ],
      },
      {
        id: 'chapter-2',
        label: '第 2 章',
        title: '起步',
        detail: '从数组操作进入算法',
        lessons: [
          { id: 'insertion-sort', label: '插入排序', detail: '循环不变量与逐个插入', color: 'slate', status: 'ready' },
          { id: 'merge-sort', label: '归并排序', detail: '2.3 · 拆分、合并与递归树', color: 'yellow', status: 'ready' },
          { id: 'binary-search', label: '二分查找', detail: '区间缩小与对数复杂度', color: 'slate', status: 'dev' },
        ],
      },
      {
        id: 'chapter-3',
        label: '第 3 章',
        title: '刻画运行时间',
        detail: '增长率、渐近记号与递归式',
        lessons: [
          { id: 'asymptotic-notation', label: '渐近记号', detail: 'O、Ω、Θ 的图形比较', color: 'slate', status: 'dev' },
          { id: 'recurrence-equations', label: '递归式', detail: '从递归树读出运行时间', color: 'slate', status: 'dev' },
        ],
      },
      {
        id: 'chapter-4',
        label: '第 4 章',
        title: '分治法',
        detail: '把大问题拆成可合并的小问题',
        lessons: [
          { id: 'maximum-subarray', label: '最大子数组', detail: '跨中点候选与线性合并', color: 'slate', status: 'dev' },
          { id: 'divide-conquer', label: '最近点对', detail: '跨界候选与线性合并', color: 'blue', status: 'ready' },
          { id: 'master-method', label: '主方法', detail: '递归树中谁在主导', color: 'purple', status: 'ready' },
          { id: 'strassen', label: 'Strassen 矩阵乘法', detail: '减少递归子问题数量', color: 'slate', status: 'dev' },
        ],
      },
      {
        id: 'chapter-5',
        label: '第 5 章',
        title: '概率分析与随机算法',
        detail: '随机性如何改变平均行为',
        lessons: [
          { id: 'randomized-algorithms', label: '随机化算法', detail: '随机选择与期望运行时间', color: 'slate', status: 'dev' },
          { id: 'hiring-problem', label: '招聘问题', detail: '指示器随机变量与期望', color: 'slate', status: 'dev' },
        ],
      },
    ],
  },
  {
    id: 'sorting-order-statistics',
    label: 'II · 排序与顺序统计',
    chapters: [
      {
        id: 'chapter-6',
        label: '第 6 章',
        title: '堆排序',
        detail: '堆、堆化与优先队列',
        lessons: [
          { id: 'heap-sort', label: '堆排序', detail: '大根堆、取最大值与原地排序', color: 'green', status: 'ready' },
          { id: 'priority-queue', label: '优先队列', detail: '插入、取最大值与堆的接口', color: 'slate', status: 'dev' },
        ],
      },
      {
        id: 'chapter-7',
        label: '第 7 章',
        title: '快速排序',
        detail: '主元、分区与递归树形状',
        lessons: [
          { id: 'quick-sort', label: '快速排序', detail: '均衡分区与最坏情况', color: 'orange', status: 'ready' },
          { id: 'randomized-quicksort', label: '随机化快速排序', detail: '随机主元与期望复杂度', color: 'slate', status: 'dev' },
        ],
      },
      {
        id: 'chapter-8',
        label: '第 8 章',
        title: '线性时间排序',
        detail: '利用输入结构突破比较排序下界',
        lessons: [
          { id: 'counting-sort', label: '计数排序', detail: '频次数组与稳定输出', color: 'slate', status: 'dev' },
          { id: 'radix-sort', label: '基数排序', detail: '从低位到高位的稳定排序', color: 'slate', status: 'dev' },
          { id: 'bucket-sort', label: '桶排序', detail: '按分布把元素放入桶中', color: 'slate', status: 'dev' },
        ],
      },
      {
        id: 'chapter-9',
        label: '第 9 章',
        title: '中位数与顺序统计量',
        detail: '不完全排序也能找第 k 小',
        lessons: [
          { id: 'order-statistics', label: '顺序统计量', detail: '选择第 k 小元素', color: 'slate', status: 'dev' },
          { id: 'median-of-medians', label: '中位数的中位数', detail: '最坏情况线性时间选择', color: 'slate', status: 'dev' },
        ],
      },
    ],
  },
]

export const chapterCatalog = algorithmParts.flatMap(part => part.chapters)
export const algorithmCatalog = chapterCatalog.flatMap(chapter => chapter.lessons)
