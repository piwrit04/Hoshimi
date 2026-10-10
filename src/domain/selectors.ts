/**
 * 订单列表筛选 / 排序（对照 Cheezit selectors，一期精简）。
 */

import type { Order, OrderStatus, OrderType, Platform } from '@/domain/order'

export type OrderMode = 'open' | 'all' | OrderStatus
export type Period = 'all' | 'today' | '7d' | 'month' | 'lastMonth'
export type OrderSortKey = 'createdAt' | 'amount' | 'completedAt'
export type OrderSortDir = 'asc' | 'desc'

export function orderHaystack(order: Order): string {
  const items =
    order.type === '托管'
      ? [order.custodyKind, order.settleKind].filter(Boolean).join(' ')
      : order.items.map((i) => i.product).join(' ')
  return [
    order.orderNo,
    order.note,
    order.server,
    order.platform,
    order.nickname,
    order.contact,
    items,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

export function matchesQuery(order: Order, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return orderHaystack(order).includes(q)
}

export function inPeriod(order: Order, period: Period, now = new Date()): boolean {
  if (period === 'all') return true
  const t = new Date(order.createdAt)
  if (Number.isNaN(t.getTime())) return false
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (period === 'today') return t >= startOfDay
  if (period === '7d') return t.getTime() >= startOfDay.getTime() - 6 * 86400000
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  if (period === 'month') return t >= monthStart
  const lastStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  return t >= lastStart && t < monthStart
}

export function filterOrders(
  orders: Order[],
  options: {
    type?: OrderType | 'all'
    mode?: OrderMode
    query?: string
    platform?: Platform | 'all'
    period?: Period
    now?: Date
  },
): Order[] {
  const type = options.type ?? 'all'
  const mode = options.mode ?? 'all'
  const platform = options.platform ?? 'all'
  const period = options.period ?? 'all'
  const query = options.query ?? ''
  return orders
    .filter((order) => type === 'all' || order.type === type)
    .filter((order) => {
      if (mode === 'all') return true
      if (mode === 'open') return order.status === '待处理' || order.status === '进行中'
      return order.status === mode
    })
    .filter((order) => platform === 'all' || order.platform === platform)
    .filter((order) => inPeriod(order, period, options.now))
    .filter((order) => matchesQuery(order, query))
}

export function compareOrders(
  a: Order,
  b: Order,
  key: OrderSortKey,
  dir: OrderSortDir,
): number {
  const mul = dir === 'asc' ? 1 : -1
  if (key === 'amount') {
    const byAmount = a.amount - b.amount
    if (byAmount) return byAmount * mul
    return b.createdAt.localeCompare(a.createdAt)
  }
  if (key === 'completedAt') {
    const av = a.completedAt
    const bv = b.completedAt
    if (!av && !bv) return b.createdAt.localeCompare(a.createdAt)
    if (!av) return 1
    if (!bv) return -1
    const byDone = av.localeCompare(bv)
    if (byDone) return byDone * mul
    return b.createdAt.localeCompare(a.createdAt)
  }
  const byCreated = a.createdAt.localeCompare(b.createdAt)
  if (byCreated) return byCreated * mul
  return a.id.localeCompare(b.id)
}

export function sortOrders(
  orders: readonly Order[],
  key: OrderSortKey = 'createdAt',
  dir: OrderSortDir = 'desc',
): Order[] {
  return [...orders].sort((a, b) => compareOrders(a, b, key, dir))
}
