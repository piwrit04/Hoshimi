/** 金额显示：表格里统一两位小数（tabular-nums 下小数点对齐） */
export function yuan2(n: number): string {
  return `¥${n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/** 统计卡 / 摘要：去掉多余的 .00 */
export function yuan(n: number): string {
  return `¥${n.toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}
