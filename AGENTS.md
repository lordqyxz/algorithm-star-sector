# Algorithm Animation Studio Rules

## Architecture decision principles (2026-09, binding)

- 追求"最优雅地实现最终目的"，不为兼容旧代码/旧架构扭曲新设计。旧实现只有在恰好符合目标架构时才保留；迁移时允许删除，不做双轨兼容层。
- 技术选型只看主要矛盾（职责边界与状态所有权归属），包体、语料、下载量等次要矛盾在架构定案后再权衡，不得反向扭曲架构结论。
- 站点 = 星域游戏 + 航行日志 + 关卡星图。游戏模式（算法星域，星际航行主题）的表现层与场景/输入/循环归 PixiJS（`pixi.js`，版本见 package.json）所有：游戏内不得把 React 作为游戏状态的持有者或渲染者；React 只保留站点外壳（HUD/航行日志/星图弹层）。
- 确定性模拟（`src/game/sim.ts` 纯函数 + 命令日志）是玩法规则的唯一权威，独立于任何渲染方案；撤销 = 日志回滚，进度存档走 localStorage。
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
