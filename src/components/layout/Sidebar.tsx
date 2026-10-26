import { useEffect, memo, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Boxes,
  Settings,
  PanelLeftClose,
  PanelLeft,
  PlusCircle,
  LayoutList,
  Users,
  ListTodo,
} from 'lucide-react';
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
 * 侧栏 — Linear / Notion / Shopify admin 气质：
 *   顶：品牌 · 主操作「新建订单」
 *   中：工作台主导航
 *   底：设置 / 组件预览（工具区）
 * 选中态沿用 l2g-nav-active（浅底 + 左侧品牌竖线），圆角与行卡一致 10px。
 */

type NavItemType =
  | { icon: typeof LayoutDashboard; label: string; path: string; modal?: false; badge?: number }
  | { icon: typeof LayoutDashboard; label: string; modal: true; badge?: number };

const quickCreate: NavItemType = { icon: PlusCircle, label: '新建订单', modal: true };

const primaryNav: NavItemType[] = [
  { icon: LayoutDashboard, label: '工作台', path: '/dashboard' },
  { icon: LayoutList, label: '订单', path: '/orders' },
  { icon: ListTodo, label: '待办', path: '/todo' },
  { icon: Users, label: '客户', path: '/customers' },
];

const utilityNav: NavItemType[] = [
  { icon: Settings, label: '设置', path: '/settings' },
  { icon: Boxes, label: '组件预览', path: '/components' },
];

const navItemBase =
  'group flex h-8 items-center rounded-[10px] px-2.5 text-sm transition-[background-color,color,box-shadow] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1 focus-visible:ring-offset-background';

const NavItem = memo(function NavItem({
  item,
  isCollapsed,
}: {
  item: NavItemType;
  isCollapsed: boolean;
}) {
  const openNewOrder = useNewOrderStore((s) => s.open);
  const badgeCount = 'badge' in item ? item.badge : undefined;

  const labelEl = !isCollapsed ? (
    <span className="min-w-0 flex-1 truncate font-medium">{item.label}</span>
  ) : null;

  const iconEl = (isActive: boolean) => (
    <item.icon
      size={16}
      strokeWidth={1.75}
      aria-hidden="true"
      className={cn(
        'shrink-0 transition-colors duration-150',
        isActive ? 'text-inherit' : 'text-muted-foreground group-hover:text-foreground',
      )}
    />
  );

  const row = (isActive: boolean) => (
    <>
      {badgeCount && isCollapsed ? (
        <Badge count={badgeCount} tone="warning">
          {iconEl(isActive)}
        </Badge>
      ) : (
        iconEl(isActive)
      )}
      {!isCollapsed && labelEl}
      {!isCollapsed && badgeCount ? (
        <span
          className={cn(
            'ml-auto inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[11px] font-medium tabular-nums',
            isActive
              ? 'bg-brand/15 text-brand'
              : 'bg-secondary text-muted-foreground group-hover:text-foreground',
          )}
        >
          {badgeCount > 99 ? '99+' : badgeCount}
        </span>
      ) : null}
    </>
  );

  if (item.modal) {
    return (
      <Tooltip content={isCollapsed ? item.label : null} position="right">
        <button
          type="button"
          onClick={openNewOrder}
          aria-label={item.label}
          className={cn(
            'btn-base btn-primary w-full shadow-none',
            isCollapsed ? '!h-8 !w-8 !min-w-0 !justify-center !px-0 mx-auto' : 'justify-start !h-8',
          )}
        >
          <item.icon size={16} strokeWidth={1.75} aria-hidden="true" className="shrink-0" />
          {!isCollapsed && <span className="text-sm font-medium">{item.label}</span>}
        </button>
      </Tooltip>
    );
  }

  return (
    <Tooltip content={isCollapsed ? item.label : null} position="right">
      <NavLink
        to={item.path}
        end={item.path === '/dashboard'}
        aria-label={
          badgeCount
            ? `${item.label}，${badgeCount}`
            : isCollapsed
              ? item.label
              : undefined
        }
        className={({ isActive }) =>
          cn(
            navItemBase,
            isActive
              ? 'l2g-nav-active font-medium'
              : 'text-muted-foreground hover:bg-secondary/80 hover:text-foreground',
            isCollapsed ? 'justify-center px-0 w-8 mx-auto' : 'gap-2.5',
          )
        }
      >
        {({ isActive }) => row(isActive)}
      </NavLink>
    </Tooltip>
  );
});

