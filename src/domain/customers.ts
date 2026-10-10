/** 客户校验与搜索（轻量版，对照 Cheezit） */

export function nicknameError(nickname: string): string | null {
  return nickname.trim() ? null : '请填写昵称'
}

/** 去掉空格和横线，方便比对复制来的号码 */
export function normalizePhone(value: string): string {
  return value.replace(/[\s\u00a0\u3000\-\u2010-\u2015\u2212\uff0d]/g, '')
}

export function phoneTail(contact: string | null | undefined): string {
  const digits = normalizePhone(contact ?? '').replace(/\D/g, '')
  if (digits.length < 4) return digits ? `***${digits}` : ''
  return `***${digits.slice(-4)}`
}

type CustomerInfo = { nickname: string; contact: string; note: string }

/** 昵称 / 备注 / 手机号（去空格横线）匹配 */
export function customerMatches(customer: CustomerInfo, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const note = customer.note.toLowerCase()
  if (customer.nickname.toLowerCase().includes(q) || note.includes(q)) return true
  const phone = normalizePhone(q)
  if (!phone) return false
  return (
    normalizePhone(customer.contact).includes(phone) || normalizePhone(note).includes(phone)
  )
}

export function customerDeleteBlockReason(orderCount: number): string | null {
  if (orderCount <= 0) return null
  return `该客户还有 ${orderCount} 张订单，不能删除。可先合并到其他客户，或保留档案。`
}

export const SAME_NAME_REASON = '昵称相同，手机号不同'

export type CustomerLike = {
  id: string
  nickname: string
  contact: string
  note: string
  mergedIntoId?: string
}

/** 合并时写进留下客户备注的一行 */
export function mergeNoteLine(
  from: Pick<CustomerLike, 'nickname' | 'contact' | 'note'>,
  into: Pick<CustomerLike, 'nickname' | 'contact' | 'note'>,
): string {
  const phone = from.contact.trim()
  const keepPhone = phone && phone !== into.contact.trim() ? phone : ''
  const note = from.note.trim()
  if (!keepPhone && !note) return ''
  return `合并自 ${from.nickname}${keepPhone ? `（${keepPhone}）` : ''}${note ? `：${note}` : ''}`
}

/** 留下客户合并后的备注 */
export function mergedNote(
  from: Pick<CustomerLike, 'nickname' | 'contact' | 'note'>,
  into: Pick<CustomerLike, 'nickname' | 'contact' | 'note'>,
): string {
  const line = mergeNoteLine(from, into)
  if (!line) return into.note
  const current = into.note.trim()
  return current ? `${current}；${line}` : line
}

/** 活跃客户中疑似重复的两两组合（同号不同名 / 同名不同号） */
export function duplicatePairs(
  customers: CustomerLike[],
): { a: CustomerLike; b: CustomerLike; reason: string }[] {
  const list = customers.filter((c) => !c.mergedIntoId)
  const pairs: { a: CustomerLike; b: CustomerLike; reason: string }[] = []
  for (let i = 0; i < list.length; i += 1) {
    for (let j = i + 1; j < list.length; j += 1) {
      const a = list[i]
      const b = list[j]
      const pa = normalizePhone(a.contact)
      const pb = normalizePhone(b.contact)
      if (pa && pa === pb && a.nickname !== b.nickname) {
        pairs.push({ a, b, reason: '手机号相同，昵称不同' })
      } else if (a.nickname === b.nickname && pa && pb && pa !== pb) {
        pairs.push({ a, b, reason: SAME_NAME_REASON })
      }
    }
  }
  return pairs
}
