import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** 氛围：壁纸路径 + 樱花粒子（默认关）。与主题 store 分开。 */
export interface AtmosphereState {
  wallpaperPath: string
  particlesEnabled: boolean
  setWallpaperPath: (path: string) => void
  setParticlesEnabled: (on: boolean) => void
}

/** 默认壁纸：Liver2Go scenic meadow（非抽象渐变） */
export const DEFAULT_WALLPAPER = '/wallpapers/default.jpg'

/** 内置壁纸（拷自 Liver2Go backgrounds） */
export const WALLPAPER_PRESETS = [
  { path: '/wallpapers/default.jpg', label: '草地风景' },
  { path: '/wallpapers/l2g-meadow.jpg', label: '草地风景' },
  { path: '/wallpapers/l2g-celestial.jpg', label: '星海' },
  { path: '/wallpapers/l2g-city.jpg', label: '都市阳台' },
] as const

export const useAtmosphereStore = create<AtmosphereState>()(
  persist(
    (set) => ({
      wallpaperPath: DEFAULT_WALLPAPER,
      particlesEnabled: false,
      setWallpaperPath: (wallpaperPath) => set({ wallpaperPath }),
      setParticlesEnabled: (particlesEnabled) => set({ particlesEnabled }),
    }),
    { name: 'hoshimi-atmosphere' },
  ),
)
