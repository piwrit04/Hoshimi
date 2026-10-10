/**
 * @deprecated 请用 `<Progress>`（feedback.tsx）。保留薄包装以免旧引用断裂。
 */
import * as React from 'react'
import { Progress } from './feedback'
import { cn } from '@/lib/utils'

interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number
  max?: number
  variant?: 'default' | 'success' | 'warning' | 'danger'
}

const toneMap = {
  default: 'brand',
  success: 'success',
  warning: 'warning',
  danger: 'danger',
} as const

const ProgressBar = React.forwardRef<HTMLDivElement, ProgressBarProps>(
  ({ className, value, max = 100, variant = 'default', ...props }, ref) => {
    return (
      <div ref={ref} className={cn(className)} {...props}>
        <Progress value={value} max={max} tone={toneMap[variant]} />
      </div>
    )
  }
)
ProgressBar.displayName = 'ProgressBar'

export { ProgressBar }
