import { create } from 'zustand'
import type { Session, User } from '@supabase/supabase-js'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase'
import { syncSnapshot, pushSnapshot } from '@/lib/sync'
import { useOrdersStore } from '@/store/useOrdersStore'
import { saveSnapshot } from '@/storage/persist'

type AuthStatus = 'idle' | 'loading' | 'ready'

interface AuthState {
  configured: boolean
  status: AuthStatus
  session: Session | null
  user: User | null
  syncing: boolean
  lastSyncAt: string | null
  lastSyncError: string | null
  skipCloud: boolean
  init: () => Promise<void>
  signIn: (email: string, password: string) => Promise<{ ok: true } | { ok: false; error: string }>
  signUp: (
    email: string,
    password: string,
  ) => Promise<{ ok: true; needsConfirm?: boolean } | { ok: false; error: string }>
  signOut: () => Promise<void>
  setSkipCloud: (v: boolean) => void
  syncNow: () => Promise<{ ok: true; action: string } | { ok: false; error: string }>
}

const SKIP_KEY = 'hoshimi.skipCloud'

function readSkip(): boolean {
  try {
    return localStorage.getItem(SKIP_KEY) === '1'
  } catch {
    return false
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  configured: isSupabaseConfigured,
  status: 'idle',
  session: null,
  user: null,
  syncing: false,
  lastSyncAt: null,
  lastSyncError: null,
  skipCloud: readSkip(),

  init: async () => {
    if (get().status !== 'idle') return
    set({ status: 'loading', configured: isSupabaseConfigured })
    const sb = getSupabase()
    if (!sb) {
      set({ status: 'ready', session: null, user: null })
      return
    }

    const { data } = await sb.auth.getSession()
    set({
      status: 'ready',
      session: data.session,
      user: data.session?.user ?? null,
    })

    sb.auth.onAuthStateChange((event, session) => {
      set({ session, user: session?.user ?? null })
      if (event === 'SIGNED_IN' && session?.user && useOrdersStore.getState().hydrated) {
        void get().syncNow()
      }
    })

    if (data.session?.user && useOrdersStore.getState().hydrated) {
      void get().syncNow()
    }
  },

  signIn: async (email, password) => {
    const sb = getSupabase()
    if (!sb) return { ok: false, error: '未配置云端' }
    const { data, error } = await sb.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    if (error) return { ok: false, error: error.message }
    set({ session: data.session, user: data.user, skipCloud: false })
    try {
      localStorage.removeItem(SKIP_KEY)
    } catch {
      /* ignore */
    }
    await get().syncNow()
    return { ok: true }
  },

  signUp: async (email, password) => {
    const sb = getSupabase()
    if (!sb) return { ok: false, error: '未配置云端' }
    const { data, error } = await sb.auth.signUp({
      email: email.trim(),
      password,
    })
    if (error) return { ok: false, error: error.message }
    const needsConfirm = !data.session
    if (data.session) {
      set({ session: data.session, user: data.user, skipCloud: false })
      try {
        localStorage.removeItem(SKIP_KEY)
      } catch {
        /* ignore */
      }
      await get().syncNow()
    }
    return { ok: true, needsConfirm }
  },

  signOut: async () => {
    const sb = getSupabase()
    if (sb) await sb.auth.signOut()
    set({ session: null, user: null, lastSyncError: null })
  },

  setSkipCloud: (v) => {
    set({ skipCloud: v })
    try {
      if (v) localStorage.setItem(SKIP_KEY, '1')
      else localStorage.removeItem(SKIP_KEY)
    } catch {
      /* ignore */
    }
  },

  syncNow: async () => {
    const user = get().user
    if (!user) return { ok: false, error: '未登录' }
    if (get().syncing) return { ok: false, error: '同步进行中' }

    set({ syncing: true, lastSyncError: null })
    try {
      const local = useOrdersStore.getState().getSnapshot()
      const result = await syncSnapshot(user.id, local)
      if (!result.ok) {
        set({ syncing: false, lastSyncError: result.error })
        return { ok: false, error: result.error }
      }

      if (result.action === 'pulled' && result.snapshot) {
        useOrdersStore.getState().replaceSnapshot(result.snapshot)
        await saveSnapshot(result.snapshot)
      }

      const now = new Date().toISOString()
      set({ syncing: false, lastSyncAt: now, lastSyncError: null })
      return { ok: true, action: result.action }
    } catch (e) {
      const msg = e instanceof Error ? e.message : '同步失败'
      set({ syncing: false, lastSyncError: msg })
      return { ok: false, error: msg }
    }
  },
}))

let pushTimer: ReturnType<typeof setTimeout> | null = null

/** 本地落盘后防抖推云（约 1.2s） */
export function pushCloudIfLoggedIn(): void {
  if (pushTimer) clearTimeout(pushTimer)
  pushTimer = setTimeout(() => {
    void (async () => {
      const { user, syncing } = useAuthStore.getState()
      if (!user || syncing) return
      if (typeof navigator !== 'undefined' && !navigator.onLine) return
      const snap = useOrdersStore.getState().getSnapshot()
      const res = await pushSnapshot(user.id, snap)
      if (res.ok) {
        useAuthStore.setState({ lastSyncAt: res.updatedAt, lastSyncError: null })
      } else {
        useAuthStore.setState({ lastSyncError: res.error })
      }
    })()
  }, 1200)
}
