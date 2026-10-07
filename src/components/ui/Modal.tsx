import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import ReactDOM from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  showClose?: boolean;
}

export const Modal = ({ isOpen, onClose, title, children, footer, className, showClose = true }: ModalProps) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  return ReactDOM.createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            aria-hidden="true"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={cn(
              /*
               * ⚠️ 原来是 "glass-card chamfer-md" —— 这两个类**全项目都没有定义**
               * （glass-card 是玻璃拟态、chamfer-md 是切角，都是早期原型里的东西，
               * 跟着 _deprecated/ 一起没了）。所以弹窗实际上是无圆角无边框的裸块。
               *
               * 这里换成真实存在的类：
               *   bg-card / border-border / rounded-lg  —— 主题 token，深浅都对
               *   shadow-2                                —— theme.css 里的浮层阴影
               */
              "relative w-full max-w-lg bg-card text-card-foreground border border-border rounded-lg shadow-2 overflow-hidden flex flex-col max-h-[90vh]",
              className
            )}
            role="dialog"
            aria-modal="true"
          >
            {/* Header
                ⚠️ 原来是 border-white/10 + bg-white/5 —— 只在深色下成立，
                浅色模式下 header 是一块看不见的白撞白。改成 token。 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-secondary/40">
              <h3 className="text-lg font-bold text-foreground">{title}</h3>
              {showClose && (
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="关闭"
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors no-drag"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 px-6 py-6 overflow-y-auto custom-scrollbar">
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div className="px-6 py-4 border-t border-border bg-secondary/40 flex justify-end gap-3">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
