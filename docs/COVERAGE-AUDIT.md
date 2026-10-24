# 五份大纲的实现与教学覆盖审计

审计日期：2026-10-24。课程来源及 128 个主题定义见 [CURRICULUM.md](./CURRICULUM.md)。本次检查对象为 `src/game/simulation/*.ts`、七份 `/tmp/sector-*-locale.json`、实际 `src/game/locale.ts` 与 `CourseScene.ts`。这些文件在审计过程中并行修改；本表记录已读到的结果，不把开发者的完成消息自动视为通过。

## 结论与口径

大多数具名算法已有真实计算轨迹，涵盖外部排序、FFT、Strassen、流水 DP、15 迷、两种背包搜索、概率算法各类别、五类近似、三类启发式、神经网络、LP 和网络流。早期的多个缺项已在本轮补入。**这支持“课程主题已建立实现映射”，还不支持“所有教学目标已经完整通过”。** 理论证明、通关后的迁移检查，以及部分复合主题的细节仍须按下表判断。

- **E**：源代码确有可回放的状态、说明和预测题；尚不等于已通过浏览器端视觉验收。
- **I域**：确有执行该方法的计算，不是预存最终答案；本次核验只涵盖任务给定的两个实例及声明域。不是通用库的所有输入保证。
- **I部分**：计算覆盖某些基本操作或阶段，缺失部分明确列在同一行。
- **T**：在当前说明/公式中能找到限定条件与足够的论证链，范围仍以该行为准。
- **T部分**：只有定义、结论、直觉或一个实例，缺少大纲要求的完整一般论证。
- **待核**：刚修改或待集成，不能提前计入覆盖。
- **拓展**：原矩阵为设计时加入的教学建议，不作为官方逐项缺失扣分。

多个主题可以共用一关。一个概念可由正确说明与针对性检查覆盖，不强制另造模拟算法。反过来，源代码能算出答案不意味着学习者已经看到证明。下面不把 E、I、T 合并成一个虚假的完成百分比。

## 范围收敛

原课程矩阵列出的完整删除操作、空/错误输入、所有排序变体、通用 Phase I 等是实现范围和质量检查建议，不能全部反推为官方逐字要求。特别是：

- 计数排序是线性排序的可选代表；已有基数排序可承载 U5 的类别要求。
- 确定性最坏线性选择、Johnson、LCS 和额外研究阅读不是必须新增的具名算法。
- AVL/红黑树仅实现插入，B 树仅实现插入和查找，应如实标范围；不凭空要求完整容器库才承认主题出现。
- U2 显式写了 2–3 树，最小度 t=2 的 2–3–4 树不能替代；现已新增真实 `tree-23`。
- U4 只写电路板布线问题，未给目标函数。当前代表是板块顺序的切口密度最小化，不能声称解决一般多网 PCB 路由；原矩阵中的网格布线只是另一种具体化建议。

## 文件与函数索引

| 简写 | 实际文件 / 入口 |
| --- | --- |
| S | `src/game/simulation/structures.ts`；具名 trace 函数或 `structuresMissions` 的同 ID 回调 |
| T | `src/game/simulation/trees.ts`；`treesMissions` 的同 ID 回调，另有 `bstInsert/bstFind/bstRemove` |
| G | `src/game/simulation/graphs.ts`；`graphsMissions → mission(id, key, run)` 的同 ID 回调 |
| O | `src/game/simulation/sorting.ts`；`run(id, variant)` |
| A | `src/game/simulation/algorithms.ts`；`sim(id, variant)` |
| B | `src/game/simulation/advanced.ts`；下表列出具名函数 |
| X | `src/game/simulation/optimization.ts`；下表列出具名函数 |
| UI | `src/game/scenes/CourseScene.ts`；`next/changeInput/draw/drawPrediction` |

## 128 项逐项映射

### 基础 F01–F10

