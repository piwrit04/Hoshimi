# AGENTS.md · 星笺

给在本仓库工作的 AI 智能体的操作守则。

**项目**：星笺（Hoshimi）——代肝订单管理系统，Windows 桌面应用。
**技术栈**：Electron 38 + React 19 + Vite 7 + TypeScript 5.9 + Tailwind 4。
**当前阶段**：⚠️ **只有 UI 外壳和组件展示，没有任何业务逻辑。** 订单、客户、打手、结算、持久化都还没写。侧栏里除「组件预览」外的入口全是 404 卡片，这是刻意的。

---

## ⛔ 组件库使用规约（最高优先级，没有例外）

**所有界面设计必须使用组件库里已有的组件。** 四条硬规定：

1. **动手前先查文档。** 先读 `DESIGN.md` 第 7 节的类族表，再查
   `src/pages/Components/registry.ts`（已实现组件的清单）和 `src/components/ui/*`
   的实际导出。**不许凭印象假设某个组件存在。**
2. **不得乱改。** 不要为了让某个页面好看，就去动 `src/components/ui/*` 的既有行为、
   props 或样式。确实需要改，先说清楚：改什么、为什么、影响哪些调用点。
3. **不得乱加。** 不要随手新增组件塞进 `src/components/ui/`。想要一个新组件，
   它的位置、命名、props 形态、要不要进展示站，都要先讨论。
4. **组件库里没有实现的 → 先问用户，再决定后续怎么做。** 不要自行决定是"就地造一个"、
   "拿别的组件凑"还是"先跳过"，也不要用原生 HTML 偷偷替代一个本该有的组件。

---

## 0. 开工前必读

| 读什么 | 为什么 |
|---|---|
| **`DESIGN.md`** | 设计系统：token、类族、骨架约定。**改任何界面之前先读** |
| `src/styles/theme.css` | 颜色和尺寸的**唯一出处**。想知道某个色值，看这里，不要猜、不要新造 |
| 本文件第 2、3 节 | 三个环境坑 + Electron 壳的家规。不知道会白干半天 |

---

## 1. 命名与标识符

沿用 Cheezit 那套约定：**中文名给用户看，ASCII 名给系统用**。

| 用途 | 值 |
|---|---|
| 中文名（界面、快捷方式、安装包标题） | 星笺 |
| 英文名（exe、包名、代码标识） | Hoshimi |
| `app://` 的 host（必须 ASCII） | `hoshimi` |
| appId | `app.hoshimi.orders` |
| userData 目录 | `%APPDATA%\Hoshimi` |
| 磁盘上的目录名 | `Zhibenjia` ← **历史遗留，和品牌无关**，改名单独处理 |

**改品牌名时必须一起动的 6 处**（漏一处就会新旧混用）：

1. `electron/package.json` — `productName` / `executableName` / `appId` / `shortcutName` / 两个 `artifactName`
2. `electron/main.cjs` — `TITLE` / `HOST` / `setPath("userData")` / `setAppUserModelId` / `BOOT_DIR`
3. 根 `package.json` — `name` / `description`
4. `package-lock.json` — 顶部的 `name`（**`npm install` 不会自动改它，要手动改**）
5. `index.html` — `<title>` / 加载画面文字 / 内联 favicon 的汉字
6. `src/components/layout/Sidebar.tsx` — 品牌字标

---

## 2. ⚠️ 三个环境坑（都实际踩过）

### 2.1 esbuild 删不掉系统 TEMP → 构建在最后一步整体失败

症状极具迷惑性：**2017 个模块全部转完、眼看要出产物时**，整个构建失败：

```
[vite:esbuild-transpile] remove C:\Users\...\Temp\esbuild-<hex>: Access is denied.
```

已排除的解释：TEMP 里没有残留目录、没有占用进程、连续复现、`build.target` 设成 `esnext`
让它不降级也照样失败（压缩阶段同样会建临时目录）。真正的分界是：当前用户对 TEMP 有完全
控制权、PowerShell 自己在 TEMP 里创建删除都成功，**唯独 esbuild 的子进程删不掉**。

