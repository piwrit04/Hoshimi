/** 订单领域类型（与持久化快照共用） */

import type { TransferMode } from '@/domain/money'

export type OrderStatus = '待处理' | '进行中' | '已完成' | '已退款' | '已取消'
export type OrderType = '普通' | '托管'
export type Platform = '微信' | '闲鱼'
export type SettleKind = '日结' | '周结' | '月结'

export interface OrderItem {
  category: string
  product: string
  price: number
}

export interface Order {
  id: string
  orderNo: string
  createdAt: string
  /** 关联客户；旧数据可空，保存时会补 */
  customerId?: string
  /** 所属游戏；用于单号前缀与目录；旧数据可空 */
  gameId?: string
  nickname: string
  contact: string
  type: OrderType
  platform: Platform
  server: string
  status: OrderStatus
  items: OrderItem[]
  /** 托管单专用 */
  custodyKind?: string
  settleKind?: SettleKind
  startDate?: string
  endDate?: string
  /** 钱 */
  amount: number
  feeRate: number
  feeAmount: number
  payout: number
  transferEnabled: boolean
  transferMode: TransferMode
  /** 0–1 */
  transferRatio: number
  transferAmount: number
  note: string
  startedAt?: string
  completedAt?: string
  /** 已完成 / 终态后金额锁定 */
  amountLocked?: boolean
  /** 示例数据；有正式单时统计会排除 */
  isTest?: boolean
  /** 导入去重键 */
  dedupeKey?: string
}

/** 给旧快照 / 缺字段补默认 */
export function normalizeOrder(raw: Partial<Order> & Pick<Order, 'id' | 'orderNo'>): Order {
  const amount = typeof raw.amount === 'number' ? raw.amount : 0
  const feeRate = typeof raw.feeRate === 'number' ? raw.feeRate : 0
  const feeAmount =
    typeof raw.feeAmount === 'number' ? raw.feeAmount : Math.round(amount * feeRate * 100) / 100
  const payout = typeof raw.payout === 'number' ? raw.payout : amount - feeAmount
  return {
    id: raw.id,
    orderNo: raw.orderNo,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString(),
    customerId: typeof raw.customerId === 'string' ? raw.customerId : undefined,
    gameId: typeof raw.gameId === 'string' ? raw.gameId : undefined,
    nickname: typeof raw.nickname === 'string' ? raw.nickname : '',
    contact: typeof raw.contact === 'string' ? raw.contact : '',
    type: raw.type === '托管' ? '托管' : '普通',
    platform: raw.platform === '闲鱼' ? '闲鱼' : '微信',
    server: typeof raw.server === 'string' ? raw.server : '官服',
    status: isOrderStatus(raw.status) ? raw.status : '待处理',
    items: Array.isArray(raw.items) ? raw.items : [],
    custodyKind: raw.custodyKind,
    settleKind: raw.settleKind,
    startDate: raw.startDate,
    endDate: raw.endDate,
    amount,
    feeRate,
    feeAmount,
    payout,
    transferEnabled: Boolean(raw.transferEnabled),
    transferMode: raw.transferMode === 'fixed' ? 'fixed' : 'ratio',
    transferRatio: typeof raw.transferRatio === 'number' ? raw.transferRatio : 0.8,
    transferAmount: typeof raw.transferAmount === 'number' ? raw.transferAmount : 0,
    note: typeof raw.note === 'string' ? raw.note : '',
    startedAt: raw.startedAt,
    completedAt: raw.completedAt,
    amountLocked: Boolean(raw.amountLocked),
    isTest: Boolean(raw.isTest),
    dedupeKey: typeof raw.dedupeKey === 'string' ? raw.dedupeKey : undefined,
  }
}

function isOrderStatus(v: unknown): v is OrderStatus {
  return v === '待处理' || v === '进行中' || v === '已完成' || v === '已退款' || v === '已取消'
}

/** 已完成 / 退款 / 取消后金额锁定，不能再改价 */
export function isAmountLocked(order: Pick<Order, 'amountLocked' | 'status'>): boolean {
  return (
    Boolean(order.amountLocked) ||
    order.status === '已完成' ||
    order.status === '已退款' ||
    order.status === '已取消'
  )
}

export const ORDER_MONEY_KEYS = [
  'amount',
  'feeRate',
  'feeAmount',
  'payout',
  'transferEnabled',
  'transferMode',
  'transferRatio',
  'transferAmount',
  'items',
  'type',
] as const

/** 编辑时剥掉不允许改的字段（金额锁 + 状态须走 setOrderStatus） */
export function sanitizeOrderPatch(
  order: Order,
  patch: Partial<Order>,
): Partial<Order> {
  const safe: Partial<Order> = { ...patch }
  if (isAmountLocked(order)) {
    for (const k of ORDER_MONEY_KEYS) delete safe[k]
  }
  delete safe.status
  delete safe.id
  delete safe.orderNo
  delete safe.createdAt
  return safe
}

