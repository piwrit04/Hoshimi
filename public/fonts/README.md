# 本地字体（筑紫A丸）

筑紫A丸ゴシック（Tsukushi A Round Gothic）是 Fontworks 商用字体，**不能随仓库分发**。

当前 UI 暂用开源圆体 **M PLUS Rounded 1c**（OFL）。你电脑开机后，把已授权的字体文件放到本目录即可自动优先使用：

建议文件名（任选存在即可）：

- `TsukushiARoundGothic-Regular.otf` / `.ttf`（字重 400）
- `TsukushiARoundGothic-Medium.otf` / `.ttf`（字重 500，可选）
- `TsukushiARoundGothic-Bold.otf` / `.ttf`（字重 700，可选）

放好后重新 `npm run build` / 启动应用。CSS 已用 `@font-face` 引用上述路径；未放置时浏览器会跳过，继续用 M PLUS Rounded 1c。
