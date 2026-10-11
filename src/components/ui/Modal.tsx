import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import ReactDOM from 'react-dom';
import { Scrollbar } from './Scrollbar';
import { pushOverlay } from '@/lib/overlay-stack';
import { modalConfirm, type ModalConfirmOptions } from './ModalConfirm';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  showClose?: boolean;
}

function ModalImpl({ isOpen, onClose, title, children, footer, className, showClose = true }: ModalProps) {
  const onCloseRef = React.useRef(onClose);
  const panelRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  /* Esc + 滚动锁交给浮层栈：只关最顶一层，并锁住 data-scroll-root 真实滚动区 */
  useEffect(() => {
    if (!isOpen) return;
    return pushOverlay(() => onCloseRef.current());
  }, [isOpen]);

  /* 焦点陷阱（参照 Radix Dialog / Naive Modal） */
  useEffect(() => {
    if (!isOpen) return;
    const root = panelRef.current;
    if (!root) return;

    const focusables = () =>
      Array.from(
        root.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => el.offsetParent !== null);

    const first = focusables()[0];
    first?.focus();

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const list = focusables();
      if (list.length === 0) return;
      const firstEl = list[0];
      const lastEl = list[list.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === firstEl || !root.contains(document.activeElement)) {
          e.preventDefault();
          lastEl.focus();
        }
      } else if (document.activeElement === lastEl || !root.contains(document.activeElement)) {
        e.preventDefault();
        firstEl.focus();
      }
    };
    document.addEventListener('keydown', handleTab);
    return () => document.removeEventListener('keydown', handleTab);
  }, [isOpen]);

  return ReactDOM.createPortal(
    <AnimatePresence>
      {isOpen && (
        <div key="modal" className="fixed inset-0 flex items-center justify-center p-4 sm:p-6" style={{ zIndex: 'var(--z-modal)' }}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            aria-hidden="true"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "relative w-full max-w-lg bg-card text-card-foreground border border-border rounded-xl shadow-2 overflow-hidden flex flex-col max-h-[90vh]",
              className
            )}
            role="dialog"
            aria-modal="true"
            ref={panelRef}
          >
            <div className="flex h-14 shrink-0 items-center justify-between px-6 border-b border-border">
              <h3 className="text-base font-semibold leading-6 text-foreground">{title}</h3>
              {showClose && (
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="关闭"
                  className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors no-drag"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <Scrollbar className="flex-1 min-h-0" contentClassName="px-6 py-6">
              {children}
            </Scrollbar>

            {footer && (
              <div className="flex h-16 shrink-0 items-center justify-end gap-2 px-6 border-t border-border">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

export const Modal = Object.assign(ModalImpl, {
  /** 命令式确认框。需在布局里挂 <ModalConfirmHost />。 */
  confirm: modalConfirm,
})
export default Modal
export type { ModalConfirmOptions }
