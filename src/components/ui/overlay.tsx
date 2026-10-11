import {
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { QrCode, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Scrollbar } from './Scrollbar'
import { pushOverlay } from '@/lib/overlay-stack'

/*
 * ============================================================
 *  浮层组件组：下拉菜单 / 气泡卡片 / 抽屉 / 二维码占位
 * ============================================================
 *
 * 说明两件事：
 *
 * 1. 抽屉和下拉菜单都是**受控的**，打开状态由调用方给。
 *    和项目里已有的 Modal 保持一致（它也是 isOpen/onClose）。
 *
 * 2. 二维码只做**占位**，不引二维码库。
 *    理由：一期范围里没有「扫码支付」这一条，为一个还没定稿的功能
 *    加一个运行时依赖不划算。占位块的尺寸和留白是按真实二维码给的，
 *    以后接库时直接替换内部内容即可。
 */

/* ------------------------------------------------------------------ */
/* 下拉菜单                                                            */
/* ------------------------------------------------------------------ */

export interface MenuEntry {
  key: string
  label: ReactNode
  icon?: ComponentType<{ size?: number }>
  /** 右侧快捷键提示，例如 ⌘K */
  shortcut?: string
  danger?: boolean
  disabled?: boolean
  /** 分隔线：这一项只有这一种形态 */
  type?: 'item' | 'divider' | 'label'
}

/*
 * Dropdown —— 参照 shadcn/Radix 与 Naive UI 的做法：
 *   1. 菜单用 createPortal 挂到 body（fixed 定位），
 *      避免被 Modal / overflow 容器的滚动层裁剪 —— 这是 Radix 和 Naive 的 Teleport 共识。
 *   2. 完整键盘导航：ArrowDown/ArrowUp 循环移动、Home/End 首尾、Enter 选中、Esc 关闭。
 *   3. 菜单项支持 hover 与键盘 focus 双高亮联动（Radix 的 focus:bg-accent 模式）。
 *   4. 打开期间监听滚动/缩放重算菜单位置（fixed 定位必须跟随触发元素）。
 */
export function Dropdown({
  trigger,
  items,
  onSelect,
  align = 'start',
  className,
}: {
  /** 触发元素。会被套一层可点区域 */
  trigger: ReactNode
  items: MenuEntry[]
  onSelect?: (key: string) => void
  align?: 'start' | 'end'
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [pos, setPos] = useState({ top: 0, left: 0, right: 0, minWidth: 0 })
  const wrapRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLSpanElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])

  /** 可被键盘导航到的项（跳过 divider / label / disabled） */
  const activatable: number[] = []
  items.forEach((it, i) => {
    if ((!it.type || it.type === 'item') && !it.disabled) activatable.push(i)
  })

  /* 位置计算：fixed 定位，跟随触发元素 */
  const updatePos = () => {
    const el = triggerRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    setPos({
      top: r.bottom + 4,
      left: r.left,
      right: window.innerWidth - r.right,
      minWidth: r.width,
    })
  }

  /* 打开：算位置、重置高亮、挂滚动/缩放/外部点击/Esc 监听 */
  useEffect(() => {
    if (!open) return
    updatePos()
    setActiveIndex(-1)

    const onScroll = () => updatePos()
    const onResize = () => updatePos()
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (menuRef.current?.contains(t)) return
      if (triggerRef.current?.contains(t)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onResize)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onResize)
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  /* activeIndex 变化 → 把焦点交给对应菜单项（键盘导航高亮） */
  useEffect(() => {
    if (open && activeIndex >= 0 && activatable[activeIndex] !== undefined) {
      itemRefs.current[activatable[activeIndex]]?.focus()
    }
  }, [activeIndex, open])

  const selectItem = (idx: number) => {
    const it = items[idx]
    if (!it || it.disabled) return
    onSelect?.(it.key)
    setOpen(false)
    setActiveIndex(-1)
  }

  const handleKeyDown = (e: ReactKeyboardEvent) => {
    if (!open) return
    const n = activatable.length
    if (n === 0) return
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActiveIndex((i) => (i >= n - 1 ? 0 : i + 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setActiveIndex((i) => (i <= 0 ? n - 1 : i - 1))
        break
      case 'Home':
        e.preventDefault()
        setActiveIndex(0)
        break
      case 'End':
        e.preventDefault()
        setActiveIndex(n - 1)
        break
      case 'Enter':
      case ' ':
        if (activeIndex >= 0 && activatable[activeIndex] !== undefined) {
          e.preventDefault()
          selectItem(activatable[activeIndex])
        }
        break
      case 'Escape':
        e.preventDefault()
        setOpen(false)
        break
    }
  }

  return (
    <div className={cn('relative inline-flex', className)} ref={wrapRef} onKeyDown={handleKeyDown}>
      <span
        ref={triggerRef}
        className="inline-flex"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {trigger}
      </span>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            className="fixed z-[var(--z-popover)]"
            style={{
              top: pos.top,
              left: align === 'start' ? pos.left : undefined,
              right: align === 'end' ? pos.right : undefined,
              /* 菜单宽度由内容决定（max-content），只保底：
                 min-width = 触发元素宽（对齐美观）且不低于 128px（shadcn 的 8rem）。
                 不再把 width 锁成按钮宽 —— 长菜单项不会被按钮压窄。 */
              minWidth: Math.max(pos.minWidth, 128),
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.13, ease: 'easeOut' }}
              className="dd-popover dd-popover--plain"
            >
              <div className="dd-menu">
                {items.map((it, idx) => {
                  const listIdx = activatable.indexOf(idx)
                  if (it.type === 'divider')
                    return <div key={it.key} className="dd-menu__sep" />
                  if (it.type === 'label')
                    return (
                      <div key={it.key} className="dd-menu__label">
                        {it.label}
                      </div>
                    )
                  const Icon = it.icon
                  return (
                    <button
                      key={it.key}
                      ref={(node) => {
                        itemRefs.current[idx] = node
                      }}
                      type="button"
                      role="menuitem"
                      disabled={it.disabled}
                      data-active={activeIndex === listIdx}
                      onMouseEnter={() => {
                        if (!it.disabled) setActiveIndex(listIdx)
                      }}
                      onClick={() => selectItem(idx)}
                      className={cn('dd-menu__item', it.danger && 'dd-menu__item--danger')}
                    >
                      {Icon && <Icon size={15} />}
                      <span className="truncate">{it.label}</span>
                      {it.shortcut && <span className="dd-menu__shortcut">{it.shortcut}</span>}
                    </button>
                  )
                })}
              </div>
            </motion.div>
          </div>,
          document.body
        )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 气泡卡片（Popover）—— 点触发元素弹出一个任意内容的浮层               */
/* ------------------------------------------------------------------ */

export function Popover({
  trigger,
  content,
  /** 标题，给了就带一条分割线 */
  title,
  align = 'start',
  className,
}: {
  trigger: ReactNode
  content: ReactNode
  title?: ReactNode
  align?: 'start' | 'center' | 'end'
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const wrapRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLSpanElement>(null)
  const popRef = useRef<HTMLDivElement>(null)

  const updatePos = () => {
    const el = triggerRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const POPOVER_WIDTH = 256 // 与 .dd-popover.w-64 一致
    let left = r.left
    if (align === 'center') left = r.left + (r.width - POPOVER_WIDTH) / 2
    if (align === 'end') left = r.right - POPOVER_WIDTH
    // 视口边界约束
    left = Math.max(8, Math.min(left, window.innerWidth - POPOVER_WIDTH - 8))
    setPos({ top: r.bottom + 8, left })
  }

  useEffect(() => {
    if (!open) return
    updatePos()
    const onScroll = () => updatePos()
    const onResize = () => updatePos()
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (popRef.current?.contains(t)) return
      if (triggerRef.current?.contains(t)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onResize)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onResize)
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className={cn('relative inline-flex', className)} ref={wrapRef}>
      <span
        ref={triggerRef}
        className="inline-flex"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {trigger}
      </span>
      {open &&
        createPortal(
          <div
            ref={popRef}
            role="dialog"
            className="fixed z-[var(--z-popover)]"
            style={{ top: pos.top, left: pos.left }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.13, ease: 'easeOut' }}
              className="dd-popover w-64"
            >
              {title && (
                <div className="font-semibold pb-2 mb-2 border-b border-border">{title}</div>
              )}
              {content}
            </motion.div>
          </div>,
          document.body
        )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 抽屉                                                                */
/* ------------------------------------------------------------------ */

export function Drawer({
  isOpen,
  onClose,
  title,
  children,
  footer,
  /** 吸底常显区（金额条等），夹在滚动区与脚按钮之间 */
  summary,
  /** 从哪一侧滑出 */
  placement = 'right',
  width,
}: {
  isOpen: boolean
  onClose: () => void
  title?: ReactNode
  children: ReactNode
  footer?: ReactNode
  summary?: ReactNode
  placement?: 'right' | 'left'
  /** 覆盖默认宽度 */
  width?: number | string
}) {
  const reduceMotion = useReducedMotion()
  const onCloseRef = useRef(onClose);
  const panelRef = useRef<HTMLElement>(null);

  // 保持 ref 同步但不触发 effect 重跑
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  /* Esc + 滚动锁交给浮层栈：只关最顶一层 */
  useEffect(() => {
    if (!isOpen) return
    return pushOverlay(() => onCloseRef.current())
  }, [isOpen])

  /* 焦点陷阱（参照 Radix Dialog / Naive Drawer）：Tab 在抽屉内循环 */
  useEffect(() => {
    if (!isOpen) return
    const root = panelRef.current
    if (!root) return

    const focusables = () =>
      Array.from(
        root.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => el.offsetParent !== null)

    const first = focusables()[0]
    first?.focus()

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const list = focusables()
      if (list.length === 0) return
      const firstEl = list[0]
      const lastEl = list[list.length - 1]
      if (e.shiftKey) {
        if (document.activeElement === firstEl || !root.contains(document.activeElement)) {
          e.preventDefault()
          lastEl.focus()
        }
      } else if (document.activeElement === lastEl || !root.contains(document.activeElement)) {
        e.preventDefault()
        firstEl.focus()
      }
    }
    document.addEventListener('keydown', handleTab)
    return () => document.removeEventListener('keydown', handleTab)
  }, [isOpen])

  /* 始终 portal 到 body；AnimatePresence 放在 portal 内，
     否则 Presence 看不到 motion 子树，抽屉会停在 initial x:100% */
  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div
          key="drawer"
          className="fixed inset-0"
          style={{ zIndex: 'var(--z-modal)' }}
        >
          {/* 遮罩 */}
          <motion.div
            key="drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0.01 : 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
            aria-hidden="true"
          />
          {/* 面板：缩放+淡入（退场播完）；减动时瞬时 */}
          <motion.aside
            key="drawer-panel"
            ref={panelRef}
            initial={
              reduceMotion
                ? { opacity: 1, scale: 1, x: 0 }
                : {
                    opacity: 0,
                    scale: 0.98,
                    x: placement === 'right' ? 28 : -28,
                  }
            }
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={
              reduceMotion
                ? { opacity: 0, scale: 1, x: 0 }
                : {
                    opacity: 0,
                    scale: 0.98,
                    x: placement === 'right' ? 28 : -28,
                  }
            }
            transition={
              reduceMotion
                ? { duration: 0.01 }
                : { type: 'tween', duration: 0.28, ease: [0.22, 1, 0.36, 1] }
            }
            className={cn('dd-drawer-panel', `dd-drawer-panel--${placement}`)}
            style={width ? { width } : undefined}
            role="dialog"
            aria-modal="true"
          >
            <div className="dd-drawer__head">
              <span>{title}</span>
              <button
                type="button"
                aria-label="关闭"
                onClick={onClose}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="dd-drawer__body">
              <Scrollbar className="h-full">{children}</Scrollbar>
            </div>
            {summary ? <div className="dd-drawer__summary">{summary}</div> : null}
            {footer && <div className="dd-drawer__foot">{footer}</div>}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}

/* ------------------------------------------------------------------ */
/* 二维码占位                                                          */
/* ------------------------------------------------------------------ */

export function QrCodePlaceholder({
  size = 132,
  label = '二维码',
}: {
  size?: number
  label?: string
}) {
  return (
    <div className="inline-flex flex-col items-center gap-2">
      <div className="dd-qr" style={{ width: size, height: size }}>
        <QrCode size={Math.round(size * 0.34)} />
      </div>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  )
}
