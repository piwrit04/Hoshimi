/**
 * 概览统计 —— 口径对齐 Cheezit：
 * - 营收 / 到手只算「已完成」，按完成时间归月；退款、取消不算
 * - 有正式单时不算示例单（isTest）；只有示例时才用示例方便试用
 */

import { dateLabel, greeting, monthKey, todayISO, daysBetween } from '@/domain/dates'
import { fromCents, toCents } from '@/domain/money'
import type { Order } from '@/domain/order'
import { ALL_STATUSES } from '@/domain/status'
import type { Customer } from '@/storage/types'

export type LedgerView = {
  orders: Order[]
  customers: Customer[]
  settings: { expiryOffsets: number[] }
}

function sumMoney(values: number[]): number {
  return fromCents(values.reduce((s, n) => s + toCents(n), 0))
}

/** 有正式数据时不算示例；只有示例时才用示例 */
export function statOrders(orders: Order[]): { orders: Order[]; usingTest: boolean } {
  const real = orders.filter((o) => !o.isTest)
  const usingTest = real.length === 0 && orders.length > 0
  return { orders: usingTest ? orders : real, usingTest }
}

function openStatus(o: Order) {
  return o.status === '待处理' || o.status === '进行中'
}

export function dashboard(ledger: LedgerView, now = new Date()) {
  const { orders, usingTest } = statOrders(ledger.orders)
  const today = todayISO(now)
  const thisMonth = monthKey(now.toISOString())
  const done = orders.filter((o) => o.status === '已完成' && o.completedAt)
  const doneThisMonth = done.filter((o) => monthKey(o.completedAt!) === thisMonth)
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonth = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`
  const doneLastMonth = done.filter((o) => monthKey(o.completedAt!) === lastMonth)
  const custodyActive = orders.filter((o) => o.type === '托管' && openStatus(o))
  const since30 = now.getTime() - 30 * 86400000
  const activeCustomers = new Set(
    orders
      .filter((o) => o.status !== '已取消' && new Date(o.createdAt).getTime() >= since30)
      .map((o) => o.customerId || `${o.nickname}|${o.contact}`),
  ).size

  const threshold = ledger.settings.expiryOffsets.length
    ? Math.max(...ledger.settings.expiryOffsets)
    : 7
  const expiring = custodyActive
    .filter((o) => o.endDate)
    .map((o) => ({ order: o, days: daysBetween(today, o.endDate!) }))
    .filter((x) => x.days <= threshold)
    .sort((a, b) => a.days - b.days)

  const recent = [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6)
  const statusCounts = ALL_STATUSES.map((status) => ({
    status,
    count: orders.filter((o) => o.status === status).length,
  }))

  return {
    usingTest,
    hello: greeting(now),
    todayLabel: dateLabel(now),
    remindDays: threshold,
    kpis: {
      total: orders.length,
      customers: ledger.customers.filter((c) => !c.mergedIntoId).length,
      inProgress: orders.filter((o) => o.status === '进行中').length,
      waiting: orders.filter((o) => o.status === '待处理').length,
      completedThisMonth: doneThisMonth.length,
      revenueThisMonth: sumMoney(doneThisMonth.map((o) => o.amount)),
      payoutThisMonth: sumMoney(doneThisMonth.map((o) => o.payout)),
      payoutLastMonth: sumMoney(doneLastMonth.map((o) => o.payout)),
      custodyActive: custodyActive.length,
      activeCustomers,
      openCount: orders.filter(openStatus).length,
    },
    expiring,
    recent,
    statusCounts,
  }
}
