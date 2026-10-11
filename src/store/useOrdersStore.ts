import { create } from 'zustand'
import { sanitizeOrderPatch, type Order } from '@/domain/order'
import { emptySnapshot } from '@/domain/ledger'
import { applyComplete, applyStatus, StatusFlowError } from '@/domain/status'
import { mergedNote, normalizePhone } from '@/domain/customers'
import {
  addCategory as catAdd,
  addGame as gameAdd,
  addProduct as prodAdd,
  addServer as srvAdd,
  formatOrderNo,
  primaryGameId,
  removeCategory as catRemove,
  removeGame as gameRemove,
  removeProduct as prodRemove,
  removeServer as srvRemove,
  resolveOrderPrefix,
  updateCategory as catUpdate,
  updateGame as gameUpdate,
  updateProduct as prodUpdate,
  updateServer as srvUpdate,
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
  updatedAt: string
  hydrated: boolean
  hydrate: () => Promise<void>
  addOrder: (o: OrderInput) => Order
  updateOrder: (id: string, patch: Partial<OrderInput>) => Order | null
  setOrderStatus: (id: string, to: Order['status']) => Order | null
  /** 完成订单；待处理会先开始再完成 */
  completeOrder: (id: string) => Order | null
  upsertCustomer: (data: { nickname: string; contact: string; note?: string }) => Customer
  /** 显式建档（不按手机号合并；昵称为空则失败） */
  createCustomer: (data: {
    nickname: string
    contact?: string
    note?: string
  }) => Customer | null
  updateCustomer: (
    id: string,
    patch: Partial<Pick<Customer, 'nickname' | 'contact' | 'note'>>,
  ) => Customer | null
  deleteCustomer: (id: string) => { ok: true } | { ok: false; reason: string }
  mergeCustomers: (fromId: string, intoId: string) => { ok: true } | { ok: false; reason: string }
  deleteOrder: (id: string) => Order | null
  restoreOrder: (order: Order, index?: number) => void
  setChannelFee: (platform: ChannelFee['platform'], rate: number) => void
  updateSettings: (patch: Partial<AppSettings>) => void
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
  addServer: (gameId: string, name: string) => void
  updateServer: (id: string, patch: { name?: string; enabled?: boolean }) => void
  removeServer: (id: string) => void
  /** 当前账本快照（导出备份） */
  getSnapshot: () => Snapshot
  /** 整本替换（导入用）；hydrate 后会落盘 */
  replaceSnapshot: (snap: Snapshot | Partial<Snapshot>) => void
}

let saveTimer: ReturnType<typeof setTimeout> | null = null

function schedulePersist(
  get: () => OrdersState,
  set?: (partial: Partial<OrdersState>) => void,
) {
  if (!get().hydrated) return
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    const s = get()
    const updatedAt = new Date().toISOString()
    set?.({ updatedAt })
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
      updatedAt,
    }
    void saveSnapshot(snap)
  }, 200)
}

function nextOrderNo(seq: number, games: Game[], gameId?: string): string {
  const prefix = gameId
    ? games.find((g) => g.id === gameId)?.orderPrefix ?? resolveOrderPrefix(games)
    : resolveOrderPrefix(games)
  return formatOrderNo(seq, prefix)
}

export type OrderSlice = { order: Order; index: number }

