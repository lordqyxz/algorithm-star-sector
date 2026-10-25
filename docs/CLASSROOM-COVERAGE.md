# 课堂课件与任务映射

审计日期：2026-10-25。源文件为用户的私有原始课件，保留在 Obsidian Vault，**不进入本站 `public/`、构建产物或仓库**。本表只记录文件名与物理页码。原始资料共 18 份、674 页：第 1–11、13–16 章 15 份课件，另有《作业讲解 2025》、`试题_20221120.docx` 和 `课程要点.docx`。**没有第 12 章课件**；不根据章号猜测内容。逐页转写在私有 Vault 的 `课件/Markdown/逐页原文/`，课件中的图片、公式对象仍以原页为准。

`src/game/classroom.ts` 仅保存任务 ID、源文件 ID 和页码。下表的“本轮任务”是课堂增强工作指定的任务 ID；只有代码与交互验证完成后才能称为已实现。现有 104 项课程任务对应五份大纲，并不自动覆盖这批课堂 PPT。两组固定输入的计算、正确的数值测试和浏览器走通，也不构成任意输入正确性证明或完整学习验收。

## 优先口径

`课程要点.docx` 第 1 页明确要求：渐进阶比较与主方法，排序和前 k 大，贪心/分治/动态规划求解，BFS/DFS/拓扑/最大连通分支，Dijkstra/Bellman–Ford，Prim/Kruskal，NP 完全性规约，以及各章作业与思考题。`试题_20221120.docx` 和《作业讲解 2025》进一步给出具体题面。索引中的 `emphasis: core` 表示该章主节或被课程要点/作业/试题点名；`extension` 表示该页为基础旁例或延伸。它不是分值预测。

## 逐章核对

