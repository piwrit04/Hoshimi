import { ReactNode } from 'react'
import { Card } from '@/components/ui/Card'

/** 兼容旧调用：内部就是统一的 Card */
interface SectionCardProps {
  title: ReactNode
  extra?: ReactNode
  children: ReactNode
  className?: string
}

export default function SectionCard({ title, extra, children, className }: SectionCardProps) {
  return (
    <Card title={title} extra={extra} className={className}>
      {children}
    </Card>
  )
}
