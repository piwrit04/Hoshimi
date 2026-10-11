import { useMemo, useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Check, ListTodo, Play, Plus, PlusCircle, Search, Trash2, X } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { Tag } from '@/components/ui/data'
import { FormInput } from '@/components/ui/form'
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
import { useFreeTodosStore } from '@/store/useFreeTodosStore'

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
      <div className="ds-page--console">
        <div className="l2g-orders-head ds-rise">
          <div className="l2g-orders-head__title-group">
            <h1 className="l2g-orders-head__title title">待办</h1>
            <p className="l2g-orders-head__sub subtitle">催单 + 进行中托管到期</p>
          </div>
          <div className="l2g-orders-head__actions">
            <Button variant="primary" icon={PlusCircle} onClick={openNew}>
              新建订单
            </Button>
          </div>
        </div>
        <div className="ds-card items-center py-16 text-center text-muted-foreground">
          <ListTodo size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm text-foreground/80">还没有订单</p>
          <p className="ds-caption mt-1 mb-4">记第一单后，催单与进行中托管到期会出现在这里</p>
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
        <div className="mt-6">
          <FreeTodosPanel />
        </div>
      </div>
    )
  }

  return (
    <div className="ds-page--console">
      <div className="l2g-orders-head ds-rise">
        <div className="l2g-orders-head__title-group">
          <h1 className="l2g-orders-head__title title">待办</h1>
          <p className="l2g-orders-head__sub subtitle">{meta}</p>
        </div>
        <div className="l2g-orders-head__actions">
          <Button variant="primary" icon={PlusCircle} onClick={openNew}>
            新建订单
          </Button>
        </div>
      </div>

      <div className="ds-stagger grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="今日完成" value={model.doneTodayCount} sub="单" />
        <Stat label="今日到手" value={model.todayPayout} money sub="今日完成订单" variant="hero" />
        <Stat
          label="待跟进"
          value={follow}
          sub="催单 + 进行中托管到期"
          variant={follow ? 'warn' : undefined}
        />
      </div>

      <div className="l2g-filter-bar">
        <div className="l2g-seg" role="tablist" aria-label="待办筛选">
          {(
            [
              { id: 'all' as Tab, label: '全部', count: follow },
              { id: 'chase' as Tab, label: '催单', count: model.chaseCount },
              { id: 'due' as Tab, label: '到期', count: model.dueCount },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={
                tab === t.id ? 'l2g-seg__btn l2g-seg__btn--on' : 'l2g-seg__btn'
              }
              onClick={() => {
                setTab(t.id)
                setNormalLimit(PAGE)
                setExpireLimit(PAGE)
              }}
            >
              {t.label}
              {t.count ? <span className="l2g-seg__count">{t.count}</span> : null}
            </button>
          ))}
        </div>
        <div className="ds-toolbar">
          <div className="relative w-64" data-page-search>
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              className="dd-control w-full !pl-9 !pr-8"
              placeholder="搜索客户、单号、项目…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setNormalLimit(PAGE)
                setExpireLimit(PAGE)
              }}
            />
            {query.trim() ? (
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="清除搜索"
                onClick={() => {
                  setQuery('')
                  setNormalLimit(PAGE)
                  setExpireLimit(PAGE)
                }}
              >
                <X size={14} />
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {quiet ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
          {searching
            ? '没有符合条件的订单'
            : tab === 'chase'
              ? '没有待催的普通单'
              : tab === 'due'
                ? '没有即将到期的进行中托管'
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
          <SectionHead title="到期 · 进行中托管" count={visibleDue.length} />
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

      <FreeTodosPanel />
    </div>
  )
}

function FreeTodosPanel() {
  const items = useFreeTodosStore((s) => s.items)
  const add = useFreeTodosStore((s) => s.add)
  const toggle = useFreeTodosStore((s) => s.toggle)
  const remove = useFreeTodosStore((s) => s.remove)
  const clearDone = useFreeTodosStore((s) => s.clearDone)
  const [draft, setDraft] = useState('')
  const open = items.filter((it) => !it.done).length
  const done = items.length - open

  const submit = () => {
    if (!add(draft)) return
    setDraft('')
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex h-8 items-center gap-2">
        <h2 className="ds-section-title">自由待办</h2>
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-secondary px-1.5 text-xs font-medium tabular-nums text-muted-foreground">
          {open}
        </span>
        <span className="ds-caption">
          未完成{done > 0 ? ' · 含已完成' : ' · 本机备忘'}
        </span>
        <div className="flex-1" />
        {done > 0 ? (
          <Button size="sm" variant="ghost" onClick={() => clearDone()}>
            清除已完成（{done}）
          </Button>
        ) : null}
      </div>
      <div className="ds-card flex flex-col gap-3 p-4">
        <div className="flex gap-2">
          <div className="min-w-0 flex-1">
            <FormInput
              placeholder="随手记一件事…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  submit()
                }
              }}
            />
          </div>
          <Button variant="secondary" icon={Plus} onClick={submit} disabled={!draft.trim()}>
            添加
          </Button>
        </div>
        {items.length === 0 ? (
          <p className="ds-caption py-2 text-center">还没有自由待办</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {items.map((it) => (
              <li
                key={it.id}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-secondary/50"
              >
                <button
                  type="button"
                  className={cn(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded border',
                    it.done
                      ? 'border-brand bg-brand/15 text-brand'
                      : 'border-border text-transparent',
                  )}
                  aria-label={it.done ? '标为未完成' : '标为完成'}
                  onClick={() => toggle(it.id)}
                >
                  <Check size={12} />
                </button>
                <span
                  className={cn(
                    'min-w-0 flex-1 truncate text-sm',
                    it.done && 'text-muted-foreground line-through',
                  )}
                >
                  {it.text}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  icon={Trash2}
                  iconOnly
                  aria-label="删除"
                  onClick={() => remove(it.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
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
