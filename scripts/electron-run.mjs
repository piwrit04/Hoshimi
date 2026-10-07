/**
 * 启动 Electron 应用。
 *
 * ⚠️ 为什么要自己写一个启动器，而不是直接 `npx electron .`：
 *
 * 这个会话（DSH）本身是个 Electron 应用，它给所有子进程注入了
 * `ELECTRON_RUN_AS_NODE=1`。那个变量的含义是"把 electron.exe 当纯 Node 解释器跑"，
 * 于是 electron.exe **永远不会弹窗口**。
 *
 * 更容易误判的是：它连 `--version` 都不输出，退出码是 0x80000003（断点异常），
 * 看起来像"Electron 二进制坏了 / 版本不对"。我为这个换过两次 Electron 版本才发现
 * 问题在环境变量上。
 *
 * 症状对照：
 *   · 用 .NET ProcessStartInfo 启动 → 0x80000003，无任何输出
 *   · 用 Node spawn 并删掉那个变量 → 正常弹窗
 * 差别在于能不能真正把这个变量从子进程环境里抹掉。
 *
 * 用 `stdio: 'inherit'`，别用默认的 pipe：受限沙箱下捕获管道 stdio 会 EPERM。
 */
import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ELECTRON_DIR = path.join(ROOT, "electron");
const exe = path.join(ELECTRON_DIR, "node_modules", "electron", "dist", "electron.exe");

if (!fs.existsSync(exe)) {
  console.error(`找不到 electron.exe：${exe}`);
  console.error("先在 electron/ 目录里装依赖：npm --prefix electron install");
  process.exit(1);
}

/* 必须真的删掉，不能设成空字符串 —— 空字符串同样会被 Electron 认成"以 Node 模式运行" */
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
delete env.ELECTRON_NO_ATTACH_CONSOLE;

// 检查是否需要禁用沙箱（通过命令行参数 --no-sandbox 或环境变量）
const useNoSandbox = process.argv.includes("--no-sandbox") || process.env.ELECTRON_NO_SANDBOX === "1";
const args = ["."];
if (useNoSandbox) {
  args.push(
    "--no-sandbox",
    "--disable-gpu-sandbox",
    "--disable-software-rasterizer",
    "--disable-dev-shm-usage",
    "--in-process-gpu",  // GPU 进程放在主进程内运行
    "--disable-accelerated-2d-canvas",
    "--disable-gpu"  // 完全禁用 GPU 加速
  );
  console.log("⚠️  警告：已禁用沙箱和 GPU 加速");
  console.log("   这会降低性能和安全性，但可以解决启动问题。\n");
}

console.log(`============ Electron 启动诊断 ============`);
console.log(`electron.exe = ${exe}`);
console.log(`electron.exe 存在：${fs.existsSync(exe)}`);
console.log(`ELECTRON_RUN_AS_NODE 已删除：${env.ELECTRON_RUN_AS_NODE === undefined}`);
console.log(`工作目录 = ${ELECTRON_DIR}`);
console.log(`main.cjs 存在：${fs.existsSync(path.join(ELECTRON_DIR, "main.cjs"))}`);
console.log(`dist 目录存在：${fs.existsSync(path.join(ROOT, "dist"))}`);
console.log(`dist/index.html 存在：${fs.existsSync(path.join(ROOT, "dist", "index.html"))}`);
console.log(`启动参数：${args.join(" ")}`);
console.log(`==========================================\n`);

console.log(`即将启动 Electron，请等待窗口出现...\n`);

const child = spawn(exe, args, {
  cwd: ELECTRON_DIR,
  env,
  stdio: "inherit",
  shell: false,
  windowsHide: false,  // 确保窗口可见
});

child.on("error", (err) => {
  console.error("\n!! 启动失败：", err);
  process.exit(1);
});

child.on("spawn", () => {
  console.log("✓ Electron 进程已启动");
});
child.on("exit", (code, signal) => {
  console.log(`\n============ Electron 退出诊断 ============`);
  console.log(`退出码：${code}（十六进制：0x${code?.toString(16)}）`);
  console.log(`信号：${signal}`);

  if (code === 2147483651 || code === 0x80000003) {
    console.log(`\n这是 STATUS_BREAKPOINT (0x80000003) 错误。`);
    console.log(`可能原因：`);
    console.log(`1. Chromium 沙箱初始化失败`);
    console.log(`2. 在受限环境中运行（如某些虚拟化环境）`);
    console.log(`3. 防病毒软件或安全软件拦截`);
    console.log(`\n建议尝试：`);
    console.log(`- 临时禁用防病毒软件`);
    console.log(`- 以管理员身份运行`);
    console.log(`- 添加 --no-sandbox 参数（见下方）`);
  }

  console.log(`==========================================\n`);
  process.exit(code ?? 0);
});
