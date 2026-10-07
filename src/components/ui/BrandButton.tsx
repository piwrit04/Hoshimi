import { ButtonHTMLAttributes, PropsWithChildren } from 'react'
import { cn } from '@/lib/utils'

type Props = PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>>

export default function BrandButton({ className, children, ...rest }: Props) {
  return (
    <button
      {...rest}
      className={cn('btn-primary btn-with-icon', className)}
    >
      {children}
    </button>
  )
}
