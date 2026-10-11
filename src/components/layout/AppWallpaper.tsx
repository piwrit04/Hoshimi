import { useAtmosphereStore } from '@/store/useAtmosphereStore'
import { cn } from '@/lib/utils'

/** 可选全局底层壁纸；默认关（实心 console）。开时遮罩仍高，内容可读。 */
export function AppWallpaper({ className }: { className?: string }) {
  const enabled = useAtmosphereStore((s) => s.wallpaperEnabled)
  const wallpaperPath = useAtmosphereStore((s) => s.wallpaperPath)

  if (!enabled) return null

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
