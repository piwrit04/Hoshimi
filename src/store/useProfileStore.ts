import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * 本机个人资料（不依赖登录）。
 * 登录后可把昵称推到 Supabase profiles；未配置云端时纯本地可用。
 */
interface ProfileState {
  nickname: string
  /** 头像底色色相 0–360，粉系附近默认 */
  avatarHue: number
  drawerOpen: boolean
  setNickname: (nickname: string) => void
  setAvatarHue: (hue: number) => void
  openDrawer: () => void
  closeDrawer: () => void
}

const DEFAULT_NICK = '星笺用户'

export function profileInitial(nickname: string): string {
  const t = nickname.trim()
  if (!t) return '星'
  return t.slice(0, 1).toUpperCase()
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      nickname: DEFAULT_NICK,
      avatarHue: 330,
      drawerOpen: false,
      setNickname: (nickname) => set({ nickname: nickname.trim() || DEFAULT_NICK }),
      setAvatarHue: (hue) => set({ avatarHue: ((hue % 360) + 360) % 360 }),
      openDrawer: () => set({ drawerOpen: true }),
      closeDrawer: () => set({ drawerOpen: false }),
    }),
    {
      name: 'profile-storage',
      partialize: (s) => ({ nickname: s.nickname, avatarHue: s.avatarHue }),
    },
  ),
)

export { DEFAULT_NICK as DEFAULT_PROFILE_NICK }
