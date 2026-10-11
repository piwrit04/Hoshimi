import { ReactNode, ElementType } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'

/*
 * 页面头：标题 20/28 semibold，下方一行 13px 说明，右侧 md 操作。
 * live：问候语等会动的标题（轻上浮 + 粉线），不影响对齐规格。
 */
interface PageHeaderProps {
  icon?: ElementType
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  className?: string
  /** 标题带进场动画与粉色短下划线（概览问候语等） */
  live?: boolean
}

export function PageHeader({ icon: Icon, title, description, actions, className, live }: PageHeaderProps) {
  const reduce = useReducedMotion()
  return (
    <header className={cn('ds-page-header', className)}>
      <div className="min-w-0 flex items-center gap-3">
        {Icon && (
          <span className="hidden sm:inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-20 text-brand">
            <Icon size={18} />
          </span>
        )}
        <div className="min-w-0">
          {live && !reduce ? (
            <motion.h1
              key={typeof title === 'string' ? title : undefined}
              className="ds-page-title ds-page-title--live truncate"
              initial={{ opacity: 0, y: 8, filter: 'blur(2px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
            >
              {title}
            </motion.h1>
          ) : (
            <h1 className={cn('ds-page-title truncate', live && 'ds-page-title--live')}>{title}</h1>
          )}
          {description ? <p className="ds-page-desc truncate">{description}</p> : null}
        </div>
      </div>
      {actions && <div className="ds-page-header__actions">{actions}</div>}
    </header>
  )
}

export default PageHeader
