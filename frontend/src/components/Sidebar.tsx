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
  Boxes,
  Lock,
  Gift,
  Crown,
  Building2,
  UserCheck,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { isSuperAdmin, isAdmin, isManager, isChef, isStaff, hasPermission } = useAuth();
  const { isMobileOpen, closeMobile } = useNav();
  const location = useLocation();

  // Automatically close mobile menu on page navigation
  useEffect(() => {
    closeMobile();
  }, [location.pathname]);

  const links = [
    // 0. Super Admin SaaS Platform (Super Admin only)
    {
      to: '/super-admin',
      label: 'Super Admin (SaaS)',
      icon: Crown,
      show: isSuperAdmin,
    },
    // 0b. Restaurant Owner Control Room
    {
      to: '/owner-dashboard',
      label: 'Restaurant Control Room',
      icon: Building2,
      show: isSuperAdmin || isAdmin || isManager,
    },
    // 1. Admin Executive Dashboard (Admin only)
    {
      to: '/admin',
      label: 'Admin Overview',
      icon: LayoutDashboard,
      show: isSuperAdmin || isAdmin,
    },
    // 2. Manager Operations & Cashier Billing (Topmost #1 for Manager)
    {
      to: '/manager',
      label: 'Manager Operations & Cashier Billing',
      icon: Receipt,
      show: isAdmin || isManager,
    },
    // 3. Staff / Waiter POS
    {
      to: '/pos',
      label: 'Staff POS & Orders',
      icon: Smartphone,
      show: isAdmin || isManager || isStaff,
    },
    // 4. Kitchen Display System
    {
      to: '/kitchen',
      label: 'Kitchen KDS (Live)',
      icon: ChefHat,
      show: isAdmin || isManager || isChef,
    },
    // 5. Inventory & Stock Tracking
    {
      to: '/inventory',
      label: 'Inventory & Stock',
      icon: Boxes,
      show: isAdmin || isManager,
    },
    // 6. End-of-Day (EOD) Reconciliation
    {
      to: '/day-close',
      label: 'Day-End Cash Close (EOD)',
      icon: Lock,
      show: isAdmin || isManager,
    },
    // 7. Customers & Loyalty CRM
    {
      to: '/customers',
      label: 'Customer CRM & Loyalty',
      icon: Gift,
      show: isAdmin || isManager,
    },
    // 8. Dedicated Chef Preparation & Cooking History (Separate Menu Option)
    {
      to: '/kitchen/history',
      label: 'Chef Cooking History',
      icon: History,
      show: isAdmin || isManager || isChef,
    },
    // 6. Dedicated Staff Performance & Operations
    {
      to: '/attendance',
      label: 'Staff Attendance & Shifts',
      icon: UserCheck,
      show: true,
    },
    {
      to: '/staff-performance',
      label: 'Staff Daily Performance',
      icon: Activity,
      show: isAdmin || isManager,
    },
    // 7. Menu Management
    {
      to: '/menu-manage',
      label: 'Menu & Pricing',
      icon: Utensils,
      show: isAdmin || isManager,
    },
    // 8. Floors & Tables Management (Strictly Admin & Manager only)
    {
      to: '/floors-manage',
      label: 'Floors & Tables',
      icon: Layers,
      show: isAdmin || isManager,
    },
    // 9. Dedicated Users Component (Strictly Admin only)
    {
      to: '/users',
      label: 'Users & Telemetry',
      icon: Users,
      show: isAdmin,
    },
    // 10. Role Permissions (Strictly Admin only)
    {
      to: '/roles-manage',
      label: 'Roles & Permissions',
      icon: ShieldCheck,
      show: isAdmin,
    },
    // 11. Activity / Audit Logs (Strictly Admin only)
    {
      to: '/audit-logs',
      label: 'System Audit Logs',
      icon: History,
      show: isAdmin,
    },
    // 12. Settings & Branding (Strictly Admin only)
    {
      to: '/settings',
      label: 'Settings & Branding',
      icon: Settings,
      show: isAdmin,
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
              end
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
