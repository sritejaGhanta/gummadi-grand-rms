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
  BarChart3,
  FileText,
  Radio,
  CreditCard,
  Globe,
  PhoneCall,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { isSuperAdmin, isAdmin, isManager, isChef, isStaff, hasPermission } = useAuth();
  const { isMobileOpen, closeMobile } = useNav();
  const location = useLocation();

  // Automatically close mobile menu on page navigation
  useEffect(() => {
    closeMobile();
  }, [location.pathname]);

  const isRestaurantStaff = !isSuperAdmin;

  const links = [
    // 0. Super Admin SaaS Platform (Super Admin only)
    {
      to: '/super-admin',
      label: 'AharPOS Super Admin',
      icon: Crown,
      show: isSuperAdmin,
    },
    // 0b. Restaurant Owner Control Room
    {
      to: '/owner-dashboard',
      label: 'Restaurant Control Room',
      icon: Building2,
      show: isRestaurantStaff && (isAdmin || isManager),
    },
    // 1. Admin Executive Dashboard (Admin only)
    {
      to: '/admin',
      label: 'Admin Overview',
      icon: LayoutDashboard,
      show: isRestaurantStaff && isAdmin,
    },
    // 2. Manager Operations & Cashier Billing (Topmost #1 for Manager)
    {
      to: '/manager',
      label: 'Manager Operations & Cashier Billing',
      icon: Receipt,
      show: isRestaurantStaff && (isAdmin || isManager),
    },
    // 3. Staff / Waiter POS
    {
      to: '/pos',
      label: 'Staff POS & Orders',
      icon: Smartphone,
      show: isRestaurantStaff && (isAdmin || isManager || isStaff),
    },
    // 4. Kitchen Display System
    {
      to: '/kitchen',
      label: 'Kitchen KDS (Live)',
      icon: ChefHat,
      show: isRestaurantStaff && (isAdmin || isManager || isChef),
    },
    // 5. Inventory & Stock Tracking
    {
      to: '/inventory',
      label: 'Inventory & Stock',
      icon: Boxes,
      show: isRestaurantStaff && (isAdmin || isManager),
    },
    // 6. End-of-Day (EOD) Reconciliation
    {
      to: '/day-close',
      label: 'Day-End Cash Close (EOD)',
      icon: Lock,
      show: isRestaurantStaff && (isAdmin || isManager),
    },
    // 7. Customers & Loyalty CRM
    {
      to: '/customers',
      label: 'Customer CRM & Loyalty',
      icon: Gift,
      show: isRestaurantStaff && (isAdmin || isManager),
    },
    // 8. Dedicated Chef Preparation & Cooking History (Separate Menu Option)
    {
      to: '/kitchen/history',
      label: 'Chef Cooking History',
      icon: History,
      show: isRestaurantStaff && (isAdmin || isManager || isChef),
    },
    // 9. Dedicated Staff Performance & Operations
    {
      to: '/attendance',
      label: 'Staff Attendance & Shifts',
      icon: UserCheck,
      show: isRestaurantStaff,
    },
    {
      to: '/staff-performance',
      label: 'Staff Daily Performance',
      icon: Activity,
      show: isRestaurantStaff && (isAdmin || isManager),
    },
    // 10. Menu Management
    {
      to: '/menu-manage',
      label: 'Menu & Pricing',
      icon: Utensils,
      show: isRestaurantStaff && (isAdmin || isManager),
    },
    // 11. Floors & Tables Management (Strictly Admin & Manager only)
    {
      to: '/floors-manage',
      label: 'Floors & Tables',
      icon: Layers,
      show: isRestaurantStaff && (isAdmin || isManager),
    },
    // 12. Dedicated Users Component (Strictly Admin only)
    {
      to: '/users',
      label: 'Users & Telemetry',
      icon: Users,
      show: isRestaurantStaff && isAdmin,
    },
    // 13. Role Permissions (Strictly Admin only)
    {
      to: '/roles-manage',
      label: 'Roles & Permissions',
      icon: ShieldCheck,
      show: isRestaurantStaff && isAdmin,
    },
    // 14. Activity / Audit Logs (Strictly Admin only)
    {
      to: '/audit-logs',
      label: 'System Audit Logs',
      icon: History,
      show: isRestaurantStaff && isAdmin,
    },
    // 15. Settings & Branding (Strictly Admin only)
    {
      to: '/settings',
      label: 'Settings & Branding',
      icon: Settings,
      show: isRestaurantStaff && isAdmin,
    },
  ];

  const searchParams = new URLSearchParams(location.search);
  const currentTab = searchParams.get('tab') || 'restaurants';

  const superAdminNav = [
    {
      group: 'Tenants & Access',
      items: [
        {
          tab: 'restaurants',
          to: '/super-admin?tab=restaurants',
          label: 'Restaurants Directory',
          icon: Building2,
          badge: '5',
        },
        {
          tab: 'platform_users',
          to: '/super-admin?tab=platform_users',
          label: 'Staff & Managers',
          icon: Users,
          badge: '12',
        },
        {
          tab: 'roles_permissions',
          to: '/super-admin?tab=roles_permissions',
          label: 'Roles & Permissions Matrix',
          icon: ShieldCheck,
        },
      ],
    },
    {
      group: 'Finance & Subscriptions',
      items: [
        {
          tab: 'analytics',
          to: '/super-admin?tab=analytics',
          label: 'SaaS Analytics & Economics',
          icon: BarChart3,
        },
        {
          tab: 'invoices',
          to: '/super-admin?tab=invoices',
          label: 'B2B Tax Invoices & Billing',
          icon: FileText,
          badge: '5',
        },
        {
          tab: 'plans',
          to: '/super-admin?tab=plans',
          label: 'Subscription Plans & Tiers',
          icon: CreditCard,
          badge: '5',
        },
      ],
    },
    {
      group: 'Operations & Health',
      items: [
        {
          tab: 'broadcast',
          to: '/super-admin?tab=broadcast',
          label: 'Broadcast Ticker',
          icon: Radio,
        },
        {
          tab: 'diagnostics',
          to: '/super-admin?tab=diagnostics',
          label: 'System Health & Uptime',
          icon: Activity,
        },
      ],
    },
    {
      group: 'Marketing & Sales',
      items: [
        {
          tab: 'landing_cms',
          to: '/super-admin?tab=landing_cms',
          label: 'Landing Website CMS',
          icon: Globe,
        },
        {
          tab: 'leads',
          to: '/super-admin?tab=leads',
          label: 'Demo Inquiries & Leads',
          icon: PhoneCall,
          badge: '7',
          badgeColor: 'bg-rose-500/20 text-rose-400 border border-rose-500/30',
        },
      ],
    },
  ];

  const renderSuperAdminNav = () => (
    <div className="p-3.5 space-y-4">
      <div className="flex items-center justify-between px-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-black text-xs border border-amber-500/30">
            🔥
          </div>
          <div>
            <div className="text-xs font-black text-white tracking-wide">AharPOS SaaS HQ</div>
            <div className="text-[9px] uppercase font-bold text-amber-400">Master Control</div>
          </div>
        </div>
        <button
          onClick={closeMobile}
          className="lg:hidden p-1 rounded-lg text-slate-400 hover:text-white"
          aria-label="Close navigation"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {superAdminNav.map((sec) => (
        <div key={sec.group} className="space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-3 pt-1">
            {sec.group}
          </div>
          {sec.items.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.includes('/super-admin') && currentTab === item.tab;

            return (
              <NavLink
                key={item.tab}
                to={item.to}
                onClick={closeMobile}
                className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-md ${
                      isActive
                        ? 'bg-slate-950 text-amber-400'
                        : item.badgeColor || 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>
      ))}
    </div>
  );

  const renderNavLinks = () => {
    if (isSuperAdmin) {
      return renderSuperAdminNav();
    }

    return (
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
  };

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
