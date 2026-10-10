/**
 * 全站滚动根：MainLayout 里 Scrollbar 的 viewport（带 data-scroll-root）。
 * 锁滚动 / 锚点跳转都必须找真正滚动的那一层，不是外壳。
 */
export function resolveScrollRoot(el: HTMLElement | null): HTMLElement | null {
  if (!el) return null
  if (el.classList.contains('scrollbar-viewport')) return el
  const child = el.querySelector<HTMLElement>(':scope > .scrollbar-viewport')
  return child ?? el
}

export function getAppScrollRoot(): HTMLElement | null {
  const marked = document.querySelector<HTMLElement>('[data-scroll-root]')
  return resolveScrollRoot(marked) ?? document.querySelector('main')
}

/** 需要在弹层打开时一起锁住的滚动容器（body + 应用滚动根） */
export function listLockableScrollRoots(): HTMLElement[] {
  const roots: HTMLElement[] = [document.body]
  const app = getAppScrollRoot()
  if (app && app !== document.body) roots.push(app)
  return roots
}
