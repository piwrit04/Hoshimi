import { useMemo, useState } from 'react'
import { FolderTree, Plus, Trash2, Pencil, Server } from 'lucide-react'
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
  serversOf,
  sortedGames,
} from '@/domain/catalog'
import type { CatalogKind } from '@/storage/types'

/**
 * 项目目录：上选游戏 → 服务器启停增删 → 左分类 → 右项目增删改。
 * 数据落在账本 games / categories / products / servers。
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
  const servers = useOrdersStore((s) => s.servers)
  const addServer = useOrdersStore((s) => s.addServer)
  const updateServer = useOrdersStore((s) => s.updateServer)
  const removeServer = useOrdersStore((s) => s.removeServer)
  const addToast = useToastStore((s) => s.addToast)

  const sorted = useMemo(() => sortedGames(games), [games])
  const [gameId, setGameId] = useState(() => primaryGameId(games))
  const safeGameId = sorted.some((g) => g.id === gameId) ? gameId : primaryGameId(games)

  const cats = useMemo(
    () => categoriesOf(categories, safeGameId, true),
    [categories, safeGameId],
  )
  const gameServers = useMemo(
    () => serversOf(servers, safeGameId, true),
    [servers, safeGameId],
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
  const [serverName, setServerName] = useState('')

  const run = (fn: () => void) => {
    try {
      fn()
    } catch (e) {
      addToast({ type: 'error', message: e instanceof Error ? e.message : '操作失败' })
    }
  }

  return (
    <section className="dd-settings-group dd-settings-rise">
    <h2 className="ds-section-title px-1">项目目录</h2>
    <div className="dd-catalog">
      <div className="dd-catalog__head flex min-h-[64px] items-center gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="size-9 rounded-lg bg-brand/10 text-brand flex items-center justify-center shrink-0">
            <FolderTree size={16} />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-medium leading-5">游戏</h3>
            <p className="ds-caption mt-0.5">录单可选项目；改名不影响已保存订单</p>
          </div>
        </div>
        <div className="flex-1" />
        <div className="w-40">
        <FormSelect
          value={safeGameId}
          onChange={(v) => {
            setGameId(v ?? safeGameId)
            setCategoryId(null)
          }}
          options={sorted.map((g) => ({ value: g.id, label: g.name }))}
        />
        </div>
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
          iconOnly
          aria-label="编辑游戏"
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
          iconOnly
          aria-label="删除游戏"
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


      {/* 当前游戏的服务器 */}
      <div className="dd-catalog__servers flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Server size={14} className="text-muted-foreground" />
          <span className="text-[13px] font-medium">服务器</span>
          <span className="ds-caption">停用后录单不显示；删除不影响已有订单</span>
        </div>
        <ul className="flex flex-wrap gap-2">
          {gameServers.map((item) => (
            <li
              key={item.id}
              className={`dd-catalog__server-chip ${!item.enabled ? 'opacity-55' : ''}`}
            >
              <span className="font-medium">{item.name}</span>
              <FormSwitch
                checked={item.enabled}
                onChange={(on) => run(() => updateServer(item.id, { enabled: on }))}
              />
              <Button
                size="sm"
                variant="ghost"
                icon={Trash2}
                iconOnly
                aria-label={`删除服务器「${item.name}」`}
                onClick={() => {
                  void modalConfirm({
                    title: `删除服务器「${item.name}」？`,
                    content: '已保存的订单不受影响。',
                    tone: 'danger',
                    okText: '删除',
                    onOk: () =>
                      run(() => {
                        removeServer(item.id)
                        addToast({ type: 'success', message: '已删除服务器' })
                      }),
                  })
                }}
              />
            </li>
          ))}
          {gameServers.length === 0 ? (
            <li className="flex h-9 items-center ds-caption">还没有服务器</li>
          ) : null}
        </ul>
        <div className="flex items-start gap-2">
          <div className="w-64">
          <FormInput
            placeholder="新服务器名称"
            value={serverName}
            onChange={(e) => setServerName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                run(() => {
                  addServer(safeGameId, serverName)
                  setServerName('')
                  addToast({ type: 'success', message: '已添加服务器' })
                })
              }
            }}
          />
          </div>
          <Button
            variant="secondary"
            icon={Plus}
            onClick={() =>
              run(() => {
                addServer(safeGameId, serverName)
                setServerName('')
                addToast({ type: 'success', message: '已添加服务器' })
              })
            }
          >
            添加
          </Button>
        </div>
      </div>

      {/* 左右分栏：固定高度，各自独立滚动，左边不随右边变长 */}
      <div className="dd-catalog__split">
        {/* 左：分类 */}
        <aside className="dd-catalog__cats min-h-0">
          <div className="mb-1 flex h-8 shrink-0 items-center justify-between pl-3">
            <span className="ds-caption font-medium">分类</span>
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
          <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-1 pr-0.5">
            {cats.length === 0 ? (
              <p className="ds-caption px-2 py-6 text-center">还没有分类</p>
            ) : (
              cats.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategoryId(c.id)}
                  className="dd-catalog__cat"
                  data-active={c.id === activeCatId || undefined}
                >
                  <span className="truncate flex-1">{c.name}</span>
                  {c.kind === 'custody' ? (
                    <Tag tone="info">托管</Tag>
                  ) : null}
                  {!c.enabled ? <span className="ds-caption">已停用</span> : null}
                </button>
              ))
            )}
          </div>
        </aside>

        {/* 右：项目 */}
        <div className="dd-catalog__products min-h-0">
          {activeCat ? (
            <>
              <div className="flex h-8 shrink-0 items-center gap-2">
                <h4 className="ds-section-title">{activeCat.name}</h4>
                <Tag tone={activeCat.kind === 'custody' ? 'info' : 'default'}>
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
                <span className="ds-caption mr-2">启用</span>
                <Button
                  size="sm"
                  variant="ghost"
                  icon={Pencil}
                  iconOnly
                  aria-label="编辑分类"
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
                  iconOnly
                  aria-label="删除分类"
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

              <div className="min-h-0 flex-1 overflow-y-auto">
                {prods.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-border/70 py-10 text-center text-sm text-muted-foreground">
                    这个分类还没有项目
                  </p>
                ) : (
                  <ul className="dd-catalog__product-list">
                    {prods.map((p) => (
                      <li key={p.id} className="dd-catalog__product">
                        <div className={`min-w-0 flex-1 truncate text-sm font-medium ${!p.enabled ? 'text-muted-foreground' : ''}`}>
                          {p.name}
                          {!p.enabled ? <span className="ds-caption ml-2 font-normal">已停用</span> : null}
                        </div>
                        <div className="mr-1 w-24 shrink-0 text-right text-sm tabular-nums font-semibold text-foreground/85">
                          {p.price != null ? `¥${p.price.toFixed(2)}` : '未定价'}
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
              </div>
            </>
          ) : (
            <p className="py-16 text-center text-sm text-muted-foreground">先添加一个分类</p>
          )}
        </div>
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
            <Button variant="secondary" onClick={() => setGameModal(null)}>
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
        <div className="flex flex-col gap-4">
          <FormInput label="名称" required value={gameName} onChange={(e) => setGameName(e.target.value)} />
          <FormInput
            label="单号前缀"
            help="字母数字，最多 8 位；新订单会用该前缀生成单号"
            value={gamePrefix}
            onChange={(e) => setGamePrefix(e.target.value)}
          />
          <p className="ds-caption">
            例：#
            {(gamePrefix.replace(/[^A-Za-z0-9]/g, '').slice(0, 8) || 'NTE') +
              new Date().toISOString().slice(2, 10).replace(/-/g, '') +
              '01'}
          </p>
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
            <Button variant="secondary" onClick={() => setCatModal(null)}>
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
        <div className="flex flex-col gap-4">
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
            <Button variant="secondary" onClick={() => setProdModal(null)}>
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
        <div className="flex flex-col gap-4">
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
    </section>
  )
}
