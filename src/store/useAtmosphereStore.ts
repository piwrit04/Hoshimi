import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** 氛围：壁纸路径 + 樱花粒子（默认关）。与主题 store 分开。 */
export interface AtmosphereState {
  wallpaperPath: string
  particlesEnabled: boolean
  setWallpaperPath: (path: string) => void
  setParticlesEnabled: (on: boolean) => void
}

export const DEFAULT_WALLPAPER = '/wallpapers/default.jpg'

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
