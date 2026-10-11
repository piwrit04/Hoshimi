import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import {
  BarChart3,
  ChevronDown,
  ClipboardList,
  PlusCircle,
  Users,
} from 'lucide-react'
import { useOrdersStore } from '@/store/useOrdersStore'
import { useNewOrderStore } from '@/store/useNewOrderStore'
import {
  dashboard,
  incomeTrend,
  type TrendUnit,
} from '@/domain/dashboard'
import { Button } from '@/components/ui/Button'
import { IncomeTrendChart } from '@/components/charts/IncomeTrendChart'
import { yuan } from '@/lib/format'

/*
 * 首页两整页 snap（对齐 Liver2Go）：
 *   page1 = 全幅问候
 *   page2 = 代肝数据中心：上双玻璃（收入概览|快捷操作），下走势+维度排行占位
 */

export default function Dashboard() {
  const orders = useOrdersStore((s) => s.orders)
  const customers = useOrdersStore((s) => s.customers)
  const settings = useOrdersStore((s) => s.settings)
  const openNewOrder = useNewOrderStore((s) => s.open)

  const ledger = useMemo(
    () => ({ orders, customers, settings }),
    [orders, customers, settings],
  )
  const m = useMemo(() => dashboard(ledger), [ledger])

  const [typed, setTyped] = useState('')
  const [clock, setClock] = useState(() => formatClock())
  const [trendUnit, setTrendUnit] = useState<TrendUnit>('day')
  const trend = useMemo(
    () => incomeTrend(ledger, trendUnit),
    [ledger, trendUnit],
  )

  useEffect(() => {
    const full = m.hello
    setTyped('')
    let i = 0
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      setTyped(full)
      return
    }
    const id = window.setInterval(() => {
      i += 1
      setTyped(full.slice(0, i))
      if (i >= full.length) window.clearInterval(id)
    }, 70)
    return () => window.clearInterval(id)
  }, [m.hello])

  useEffect(() => {
    const id = window.setInterval(() => setClock(formatClock()), 1000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    const root = document.querySelector('[data-scroll-root]') as HTMLElement | null
    if (!root) return
    root.classList.add('l2g-home-snap')
    root.scrollTop = 0
    return () => {
      root.classList.remove('l2g-home-snap')
    }
  }, [])

  const scrollToPage2 = () => {
    const root = document.querySelector('[data-scroll-root]') as HTMLElement | null
    const target = document.getElementById('dashboard-page2')
    if (root && target) {
      const top =
        target.getBoundingClientRect().top -
        root.getBoundingClientRect().top +
        root.scrollTop
      root.scrollTo({ top, behavior: 'smooth' })
    }
  }

  const incomeMetrics = [
    { key: 'today', label: '今日到手', value: yuan(m.kpis.payoutToday) },
    { key: 'month', label: '本月到手', value: yuan(m.kpis.payoutThisMonth) },
    { key: 'open', label: '未完成', value: String(m.kpis.openCount) },
    {
      key: 'expiring',
      label: '托管到期',
      value: String(m.expiring.length),
      hint:
        m.expiring.length > 0
          ? `${m.remindDays} 天内提醒`
          : `阈值 ${m.remindDays} 天内`,
    },
  ]

  return (
    <div className="ds-page ds-page--l2g">
      <section className="l2g-snap-page l2g-hero ds-rise" aria-label="问候">
        <h1 className="l2g-hero__title">
          {typed}
          <span className="l2g-hero__caret" aria-hidden />
        </h1>
        <p className="l2g-hero__meta">
          {m.todayLabel}
          {m.usingTest ? ' · 当前为示例数据' : ''}
        </p>
        <div className="l2g-hero__actions">
          <Button variant="primary" icon={PlusCircle} onClick={openNewOrder}>
            新建订单
          </Button>
        </div>
        <button type="button" className="l2g-hero__scroll" onClick={scrollToPage2}>
          <span>向下滚动查看数据</span>
          <ChevronDown size={20} />
        </button>
      </section>

      <section
        id="dashboard-page2"
        className="l2g-snap-page l2g-datacenter ds-rise"
        aria-label="数据中心"
      >
        <div className="l2g-datacenter__inner">
          <header className="l2g-datacenter__clock">
            <div className="l2g-datacenter__date">{clock.date}</div>
            <div className="l2g-datacenter__time">{clock.time}</div>
            <p className="l2g-datacenter__msg">{clock.message}</p>
          </header>

          <div className="l2g-dc-top">
            <div className="l2g-glass-panel l2g-dc-block">
              <h2 className="l2g-datacenter__heading l2g-datacenter__heading--inline">
                收入概览
              </h2>
              <p className="l2g-glass-panel__desc">
                代肝账本口径 · 已完成才计入到手
                {m.usingTest ? ' · 示例数据' : ''}
              </p>
              <div className="l2g-dc-metrics">
                {incomeMetrics.map((item) => (
                  <div key={item.key} className="l2g-metric">
                    <div className="l2g-metric__value l2g-metric__value--pink">
                      {item.value}
                    </div>
                    <div className="l2g-metric__label">{item.label}</div>
                    {item.hint ? (
                      <div className="l2g-metric__hint">{item.hint}</div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            <div className="l2g-glass-panel l2g-dc-block">
              <h2 className="l2g-datacenter__heading l2g-datacenter__heading--inline">
                快捷操作
              </h2>
              <p className="l2g-glass-panel__desc">常用入口，不塞订单明细</p>
              <div className="l2g-dc-actions">
                <Button variant="primary" icon={PlusCircle} onClick={openNewOrder}>
                  新建订单
                </Button>
                <Link to="/orders" className="l2g-capsule l2g-capsule--ghost">
                  <ClipboardList size={16} />
                  订单
                </Link>
                <Link to="/customers" className="l2g-capsule l2g-capsule--ghost">
                  <Users size={16} />
                  客户
                </Link>
                <Link to="/todo" className="l2g-capsule l2g-capsule--ghost">
                  待办
                </Link>
              </div>
              <div className="l2g-dc-actions__meta">
                <span>
                  进行中 <b>{m.kpis.inProgress}</b>
                </span>
                <span>
                  待处理 <b>{m.kpis.waiting}</b>
                </span>
                <span>
                  活跃客户 <b>{m.kpis.activeCustomers}</b>
                </span>
              </div>
            </div>
          </div>

          <div className="l2g-dc-bottom">
            <div className="l2g-glass-panel l2g-dc-block l2g-dc-block--chart">
              <div className="l2g-glass-panel__head">
                <div>
                  <h2 className="l2g-datacenter__heading l2g-datacenter__heading--inline">
                    收入走势
                  </h2>
                  <p className="l2g-glass-panel__desc">按完成时间统计到手</p>
                </div>
              </div>
              {trend.some((p) => p.payout > 0 || p.count > 0) ? (
                <IncomeTrendChart
                  points={trend}
                  unit={trendUnit}
                  onUnitChange={setTrendUnit}
                />
              ) : (
                <div className="l2g-chart-empty">
                  <BarChart3 size={36} strokeWidth={1.5} className="l2g-chart-empty__icon" />
                  <p className="l2g-chart-empty__title">暂无走势数据</p>
                  <p className="l2g-chart-empty__desc">完成一单后这里会动起来</p>
                </div>
              )}
            </div>

            <div className="l2g-glass-panel l2g-dc-block">
              <h2 className="l2g-datacenter__heading l2g-datacenter__heading--inline">
                维度排行
              </h2>
              <p className="l2g-glass-panel__desc">占位 · 按渠道 / 类型汇总稍后接入</p>
              <div className="l2g-rank-empty">
                <div className="l2g-rank-empty__row">
                  <span>微信</span>
                  <span className="l2g-rank-empty__bar" />
                  <span>—</span>
                </div>
                <div className="l2g-rank-empty__row">
                  <span>闲鱼</span>
                  <span className="l2g-rank-empty__bar" />
                  <span>—</span>
                </div>
                <div className="l2g-rank-empty__row">
                  <span>普通</span>
                  <span className="l2g-rank-empty__bar" />
                  <span>—</span>
                </div>
                <div className="l2g-rank-empty__row">
                  <span>托管</span>
                  <span className="l2g-rank-empty__bar" />
                  <span>—</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function formatClock() {
  const now = new Date()
  const days = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  const date = now.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
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
  return { date: `${date} ${days[now.getDay()]}`, time, message }
}
