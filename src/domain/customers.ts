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
