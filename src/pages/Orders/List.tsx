import { Check, LayoutList, MoreHorizontal, PenLine, Play, PlusCircle } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { DataTable, Tag, type DataTableColumn } from '@/components/ui/data'
import { Modal } from '@/components/ui/Modal'
import { Dropdown } from '@/components/ui/overlay'
import { useOrdersStore, type Order, type OrderStatus } from '@/store/useOrdersStore'
import { useNewOrderStore } from '@/store/useNewOrderStore'
import { useToastStore } from '@/store/useToastStore'
import {
  actionLabel,
  nextStatuses,
  NO_PAYOUT,
  payoutVoid,
  wantsReason,
} from '@/domain/status'
import { useState, memo, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { FormTextarea } from '@/components/ui/form'

/*
 * 订单列表：点行编辑；开始 / 完成主按钮；退款、取消收在「…」。
 * 数据来自 useOrdersStore（IndexedDB）。
 */

const statusTone: Record<OrderStatus, 'default' | 'warning' | 'success' | 'danger'> = {
  待处理: 'warning',
  进行中: 'default',
  已完成: 'success',
  已退款: 'danger',
  已取消: 'danger',
}

export default function Orders() {
  const orders = useOrdersStore((s) => s.orders)
  const openNewOrder = useNewOrderStore((s) => s.open)
  const openEdit = useNewOrderStore((s) => s.openEdit)
  const setOrderStatus = useOrdersStore((s) => s.setOrderStatus)
  const addToast = useToastStore((s) => s.addToast)

  const [reasonDialog, setReasonDialog] = useState<{
    order: Order
    to: OrderStatus
  } | null>(null)
  const [reason, setReason] = useState('')

  const move = (order: Order, to: OrderStatus) => {
    if (wantsReason(to)) {
      setReason('')
      setReasonDialog({ order, to })
      return
    }
    const next = setOrderStatus(order.id, to)
    if (!next) {
      addToast({ type: 'error', message: `无法改为「${to}」` })
      return
    }
    addToast({
      type: 'success',
      message: to === '已完成' ? '已完成' : to === '进行中' ? '已开始处理' : `已改为「${to}」`,
    })
  }

  const confirmReason = () => {
    if (!reasonDialog) return
    const { order, to } = reasonDialog
    const next = setOrderStatus(order.id, to)
    setReasonDialog(null)
    if (!next) {
      addToast({ type: 'error', message: `无法改为「${to}」` })
      return
    }
    const tip = reason.trim() ? `（${reason.trim()}）` : ''
    addToast({ type: 'success', message: `${actionLabel(to)}成功${tip}` })
  }

  const columns: DataTableColumn<Order>[] = useMemo(() => [
    {
      key: 'orderNo',
      title: '单号',
      width: '120px',
      render: (r) => <span className="font-mono text-xs">{r.orderNo}</span>,
    },
    {
      key: 'createdAt',
      title: '日期',
      width: '90px',
      render: (r) => (
        <span className="text-xs text-muted-foreground">
          {new Date(r.createdAt).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}
        </span>
      ),
    },
    {
      key: 'nickname',
      title: '客户',
      render: (r) => <CustomerCell order={r} />,
    },
    {
      key: 'items',
      title: '项目',
      render: (r) =>
        r.type === '托管' ? (
          <span>
            {r.custodyKind} · {r.settleKind}
          </span>
        ) : (
          <div className="text-sm">{r.items.map((i) => i.product).join('、')}</div>
        ),
    },
    {
      key: 'platform',
      title: '渠道',
      width: '70px',
      render: (r) => <span className="text-sm">{r.platform}</span>,
    },
    {
      key: 'amount',
      title: '金额',
      width: '90px',
      align: 'right',
      sortable: true,
      render: (r) => <span className="tabular-nums">¥{r.amount.toFixed(0)}</span>,
    },
    {
      key: 'payout',
      title: '到手',
      width: '90px',
      align: 'right',
      render: (r) =>
        payoutVoid(r) ? (
          <span className="text-muted-foreground">{NO_PAYOUT}</span>
        ) : (
          <span className="tabular-nums font-semibold text-brand">¥{r.payout.toFixed(0)}</span>
        ),
    },
    {
      key: 'status',
      title: '状态',
      width: '90px',
      render: (r) => <Tag tone={statusTone[r.status]}>{r.status}</Tag>,
    },
    {
      key: 'actions',
      title: '操作',
      width: '150px',
      align: 'right',
      render: (r) => (
        <OrderRowActions order={r} onMove={move} onEdit={() => openEdit(r.id)} />
      ),
    },
  ], [])

  const active = orders.filter((o) => !payoutVoid(o))
  const total = active.reduce((s, o) => s + o.amount, 0)
  const payout = active.reduce((s, o) => s + o.payout, 0)

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-6">
      <PageHeader
        icon={LayoutList}
        title={`订单 · 共 ${orders.length} 单，流水 ¥${total.toFixed(0)}，到手 ¥${payout.toFixed(0)}`}
        actions={
          <Button variant="primary" onClick={openNewOrder}>
            <PlusCircle size={16} /> 新建订单
          </Button>
        }
      />

      <div className="bg-card border border-border/50 rounded-xl overflow-hidden">
        <DataTable
          columns={columns}
          data={orders}
          rowKey={(r) => r.id}
          onRowClick={(r) => openEdit(r.id)}
          empty={
            <div className="py-16 text-center text-muted-foreground">
              <LayoutList size={36} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">还没有订单</p>
              <p className="text-xs mt-1">点右上角「新建订单」记第一单</p>
            </div>
          }
        />
      </div>

      <Modal
        isOpen={Boolean(reasonDialog)}
        onClose={() => setReasonDialog(null)}
        title={reasonDialog ? actionLabel(reasonDialog.to) : ''}
        className="max-w-sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setReasonDialog(null)}>
              取消
            </Button>
            <Button
              variant={reasonDialog?.to === '已退款' || reasonDialog?.to === '已取消' ? 'danger' : 'primary'}
              onClick={confirmReason}
            >
              确认
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground mb-3">
          将「{reasonDialog?.order.orderNo}」改为「{reasonDialog?.to}」。原因选填。
        </p>
        <FormTextarea
          label="原因"
          rows={2}
          placeholder="例如：客户要求退款"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </Modal>
    </div>
  )
}


