import { lazy, Suspense, useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "@/MainLayout";
import { ThemeSync } from "@/components/ThemeSync";
import { LoadingBarHost } from "@/components/ui/LoadingBar";
import { bootPersist, dismissHtmlSplash } from "@/storage/boot";
import Dashboard from "@/pages/Dashboard";
import Settings from "@/pages/Settings";
import Orders from "@/pages/Orders/List";
import Customers from "@/pages/Customers";
import Todo from "@/pages/Todo";
import NotFound from "@/pages/NotFound";

/* 组件预览体积大且只在开发时看：按需加载，主包更小、启动更快 */
const ComponentsPage = lazy(() => import("@/pages/Components"));

export function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await bootPersist();
      if (cancelled) return;
      dismissHtmlSplash();
      setReady(true);
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
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
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
      ) : null}
    </>
  );
}
