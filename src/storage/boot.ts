import { loadingBar } from '@/components/ui/LoadingBar'
import { useOrdersStore } from '@/store/useOrdersStore'
import { useAuthStore } from '@/store/useAuthStore'

/**
 * 启动时 hydrate 账本：顶条 LoadingBar + HTML 启动画面进度。
 * 失败也放行（空账本），避免白屏。至少展示一小段启动画面，避免闪一下消失。
 */
export async function bootPersist(): Promise<void> {
  const minSplash = new Promise<void>((r) => setTimeout(r, 420))
  window.updateLoadingProgress?.(28, '读取本地数据…')
  loadingBar.start()
  try {
    await useOrdersStore.getState().hydrate()
    window.updateLoadingProgress?.(55, '检查云同步…')
    await useAuthStore.getState().init()
    window.updateLoadingProgress?.(72, '整理账本…')
    await minSplash
    window.updateLoadingProgress?.(90, '账本已就绪')
    loadingBar.done()
  } catch {
    loadingBar.error()
    const s = useOrdersStore.getState()
    if (!s.hydrated) {
      await s.hydrate().catch(() => undefined)
    }
    await useAuthStore.getState().init().catch(() => undefined)
    await minSplash
  }
}

export function dismissHtmlSplash(): void {
  window.updateLoadingProgress?.(100, '准备就绪')
  const loading = document.getElementById('loading-screen')
  if (!loading) return
  loading.classList.add('hidden')
  setTimeout(() => loading.remove(), 600)
}
