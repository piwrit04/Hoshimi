import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { App } from "./App";
import "./index.css";

/*
 * 入口。
 *
 * 两个刻意的选择：
 *
 * 1. **HashRouter 而不是 BrowserRouter**。
 *    Electron 生产环境用 file:// 加载页面，没有 HTTP 服务器来把
 *    /characters 这种路径重写到 index.html。用 BrowserRouter 的结果是
 *    刷新或深链接直接白屏。HashRouter 把路由放在 # 后面，file:// 下也能工作。
 *
 * 2. 加载画面在 React 挂载后立刻收掉。
 *    index.html 里那段脚本已经把进度推到 10%，这里推到 100% 再淡出。
 */
const loading = document.getElementById("loading-screen");
if (loading) {
  window.updateLoadingProgress?.(100, "准备就绪");
  loading.classList.add("hidden");
  setTimeout(() => loading.remove(), 600);
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
);
