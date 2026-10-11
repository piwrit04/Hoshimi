import { useMemo, useState, useEffect, memo, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Check,
  ListTodo,
  MoreHorizontal,
  Play,
  Plus,
  PlusCircle,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { DataTable, Tag, type DataTableColumn } from '@/components/ui/data'
import { FormInput } from '@/components/ui/form'
import { modalConfirm } from '@/components/ui/ModalConfirm'
import { Dropdown } from '@/components/ui/overlay'
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
import { yuan, yuan2 } from '@/lib/format'
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

type TodoRow = Order & { dueLabel?: string; section: 'chase' | 'due' }

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

  // 到手：dd-money-gold = 品牌柔粉 #D8A0BC（同 Orders da437eb / Customers）
  const meta =
    orders.length === 0
      ? '催单 + 进行中托管到期'
      : [
          `今日完成 ${model.doneTodayCount}`,
          <>
            今日到手 <span className="dd-money-gold">{yuan(model.todayPayout)}</span>
          </>,
          follow ? `待收口 ${follow}` : '已全部处理',
          searching
            ? model.matchCount
              ? `${model.matchCount} 条匹配`
              : '无匹配结果'
            : null,
        ]
          .filter(Boolean)
          .reduce<ReactNode[]>((acc, part, i) => {
            if (i > 0) acc.push(' · ')
            acc.push(part)
            return acc
          }, [])

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

  const chaseRows: TodoRow[] = useMemo(
    () =>
      visibleNormal.slice(0, normalLimit).map((o) => ({
        ...o,
        section: 'chase' as const,
      })),
    [visibleNormal, normalLimit],
  )

  const dueRows: TodoRow[] = useMemo(
    () =>
      visibleDue.slice(0, expireLimit).map((o) => ({
        ...o,
        dueLabel: daysUntilLabel(model.today, o.endDate),
        section: 'due' as const,
      })),
    [visibleDue, expireLimit, model.today],
  )

  const allRows: TodoRow[] = useMemo(
    () => [...chaseRows, ...dueRows],
    [chaseRows, dueRows],
  )

  const showTypeCol = tab === 'all'

  const columns: DataTableColumn<TodoRow>[] = useMemo(() => {
    const cols: DataTableColumn<TodoRow>[] = []

    if (showTypeCol) {
      cols.push({
        key: 'kind',
        title: '类型',
        width: '8%',
        align: 'center',
        render: (r) => (
          <Tag tone={r.section === 'chase' ? 'warning' : 'brand'}>
            {r.section === 'chase' ? '催单' : '到期'}
          </Tag>
        ),
      })
    }

    cols.push(
      {
        key: 'customer',
        title: '客户',
        width: showTypeCol ? '16%' : '18%',
        align: 'center',
        emphasis: 'primary',
        render: (r) => (
          <div className="dd-cell-dual">
            <div className="dd-cell-dual__top">
              <span className="dd-cell-dual__title">{r.nickname || '未命名'}</span>
            </div>
            <div className="dd-cell-dual__bot truncate tabular-nums" title={r.orderNo}>
              {r.orderNo}
            </div>
          </div>
        ),
      },
      {
        key: 'content',
        title: '订单内容',
        width: showTypeCol ? '22%' : '24%',
        align: 'center',
        render: (r) => {
          const summary =
            r.type === '托管'
              ? [r.custodyKind, r.settleKind].filter(Boolean).join(' · ') || '托管'
              : r.items.map((i) => i.product).join('、') || '—'
          const bot =
            r.section === 'due' && r.dueLabel
              ? r.dueLabel
              : [r.platform, r.server].filter(Boolean).join(' · ') || '—'
          const dueHot =
            r.dueLabel &&
            (r.dueLabel.startsWith('已过期') || r.dueLabel === '未设到期日')
          return (
            <div className="dd-cell-dual">
              <div className="dd-cell-dual__top truncate" title={summary}>
                {summary}
              </div>
              <div
                className={cn(
                  'dd-cell-dual__bot truncate',
                  r.section === 'due' && (dueHot ? 'text-destructive' : 'dd-cell-dual__due text-warning'),
                )}
                title={bot}
              >
                {bot}
              </div>
            </div>
          )
        },
      },
      {
        key: 'amount',
        title: '金额 · 到手',
        width: '14%',
        align: 'center',
        emphasis: 'anchor',
        render: (r) => (
          <div className="dd-cell-dual">
            <div className="dd-cell-dual__top tabular-nums dd-money-flow">{yuan2(r.amount)}</div>
            {payoutVoid(r) ? (
              <div className="dd-cell-dual__bot tabular-nums text-muted-foreground">{NO_PAYOUT}</div>
            ) : (
              <div className="dd-cell-dual__bot tabular-nums dd-money-gold">{yuan2(r.payout)}</div>
            )}
          </div>
        ),
      },
      {
        key: 'status',
        title: '状态',
        width: '12%',
        align: 'center',
        emphasis: 'anchor',
        render: (r) => <Tag tone={statusTone[r.status]}>{r.status}</Tag>,
      },
      {
        key: 'actions',
        title: '操作',
        width: '16%',
        align: 'center',
        render: (r) => (
          <TodoRowActions
            order={r}
            onMove={move}
            onCancel={() => cancel(r)}
            onEdit={() => openEdit(r.id)}
          />
        ),
      },
    )

    return cols
    // move/cancel/openEdit are stable enough for this page
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showTypeCol])

  const emptyReason = searching
    ? `没有符合「${query.trim()}」的待办`
    : tab === 'chase'
      ? '没有待催的普通单'
      : tab === 'due'
        ? '没有即将到期的进行中托管'
        : '今天没有待处理的订单'

  const emptyHint = searching
    ? '试试清空搜索，或切换催单 / 到期'
    : tab === 'chase'
      ? '普通单进入待处理 / 进行中后会出现在这里'
      : tab === 'due'
        ? '进行中托管进入到期窗口后会出现在这里'
        : '记新单或开始处理现有订单后，催单与到期会出现在这里'

  const emptyBlock = (
    <div className="py-16 text-center text-muted-foreground">
      <ListTodo size={36} className="mx-auto mb-3 opacity-30" />
      <p className="text-sm text-foreground/80">{emptyReason}</p>
      <p className="ds-caption mt-1">{emptyHint}</p>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        {searching ? (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setQuery('')
              setNormalLimit(PAGE)
              setExpireLimit(PAGE)
            }}
          >
            清空搜索
          </Button>
        ) : null}
        {tab !== 'all' ? (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setTab('all')
              setNormalLimit(PAGE)
              setExpireLimit(PAGE)
            }}
          >
            看全部待办
          </Button>
        ) : null}
        <Button size="sm" variant="primary" icon={PlusCircle} onClick={openNew}>
          新建订单
        </Button>
      </div>
    </div>
  )

  const moreNormal = visibleNormal.length > normalLimit
  const moreDue = visibleDue.length > expireLimit
  const loadMore = (
    <>
      {tab === 'all' && (moreNormal || moreDue) ? (
        <div className="flex justify-center pt-1">
          <Button
            variant="secondary"
            onClick={() => {
              if (moreNormal) setNormalLimit((n) => n + PAGE)
              if (moreDue) setExpireLimit((n) => n + PAGE)
            }}
          >
            加载更多（还有{' '}
            {(moreNormal ? visibleNormal.length - normalLimit : 0) +
              (moreDue ? visibleDue.length - expireLimit : 0)}{' '}
            单）
          </Button>
        </div>
      ) : null}
      {tab === 'chase' && moreNormal ? (
        <div className="flex justify-center pt-1">
          <Button variant="secondary" onClick={() => setNormalLimit((n) => n + PAGE)}>
            加载更多（还有 {visibleNormal.length - normalLimit} 单）
          </Button>
        </div>
      ) : null}
      {tab === 'due' && moreDue ? (
        <div className="flex justify-center pt-1">
          <Button variant="secondary" onClick={() => setExpireLimit((n) => n + PAGE)}>
            加载更多（还有 {visibleDue.length - expireLimit} 单）
          </Button>
        </div>
      ) : null}
    </>
  )

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

      {orders.length === 0 ? (
        <>
          <div className="table-container l2g-table">
            <div className="py-16 text-center text-muted-foreground">
              <ListTodo size={36} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm text-foreground/80">还没有订单</p>
              <p className="ds-caption mt-1">
                记第一单后，催单与进行中托管到期会出现在这里
              </p>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                <Button size="sm" variant="primary" icon={PlusCircle} onClick={openNew}>
                  新建订单
                </Button>
                <Button
                  size="sm"
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
          <FreeTodosPanel />
        </>
      ) : (
        <>
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
            <div className="table-container l2g-table">{emptyBlock}</div>
          ) : tab === 'all' ? (
            <section className="flex flex-col gap-2">
              <div className="table-container l2g-table">
                <DataTable
                  columns={columns}
                  data={allRows}
                  rowKey={(r) => r.id}
                  compact
                  onRowClick={(r) => openEdit(r.id)}
                />
              </div>
              {loadMore}
            </section>
          ) : (
            <>
              {tab === 'chase' && visibleNormal.length > 0 ? (
                <section className="flex flex-col gap-2">
                  <div className="table-container l2g-table">
                    <DataTable
                      columns={columns}
                      data={chaseRows}
                      rowKey={(r) => r.id}
                      compact
                      onRowClick={(r) => openEdit(r.id)}
                    />
                  </div>
                  {loadMore}
                </section>
              ) : null}
              {tab === 'due' && visibleDue.length > 0 ? (
                <section className="flex flex-col gap-2">
                  <div className="table-container l2g-table">
                    <DataTable
                      columns={columns}
                      data={dueRows}
                      rowKey={(r) => r.id}
                      compact
                      onRowClick={(r) => openEdit(r.id)}
                    />
                  </div>
                  {loadMore}
                </section>
              ) : null}
            </>
          )}

          <FreeTodosPanel />
        </>
      )}
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
    <section className="flex flex-col gap-2">
      <SectionHead
        title="自由待办"
        count={open}
        hint={done > 0 ? '未完成 · 含已完成' : '本机备忘'}
        trailing={
          done > 0 ? (
            <Button size="sm" variant="ghost" onClick={() => clearDone()}>
              清除已完成（{done}）
            </Button>
          ) : null
        }
      />
      <div className="table-container l2g-table">
        <div className="flex flex-col gap-2 p-3">
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
            <div className="py-8 text-center text-muted-foreground">
              <p className="text-sm text-foreground/80">还没有自由待办</p>
              <p className="ds-caption mt-1">和催单 / 到期同一工作台，随手备忘留在本机</p>
            </div>
          ) : (
            <ul className="flex flex-col divide-y divide-border/60">
              {items.map((it) => (
                <li key={it.id} className="flex items-center gap-2 px-1 py-2">
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
      </div>
    </section>
  )
}

function SectionHead({
  title,
  count,
  hint,
  trailing,
}: {
  title: string
  count: number
  hint?: string
  trailing?: ReactNode
}) {
  return (
    <div className="flex h-8 items-center gap-2">
      <h2 className="ds-section-title">{title}</h2>
      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-secondary px-1.5 text-xs font-medium tabular-nums text-muted-foreground">
        {count}
      </span>
      {hint ? <span className="ds-caption">{hint}</span> : null}
      <div className="flex-1" />
      {trailing}
    </div>
  )
}

const TodoRowActions = memo(function TodoRowActions({
  order,
  onMove,
  onCancel,
  onEdit,
}: {
  order: Order
  onMove: (o: Order, to: OrderStatus) => void
  onCancel: () => void
  onEdit: () => void
}) {
  const next = nextStatuses(order.status)
  const main: OrderStatus | null =
    order.status === '待处理' ? '进行中' : order.status === '进行中' ? '已完成' : null
  const canCancel = next.includes('已取消')

  const menuItems = [
    { key: 'edit', label: '编辑' },
    ...(canCancel ? [{ key: 'cancel', label: '取消订单', danger: true as const }] : []),
  ]

  return (
    <div
      className="flex items-center justify-center gap-1"
      onClick={(e) => e.stopPropagation()}
    >
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

      <Dropdown
        align="end"
        trigger={
          <span className="inline-flex">
            <Button
              variant="ghost"
              size="sm"
              icon={MoreHorizontal}
              iconOnly
              aria-label="更多操作"
            />
          </span>
        }
        items={menuItems}
        onSelect={(key) => {
          if (key === 'edit') onEdit()
          else if (key === 'cancel') onCancel()
        }}
      />
    </div>
  )
})
