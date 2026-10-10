# CLAUDE.md · 星笺

本仓库的 AI 操作守则全部在 **[`AGENTS.md`](./AGENTS.md)**。这个文件只是入口。

**请先读 `AGENTS.md`**，改界面时再读 [`DESIGN.md`](./DESIGN.md)。

## ⛔ 组件库使用规约（最高优先级）

**所有界面设计必须使用组件库里已有的组件。** 动手前先查 `DESIGN.md` 第 7 节和
`src/pages/Components/registry.ts`；**不得乱改** `src/components/ui/*` 的既有行为，
**不得乱加**新组件；**组件库里没有实现的，先问用户再决定怎么做，不要自己造或拿别的凑。**

四个最容易被忽略、代价最大的点：

1. **`npm run shell` / `npm run electron:run` 在 DSH 会话内起不来**（`0x80000003`），
   那是环境限制不是代码问题。会话内验证界面用「dev server + 无头浏览器截图」。
   用户侧只需双击仓库根目录的 **`start.bat`**。
2. **Vite 命令必须走 `scripts/vite-with-local-tmp.mjs`**，别改回裸 `vite build` ——
   esbuild 会因系统 TEMP 权限在最后一步整体失败。
3. **`src/components/ui/*` 的外观全部来自 `global-*.scss`**，Tailwind 类只管布局。
   别删 SCSS，也别把 Tailwind 换成 `@tailwindcss/vite`。
4. **改界面之前先读 `DESIGN.md`。** 颜色和尺寸只从 `src/styles/theme.css` 取，
   不要新造色值。

项目名称：中文 **星笺**，英文 **Hoshimi**。目录名 `Zhibenjia` 是历史遗留，和品牌无关。
