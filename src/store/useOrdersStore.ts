import { create } from 'zustand'

/*
 * 订单 store —— 第一版只放内存里，刷新就没。
 * 持久化（localStorage / 文件）是下一步。
 */

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

interface OrdersState {
  orders: Order[]
  addOrder: (o: Omit<Order, 'id' | 'orderNo' | 'createdAt'>) => Order
}

let seq = 1

export const useOrdersStore = create<OrdersState>((set) => ({
  orders: [],
  addOrder: (data) => {
    const order: Order = {
      ...data,
      id: `o-${Date.now()}-${seq++}`,
      orderNo: `#${new Date().getFullYear()}${String(Date.now()).slice(-6)}`,
      createdAt: new Date().toISOString(),
    }
    set((s) => ({ orders: [order, ...s.orders] }))
    return order
  },
}))
