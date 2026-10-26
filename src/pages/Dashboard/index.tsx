import { Link, useSearchParams } from 'react-router-dom'
import { useEffect, useMemo, useState, type KeyboardEvent, type ReactNode } from 'react'
import {
  ArrowRight,
  CheckCircle2,
  PanelRightOpen,
  PlusCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { yuan as money, yuan2 } from '@/lib/format'
import { CountUp } from '@/lib/count-up'
import { useOrdersStore } from '@/store/useOrdersStore'
import { useNewOrderStore } from '@/store/useNewOrderStore'
import { useToastStore, toastUndo } from '@/store/useToastStore'
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
 * 待办卡全量展示：托管单/普通单筛选与分组；打开·完成纯图标右下角（完成带底）。
 */

type FocusTab = 'all' | 'chase' | 'due'

const FOCUS_TABS: FocusTab[] = ['all', 'due', 'chase']

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


export default function Dashboard() {
  const orders = useOrdersStore((s) => s.orders)
  const customers = useOrdersStore((s) => s.customers)
  const settings = useOrdersStore((s) => s.settings)
  const completeOrder = useOrdersStore((s) => s.completeOrder)
  const restoreOrder = useOrdersStore((s) => s.restoreOrder)
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

  const dueItems = useMemo(
    () => wb.expiring.map((o) => ({ kind: 'due' as const, order: o })),
    [wb.expiring],
  )
  const chaseItems = useMemo(
    () => wb.openNormal.map((o) => ({ kind: 'chase' as const, order: o })),
    [wb.openNormal],
  )

  const focusSections = useMemo(() => {
    const due = { id: 'due' as const, label: '托管单', items: dueItems }
    const chase = { id: 'chase' as const, label: '普通单', items: chaseItems }
    if (focusTab === 'chase') return [chase].filter((s) => s.items.length > 0)
    if (focusTab === 'due') return [due].filter((s) => s.items.length > 0)
    return [due, chase].filter((s) => s.items.length > 0)
  }, [focusTab, dueItems, chaseItems])

  const focusCount = dueItems.length + chaseItems.length

  const onComplete = (id: string) => {
    const before = orders.find((o) => o.id === id)
    if (!before) return
    const idx = orders.findIndex((o) => o.id === id)
    const next = completeOrder(id)
    if (!next) {
      addToast({ type: 'error', message: '这单暂时不能标完成' })
      return
    }
    toastUndo('已标完成', () => {
      restoreOrder(before, idx >= 0 ? idx : 0)
    })
  }

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
        <nav className="l2g-workbench__rail" aria-label="快捷指标">
          <Link
            to="/orders?mode=已完成&period=today&anchor=completed"
            className="l2g-workbench__rail-item"
          >
            <span className="l2g-workbench__rail-label">今日到手</span>
            <span className="l2g-workbench__rail-value dd-money-gold tabular-nums">
              <CountUp value={k.payoutToday} money />
            </span>
          </Link>
          <Link to="/orders?mode=进行中" className="l2g-workbench__rail-item l2g-workbench__rail-item--div">
            <span className="l2g-workbench__rail-label">进行中</span>
            <span className="l2g-workbench__rail-value tabular-nums">{k.inProgress}</span>
          </Link>
          <Link to="/dashboard?focus=chase" className="l2g-workbench__rail-item l2g-workbench__rail-item--div">
            <span className="l2g-workbench__rail-label">待催</span>
            <span className="l2g-workbench__rail-value tabular-nums">{wb.chaseCount}</span>
          </Link>
          <Link
            to="/dashboard?focus=due"
            className={cn(
              'l2g-workbench__rail-item l2g-workbench__rail-item--div',
              k.expiringCount > 0 && 'l2g-workbench__rail-item--warn',
            )}
          >
            <span className="l2g-workbench__rail-label">快到期</span>
            <span className="l2g-workbench__rail-value tabular-nums">{k.expiringCount}</span>
          </Link>
        </nav>
      </section>

      <section className="l2g-workbench__focus ds-rise" aria-label="待办订单">
        <div className="l2g-workbench__focus-head">
          <div className="min-w-0">
            <h2 className="l2g-workbench__focus-title">待办订单</h2>
            <p className="l2g-workbench__focus-meta">
              共 {wb.followCount} 条 · 托管 {wb.dueCount} · 普通 {wb.chaseCount}
            </p>
          </div>
          <div className="flex items-center gap-1 flex-wrap" role="tablist" aria-label="待办筛选" onKeyDown={onFocusTabKeyDown}>
            {(
              [
                { id: 'all' as const, label: '全部' },
                { id: 'due' as const, label: `托管单 ${wb.dueCount}` },
                { id: 'chase' as const, label: `普通单 ${wb.chaseCount}` },
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

        {focusCount === 0 ? (
          <Empty>
            <p className="mb-2">今天没有要盯的单</p>
            <Button variant="secondary" size="sm" icon={PlusCircle} onClick={openNewOrder}>
              录一笔
            </Button>
          </Empty>
        ) : (
          <div className="l2g-workbench__deck">
            {focusSections.map((section) => (
              <div key={section.id} className="l2g-workbench__group">
                {focusTab === 'all' ? (
                  <h3 className="l2g-workbench__group-title">
                    {section.label}
                    <span className="l2g-workbench__group-count tabular-nums">
                      {section.items.length}
                    </span>
                  </h3>
                ) : null}
                <ul className="l2g-workbench__card-row">
                  {section.items.map(({ kind, order: o }) => {
                    const key = `${kind}-${o.id}`
                    const canComplete = o.status === '待处理' || o.status === '进行中'
                    return (
                      <li key={key} className="l2g-workbench__card">
                        <div className="l2g-workbench__card-head">
                          <span
                            className={cn(
                              'l2g-workbench__row-dot',
                              kind === 'due'
                                ? 'l2g-workbench__row-dot--due'
                                : 'l2g-workbench__row-dot--chase',
                            )}
                            aria-hidden="true"
                          />
                          <p className="l2g-workbench__card-title">
                            <span className="l2g-workbench__card-name">
                              {o.nickname || '未命名'}
                            </span>
                            {o.contact ? (
                              <span className="l2g-workbench__card-contact" translate="no">
                                {o.contact}
                              </span>
                            ) : null}
                          </p>
                        </div>
                        <div className="l2g-workbench__card-tags">
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
                        <p className="l2g-workbench__card-sub">{orderTitle(o)}</p>
                        <div className="l2g-workbench__card-foot">
                          <p className="l2g-workbench__card-amount dd-money-gold tabular-nums">
                            {yuan2(o.amount)}
                          </p>
                          <div className="l2g-workbench__card-actions">
                            <Button
                              variant="primary"
                              size="sm"
                              icon={PanelRightOpen}
                              iconOnly
                              onClick={() => openEdit(o.id)}
                              aria-label="打开"
                              title="打开"
                            />
                            {canComplete ? (
                              <Button
                                variant="secondary"
                                size="sm"
                                icon={CheckCircle2}
                                iconOnly
                                onClick={() => onComplete(o.id)}
                                aria-label="标完成"
                                title="标完成"
                              />
                            ) : null}
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}

        <div className="l2g-workbench__focus-foot">
          <Link to="/orders" className="l2g-workbench__more l2g-workbench__more--quiet">
            订单列表
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
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