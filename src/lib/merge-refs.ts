import type { MutableRefObject, Ref } from 'react'

/** 合并多个 ref（函数 / object），不覆盖子元素原有 ref */
export function mergeRefs<T>(...refs: Array<Ref<T> | undefined>) {
  return (node: T | null) => {
    for (const ref of refs) {
      if (!ref) continue
      if (typeof ref === 'function') ref(node)
      else (ref as MutableRefObject<T | null>).current = node
    }
  }
}
