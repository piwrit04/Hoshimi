import { create } from 'zustand'

export type ToastType = 'success' | 'warning' | 'error' | 'info'

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface Toast {
  id: string
  message: string
  type: ToastType
  duration?: number
  action?: ToastAction
}

interface ToastStore {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => string
  removeToast: (id: string) => void
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = Math.random().toString(36).substring(2, 9)
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }))
    return id
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}))

/** 约 5 秒的可撤销成功提示 */
export function toastUndo(message: string, onUndo: () => void) {
  useToastStore.getState().addToast({
    type: 'success',
    message,
    duration: 5000,
    action: {
      label: '撤销',
      onClick: onUndo,
    },
  })
}