| 源文件与物理页 | 课堂主线 | 精确任务映射 | 局限与待核 |
| --- | --- | --- | --- |
| 第 1 章，9–28、56–63 | 算法定义、伪代码、正确性、计数、O／Ω／Θ，基本结构 | 现有 `foundation-modeling`、`foundation-correctness`、`foundation-asymptotics`、`structure-complexity-counting`、`structure-sequence`、`structure-lists`、`structure-stack-recursion`、`structure-queues`、`tree-properties` | 渐进阶任务仅以正系数二次式展示上下界，不能代替任意函数的比较证明；伪代码建模与一般正确性需另外练习。 |
| 第 2 章，4–34 | 二分查找；替换法、递归树、主方法；最大子数组的分治和线性法；最近点对；双价格市场作业 | 现有 `structure-searches`、`divide-recursion-tree`、`divide-master-theorem`、`divide-closest-pair`；本轮 `ppt-divide-max-subarray`、`ppt-divide-market` | 现有主方法任务应明确第 14–16 页第三种情况的正则条件及不适用情况。最大子数组原先无独立任务。第 34 页的双价格市场不能改写成最大子数组，见作业讲解第 6 页。 |
| 第 3 章，2–39 | 插入、堆、归并、快速排序；稳定性/原地性/复杂度；k 路有序序列合并 | 现有 `sort-insertion-direct`、`tree-heap`、`sort-heap`、`sort-merge`、`sort-quick`；本轮 `ppt-merge-kway` | `external-kway-merge` 是外部归并的块缓冲和 I/O 示例，不能替代第 39 页和试题第 1 页要求的内存小根堆 O(n log k) 归并。快排平均比较次数的理论推导仍应按课件第 34–36 页解释。 |
| 第 4 章，3–33 | 比较决策树下界；稳定计数排序；LSD 基数排序；桶排序及适用前提 | 现有 `divide-comparison-lower-bound`、`sort-counting`、`sort-radix`、`sort-bucket`；作业特例本轮 `ppt-sort-radix-base-n` | `sort-counting` 已真实执行频数、前缀与从右向左稳定回填，**不是缺项**。第 27–33 页桶排序线性是分布假设下的期望结论；作业第 7–8 页的 [0, n²−1] 特例须先转 n 进制。 |
| 第 5 章，3–20 | 最小/最大值比较下界；成对同时找极值；随机选择；五元组中位数选择；小根堆和锦标赛 Top-k | 现有 `divide-quickselect`；本轮 `ppt-select-minmax`、`ppt-select-bfprt`、`ppt-select-topk`、`ppt-select-tournament-topk` | `divide-quickselect` 的随机枢轴不等于第 11–15 页最坏线性 BFPRT。`sort-tournament` 产出完整排序，不等于第 19–20 页只取前 k 大的锦标赛重赛。 |
| 第 6 章，6–77 | 矩阵链、LCS、最优二叉搜索树、多级图**最长路**与骨牌建模、LIS、0/1 背包 | 现有 `dp-matrix-chain`、`dp-lcs`、`dp-optimal-bst`、`dp-knapsack-01`；本轮 `ppt-dp-multistage-longest`、`ppt-dp-lis`；作业 `ppt-dp-rod-cutting` | `g-multistage` 计算的是最短路，**不能映射**第 54–59 页的最长路。新任务须保留最长目标并以第 57–59 页的骨牌约束作迁移实例。第 21–25 页还比较纯递归、备忘录与自底向上，不能把同一结果误称为所有三种过程已演示。 |
| 第 7 章，4–60 | 邮局覆盖；带权区间调度 DP 和无权贪心；霍夫曼前缀码；最优加油 | 现有 `greedy-activity-selection`、`tree-huffman`；本轮 `ppt-greedy-post-office`、`ppt-dp-weighted-interval`、`ppt-greedy-refuel` | 无权最早结束贪心不能解决第 10–19 页带权收益最大化。第 35–38 页用反例排除最早开始/最短时长/最少冲突规则。第 53–60 页加油须显示容量约束、首个更便宜站与交换论证。 |
| 第 8 章，2–61 | 图表示、BFS、二着色、DFS 时钟/边分类、DFS 拓扑、强连通、割点/双连通 | 现有 `g-representations`、`g-search`、`g-topology`、`g-components-scc`；本轮 `ppt-graph-bipartite-color`、`ppt-graph-dfs-classification`、`ppt-graph-biconnected` | 原 `g-search` 只提供栈/队列访问序，不产生第 31–36 页的发现/完成时刻及四类边。`g-components-scc` 用 Kosaraju 算有向强连通，不能替代第 49–60 页无向双连通。现有 `g-topology` 使用 Kahn；课件第 38–40 页讲 DFS 完成时间拓扑及其证明，此变体仍需明确讲解。 |
| 第 9 章，5–28 | 安全边、割性质、Kruskal 和 Prim 的逐步构造与复杂度 | 现有 `g-mst`、`tree-union-find` | 算出 MST 不等于第 9–15 页的一般安全边证明；试题第 2 页要求从指定起点逐步列表。第 29 页 Fibonacci 堆是复杂度延伸，未有独立任务。 |
| 第 10 章，1–32 | 单源最短路最优子结构；Dijkstra；Bellman–Ford 的轮次、负权与负环 | 现有 `g-shortest-path`；Dijkstra 另有 `LabScene` 操练 | Dijkstra 非负边前提（第 15–20 页）和 Bellman–Ford 可达负环检测（第 28–32 页）需作为选择条件及证明观察，而不能只比最后距离。 |
| 第 11 章，1–52 | 流/割/残量及最大流最小割；Ford–Fulkerson/Edmonds–Karp；Dinic；二部匹配归约 | 现有 `g-max-flow`；本轮 `ppt-graph-dinic`、`ppt-graph-bipartite-matching` | 原任务使用 Edmonds–Karp，不能充作第 33–40 页分层图、阻塞流的 Dinic；通用最大流也不自动给出第 46–52 页匹配网络的构造、整数流到匹配的恢复。最大流最小割的割集合和容量证据仍要显式展示。 |
| 第 13 章，1–39 | 所有合法位移；朴素、Rabin–Karp 滚动哈希、有限自动机、KMP | 现有 `structure-strings-kmp`；本轮 `ppt-string-rabin-karp`、`ppt-string-automaton`、`ppt-string-kmp-all` | 原任务中朴素与 KMP 都在首个命中停止，不能声称找到第 1、24–26、35–39 页要求的所有匹配。Rabin–Karp 的同哈希伪命中仍需逐字核对；有限自动机须真的构造转移函数。 |
| 第 14 章，2–54 | 判定/优化、编码长度、图灵机、P/NP、证书、3SAT→Clique→Vertex Cover 等归约 | 现有 `advanced-turing-language`、`advanced-np-certificates`；试题特例本轮 `ppt-np-review-committee` | 现有 3SAT→Clique 为小实例，不能据此宣称第 37–44 页的一般双向构造证明，更不能替代试题指定的 Vertex Cover→审稿委员会归约。第 45–54 页 Hamilton 路径/回路→TSP 归约链仍是理论缺口，非具名实装任务。 |
| 第 15 章，2–21 | 近似比、无权顶点覆盖 2 近似、MAX-3-SAT 随机 7/8、加权顶点覆盖 LP 舍入、度量 TSP | 现有 `approx-vertex-cover-matching`、`approx-metric-tsp-mst`；本轮 `ppt-approx-max3sat`、`ppt-approx-weighted-vertex-cover` | 极大匹配的**无权**覆盖法不等于第 10–13 页的**加权** LP 松弛与 1/2 舍入；随机 MAX-3-SAT 的 7/8 是期望值，不能误报每次运行的保证。第 20–21 页一般 TSP 无常数近似结论依赖复杂性假设。 |
| 第 16 章，2–26 | 回溯、限界、N 皇后、子集和、FIFO 分枝限界 N 皇后 | 现有 `advanced-n-queens`、`advanced-subset-sum`；本轮 `ppt-search-queens-fifo` | DFS 回溯访问序不等于第 21–26 页 FIFO 分枝限界。第 18–20 页 Monte Carlo 搜索树规模估计属分析方法，目前没有专属交互。 |

