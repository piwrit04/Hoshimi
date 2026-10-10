import { PageHeader } from '@/components/ui/PageHeader'
import { useRef, useState } from 'react'
import {
  Palette,
  Code2,
  Database,
  Monitor,
  Moon,
  Sun,
  Download,
  Upload,
  Trash2,
  FileSpreadsheet,
  FileDown,
  Info,
  RefreshCw,
  Percent,
  Cloud,
  LogIn,
  LogOut,
  CloudOff,
} from 'lucide-react'
import { Dropdown } from '@/components/ui/overlay'
import { FormSwitch } from '@/components/ui/form'
import { Modal } from '@/components/ui/Modal'
import { useThemeStore, type ThemeMode } from '@/store/useThemeStore'
import { useOrdersStore } from '@/store/useOrdersStore'
import { useToastStore } from '@/store/useToastStore'
import { normalizeSnapshot } from '@/domain/ledger'
import { readImportFile } from '@/domain/excel'
import { applyImport, planImport, type ImportPlan } from '@/domain/import-plan'
import { CatalogEditor } from './CatalogEditor'
import { feePercentLabel } from '@/domain/money'
import type { Platform } from '@/domain/order'
import { exportCsv, exportXlsx } from '@/domain/export'
import { AuthModal } from '@/components/auth/AuthModal'
import { useAuthStore } from '@/store/useAuthStore'

const themeLabels: Record<ThemeMode, string> = {
  system: '跟随系统',
  dark: '深色模式',
  light: '浅色模式',
}

const BACKUP_KEY = 'hoshimi.lastBackupAt'
const APP_VERSION = __APP_VERSION__

