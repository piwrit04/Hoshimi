import { useState, type ComponentType, type ReactNode } from 'react'
import {
  Calendar,
  Clock,
  Mail,
  Phone,
  Plus,
  Search,
  Star,
  Trash2,
  User,
  Wallet,
} from 'lucide-react'
import {
  Field,
  FieldRow,
  FieldSet,
  Form,
  FormAutoComplete,
  FormCheckbox,
  FormHint,
  FormInput,
  FormNativeSelect,
  FormNumberInput,
  FormRadioGroup,
  FormSegmentedControl,
  FormSelect,
  FormSlider,
  FormSwitch,
  FormTextarea,
  FormUpload,
  type UploadFile,
  type FormRules,
} from '@/components/ui/form'
import { Button } from '@/components/ui/Button'
import { Tag } from '@/components/ui/data'
import { Row, PlannedPreview } from './general'

/*
 * 数据录入分类的示例。
 *
 * 这一组的字段值都尽量用账本里真的东西：订单号 XY20260214-0031、
 * 渠道（微信 / 闲鱼）、金额（分）、打手名。这样一眼能看出合不合用。
 */

/* ------------------------------------------------------------------ */
/* 输入框                                                              */
/* ------------------------------------------------------------------ */

export function InputDemo() {
  const [orderNo, setOrderNo] = useState('XY20260214-0031')
  const [q, setQ] = useState('')
  const [pwd, setPwd] = useState('')

  return (
    <FieldSet className="max-w-2xl">
      <FormInput
        label="订单号"
        value={orderNo}
        onChange={(e) => setOrderNo(e.target.value)}
        placeholder="例如 XY20260214-0031"
        prefix={<Search size={14} />}
        clearable
        onClear={() => setOrderNo('')}
        help="扫闲鱼的订单号直接粘进来就行。"
      />

      <FormInput
        label="客户称呼"
        placeholder="例如 小北"
        suffix={<User size={14} />}
      />

      <FormInput
        label="金额"
        placeholder="0.00"
        suffix="元"
        className="text-right tabular-nums"
        help="这一处只是普通输入框演示单位后缀；真正录金额请用下面的「数字输入」。"
      />

      <FormInput
        label="闲鱼链接"
        placeholder="https://…"
        defaultValue="https://…（粘错格式时是这样的错误态）"
        error="这不是一个有效的链接"
      />

      <FormInput label="密码（type=password）" type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="••••••••" />

      <FormInput label="只读（readOnly）" defaultValue="已归档订单不可改" readOnly />

      <FormInput label="禁用（disabled）" defaultValue="打手端看不到这个字段" disabled />

      <FormInput label="带提示的问号" help="鼠标移到问号上看说明"
        placeholder="留空表示按全局默认" />

      <Field label="搜索框的常见形态（图标 + 可清除）" help="列表页顶部那个">
        <div className="dd-control-wrap dd-control-wrap--prefix dd-control-wrap--suffix">
          <span className="dd-control-icon dd-control-icon--prefix"><Search size={14} /></span>
          <input
            className="dd-control"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜订单号 / 客户 / 打手…"
          />
        </div>
      </Field>
    </FieldSet>
  )
}

/* ------------------------------------------------------------------ */
/* 数字输入                                                            */
/* ------------------------------------------------------------------ */

