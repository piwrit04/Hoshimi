import { useRef, useState, type ComponentType, type ReactNode } from 'react'
import {
  AlertTriangle,
  ArrowUp,
  BarChart3,
  Boxes,
  Copy,
  Download,
  ExternalLink,
  Filter,
  Home,
  Info,
  LayoutDashboard,
  ListOrdered,
  Pencil,
  Plus,
  Settings,
  Share2,
  Trash2,
  Upload,
  Users,
} from 'lucide-react'
import { Tabs, Breadcrumb, Pagination, Steps, FloatButton, Progress, Spin, SpinOverlay } from '@/components/ui/feedback'
import { Dropdown, Popover, Drawer } from '@/components/ui/overlay'
import { Button } from '@/components/ui/Button'
import { Tag, List, ListItem } from '@/components/ui/data'
import { Row, PlannedPreview } from './general'

/*
 * 导航 + 反馈两个分类的示例。
 *
 * 这两类合在一个文件里，是因为它们经常配对出现：
 * 抽屉里放表单、下拉菜单里放操作、导入向导是「步骤条 + 进度条 + 结果页」。
 */

/* ================================================================== */
/* 导航                                                                */
/* ================================================================== */

/* ------------------------------------------------------------------ */
/* 标签页                                                              */
/* ------------------------------------------------------------------ */

export function TabsDemo() {
  const orderContent = (
    <List>
      {[
        { k: '订单号', v: 'XY20260214-0031' },
        { k: '客户', v: '小北' },
        { k: '服务项目', v: '主线 4-6 章' },
        { k: '金额', v: '¥286.00' },
      ].map((r) => (
        <ListItem key={r.k} extra={<span className="text-sm">{r.v}</span>}>
          <span className="text-sm text-muted-foreground">{r.k}</span>
        </ListItem>
      ))}
    </List>
  )

  const moneyContent = (
    <dl className="dd-spec max-w-sm">
      <dt>金额</dt><dd>¥286.00</dd>
      <dt>转出</dt><dd>¥0.00</dd>
      <dt>手续费（1.6%）</dt><dd>¥4.58</dd>
      <dt>到手</dt><dd>¥281.42</dd>
    </dl>
  )

  const logContent = (
    <List>
      <ListItem extra={<span className="text-xs text-muted-foreground">02-18 10:12</span>}>
        <span className="text-sm">店长确认完成</span>
      </ListItem>
      <ListItem extra={<span className="text-xs text-muted-foreground">02-17 21:04</span>}>
        <span className="text-sm">打手提交交付</span>
      </ListItem>
      <ListItem extra={<span className="text-xs text-muted-foreground">02-14 09:31</span>}>
        <span className="text-sm">新建订单</span>
      </ListItem>
    </List>
  )

  return (
    <div className="space-y-8">
      <div>
        <div className="text-xs font-medium text-muted-foreground mb-2">下划线式（默认）</div>
        <Tabs
          items={[
            { key: 'info', label: '基本信息', content: orderContent },
            { key: 'money', label: '金额明细', content: moneyContent },
            { key: 'log', label: '流转记录', content: logContent },
            { key: 'files', label: '附件', content: <p className="text-sm text-muted-foreground">暂无附件</p>, disabled: true },
          ]}
        />
      </div>

      <div>
        <div className="text-xs font-medium text-muted-foreground mb-2">胶囊式</div>
        <Tabs
          variant="pill"
          items={[
            { key: 'a', label: '全部', content: <p className="text-sm text-muted-foreground">全部订单（62）</p> },
            { key: 'b', label: '进行中', content: <p className="text-sm text-muted-foreground">进行中（14）</p> },
            { key: 'c', label: '已完成', content: <p className="text-sm text-muted-foreground">已完成（45）</p> },
            { key: 'd', label: '已退款', content: <p className="text-sm text-muted-foreground">已退款（3）</p> },
          ]}
        />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 侧边栏 / 标题栏（说明型）                                            */
/* ------------------------------------------------------------------ */

export function SidebarDemo() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
        <div className="flex gap-4">
          {/* 展开态 */}
          <div className="w-56 rounded-lg border border-border bg-card p-3 space-y-1">
            <div className="text-[10px] text-muted-foreground mb-1">展开 256px</div>
            {[
              { Icon: Home, label: '概览', active: false },
              { Icon: Boxes, label: '组件预览', active: true },
              { Icon: Settings, label: '设置', active: false },
            ].map((it) => (
              <div
                key={it.label}
                className={
                  it.active
                    ? 'flex items-center gap-3 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium'
                    : 'flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground text-sm'
                }
              >
                <it.Icon size={18} />
                {it.label}
              </div>
            ))}
          </div>

          {/* 折叠态 */}
          <div className="w-16 rounded-lg border border-border bg-card p-3 space-y-1 flex flex-col items-center">
            <div className="text-[10px] text-muted-foreground mb-1 text-center leading-tight">
              折叠
              <br />
              64px
            </div>
            <div className="p-2 rounded-lg text-muted-foreground"><Home size={18} /></div>
            <div className="p-2 rounded-lg bg-primary text-primary-foreground"><Boxes size={18} /></div>
            <div className="p-2 rounded-lg text-muted-foreground"><Settings size={18} /></div>
          </div>
        </div>

        <dl className="flex-1 min-w-[260px] dd-spec content-start">
          <dt>折叠宽度</dt><dd>256px → 64px</dd>
          <dt>折叠触发</dt><dd>点顶部品牌区，或按 Esc</dd>
          <dt>折叠时</dt><dd>文字淡出、图标保留、悬浮出右侧提示</dd>
          <dt>记忆</dt><dd>折叠状态存 localStorage，重启保留</dd>
          <dt>选中项</dt><dd>主色实心胶囊；悬停项浅灰底</dd>
        </dl>
      </div>
    </div>
  )
}

