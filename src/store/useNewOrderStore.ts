import { create } from 'zustand'

/** 新建时预填客户字段（从客户详情「记一单」进来） */
export type NewOrderDraft = {
  nickname?: string
  contact?: string
}

/** 新建 / 编辑订单弹窗。侧栏、快捷键、列表行都调 open / openEdit。 */
interface NewOrderState {
  isOpen: boolean
  /** null = 新建；有值 = 编辑该订单 id */
  editingId: string | null
  draft: NewOrderDraft | null
  /** 无参打开（可直接绑 onClick） */
  open: () => void
  /** 带客户预填打开 */
  openWithCustomer: (draft: NewOrderDraft) => void
  openEdit: (id: string) => void
  /** 取走并清空 draft（NewOrder 打开时调用一次） */
  takeDraft: () => NewOrderDraft | null
  close: () => void
}

export const useNewOrderStore = create<NewOrderState>((set, get) => ({
  isOpen: false,
  editingId: null,
  draft: null,
  open: () => set({ isOpen: true, editingId: null, draft: null }),
  openWithCustomer: (draft) => set({ isOpen: true, editingId: null, draft }),
  openEdit: (id) => set({ isOpen: true, editingId: id, draft: null }),
  takeDraft: () => {
    const d = get().draft
    if (d) set({ draft: null })
    return d
  },
  close: () => set({ isOpen: false, editingId: null, draft: null }),
}))
