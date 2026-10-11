import { useAtmosphereStore } from '@/store/useAtmosphereStore'
import { cn } from '@/lib/utils'

/** 全站固定壁纸 + 深色遮罩（Liver2Go 壳） */
export function AppWallpaper({ className }: { className?: string }) {
  const wallpaperPath = useAtmosphereStore((s) => s.wallpaperPath)

  return (
    <div
      className={cn('pointer-events-none fixed inset-0 z-0 overflow-hidden', className)}
      aria-hidden
    >
      <img
        src={wallpaperPath || '/wallpapers/default.jpg'}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        decoding="async"
        onError={(e) => {
          const el = e.currentTarget
          if (!el.src.endsWith('/wallpapers/default.jpg')) {
            el.src = '/wallpapers/default.jpg'
          }
        }}
      />
      <div className="absolute inset-0 bg-slate-950/55 backdrop-blur-[2px]" />
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(80% 50% at 50% 100%, rgba(255,107,157,0.12) 0%, transparent 55%), radial-gradient(60% 40% at 10% 0%, rgba(199,121,208,0.1) 0%, transparent 50%)',
        }}
      />
    </div>
  )
}
