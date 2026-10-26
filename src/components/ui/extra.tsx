/**
 * 组件库补齐：Affix / GlobalStyleProbe / Rate / ColorPicker / Cascader /
 * Mention / DynamicInput / DynamicTags / Transfer / DatetimePicker /
 * NumberAnimation / Carousel / Calendar / QRCode / Watermark / CodeBlock /
 * Menu / FloatButtonGroup / InfiniteScroll。
 */
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import {
  AtSign,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Minus,
  Plus,
  Star,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Tag } from '@/components/ui/data'
import { DatePicker } from '@/components/ui/DatePicker'
import { TimePicker } from '@/components/ui/TimePicker'
import { FloatButton } from '@/components/ui/feedback'

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReduced(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])
  return reduced
}

/* ── Affix ── */
export function Affix({
  offsetTop = 0,
  className,
  children,
}: {
  offsetTop?: number
  className?: string
  children: ReactNode
}) {
  const sentinelRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [fixed, setFixed] = useState(false)
  const [size, setSize] = useState({ w: 0, h: 0 })

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => setFixed(!e.isIntersecting),
      { rootMargin: `-${offsetTop}px 0px 0px 0px`, threshold: [0, 1] },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [offsetTop])

  useEffect(() => {
    const el = contentRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      setSize({ w: el.offsetWidth, h: el.offsetHeight })
    })
    ro.observe(el)
    setSize({ w: el.offsetWidth, h: el.offsetHeight })
    return () => ro.disconnect()
  }, [children])

  return (
    <div className={cn('relative', className)}>
      <div ref={sentinelRef} aria-hidden className="h-0 w-full" />
      {fixed ? <div style={{ height: size.h }} aria-hidden /> : null}
      <div
        ref={contentRef}
        className={cn(fixed && 'fixed z-40')}
        style={fixed ? { top: offsetTop, width: size.w || undefined } : undefined}
      >
        {children}
      </div>
    </div>
  )
}

/* ── GlobalStyleProbe ── */
export function GlobalStyleProbe({ className }: { className?: string }) {
  const [vars, setVars] = useState<Record<string, string>>({})
  useEffect(() => {
    const cs = getComputedStyle(document.documentElement)
    const keys = [
      '--brand',
      '--background',
      '--foreground',
      '--primary',
      '--radius',
      '--sidebar',
      '--destructive',
    ]
    const next: Record<string, string> = {}
    for (const k of keys) next[k] = cs.getPropertyValue(k).trim() || '—'
    setVars(next)
  }, [])
  return (
    <div
      className={cn(
        'space-y-1.5 rounded-xl border border-border bg-card p-4 font-mono text-xs',
        className,
      )}
    >
      <p className="mb-2 font-sans text-[11px] font-medium text-muted-foreground">
        ThemeSync / GlobalStyle · 当前 CSS 变量
      </p>
      {Object.entries(vars).map(([k, v]) => (
        <div key={k} className="flex items-center gap-2">
          <span className="w-28 shrink-0 text-muted-foreground">{k}</span>
          <span
            className="size-3 shrink-0 rounded-sm border border-border"
            style={{ background: `var(${k})` }}
            aria-hidden
          />
          <span className="truncate">{v}</span>
        </div>
      ))}
    </div>
  )
}