| 主题 | missionId → 文件/函数 | 已核状态 | 实际证据和剩余边界 |
| --- | --- | --- | --- |
| F01 | `foundation-modeling` → S/traceFoundationModeling | E，I域，T部分 | 给出有限输入、目标、ADT、前后置条件并算排序；尚无算法/程序/问题各自定义和一般建模练习的完整检查。 |
| F02 | `foundation-modeling`、`structure-sequence`、`structure-lists` | E，I域 | 连续位置与链接表示、操作成本可对照；模型是教学数据结构，不是真实堆地址。 |
| F03 | `foundation-mathematics` → S/traceFoundationMathematics；`advanced-randomized-evidence` | E，I域，T部分 | 求和、对数、递推和抽样有计算；数学基础未被官方细列，不能把此代表集合说成完整数学先修。 |
| F04 | `foundation-modeling`、`foundation-correctness` → S | E，T部分 | 输入/输出与不变式可见；未见用户构造流程图或伪代码与程序的显式对照。 |
| F05 | `structure-complexity-counting`、`foundation-mathematics`、排序任务 | E，I域，T部分 | 计数真实发生的操作；平均/最坏/期望、输入位长和数值大小的概念分散，尚无完整横向检查。 |
| F06 | `foundation-asymptotics` → S/traceFoundationAsymptotics | E，T（正系数二次式范围） | 显示 c、n₀ 和上下界；最终用 n≤n²、1≤n² 对所有 n≥1 论证，明确有限样本不是证明。 |
| F07 | `divide-recursion-tree`、`divide-master-theorem`、`divide-hanoi` → A/sim | E，I域，T部分 | 真实递归移动与层成本；主定理限定幂函数形式；递归正确性的一般归纳论证仍短。 |
| F08 | `foundation-correctness`；各贪心/DP/搜索任务 | E，T部分 | 累加不变式含初始化/保持/终止；不能把它自动转移为所有分治、贪心、DP、剪枝证明。 |
| F09 | UI/预测与通关 transfer | E部分 | 有逐关预测、换样本、静态迁移问题；尚无综合未知任务的建模/选型与反馈，不宣称等价课程考试。 |
| F10 | 无独立 mission | 拓展 | 前沿研究阅读属于课程目标延伸；无具体点名论文，不作为必补算法缺项。 |

### 线性、串、数组 L01–A04

| 主题 | missionId → 文件/函数 | 已核状态 | 实际证据和剩余边界 |
| --- | --- | --- | --- |
| L01 | `structure-sequence` → S/同 ID 回调 | E，I域 | 逐项后移插入、前移删除；固定合法位置，不支持自由编辑。 |
| L02 | `structure-lists` → S/traceLists；`structure-string-operations` | E，I部分 | 链接重建与插入、遍历；字符串任务补旁路删除；一般链表的完整空表/首尾操作未逐项实现。 |
| L03 | `structure-stack-recursion`；`structure-stack-queue-variants` → S/traceStackQueueVariants | E，I域 | 括号栈；数组与有 next 字段的链栈 push/pop，返回值对照。 |
| L04 | `structure-queues` → S/traceCircularQueue；`structure-stack-queue-variants` | E，I域 | 循环下标与 size 判空满、顺序队列移位、链队列 head 出队/tail 入队。 |
| S01 | `structure-string-operations` → S/traceStringOperations | E，I域 | 顺序/链接表示及连接、截取、插入、删除；字符域为给定 ASCII 示例。 |
| S02 | `structure-strings-kmp` → S/traceKmp | E，I域 | 朴素比对、LPS 构造、KMP 回退、首个命中；首个命中问题不等于所有重叠命中接口。 |
| A01 | `structure-arrays-matrices` → S/同 ID 回调 | E，I域 | 二维行优先地址计算是多维数组的具体代表；任意维数不是当前接口。 |
| A02 | `structure-arrays-matrices` | E，I部分 | 实际打包对称矩阵上三角；未见从任意原坐标恢复压缩下标/值的操作。 |
| A03 | `structure-arrays-matrices` | E，I域 | 真实生成非零三元组并统计空间；不是稀疏矩阵算术库。 |
| A04 | `structure-generalized-list` → S/traceGeneralizedList | E，I域（存储/遍历） | 用递归结构生成原子/子表节点及访问；空表、表头/表尾等其他基本操作只在规划中。 |

### 查找 Q01–Q08

| 主题 | missionId → 文件/函数 | 已核状态 | 实际证据和剩余边界 |
| --- | --- | --- | --- |
| Q01 | `structure-searches` → S/同 ID 回调 | E，I域 | 顺序比较和命中；当前样本均命中，未完整比较平均成功/失败代价。 |
| Q02 | `structure-searches` | E，I域 | 真正按块边界定位后扫描；轨迹聚合为一帧，不能看到每次块比较。 |
| Q03 | `structure-searches`；既有 `ProbeScene` | E，I域 | 二分实际缩区间；课程任务主要展示结果计数，旧探测关另有选择位置交互。 |
| Q04 | `structure-searches` | E，I域 | 使用 Fibonacci 数与 offset 更新，非二分改名；逐步 Fibonacci 区间暂未完整画出。 |
| Q05 | `tree-optimal-search` → T/同 ID 回调 | E，I域 | 已由“最高频根”改为左右权重差最小的次优构造；有方向边和加权深度，与 OBST 区别清楚。 |
| Q06 | `structure-hashing-search` → S/traceHashing | E，I域 | 两种冲突处理真实插入/查找；无删除标记场景，须限定当前操作范围。 |
| Q07 | `tree-trie` → T/同 ID 回调 | E，I域 | 子字符共享与终结标记、真实插入/查询；作为键树的字符实现。 |
| Q08 | 上述搜索任务及 `tree-bst/tree-avl/tree-btree/tree-23` | E，T部分 | 各方法有成本文案；尚无同一访问分布的统一选型比较和完整平均查找长度讲解。 |

