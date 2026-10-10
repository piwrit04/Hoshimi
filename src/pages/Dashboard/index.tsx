import { Link } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { ArrowUpRight, CalendarClock, CircleDollarSign, Hourglass, PlusCircle, ShoppingBag, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { yuan as money, yuan2 } from '@/lib/format'
import { useOrdersStore } from '@/store/useOrdersStore'
import { useNewOrderStore } from '@/store/useNewOrderStore'
import { dashboard, incomeTrend, type TrendUnit } from '@/domain/dashboard'
import { IncomeTrendChart } from '@/components/charts/IncomeTrendChart'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { DataTable, Tag, type DataTableColumn } from '@/components/ui/data'
import { NO_PAYOUT, payoutVoid } from '@/domain/status'
import type { Order, OrderStatus } from '@/domain/order'

/*
 * 概览 —— 版式照 shadcn dashboard-01：
 *   第一行 4 张统计卡（等高、gap 16）
 *   第二行 收入走势（8 列）+ 托管快到期（4 列），同高
 *   第三行 最近订单表
 * 每个数字只出现一次。
 */


const statusTone: Record<OrderStatus, 'brand' | 'warning' | 'success' | 'danger'> = {
  待处理: 'warning',
  进行中: 'brand',
  已完成: 'success',
  已退款: 'danger',
  已取消: 'danger',
}

export default function Dashboard() {
  const orders = useOrdersStore((s) => s.orders)
  const customers = useOrdersStore((s) => s.customers)
  const settings = useOrdersStore((s) => s.settings)
  const openNewOrder = useNewOrderStore((s) => s.open)
  const openEdit = useNewOrderStore((s) => s.openEdit)

  const [unit, setUnit] = useState<TrendUnit>('day')
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

  const recentColumns: DataTableColumn<Order>[] = useMemo(
    () => [
      { key: 'orderNo', title: '单号', width: '148px', render: (r) => <span className="font-mono text-[13px] text-muted-foreground">{r.orderNo}</span> },
      { key: 'nickname', title: '客户', width: '140px', render: (r) => <span className="font-medium truncate block">{r.nickname || '未命名'}</span> },
      {
        key: 'items',
        title: '项目',
        render: (r) => (
          <span className="truncate block">
            {r.type === '托管' ? `${r.custodyKind ?? '托管'} · ${r.settleKind ?? ''}` : r.items.map((i) => i.product).join('、')}
          </span>
        ),
      },
      { key: 'platform', title: '渠道', width: '72px' },
      { key: 'amount', title: '金额', width: '112px', align: 'right', render: (r) => yuan2(r.amount) },
      {
        key: 'payout',
        title: '到手',
        width: '112px',
        align: 'right',
        render: (r) => (payoutVoid(r) ? <span className="text-muted-foreground">{NO_PAYOUT}</span> : <span className="font-medium">{yuan2(r.payout)}</span>),
      },
      { key: 'status', title: '状态', width: '112px', render: (r) => <Tag tone={statusTone[r.status]}>{r.status}</Tag> },
    ],
    [],
  )

  return (
    <div className="ds-page">
      <PageHeader
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

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={CircleDollarSign}
          label="今日到手"
          value={money(k.payoutToday)}
          foot={`本月 ${money(k.payoutThisMonth)} · 上月 ${money(k.payoutLastMonth)}`}
          tip="今天「已完成」订单的到手（金额 − 转出 − 手续费）"
          delay={0}
        />
        <StatCard
          icon={Hourglass}
          label="进行中"
          value={String(k.inProgress)}
          foot={`待处理 ${k.waiting} 单`}
          to="/todo"
          delay={40}
        />
        <StatCard
          icon={ShoppingBag}
          label="本周新单"
          value={String(k.newThisWeek)}
          foot={`本周下单流水 ${money(k.newThisWeekAmount)}`}
          to="/orders"
          delay={80}
        />
        <StatCard
          icon={CalendarClock}
          label="托管快到期"
          value={String(m.expiring.length)}
          foot={`${m.remindDays} 天内 · 托管中 ${k.custodyActive} 单`}
          to="/todo"
          tone={m.expiring.length ? 'warning' : undefined}
          delay={120}
        />
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Card title="收入走势" description="已完成订单的到手金额" className="lg:col-span-8 ds-rise">
          <IncomeTrendChart points={trend} unit={unit} onUnitChange={setUnit} />
        </Card>

        <Card
          title="托管到期"
          description={`${m.remindDays} 天内到期或已过期`}
          className="lg:col-span-4 ds-rise"
          extra={
            <Link to="/todo" className="btn-base btn-ghost btn--sm">
              查看全部 <ArrowUpRight size={14} />
            </Link>
          }
          bodyClassName="flex flex-col"
        >
          {m.expiring.length === 0 ? (
            <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border py-10 text-sm text-muted-foreground">
              近期没有要到期的托管单
            </div>
          ) : (
            <ul className="-mx-2 flex flex-col">
              {m.expiring.slice(0, 6).map(({ order, days }) => (
                <li key={order.id}>
                  <button
                    type="button"
                    onClick={() => openEdit(order.id)}
                    className="flex h-12 w-full items-center gap-3 rounded-lg px-2 text-left transition-colors hover:bg-secondary"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{order.nickname || '未命名'}</span>
                      <span className="ds-caption block truncate">
                        {order.custodyKind ?? '托管'} · 到期 {order.endDate}
                      </span>
                    </span>
                    <span
                      className={cn(
                        'shrink-0 text-xs font-medium tabular-nums',
                        days < 0 ? 'text-destructive' : 'text-warning',
                      )}
                    >
                      {days < 0 ? `过期 ${-days} 天` : days === 0 ? '今天' : `${days} 天`}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      <Card
        title="最近订单"
        flush
        className="ds-rise"
        extra={
          <Link to="/orders" className="btn-base btn-ghost btn--sm">
            查看全部 <ArrowUpRight size={14} />
          </Link>
        }
      >
        <DataTable
          columns={recentColumns}
          data={m.recent}
          rowKey={(r) => r.id}
          onRowClick={(r) => openEdit(r.id)}
          empty={<div className="py-10 text-center text-sm text-muted-foreground">还没有订单</div>}
        />
      </Card>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  foot,
  tip,
  to,
  tone,
  delay = 0,
}: {
  icon: LucideIcon
  label: string
  value: string
  foot: string
  tip?: string
  to?: string
  tone?: 'warning'
  delay?: number
}) {
  const body = (
    <div
      className={cn('ds-card ds-stat ds-rise', to && 'transition-colors hover:border-brand/40')}
      style={{ animationDelay: `${delay}ms` }}
      title={tip}
    >
      <div className="ds-stat__label">
        <span>{label}</span>
        <Icon size={16} className={cn(tone === 'warning' ? 'text-warning' : 'text-muted-foreground')} />
      </div>
      <div className="ds-stat__value">{value}</div>
      <div className="ds-stat__foot">{foot}</div>
    </div>
  )
  return to ? (
    <Link to={to} className="block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
      {body}
    </Link>
  ) : (
    body
  )
}
