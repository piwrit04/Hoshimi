# 设计系统 · 星笺

> ⚠️ **这份文档是从存活的代码重建的，不是原始设计规范。**
>
> 原始的 `design/DESIGN.md`（24KB，开头自称"这份文档是**页面设计与实现的唯一依据**"）
> 随 DaiganComponents 目录一起被删除，不可恢复。配套的 `design/gallery.html` 和
> 22 张深浅对照截图也没了。
>
> 所以本文档只写**代码能证明的事实**，拿不准的一律标成"已丢失"，不编。
> 唯一的例外是第 8 节 —— 那几条有出处：我完整读过被删除的那份 `AGENTS.md`。

---

## 0. 设计系统 v2（2026-10 视觉重构，以本节为准）

**产品定调（2026-10-11）**：可以创新，不必拘泥传统后台；要动画、过渡、呼吸感。密度可以高，但层次和动效要活，禁止死板表格感。

**参考：shadcn/ui Dashboard（blocks/dashboard-01）** 仅作结构起点，配色保留本项目粉色；视觉与动效以本节「动效三原则」和产品定调为准。规格写在 `src/styles/ds.css`（最后引入，覆盖工具箱遗留尺寸）。

| 项 | 规格 |
|---|---|
| 间距 | 只用 4 / 8 / 12 / 16 / 24 / 32；页面 `ds-page`：内边距 24/32，区块间距 24，卡片间距 16 |
| 字号 | 页面标题 20/28 semibold（`ds-page-title`）· 区块标题 14/20 semibold（`ds-section-title`）· 正文 14/20 · 辅助 12/16（`ds-caption`） |
| 控件高度 | md 36（按钮 / 输入 / 选择器 / 分段控件）· sm 32（表格行内、设置行、工具条） |
| 按钮 | 只有 `sm` / `md`。页头操作 = md；表格行内操作 = sm；弹窗底部 = md（取消 secondary + 确认 primary） |
| 圆角 | 控件 8 · 卡片 12 · 标签 6 |
| 卡片 | 唯一样式 `ds-card` / `<Card>`：1px 边框 + bg-card + 极轻阴影；头 16/24，体 16/24/24；hover 不跳动 |
| 统计卡 | `ds-stat`：标签 13 → 数值 28/36 tabular → 脚注 12 |
| 表格 | ✅ **行卡皮已落地（`ea70b61`）**：去格子线、行悬停抬升、错落入场、主列加重；样式在 `global-components.scss` `@layer components`。布局仍用 `table-layout: fixed` + `<colgroup>`、表头 40 / 行 48、首末列 24、数字右对齐 + tabular-nums、金额两位小数。细则见「表格改法」 |
| 动效 | 见下方「动效三原则」 |

### 表格改法（对照 Rhythm Toolbox，订单列表先行）

1. **去后台感**：表头轻字重；去掉厚底与斑马纹；行间只留发丝分隔或行卡间距，禁止满屏格子线。
2. **行当卡片**：悬停微抬升 + 品牌浅晕（对齐 Toolbox `card-panel`）；选中用柔光，不用死灰底。
3. **进场**：行错落入场（`y:10` + 淡入，delay 封顶）；筛选切换柔过渡；尊重 `prefers-reduced-motion`。
4. **信息层次**：主列（客户/项目）加粗放大；金额/状态做视觉锚点；次要列降权——不是每格一样重。

落地顺序：订单列表 → 客户页同皮 → 展示站 `c-datatable` / `c-table`。

悬停：若单元格露缝，行抬升改用阴影（`a9c4791` 已收）。

**层叠约束**：新行卡 / 悬停 / 进场样式必须写在已分层的组件层（`@layer components`）；相关 `ds.css` 表格段也应纳入 `@layer`，避免未分层规则再次盖掉动效（簇 A 残留风险）。

### 新建订单抽屉改法（`a9c4791` 已落地）