### 树 T01–T11

| 主题 | missionId → 文件/函数 | 已核状态 | 实际证据和剩余边界 |
| --- | --- | --- | --- |
| T01 | `tree-properties` → T/同 ID 回调 | E，T部分 | 节点/叶/高度/完全树容量、数组与左右引用；一般树与森林性质借转换任务补充。 |
| T02 | `tree-traversals`；`tree-general-conversion` → T | E，I域 | 二叉四种遍历；普通树/森林先根、后根由实际 children 解码与遍历补入，需以末轮代码为准。 |
| T03 | `tree-threaded` → T/同 ID 回调 | E，I域 | 构造右后继线索并按后继访问；这是单侧中序线索代表，不宣称双线索全部维护。 |
| T04 | `tree-general-conversion` → T/同 ID 回调 | E，I域 | 左孩子右兄弟编码，现已从二叉链接反解 child/root；早期直接拷贝 children 已替换。 |
| T05 | `tree-huffman` → T/同 ID 回调 | E，I域，T部分 | 最小两权合并、导出码与 WPL；前缀码性质有说明，最优性的完整交换证明不足。 |
| T06 | `tree-bst` → T/bstInsert、bstFind、bstRemove | E，I域 | 真正增删查，含后继移植；测试重建顺序，不是静态树图片。 |
| T07 | `tree-avl` → T/同 ID 回调 | E，I域 | 插入、祖先高度与单/双旋修复；声明插入范围，删除为未实现扩展。 |
| T08 | `tree-btree`、`tree-23` → T/同 ID 回调 | E，I域 | t=2 的 B 树及独立 max-two-key 的 2–3 树；分裂提升与叶深度检查；删除未提供。 |
| T09 | `tree-red-black` → T/同 ID 回调 | E，I域 | 真正插入修复、旋转/重着色、黑高验证；无删除修复。 |
| T10 | `tree-union-find` → T/同 ID 回调 | E，I域 | 按秩合并、真实 parent 更新和路径压缩；不是组件标签静态分组。 |
| T11 | `tree-heap`；`sort-heap` → T、O | E，I域 | 堆序数组/树、取顶和上/下滤；排序任务另有有序后缀。 |

### 图 G01–G11

| 主题 | missionId → 文件/函数 | 已核状态 | 实际证据和剩余边界 |
| --- | --- | --- | --- |
| G01 | `g-representations` → G/同 ID 回调 | E，I域 | 邻接表、矩阵与空间；具名边界（零权/重边）不在固定实例域。 |
| G02 | `g-search` → G/同 ID 回调 | E，I域 | 真正栈/队列访问；固定连通分量的发现序；非完整 DFS 进入/退出时间课。 |
| G03 | `g-components-scc` → G/同 ID 回调 | E，I域 | 无向分量与 Kosaraju SCC；有向弱连通不是单独算法任务。 |
| G04 | `g-topology` → G/同 ID 回调 | E，I域 | Kahn 出队及度更新，第二实例包含环检测。 |
| G05 | `g-shortest-path` → G/同 ID 回调 | E，I域，T部分 | 非负 Dijkstra 和 Bellman–Ford 负环示例；算法前提清楚，最优性论证不完整。 |
| G06 | `g-floyd-warshall` → G/同 ID 回调 | E，I域 | k 外层的真实距离更新与阶段定义；固定无负环实例。 |
| G07 | `g-mst` → G/同 ID 回调 | E，I域，T部分 | Prim/Kruskal 均计算；断开图不是输入域，割性质只有概述。 |
| G08 | `g-critical-path` → G/同 ID 回调 | E，I域 | 拓扑前后向、事件早晚时间、活动余量；边上显示关键活动。 |
| G09 | `g-multistage` → G/同 ID 回调 | E，I域 | 顶点编号符合阶段序的 DAG 逆向 DP，恢复路径。 |
| G10 | `g-max-flow` → G/同 ID 回调 | E，I域，T部分 | Edmonds–Karp 真实正反残量边和流值；最终未展示可达割集合，定理目前为结论。 |
| G11 | `g-min-cost-flow` → G/同 ID 回调 | E，I域 | 实际 Bellman–Ford 残量短路、负费用反边与增广；范围为给定无负费用环的网络，不是任意最小费用流 API。 |

