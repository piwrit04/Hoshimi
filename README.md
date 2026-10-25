# 星笺 (Hoshimi)

一个现代化的代肝订单管理桌面应用，基于 Electron + React + TypeScript 构建。

## 功能特性

现状细则见 [`docs/FEATURES.md`](docs/FEATURES.md)（随扫尾更新）。

- 📦 **订单** - 八列双行表（单号/客户/内容/平台/金额·到手/时间/状态/操作）；筛栏单行；新建抽屉
- 👥 **客户** - 显式建档、合并、订单链客、记一单预填
- 📁 **目录 / 设置** - 项目目录 CRUD+排序落盘、清理缓存、主题与导入
- 📊 **概览** - 问候整页 + 真数 KPI / 托管到期（与待办同口径）
- ✅ **待办** - 催单 + 托管到期、完成/取消、侧栏角标
- 💾 **备份** - JSON 备份还原；表格导入预览确认
- 🎨 **主题** - 深浅色控制台皮、克制柔粉、引导 / 个人中心 / 快捷键

## 技术栈

- **前端框架**: React 19 + TypeScript
- **桌面框架**: Electron 38.8.6
- **构建工具**: Vite 7.3
- **样式方案**: Tailwind CSS + SCSS
- **状态管理**: Zustand
- **UI 组件**: 自研组件库

## 快速开始

### 环境要求

- Node.js 20 或 22
- Windows 10/11 (目前仅支持 Windows)

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
# 启动 Vite 开发服务器
npm run dev

# 启动 Electron 窗口（需先构建）
npm run shell
```

### 构建生产版本

```bash
# 构建渲染进程
npm run build

# 启动应用
npm run shell

# 双击运行（推荐）
start.bat
```

## 项目结构

```
Hoshimi/
├── electron/              # Electron 主进程（main / preload / 图标）
├── src/                   # React 渲染进程
│   ├── components/        # UI / layout / auth 等
│   ├── pages/             # 订单、客户、仪表盘等页面
│   ├── domain/            # 业务逻辑与领域模型
│   ├── storage/           # 本地持久化（IndexedDB）
│   ├── store/             # Zustand 状态
│   ├── styles/            # 主题与全局样式
│   └── lib/               # 工具与同步
├── public/                # 静态资源（字体、壁纸）
├── scripts/               # 构建与开发辅助脚本
├── supabase/              # 云端迁移
├── docs/                  # 产品 / 功能 / 归档文档
│   ├── FEATURES.md
│   ├── PRD.md
│   ├── prompts/           # UI 改版 Prompt
│   └── archive/           # 审计、重构进度、历史修复记录
├── DESIGN.md              # 设计系统（改 UI 必读）
├── AGENTS.md              # AI / 协作操作守则
├── CLAUDE.md              # Claude 入口（指向 AGENTS）
├── start.bat              # Windows 启动脚本
└── package.json
```

## 特殊说明

### Windows 沙箱限制

如果你的系统存在 `CodexSandboxUsers` 安全限制，应用已配置为使用 `--no-sandbox` 模式启动。详见 [docs/archive/ELECTRON-FIX-FINAL.md](./docs/archive/ELECTRON-FIX-FINAL.md)。

### 中国镜像源

项目已配置使用 npmmirror 加速 Electron 依赖下载：

```bash
ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
```

## 开发文档

- [DESIGN.md](./DESIGN.md) — 设计系统（改界面必读）
- [AGENTS.md](./AGENTS.md) — AI / 协作操作守则
- [CLAUDE.md](./CLAUDE.md) — Claude 入口
- [docs/FEATURES.md](./docs/FEATURES.md) — 功能现状
- [docs/PRD.md](./docs/PRD.md) — 产品需求
- [docs/archive/](./docs/archive/) — 审计、重构进度、Electron 修复等历史记录

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

---

由 [Claude](https://claude.ai) 协作开发 ✨

## 组件库

自研 UI（对照 Naive UI 分类）。入口：应用内「组件预览」页；登记表 `src/pages/Components/registry.ts`。

命令式能力需在布局挂载：`<LoadingBarHost />`、`<ModalConfirmHost />`（已在 `MainLayout`）。

```ts
import { loadingBar } from '@/components/ui/LoadingBar'
import { Modal } from '@/components/ui/Modal'

loadingBar.start(); /* ... */ loadingBar.done()
await Modal.confirm({ title: '确认？', tone: 'danger' })
```
