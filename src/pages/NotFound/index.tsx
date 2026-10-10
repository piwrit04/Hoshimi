import { Home, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useSearchStore } from '@/store/useSearchStore'

/* 404：shadcn 风格的极简空状态——居中、一个主操作、一个次操作 */
export default function NotFound() {
  const openSearch = useSearchStore((s) => s.openSearch)
  return (
    <div className="flex min-h-[calc(100vh-56px)] items-center justify-center p-8">
      <div className="ds-rise flex max-w-sm flex-col items-center text-center">
        <span className="text-[13px] font-medium text-brand tabular-nums">404</span>
        <h1 className="mt-2 ds-page-title">页面不存在</h1>
        <p className="mt-2 ds-page-desc">链接可能已失效，或者页面被移动了。</p>
        <div className="mt-6 flex items-center gap-2">
          <button type="button" className="btn-base btn-secondary" onClick={openSearch}>
            <Search size={16} /> 搜索
          </button>
          <Link to="/dashboard" className="btn-base btn-primary">
            <Home size={16} /> 回到概览
          </Link>
        </div>
      </div>
    </div>
  )
}
