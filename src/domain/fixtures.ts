/**
 * 演示 / 截图用账本 —— **只从 seedCatalog 取项目**，不编项目名。
 *
 * seedCatalog 的项目默认价都是 null（由用户自己在设置里填），
 * 所以这里给演示单单独配一张价目表（按项目名对上目录里真实存在的项目）。
 * 找不到的项目会直接抛错，防止又写出目录里没有的名字。
 */

import { formatOrderNo, seedCatalog, type CatalogSlice } from '@/domain/catalog'
import { calcMoney, PLATFORM_FEE } from '@/domain/money'
import type { Order, OrderStatus, Platform, SettleKind } from '@/domain/order'
import { SCHEMA_VERSION, type Customer, type Snapshot } from '@/storage/types'

/** 演示价（元）——键必须是 seedCatalog 里的项目名 */
export const FIXTURE_PRICES: Record<string, number> = {
  '1.3版本全收集': 168,
  谕石全收集: 88,
  全异象委托: 128,
  '无名医院（全结局）': 45,
  '第四章：红字的研究': 38,
  '第五章：游梦洄廊': 38,
  全支线任务: 98,
  月光当铺: 25,
  粉爪大劫案: 30,
  '排球之星（周常联赛）': 18,
  都市活力: 12,
  套餐2: 60,
  '十三日梦醒（1.1）': 35,
  '轨外回响（1.3）': 40,
  账号开荒: 150,
  普托: 300,
  全托: 520,
}

type Line = string // 项目名

type Spec = {
  c: number // 客户下标
  platform: Platform
  status: OrderStatus
  /** 下单距今天数 */
  ago: number
  /** 完成距今天数（已完成用） */
  doneAgo?: number
  lines?: Line[]
  custody?: { kind: '普托' | '全托'; settle: SettleKind; startAgo: number; days: number }
  server?: string
  transfer?: number // 转出比例
}

const CUSTOMERS: [string, string][] = [
  ['小满', 'wx_xiaoman'],
  ['阿梨', '13800138021'],
  ['柚子', 'xy_youzi99'],
  ['南风', 'wx_nanfeng'],
  ['桃桃', '13900139055'],
  ['阿七', 'xy_aqi_77'],
]

const SPECS: Spec[] = [
  { c: 0, platform: '微信', status: '已完成', ago: 0, doneAgo: 0, lines: ['都市活力', '排球之星（周常联赛）'] },
  { c: 1, platform: '闲鱼', status: '已完成', ago: 1, doneAgo: 0, lines: ['全异象委托'] },
  { c: 2, platform: '闲鱼', status: '进行中', ago: 1, lines: ['1.3版本全收集'], server: '国际服' },
  { c: 3, platform: '微信', status: '进行中', ago: 2, lines: ['第四章：红字的研究', '第五章：游梦洄廊'] },
  { c: 4, platform: '微信', status: '待处理', ago: 0, lines: ['月光当铺'] },
  { c: 5, platform: '闲鱼', status: '待处理', ago: 0, lines: ['粉爪大劫案', '都市活力'], server: 'B服' },
  { c: 0, platform: '微信', status: '进行中', ago: 20, custody: { kind: '全托', settle: '月结', startAgo: 26, days: 30 } },
  { c: 2, platform: '闲鱼', status: '进行中', ago: 12, custody: { kind: '普托', settle: '周结', startAgo: 12, days: 14 } },
  { c: 1, platform: '微信', status: '已完成', ago: 5, doneAgo: 3, lines: ['全支线任务'], transfer: 0.7 },
  { c: 3, platform: '闲鱼', status: '已完成', ago: 9, doneAgo: 7, lines: ['谕石全收集'] },
  { c: 4, platform: '微信', status: '已完成', ago: 16, doneAgo: 14, lines: ['套餐2', '十三日梦醒（1.1）'] },
  { c: 5, platform: '闲鱼', status: '已完成', ago: 40, doneAgo: 38, lines: ['账号开荒'] },
  { c: 0, platform: '微信', status: '已完成', ago: 70, doneAgo: 66, lines: ['轨外回响（1.3）', '无名医院（全结局）'] },
  { c: 2, platform: '闲鱼', status: '已退款', ago: 6, lines: ['无名医院（全结局）'] },
  { c: 3, platform: '微信', status: '已取消', ago: 3, lines: ['月光当铺'] },
]

