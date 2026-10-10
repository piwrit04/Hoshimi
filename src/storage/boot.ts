import { loadingBar } from '@/components/ui/LoadingBar'
import { useOrdersStore } from '@/store/useOrdersStore'

/**
 * 启动时 hydrate 账本：顶条 LoadingBar + HTML 启动画面进度。
 * 失败也放行（空账本），避免白屏。
 */
export async function bootPersist(): Promise<void> {
  window.updateLoadingProgress?.(35, '读取本地数据…')
  loadingBar.start()
  try {
    await useOrdersStore.getState().hydrate()
    window.updateLoadingProgress?.(85, '账本已就绪')
    loadingBar.done()
  } catch {
    loadingBar.error()
    // hydrate 内部应已落到空账本；再兜底一次
    const s = useOrdersStore.getState()
    if (!s.hydrated) {
      await s.hydrate().catch(() => undefined)
    }
  }
}

export function dismissHtmlSplash(): void {
  window.updateLoadingProgress?.(100, '准备就绪')
  const loading = document.getElementById('loading-screen')
  if (!loading) return
  loading.classList.add('hidden')
  setTimeout(() => loading.remove(), 600)
}
