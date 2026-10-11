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
import { modalConfirm } from '@/components/ui/ModalConfirm'
import { Dropdown } from '@/components/ui/overlay'
import { FormSelect, FormTextarea } from '@/components/ui/form'
import {
  captureOrderSlice,
  useOrdersStore,
  type Order,
  type OrderStatus,
  type OrderType,
  type Platform,
} from '@/store/useOrdersStore'
import { useNewOrderStore } from '@/store/useNewOrderStore'
import { toastUndo, useToastStore } from '@/store/useToastStore'
import {
  actionLabel,
  canBulkComplete,
  nextStatuses,
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
import { yuan, yuan2 } from '@/lib/format'
import { daysUntilLabel } from '@/domain/workbench'
import { daysBetween, todayISO } from '@/domain/dates'
import { cn } from '@/lib/utils'
import { seedDemoLedger } from '@/lib/seed-demo'

/*
 * 订单列表：筛选 / 排序记住在模块级；点行编辑；开始 / 完成主按钮。
 */

const statusTone: Record<OrderStatus, 'brand' | 'warning' | 'success' | 'danger'> = {
  待处理: 'warning',
  进行中: 'brand',
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
  const completeOrder = useOrdersStore((s) => s.completeOrder)
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
  const [selectedKeys, setSelectedKeys] = useState<string[]>([])
  const restoreOrder = useOrdersStore((s) => s.restoreOrder)

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
    const slice = captureOrderSlice(useOrdersStore.getState().orders, order.id)
    const next = setOrderStatus(order.id, to)
    if (!next) {
      addToast({ type: 'error', message: `无法改为「${to}」` })
      return
    }
    const message =
      to === '已完成' ? '已完成（可撤销）' : to === '进行中' ? '已开始处理' : `已改为「${to}」`
    if (slice) {
      toastUndo(message, () => restoreOrder(slice.order, slice.index))
    } else {
      addToast({ type: 'success', message })
    }
  }

  const confirmReason = () => {
    if (!reasonDialog) return
    const { order, to } = reasonDialog
    const slice = captureOrderSlice(useOrdersStore.getState().orders, order.id)
    const next = setOrderStatus(order.id, to)
    setReasonDialog(null)
    if (!next) {
      addToast({ type: 'error', message: `无法改为「${to}」` })
      return
    }
    const tip = reason.trim() ? `（${reason.trim()}）` : ''
    const message = `${actionLabel(to)}成功${tip}`
    if (slice) {
      toastUndo(message, () => restoreOrder(slice.order, slice.index))
    } else {
      addToast({ type: 'success', message })
    }
  }

  const chosen = useMemo(
    () => rows.filter((o) => selectedKeys.includes(o.id)),
    [rows, selectedKeys],
  )
  const completeEligible = useMemo(
    () => chosen.filter((o) => canBulkComplete(o.status)),
    [chosen],
  )
  const pendingInBatch = completeEligible.filter((o) => o.status === '待处理').length

  const bulkComplete = () => {
    if (!completeEligible.length) return
    const tip =
      pendingInBatch > 0
        ? `其中 ${pendingInBatch} 张待处理会先开始再完成。`
        : ''
    void modalConfirm({
      title: '批量完成？',
      content: `将把选中的 ${completeEligible.length} 张未完成订单标为已完成。${tip}`,
      okText: '完成',
      onOk: () => {
        const slices = completeEligible
          .map((o) => captureOrderSlice(useOrdersStore.getState().orders, o.id))
          .filter((s): s is NonNullable<typeof s> => Boolean(s))
        let n = 0
        for (const order of completeEligible) {
          const cur = useOrdersStore.getState().orders.find((o) => o.id === order.id)
          if (!cur || !canBulkComplete(cur.status)) continue
          if (completeOrder(order.id)) n += 1
        }
        if (n > 0) {
          toastUndo(`已完成 ${n} 张订单`, () => {
            for (const slice of slices) restoreOrder(slice.order, slice.index)
          })
        }
        setSelectedKeys([])
      },
    })
  }

  const games = useOrdersStore((s) => s.games)

  const columns: DataTableColumn<Order>[] = useMemo(
    () => [
      {
        key: 'customer',
        title: '客户',
        emphasis: 'primary',
        render: (r) => <OrderCustomerCell order={r} games={games} />,
      },
      {
        key: 'orderNo',
        title: '单号',
        width: '148px',
        emphasis: 'secondary',
        render: (r) => (
          <OrderNoCell order={r} onOpen={() => openEdit(r.id)} />
        ),
      },
      {
        key: 'amount',
        title: '金额 · 到手',
        width: '128px',
        align: 'right',
        sortable: true,
        emphasis: 'anchor',
        render: (r) => <OrderMoneyCell order={r} />,
      },
      {
        key: 'status',
        title: '状态',
        width: '112px',
        emphasis: 'anchor',
        render: (r) => <OrderStatusCell order={r} />,
      },
      {
        key: 'actions',
        title: '操作',
        width: '152px',
        align: 'right',
        render: (r) => (
          <OrderRowActions order={r} onMove={move} onEdit={() => openEdit(r.id)} />
        ),
      },
    ],
    [games],
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
    <div className="ds-page">
      <PageHeader
        title="订单"
        description={`共 ${rows.length} 单 · 流水 ${yuan(total)} · 到手 ${yuan(payout)}（不含退款 / 取消）`}
        actions={
          <>
            <Dropdown
              align="end"
              trigger={
                <span className="inline-flex">
                  <Button variant="secondary" icon={Download}>
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
            <Button variant="primary" icon={PlusCircle} onClick={openNewOrder}>
              新建订单
            </Button>
          </>
        }
      />

      <motion.div
        {...fade}
        transition={{ duration: 0.22 }}
        className="flex flex-col gap-2"
      >
        <div className="ds-toolbar">
          <div className="relative w-64" data-page-search>
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              className="dd-control w-full !pl-9 !pr-8"
              placeholder="搜索单号 / 客户 / 项目…"
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
          <div className="w-32">
            <FormSelect
              value={mode}
              onChange={(v) => setMode((v as OrderMode) ?? 'open')}
              options={MODES.map((m) => ({ value: m.id, label: m.label }))}
            />
          </div>
          <div className="w-32">
            <FormSelect
              value={type}
              onChange={(v) => setType((v as OrderType | 'all') ?? 'all')}
              options={TYPES.map((t) => ({ value: t.id, label: t.label }))}
            />
          </div>
          <div className="w-32">
            <FormSelect
              value={platform}
              onChange={(v) => setPlatform((v as Platform | 'all') ?? 'all')}
              options={[
                { value: 'all', label: '全部渠道' },
                { value: '微信', label: '微信' },
                { value: '闲鱼', label: '闲鱼' },
              ]}
            />
          </div>
          <div className="w-32">
            <FormSelect
              value={period}
              onChange={(v) => setPeriod((v as Period) ?? 'all')}
              options={PERIODS.map((p) => ({ value: p.id, label: p.label }))}
            />
          </div>
          <div className="w-36">
            <FormSelect
              value={`${sortBy}:${sortDir}`}
              onChange={(v) => {
                const raw = v ?? 'createdAt:desc'
                const [by, dir] = raw.split(':') as [OrderSortKey, OrderSortDir]
                setSort(by, dir)
              }}
              options={SORT_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            />
          </div>
          {hasFilter ? (
            <Button variant="ghost" icon={X} onClick={resetFilters}>
              重置
            </Button>
          ) : null}
        </div>
        {search.trim() ? (
          <p className="ds-caption">
            正在搜索：{search.trim()} · 显示 {rows.length} / {orders.length} 单
          </p>
        ) : null}
      </motion.div>

      {selectedKeys.length > 0 ? (
        <div className="ds-toolbar items-center">
          <span className="ds-caption">已选 {selectedKeys.length} 单</span>
          <Button
            variant="primary"
            size="sm"
            icon={Check}
            disabled={!completeEligible.length}
            onClick={bulkComplete}
          >
            批量完成{completeEligible.length ? ` (${completeEligible.length})` : ''}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelectedKeys([])}>
            取消选择
          </Button>
          {!completeEligible.length ? (
            <span className="ds-caption text-muted-foreground">
              仅待处理 / 进行中可批量完成
            </span>
          ) : pendingInBatch > 0 ? (
            <span className="ds-caption text-muted-foreground">
              待处理会先开始再完成
            </span>
          ) : null}
        </div>
      ) : null}

      <motion.div
        {...fade}
        transition={{ duration: 0.25, delay: 0.04 }}
        className="ds-table-card"
      >
        <DataTable
          columns={columns}
          data={rows}
          rowKey={(r) => r.id}
          selectedKeys={selectedKeys}
          onSelectedKeysChange={setSelectedKeys}
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
                  ? '点右上角「新建订单」记第一单，或灌入演示数据熟悉界面'
                  : hasFilter
                    ? '试试清空筛选'
                    : ''}
              </p>
              {orders.length === 0 ? (
                <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                  <Button size="sm" variant="primary" icon={PlusCircle} onClick={openNewOrder}>
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
              ) : hasFilter ? (
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
            <Button variant="secondary" onClick={() => setReasonDialog(null)}>
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

function shortDay(iso?: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
}

function gameLabel(order: Order, games: { id: string; name: string }[]) {
  if (order.gameId) {
    const hit = games.find((g) => g.id === order.gameId)
    if (hit?.name) return hit.name
  }
  return order.items[0]?.category || '—'
}

function projectLabel(order: Order) {
  if (order.type === '托管') {
    return [order.custodyKind, order.settleKind].filter(Boolean).join(' · ') || '托管'
  }
  return order.items.map((i) => i.product).join('、') || '—'
}

/** Cheezit 口径：昵称主行 · 游戏/项目（托管加粗）· 到期小字挂客户列 */
function OrderCustomerCell({
  order,
  games,
}: {
  order: Order
  games: { id: string; name: string }[]
}) {
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

  const game = gameLabel(order, games)
  const project = projectLabel(order)
  const today = todayISO()
  const due =
    order.type === '托管' && order.endDate ? daysUntilLabel(today, order.endDate) : null
  const dueDays =
    order.type === '托管' && order.endDate ? daysBetween(today, order.endDate) : null

  return (
    <div className="dd-cell-dual">
      <div className="dd-cell-dual__top">
        <button
          type="button"
          className="dd-cell-dual__title text-left hover:text-brand transition-colors"
          onClick={(e) => {
            e.stopPropagation()
            if (id) navigate(`/customers/${id}`)
          }}
        >
          {order.nickname || '未命名'}
        </button>
      </div>
      <div className="dd-cell-dual__bot">
        {order.type === '托管' ? (
          <span className="truncate" title={project}>
            <b className="mr-1 font-semibold text-foreground">托管</b>
            {project}
          </span>
        ) : (
          <span className="truncate" title={`${game} / ${project}`}>
            {game} / {project}
          </span>
        )}
      </div>
      {due ? (
        <div
          className={cn(
            'dd-cell-dual__due',
            dueDays != null && dueDays < 0
              ? 'dd-due--hot'
              : dueDays != null && dueDays <= 2
                ? 'dd-due--warn'
                : 'dd-due--ok',
          )}
        >
          {due}
        </div>
      ) : null}
    </div>
  )
}

function OrderNoCell({ order, onOpen }: { order: Order; onOpen: () => void }) {
  return (
    <div className="dd-cell-dual">
      <div className="dd-cell-dual__top">
        <button
          type="button"
          className="dd-order-no dd-order-no--always"
          onClick={(e) => {
            e.stopPropagation()
            onOpen()
          }}
        >
          {order.orderNo}
        </button>
      </div>
      <div className="dd-cell-dual__bot tabular-nums whitespace-nowrap">
        {shortDay(order.createdAt)} · {order.platform}
      </div>
    </div>
  )
}

/** 金额主行 · 到手金（作废单不显示到手行） */
function OrderMoneyCell({ order }: { order: Order }) {
  return (
    <div className="dd-cell-dual dd-cell-dual--right">
      <div className="dd-cell-dual__top tabular-nums">{yuan2(order.amount)}</div>
      {payoutVoid(order) ? null : (
        <div className="dd-cell-dual__bot tabular-nums dd-money-gold">{yuan2(order.payout)}</div>
      )}
    </div>
  )
}

function OrderStatusCell({ order }: { order: Order }) {
  return (
    <div className="dd-cell-dual">
      <div className="dd-cell-dual__top">
        <Tag tone={statusTone[order.status]}>{order.status}</Tag>
      </div>
      {order.completedAt ? (
        <div className="dd-cell-dual__bot tabular-nums whitespace-nowrap">
          完成 {shortDay(order.completedAt)}
        </div>
      ) : null}
    </div>
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
