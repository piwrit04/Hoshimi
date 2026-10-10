import { Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "@/MainLayout";
import { ThemeSync } from "@/components/ThemeSync";
import ComponentsPage from "@/pages/Components";
import Dashboard from "@/pages/Dashboard";
import Settings from "@/pages/Settings";
import Orders from "@/pages/Orders/List";
import NotFound from "@/pages/NotFound";

export function App() {
  return (
    <>
      <ThemeSync />
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/components" element={<ComponentsPage />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </>
  );
}
