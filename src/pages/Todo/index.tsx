import { useMemo, useState } from 'react'
import { Check, ListTodo, Play, PlusCircle, Search } from 'lucide-react'
import { motion } from 'framer-motion'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Tag } from '@/components/ui/data'
import { FormInput } from '@/components/ui/form'
import { useOrdersStore, type Order, type OrderStatus } from '@/store/useOrdersStore'
import { useNewOrderStore } from '@/store/useNewOrderStore'
import { useToastStore } from '@/store/useToastStore'
import { daysUntilLabel, workbench } from '@/domain/workbench'
import { actionLabel, nextStatuses, payoutVoid, NO_PAYOUT } from '@/domain/status'
import { cn } from '@/lib/utils'

const PAGE = 24

const statusTone: Record<OrderStatus, 'default' | 'warning' | 'success' | 'danger'> = {
  待处理: 'warning',
  进行中: 'default',
  已完成: 'success',
  已退款: 'danger',
  已取消: 'danger',
}

export default function TodoPage() {
  const orders = useOrdersStore((s) => s.orders)
  const settings = useOrdersStore((s) => s.settings)
  const setOrderStatus = useOrdersStore((s) => s.setOrderStatus)
  const openNew = useNewOrderStore((s) => s.open)
  const openEdit = useNewOrderStore((s) => s.openEdit)
  const addToast = useToastStore((s) => s.addToast)

  const [query, setQuery] = useState('')
  const [normalLimit, setNormalLimit] = useState(PAGE)
  const [expireLimit, setExpireLimit] = useState(PAGE)

  const model = useMemo(() => workbench(orders, settings, query), [orders, settings, query])
  const allOpen = useMemo(() => workbench(orders, settings, ''), [orders, settings])
  const searching = Boolean(query.trim())
  const follow = allOpen.followCount
  const matchCount = model.openNormal.length + model.expiring.length
  const quiet = model.openNormal.length === 0 && model.expiring.length === 0

  const meta = searching
    ? matchCount
      ? `${matchCount} 条匹配`
      : follow
        ? `无匹配结果 · 待跟进 ${follow}`
        : '无匹配结果'
    : follow
      ? `${follow} 单待跟进`
      : orders.length === 0
        ? '还没有订单'
        : '已全部处理'

  const move = (order: Order, to: OrderStatus) => {
    const next = setOrderStatus(order.id, to)
    if (!next) {
      addToast({ type: 'error', message: `无法改为「${to}」` })
      return
    }
    addToast({
      type: 'success',
      message:
        to === '已完成' ? '已完成' : to === '进行中' ? '已开始处理' : `${actionLabel(to)}成功`,
    })
  }

  if (orders.length === 0) {
    return (
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-6">
        <PageHeader icon={ListTodo} title="待办" />
        <div className="rounded-xl border border-border/50 bg-card py-16 text-center text-muted-foreground">
          <ListTodo size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">还没有订单</p>
          <p className="text-xs mt-1 mb-4">点下方开始记第一单</p>
          <Button variant="primary" onClick={openNew}>
            <PlusCircle size={16} /> 新建订单
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 space-y-6">
      <PageHeader
        icon={ListTodo}
        title={`待办 · ${meta}`}
        actions={
          <Button variant="primary" onClick={openNew}>
            <PlusCircle size={16} /> 新建订单
          </Button>
        }
      />

      <div className="grid grid-cols-3 gap-3">
        <Stat label="今日完成" value={String(model.doneTodayCount)} sub="单" />
        <Stat
          label="今日到手"
          value={`¥${model.todayPayout.toFixed(0)}`}
          sub="今日完成订单"
        />
        <Stat label="待跟进" value={String(follow)} sub="普通 + 即将到期托管" />
      </div>

      <div className="max-w-sm">
        <FormInput
          prefix={<Search size={14} />}
          placeholder="搜索客户、单号、项目…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setNormalLimit(PAGE)
            setExpireLimit(PAGE)
          }}
        />
      </div>

      {quiet ? (
        <div className="rounded-xl border border-dashed border-border/60 py-12 text-center text-sm text-muted-foreground">
          {searching ? '没有符合条件的订单' : '今天没有待处理的订单'}
        </div>
      ) : null}

      {model.openNormal.length > 0 ? (
        <section>
          <h2 className="text-sm font-bold text-muted-foreground mb-3">
            普通单 · {model.openNormal.length}
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {model.openNormal.slice(0, normalLimit).map((order, i) => (
              <OrderCard
                key={order.id}
                order={order}
                delay={Math.min(i * 0.03, 0.2)}
                onMove={move}
                onEdit={() => openEdit(order.id)}
              />
            ))}
          </div>
          {model.openNormal.length > normalLimit ? (
            <div className="mt-4 flex justify-center">
              <Button variant="secondary" onClick={() => setNormalLimit((n) => n + PAGE)}>
                加载更多（还有 {model.openNormal.length - normalLimit} 单）
              </Button>
            </div>
          ) : null}
        </section>
      ) : null}

      {model.expiring.length > 0 ? (
        <section>
          <h2 className="text-sm font-bold text-muted-foreground mb-3">
            即将到期的托管 · {model.expiring.length}
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {model.expiring.slice(0, expireLimit).map((order, i) => (
              <OrderCard
                key={order.id}
                order={order}
                delay={Math.min(i * 0.03, 0.2)}
                dueLabel={
                  order.endDate ? daysUntilLabel(model.today, order.endDate) : undefined
                }
                onMove={move}
                onEdit={() => openEdit(order.id)}
              />
            ))}
          </div>
          {model.expiring.length > expireLimit ? (
            <div className="mt-4 flex justify-center">
              <Button variant="secondary" onClick={() => setExpireLimit((n) => n + PAGE)}>
                加载更多（还有 {model.expiring.length - expireLimit} 单）
              </Button>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-4 shadow-sm">
      <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1.5 text-2xl font-black tabular-nums tracking-tight">{value}</div>
      <div className="mt-1 text-[11px] text-muted-foreground">{sub}</div>
    </div>
  )
}

function OrderCard({
  order,
  dueLabel,
  delay,
  onMove,
  onEdit,
}: {
  order: Order
  dueLabel?: string
  delay: number
  onMove: (o: Order, to: OrderStatus) => void
  onEdit: () => void
}) {
  const next = nextStatuses(order.status)
  const main: OrderStatus | null =
    order.status === '待处理' ? '进行中' : order.status === '进行中' ? '已完成' : null
  const summary =
    order.type === '托管'
      ? [order.custodyKind, order.settleKind, order.endDate].filter(Boolean).join(' · ')
      : order.items.map((i) => i.product).join('、') || '—'

  return (
    <motion.article
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay }}
      className="rounded-xl border border-border/50 bg-card p-4 shadow-sm hover:shadow-md hover:border-brand/25 transition-all duration-300"
    >
      <button type="button" className="w-full text-left" onClick={onEdit}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate font-semibold text-foreground">{order.nickname || '未命名'}</div>
            <div className="mt-0.5 truncate text-sm text-muted-foreground">{summary}</div>
          </div>
          <div className="text-right shrink-0">
            <div className="tabular-nums font-semibold">¥{order.amount.toFixed(0)}</div>
            <div className="text-xs text-muted-foreground">
              到手{' '}
              {payoutVoid(order) ? (
                NO_PAYOUT
              ) : (
                <span className="text-brand font-semibold">¥{order.payout.toFixed(0)}</span>
              )}
            </div>
          </div>
        </div>
      </button>
      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Tag tone={statusTone[order.status]}>{order.status}</Tag>
          {dueLabel ? (
            <span
              className={cn(
                'text-xs font-semibold rounded-full px-2 py-0.5 border',
                dueLabel.startsWith('已过期')
                  ? 'border-destructive/30 bg-destructive/10 text-destructive'
                  : 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400',
              )}
            >
              {dueLabel}
            </span>
          ) : (
            <span className="truncate text-xs text-muted-foreground">
              {order.platform} · {order.server}
            </span>
          )}
        </div>
        {main && next.includes(main) ? (
          <Button
            size="sm"
            variant="secondary"
            icon={main === '进行中' ? Play : Check}
            onClick={() => onMove(order, main)}
          >
            {main === '进行中' ? '开始' : '完成'}
          </Button>
        ) : null}
      </div>
    </motion.article>
  )
}
