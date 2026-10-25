# 表格排版优化 Prompt（客户原文，2026-10-11）

> **保持配色不变，只调间距和层次。** 实现对照本文，禁止口头缩写。

## 当前问题诊断

### 1. 表格行间距还是太紧
每一行之间几乎贴在一起，尤其是「客户名 + 游戏/渠道」这种两行文字的格子，看着密密麻麻很累眼。

### 2. 表格没有明显的「卡片感」
表格直接平铺在页面底色上，缺少一个包裹它的卡片容器（带圆角、细边框、微弱阴影），导致它跟筛选栏、跟页面底色全都糊在一起，层次不清楚。

### 3. 筛选栏（搜索 + 下拉）和表格之间缺少呼吸感
筛选栏下沿到表格表头之间几乎没有间距，两块内容挤在一起。

### 4. 表头（客户、单号、金额·到手、操作）字重和颜色不够突出
表头现在跟表格内容的字几乎一个色，区分度很弱。应该让表头更淡、更小、更明确地表明「这是列名」。

### 5. 左侧边栏和主内容区之间缺少视觉分割
侧边栏和右边主内容区直接贴在一起，缺少一条竖向的细微分割线或阴影，导致整个界面左右不分明。

---

## 针对性修复（只改排版和间距，不动配色）

### 一、表格卡片化（加独立容器）

**目标：** 给表格套一个带圆角、细边框、微弱阴影的卡片容器，让它跟筛选栏和页面底色明确分开。

**修改位置：** `List.tsx` 中包裹 `<DataTable>` 的外层容器，或 SCSS 给 `.ds-table-card` / `.l2g-table` 的**父容器**加样式。

```tsx
<div className="table-container">
  <DataTable className="ds-table-card l2g-table" … />
</div>
```

```scss
.table-container {
  margin-top: 1.5rem;
  padding: 1.5rem;
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 12px;
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
}

:root {
  .table-container {
    box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.3), 0 1px 2px -1px rgb(0 0 0 / 0.2);
  }
}
```

### 二、表格行高和内边距加大

**目标：** 行间有明显呼吸感；两行文字格子（客户名 + 游戏/渠道）不再挤成一团。

```scss
.l2g-table {
  tbody tr {
    border-bottom: 1px solid hsl(var(--border));
    td {
      padding-top: 1.25rem;
      padding-bottom: 1.25rem;
      padding-left: 1.25rem;
      padding-right: 1.25rem;
      vertical-align: top;
      line-height: 1.6;
    }
    td.customer-cell {
      line-height: 1.5;
      .customer-name {
        font-size: 0.9375rem;
        font-weight: 600;
        color: hsl(var(--foreground));
        margin-bottom: 0.25rem;
      }
      .customer-meta {
        font-size: 0.8125rem;
        color: hsl(var(--muted-foreground));
      }
    }
  }
  thead th {
    padding-top: 0.875rem;
    padding-bottom: 0.875rem;
    padding-left: 1.25rem;
    padding-right: 1.25rem;
    background: hsl(var(--muted) / 0.08);
    color: hsl(var(--muted-foreground));
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase; /* 可选 */
    letter-spacing: 0.05em;
    border-bottom: 1px solid hsl(var(--border));
  }
}
```

### 三、筛选栏与表格之间加间距

```scss
.l2g-filter-bar {
  margin-bottom: 1.5rem;
}
```

### 四、侧边栏与主内容区之间加细微分割

```scss
aside.sidebar {
  border-right: 1px solid hsl(var(--border));
}
```

### 五、整体页面内边距调整

```scss
.ds-page--console {
  padding: 2rem 2.5rem;
}
```

---

## 修改清单总结

1. 给表格套 `.table-container` 卡片容器（圆角 12px、细边框、微弱阴影）
2. 表格行内边距从 `py-4`（1rem）改为 `py-5`（1.25rem）
3. 表头字号 12px、加粗、颜色 `muted-foreground`
4. 筛选栏下方 `margin-bottom: 1.5rem`
5. 侧边栏右侧 `border-right: 1px solid hsl(var(--border))`
6. 主内容区 `padding: 2rem 2.5rem`

改完截图验收（浅深都要）。

---

后续：表格全宽与筛选栏单行见 [`UI-TABLE-WIDTH-FILTER-PROMPT.md`](UI-TABLE-WIDTH-FILTER-PROMPT.md)。

另见：[`UI-SEG-HEADER-ACTIONS-PROMPT.md`](UI-SEG-HEADER-ACTIONS-PROMPT.md)。
