import { useEffect, useRef, useState, type ComponentType } from 'react'
import { Palette, Info, ArrowUp } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import SectionCard from '@/components/ui/SectionCard'
import { BackToTop } from '@/components/ui/BackToTop'
import { Tag } from '@/components/ui/data'
import { Button } from '@/components/ui/Button'
import { Progress } from '@/components/ui/feedback'
import { cn } from '@/lib/utils'
import {
  CATEGORY_ORDER,
  COMPONENTS,
  REGISTRY_STATS,
  componentsByCategory,
  type ComponentEntry,
} from './registry'
import { GENERAL_DEMOS, PlannedPreview } from './sections/general'
import { FORM_DEMOS, FormPlannedMock } from './sections/forms'
import { DATA_DEMOS, DataPlannedMock } from './sections/data'
import { NAV_DEMOS, NavPlannedMock, FEEDBACK_DEMOS, FeedbackPlannedMock } from './sections/nav'
import { FEEDBACK2_DEMOS } from './sections/feedback'
import { MISC_DEMOS } from './sections/misc'

/*
 * ============================================================
 *  组件展示页
 * ============================================================
 *
 * 结构照 naive-ui 的组件文档站：**左边一条常驻的分类目录，右边是正文**。
 * 目录按六大分类分组（通用 / 数据录入 / 数据展示 / 导航 / 反馈 / 其它），
 * 每一条都能跳到对应段落，滚动时自动高亮当前所在的那一节。
 *
 * 和 naive-ui 的差别（刻意的）：
 *   naive-ui 每个组件一个独立页面，我们**一页到底 + 锚点跳转**。
 *   原因是这一页现在的用途是「清点我们还缺什么」，一屏能通读比翻 70 个
 *   页面有用。等产品页面开始做了，再按需拆成独立路由。
 *
 * 两种条目：
 *   status: 'ready'   → 渲染真示例（能点能用）
 *   status: 'planned' → 渲染「计划中的样子」：外观草样 + 在账本里干什么用
 *                       （每个分类一个 mock 映射，见 sections/*.tsx）
 *
 * ------------------------------------------------------------------
 *  ⚠️ 两个容易踩的坑，都跟「页内锚点」有关
 * ------------------------------------------------------------------
 *  1. **滚动容器不是 window**，是 MainLayout 里的那个 <main>。
 *     所以不能靠浏览器的默认 #hash 跳转（它只滚 window）。
 *     必须自己找 <main> 然后 scrollIntoView。
 *  2. 滚动高亮也不能用 window 的 IntersectionObserver + rootMargin 百分比，
 *     因为滚动的是内层容器。这里用「哨兵元素 + 顶部触线」的算法，
 *     不依赖百分比阈值，换滚动容器也不用改逻辑。
 */

/* 所有分类的示例映射，合成一张表 */
const ALL_DEMOS: Record<string, ComponentType> = {
  ...GENERAL_DEMOS,
  ...FORM_DEMOS,
  ...DATA_DEMOS,
  ...NAV_DEMOS,
  ...FEEDBACK_DEMOS,
  ...FEEDBACK2_DEMOS,
  ...MISC_DEMOS,
}

/* 找页面真正的滚动容器：MainLayout 里的那个 <main data-scroll-root>。
   用属性选择器而不是 querySelector('main')，标签名容易被别的 <main> 抢走。 */
function getScrollRoot(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[data-scroll-root]') ?? document.querySelector('main')
}

