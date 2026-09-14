# 移除沙盘课件 + 游戏文案全面星际化 + 文案常量化（国际化基础）

## 叙事总纲（新统一世界观）

玩家从任务控制中心出发逐段点亮太阳邻域——「舰长」是航程中段的授衔成就（天狼星里程碑），不是初始身份。每个航段是一类舰务，通关即里程、晋升与换装，成就感由「军衔 + 引擎 + 奖章 + 光年」四条可见进度承载：

- **出航整备**（插入排序三关）：为聚变反应堆整备**燃料棒**——按功率在**整备轨**上排好：抓取、比对、右移、放回空槽；**机械臂**夹持当前棒。
- **自动整备**（TRAPPIST-1 指挥关）：四个动作编成**指令模块**程序交给自动整备机；循环模块 = 轨道共振链。
- **光谱定位**（巴纳德探测关）：候选星表已按光谱排好，每次探测排除一半，⌈log₂n⌉ 次锁定位置（二分查找 = 定位）。
- **星流汇合**（昴星团归并关）：两股按光度排好的恒星流汇合成一列——光度小者先入列（归并）。

## 军衔 / 引擎交叉升级线（用户定版阶梯，常量化）

10 级军衔 + 10 级引擎，门槛严格交替：晋升一档 → 换装一档。引擎最大航速与航段距离成正比、逐档递增：聚变纪元（亚光速，冬眠航行计时）→ 反物质引擎触及 1c 亚光速极限 → 折跃纪元（首次超光速）→ 虚空纪元。当前 6 航段（金章累计 528.5 ly）覆盖至「星河传奇 + 虚空引擎」，后三档为盖亚/巡天 DLC 预留。

| 门槛 | 事件 | 常量 | 中文词表 | 航速 |
|---|---|---|---|---|
| 0 ly | 初始 | R01 + E01 | 学徒 / 聚变反应堆·待命点火 | 0.1c |
| 1.3 ly | 晋升 | R02 | 资深学徒 | — |
| 2.2 ly | 换装 | E02 | 聚变反应堆·巡航功率 | 0.2c |
| 4.24 ly | 晋升 | R03 | 领航员·机械师（首航认证） | — |
| 5.5 ly | 换装 | E03 | 聚变冲压引擎 | 0.3c |
| 8.6 ly | 晋升 | R04 | 舰长（圣堂武士授衔） | — |
| 10 ly | 换装 | E04 | 反物质引擎（亚光速极限） | 1c |
| 16 ly | 晋升 | R05 | 高阶圣堂武士 | — |
| 20 ly | 换装 | E05 | 折跃引擎（首次超光速） | 10c |
| 30 ly | 晋升 | R06 | 舰队执行官 | — |
| 35 ly | 换装 | E06 | 相位折跃引擎 | 40c |
| 50 ly | 晋升 | R07 | 黄金舰队统帅 | — |
| 60 ly | 换装 | E07 | 星门折跃引擎 | 100c |
| 100 ly | 晋升 | R08 | 执政官 | — |
| 150 ly | 换装 | E08 | 虚空引擎 | 300c |
| 400 ly | 晋升 | R09 | 星河传奇 | — |
| 800 ly | 换装 | E09 | 母舰级虚空核心 | 5,000c |
| 2.6 万 ly | 晋升 | R10 | 万星领主 | — |
| 10 万 ly | 换装 | E10 | 暗物质虚空引擎 | 5 万c |

`xp.ts` 里程碑表只存 `{ at, kind: 'rank' | 'engine', id: 'R02' | 'E04' }`；新增 `rankOf(ly)` / `engineOf(ly)` / `eventsBetween(oldLy, newLy)`。中文词表存于新模块（见 Part C），军衔词条含称号与注解，引擎词条含名称与最大航速。

## Part A：移除沙盘课件系统

**删除**：`src/lessons/`（21 个课件）、`src/engine/`（TracePlayer/events/trace）、`src/hooks/`（两个 hook）；`src/components/` 中 ArrayView、CalcDesk、CompareJudge、ComplexityProfile、DesignNotes、ExamplePicker、Formula、FormulaReadout、LessonIcon、LessonShell、LegendStrip、MoveCallout、PlaceholderLesson、PredictionPrompt、PseudoCode、StabilityExample；`src/components/ui/`（shadcn 四件套）与 `src/lib/utils.ts`；`src/content.ts`；`docs/演示数据格式.md`。

**修改**：
- `src/App.tsx`：删除 lessonRegistry、课件路由、lesson-page 分支；视图只剩 星域 / 航行日志 / 星图导航。
- `src/components/VoyageLog.tsx`：删除「研究档案·沙盘推演」段与 onOpenLesson/chapterCatalog/LessonIcon；「指挥官档案」改「舰长档案」，军衔与舰载引擎独立成档。
- `src/game/types.ts`：删除 `lesson` 字段与 `insight?: DesignInsight`；`levels.ts` 同步删去这两字段数据。
- `src/game/sim.ts`：删除无人消费的 `commandLabels`。
- `package.json`：移除 `katex`、`@radix-ui/react-{progress,slot,tabs}`、`class-variance-authority`、`clsx`、`tailwind-merge`、devDep `shadcn`；`pnpm install` 刷新锁定文件。
- `src/index.css`：剪除失效选择器（lesson-shell/example-picker/formula/tree/home-page/ui-button/ui-card/ui-tabs/crumb/voyage-chapter/voyage-archives 等），保留 shell/hud/game/voyage/star-map/footer。
- `AGENTS.md`：改写与已删课件冲突的章节；新增两条约定——「站点=星域游戏+航行日志+关卡星图」「文案一律经 `locale.ts` 词表，场景与关卡数据不写死中文」。

