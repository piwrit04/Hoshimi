# 组件缺陷清单 · 星笺

> **来源**：2026/10/7 由 5 个只读审计任务并行产出，覆盖 `src/components/ui/*`（16 个组件文件）、
> `src/components/layout/*`、`src/components/search/*`、`ThemeSync`、`store/*`、`lib/*`。
> **全部结论都附了证据**（源码行号 / SCSS grep / 已构建产物比对 / `tsc --noEmit` / 一次无头 DOM dump）。
> **审计过程没有修改任何文件。**
>
> ⚠️ 标注"未确认"的条目是推断而非实测，修之前建议先复现一次。
>
> **合计约 120 条**：高 8 / 中 42 / 低 70。**先看第 1 节的根因簇** —— 很多条是同一个根因的多个症状，
> 按簇修比按条修省事得多。

---

## 1. 根因簇（跨文件共性，优先级最高）

### 簇 A · 未分层的 SCSS 永远压过 Tailwind 工具类

`global-*.scss` 的规则**不在任何 `@layer` 里**，而 `index.css` 的 `@import "tailwindcss"` 展开成
`@layer theme, base, components, utilities`。按 CSS 规范，**未分层声明优先于所有分层声明**。
→ 任何调用方想用 Tailwind 覆盖组件的同属性，**静默失效**。

同簇症状（全是一个根因）：

| 症状 | 位置 |
|---|---|
| `AvatarGroup` 的 `bg-card` / `bg-secondary` / `text-muted-foreground` 被 `.dd-avatar` 压掉，叠堆头像变半透明品牌色、`+N` 变品牌色字 | `data.tsx:338,343` |
| `<FormInput block={false}>` 的 `w-auto` 被 `.dd-control-wrap{@apply w-full}` 压掉 → **这个 prop 等于不存在** | `form.tsx:159` |
| `FormHint` 气泡的 `text-xs` / `max-w-[220px]` 被 `.dd-popover` 压掉 → 实际 14px / 300px | `form.tsx:1111` |
| `FormSelect` 下拉面板的 `max-w-none` 类**加了也没用** | `form.tsx:474` |
| 展示页 `dd-control min-h-[76px] py-2` 无效 | `forms.tsx:732` |

**修法**：把 `global-*.scss` 的规则包进 `@layer components`。**这是一次性根治**，但会改变全站层叠结果，
必须整体截图回归。**属于改样式体系，按 AGENTS.md 要先问。**

### 簇 B · `btn-base` 这个类名从不输出到元素上

组件只输出 `btn-primary` / `btn-ghost` 这类**变体**类。而焦点环和禁用态是独立选择器
`.btn-base:focus-visible` / `.btn-base:disabled`，要求元素**字面上带 `btn-base`**。
`@apply btn-base` 只内联声明（包括 `outline:none`），**不会把类名加到元素上**。

| 症状 | 严重度 |
|---|---|
| **全应用每个按钮都没有键盘焦点环**（Tab 走查看不出焦点在哪） | **高** |
| **禁用按钮外观与可点按钮完全一样**（满色品牌、正常光标，只是点了没反应） | **高** |
| `ButtonGroup`「拼成一条」的样式**全部失效**（4 条规则都要求 `> .btn-base`） | **高** |

**修法**：输出类名时一并带上 `btn-base`，或把那两条规则改成枚举所有变体。

### 簇 C · `error` 与 `danger` 两套词汇并存

SCSS 的事实：**反馈面用 `error`**（notice / alert / result），**数据面用 `danger`**（tag / badge-dot /
stat / timeline / diffbar）。而 `SemanticTone` 是**数据面**词汇，`feedback.tsx` 却拿它当 Alert 的 tone 类型。

| 症状 | 严重度 |
|---|---|
| `Alert tone="danger"` 拼出**不存在**的 `dd-alert--danger` → 竖线是灰的、图标是前景色，像"没上色" | **高** |
| `NoticeStack tone="error"` 的图标 `toneIcon['error']` 是 `undefined` → **图标渲染为空** | **高** |

**修法（必须一起改，只改一处不算修）**：`SemanticTone` 保持数据面含义，**另立反馈面 tone 联合**
`'success'|'warning'|'error'|'info'`（`Result` 已在用），让 `Alert` / `NoticeItem` 都用它，`toneIcon` 的键随之改成 `error`。

