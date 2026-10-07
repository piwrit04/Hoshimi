import { useState, type ComponentType, type ReactNode } from 'react'
import {
  CheckCircle2,
  ChevronRight,
  FileSpreadsheet,
  Flag,
  Inbox,
  RefreshCw,
  Trash2,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import {
  Avatar,
  AvatarGroup,
  Badge,
  Collapse,
  DataTable,
  Descriptions,
  DiffBar,
  Ellipsis,
  EmptyState,
  List,
  ListItem,
  Skeleton,
  SkeletonCard,
  Statistic,
  Tag,
  Timeline,
  Tree,
  type DataTableColumn,
  type SemanticTone,
} from '@/components/ui/data'
import { Button } from '@/components/ui/Button'
import { Tooltip } from '@/components/ui/Tooltip'
import { Row, PlannedPreview } from './general'

/*
 * 数据展示分类的示例。
 * 订单表格、状态标签、收支统计都在这一组。
 */

/* ------------------------------------------------------------------ */
/* 一份贯穿全组的假订单数据                                             */
/* ------------------------------------------------------------------ */

type Order = {
  no: string
  customer: string
  service: string
  channel: 'wechat' | 'xianyu'
  amountCents: number
  status: 'doing' | 'review' | 'done' | 'refunded'
  fighter: string
  due: string
}

const STATUS_META: Record<Order['status'], { label: string; tone: SemanticTone }> = {
  doing: { label: '进行中', tone: 'info' },
  review: { label: '待交付', tone: 'warning' },
  done: { label: '已完成', tone: 'success' },
  refunded: { label: '已退款', tone: 'danger' },
}

const CHANNEL_META: Record<Order['channel'], { label: string; rate: number }> = {
  wechat: { label: '微信', rate: 0 },
  xianyu: { label: '闲鱼', rate: 1.6 },
}

const ORDERS: Order[] = [
  { no: 'XY20260214-0031', customer: '小北', service: '主线 4-6 章', channel: 'xianyu', amountCents: 28600, status: 'doing', fighter: '阿凯', due: '02-20' },
  { no: 'WX20260214-0032', customer: '橙子', service: '深渊满星', channel: 'wechat', amountCents: 52000, status: 'review', fighter: '小北', due: '02-18' },
  { no: 'XY20260213-0029', customer: '阿凯', service: '日常代肝 ×7', channel: 'xianyu', amountCents: 12800, status: 'done', fighter: '橙子', due: '02-15' },
  { no: 'XY20260212-0027', customer: '老周', service: '周本 ×3', channel: 'xianyu', amountCents: 8800, status: 'done', fighter: '芋圆', due: '02-14' },
  { no: 'WX20260212-0026', customer: '芋圆', service: '账号托管 30 天', channel: 'wechat', amountCents: 30000, status: 'refunded', fighter: '阿凯', due: '—' },
  { no: 'XY20260211-0024', customer: '小北', service: '材料代刷', channel: 'xianyu', amountCents: 4600, status: 'done', fighter: '老周', due: '02-13' },
]

/** 分 → 人民币显示。展示层唯一的换算点。 */
function yuan(cents: number) {
  return (cents / 100).toLocaleString('zh-CN', { minimumFractionDigits: 2 })
}

/** 手续费（分）。按全额算，不按到手算。 */
function feeCents(o: Order) {
  return Math.round((o.amountCents * CHANNEL_META[o.channel].rate) / 100)
}

/* ------------------------------------------------------------------ */
/* 数据表                                                              */
/* ------------------------------------------------------------------ */

export function DataTableDemo() {
  const [selected, setSelected] = useState<string[]>([])
  const [clicked, setClicked] = useState<string | null>(null)

  const columns: DataTableColumn<Order>[] = [
    {
      key: 'no',
      title: '订单号',
      width: '170px',
      sortable: true,
      render: (o) => <span className="font-mono text-xs">{o.no}</span>,
    },
    { key: 'customer', title: '客户', width: '90px', sortable: true },
    { key: 'service', title: '服务项目', render: (o) => <Ellipsis className="max-w-[140px]">{o.service}</Ellipsis> },
    {
      key: 'channel',
      title: '渠道',
      width: '100px',
      render: (o) => (
        <Tag tone={o.channel === 'xianyu' ? 'warning' : 'default'}>
          {CHANNEL_META[o.channel].label} · {CHANNEL_META[o.channel].rate}%
        </Tag>
      ),
    },
    {
      key: 'amountCents',
      title: '金额',
      width: '120px',
      align: 'right',
      sortable: true,
      render: (o) => <span className="tabular-nums font-semibold">¥{yuan(o.amountCents)}</span>,
    },
    {
      key: 'feeCents',
      title: '手续费',
      width: '100px',
      align: 'right',
      render: (o) => (
        <span className="tabular-nums text-muted-foreground">
          {feeCents(o) === 0 ? '—' : `¥${yuan(feeCents(o))}`}
        </span>
      ),
    },
    { key: 'fighter', title: '打手', width: '80px' },
    {
      key: 'status',
      title: '状态',
      width: '96px',
      render: (o) => <Tag tone={STATUS_META[o.status].tone}>{STATUS_META[o.status].label}</Tag>,
    },
    { key: 'due', title: '托管到期', width: '96px', align: 'center' },
    {
      key: 'ops',
      title: '操作',
      width: '92px',
      render: (o) => (
        <span className="inline-flex gap-1">
          <Tooltip content={`查看 ${o.no}`} position="top">
            <Button variant="ghost" size="sm" icon={ChevronRight} iconOnly aria-label="查看" />
          </Tooltip>
          <Tooltip content="删除" position="top">
            <Button
              variant="ghost"
              size="sm"
              icon={Trash2}
              iconOnly
              aria-label="删除"
              className="!text-[rgb(var(--danger-rgb))]"
            />
          </Tooltip>
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Tag tone="brand">共 {ORDERS.length} 单</Tag>
        {selected.length > 0 && <Tag tone="info">已选 {selected.length} 单</Tag>}
        {clicked && <Tag tone="success">刚点了 {clicked}</Tag>}
        <span className="text-xs text-muted-foreground">
          点表头「订单号 / 客户 / 金额」可排序；点整行会回显；最左列可勾选
        </span>
      </div>

      <DataTable
        columns={columns}
        data={ORDERS}
        rowKey={(o) => o.no}
        selectedKeys={selected}
        onSelectedKeysChange={setSelected}
        onRowClick={(o) => setClicked(o.no)}
        striped
      />

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <div className="text-xs font-medium text-muted-foreground mb-2">紧凑行高（compact）</div>
          <DataTable
            columns={[
              { key: 'no', title: '订单号', render: (o: Order) => <span className="font-mono text-xs">{o.no}</span> },
              { key: 'customer', title: '客户' },
              { key: 'status', title: '状态', render: (o: Order) => <Tag tone={STATUS_META[o.status].tone}>{STATUS_META[o.status].label}</Tag> },
            ]}
            data={ORDERS.slice(0, 3)}
            rowKey={(o) => o.no}
            compact
          />
        </div>

        <div>
          <div className="text-xs font-medium text-muted-foreground mb-2">空数据 / 加载中</div>
          <DataTable
            columns={[
              { key: 'no', title: '订单号' },
              { key: 'customer', title: '客户' },
            ]}
            data={[]}
            rowKey={(o: Order) => o.no}
            empty={
              <EmptyState
                compact
                title="这个筛选条件下没有订单"
                description="试试把时间范围放宽，或者清掉渠道筛选。"
                action={<Button variant="secondary" size="sm" icon={RefreshCw}>重置筛选</Button>}
              />
            }
          />
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 基础表格                                                            */
/* ------------------------------------------------------------------ */

export function TableDemo() {
  return (
    <div className="space-y-3">
      <div className="dd-table-wrap">
        <table className="dd-table">
          <thead>
            <tr>
              <th style={{ width: '40%' }}>项目</th>
              <th className="dd-table__num">金额</th>
              <th className="dd-table__num">占比</th>
            </tr>
          </thead>
          <tbody>
            {[
              { k: '服务收入', v: 128600, p: '82.4%' },
              { k: '转单支出', v: -18600, p: '11.9%' },
              { k: '平台手续费', v: -8900, p: '5.7%' },
            ].map((r) => (
              <tr key={r.k}>
                <td>{r.k}</td>
                <td className="dd-table__num">{r.v < 0 ? '−' : ''}¥{yuan(Math.abs(r.v))}</td>
                <td className="dd-table__num text-muted-foreground">{r.p}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td className="font-semibold">到手合计</td>
              <td className="dd-table__num font-bold">¥{yuan(128600 - 18600 - 8900)}</td>
              <td className="dd-table__num text-muted-foreground">100%</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="dd-help">
        基础表格不做排序、不做勾选，表头和单元格完全由调用方写。
        适合这种「一小张汇总表」，用 DataTable 反而要多写一堆列定义。
      </p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 标签 / 徽标 / 头像                                                   */
/* ------------------------------------------------------------------ */

export function TagDemo() {
  const [tags, setTags] = useState(['主线代打', '深渊满星', '日常代肝', '材料代刷'])
  return (
    <div className="space-y-5">
      <Row label="六种语义色">
        <Tag>默认</Tag>
        <Tag tone="brand">品牌</Tag>
        <Tag tone="success">已完成</Tag>
        <Tag tone="warning">托管中</Tag>
        <Tag tone="danger">已退款</Tag>
        <Tag tone="info">进行中</Tag>
      </Row>

      <Row label="可关闭">
        {tags.map((t) => (
          <Tag key={t} tone="brand" onClose={() => setTags((cur) => cur.filter((x) => x !== t))}>
            {t}
          </Tag>
        ))}
        {tags.length === 0 && (
          <Button variant="ghost" size="sm" onClick={() => setTags(['主线代打', '深渊满星'])}>
            恢复
          </Button>
        )}
      </Row>

      <Row label="小尺寸（列表里密集使用）">
        {['原神', '崩铁', '鸣潮', '绝区零'].map((g) => (
          <span key={g} className="dd-tag dd-tag--default !px-1.5 !text-[10px]">{g}</span>
        ))}
      </Row>

      <div className="dd-alert dd-alert--warning">
        <span className="dd-alert__icon"><Flag size={16} /></span>
        <div>
          <div className="dd-alert__title">语义色色相是锁死的</div>
          <div className="dd-alert__desc">
            「已完成」永远绿、「已退款」永远红，换主题色也不会变 ——
            否则退款看起来会像正常订单。
          </div>
        </div>
      </div>
    </div>
  )
}

export function BadgeDemo() {
  return (
    <Row label="数字角标 / 小红点">
      <Badge count={3}>
        <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-secondary">
          <Inbox size={18} className="text-foreground" />
        </span>
      </Badge>

      <Badge count={128}>
        <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-secondary">
          <Wallet size={18} className="text-foreground" />
        </span>
      </Badge>

      <Badge count={0}>
        <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-secondary">
          <CheckCircle2 size={18} className="text-foreground" />
        </span>
      </Badge>

      <Badge dot tone="warning">
        <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-secondary">
          <Flag size={18} className="text-foreground" />
        </span>
      </Badge>

      <Badge dot tone="success">
        <Avatar size="lg">凯</Avatar>
      </Badge>

      <span className="text-xs text-muted-foreground">
        128 → 显示 99+；count=0 不显示；dot 只是一颗小点
      </span>
    </Row>
  )
}

export function AvatarDemo() {
  return (
    <div className="space-y-5">
      <Row label="三档尺寸 + 形状">
        <Avatar size="sm">北</Avatar>
        <Avatar>凯</Avatar>
        <Avatar size="lg">橙</Avatar>
        <Avatar size="lg" square>周</Avatar>
      </Row>

      <Row label="叠堆（超过 4 个收成 +N）">
        <AvatarGroup
          items={[
            { name: '阿凯' },
            { name: '小北' },
            { name: '橙子' },
            { name: '老周' },
            { name: '芋圆' },
            { name: '小林' },
          ]}
        />
        <span className="text-xs text-muted-foreground">参与这单的打手</span>
      </Row>

      <Row label="配合文字（列表里的标准排法）">
        <div className="flex items-center gap-3">
          <Avatar size="lg">凯</Avatar>
          <div>
            <div className="text-sm font-semibold text-foreground">阿凯</div>
            <div className="text-xs text-muted-foreground">本月 18 单 · 平均 4.7 分</div>
          </div>
        </div>
      </Row>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 统计数值 / 描述列表 / 列表                                            */
/* ------------------------------------------------------------------ */

export function StatisticDemo() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="dd-card"><div className="dd-card__body">
        <Statistic label="本月到手" value={`¥${yuan(128600 - 18600 - 8900)}`} trend={12.4} trendLabel="较上月" tone="brand" />
      </div></div>
      <div className="dd-card"><div className="dd-card__body">
        <Statistic label="本月单量" value="62" suffix="单" trend={8} trendLabel="较上月" />
      </div></div>
      <div className="dd-card"><div className="dd-card__body">
        <Statistic label="平均每单" value={`¥${yuan(Math.round((128600 - 18600 - 8900) / 62))}`} />
      </div></div>
      <div className="dd-card"><div className="dd-card__body">
        <Statistic label="退款单量" value="3" suffix="单" trend={-2} trendLabel="较上月" tone="danger" />
      </div></div>

      <div className="sm:col-span-2 lg:col-span-4">
        <div className="dd-card"><div className="dd-card__body space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <TrendingUp size={16} className="text-brand" />
            近 7 天到手
          </div>
          <div className="flex items-end gap-2 h-24">
            {[42, 68, 35, 88, 54, 96, 72].map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                <div className="w-full rounded-t bg-brand transition-all" style={{ height: `${h}%` }} />
                <span className="text-[10px] text-muted-foreground">周{['一', '二', '三', '四', '五', '六', '日'][i]}</span>
              </div>
            ))}
          </div>
        </div></div>
      </div>
    </div>
  )
}

export function DescriptionsDemo() {
  const o = ORDERS[0]
  return (
    <div className="space-y-5">
      <Descriptions
        items={[
          { label: '订单号', value: <span className="font-mono">{o.no}</span> },
          { label: '客户', value: o.customer },
          { label: '服务项目', value: o.service },
          {
            label: '渠道',
            value: (
              <Tag tone="warning">{CHANNEL_META[o.channel].label} · 费率 {CHANNEL_META[o.channel].rate}%</Tag>
            ),
          },
          { label: '金额', value: <span className="tabular-nums font-semibold">¥{yuan(o.amountCents)}</span> },
          {
            label: '手续费',
            value: (
              <span className="tabular-nums text-muted-foreground">
                ¥{yuan(feeCents(o))}（按全额算）
              </span>
            ),
          },
          { label: '指派打手', value: o.fighter },
          { label: '状态', value: <Tag tone={STATUS_META[o.status].tone}>{STATUS_META[o.status].label}</Tag> },
          { label: '托管到期', value: o.due },
          { label: '备注', value: <span className="text-muted-foreground">客户要求周日前打完主线 4-6 章，材料自备。</span> },
        ]}
      />

      <div className="dd-card">
        <div className="dd-card__body">
          <div className="text-xs font-semibold text-muted-foreground mb-3">这一单的钱去哪儿了</div>
          <DiffBar
            segments={[
              { value: feeCents(o), tone: 'warning', label: '手续费' },
              { value: o.amountCents - feeCents(o), tone: 'success', label: '到手' },
            ]}
          />
          <div className="flex items-center gap-4 mt-3 text-xs">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[rgb(var(--warning-rgb))]" />
              手续费 ¥{yuan(feeCents(o))}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[rgb(var(--success-rgb))]" />
              到手 ¥{yuan(o.amountCents - feeCents(o))}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export function ListDemo() {
  return (
    <div className="space-y-5 max-w-xl">
      <List>
        {ORDERS.slice(0, 4).map((o) => (
          <ListItem
            key={o.no}
            onClick={() => {}}
            extra={
              <span className="inline-flex items-center gap-2">
                <span className="tabular-nums font-semibold">¥{yuan(o.amountCents)}</span>
                <ChevronRight size={15} className="text-muted-foreground" />
              </span>
            }
          >
            <div className="flex items-center gap-2">
              <Tag tone={STATUS_META[o.status].tone}>{STATUS_META[o.status].label}</Tag>
              <span className="text-sm font-medium text-foreground">{o.customer}</span>
              <span className="text-xs text-muted-foreground">{o.service}</span>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5 font-mono">{o.no}</div>
          </ListItem>
        ))}
      </List>
      <p className="dd-help">整条可点（有 hover 底色和键盘支持），右侧 extra 放金额和箭头。</p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 时间线 / 折叠 / 树                                                   */
/* ------------------------------------------------------------------ */

export function TimelineDemo() {
  return (
    <div className="max-w-lg space-y-6">
      <Timeline
        items={[
          { title: '新建订单', time: '02-14 09:31', desc: '小北 · 咸鱼单 · ¥286.00', tone: 'brand' },
          { title: '指派给阿凯', time: '02-14 09:35', desc: '打手已确认接单', tone: 'info' },
          { title: '打手提交交付', time: '02-17 21:04', desc: '等待店长确认', tone: 'warning' },
          { title: '店长确认完成', time: '02-18 10:12', desc: '手续费 ¥4.58 已扣，到手 ¥281.42', tone: 'success' },
        ]}
      />

      <div>
        <div className="text-xs font-medium text-muted-foreground mb-2">带退款的分支</div>
        <Timeline
          items={[
            { title: '新建订单', time: '02-12 14:02', tone: 'brand' },
            { title: '客户申请退款', time: '02-12 16:40', desc: '原因：朋友已经帮打了', tone: 'danger' },
            { title: '已全额退款', time: '02-12 17:05', desc: '手续费不产生', tone: 'danger' },
          ]}
        />
      </div>
    </div>
  )
}

export function CollapseDemo() {
  return (
    <div className="max-w-2xl space-y-6">
      <Collapse
        defaultActiveKeys={['1']}
        items={[
          {
            key: '1',
            title: '这一单的钱怎么算的',
            content: (
              <dl className="dd-spec">
                <dt>订单金额</dt><dd>¥286.00</dd>
                <dt>转出</dt><dd>¥0.00</dd>
                <dt>手续费 = 金额 × 1.6%</dt><dd>¥4.58</dd>
                <dt>到手 = 金额 − 转出 − 手续费</dt><dd>¥281.42</dd>
              </dl>
            ),
          },
          {
            key: '2',
            title: '权限说明',
            content: '打手端是纯只读：看不到金额、看不到别人手机号全号、没有任何操作按钮。',
          },
          {
            key: '3',
            title: '这个订单的导入来源',
            content: (
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">来自 2026-02 订单.xlsx 第 18 行</div>
                <code className="block px-3 py-2 rounded bg-secondary text-xs font-mono text-foreground/80">
                  XY20260214-0031 | 小北 | 主线4-6章 | 286.00 | 闲鱼
                </code>
              </div>
            ),
          },
        ]}
      />

      <div>
        <div className="text-xs font-medium text-muted-foreground mb-2">手风琴（一次只开一个）</div>
        <Collapse
          accordion
          defaultActiveKeys={['a']}
          items={[
            { key: 'a', title: '本周流水', content: '¥1,286.00 · 12 单' },
            { key: 'b', title: '本周退款', content: '¥0.00 · 0 单' },
            { key: 'c', title: '本周新增客户', content: '3 位' },
          ]}
        />
      </div>
    </div>
  )
}

export function TreeDemo() {
  const [selected, setSelected] = useState('g1-3')
  return (
    <div className="max-w-md space-y-3">
      <Tree
        defaultExpandedKeys={['g1', 'g1-3']}
        selectedKey={selected}
        onSelect={setSelected}
        nodes={[
          {
            key: 'g1',
            label: '原神',
            children: [
              {
                key: 'g1-1',
                label: '主线代打',
                children: [
                  { key: 'g1-1-1', label: '1-3 章' },
                  { key: 'g1-1-2', label: '4-6 章' },
                ],
              },
              { key: 'g1-2', label: '深渊满星' },
              {
                key: 'g1-3',
                label: '日常代肝',
                children: [
                  { key: 'g1-3-1', label: '每日委托 ×7' },
                  { key: 'g1-3-2', label: '树脂清空 ×7' },
                ],
              },
            ],
          },
          {
            key: 'g2',
            label: '崩铁',
            children: [
              { key: 'g2-1', label: '忘却之庭' },
              { key: 'g2-2', label: '模拟宇宙' },
            ],
          },
          { key: 'g3', label: '鸣潮' },
        ]}
      />
      <p className="dd-help">
        当前选中：<code className="px-1 rounded bg-secondary font-mono">{selected}</code>
        （点节点可选中；有子级的会同时展开收起）
      </p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 空状态 / 骨架屏 / 差异条 / 省略                                       */
/* ------------------------------------------------------------------ */

export function EmptyDemo() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="dd-card"><div className="dd-card__body">
        <EmptyState title="还没有订单" description="新建一单，或者从 Excel 导入历史订单。" action={<Button variant="primary" size="sm" icon={FileSpreadsheet}>导入 Excel</Button>} />
      </div></div>
      <div className="dd-card"><div className="dd-card__body">
        <EmptyState title="筛不出结果" description="当前条件：闲鱼 · 已退款 · 本周" action={<Button variant="secondary" size="sm" icon={RefreshCw}>清空筛选</Button>} />
      </div></div>
      <div className="dd-card"><div className="dd-card__body">
        <EmptyState title="还没有打手" description="去设置里加一个，才能派单。" />
      </div></div>
    </div>
  )
}

export function SkeletonDemo() {
  const [loading, setLoading] = useState(true)
  return (
    <div className="space-y-5 max-w-xl">
      <Row label="切换看真实列表和骨架屏">
        <Button variant="secondary" size="sm" icon={RefreshCw} onClick={() => setLoading((v) => !v)}>
          {loading ? '显示内容' : '显示骨架屏'}
        </Button>
      </Row>

      {loading ? (
        <div className="space-y-4">
          <SkeletonCard lines={3} />
          <SkeletonCard lines={2} />
        </div>
      ) : (
        <List>
          {ORDERS.slice(0, 2).map((o) => (
            <ListItem key={o.no}>
              <div className="text-sm font-medium text-foreground">{o.customer} · {o.service}</div>
              <div className="text-xs text-muted-foreground font-mono">{o.no}</div>
            </ListItem>
          ))}
        </List>
      )}

      <div>
        <div className="text-xs font-medium text-muted-foreground mb-2">基础零件</div>
        <div className="space-y-2">
          <Skeleton width="100%" />
          <Skeleton width="80%" />
          <Skeleton width="60%" />
          <Skeleton width={40} height={40} radius="50%" />
          <Skeleton width="100%" height={80} radius={8} />
        </div>
      </div>
    </div>
  )
}

export function DiffBarDemo() {
  const [transfer, setTransfer] = useState(5000)
  const amount = 28600
  const fee = Math.round((amount * 1.6) / 100)
  const net = amount - transfer - fee

  return (
    <div className="space-y-5 max-w-xl">
      <DiffBar
        segments={[
          { value: transfer, tone: 'muted', label: '转出' },
          { value: fee, tone: 'warning', label: '手续费' },
          { value: net, tone: 'success', label: '到手' },
        ]}
      />

      <div className="flex items-center gap-4 text-xs flex-wrap">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-[rgb(var(--accent-soft-rgb))]" />
          转出 ¥{yuan(transfer)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-[rgb(var(--warning-rgb))]" />
          手续费 ¥{yuan(fee)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-[rgb(var(--success-rgb))]" />
          到手 ¥{yuan(net)}
        </span>
      </div>

      <div>
        <div className="text-xs font-medium text-muted-foreground mb-2">
          拖动转出金额，看这三段怎么分（金额 ¥{yuan(amount)} 固定）
        </div>
        <input
          type="range"
          className="dd-slider w-full"
          min={0}
          max={amount - fee}
          step={100}
          value={transfer}
          onChange={(e) => setTransfer(Number(e.target.value))}
        />
        <dl className="dd-spec mt-3">
          <dt>金额</dt><dd>¥{yuan(amount)}</dd>
          <dt>转出</dt><dd>¥{yuan(transfer)}</dd>
          <dt>手续费（按全额算）</dt><dd>¥{yuan(fee)}</dd>
          <dt>到手</dt><dd>¥{yuan(net)}</dd>
        </dl>
      </div>
    </div>
  )
}

export function EllipsisDemo() {
  return (
    <div className="space-y-4 max-w-sm">
      <Row label="超长文本截断，悬浮看全文">
        <Ellipsis>
          客户要求周日前打完主线 4-6 章，材料自备，中途不要动圣遗物，打完截图发我
        </Ellipsis>
      </Row>
      <div className="w-40">
        <div className="text-xs text-muted-foreground mb-1">限制在 160px 宽里</div>
        <Ellipsis>这是一个很长很长的服务项目名称需要被截断</Ellipsis>
      </div>
      <dl className="dd-spec">
        <dt>实现</dt>
        <dd>text-overflow: ellipsis; white-space: nowrap; overflow: hidden</dd>
        <dt>注意</dt>
        <dd>表格单元格里用它必须给列宽，否则永远不会触发截断</dd>
      </dl>
    </div>
  )
}

/* ================================================================== */
/* 计划中的展示件                                                      */
/* ================================================================== */

function mockNumberAnimation() {
  return (
    <div className="dd-stat">
      <span className="dd-stat__label">本月到手（滚动中）</span>
      <span className="dd-stat__value dd-stat__value--brand tabular-nums">¥ 8,420.00</span>
      <span className="text-xs text-muted-foreground">从 ¥7,986.00 滚过来，约 0.6 秒</span>
    </div>
  )
}

function mockCarousel() {
  return (
    <div className="w-full max-w-sm">
      <div className="h-40 rounded-lg border border-border bg-secondary flex items-center justify-center text-muted-foreground text-xs">
        第 1 / 3 张 · 交付截图
      </div>
      <div className="flex items-center justify-center gap-1.5 mt-2">
        <span className="w-4 h-1 rounded-full bg-brand" />
        <span className="w-1 h-1 rounded-full bg-border" />
        <span className="w-1 h-1 rounded-full bg-border" />
      </div>
    </div>
  )
}

function mockCalendar() {
  return (
    <div className="w-full max-w-md rounded-lg border border-border p-3">
      <div className="text-xs font-semibold text-foreground mb-2">2026 年 2 月</div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => {
          const hasDue = [3, 8, 14, 20, 26].includes(d)
          return (
            <div
              key={d}
              className="aspect-square rounded-md border border-transparent flex flex-col items-center justify-center text-[10px] text-foreground relative"
            >
              {d}
              {hasDue && (
                <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-[rgb(var(--warning-rgb))]" />
              )}
            </div>
          )
        })}
      </div>
      <div className="flex items-center gap-1.5 mt-2 text-[10px] text-muted-foreground">
        <span className="w-1.5 h-1.5 rounded-full bg-[rgb(var(--warning-rgb))]" />
        那天有单托管到期（5 天）
      </div>
    </div>
  )
}

function mockQrCode() {
  return (
    <div className="flex items-center gap-4">
      <div className="dd-qr">
        <span className="text-[10px] text-muted-foreground text-center leading-tight px-2">
          占位
          <br />
          未引库
        </span>
      </div>
      <div className="text-xs text-muted-foreground max-w-[180px]">
        尺寸和内边距按真实二维码给（132×132 + 留白），
        以后接二维码库时直接替换内部内容。
      </div>
    </div>
  )
}

function mockWatermark() {
  return (
    <div className="relative w-full max-w-sm h-40 rounded-lg border border-border overflow-hidden bg-card">
      <div className="p-3 text-xs text-muted-foreground space-y-1">
        <div className="font-semibold text-foreground">2026-02 收支报表</div>
        <div>到手 ¥1,286.00 · 12 单</div>
        <div>退款 ¥0.00 · 0 单</div>
      </div>
      {/* 水印层 */}
      <div
        className="absolute inset-0 pointer-events-none flex flex-wrap gap-6 p-3 content-start opacity-[0.08]"
        aria-hidden="true"
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <span key={i} className="text-[10px] font-bold text-foreground -rotate-[20deg] whitespace-nowrap">
            代肝账本 2026-02-14
          </span>
        ))}
      </div>
    </div>
  )
}

function mockCode() {
  return (
    <div className="w-full max-w-lg">
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="px-3 py-1.5 bg-secondary text-[10px] font-semibold text-muted-foreground flex items-center justify-between">
          <span>2026-02 订单.xlsx · 第 18 行（解析失败）</span>
          <Tag tone="danger">金额格式不对</Tag>
        </div>
        <pre className="px-3 py-2 text-xs font-mono text-foreground overflow-x-auto">
{`订单号            | 客户 | 服务项目   | 金额    | 渠道
XY20260214-0031  | 小北 | 主线4-6章 | 286元   | 闲鱼
                                      ^^^^^^
                                      期望纯数字，实际含汉字`}
        </pre>
      </div>
    </div>
  )
}

const DATA_PLANNED_MOCKS: Record<string, { title: string; mock: ReactNode; note?: string }> = {
  'c-numberanimation': {
    title: '数字动画 · 计划中',
    mock: mockNumberAnimation(),
    note: '改一笔单之后数字滚过去，比直接跳更容易看出「刚才那一下改了多少」。',
  },
  'c-carousel': {
    title: '轮播 · 计划中',
    mock: mockCarousel(),
    note: '打手交付截图的多图浏览。一期打手端没有拍照上传，所以这个排在二期。',
  },
  'c-calendar': {
    title: '日历 · 计划中',
    mock: mockCalendar(),
    note: '托管到期提醒的月视图。比现在只有列表形态直观得多。',
  },
  'c-qrcode': {
    title: '二维码 · 计划中',
    mock: mockQrCode(),
    note: '手机扫电脑上的订单号；以及二期手机↔电脑的配对码。',
  },
  'c-watermark': {
    title: '水印 · 计划中',
    mock: mockWatermark(),
    note: '导出的报表截图打上「店名 + 日期」。',
  },
  'c-code': {
    title: '代码块 · 计划中',
    mock: mockCode(),
    note: '把解析失败的那一行原样贴出来，并指到出错的列。',
  },
}

export function DataPlannedMock({ id }: { id: string }) {
  const cfg = DATA_PLANNED_MOCKS[id]
  if (!cfg) return null
  return <PlannedPreview title={cfg.title} mock={cfg.mock} note={cfg.note} />
}

export const DATA_DEMOS: Record<string, ComponentType> = {
  'c-datatable': DataTableDemo,
  'c-table': TableDemo,
  'c-tag': TagDemo,
  'c-badge': BadgeDemo,
  'c-avatar': AvatarDemo,
  'c-statistic': StatisticDemo,
  'c-descriptions': DescriptionsDemo,
  'c-list': ListDemo,
  'c-timeline': TimelineDemo,
  'c-collapse': CollapseDemo,
  'c-tree': TreeDemo,
  'c-empty': EmptyDemo,
  'c-skeleton': SkeletonDemo,
  'c-diffbar': DiffBarDemo,
  'c-ellipsis': EllipsisDemo,
}
