import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import {
  BarChart3,
  ChevronDown,
  CircleDollarSign,
  Heart,
  PlusCircle,
  Sparkles,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { useOrdersStore } from '@/store/useOrdersStore'
import { useNewOrderStore } from '@/store/useNewOrderStore'
import { dashboard } from '@/domain/dashboard'
import { Button } from '@/components/ui/Button'

/*
 * 首页两整页 snap（对齐 Liver2Go）：
 *   page1 = 全幅问候
 *   page2 = 数据中心骨架占位（KPI 玻璃卡 + 空图表），不塞订单表/订单 KPI
 */

const KPI_SLOTS: {
  key: string
  label: string
  icon: LucideIcon
  hint: string
}[] = [
  { key: 'yesterday', label: '昨日收入', icon: CircleDollarSign, hint: '占位 · 待接入' },
  { key: 'today', label: '今日收入', icon: Sparkles, hint: '占位 · 待接入' },
  { key: 'fans', label: '粉丝数', icon: Heart, hint: '占位 · 待接入' },
  { key: 'served', label: '已服务', icon: Users, hint: '占位 · 待接入' },
]

const METRIC_SLOTS = [
  { label: '服务天数', unit: '天' },
  { label: '已成交', unit: '' },
  { label: '累计到手', unit: '' },
  { label: '服务用户', unit: '位' },
]

export default function Dashboard() {
  const orders = useOrdersStore((s) => s.orders)
  const customers = useOrdersStore((s) => s.customers)
  const settings = useOrdersStore((s) => s.settings)
  const openNewOrder = useNewOrderStore((s) => s.open)

  const m = useMemo(() => dashboard({ orders, customers, settings }), [orders, customers, settings])

  const [typed, setTyped] = useState('')
  const [clock, setClock] = useState(() => formatClock())

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

  /* 首页启用 scroll-snap；离开时卸掉，避免其它页被强制整页吸附 */
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

  return (
    <div className="ds-page ds-page--l2g">
      {/* —— Page 1: 全幅问候 —— */}
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

      {/* —— Page 2: 数据中心骨架（占位，不塞订单） —— */}
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

          <nav className="l2g-datacenter__nav" aria-label="快捷入口">
            <Link to="/orders" className="l2g-capsule">
              订单
            </Link>
            <Link to="/customers" className="l2g-capsule">
              客户
            </Link>
            <Link to="/todo" className="l2g-capsule">
              待办
            </Link>
          </nav>

          <div className="l2g-datacenter__metrics">
            {METRIC_SLOTS.map((s) => (
              <div key={s.label} className="l2g-metric">
                <div className="l2g-metric__value">
                  —{s.unit ? <span className="l2g-metric__unit">{s.unit}</span> : null}
                </div>
                <div className="l2g-metric__label">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="l2g-datacenter__section">
            <h2 className="l2g-datacenter__heading">数据一览</h2>
            <div className="l2g-kpi-grid">
              {KPI_SLOTS.map((slot) => (
                <PlaceholderKpi
                  key={slot.key}
                  icon={slot.icon}
                  label={slot.label}
                  hint={slot.hint}
                />
              ))}
            </div>
          </div>

          <div className="l2g-datacenter__section l2g-datacenter__chart">
            <div className="l2g-glass-panel">
              <div className="l2g-glass-panel__head">
                <div>
                  <h2 className="l2g-datacenter__heading l2g-datacenter__heading--inline">
                    收入走势
                  </h2>
                  <p className="l2g-glass-panel__desc">占位 · 接入后显示到手趋势</p>
                </div>
                <div className="l2g-capsule-group" aria-hidden>
                  <span className="l2g-capsule l2g-capsule--muted">日</span>
                  <span className="l2g-capsule l2g-capsule--muted">周</span>
                  <span className="l2g-capsule l2g-capsule--muted">月</span>
                </div>
              </div>
              <div className="l2g-chart-empty">
                <BarChart3 size={36} strokeWidth={1.5} className="l2g-chart-empty__icon" />
                <p className="l2g-chart-empty__title">暂无走势数据</p>
                <p className="l2g-chart-empty__desc">位置已留好，不在此塞订单明细</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function PlaceholderKpi({
  icon: Icon,
  label,
  hint,
}: {
  icon: LucideIcon
  label: string
  hint: string
}) {
  return (
    <div className="l2g-kpi-card" title={hint}>
      <span className="l2g-kpi-card__icon" aria-hidden>
        <Icon size={22} strokeWidth={1.75} />
      </span>
      <div className="l2g-kpi-card__value">—</div>
      <div className="l2g-kpi-card__label">{label}</div>
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
