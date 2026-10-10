/**
 * 项目目录：种子 + 增删改查纯函数。
 * 录单只存项目名文本，改目录不影响旧单。
 */

import type {
  CatalogCategory,
  CatalogKind,
  CatalogProduct,
  Game,
  ServerEntry,
} from '@/storage/types'

export const DEFAULT_GAME_ID = 'game-nte'
export const DEFAULT_GAME_NAME = '异环'
export const DEFAULT_PREFIX = 'NTE'

/** 种子用的分类名 → 项目名（与旧静态 CATALOG 一致） */
const SEED_CATS: { code: string; name: string; kind: CatalogKind; products: string[] }[] = [
  { code: 'A', name: '全收集', kind: 'normal', products: ['1.0版本全收集', '1.1版本全收集', '1.3版本全收集', '谕石全收集', '赠礼全收集', '异闻录全收集'] },
  { code: 'B', name: '异象委托', kind: 'normal', products: ['全异象委托', '异象委托（单个）', '无名医院（全结局）', '无名医院（结局一）'] },
  { code: 'C', name: '主线任务', kind: 'normal', products: ['序章', '第一章：生意经与招财宝', '第二章：从捏造开始的恋爱大作战', '第三章：成交？成交！', '第四章：红字的研究', '第五章：游梦洄廊', '第六章：雾巢游戏', '第七章：勇者斗恶龙'] },
  { code: 'D', name: '支线与番外', kind: 'normal', products: ['全支线任务', '月光当铺', '「白藏」不言不知秋', '「哈尼娅」某传奇乐队', '「安魂曲」番茄酱暴走实录'] },
  { code: 'E', name: '都市玩法', kind: 'normal', products: ['都市活力', '轨外之境', '粉爪大劫案', '粉爪大劫案（粉爪币）', '排球之星', '排球之星（周常联赛）', '即刻落槌', '车队比赛', '格斗俱乐部', '徊影憧憧'] },
  { code: 'F', name: '九百九十九夜', kind: 'normal', products: ['套餐1', '套餐2', '套餐3', '升级', '清空商店'] },
  { code: 'G', name: '版本活动', kind: 'normal', products: ['黑暗赛车界（1.1）', '十三日梦醒（1.1）', '争锋赏宴（1.1）', '争锋赏宴（1.3）', '轨外回响（1.3）'] },
  { code: 'H', name: '其它', kind: 'normal', products: ['账号升级', '账号开荒', '锄大地'] },
  { code: '托', name: '托管', kind: 'custody', products: ['普托', '全托'] },
]

export type CatalogSlice = {
  games: Game[]
  categories: CatalogCategory[]
  products: CatalogProduct[]
  servers: ServerEntry[]
}

export function seedCatalog(gameId = DEFAULT_GAME_ID): CatalogSlice {
  const games: Game[] = [
    { id: gameId, name: DEFAULT_GAME_NAME, orderPrefix: DEFAULT_PREFIX, sort: 0 },
  ]
  const servers: ServerEntry[] = [
    { id: `${gameId}-official`, gameId, name: '官服', enabled: true },
    { id: `${gameId}-global`, gameId, name: '国际服', enabled: true },
    { id: `${gameId}-b`, gameId, name: 'B服', enabled: true },
  ]
  const categories: CatalogCategory[] = []
  const products: CatalogProduct[] = []
  SEED_CATS.forEach((cat, i) => {
    const id = `${gameId}-cat-${cat.code}`
    categories.push({
      id,
      gameId,
      code: cat.code,
      name: cat.name,
      kind: cat.kind,
      enabled: true,
      sort: i,
    })
    cat.products.forEach((name, j) => {
      products.push({
        id: `${id}-p-${j}`,
        categoryId: id,
        name,
        price: null,
        enabled: true,
        sort: j,
      })
    })
  })
  return { games, categories, products, servers }
}

export function sortedGames(games: Game[]): Game[] {
  return games.slice().sort((a, b) => a.sort - b.sort)
}

export function primaryGameId(games: Game[]): string {
  if (games.some((g) => g.id === DEFAULT_GAME_ID)) return DEFAULT_GAME_ID
  return sortedGames(games)[0]?.id ?? DEFAULT_GAME_ID
}

export function categoriesOf(
  categories: CatalogCategory[],
  gameId: string,
  includeDisabled = false,
): CatalogCategory[] {
  return categories
    .filter((c) => c.gameId === gameId && (includeDisabled || c.enabled))
    .sort((a, b) => a.sort - b.sort)
}