### 簇 D · `info` 后缀在数据面整体缺席

`--color-info` **没有**在 `@theme inline` 里注册（所以 `text-info` / `bg-info` 根本不存在）；
`.dd-stat__value--info` / `.dd-timeline__dot--info` / `.dd-diffbar__seg--info` **都不存在**，
但 TS 类型允许传 `tone="info"`。

| 症状 | 可见性 |
|---|---|
| `Statistic tone="info"` 数值颜色不变（静默无效） | 展示站未用，不显形 |
| `Timeline tone="info"` 圆点退化成灰色 | **展示站在用**（`sections/data.tsx:534`） |
| `DiffBar` 的 `info` 段**完全透明**，条上像被挖掉一块 | 未用 |

### 簇 E · 退场动画全都不播（`AnimatePresence` 放在 portal 内部）

`createPortal` 每次渲染都创建新 portal，而 `AnimatePresence` 在其**内部**且以 `isOpen` 做条件 →
`isOpen` 变 false 时整棵树直接卸载，`exit` 动画无处执行。

- `Drawer`：打开有动画，关闭瞬间消失（`overlay.tsx:245-249`）
- `Modal`：更彻底，`if (!isOpen) return null` 在 portal **之前**就返回（`Modal.tsx:34`）
- **修法**：把 `AnimatePresence` 提到 portal 外层，或让 portal 常驻、只条件渲染内部。**不改公开 API。**

### 簇 F · 浮层没有层级体系

同一批层级散落在 4 个 tsx + 2 个 SCSS：`40 / 50 / 50 / 60 / 60 / 1000 / 9999`。

| 实测压盖 | 后果 |
|---|---|
| **Modal(50) 压 Toast(50)** —— Modal portal 到 body 末尾，Toast 在 `#root` 里 | **开着 Toast 弹 Modal，Toast 被遮罩压住变灰** |
| Drawer(60) 压 Toast(50) | 抽屉打开时 Toast 完全不可见 |
| BackToTop(40) 是全场最低 | 被 Modal / Drawer / Toast 全压 |
| **Tooltip inline `zIndex:9999`** | 永远压一切，**包括 Modal 遮罩**；`tooltip.css` 里那个 `z-index:1000` 是永远不生效的死代码 |
| FloatingSearch 遮罩(40) 盖不住 header(50) | 搜索面板打开时顶部 52px 标题栏不变暗、仍可点 |

**修法**：在 `theme.css` 加 `--z-overlay / --z-modal / --z-toast / --z-tooltip` 常量并在两处引用。
**属于改样式体系，要先问。**

### 簇 G · 没有焦点管理（Modal / Drawer / Dropdown / Popconfirm / Tabs / DataTable / Tree）

打开后 Tab 能跑到背后页面、关闭后焦点丢回文档开头、读屏念"对话框"却没有名字。
**全部不需要改公开 API。**

### 簇 H · 四处的 Esc 各自独立注册在 `document` 上

没有浮层栈，按一次 Esc **会把所有打开的浮层一起关掉**（抽屉里的 Dropdown 一关，抽屉也没了）。
另外 `Sidebar` 的 Escape **无条件折叠侧栏**（不判浮层、不判输入焦点）→ 在 Ctrl+K 面板里按 Esc，
**面板和侧栏一起动**。

### 簇 I · 写死的浅色 hex

**只集中在 `TitleBar.tsx` 一个文件的四行**（57/60/61/63），其余外壳文件底色/边框/文字都已换 token。
详见第 2 节「高」。

### 簇 J · 重复实现与死代码

