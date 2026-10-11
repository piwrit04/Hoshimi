import { getSupabase } from '@/lib/supabase'
import { DEFAULT_PROFILE_NICK, useProfileStore } from '@/store/useProfileStore'

/** 登录后：本机仍是默认昵称时，从云端 profiles / metadata 拉取一次 */
export async function hydrateProfileFromCloud(userId: string, email?: string | null): Promise<void> {
  const sb = getSupabase()
  if (!sb) return
  const local = useProfileStore.getState()
  if (local.nickname && local.nickname !== DEFAULT_PROFILE_NICK) return

  try {
    const { data } = await sb.from('profiles').select('display_name').eq('id', userId).maybeSingle()
    const fromRow = (data?.display_name as string | undefined)?.trim()
    if (fromRow) {
      local.setNickname(fromRow)
      return
    }
  } catch {
    /* ignore */
  }

  const meta = (
    await sb.auth.getUser()
  ).data.user?.user_metadata?.display_name as string | undefined
  if (meta?.trim()) {
    local.setNickname(meta.trim())
    return
  }
  if (email?.includes('@')) {
    local.setNickname(email.split('@')[0] || DEFAULT_PROFILE_NICK)
  }
}

/** 保存昵称到云端（失败不阻断本机） */
export async function pushProfileToCloud(
  userId: string,
  nickname: string,
  email?: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const sb = getSupabase()
  if (!sb) return { ok: false, error: '未配置云端' }
  try {
    const { error } = await sb.from('profiles').upsert({
      id: userId,
      email: email ?? null,
      display_name: nickname,
      updated_at: new Date().toISOString(),
    })
    if (error) return { ok: false, error: error.message }
    await sb.auth.updateUser({ data: { display_name: nickname } })
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '同步失败' }
  }
}