**解法**：所有 Vite 命令都走 `scripts/vite-with-local-tmp.mjs`，它把 `TEMP`/`TMP` 指到
项目内的 `.build-tmp` 再启动 Vite。**不要**把 `package.json` 里的脚本改回裸 `vite build`。

**什么时候可以拆掉这层包装**：换一台机器，或沙箱限制消失之后 —— 直接在命令行跑一次
`npx vite build`，成功就可以把脚本改回去，并删掉 `scripts/vite-with-local-tmp.mjs`。

### 2.2 Vite 的 watcher 被占用文件搞成进程级崩溃

```
Error: EBUSY: resource busy or locked, watch '...\.chrome-tmp\Default\Sessions\...'
```

这个错误发在 `FSWatcher` 的 `'error'` 事件上、没人接住，所以是**进程级崩溃**：dev server
直接退出，浏览器里只看到连接断开，只有终端有一行报错，很难查。

**现状**：`vite.config.ts` 里已经用 `server.watch.ignored` 忽略了
`.build-tmp` / `.chrome-tmp` / `dist` / `electron/release`。
**别把临时目录建在项目里**，尤其是浏览器或编辑器的 user-data 目录。

### 2.3 Electron 在 DSH 会话里起不来（不是项目的问题）

从 DSH 的 shell 里启动 Electron，一律拿到：

```
退出码 = 0x80000003  (STATUS_BREAKPOINT)
```

诊断结论：**这是环境限制，不是代码问题**。证据——用同样方式启动 `Cheezit`（那个已经出过
安装包的项目）结果完全一致；三个项目二进制哈希相同；`electron --version` 退出码 0；
记事本能正常弹窗。真正的原因是 DSH 的进程沙箱挡住了 Chromium 启动所需的 IPC。

**所以**：`npm run shell` / `npm run electron:run` 必须由用户**在自己的终端里**跑。
AI 在会话内验证界面，用「起 dev server + 无头浏览器截图」这条路（见第 7 节）。

如果窗口打不开，先看 `%APPDATA%\Hoshimi\boot.log` —— `main.cjs` 从第一行就开始往这个文件
里记，连 `did-fail-load`、`render-process-gone`、窗口无响应都记。**这是那套壳最值钱的部分，别删。**

---

## 3. Electron 壳的家规（已定稿，照抄别改）

这套做法（自定义协议 + 无边框 + 窗口状态记忆 + 单实例）来自 Cheezit，**已经出过安装包，属于验证过的配置**。

1. **用 `app://` 自定义协议加载页面，不用 `file://`**。`file://` 的 origin 是 `null`，
   localStorage 不稳定、相对路径容易错；`app://` 有稳定 origin，数据能跨重启保留。
   主进程里 `protocol.registerSchemesAsPrivileged` + `protocol.handle` 已配好，
   `serve()` 还会把无扩展名的路径回落到 `index.html`（SPA 行为）。
2. **无边框窗口 + 页面自绘标题栏**：`frame: false` / `thickFrame: true` /
   `roundedCorners: true`（Win11 才有效果）。所以标题栏里那些 `-webkit-app-region: drag`
   才有意义。
3. **窗口状态记忆 + 单实例锁 + 主题底色同步**（`win:theme-color` 让缩放闪的那一帧颜色对得上）。
4. **preload 同时暴露两套 API，不要"优化"掉任何一套**：
   - `window.ipcRenderer` —— 工具箱老组件写死的形状。`TitleBar.tsx` 里就是
     `window.ipcRenderer.send('window-minimize')`
   - `window.desktop` —— 语义化的新 API
   IPC 通道也**双名挂着**：`win:minimize` 和 `window-minimize` 都注册，就是为了不改搬过来的组件。
5. **安全基线**：`contextIsolation: true`、`nodeIntegration: false`、`sandbox: true`。
   渲染层拿不到 Node，需要 Node 能力就走 IPC。

