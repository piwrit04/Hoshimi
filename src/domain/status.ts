/**
 * 订单状态机 —— 照搬 Cheezit/src/domain/status.ts（一期不做状态历史）。
 *
 *   待处理 → 进行中 / 已取消
 *   进行中 → 已完成 / 已退款 / 已取消
 *   已完成 → 已退款
 *   已退款、已取消 为终态
 */

import type { Order, OrderStatus } from '@/domain/order'

export const STATUS_FLOW: Record<OrderStatus, OrderStatus[]> = {
  待处理: ['进行中', '已取消'],
  进行中: ['已完成', '已退款', '已取消'],
  已完成: ['已退款'],
  已退款: [],
  已取消: [],
}

export const ALL_STATUSES: OrderStatus[] = ['待处理', '进行中', '已完成', '已退款', '已取消']

export function nextStatuses(status: OrderStatus): OrderStatus[] {
  return STATUS_FLOW[status] ?? []
}

export function canMove(from: OrderStatus, to: OrderStatus): boolean {
  return from === to || nextStatuses(from).includes(to)
}

export function isTerminal(status: OrderStatus): boolean {
  return nextStatuses(status).length === 0
}

/** 退款 / 取消：列表到手显示「—」，不算营收 */
export function payoutVoid(order: Pick<Order, 'status'>): boolean {
  return order.status === '已退款' || order.status === '已取消'
}

export const NO_PAYOUT = '—'

export function actionLabel(to: OrderStatus): string {
  return (
    {
      待处理: '待处理',
      进行中: '开始',
      已完成: '完成',
      已退款: '退款',
      已取消: '取消订单',
    } as const
  )[to]
}

export function wantsReason(to: OrderStatus): boolean {
  return to === '已退款' || to === '已取消'
}

export class StatusFlowError extends Error {}

/**
 * 推进单条订单状态。非法流转抛 StatusFlowError。
 * 进入「已完成」时记完成时间并锁金额；进入「进行中」记开始时间。
 */
export function applyStatus(order: Order, to: OrderStatus, at = new Date()): Order {
  if (order.status === to) return order
  if (!canMove(order.status, to)) {
    throw new StatusFlowError(`「${order.status}」不能改成「${to}」`)
  }
  const now = at.toISOString()
  return {
    ...order,
    status: to,
    startedAt:
      to === '进行中' || to === '已完成' ? order.startedAt ?? now : order.startedAt,
    completedAt: to === '已完成' ? now : order.completedAt,
    amountLocked: to === '已完成' || to === '已退款' || to === '已取消' ? true : order.amountLocked,
  }
}

export function countsAsIncome(order: Pick<Order, 'status'>): boolean {
  return order.status === '已完成'
}
