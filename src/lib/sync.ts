/**
 * 云同步：登录后 pull/push 整份 Snapshot。
 * 冲突策略：last-write-wins（比较 updatedAt ISO 时间戳）。
 * 本地 IndexedDB 始终作缓存；离线时只写本地，联网后再推。
 */

import { normalizeSnapshot } from '@/domain/ledger'
import { getSupabase, type LedgerSnapshotRow } from '@/lib/supabase'
import type { Snapshot } from '@/storage/types'

export type SyncResult =
  | { ok: true; action: 'pulled' | 'pushed' | 'noop'; remoteUpdatedAt: string | null }
  | { ok: false; error: string }

function ts(iso: string | undefined | null): number {
  if (!iso) return 0
  const n = Date.parse(iso)
  return Number.isFinite(n) ? n : 0
}

export async function fetchRemoteSnapshot(
  userId: string,
): Promise<{ snapshot: Snapshot | null; updatedAt: string | null; error?: string }> {
  const sb = getSupabase()
  if (!sb) return { snapshot: null, updatedAt: null, error: '未配置云端' }

  const { data, error } = await sb
    .from('ledger_snapshots')
    .select('snapshot, updated_at')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) return { snapshot: null, updatedAt: null, error: error.message }
  if (!data) return { snapshot: null, updatedAt: null }

  const row = data as Pick<LedgerSnapshotRow, 'snapshot' | 'updated_at'>
  const snap = normalizeSnapshot(row.snapshot)
  return { snapshot: snap, updatedAt: row.updated_at }
}

export async function pushSnapshot(
  userId: string,
  snapshot: Snapshot,
): Promise<{ ok: true; updatedAt: string } | { ok: false; error: string }> {
  const sb = getSupabase()
  if (!sb) return { ok: false, error: '未配置云端' }

  const updatedAt = snapshot.updatedAt || new Date().toISOString()
  const payload = {
    user_id: userId,
    snapshot: { ...snapshot, updatedAt },
    updated_at: updatedAt,
  }

  const { error } = await sb.from('ledger_snapshots').upsert(payload, { onConflict: 'user_id' })
  if (error) return { ok: false, error: error.message }
  return { ok: true, updatedAt }
}

/**
 * 合并本地与远端：较新的覆盖较旧的。
 * - 远端不存在 → 推本地
 * - 远端较新 → 拉远端覆盖本地（由调用方 apply）
 * - 本地较新或相等 → 推本地
 */
export async function syncSnapshot(
  userId: string,
  local: Snapshot,
): Promise<SyncResult & { snapshot?: Snapshot }> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { ok: false, error: '当前离线，已保留本地缓存' }
  }

  const remote = await fetchRemoteSnapshot(userId)
  if (remote.error) return { ok: false, error: remote.error }

  const localTs = ts(local.updatedAt)
  const remoteTs = ts(remote.updatedAt)

  if (!remote.snapshot) {
    const pushed = await pushSnapshot(userId, local)
    if (!pushed.ok) return { ok: false, error: pushed.error }
    return { ok: true, action: 'pushed', remoteUpdatedAt: pushed.updatedAt }
  }

  if (remoteTs > localTs) {
    return {
      ok: true,
      action: 'pulled',
      remoteUpdatedAt: remote.updatedAt,
      snapshot: { ...remote.snapshot, updatedAt: remote.updatedAt ?? remote.snapshot.updatedAt },
    }
  }

  if (localTs > remoteTs) {
    const pushed = await pushSnapshot(userId, local)
    if (!pushed.ok) return { ok: false, error: pushed.error }
    return { ok: true, action: 'pushed', remoteUpdatedAt: pushed.updatedAt }
  }

  return { ok: true, action: 'noop', remoteUpdatedAt: remote.updatedAt }
}
