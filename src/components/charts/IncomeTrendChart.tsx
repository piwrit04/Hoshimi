import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import type { TrendPoint, TrendUnit } from '@/domain/dashboard'

const UNITS: { key: TrendUnit; label: string }[] = [
  { key: 'day', label: '日' },
  { key: 'week', label: '周' },
  { key: 'month', label: '月' },
]

function money(n: number) {
  return `¥${n.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}`
}

/** 轻量 SVG 折线面积图，跟主题色走 */
export function IncomeTrendChart({
  points,
  unit,
  onUnitChange,
}: {
  points: TrendPoint[]
  unit: TrendUnit
  onUnitChange: (u: TrendUnit) => void
}) {
  const [hover, setHover] = useState<number | null>(null)
  const W = 560
  const H = 220
  const padL = 8
  const padR = 8
  const padT = 16
  const padB = 28

  const { path, area, dots, maxY } = useMemo(() => {
    const vals = points.map((p) => p.payout)
    const maxY = Math.max(1, ...vals)
    const n = Math.max(1, points.length - 1)
    const xs = points.map((_, i) => padL + ((W - padL - padR) * i) / n)
    const ys = vals.map((v) => padT + (H - padT - padB) * (1 - v / maxY))
    const line = points
      .map((_, i) => `${i === 0 ? 'M' : 'L'}${xs[i].toFixed(1)},${ys[i].toFixed(1)}`)
      .join(' ')
    const area =
      line +
      ` L${xs[xs.length - 1].toFixed(1)},${(H - padB).toFixed(1)} L${xs[0].toFixed(1)},${(H - padB).toFixed(1)} Z`
    const dots = xs.map((x, i) => ({ x, y: ys[i], p: points[i] }))
    return { path: line, area, dots, maxY }
  }, [points])

  const active = hover != null ? dots[hover] : null
  const total = points.reduce((s, p) => s + p.payout, 0)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <i className="h-[3px] w-4 rounded-full bg-brand" />
            到手
          </span>
          <span className="opacity-50">·</span>
          <span>
            合计 <b className="text-foreground tabular-nums">{money(total)}</b>
          </span>
        </div>
        <div className="l2g-seg" role="tablist" aria-label="走势粒度">
          {UNITS.map((u) => (
            <button
              key={u.key}
              type="button"
              onClick={() => onUnitChange(u.key)}
              role="tab"
              aria-selected={unit === u.key}
              className={cn('l2g-seg__btn', unit === u.key && 'l2g-seg__btn--on')}
            >
              {u.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-[220px] block"
          preserveAspectRatio="none"
          onMouseLeave={() => setHover(null)}
        >
          {/* 网格 */}
          {[0.25, 0.5, 0.75].map((t) => {
            const y = padT + (H - padT - padB) * t
            return (
              <line
                key={t}
                x1={padL}
                x2={W - padR}
                y1={y}
                y2={y}
                className="stroke-border"
                strokeWidth={1}
                strokeOpacity={0.5}
              />
            )
          })}
          <path d={area} className="fill-brand" fillOpacity={0.12} />
          <path
            d={path}
            className="stroke-brand"
            fill="none"
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {dots.map((d, i) => (
            <circle
              key={d.p.key}
              cx={d.x}
              cy={d.y}
              r={hover === i ? 5 : 3}
              className="fill-brand stroke-card"
              strokeWidth={2}
              onMouseEnter={() => setHover(i)}
              style={{ cursor: 'pointer' }}
            />
          ))}
          {/* 底部标签（抽稀） */}
          {dots.map((d, i) => {
            const show =
              points.length <= 8 || i === 0 || i === dots.length - 1 || i % Math.ceil(points.length / 6) === 0
            if (!show) return null
            return (
              <text
                key={`l-${d.p.key}`}
                x={d.x}
                y={H - 8}
                textAnchor={i === 0 ? 'start' : i === dots.length - 1 ? 'end' : 'middle'}
                className="fill-muted-foreground"
                fontSize={10}
              >
                {d.p.label}
              </text>
            )
          })}
        </svg>
        {active ? (
          <div className="pointer-events-none absolute left-3 top-3 rounded-lg border border-border/60 bg-card/95 px-3 py-2 text-xs shadow-md backdrop-blur-sm">
            <div className="font-semibold text-foreground">{active.p.label}</div>
            <div className="mt-1 tabular-nums text-muted-foreground">
              到手 <b className="text-foreground">{money(active.p.payout)}</b>
              <span className="mx-1 opacity-40">·</span>
              营收 {money(active.p.revenue)}
              <span className="mx-1 opacity-40">·</span>
              {active.p.count} 单
            </div>
            <div className="sr-only">max {maxY}</div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
