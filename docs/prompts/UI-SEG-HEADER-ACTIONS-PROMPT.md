# 分段控制器文字颜色 + 右上角按钮布局（客户原文，2026-10-11）

> 对照原文落地，禁止口头缩写。改完浅深截图验收。

## 问题 1：分段控制器未激活按钮的文字颜色难看

**原因：** 未激活文字用 `hsl(var(--muted-foreground))`，深色下对比度不够、发黑发暗。

**修复：未激活更亮、更清晰。**

```scss
.l2g-seg {
  @apply inline-flex gap-1 p-1;
  background: hsl(var(--muted) / 0.1);
  border-radius: var(--radius-lg);

  button {
    @apply px-4 py-1.5;
    font-size: 0.875rem;
    font-weight: 500;
    color: hsl(var(--foreground) / 0.6);
    border-radius: calc(var(--radius-lg) - 2px);
    transition: all 0.15s ease;

    &:hover {
      color: hsl(var(--foreground) / 0.85);
      background: hsl(var(--muted) / 0.2);
    }

    &.active {
      background: hsl(var(--primary));
      color: hsl(var(--primary-foreground));
      box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
    }
  }
}
```

浅色微调：

```scss
:root[data-theme="light"] {
  .l2g-seg button {
    color: hsl(var(--foreground) / 0.5);
    &:hover {
      color: hsl(var(--foreground) / 0.75);
    }
  }
}
```

## 问题 2：右上角按钮位置调整

目标：`.l2g-orders-head` 左右分开——左标题+副标题，右导出+新建订单。

```scss
.l2g-orders-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 1.5rem;

  &__title-group {
    flex: 1;
    .title {
      font-size: 1.75rem;
      font-weight: 700;
      color: hsl(var(--foreground));
      letter-spacing: -0.025em;
      margin-bottom: 0.5rem;
    }
    .subtitle {
      font-size: 0.9375rem;
      color: hsl(var(--muted-foreground));
    }
  }

  &__actions {
    display: flex;
    gap: 0.75rem;
    flex-shrink: 0;
    align-items: center;
  }
}
```

```tsx
<div className="l2g-orders-head">
  <div className="l2g-orders-head__title-group">
    <h1 className="title">订单管理</h1>
    <p className="subtitle">共 6 单 · 流水 ¥… · 到手 ¥…</p>
  </div>
  <div className="l2g-orders-head__actions">
    <button className="action-btn">导出</button>
    <button className="action-btn primary">新建订单</button>
  </div>
</div>
```

可选：按钮移到页面顶层右上与顶栏搜索对齐。

## 修改清单

1. `.l2g-seg button` 未激活：`foreground / 0.6`，悬停 `/ 0.85`（勿用 muted-foreground）
2. `.l2g-orders-head` 左右布局：`__title-group` + `__actions`
3. 按钮间距 `gap: 0.75rem`
