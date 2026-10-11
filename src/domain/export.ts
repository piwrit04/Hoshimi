/**
 * 订单 / 客户导出为 CSV、Excel（格式对齐 Cheezit 简化版）。
 * 退款 / 取消：到手列写「—」。
 */

import { todayISO } from '@/domain/dates'
import type { Order } from '@/domain/order'
import { NO_PAYOUT, payoutVoid } from '@/domain/status'
import type { Customer } from '@/storage/types'

export type ExportLedger = {
  orders: Order[]
  customers: Customer[]
}

function localStamp(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

function itemSummary(order: Order): string {
  if (order.type === '托管') {
    return [order.custodyKind, order.settleKind].filter(Boolean).join(' ') || '托管'
  }
  return order.items.map((i) => i.product).join(' + ') || '—'
}

function transferLabel(order: Order): string {
  if (!order.transferEnabled) return '否'
  if (order.transferMode === 'ratio') return `${Math.round(order.transferRatio * 100)}%`
  return order.transferAmount.toFixed(2)
}

function transferOut(order: Order): number {
  if (!order.transferEnabled) return 0
  if (order.transferMode === 'ratio') {
    return Math.round(order.amount * order.transferRatio * 100) / 100
  }
  return order.transferAmount
}

/** 导出表格：headers + rows（到手对退款/取消为 —） */
export function orderTable(
  orders: Order[],
): { headers: string[]; rows: (string | number)[][] } {
  const headers = [
    '单号',
    '类型',
    '客户',
    '手机号',
    '项目',
    '金额',
    '手续费',
    '转出',
    '到手',
    '转单',
    '状态',
    '平台',
    '服务器',
    '下单时间',
    '完成时间',
    '托管类型',
    '结法',
    '开始日',
    '结束日',
    '备注',
  ]
  const rows = orders.map((order) => [
    order.orderNo,
    order.type,
    order.nickname,
    order.contact,
    itemSummary(order),
    order.amount,
    order.feeAmount,
    transferOut(order),
    payoutVoid(order) ? NO_PAYOUT : order.payout,
    transferLabel(order),
    order.status,
    order.platform,
    order.server,
    localStamp(order.createdAt),
    localStamp(order.completedAt),
    order.custodyKind ?? '',
    order.settleKind ?? '',
    order.startDate ?? '',
    order.endDate ?? '',
    order.note,
  ])
  return { headers, rows }
}

function csvCell(value: string | number): string {
  let text = String(value ?? '')
  if (/^[=+@\t\r]/.test(text)) text = `'${text}`
  if (/[",\r\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

export function toCsv(orders: Order[]): string {
  const { headers, rows } = orderTable(orders)
  const lines = [
    headers.join(','),
    ...rows.map((cells) =>
      cells.map((c) => csvCell(typeof c === 'number' ? c.toFixed(2) : c)).join(','),
    ),
  ]
  return `\uFEFF${lines.join('\r\n')}`
}

export function download(filename: string, content: BlobPart, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 30000)
}


export function customerTable(
  customers: Customer[],
): { headers: string[]; rows: (string | number)[][] } {
  const headers = ['昵称', '联系方式', '备注', '建档时间']
  const rows = customers
    .filter((c) => !c.mergedIntoId)
    .map((c) => [
      c.nickname,
      c.contact ?? '',
      c.note ?? '',
      c.createdAt ? c.createdAt.slice(0, 10) : '',
    ])
  return { headers, rows }
}

export function toCustomersCsv(customers: Customer[]): string {
  const { headers, rows } = customerTable(customers)
  const lines = [
    headers.join(','),
    ...rows.map((cells) => cells.map((c) => csvCell(c)).join(',')),
  ]
  return `\uFEFF${lines.join('\r\n')}`
}

export function exportCustomersCsv(customers: Customer[], label = '客户') {
  download(`星笺${label}-${todayISO()}.csv`, toCustomersCsv(customers), 'text/csv;charset=utf-8')
}

export function exportCsv(orders: Order[], label = '订单') {
  download(`星笺${label}-${todayISO()}.csv`, toCsv(orders), 'text/csv;charset=utf-8')
}

/** 导出 .xlsx：普通单 / 托管单分表；orders 未传时再加客户表 */
export async function exportXlsx(
  ledger: ExportLedger,
  orders?: Order[],
  label = '订单',
) {
  const XLSX = await import('xlsx')
  const list = orders ?? ledger.orders
  const wb = XLSX.utils.book_new()
  const widths = [14, 6, 14, 13, 28, 9, 8, 8, 9, 7, 7, 6, 7, 17, 17, 8, 8, 11, 11, 24]
  for (const [name, part] of [
    ['普通单', list.filter((o) => o.type === '普通')],
    ['托管单', list.filter((o) => o.type === '托管')],
  ] as const) {
    const { headers, rows } = orderTable(part)
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
    ws['!cols'] = widths.map((wch) => ({ wch }))
    XLSX.utils.book_append_sheet(wb, ws, name)
  }
  if (!orders) {
    const { headers: custHeaders, rows: custRows } = customerTable(ledger.customers)
    const ws = XLSX.utils.aoa_to_sheet([custHeaders, ...custRows])
    ws['!cols'] = [{ wch: 16 }, { wch: 14 }, { wch: 24 }, { wch: 12 }]
    XLSX.utils.book_append_sheet(wb, ws, '客户')
  }
  const data = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer
  download(
    `星笺${label}-${todayISO()}.xlsx`,
    data,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
}
