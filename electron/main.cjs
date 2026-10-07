// 星笺（Hoshimi）· 代肝订单管理系统（桌面版）
//
// 命名约定跟 Cheezit 那套一致：**中文名给用户看，ASCII 名给系统用**。
//   中文名  星笺     → productName / TITLE / 快捷方式名（可以带中文）
//   英文名  Hoshimi  → executableName / 包名 / 各种代码标识
//   app:// 的 host   → hoshimi（必须 ASCII，原因见下面 HOST 那段）
//
// ⚠️ 目录名 `Zhibenjia` 是早期随手起的，和品牌无关，改名单独处理。
//
// 窗口是无边框的，页面自己画最小化 / 最大化 / 关闭按钮 —— 所以标题栏里那些
// -webkit-app-region: drag 才有意义。
//
// 页面通过 app:// 这个自定义协议加载，而不是 file://。原因：
//   · file:// 下 origin 是 null，localStorage 不稳定、相对路径容易错
//   · 自定义协议有稳定的 origin，localStorage 能跨重启保留
//
// 这套壳的做法（自定义协议 + 无边框 + 窗口状态记忆 + 单实例）来自 Cheezit，
// 已经出过安装包，属于验证过的配置。
const { app, BrowserWindow, Menu, ipcMain, nativeTheme, protocol, shell, screen } = require("electron");
const fs = require("node:fs");
const path = require("node:path");

/* ============================================================================
   启动日志
   ============================================================================
   为什么要写文件：Electron 是 GUI 子系统程序，**stdout 不接终端**。
   双击运行时如果主进程崩了，什么都看不到 —— 既没有报错窗口，也没有控制台输出，
   表现就是"点了之后什么都没发生"。所以从第一行就开始往文件里记。

   位置：%APPDATA%\Hoshimi\boot.log
   ========================================================================== */
const BOOT_DIR = path.join(
  process.env.APPDATA || process.env.HOME || ".",
  "Hoshimi"
);
const BOOT_LOG = path.join(BOOT_DIR, "boot.log");

function boot(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  try {
    fs.mkdirSync(BOOT_DIR, { recursive: true });
    fs.appendFileSync(BOOT_LOG, line, "utf8");
  } catch { /* 日志本身不能把启动搞崩 */ }
}

function bootReset() {
  try {
    fs.mkdirSync(BOOT_DIR, { recursive: true });
    fs.writeFileSync(BOOT_LOG, `[${new Date().toISOString()}] === 启动 ===\n`, "utf8");
  } catch { /* ignore */ }
}

bootReset();
boot(`electron ${process.versions.electron} / chrome ${process.versions.chrome} / node ${process.versions.node}`);
boot(`isPackaged=${app.isPackaged} resourcesPath=${process.resourcesPath}`);
boot(`argv=${JSON.stringify(process.argv)}`);

process.on("uncaughtException", (err) => {
  boot(`!! uncaughtException: ${err && err.stack ? err.stack : String(err)}`);
});
process.on("unhandledRejection", (reason) => {
  boot(`!! unhandledRejection: ${reason && reason.stack ? reason.stack : String(reason)}`);
});

// HOST 是 app:// 的 host 段，必须是合法主机名，所以用 ASCII。
// 它决定渲染层的 origin，也就是 localStorage 的归属 —— **改它等于换一套数据**。
//
// 现在用 "hoshimi"，即星笺的干净新身份。备选是沿用 "cheezit"：
// 那样能直接读到 Cheezit 存在 app://cheezit/ 下的老账本（localStorage 键名
// cheezit.ledger.v1），省掉一次导出/导入。但**本仓库目前没有任何读取那个键的
// 代码**（存储层还在 Cheezit 里），所以那份"延续"是纸面上的 —— 真要继承，
// 得先把 Cheezit 的 src/storage 和 domain 搬过来。
// 决定沿用旧身份时，改这一行 + 下面的 userData 目录即可。
const HOST = "hoshimi";
const START_URL = `app://${HOST}/`;
const TITLE = "\u661f\u7b3a"; // 星笺

// 固定成 ASCII 目录名，避免中文路径在打包后出问题
app.setPath("userData", path.join(app.getPath("appData"), "Hoshimi"));
app.setAppUserModelId("app.hoshimi.orders");
boot(`userData=${app.getPath("userData")}`);

protocol.registerSchemesAsPrivileged([
  { scheme: "app", privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } },
]);
boot("registerSchemesAsPrivileged 完成");

