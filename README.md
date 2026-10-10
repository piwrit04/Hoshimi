# 星笺 (Hoshimi)

一个现代化的代肝订单管理桌面应用，基于 Electron + React + TypeScript 构建。

## 功能特性

- 📦 **订单管理系统** - 完整的订单创建、编辑、查询功能
- 🎨 **现代化 UI** - 精美的组件库和交互设计
- 🌓 **主题切换** - 支持深色/浅色主题
- 🪟 **自定义标题栏** - 无边框窗口设计
- 📱 **响应式设计** - 适配不同屏幕尺寸

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
├── electron/              # Electron 主进程
│   ├── main.cjs          # 主进程入口
│   ├── preload.cjs       # 预加载脚本
│   └── build/            # 应用图标
├── src/                  # React 渲染进程
│   ├── components/       # UI 组件
│   ├── pages/            # 页面组件
│   ├── store/            # Zustand 状态管理
│   ├── styles/           # 全局样式
│   └── lib/              # 工具函数
├── scripts/              # 构建脚本
├── dist/                 # 构建输出（.gitignore）
└── start.bat             # Windows 启动脚本
```

## 特殊说明

### Windows 沙箱限制

如果你的系统存在 `CodexSandboxUsers` 安全限制，应用已配置为使用 `--no-sandbox` 模式启动。详见 [ELECTRON-FIX-FINAL.md](./ELECTRON-FIX-FINAL.md)。

### 中国镜像源

项目已配置使用 npmmirror 加速 Electron 依赖下载：

```bash
ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
```

## 开发文档

- [PRD.md](./PRD.md) - 产品需求文档
- [DESIGN.md](./DESIGN.md) - 设计文档
- [CLAUDE.md](./CLAUDE.md) - AI 协作指南
- [ELECTRON-FIX-FINAL.md](./ELECTRON-FIX-FINAL.md) - Electron 问题修复记录

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

---

由 [Claude](https://claude.ai) 协作开发 ✨