export function productsOfCategory(
  products: CatalogProduct[],
  categoryId: string,
  includeDisabled = false,
): CatalogProduct[] {
  return products
    .filter((p) => p.categoryId === categoryId && (includeDisabled || p.enabled))
    .sort((a, b) => a.sort - b.sort)
}

export function serversOf(
  servers: ServerEntry[],
  gameId: string,
  includeDisabled = false,
): ServerEntry[] {
  return servers.filter((s) => s.gameId === gameId && (includeDisabled || s.enabled))
}

/** 按订单类型筛分类（普通 / 托管） */
export function categoriesForOrderType(
  categories: CatalogCategory[],
  gameId: string,
  type: '普通' | '托管',
): CatalogCategory[] {
  return categoriesOf(categories, gameId).filter((c) =>
    type === '托管' ? c.kind === 'custody' : c.kind === 'normal',
  )
}

export function cleanPrefix(raw: string | null | undefined, fallback = DEFAULT_PREFIX): string {
  const text = String(raw ?? '')
    .replace(/[^A-Za-z0-9]/g, '')
    .slice(0, 8)
  return text || fallback
}

function cleanPrice(price: number | null | undefined): number | null {
  if (price == null || !Number.isFinite(price)) return null
  if (price < 0) throw new Error('价格不能为负数')
  return Math.round(price * 100) / 100
}

export function addGame(
  slice: CatalogSlice,
  name: string,
  prefix: string,
): { slice: CatalogSlice; gameId: string } {
  const label = name.trim()
  if (!label) throw new Error('请填写游戏名称')
  if (slice.games.some((g) => g.name === label)) throw new Error(`已有游戏「${label}」`)
  const gameId = crypto.randomUUID()
  const sort = slice.games.reduce((m, g) => Math.max(m, g.sort), -1) + 1
  return {
    gameId,
    slice: {
      ...slice,
      games: [...slice.games, { id: gameId, name: label, orderPrefix: cleanPrefix(prefix), sort }],
      servers: [
        ...slice.servers,
        { id: crypto.randomUUID(), gameId, name: '官服', enabled: true },
      ],
    },
  }
}

export function updateGame(
  slice: CatalogSlice,
  gameId: string,
  patch: { name?: string; orderPrefix?: string },
): CatalogSlice {
  const game = slice.games.find((g) => g.id === gameId)
  if (!game) return slice
  const name = patch.name === undefined ? game.name : patch.name.trim() || game.name
  if (name !== game.name && slice.games.some((g) => g.id !== gameId && g.name === name)) {
    throw new Error(`已有游戏「${name}」`)
  }
  const orderPrefix =
    patch.orderPrefix === undefined ? game.orderPrefix : cleanPrefix(patch.orderPrefix)
  return {
    ...slice,
    games: slice.games.map((g) => (g.id === gameId ? { ...g, name, orderPrefix } : g)),
  }
}

export function removeGame(slice: CatalogSlice, gameId: string): CatalogSlice {
  if (slice.games.length <= 1) throw new Error('至少保留一个游戏')
  const catIds = new Set(slice.categories.filter((c) => c.gameId === gameId).map((c) => c.id))
  return {
    games: slice.games.filter((g) => g.id !== gameId),
    categories: slice.categories.filter((c) => c.gameId !== gameId),
    products: slice.products.filter((p) => !catIds.has(p.categoryId)),
    servers: slice.servers.filter((s) => s.gameId !== gameId),
  }
}

export function addCategory(
  slice: CatalogSlice,
  gameId: string,
  name: string,
  kind: CatalogKind,
): CatalogSlice {
  const label = name.trim()
  if (!label) throw new Error('请填写分类名称')
  const siblings = slice.categories.filter((c) => c.gameId === gameId)
  if (siblings.some((c) => c.name === label)) throw new Error(`已有分类「${label}」`)
  return {
    ...slice,
    categories: [
      ...slice.categories,
      {
        id: crypto.randomUUID(),
        gameId,
        code: kind === 'custody' ? '托' : '新',
        name: label,
        kind,
        enabled: true,
        sort: siblings.reduce((m, c) => Math.max(m, c.sort), -1) + 1,
      },
    ],
  }
}

