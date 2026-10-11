import { useAtmosphereStore } from '@/store/useAtmosphereStore'
import { cn } from '@/lib/utils'

/** 可选全局底层壁纸；遮罩高不透明，内容/侧栏不透图（console 皮） */
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
