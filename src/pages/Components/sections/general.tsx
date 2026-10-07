import { useState, type ComponentType, type ReactNode } from 'react'
import {
  Archive,
  ArrowRight,
  Bell,
  Copy,
  Download,
  FileSpreadsheet,
  Flag,
  Heart,
  Loader2,
  Pencil,
  Plus,
  Save,
  Settings,
  Star,
  Trash2,
  Upload,
  Users,
  Wallet,
} from 'lucide-react'
import { Button, ButtonGroup } from '@/components/ui/Button'
import { Tag, type SemanticTone } from '@/components/ui/data'
import { Tooltip } from '@/components/ui/Tooltip'
import { cn } from '@/lib/utils'

/*
 * 通用分类的示例。
 *
 * 这里是「已实现」组件的真示例，每个函数对应 registry.ts 里 status: 'ready'
 * 的一条。key 用 registry 的 id，页面按 id 取。
 *
 * 写法约定（后面几个 section 文件同）：
 *   - 每个示例尽量用**账本里真实的东西**（订单号、渠道、金额），不用 Lorem ipsum；
 *   - 解释文字放页面壳里（entry.desc），示例只负责「长什么样、怎么动」。
 */

/* ------------------------------------------------------------------ */
/* 按钮                                                                */
/* ------------------------------------------------------------------ */

