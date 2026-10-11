import { useAtmosphereStore } from '@/store/useAtmosphereStore'
import { cn } from '@/lib/utils'

/** 内容区固定壁纸（自标题栏下缘起，含侧栏下方；不压顶栏）+ 深浅实色遮罩 */
export function AppWallpaper({ className }: { className?: string }) {
  const wallpaperPath = useAtmosphereStore((s) => s.wallpaperPath)

  return (
    <div
      className={cn(
        'l2g-wallpaper pointer-events-none fixed top-14 inset-x-0 bottom-0 z-0 overflow-hidden',
        className,
      )}
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
      <div className="l2g-wallpaper__veil" />
      <div className="l2g-wallpaper__tint" />
    </div>
  )
}
