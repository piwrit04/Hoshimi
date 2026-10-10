import { useState, useRef, useEffect, memo } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholder?: string;
  loading?: 'lazy' | 'eager';
  sizes?: string;
  fetchPriority?: 'high' | 'low' | 'auto';
  /**
   * When devicePixelRatio >= 1.5, try to load a high-DPI variant by inserting this suffix before the file extension.
   * For example: image.png -> image@2x.png. If absent, falls back to normal.
   */
  highDpiSuffix?: string; // default '@2x'
}

export const OptimizedImage = memo(function OptimizedImage({
  src,
  alt,
  className,
  placeholder,
  loading = 'lazy',
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  fetchPriority = 'auto',
  highDpiSuffix = '@2x',
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(loading === 'eager');
  const [imgSrc, setImgSrc] = useState(placeholder || '');
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

  const toWebP = (path: string) => path.replace(/\.(png|jpg|jpeg)$/i, '.webp');
  const insertSuffix = (path: string, suffix: string) =>
    path.replace(/(\.[a-zA-Z0-9]+)$/i, `${suffix}$1`);

  const supportsWebP = (): boolean => {
    try {
      const canvas = document.createElement('canvas');
      return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    } catch {
      return false;
    }
  };

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (loading === 'eager') return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '50px' }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
      observerRef.current = observer;
    }

    return () => {
      observer.disconnect();
    };
  }, [loading]);

  // Load image when in view with WebP and HiDPI probing
  useEffect(() => {
    if (!isInView || !src) return;

    const tryOrder: string[] = [];
    const webpOk = supportsWebP();

    if (dpr >= 1.5 && highDpiSuffix) {
      const hi = insertSuffix(src, highDpiSuffix);
      if (webpOk) tryOrder.push(toWebP(hi));
      tryOrder.push(hi);
    }

    if (webpOk) tryOrder.push(toWebP(src));
    tryOrder.push(src);

    let cancelled = false;

    const loadSequentially = async () => {
      for (const candidate of tryOrder) {
        try {
          await new Promise<void>((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve();
            img.onerror = () => reject(new Error('load failed'));
            img.src = candidate;
          });
          if (!cancelled) {
            setImgSrc(candidate);
            setIsLoaded(true);
          }
          return;
        } catch {
          // Try next candidate
        }
      }
      // If all failed, fallback to original src anyway
      if (!cancelled) {
        setImgSrc(src);
        setIsLoaded(true);
      }
    };

    loadSequentially();

    return () => {
      cancelled = true;
    };
  }, [isInView, src, dpr, highDpiSuffix]);

  return (
    <img
      ref={imgRef}
      src={imgSrc || src}
      alt={alt}
      loading={loading}
      sizes={sizes}
      decoding="async"
      fetchPriority={fetchPriority}
      className={cn(
        'transition-opacity duration-300 img-hq',
        isLoaded ? 'opacity-100' : 'opacity-0',
        className
      )}
      style={{ imageRendering: 'auto' }}
    />
  );
});