1. **分区卡片化**：客户 / 明细 / 托管 / 金额各一块 `ds-card` 感，禁止一长条平铺。
2. **金额条**：吸底或置顶常显；主数字呼吸/强调；改明细时柔过渡。
3. **明细行**：小行卡（与表格行卡同皮）；抽屉进退场缩放+淡入，退场播完。
4. **控件**：对齐 36 高，少边框堆叠。

### 客户页改法（`76225fc` 已落地）

- **列表**：表格行卡皮已齐；只扫工具条密度。
- **详情页（重点）**：头像区 `ds-rise`；三张 KPI 用 `ds-stat`（消费主卡可轻呼吸）；下方订单表同表格皮；合并提示条别抢戏。
- **弹窗**：进退场与订单抽屉一致（缩放+淡入，退场播完）。

### 设置页改法（`bb06cd9` 已落地）

1. 分区 `ds-card` 保留；Tabs / 区块进场用 `ds-rise`。
2. 主题切换：分段控件，不用纯下拉。
3. 费率 / 导入统计：可轻呼吸锚点。
4. 导入预览表：行卡同皮。
5. 目录编辑器：减边框堆叠。
6. 禁止做成传统后台设置列表。

### 个人中心抽屉（已落地）

标题栏头像入口 → 右侧 `Drawer`（与新建订单同皮：缩放+淡入退场）。本机昵称/色调；登录登出与云同步状态；编辑资料可推 Supabase `profiles`。AuthModal 加 `dd-auth-modal` 同皮。样式 `.dd-profile*` / `.dd-titlebar-avatar` 在 `@layer components`。

### 首次引导 SetupWizard（已落地）

全屏居中卡；步骤圆点 + 连线轻呼吸；步进水平滑入淡出；尊重减动。
步：欢迎 → 外观分段实时预览 → 云同步是/跳过（不阻断登录）→ 空账本可选灌演示。样式 `.dd-setup*` 在 `global-components.scss` `@layer components`。设置可重开，不清账本。

### 快捷键一览 / 更新亮点（已落地）

`ShortcutsSheet` / `UpdateHighlights` 用现有 `Modal`（缩放淡入）。快捷键行卡 `.dd-shortcuts__row`、亮点条 `.dd-highlights__item`、`<kbd class="dd-kbd">` 均在 `@layer components`。新版本首次进主壳弹亮点；设置 · 系统可重开。空账本订单/客户空态提供「灌入演示数据」（`seedDemoLedger`）。

### 动效三原则（产品定调，落地以本节为准）

1. **进场**：列表/卡片统一 `ds-rise`（上浮 10px + 淡入 ~360ms）；抽屉/弹窗用缩放+淡入，退场也要播完。问候语可用 `live` 标题 + 粉线。
2. **呼吸**：主 KPI、关键卡片保留/扩展 `ds-breathe`（呼吸光晕）+ CountUp；别满屏都喘。
3. **过渡**：状态切换、筛选、侧栏选中用柔和色变+轻位移，禁止生硬闪切；一律尊重 `prefers-reduced-motion`。

### 组件对照（我们 vs 成熟组件库）

| 组件 | 改了什么 | 参考 |
|---|---|---|
| Button | 40px 胶囊 → 36/32 两档、8px 圆角、500 字重；secondary 改中性描边；去掉 hover 上浮；lg 移除 | shadcn Button / Ant Button（middle 32） |
| 输入框 / 选择器 | 40–44px → 36px；边框走 `--input`；hover 只变边框色；focus 3px 柔光环 | shadcn Input / Arco Input |
| 分段控件（日/周/月等） | 胶囊按钮组 → 底色槽 + 白色滑块，36/32 两档 | Ant Segmented / shadcn Tabs |
| 单选组 | 行高对齐控件高度（min-h 36），与同排输入框齐平 | Element Plus Radio |
| DataTable | 加 colgroup + fixed 布局；表头 / 单元格同 padding；右对齐列表头同向；首末列 24 | Ant Table / shadcn Data Table |
| Tag | 22px 高、6px 圆角、12px 字 | Arco Tag（small） |
| Card / SectionCard | 统一为 `<Card>`，去掉左侧色条和 hover 阴影 | shadcn Card |
| PageHeader | 30px 大标题 + 图标块 → 20px 标题 + 一行说明 + 右侧 md 操作 | Ant Pro PageHeader / shadcn |
| Modal | 头 56 / 底 64、标题 16 semibold、关闭按钮 32 方形、进场 0.98 缩放 | shadcn Dialog |
| Dropdown 菜单 | 菜单项 32px、内边距 4、项圆角 6 | shadcn DropdownMenu |
| 侧栏 | 64→60 宽，顶部主操作「新建订单」，分组标题，选中态浅底而非实心 | shadcn Sidebar（dashboard-01） |
| 标题栏 / 搜索 | 52→56 高与侧栏头齐平；搜索框 36 高 | shadcn / Vercel dashboard |
| 404 | 渐变大字 + 旋转装饰 → 极简空状态 | shadcn 404 block |

