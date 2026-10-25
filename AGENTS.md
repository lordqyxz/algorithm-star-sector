# Algorithm Animation Studio Rules

## Architecture decision principles (2026-09, binding)

- 追求"最优雅地实现最终目的"，不为兼容旧代码/旧架构扭曲新设计。旧实现只有在恰好符合目标架构时才保留；迁移时允许删除，不做双轨兼容层。
- 技术选型只看主要矛盾（职责边界与状态所有权归属），包体、语料、下载量等次要矛盾在架构定案后再权衡，不得反向扭曲架构结论。
- 站点 = 星域总览 + 课程航线 + 首航实战 + 航行日志 + 星图对话框。游戏模式（算法星域，星际航行主题）的表现层与场景/输入/循环归 PixiJS（`pixi.js`，版本见 package.json）所有：游戏内不得把 React 作为游戏状态的持有者或渲染者；React 只保留站点外壳（HUD/航行日志/星图弹层）。
- 确定性模拟（`src/game/sim.ts` 统一导出的纯函数与领域模拟模块 + 命令日志/轨迹游标）是玩法规则的唯一权威，独立于任何渲染方案；撤销 = 日志或游标回滚，进度存档走 localStorage。
- 成长系统：军衔与引擎是两条交叉里程碑阶梯（`src/game/core/xp.ts` 的 `milestones`，晋升一档 → 换装一档，门槛严格交替），数据只存常量 id（R01…R10 / E01…E10），中文词表在 `src/game/locale.ts`。引擎最大航速必须与航段距离量级成正比、逐档递增。
- 整备对象随军衔纪元升级，并沿「资源 → 战略调度」弧线多样化：学徒整备燃料棒（资源）、舰长整备谐振水晶（资源）、舰队执行官调度增援舰编队（战略调度）、黄金舰队统帅以指令程序调度护航舰过星门（战略程序）；不得让高军衔关卡仍在搬运低纪元物料。机制词由关卡词表条目的 `holder`（执持者）/`place`（场所）/`slot`（空位）/`unit`（量词+名词）四字段承载，场景经 `t()` 插值渲染。

## Scope

- `Algorithm/` is a standalone React + Vite static website. Source code belongs in `src/`; build output belongs in `dist/` and is never hand-edited.
- The website no longer depends on Obsidian runtime features. Do not add frontmatter, wikilinks, `html-embed`, Mermaid embeds, or Obsidian-only APIs to `src/`.
- 沙盘课件系统（`src/lessons/`、`src/engine/`、课件组件、`content.ts` 章节地图）已于 2026-09 整体移除——它与游戏主题重复。不得重新引入课件式页面；教学职责由游戏关卡承担。

## Localization (locale.ts 词表，国际化基础)

- 所有面向用户的中文文案一律存于 `src/game/locale.ts`（namespace：rank/engine/medal/ui/map/level/variant/prediction/hud）；数据层与场景层只持有常量键，经 `t(key, vars)` 取词，`{n}` 插值动态数字与对象名词（`unit` 为「量词+名词」整体）。
- 键类型由 `typeof zh` 递归推导（`TextKey`），拼错键名 typecheck 直接报错；新增语言 = 新增一份同构词表。
- 新增文案时禁止在场景/关卡数据中写死中文字符串（代码注释中的中文不受限）。

## Dependency and package rules

- Use pnpm 11.22.0 and commit `pnpm-lock.yaml`. Do not create or keep `package-lock.json` or `yarn.lock`.
- All direct dependency versions in `package.json` must be exact. Do not use `^`, `~`, `latest`, canary, or experimental React releases.
- React and `react-dom` must remain on the same exact version. A dependency upgrade is a deliberate change: update `package.json`, run `pnpm install`, and run typecheck/build.
- Anime.js is imported from the locked local package. Do not reintroduce CDN script tags or use Anime.js v3 APIs.

## Structure and splitting

- `src/game/`：`locale.ts`（词表）· `levels.ts`（关卡纯数据：cells/par/ly/id，文案按 id 在词表）· `types.ts`（类型）· `sim.ts`（规则）· `core/`（app 内核、xp 里程碑、ui 原子、level-ui 关卡资产、open 分发、save 存档）· `scenes/`（每关一个场景文件）。
- `src/components/` 只保留站点外壳：`App.tsx`、`GameHost`（React 与游戏的唯一接触面：一个挂载点）、`VoyageLog`、`StarMapNav`、`StarField`。
- Do not create a new `hooks/`, `types/`, `constants/`, or per-SVG file until at least two call sites share a stable interface and the extraction removes duplication.
- 游戏关卡持有自己的教学状态与可视化；共享资产（`core/level-ui.ts` 的 `CellRowView`/`makeLevelChrome`/`drawMilestones` 等）只管渲染与层级。React state 不进入游戏；Anime.js 只动状态选中的视觉，不决定算法状态。卸载时清理定时器与动画作用域。
- 军衔/引擎在地图（MapScene 右上角）与航行日志（舰长档案）常驻展示；通关结算页必须按序渲染本次跨越的里程碑庆祝行（`drawMilestones`）。

