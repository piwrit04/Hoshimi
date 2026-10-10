import { useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { DatePicker } from '@/components/ui/DatePicker'
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
import { useOrdersStore } from '@/store/useOrdersStore'
import {
  calcMoney,
  feePercentLabel,
  PLATFORM_FEE,
  type Platform,
  type TransferMode,
} from '@/domain/money'
import {
  SERVERS,
  categoriesForOrderType,
  productsOfCategory,
} from '@/domain/catalog'

type Line = { key: number; category: string; product: string; price: string }
type Status = '待处理' | '进行中' | '已完成'
type SettleKind = '日结' | '周结' | '月结'

export default function NewOrderModal() {
  const { isOpen, close } = useNewOrderStore()
  const addToast = useToastStore((s) => s.addToast)
  const addOrder = useOrdersStore((s) => s.addOrder)
  return <Inner open={isOpen} onClose={close} addToast={addToast} addOrder={addOrder} />
}

function Inner({
  open, onClose, addToast, addOrder,
}: {
  open: boolean; onClose: () => void
  addToast: (t: { type: 'success' | 'warning' | 'error' | 'info'; message: string }) => void
  addOrder: (o: Parameters<ReturnType<typeof useOrdersStore.getState>['addOrder']>[0]) => ReturnType<ReturnType<typeof useOrdersStore.getState>['addOrder']>
}) {
  /* 客户 */
  const [nickname, setNickname] = useState('')
  const [contact, setContact] = useState('')

  /* 订单 */
  const [orderType, setOrderType] = useState<'普通' | '托管'>('普通')
  const [platform, setPlatform] = useState<Platform>('微信')
  const [server, setServer] = useState<string | null>('官服')
  const [status, setStatus] = useState<Status>('待处理')
  const [note, setNote] = useState('')

  /* 普通单明细：默认一行，不可删 */
  const [lines, setLines] = useState<Line[]>([
    { key: 1, category: '', product: '', price: '' },
  ])

  /* 托管 */
  const [custodyKind, setCustodyKind] = useState<string>('')
  const [settleKind, setSettleKind] = useState<SettleKind | ''>('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  /* 钱 */
  const [manualAmount, setManualAmount] = useState<number | null>(null)
  const [transferEnabled, setTransferEnabled] = useState(false)
  const [transferMode, setTransferMode] = useState<TransferMode>('ratio')
  const [transferPercent, setTransferPercent] = useState<number | null>(80)
  const [transferAmount, setTransferAmount] = useState<number | null>(null)

  const categories = useMemo(() => categoriesForOrderType(orderType), [orderType])

  const addLine = () =>
    setLines((ls) => [...ls, { key: Date.now(), category: '', product: '', price: '' }])
  const removeLine = (key: number) => setLines((ls) => ls.filter((l) => l.key !== key))
  const updateLine = (key: number, patch: Partial<Line>) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)))

  const linesTotal = useMemo(
    () => lines.reduce((sum, l) => sum + (parseFloat(l.price) || 0), 0),
    [lines]
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
    () => calcMoney({
      amount, feeRate, transferEnabled, transferMode,
      transferRatio: (transferPercent ?? 0) / 100,
      transferAmount: transferAmount ?? 0,
    }),
    [amount, feeRate, transferEnabled, transferMode, transferPercent, transferAmount]
  )

  const [errors, setErrors] = useState<Record<string, string>>({})
  const resetForm = () => {
    setNickname(''); setContact('')
    setOrderType('普通'); setPlatform('微信'); setServer('官服'); setStatus('待处理')
    setLines([{ key: 1, category: '', product: '', price: '' }])
    setCustodyKind(''); setSettleKind(''); setStartDate(''); setEndDate('')
    setManualAmount(null); setNote(''); setTransferEnabled(false); setErrors({})
  }

  const handleSubmit = () => {
    const e: Record<string, string> = {}
    if (!nickname.trim()) e.nickname = '必填'
    if (!contact.trim()) e.contact = '必填'
    if (orderType === '普通') {
      if (lines.some((l) => !l.product)) e.lines = '每行都要选项目'
    } else {
      if (!custodyKind) e.custodyKind = '必选'
      if (!settleKind) e.settleKind = '必选'
      if (!startDate) e.startDate = '必选'
      if (!endDate) e.endDate = '必选'
    }
    if (amount <= 0) e.amount = '金额要大于 0'
    setErrors(e)
    if (Object.keys(e).length > 0) return

    const saved = addOrder({
      nickname: nickname.trim(),
      contact: contact.trim(),
      type: orderType,
      platform,
      server: server ?? '官服',
      status,
      items: orderType === '普通'
        ? lines.filter((l) => l.product).map((l) => ({ category: l.category, product: l.product, price: parseFloat(l.price) || 0 }))
        : [],
      custodyKind: orderType === '托管' ? custodyKind : undefined,
      settleKind: orderType === '托管' ? settleKind || undefined : undefined,
      startDate: orderType === '托管' ? startDate || undefined : undefined,
      endDate: orderType === '托管' ? endDate || undefined : undefined,
      amount,
      feeRate,
      payout: money.payoutAmount,
      transferEnabled,
      note,
    })
    addToast({ type: 'success', message: `已保存 ${saved.orderNo} · 到手 ¥${money.payoutAmount.toFixed(0)}` })
    resetForm(); onClose()
  }

  return (
    <Modal
      isOpen={open}
      onClose={() => { resetForm(); onClose() }}
      title="新建订单"
      className="max-w-3xl"
      footer={
        <>
          <Button variant="ghost" onClick={() => { resetForm(); onClose() }}>取消</Button>
          <Button variant="primary" onClick={handleSubmit}>
            记这一单 · 到手 ¥{money.payoutAmount.toFixed(0)}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {/* 客户 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormInput
            label="昵称" required
            placeholder="例：小北"
            value={nickname}
            onChange={(ev) => setNickname(ev.target.value)}
            error={errors.nickname} clearable onClear={() => setNickname('')}
          />
          <FormInput
            label="联系方式" required
            placeholder="手机号或邮箱"
            value={contact}
            onChange={(ev) => setContact(ev.target.value)}
            error={errors.contact} clearable onClear={() => setContact('')}
          />
        </div>

        {/* 类型 + 渠道 同一排 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormRadioGroup
            label="订单类型" required
            value={orderType}
            onChange={(v) => { setOrderType(v as '普通' | '托管'); setLines([{ key: 1, category: '', product: '', price: '' }]) }}
            options={[
              { value: '普通', label: '普通单' },
              { value: '托管', label: '托管单' },
            ]}
          />
          <FormRadioGroup
            label="渠道" required
            value={platform}
            onChange={(v) => setPlatform(v as Platform)}
            options={(Object.keys(PLATFORM_FEE) as Platform[]).map((p) => ({
              value: p, label: `${p}（${feePercentLabel(PLATFORM_FEE[p])}）`,
            }))}
          />
        </div>

        {/* 服务器 + 状态 同一排 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormRadioGroup
            label="服务器" required
            value={server}
            onChange={setServer}
            options={SERVERS.map((s) => ({ value: s, label: s }))}
          />
          <FormRadioGroup
            label="状态" required
            value={status}
            onChange={(v) => setStatus(v as Status)}
            options={[
              { value: '待处理', label: '待处理' },
              { value: '进行中', label: '进行中' },
              { value: '已完成', label: '已完成' },
            ]}
          />
        </div>

        {/* 普通单：项目明细 */}
        {orderType === '普通' ? (
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">项目明细</h3>
              <Button variant="ghost" size="sm" onClick={addLine}>
                <Plus size={14} /> 添加项目
              </Button>
            </div>
            {errors.lines && <p className="text-xs text-danger">{errors.lines}</p>}
            <div className="space-y-2">
              {lines.map((line, i) => (
                <div key={line.key} className="flex items-center gap-2 bg-secondary/40 rounded-lg p-2">
                  <span className="text-xs text-muted-foreground w-4 text-center shrink-0">{i + 1}</span>
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <FormSelect
                      placeholder="分类"
                      options={categories.map((c) => ({ label: c.name, value: c.name }))}
                      value={line.category || null}
                      onChange={(c) => updateLine(line.key, { category: c, product: '' })}
                    />
                    <FormSelect
                      placeholder={line.category ? '项目' : '先选分类'}
                      disabled={!line.category} filterable
                      options={(line.category ? productsOfCategory(line.category) : []).map((p) => ({ label: p, value: p }))}
                      value={line.product || null}
                      onChange={(p) => updateLine(line.key, { product: p })}
                    />
                  </div>
                  <div className="w-24 shrink-0">
                    <FormNumberInput
                      unit="元" min={0} controls={false} placeholder="单价"
                      value={line.price === '' ? null : parseFloat(line.price)}
                      onChange={(v) => updateLine(line.key, { price: v == null ? '' : String(v) })}
                    />
                  </div>
                  <button
                    type="button"
                    disabled={i === 0}
                    onClick={() => removeLine(line.key)}
                    className={
                      'shrink-0 p-2 rounded ' +
                      (i === 0
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
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">托管安排</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormRadioGroup
                label="托管类型" required
                className="h-10 items-center"
                value={custodyKind}
                onChange={setCustodyKind}
                options={['普托', '全托'].map((p) => ({ value: p, label: p }))}
                error={errors.custodyKind}
              />
              <FormRadioGroup
                label="结算方式" required
                className="h-10 items-center"
                value={settleKind}
                onChange={(v) => onSettleChange(v as SettleKind)}
                options={['日结', '周结', '月结'].map((s) => ({ value: s, label: s }))}
                error={errors.settleKind}
              />
              <Field label="开始日" required error={errors.startDate}>
                <DatePicker value={startDate} onChange={onStartChange} error={!!errors.startDate} />
              </Field>
              <Field label="结束日" required error={errors.endDate}>
                <DatePicker value={endDate} onChange={setEndDate} error={!!errors.endDate} />
              </Field>
            </div>
          </section>
        )}

        {/* 金额（托管手填） */}
        {orderType === '托管' && (
          <FormNumberInput
            label="客户付的金额" required
            unit="元" thousandSeparator min={0} step={1} controls={false}
            value={manualAmount} onChange={setManualAmount} error={errors.amount}
          />
        )}

        {/* 转单：放到金额计算上方 */}
        <section className="space-y-3">
          <FormSwitch
            label="这单转给打手做"
            checked={transferEnabled} onChange={setTransferEnabled}
          />
          {transferEnabled && (
            <div className="pl-4 border-l-2 border-border/60 grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormRadioGroup
                label="转出方式" required
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
                  label="打手拿成" required
                  unit="%" step={5} min={0} max={100} controls={false}
                  value={transferPercent} onChange={setTransferPercent}
                />
              ) : (
                <FormNumberInput
                  label="转出金额" required
                  unit="元" min={0} step={1} controls={false}
                  value={transferAmount} onChange={setTransferAmount}
                />
              )}
            </div>
          )}
        </section>

        {/* MoneyBox */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <MoneyCell label="订单金额" value={amount} />
          {transferEnabled && <MoneyCell label="转出" value={money.transferOut} accent />}
          <MoneyCell label={`手续费 (${feePercentLabel(feeRate)})`} value={money.feeAmount} />
          <MoneyCell label="预计到手" value={money.payoutAmount} highlight />
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

function MoneyCell({ label, value, accent = false, highlight = false }: {
  label: string; value: number; accent?: boolean; highlight?: boolean
}) {
  return (
    <div className={
      'rounded-lg p-2.5 text-center ' +
      (highlight ? 'bg-brand/10 ring-1 ring-brand/30' : accent ? 'bg-primary/5' : 'bg-secondary/40')
    }>
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className={`text-base font-bold tabular-nums ${highlight ? 'text-brand' : 'text-foreground'}`}>
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