| 对象 | 状态 |
|---|---|
| `OutlineButton` / `IconTextButton` / `BrandButton` | **全项目 0 引用**。前两个的能力完全被 `Button` 覆盖，`BrandButton` 输出的类字符串与 `<Button variant="primary">` **逐字相同**，且少了 size / loading / iconOnly / block |
| `ProgressBar` | **0 引用**，且与 `feedback.Progress` 是两套实现、**配色分叉**（Tailwind 原始调色板 vs 主题 token，红/绿不是同一个颜色） |
| `PageBackground` | **0 引用**，且三处实现都已失效（`--bg-gradient-*` 全项目未定义、图片文件不存在、无 `onError`） |
| `lib/window-drag.ts`（12KB） | **0 引用**。拖拽实际由 CSS `-webkit-app-region: drag` 负责，行为正确。**但它是一颗雷**：`main.cjs` 的 `window-get-position` 返回**数组 `[x,y]`**，而它要 `{x,y}` 对象 → 一旦被 import，第一次拖窗会跳到左上角 |
| `.btn-*` 24 个类 | 在 TS/TSX 中 0 引用（含 `.btn-toggle`，注释说"保留是为了不破坏已有引用"——**实测不成立**） |
| `alert.css` / `editor-theme.css` / `global-page.scss` | 0 引用，但**仍被打进产物** |

---

## 2. 高严重度（8 条，逐条）

### H1 · `FormNumberInput` 小数点打不进去，小数被拼成整数
- 位置：`form.tsx:319-336`；显示逻辑 287-290
- 症状：想输 `2.5`：敲 `2` → 显示 2；敲 `.` → **小数点当场消失**；敲 `5` → 变成 `25`，再被 `max` 截断。
  想输 `-5`，`-` 被丢。**而金额系统里渠道费率就是 1.6% 这种小数。**
- 根因：完全受控 + 每次按键把整个字符串 `Number()` 后回写，中间态 `"2."` / `"-"` 无法表示
  （`Number("2.")===2`；`Number("-")` 是 NaN → 直接 `return`，React 把 DOM 值回滚）。
- 证据：`const n = Number(raw); if (Number.isNaN(n)) return; onChange(clamp(n))`；且 `step={0.1}`、
  `inputMode="decimal"`、展示页预置 1.6 都在明示它支持小数。
- 要改 API 吗：否（内部留 raw 字符串状态，`onBlur` 再归一化）

### H2 · 全应用按钮没有键盘焦点环
- 位置：类名输出 `Button.tsx:84-91`；规则在 `global-button.scss:50-58`
- 症状：Tab 走查界面，**看不出焦点在哪个按钮上**（所有变体都带 `outline:none`）。
- 根因：见簇 B。
- 证据：`grep btn-base src/**/*.tsx` → **0 命中**；dist 里 `.btn-base:focus-visible{box-shadow:var(--shadow-glow)}`
  存在但选择器带 `btn-base`。对照 `Sidebar.tsx:98` 手写了 `focus-visible:ring-2`，说明别处已发现过。

### H3 · 禁用按钮外观与可点按钮完全一样
- 位置：同上
- 症状：`<Button variant="primary" disabled>`（`general.tsx:89` 正在演示）渲染成**满色品牌、
  正常箭头光标**，与可点按钮一模一样。
- 根因：`.btn-base:disabled{cursor:not-allowed;opacity:.5;filter:grayscale(.5)}` 因选择器不匹配而失效。

### H4 · `ButtonGroup`「拼成一条」的样式全部失效
- 位置：`Button.tsx:110`；规则 `global-components.scss:99-119`
- 症状：「按钮组」演示里 4 个按钮**各自保留 6px 圆角**、相邻处两道 1px 描边并排，看起来是 4 个挤在一起的
  独立按钮，而不是分段控件。
- 根因：四条规则都要求 `> .btn-base`。这是展示站登记为 ready 的可见组件，**肉眼就能看出不对**。

### H5 · `Alert tone="danger"` 静默失效
- 位置：`feedback.tsx:349,361`；类型 333-338
- 症状：展示站「表头对不上」那条提示，左边 3px 竖线是**灰色**、图标是**前景色**，与上面三条蓝/绿/橙
  明显不是一类。
- 证据：`.dd-alert--*` 只有 success/warning/**error**/info（`global-components.scss:1006-1013`），
  **没有 danger**。注意这条**不产生 TS 错误**（`toneIcon` 恰好有 `danger` 键），纯静默。

