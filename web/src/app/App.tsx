import { Suspense, lazy } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { useAuth } from "../context/AuthContext";
import { PERMISSIONS } from "../constants/permissions";

const LoginPage = lazy(() => import("../pages/LoginPage").then((module) => ({ default: module.LoginPage })));
const DashboardPage = lazy(() =>
  import("../pages/DashboardPage").then((module) => ({ default: module.DashboardPage }))
);
const CompaniesPage = lazy(() =>
  import("../pages/CompaniesPage").then((module) => ({ default: module.CompaniesPage }))
);
const CompanyDetailsPage = lazy(() =>
  import("../pages/CompanyDetailsPage").then((module) => ({ default: module.CompanyDetailsPage }))
);
const ActivitiesPage = lazy(() =>
  import("../pages/ActivitiesPage").then((module) => ({ default: module.ActivitiesPage }))
);
const ActivityDetailsPage = lazy(() =>
  import("../pages/ActivityDetailsPage").then((module) => ({ default: module.ActivityDetailsPage }))
);
const UsersPage = lazy(() => import("../pages/UsersPage").then((module) => ({ default: module.UsersPage })));
const ReportsPage = lazy(() =>
  import("../pages/ReportsPage").then((module) => ({ default: module.ReportsPage }))
);
const ProfilesPage = lazy(() =>
  import("../pages/ProfilesPage").then((module) => ({ default: module.ProfilesPage }))
);
const MyProfilePage = lazy(() =>
  import("../pages/MyProfilePage").then((module) => ({ default: module.MyProfilePage }))
);
const FinancialEntriesPage = lazy(() =>
  import("../pages/FinancialEntriesPage").then((module) => ({ default: module.FinancialEntriesPage }))
);
const FinancialReportsPage = lazy(() =>
  import("../pages/FinancialReportsPage").then((module) => ({ default: module.FinancialReportsPage }))
);
const FinancialSettingsPage = lazy(() =>
  import("../pages/FinancialSettingsPage").then((module) => ({ default: module.FinancialSettingsPage }))
);

function ForbiddenPage() {
  return (
    <div className="card">
      <h3>Acesso negado</h3>
      <p>Seu perfil nao possui permissao para acessar esta area.</p>
    </div>
  );
}

function RequireAuth({ children }: { children: JSX.Element }) {
  const location = useLocation();
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="card">Carregando sessao...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}

function RequirePermission({ permission, children }: { permission: string; children: JSX.Element }) {
  const { hasPermission } = useAuth();

  if (!hasPermission(permission)) {
    return <ForbiddenPage />;
  }

  return children;
}

function ProtectedLayout({ children }: { children: JSX.Element }) {
  return (
    <RequireAuth>
      <AppShell>{children}</AppShell>
    </RequireAuth>
  );
}

export function App() {
  const { isAuthenticated } = useAuth();

  return (
    <Suspense fallback={<div className="card">Carregando pagina...</div>}>
      <Routes>
        <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedLayout>
              <RequirePermission permission={PERMISSIONS.DASHBOARD_READ}>
                <DashboardPage />
              </RequirePermission>
            </ProtectedLayout>
          }
        />
        <Route
          path="/empresas"
          element={
            <ProtectedLayout>
              <RequirePermission permission={PERMISSIONS.COMPANIES_READ}>
                <CompaniesPage />
              </RequirePermission>
            </ProtectedLayout>
          }
        />
        <Route
          path="/empresas/:id"
          element={
            <ProtectedLayout>
              <RequirePermission permission={PERMISSIONS.COMPANIES_READ}>
                <CompanyDetailsPage />
              </RequirePermission>
            </ProtectedLayout>
          }
        />
        <Route
          path="/atividades"
          element={
            <ProtectedLayout>
              <ActivitiesPage />
            </ProtectedLayout>
          }
        />
        <Route
          path="/atividades/:id"
          element={
            <ProtectedLayout>
              <ActivityDetailsPage />
            </ProtectedLayout>
          }
        />
        <Route
          path="/usuarios"
          element={
            <ProtectedLayout>
              <RequirePermission permission={PERMISSIONS.USERS_READ}>
                <UsersPage />
              </RequirePermission>
            </ProtectedLayout>
          }
        />
        <Route
          path="/perfis"
          element={
            <ProtectedLayout>
              <RequirePermission permission={PERMISSIONS.PERMISSIONS_MANAGE}>
                <ProfilesPage />
              </RequirePermission>
            </ProtectedLayout>
          }
        />
        <Route
          path="/relatorios"
          element={
            <ProtectedLayout>
              <RequirePermission permission={PERMISSIONS.REPORTS_READ}>
                <ReportsPage />
              </RequirePermission>
            </ProtectedLayout>
          }
        />
        <Route
          path="/meu-perfil"
          element={
            <ProtectedLayout>
              <MyProfilePage />
            </ProtectedLayout>
          }
        />
        <Route
          path="/financeiro/lancamentos"
          element={
            <ProtectedLayout>
              <RequirePermission permission={PERMISSIONS.FINANCE_READ}>
                <FinancialEntriesPage />
              </RequirePermission>
            </ProtectedLayout>
          }
        />
        <Route
          path="/financeiro/relatorios"
          element={
            <ProtectedLayout>
              <RequirePermission permission={PERMISSIONS.FINANCE_REPORTS}>
                <FinancialReportsPage />
              </RequirePermission>
            </ProtectedLayout>
          }
        />
        <Route
          path="/financeiro/configuracoes"
          element={
            <ProtectedLayout>
              <RequirePermission permission={PERMISSIONS.FINANCE_SETTINGS}>
                <FinancialSettingsPage />
              </RequirePermission>
            </ProtectedLayout>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
