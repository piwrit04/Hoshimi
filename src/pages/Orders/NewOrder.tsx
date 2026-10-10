import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { DatePicker } from '@/components/ui/DatePicker'
import { Tag } from '@/components/ui/data'
import {
  FormInput,
  FormNumberInput,
  FormSelect,
  FormRadioGroup,
  FormSwitch,
  FormTextarea,
  Field,
} from '@/components/ui/form'
import { useToastStore } from '@/store/useToastStore'
import { useNewOrderStore } from '@/store/useNewOrderStore'
import { useOrdersStore, type Order } from '@/store/useOrdersStore'
import {
  calcMoney,
  feePercentLabel,
  PLATFORM_FEE,
  type Platform,
  type TransferMode,
} from '@/domain/money'
import {
  categoriesForOrderType,
  productsOfCategory,
  primaryGameId,
  serversOf,
} from '@/domain/catalog'
import type { SettleKind } from '@/domain/order'
import { isTerminal } from '@/domain/status'

type Line = { key: number; category: string; product: string; price: string }
type StatusCreate = '待处理' | '进行中' | '已完成'

const statusTone = {
  待处理: 'warning',
  进行中: 'default',
  已完成: 'success',
  已退款: 'danger',
  已取消: 'danger',
} as const

export default function NewOrderModal() {
  const { isOpen, editingId, close } = useNewOrderStore()
  const addToast = useToastStore((s) => s.addToast)
  const addOrder = useOrdersStore((s) => s.addOrder)
  const updateOrder = useOrdersStore((s) => s.updateOrder)
  const orders = useOrdersStore((s) => s.orders)
  const editing = editingId ? orders.find((o) => o.id === editingId) ?? null : null

  return (
    <Inner
      key={editingId ?? 'new'}
      open={isOpen}
      editing={editing}
      onClose={close}
      addToast={addToast}
      addOrder={addOrder}
      updateOrder={updateOrder}
    />
  )
}

