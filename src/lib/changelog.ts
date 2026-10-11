/**
 * 版本亮点：key 对齐 package.json / __APP_VERSION__。
 * 发新版时在此追加条目；首次启动该版本会弹出「更新亮点」。
 */
export type HighlightsEntry = {
  title: string
  blurb?: string
  items: string[]
}

export const VERSION_HIGHLIGHTS: Record<string, HighlightsEntry> = {
  '0.1.0': {
    title: '星笺 0.1.0',
    blurb: '本地代肝账本 · 粉系界面第一版',
    items: [
      '订单 / 客户 / 待办本地 IndexedDB，可选云同步',
      '粉系设计系统：表格行卡、抽屉分区、呼吸 KPI',
      '首次引导（外观 / 云同步 / 演示数据）与个人中心',
      '设置里可重开引导、查看快捷键与本页亮点',
    ],
  },
}

export function highlightsFor(version: string): HighlightsEntry {
  return (
    VERSION_HIGHLIGHTS[version] ?? {
      title: `星笺 v${version}`,
      blurb: '感谢使用星笺',
      items: ['本版本暂无单独亮点说明，可在设置里查看关于信息。'],
    }
  )
}
