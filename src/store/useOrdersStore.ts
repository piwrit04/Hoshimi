import { create } from 'zustand'
import type { Order } from '@/domain/order'
import { emptySnapshot } from '@/domain/ledger'
import { applyStatus, StatusFlowError } from '@/domain/status'
import { normalizePhone } from '@/domain/customers'
import {
  addCategory as catAdd,
  addGame as gameAdd,
  addProduct as prodAdd,
  removeCategory as catRemove,
  removeGame as gameRemove,
  removeProduct as prodRemove,
  updateCategory as catUpdate,
  updateGame as gameUpdate,
  updateProduct as prodUpdate,
  type CatalogSlice,
} from '@/domain/catalog'
import { loadSnapshot, saveSnapshot } from '@/storage/persist'
import {
  SCHEMA_VERSION,
  type AppSettings,
  type CatalogCategory,
  type CatalogKind,
  type CatalogProduct,
  type ChannelFee,
  type Customer,
  type Game,
  type ServerEntry,
  type Snapshot,
} from '@/storage/types'

export type { Order, OrderItem, OrderStatus, OrderType, Platform } from '@/domain/order'

/*
 * 订单 / 账本 store —— 业务主存走 IndexedDB（见 src/storage/）。
 * hydrate 完成前不写盘；之后每次变更防抖落盘。
 */

export type OrderInput = Omit<Order, 'id' | 'orderNo' | 'createdAt'>

