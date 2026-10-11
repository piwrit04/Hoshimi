import { useOrdersStore } from '@/store/useOrdersStore'
import { useToastStore } from '@/store/useToastStore'

/** 一键灌入演示账本（与 SetupWizard 同源 fixtures）。 */
export async function seedDemoLedger(): Promise<void> {
  const { buildFixtureSnapshot } = await import('@/domain/fixtures')
  useOrdersStore.getState().replaceSnapshot(buildFixtureSnapshot())
  useToastStore.getState().addToast({
    type: 'success',
    message: '已灌入演示账本，可随时在设置里备份或清空',
  })
  await new Promise((r) => setTimeout(r, 350))
}
