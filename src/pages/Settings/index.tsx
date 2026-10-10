import { useState } from 'react'
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
} from 'lucide-react'
import { Dropdown } from '@/components/ui/overlay'
import { FormSwitch } from '@/components/ui/form'
import { useThemeStore, type ThemeMode } from '@/store/useThemeStore'
import { CatalogEditor } from './CatalogEditor'

const themeLabels: Record<ThemeMode, string> = {
  system: '跟随系统',
  dark: '深色模式',
  light: '浅色模式',
}

export default function Settings() {
  const theme = useThemeStore((s) => s.mode)
  const setTheme = useThemeStore((s) => s.setMode)
  const [devMode, setDevMode] = useState(false)

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
            v0.1.0
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

        <SettingRow icon={Database} title="缓存与数据" description="管理本地数据和缓存文件">
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button type="button" className="btn-primary btn--sm inline-flex items-center gap-1.5">
              <Download size={14} />
              备份数据
            </button>
            <button type="button" className="btn-secondary btn--sm inline-flex items-center gap-1.5">
              <Upload size={14} />
              恢复数据
            </button>
            <button type="button" className="btn-ghost btn--sm inline-flex items-center gap-1.5">
              <Trash2 size={14} />
              清理缓存
            </button>
          </div>
        </SettingRow>
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
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{description}</p>
          )}
        </div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}
