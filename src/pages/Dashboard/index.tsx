import { Link } from 'react-router-dom'
import { useMemo, useState, type ReactNode } from 'react'
import {
  CalendarClock,
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
import { dashboard, incomeTrend, type TrendUnit, type ExpiringItem } from '@/domain/dashboard'
import { IncomeTrendChart } from '@/components/charts/IncomeTrendChart'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Tag } from '@/components/ui/data'
import { NO_PAYOUT, payoutVoid } from '@/domain/status'
import type { Order, OrderStatus } from '@/domain/order'

/*
 * 概览：4 KPI（可点开轻量明细）+ 半宽收入走势 + 另一侧轻提示。
 * 托管到期明细只在「托管快到期」KPI 弹层里，不另开列表。
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

  const [unit, setUnit] = useState<TrendUnit>('day')
  const [kpiOpen, setKpiOpen] = useState<KpiKey | null>(null)
  const [tipDismissed, setTipDismissed] = useState(() => {
    try {
      return localStorage.getItem('hoshimi.emptyLedgerTipDismissed') === '1'
    } catch {
      return false
    }
  })

  const m = useMemo(() => dashboard({ orders, customers, settings }), [orders, customers, settings])
  const trend = useMemo(
    () => incomeTrend({ orders, customers, settings }, unit),
    [orders, customers, settings, unit],
  )
  const k = m.kpis
  const showSetupTip = !tipDismissed && orders.length === 0

  const modalMeta: Record<KpiKey, { title: string; hint: string }> = {
    today: { title: '今日到手', hint: '今天「已完成」订单的到手明细' },
    active: { title: '进行中', hint: '当前进行中的订单' },
    month: { title: '本月新单', hint: '本月创建的订单' },
    due: { title: '托管快到期', hint: `${m.remindDays} 天内到期的托管单` },
  }

  return (
    <div className="ds-page">
      <PageHeader
        live
        title={m.hello}
        description={
          <>
            {m.todayLabel}
            {m.usingTest ? ' · 当前为示例数据' : ''}
          </>
        }
        actions={
          <Button variant="primary" icon={PlusCircle} onClick={openNewOrder}>
            新建订单
          </Button>
        }
      />

      {showSetupTip ? (
        <div className="ds-rise flex items-center justify-between gap-4 rounded-xl border border-brand/30 bg-brand/5 px-6 py-4">
          <p className="text-sm text-foreground">
            账本还是空的。点右上角「新建订单」记第一单，或在「设置」里导入备份、调整项目目录。
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <Link to="/settings" className="btn-base btn-secondary btn--sm">去设置</Link>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                try {
                  localStorage.setItem('hoshimi.emptyLedgerTipDismissed', '1')
                } catch {
                  /* ignore */
                }
                setTipDismissed(true)
              }}
            >
              知道了
            </Button>
          </div>
        </div>
      ) : null}

      <section className="ds-stagger grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={CircleDollarSign}
          label="今日到手"
          en="Today"
          value={k.payoutToday}
          money
          foot={`本月 ${money(k.payoutThisMonth)} · 上月 ${money(k.payoutLastMonth)}`}
          tip="点击查看今日完成明细"
          variant="hero"
          onClick={() => setKpiOpen('today')}
        />
        <StatCard
          icon={Hourglass}
          label="进行中"
          en="Active"
          value={k.inProgress}
          foot={`待处理 ${k.waiting} 单`}
          tip="点击查看进行中订单"
          onClick={() => setKpiOpen('active')}
        />
        <StatCard
          icon={ShoppingBag}
          label="本月新单"
          en="Month"
          value={k.newThisMonth}
          foot={`本月下单流水 ${money(k.newThisMonthAmount)}`}
          tip="点击查看本月新单"
          onClick={() => setKpiOpen('month')}
        />
        <StatCard
          icon={CalendarClock}
          label="托管快到期"
          en="Due"
          value={m.expiring.length}
          foot={`${m.remindDays} 天内 · 托管中 ${k.custodyActive} 单`}
          tip="点击查看即将到期的托管"
          variant={m.expiring.length ? 'warn' : undefined}
          onClick={() => setKpiOpen('due')}
        />
      </section>

      <section className="ds-rise grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="收入走势" description="已完成订单的到手金额">
          <IncomeTrendChart points={trend} unit={unit} onUnitChange={setUnit} />
        </Card>
        <Card
          title="今日完成"
          description="今天已完成订单"
          extra={
            <button
              type="button"
              className="btn-base btn-ghost btn--sm"
              onClick={() => setKpiOpen('today')}
            >
              明细
            </button>
          }
        >
          <button
            type="button"
            className="w-full text-left"
            onClick={() => setKpiOpen('today')}
          >
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="text-3xl font-semibold tabular-nums tracking-tight">
                  <CountUp value={k.completedToday} />
                  <span className="ml-1 text-sm font-normal text-muted-foreground">单</span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">完成笔数</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-semibold tabular-nums text-brand">
                  <CountUp value={k.payoutToday} money />
                </div>
                <div className="mt-1 text-xs text-muted-foreground">今日到手</div>
              </div>
            </div>
            <p className="mt-5 text-xs text-muted-foreground">
              {k.completedToday === 0
                ? '今天还没有完成单，点此查看说明'
                : `共 ${k.completedToday} 单 · 点开看明细`}
            </p>
          </button>
        </Card>
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
            onOpen={(id) => {
              setKpiOpen(null)
              openEdit(id)
            }}
          />
        ) : null}
      </Modal>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  en,
  value,
  money: asMoney,
  foot,
  tip,
  variant,
  onClick,
}: {
  icon: LucideIcon
  label: string
  en?: string
  value: number
  money?: boolean
  foot: string
  tip?: string
  variant?: 'hero' | 'warn'
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={tip}
      className={cn(
        'ds-card ds-stat ds-rise text-left w-full ds-stat--link',
        variant === 'hero' && 'ds-stat--hero',
        variant === 'warn' && 'ds-stat--warn',
      )}
    >
      <div className="ds-stat__label">
        <span className="flex items-center gap-2 min-w-0">
          {en ? <span className="text-[10px] font-bold uppercase tracking-wider text-brand shrink-0">{en}</span> : null}
          <span className="truncate">{label}</span>
        </span>
        <span className="ds-stat__icon" aria-hidden>
          <Icon size={14} />
        </span>
      </div>
      <div className="ds-stat__value">
        <CountUp value={value} money={asMoney} />
      </div>
      <div className="ds-stat__foot">{foot}</div>
    </button>
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
  onOpen,
}: {
  kind: KpiKey
  hint: string
  doneToday: Order[]
  inProgress: Order[]
  newThisMonth: Order[]
  expiring: ExpiringItem[]
  payoutToday: number
  onOpen: (id: string) => void
}) {
  if (kind === 'due') {
    return (
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">{hint}</p>
        {expiring.length === 0 ? (
          <Empty>暂无即将到期的托管</Empty>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border overflow-hidden">
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
                      days < 0 ? 'text-destructive' : days <= 2 ? 'text-warning' : 'text-muted-foreground',
                    )}
                  >
                    {days < 0 ? `已过期 ${-days} 天` : days === 0 ? '今天到期' : `剩 ${days} 天`}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }

  const list =
    kind === 'today' ? doneToday : kind === 'active' ? inProgress : newThisMonth

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
    </div>
  )
}

function Empty({ children }: { children: ReactNode }) {
  return <div className="py-8 text-center text-sm text-muted-foreground">{children}</div>
}