## 作业与试题的精确关联

| 来源 | 物理页 | 题目与映射 | 易错条件 |
| --- | --- | --- | --- |
| `作业讲解 2025.pptx` | 1–2 | 主方法；`divide-master-theorem` | 第三种情况还须验证 af(n/b) ≤ cf(n)；O 与 Θ 不可混称。 |
| 同上 | 3–6 | 双价格市场；`ppt-divide-market` | 跨中线必须用左侧最低买价和右侧最高卖价；与股票最大子数组不同。 |
| 同上 | 7–8 | [0, n²−1] 线性排序；`ppt-sort-radix-base-n`，依赖 `sort-counting`、`sort-radix` | n 进制两位、两轮稳定排序为 O(n)；直接计数为 O(n²)，十进制位数随 n 增长。 |
| 同上 | 9–11 | 钢条切割；`ppt-dp-rod-cutting` | R[k] 包含不切割 pₖ 与切割收益，避免错误地把同段价格重复加算。 |
| 同上 | 12–16 | DFS 时钟、边分类和强连通；`ppt-graph-dfs-classification`、`g-components-scc` | DFS 森林可能不止一棵树；全图所有边都须分类。 |
| `试题_20221120.docx` | 1 | 渐进阶与主方法、k 路归并、霍夫曼、DFS/SCC；`foundation-asymptotics`、`divide-master-theorem`、`ppt-merge-kway`、`tree-huffman`、`ppt-graph-dfs-classification`、`g-components-scc` | 渐进阶需给符号与依据；DFS 从 a 起按字母序，并标 d/f 和完整边类别。 |
| 同上 | 2 | Prim 与审稿委员会 NP 完全性；`g-mst`、`ppt-np-review-committee` | 从 a 开始给 Prim 过程；审稿题要求判定版、NP 证书和 **Vertex Cover→审稿委员会** 双向归约。 |

