import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { overlayDepth } from '@/lib/overlay-stack'
import { focusPageSearch, isEditableTarget } from '@/lib/shortcuts'
import { useHelpStore } from '@/store/useHelpStore'
import { useNewOrderStore } from '@/store/useNewOrderStore'
import { useSearchStore } from '@/store/useSearchStore'

const NAV: Record<string, string> = {
  '1': '/dashboard',
  '2': '/orders',
  '3': '/todo',
  '4': '/customers',
  '5': '/settings',
}

/**
 * 全局快捷键（挂在主壳里）。
 * - 输入框内不触发
 * - 有 Modal/Drawer 时不抢 N / 导航 / ?
 * - 不绑定 Ctrl/⌘ 组合（Ctrl+K 仍由 FloatingSearch 处理，避免与 Electron 冲突）
 */
export function GlobalShortcuts() {
  const navigate = useNavigate()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (isEditableTarget(e.target)) return

      const searchOpen = useSearchStore.getState().isOpen
      const depth = overlayDepth()
      const blocked = depth > 0 || searchOpen

      if (e.key === '?' && !blocked) {
        e.preventDefault()
        useHelpStore.getState().openShortcuts()
        return
      }

      if (e.key === '/' && !blocked) {
        e.preventDefault()
        if (!focusPageSearch()) {
          useSearchStore.getState().openSearch()
        }
        return
      }

      if (blocked) return

      const lower = e.key.length === 1 ? e.key.toLowerCase() : e.key
      if (lower === 'n') {
        e.preventDefault()
        useNewOrderStore.getState().open()
        return
      }

      const path = NAV[e.key]
      if (path) {
        e.preventDefault()
        navigate(path)
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate])

  return null
}
