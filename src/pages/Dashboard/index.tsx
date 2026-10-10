import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ClipboardList,
  Users,
  ListTodo,
  Wallet,
  TrendingUp,
  ArrowUpRight,
  type LucideIcon,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { useOrdersStore } from '@/store/useOrdersStore'
import { dashboard, incomeTrend, type TrendUnit } from '@/domain/dashboard'
import { IncomeTrendChart } from '@/components/charts/IncomeTrendChart'

const fade = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
}

function money(n: number) {
  return `¥${n.toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

export default function Dashboard() {
  const orders = useOrdersStore((s) => s.orders)
  const customers = useOrdersStore((s) => s.customers)
  const settings = useOrdersStore((s) => s.settings)

  const games = useOrdersStore((s) => s.games)
  const [unit, setUnit] = useState<TrendUnit>('month')
  const [tipDismissed, setTipDismissed] = useState(() => {
    try {
      return localStorage.getItem('hoshimi.firstRunTipDismissed') === '1'
    } catch {
      return false
    }
  })

  const m = useMemo(
    () => dashboard({ orders, customers, settings }),
    [orders, customers, settings],
  )
  const trend = useMemo(
    () => incomeTrend({ orders, customers, settings }, unit),
    [orders, customers, settings, unit],
  )
  const k = m.kpis
  const showSetupTip = !tipDismissed && games.length === 0

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10 px-4 md:px-8 pt-4">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-border/40">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <TrendingUp size={20} className="text-brand" />
            <span>{m.hello}</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            {m.todayLabel}
            {m.usingTest ? ' · 当前为示例数据' : ''}
            {orders.length === 0 ? ' · 还没有订单，去记第一单吧' : ''}
          </p>
        </div>
      </header>

      {showSetupTip ? (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-brand/30 bg-brand/5 px-4 py-3 text-sm">
          <p className="text-foreground/90">
            还没有游戏目录。去「设置 → 项目目录」加一个游戏，录单会更顺手。
            <Link to="/settings" className="ml-2 font-semibold text-brand hover:underline">
              去设置 →
            </Link>
          </p>
          <button
            type="button"
            className="shrink-0 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => {
              try {
                localStorage.setItem('hoshimi.firstRunTipDismissed', '1')
              } catch {
                /* ignore */
              }
              setTipDismissed(true)
            }}
          >
            知道了
          </button>
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <motion.div {...fade} transition={{ duration: 0.25, delay: 0.02 }}>
              <HeroCard
                label="本月到手"
                value={money(k.payoutThisMonth)}
                sub={
                  <>
                    上月 {money(k.payoutLastMonth)}
                    <span className="mx-1.5 opacity-40">·</span>
                    营收 {money(k.revenueThisMonth)} · 完成 {k.completedThisMonth} 单
                  </>
                }
                tip="仅统计本月「已完成」订单的到手（金额 − 手续费），不含退款/取消"
              />
            </motion.div>
            <motion.div {...fade} transition={{ duration: 0.25, delay: 0.06 }}>
              <Link to="/todo" className="block h-full">
                <HeroCard
                  label="未完成订单"
                  value={String(k.openCount)}
                  link
                  sub={
                    <>
                      <span className="inline-flex items-center gap-1.5">
                        <i className="size-1.5 rounded-full bg-amber-500" />
                        待处理 <b className="text-foreground font-semibold">{k.waiting}</b>
                      </span>
                      <span className="inline-flex items-center gap-1.5 ml-3">
                        <i className="size-1.5 rounded-full bg-brand" />
                        进行中 <b className="text-foreground font-semibold">{k.inProgress}</b>
                      </span>
                    </>
                  }
                />
              </Link>
            </motion.div>
          </section>

          <motion.div {...fade} transition={{ duration: 0.25, delay: 0.08 }}>
            <DashboardPanel title="收入走势">
              <IncomeTrendChart points={trend} unit={unit} onUnitChange={setUnit} />
            </DashboardPanel>
          </motion.div>

          <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <QuickAccessCard
              to="/orders"
              title="ORDERS"
              subtitle="订单管理"
              icon={ClipboardList}
              count={k.total}
              delay={0.1}
            />
            <QuickAccessCard
              to="/customers"
              title="CLIENTS"
              subtitle="客户管理"
              icon={Users}
              count={k.customers}
              delay={0.14}
            />
            <QuickAccessCard
              to="/todo"
              title="TODO"
              subtitle="待办工作台"
              icon={ListTodo}
              count={k.openCount}
              delay={0.18}
            />
            <QuickAccessCard
              to="/settings"
              title="SETTLE"
              subtitle="设置与备份"
              icon={Wallet}
              count={k.custodyActive}
              delay={0.22}
            />
          </section>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <motion.div {...fade} transition={{ duration: 0.25, delay: 0.08 }}>
            <DashboardPanel
              title="托管快到期"
              action={
                <Link to="/todo" className="text-xs font-semibold text-brand hover:underline">
                  查看全部 →
                </Link>
              }
            >
              <div className="flex items-baseline gap-2 mb-3">
                <span
                  className={cn(
                    'text-4xl font-black tracking-tight tabular-nums',
                    m.expiring.length ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {m.expiring.length}
                </span>
                <span className="text-xs text-muted-foreground">
                  单 · {m.remindDays} 天内
                </span>
              </div>
              {m.expiring.length === 0 ? (
                <p className="rounded-lg bg-secondary/50 px-4 py-6 text-center text-sm text-muted-foreground">
                  近期没有要到期的托管单
                </p>
              ) : (
                <ul className="space-y-2">
                  {m.expiring.slice(0, 5).map(({ order, days }) => (
                    <li
                      key={order.id}
                      className="flex items-center gap-3 rounded-lg border border-border/50 bg-secondary/30 px-3 py-2.5"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold">{order.nickname || '未命名'}</div>
                        <div
                          className={cn(
                            'text-xs font-medium mt-0.5',
                            days < 0 ? 'text-destructive' : 'text-amber-600 dark:text-amber-400',
                          )}
                        >
                          {days < 0
                            ? `已过期 ${-days} 天`
                            : days === 0
                              ? '今天到期'
                              : `还有 ${days} 天`}
                          {order.endDate ? ` · ${order.endDate}` : ''}
                        </div>
                      </div>
                    </li>
                  ))}
                  {m.expiring.length > 5 ? (
                    <li className="text-xs text-muted-foreground px-1">
                      还有 {m.expiring.length - 5} 单，见「待办」
                    </li>
                  ) : null}
                </ul>
              )}
            </DashboardPanel>
          </motion.div>

          <motion.div {...fade} transition={{ duration: 0.25, delay: 0.12 }}>
            <DashboardPanel title="近 30 天活跃客户">
              <div className="flex items-end justify-between">
                <span className="text-3xl font-black tabular-nums text-foreground">
                  {k.activeCustomers}
                </span>
                <span className="text-xs text-muted-foreground mb-1">位</span>
              </div>
            </DashboardPanel>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

function HeroCard({
  label,
  value,
  sub,
  tip,
  link,
}: {
  label: string
  value: string
  sub: React.ReactNode
  tip?: string
  link?: boolean
}) {
  return (
    <div
      className={cn(
        'relative flex min-h-[9rem] flex-col rounded-xl border border-border/50 bg-card p-5 shadow-sm transition-all duration-300',
        link && 'hover:shadow-md hover:border-brand/30 group',
      )}
      title={tip}
    >
      <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
        <span>{label}</span>
        {link ? (
          <ArrowUpRight
            size={14}
            className="text-muted-foreground group-hover:text-brand transition-colors"
          />
        ) : null}
      </div>
      <div className="mt-3 text-3xl sm:text-4xl font-black tracking-tight tabular-nums text-foreground">
        {value}
      </div>
      <div className="mt-auto pt-3 text-xs text-muted-foreground border-t border-border/40">
        {sub}
      </div>
    </div>
  )
}

function QuickAccessCard({
  to,
  title,
  subtitle,
  icon: Icon,
  count,
  delay = 0,
}: {
  to: string
  title: string
  subtitle: string
  icon: LucideIcon
  count?: number
  delay?: number
}) {
  return (
    <motion.div {...fade} transition={{ duration: 0.22, delay }}>
      <Link
        to={to}
        className="block group relative h-32 overflow-hidden rounded-xl bg-card border border-border/50 shadow-sm transition-all duration-300 hover:shadow-md hover:border-brand/30 text-left w-full p-5 flex flex-col justify-between"
      >
        <div className="flex items-center gap-2 transition-transform duration-300 group-hover:translate-x-1">
          <div className="p-1.5 rounded-md bg-brand/10 text-brand transition-transform duration-300 group-hover:scale-110">
            <Icon size={16} />
          </div>
          <span className="text-[10px] font-bold text-brand uppercase tracking-wider">{title}</span>
        </div>
        <div className="flex justify-between items-end">
          <h3 className="text-lg font-bold text-foreground tracking-tight group-hover:text-brand transition-colors duration-300">
            {subtitle}
          </h3>
          {count !== undefined && (
            <span className="text-3xl font-black text-muted-foreground/15 group-hover:text-brand/20 transition-colors tabular-nums">
              {count}
            </span>
          )}
        </div>
      </Link>
    </motion.div>
  )
}

function DashboardPanel({
  title,
  action,
  children,
}: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="bg-card border border-border/50 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-300">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <TrendingUp size={12} className="text-brand/70" />
          {title}
        </h3>
        {action}
      </div>
      <div>{children}</div>
    </div>
  )
}
