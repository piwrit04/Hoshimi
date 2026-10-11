import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  BarChart3,
  CalendarClock,
  ChevronDown,
  CircleDollarSign,
  Hourglass,
  PlusCircle,
  ShoppingBag,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { yuan as money, yuan2 } from '@/lib/format'
import { CountUp } from '@/lib/count-up'
import { useOrdersStore } from '@/store/useOrdersStore'
import { useNewOrderStore } from '@/store/useNewOrderStore'
import {
  dashboard,
  incomeTrend,
  incomeSmartTip,
  type TrendUnit,
  type ExpiringItem,
} from '@/domain/dashboard'
import { IncomeTrendChart } from '@/components/charts/IncomeTrendChart'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Tag } from '@/components/ui/data'
import { NO_PAYOUT, payoutVoid } from '@/domain/status'
import type { Order, OrderStatus } from '@/domain/order'

/*
 * 首页两整页 snap：
 *   page1 = 全幅问候
 *   page2 = 数据中心（真数 KPI + 走势 + 下钻），不塞订单表
 */

type KpiKey = 'today' | 'active' | 'month' | 'due'

const statusTone: Record<OrderStatus, 'brand' | 'warning' | 'success' | 'danger'> = {
  待处理: 'warning',
  进行中: 'brand',
  已完成: 'success',
  已退款: 'danger',
  已取消: 'danger',
}

function orderTitle(o: Order) {
  if (o.type === '托管') return `${o.custodyKind ?? '托管'} · ${o.settleKind ?? ''}`
  return o.items.map((i) => i.product).join('、') || '—'
}