// 打包后：resources/app（由 electron-builder 的 extraResources 塞进去）
// 开发时：项目根的 dist/
const webRoot = app.isPackaged
  ? path.join(process.resourcesPath, "app")
  : path.join(__dirname, "..", "dist");
boot(`webRoot=${webRoot}  存在=${fs.existsSync(webRoot)}`);
if (fs.existsSync(webRoot)) {
  try {
    boot(`webRoot 内容=${JSON.stringify(fs.readdirSync(webRoot))}`);
  } catch (e) {
    boot(`读 webRoot 失败: ${e}`);
  }
}

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8",
};

async function serve(request) {
  const url = new URL(request.url);
  const rel = decodeURIComponent(url.pathname).replace(/^\/+/, "");
  let file = path.normalize(path.join(webRoot, rel));
  if (!file.startsWith(webRoot)) return new Response("Forbidden", { status: 403 });  let stat = null;
  try { stat = fs.statSync(file); } catch { /* missing */ }
  if (!stat || stat.isDirectory()) {
    // 带扩展名的找不到就 404；其余路径交给 SPA（交给 index.html）
    if (/\.[a-z0-9]+$/i.test(rel)) return new Response("Not found", { status: 404 });
    file = path.join(webRoot, "index.html");
  }
  const body = await fs.promises.readFile(file);
  return new Response(body, {
    headers: {
      "content-type": TYPES[path.extname(file).toLowerCase()] || "application/octet-stream",
      "cache-control": "no-cache",
    },
  });
}

// ---- 记住窗口大小和位置 ----
const stateFile = () => path.join(app.getPath("userData"), "window-state.json");
function loadBounds() {
  try {
    const b = JSON.parse(fs.readFileSync(stateFile(), "utf8"));
    const area = screen.getDisplayMatching(b).workArea;
    const visible =
      b.x < area.x + area.width - 100 &&
      b.y < area.y + area.height - 100 &&
      b.x + b.width > area.x + 100 &&
      b.y > area.y - 20;
    return visible ? b : { width: b.width, height: b.height, maximized: b.maximized };
  } catch {
    return null;
  }
}
function saveBounds(win) {
  try {
    const maximized = win.isMaximized();
    const b = maximized ? win.getNormalBounds() : win.getBounds();
    fs.writeFileSync(stateFile(), JSON.stringify({ ...b, maximized }));
  } catch { /* ignore */ }
}

let mainWindow = null;

function isInternal(target) {
  try { return new URL(target).protocol === "app:"; } catch { return false; }
}
function openOutside(target) {
  if (/^(https?:|mailto:)/i.test(target)) void shell.openExternal(target);
}
function fromMainWindow(event) {
  return mainWindow && !mainWindow.isDestroyed() && event.sender === mainWindow.webContents;
}

// ---- 窗口控制 ----
// 同时挂两套通道名：
//   win:*        —— 新版语义化命名
//   window-*     —— 工具箱标题栏组件里写死的名字（组件不改，所以这里兼容）
const minimize = (event) => { if (fromMainWindow(event)) mainWindow.minimize(); };
const toggleMaximize = (event) => {
  if (!fromMainWindow(event)) return;
  if (mainWindow.isMaximized()) mainWindow.unmaximize();
  else mainWindow.maximize();
};
const close = (event) => { if (fromMainWindow(event)) mainWindow.close(); };

ipcMain.on("win:minimize", minimize);
ipcMain.on("win:toggle-maximize", toggleMaximize);
ipcMain.on("win:close", close);
ipcMain.on("window-minimize", minimize);
ipcMain.on("window-maximize", toggleMaximize);
ipcMain.on("window-close", close);

ipcMain.handle("win:is-maximized", (event) => (fromMainWindow(event) ? mainWindow.isMaximized() : false));

