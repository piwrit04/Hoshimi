import { Keyboard } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { SHORTCUT_ITEMS, type ShortcutItem } from '@/lib/shortcuts'
import { useHelpStore } from '@/store/useHelpStore'
import { cn } from '@/lib/utils'

function groupItems(items: ShortcutItem[]) {
  const map = new Map<ShortcutItem['group'], ShortcutItem[]>()
  for (const it of items) {
    const list = map.get(it.group) ?? []
    list.push(it)
    map.set(it.group, list)
  }
  return map
}

function Kbd({ children }: { children: string }) {
  return <kbd className="dd-kbd">{children}</kbd>
}

export function ShortcutsSheet() {
  const open = useHelpStore((s) => s.shortcutsOpen)
  const close = useHelpStore((s) => s.closeShortcuts)
  const groups = groupItems(SHORTCUT_ITEMS)

  return (
    <Modal
      isOpen={open}
      onClose={close}
      title={
        <span className="inline-flex items-center gap-2">
          <Keyboard size={18} className="text-brand" />
          快捷键
        </span>
      }
      className="max-w-md"
      footer={
        <Button variant="primary" onClick={close}>
          知道了
        </Button>
      }
    >
      <div className="dd-shortcuts ds-rise">
        <p className="ds-caption mb-4">
          在输入框里打字时不会触发；也不抢 Electron 的关闭 / 刷新等系统组合键。
        </p>
        {[...groups.entries()].map(([group, items]) => (
          <section key={group} className="dd-shortcuts__group">
            <h4 className="dd-shortcuts__heading">{group}</h4>
            <ul className="dd-shortcuts__list">
              {items.map((it) => (
                <li key={it.label} className="dd-shortcuts__row">
                  <span className="dd-shortcuts__label">{it.label}</span>
                  <span className="dd-shortcuts__keys">
                    {it.keys.map((k, i) => (
                      <span key={`${it.label}-${k}-${i}`} className="inline-flex items-center gap-1">
                        {i > 0 ? <span className="text-muted-foreground text-xs">+</span> : null}
                        <Kbd>{k}</Kbd>
                      </span>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
        <p className={cn('ds-caption mt-4')}>按 <Kbd>?</Kbd> 可随时再打开本面板。</p>
      </div>
    </Modal>
  )
}
