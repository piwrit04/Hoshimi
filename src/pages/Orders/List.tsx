import {
  Check,
  Download,
  LayoutList,
  MoreHorizontal,
  PenLine,
  Play,
  PlusCircle,
  Search,
  X,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { DataTable, Tag, type DataTableColumn } from '@/components/ui/data'
import { Modal } from '@/components/ui/Modal'
import { Dropdown } from '@/components/ui/overlay'
import { FormSelect, FormTextarea } from '@/components/ui/form'
import { useOrdersStore, type Order, type OrderStatus, type OrderType, type Platform } from '@/store/useOrdersStore'
import { useNewOrderStore } from '@/store/useNewOrderStore'
import { useToastStore } from '@/store/useToastStore'
import {
  actionLabel,
  nextStatuses,
  NO_PAYOUT,
  payoutVoid,
  wantsReason,
} from '@/domain/status'
import {
  filterOrders,
  sortOrders,
  type OrderMode,
  type OrderSortDir,
  type OrderSortKey,
  type Period,
} from '@/domain/selectors'
import { exportCsv, exportXlsx } from '@/domain/export'
import { useState, memo, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

/*
 * 订单列表：筛选 / 排序记住在模块级；点行编辑；开始 / 完成主按钮。
 */

const statusTone: Record<OrderStatus, 'default' | 'warning' | 'success' | 'danger'> = {
  待处理: 'warning',
  进行中: 'default',
  已完成: 'success',
  已退款: 'danger',
  已取消: 'danger',
}

const MODES: { id: OrderMode; label: string }[] = [
  { id: 'open', label: '未完成' },
  { id: 'all', label: '全部状态' },
  { id: '待处理', label: '待处理' },
  { id: '进行中', label: '进行中' },
  { id: '已完成', label: '已完成' },
  { id: '已退款', label: '已退款' },
  { id: '已取消', label: '已取消' },
]

const PERIODS: { id: Period; label: string }[] = [
  { id: 'all', label: '全部时间' },
  { id: 'today', label: '今天' },
  { id: '7d', label: '最近 7 天' },
  { id: 'month', label: '本月' },
  { id: 'lastMonth', label: '上个月' },
]

const TYPES: { id: OrderType | 'all'; label: string }[] = [
  { id: 'all', label: '全部类型' },
  { id: '普通', label: '普通' },
  { id: '托管', label: '托管' },
]

const SORT_OPTIONS: { value: `${OrderSortKey}:${OrderSortDir}`; label: string }[] = [
  { value: 'createdAt:desc', label: '下单 · 新→旧' },
  { value: 'createdAt:asc', label: '下单 · 旧→新' },
  { value: 'amount:desc', label: '金额 · 高→低' },
  { value: 'amount:asc', label: '金额 · 低→高' },
  { value: 'completedAt:desc', label: '完成 · 新→旧' },
  { value: 'completedAt:asc', label: '完成 · 旧→新' },
]

/** 模块级记住筛选，切页回来不丢 */
type OrdersListState = {
  type: OrderType | 'all'
  mode: OrderMode
  platform: Platform | 'all'
  period: Period
  search: string
  sortBy: OrderSortKey
  sortDir: OrderSortDir
}

const ordersListState: OrdersListState = {
  type: 'all',
  mode: 'open',
  platform: 'all',
  period: 'all',
  search: '',
  sortBy: 'createdAt',
  sortDir: 'desc',
}

function writeListState(partial: Partial<OrdersListState>) {
  Object.assign(ordersListState, partial)
}

const fade = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
}

export default function Orders() {
  const orders = useOrdersStore((s) => s.orders)
  const customers = useOrdersStore((s) => s.customers)
  const openNewOrder = useNewOrderStore((s) => s.open)
  const openEdit = useNewOrderStore((s) => s.openEdit)
  const setOrderStatus = useOrdersStore((s) => s.setOrderStatus)
  const addToast = useToastStore((s) => s.addToast)

  const [type, setTypeState] = useState<OrderType | 'all'>(ordersListState.type)
  const [mode, setModeState] = useState<OrderMode>(ordersListState.mode)
  const [platform, setPlatformState] = useState<Platform | 'all'>(ordersListState.platform)
  const [period, setPeriodState] = useState<Period>(ordersListState.period)
  const [search, setSearchState] = useState(ordersListState.search)
  const [sortBy, setSortByState] = useState<OrderSortKey>(ordersListState.sortBy)
  const [sortDir, setSortDirState] = useState<OrderSortDir>(ordersListState.sortDir)

  const setType = (v: OrderType | 'all') => {
    writeListState({ type: v })
    setTypeState(v)
  }
  const setMode = (v: OrderMode) => {
    writeListState({ mode: v })
    setModeState(v)
  }
  const setPlatform = (v: Platform | 'all') => {
    writeListState({ platform: v })
    setPlatformState(v)
  }
  const setPeriod = (v: Period) => {
    writeListState({ period: v })
    setPeriodState(v)
  }
  const setSearch = (v: string) => {
    writeListState({ search: v })
    setSearchState(v)
  }
  const setSort = (by: OrderSortKey, dir: OrderSortDir) => {
    writeListState({ sortBy: by, sortDir: dir })
    setSortByState(by)
    setSortDirState(dir)
  }

  const [reasonDialog, setReasonDialog] = useState<{
    order: Order
    to: OrderStatus
  } | null>(null)
  const [reason, setReason] = useState('')

  const rows = useMemo(
    () =>
      sortOrders(
        filterOrders(orders, { type, mode, query: search, platform, period }),
        sortBy,
        sortDir,
      ),
    [orders, type, mode, search, platform, period, sortBy, sortDir],
  )

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

  const columns: DataTableColumn<Order>[] = useMemo(
    () => [
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
    ],
    [],
  )

  const active = rows.filter((o) => !payoutVoid(o))
  const total = active.reduce((s, o) => s + o.amount, 0)
  const payout = active.reduce((s, o) => s + o.payout, 0)
  const hasFilter =
    type !== 'all' ||
    mode !== 'open' ||
    platform !== 'all' ||
    period !== 'all' ||
    search.trim().length > 0

  const doExport = async (fmt: 'xlsx' | 'csv') => {
    try {
      if (fmt === 'csv') {
        exportCsv(rows, rows.length === orders.length ? '订单' : '筛选订单')
      } else {
        await exportXlsx(
          { orders, customers },
          rows.length === orders.length ? undefined : rows,
          rows.length === orders.length ? '订单' : '筛选订单',
        )
      }
      addToast({
        type: 'success',
        message: `已导出 ${rows.length} 单${fmt === 'xlsx' && rows.length === orders.length ? '（含客户表）' : ''}`,
      })
    } catch {
      addToast({ type: 'error', message: '导出失败' })
    }
  }

  const resetFilters = () => {
    setType('all')
    setMode('open')
    setPlatform('all')
    setPeriod('all')
    setSearch('')
  }

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-6">
      <PageHeader
        icon={LayoutList}
        title={`订单 · 共 ${rows.length} 单，流水 ¥${total.toFixed(0)}，到手 ¥${payout.toFixed(0)}`}
        actions={
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <Dropdown
              align="end"
              trigger={
                <span className="inline-flex">
                  <Button variant="secondary" size="sm" icon={Download}>
                    导出
                  </Button>
                </span>
              }
              items={[
                { key: 'xlsx', label: '导出 Excel' },
                { key: 'csv', label: '导出 CSV' },
              ]}
              onSelect={(key) => void doExport(key as 'xlsx' | 'csv')}
            />
            <Button variant="primary" onClick={openNewOrder}>
              <PlusCircle size={16} /> 新建订单
            </Button>
          </div>
        }
      />

      <motion.div
        {...fade}
        transition={{ duration: 0.22 }}
        className="mb-3 flex flex-col gap-2 rounded-xl border border-border/50 bg-card p-3 shadow-sm"
      >
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[10rem] flex-1 max-w-xs">
            <Search
              size={14}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              className="form-input w-full !pl-8 text-sm"
              placeholder="搜索单号 / 客户 / 项目…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search.trim() ? (
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="清除搜索"
                onClick={() => setSearch('')}
              >
                <X size={14} />
              </button>
            ) : null}
          </div>
          <FormSelect
            className="w-28"
            value={mode}
            onChange={(v) => setMode((v as OrderMode) ?? 'open')}
            options={MODES.map((m) => ({ value: m.id, label: m.label }))}
          />
          <FormSelect
            className="w-28"
            value={type}
            onChange={(v) => setType((v as OrderType | 'all') ?? 'all')}
            options={TYPES.map((t) => ({ value: t.id, label: t.label }))}
          />
          <FormSelect
            className="w-28"
            value={platform}
            onChange={(v) => setPlatform((v as Platform | 'all') ?? 'all')}
            options={[
              { value: 'all', label: '全部渠道' },
              { value: '微信', label: '微信' },
              { value: '闲鱼', label: '闲鱼' },
            ]}
          />
          <FormSelect
            className="w-32"
            value={period}
            onChange={(v) => setPeriod((v as Period) ?? 'all')}
            options={PERIODS.map((p) => ({ value: p.id, label: p.label }))}
          />
          <FormSelect
            className="w-36"
            value={`${sortBy}:${sortDir}`}
            onChange={(v) => {
              const raw = v ?? 'createdAt:desc'
              const [by, dir] = raw.split(':') as [OrderSortKey, OrderSortDir]
              setSort(by, dir)
            }}
            options={SORT_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          />
          {hasFilter ? (
            <Button size="sm" variant="ghost" onClick={resetFilters}>
              重置
            </Button>
          ) : null}
        </div>
        {search.trim() ? (
          <p className="text-xs text-muted-foreground px-0.5">
            正在搜索：{search.trim()} · 显示 {rows.length} / {orders.length} 单
          </p>
        ) : null}
      </motion.div>

      <motion.div
        {...fade}
        transition={{ duration: 0.25, delay: 0.04 }}
        className="bg-card border border-border/50 rounded-xl overflow-hidden"
      >
        <DataTable
          columns={columns}
          data={rows}
          rowKey={(r) => r.id}
          onRowClick={(r) => openEdit(r.id)}
          empty={
            <div className="py-16 text-center text-muted-foreground">
              <LayoutList size={36} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">
                {orders.length === 0
                  ? '还没有订单'
                  : search.trim()
                    ? `没有符合「${search.trim()}」的订单`
                    : '没有符合条件的订单'}
              </p>
              <p className="text-xs mt-1">
                {orders.length === 0
                  ? '点右上角「新建订单」记第一单'
                  : hasFilter
                    ? '试试清空筛选'
                    : ''}
              </p>
              {hasFilter && orders.length > 0 ? (
                <Button size="sm" variant="secondary" className="mt-3" onClick={resetFilters}>
                  清空筛选
                </Button>
              ) : null}
            </div>
          }
        />
      </motion.div>

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
              variant={
                reasonDialog?.to === '已退款' || reasonDialog?.to === '已取消' ? 'danger' : 'primary'
              }
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
