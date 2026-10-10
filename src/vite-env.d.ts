/// <reference types="vite/client" />

/*
 * 全局类型声明。
 *
 * 1) ipcRenderer —— preload.cjs 通过 contextBridge 注入给页面的。
 *    这里**不写 `import('electron').IpcRenderer`**，因为渲染进程的依赖里并没有 electron
 *    （electron 装在 electron/ 子包里），引它会解析失败。手写一个够用的最小接口。
 *
 * 2) updateLoadingProgress —— index.html 里的启动画面脚本挂到 window 上的。
 */

export interface IpcRendererLike {
  send: (channel: string, ...args: unknown[]) => void;
  invoke: (channel: string, ...args: unknown[]) => Promise<unknown>;
  on: (channel: string, listener: (event: unknown, ...args: unknown[]) => void) => () => void;
  once: (channel: string, listener: (event: unknown, ...args: unknown[]) => void) => void;
  off: (channel: string, listener: (event: unknown, ...args: unknown[]) => void) => void;
  removeListener: (channel: string, listener: (event: unknown, ...args: unknown[]) => void) => void;
  removeAllListeners: (channel: string) => void;
}

declare global {
  interface Window {
    ipcRenderer: IpcRendererLike;
    desktop: {
      platform: string;
      minimize: () => void;
      toggleMaximize: () => void;
      close: () => void;
      isMaximized: () => Promise<boolean>;
      setThemeColor: (color: string) => void;
      onMaximizeChange: (callback: (value: boolean) => void) => () => void;
    };
    updateLoadingProgress?: (percent: number, step?: string) => void;
  }
}