## Teaching animation method

- Design for a learner behavior, not for motion: each major turn should make the learner predict, observe one causal change, identify an invariant, map the change to a formula term, and explain or transfer it.
- Keep object identity across states. Move the actual numbers, points, subproblems, candidates, or bars; do not replace them with unrelated decorative shapes.
- Treat formulas as measurements of the visual state. Every important number in a formula needs a visible source in the diagram or calculation panel.
- Use signaling and spatial/temporal contiguity: highlight the one relation being explained, keep its label beside it, and dim context without hiding it.
- Prefer learner-controlled segmented steps. Autoplay is optional; every state must remain understandable when paused or when motion is reduced.
- Game controls use the PixiJS `makeButton` primitive with glyph icons and keyboard shortcuts; provide a reduced-motion path (`prefers-reduced-motion`) in every scene.
- When numbers or identifiable content are exchanged, moved, or routed, show a nearby directional arrow/flow with the actual values or groups. Use a bidirectional arrow for a true swap and a one-way arrow for a one-way partition/merge; a Unicode symbol buried in a formula is not sufficient visual evidence.
- Add one lightweight prediction or self-explanation checkpoint at each major conceptual boundary. Interactions must answer a teaching question; do not add controls only for novelty.
- For the concrete guidance and evidence behind these rules, read `docs/动画绘制方法论.md` before designing a new level.

## Verification

- From this directory run `pnpm install --frozen-lockfile`, `pnpm run typecheck`, and `pnpm run build`.
- Before delivery, verify the built site through `pnpm run preview` at desktop and narrow widths. Check HUD 三入口切换、关卡星图、每个关卡的完整步径、撤销/重开/存档、结算页里程碑庆祝行、reduced motion，以及 console errors。
- grep 复查：`src/game` 场景与数据文件无词表外中文文案；无对已删模块（`@/lessons`、`@/engine`、`@/hooks`、`@/content`、DesignNotes）的残留引用；正文无「雁栖湖/国科大」括号残留（页脚版权行除外）。
- Keep the original PPT outside this project and never edit it as part of website work.

## 课程并集与新增原生场景（2026-10-24）

- 五份国科大官方大纲及逐项来源保存在 `docs/CURRICULUM.md`；实现和理论的边界见 `docs/COVERAGE-AUDIT.md`。不得把“有入口/通过两个样例”表述成任意输入正确性证明或完整学习验收。
- `src/game/simulation/` 的各领域模块只生成确定性状态，全部经 `sim.ts` 暴露；`curriculum.ts` 只编目。新关卡使用 `CourseMapScene` / `CourseScene`，原六段实战由 `LegacyMapScene` 进入。原理抽屉是当前 Pixi 任务的上下文说明，不恢复旧 React 课件系统。
- 轨迹中的图坐标归一化到 `[0,1]`，每帧边端点引用同帧实际节点；矩阵标签与数据维度一致，未定义距离使用字符串 `∞`。对象 id 在该对象的生命周期内稳定；同一数据的不同投影视图不得复用一个 Pixi Container。
- `TraceView` 的动画必须在替换、移除和销毁前取消。窄屏采用真实逻辑宽度重排，不缩小桌面画布。解释、条件与不变量在所有宽度均可访问。
- 预测与（具备论证笔记的任务）迁移校验属于任务状态；原理页不会推进算法。存档区分原实战 `algorithmia-save-v1` 与课程 `algorithmia-course-v1`。
- 使用 `pnpm run test` 核验数值/不变量与全目录轨迹，按 README 的 Playwright 流程核验所有任务的两组输入、预测、回退、存档和动画销毁后的延迟错误。
- 数学关系和当前读数使用 KaTeX（本地锁定依赖）生成 HTML+MathML，由 Pixi 场景管理的 DOM 测量层承载；React 不持有公式或算法状态。数学关系必须匹配实际方法/输入前提，不能以能通过 TeX 解析代替语义核验。
- `TraceFrame.result` 是独立测试用的计算答案；不得把序列化 JSON 当作用户看到的输出。输出列与矩阵行标题按真实文字宽度布局，必要时扩展布局或分页；不依赖截断去掩盖遮挡。
- 文字验收同时检查相交和容器裁切：使用 `tests/browser-layout-audit.js` 检查真实 Pixi 文字边界、遮罩和公式溢出；仅检查文字矩形不相交不能证明公式/输出完整可见。详见 `docs/REVIEW-294042.md`。

## 多 Agent 分工与成本（用户已确认，2026-10-24）

- 复杂算法、状态交互和跨模块新实现默认使用 Sol-medium；常规代码、数学和内容 review 使用 Sol-high。
- Luna 用于翻译、批量替换、明确边界的机械性修补；Astra 只按需承担少量关键设计，不作为常规 reviewer。
- 优先复用负责模块的原 Agent 与稳定上下文，后续只发增量要求；不为更换分工重跑已经完成的工作。维持稳定的模型、工具和公共提示前缀有利于缓存复用，但不能保证命中或推算没有证据的节省金额。