// 页面告诉主进程当前主题底色，这样窗口在缩放/最大化时闪的那一帧颜色是对的
ipcMain.on("win:theme-color", (event, color) => {
  if (fromMainWindow(event) && /^#[0-9a-f]{6}$/i.test(String(color))) mainWindow.setBackgroundColor(String(color));
});

// 工具箱的 window-drag.ts 会调这两个（自绘标题栏的拖拽）。这里给出安全的空实现，
// 因为主进程已经用 -webkit-app-region: drag 处理拖拽，不需要页面接管。
ipcMain.handle("window-get-position", (event) => {
  if (!fromMainWindow(event)) return [0, 0];
  const [x, y] = mainWindow.getPosition();
  return [x, y];
});
ipcMain.handle("window-set-position", (event, x, y) => {
  if (fromMainWindow(event)) mainWindow.setPosition(Math.round(x), Math.round(y));
  return true;
});

// 工具箱的 App.tsx 启动时会读用户配置
ipcMain.handle("read-user-config", () => ({ setupComplete: true, setupCompleted: true, language: "zh" }));
ipcMain.handle("write-user-config", () => true);
ipcMain.handle("get-default-data-path", () => app.getPath("userData"));
ipcMain.handle("get-app-path", () => app.getAppPath());

function createWindow() {
  const saved = loadBounds();
  mainWindow = new BrowserWindow({
    width: saved?.width ?? 1360,
    height: saved?.height ?? 860,
    x: saved?.x,
    y: saved?.y,
    minWidth: 960,
    minHeight: 640,
    title: TITLE,
    frame: false,
    roundedCorners: true, // Windows 11 才有效果；Win10 本来就是直角
    thickFrame: true,
    // 不用透明窗口：透明无边框窗口在 Windows 上缩放/贴边/最大化都不可靠
    backgroundColor: nativeTheme.shouldUseDarkColors ? "#0c0e12" : "#f8fafc",
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,  // 必须为 false，配合 --no-sandbox
      spellcheck: false,
    },
  });
  if (saved?.maximized) mainWindow.maximize();
  mainWindow.setMenuBarVisibility(false);
  mainWindow.on("page-title-updated", (event) => event.preventDefault());
  mainWindow.once("ready-to-show", () => mainWindow.show());

  const sendMax = () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("win:maximized", mainWindow.isMaximized() || mainWindow.isFullScreen());
    }
  };
  mainWindow.on("maximize", sendMax);
  mainWindow.on("unmaximize", sendMax);
  mainWindow.on("enter-full-screen", sendMax);
  mainWindow.on("leave-full-screen", sendMax);
  mainWindow.webContents.on("did-finish-load", sendMax);
  mainWindow.on("close", () => saveBounds(mainWindow));
  mainWindow.on("closed", () => { mainWindow = null; });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isInternal(url)) return { action: "allow" };
    openOutside(url);
    return { action: "deny" };
  });
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!isInternal(url)) {
      event.preventDefault();
      openOutside(url);
    }
  });

  // F5 / Ctrl+R 刷新，Ctrl+Shift+I 开发者工具
  mainWindow.webContents.on("before-input-event", (event, input) => {
    if (input.type !== "keyDown") return;
    const key = input.key.toLowerCase();
    if (key === "f5" || (input.control && key === "r" && !input.shift)) {
      mainWindow.webContents.reload();
      event.preventDefault();
    } else if (input.control && input.shift && key === "i") {
      mainWindow.webContents.toggleDevTools();
      event.preventDefault();
    }
  });

  void mainWindow.loadURL(START_URL);
  boot(`loadURL 已调用: ${START_URL}`);

  mainWindow.webContents.on("did-finish-load", () => boot("页面加载完成 did-finish-load"));
  mainWindow.webContents.on("did-fail-load", (_e, code, desc, url) =>
    boot(`!! did-fail-load code=${code} desc=${desc} url=${url}`)
  );
  mainWindow.webContents.on("render-process-gone", (_e, details) =>
    boot(`!! render-process-gone ${JSON.stringify(details)}`)
  );
  mainWindow.on("unresponsive", () => boot("!! 窗口无响应"));
  mainWindow.on("show", () => boot("窗口已 show"));
}

// 单实例：第二次启动就把已有窗口拿到前台
if (!app.requestSingleInstanceLock()) {
  boot("拿不到单实例锁 —— 已有实例在跑，本次退出");
  app.quit();
} else {
  boot("单实例锁已拿到");
  app.on("second-instance", () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });

  app.whenReady().then(() => {
    boot("app ready");
    try {
      Menu.setApplicationMenu(null);
      protocol.handle("app", serve);
      boot("protocol.handle('app') 注册成功");
    } catch (e) {
      boot(`!! 注册协议失败: ${e && e.stack ? e.stack : e}`);
    }
    try {
      createWindow();
      boot("createWindow 返回");
    } catch (e) {
      boot(`!! createWindow 抛异常: ${e && e.stack ? e.stack : e}`);
    }
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  }).catch((e) => {
    boot(`!! whenReady 失败: ${e && e.stack ? e.stack : e}`);
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
}
