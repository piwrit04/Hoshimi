/**
 * Excel/CSV 导入计划（简化版，对齐 Cheezit 预览→确认流程）。
 * 不做异环项目别名全表；项目原文写入明细，分类标「导入」。
 */

import { formatOrderNo, resolveOrderPrefix } from '@/domain/catalog'
import { calcMoney, parseMoney, round2 } from '@/domain/money'
import type { Order, OrderStatus, Platform } from '@/domain/order'
import type { Customer, Snapshot } from '@/storage/types'

export type RawImportRow = {
  sheet: '普通' | '托管'
  rowNumber: number
  nickname: string
  phone: string
  project: string
  price: unknown
  transferFlag: string
  doneFlag: string
  server: string
  platform: string
  note: string
  transferAmount: unknown
  sheetNet?: unknown
  orderedAt: string
  completedAt: string
}

export type PlannedRow = {
  sheet: '普通' | '托管'
  rowNumber: number
  nickname: string
  phone: string
  project: string
  amount: number
  status: OrderStatus
  platform: Platform
  server: string
  transferEnabled: boolean
  transferAmount: number
  transferPending: boolean
  feeRate: number
  feeAmount: number
  payoutAmount: number
  note: string
  orderedAt: string
  completedAt: string | null
  items: { category: string; product: string }[]
  startDate: string | null
  endDate: string | null
  customerAction: 'reuse' | 'create'
  customerLabel: string
  tempCustomerId: string
  dedupeKey: string
  warnings: string[]
  disposition: 'write' | 'skip-duplicate' | 'skip-zero' | 'error'
  error: string | null
}

export type ImportPlan = {
  rows: PlannedRow[]
  newCustomerCount: number
  writeCount: number
  skipCount: number
  zeroCount: number
  errorCount: number
  newServers: string[]
  missingTimeCount: number
}

export function normPhone(value: string): string {
  return value.replace(/\.0$/, '').replace(/[^\d]/g, '')
}

function isYes(value: string): boolean {
  const s = value.trim().toLowerCase()
  return ['是', 'yes', 'true', '1', 'y', '已完成', '完成', '完单', '已完'].includes(s)
}

function isTransferYes(value: string): boolean {
  const s = value.trim().toLowerCase()
  if (!s || ['否', 'no', 'false', '0', 'n', '无', '不转'].includes(s)) return false
  return ['是', 'yes', 'true', '1', 'y', '转', '转单', '已转'].includes(s)
}

function dedupeKeyOf(
  nickname: string,
  phone: string,
  orderedAt: string,
  amount: number,
  project: string,
): string {
  const minute = orderedAt ? orderedAt.slice(0, 16) : ''
  return [nickname.trim(), normPhone(phone), minute, round2(amount).toFixed(2), project.trim()].join(
    '||',
  )
}

function feeFor(snap: Snapshot, platform: Platform): number {
  return snap.channelFees.find((f) => f.platform === platform)?.rate ?? 0
}

function mapPlatform(raw: string): { platform: Platform; assumed: boolean } {
  const s = raw.trim()
  if (/闲鱼|xy|xianyu/i.test(s)) return { platform: '闲鱼', assumed: false }
  if (/微信|wx|wechat/i.test(s)) return { platform: '微信', assumed: false }
  return { platform: '微信', assumed: true }
}

function splitProject(raw: string): string[] {
  return raw
    .split(/\s*[+＋]\s*/)
    .map((p) => p.trim())
    .filter(Boolean)
}

type CustomerRef = { id: string; nickname: string; phone: string }