### H6 · `NoticeStack tone="error"` 图标渲染为空
- 位置：`feedback.tsx:444`（表 333-338，类型 423-428）
- 症状：点「失败通知」→ 通知条左边**没有图标**，四条里唯一缺一块的。
- 证据：`tsc` 原文 TS7053；`.dd-notice__icon--error` **存在**（910）→ 颜色对，只缺图标节点。
- 影响面：**只有 `error` 一个 tone**；success/warning/info 都命中。同一张表被 Alert 复用 →
  **必须两边一起决定**（Alert 要 `danger`、Notice 要 `error`，二者不可互换）。

### H7 · `TitleBar` 居中搜索框整块是写死的浅色
- 位置：`TitleBar.tsx:57,60,61,63`
- 症状：深色主题下窗口正中悬着一块**近乎纯白的胶囊**（`bg-white/92`），是全界面唯一还像浅色主题的控件；
  **鼠标悬停几乎看不出反馈**（白 92%→白 100%），三个阴影在深色背景上全丢；`⌘K` 小块在白底上边界不可见。
- 另：焦点态用的是 `focus-within:`，而这是个 `<button>`、内部没有可聚焦元素
  → **键盘焦点永远不可见**，那 4 个 `focus-within:*` 浅色值是死代码。
- 证据：同文件其余控件（76/102/114/122/130）都已用 `text-muted-foreground` / `hover:bg-secondary`。
- 要改 API 吗：否

### H8 · 启动闪色：浅色 Windows 上每次启动都闪
- 位置：`index.html:124` ↔ `useThemeStore.ts:14` ↔ zustand `middleware.js:360-379`
- 症状：**Windows 用浅色主题、且从没点过主题按钮**的机器上，每次启动先出现浅色加载画面、
  挂载后猛地变深色。点过主题按钮（写过盘）之后才不闪。
- 根因：三条兜底互不认识 —— 预挂载脚本无存储时用 `prefers-color-scheme` 猜；store 初始 `mode` 写死
  `'dark'`；而 **zustand persist 首次 hydrate 不写盘**（只有 `setState` 才写）。
- 要改 API 吗：否（改 `index.html` 兜底值，或首帧写一次存储）

---

## 3. 中严重度（42 条，表格）

### 3.1 表单 `form.tsx`

| # | 位置 | 症状 | 要改 API |
|---|---|---|---|
| M1 | `167,226,325,846` | `<Form>` 认领到的错误只在 `Field` 里显示文字，控件自身**不进错误态、无 `aria-invalid`**；也没有 `aria-describedby` 把文案绑到控件 | 否 |
| M2 | `62,641,760,889,957` | `<label>` 未关联控件 → 点标题文字无反应；三个滑块是**无名滑块** | 否 |
| M3 | `474` | `FormSelect` 下拉面板被 `.dd-popover{max-width:300px}` 卡住，比输入框窄一半（`FormAutoComplete` 同病） | 否 |
| M4 | `413-423,436-470,456` | `FormSelect` 键盘基本不可用：Esc 不关、方向键不选、清空按钮 `tabIndex={-1}` 够不着 | 否 |
| M5 | `875-887` | **`FormSegmentedControl` 缺 `help`/`error`/`name`** → 说明文案被静默丢弃（**订正**：这条不是 `Select`） | 是 |
| M6 | `892-904` | `FormSegmentedControl` 选中态只靠 CSS 类，无 `aria-pressed`/`role="radiogroup"` | 否 |
| M7 | `835-865` | `FormAutoComplete` 完全没有 combobox/listbox 语义与键盘导航 | 否 |
| M8 | `716-731` | `FormSwitch` 的可见文字标签不可点；非字符串标签时**开关没有可访问名** | 否 |
| M9 | `1055-1089` | `<Form>` 校验错误**不随输入清除**，一直挂到下次提交；点「重置」也不清 | 否 |
| M10 | `159,1111` | 见簇 A：`block={false}` 与 `text-xs`/`max-w-[220px]` 静默失效 | 否 |

### 3.2 数据与反馈 `data.tsx` / `feedback.tsx`

