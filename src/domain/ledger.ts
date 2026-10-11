import { seedCatalog } from '@/domain/catalog'
import { normalizeOrder, type Order } from '@/domain/order'
import type {
  AppSettings,
  CatalogCategory,
  CatalogProduct,
  ChannelFee,
  Customer,
  Game,
  ServerEntry,
  Snapshot,
} from '@/storage/types'
import { SCHEMA_VERSION } from '@/storage/types'

export function defaultSettings(): AppSettings {
  return {
    expiryOffsets: [1, 3, 7],
    recentProductIds: [],
  }
}

/** 托管到期提醒阈值（天）。未勾选时兜底 7，待办/概览共用。 */
export function expiryThreshold(offsets: number[], fallback = 7): number {
  return offsets.length ? Math.max(...offsets) : fallback
}

export function feeRateOf(fees: ChannelFee[], platform: string): number {
  return fees.find((f) => f.platform === platform)?.rate ?? 0
}

export function defaultChannelFees(): ChannelFee[] {
  return [
    { platform: '微信', rate: 0 },
    { platform: '闲鱼', rate: 0.016 },
  ]
}

export function emptySnapshot(): Snapshot {
  const catalog = seedCatalog()
  return {
    version: SCHEMA_VERSION,
    orders: [],
    customers: [],
    games: catalog.games,
    categories: catalog.categories,
    products: catalog.products,
    servers: catalog.servers,
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

function asArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : []
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
  const customers = asArray<Customer>(data.customers).filter(
    (c) => c && typeof c.id === 'string' && typeof c.nickname === 'string',
  )
  const channelFees =
    Array.isArray(data.channelFees) && data.channelFees.length > 0
      ? data.channelFees
      : base.channelFees

  // v1 → v2：补项目目录种子
  const games = asArray<Game>(data.games)
  const categories = asArray<CatalogCategory>(data.categories)
  const products = asArray<CatalogProduct>(data.products)
  const servers = asArray<ServerEntry>(data.servers)
  const hasCatalog = games.length > 0 && categories.length > 0

  return {
    version: SCHEMA_VERSION,
    orders,
    customers,
    games: hasCatalog ? games : base.games,
    categories: hasCatalog ? categories : base.categories,
    products: hasCatalog ? products : base.products,
    servers: servers.length > 0 ? servers : base.servers,
    settings,
    channelFees,
    orderSeq:
      typeof data.orderSeq === 'number' && data.orderSeq >= 0
        ? Math.floor(data.orderSeq)
        : orders.length,
    updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : new Date().toISOString(),
  }
}
