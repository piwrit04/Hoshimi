import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

export function PageBackground({ className }: { className?: string }) {
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setLoaded(false)
  }, [])

  return (
    <div className={cn('fixed inset-0 -z-10 overflow-hidden', className)}>
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(135deg, hsl(var(--bg-gradient-from)), hsl(var(--bg-gradient-via)), hsl(var(--bg-gradient-to)))`,
        }}
      />

      <img
        src="./assets/backgrounds/background.jpg"
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        className={cn(
          'absolute inset-0 h-full w-full object-cover transition-opacity duration-500',
          loaded ? 'opacity-100' : 'opacity-0'
        )}
      />

      {/* 深蓝黑色遮罩层 - 正片叠底，不透明度25%，6px高斯模糊 */}
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: 'rgba(10, 12, 26, 0.25)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          mixBlendMode: 'multiply'
        }}
      />
    </div>
  )
}
