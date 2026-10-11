import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * 首次引导完成标记。小偏好，走 localStorage（与 theme / sidebar 同模式），
 * 启动时同步可读；重跑引导只翻此标志，不碰 IndexedDB 账本。
 */
interface SetupState {
  setupComplete: boolean
  completeSetup: () => void
  reopenSetup: () => void
}

export const useSetupStore = create<SetupState>()(
  persist(
    (set) => ({
      setupComplete: false,
      completeSetup: () => set({ setupComplete: true }),
      reopenSetup: () => set({ setupComplete: false }),
    }),
    { name: 'setup-storage' },
  ),
)