### 内存 M01–M04

| 主题 | missionId → 文件/函数 | 已核状态 | 实际证据和剩余边界 |
| --- | --- | --- | --- |
| M01 | `structure-memory-allocation` → S/同 ID 回调 | E，I域 | 首次/最佳适应的分割和剩余区间；不同输入与策略同时切换，不能隔离比较策略效果。 |
| M02 | `structure-memory-strategies` → S/traceMemoryStrategies | E，I域 | 已补双向相邻空闲块合并；本模型以块元数据模拟边界标识，不是真实地址块头/块尾。 |
| M03 | `structure-memory-strategies` | E，I域 | 真正二次幂拆分、XOR 伙伴查找和逐级合并。 |
| M04 | `structure-memory-safety` → S/traceMemorySafety | E，I部分 | 越界、释放后读和重复释放有状态与拒绝；泄漏未演示，但官方未逐字列举全部故障种类。 |

### 内部和外部排序 O01–E03

| 主题 | missionId → 文件/函数 | 已核状态 | 实际证据和剩余边界 |
| --- | --- | --- | --- |
| O01 | `sort-insertion-direct` → O/run | E，I域 | 持有 key、空位和逐项移动；相同值身份保持。 |
| O02 | `sort-insertion-binary` → O/run | E，I域 | 二分插入位置与实际后移，未把移动成本漏算成对数。 |
| O03 | `sort-shell` → O/run | E，I域 | gap 递减的插排；仅声明所用 gap 序列。 |
| O04 | `sort-bubble` → O/run | E，I域 | 邻接比较/交换与无交换终止。 |
| O05 | `sort-selection` → O/run | E，I域 | 真正后缀选择与交换。 |
| O06 | `sort-tournament` → O/run | E，I域 | 已补胜者树和单路径重赛；不是每次重新排序。 |
| O07 | `sort-quick` → O/run | E，I域 | Lomuto、末位主元及递归；反序样本显示退化。 |
| O08 | `sort-heap` → O/run | E，I域 | 建最大堆、取根、缩小堆和下滤；树形与数组一致。 |
| O09 | `sort-merge` → O/run | E，I域 | 真实递归/双队首归并；每次完整合并后发帧，细粒度取项由比较帧部分承载。 |
| O10 | `sort-bucket` → O/run | E，I域 | 有界桶映射、桶内插排、连接；不泛称任意分布线性。 |
| O11 | `sort-radix` → O/run | E，I域 | 多位十进制 LSD 稳定分配收集；非负整数样本。 |
| O12 | `sort-radix` → O/run | E，I域 | 可承载线性排序类别的键位数/基数条件；独立计数排序是可选代表，未实现不算官方具名遗漏。 |
| O13 | `divide-comparison-lower-bound` → A/sim；各排序 copy | E，T部分 | 2^h≥n! 与比较模型条件已讲；Ω(n log n) 的一般阶估计与横向选型未充分展开。 |
| E01 | `external-kway-merge` → O/run | E，I域（单轮三路） | 有有限块缓冲、真实 refill/flush 和 I/O；平衡多轮归并调度未演示，不能宣称完整外排流程。 |
| E02 | `external-replacement-selection` → O/run | E，I域 | 固定容量堆、冻结、解冻成段和块读写；生成初始段而非全局排序。 |
| E03 | `external-optimal-merge` → O/run | E，I域 | 二路最小两权合并及最小成本基准；K 路是扩展范围。 |

### 分治 D01–D07

| 主题 | missionId → 文件/函数 | 已核状态 | 实际证据和剩余边界 |
| --- | --- | --- | --- |
| D01 | `divide-recursion-tree`、`divide-hanoi`、`sort-merge` → A/O | E，I域，T部分 | 分解、基例、合并有计算实例；一般分治归纳证明未系统展开。 |
| D02 | `divide-quickselect` → A/sim | E，I域 | 真实随机枢轴分区与单侧缩域；固定第 k 小，未单设偶数中位数约定。 |
| D03 | `divide-matrix-multiply` → A/sim | E，I域 | 已补普通分块乘法并同朴素基线验证，不能用 2×2 标量基线无限推广。 |
| D04 | `divide-strassen` → A/sim | E，I域（2×2） | 七个乘积和组合真实计算；一般递归矩阵实现未提供，复杂度说明属于推广。 |
| D05 | `divide-fft` → A/sim | E，I域（4 点） | 奇偶 2 点变换、旋转蝶形、复数输出；不是任意长度 FFT/逆变换接口。 |
| D06 | `divide-closest-pair` → A/sim | E，I域 | 真分治与条带比较；逐层 y 排序的实现成本需与文案一致。 |
| D07 | `divide-quickselect`；比较下界任务 | E，T部分；部分拓展 | 选择方法有代表；确定性最坏线性选择并未被官方点名，不作硬缺项。 |