export function planImport(snap: Snapshot, raws: RawImportRow[], now = new Date()): ImportPlan {
  const active = snap.customers.filter((c) => !c.mergedIntoId)
  const byPhone = new Map<string, CustomerRef>()
  const byNick = new Map<string, CustomerRef>()
  for (const c of active) {
    const phone = normPhone(c.contact ?? '')
    const ref = { id: c.id, nickname: c.nickname, phone }
    if (phone) byPhone.set(phone, ref)
    if (!byNick.has(c.nickname)) byNick.set(c.nickname, ref)
  }

  const gameId = snap.games[0]?.id
  const knownServers = new Set(
    snap.servers.filter((s) => !gameId || s.gameId === gameId).map((s) => s.name),
  )
  const existingKeys = new Set(
    snap.orders.map((o) => o.dedupeKey).filter(Boolean) as string[],
  )
  // 无 dedupeKey 的旧单：用同样规则补算，避免重复导入
  for (const o of snap.orders) {
    if (o.dedupeKey) continue
    const project = o.items.map((i) => i.product).join('+') || o.note
    existingKeys.add(dedupeKeyOf(o.nickname, o.contact, o.createdAt, o.amount, project))
  }

  const seenKeys = new Set<string>()
  const missingTime = raws.filter((r) => !r.orderedAt).length
  const rows: PlannedRow[] = []

  raws.forEach((raw, index) => {
    const nickname = raw.nickname.trim()
    const phone = normPhone(raw.phone)
    const amount = parseMoney(raw.price)
    const baseError = !nickname ? '缺少昵称' : amount == null ? '价格无法识别' : null
    const fallbackTime = new Date(now.getTime() - (raws.length - index) * 1000).toISOString()
    const ordered = raw.orderedAt || fallbackTime
    const { platform, assumed } = mapPlatform(raw.platform)
    const server = raw.server.trim() || '官服'
    const transferEnabled = isTransferYes(raw.transferFlag)
    const transferParsed = parseMoney(raw.transferAmount)
    const transferPending = transferEnabled && transferParsed == null
    const transferAmount = transferParsed ?? 0
    const feeRate = feeFor(snap, platform)
    const money = calcMoney({
      amount: amount ?? 0,
      feeRate,
      transferEnabled,
      transferMode: 'fixed',
      transferRatio: 0.8,
      transferAmount,
      transferPending,
    })

    let status: OrderStatus = '待处理'
    if (isYes(raw.doneFlag) || /已完成|完成/.test(raw.doneFlag)) status = '已完成'
    else if (/进行中|在做/.test(raw.doneFlag)) status = '进行中'
    else if (/退款/.test(raw.doneFlag)) status = '已退款'
    else if (/取消/.test(raw.doneFlag)) status = '已取消'

    const parts = splitProject(raw.project)
    const items =
      parts.length > 0
        ? parts.map((p) => ({ category: '导入', product: p }))
        : raw.project.trim()
          ? [{ category: '导入', product: raw.project.trim() }]
          : []

    const warnings: string[] = []
    if (assumed && raw.platform.trim()) warnings.push(`平台「${raw.platform}」按微信计`)
    else if (assumed) warnings.push('未填平台，按微信')
    if (!phone) warnings.push('无手机号')

    let customerAction: 'reuse' | 'create' = 'create'
    let customerLabel = nickname
    let tempCustomerId = `tmp-${index}`
    const byP = phone ? byPhone.get(phone) : undefined
    const byN = byNick.get(nickname)
    if (byP) {
      customerAction = 'reuse'
      customerLabel = byP.nickname
      tempCustomerId = byP.id
    } else if (byN && !phone) {
      customerAction = 'reuse'
      customerLabel = byN.nickname
      tempCustomerId = byN.id
    } else if (customerAction === 'create') {
      tempCustomerId = `new-${nickname}-${phone || index}`
      // 预登记，同表同客户合并
      const ref = { id: tempCustomerId, nickname, phone }
      if (phone) byPhone.set(phone, ref)
      if (!byNick.has(nickname)) byNick.set(nickname, ref)
    }

    const key = dedupeKeyOf(nickname, phone, ordered, amount ?? 0, raw.project)
    let disposition: PlannedRow['disposition'] = 'write'
    let error: string | null = null
    if (baseError) {
      disposition = 'error'
      error = baseError
    } else if ((amount ?? 0) === 0) {
      disposition = 'skip-zero'
    } else if (existingKeys.has(key) || seenKeys.has(key)) {
      disposition = 'skip-duplicate'
    } else {
      seenKeys.add(key)
    }

    const startDate =
      raw.sheet === '托管' && ordered ? ordered.slice(0, 10) : null
    const endDate = null
    const completedAt =
      status === '已完成'
        ? raw.completedAt || ordered
        : null

    rows.push({
      sheet: raw.sheet,
      rowNumber: raw.rowNumber,
      nickname,
      phone,
      project: raw.project,
      amount: amount ?? 0,
      status,
      platform,
      server,
      transferEnabled,
      transferAmount,
      transferPending,
      feeRate,
      feeAmount: money.feeAmount,
      payoutAmount: money.payoutAmount,
      note: [raw.note, raw.project && !items.length ? raw.project : '']
        .filter(Boolean)
        .join('；'),
      orderedAt: ordered,
      completedAt,
      items,
      startDate,
      endDate,
      customerAction,
      customerLabel,
      tempCustomerId,
      dedupeKey: key,
      warnings,
      disposition,
      error,
    })

    void knownServers
  })

  const writeRows = rows.filter((r) => r.disposition === 'write')
  const newServers = [
    ...new Set(
      writeRows
        .map((r) => r.server)
        .filter((s) => s && !snap.servers.some((x) => x.name === s)),
    ),
  ]

  return {
    rows,
    newCustomerCount: new Set(
      writeRows.filter((r) => r.customerAction === 'create').map((r) => r.tempCustomerId),
    ).size,
    writeCount: writeRows.length,
    skipCount: rows.filter((r) => r.disposition === 'skip-duplicate').length,
    zeroCount: rows.filter((r) => r.disposition === 'skip-zero').length,
    errorCount: rows.filter((r) => r.disposition === 'error').length,
    newServers,
    missingTimeCount: missingTime,
  }
}

