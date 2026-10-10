import { create } from 'zustand';

/** 新建订单弹窗的开关。侧栏按钮、快捷键都调 open()。 */
interface NewOrderState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

export const useNewOrderStore = create<NewOrderState>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}));
