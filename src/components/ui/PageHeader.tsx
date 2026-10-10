import { ReactNode, ElementType } from 'react'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  icon?: ElementType
  title: string
  actions?: ReactNode
  className?: string
}

export function PageHeader({ icon: Icon, title, actions, className }: PageHeaderProps) {
  return (
    <header className={cn('flex items-center justify-between py-8', className)}>
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3 text-foreground">
          {Icon && <span className="bg-brand-20 text-brand p-2 rounded-lg"><Icon size={24} /></span>}
          {title}
        </h1>
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </header>
  )
}

/*
 * 兼容两种导入写法，因为在搬进来的代码里两种都存在：
 *   pages/Components/index.tsx   →  import { PageHeader } from '@/components/ui/PageHeader'
 *   pages/Components/sections/misc.tsx → 同上
 * 原本本文件只有 `export default`，这两个调用点会直接让 vite build 失败
 * （rollup: "PageHeader is not exported"）。保留默认导出以免将来别处按默认导入时又断。
 */
export default PageHeader