export function updateCategory(
  slice: CatalogSlice,
  categoryId: string,
  patch: { name?: string; enabled?: boolean },
): CatalogSlice {
  const current = slice.categories.find((c) => c.id === categoryId)
  if (!current) return slice
  const name = patch.name === undefined ? current.name : patch.name.trim() || current.name
  if (
    name !== current.name &&
    slice.categories.some(
      (c) => c.gameId === current.gameId && c.id !== categoryId && c.name === name,
    )
  ) {
    throw new Error(`已有分类「${name}」`)
  }
  const enabled = patch.enabled ?? current.enabled
  return {
    ...slice,
    categories: slice.categories.map((c) =>
      c.id === categoryId ? { ...c, name, enabled } : c,
    ),
  }
}

export function removeCategory(slice: CatalogSlice, categoryId: string): CatalogSlice {
  return {
    ...slice,
    categories: slice.categories.filter((c) => c.id !== categoryId),
    products: slice.products.filter((p) => p.categoryId !== categoryId),
  }
}

export function addProduct(
  slice: CatalogSlice,
  categoryId: string,
  name: string,
  price: number | null = null,
): CatalogSlice {
  const label = name.trim()
  if (!label) throw new Error('请填写项目名称')
  if (!slice.categories.some((c) => c.id === categoryId)) throw new Error('分类不存在')
  const siblings = slice.products.filter((p) => p.categoryId === categoryId)
  if (siblings.some((p) => p.name === label)) throw new Error(`该分类已有「${label}」`)
  return {
    ...slice,
    products: [
      ...slice.products,
      {
        id: crypto.randomUUID(),
        categoryId,
        name: label,
        price: cleanPrice(price),
        enabled: true,
        sort: siblings.reduce((m, p) => Math.max(m, p.sort), -1) + 1,
      },
    ],
  }
}

export function updateProduct(
  slice: CatalogSlice,
  productId: string,
  patch: { name?: string; price?: number | null; enabled?: boolean },
): CatalogSlice {
  const current = slice.products.find((p) => p.id === productId)
  if (!current) return slice
  const name = patch.name === undefined ? current.name : patch.name.trim() || current.name
  if (
    name !== current.name &&
    slice.products.some(
      (p) => p.categoryId === current.categoryId && p.id !== productId && p.name === name,
    )
  ) {
    throw new Error(`该分类已有「${name}」`)
  }
  const price = patch.price === undefined ? current.price ?? null : cleanPrice(patch.price)
  const enabled = patch.enabled ?? current.enabled
  return {
    ...slice,
    products: slice.products.map((p) =>
      p.id === productId ? { ...p, name, price, enabled } : p,
    ),
  }
}

export function removeProduct(slice: CatalogSlice, productId: string): CatalogSlice {
  return {
    ...slice,
    products: slice.products.filter((p) => p.id !== productId),
  }
}

/** @deprecated 兼容旧 import；请用 seed / store */
export const SERVERS = ['官服', '国际服', 'B服']

/* ---- 服务器增删改 ---- */

export function addServer(slice: CatalogSlice, gameId: string, name: string): CatalogSlice {
  const label = name.trim()
  if (!label) throw new Error('请填写服务器名称')
  if (!slice.games.some((g) => g.id === gameId)) throw new Error('游戏不存在')
  if (slice.servers.some((s) => s.gameId === gameId && s.name === label)) {
    throw new Error(`已有服务器「${label}」`)
  }
  return {
    ...slice,
    servers: [
      ...slice.servers,
      { id: crypto.randomUUID(), gameId, name: label, enabled: true },
    ],
  }
}

export function updateServer(
  slice: CatalogSlice,
  serverId: string,
  patch: { name?: string; enabled?: boolean },
): CatalogSlice {
  const current = slice.servers.find((s) => s.id === serverId)
  if (!current) return slice
  const name = patch.name === undefined ? current.name : patch.name.trim() || current.name
  if (
    name !== current.name &&
    slice.servers.some(
      (s) => s.gameId === current.gameId && s.id !== serverId && s.name === name,
    )
  ) {
    throw new Error(`已有服务器「${name}」`)
  }
  const enabled = patch.enabled ?? current.enabled
  return {
    ...slice,
    servers: slice.servers.map((s) =>
      s.id === serverId ? { ...s, name, enabled } : s,
    ),
  }
}

export function removeServer(slice: CatalogSlice, serverId: string): CatalogSlice {
  return {
    ...slice,
    servers: slice.servers.filter((s) => s.id !== serverId),
  }
}
