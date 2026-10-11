import { lazy, Suspense, useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "@/MainLayout";
import { ThemeSync } from "@/components/ThemeSync";
import { LoadingBarHost } from "@/components/ui/LoadingBar";
import { bootPersist, dismissHtmlSplash } from "@/storage/boot";
import { useOrdersStore } from "@/store/useOrdersStore";
import { useSetupStore } from "@/store/useSetupStore";
import Dashboard from "@/pages/Dashboard";
import Settings from "@/pages/Settings";
import Orders from "@/pages/Orders/List";
import Customers from "@/pages/Customers";
import Todo from "@/pages/Todo";
import NotFound from "@/pages/NotFound";
import SetupWizard from "@/pages/Setup/SetupWizard";

/* 组件预览体积大且只在开发时看：按需加载，主包更小、启动更快 */
const ComponentsPage = lazy(() => import("@/pages/Components"));

function readSeedFlag(): boolean {
  try {
    const hash = window.location.hash || "";
    const q = hash.includes("?") ? hash.slice(hash.indexOf("?") + 1) : "";
    if (new URLSearchParams(q).get("seedDemo") === "1") return true;
    return new URLSearchParams(window.location.search).get("seedDemo") === "1";
  } catch {
    return false;
  }
}

function clearSeedFlag() {
  try {
    const hash = window.location.hash || "#/dashboard";
    const path = hash.split("?")[0] || "#/dashboard";
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}${path}`);
  } catch {
    /* ignore */
  }
}

export function App() {
  const [ready, setReady] = useState(false);
  const setupComplete = useSetupStore((s) => s.setupComplete);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await bootPersist();
      if (cancelled) return;

      if (readSeedFlag()) {
        const { buildFixtureSnapshot } = await import("@/domain/fixtures");
        useOrdersStore.getState().replaceSnapshot(buildFixtureSnapshot());
        // 等防抖落盘
        await new Promise((r) => setTimeout(r, 350));
        clearSeedFlag();
        ;(window as unknown as { __HOSHIMI_SEEDED__?: boolean }).__HOSHIMI_SEEDED__ = true;
      }

      /* 老用户升级（从未跑过引导、未抑制）：有账本则一次性跳过强制引导。
         设置里重开或引导进行中会 suppressLedgerAutoComplete，刷新不得自动标完成。 */
      const setup = useSetupStore.getState();
      if (!setup.setupComplete && !setup.suppressLedgerAutoComplete) {
        const { orders, customers } = useOrdersStore.getState();
        if (orders.length > 0 || customers.length > 0) {
          setup.completeSetup();
        }
      }

      dismissHtmlSplash();
      setReady(true);
      ;(window as unknown as { __HOSHIMI_READY__?: boolean }).__HOSHIMI_READY__ = true;
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <LoadingBarHost />
      <ThemeSync />
      {ready ? (
        setupComplete ? (
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/setup" element={<Navigate to="/dashboard" replace />} />
            <Route element={<MainLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/todo" element={<Todo />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/customers/:customerId" element={<Customers />} />
              <Route
                path="/components"
                element={
                  <Suspense fallback={null}>
                    <ComponentsPage />
                  </Suspense>
                }
              />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        ) : (
          <Routes>
            <Route path="/setup" element={<SetupWizard />} />
            <Route path="*" element={<Navigate to="/setup" replace />} />
          </Routes>
        )
      ) : null}
    </>
  );
}
