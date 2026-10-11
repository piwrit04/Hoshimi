import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle, AlertTriangle, AlertCircle, Info } from 'lucide-react'
import { useToastStore, Toast as ToastType } from '../../store/useToastStore'
import { cn } from '../../lib/utils'

const icons = {
  success: <CheckCircle size={18} style={{ color: 'rgb(var(--success-rgb))' }} />,
  warning: <AlertTriangle size={18} style={{ color: 'rgb(var(--warning-rgb))' }} />,
  error: <AlertCircle size={18} style={{ color: 'rgb(var(--danger-rgb))' }} />,
  info: <Info size={18} style={{ color: 'rgb(var(--info-rgb))' }} />,
}

const toneBorder: Record<string, string> = {
  success: 'border-l-[3px]',
  warning: 'border-l-[3px]',
  error: 'border-l-[3px]',
  info: 'border-l-[3px]',
}
const toneBorderColor: Record<string, React.CSSProperties> = {
  success: { borderLeftColor: 'rgb(var(--success-rgb))' },
  warning: { borderLeftColor: 'rgb(var(--warning-rgb))' },
  error: { borderLeftColor: 'rgb(var(--danger-rgb))' },
  info: { borderLeftColor: 'rgb(var(--info-rgb))' },
}

const ToastItem = ({ toast }: { toast: ToastType }) => {
  const removeToast = useToastStore((state) => state.removeToast)
  const [progress, setProgress] = useState(100)
  const duration = toast.duration || 5000

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= 0) return 0
        return prev - 100 / (duration / 100)
      })
    }, 100)

    const closeTimer = setTimeout(() => {
      removeToast(toast.id)
    }, duration)

    return () => {
      clearInterval(timer)
      clearTimeout(closeTimer)
    }
  }, [toast.id, duration, removeToast])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      className={cn(
        'relative flex items-center w-full max-w-sm p-4 mb-3 border overflow-hidden rounded-xl shadow-lg bg-card',
        toneBorder[toast.type] || toneBorder.info,
      )}
      style={toneBorderColor[toast.type] || toneBorderColor.info}
      role="alert"
    >
      <div className="flex-shrink-0 mr-3">{icons[toast.type]}</div>
      <div className="flex-1 mr-2 min-w-0">
        <p className="text-sm font-medium text-foreground">{toast.message}</p>
      </div>
      {toast.action ? (
        <button
          type="button"
          className="flex-shrink-0 mr-2 rounded-full px-2 py-1 text-xs font-semibold text-brand hover:bg-brand/10 transition-colors"
          onClick={() => {
            toast.action?.onClick()
            removeToast(toast.id)
          }}
        >
          {toast.action.label}
        </button>
      ) : null}
      <button
        type="button"
        onClick={() => removeToast(toast.id)}
        className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Close"
      >
        <X className="w-4 h-4" />
      </button>

      <div
        className="absolute bottom-0 left-0 h-1 bg-current opacity-20"
        style={{ width: `${progress}%`, color: 'currentColor' }}
      />
    </motion.div>
  )
}

export const ToastContainer = () => {
  const toasts = useToastStore((state) => state.toasts)

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastItem toast={toast} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  )
}
