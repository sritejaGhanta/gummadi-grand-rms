import React, { useState, useEffect } from 'react';
import { superAdminApi } from '../api/endpoints';
import { useSettings } from '../context/SettingsContext';
import {
  Building2,
  Users,
  CreditCard,
  TrendingUp,
  ShieldAlert,
  Plus,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Sparkles,
  Search,
  ExternalLink,
  Crown,
  Layers,
  Lock,
  RefreshCw,
  Phone,
  Mail,
  MapPin,
  X,
  Globe,
  PhoneCall,
  Save,
  MessageSquare,
  Clock,
  ArrowUpRight,
} from 'lucide-react';

export const SuperAdminDashboard: React.FC = () => {
  const { currency } = useSettings();

  const [metrics, setMetrics] = useState<{
    totalTenants: number;
    activeTenants: number;
    trialTenants: number;
    totalUsers: number;
    totalManagers: number;
    totalStaff: number;
    totalChefs: number;
    totalAdmins: number;
    mrr: number;
    arr: number;
    totalOrders: number;
    gmv: number;
  }>({
    totalTenants: 0,
    activeTenants: 0,
    trialTenants: 0,
    totalUsers: 0,
    totalManagers: 0,
    totalStaff: 0,
    totalChefs: 0,
    totalAdmins: 0,
    mrr: 0,
    arr: 0,
    totalOrders: 0,
    gmv: 0,
  });

  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [platformUsers, setPlatformUsers] = useState<any[]>([]);
  const [userRoleFilter, setUserRoleFilter] = useState<string>('ALL');
  const [userRestFilter, setUserRestFilter] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<'restaurants' | 'platform_users' | 'plans' | 'landing_cms' | 'leads'>('restaurants');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Landing CMS & Leads State
  const [leads, setLeads] = useState<any[]>([]);
  const [landingCmsForm, setLandingCmsForm] = useState<any>({
    brandName: 'AharPOS',
    tagline: 'Smart Dining. High-Yield Operations.',
    heroTitle: 'AharPOS — The Operating System for Fast-Growing Restaurants',
    heroSubtitle:
      'All-in-One Cloud & Local POS, Multi-Guest Table Sharing, Zero-Latency Kitchen KDS, Recipe Yield Inventory & WhatsApp E-Bills built for Indian Food Businesses.',
    trialDays: 30,
    plan6MonthsPrice: 10000,
    plan1YearPrice: 20000,
    bannerText: '🔥 Special Launch Offer: 1-Month Free Unlimited Trial for Restaurants!',
    bannerActive: true,
    contactPhone: '+91 98765 43210',
    contactEmail: 'sales@aharpos.in',
    contactWhatsapp: '+91 98765 43210',
    contactAddress: 'HITEC City, Madhapur, Hyderabad, Telangana 500081',
    themePrimary: '#f59e0b',
  });
  const [savingCms, setSavingCms] = useState(false);

  // Onboarding Modal
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [onboardForm, setOnboardForm] = useState({
    name: '',
    cuisine: '',
    contactEmail: '',
    contactPhone: '',
    city: 'Hyderabad',
    address: '',
    planCode: 'ANNUAL',
    ownerName: '',
    ownerUsername: '',
    ownerPassword: '',
  });

  // Subscription Payment Modal
  const [showSubModal, setShowSubModal] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<any>(null);
  const [subForm, setSubForm] = useState({
    planId: '',
    billingCycle: 'YEARLY',
    amountPaid: 20000,
    paymentMethod: 'UPI',
    transactionReference: '',
    notes: '',
  });

  // Staff Modal for a Restaurant
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [newStaffForm, setNewStaffForm] = useState({
    name: '',
    username: '',
    password: '',
    roleName: 'staff',
    phone: '',
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [mRes, rRes, pRes, cmsRes, leadsRes, uRes] = await Promise.all([
        superAdminApi.getMetrics(),
        superAdminApi.getRestaurants(),
        superAdminApi.getPlans(),
        superAdminApi.getLandingCms().catch(() => null),
        superAdminApi.getLeads().catch(() => []),
        superAdminApi.getPlatformUsers().catch(() => []),
      ]);
      setMetrics(mRes || {});
      setRestaurants(Array.isArray(rRes) ? rRes : []);
      setPlans(Array.isArray(pRes) ? pRes : []);
      if (cmsRes) setLandingCmsForm(cmsRes);
      setLeads(Array.isArray(leadsRes) ? leadsRes : []);
      setPlatformUsers(Array.isArray(uRes) ? uRes : []);
    } catch (e: any) {
      setActionError(e.message || 'Failed to load Super Admin data');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCms = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCms(true);
    setActionError(null);
    try {
      const updated = await superAdminApi.updateLandingCms(landingCmsForm);
      setLandingCmsForm(updated);
      setActionSuccess('Landing Page Settings & Pricing saved successfully! Public website updated.');
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setActionError(err.message || 'Failed to save landing settings');
    } finally {
      setSavingCms(false);
    }
  };

  const handleUpdateLeadStatus = async (leadId: string, status: string) => {
    try {
      await superAdminApi.updateLeadStatus(leadId, { status });
      setActionSuccess(`Lead status updated to ${status}`);
      loadData();
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      setActionError(err.message || 'Failed to update lead status');
    }
  };

  const handleConvertLead = async (leadId: string) => {
    try {
      const res = await superAdminApi.convertLead(leadId);
      setActionSuccess(
        `Lead successfully converted! Restaurant "${res.restaurant?.name}" onboarded. Owner username: ${res.owner?.username}`,
      );
      loadData();
      setTimeout(() => setActionSuccess(null), 6000);
    } catch (err: any) {
      setActionError(err.message || 'Failed to convert lead');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOnboardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionError(null);
      const res = await superAdminApi.createRestaurant(onboardForm);
      setActionSuccess(`Restaurant "${res.restaurant?.name || onboardForm.name}" onboarded successfully! Owner login: ${onboardForm.ownerUsername}`);
      setShowOnboardModal(false);
      setOnboardForm({
        name: '',
        cuisine: '',
        contactEmail: '',
        contactPhone: '',
        city: 'Hyderabad',
        address: '',
        planCode: 'PRO',
        ownerName: '',
        ownerUsername: '',
        ownerPassword: '',
      });
      loadData();
      setTimeout(() => setActionSuccess(null), 5000);
    } catch (err: any) {
      setActionError(err.message || 'Failed to onboard restaurant');
    }
  };

  const handleStatusToggle = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await superAdminApi.updateStatus(id, nextStatus);
      setActionSuccess(`Restaurant status updated to ${nextStatus}`);
      loadData();
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      setActionError(err.message || 'Failed to update status');
    }
  };

  const handleOpenSubModal = (r: any) => {
    setSelectedRestaurant(r);
    const defaultPlan = plans.find((p) => p.id === r.planId) || plans[1] || plans[0];
    setSubForm({
      planId: defaultPlan?.id || '',
      billingCycle: 'MONTHLY',
      amountPaid: Number(defaultPlan?.priceMonthly || 1999),
      paymentMethod: 'UPI',
      transactionReference: `TXN-${Date.now()}`,
      notes: 'Subscription renewal via SuperAdmin',
    });
    setShowSubModal(true);
  };

  const handleSubSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRestaurant) return;
    try {
      await superAdminApi.recordSubscription({
        restaurantId: selectedRestaurant.id,
        planId: subForm.planId,
        billingCycle: subForm.billingCycle,
        amountPaid: Number(subForm.amountPaid),
        paymentMethod: subForm.paymentMethod,
        transactionReference: subForm.transactionReference,
        notes: subForm.notes,
      });
      setActionSuccess(`Subscription recorded for "${selectedRestaurant.name}"!`);
      setShowSubModal(false);
      loadData();
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      setActionError(err.message || 'Failed to record subscription');
    }
  };

  const handleOpenStaffModal = async (r: any) => {
    setSelectedRestaurant(r);
    setShowStaffModal(true);
    setLoadingStaff(true);
    try {
      const list = await superAdminApi.getStaff(r.id);
      setStaffList(Array.isArray(list) ? list : []);
    } catch (err: any) {
      setActionError('Failed to fetch restaurant staff');
    } finally {
      setLoadingStaff(false);
    }
  };

  const handleAddStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRestaurant) return;
    try {
      await superAdminApi.addStaff(selectedRestaurant.id, newStaffForm);
      setActionSuccess(`Staff member "${newStaffForm.name}" added to ${selectedRestaurant.name}!`);
      setNewStaffForm({
        name: '',
        username: '',
        password: '',
        roleName: 'staff',
        phone: '',
      });
      const list = await superAdminApi.getStaff(selectedRestaurant.id);
      setStaffList(Array.isArray(list) ? list : []);
      loadData();
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      setActionError(err.message || 'Failed to add staff');
    }
  };

  const filteredRestaurants = restaurants.filter((r) => {
    const q = searchQuery.toLowerCase();
    return (
      r.name?.toLowerCase().includes(q) ||
      r.city?.toLowerCase().includes(q) ||
      r.cuisine?.toLowerCase().includes(q) ||
      r.planName?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Platform Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-500">
            <Crown className="w-4 h-4" />
            <span>AharPOS SaaS Platform Master Control</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1 flex items-center gap-2">
            <span>AharPOS Super Administrator Dashboard</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage multi-tenant client restaurants, subscription tiers, and platform revenue.
          </p>
        </div>

        <button
          onClick={() => setShowOnboardModal(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ Onboard New Restaurant</span>
        </button>
      </div>

      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs sm:text-sm font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div className="p-4 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs sm:text-sm font-semibold flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Global SaaS Telemetry Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Tenants */}
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 bg-slate-900/60 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Client Restaurants</div>
            <div className="text-xl sm:text-2xl font-black text-white">
              {metrics.totalTenants}
            </div>
            <div className="text-[10px] text-amber-400 font-medium">
              {metrics.activeTenants} Active • {metrics.trialTenants} Trial
            </div>
          </div>
        </div>

        {/* Total Platform Staff & Users */}
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 bg-slate-900/60 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Staff & Managers</div>
            <div className="text-xl sm:text-2xl font-black text-white">
              {metrics.totalUsers} Accounts
            </div>
            <div className="text-[10px] text-indigo-300 font-medium">
              {metrics.totalManagers} Mgrs • {metrics.totalChefs} Chefs • {metrics.totalStaff} Waiters
            </div>
          </div>
        </div>

        {/* MRR Card */}
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 bg-slate-900/60 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Monthly Revenue (MRR)</div>
            <div className="text-xl sm:text-2xl font-black text-white">
              {currency}{metrics.mrr.toLocaleString()}
            </div>
            <div className="text-[10px] text-emerald-400 font-medium">ARR: {currency}{metrics.arr.toLocaleString()}</div>
          </div>
        </div>

        {/* Platform Gross Volume */}
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 bg-slate-900/60 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Platform GMV</div>
            <div className="text-xl sm:text-2xl font-black text-white">
              {currency}{metrics.gmv.toLocaleString()}
            </div>
            <div className="text-[10px] text-blue-400 font-medium">{metrics.totalOrders} total orders processed</div>
          </div>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('restaurants')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
            activeTab === 'restaurants'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Restaurants Directory ({restaurants.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('platform_users')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
            activeTab === 'platform_users'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Staff & Managers ({platformUsers.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('plans')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
            activeTab === 'plans'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Subscription Plans & Tiers ({plans.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('landing_cms')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
            activeTab === 'landing_cms'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>Landing Website CMS & Pricing</span>
        </button>
        <button
          onClick={() => setActiveTab('leads')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 relative ${
            activeTab === 'leads'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <PhoneCall className="w-4 h-4" />
          <span>Demo Inquiries & Leads ({leads.length})</span>
          {leads.filter((l) => l.status === 'NEW').length > 0 && (
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          )}
        </button>
      </div>

      {/* TAB 1: RESTAURANTS DIRECTORY */}
      {activeTab === 'restaurants' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search restaurants, city, plan..."
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>
            <button
              onClick={loadData}
              className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition self-start sm:self-auto"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>

          {/* Restaurants Table */}
          <div className="glass-panel rounded-2xl border border-slate-800 overflow-x-auto shadow-xl">
            <table className="w-full text-left text-xs sm:text-sm text-slate-300">
              <thead className="bg-slate-950/80 text-[11px] uppercase font-bold text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Restaurant & Outlets</th>
                  <th className="py-3 px-4">Plan & Validity</th>
                  <th className="py-3 px-4">Contact & Location</th>
                  <th className="py-3 px-4">Staff & Activity</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredRestaurants.map((r) => {
                  const isActive = r.status === 'ACTIVE';
                  const isTrial = r.status === 'TRIAL';

                  return (
                    <tr key={r.id} className="hover:bg-slate-850/50 transition">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-black text-sm shrink-0 overflow-hidden">
                            {r.brandLogo ? (
                              <img src={r.brandLogo} alt="" className="w-full h-full object-cover" />
                            ) : (
                              r.name?.[0] || 'R'
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-white text-sm">{r.name}</div>
                            <div className="text-[11px] text-slate-400 font-mono">slug: {r.slug}</div>
                            <div className="text-[10px] text-amber-400 font-medium">{r.cuisine}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-block px-2 py-0.5 rounded-md font-bold text-[11px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          {r.planName}
                        </span>
                        <div className="text-[11px] text-slate-400 mt-1">
                          {r.daysLeft > 0 ? (
                            <span className="text-emerald-400 font-medium">{r.daysLeft} days remaining</span>
                          ) : (
                            <span className="text-rose-400 font-medium">Expired</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 space-y-0.5 text-xs">
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <Phone className="w-3 h-3 text-slate-500" />
                          <span>{r.contactPhone}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <MapPin className="w-3 h-3 text-slate-500" />
                          <span>{r.city}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-xs">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-indigo-400" />
                          <span>{r.staffCount || 0} Staff Accounts</span>
                        </div>
                        <div className="text-[11px] text-amber-400 font-medium mt-0.5">
                          Head: {r.ownerUser || 'Assigned'}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {r.managersCount || 0} Mgr • {r.chefsCount || 0} Chef • {r.waitersCount || 0} Waiter
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border ${
                            isActive
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : isTrial
                              ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                              : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => handleOpenSubModal(r)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition"
                          title="Record subscription payment / renew plan"
                        >
                          💳 Renew
                        </button>
                        <button
                          onClick={() => handleOpenStaffModal(r)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold transition"
                          title="Manage staff users for this restaurant"
                        >
                          👥 Staff
                        </button>
                        <button
                          onClick={() => handleStatusToggle(r.id, r.status)}
                          className={`px-2 py-1 rounded-lg text-xs font-bold border transition ${
                            isActive
                              ? 'bg-rose-600/20 text-rose-400 hover:bg-rose-600/40 border-rose-500/30'
                              : 'bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/40 border-emerald-500/30'
                          }`}
                        >
                          {isActive ? 'Suspend' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 1B: PLATFORM USERS & STAFF DIRECTORY (SITE ADMIN VIEW) */}
      {activeTab === 'platform_users' && (
        <div className="space-y-4">
          {/* Quick Role Breakdown Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400">Total Accounts</div>
                <div className="text-lg font-black text-white">{platformUsers.length}</div>
              </div>
              <Users className="w-6 h-6 text-indigo-400 opacity-60" />
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase font-bold text-amber-400">Owners & Managers</div>
                <div className="text-lg font-black text-amber-400">
                  {platformUsers.filter((u) => u.roleName === 'manager').length}
                </div>
              </div>
              <Building2 className="w-6 h-6 text-amber-400 opacity-60" />
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase font-bold text-rose-400">Head / Line Chefs</div>
                <div className="text-lg font-black text-rose-400">
                  {platformUsers.filter((u) => u.roleName === 'chef').length}
                </div>
              </div>
              <span className="text-xl">👨‍🍳</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase font-bold text-emerald-400">Service Waiters</div>
                <div className="text-lg font-black text-emerald-400">
                  {platformUsers.filter((u) => u.roleName === 'staff').length}
                </div>
              </div>
              <span className="text-xl">🛎️</span>
            </div>
          </div>

          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search user, phone, role..."
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Role Filter */}
              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 focus:outline-none focus:border-amber-500"
              >
                <option value="ALL">All Roles</option>
                <option value="manager">Restaurant Owners & Managers</option>
                <option value="chef">Chefs</option>
                <option value="staff">Waiters / Service Staff</option>
                <option value="superadmin">Super Administrators</option>
              </select>

              {/* Restaurant Filter */}
              <select
                value={userRestFilter}
                onChange={(e) => setUserRestFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 focus:outline-none focus:border-amber-500 max-w-[200px] truncate"
              >
                <option value="ALL">All Client Restaurants</option>
                {restaurants.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={loadData}
              className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition self-start sm:self-auto"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Users</span>
            </button>
          </div>

          {/* Platform Users Table */}
          <div className="glass-panel rounded-2xl border border-slate-800 overflow-x-auto shadow-xl">
            <table className="w-full text-left text-xs sm:text-sm text-slate-300">
              <thead className="bg-slate-950/80 text-[11px] uppercase font-bold text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">User & Login</th>
                  <th className="py-3 px-4">Platform Role</th>
                  <th className="py-3 px-4">Assigned Client Restaurant</th>
                  <th className="py-3 px-4">Contact Info</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Last Login</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {platformUsers
                  .filter((u) => {
                    const q = searchQuery.toLowerCase();
                    const matchesQuery =
                      !q ||
                      u.name?.toLowerCase().includes(q) ||
                      u.username?.toLowerCase().includes(q) ||
                      u.phone?.toLowerCase().includes(q) ||
                      u.restaurantName?.toLowerCase().includes(q);

                    const matchesRole = userRoleFilter === 'ALL' || u.roleName === userRoleFilter;
                    const matchesRest = userRestFilter === 'ALL' || u.restaurantId === userRestFilter;

                    return matchesQuery && matchesRole && matchesRest;
                  })
                  .map((u) => {
                    const isMgr = u.roleName === 'manager';
                    const isChef = u.roleName === 'chef';
                    const isStaff = u.roleName === 'staff';
                    const isSuper = u.roleName === 'superadmin';

                    return (
                      <tr key={u.id} className="hover:bg-slate-850/50 transition">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-white text-sm">{u.name || u.username}</div>
                          <div className="text-[11px] text-slate-400 font-mono">@{u.username}</div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border ${
                              isSuper
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                : isMgr
                                ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                                : isChef
                                ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            }`}
                          >
                            <span>{isSuper ? '👑' : isMgr ? '🏢' : isChef ? '👨‍🍳' : '🛎️'}</span>
                            <span>{u.roleDisplayName}</span>
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-200">{u.restaurantName}</div>
                          <div className="text-[11px] text-slate-500">{u.restaurantCity}</div>
                        </td>

                        <td className="py-3.5 px-4 space-y-0.5 text-xs">
                          {u.phone ? (
                            <div className="flex items-center gap-1 text-slate-300">
                              <Phone className="w-3 h-3 text-slate-500" />
                              <span>{u.phone}</span>
                            </div>
                          ) : (
                            <span className="text-slate-500 text-[11px]">—</span>
                          )}
                          {u.email && (
                            <div className="flex items-center gap-1 text-slate-400 text-[11px]">
                              <Mail className="w-3 h-3 text-slate-500" />
                              <span className="truncate max-w-[150px]">{u.email}</span>
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              u.isActive
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {u.isActive ? 'Active' : 'Disabled'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right text-xs text-slate-400 font-mono">
                          {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Never'}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: SUBSCRIPTION PLANS & PRICING */}
      {activeTab === 'plans' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {plans.map((p) => {
            const isPro = p.code === 'PRO';
            const isEnterprise = p.code === 'ENTERPRISE';

            return (
              <div
                key={p.id}
                className={`p-6 rounded-3xl border flex flex-col justify-between transition-all ${
                  isEnterprise
                    ? 'bg-gradient-to-b from-indigo-950/40 via-slate-900 to-slate-900 border-indigo-500/50 shadow-2xl ring-1 ring-indigo-500/30'
                    : isPro
                    ? 'bg-gradient-to-b from-amber-950/30 via-slate-900 to-slate-900 border-amber-500/50 shadow-xl'
                    : 'bg-slate-900 border-slate-800'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-amber-400">
                      {p.code} TIER
                    </span>
                    {isEnterprise && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        ⭐ ALL INCLUSIVE
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl font-black text-white mt-2">{p.name}</h3>

                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-black text-white">
                      {currency}{p.priceMonthly}
                    </span>
                    <span className="text-xs text-slate-400">/ month</span>
                  </div>
                  <div className="text-[11px] text-amber-400 mt-0.5">
                    or {currency}{p.priceYearly} billed annually
                  </div>

                  {/* Limits summary */}
                  <div className="mt-6 p-3 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2 text-xs">
                    <div className="flex justify-between text-slate-300">
                      <span>Max Outlets:</span>
                      <strong className="text-white">{p.maxOutlets}</strong>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Max Staff Accounts:</span>
                      <strong className="text-white">{p.maxStaff}</strong>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Max Dining Tables:</span>
                      <strong className="text-white">{p.maxTables}</strong>
                    </div>
                  </div>

                  {/* Features list */}
                  <div className="mt-6 space-y-2.5">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Features:</div>
                    {(p.features || []).map((feat: string, idx: number) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-slate-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="capitalize">{feat.replace(/_/g, ' ')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 3: LANDING WEBSITE CMS & PRICING CONTROL */}
      {activeTab === 'landing_cms' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Globe className="w-5 h-5 text-amber-500" />
                <span>Public Landing Page CMS & Pricing Control</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Update marketing headlines, trial duration, subscription prices (10K / 20K), announcement banners, and sales contacts. All changes reflect live instantly on the public website.
              </p>
            </div>
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 transition flex items-center gap-1.5 shrink-0"
            >
              <span>View Public Landing Site</span>
              <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
            </a>
          </div>

          <form onSubmit={handleSaveCms} className="space-y-6">
            {/* Box 1: Core SaaS Pricing & Free Trial Days */}
            <div className="glass-panel p-6 rounded-2xl border border-amber-500/30 bg-slate-900/60 space-y-4 shadow-xl">
              <div className="flex items-center gap-2 text-sm font-black text-amber-400">
                <Sparkles className="w-4 h-4" />
                <span>Flagship Pricing & Trial Days Control (Super Admin Exclusive)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    Free Trial Duration (Days) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="90"
                    required
                    value={landingCmsForm.trialDays}
                    onChange={(e) =>
                      setLandingCmsForm({ ...landingCmsForm, trialDays: parseInt(e.target.value, 10) || 30 })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold focus:outline-none focus:border-amber-500 text-sm"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">Default: 30 Days (1 Month)</span>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    Half-Yearly Plan (6 Months) Price (₹) *
                  </label>
                  <input
                    type="number"
                    step="100"
                    required
                    value={landingCmsForm.plan6MonthsPrice}
                    onChange={(e) =>
                      setLandingCmsForm({
                        ...landingCmsForm,
                        plan6MonthsPrice: parseFloat(e.target.value) || 10000,
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold focus:outline-none focus:border-amber-500 text-sm"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">Current: ₹10,000 for 6 Months</span>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    Annual Flagship Plan (1 Year) Price (₹) *
                  </label>
                  <input
                    type="number"
                    step="100"
                    required
                    value={landingCmsForm.plan1YearPrice}
                    onChange={(e) =>
                      setLandingCmsForm({
                        ...landingCmsForm,
                        plan1YearPrice: parseFloat(e.target.value) || 20000,
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold focus:outline-none focus:border-amber-500 text-sm"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">Current: ₹20,000 for 1 Year</span>
                </div>
              </div>
            </div>

            {/* Box 2: Promotional Top Banner */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <MessageSquare className="w-4 h-4 text-amber-500" />
                  <span>Top Launch Announcement Banner</span>
                </div>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-300">
                  <input
                    type="checkbox"
                    checked={landingCmsForm.bannerActive}
                    onChange={(e) =>
                      setLandingCmsForm({ ...landingCmsForm, bannerActive: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500"
                  />
                  <span>Show Banner on Public Site</span>
                </label>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1 text-xs">Announcement Text</label>
                <input
                  type="text"
                  value={landingCmsForm.bannerText}
                  onChange={(e) =>
                    setLandingCmsForm({ ...landingCmsForm, bannerText: e.target.value })
                  }
                  placeholder="e.g. 🔥 Special Launch Offer: 1-Month Free Unlimited Trial for Restaurants!"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Box 3: Brand Identity & Hero Headlines */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-4">
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-500" />
                <span>Brand Name & Hero Section Content</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Brand Name *</label>
                  <input
                    type="text"
                    required
                    value={landingCmsForm.brandName}
                    onChange={(e) =>
                      setLandingCmsForm({ ...landingCmsForm, brandName: e.target.value })
                    }
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Brand Tagline</label>
                  <input
                    type="text"
                    value={landingCmsForm.tagline}
                    onChange={(e) =>
                      setLandingCmsForm({ ...landingCmsForm, tagline: e.target.value })
                    }
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Hero Section Main Heading</label>
                  <input
                    type="text"
                    value={landingCmsForm.heroTitle}
                    onChange={(e) =>
                      setLandingCmsForm({ ...landingCmsForm, heroTitle: e.target.value })
                    }
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Hero Subtitle / Description</label>
                  <textarea
                    rows={2}
                    value={landingCmsForm.heroSubtitle}
                    onChange={(e) =>
                      setLandingCmsForm({ ...landingCmsForm, heroSubtitle: e.target.value })
                    }
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* Box 4: Sales Contacts (Phone, WhatsApp, Email, Office) */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-4">
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <PhoneCall className="w-4 h-4 text-amber-500" />
                <span>Sales & Enterprise Support Contact Details</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Direct Sales Phone</label>
                  <input
                    type="text"
                    value={landingCmsForm.contactPhone}
                    onChange={(e) =>
                      setLandingCmsForm({ ...landingCmsForm, contactPhone: e.target.value })
                    }
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">WhatsApp Support Number</label>
                  <input
                    type="text"
                    value={landingCmsForm.contactWhatsapp}
                    onChange={(e) =>
                      setLandingCmsForm({ ...landingCmsForm, contactWhatsapp: e.target.value })
                    }
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Official Sales Email</label>
                  <input
                    type="email"
                    value={landingCmsForm.contactEmail}
                    onChange={(e) =>
                      setLandingCmsForm({ ...landingCmsForm, contactEmail: e.target.value })
                    }
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="text-xs">
                <label className="block text-slate-400 font-bold mb-1">Office / Headquarters Address</label>
                <input
                  type="text"
                  value={landingCmsForm.contactAddress}
                  onChange={(e) =>
                    setLandingCmsForm({ ...landingCmsForm, contactAddress: e.target.value })
                  }
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={savingCms}
                className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm shadow-xl shadow-amber-500/20 transition flex items-center gap-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{savingCms ? 'Saving Settings...' : 'Save & Publish Live to Website'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 4: DEMO INQUIRIES & LEADS MANAGEMENT */}
      {activeTab === 'leads' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <PhoneCall className="w-5 h-5 text-amber-500" />
                <span>Restaurant Demo Inquiries & Inbound Leads ({leads.length})</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Every restaurant owner who requests a free trial or live demo on the public landing page appears here. Call them, schedule a demo, and onboard them with 1-click!
              </p>
            </div>
            <button
              onClick={() => loadData()}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 transition flex items-center gap-1.5 shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
              <span>Refresh Leads</span>
            </button>
          </div>

          {leads.length === 0 ? (
            <div className="glass-panel p-12 rounded-3xl border border-slate-800 text-center space-y-3">
              <PhoneCall className="w-12 h-12 text-slate-600 mx-auto" />
              <div className="text-base font-bold text-white">No Demo Inquiries Yet</div>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                When restaurant owners fill the form on the landing page, their contact details and seating requirements will appear here.
              </p>
            </div>
          ) : (
            <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/80 uppercase text-[10px] tracking-wider text-slate-400 border-b border-slate-800 font-bold">
                    <tr>
                      <th className="py-3 px-4">Restaurant & Owner</th>
                      <th className="py-3 px-4">Contact Phone</th>
                      <th className="py-3 px-4">Location & Size</th>
                      <th className="py-3 px-4">Preferred Plan</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {leads.map((l: any) => (
                      <tr key={l.id} className="hover:bg-slate-800/30 transition">
                        <td className="py-3 px-4">
                          <div className="font-bold text-white text-sm">{l.restaurantName}</div>
                          <div className="text-xs text-amber-400 font-medium">{l.ownerName}</div>
                          {l.notes && (
                            <div className="text-[11px] text-slate-400 italic mt-0.5 line-clamp-1">
                              "{l.notes}"
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono">
                          <a
                            href={`tel:${l.phone}`}
                            className="font-bold text-slate-200 hover:text-amber-400 flex items-center gap-1.5 transition"
                          >
                            <Phone className="w-3.5 h-3.5 text-emerald-400" />
                            <span>{l.phone}</span>
                          </a>
                          {l.email && <div className="text-[10px] text-slate-500 mt-0.5">{l.email}</div>}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-200 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-rose-400" />
                            <span>{l.city || 'Hyderabad'}</span>
                          </div>
                          <div className="text-[10px] text-slate-400">{l.seatingCapacity || 'Standard'}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              l.preferredPlan === '1_YEAR'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {l.preferredPlan === '1_YEAR' ? 'Annual (₹20,000)' : 'Half-Yearly (₹10,000)'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <select
                            value={l.status}
                            onChange={(e) => handleUpdateLeadStatus(l.id, e.target.value)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold border ${
                              l.status === 'CONVERTED'
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                : l.status === 'DEMO_SCHEDULED'
                                ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                                : l.status === 'CONTACTED'
                                ? 'bg-purple-500/10 border-purple-500/30 text-purple-300'
                                : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                            }`}
                          >
                            <option value="NEW">NEW LEAD</option>
                            <option value="CONTACTED">CONTACTED</option>
                            <option value="DEMO_SCHEDULED">DEMO SCHEDULED</option>
                            <option value="CONVERTED">CONVERTED (CLIENT)</option>
                            <option value="REJECTED">REJECTED</option>
                          </select>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {l.status !== 'CONVERTED' ? (
                            <button
                              onClick={() => handleConvertLead(l.id)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-md shadow-emerald-500/20 transition flex items-center gap-1 ml-auto"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>1-Click Onboard Tenant</span>
                            </button>
                          ) : (
                            <span className="text-[11px] font-bold text-emerald-400 flex items-center justify-end gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Active Tenant</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: ONBOARD NEW RESTAURANT */}
      {showOnboardModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl p-6 max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-white font-black text-lg">
                <Building2 className="w-5 h-5 text-amber-500" />
                <span>Onboard New Restaurant Tenant</span>
              </div>
              <button
                onClick={() => setShowOnboardModal(false)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleOnboardSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Restaurant Name *</label>
                  <input
                    type="text"
                    required
                    value={onboardForm.name}
                    onChange={(e) => setOnboardForm({ ...onboardForm, name: e.target.value })}
                    placeholder="e.g. Mandi King Arabian Restaurant"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Cuisine / Category</label>
                  <input
                    type="text"
                    value={onboardForm.cuisine}
                    onChange={(e) => setOnboardForm({ ...onboardForm, cuisine: e.target.value })}
                    placeholder="e.g. Arabian Mandi & Grills"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Contact Email *</label>
                  <input
                    type="email"
                    required
                    value={onboardForm.contactEmail}
                    onChange={(e) => setOnboardForm({ ...onboardForm, contactEmail: e.target.value })}
                    placeholder="owner@restaurant.com"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Contact Phone *</label>
                  <input
                    type="text"
                    required
                    value={onboardForm.contactPhone}
                    onChange={(e) => setOnboardForm({ ...onboardForm, contactPhone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">City</label>
                  <input
                    type="text"
                    value={onboardForm.city}
                    onChange={(e) => setOnboardForm({ ...onboardForm, city: e.target.value })}
                    placeholder="Hyderabad"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Subscription Plan</label>
                  <select
                    value={onboardForm.planCode}
                    onChange={(e) => setOnboardForm({ ...onboardForm, planCode: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="STARTER">Starter Plan (₹999/mo)</option>
                    <option value="PRO">Pro Plan (₹1,999/mo) — Recommended</option>
                    <option value="ENTERPRISE">Enterprise Plan (₹3,499/mo)</option>
                  </select>
                </div>
              </div>

              {/* Owner Account Creation */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Initial Restaurant Owner Login Details</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">Owner Full Name *</label>
                    <input
                      type="text"
                      required
                      value={onboardForm.ownerName}
                      onChange={(e) => setOnboardForm({ ...onboardForm, ownerName: e.target.value })}
                      placeholder="e.g. Aslam Khan"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">Username *</label>
                    <input
                      type="text"
                      required
                      value={onboardForm.ownerUsername}
                      onChange={(e) => setOnboardForm({ ...onboardForm, ownerUsername: e.target.value })}
                      placeholder="e.g. mandiking_owner"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">Password</label>
                    <input
                      type="password"
                      value={onboardForm.ownerPassword}
                      onChange={(e) => setOnboardForm({ ...onboardForm, ownerPassword: e.target.value })}
                      placeholder="Default: owner123"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowOnboardModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition shadow-lg shadow-amber-500/20"
                >
                  Complete Onboarding & Issue Trial
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: RECORD SUBSCRIPTION PAYMENT */}
      {showSubModal && selectedRestaurant && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="font-bold text-white text-base">Record Subscription Renewal</h3>
                <p className="text-xs text-amber-400">{selectedRestaurant.name}</p>
              </div>
              <button
                onClick={() => setShowSubModal(false)}
                className="w-7 h-7 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Select Subscription Plan</label>
                <select
                  value={subForm.planId}
                  onChange={(e) => {
                    const chosen = plans.find((p) => p.id === e.target.value);
                    setSubForm({
                      ...subForm,
                      planId: e.target.value,
                      amountPaid: Number(chosen?.priceMonthly || 1999),
                    });
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({currency}{p.priceMonthly}/mo)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Billing Cycle</label>
                  <select
                    value={subForm.billingCycle}
                    onChange={(e) => setSubForm({ ...subForm, billingCycle: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  >
                    <option value="MONTHLY">Monthly</option>
                    <option value="YEARLY">Yearly (12 Months)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Amount Paid ({currency})</label>
                  <input
                    type="number"
                    value={subForm.amountPaid}
                    onChange={(e) => setSubForm({ ...subForm, amountPaid: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Payment Method</label>
                  <select
                    value={subForm.paymentMethod}
                    onChange={(e) => setSubForm({ ...subForm, paymentMethod: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  >
                    <option value="UPI">UPI / GPay / PhonePe</option>
                    <option value="BANK_TRANSFER">Direct Bank Transfer</option>
                    <option value="CASH">Cash in Hand</option>
                    <option value="CARD">Credit/Debit Card</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Reference / UTR</label>
                  <input
                    type="text"
                    value={subForm.transactionReference}
                    onChange={(e) => setSubForm({ ...subForm, transactionReference: e.target.value })}
                    placeholder="UTR / Txn ID"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition mt-2"
              >
                Record Payment & Extend Validity
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: RESTAURANT STAFF MANAGEMENT */}
      {showStaffModal && selectedRestaurant && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="font-bold text-white text-base">Restaurant Staff Team</h3>
                <p className="text-xs text-amber-400">{selectedRestaurant.name}</p>
              </div>
              <button
                onClick={() => setShowStaffModal(false)}
                className="w-7 h-7 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Current Staff List */}
            <div className="space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Active Staff Accounts ({staffList.length})
              </div>
              {loadingStaff ? (
                <div className="text-xs text-slate-500 py-3 text-center">Loading staff...</div>
              ) : staffList.length === 0 ? (
                <div className="text-xs text-slate-500 py-3 text-center">No staff accounts found.</div>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {staffList.map((s) => (
                    <div
                      key={s.id}
                      className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-white">{s.name}</span>
                        <span className="text-slate-400 font-mono text-[11px] ml-2">(@{s.username})</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-md font-bold text-[10px] uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        {s.role?.displayName || s.role?.name}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add New Staff Form */}
            <form onSubmit={handleAddStaffSubmit} className="pt-3 border-t border-slate-800 space-y-3 text-xs">
              <div className="font-bold text-white uppercase text-[11px] flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-amber-400" />
                <span>Add Staff Member (Waiter / Chef / Manager)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-slate-400 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newStaffForm.name}
                    onChange={(e) => setNewStaffForm({ ...newStaffForm, name: e.target.value })}
                    placeholder="e.g. Ramesh Waiter"
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Username *</label>
                  <input
                    type="text"
                    required
                    value={newStaffForm.username}
                    onChange={(e) => setNewStaffForm({ ...newStaffForm, username: e.target.value })}
                    placeholder="e.g. ramesh_waiter"
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-slate-400 mb-1">Role *</label>
                  <select
                    value={newStaffForm.roleName}
                    onChange={(e) => setNewStaffForm({ ...newStaffForm, roleName: e.target.value as any })}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white"
                  >
                    <option value="staff">Service Staff / Waiter (Table POS)</option>
                    <option value="chef">Kitchen Chef (KDS Orders)</option>
                    <option value="manager">Restaurant Manager / Cashier</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Password</label>
                  <input
                    type="password"
                    value={newStaffForm.password}
                    onChange={(e) => setNewStaffForm({ ...newStaffForm, password: e.target.value })}
                    placeholder="Default: staff123"
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition shadow"
              >
                Create Staff Account
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