`electron/electron-run.mjs`（启动器）里那段注释也是家规的一部分：DSH 会给子进程注入
`ELECTRON_RUN_AS_NODE=1`，那会让 electron.exe 永远不弹窗，且 `--version` 无输出。启动器
必须**真的 `delete` 这个变量**（不能设成空字符串），并且用 `stdio: 'inherit'`。

---

## 4. 样式架构（三层，别越层）

```
theme.css（token 唯一出处）
   ↓ 被 @import / @reference
global-*.scss（按前缀分族的组件皮肤）
   ↓ 由组件输出类名引用
.tsx 里的 Tailwind 工具类（只管布局和间距）
```

**关键认知**：`src/components/ui/*` 里的 Tailwind 类**只管布局间距**，颜色、边框、悬浮态、
圆角全部来自 SCSS 的类族。删掉 SCSS，16 个 UI 组件会变成裸框。

| 文件 | 定义类数 | 在组件里实际用到 | 状态 |
|---|---|---|---|
| `global-components.scss` | 188 | 142 | **核心**，`.dd-*` 全族 |
| `global-button.scss` | 38 | 14 | 活的，`.btn-*` |
| `global-form.scss` | 14 | 10 | 活的，`.form-*` |
| `theme.css` | 11 | 8 | token + 工具类 |
| `tooltip.css` | 11 | 6 | 活的，`.tip-*` |
| `alert.css` | 6 | **0** | **死的**，`.ed-alert` 一族 |
| `editor-theme.css` | 3 | **0** | **死的**，只给 alert.css 提供 `--ed-*` |
| `global-page.scss` | 39 | **0** | **死的**，`.card-showcase` / `.page-title` 等 |

后三个文件（约 15KB）是工具箱时代的遗留，**和它们相关的 `@import` 可以一起删**。
删之前先按上表的方式重新核一遍，别凭文件名判断。

**Tailwind 必须走 PostCSS 插件**（`@tailwindcss/postcss`），**不能**换成官方的
`@tailwindcss/vite`。因为 SCSS 里有大量 `@apply`，Vite 会先让 CSS 插件处理再做预处理器
转换，Tailwind 拿到的还是含 SCSS 语法的内容，直接报 `Invalid declaration: @apply ...`。
PostCSS 在 Vite 里跑在预处理器**之后**，拿到的已经是编译好的 CSS。
原因详见 `vite.config.ts` 顶部注释。

⚠️ **`@reference` 的路径基准是 `src/index.css`，不是 SCSS 文件自身**。所以四个 SCSS
里必须统一写 `@reference "./styles/theme.css"`。写 `"./theme.css"` 会去找 `src/theme.css`
并让构建失败 —— 这个错误犯过一次。

---

## 5. 命令

| 命令 | 作用 | 备注 |
|---|---|---|
| `npm run dev` | 起 Vite dev server（浏览器里看界面） | 有 HMR |
| `npm run build` | 产出 `dist/` | Electron 读的就是这里 |
| `npm run preview` | 静态服务 `dist/` | 验证生产产物 |
| `npm run typecheck` | `tsc --noEmit` | **当前有 4 个错误，见第 8 节** |
| `npm run electron:run` | 启动 Electron（读 `dist/`） | **必须在用户自己的终端跑** |
| `npm run shell` | `build` + `electron:run` | 同上 |
| `npm run pack` | electron-builder 打 Windows 安装包 | 未验证过 |

打包要加国内镜像，否则 `electron-builder` 拉二进制会非常慢：

```powershell
$env:ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
$env:ELECTRON_BUILDER_BINARIES_MIRROR="https://npmmirror.com/mirrors/electron-builder-binaries/"
npm run pack
```

`electron/node_modules` 是**从 Cheezit 整体复制**过来的（327MB，electron 38.8.6 +
electron-builder 26.15.3，为了绕开 200MB+ 的下载）。所以 `npm run electron:install`
**从没跑过**。如果那边依赖出问题，可以先试 `npm run electron:install` 重建。

