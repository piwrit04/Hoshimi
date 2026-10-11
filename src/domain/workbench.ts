/**
 * 待办 / 工作台 —— 普通未完成（催单）+ 即将到期 / 未设到期日的托管
 * 示例单规则同概览（statOrders）
 */

import { daysBetween, sameLocalDay, todayISO } from '@/domain/dates'
import { expiryThreshold } from '@/domain/ledger'
import { fromCents, toCents } from '@/domain/money'
import type { Order } from '@/domain/order'
import { statOrders } from '@/domain/dashboard'

export type WorkbenchSettings = { expiryOffsets: number[] }
export { expiryThreshold } from '@/domain/ledger'

function openStatus(o: Order) {
  return o.status === '待处理' || o.status === '进行中'
}

function matchQuery(o: Order, q: string) {
  if (!q) return true
  const hay = [o.orderNo, o.nickname, o.contact, o.note, o.custodyKind, o.server, ...o.items.map((i) => i.product)]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return hay.includes(q)
}

export function workbench(
  orders: Order[],
  settings: WorkbenchSettings,
  query = '',
  now = new Date(),
) {
  const today = todayISO(now)
  const threshold = expiryThreshold(settings.expiryOffsets)
  const scoped = statOrders(orders).orders
  const q = query.trim().toLowerCase()

  const openNormalAll = scoped
    .filter((o) => o.type === '普通' && openStatus(o))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  /** 未设结束日也进到期区，避免托管单在待办里「消失」 */
  const expiringAll = scoped
    .filter((o) => o.type === '托管' && openStatus(o))
    .filter((o) => !o.endDate || daysBetween(today, o.endDate) <= threshold)
    .sort((a, b) => {
      if (!a.endDate && !b.endDate) return b.createdAt.localeCompare(a.createdAt)
      if (!a.endDate) return 1
      if (!b.endDate) return -1
      return a.endDate.localeCompare(b.endDate)
    })

  const openNormal = openNormalAll.filter((o) => matchQuery(o, q))
  const expiring = expiringAll.filter((o) => matchQuery(o, q))

  const doneToday = scoped.filter((o) => o.status === '已完成' && sameLocalDay(o.completedAt, today))
  const todayPayout = fromCents(doneToday.reduce((s, o) => s + toCents(o.payout), 0))

  return {
    today,
    openNormal,
    expiring,
    doneTodayCount: doneToday.length,
    todayPayout,
    threshold,
    /** 未按搜索过滤（角标 / KPI / 分段数字） */
    chaseCount: openNormalAll.length,
    dueCount: expiringAll.length,
    followCount: openNormalAll.length + expiringAll.length,
    matchCount: openNormal.length + expiring.length,
  }
}

export function daysUntilLabel(today: string, endDate: string | null | undefined): string {
  if (!endDate) return '未设到期日'
  const days = daysBetween(today, endDate)
  if (days < 0) return `已过期 ${-days} 天`
  if (days === 0) return '今天到期'
  return `还有 ${days} 天`
}