function nextOrderNo(seq: number, when: Date, prefix: string): string {
  return formatOrderNo(seq, prefix, when)
}

/** 把计划合并进快照（不落盘；由 store replaceSnapshot） */
export function applyImport(snap: Snapshot, plan: ImportPlan, now = new Date()): Snapshot {
  const customers = snap.customers.map((c) => ({ ...c }))
  const orders = [...snap.orders]
  const servers = snap.servers.map((s) => ({ ...s }))
  let orderSeq = snap.orderSeq
  const idMap = new Map<string, string>()
  const gameId = snap.games[0]?.id ?? 'default'
  const orderPrefix = resolveOrderPrefix(snap.games)

  for (const row of plan.rows) {
    if (row.disposition !== 'write') continue
    if (row.customerAction === 'reuse') {
      idMap.set(row.tempCustomerId, row.tempCustomerId)
      continue
    }
    if (idMap.has(row.tempCustomerId)) continue
    const existing = row.phone
      ? customers.find((c) => !c.mergedIntoId && normPhone(c.contact) === row.phone)
      : undefined
    if (existing) {
      idMap.set(row.tempCustomerId, existing.id)
      continue
    }
    const id = `c-imp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    idMap.set(row.tempCustomerId, id)
    const created: Customer = {
      id,
      nickname: row.nickname,
      contact: row.phone || '',
      note: '',
      createdAt: now.toISOString(),
    }
    customers.push(created)
  }

  const known = new Set(servers.filter((s) => s.gameId === gameId).map((s) => s.name))
  for (const name of plan.newServers) {
    if (known.has(name)) continue
    servers.push({
      id: `srv-imp-${Math.random().toString(36).slice(2, 8)}`,
      gameId,
      name,
      enabled: true,
    })
    known.add(name)
  }

  for (const row of plan.rows) {
    if (row.disposition !== 'write') continue
    const customerId = idMap.get(row.tempCustomerId)
    if (!customerId) continue
    const when = new Date(row.orderedAt)
    const stamped = Number.isNaN(when.getTime()) ? now : when
    orderSeq += 1
    const order: Order = {
      id: `o-imp-${Date.now()}-${orderSeq}`,
      gameId,
      orderNo: nextOrderNo(orderSeq, stamped, orderPrefix),
      createdAt: row.orderedAt,
      customerId,
      nickname: row.nickname,
      contact: row.phone,
      type: row.sheet === '托管' ? '托管' : '普通',
      platform: row.platform,
      server: row.server,
      status: row.status,
      items: row.items.map((i) => ({
        category: i.category,
        product: i.product,
        price: 0,
      })),
      custodyKind: row.sheet === '托管' ? row.project || undefined : undefined,
      startDate: row.startDate ?? undefined,
      endDate: row.endDate ?? undefined,
      amount: row.amount,
      feeRate: row.feeRate,
      feeAmount: row.feeAmount,
      payout: row.payoutAmount,
      transferEnabled: row.transferEnabled,
      transferMode: 'fixed',
      transferRatio: 0.8,
      transferAmount: row.transferAmount,
      note: row.note,
      startedAt:
        row.status === '进行中' || row.status === '已完成' ? row.orderedAt : undefined,
      completedAt: row.completedAt ?? undefined,
      amountLocked: row.status === '已完成' || row.status === '已退款' || row.status === '已取消',
      dedupeKey: row.dedupeKey,
    }
    orders.unshift(order)
  }

  return {
    ...snap,
    customers,
    orders,
    servers,
    orderSeq,
    updatedAt: now.toISOString(),
  }
}