## 可操作样板（2026-10-25）

- `simulation/interactive.ts` 为指定策略操练中的 Dijkstra、0/1背包、最大流操作规则，统一从 `sim.ts` 暴露；`LabScene` 持有用户命令/历史，禁止通过固定答案序列判定动作。
- 演示与操练使用输入族0，挑战使用输入族1。两个模式各自轮换参数；提示和错误反馈均使该次完成归为辅助，不能把被答案提示过的操作记为独立完成。
- `algorithmia-labs-v1` 保存命令以重放恢复，并分别记录辅助、独立完成的指标；不得与原课程的走完轨迹进度混作掌握程度。
- 真实图形点击和原生可访问按钮调用同一操作；命中区域须位于标签上方，空命中集合不能传给 Pixi `addChild`。销毁场景时移除键盘/画布焦点监听与公式层。
- 运行新样板的操作/指针/文字边界检查，同时保留全部130任务的浏览器回归。验证范围和已知边界见 `docs/INTERACTIVE-LABS.md`。

## 真实课堂课件（2026-10-25）

- 原始18份课件共674页，实际章号1–11、13–16；用户要求笔记直接读原始PPT/PPTX/DOCX（包括图、Office数学和备注），不得从逐页Markdown二次生成。逐页提取只用于检索底稿。正式24份体系笔记保留在用户Vault，原件不得修改或放进仓库/public。
- 课堂来源与5份官方大纲来源分开。26项新增任务用 `sources: ['classroom']`，`classroom.ts`只保存18份文件名、页数和17组主题映射。入口由 `ClassroomScene` 持有，不恢复React课件系统；`CourseScene`可携带课堂返回上下文，其他入口进入课堂专属任务也要显示页码来源。
- 课件定义优先于名称惯例：LIS按本课件是不减 `<=`；骨牌是固定顺序全牌翻面、最大化相邻接触数乘积和；双价格市场允许亏损且i<=j；MAX-3-SAT期望7/8要求每子句3个不同变量。钢条单侧递推与对称拆分等价，不照抄原课件第11页的错误否定。
- 中间快照的集合必须密集，空位用明确对象；`Array(n).map`不会访问holes。错误值、未决格和反向残量应明确区分。DFS、点双连通、EK/Dinic等相邻方法不得冒充同一课堂算法。
- 当前合计130任务。运行全部260输入路径、文字/遮罩/公式检查和课堂17组导航检查，同时看真实截图；仅矩形不相交不能证明树层级或完整分组足够清晰。

## 自由实验台（2026-10-25，第二轮）

- `simulation/experiment-{graphs,knapsack,reduction}.ts` 的纯适配器经 `sim.ts` 统一导出，是四自由样板的规则；指定策略操练保留不同任务语义，不机械转译旧日志。React 不持有算法状态。
- `ExperimentScene` 同位切换当前/预计图与 KaTeX 读数，预计增加量单列；预览不改权威状态或成本。对象影响 targets 与命中 hitTargets 可分离；依赖格优先于改选，教授节点编辑名单、源顶点选择见证。
- `experiment-session.ts` 保存规范输入、命令与游标，回退保留未来，分歧/改输入留下一个 A 对照。固定与活动分支身份不得相同，坏存档备份成功后才能覆盖。分支最多1000命令、本地事件最多2000，不上传。
- 结论分为可行性、策略、实例校验/证书与成本；偏离策略不冒充完整算法证明。DP 手动次优值及受其影响的自动值必须标记未获OPT校验，编辑前行使后行失效。归约的单集合映射见证与整实例存在性YES/NO不同必须区分。
- `algorithmia-lab-exposure-v2` 的同实例暴露/完成标记单调；自由预览匹配挑战输入也要暴露。旧独立与新版V2分别展示，撤销、重开、模式切换与刷新不能洗掉提示。
- 运行11个自由实验场景及真实指针fixture，覆盖反向撤流、割S/T、任意DP格、名单修订、分支、输入草稿、键盘、销毁与减少运动；再跑130×2课程和原三策略样板。详见 `docs/INTERACTION-ROUND2.md`。

- TraceView 的尺寸测量必须与实际字体（至少14px）、字重和换行宽一致；数值条的说明也可能多行，不能只给字符串卡片预留高度。图/矩阵并列或堆叠的测量与绘制分支须一致。
- 实体移动在全帧排完后统一判断扫过区域；相撞或越遮罩时保留id与箭头并直接就位，安全路径可动画。边权/残量caption必须能调用同一edge动作，caption的测试id用edge-label，避免与透明边线重复。
- Pixi mask的getBounds可能为空；审计用getLocalBounds转世界坐标，交集宽高必须非负。矩阵双轴分页必须覆盖笛卡尔积，非整除尾页也要严格前后可逆；运行trace-view-pagination.test.mjs。
