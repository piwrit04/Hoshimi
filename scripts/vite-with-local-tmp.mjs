/**
 * 启动 Vite，但把 TEMP / TMP 换到工作区内的 .build-tmp。
 *
 * ⚠️ 为什么必须这么做（这是本机实测出来的，不是猜的）：
 *
 * esbuild 每次做 transform / 压缩都会在 `os.tmpdir()` 下建一个
 * `esbuild-<64位hex>` 临时目录，用完再删掉。它用的是系统临时目录，也就是
 * `C:\Users\<你>\AppData\Local\Temp`。
 *
 * 在这台机器上，**esbuild 子进程删不掉那个目录**，报错是：
 *     [vite:esbuild-transpile] remove C:\Users\...\Temp\esbuild-<hex>: Access is denied.
 * 于是 `npm run build` 会在转完 2017 个模块、眼看要出产物的时候整体失败。
 * 症状很有迷惑性：前面全部正常，只在最后一步炸。
 *
 * 已经排除的解释：
 *   · 不是残留目录 —— 失败后 TEMP 里没有留下 esbuild-* 目录
 *   · 不是进程占用 —— 没有 esbuild / node 残留进程
 *   · 不是重试能好 —— 连续复现，同样报错
 *   · 不是语法降级引起的 —— 把 build.target 设成 esnext 让它不降级，照样失败，
 *     因为 esbuild 在压缩阶段也会建临时目录。所以那行改动已经撤掉了
 *   · 当前用户对 TEMP 有完全控制权，PowerShell 自己在 TEMP 里创建+删除都成功 ——
 *     唯独 esbuild 的**子进程**不行（TEMP 上有一条只给只读权限的沙箱组权限项）
 *
 * 把 TEMP / TMP 指到工作区内之后构建立刻通过，所以这里就是那个绕法。
 *
 * 什么时候可以删掉这个包装、回到直接 `vite build`：
 *   换一台机器，或者这个沙箱限制消失之后 —— 直接在命令行跑一次
 *   `npx vite build`，如果成功，就可以把 package.json 里那几个脚本改回去。
 *
 * 注意用的是 `stdio: 'inherit'`，不是默认的管道：受限沙箱下捕获子进程管道会 EPERM。
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LOCAL_TMP = path.join(ROOT, ".build-tmp");
fs.mkdirSync(LOCAL_TMP, { recursive: true });

// 直接用 node 执行 vite 的入口，不经过 .bin 里的 shim，免得再被 shell 插一层
const viteEntry = path.join(ROOT, "node_modules", "vite", "bin", "vite.js");
if (!fs.existsSync(viteEntry)) {
  console.error(`找不到 vite：${viteEntry}`);
  console.error("先在项目根目录跑：npm install");
  process.exit(1);
}

const args = process.argv.slice(2);
console.log(`TEMP / TMP 已重定向到 ${LOCAL_TMP}`);
console.log(`vite ${args.join(" ") || "(dev)"}\n`);

const child = spawn(process.execPath, [viteEntry, ...args], {
  cwd: ROOT,
  stdio: "inherit",
  env: { ...process.env, TEMP: LOCAL_TMP, TMP: LOCAL_TMP },
  shell: false,
});

child.on("error", (err) => {
  console.error("启动 Vite 失败：", err);
  process.exit(1);
});
child.on("exit", (code, signal) => {
  if (signal) console.error(`\nVite 被信号终止：${signal}`);
  process.exit(code ?? 0);
});