export function InputNumberDemo() {
  /* 账本里金额以「分」存，这里演示两种展示方式 */
  const [amount, setAmount] = useState<number | null>(128600)
  const [rate, setRate] = useState<number | null>(1.6)
  const [count, setCount] = useState<number | null>(1)

  const yuan = amount === null ? 0 : amount / 100

  return (
    <FieldSet className="max-w-2xl">
      <FormNumberInput
        label="订单金额（分，带千分位）"
        value={amount}
        onChange={setAmount}
        min={0}
        max={100_000_00}
        step={100}
        unit="分"
        thousandSeparator
        help={
          <>
            对外显示 <span className="text-foreground tabular-nums">¥{yuan.toFixed(2)}</span>。
            内部一律存整数分，不用浮点。
          </>
        }
      />

      <FormNumberInput
        label="渠道费率（%）"
        value={rate}
        onChange={setRate}
        min={0}
        max={10}
        step={0.1}
        unit="%"
        help="微信 0%，闲鱼 1.6%。改全局设置不影响已有订单 —— 费率是快照。"
      />

      <FormNumberInput
        label="数量"
        value={count}
        onChange={setCount}
        min={1}
        max={99}
        unit="单"
      />

      <FormNumberInput label="不带加减按钮（controls=false）" value={count} onChange={setCount} unit="单" controls={false} />

      <FormNumberInput label="禁用" value={null} onChange={() => {}} placeholder="不可录入" disabled />

      {/* 直观展示手续费是怎么算的 —— 这也是这个组件最该被用对的地方 */}
      <div className="dd-card">
        <div className="dd-card__body space-y-2">
          <div className="text-xs font-semibold text-muted-foreground">手续费按全额算，不按到手算</div>
          <dl className="dd-spec">
            <dt>金额</dt>
            <dd>¥{yuan.toFixed(2)}</dd>
            <dt>渠道费率</dt>
            <dd>{rate ?? 0}%</dd>
            <dt>手续费 = 金额 × 费率</dt>
            <dd>¥{((yuan * (rate ?? 0)) / 100).toFixed(2)}</dd>
            <dt>到手 = 金额 − 转出 − 手续费</dt>
            <dd>¥{(yuan - (yuan * (rate ?? 0)) / 100).toFixed(2)}</dd>
          </dl>
        </div>
      </div>
    </FieldSet>
  )
}

/* ------------------------------------------------------------------ */
/* 多行文本                                                            */
/* ------------------------------------------------------------------ */

export function TextareaDemo() {
  const [note, setNote] = useState('客户要求周日前打完主线 4-6 章，材料自备。')
  return (
    <FieldSet className="max-w-2xl">
      <FormTextarea
        label="订单备注"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={200}
        showCount
        placeholder="写点以后自己看得懂的东西…"
        help="打手端能看到的、和看不到的字段，见产品定义里的权限矩阵。"
      />

      <FormTextarea label="不可编辑（disabled）" value="已归档订单的备注" disabled rows={3} />

      <FormTextarea
        label="错误态"
        defaultValue="太短"
        error="至少写 5 个字，不然三个月后看不懂"
      />
    </FieldSet>
  )
}

/* ------------------------------------------------------------------ */
/* 选择器                                                              */
/* ------------------------------------------------------------------ */

const CHANNELS = [
  { label: '微信', value: 'wechat', hint: '费率 0%' },
  { label: '闲鱼', value: 'xianyu', hint: '费率 1.6%' },
  { label: '其它 / 线下', value: 'other', hint: '费率 0%' },
]

const FIGHTERS = [
  { label: '阿凯', value: 'akai' },
  { label: '小北', value: 'xiaobei' },
  { label: '橙子', value: 'chengzi' },
  { label: '老周', value: 'laozhou', disabled: true, hint: '已停用' },
  { label: '芋圆', value: 'yuyuan' },
]

export function SelectDemo() {
  const [channel, setChannel] = useState<string | null>('xianyu')
  const [fighter, setFighter] = useState<string | null>(null)
  const [empty, setEmpty] = useState<string | null>(null)

  return (
    <FieldSet className="max-w-2xl">
      <FormSelect
        label="渠道"
        options={CHANNELS}
        value={channel}
        onChange={setChannel}
        help="选项右侧的小字是费率，选之前就能看到这单要扣多少。"
      />

      <FormSelect
        label="指派打手（可搜索）"
        options={FIGHTERS}
        value={fighter}
        onChange={setFighter}
        filterable
        clearable
        placeholder="输入名字搜…"
        help="「已停用」的打手在列表里是灰的，点不动。"
      />

      <FormSelect
        label="未选择 / 可清空"
        options={CHANNELS}
        value={empty}
        onChange={setEmpty}
        clearable
        placeholder="点我选一个，选完能点 × 清掉"
      />

      <FormSelect
        label="错误态"
        options={CHANNELS}
        value={null}
        onChange={() => {}}
        error="必须选一个渠道，不然算不出手续费"
      />

      <FormSelect label="禁用" options={CHANNELS} value="wechat" onChange={() => {}} disabled />

      {/* 空结果的样子 */}
      <FormSelect
        label="搜不到的时候"
        options={FIGHTERS}
        value={null}
        onChange={() => {}}
        filterable
        emptyText="没有这个打手，先去设置里加"
      />
    </FieldSet>
  )
}

