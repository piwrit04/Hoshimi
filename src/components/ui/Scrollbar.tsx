import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from 'react'
import { cn } from '@/lib/utils'

/*
 * Scrollbar —— overlay 悬浮滚动条（参考 Naive UI 的 n-scrollbar 结构）。
 *
 * 结构（Naive 同款，关键点）：
 *   .scrollbar(wrapper: relative + flex column)      ← 外壳：高度/背景/边框
 *     ├─ .scrollbar-viewport(flex-1 + overflow)      ← 真正的滚动容器，放 children
 *     └─ .scrollbar-rail(absolute right gap)          ← 兄弟层，不参与滚动
 *          └─ .scrollbar-thumb(absolute top 由 JS 算)
 *
 * 为什么 thumb 必须放在滚动容器外的 rail 里：
 *   把 absolute 定位的 thumb 直接挂进滚动容器时，Chrome 会把它算进
 *   滚动内容坐标系 —— 一滚动 thumb 就被带走（offsetTop 对、rect 错）。
 *   rail 是 wrapper 的兄弟层、不滚动，thumb 位置才稳定。
 *
 * 为什么用 overlay 而不是原生滚动条：
 *   Electron 无边框窗口右缘是系统 resize 热区，鼠标移到那里光标变成
 *   调窗口大小指针，原生滚动条又正好贴最右缘 —— 永远点不中。
 *   rail 距右缘留 gap（默认 8px，低于 resize 热区宽度），鼠标到 thumb
 *   上时已离开窗口边缘；overlay 也不占内容宽度，悬停加宽不挤压内容。
 */

export interface ScrollbarProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  /** 外壳（wrapper）类：高度、flex 布局、背景、边框等 */
  className?: string
  /** 内容（viewport）类：内边距、内容自身的 flex/间距等 */
  contentClassName?: string
  /** rail（含 thumb）距容器右缘的间隙。默认 8px —— 避开 Electron resize 热区 */
  gap?: number
}

const THUMB_MIN = 44

export function Scrollbar({
  children,
  className,
  contentClassName,
  gap = 8,
  ...rest
}: ScrollbarProps) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const [thumb, setThumb] = useState({ height: 0, top: 0 })
  const dragRef = useRef<{ startY: number; startTop: number } | null>(null)
  const thumbHeightRef = useRef(0)

  /* 计算 thumb 尺寸/位置。scrollTop、容器尺寸、内容尺寸变化时调用 */
  const update = useCallback(() => {
    const el = viewportRef.current
    if (!el) return
    const sh = el.scrollHeight
    const ch = el.clientHeight
    const maxTop = sh - ch
    if (maxTop <= 0) {
      thumbHeightRef.current = 0
      setThumb({ height: 0, top: 0 })
      return
    }
    const h = Math.max((ch / sh) * ch, THUMB_MIN)
    thumbHeightRef.current = h
    const top = (el.scrollTop / maxTop) * (ch - h)
    setThumb({ height: h, top })
  }, [])

  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    update()
    el.addEventListener('scroll', update, { passive: true })
    /* 内容异步渲染 / 容器尺寸变化时也要重算 */
    const ro = new ResizeObserver(() => update())
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', update)
      ro.disconnect()
    }
  }, [update])

  /* 拖拽 thumb：按下后跟随鼠标计算 scrollTop（监听在按下时注册、松开时移除） */
  const handleThumbDown = (e: React.MouseEvent) => {
    e.preventDefault()
    const el = viewportRef.current
    if (!el) return
    dragRef.current = { startY: e.clientY, startTop: el.scrollTop }
    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return
      const sh = el.scrollHeight
      const ch = el.clientHeight
      const maxTop = sh - ch
      const h = thumbHeightRef.current
      const ratio = maxTop / (ch - h || 1)
      el.scrollTop = dragRef.current.startTop + (ev.clientY - dragRef.current.startY) * ratio
    }
    const onUp = () => {
      dragRef.current = null
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  return (
    <div className={cn('scrollbar', className)} {...rest}>
      <div ref={viewportRef} className={cn('scrollbar-viewport', contentClassName)}>
        {children}
      </div>
      {thumb.height > 0 && (
        <div className="scrollbar-rail" style={{ right: gap }}>
          <div
            className="scrollbar-thumb"
            style={{ height: thumb.height, top: thumb.top }}
            onMouseDown={handleThumbDown}
          />
        </div>
      )}
    </div>
  )
}

export default Scrollbar