### 贪心与 DP R01–P07

| 主题 | missionId → 文件/函数 | 已核状态 | 实际证据和剩余边界 |
| --- | --- | --- | --- |
| R01 | 各 `greedy-*`、`tree-huffman`、`g-mst/g-shortest-path` | E，T部分 | 规则和前提有说明；“贪心解最优的证明”仍不能以例子与一句直觉全数覆盖。 |
| R02 | `greedy-fractional-knapsack` → A/sim | E，I域，T部分 | 真正按密度与剩余容量取分数，明确不可直接用于 0/1；有交换直觉。 |
| R03 | `greedy-job-deadline` → A/sim | E，I域，T部分 | 单位时长、收益、期限及最晚可行槽；一般交换/可行性证明较短。 |
| R04 | `greedy-johnson-flowshop` → A/sim | E，I域；拓展 | 明确两机同序且无额外约束；此代表不能替代 P06。 |
| P01 | `dp-knapsack-01/dp-matrix-chain/dp-optimal-bst/dp-flowshop-exact` | E，I域，T部分 | 状态、转移、阶段有实例；如何发现最优子结构/比较贪心仍为静态短说明。 |
| P02 | `dp-knapsack-01` → A/sim | E，I域 | 完整二维价值 DP；解恢复是否已加入以末轮结果为准；整数容量/伪多项式限制已说明。 |
| P03 | `dp-matrix-chain` → A/sim | E，I域 | 真实区间枚举/成本/切分表；括号重构属于补核项。 |
| P04 | `dp-optimal-bst` → A/sim | E，I域 | 成功 p、失败 q、概率总和、区间 DP 与 root 表；与次优树分开。 |
| P05 | `g-multistage`、`g-floyd-warshall` → G | E，I域 | 两种路径 DP 均有真实独立计算，不用一个算法代替另一种。 |
| P06 | `dp-flowshop-exact` → A/sim | E，I域 | 两机子集 DP；同一集合 M1 完工和固定，只保留最小 M2 完工足够；有穷举验证与顺序恢复。 |
| P07 | `dp-lcs` 及各 DP transfer | E；拓展部分 | LCS 真正填表并回溯；作为额外迁移案例，不替代官方点名项目。 |

### 回溯与分枝限界 B01–H07

| 主题 | missionId → 文件/函数 | 已核状态 | 实际证据和剩余边界 |
| --- | --- | --- | --- |
| B01 | `advanced-subset-sum/advanced-backtracking-knapsack` → B/subset、backtrackingKnapsack | E，I域，T部分 | 解树、选择/撤销、约束剪枝；未完整解释所有通用解空间构造方法。 |
| B02 | `advanced-backtracking-knapsack` → B/backtrackingKnapsack | E，I域 | 已补独立 DFS，只用超重约束剪枝，区别于带分数界的 BB。 |
| B03 | `advanced-subset-sum` → B/subset | E，I域 | 正数选/不选、目标与剩余和界；负数不属于可套用该剪枝的域。 |
| B04 | `advanced-n-queens` → B/queens | E，I域 | 真实逐行冲突检查与回退，输出合法见证。 |
| B05 | `advanced-graph-coloring` → B/coloring | E，I域 | 真正颜色赋值/撤销与邻接约束；固定 m 可行性。 |
| B06 | `advanced-backtracking-tsp` → B/tspBacktrack | E，I域 | 枚举完整回路并计代价；不是单源短路替代。 |
| B07 | B 的各搜索计数 | E，T部分 | 展开/拒绝计数真实；效率估计方法和不同顺序对比仍简单。 |
| H01 | `advanced-bb-shortest-path/advanced-bb-knapsack/advanced-bb-tsp` | E，I域，T部分 | 有 FIFO、LC、界与当前最好值；最小/最大方向在各例分开。 |
| H02 | `advanced-bb-knapsack` → B/knapsack | E，I域 | 真实分数松弛上界和剪枝；按密度计算的实现与基准已核验，不能只看旧标题。 |
| H03 | `advanced-bb-tsp` → B/bbtsp | E，I域 | 部分路径合法下界、可行回路上界；队列实际排序键与“best-first”的说明需一致。 |
| H04 | `advanced-bb-shortest-path` → B/lcPath | E，I域 | 实际 FIFO 标签修正与 LC 排序扩展；非负权条件明确。 |
| H05 | `advanced-circuit-density` → B/circuit | E，I域（切口密度） | 真正网表→排列→峰值切口密度及界剪枝；不等价完整 PCB 路由，官方未进一步定义模型。 |
| H06 | `advanced-bb-puzzle15` → B/puzzleAStar | E，I域 | 真实 4×4、合法邻居、Manhattan、open/closed；样本距目标一/两步，非任意实例交互。 |
| H07 | BB 计数与 `advanced-bb-shortest-path` | E，T部分 | 有展开计数，两个输入同时换队列策略，尚非控制变量的效率比较。 |

