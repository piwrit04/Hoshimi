/**
 * 《异环》代肝项目目录 —— 照搬 Cheezit/src/domain/catalog-seed.ts。
 *
 * 分类 + 项目名。录单时从这里选项目；选完项目名作为文本存进订单，
 * 以后改分类不影响旧单。
 *
 * 注意：这里没有默认价（Cheezit 的种子也没有），默认价要在「项目管理」里单独配。
 * 第一版录单时金额手填。
 */

export type CatalogProduct = {
  name: string
  category: string
}

export type CatalogCategory = {
  code: string
  name: string
  kind: 'normal' | 'custody'
  products: string[]
}

export const CATALOG: CatalogCategory[] = [
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

/** 拍平成下拉选项用的列表：label 带分类前缀，方便搜索 */
export const ALL_PRODUCTS: CatalogProduct[] = CATALOG.flatMap((cat) =>
  cat.products.map((name) => ({ name, category: cat.name }))
)

/** 服务器（《异环》） */
export const SERVERS = ['官服', '国际服', 'B服']

/**
 * 按订单类型取分类。
 * 普通单 → 全部分类（A–H）；托管单 → 只有「托管」那一类。
 */
export function categoriesForOrderType(type: '普通' | '托管'): CatalogCategory[] {
  return CATALOG.filter((c) =>
    type === '托管' ? c.kind === 'custody' : c.kind === 'normal'
  )
}

/** 某个分类下的项目名列表 */
export function productsOfCategory(categoryName: string): string[] {
  return CATALOG.find((c) => c.name === categoryName)?.products ?? []
}
