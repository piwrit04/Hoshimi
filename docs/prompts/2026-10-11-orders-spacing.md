# 表格排版优化 Prompt（保持配色不变，只调间距和层次）

来源：客户原话 2026-10-11；落地 commit `2e47f30`

## 当前问题诊断

1. 表格行间距还是太紧（客户名+游戏/渠道双行格尤甚）
2. 表格没有明显的「卡片感」
3. 筛选栏和表格之间缺少呼吸感
4. 表头字重和颜色不够突出
5. 左侧边栏和主内容区之间缺少视觉分割

## 修改清单

1. 给表格套 `.table-container` 卡片容器（圆角 12px、细边框、微弱阴影）
2. 表格行内边距改为约 `1.25rem`，`vertical-align: top`，行高 1.6
3. 表头字号 12px、加粗、`muted-foreground`
4. 筛选栏下方 `margin-bottom: 1.5rem`
5. 侧边栏右侧 `border-right: 1px solid hsl(var(--border))`
6. 主内容区 `.ds-page--console` `padding: 2rem 2.5rem`

配色/token 不动。

## 原文细节（SCSS 意图）

见客户粘贴：`.table-container`、`.l2g-table` td/th、`.l2g-filter-bar`、`aside.sidebar`、`.ds-page--console`。
