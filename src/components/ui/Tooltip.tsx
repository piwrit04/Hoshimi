import React, { useState, useRef, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { mergeRefs } from '@/lib/merge-refs';
import '@/styles/tooltip.css';

type Position = 'top' | 'bottom' | 'left' | 'right';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement<{
    onMouseEnter?: (e: React.MouseEvent) => void;
    onMouseLeave?: (e: React.MouseEvent) => void;
    onFocus?: (e: React.FocusEvent) => void;
    onBlur?: (e: React.FocusEvent) => void;
    ref?: React.Ref<HTMLElement>;
  }>;
  position?: Position;
  className?: string;
  variant?: 'default' | 'card';
  delay?: number;
}

/*
 * Tooltip
 *
 * 用 createPortal 挂到 body，position: fixed 定位。
 * 箭头始终指向目标元素中心（top/bottom 水平居中，left/right 垂直居中）。
 * 不用 framer-motion，纯 CSS opacity 过渡，避免 scale 影响 getBoundingClientRect。
 */
export const Tooltip = ({
  content,
  children,
  position = 'top',
  className,
  variant = 'default',
  delay = 200,
}: TooltipProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);

  const triggerRef = useRef<HTMLElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const calculatePosition = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const gap = 10;

    let top = 0;
    let left = 0;

    switch (position) {
      case 'top':
        top = triggerRect.top - tooltipRect.height - gap;
        left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
        break;
      case 'bottom':
        top = triggerRect.bottom + gap;
        left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
        break;
      case 'left':
        top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
        left = triggerRect.left - tooltipRect.width - gap;
        break;
      case 'right':
        top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
        left = triggerRect.right + gap;
        break;
    }

    // 视口边界约束
    left = Math.max(gap, Math.min(left, vw - tooltipRect.width - gap));
    top = Math.max(gap, Math.min(top, vh - tooltipRect.height - gap));

    setCoords({ top, left });
  }, [position]);

  const handleMouseEnter = () => {
    timerRef.current = setTimeout(() => {
      setMounted(true);
      // 等下一帧 tooltip 渲染后再定位，然后淡入
      requestAnimationFrame(() => {
        calculatePosition();
        requestAnimationFrame(() => setIsVisible(true));
      });
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsVisible(false);
    // 等淡出动画结束再卸载
    setTimeout(() => setMounted(false), 200);
  };

  // 窗口滚动/缩放时重新定位
  useLayoutEffect(() => {
    if (!mounted) return;
    calculatePosition();
    const onReposition = () => calculatePosition();
    window.addEventListener('scroll', onReposition, true);
    window.addEventListener('resize', onReposition);
    return () => {
      window.removeEventListener('scroll', onReposition, true);
      window.removeEventListener('resize', onReposition);
    };
  }, [mounted, calculatePosition]);

  if (!content) return children;

  const childRef = (children as React.ReactElement & { ref?: React.Ref<HTMLElement> }).ref
    ?? (children.props as { ref?: React.Ref<HTMLElement> }).ref;

  const childWithEvents = React.cloneElement(children, {
    ...children.props,
    ref: mergeRefs(triggerRef, childRef),
    onMouseEnter: (e: React.MouseEvent) => {
      handleMouseEnter();
      children.props.onMouseEnter?.(e);
    },
    onMouseLeave: (e: React.MouseEvent) => {
      handleMouseLeave();
      children.props.onMouseLeave?.(e);
    },
    // 键盘可达性：Tab 聚焦时也显示 tooltip（参照 Radix Tooltip 的行为）
    onFocus: (e: React.FocusEvent) => {
      handleMouseEnter();
      children.props.onFocus?.(e);
    },
    onBlur: (e: React.FocusEvent) => {
      handleMouseLeave();
      children.props.onBlur?.(e);
    },
  } as never);

  return (
    <>
      {childWithEvents}
      {mounted &&
        createPortal(
          <div
            ref={tooltipRef}
            role="tooltip"
            style={{
              position: 'fixed',
              top: coords.top,
              left: coords.left,
              zIndex: 'var(--z-tooltip)',
            }}
            className={cn(
              'ed-tooltip',
              isVisible && 'ed-tooltip--visible',
              `ed-tooltip--${position}`,
              variant === 'card' && 'ed-tooltip--multiline',
              className
            )}
          >
            {content}
          </div>,
          document.body
        )}
    </>
  );
};