/* ------------------------------------------------------------------ */
/* 原生选择器                                                          */
/* ------------------------------------------------------------------ */

export function NativeSelectDemo() {
  const [n, setN] = useState('20')
  return (
    <FieldSet className="max-w-md">
      <FormNativeSelect
        label="每页显示"
        value={n}
        onChange={(e) => setN(e.target.value)}
        options={[
          { label: '20 条', value: '20' },
          { label: '50 条', value: '50' },
          { label: '100 条', value: '100' },
        ]}
        help="选项少、又不需要搜索的场合用它 —— 走系统原生下拉，键盘和触屏手感最好。"
      />
    </FieldSet>
  )
}

/* ------------------------------------------------------------------ */
/* 自动补全                                                            */
/* ------------------------------------------------------------------ */

export function AutoCompleteDemo() {
  const [name, setName] = useState('')
  return (
    <FieldSet className="max-w-2xl">
      <FormAutoComplete
        label="客户名（自动补全）"
        value={name}
        onChange={setName}
        suggestions={['小北', '小北的朋友', '北岸', '橙子', '橙子妈妈', '阿凯', '老周', '芋圆', '芋圆（小号）']}
        placeholder="输一个字试试，例如「北」"
        help="候选来自已有客户。避免同一个客户被录成「小北」「小 北」「北」三条。"
      />
    </FieldSet>
  )
}

/* ------------------------------------------------------------------ */
/* 复选框                                                              */
/* ------------------------------------------------------------------ */

