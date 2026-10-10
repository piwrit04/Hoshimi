import {
  ClipboardList,
  Users,
  Sword,
  Wallet,
  TrendingUp,
  Bell,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/*
 * 概览页（Dashboard）
 *
 * 卡片布局参考 RhythmToolbox 首页：
 *   - 左侧 8 列：快捷入口卡片 × 4（2×2 网格）
 *   - 右侧 4 列：统计面板 + 公告面板
 *
 * 内容是占位数据，等业务层接好了再替换。
 */

export default function Dashboard() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10 px-4 md:px-8 pt-4">
      {/* 页头 */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-border/40">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <TrendingUp size={20} className="text-brand" />
            <span>概览</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            欢迎回来，今天也辛苦啦
          </p>
        </div>
      </header>

      {/* 主内容网格 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 左列：快捷入口（8 列） */}
        <div className="lg:col-span-8 space-y-6">
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <QuickAccessCard
              title="ORDERS"
              subtitle="订单管理"
              icon={ClipboardList}
              count={12}
            />
            <QuickAccessCard
              title="CLIENTS"
              subtitle="客户管理"
              icon={Users}
              count={8}
            />
            <QuickAccessCard
              title="WORKERS"
              subtitle="打手管理"
              icon={Sword}
              count={5}
            />
            <QuickAccessCard
              title="SETTLEMENT"
              subtitle="结算统计"
              icon={Wallet}
              count={3}
            />
          </section>
        </div>

        {/* 右列：统计面板（4 列） */}
        <div className="lg:col-span-4 space-y-6">
          <DashboardPanel title="本月收入">
            <div className="flex flex-col h-full justify-center gap-3">
              <div className="flex justify-between items-end">
                <span className="text-3xl font-black text-foreground">¥12,865</span>
                <span className="text-xs text-muted-foreground font-medium mb-1">
                  共 62 单
                </span>
              </div>
              <div className="h-1.5 w-full bg-secondary/50 rounded-full overflow-hidden">
                <div className="h-full bg-brand rounded-full w-[72%]" />
              </div>
              <p className="text-xs text-muted-foreground">
                目标 ¥18,000 · 已完成 72%
              </p>
            </div>
          </DashboardPanel>

          <DashboardPanel title="更新公告">
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <Bell size={36} className="mb-2 opacity-40" />
              <p className="text-sm">暂无更新公告</p>
              <p className="text-xs mt-1 opacity-60">有新公告会在这里显示</p>
            </div>
          </DashboardPanel>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 快捷入口卡片：图标 + 英文标签 + 中文标题 + 右下角大数字              */
/* ------------------------------------------------------------------ */

function QuickAccessCard({
  title,
  subtitle,
  icon: Icon,
  count,
}: {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  count?: number;
}) {
  return (
    <button
      type="button"
      className="block group relative h-36 overflow-hidden rounded-xl bg-card border border-border/50 shadow-sm transition-all duration-300 hover:shadow-md hover:border-brand/30 text-left w-full p-5 flex flex-col justify-between"
    >
      <div className="flex items-center gap-2 transition-transform duration-300 group-hover:translate-x-1">
        <div className="p-1.5 rounded-md bg-brand/10 text-brand transition-transform duration-300 group-hover:scale-110">
          <Icon size={16} />
        </div>
        <span className="text-[10px] font-bold text-brand uppercase tracking-wider">
          {title}
        </span>
      </div>
      <div className="flex justify-between items-end">
        <h3 className="text-lg font-bold text-foreground tracking-tight group-hover:text-brand transition-colors duration-300">
          {subtitle}
        </h3>
        {count !== undefined && (
          <span className="text-3xl font-black text-muted-foreground/10 group-hover:text-brand/15 transition-colors">
            {count}
          </span>
        )}
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* 统计面板：小图标 + 标题 + 内容区                                     */
/* ------------------------------------------------------------------ */

function DashboardPanel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border/50 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-300">
      <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
        <TrendingUp size={12} className="text-brand/70" />
        {title}
      </h3>
      <div>{children}</div>
    </div>
  );
}
