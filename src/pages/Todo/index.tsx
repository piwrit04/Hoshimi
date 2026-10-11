import { useMemo, useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Check, ListTodo, Play, PlusCircle, Search, X } from 'lucide-react'
import { motion } from 'framer-motion'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Tag } from '@/components/ui/data'
import { FormInput, FormSegmentedControl } from '@/components/ui/form'
import { modalConfirm } from '@/components/ui/ModalConfirm'
import {
  captureOrderSlice,
  useOrdersStore,
  type Order,
  type OrderStatus,
} from '@/store/useOrdersStore'
import { useNewOrderStore } from '@/store/useNewOrderStore'
import { toastUndo, useToastStore } from '@/store/useToastStore'
import { seedDemoLedger } from '@/lib/seed-demo'
import { daysUntilLabel, workbench } from '@/domain/workbench'
import { actionLabel, nextStatuses, payoutVoid, NO_PAYOUT } from '@/domain/status'
import { cn } from '@/lib/utils'
import { yuan2 } from '@/lib/format'
import { CountUp } from '@/lib/count-up'

const PAGE = 24

type Tab = 'all' | 'chase' | 'due'

const statusTone: Record<OrderStatus, 'brand' | 'warning' | 'success' | 'danger'> = {
  待处理: 'warning',
  进行中: 'brand',
  已完成: 'success',
  已退款: 'danger',
  已取消: 'danger',
}