### 复杂性 N01–N06

| 主题 | missionId → 文件/函数 | 已核状态 | 实际证据和剩余边界 |
| --- | --- | --- | --- |
| N01 | `advanced-turing-language`、`advanced-np-certificates` → B | E，T部分 | 判定/语言与优化有区分；一般编码长度和数值位长的影响不足。 |
| N02 | `advanced-turing-language` → B/turingLanguage | E，I域，T部分 | 有带、头、状态与确定转移，判定 L={01}；当前只两个两位输入，作为计算模型引入。 |
| N03 | 同上 + `advanced-np-certificates` | E，T部分 | P 求解、NP 证书验证，正确排除“NP=非多项式”误解；语言类的完整量词定义需结合更新 copy。 |
| N04 | `advanced-np-certificates` → B/np | E，I域（两子句构图），T部分 | 3SAT→CLIQUE 方向正确；任意 m 子句的构造、大小界和双向证明需明确写出。 |
| N05 | `advanced-np-certificates` | E，T部分 | 两子句实例与逐对证书检查不是一般 NP 完全性证明；必须同时有 NP 成员性及从已知 NP 完全问题归约。 |
| N06 | `advanced-np-certificates` 的 copy | E，T部分 | NP-hard 有定义；需明确 NP-complete 同时要求属于 NP，优化版与判定版不可混称。 |

### 概率 Z01–Z05

| 主题 | missionId → 文件/函数 | 已核状态 | 实际证据和剩余边界 |
| --- | --- | --- | --- |
| Z01 | `advanced-randomized`、`advanced-randomized-evidence`、`divide-quickselect` | E，I域，T部分 | 固定种子可重现随机步骤；两个变体同时改变输入和种子，未提供独立种子实验。 |
| Z02 | `advanced-randomized` → B/randomized | E，I域 | 已是真递归随机枢轴快排；旧“内置排序/洗牌”文案需同步剔除。 |
| Z03 | `advanced-randomized-evidence` → B/randomizedTests | E，I域（数值估计） | 16 个离散网格抽样点计圆内比例；不是连续独立样本的精确置信区间演示。 |
| Z04 | 同上 + `divide-quickselect` | E，I域 | 随机枢轴精确选择，独立排序验证结果；需区分随机时间与错误概率。 |
| Z05 | `advanced-randomized-evidence` → B/randomizedTests | E，I域（固定底数检验），T部分 | Miller–Rabin 模幂与平方序列真实；4^-t 界只用于独立随机底数，当前固定 a=2 不构成该统计实验。 |

### 近似 X01–X06

| 主题 | missionId → 文件/函数 | 已核状态 | 实际证据和剩余边界 |
| --- | --- | --- | --- |
| X01 | 五个 `approx-*` 的公式、copy、检查 | E，T部分 | 保证/经验表现有区分；最小化与最大化统一定义、输入前提与误差传播仍分散。 |
| X02 | `approx-set-cover-greedy` → X/setCover | E，I域，T部分 | 真正覆盖未覆盖元素；收费直觉与 H(d) 已写，一般调和界推导需完整。 |
| X03 | `approx-subset-sum-fptas` → X/subsetFptas | E，I域，T部分 | 合并、裁剪、去超限真实；逐步乘法误差到 1−ε 的推导未完整展示。 |
| X04 | `approx-vertex-cover-matching` → X/vertexCover | E，I域，T（无权匹配法） | 不相交匹配边强制 OPT 至少每边一个点，取两端≤2OPT；这是完整短论证。 |
| X05 | `approx-metric-tsp-mst` → X/tsp | E，I域，T（度量前提） | 欧氏距离满足三角不等式；MST≤OPT，倍增≤2OPT，捷径不增价，证明链齐全。 |
| X06 | `approx-knapsack-fptas` → X/knapsack | E，I域，T部分 | 利润缩放与最小重量 DP 真执行；总取整损失≤nK≤εOPT 的推导仍待说明。 |

### 启发式 I01–I05

