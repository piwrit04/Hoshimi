import { useMemo, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ChevronRight, GitMerge, PenLine, PlusCircle, Search, Trash2, Users } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { yuan, yuan2 } from '@/lib/format'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { DataTable, Avatar, Tag, type DataTableColumn } from '@/components/ui/data'
import { FormInput, FormSelect, FormSegmentedControl, FormTextarea } from '@/components/ui/form'
import { Modal } from '@/components/ui/Modal'
import { modalConfirm } from '@/components/ui/ModalConfirm'
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
} from '@/domain/customers'
import { payoutVoid } from '@/domain/status'
import type { Customer } from '@/storage/types'

type SortKey = 'recent' | 'spent' | 'count'

type Row = {
  customer: Customer
  orderCount: number
  spent: number
  last: string | null
}

function letter(name: string) {
  return name.replace(/^【示例】/, '').trim().slice(0, 1) || '?'
}

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
        const last = mine.map((o) => o.createdAt).sort().at(-1) ?? null
        const spent = active
          .filter((o) => o.status === '已完成')
          .reduce((s, o) => s + o.amount, 0)
        return { customer, orderCount: active.length, spent, last }
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
  const rows = useCustomerRows(search, sort)
  const navigate = useNavigate()
  const openNew = useNewOrderStore((s) => s.open)
  const customers = useOrdersStore((s) => s.customers)
  const pairs = useMemo(() => duplicatePairs(customers), [customers])
  const totalActive = useMemo(
    () => customers.filter((c) => !c.mergedIntoId).length,
    [customers],
  )

  const columns: DataTableColumn<Row>[] = useMemo(
    () => [
      {
        key: 'customer',
        title: '客户',
        emphasis: 'primary',
        render: (r) => (
          <div className="flex min-w-0 items-center gap-3">
            <Avatar size="sm">{letter(r.customer.nickname)}</Avatar>
            <div className="dd-cell-dual min-w-0 flex-1">
              <div className="dd-cell-dual__top">
                <span className="dd-cell-dual__title">{r.customer.nickname}</span>
              </div>
              <div className="dd-cell-dual__bot">
                <span className="truncate">{r.customer.contact || '无联系方式'}</span>
                {r.customer.note ? (
                  <span className="truncate opacity-70">· {r.customer.note}</span>
                ) : null}
              </div>
            </div>
          </div>
        ),
      },
      {
        key: 'spent',
        title: '消费 · 近况',
        width: '148px',
        align: 'right',
        emphasis: 'anchor',
        render: (r) => (
          <div className="dd-cell-dual dd-cell-dual--right">
            <div className="dd-cell-dual__top tabular-nums">{yuan2(r.spent)}</div>
            <div className="dd-cell-dual__bot tabular-nums">
              <span>{r.orderCount} 单</span>
              <span>
                {r.last
                  ? new Date(r.last).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
                  : '—'}
              </span>
            </div>
          </div>
        ),
      },
      {
        key: 'go',
        title: '',
        width: '56px',
        align: 'right',
        emphasis: 'secondary',
        render: () => <ChevronRight size={16} className="ml-auto text-muted-foreground" />,
      },
    ],
    [],
  )

  return (
    <div className="ds-page">
      <PageHeader
        title="客户"
        description={`共 ${totalActive} 位 · 当前显示 ${rows.length} 位 · 记单时自动建档`}
        actions={
          <Button variant="primary" icon={PlusCircle} onClick={openNew}>
            新建订单
          </Button>
        }
      />

      <div className="dd-customers-toolbar">
        <div className="dd-customers-search" data-page-search>
          <FormInput
            prefix={<Search size={16} />}
            placeholder="搜索昵称 / 手机号"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            clearable
            onClear={() => setSearch('')}
          />
        </div>
        <FormSegmentedControl
          value={sort}
          onChange={(v) => setSort((v as SortKey) ?? 'recent')}
          options={[
            { value: 'recent', label: '最近' },
            { value: 'spent', label: '消费' },
            { value: 'count', label: '单量' },
          ]}
        />
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

      <div className="ds-table-card">
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
                    灌入演示数据
                  </Button>
                </div>
              ) : null}
            </div>
          }
        />
      </div>
    </div>
  )
}

const statusTone = {
  待处理: 'warning',
  进行中: 'brand',
  已完成: 'success',
  已退款: 'danger',
  已取消: 'danger',
} as const

