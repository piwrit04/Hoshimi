import { Link, useSearchParams } from 'react-router-dom'
import { useEffect, useMemo, useState, type KeyboardEvent, type ReactNode } from 'react'
import {
  ArrowRight,
  CheckCircle2,
  PlusCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { yuan as money, yuan2 } from '@/lib/format'
import { CountUp } from '@/lib/count-up'
import { useOrdersStore } from '@/store/useOrdersStore'
import { useNewOrderStore } from '@/store/useNewOrderStore'
import { useToastStore } from '@/store/useToastStore'
import { dashboard } from '@/domain/dashboard'
import { workbench, daysUntilLabel } from '@/domain/workbench'
import { Button } from '@/components/ui/Button'
import { Tag } from '@/components/ui/data'
import type { Order, OrderStatus } from '@/domain/order'

/*
 * 工作台（对标）：
 * - Shopify Home：一个到手主数字，其余指标降权成次级条，不抢视觉
 * - Linear Inbox：密列表、发丝分割线、整行悬停、安静 chrome
 * - 闲鱼卖家：状态用小胶囊标签，不铺满彩色徽章
 * 首页不翻页：只露最紧的几条，多了「查看全部」去订单页。
 */

type FocusTab = 'all' | 'chase' | 'due'

const FOCUS_TABS: FocusTab[] = ['all', 'chase', 'due']

/** 首页一屏能看完，不放分页 */
const HOME_LIST_LIMIT = 8

function parseFocus(raw: string | null): FocusTab {
  if (raw === 'chase' || raw === 'due' || raw === 'all') return raw
  return 'all'
}

const statusTone: Record<OrderStatus, 'brand' | 'warning' | 'success' | 'danger'> = {
  待处理: 'warning',
  进行中: 'brand',
  已完成: 'success',
  已退款: 'danger',
  已取消: 'danger',
}

function orderTitle(o: Order) {
  if (o.type === '托管') return `${o.custodyKind ?? '托管'} · ${o.settleKind ?? ''}`.trim()
  return o.items.map((i) => i.product).join('、') || '—'
}

type RailMetric = {
  label: string
  value: number
  money?: boolean
  warn?: boolean
  to: string
}

export default function Dashboard() {
  const orders = useOrdersStore((s) => s.orders)
  const customers = useOrdersStore((s) => s.customers)
  const settings = useOrdersStore((s) => s.settings)
  const completeOrder = useOrdersStore((s) => s.completeOrder)
  const openNewOrder = useNewOrderStore((s) => s.open)
  const openEdit = useNewOrderStore((s) => s.openEdit)
  const addToast = useToastStore((s) => s.addToast)
  const [searchParams, setSearchParams] = useSearchParams()

  const [clock, setClock] = useState(() => formatClock())
  const focusTab = parseFocus(searchParams.get('focus'))

  const setFocusTab = (tab: FocusTab) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (tab === 'all') next.delete('focus')
        else next.set('focus', tab)
        return next
      },
      { replace: true },
    )
  }

  const onFocusTabKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return
    e.preventDefault()
    const i = FOCUS_TABS.indexOf(focusTab)
    let next = i
    if (e.key === 'ArrowLeft') next = (i - 1 + FOCUS_TABS.length) % FOCUS_TABS.length
    else if (e.key === 'ArrowRight') next = (i + 1) % FOCUS_TABS.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = FOCUS_TABS.length - 1
    const nextTab = FOCUS_TABS[next]
    setFocusTab(nextTab)
    const tabs = e.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]')
    tabs[next]?.focus()
  }

  const m = useMemo(() => dashboard({ orders, customers, settings }), [orders, customers, settings])
  const wb = useMemo(() => workbench(orders, settings, ''), [orders, settings])
  const k = m.kpis

  useEffect(() => {
    const id = window.setInterval(() => setClock(formatClock()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const focusList = useMemo(() => {
    if (focusTab === 'chase') return wb.openNormal.map((o) => ({ kind: 'chase' as const, order: o }))
    if (focusTab === 'due') return wb.expiring.map((o) => ({ kind: 'due' as const, order: o }))
    const chase = wb.openNormal.map((o) => ({ kind: 'chase' as const, order: o }))
    const due = wb.expiring.map((o) => ({ kind: 'due' as const, order: o }))
    return [...due, ...chase]
  }, [focusTab, wb.openNormal, wb.expiring])

  const visibleList = focusList.slice(0, HOME_LIST_LIMIT)
  const hiddenCount = Math.max(0, focusList.length - visibleList.length)

  const rail: RailMetric[] = [
    {
      label: '今日到手',
      value: k.payoutToday,
      money: true,
      to: '/orders?mode=已完成&period=today&anchor=completed',
    },
    {
      label: '进行中',
      value: k.inProgress,
      to: '/orders?mode=进行中',
    },
    {
      label: '待催',
      value: wb.chaseCount,
      to: '/dashboard?focus=chase',
    },
    {
      label: '快到期',
      value: k.expiringCount,
      warn: k.expiringCount > 0,
      to: '/dashboard?focus=due',
    },
  ]

  const onComplete = (id: string) => {
    try {
      completeOrder(id)
      addToast({ type: 'success', message: '已标完成' })
    } catch {
      addToast({ type: 'error', message: '这单暂时不能标完成' })
    }
  }

  const viewAllTo =
    focusTab === 'chase'
      ? '/orders?mode=进行中'
      : focusTab === 'due'
        ? '/todo'
        : '/orders'

  return (
    <div className="ds-page--console l2g-dash l2g-workbench">
      <div className="l2g-orders-head ds-rise">
        <div className="l2g-orders-head__title-group">
          <h1 className="l2g-orders-head__title title text-balance">{m.hello}</h1>
          <p className="l2g-orders-head__sub subtitle">
            {m.todayLabel}
            {m.usingTest ? ' · 当前为示例数据' : ''}
            {' · '}
            {clock.time}
            {' · '}
            {clock.message}
          </p>
        </div>
        <div className="l2g-orders-head__actions">
          <Button variant="primary" icon={PlusCircle} onClick={openNewOrder}>
            新建订单
          </Button>
        </div>
      </div>

      {/* Shopify：主数字 + 次级指标条（不是等权小卡网格） */}
      <section className="l2g-workbench__hero ds-rise" aria-label="本月概览">
        <div className="l2g-workbench__hero-main">
          <p className="l2g-workbench__hero-label">本月到手</p>
          <p className="l2g-workbench__hero-value dd-money-gold tabular-nums">
            <CountUp value={k.payoutThisMonth} money />
          </p>
          <p className="l2g-workbench__hero-meta text-muted-foreground">
            累计 {money(k.payoutTotal)} · 已完成 {k.completedTotal} · 本月新单 {k.newThisMonth}
          </p>
        </div>
        <div className="l2g-workbench__rail" role="list">
          {rail.map((slot, i) => (
            <Link
              key={slot.label}
              to={slot.to}
              role="listitem"
              className={cn(
                'l2g-workbench__rail-item',
                slot.warn && 'l2g-workbench__rail-item--warn',
                i > 0 && 'l2g-workbench__rail-item--div',
              )}
            >
              <span className="l2g-workbench__rail-label">{slot.label}</span>
              <span
                className={cn(
                  'l2g-workbench__rail-value',
                  slot.money && 'dd-money-gold',
                  slot.warn && 'text-warning',
                )}
              >
                <CountUp value={slot.value} money={slot.money} />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Linear：密列表作主区；闲鱼：状态小胶囊 */}
      <section className="l2g-workbench__focus ds-rise" aria-label="待办订单">
        <div className="l2g-workbench__focus-head">
          <div className="min-w-0">
            <h2 className="l2g-workbench__focus-title">待办订单</h2>
            <p className="l2g-workbench__focus-meta">
              共 {wb.followCount} 条 · 催单 {wb.chaseCount} · 到期 {wb.dueCount}
            </p>
          </div>
          <div className="flex items-center gap-1 flex-wrap" role="tablist" aria-label="待办筛选" onKeyDown={onFocusTabKeyDown}>
            {(
              [
                { id: 'all' as const, label: '全部' },
                { id: 'chase' as const, label: `催单 ${wb.chaseCount}` },
                { id: 'due' as const, label: `到期 ${wb.dueCount}` },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={focusTab === t.id}
                tabIndex={focusTab === t.id ? 0 : -1}
                className={cn(
                  'l2g-capsule',
                  focusTab === t.id ? 'l2g-capsule--on' : 'l2g-capsule--ghost',
                )}
                onClick={() => setFocusTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {focusList.length === 0 ? (
          <Empty>
            <p className="mb-2">今天没有要盯的单</p>
            <Button variant="secondary" size="sm" icon={PlusCircle} onClick={openNewOrder}>
              录一单
            </Button>
          </Empty>
        ) : (
          <ul className="l2g-workbench__list">
            {visibleList.map(({ kind, order: o }) => (
              <li key={`${kind}-${o.id}`} className="l2g-workbench__row">
                <button
                  type="button"
                  className="l2g-workbench__row-main"
                  onClick={() => openEdit(o.id)}
                >
                  <span
                    className={cn(
                      'l2g-workbench__row-dot',
                      kind === 'due' ? 'l2g-workbench__row-dot--due' : 'l2g-workbench__row-dot--chase',
                    )}
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="l2g-workbench__row-title truncate">
                        {o.nickname || '未命名'}
                      </span>
                      <Tag tone={statusTone[o.status]} className="l2g-workbench__tag">
                        {o.status}
                      </Tag>
                      {kind === 'due' ? (
                        <span className="l2g-workbench__row-kind l2g-workbench__row-kind--due">
                          {daysUntilLabel(wb.today, o.endDate)}
                        </span>
                      ) : (
                        <span className="l2g-workbench__row-kind">催单</span>
                      )}
                    </div>
                    <div className="l2g-workbench__row-sub truncate">
                      {orderTitle(o)}
                      {o.contact ? ` · ${o.contact}` : ''}
                    </div>
                  </div>
                  <span className="l2g-workbench__row-amount dd-money-gold">
                    {yuan2(o.amount)}
                  </span>
                </button>
                <div className="l2g-workbench__row-actions">
                  {(o.status === '待处理' || o.status === '进行中') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={CheckCircle2}
                      onClick={() => onComplete(o.id)}
                      title="标完成"
                      aria-label="标完成"
                    >
                      完成
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="l2g-workbench__focus-foot">
          {hiddenCount > 0 ? (
            <Link to={viewAllTo} className="l2g-workbench__more">
              还有 {hiddenCount} 条，查看全部
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          ) : (
            <Link to="/orders" className="l2g-workbench__more l2g-workbench__more--quiet">
              订单列表
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          )}
        </div>
      </section>
    </div>
  )
}

function Empty({ children }: { children: ReactNode }) {
  return <div className="py-14 text-center text-sm text-muted-foreground">{children}</div>
}

function formatClock() {
  const now = new Date()
  const time = now.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  const hour = now.getHours()
  let message = '星光不问赶路人，深夜也请照顾好自己。'
  if (hour >= 5 && hour < 9) message = '清晨好，新的一天从一单开始。'
  else if (hour >= 9 && hour < 12) message = '上午好，保持节奏，慢慢来也很好。'
  else if (hour >= 12 && hour < 14) message = '中午记得吃饭，眼睛也休息一下。'
  else if (hour >= 14 && hour < 18) message = '下午好，喝口水再继续。'
  else if (hour >= 18 && hour < 22) message = '晚上好，辛苦了，欢迎回来。'
  return { time, message }
}