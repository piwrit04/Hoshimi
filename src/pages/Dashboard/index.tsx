import { Link, useSearchParams } from 'react-router-dom'
import { useEffect, useMemo, useState, type KeyboardEvent, type ReactNode } from 'react'
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
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

/** Visible compact cards per page */
const CARDS_PER_PAGE = 4

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
  const openNewOrder = useNewOrderStore((s) => s.open)
  const openEdit = useNewOrderStore((s) => s.openEdit)
  const addToast = useToastStore((s) => s.addToast)
  const [searchParams, setSearchParams] = useSearchParams()

  const [clock, setClock] = useState(() => formatClock())
  const focusTab = parseFocus(searchParams.get('focus'))
  const [cardPage, setCardPage] = useState(0)
  const [flippedIds, setFlippedIds] = useState<Record<string, boolean>>({})

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

  const pageCount = focusList.length === 0 ? 0 : Math.ceil(focusList.length / CARDS_PER_PAGE)
  const safeCardPage = pageCount === 0 ? 0 : Math.min(cardPage, pageCount - 1)
  const pageItems = focusList.slice(
    safeCardPage * CARDS_PER_PAGE,
    safeCardPage * CARDS_PER_PAGE + CARDS_PER_PAGE,
  )
  useEffect(() => {
    setCardPage(0)
    setFlippedIds({})
  }, [focusTab])

  useEffect(() => {
    if (pageCount > 0 && cardPage >= pageCount) {
      setCardPage(Math.max(0, pageCount - 1))
    }
  }, [pageCount, cardPage])

  const toggleFlip = (id: string) => {
    setFlippedIds((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const onComplete = (id: string) => {
    try {
      completeOrder(id)
      addToast({ type: 'success', message: '已标完成' })
    } catch {
      addToast({ type: 'error', message: '这单暂时不能标完成' })
    }
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
          <p className="l2g-workbench__hero-stats text-muted-foreground">
            <Link
              to="/orders?mode=已完成&period=today&anchor=completed"
              className="l2g-workbench__stat"
            >
              今日到手{" "}
              <span className="l2g-workbench__stat-val dd-money-gold tabular-nums">
                <CountUp value={k.payoutToday} money />
              </span>
            </Link>
            <span className="l2g-workbench__stat-sep" aria-hidden="true">
              ·
            </span>
            <Link to="/orders?mode=进行中" className="l2g-workbench__stat">
              进行中{" "}
              <span className="l2g-workbench__stat-val tabular-nums">{k.inProgress}</span>
            </Link>
            <span className="l2g-workbench__stat-sep" aria-hidden="true">
              ·
            </span>
            <Link to="/dashboard?focus=chase" className="l2g-workbench__stat">
              待催{" "}
              <span className="l2g-workbench__stat-val tabular-nums">{wb.chaseCount}</span>
            </Link>
            <span className="l2g-workbench__stat-sep" aria-hidden="true">
              ·
            </span>
            <Link
              to="/dashboard?focus=due"
              className={cn(
                'l2g-workbench__stat',
                k.expiringCount > 0 && 'l2g-workbench__stat--warn',
              )}
            >
              快到期{" "}
              <span className="l2g-workbench__stat-val tabular-nums">{k.expiringCount}</span>
            </Link>
          </p>
        </div>
      </section>

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
              录一笔
            </Button>
          </Empty>
        ) : (
          <div
            className="l2g-workbench__deck"
            tabIndex={0}
            onKeyDown={(e) => {
              if (pageCount <= 1) return
              if (e.key === 'ArrowLeft' && safeCardPage > 0) {
                e.preventDefault()
                setCardPage(safeCardPage - 1)
              } else if (e.key === 'ArrowRight' && safeCardPage < pageCount - 1) {
                e.preventDefault()
                setCardPage(safeCardPage + 1)
              }
            }}
          >
            <div className="l2g-workbench__card-row" role="list">
              {pageItems.map(({ kind, order: o }) => {
                const flipKey = `${kind}-${o.id}`
                const flipped = !!flippedIds[flipKey]
                return (
                  <div key={flipKey} className="l2g-workbench__flip" role="listitem">
                    <div
                      className={cn(
                        'l2g-workbench__flip-inner',
                        flipped && 'l2g-workbench__flip-inner--flipped',
                      )}
                    >
                      <article className="l2g-workbench__card l2g-workbench__card--front">
                        <button
                          type="button"
                          className="l2g-workbench__card-face-btn"
                          onClick={() => toggleFlip(flipKey)}
                          aria-label={'翻转查看详情'}
                        >
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
                            <h3 className="l2g-workbench__card-title truncate">
                              {o.nickname || '未命名'}
                            </h3>
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
                          <p className="l2g-workbench__card-amount dd-money-gold tabular-nums">
                            {yuan2(o.amount)}
                          </p>
                          <p className="l2g-workbench__card-hint">点击翻面</p>
                        </button>
                      </article>

                      <article className="l2g-workbench__card l2g-workbench__card--back">
                        <div className="l2g-workbench__card-back-body">
                          <div className="l2g-workbench__card-head">
                            <h3 className="l2g-workbench__card-title truncate">
                              {o.nickname || '未命名'}
                            </h3>
                            <button
                              type="button"
                              className="l2g-workbench__flip-back"
                              onClick={() => toggleFlip(flipKey)}
                              aria-label={'翻回正面'}
                            >
                              正面
                            </button>
                          </div>
                          <p className="l2g-workbench__card-sub">
                            {orderTitle(o)}
                            {o.contact ? ` \u00b7 ${o.contact}` : ''}
                          </p>
                          <p className="l2g-workbench__card-amount dd-money-gold tabular-nums">
                            {yuan2(o.amount)}
                          </p>
                          <div className="l2g-workbench__card-actions">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => openEdit(o.id)}
                            >
                              打开
                            </Button>
                            {(o.status === '待处理' ||
                              o.status === '进行中') && (
                              <Button
                                variant="ghost"
                                size="sm"
                                icon={CheckCircle2}
                                onClick={() => onComplete(o.id)}
                                title='标完成'
                                aria-label='标完成'
                              >
                                完成
                              </Button>
                            )}
                          </div>
                        </div>
                      </article>
                    </div>
                  </div>
                )
              })}
            </div>

            {pageCount > 1 ? (
              <div className="l2g-workbench__pager" role="navigation" aria-label='待办翻页'>
                <button
                  type="button"
                  className="l2g-workbench__pager-btn"
                  disabled={safeCardPage <= 0}
                  onClick={() => setCardPage(safeCardPage - 1)}
                  aria-label='上一页'
                >
                  <ChevronLeft size={16} aria-hidden="true" />
                </button>
                <div className="l2g-workbench__pager-dots" role="tablist" aria-label='页码'>
                  {Array.from({ length: pageCount }, (_, i) => (
                    <button
                      key={i}
                      type="button"
                      role="tab"
                      aria-selected={i === safeCardPage}
                      aria-label={`第 ${i + 1} 页`}
                      className={cn(
                        'l2g-workbench__pager-dot',
                        i === safeCardPage && 'l2g-workbench__pager-dot--on',
                      )}
                      onClick={() => setCardPage(i)}
                    />
                  ))}
                </div>
                <span className="l2g-workbench__pager-pos tabular-nums">
                  {safeCardPage + 1} / {pageCount}
                </span>
                <button
                  type="button"
                  className="l2g-workbench__pager-btn"
                  disabled={safeCardPage >= pageCount - 1}
                  onClick={() => setCardPage(safeCardPage + 1)}
                  aria-label='下一页'
                >
                  <ChevronRight size={16} aria-hidden="true" />
                </button>
              </div>
            ) : null}
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