import { useEffect, useMemo, memo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Boxes, Settings, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSidebarStore } from '@/store/useSidebarStore';
import { Tooltip } from '@/components/ui/Tooltip';

/*
 * 侧栏。
 *
 * 结构与样式整套来自工具箱的 Sidebar.tsx —— className 保持原样，只动了三处：
 *   1. navItems 换成我们自己的三项；去掉了 isAction / isExternal 两种类型
 *   2. 移除了 useSettingsStore（devMode）和 useEditorStore（openStartup）两个 store 依赖
 *   3. 去掉了自动折叠的媒体查询（本项目没有「小屏自动收起」的需求，
 *      而且它会和手动折叠打架）
 *
 * 图标从 lucide 的 Home / Settings 换成 Boxes 表示「组件预览」。
 */

const navItems = [
  { icon: Home, label: '概览', path: '/dashboard' },
  { icon: Boxes, label: '组件预览', path: '/components' },
  { icon: Settings, label: '设置', path: '/settings' },
];

const NavItem = memo(function NavItem({
  item,
  isCollapsed,
}: {
  item: (typeof navItems)[number];
  isCollapsed: boolean;
}) {
  const iconClass = 'transition-colors shrink-0';
  const spanClass = 'font-medium text-sm whitespace-nowrap overflow-hidden transition-opacity duration-300';

  return (
    <Tooltip content={isCollapsed ? item.label : null} position="right">
      <NavLink
        to={item.path}
        className={({ isActive }) =>
          cn(
            'flex items-center px-3 py-2.5 rounded-lg transition-colors duration-300 relative overflow-hidden group',
            isActive
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
            isCollapsed ? 'justify-center' : 'gap-3'
          )
        }
      >
        {({ isActive }) => (
          <>
            <item.icon
              size={20}
              className={cn(iconClass, isActive ? 'text-primary-foreground' : 'group-hover:text-primary')}
            />
            <span className={cn(spanClass, isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100')}>
              {item.label}
            </span>
          </>
        )}
      </NavLink>
    </Tooltip>
  );
});

export function Sidebar({ showLogo = true }: { showLogo?: boolean }) {
  const { isCollapsed, toggleCollapse } = useSidebarStore();
  const [isLogoHovered, setIsLogoHovered] = useState(false);

  const memoizedNavItems = useMemo(() => navItems, []);

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

  const sidebarWidth = isCollapsed ? 'w-16' : 'w-64';

  return (
    <div
      className={cn(
        'h-full flex flex-col relative transition-all duration-300 ease-in-out z-50',
        /* ⚠️ 工具箱原文是写死的浅粉底 bg-[#FCFAFD]/92 + 边框 #E8E1F0 —— 深色模式不跟着变。
           这里换成主题变量。阴影保留原样（它本来就只是外侧一道柔影，不分模式）。 */
        'bg-card/92 backdrop-blur-xl border-r border-border/80 shadow-[8px_0_24px_rgba(40,28,65,0.08)]',
        sidebarWidth
      )}
      data-testid="sidebar"
    >
      {showLogo && (
        <button
          type="button"
          aria-label={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          className="flex items-center justify-center shrink-0 cursor-pointer transition-colors duration-300 hover:bg-secondary/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary no-drag h-16 px-3"
          onMouseEnter={() => setIsLogoHovered(true)}
          onMouseLeave={() => setIsLogoHovered(false)}
          onClick={toggleCollapse}
        >
          <div
            className={cn(
              'relative flex items-center justify-center h-full transition-all duration-300',
              isCollapsed ? 'w-16 px-0' : 'w-full px-4'
            )}
          >
            {/* 悬停时把 logo 换成展开/收起图标 */}
            <div
              className={cn(
                'absolute transition-all duration-300 flex items-center justify-center',
                isLogoHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
              )}
            >
              <Menu size={24} className="text-foreground" />
            </div>

            {/* 品牌字标 —— **占位 LOGO**。
                原版是一张 logo 图，这里先用「星」字代替，尺寸和过渡保持原样。
                等设计稿出来，把这里换成 <img src={logo} /> 即可；
                折叠态那个 40×40 的方块就是图标的落点。
                ⚠️ 改品牌名时这一处要和 index.html 的 <title>、加载画面文字、
                   内联 favicon 的汉字、electron/main.cjs 的 TITLE 一起改。 */}
            <div
              className={cn(
                'h-10 w-full max-w-[180px] rounded-xl bg-primary text-primary-foreground',
                'flex items-center justify-center font-bold tracking-wide text-base',
                'transition-all duration-300 select-none',
                isCollapsed ? 'w-10 text-sm' : '',
                isLogoHovered ? 'opacity-0 scale-75' : 'opacity-100 scale-100'
              )}
            >
              {isCollapsed ? '星' : '星笺'}
            </div>
          </div>
        </button>
      )}

      <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
        {memoizedNavItems.map((item) => (
          <NavItem key={item.path} item={item} isCollapsed={isCollapsed} />
        ))}
      </nav>
    </div>
  );
}
