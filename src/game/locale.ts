/**
 * 站点词表（国际化基础）：所有面向用户的中文集中于此。
 * 数据层与场景层只持有键（R01 / E01 / ui.pick / level['insertion-01'] 等），
 * 显示时经 t() 取词；新增语言 = 新增一份同构词表。
 * 动态数字与对象名词用 {n} 插值；`unit` 为「量词+名词」整体（如「根燃料棒」）。
 */

import type { MissionCopy } from './types'

export const zh = {
  course: {
    title: '课程航线', subtitle: '从数据的组织方式，到解决问题的思想。',
    universe: '算法星域', universeEn: 'ALGORITHM / STAR SECTOR',
    sectorLabel: '知识星域', missionLabel: '交互任务', sourceLabel: '官方大纲',
    overview: '星域总览', legacy: '首航实战', explore: '探索课程航线',
    welcome: '每一种算法，都是一条\n通向未知的航线。',
    welcomeNote: '观察结构，亲手推演，在每一次选择中理解算法。',
    archive: 'UCAS · 数据结构与算法', coordinates: 'SOLAR FRONTIER / 001',
    ready: '航行系统就绪', localSave: '进度保存在此浏览器',
    core: '基础航线', advanced: '远征航线',
    missionCount: '{n} 项任务', completed: '已完成 {n} / {total}',
    nextMission: '继续探索', startMission: '进入任务', allChapters: '全部星域',
    previousPage: '上一组', nextPage: '下一组', page: '{n} / {total}',
    previous: '上一步 [←]', next: '下一步 [→]', restart: '重新推演 [R]',
    alternate: '更换输入', back: '返回课程航线',
    step: '步骤 {n} / {total}', sample: '输入方案 {n}',
    invariant: '始终成立', goal: '任务目标', complexity: '代价与条件',
    evidence: '当前证据', transfer: '带走这个问题',
    theory: '原理与论证', conditions: '适用条件', claim: '要证明的结论', argument: '论证步骤', boundary: '边界与反例', closeTheory: '返回操演', transferCheckpoint: '换一个情境 · 迁移校验',
    dataView: '数据', groupView: '分组', resultView: '结果', matrixView: '计算表', graphView: '结构与关系',
    mathReference: '数学关系', mathState: '当前状态读数',
    checkpoint: '航行校验 · 先作出判断', checkpointHint: '根据图上的证据选择，再继续推演。',
    correct: '判断正确', retry: '再看一眼不变量与图上的证据。', reveal: '理解并继续',
    complete: '任务已归档', completeNote: '你已走完当前输入的推演，并完成知识校验。',
    replay: '再次推演', continue: '下一个任务',
    loading: '正在校准航行系统…', loadError: '航行系统启动失败，请重试。', retryLoad: '重新连接',
    keyboard: '方向键逐步推演 · R 重开 · Esc 返回',
    narrowHint: '首航实战采用横向操作台，可左右滑动查看。',
    skip: '跳至主内容', openMap: '打开星图导航', closeMap: '关闭星图导航',
    sourceNote: '课程范围依据 5 份国科大官方大纲整理；本站为独立学习项目。',
    lightYear: '{n} 光年', logProgress: '课程探索记录', logEmpty: '选择一条课程航线，开始第一次推演。',
    operations: { start: '任务初始化', compare: '比较候选', swap: '交换位置', visit: '访问结点', insert: '插入元素', remove: '移除元素', select: '确定选择', split: '分解问题', merge: '合并结果', relax: '松弛路径', update: '更新状态', reject: '排除候选', done: '验证结果' },
    chapters: {
      foundations: { title: '启航 · 算法基础', en: 'FOUNDATIONS', note: '抽象、建模与代价分析' },
      linear: { title: '序列 · 线性结构', en: 'LINEAR STRUCTURES', note: '线性表、栈与队列' },
      strings: { title: '信号 · 串与数组', en: 'SIGNALS & ARRAYS', note: '匹配、矩阵与压缩存储' },
      search: { title: '定位 · 查找与散列', en: 'SEARCH & HASH', note: '查找策略与冲突处理' },
      trees: { title: '分形 · 树与索引', en: 'TREES & INDEXES', note: '层次结构与平衡维护' },
      graphs: { title: '星网 · 图与路径', en: 'GRAPHS & NETWORKS', note: '遍历、连通、路径与流' },
      memory: { title: '舱段 · 存储管理', en: 'MEMORY SYSTEMS', note: '分配、回收与内存安全' },
      sorting: { title: '秩序 · 内部排序', en: 'INTERNAL SORTING', note: '比较、分区与稳定性' },
      external: { title: '远存 · 外部排序', en: 'EXTERNAL SORTING', note: '有序段生成与多路归并' },
      divide: { title: '裂变 · 递归与分治', en: 'DIVIDE & CONQUER', note: '从子问题构造整体答案' },
      greedy: { title: '抉择 · 贪心策略', en: 'GREEDY STRATEGIES', note: '选择规则与交换论证' },
      dynamic: { title: '记忆 · 动态规划', en: 'DYNAMIC PROGRAMMING', note: '状态、递推与最优子结构' },
      'search-space': { title: '探索 · 搜索空间', en: 'STATE SPACE SEARCH', note: '回溯、剪枝与分支限界' },
      complexity: { title: '边界 · 计算复杂性', en: 'COMPLEXITY & RANDOMNESS', note: '可验证性、归约与概率方法' },
      optimization: { title: '远征 · 优化方法', en: 'OPTIMIZATION', note: '近似保证与启发式探索' },
    },
    missions: {
  "structure-sequence": {
    "title": "顺序表插入与删除",
    "objective": "观察数组元素如何为插入腾位，以及删除后如何回填。",
    "invariant": "逻辑顺序由连续下标保持；插入点之后的元素都要移动。",
    "complexity": "插入和删除最坏需要 O(n) 次移动；按下标访问为 O(1)。",
    "explanation": "数组在连续内存中存放，插入位置决定需要移动的后缀长度。",
    "transfer": "容量固定时插入还要先检查是否有空位；动态数组可能触发扩容复制。",
    "prediction": {
      "prompt": "在下标 p 插入一个元素，通常要移动多少个元素？",
      "options": [
        "p 个",
        "n - p 个",
        "始终 1 个"
      ],
      "answer": 1,
      "explanation": "从尾部向后移动，直到原来的第 p 个元素，移动数为 n - p。"
    }
  },
  "structure-lists": {
    "title": "单链、双链与循环链表",
    "objective": "沿链接访问节点，并在已知位置插入新节点。",
    "invariant": "每条链接只指向真实节点；循环链表的尾节点最终回到头节点。",
    "complexity": "定位为 O(n)；已知节点位置的链接修改为 O(1)。",
    "explanation": "双链表还要维护前驱链接；环形结构遍历应以回到起点作为停止条件。",
    "transfer": "删除节点时同步修复前驱和后继，避免悬空链接。",
    "prediction": {
      "prompt": "已知待插入位置的前驱节点，单链表插入需要遍历吗？",
      "options": [
        "需要遍历全表",
        "不需要，只改链接",
        "需要移动所有节点"
      ],
      "answer": 1,
      "explanation": "节点已定位，插入只需将新节点接到前驱和原后继之间。"
    }
  },
  "structure-stack-recursion": {
    "title": "栈与递归调用",
    "objective": "用后进先出顺序检查括号，并观察递归调用栈的深度。",
    "invariant": "每个右括号必须匹配栈顶；处理完成后栈必须为空。",
    "complexity": "n 个符号检查为 O(n) 时间，最深嵌套占用 O(n) 空间。",
    "explanation": "递归每深入一层就保存一个尚未返回的调用，行为等同于压栈。",
    "transfer": "深递归可能耗尽调用栈；可用显式栈改写迭代遍历。",
    "prediction": {
      "prompt": "遇到右括号时，应与哪一个左括号比较？",
      "options": [
        "最近压入的左括号",
        "最早出现的左括号",
        "任意左括号"
      ],
      "answer": 0,
      "explanation": "嵌套结构遵守后进先出，最近尚未匹配的左括号位于栈顶。"
    }
  },
  "structure-queues": {
    "title": "队列与循环队列",
    "objective": "按先进先出顺序入队、出队，并让队首索引环绕容量边界。",
    "invariant": "队列元素保持到达顺序；循环索引始终对容量取模。",
    "complexity": "循环队列入队和出队均为 O(1)，额外空间为 O(capacity)。",
    "explanation": "移动 front 和 rear 索引即可复用数组槽位，无需整体搬移元素。",
    "transfer": "用计数器或预留空槽区分队满与队空。",
    "prediction": {
      "prompt": "数组队列的 front 到达末尾后，下一格在哪里？",
      "options": [
        "索引 0",
        "继续越界",
        "索引 -1"
      ],
      "answer": 0,
      "explanation": "循环队列使用模容量运算，将索引绕回数组开头。"
    }
  },
  "structure-strings-kmp": {
    "title": "字符串朴素匹配与 KMP",
    "objective": "构造最长相等前后缀表，并在失配时复用已知前缀。",
    "invariant": "已匹配的模式前缀信息由 LPS 表精确保留。",
    "complexity": "朴素匹配最坏 O(nm)；KMP 构表和搜索合计 O(n+m)。",
    "explanation": "失配时文本指针不回退，模式指针跳到仍可能匹配的最长前后缀。",
    "transfer": "LPS 表也可用于周期判断和重复结构分析。",
    "prediction": {
      "prompt": "KMP 发生失配时，文本指针会怎样？",
      "options": [
        "回到文本起点",
        "保持前进，只回退模式指针",
        "两者都回退一位"
      ],
      "answer": 1,
      "explanation": "LPS 记录可复用的匹配前缀，因此文本指针无需倒退。"
    }
  },
  "structure-arrays-matrices": {
    "title": "多维数组与矩阵压缩",
    "objective": "计算二维数组偏移，并比较稠密、对称和稀疏表示的存储量。",
    "invariant": "行优先偏移等于 i×列数+j；压缩表示必须能还原原元素位置。",
    "complexity": "二维寻址 O(1)；对称矩阵存储 n(n+1)/2 项，稀疏三元组存储 O(k)。",
    "explanation": "按行优先布局时，每行占 columns 个元素；对称矩阵只存上三角，稀疏矩阵只存非零项。",
    "transfer": "当非零项 k 接近 n² 时，三元组压缩可能不再节省空间。",
    "prediction": {
      "prompt": "3 行 4 列的行优先数组，元素 A[2][3] 的元素偏移是多少？",
      "options": [
        "9",
        "11",
        "12"
      ],
      "answer": 1,
      "explanation": "偏移为 2×4+3=11，索引从 0 开始。"
    }
  },
  "structure-generalized-list": {
    "title": "广义表递归遍历",
    "objective": "沿原子与嵌套子表的结构递归进入和返回。",
    "invariant": "每个原子和括号结构恰好访问一次，递归返回后恢复父层。",
    "complexity": "无共享结构时遍历 O(n)，递归栈空间取决于最大嵌套深度。",
    "explanation": "广义表的元素可以是原子，也可以是另一张表，因此自然采用递归定义。",
    "transfer": "若结构允许共享子表或环，应使用访问标记避免重复或无限遍历。",
    "prediction": {
      "prompt": "嵌套深度增加一层，递归遍历需要新增什么？",
      "options": [
        "一层调用栈空间",
        "一份完整数组副本",
        "不需要任何状态"
      ],
      "answer": 0,
      "explanation": "每层尚未完成的遍历都需要保存在调用栈中。"
    }
  },
  "structure-hashing-search": {
    "title": "散列冲突与查找策略",
    "objective": "通过线性探测插入键，并比较顺序、分块、二分和斐波那契查找。",
    "invariant": "开放定址探测链中不能跳过前方的占用槽；有序查找依赖数据有序。",
    "complexity": "散列平均 O(1)、最坏 O(n)；顺序 O(n)，分块 O(√n)，二分与斐波那契 O(log n)。",
    "explanation": "链地址法在桶内维护链表；线性探测沿表格顺序寻找空位。",
    "transfer": "负载因子过高会增加探测长度，扩表并重新散列可缓解聚集。",
    "prediction": {
      "prompt": "键 k 的散列位置已占用，线性探测下一步检查哪里？",
      "options": [
        "下一个槽位并循环",
        "随机槽位",
        "回到表头固定位置"
      ],
      "answer": 0,
      "explanation": "线性探测依次检查 (h(k)+i) mod m。"
    }
  },
  "structure-memory-allocation": {
    "title": "首次适应与最佳适应分配",
    "objective": "比较首次适应和最佳适应如何从空闲块中分配请求，并观察分配后的剩余碎片。",
    "invariant": "每次分配从一个足够大的空闲区间取得请求大小；剩余区间仍为空闲且地址连续。",
    "complexity": "线性扫描分配器最坏 O(f)；边界标记可在常数时间定位物理相邻块。",
    "explanation": "首次适应取列表中第一个足够大的块，最佳适应取最小的足够大块。本关只执行分配并显示剩余区间。",
    "transfer": "后续释放与合并需要单独执行；本次空闲区间展示可用于观察外部碎片。",
    "prediction": {
      "prompt": "请求 10 单位，空闲块为 12、20、8，首次适应会选择哪块？",
      "options": [
        "12",
        "20",
        "8"
      ],
      "answer": 0,
      "explanation": "从空闲块列表开头扫描，第一个足够大的块是 12。"
    }
  },
  "structure-memory-safety": {
    "title": "内存安全检查点",
    "objective": "识别越界访问、释放后使用和重复释放，并在访问前检查范围与生命周期。",
    "invariant": "只有仍存活的分配可访问或释放；合法下标满足 0≤i<length。",
    "complexity": "边界与生命周期检查通常为 O(1)，但需要维护有效性状态。",
    "explanation": "越界会访问对象范围之外的内存；释放后使用和重复释放会破坏内存管理状态。",
    "transfer": "在资源所有权清晰的设计中，让每个分配恰好由一个责任方释放。",
    "prediction": {
      "prompt": "长度为 5 的数组，索引 5 是否有效？",
      "options": [
        "有效",
        "无效，合法范围是 0 到 4",
        "只有释放后有效"
      ],
      "answer": 1,
      "explanation": "上界不包含在内，索引必须小于 length。"
    }
  },
  "structure-stack-queue-variants": {
    "title": "栈与队列的两种实现",
    "objective": "并列观察数组栈、链栈、线性队列和循环队列如何执行相同抽象操作。",
    "invariant": "栈遵守后进先出，队列遵守先进先出。",
    "complexity": "数组栈和链栈的端点操作为 O(1)；线性队列若搬移元素则出队为 O(n)，循环队列为 O(1)。",
    "explanation": "数组栈操作栈顶；链栈压入或弹出头节点。数组队列出队搬移后缀，链队列出队推进头并从尾节点连接入队。",
    "transfer": "实现选择取决于容量是否固定、是否需要随机访问及空间利用率。",
    "prediction": {
      "prompt": "队列出队后，为了不搬移元素，哪个实现更合适？",
      "options": [
        "循环队列",
        "顺序扫描",
        "递归栈"
      ],
      "answer": 0,
      "explanation": "循环队列只推进 front 索引并循环复用空槽。"
    }
  },
  "structure-searches": {
    "title": "四种有序与无序查找",
    "objective": "依次运行顺序查找、分块查找、二分查找和斐波那契查找。",
    "invariant": "顺序查找不要求有序；其余有序区间查找都依赖键值单调排列。",
    "complexity": "顺序 O(n)，分块约 O(√n)，二分与斐波那契 O(log n)。",
    "explanation": "分块先比较块边界再扫描块内；二分按中点折半；斐波那契使用斐波那契偏移划分候选区间。",
    "transfer": "根据数据是否有序、是否随机访问和比较成本选择查找策略。",
    "prediction": {
      "prompt": "分块查找的典型步骤是什么？",
      "options": [
        "先定位候选块，再在块内顺序查找",
        "每次删去一半区间",
        "从头扫描到末尾"
      ],
      "answer": 0,
      "explanation": "分块查找把块间定位和块内扫描组合起来。"
    }
  },
  "structure-memory-strategies": {
    "title": "边界标记与伙伴系统",
    "objective": "观察伙伴系统反复拆分申请块，并在释放后按伙伴关系逐级合并。",
    "invariant": "伙伴块大小相等、相邻且满足对齐关系时才能合并。",
    "complexity": "伙伴拆分或合并经过 O(log U) 个级别；边界标记可帮助定位相邻物理块。",
    "explanation": "边界标记释放时检查左右物理相邻空闲块并反复合并；伙伴系统通过地址异或定位同阶伙伴，只有伙伴也空闲才合并。",
    "transfer": "伙伴系统便于快速合并，但请求大小会向上取整到可用级别，产生内部碎片。",
    "prediction": {
      "prompt": "释放一个 8 单位块时，何时可与伙伴合并？",
      "options": [
        "伙伴也空闲且大小相同",
        "任意相邻块都可以",
        "只要总空闲量大于 8"
      ],
      "answer": 0,
      "explanation": "伙伴合并要求匹配的大小和伙伴位置关系。"
    }
  },
  "structure-complexity-counting": {
    "title": "抽象数据类型与复杂度计数",
    "objective": "把操作次数和辅助存储量对应到具体数据结构行为。",
    "invariant": "抽象数据类型由可观察操作定义；不同实现可提供相同逻辑行为但成本不同。",
    "complexity": "时间统计基本操作执行次数；空间统计输入以外的额外存储。",
    "explanation": "数组和链表可实现线性表，但随机访问、插入移动与指针存储的成本不同。",
    "transfer": "先定义操作语义，再选择满足访问模式和资源限制的实现。",
    "prediction": {
      "prompt": "算法额外创建 n 个辅助元素时，额外空间通常记作什么？",
      "options": [
        "O(1)",
        "O(n)",
        "O(log n)"
      ],
      "answer": 1,
      "explanation": "辅助元素数量随输入规模线性增长。"
    },
    "theory": {
      "conditions": "先声明基本操作与输入长度。数组长度 n、容量数值 W 和 W 的二进制位数是不同的量；轨迹快照内存与算法工作空间分开计。",
      "claim": "复杂度统计执行工作和存储量，不能把结果数值大小当操作次数，也不能混淆最坏、平均与随机期望。",
      "steps": [
        "逐项相加 n 个数需要 Θ(n) 次操作；1+…+n 的和值为 Θ(n²)，这不是 Θ(n²) 次加法。",
        "双层循环的工作量由实际次数求和，例如 (n−1)+…+1=n(n−1)/2。",
        "额外空间按同时存活的辅助状态计数；递归需计最大栈深度，记录所有动画帧属于展示成本。",
        "最坏界对同长度所有输入取最大；平均界需要输入分布；随机期望固定输入后对算法的随机选择取期望。",
        "O(nW) 背包表对数值 W 是多项式，但当 W 用二进制输入时，相对 log W 的位长只是伪多项式。"
      ],
      "boundary": "一次计时或一次运行的比较次数不能证明一般复杂度；随机算法期望快也可能有慢的随机路径。",
      "transfer": {
        "prompt": "容量 W=2^b 用 b+1 位表示，O(nW) 的容量 DP 是否一定对输入位长是多项式？",
        "options": [
          "不是，W 可能随位长指数增长",
          "是，因为表达式里只有乘法",
          "只有 W 为偶数时是"
        ],
        "answer": 0,
        "explanation": "O(nW)=O(n2^b)，数值容量与表示它所需位数不能混同。"
      }
    }
  },
  "structure-string-operations": {
    "title": "串的存储与基本操作",
    "objective": "比较顺序存储和链式存储，并实际执行连接、截取、插入与删除。",
    "invariant": "操作结果保留源字符顺序；链式操作只改变真实相邻节点的链接。",
    "complexity": "顺序串连接需复制字符；中间插入和删除需移动后缀。链串连接可改尾链接，定位下标仍需遍历。",
    "explanation": "串是字符序列。连续数组支持快速下标访问，链式存储避免整体搬移但要逐节点定位。",
    "transfer": "若频繁按位置访问，顺序存储通常更合适；若编辑点已定位，链式改链可能减少移动。",
    "prediction": {
      "prompt": "已知链串中待插入节点的前驱，插入字符的主要工作是什么？",
      "options": [
        "改动相邻链接",
        "复制整个串",
        "重排所有字符"
      ],
      "answer": 0,
      "explanation": "前驱已定位，只需将新节点接入原来的链接位置。"
    }
  },
  "foundation-modeling": {
    "title": "问题建模与抽象数据类型",
    "objective": "明确排序任务的输入、输出、ADT 操作、算法及前置和后置条件。",
    "invariant": "前缀算法每步保留已读键的多重集合，并保持前缀有序。",
    "complexity": "本例使用插入式排序；数组索引读取 O(1)，链表定位按序遍历为 O(n)。",
    "explanation": "先定义任务的输入和期望输出，再选择表示与操作接口，最后给算法及正确性条件。",
    "transfer": "同一 ADT 可有多种表示；应按访问和修改模式比较操作成本。",
    "prediction": {
      "prompt": "排序后置条件除了要求有序，还应检查什么？",
      "options": [
        "输出保留输入的全部键",
        "输出长度必须为零",
        "输入必须逆序"
      ],
      "answer": 0,
      "explanation": "有序但丢失或凭空增加元素的结果仍不正确。"
    },
    "theory": {
      "conditions": "先固定输入域、允许操作、输出与约束；本例是有限关键字序列，比较与复制按选定计算模型计费。",
      "claim": "模型规定什么是正确答案；ADT 规定可观察操作；算法给出有限可执行步骤；程序是算法在语言中的实现。",
      "steps": [
        "将“排好货物”写成两个后置条件：键非降序，且输出与输入的多重集合相同。只满足一个条件不够。",
        "先声明读、插入、删除等 ADT 操作，再选择数组或链式表示；同一接口可以有不同时间和空间成本。",
        "为算法写前置条件、每步保持的关系和进展量。证明保持正确状态，并证明进展量最终到达终止条件。",
        "编程实现必须兑现该模型；正确输出某个样本不等于所有合法输入都正确。"
      ],
      "boundary": "数组插入的移动成本不能被一句“插入操作”隐藏；若给输入去重，已改变保留多重集合的原任务。",
      "transfer": {
        "prompt": "输入 [2,2,1]，输出 [1,2] 已有序，能否满足这里的排序任务？",
        "options": [
          "不能，少了一个 2",
          "能，有序就足够",
          "只要运行快就能"
        ],
        "answer": 0,
        "explanation": "排序须保持每个值的出现次数；有序性不能弥补数据丢失。"
      }
    }
  },
  "foundation-mathematics": {
    "title": "算法所需的求和、对数与递推",
    "objective": "计算等差求和、重复折半次数和递推式的具体数值。",
    "invariant": "每个数值由定义逐步计算；折半次数只对本例的 2 的幂规模等于 log₂n。",
    "complexity": "逐项计算 1 到 n 的和值需 n−1 次加法，即 Θ(n) 次操作；和值大小为 Θ(n²)。重复折半需 Θ(log n) 次。",
    "explanation": "把常见数学表达转成数值，帮助估算循环、递归层数和总工作量。",
    "transfer": "遇到递推式时先展开小规模值，再识别每层工作和层数关系。",
    "prediction": {
      "prompt": "n=8 时，反复除以 2 到 1 需要几次？",
      "options": [
        "3",
        "4",
        "8"
      ],
      "answer": 0,
      "explanation": "8→4→2→1，共 3 次。"
    }
  },
  "foundation-asymptotics": {
    "title": "O、Ω 与 Θ 的见证",
    "objective": "用常数 c 和门槛 n₀ 检查函数与 n² 的渐进上下界。",
    "invariant": "O 需要最终上界见证，Ω 需要最终下界见证，Θ 同时需要两者。",
    "complexity": "示例 f(n)=a n²+b n+d 与 g(n)=n² 在 n≥1 时为 Θ(n²)。",
    "explanation": "样本点只帮助观察；渐进结论需为所有 n≥n₀ 给出常数见证并说明不等式。",
    "transfer": "将低阶项用主导项上界控制，再给出适用的 n₀。",
    "prediction": {
      "prompt": "要证明 f(n)=Θ(n²)，需要哪些条件？",
      "options": [
        "最终同时有常数倍上界和下界",
        "只检查 n=1",
        "只证明上界"
      ],
      "answer": 0,
      "explanation": "Θ 由 O 上界和 Ω 下界共同定义。"
    },
    "theory": {
      "conditions": "函数在足够大的整数 n 上非负；常数必须独立于 n。下面以 a>0、b,d≥0 的 f(n)=an²+bn+d 为例。",
      "claim": "O 给最终常数倍上界，Ω 给最终常数倍下界，Θ 要同时有两者；有限样本检查不是定义。",
      "steps": [
        "O(g)：存在 c>0、n₀，使所有 n≥n₀ 都有 f(n)≤cg(n)；Ω 反向，Θ 同时成立。",
        "n≥1 时 n≤n² 且 1≤n²，故 an²≤f(n)≤(a+b+d)n²。",
        "取下界常数 a、上界常数 a+b+d、门槛 n₀=1，即证明 f(n)=Θ(n²)。",
        "这一步用代数覆盖所有 n≥1，样本柱状图只是帮助读出见证常数。"
      ],
      "boundary": "上界并不要求最紧：n 同时属于 O(n) 和 O(n²)；不能从 O(n²) 推出 Θ(n²)。",
      "transfer": {
        "prompt": "已证明 f(n)≤10n²，是否就证明了 f(n)=Θ(n²)？",
        "options": [
          "没有，还需要相应下界",
          "已经证明",
          "只需多测十个 n"
        ],
        "answer": 0,
        "explanation": "只有 O 上界；例如 f(n)=n 也满足该上界，却不是 Θ(n²)。"
      }
    }
  },
  "foundation-correctness": {
    "title": "循环不变式与正确性证明义务",
    "objective": "跟踪初始化、保持和终止三个步骤，检查累加循环的不变式。",
    "invariant": "进入迭代 i 前，sum 等于 A[0..i) 的和；终止时 i=n，因此 sum 为全数组之和。",
    "complexity": "本例执行 n 次迭代，时间 O(n)，额外空间 O(1)。",
    "explanation": "初始化建立不变式，维护说明每次迭代后仍成立，终止把不变式转成目标结论。有限运行展示过程，不能替代对任意输入的证明。",
    "transfer": "对循环或递归算法明确状态、边界、每步进展和终止条件。",
    "prediction": {
      "prompt": "循环终止时 i=n，不变式说明 sum 是 A[0..i) 的和，能推出什么？",
      "options": [
        "sum 是整个数组的和",
        "sum 一定为零",
        "数组已排序"
      ],
      "answer": 0,
      "explanation": "i=n 时前缀覆盖整个数组。"
    },
    "theory": {
      "conditions": "数组有限，累加采用不会溢出的精确算术；循环从 i=0、sum=0 开始，每轮加入 A[i] 后令 i 增加 1。",
      "claim": "初始化、保持、终止三步合起来，证明循环返回全数组之和。",
      "steps": [
        "不变式：进入第 i 轮前，sum=Σ(j=0..i−1)A[j]。i=0 时空和为 0，初始化成立。",
        "若进入一轮时成立，加入 A[i] 后得到前 i+1 项之和；i 增加 1，下一轮不变式仍成立。",
        "进展量 n−i 是非负整数，每轮严格减少 1，因此循环终止。",
        "终止时 i=n，将其代入不变式，sum 正是全部 n 项之和。"
      ],
      "boundary": "测试两个数组只能检查实例；不变式的保持论证必须不依赖具体元素值。固定宽度整数溢出会使上述精确算术前提失效。",
      "transfer": {
        "prompt": "若保持不变式，但循环永远不增加 i，是否已证明算法正确结束？",
        "options": [
          "没有，还缺终止证明",
          "已经证明，因为不变式没变",
          "只影响速度，不影响结束"
        ],
        "answer": 0,
        "explanation": "部分正确性不能保证终止；需要严格下降的有界进展量。"
      }
    }
  },
  "tree-properties": {
    "title": "树的形状与存储",
    "objective": "用节点数、叶子数和高度读出完全树容量，并比较数组下标与左右指针。",
    "invariant": "深度 h 的满二叉树节点数为 2^(h+1)-1；数组左、右孩子下标分别是 2i+1、2i+2。",
    "complexity": "按下标访问 O(1)；稀疏树用数组会浪费空槽，链式存储按实际节点占用 O(n)。",
    "explanation": "当前样例有 7 个节点、3 层，容量恰为 7。数组适合完全树，链式节点适合形状不规则的树。",
    "transfer": "判断堆适合数组、表达式树适合指针时，先看形状是否紧凑。",
    "prediction": {
      "prompt": "高度为 3（根深度为 0）的满二叉树最多有几个节点？",
      "options": [
        "7",
        "15",
        "8"
      ],
      "answer": 1,
      "explanation": "层数为 h+1=4，节点总数 2^4-1=15。"
    }
  },
  "tree-traversals": {
    "title": "二叉树遍历",
    "objective": "比较先序、中序、后序和层序访问同一棵树产生的次序。",
    "invariant": "深度优先遍历只改变根相对左右子树的位置；层序遍历使用先进先出队列。",
    "complexity": "四种遍历均访问 n 个节点，时间 O(n)；递归深度优先额外空间 O(h)，层序队列最坏 O(n)。",
    "explanation": "先序先处理根，中序在左右子树之间处理根，后序最后处理根；层序按深度逐层访问。",
    "transfer": "中序遍历二叉搜索树可得到有序序列；后序适合先释放子节点再释放父节点。",
    "prediction": {
      "prompt": "在二叉搜索树中，哪种遍历按非递减顺序输出键？",
      "options": [
        "先序",
        "中序",
        "层序"
      ],
      "answer": 1,
      "explanation": "中序按左、根、右访问，而搜索树满足左键≤根键≤右键。"
    }
  },
  "tree-threaded": {
    "title": "线索二叉树",
    "objective": "把空孩子链接改作中序后继线索，并沿线索完成遍历。",
    "invariant": "右线索只在右孩子标记为假的节点上指向其中序后继；有真实右孩子时先去右子树最左节点。",
    "complexity": "线索遍历 O(n)，无需递归栈；额外空间为线索标记与指针。",
    "explanation": "构造线索时保留真实孩子链接，并用标记区分线索，避免把普通孩子误当后继。",
    "transfer": "需要无栈遍历且结构静态时可考虑线索树；频繁修改时维护成本更高。",
    "prediction": {
      "prompt": "当前节点没有真实右孩子时，中序线索应指向哪里？",
      "options": [
        "父节点",
        "中序后继",
        "根节点"
      ],
      "answer": 1,
      "explanation": "线索用空右链接直接保存中序后继。"
    }
  },
  "tree-general-conversion": {
    "title": "森林与左孩子右兄弟表示",
    "objective": "把包含两个根的一般森林编码为左孩子右兄弟二叉链接、从链接解码，并演示森林先根与后根遍历。",
    "invariant": "左链接表示第一个孩子，右链接表示下一个兄弟；森林的多个根可连接到虚拟根。",
    "complexity": "编码和解码各 O(n)，每个节点至多保存两条链接。",
    "explanation": "左链接进入第一个孩子，孩子的右链接串起后续兄弟；虚拟根的左链接进入第一个森林根，再沿根的右兄弟线索访问其余根。先根遍历先访问节点，后根遍历在孩子之后访问节点。",
    "transfer": "这种表示让一般树复用二叉树遍历和存储接口。",
    "prediction": {
      "prompt": "左孩子右兄弟表示中，第二个孩子从哪里到达？",
      "options": [
        "父节点的左孩子，再沿该孩子的右兄弟链接",
        "父节点的右孩子",
        "虚拟根的左孩子"
      ],
      "answer": 0,
      "explanation": "父节点左链接指向第一个孩子，第二个孩子由第一个孩子的右兄弟链接到达。"
    }
  },
  "tree-huffman": {
    "title": "哈夫曼编码",
    "objective": "按两棵最轻子树反复合并，产生前缀码并计算加权路径长度。",
    "invariant": "每次合并当前最小的两个权重；叶子码字之间不存在前缀关系。",
    "complexity": "优先队列实现 O(n log n)；WPL = Σ频率×码长。",
    "explanation": "合并树根权重等于两子树权重之和，最终三次合并得到四个叶子的编码树。",
    "transfer": "用于无损压缩时，高频符号通常得到较短码字。",
    "prediction": {
      "prompt": "合并权重 1、2、4、8 时，第一次应合并哪两个？",
      "options": [
        "1 和 2",
        "2 和 4",
        "4 和 8"
      ],
      "answer": 0,
      "explanation": "每轮选当前最小的两个权重。"
    },
    "theory": {
      "conditions": "至少两个符号，权重非负，使用二叉前缀码；目标是最小化 Σ权重×码长。单符号码长采用单独约定。",
      "claim": "反复合并最小两权可以构造最小加权路径长度的前缀码树。",
      "steps": [
        "在一棵最优满二叉码树中，最深层存在一对兄弟叶。把最小两权交换到这两个位置不会增加成本：较小权重承担较大深度不会更差。",
        "因此存在一个最优解，使最小两权 a、b 是兄弟。将它们合并成权重 a+b 的伪符号。",
        "原树成本等于收缩后树成本加 a+b；若收缩树不最优，替换为更优收缩树就会改进原树，矛盾。",
        "对子问题归纳，最小两权合并后的最优解可以逐层展开为原问题的最优码树。"
      ],
      "boundary": "前缀码不能有一个码字是另一个的前缀；频率相同可产生不同最优码字，最优成本不必唯一。",
      "transfer": {
        "prompt": "两种合法合并顺序只在相同最小权重的并列选择上不同，能否都得到最优成本？",
        "options": [
          "能，最优码树可能不唯一",
          "不能，只能按字母顺序",
          "不能，必须选较长符号名"
        ],
        "answer": 0,
        "explanation": "交换证明只比较权重，相同权重的合法并列选择不改变最优性。"
      }
    }
  },
  "tree-bst": {
    "title": "二叉搜索树增删查",
    "objective": "执行键插入、沿比较路径查找，并删除有两个孩子的节点。",
    "invariant": "每个节点左子树键不大于节点键，右子树键不小于节点键；双孩子删除用中序后继替换。",
    "complexity": "操作 O(h)；随机形状期望 O(log n)，退化链最坏 O(n)。",
    "explanation": "删除双孩子节点时，取右子树最小键替换，再删除该后继所在节点，搜索树次序得以保持。",
    "transfer": "需要保证最坏查找时间时，应使用 AVL 或红黑树等平衡搜索树。",
    "prediction": {
      "prompt": "删除有两个孩子的键时，选择哪个键替换最直接？",
      "options": [
        "左子树最大键",
        "右子树最小键",
        "全树最大键"
      ],
      "answer": 1,
      "explanation": "右子树最小节点是中序后继，替换后左右次序仍成立。"
    }
  },
  "tree-avl": {
    "title": "AVL 插入与旋转",
    "objective": "插入键后更新高度，并用单旋或双旋修复失衡祖先。",
    "invariant": "平衡因子为左高减右高；每个节点的绝对值不超过 1。",
    "complexity": "查找、插入 O(log n)；修复用一次单旋或两次旋转。",
    "explanation": "LL 情况右旋；LR 情况先对左孩子左旋，再对失衡根右旋。",
    "transfer": "AVL 对查找频繁的场景很合适，因为高度严格受限。",
    "prediction": {
      "prompt": "LR 失衡需要怎样旋转？",
      "options": [
        "先右旋子节点，再左旋根",
        "先左旋子节点，再右旋根",
        "只对根左旋"
      ],
      "answer": 1,
      "explanation": "先把内侧弯折变成 LL，再对根右旋。"
    }
  },
  "tree-btree": {
    "title": "B 树分裂与查找",
    "objective": "按最小度数 t=2 分裂满节点，提升中间键，再按分隔键范围查找。",
    "invariant": "每个节点内键有序；非根节点通常有 t-1 至 2t-1 个键；所有叶子同深度。",
    "complexity": "节点扇出高，查找与插入为 O(log_t n) 次节点访问。",
    "explanation": "满节点 [a,b,c] 分裂时提升 b，左右节点分别保留 a 与 c；沿非满节点路径插入。",
    "transfer": "数据库和文件系统用 B 树减少外存页访问次数。",
    "prediction": {
      "prompt": "t=2 的满三键节点 [a,b,c] 分裂时提升哪一个键？",
      "options": [
        "a",
        "b",
        "c"
      ],
      "answer": 1,
      "explanation": "中间键 b 提升为父节点分隔键。"
    }
  },
  "tree-red-black": {
    "title": "红黑树插入修复",
    "objective": "插入红节点后，通过叔父颜色决定重着色或旋转。",
    "invariant": "根为黑；红节点不能有红孩子；每条到空叶路径具有相同黑高。",
    "complexity": "查找、插入 O(log n)；插入修复旋转次数为常数级。",
    "explanation": "红叔父时把父、叔染黑并把祖父染红；黑叔父时旋转并重着色，最后确保根为黑。",
    "transfer": "红黑树适合需要有序映射且希望插入删除开销稳定的容器。",
    "prediction": {
      "prompt": "插入后父和叔都是红色时，首先采用什么修复？",
      "options": [
        "重着色父、叔与祖父",
        "只左旋根",
        "删除新节点"
      ],
      "answer": 0,
      "explanation": "红叔父情形通过重着色把冲突向祖先传播。"
    }
  },
  "tree-heap": {
    "title": "堆优先队列",
    "objective": "对最小堆执行取顶、下滤和插入上滤，并观察父子数组位置。",
    "invariant": "每个父节点键不大于孩子；堆只保证局部父子次序，不保证全局排序。",
    "complexity": "查看最小值 O(1)，插入和取顶 O(log n)，建堆 O(n)。",
    "explanation": "取顶后把末尾元素移到根并下滤；插入把新键放末尾并上滤。",
    "transfer": "优先队列可调度事件、任务或图算法中的下一项。",
    "prediction": {
      "prompt": "堆数组下标 i 的左孩子下标是什么？",
      "options": [
        "2i",
        "2i+1",
        "2i+2"
      ],
      "answer": 1,
      "explanation": "零起始数组的左孩子为 2i+1，右孩子为 2i+2。"
    }
  },
  "tree-union-find": {
    "title": "并查集与路径压缩",
    "objective": "执行按秩合并，并把查找路径上的节点直接连到集合代表。",
    "invariant": "同一连通分量共享一个代表；合并只连接不同代表；压缩不改变集合成员。",
    "complexity": "按秩合并加路径压缩的摊还时间 O(α(n))。",
    "explanation": "路径压缩改变父指针以缩短后续查找路径；秩合并把较浅树挂到较深树下。",
    "transfer": "并查集适用于动态连通性、Kruskal 最小生成树和集合分组。",
    "prediction": {
      "prompt": "路径压缩改变了什么？",
      "options": [
        "集合成员",
        "节点到代表的父指针",
        "元素键值"
      ],
      "answer": 1,
      "explanation": "它只重接父指针，不改变等价类/集合划分。"
    }
  },
  "tree-trie": {
    "title": "字典树与数字查找树",
    "objective": "插入共享前缀的字符串，并沿字符边完成检索。",
    "invariant": "根到终止标记的路径拼接为键；共享前缀只存一次，终止标记区分完整键。",
    "complexity": "长度为 L 的键插入或查找 O(L)，空间与已存前缀数成正比。",
    "explanation": "字典树按字符分支；数字查找树可按键的连续位或数字位选择分支。",
    "transfer": "适合前缀补全、词典查找与按位索引。",
    "prediction": {
      "prompt": "插入两个共享前缀的词时，公共前缀节点应如何处理？",
      "options": [
        "为每个词复制一份",
        "共享已有节点",
        "删除公共前缀"
      ],
      "answer": 1,
      "explanation": "共享前缀节点可减少重复存储。"
    }
  },
  "tree-optimal-search": {
    "title": "加权搜索树启发式",
    "objective": "在有序键区间中选择左右访问频率总和差值最小的根，并计算加权查找成本。",
    "invariant": "成本按 Σ频率×(深度+1) 计算；该加权平衡构造是启发式，不保证全局最优。",
    "complexity": "排序 O(n log n)；示例成本对每个键求和 O(n)。",
    "explanation": "每个区间枚举候选根，选择使左、右区间频率总和差最小者，再递归构造子树。真正的最优二叉搜索树用动态规划求解。",
    "transfer": "需要快速构造较平衡的有序查找树可用此启发式；要求严格最优时使用 OBST 区间动态规划。",
    "prediction": {
      "prompt": "某候选根左侧频率总和为 5，右侧为 7；另一个候选根两侧分别为 2 和 11。加权平衡启发式选哪个？",
      "options": [
        "差值为 2 的候选根",
        "差值为 9 的候选根",
        "只看根自身频率"
      ],
      "answer": 0,
      "explanation": "加权平衡规则选择使左右区间总频率差最小的候选根。"
    }
  },
  "tree-23": {
    "title": "2–3 树分裂与查找",
    "objective": "插入键并在节点溢出时提升中间键，查找时在有序键间选择子树。",
    "invariant": "每个非根节点有 1 或 2 个有序键；内部节点有键数加一棵子树；所有叶子深度相同。",
    "complexity": "插入、查找为 O(log n) 次节点访问；节点最多容纳两个键。",
    "explanation": "三个键溢出时拆成左右各一个键的节点，并把中间键向父节点提升；若根溢出则创建新根。",
    "transfer": "2–3 树与允许三个键的 2–3–4 树容量不同；磁盘索引常用更高扇出的 B 树。",
    "prediction": {
      "prompt": "2–3 树节点 [a,b] 插入较大键 c 后溢出，应提升哪个键？",
      "options": [
        "a",
        "b",
        "c"
      ],
      "answer": 1,
      "explanation": "溢出后为 [a,b,c]，提升中间键 b，左右节点分别保留 a 与 c。"
    }
  },
  "g-representations": {
    "title": "邻接表与矩阵",
    "objective": "比较两种图表示的空间与查询代价。",
    "invariant": "无向图每条边在邻接表出现两次，度数和等于 2|E|。",
    "complexity": "邻接表 O(V+E) 空间；矩阵 O(V²) 空间，查边 O(1)。",
    "explanation": "邻接表适合稀疏图的遍历；矩阵适合频繁查边的稠密图。权重 0 需与无边标记区分。",
    "transfer": "选图结构时先比较边数与顶点数，再看主要操作是枚举邻居还是查指定边。",
    "prediction": {
      "prompt": "在稀疏图中枚举所有邻居，哪种表示通常占用更少空间？",
      "options": [
        "邻接表",
        "邻接矩阵"
      ],
      "answer": 0,
      "explanation": "邻接表只存已有边，空间随 V+E 增长。"
    }
  },
  "g-search": {
    "title": "深度优先与广度优先",
    "objective": "观察栈和队列如何产生不同的访问顺序。",
    "invariant": "每个顶点至多入队或入栈一次；遍历检查邻接边。",
    "complexity": "O(V+E) 时间，O(V) 辅助空间。",
    "explanation": "DFS 沿一条分支深入，BFS 按与起点的边数逐层扩展。无权图最短路用 BFS。",
    "transfer": "判断需要连通性、路径层数或回溯时，在 DFS 与 BFS 间选择。",
    "prediction": {
      "prompt": "无权图中，哪种搜索先找到边数最少的路径？",
      "options": [
        "DFS",
        "BFS"
      ],
      "answer": 1,
      "explanation": "BFS 按距离层次出队，因此首次到达就是最少边数。"
    }
  },
  "g-components-scc": {
    "title": "连通分量与强连通分量",
    "objective": "区分无向连通分量和有向图 SCC。",
    "invariant": "SCC 中任意两点互相可达；Kosaraju 第二遍使用反向边。",
    "complexity": "两遍 DFS 为 O(V+E)；Tarjan 也为 O(V+E)。",
    "explanation": "无向图一次 DFS 标记一个连通分量。有向图可用 Kosaraju 的完成次序加反图 DFS，或 Tarjan 的 low-link 栈算法。",
    "transfer": "社群/网络分组先辨别边是否有方向；有向可达关系需要 SCC。",
    "prediction": {
      "prompt": "有向图中仅从 A 可达 B，B 无法返回 A，两点属于同一 SCC 吗？",
      "options": [
        "是",
        "否"
      ],
      "answer": 1,
      "explanation": "同一强连通分量要求两点双向可达。"
    }
  },
  "g-topology": {
    "title": "拓扑排序与环检测",
    "objective": "用 Kahn 队列生成拓扑序，并识别残留环。",
    "invariant": "每次取出的顶点当前入度为 0；有向无环图中所有点最终会取出。",
    "complexity": "O(V+E) 时间与 O(V) 空间。",
    "explanation": "如果移除数少于 V，剩余顶点包含有向环；拓扑序只适用于 DAG。",
    "transfer": "依赖排程、课程先修与构建顺序都可建模为 DAG。",
    "prediction": {
      "prompt": "Kahn 结束时只移除了 V−1 个点，意味着什么？",
      "options": [
        "仍有有向环",
        "图一定连通"
      ],
      "answer": 0,
      "explanation": "未移除的顶点仍互相阻塞，存在有向环。"
    }
  },
  "g-shortest-path": {
    "title": "Dijkstra 与 Bellman–Ford",
    "objective": "根据权重条件选择单源最短路算法。",
    "invariant": "Dijkstra 仅在边权非负时成立；Bellman–Ford 可处理负边。",
    "complexity": "Dijkstra 二叉堆 O((V+E)logV)；Bellman–Ford O(VE)。",
    "explanation": "松弛 d[v] ← min(d[v], d[u]+w)。Bellman–Ford 再做一轮仍可改善时，源点可达区域存在负环。",
    "transfer": "建模前先检查是否有负权，再决定算法；无权图用 BFS。",
    "prediction": {
      "prompt": "存在负权边时，哪种算法仍可正确求解且检测可达负环？",
      "options": [
        "Dijkstra",
        "Bellman–Ford"
      ],
      "answer": 1,
      "explanation": "Bellman–Ford 重复松弛并用额外一轮检测负环。"
    },
    "theory": {
      "conditions": "Dijkstra 要求边权非负；Bellman–Ford 可含负边，但若源可达负环，则受其影响的点不存在有限最短距离。采用精确加法比较。",
      "claim": "Dijkstra 取出最小暂定距离时可定值；Bellman–Ford 的额外松弛轮可识别源可达负环。",
      "steps": [
        "暂定距离来自真实路径，所以是最短距离的上界；松弛边不会制造不存在的路径。",
        "Dijkstra 取出 u。若有更短路径，取其第一个未定值顶点 y，前驱已定值并已松弛 y；非负后续边使 d[y]不超过该路径到 u 的长度，与 u 是最小暂定距离矛盾。",
        "Bellman–Ford 完成 k 轮全边松弛后，至少已考虑所有不超过 k 条边的路径。无可达负环时可选简单最短路，最多 V−1 条边。",
        "V−1 轮后仍能严格改进，说明改进路径含可达负环；不能把不断下降的数值当有限最短路答案。"
      ],
      "boundary": "非负前提不是装饰。负边可让已定值顶点后来变短；发现目标入队也不足以提前结束 Dijkstra，应等它以最小距离出队。",
      "transfer": {
        "prompt": "非负权图中，目标已入队距离 9，队首另一点距离 4，能否仅因目标已发现就结束？",
        "options": [
          "不能，距离 4 的点可能改进目标",
          "能，第一次发现即最短",
          "只能在目标编号最小时结束"
        ],
        "answer": 0,
        "explanation": "正确终止依据是目标被最小距离取出，而不是首次发现。"
      }
    }
  },
  "g-floyd-warshall": {
    "title": "Floyd–Warshall 全点对最短路",
    "objective": "逐个允许中间顶点，观察距离矩阵真实更新。",
    "invariant": "第 k 轮后，最短路径的内部顶点只来自已处理集合。",
    "complexity": "O(V³) 时间、O(V²) 空间。",
    "explanation": "D[i,j] ← min(D[i,j], D[i,k]+D[k,j])。有负边可用；最终 D[i,i]<0 表示负环。",
    "transfer": "顶点规模小、需要所有点对距离时使用；规模大时考虑重复单源算法。",
    "prediction": {
      "prompt": "加入中间点 k 后，D[i,j] 应如何更新？",
      "options": [
        "min(D[i,j], D[i,k]+D[k,j])",
        "D[i,k]+D[j,k]"
      ],
      "answer": 0,
      "explanation": "比较原路径与经过 k 的两段路径。"
    },
    "theory": {
      "conditions": "有向带权图可含负边，但所讨论的有限最短路不受负环影响；初始化 D(i,i)=0、缺边为∞，k 为最外层循环。",
      "claim": "第 k 阶段结束后，D(i,j) 是内部顶点只允许来自前 k 个顶点集合的最短距离。",
      "steps": [
        "初始阶段不允许内部中转点，只有直接边和长度为 0 的自身路径。",
        "允许新中转点 k 后，一条最优路径或者不经过 k，继续用旧 D(i,j)；或者经过 k。",
        "无负环时可选不重复 k 的最优路径，经过 k 的情况分为 i→k 与 k→j 两段，内部顶点均来自较早集合。",
        "因此更新 D(i,j)=min(旧 D(i,j),旧 D(i,k)+旧 D(k,j))；按阶段归纳，全部 k 处理后得到全点对最短距离。"
      ],
      "boundary": "改成任意循环次序会破坏阶段不变式；D(k,k)<0 表示负环，受其影响的点对不能继续解释为有限最短距离。",
      "transfer": {
        "prompt": "为什么 k 必须作为该动态规划的阶段循环？",
        "options": [
          "左右子路径必须使用同一已允许中转集合",
          "因为顶点名字按字母排序",
          "为了保证所有边权为正"
        ],
        "answer": 0,
        "explanation": "递推的含义依赖上一阶段允许的中间顶点集合，而不只是机械地循环三次。"
      }
    }
  },
  "g-mst": {
    "title": "Prim 与 Kruskal 最小生成树",
    "objective": "比较扩展割边与全局排序并查集两种构造。",
    "invariant": "连通无向图的 MST 恰有 V−1 条边，且无环。",
    "complexity": "Prim 堆实现 O(ElogV)；Kruskal O(ElogE)。",
    "explanation": "Prim 每次选树与外部之间最轻边；Kruskal 按权重升序，仅接纳连接不同集合的边。",
    "transfer": "网络铺设等要求连通且总成本最低的问题可建模为 MST。",
    "prediction": {
      "prompt": "Kruskal 考察的边会让两端落在同一集合时应如何处理？",
      "options": [
        "拒绝，避免成环",
        "接受，缩短总权重"
      ],
      "answer": 0,
      "explanation": "同集合边会形成环，不能属于生成树。"
    },
    "theory": {
      "conditions": "有限连通无向带权图；权重可负、可相等。目标是连接全部顶点且无环的边权总和最小。",
      "claim": "与当前安全边相容的割上，最轻跨割边是安全选择；Prim 与 Kruskal 都应用这个交换性质。",
      "steps": [
        "取一个包含当前安全边的最小生成树 T。若所选跨割最轻边 e 已在 T 中，无需修改。",
        "否则把 e 加入 T 形成一个环；该环必有另一条跨同一割的边 f。由于 e 最轻，w(e)≤w(f)。",
        "删 f 留 e 后仍是生成树，成本不增，而且保留此前安全边，故存在包含新选择的最优树。",
        "Prim 使用当前树顶点集的割；Kruskal 使用当前连通分量的割，并用并查集拒绝成环边。"
      ],
      "boundary": "最短路径树最小化源到各点距离，不必最小化树的总边权；断开图只能得到最小生成森林。",
      "transfer": {
        "prompt": "有一条负权边，是否会像 Dijkstra 那样让 MST 贪心证明立即失效？",
        "options": [
          "不会，割交换只比较边权大小",
          "会，所有贪心都要求非负",
          "只要图有环就会"
        ],
        "answer": 0,
        "explanation": "割性质不依赖非负权，只依赖最轻边不比被替换边更重。"
      }
    }
  },
  "g-critical-path": {
    "title": "AOE 关键路径",
    "objective": "计算事件最早/最迟时刻与时差，找出项目关键路径。",
    "invariant": "事件时差 = 最迟时刻 − 最早时刻；零时差事件位于关键路径上。",
    "complexity": "DAG 上前向与反向各 O(V+E)。",
    "explanation": "最早时刻取前驱完成时间最大值，最迟时刻取后继最迟时刻减活动时长的最小值。项目工期由最长依赖链决定，不是最短路。",
    "transfer": "项目排期关注工期最长的依赖链与零时差活动。",
    "prediction": {
      "prompt": "AOE 项目工期由哪条路径决定？",
      "options": [
        "总时长最长的路径",
        "边数最少的路径"
      ],
      "answer": 0,
      "explanation": "关键路径给出项目最短可能完工时间。"
    }
  },
  "g-multistage": {
    "title": "多阶段图动态规划",
    "objective": "从终点反向计算每个阶段的最优后缀代价。",
    "invariant": "cost[u] = min(c(u,v)+cost[v])，每个子问题依赖更靠后的阶段。",
    "complexity": "按 DAG 拓扑序处理为 O(V+E)。",
    "explanation": "多阶段图把决策按阶段组织；逆序动态规划可复用后续最优值。路径搜索顺序不等于路径成本。",
    "transfer": "分阶段决策、有限期计划和分层路由可拆成状态与转移。",
    "prediction": {
      "prompt": "已知终点代价为 0，计算单源到终点的最优代价时应先处理哪一端？",
      "options": [
        "终点向起点逆序",
        "起点向终点正序"
      ],
      "answer": 0,
      "explanation": "逆序时后继状态已算好，可直接比较转移代价。"
    }
  },
  "g-max-flow": {
    "title": "Edmonds–Karp 最大流",
    "objective": "在残量网络中寻找增广路，并累计瓶颈流量。",
    "invariant": "增广后正向残量减少、反向残量增加；最大流等于最小割容量。",
    "complexity": "O(VE²) 时间。",
    "explanation": "Edmonds–Karp 用 BFS 找最少边数的残量 s→t 路径。反向边允许撤回并重排先前流量。",
    "transfer": "容量约束下的匹配、带宽与供应输送可转成最大流。",
    "prediction": {
      "prompt": "增广后为什么需要增加反向残量边？",
      "options": [
        "允许后续路径撤销并重分配流",
        "让容量总和变大"
      ],
      "answer": 0,
      "explanation": "反向边表达可撤销的既有流量，不代表凭空增加容量。"
    },
    "theory": {
      "conditions": "容量非负，源 s 与汇 t 不同；流必须遵守边容量与中间顶点流守恒。残量图同时包含增加流的正向边和撤回流的反向边。",
      "claim": "没有残量 s→t 路时，当前流达到某个割的容量，因此是最大流。",
      "steps": [
        "沿残量路径按最小剩余容量增广，所有边仍满足容量；中间点一进一出，守恒不变。",
        "反向边表示撤回以前的流，它允许修正早期选择，不是额外物理通道。",
        "算法终止后令 R 为残量图中 s 可达的顶点。t 不在 R；原图 R→外部边已饱和，外部→R 边的当前流为 0。",
        "净流值等于跨割向外流减向内流，此时恰为割容量。任何可行流都不超过任意割容量，因此当前流最优。"
      ],
      "boundary": "只删除正向容量而没有反向残量边可能卡在次优流；固定两条路径的总和也不是最大流证明。",
      "transfer": {
        "prompt": "某已用边出现反向残量容量 3，这表示什么？",
        "options": [
          "最多可以撤回该边 3 单位已有流",
          "原网络多了一条容量 3 的新管线",
          "必须立刻增加总流量 3"
        ],
        "answer": 0,
        "explanation": "反向容量用于重排既有流，撤回后其他路径可能获得更大的总流量。"
      }
    }
  },
  "g-min-cost-flow": {
    "title": "最小费用最大流",
    "objective": "沿残量网络的最短费用增广路送流，并观察反向费用。",
    "invariant": "反向残量边费用为正向费用的相反数，可纠正先前路由。",
    "complexity": "逐次最短路朴素实现 O(FVE)，势能+Dijkstra 可优化。",
    "explanation": "每轮找残量网络最短费用路并增广瓶颈，直到无路或达到需求。含负费用反向边时需 Bellman–Ford 或可行势能。",
    "transfer": "要求最大输送量同时最低总费用时使用；费用与容量是不同属性。",
    "prediction": {
      "prompt": "正向边费用为 4，其反向残量边费用应为多少？",
      "options": [
        "−4",
        "4"
      ],
      "answer": 0,
      "explanation": "反向边代表撤销该流，费用取相反数。"
    },
    "theory": {
      "conditions": "本任务从零流开始，原边费用非负；每轮在完整残量图中找最短费用增广路，反向边费用取原边相反数。固定流量的最优性要求残量图无负费用环。",
      "claim": "残量图无负费用环时，当前流是同流量下费用最小的；最短费用增广可保持这一性质，直到获得最小费用最大流。",
      "steps": [
        "两个同流量可行流的差可分解为残量图中的循环。若有更便宜的同流量流，差中必包含一个负费用循环；反之沿负环调整可降费用。",
        "因此“没有负费用残量环”是固定流量最优的判据。初始非负费用、零流满足该判据。",
        "取最短费用增广路；距离标号使所考察残量边的约化费用非负，最短路上的边约化费用为 0。",
        "增广新出现的反向边也具有零约化费用，因此不会制造改善同流量的负环；保留最小费用性质。没有 s→t 残量路时再由最大流判据完成证明。"
      ],
      "boundary": "反向边常为负费用，不能直接用要求非负费用的普通 Dijkstra；本实现用 Bellman–Ford。一般初始负环网络需要额外处理，不能套本域。",
      "transfer": {
        "prompt": "原边费用为 5，已发送一单位后，其反向残量边费用应是多少？",
        "options": [
          "−5",
          "5",
          "0"
        ],
        "answer": 0,
        "explanation": "撤回原来一单位流应退回 5 单位费用，反向费用必须取相反数。"
      }
    }
  },
  "sort-insertion-direct": {
    "title": "直接插入排序",
    "objective": "每次把当前航标插入已排序前缀。",
    "invariant": "每轮开始时，前缀 [0,i) 有序且恰含原来的前 i 个元素。",
    "complexity": "最好 O(n)，平均与最坏 O(n²)；额外空间 O(1)；稳定。逆序输入需要二次移动。",
    "explanation": "从左向右取出 key，逐个比较前驱并右移较大的元素，再把 key 放入空位。",
    "transfer": "当已排序区很短或接近有序时，可用于小数组或其他排序的末端小分区。",
    "prediction": {
      "prompt": "把 4 插入 [1,3,6] 时，哪些元素会移动？",
      "options": [
        "只把 6 右移",
        "把 3 和 6 右移",
        "不移动"
      ],
      "answer": 0,
      "explanation": "4 大于 3，所以搜索停止，只需为 4 腾出 6 的位置。"
    }
  },
  "sort-insertion-binary": {
    "title": "二分插入排序",
    "objective": "用二分查找确定 key 的插入位置，再移动前缀。",
    "invariant": "每轮开始时前缀有序；插入后前缀仍有序且长度增加一。",
    "complexity": "比较 O(n log n)，移动最好 O(n)、平均与最坏 O(n²)；额外空间 O(1)；稳定（插在相等值之后）。",
    "explanation": "二分搜索减少位置比较次数，但数组中的元素仍须逐格移动。",
    "transfer": "适合比较代价高而元素移动代价低的场景；不能把二分查找误当成减少数组搬移。",
    "prediction": {
      "prompt": "二分查找能否让逆序数组的总移动量变成 O(n log n)？",
      "options": [
        "能，搜索和移动都减少",
        "不能，只减少比较次数",
        "能，移动为 O(1)"
      ],
      "answer": 1,
      "explanation": "确定插入位置需要 O(log n) 比较，但最坏仍要移动 O(n) 个元素。"
    }
  },
  "sort-shell": {
    "title": "希尔排序",
    "objective": "按递减间隔执行插入排序，逐步消除远距离逆序。",
    "invariant": "每轮 gap 结束后，每个相隔 gap 的子序列分别有序。",
    "complexity": "本关使用 n/2、n/4…1 的间隔；最坏 O(n²)，额外空间 O(1)，不稳定。复杂度依赖间隔序列。",
    "explanation": "较大的 gap 先让元素长距离靠近目标位置，最后 gap=1 完成普通插入排序。",
    "transfer": "用于中小型原地排序；选择不同 gap 序列会改变比较和移动界。",
    "prediction": {
      "prompt": "最后一次 gap 必须是多少，才能保证整体有序？",
      "options": [
        "必须为 1",
        "必须为 2",
        "不需要最后一轮"
      ],
      "answer": 0,
      "explanation": "gap=1 检查并修复相邻逆序，给出完整排序保证。"
    }
  },
  "sort-bubble": {
    "title": "冒泡排序",
    "objective": "重复比较相邻元素，把每轮最大值推到未定区末端。",
    "invariant": "每轮结束后，未定区最大元素已固定在末端。",
    "complexity": "最好 O(n)（带提前停止），平均与最坏 O(n²)；额外空间 O(1)；稳定。",
    "explanation": "相邻逆序才交换，因此相等元素不会彼此越过；一整轮无交换时可提前结束。",
    "transfer": "教学上适合观察局部交换；生产排序通常选更高效算法。",
    "prediction": {
      "prompt": "一轮扫描后，哪个元素必定到达未排序区最右侧？",
      "options": [
        "最小值",
        "最大值",
        "中位数"
      ],
      "answer": 1,
      "explanation": "较大的相邻元素不断向右交换，最大值最终抵达末端。"
    }
  },
  "sort-selection": {
    "title": "选择排序",
    "objective": "每轮从未排序后缀找最小值，并放入前缀边界。",
    "invariant": "边界左侧已排序，且不大于后缀中的任一元素。",
    "complexity": "最好、平均、最坏均 O(n²) 比较；O(n) 次交换，额外空间 O(1)；通常不稳定。",
    "explanation": "每轮扫描完整后缀以找到最小项，完成后前缀扩大一格。",
    "transfer": "当写入次数昂贵、比较便宜时，较少交换可能有用。",
    "prediction": {
      "prompt": "即使输入已经有序，选择排序仍做多少量级的比较？",
      "options": [
        "O(n)",
        "O(n log n)",
        "O(n²)"
      ],
      "answer": 2,
      "explanation": "每轮仍需扫描余下后缀以确认最小值。"
    }
  },
  "sort-tournament": {
    "title": "锦标赛排序",
    "objective": "用成对比赛逐层选出最小值，并重复淘汰胜者。",
    "invariant": "每个比赛节点保存其子树叶子中的最小值；根节点是当前全局最小值。",
    "complexity": "建树 O(n)，重复取最小 O(n log n)；额外空间 O(n)；稳定性取决于相等值的胜负规则，本实现左侧优先。",
    "explanation": "每轮胜者沿比赛树上升到根；输出后停用该叶子，再由剩余候选重新比赛。",
    "transfer": "多路选择器可沿胜者路径更新，减少磁盘归并时寻找最小前端的成本。",
    "prediction": {
      "prompt": "两个相等值在同一场比赛时，谁获胜？",
      "options": [
        "左侧候选",
        "右侧候选",
        "随机"
      ],
      "answer": 0,
      "explanation": "平局保留左侧，且左侧原始次序较早，因此相等项可保持稳定。"
    }
  },
  "sort-heap": {
    "title": "堆排序",
    "objective": "建立最大堆，反复把根最大值移入已排序后缀。",
    "invariant": "活动堆内每个父节点不小于其子节点；后缀按最终次序固定。",
    "complexity": "最好、平均、最坏 O(n log n)；额外空间 O(1)；不稳定。建堆 O(n)。",
    "explanation": "数组下标 i 的孩子是 2i+1 与 2i+2；交换根与末项后，仅需向下恢复活动堆。",
    "transfer": "当需要原地且有最坏 O(n log n) 保证时可用；树形关系直接由数组下标构成。",
    "prediction": {
      "prompt": "0 起始下标数组中，下标 2 的左孩子在哪？",
      "options": [
        "4",
        "5",
        "6"
      ],
      "answer": 1,
      "explanation": "左孩子下标为 2i+1，所以是 5。"
    }
  },
  "sort-quick": {
    "title": "快速排序",
    "objective": "用末项作枢轴分区，使小项在左、大项在右，再递归处理两侧。",
    "invariant": "分区完成后，左侧值不大于枢轴，右侧值不小于枢轴，枢轴位置最终确定。",
    "complexity": "平均 O(n log n)，最坏 O(n²)；递归栈平均 O(log n)、最坏 O(n)；不稳定。本关固定末项枢轴，已排序和逆序输入均可能触发最坏分区。",
    "explanation": "比较数取决于分区形状。末项枢轴遇到有序或逆序输入会得到极不平衡子问题。",
    "transfer": "随机枢轴、三数取中或 introsort 可降低坏分区风险；不要把 O(n log n) 当作所有输入的保证。",
    "prediction": {
      "prompt": "末项枢轴处理已升序的 n 个互异值时，递归子问题大小如何？",
      "options": [
        "约 n/2 与 n/2",
        "0 与 n-1",
        "固定为 log n"
      ],
      "answer": 1,
      "explanation": "每次末项枢轴都是最大值，分区极不平衡，比较总数为 Θ(n²)。"
    }
  },
  "sort-merge": {
    "title": "归并排序",
    "objective": "递归拆分序列，把两个已排序子序列按前端次序合并。",
    "invariant": "每次合并的左右输入各自有序，输出始终是已消费元素的有序排列。",
    "complexity": "最好、平均、最坏 O(n log n)；辅助空间 O(n)，递归栈 O(log n)；稳定（相等时左侧先出）。",
    "explanation": "递归到单项区间，再比较两侧前端；每层总搬移 O(n)，层数 O(log n)。",
    "transfer": "适合稳定排序和外存顺序读写；也能自然推广为多路归并。",
    "prediction": {
      "prompt": "左右前端相等时，先取哪一边可保稳定？",
      "options": [
        "左边",
        "右边",
        "无所谓"
      ],
      "answer": 0,
      "explanation": "左侧区间来自原序列中更早的位置，先取左边可保留相等元素次序。"
    }
  },
  "sort-bucket": {
    "title": "桶排序",
    "objective": "按数值范围映射到四个有界桶，再桶内排序并按桶序连接。",
    "invariant": "桶索引随数值单调不减；每个元素恰进入一个桶，桶内完成排序后拼接有序。",
    "complexity": "本关值域非负且桶数固定为 4；分布均匀时约 O(n+k)，最坏桶内排序 O(n²)；空间 O(n+k)。稳定性取决于桶内排序，本实现数值相等身份顺序未承诺。",
    "explanation": "桶宽由本次 min、max 和桶数计算，边界值被限制在最后一个桶中。",
    "transfer": "适用于值域有界且分布较均匀的数据；极端偏斜会让桶内排序成为瓶颈。",
    "prediction": {
      "prompt": "所有值都相同时，桶宽至少是多少？",
      "options": [
        "0",
        "1",
        "负 1"
      ],
      "answer": 1,
      "explanation": "宽度下限为 1，避免除以零并把相同值映射到首桶。"
    }
  },
  "sort-radix": {
    "title": "基数排序",
    "objective": "从个位到最高位稳定分配并收集十进制数值。",
    "invariant": "完成 place 位后，序列按低于该位的数位前缀有序；每轮稳定性保留低位次序。",
    "complexity": "非负整数、基数 10、d 位时 O(d(n+10))；额外空间 O(n+10)；稳定。",
    "explanation": "LSD 从低位开始；每一位的稳定分配让此前建立的低位次序继续有效。",
    "transfer": "适用于键长度受限的非负整数或编码；负数与小数需要额外映射策略。",
    "prediction": {
      "prompt": "为什么低位轮次必须稳定？",
      "options": [
        "保留已建立的低位排序",
        "减少桶的数量",
        "避免比较最大值"
      ],
      "answer": 0,
      "explanation": "高位相同时，低位次序决定最终顺序；不稳定收集会破坏它。"
    }
  },
  "sort-counting": {
    "title": "稳定计数排序",
    "objective": "统计有界整数频数，计算前缀位置，再从右向左稳定散布元素。",
    "invariant": "频数表给出每个键的出现次数；prefix[v] 表示不大于 v 的元素数；倒序散布让相同键保持原序。",
    "complexity": "键值范围 R、元素数 n 时 O(n+R) 时间与空间；稳定；整数键不做元素间比较。",
    "explanation": "先累计频数，再转为前缀和。扫描输入的方向是从右向左，每个元素写入其键对应的最后一个空位并递减位置。",
    "transfer": "适用于范围较小的整数键、排名转换与基数排序子过程；若值域远大于 n，频数表会浪费空间。",
    "prediction": {
      "prompt": "稳定散布为何从右向左扫描输入？",
      "options": [
        "让相同键较晚的项先占据较后位置",
        "避免建立频数表",
        "减少键值范围"
      ],
      "answer": 0,
      "explanation": "后出现的相同键先放到较后位置，较早的相同键随后放在其前面。"
    }
  },
  "external-kway-merge": {
    "title": "外部多路归并",
    "objective": "用每段有限输入缓冲和有限输出缓冲，按块读入有序磁盘段并归并。",
    "invariant": "输出前缀有序；每段仅驻留至多 2 项输入块，输出缓冲至多 3 项；游标只前进。",
    "complexity": "k 路、N 项以最小堆选择前端时 O(N log k) 比较，缓冲内存 O(kB+O)；本示例用线性扫描 k 个前端，成本 O(Nk)，并统计实际块读写。",
    "explanation": "输入缓冲空时从对应磁盘段读入至多 2 项；每次取所有缓冲前端中的最小项，放入最多容纳 3 项的输出缓冲，满块或末尾部分块即刷盘。",
    "transfer": "增大归并路数能减少归并趟数，但需要更多输入缓冲；块大小影响顺序 I/O 次数与内存占用。",
    "prediction": {
      "prompt": "输出缓冲已满 3 项时，下一步发生什么？",
      "options": [
        "刷新一个输出块到磁盘",
        "清空所有输入段",
        "把文件全部载入内存"
      ],
      "answer": 0,
      "explanation": "满块顺序写出，腾空有限输出缓冲继续归并。"
    }
  },
  "external-replacement-selection": {
    "title": "置换选择生成初始段",
    "objective": "用容量为 3 的最小堆在线生成递增初始段，并冻结不符合当前段的输入。",
    "invariant": "活动最小堆最多 3 项且只含不小于本段最近输出的项；冻结项留待下一段，因此每个生成段单调不减。",
    "complexity": "N 项、内存容量 M 时 O(N log M)；工作内存 O(M+B)，另有输入/输出块缓冲；示例按 2 项块统计读写。生成段平均可长于 M，最坏约 M。",
    "explanation": "输入块按需读入；弹出堆顶后消费下一项，若不小于刚输出值便留在当前堆，否则冻结。活动堆耗尽即关闭一段、按块写出并解冻下一段。",
    "transfer": "外部排序先用该方法生成长初始段，再使用多路归并减少磁盘趟数；块读写计数衡量顺序 I/O。",
    "prediction": {
      "prompt": "当前段刚输出 7，新读入 5 应如何处理？",
      "options": [
        "插入活动堆",
        "冻结到下一段",
        "丢弃"
      ],
      "answer": 1,
      "explanation": "5 小于当前段末值 7，立即参与会破坏单调性，因此冻结。"
    }
  },
  "external-optimal-merge": {
    "title": "最优归并模式",
    "objective": "每轮合并当前最小的两个文件，计算总读写代价。",
    "invariant": "每个合并节点权重等于两个子文件大小之和；总成本等于所有内部节点权重之和。",
    "complexity": "文件数 F 时最小堆实现 O(F log F)，空间 O(F)；合并重量和给出最优总成本。",
    "explanation": "Huffman 贪心选择两个最小权重，较小文件尽量处于较深层，减少重复读写。",
    "transfer": "用于规划不同大小有序段的归并顺序；代价按每次合并的输入总大小累计。",
    "prediction": {
      "prompt": "文件大小为 2、3、9 时，第一轮应合并哪两个？",
      "options": [
        "2 和 3",
        "2 和 9",
        "3 和 9"
      ],
      "answer": 0,
      "explanation": "贪心规则先合并当前最小的两个文件，代价为 5。"
    }
  },
  "divide-recursion-tree": {
    "title": "递归树的逐层工作量",
    "objective": "展开递归树并统计每层的子问题数量、规模与工作量。",
    "invariant": "同一层子问题互不重叠，层工作量等于子问题数乘单个子问题的规模代价。",
    "complexity": "T(n)=2T(n/2)+n 时，每层 Θ(n)，共 Θ(log n) 层，总计 Θ(n log n)。",
    "explanation": "每层子问题数翻倍、规模减半，乘积保持不变；叶层也计入总工作量。",
    "transfer": "把分治递推写成各层工作量之和，可判断哪几层主导总成本。",
    "prediction": {
      "prompt": "每下一层，子问题数与单个问题规模怎样变化？",
      "options": [
        "数量翻倍、规模减半",
        "数量减半、规模翻倍",
        "两者都减半"
      ],
      "answer": 0,
      "explanation": "二叉等分让子问题数乘二、每个子问题规模除二。"
    },
    "theory": {
      "conditions": "T(n)=2T(n/2)+Θ(n)，T(1)=Θ(1)，先取 n=2^h；每个节点的合并工作与其子问题规模成正比。",
      "claim": "每层 Θ(n) 工作，Θ(log n) 层，总时间 Θ(n log n)。",
      "steps": [
        "深度 i 有 2^i 个子问题，每个规模 n/2^i，层工作相乘为 Θ(n)。",
        "当 n/2^i=1 时到达叶层，i=log₂n；叶子总成本也是 Θ(n)。",
        "把从根到叶各层相加，得到 Θ(n)(log₂n+1)。",
        "若每个节点只做 Θ(1) 局部工作，各层总成本改为 1,2,4,…,n，和为 Θ(n)，不能照抄上一结论。"
      ],
      "boundary": "层成本取决于递推式的非递归项；不等规模子问题、变化的分支数等不能直接套这个等分树。",
      "transfer": {
        "prompt": "T(n)=2T(n/2)+1、T(1)=1 的总阶是什么？",
        "options": [
          "Θ(n)",
          "Θ(n log n)",
          "Θ(log n)"
        ],
        "answer": 0,
        "explanation": "各层成本按 1,2,4,… 增长，几何级数由叶层主导。"
      }
    }
  },
  "divide-master-theorem": {
    "title": "主定理三种情形",
    "objective": "比较递归外工作 n^d 与临界指数 log_b(a)，判断渐近阶。",
    "invariant": "只对 T(n)=aT(n/b)+Θ(n^d) 等满足定理前提的递推应用；第三种情形还需正则性条件。",
    "complexity": "d>log_b(a)：Θ(n^d)；相等：Θ(n^d log n)；d<log_b(a)：Θ(n^{log_b(a)})。",
    "explanation": "临界指数代表叶层规模累积的贡献；与递归外工作比较即可判定主导项。",
    "transfer": "先检查子问题规模与正则性，再比较指数，避免把主定理套到不满足前提的递推上。",
    "prediction": {
      "prompt": "当递归外工作指数 d 等于 log_b(a) 时，结果是哪一阶？",
      "options": [
        "Θ(n^d)",
        "Θ(n^d log n)",
        "Θ(n^{log_b(a)})"
      ],
      "answer": 1,
      "explanation": "两类工作在每层同阶，因此额外累积一个对数因子。"
    }
  },
  "divide-hanoi": {
    "title": "汉诺塔递归",
    "objective": "逐步生成将圆盘从起点移至终点的合法移动序列。",
    "invariant": "移动任意圆盘前，目标柱顶部必须没有更小的盘；递归先移走压在该盘上方的所有盘。",
    "complexity": "T(n)=2T(n−1)+1，时间 Θ(2^n)，额外递归空间 Θ(n)。",
    "explanation": "先把 n−1 个盘移到辅助柱，再移动最大盘，最后把 n−1 个盘移到目标柱。",
    "transfer": "识别“先解一个较小子问题、执行一步、再解另一个子问题”的递归结构。",
    "prediction": {
      "prompt": "移动 n 个盘至少需要几步？",
      "options": [
        "n²",
        "2^n−1",
        "2n"
      ],
      "answer": 1,
      "explanation": "递推 T(n)=2T(n−1)+1 的解是 2^n−1。"
    }
  },
  "divide-quickselect": {
    "title": "随机化快速选择",
    "objective": "用固定种子的伪随机枢轴定位第 k 小元素，只递归处理一侧。",
    "invariant": "每轮划分后，枢轴处于最终次序位置；所求秩只可能落在一侧或正好是枢轴。",
    "complexity": "期望 Θ(n)，最坏 Θ(n²)；本实现迭代执行，除轨迹快照外使用 Θ(1) 辅助空间。",
    "explanation": "快速选择沿用快速排序划分，但丢弃不含目标秩的一边；种子让轨迹可重复。",
    "transfer": "只要求一个次序统计量时，不必完整排序。",
    "prediction": {
      "prompt": "划分后，快速选择下一步保留什么？",
      "options": [
        "两侧都递归",
        "只保留含目标秩的一侧",
        "永远保留左侧"
      ],
      "answer": 1,
      "explanation": "目标秩已经确定所在区域，另一侧不影响答案。"
    },
    "theory": {
      "conditions": "所求秩 k 合法；当前迭代划分样本键互异。期望线性界采用每次独立均匀选择枢轴的数学模型；固定种子只是可重放实现。",
      "claim": "分区后只保留含目标秩的一侧仍然正确；理想随机枢轴下期望 Θ(n)，最坏 Θ(n²)。",
      "steps": [
        "分区保持元素多重集合，枢轴左边全小于它、右边全大于它，因此枢轴位置就是其排序后的秩。",
        "比较目标秩与枢轴秩；不含目标的一侧可以丢弃，保留侧继续维持候选包含答案的不变式。",
        "至少约一半枢轴位于中间一半，使剩余规模至多约 3n/4；等到一次这样的缩减，期望只需常数次划分。",
        "分阶段累计期望工作为 O(n)+O(3n/4)+O((3/4)²n)+…=O(n)。一次划分本身要读线性数量元素，得到 Θ(n)。"
      ],
      "boundary": "最差枢轴序列仍会每轮只去掉一个元素；重复键须用三路划分或另行分析，不能把互异键结论无条件搬过去。",
      "transfer": {
        "prompt": "某轮枢轴落在排序后的第 6 位，目标是第 3 小，下一轮应怎样做？",
        "options": [
          "只保留枢轴左侧并保持目标秩",
          "两侧都递归",
          "直接返回枢轴"
        ],
        "answer": 0,
        "explanation": "枢轴及右侧所有元素的秩都不可能是第 3，丢弃它们不影响答案。"
      }
    }
  },
  "divide-closest-pair": {
    "title": "最近点对分治",
    "objective": "按 x 坐标分半，递归求解并检查跨中线的候选条带。",
    "invariant": "条带外点不可能形成比当前最佳距离更短的跨界点对；条带按 y 排序便于筛查。",
    "complexity": "本实现每层重新排序条带，时间 Θ(n log² n)，算法工作空间 O(n)；轨迹快照另占与记录帧数量成正比的内存。若传递 y 序列并线性合并，可达 Θ(n log n)。",
    "explanation": "合并阶段只检查距离分界线小于当前最优距离的点，并用 y 差过滤候选。",
    "transfer": "分治的合并步骤应由已知最优界限缩小候选集合。",
    "prediction": {
      "prompt": "条带中可跳过哪类点对？",
      "options": [
        "y 坐标差已不小于当前最短距离的点对",
        "所有跨左右半区点对",
        "x 坐标接近的点对"
      ],
      "answer": 0,
      "explanation": "纵向距离已达到当前最佳值时，欧氏距离不可能更小。"
    },
    "theory": {
      "conditions": "二维欧氏距离，有限点集；分割线按 x 序将点分为左右部分，局部问题已经正确求解。",
      "claim": "合并时必须检查条带内的跨界候选；按 y 差排除的候选不会改进已知最短距离。",
      "steps": [
        "令 δ 为已知局部最短距离的较小值。若全局更短点对跨过分割线，它们到分割线的水平距离均小于 δ。",
        "所以跨界改进只能出现在宽度 2δ 的条带内；条带外点可安全排除。",
        "条带按 y 排序；当后一个点的 y 差已≥δ，其欧氏距离必≥δ，后续 y 更远的点也不能改进。",
        "将左右内部候选与所有可能改进的条带候选合在一起，就没有漏掉全局最短点对。",
        "当前每层重新排序条带，使用 O(n log²n) 上界；传递预排好的 y 序列并线性合并才得到经典 O(n log n)。"
      ],
      "boundary": "只取左右局部答案会漏掉跨界最近点对；画一条漂亮中线不能代替条带检查。重复坐标的最短距离为 0，需正确保留该结果。",
      "transfer": {
        "prompt": "左右各自最近距离都是 10，但分割线两侧各有一点相距 1，答案是多少？",
        "options": [
          "1，需要检查跨界候选",
          "10，只比较局部答案",
          "20，把局部距离相加"
        ],
        "answer": 0,
        "explanation": "跨界点对可能比两个局部最优都短，这正是合并步骤的责任。"
      }
    }
  },
  "divide-strassen": {
    "title": "Strassen 矩阵乘法",
    "objective": "计算七个标量乘积并组合成 2×2 矩阵乘积。",
    "invariant": "七个中间乘积按固定加减组合，结果必须等于普通矩阵乘法。",
    "complexity": "Θ(n^{log₂7})≈Θ(n^2.807) 时间，递归辅助空间依实现而异。",
    "explanation": "把八次子矩阵乘法降为七次，以更多加减法换取更少昂贵乘法。",
    "transfer": "矩阵分块后寻找代数变换，降低递归中最昂贵的操作次数。",
    "prediction": {
      "prompt": "2×2 Strassen 需要几个子乘积？",
      "options": [
        "7",
        "8",
        "4"
      ],
      "answer": 0,
      "explanation": "七个乘积足以重建四个结果象限。"
    }
  },
  "divide-fft": {
    "title": "基 2 快速傅里叶变换",
    "objective": "用偶数项与奇数项的蝶形合并计算四点复数频谱。",
    "invariant": "每个输出 X[k] 等于偶部 E[k] 与旋转因子 Wⁿᵏ 乘奇部 O[k] 之和。",
    "complexity": "一般 n=2^m 时 Θ(n log n) 时间与 Θ(n) 空间。",
    "explanation": "递归拆成偶、奇两组，再通过旋转因子蝶形组合。",
    "transfer": "遇到周期或频域计算时，利用对称性把问题拆成较小规模。",
    "prediction": {
      "prompt": "四点 FFT 的核心合并操作是什么？",
      "options": [
        "比较排序",
        "蝶形加减并乘旋转因子",
        "构造所有排列"
      ],
      "answer": 1,
      "explanation": "蝶形将偶部和奇部频谱合并为完整频谱。"
    }
  },
  "divide-comparison-lower-bound": {
    "title": "比较排序下界",
    "objective": "用决策树叶节点数推出比较排序最坏比较次数的下界。",
    "invariant": "n 个互异输入有 n! 种排列，正确的比较决策树至少要有 n! 个叶节点。",
    "complexity": "最坏比较次数至少 ceil(log₂(n!))=Ω(n log n)，仅适用于基于比较的排序。",
    "explanation": "高度为 h 的二叉决策树最多有 2^h 个叶节点，因此 2^h≥n!。",
    "transfer": "下界说明比较排序无法突破渐近障碍；计数排序等非比较排序使用额外键域假设。",
    "prediction": {
      "prompt": "下界论证中的 n! 个叶节点对应什么？",
      "options": [
        "可能的输入排列",
        "数组下标",
        "比较次数"
      ],
      "answer": 0,
      "explanation": "每种互异键排列都必须被区分并得到正确顺序。"
    },
    "theory": {
      "conditions": "考虑正确的确定性比较排序，n 个关键字互异，算法只能由二元比较结果获得相对次序。",
      "claim": "最坏情况下至少需要 Ω(n log n) 次比较；这个下界不是所有排序计算模型的下界。",
      "steps": [
        "n 个带身份的互异记录有 n! 种可能次序，正确决策树必须区分它们，因此至少有 n! 个叶子。",
        "高度 h 的二叉树至多有 2^h 个叶子，故 h≥log₂(n!)。",
        "n! 中至少约 n/2 个因子不小于 n/2，因此 log₂(n!)≥⌊n/2⌋log₂(n/2)=Ω(n log n)。",
        "高度给出某条输入路径的最坏比较数；归并等 O(n log n) 比较排序在渐近阶上达到该界。"
      ],
      "boundary": "计数或基数排序利用有界键域/数字位，不受“仅比较”模型限制；这不与下界矛盾。",
      "transfer": {
        "prompt": "某算法对 [0,k) 整数用计数完成 O(n+k) 排序，是否推翻比较排序下界？",
        "options": [
          "没有，它使用了额外键域信息",
          "推翻了",
          "只有 k<n 时推翻"
        ],
        "answer": 0,
        "explanation": "下界的前提是只靠比较；按键值直接计数换了计算模型。"
      }
    }
  },
  "greedy-fractional-knapsack": {
    "title": "分数背包",
    "objective": "按单位重量价值排序，直到容量耗尽，允许最后一件取部分。",
    "invariant": "每次优先取剩余物品中价值密度最高的部分。",
    "complexity": "排序 Θ(n log n)，额外空间 Θ(n)。",
    "explanation": "可分割物品时，单位重量价值最高的部分不会被更低密度部分替代而变差。",
    "transfer": "先确认决策对象可分；0/1 背包不能直接套用此贪心规则。",
    "prediction": {
      "prompt": "选择物品的排序指标是什么？",
      "options": [
        "总价值",
        "价值/重量",
        "重量/价值"
      ],
      "answer": 1,
      "explanation": "容量按重量消耗，因此比较每单位重量获得的价值。"
    },
    "theory": {
      "conditions": "物品重量严格为正、价值非负，可取任意 [0,1] 比例，容量是唯一约束。",
      "claim": "按价值密度 v/w 降序尽量取入，得到分数背包的最优价值。",
      "steps": [
        "假设可行解仍取了低密度物品的一部分，却没有取满某个更高密度物品。",
        "从低密度部分移出重量 Δ，再补入相同重量的高密度部分。总重量不变，价值变化为 Δ(高密度−低密度)≥0。",
        "重复这种交换，可把某个最优解变成包含贪心前缀的解，而不损失价值。",
        "取满一个物品后对剩余容量重复；容量不足时取最高密度剩余物品的恰当分数，交换论证仍成立。"
      ],
      "boundary": "0/1 背包不能进行任意重量交换。容量 4、物品 (重量,价值)=(3,5),(2,3),(2,3)，密度贪心只得 5，后两件得 6。",
      "transfer": {
        "prompt": "上述容量 4 的 0/1 实例中，按密度优先选择 (3,5) 是否保证最优？",
        "options": [
          "不保证，另两件总价值 6",
          "保证，密度最高即可",
          "只有相同价值时才不保证"
        ],
        "answer": 0,
        "explanation": "交换证明依赖可分割性，整件物品无法按任意 Δ 重量替换。"
      }
    }
  },
  "greedy-job-deadline": {
    "title": "带截止时间的单位作业",
    "objective": "按利润降序，将每个作业安排在截止时间前最晚的空闲时隙。",
    "invariant": "已选作业的时隙安排保持可行，给后续作业保留尽可能早的时隙。",
    "complexity": "排序 Θ(n log n)，朴素找时隙 Θ(nD)，D 为最大截止时间。",
    "explanation": "把高利润作业靠近截止点安排，尽量不挤占其他作业可用的早期时隙。",
    "transfer": "适用条件是作业时长相同且利润在完成后获得。",
    "prediction": {
      "prompt": "为什么把已选作业放在可用的最晚时隙？",
      "options": [
        "给后续作业留下较早时隙",
        "缩短作业运行时间",
        "提高作业利润"
      ],
      "answer": 0,
      "explanation": "较早的空位可支持截止期更紧的后续作业。"
    },
    "theory": {
      "conditions": "单台机器、每个作业恰占一个离散时隙、整数截止期、非负收益；收益在截止期前完成才获得。",
      "claim": "按收益降序考虑作业，并放入不晚于期限的最晚空闲时隙，可以得到最大总收益。",
      "steps": [
        "作业集合可行，当且仅当对每个 t，截止期≤t 的已选作业数不超过 t；按期限顺序安排即可证明充分性。",
        "这些可行集合具有交换性质：若两个可行集合 I、J 满足 |I|<|J|，必有 J 中某作业可加入 I。否则每个候选都被 I 的某个“已满期限前缀”阻挡；取最大这样的前缀，J 在其中的作业数会超过容量，矛盾。",
        "利用该交换性质，每次收入较高收益的可行作业，都可从某个最优补全中换出一个尚未选择、收益不更高的作业，仍保持可行及不降低收益。",
        "最晚空闲槽的安排保留较早空位；它实现单位时长作业的可行性选择。所有作业考虑完后，交换论证给出最优性。"
      ],
      "boundary": "不同作业时长、释放时间或额外资源约束会破坏这个模型，不能直接套用上述贪心。",
      "transfer": {
        "prompt": "若某作业需要 3 个时隙，其他作业仍需 1 个，原来的按收益贪心证明是否直接适用？",
        "options": [
          "不适用，单位时长前提失效",
          "适用，只看收益",
          "只要按名字排序就适用"
        ],
        "answer": 0,
        "explanation": "可行集合与交换性质依赖每个作业只占一个时隙，改变时长需要重新设计算法。"
      }
    }
  },
  "greedy-activity-selection": {
    "title": "活动选择",
    "objective": "按结束时间排序，反复选择最早结束且与已选活动兼容者。",
    "invariant": "每一步选择结束最早的可行活动，为剩余活动留下最大时间窗口。",
    "complexity": "排序 Θ(n log n)，排序后扫描 Θ(n)，额外空间 Θ(n)。",
    "explanation": "交换论证表明，最早结束的可行活动不会减少可安排活动的最大数量。",
    "transfer": "目标是最大化互不重叠区间的数量，不是最大化总时长或收益。",
    "prediction": {
      "prompt": "选择活动时优先看哪个时间？",
      "options": [
        "最早开始",
        "最早结束",
        "最短持续时间"
      ],
      "answer": 1,
      "explanation": "尽早释放资源，给后续活动留下更多空间。"
    }
  },
  "greedy-johnson-flowshop": {
    "title": "Johnson 两机流水调度",
    "objective": "按 Johnson 规则构造两台机器上的作业顺序，并计算完工时间。",
    "invariant": "最小剩余加工时间若在机器一，则放序列前部；若在机器二，则放后部。",
    "complexity": "预排序后 Θ(n log n) 时间、Θ(n) 空间。",
    "explanation": "将作业按较短加工时间排序；较短时间在机器一的作业放前组，在机器二的放后组，再逆序拼接后组。",
    "transfer": "检查所有作业的机器顺序一致且无额外资源约束；一般多机调度不保证最优。",
    "prediction": {
      "prompt": "剩余作业中最短加工时间若在机器二，应怎样安排？",
      "options": [
        "放到序列最前",
        "放到序列最后",
        "删除该作业"
      ],
      "answer": 1,
      "explanation": "Johnson 规则将机器二较短的作业靠后安排。"
    }
  },
  "dp-knapsack-01": {
    "title": "0/1 背包动态规划",
    "objective": "对每件不可拆分物品计算容量上限下的最优价值。",
    "invariant": "DP[i,c] 只依赖前 i−1 件物品的状态，分别比较不取与取当前物品。",
    "complexity": "Θ(nW) 时间、Θ(nW) 空间；W 为整数容量。",
    "explanation": "每件物品只取或不取；填表后从右下角回溯，恢复选择并检查剩余容量。",
    "transfer": "容量大时伪多项式表格可能昂贵，可考虑按价值建表或近似算法。",
    "prediction": {
      "prompt": "0/1 背包的当前物品有哪两种选择？",
      "options": [
        "跳过或整件取入",
        "任意比例取入",
        "只比较重量"
      ],
      "answer": 0,
      "explanation": "每件物品不可分割，只能取零件或一整件。"
    },
    "theory": {
      "conditions": "物品重量与容量为非负整数，每件最多选一次；DP(i,c) 表示仅用前 i 件、容量不超过 c 的最大价值。",
      "claim": "按最后一件是否入选划分最优解，得到完整且互不遗漏的递推。",
      "steps": [
        "任一最优解要么不取第 i 件，价值至多 DP(i−1,c)；要么取它，余下物品来自前 i−1 件，容量为 c−wᵢ。",
        "若取入后的余下方案不是该子问题最优，可换成更优方案而保持可行，矛盾；故取入价值为 vᵢ+DP(i−1,c−wᵢ)。",
        "对可行两项取最大，基例 DP(0,c)=0；按物品数归纳得到全局最优值。",
        "压成一维时容量必须倒序，使读取的状态仍来自上一件之前；正序会重复使用当前物品。"
      ],
      "boundary": "O(nW) 是按容量数值计的伪多项式时间；不可把 0/1 转移改成读取同一行后还宣称每件只取一次。",
      "transfer": {
        "prompt": "只有一件重量 2、价值 3 的物品，容量为 4。0/1 背包的最优值是多少？",
        "options": [
          "3",
          "6",
          "4"
        ],
        "answer": 0,
        "explanation": "同一件物品只能取一次；得到 6 表明错误复用了当前物品。"
      }
    }
  },
  "dp-matrix-chain": {
    "title": "矩阵链乘法次序",
    "objective": "选择矩阵乘法括号化方式，使标量乘法次数最少。",
    "invariant": "区间最优值由最后一次切分位置 k 的左右最优子链与合并代价构成。",
    "complexity": "Θ(n³) 时间、Θ(n²) 空间。",
    "explanation": "矩阵乘法满足结合律，但不同括号化的中间维度导致代价不同；分割表可回溯出最优括号。",
    "transfer": "保留每个区间的最佳切分，可恢复最优括号结构。",
    "prediction": {
      "prompt": "括号化会改变最终矩阵吗？",
      "options": [
        "会改变结果",
        "不会改变结果，但代价会变化",
        "只改变矩阵维度"
      ],
      "answer": 1,
      "explanation": "结合律保证结果相同，计算顺序决定中间乘法成本。"
    },
    "theory": {
      "conditions": "矩阵 Aᵢ 的维度为 pᵢ₋₁×pᵢ，乘法顺序必须保持 A₁…Aₙ；目标为标量乘法次数，采用通常的乘法代价模型。",
      "claim": "枚举最后一次乘法的切分点，足以得到最优括号化。",
      "steps": [
        "任一合法括号化的最后一次乘法，都把连续区间 i…j 切成 i…k 和 k+1…j。",
        "若任一子链不是最优括号化，可替换它而不改变子链结果与尺寸，并降低总成本，矛盾。",
        "候选成本为 M(i,k)+M(k+1,j)+pᵢ₋₁pₖpⱼ，对所有 k 取最小；单矩阵成本为 0。",
        "按区间长度从短到长计算，并记录最优 k；递归读取切分表即可恢复方案。"
      ],
      "boundary": "结合律允许改括号，不允许交换矩阵次序。不同矩阵乘法实现的代价模型可能改变最优方案。",
      "transfer": {
        "prompt": "寻找更便宜的矩阵链计算方式时，允许任意重排 A、B、C 吗？",
        "options": [
          "不允许，只能在保持次序时改括号",
          "允许，矩阵乘法可交换",
          "仅当算法使用 DP 时允许"
        ],
        "answer": 0,
        "explanation": "一般 AB≠BA，DP 优化的是合法括号化而非矩阵排列。"
      }
    }
  },
  "dp-optimal-bst": {
    "title": "最优二叉搜索树",
    "objective": "依据成功查找概率 p 与失败查找概率 q，最小化期望查找代价。",
    "invariant": "区间根节点尝试所有候选键；左右子树期望代价加上区间总概率。",
    "complexity": "经典算法 Θ(n³) 时间、Θ(n²) 空间；概率按成功与失败查找定义且总和为 1。",
    "explanation": "高频键倾向靠近根，失败查找的空隙概率也参与成本。",
    "transfer": "访问频率不均时，平衡高度不一定等于最小期望访问成本。",
    "prediction": {
      "prompt": "失败查找概率 q 表示什么？",
      "options": [
        "查找落在键之间或边界空隙的概率",
        "键值排序概率",
        "树高"
      ],
      "answer": 0,
      "explanation": "n 个键有 n+1 个失败查找区间。"
    },
    "theory": {
      "conditions": "键有固定升序，成功概率 p 和失败间隙概率 q 非负且总和为 1；采用含失败叶的层数代价约定，空区间基例为相应 q。",
      "claim": "对每个区间枚举根并加入该区间概率总和，可求最小期望查找代价。",
      "steps": [
        "根选为 r 后，键序唯一决定左右区间；两侧独立保持 BST 次序。",
        "把左右子树接到根下面，子树中每个成功键和失败间隙的深度都增加 1，因此增加区间概率总和 W。",
        "若某侧不是对应区间的最优树，替换成更优子树不会改变另一侧及键序，却降低期望代价，矛盾。",
        "于是 E(i,j)=minᵣ[E(i,r)+E(r+1,j)+W(i,j)]（半开区间）；空区间 E(i,i)=qᵢ。按长度归纳并保存根即可重构。"
      ],
      "boundary": "最小高度不等于最小期望代价；只按最高访问频率或左右权重平衡构造的是启发式，不能自动获得 OBST 保证。",
      "transfer": {
        "prompt": "两棵 BST 高度相同，访问频率严重不均，期望查找代价一定相同吗？",
        "options": [
          "不一定，高频键的深度会改变代价",
          "一定，只由高度决定",
          "只取决于叶子数量"
        ],
        "answer": 0,
        "explanation": "目标是概率加权的访问深度，各个键与失败间隙的位置都重要。"
      }
    }
  },
  "dp-lcs": {
    "title": "最长公共子序列",
    "objective": "计算两个序列的最长公共子序列及其长度。",
    "invariant": "末尾字符相同则继承左上状态加一，否则取上方与左方较大值。",
    "complexity": "Θ(mn) 时间、Θ(mn) 空间。",
    "explanation": "子序列保持相对顺序但允许跳过元素。",
    "transfer": "相似序列比较、差异分析与版本控制都可用 LCS 思路。",
    "prediction": {
      "prompt": "子序列与子串的区别是什么？",
      "options": [
        "子序列可跳过元素但保序",
        "子序列必须连续",
        "子串可改变次序"
      ],
      "answer": 0,
      "explanation": "连续性是子串要求，子序列只要求相对顺序不变。"
    }
  },
  "dp-flowshop-exact": {
    "title": "两机流水车间精确子集 DP",
    "objective": "枚举作业子集状态，计算两台机器上的最优完工时间和顺序。",
    "invariant": "状态仅由已排作业集合决定；追加作业时机器一累计时间确定，机器二取前序完工与机器一完工的较大值再加工。",
    "complexity": "Θ(n2^n) 时间、Θ(2^n) 空间；适合小规模精确求解。",
    "explanation": "对每个子集尝试把任一未排作业追加到末尾，保存最优状态并回溯顺序。",
    "transfer": "作业数量较少、需要精确最优解时，子集 DP 可作为贪心或启发式的校验基准。",
    "prediction": {
      "prompt": "子集 DP 追加一个作业时，机器二何时开工？",
      "options": [
        "机器一完成该作业时",
        "机器一完工与机器二前序完工两者较晚时",
        "永远在时刻零"
      ],
      "answer": 1,
      "explanation": "机器二需等待该作业经过机器一，也需等待机器二空闲。"
    },
    "theory": {
      "conditions": "两台机器，所有作业先 M1 后 M2，两台采用同一作业顺序，加工时间非负；没有释放时间、换线时间等额外约束。",
      "claim": "对每个已排作业集合 S，只保存最小 M2 完工时间就足够，无需保存全部排列。",
      "steps": [
        "M1 完成集合 S 的时间 C1(S)=Σⱼ∈S aⱼ，与排列顺序无关。",
        "若将 j 接在 S 后，M2 的新完工时间为 max(C1(S)+aⱼ,C2(S))+bⱼ。",
        "这个转移关于 C2(S) 单调不减；同一 S 中较大的 C2 永远不会让任何未来续排更好，所以可丢弃。",
        "从空集 C2=0 开始，对所有子集和未排作业转移取最小；所有排列按其最后一件被完整枚举，保存前驱即可恢复最优顺序。"
      ],
      "boundary": "一般三机问题中，中间机器完工时间不再仅由集合确定；照搬单个标量状态可能丢失可用于未来更优续排的信息。",
      "transfer": {
        "prompt": "把两机算法直接改成三机，只保存每个集合最小的 M3 完工时间，是否已有正确性保证？",
        "options": [
          "没有，可能还需保留中间机器的非支配状态",
          "有，只需把 2 改为 3",
          "只要作业少就一定正确"
        ],
        "answer": 0,
        "explanation": "两机压缩依据是 M1 完工由集合唯一决定；三机通常需要同时考虑更多完工时间。"
      }
    }
  },
  "divide-matrix-multiply": {
    "title": "分块矩阵乘法基线",
    "objective": "把 4×4 矩阵划分为 2×2 小块，逐块累加 Cij += Aik×Bkj，并和独立朴素乘法校验。",
    "invariant": "每步只累加当前 A、B 子块乘积；处理完所有内维度块后，结果等于逐行逐列点积。",
    "complexity": "仍为 Θ(n³) 标量乘法；分块利用缓存局部性，本例 4×4 使用 64 次标量乘法。",
    "explanation": "每个 2×2 内积块复用邻近数据，减少数据搬运；分块不降低渐近算术复杂度。",
    "transfer": "对大矩阵选择适合缓存的块尺寸；先与朴素实现比对保证数值正确。",
    "prediction": {
      "prompt": "分块主要改善什么？",
      "options": [
        "渐近乘法次数",
        "缓存局部性与数据复用",
        "结果精度"
      ],
      "answer": 1,
      "explanation": "分块复用载入的数据改善局部性；仍执行 Θ(n³) 标量乘法。"
    }
  },
  "advanced-subset-sum": {
    "title": "子集和：逐项选择与剪枝",
    "objective": "从给定整数中选出总和恰好等于目标值的子集。",
    "invariant": "每个递归状态只包含已经处理过的物品；剩余物品能提供的最大总和是安全上界。",
    "complexity": "最坏时间 O(2^n)，空间 O(n)（递归深度）。",
    "explanation": "每个物品分成选与不选两支。当前总和超过目标，或剩余总和仍不够时，该分支不可能成功。",
    "transfer": "当权重非负时可用剩余总和剪枝；若包含负数，就不能直接使用该上界。",
    "prediction": {
      "prompt": "当前和超过目标时，哪种分支可以安全删除？",
      "options": [
        "该状态下的所有后续选择",
        "只删除不选下一项",
        "不能删除任何分支"
      ],
      "answer": 0,
      "explanation": "后续物品非负，加入它们只会继续增大总和。"
    }
  },
  "advanced-n-queens": {
    "title": "N 皇后：回溯约束",
    "objective": "每行放置一枚皇后，使任何两枚都不在同列或同对角线。",
    "invariant": "已放置的前 r 枚皇后始终互不攻击，且每行恰有一枚。",
    "complexity": "最坏时间 O(n!)，递归栈空间 O(n)。",
    "explanation": "按行试放候选列；遇到列冲突或对角线冲突立即拒绝，后续无须探索。",
    "transfer": "可将安全性检查改为列集合与对角线集合，以 O(1) 平均时间检查候选位置。",
    "prediction": {
      "prompt": "已放皇后在第 0 行第 1 列；第 1 行第 2 列安全吗？",
      "options": [
        "不安全：同一对角线",
        "安全：不同列",
        "不安全：同一列"
      ],
      "answer": 0,
      "explanation": "行差与列差都为 1，二者在同一对角线上。"
    }
  },
  "advanced-graph-coloring": {
    "title": "图着色：约束搜索",
    "objective": "为图中每个顶点分配颜色，使每条边的两个端点颜色不同。",
    "invariant": "每次递归只保留满足所有已检查边约束的部分着色。",
    "complexity": "朴素搜索最坏 O(k^V)，其中 V 为顶点数、k 为颜色数。",
    "explanation": "依次给顶点着色；若与已着色邻居同色，就拒绝该选择并尝试下一色。",
    "transfer": "先选度数较高的顶点，常能更早发现冲突，但不改变最坏复杂度。",
    "prediction": {
      "prompt": "新顶点与一个已着色邻居相连且同色，下一步应怎样？",
      "options": [
        "拒绝此色并试下一色",
        "保留颜色直到完成",
        "删除连接边"
      ],
      "answer": 0,
      "explanation": "合法解必须让每条边的端点异色。"
    }
  },
  "advanced-backtracking-tsp": {
    "title": "旅行商：枚举完整回路",
    "objective": "访问每座城市恰好一次并返回起点，找出成本最低的回路。",
    "invariant": "部分路径不重复城市；只有补上回到起点的边才形成完整候选回路。",
    "complexity": "固定起点后最坏 O((n−1)!) 时间。",
    "explanation": "回溯枚举每种城市次序，累计完整回路成本并保留最小值。",
    "transfer": "若加入有效下界，可在部分路径成本已不可能优于当前答案时剪枝。",
    "prediction": {
      "prompt": "已访问所有城市，如何计算完整回路成本？",
      "options": [
        "再加上末城返回起点的边",
        "只统计访问城市数",
        "忽略最后一条边"
      ],
      "answer": 0,
      "explanation": "闭合回路包含每条相邻边和最后返回起点的边。"
    }
  },
  "advanced-bb-knapsack": {
    "title": "背包：分数上界剪枝",
    "objective": "在容量限制内选物品，使总价值最大。",
    "invariant": "当前可行方案是下界；允许分割剩余物品所得的最优值是整数问题的乐观上界。",
    "complexity": "最坏仍为 O(2^n)；界限可减少实际展开节点。",
    "explanation": "若分数背包上界不超过当前可行解，就能证明该分支无法改进答案并剪除。",
    "transfer": "上界必须至少覆盖所有整数可行解；低估上界会错误剪掉最优解。",
    "prediction": {
      "prompt": "分数松弛上界为 18，当前可行值为 20，应如何处理？",
      "options": [
        "剪枝：该分支不可能胜过 20",
        "继续，因为上界低于当前解",
        "把 18 当成精确答案"
      ],
      "answer": 0,
      "explanation": "松弛上界已不高于已知可行值。"
    },
    "theory": {
      "conditions": "0/1 背包，重量正、价值非负；节点固定了部分取舍，当前最好值来自可行整件方案。上界必须是剩余问题的最优分数松弛，按密度求取。",
      "claim": "节点上界不超过当前最好可行值时，可以安全剪掉该节点及所有后代。",
      "steps": [
        "把剩余物品允许分数取入，扩大了原来的可行集合；分数松弛最优值不会小于任何整件补全的价值。",
        "因此 U=已取价值+剩余分数最优值是该节点所有后代价值的上界。",
        "当前最好值 L 来自实际可行方案，是全局最优值的下界。若 U≤L，该节点不可能产生更好方案。",
        "取/不取分支覆盖所有整件组合；所有未剪叶均检查可行性。队列穷尽后，无遗漏的改进方案，L 即最优。"
      ],
      "boundary": "普通贪心得到的可行整件价值是下界，不能拿它当上界剪枝。若要求列举所有并列最优解，U=L 的分支不能直接丢掉。",
      "transfer": {
        "prompt": "某节点分数上界为 18，当前可行最好值为 20，若只求一个最优解应怎样做？",
        "options": [
          "剪掉该节点",
          "必须继续，因为上界不是可行解",
          "把最优值改为 18"
        ],
        "answer": 0,
        "explanation": "所有后代至多 18，无法改进已有的 20；上界不必本身可行也能证明安全剪枝。"
      }
    }
  },
  "advanced-bb-tsp": {
    "title": "旅行商：分支限界",
    "objective": "通过部分路径下界和当前完整回路上界，减少需要检查的旅行商路线。",
    "invariant": "已完成回路始终提供可行上界；被剪枝的路径下界不小于该上界。",
    "complexity": "最坏 O((n−1)!)；界限只改善搜索量，不保证多项式时间。",
    "explanation": "按部分路径成本扩展候选，并用剩余出边的乐观估计排除不可能改进的路线。",
    "transfer": "更紧且仍安全的下界通常带来更多剪枝；任何过高估计都可能损害正确性。",
    "prediction": {
      "prompt": "部分路线的下界已等于已知完整路线成本，应怎样做？",
      "options": [
        "剪枝：它无法严格改进当前答案",
        "继续并将它当成更优路线",
        "删除当前完整路线"
      ],
      "answer": 0,
      "explanation": "等于现有上界不可能找到更低成本回路。"
    },
    "theory": {
      "conditions": "当前 TSP 样本边权非负，状态是一条不重复城市的部分路径；当前上界来自完整可行回路。",
      "claim": "最小化搜索中，任何合法的完成成本下界都可用于安全剪枝，队列顺序只影响效率。",
      "steps": [
        "每个完整回路对应一条排列分支；约束排除重复访问，最后补回起点的边。",
        "对当前非负权模型，已走成本加“末点最便宜的一条出边”不超过任意补全成本，因为每个补全必须再离开末点且其他边成本非负。",
        "若该下界 L≥当前可行回路成本 U，所有后代都不可能更优，故可剪枝。",
        "无论 FIFO、DFS 还是按界优先，只要剩余分支都被完整探索或由合法界排除，最终最好回路就是最优；预算耗尽不能做这个结论。"
      ],
      "boundary": "随便找一条可行补全的成本是上界，不是下界。含负边时“其余边成本非负”的论证失效，需要另造合法下界。",
      "transfer": {
        "prompt": "某分支找到一个成本 30 的可行补全，当前最好成本 20，能仅据此剪掉整个分支吗？",
        "options": [
          "不能，分支中可能还有成本低于 20 的补全",
          "能，30 已经大于 20",
          "能，只要队列按成本排序"
        ],
        "answer": 0,
        "explanation": "一个较差可行解只能给上界，不能排除同一分支存在更好的解。"
      }
    }
  },
  "advanced-bb-puzzle15": {
    "title": "滑块拼图：曼哈顿启发值",
    "objective": "用 A* 搜索滑块拼图，并观察可采纳启发值如何排序搜索状态。",
    "invariant": "曼哈顿距离不超过剩余最少移动数，因此 f=g+h 不会高估经该状态到目标的最优代价。",
    "complexity": "最坏指数级；搜索空间与启发值强相关。",
    "explanation": "A* 将状态放入按 f=g+h 排序的 open 集，维护最佳 g 值与 closed 集。曼哈顿距离可采纳，故目标以最低 f 出队时取得最优路径。",
    "transfer": "可采纳启发值支持最优性，但不代表搜索一定快速；忽略棋子相互阻挡仍保持下界。",
    "prediction": {
      "prompt": "一块棋子离目标横向 2 格、纵向 1 格，它对 h 的贡献是多少？",
      "options": [
        "3",
        "2",
        "1"
      ],
      "answer": 0,
      "explanation": "曼哈顿距离是两个坐标差绝对值之和。"
    }
  },
  "advanced-circuit-density": {
    "title": "电路板布线顺序与密度下界",
    "objective": "将小型网表转为块与网络的关联矩阵，排列板块以最小化顺序切口处同时跨越的网络数。",
    "invariant": "前缀与后缀之间的跨越网络数是当前切口密度；它不会改变已确定的更高峰值下界。",
    "complexity": "本例枚举 n! 种顺序；真实布线还包含几何与冲突约束。",
    "explanation": "每个网表行连接其所属板块。穷举顺序并按当前峰值作分支限界；示例刻画线性顺序的切口拥塞，不代表完整几何布线器。",
    "transfer": "实际布线需加入连接关系、通道可行性及拥塞模型；面积均摊本身不证明具体路由可行。",
    "prediction": {
      "prompt": "总面积 14，分到 4 条通道，整数峰值负载至少多少？",
      "options": [
        "4",
        "3.5",
        "14"
      ],
      "answer": 0,
      "explanation": "峰值至少为 ceil(14/4)=4。"
    }
  },
  "advanced-np-certificates": {
    "title": "NP 证书：验证团的例子",
    "objective": "用 3-SAT 到 CLIQUE 的多项式归约示例，检查团证书，并区分 P、NP 与 NP-hard。",
    "invariant": "构造图后，满足各子句的文字选择恰对应跨子句的兼容团；团证书逐对检查连边，需 O(k²) 次检查。",
    "complexity": "本例构图与证书检查均为多项式规模；一般 CLIQUE 搜索仍可能指数时间。NP-hard 表示所有 NP 问题可多项式归约到它，不表示它不属于 NP。",
    "explanation": "一般 m 子句 3-SAT 规约：每个文字出现建一个顶点，只在不同子句且不互补时连边。满足赋值可从每个子句选真文字，得到大小 m 的团；反之 m 团必在每个子句取一个互不矛盾的文字，扩展赋值满足公式。构图规模至多 3m 个顶点、O(m²) 条边，规约为多项式规模。若 CLIQUE 属于 NP 且 NP-hard，它就是 NP-complete。当前画面只演示两子句实例。",
    "transfer": "P 是多项式时间可判定语言类，NP 是 YES 证书可多项式验证的语言类。NP-hard 表示所有 NP 语言可多项式规约到它；NP-complete 同时属于 NP 且 NP-hard。",
    "prediction": {
      "prompt": "含 k 个顶点的团证书需核对多少对？",
      "options": [
        "k(k−1)/2",
        "k 次",
        "2^k 次"
      ],
      "answer": 0,
      "explanation": "每一对不同顶点都必须验证连边。"
    },
    "theory": {
      "conditions": "使用已知 3-SAT 是 NP 完全问题作为起点；输入有 m 个三文字子句。CLIQUE 判定问是否存在大小至少 m 的团。",
      "claim": "3-SAT 可多项式归约到 CLIQUE；CLIQUE 又有多项式可验证证书，因此是 NP 完全的。",
      "steps": [
        "每个文字出现建立一个顶点；只在不同子句且文字不互补的两个顶点间连边。共有 3m 个顶点，至多 O(m²) 个候选边；连同文字编码处理，构造时间对输入长度为多项式。",
        "若公式可满足，每个子句选一个真文字。它们来自不同子句且不互补，形成大小 m 的团。",
        "若有大小 m 的团，同一子句内不连边，所以恰从每个子句取一个；团内文字互不矛盾，可同时设真并扩展为满足赋值。",
        "CLIQUE 证书列出 k 个互异合法顶点，检查每对连边即可，多项式时间验证其属于 NP。",
        "从已知 NP 完全问题归约证明 NP-hard；再结合 NP 成员性得到 NP-complete。两个画面实例只是一般构造的演示。"
      ],
      "boundary": "归约方向不能反：A→B 表示 B 至少能解决 A 的难度。NP-hard 不要求本身属于 NP；也不能从未知多项式算法推出已证明 P≠NP。",
      "transfer": {
        "prompt": "若已经证明 A 是 NP 完全，要证明新判定问题 B 是 NP 完全，还需要哪组证据？",
        "options": [
          "A 可多项式归约到 B，且 B 属于 NP",
          "B 可归约到 A 就足够",
          "B 的某个实例搜索很慢"
        ],
        "answer": 0,
        "explanation": "正确方向给出 B 的 NP-hard 性，再加多项式证书验证得到 NP-complete。"
      }
    }
  },
  "advanced-randomized": {
    "title": "随机化排序：随机化枢轴",
    "objective": "用固定种子的 Fisher–Yates 洗牌展示 Sherwood 随机化：精确结果不变，期望工作量受随机选择影响。",
    "invariant": "洗牌只重排输入多重集；排序结果仍包含完全相同的元素。",
    "complexity": "随机化快速排序期望 O(n log n)，最坏 O(n²)；本轨迹用内置排序展示洗牌状态。",
    "explanation": "固定种子驱动真实递归随机枢轴快速排序。随机输入点给出 Monte Carlo π 估计。Las Vegas Quickselect 结果精确而耗时随机；Miller–Rabin 多轮错误上界为 4^-t。",
    "transfer": "随机种子便于复现；随机化改变运行过程，不会自动把最坏情况界改为期望界。",
    "prediction": {
      "prompt": "Las Vegas 算法的随机性影响什么？",
      "options": [
        "运行时间，答案仍精确",
        "答案正确率，运行时间固定",
        "输入规模"
      ],
      "answer": 0,
      "explanation": "Las Vegas 方法保证答案正确，随机性体现在耗时。"
    },
    "theory": {
      "conditions": "关键字互异；期望分析使用每次独立、均匀选枢轴的模型。实际固定伪随机种子便于重放，不是随机性独立性的数学证明。",
      "claim": "随机枢轴快排对每次枢轴选择都输出正确排序；期望比较工作 O(n log n)，但最坏仍 O(n²)。",
      "steps": [
        "无论选哪个枢轴，真实分区都保持多重集合并把小/等/大三组分开；递归排序严格两侧后连接即可正确。",
        "将有序键编号 i<j。它们仅在区间 i…j 中最先被选为枢轴的是端点之一时相互比较，概率为 2/(j−i+1)。",
        "以指示变量求和，期望比较次数为 Σ(i<j)2/(j−i+1)=O(n log n)，线性期望允许逐对相加。",
        "若随机路径连续选到极端枢轴，规模仍可能 n,n−1,…，总工作为 O(n²)；期望界并未消除这条路径。"
      ],
      "boundary": "Sherwood 强调随机化削弱坏输入影响；同一排序也可具有 Las Vegas 的答案始终正确特征，两种描述不必互斥。",
      "transfer": {
        "prompt": "固定种子的一次快排用了很多比较，是否反驳了随机快排的期望 O(n log n)？",
        "options": [
          "没有，期望允许少数慢路径",
          "反驳了，所有运行都必须快",
          "说明排序答案一定错误"
        ],
        "answer": 0,
        "explanation": "期望是对随机选择分布的平均；最坏路径仍可为二次工作量。"
      }
    }
  },
  "advanced-simplex": {
    "title": "单纯形法：表格枢轴",
    "objective": "在小型线性规划表格中通过入基列、比值检验和枢轴更新移动基可行解。",
    "invariant": "每个表格表示同一组线性等式；枢轴保持基可行性。有限最优值存在时，可在极点基本可行解达到；非负检验数给出最优性证书。",
    "complexity": "最坏时间指数级；实际表现常较好，不能据此宣称多项式最坏界。",
    "explanation": "完整表格含松弛变量列。Bland 规则选首个负检验数入基；最小非负 rhs/系数比值决定离基变量。若比值并列，按基变量索引选择可避免循环。",
    "transfer": "每个表格数值由行变换产生；无界与退化情形需要额外规则处理。",
    "prediction": {
      "prompt": "某列正系数对应比值为 4 和 2，哪行离基？",
      "options": [
        "比值 2 的行",
        "比值 4 的行",
        "随便一行"
      ],
      "answer": 0,
      "explanation": "最小非负比值防止枢轴后违反可行性。"
    },
    "theory": {
      "conditions": "最大化问题已写成标准非负形式，已知一个基可行解；当前表格采用“目标行负检验数可改善”的符号约定。",
      "claim": "单纯形的比值检验维持可行性；目标行已无负检验数时，当前基解最优。",
      "steps": [
        "选目标行负检验数的非基本变量入基。增加它时，各基本变量按该列系数变化。",
        "只有正系数行限制增量；取最小非负 rhs/系数，保证所有基本变量仍非负，并让至少一个达到 0 以便换基。",
        "枢轴行变换保持等式系统等价；非退化改善步提高目标值，退化步可只换基而目标不变。",
        "在该表号约定下，目标可写为 z=z₀−Σ检验数ⱼxⱼ。若所有非基本检验数≥0且 xⱼ≥0，任何可行解的 z≤z₀，因此基解最优。",
        "若有改善列而没有正约束系数，变量可沿该方向无限增加且保持可行，目标无界。"
      ],
      "boundary": "这些判据以原始可行基为前提；没有初始可行基时要用 Phase I 或别的方法，不能把“找不到离基行”一概叫不可行。",
      "transfer": {
        "prompt": "已知当前基可行，改善列在所有约束行的系数都≤0，应判断什么？",
        "options": [
          "目标无界",
          "约束不可行",
          "已经最优"
        ],
        "answer": 0,
        "explanation": "没有正系数行限制改善方向，沿该方向可无限提高目标。"
      }
    }
  },
  "advanced-bb-shortest-path": {
    "title": "最短路：FIFO 与 LC 队列",
    "objective": "对带正权小图比较先进先出与最低成本优先的节点扩展顺序。",
    "invariant": "LC 队列按暂定路径成本弹出节点；正权边下首次弹出目标时其成本最优。",
    "complexity": "LC 标签设定对应 Dijkstra 风格搜索；最坏时间依实现为 O((V+E) log V)。",
    "explanation": "FIFO 依到达顺序扩展并可能多次改进标签；LC 按当前最小路径界扩展，在目标弹出时可终止。",
    "transfer": "仅在边权非负时成立；负权图不能直接套用该提前终止论证。",
    "prediction": {
      "prompt": "LC 队列中目标成本为 7，但队首还有成本 4 的节点，能否立即结束？",
      "options": [
        "不能，先扩展成本 4 的节点",
        "能，目标已在队列中",
        "只看节点编号"
      ],
      "answer": 0,
      "explanation": "较低路径成本的节点可能继续改进目标的暂定距离。"
    }
  },
  "advanced-randomized-evidence": {
    "title": "随机化：π 估计、素性检验与选择",
    "objective": "观察固定种子下的 Monte Carlo π 估计、Miller–Rabin 见证检验，以及结果精确但运行时间随机的 Las Vegas 选择。",
    "invariant": "π 估计由样本比例计算；Miller–Rabin 的见证可证明合数，单轮通过只说明可能为素数；选择算法最终返回输入的精确第 k 小元素。",
    "complexity": "π 估计使用固定样本数；Miller–Rabin t 轮合数误判概率至多 4^-t；Quickselect 期望 O(n)，最坏 O(n²)。",
    "explanation": "四分之一圆内随机点比例乘 4 得到 π 的估计。Miller–Rabin 对 n−1=2^s d 检查模幂序列。Las Vegas Quickselect 随机选枢轴并缩小候选区间，答案始终精确。",
    "transfer": "增加独立随机样本通常改善估计；增加独立 Miller–Rabin 随机底数降低误判上界；改变 Quickselect 的随机种子会改变耗时路径而不改变目标秩。",
    "prediction": {
      "prompt": "Miller–Rabin 某一底数通过，能否证明 n 是素数？",
      "options": [
        "不能，只能判为可能素数",
        "能，单轮即为证明",
        "说明 n 一定是合数"
      ],
      "answer": 0,
      "explanation": "奇合数可能通过某些底数；独立随机轮次给出可控误判概率。"
    },
    "theory": {
      "conditions": "Las Vegas 保证返回答案正确但耗时随机；Monte Carlo 在指定预算下可能出错。数值估计另需说明抽样分布；Miller–Rabin 的 4^−t 界要求独立均匀随机底数和奇合数输入。",
      "claim": "随机时间、数值误差和判定错误率是不同概念，重复同一个固定底数不能产生独立重复的错误界。",
      "steps": [
        "Quickselect 的分区不变式保证每次合法枢轴路径都返回精确秩；随机性改变运行工作量，而非正确率。",
        "理想连续模型中，独立均匀采样单位方形，落在四分之一圆的概率为 π/4，故 4×样本命中比例是 π 的无偏估计；有限网格样本还含离散化偏差。",
        "Miller–Rabin 的见证能证明合数；通过某底数只表示该底数未揭示合数。奇合数的强伪素数底数比例至多 1/4。",
        "独立随机选 t 个底数时，误判合数为可能素数的概率至多 (1/4)^t；素数对合法底数都通过，因此是单侧错误。",
        "当前固定 a=2 的小实例只演示模幂检查过程，不是 t 轮独立随机实验。"
      ],
      "boundary": "更多样本不会让单次估计变成精确常数；同一底数重复一百遍也不会得到 4^−100 的新保证。",
      "transfer": {
        "prompt": "把同一固定底数的 Miller–Rabin 检验重复 10 次，能声称错误概率≤4^−10吗？",
        "options": [
          "不能，重复结果不独立",
          "能，运行次数够了",
          "只有底数是 2 时能"
        ],
        "answer": 0,
        "explanation": "乘法错误界依赖独立随机底数；相同底数只重复相同证据。"
      }
    }
  },
  "advanced-backtracking-knapsack": {
    "title": "背包：纯回溯 DFS",
    "objective": "逐件尝试选入或跳过物品，只用容量约束剪除不可行分支。",
    "invariant": "递归深度 i 表示前 i 件物品已决定；保留的部分选择始终不超容量。",
    "complexity": "最坏时间 O(2^n)，递归空间 O(n)；本例不使用分数松弛上界。",
    "explanation": "树形搜索遍历 include/exclude 两支，超重时停止该支。叶子只更新可行解；它与动态规划表格和分支限界上界剪枝是不同的搜索形式。",
    "transfer": "若每件物品有非负价值，容量剪枝保证可行性；额外引入乐观价值界才能增加分支限界剪枝。",
    "prediction": {
      "prompt": "当前重量已超过容量，之后还能通过跳过物品恢复可行吗？",
      "options": [
        "不能，已选重量不会减少",
        "可以，跳过下一件会减重",
        "只看当前价值"
      ],
      "answer": 0,
      "explanation": "DFS 分支中的已选重量只会保持或增加。"
    }
  },
  "advanced-turing-language": {
    "title": "图灵机：判定语言成员",
    "objective": "逐步执行确定性图灵机，判断输入是否属于语言 L={01}。",
    "invariant": "每一步只按当前状态和读到的符号应用唯一转移，更新控制状态、磁带与读写头。",
    "complexity": "本示例输入仅两格；一般图灵机的运行时间取决于输入长度与转移过程。",
    "explanation": "计算理论把字符串集合称为语言；机器判定字符串是否属于该集合。优化问题另有目标函数，不能与语言成员判定混为一谈。",
    "transfer": "P 是可多项式时间判定的语言类；NP 是 YES 证书可多项式时间验证的语言类。图灵机为这些计算定义提供形式模型。",
    "prediction": {
      "prompt": "状态 q1 读到 0，而唯一接受转移要求读到 1，应怎样判定？",
      "options": [
        "拒绝该输入",
        "改写 0 为 1",
        "接受后继续"
      ],
      "answer": 0,
      "explanation": "确定性机没有适用的转移，进入拒绝状态。"
    },
    "theory": {
      "conditions": "语言是有限字母表上的字符串集合；计算资源以输入编码长度计。判定机必须对每个输入停机并回答属于或不属于。",
      "claim": "P 与 NP 是判定语言的复杂性类别；NP 中的“可验证”不等同已知能快速找到证书。",
      "steps": [
        "确定性图灵机按当前状态和读到的符号选择唯一转移，可修改符号、移动读写头并改变状态；本任务的有限语言展示此模型。",
        "P：存在确定性算法，对所有输入都在某个多项式步数内正确判定语言成员。",
        "NP：存在多项式长度的 YES 证书和多项式时间验证器；属于语言当且仅当存在一个会被接受的证书。",
        "P⊆NP，因为可以忽略证书直接运行多项式判定算法；是否 P=NP 仍未解决。",
        "优化问题需先说明判定版本，例如“是否存在成本≤B的回路”，才能直接放进 P/NP 语言分类。"
      ],
      "boundary": "某个 YES 证书容易验证，不表示任意猜测都正确，也不表示 NO 实例有同样形式的短证书。NP 不是“非多项式”的缩写。",
      "transfer": {
        "prompt": "验证给定回路是否成本≤B很快，能直接推出找到这种回路也有多项式算法吗？",
        "options": [
          "不能，验证与寻找是不同任务",
          "能，验证器会自动给出回路",
          "能，只要采用图灵机"
        ],
        "answer": 0,
        "explanation": "验证器检查已提供的候选，寻找候选可能需要额外搜索；不能据此解决 P 与 NP 的关系。"
      }
    }
  },
  "advanced-lp-standard": {
    "title": "线性规划：转为标准型",
    "objective": "把自由变量与不同方向的不等式改写成非负变量及等式约束。",
    "invariant": "转换保留可行性与目标值：原解可提升为标准变量，新解可投影回原变量；自由变量拆分可能不唯一。",
    "complexity": "本例展示等价建模与一个可行见证，不主张求解复杂度。",
    "explanation": "令自由变量 x=x⁺−x⁻，且 x⁺,x⁻≥0；≤ 约束加松弛变量，≥ 约束减去剩余变量。每个新变量非负，约束成为等式。",
    "transfer": "有限最优值的线性规划存在极点最优解；单纯形法沿基可行解移动。转为等式并不自动解决不可行或无界问题。",
    "prediction": {
      "prompt": "将 x−y≥1 改写为等式时应怎样处理？",
      "options": [
        "减去非负剩余变量 s",
        "加非负松弛变量 s",
        "删除约束"
      ],
      "answer": 0,
      "explanation": "x−y−s=1 且 s≥0 表示原值可高于下界。"
    },
    "theory": {
      "conditions": "目标和约束均线性；标准形式采用 Ax=b、x≥0。自由变量、≤/≥约束需转换，并同步转换目标系数。",
      "claim": "标准型转换保持可行性及目标值，但自由变量的正负拆分通常不是一一对应。",
      "steps": [
        "自由变量 u 改写为 u⁺−u⁻，u⁺,u⁻≥0，目标中 cᵤu 同时改写为 cᵤu⁺−cᵤu⁻。",
        "≤约束加入非负松弛变量，≥约束减去非负剩余变量，使其成为等式。",
        "原可行解可选取一组非负新变量提升到标准型；标准型可行解投影 u=u⁺−u⁻ 后满足原约束，目标值相同。",
        "同一个 u 可以有多种拆分，例如 2=3−1=5−3；等价性不要求表示唯一。",
        "标准非负可行域中，若有限最优值存在，则存在最优基可行解：从最优解消去正支撑上的线性相关方向，保持约束与目标直到支撑独立，得到极点。"
      ],
      "boundary": "一般含整条直线的可行域未必有极点；例如对自由实数 u 最小化 0，最优值有限却没有极点。极点结论必须说明标准非负域等条件。",
      "transfer": {
        "prompt": "u=2 的两组拆分 (u⁺,u⁻)=(3,1) 与 (5,3) 都合法，是否破坏转换等价性？",
        "options": [
          "不破坏，投影与目标相同即可",
          "破坏，必须一一对应",
          "只有第一组可以"
        ],
        "answer": 0,
        "explanation": "转换保证可行性和目标保持，不要求每个原解只有一个新变量表示。"
      }
    }
  },
  "advanced-lp-degeneracy": {
    "title": "单纯形：退化与状态判别",
    "objective": "观察零值基变量导致的退化基本可行解，并区分最优、无界与不可行。",
    "invariant": "每次合法枢轴保持约束等式与基可行性；退化时目标值可能不变而基发生变化。",
    "complexity": "Bland 规则避免单纯形循环；本示例仅展示退化枢轴与无界方向，不实现通用两阶段 Phase I。",
    "explanation": "比值并列时 Bland 规则按变量索引选离基变量，可避免循环。无界表示改善方向没有离基约束；不可行表示不存在可行点，通常需 Phase I 人工变量检验。本例不演示不可行求解。",
    "transfer": "若有限最优值存在，线性规划可在极点最优解处达到；非负检验数表示当前基最优。无正离基系数而仍有改善检验数表示无界。",
    "prediction": {
      "prompt": "改善列在所有约束行中的系数均非正，单纯形应判为何种状态？",
      "options": [
        "无界",
        "不可行",
        "最优"
      ],
      "answer": 0,
      "explanation": "变量可以沿改善方向无限增长，没有约束行能限制步长。"
    },
    "theory": {
      "conditions": "可行标准型单纯形，精确比较，固定变量索引；Bland 规则同时约束入基及最小比值并列时的离基选择。",
      "claim": "退化会使换基不改进目标；完整 Bland 规则防循环，但不提供多项式最坏时间保证。",
      "steps": [
        "某基本变量为 0 就是退化基可行解；合法换基可能步长为 0，几何点与目标值不动但基发生变化。",
        "因此只靠“目标不下降”不能排除重复基；任意并列选择可能产生循环。",
        "Bland 选最小索引的合格入基变量；最小比值并列时，选对应基本变量索引最小者离基，而不是最上面的行。",
        "Bland 反循环定理以循环中反复换基的最大索引变量作反证，推出先前本应选择更小索引的候选，与规则矛盾。因此不会重复基，有限个基保证终止。",
        "可能的基数量随维度组合增长；不重复基不等于只访问多项式个基，单纯形最坏仍可指数。"
      ],
      "boundary": "只实现“最小索引入基”而让离基随意打破并列，不能声称已完整应用 Bland；浮点误差还需单独数值处理。",
      "transfer": {
        "prompt": "最小比值并列，两行当前基本变量分别是 x5 和 x2，Bland 应让谁离基？",
        "options": [
          "x2，即使它排在后面一行",
          "x5，因为它在第一行",
          "任意一个都保证不循环"
        ],
        "answer": 0,
        "explanation": "并列按基本变量索引选择，不按表格行位置选择。"
      }
    }
  },
  "advanced-circuit-grid": {
    "title": "电路布线：障碍网格最短路径",
    "objective": "在障碍网格上连接源点与目标点，使单位步长的布线长度最短。",
    "invariant": "FIFO BFS 首次发现格点时得到其最少步数；曼哈顿距离不超过剩余可行步数，能作为 DFS 分支限界的安全下界。",
    "complexity": "网格 BFS 为 O(V+E)；简单路径 DFS 最坏指数级，本例使用已知可行上界与曼哈顿下界剪枝。",
    "explanation": "每条线段只能连上下左右相邻且未阻塞格。先由 BFS 得到可行最短路线，再用 DFS 分支限界验证不存在更短的简单路径。",
    "transfer": "若线路步长不同，BFS 不再适用，应使用非负权最短路算法；几何布线还需考虑线宽、转弯代价与网络冲突。",
    "prediction": {
      "prompt": "网格每步代价相同，第一次发现一个格点时它的距离是什么？",
      "options": [
        "最少步数",
        "最多步数",
        "尚不能确定"
      ],
      "answer": 0,
      "explanation": "FIFO BFS 按层扩展，较短路径总会先到达。"
    }
  },
  "approx-set-cover-greedy": {
    "title": "贪心集合覆盖（Greedy Set Cover）",
    "objective": "反复选择当前能覆盖最多未覆盖元素的集合，直到覆盖全集。",
    "invariant": "每个选中的集合至少带来一个此前未覆盖的元素；已覆盖元素不会重新变为未覆盖。",
    "complexity": "当前轨迹每轮重新计算所有集合得分、对 m 个集合排序并重建全部可视分组；若共选出 R 个集合、集合成员总数为 L，时间为 O(R(L + m log m))。集合代价相同时，返回集合数 |G| ≤ H(d)·OPT，其中 d 是最大集合大小。",
    "explanation": "收费论证：考察一个最优解中的集合。若某轮它还有 k 个元素未覆盖，贪心选出的集合至少覆盖 k 个未覆盖元素，因此该轮每个新覆盖元素的费用至多为 1/k。把每轮中新覆盖的该最优集合元素分别计费，按剩余元素数 k 递减求和，费用至多为 1 + 1/2 + … + 1/d = H(d)。对最优解中的 OPT 个集合求和，得到总集合数至多 H(d)·OPT。",
    "transfer": "面对一组网络需求，比较每种可用升级每单位代价能新增满足多少项需求。",
    "prediction": {
      "prompt": "下一步应该选择哪个集合？",
      "options": [
        "当前能覆盖最多未覆盖元素的集合",
        "元素总数最多的集合"
      ],
      "answer": 0,
      "explanation": "已经覆盖的元素不能帮助完成剩余覆盖目标。"
    },
    "theory": {
      "conditions": "无权集合覆盖，有限宇宙 U 可被给定集合覆盖；每个集合代价为 1，每轮选覆盖最多当前未覆盖元素的集合。",
      "claim": "贪心集合数至多 H(d)·OPT≤H(|U|)·OPT，d 是最大集合大小，H(d)=1+1/2+…+1/d。",
      "steps": [
        "若本轮新覆盖 k 个元素，将选集合的代价 1 均摊，每个新元素收费 1/k；总收费恰等于所选集合数。",
        "固定任一最优集合 S。当 S 中尚有 r 个元素未覆盖时，贪心本可选择 S，所以实际选择至少新覆盖 r 个元素。",
        "此时 S 中被首次覆盖的每个元素收费不超过 1/r；按覆盖顺序相加，该集合所有元素总收费至多 H(|S|)≤H(d)。",
        "最优解的 OPT 个集合覆盖全体元素，把它们的收费相加至少涵盖每个元素一次，因此总收费≤H(d)·OPT。"
      ],
      "boundary": "有权集合要按新覆盖元素数/费用选择并调整收费证明；单看覆盖最多可能失效。不可覆盖实例必须报告不可行。",
      "transfer": {
        "prompt": "改成有权覆盖：方案甲新覆盖 5 个、费用 10，方案乙新覆盖 3 个、费用 3，应按单位费用规则优先谁？",
        "options": [
          "乙，单位费用新覆盖更多",
          "甲，覆盖数量更大",
          "两者必然等价"
        ],
        "answer": 0,
        "explanation": "甲为 0.5 个/费用，乙为 1 个/费用；有权模型必须考虑费用。"
      }
    }
  },
  "approx-subset-sum-fptas": {
    "title": "子集和全多项式近似方案（Subset Sum FPTAS）",
    "objective": "在总和不超过目标值的前提下，找出尽可能接近最大可行总和的子集。",
    "invariant": "排序并裁剪后的列表，为每个被裁掉的可达总和保留一个误差受乘法因子约束的代表值。",
    "complexity": "设裁剪列表的最大长度为 L；当前实现每轮排序，时间为 O(nL log L)，列表空间为 O(L)。裁剪规则使 L 关于 n、1/ε 和目标值的位数保持多项式规模。若 0 < ε ≤ 1，返回总和至少为 (1−ε)·OPT。",
    "explanation": "每处理一个元素，若裁掉的较大总和与保留的较小代表值相差不超过因子 1+δ，其中 δ=ε/(2n)，则最优总和经过 n 轮后仍有代表值至少为 OPT/(1+δ)^n ≥ e^(−ε/2)·OPT ≥ (1−ε)·OPT。大于目标值的总和会直接移除，因此最终答案仍可行。",
    "transfer": "当精确枚举子集过于昂贵时，用近似方法规划电池充电量或仓储装载量。",
    "prediction": {
      "prompt": "裁掉一个相近的较大总和，换来了什么？",
      "options": [
        "牺牲少量可达数值，控制状态列表长度",
        "破坏所有保留总和的可行性"
      ],
      "answer": 0,
      "explanation": "仅移除超过目标值的状态；留下的代表值仍不超过目标。"
    },
    "theory": {
      "conditions": "正整数 aᵢ、目标 t>0，求不超过 t 的最大子集和；0<ε<1，δ=ε/(2n)。保留 0，其余列表按升序做乘法裁剪。",
      "claim": "裁剪列表仍包含某个可行值至少为 (1−ε)OPT，且列表长度对输入位长和 1/ε 为多项式。",
      "steps": [
        "精确更新把旧列表与“旧列表加 aᵢ”合并；所有保留值都是真实可达和，删除大于 t 的值不影响任何未来合法正数补全。",
        "裁剪只在已有较小代表 y≤x≤(1+δ)y 时丢弃 x，因此一次裁剪损失至多因子 1+δ。",
        "按物品数归纳：对任一可达目标值 x，存在保留代表 y 满足 x/(1+δ)^i≤y≤x；加同一正数不会扩大已有相对损失。",
        "处理 n 件后得到值≥OPT/(1+δ)^n。因 (1+ε/(2n))^n≤e^(ε/2)≤1/(1−ε)，得到≥(1−ε)OPT。",
        "相邻正保留值相差超过 1+δ；从 1 到 t 只能容纳 O(log t/δ) 项，故算法对 n、1/ε 和数值编码位长是多项式。"
      ],
      "boundary": "若允许负数，超过 t 的中间和以后可能降回合法范围，上述删除规则不安全；不能不改算法就扩展输入域。",
      "transfer": {
        "prompt": "把负数也允许加入后，能继续安全删除所有大于 t 的中间和吗？",
        "options": [
          "不能，后续负数可能把它降回 t 以下",
          "能，目标始终是 t",
          "只要多采样几次就能"
        ],
        "answer": 0,
        "explanation": "正数前提保证和只增不减；有负数时提前删除会漏掉可行甚至最优子集。"
      }
    }
  },
  "approx-vertex-cover-matching": {
    "title": "用极大匹配近似顶点覆盖（Vertex Cover by Maximal Matching）",
    "objective": "从尚未覆盖的边中选取一条边，并把它的两个端点加入顶点覆盖。",
    "invariant": "选中的匹配边两两不共用端点；每条被移出待处理列表的边都至少接触一个已选端点。",
    "complexity": "当前轨迹反复筛选、拼接边数组并重绘图结构，最坏时间为 O(E²+VE)。教科书中的 O(V+E) 界需要高效的邻接表与边处理结构。返回覆盖大小至多为 2·OPT。",
    "explanation": "每选中一条边，就删除所有接触这两个端点的边，所以后续匹配边不会共用端点。任何顶点覆盖都必须为每条互不相交的匹配边选择一个端点，因此 OPT ≥ |M|；算法选择每条匹配边的两个端点，故 |C|=2|M| ≤ 2·OPT。",
    "transfer": "为每条尚未看护的连接在两端都部署监测点，然后跳过已被看护的连接。",
    "prediction": {
      "prompt": "为什么两倍匹配边数能界定 OPT？",
      "options": [
        "每条互不相交的匹配边都迫使 OPT 选一个端点",
        "每个图都有完美匹配"
      ],
      "answer": 0,
      "explanation": "匹配边互不共用端点，因此每条边都需要一个不同的覆盖顶点；OPT 至少为 |M|。"
    }
  },
  "approx-metric-tsp-mst": {
    "title": "度量旅行商问题：最小生成树先序近似（Metric TSP: MST Preorder）",
    "objective": "先构造最小生成树，再按树的先序遍历生成一条短巡回路线。",
    "invariant": "生成树连接所有城市；在满足三角不等式时，跳过重复城市不会增加路线长度。",
    "complexity": "此处的稠密图实现用时 O(V²)；对于对称度量距离，巡回路线长度至多为 2·OPT。",
    "explanation": "图中使用欧氏距离，因此距离对称且满足三角不等式。把最小生成树的边走两遍，可得到长度为 2·MST 的闭合路线；先序巡回通过三角不等式跳过重复城市，不会增加长度。又因为 MST ≤ OPT，最终路线长度至多为 2·OPT。",
    "transfer": "当旅行费用矩阵对称且直达距离满足三角不等式时，可用此法快速构造近似路线。",
    "prediction": {
      "prompt": "跳过中间城市时，哪项条件保证路程不会变长？",
      "options": [
        "三角不等式",
        "所有边权相同"
      ],
      "answer": 0,
      "explanation": "只有满足三角不等式，直接边的代价才不会超过被替换路径的代价。"
    }
  },
  "approx-knapsack-fptas": {
    "title": "0/1 背包全多项式近似方案（Knapsack FPTAS）",
    "objective": "在容量限制内选择完整物品，并使总利润接近最优值。",
    "invariant": "对每个缩放利润，动态规划保存已处理物品中达到该利润所需的最小重量。",
    "complexity": "令 K=εPmax/n，缩放利润总范围 P′ ≤ n²/ε；当前实现时间为 O(nP′)=O(n³/ε)，DP 空间为 O(P′)=O(n²/ε)。若每件物品单独可装入且 0 < ε ≤ 1，利润至少为 (1−ε)·OPT。",
    "explanation": "对每件可行物品令 qᵢ=floor(pᵢ/K)，则 Kqᵢ ≤ pᵢ < K(qᵢ+1)。最优解最多包含 n 件物品，缩放损失小于 nK=εPmax ≤ εOPT；最后一个不等式成立，是因为最利润最高的可行单件物品本身就是一个可行解。DP 找到的可行组合缩放利润不低于最优组合，因此实际利润至少为 (1−ε)·OPT。",
    "transfer": "当按容量建立精确动态规划的状态过多，而利润允许受控近似时使用。",
    "prediction": {
      "prompt": "为什么处理每件物品时要从高利润状态向低利润状态更新？",
      "options": [
        "避免在同一轮重复使用这件物品",
        "按重量对物品排序"
      ],
      "answer": 0,
      "explanation": "若从低到高更新，新生成的状态可能在本轮再次被读取，导致同一件物品被重复使用。"
    },
    "theory": {
      "conditions": "0/1 背包，重量正、利润非负；先移除重量超过容量的单件物品。Pmax 为剩余最大利润，0<ε<1；Pmax=0 时直接返回 0。",
      "claim": "令 K=εPmax/n、p′ᵢ=⌊pᵢ/K⌋，精确求缩放利润问题可获得价值至少 (1−ε)OPT 的容量可行方案。",
      "steps": [
        "对每个缩放利润，DP 保存实现它的最小重量；倒序更新防止同件物品重复使用，最终选择容量内最大缩放利润。",
        "设 S* 是原最优方案、S 是缩放问题最优方案，则 ΣS p′≥ΣS* p′。",
        "每件向下取整损失小于 K，所以 p(S)≥KΣS p′≥KΣS* p′≥OPT−nK。",
        "Pmax 来自一件可行物品，因此 Pmax≤OPT；nK=εPmax≤εOPT，故 p(S)≥(1−ε)OPT。",
        "每件缩放利润≤n/ε，总范围 O(n²/ε)，按利润建表避开了容量数值 W 带来的伪多项式依赖。"
      ],
      "boundary": "Pmax 若包含根本装不下的物品，Pmax≤OPT 这一步就会失效；必须先筛掉不可行单件。",
      "transfer": {
        "prompt": "一件利润极高但重量超过容量的物品，应该参与 Pmax 的缩放基准吗？",
        "options": [
          "不应该，先移除它",
          "应该，利润越高越准确",
          "只要 ε 很小就应该"
        ],
        "answer": 0,
        "explanation": "证明需要 Pmax 是一个可行单件方案的价值，才能保证它不超过 OPT。"
      }
    }
  },
  "heuristic-tabu-search": {
    "title": "禁忌搜索（Tabu Search）",
    "objective": "探索邻近状态，同时保留搜索过程中找到的最佳状态。",
    "invariant": "即使当前状态接受较差移动，历史最佳分数也不会变差；每一步都排除禁忌状态。",
    "complexity": "本例有界轨迹的时间为 O(迭代次数 × 邻域大小)；若没有可行邻居则停止，且不保证找到全局最优。",
    "explanation": "短期禁忌表排除最近访问过的状态，以减少立即循环。本轨迹在所有邻居均被禁忌时停止，不会暗中违反禁忌规则。",
    "transfer": "尝试调整排班方案时，可暂时禁止刚刚撤销过的移动，避免来回反复。",
    "prediction": {
      "prompt": "禁忌表主要防止什么？",
      "options": [
        "在近期状态之间立即循环",
        "任何会让分数变差的移动"
      ],
      "answer": 0,
      "explanation": "禁忌搜索仍可能接受较差移动；它限制的是近期访问过的状态。"
    }
  },
  "heuristic-simulated-annealing": {
    "title": "模拟退火（Simulated Annealing）",
    "objective": "在离散状态空间搜索；温度降低时，接受较差移动的概率也随之降低。",
    "invariant": "搜索过程中访问过的最佳状态与当前状态分开保存。",
    "complexity": "本例时间为 O(迭代次数)；有限步冷却过程不保证全局最优。",
    "explanation": "若能量增加 Δ>0，以 exp(−Δ/T) 的概率接受该移动。高温利于探索，降温后更倾向于保留改进。",
    "transfer": "把同一接受规则用于路线调整或布局变更，并为每个方案定义可计算的代价。",
    "prediction": {
      "prompt": "温度降低后，接受一次能量上升移动的概率如何变化？",
      "options": [
        "exp(−Δ/T) 会降低",
        "每次能量上升移动都会被接受"
      ],
      "answer": 0,
      "explanation": "Δ 固定且为正时，减小 T 会降低接受概率。"
    }
  },
  "heuristic-genetic-algorithm": {
    "title": "遗传算法（Genetic Algorithm）",
    "objective": "通过按适应度选择、交叉和变异，让种群逐代演化。",
    "invariant": "每条染色体始终是合法的定长位串；每一代都根据实际适应度函数评分。",
    "complexity": "时间为 O(代数 × 种群规模 × 染色体长度)；有限次随机搜索不保证全局最优。",
    "explanation": "选择步骤复用适应度较高的亲代，交叉组合亲代片段，变异补充新变化。固定随机种子让本轨迹可重现。",
    "transfer": "将一个小型配置编码为位串，定义评分，再观察交叉操作是否保留有用的组合。",
    "prediction": {
      "prompt": "交叉后，变异主要起什么作用？",
      "options": [
        "引入单靠重组可能无法产生的新变化",
        "保证得到全局最优染色体"
      ],
      "answer": 0,
      "explanation": "变异能探索新的位串，但不能证明已经找到全局最优解。"
    }
  },
  "neural-perceptron-gradient": {
    "title": "Sigmoid 神经元与梯度下降",
    "objective": "用一个 sigmoid 神经元在小型二分类数据集上训练，通过降低平方误差调整参数。",
    "invariant": "每次更新都根据当前预测和标签计算批量梯度，再沿梯度反方向更新权重。",
    "complexity": "时间为 O(训练轮数 × 样本数 × 特征数)；收敛取决于数据、学习率和模型，训练效果不代表泛化能力。",
    "explanation": "神经元计算 σ(w·x+b)。半平方误差对权重的导数为 (p−y)p(1−p)x；批量梯度下降先对样本求平均，再按 w ← w−η∇w 更新。",
    "transfer": "对一个新的带标签样本推算一次权重更新，并指出哪个输入特征参与了对应梯度分量。",
    "prediction": {
      "prompt": "若预测值 p 大于标签 y，且输入特征为正，该权重会朝哪个方向调整？",
      "options": [
        "沿正梯度的反方向减小",
        "沿正梯度方向增大"
      ],
      "answer": 0,
      "explanation": "当 p>y 且 x>0 时，梯度为正；更新时减去该梯度，因此权重降低。"
    }
  }
} as Record<string, MissionCopy>,
  },
  rank: {
    R01: { title: '学徒', note: '任务控制中心 · 地面待命' },
    R02: { title: '资深学徒', note: '完成首段航程的整备与定位' },
    R03: { title: '领航员·机械师', note: '首航认证：领航与整备双轨执证' },
    R04: { title: '舰长', note: '天狼星授衔 · 授圣堂武士衔' },
    R05: { title: '高阶圣堂武士', note: '折跃纪元远征资格' },
    R06: { title: '舰队执行官', note: '深空编队指挥权' },
    R07: { title: '黄金舰队统帅', note: '星门航线总指挥' },
    R08: { title: '执政官', note: '太阳邻域远征议会' },
    R09: { title: '星河传奇', note: '虚空纪元远征者' },
    R10: { title: '万星领主', note: '银心方向最高军衔' },
  },
  engine: {
    E01: { name: '聚变反应堆·待命点火', speed: '0.1c' },
    E02: { name: '聚变反应堆·巡航功率', speed: '0.2c' },
    E03: { name: '聚变冲压引擎（巴萨德采集）', speed: '0.3c' },
    E04: { name: '反物质引擎（亚光速极限）', speed: '1c' },
    E05: { name: '折跃引擎（首次超光速）', speed: '10c' },
    E06: { name: '相位折跃引擎', speed: '40c' },
    E07: { name: '星门折跃引擎', speed: '100c' },
    E08: { name: '虚空引擎', speed: '300c' },
    E09: { name: '母舰级虚空核心', speed: '5000c' },
    E10: { name: '暗物质虚空引擎', speed: '5万c' },
  },
  medal: { gold: '金章', silver: '银章', bronze: '铜章' },
  /** 算法身份：关卡数据只持 AlgoId（名称牌 / 结算标尺 / 档案卡按此取词）。 */
  algo: {
    'insertion-sort': { name: '插入排序', en: 'Insertion Sort' },
    'binary-search': { name: '二分查找', en: 'Binary Search' },
    'merge-sort': { name: '归并排序', en: 'Merge Sort' },
  },
  /**
   * 算法档案：发明思路与历史沿革（陈述性知识——只呈现，不入预测门）。
   * 结构与 docs/动画绘制方法论.md 的设计思路三段式对齐：
   * 关键观察 / 换个设计 / 带走这一招，外加 出生 / 发明动机 / 今日遗产。
   */
  dossier: {
    'insertion-sort': {
      born: '1946 年，ENIAC 团队的约翰·莫奇利在《Sorting and Computing》讲义中首次把它写成算法——更早以前，它是牌手理牌的本能：每摸一张，插进手里已排好的牌。',
      motive: '数据逐件到达，随到随排：不必等全部到齐，也不必第二条空轨——永远维护一段有序区，这就是「在线」的力量。',
      insight: '绿色整备区是循环不变量：永远有序，且每放回一件就向前长大一格——这就是算法为什么正确。',
      alternative: '若改用归并：最坏情形也快，但要一条等长空轨放临时件；插入排序原地整备，代价是最坏 Θ(n²)——数据小或近乎有序时，这笔交易很划算。',
      legacy: '2002 年 Timsort 把它与归并焊在一起，成为 Python / Java / Android 的默认排序——你手机今天整理列表时，跑的就是这段 1946 年的手牌技艺。',
      transfer: {
        prompt: '增援舰每分钟报到一艘，指挥室只挂一条已排好的队列——你会选哪种整备方式？',
        options: ['随到随插：新舰与队中舰逐位比对，插入合适航位', '等 60 艘全部到齐，分成两半各自排好再汇合', '清空队列，按报到顺序重排一遍'],
        answer: 0,
        explanation: '流式数据 + 单条队列 + 就地维护——正是插入排序的主场：在线、原地、对近乎有序的数据最快。',
      },
    },
    'binary-search': {
      born: '1946 年，莫奇利在首批计算机讲学中公开描述了它；但第一个对所有数组都正确的实现迟至 1962 年才出现——1986 年 Bentley 统计，专业程序员当场写对的仅约一成。',
      motive: '电话簿和字典没人从第一页翻起：表一旦有序，对半猜就是最优策略——16 颗恒星 4 次探测，100 万颗也只要 20 次。',
      insight: '紫色候选区间是循环不变量：目标永远在区间内，每次探测严格排除一半。',
      alternative: '若改用逐个排查：代码最简单，但 100 万颗要 100 万次探测；二分的代价是表必须先有序——排序一次，换取此后每次查找都对数级。',
      legacy: '数据库索引与 B 树是它的多路后代，git bisect 用它定位坏提交；2006 年 Java 标准库还在二分里被发现整数溢出 bug——写对它，60 年来都算本事。',
      transfer: {
        prompt: '候选恒星从 16 颗翻倍到 32 颗，最坏要多花几次探测？',
        options: ['多 1 次：log₂32 = 5', '多 16 次：候选翻倍就多查一倍', '次数不变：反正每颗都要看一眼'],
        answer: 0,
        explanation: '对数级的含义：候选翻倍，代价只加一。这就是「先排序、后二分」成为数据库索引祖师爷的原因。',
      },
    },
    'merge-sort': {
      born: '1945 年，冯·诺依曼为存储程序计算机 EDVAC 写下它——最早的计算机程序之一，还顺手用它估算这台尚不存在的机器需要多少硬件。',
      motive: '磁带时代数据大到内存装不下，只能顺序读带：两盘已排好的磁带怎么合成一盘？看两队队首哪张小——归并是磁带时代的生存技能。',
      insight: '每次只看两队队首，光度小者先入列：n 颗恒星恰好 n 次取星，线性工作量。',
      alternative: '若改用插入：省掉整条输出列，但磁带只能顺序读、来回插行不通；归并用 O(n) 辅助空间换稳定的 Θ(n log n)——外部排序至今是它的天下。',
      legacy: '磁带机退场了，外部排序和数据库归并连接仍在用它；2002 年 Timsort 把它与插入排序合体——你学过的两个算法，今天在手机里并肩运行。',
      transfer: {
        prompt: '两股星流各 4 颗、都已按光度排好，汇合最坏要几次取星？',
        options: ['恰好 8 次：每颗恰好入列一次', '最多 16 次：可能反复比较队首', '取决于两股流的光度差'],
        answer: 0,
        explanation: '汇合是线性的：n 颗恒星 n 次取星。归并排序每层的工作量由此而来——log n 层 × 每层 n = n log n。',
      },
    },
  },
  ui: {
    backToMap: '返回地图',
    undo: '撤销 {n} [U]',
    restart: '重开 [R]',
    zeroPenalty: '零惩罚：撤销和重开都不影响奖章——奖章只看你是否靠撤销过关。',
    armHeldHint: '{holder}夹持的{unit}；{place}上的虚线格是{slot}',
    armEmptyHint: '{holder}空闲：点「{pick}」取走绿色区右侧第一{unit}',
    pick: '抓取下一{unit} [P]',
    pickPlain: '抓取下一{unit}',
    compare: '与左邻比对 [C]',
    comparePlain: '与左邻比对',
    shift: '右移一格 [S]',
    drop: '放回{slot} [D]',
    verdictGreater: '{left} > {held}：左邻更大，要给它让位',
    verdictLessEqual: '{left} ≤ {held}：找到位置，可以放回',
    verdictEdge: '{slot}已到最左端：免比对，直接放回（这就是 while i>0 的短路边界）',
    verdictNone: '还没有比对结论：先「{compare}」，再决定右移还是放回',
    moves: '⚡ 步数 {n} / 最优 {m}',
    compares: '🔍 比对 {n} / 最优 {m}',
    sortedCount: '已整备 {n} / {m}',
    predictionTitle: '先猜一步',
    predictionOk: '✓ 判断正确',
    predictionRetry: '✗ 再看一眼图上的证据',
    predictionContinue: '继续',
    predictionSeeResult: '查看结算',
    winLine: '{medal}（用了 {n} 次撤销）· 航程 +{ly} 光年',
    lyGain: '航程 +{ly} 光年',
    winStats: '⚡ {moves} 步（最优 {m1}） · 🔍 {compares} 次比对（最优 {m2}）',
    winPerfect: '完美复现标准插入排序的动作数！',
    winCompareHint: '对照理论最优想一想：差距发生在哪{unit}上？',
    winAgain: '再玩一次',
    nextLevel: '下一关',
    // 算法名称牌与三态标尺
    algoPlate: '本关算法 · {name} {en}',
    caseRulerTitle: '三态标尺 · 同样 {n} 项，比对次数由「输入的样子」决定',
    caseYou: '本次 {n}',
    caseBest: '最好 n−1 = {n}',
    caseWorst: '最坏 n(n−1)/2 = {n}',
    // 算法档案卡（通关解锁；图鉴常驻）
    dossierOpen: '算法档案',
    dossierTitle: '算法档案 · {name} {en}',
    dossierClose: '关闭 [Esc]',
    dossierBorn: '出生',
    dossierMotive: '发明动机',
    dossierInsight: '关键观察',
    dossierAlternative: '换个设计',
    dossierLegacy: '今日遗产',
    dossierTransfer: '带走这一招',
    // 指挥关
    cmdPick: '抓取',
    cmdCompare: '比对',
    cmdShift: '右移',
    cmdDrop: '放回',
    cmdLoop: '循环',
    cmdPaletteHint: '指令模块（点击放入程序槽，点槽移除）',
    programSlots: '程序槽（{n} 格）',
    run: '运行 ▶ [空格]',
    pause: '暂停 ⏸ [空格]',
    singleStep: '单步',
    clear: '清空',
    runSteps: '⚡ 运行步数 {n}{cap}',
    runStepsCapped: ' / 上限',
    cardsUsed: '指令数 {n} / {m}（金 ≤ {par}）',
    programTimeout: '程序在 200 步内没有完成——检查循环模块：它必须在动作模块之后，才能不断回到开头。',
    redesign: '重新设计',
    cmdWinLine: '{medal}（{n} 条指令）· 航程 +{ly} 光年',
    cmdWinStats: '⚡ 运行 {n} 步 · 💾 程序 {a} / {b} 槽（最优 {par} 条）',
    cmdWinOptimal: '最小指令程序达成——循环把重复动作压缩成了一条指令。',
    cmdWinCompress: '还有压缩空间：哪条指令出现的规律可以交给循环？',
    // 归并关
    leftStream: '左股星流',
    rightStream: '右股星流',
    mergeOutput: '汇合输出（点击星流取队首；快捷键 L / R）',
    takeCount: '取星 {n} / 最优 {m}',
    mergedCount: '已汇合 {n} / {m}',
    mergeWinLine: '{medal}（{n} 次取星）',
    mergeWinRule: '汇合两条有序星流：每次比对队首、取走光度较小者——{n} 颗恒星恰好 {n} 次取星就能完成。',
    mergeWinPerfect: '零失误汇合：星流汇合已成为你的航行本能。',
    mergeWinMiss: '多出的取星来自取错队首——回想"光度小者先入列"。',
    mergeAgain: '再来一次',
    // 探测关
    probeRule: '定位规则：点击紫色区间内的恒星直接探测——每次探测排除一半。快捷键：数字键 = 格号探测。',
    probeCount: '🔍 探测次数 {n} / 最优 {m}',
    remainRange: '剩余区间 {n} / {m}',
    targetSpectrum: '目标光谱 {n}',
    probeHit: '命中',
    probeLow: '偏低 → 排除左半',
    probeHigh: '偏高 → 排除右半',
    probeAttempt: '第 {i} 次探测 A[{idx}] = {v}：{verdict}',
    probeWinLine: '{medal}（{n} 次探测）',
    probeWinLog: '⌈log₂{n}⌉ = {m}：每一次探测都把候选排除一半——这就是对数。',
    probeWinPerfect: '你完美复现了二分查找的排除效率！',
    probeWinHint: '对照 {m} 次的纪录想一想：哪一次探测没有落在中点附近？',
    probeAgain: '再探一次',
    // 晋升与换装
    promote: '🎖 晋升！{title} —— {note}',
    engineSwap: '🔧 引擎换装：{name}（最大 {speed}）',
    nextStop: '下一站 {label}（还需 {ly} 光年）',
    embarkTransit: '启航 → {dest}',
    backTransit: '返航 → 太阳系',
  },
  map: {
    title: '太阳邻域',
    intro: '出航前为聚变反应堆整备燃料棒，航程中以恒星光谱定位——逐段驶向真实的恒星。整备步数与比对次数，就是你的航行战绩。',
    lyReadout: '航行里程 {ly} 光年',
    rankEngine: '军衔：{rank} · 引擎：{engine}（最大 {speed}）',
    milestone: '下一站：{label}（还需 {ly} 光年）',
    allLit: '太阳邻域全部航段点亮。',
    taskControl: '任务控制中心',
    taskControlBody: '绿色整备区代表"已整备区"——它就是插入排序的循环不变量：每次抓起新件、放回正确空槽，不变量都向前长大一格。奖章只看一件事：你有没有靠撤销过关。博学笃志，格物明德。',
    challengeCount: '{n} 个挑战',
    commandChallenge: '[指令程序] {n} 项挑战',
    enter: '进入关卡 →',
    lockedShort: '未解锁',
    locked: '完成前一航段后解锁',
    dlc: '三个 DLC 在校准中：深场（深度学习与 Transformer）· 巡天（机器学习原理与应用）· 盖亚（模式识别经典算法）。军衔阶梯已为 DLC 预留至银河系量级。',
  },
  level: {
    'insertion-01': {
      title: '首航 · 比邻星',
      destination: '比邻星（半人马座 α 星 C）',
      brief: '首段航程目的地：比邻星，距地球 4.24 光年，最近的恒星，拥有一颗宜居带行星 Proxima b。抓取下一根燃料棒，与左邻比对功率，决定右移还是放回空槽。',
      holder: '机械臂',
      place: '整备轨',
      slot: '空槽',
      unit: '根燃料棒',
    },
    'insertion-02': {
      title: '天狼双星 · 整备',
      destination: '天狼星（夜空最亮恒星，双星系统）',
      brief: '同样的动作，不同的装填序列。天狼双星的轨道节奏要求折跃引擎的谐振水晶严格成列——切换下面的挑战，感受"输入的样子"如何改变你的步数。',
      holder: '机械臂',
      place: '整备轨',
      slot: '空槽',
      unit: '枚谐振水晶',
    },
    'insertion-03': {
      title: '织女 · 逆风航段',
      destination: '织女星（天琴座 α，带岩屑盘）',
      brief: '岩屑盘掀起逆风，增援舰要摆成航速有序的纵队逐段穿行：调度席把每艘新舰按巡航航速插入航线队列——这是相位折跃点火前的编队纪律。打完这一关，你会亲眼数出 n(n−1)/2。',
      holder: '调度席',
      place: '航线队列',
      slot: '空航位',
      unit: '艘增援舰',
    },
    'insertion-cmd-01': {
      title: 'TRAPPIST-1 · 共振指令',
      destination: 'TRAPPIST-1（七行星轨道共振链）',
      brief: 'TRAPPIST-1 距地球 40.7 光年，七颗行星处于接近轨道共振的链条上。把四个动作写成星门整备程序，交给自动整备机调度护航舰——循环模块就是你的共振链。',
      holder: '自动整备机',
      place: '星门队列',
      slot: '空泊位',
      unit: '艘护航舰',
    },
    'barnard-probe-01': {
      title: '巴纳德 · 光谱定位',
      destination: '巴纳德星（红矮星，5.96 光年）',
      brief: '巴纳德星是第二近的恒星系统。深空没有路标——16 颗候选恒星的光谱已按编号排好，目标光谱 233 藏在其中。每次探测排除一半，4 次内锁定它的位置。',
      holder: '探测艇',
      place: '候选星表',
      slot: '排除区',
      unit: '颗恒星',
    },
    'pleiades-merge-01': {
      title: '昴星团 · 星流汇合',
      destination: '昴星团（444 光年 · 七姊妹疏散星团）',
      brief: '本星际泡的边界在昴星团。两股已按光度排好的恒星流要在星团入口汇合成一列——每次只能取队首，光度小者先入列。取错会被直接拒绝。',
      holder: '汇合闸口',
      place: '星流',
      slot: '空列位',
      unit: '颗恒星',
    },
  },
  variant: {
    'insertion-01-base': { label: '首航整备', detail: '4 根燃料棒' },
    'insertion-02-base': { label: '混合装填', detail: '6 枚谐振水晶' },
    'insertion-02-sorted': { label: '已经有序', detail: '最好情形' },
    'insertion-02-reversed': { label: '完全逆序', detail: '最坏情形' },
    'insertion-03-base': { label: '完全逆序', detail: '6 艘增援舰' },
    'insertion-03-nearly': { label: '近似有序', detail: '只错一处' },
    'insertion-cmd-01-base': { label: '4 艘护航舰', detail: '出航演习' },
    'barnard-probe-01-base': { label: '16 颗恒星', detail: '⌈log₂16⌉ = 4' },
    'pleiades-merge-01-base': { label: '8 颗恒星', detail: '零失误' },
  },
  prediction: {
    'insertion-01-base': {
      prompt: '抓取 1 之后，空槽的左边是 3。与左邻比对后会发生什么？',
      options: ['3 右移一格，空槽向左挪', '1 直接放回原地', '3 和 1 同时消失'],
      explanation: '3 > 1，所以 3 要给 1 让位：3 右移一格，空槽向左挪一格，再继续比对。',
    },
    'insertion-02-reversed': {
      prompt: '这次 6 艘完全逆序的舰用了 15 次比对。下一次完全逆序、12 艘，比对次数会接近多少？',
      options: ['约 66 次：涨到 4 倍以上', '约 30 次：正好翻倍', '仍是 15 次：次数与舰数无关'],
      explanation: '完全逆序时比对次数 = (n−1)+(n−2)+…+1 = n(n−1)/2。12 艘时是 11+10+…+1 = 66：规模只翻一倍，次数涨到 4 倍以上——这就是插入排序最坏情形 Θ(n²) 的平方增长。',
    },
    'insertion-03-base': {
      prompt: '6 艘完全逆序的增援舰，完成调度总共要比对多少次？',
      options: ['15 次 = 5+4+3+2+1', '6 次', '30 次'],
      explanation: '第 j 艘舰要和前面 j−1 艘都比一遍，加起来 5+4+3+2+1=15=n(n−1)/2——这就是最坏情况 Θ(n²) 的来源。',
    },
    'insertion-cmd-01-base': {
      prompt: '5 条指令为什么就能调度好任意 4 艘护航舰？',
      options: ['循环模块让 4 个动作自动重复，直到全部有序', '因为 4 艘护航舰只需要 4 条指令', '自动整备机自己会排序'],
      explanation: '循环 = while 全表有序之前反复执行：抓取/比对/右移/放回每个动作都可能发生多次——5 条指令 = 4 个动作 + 1 个循环，这就是"用循环消除重复"。',
    },
  },
  hud: {
    brandTitle: '算法星域',
    brandSubtitle: 'ALGORITHM / STAR SECTOR',
    navGame: '星域总览',
    navLog: '航行日志',
    navMap: '星图导航',
    navAria: '站点主题导航',
    bannerEyebrow: 'MISSION CONTROL',
    voyageTitle: '航行日志',
    voyageMotto: '博学笃志，格物明德——每一光年的航程，都记录在案。',
    captainFile: '舰长档案',
    statLy: '航行里程',
    statLyUnit: '光年（按最佳奖章折算）',
    statRank: '当前军衔',
    statEngine: '舰载引擎',
    statEngineNote: '最大航速 {speed}',
    statNext: '下一站',
    statNextNote: '还需 {ly} 光年',
    allLit: '太阳邻域全部点亮',
    continue: '继续航行',
    legsTitle: '航段记录 · 太阳邻域',
    legMeta: '{medal} · 航程 {ly} 光年',
    legLocked: '未点亮',
    medalFactorNote: '奖章系数：金 ×1 · 银 ×0.6 · 铜 ×0.3——重玩高奖章即可提升里程。',
    dossierTitle: '算法图鉴',
    dossierNote: '通关结算页点「算法档案」即归档一张卡——发明现场、设计取舍与今日遗产，全部有据可查。',
    dossierLockedName: '？？？',
    dossierLockedHint: '完成任一对应航段后解密',
    dossierArchived: '已归档',
    starMapEyebrow: 'STAR MAP',
    starMapHead: '星图导航 · 点击星辰前往',
    starMapFoot: '轨道半径 = 航段距离（对数）· 星色 = 最高奖章 · ESC 关闭 · 移动鼠标改变视角',
    hubLabel: '太阳系',
    footerCopy: '© 2026 中国科学院大学 UCAS · 博学笃志 格物明德',
    footerBuiltBy: 'Built by',
    footerLicense: '许可：CC BY-NC 4.0 · 禁止商用 · 转载需署名',
    footerAstro: '天文学数据参考：NASA / ESA / Gaia DR3 公开资料',
    gameHostAria: '太阳邻域游戏画面',
  },
} as const

