/** 快捷键一览 + 判定「是否在输入框里」（避免抢 Electron / 表单输入） */

export type ShortcutItem = {
  keys: string[]
  label: string
  group: '通用' | '导航' | '账本'
}

export const SHORTCUT_ITEMS: ShortcutItem[] = [
  { group: '通用', keys: ['⌘/Ctrl', 'K'], label: '打开全局搜索' },
  { group: '通用', keys: ['/'], label: '聚焦当前页搜索' },
  { group: '通用', keys: ['?'], label: '打开快捷键一览' },
  { group: '通用', keys: ['Esc'], label: '关闭浮层 / 收起侧栏' },
  { group: '账本', keys: ['N'], label: '新建订单' },
  { group: '导航', keys: ['1'], label: '概览' },
  { group: '导航', keys: ['2'], label: '订单' },
  { group: '导航', keys: ['3'], label: '待办' },
  { group: '导航', keys: ['4'], label: '客户' },
  { group: '导航', keys: ['5'], label: '设置' },
]

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (target.isContentEditable) return true
  return Boolean(target.closest('[contenteditable="true"]'))
}

/** 聚焦带 data-page-search 的本页搜索框；找不到返回 false */
export function focusPageSearch(): boolean {
  const host = document.querySelector('[data-page-search]')
  if (!host) return false
  const el =
    host instanceof HTMLInputElement || host instanceof HTMLTextAreaElement
      ? host
      : host.querySelector('input, textarea')
  if (!(el instanceof HTMLElement)) return false
  el.focus()
  return true
}
