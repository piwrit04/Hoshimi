import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

/*
 * 唯一的卡片样式（shadcn Card）：1px 边框、12 圆角、极轻阴影，头部 16/24，内容 16/24/24。
 * 页面里不要再手写 `bg-card border rounded-xl p-5` 这类组合。
 */
export function Card({
  title,
  description,
  extra,
  flush,
  className,
  bodyClassName,
  children,
  ...rest
}: Omit<HTMLAttributes<HTMLDivElement>, 'title'> & {
  title?: ReactNode
  description?: ReactNode
  extra?: ReactNode
  /** 内容区不留内边距（放表格时用） */
  flush?: boolean
  bodyClassName?: string
}) {
  const hasHeader = title != null || extra != null
  return (
    <section className={cn('ds-card', flush && 'ds-card--flush', className)} {...rest}>
      {hasHeader ? (
        <div className={cn('ds-card__header', flush && 'pb-4 border-b border-border')}>
          <div className="min-w-0">
            {title != null ? <h2 className="ds-section-title truncate">{title}</h2> : null}
            {description != null ? <p className="ds-caption mt-0.5 truncate">{description}</p> : null}
          </div>
          {extra != null ? <div className="flex shrink-0 items-center gap-2">{extra}</div> : null}
        </div>
      ) : null}
      <div className={cn('ds-card__body', flush && 'ds-card__body--flush', !hasHeader && !flush && 'pt-6', bodyClassName)}>
        {children}
      </div>
    </section>
  )
}

export default Card
