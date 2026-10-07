import { Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "@/MainLayout";
import { ThemeSync } from "@/components/ThemeSync";
import ComponentsPage from "@/pages/Components";
import NotFound from "@/pages/NotFound";

/*
 * 路由表。
 *
 * 侧栏里每一项都通向一个路由 —— **只有「组件预览」有真实内容，其余全部落到 404 卡片**。
 * 这是刻意的：先把外壳和组件库定下来，产品页面以后往这张表上加。
 *
 * 加新页面时：在这里加一条 <Route>，再在 Sidebar.tsx 的 navItems 里加一项。
 */
export function App() {
  return (
    <>
      <ThemeSync />
      <Routes>
        <Route path="/" element={<Navigate to="/components" replace />} />
        <Route element={<MainLayout />}>
          <Route path="/components" element={<ComponentsPage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </>
  );
}
