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
  Info,
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
    <div className="space-y-6 max-w-4xl mx-auto pb-10 px-4 md:px-8 pt-4">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-border/40">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Palette size={20} className="text-brand" />
            <span>设置</span>
          </h1>
          <p className="text-sm text-muted-foreground">自定义应用体验与项目目录</p>
        </div>
        <div className="text-right hidden md:block opacity-60">
          <span className="text-xs font-medium text-muted-foreground">星笺</span>
          <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-secondary text-secondary-foreground">
            v{APP_VERSION}
          </span>
        </div>
      </header>

      <div className="space-y-4">
        <SettingRow icon={Palette} title="外观" description="选择应用的颜色主题">
          <Dropdown
            trigger={
              <button type="button" className="btn-secondary btn--sm inline-flex items-center gap-1.5">
                {theme === 'system' && <Monitor size={14} />}
                {theme === 'dark' && <Moon size={14} />}
                {theme === 'light' && <Sun size={14} />}
                {themeLabels[theme]}
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

        <CatalogEditor />

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
            className="btn-secondary btn--sm inline-flex items-center gap-1.5"
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
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button
              type="button"
              className="btn-primary btn--sm inline-flex items-center gap-1.5"
              onClick={downloadBackup}
            >
              <Download size={14} />
              备份数据
            </button>
            <button
              type="button"
              className="btn-secondary btn--sm inline-flex items-center gap-1.5"
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
              className="btn-ghost btn--sm inline-flex items-center gap-1.5"
              onClick={() =>
                addToast({ type: 'info', message: '缓存清理暂未接入，账本请用备份/还原' })
              }
            >
              <Trash2 size={14} />
              清理缓存
            </button>
          </div>
        </SettingRow>

        <SettingRow
          icon={Info}
          title="关于星笺"
          description="本地代肝订单管理 · 数据仅存本机"
        >
          <span className="text-xs font-medium text-muted-foreground tabular-nums">
            v{APP_VERSION}
          </span>
        </SettingRow>
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
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn-secondary btn--sm"
              onClick={() => {
                setImportPlan(null)
                setImportName('')
              }}
            >
              取消
            </button>
            <button
              type="button"
              className="btn-primary btn--sm"
              disabled={!importPlan || importPlan.writeCount === 0}
              onClick={confirmImport}
            >
              确认导入 {importPlan ? `${importPlan.writeCount} 单` : ''}
            </button>
          </div>
        }
      >
        {importPlan ? <ImportPreviewBody plan={importPlan} fileName={importName} /> : null}
      </Modal>
    </div>
  )
}

function ImportPreviewBody({ plan, fileName }: { plan: ImportPlan; fileName: string }) {
  return (
    <div className="space-y-3 text-sm">
      <p className="text-muted-foreground text-xs">
        文件：{fileName || '未命名'} · 确认前尚未写入账本
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
      <div className="max-h-64 overflow-auto rounded-lg border border-border/50">
        <table className="w-full min-w-[28rem] text-left text-xs">
          <thead className="sticky top-0 bg-card text-muted-foreground">
            <tr>
              {['表', '行', '客户', '项目', '金额', '结果'].map((h) => (
                <th key={h} className="px-2 py-2 font-bold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {plan.rows.slice(0, 80).map((row) => (
              <tr key={`${row.sheet}-${row.rowNumber}`} className="border-t border-border/40 align-top">
                <td className="px-2 py-1.5 whitespace-nowrap">{row.sheet}</td>
                <td className="px-2 py-1.5">{row.rowNumber}</td>
                <td className="px-2 py-1.5 whitespace-nowrap">{row.nickname || '—'}</td>
                <td className="px-2 py-1.5">
                  {row.items.map((i) => i.product).join(' + ') || row.project || '—'}
                </td>
                <td className="px-2 py-1.5 tabular-nums">{row.amount.toFixed(2)}</td>
                <td className="px-2 py-1.5">
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
          <p className="px-2 py-2 text-xs text-muted-foreground border-t border-border/40">
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
    <div className="rounded-lg border border-border/50 bg-secondary/30 px-3 py-2">
      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className={`mt-0.5 tabular-nums ${strong ? 'font-bold text-foreground' : 'text-foreground'}`}>
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
    <div className="bg-card border border-border/50 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3.5 min-w-0">
        <div className="w-9 h-9 rounded-full bg-brand/10 text-brand flex items-center justify-center shrink-0">
          <Icon size={16} />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-foreground">{title}</h3>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{description}</p>
          )}
        </div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}
