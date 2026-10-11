import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { pushOverlay } from '@/lib/overlay-stack'
import { Button } from './Button'

export interface ModalConfirmOptions {
  title?: ReactNode
  content?: ReactNode
  okText?: string
  cancelText?: string
  /** danger = 危险确认（删除等） */
  tone?: 'brand' | 'danger'
  onOk?: () => void | Promise<void>
  onCancel?: () => void
}

type Entry = ModalConfirmOptions & { id: number; resolve: (ok: boolean) => void }

let nextId = 1
let entries: Entry[] = []
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((l) => l())
}

function openConfirm(options: ModalConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const id = nextId++
    entries = [...entries, { ...options, id, resolve }]
    emit()
  })
}

function closeEntry(id: number, ok: boolean, skipCallbacks = false) {
  const entry = entries.find((e) => e.id === id)
  if (!entry) return
  entries = entries.filter((e) => e.id !== id)
  emit()
  entry.resolve(ok)
  if (skipCallbacks) return
  if (ok) void entry.onOk?.()
  else entry.onCancel?.()
}

/** 命令式确认：Modal.confirm({ title, content, onOk }) */
export const modalConfirm = Object.assign(openConfirm, {
  confirm: openConfirm,
})

function ConfirmCard({ entry }: { entry: Entry }) {
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    return pushOverlay(() => {
      if (!busy) closeEntry(entry.id, false)
    })
  }, [entry.id, busy])

  const reduceMotion = useReducedMotion()
  const tone = entry.tone ?? 'danger'

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 'var(--z-modal)' }}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reduceMotion ? 0.01 : 0.2 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => !busy && closeEntry(entry.id, false)}
        aria-hidden="true"
      />
      <motion.div
        role="alertdialog"
        aria-modal="true"
        initial={reduceMotion ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.98, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={reduceMotion ? { opacity: 0, scale: 1, y: 0 } : { opacity: 0, scale: 0.98, y: 8 }}
        transition={
          reduceMotion
            ? { duration: 0.01 }
            : { type: 'tween', duration: 0.28, ease: [0.22, 1, 0.36, 1] }
        }
        className="relative w-full max-w-sm bg-card border border-border rounded-lg shadow-2 p-5"
      >
        <div className="flex gap-3">
          <div
            className={cn(
              'shrink-0 w-9 h-9 rounded-full flex items-center justify-center',
              tone === 'danger' ? 'bg-destructive/15 text-destructive' : 'bg-brand/15 text-brand'
            )}
          >
            <AlertTriangle size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-bold text-foreground">{entry.title ?? '确认操作'}</div>
            {entry.content && <div className="mt-1 text-sm text-muted-foreground">{entry.content}</div>}
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => closeEntry(entry.id, false)}
          >
            {entry.cancelText ?? '取消'}
          </Button>
          <Button
            variant={tone === 'danger' ? 'danger' : 'primary'}
            size="sm"
            loading={busy}
            onClick={async () => {
              setBusy(true)
              try {
                await entry.onOk?.()
                closeEntry(entry.id, true, true)
              } catch {
                setBusy(false)
              }
            }}
          >
            {entry.okText ?? '确定'}
          </Button>
        </div>
      </motion.div>
    </div>
  )
}

/** 挂在 MainLayout 一次 */
export function ModalConfirmHost() {
  const [, tick] = useState(0)
  useEffect(() => {
    const l = () => tick((n) => n + 1)
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  }, [])
  if (typeof document === 'undefined') return null
  return createPortal(
    <AnimatePresence>
      {entries.map((entry) => (
        <ConfirmCard key={entry.id} entry={entry} />
      ))}
    </AnimatePresence>,
    document.body
  )
}
