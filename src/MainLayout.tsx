import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { TitleBar } from "@/components/layout/TitleBar";
import { Sidebar } from "@/components/layout/Sidebar";
import { AppWallpaper } from "@/components/layout/AppWallpaper";
import { SakuraParticles } from "@/components/layout/SakuraParticles";
import { ToastContainer } from "@/components/ui/Toast";
import { FloatingSearch } from "@/components/search/FloatingSearch";
import { Scrollbar } from "@/components/ui/Scrollbar";
import NewOrderModal from "@/pages/Orders/NewOrder";
import { ProfileDrawer } from "@/components/profile/ProfileDrawer";
import { ModalConfirmHost } from "@/components/ui/ModalConfirm";
import { ShortcutsSheet } from "@/components/help/ShortcutsSheet";
import { UpdateHighlights } from "@/components/help/UpdateHighlights";
import { GlobalShortcuts } from "@/components/help/GlobalShortcuts";
import { HighlightsBootstrap } from "@/components/help/HighlightsBootstrap";

/*
 * Liver2Go 壳：壁纸仅内容区（top-14 起，可含侧栏下方），顶栏实色/磨砂不透壁纸。
 * 标题栏高度 h-14（56px）；改它要连带壁纸 top 与 404 的 min-h calc。
 */
export default function MainLayout() {
  const location = useLocation();
  return (
    <div className="l2g-shell relative h-screen w-screen flex overflow-hidden text-foreground font-sans transition-colors duration-300">
      <AppWallpaper />
      <SakuraParticles />
      <FloatingSearch />

      <aside className="hidden md:flex md:flex-col shrink-0 h-full relative z-20">
        <Sidebar showLogo={true} />
      </aside>

      <div className="min-w-0 flex-1 flex flex-col relative z-10">
        <header className="l2g-glass-header shrink-0 z-50 h-14">
          <TitleBar className="h-full" />
        </header>

        {/* 全站唯一滚动容器 data-scroll-root */}
        <Scrollbar data-scroll-root className="l2g-content min-h-0 flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="min-h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </Scrollbar>
      </div>

      <ToastContainer />
      <ModalConfirmHost />
      <NewOrderModal />
      <ProfileDrawer />
      <GlobalShortcuts />
      <HighlightsBootstrap />
      <ShortcutsSheet />
      <UpdateHighlights />
    </div>
  );
}
