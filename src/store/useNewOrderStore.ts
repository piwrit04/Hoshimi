import { create } from 'zustand'

/** 新建 / 编辑订单弹窗。侧栏、快捷键、列表行都调 open / openEdit。 */
interface NewOrderState {
  isOpen: boolean
  /** null = 新建；有值 = 编辑该订单 id */
  editingId: string | null
  open: () => void
  openEdit: (id: string) => void
  close: () => void
}

export const useNewOrderStore = create<NewOrderState>((set) => ({
  isOpen: false,
  editingId: null,
  open: () => set({ isOpen: true, editingId: null }),
  openEdit: (id) => set({ isOpen: true, editingId: id }),
  close: () => set({ isOpen: false, editingId: null }),
}))