| # | 位置 | 症状 | 要改 API |
|---|---|---|---|
| M11 | `feedback:323` | `rounded-inherit` **不是 Tailwind 类**，产物里没有这条规则 → 遮罩直角溢出父容器圆角 | 否 |
| M12 | `feedback:104-120` | `Tabs` 有 role 无键盘交互，tab↔panel 无 `id`/`aria-controls` 关联，缺 roving tabindex | 否 |
| M13 | `feedback:99-100,120` | `Tabs` 的 active 是内部 state 且不随 `items` 校正 → key 消失时**面板整块不渲染**（标签全不亮、下方空白、无报错） | 是 |
| M14 | `feedback:143-179` | `Pagination` 的 `page` 不钳制 → 越界时**一个高亮页码都没有**、`aria-current` 全缺 | 否 |
| M15 | `feedback:490-521` | `Popconfirm` 无 Esc 关闭、无 aria 状态；触发元素不可聚焦时**键盘永远打不开** | 否 |
| M16 | `data:470` | `Timeline tone="info"` 圆点无样式退化成灰色 —— **展示站在用** | 是 |
| M17 | `data:376` | `Statistic tone="info"` 静默无效 | 是 |
| M18 | `data:711` | `DiffBar` 的 `info` 段**完全透明**，条上出现缺口 | 是 |
| M19 | `data:338,343` | 见簇 A：`AvatarGroup` 的叠堆头像变半透明品牌色、`+N` 变品牌色字 | 否 |
| M20 | `data:128,143-174` | `DataTable` 表头无 `scope`、排序无 `aria-sort` | 否 |
| M21 | `data:104-106 vs 193-194` | `rowKey`/`render` 拿到**排序后下标**，全选态用**原始下标** → 调用方按类型写 `(row,i)=>String(i)` 时**排序后勾选会勾到另一行** | 是 |
| M22 | `data:686,711` | `DiffBar` 的 `'muted'` 不在 `SemanticTone` 里（TS2322）。**订正**：这是 DiffBar 的 segment，**不是 Tag**；`dd-diffbar__seg--muted` **存在**，**视觉正常**，只是类型不合法 | 是 |

### 3.3 浮层 `overlay` / `Modal` / `Tooltip` / `Toast` / `BackToTop`

| # | 位置 | 症状 | 要改 API |
|---|---|---|---|
| M23 | `overlay:233-289` | 见簇 E：`Drawer` 关闭不播退场动画 | 否 |
| M24 | `overlay:267-268` | `Drawer` 有 `aria-modal` 却**完全没管焦点**（无移入/无陷阱/无恢复） | 否 |
| M25 | `overlay:63-77,160-174` | `Dropdown`/`Popover` 关闭瞬间重开：外部点击用 `mousedown`、开合用 `click` → **点触发按钮会闪一下** | 否 |
| M26 | `overlay:81-88` | `Dropdown` 触发区是裸 `<span>`，**键盘打不开**、进不了 Tab 顺序 | 否 |
| M27 | `overlay:68-70,165-167` + `Modal:19-21` + `overlay:233-235` | 见簇 H：按一次 Esc **把所有打开的浮层一起关掉** | 否（但要浮层栈） |
| M28 | `Modal:34-38` | 见簇 E：`Modal` 关闭不播退场动画（`if (!isOpen) return null` 更硬） | 否 |
| M29 | `Modal:25,28-31` | 关弹窗把 `body.overflow` **强制改成 `'unset'`** 且 cleanup 无 `if (isOpen)` 守卫 → **父组件重渲染一次就清掉别人的滚动锁**；`Drawer` 却正确存了 `prev`，两者不一致。另缺滚动条宽度补偿，开弹窗时内容横向跳一下 | 否（但要共享引用计数） |
| M30 | `Modal:65-66` | `Modal` 同样无焦点管理、无 `aria-labelledby` | 否 |
| M31 | `Tooltip:32,38-39,91-108` | 气泡**先在窗口左上角 (0,0) 闪一帧**再跳到正确位置（`calculatePosition` 因 `tooltipRef.current` 还是 null 而早退，`coords` 保持初始 0,0） | 否 |
| M32 | `Tooltip:104-108` | 滚动 / 改窗口大小时气泡**不跟随也不关闭**（本项目的滚动容器是 `<main>`） | 否 |
| M33 | `Tooltip:155` | inline `zIndex:9999` 绕过设计体系，压住 Modal 遮罩；`tooltip.css:6` 的 1000 永远不生效 | 否 |
| M34 | `Tooltip:129-136` | 只注入 `onMouseEnter/Leave`，**没有 `onFocus/onBlur`** → 键盘聚焦不出气泡 | 否 |
| M35 | `Toast:84`（渲染点 `MainLayout:29,46`） | `ToastContainer` 嵌在布局 div 里而非 portal 到 body → 与 Modal 的先后由"谁后插入 body"决定，**隐式且脆弱**（就是簇 F 第 1 条的成因） | 否 |
| M36 | `BackToTop:44-49` | 没接 `.dd-float-btn` 类族 → 同一页出现**两种"悬浮按钮"**（48px+shadow-lg+白边 vs 44px+shadow-2 无边框） | 否 |

