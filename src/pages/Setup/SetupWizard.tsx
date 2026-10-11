import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  ChevronRight,
  Cloud,
  CloudOff,
  Database,
  Monitor,
  Moon,
  Sparkles,
  Sun,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { FormSegmentedControl } from '@/components/ui/form'
import { AuthModal } from '@/components/auth/AuthModal'
import { useThemeStore, type ThemeMode } from '@/store/useThemeStore'
import { useSetupStore } from '@/store/useSetupStore'
import { useAuthStore } from '@/store/useAuthStore'
import { useOrdersStore } from '@/store/useOrdersStore'
import { useToastStore } from '@/store/useToastStore'

const STEPS = [
  { id: 'welcome', title: '欢迎' },
  { id: 'appearance', title: '外观' },
  { id: 'cloud', title: '云同步' },
  { id: 'demo', title: '演示数据' },
] as const

type CloudChoice = 'yes' | 'skip' | null
type DemoChoice = 'seed' | 'blank' | null

export default function SetupWizard() {
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()
  const mode = useThemeStore((s) => s.mode)
  const setMode = useThemeStore((s) => s.setMode)
  const completeSetup = useSetupStore((s) => s.completeSetup)
  const armWizardSession = useSetupStore((s) => s.armWizardSession)
  const configured = useAuthStore((s) => s.configured)
  const user = useAuthStore((s) => s.user)
  const setSkipCloud = useAuthStore((s) => s.setSkipCloud)
  const orderCount = useOrdersStore((s) => s.orders.length)
  const customerCount = useOrdersStore((s) => s.customers.length)
  const replaceSnapshot = useOrdersStore((s) => s.replaceSnapshot)
  const addToast = useToastStore((s) => s.addToast)

  const ledgerEmpty = orderCount === 0 && customerCount === 0

  const [step, setStep] = useState(0)
  const [cloudChoice, setCloudChoice] = useState<CloudChoice>(user ? 'yes' : null)
  const [demoChoice, setDemoChoice] = useState<DemoChoice>(ledgerEmpty ? null : 'blank')
  const [authOpen, setAuthOpen] = useState(false)
  const [finishing, setFinishing] = useState(false)

  /* 一旦进入引导页就抑制「有账本自动完成」，避免灌演示/重开后刷新被踢出 */
  useEffect(() => {
    armWizardSession()
  }, [armWizardSession])

  const canNext = useMemo(() => {
    if (step === 2) {
      if (!configured) return true
      if (user) return true
      return cloudChoice !== null
    }
    if (step === 3) {
      if (!ledgerEmpty) return true
      return demoChoice !== null
    }
    return true
  }, [step, configured, user, cloudChoice, ledgerEmpty, demoChoice])

  const slide = reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { x: 24, opacity: 0 },
        animate: { x: 0, opacity: 1 },
        exit: { x: -24, opacity: 0 },
      }

  const finish = async () => {
    if (finishing) return
    setFinishing(true)
    try {
      if (configured && cloudChoice === 'skip' && !user) {
        setSkipCloud(true)
      }
      if (ledgerEmpty && demoChoice === 'seed') {
        const { buildFixtureSnapshot } = await import('@/domain/fixtures')
        replaceSnapshot(buildFixtureSnapshot())
        addToast({ type: 'success', message: '已灌入演示账本，可随时在设置里备份或清空' })
        await new Promise((r) => setTimeout(r, 350))
      }
      completeSetup()
      navigate('/dashboard', { replace: true })
    } finally {
      setFinishing(false)
    }
  }

  const goNext = () => {
    if (step < STEPS.length - 1) setStep((s) => s + 1)
    else void finish()
  }

  const goBack = () => setStep((s) => Math.max(0, s - 1))

  return (
    <div className="dd-setup">
      <motion.div
        className="dd-setup__shell"
        initial={reduceMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="dd-setup__brand">
          <div className="dd-setup__mark" aria-hidden>
            星
          </div>
          <h1 className="dd-setup__title">欢迎使用星笺</h1>
          <p className="dd-setup__subtitle">几步搞定，本地账本马上能用</p>
        </div>

        <StepDots current={step} reduceMotion={!!reduceMotion} />

        <div className="dd-setup__card">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              className="dd-setup__pane"
              initial={slide.initial}
              animate={slide.animate}
              exit={slide.exit}
              transition={{ duration: reduceMotion ? 0.15 : 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              {step === 0 && <WelcomeStep />}
              {step === 1 && (
                <AppearanceStep mode={mode} onChange={setMode} />
              )}
              {step === 2 && (
                <CloudStep
                  configured={configured}
                  userEmail={user?.email ?? null}
                  choice={cloudChoice}
                  onChoice={(c) => {
                    setCloudChoice(c)
                    if (c === 'yes' && !user && configured) setAuthOpen(true)
                    if (c === 'skip') setSkipCloud(true)
                  }}
                  onOpenAuth={() => setAuthOpen(true)}
                />
              )}
              {step === 3 && (
                <DemoStep
                  ledgerEmpty={ledgerEmpty}
                  orderCount={orderCount}
                  choice={demoChoice}
                  onChoice={setDemoChoice}
                />
              )}
            </motion.div>
          </AnimatePresence>

          <div className="dd-setup__footer">
            <button
              type="button"
              className={cn('btn-base btn-ghost', step === 0 && 'invisible')}
              onClick={goBack}
              tabIndex={step === 0 ? -1 : 0}
            >
              上一步
            </button>
            <button
              type="button"
              className="btn-base btn-primary"
              disabled={!canNext || finishing}
              onClick={goNext}
            >
              {step === STEPS.length - 1 ? (finishing ? '进入中…' : '进入星笺') : '下一步'}
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </motion.div>

      <AuthModal
        isOpen={authOpen}
        onClose={() => {
          setAuthOpen(false)
          if (useAuthStore.getState().user) setCloudChoice('yes')
        }}
      />
    </div>
  )
}

function StepDots({ current, reduceMotion }: { current: number; reduceMotion: boolean }) {
  return (
    <div className="dd-setup__dots" role="list" aria-label="引导步骤">
      {STEPS.map((s, i) => (
        <div key={s.id} className="dd-setup__dot-wrap" role="listitem">
          <div
            className={cn(
              'dd-setup__dot',
              i === current && 'dd-setup__dot--current',
              i < current && 'dd-setup__dot--done',
              i === current && !reduceMotion && 'dd-setup__dot--breathe',
            )}
            title={s.title}
          >
            <span className="sr-only">
              {s.title}
              {i === current ? '（当前）' : i < current ? '（已完成）' : ''}
            </span>
          </div>
          {i < STEPS.length - 1 ? (
            <div
              className={cn(
                'dd-setup__line',
                i < current && 'dd-setup__line--done',
                i === current && !reduceMotion && 'dd-setup__line--breathe',
              )}
            />
          ) : null}
        </div>
      ))}
    </div>
  )
}

function WelcomeStep() {
  return (
    <div className="dd-setup__welcome">
      <div className="dd-setup__welcome-icon">
        <Sparkles size={28} />
      </div>
      <h2 className="dd-setup__heading">星笺 · 本地代肝账本</h2>
      <p className="dd-setup__copy">
        订单、客户、托管到期都记在本机 IndexedDB，不强制登录。需要跨设备时再开云同步即可。
      </p>
      <ul className="dd-setup__bullets">
        <li>本机优先，备份导出随时可做</li>
        <li>粉系界面，深浅色随你</li>
        <li>引导可随时在设置里重开，不会清账本</li>
      </ul>
    </div>
  )
}

function AppearanceStep({
  mode,
  onChange,
}: {
  mode: ThemeMode
  onChange: (m: ThemeMode) => void
}) {
  return (
    <div className="dd-setup__appearance">
      <h2 className="dd-setup__heading">
        <Monitor size={22} className="text-brand" />
        外观设置
      </h2>
      <p className="dd-setup__copy">选好立刻预览，之后也能在设置里改。</p>

      <FormSegmentedControl
        value={mode}
        onChange={(v) => onChange(v as ThemeMode)}
        options={[
          { value: 'system', label: '系统' },
          { value: 'light', label: '浅色' },
          { value: 'dark', label: '深色' },
        ]}
      />

      <div className="dd-setup__theme-previews">
        <ThemePreviewCard
          active={mode === 'light'}
          label="浅色"
          hint="清爽日间"
          icon={Sun}
          variant="light"
          onClick={() => onChange('light')}
        />
        <ThemePreviewCard
          active={mode === 'dark'}
          label="深色"
          hint="夜间舒适"
          icon={Moon}
          variant="dark"
          onClick={() => onChange('dark')}
        />
        <ThemePreviewCard
          active={mode === 'system'}
          label="跟随系统"
          hint="自动切换"
          icon={Monitor}
          variant="system"
          onClick={() => onChange('system')}
        />
      </div>
    </div>
  )
}

function ThemePreviewCard({
  active,
  label,
  hint,
  icon: Icon,
  variant,
  onClick,
}: {
  active: boolean
  label: string
  hint: string
  icon: typeof Sun
  variant: 'light' | 'dark' | 'system'
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn('dd-setup__theme-card', active && 'dd-setup__theme-card--active')}
    >
      <div
        className={cn(
          'dd-setup__theme-swatch',
          variant === 'light' && 'dd-setup__theme-swatch--light',
          variant === 'dark' && 'dd-setup__theme-swatch--dark',
          variant === 'system' && 'dd-setup__theme-swatch--system',
        )}
      >
        <Icon size={18} />
      </div>
      <div className="dd-setup__theme-meta">
        <span className="font-semibold text-sm">{label}</span>
        <span className="text-xs text-muted-foreground">{hint}</span>
      </div>
    </button>
  )
}

function CloudStep({
  configured,
  userEmail,
  choice,
  onChoice,
  onOpenAuth,
}: {
  configured: boolean
  userEmail: string | null
  choice: CloudChoice
  onChoice: (c: CloudChoice) => void
  onOpenAuth: () => void
}) {
  if (!configured) {
    return (
      <div className="dd-setup__cloud">
        <h2 className="dd-setup__heading">
          <CloudOff size={22} className="text-brand" />
          云同步
        </h2>
        <p className="dd-setup__copy">
          当前未配置云端密钥，将以<strong>纯本地</strong>模式运行。账本只在本机 IndexedDB；以后配好
          Supabase 可在设置里登录同步。
        </p>
        <div className="dd-setup__info-card">
          <Database size={18} className="text-brand shrink-0" />
          <div>
            <p className="text-sm font-medium">本地账本已就绪</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              不阻断使用；登录与个人中心是后续能力，与本次引导无关。
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (userEmail) {
    return (
      <div className="dd-setup__cloud">
        <h2 className="dd-setup__heading">
          <Cloud size={22} className="text-brand" />
          云同步
        </h2>
        <p className="dd-setup__copy">
          已登录 <span className="font-medium text-foreground">{userEmail}</span>
          ，账本改动会按策略与云端同步。也可稍后在设置里退出。
        </p>
        <div className="dd-setup__info-card dd-setup__info-card--ok">
          <Cloud size={18} className="text-brand shrink-0" />
          <p className="text-sm">云同步已开启</p>
        </div>
      </div>
    )
  }

  return (
    <div className="dd-setup__cloud">
      <h2 className="dd-setup__heading">
        <Cloud size={22} className="text-brand" />
        要不要开云同步？
      </h2>
      <p className="dd-setup__copy">可选。跳过也能完整使用本地账本；之后随时在设置里登录。</p>
      <div className="dd-setup__choice-grid">
        <button
          type="button"
          className={cn('dd-setup__choice', choice === 'yes' && 'dd-setup__choice--active')}
          onClick={() => {
            onChoice('yes')
            onOpenAuth()
          }}
        >
          <Cloud size={22} className="text-brand" />
          <span className="font-semibold">启用并登录</span>
          <span className="text-xs text-muted-foreground">邮箱登录后跨设备同步</span>
        </button>
        <button
          type="button"
          className={cn('dd-setup__choice', choice === 'skip' && 'dd-setup__choice--active')}
          onClick={() => onChoice('skip')}
        >
          <CloudOff size={22} className="text-muted-foreground" />
          <span className="font-semibold">仅本机</span>
          <span className="text-xs text-muted-foreground">稍后再说，不拦着用</span>
        </button>
      </div>
    </div>
  )
}

function DemoStep({
  ledgerEmpty,
  orderCount,
  choice,
  onChoice,
}: {
  ledgerEmpty: boolean
  orderCount: number
  choice: DemoChoice
  onChoice: (c: DemoChoice) => void
}) {
  if (!ledgerEmpty) {
    return (
      <div className="dd-setup__demo">
        <h2 className="dd-setup__heading">
          <Database size={22} className="text-brand" />
          账本里已有数据
        </h2>
        <p className="dd-setup__copy">
          当前约有 {orderCount} 单，重跑引导<strong>不会</strong>清空或覆盖它们。直接进入即可。
        </p>
        <div className="dd-setup__info-card">
          <Database size={18} className="text-brand shrink-0" />
          <p className="text-sm">保持现有账本</p>
        </div>
      </div>
    )
  }

  return (
    <div className="dd-setup__demo">
      <h2 className="dd-setup__heading">
        <Database size={22} className="text-brand" />
        空账本要不要演示数据？
      </h2>
      <p className="dd-setup__copy">可选。演示单方便熟悉界面，之后可在设置里备份或换自己的数据。</p>
      <div className="dd-setup__choice-grid">
        <button
          type="button"
          className={cn('dd-setup__choice', choice === 'seed' && 'dd-setup__choice--active')}
          onClick={() => onChoice('seed')}
        >
          <Sparkles size={22} className="text-brand" />
          <span className="font-semibold">灌入演示数据</span>
          <span className="text-xs text-muted-foreground">几位客户 + 示例订单</span>
        </button>
        <button
          type="button"
          className={cn('dd-setup__choice', choice === 'blank' && 'dd-setup__choice--active')}
          onClick={() => onChoice('blank')}
        >
          <Database size={22} className="text-muted-foreground" />
          <span className="font-semibold">从空白开始</span>
          <span className="text-xs text-muted-foreground">自己记第一单</span>
        </button>
      </div>
    </div>
  )
}