演示 / 截图数据：`src/domain/fixtures.ts`，项目只从 `seedCatalog` 取，**不要编项目名**。

---

## ⛔ 组件库使用规约（最高优先级，没有例外）

**所有界面设计必须使用组件库里已有的组件。** 四条硬规定：

1. **动手前先查文档。** 本文件第 7 节是类族总表；已实现组件的清单在
   `src/pages/Components/registry.ts`；实际导出看 `src/components/ui/*`。
   **不许凭印象假设某个组件存在。**
2. **不得乱改。** 不要为了让某个页面好看，就去动 `src/components/ui/*` 的既有行为、
   props 或样式。确实需要改，先说清楚：改什么、为什么、影响哪些调用点。
3. **不得乱加。** 不要随手新增组件塞进 `src/components/ui/`。想要一个新组件，
   它的位置、命名、props 形态、要不要进展示站，都要先讨论。
4. **组件库里没有实现的 → 先问用户，再决定后续怎么做。** 不要自行决定是"就地造一个"、
   "拿别的组件凑"还是"先跳过"，也不要用原生 HTML 偷偷替代一个本该有的组件。

判断"有没有"的方法：先按语义在 `registry.ts` 里搜，再在 `global-components.scss` 里
搜对应的 `.dd-*` 类。**找不到不等于没有** —— 展示站只陈列了 65 个，组件文件里可能有
没进展示站的导出。

---

## 1. 三层结构（别越层）

```
①  theme.css            token 唯一出处：颜色 / 圆角 / 间距 / 阴影 / 字体
        ↓ 被 @import 和 @reference
②  global-*.scss        按前缀分族的组件皮肤（.dd-* / .btn-* / .form-*）
        ↓ 由组件输出对应类名
③  .tsx 里的 Tailwind    只管布局和间距
```

**最关键的认知**：`src/components/ui/*` 里的 Tailwind 类**只管布局**。颜色、边框、悬浮态、
圆角全部来自 ②。**删掉 SCSS，16 个 UI 组件会立刻变成裸框** —— 这不是夸张，是按类名统计出来的
（见第 7 节）。

---

## 2. 颜色

### 2.1 两套主题，深色是默认

挂在 `:root` 上的是**深色**，浅色靠 `:root[data-theme="light"]` 覆盖。
这和 Tailwind 的常规做法相反，但是刻意的（`theme.css` 注释：「少一套机制，就少一处可能不同步的地方」）。

**浅色不是自动算出来的，是手调的** —— 不要写脚本去生成色阶。

### 2.2 品牌色

| | 深色（默认） | 浅色 |
|---|---|---|
| `--brand-hex` | `#f0819f` 粉（2026-10 重做，原来是蓝 `#7eb3ff`） | `#ee7093` 粉 |
| `--on-brand-hex` | `#1c0a10` 近黑 | `#ffffff` |
| `--brand-rgb` | `240, 129, 159` | `238, 112, 147` |

深色底改为中性炭灰阶梯（参照 shadcn zinc dark）：背景 7% → 卡片 10% → 次级 16% → 边框 20%。

⚠️ **深色主题是"亮主色 + 深字"，不是"深主色 + 白字"。** 浅色主题反过来。
用品牌色时一律走 `bg-brand` / `text-on-brand` 这类工具类，别自己配对。