export function captureOrderSlice(orders: Order[], orderId: string): OrderSlice | null {
  const index = orders.findIndex((o) => o.id === orderId)
  if (index < 0) return null
  return { order: { ...orders[index] }, index }
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
  updatedAt: initial.updatedAt,
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
      updatedAt: snap.updatedAt,
      hydrated: true,
    })
    // 若补了关联，落盘一次
    if (orders.some((o, i) => o.customerId !== snap.orders[i]?.customerId) || customers.length !== snap.customers.length) {
      schedulePersist(get, set)
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

  createCustomer: ({ nickname, contact, note }) => {
    const nick = nickname.trim()
    if (!nick) return null
    const created: Customer = {
      id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      nickname: nick,
      contact: (contact ?? '').trim(),
      note: note ?? '',
      createdAt: new Date().toISOString(),
    }
    set((s) => ({ customers: [created, ...s.customers] }))
    schedulePersist(get, set)
    return created
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
      schedulePersist(get, set)
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
    schedulePersist(get, set)
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
    schedulePersist(get, set)
    return next
  },

  deleteCustomer: (id) => {
    const count = get().orders.filter((o) => o.customerId === id).length
    if (count > 0) {
      return { ok: false, reason: `该客户还有 ${count} 张订单，不能删除` }
    }
    set((s) => ({ customers: s.customers.filter((c) => c.id !== id) }))
    schedulePersist(get, set)
    return { ok: true }
  },

  mergeCustomers: (fromId, intoId) => {
    if (fromId === intoId) return { ok: false, reason: '不能合并到自己' }
    const from = get().customers.find((c) => c.id === fromId)
    const into = get().customers.find((c) => c.id === intoId)
    if (!from || from.mergedIntoId) return { ok: false, reason: '来源客户不存在或已合并' }
    if (!into || into.mergedIntoId) return { ok: false, reason: '目标客户不存在或已合并' }
    const note = mergedNote(from, into)
    set((s) => ({
      customers: s.customers.map((c) =>
        c.id === fromId
          ? { ...c, mergedIntoId: intoId }
          : c.id === intoId
            ? { ...c, note }
            : c,
      ),
      orders: s.orders.map((o) =>
        o.customerId === fromId
          ? { ...o, customerId: intoId, nickname: into.nickname, contact: into.contact || o.contact }
          : o,
      ),
    }))
    schedulePersist(get, set)
    return { ok: true }
  },

  deleteOrder: (id) => {
    const cur = get().orders.find((o) => o.id === id)
    if (!cur) return null
    set((s) => ({ orders: s.orders.filter((o) => o.id !== id) }))
    schedulePersist(get, set)
    return cur
  },

  restoreOrder: (order, index) => {
    set((s) => {
      const others = s.orders.filter((o) => o.id !== order.id)
      const at = Math.min(Math.max(index ?? 0, 0), others.length)
      return { orders: [...others.slice(0, at), { ...order }, ...others.slice(at)] }
    })
    schedulePersist(get, set)
  },

  setChannelFee: (platform, rate) => {
    const safe = Number.isFinite(rate) && rate >= 0 && rate < 1 ? rate : 0
    set((s) => {
      const exists = s.channelFees.some((f) => f.platform === platform)
      const channelFees = exists
        ? s.channelFees.map((f) => (f.platform === platform ? { ...f, rate: safe } : f))
        : [...s.channelFees, { platform, rate: safe }]
      return { channelFees }
    })
    schedulePersist(get, set)
  },

  updateSettings: (patch) => {
    set((s) => ({ settings: { ...s.settings, ...patch } }))
    schedulePersist(get, set)
  },

  addOrder: (data) => {
    const customer = get().upsertCustomer({
      nickname: data.nickname,
      contact: data.contact,
    })
    const seq = get().orderSeq + 1
    const now = new Date().toISOString()
    const games = get().games
    const gameId = data.gameId && games.some((g) => g.id === data.gameId)
      ? data.gameId
      : primaryGameId(games)
    const order: Order = {
      ...data,
      gameId,
      customerId: customer.id,
      nickname: customer.nickname,
      contact: customer.contact,
      id: `o-${Date.now()}-${seq}`,
      orderNo: nextOrderNo(seq, games, gameId),
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
    schedulePersist(get, set)
    return order
  },

  updateOrder: (id, patch) => {
    const cur = get().orders.find((o) => o.id === id)
    if (!cur) return null
    const safe = sanitizeOrderPatch(cur, patch) as Partial<OrderInput>

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
    schedulePersist(get, set)
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
      schedulePersist(get, set)
      return next
    } catch (e) {
      if (e instanceof StatusFlowError) return null
      throw e
    }
  },

  completeOrder: (id) => {
    const cur = get().orders.find((o) => o.id === id)
    if (!cur) return null
    try {
      const next = applyComplete(cur)
      set((s) => ({
        orders: s.orders.map((o) => (o.id === id ? next : o)),
      }))
      schedulePersist(get, set)
      return next
    } catch (e) {
      if (e instanceof StatusFlowError) return null
      throw e
    }
  },

  addGame: (name, prefix) => {
    const { slice, gameId } = gameAdd(get().catalogSlice(), name, prefix)
    applyCatalog(set, slice)
    schedulePersist(get, set)
    return gameId
  },
  updateGame: (id, patch) => {
    applyCatalog(set, gameUpdate(get().catalogSlice(), id, patch))
    schedulePersist(get, set)
  },
  removeGame: (id) => {
    applyCatalog(set, gameRemove(get().catalogSlice(), id))
    schedulePersist(get, set)
  },
  addCategory: (gameId, name, kind) => {
    applyCatalog(set, catAdd(get().catalogSlice(), gameId, name, kind))
    schedulePersist(get, set)
  },
  updateCategory: (id, patch) => {
    applyCatalog(set, catUpdate(get().catalogSlice(), id, patch))
    schedulePersist(get, set)
  },
  removeCategory: (id) => {
    applyCatalog(set, catRemove(get().catalogSlice(), id))
    schedulePersist(get, set)
  },
  addProduct: (categoryId, name, price = null) => {
    applyCatalog(set, prodAdd(get().catalogSlice(), categoryId, name, price))
    schedulePersist(get, set)
  },
  updateProduct: (id, patch) => {
    applyCatalog(set, prodUpdate(get().catalogSlice(), id, patch))
    schedulePersist(get, set)
  },
  removeProduct: (id) => {
    applyCatalog(set, prodRemove(get().catalogSlice(), id))
    schedulePersist(get, set)
  },
  addServer: (gameId, name) => {
    applyCatalog(set, srvAdd(get().catalogSlice(), gameId, name))
    schedulePersist(get, set)
  },
  updateServer: (id, patch) => {
    applyCatalog(set, srvUpdate(get().catalogSlice(), id, patch))
    schedulePersist(get, set)
  },
  removeServer: (id) => {
    applyCatalog(set, srvRemove(get().catalogSlice(), id))
    schedulePersist(get, set)
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
      updatedAt: s.updatedAt || new Date().toISOString(),
    }
  },

  replaceSnapshot: (partial) => {
    const nextUpdated =
      partial.updatedAt ??
      ('updatedAt' in partial ? partial.updatedAt : undefined) ??
      new Date().toISOString()
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
      updatedAt: nextUpdated || s.updatedAt || new Date().toISOString(),
    }))
    // 导入/拉取后立即落盘，但不强制把 updatedAt 刷新成 now（保留传入值）
    if (get().hydrated) {
      const snap = get().getSnapshot()
      void saveSnapshot(snap)
    }
  },
}))
