import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

/*
 * TimePicker —— 选时分（HH:mm）。贴底向上翻。
 * value 空字符串表示未选。
 */

interface TimePickerProps {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
  error?: boolean
  /** 分钟步进，默认 5 */
  minuteStep?: number
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function parse(v: string): { h: number; m: number } | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(v.trim())
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (h > 23 || min > 59) return null
  return { h, m: min }
}

export function TimePicker({
  value,
  onChange,
  placeholder = '选择时间',
  className,
  error,
  minuteStep = 5,
}: TimePickerProps) {
  const [open, setOpen] = useState(false)
  const parsed = parse(value)
  const [h, setH] = useState(parsed?.h ?? 12)
  const [m, setM] = useState(parsed?.m ?? 0)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ top: 0, left: 0 })

  const hours = Array.from({ length: 24 }, (_, i) => i)
  const minutes = Array.from({ length: Math.ceil(60 / minuteStep) }, (_, i) => i * minuteStep)

  const updatePos = () => {
    const el = triggerRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const popH = 220
    const popW = 200
    let top = r.bottom + 4
    let left = r.left
    if (top + popH > window.innerHeight - 8) top = Math.max(8, r.top - popH - 4)
    left = Math.max(8, Math.min(left, window.innerWidth - popW - 8))
    setPos({ top, left })
  }

  useEffect(() => {
    if (!open) return
    const p = parse(value)
    if (p) {
      setH(p.h)
      setM(p.m)
    }
    updatePos()
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (popRef.current?.contains(t)) return
      if (triggerRef.current?.contains(t)) return
      setOpen(false)
    }
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onEsc)
    document.addEventListener('scroll', updatePos, true)
    window.addEventListener('resize', updatePos)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onEsc)
      document.removeEventListener('scroll', updatePos, true)
      window.removeEventListener('resize', updatePos)
    }
  }, [open, value])

  const commit = (nh: number, nm: number) => {
    setH(nh)
    setM(nm)
    onChange(`${pad(nh)}:${pad(nm)}`)
  }

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
        <Clock size={15} className="text-muted-foreground shrink-0" />
      </button>

      {open &&
        createPortal(
          <motion.div
            ref={popRef}
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.12 }}
            className="fixed z-[var(--z-popover)] dd-popover p-2 w-[200px]"
            style={{ top: pos.top, left: pos.left }}
          >
            <div className="flex gap-2 h-44">
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {hours.map((hh) => (
                  <button
                    key={hh}
                    type="button"
                    onClick={() => commit(hh, m)}
                    className={cn(
                      'w-full py-1.5 text-sm rounded hover:bg-secondary',
                      h === hh && 'bg-brand text-brand-foreground font-bold'
                    )}
                  >
                    {pad(hh)}
                  </button>
                ))}
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {minutes.map((mm) => (
                  <button
                    key={mm}
                    type="button"
                    onClick={() => {
                      commit(h, mm)
                      setOpen(false)
                    }}
                    className={cn(
                      'w-full py-1.5 text-sm rounded hover:bg-secondary',
                      m === mm && 'bg-brand text-brand-foreground font-bold'
                    )}
                  >
                    {pad(mm)}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-border mt-1">
              <button type="button" className="btn-ghost btn--sm" onClick={() => { onChange(''); setOpen(false) }}>
                清除
              </button>
              <button
                type="button"
                className="btn-primary btn--sm"
                onClick={() => {
                  commit(h, m)
                  setOpen(false)
                }}
              >
                确定
              </button>
            </div>
          </motion.div>,
          document.body
        )}
    </>
  )
}

export default TimePicker
