import { useEffect } from 'react'
import { useHelpStore } from '@/store/useHelpStore'

const APP_VERSION = __APP_VERSION__

/** 主壳挂载后：若尚未看过当前版本亮点则弹出一次 */
export function HighlightsBootstrap() {
  useEffect(() => {
    const { lastSeenHighlightsVersion, openHighlights } = useHelpStore.getState()
    if (lastSeenHighlightsVersion !== APP_VERSION) {
      openHighlights()
    }
  }, [])
  return null
}