export default function Settings() {
  const theme = useThemeStore((s) => s.mode)
  const setTheme = useThemeStore((s) => s.setMode)
  const [devMode, setDevMode] = useState(false)
  const getSnapshot = useOrdersStore((s) => s.getSnapshot)
  const replaceSnapshot = useOrdersStore((s) => s.replaceSnapshot)
  const addToast = useToastStore((s) => s.addToast)
  const fileRef = useRef<HTMLInputElement>(null)
  const importRef = useRef<HTMLInputElement>(null)
  const [lastBackup, setLastBackup] = useState<string | null>(() => {
    try {
      return localStorage.getItem(BACKUP_KEY)
    } catch {
      return null
    }
  })
  const [importPlan, setImportPlan] = useState<ImportPlan | null>(null)
  const [importName, setImportName] = useState('')
  const [importReading, setImportReading] = useState(false)
  const [updateHint, setUpdateHint] = useState<string | null>(null)

  const downloadBackup = () => {
    const snap = getSnapshot()
    const blob = new Blob([JSON.stringify({ ledger: snap }, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
    a.href = url
    a.download = `hoshimi-backup-${stamp}.json`
    a.click()
    URL.revokeObjectURL(url)
    const now = new Date().toISOString()
    try {
      localStorage.setItem(BACKUP_KEY, now)
    } catch {
      /* ignore */
    }
    setLastBackup(now)
    addToast({
      type: 'success',
      message: `已下载备份（${snap.orders.length} 单 · ${snap.customers.length} 客户）`,
    })
  }

  const onPickRestore = async (file: File | null) => {
    if (!file) return
    try {
      const text = await file.text()
      const parsed = JSON.parse(text) as { ledger?: unknown } | unknown
      const raw =
        parsed && typeof parsed === 'object' && 'ledger' in (parsed as object)
          ? (parsed as { ledger: unknown }).ledger
          : parsed
      const next = normalizeSnapshot(raw)
      if (!next) {
        addToast({ type: 'error', message: '无法读取该备份文件' })
        return
      }
      const ok = await Modal.confirm({
        title: '从备份还原？',
        content: `此备份包含 ${next.orders.length} 单、${next.customers.length} 位客户，将覆盖本设备当前的账本。此操作无法撤销。`,
        okText: '还原',
        tone: 'danger',
      })
      if (!ok) return
      replaceSnapshot(next)
      addToast({ type: 'success', message: '已从备份还原' })
    } catch {
      addToast({ type: 'error', message: '无法读取该备份文件' })
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const onPickImport = async (file: File | null) => {
    if (!file) return
    setImportReading(true)
    setImportName(file.name)
    try {
      const rows = await readImportFile(file)
      if (!rows.length) {
        addToast({
          type: 'error',
          message: '未找到订单。Excel 需含「普通单」「托管」表；CSV 需有昵称/项目/价格列。',
        })
        setImportPlan(null)
        return
      }
      const plan = planImport(getSnapshot(), rows)
      setImportPlan(plan)
    } catch {
      addToast({ type: 'error', message: '无法读取该文件，请用 .xlsx 或 .csv' })
      setImportPlan(null)
    } finally {
      setImportReading(false)
      if (importRef.current) importRef.current.value = ''
    }
  }

  const confirmImport = () => {
    if (!importPlan || importPlan.writeCount === 0) {
      setImportPlan(null)
      return
    }
    const next = applyImport(getSnapshot(), importPlan)
    replaceSnapshot(next)
    addToast({
      type: 'success',
      message: `已导入 ${importPlan.writeCount} 单` +
        (importPlan.skipCount ? `，跳过重复 ${importPlan.skipCount}` : ''),
    })
    setImportPlan(null)
    setImportName('')
  }

  const lastLabel = lastBackup
    ? new Date(lastBackup).toLocaleString('zh-CN', {
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null

  return (
    <div className="ds-page">
      <PageHeader title="设置" description="外观、项目目录、导入导出与备份" />

      <div className="flex flex-col gap-6">
        <SettingGroup title="通用">
        <SettingRow icon={Palette} title="外观" description="选择应用的颜色主题">
          <Dropdown
            trigger={
              <button type="button" className="btn-base btn-secondary btn--sm w-32 !justify-between">
                {theme === 'system' && <Monitor size={14} />}
                {theme === 'dark' && <Moon size={14} />}
                {theme === 'light' && <Sun size={14} />}
                <span className="inline-flex items-center gap-2">{themeLabels[theme]}</span>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="opacity-60">
                  <path
                    d="M2 3.5L5 6.5L8 3.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            }
            items={[
              { key: 'system', label: '跟随系统', icon: Monitor },
              { key: 'dark', label: '深色模式', icon: Moon },
              { key: 'light', label: '浅色模式', icon: Sun },
            ]}
            onSelect={(k) => setTheme(k as ThemeMode)}
          />
        </SettingRow>

        <SettingRow icon={Code2} title="开发模式" description="显示调试信息和开发者工具入口">
          <FormSwitch checked={devMode} onChange={setDevMode} />
        </SettingRow>
        </SettingGroup>

        <CloudSyncSection />

        <CatalogEditor />

        <ChannelFeesSection />

        <ExpiryOffsetsSection />

        <SettingGroup title="数据">
        <SettingRow
          icon={FileDown}
          title="导出表格"
          description="把当前账本导出为 Excel（普通单 / 托管单 / 客户）或 CSV。退款、取消的到手为 —。"
        >
          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              className="btn-base btn-secondary btn--sm"
              onClick={() => {
                const snap = getSnapshot()
                void exportXlsx({ orders: snap.orders, customers: snap.customers })
                  .then(() =>
                    addToast({
                      type: 'success',
                      message: `已导出 Excel（${snap.orders.length} 单 · ${snap.customers.filter((c) => !c.mergedIntoId).length} 客户）`,
                    }),
                  )
                  .catch(() => addToast({ type: 'error', message: '导出失败' }))
              }}
            >
              <Download size={14} className="shrink-0" />
              导出 Excel
            </button>
            <button
              type="button"
              className="btn-base btn-secondary btn--sm"
              onClick={() => {
                const snap = getSnapshot()
                exportCsv(snap.orders)
                addToast({ type: 'success', message: `已导出 CSV（${snap.orders.length} 单）` })
              }}
            >
              <Download size={14} className="shrink-0" />
              导出 CSV
            </button>
          </div>
        </SettingRow>

        <SettingRow
          icon={FileSpreadsheet}
          title="从表格导入订单"
          description={
            importReading
              ? '正在读取…'
              : importName && importPlan
                ? `已读取：${importName}，请在预览中确认`
                : '支持 .xlsx / .csv。列：昵称、手机号、项目、价格、是否完单、平台等。确认前不会写入。'
          }
        >
          <button
            type="button"
            className="btn-base btn-secondary btn--sm"
            disabled={importReading}
            onClick={() => importRef.current?.click()}
          >
            <Upload size={14} />
            {importPlan ? '重新选择' : '选择文件'}
          </button>
          <input
            ref={importRef}
            type="file"
            accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
            className="hidden"
            onChange={(e) => void onPickImport(e.target.files?.[0] ?? null)}
          />
        </SettingRow>

        <SettingRow
          icon={Database}
          title="缓存与数据"
          description={
            lastLabel
              ? `上次备份：${lastLabel}。更换设备前请先下载备份。`
              : '账本仅保存在本设备。更换设备或清缓存前请先下载备份。'
          }
        >
          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              className="btn-base btn-primary btn--sm"
              onClick={downloadBackup}
            >
              <Download size={14} className="shrink-0" />
              备份数据
            </button>
            <button
              type="button"
              className="btn-base btn-secondary btn--sm"
              onClick={() => fileRef.current?.click()}
            >
              <Upload size={14} />
              恢复数据
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => void onPickRestore(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              className="btn-base btn-ghost btn--sm"
              onClick={() =>
                addToast({ type: 'info', message: '缓存清理暂未接入，账本请用备份/还原' })
              }
            >
              <Trash2 size={14} />
              清理缓存
            </button>
          </div>
        </SettingRow>
        </SettingGroup>

        <SettingGroup title="关于">
        <SettingRow
          icon={RefreshCw}
          title="检查更新"
          description="桌面端自动更新将接入 electron-updater；当前为占位。网页版请刷新浏览器。"
        >
          <button
            type="button"
            className="btn-base btn-secondary btn--sm"
            onClick={() => {
              setUpdateHint('已是最新')
              addToast({ type: 'success', message: `当前已是最新版本 v${APP_VERSION}` })
              window.setTimeout(() => setUpdateHint(null), 2500)
            }}
          >
            <RefreshCw size={14} />
            {updateHint ?? '检查更新'}
          </button>
        </SettingRow>

        <SettingRow
          icon={Info}
          title="关于星笺"
          description="本地代肝订单管理 · 数据仅存本机"
        >
          <span className="inline-flex h-6 items-center rounded-md bg-secondary px-2 text-xs font-medium text-muted-foreground tabular-nums">
            v{APP_VERSION}
          </span>
        </SettingRow>
        </SettingGroup>
      </div>

      <Modal
        isOpen={Boolean(importPlan)}
        onClose={() => {
          setImportPlan(null)
          setImportName('')
        }}
        title="导入预览"
        className="max-w-2xl"
        footer={
          <>
            <button
              type="button"
              className="btn-base btn-secondary"
              onClick={() => {
                setImportPlan(null)
                setImportName('')
              }}
            >
              取消
            </button>
            <button
              type="button"
              className="btn-base btn-primary"
              disabled={!importPlan || importPlan.writeCount === 0}
              onClick={confirmImport}
            >
              确认导入 {importPlan ? `${importPlan.writeCount} 单` : ''}
            </button>
          </>
        }
      >
        {importPlan ? <ImportPreviewBody plan={importPlan} fileName={importName} /> : null}
      </Modal>
    </div>
  )
}

function ImportPreviewBody({ plan, fileName }: { plan: ImportPlan; fileName: string }) {
  return (
    <div className="flex flex-col gap-4 text-sm">
      <p className="ds-caption">
        文件：{fileName || '未命名'} · 确认前尚未写入账本
      </p>
      <div className="grid grid-cols-4 divide-x divide-border rounded-lg border border-border">
        <Mini label="将写入" value={`${plan.writeCount} 单`} strong />
        <Mini label="新客户" value={`${plan.newCustomerCount} 位`} />
        <Mini label="跳过重复" value={`${plan.skipCount} 单`} />
        <Mini label="无法识别" value={`${plan.errorCount} 行`} />
      </div>
      {plan.zeroCount ? (
        <p className="text-xs text-muted-foreground">另有 {plan.zeroCount} 行 0 元，不导入。</p>
      ) : null}
      {plan.missingTimeCount ? (
        <p className="rounded-lg bg-secondary/50 px-3 py-2 text-xs text-muted-foreground">
          有 {plan.missingTimeCount} 行缺下单时间，将按表格顺序用导入时间补齐。
        </p>
      ) : null}
      {plan.newServers.length ? (
        <p className="text-xs text-muted-foreground">
          将新增服务器：{plan.newServers.join('、')}
        </p>
      ) : null}
      <div className="max-h-72 overflow-auto rounded-lg border border-border">
        <table className="dd-table dd-table--compact">
          <colgroup>
            <col style={{ width: 72 }} />
            <col style={{ width: 56 }} />
            <col style={{ width: 104 }} />
            <col />
            <col style={{ width: 96 }} />
            <col style={{ width: 128 }} />
          </colgroup>
          <thead className="sticky top-0 z-10">
            <tr>
              {['表', '行', '客户', '项目', '金额', '结果'].map((h) => (
                <th key={h} className={h === '金额' || h === '行' ? 'dd-table__num' : undefined}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {plan.rows.slice(0, 80).map((row) => (
              <tr key={`${row.sheet}-${row.rowNumber}`}>
                <td className="whitespace-nowrap">{row.sheet}</td>
                <td className="dd-table__num">{row.rowNumber}</td>
                <td className="whitespace-nowrap">{row.nickname || '—'}</td>
                <td>
                  {row.items.map((i) => i.product).join(' + ') || row.project || '—'}
                </td>
                <td className="dd-table__num">{row.amount.toFixed(2)}</td>
                <td className="truncate">
                  {row.disposition === 'write'
                    ? '写入'
                    : row.disposition === 'skip-duplicate'
                      ? '跳过（已导入）'
                      : row.disposition === 'skip-zero'
                        ? '不导入'
                        : row.error}
                  {row.warnings.length ? ` · ${row.warnings.join('；')}` : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {plan.rows.length > 80 ? (
          <p className="px-6 py-2 ds-caption border-t border-border">
            仅显示前 80 行，共 {plan.rows.length} 行
          </p>
        ) : null}
      </div>
    </div>
  )
}

function Mini({
  label,
  value,
  strong,
}: {
  label: string
  value: string
  strong?: boolean
}) {
  return (
    <div className="flex flex-col gap-1 px-4 py-3">
      <div className="ds-caption">{label}</div>
      <div className={`text-base leading-6 tabular-nums ${strong ? 'font-semibold text-brand' : 'font-medium text-foreground'}`}>
        {value}
      </div>
    </div>
  )
}

function SettingRow({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-[72px] items-center justify-between gap-6 px-6 py-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="size-9 rounded-lg bg-brand/10 text-brand flex items-center justify-center shrink-0">
          <Icon size={16} />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-medium leading-5 text-foreground">{title}</h3>
          {description && (
            <p className="ds-caption mt-0.5 line-clamp-2">{description}</p>
          )}
        </div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

function SettingGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="ds-section-title px-1">{title}</h2>
      <div className="ds-card divide-y divide-border overflow-hidden">{children}</div>
    </section>
  )
}

function CloudSyncSection() {
  const configured = useAuthStore((s) => s.configured)
  const user = useAuthStore((s) => s.user)
  const syncing = useAuthStore((s) => s.syncing)
  const lastSyncAt = useAuthStore((s) => s.lastSyncAt)
  const lastSyncError = useAuthStore((s) => s.lastSyncError)
  const syncNow = useAuthStore((s) => s.syncNow)
  const signOut = useAuthStore((s) => s.signOut)
  const addToast = useToastStore((s) => s.addToast)
  const [authOpen, setAuthOpen] = useState(false)

  if (!configured) {
    return (
      <SettingGroup title="云同步">
        <SettingRow
          icon={CloudOff}
          title="未配置云端"
          description="缺少 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY，当前仅本机存储。"
        >
          <span className="text-xs text-muted-foreground">本地模式</span>
        </SettingRow>
      </SettingGroup>
    )
  }

  const syncLabel = lastSyncError
    ? `同步出错：${lastSyncError}`
    : lastSyncAt
      ? `上次同步：${new Date(lastSyncAt).toLocaleString('zh-CN', { hour12: false })}`
      : user
        ? '登录后可手动同步，或改动账本后自动推送'
        : '登录后可跨设备同步账本；也可继续仅用本机'

  return (
    <SettingGroup title="云同步">
      <SettingRow
        icon={Cloud}
        title={user ? `已登录 · ${user.email ?? user.id.slice(0, 8)}` : '邮箱登录'}
        description={syncLabel}
      >
        <div className="flex items-center gap-2 justify-end">
          {user ? (
            <>
              <button
                type="button"
                className="btn-base btn-secondary btn--sm"
                disabled={syncing}
                onClick={() => {
                  void syncNow().then((res) => {
                    if (res.ok) {
                      const map: Record<string, string> = {
                        pulled: '已从云端拉取较新账本',
                        pushed: '已推送到云端',
                        noop: '已与云端一致',
                      }
                      addToast({ type: 'success', message: map[res.action] ?? '同步完成' })
                    } else {
                      addToast({ type: 'error', message: res.error })
                    }
                  })
                }}
              >
                <RefreshCw size={14} className={syncing ? 'animate-spin' : undefined} />
                {syncing ? '同步中…' : '立即同步'}
              </button>
              <button
                type="button"
                className="btn-base btn-ghost btn--sm"
                onClick={() => {
                  void signOut().then(() =>
                    addToast({ type: 'info', message: '已退出登录，本机数据保留' }),
                  )
                }}
              >
                <LogOut size={14} />
                退出
              </button>
            </>
          ) : (
            <button
              type="button"
              className="btn-base btn-primary btn--sm"
              onClick={() => setAuthOpen(true)}
            >
              <LogIn size={14} />
              登录 / 注册
            </button>
          )}
        </div>
      </SettingRow>
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </SettingGroup>
  )
}


function ChannelFeesSection() {
  const fees = useOrdersStore((s) => s.channelFees)
  const setChannelFee = useOrdersStore((s) => s.setChannelFee)
  const addToast = useToastStore((s) => s.addToast)
  const [drafts, setDrafts] = useState<Record<string, number | null>>({})

  return (
    <SettingGroup title="渠道费率">
      <SettingRow
        icon={Percent}
        title="手续费费率"
        description="手续费 = 金额 × 费率。修改只影响之后新存的订单，旧单按保存时的费率。"
      >
        <div className="flex flex-wrap items-center gap-2 justify-end">
          {fees.map((fee) => {
            const pct = drafts[fee.platform] ?? Math.round(fee.rate * 10000) / 100
            return (
              <label
                key={fee.platform}
                className="flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm"
              >
                <span className="shrink-0 font-medium text-muted-foreground">{fee.platform}</span>
                <input
                  className="w-14 bg-transparent text-right outline-none tabular-nums"
                  inputMode="decimal"
                  aria-label={`${fee.platform}费率（%）`}
                  value={pct ?? ''}
                  onChange={(e) => {
                    const v = e.target.value.trim()
                    if (v === '' || v === '.') {
                      setDrafts((d) => ({ ...d, [fee.platform]: null }))
                      return
                    }
                    const n = Number(v)
                    if (!Number.isFinite(n)) return
                    setDrafts((d) => ({ ...d, [fee.platform]: n }))
                  }}
                  onBlur={() => {
                    const raw = drafts[fee.platform]
                    const pctVal = raw === undefined ? Math.round(fee.rate * 10000) / 100 : raw
                    if (pctVal == null || !Number.isFinite(pctVal) || pctVal < 0 || pctVal >= 100) {
                      addToast({ type: 'error', message: '费率须为 0–100 之间的百分比' })
                      setDrafts((d) => {
                        const next = { ...d }
                        delete next[fee.platform]
                        return next
                      })
                      return
                    }
                    const rate = Math.round(pctVal * 100) / 10000
                    setChannelFee(fee.platform as Platform, rate)
                    setDrafts((d) => {
                      const next = { ...d }
                      delete next[fee.platform]
                      return next
                    })
                    addToast({
                      type: 'success',
                      message: `${fee.platform}费率已设为 ${feePercentLabel(rate)}`,
                    })
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                  }}
                />
                <span className="shrink-0 text-muted-foreground">%</span>
              </label>
            )
          })}
        </div>
      </SettingRow>
    </SettingGroup>
  )
}

function ExpiryOffsetsSection() {
  const offsets = useOrdersStore((s) => s.settings.expiryOffsets)
  const updateSettings = useOrdersStore((s) => s.updateSettings)
  return (
    <SettingGroup title="托管提醒">
      <SettingRow
        icon={Info}
        title="到期提醒"
        description="距结束日不超过所选天数的托管单，会出现在待办和概览。"
      >
        <div className="flex items-center gap-2 justify-end">
          {[1, 3, 7].map((day) => {
            const on = offsets.includes(day)
            return (
              <button
                key={day}
                type="button"
                className={`btn-base btn--sm ${on ? 'btn-primary' : 'btn-secondary'}`}
                aria-pressed={on}
                onClick={() =>
                  updateSettings({
                    expiryOffsets: on
                      ? offsets.filter((d) => d !== day)
                      : [...offsets, day].sort((a, b) => a - b),
                  })
                }
              >
                提前 {day} 天
              </button>
            )
          })}
        </div>
      </SettingRow>
    </SettingGroup>
  )
}

