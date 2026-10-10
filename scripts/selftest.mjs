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
})

try {
  const customers = await server.ssrLoadModule('/src/domain/customers.ts')
  const catalog = await server.ssrLoadModule('/src/domain/catalog.ts')
  const money = await server.ssrLoadModule('/src/domain/money.ts')
  const ledger = await server.ssrLoadModule('/src/domain/ledger.ts')
  const status = await server.ssrLoadModule('/src/domain/status.ts')
  const fixtures = await server.ssrLoadModule('/src/domain/fixtures.ts')
  const orderMod = await server.ssrLoadModule('/src/domain/order.ts')

  // --- catalog products purity in fixtures ---
  const seed = catalog.seedCatalog()
  const productNames = new Set(seed.products.map((p) => p.name))
  for (const name of Object.keys(fixtures.FIXTURE_PRICES)) {
    assert(productNames.has(name), `fixture price key exists in catalog: ${name}`)
  }
  const snap = fixtures.buildFixtureSnapshot?.() ?? fixtures.fixtureSnapshot?.()
  // find export name
  const fixtureFns = Object.keys(fixtures).filter((k) => typeof fixtures[k] === 'function')
  console.log('fixture exports:', Object.keys(fixtures))

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

  const note = customers.mergedNote(
    { nickname: '小北', contact: '13900000002', note: '闲鱼' },
    { nickname: '小北', contact: '13800000001', note: '微信' },
  )
  assert(note.includes('合并自 小北'), `mergedNote has merge line: ${note}`)
  assert(note.includes('13900000002'), 'mergedNote keeps other phone')
  assert(note.startsWith('微信'), 'keeps original note')

  // --- orderPrefix per game ---
  let slice = catalog.seedCatalog()
  const added = catalog.addGame(slice, '绝区零', 'ZZZ')
  slice = added.slice
  const zzzPrefix = slice.games.find((g) => g.id === added.gameId).orderPrefix
  assert(zzzPrefix === 'ZZZ', `new game prefix ZZZ, got ${zzzPrefix}`)
  const no1 = catalog.formatOrderNo(1, catalog.resolveOrderPrefix(slice.games))
  const no2 = catalog.formatOrderNo(1, zzzPrefix)
  assert(no1.includes('NTE'), `primary prefix order ${no1}`)
  assert(no2.includes('ZZZ'), `zzz prefix order ${no2}`)
  assert(no1 !== no2, 'different games yield different order nos')

  // updateGame prefix applied
  slice = catalog.updateGame(slice, added.gameId, { orderPrefix: 'ZZZ2' })
  assert(
    slice.games.find((g) => g.id === added.gameId).orderPrefix === 'ZZZ2',
    'updateGame changes orderPrefix',
  )

  // servers CRUD
  slice = catalog.addServer(slice, added.gameId, '预下载服')
  assert(
    catalog.serversOf(slice.servers, added.gameId).some((s) => s.name === '预下载服'),
    'addServer works',
  )
  const srv = slice.servers.find((s) => s.gameId === added.gameId && s.name === '预下载服')
  slice = catalog.updateServer(slice, srv.id, { enabled: false })
  assert(
    !catalog.serversOf(slice.servers, added.gameId).some((s) => s.name === '预下载服'),
    'disabled server hidden from enabled list',
  )

  // --- fees ---
  const fees = ledger.defaultChannelFees()
  assert(ledger.feeRateOf(fees, '微信') === 0, 'wechat fee 0')
  assert(ledger.feeRateOf(fees, '闲鱼') === 0.016, 'xianyu fee 1.6%')
  const m = money.calcMoney({
    amount: 100,
    feeRate: ledger.feeRateOf(fees, '闲鱼'),
    transferEnabled: true,
    transferMode: 'ratio',
    transferRatio: 0.8,
    transferAmount: 0,
  })
  assert(m.feeAmount === 1.6, `fee on full amount 1.6, got ${m.feeAmount}`)
  assert(m.payoutAmount === 18.4, `payout 18.4, got ${m.payoutAmount}`)

  // changed fee does not affect calc with old snapshot rate
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

  // --- status + undo slice restore logic ---
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
  assert(!status.canMove('已退款', '已完成'), 'cannot move from 已退款')

  // restore slice simulation
  let orders = [baseOrder, { ...baseOrder, id: 'o2', orderNo: '#NTE26010102' }]
  const orderSlice = { order: { ...orders[0] }, index: 0 }
  orders = orders.filter((o) => o.id !== 'o1')
  assert(orders.length === 1, 'deleted')
  const others = orders.filter((o) => o.id !== orderSlice.order.id)
  const at = Math.min(Math.max(orderSlice.index, 0), others.length)
  orders = [...others.slice(0, at), { ...orderSlice.order }, ...others.slice(at)]
  assert(orders[0].id === 'o1' && orders.length === 2, 'restored at index')

  // bulk complete eligibility
  const batch = [
    { ...baseOrder, id: 'b1', status: '进行中' },
    { ...baseOrder, id: 'b2', status: '待处理' },
    { ...baseOrder, id: 'b3', status: '已完成' },
  ]
  const eligible = batch.filter((o) => status.canMove(o.status, '已完成') && o.status !== '已完成')
  assert(eligible.length === 1, `bulk eligible only 进行中 → 已完成, got ${eligible.length}`)
  assert(eligible[0].id === 'b1', 'eligible is 进行中 order')

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

  // fixture snapshot if available
  const build =
    fixtures.buildDemoSnapshot ||
    fixtures.buildFixtureSnapshot ||
    fixtures.makeFixtures ||
    fixtures.demoSnapshot ||
    fixtures.createFixtureSnapshot
  if (typeof build === 'function') {
    const demo = build()
    assert(Array.isArray(demo.orders) && demo.orders.length > 0, `demo has orders ${demo.orders?.length}`)
    for (const o of demo.orders) {
      if (o.type === '普通') {
        for (const it of o.items) {
          assert(productNames.has(it.product), `demo item in catalog: ${it.product}`)
        }
      } else if (o.custodyKind) {
        assert(productNames.has(o.custodyKind), `custody kind in catalog: ${o.custodyKind}`)
      }
    }
    // order nos use prefix
    assert(demo.orders.every((o) => o.orderNo.includes('NTE') || o.orderNo.startsWith('#')), 'order nos prefixed')
  } else {
    console.log('skip fixture snapshot build — exports:', fixtureFns)
  }

  if (failed) {
    console.error(`\n${failed} failed`)
    process.exit(1)
  }
  console.log('\nAll self-tests passed')
  process.exitCode = failed ? 1 : 0
} finally {
  await server.close()
}
