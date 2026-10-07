import { useState, type ComponentType } from 'react'
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Info,
  RefreshCw,
  Trash2,
  Upload,
  XCircle,
} from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Tooltip } from '@/components/ui/Tooltip'
import { Alert, NoticeStack, Popconfirm, Result, type NoticeItem } from '@/components/ui/feedback'
import { Button } from '@/components/ui/Button'
import { Tag } from '@/components/ui/data'
import { useToastStore } from '@/store/useToastStore'
import { Row } from './general'

/*
 * 反馈分类里「已实现」的那几条：对话框 / 气泡确认 / 消息条 / 提示条 /
 * 通知 / 结果页 / 文字提示。
 *
 * 进度条和加载动画在 sections/nav.tsx（它们和导入向导放一起更顺）。
 */

/* ------------------------------------------------------------------ */
/* 对话框                                                              */
/* ------------------------------------------------------------------ */

export function ModalDemo() {
  const [basic, setBasic] = useState(false)
  const [danger, setDanger] = useState(false)

  return (
    <div className="space-y-5">
      <Row label="基本">
        <Button variant="primary" icon={CheckCircle2} onClick={() => setBasic(true)}>
          打开对话框
        </Button>
        <Button
          variant="danger"
          icon={Trash2}
          onClick={() => setDanger(true)}
        >
          删除订单（危险确认）
        </Button>
        <span className="text-xs text-muted-foreground">
          Esc / 点遮罩 / 点 × 都能关
        </span>
      </Row>

      <Modal
        isOpen={basic}
        onClose={() => setBasic(false)}
        title="示例对话框"
        footer={
          <>
            <Button variant="ghost" onClick={() => setBasic(false)}>取消</Button>
            <Button variant="primary" onClick={() => setBasic(false)}>确定</Button>
          </>
        }
      >
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>对话框适合「必须先处理完才能继续」的事：填一个必填字段、确认一次不可撤销的操作。</p>
          <p>如果只是告知，用提示条或消息条 —— 弹窗打断操作，别乱用。</p>
        </div>
      </Modal>

      <Modal
        isOpen={danger}
        onClose={() => setDanger(false)}
        title="删除这一单？"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDanger(false)}>先不删</Button>
            <Button variant="danger" onClick={() => setDanger(false)}>确认删除</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <span className="text-[rgb(var(--danger-rgb))] shrink-0 mt-0.5">
              <AlertTriangle size={20} />
            </span>
            <div className="text-sm text-muted-foreground">
              <div className="text-foreground font-semibold">XY20260214-0031 · 小北 · ¥286.00</div>
              <p className="mt-1">删掉之后这一单的收支记录也会一起没，不能撤销。</p>
            </div>
          </div>
          <dl className="dd-spec">
            <dt>影响</dt><dd>1 笔订单 · 1 条流转记录</dd>
            <dt>手续费</dt><dd>¥4.58（删除后不再计入月度统计）</dd>
          </dl>
        </div>
      </Modal>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 气泡确认                                                            */
/* ------------------------------------------------------------------ */

export function PopconfirmDemo() {
  const [deleted, setDeleted] = useState<string[]>([])
  return (
    <div className="space-y-5">
      <Row label="贴着按钮弹出的轻确认 —— 点一下看效果">
        <Popconfirm
          title="删除这一行？"
          description="删掉之后不能撤销。"
          confirmText="删除"
          onConfirm={() => setDeleted((cur) => [...cur, `XY…00${31 + cur.length}`])}
        >
          <Button variant="danger" size="sm" icon={Trash2}>删除</Button>
        </Popconfirm>

        <Popconfirm
          tone="brand"
          title="标记为已完成？"
          description="手续费 ¥4.58 会立刻计入本月统计。"
          confirmText="确认完成"
          onConfirm={() => setDeleted((cur) => [...cur, '已标记完成'])}
        >
          <Button variant="primary" size="sm" icon={CheckCircle2}>标记完成</Button>
        </Popconfirm>

        <span className="text-xs text-muted-foreground">
          比对话框轻：不遮整屏，适合「删这一行」这种小动作
        </span>
      </Row>

      {deleted.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground">已执行的操作</div>
          <div className="flex flex-wrap gap-2">
            {deleted.map((d, i) => (
              <Tag key={i} tone="success">{d}</Tag>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 消息条                                                              */
/* ------------------------------------------------------------------ */

export function ToastDemo() {
  const addToast = useToastStore((s) => s.addToast)
  const items = [
    { label: '保存成功', type: 'success' as const, message: '订单已保存' },
    { label: '托管将到期', type: 'warning' as const, message: '3 天后有 2 单托管到期' },
    { label: '导入失败', type: 'error' as const, message: '表头对不上，请检查第 1 行' },
    { label: '提示', type: 'info' as const, message: '一期数据只保存在本设备' },
  ]
  return (
    <div className="space-y-5">
      <Row label="四种类型（右下角弹出，5 秒后自动消失）">
        {items.map((it) => (
          <Button
            key={it.type}
            variant="secondary"
            size="sm"
            onClick={() => addToast({ message: `${it.message}（${it.label}）`, type: it.type })}
          >
            {it.label}
          </Button>
        ))}
      </Row>

      <dl className="dd-spec">
        <dt>位置</dt><dd>右下角，新的在下、可叠多条</dd>
        <dt>自动消失</dt><dd>5 秒，带一条倒计时进度线</dd>
        <dt>手动关</dt><dd>右侧 × </dd>
        <dt>用什么</dt><dd>操作完的一句反馈。要用户读明白的原因为「通知」</dd>
      </dl>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 提示条                                                              */
/* ------------------------------------------------------------------ */

export function AlertDemo() {
  return (
    <div className="space-y-3 max-w-2xl">
      <Alert
        tone="info"
        title="一期数据只在本设备"
        description="手机记的单电脑看不到。要跨设备请等二期的云同步。"
      />
      <Alert
        tone="success"
        title="导入完成"
        description="121 条已写入，跳过 7 条。被跳过的行可以在「导入记录」里再处理。"
        action={<Button variant="secondary" size="sm">看详情</Button>}
      />
      <Alert
        tone="warning"
        title="有 2 单托管 3 天后到期"
        description="到期前 3 天开始每天提醒一次。"
        action={<Button variant="secondary" size="sm">去处理</Button>}
      />
      <Alert
        tone="danger"
        title="表头对不上"
        description="第 1 行缺少「金额」列。请对照模板改好再传。"
        closable
      />
      <Alert
        tone="info"
        title="可关闭的提示条"
        description="点右边的 × 会把它收掉。"
        closable
      />

      <dl className="dd-spec pt-2">
        <dt>提示条 vs 消息条</dt>
        <dd>提示条**嵌在内容里**（一直看得见），消息条**浮在角落**（自动消失）</dd>
      </dl>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 通知                                                              */
/* ------------------------------------------------------------------ */

export function NotificationDemo() {
  const [items, setItems] = useState<NoticeItem[]>([
    { id: '1', tone: 'warning', title: '托管 3 天后到期', description: '小北的账号托管 · ¥300.00' },
    { id: '2', tone: 'success', title: '阿凯提交了交付', description: 'XY20260214-0031 · 等待你确认' },
  ])

  const push = (tone: NoticeItem['tone'], title: string, description: string) =>
    setItems((cur) => [{ id: String(Date.now()), tone, title, description }, ...cur])

  return (
    <div className="space-y-5">
      <Row label="推送一条（旧的会保留）">
        <Button variant="secondary" size="sm" icon={Bell} onClick={() => push('warning', '托管即将到期', '还有 1 天，请尽快联系客户')}>
          到期提醒
        </Button>
        <Button variant="secondary" size="sm" icon={Upload} onClick={() => push('info', '导入任务已排队', '128 行，预计 3 秒')}>
          排队通知
        </Button>
        <Button variant="secondary" size="sm" icon={XCircle} onClick={() => push('error', '导入失败', '文件不是 xlsx，请另存后再传')}>
          失败通知
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setItems([])}>清空</Button>
      </Row>

      {items.length > 0 ? (
        <NoticeStack items={items} onClose={(id) => setItems((cur) => cur.filter((x) => x.id !== id))} />
      ) : (
        <p className="dd-help">已经清空了。点上面的按钮再推一条。</p>
      )}

      <dl className="dd-spec">
        <dt>通知 vs 消息条</dt>
        <dd>通知有标题和正文，能说明白「发生了什么、要我做什么」；消息条只有一句</dd>
        <dt>何时用</dt>
        <dd>托管到期、导入完成/失败这类**离开当前页面也得知道**的事</dd>
      </dl>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 结果页                                                              */
/* ------------------------------------------------------------------ */

export function ResultDemo() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="dd-card"><div className="dd-card__body">
        <Result
          tone="success"
          title="导入完成"
          description="121 条订单已写入，跳过 7 条。"
          extra={
            <>
              <Button variant="primary" size="sm">查看导入记录</Button>
              <Button variant="ghost" size="sm">返回列表</Button>
            </>
          }
        />
      </div></div>

      <div className="dd-card"><div className="dd-card__body">
        <Result
          tone="error"
          title="导入失败"
          description="文件的第 1 行缺少「金额」列，一行都没写入。"
          extra={
            <>
              <Button variant="secondary" size="sm" icon={RefreshCw}>重新选择文件</Button>
              <Button variant="ghost" size="sm">下载模板</Button>
            </>
          }
        />
      </div></div>

      <div className="dd-card"><div className="dd-card__body">
        <Result
          tone="warning"
          title="部分成功"
          description="114 条写入成功，7 条需要你手工确认。"
          extra={<Button variant="primary" size="sm">处理这 7 条</Button>}
        />
      </div></div>

      <div className="dd-card"><div className="dd-card__body">
        <Result
          tone="info"
          title="没有可导入的订单"
          description="文件里没有识别到数据行（可能只有表头）。"
        />
      </div></div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 文字提示                                                            */
/* ------------------------------------------------------------------ */

export function TooltipDemo() {
  return (
    <div className="space-y-5">
      <Row label="四个方向">
        <Tooltip content="上方的提示" position="top"><Button variant="secondary" size="sm">上</Button></Tooltip>
        <Tooltip content="下方的提示" position="bottom"><Button variant="secondary" size="sm">下</Button></Tooltip>
        <Tooltip content="左侧的提示" position="left"><Button variant="secondary" size="sm">左</Button></Tooltip>
        <Tooltip content="右侧的提示" position="right"><Button variant="secondary" size="sm">右</Button></Tooltip>
      </Row>

      <Row label="多行卡片式（要解释一件事的时候）">
        <Tooltip
          variant="card"
          position="top"
          content={
            <div>
              <b>手续费按全额算</b>
              <div className="opacity-80">¥286 × 1.6% = ¥4.58</div>
              <div className="opacity-60 text-[11px] mt-1">不是按到手 ¥281.42 算</div>
            </div>
          }
        >
          <Button variant="secondary" size="sm" icon={Info}>费率怎么算</Button>
        </Tooltip>
      </Row>

      <Row label="挂在表格列头上（最常见的用法）">
        <span className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground">
          手续费
          <Tooltip content="金额 × 渠道费率，按全额算" position="top">
            <Info size={13} className="cursor-help" />
          </Tooltip>
        </span>
      </Row>

      <Row label="纯图标按钮必须有提示（否则不知道那个图标是干嘛的）">
        <Tooltip content="编辑这一单" position="top">
          <Button variant="ghost" size="sm" icon={RefreshCw} iconOnly aria-label="刷新" />
        </Tooltip>
      </Row>
    </div>
  )
}

export const FEEDBACK2_DEMOS: Record<string, ComponentType> = {
  'c-modal': ModalDemo,
  'c-popconfirm': PopconfirmDemo,
  'c-toast': ToastDemo,
  'c-alert': AlertDemo,
  'c-notification': NotificationDemo,
  'c-result': ResultDemo,
  'c-tooltip': TooltipDemo,
}
