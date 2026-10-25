# 算法星域 · Algorithm Star Sector

以深空航行为视觉背景的数据结构与算法学习站点。保留按国科大五份官方大纲组织的 104 项任务，并依据真实课堂课件新增 26 项推演，合计 130 项、15 个知识星域。每项任务提供两组输入、实际算法状态、分步前进与回退、预测校验，以及本地进度保存。

[在线访问 · GitHub Pages](https://lordqyxz.github.io/algorithm-star-sector/)

## 课程与使用

- **星域总览**：选择知识星域，查看可探索的任务。
- **课堂主线**：按真实课件的 15 个章节及作业、试题进入 17 组主题；卡片和任务内标注物理页码，返回时保留课堂章节。第 12 章没有原始附件，未编造内容。
- **课程航线**：从线性结构、串、查找、树与图，进入内存管理、内外排序、分治、贪心、动态规划、搜索、复杂性与优化方法。
- **原理与论证**：在任务中阅读适用条件、不变量、推导和反例；含论证内容的任务另设迁移校验。
- **航行日志**：查看完成的示例任务与原有航行记录。
- **自由实验室**：Dijkstra、0/1 背包、最大流、顶点覆盖→审稿委员会构造提供预计/当前切换、真实对象点击、有界输入编辑、保留未来的回退与 A/B 分支；可保留合法但较差的选择，分别观察可行性、策略、结论和实际成本。
- **互动操练**：Dijkstra、0/1 背包和最大流提供真实图形操作、演示／操练／挑战、两级提示、撤销、改参数比较和独立学习记录。
- **首航实战**：保留原有六段操作、探测、指令编排和星流汇合游戏。

任务是有明确输入范围的可计算教学示例。走完示例不等于掌握整个知识主题，测试通过也不等于任意输入的正确性证明。各主题的来源、实现方式、理论说明与边界分别记录在 [课程矩阵](docs/CURRICULUM.md)、[覆盖审计](docs/COVERAGE-AUDIT.md) 和 [课堂对照](docs/CLASSROOM-COVERAGE.md)。[294042 单独复核](docs/REVIEW-294042.md)记录的综合自测缺口仍保留。原始课件及 24 份体系化 Obsidian 笔记留在私有 Vault，不进入仓库或站点构建。

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

可再检查桌面画布中真实文字边界、遮罩裁切与公式溢出：

```bash
node --import ./tests/register.mjs tests/export-browser-catalog.mjs --layout
playwright-cli -s=verify --raw run-code --filename=.playwright-cli/browser-layout-audit.generated.js
```

默认检查 1280px 桌面。可在生成时通过 `SITE_URL` 指定线上地址、`VIEWPORT_WIDTH` 指定其他桌面宽度。仍使用独立测试会话，并清除该会话的课程进度。

课堂导航另核对 17 组、20 页列表、逐任务引用及返回上下文，并用真实指针点击主入口：

```bash
node --import ./tests/register.mjs tests/export-classroom-checks.mjs
playwright-cli -s=verify --raw run-code --filename=.playwright-cli/classroom-checks.generated.js
```

生成时同样支持 `SITE_URL` 与 `VIEWPORT_WIDTH`（本轮检查 1280／1440）。


三个互动样板另有完整操作和真实指针检查：

```bash
node --import ./tests/register.mjs tests/export-lab-checks.mjs
playwright-cli -s=verify --raw run-code --filename=.playwright-cli/lab-checks.generated.js
playwright-cli -s=verify --raw run-code --filename=.playwright-cli/lab-pointer.generated.js
```

生成时可用 `SITE_URL` 指定线上站点。该测试会清除独立测试会话中的互动操练记录。设计、输入范围和核验说明见 [INTERACTIVE-LABS.md](docs/INTERACTIVE-LABS.md)。

四个自由实验样板的操作、分支、刷新与真实指针检查：

```bash
node --import ./tests/register.mjs tests/export-experiment-checks.mjs
playwright-cli -s=verify --raw run-code --filename=.playwright-cli/experiment-checks.generated.js
playwright-cli -s=verify --raw run-code --filename=.playwright-cli/experiment-pointer.generated.js
```

生成时支持 `SITE_URL` 和 `VIEWPORT_WIDTH`（1280／1440）。该检查清除测试会话的自由实验记录。原操练记录继续保留；挑战暴露跨重开与刷新保持，新旧独立判定分别记录。设计与实现边界见 [第二轮实验台](docs/INTERACTION-ROUND2.md) 与 [验证记录](docs/ROUND2-VERIFICATION.md)。

## 架构与部署

React 负责站点外壳、日志和原生对话框；PixiJS 负责课程导航、游戏状态、图形、输入与生命周期。确定性规则从 `src/game/sim.ts` 统一导出，分领域实现位于 `src/game/simulation/`。所有中文运行时词条集中在 `src/game/locale.ts`。

公式由本地 KaTeX 生成 HTML 与 MathML，含方法关系和当前轨迹读数。53 个任务提供分段论证笔记与终帧迁移题。当前视觉验收以桌面为主；矩阵、长输出和理论说明支持分区与翻页。

项目生成纯静态 `dist/`，支持子目录部署。GitHub Pages 工作流运行冻结依赖安装、类型检查、算法测试和生产构建；默认分支推送或手动触发时发布。

视觉规范见 [DESIGN.md](docs/DESIGN.md)，主视觉的生成说明和最终提示词见 [素材说明](public/art/README.md)。

## 许可

[CC BY-NC 4.0](LICENSE)。转载与改编须署名，禁止商用。

© 2026 shiyz（中国科学院大学 UCAS）· [GitHub @lordqyxz](https://github.com/lordqyxz)