export default function ComponentsPage() {
  const [activeId, setActiveId] = useState<string>(COMPONENTS[0]?.id ?? '')
  const scrollRef = useRef<HTMLElement | null>(null)
  const [tocOpen, setTocOpen] = useState(false)

  useEffect(() => {
    scrollRef.current = getScrollRoot()
  }, [])

  /* ---------- 滚动高亮 ----------
     每个示例段的最外层带 data-sensor="<组件 id>"。
     哪个哨兵离容器顶最近且已经在顶上方，那一段就是「当前段」。
     比 IntersectionObserver 的百分比阈值稳，也不受容器高度影响。 */
  useEffect(() => {
    const root = getScrollRoot()
    if (!root) return

    let raf = 0
    const compute = () => {
      raf = 0
      const rootTop = root.getBoundingClientRect().top
      const sensors = Array.from(root.querySelectorAll<HTMLElement>('[data-sensor]'))
      if (sensors.length === 0) return
      /* 触线设在容器顶部往下 25% 的位置：内容滚到那里就算「当前」 */
      const line = rootTop + root.clientHeight * 0.25
      let current = sensors[0].dataset.sensor ?? ''
      for (const s of sensors) {
        if (s.getBoundingClientRect().top <= line) current = s.dataset.sensor ?? current
        else break
      }
      setActiveId(current)
    }

    const onScroll = () => {
      /* rAF 节流：scroll 事件一帧能来好几次，不节流会在滚动时卡 */
      if (!raf) raf = requestAnimationFrame(compute)
    }

    root.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    compute()
    return () => {
      root.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  /* ---------- 从全局搜索跳过来 ----------
     FloatingSearch 用的是 <Link to="/components#sec-xxx">。
     因为滚动容器是 <main> 不是 window，浏览器的默认锚点跳转**不会生效**，
     所以这里自己处理一次。 */
  useEffect(() => {
    const go = () => {
      const hash = window.location.hash.replace(/^#/, '')
      if (!hash) return
      const el = document.getElementById(hash)
      const root = getScrollRoot()
      if (!el || !root) return
      const offset = el.getBoundingClientRect().top - root.getBoundingClientRect().top
      root.scrollTo({ top: root.scrollTop + offset - 16, behavior: 'smooth' })
    }
    /* 首次进来（直接带 hash）稍微等一帧，等布局稳定 */
    const t = window.setTimeout(go, 60)
    window.addEventListener('hashchange', go)
    return () => {
      window.clearTimeout(t)
      window.removeEventListener('hashchange', go)
    }
  }, [])

  const scrollToAnchor = (anchor: string) => {
    const el = document.getElementById(anchor)
    const root = getScrollRoot()
    if (!el || !root) return
    const offset = el.getBoundingClientRect().top - root.getBoundingClientRect().top
    root.scrollTo({ top: root.scrollTop + offset - 16, behavior: 'smooth' })
    /* 同步一下 hash，这样刷新还能停在原位 */
    window.history.replaceState(null, '', `#${anchor}`)
    setTocOpen(false)
  }

  const plannedCount = REGISTRY_STATS.planned
  const readyPercent = Math.round((REGISTRY_STATS.ready / (REGISTRY_STATS.ready + plannedCount)) * 100)

  return (
    <div className="max-w-[1500px] mx-auto px-6 md:px-8 pb-16">
      <PageHeader
        icon={Palette}
        title="组件预览"
        actions={<CompletionMeter percent={readyPercent} />}
      />

      {/* 页面说明 —— 讲清楚这一页为什么长这样 */}
      <div className="dd-alert dd-alert--info mb-6">
        <span className="dd-alert__icon"><Info size={16} /></span>
        <div className="flex-1 min-w-0">
          <div className="dd-alert__title">
            分类照 naive-ui 的组件文档站，按账本的业务相关性筛过
          </div>
          <div className="dd-alert__desc">
            共 {REGISTRY_STATS.total} 个组件：<strong className="text-foreground">{REGISTRY_STATS.ready} 个已实现</strong>（能点能用）、
            <strong className="text-foreground">{plannedCount} 个计划中</strong>（给了外观草样和用途说明）、
            {REGISTRY_STATS.omitted} 个刻意不做（见文末）。
            左侧目录点一下能跳，滚动时自动高亮。
          </div>
        </div>
      </div>

      <div className="flex gap-8 items-start">
        {/* ---------- 左侧目录 ---------- */}
        {/* 移动端：收成一条横向按钮，点了展开 */}
        <button
          type="button"
          className="xl:hidden fixed bottom-6 left-6 z-40 dd-float-btn"
          aria-label="组件目录"
          onClick={() => setTocOpen((v) => !v)}
        >
          <Palette size={18} />
        </button>

        <nav
          className={cn(
            'w-56 shrink-0 sticky top-4',
            /* 桌面端常驻；小屏是弹层 */
            'hidden xl:block',
            tocOpen && 'xl:hidden fixed inset-y-0 left-0 z-50 block w-64 overflow-y-auto custom-scrollbar bg-card border-r border-border p-4'
          )}
          aria-label="组件目录"
        >
          <div className="bg-card border border-border rounded-xl p-4 shadow-lg max-h-[calc(100vh-120px)] overflow-y-auto custom-scrollbar">
            <div className="text-xs font-bold text-foreground mb-3 tracking-wide flex items-center justify-between">
              <span>组件目录</span>
              <span className="text-muted-foreground font-normal tabular-nums">
                {REGISTRY_STATS.ready}/{REGISTRY_STATS.ready + plannedCount}
              </span>
            </div>

            {CATEGORY_ORDER.map((cat) => {
              const list = componentsByCategory(cat)
              if (list.length === 0) return null
              return (
                <div key={cat}>
                  <div className="dd-index-group">
                    {cat}
                    <span className="ml-1.5 font-normal opacity-70">{list.length}</span>
                  </div>
                  <ul className="space-y-0.5">
                    {list.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          data-active={activeId === c.id}
                          data-nav={c.id}
                          className="dd-index-link w-full text-left flex items-center gap-1.5"
                          onClick={() => scrollToAnchor(c.anchor)}
                        >
                          <span className="truncate flex-1">{c.name}</span>
                          {c.status === 'planned' && (
                            <span
                              className="w-1.5 h-1.5 rounded-full bg-[rgb(var(--warning-rgb))] shrink-0"
                              title="计划中"
                            />
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </nav>

        {/* ---------- 右侧正文 ---------- */}
        <div className="flex-1 min-w-0">
          {CATEGORY_ORDER.map((cat) => {
            const list = componentsByCategory(cat)
            if (list.length === 0) return null
            return (
              <section key={cat} className="mb-10">
                {/* 分类标题 */}
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-xl font-bold text-foreground">{cat}</h2>
                  <span className="h-px flex-1 bg-border" />
                  <span className="text-xs text-muted-foreground tabular-nums">{list.length} 个</span>
                </div>

                <div className="space-y-5">
                  {list.map((c) => (
                    <EntrySection key={c.id} entry={c} />
                  ))}
                </div>
              </section>
            )
          })}

          {/* 文末：刻意不做的那些 */}
          <OmittedList />
        </div>
      </div>

      <BackToTop scrollRef={scrollRef as React.RefObject<HTMLElement>} />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 单条组件                                                            */
/* ------------------------------------------------------------------ */

function EntrySection({ entry }: { entry: ComponentEntry }) {
  const Demo = ALL_DEMOS[entry.id]

  return (
    <div data-sensor={entry.id} id={entry.anchor} className="scroll-mt-4">
      <SectionCard
        title={
          <span className="flex items-center gap-2 flex-wrap">
            <span>{entry.name}</span>
            <code className="text-xs font-mono font-normal text-muted-foreground">{entry.sub}</code>
            {entry.status === 'ready' ? (
              <span className="dd-done">已实现</span>
            ) : (
              <span className="dd-soon">计划中</span>
            )}
          </span>
        }
        extra={
          entry.naive && entry.naive !== '—' ? (
            <span className="text-[11px] text-muted-foreground font-mono" title="naive-ui 里的对应组件">
              {entry.naive}
            </span>
          ) : null
        }
      >
        {/* 说明 */}
        <p className="text-sm text-muted-foreground">{entry.desc}</p>

        {/* 计划中的：写清在账本里干什么 */}
        {entry.status === 'planned' && entry.scene && (
          <div className="mt-3 rounded-lg border border-dashed border-border bg-secondary/30 p-3">
            <div className="text-[11px] font-bold text-muted-foreground mb-1 tracking-wide">
              在账本里干什么
            </div>
            <p className="text-sm text-foreground">{entry.scene}</p>
          </div>
        )}

        {/* 示例 */}
        <div className="mt-5">
          {entry.status === 'ready' && Demo ? (
            <Demo />
          ) : entry.status === 'ready' && !Demo ? (
            /* 标了 ready 却没有示例 —— 这是登记表和示例文件不同步，直接说出来 */
            <div className="dd-alert dd-alert--danger">
              <span className="dd-alert__icon">!</span>
              <div>
                <div className="dd-alert__title">这一条标了「已实现」，但没有对应示例</div>
                <div className="dd-alert__desc">
                  registry.ts 里的 id <code>{entry.id}</code> 在 sections/ 里找不到。
                  要么补示例，要么把状态改回 planned。
                </div>
              </div>
            </div>
          ) : (
            /* planned：优先用分类自己的草样，没有就给一句通用说明 */
            <PlannedMock entry={entry} />
          )}
        </div>
      </SectionCard>
    </div>
  )
}

function PlannedMock({ entry }: { entry: ComponentEntry }) {
  const byCategory = (() => {
    switch (entry.category) {
      case '通用':
        /* 通用里的 planned 直接在 general.tsx 的映射里，这里拿 component */
        return null
      case '数据录入':
        return <FormPlannedMock id={entry.id} />
      case '数据展示':
        return <DataPlannedMock id={entry.id} />
      case '导航':
        return <NavPlannedMock id={entry.id} />
      case '反馈':
        return <FeedbackPlannedMock id={entry.id} />
      default:
        return null
    }
  })()

  if (byCategory) return byCategory

  /* 通用分类里的 planned（Affix / GlobalStyle）走这里 */
  const GeneralMock = GENERAL_DEMOS[entry.id]
  if (GeneralMock) return <GeneralMock />

  return (
    <PlannedPreview
      title={`${entry.name} · 计划中`}
      note={
        entry.scene
          ? '上面写了它在账本里的用途。真正实现时会按本项目的 token 和圆角来做，不会直接抄 naive-ui 的外观。'
          : '还没有排期。'
      }
      mock={
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="dd-spin dd-spin--sm" />
          等待实现
        </div>
      }
    />
  )
}

/* ------------------------------------------------------------------ */
/* 刻意不做的那些                                                       */
/* ------------------------------------------------------------------ */

function OmittedList() {
  const omitted = COMPONENTS.filter((c) => c.status === 'omit')
  if (omitted.length === 0) return null
  return (
    <section className="mb-10">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-xl font-bold text-foreground">刻意不做</h2>
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground tabular-nums">{omitted.length} 个</span>
      </div>

      <SectionCard title="naive-ui 里有，但我们不做">
        <p className="text-sm text-muted-foreground mb-4">
          照搬 naive-ui 的目录时，有几个组件**故意排除**。列在这里是为了说明理由 ——
          免得以后有人又把它加回来。
        </p>
        <ul className="space-y-3">
          {omitted.map((c) => (
            <li key={c.id} className="flex gap-3">
              <Tag tone="danger" className="shrink-0 h-fit">{c.sub}</Tag>
              <div className="min-w-0">
                <div className="text-sm text-foreground">{c.omitReason}</div>
                {c.naive && c.naive !== '—' && (
                  <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                    naive-ui: {c.naive}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      </SectionCard>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* 头部右侧：完成度                                                     */
/* ------------------------------------------------------------------ */

function CompletionMeter({ percent }: { percent: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-right">
        <div className="text-xs text-muted-foreground">已实现</div>
        <div className="text-sm font-bold text-foreground tabular-nums">
          {REGISTRY_STATS.ready} / {REGISTRY_STATS.ready + REGISTRY_STATS.planned}
        </div>
      </div>
      <div className="w-28">
        <Progress value={percent} showLabel tone="brand" />
      </div>
      <Button
        variant="ghost"
        icon={ArrowUp}
        iconOnly
        size="sm"
        aria-label="回到顶部"
        onClick={() => {
          const root = getScrollRoot()
          root?.scrollTo({ top: 0, behavior: 'smooth' })
        }}
      />
    </div>
  )
}
