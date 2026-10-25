import { useEffect, memo, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Boxes, Settings, Menu, PlusCircle, LayoutList, Users, ListTodo } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSidebarStore } from '@/store/useSidebarStore';
import { useNewOrderStore } from '@/store/useNewOrderStore';
import { useToastStore } from '@/store/useToastStore';
import { Tooltip } from '@/components/ui/Tooltip';
import { Scrollbar } from '@/components/ui/Scrollbar';
import { Badge } from '@/components/ui/data';
import { useOrdersStore } from '@/store/useOrdersStore';
import { workbench } from '@/domain/workbench';

/*
 * 侧栏。
 *
 * 结构与样式整套来自工具箱的 Sidebar.tsx —— className 保持原样。
 * 「新建订单」不是路由，是开模态框（见 useNewOrderStore）。
 */

type NavItemType =
  | { icon: typeof LayoutDashboard; label: string; path: string; modal?: false; badge?: number }
  | { icon: typeof LayoutDashboard; label: string; modal: true; badge?: number };

/* 分组参照 shadcn dashboard-01：顶部主操作「新建订单」，下面「工作台」「系统」两组 */
const quickCreate: NavItemType = { icon: PlusCircle, label: '新建订单', modal: true };
const navGroups: { label: string; items: NavItemType[] }[] = [
  {
    label: '工作台',
    items: [
      { icon: LayoutDashboard, label: '工作台', path: '/dashboard' },
      { icon: LayoutList, label: '订单', path: '/orders' },
      { icon: ListTodo, label: '待办', path: '/todo' },
      { icon: Users, label: '客户', path: '/customers' },
    ],
  },
  {
    label: '系统',
    items: [
      { icon: Settings, label: '设置', path: '/settings' },
      { icon: Boxes, label: '组件预览', path: '/components' },
    ],
  },
];

