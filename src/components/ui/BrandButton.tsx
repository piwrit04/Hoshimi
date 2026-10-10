/**
 * @deprecated 请用 `<Button variant="primary">`。保留薄包装以免旧引用断裂。
 */
import { Button, type ButtonProps } from './Button'
import type { PropsWithChildren } from 'react'

type Props = PropsWithChildren<Omit<ButtonProps, 'variant'>>

export default function BrandButton({ children, ...rest }: Props) {
  return (
    <Button variant="primary" {...rest}>
      {children}
    </Button>
  )
}
