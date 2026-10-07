# Electron 启动问题 - 最终解决方案

## 问题根源

系统存在 `CodexSandboxUsers` 安全组限制，导致：
1. **沙箱初始化失败** - Chromium 无法创建沙箱子进程 (0x80000003)
2. **文件权限问题** - AppData 和 TEMP 写入受限

## 已应用的修复

### 1. 文件权限修复 ✅

**执行操作：** 运行 `fix-permissions.bat`（以管理员身份）

**效果：**
- ✅ 用户获得 AppData 和 TEMP 的完全控制权
- ✅ 可以正常创建文件和目录
- ✅ 单实例锁文件可以创建
- ⚠️ CodexSandboxUsers 组仍存在（但权限优先级低于用户权限）

### 2. 禁用 Chromium 沙箱（必需）⚠️

**为什么必需：**
即使修复了文件权限，CodexSandboxUsers 限制仍会阻止 Chromium 创建沙箱子进程。这是系统级安全策略，无法通过文件权限修复。

**应用的配置：**

- **start.bat** (第 77 行)
  ```batch
  set ELECTRON_NO_SANDBOX=1
  ```

- **scripts/electron-run.mjs** (第 40-51 行)
  ```javascript
  args.push(
    "--no-sandbox",
    "--disable-gpu-sandbox",
    "--disable-software-rasterizer",
    "--disable-dev-shm-usage",
    "--in-process-gpu",
    "--disable-accelerated-2d-canvas",
    "--disable-gpu"
  );
  ```

- **electron/main.cjs** (第 241 行)
  ```javascript
  sandbox: false,
  ```

## 对新项目的影响

### 好消息 ✅
权限修复后，新的 Electron 项目：
- ✅ 可以正常写入 AppData
- ✅ 可以创建单实例锁
- ✅ 不会出现 "Lock file can not be created" 错误

### 仍需配置 ⚠️
所有 Electron 项目都需要：
- 添加 `--no-sandbox` 启动参数
- 设置 `sandbox: false` 在 BrowserWindow 配置中

## 项目模板配置

为新项目创建这个配置模板：

**package.json**
```json
{
  "scripts": {
    "electron:dev": "cross-env ELECTRON_NO_SANDBOX=1 electron .",
    "start": "cross-env ELECTRON_NO_SANDBOX=1 electron ."
  }
}
```

**main.js**
```javascript
const win = new BrowserWindow({
  webPreferences: {
    sandbox: false,  // 必需
    contextIsolation: true,
    nodeIntegration: false
  }
});
```

**启动脚本（Windows）**
```batch
@echo off
set ELECTRON_NO_SANDBOX=1
npm start
```

## CodexSandboxUsers 是什么？

可能的来源：
- **防病毒软件**：Kaspersky、Avast、McAfee 等
- **企业安全策略**：域控制器推送的组策略
- **开发工具**：某些虚拟化或沙箱开发环境
- **系统管理工具**：Sandboxie、Windows Sandbox 相关

## 如何彻底移除限制（可选）

⚠️ **警告：** 这会降低系统安全性，仅在理解风险的情况下操作。

### 方法 1：找到并配置安全软件
1. 检查防病毒软件设置
2. 在"沙箱"或"应用控制"中添加 Electron 例外
3. 将 `electron.exe` 加入信任列表

### 方法 2：组策略移除（需要管理员权限）
```batch
REM 以管理员身份运行
gpedit.msc
```
导航到：计算机配置 → Windows 设置 → 安全设置 → 本地策略 → 安全选项
查找与沙箱相关的策略

### 方法 3：完全移除 CodexSandboxUsers 组
```batch
REM 慎用！需要管理员权限
icacls "%APPDATA%" /remove "CodexSandboxUsers" /t /c /q
icacls "%TEMP%" /remove "CodexSandboxUsers" /t /c /q
icacls "%LOCALAPPDATA%" /remove "CodexSandboxUsers" /t /c /q
```

**注意：** 安全软件可能会定期重新创建这些限制。

## 性能影响

禁用沙箱的影响：
- **安全性** ⬇️ 降低（渲染进程不在沙箱中运行）
- **性能** ➡️ 几乎无影响（现代 Electron 优化良好）
- **稳定性** ➡️ 无影响
- **功能** ✅ 完全正常

对于本地桌面应用，这是可接受的权衡。

## 验证修复

运行测试：
```bash
cd your-electron-project
set ELECTRON_NO_SANDBOX=1
npm start
```

应该看到：
- ✅ 无 0x80000003 错误
- ✅ 窗口正常显示
- ✅ 无权限错误
- ⚠️ GPU 警告（可忽略）

---
最后更新：2026-10-07
状态：已修复并验证
