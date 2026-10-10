import { emptySnapshot, normalizeSnapshot } from '@/domain/ledger'
import { idbGet, idbSet } from './idb'
import { SNAPSHOT_KEY, type Snapshot } from './types'

export async function loadSnapshot(): Promise<Snapshot> {
  try {
    const raw = await idbGet<unknown>(SNAPSHOT_KEY)
    if (raw == null) return emptySnapshot()
    return normalizeSnapshot(raw) ?? emptySnapshot()
  } catch {
    return emptySnapshot()
  }
}

/** 写入失败返回 false（配额满等），界面可提示备份 */
export async function saveSnapshot(snapshot: Snapshot): Promise<boolean> {
  try {
    const stamped: Snapshot = {
      ...snapshot,
      updatedAt: snapshot.updatedAt || new Date().toISOString(),
    }
    await idbSet(SNAPSHOT_KEY, stamped)
    // 登录态下延迟推云（动态 import，避免循环依赖）
    void import('@/store/useAuthStore')
      .then(({ pushCloudIfLoggedIn }) => pushCloudIfLoggedIn())
      .catch(() => undefined)
    return true
  } catch {
    return false
  }
}

export { SNAPSHOT_KEY }
