/**
 * 浮层栈：Modal / Drawer / 命令式确认框共用。
 * - Esc 只关最顶一层
 * - 滚动锁按引用计数，嵌套打开不会提前恢复
 */
import { listLockableScrollRoots } from './scroll-root'

type OverlayEntry = {
  id: number
  onClose: () => void
}

let nextId = 1
const stack: OverlayEntry[] = []
let escBound = false
let lockCount = 0
const savedOverflow = new Map<HTMLElement, string>()

function acquireScrollLock() {
  if (lockCount === 0) {
    savedOverflow.clear()
    for (const el of listLockableScrollRoots()) {
      savedOverflow.set(el, el.style.overflow)
      el.style.overflow = 'hidden'
    }
  }
  lockCount += 1
}

function releaseScrollLock() {
  lockCount = Math.max(0, lockCount - 1)
  if (lockCount === 0) {
    savedOverflow.forEach((prev, el) => {
      el.style.overflow = prev
    })
    savedOverflow.clear()
  }
}

function onEsc(e: KeyboardEvent) {
  if (e.key !== 'Escape') return
  if (stack.length === 0) return
  e.preventDefault()
  e.stopPropagation()
  stack[stack.length - 1].onClose()
}

function ensureEsc() {
  if (escBound) return
  escBound = true
  document.addEventListener('keydown', onEsc, true)
}

function teardownEscIfEmpty() {
  if (stack.length === 0 && escBound) {
    document.removeEventListener('keydown', onEsc, true)
    escBound = false
  }
}

/**
 * 注册一层浮层。返回注销函数（组件 unmount / isOpen=false 时调用）。
 * onClose 应保持稳定（用 ref），否则每次重渲染会换掉栈顶回调。
 */
export function pushOverlay(onClose: () => void): () => void {
  const id = nextId++
  const entry: OverlayEntry = { id, onClose }
  stack.push(entry)
  acquireScrollLock()
  ensureEsc()
  return () => {
    const idx = stack.findIndex((e) => e.id === id)
    if (idx < 0) return
    stack.splice(idx, 1)
    releaseScrollLock()
    teardownEscIfEmpty()
  }
}

export function overlayDepth(): number {
  return stack.length
}
