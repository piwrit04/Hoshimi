/**
 * 读取 Excel / CSV 为原始导入行（格式对齐 Cheezit 简化版）。
 * Excel：工作表名含「普通」「托管」；CSV：单表，靠「项目」推断类型。
 */

import type { RawImportRow } from '@/domain/import-plan'

function headerKey(key: string): string {
  return key.replace(/\s+/g, '').replace(/^\uFEFF/, '')
}

function pick(record: Record<string, unknown>, names: string[]): unknown {
  for (const [key, value] of Object.entries(record)) {
    if (names.includes(headerKey(key))) return value
  }
  return ''
}

function asText(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (Number.isInteger(value)) return String(value)
    if (Math.abs(value - Math.round(value)) < 1e-6) return String(Math.round(value))
  }
  if (value instanceof Date) return ''
  return String(value).trim()
}

function asDate(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Date(
      value.getFullYear(),
      value.getMonth(),
      value.getDate(),
      value.getHours(),
      value.getMinutes(),
      value.getSeconds(),
    ).toISOString()
  }
  if (typeof value === 'number' && value > 20000 && value < 80000) {
    const utc = new Date(Math.round((value - 25569) * 86400 * 1000))
    return new Date(
      utc.getUTCFullYear(),
      utc.getUTCMonth(),
      utc.getUTCDate(),
      utc.getUTCHours(),
      utc.getUTCMinutes(),
      utc.getUTCSeconds(),
    ).toISOString()
  }
  const text = asText(value)
  if (!text) return ''
  const match = text.match(
    /^(\d{4})[./-](\d{1,2})[./-](\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/,
  )
  if (match) {
    return new Date(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3]),
      Number(match[4] ?? 12),
      Number(match[5] ?? 0),
      Number(match[6] ?? 0),
    ).toISOString()
  }
  const parsed = new Date(text)
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString()
  return ''
}

function classify(name: string, records: Record<string, unknown>[]): '普通' | '托管' | null {
  if (name.includes('托管')) return '托管'
  if (name.includes('普通')) return '普通'
  const projects = records.map((record) => asText(pick(record, ['项目'])))
  const hits = projects.filter((project) => /全托|普托|日常|托管/.test(project)).length
  const nonempty = projects.filter(Boolean).length
  if (nonempty && hits >= Math.ceil(nonempty / 2)) return '托管'
  if (nonempty) return '普通'
  return null
}

function recordToRow(
  kind: '普通' | '托管',
  record: Record<string, unknown>,
  index: number,
): RawImportRow | null {
  const nickname = asText(pick(record, ['昵称', '客户']))
  const project = asText(pick(record, ['项目']))
  const price = pick(record, ['价格', '金额'])
  if (!nickname && !project && asText(price) === '' && typeof price !== 'number') return null
  return {
    sheet: kind,
    rowNumber: index + 2,
    nickname,
    phone: asText(pick(record, ['手机号', '手机', '联系方式'])),
    project,
    price,
    transferFlag: asText(pick(record, ['转单'])),
    doneFlag: asText(pick(record, ['是否完单', '完单', '状态'])),
    server: asText(pick(record, ['服务器'])),
    platform: asText(pick(record, ['下单平台', '平台'])),
    note: asText(pick(record, ['备注'])),
    transferAmount: pick(record, ['转单金额']),
    sheetNet: pick(record, ['实收金额', '实收', '到手金额']),
    orderedAt: asDate(pick(record, ['下单时间', '创建时间'])),
    completedAt: asDate(pick(record, ['完成时间'])),
  }
}

export async function readExcel(buffer: ArrayBuffer): Promise<RawImportRow[]> {
  const XLSX = await import('xlsx')
  const book = XLSX.read(buffer, { type: 'array', cellDates: true })
  const rows: RawImportRow[] = []
  for (const name of book.SheetNames) {
    const sheet = book.Sheets[name]
    if (!sheet) continue
    const records = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: '',
      raw: true,
    })
    const kind = classify(name, records)
    if (!kind) continue
    records.forEach((record, index) => {
      const row = recordToRow(kind, record, index)
      if (row) rows.push(row)
    })
  }
  return rows
}

/** 简易 CSV（支持逗号分隔、引号包裹、UTF-8 BOM） */
export function readCsv(text: string): RawImportRow[] {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length < 2) return []
  const headers = parseCsvLine(lines[0]).map(headerKey)
  const records: Record<string, unknown>[] = []
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i])
    const rec: Record<string, unknown> = {}
    headers.forEach((h, j) => {
      rec[h] = cells[j] ?? ''
    })
    records.push(rec)
  }
  const kind = classify('csv', records) ?? '普通'
  const rows: RawImportRow[] = []
  records.forEach((record, index) => {
    const row = recordToRow(kind, record, index)
    if (row) rows.push(row)
  })
  return rows
}

function parseCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQ = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQ) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"'
          i++
        } else {
          inQ = false
        }
      } else {
        cur += ch
      }
    } else if (ch === '"') {
      inQ = true
    } else if (ch === ',') {
      out.push(cur.trim())
      cur = ''
    } else {
      cur += ch
    }
  }
  out.push(cur.trim())
  return out
}

export async function readImportFile(file: File): Promise<RawImportRow[]> {
  const name = file.name.toLowerCase()
  if (name.endsWith('.csv') || file.type === 'text/csv') {
    return readCsv(await file.text())
  }
  return readExcel(await file.arrayBuffer())
}