`--color-brand-20/30/60` 是从 `--brand-rgb` 派生的半透明档，所以**两套主题都自动正确**。
（以前这里写死成粉色，深色模式下也是粉的 —— 已修，别改回去。）

### 2.3 语义色：有两套并行，而且浅色那套是坏的

这是本项目最需要注意的一处不一致。

**第一套 —— HSL，给 Tailwind 用**（`--color-success: hsl(var(--success))` 等）：

| token | 深色 | 浅色 | 浅色实际是什么颜色 |
|---|---|---|---|
| `--success` | `142 71% 40%` 绿 ✓ | `224 65% 48%` | **蓝** ✗ |
| `--warning` | `37 92% 52%` 琥珀 ✓ | `344 70% 68%` | **粉** ✗ |
| `--destructive` | `0 62.8% 30.6%` 暗红 ✓ | `344 70% 68%` | **粉**，而且和 `--primary` **完全相同** ✗ |

**第二套 —— RGB 三元组，给 SCSS 用**（`rgb(var(--success-rgb))` 等）：深浅两套都是对的
（success 绿 / warning 琥珀 / danger 红 / info 蓝）。

**已确认可达的后果**：`TitleBar.tsx:130` 的关闭按钮用 `hover:bg-destructive`，
所以**浅色主题下悬停关闭按钮会变成品牌粉，而不是红色**。`text-destructive` / `bg-success` /
`text-warning` 全项目只被这一处直接用到，所以症状目前只有这一个，但地雷是埋着的。

**这不是设计决定，是浅色主题那份 HSL 值抄错了**（看着像是从 `--primary` 复制后忘了改）。
修的话要让浅色那三个 HSL 值跟第二套的色相一致。**动之前先问用户** —— 这属于改设计。

### 2.4 文本与表面

| 用途 | 深色 | 浅色 |
|---|---|---|
| `--text-1` 主文本 | `210 40% 98%` | `262 22% 31%` |
| `--text-2` 次文本 | `215 20% 65%` | `262 17% 58%` |
| `--text-3` 弱文本 | `215 20% 50%` | `262 13% 76%` |
| `--surface-rgb` 控件表面 | `36, 36, 40` = `#242428` | `255, 255, 255` |
| `--surface-hover-rgb` | `44, 44, 50` | `253, 240, 244` |

### 2.5 ⚠️ 必须是 `@theme inline`，不能是普通 `@theme`

这是**最容易踩、症状最迷惑**的一个坑：写成普通 `@theme`，症状是「深色模式怎么切都是浅色」。

原因：普通 `@theme` 会把 `--color-card: hsl(var(--card))` 在 `:root` 上**求值一次并冻结**，
于是 `bg-card` 拿到的是一个写死的浅色，之后 ThemeSync 再改 `--card` 已经影响不到它。
`@theme inline` 不提升变量，而是把**原始表达式** `hsl(var(--card))` 内联进 `background-color`，
`--card` 一变工具类立刻跟着变 —— 这正是运行时换主题需要的行为。

（shadcn/ui 在 Tailwind 4 下同样用 `@theme inline`，原因相同。）

---

## 3. 尺寸、圆角、间距、阴影

**圆角**（`theme.css` 定义的是 px，`@theme inline` 里又映射成 Tailwind 的档位）：

```
--radius-xs 2px   --radius-sm 4px   --radius-md 6px   --radius-lg 8px   --radius-pill 999px
--radius: var(--radius-md)          ← 默认取 md
```

**间距**（工具箱遗留，缺了会静默失效）：`--space-2/3/4/5/6/8` = 4 / 8 / 12 / 16 / 20 / 32 px。

**阴影**：`--shadow-1/2/card/glow` 是基础档，`@theme inline` 里另注册了
`--shadow-soft / glow / inner-soft / floating / layer-1 / layer-2 / brand-soft`
给 Tailwind 用。`--shadow-brand-soft` 从 `--brand-rgb` 派生，两套主题都对。

---

## 4. 字体

