import { ReactNode, ElementType } from 'react'
import { cn } from '@/lib/utils'

/*
 * 页面头：参照 shadcn dashboard —— 标题 20/28 semibold，下方一行 13px 说明，
 * 右侧操作统一 md（36px）按钮、间距 8。图标仅作可选，小尺寸不抢标题。
 */
interface PageHeaderProps {
  icon?: ElementType
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  className?: string
}

export function PageHeader({ icon: Icon, title, description, actions, className }: PageHeaderProps) {
  return (
    <header className={cn('ds-page-header', className)}>
      <div className="min-w-0 flex items-center gap-3">
        {Icon && (
          <span className="hidden sm:inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-20 text-brand">
            <Icon size={18} />
          </span>
        )}
        <div className="min-w-0">
          <h1 className="ds-page-title truncate">{title}</h1>
          {description ? <p className="ds-page-desc truncate">{description}</p> : null}
        </div>
      </div>
      {actions && <div className="ds-page-header__actions">{actions}</div>}
    </header>
  )
}

export default PageHeader
