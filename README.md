# 算法星域 · Algorithm Star Sector

把经典算法画出来、玩出来、推导出来的教学站点。以真实天文学航段为进度载体：
从比邻星到 TRAPPIST-1，每一关都是一段真实光年航程。

## 两大模式

- **算法星域（游戏）**：PixiJS 原生闯关——操演关亲手执行插入排序的每个动作，
  指挥关用指令卡把动作写成程序（循环卡是省卡的关键）；航行里程（光年）与
  称号由真实天文距离折算。
- **学院沙盘（推演）**：21 个沙盘推演走统一 trace 引擎（算法生成器 → 事件流 →
  演示数据 → 唯一渲染器），每个沙盘含实时计数器、伪代码行联动、不变量、
  预测门、设计思路面板与最好/平均/最差复杂度卡。

## 技术栈

React 19 · TypeScript · Vite · PixiJS 8 · Anime.js 4 · KaTeX · Tailwind 风格 shadcn/ui 组件

## 开发

```bash
pnpm install --frozen-lockfile
pnpm run dev        # 开发
pnpm run build      # 构建
pnpm run preview    # 预览构建产物
```

## 天文数据与图片来源

- 天文距离与事实依据：NASA / ESA / Gaia DR3 公开资料
- 关卡/星野视觉：程序化生成；可在 `public/astro/` 放入自定义天文图（见该目录 README）

## 许可

[CC BY-NC 4.0](./LICENSE) —— 署名-非商业性使用：转载与改编必须署名，严格禁止商用。

© 2026 shiyz（中国科学院大学 UCAS）· GitHub [@lordqyxz](https://github.com/lordqyxz)
