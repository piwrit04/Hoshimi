import { create } from 'zustand'
import type { Order } from '@/domain/order'
import { emptySnapshot } from '@/domain/ledger'
import { loadSnapshot, saveSnapshot } from '@/storage/persist'
import { SCHEMA_VERSION, type AppSettings, type ChannelFee, type Customer, type Snapshot } from '@/storage/types'

export type { Order, OrderItem, OrderStatus, OrderType, Platform } from '@/domain/order'

/*
 * 订单 / 账本 store —— 业务主存走 IndexedDB（见 src/storage/）。
 * hydrate 完成前不写盘；之后每次变更防抖落盘。
 */

interface OrdersState {
  orders: Order[]
  customers: Customer[]
  settings: AppSettings
  channelFees: ChannelFee[]
  orderSeq: number
  hydrated: boolean
  hydrate: () => Promise<void>
  addOrder: (o: Omit<Order, 'id' | 'orderNo' | 'createdAt'>) => Order
  /** 整本替换（导入用）；hydrate 后会落盘 */
  replaceSnapshot: ( partial: Partial<Snapshot>) => void
}

let saveTimer: ReturnType<typeof setTimeout> | null = null

function schedulePersist(get: () => OrdersState) {
  if (!get().hydrated) return
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    const s = get()
    const snap: Snapshot = {
      version: SCHEMA_VERSION,
      orders: s.orders,
      customers: s.customers,
      settings: s.settings,
      channelFees: s.channelFees,
      orderSeq: s.orderSeq,
      updatedAt: new Date().toISOString(),
    }
    void saveSnapshot(snap)
  }, 200)
}

export const useOrdersStore = create<OrdersState>((set, get) => ({
  orders: [],
  customers: [],
  settings: emptySnapshot().settings,
  channelFees: emptySnapshot().channelFees,
  orderSeq: 0,
  hydrated: false,

  hydrate: async () => {
    if (get().hydrated) return
    const snap = await loadSnapshot()
    set({
      orders: snap.orders,
      customers: snap.customers,
      settings: snap.settings,
      channelFees: snap.channelFees,
      orderSeq: snap.orderSeq,
      hydrated: true,
    })
  },

  addOrder: (data) => {
    const seq = get().orderSeq + 1
    const order: Order = {
      ...data,
      id: `o-${Date.now()}-${seq}`,
      orderNo: `#${new Date().getFullYear()}${String(Date.now()).slice(-6)}`,
      createdAt: new Date().toISOString(),
    }
    set((s) => ({
      orders: [order, ...s.orders],
      orderSeq: seq,
    }))
    schedulePersist(get)
    return order
  },

  replaceSnapshot: (partial) => {
    set((s) => ({
      orders: partial.orders ?? s.orders,
      customers: partial.customers ?? s.customers,
      settings: partial.settings ?? s.settings,
      channelFees: partial.channelFees ?? s.channelFees,
      orderSeq: partial.orderSeq ?? s.orderSeq,
    }))
    schedulePersist(get)
  },
}))
