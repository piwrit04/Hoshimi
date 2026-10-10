import { create } from 'zustand'
import type { Order } from '@/domain/order'
import { emptySnapshot } from '@/domain/ledger'
import { applyStatus, StatusFlowError } from '@/domain/status'
import { loadSnapshot, saveSnapshot } from '@/storage/persist'
import { SCHEMA_VERSION, type AppSettings, type ChannelFee, type Customer, type Snapshot } from '@/storage/types'

export type { Order, OrderItem, OrderStatus, OrderType, Platform } from '@/domain/order'

/*
 * 订单 / 账本 store —— 业务主存走 IndexedDB（见 src/storage/）。
 * hydrate 完成前不写盘；之后每次变更防抖落盘。
 */

export type OrderInput = Omit<Order, 'id' | 'orderNo' | 'createdAt'>

interface OrdersState {
  orders: Order[]
  customers: Customer[]
  settings: AppSettings
  channelFees: ChannelFee[]
  orderSeq: number
  hydrated: boolean
  hydrate: () => Promise<void>
  addOrder: (o: OrderInput) => Order
  updateOrder: (id: string, patch: Partial<OrderInput>) => Order | null
  setOrderStatus: (id: string, to: Order['status']) => Order | null
  /** 整本替换（导入用）；hydrate 后会落盘 */
  replaceSnapshot: (partial: Partial<Snapshot>) => void
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

function nextOrderNo(seq: number): string {
  const d = new Date()
  const y = String(d.getFullYear()).slice(-2)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const n = String(seq).padStart(2, '0')
  return `#NTE${y}${m}${day}${n}`
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
    const now = new Date().toISOString()
    const order: Order = {
      ...data,
      id: `o-${Date.now()}-${seq}`,
      orderNo: nextOrderNo(seq),
      createdAt: now,
      startedAt:
        data.status === '进行中' || data.status === '已完成' ? data.startedAt ?? now : data.startedAt,
      completedAt: data.status === '已完成' ? data.completedAt ?? now : data.completedAt,
      amountLocked:
        data.status === '已完成' || data.status === '已退款' || data.status === '已取消'
          ? true
          : data.amountLocked,
    }
    set((s) => ({
      orders: [order, ...s.orders],
      orderSeq: seq,
    }))
    schedulePersist(get)
    return order
  },

  updateOrder: (id, patch) => {
    const cur = get().orders.find((o) => o.id === id)
    if (!cur) return null
    // 终态 / 金额锁定：不允许改金额相关字段
    const locked = Boolean(cur.amountLocked) || cur.status === '已退款' || cur.status === '已取消'
    const moneyKeys = [
      'amount', 'feeRate', 'feeAmount', 'payout',
      'transferEnabled', 'transferMode', 'transferRatio', 'transferAmount',
      'items', 'type',
    ] as const
    const safe: Partial<OrderInput> = { ...patch }
    if (locked) {
      for (const k of moneyKeys) delete safe[k]
    }
    // 状态只能走 setOrderStatus
    delete (safe as { status?: Order['status'] }).status
    const next: Order = { ...cur, ...safe, id: cur.id, orderNo: cur.orderNo, createdAt: cur.createdAt }
    set((s) => ({
      orders: s.orders.map((o) => (o.id === id ? next : o)),
    }))
    schedulePersist(get)
    return next
  },

  setOrderStatus: (id, to) => {
    const cur = get().orders.find((o) => o.id === id)
    if (!cur) return null
    try {
      const next = applyStatus(cur, to)
      set((s) => ({
        orders: s.orders.map((o) => (o.id === id ? next : o)),
      }))
      schedulePersist(get)
      return next
    } catch (e) {
      if (e instanceof StatusFlowError) return null
      throw e
    }
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