export default function Dashboard() {
  const orders = useOrdersStore((s) => s.orders)
  const customers = useOrdersStore((s) => s.customers)
  const settings = useOrdersStore((s) => s.settings)
  const openNewOrder = useNewOrderStore((s) => s.open)
  const openEdit = useNewOrderStore((s) => s.openEdit)
  const navigate = useNavigate()

  const [typed, setTyped] = useState('')
  const [clock, setClock] = useState(() => formatClock())
  const [unit, setUnit] = useState<TrendUnit>('day')
  const [kpiOpen, setKpiOpen] = useState<KpiKey | null>(null)

  const m = useMemo(() => dashboard({ orders, customers, settings }), [orders, customers, settings])
  const trend = useMemo(
    () => incomeTrend({ orders, customers, settings }, unit),
    [orders, customers, settings, unit],
  )
  const dayTrend = useMemo(
    () => incomeTrend({ orders, customers, settings }, 'day'),
    [orders, customers, settings],
  )
  const tip = useMemo(() => incomeSmartTip(m.kpis, dayTrend), [m.kpis, dayTrend])
  const k = m.kpis

  useEffect(() => {
    const full = m.hello
    setTyped('')
    let i = 0
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      setTyped(full)
      return
    }
    const id = window.setInterval(() => {
      i += 1
      setTyped(full.slice(0, i))
      if (i >= full.length) window.clearInterval(id)
    }, 70)
    return () => window.clearInterval(id)
  }, [m.hello])

  useEffect(() => {
    const id = window.setInterval(() => setClock(formatClock()), 1000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    const root = document.querySelector('[data-scroll-root]') as HTMLElement | null
    if (!root) return
    root.classList.add('l2g-home-snap')
    root.scrollTop = 0
    return () => {
      root.classList.remove('l2g-home-snap')
    }
  }, [])

  const scrollToPage2 = () => {
    const root = document.querySelector('[data-scroll-root]') as HTMLElement | null
    const target = document.getElementById('dashboard-page2')
    if (root && target) {
      const top =
        target.getBoundingClientRect().top -
        root.getBoundingClientRect().top +
        root.scrollTop
      root.scrollTo({ top, behavior: 'smooth' })
    }
  }

  const modalMeta: Record<KpiKey, { title: string; hint: string; moreTo: string; moreLabel: string }> = {
    today: {
      title: '今日到手',
      hint: '今天「已完成」订单的到手明细',
      moreTo: '/orders?mode=已完成',
      moreLabel: '去订单 · 已完成',
    },
    active: {
      title: '进行中',
      hint: '当前进行中的订单',
      moreTo: '/orders?mode=进行中',
      moreLabel: '去订单 · 进行中',
    },
    month: {
      title: '本月新单',
      hint: '本月创建的订单',
      moreTo: '/orders?period=month',
      moreLabel: '去订单 · 本月',
    },
    due: {
      title: '托管快到期',
      hint: `含未设到期日 · ${m.remindDays} 天内到期的进行中/待处理托管`,
      moreTo: '/todo?tab=due',
      moreLabel: '去待办 · 到期',
    },
  }

  const metrics = [
    { label: '服务天数', value: k.serviceDays, unit: '天', money: false },
    { label: '已成交', value: k.completedTotal, unit: '', money: false },
    { label: '累计到手', value: k.payoutTotal, unit: '', money: true },
    { label: '服务用户', value: k.customers, unit: '位', money: false },
  ]

  const kpiCards: {
    key: KpiKey
    label: string
    icon: LucideIcon
    value: number
    money?: boolean
    foot: string
    warn?: boolean
  }[] = [
    {
      key: 'today',
      label: '今日到手',
      icon: CircleDollarSign,
      value: k.payoutToday,
      money: true,
      foot: `本月 ${money(k.payoutThisMonth)}`,
    },
    {
      key: 'active',
      label: '进行中',
      icon: Hourglass,
      value: k.inProgress,
      foot: `待处理 ${k.waiting} 单`,
    },
    {
      key: 'month',
      label: '本月新单',
      icon: ShoppingBag,
      value: k.newThisMonth,
      foot: `流水 ${money(k.newThisMonthAmount)}`,
    },
    {
      key: 'due',
      label: '托管快到期',
      icon: CalendarClock,
      value: k.expiringCount,
      foot: `托管中 ${k.custodyActive} · ${m.remindDays} 天内`,
      warn: k.expiringCount > 0,
    },
  ]

  return (
    <div className="ds-page ds-page--l2g">
      <section className="l2g-snap-page l2g-hero ds-rise" aria-label="问候">
        <h1 className="l2g-hero__title">
          {typed}
          <span className="l2g-hero__caret" aria-hidden />
        </h1>
        <p className="l2g-hero__meta">
          {m.todayLabel}
          {m.usingTest ? ' · 当前为示例数据' : ''}
        </p>
        <div className="l2g-hero__actions">
          <Button variant="primary" icon={PlusCircle} onClick={openNewOrder}>
            新建订单
          </Button>
        </div>
        <button type="button" className="l2g-hero__scroll" onClick={scrollToPage2}>
          <span>向下滚动查看数据</span>
          <ChevronDown size={20} />
        </button>
      </section>

      <section
        id="dashboard-page2"
        className="l2g-snap-page l2g-datacenter ds-rise"
        aria-label="数据中心"
      >
        <div className="l2g-datacenter__inner">
          <header className="l2g-datacenter__clock">
            <div className="l2g-datacenter__date">{clock.date}</div>
            <div className="l2g-datacenter__time">{clock.time}</div>
            <p className="l2g-datacenter__msg">{clock.message}</p>
          </header>

          <nav className="l2g-datacenter__nav" aria-label="快捷入口">
            <Link to="/orders" className="l2g-capsule">
              订单
            </Link>
            <Link to="/customers" className="l2g-capsule">
              客户
            </Link>
            <Link to="/todo" className="l2g-capsule">
              待办
            </Link>
            <Link to="/todo?tab=due" className="l2g-capsule">
              到期{k.expiringCount ? ` ${k.expiringCount}` : ''}
            </Link>
          </nav>

          <div className="l2g-datacenter__metrics">
            {metrics.map((s) => (
              <div key={s.label} className="l2g-metric">
                <div className="l2g-metric__value">
                  {s.money ? (
                    <CountUp value={s.value} money />
                  ) : (
                    <>
                      <CountUp value={s.value} />
                      {s.unit ? <span className="l2g-metric__unit">{s.unit}</span> : null}
                    </>
                  )}
                </div>
                <div className="l2g-metric__label">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="l2g-datacenter__section">
            <h2 className="l2g-datacenter__heading">数据一览</h2>
            <div className="l2g-kpi-grid">
              {kpiCards.map((slot) => {
                const Icon = slot.icon
                return (
                  <button
                    key={slot.key}
                    type="button"
                    className={cn('l2g-kpi-card l2g-kpi-card--link', slot.warn && 'l2g-kpi-card--warn')}
                    onClick={() => setKpiOpen(slot.key)}
                    title="点击查看明细"
                  >
                    <span className="l2g-kpi-card__icon" aria-hidden>
                      <Icon size={22} strokeWidth={1.75} />
                    </span>
                    <div className="l2g-kpi-card__value">
                      <CountUp value={slot.value} money={slot.money} />
                    </div>
                    <div className="l2g-kpi-card__label">{slot.label}</div>
                    <div className="l2g-kpi-card__foot">{slot.foot}</div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="l2g-datacenter__section l2g-datacenter__chart">
            <div className="l2g-glass-panel">
              <div className="l2g-glass-panel__head">
                <div>
                  <h2 className="l2g-datacenter__heading l2g-datacenter__heading--inline">
                    收入走势
                  </h2>
                  <p className="l2g-glass-panel__desc">{tip.text}</p>
                </div>
              </div>
              {k.completedTotal === 0 && trend.every((p) => p.payout === 0) ? (
                <div className="l2g-chart-empty">
                  <BarChart3 size={36} strokeWidth={1.5} className="l2g-chart-empty__icon" />
                  <p className="l2g-chart-empty__title">暂无走势数据</p>
                  <p className="l2g-chart-empty__desc">完成第一单后，这里会显示到手趋势</p>
                </div>
              ) : (
                <IncomeTrendChart points={trend} unit={unit} onUnitChange={setUnit} />
              )}
            </div>
          </div>
        </div>
      </section>

      <Modal
        isOpen={kpiOpen != null}
        onClose={() => setKpiOpen(null)}
        title={kpiOpen ? modalMeta[kpiOpen].title : ''}
        className="max-w-md"
      >
        {kpiOpen ? (
          <KpiDetail
            kind={kpiOpen}
            hint={modalMeta[kpiOpen].hint}
            doneToday={m.lists.doneToday}
            inProgress={m.lists.inProgress}
            newThisMonth={m.lists.newThisMonth}
            expiring={m.lists.expiring}
            payoutToday={k.payoutToday}
            moreLabel={modalMeta[kpiOpen].moreLabel}
            onOpen={(id) => {
              setKpiOpen(null)
              openEdit(id)
            }}
            onMore={() => {
              const to = modalMeta[kpiOpen].moreTo
              setKpiOpen(null)
              navigate(to)
            }}
          />
        ) : null}
      </Modal>
    </div>
  )
}

function KpiDetail({
  kind,
  hint,
  doneToday,
  inProgress,
  newThisMonth,
  expiring,
  payoutToday,
  moreLabel,
  onOpen,
  onMore,
}: {
  kind: KpiKey
  hint: string
  doneToday: Order[]
  inProgress: Order[]
  newThisMonth: Order[]
  expiring: ExpiringItem[]
  payoutToday: number
  moreLabel: string
  onOpen: (id: string) => void
  onMore: () => void
}) {
  if (kind === 'due') {
    return (
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">{hint}</p>
        {expiring.length === 0 ? (
          <Empty>暂无即将到期的托管</Empty>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border overflow-hidden max-h-[50vh] overflow-y-auto">
            {expiring.map(({ order, days }) => (
              <li key={order.id}>
                <button
                  type="button"
                  onClick={() => onOpen(order.id)}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-secondary/60 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{order.nickname || '未命名'}</div>
                    <div className="truncate text-xs text-muted-foreground">{orderTitle(order)}</div>
                  </div>
                  <span
                    className={cn(
                      'shrink-0 text-xs font-medium tabular-nums',
                      days == null || days < 0
                        ? 'text-destructive'
                        : days <= 2
                          ? 'text-warning'
                          : 'text-muted-foreground',
                    )}
                  >
                    {days == null
                      ? '未设到期日'
                      : days < 0
                        ? `已过期 ${-days} 天`
                        : days === 0
                          ? '今天到期'
                          : `剩 ${days} 天`}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="pt-1">
          <Button variant="secondary" className="w-full" onClick={onMore}>
            {moreLabel}
          </Button>
        </div>
      </div>
    )
  }

  const list = kind === 'today' ? doneToday : kind === 'active' ? inProgress : newThisMonth

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {hint}
        {kind === 'today' ? ` · 合计 ${money(payoutToday)}` : ''}
      </p>
      {list.length === 0 ? (
        <Empty>暂无相关订单</Empty>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border overflow-hidden max-h-[50vh] overflow-y-auto">
          {list.map((o) => (
            <li key={o.id}>
              <button
                type="button"
                onClick={() => onOpen(o.id)}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-secondary/60 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{o.nickname || '未命名'}</span>
                    <Tag tone={statusTone[o.status]}>{o.status}</Tag>
                  </div>
                  <div className="truncate text-xs text-muted-foreground">{orderTitle(o)}</div>
                </div>
                <span className="shrink-0 text-sm tabular-nums font-medium">
                  {kind === 'today'
                    ? payoutVoid(o)
                      ? NO_PAYOUT
                      : yuan2(o.payout)
                    : yuan2(o.amount)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="pt-1">
        <Button variant="secondary" className="w-full" onClick={onMore}>
          {moreLabel}
        </Button>
      </div>
    </div>
  )
}

function Empty({ children }: { children: ReactNode }) {
  return <div className="py-8 text-center text-sm text-muted-foreground">{children}</div>
}

function formatClock() {
  const now = new Date()
  const days = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  const date = now.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const time = now.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  const hour = now.getHours()
  let message = '星光不问赶路人，深夜也请照顾好自己。'
  if (hour >= 5 && hour < 9) message = '清晨好，新的一天从一单开始。'
  else if (hour >= 9 && hour < 12) message = '上午好，保持节奏，慢慢来也很好。'
  else if (hour >= 12 && hour < 14) message = '中午记得吃饭，眼睛也休息一下。'
  else if (hour >= 14 && hour < 18) message = '下午好，喝口水再继续。'
  else if (hour >= 18 && hour < 22) message = '晚上好，辛苦了，欢迎回来。'
  return { date: `${date} ${days[now.getDay()]}`, time, message }
}