function NavSection({
  label,
  items,
  isCollapsed,
}: {
  label?: string;
  items: NavItemType[];
  isCollapsed: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      {label && !isCollapsed && (
        <div className="px-2.5 pb-1 pt-0.5 text-[11px] font-medium leading-4 tracking-wide text-muted-foreground/80">
          {label}
        </div>
      )}
      {items.map((item) => (
        <NavItem key={'path' in item ? item.path : item.label} item={item} isCollapsed={isCollapsed} />
      ))}
    </div>
  );
}

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isCollapsed) {
        if (document.body.style.overflow !== 'hidden') {
          toggleCollapse();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleCollapse, isCollapsed]);

  const primaryWithBadge = primaryNav.map((item) =>
    'path' in item && item.path === '/dashboard' && todoBadge > 0
      ? { ...item, badge: todoBadge }
      : item,
  );

  return (
    <div
      className={cn(
        'l2g-glass-aside relative z-50 flex h-full flex-col motion-safe:transition-[width] motion-safe:duration-300 motion-safe:ease-in-out',
        isCollapsed ? 'w-14' : 'w-60',
      )}
      data-testid="sidebar"
    >
      {showLogo && (
        <button
          type="button"
          aria-label={isCollapsed ? '展开侧栏' : '收起侧栏'}
          aria-expanded={!isCollapsed}
          className="no-drag flex h-14 shrink-0 cursor-pointer items-center border-b border-border px-3 transition-colors duration-200 hover:bg-secondary/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40"
          onMouseEnter={() => setIsLogoHovered(true)}
          onMouseLeave={() => setIsLogoHovered(false)}
          onClick={onLogoClick}
        >
          <div
            className={cn(
              'relative flex h-full w-full items-center transition-[padding] duration-300',
              isCollapsed ? 'justify-center px-0' : 'justify-start px-0.5',
            )}
          >
            <div
              className={cn(
                'absolute flex items-center justify-center transition-[opacity,transform] duration-200',
                isLogoHovered ? 'scale-100 opacity-100' : 'scale-90 opacity-0',
              )}
            >
              {isCollapsed ? (
                <PanelLeft size={18} aria-hidden="true" className="text-foreground" />
              ) : (
                <PanelLeftClose size={18} aria-hidden="true" className="text-foreground" />
              )}
            </div>

            <div
              className={cn(
                'flex w-full select-none items-center gap-2.5 transition-[opacity,transform] duration-200',
                isCollapsed ? 'justify-center' : 'justify-start',
                isLogoHovered ? 'scale-95 opacity-0' : 'scale-100 opacity-100',
              )}
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand text-on-brand text-xs font-bold">
                星
              </span>
              {!isCollapsed && (
                <span className="flex min-w-0 flex-col text-left leading-tight">
                  <span className="truncate text-sm font-semibold tracking-tight text-foreground">星笺</span>
                  <span className="text-[10px] tabular-nums text-muted-foreground/70">v{__APP_VERSION__}</span>
                </span>
              )}
            </div>
          </div>
        </button>
      )}

      <div className="flex shrink-0 flex-col px-3 pt-3">
        <NavItem item={quickCreate} isCollapsed={isCollapsed} />
      </div>

      <Scrollbar className="min-h-0 flex-1" contentClassName="flex flex-col gap-5 px-3 py-3">
        <nav aria-label="主导航">
          <NavSection label="工作台" items={primaryWithBadge} isCollapsed={isCollapsed} />
        </nav>
      </Scrollbar>

      <div className="shrink-0 border-t border-border px-3 py-3">
        <nav aria-label="系统">
          <NavSection items={utilityNav} isCollapsed={isCollapsed} />
        </nav>
      </div>
    </div>
  );
}
