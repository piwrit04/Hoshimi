import React, { useState, useRef, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import '@/styles/tooltip.css';

type Position = 'top' | 'bottom' | 'left' | 'right';

interface TooltipProps {
  content: React.ReactNode;
  /*
   * ⚠️ 泛型参数是必须的（工具箱原文是裸的 React.ReactElement）。
   * 裸类型下 `children.props` 是 unknown，下面两行取 onMouseEnter/onMouseLeave 会报错。
   * 这只是类型层面的收窄，运行时行为完全一样。
   */
  children: React.ReactElement<{ onMouseEnter?: (e: React.MouseEvent) => void; onMouseLeave?: (e: React.MouseEvent) => void }>;
  position?: Position;
  className?: string;
  variant?: 'default' | 'card';
  delay?: number;
}

export const Tooltip = ({
  content,
  children,
  position = 'top',
  className,
  variant = 'default',
  delay = 200
}: TooltipProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const calculatePosition = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) return;
    
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // 如果 trigger 没有尺寸（比如绝对定位元素），尝试获取第一个子元素
    let targetRect = triggerRect;
    if (triggerRect.width === 0 && triggerRect.height === 0) {
      const firstChild = triggerRef.current.firstElementChild as HTMLElement;
      if (firstChild) {
        targetRect = firstChild.getBoundingClientRect();
      }
    }

    let newTop = 0;
    let newLeft = 0;
    const gap = 8;

    switch (position) {
      case 'top':
        newTop = targetRect.top - tooltipRect.height - gap;
        newLeft = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
        break;
      case 'bottom':
        newTop = targetRect.bottom + gap;
        newLeft = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
        break;
      case 'left':
        newTop = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
        newLeft = targetRect.left - tooltipRect.width - gap;
        break;
      case 'right':
        newTop = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
        newLeft = targetRect.right + gap;
        break;
    }

    // Boundary checks
    if (newLeft < gap) newLeft = gap;
    if (newLeft + tooltipRect.width > viewportWidth - gap) {
      newLeft = viewportWidth - tooltipRect.width - gap;
    }
    if (newTop < gap) newTop = gap;
    if (newTop + tooltipRect.height > viewportHeight - gap) {
      newTop = viewportHeight - tooltipRect.height - gap;
    }

    setCoords({ top: newTop, left: newLeft });
  }, [position]);

  const handleMouseEnter = () => {
    calculatePosition();
    timerRef.current = setTimeout(() => {
      setIsVisible(true);
      requestAnimationFrame(calculatePosition);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsVisible(false);
  };

  useLayoutEffect(() => {
    if (isVisible) {
      calculatePosition();
    }
  }, [isVisible, calculatePosition]);

  if (!content) return children;

  const positionClass = {
    top: '',
    bottom: 'ed-tooltip--bottom',
    left: 'ed-tooltip--left',
    right: 'ed-tooltip--right',
  }[position];

  // 克隆子元素，添加 ref 和事件处理。
  // `as never` 只是为了让 TS 接受把 ref 塞进 cloneElement —— 运行时行为和工具箱原文件一致。
  const childWithRef = React.cloneElement(children, {
    ...children.props,
    ref: (node: HTMLElement | null) => {
      // 将 ref 传递给 triggerRef
      if (node && triggerRef.current !== node) {
        (triggerRef as React.MutableRefObject<HTMLElement | null>).current = node;
      }
    },
    onMouseEnter: (e: React.MouseEvent) => {
      handleMouseEnter();
      children.props.onMouseEnter?.(e);
    },
    onMouseLeave: (e: React.MouseEvent) => {
      handleMouseLeave();
      children.props.onMouseLeave?.(e);
    },
  } as never);

  return (
    <>
      {childWithRef}
      {createPortal(
        <AnimatePresence>
          {isVisible && (
            <motion.div
              ref={tooltipRef}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              style={{
                position: 'fixed',
                top: coords.top,
                left: coords.left,
                zIndex: 9999,
              }}
              className={cn(
                "ed-tooltip",
                "ed-tooltip--visible",
                positionClass,
                variant === 'card' && "ed-tooltip--multiline",
                className
              )}
            >
              {content}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
};