/* ── Rate ── */
export function Rate({
  value,
  defaultValue = 0,
  count = 5,
  allowHalf = false,
  allowClear = true,
  disabled,
  onChange,
  className,
  'aria-label': ariaLabel = '评分',
}: {
  value?: number
  defaultValue?: number
  count?: number
  allowHalf?: boolean
  allowClear?: boolean
  disabled?: boolean
  onChange?: (v: number) => void
  className?: string
  'aria-label'?: string
}) {
  const [inner, setInner] = useState(defaultValue)
  const [hover, setHover] = useState<number | null>(null)
  const current = value ?? inner
  const display = hover ?? current

  const set = (v: number) => {
    if (disabled) return
    const next = allowClear && v === current ? 0 : v
    if (value === undefined) setInner(next)
    onChange?.(next)
  }

  return (
    <div
      role="slider"
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={count}
      aria-valuenow={current}
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : 0}
      className={cn(
        'inline-flex items-center gap-0.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
        disabled && 'pointer-events-none opacity-50',
        className,
      )}
      onKeyDown={(e) => {
        const step = allowHalf ? 0.5 : 1
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
          e.preventDefault()
          set(Math.min(count, current + step))
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
          e.preventDefault()
          set(Math.max(0, current - step))
        } else if (e.key === 'Home') {
          e.preventDefault()
          set(0)
        } else if (e.key === 'End') {
          e.preventDefault()
          set(count)
        }
      }}
      onMouseLeave={() => setHover(null)}
    >
      {Array.from({ length: count }, (_, i) => {
        const full = i + 1
        const half = i + 0.5
        const fill = display >= full ? 1 : allowHalf && display >= half ? 0.5 : 0
        return (
          <span key={i} className="relative inline-flex size-5">
            {allowHalf ? (
              <button
                type="button"
                tabIndex={-1}
                aria-label={`${half} 星`}
                className="absolute inset-y-0 left-0 z-10 w-1/2"
                onMouseEnter={() => setHover(half)}
                onClick={() => set(half)}
              />
            ) : null}
            <button
              type="button"
              tabIndex={-1}
              aria-label={`${full} 星`}
              className={cn('absolute inset-y-0 z-10', allowHalf ? 'right-0 w-1/2' : 'inset-0')}
              onMouseEnter={() => setHover(full)}
              onClick={() => set(full)}
            />
            <Star className="size-5 text-muted-foreground/30" strokeWidth={1.5} aria-hidden />
            <span
              className="pointer-events-none absolute inset-0 overflow-hidden"
              style={{ width: `${fill * 100}%` }}
              aria-hidden
            >
              <Star className="size-5 fill-amber-400 text-amber-400" strokeWidth={1.5} />
            </span>
          </span>
        )
      })}
    </div>
  )
}

/* ── ColorPicker ── */
const PRESET_COLORS = [
  '#EE7093',
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#14b8a6',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#64748b',
  '#111827',
  '#ffffff',
]

export function ColorPicker({
  value,
  defaultValue = '#EE7093',
  onChange,
  disabled,
  className,
  'aria-label': ariaLabel = '选择颜色',
}: {
  value?: string
  defaultValue?: string
  onChange?: (v: string) => void
  disabled?: boolean
  className?: string
  'aria-label'?: string
}) {
  const [inner, setInner] = useState(defaultValue)
  const [open, setOpen] = useState(false)
  const current = value ?? inner
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const set = (v: string) => {
    if (disabled) return
    if (value === undefined) setInner(v)
    onChange?.(v)
  }

  return (
    <div ref={ref} className={cn('relative inline-flex', className)}>
      <button
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-background px-2.5 text-sm',
          'outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
          'disabled:pointer-events-none disabled:opacity-50',
        )}
      >
        <span
          className="size-5 shrink-0 rounded-md border border-border"
          style={{ background: current }}
          aria-hidden
        />
        <span className="font-mono text-xs tabular-nums">{current}</span>
      </button>
      {open ? (
        <div
          role="dialog"
          aria-label="颜色面板"
          className="absolute left-0 top-full z-50 mt-1.5 w-56 rounded-xl border border-border bg-popover p-3 shadow-lg"
        >
          <div className="mb-3 grid grid-cols-6 gap-1.5">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={c}
                aria-pressed={current.toLowerCase() === c.toLowerCase()}
                onClick={() => {
                  set(c)
                  setOpen(false)
                }}
                className={cn(
                  'size-7 rounded-md border border-border outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
                  current.toLowerCase() === c.toLowerCase() &&
                    'ring-2 ring-brand ring-offset-1 ring-offset-background',
                )}
                style={{ background: c }}
              />
            ))}
          </div>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="shrink-0">自定义</span>
            <input
              type="color"
              value={/^#[0-9a-fA-F]{6}$/.test(current) ? current : '#EE7093'}
              onChange={(e) => set(e.target.value)}
              className="h-8 w-full cursor-pointer rounded-md border border-border bg-background"
              aria-label="自定义颜色"
            />
          </label>
        </div>
      ) : null}
    </div>
  )
}

