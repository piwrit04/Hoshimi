import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * 首次引导完成标记。小偏好，走 localStorage（与 theme / sidebar 同模式），
 * 启动时同步可读；重跑引导只翻此标志，不碰 IndexedDB 账本。
 *
 * suppressLedgerAutoComplete：阻止「有账本就自动标完成」。
 * - 老用户首次升级：未抑制 + 有账本 → 一次性跳过强制引导
 * - 设置里重开 / 引导进行中：抑制为 true，刷新也不要自动完成
 */
interface SetupState {
  setupComplete: boolean
  suppressLedgerAutoComplete: boolean
  completeSetup: () => void
  reopenSetup: () => void
  /** 引导页挂载时调用，防止灌演示数据后刷新被当成老用户跳过 */
  armWizardSession: () => void
}

export const useSetupStore = create<SetupState>()(
  persist(
    (set) => ({
      setupComplete: false,
      suppressLedgerAutoComplete: false,
      completeSetup: () =>
        set({ setupComplete: true, suppressLedgerAutoComplete: false }),
      reopenSetup: () =>
        set({ setupComplete: false, suppressLedgerAutoComplete: true }),
      armWizardSession: () => set({ suppressLedgerAutoComplete: true }),
    }),
    { name: 'setup-storage' },
  ),
)
