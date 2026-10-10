import * as React from "react"
import { cn } from "@/lib/utils"

interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number
  max?: number
  variant?: "default" | "success" | "warning" | "danger"
}

const ProgressBar = React.forwardRef<HTMLDivElement, ProgressBarProps>(
  ({ className, value, max = 100, variant = "default", ...props }, ref) => {
    const percentage = Math.min(Math.max(0, (value / max) * 100), 100)

    const variantStyles = {
      default: "bg-primary",
      success: "bg-green-500",
      warning: "bg-yellow-500",
      danger: "bg-red-500",
    }

    return (
      <div
        ref={ref}
        className={cn(
          "h-2 w-full overflow-hidden rounded-full bg-muted-foreground/20 border border-border",
          className
        )}
        {...props}
      >
        <div
          className={cn("h-full w-full flex-1 transition-all duration-500 ease-out", variantStyles[variant])}
          style={{ transform: `translateX(-${100 - percentage}%)` }}
        />
      </div>
    )
  }
)
ProgressBar.displayName = "ProgressBar"

export { ProgressBar }