### 3.4 按钮与图片

| # | 位置 | 症状 | 要改 API |
|---|---|---|---|
| M37 | `Button:33,52-54` | `variant="text"` 是**品牌色**、`variant="ghost"` 是**灰**，与注释（"ghost 工具栏用 / text 最轻"）**正好相反**。改映射会影响 12 处 `ghost` 调用点 | 是 |
| M38 | `Button:49-55` | 缺"幽灵式危险按钮"变体 → 调用点用 `!text-[rgb(var(--danger-rgb))]` **逃逸**，颜色回到 tsx，且 hover 不变色（`!important` 压住了 hover 规则） | 是 |
| M39 | `OutlineButton:18-21` | 名字叫 Outline，**两个变体都没有描边**（都基于 `.btn-ghost`，边框是 transparent） | 是（或删组件） |
| M40 | `IconTextButton:16` | 默认变体（secondary）**完全没有 hover/active 反馈**：`.btn-icon-text{@apply btn-secondary}` 只内联基础声明，`.btn-secondary:hover` 是独立选择器、要求元素带 `btn-secondary` 类 | 否 |
| M41 | `OptimizedImage:29-31,124-139` | `placeholder` 永远看不见（塞进同一个 `<img>` 的 src，没有独立占位层；`isLoaded` 初值 false → 一直 `opacity-0`） | 否 |
| M42 | `OptimizedImage:110-114` | 加载失败**没有降级**：把"失败"当"加载完成"（`setImgSrc(src); setIsLoaded(true)`），碎图以 `opacity:1` 亮出来；渲染出的 `<img>` 无 `onError` | 是 |
| M43 | `OptimizedImage:124-139` | 无宽高比、props 里也没有入口 → 加载完成瞬间**把下面内容顶下去** | 是 |

---

## 4. 低严重度（70 条，按文件归并）

**`form.tsx`（13）**：`FormSelect` 用触发器收起时不清搜索词（再打开还是旧筛选）｜清空回调给 `''` 而非
`null`，与 `value: string \| null` 约定不一致｜`hint` 副文案只在卡片形态渲染，圆点/分段/原生分支静默丢弃｜
`unit` 是 `ReactNode` 却用 `String(unit).length` 算内边距（传 JSX 时变成 222px）｜`multiple={false}` 时拖入
多个文件也全收，且同一文件重选不再触发（input value 未重置）｜`FormUpload` 的 role=button 按空格**顺带滚页**
（无 `preventDefault`）｜`clearable` 未配 `onClear` 时是个**死按钮**｜`name` 只用来认领错误、没落到 DOM 上
（浏览器自动填充失效）｜`showCount` 非受控用法下永远显示 0｜`FormHint` 只能鼠标悬停，无 `role="tooltip"`／
无 `aria-describedby`｜`import React` 是死导入｜一批导出在 src 内 0 引用｜卡片态 radiogroup 无方向键、
无 roving tabindex

**`data.tsx`（5）**：`ListItem` 空格键未 `preventDefault`（**连页面一起滚**，`Breadcrumb` 同型同病）｜
`Badge` 默认 tone 是 `danger` 而 `dd-badge-dot--danger` 不存在（**恰好被基类兜住，无可见差异**）｜
`DataTable` 键盘排序与鼠标排序语义不一致（键盘在新列上第一次就降序）｜选中行输出的 `data-selected`
**在 SCSS 里没有任何定义** → 勾选后整行无高亮｜`Tree` 的 `treeitem` 缺 `aria-selected`，且所有节点 `tabIndex=0`

