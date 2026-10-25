import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { TitleBar } from "@/components/layout/TitleBar";
import { Sidebar } from "@/components/layout/Sidebar";
import { AppWallpaper } from "@/components/layout/AppWallpaper";
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
 * Console 壳：实色底 #0B0F17 · 侧栏/表卡 #121826；柔粉仅点缀；侧栏选中浅底+竖线。
 * 标题栏高度 h-14（56px）。
 */
export default function MainLayout() {
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  /* SSR/首帧前 useReducedMotion 可能为 null；再读一次 matchMedia 兜底 */
  const [prefersReduce, setPrefersReduce] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReduce(mql.matches);
    const onChange = () => setPrefersReduce(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  const instant = reduceMotion === true || prefersReduce;

  return (
    <div className="l2g-shell relative h-screen w-screen flex overflow-hidden text-foreground font-sans transition-colors duration-300">
      <AppWallpaper />
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
              initial={instant ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={instant ? undefined : { opacity: 0 }}
              transition={instant ? { duration: 0 } : { duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
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
