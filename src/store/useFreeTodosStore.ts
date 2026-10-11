import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** 自由待办：本机清单，不进账本 IndexedDB，成本可控。 */
export type FreeTodo = {
  id: string
  text: string
  done: boolean
  createdAt: string
}

interface FreeTodosState {
  items: FreeTodo[]
  add: (text: string) => FreeTodo | null
  toggle: (id: string) => void
  remove: (id: string) => void
  clearDone: () => void
}

export const useFreeTodosStore = create<FreeTodosState>()(
  persist(
    (set) => ({
      items: [],
      add: (text) => {
        const label = text.trim()
        if (!label) return null
        const item: FreeTodo = {
          id: `ft-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          text: label.slice(0, 120),
          done: false,
          createdAt: new Date().toISOString(),
        }
        set((s) => ({ items: [item, ...s.items] }))
        return item
      },
      toggle: (id) =>
        set((s) => ({
          items: s.items.map((it) => (it.id === id ? { ...it, done: !it.done } : it)),
        })),
      remove: (id) => set((s) => ({ items: s.items.filter((it) => it.id !== id) })),
      clearDone: () => set((s) => ({ items: s.items.filter((it) => !it.done) })),
    }),
    { name: 'free-todos-storage' },
  ),
)
