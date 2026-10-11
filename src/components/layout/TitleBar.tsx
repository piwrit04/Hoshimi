import { Minus, X, Search, Bell, Github, Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSearchStore } from '@/store/useSearchStore';
import { useThemeStore } from '@/store/useThemeStore';
import { useProfileStore, profileInitial } from '@/store/useProfileStore';
import { Avatar } from '@/components/ui/data';
import { useState } from 'react';
import { Tooltip } from '@/components/ui/Tooltip';

interface TitleBarProps {
  className?: string;
}

export function TitleBar({ className }: TitleBarProps) {
  const { openSearch } = useSearchStore();
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);
  const nickname = useProfileStore((s) => s.nickname);
  const avatarHue = useProfileStore((s) => s.avatarHue);
  const openDrawer = useProfileStore((s) => s.openDrawer);
  const [showAnnouncement, setShowAnnouncement] = useState(false);

  const handleMinimize = () => {
    window.ipcRenderer.send('window-minimize');
  };

  const handleMaximize = () => {
    window.ipcRenderer.send('window-maximize');
  };

  const handleClose = () => {
    window.ipcRenderer.send('window-close');
  };

  const toggleTheme = () => {
    if (mode === 'light') {
      setMode('dark');
    } else {
      setMode('light');
    }
  };

  const getThemeIcon = () => {
    return mode === 'light' ? <Sun size={16} /> : <Moon size={16} />;
  };

  const getThemeTitle = () => {
    return mode === 'light' ? '浅色模式' : '深色模式';
  };

  const avatarStyle = {
    backgroundColor: `hsla(${avatarHue}, 70%, 88%, 0.95)`,
    color: `hsl(${avatarHue}, 55%, 38%)`,
  };

  return (
    <div
      className={cn(
        "h-full w-full flex items-center justify-between px-4 drag-region",
        className
      )}
    >
      {/* Center: Global Search Trigger - Fixed to Window Center */}
      <div className="fixed left-1/2 top-[28px] -translate-x-1/2 -translate-y-1/2 z-50 no-drag">
        <button
          onClick={openSearch}
          className="flex h-9 items-center gap-2 px-3 rounded-lg bg-background border border-border hover:border-brand/40 focus:border-brand focus:ring-2 focus:ring-brand/20 transition-colors group text-sm w-80"
        >
          <div className="flex items-center gap-2">
            <Search size={14} className="text-muted-foreground group-hover:text-primary group-focus:text-primary transition-colors" />
            <span className="text-sm text-muted-foreground">搜索订单、客户…</span>
          </div>
          <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-secondary px-1.5 font-sans text-[10px] font-medium text-muted-foreground opacity-100 ml-auto">
            <span className="text-[10px]">Ctrl</span>K
          </kbd>
        </button>
      </div>

      {/* Right: Toolbar & Window Controls */}
      <div className="flex items-center gap-2 ml-auto no-drag">
        <Tooltip content="公告" position="bottom">
          <button
            onClick={() => setShowAnnouncement(!showAnnouncement)}
            className={cn(
              "h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors rounded-lg",
              showAnnouncement && "text-primary bg-primary/10"
            )}
            type="button"
          >
            <Bell size={16} />
          </button>
        </Tooltip>

        <Tooltip content="项目主页" position="bottom">
          <a
            href="#"
            onClick={(e) => e.preventDefault()}
            target="_blank"
            rel="noopener noreferrer"
            className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors rounded-lg"
          >
            <Github size={16} />
          </a>
        </Tooltip>

        <Tooltip content={getThemeTitle()} position="bottom">
          <button
            onClick={toggleTheme}
            className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors rounded-lg"
            type="button"
          >
            {getThemeIcon()}
          </button>
        </Tooltip>

        <Tooltip content={nickname || '个人中心'} position="bottom">
          <button
            type="button"
            onClick={openDrawer}
            className="dd-titlebar-avatar h-8 w-8 flex items-center justify-center rounded-full ring-1 ring-border/60 hover:ring-brand/50 transition-[box-shadow,transform] hover:scale-[1.04]"
            aria-label="打开个人中心"
          >
            <Avatar size="sm" style={avatarStyle}>
              {profileInitial(nickname)}
            </Avatar>
          </button>
        </Tooltip>
      </div>

      {/* Window Controls */}
      <div className="flex items-center gap-1 ml-4 no-drag">
        <button
          onClick={handleMinimize}
          className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors rounded-md"
          type="button"
          title="最小化"
        >
          <Minus size={14} />
        </button>
        <button
          onClick={handleMaximize}
          className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors rounded-md"
          type="button"
          title="最大化"
        >
          <div className="w-2.5 h-2.5 border-[1.5px] border-current rounded-sm" />
        </button>
        <button
          onClick={handleClose}
          className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors rounded-md"
          type="button"
          title="关闭"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