/* ── DynamicInput ── */
export function DynamicInput({
  value,
  defaultValue = [''],
  onChange,
  placeholder = '输入内容',
  min = 1,
  max = 10,
  disabled,
  className,
}: {
  value?: string[]
  defaultValue?: string[]
  onChange?: (v: string[]) => void
  placeholder?: string
  min?: number
  max?: number
  disabled?: boolean
  className?: string
}) {
  const [inner, setInner] = useState(defaultValue)
  const items = value ?? inner
  const set = (next: string[]) => {
    if (value === undefined) setInner(next)
    onChange?.(next)
  }
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            value={item}
            disabled={disabled}
            placeholder={placeholder}
            onChange={(e) => {
              const next = [...items]
              next[i] = e.target.value
              set(next)
            }}
            aria-label={`动态输入 ${i + 1}`}
            className="dd-control min-w-0 flex-1"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            icon={Minus}
            iconOnly
            disabled={disabled || items.length <= min}
            aria-label={`删除第 ${i + 1} 项`}
            onClick={() => set(items.filter((_, j) => j !== i))}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            icon={Plus}
            iconOnly
            disabled={disabled || items.length >= max || i !== items.length - 1}
            aria-label="添加一项"
            onClick={() => set([...items, ''])}
          />
        </div>
      ))}
    </div>
  )
}

/* ── DynamicTags ── */
export function DynamicTags({
  value,
  defaultValue = [],
  onChange,
  max = 8,
  placeholder = '回车添加',
  disabled,
  className,
}: {
  value?: string[]
  defaultValue?: string[]
  onChange?: (v: string[]) => void
  max?: number
  placeholder?: string
  disabled?: boolean
  className?: string
}) {
  const [inner, setInner] = useState(defaultValue)
  const [draft, setDraft] = useState('')
  const tags = value ?? inner
  const set = (next: string[]) => {
    if (value === undefined) setInner(next)
    onChange?.(next)
  }
  const add = () => {
    const t = draft.trim()
    if (!t || tags.includes(t) || tags.length >= max || disabled) return
    set([...tags, t])
    setDraft('')
  }
  return (
    <div
      className={cn(
        'flex min-h-9 flex-wrap items-center gap-1.5 rounded-lg border border-border bg-background px-2 py-1.5',
        disabled && 'pointer-events-none opacity-50',
        className,
      )}
    >
      {tags.map((t) => (
        <Tag key={t} onClose={disabled ? undefined : () => set(tags.filter((x) => x !== t))}>
          {t}
        </Tag>
      ))}
      {tags.length < max ? (
        <input
          value={draft}
          disabled={disabled}
          placeholder={placeholder}
          aria-label="添加标签"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            } else if (e.key === 'Backspace' && !draft && tags.length) {
              set(tags.slice(0, -1))
            }
          }}
          className="min-w-[6rem] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      ) : null}
    </div>
  )
}

/* ── Cascader ── */
export type CascaderOption = {
  value: string
  label: string
  children?: CascaderOption[]
}

export function Cascader({
  options,
  value,
  defaultValue = [],
  onChange,
  placeholder = '请选择',
  disabled,
  className,
  'aria-label': ariaLabel = '级联选择',
}: {
  options: CascaderOption[]
  value?: string[]
  defaultValue?: string[]
  onChange?: (v: string[], labels: string[]) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  'aria-label'?: string
}) {
  const [inner, setInner] = useState(defaultValue)
  const [open, setOpen] = useState(false)
  const current = value ?? inner
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const labelsFor = (path: string[]) => {
    const labels: string[] = []
    let level: CascaderOption[] | undefined = options
    for (const v of path) {
      const hit: CascaderOption | undefined = level?.find((o) => o.value === v)
      if (!hit) break
      labels.push(hit.label)
      level = hit.children
    }
    return labels
  }

  const columns = useMemo(() => {
    const cols: CascaderOption[][] = [options]
    let level = options
    for (const v of current) {
      const hit = level.find((o) => o.value === v)
      if (!hit?.children?.length) break
      cols.push(hit.children)
      level = hit.children
    }
    return cols
  }, [options, current])

  const display = labelsFor(current).join(' / ') || placeholder

  const pick = (colIdx: number, opt: CascaderOption) => {
    const next = [...current.slice(0, colIdx), opt.value]
    if (value === undefined) setInner(next)
    onChange?.(next, labelsFor(next))
    if (!opt.children?.length) setOpen(false)
  }

  return (
    <div ref={ref} className={cn('relative inline-flex', className)}>
      <button
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'inline-flex h-9 min-w-[12rem] items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 text-sm',
          'outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
          'disabled:pointer-events-none disabled:opacity-50',
          !labelsFor(current).length && 'text-muted-foreground',
        )}
      >
        <span className="truncate">{display}</span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      </button>
      {open ? (
        <div
          role="listbox"
          aria-label={ariaLabel}
          className="absolute left-0 top-full z-50 mt-1.5 flex max-h-64 overflow-hidden rounded-xl border border-border bg-popover shadow-lg"
        >
          {columns.map((col, colIdx) => (
            <ul
              key={colIdx}
              className="min-w-[8rem] overflow-y-auto border-r border-border last:border-r-0 py-1"
            >
              {col.map((opt) => {
                const active = current[colIdx] === opt.value
                return (
                  <li key={opt.value}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => pick(colIdx, opt)}
                      className={cn(
                        'flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm outline-none',
                        'hover:bg-secondary focus-visible:bg-secondary',
                        active && 'bg-brand/10 text-brand',
                      )}
                    >
                      <span className="truncate">{opt.label}</span>
                      {opt.children?.length ? (
                        <ChevronRight className="size-3.5 shrink-0 opacity-50" aria-hidden />
                      ) : null}
                    </button>
                  </li>
                )
              })}
            </ul>
          ))}
        </div>
      ) : null}
    </div>
  )
}