```
--font-sans / --font-display:
  "筑紫A丸ゴシック", "Tsukushi A Round Gothic", "M PLUS Rounded 1c",
  PingFang SC / Microsoft YaHei / …

--font-num:  "Inter Variable", "Inter", …   （金额 / 统计数字，tabular-nums）
--font-mono: ui-monospace …
```

- **目标字体**：筑紫A丸（工具箱同款二次元圆体）。Fontworks 商用，**不能随仓库分发**。
- **过渡**：打包 OFL 开源圆体 `M PLUS Rounded 1c`（`@fontsource`，日文+拉丁子集 400/500/700）。
- **本机切换**：把已授权的筑紫 `.otf/.ttf` 放到 `public/fonts/`（见该目录 README），`@font-face` 会优先加载。
- 金额数字始终用 Inter，不用圆体。

⚠️ **字重没有 token。** 被删除的旧规范里有一条「字重只有四档，不要写 550 / 650 / 750」，
但**现行代码里没有任何 `--fw-*` 变量承载它**。规则本身仍然成立（浏览器会把 700 以上就近
吸到最重档，整页糊成粗字），只是现在靠自觉，没有变量兜着。

---

## 5. 主题切换机制

```
localStorage("theme-storage")  →  zustand useThemeStore.mode ('dark' | 'light' | 'system')
                                            ↓
                            ThemeSync 组件（挂在 App 外层）
                                            ↓
              document.documentElement.dataset.theme = 'light' | 删除
              document.documentElement.classList.toggle('dark')
```

- **路由/加载顺序**：`index.html` 里有一段**早于 React 挂载**的脚本，直接读 localStorage
  设 `data-theme`。这是为了不闪一下深色再变浅色 —— **不要把它挪进 React**。
- `dark:` 变体走 class 策略：`@custom-variant dark (&:where(.dark, .dark *))`，
  对应工具箱原来的 `darkMode: ["class"]`。
- `mode === 'system'` 时才监听 `prefers-color-scheme`，否则不监听。

---

## 6. 骨架约定

从 `src/MainLayout.tsx` 实证（那个文件顶部的注释也是规范的一部分）：

| 部分 | 实测 class |
|---|---|
| 最外层 | `h-screen w-screen flex overflow-hidden bg-background text-foreground font-sans` |
| 侧栏 `<aside>` | `hidden md:flex md:flex-col shrink-0 h-full w-64` —— **贴边、无圆角、无外边距** |
| 右侧列 | `min-w-0 flex-1 flex flex-col` |
| 标题栏 `<header>` | `shrink-0 z-50 h-[52px] bg-card/92 backdrop-blur-xl border-b border-border/80` |
| 内容区滚动根 | `Scrollbar` viewport：`data-scroll-root min-h-0 flex-1`（overlay 滚动条；锁滚动 / 锚点都找它） |

**两条硬约定**：

1. **全站唯一滚动容器是 `Scrollbar` 的 viewport**（带 `data-scroll-root`），不是 `window`、也不是 Scrollbar 外壳。
   组件展示页锚点 / 弹层滚动锁用 `getAppScrollRoot()`（`src/lib/scroll-root.ts`）。`overflow-hidden` 仍在最外层，别去掉。
2. **标题栏高 52px**，`MainLayout.tsx` 注释警告改它要连带改 404 卡片里的
   `min-h-[calc(100vh-48px)]`，两处要一起改。⚠️ **但那两个数字（52 和 48）在注释里本身
   就不一致**，说明这对联动值已经漂过一次 —— 真要动，先在浏览器里量一遍再改。

`FloatingSearch` 和 `ToastContainer` 是这一层的兄弟节点，不在滚动容器里。

⚠️ **原规范里"主区只有右侧圆角""两个面板并排"这两条，在现行 `MainLayout.tsx` 里不成立**
（没有任何圆角，也不是两个并排面板）。要么是规范没落地，要么是后来改过。**以代码为准，改之前问。**

---

## 7. 类族（谁在用、谁已经死了）

按类名在 `.tsx` / `.ts` 里出现的次数实测统计：

