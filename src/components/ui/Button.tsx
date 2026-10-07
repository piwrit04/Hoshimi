import React, { ButtonHTMLAttributes, ComponentType, PropsWithChildren } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

/*
 * 按钮的**统一底座**。
 *
 * 背景：项目里原来有三个各自独立的按钮（BrandButton / OutlineButton /
 * IconTextButton），参数各写各的，也没有尺寸和加载态。做「组件展示页」的时候
 * 对照 Naive UI 的按钮文档，发现缺的是这些：
 *
 *   1. variant 应该是一维枚举，而不是「有没有图标」维度的排列组合
 *      —— 原来用 IconTextButton 的 variant 表示颜色、有没有 icon 决定形状，
 *         于是「带图标的主按钮」得写成 <BrandButton><Icon/>文字</BrandButton>，
 *         和 <IconTextButton variant="primary" icon={Icon}>文字</IconTextButton>
 *         是同一个东西的两种写法。
 *   2. 尺寸（sm / md / lg）
 *   3. 加载态（loading，自动禁用 + 转圈）
 *   4. 纯图标按钮（圆形 / 方形）
 *   5. block 全宽
 *
 * 这个组件不替换上面那三个（它们还有引用），它是新组件的底座，
 * 也是展示页里「按钮」一节真正展示的东西。
 *
 * 样式全部走 global-button.scss 里已有的 .btn-* 类，不在这里写颜色。
 */

export type ButtonVariant =
  | 'primary'   // 品牌色实心，一屏只该有一个
  | 'secondary' // 描边，次要操作
  | 'ghost'     // 无边框，工具栏里用
  | 'danger'    // 危险色实心
  | 'text'      // 纯文字，最轻

export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  /** 图标组件（lucide）。给 `icon` + `iconOnly` 就是纯图标按钮 */
  icon?: ComponentType<{ size?: number | string; className?: string }>
  /** 只显示图标。必须有 aria-label，否则读屏软件读不出来 */
  iconOnly?: boolean
  loading?: boolean
  /** 占满父容器宽度 */
  block?: boolean
}

const variantClass: Record<ButtonVariant, string> = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost btn-ghost--muted',
  danger: 'btn-danger',
  text: 'btn-ghost',
}

const sizeClass: Record<ButtonSize, string> = {
  sm: 'btn--sm',
  md: '',
  lg: 'btn--lg',
}

export function Button({
  variant = 'secondary',
  size = 'md',
  icon: Icon,
  iconOnly = false,
  loading = false,
  block = false,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: PropsWithChildren<ButtonProps>) {
  /* 加载中一律禁用：否则用户能连点两次「提交订单」 */
  const isDisabled = disabled || loading

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={cn(
        variantClass[variant],
        sizeClass[size],
        block && 'btn--full',
        iconOnly && 'btn--circle',
        'btn-with-icon',
        className
      )}
      {...rest}
    >
      {loading ? (
        <Loader2 size={size === 'sm' ? 14 : 16} className="animate-spin shrink-0" />
      ) : (
        Icon && <Icon size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} className="shrink-0" />
      )}
      {!iconOnly && children}
    </button>
  )
}

/** 按钮组：把若干个按钮拼成一条，中间的圆角和描边接起来（Naive 的 ButtonGroup） */
export function ButtonGroup({
  children,
  className,
}: PropsWithChildren<{ className?: string }>) {
  return (
    <div className={cn('dd-btn-group', className)} role="group">
      {children}
    </div>
  )
}

export default Button
