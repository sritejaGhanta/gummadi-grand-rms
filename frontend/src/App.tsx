import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { SettingsProvider, useSettings } from './context/SettingsContext';
import { NavProvider } from './context/NavContext';
import { ShieldAlert } from 'lucide-react';

import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';

import { LoginPage } from './pages/LoginPage';
import { StaffPosPage } from './pages/StaffPosPage';
import { KitchenDashboard } from './pages/KitchenDashboard';
import { ManagerDashboard } from './pages/ManagerDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { MenuManagementPage } from './pages/MenuManagementPage';
import { FloorManagementPage } from './pages/FloorManagementPage';
import { RoleManagementPage } from './pages/RoleManagementPage';
import { ActivityLogsPage } from './pages/ActivityLogsPage';
import { SettingsPage } from './pages/SettingsPage';
import { UsersManagementPage } from './pages/UsersManagementPage';
import { StaffPerformancePage } from './pages/StaffPerformancePage';
import { ChefHistoryPage } from './pages/ChefHistoryPage';
import { InventoryManagementPage } from './pages/InventoryManagementPage';
import { DayClosePage } from './pages/DayClosePage';
import { CustomersCrmPage } from './pages/CustomersCrmPage';
import { SuperAdminDashboard } from './pages/SuperAdminDashboard';
import { RestaurantOwnerDashboard } from './pages/RestaurantOwnerDashboard';
import { LandingPage } from './pages/LandingPage';
import { QrCustomerMenuPage } from './pages/QrCustomerMenuPage';
import { StaffAttendancePage } from './pages/StaffAttendancePage';

const RoleBasedRedirect: React.FC = () => {
  const { user, isSuperAdmin } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (isSuperAdmin) return <Navigate to="/super-admin" replace />;
  const role = user.role?.name?.toLowerCase();
  if (role === 'chef') return <Navigate to="/kitchen" replace />;
  if (role === 'manager' || role === 'owner') return <Navigate to="/owner-dashboard" replace />;
  if (role === 'admin') return <Navigate to="/admin" replace />;
  return <Navigate to="/pos" replace />;
};

const ProtectedLayout: React.FC<{
  children: React.ReactNode;
  requiredPermission?: string;
  requiredRole?: string[];
  strictRole?: boolean;
}> = ({ children, requiredPermission, requiredRole, strictRole }) => {
  const { user, isAdmin, isSuperAdmin, hasPermission } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const roleName = user.role?.name?.toLowerCase() || '';

  const hasRoleMatch = !requiredRole
    ? true
    : strictRole
    ? requiredRole.map((r) => r.toLowerCase()).includes(roleName) || (requiredRole.includes('superadmin') && isSuperAdmin)
    : isSuperAdmin || isAdmin || requiredRole.map((r) => r.toLowerCase()).includes(roleName);

  const hasPermMatch =
    !requiredPermission || isSuperAdmin || isAdmin || hasPermission(requiredPermission);

  if (!hasRoleMatch || !hasPermMatch) {
    const defaultHome =
      isSuperAdmin
        ? '/super-admin'
        : roleName === 'chef'
        ? '/kitchen'
        : roleName === 'manager' || roleName === 'owner'
        ? '/owner-dashboard'
        : roleName === 'admin'
        ? '/admin'
        : '/pos';

    return (
      <div className="h-screen bg-slate-950 flex flex-col text-slate-100 overflow-hidden">
        <Navbar />
        <div className="flex flex-1 relative overflow-hidden">
          <Sidebar />
          <main className="flex-1 w-full overflow-y-auto flex items-center justify-center p-6">
            <div className="max-w-md w-full glass-panel p-8 rounded-3xl border border-rose-500/20 text-center space-y-4 shadow-2xl">
              <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 mx-auto flex items-center justify-center">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-black text-white">Access Denied</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Your account role (<span className="text-amber-400 font-semibold">{user.role?.displayName || user.role?.name}</span>) does not have sufficient permissions to view this section.
              </p>
              {requiredPermission && (
                <div className="inline-block px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-400">
                  Required: {requiredPermission}
                </div>
              )}
              <div className="pt-2">
                <a
                  href={defaultHome}
                  className="inline-block px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition"
                >
                  Return to My Workspace
                </a>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-950 flex flex-col text-slate-100 overflow-hidden">
      <Navbar />
      <div className="flex flex-1 relative overflow-hidden">
        <Sidebar />
        <main className="flex-1 w-full overflow-y-auto">{children}</main>
      </div>
    </div>
  );
};

const AHARPOS_FAVICON = "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect width=%22100%22 height=%22100%22 rx=%2222%22 fill=%22%23f59e0b%22/><text y=%22.75em%22 x=%2250%25%22 font-size=%2260%22 text-anchor=%22middle%22>🔥</text></svg>";

const setFavicon = (url: string) => {
  let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.getElementsByTagName('head')[0].appendChild(link);
  }
  link.href = url;
};