const NavItem = memo(function NavItem({
  item,
  isCollapsed,
}: {
  item: NavItemType;
  isCollapsed: boolean;
}) {
  const iconClass = 'transition-colors shrink-0';
  const spanClass = 'font-medium text-sm whitespace-nowrap overflow-hidden transition-opacity duration-300';
  const openNewOrder = useNewOrderStore((s) => s.open);

  const badgeCount = 'badge' in item ? item.badge : undefined;
  const inner = (isActive: boolean) => {
    const icon = (
      <item.icon
        size={16}
        aria-hidden="true"
        className={cn(iconClass, isActive ? 'text-inherit' : 'text-muted-foreground group-hover:text-foreground')}
      />
    );
    return (
      <>
        {badgeCount ? (
          <Badge count={badgeCount} tone="warning">
            {icon}
          </Badge>
        ) : (
          icon
        )}
        <span className={cn(spanClass, isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100')}>
          {item.label}
        </span>
      </>
    );
  };

  // 新建订单：按钮，点开模态框
  if (item.modal) {
    return (
      <Tooltip content={isCollapsed ? item.label : null} position="right">
        <button
          type="button"
          onClick={openNewOrder}
          aria-label={item.label}
          className={cn(
            'btn-base btn-primary w-full',
            isCollapsed ? '!px-0' : 'justify-start'
          )}
        >
          <item.icon size={16} aria-hidden="true" className="shrink-0" />
          {!isCollapsed && <span className="text-sm font-medium">{item.label}</span>}
        </button>
      </Tooltip>
    );
  }

  return (
    <Tooltip content={isCollapsed ? item.label : null} position="right">
      <NavLink
        to={item.path}
        aria-label={isCollapsed ? item.label : undefined}
        className={({ isActive }) =>
          cn(
            'flex h-9 items-center px-3 rounded-full transition-colors duration-150 relative overflow-hidden group',
            isActive
              ? 'l2g-nav-active font-medium'
              : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
            isCollapsed ? 'justify-center' : 'gap-3'
          )
        }
      >
        {({ isActive }) => inner(isActive)}
      </NavLink>
    </Tooltip>
  );
});

export function Sidebar({ showLogo = true }: { showLogo?: boolean }) {
  const { isCollapsed, toggleCollapse } = useSidebarStore();
  const [isLogoHovered, setIsLogoHovered] = useState(false);
  const addToast = useToastStore((s) => s.addToast);
  const orders = useOrdersStore((s) => s.orders);
  const settings = useOrdersStore((s) => s.settings);
  const todoBadge = workbench(orders, settings, '').followCount;
  const eggClicks = useRef(0);
  const eggTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onLogoClick = () => {
    // 连点 Logo：第七下弹出轻量彩蛋；平时仍折叠/展开侧栏
    eggClicks.current += 1;
    if (eggTimer.current) clearTimeout(eggTimer.current);
    eggTimer.current = setTimeout(() => {
      eggClicks.current = 0;
    }, 1400);
    if (eggClicks.current >= 7) {
      eggClicks.current = 0;
      addToast({
        type: 'info',
        message: `✨ 星笺 v${__APP_VERSION__} · 记好每一单，祝生意顺`,
      });
    }
    toggleCollapse();
  };

  // Escape 收起侧栏（仅在侧栏展开且无浮层打开时）
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isCollapsed) {
        // 检查是否有打开的浮层（Modal/Drawer 会设置 body overflow）
        if (document.body.style.overflow !== 'hidden') {
          toggleCollapse();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleCollapse, isCollapsed]);

  const sidebarWidth = isCollapsed ? 'w-16' : 'w-60';

  return (
    <div
      className={cn(
        'h-full flex flex-col relative transition-[width] duration-300 ease-in-out z-50',
        /* ⚠️ 工具箱原文是写死的浅粉底 bg-[#FCFAFD]/92 + 边框 #E8E1F0 —— 深色模式不跟着变。
           这里换成主题变量。阴影保留原样（它本来就只是外侧一道柔影，不分模式）。 */
        'l2g-glass-aside',
        sidebarWidth
      )}
      data-testid="sidebar"
    >
      {showLogo && (
        <button
          type="button"
          aria-label={isCollapsed ? '展开侧栏' : '收起侧栏'}
          className="flex items-center justify-center shrink-0 cursor-pointer transition-colors duration-300 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary no-drag h-14 px-3 border-b border-white/10"
          onMouseEnter={() => setIsLogoHovered(true)}
          onMouseLeave={() => setIsLogoHovered(false)}
          onClick={onLogoClick}
        >
          <div
            className={cn(
              'relative flex items-center justify-center h-full transition-[width,padding] duration-300',
              isCollapsed ? 'w-16 px-0' : 'w-full px-1'
            )}
          >
            {/* 悬停时把 logo 换成展开/收起图标 */}
            <div
              className={cn(
                'absolute transition-[opacity,transform] duration-300 flex items-center justify-center',
                isLogoHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
              )}
            >
              <Menu size={18} aria-hidden="true" className="text-foreground" />
            </div>

            {/* 品牌字标 —— **占位 LOGO**。
                原版是一张 logo 图，这里先用「星」字代替，尺寸和过渡保持原样。
                等设计稿出来，把这里换成 <img src={logo} /> 即可；
                折叠态那个 40×40 的方块就是图标的落点。
                ⚠️ 改品牌名时这一处要和 index.html 的 <title>、加载画面文字、
                   内联 favicon 的汉字、electron/main.cjs 的 TITLE 一起改。 */}
            <div
              className={cn(
                'flex w-full items-center gap-2 transition-[opacity,transform] duration-300 select-none',
                isCollapsed ? 'justify-center' : 'justify-start',
                isLogoHovered ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
              )}
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand text-on-brand text-sm font-bold">星</span>
              {!isCollapsed && (
                <span className="flex flex-col leading-tight text-left">
                  <span className="text-sm font-semibold text-foreground">星笺</span>
                  <span className="text-[11px] text-muted-foreground tabular-nums">v{__APP_VERSION__}</span>
                </span>
              )}
            </div>
          </div>
        </button>
      )}

      <Scrollbar className="flex-1" contentClassName="px-3 py-4 flex flex-col gap-6">
        <NavItem item={quickCreate} isCollapsed={isCollapsed} />
        {navGroups.map((g) => (
          <div key={g.label} className="flex flex-col gap-1">
            {!isCollapsed && (
              <div className="px-3 pb-1 text-xs font-medium text-muted-foreground">{g.label}</div>
            )}
            {g.items.map((item) => {
              const withBadge =
                !('modal' in item && item.modal) &&
                'path' in item &&
                item.path === '/dashboard' &&
                todoBadge > 0
                  ? { ...item, badge: todoBadge }
                  : item;
              return <NavItem key={'path' in item ? item.path : item.label} item={withBadge} isCollapsed={isCollapsed} />;
            })}
          </div>
        ))}
      </Scrollbar>
    </div>
  );
}