export function TitleBarDemo() {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="h-[52px] bg-card/92 backdrop-blur-xl border-b border-border/80 flex items-center px-3 gap-3 relative">
          <div className="text-sm font-bold text-primary shrink-0">星笺</div>

          {/* 居中搜索触发器 —— 绝对定位到窗口正中 */}
          <div className="absolute left-1/2 -translate-x-1/2 w-96 max-w-[50%]">
            <div className="h-9 rounded-lg bg-secondary/60 border border-border flex items-center gap-2 px-3 text-sm text-muted-foreground">
              <Filter size={14} />
              搜索订单、客户、打手…
              <kbd className="ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded border border-border">Ctrl K</kbd>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-1 shrink-0">
            <span className="p-2 rounded-md text-muted-foreground"><Info size={16} /></span>
            <span className="p-2 rounded-md text-muted-foreground"><ExternalLink size={16} /></span>
            <span className="p-2 rounded-md text-muted-foreground"><ArrowUp size={16} /></span>
            <span className="w-px h-4 bg-border mx-1" />
            {/* 窗口按钮 */}
            {['—', '□', '×'].map((g) => (
              <span key={g} className="w-8 h-6 flex items-center justify-center text-xs text-muted-foreground">{g}</span>
            ))}
          </div>
        </div>
      </div>

      <dl className="dd-spec">
        <dt>高度</dt><dd>52px，玻璃拟态底 + 下边框</dd>
        <dt>拖动</dt><dd>整条是 Electron 的 -webkit-app-region: drag</dd>
        <dt>可点元素</dt><dd>必须加 no-drag，否则点不动、也不能选中文字</dd>
        <dt>搜索按钮</dt><dd>固定居中于窗口（left-1/2 -translate-x-1/2），不是居中于剩余空间</dd>
      </dl>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 面包屑                                                              */
/* ------------------------------------------------------------------ */

export function BreadcrumbDemo() {
  const [last, setLast] = useState('XY20260214-0031')
  return (
    <div className="space-y-5">
      <Row label="基本">
        <Breadcrumb
          items={[
            { label: '订单', onClick: () => setLast('订单列表') },
            { label: '闲鱼', onClick: () => setLast('闲鱼') },
            { label: last },
          ]}
        />
      </Row>

      <Row label="只显示路径（首页 → 当前页）">
        <Breadcrumb
          items={[
            { label: '首页', onClick: () => setLast('首页') },
            { label: '收支分析', onClick: () => setLast('收支分析') },
            { label: '2026 年 2 月' },
          ]}
        />
      </Row>

      <p className="dd-help">
        当前点到了：<code className="px-1 rounded bg-secondary font-mono">{last}</code>
        （中间那几节可点，最后一节是当前页、不可点）
      </p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 下拉菜单                                                            */
/* ------------------------------------------------------------------ */

export function DropdownDemo() {
  const [picked, setPicked] = useState<string | null>(null)
  return (
    <div className="space-y-5">
      <Row label="订单行的「⋯」操作菜单">
        <Dropdown
          onSelect={setPicked}
          trigger={<Button variant="secondary" size="sm" icon={Settings}>操作</Button>}
          items={[
            { key: 'view', label: '查看详情', icon: ExternalLink },
            { key: 'edit', label: '编辑', icon: Pencil, shortcut: 'E' },
            { key: 'copy', label: '复制订单号', icon: Copy },
            { key: 'sep1', label: '', type: 'divider' },
            { key: 'assign', label: '指派打手', icon: Users },
            { key: 'label1', label: '导入导出', type: 'label' },
            { key: 'import', label: '从 Excel 导入', icon: Upload },
            { key: 'export', label: '导出为 Excel', icon: Download },
            { key: 'sep2', label: '', type: 'divider' },
            { key: 'delete', label: '删除订单', icon: Trash2, danger: true },
            { key: 'archive', label: '归档（无权限）', icon: Boxes, disabled: true },
          ]}
        />
        <span className="text-xs text-muted-foreground">
          按 Esc 或点外面关掉
        </span>
      </Row>

      <Row label="对齐到右边缘">
        <div className="w-64 flex justify-end">
          <Dropdown
            align="end"
            onSelect={setPicked}
            trigger={<Button variant="ghost" size="sm" icon={Settings} iconOnly aria-label="更多" />}
            items={[
              { key: 'a', label: '刷新', icon: Share2 },
              { key: 'b', label: '导出', icon: Download },
            ]}
          />
        </div>
      </Row>

      {picked && (
        <p className="dd-help">
          选了：<code className="px-1 rounded bg-secondary font-mono">{picked}</code>
        </p>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 分页                                                                */
/* ------------------------------------------------------------------ */

export function PaginationDemo() {
  const [page1, setPage1] = useState(1)
  const [page2, setPage2] = useState(7)
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="text-xs font-medium text-muted-foreground">
          62 条 · 每页 20 → 4 页（页数少，全部列出）
        </div>
        <Pagination total={62} page={page1} pageSize={20} onChange={setPage1} />
      </div>

      <div className="space-y-2">
        <div className="text-xs font-medium text-muted-foreground">
          1286 条 · 每页 20 → 65 页（中间自动省略）
        </div>
        <Pagination total={1286} page={page2} pageSize={20} onChange={setPage2} />
      </div>

      <div className="space-y-2">
        <div className="text-xs font-medium text-muted-foreground">空数据</div>
        <Pagination total={0} page={1} pageSize={20} onChange={() => {}} />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 步骤条                                                              */
/* ------------------------------------------------------------------ */

export function StepsDemo() {
  const [step, setStep] = useState(1)
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <Row label="Excel 导入向导（点按钮推进）">
          <Button variant="secondary" size="sm" onClick={() => setStep((s) => Math.max(0, s - 1))}>上一步</Button>
          <Button variant="primary" size="sm" onClick={() => setStep((s) => Math.min(3, s + 1))}>下一步</Button>
        </Row>
        <Steps
          current={step}
          items={[
            { title: '选文件', desc: 'xlsx / csv' },
            { title: '校验表头', desc: '列名要对得上' },
            { title: '逐条确认', desc: '有问题的行单独处理' },
            { title: '写入', desc: '完成' },
          ]}
        />
      </div>

      <div>
        <div className="text-xs font-medium text-muted-foreground mb-3">竖向</div>
        <Steps
          direction="vertical"
          current={2}
          items={[
            { title: '读取文件', desc: '48.2 KB，识别到 128 行' },
            { title: '校验通过 121 行', desc: '跳过 7 行（表头重复 / 金额格式）' },
            { title: '正在写入…', desc: '已写入 84 / 121' },
            { title: '完成', desc: '等待中' },
          ]}
        />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 锚点                                                                */
/* ------------------------------------------------------------------ */

export function AnchorDemo() {
  const [active, setActive] = useState('orders')
  const sections = [
    { key: 'orders', label: '订单概览' },
    { key: 'money', label: '金额明细' },
    { key: 'fighters', label: '指派打手' },
    { key: 'logs', label: '流转记录' },
  ]
  return (
    <div className="grid gap-6 md:grid-cols-[160px_1fr]">
      <nav className="space-y-0.5">
        {sections.map((s) => (
          <button
            key={s.key}
            type="button"
            data-active={s.key === active}
            className="dd-index-link w-full text-left"
            onClick={() => setActive(s.key)}
          >
            {s.label}
          </button>
        ))}
      </nav>
      <div className="dd-card">
        <div className="dd-card__body">
          <div className="text-sm font-semibold text-foreground mb-1">
            {sections.find((s) => s.key === active)?.label}
          </div>
          <p className="text-sm text-muted-foreground">
            点左边切换，当前项会用品牌色 + 左侧竖条高亮。
            <strong className="text-foreground">本页左侧那条组件目录就是它的真实用法</strong>
            —— 只不过那边的高亮是跟着正文滚动自动算的（IntersectionObserver），
            不是靠点击。
          </p>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 抽屉 / 气泡卡片                                                      */
/* ------------------------------------------------------------------ */

export function DrawerDemo() {
  const [open, setOpen] = useState(false)
  const [placement, setPlacement] = useState<'right' | 'left'>('right')

  return (
    <div className="space-y-5">
      <Row label="从哪边滑出">
        <Button
          variant="primary"
          icon={LayoutDashboard}
          onClick={() => {
            setPlacement('right')
            setOpen(true)
          }}
        >
          右侧抽屉（详情）
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            setPlacement('left')
            setOpen(true)
          }}
        >
          左侧抽屉
        </Button>
      </Row>

      <Drawer
        isOpen={open}
        onClose={() => setOpen(false)}
        placement={placement}
        title="订单详情 · XY20260214-0031"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>取消</Button>
            <Button variant="primary" onClick={() => setOpen(false)}>保存</Button>
          </>
        }
      >
        <div className="space-y-5">
          <dl className="dd-spec">
            <dt>客户</dt><dd>小北</dd>
            <dt>服务项目</dt><dd>主线 4-6 章</dd>
            <dt>渠道</dt><dd>闲鱼 · 1.6%</dd>
            <dt>金额</dt><dd>¥286.00</dd>
            <dt>到手</dt><dd>¥281.42</dd>
            <dt>打手</dt><dd>阿凯</dd>
          </dl>
          <div className="dd-alert dd-alert--info">
            <span className="dd-alert__icon"><Info size={16} /></span>
            <div>
              <div className="dd-alert__title">抽屉比弹窗宽敞</div>
              <div className="dd-alert__desc">
                详情和编辑表单放这里，一屏能装下更多字段，也不用担心遮住列表。
                按 Esc 或点遮罩关闭。
              </div>
            </div>
          </div>
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-2">抽屉里可以直接放表单</div>
            <div className="space-y-3">
              <input className="dd-control" placeholder="订单备注" defaultValue="客户要求周日前打完" />
              <input className="dd-control" placeholder="指派打手" defaultValue="阿凯" />
            </div>
          </div>
        </div>
      </Drawer>
    </div>
  )
}

export function PopoverDemo() {
  return (
    <Row label="点触发元素弹出一个自由浮层">
      <Popover
        title="手续费怎么算"
        trigger={<Button variant="secondary" size="sm" icon={Info}>费率说明</Button>}
        content={
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>手续费 = 金额 × 渠道费率。</p>
            <p><strong className="text-foreground">按全额算，不按到手算。</strong></p>
            <dl className="dd-spec pt-1">
              <dt>微信</dt><dd>0%</dd>
              <dt>闲鱼</dt><dd>1.6%</dd>
            </dl>
          </div>
        }
      />

      <Popover
        trigger={<Button variant="ghost" size="sm" icon={Users}>参与打手</Button>}
        content={
          <List>
            <ListItem><span className="text-sm">阿凯</span></ListItem>
            <ListItem><span className="text-sm">小北</span></ListItem>
            <ListItem><span className="text-sm">橙子</span></ListItem>
          </List>
        }
      />

      <Popover
        align="end"
        trigger={<Button variant="secondary" size="sm" icon={Filter}>快捷筛选</Button>}
        content={
          <div className="space-y-2">
            <div className="text-sm font-semibold text-foreground">时间范围</div>
            <div className="flex flex-wrap gap-2">
              {['今天', '本周', '本月', '全部'].map((t) => (
                <Tag key={t} tone="brand">{t}</Tag>
              ))}
            </div>
          </div>
        }
      />
    </Row>
  )
}

/* ------------------------------------------------------------------ */
/* 回到顶部                                                            */
/* ------------------------------------------------------------------ */

export function BackToTopDemo() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  return (
    <div className="space-y-4">
      <div className="relative">
        <div
          ref={scrollRef}
          onScroll={() => setVisible((scrollRef.current?.scrollTop ?? 0) > 300)}
          className="h-56 overflow-y-auto rounded-lg border border-border bg-background p-4 custom-scrollbar"
        >
          <div className="space-y-3">
            <div className="text-sm font-semibold text-foreground sticky top-0 bg-background pb-2">
              在里面滚我（滚过 300px 就会「出现」按钮）
            </div>
            {Array.from({ length: 20 }, (_, i) => (
              <div key={i} className="text-sm text-muted-foreground py-2 border-b border-border">
                第 {i + 1} 行 —— 这里塞订单，往下滚
              </div>
            ))}
          </div>
        </div>

        {/*
          ⚠️ 这里**没有**真的挂一个 BackToTop。
          原因是 BackToTop 内部用的是 position: fixed —— 它一旦挂载，
          按钮会出现在**整个窗口**的右下角，而不是这个小框里。
          真挂上去的话，这个展示页会凭空多出一个浮在页面上的按钮。

          所以下面这个按钮是手写的、absolute 定位在演示框里的模拟版本，
          只负责把「什么时候出现」这件事演出来。真正的 BackToTop
          由页面自己挂在内容区滚动容器上（本页就在左下角那个）。
        */}
        {visible && (
          <button
            type="button"
            aria-label="回到顶部"
            onClick={() => scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
            className="absolute bottom-4 right-4 dd-float-btn dd-float-btn--brand"
          >
            <ArrowUp size={18} />
          </button>
        )}
      </div>

      <Row label="按钮本身长这样（静态版，方便看清两种样式）">
        <FloatButton icon={ArrowUp} label="回到顶部（品牌色）" brand />
        <FloatButton icon={ArrowUp} label="回到顶部（描边）" />
      </Row>

      <dl className="dd-spec">
        <dt>触发阈值</dt><dd>滚动位置 &gt; 300px 才出现</dd>
        <dt>位置</dt><dd>position: fixed，窗口右下角 32px</dd>
        <dt>⚠️ 注意</dt><dd>
          因为它是 fixed，**挂载即出现在窗口角落**。要挂在某个小容器里的话，
          得自己写 absolute 版本（上面演示框里那个就是）。
        </dd>
        <dt>真身在哪</dt><dd>本页左下角那个圆形按钮，挂在内容区滚动容器上</dd>
      </dl>
    </div>
  )
}

/* ================================================================== */
/* 反馈                                                                */
/* ================================================================== */

/* ------------------------------------------------------------------ */
/* 进度条 / 加载动画                                                    */
/* ------------------------------------------------------------------ */

export function ProgressDemo() {
  const [v, setV] = useState(64)
  return (
    <div className="space-y-6 max-w-lg">
      <Row label="四档语义色">
        <div className="w-full space-y-3">
          <Progress value={35} tone="brand" showLabel />
          <Progress value={65} tone="success" showLabel />
          <Progress value={80} tone="warning" showLabel />
          <Progress value={20} tone="danger" showLabel />
        </div>
      </Row>

      <Row label="斜纹（表示「还在跑，进度会变」）">
        <div className="w-full">
          <Progress value={v} striped showLabel />
        </div>
      </Row>

      <Row label="可控（模拟导入）">
        <input type="range" className="dd-slider w-full" min={0} max={100} value={v} onChange={(e) => setV(Number(e.target.value))} />
      </Row>

      <div className="dd-card">
        <div className="dd-card__body space-y-3">
          <div className="text-sm font-semibold text-foreground">导入中的样子</div>
          <Progress value={v} striped showLabel />
          <div className="text-xs text-muted-foreground">
            正在写入第 {Math.round((v / 100) * 121)} / 121 条…
          </div>
        </div>
      </div>
    </div>
  )
}

export function SpinDemo() {
  const [overlay, setOverlay] = useState(false)
  return (
    <div className="space-y-6 max-w-lg">
      <Row label="三档尺寸">
        <Spin size="sm" />
        <Spin size="md" />
        <Spin size="lg" />
      </Row>

      <Row label="带文字">
        <Spin size="md" label="正在对账…" />
      </Row>

      <Row label="区块遮罩（SpinOverlay）">
        <div className="relative w-full rounded-lg border border-border p-4 space-y-2 overflow-hidden">
          <div className="text-sm text-foreground">订单详情</div>
          <div className="h-4 rounded bg-secondary w-3/4" />
          <div className="h-4 rounded bg-secondary w-1/2" />
          {overlay && <SpinOverlay label="保存中…" />}
          <Button variant="secondary" size="sm" onClick={() => setOverlay((x) => !x)}>
            {overlay ? '停止' : '模拟保存（盖一层遮罩）'}
          </Button>
        </div>
      </Row>
    </div>
  )
}

/* ================================================================== */
/* 计划中的导航件                                                      */
/* ================================================================== */

function mockMenu() {
  return (
    <div className="w-60 rounded-lg border border-border bg-card p-2 space-y-0.5">
      <div className="text-[10px] font-semibold text-muted-foreground px-3 py-1">订单管理</div>
      {[
        { label: '全部订单', active: true, count: 62 },
        { label: '进行中', active: false, count: 14 },
        { label: '待交付', active: false, count: 5 },
      ].map((it) => (
        <div
          key={it.label}
          className={
            it.active
              ? 'flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm'
              : 'flex items-center gap-2 px-3 py-2 rounded-lg text-muted-foreground text-sm'
          }
        >
          <ListOrdered size={16} />
          <span className="flex-1">{it.label}</span>
          <span className="text-[10px] tabular-nums opacity-80">{it.count}</span>
        </div>
      ))}
      <div className="text-[10px] font-semibold text-muted-foreground px-3 py-1 pt-2">数据</div>
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-muted-foreground text-sm">
        <BarChart3 size={16} />
        <span className="flex-1">收支分析</span>
      </div>
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-muted-foreground text-sm">
        <Users size={16} />
        <span className="flex-1">打手管理</span>
      </div>
    </div>
  )
}

function mockFloatButtonGroup() {
  return (
    <div className="flex items-center gap-4">
      <div className="flex flex-col gap-2">
        <FloatButton icon={ArrowUp} label="回到顶部" />
        <FloatButton icon={Plus} label="新建订单" brand />
      </div>
      <div className="text-xs text-muted-foreground max-w-[220px]">
        点一下展开成一组（回到顶部 / 新建 / 导出），再点收起。
      </div>
    </div>
  )
}

const NAV_PLANNED_MOCKS: Record<string, { title: string; mock: ReactNode; note?: string }> = {
  'c-menu': {
    title: '菜单 · 计划中',
    mock: mockMenu(),
    note: '带分组标题和右侧计数。侧栏从三项长到十几个的时候换它，外观不变。',
  },
  'c-floatbutton': {
    title: '悬浮按钮 · 计划中',
    mock: mockFloatButtonGroup(),
    note: '订单列表右下角的「新建订单」。',
  },
}

export function NavPlannedMock({ id }: { id: string }) {
  const cfg = NAV_PLANNED_MOCKS[id]
  if (!cfg) return null
  return <PlannedPreview title={cfg.title} mock={cfg.mock} note={cfg.note} />
}

export const NAV_DEMOS: Record<string, ComponentType> = {
  'c-tabs': TabsDemo,
  'c-sidebar': SidebarDemo,
  'c-titlebar': TitleBarDemo,
  'c-breadcrumb': BreadcrumbDemo,
  'c-dropdown': DropdownDemo,
  'c-pagination': PaginationDemo,
  'c-steps': StepsDemo,
  'c-anchor': AnchorDemo,
  'c-drawer': DrawerDemo,
  'c-popover': PopoverDemo,
  'c-backtotop': BackToTopDemo,
}

/* ================================================================== */
/* 反馈里「计划中」的                                                   */
/* ================================================================== */

function mockLoadingBar() {
  return (
    <div className="w-full max-w-md rounded-lg border border-border overflow-hidden">
      <div className="h-0.5 bg-brand" style={{ width: '62%' }} />
      <div className="p-3 text-xs text-muted-foreground space-y-1">
        <div className="text-sm text-foreground">正在导入 2026-02 订单.xlsx</div>
        <div>已写入 76 / 121 条，可以继续操作别的</div>
      </div>
    </div>
  )
}

function mockDialog() {
  return (
    <div className="w-full max-w-sm rounded-lg border border-border bg-card shadow-2 overflow-hidden">
      <div className="px-5 py-4 flex items-start gap-3">
        <span className="text-[rgb(var(--warning-rgb))] shrink-0 mt-0.5">
          <AlertTriangle size={20} />
        </span>
        <div>
          <div className="text-sm font-semibold text-foreground">这两个客户是同一个吗？</div>
          <div className="text-xs text-muted-foreground mt-1">
            「小北」和「小 北」各有一笔未结订单，手机号相同。
            合并会保留 3 条联系方式、2 笔订单。此操作不可撤销。
          </div>
        </div>
      </div>
      <div className="px-5 py-3 bg-secondary/40 flex justify-end gap-2 border-t border-border">
        <Button variant="ghost" size="sm">先不合并</Button>
        <Button variant="danger" size="sm">合并</Button>
      </div>
    </div>
  )
}

function mockInfiniteScroll() {
  return (
    <div className="w-full max-w-md space-y-2">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-xs">
          <span className="font-mono">XY202602{10 - i}-00{20 + i}</span>
          <span className="text-muted-foreground">小北 · ¥286.00</span>
        </div>
      ))}
      <div className="flex items-center justify-center gap-2 py-3 text-xs text-muted-foreground border-t border-dashed border-border">
        <span className="dd-spin dd-spin--sm" />
        滚动到底自动加载下一批
      </div>
    </div>
  )
}

const FB_PLANNED_MOCKS: Record<string, { title: string; mock: ReactNode; note?: string }> = {
  'c-loadingbar': {
    title: '加载条 · 计划中',
    mock: mockLoadingBar(),
    note: '窗口顶上一道细线，不挡操作。导入大批量数据时比遮罩友好。',
  },
  'c-dialog': {
    title: '命令式对话框 · 计划中',
    mock: mockDialog(),
    note: '「合并客户前必须弹窗问」是产品定义里的硬要求。这种中途冒出来问一句的场景，命令式比维护 isOpen 状态干净。',
  },
  'c-infinitescroll': {
    title: '无限滚动 · 计划中',
    mock: mockInfiniteScroll(),
    note: '数据量大之后替代分页。一期数据只在本设备、量不大，先不着急。',
  },
}

export function FeedbackPlannedMock({ id }: { id: string }) {
  const cfg = FB_PLANNED_MOCKS[id]
  if (!cfg) return null
  return <PlannedPreview title={cfg.title} mock={cfg.mock} note={cfg.note} />
}

/** 反馈分类里「已实现」的映射（Tab/Steps 等在上面 NAV_DEMOS 里） */
export const FEEDBACK_DEMOS: Record<string, ComponentType> = {
  'c-progress': ProgressDemo,
  'c-spin': SpinDemo,
}