---

## 6. 数据与 origin

`HOST` 决定渲染层的 origin，也就是 **localStorage 的归属**。当前值是 `hoshimi`（干净的新身份）。

备选是沿用 `cheezit`：那样能直接读到 Cheezit 存在 `app://cheezit/` 下的老账本
（键名 `cheezit.ledger.v1`），省掉一次导出/导入。但**本仓库目前没有任何读取那个键的代码**
（存储层还在 `Cheezit/src/storage` 里），所以那份"延续"是纸面上的 —— 真要继承，得先把
Cheezit 的 `src/storage` 和 `src/domain` 搬过来。决定沿用旧身份时，只改 `main.cjs` 里
`HOST` 那一行 + 下面的 `userData` 目录即可。

**用户可见的名字和 origin 是两件独立的事** —— 换品牌名不需要动 `HOST`。

---

## 7. 验证纪律（重要）

**样式问题光读代码判断不了。** CSS 变量解析、层叠顺序、库的运行时注入 —— 只有浏览器知道答案。

**踩过的坑**：靠读代码猜"CSS 变量没定义"猜错了；DevTools 报的 `box-shadow` 计算值是
`none`，追着这个假值查了很久，**实际样式一直是生效的**。最后截图一看就明白了。

**所以：先截图看画面，再考虑查计算值。**

会话内（没有 Electron 窗口，见 2.3）的标准验证流程：

```powershell
# 1) 起服务（后台任务）
npm run dev            # 或 npm run preview

# 2) 无头浏览器截图（user-data-dir 必须放在项目外！见 2.2）
& 'C:\Program Files\Google\Chrome\Application\chrome.exe' `
  --headless=new --disable-gpu --no-sandbox --hide-scrollbars `
  --user-data-dir="$env:TEMP\zhibenjia-chrome" `
  --window-size=1440,900 --virtual-time-budget=9000 `
  --screenshot="D:\Development\Projects\Zhibenjia\.build-tmp\shot.png" `
  http://127.0.0.1:5173/
```

**不要声称改好了却没验证过。** 要么跑脚本看截图，要么明说"我没验证"。

---

## 8. 已知遗留问题

`npm run typecheck` 有 **4 个错误**。它们不影响构建和运行（esbuild 会剥掉类型），
但都是**展示页在演示并不存在的 API**，属于真实缺陷：

| 位置 | 问题 | 实际表现 |
|---|---|---|
| `components/ui/feedback.tsx:444` | `NoticeStack` 的 tone 词表是 `error`，但共用的 `toneIcon` 表键是 `danger` → `toneIcon['error']` 是 undefined | 该 tone 的**通知条图标渲染为空**（颜色类本身是对的） |
| `components/ui/feedback.tsx:349,361` | `Alert` 的 tone 类型含 `danger`，但 SCSS 只有 `.dd-alert--error`（**没有** `.dd-alert--danger`） | 红色提示条退化成**灰边 + 前景色图标**。**这条不产生 TS 错误，纯静默** |
| `pages/Components/sections/data.tsx:729` | ⚠️ **不是 Tag，是 `DiffBar` 的 segment**；`'muted'` 不在 `SemanticTone` 里 | 只让 `tsc` 报 TS2322。`dd-diffbar__seg--muted` **存在**，**视觉正常** |
| `pages/Components/sections/forms.tsx:490` | ⚠️ **不是 `Select`，是 `FormSegmentedControl`** 缺 `help`/`error`/`name` | 分段控制的**说明文案被静默丢弃** |
| `pages/Components/sections/forms.tsx:582` | `FormSelect` 不支持 `required` | 三层丢失：① 必填星号不渲染 ② 无原生 `required` 也无 `aria-required` ③ 必填语义对辅助技术完全丢失 |

**`error` 与 `danger` 是两套并存的词汇，不是"谁写错了"**：反馈面（notice / alert / result）一律 `error`，
数据面（tag / badge-dot / stat / timeline / diffbar）一律 `danger`。`SemanticTone` 是**数据面**词汇，
而 `feedback.tsx` 拿它当 Alert 的 tone 类型 —— **修的时候必须两边一起改**。只给 `toneIcon` 加 `error` 键
而保留 Alert 的类型，Alert 的 `tone="danger"` 仍然是坏的。

**另外两个成簇的既有问题**（详见 `AUDIT.md` 第 1 节）：
- `info` 后缀在数据面整体缺席（`--color-info` 未注册；`stat` / `timeline` / `diffbar` 都没有 `--info`），
  但 TS 类型允许传 `tone="info"` → **静默无样式**，其中 `Timeline` 的情况**展示站正在用**
- `components/layout/TitleBar.tsx` 写死了多处浅色 hex（`#D7CDE8` / `#CBBBE3` / `#8E83A8` / `#FAF7FF` /
  `#D9D0EA`），违反 `DESIGN.md` 第 6 节第 5 条。深色下它靠 `bg-white/92` 勉强能用。**注意：全项目的写死色
  只集中在标题栏那四行**，其余外壳文件都已换 token