const RouteTitleManager: React.FC = () => {
  const location = useLocation();
  const { user, isSuperAdmin } = useAuth();
  const { restaurantName, settings } = useSettings();

  useEffect(() => {
    const isSuper = isSuperAdmin || location.pathname.includes('/super-admin');
    const isPublic = location.pathname === '/' || location.pathname === '/landing' || location.pathname === '/login';
    const isQr = location.pathname.startsWith('/qr') || location.pathname.startsWith('/menu');

    if (isSuper) {
      document.title = 'AharPOS — Super Administrator Master Panel';
      setFavicon(AHARPOS_FAVICON);
    } else if (isPublic) {
      if (location.pathname === '/login') {
        document.title = 'AharPOS — Staff & Owner Login';
      } else {
        document.title = 'AharPOS — The Operating System for Fast-Growing Restaurants';
      }
      setFavicon(AHARPOS_FAVICON);
    } else if (isQr) {
      document.title = `Digital Contactless Menu • ${restaurantName || 'Restaurant'} • AharPOS`;
      if (settings?.restaurant_favicon_url) {
        setFavicon(settings.restaurant_favicon_url);
      } else {
        setFavicon(AHARPOS_FAVICON);
      }
    } else {
      const tenantName = (user as any)?.restaurant?.name || restaurantName || 'Restaurant Outlet';
      document.title = `${tenantName} • AharPOS`;
      const tenantFavicon = (user as any)?.restaurant?.brandLogo || settings?.restaurant_favicon_url;
      if (tenantFavicon) {
        setFavicon(tenantFavicon);
      } else {
        setFavicon(AHARPOS_FAVICON);
      }
    }
  }, [location.pathname, isSuperAdmin, user, restaurantName, settings]);

  return null;
};

export const App: React.FC = () => {
  const basename = window.location.pathname.startsWith('/restaurant') ? '/restaurant' : '';
  return (
    <BrowserRouter basename={basename}>
      <AuthProvider>
        <SocketProvider>
          <SettingsProvider>
            <NavProvider>
              <RouteTitleManager />
              <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/landing" element={<LandingPage />} />
              <Route path="/qr/:slug/:tableNumber" element={<QrCustomerMenuPage />} />
              <Route path="/menu/:slug/:tableNumber" element={<QrCustomerMenuPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/app" element={<RoleBasedRedirect />} />

              {/* SaaS Multi-Tenant Platform Routes */}
              <Route
                path="/super-admin"
                element={
                  <ProtectedLayout requiredRole={['superadmin']} strictRole>
                    <SuperAdminDashboard />
                  </ProtectedLayout>
                }
              />
              <Route
                path="/owner-dashboard"
                element={
                  <ProtectedLayout requiredRole={['superadmin', 'admin', 'manager', 'owner']}>
                    <RestaurantOwnerDashboard />
                  </ProtectedLayout>
                }
              />

              {/* Protected routes with Granular RBAC Permissions */}
              <Route
                path="/admin"
                element={
                  <ProtectedLayout requiredRole={['admin']}>
                    <AdminDashboard />
                  </ProtectedLayout>
                }
              />
              <Route
                path="/pos"
                element={
                  <ProtectedLayout requiredPermission="orders.view">
                    <StaffPosPage />
                  </ProtectedLayout>
                }
              />
              <Route
                path="/staff-pos"
                element={
                  <ProtectedLayout requiredPermission="orders.view">
                    <StaffPosPage />
                  </ProtectedLayout>
                }
              />
              <Route
                path="/kitchen"
                element={
                  <ProtectedLayout requiredPermission="kitchen.view">
                    <KitchenDashboard />
                  </ProtectedLayout>
                }
              />
              <Route
                path="/kitchen/history"
                element={
                  <ProtectedLayout requiredPermission="kitchen.view">
                    <ChefHistoryPage />
                  </ProtectedLayout>
                }
              />
              <Route
                path="/kitchen-history"
                element={
                  <ProtectedLayout requiredPermission="kitchen.view">
                    <ChefHistoryPage />
                  </ProtectedLayout>
                }
              />
              <Route
                path="/manager"
                element={
                  <ProtectedLayout requiredPermission="billing.create">
                    <ManagerDashboard />
                  </ProtectedLayout>
                }
              />
              <Route
                path="/inventory"
                element={
                  <ProtectedLayout requiredRole={['admin', 'manager']}>
                    <InventoryManagementPage />
                  </ProtectedLayout>
                }
              />
              <Route
                path="/day-close"
                element={
                  <ProtectedLayout requiredRole={['admin', 'manager']}>
                    <DayClosePage />
                  </ProtectedLayout>
                }
              />
              <Route
                path="/customers"
                element={
                  <ProtectedLayout requiredRole={['admin', 'manager']}>
                    <CustomersCrmPage />
                  </ProtectedLayout>
                }
              />
              <Route
                path="/attendance"
                element={
                  <ProtectedLayout>
                    <StaffAttendancePage />
                  </ProtectedLayout>
                }
              />
              <Route
                path="/staff-performance"
                element={
                  <ProtectedLayout requiredPermission="reports.view">
                    <StaffPerformancePage />
                  </ProtectedLayout>
                }
              />
              <Route
                path="/users"
                element={
                  <ProtectedLayout requiredRole={['admin']}>
                    <UsersManagementPage />
                  </ProtectedLayout>
                }
              />
              <Route
                path="/menu-manage"
                element={
                  <ProtectedLayout requiredRole={['admin', 'manager']}>
                    <MenuManagementPage />
                  </ProtectedLayout>
                }
              />
              <Route
                path="/floors-manage"
                element={
                  <ProtectedLayout requiredRole={['admin', 'manager']}>
                    <FloorManagementPage />
                  </ProtectedLayout>
                }
              />
              <Route
                path="/roles-manage"
                element={
                  <ProtectedLayout requiredPermission="roles.manage">
                    <RoleManagementPage />
                  </ProtectedLayout>
                }
              />
              <Route
                path="/audit-logs"
                element={
                  <ProtectedLayout requiredRole={['admin']}>
                    <ActivityLogsPage />
                  </ProtectedLayout>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedLayout requiredPermission="settings.manage">
                    <SettingsPage />
                  </ProtectedLayout>
                }
              />

              {/* Smart Role-Based Redirects */}
              <Route path="/" element={<RoleBasedRedirect />} />
              <Route path="*" element={<RoleBasedRedirect />} />
            </Routes>
          </NavProvider>
        </SettingsProvider>
      </SocketProvider>
    </AuthProvider>
    </BrowserRouter>
  );
};