/** 词表条目 id（关卡/变体/预测门按 id 与数据层对应）。 */
export type LevelId = keyof typeof zh.level
export type VariantId = keyof typeof zh.variant
export type PredictionId = keyof typeof zh.prediction
export type AlgoId = keyof typeof zh.algo
export type DossierId = keyof typeof zh.dossier

/** 递归推导所有「文本叶子」的点路径（'ui.pick' / 'rank.R04.title' / 'level.insertion-01.brief' …）。 */
type TextPaths<T> = T extends readonly unknown[]
  ? never
  : T extends string
    ? never
    : { [K in keyof T & string]: T[K] extends string ? K : `${K}.${TextPaths<T[K]>}` }[keyof T & string]

export type TextKey = TextPaths<typeof zh>

/** 按点路径取词：t('ui.moves', { n: 3, m: 5 }) → '⚡ 步数 3 / 最优 5'。拼错键名在 typecheck 直接报错。 */
export function t(key: TextKey, vars: Record<string, string | number> = {}): string {
  let node: unknown = zh
  for (const part of key.split('.')) {
    if (typeof node !== 'object' || node === null) throw new Error(`locale 缺少词条：${key}`)
    node = (node as Record<string, unknown>)[part]
  }
  if (typeof node !== 'string') throw new Error(`locale 词条不是文本：${key}`)
  let text = node
  for (const [name, value] of Object.entries(vars)) text = text.replaceAll(`{${name}}`, String(value))
  return text
}

/** 奖章中文名（金章/银章/铜章）。MedalTone 用字符串字面量比较，避免引入 types 依赖环。 */
export function medalName(medal: 'gold' | 'silver' | 'bronze'): string {
  return zh.medal[medal]
}