function CustomerDetail({ id }: { id: string }) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const customer = useOrdersStore((s) => s.customers.find((c) => c.id === id))
  const allCustomers = useOrdersStore((s) => s.customers)
  const allOrders = useOrdersStore((s) => s.orders)
  const orders = useMemo(
    () => allOrders.filter((o) => o.customerId === id),
    [allOrders, id],
  )
  const updateCustomer = useOrdersStore((s) => s.updateCustomer)
  const deleteCustomer = useOrdersStore((s) => s.deleteCustomer)
  const mergeCustomers = useOrdersStore((s) => s.mergeCustomers)
  const addToast = useToastStore((s) => s.addToast)

  const [editing, setEditing] = useState(false)
  const [nick, setNick] = useState('')
  const [contact, setContact] = useState('')
  const [note, setNote] = useState('')
  const mergeFromQuery = searchParams.get('merge') ?? ''
  const [mergeTarget, setMergeTarget] = useState(mergeFromQuery)
  /* 合并提示条轻提示，不自动弹窗抢焦 */
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
      { key: 'orderNo', title: '单号', width: '148px', emphasis: 'secondary', render: (o) => <span className="font-mono text-[13px]">{o.orderNo}</span> },
      { key: 'createdAt', title: '日期', width: '72px', emphasis: 'secondary', render: (o) => <span className="tabular-nums">{new Date(o.createdAt).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}</span> },
      {
        key: 'items',
        title: '项目',
        emphasis: 'primary',
        render: (o) => (
          <span className="block truncate font-medium">
            {o.type === '托管' ? `${o.custodyKind} · ${o.settleKind}` : o.items.map((i) => i.product).join('、') || '—'}
          </span>
        ),
      },
      { key: 'platform', title: '渠道', width: '72px', emphasis: 'secondary' },
      { key: 'amount', title: '金额', width: '112px', align: 'right', emphasis: 'anchor', render: (o) => yuan2(o.amount) },
      { key: 'status', title: '状态', width: '104px', emphasis: 'anchor', render: (o) => <Tag tone={statusTone[o.status]}>{o.status}</Tag> },
    ],
    [],
  )

  if (!customer || customer.mergedIntoId) {
    return (
      <div className="ds-page">
        <div className="ds-card items-center py-16 text-center text-muted-foreground">
          <p className="text-sm">客户不存在或已合并</p>
          <Button className="mt-4" variant="secondary" onClick={() => navigate('/customers')}>
            返回列表
          </Button>
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

  return (
    <div className="ds-page">
      <div className="dd-customers-header ds-rise">
        <nav className="flex h-5 items-center gap-1 text-[13px] text-muted-foreground">
          <Link to="/customers" className="hover:text-foreground transition-colors">
            客户
          </Link>
          <ChevronRight size={14} />
          <span className="text-foreground">{customer.nickname}</span>
        </nav>

        <header className="ds-page-header">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar size="lg">{letter(customer.nickname)}</Avatar>
            <div className="min-w-0">
              <h1 className="ds-page-title truncate">{customer.nickname}</h1>
              <p className="ds-page-desc truncate">
                {customer.contact || '无联系方式'}
                {tail ? ` · 尾号 ${tail}` : ''}
                {customer.note ? ` · ${customer.note}` : ''}
              </p>
            </div>
          </div>
          <div className="ds-page-header__actions">
            <Button variant="secondary" icon={Trash2} onClick={askDelete}>
              删除
            </Button>
            <Button
              variant="secondary"
              icon={GitMerge}
              onClick={() => {
                setMergeTarget(mergeFromQuery || mergeTarget)
                setMergeOpen(true)
              }}
            >
              合并
            </Button>
            <Button variant="primary" icon={PenLine} onClick={openEdit}>
              编辑资料
            </Button>
          </div>
        </header>
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
            {last ? new Date(last).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }) : '—'}
          </div>
          <div className="ds-stat__foot">
            建档于 {new Date(customer.createdAt).toLocaleDateString('zh-CN')}
          </div>
        </div>
      </div>

      <Card title="订单记录" flush className={reduceMotion ? undefined : 'ds-rise'}>
        <DataTable
          columns={orderColumns}
          data={sorted}
          rowKey={(o) => o.id}
          onRowClick={(o) => openOrder(o.id)}
          empty={
            <div className="dd-customers-empty">
              <p className="text-sm text-foreground/80">尚未下单</p>
              <p className="ds-caption">记单时选这位客户就会出现在这里</p>
            </div>
          }
        />
      </Card>


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
