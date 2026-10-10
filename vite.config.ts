import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));

/*
 * ⚠️ Tailwind 走 **PostCSS 插件**（`@tailwindcss/postcss`，见 postcss.config.mjs），
 *    而不是官方的 `@tailwindcss/vite`。
 *
 * 原因：`src/styles/global-*.scss` 里有大量 `@apply`，而这几个文件**不是历史包袱** ——
 *    它们就是组件皮肤的本体：
 *      global-components.scss  36KB  `.dd-*`   （表单 / 表格 / 标签 / 卡片…的皮肤）
 *      global-button.scss      13KB  `.btn-*`  （按钮体系）
 *      global-form.scss         4KB  `.form-*`
 *    `src/components/ui/*` 里的 Tailwind 类只管布局和间距，颜色 / 边框 / 悬浮态 / 圆角
 *    全部来自这些 SCSS。删掉它们，21 个 UI 组件会失去全部外观。
 *
 * Vite 会先让 CSS 插件处理、再做预处理器转换，Tailwind 拿到的还是含 SCSS 语法的内容，
 * 直接报 "Invalid declaration: `@apply ...`"。PostCSS 在 Vite 里跑在预处理器**之后**，
 * 拿到的已经是编译好的 CSS，`@apply` 正常。
 *
 * 结论：只要 `src/styles/*.scss` 还在，就必须是 PostCSS 路线，**不能**换成 @tailwindcss/vite。
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(root, "src") },
    extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
  },
  server: {
    host: true,
    port: 5173,
    strictPort: false,
    open: false,
    /*
     * ⚠️ 必须忽略这几个目录，否则 dev server 会被"文件被占用"整个搞崩。
     *
     * 实测踩到过：Chrome 在项目里留了个 user-data-dir（.chrome-tmp），Vite 的 watcher
     * 去监听 Chrome 正锁着的 session 文件，抛 EBUSY，dev server 直接 exit 1：
     *     Error: EBUSY: resource busy or locked, watch '...\.chrome-tmp\Default\Sessions\...'
     * 关键在于这个错误发在 FSWatcher 的 'error' 事件上、没人接，
     * 所以是**进程级崩溃** —— 浏览器里只看到连接断开，只有终端有一行报错，很难查。
     *
     * dist/ 和 electron/release/ 也一并忽略：它们是构建产物，
     * `npm run build` 会在 dev server 跑着的时候重写它们，监听纯属浪费。
     */
    watch: {
      ignored: ["**/.build-tmp/**", "**/.chrome-tmp/**", "**/dist/**", "**/electron/release/**"],
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    chunkSizeWarningLimit: 800,
  },
});