const pad = (n: number) => String(n).padStart(2, '0')
const dayStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

function at(now: Date, ago: number, hour: number): Date {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ago, hour, (ago * 17) % 60)
  return d
}

function findProduct(cat: CatalogSlice, name: string) {
  const p = cat.products.find((x) => x.name === name)
  if (!p) throw new Error(`fixtures：目录里没有「${name}」`)
  const c = cat.categories.find((x) => x.id === p.categoryId)!
  const price = FIXTURE_PRICES[name]
  if (price == null) throw new Error(`fixtures：「${name}」没有演示价`)
  return { category: c.name, product: p.name, price }
}

/** 生成一份完整快照（可直接写进 IndexedDB） */
export function buildFixtureSnapshot(now = new Date()): Snapshot {
  const cat = seedCatalog()
  const customers: Customer[] = CUSTOMERS.map(([nickname, contact], i) => ({
    id: `cust-${i + 1}`,
    nickname,
    contact,
    note: '',
    createdAt: at(now, 90 - i * 5, 10).toISOString(),
  }))

  const sorted = SPECS.map((s, i) => ({ s, i })).sort((a, b) => b.s.ago - a.s.ago)
  const perDay = new Map<string, number>()
  const orders: Order[] = sorted.map(({ s, i }) => {
    const created = at(now, s.ago, 9 + (i % 10))
    const key = dayStr(created)
    const seq = (perDay.get(key) ?? 0) + 1
    perDay.set(key, seq)
    const cust = customers[s.c]
    const items = s.custody ? [] : (s.lines ?? []).map((n) => findProduct(cat, n))
    const amount = s.custody
      ? findProduct(cat, s.custody.kind).price
      : items.reduce((sum, it) => sum + it.price, 0)
    const feeRate = PLATFORM_FEE[s.platform]
    const m = calcMoney({
      amount,
      feeRate,
      transferEnabled: s.transfer != null,
      transferMode: 'ratio',
      transferRatio: s.transfer ?? 0.8,
      transferAmount: 0,
    })
    const done = s.status === '已完成' ? at(now, s.doneAgo ?? s.ago, 18).toISOString() : undefined
    const started =
      s.status === '待处理' || s.status === '已取消' ? undefined : at(now, s.ago, 20).toISOString()
    const start = s.custody ? at(now, s.custody.startAgo, 0) : null
    const end = s.custody && start ? new Date(start.getFullYear(), start.getMonth(), start.getDate() + s.custody.days) : null
    return {
      id: `ord-${i + 1}`,
      orderNo: formatOrderNo(seq, 'NTE', created),
      createdAt: created.toISOString(),
      customerId: cust.id,
      nickname: cust.nickname,
      contact: cust.contact,
      type: s.custody ? '托管' : '普通',
      platform: s.platform,
      server: s.server ?? '官服',
      status: s.status,
      items,
      custodyKind: s.custody?.kind,
      settleKind: s.custody?.settle,
      startDate: start ? dayStr(start) : undefined,
      endDate: end ? dayStr(end) : undefined,
      amount: m.amount,
      feeRate,
      feeAmount: m.feeAmount,
      payout: m.payoutAmount,
      transferEnabled: s.transfer != null,
      transferMode: 'ratio',
      transferRatio: s.transfer ?? 0.8,
      transferAmount: 0,
      note: '',
      startedAt: started,
      completedAt: done,
      amountLocked: s.status === '已完成' || s.status === '已退款' || s.status === '已取消',
      isTest: false,
    } satisfies Order
  })

  return {
    version: SCHEMA_VERSION,
    orders,
    customers,
    ...cat,
    settings: { expiryOffsets: [1, 3, 7], recentProductIds: [] },
    channelFees: [
      { platform: '微信', rate: PLATFORM_FEE['微信'] },
      { platform: '闲鱼', rate: PLATFORM_FEE['闲鱼'] },
    ],
    orderSeq: orders.length,
    updatedAt: now.toISOString(),
  }
}