export function CheckboxDemo() {
  const [a, setA] = useState(true)
  const [b, setB] = useState(false)
  const [all, setAll] = useState(false)
  const [some, setSome] = useState(true)

  return (
    <div className="space-y-6 max-w-2xl">
      <Row label="基本">
        <FormCheckbox label="同意平台规则" checked={a} onChange={setA} />
        <FormCheckbox label="未选" checked={b} onChange={setB} />
        <FormCheckbox label="禁用" checked={false} onChange={() => {}} disabled />
        <FormCheckbox label="选中且禁用" checked onChange={() => {}} disabled />
      </Row>

      <Row label="半选态（表格「全选」用）">
        <FormCheckbox label="全选（半选）" checked={all} indeterminate={some} onChange={(v) => { setAll(v); setSome(!v) }} />
        <FormCheckbox label="全选（未选）" checked={false} indeterminate onChange={() => {}} />
      </Row>

      <Field label="一组复选（批量选渠道）">
        <div className="flex flex-wrap gap-4">
          <FormCheckbox label="微信" checked onChange={() => {}} />
          <FormCheckbox label="闲鱼" checked onChange={() => {}} />
          <FormCheckbox label="线下" checked={false} onChange={() => {}} />
        </div>
      </Field>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 单选组                                                              */
/* ------------------------------------------------------------------ */

export function RadioGroupDemo() {
  const [normal, setNormal] = useState<string | null>('xianyu')
  const [status, setStatus] = useState<string | null>('doing')

  return (
    <FieldSet className="max-w-2xl">
      <FormRadioGroup
        label="渠道（横排圆点）"
        options={CHANNELS}
        value={normal}
        onChange={setNormal}
      />

      <FormRadioGroup
        label="订单状态（竖排）"
        direction="vertical"
        options={[
          { label: '进行中', value: 'doing' },
          { label: '待交付', value: 'review' },
          { label: '已完成', value: 'done' },
          { label: '已退款（不可选）', value: 'refunded', disabled: true },
        ]}
        value={status}
        onChange={setStatus}
      />

      <FormRadioGroup
        label="渠道（卡片形态，要展示副文案时用）"
        variant="card"
        options={CHANNELS}
        value={normal}
        onChange={setNormal}
        help="一块整片可点，副文案有地方放。渠道选择用这个比横排圆点好点。"
      />
    </FieldSet>
  )
}

/* ------------------------------------------------------------------ */
/* 开关                                                                */
/* ------------------------------------------------------------------ */

export function SwitchDemo() {
  const [allow, setAllow] = useState(true)
  const [notify, setNotify] = useState(true)
  const [dark, setDark] = useState(false)

  return (
    <div className="max-w-2xl divide-y divide-border">
      <FieldRow label="允许打手看到备注" help="关掉后打手端这一栏整个不显示">
        <FormSwitch checked={allow} onChange={setAllow} />
      </FieldRow>
      <FieldRow label="托管到期前提醒" help="到期前 3 天开始每天提醒一次">
        <FormSwitch checked={notify} onChange={setNotify} />
      </FieldRow>
      <FieldRow label="深色模式" help="也可以点标题栏右上角那个图标切">
        <FormSwitch checked={dark} onChange={setDark} />
      </FieldRow>
      <FieldRow label="禁用态" help="没有权限时开关不可点">
        <FormSwitch checked={false} onChange={() => {}} disabled />
      </FieldRow>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 滑块                                                                */
/* ------------------------------------------------------------------ */

export function SliderDemo() {
  const [fee, setFee] = useState(1.6)
  const [days, setDays] = useState(7)
  return (
    <FieldSet className="max-w-xl">
      <FormSlider
        label="闲鱼费率"
        value={fee}
        onChange={setFee}
        min={0}
        max={5}
        step={0.1}
        formatValue={(v) => `${v.toFixed(1)}%`}
        help="全局默认费率。改它不影响已有订单 —— 每单记的是下单当时的费率。"
      />
      <FormSlider
        label="托管默认天数"
        value={days}
        onChange={setDays}
        min={1}
        max={30}
        formatValue={(v) => `${v} 天`}
      />
      <FormSlider label="不显示数值" value={days} onChange={setDays} showValue={false} min={1} max={30} />
    </FieldSet>
  )
}

/* ------------------------------------------------------------------ */
/* 分段控制                                                            */
/* ------------------------------------------------------------------ */

export function SegmentedDemo() {
  const [channel, setChannel] = useState('xianyu')
  const [range, setRange] = useState('month')
  return (
    <FieldSet className="max-w-2xl">
      <FormSegmentedControl
        label="渠道"
        value={channel}
        onChange={setChannel}
        options={[
          { label: '微信', value: 'wechat' },
          { label: '闲鱼', value: 'xianyu' },
          { label: '全部', value: 'all' },
        ]}
        help="选项只有两三个、又经常切的时候，它比下拉少一次点击。"
      />
      <FormSegmentedControl
        label="统计区间"
        value={range}
        onChange={setRange}
        options={[
          { label: '今天', value: 'today' },
          { label: '本周', value: 'week' },
          { label: '本月', value: 'month' },
          { label: '本季', value: 'quarter' },
          { label: '全部', value: 'all' },
        ]}
      />
    </FieldSet>
  )
}

/* ------------------------------------------------------------------ */
/* 表单 + 校验                                                         */
/* ------------------------------------------------------------------ */

type NewOrderForm = {
  orderNo: string
  customer: string
  amount: number | null
  channel: string | null
}

export function FormDemo() {
  const [values, setValues] = useState<NewOrderForm>({
    orderNo: '',
    customer: '',
    amount: null,
    channel: null,
  })
  const [submitted, setSubmitted] = useState<NewOrderForm | null>(null)

  const rules: FormRules<NewOrderForm> = {
    orderNo: [
      { required: true, message: '订单号不能空' },
      { validator: (v) => String(v).length >= 6, message: '订单号看起来太短了' },
    ],
    customer: [{ required: true, message: '得有个称呼，不然以后对不上账' }],
    amount: [
      { required: true, message: '金额不能空' },
      { validator: (v) => typeof v === 'number' && v > 0, message: '金额要大于 0' },
    ],
    channel: [{ required: true, message: '渠道决定手续费，必须选' }],
  }

  /* 直接点「提交」看拦截效果 —— 一个都不填，四处会同时报错。
     ⚠️ 每个控件上写了 name，错误会自动从 <Form> 认领到对应字段下面，
        不需要在这里一行行传 error。 */
  return (
    <div className="grid gap-6 lg:grid-cols-2 max-w-4xl">
      <Form
        values={values}
        rules={rules}
        onSubmit={(v) => setSubmitted(v)}
      >
        <FormInput
          name="orderNo"
          label="订单号"
          required
          value={values.orderNo}
          onChange={(e) => setValues({ ...values, orderNo: e.target.value })}
          placeholder="XY20260214-0031"
        />
        <FormInput
          name="customer"
          label="客户称呼"
          required
          value={values.customer}
          onChange={(e) => setValues({ ...values, customer: e.target.value })}
          placeholder="小北"
        />
        <FormNumberInput
          name="amount"
          label="金额"
          value={values.amount}
          onChange={(v) => setValues({ ...values, amount: v })}
          unit="分"
          min={0}
          thousandSeparator
        />
        <FormSelect
          name="channel"
          label="渠道"
          options={CHANNELS}
          value={values.channel}
          onChange={(v) => setValues({ ...values, channel: v })}
          required
        />

        <div className="flex items-center gap-3 pt-1">
          <Button type="submit" variant="primary" icon={Plus}>新建订单</Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setValues({ orderNo: '', customer: '', amount: null, channel: null })
              setSubmitted(null)
            }}
          >
            重置
          </Button>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            校验规则 <FormHint>这里只是演示：必填 + 长度 + 数值范围三种规则。</FormHint>
          </span>
        </div>
      </Form>

      {/* 右侧回显，证明真的提交上去了 */}
      <div className="dd-card h-fit">
        <div className="dd-card__header">提交结果</div>
        <div className="dd-card__body">
          {submitted ? (
            <dl className="dd-spec">
              <dt>订单号</dt>
              <dd>{submitted.orderNo}</dd>
              <dt>客户</dt>
              <dd>{submitted.customer}</dd>
              <dt>金额</dt>
              <dd>¥{((submitted.amount ?? 0) / 100).toFixed(2)}</dd>
              <dt>渠道</dt>
              <dd>{submitted.channel}</dd>
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">
              左边一项都不填、直接点「新建订单」，会看到四个字段同时报错，
              并且**不会**触发提交 —— 结果就一直停在这里。
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 上传                                                                */
/* ------------------------------------------------------------------ */

export function UploadDemo() {
  const [files, setFiles] = useState<UploadFile[]>([])

  return (
    <div className="max-w-2xl space-y-6">
      <FormUpload
        label="导入订单（Excel）"
        accept=".xlsx,.xls,.csv"
        multiple
        files={files}
        onFilesChange={setFiles}
        help="拖进来或者点一下选。真正解析前会先校验表头，逐条报错。"
      />

      <div className="dd-alert dd-alert--info">
        <span className="dd-alert__icon">i</span>
        <div className="flex-1">
          <div className="dd-alert__title">上传只是第一步</div>
          <div className="dd-alert__desc">
            文件进来之后还要走「解析 → 校验 → 逐条确认」三步。那一步的进度用下面的进度条 + 步骤条。
          </div>
        </div>
      </div>

      {/* 用按钮模拟一份带状态的文件列表，看三种行样式 */}
      <div className="space-y-2">
        <div className="text-xs font-medium text-muted-foreground">文件行的三种状态</div>
        <div className="dd-upload-item">
          <span className="truncate flex-1">2026-02 订单.xlsx</span>
          <Tag tone="success">解析完成</Tag>
          <span className="text-xs text-muted-foreground tabular-nums">48.2 KB</span>
          <button type="button" className="text-muted-foreground hover:text-foreground"><Trash2 size={14} /></button>
        </div>
        <div className="dd-upload-item">
          <span className="truncate flex-1">2026-03 订单.xlsx</span>
          <Tag tone="warning">3 行有问题</Tag>
          <span className="text-xs text-muted-foreground tabular-nums">51.0 KB</span>
          <button type="button" className="text-muted-foreground hover:text-foreground"><Trash2 size={14} /></button>
        </div>
        <div className="dd-upload-item">
          <span className="truncate flex-1">不对的表.xlsx</span>
          <Tag tone="danger">表头对不上</Tag>
          <span className="text-xs text-muted-foreground tabular-nums">2.1 KB</span>
          <button type="button" className="text-muted-foreground hover:text-foreground"><Trash2 size={14} /></button>
        </div>
      </div>
    </div>
  )
}

/* ================================================================== */
/* 计划中的表单件 —— 每个给一个尺寸正确的草样                          */
/* ================================================================== */

function mockDatePicker() {
  return (
    <div className="space-y-3">
      <div className="dd-control-wrap dd-control-wrap--prefix dd-control-wrap--suffix w-56">
        <span className="dd-control-icon dd-control-icon--prefix"><Calendar size={14} /></span>
        <input className="dd-control" defaultValue="2026-02-14" readOnly />
      </div>
      <div className="w-64 rounded-lg border border-border bg-popover p-3">
        <div className="flex gap-1 justify-between mb-2 text-xs text-muted-foreground">
          {['一', '二', '三', '四', '五', '六', '日'].map((d) => (
            <span key={d} className="w-7 text-center">{d}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
            <span
              key={d}
              className={
                d === 14
                  ? 'w-7 h-7 flex items-center justify-center rounded-md bg-brand text-on-brand text-xs font-bold'
                  : 'w-7 h-7 flex items-center justify-center rounded-md text-xs text-foreground hover:bg-secondary'
              }
            >
              {d}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function mockTimePicker() {
  return (
    <div className="dd-control-wrap dd-control-wrap--prefix w-40">
      <span className="dd-control-icon dd-control-icon--prefix"><Clock size={14} /></span>
      <input className="dd-control" defaultValue="09:31" readOnly />
    </div>
  )
}

function mockMention() {
  return (
    <div className="w-full max-w-sm space-y-2">
      <div className="dd-control min-h-[76px] py-2 leading-relaxed">
        这单让 <span className="text-brand font-semibold">@阿凯</span> 接，材料我发他了
        <span className="inline-block w-px h-4 bg-brand align-middle ml-0.5 animate-pulse" />
      </div>
      <div className="dd-popover dd-popover--plain w-44">
        <div className="dd-menu">
          <div className="dd-menu__item !bg-brand-20 !text-brand">阿凯</div>
          <div className="dd-menu__item">小北</div>
          <div className="dd-menu__item">橙子</div>
        </div>
      </div>
    </div>
  )
}

function mockCascader() {
  return (
    <div className="flex gap-2">
      {[
        { title: '游戏', items: ['原神', '崩铁'], active: '原神' },
        { title: '大区', items: ['国服', '国际服'], active: '国服' },
        { title: '服务', items: ['主线代打', '深渊满星', '日常'], active: '深渊满星' },
      ].map((col) => (
        <div key={col.title} className="w-28 rounded-lg border border-border bg-popover overflow-hidden">
          <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground bg-secondary">
            {col.title}
          </div>
          {col.items.map((it) => (
            <div
              key={it}
              className={
                it === col.active
                  ? 'px-2 py-1.5 text-xs text-brand bg-brand-20 font-semibold'
                  : 'px-2 py-1.5 text-xs text-foreground'
              }
            >
              {it}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

function mockColorPicker() {
  const colors = ['#EE7093', '#7EB3FF', '#4AA66C', '#D69E2E', '#E05C5C', '#A5A0BE']
  return (
    <div className="flex items-center gap-2">
      {colors.map((c) => (
        <span
          key={c}
          className="w-7 h-7 rounded-md border border-border"
          style={{ backgroundColor: c }}
          title={c}
        />
      ))}
      <span className="text-xs text-muted-foreground">给渠道 / 游戏打标识色</span>
    </div>
  )
}

function mockRate() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <Star
            key={n}
            size={20}
            className={n <= 4 ? 'text-[rgb(var(--warning-rgb))]' : 'text-muted-foreground'}
            fill={n <= 4 ? 'currentColor' : 'none'}
          />
        ))}
      </div>
      <span className="text-sm text-muted-foreground">4 星 · 挺靠谱</span>
    </div>
  )
}

function mockDynamicInput() {
  return (
    <div className="w-full max-w-md space-y-2">
      {[
        { icon: Phone, value: '138****2841' },
        { icon: Mail, value: 'xiaobei@example.com' },
      ].map((row, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="dd-control-wrap dd-control-wrap--prefix flex-1">
            <span className="dd-control-icon dd-control-icon--prefix"><row.icon size={14} /></span>
            <input className="dd-control" defaultValue={row.value} readOnly />
          </div>
          <Button variant="ghost" icon={Trash2} iconOnly size="sm" aria-label="删除这一行" />
        </div>
      ))}
      <Button variant="secondary" size="sm" icon={Plus}>再加一条联系方式</Button>
      <p className="dd-help">一客户多联系方式 —— 手机号或邮箱二选一，合并前必须弹窗问。</p>
    </div>
  )
}

function mockDynamicTags() {
  return (
    <div className="w-full max-w-md space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {['急单常客', '只走闲鱼', '要先付', '老客户'].map((t) => (
          <Tag key={t} tone="brand" onClose={() => {}}>{t}</Tag>
        ))}
      </div>
      <div className="dd-control-wrap w-48">
        <input className="dd-control" placeholder="输完回车加标签" readOnly />
      </div>
    </div>
  )
}

function mockCheckboxGroup() {
  return (
    <div className="w-full max-w-md space-y-3">
      <div className="rounded-lg border border-border divide-y divide-border">
        <div className="flex items-center gap-3 px-3 py-2">
          <FormCheckbox checked indeterminate onChange={() => {}} label={<span className="text-sm font-semibold">全选（已选 2 / 4）</span>} />
        </div>
        {['XY…0031 · 小北 · ¥286', 'XY…0032 · 橙子 · ¥520', 'XY…0033 · 阿凯 · ¥128', 'XY…0034 · 老周 · ¥88'].map((r, i) => (
          <div key={r} className="flex items-center gap-3 px-3 py-2">
            <FormCheckbox checked={i < 2} onChange={() => {}} label={<span className="text-sm">{r}</span>} />
          </div>
        ))}
      </div>
      <Button variant="primary" size="sm" icon={Wallet}>批量标记完成</Button>
    </div>
  )
}

function mockTransfer() {
  return (
    <div className="flex items-center gap-3">
      {[
        { title: '候选打手', items: ['阿凯', '小北', '橙子', '芋圆'] },
        { title: '本单参与', items: ['老周'] },
      ].map((col, ci) => (
        <div key={col.title} className="w-40 rounded-lg border border-border overflow-hidden">
          <div className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground bg-secondary">
            {col.title}
          </div>
          {col.items.map((it) => (
            <div key={it} className="px-2 py-1.5 text-xs flex items-center justify-between">
              <span>{it}</span>
              <span className="text-muted-foreground">{ci === 0 ? '›' : '‹'}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

function mockDatetimePicker() {
  return (
    <div className="flex items-center gap-2">
      <div className="dd-control-wrap dd-control-wrap--prefix w-36">
        <span className="dd-control-icon dd-control-icon--prefix"><Calendar size={14} /></span>
        <input className="dd-control" defaultValue="2026-02-14" readOnly />
      </div>
      <div className="dd-control-wrap dd-control-wrap--prefix w-28">
        <span className="dd-control-icon dd-control-icon--prefix"><Clock size={14} /></span>
        <input className="dd-control" defaultValue="09:31" readOnly />
      </div>
    </div>
  )
}

const FORM_PLANNED_MOCKS: Record<string, { title: string; mock: ReactNode; note?: string }> = {
  'c-datepicker': {
    title: '日期选择 · 计划中',
    mock: mockDatePicker(),
    note: '带快捷项：今天 / 本周 / 本月 / 自定义区间。筛选器和录入两处都要。',
  },
  'c-timepicker': {
    title: '时间选择 · 计划中',
    mock: mockTimePicker(),
    note: '和日期框并排就是「日期时间选择」。',
  },
  'c-mention': {
    title: '提及 · 计划中',
    mock: mockMention(),
    note: '输入 @ 弹人，选中后变成一个高亮块。打手端能看到自己被点名的那几条。',
  },
  'c-cascader': {
    title: '级联选择 · 计划中',
    mock: mockCascader(),
    note: '「游戏 → 大区 → 服务项目」三级展开。',
  },
  'c-colorpicker': {
    title: '颜色选择 · 计划中',
    mock: mockColorPicker(),
    note: '只用于给分类打标识色。一期的设计规范里没有自定义调色盘。',
  },
  'c-rate': {
    title: '评分 · 计划中',
    mock: mockRate(),
    note: '结单后给打手打分。攒起来能看出谁靠谱。',
  },
  'c-dynamicinput': {
    title: '动态输入 · 计划中',
    mock: mockDynamicInput(),
    note: '产品定义明确要求「一客户多联系方式」，目前没有对应控件 —— 这是表单类里最该先补的一个。',
  },
  'c-dynamictags': {
    title: '动态标签 · 计划中',
    mock: mockDynamicTags(),
    note: '回车生成标签，标签可删。',
  },
  'c-checkboxgroup': {
    title: '复选框组 · 计划中',
    mock: mockCheckboxGroup(),
    note: '带全选和半选。批量操作的前提。',
  },
  'c-transfer': {
    title: '穿梭框 · 计划中',
    mock: mockTransfer(),
    note: '偏重的交互。如果一单最多两个打手，用复选框组更轻。',
  },
  'c-datetimepicker': {
    title: '日期时间选择 · 计划中',
    mock: mockDatetimePicker(),
    note: '导入时手工补一个完整时间戳。',
  },
}

/** 数据录入里「计划中」那几条的草样。返回 null 时页面走通用占位。 */
export function FormPlannedMock({ id }: { id: string }) {
  const cfg = FORM_PLANNED_MOCKS[id]
  if (!cfg) return null
  return <PlannedPreview title={cfg.title} mock={cfg.mock} note={cfg.note} />
}

export const FORM_DEMOS: Record<string, ComponentType> = {
  'c-input': InputDemo,
  'c-inputnumber': InputNumberDemo,
  'c-textarea': TextareaDemo,
  'c-select': SelectDemo,
  'c-nativeselect': NativeSelectDemo,
  'c-autocomplete': AutoCompleteDemo,
  'c-checkbox': CheckboxDemo,
  'c-radiogroup': RadioGroupDemo,
  'c-switch': SwitchDemo,
  'c-slider': SliderDemo,
  'c-segmented': SegmentedDemo,
  'c-form': FormDemo,
  'c-upload': UploadDemo,
}

/* 下面这些在这个文件里只用了一部分，其余留给别的 section 复用 */
export { Search }