**`feedback.tsx`（2）**：`Progress` 的 `aria-valuenow` 用未钳制的原值（`value > max` 时读屏拿到非法区间）、
且无可访问名称｜`Toast` 的 `container` 无 `aria-live`

**浮层组（12）**：`Drawer` 无 `title` 时顶部留空栏｜`Dropdown` 的 `role="menu"` 无方向键导航｜
选中后焦点掉回 `<body>`｜`Popover` 的 `role="dialog"` 无标题关联、触发 span 无 `aria-haspopup`｜
`Modal`/`Drawer` 的 Esc 依赖 `onClose` → 内联箭头函数导致每次渲染重挂｜`Tooltip` 的 `setTimeout`/`rAF`
无清理｜`Toast` 进度条颜色写死"跟随父级文字色"→ 四种语义色长得一样｜到点消失、悬停不暂停｜
`clearInterval` 写在 `setState` 的 updater 里｜与 `BackToTop` **抢右下角**｜颜色用 Tailwind 默认调色板
（**同一界面两种绿**）｜`setInterval(100ms)` 持续重渲染｜`BackToTop` 的 `border-white/20` 写死浅色

**按钮与图片（14）**：`Button` 的 `iconOnly` 无兜底（无 icon 时渲染空白圆钮、静默吞 children；当前 12 处
调用点都传了 icon+aria-label，是未爆的雷）｜`size="lg"` 的加载圈比正常图标小一档（16 vs 20）｜
`export default Button` 无人使用｜`OutlineButton` 没给 `type="button"` 兜底（放进 `<form>` 会提交表单）｜
`IconTextButton` 图标尺寸写死 16｜`BrandButton` 等价于 `<Button variant="primary">` 且能力更弱｜
`PageHeader` 与已死的 `.page-header` 规范不一致（无下边框、`items-center` vs `items-end`）——**要不要那条
分隔线是设计决定，未确认**｜`SectionCard` 与 `dd-card` 是两套卡片（**24px vs 8px 圆角、`shadow-lg` vs
`--shadow-card`、24/32px vs 16px 内边距，一屏内肉眼可辨**）｜`ProgressBar` 无 `role="progressbar"`｜
`ProgressBar` 0 引用｜`OptimizedImage` 内联 `imageRendering:'auto'` 把 `.img-hq` 废掉｜`sizes` 是死 prop
（从不输出 `srcSet`）｜`observerRef` 是死变量（**observer 清理本身是对的**）｜换图顺序会**重复下载**；
`loading` 从 lazy 动态改 eager 会让图片**永久透明**

**外壳组（10）**：`MainLayout` 侧栏折叠**不回收宽度**（外层 `aside` 写死 `w-64`，折叠只作用在 Sidebar 根节点
→ 右侧留 192px 空白，看起来"折叠没生效"）｜标题栏 52px vs 404 卡片 `min-h-[calc(100vh-48px)]` → 内容区
**多出 4px 溢出**｜`TitleBar` 三个图标按钮**完全没有可访问名称**｜窗口按钮靠 `title`、最大化永远念"最大化"｜
Windows 上显示 `⌘K`（实际是 Ctrl+K）｜`TitleBar` 里写死的**项目主页链接指向 Rhythm_Toolbox 的 Gitee 仓库**｜
`FloatingSearch` 面板无 dialog 语义、关闭按钮无 `aria-label`、无焦点陷阱｜位置恢复按 400px 宽钳制而面板宽 480px｜
`componentSearch` 不索引 `desc`（与 registry 注释矛盾）｜`main.tsx` 注释仍说生产用 `file://`

---

## 5. 中严重度里最容易被忽略、但影响真实功能的两条

### 搜索结果点了不滚动（两个叠加的 bug）
- 位置：`FloatingSearch.tsx:158` → 接收端 `pages/Components/index.tsx:123-140`
- (a) 接收端 `window.location.hash.replace(/^#/,'')` 在 HashRouter 下拿到 `/components#sec-button`，
  `getElementById` **必为 null**
- (b) 该 effect 只在挂载跑一次、只监听 `hashchange`，而 react-router 的 `Link` 走 `pushState`，
  **不触发 `hashchange`**，同 pathname 也不重挂载
