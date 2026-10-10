import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

/*
 * DatePicker —— 日历弹窗选日期（只到日，不带时分）。
 *
 * 贴底时向上翻；disabledDate 可禁某一天。
 * value 是 'YYYY-MM-DD' 字符串，空字符串表示未选。
 */

interface DatePickerProps {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
  error?: boolean
  /** 返回 true 表示该日不可选 */
  disabledDate?: (iso: string) => boolean
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']
const POP_H = 280
const POP_W = 256

function toISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function DatePicker({
  value,
  onChange,
  placeholder = '选择日期',
  className,
  error,
  disabledDate,
}: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const [viewDate, setViewDate] = useState<Date>(() => (value ? new Date(value + 'T00:00:00') : new Date()))
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ top: 0, left: 0 })

  const updatePos = () => {
    const el = triggerRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    let top = r.bottom + 4
    let left = r.left
    if (top + POP_H > window.innerHeight - 8) {
      top = Math.max(8, r.top - POP_H - 4)
    }
    left = Math.max(8, Math.min(left, window.innerWidth - POP_W - 8))
    setPos({ top, left })
  }

  useEffect(() => {
    if (!open) return
    if (value) setViewDate(new Date(value + 'T00:00:00'))
    updatePos()

    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (popRef.current?.contains(t)) return
      if (triggerRef.current?.contains(t)) return
      setOpen(false)
    }
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    const onScroll = () => updatePos()
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onEsc)
    document.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', updatePos)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onEsc)
      document.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', updatePos)
    }
  }, [open, value])

  const cells = useMemo(() => {
    const y = viewDate.getFullYear()
    const m = viewDate.getMonth()
    const first = new Date(y, m, 1)
    const startDay = first.getDay()
    const daysInMonth = new Date(y, m + 1, 0).getDate()
    const arr: (Date | null)[] = []
    for (let i = 0; i < startDay; i++) arr.push(null)
    for (let d = 1; d <= daysInMonth; d++) arr.push(new Date(y, m, d))
    while (arr.length % 7 !== 0) arr.push(null)
    return arr
  }, [viewDate])

  const todayISO = toISO(new Date())
  const goMonth = (delta: number) =>
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + delta, 1))

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'dd-control flex items-center justify-between gap-2 text-left',
          error && 'dd-control--error',
          className
        )}
      >
        <span className={cn(!value && 'opacity-60')}>{value || placeholder}</span>
        <Calendar size={15} className="text-muted-foreground shrink-0" />
      </button>

      {open &&
        createPortal(
          <motion.div
            ref={popRef}
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.12 }}
            className="fixed z-[var(--z-popover)] dd-popover p-3 w-64"
            style={{ top: pos.top, left: pos.left }}
          >
            <div className="flex items-center justify-between mb-2">
              <button type="button" onClick={() => goMonth(-1)} className="p-1 rounded hover:bg-secondary" aria-label="上一月">
                <ChevronLeft size={16} />
              </button>
              <div className="text-sm font-bold">
                {viewDate.getFullYear()} 年 {viewDate.getMonth() + 1} 月
              </div>
              <button type="button" onClick={() => goMonth(1)} className="p-1 rounded hover:bg-secondary" aria-label="下一月">
                <ChevronRight size={16} />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-0.5 mb-1">
              {WEEKDAYS.map((w) => (
                <div key={w} className="text-center text-[11px] text-muted-foreground py-1">{w}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {cells.map((d, i) => {
                if (!d) return <div key={i} />
                const iso = toISO(d)
                const isSel = iso === value
                const isToday = iso === todayISO
                const disabled = !!disabledDate?.(iso)
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      if (disabled) return
                      onChange(iso)
                      setOpen(false)
                    }}
                    className={cn(
                      'h-8 rounded text-sm flex items-center justify-center transition-colors',
                      disabled && 'opacity-30 cursor-not-allowed',
                      !disabled && isSel && 'bg-brand text-brand-foreground font-bold',
                      !disabled && !isSel && isToday && 'ring-1 ring-brand/50 hover:bg-secondary',
                      !disabled && !isSel && !isToday && 'hover:bg-secondary'
                    )}
                  >
                    {d.getDate()}
                  </button>
                )
              })}
            </div>
          </motion.div>,
          document.body
        )}
    </>
  )
}

export default DatePicker
