import { useMemo, useState } from 'react'
import { FolderTree, Plus, Trash2, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { FormInput, FormNumberInput, FormSelect, FormSwitch } from '@/components/ui/form'
import { Modal } from '@/components/ui/Modal'
import { Tag } from '@/components/ui/data'
import { modalConfirm } from '@/components/ui/ModalConfirm'
import { useOrdersStore } from '@/store/useOrdersStore'
import { useToastStore } from '@/store/useToastStore'
import {
  categoriesOf,
  primaryGameId,
  productsOfCategory,
  sortedGames,
} from '@/domain/catalog'
import type { CatalogKind } from '@/storage/types'

/**
 * 项目目录：上选游戏 → 左分类 → 右项目增删改。
 * 数据落在账本 games / categories / products。
 */
export function CatalogEditor() {
  const games = useOrdersStore((s) => s.games)
  const categories = useOrdersStore((s) => s.categories)
  const products = useOrdersStore((s) => s.products)
  const addGame = useOrdersStore((s) => s.addGame)
  const updateGame = useOrdersStore((s) => s.updateGame)
  const removeGame = useOrdersStore((s) => s.removeGame)
  const addCategory = useOrdersStore((s) => s.addCategory)
  const updateCategory = useOrdersStore((s) => s.updateCategory)
  const removeCategory = useOrdersStore((s) => s.removeCategory)
  const addProduct = useOrdersStore((s) => s.addProduct)
  const updateProduct = useOrdersStore((s) => s.updateProduct)
  const removeProduct = useOrdersStore((s) => s.removeProduct)
  const addToast = useToastStore((s) => s.addToast)

  const sorted = useMemo(() => sortedGames(games), [games])
  const [gameId, setGameId] = useState(() => primaryGameId(games))
  const safeGameId = sorted.some((g) => g.id === gameId) ? gameId : primaryGameId(games)

  const cats = useMemo(
    () => categoriesOf(categories, safeGameId, true),
    [categories, safeGameId],
  )
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const activeCatId =
    categoryId && cats.some((c) => c.id === categoryId) ? categoryId : cats[0]?.id ?? null
  const prods = useMemo(
    () => (activeCatId ? productsOfCategory(products, activeCatId, true) : []),
    [products, activeCatId],
  )
  const activeCat = cats.find((c) => c.id === activeCatId)

  /* ---- 弹窗状态 ---- */
  const [gameModal, setGameModal] = useState<'add' | 'edit' | null>(null)
  const [gameName, setGameName] = useState('')
  const [gamePrefix, setGamePrefix] = useState('NTE')

  const [catModal, setCatModal] = useState<'add' | 'edit' | null>(null)
  const [catName, setCatName] = useState('')
  const [catKind, setCatKind] = useState<CatalogKind>('normal')

  const [prodModal, setProdModal] = useState<'add' | 'edit' | null>(null)
  const [prodId, setProdId] = useState<string | null>(null)
  const [prodName, setProdName] = useState('')
  const [prodPrice, setProdPrice] = useState<number | null>(null)

  const run = (fn: () => void) => {
    try {
      fn()
    } catch (e) {
      addToast({ type: 'error', message: e instanceof Error ? e.message : '操作失败' })
    }
  }

  return (
    <div className="bg-card border border-border/50 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border/50 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <FolderTree size={16} className="text-brand shrink-0" />
          <div>
            <h3 className="text-sm font-bold">项目目录</h3>
            <p className="text-xs text-muted-foreground">
              录单可选项目；改名不影响已保存订单
            </p>
          </div>
        </div>
        <div className="flex-1" />
        <FormSelect
          className="w-40"
          value={safeGameId}
          onChange={(v) => {
            setGameId(v ?? safeGameId)
            setCategoryId(null)
          }}
          options={sorted.map((g) => ({ value: g.id, label: g.name }))}
        />
        <Button
          size="sm"
          variant="secondary"
          icon={Plus}
          onClick={() => {
            setGameName('')
            setGamePrefix('NEW')
            setGameModal('add')
          }}
        >
          游戏
        </Button>
        <Button
          size="sm"
          variant="ghost"
          icon={Pencil}
          onClick={() => {
            const g = sorted.find((x) => x.id === safeGameId)
            if (!g) return
            setGameName(g.name)
            setGamePrefix(g.orderPrefix)
            setGameModal('edit')
          }}
        />
        <Button
          size="sm"
          variant="ghost"
          icon={Trash2}
          onClick={() => {
            void modalConfirm({
              title: '删除游戏',
              content: '将删掉该游戏下全部分类和项目，且不可恢复。',
              tone: 'danger',
              okText: '删除',
              onOk: () =>
                run(() => {
                  removeGame(safeGameId)
                  addToast({ type: 'success', message: '已删除游戏' })
                }),
            })
          }}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] min-h-[320px]">
        {/* 左：分类 */}
        <aside className="border-b md:border-b-0 md:border-r border-border/50 p-3 space-y-1">
          <div className="flex items-center justify-between px-1 mb-2">
            <span className="text-xs font-semibold text-muted-foreground">分类</span>
            <Button
              size="sm"
              variant="ghost"
              icon={Plus}
              iconOnly
              aria-label="添加分类"
              onClick={() => {
                setCatName('')
                setCatKind('normal')
                setCatModal('add')
              }}
            />
          </div>
          {cats.length === 0 ? (
            <p className="text-xs text-muted-foreground px-2 py-6 text-center">还没有分类</p>
          ) : (
            cats.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategoryId(c.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                  c.id === activeCatId
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-secondary text-foreground'
                }`}
              >
                <span className="truncate flex-1">{c.name}</span>
                {c.kind === 'custody' ? (
                  <Tag tone={c.id === activeCatId ? 'default' : 'warning'}>托</Tag>
                ) : null}
                {!c.enabled ? <span className="opacity-60 text-[10px]">停</span> : null}
              </button>
            ))
          )}
        </aside>

        {/* 右：项目 */}
        <div className="p-4 space-y-3">
          {activeCat ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-sm font-bold">{activeCat.name}</h4>
                <Tag tone={activeCat.kind === 'custody' ? 'warning' : 'default'}>
                  {activeCat.kind === 'custody' ? '托管' : '普通'}
                </Tag>
                <div className="flex-1" />
                <FormSwitch
                  checked={activeCat.enabled}
                  onChange={(on) =>
                    run(() => {
                      updateCategory(activeCat.id, { enabled: on })
                    })
                  }
                />
                <span className="text-xs text-muted-foreground">启用</span>
                <Button
                  size="sm"
                  variant="ghost"
                  icon={Pencil}
                  onClick={() => {
                    setCatName(activeCat.name)
                    setCatKind(activeCat.kind)
                    setCatModal('edit')
                  }}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  icon={Trash2}
                  onClick={() => {
                    void modalConfirm({
                      title: '删除分类',
                      content: `删除「${activeCat.name}」及其下所有项目？`,
                      tone: 'danger',
                      okText: '删除',
                      onOk: () =>
                        run(() => {
                          removeCategory(activeCat.id)
                          setCategoryId(null)
                          addToast({ type: 'success', message: '已删除分类' })
                        }),
                    })
                  }}
                />
                <Button
                  size="sm"
                  variant="secondary"
                  icon={Plus}
                  onClick={() => {
                    setProdId(null)
                    setProdName('')
                    setProdPrice(null)
                    setProdModal('add')
                  }}
                >
                  项目
                </Button>
              </div>

              {prods.length === 0 ? (
                <p className="text-sm text-muted-foreground py-10 text-center">这个分类还没有项目</p>
              ) : (
                <ul className="divide-y divide-border/40 rounded-lg border border-border/40 overflow-hidden">
                  {prods.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center gap-3 px-3 py-2.5 bg-card hover:bg-secondary/40 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className={`text-sm font-medium truncate ${!p.enabled ? 'opacity-50' : ''}`}>
                          {p.name}
                        </div>
                        <div className="text-xs text-muted-foreground tabular-nums">
                          {p.price != null ? `默认 ¥${p.price}` : '无默认价'}
                          {!p.enabled ? ' · 已停用' : ''}
                        </div>
                      </div>
                      <FormSwitch
                        checked={p.enabled}
                        onChange={(on) =>
                          run(() => updateProduct(p.id, { enabled: on }))
                        }
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={Pencil}
                        iconOnly
                        aria-label="编辑"
                        onClick={() => {
                          setProdId(p.id)
                          setProdName(p.name)
                          setProdPrice(p.price ?? null)
                          setProdModal('edit')
                        }}
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={Trash2}
                        iconOnly
                        aria-label="删除"
                        onClick={() => {
                          void modalConfirm({
                            title: '删除项目',
                            content: `删除「${p.name}」？`,
                            tone: 'danger',
                            okText: '删除',
                            onOk: () =>
                              run(() => {
                                removeProduct(p.id)
                                addToast({ type: 'success', message: '已删除项目' })
                              }),
                          })
                        }}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground py-16 text-center">先添加一个分类</p>
          )}
        </div>
      </div>

      {/* 游戏弹窗 */}
      <Modal
        isOpen={gameModal !== null}
        onClose={() => setGameModal(null)}
        title={gameModal === 'add' ? '添加游戏' : '编辑游戏'}
        className="max-w-sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setGameModal(null)}>
              取消
            </Button>
            <Button
              variant="primary"
              onClick={() =>
                run(() => {
                  if (gameModal === 'add') {
                    const id = addGame(gameName, gamePrefix)
                    setGameId(id)
                    addToast({ type: 'success', message: '已添加游戏' })
                  } else {
                    updateGame(safeGameId, { name: gameName, orderPrefix: gamePrefix })
                    addToast({ type: 'success', message: '已更新游戏' })
                  }
                  setGameModal(null)
                })
              }
            >
              保存
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <FormInput label="名称" required value={gameName} onChange={(e) => setGameName(e.target.value)} />
          <FormInput
            label="单号前缀"
            help="字母数字，最多 8 位"
            value={gamePrefix}
            onChange={(e) => setGamePrefix(e.target.value)}
          />
        </div>
      </Modal>

      {/* 分类弹窗 */}
      <Modal
        isOpen={catModal !== null}
        onClose={() => setCatModal(null)}
        title={catModal === 'add' ? '添加分类' : '编辑分类'}
        className="max-w-sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCatModal(null)}>
              取消
            </Button>
            <Button
              variant="primary"
              onClick={() =>
                run(() => {
                  if (catModal === 'add') {
                    addCategory(safeGameId, catName, catKind)
                    addToast({ type: 'success', message: '已添加分类' })
                  } else if (activeCat) {
                    updateCategory(activeCat.id, { name: catName })
                    addToast({ type: 'success', message: '已更新分类' })
                  }
                  setCatModal(null)
                })
              }
            >
              保存
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <FormInput label="名称" required value={catName} onChange={(e) => setCatName(e.target.value)} />
          {catModal === 'add' ? (
            <FormSelect
              label="类型"
              value={catKind}
              onChange={(v) => setCatKind((v as CatalogKind) ?? 'normal')}
              options={[
                { value: 'normal', label: '普通' },
                { value: 'custody', label: '托管' },
              ]}
            />
          ) : null}
        </div>
      </Modal>

      {/* 项目弹窗 */}
      <Modal
        isOpen={prodModal !== null}
        onClose={() => setProdModal(null)}
        title={prodModal === 'add' ? '添加项目' : '编辑项目'}
        className="max-w-sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setProdModal(null)}>
              取消
            </Button>
            <Button
              variant="primary"
              onClick={() =>
                run(() => {
                  if (!activeCatId) return
                  if (prodModal === 'add') {
                    addProduct(activeCatId, prodName, prodPrice)
                    addToast({ type: 'success', message: '已添加项目' })
                  } else if (prodId) {
                    updateProduct(prodId, { name: prodName, price: prodPrice })
                    addToast({ type: 'success', message: '已更新项目' })
                  }
                  setProdModal(null)
                })
              }
            >
              保存
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <FormInput label="名称" required value={prodName} onChange={(e) => setProdName(e.target.value)} />
          <FormNumberInput
            label="默认价格"
            help="可空，录单时手填"
            value={prodPrice}
            onChange={setProdPrice}
            min={0}
          />
        </div>
      </Modal>
    </div>
  )
}