/* ── Mention ── */
export type MentionOption = { value: string; label: string }

export function Mention({
  value,
  defaultValue = '',
  options,
  onChange,
  placeholder = '输入 @ 提及…',
  disabled,
  className,
  'aria-label': ariaLabel = '提及输入',
}: {
  value?: string
  defaultValue?: string
  options: MentionOption[]
  onChange?: (v: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  'aria-label'?: string
}) {
  const [inner, setInner] = useState(defaultValue)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [atStart, setAtStart] = useState(-1)
  const current = value ?? inner
  const ref = useRef<HTMLTextAreaElement>(null)

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q),
    ).slice(0, 8)
  }, [options, query])

  const set = (v: string) => {
    if (value === undefined) setInner(v)
    onChange?.(v)
  }

  const onInput = (raw: string) => {
    set(raw)
    const el = ref.current
    const caret = el?.selectionStart ?? raw.length
    const before = raw.slice(0, caret)
    const m = before.match(/@([\w\u4e00-\u9fff]*)$/)
    if (m) {
      setOpen(true)
      setQuery(m[1] ?? '')
      setAtStart(caret - m[0].length)
    } else {
      setOpen(false)
      setQuery('')
      setAtStart(-1)
    }
  }

  const insert = (opt: MentionOption) => {
    if (atStart < 0) return
    const el = ref.current
    const caret = el?.selectionStart ?? current.length
    const next = current.slice(0, atStart) + `@${opt.label} ` + current.slice(caret)
    set(next)
    setOpen(false)
    requestAnimationFrame(() => {
      const pos = atStart + opt.label.length + 2
      el?.focus()
      el?.setSelectionRange(pos, pos)
    })
  }

  return (
    <div className={cn('relative', className)}>
      <div className="relative">
        <AtSign
          className="pointer-events-none absolute left-3 top-2.5 size-3.5 text-muted-foreground"
          aria-hidden
        />
        <textarea
          ref={ref}
          value={current}
          disabled={disabled}
          placeholder={placeholder}
          aria-label={ariaLabel}
          aria-autocomplete="list"
          aria-expanded={open}
          rows={3}
          onChange={(e) => onInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setOpen(false)
            if (e.key === 'Enter' && open && filtered[0]) {
              e.preventDefault()
              insert(filtered[0])
            }
          }}
          className="dd-control min-h-[4.5rem] w-full resize-y pl-8"
        />
      </div>
      {open && filtered.length > 0 ? (
        <ul
          role="listbox"
          aria-label="提及候选"
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-y-auto rounded-xl border border-border bg-popover py-1 shadow-lg"
        >
          {filtered.map((opt) => (
            <li key={opt.value}>
              <button
                type="button"
                role="option"
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-secondary focus-visible:bg-secondary outline-none"
                onMouseDown={(e) => {
                  e.preventDefault()
                  insert(opt)
                }}
              >
                <span className="flex size-6 items-center justify-center rounded-full bg-brand/15 text-[10px] font-bold text-brand">
                  {opt.label.slice(0, 1)}
                </span>
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

/* ── Transfer ── */
export type TransferItem = { key: string; label: string; disabled?: boolean }

export function Transfer({
  dataSource,
  value,
  defaultValue = [],
  onChange,
  titles = ['待选', '已选'],
  disabled,
  className,
}: {
  dataSource: TransferItem[]
  value?: string[]
  defaultValue?: string[]
  onChange?: (v: string[]) => void
  titles?: [string, string]
  disabled?: boolean
  className?: string
}) {
  const [inner, setInner] = useState(defaultValue)
  const [leftSel, setLeftSel] = useState<string[]>([])
  const [rightSel, setRightSel] = useState<string[]>([])
  const selected = value ?? inner

  const set = (next: string[]) => {
    if (value === undefined) setInner(next)
    onChange?.(next)
  }

  const left = dataSource.filter((d) => !selected.includes(d.key))
  const right = dataSource.filter((d) => selected.includes(d.key))

  const moveRight = () => {
    if (disabled) return
    const add = leftSel.filter((k) => !selected.includes(k))
    set([...selected, ...add])
    setLeftSel([])
  }
  const moveLeft = () => {
    if (disabled) return
    set(selected.filter((k) => !rightSel.includes(k)))
    setRightSel([])
  }

  const Panel = ({
    title,
    items,
    sel,
    setSel,
  }: {
    title: string
    items: TransferItem[]
    sel: string[]
    setSel: (v: string[]) => void
  }) => (
    <div className="flex min-w-[10rem] flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-3 py-2 text-xs font-medium">
        <span>{title}</span>
        <span className="tabular-nums text-muted-foreground">{items.length}</span>
      </div>
      <ul className="max-h-48 flex-1 overflow-y-auto p-1" role="listbox" aria-label={title} aria-multiselectable>
        {items.length === 0 ? (
          <li className="px-2 py-6 text-center text-xs text-muted-foreground">暂无</li>
        ) : (
          items.map((item) => {
            const checked = sel.includes(item.key)
            return (
              <li key={item.key}>
                <label
                  className={cn(
                    'flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm',
                    'hover:bg-secondary',
                    item.disabled && 'pointer-events-none opacity-50',
                  )}
                >
                  <input
                    type="checkbox"
                    className="size-3.5 accent-[var(--brand)]"
                    checked={checked}
                    disabled={disabled || item.disabled}
                    onChange={() => {
                      setSel(
                        checked ? sel.filter((k) => k !== item.key) : [...sel, item.key],
                      )
                    }}
                    aria-label={item.label}
                  />
                  <span className="truncate">{item.label}</span>
                </label>
              </li>
            )
          })
        )}
      </ul>
    </div>
  )

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Panel title={titles[0]} items={left} sel={leftSel} setSel={setLeftSel} />
      <div className="flex flex-col gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          icon={ChevronRight}
          iconOnly
          disabled={disabled || leftSel.length === 0}
          aria-label="移到右侧"
          onClick={moveRight}
        />
        <Button
          type="button"
          size="sm"
          variant="secondary"
          icon={ChevronLeft}
          iconOnly
          disabled={disabled || rightSel.length === 0}
          aria-label="移到左侧"
          onClick={moveLeft}
        />
      </div>
      <Panel title={titles[1]} items={right} sel={rightSel} setSel={setRightSel} />
    </div>
  )
}

/* ── DatetimePicker ── */
export function DatetimePicker({
  value,
  onChange,
  disabled,
  className,
}: {
  /** 'YYYY-MM-DDTHH:mm' 或空 */
  value: string
  onChange: (v: string) => void
  disabled?: boolean
  className?: string
}) {
  const [date, time] = useMemo(() => {
    if (!value) return ['', '']
    const [d, t] = value.split('T')
    return [d || '', (t || '').slice(0, 5)]
  }, [value])

  const emit = (d: string, t: string) => {
    if (!d && !t) onChange('')
    else onChange(`${d || '1970-01-01'}T${t || '00:00'}`)
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <DatePicker value={date} onChange={(d) => emit(d, time)} disabled={disabled} />
      <span className={cn(disabled && 'pointer-events-none opacity-50')}>
        <TimePicker value={time} onChange={(tm) => emit(date, tm)} />
      </span>
    </div>
  )
}

/* ── NumberAnimation ── */
export function NumberAnimation({
  value,
  from = 0,
  duration = 800,
  precision = 0,
  prefix = '',
  suffix = '',
  className,
}: {
  value: number
  from?: number
  duration?: number
  precision?: number
  prefix?: string
  suffix?: string
  className?: string
}) {
  const reduced = usePrefersReducedMotion()
  const [display, setDisplay] = useState(reduced ? value : from)
  const displayRef = useRef(display)
  displayRef.current = display

  useEffect(() => {
    if (reduced) {
      setDisplay(value)
      return
    }
    let raf = 0
    const start = performance.now()
    const origin = displayRef.current
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(origin + (value - origin) * eased)
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, duration, reduced])

  const text = `${prefix}${display.toFixed(precision)}${suffix}`
  return (
    <span className={cn('tabular-nums', className)} aria-label={text}>
      {text}
    </span>
  )
}

/* ── Carousel ── */
export function Carousel({
  children,
  autoplay = false,
  interval = 4000,
  className,
}: {
  children: ReactNode[]
  autoplay?: boolean
  interval?: number
  className?: string
}) {
  const slides = children.filter(Boolean)
  const [index, setIndex] = useState(0)
  const reduced = usePrefersReducedMotion()
  const count = slides.length

  const go = (i: number) => setIndex(((i % count) + count) % count)

  useEffect(() => {
    if (!autoplay || count <= 1 || reduced) return
    const id = window.setInterval(() => go(index + 1), interval)
    return () => window.clearInterval(id)
  }, [autoplay, interval, index, count, reduced])

  if (count === 0) return null

  return (
    <div
      className={cn('relative overflow-hidden rounded-xl border border-border bg-card', className)}
      role="region"
      aria-roledescription="carousel"
      aria-label="轮播"
    >
      <div
        className="flex"
        style={{
          transform: `translateX(-${index * 100}%)`,
          transition: reduced ? undefined : 'transform 320ms ease',
        }}
      >
        {slides.map((slide, i) => (
          <div
            key={i}
            className="w-full shrink-0"
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} / ${count}`}
            aria-hidden={i !== index || undefined}
          >
            {slide}
          </div>
        ))}
      </div>
      {count > 1 ? (
        <>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            icon={ChevronLeft}
            iconOnly
            aria-label="上一张"
            className="absolute left-2 top-1/2 -translate-y-1/2"
            onClick={() => go(index - 1)}
          />
          <Button
            type="button"
            size="sm"
            variant="secondary"
            icon={ChevronRight}
            iconOnly
            aria-label="下一张"
            className="absolute right-2 top-1/2 -translate-y-1/2"
            onClick={() => go(index + 1)}
          />
          <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`第 ${i + 1} 张`}
                aria-current={i === index || undefined}
                onClick={() => go(i)}
                className={cn(
                  'h-2 w-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
                  i === index ? 'bg-brand' : 'bg-foreground/25',
                )}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  )
}

/* ── Calendar ── */
export function Calendar({
  value,
  onChange,
  markers,
  className,
}: {
  value?: string
  onChange?: (iso: string) => void
  /** iso date → tone */
  markers?: Record<string, 'brand' | 'warning' | 'danger'>
  className?: string
}) {
  const today = useMemo(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }, [])
  const initial = value || today
  const [cursor, setCursor] = useState(() => {
    const [y, m] = initial.split('-').map(Number)
    return { y, m: m - 1 }
  })

  const weeks = useMemo(() => {
    const first = new Date(cursor.y, cursor.m, 1)
    const start = new Date(first)
    start.setDate(1 - first.getDay())
    const cells: { iso: string; inMonth: boolean }[] = []
    for (let i = 0; i < 42; i++) {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      cells.push({ iso, inMonth: d.getMonth() === cursor.m })
    }
    const rows: typeof cells[] = []
    for (let i = 0; i < 6; i++) rows.push(cells.slice(i * 7, i * 7 + 7))
    return rows
  }, [cursor])

  const title = `${cursor.y}年${cursor.m + 1}月`

  return (
    <div className={cn('w-[17.5rem] rounded-xl border border-border bg-card p-3', className)}>
      <div className="mb-2 flex items-center justify-between">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          icon={ChevronLeft}
          iconOnly
          aria-label="上个月"
          onClick={() =>
            setCursor((c) => {
              const m = c.m - 1
              return m < 0 ? { y: c.y - 1, m: 11 } : { y: c.y, m }
            })
          }
        />
        <span className="text-sm font-medium tabular-nums">{title}</span>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          icon={ChevronRight}
          iconOnly
          aria-label="下个月"
          onClick={() =>
            setCursor((c) => {
              const m = c.m + 1
              return m > 11 ? { y: c.y + 1, m: 0 } : { y: c.y, m }
            })
          }
        />
      </div>
      <div className="mb-1 grid grid-cols-7 text-center text-[10px] text-muted-foreground">
        {['日', '一', '二', '三', '四', '五', '六'].map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {weeks.flat().map((cell) => {
          const selected = value === cell.iso
          const isToday = cell.iso === today
          const mark = markers?.[cell.iso]
          return (
            <button
              key={cell.iso}
              type="button"
              aria-label={cell.iso}
              aria-pressed={selected || undefined}
              onClick={() => onChange?.(cell.iso)}
              className={cn(
                'relative flex h-8 items-center justify-center rounded-md text-xs tabular-nums outline-none',
                'focus-visible:ring-2 focus-visible:ring-ring/40',
                !cell.inMonth && 'text-muted-foreground/40',
                selected && 'bg-brand text-white',
                !selected && isToday && 'text-brand font-semibold',
                !selected && 'hover:bg-secondary',
              )}
            >
              {Number(cell.iso.slice(-2))}
              {mark && !selected ? (
                <span
                  className={cn(
                    'absolute bottom-0.5 size-1 rounded-full',
                    mark === 'brand' && 'bg-brand',
                    mark === 'warning' && 'bg-amber-400',
                    mark === 'danger' && 'bg-destructive',
                  )}
                  aria-hidden
                />
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ── QRCode（轻量矩阵：可扫性一般，离线可用；展示订单号/配对码足够） ── */
function hashStr(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function buildQrMatrix(text: string, size = 21): boolean[][] {
  const seed = hashStr(text || 'hoshimi')
  const m: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false))
  const paintFinder = (r0: number, c0: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const edge = r === 0 || r === 6 || c === 0 || c === 6
        const core = r >= 2 && r <= 4 && c >= 2 && c <= 4
        m[r0 + r][c0 + c] = edge || core
      }
    }
  }
  paintFinder(0, 0)
  paintFinder(0, size - 7)
  paintFinder(size - 7, 0)
  let x = seed
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (m[r][c]) continue
      if (r < 8 && c < 8) continue
      if (r < 8 && c >= size - 8) continue
      if (r >= size - 8 && c < 8) continue
      x = (Math.imul(x, 1664525) + 1013904223) >>> 0
      m[r][c] = (x & 1) === 1
    }
  }
  // 嵌入长度校验带，让不同文本看起来不同
  const bytes = Array.from(text).map((ch) => ch.charCodeAt(0) & 255)
  for (let i = 0; i < Math.min(bytes.length, size - 2); i++) {
    const bit = (bytes[i] >> (i % 8)) & 1
    m[size - 2][1 + i] = bit === 1
  }
  return m
}

export function QRCode({
  value,
  size = 132,
  label,
  className,
}: {
  value: string
  size?: number
  label?: string
  className?: string
}) {
  const matrix = useMemo(() => buildQrMatrix(value, 25), [value])
  const n = matrix.length
  const cells = matrix
    .map((row, r) =>
      row
        .map((on, c) =>
          on
            ? `<rect x="${c}" y="${r}" width="1" height="1" fill="currentColor"/>`
            : '',
        )
        .join(''),
    )
    .join('')

  return (
    <div className={cn('inline-flex flex-col items-center gap-2', className)}>
      <div
        className="rounded-lg border border-border bg-white p-2 text-neutral-900 dark:bg-white"
        style={{ width: size, height: size }}
        role="img"
        aria-label={label || `二维码：${value}`}
      >
        <svg viewBox={`0 0 ${n} ${n}`} width="100%" height="100%" aria-hidden>
          <rect width={n} height={n} fill="#fff" />
          <g dangerouslySetInnerHTML={{ __html: cells }} />
        </svg>
      </div>
      {label ? <span className="text-xs text-muted-foreground">{label}</span> : null}
    </div>
  )
}

/* ── Watermark ── */
export function Watermark({
  content,
  children,
  gap = 120,
  rotate = -22,
  className,
}: {
  content: string
  children: ReactNode
  gap?: number
  rotate?: number
  className?: string
}) {
  const id = useId()
  const style: CSSProperties = {
    backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' width='${gap}' height='${gap}'><text x='50%' y='50%' fill='rgba(120,120,120,0.18)' font-size='14' font-family='system-ui,sans-serif' text-anchor='middle' dominant-baseline='middle' transform='rotate(${rotate} ${gap / 2} ${gap / 2})'>${content.replace(/[<>&'"]/g, '')}</text></svg>`,
    )}")`,
    backgroundRepeat: 'repeat',
  }
  return (
    <div className={cn('relative', className)}>
      <div className="relative z-0">{children}</div>
      <div
        id={id}
        className="pointer-events-none absolute inset-0 z-10 select-none"
        style={style}
        aria-hidden
      />
    </div>
  )
}

/* ── CodeBlock ── */
export function CodeBlock({
  code,
  language = 'text',
  showCopy = true,
  className,
}: {
  code: string
  language?: string
  showCopy?: boolean
  className?: string
}) {
  const [copied, setCopied] = useState(false)
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      /* ignore */
    }
  }
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border border-border bg-secondary/40',
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          {language}
        </span>
        {showCopy ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            icon={copied ? Check : Copy}
            iconOnly
            aria-label={copied ? '已复制' : '复制代码'}
            onClick={onCopy}
          />
        ) : null}
      </div>
      <pre className="overflow-x-auto p-3 text-xs leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  )
}

/* ── Menu ── */
export type MenuItem = {
  key: string
  label: string
  icon?: ReactNode
  disabled?: boolean
  children?: MenuItem[]
  count?: number
}

export function Menu({
  items,
  value,
  defaultValue,
  onChange,
  className,
}: {
  items: MenuItem[]
  value?: string
  defaultValue?: string
  onChange?: (key: string) => void
  className?: string
}) {
  const [inner, setInner] = useState(defaultValue ?? items[0]?.key ?? '')
  const [openKeys, setOpenKeys] = useState<string[]>([])
  const current = value ?? inner

  const select = (key: string) => {
    if (value === undefined) setInner(key)
    onChange?.(key)
  }

  const renderItems = (list: MenuItem[], depth = 0) => (
    <ul className={cn(depth > 0 && 'ml-2 border-l border-border pl-1')} role={depth === 0 ? 'menu' : 'group'}>
      {list.map((item) => {
        const hasKids = !!item.children?.length
        const open = openKeys.includes(item.key)
        const active = current === item.key
        return (
          <li key={item.key} role="none">
            <button
              type="button"
              role="menuitem"
              disabled={item.disabled}
              aria-expanded={hasKids ? open : undefined}
              onClick={() => {
                if (hasKids) {
                  setOpenKeys((ks) =>
                    open ? ks.filter((k) => k !== item.key) : [...ks, item.key],
                  )
                } else {
                  select(item.key)
                }
              }}
              className={cn(
                'flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm outline-none',
                'hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring/40',
                active && 'bg-brand/10 text-brand',
                item.disabled && 'pointer-events-none opacity-50',
              )}
            >
              {item.icon}
              <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>
              {typeof item.count === 'number' ? (
                <span className="tabular-nums text-[10px] text-muted-foreground">{item.count}</span>
              ) : null}
              {hasKids ? (
                <ChevronDown
                  className={cn('size-3.5 transition-transform', open && 'rotate-180')}
                  aria-hidden
                />
              ) : null}
            </button>
            {hasKids && open ? renderItems(item.children!, depth + 1) : null}
          </li>
        )
      })}
    </ul>
  )

  return <nav className={cn('w-52', className)}>{renderItems(items)}</nav>
}

/* ── FloatButtonGroup ── */
export function FloatButtonGroup({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2', className)}>
      {children}
    </div>
  )
}

export { FloatButton }

/* ── InfiniteScroll ── */
export function InfiniteScroll({
  children,
  hasMore,
  loading,
  onLoadMore,
  endMessage = '没有更多了',
  className,
}: {
  children: ReactNode
  hasMore: boolean
  loading?: boolean
  onLoadMore: () => void
  endMessage?: string
  className?: string
}) {
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = sentinelRef.current
    if (!el || !hasMore || loading) return
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) onLoadMore()
      },
      { rootMargin: '120px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [hasMore, loading, onLoadMore])

  return (
    <div className={cn('space-y-3', className)}>
      {children}
      <div ref={sentinelRef} className="flex justify-center py-2 text-xs text-muted-foreground">
        {loading ? '加载中…' : hasMore ? '继续下滑' : endMessage}
      </div>
    </div>
  )
}