## 验收边界

- 课堂索引是“原始页→任务”的导航关系，不能当成课程概念全部实现的证明。第 8 章 DFS 拓扑变体、第 14 章完整归约链、第 16 章 Monte Carlo 搜索树估计等理论内容仍须在现有任务中深化或明确标出缺口。
- 新任务应让学习者预测下一步、观察真实对象状态、读出不变量与条件，并尝试另一输入或解释一个错误路径；只播放固定轨迹不能证明能独立运用。
- 每个新增任务的两个示例输入需要数值/不变量测试及浏览器可见性检查；复杂度和正确性主张须与实际算法、输入前提及课件证明相符。

## 本轮已实现与资料辨析

26项新增任务现已接入统一模拟边界，合计130项任务。它们是可前进、回退、换输入、预测及部分迁移校验的确定性推演；不把它们称为与三个 `LabScene` 样板相同的自由操作操练。课堂页面共有17组、20页列表，引用覆盖实际18份附件；课程要点作为范围依据，不另造一个章节。

整理先完成于私有 Vault：1份课程导航、15份章节、1份作业与试题索引、7份跨章专题，共24份。正文直接回到原始PPT/PPTX/DOCX及其原件渲染画面核查；不是由转出的Markdown二次生成。专题保留模型、推导、证明、可复算的自建例、条件与反例，并以理由性wikilink关联章节。原始18附件及逐页检索底稿均不发布。

- 第6章61–65页使用 `A[k] <= A[i]`，主模型为**最长不减子序列**；严格递增只作对照，第二输入有重复值区分二者。
- 第6章57–59页的骨牌题固定全部牌的顺序，只选择正反朝向，以相邻接触数的乘积和为目标；不改写为相同端点衔接的子序列。第59页末牌朝向的文字与红色最优路径图冲突，笔记保留原文疑点。
- 作业讲解第9–11页的钢条问题无切割费用，单侧式 `max(p[i]+R[n-i])` 与对称拆分式均正确；课件第11页否定单侧式的论断不成立。轨迹采用对称式，数学参考及原理解释说明两式等价。
- MAX-3-SAT的7/8为独立均匀赋值的期望，不是单次下界；每个子句的三个变量必须不同。加权覆盖用小图半整数枚举重现LP最优点，明确其指数代价，不冒充通用高效LP求解器。
- 第8章按割点与边栈划分的是**点双连通块**；它和按桥划分的边双连通分量不同。二部匹配与Dinic的反向残量边真实存在于绘图路径，皇后队列在入队后才记录该状态。
- 审稿委员会的两输入分别为YES、NO；LP舍入第二例有0、1/2、1三种坐标，不靠两个同样结果的例子隐藏边界。

## 实际核验

- 冻结依赖安装、类型检查、104项测试及生产构建通过；纯模型覆盖独立排序、子集、组成、路径、割与匹配枚举基准。静态方法关系、当前读数和轨迹中的计算式均经严格KaTeX解析，界面不显示原始TeX命令。
- 浏览器遍历130任务、260输入路径，完成3,777次前进、366次预测/迁移检查；错误选项不能推进，回退和存档保持正确。
- 1280桌面审计4,403次真实文字边界、遮罩与公式采样；并复核关键中间截图。截图另发现并修正自动相交检查未捕获的树层级压缩、分组不可同时见和长卡片超框；场景现在按真实内容计算最小绘图区，课堂节点显示层数、时间戳等标签。
- 课堂17组、20页列表在1280／1440检查；真实鼠标主入口、17组逐任务来源与返回上下文通过。其他课程入口进入课堂专属任务也保留课件引用。
- 原有3个自由操作样板的204次操作、9次错误反馈、16次提示、3次改参、3次恢复，以及真实图节点/边/DP格/反向残量点击、键盘和减少动画路径均通过。

以上核验只针对所列有限教学输入与实现行为，不是对学习效果的实验评价，也不关闭本文件前述变体与综合自测缺口。
