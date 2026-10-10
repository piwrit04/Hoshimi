/**
 * 金额计算 —— 照搬 Cheezit 的算法（见 Cheezit/src/domain/money.ts）。
 *
 * 规则：
 * - 金额以「分」为整数运算，避免 100 − 80 − 1.6 的浮点尾巴。
 * - 手续费 = 客户付的金额 × 渠道费率（按全额，不按到手）。
 * - 转单在扣手续费之前发生。
 *   - 自打：到手 = 金额 − 手续费
 *   - 转单：到手 = 金额 − 转出 − 手续费
 * - 转出未填时不猜比例，到手先按「未填转出」记，等用户补。
 */

export type TransferMode = 'ratio' | 'fixed'

export function toCents(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.round(n * 100)
}

export function fromCents(cents: number): number {
  return cents / 100
}

export type MoneyInput = {
  amount: number
  feeRate: number
  transferEnabled: boolean
  transferMode: TransferMode
  /** 0–1，例如 0.8 */
  transferRatio: number
  transferAmount: number
  /** 转单已开但转出金额未填 */
  transferPending?: boolean
}

export type MoneyResult = {
  amount: number
  feeRate: number
  feeAmount: number
  transferOut: number
  payoutAmount: number
  transferPending: boolean
}

export function calcMoney(input: MoneyInput): MoneyResult {
  const amountC = toCents(input.amount)
  const feeC = Math.round(amountC * input.feeRate)
  const pending = Boolean(input.transferPending && input.transferEnabled)
  let transferC = 0
  if (input.transferEnabled && !pending) {
    transferC =
      input.transferMode === 'fixed'
        ? toCents(input.transferAmount)
        : Math.round(amountC * input.transferRatio)
  }
  const payoutC = amountC - transferC - feeC
  return {
    amount: fromCents(amountC),
    feeRate: input.feeRate,
    feeAmount: fromCents(feeC),
    transferOut: fromCents(transferC),
    payoutAmount: fromCents(payoutC),
    transferPending: pending,
  }
}

/** 把费率显示成 1.6% 这种文案 */
export function feePercentLabel(rate: number): string {
  const pct = Math.round(rate * 10000) / 100
  return `${pct}%`
}

/** 渠道：微信 0%，闲鱼 1.6%（改费率只影响之后新存的单） */
export type Platform = '微信' | '闲鱼'
export const PLATFORM_FEE: Record<Platform, number> = {
  微信: 0,
  闲鱼: 0.016,
}

/** 订单状态机（照搬 Cheezit） */
export type OrderStatus = '待处理' | '进行中' | '已完成' | '已退款' | '已取消'
export type OrderType = '普通' | '托管'
