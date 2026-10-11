import { Sparkles } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { highlightsFor } from '@/lib/changelog'
import { useHelpStore } from '@/store/useHelpStore'

const APP_VERSION = __APP_VERSION__

export function UpdateHighlights() {
  const open = useHelpStore((s) => s.highlightsOpen)
  const dismiss = useHelpStore((s) => s.dismissHighlights)
  const entry = highlightsFor(APP_VERSION)

  const onDismiss = () => dismiss(APP_VERSION)

  return (
    <Modal
      isOpen={open}
      onClose={onDismiss}
      title={
        <span className="inline-flex items-center gap-2">
          <Sparkles size={18} className="text-brand" />
          {entry.title}
        </span>
      }
      className="max-w-md"
      footer={
        <Button variant="primary" onClick={onDismiss}>
          开始使用
        </Button>
      }
    >
      <div className="dd-highlights ds-rise">
        {entry.blurb ? <p className="text-sm text-muted-foreground mb-4">{entry.blurb}</p> : null}
        <ul className="dd-highlights__list">
          {entry.items.map((item) => (
            <li key={item} className="dd-highlights__item">
              <span className="dd-highlights__dot" aria-hidden />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <p className="ds-caption mt-4">可在 设置 → 系统 → 更新亮点 再次查看。</p>
      </div>
    </Modal>
  )
}
