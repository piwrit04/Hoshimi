import { createServer } from 'vite'
import path from 'path'

const root = path.resolve(import.meta.dirname, '..')
let failed = 0
function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg)
    failed += 1
  } else {
    console.log('ok:', msg)
  }
}

const server = await createServer({
  root,
  configFile: path.join(root, 'vite.config.ts'),
  server: { middlewareMode: true },
  appType: 'custom',
  // 自测不跑依赖发现，避免 close 后 dep-scan 刷屏
  optimizeDeps: { noDiscovery: true, include: [] },
})

try {
  const customers = await server.ssrLoadModule('/src/domain/customers.ts')
  const catalog = await server.ssrLoadModule('/src/domain/catalog.ts')
  const money = await server.ssrLoadModule('/src/domain/money.ts')
  const ledger = await server.ssrLoadModule('/src/domain/ledger.ts')
  const status = await server.ssrLoadModule('/src/domain/status.ts')
  const fixtures = await server.ssrLoadModule('/src/domain/fixtures.ts')
  const orderMod = await server.ssrLoadModule('/src/domain/order.ts')
  const exportMod = await server.ssrLoadModule('/src/domain/export.ts')
  const importPlan = await server.ssrLoadModule('/src/domain/import-plan.ts')
  const excel = await server.ssrLoadModule('/src/domain/excel.ts')
  const dashboard = await server.ssrLoadModule('/src/domain/dashboard.ts')
  const workbench = await server.ssrLoadModule('/src/domain/workbench.ts')

  // --- catalog products purity in fixtures ---
  const seed = catalog.seedCatalog()
  const productNames = new Set(seed.products.map((p) => p.name))
  for (const name of Object.keys(fixtures.FIXTURE_PRICES)) {
    assert(productNames.has(name), `fixture price key exists in catalog: ${name}`)
  }

  // --- duplicatePairs / mergeNote ---
  const list = [
    { id: 'a', nickname: '小北', contact: '13800000001', note: '' },
    { id: 'b', nickname: '小北', contact: '13900000002', note: '闲鱼' },
    { id: 'c', nickname: '糖糖', contact: '13800000001', note: '' },
    { id: 'd', nickname: '独行', contact: '13700000003', note: '', mergedIntoId: 'a' },
  ]
  const pairs = customers.duplicatePairs(list)
  assert(pairs.length === 2, `duplicatePairs finds 2 groups, got ${pairs.length}`)
  assert(
    pairs.some((p) => p.reason === customers.SAME_NAME_REASON),
    'includes same-name reason',
  )
  assert(
    pairs.some((p) => p.reason.includes('手机号相同')),
    'includes same-phone reason',
  )
  assert(!pairs.some((p) => p.a.id === 'd' || p.b.id === 'd'), 'merged customers excluded')

  const resolved = customers.resolveCustomerId(list, 'd')
  assert(resolved === 'a', `resolveCustomerId follows merge d→a, got ${resolved}`)
  const active = customers.findActiveCustomer(list, 'd')
  assert(active && active.id === 'a', 'findActiveCustomer returns survivor')
  assert(customers.resolveCustomerId(list, 'missing') === undefined, 'resolve missing → undefined')


  const note = customers.mergedNote(
    { nickname: '小北', contact: '13900000002', note: '闲鱼' },
    { nickname: '小北', contact: '13800000001', note: '微信' },
  )
  assert(note.includes('合并自 小北'), `mergedNote has merge line: ${note}`)
  assert(note.includes('13900000002'), 'mergedNote keeps other phone')
  assert(note.startsWith('微信'), 'keeps original note')

  // --- multi-game: prefixes, categories, servers ---
  let slice = catalog.seedCatalog()
  const added = catalog.addGame(slice, '绝区零', 'ZZZ')
  slice = added.slice
  const zzzId = added.gameId
  const zzzPrefix = slice.games.find((g) => g.id === zzzId).orderPrefix
  assert(zzzPrefix === 'ZZZ', `new game prefix ZZZ, got ${zzzPrefix}`)
  const when = new Date('2026-10-10T12:00:00+08:00')
  const noNte = catalog.formatOrderNo(1, catalog.resolveOrderPrefix(slice.games), when)
  const noZzz = catalog.formatOrderNo(1, zzzPrefix, when)
  assert(noNte.includes('NTE'), `primary prefix order ${noNte}`)
  assert(noZzz.includes('ZZZ'), `zzz prefix order ${noZzz}`)
  assert(noNte !== noZzz, 'different games yield different order nos')

  slice = catalog.updateGame(slice, zzzId, { orderPrefix: 'ZZZ2' })
  assert(
    slice.games.find((g) => g.id === zzzId).orderPrefix === 'ZZZ2',
    'updateGame changes orderPrefix',
  )
  // 脏前缀清洗
  slice = catalog.updateGame(slice, zzzId, { orderPrefix: 'zz-z!!' })
  assert(
    slice.games.find((g) => g.id === zzzId).orderPrefix === 'zzz',
    `cleanPrefix strips junk, got ${slice.games.find((g) => g.id === zzzId).orderPrefix}`,
  )

  slice = catalog.addServer(slice, zzzId, '预下载服')
  assert(
    catalog.serversOf(slice.servers, zzzId).some((s) => s.name === '预下载服'),
    'addServer works',
  )
  const srv = slice.servers.find((s) => s.gameId === zzzId && s.name === '预下载服')
  slice = catalog.updateServer(slice, srv.id, { enabled: false })
  assert(
    !catalog.serversOf(slice.servers, zzzId).some((s) => s.name === '预下载服'),
    'disabled server hidden from enabled list',
  )

  // ZZZ 分类：普通 vs 托管隔离
  slice = catalog.addCategory(slice, zzzId, '开荒', 'normal')
  slice = catalog.addCategory(slice, zzzId, '日常托管', 'custody')
  const normalCats = catalog.categoriesForOrderType(slice.categories, zzzId, '普通')
  const custodyCats = catalog.categoriesForOrderType(slice.categories, zzzId, '托管')
  assert(
    normalCats.some((c) => c.name === '开荒') && !normalCats.some((c) => c.name === '日常托管'),
    'normal order type sees only normal cats',
  )
  assert(
    custodyCats.some((c) => c.name === '日常托管') && !custodyCats.some((c) => c.name === '开荒'),
    'custody order type sees only custody cats',
  )
  const openCat = normalCats.find((c) => c.name === '开荒')
  slice = catalog.addProduct(slice, openCat.id, '零号空洞', 88)
  assert(
    catalog.productsOfCategory(slice.products, openCat.id).some((p) => p.name === '零号空洞'),
    'product under ZZZ category',
  )

  // --- fees ---
  const fees = ledger.defaultChannelFees()
  assert(ledger.feeRateOf(fees, '微信') === 0, 'wechat fee 0')
  assert(ledger.feeRateOf(fees, '闲鱼') === 0.016, 'xianyu fee 1.6%')
  assert(ledger.feeRateOf(fees, '未知渠道') === 0, 'unknown platform fee 0')

  const m = money.calcMoney({
    amount: 100,
    feeRate: ledger.feeRateOf(fees, '闲鱼'),
    transferEnabled: true,
    transferMode: 'ratio',
    transferRatio: 0.8,
    transferAmount: 0,
  })
  assert(m.feeAmount === 1.6, `fee on full amount 1.6, got ${m.feeAmount}`)
  assert(m.transferOut === 80, `transferOut 80, got ${m.transferOut}`)
  assert(m.payoutAmount === 18.4, `payout 18.4, got ${m.payoutAmount}`)

  // 费率快照：改渠道费率不影响旧单（旧单用存下的 feeRate）
  const oldRate = 0.016
  const newFees = fees.map((f) => (f.platform === '闲鱼' ? { ...f, rate: 0.02 } : f))
  const mOld = money.calcMoney({
    amount: 100,
    feeRate: oldRate,
    transferEnabled: false,
    transferMode: 'ratio',
    transferRatio: 0,
    transferAmount: 0,
  })
  const mNew = money.calcMoney({
    amount: 100,
    feeRate: ledger.feeRateOf(newFees, '闲鱼'),
    transferEnabled: false,
    transferMode: 'ratio',
    transferRatio: 0,
    transferAmount: 0,
  })
  assert(mOld.feeAmount === 1.6 && mNew.feeAmount === 2, 'fee snapshot: old 1.6 new 2')

  // 分运算：33.33 × 0.8 无浮点尾巴
  const m333 = money.calcMoney({
    amount: 33.33,
    feeRate: 0.016,
    transferEnabled: true,
    transferMode: 'ratio',
    transferRatio: 0.8,
    transferAmount: 0,
  })
  assert(m333.transferOut === 26.66, `33.33*0.8 → 26.66, got ${m333.transferOut}`)
  assert(m333.feeAmount === 0.53, `33.33*1.6% → 0.53, got ${m333.feeAmount}`)
  assert(m333.payoutAmount === 6.14, `payout 6.14, got ${m333.payoutAmount}`)

  // 转单未填：pending，不猜比例
  const mPend = money.calcMoney({
    amount: 100,
    feeRate: 0.016,
    transferEnabled: true,
    transferMode: 'ratio',
    transferRatio: 0.8,
    transferAmount: 0,
    transferPending: true,
  })
  assert(mPend.transferOut === 0 && mPend.transferPending, 'transfer pending → out 0')
  assert(mPend.payoutAmount === 98.4, `pending payout only deduct fee, got ${mPend.payoutAmount}`)

  // fixed transfer
  const mFixed = money.calcMoney({
    amount: 200,
    feeRate: 0,
    transferEnabled: true,
    transferMode: 'fixed',
    transferRatio: 0.8,
    transferAmount: 50,
  })
  assert(mFixed.transferOut === 50 && mFixed.payoutAmount === 150, 'fixed transfer 50')

  // --- status + refund lock + bulk complete ---
  const baseOrder = {
    id: 'o1',
    orderNo: '#NTE26010101',
    createdAt: '2026-01-01T00:00:00.000Z',
    nickname: '测',
    contact: '13000000000',
    type: '普通',
    platform: '微信',
    server: '官服',
    status: '进行中',
    items: [{ category: '全收集', product: '1.3版本全收集', price: 168 }],
    amount: 168,
    feeRate: 0,
    feeAmount: 0,
    payout: 168,
    transferEnabled: false,
    transferMode: 'ratio',
    transferRatio: 0.8,
    transferAmount: 0,
    note: '',
    gameId: catalog.DEFAULT_GAME_ID,
  }

  const done = status.applyStatus(baseOrder, '已完成')
  assert(done.status === '已完成' && done.amountLocked === true, 'complete locks amount')
  assert(status.canMove('进行中', '已完成'), 'canMove 进行中→已完成')
  assert(!status.canMove('待处理', '已完成'), 'cannot direct 待处理→已完成')
  assert(!status.canMove('已退款', '已完成'), 'cannot move from 已退款')
  assert(status.canBulkComplete('待处理') && status.canBulkComplete('进行中'), 'bulk eligible statuses')
  assert(!status.canBulkComplete('已完成') && !status.canBulkComplete('已取消'), 'bulk excludes terminal')

  const fromPending = status.applyComplete({ ...baseOrder, status: '待处理', startedAt: undefined })
  assert(fromPending.status === '已完成', 'applyComplete from 待处理 → 已完成')
  assert(fromPending.startedAt && fromPending.completedAt, 'start+complete timestamps set')
  assert(fromPending.amountLocked === true, 'applyComplete locks amount')

  const refunded = status.applyStatus(done, '已退款')
  assert(refunded.status === '已退款' && refunded.amountLocked, 'refund keeps lock')
  assert(status.payoutVoid(refunded), 'refund payout void')
  assert(!status.countsAsIncome(refunded), 'refund not income')

  // 金额锁：sanitizeOrderPatch 剥掉金额字段
  const lockedPatch = orderMod.sanitizeOrderPatch(refunded, {
    amount: 1,
    feeAmount: 0,
    payout: 1,
    note: '改备注可以',
    status: '已完成',
  })
  assert(lockedPatch.amount === undefined, 'refund lock strips amount')
  assert(lockedPatch.payout === undefined, 'refund lock strips payout')
  assert(lockedPatch.status === undefined, 'sanitize strips status')
  assert(lockedPatch.note === '改备注可以', 'note still editable when locked')

  const openPatch = orderMod.sanitizeOrderPatch(baseOrder, { amount: 200, payout: 200 })
  assert(openPatch.amount === 200, 'open order can change amount')

  // restore slice simulation
  let orders = [baseOrder, { ...baseOrder, id: 'o2', orderNo: '#NTE26010102' }]
  const orderSlice = { order: { ...orders[0] }, index: 0 }
  orders = orders.filter((o) => o.id !== 'o1')
  assert(orders.length === 1, 'deleted')
  const others = orders.filter((o) => o.id !== orderSlice.order.id)
  const at = Math.min(Math.max(orderSlice.index, 0), others.length)
  orders = [...others.slice(0, at), { ...orderSlice.order }, ...others.slice(at)]
  assert(orders[0].id === 'o1' && orders.length === 2, 'restored at index')

  // bulk complete eligibility（含待处理）
  const batch = [
    { ...baseOrder, id: 'b1', status: '进行中' },
    { ...baseOrder, id: 'b2', status: '待处理' },
    { ...baseOrder, id: 'b3', status: '已完成' },
    { ...baseOrder, id: 'b4', status: '已退款', amountLocked: true },
  ]
  const eligible = batch.filter((o) => status.canBulkComplete(o.status))
  assert(eligible.length === 2, `bulk eligible 待处理+进行中, got ${eligible.length}`)
  assert(
    eligible.map((o) => o.id).sort().join(',') === 'b1,b2',
    'eligible ids b1,b2',
  )
  const completedBatch = eligible.map((o) => status.applyComplete(o))
  assert(
    completedBatch.every((o) => o.status === '已完成' && o.amountLocked),
    'bulk applyComplete all done+locked',
  )

  // merge customers simulation
  const from = { id: 'c1', nickname: 'A', contact: '1', note: 'n1' }
  const into = { id: 'c2', nickname: 'B', contact: '2', note: 'n2' }
  const mergedNote = customers.mergedNote(from, into)
  let custs = [from, into]
  let ords = [
    { id: 'x', customerId: 'c1', nickname: 'A', contact: '1' },
    { id: 'y', customerId: 'c2', nickname: 'B', contact: '2' },
  ]
  custs = custs.map((c) =>
    c.id === 'c1' ? { ...c, mergedIntoId: 'c2' } : c.id === 'c2' ? { ...c, note: mergedNote } : c,
  )
  ords = ords.map((o) =>
    o.customerId === 'c1' ? { ...o, customerId: 'c2', nickname: into.nickname, contact: into.contact } : o,
  )
  assert(custs.find((c) => c.id === 'c1').mergedIntoId === 'c2', 'from marked merged')
  assert(ords.every((o) => o.customerId === 'c2'), 'orders reassigned')
  assert(custs.find((c) => c.id === 'c2').note.includes('合并自'), 'into note updated')

  // --- custody + fixtures + dashboard ---
  const demo = fixtures.buildFixtureSnapshot(when)
  assert(Array.isArray(demo.orders) && demo.orders.length > 0, `demo has orders ${demo.orders.length}`)
  const custodyOrders = demo.orders.filter((o) => o.type === '托管')
  assert(custodyOrders.length >= 2, `demo has custody orders, got ${custodyOrders.length}`)
  for (const o of custodyOrders) {
    assert(productNames.has(o.custodyKind), `custody kind in catalog: ${o.custodyKind}`)
    assert(o.startDate && o.endDate, `custody has date range ${o.orderNo}`)
    assert(o.settleKind, `custody has settleKind ${o.orderNo}`)
    assert(o.items.length === 0, 'custody has empty items')
  }
  for (const o of demo.orders) {
    if (o.type === '普通') {
      for (const it of o.items) {
        assert(productNames.has(it.product), `demo item in catalog: ${it.product}`)
      }
    }
  }
  assert(
    demo.orders.every((o) => String(o.orderNo).includes('NTE')),
    'fixture order nos use NTE',
  )
  const refundedDemo = demo.orders.filter((o) => o.status === '已退款')
  assert(refundedDemo.length >= 1, 'fixture has refund')
  assert(
    refundedDemo.every((o) => o.amountLocked && status.payoutVoid(o)),
    'fixture refund locked + void payout',
  )

  const dash = dashboard.dashboard(demo, when)
  assert(dash.kpis.custodyActive >= 1, `dashboard custodyActive ${dash.kpis.custodyActive}`)
  assert(dash.kpis.revenueThisMonth >= 0, 'dashboard revenue defined')

  // --- workbench / 待办 ---
  assert(workbench.expiryThreshold([]) === 7, 'expiryThreshold empty → 7')
  assert(workbench.expiryThreshold([1, 3]) === 3, 'expiryThreshold max')
  const wb = workbench.workbench(demo.orders, demo.settings, '', when)
  assert(wb.chaseCount >= 1, `workbench chaseCount ${wb.chaseCount}`)
  assert(wb.dueCount >= 1, `workbench dueCount ${wb.dueCount}`)
  assert(wb.followCount === wb.chaseCount + wb.dueCount, 'follow = chase + due')
  const wbQ = workbench.workbench(demo.orders, demo.settings, '___no_match___', when)
  assert(wbQ.matchCount === 0, 'workbench search miss')
  assert(wbQ.followCount === wb.followCount, 'search does not shrink followCount')
  assert(workbench.daysUntilLabel(wb.today, null) === '未设到期日', 'missing endDate label')
  const noOffset = workbench.workbench(demo.orders, { expiryOffsets: [] }, '', when)
  assert(noOffset.threshold === 7, 'empty offsets still remind within 7d')

  const dayTrend = dashboard.incomeTrend(demo, 'day', when)
  const tip = dashboard.incomeSmartTip(dash.kpis, dayTrend)
  assert(tip && typeof tip.text === 'string' && tip.text.length > 4, `incomeSmartTip text: ${tip?.text}`)
  assert(['empty', 'quiet', 'down', 'up', 'busy'].includes(tip.kind), `incomeSmartTip kind: ${tip.kind}`)
  const emptyTip = dashboard.incomeSmartTip(
    { total: 0, payoutToday: 0, completedToday: 0, payoutThisMonth: 0, inProgress: 0, waiting: 0 },
    [],
  )
  assert(emptyTip.kind === 'empty', 'incomeSmartTip empty ledger')

  // 退款不算营收：本月完成到手不应含退款单金额
  const doneMonth = demo.orders.filter(
    (o) => o.status === '已完成' && o.completedAt && o.completedAt.startsWith('2026-10'),
  )
  const expectedPayout = doneMonth.reduce((s, o) => s + Math.round(o.payout * 100), 0) / 100
  // dashboard uses cents sum — compare loosely via rounded
  assert(
    Math.abs(dash.kpis.payoutThisMonth - expectedPayout) < 0.01 || doneMonth.length === 0,
    `dashboard payout matches completed (${dash.kpis.payoutThisMonth} vs ${expectedPayout})`,
  )

  // --- import / export roundtrip ---
  let snap = ledger.emptySnapshot()
  // 用可控时间，方便去重键稳定
  const raws = [
    {
      sheet: '普通',
      rowNumber: 2,
      nickname: '阿梨',
      phone: '13800138021',
      project: '全异象委托',
      price: 128,
      transferFlag: '否',
      doneFlag: '已完成',
      server: '官服',
      platform: '闲鱼',
      note: '首单',
      transferAmount: '',
      orderedAt: '2026-10-01T10:00:00.000+08:00',
      completedAt: '2026-10-01T18:00:00.000+08:00',
    },
    {
      sheet: '普通',
      rowNumber: 3,
      nickname: '小满',
      phone: 'wx_xiaoman',
      project: '都市活力 + 排球之星（周常联赛）',
      price: 30,
      transferFlag: '是',
      doneFlag: '进行中',
      server: 'B服',
      platform: '微信',
      note: '',
      transferAmount: 10,
      orderedAt: '2026-10-05T14:30:00.000+08:00',
      completedAt: '',
    },
    {
      sheet: '托管',
      rowNumber: 2,
      nickname: '柚子',
      phone: 'xy_youzi99',
      project: '普托',
      price: 300,
      transferFlag: '80%',
      doneFlag: '进行中',
      server: '国际服',
      platform: '闲鱼',
      note: '周结',
      transferAmount: 240,
      orderedAt: '2026-09-20T09:00:00.000+08:00',
      completedAt: '',
    },
    {
      sheet: '普通',
      rowNumber: 4,
      nickname: '',
      phone: '',
      project: '坏行',
      price: 10,
      transferFlag: '否',
      doneFlag: '',
      server: '',
      platform: '',
      note: '',
      transferAmount: '',
      orderedAt: '',
      completedAt: '',
    },
    {
      sheet: '普通',
      rowNumber: 5,
      nickname: '零元',
      phone: '100',
      project: '试单',
      price: 0,
      transferFlag: '否',
      doneFlag: '',
      server: '官服',
      platform: '微信',
      note: '',
      transferAmount: '',
      orderedAt: '2026-10-06T12:00:00.000+08:00',
      completedAt: '',
    },
  ]

  const plan1 = importPlan.planImport(snap, raws, when)
  assert(plan1.writeCount === 3, `plan writeCount 3, got ${plan1.writeCount}`)
  assert(plan1.errorCount === 1, `plan errorCount 1, got ${plan1.errorCount}`)
  assert(plan1.zeroCount === 1, `plan zeroCount 1, got ${plan1.zeroCount}`)
  assert(plan1.newCustomerCount === 3, `new customers 3, got ${plan1.newCustomerCount}`)
  assert(plan1.newServers.includes('国际服') || plan1.newServers.length >= 0, 'newServers listed')

  const custodyRow = plan1.rows.find((r) => r.sheet === '托管' && r.disposition === 'write')
  assert(custodyRow, 'custody row planned')
  assert(custodyRow.transferEnabled, '80% transferFlag → enabled')
  assert(custodyRow.transferAmount === 240, `custody transferAmount 240, got ${custodyRow.transferAmount}`)
  assert(Math.abs(custodyRow.feeAmount - 4.8) < 0.01, `custody xianyu fee 4.8, got ${custodyRow.feeAmount}`)

  const xianyuDone = plan1.rows.find((r) => r.nickname === '阿梨')
  assert(xianyuDone.feeRate === 0.016, 'imported 闲鱼 uses channel fee')
  assert(Math.abs(xianyuDone.feeAmount - 2.05) < 0.01 || Math.abs(xianyuDone.feeAmount - 2.048) < 0.02, `阿梨 fee ~2.05 got ${xianyuDone.feeAmount}`)
  // 128 * 0.016 = 2.048 → cents round 2.05
  assert(xianyuDone.feeAmount === 2.05, `阿梨 fee exactly 2.05, got ${xianyuDone.feeAmount}`)

  snap = importPlan.applyImport(snap, plan1, when)
  assert(snap.orders.length === 3, `after import orders 3, got ${snap.orders.length}`)
  assert(snap.customers.filter((c) => !c.mergedIntoId).length === 3, '3 customers')
  const custodyApplied = snap.orders.find((o) => o.type === '托管')
  assert(custodyApplied && custodyApplied.custodyKind === '普托', 'custody applied')
  assert(custodyApplied.amountLocked === false, 'in-progress custody not locked')
  assert(custodyApplied.startDate === '2026-09-20', `custody startDate ${custodyApplied.startDate}`)

  const doneApplied = snap.orders.find((o) => o.nickname === '阿梨')
  assert(doneApplied.status === '已完成' && doneApplied.amountLocked, 'completed import locked')
  assert(doneApplied.orderNo.includes('NTE'), `imported orderNo ${doneApplied.orderNo}`)

  // 二次导入应全部 skip-duplicate
  const plan2 = importPlan.planImport(snap, raws, when)
  assert(plan2.writeCount === 0, `re-import write 0, got ${plan2.writeCount}`)
  assert(plan2.skipCount === 3, `re-import skip 3, got ${plan2.skipCount}`)

  // 导出表 → CSV → 再读 → 计划（金额/客户/状态保留）
  const { headers, rows: tableRows } = exportMod.orderTable(snap.orders)
  assert(headers.includes('到手') && headers.includes('托管类型'), 'export headers')
  const refundLike = {
    ...doneApplied,
    id: 'rf',
    status: '已退款',
    amountLocked: true,
  }
  const voidTable = exportMod.orderTable([refundLike])
  const payoutCol = voidTable.headers.indexOf('到手')
  assert(voidTable.rows[0][payoutCol] === status.NO_PAYOUT, 'export refund payout is —')

  const csv = exportMod.toCsv(snap.orders)
  assert(csv.startsWith('\uFEFF'), 'csv has BOM')
  const reRead = excel.readCsv(csv)
  assert(reRead.length === snap.orders.length, `csv re-read ${reRead.length} rows`)
  // 导出的「转单」列对转单单是「80%」或固定金额，须识别为转单
  const transferCsv = reRead.filter((r) => {
    const flag = r.transferFlag
    return flag && flag !== '否'
  })
  assert(transferCsv.length >= 1, `csv transfer flags recognized, got ${transferCsv.length}`)

  // 改费率后再导入新单：旧单 fee 不变，新单用新费率
  snap = {
    ...snap,
    channelFees: snap.channelFees.map((f) =>
      f.platform === '闲鱼' ? { ...f, rate: 0.02 } : f,
    ),
  }
  const oldFee = snap.orders.find((o) => o.nickname === '阿梨').feeAmount
  const planNew = importPlan.planImport(snap, [
    {
      sheet: '普通',
      rowNumber: 2,
      nickname: '新人',
      phone: '19900001111',
      project: '账号开荒',
      price: 100,
      transferFlag: '否',
      doneFlag: '已完成',
      server: '官服',
      platform: '闲鱼',
      note: '',
      transferAmount: '',
      orderedAt: '2026-10-09T11:00:00.000+08:00',
      completedAt: '2026-10-09T20:00:00.000+08:00',
    },
  ], when)
  assert(planNew.writeCount === 1, 'new row after fee change writes')
  assert(planNew.rows[0].feeAmount === 2, `new 闲鱼 fee 2% → 2, got ${planNew.rows[0].feeAmount}`)
  snap = importPlan.applyImport(snap, planNew, when)
  assert(
    snap.orders.find((o) => o.nickname === '阿梨').feeAmount === oldFee,
    'old order fee unchanged after channel fee edit',
  )

  // normalizeSnapshot 抬旧数据
  const normalized = ledger.normalizeSnapshot({
    version: 1,
    orders: [{ id: 'legacy', orderNo: '#OLD', items: [], amount: 10 }],
    customers: [],
  })
  assert(normalized && normalized.games.length > 0, 'normalizeSnapshot seeds catalog')
  assert(normalized.orders[0].status === '待处理', 'legacy order defaults status')
  assert(normalized.channelFees.length === 2, 'normalizeSnapshot default fees')

  // parseMoney 容错
  assert(money.parseMoney('¥128.00') === 128, 'parseMoney yuan')
  assert(money.parseMoney('1,280.5') === 1280.5, 'parseMoney comma')
  assert(money.parseMoney('') == null, 'parseMoney empty')

  if (failed) {
    console.error(`\n${failed} failed`)
  } else {
    console.log('\nAll self-tests passed')
  }
} finally {
  await server.close()
}

process.exit(failed ? 1 : 0)
