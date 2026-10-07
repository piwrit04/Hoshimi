import { useState, type ComponentType } from 'react'
import { Command, ImageOff, Palette, Plus } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import SectionCard from '@/components/ui/SectionCard'
import { OptimizedImage } from '@/components/ui/OptimizedImage'
import { Button } from '@/components/ui/Button'
import { Tag } from '@/components/ui/data'
import { useSearchStore } from '@/store/useSearchStore'
import { Row } from './general'

/*
 * 「其它」分类：不属于上面五类、但确实在用的东西。
 * 另外这里的页面背景 / 全局搜索 / 404 都是**说明型**示例 ——
 * 它们本身是全站性的，没法塞进一个小托盘里「演示」。
 */

/* ------------------------------------------------------------------ */
/* 全局搜索                                                            */
/* ------------------------------------------------------------------ */

export function FloatingSearchDemo() {
  const openSearch = useSearchStore((s) => s.openSearch)
  return (
    <div className="space-y-5">
      <Row label="打开面板">
        <Button variant="primary" icon={Command} onClick={openSearch}>
          打开全局搜索
        </Button>
        <span className="text-xs text-muted-foreground">
          或者直接按 <code className="px-1 rounded bg-secondary font-mono">Ctrl</code> /{' '}
          <code className="px-1 rounded bg-secondary font-mono">⌘</code> +{' '}
          <code className="px-1 rounded bg-secondary font-mono">K</code>
        </span>
      </Row>

      <dl className="dd-spec">
        <dt>检索字段</dt><dd>中文名 · 英文名 · 全拼 · 首字母</dd>
        <dt>试试输入</dt><dd>anNiu（全拼音）/ an（首字母）/ button（英文）</dd>
        <dt>可拖动</dt><dd>拖顶部把手，位置记在 localStorage</dd>
        <dt>跳转</dt><dd>点到结果会滚到本页对应那一节，左侧目录也跟着高亮</dd>
      </dl>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 图片                                                                */
/* ------------------------------------------------------------------ */

export function ImageDemo() {
  /* broken：初始就指向一个不存在的文件，直接看失败占位
     failed：外部容器自己维护的「图挂了」标记（组件不管这件事） */
  const [broken, setBroken] = useState(true)
  const [failed, setFailed] = useState(true)

  const src = broken ? '/not-exist.png' : '/assets/backgrounds/background.jpg'

  return (
    <div className="space-y-5">
      <Row label="懒加载 + 载入淡入 + 高分屏换图">
        <div className="relative w-40 h-24 rounded-lg border border-border overflow-hidden bg-secondary">
          {/* 失败时的占位：压在图片下面。
              图片透明度为 0（还没载入）或加载失败时，露出来的就是它。 */}
          {failed && (
            <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-muted-foreground text-[10px]">
              <ImageOff size={18} />
              图片加载失败
            </span>
          )}
          <OptimizedImage
            src={src}
            alt="示例"
            className="relative w-full h-full object-cover"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setBroken((v) => !v)
              setFailed(false)
            }}
          >
            {broken ? '换成一个存在的图' : '换成一个必然失败的路径'}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setFailed((v) => !v)}>
            手动切换失败占位
          </Button>
        </div>
      </Row>

      <dl className="dd-spec">
        <dt>props</dt>
        <dd>src · alt · className · loading · placeholder · sizes · fetchPriority · highDpiSuffix</dd>
        <dt>懒加载</dt>
        <dd>IntersectionObserver，提前 50px 触发；也可以 loading="eager" 关掉</dd>
        <dt>换图顺序</dt>
        <dd>@2x.webp → @2x.png → .webp → 原图，逐个试，第一个成功就用</dd>
        <dt>载入淡入</dt>
        <dd>opacity 0 → 1，300ms</dd>
        <dt>⚠️ 失败态的实话</dt>
        <dd>
          组件本身**没有**失败占位 —— 所有候选都失败时它仍然把 src 指向原图，
          结果是浏览器的碎图图标。所以「失败占位」必须由外面套一层容器自己做
          （上面那个就是，可以点第二个按钮看效果）。
        </dd>
      </dl>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 页面标题 / 分组卡片                                                  */
/* ------------------------------------------------------------------ */

export function PageHeaderDemo() {
  return (
    <div className="rounded-lg border border-border bg-background/40 p-4 space-y-4">
      <PageHeader icon={Palette} title="页面标题示例" />
      <PageHeader
        icon={Palette}
        title="带右侧动作"
        actions={
          <>
            <Tag tone="info">62 单</Tag>
            <Button variant="primary" size="sm" icon={Plus}>新建</Button>
          </>
        }
      />
      <dl className="dd-spec">
        <dt>props</dt><dd>icon · title · actions</dd>
        <dt>图标</dt><dd>自动套一层品牌色淡底圆角方块</dd>
        <dt>用在哪</dt><dd>每个页面的最上面一块。本页最上面那个就是它</dd>
      </dl>
    </div>
  )
}

export function SectionCardDemo() {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-background/40 p-4">
        <SectionCard
          title="分组卡片标题"
          extra={<span className="text-xs text-muted-foreground">右上角插槽</span>}
        >
          <p className="text-sm text-muted-foreground">
            标题左边有一道品牌色竖条，右上角是 extra 插槽（放状态标签、计数、小按钮都行）。
            卡片本身是 bg-card + 圆角 + 阴影。
          </p>
        </SectionCard>
      </div>
      <dl className="dd-spec">
        <dt>props</dt><dd>title · extra · children · className</dd>
        <dt>用在哪</dt><dd>页面里每一个内容区块。**本页的每一段都是它**</dd>
      </dl>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 滚动条                                                              */
/* ------------------------------------------------------------------ */

export function ScrollbarDemo() {
  return (
    <div className="space-y-4">
      <div className="h-40 overflow-y-auto rounded-lg border border-border bg-background p-4 custom-scrollbar">
        <div className="text-sm font-semibold text-foreground mb-2">在里面滚，看右边那条滚动条</div>
        {Array.from({ length: 16 }, (_, i) => (
          <div key={i} className="text-sm text-muted-foreground py-2 border-b border-border">
            第 {i + 1} 行
          </div>
        ))}
      </div>
      <dl className="dd-spec">
        <dt>宽度</dt><dd>5px（横竖一样）</dd>
        <dt>默认</dt><dd>rgba(128,128,128,.2)，圆角 10px</dd>
        <dt>悬停</dt><dd>rgba(128,128,128,.4)</dd>
        <dt>怎么用</dt><dd>给滚动容器加 <code>custom-scrollbar</code> 类。全局的 body 已经带了</dd>
      </dl>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 404 / 页面背景（说明型）                                             */
/* ------------------------------------------------------------------ */

export function NotFoundDemo() {
  return (
    <div className="space-y-5">
      <div className="relative w-full h-56 rounded-lg border border-border overflow-hidden bg-background flex flex-col items-center justify-center">
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-brand-20 to-transparent" />
        <div className="relative text-center space-y-2">
          <div className="text-5xl font-black text-brand" style={{ textShadow: '0 0 24px rgba(var(--brand-rgb), .45)' }}>
            404
          </div>
          <div className="text-sm font-semibold text-foreground">这一页还没做</div>
          <div className="text-xs text-muted-foreground max-w-xs">
            侧栏里除了「组件预览」，其余入口都通向这里 —— 这是刻意的，产品页面以后往路由表上加。
          </div>
          <Button variant="primary" size="sm">回组件预览</Button>
        </div>
      </div>

      <dl className="dd-spec">
        <dt>结构</dt><dd>渐变顶栏 + 发光大数字 + 两个反向旋转的装饰圆环 + 底部呼吸圆点</dd>
        <dt>怎么看真的</dt><dd>点侧栏的「概览」或「设置」</dd>
      </dl>
    </div>
  )
}

export function PageBackgroundDemo() {
  return (
    <div className="space-y-5">
      <div className="relative w-full h-40 rounded-lg border border-border overflow-hidden bg-background">
        {/* 就是 PageBackground 的效果：左上角一层很淡的品牌色径向渐变 */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(60% 80% at 0% 0%, rgba(var(--brand-rgb), 0.16) 0%, transparent 60%)',
          }}
        />
        <div className="relative p-4 text-sm text-foreground">
          内容压在这层渐变上面
        </div>
      </div>
      <dl className="dd-spec">
        <dt>位置</dt><dd>内容区左上角</dd>
        <dt>作用</dt><dd>让大面积底色不至于死板</dd>
        <dt>注意</dt><dd>**全站只有这一处渐变**（用来做层次），其余地方一律不要加渐变</dd>
      </dl>
    </div>
  )
}

export const MISC_DEMOS: Record<string, ComponentType> = {
  'c-floatingsearch': FloatingSearchDemo,
  'c-image': ImageDemo,
  'c-pageheader': PageHeaderDemo,
  'c-sectioncard': SectionCardDemo,
  'c-scrollbar': ScrollbarDemo,
  'c-notfound': NotFoundDemo,
  'c-pagebackground': PageBackgroundDemo,
}
