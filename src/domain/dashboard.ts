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

export type ExpiringItem = { order: Order; days: number }

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
  const expiring: ExpiringItem[] = custodyActive
    .filter((o) => o.endDate)
    .map((o) => ({ order: o, days: daysBetween(today, o.endDate!) }))
    .filter((x) => x.days <= threshold)
    .sort((a, b) => a.days - b.days)

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
  const newThisMonth = orders.filter((o) => new Date(o.createdAt).getTime() >= monthStart)
  const newThisMonthLive = newThisMonth.filter((o) => o.status !== '已退款' && o.status !== '已取消')
  const doneToday = done.filter((o) => todayISO(new Date(o.completedAt!)) === today)
  const inProgress = orders.filter((o) => o.status === '进行中')

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
      inProgress: inProgress.length,
      waiting: orders.filter((o) => o.status === '待处理').length,
      completedThisMonth: doneThisMonth.length,
      revenueThisMonth: sumMoney(doneThisMonth.map((o) => o.amount)),
      payoutThisMonth: sumMoney(doneThisMonth.map((o) => o.payout)),
      payoutLastMonth: sumMoney(doneLastMonth.map((o) => o.payout)),
      custodyActive: custodyActive.length,
      activeCustomers,
      openCount: orders.filter(openStatus).length,
      payoutToday: sumMoney(doneToday.map((o) => o.payout)),
      completedToday: doneToday.length,
      newThisMonth: newThisMonth.length,
      newThisMonthAmount: sumMoney(newThisMonthLive.map((o) => o.amount)),
    },
    /** KPI 点开用的明细 */
    lists: {
      doneToday,
      inProgress,
      newThisMonth,
      expiring,
    },
    expiring,
    recent,
    statusCounts,
  }
}

export type TrendUnit = 'day' | 'week' | 'month'
export type TrendPoint = {
  key: string
  label: string
  revenue: number
  payout: number
  count: number
}

const pad = (n: number) => String(n).padStart(2, '0')
const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const weekStart = (d: Date) => {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7))
  return x
}

/**
 * 收入走势：日（近 14 天）/ 周（近 8 周）/ 月（近 6 个月）。
 * 口径同概览：已完成 + 有完成时间；有正式单时不算示例。
 */
export function incomeTrend(
  ledger: LedgerView,
  unit: TrendUnit,
  now = new Date(),
): TrendPoint[] {
  const { orders } = statOrders(ledger.orders)
  const done = orders.filter((o) => o.status === '已完成' && o.completedAt)
  const buckets: { key: string; label: string }[] = []
  let keyOf: (d: Date) => string
  if (unit === 'day') {
    for (let i = 13; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
      buckets.push({ key: dayKey(d), label: `${d.getMonth() + 1}/${d.getDate()}` })
    }
    keyOf = dayKey
  } else if (unit === 'week') {
    const start = weekStart(now)
    for (let i = 7; i >= 0; i -= 1) {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() - i * 7)
      const end = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 6)
      buckets.push({
        key: dayKey(d),
        label: `${d.getMonth() + 1}/${d.getDate()}–${end.getMonth() + 1}/${end.getDate()}`,
      })
    }
    keyOf = (d) => dayKey(weekStart(d))
  } else {
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      buckets.push({
        key: `${d.getFullYear()}-${pad(d.getMonth() + 1)}`,
        label: `${d.getMonth() + 1}月`,
      })
    }
    keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
  }

  return buckets.map((b) => {
    const list = done.filter((o) => keyOf(new Date(o.completedAt!)) === b.key)
    return {
      key: b.key,
      label: b.label,
      revenue: sumMoney(list.map((o) => o.amount)),
      payout: sumMoney(list.map((o) => o.payout)),
      count: list.length,
    }
  })
}

export type IncomeTipKind = 'empty' | 'quiet' | 'down' | 'up' | 'busy'

export type IncomeTip = { kind: IncomeTipKind; text: string }

/**
 * 根据今日 / 近几日到手写一句提示（概览右侧面板用）。
 * dayTrend：日粒度走势，最后一点通常是今天。
 */
export function incomeSmartTip(
  kpis: {
    total: number
    payoutToday: number
    completedToday: number
    payoutThisMonth: number
    inProgress: number
    waiting: number
  },
  dayTrend: TrendPoint[],
): IncomeTip {
  if (kpis.total === 0) {
    return { kind: 'empty', text: '账本还是空的。记第一单之后，这里会根据收入给你一句提醒。' }
  }

  const todayPayout = kpis.payoutToday
  const todayCount = kpis.completedToday
  const prior = dayTrend.slice(0, -1)
  const priorWithMoney = prior.filter((p) => p.payout > 0)
  const avgPrior =
    priorWithMoney.length > 0
      ? priorWithMoney.reduce((s, p) => s + p.payout, 0) / priorWithMoney.length
      : 0

  if (todayCount === 0 && todayPayout === 0) {
    if (kpis.inProgress + kpis.waiting > 0) {
      return {
        kind: 'quiet',
        text: `今天还没入账。手头还有 ${kpis.inProgress + kpis.waiting} 单未完成，做完一单走势就会动。`,
      }
    }
    if (kpis.payoutThisMonth === 0) {
      return { kind: 'quiet', text: '本月还没有到手，找个空档记一单或把进行中的做完吧。' }
    }
    return { kind: 'quiet', text: '今天还没入账，不着急，稳住节奏就好。' }
  }

  if (todayCount >= 3 || (avgPrior > 0 && todayPayout >= avgPrior * 1.6)) {
    return {
      kind: 'busy',
      text: `今天已到手 ${todayCount} 单，忙得漂亮。记得顺手把进行中的也清一清。`,
    }
  }

  if (avgPrior > 0 && todayPayout < avgPrior * 0.65) {
    return {
      kind: 'down',
      text: '今天到手比近几日淡一些，没事，曲线总会有起伏。',
    }
  }

  if (avgPrior > 0 && todayPayout > avgPrior * 1.15) {
    return {
      kind: 'up',
      text: '今天到手比近几日好一截，保持这个手感就行。',
    }
  }

  return {
    kind: 'up',
    text: `今天已完成 ${todayCount} 单，节奏不错，继续保持。`,
  }
}
