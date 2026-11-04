import React, { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNav } from '../context/NavContext';
import {
  LayoutDashboard,
  ChefHat,
  Smartphone,
  Receipt,
  Utensils,
  Layers,
  ShieldCheck,
  Settings,
  History,
  X,
  Users,
  Activity,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { isAdmin, isManager, isChef, isStaff, hasPermission } = useAuth();
  const { isMobileOpen, closeMobile } = useNav();
  const location = useLocation();

  // Automatically close mobile menu on page navigation
  useEffect(() => {
    closeMobile();
  }, [location.pathname]);

  const links = [
    // 1. Admin Executive Dashboard (Topmost position as requested)
    {
      to: '/admin',
      label: 'Admin Overview',
      icon: LayoutDashboard,
      show: isAdmin,
    },
    // 2. Staff / Waiter POS
    {
      to: '/pos',
      label: 'Staff POS & Orders',
      icon: Smartphone,
      show: isAdmin || isManager || isStaff || hasPermission('orders.create') || hasPermission('orders.view'),
    },
    // 3. Kitchen Display System
    {
      to: '/kitchen',
      label: 'Kitchen KDS',
      icon: ChefHat,
      show: isAdmin || isManager || isChef || hasPermission('kitchen.view'),
    },
    // 4. Manager Portal
    {
      to: '/manager',
      label: 'Manager Ops & Billing',
      icon: Receipt,
      show: isAdmin || isManager || hasPermission('billing.create'),
    },
    // 5. Dedicated Staff Performance & Operations
    {
      to: '/staff-performance',
      label: 'Staff Daily Performance',
      icon: Activity,
      show: isAdmin || isManager || hasPermission('reports.view'),
    },
    // 6. Dedicated Users Component
    {
      to: '/users',
      label: 'Users & Telemetry',
      icon: Users,
      show: isAdmin || isManager || hasPermission('users.manage'),
    },
    // 7. Menu Management
    {
      to: '/menu-manage',
      label: 'Menu & Pricing',
      icon: Utensils,
      show: isAdmin || isManager || isChef || hasPermission('menu.view') || hasPermission('menu.manage') || hasPermission('menu.availability.update'),
    },
    // 8. Floors & Tables
    {
      to: '/floors-manage',
      label: 'Floors & Tables',
      icon: Layers,
      show: isAdmin || isManager || hasPermission('tables.manage'),
    },
    // 9. Role Permissions
    {
      to: '/roles-manage',
      label: 'Roles & Permissions',
      icon: ShieldCheck,
      show: isAdmin || hasPermission('roles.manage'),
    },
    // 10. Activity / Audit Logs
    {
      to: '/audit-logs',
      label: 'System Audit Logs',
      icon: History,
      show: isAdmin || isManager || hasPermission('audit.view'),
    },
    // 11. Settings & Branding
    {
      to: '/settings',
      label: 'Settings & Branding',
      icon: Settings,
      show: isAdmin || hasPermission('settings.manage'),
    },
  ];

  const renderNavLinks = () => (
    <div className="p-3.5 space-y-1">
      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2 flex items-center justify-between">
        <span>Navigation</span>
        <button
          onClick={closeMobile}
          className="lg:hidden p-1 rounded-lg text-slate-400 hover:text-white"
          aria-label="Close navigation"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      {links
        .filter((link) => link.show)
        .map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={closeMobile}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-bold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
    </div>
  );

  return (
    <>
      {/* 1. Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={closeMobile}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* 2. Mobile Drawer (Slide-in) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-300 ease-in-out lg:hidden ${
          isMobileOpen ? 'translate-x-0 shadow-2xl shadow-black/80' : '-translate-x-full'
        }`}
      >
        <div className="flex-1 overflow-y-auto custom-scrollbar">{renderNavLinks()}</div>
      </aside>

      {/* 3. Desktop Fixed Sidebar - Fixed full height with internal scroll only */}
      <aside className="hidden lg:flex w-64 bg-slate-900 border-r border-slate-800 flex-col shrink-0 h-full overflow-hidden">
        <div className="flex-1 overflow-y-auto custom-scrollbar">{renderNavLinks()}</div>
      </aside>
    </>
  );
};
