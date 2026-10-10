import { useEffect, useRef, useState } from 'react'
import { yuan } from '@/lib/format'

function reduced() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

/** 本次打开应用后的第一屏才从 0 滚；之后回到页面直接显示，数值变化时再过渡。 */
let firstCountDone = false

export function useCountUp(target: number, duration = 900) {
  const [shown, setShown] = useState(() => (reduced() || firstCountDone ? target : 0))
  const current = useRef(shown)
  useEffect(() => {
    firstCountDone = true
  }, [])
  useEffect(() => {
    if (reduced()) {
      current.current = target
      setShown(target)
      return
    }
    const start = performance.now()
    const from = current.current
    if (from === target) return
    let raf = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      const v = from + (target - from) * eased
      current.current = v
      setShown(v)
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  return shown
}

export function CountUp({
  value,
  money = false,
}: {
  value: number
  money?: boolean
}) {
  const n = useCountUp(value)
  if (money) return <>{yuan(Math.round(n * 100) / 100)}</>
  return <>{Math.round(n).toLocaleString('zh-CN')}</>
}
