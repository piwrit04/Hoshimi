import React, { ButtonHTMLAttributes, PropsWithChildren } from 'react'
import { cn } from '@/lib/utils'

type OutlineButtonVariant = 'ghost' | 'danger'

type Props = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: OutlineButtonVariant
  }
>

export default function OutlineButton({
  className,
  children,
  variant = 'ghost',
  ...rest
}: Props) {
  const variantClass: Record<OutlineButtonVariant, string> = {
    ghost: 'btn-ghost btn-ghost--muted btn-with-icon',
    danger: 'btn-ghost btn-ghost--danger btn-with-icon',
  }

  return (
    <button
      {...rest}
      className={cn(variantClass[variant], className)}
    >
      {children}
    </button>
  )
}
