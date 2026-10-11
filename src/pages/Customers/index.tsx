import { useMemo, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ChevronLeft,
  Download,
  GitMerge,
  MoreHorizontal,
  PenLine,
  Plus,
  PlusCircle,
  Search,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import { yuan, yuan2 } from '@/lib/format'
import { Button } from '@/components/ui/Button'
import { DataTable, Avatar, Tag, type DataTableColumn } from '@/components/ui/data'
import { FormInput, FormSelect, FormTextarea } from '@/components/ui/form'
import { Modal } from '@/components/ui/Modal'
import { modalConfirm } from '@/components/ui/ModalConfirm'
import { Dropdown } from '@/components/ui/overlay'
import { useOrdersStore, type Order } from '@/store/useOrdersStore'
import { useToastStore } from '@/store/useToastStore'
import { useNewOrderStore } from '@/store/useNewOrderStore'
import { seedDemoLedger } from '@/lib/seed-demo'
import {
  customerMatches,
  duplicatePairs,
  mergeNoteLine,
  nicknameError,
  phoneTail,
  resolveCustomerId,
} from '@/domain/customers'
import { payoutVoid } from '@/domain/status'
import { exportCustomersCsv } from '@/domain/export'
import type { Customer } from '@/storage/types'

type SortKey = 'recent' | 'spent' | 'count'

type Row = {
  customer: Customer
  orderCount: number
  spent: number
  last: string | null
  lastOrder: Order | null
}

function letter(name: string) {
  return name.replace(/^【示例】/, '').trim().slice(0, 1) || '?'
}

function shortDateTime(iso?: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function projectLabel(order: Order) {
  if (order.type === '托管') {
    return [order.custodyKind, order.settleKind].filter(Boolean).join(' · ') || '托管'
  }
  return order.items.map((i) => i.product).join('、') || '—'
}

function gameLabel(order: Order, games: { id: string; name: string }[]) {
  if (order.gameId) {
    const hit = games.find((g) => g.id === order.gameId)
    if (hit?.name) return hit.name
  }
  return order.items[0]?.category || '—'
}

const statusTone = {
  待处理: 'warning',
  进行中: 'brand',
  已完成: 'success',
  已退款: 'danger',
  已取消: 'danger',
} as const

function useCustomerRows(search: string, sort: SortKey): Row[] {
  const customers = useOrdersStore((s) => s.customers)
  const orders = useOrdersStore((s) => s.orders)

  return useMemo(() => {
    const q = search.trim()
    return customers
      .filter((c) => !c.mergedIntoId)
      .filter((c) => customerMatches(c, q))
      .map((customer) => {
        const mine = orders.filter((o) => o.customerId === customer.id)
        const active = mine.filter((o) => !payoutVoid(o))
        const lastOrder =
          [...mine].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null
        const last = lastOrder?.createdAt ?? null
        const spent = active
          .filter((o) => o.status === '已完成')
          .reduce((s, o) => s + o.amount, 0)
        return { customer, orderCount: active.length, spent, last, lastOrder }
      })
      .sort((a, b) =>
        sort === 'spent'
          ? b.spent - a.spent
          : sort === 'count'
            ? b.orderCount - a.orderCount
            : (b.last ?? '').localeCompare(a.last ?? ''),
      )
  }, [customers, orders, search, sort])
}

export default function CustomersPage() {
  const params = useParams<{ customerId?: string }>()
  if (params.customerId) return <CustomerDetail id={params.customerId} />
  return <CustomerList />
}

function CustomerList() {
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortKey>('recent')
  const [creating, setCreating] = useState(false)
  const [nick, setNick] = useState('')
  const [contact, setContact] = useState('')
  const [note, setNote] = useState('')
  const rows = useCustomerRows(search, sort)
  const navigate = useNavigate()
  const openNew = useNewOrderStore((s) => s.open)
  const openWithCustomer = useNewOrderStore((s) => s.openWithCustomer)
  const createCustomer = useOrdersStore((s) => s.createCustomer)
  const addToast = useToastStore((s) => s.addToast)
  const customers = useOrdersStore((s) => s.customers)
  const pairs = useMemo(() => duplicatePairs(customers), [customers])

  const openCreate = () => {
    setNick('')
    setContact('')
    setNote('')
    setCreating(true)
  }

  const saveCreate = () => {
    const err = nicknameError(nick)
    if (err) {
      addToast({ type: 'error', message: err })
      return
    }
    const created = createCustomer({ nickname: nick, contact, note })
    if (!created) {
      addToast({ type: 'error', message: '创建失败' })
      return
    }
    addToast({ type: 'success', message: '已创建客户' })
    setCreating(false)
    navigate(`/customers/${created.id}`)
  }
  const totalActive = useMemo(
    () => customers.filter((c) => !c.mergedIntoId).length,
    [customers],
  )

  const columns: DataTableColumn<Row>[] = useMemo(
    () => [
      {
        key: 'customer',
        title: '客户',
        width: '22%',
        align: 'center',
        emphasis: 'primary',
        render: (r) => (
          <div className="dd-cell-dual">
            <div className="dd-cell-dual__top">
              <span className="dd-cell-dual__title">{r.customer.nickname}</span>
            </div>
            <div className="dd-cell-dual__bot truncate" title={r.customer.contact || undefined}>
              {r.customer.contact || '无联系方式'}
            </div>
          </div>
        ),
      },
      {
        key: 'recent',
        title: '近单 · 状态',
        width: '26%',
        align: 'center',
        render: (r) => {
          const o = r.lastOrder
          if (!o) {
            return (
              <div className="dd-cell-dual">
                <div className="dd-cell-dual__top text-muted-foreground">暂无订单</div>
                <div className="dd-cell-dual__bot">—</div>
              </div>
            )
          }
          const top =
            o.type === '托管'
              ? `托管 · ${projectLabel(o)}`
              : projectLabel(o)
          return (
            <div className="dd-cell-dual">
              <div className="dd-cell-dual__top">
                <span className="truncate" title={top}>
                  {top}
                </span>
              </div>
              <div className="dd-cell-dual__bot flex items-center justify-center gap-1.5">
                <Tag tone={statusTone[o.status]}>{o.status}</Tag>
                <span className="truncate">{o.platform}</span>
              </div>
            </div>
          )
        },
      },
      {
        key: 'spent',
        title: '消费 · 已完成',
        width: '16%',
        align: 'center',
        emphasis: 'anchor',
        render: (r) => (
          <div className="dd-cell-dual">
            <div className="dd-cell-dual__top tabular-nums dd-money-flow">{yuan2(r.spent)}</div>
            <div className="dd-cell-dual__bot tabular-nums">{r.orderCount} 单</div>
          </div>
        ),
      },
      {
        key: 'last',
        title: '最近下单',
        width: '18%',
        align: 'center',
        emphasis: 'secondary',
        render: (r) => (
          <div className="dd-cell-dual">
            <div className="dd-cell-dual__top tabular-nums whitespace-nowrap">
              {shortDateTime(r.last)}
            </div>
            <div className="dd-cell-dual__bot">
              {r.customer.note ? (
                <span className="truncate" title={r.customer.note}>
                  {r.customer.note}
                </span>
              ) : (
                '—'
              )}
            </div>
          </div>
        ),
      },
      {
        key: 'actions',
        title: '操作',
        width: '14%',
        align: 'center',
        render: (r) => (
          <div
            className="flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              size="sm"
              variant="secondary"
              icon={PlusCircle}
              onClick={() =>
                openWithCustomer({
                  nickname: r.customer.nickname,
                  contact: r.customer.contact,
                })
              }
            >
              记一单
            </Button>
          </div>
        ),
      },
    ],
    [openWithCustomer],
  )

  return (
    <div className="ds-page--console">
      <div className="l2g-orders-head ds-rise">
        <div className="l2g-orders-head__title-group">
          <h1 className="l2g-orders-head__title title">客户</h1>
          <p className="l2g-orders-head__sub subtitle">
            共 {totalActive} 位 · 当前显示 {rows.length} 位 · 记单时自动建档
          </p>
        </div>
        <div className="l2g-orders-head__actions">
          <Dropdown
            align="end"
            trigger={
              <span className="inline-flex">
                <Button
                  variant="ghost"
                  icon={MoreHorizontal}
                  iconOnly
                  aria-label="更多操作"
                />
              </span>
            }
            items={[
              {
                key: 'export',
                label: '导出 CSV',
                icon: Download,
                disabled: rows.length === 0,
              },
              {
                key: 'new-order',
                label: '新建订单',
                icon: PlusCircle,
              },
            ]}
            onSelect={(key) => {
              if (key === 'export') {
                exportCustomersCsv(
                  rows.map((r) => r.customer),
                  rows.length === totalActive ? '客户' : '筛选客户',
                )
                addToast({
                  type: 'success',
                  message: `已导出 ${rows.length} 位客户`,
                })
              } else if (key === 'new-order') {
                openNew()
              }
            }}
          />
          <Button variant="primary" icon={Plus} onClick={openCreate}>
            新建客户
          </Button>
        </div>
      </div>

      <div className="l2g-filter-bar">
        <div className="l2g-seg" role="tablist" aria-label="客户排序">
          {(
            [
              { id: 'recent' as SortKey, label: '最近' },
              { id: 'spent' as SortKey, label: '消费' },
              { id: 'count' as SortKey, label: '单量' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={sort === t.id}
              className={
                sort === t.id ? 'l2g-seg__btn l2g-seg__btn--on' : 'l2g-seg__btn'
              }
              onClick={() => setSort(t.id)}
            >
              {t.label}
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
              placeholder="搜索昵称 / 手机号"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search.trim() ? (
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="清除搜索"
                onClick={() => setSearch('')}
              >
                <X size={14} />
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {pairs.length > 0 ? (
        <details className="ds-card overflow-hidden border-warning/30 bg-warning/5">
          <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 px-4 py-2 text-[13px] text-warning [&::-webkit-details-marker]:hidden">
            <Users size={16} className="shrink-0" />
            <span className="flex-1 font-medium">
              <b>{pairs.length}</b> 组客户疑似重复
            </span>
            <span className="ds-caption">点开查看 · 不会自动合并</span>
          </summary>
          <ul className="grid gap-1.5 border-t border-warning/20 px-4 py-3 text-[13px]">
            {pairs.map((pair) => {
              const label = (c: typeof pair.a) => {
                const tail = phoneTail(c.contact)
                return `${c.nickname}${tail ? `（${tail}）` : c.contact ? `（${c.contact}）` : ''}`
              }
              return (
                <li key={`${pair.a.id}-${pair.b.id}`} className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span>
                    <button
                      type="button"
                      className="font-semibold underline hover:text-foreground"
                      onClick={() => navigate(`/customers/${pair.a.id}?merge=${pair.b.id}`)}
                    >
                      {label(pair.a)}
                    </button>
                    {' '}与{' '}
                    <button
                      type="button"
                      className="font-semibold underline hover:text-foreground"
                      onClick={() => navigate(`/customers/${pair.b.id}?merge=${pair.a.id}`)}
                    >
                      {label(pair.b)}
                    </button>
                    <span className="text-muted-foreground">（{pair.reason}）</span>
                  </span>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => navigate(`/customers/${pair.a.id}?merge=${pair.b.id}`)}
                  >
                    去合并
                  </Button>
                </li>
              )
            })}
          </ul>
        </details>
      ) : null}

      <div className="table-container l2g-table">
        <DataTable
          columns={columns}
          data={rows}
          rowKey={(r) => r.customer.id}
          onRowClick={(r) => navigate(`/customers/${r.customer.id}`)}
          empty={
            <div className="dd-customers-empty">
              <Users size={36} className="dd-customers-empty__icon" />
              <p className="text-sm text-foreground/80">{search ? '没有匹配的客户' : '还没有客户'}</p>
              <p className="ds-caption">
                {search ? '换个关键词试试' : '记单时会自动创建客户档案，也可先灌入演示数据'}
              </p>
              {!search && totalActive === 0 ? (
                <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                  <Button size="sm" variant="primary" icon={Plus} onClick={openCreate}>
                    新建客户
                  </Button>
                  <Button size="sm" variant="secondary" icon={PlusCircle} onClick={openNew}>
                    新建订单
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      void seedDemoLedger()
                    }}
                  >
                    灌入演示数据
                  </Button>
                </div>
              ) : null}
            </div>
          }
        />
      </div>

      <Modal
        isOpen={creating}
        onClose={() => setCreating(false)}
        title="新建客户"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreating(false)}>
              取消
            </Button>
            <Button variant="primary" onClick={saveCreate}>
              创建
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <FormInput
            label="昵称"
            required
            value={nick}
            onChange={(e) => setNick(e.target.value)}
            placeholder="客户怎么称呼"
          />
          <FormInput
            label="联系方式"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="手机 / 微信 / QQ"
          />
          <FormTextarea
            label="备注"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="可选"
          />
        </div>
      </Modal>
    </div>
  )
}

function CustomerDetail({ id }: { id: string }) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const allCustomers = useOrdersStore((s) => s.customers)
  const games = useOrdersStore((s) => s.games)
  const customer = useMemo(
    () => allCustomers.find((c) => c.id === id),
    [allCustomers, id],
  )
  const liveId = useMemo(
    () => resolveCustomerId(allCustomers, id) ?? id,
    [allCustomers, id],
  )
  const allOrders = useOrdersStore((s) => s.orders)
  const orders = useMemo(
    () => allOrders.filter((o) => o.customerId === liveId || o.customerId === id),
    [allOrders, liveId, id],
  )
  const updateCustomer = useOrdersStore((s) => s.updateCustomer)
  const deleteCustomer = useOrdersStore((s) => s.deleteCustomer)
  const mergeCustomers = useOrdersStore((s) => s.mergeCustomers)
  const addToast = useToastStore((s) => s.addToast)
  const openWithCustomer = useNewOrderStore((s) => s.openWithCustomer)

  const [editing, setEditing] = useState(false)
  const [nick, setNick] = useState('')
  const [contact, setContact] = useState('')
  const [note, setNote] = useState('')
  const mergeFromQuery = searchParams.get('merge') ?? ''
  const [mergeTarget, setMergeTarget] = useState(mergeFromQuery)
  const [mergeOpen, setMergeOpen] = useState(false)
  const reduceMotion = useReducedMotion()
  const mergeHintCustomer = useMemo(
    () => (mergeFromQuery ? allCustomers.find((c) => c.id === mergeFromQuery) : undefined),
    [allCustomers, mergeFromQuery],
  )

  const others = useMemo(
    () => allCustomers.filter((c) => c.id !== id && !c.mergedIntoId),
    [allCustomers, id],
  )

  const openOrder = useNewOrderStore((s) => s.openEdit)
  const orderColumns: DataTableColumn<Order>[] = useMemo(
    () => [
      {
        key: 'orderNo',
        title: '订单号',
        width: '14%',
        align: 'center',
        emphasis: 'secondary',
        render: (o) => (
          <span className="dd-order-no dd-order-no--always font-mono text-[13px]">{o.orderNo}</span>
        ),
      },
      {
        key: 'content',
        title: '订单内容',
        width: '22%',
        align: 'center',
        emphasis: 'primary',
        render: (o) => {
          const game = gameLabel(o, games)
          const project = projectLabel(o)
          return (
            <div className="dd-cell-dual">
              <div className="dd-cell-dual__top">
                {o.type === '托管' ? (
                  <span className="font-semibold text-foreground">托管</span>
                ) : (
                  <span className="truncate" title={game}>
                    {game}
                  </span>
                )}
              </div>
              <div className="dd-cell-dual__bot">
                <span className="truncate" title={project}>
                  {project}
                </span>
              </div>
            </div>
          )
        },
      },
      {
        key: 'platform',
        title: '下单平台',
        width: '12%',
        align: 'center',
        render: (o) => {
          const transferHint = o.transferEnabled
            ? o.transferMode === 'ratio'
              ? `转单 ${Math.round(o.transferRatio * 100)}%`
              : o.transferAmount > 0
                ? `转单 ¥${o.transferAmount.toFixed(0)}`
                : '转单'
            : null
          return (
            <div className="dd-cell-dual">
              <div className="dd-cell-dual__top">{o.platform}</div>
              <div className="dd-cell-dual__bot">
                {transferHint ? (
                  <Tag tone="warning">{transferHint}</Tag>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
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
        render: (o) => (
          <div className="dd-cell-dual">
            <div className="dd-cell-dual__top tabular-nums dd-money-flow">{yuan2(o.amount)}</div>
            {payoutVoid(o) ? null : (
              <div className="dd-cell-dual__bot tabular-nums dd-money-gold">{yuan2(o.payout)}</div>
            )}
          </div>
        ),
      },
      {
        key: 'dates',
        title: '下单 · 完单',
        width: '18%',
        align: 'center',
        render: (o) => (
          <div className="dd-cell-dual">
            <div className="dd-cell-dual__top tabular-nums whitespace-nowrap">
              {shortDateTime(o.createdAt)}
            </div>
            <div className="dd-cell-dual__bot tabular-nums whitespace-nowrap">
              {o.completedAt ? shortDateTime(o.completedAt) : '—'}
            </div>
          </div>
        ),
      },
      {
        key: 'status',
        title: '状态',
        width: '10%',
        align: 'center',
        emphasis: 'anchor',
        render: (o) => <Tag tone={statusTone[o.status]}>{o.status}</Tag>,
      },
    ],
    [games],
  )

  // 已合并：跳到保留客户（订单点进来的旧 id 也能落地）
  if (customer?.mergedIntoId) {
    const target = resolveCustomerId(allCustomers, id)
    if (target && target !== id) {
      const qs = searchParams.toString()
      return <Navigate to={`/customers/${target}${qs ? `?${qs}` : ''}`} replace />
    }
  }

  if (!customer || customer.mergedIntoId) {
    return (
      <div className="ds-page--console">
        <div className="l2g-orders-head ds-rise">
          <div className="l2g-orders-head__title-group">
            <h1 className="l2g-orders-head__title title">客户不存在</h1>
            <p className="l2g-orders-head__sub subtitle">可能已合并或删除</p>
          </div>
          <div className="l2g-orders-head__actions">
            <Button variant="secondary" icon={ChevronLeft} onClick={() => navigate('/customers')}>
              返回列表
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const openEdit = () => {
    setNick(customer.nickname)
    setContact(customer.contact)
    setNote(customer.note)
    setEditing(true)
  }

  const save = () => {
    const err = nicknameError(nick)
    if (err) {
      addToast({ type: 'error', message: err })
      return
    }
    const next = updateCustomer(id, { nickname: nick, contact, note })
    if (!next) {
      addToast({ type: 'error', message: '保存失败' })
      return
    }
    addToast({ type: 'success', message: '已更新客户资料' })
    setEditing(false)
  }

  const askDelete = () => {
    void modalConfirm({
      title: '删除客户',
      content: `确定删除「${customer.nickname}」？有订单的客户不能删。`,
      okText: '删除',
      tone: 'danger',
      onOk: () => {
        const r = deleteCustomer(id)
        if (!r.ok) {
          addToast({ type: 'error', message: r.reason })
          throw new Error(r.reason)
        }
        addToast({ type: 'success', message: '已删除客户' })
        navigate('/customers')
      },
    })
  }

  const spent = orders
    .filter((o) => o.status === '已完成')
    .reduce((s, o) => s + o.amount, 0)
  const tail = phoneTail(customer.contact)

  const sorted = [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const last = sorted[0]?.createdAt

  const dismissMergeHint = () => {
    searchParams.delete('merge')
    setSearchParams(searchParams, { replace: true })
    setMergeTarget('')
  }

  const subParts = [
    customer.contact || '无联系方式',
    tail ? `尾号 ${tail}` : null,
    customer.note || null,
  ].filter(Boolean)

  return (
    <div className="ds-page--console">
      <div className="l2g-orders-head ds-rise">
        <div className="l2g-orders-head__title-group min-w-0">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              icon={ChevronLeft}
              iconOnly
              aria-label="返回客户列表"
              onClick={() => navigate('/customers')}
            />
            <Avatar size="md">{letter(customer.nickname)}</Avatar>
            <div className="min-w-0">
              <h1 className="l2g-orders-head__title title truncate">{customer.nickname}</h1>
              <p className="l2g-orders-head__sub subtitle truncate" title={subParts.join(' · ')}>
                {subParts.join(' · ')}
              </p>
            </div>
          </div>
        </div>
        <div className="l2g-orders-head__actions">
          <Dropdown
            align="end"
            trigger={
              <span className="inline-flex">
                <Button
                  variant="ghost"
                  icon={MoreHorizontal}
                  iconOnly
                  aria-label="更多操作"
                />
              </span>
            }
            items={[
              { key: 'edit', label: '编辑资料', icon: PenLine },
              { key: 'merge', label: '合并到其他客户', icon: GitMerge },
              { key: 'div', label: '', type: 'divider' },
              { key: 'delete', label: '删除客户', icon: Trash2, danger: true },
            ]}
            onSelect={(key) => {
              if (key === 'edit') openEdit()
              else if (key === 'merge') {
                setMergeTarget(mergeFromQuery || mergeTarget)
                setMergeOpen(true)
              } else if (key === 'delete') askDelete()
            }}
          />
          <Button
            variant="primary"
            icon={PlusCircle}
            onClick={() =>
              openWithCustomer({ nickname: customer.nickname, contact: customer.contact })
            }
          >
            记一单
          </Button>
        </div>
      </div>

      {mergeFromQuery && mergeHintCustomer ? (
        <div className="dd-customers-merge-hint" role="status">
          <GitMerge size={16} className="shrink-0 text-brand" />
          <p className="dd-customers-merge-hint__text">
            建议与 <strong>{mergeHintCustomer.nickname}</strong> 合并
            {mergeHintCustomer.contact ? `（${mergeHintCustomer.contact}）` : ''}
            · 不会自动合并
          </p>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setMergeTarget(mergeFromQuery)
              setMergeOpen(true)
            }}
          >
            去合并
          </Button>
          <Button size="sm" variant="ghost" onClick={dismissMergeHint}>
            忽略
          </Button>
        </div>
      ) : null}

      <div className="dd-customers-kpis ds-stagger">
        <div className="ds-card ds-stat ds-rise">
          <div className="ds-stat__label">订单数</div>
          <div className="ds-stat__value">{orders.length}</div>
          <div className="ds-stat__foot">含退款 / 取消</div>
        </div>
        <div className="ds-card ds-stat ds-stat--hero ds-rise">
          <div className="ds-stat__label">已完成消费</div>
          <div className="ds-stat__value">{yuan(spent)}</div>
          <div className="ds-stat__foot">只算「已完成」</div>
        </div>
        <div className="ds-card ds-stat ds-rise">
          <div className="ds-stat__label">最近下单</div>
          <div className="ds-stat__value">
            {last ? shortDateTime(last) : '—'}
          </div>
          <div className="ds-stat__foot">
            建档于 {new Date(customer.createdAt).toLocaleDateString('zh-CN')}
          </div>
        </div>
      </div>

      <div className={reduceMotion ? undefined : 'ds-rise'}>
        <div className="mb-2 flex items-baseline justify-between gap-2 px-0.5">
          <h2 className="text-sm font-semibold text-foreground">订单记录</h2>
          <span className="ds-caption">{sorted.length} 单</span>
        </div>
        <div className="table-container l2g-table">
          <DataTable
            columns={orderColumns}
            data={sorted}
            rowKey={(o) => o.id}
            onRowClick={(o) => openOrder(o.id)}
            empty={
              <div className="dd-customers-empty">
                <p className="text-sm text-foreground/80">尚未下单</p>
                <p className="ds-caption">点「记一单」会带上昵称和联系方式</p>
                <Button
                  className="mt-3"
                  size="sm"
                  variant="primary"
                  icon={PlusCircle}
                  onClick={() =>
                    openWithCustomer({ nickname: customer.nickname, contact: customer.contact })
                  }
                >
                  记一单
                </Button>
              </div>
            }
          />
        </div>
      </div>

      <Modal
        isOpen={mergeOpen}
        onClose={() => {
          setMergeOpen(false)
          if (mergeFromQuery) {
            searchParams.delete('merge')
            setSearchParams(searchParams, { replace: true })
          }
        }}
        title="合并到其他客户"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setMergeOpen(false)
                if (mergeFromQuery) {
                  searchParams.delete('merge')
                  setSearchParams(searchParams, { replace: true })
                }
              }}
            >
              取消
            </Button>
            <Button
              variant="danger"
              disabled={!mergeTarget}
              onClick={() => {
                const into = others.find((c) => c.id === mergeTarget)
                if (!into || !customer) return
                const line = mergeNoteLine(customer, into)
                void modalConfirm({
                  title: '合并客户？',
                  content: `「${customer.nickname}」的 ${orders.length} 张订单将转到「${into.nickname}」名下。${
                    line ? `对方的手机号和备注会追加到保留客户的备注里。` : ''
                  }此操作无法撤销。`,
                  okText: '确认合并',
                  tone: 'danger',
                  onOk: () => {
                    const r = mergeCustomers(id, mergeTarget)
                    if (!r.ok) {
                      addToast({ type: 'error', message: r.reason })
                      throw new Error(r.reason)
                    }
                    addToast({ type: 'success', message: '客户已合并' })
                    navigate(`/customers/${mergeTarget}`)
                  },
                })
              }}
            >
              合并
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            用于合并重复的客户档案。确认后，该客户的全部订单将转到所选客户名下。
          </p>
          <FormSelect
            label="保留客户"
            value={mergeTarget || null}
            onChange={(v) => setMergeTarget(v ?? '')}
            placeholder="选择客户"
            options={others.map((c) => ({
              value: c.id,
              label: c.nickname,
              hint: c.contact || '无联系方式',
            }))}
            filterable
          />
        </div>
      </Modal>

      <Modal
        isOpen={editing}
        onClose={() => setEditing(false)}
        title="编辑客户"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(false)}>
              取消
            </Button>
            <Button variant="primary" onClick={save}>
              保存
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <FormInput label="昵称" required value={nick} onChange={(e) => setNick(e.target.value)} />
          <FormInput
            label="联系方式"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="手机 / 微信 / QQ"
          />
          <FormTextarea
            label="备注"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  )
}