export function ButtonDemo() {
  const [loading, setLoading] = useState(false)

  return (
    <div className="space-y-5">
      <Row label="变体">
        <Button variant="primary" icon={Save}>保存订单</Button>
        <Button variant="secondary" icon={Download}>导出</Button>
        <Button variant="ghost" icon={Settings}>设置</Button>
        <Button variant="danger" icon={Trash2}>删除</Button>
        <Button variant="text">取消</Button>
      </Row>

      <Row label="尺寸">
        <Button variant="primary" size="sm">小号</Button>
        <Button variant="primary" size="md">中号</Button>
        <Button variant="primary" size="lg">大号</Button>
      </Row>

      <Row label="图标位置">
        <Button variant="secondary" icon={Plus}>前置图标</Button>
        <Button variant="secondary">
          尾置图标 <ArrowRight size={16} />
        </Button>
        <Tooltip content="纯图标按钮必须有 aria-label" position="top">
          <Button variant="secondary" icon={Pencil} iconOnly aria-label="编辑" />
        </Tooltip>
        <Button variant="primary" icon={Plus} iconOnly aria-label="新建订单" />
      </Row>

      <Row label="加载态">
        <Button
          variant="primary"
          icon={Loader2}
          loading={loading}
          onClick={() => {
            setLoading(true)
            /* 只是演示：两秒后自己恢复 */
            window.setTimeout(() => setLoading(false), 2000)
          }}
        >
          {loading ? '提交中…' : '点我试试'}
        </Button>
        <Button variant="secondary" loading>导出中…</Button>
      </Row>

      <Row label="禁用 / 全宽">
        <Button variant="primary" disabled>禁用</Button>
        <Button variant="danger" disabled>禁用</Button>
        <div className="w-52">
          <Button variant="primary" block icon={Wallet}>占满宽度</Button>
        </div>
      </Row>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 按钮组                                                              */
/* ------------------------------------------------------------------ */

export function ButtonGroupDemo() {
  const [range, setRange] = useState('本月')
  return (
    <Row label="拼成一条">
      <ButtonGroup>
        {['今日', '本周', '本月', '全部'].map((r) => (
          <Button
            key={r}
            variant={r === range ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setRange(r)}
          >
            {r}
          </Button>
        ))}
      </ButtonGroup>

      <ButtonGroup>
        <Button variant="secondary" size="sm" icon={Copy}>复制</Button>
        <Button variant="secondary" size="sm" icon={Archive}>归档</Button>
        <Button variant="secondary" size="sm" icon={Trash2}>删除</Button>
      </ButtonGroup>
    </Row>
  )
}

/* ------------------------------------------------------------------ */
/* 图标                                                                */
/* ------------------------------------------------------------------ */

export function IconDemo() {
  const icons = [
    { Icon: Wallet, label: '钱包' },
    { Icon: Users, label: '打手' },
    { Icon: FileSpreadsheet, label: '导入' },
    { Icon: Bell, label: '提醒' },
    { Icon: Flag, label: '标记' },
    { Icon: Star, label: '评分' },
  ]
  return (
    <div className="space-y-5">
      <Row label="常规 size=18 stroke=1.6">
        {icons.map(({ Icon, label }) => (
          <Tooltip key={label} content={label} position="top">
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-secondary text-foreground">
              <Icon size={18} strokeWidth={1.6} />
            </span>
          </Tooltip>
        ))}
      </Row>

      <Row label="三种尺寸">
        <Heart size={14} strokeWidth={1.6} />
        <Heart size={18} strokeWidth={1.6} />
        <Heart size={24} strokeWidth={1.6} />
      </Row>

      <Row label="状态色">
        <Tag tone="success">已完成 <Loader2 size={11} className="animate-spin" /></Tag>
        <Tag tone="warning">托管中</Tag>
        <Tag tone="danger">已退款</Tag>
        <Tag tone="info">进行中</Tag>
        <Tag tone="brand">新单</Tag>
      </Row>

      <Row label="下面这组是「图标按钮」的常见搭法">
        <Button variant="ghost" icon={Pencil} iconOnly aria-label="编辑" size="sm" />
        <Button variant="ghost" icon={Copy} iconOnly aria-label="复制" size="sm" />
        <Button variant="ghost" icon={Upload} iconOnly aria-label="上传" size="sm" />
        <Button
          variant="ghost"
          icon={Trash2}
          iconOnly
          aria-label="删除"
          size="sm"
          className="!text-[rgb(var(--danger-rgb))]"
        />
      </Row>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 字体排版                                                            */
/* ------------------------------------------------------------------ */

export function TypographyDemo() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">一级标题 · 页面名</h1>
        <h2 className="text-2xl font-bold text-foreground">二级标题 · 卡片组</h2>
        <h3 className="text-xl font-semibold text-foreground">三级标题 · 分组卡片</h3>
        <h4 className="text-base font-semibold text-foreground">四级标题 · 小节</h4>
      </div>

      <div className="space-y-2">
        <p className="text-sm text-foreground">
          正文。订单金额一律用「分」做整数运算，不用浮点 ——
          0.1 + 0.2 在浮点里不等于 0.3，账目上这是不能接受的。
        </p>
        <p className="text-sm text-muted-foreground">
          次要文字。手续费按<strong className="text-foreground">全额</strong>算，不按到手算：
          微信 0%，闲鱼 1.6%。
        </p>
        <p className="text-xs text-muted-foreground">
          辅助文字 / 时间戳。2026-02-14 09:31
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-sm text-foreground">
          行内代码：金额字段名是 <code className="px-1.5 py-0.5 rounded bg-secondary font-mono text-[12px] text-foreground">amountCents</code>，
          单位是分。
        </p>
        <blockquote className="border-l-2 border-brand pl-4 text-sm text-muted-foreground italic">
          转单发生在扣手续费之前：到手 = 金额 − 转出 − 手续费。
        </blockquote>
        <p className="text-sm">
          <a
            href="#sec-typography"
            className="text-brand underline underline-offset-2 hover:opacity-80"
          >
            这是一个链接
          </a>
          ，右侧是数字的等宽对齐：
          <span className="font-mono tabular-nums ml-2">1,286.00</span>
        </p>
      </div>

      <dl className="dd-spec">
        <dt>字重四档</dt>
        <dd>400 / 500 / 600 / 700</dd>
        <dt>不要写</dt>
        <dd>550 · 650 · 750（浏览器会就近吸到最重档，整页糊成粗字）</dd>
      </dl>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 卡片                                                                */
/* ------------------------------------------------------------------ */

export function CardDemo() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* 基础卡 */}
      <div className="dd-card">
        <div className="dd-card__header">基础卡片</div>
        <div className="dd-card__body text-muted-foreground">
          带边框和圆角的最简容器。内容区默认 20px 内边距。
        </div>
      </div>

      {/* 带底栏 */}
      <div className="dd-card">
        <div className="dd-card__header">
          <span>带底栏</span>
          <Tag tone="warning">托管中</Tag>
        </div>
        <div className="dd-card__body text-muted-foreground">
          标题栏右侧可以放状态标签，底栏放操作。
        </div>
        <div className="dd-card__footer justify-end">
          <Button variant="ghost" size="sm">取消</Button>
          <Button variant="primary" size="sm">确认</Button>
        </div>
      </div>

      {/* 统计卡 */}
      <div className="dd-card">
        <div className="dd-card__body space-y-1">
          <div className="text-xs text-muted-foreground">本月到手</div>
          <div className="text-2xl font-bold tabular-nums text-foreground">¥ 8,420.00</div>
          <div className="text-xs text-muted-foreground">
            共 62 单 · 平均 ¥135.8
          </div>
        </div>
      </div>

      {/* 可悬浮 */}
      <div className="dd-card dd-card--hoverable cursor-pointer md:col-span-3">
        <div className="dd-card__body flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="font-semibold text-foreground">可悬浮的卡片</div>
            <div className="text-sm text-muted-foreground">
              鼠标移上来会浮起一层阴影（shadow-2）。整块可点的时候加它。
            </div>
          </div>
          <ArrowRight size={18} className="text-muted-foreground shrink-0" />
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 分割线                                                              */
/* ------------------------------------------------------------------ */

export function DividerDemo() {
  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs text-muted-foreground mb-2">水平</div>
        <hr className="dd-divider" />
      </div>

      <div>
        <div className="text-xs text-muted-foreground mb-2">虚线</div>
        <hr className="dd-divider dd-divider--dashed" />
      </div>

      <div>
        <div className="text-xs text-muted-foreground mb-2">带文字</div>
        <div className="dd-divider-with-text">或</div>
      </div>

      <div>
        <div className="text-xs text-muted-foreground mb-2">垂直（用弹性容器撑高）</div>
        <div className="flex items-center gap-4 h-8 text-sm text-foreground">
          <span>金额 ¥286</span>
          <span className="dd-divider--vertical" />
          <span>渠道 闲鱼</span>
          <span className="dd-divider--vertical" />
          <span>费率 1.6%</span>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 弹性布局                                                            */
/* ------------------------------------------------------------------ */

export function FlexDemo() {
  const box = (label: string, grow = false) => (
    <div
      className={cn(
        'px-3 py-2 rounded-md text-xs font-semibold bg-secondary text-foreground',
        grow && 'flex-1'
      )}
    >
      {label}
    </div>
  )
  return (
    <div className="space-y-5">
      <Row label="justify=between（两端对齐，最常用）">
        <div className="flex items-center justify-between w-full max-w-md gap-3">
          {box('左')}
          {box('中')}
          {box('右')}
        </div>
      </Row>

      <Row label="flex-1 撑满剩余空间">
        <div className="flex items-center gap-3 w-full max-w-md">
          {box('固定')}
          {box('撑满剩余', true)}
          {box('固定')}
        </div>
      </Row>

      <Row label="竖向 + 换行">
        <div className="flex flex-col gap-2 items-start">
          {box('第一行')}
          {box('第二行')}
        </div>
      </Row>

      <Row label="一个分隔线把两边顶开（工具栏常见）">
        <div className="flex items-center gap-3 w-full max-w-md">
          {box('筛选')}
          {box('排序')}
          <span className="flex-1" />
          {box('导出')}
        </div>
      </Row>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 栅格                                                                */
/* ------------------------------------------------------------------ */

export function GridDemo() {
  const [cols, setCols] = useState(4)
  const cells = Array.from({ length: 8 }, (_, i) => i + 1)
  return (
    <div className="space-y-5">
      <Row label="列数（改一下看折行）">
        {[2, 3, 4, 6].map((n) => (
          <Button
            key={n}
            size="sm"
            variant={cols === n ? 'primary' : 'secondary'}
            onClick={() => setCols(n)}
          >
            {n} 列
          </Button>
        ))}
      </Row>

      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${Math.floor(560 / cols)}px, 1fr))` }}
      >
        {cells.map((c) => (
          <div
            key={c}
            className="h-16 rounded-lg bg-secondary border border-border flex items-center justify-center text-sm text-muted-foreground"
          >
            格 {c}
          </div>
        ))}
      </div>

      <p className="dd-help">
        本项目用 Tailwind 的 grid 直接写（<code>grid-cols-*</code> + <code>md:grid-cols-*</code>），
        不需要额外组件 —— 上面的按钮只是把断点参数可视化了。
      </p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 间距                                                                */
/* ------------------------------------------------------------------ */

export function SpaceDemo() {
  const chip = (n: number) => (
    <span key={n} className="px-2.5 py-1 rounded-md bg-secondary text-xs font-semibold text-foreground">
      标签 {n}
    </span>
  )
  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs text-muted-foreground mb-2">gap-1 · 4px（紧贴的标签）</div>
        <div className="flex flex-wrap items-center gap-1">{[1, 2, 3, 4, 5].map(chip)}</div>
      </div>
      <div>
        <div className="text-xs text-muted-foreground mb-2">gap-3 · 12px（按钮并排）</div>
        <div className="flex flex-wrap items-center gap-3">{[1, 2, 3, 4, 5].map(chip)}</div>
      </div>
      <div>
        <div className="text-xs text-muted-foreground mb-2">gap-6 · 24px（卡片之间）</div>
        <div className="flex flex-wrap items-center gap-6">{[1, 2, 3, 4].map(chip)}</div>
      </div>
      <div>
        <div className="text-xs text-muted-foreground mb-2">竖向</div>
        <div className="flex flex-col items-start gap-2">{[1, 2, 3].map(chip)}</div>
      </div>
      <p className="dd-help">
        和栅格同理：Tailwind 的 <code>gap-*</code> 就是它，本项目不额外封装组件。
        但要记住**别再用 margin 拼间距**，两个一起用会打架。
      </p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 布局                                                                */
/* ------------------------------------------------------------------ */

export function LayoutDemo() {
  return (
    <div className="space-y-4">
      {/* 缩略图式的骨架示意：把整个应用外壳按比例画出来 */}
      <div className="rounded-lg border border-border overflow-hidden bg-background">
        {/* 标题栏 */}
        <div className="h-8 bg-card border-b border-border flex items-center px-3 gap-3">
          <span className="text-[10px] text-muted-foreground">标题栏 52px · 拖动区 + 居中搜索 + 窗口按钮</span>
        </div>
        <div className="flex h-52">
          {/* 侧栏 */}
          <div className="w-28 shrink-0 bg-card border-r border-border p-2 space-y-1.5">
            <div className="h-6 rounded bg-primary/80" />
            <div className="h-6 rounded bg-secondary" />
            <div className="h-6 rounded bg-secondary" />
            <span className="block text-[10px] text-muted-foreground pt-1 leading-tight">
              侧栏 256px
              <br />
              贴左 / 上 / 下
              <br />
              无圆角无外边距
            </span>
          </div>
          {/* 内容区 */}
          <div className="flex-1 p-3 space-y-2 min-w-0">
            <div className="h-7 rounded bg-secondary" />
            <div className="h-16 rounded bg-card border border-border" />
            <div className="h-16 rounded bg-card border border-border" />
            <span className="block text-[10px] text-muted-foreground">
              内容区：占满剩余宽度，只有它自己滚动
            </span>
          </div>
        </div>
      </div>

      <dl className="dd-spec">
        <dt>h-screen w-screen flex</dt>
        <dd>最外层：固定视口高，不出现整页滚动条</dd>
        <dt>aside w-64</dt>
        <dd>侧栏：shrink-0，贴窗口左 / 上 / 下，无圆角无外边距</dd>
        <dt>header h-[52px]</dt>
        <dd>标题栏：shrink-0，Electron 拖动区</dd>
        <dt>main flex-1 overflow-y-auto</dt>
        <dd>内容区：唯一滚动容器。**页内锚点跳转要认它，不是 window**</dd>
      </dl>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 平钉 / 全局样式（计划中）                                            */
/* ------------------------------------------------------------------ */

export function AffixDemo() {
  return (
    <PlannedPreview
      title="固钉 · 计划中"
      mock={
        <div className="relative w-full max-w-sm h-40 rounded-lg border border-border bg-background overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-9 bg-card border-b border-border flex items-center justify-between px-3 shadow-sm z-10">
            <span className="text-xs text-foreground">操作条（钉住）</span>
            <span className="text-[10px] text-brand">已固定</span>
          </div>
          <div className="pt-12 px-3 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-5 rounded bg-secondary" />
            ))}
          </div>
        </div>
      }
    />
  )
}

export function GlobalStyleDemo() {
  return (
    <PlannedPreview
      title="全局样式 · 计划中"
      mock={
        <div className="w-full max-w-sm rounded-lg border border-border p-3 space-y-2">
          <div className="text-xs text-muted-foreground">挂在 body 上的浮层（抽屉 / 下拉）</div>
          <div className="rounded-md border border-border bg-popover p-3 text-sm text-popover-foreground shadow-lg">
            我应该和页面同一套颜色
          </div>
          <div className="text-[10px] text-muted-foreground">
            没有全局同步时，深色模式下这一块会是浅色的
          </div>
        </div>
      }
    />
  )
}

/* ================================================================== */
/* 共用小件                                                            */
/* ================================================================== */

/** 一行示例：左边一行小标题，右边样品 */
export function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  )
}

/**
 * 「计划中」的视觉预览。
 *
 * 为什么要有它：光写「计划中」三个字，用户看不出这东西长什么样、
 * 以后加进来会占多大地方。所以给一个**尺寸和气质正确**的静态草样。
 * 这个草样刻意做得朴素（灰块 + 边框），不会让人误以为已经能用。
 */
export function PlannedPreview({
  title,
  mock,
  note,
}: {
  title: string
  mock: ReactNode
  note?: string
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="dd-soon">计划中</span>
        <span className="text-xs text-muted-foreground">{title}</span>
      </div>
      <div className="dd-tray dd-tray--block">
        {mock}
        {note && <p className="dd-help">{note}</p>}
      </div>
    </div>
  )
}

/* ================================================================== */
/* 按 registry id 的映射                                               */
/* ================================================================== */

export const GENERAL_DEMOS: Record<string, ComponentType> = {
  'c-button': ButtonDemo,
  'c-buttongroup': ButtonGroupDemo,
  'c-icon': IconDemo,
  'c-typography': TypographyDemo,
  'c-card': CardDemo,
  'c-divider': DividerDemo,
  'c-flex': FlexDemo,
  'c-grid': GridDemo,
  'c-space': SpaceDemo,
  'c-layout': LayoutDemo,
  'c-affix': AffixDemo,
  'c-globalstyle': GlobalStyleDemo,
}

/* 这个文件里没被 demo 用到、但其他 section 会引的图标，先 re-export
   以避免「导入了却没用到」的 lint 噪音。实际由各 section 自己 import。 */
export type { SemanticTone }