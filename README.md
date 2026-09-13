# Algorithm Animation Studio

这是一个面向课堂的算法动画站，使用 React + Vite 构建，动画用本地锁定的 Anime.js，公式用本地锁定的 KaTeX 渲染，通用交互使用 shadcn/ui 风格组件。

## 当前课程

左侧“算法”菜单按《算法导论》第 4 版的章节组织，当前覆盖基础、分治法、堆排序、快速排序、线性时间排序和顺序统计量等路线。

- **已实现动画**：归并排序、最近点对、主方法、堆排序、快速排序；每个算法都有真实数字或几何状态、公式对齐、预测节点，以及最佳/平均/最差复杂度的条件例子。
- **排序性质**：归并排序用 `4A/4B` 展示稳定性；堆排序和快速排序展示同值元素可能换位的原因。
- **多组输入**：归并排序、最近点对、堆排序、快速排序都提供 4 组可切换样例；切换时会重置步骤和自动播放，并重新计算动画状态。
- **动作可见**：归并的队列→输出、堆排序的根/末尾交换、快速排序的左右分区都用实际数字或数字组配方向箭头；真正交换使用双向箭头。
- **桌面布局**：左侧章节菜单固定并独立滚动，右侧课程区独立滚动；窄屏自动恢复单列文档流。
- **DEV 占位**：尚未制作的算法仍保留在对应章节中，左侧和主页都以 `DEV` badge 标记，点击后进入可分享的空白占位页。
- **课堂首页**：只放学习路线和动画绘制方法；具体算法页不重复堆放站点说明。

## 开发

```bash
pnpm install --frozen-lockfile
pnpm run dev
```

生产构建：

```bash
pnpm run typecheck
pnpm run build
pnpm run preview
```

## GitHub Pages

仓库已配置 `.github/workflows/pages.yml`：每次推送和 Pull Request 都会执行依赖安装、类型检查和生产构建；默认分支的推送以及从默认分支手动触发时，会继续把 `dist/` 部署到 GitHub Pages。

首次使用时，在仓库的 **Settings → Pages → Build and deployment → Source** 中选择 **GitHub Actions**。之后无需提交 `dist/`，直接推送代码即可发布。

## 目录

```text
src/
├── components/
│   ├── ui/              # 选用的 shadcn/ui 源码组件
│   ├── LessonShell.tsx  # 课程公共外壳与控制条
│   ├── Formula.tsx      # LaTeX → KaTeX HTML/MathML 公式渲染
│   └── ExamplePicker.tsx # 多组输入样例切换
├── lessons/             # 每个实质算法一个 lesson
├── App.tsx              # 课程导航与页面组合
├── content.ts           # CLRS 章节路线、课程目录与 ready/dev 状态
└── index.css            # 站点主题与布局
```

`animations/` 与旧的 Obsidian Markdown 笔记暂时作为迁移参考，不参与 React 构建，也不是对外站点入口。对外分享应分享构建后的 `dist/` 静态文件或部署产物。

依赖版本必须写死并由 `pnpm-lock.yaml` 记录；React 与 `react-dom` 必须保持同版本。shadcn/ui 在这里是 `new-york` 风格的源码组件，不是运行时依赖；需要使用 CLI 时锁定 `shadcn@4.21.0`。更完整的目录、动画、拆分和验证规则见 [AGENTS.md](./AGENTS.md)。

动画设计以“预测 → 状态变化 → 公式对齐 → 解释 → 迁移”为基本教学循环，具体绘制规则、研究依据和各类动画的验收标准见 [动画绘制方法论](./docs/动画绘制方法论.md)。
