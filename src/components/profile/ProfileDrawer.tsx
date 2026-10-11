import { useEffect, useState } from 'react'
import {
  ChevronDown,
  Cloud,
  CloudOff,
  LogIn,
  LogOut,
  Pencil,
  RefreshCw,
  UserRound,
} from 'lucide-react'
import { Drawer } from '@/components/ui/overlay'
import { Avatar } from '@/components/ui/data'
import { FormInput } from '@/components/ui/form'
import { AuthModal } from '@/components/auth/AuthModal'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/useAuthStore'
import { useProfileStore, profileInitial } from '@/store/useProfileStore'
import { useToastStore } from '@/store/useToastStore'
import { hydrateProfileFromCloud, pushProfileToCloud } from '@/lib/profile-sync'

export function ProfileDrawer() {
  const open = useProfileStore((s) => s.drawerOpen)
  const close = useProfileStore((s) => s.closeDrawer)
  const nickname = useProfileStore((s) => s.nickname)
  const avatarHue = useProfileStore((s) => s.avatarHue)
  const setNickname = useProfileStore((s) => s.setNickname)
  const setAvatarHue = useProfileStore((s) => s.setAvatarHue)

  const configured = useAuthStore((s) => s.configured)
  const user = useAuthStore((s) => s.user)
  const syncing = useAuthStore((s) => s.syncing)
  const lastSyncAt = useAuthStore((s) => s.lastSyncAt)
  const lastSyncError = useAuthStore((s) => s.lastSyncError)
  const syncNow = useAuthStore((s) => s.syncNow)
  const signOut = useAuthStore((s) => s.signOut)
  const addToast = useToastStore((s) => s.addToast)

  const [editing, setEditing] = useState(false)
  const [draftNick, setDraftNick] = useState(nickname)
  const [saving, setSaving] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)

  useEffect(() => {
    if (open) {
      setDraftNick(nickname)
      setEditing(false)
    }
  }, [open, nickname])

  useEffect(() => {
    if (user?.id) void hydrateProfileFromCloud(user.id, user.email)
  }, [user?.id, user?.email])

  const avatarStyle = {
    backgroundColor: `hsla(${avatarHue}, 70%, 88%, 0.95)`,
    color: `hsl(${avatarHue}, 55%, 38%)`,
  }

  const saveProfile = async () => {
    const next = draftNick.trim()
    if (!next) {
      addToast({ type: 'error', message: '昵称不能为空' })
      return
    }
    setSaving(true)
    try {
      setNickname(next)
      if (user?.id && configured) {
        const res = await pushProfileToCloud(user.id, next, user.email)
        if (!res.ok) {
          addToast({ type: 'info', message: `本机已保存；云端：${res.error}` })
        } else {
          addToast({ type: 'success', message: '资料已保存并同步' })
        }
      } else {
        addToast({ type: 'success', message: '本机资料已保存' })
      }
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  const syncLabel = !configured
    ? '未配置云端，仅本机'
    : lastSyncError
      ? `同步出错：${lastSyncError}`
      : lastSyncAt
        ? `上次同步：${new Date(lastSyncAt).toLocaleString('zh-CN', { hour12: false })}`
        : user
          ? '登录后可手动同步，或改动账本后自动推送'
          : '登录后可跨设备同步'

  const statusLine = user?.email
    ? user.email
    : configured
      ? '未登录 · 本机资料'
      : '本地账本 · 无需登录'

  return (
    <>
      <Drawer
        isOpen={open}
        onClose={close}
        title="个人中心"
        width={400}
        footer={
          configured && user ? (
            <Button
              variant="ghost"
              className="mr-auto"
              onClick={() => {
                void signOut().then(() =>
                  addToast({ type: 'info', message: '已退出登录，本机数据保留' }),
                )
              }}
            >
              <LogOut size={14} />
              退出登录
            </Button>
          ) : !configured ? (
            <span className="text-xs text-muted-foreground w-full text-center py-1">
              本地模式 · 登录待配置云端后可用
            </span>
          ) : undefined
        }
      >
        <div className="dd-profile">
          <section className="dd-profile__hero ds-rise">
            <Avatar size="lg" className="dd-profile__avatar" style={avatarStyle}>
              {profileInitial(nickname)}
            </Avatar>
            <div className="dd-profile__hero-meta min-w-0">
              <h2 className="dd-profile__name truncate">{nickname}</h2>
              <p className="ds-caption truncate">{statusLine}</p>
            </div>
            <button
              type="button"
              className="btn-base btn-ghost btn--sm shrink-0"
              aria-expanded={editing}
              onClick={() => {
                if (editing) {
                  setDraftNick(nickname)
                  setEditing(false)
                } else {
                  setDraftNick(nickname)
                  setEditing(true)
                }
              }}
            >
              {editing ? <ChevronDown size={14} /> : <Pencil size={14} />}
              {editing ? '收起' : '编辑'}
            </button>
          </section>

          {/* 未登录：短状态条 + 单一主登录 CTA（不另开账号卡） */}
          {configured && !user ? (
            <div className="dd-profile__login-strip ds-rise">
              <p className="dd-profile__login-strip-text">登录后可跨设备同步账本</p>
              <Button variant="primary" size="sm" className="w-full" onClick={() => setAuthOpen(true)}>
                <LogIn size={14} />
                登录 / 注册
              </Button>
            </div>
          ) : null}

          {/* 编辑资料：默认折叠，点「编辑」展开 */}
          {editing ? (
            <section className="dd-profile__section ds-rise">
              <h3 className="dd-profile__section-title">编辑资料</h3>
              <div className="flex flex-col gap-3">
                <FormInput
                  label="昵称"
                  value={draftNick}
                  onChange={(e) => setDraftNick(e.target.value)}
                  placeholder="怎么称呼你"
                  maxLength={32}
                  disabled={saving}
                />
                <div>
                  <p className="text-xs text-muted-foreground mb-2">头像色调</p>
                  <div className="dd-profile__hues">
                    {[330, 300, 280, 200, 160, 30].map((h) => (
                      <button
                        key={h}
                        type="button"
                        aria-label={`色相 ${h}`}
                        className={cn(
                          'dd-profile__hue',
                          avatarHue === h && 'dd-profile__hue--active',
                        )}
                        style={{ backgroundColor: `hsla(${h}, 70%, 80%, 1)` }}
                        onClick={() => setAvatarHue(h)}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={saving}
                    onClick={() => {
                      setDraftNick(nickname)
                      setEditing(false)
                    }}
                  >
                    取消
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={saving}
                    onClick={() => void saveProfile()}
                  >
                    {saving ? '保存中…' : '保存'}
                  </Button>
                </div>
              </div>
            </section>
          ) : null}

          <section className="dd-profile__section ds-rise">
            <h3 className="dd-profile__section-title">
              <span className="inline-flex items-center gap-1.5">
                {configured && user ? (
                  <Cloud size={14} className="text-brand" />
                ) : (
                  <CloudOff size={14} className="text-muted-foreground" />
                )}
                云同步
              </span>
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed mb-2.5">{syncLabel}</p>
            {configured && user ? (
              <Button
                variant="secondary"
                size="sm"
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
              </Button>
            ) : !configured ? (
              <div className="dd-profile__local-hint">
                <UserRound size={14} className="text-brand shrink-0" />
                <span>账本始终写在本机 IndexedDB，云端只是可选备份。</span>
              </div>
            ) : null}
          </section>
        </div>
      </Drawer>

      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  )
}
