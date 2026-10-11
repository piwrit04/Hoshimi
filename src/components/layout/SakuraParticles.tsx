import { useMemo } from 'react'
import { useAtmosphereStore } from '@/store/useAtmosphereStore'

const COUNT = 18

/** 氛围粒子；默认关。prefers-reduced-motion 时不渲染。 */
export function SakuraParticles() {
  const on = useAtmosphereStore((s) => s.particlesEnabled)
  const petals = useMemo(
    () =>
      Array.from({ length: COUNT }, (_, i) => ({
        id: i,
        left: ((i * 37) % 100) + (i % 5),
        delay: (i * 0.7) % 10,
        duration: 12 + (i % 7),
        size: 8 + (i % 6),
      })),
    [],
  )

  if (!on) return null
  if (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    return null
  }

  return (
    <div className="l2g-sakura" aria-hidden>
      {petals.map((p) => (
        <span
          key={p.id}
          className="l2g-sakura__petal"
          style={{
            left: `${p.left}%`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            width: p.size,
            height: p.size,
          }}
        />
      ))}
    </div>
  )
}
