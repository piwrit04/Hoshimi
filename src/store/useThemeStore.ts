import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemeMode = 'system' | 'dark' | 'light'

interface ThemeState {
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
}

// 获取初始主题，与 index.html 预挂载脚本保持一致
const getInitialTheme = (): ThemeMode => {
  // 如果有存储，优先使用存储值
  try {
    const saved = localStorage.getItem('theme-storage');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed?.state?.mode) return parsed.state.mode;
    }
  } catch (e) { void e; }

  // 否则根据系统偏好判断
  if (typeof window !== 'undefined' && window.matchMedia) {
    if (window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
  }

  return 'dark';
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: getInitialTheme(),
      setMode: (mode) => set({ mode }),
    }),
    { name: 'theme-storage' }
  )
)

