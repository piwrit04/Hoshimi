import { Link } from 'react-router-dom'
import { useMemo, useState } from 'react'
import {
  ArrowUpRight,
  CalendarClock,
  CircleDollarSign,
  ClipboardList,
  Hourglass,
  PlusCircle,
  ShoppingBag,
  Users,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { yuan as money, yuan2 } from '@/lib/format'
import { CountUp } from '@/lib/count-up'
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
 * 概览 —— 对照工具箱首页：快捷入口大卡 + 粉色标签 + 浅底纹大数字，
 * 再接走势 / 托管 / 最近订单。规格保留：4 KPI + 走势 + 托管 + 最近。
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

      {/* 快捷入口：对照工具箱 QuickAccessCard */}
      <section className="ds-stagger grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <QuickCard
          en="Orders"
          title="订单列表"
          to="/orders"
          icon={ClipboardList}
          count={orders.length}
          tip="全部订单"
        />
        <QuickCard
          en="Todo"
          title="待办"
          to="/todo"
          icon={Hourglass}
          count={k.inProgress + k.waiting}
          tip="进行中 + 待处理"
        />
        <QuickCard
          en="Customers"
          title="客户"
          to="/customers"
          icon={Users}
          count={customers.length}
          tip="客户名录"
        />
        <QuickCard
          en="New"
          title="新建订单"
          icon={PlusCircle}
          count={k.newThisWeek}
          tip="本周新单数"
          onClick={openNewOrder}
        />
      </section>

      {/* KPI 统计卡 */}
      <section className="ds-stagger grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={CircleDollarSign}
          label="今日到手"
          en="Today"
          value={k.payoutToday}
          money
          foot={`本月 ${money(k.payoutThisMonth)} · 上月 ${money(k.payoutLastMonth)}`}
          tip="今天「已完成」订单的到手（金额 − 转出 − 手续费）"
          variant="hero"
        />
        <StatCard
          icon={Hourglass}
          label="进行中"
          en="Active"
          value={k.inProgress}
          foot={`待处理 ${k.waiting} 单`}
          to="/todo"
        />
        <StatCard
          icon={ShoppingBag}
          label="本周新单"
          en="Week"
          value={k.newThisWeek}
          foot={`本周下单流水 ${money(k.newThisWeekAmount)}`}
          to="/orders"
        />
        <StatCard
          icon={CalendarClock}
          label="托管快到期"
          en="Due"
          value={m.expiring.length}
          foot={`${m.remindDays} 天内 · 托管中 ${k.custodyActive} 单`}
          to="/todo"
          variant={m.expiring.length ? 'warn' : undefined}
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
          <div className="mb-3 flex items-baseline gap-2">
            <span
              className={cn(
                'text-[32px] leading-10 font-bold tracking-tight tabular-nums',
                m.expiring.length ? 'text-brand' : 'text-muted-foreground',
              )}
            >
              <CountUp value={m.expiring.length} />
            </span>
            <span className="ds-caption">单</span>
          </div>
          {m.expiring.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-10 text-muted-foreground">
              <Zap size={28} className="opacity-40 text-brand" />
              <p className="text-sm">近期没有要到期的托管单</p>
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

/** 工具箱风格快捷入口：粉标签 + 大水印数字 + 浅底 */
function QuickCard({
  en,
  title,
  icon: Icon,
  count,
  tip,
  to,
  onClick,
}: {
  en: string
  title: string
  icon: LucideIcon
  count: number
  tip?: string
  to?: string
  onClick?: () => void
}) {
  const inner = (
    <div className="ds-quick ds-rise group" title={tip}>
      <div className="relative z-10 flex h-full flex-col justify-center gap-2 p-5">
        <div className="flex items-center gap-2 transition-transform duration-300 group-hover:translate-x-0.5">
          <span className="inline-flex size-7 items-center justify-center rounded-md bg-brand/15 text-brand">
            <Icon size={16} />
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-brand">{en}</span>
        </div>
        <h3 className="text-lg font-bold tracking-tight text-foreground transition-colors duration-300 group-hover:text-brand">
          {title}
        </h3>
      </div>
      <span className="ds-quick__watermark tabular-nums" aria-hidden>
        <CountUp value={count} />
      </span>
    </div>
  )
  if (to) {
    return (
      <Link to={to} className="block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
        {inner}
      </Link>
    )
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="block h-full w-full rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
    >
      {inner}
    </button>
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
  to,
  variant,
}: {
  icon: LucideIcon
  label: string
  en?: string
  value: number
  money?: boolean
  foot: string
  tip?: string
  to?: string
  variant?: 'hero' | 'warn'
}) {
  const body = (
    <div
      className={cn(
        'ds-card ds-stat ds-rise',
        variant === 'hero' && 'ds-stat--hero',
        variant === 'warn' && 'ds-stat--warn',
        to && 'ds-stat--link',
      )}
      title={tip}
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
      {!asMoney && variant !== 'hero' ? (
        <span className="ds-stat__ghost tabular-nums" aria-hidden>
          {Math.round(value)}
        </span>
      ) : null}
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
