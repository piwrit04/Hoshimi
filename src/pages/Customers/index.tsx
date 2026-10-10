import { useMemo, useState, memo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ChevronRight, PenLine, Trash2, Users } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { DataTable, Avatar, Tag, type DataTableColumn } from '@/components/ui/data'
import { FormInput, FormTextarea } from '@/components/ui/form'
import { Modal } from '@/components/ui/Modal'
import { modalConfirm } from '@/components/ui/ModalConfirm'
import { useOrdersStore, type Order } from '@/store/useOrdersStore'
import { useToastStore } from '@/store/useToastStore'
import { useNewOrderStore } from '@/store/useNewOrderStore'
import { customerMatches, nicknameError, phoneTail } from '@/domain/customers'
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

  const columns: DataTableColumn<Row>[] = useMemo(
    () => [
      {
        key: 'customer',
        title: '客户',
        render: (r) => (
          <div className="flex items-center gap-3">
            <Avatar size="sm">{letter(r.customer.nickname)}</Avatar>
            <div className="min-w-0">
              <div className="font-semibold truncate">{r.customer.nickname}</div>
              <div className="text-xs text-muted-foreground">
                {r.customer.contact || '无联系方式'}
              </div>
            </div>
          </div>
        ),
      },
      {
        key: 'orderCount',
        title: '订单',
        width: '80px',
        align: 'right',
        render: (r) => <span className="tabular-nums font-semibold">{r.orderCount}</span>,
      },
      {
        key: 'spent',
        title: '消费',
        width: '100px',
        align: 'right',
        render: (r) => (
          <span className="tabular-nums text-brand font-semibold">¥{r.spent.toFixed(0)}</span>
        ),
      },
      {
        key: 'last',
        title: '最近下单',
        width: '110px',
        render: (r) => (
          <span className="text-xs text-muted-foreground">
            {r.last
              ? new Date(r.last).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
              : '—'}
          </span>
        ),
      },
      {
        key: 'go',
        title: '',
        width: '40px',
        align: 'right',
        render: () => <ChevronRight size={16} className="text-muted-foreground" />,
      },
    ],
    [],
  )

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-6">
      <PageHeader
        icon={Users}
        title={`客户 · ${rows.length} 位`}
        actions={
          <Button variant="primary" onClick={openNew}>
            新建订单
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2 mb-4">
        <div className="flex-1 min-w-[180px]">
          <FormInput
            placeholder="搜索昵称 / 手机号"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            clearable
            onClear={() => setSearch('')}
          />
        </div>
        <select
          className="h-10 rounded-lg border border-border bg-card px-3 text-sm text-foreground"
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          aria-label="排序"
        >
          <option value="recent">最近下单</option>
          <option value="spent">消费金额</option>
          <option value="count">订单数</option>
        </select>
      </div>

      <div className="bg-card border border-border/50 rounded-xl overflow-hidden">
        <DataTable
          columns={columns}
          data={rows}
          rowKey={(r) => r.customer.id}
          onRowClick={(r) => navigate(`/customers/${r.customer.id}`)}
          empty={
            <div className="py-16 text-center text-muted-foreground">
              <Users size={36} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">{search ? '没有匹配的客户' : '还没有客户'}</p>
              <p className="text-xs mt-1">
                {search ? '换个关键词试试' : '记单时会自动创建客户档案'}
              </p>
            </div>
          }
        />
      </div>
    </div>
  )
}

const OrderMini = memo(function OrderMini({ order }: { order: Order }) {
  const openEdit = useNewOrderStore((s) => s.openEdit)
  return (
    <button
      type="button"
      onClick={() => openEdit(order.id)}
      className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-secondary/50 transition-colors border-b border-border/40 last:border-0"
    >
      <div className="min-w-0">
        <div className="font-mono text-xs text-muted-foreground">{order.orderNo}</div>
        <div className="text-sm truncate">
          {order.type === '托管'
            ? `${order.custodyKind} · ${order.settleKind}`
            : order.items.map((i) => i.product).join('、') || '—'}
        </div>
      </div>
      <div className="text-right shrink-0 space-y-1">
        <div className="tabular-nums font-semibold">¥{order.amount.toFixed(0)}</div>
        <Tag
          tone={
            order.status === '已完成'
              ? 'success'
              : order.status === '进行中'
                ? 'default'
                : order.status === '待处理'
                  ? 'warning'
                  : 'danger'
          }
        >
          {order.status}
        </Tag>
      </div>
    </button>
  )
})

function CustomerDetail({ id }: { id: string }) {
  const navigate = useNavigate()
  const customer = useOrdersStore((s) => s.customers.find((c) => c.id === id))
  const allOrders = useOrdersStore((s) => s.orders)
  const orders = useMemo(
    () => allOrders.filter((o) => o.customerId === id),
    [allOrders, id],
  )
  const updateCustomer = useOrdersStore((s) => s.updateCustomer)
  const deleteCustomer = useOrdersStore((s) => s.deleteCustomer)
  const addToast = useToastStore((s) => s.addToast)

  const [editing, setEditing] = useState(false)
  const [nick, setNick] = useState('')
  const [contact, setContact] = useState('')
  const [note, setNote] = useState('')

  if (!customer || customer.mergedIntoId) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center text-muted-foreground">
        <p>客户不存在或已合并</p>
        <Button className="mt-4" variant="secondary" onClick={() => navigate('/customers')}>
          返回列表
        </Button>
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

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 py-6 space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/customers" className="hover:text-foreground">
          客户
        </Link>
        <ChevronRight size={14} />
        <span className="text-foreground font-medium">{customer.nickname}</span>
      </div>

      <div className="bg-card border border-border/50 rounded-xl p-5 flex flex-wrap items-start gap-4">
        <Avatar size="lg">{letter(customer.nickname)}</Avatar>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold">{customer.nickname}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {customer.contact || '无联系方式'}
            {tail ? ` · ${tail}` : ''}
          </p>
          {customer.note ? (
            <p className="text-sm mt-2 text-muted-foreground whitespace-pre-wrap">{customer.note}</p>
          ) : null}
          <div className="flex gap-4 mt-3 text-sm">
            <span>
              订单 <b className="tabular-nums">{orders.length}</b>
            </span>
            <span>
              消费 <b className="tabular-nums text-brand">¥{spent.toFixed(0)}</b>
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" icon={PenLine} onClick={openEdit}>
            编辑
          </Button>
          <Button variant="ghost" size="sm" icon={Trash2} onClick={askDelete}>
            删除
          </Button>
        </div>
      </div>

      <section className="bg-card border border-border/50 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border/50 text-sm font-semibold">订单记录</div>
        {orders.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">尚未下单</p>
        ) : (
          orders.map((o) => <OrderMini key={o.id} order={o} />)
        )}
      </section>

      <Modal
        isOpen={editing}
        onClose={() => setEditing(false)}
        title="编辑客户"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(false)}>
              取消
            </Button>
            <Button variant="primary" onClick={save}>
              保存
            </Button>
          </>
        }
      >
        <div className="space-y-3">
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