| 主题 | missionId → 文件/函数 | 已核状态 | 实际证据和剩余边界 |
| --- | --- | --- | --- |
| I01 | 三个 `heuristic-*` 与 neural copy | E，T | 明确目标、状态、预算和不保证全局最优；范围为各小型搜索空间。 |
| I02 | `heuristic-tabu-search` → X/tabu | E，I域 | 真实邻域、禁忌与最好值；没有藐视准则属于这个可声明变体，不自动扣官方缺项。 |
| I03 | `heuristic-simulated-annealing` → X/anneal | E，I域，T | 每次重新计算能量与 exp(−Δ/T) 接受；有限降温不保证全局最优。 |
| I04 | `heuristic-genetic-algorithm` → X/genetic | E，I域 | 位串群体、实际适应度、选择/交叉/变异；不等同一般调度染色体实现。 |
| I05 | `neural-perceptron-gradient` → X/perceptron | E，I域（单 sigmoid 神经元） | 名称 ID 保留历史，但标题和公式明确 sigmoid+平方损失梯度；不是经典感知机误分类更新或任意多层反传。 |

### LP V01–V04

| 主题 | missionId → 文件/函数 | 已核状态 | 实际证据和剩余边界 |
| --- | --- | --- | --- |
| V01 | `advanced-lp-standard` → B/lpStandard；`advanced-lp-degeneracy` | E，I域，T部分 | 自由变量正负拆分、松弛/剩余变量、等式与可行见证；无界有独立实例；不可行只说明 Phase I，不是通用求解。 |
| V02 | `advanced-simplex`、`advanced-lp-degeneracy` 的 copy | E，T部分 | 基、基可行解、极点相关定理可用文字覆盖；需核对其条件和“一一对应”错误是否清除。 |
| V03 | `advanced-simplex` → B/simplex | E，I域 | 固定可行松弛基开始、入基/比值/枢轴和最优解；未实现一般初始基 Phase I，范围已声明。 |
| V04 | `advanced-lp-degeneracy` → B/lpDegeneracy | E，I域，T部分 | 真正并列比值换基产生零基本变量，另有无界例；循环风险/Bland 规则靠说明，未演示循环整个过程。 |

## 共同教学边界

1. `CourseScene` 是不可变轨迹的游标，支持前进、后退、重开、换两个实例及存档。它不是让玩家逐步构造算法的编辑器；该限制不否定机制演示，但应影响产品宣传。
2. 每关有一个固定预测题，在约 45% 进度出现；两个样本共享题目。32 个含论证笔记的任务另有终帧迁移题，必须正确回答才记为完成；不能自动等同掌握全部子主题。
3. 所有任务保留迁移提示；32 个任务的迁移选择题提供错误反馈与正确答案校验。这是有限题目上的理解检查，不是对未知问题的综合迁移能力评估。
4. `copy.explanation` 已纳入所有任务均可打开的原理抽屉；32 个任务还集成适用条件、结论、分步论证和边界。说明与公式不再依赖侧栏剩余空间展示。
5. 源码中的所有样本轨迹可计算不表示页面已经正确呈现所有状态。最终尺寸、文字遮挡、箭头、当前值、键盘、reduced motion 和存档仍由产品验收负责。

## 本轮发现与修复追踪

| 发现 | 本轮证据 | 当前处理 |
| --- | --- | --- |
| 串基本操作、两种栈队列状态、双向空闲块合并不足 | S 已补 traceStringOperations/traceStackQueueVariants 与双向合并 | 复读通过具体实现，测试待末轮统一记录 |
| 无独立回溯背包、图灵机、LP标准型/退化例 | B 新增四个任务 | 复读确认真实计算及明确限域 |
| 次优查找树错用最高频根 | T 改为最小左右权重差；补方向边 | 复读/测试需以最终版为准 |
| t=2 被误当含 2–3 树 | 新增 `tree-23` | 有真正双键上限与分裂提升 |
| 森林反解原为直接拷贝输入 | 改为从 LCRS 边反解，补先根后根遍历 | 末轮复核 |
| 数学文案混淆求和值 Θ(n²) 与加法次数 Θ(n) | 已反馈 S owner | 末轮 copy 校验 |
| Hanoi 辅助柱空、迭代选择递归空间、逐层条带排序复杂度、Johnson重复排序复杂度 | 已反馈 A owner | 末轮 copy 校验 |
| LP自由变量转换误称“一一对应” | 已反馈 B owner | 必须改为可行性保持/投影与提升，分解可非唯一 |
| 部分近似算法实现成本与优化版界混写 | 已反馈 X owner | 末轮 copy 校验；不得影响其近似保证前提 |

