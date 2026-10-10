import { normalizeOrder, type Order } from '@/domain/order'
import type { AppSettings, ChannelFee, Snapshot } from '@/storage/types'
import { SCHEMA_VERSION } from '@/storage/types'

export function defaultSettings(): AppSettings {
  return {
    expiryOffsets: [1, 3, 7],
    recentProductIds: [],
  }
}

export function defaultChannelFees(): ChannelFee[] {
  return [
    { platform: '微信', rate: 0 },
    { platform: '闲鱼', rate: 0.016 },
  ]
}

export function emptySnapshot(): Snapshot {
  return {
    version: SCHEMA_VERSION,
    orders: [],
    customers: [],
    settings: defaultSettings(),
    channelFees: defaultChannelFees(),
    orderSeq: 0,
    updatedAt: new Date().toISOString(),
  }
}

function isOrderLike(v: unknown): v is Partial<Order> & Pick<Order, 'id' | 'orderNo'> {
  if (!v || typeof v !== 'object') return false
  const o = v as Record<string, unknown>
  return typeof o.id === 'string' && typeof o.orderNo === 'string' && Array.isArray(o.items)
}

/**
 * 把磁盘上的任意 JSON 抬到当前 schema。
 * 坏数据返回 null，调用方用 emptySnapshot。
 */
export function normalizeSnapshot(raw: unknown): Snapshot | null {
  if (!raw || typeof raw !== 'object') return null
  const data = raw as Partial<Snapshot> & { version?: number }
  if (!Array.isArray(data.orders)) return null

  const base = emptySnapshot()
  const settings: AppSettings = {
    ...base.settings,
    ...(data.settings && typeof data.settings === 'object' ? data.settings : {}),
  }
  if (!Array.isArray(settings.expiryOffsets)) settings.expiryOffsets = [1, 3, 7]
  if (!Array.isArray(settings.recentProductIds)) settings.recentProductIds = []

  const orders = data.orders.filter(isOrderLike).map(normalizeOrder)
  const customers = Array.isArray(data.customers)
    ? data.customers.filter((c) => c && typeof (c as { id?: string }).id === 'string')
    : []
  const channelFees =
    Array.isArray(data.channelFees) && data.channelFees.length > 0
      ? data.channelFees
      : base.channelFees

  // v0 / 无 version → v1：合法订单保留，缺字段用默认
  const version = typeof data.version === 'number' ? data.version : 0
  void version // 以后在这里写 version < N 的迁移分支

  return {
    version: SCHEMA_VERSION,
    orders,
    customers: customers as Snapshot['customers'],
    settings,
    channelFees,
    orderSeq:
      typeof data.orderSeq === 'number' && data.orderSeq >= 0
        ? Math.floor(data.orderSeq)
        : orders.length,
    updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : new Date().toISOString(),
  }
}
