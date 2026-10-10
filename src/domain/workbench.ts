/**
 * 待办 / 工作台 —— 普通未完成 + 即将到期托管
 * 示例单规则同概览（statOrders）
 */

import { daysBetween, sameLocalDay, todayISO } from '@/domain/dates'
import { fromCents, toCents } from '@/domain/money'
import type { Order } from '@/domain/order'
import { statOrders } from '@/domain/dashboard'

export type WorkbenchSettings = { expiryOffsets: number[] }

export function workbench(
  orders: Order[],
  settings: WorkbenchSettings,
  query = '',
  now = new Date(),
) {
  const today = todayISO(now)
  const threshold = settings.expiryOffsets.length ? Math.max(...settings.expiryOffsets) : -1
  const scoped = statOrders(orders).orders
  const q = query.trim().toLowerCase()
  const match = (o: Order) => {
    if (!q) return true
    const hay = [o.orderNo, o.nickname, o.contact, o.note, o.custodyKind, o.server, ...o.items.map((i) => i.product)]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return hay.includes(q)
  }

  const openNormal = scoped
    .filter((o) => o.type === '普通' && (o.status === '待处理' || o.status === '进行中'))
    .filter(match)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  const expiring = scoped
    .filter(
      (o) =>
        o.type === '托管' &&
        (o.status === '待处理' || o.status === '进行中') &&
        o.endDate &&
        threshold >= 0 &&
        daysBetween(today, o.endDate) <= threshold,
    )
    .filter(match)
    .sort((a, b) => (a.endDate ?? '').localeCompare(b.endDate ?? ''))

  const doneToday = scoped.filter((o) => o.status === '已完成' && sameLocalDay(o.completedAt, today))
  const todayPayout = fromCents(doneToday.reduce((s, o) => s + toCents(o.payout), 0))

  return {
    today,
    openNormal,
    expiring,
    doneTodayCount: doneToday.length,
    todayPayout,
    threshold,
    followCount: openNormal.length + expiring.length,
  }
}

export function daysUntilLabel(today: string, endDate: string): string {
  const days = daysBetween(today, endDate)
  if (days < 0) return `已过期 ${-days} 天`
  if (days === 0) return '今天到期'
  return `还有 ${days} 天`
}