interface OrdersState {
  orders: Order[]
  customers: Customer[]
  games: Game[]
  categories: CatalogCategory[]
  products: CatalogProduct[]
  servers: ServerEntry[]
  settings: AppSettings
  channelFees: ChannelFee[]
  orderSeq: number
  hydrated: boolean
  hydrate: () => Promise<void>
  addOrder: (o: OrderInput) => Order
  updateOrder: (id: string, patch: Partial<OrderInput>) => Order | null
  setOrderStatus: (id: string, to: Order['status']) => Order | null
  upsertCustomer: (data: { nickname: string; contact: string; note?: string }) => Customer
  updateCustomer: (
    id: string,
    patch: Partial<Pick<Customer, 'nickname' | 'contact' | 'note'>>,
  ) => Customer | null
  deleteCustomer: (id: string) => { ok: true } | { ok: false; reason: string }
  catalogSlice: () => CatalogSlice
  addGame: (name: string, prefix: string) => string
  updateGame: (id: string, patch: { name?: string; orderPrefix?: string }) => void
  removeGame: (id: string) => void
  addCategory: (gameId: string, name: string, kind: CatalogKind) => void
  updateCategory: (id: string, patch: { name?: string; enabled?: boolean }) => void
  removeCategory: (id: string) => void
  addProduct: (categoryId: string, name: string, price?: number | null) => void
  updateProduct: (
    id: string,
    patch: { name?: string; price?: number | null; enabled?: boolean },
  ) => void
  removeProduct: (id: string) => void
  /** 当前账本快照（导出备份） */
  getSnapshot: () => Snapshot
  /** 整本替换（导入用）；hydrate 后会落盘 */
  replaceSnapshot: (snap: Snapshot | Partial<Snapshot>) => void
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
      games: s.games,
      categories: s.categories,
      products: s.products,
      servers: s.servers,
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

function applyCatalog(
  set: (partial: Partial<OrdersState> | ((s: OrdersState) => Partial<OrdersState>)) => void,
  slice: CatalogSlice,
) {
  set({
    games: slice.games,
    categories: slice.categories,
    products: slice.products,
    servers: slice.servers,
  })
}

const initial = emptySnapshot()

export const useOrdersStore = create<OrdersState>((set, get) => ({
  orders: [],
  customers: [],
  games: initial.games,
  categories: initial.categories,
  products: initial.products,
  servers: initial.servers,
  settings: initial.settings,
  channelFees: initial.channelFees,
  orderSeq: 0,
  hydrated: false,

  hydrate: async () => {
    if (get().hydrated) return
    const snap = await loadSnapshot()
    // 旧单没有 customerId：按昵称+联系方式补客户档案并回写
    let customers = [...snap.customers]
    const orders = snap.orders.map((o) => {
      if (o.customerId && customers.some((c) => c.id === o.customerId)) return o
      const phone = normalizePhone(o.contact)
      let hit =
        (phone
          ? customers.find((c) => !c.mergedIntoId && normalizePhone(c.contact) === phone)
          : undefined) ??
        customers.find(
          (c) => !c.mergedIntoId && c.nickname === o.nickname && normalizePhone(c.contact) === phone,
        )
      if (!hit) {
        hit = {
          id: `c-bf-${o.id}`,
          nickname: o.nickname || '未命名',
          contact: o.contact || '',
          note: '',
          createdAt: o.createdAt,
        }
        customers = [hit, ...customers]
      }
      return { ...o, customerId: hit.id, nickname: hit.nickname, contact: hit.contact || o.contact }
    })
    set({
      orders,
      customers,
      games: snap.games,
      categories: snap.categories,
      products: snap.products,
      servers: snap.servers,
      settings: snap.settings,
      channelFees: snap.channelFees,
      orderSeq: snap.orderSeq,
      hydrated: true,
    })
    // 若补了关联，落盘一次
    if (orders.some((o, i) => o.customerId !== snap.orders[i]?.customerId) || customers.length !== snap.customers.length) {
      schedulePersist(get)
    }
  },

  catalogSlice: () => {
    const s = get()
    return {
      games: s.games,
      categories: s.categories,
      products: s.products,
      servers: s.servers,
    }
  },

  upsertCustomer: ({ nickname, contact, note }) => {
    const nick = nickname.trim()
    const phone = contact.trim()
    const active = get().customers.filter((c) => !c.mergedIntoId)
    const norm = normalizePhone(phone)
    let found =
      (norm
        ? active.find((c) => normalizePhone(c.contact) === norm)
        : undefined) ??
      active.find((c) => c.nickname === nick && normalizePhone(c.contact) === norm)

    if (found) {
      const next: Customer = {
        ...found,
        nickname: nick || found.nickname,
        contact: phone || found.contact,
        note: note !== undefined ? note : found.note,
      }
      set((s) => ({
        customers: s.customers.map((c) => (c.id === found!.id ? next : c)),
      }))
      schedulePersist(get)
      return next
    }

    const created: Customer = {
      id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      nickname: nick,
      contact: phone,
      note: note ?? '',
      createdAt: new Date().toISOString(),
    }
    set((s) => ({ customers: [created, ...s.customers] }))
    schedulePersist(get)
    return created
  },

  updateCustomer: (id, patch) => {
    const cur = get().customers.find((c) => c.id === id)
    if (!cur || cur.mergedIntoId) return null
    const nickname = patch.nickname !== undefined ? patch.nickname.trim() : cur.nickname
    if (!nickname) return null
    const next: Customer = {
      ...cur,
      nickname,
      contact: patch.contact !== undefined ? patch.contact.trim() : cur.contact,
      note: patch.note !== undefined ? patch.note : cur.note,
    }
    set((s) => ({
      customers: s.customers.map((c) => (c.id === id ? next : c)),
      // 同步改订单上的展示字段（同客户）
      orders: s.orders.map((o) =>
        o.customerId === id
          ? { ...o, nickname: next.nickname, contact: next.contact }
          : o,
      ),
    }))
    schedulePersist(get)
    return next
  },

  deleteCustomer: (id) => {
    const count = get().orders.filter((o) => o.customerId === id).length
    if (count > 0) {
      return { ok: false, reason: `该客户还有 ${count} 张订单，不能删除` }
    }
    set((s) => ({ customers: s.customers.filter((c) => c.id !== id) }))
    schedulePersist(get)
    return { ok: true }
  },

  addOrder: (data) => {
    const customer = get().upsertCustomer({
      nickname: data.nickname,
      contact: data.contact,
    })
    const seq = get().orderSeq + 1
    const now = new Date().toISOString()
    const order: Order = {
      ...data,
      customerId: customer.id,
      nickname: customer.nickname,
      contact: customer.contact,
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
    delete (safe as { status?: Order['status'] }).status

    let customerId = cur.customerId
    if (safe.nickname !== undefined || safe.contact !== undefined) {
      const customer = get().upsertCustomer({
        nickname: safe.nickname ?? cur.nickname,
        contact: safe.contact ?? cur.contact,
      })
      customerId = customer.id
      safe.nickname = customer.nickname
      safe.contact = customer.contact
    }

    const next: Order = {
      ...cur,
      ...safe,
      id: cur.id,
      orderNo: cur.orderNo,
      createdAt: cur.createdAt,
      customerId,
    }
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

  addGame: (name, prefix) => {
    const { slice, gameId } = gameAdd(get().catalogSlice(), name, prefix)
    applyCatalog(set, slice)
    schedulePersist(get)
    return gameId
  },
  updateGame: (id, patch) => {
    applyCatalog(set, gameUpdate(get().catalogSlice(), id, patch))
    schedulePersist(get)
  },
  removeGame: (id) => {
    applyCatalog(set, gameRemove(get().catalogSlice(), id))
    schedulePersist(get)
  },
  addCategory: (gameId, name, kind) => {
    applyCatalog(set, catAdd(get().catalogSlice(), gameId, name, kind))
    schedulePersist(get)
  },
  updateCategory: (id, patch) => {
    applyCatalog(set, catUpdate(get().catalogSlice(), id, patch))
    schedulePersist(get)
  },
  removeCategory: (id) => {
    applyCatalog(set, catRemove(get().catalogSlice(), id))
    schedulePersist(get)
  },
  addProduct: (categoryId, name, price = null) => {
    applyCatalog(set, prodAdd(get().catalogSlice(), categoryId, name, price))
    schedulePersist(get)
  },
  updateProduct: (id, patch) => {
    applyCatalog(set, prodUpdate(get().catalogSlice(), id, patch))
    schedulePersist(get)
  },
  removeProduct: (id) => {
    applyCatalog(set, prodRemove(get().catalogSlice(), id))
    schedulePersist(get)
  },

  getSnapshot: () => {
    const s = get()
    return {
      version: SCHEMA_VERSION,
      orders: s.orders,
      customers: s.customers,
      games: s.games,
      categories: s.categories,
      products: s.products,
      servers: s.servers,
      settings: s.settings,
      channelFees: s.channelFees,
      orderSeq: s.orderSeq,
      updatedAt: new Date().toISOString(),
    }
  },

  replaceSnapshot: (partial) => {
    set((s) => ({
      orders: partial.orders ?? s.orders,
      customers: partial.customers ?? s.customers,
      games: partial.games ?? s.games,
      categories: partial.categories ?? s.categories,
      products: partial.products ?? s.products,
      servers: partial.servers ?? s.servers,
      settings: partial.settings ?? s.settings,
      channelFees: partial.channelFees ?? s.channelFees,
      orderSeq: partial.orderSeq ?? s.orderSeq,
    }))
    schedulePersist(get)
  },
}))
