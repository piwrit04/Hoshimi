/**
 * @deprecated 请用 `<Button variant="ghost|danger">`。保留薄包装以免旧引用断裂。
 */
import { Button, type ButtonProps } from './Button'
import type { PropsWithChildren } from 'react'

type OutlineButtonVariant = 'ghost' | 'danger'

type Props = PropsWithChildren<
  Omit<ButtonProps, 'variant'> & {
    variant?: OutlineButtonVariant
  }
>

export default function OutlineButton({
  children,
  variant = 'ghost',
  ...rest
}: Props) {
  return (
    <Button variant={variant} {...rest}>
      {children}
    </Button>
  )
}
