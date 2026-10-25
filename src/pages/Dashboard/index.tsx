import { Link, useSearchParams } from 'react-router-dom'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  Hourglass,
  LayoutDashboard,
  PlusCircle,
  ShoppingBag,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { yuan as money, yuan2 } from '@/lib/format'
import { CountUp } from '@/lib/count-up'
import { useOrdersStore } from '@/store/useOrdersStore'
import { useNewOrderStore } from '@/store/useNewOrderStore'
import { useToastStore } from '@/store/useToastStore'
import { dashboard } from '@/domain/dashboard'
import { workbench, daysUntilLabel } from '@/domain/workbench'
import { Button } from '@/components/ui/Button'
import { Tag } from '@/components/ui/data'
import type { Order, OrderStatus } from '@/domain/order'

/*
 * 工作台壳（第一视觉稿）
 * ── Linear 结构：今日要处理为主列；KPI / 占位模块为辅；走势后置。
 * ── 路由仍是 /dashboard，侧栏文案改为「工作台」。
 * ── 模块清单未定：右侧放占位卡，边看边改。
 * ── 筛选 ?focus=all|chase|due 进 URL，刷新保持视图。
 */

type FocusTab = 'all' | 'chase' | 'due'

function parseFocus(raw: string | null): FocusTab {
  if (raw === 'chase' || raw === 'due' || raw === 'all') return raw
  return 'all'
}

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
  const completeOrder = useOrdersStore((s) => s.completeOrder)
  const openNewOrder = useNewOrderStore((s) => s.open)
  const openEdit = useNewOrderStore((s) => s.openEdit)
  const addToast = useToastStore((s) => s.addToast)
  const [searchParams, setSearchParams] = useSearchParams()

  const [clock, setClock] = useState(() => formatClock())
  const focusTab = parseFocus(searchParams.get('focus'))

  const setFocusTab = (tab: FocusTab) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (tab === 'all') next.delete('focus')
        else next.set('focus', tab)
        return next
      },
      { replace: true },
    )
  }

  const m = useMemo(() => dashboard({ orders, customers, settings }), [orders, customers, settings])
  const wb = useMemo(() => workbench(orders, settings, ''), [orders, settings])
  const k = m.kpis

  useEffect(() => {
    const id = window.setInterval(() => setClock(formatClock()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const focusList = useMemo(() => {
    if (focusTab === 'chase') return wb.openNormal.map((o) => ({ kind: 'chase' as const, order: o }))
    if (focusTab === 'due') return wb.expiring.map((o) => ({ kind: 'due' as const, order: o }))
    const chase = wb.openNormal.map((o) => ({ kind: 'chase' as const, order: o }))
    const due = wb.expiring.map((o) => ({ kind: 'due' as const, order: o }))
    return [...due, ...chase]
  }, [focusTab, wb.openNormal, wb.expiring])

  const kpiCards: {
    label: string
    icon: LucideIcon
    value: number
    money?: boolean
    foot: string
    warn?: boolean
    to: string
  }[] = [
    {
      label: '今日到手',
      icon: CircleDollarSign,
      value: k.payoutToday,
      money: true,
      foot: `本月 ${money(k.payoutThisMonth)}`,
      to: '/orders?mode=已完成&period=today&anchor=completed',
    },
    {
      label: '进行中',
      icon: Hourglass,
      value: k.inProgress,
      foot: `待处理 ${k.waiting} 单`,
      to: '/orders?mode=进行中',
    },
    {
      label: '托管快到期',
      icon: CalendarClock,
      value: k.expiringCount,
      foot: `托管中 ${k.custodyActive} · ${m.remindDays} 天内`,
      warn: k.expiringCount > 0,
      to: '/dashboard?focus=due',
    },
    {
      label: '本月新单',
      icon: ShoppingBag,
      value: k.newThisMonth,
      foot: `流水 ${money(k.newThisMonthAmount)}`,
      to: '/orders?period=month',
    },
  ]

  const onComplete = (id: string) => {
    try {
      completeOrder(id)
      addToast({ type: 'success', message: '已标完成' })
    } catch {
      addToast({ type: 'error', message: '这单暂时不能标完成' })
    }
  }

  return (
    <div className="ds-page--console l2g-dash l2g-workbench">
      <div className="l2g-orders-head ds-rise">
        <div className="l2g-orders-head__title-group">
          <div className="flex items-center gap-2 mb-1">
            <LayoutDashboard size={18} aria-hidden="true" className="text-brand" strokeWidth={1.75} />
            <span className="text-xs font-medium text-muted-foreground tracking-wide">工作台</span>
          </div>
          <h1 className="l2g-orders-head__title title text-balance">{m.hello}</h1>
          <p className="l2g-orders-head__sub subtitle">
            {m.todayLabel}
            {m.usingTest ? ' · 当前为示例数据' : ''}
            {' · '}
            {clock.time}
            {' · '}
            {clock.message}
          </p>
        </div>
        <div className="l2g-orders-head__actions">
          <Button variant="primary" icon={PlusCircle} onClick={openNewOrder}>
            新建订单
          </Button>
        </div>
      </div>

      <div className="l2g-kpi-grid ds-rise" aria-label="今日一览">
        {kpiCards.map((slot) => {
          const Icon = slot.icon
          return (
            <Link
              key={slot.label}
              to={slot.to}
              className={cn('l2g-kpi-card l2g-kpi-card--link', slot.warn && 'l2g-kpi-card--warn')}
              title="点击查看"
            >
              <span className="l2g-kpi-card__icon" aria-hidden>
                <Icon size={20} strokeWidth={1.75} />
              </span>
              <div className={cn('l2g-kpi-card__value', slot.money && 'dd-money-gold')}>
                <CountUp value={slot.value} money={slot.money} />
              </div>
              <div className="l2g-kpi-card__label">{slot.label}</div>
              <div className="l2g-kpi-card__foot">{slot.foot}</div>
            </Link>
          )
        })}
      </div>

      <div className="l2g-workbench__grid ds-rise">
        <section className="l2g-glass-panel l2g-workbench__focus" aria-label="今日要处理">
          <div className="l2g-glass-panel__head">
            <div>
              <h2 className="l2g-datacenter__heading l2g-datacenter__heading--inline">今日要处理</h2>
              <p className="l2g-glass-panel__meta">
                共 {wb.followCount} 条 · 催单 {wb.chaseCount} · 到期 {wb.dueCount}
              </p>
            </div>
            <div className="flex items-center gap-1 flex-wrap" role="tablist" aria-label="处理筛选">
              {(
                [
                  { id: 'all' as const, label: '全部' },
                  { id: 'chase' as const, label: `催单 ${wb.chaseCount}` },
                  { id: 'due' as const, label: `到期 ${wb.dueCount}` },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={focusTab === t.id}
                  className={cn(
                    'l2g-capsule',
                    focusTab === t.id ? 'l2g-capsule--on' : 'l2g-capsule--ghost',
                  )}
                  onClick={() => setFocusTab(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {focusList.length === 0 ? (
            <Empty>
              <p className="mb-2">今天没有要盯的单</p>
              <Button variant="secondary" size="sm" icon={PlusCircle} onClick={openNewOrder}>
                录一单
              </Button>
            </Empty>
          ) : (
            <ul className="l2g-workbench__list">
              {focusList.map(({ kind, order: o }) => (
                <li key={`${kind}-${o.id}`} className="l2g-workbench__row">
                  <button
                    type="button"
                    className="l2g-workbench__row-main"
                    onClick={() => openEdit(o.id)}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="truncate text-sm font-medium">{o.nickname || '未命名'}</span>
                        <Tag tone={statusTone[o.status]}>{o.status}</Tag>
                        {kind === 'due' ? (
                          <span className="text-xs font-medium text-warning tabular-nums">
                            {daysUntilLabel(wb.today, o.endDate)}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">催单</span>
                        )}
                      </div>
                      <div className="truncate text-xs text-muted-foreground mt-0.5">
                        {orderTitle(o)}
                        {o.contact ? ` · ${o.contact}` : ''}
                      </div>
                    </div>
                    <span className="shrink-0 text-sm tabular-nums font-medium dd-money-gold">
                      {yuan2(o.amount)}
                    </span>
                  </button>
                  <div className="l2g-workbench__row-actions">
                    <Button variant="secondary" size="sm" onClick={() => openEdit(o.id)} title="打开处理">
                      打开
                    </Button>
                    {(o.status === '待处理' || o.status === '进行中') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={CheckCircle2}
                        onClick={() => onComplete(o.id)}
                        title="标完成"
                      >
                        完成
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="l2g-workbench__focus-foot">
            <Link to="/orders" className="l2g-capsule l2g-capsule--ghost inline-flex items-center gap-1">
              去订单全列表 <ArrowRight size={14} aria-hidden="true" />
            </Link>
            <Link to="/todo" className="l2g-capsule l2g-capsule--ghost inline-flex items-center gap-1">
              去待办 <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </section>

        <aside className="l2g-workbench__side" aria-label="工作台模块">
          <div className="l2g-glass-panel l2g-workbench__side-card">
            <h3 className="l2g-workbench__side-title">本月到手</h3>
            <p className="l2g-workbench__side-value dd-money-gold tabular-nums">
              {money(k.payoutThisMonth)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              累计 {money(k.payoutTotal)} · 已成交 {k.completedTotal}
            </p>
          </div>

          <div className="l2g-glass-panel l2g-workbench__side-card">
            <h3 className="l2g-workbench__side-title">快捷入口</h3>
            <div className="flex flex-col gap-2 mt-2">
              <Button variant="secondary" size="sm" icon={PlusCircle} onClick={openNewOrder} className="justify-start">
                新建异环单
              </Button>
              <Link to="/customers" className="l2g-capsule l2g-capsule--ghost justify-start">
                客户列表
              </Link>
              <Link to="/todo" className="l2g-capsule l2g-capsule--ghost justify-start">
                自由待办
              </Link>
            </div>
          </div>

          <div className="l2g-glass-panel l2g-workbench__side-card l2g-workbench__side-card--placeholder">
            <h3 className="l2g-workbench__side-title">模块占位</h3>
            <p className="text-xs text-muted-foreground leading-relaxed mt-1">
              你还没定工作台要放哪些模块。这张卡先占位——想好了告诉我，边看边改。
            </p>
            <ul className="mt-3 space-y-1.5 text-xs text-muted-foreground">
              <li>· 最近客户</li>
              <li>· 催单队列</li>
              <li>· 收入走势（原概览图）</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  )
}

function Empty({ children }: { children: ReactNode }) {
  return <div className="py-12 text-center text-sm text-muted-foreground">{children}</div>
}

function formatClock() {
  const now = new Date()
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
  return { time, message }
}
