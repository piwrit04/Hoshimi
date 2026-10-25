# 修复表格宽度和筛选栏布局（客户原文，2026-10-11）

> 对照原文落地，禁止口头缩写。改完浅深截图验收。

## 问题 1：表格宽度不填满

**原因：** `.table-container` 或 `.ds-page--console` 可能设置了 `max-width` 限制，或者没有明确指定 `width: 100%`。

**修复：**

```scss
.table-container {
  width: 100%;
  max-width: none;
  margin-top: 1.5rem;
  padding: 1.5rem;
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 12px;
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
}

.ds-page--console {
  width: 100%;
  max-width: none;
  padding: 2rem 2.5rem;
}

.l2g-table {
  width: 100%;
  table-layout: auto;
}
```

## 问题 2：筛选栏强制单行排列

**原因：** `.l2g-filter-bar` 内 `.l2g-seg` 与 `.ds-toolbar` 可能 `flex-wrap: wrap`，稍窄就换行。

**修复：强制同一行，左右分开。**

```scss
.l2g-filter-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  flex-wrap: nowrap;
  padding: 1rem 1.25rem;
  margin-bottom: 1.5rem;
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 12px;
  box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
}

.l2g-seg {
  flex-shrink: 0;
}

.ds-toolbar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: nowrap;
  flex-shrink: 1;

  input[type="search"] {
    min-width: 180px;
    flex-shrink: 1;
  }

  select {
    flex-shrink: 0;
  }
}
```

**可选（仅极窄屏）：**

```scss
@media (max-width: 1024px) {
  .l2g-filter-bar {
    flex-wrap: wrap;
  }
  .l2g-seg {
    width: 100%;
  }
  .ds-toolbar {
    width: 100%;
  }
}
```

## 修改清单

1. `.table-container`、`.ds-page--console`、`.l2g-table` 全部加 `width: 100%; max-width: none;`
2. `.l2g-filter-bar` 加 `flex-wrap: nowrap; justify-content: space-between;`
3. `.l2g-seg` 加 `flex-shrink: 0;`，`.ds-toolbar` 加 `flex-wrap: nowrap;`

另见：[`UI-SEG-HEADER-ACTIONS-PROMPT.md`](UI-SEG-HEADER-ACTIONS-PROMPT.md)。
