import { useState, type ReactNode } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info as InfoIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SemanticTone } from './data'

/*
 * ============================================================
 *  导航 + 反馈组件组
 * ============================================================
 *
 * 导航：面包屑 / 标签页 / 分页 / 步骤条
 * 反馈：进度条 / 提示条 / 加载动画 / 结果页 / 通知
 *
 * 样式走 global-components.scss 的 .dd-* 类。
 */

/* ------------------------------------------------------------------ */
/* 面包屑                                                              */
/* ------------------------------------------------------------------ */

export interface BreadcrumbItem {
  label: ReactNode
  onClick?: () => void
}

export function Breadcrumb({
  items,
  className,
}: {
  items: BreadcrumbItem[]
  className?: string
}) {
  return (
    <nav className={cn('dd-breadcrumb', className)} aria-label="面包屑">
      {items.map((it, i) => {
        const last = i === items.length - 1
        return (
          <span key={i} className="inline-flex items-center gap-1.5">
            {last ? (
              <span className="dd-breadcrumb__current" aria-current="page">
                {it.label}
              </span>
            ) : (
              <>
                <span
                  className={cn('dd-breadcrumb__link', !it.onClick && 'cursor-default')}
                  role={it.onClick ? 'button' : undefined}
                  tabIndex={it.onClick ? 0 : undefined}
                  onClick={it.onClick}
                  onKeyDown={
                    it.onClick
                      ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') it.onClick?.()
                        }
                      : undefined
                  }
                >
                  {it.label}
                </span>
                <ChevronRight size={13} className="dd-breadcrumb__sep" />
              </>
            )}
          </span>
        )
      })}
    </nav>
  )
}

/* ------------------------------------------------------------------ */
/* 标签页                                                              */
/* ------------------------------------------------------------------ */

export interface TabItem {
  key: string
  label: ReactNode
  content: ReactNode
  disabled?: boolean
}

export function Tabs({
  items,
  defaultActiveKey,
  variant = 'line',
  className,
}: {
  items: TabItem[]
  defaultActiveKey?: string
  variant?: 'line' | 'pill'
  className?: string
}) {
  const [active, setActive] = useState(defaultActiveKey ?? items[0]?.key)
  const current = items.find((i) => i.key === active)

  return (
    <div className={cn(variant === 'pill' && 'dd-tabs--pill', className)}>
      <div className="dd-tabs__list" role="tablist">
        {items.map((it) => (
          <button
            key={it.key}
            type="button"
            role="tab"
            disabled={it.disabled}
            aria-selected={it.key === active}
            data-active={it.key === active}
            className="dd-tabs__tab"
            onClick={() => setActive(it.key)}
          >
            {it.label}
          </button>
        ))}
      </div>
      {current && <div className="dd-tabs__panel" role="tabpanel">{current.content}</div>}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 分页                                                               */
/* ------------------------------------------------------------------ */

export function Pagination({
  total,
  page,
  pageSize,
  onChange,
  className,
}: {
  /** 总条数 */
  total: number
  page: number
  pageSize: number
  onChange: (page: number) => void
  className?: string
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize))

  /* 页码窗口：首/尾 + 当前页两侧各 1，中间用省略号。
     页数少（≤7）就直接全列，不省略。 */
  const pages = (() => {
    if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1)
    const set = new Set<number>([1, pageCount, page, page - 1, page + 1])
    const list = [...set].filter((p) => p >= 1 && p <= pageCount).sort((a, b) => a - b)
    const out: (number | 'gap')[] = []
    list.forEach((p, i) => {
      if (i > 0 && p - list[i - 1] > 1) out.push('gap')
      out.push(p)
    })
    return out
  })()

  return (
    <nav className={cn('dd-pagination', className)} aria-label="分页">
      <button
        type="button"
        className="dd-pagination__item"
        disabled={page <= 1}
        aria-label="上一页"
        onClick={() => onChange(page - 1)}
      >
        <ChevronLeft size={15} />
      </button>
      {pages.map((p, i) =>
        p === 'gap' ? (
          <span key={`gap-${i}`} className="dd-pagination__ellipsis">…</span>
        ) : (
          <button
            key={p}
            type="button"
            className="dd-pagination__item"
            data-active={p === page}
            aria-current={p === page ? 'page' : undefined}
            onClick={() => onChange(p)}
          >
            {p}
          </button>
        )
      )}
      <button
        type="button"
        className="dd-pagination__item"
        disabled={page >= pageCount}
        aria-label="下一页"
        onClick={() => onChange(page + 1)}
      >
        <ChevronRight size={15} />
      </button>
      <span className="text-xs text-muted-foreground ml-2 tabular-nums">
        共 {total} 条 / {pageCount} 页
      </span>
    </nav>
  )
}

