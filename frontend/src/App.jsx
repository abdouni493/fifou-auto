import { useEffect, lazy, Suspense } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { MotionConfig } from "framer-motion";
import { useStore } from "./store/useStore.js";
import { firstAllowedSection } from "./lib/permissions.js";

import AppShell from "./components/AppShell.jsx";
import Login from "./pages/Login.jsx";
const Dashboard = lazy(() => import("./pages/Dashboard.jsx"));
const Showroom = lazy(() => import("./pages/Showroom.jsx"));
const Purchase = lazy(() => import("./pages/Purchase.jsx"));
const POS = lazy(() => import("./pages/POS.jsx"));
const Sales = lazy(() => import("./pages/Sales.jsx"));
const Payments = lazy(() => import("./pages/Payments.jsx"));
const Caisse = lazy(() => import("./pages/Caisse.jsx"));
const WebsiteSettings = lazy(() => import("./pages/WebsiteSettings.jsx"));
const WebsiteReservations = lazy(() => import("./pages/WebsiteReservations.jsx"));
const Suppliers = lazy(() => import("./pages/Suppliers.jsx"));
const Clients = lazy(() => import("./pages/Clients.jsx"));
const Workers = lazy(() => import("./pages/Workers.jsx"));
const Expenses = lazy(() => import("./pages/Expenses.jsx"));
const Reports = lazy(() => import("./pages/Reports.jsx"));
const Settings = lazy(() => import("./pages/Settings.jsx"));

const Home = lazy(() => import("./pages/website/Home.jsx"));
const CarDetail = lazy(() => import("./pages/website/CarDetail.jsx"));
const Contacts = lazy(() => import("./pages/website/Contacts.jsx"));

function ProtectedRoute({ children }) {
  const { user, authChecked, loadMe } = useStore();
  const location = useLocation();

  useEffect(() => {
    if (!authChecked) loadMe();
  }, [authChecked, loadMe]);

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-text-muted heading">Chargement...</div>
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
}

// Landing inside /app: send the user to the first section they're allowed to see.
const SECTION_ROUTE = { websiteSettings: "website-settings", websiteReservations: "website-reservations" };
function DefaultLanding() {
  const user = useStore((s) => s.user);
  const section = firstAllowedSection(user);
  if (!section) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-center">
        <div>
          <p className="heading text-lg text-text-primary mb-1">Aucun accès</p>
          <p className="text-text-muted text-sm">Aucune permission ne vous a été attribuée. Contactez un administrateur.</p>
        </div>
      </div>
    );
  }
  return <Navigate to={`/app/${SECTION_ROUTE[section] || section}`} replace />;
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
    <Suspense fallback={null}>
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />

      {/* Public website */}
      <Route path="/website" element={<Home />} />
      <Route path="/website/contacts" element={<Contacts />} />
      <Route path="/website/car/:id" element={<CarDetail />} />

      {/* Protected app */}
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<DefaultLanding />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="showroom" element={<Showroom />} />
        <Route path="purchase" element={<Purchase />} />
        <Route path="pos" element={<POS />} />
        <Route path="sales" element={<Sales />} />
        <Route path="payments" element={<Payments />} />
        <Route path="caisse" element={<Caisse />} />
        <Route path="website-settings" element={<WebsiteSettings />} />
        <Route path="website-reservations" element={<WebsiteReservations />} />
        <Route path="suppliers" element={<Suppliers />} />
        <Route path="clients" element={<Clients />} />
        <Route path="workers" element={<Workers />} />
        <Route path="expenses" element={<Expenses />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
    </Suspense>
    </MotionConfig>
  );
}
