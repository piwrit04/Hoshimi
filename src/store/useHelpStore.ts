import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface HelpState {
  shortcutsOpen: boolean
  highlightsOpen: boolean
  /** 已看过亮点的版本号；与 __APP_VERSION__ 不同则下次进主壳弹出 */
  lastSeenHighlightsVersion: string | null
  openShortcuts: () => void
  closeShortcuts: () => void
  openHighlights: () => void
  closeHighlights: () => void
  dismissHighlights: (version: string) => void
}

export const useHelpStore = create<HelpState>()(
  persist(
    (set) => ({
      shortcutsOpen: false,
      highlightsOpen: false,
      lastSeenHighlightsVersion: null,
      openShortcuts: () => set({ shortcutsOpen: true }),
      closeShortcuts: () => set({ shortcutsOpen: false }),
      openHighlights: () => set({ highlightsOpen: true }),
      closeHighlights: () => set({ highlightsOpen: false }),
      dismissHighlights: (version) =>
        set({ highlightsOpen: false, lastSeenHighlightsVersion: version }),
    }),
    {
      name: 'help-storage',
      partialize: (s) => ({ lastSeenHighlightsVersion: s.lastSeenHighlightsVersion }),
    },
  ),
)
