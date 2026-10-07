import { Outlet } from "react-router-dom";
import { TitleBar } from "@/components/layout/TitleBar";
import { Sidebar } from "@/components/layout/Sidebar";
import { ToastContainer } from "@/components/ui/Toast";
import { FloatingSearch } from "@/components/search/FloatingSearch";

/*
 * 外壳：左侧栏 + 右上标题栏 + 右下内容区。
 *
 * 结构和尺寸整套来自工具箱的 MainLayout。**改了两处写死的颜色**：
 *   工具箱原文用 `bg-[#FCFAFD]/92` 和边框 `#E8E1F0` —— 那是写死的浅粉色，
 *   深色模式下侧栏和标题栏不会跟着变（这是从工具箱带过来的问题）。
 *   这里换成主题变量 bg-card / border-border，浅深两套才一致。
 *
 * ⚠️ 标题栏是 52px 高（h-[52px]）。改它会连带影响 404 卡片里那句
 *    min-h-[calc(100vh-48px)]，两处要一起改。
 */
export default function MainLayout() {
  return (
    <div className="h-screen w-screen flex overflow-hidden bg-background text-foreground font-sans transition-colors duration-300">
      <FloatingSearch />

      {/* 左侧栏 */}
      <aside className="hidden md:flex md:flex-col shrink-0 h-full w-64">
        <Sidebar showLogo={true} />
      </aside>

      {/* 右侧：标题栏 + 内容 */}
      <div className="min-w-0 flex-1 flex flex-col">
        <header className="shrink-0 z-50 h-[52px] bg-card/92 backdrop-blur-xl border-b border-border/80">
          <TitleBar className="h-full" />
        </header>

        {/*
          ⚠️ 这个 <main> 是**全站唯一的滚动容器**。
          组件展示页的锚点跳转和滚动高亮必须找它，不是 window ——
          见 src/pages/Components/index.tsx 顶部那段注释。
          加 data-scroll-root 是为了让那个页面能明确地找到它，
          比 querySelector('main') 靠标签名稳。
        */}
        <main data-scroll-root className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          <Outlet />
        </main>
      </div>

      <ToastContainer />
    </div>
  );
}