/* ------------------------------------------------------------------ */
/* 步骤条                                                              */
/* ------------------------------------------------------------------ */

export interface StepItem {
  title: ReactNode
  desc?: ReactNode
}

export function Steps({
  items,
  current,
  direction = 'horizontal',
  className,
}: {
  items: StepItem[]
  /** 从 0 开始。current 之前的算已完成 */
  current: number
  direction?: 'horizontal' | 'vertical'
  className?: string
}) {
  return (
    <ol className={cn('dd-steps', direction === 'vertical' && 'dd-steps--vertical', className)}>
      {items.map((it, i) => {
        const done = i < current
        const active = i === current
        return (
          <li
            key={i}
            className="dd-steps__item"
            data-done={done}
            data-active={active}
            aria-current={active ? 'step' : undefined}
          >
            <span className="dd-steps__dot">{done ? <CheckCircle2 size={14} /> : i + 1}</span>
            <div className="dd-steps__body">
              <div className="dd-steps__title">{it.title}</div>
              {it.desc && <div className="dd-steps__desc">{it.desc}</div>}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

/* ------------------------------------------------------------------ */
/* 进度条                                                              */
/* ------------------------------------------------------------------ */

export function Progress({
  value,
  max = 100,
  tone = 'brand',
  showLabel,
  striped,
  className,
}: {
  value: number
  max?: number
  tone?: 'brand' | 'success' | 'warning' | 'danger'
  /** 右侧显示百分比 */
  showLabel?: boolean
  striped?: boolean
  className?: string
}) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div
        className="flex-1 h-2 rounded-full overflow-hidden bg-border"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div
          className={cn(
            'h-full transition-[width] duration-500 ease-out',
            tone === 'brand' && 'bg-brand',
            tone === 'success' && 'dd-diffbar__seg--success',
            tone === 'warning' && 'dd-diffbar__seg--warning',
            tone === 'danger' && 'dd-diffbar__seg--danger',
            striped && 'dd-progress-striped'
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs tabular-nums text-muted-foreground w-10 text-right">
          {Math.round(pct)}%
        </span>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 加载动画（局部 / 全屏遮罩）                                          */
/* ------------------------------------------------------------------ */

export function Spin({
  size = 'md',
  label,
  className,
}: {
  size?: 'sm' | 'md' | 'lg'
  label?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('inline-flex items-center gap-2 text-muted-foreground', className)} role="status">
      <span className={cn('dd-spin', `dd-spin--${size}`)} />
      {label && <span className="text-sm">{label}</span>}
    </div>
  )
}

/** 盖在父容器上的加载遮罩。父元素需要有 relative */
export function SpinOverlay({ label = '加载中…' }: { label?: ReactNode }) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/60 backdrop-blur-[1px] rounded-inherit">
      <Spin size="md" label={label} />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 提示条（Alert）                                                      */
/* ------------------------------------------------------------------ */

// 反馈面使用的 tone 类型（与数据面的 SemanticTone 区分）
export type FeedbackTone = 'success' | 'warning' | 'error' | 'info'

const toneIcon: Record<FeedbackTone, ReactNode> = {
  success: <CheckCircle2 size={16} />,
  warning: <AlertTriangle size={16} />,
  error: <XCircle size={16} />,
  info: <InfoIcon size={16} />,
}

export function Alert({
  tone = 'info',
  title,
  description,
  action,
  closable,
  onClose,
  className,
}: {
  tone?: FeedbackTone
  title?: ReactNode
  description?: ReactNode
  /** 右侧动作槽 */
  action?: ReactNode
  closable?: boolean
  onClose?: () => void
  className?: string
}) {
  const [open, setOpen] = useState(true)
  if (!open) return null
  return (
    <div className={cn('dd-alert', `dd-alert--${tone}`, className)} role="alert">
      <span className="dd-alert__icon">{toneIcon[tone]}</span>
      <div className="flex-1 min-w-0">
        {title && <div className="dd-alert__title">{title}</div>}
        {description && <div className="dd-alert__desc">{description}</div>}
      </div>
      {action && <div className="shrink-0 self-center">{action}</div>}
      {closable && (
        <button
          type="button"
          aria-label="关闭"
          className="dd-tag__close shrink-0 self-start"
          onClick={() => {
            setOpen(false)
            onClose?.()
          }}
        >
          <XCircle size={15} />
        </button>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 结果页                                                              */
/* ------------------------------------------------------------------ */

export function Result({
  tone = 'success',
  title,
  description,
  extra,
  className,
}: {
  tone?: 'success' | 'warning' | 'error' | 'info'
  title: ReactNode
  description?: ReactNode
  /** 底部动作按钮 */
  extra?: ReactNode
  className?: string
}) {
  const icon =
    tone === 'success' ? <CheckCircle2 size={26} /> :
    tone === 'warning' ? <AlertTriangle size={26} /> :
    tone === 'error' ? <XCircle size={26} /> :
    <InfoIcon size={26} />

  return (
    <div className={cn('dd-result', className)}>
      <span className={cn('dd-result__icon', `dd-result__icon--${tone}`)}>{icon}</span>
      <div className="dd-result__title">{title}</div>
      {description && <div className="dd-result__desc">{description}</div>}
      {extra && <div className="mt-2 flex items-center gap-3">{extra}</div>}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 通知（右上角堆叠）                                                   */
/* ------------------------------------------------------------------ */

export interface NoticeItem {
  id: string
  tone?: FeedbackTone
  title: ReactNode
  description?: ReactNode
}

export function NoticeStack({
  items,
  onClose,
  className,
}: {
  items: NoticeItem[]
  onClose?: (id: string) => void
  className?: string
}) {
  return (
    <div className={cn('flex flex-col gap-3 w-full max-w-sm', className)}>
      {items.map((n) => (
        <div key={n.id} className={cn('dd-notice', `dd-notice--${n.tone ?? 'info'}`)} role="status">
          <span className={cn('dd-notice__icon', `dd-notice__icon--${n.tone ?? 'info'}`)}>
            {toneIcon[n.tone ?? 'info']}
          </span>
          <div className="flex-1 min-w-0">
            <div className="dd-notice__title">{n.title}</div>
            {n.description && <div className="dd-notice__desc">{n.description}</div>}
          </div>
          {onClose && (
            <button
              type="button"
              aria-label="关闭通知"
              className="dd-tag__close shrink-0"
              onClick={() => onClose(n.id)}
            >
              <XCircle size={15} />
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 确认框（Popconfirm：贴着触发元素弹出的二次确认）                      */
/* ------------------------------------------------------------------ */

export function Popconfirm({
  children,
  title = '确认执行这个操作？',
  description,
  confirmText = '确定',
  cancelText = '取消',
  onConfirm,
  tone = 'danger',
  className,
}: {
  /** 触发元素 */
  children: ReactNode
  title?: ReactNode
  description?: ReactNode
  confirmText?: string
  cancelText?: string
  onConfirm?: () => void
  tone?: 'brand' | 'danger'
  className?: string
}) {
  const [open, setOpen] = useState(false)
  return (
    <span className={cn('relative inline-flex', className)}>
      <span onClick={() => setOpen((v) => !v)} className="inline-flex">
        {children}
      </span>
      {open && (
        <>
          {/* 点外面关掉 */}
          <span className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
          <span className="dd-popover absolute z-50 top-full left-0 mt-2 w-60 block">
            <span className="block text-sm font-semibold text-foreground">{title}</span>
            {description && <span className="block dd-help mt-1">{description}</span>}
            <span className="mt-3 flex items-center justify-end gap-2">
              <button type="button" className="btn-ghost btn--sm" onClick={() => setOpen(false)}>
                {cancelText}
              </button>
              <button
                type="button"
                className={cn('btn--sm', tone === 'danger' ? 'btn-danger' : 'btn-primary')}
                onClick={() => {
                  onConfirm?.()
                  setOpen(false)
                }}
              >
                {confirmText}
              </button>
            </span>
          </span>
        </>
      )}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/* 悬浮按钮 / 回到顶部                                                  */
/* ------------------------------------------------------------------ */

export function FloatButton({
  icon: Icon,
  label,
  onClick,
  brand,
  className,
}: {
  icon: React.ComponentType<{ size?: number }>
  /** 无障碍标签，鼠标悬浮也显示 */
  label: string
  onClick?: () => void
  brand?: boolean
  className?: string
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn('dd-float-btn', brand && 'dd-float-btn--brand', className)}
    >
      <Icon size={18} />
    </button>
  )
}
