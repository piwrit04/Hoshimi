// Preload：把窗口控制能力以**工具箱期望的形状**暴露给页面。
//
// 为什么是 ipcRenderer 而不是自定义 API：
//   标题栏组件（components/layout/TitleBar.tsx）是从工具箱原样抄过来的，里面写的是
//       window.ipcRenderer.send('window-minimize')
//   按"不改抄过来的组件"这个要求，适配要发生在这一层 —— 由 preload 提供它期望的形状，
//   而不是回头去改标题栏。
//
// contextIsolation 打开、nodeIntegration 关闭，页面拿不到 Node。
const { contextBridge, ipcRenderer } = require("electron");

const noop = () => {};
const on = (channel, listener) => {
  const handler = (_event, ...args) => listener(_event, ...args);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
};

contextBridge.exposeInMainWorld("ipcRenderer", {
  // 通用透传（工具箱的 window-drag.ts 会用它做窗口拖拽/定位）
  send: (channel, ...args) => ipcRenderer.send(channel, ...args),
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  on,
  off: (channel, listener) => ipcRenderer.removeListener(channel, listener),
  removeListener: (channel, listener) => ipcRenderer.removeListener(channel, listener),
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
  once: (channel, listener) => ipcRenderer.once(channel, (_event, ...args) => listener(_event, ...args)),
});

// 保留一份给"新写的"代码用的、语义清楚的 API（不冲突，页面爱用哪个用哪个）
contextBridge.exposeInMainWorld("desktop", {
  platform: process.platform,
  minimize: () => ipcRenderer.send("win:minimize"),
  toggleMaximize: () => ipcRenderer.send("win:toggle-maximize"),
  close: () => ipcRenderer.send("win:close"),
  isMaximized: () => ipcRenderer.invoke("win:is-maximized"),
  setThemeColor: (color) => ipcRenderer.send("win:theme-color", String(color)),
  onMaximizeChange: (callback) => {
    const handler = (_event, value) => callback(Boolean(value));
    ipcRenderer.on("win:maximized", handler);
    return () => ipcRenderer.removeListener("win:maximized", handler);
  },
});

void noop;
