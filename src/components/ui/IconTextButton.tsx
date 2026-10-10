/**
 * @deprecated 请用 `<Button icon={...} variant={...}>`。保留薄包装以免旧引用断裂。
 */
import { Button, type ButtonProps, type ButtonVariant } from './Button'
import type { ComponentType, ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

type IconTextButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

interface IconTextButtonProps extends Omit<ButtonProps, 'variant' | 'icon'> {
  icon: ComponentType<{ size?: number }> | LucideIcon
  children: ReactNode
  variant?: IconTextButtonVariant
}

const map: Record<IconTextButtonVariant, ButtonVariant> = {
  primary: 'primary',
  secondary: 'secondary',
  ghost: 'ghost',
  danger: 'danger',
}

export default function IconTextButton({
  icon,
  children,
  variant = 'secondary',
  ...rest
}: IconTextButtonProps) {
  return (
    <Button icon={icon as ButtonProps['icon']} variant={map[variant]} {...rest}>
      {children}
    </Button>
  )
}
