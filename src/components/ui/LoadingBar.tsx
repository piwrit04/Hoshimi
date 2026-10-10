import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

/*
 * LoadingBar —— 顶部细条加载指示（Naive n-loading-bar / NProgress 风格）。
 * 命令式：loadingBar.start() / done() / error()
 */

type Status = 'idle' | 'loading' | 'error'

let status: Status = 'idle'
let progress = 0
let timer: ReturnType<typeof setInterval> | null = null
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((l) => l())
}

function clearTimer() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

export const loadingBar = {
  start() {
    status = 'loading'
    progress = 8
    emit()
    clearTimer()
    timer = setInterval(() => {
      progress = Math.min(progress + Math.random() * 12, 92)
      emit()
    }, 320)
  },
  done() {
    clearTimer()
    progress = 100
    status = 'loading'
    emit()
    setTimeout(() => {
      status = 'idle'
      progress = 0
      emit()
    }, 220)
  },
  error() {
    clearTimer()
    status = 'error'
    progress = 100
    emit()
    setTimeout(() => {
      status = 'idle'
      progress = 0
      emit()
    }, 600)
  },
}

function useLoadingBarState() {
  const [, tick] = useState(0)
  useEffect(() => {
    const l = () => tick((n) => n + 1)
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  }, [])
  return { status, progress }
}

/** 挂在 MainLayout 里一次即可 */
export function LoadingBarHost() {
  const { status: s, progress: p } = useLoadingBarState()
  if (typeof document === 'undefined') return null
  if (s === 'idle') return null
  return createPortal(
    <div
      className="fixed left-0 top-0 right-0 pointer-events-none"
      style={{ zIndex: 'calc(var(--z-modal) + 20)' }}
      aria-hidden="true"
    >
      <div
        className={cn(
          'h-[2.5px] transition-[width] duration-200 ease-out',
          s === 'error' ? 'bg-destructive' : 'bg-brand'
        )}
        style={{ width: `${p}%` }}
      />
    </div>,
    document.body
  )
}

export default LoadingBarHost