## 核验记录

使用已有测试，没有为文档新增测试。首次统一执行 42 项，39 通过，3 项失败，均落在同时更新中的 advanced/trees；已经通知对应 owner。末轮测试与文件快照在后续小节追加。任何旧的通过消息都不覆盖它之后发生的代码修改。

### 本审计者的最后核验与理论提纲交接

在结束审计循环前，使用上文列出的七个既有测试文件重新运行，结果为 **46 项通过、0 项失败**。这覆盖当时的两个固定变体与测试断言，不表示随后发生的代码修改已自动通过，也不替代浏览器教学验收。最后回读确认 `CourseScene` 已对窄屏显示 `copy.explanation`，此前的窄屏解释缺失已修复。

另已按授权撰写 `/tmp/sector-theory-notes.json`，包含 **32 个现有任务的证明提纲**，每份均有适用条件、结论、3–5 个论证步骤、边界及新的迁移选择题。对应任务为：

- 基础：`foundation-modeling`、`foundation-asymptotics`、`foundation-correctness`、`structure-complexity-counting`。
- 分治：`divide-recursion-tree`、`divide-comparison-lower-bound`、`divide-quickselect`、`divide-closest-pair`。
- 贪心：`tree-huffman`、`greedy-fractional-knapsack`、`greedy-job-deadline`。
- 图：`g-shortest-path`、`g-mst`、`g-floyd-warshall`、`g-max-flow`、`g-min-cost-flow`。
- DP：`dp-knapsack-01`、`dp-matrix-chain`、`dp-optimal-bst`、`dp-flowshop-exact`。
- 分枝限界：`advanced-bb-knapsack`、`advanced-bb-tsp`。
- 复杂性：`advanced-np-certificates`、`advanced-turing-language`。
- 概率：`advanced-randomized`、`advanced-randomized-evidence`。
- 近似：`approx-set-cover-greedy`、`approx-subset-sum-fptas`、`approx-knapsack-fptas`。
- LP：`advanced-simplex`、`advanced-lp-standard`、`advanced-lp-degeneracy`。

**交接状态仅为“提纲已撰写并通过 JSON 结构断言”。本审计者未核验其在词表、Pixi 理论面板或第二迁移检查中的集成。** 上表的 T部分不能因 JSON 文件存在就自动升为 T/V。后续由接手审阅者依据实际集成、最新代码和显示结果更新。此前“待末轮”或“需同步”的条目同样应由接手者逐项结清，不能用开发消息代替检查。

### 最终集成核验（2026-10-24）

以上“交接”与“待末轮”是审计过程记录。最终版本将 32 份论证笔记及迁移题全部集成于仓库词表，运行时和测试不依赖 `/tmp` 文件。理论页由当前 Pixi 场景管理，支持原生键盘焦点与 Escape 关闭；预测和迁移校验分别保存进度。保留逐项的 T部分口径，不以已集成笔记替代完整课程证明训练。

- 冻结依赖安装、类型检查、生产构建通过；53 项算法、轨迹和公式测试通过。
- 浏览器生产构建遍历全部 104 个任务、208 条输入路径、2,564 次前进和 272 次预测/迁移校验；验证错误回答阻止推进、前后步、完成存档、MathML 输出和延迟动画错误。
- 公式关系逐项匹配算法前提，并对所有帧执行严格 KaTeX 解析。矩阵当前读数使用实际行列标签；计算答案与用户输出分离，不展示序列化 JSON。
- 修复矩阵行标题与首列相撞、同一数据多视图复用容器、动画销毁后更新、长输出及正文挤占操作栏。树结构、普通图和几何点集采用各自布局；最近点保持等比例坐标。
- 上述浏览器遍历以 1440px 桌面视口执行。它验证交互和布局约束，不等价于逐帧人工视觉验收、任意输入正确性或学生学习效果评估。


### 294042 复核补充

对张宝贤大纲的单独复核发现，第七章课程总结与综合自测尚未实现；前六章的算法任务入口不等于全部 25 节完成。此前 F09 仅有单关检查，应保留 E部分。21 个任务的来源关联已补齐，公式默认裁切、KMP 输出裁切和饱和边语义已修复。逐节映射、独立复算与验证范围见 [REVIEW-294042.md](./REVIEW-294042.md)。


### 可操作样板补充（2026-10-25）

Dijkstra、0/1 背包、最大流新增基于真实用户命令的操练与挑战，改变了这三个样板仅能回放的边界。其余任务仍按原轨迹方式运行，三个样板不替代跨章综合自测。实现范围、模式与核验见 [INTERACTIVE-LABS.md](./INTERACTIVE-LABS.md)。