| 文件 | 定义类数 | 组件里用到 | 状态 |
|---|---|---|---|
| `global-components.scss` | 188 | **142** | **核心**。`.dd-*` 全族：表单、表格、标签、卡片、弹层、导航、反馈、数据展示…… |
| `global-button.scss` | 38 | 14 | 活的。`.btn-base / primary / secondary / ghost / danger / icon-text / with-icon / --sm/--lg/--circle/--full` |
| `global-form.scss` | 14 | 10 | 活的。`.form-input / select / textarea / help / error / radio-group / radio-option` |
| `theme.css` | 11 | 8 | token + 工具类（`.text-brand` / `.bg-brand` / `.custom-scrollbar` 等） |
| `tooltip.css` | 11 | 6 | 活的，`.tip-*` |
| `alert.css` | 6 | **0** | **死的**。`.ed-alert` 一族 |
| `editor-theme.css` | 3 | **0** | **死的**。只给 alert.css 提供 `--ed-*` 变量 |
| `global-page.scss` | 39 | **0** | **死的**。`.card-showcase` / `.card-quick-access` / `.page-title` / `.page-header` |

**后三个文件（约 15KB）可以连同 `index.css` 里对应的 `@import` 一起删掉。**
删之前按上表的方法重新核一遍，别凭文件名判断。

`.dd-*` 里几个容易找不到的：`.dd-spec`（说明用的 `<dl>` 规格块，在文件末尾）、
`.dd-upload-tile` / `.dd-upload-item`、`.dd-qr`、`.dd-index-link` / `.dd-index-group`
（展示页侧边目录用）—— 全在 `global-components.scss`。

---

## 8. 从旧规范抢救出来的规则

以下是**被删除的 `DaiganComponents/AGENTS.md`** 里的「不可违反的设计约束」原文要点，
逐条标注了在现行代码里的适用性。**大部分仍然有效，但有两条已经和代码不符，一条已不适用。**

| # | 旧规范原文 | 现行适用性 |
|---|---|---|
| 1 | 骨架是效果图定死的，不要改布局：侧栏贴窗口左/上/下、**无圆角、无外边距**；主区只有右侧圆角；两个面板并排 | **部分成立** —— 侧栏贴边无圆角成立；「主区只有右侧圆角」和「两个面板并排」在代码里**不成立**，见第 6 节 |
| 2 | 字重只有四档（400/500/600/700），**不要写 550 / 650 / 750** | **规则有效，但无变量承载** —— 旧的 `--fw-*` 令牌没有搬过来，见第 4 节 |
| 3 | 深色不是纯黑，是 Linear 式深灰（`#0F0F11` / `#1F1F22` / `#242428`） | **成立** —— `--on-brand-hex: #0f0f11`、`--surface-rgb: 36,36,40` = `#242428` 都在 |
| 4 | 深色模式的**主色要够深**，因为实心按钮上是白字；不要靠改文字色去迁就亮主色 | **已推翻** —— 现行深色用 `#7eb3ff` 亮蓝 + `#0f0f11` 深字，正好相反。不要再照这条做 |
| 5 | 不要在组件里写死颜色和尺寸，一律走变量 | **被违反** —— `TitleBar.tsx` 里写死了 `#D7CDE8` / `#CBBBE3` / `#8E83A8` / `#FAF7FF` 等一堆浅色 hex。**改配色时这里是最大的雷** |
| 6 | 红只当危险色、绝不当品牌色；**不要加渐变** | **基本成立** —— 品牌色是蓝/粉非红；浅色下 `--destructive` 等于品牌粉是个 bug（第 2.3 节），不是设计意图 |
| 7 | 吉祥物只出现在空状态 | **无法验证** —— 本项目**没有吉祥物**。那只自绘小白鼠（`chiz.tsx`）留在 Cheezit 里，没搬过来 |
| 8 | 语义色**色相锁死**，永不随主题色变（换主题色不能让"退款"看起来像"正常订单"） | **成立且重要** —— `--success-rgb` / `--warning-rgb` / `--danger-rgb` / `--info-rgb` 深浅各一份、色相独立。**但浅色那套 HSL 违反了这条**，见第 2.3 节 |
| 9 | 图标用 `@tabler/icons-react`，`size={18}` + `stroke={1.6}`；不要自己画 SVG，不要混用图标库 | **已不适用** —— 那是 Mantine 时代的规则。本项目**没有装 Mantine**，实际用 **`lucide-react`**（第 9 节） |