## Part B：星图导航 → 关卡星图

`StarMapNav.tsx` 改为读取 `gameLevels` + `loadSave()`：中心枢纽 = 算法星域，6 个关卡节点按真实距离（ly 对数半径、角度均分）排布，节点显示关卡名与奖章状态；点击 → 关闭弹层并进入星域游戏。CSS 节点类型 hub/leg 适配。

## Part C：词表模块 + 文案星际化（常量化实现）

**新模块 `src/game/locale.ts`**（国际化基础）：
- `export const zh = { rank: { R01: { title: '学徒', note: '…' }, … }, engine: { E01: { name: '聚变反应堆·待命点火', speed: '0.1c' }, … }, medal: { gold: '金章', … }, ui: { pick: '抓取下一根', compare: '与左邻比对', … }, level: { 'insertion-01': { title, destination, brief }, … }, variant: { 'insertion-01-base': { label, detail }, … }, prediction: { 'insertion-01-base': { prompt, options, explanation }, … }, hud: { … } } as const`
- `t(key, vars?)` 轻量取词函数（支持 `{n}` 插值，如 `t('ui.sortedCount', { n, m })` →「已整备 2 / 6」）；键类型由 `typeof zh` 推导，拼错键名 typecheck 直接报错。
- 场景、关卡数据、结算文案中所有面向用户的中文一律改为常量键，中文只存在于 `locale.ts`；动态数字用插值。

**逐文件改写**（按术语映射：货架→整备轨、牌→燃料棒、洞→空槽、手→机械臂、拿起→抓取、比较→比对、放下→放回、整理→整备、指令卡→指令模块、取牌→取星、"谁小谁先走"→"光度小者先入列"、课堂混合→混合装填、训练营→出航演习、小精灵→自动整备机、肌肉记忆→航行本能、分拣→整备、合并队列→星流汇合、金/银/铜牌→金/银/铜章；算法术语如插入排序/二分查找/循环不变量保留）：
- `levels.ts`：只留纯数据（cells/par/ly/id），brief/title/label/detail/prediction 全部迁入词表。
- `MapScene.ts`：首句改"出航前为聚变反应堆整备燃料棒，航程中以恒星光谱定位……"；任务控制段落改"绿色整备区……抓起新棒、放回正确空槽……"；`[指令卡]`→`[指令程序]`；右上角「军衔 + 引擎（最大航速）」读数；全部文案走词表。
- `LevelScene.ts`：按钮 抓取下一根 [P]/与左邻比对 [C]/右移一格 [S]/放回空槽 [D]；「手」→「机械臂」；状态句、计数「已整备 N/M」、结算走词表+插值。
- `CommandScene.ts`：cardTheme 标签改常量（抓取/比对/右移/放回/循环）；「指令模块」「指令数」等走词表；注释小精灵→自动整备机。
- `MergeScene.ts`：左/右股星流、汇合输出、取星、结算（航行本能/光度小者先入列）走词表。
- `ProbeScene.ts`：标题「光谱定位」、brief 补定位叙事；其余微调走词表。
- `sim.ts`：medalNames 改为词表键引用。
- `MapScene/VoyageLog/StarMapNav/App` 的 HUD、档案、页脚等站点文案同样迁入词表。
- `core/level-ui.ts`：`ShelfView` 更名 `CellRowView`，同步 4 个场景。

**括号内容清理**：去掉「任务控制·国科大雁栖湖」「MISSION CONTROL·国科大雁栖湖」「返航 → 地球 · 雁栖湖」等雁栖湖/国科大括号内容（词表中直接不写；页脚版权行除外）。

## 验证

1. `pnpm install` → `pnpm run typecheck` → `pnpm run build`。
2. `pnpm run preview`：桌面与窄宽度检查 HUD 三入口、关卡星图、舰长档案/地图军衔与引擎随存档变化、6 关完整步径、金章首航结算页连出 3 行庆祝（资深学徒/巡航功率/领航员·机械师）、金章天狼段出现「晋升！舰长——授圣堂武士衔」+「反物质引擎（1c）」换装、金章昴星团后达星河传奇+虚空引擎、铜/银章里程碑数少于金章、撤销/重开/存档、控制台无错误。
3. grep 复查：无 `@/lessons|@/engine|@/hooks|@/content|DesignNotes` 残留引用；`src/game/scenes`、`levels.ts`、`xp.ts` 无写死中文文案（词表外仅允许注释）；正文无「雁栖湖/国科大」括号残留。

注：`src/game/core/app.ts` 现存未提交改动（autoDensity）与本任务无关，保持原样不并入。