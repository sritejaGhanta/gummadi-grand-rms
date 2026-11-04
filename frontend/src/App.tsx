import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { SettingsProvider } from './context/SettingsContext';
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

const RoleBasedRedirect: React.FC = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  const role = user.role?.name?.toLowerCase();
  if (role === 'chef') return <Navigate to="/kitchen" replace />;
  if (role === 'manager') return <Navigate to="/manager" replace />;
  if (role === 'admin') return <Navigate to="/admin" replace />;
  return <Navigate to="/pos" replace />;
};

const ProtectedLayout: React.FC<{
  children: React.ReactNode;
  requiredPermission?: string;
  requiredRole?: string[];
}> = ({ children, requiredPermission, requiredRole }) => {
  const { user, isAdmin, hasPermission } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const roleName = user.role?.name?.toLowerCase() || '';

  const hasRoleMatch =
    !requiredRole ||
    isAdmin ||
    requiredRole.map((r) => r.toLowerCase()).includes(roleName);

  const hasPermMatch =
    !requiredPermission || isAdmin || hasPermission(requiredPermission);

  if (!hasRoleMatch || !hasPermMatch) {
    const defaultHome =
      roleName === 'chef'
        ? '/kitchen'
        : roleName === 'manager'
        ? '/manager'
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

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <SettingsProvider>
            <NavProvider>
              <Routes>
              {/* Public route */}
              <Route path="/login" element={<LoginPage />} />

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
                path="/kitchen"
                element={
                  <ProtectedLayout requiredPermission="kitchen.view">
                    <KitchenDashboard />
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
                  <ProtectedLayout requiredPermission="users.manage">
                    <UsersManagementPage />
                  </ProtectedLayout>
                }
              />
              <Route
                path="/menu-manage"
                element={
                  <ProtectedLayout requiredPermission="menu.view">
                    <MenuManagementPage />
                  </ProtectedLayout>
                }
              />
              <Route
                path="/floors-manage"
                element={
                  <ProtectedLayout requiredPermission="tables.manage">
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
                  <ProtectedLayout requiredPermission="audit.view">
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