function CustomerCell({ order }: { order: Order }) {
  const navigate = useNavigate()
  const customers = useOrdersStore((s) => s.customers)
  const id = useMemo(() => {
    if (order.customerId) return order.customerId
    const hit = customers.find(
      (c) =>
        !c.mergedIntoId &&
        ((order.contact && c.contact === order.contact) ||
          (!order.contact && c.nickname === order.nickname)),
    )
    return hit?.id
  }, [order.customerId, order.contact, order.nickname, customers])

  return (
    <button
      type="button"
      className="text-left hover:text-brand transition-colors"
      onClick={(e) => {
        e.stopPropagation()
        if (id) navigate(`/customers/${id}`)
      }}
    >
      <div className="font-semibold">{order.nickname}</div>
      <div className="text-xs text-muted-foreground">{order.contact}</div>
    </button>
  )
}

const OrderRowActions = memo(function OrderRowActions({
  order,
  onMove,
  onEdit,
}: {
  order: Order
  onMove: (order: Order, to: OrderStatus) => void
  onEdit: () => void
}) {
  const next = nextStatuses(order.status)
  const main: OrderStatus | null =
    order.status === '待处理' ? '进行中' : order.status === '进行中' ? '已完成' : null
  const others = next.filter((s) => s !== main)

  return (
    <div
      className="flex items-center justify-end gap-1"
      onClick={(e) => e.stopPropagation()}
    >
      {main ? (
        <Button
          size="sm"
          variant="secondary"
          icon={main === '进行中' ? Play : Check}
          onClick={() => onMove(order, main)}
        >
          {main === '进行中' ? '开始' : '完成'}
        </Button>
      ) : null}

      {others.length > 0 && (
        <Dropdown
          align="end"
          trigger={
            <span className="inline-flex">
              <Button
                variant="ghost"
                size="sm"
                icon={MoreHorizontal}
                iconOnly
                aria-label={order.status === '已完成' ? '退款' : '退款 / 取消'}
              />
            </span>
          }
          items={others.map((s) => ({
            key: s,
            label: actionLabel(s),
            danger: s === '已退款' || s === '已取消',
          }))}
          onSelect={(key) => onMove(order, key as OrderStatus)}
        />
      )}

      <Button
        variant="ghost"
        size="sm"
        icon={PenLine}
        iconOnly
        aria-label="编辑"
        onClick={onEdit}
      />
    </div>
  )
})
