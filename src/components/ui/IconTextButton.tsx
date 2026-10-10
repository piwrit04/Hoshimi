import React, { ComponentType } from 'react'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

type IconTextButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

interface IconTextButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ComponentType<{ size?: number }> | LucideIcon
  children: React.ReactNode
  variant?: IconTextButtonVariant
}

const variantClassMap: Record<IconTextButtonVariant, string> = {
  primary: 'btn-primary btn-with-icon',
  secondary: 'btn-icon-text btn-with-icon',
  ghost: 'btn-icon-text btn-icon-text--ghost btn-with-icon',
  danger: 'btn-icon-text btn-icon-text--danger btn-with-icon',
}

export default function IconTextButton({
  icon: Icon,
  children,
  variant = 'secondary',
  className,
  ...rest
}: IconTextButtonProps) {
  return (
    <button
      type="button"
      {...rest}
      className={cn(variantClassMap[variant], className)}
    >
      <Icon size={16} />
      <span>{children}</span>
    </button>
  )
}
