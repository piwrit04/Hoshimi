import {
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { QrCode, X } from 'lucide-react'
import { cn } from '@/lib/utils'

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
  const wrapRef = useRef<HTMLDivElement>(null)

  /* 点外面 / 按 Esc 关闭 */
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className={cn('relative inline-flex', className)} ref={wrapRef}>
      <span
        className="inline-flex"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {trigger}
      </span>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.13, ease: 'easeOut' }}
            role="menu"
            className={cn(
              'dd-popover dd-popover--plain absolute z-50 mt-1.5',
              align === 'end' ? 'right-0' : 'left-0'
            )}
          >
            <div className="dd-menu">
              {items.map((it) => {
                if (it.type === 'divider') return <div key={it.key} className="dd-menu__sep" />
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
                    type="button"
                    role="menuitem"
                    disabled={it.disabled}
                    onClick={() => {
                      onSelect?.(it.key)
                      setOpen(false)
                    }}
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
        )}
      </AnimatePresence>
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
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className={cn('relative inline-flex', className)} ref={wrapRef}>
      <span className="inline-flex" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        {trigger}
      </span>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.13, ease: 'easeOut' }}
            className={cn(
              'dd-popover absolute z-50 top-full mt-2 w-64',
              align === 'center' && 'left-1/2 -translate-x-1/2',
              align === 'end' && 'right-0',
              align === 'start' && 'left-0'
            )}
            role="dialog"
          >
            {title && (
              <div className="font-semibold pb-2 mb-2 border-b border-border">{title}</div>
            )}
            {content}
          </motion.div>
        )}
      </AnimatePresence>
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
  /** 从哪一侧滑出 */
  placement = 'right',
  width,
}: {
  isOpen: boolean
  onClose: () => void
  title?: ReactNode
  children: ReactNode
  footer?: ReactNode
  placement?: 'right' | 'left'
  /** 覆盖默认宽度 */
  width?: number | string
}) {
  const onCloseRef = useRef(onClose);

  // 保持 ref 同步但不触发 effect 重跑
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  /* Esc 关闭 + 打开时锁滚动。和 Modal 用同一套处理。 */
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [isOpen]) // 移除 onClose 依赖

  return (
    <AnimatePresence>
      {isOpen && createPortal(
        <div className="fixed inset-0 z-[60]">
          {/* 遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
            aria-hidden="true"
          />
          {/* 面板 */}
          <motion.aside
            initial={{ x: placement === 'right' ? '100%' : '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: placement === 'right' ? '100%' : '-100%' }}
            transition={{ type: 'tween', duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
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
            <div className="dd-drawer__body custom-scrollbar">{children}</div>
            {footer && <div className="dd-drawer__foot">{footer}</div>}
          </motion.aside>
        </div>,
        document.body
      )}
    </AnimatePresence>
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
