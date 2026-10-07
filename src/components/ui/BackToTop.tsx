import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp } from 'lucide-react';
import { cn } from '../../lib/utils';

interface BackToTopProps {
  scrollRef: React.RefObject<HTMLElement>;
}

export const BackToTop = ({ scrollRef }: BackToTopProps) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    const toggleVisibility = () => {
      if (element.scrollTop > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    element.addEventListener('scroll', toggleVisibility);
    return () => element.removeEventListener('scroll', toggleVisibility);
  }, [scrollRef]);

  const scrollToTop = () => {
    scrollRef.current?.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          onClick={scrollToTop}
          className={cn(
            "fixed bottom-8 right-8 z-40 p-3 rounded-full shadow-lg",
            "bg-primary text-primary-foreground",
            "border border-white/20 backdrop-blur-sm",
            "transition-all hover:shadow-xl hover:-translate-y-1"
          )}
          aria-label="Back to top"
        >
          <ArrowUp className="w-6 h-6" />
        </motion.button>
      )}
    </AnimatePresence>
  );
};
