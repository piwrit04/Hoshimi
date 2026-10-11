import { useState } from 'react'
import { Cloud, Loader2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { FormInput } from '@/components/ui/form'
import { useAuthStore } from '@/store/useAuthStore'
import { useToastStore } from '@/store/useToastStore'

type Mode = 'signin' | 'signup'

export function AuthModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean
  onClose: () => void
}) {
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const signIn = useAuthStore((s) => s.signIn)
  const signUp = useAuthStore((s) => s.signUp)
  const setSkipCloud = useAuthStore((s) => s.setSkipCloud)
  const addToast = useToastStore((s) => s.addToast)

  const reset = () => {
    setError(null)
    setPassword('')
  }

  const submit = async () => {
    setError(null)
    const e = email.trim()
    if (!e || !e.includes('@')) {
      setError('请输入有效邮箱')
      return
    }
    if (password.length < 6) {
      setError('密码至少 6 位')
      return
    }
    setBusy(true)
    try {
      if (mode === 'signin') {
        const res = await signIn(e, password)
        if (!res.ok) {
          setError(res.error)
          return
        }
        addToast({ type: 'success', message: '已登录，正在同步账本…' })
        onClose()
        reset()
      } else {
        const res = await signUp(e, password)
        if (!res.ok) {
          setError(res.error)
          return
        }
        if (res.needsConfirm) {
          addToast({
            type: 'info',
            message: '注册成功，请到邮箱点确认链接后再登录',
          })
          setMode('signin')
          reset()
        } else {
          addToast({ type: 'success', message: '注册并登录成功' })
          onClose()
          reset()
        }
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <span className="inline-flex items-center gap-2">
          <Cloud size={18} className="text-brand" />
          {mode === 'signin' ? '登录云同步' : '注册账号'}
        </span>
      }
      className="dd-auth-modal max-w-md"
      footer={
        <>
          <button
            type="button"
            className="btn-base btn-ghost"
            disabled={busy}
            onClick={() => {
              setSkipCloud(true)
              onClose()
              addToast({ type: 'info', message: '已跳过云同步，仅使用本机数据' })
            }}
          >
            仅用本地
          </button>
          <button
            type="button"
            className="btn-base btn-primary"
            disabled={busy}
            onClick={() => void submit()}
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : null}
            {mode === 'signin' ? '登录' : '注册'}
          </button>
        </>
      }
    >
      <div className="dd-auth-modal__body flex flex-col gap-4">
        <p className="ds-caption">
          登录后账本会同步到云端；断网时仍可读写本机，联网后再合并（较新覆盖较旧）。
        </p>
        <FormInput
          label="邮箱"
          required
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(ev) => setEmail(ev.target.value)}
          disabled={busy}
        />
        <FormInput
          label="密码"
          required
          type="password"
          autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          placeholder="至少 6 位"
          value={password}
          onChange={(ev) => setPassword(ev.target.value)}
          disabled={busy}
          onKeyDown={(ev) => {
            if (ev.key === 'Enter') void submit()
          }}
        />
        {error ? (
          <p className="text-xs text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          {mode === 'signin' ? (
            <>
              还没有账号？{' '}
              <button
                type="button"
                className="text-brand underline-offset-2 hover:underline"
                onClick={() => {
                  setMode('signup')
                  setError(null)
                }}
              >
                注册
              </button>
            </>
          ) : (
            <>
              已有账号？{' '}
              <button
                type="button"
                className="text-brand underline-offset-2 hover:underline"
                onClick={() => {
                  setMode('signin')
                  setError(null)
                }}
              >
                登录
              </button>
            </>
          )}
        </p>
      </div>
    </Modal>
  )
}
