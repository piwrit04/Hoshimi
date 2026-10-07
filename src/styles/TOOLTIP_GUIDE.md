# 全局 Tooltip 样式系统

## 简介

编辑器现已集成全局统一的 Tooltip 样式系统，用于验证警告、提示信息等场景。

## 基础类名

### `.ed-tooltip`
基础 tooltip 样式，默认显示在元素上方。

### `.ed-tooltip--visible`
控制 tooltip 显示/隐藏的类名。添加此类名时 tooltip 可见。

### `.ed-tooltip--bottom`
底部显示的 tooltip 变体（用于表单验证错误提示）。

## 使用方式

### 1. 在 React 组件中使用

```tsx
import '@/styles/tooltip.css';

// 基础用法
<div className="relative">
  <input ... />
  {error && (
    <div 
      className="ed-tooltip ed-tooltip--bottom ed-tooltip--visible"
      style={{ top: 'calc(100% + 8px)', left: '16px' }}
    >
      {error}
    </div>
  )}
</div>
```

### 2. 使用 Input 组件（推荐）

```tsx
import { Input } from '@/components/editor-ui';

<Input
  label="角色名称"
  name="name"
  value={formData.name}
  onChange={handleChange}
  error={!formData.name ? "请输入角色名称" : undefined}
  persistentError  // 错误提示持续显示，不自动消失
/>
```

### 3. 使用 Select 组件

```tsx
import { Select } from '@/components/editor-ui';

<Select
  label="角色属性"
  name="element"
  value={formData.element}
  onChange={handleChange}
  error={!formData.element ? "请选择角色属性" : undefined}
  options={[...]}
/>
```

## 样式变体

### 颜色变体

```css
/* 错误/危险（默认） */
.ed-tooltip

/* 深色 */
.ed-tooltip--dark

/* 信息 */
.ed-tooltip--info

/* 成功 */
.ed-tooltip--success

/* 警告 */
.ed-tooltip--warning
```

### 布局变体

```css
/* 单行（默认） */
.ed-tooltip

/* 多行 */
.ed-tooltip--multiline
```

### 位置变体

```css
/* 顶部（默认） */
.ed-tooltip

/* 底部 */
.ed-tooltip--bottom
```

## 当前使用场景

### 1. 角色编辑器 - 基础信息验证

- **角色名称**: 必填验证，使用 `persistentError` 持续显示
- **英文名称**: 必填验证，使用 `persistentError` 持续显示

位置：`apps/renderer/src/pages/Editor/components/BasicInfoTab.tsx`

### 2. Input 组件

位置：`apps/renderer/src/components/editor-ui/Input.tsx`

支持属性：
- `error`: 错误信息
- `persistentError`: 是否持续显示错误（默认 false，3秒后自动消失）

### 3. Select 组件

位置：`apps/renderer/src/components/editor-ui/Select.tsx`

支持属性：
- `error`: 错误信息（始终显示）

## 样式定制

如需修改全局 tooltip 样式，请编辑：

`apps/renderer/src/styles/tooltip.css`

主要可定制属性：
- 背景色：`background-color`
- 文字色：`color`
- 阴影：`box-shadow`
- 圆角：`border-radius`
- 箭头颜色（::before 伪元素）

## 设计规范

- **错误提示**: 粉色背景 (#EE7093)，白色文字
- **位置**: 底部显示，箭头朝上指向输入框
- **间距**: 距离输入框 8px
- **阴影**: 柔和的粉色阴影，增强层次感
- **动画**: 淡入淡出 + 位移动画，200ms 过渡
