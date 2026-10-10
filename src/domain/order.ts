/** 订单领域类型（与持久化快照共用） */

export type OrderStatus = '待处理' | '进行中' | '已完成'
export type OrderType = '普通' | '托管'
export type Platform = '微信' | '闲鱼'

export interface OrderItem {
  category: string
  product: string
  price: number
}

export interface Order {
  id: string
  orderNo: string
  createdAt: string
  nickname: string
  contact: string
  type: OrderType
  platform: Platform
  server: string
  status: OrderStatus
  items: OrderItem[]
  /** 托管单专用 */
  custodyKind?: string
  settleKind?: string
  startDate?: string
  endDate?: string
  /** 钱 */
  amount: number
  feeRate: number
  payout: number
  transferEnabled: boolean
  note: string
}
