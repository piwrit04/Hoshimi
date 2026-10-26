/**
 * 原先「计划中」条目的真实可交互示例。挂到 FORM/DATA/NAV/FEEDBACK/GENERAL demos。
 */
import { useCallback, useState, type ComponentType } from 'react'
import { MessageSquarePlus, Plus, RefreshCw } from 'lucide-react'
import { Row } from './general'
import { Button } from '@/components/ui/Button'
import {
  Affix,
  Calendar,
  Carousel,
  Cascader,
  CodeBlock,
  ColorPicker,
  DatetimePicker,
  DynamicInput,
  DynamicTags,
  FloatButton,
  GlobalStyleProbe,
  InfiniteScroll,
  Mention,
  Menu,
  NumberAnimation,
  QRCode,
  Rate,
  Transfer,
  Watermark,
} from '@/components/ui/extra'

export function AffixLiveDemo() {
  return (
    <div className="relative h-48 overflow-y-auto rounded-lg border border-border">
      <Affix offsetTop={0}>
        <div className="flex h-9 items-center justify-between border-b border-border bg-card px-3 shadow-sm">
          <span className="text-xs">操作条（滚出视口后钉住）</span>
          <span className="text-[10px] text-brand">Affix</span>
        </div>
      </Affix>
      <div className="space-y-2 p-3">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="h-5 rounded bg-secondary" />
        ))}
      </div>
    </div>
  )
}

export function GlobalStyleLiveDemo() {
  return <GlobalStyleProbe />
}

export function MentionDemo() {
  const [v, setV] = useState('今天 @')
  return (
    <Row label="提及">
      <div className="w-full max-w-md">
        <Mention
          value={v}
          onChange={setV}
          options={[
            { value: 'aya', label: '绫' },
            { value: 'kuro', label: '黑' },
            { value: 'mika', label: '未花' },
          ]}
        />
      </div>
    </Row>
  )
}

export function CascaderDemo() {
  const [v, setV] = useState<string[]>(['game', 'asia', 'boost'])
  return (
    <Row label="级联">
      <Cascader
        value={v}
        onChange={(path) => setV(path)}
        options={[
          {
            value: 'game',
            label: '游戏',
            children: [
              {
                value: 'asia',
                label: '亚服',
                children: [
                  { value: 'boost', label: '代肝' },
                  { value: 'carry', label: '车队' },
                ],
              },
              {
                value: 'eu',
                label: '欧服',
                children: [{ value: 'boost', label: '代肝' }],
              },
            ],
          },
          {
            value: 'tool',
            label: '工具',
            children: [{ value: 'script', label: '脚本' }],
          },
        ]}
      />
    </Row>
  )
}

export function ColorPickerDemo() {
  const [v, setV] = useState('#EE7093')
  return (
    <Row label="颜色">
      <ColorPicker value={v} onChange={setV} />
      <span className="text-xs text-muted-foreground">分类标识色</span>
    </Row>
  )
}

export function RateDemo() {
  const [v, setV] = useState(4)
  return (
    <Row label="评分">
      <Rate value={v} onChange={setV} allowHalf />
      <span className="text-xs tabular-nums text-muted-foreground">{v} 星</span>
    </Row>
  )
}

export function DynamicInputDemo() {
  const [v, setV] = useState(['微信 xxx', 'QQ 123'])
  return (
    <Row label="动态输入">
      <div className="w-full max-w-md">
        <DynamicInput value={v} onChange={setV} placeholder="联系方式" />
      </div>
    </Row>
  )
}

export function DynamicTagsDemo() {
  const [v, setV] = useState(['急单', '夜班'])
  return (
    <Row label="动态标签">
      <div className="w-full max-w-md">
        <DynamicTags value={v} onChange={setV} />
      </div>
    </Row>
  )
}

export function TransferDemo() {
  const [v, setV] = useState(['aya'])
  return (
    <Row label="穿梭框">
      <Transfer
        value={v}
        onChange={setV}
        titles={['可选打手', '本单打手']}
        dataSource={[
          { key: 'aya', label: '绫' },
          { key: 'kuro', label: '黑' },
          { key: 'mika', label: '未花' },
          { key: 'rin', label: '凛' },
        ]}
      />
    </Row>
  )
}

export function DatetimePickerDemo() {
  const [v, setV] = useState('2026-02-14T09:30')
  return (
    <Row label="日期时间">
      <DatetimePicker value={v} onChange={setV} />
      <span className="font-mono text-xs text-muted-foreground">{v || '未选'}</span>
    </Row>
  )
}

export function NumberAnimationDemo() {
  const [v, setV] = useState(1280)
  return (
    <Row label="数字动画">
      <NumberAnimation value={v} prefix="¥" className="text-2xl font-semibold text-brand" />
      <Button size="sm" variant="secondary" icon={RefreshCw} onClick={() => setV((n) => n + 80)}>
        +80
      </Button>
    </Row>
  )
}