- **另**：`pages/Components/index.tsx:142-151` 的 `scrollToAnchor` 用 `history.replaceState('#'+anchor)`
  **把 HashRouter 的路由前缀整个冲掉** → 点完左侧目录后按 **F5 会落到 404 卡片**

### 3 个 `omit` 条目有搜索结果但页面上没有锚点
- `FloatingSearch.tsx:25` 索引用 `COMPONENTS`（含 omit），正文用 `VISIBLE_COMPONENTS`（过滤 omit）
  → `sec-gradienttext` / `sec-marquee` / `sec-thing` 三个 id 在 DOM 里不存在，点了永远落不到位置

---

## 6. 需要用户决策的点

| # | 决策 | 为什么必须先问 |
|---|---|---|
| D1 | 把 `global-*.scss` 包进 `@layer components`（根治簇 A） | 一次性改变全站层叠结果，必须整体截图回归 |
| D2 | 在 `theme.css` 立 `--z-*` 层级常量（根治簇 F） | 改样式体系 |
| D3 | `Button` 的 `text`/`ghost` 配色是否对调（M37） | 影响现有 12 处调用点的观感 |
| D4 | 给 `Button` 增加"幽灵式危险"变体（M38） | 新增 API |
| D5 | `error` / `danger` 统一方案（簇 C） | 改公开类型 |
| D6 | 是否删除 4 个零引用组件 + `PageBackground` + `window-drag.ts` | "删文件"级决定 |
| D7 | `PageHeader` 要不要下边框（与已死规范对齐与否） | 设计决定，规范文件已丢失 |
| D8 | `SectionCard` 与 `dd-card` 是否统一 | 设计决定 |
| D9 | 是否给 `theme.css` 补 `--color-info`（簇 D） | 改 token |
| D10 | 是否引入 body 滚动锁的共享引用计数（M29） | 新增模块级机制 |

---

## 7. 对既有记载的订正（`AGENTS.md` 第 8 节写错了三处）

| 原记载 | 实际 |
|---|---|
| "给 `Select` 传了 `help`，组件不支持" | **是 `FormSegmentedControl`**，不是 `Select`。`FormSelect` 本身有 `help` 且工作正常。它还缺 `name`/`error` |
| "标签拿到 `dd-tag--muted` 这个不存在的类，无样式" | **是 DiffBar 的 segment，不是 Tag**。`dd-diffbar__seg--muted` **存在**，**视觉正常**；全仓库 `'muted'` 只此一处。只是类型不合法（TS2322） |
| `FormSelect` 不支持 `required`（影响面记为"必填标记丢失"） | 实际是**三层**：① `dd-label__required` 星号不渲染；② 控件上无原生 `required` 也无 `aria-required`；③ 必填语义对辅助技术完全丢失 |

**另外两条新增的既有问题**（不在原 4 条里）：
- `window-drag.ts` 的结论要更正：`main.cjs` 的 `window-get-position` **不是空实现**，它返回真实的
  **数组 `[x,y]`**；而消费端要 `{x,y}` 对象 → 一旦被 import，第一次拖窗会跳到左上角
- `main.cjs:202-208` 的注释说这是"安全的空实现"，**与实现不符**

---

## 8. 审计的验证边界（诚实标注）

- **确定性证据**：所有 z-index 数值（源码 + `dist/assets/*.css` 产物比对）；死类名判定（SCSS grep）；
  `tsc --noEmit` 结果；`ToastContainer` 在 `#root` 内的 DOM 结构（无头 Chrome `--dump-dom` 实测）；
  `.dd-popover{max-width:300px}` 与 inline `zIndex:9999` 的覆盖关系
- **推断未实测**：簇 A 的层叠结论（CSS 层叠层规范的直接推论 + 构建输入结构，未起服务看 computed）；
  `FloatingSearch` 遮罩 z-40 与 header z-50 的实际压盖先后；`pushState` 不触发 `hashchange`
- **未复现**：所有需要交互触发的视觉症状（Modal/Drawer 由 React state 驱动，环境里没有
  puppeteer/playwright，`--dump-dom` 无法点击）。**修之前建议先按位置复现一次**
