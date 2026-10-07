import { useEffect } from 'react'
import { useThemeStore } from '@/store/useThemeStore'

function applyTheme(theme: 'dark' | 'light') {
  const root = document.documentElement
  root.dataset.theme = theme
  if (theme === 'dark') root.classList.add('dark')
  else root.classList.remove('dark')
}

export function ThemeSync() {
  const mode = useThemeStore((s) => s.mode)

  useEffect(() => {
    const mql = window.matchMedia?.('(prefers-color-scheme: dark)')
    const resolve = (): 'dark' | 'light' => {
      if (mode === 'system') return mql?.matches ? 'dark' : 'light'
      return mode
    }

    const setResolved = () => applyTheme(resolve())
    setResolved()

    if (!mql) return
    if (mode !== 'system') return

    const handler = () => setResolved()
    mql.addEventListener?.('change', handler)
    return () => mql.removeEventListener?.('change', handler)
  }, [mode])

  return null
}