export default function TodoPage() {
  const orders = useOrdersStore((s) => s.orders)
  const settings = useOrdersStore((s) => s.settings)
  const setOrderStatus = useOrdersStore((s) => s.setOrderStatus)
  const restoreOrder = useOrdersStore((s) => s.restoreOrder)
  const openNew = useNewOrderStore((s) => s.open)
  const openEdit = useNewOrderStore((s) => s.openEdit)
  const addToast = useToastStore((s) => s.addToast)

  const [searchParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<Tab>('all')
  const [normalLimit, setNormalLimit] = useState(PAGE)
  const [expireLimit, setExpireLimit] = useState(PAGE)

  useEffect(() => {
    const raw = searchParams.get('tab')
    if (raw === 'chase' || raw === 'due' || raw === 'all') setTab(raw)
  }, [searchParams])

  const model = useMemo(() => workbench(orders, settings, query), [orders, settings, query])
  const searching = Boolean(query.trim())
  const follow = model.followCount
  const showNormal = tab === 'all' || tab === 'chase'
  const showDue = tab === 'all' || tab === 'due'
  const visibleNormal = showNormal ? model.openNormal : []
  const visibleDue = showDue ? model.expiring : []
  const quiet = visibleNormal.length === 0 && visibleDue.length === 0

  const meta = searching
    ? model.matchCount
      ? `${model.matchCount} 条匹配 · 待跟进 ${follow}`
      : follow
        ? `无匹配结果 · 待跟进 ${follow}`
        : '无匹配结果'
    : follow
      ? `${follow} 单待跟进`
      : orders.length === 0
        ? '还没有订单'
        : '已全部处理'

  const move = (order: Order, to: OrderStatus) => {
    const slice = captureOrderSlice(useOrdersStore.getState().orders, order.id)
    const next = setOrderStatus(order.id, to)
    if (!next) {
      addToast({ type: 'error', message: `无法改为「${to}」` })
      return
    }
    const message =
      to === '已完成'
        ? '已完成（可撤销）'
        : to === '进行中'
          ? '已开始处理'
          : `${actionLabel(to)}成功`
    if (slice) {
      toastUndo(message, () => restoreOrder(slice.order, slice.index))
    } else {
      addToast({ type: 'success', message })
    }
  }

  const cancel = (order: Order) => {
    if (!nextStatuses(order.status).includes('已取消')) {
      addToast({ type: 'error', message: '当前状态不能取消' })
      return
    }
    void modalConfirm({
      title: '取消这单？',
      content: `「${order.nickname || order.orderNo}」将标为已取消，不再计入待办。`,
      okText: '取消订单',
      tone: 'danger',
      onOk: () => move(order, '已取消'),
    })
  }

  if (orders.length === 0) {
    return (
      <div className="ds-page">
        <PageHeader title="待办" description="催单 + 托管到期" />
        <div className="ds-card items-center py-16 text-center text-muted-foreground">
          <ListTodo size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm text-foreground/80">还没有订单</p>
          <p className="ds-caption mt-1 mb-4">记第一单后，待处理 / 即将到期会出现在这里</p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button variant="primary" icon={PlusCircle} onClick={openNew}>
              新建订单
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                void seedDemoLedger()
              }}
            >
              灌入演示账本
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="ds-page">
      <PageHeader
        title="待办"
        description={meta}
        actions={
          <Button variant="primary" icon={PlusCircle} onClick={openNew}>
            新建订单
          </Button>
        }
      />

      <div className="ds-stagger grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="今日完成" value={model.doneTodayCount} sub="单" />
        <Stat label="今日到手" value={model.todayPayout} money sub="今日完成订单" variant="hero" />
        <Stat
          label="待跟进"
          value={follow}
          sub="催单 + 即将到期托管"
          variant={follow ? 'warn' : undefined}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <FormSegmentedControl
          value={tab}
          onChange={(v) => {
            setTab(v as Tab)
            setNormalLimit(PAGE)
            setExpireLimit(PAGE)
          }}
          options={[
            { value: 'all', label: follow ? `全部 ${follow}` : '全部' },
            { value: 'chase', label: model.chaseCount ? `催单 ${model.chaseCount}` : '催单' },
            { value: 'due', label: model.dueCount ? `到期 ${model.dueCount}` : '到期' },
          ]}
        />
        <div className="w-full sm:w-64">
          <FormInput
            prefix={<Search size={16} />}
            placeholder="搜索客户、单号、项目…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setNormalLimit(PAGE)
              setExpireLimit(PAGE)
            }}
          />
        </div>
      </div>

      {quiet ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
          {searching
            ? '没有符合条件的订单'
            : tab === 'chase'
              ? '没有待催的普通单'
              : tab === 'due'
                ? '没有即将到期的托管'
                : '今天没有待处理的订单'}
        </div>
      ) : null}

      {visibleNormal.length > 0 ? (
        <section className="flex flex-col gap-3">
          <SectionHead title="催单 · 普通单" count={visibleNormal.length} />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {visibleNormal.slice(0, normalLimit).map((order, i) => (
              <OrderCard
                key={order.id}
                order={order}
                delay={Math.min(i * 0.03, 0.2)}
                onMove={move}
                onCancel={() => cancel(order)}
                onEdit={() => openEdit(order.id)}
              />
            ))}
          </div>
          {visibleNormal.length > normalLimit ? (
            <div className="flex justify-center pt-1">
              <Button variant="secondary" onClick={() => setNormalLimit((n) => n + PAGE)}>
                加载更多（还有 {visibleNormal.length - normalLimit} 单）
              </Button>
            </div>
          ) : null}
        </section>
      ) : null}

      {visibleDue.length > 0 ? (
        <section className="flex flex-col gap-3">
          <SectionHead title="到期 · 托管" count={visibleDue.length} />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {visibleDue.slice(0, expireLimit).map((order, i) => (
              <OrderCard
                key={order.id}
                order={order}
                delay={Math.min(i * 0.03, 0.2)}
                dueLabel={daysUntilLabel(model.today, order.endDate)}
                onMove={move}
                onCancel={() => cancel(order)}
                onEdit={() => openEdit(order.id)}
              />
            ))}
          </div>
          {visibleDue.length > expireLimit ? (
            <div className="flex justify-center pt-1">
              <Button variant="secondary" onClick={() => setExpireLimit((n) => n + PAGE)}>
                加载更多（还有 {visibleDue.length - expireLimit} 单）
              </Button>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  )
}

function SectionHead({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex h-8 items-center gap-2">
      <h2 className="ds-section-title">{title}</h2>
      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-secondary px-1.5 text-xs font-medium tabular-nums text-muted-foreground">
        {count}
      </span>
    </div>
  )
}

function Stat({
  label,
  value,
  sub,
  money: asMoney,
  variant,
}: {
  label: string
  value: number
  sub: string
  money?: boolean
  variant?: 'hero' | 'warn'
}) {
  return (
    <div
      className={cn(
        'ds-card ds-stat ds-rise',
        variant === 'hero' && 'ds-stat--hero',
        variant === 'warn' && 'ds-stat--warn',
      )}
    >
      <div className="ds-stat__label">{label}</div>
      <div className="ds-stat__value">
        <CountUp value={value} money={asMoney} />
      </div>
      <div className="ds-stat__foot">{sub}</div>
    </div>
  )
}

function OrderCard({
  order,
  dueLabel,
  delay,
  onMove,
  onCancel,
  onEdit,
}: {
  order: Order
  dueLabel?: string
  delay: number
  onMove: (o: Order, to: OrderStatus) => void
  onCancel: () => void
  onEdit: () => void
}) {
  const next = nextStatuses(order.status)
  const main: OrderStatus | null =
    order.status === '待处理' ? '进行中' : order.status === '进行中' ? '已完成' : null
  const canCancel = next.includes('已取消')
  const summary =
    order.type === '托管'
      ? [order.custodyKind, order.settleKind, order.endDate].filter(Boolean).join(' · ') || '托管'
      : order.items.map((i) => i.product).join('、') || '—'

  return (
    <motion.article
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay }}
      className="ds-card gap-4 p-4 transition-colors duration-150 hover:border-brand/40"
    >
      <button type="button" className="w-full text-left" onClick={onEdit}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-medium leading-5 text-foreground">
              {order.nickname || '未命名'}
            </div>
            <div className="mt-1 truncate ds-caption">{summary}</div>
            <div className="mt-0.5 truncate ds-caption tabular-nums opacity-70">{order.orderNo}</div>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-sm font-medium leading-5 tabular-nums">{yuan2(order.amount)}</div>
            <div className="mt-1 ds-caption tabular-nums">
              到手 {payoutVoid(order) ? NO_PAYOUT : yuan2(order.payout)}
            </div>
          </div>
        </div>
      </button>
      <div className="box-content flex h-8 items-center justify-between gap-2 border-t border-border pt-4">
        <div className="flex min-w-0 items-center gap-2">
          <Tag tone={statusTone[order.status]}>{order.status}</Tag>
          {dueLabel ? (
            <span
              className={cn(
                'text-xs font-medium tabular-nums',
                dueLabel.startsWith('已过期') || dueLabel === '未设到期日'
                  ? 'text-destructive'
                  : 'text-warning',
              )}
            >
              {dueLabel}
            </span>
          ) : (
            <span className="truncate ds-caption">
              {order.platform} · {order.server}
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {canCancel ? (
            <Button size="sm" variant="ghost" icon={X} aria-label="取消订单" onClick={onCancel} />
          ) : null}
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
      </div>
    </motion.article>
  )
}