function Inner({
  open,
  editing,
  onClose,
  addToast,
  addOrder,
  updateOrder,
}: {
  open: boolean
  editing: Order | null
  onClose: () => void
  addToast: (t: { type: 'success' | 'warning' | 'error' | 'info'; message: string }) => void
  addOrder: ReturnType<typeof useOrdersStore.getState>['addOrder']
  updateOrder: ReturnType<typeof useOrdersStore.getState>['updateOrder']
}) {
  const isEdit = Boolean(editing)
  const moneyLocked = Boolean(
    editing && (editing.amountLocked || isTerminal(editing.status) || editing.status === '已完成'),
  )

  const [nickname, setNickname] = useState('')
  const [contact, setContact] = useState('')
  const [orderType, setOrderType] = useState<'普通' | '托管'>('普通')
  const [platform, setPlatform] = useState<Platform>('微信')
  const [server, setServer] = useState<string | null>('官服')
  const [status, setStatus] = useState<StatusCreate>('待处理')
  const [note, setNote] = useState('')
  const [lines, setLines] = useState<Line[]>([{ key: 1, category: '', product: '', price: '' }])
  const [custodyKind, setCustodyKind] = useState('')
  const [settleKind, setSettleKind] = useState<SettleKind | ''>('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [manualAmount, setManualAmount] = useState<number | null>(null)
  const [transferEnabled, setTransferEnabled] = useState(false)
  const [transferMode, setTransferMode] = useState<TransferMode>('ratio')
  const [transferPercent, setTransferPercent] = useState<number | null>(80)
  const [transferAmount, setTransferAmount] = useState<number | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!open) return
    if (editing) {
      setNickname(editing.nickname)
      setContact(editing.contact)
      setOrderType(editing.type)
      setPlatform(editing.platform)
      setServer(editing.server)
      setStatus(
        editing.status === '进行中' || editing.status === '已完成' ? editing.status : '待处理',
      )
      setNote(editing.note)
      if (editing.type === '普通' && editing.items.length) {
        setLines(
          editing.items.map((it, i) => ({
            key: i + 1,
            category: it.category,
            product: it.product,
            price: String(it.price),
          })),
        )
      } else {
        setLines([{ key: 1, category: '', product: '', price: '' }])
      }
      setCustodyKind(editing.custodyKind ?? '')
      setSettleKind((editing.settleKind as SettleKind) ?? '')
      setStartDate(editing.startDate ?? '')
      setEndDate(editing.endDate ?? '')
      setManualAmount(editing.type === '托管' ? editing.amount : null)
      setTransferEnabled(editing.transferEnabled)
      setTransferMode(editing.transferMode ?? 'ratio')
      setTransferPercent(
        editing.transferMode === 'ratio'
          ? Math.round((editing.transferRatio ?? 0.8) * 100)
          : 80,
      )
      setTransferAmount(editing.transferMode === 'fixed' ? editing.transferAmount : null)
      setErrors({})
    } else {
      resetForm()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resetForm 故意不进依赖
  }, [open, editing])

  const catalogCategories = useOrdersStore((s) => s.categories)
  const catalogProducts = useOrdersStore((s) => s.products)
  const catalogGames = useOrdersStore((s) => s.games)
  const catalogServers = useOrdersStore((s) => s.servers)
  const gameId = useMemo(() => primaryGameId(catalogGames), [catalogGames])
  const categories = useMemo(
    () => categoriesForOrderType(catalogCategories, gameId, orderType),
    [catalogCategories, gameId, orderType],
  )
  const serverOptions = useMemo(
    () => serversOf(catalogServers, gameId).map((s) => s.name),
    [catalogServers, gameId],
  )
  const custodyOptions = useMemo(() => {
    const custodyCat = categoriesForOrderType(catalogCategories, gameId, '托管')[0]
    if (!custodyCat) return ['普托', '全托']
    const list = productsOfCategory(catalogProducts, custodyCat.id).map((p) => p.name)
    return list.length ? list : ['普托', '全托']
  }, [catalogCategories, catalogProducts, gameId])

  const productNamesOf = (categoryName: string) => {
    const cat = categories.find((c) => c.name === categoryName)
    if (!cat) return [] as { name: string; price?: number | null }[]
    return productsOfCategory(catalogProducts, cat.id)
  }

  const addLine = () =>
    setLines((ls) => [...ls, { key: Date.now(), category: '', product: '', price: '' }])
  const removeLine = (key: number) => setLines((ls) => ls.filter((l) => l.key !== key))
  const updateLine = (key: number, patch: Partial<Line>) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)))

  const linesTotal = useMemo(
    () => lines.reduce((sum, l) => sum + (parseFloat(l.price) || 0), 0),
    [lines],
  )
  const amount = orderType === '普通' ? linesTotal : (manualAmount ?? 0)

  const onSettleChange = (s: SettleKind) => {
    setSettleKind(s)
    if (startDate) setEndDate(calcEndDate(startDate, s))
  }
  const onStartChange = (d: string) => {
    setStartDate(d)
    if (d && settleKind) setEndDate(calcEndDate(d, settleKind))
  }

  const feeRate = PLATFORM_FEE[platform]
  const money = useMemo(
    () =>
      calcMoney({
        amount,
        feeRate,
        transferEnabled,
        transferMode,
        transferRatio: (transferPercent ?? 0) / 100,
        transferAmount: transferAmount ?? 0,
      }),
    [amount, feeRate, transferEnabled, transferMode, transferPercent, transferAmount],
  )

  const resetForm = () => {
    setNickname('')
    setContact('')
    setOrderType('普通')
    setPlatform('微信')
    setServer('官服')
    setStatus('待处理')
    setLines([{ key: 1, category: '', product: '', price: '' }])
    setCustodyKind('')
    setSettleKind('')
    setStartDate('')
    setEndDate('')
    setManualAmount(null)
    setNote('')
    setTransferEnabled(false)
    setTransferMode('ratio')
    setTransferPercent(80)
    setTransferAmount(null)
    setErrors({})
  }

  const buildPayload = () => ({
    nickname: nickname.trim(),
    contact: contact.trim(),
    type: orderType,
    platform,
    server: server ?? '官服',
    status: isEdit && editing ? editing.status : status,
    items:
      orderType === '普通'
        ? lines
            .filter((l) => l.product)
            .map((l) => ({
              category: l.category,
              product: l.product,
              price: parseFloat(l.price) || 0,
            }))
        : [],
    custodyKind: orderType === '托管' ? custodyKind : undefined,
    settleKind: orderType === '托管' ? settleKind || undefined : undefined,
    startDate: orderType === '托管' ? startDate || undefined : undefined,
    endDate: orderType === '托管' ? endDate || undefined : undefined,
    amount,
    feeRate,
    feeAmount: money.feeAmount,
    payout: money.payoutAmount,
    transferEnabled,
    transferMode,
    transferRatio: (transferPercent ?? 0) / 100,
    transferAmount: transferAmount ?? 0,
    note,
  })

  const handleSubmit = () => {
    const e: Record<string, string> = {}
    if (!nickname.trim()) e.nickname = '必填'
    if (!contact.trim()) e.contact = '必填'
    if (!moneyLocked) {
      if (orderType === '普通') {
        if (lines.some((l) => !l.product)) e.lines = '每行都要选项目'
      } else {
        if (!custodyKind) e.custodyKind = '必选'
        if (!settleKind) e.settleKind = '必选'
        if (!startDate) e.startDate = '必选'
        if (!endDate) e.endDate = '必选'
      }
      if (amount <= 0) e.amount = '金额要大于 0'
    }
    setErrors(e)
    if (Object.keys(e).length > 0) return

    const payload = buildPayload()
    if (isEdit && editing) {
      const saved = updateOrder(editing.id, payload)
      if (!saved) {
        addToast({ type: 'error', message: '保存失败，订单可能已删除' })
        return
      }
      addToast({
        type: 'success',
        message: moneyLocked
          ? `已更新 ${saved.orderNo}（金额已锁定）`
          : `已更新 ${saved.orderNo} · 到手 ¥${saved.payout.toFixed(0)}`,
      })
    } else {
      const saved = addOrder(payload)
      addToast({
        type: 'success',
        message: `已保存 ${saved.orderNo} · 到手 ¥${money.payoutAmount.toFixed(0)}`,
      })
    }
    resetForm()
    onClose()
  }

  const title = isEdit
    ? `编辑订单 ${editing?.orderNo ?? ''}`
    : '新建订单'

  return (
    <Modal
      isOpen={open}
      onClose={() => {
        resetForm()
        onClose()
      }}
      title={title}
      className="max-w-3xl"
      footer={
        <>
          <Button
            variant="ghost"
            onClick={() => {
              resetForm()
              onClose()
            }}
          >
            取消
          </Button>
          <Button variant="primary" onClick={handleSubmit}>
            {isEdit
              ? moneyLocked
                ? '保存备注与客户'
                : `保存 · 到手 ¥${money.payoutAmount.toFixed(0)}`
              : `记这一单 · 到手 ¥${money.payoutAmount.toFixed(0)}`}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {isEdit && editing && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">当前状态</span>
            <Tag tone={statusTone[editing.status]}>{editing.status}</Tag>
            {moneyLocked && (
              <span className="text-xs text-muted-foreground">金额已锁定，可改客户与备注</span>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormInput
            label="昵称"
            required
            placeholder="例：小北"
            value={nickname}
            onChange={(ev) => setNickname(ev.target.value)}
            error={errors.nickname}
            clearable
            onClear={() => setNickname('')}
          />
          <FormInput
            label="联系方式"
            required
            placeholder="手机号或邮箱"
            value={contact}
            onChange={(ev) => setContact(ev.target.value)}
            error={errors.contact}
            clearable
            onClear={() => setContact('')}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormRadioGroup
            label="订单类型"
            required
            disabled={moneyLocked}
            value={orderType}
            onChange={(v) => {
              setOrderType(v as '普通' | '托管')
              setLines([{ key: 1, category: '', product: '', price: '' }])
            }}
            options={[
              { value: '普通', label: '普通单' },
              { value: '托管', label: '托管单' },
            ]}
          />
          <FormRadioGroup
            label="渠道"
            required
            disabled={moneyLocked}
            value={platform}
            onChange={(v) => setPlatform(v as Platform)}
            options={(Object.keys(PLATFORM_FEE) as Platform[]).map((p) => ({
              value: p,
              label: `${p}（${feePercentLabel(PLATFORM_FEE[p])}）`,
            }))}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormRadioGroup
            label="服务器"
            required
            disabled={moneyLocked}
            value={server}
            onChange={setServer}
            options={serverOptions.map((s) => ({ value: s, label: s }))}
          />
          {!isEdit ? (
            <FormRadioGroup
              label="状态"
              required
              value={status}
              onChange={(v) => setStatus(v as StatusCreate)}
              options={[
                { value: '待处理', label: '待处理' },
                { value: '进行中', label: '进行中' },
                { value: '已完成', label: '已完成' },
              ]}
            />
          ) : (
            <div className="text-xs text-muted-foreground self-end pb-2">
              状态请在列表里「开始 / 完成 / 退款」切换
            </div>
          )}
        </div>

        {orderType === '普通' ? (
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                项目明细
              </h3>
              {!moneyLocked && (
                <Button variant="ghost" size="sm" onClick={addLine}>
                  <Plus size={14} /> 添加项目
                </Button>
              )}
            </div>
            {errors.lines && <p className="text-xs text-danger">{errors.lines}</p>}
            <div className="space-y-2">
              {lines.map((line, i) => (
                <div key={line.key} className="flex items-center gap-2 bg-secondary/40 rounded-lg p-2">
                  <span className="text-xs text-muted-foreground w-4 text-center shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <FormSelect
                      placeholder="分类"
                      disabled={moneyLocked}
                      options={categories.map((c) => ({ label: c.name, value: c.name }))}
                      value={line.category || null}
                      onChange={(c) => updateLine(line.key, { category: c ?? '', product: '' })}
                    />
                    <FormSelect
                      placeholder={line.category ? '项目' : '先选分类'}
                      disabled={moneyLocked || !line.category}
                      filterable
                      options={(line.category ? productNamesOf(line.category) : []).map(
                        (p) => ({ label: p.name, value: p.name }),
                      )}
                      value={line.product || null}
                      onChange={(p) => {
                        const hit = line.category
                          ? productNamesOf(line.category).find((x) => x.name === p)
                          : undefined
                        updateLine(line.key, {
                          product: p ?? '',
                          price:
                            hit?.price != null && !line.price
                              ? String(hit.price)
                              : line.price,
                        })
                      }}
                    />
                  </div>
                  <div className="w-24 shrink-0">
                    <FormNumberInput
                      unit="元"
                      min={0}
                      controls={false}
                      placeholder="单价"
                      disabled={moneyLocked}
                      value={line.price === '' ? null : parseFloat(line.price)}
                      onChange={(v) =>
                        updateLine(line.key, { price: v == null ? '' : String(v) })
                      }
                    />
                  </div>
                  <button
                    type="button"
                    disabled={moneyLocked || i === 0}
                    onClick={() => removeLine(line.key)}
                    className={
                      'shrink-0 p-2 rounded ' +
                      (moneyLocked || i === 0
                        ? 'text-muted-foreground/30 cursor-not-allowed'
                        : 'text-muted-foreground hover:text-danger')
                    }
                    aria-label="移除"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground text-right">
              合计 <b className="text-foreground">¥{linesTotal.toFixed(2)}</b>
            </p>
          </section>
        ) : (
          <section className="space-y-3">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              托管安排
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormRadioGroup
                label="托管类型"
                required
                disabled={moneyLocked}
                className="h-10 items-center"
                value={custodyKind}
                onChange={(v) => setCustodyKind(v ?? '')}
                options={custodyOptions.map((p) => ({ value: p, label: p }))}
                error={errors.custodyKind}
              />
              <FormRadioGroup
                label="结算方式"
                required
                disabled={moneyLocked}
                className="h-10 items-center"
                value={settleKind}
                onChange={(v) => onSettleChange(v as SettleKind)}
                options={['日结', '周结', '月结'].map((s) => ({ value: s, label: s }))}
                error={errors.settleKind}
              />
              <Field label="开始日" required error={errors.startDate}>
                <DatePicker
                  value={startDate}
                  onChange={(d) => {
                    if (!moneyLocked) onStartChange(d)
                  }}
                  error={!!errors.startDate}
                />
              </Field>
              <Field label="结束日" required error={errors.endDate}>
                <DatePicker
                  value={endDate}
                  onChange={(d) => {
                    if (!moneyLocked) setEndDate(d)
                  }}
                  error={!!errors.endDate}
                />
              </Field>
            </div>
          </section>
        )}

        {orderType === '托管' && (
          <FormNumberInput
            label="客户付的金额"
            required
            unit="元"
            thousandSeparator
            min={0}
            step={1}
            controls={false}
            disabled={moneyLocked}
            value={manualAmount}
            onChange={setManualAmount}
            error={errors.amount}
          />
        )}

        <section className="space-y-3">
          <FormSwitch
            label="这单转给打手做"
            checked={transferEnabled}
            disabled={moneyLocked}
            onChange={setTransferEnabled}
          />
          {transferEnabled && (
            <div className="pl-4 border-l-2 border-border/60 grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormRadioGroup
                label="转出方式"
                required
                disabled={moneyLocked}
                className="h-10 items-center"
                value={transferMode}
                onChange={(v) => setTransferMode(v as TransferMode)}
                options={[
                  { value: 'ratio', label: '按比例' },
                  { value: 'fixed', label: '固定金额' },
                ]}
              />
              {transferMode === 'ratio' ? (
                <FormNumberInput
                  label="打手拿成"
                  required
                  unit="%"
                  step={5}
                  min={0}
                  max={100}
                  controls={false}
                  disabled={moneyLocked}
                  value={transferPercent}
                  onChange={setTransferPercent}
                />
              ) : (
                <FormNumberInput
                  label="转出金额"
                  required
                  unit="元"
                  min={0}
                  step={1}
                  controls={false}
                  disabled={moneyLocked}
                  value={transferAmount}
                  onChange={setTransferAmount}
                />
              )}
            </div>
          )}
        </section>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <MoneyCell label="订单金额" value={amount} />
          {transferEnabled && <MoneyCell label="转出" value={money.transferOut} accent />}
          <MoneyCell label={`手续费 (${feePercentLabel(feeRate)})`} value={money.feeAmount} />
          <MoneyCell
            label={
              editing && (editing.status === '已退款' || editing.status === '已取消')
                ? '到手（已作废）'
                : '预计到手'
            }
            value={
              editing && (editing.status === '已退款' || editing.status === '已取消')
                ? 0
                : money.payoutAmount
            }
            highlight
          />
        </div>

        <FormTextarea
          label="备注（选填）"
          placeholder="这单的特殊情况"
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
    </Modal>
  )
}

function MoneyCell({
  label,
  value,
  accent = false,
  highlight = false,
}: {
  label: string
  value: number
  accent?: boolean
  highlight?: boolean
}) {
  return (
    <div
      className={
        'rounded-lg p-2.5 text-center ' +
        (highlight
          ? 'bg-brand/10 ring-1 ring-brand/30'
          : accent
            ? 'bg-primary/5'
            : 'bg-secondary/40')
      }
    >
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div
        className={`text-base font-bold tabular-nums ${highlight ? 'text-brand' : 'text-foreground'}`}
      >
        ¥{value.toFixed(2)}
      </div>
    </div>
  )
}

function calcEndDate(startISO: string, settle: SettleKind): string {
  const d = new Date(startISO + 'T00:00:00')
  if (settle === '日结') return startISO
  if (settle === '周结') d.setDate(d.getDate() + 7)
  if (settle === '月结') d.setMonth(d.getMonth() + 1)
  return d.toISOString().slice(0, 10)
}
