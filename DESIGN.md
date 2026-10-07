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
| `--brand-hex` | `#7eb3ff` 蓝 | `#ee7093` 粉 |
| `--on-brand-hex` | `#0f0f11` 近黑 | `#ffffff` |
| `--brand-rgb` | `126, 179, 255` | `238, 112, 147` |

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
--font-sans:    "Microsoft YaHei", "SimHei", "Hiragino Sans GB", "WenQuanYi Micro Hei", ui-sans-serif, system-ui, ...
--font-display: 同上（去掉 -apple-system / BlinkMacSystemFont）
```

**只有中文字体栈，没有任何自定义字体文件**（项目里没有 `.woff2` / `.ttf`）。
对比之下 Cheezit 和工具箱都带了字体资源，所以如果以后要加，这里是空白。

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
| 内容区 `<main>` | `data-scroll-root min-h-0 flex-1 overflow-y-auto overflow-x-hidden` |

**两条硬约定**：

1. **`<main>` 是全站唯一的滚动容器**，不是 `window`。组件展示页的锚点跳转和滚动高亮
   必须找它。它带 `data-scroll-root` 就是给那页用的 —— 比 `querySelector('main')`
   靠标签名稳。`overflow-hidden` 也在最外层，别去掉。
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
