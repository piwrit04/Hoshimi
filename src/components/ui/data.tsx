import {
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  ChevronRight,
  ChevronsUpDown,
  ChevronUp,
  ChevronDown as ChevronDownIcon,
  Inbox,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/*
 * ============================================================
 *  数据展示组件组
 * ============================================================
 *
 * 和 form.tsx 一样，是「规范先有、组件没有」的那一批：
 * src/ui/ 里只有 Money / StatusPill / DataTable / AlertRow 四个。
 * 这个文件补表格、标签、徽标、头像、统计、列表、描述列表、时间线、树、
 * 折叠面板、空状态、骨架屏、差异条。
 *
 * 样式走 global-components.scss 的 .dd-* 类，组件里不写颜色。
 */

/* ------------------------------------------------------------------ */
/* 数据表                                                              */
/* ------------------------------------------------------------------ */

export interface DataTableColumn<T> {
  key: string
  /** 表头文字 */
  title: ReactNode
  /** 单元格渲染。不传就取 row[key] */
  render?: (row: T, index: number) => ReactNode
  /** 列宽，例如 '120px' / '1fr'。不传按内容自适应 */
  width?: string
  align?: 'left' | 'right' | 'center'
  /** 这一列表头可点排序 */
  sortable?: boolean
  className?: string
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[]
  data: T[]
  /** 行唯一 key */
  rowKey: (row: T, index: number) => string
  /** 斑马纹 */
  striped?: boolean
  /** 紧凑行高 */
  compact?: boolean
  /** 点击整行 */
  onRowClick?: (row: T) => void
  /** 空数据时的内容 */
  empty?: ReactNode
  className?: string
  /** 选中行的 key 集合（要做批量操作时传） */
  selectedKeys?: string[]
  /** 勾选列。传了就显示复选框 */
  onSelectedKeysChange?: (keys: string[]) => void
  loading?: boolean
}

export function DataTable<T>({
  columns,
  data,
  rowKey,
  striped,
  compact,
  onRowClick,
  empty,
  className,
  selectedKeys,
  onSelectedKeysChange,
  loading,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const sorted = useMemo(() => {
    if (!sortKey) return data
    const col = columns.find((c) => c.key === sortKey)
    if (!col) return data
    /* 排序按**渲染前的原始值**比，不按渲染结果 ——
       渲染结果可能是 <Money/> 这种节点，比不了大小 */
    const copy = [...data]
    copy.sort((a, b) => {
      const av = (a as Record<string, unknown>)[sortKey]
      const bv = (b as Record<string, unknown>)[sortKey]
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av
      }
      const as = String(av ?? '')
      const bs = String(bv ?? '')
      return sortDir === 'asc' ? as.localeCompare(bs, 'zh-CN') : bs.localeCompare(as, 'zh-CN')
    })
    return copy
  }, [data, sortKey, sortDir, columns])

  const selectable = !!onSelectedKeysChange
  const allKeys = data.map((r, i) => rowKey(r, i))
  const allChecked = selectable && allKeys.length > 0 && allKeys.every((k) => selectedKeys?.includes(k))
  const someChecked = selectable && !allChecked && allKeys.some((k) => selectedKeys?.includes(k))

  const toggleAll = () => {
    onSelectedKeysChange?.(allChecked ? [] : allKeys)
  }

  const toggleOne = (key: string) => {
    const cur = selectedKeys ?? []
    onSelectedKeysChange?.(cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key])
  }

  const alignClass = (a?: DataTableColumn<T>['align']) =>
    a === 'right' ? 'dd-table__num' : a === 'center' ? 'text-center' : ''

  const isEmpty = sorted.length === 0

  return (
    <div className={cn('dd-table-wrap', className)}>
      <table className={cn('dd-table', striped && 'dd-table--striped', compact && 'dd-table--compact')}>
        <thead>
          <tr>
            {selectable && (
              <th style={{ width: 40 }}>
                <input
                  type="checkbox"
                  aria-label="全选"
                  className="dd-check-input align-middle"
                  checked={allChecked}
                  ref={(el) => {
                    /* 半选态只能通过 JS 属性设 */
                    if (el) el.indeterminate = someChecked
                  }}
                  onChange={toggleAll}
                />
              </th>
            )}
            {columns.map((col) => (
              <th key={col.key} style={col.width ? { width: col.width } : undefined} className={alignClass(col.align)}>
                {col.sortable ? (
                  <span
                    className="dd-table__sort"
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      if (sortKey === col.key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
                      else {
                        setSortKey(col.key)
                        setSortDir('asc')
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setSortKey(col.key)
                        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
                      }
                    }}
                  >
                    {col.title}
                    {sortKey === col.key ? (
                      sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDownIcon size={12} />
                    ) : (
                      <ChevronsUpDown size={12} className="opacity-40" />
                    )}
                  </span>
                ) : (
                  col.title
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isEmpty ? (
            <tr>
              <td colSpan={columns.length + (selectable ? 1 : 0)} className="!py-10">
                {loading ? (
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <span className="dd-spin dd-spin--sm" />
                    加载中…
                  </div>
                ) : (
                  empty ?? <EmptyState title="暂无数据" compact />
                )}
              </td>
            </tr>
          ) : (
            sorted.map((row, i) => {
              const key = rowKey(row, i)
              const checked = !!selectedKeys?.includes(key)
              return (
                <tr
                  key={key}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(onRowClick && 'cursor-pointer')}
                  data-selected={checked || undefined}
                >
                  {selectable && (
                    <td onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        aria-label="选择此行"
                        className="dd-check-input align-middle"
                        checked={checked}
                        onChange={() => toggleOne(key)}
                      />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td key={col.key} className={cn(alignClass(col.align), col.className)}>
                      {col.render
                        ? col.render(row, i)
                        : String((row as Record<string, unknown>)[col.key] ?? '')}
                    </td>
                  ))}
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 标签 / 徽标 / 头像                                                   */
/* ------------------------------------------------------------------ */

export type SemanticTone = 'default' | 'brand' | 'success' | 'warning' | 'danger' | 'info'

export function Tag({
  children,
  tone = 'default',
  onClose,
  className,
}: {
  children: ReactNode
  tone?: SemanticTone
  /** 传了就显示一个 × */
  onClose?: () => void
  className?: string
}) {
  return (
    <span className={cn('dd-tag', `dd-tag--${tone}`, className)}>
      {children}
      {onClose && (
        <button
          type="button"
          aria-label="移除"
          onClick={onClose}
          className="dd-tag__close inline-flex"
        >
          <XSmall />
        </button>
      )}
    </span>
  )
}

function XSmall() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M3 3l6 6M9 3l-6 6" />
    </svg>
  )
}

export function Badge({
  children,
  count,
  dot,
  tone = 'danger',
  showZero = false,
  className,
}: {
  children: ReactNode
  count?: number
  /** 只显示一个小圆点，不显示数字 */
  dot?: boolean
  tone?: Exclude<SemanticTone, 'default'>
  showZero?: boolean
  className?: string
}) {
  const visible = dot || (count !== undefined && (count > 0 || showZero))
  return (
    <span className={cn('dd-badge-wrap', className)}>
      {children}
      {visible && (
        <span className={cn('dd-badge-dot', `dd-badge-dot--${tone}`, dot && 'dd-badge-dot--plain')}>
          {!dot && count !== undefined && (count > 99 ? '99+' : count)}
        </span>
      )}
    </span>
  )
}

export function Avatar({
  children,
  src,
  size = 'md',
  square,
  className,
}: {
  children?: ReactNode
  src?: string
  size?: 'sm' | 'md' | 'lg'
  square?: boolean
  className?: string
}) {
  return (
    <span className={cn('dd-avatar', `dd-avatar--${size}`, square && 'dd-avatar--square', className)}>
      {src ? <img src={src} alt="" /> : children}
    </span>
  )
}

/** 头像叠堆：超出 max 的收成一个 +N */
export function AvatarGroup({
  items,
  max = 4,
  size = 'md',
}: {
  items: { name: string; src?: string }[]
  max?: number
  size?: 'sm' | 'md' | 'lg'
}) {
  const shown = items.slice(0, max)
  const rest = items.length - shown.length
  return (
    <span className="dd-avatar__stack">
      {shown.map((it) => (
        <Avatar key={it.name} src={it.src} size={size} className="bg-card">
          {it.name.slice(0, 1)}
        </Avatar>
      ))}
      {rest > 0 && (
        <Avatar size={size} className="bg-secondary text-muted-foreground">
          +{rest}
        </Avatar>
      )}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/* 统计数值                                                            */
/* ------------------------------------------------------------------ */

export function Statistic({
  label,
  value,
  suffix,
  tone = 'default',
  trend,
  trendLabel,
  className,
}: {
  label: ReactNode
  value: ReactNode
  suffix?: ReactNode
  tone?: SemanticTone
  /** 正数向上（绿）、负数向下（红） */
  trend?: number
  trendLabel?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('dd-stat', className)}>
      <span className="dd-stat__label">{label}</span>
      <span className={cn('dd-stat__value', tone !== 'default' && `dd-stat__value--${tone}`)}>
        {value}
        {suffix && <span className="dd-stat__suffix">{suffix}</span>}
      </span>
      {trend !== undefined && (
        <span className={cn('dd-stat__trend', trend >= 0 ? 'dd-stat__trend--up' : 'dd-stat__trend--down')}>
          {trend >= 0 ? <ChevronUp size={12} /> : <ChevronDownIcon size={12} />}
          {Math.abs(trend)}%
          {trendLabel && <span className="text-muted-foreground font-normal">{trendLabel}</span>}
        </span>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 列表 / 描述列表 / 时间线                                             */
/* ------------------------------------------------------------------ */

export function List({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('dd-list', className)}>{children}</div>
}

export function ListItem({
  children,
  extra,
  onClick,
  className,
}: {
  children: ReactNode
  /** 右侧内容 */
  extra?: ReactNode
  onClick?: () => void
  className?: string
}) {
  return (
    <div
      className={cn('dd-list__item', onClick && 'cursor-pointer', className)}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') onClick()
            }
          : undefined
      }
    >
      <div className="min-w-0">{children}</div>
      {extra && <div className="shrink-0">{extra}</div>}
    </div>
  )
}

export interface DescriptionItem {
  label: ReactNode
  value: ReactNode
}

export function Descriptions({
  items,
  className,
}: {
  items: DescriptionItem[]
  className?: string
}) {
  return (
    <dl className={cn('dd-desc', className)}>
      {items.map((it, i) => (
        <div key={i} className="contents">
          <dt className="dd-desc__label">{it.label}</dt>
          <dd className="dd-desc__value">{it.value}</dd>
        </div>
      ))}
    </dl>
  )
}

export interface TimelineItem {
  title: ReactNode
  time?: ReactNode
  desc?: ReactNode
  tone?: SemanticTone
}

export function Timeline({ items, className }: { items: TimelineItem[]; className?: string }) {
  return (
    <div className={cn('dd-timeline', className)}>
      {items.map((it, i) => (
        <div key={i} className="dd-timeline__item">
          <span
            className={cn(
              'dd-timeline__dot',
              it.tone && it.tone !== 'default' && `dd-timeline__dot--${it.tone}`
            )}
          />
          {it.time && <div className="dd-timeline__time">{it.time}</div>}
          <div className="dd-timeline__title">{it.title}</div>
          {it.desc && <div className="dd-timeline__desc">{it.desc}</div>}
        </div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 树                                                                  */
/* ------------------------------------------------------------------ */

export interface TreeNode {
  key: string
  label: ReactNode
  children?: TreeNode[]
}

export function Tree({
  nodes,
  defaultExpandedKeys = [],
  selectedKey,
  onSelect,
  className,
}: {
  nodes: TreeNode[]
  defaultExpandedKeys?: string[]
  selectedKey?: string
  onSelect?: (key: string) => void
  className?: string
}) {
  const [expanded, setExpanded] = useState<string[]>(defaultExpandedKeys)

  const toggle = (key: string) =>
    setExpanded((cur) => (cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key]))

  const renderNodes = (list: TreeNode[], depth = 0) => (
    <div className={depth > 0 ? 'dd-tree__children' : undefined}>
      {list.map((n) => {
        const hasChildren = !!n.children?.length
        const isOpen = expanded.includes(n.key)
        return (
          <div key={n.key}>
            <div
              className="dd-tree__row"
              data-selected={selectedKey === n.key}
              role="treeitem"
              aria-expanded={hasChildren ? isOpen : undefined}
              tabIndex={0}
              onClick={() => {
                onSelect?.(n.key)
                if (hasChildren) toggle(n.key)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onSelect?.(n.key)
                  if (hasChildren) toggle(n.key)
                }
              }}
            >
              <span
                className={cn('dd-tree__toggle', !hasChildren && 'dd-tree__toggle--leaf')}
                data-open={isOpen}
              >
                <ChevronRight size={13} />
              </span>
              <span className="truncate">{n.label}</span>
            </div>
            {hasChildren && isOpen && renderNodes(n.children!, depth + 1)}
          </div>
        )
      })}
    </div>
  )

  return (
    <div className={cn('dd-tree', className)} role="tree">
      {renderNodes(nodes)}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 折叠面板                                                            */
/* ------------------------------------------------------------------ */

export interface CollapseItem {
  key: string
  title: ReactNode
  content: ReactNode
}

export function Collapse({
  items,
  defaultActiveKeys = [],
  accordion,
  className,
}: {
  items: CollapseItem[]
  defaultActiveKeys?: string[]
  /** 手风琴模式：一次只开一个 */
  accordion?: boolean
  className?: string
}) {
  const [active, setActive] = useState<string[]>(defaultActiveKeys)

  const toggle = (key: string) => {
    setActive((cur) => {
      const isOpen = cur.includes(key)
      if (accordion) return isOpen ? [] : [key]
      return isOpen ? cur.filter((k) => k !== key) : [...cur, key]
    })
  }

  return (
    <div className={cn('dd-collapse', className)}>
      {items.map((it) => {
        const open = active.includes(it.key)
        return (
          <div key={it.key} className="dd-collapse__item">
            <button
              type="button"
              className="dd-collapse__head"
              aria-expanded={open}
              onClick={() => toggle(it.key)}
            >
              <span>{it.title}</span>
              <span className="dd-collapse__chevron" data-open={open}>
                <ChevronRight size={15} />
              </span>
            </button>
            {open && <div className="dd-collapse__panel">{it.content}</div>}
          </div>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 空状态 / 骨架屏 / 差异条                                             */
/* ------------------------------------------------------------------ */

export function EmptyState({
  title = '这里还没有东西',
  description,
  action,
  compact,
  className,
}: {
  title?: ReactNode
  description?: ReactNode
  action?: ReactNode
  /** 塞进表格单元格时用，去掉大留白 */
  compact?: boolean
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center gap-2',
        compact ? 'py-4' : 'py-12',
        className
      )}
    >
      <span className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-secondary text-muted-foreground">
        <Inbox size={20} />
      </span>
      <div className="text-sm font-semibold text-foreground">{title}</div>
      {description && <div className="text-xs text-muted-foreground max-w-xs">{description}</div>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  )
}

export function Skeleton({
  width,
  height = 14,
  radius,
  className,
}: {
  width?: number | string
  height?: number | string
  radius?: number | string
  className?: string
}) {
  return (
    <span
      className={cn('dd-skeleton', className)}
      style={{ width, height, borderRadius: radius }}
      aria-hidden="true"
    />
  )
}

/** 常用组合：头像 + 两行字的加载态 */
export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="flex gap-3 items-start">
      <Skeleton width={40} height={40} radius="50%" />
      <div className="flex-1 space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} width={i === lines - 1 ? '60%' : '100%'} />
        ))}
      </div>
    </div>
  )
}

export interface DiffBarSegment {
  value: number
  tone?: SemanticTone
  label?: string
}

/**
 * 差异条：一条横条按比例切成几段。
 * 账本里用它展示「一单的钱去哪儿了」—— 转单 / 手续费 / 到手 三段。
 */
export function DiffBar({
  segments,
  className,
}: {
  segments: DiffBarSegment[]
  className?: string
}) {
  const total = segments.reduce((s, x) => s + Math.max(0, x.value), 0) || 1
  return (
    <div className={cn('dd-diffbar', className)} role="img" aria-label={
      segments.map((s) => `${s.label ?? ''} ${s.value}`).join('，')
    }>
      {segments.map((s, i) => (
        <span
          key={i}
          className={cn(
            'dd-diffbar__seg',
            s.tone && s.tone !== 'default' ? `dd-diffbar__seg--${s.tone}` : 'dd-diffbar__seg--brand'
          )}
          style={{ width: `${(Math.max(0, s.value) / total) * 100}%` }}
          title={s.label}
        />
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 文本省略                                                            */
/* ------------------------------------------------------------------ */

export function Ellipsis({
  children,
  title,
  className,
}: {
  children: ReactNode
  /** 悬浮提示的完整文字。不传就取 children 的字符串形式 */
  title?: string
  className?: string
}) {
  const t = title ?? (typeof children === 'string' ? children : undefined)
  return (
    <span className={cn('dd-ellipsis', className)} title={t}>
      {children}
    </span>
  )
}
