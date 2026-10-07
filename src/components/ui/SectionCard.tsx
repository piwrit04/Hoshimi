import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface SectionCardProps {
  /*
   * ⚠️ title 原来是 `string`，但展示页要在标题旁边放「已实现 / 计划中」角标和
   * 英文组件名，那是一段 JSX。改成 ReactNode 后已有的字符串用法完全不受影响。
   */
  title: ReactNode
  extra?: ReactNode
  children: ReactNode
  className?: string
}

export default function SectionCard({ title, extra, children, className }: SectionCardProps) {
  return (
    <div className={cn('bg-card border border-border rounded-xl p-6 md:p-8 shadow-lg space-y-5', className)}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <h3 className="text-lg md:text-xl font-bold border-l-4 border-brand pl-4 text-foreground leading-snug">
          {title}
        </h3>
        {extra}
      </div>
      <div>{children}</div>
    </div>
  )
}