**完整清单在 `AUDIT.md`** —— 约 120 条，按 10 个根因簇重组，含 8 条高严重度。修之前先读那个文件的第 1 节：
很多条是同一根因的多个症状，按簇修比按条修省事得多。

---

## 9. 来源，以及已经丢掉的东西

本项目由 **DaiganComponents**（已于 2026/10/7 整目录删除，**没有 git，不可恢复**）
的 UI 层 + **Cheezit** 的 Electron 壳拼装而成。目录名 `Zhibenjia` 是当时随手起的。

**已经从 DaiganComponents 搬进来的**：`src/` 全部（51 个文件）—— 16 个 UI 组件、
组件展示站（`registry.ts` + 5 个 section，约 150KB）、4 个 zustand store、3 个 lib、
`theme.css` 与 4 个 SCSS、`index.html`、`postcss.config.mjs`、`tsconfig.json`。

**没搬、且已随源目录消失的**（不可恢复，除非 Cheezit 里有对应物）：

- `design/DESIGN.md`（24KB，自称"页面设计与实现的唯一依据"）
- `design/assets/` 的 22 张截图，其中 8 组是**深浅成对的组件对照图**
  （`components-buttons` / `forms` / `overlays` / `fullpage` / `design-palette` /
  `icon-library` / `app-shell`）—— 这是唯一一套视觉基准，现在没有了
- `design/gallery.html`（可交互的设计索引）
- `产品定义.md`（12.9KB：角色权限、金额算法、状态机、导入规则、一期范围）
- `生图提示词.md`、`AGENTS.md`、`CLAUDE.md`、`README.md`
- `scripts/` 里的 `probe.mjs` / `shot.mjs` / `capture.mjs` / `gen-palettes.mjs`
- `electron/after-pack.mjs`

**含义**：本项目的设计规范现在只剩 `theme.css` 的 token 和 SCSS 里的注释。`DESIGN.md`
是**从存活的代码重建的**，不是原始规范 —— 但 `DESIGN.md` 第 8 节里从已删除的
`DaiganComponents/AGENTS.md` 抢救出来的那几条规则是有出处的（我当时完整读过那份文件）。

业务文档要重建的话，**`Cheezit` 里有 `PRODUCT.md` 和 `DESIGN.md`，而且那边有 git**，
是现成的参照物。两个项目同域（都是代肝生意），用户已经明确说本项目的定位是**取代** Cheezit。

---

## 10. 沟通约定

- 用户是**零基础**，用中文，讲清楚"为什么"而不只是"改了什么"。
- **已定稿的东西（效果图、设计规范、产品定义）只做实现，不做设计决定。**
  需要发挥时先问，不要自己决定。
- 改完主动说：改了什么文件、怎么验证的、有什么遗留问题。
- **不要声称改好了却没验证过。** 要么跑脚本，要么说明"我没验证"。
- 用户明确说过的话要记住并遵守，不要重复犯同一个错误。
