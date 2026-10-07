import { Minus, X, Search, Bell, Github, Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSearchStore } from '@/store/useSearchStore';
import { useThemeStore, type ThemeMode } from '@/store/useThemeStore';
import { useState } from 'react';
import { Tooltip } from '@/components/ui/Tooltip';

interface TitleBarProps {
  className?: string;
}

export function TitleBar({ className }: TitleBarProps) {
  const { openSearch } = useSearchStore();
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);
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

  return (
    <div
      className={cn(
        "h-full w-full flex items-center justify-between px-4 drag-region",
        className
      )}
    >
      {/* Center: Global Search Trigger - Fixed to Window Center */}
      <div className="fixed left-1/2 top-[26px] -translate-x-1/2 -translate-y-1/2 z-50 no-drag">
        <button
          onClick={openSearch}
          className="flex items-center gap-3 px-4 py-2 rounded-lg bg-secondary/80 border border-border hover:bg-secondary hover:border-border/80 hover:shadow-md focus:bg-secondary focus:border-primary/50 focus:ring-2 focus:ring-primary/20 focus:shadow-lg transition-all group text-sm w-96"
        >
          <div className="flex items-center gap-2">
            <Search size={14} className="text-muted-foreground group-hover:text-primary group-focus:text-primary transition-colors" />
            <span className="text-xs text-muted-foreground">搜索...</span>
          </div>
          <kbd className="pointer-events-none inline-flex h-4 select-none items-center gap-1 rounded border border-border bg-background px-1.5 font-sans text-[10px] font-medium text-muted-foreground opacity-100 ml-auto">
            <span className="text-[10px]">⌘</span>K
          </kbd>
        </button>
      </div>

      {/* Right: Toolbar & Window Controls - Pushed to right via justify-between on parent and empty left div if needed, or just ml-auto here */}
      <div className="flex items-center gap-2 ml-auto no-drag">
        {/* Announcement */}
        <Tooltip content="公告" position="bottom">
          <button
            onClick={() => setShowAnnouncement(!showAnnouncement)}
            className={cn(
              "h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all rounded-md",
              showAnnouncement && "text-primary bg-primary/10"
            )}
            type="button"
          >
            <Bell size={16} />
          </button>
        </Tooltip>

        {/* Project Homepage */}
        <Tooltip content="项目主页" position="bottom">
          <a
            href="https://gitee.com/aikotsuki/Rhythm_Toolbox"
            target="_blank"
            rel="noopener noreferrer"
            className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all rounded-md"
            type="button"
          >
            <Github size={16} />
          </a>
        </Tooltip>

        {/* Theme Toggle */}
        <Tooltip content={getThemeTitle()} position="bottom">
          <button
            onClick={toggleTheme}
            className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all rounded-md"
            type="button"
          >
            {getThemeIcon()}
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