export function CarouselDemo() {
  return (
    <Row label="轮播">
      <Carousel className="w-full max-w-md" autoplay>
        {['交付截图 A', '交付截图 B', '交付截图 C'].map((t) => (
          <div
            key={t}
            className="flex h-36 items-center justify-center bg-gradient-to-br from-brand/20 to-secondary text-sm font-medium"
          >
            {t}
          </div>
        ))}
      </Carousel>
    </Row>
  )
}

export function CalendarDemo() {
  const [v, setV] = useState('2026-02-14')
  return (
    <Row label="日历">
      <Calendar
        value={v}
        onChange={setV}
        markers={{ '2026-02-14': 'brand', '2026-02-20': 'warning', '2026-02-28': 'danger' }}
      />
    </Row>
  )
}

export function QrCodeDemo() {
  return (
    <Row label="二维码">
      <QRCode value="HOSHIMI-ORDER-20260214" label="订单号" />
    </Row>
  )
}

export function WatermarkDemo() {
  return (
    <Row label="水印">
      <Watermark content="星笺 · 2026-02-14" className="w-full max-w-md">
        <div className="rounded-xl border border-border bg-card p-6 text-sm">
          导出报表预览区域。水印盖在内容上方但不挡操作。
        </div>
      </Watermark>
    </Row>
  )
}

export function CodeDemo() {
  return (
    <Row label="代码块">
      <div className="w-full max-w-lg">
        <CodeBlock
          language="csv"
          code={`order_id,amount,status\nA1001,128,done\nA1002,oops,pending`}
        />
      </div>
    </Row>
  )
}

export function MenuDemo() {
  const [v, setV] = useState('orders')
  return (
    <Row label="菜单">
      <Menu
        value={v}
        onChange={setV}
        items={[
          { key: 'overview', label: '概览' },
          {
            key: 'biz',
            label: '业务',
            children: [
              { key: 'orders', label: '订单', count: 12 },
              { key: 'customers', label: '客户', count: 4 },
            ],
          },
          { key: 'settings', label: '设置' },
        ]}
      />
    </Row>
  )
}

export function FloatButtonDemo() {
  return (
    <Row label="悬浮按钮">
      <div className="relative h-40 w-full max-w-md overflow-hidden rounded-xl border border-dashed border-border bg-secondary/20">
        <p className="absolute left-3 top-3 text-xs text-muted-foreground">预览区右下角</p>
        <div className="absolute bottom-3 right-3 flex flex-col items-end gap-2">
          <FloatButton icon={MessageSquarePlus} label="快捷备注" />
          <FloatButton icon={Plus} label="新建订单" brand />
        </div>
      </div>
      <p className="dd-help">真实页面用 FloatButtonGroup 固定在视口右下。</p>
    </Row>
  )
}

export function InfiniteScrollDemo() {
  const [items, setItems] = useState(() => Array.from({ length: 8 }, (_, i) => i + 1))
  const [loading, setLoading] = useState(false)
  const hasMore = items.length < 24
  const onLoadMore = useCallback(() => {
    if (loading || !hasMore) return
    setLoading(true)
    window.setTimeout(() => {
      setItems((prev) => [
        ...prev,
        ...Array.from({ length: 4 }, (_, i) => prev.length + i + 1),
      ])
      setLoading(false)
    }, 450)
  }, [loading, hasMore])

  return (
    <Row label="无限滚动">
      <div className="h-48 w-full max-w-md overflow-y-auto rounded-xl border border-border p-2">
        <InfiniteScroll hasMore={hasMore} loading={loading} onLoadMore={onLoadMore}>
          {items.map((n) => (
            <div key={n} className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
              订单条目 #{n}
            </div>
          ))}
        </InfiniteScroll>
      </div>
    </Row>
  )
}

export const EXTRA_FORM_DEMOS: Record<string, ComponentType> = {
  'c-mention': MentionDemo,
  'c-cascader': CascaderDemo,
  'c-colorpicker': ColorPickerDemo,
  'c-rate': RateDemo,
  'c-dynamicinput': DynamicInputDemo,
  'c-dynamictags': DynamicTagsDemo,
  'c-transfer': TransferDemo,
  'c-datetimepicker': DatetimePickerDemo,
}

export const EXTRA_DATA_DEMOS: Record<string, ComponentType> = {
  'c-numberanimation': NumberAnimationDemo,
  'c-carousel': CarouselDemo,
  'c-calendar': CalendarDemo,
  'c-qrcode': QrCodeDemo,
  'c-watermark': WatermarkDemo,
  'c-code': CodeDemo,
}

export const EXTRA_NAV_DEMOS: Record<string, ComponentType> = {
  'c-menu': MenuDemo,
  'c-floatbutton': FloatButtonDemo,
}

export const EXTRA_FEEDBACK_DEMOS: Record<string, ComponentType> = {
  'c-infinitescroll': InfiniteScrollDemo,
}

export const EXTRA_GENERAL_DEMOS: Record<string, ComponentType> = {
  'c-affix': AffixLiveDemo,
  'c-globalstyle': GlobalStyleLiveDemo,
}