---

## 9. 图标

- **库**：`lucide-react@0.469.0`。这是全项目**唯一**的图标库。
- 旧规范说的 `@tabler/icons-react` 从未安装过（`package.json` 里没有），
  它对应的 Mantine 也不存在 —— 那份 `AGENTS.md` 的这部分已经过期。
- 实际用法不统一：`size` 从 13 到 24 都有，`stroke` 基本没显式指定。
  旧规范的 `size={18} stroke={1.6}` 是个好基准，可以考虑收敛过去，但目前**没有强制**。
- 品牌图形没有任何 SVG 资源文件 —— 唯一的图形是 `index.html` 里的内联 favicon（一个字）。

---

## 10. LOGO 与图标资源

**现状：全部是占位。**

| 位置 | 内容 |
|---|---|
| `electron/build/icon.png` | 512×512，品牌蓝圆角方块 + 近黑「星」字 |
| `electron/build/icon.ico` | 同上，7 个尺寸（16~256） |
| `index.html` 内联 favicon | 同一套配色的 SVG，`rx=8`，字「星」 |
| `src/components/layout/Sidebar.tsx` | 文字字标：展开 `星笺`、折叠 `星` |

生成脚本在 `scripts/make-placeholder-icon.py`（Python + Pillow），
颜色取自深色主题的 `--brand-hex` / `--on-brand-hex`，改两行就能换配色。

⚠️ **16×16 和 24×24 下「星」会糊成一个色块**（有实测尺寸对照图）。
这是"拿汉字当图标"的固有代价。真做 LOGO 时建议：**小尺寸用简单星形几何图形，
大尺寸才用完整字形** —— 也就是分尺寸差异化，而不是同一张图等比缩。

**图标的历史**：`electron/build/` 里原有的 `icon.ico` / `icon.png` 是 DaiganComponents
的图标，已于本次改名时替换。

---

## 11. 已丢失、无法重建的部分

按重要性排序：

1. **效果图**（AI 生成的概念图，据旧规范是"骨架"的源头）—— 全没了
2. **8 组深浅对照截图**：`components-buttons` / `components-forms` / `components-overlays` /
   `components-product` / `fullpage` / `design-palette` / `icon-library` / `app-shell`
   —— 这是唯一一套视觉基准
3. **`design/gallery.html`** 可交互设计索引（色板、图标库都在里面）
4. **`DESIGN.md` 正文**：设计怎么定下来的完整推导、以及第 8 节那 9 条背后的理由（"这条被违反过"之类）
5. **`产品定义.md`**：角色权限、金额算法、状态机、导入规则、一期范围

**参照物**：`Cheezit` 目录里有一套完整的 `DESIGN.md` + `PRODUCT.md`，**而且那边有 git**。
两个项目同域（都是代肝生意），用户已明确本项目定位是**取代** Cheezit ——
重建业务文档时，那里是最现实的起点。


---

## 组件库近期变更（维护备忘）

- **浮层栈** `src/lib/overlay-stack.ts`：Modal / Drawer / `Modal.confirm` 共用；Esc 只关最顶一层；滚动锁引用计数，锁的是 `data-scroll-root` 真实滚动区。
- **FormUpload** 的 `UploadFile.file` 保留真实 `File`（可读 Excel）。
- **FormSelect** 清空传 `null`（与 `value: string | null` 一致）。
- **DatePicker** ready：贴底上翻、`disabledDate`。**TimePicker** / **FormCheckboxGroup** / **LoadingBar** / **Modal.confirm** 已补。
- **BrandButton / OutlineButton / IconTextButton / ProgressBar** 已薄包装到 `Button` / `Progress`，标 `@deprecated`。
- 暂缓：Cascader、Transfer、DatetimePicker 一体控件（可用 Date + Time 拼）。
