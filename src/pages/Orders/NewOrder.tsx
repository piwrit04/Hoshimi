import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2, UserRound } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Drawer } from '@/components/ui/overlay'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
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
import { toastUndo, useToastStore } from '@/store/useToastStore'
import { useNewOrderStore } from '@/store/useNewOrderStore'
import { captureOrderSlice, useOrdersStore, type Order } from '@/store/useOrdersStore'
import {
  calcMoney,
  feePercentLabel,
  PLATFORM_FEE,
  type Platform,
  type TransferMode,
} from '@/domain/money'
import {
  categoriesForOrderType,
  productsForOrderType,
  productsOfCategory,
  primaryGameId,
  serversOf,
  sortedGames,
} from '@/domain/catalog'
import type { SettleKind } from '@/domain/order'
import { isTerminal, payoutVoid, NO_PAYOUT } from '@/domain/status'
import { modalConfirm } from '@/components/ui/ModalConfirm'
import { suggestCustomers } from '@/domain/customers'
import type { Customer } from '@/storage/types'

type Line = { key: number; category: string; product: string; price: string }
type StatusCreate = '待处理' | '进行中' | '已完成'

const statusTone = {
  待处理: 'warning',
  进行中: 'brand',
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
  const navigate = useNavigate()
  const moneyLocked = Boolean(
    editing && (editing.amountLocked || isTerminal(editing.status) || editing.status === '已完成'),
  )

  const [nickname, setNickname] = useState('')
  const [contact, setContact] = useState('')
  const [suggestOpen, setSuggestOpen] = useState(false)
  const [suggestQuery, setSuggestQuery] = useState('')
  const [suggestField, setSuggestField] = useState<'nickname' | 'contact' | null>(null)
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [quickCat, setQuickCat] = useState('')
  const [quickName, setQuickName] = useState('')
  const [quickPrice, setQuickPrice] = useState<number | null>(null)
  const [quickLineKey, setQuickLineKey] = useState<number | null>(null)
  const [quickErr, setQuickErr] = useState('')
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
  const [moneyPulse, setMoneyPulse] = useState(0)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const catalogCategories = useOrdersStore((s) => s.categories)
  const catalogProducts = useOrdersStore((s) => s.products)
  const catalogGames = useOrdersStore((s) => s.games)
  const catalogServers = useOrdersStore((s) => s.servers)
  const channelFees = useOrdersStore((s) => s.channelFees)
  const customers = useOrdersStore((s) => s.customers)
  const addProduct = useOrdersStore((s) => s.addProduct)
  const addCategory = useOrdersStore((s) => s.addCategory)
  const deleteOrder = useOrdersStore((s) => s.deleteOrder)
  const restoreOrder = useOrdersStore((s) => s.restoreOrder)
  const gamesSorted = useMemo(() => sortedGames(catalogGames), [catalogGames])
  const [gameId, setGameId] = useState(() => primaryGameId(catalogGames))
  const safeGameId = gamesSorted.some((g) => g.id === gameId) ? gameId : primaryGameId(catalogGames)

  const customerHits = useMemo(
    () => (suggestField ? suggestCustomers(customers, suggestQuery) : []),
    [customers, suggestQuery, suggestField],
  )

  const pickCustomer = (c: Customer) => {
    setNickname(c.nickname)
    setContact(c.contact)
    setSuggestOpen(false)
    setSuggestField(null)
    setSuggestQuery('')
    setErrors((e) => {
      const next = { ...e }
      delete next.nickname
      delete next.contact
      return next
    })
  }

  const openSuggest = (field: 'nickname' | 'contact', value: string) => {
    setSuggestField(field)
    setSuggestQuery(value)
    setSuggestOpen(value.trim().length > 0)
  }

  useEffect(() => {
    if (!open) return
    if (editing) {
      setNickname(editing.nickname)
      setContact(editing.contact)
      setOrderType(editing.type)
      setPlatform(editing.platform)
      if (editing.gameId) setGameId(editing.gameId)
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
      const draft = useNewOrderStore.getState().takeDraft()
      if (draft) {
        if (draft.nickname) setNickname(draft.nickname)
        if (draft.contact) setContact(draft.contact)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resetForm 故意不进依赖
  }, [open, editing])

  const categories = useMemo(
    () => categoriesForOrderType(catalogCategories, safeGameId, orderType),
    [catalogCategories, safeGameId, orderType],
  )
  const serverOptions = useMemo(
    () => serversOf(catalogServers, safeGameId).map((s) => s.name),
    [catalogServers, safeGameId],
  )
  const custodyOptions = useMemo(
    () =>
      productsForOrderType(catalogCategories, catalogProducts, safeGameId, '托管').map(
        (p) => p.name,
      ),
    [catalogCategories, catalogProducts, safeGameId],
  )

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

  const feeRate = (() => {
    const hit = channelFees.find((f) => f.platform === platform)
    return hit ? hit.rate : (PLATFORM_FEE[platform] ?? 0)
  })()
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

  useEffect(() => {
    if (!open) return
    setMoneyPulse((n) => n + 1)
  }, [amount, money.payoutAmount, money.feeAmount, money.transferOut, open])


  const resetForm = () => {
    setNickname('')
    setContact('')
    setOrderType('普通')
    setPlatform('微信')
    setGameId(primaryGameId(catalogGames))
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
    gameId: safeGameId,
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
      if (!server) e.server = '必选'
      if (orderType === '普通') {
        if (lines.some((l) => !l.category || !l.product)) e.lines = '每行都要选分类和项目'
        if (lines.length === 0) e.lines = '至少一行项目'
      } else {
        if (!custodyKind.trim()) e.custodyKind = '必选'
        if (!settleKind) e.settleKind = '必选'
        if (!startDate) e.startDate = '必选'
        if (!endDate) e.endDate = '必选'
        if (startDate && endDate && endDate < startDate) e.endDate = '结束日不能早于开始日'
      }
      if (amount <= 0) e.amount = '金额要大于 0'
      if (transferEnabled) {
        if (transferMode === 'ratio') {
          if (transferPercent == null || transferPercent < 0 || transferPercent > 100) {
            e.transfer = '比例填 0–100'
          }
        } else if (transferAmount == null || transferAmount < 0) {
          e.transfer = '请填写转出金额'
        } else if (transferAmount > amount && amount > 0) {
          e.transfer = '转出不能超过订单金额'
        }
      }
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
        message: `已记下 ${saved.orderNo} · 到手 ¥${money.payoutAmount.toFixed(0)}`,
      })
      resetForm()
      onClose()
      navigate('/orders')
      return
    }
    resetForm()
    onClose()
  }

  const openQuickAdd = (lineKey?: number, preCat?: string) => {
    setQuickLineKey(lineKey ?? null)
    setQuickCat(preCat || categories[0]?.name || '')
    setQuickName('')
    setQuickPrice(null)
    setQuickErr('')
    setQuickAddOpen(true)
  }

  const confirmQuickAdd = () => {
    const name = quickName.trim()
    if (!quickCat) {
      setQuickErr('请先选分类')
      return
    }
    if (!name) {
      setQuickErr('请填写项目名称')
      return
    }
    let cat = categories.find((c) => c.name === quickCat)
    try {
      if (!cat) {
        const categoryId = addCategory(safeGameId, quickCat, 'normal')
        cat = useOrdersStore.getState().categories.find((c) => c.id === categoryId)
      }
      if (!cat) throw new Error('分类创建失败')
      addProduct(cat.id, name, quickPrice)
      if (quickLineKey != null) {
        updateLine(quickLineKey, {
          category: cat.name,
          product: name,
          price: quickPrice != null ? String(quickPrice) : '',
        })
      } else {
        setLines((ls) => {
          const empty = ls.find((l) => !l.product)
          if (empty) {
            return ls.map((l) =>
              l.key === empty.key
                ? {
                    ...l,
                    category: cat!.name,
                    product: name,
                    price: quickPrice != null ? String(quickPrice) : l.price,
                  }
                : l,
            )
          }
          return [
            ...ls,
            {
              key: Date.now(),
              category: cat!.name,
              product: name,
              price: quickPrice != null ? String(quickPrice) : '',
            },
          ]
        })
      }
      setQuickAddOpen(false)
      addToast({ type: 'success', message: `已加入目录「${name}」` })
    } catch (err) {
      setQuickErr(err instanceof Error ? err.message : '添加失败')
    }
  }

  const title = isEdit
    ? `编辑订单 ${editing?.orderNo ?? ''}`
    : '新建订单'

  return (
    <>
    <Drawer
      isOpen={open}
      onClose={() => {
        resetForm()
        onClose()
      }}
      title={title}
      width={720}
      summary={
        <div className="dd-order-money" key={moneyPulse}>
          <MoneyCell label="订单金额" value={amount} voided={Boolean(editing && payoutVoid(editing))} />
          {transferEnabled ? (
            <MoneyCell
              label="转出"
              value={money.transferOut}
              accent
              voided={Boolean(editing && payoutVoid(editing))}
            />
          ) : null}
          <MoneyCell
            label={`手续费 (${feePercentLabel(feeRate)})`}
            value={money.feeAmount}
            voided={Boolean(editing && payoutVoid(editing))}
          />
          <MoneyCell
            label={editing && payoutVoid(editing) ? '到手' : '预计到手'}
            value={money.payoutAmount}
            highlight
            breathe
            pulse
            voided={Boolean(editing && payoutVoid(editing))}
          />
        </div>
      }
      footer={
        <>
          {isEdit && editing ? (
            <Button
              variant="danger"
              className="mr-auto"
              onClick={() => {
                void modalConfirm({
                  title: '删除订单？',
                  content: '删除后可在几秒内撤销。如果只是客户不再需要，建议将状态改为「已取消」。',
                  okText: '删除',
                  tone: 'danger',
                  onOk: () => {
                    const slice = captureOrderSlice(useOrdersStore.getState().orders, editing.id)
                    const removed = deleteOrder(editing.id)
                    if (!removed) {
                      addToast({ type: 'error', message: '删除失败' })
                      throw new Error('删除失败')
                    }
                    resetForm()
                    onClose()
                    if (slice) {
                      toastUndo('订单已删除', () => restoreOrder(slice.order, slice.index))
                    } else {
                      addToast({ type: 'success', message: '订单已删除' })
                    }
                  },
                })
              }}
            >
              删除订单
            </Button>
          ) : null}
          <Button
            variant="secondary"
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
                : '保存修改'
              : '记这一单'}
          </Button>
        </>
      }
    >
      <div className="dd-order-drawer">
        {isEdit && editing ? (
          <div className="dd-order-status">
            <span className="text-muted-foreground">当前状态</span>
            <Tag tone={statusTone[editing.status]}>{editing.status}</Tag>
            {moneyLocked ? (
              <span className="ds-caption">
                {payoutVoid(editing)
                  ? '终态订单：到手作废，金额不可改，可改客户与备注'
                  : '金额已锁定，可改客户与备注'}
              </span>
            ) : null}
          </div>
        ) : null}

        <Card title="客户与渠道">
          <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
            <CustomerSuggestField
              label="昵称"
              required
              placeholder="例：小北"
              value={nickname}
              error={errors.nickname}
              active={suggestOpen && suggestField === 'nickname'}
              hits={suggestField === 'nickname' ? customerHits : []}
              onChange={(v) => {
                setNickname(v)
                openSuggest('nickname', v)
              }}
              onClear={() => {
                setNickname('')
                setSuggestOpen(false)
              }}
              onFocus={() => openSuggest('nickname', nickname)}
              onBlur={() => setTimeout(() => setSuggestOpen(false), 150)}
              onPick={pickCustomer}
            />
            <CustomerSuggestField
              label="联系方式"
              required
              placeholder="微信 / 手机 / 闲鱼号等"
              value={contact}
              error={errors.contact}
              active={suggestOpen && suggestField === 'contact'}
              hits={suggestField === 'contact' ? customerHits : []}
              onChange={(v) => {
                setContact(v)
                openSuggest('contact', v)
              }}
              onClear={() => {
                setContact('')
                setSuggestOpen(false)
              }}
              onFocus={() => openSuggest('contact', contact)}
              onBlur={() => setTimeout(() => setSuggestOpen(false), 150)}
              onPick={pickCustomer}
            />
          </div>

          {gamesSorted.length > 1 && !moneyLocked ? (
            <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
              <FormSelect
                label="游戏"
                required
                value={safeGameId}
                onChange={(v) => {
                  if (!v || v === safeGameId) return
                  setGameId(v)
                  setServer(serversOf(catalogServers, v)[0]?.name ?? '官服')
                  setLines([{ key: 1, category: '', product: '', price: '' }])
                  setCustodyKind('')
                }}
                options={gamesSorted.map((g) => ({
                  value: g.id,
                  label: g.name,
                  hint: `单号前缀 ${g.orderPrefix}`,
                }))}
              />
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
            <FormRadioGroup
              label="订单类型"
              required
              disabled={moneyLocked}
              value={orderType}
              onChange={(v) => {
                const next = v as '普通' | '托管'
                setOrderType(next)
                setLines([{ key: 1, category: '', product: '', price: '' }])
                if (next === '普通') {
                  setCustodyKind('')
                  setSettleKind('')
                  setStartDate('')
                  setEndDate('')
                  setManualAmount(null)
                } else {
                  setCustodyKind('')
                  setSettleKind('')
                  setStartDate('')
                  setEndDate('')
                  setManualAmount(null)
                }
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
              options={(channelFees.length
                ? channelFees.map((f) => f.platform)
                : (Object.keys(PLATFORM_FEE) as Platform[])
              ).map((p) => {
                const hit = channelFees.find((f) => f.platform === p)
                const rate = hit ? hit.rate : (PLATFORM_FEE[p as Platform] ?? 0)
                return { value: p, label: `${p}（${feePercentLabel(rate)}）` }
              })}
            />
          </div>

          <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
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
              <div className="ds-caption flex h-9 items-center self-end">
                状态请在列表里「开始 / 完成 / 退款」切换
              </div>
            )}
          </div>
        </Card>

        {orderType === '普通' ? (
          <Card
            title="项目明细"
            extra={
              !moneyLocked ? (
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" icon={Plus} onClick={() => openQuickAdd()}>
                    新建目录项
                  </Button>
                  <Button variant="secondary" size="sm" icon={Plus} onClick={addLine}>
                    添加一行
                  </Button>
                </div>
              ) : null
            }
          >
            {errors.lines ? <p className="dd-error-text">{errors.lines}</p> : null}
            {!moneyLocked && categories.length === 0 ? (
              <p className="ds-caption">
                当前游戏还没有普通单分类。
                <button type="button" className="ml-1 text-brand hover:underline" onClick={() => openQuickAdd()}>
                  快速新建
                </button>
              </p>
            ) : null}
            <div className="dd-order-lines">
              <div className="dd-order-lines__head">
                <span className="text-center">#</span>
                <span>分类</span>
                <span>项目</span>
                <span className="pr-1 text-right">单价</span>
                <span />
              </div>
              {lines.map((line, i) => (
                <div key={line.key} className="dd-order-line">
                  <span className="ds-caption text-center tabular-nums">{i + 1}</span>
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
                    options={(line.category ? productNamesOf(line.category) : []).map((p) => ({
                      label: p.name,
                      value: p.name,
                    }))}
                    value={line.product || null}
                    onChange={(p) => {
                      const hit = line.category
                        ? productNamesOf(line.category).find((x) => x.name === p)
                        : undefined
                      updateLine(line.key, {
                        product: p ?? '',
                        price: hit?.price != null && !line.price ? String(hit.price) : line.price,
                      })
                    }}
                  />
                  <FormNumberInput
                    unit="元"
                    min={0}
                    controls={false}
                    placeholder="单价"
                    disabled={moneyLocked}
                    value={line.price === '' ? null : parseFloat(line.price)}
                    onChange={(v) => updateLine(line.key, { price: v == null ? '' : String(v) })}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    iconOnly
                    icon={Trash2}
                    disabled={moneyLocked || i === 0}
                    onClick={() => removeLine(line.key)}
                    aria-label="移除"
                  />
                </div>
              ))}
            </div>
            <div className="dd-order-lines__total">
              <span>合计</span>
              <strong>¥{linesTotal.toFixed(2)}</strong>
            </div>
          </Card>
        ) : (
          <Card title="托管安排">
            <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
              {custodyOptions.length > 0 ? (
                <FormRadioGroup
                  label="托管类型"
                  required
                  disabled={moneyLocked}
                  value={custodyKind}
                  onChange={(v) => setCustodyKind(v ?? '')}
                  options={custodyOptions.map((p) => ({ value: p, label: p }))}
                  error={errors.custodyKind}
                />
              ) : (
                <FormInput
                  label="托管类型"
                  required
                  disabled={moneyLocked}
                  value={custodyKind}
                  onChange={(ev) => setCustodyKind(ev.target.value)}
                  placeholder="目录里还没有托管项，可先手填"
                  error={errors.custodyKind}
                  help="可在设置 → 项目目录里添加「托管」分类项目"
                />
              )}
              <FormRadioGroup
                label="结算方式"
                required
                disabled={moneyLocked}
                value={settleKind}
                onChange={(v) => onSettleChange(v as SettleKind)}
                options={['日结', '周结', '月结'].map((s) => ({ value: s, label: s }))}
                error={errors.settleKind}
              />
              <Field label="开始日" required error={errors.startDate}>
                <DatePicker
                  value={startDate}
                  disabled={moneyLocked}
                  onChange={(d) => {
                    if (!moneyLocked) onStartChange(d)
                  }}
                  error={!!errors.startDate}
                />
              </Field>
              <Field
                label="结束日"
                required
                error={errors.endDate}
                help={
                  settleKind === '周结'
                    ? '周结按 7 天自动算结束日，可再手改'
                    : settleKind === '日结'
                      ? '日结结束日同开始日'
                      : settleKind === '月结'
                        ? '月结按一个月自动算结束日，可再手改'
                        : undefined
                }
              >
                <DatePicker
                  value={endDate}
                  disabled={moneyLocked}
                  onChange={(d) => {
                    if (!moneyLocked) setEndDate(d)
                  }}
                  error={!!errors.endDate}
                />
              </Field>
            </div>
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
          </Card>
        )}

        <Card title="转单与备注">
          <FormSwitch
            label="这单转给打手做"
            checked={transferEnabled}
            disabled={moneyLocked}
            onChange={setTransferEnabled}
          />
          {transferEnabled ? (
            <div className="dd-order-transfer">
              <p className="ds-caption">默认打手拿成 80%，可按实际改</p>
              {errors.transfer ? <p className="dd-error-text">{errors.transfer}</p> : null}
              <FormRadioGroup
                label="转出方式"
                required
                disabled={moneyLocked}
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
          ) : null}
          <FormTextarea
            label="备注（选填）"
            placeholder="这单的特殊情况"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </Card>
      </div>
    </Drawer>

    <Modal
      isOpen={quickAddOpen}
      onClose={() => setQuickAddOpen(false)}
      title="快速添加到目录"
      className="max-w-md"
      footer={
        <>
          <Button variant="secondary" onClick={() => setQuickAddOpen(false)}>取消</Button>
          <Button variant="primary" onClick={confirmQuickAdd}>加入并选用</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="ds-caption">不必去设置。新项目会写入当前游戏的普通单目录，之后记单都能选到。</p>
        <FormInput
          label="分类"
          required
          placeholder="例如：日常 / 深渊"
          value={quickCat}
          onChange={(e) => setQuickCat(e.target.value)}
          list="hoshimi-quick-cats"
        />
        <datalist id="hoshimi-quick-cats">
          {categories.map((c) => (
            <option key={c.id} value={c.name} />
          ))}
        </datalist>
        <FormInput
          label="项目名称"
          required
          placeholder="例如：日常代肝"
          value={quickName}
          onChange={(e) => setQuickName(e.target.value)}
          error={quickErr && !quickName.trim() ? quickErr : undefined}
        />
        <FormNumberInput
          label="默认单价（选填）"
          unit="元"
          min={0}
          controls={false}
          value={quickPrice}
          onChange={setQuickPrice}
        />
        {quickErr ? <p className="dd-error-text">{quickErr}</p> : null}
      </div>
    </Modal>
    </>
  )
}


function CustomerSuggestField({
  label,
  required,
  placeholder,
  value,
  error,
  active,
  hits,
  onChange,
  onClear,
  onFocus,
  onBlur,
  onPick,
}: {
  label: string
  required?: boolean
  placeholder?: string
  value: string
  error?: string
  active: boolean
  hits: Customer[]
  onChange: (v: string) => void
  onClear: () => void
  onFocus: () => void
  onBlur: () => void
  onPick: (c: Customer) => void
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 })

  useEffect(() => {
    if (!active || hits.length === 0) return
    const el = wrapRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    setPos({ top: r.bottom + 4, left: r.left, width: r.width })
  }, [active, hits.length, value])

  return (
    <div className="relative" ref={wrapRef}>
      <FormInput
        label={label}
        required={required}
        placeholder={placeholder}
        value={value}
        onChange={(ev) => onChange(ev.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        error={error}
        clearable
        onClear={onClear}
        autoComplete="off"
      />
      {active &&
        hits.length > 0 &&
        createPortal(
          <div
            className="fixed z-[var(--z-popover)]"
            style={{ top: pos.top, left: pos.left, minWidth: Math.max(pos.width, 220) }}
            role="listbox"
          >
            <div className="dd-popover dd-popover--plain overflow-hidden">
              <div className="max-h-56 overflow-y-auto custom-scrollbar dd-menu">
                <div className="px-3 py-1.5 ds-caption flex items-center gap-1.5">
                  <UserRound size={12} />
                  匹配到已有客户，点选自动填入
                </div>
                {hits.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    role="option"
                    className="dd-menu__item !items-start !flex-col !gap-0.5"
                    onMouseDown={(e) => {
                      e.preventDefault()
                      onPick(c)
                    }}
                  >
                    <span className="font-medium text-foreground">{c.nickname}</span>
                    <span className="text-xs text-muted-foreground">
                      {c.contact || '无联系方式'}
                      {c.note ? ` · ${c.note}` : ''}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}

function MoneyCell({
  label,
  value,
  accent = false,
  highlight = false,
  breathe = false,
  pulse = false,
  voided = false,
}: {
  label: string
  value: number
  accent?: boolean
  highlight?: boolean
  breathe?: boolean
  pulse?: boolean
  /** 退款/取消：显示 —，不算到手 */
  voided?: boolean
}) {
  return (
    <div
      className={[
        'dd-order-money__cell',
        accent ? 'dd-order-money__cell--accent' : '',
        highlight ? 'dd-order-money__cell--highlight' : '',
        highlight && breathe ? 'dd-order-money__cell--breathe' : '',
        highlight && pulse ? 'dd-order-money__cell--pulse' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="dd-order-money__label">{label}</div>
      <div
        className={[
          'dd-order-money__value',
          voided ? 'dd-order-money__value--void' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {voided ? NO_PAYOUT : `¥${value.toFixed(2)}`}
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
