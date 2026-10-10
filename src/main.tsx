import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { App } from "./App";
import "./index.css";

/*
 * 入口。
 *
 * 1. **HashRouter**：Electron 生产环境用 app:// / 开发时也兼容；file:// 下无 HTTP 重写。
 * 2. **启动画面**：index.html 推到 10%；真正收掉在 App 里 hydrate IndexedDB 之后
 *    （见 storage/boot.ts），避免账本还没读完就闪空列表。
 */
window.updateLoadingProgress?.(15, "正在启动…");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
);
