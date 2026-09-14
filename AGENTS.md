# Algorithm Animation Studio Rules

## Architecture decision principles (2026-09, binding)

- 追求"最优雅地实现最终目的"，不为兼容旧代码/旧架构扭曲新设计。旧实现只有在恰好符合目标架构时才保留；迁移时允许删除，不做双轨兼容层。
- 技术选型只看主要矛盾（职责边界与状态所有权归属），包体、语料、下载量等次要矛盾在架构定案后再权衡，不得反向扭曲架构结论。
- 游戏模式（算法星域，星际航行主题）的表现层与场景/输入/循环归 PixiJS（`pixi.js`，版本见 package.json）所有：游戏内不得把 React 作为游戏状态的持有者或渲染者，React 只保留学院/沙盘（文档型页面）与站点外壳。
- 确定性模拟（`src/game/sim.ts` 纯函数 + 命令日志）是玩法规则的唯一权威，独立于任何渲染方案；撤销 = 日志回滚，进度存档走 localStorage。

## Scope

- `Algorithm/` is a standalone React + Vite static website. Source code belongs in `src/`; build output belongs in `dist/` and is never hand-edited.
- The website no longer depends on Obsidian runtime features. Do not add frontmatter, wikilinks, `html-embed`, Mermaid embeds, or Obsidian-only APIs to `src/`.
- Existing `.md` notes and legacy HTML animations remain migration references until the React lessons reach content and interaction parity. Do not delete them during routine feature work.

## Dependency and package rules

- Use pnpm 11.22.0 and commit `pnpm-lock.yaml`. Do not create or keep `package-lock.json` or `yarn.lock`.
- All direct dependency versions in `package.json` must be exact. Do not use `^`, `~`, `latest`, canary, or experimental React releases.
- React and `react-dom` must remain on the same exact version. A dependency upgrade is a deliberate change: update `package.json`, run `pnpm install`, and run typecheck/build.
- Anime.js is imported from the locked local package. Do not reintroduce CDN script tags or use Anime.js v3 APIs.
- shadcn/ui components are source-owned under `src/components/ui/`; use only the primitives the site needs. Do not run a generator or upgrade shadcn implicitly.
- shadcn/ui has no runtime package version in this project; the source component style is `new-york` in `components.json`. If the CLI is used to add a component, use the exact locked `shadcn@4.21.0` dev dependency and review the generated diff.
- Formula authoring uses LaTeX source strings rendered by the shared `src/components/Formula.tsx` KaTeX component. Keep mathematical notation out of hand-built JSX markup; use `String.raw` or escaped strings for backslashes, and keep explanatory Chinese prose outside the formula.

## Structure and splitting

- Keep a minimal split: `App.tsx`, `content.ts`, `components/LessonShell.tsx`, `components/ui/*`, and one file per substantial lesson under `src/lessons/`.
- Keep the CLRS chapter map and each lesson's `ready`/`dev` status in `src/content.ts`; a `dev` entry must render a visible placeholder page and `DEV` badge instead of silently disappearing.
- Do not create a new `hooks/`, `types/`, `constants/`, or per-SVG file until at least two lessons share a stable interface and the extraction removes duplication.
- A lesson owns its teaching state and visualization. Shared shell owns title, steps, controls, progress, and accessible interaction only.
- On desktop, `.site-sidebar` and `.site-main` are independent viewport-height scroll containers: the left navigation stays fixed while lesson content scrolls on the right. At the mobile breakpoint, restore ordinary single-column document flow so no content is clipped.
- React state is the source of truth. Anime.js may animate a state-selected visual, but it must not decide algorithm state. Clean timers and animation scopes on unmount.

## Lesson contract

- Every lesson must have a concrete numeric or geometric example, synchronized formula/readout/visual state, step controls, replay, autoplay, keyboard-focusable controls, and a reduced-motion path.
- Every completed algorithm lesson must also show best, average, and worst time complexity with the input condition that produces each case. Sorting lessons must make stability observable with duplicate keys carrying distinct identities (for example `4A` and `4B`), not only state it in prose.
- Algorithm lessons that operate on inputs must expose multiple representative datasets through the shared example picker; changing a dataset must reset the teaching step and recompute all visual/formula state from that dataset.
- Static markup must still communicate the problem, key computation, and conclusion if JavaScript or animation is unavailable.
- Use semantic controls with visible focus, `aria-label` for icon-only controls, and readable Chinese copy for classroom users.

## Teaching animation method

- Design for a learner behavior, not for motion: each major turn should make the learner predict, observe one causal change, identify an invariant, map the change to a formula term, and explain or transfer it.
- Keep object identity across states. Move the actual numbers, points, subproblems, candidates, or bars; do not replace them with unrelated decorative shapes.
- Treat formulas as measurements of the visual state. Every important number in a formula needs a visible source in the diagram or calculation panel.
- Use signaling and spatial/temporal contiguity: highlight the one relation being explained, keep its label beside it, and dim context without hiding it.
- Prefer learner-controlled segmented steps. Autoplay is optional; every state must remain understandable when paused or when motion is reduced.
- All animation controls, including step tabs, previous/next, autoplay/pause, and replay, must use the shared shadcn-style `Button` component. Native buttons remain appropriate for unrelated content choices only when their semantics differ.
- When numbers or identifiable content are exchanged, moved, or routed, show a nearby directional arrow/flow with the actual values or groups. Use a bidirectional arrow for a true swap and a one-way arrow for a one-way partition/merge; a Unicode symbol buried in a formula is not sufficient visual evidence.
- Add one lightweight prediction or self-explanation checkpoint at each major conceptual boundary. Interactions must answer a teaching question; do not add controls only for novelty.
- For the concrete guidance and evidence behind these rules, read `docs/动画绘制方法论.md` before designing a new lesson.

## Verification

- From this directory run `pnpm install --frozen-lockfile`, `pnpm run typecheck`, and `pnpm run build`.
- Before delivery, verify the built site through `pnpm run preview` at desktop and narrow widths. Check lesson switching, every step path, autoplay/replay, reduced motion, and console errors.
- For layout verification, scroll the right content pane and the left navigation independently at desktop, then verify the mobile breakpoint returns to one reachable document flow. For exchange verification, inspect every sorting step that moves data and confirm the value/group flow and arrow direction match the operation.
- Keep the original PPT outside this project and never edit it as part of website work.
