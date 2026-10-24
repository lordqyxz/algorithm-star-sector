# 算法星域 · Algorithm Star Sector

以深空航行为视觉背景的数据结构与算法学习站点。课程按国科大五份官方大纲的并集组织为 15 个知识星域、104 个任务；每项任务提供两组输入、实际算法状态、分步前进与回退、预测校验，以及本地进度保存。

[在线访问 · GitHub Pages](https://lordqyxz.github.io/algorithm-star-sector/)

## 课程与使用

- **星域总览**：选择知识星域，查看可探索的任务。
- **课程航线**：从线性结构、串、查找、树与图，进入内存管理、内外排序、分治、贪心、动态规划、搜索、复杂性与优化方法。
- **原理与论证**：在任务中阅读适用条件、不变量、推导和反例；含论证内容的任务另设迁移校验。
- **航行日志**：查看完成的示例任务与原有航行记录。
- **首航实战**：保留原有六段操作、探测、指令编排和星流汇合游戏。

任务是有明确输入范围的可计算教学示例。走完示例不等于掌握整个知识主题，测试通过也不等于任意输入的正确性证明。各主题的来源、实现方式、理论说明与边界分别记录在 [课程矩阵](docs/CURRICULUM.md) 和 [覆盖审计](docs/COVERAGE-AUDIT.md)。

## 官方课程依据

| 课程 | 教师 | 编码与大纲 |
| --- | --- | --- |
| 数据结构与算法分析 | 沈海华 | [B2011020Y](https://jwba.ucas.ac.cn/sc/course/courseplan/234252) |
| 数据结构 | 沈海华 | [B0911002Y](https://jwba.ucas.ac.cn/sc/course/courseplan/195087) |
| 算法设计与分析 | 马丙鹏 | [B0912009H](https://jwba.ucas.ac.cn/sc/course/courseplan/291532) |
| 计算机算法设计与分析 | 刘玉贵 | [180086085405P2002Y](https://jwba.ucas.ac.cn/sc/course/courseplan/294011) |
| 计算机算法设计与分析 | 张宝贤 | [180206085410P2003Y-02](https://jwba.ucas.ac.cn/sc/course/courseplan/294042) |

页面未统一声明适用学年，因此不把不同课程合称某一学年的最新版大纲。

## 本地运行与检查

使用 Node.js 24.20.0 与 pnpm 11.22.0：

```bash
pnpm install --frozen-lockfile
pnpm run dev
pnpm run typecheck
pnpm run test
pnpm run build
pnpm run preview --host 127.0.0.1
```

`test` 使用 Node 自带测试运行器，核验算法数值与结构不变量、独立小规模基准、确定性、课程词条、全部输入轨迹的形状与标识。

如安装了 Playwright CLI，可以在预览服务运行时执行浏览器全任务检查：

```bash
node --import ./tests/register.mjs tests/export-browser-catalog.mjs
playwright-cli -s=verify open http://127.0.0.1:4173 --browser=chromium
playwright-cli -s=verify --raw run-code --filename=.playwright-cli/browser-checks.generated.js
```

该检查在独立浏览器会话中操作所有任务的两组输入，执行预测、前后步与存档核验，并等待动画结束后检查错误。它会清除该测试会话中本站的课程进度。

## 架构与部署

React 负责站点外壳、日志和原生对话框；PixiJS 负责课程导航、游戏状态、图形、输入与生命周期。确定性规则从 `src/game/sim.ts` 统一导出，分领域实现位于 `src/game/simulation/`。所有中文运行时词条集中在 `src/game/locale.ts`。

公式由本地 KaTeX 生成 HTML 与 MathML，含方法关系和当前轨迹读数。32 个任务提供分段论证笔记与终帧迁移题。当前视觉验收以桌面为主；矩阵、长输出和理论说明支持分区与翻页。

项目生成纯静态 `dist/`，支持子目录部署。GitHub Pages 工作流运行冻结依赖安装、类型检查、算法测试和生产构建；默认分支推送或手动触发时发布。

视觉规范见 [DESIGN.md](docs/DESIGN.md)，主视觉的生成说明和最终提示词见 [素材说明](public/art/README.md)。

## 许可

[CC BY-NC 4.0](LICENSE)。转载与改编须署名，禁止商用。

© 2026 shiyz（中国科学院大学 UCAS）· [GitHub @lordqyxz](https://github.com/lordqyxz)
