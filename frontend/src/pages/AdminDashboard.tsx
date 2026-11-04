import React, { useState, useEffect } from 'react';
import { reportsApi, usersApi, rolesApi } from '../api/endpoints';
import { useSettings } from '../context/SettingsContext';
import { useSocket } from '../context/SocketContext';
import { StatCard } from '../components/StatCard';
import { Modal } from '../components/Modal';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import {
  DollarSign,
  TrendingUp,
  ShoppingBag,
  Users,
  ChefHat,
  Layers,
  Award,
  Sparkles,
  ArrowRight,
  Receipt,
  Calendar,
  RefreshCw,
  CheckCircle2,
  Utensils,
  CreditCard,
  QrCode,
  Banknote,
  Flame,
  Bell,
  Clock,
  ShieldCheck,
  UserPlus,
  Star,
  Palette,
  Check,
  AlertCircle,
  BarChart3,
  PieChart as PieIcon,
  Activity,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const CATEGORY_COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ec4899', '#8b5cf6', '#f97316', '#06b6d4', '#eab308'];

export const AdminDashboard: React.FC = () => {
  const { currency } = useSettings();
  const { lastEvent } = useSocket();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Date selection for staff telemetry
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [staffData, setStaffData] = useState<any>(null);
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffTab, setStaffTab] = useState<'all' | 'chefs' | 'waiters' | 'managers'>('all');

  // Modals & Staff Deep Telemetry
  const [selectedStaff, setSelectedStaff] = useState<any | null>(null);
  const [selectedStaffRole, setSelectedStaffRole] = useState<'chef' | 'waiter' | 'manager' | 'admin'>('chef');
  const [staffTelemetryDetails, setStaffTelemetryDetails] = useState<any | null>(null);
  const [staffTelemetryLoading, setStaffTelemetryLoading] = useState(false);

  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [roles, setRoles] = useState<any[]>([]);
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRoleId, setNewRoleId] = useState('');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchDashboard = () => {
    reportsApi
      .getAdminDashboard()
      .then((res) => {
        setData(res);
        if (!staffData) {
          setStaffData({
            chefPerformance: res.chefPerformance,
            waiterPerformance: res.waiterPerformance,
            managerPerformance: res.managerPerformance,
          });
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const fetchStaffPerformance = (dateStr: string) => {
    setStaffLoading(true);
    reportsApi
      .getStaffPerformance(dateStr)
      .then((res) => setStaffData(res))
      .catch(console.error)
      .finally(() => setStaffLoading(false));
  };

  const loadRoles = async () => {
    try {
      const r = await rolesApi.getRoles();
      setRoles(r);
      if (r.length > 0 && !newRoleId) {
        setNewRoleId(r[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchDashboard();
    loadRoles();
  }, []);

  // Real-time WebSocket listener
  useEffect(() => {
    if (!lastEvent) return;
    if (
      lastEvent.type === 'order:created' ||
      lastEvent.type === 'order:item_status_changed' ||
      lastEvent.type === 'billing:requested' ||
      lastEvent.type === 'billing:paid'
    ) {
      fetchDashboard();
      if (selectedDate === new Date().toISOString().split('T')[0]) {
        fetchStaffPerformance(selectedDate);
      }
    }
  }, [lastEvent]);

  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
    fetchStaffPerformance(newDate);
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionError(null);
      await usersApi.createUser({
        name: newName,
        username: newUsername,
        password: newPassword,
        roleId: newRoleId,
      });
      setShowAddUserModal(false);
      setNewName('');
      setNewUsername('');
      setNewPassword('');
      setActionSuccess(`Staff user @${newUsername} created successfully!`);
      setTimeout(() => setActionSuccess(null), 3500);
      fetchDashboard();
      fetchStaffPerformance(selectedDate);
    } catch (err: any) {
      setActionError(err.response?.data?.message || err.message || 'Failed to create user');
    }
  };

  const openStaffModal = (staff: any, roleType: 'chef' | 'waiter' | 'manager' | 'admin') => {
    setSelectedStaff(staff);
    setSelectedStaffRole(roleType);
    setStaffTelemetryLoading(true);
    setStaffTelemetryDetails(null);
    reportsApi
      .getStaffDetails(staff.id)
      .then((res: any) => {
        setStaffTelemetryDetails(res);
      })
      .catch((err) => {
        console.error('Failed to load staff telemetry details', err);
      })
      .finally(() => {
        setStaffTelemetryLoading(false);
      });
  };

  const chefs = staffData?.chefPerformance || data?.chefPerformance || [];
  const waiters = staffData?.waiterPerformance || data?.waiterPerformance || [];
  const managers = staffData?.managerPerformance || data?.managerPerformance || [];

  // Totals for summary banner
  const totalDishesCooked = chefs.reduce((acc: number, c: any) => acc + (Number(c.itemsPrepared) || 0), 0);
  const totalDishesCooking = chefs.reduce((acc: number, c: any) => acc + (Number(c.currentlyCooking) || 0), 0);
  const totalDishesDelivered = waiters.reduce((acc: number, w: any) => acc + (Number(w.itemsDelivered) || 0), 0);
  const totalOrdersTaken = waiters.reduce((acc: number, w: any) => acc + (Number(w.ordersTaken) || 0), 0);
  const totalBillsGenerated = managers.reduce((acc: number, m: any) => acc + (Number(m.billsGenerated) || 0), 0);
  const totalRevenueCollected = managers.reduce((acc: number, m: any) => acc + (Number(m.totalCollectedAmount) || 0), 0);

  const formattedRevenueTrend = (data?.revenueTrend || []).map((item: any) => ({
    date: item.date,
    revenue: Number(item.revenue) || 0,
    orders: Number(item.orders) || 0,
  }));

  const formattedCategoryDist = (data?.categoryDistribution || []).map((item: any) => ({
    name: item.name,
    count: Number(item.count) || 0,
    value: Number(item.value) || 0,
  }));

  const formattedHourlyDist = (data?.hourlyDistribution || []).map((item: any) => ({
    hour: item.hour,
    orders: Number(item.orders) || 0,
    revenue: Number(item.revenue) || 0,
  }));

  return (
    <div className="p-3 sm:p-6 space-y-6 max-w-full overflow-x-hidden">
      {/* Toast Alerts */}
      {actionSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2 shadow-lg">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}
      {actionError && (
        <div className="p-3.5 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-bold flex items-center gap-2 shadow-lg">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Welcome Banner */}
      <div className="glass-panel p-5 sm:p-6 rounded-3xl border border-slate-800 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
            Executive Control Tower
          </span>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white mt-1">
            Restaurant Performance Overview
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Real-time telemetry across restaurant dining floors, kitchen tickets, revenue collections, and staff operations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Add Staff / Provision User Button */}
          <button
            onClick={() => {
              setActionError(null);
              setShowAddUserModal(true);
            }}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 transition shadow-lg shadow-amber-500/20"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Add Staff Member</span>
          </button>
          <button
            onClick={() => {
              fetchDashboard();
              fetchStaffPerformance(selectedDate);
            }}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 font-semibold text-xs flex items-center gap-1.5 transition"
            title="Refresh Real-time Data"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
          <Link
            to="/settings"
            className="px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold text-xs flex items-center gap-1.5 transition shadow-sm"
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Theme Colors</span>
          </Link>
          <Link
            to="/roles-manage"
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs transition"
          >
            Staff Directory
          </Link>
        </div>
      </div>

      {/* Primary Financial Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Today's Revenue"
          value={`${currency}${data?.todayRevenue || '0.00'}`}
          subtitle="Real paid transactions"
          icon={DollarSign}
          color="emerald"
        />
        <StatCard
          title="Weekly Revenue"
          value={`${currency}${data?.weeklyRevenue || '0.00'}`}
          subtitle="Current calendar week"
          icon={TrendingUp}
          color="amber"
        />
        <StatCard
          title="Monthly Revenue"
          value={`${currency}${data?.monthlyRevenue || '0.00'}`}
          subtitle="Current month to date"
          icon={Award}
          color="purple"
        />
        <StatCard
          title="Total Lifetime Orders"
          value={data?.totalOrders || 0}
          subtitle={`${data?.todayOrders || 0} placed today`}
          icon={ShoppingBag}
          color="blue"
        />
      </div>

      {/* Operational Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Active Dining Tables"
          value={`${data?.occupiedTables || 0} / ${data?.totalTables || 0}`}
          subtitle={`${data?.totalFloors || 0} Floors operational`}
          icon={Layers}
          color="amber"
        />
        <StatCard
          title="Service Staff on Shift"
          value={data?.totalStaff || 0}
          subtitle="Waiters / Service Boys"
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Chefs in Kitchen"
          value={data?.totalChefs || 0}
          subtitle="Active line cooks & head chefs"
          icon={ChefHat}
          color="rose"
        />
        <StatCard
          title="Food Items Prepared"
          value={data?.itemsPrepared || 0}
          subtitle={`${data?.itemsDelivered || 0} served to tables`}
          icon={Sparkles}
          color="emerald"
        />
      </div>

      {/* ============================================================== */}
      {/* 📊 ADVANCED VISUAL ANALYTICS & GRAPH INTELLIGENCE SYSTEM       */}
      {/* ============================================================== */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <BarChart3 className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                  <span>Executive Visual Analytics & Revenue Intelligence</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold uppercase tracking-wider">
                    Dynamic Graphs
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  7-Day revenue trends, culinary category sales breakdown, and hourly peak dining traffic.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Chart 1: 7-Day Revenue & Demand Trajectory (8 cols) */}
          <div className="lg:col-span-8 glass-panel p-4 sm:p-5 rounded-3xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-amber-400" />
                  <span>7-Day Financial & Order Trajectory</span>
                </h4>
                <p className="text-[11px] text-slate-400">Daily gross revenue ({currency}) & order volume</p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-amber-400 font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                  <span>Revenue</span>
                </span>
                <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                  <span>Orders</span>
                </span>
              </div>
            </div>

            <div className="h-64 sm:h-72 w-full pt-2">
              {formattedRevenueTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={formattedRevenueTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="left" stroke="#64748b" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="right" orientation="right" stroke="#64748b" tick={{ fontSize: 11 }} />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="p-3 bg-slate-900 border border-slate-700 rounded-xl shadow-xl text-xs space-y-1">
                              <p className="font-bold text-white mb-1">{label}</p>
                              <p className="text-amber-400 font-semibold">
                                Revenue: <strong className="text-white">{currency}{Number(payload[0]?.value || 0).toFixed(2)}</strong>
                              </p>
                              {payload[1] && (
                                <p className="text-emerald-400 font-semibold">
                                  Orders: <strong className="text-white">{payload[1]?.value} orders</strong>
                                </p>
                              )}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="revenue"
                      name="Revenue"
                      stroke="#f59e0b"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#colorRevenue)"
                    />
                    <Area
                      yAxisId="right"
                      type="monotone"
                      dataKey="orders"
                      name="Orders"
                      stroke="#10b981"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorOrders)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-500">
                  No revenue trend data available
                </div>
              )}
            </div>
          </div>

          {/* Chart 2: Category Sales Distribution (4 cols) */}
          <div className="lg:col-span-4 glass-panel p-4 sm:p-5 rounded-3xl border border-slate-800 space-y-3 flex flex-col justify-between">
            <div>
              <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-emerald-400" />
                <span>Sales by Culinary Category</span>
              </h4>
              <p className="text-[11px] text-slate-400">Share of revenue across menu sections</p>
            </div>

            <div className="h-48 sm:h-52 w-full relative flex items-center justify-center">
              {formattedCategoryDist.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={formattedCategoryDist}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={3}
                    >
                      {formattedCategoryDist.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const p = payload[0];
                          return (
                            <div className="p-2.5 bg-slate-900 border border-slate-700 rounded-xl shadow-xl text-xs">
                              <p className="font-bold text-white">{p.name}</p>
                              <p className="text-amber-400 font-semibold mt-0.5">
                                Revenue: <span className="text-white">{currency}{Number(p.value).toFixed(2)}</span>
                              </p>
                              <p className="text-slate-400">
                                Sold: <span className="text-white">{p.payload.count} items</span>
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-500">
                  No category data available
                </div>
              )}
            </div>

            {/* Category Mini Legend List */}
            <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-slate-800/80 text-[11px] max-h-28 overflow-y-auto pr-1">
              {formattedCategoryDist.map((cat: any, i: number) => (
                <div key={i} className="flex items-center gap-1.5 truncate">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}
                  ></span>
                  <span className="text-slate-300 truncate">{cat.name}</span>
                  <span className="text-slate-500 ml-auto shrink-0 font-semibold">{cat.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Chart 3: Hourly Rush & Peak Operating Traffic (Full 12 cols) */}
          <div className="lg:col-span-12 glass-panel p-4 sm:p-5 rounded-3xl border border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div>
                <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-400" />
                  <span>Peak Dining Rush & Hourly Order Velocity</span>
                </h4>
                <p className="text-[11px] text-slate-400">
                  Real-time ticket load across operational lunch and dinner service windows
                </p>
              </div>
              <div className="text-xs text-slate-400 flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold">
                  Lunch Rush: 12 PM - 3 PM
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
                  Dinner Rush: 7 PM - 10 PM
                </span>
              </div>
            </div>

            <div className="h-44 sm:h-52 w-full pt-2">
              {formattedHourlyDist.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={formattedHourlyDist} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="hour" stroke="#64748b" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const p = payload[0];
                          return (
                            <div className="p-2.5 bg-slate-900 border border-slate-700 rounded-xl shadow-xl text-xs space-y-0.5">
                              <p className="font-bold text-amber-400">{label}</p>
                              <p className="text-blue-400 font-semibold">
                                Orders: <span className="text-white">{p.value} tickets</span>
                              </p>
                              <p className="text-emerald-400 font-semibold">
                                Revenue: <span className="text-white">{currency}{Number(p.payload.revenue || 0).toFixed(2)}</span>
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="orders" name="Orders" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-500">
                  No hourly rush data available
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 🚀 STAFF OPERATIONAL PERFORMANCE TELEMETRY & CLICK ANALYTICS  */}
      {/* ============================================================== */}
      <div className="glass-panel p-4 sm:p-6 rounded-3xl border border-slate-800 space-y-6">
        {/* Header & Date Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2 flex-wrap">
                  <span>Staff Daily Performance & Operations</span>
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                    Live Telemetry
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  సిబ్బంది రోజువారీ పనితీరు (కార్డ్ మీద క్లిక్ చేసి పూర్తి వివరాలు & రేటింగ్ చూడవచ్చు)
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Quick date presets */}
            <button
              onClick={() => handleDateChange(new Date().toISOString().split('T')[0])}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                selectedDate === new Date().toISOString().split('T')[0]
                  ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-md shadow-amber-500/20'
                  : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-600'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => {
                const d = new Date();
                d.setDate(d.getDate() - 1);
                handleDateChange(d.toISOString().split('T')[0]);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                selectedDate !== new Date().toISOString().split('T')[0]
                  ? 'bg-amber-500 text-slate-950 border-amber-500'
                  : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-600'
              }`}
            >
              Yesterday
            </button>

            {/* Date input */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200">
              <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Daily Summary Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
          <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400">Items Prepared</span>
            <div className="text-xl font-black text-rose-400 mt-0.5">{totalDishesCooked}</div>
            <span className="text-[10px] text-slate-500">By Chef team</span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400">Currently Cooking</span>
            <div className="text-xl font-black text-amber-400 mt-0.5">{totalDishesCooking}</div>
            <span className="text-[10px] text-slate-500">Live on fire</span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400">Orders Taken</span>
            <div className="text-xl font-black text-blue-400 mt-0.5">{totalOrdersTaken}</div>
            <span className="text-[10px] text-slate-500">Service staff</span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400">Dishes Served</span>
            <div className="text-xl font-black text-emerald-400 mt-0.5">{totalDishesDelivered}</div>
            <span className="text-[10px] text-slate-500">Delivered to tables</span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400">Bills Generated</span>
            <div className="text-xl font-black text-purple-400 mt-0.5">{totalBillsGenerated}</div>
            <span className="text-[10px] text-slate-500">By Cashier / Manager</span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400">Revenue Settled</span>
            <div className="text-xl font-black text-emerald-400 mt-0.5">{currency}{totalRevenueCollected.toFixed(2)}</div>
            <span className="text-[10px] text-slate-500">Collected today</span>
          </div>
        </div>

        {/* Role Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
          <button
            onClick={() => setStaffTab('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
              staffTab === 'all'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-900/60 text-slate-400 hover:text-white'
            }`}
          >
            <span>All Staff</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-800/80 text-[10px]">
              {chefs.length + waiters.length + managers.length}
            </span>
          </button>
          <button
            onClick={() => setStaffTab('chefs')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
              staffTab === 'chefs'
                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                : 'bg-slate-900/60 text-slate-400 hover:text-white'
            }`}
          >
            <ChefHat className="w-3.5 h-3.5" />
            <span>Chefs ({chefs.length})</span>
          </button>
          <button
            onClick={() => setStaffTab('waiters')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
              staffTab === 'waiters'
                ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20'
                : 'bg-slate-900/60 text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Service Boys / Waiters ({waiters.length})</span>
          </button>
          <button
            onClick={() => setStaffTab('managers')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
              staffTab === 'managers'
                ? 'bg-purple-500 text-white shadow-md shadow-purple-500/20'
                : 'bg-slate-900/60 text-slate-400 hover:text-white'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Managers & Cashiers ({managers.length})</span>
          </button>
        </div>

        {/* Telemetry Sections with Clickable Cards */}
        <div className="space-y-6">
          {/* 1. CHEFS SECTION */}
          {(staffTab === 'all' || staffTab === 'chefs') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-sm text-white flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    <ChefHat className="w-4 h-4" />
                  </span>
                  <span>Kitchen Chefs - Cooking & Preparation Performance</span>
                </h4>
                <span className="text-xs text-rose-400 font-bold">
                  {totalDishesCooked} Dishes Ready
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {chefs.map((c: any) => (
                  <div
                    key={c.id}
                    onClick={() => openStaffModal(c, 'chef')}
                    className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-amber-500/60 hover:shadow-xl hover:shadow-amber-500/5 cursor-pointer transition space-y-3 group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500/20 to-orange-500/20 border border-rose-500/30 flex items-center justify-center font-bold text-rose-400 text-sm group-hover:scale-105 transition">
                          {c.name ? c.name[0] : 'C'}
                        </div>
                        <div>
                          <div className="font-bold text-white text-sm group-hover:text-amber-400 transition">
                            {c.name || c.username}
                          </div>
                          <div className="text-[11px] text-slate-400">@{c.username} • {c.role?.toUpperCase()}</div>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        View Analytics ➔
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-800/80 text-center">
                      <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                        <div className="text-base font-black text-emerald-400">{c.itemsPrepared}</div>
                        <div className="text-[9px] uppercase font-bold text-slate-400">Ready/Done</div>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                        <div className="text-base font-black text-amber-400">{c.currentlyCooking}</div>
                        <div className="text-[9px] uppercase font-bold text-slate-400">Cooking</div>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                        <div className="text-base font-black text-blue-400">{c.distinctDishesCooked}</div>
                        <div className="text-[9px] uppercase font-bold text-slate-400">Recipes</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. WAITERS / SERVICE BOYS SECTION */}
          {(staffTab === 'all' || staffTab === 'waiters') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-sm text-white flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    <Users className="w-4 h-4" />
                  </span>
                  <span>Service Boys & Waiters - Table Orders & Delivery Performance</span>
                </h4>
                <span className="text-xs text-blue-400 font-bold">
                  {totalDishesDelivered} Dishes Served
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {waiters.map((w: any) => (
                  <div
                    key={w.id}
                    onClick={() => openStaffModal(w, 'waiter')}
                    className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-amber-500/60 hover:shadow-xl hover:shadow-amber-500/5 cursor-pointer transition space-y-3 group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-500/20 to-cyan-500/20 border border-blue-500/30 flex items-center justify-center font-bold text-blue-400 text-sm group-hover:scale-105 transition">
                          {w.name ? w.name[0] : 'W'}
                        </div>
                        <div>
                          <div className="font-bold text-white text-sm group-hover:text-amber-400 transition">
                            {w.name || w.username}
                          </div>
                          <div className="text-[11px] text-slate-400">@{w.username} • {w.role?.toUpperCase()}</div>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        View Analytics ➔
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-800/80 text-center">
                      <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                        <div className="text-base font-black text-amber-400">{w.ordersTaken}</div>
                        <div className="text-[9px] uppercase font-bold text-slate-400">Orders Taken</div>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                        <div className="text-base font-black text-emerald-400">{w.itemsDelivered}</div>
                        <div className="text-[9px] uppercase font-bold text-slate-400">Dishes Served</div>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                        <div className="text-base font-black text-white">{currency}{Number(w.totalOrderValue || 0).toFixed(0)}</div>
                        <div className="text-[9px] uppercase font-bold text-slate-400">Sales Value</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. MANAGERS & CASHIERS SECTION */}
          {(staffTab === 'all' || staffTab === 'managers') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-sm text-white flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    <Receipt className="w-4 h-4" />
                  </span>
                  <span>Managers & Cashiers - Billing & Revenue Settlements</span>
                </h4>
                <span className="text-xs text-purple-400 font-bold">
                  {totalBillsGenerated} Bills Issued
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {managers.map((m: any) => (
                  <div
                    key={m.id}
                    onClick={() => openStaffModal(m, 'manager')}
                    className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-amber-500/60 hover:shadow-xl hover:shadow-amber-500/5 cursor-pointer transition space-y-3 group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-500/20 to-indigo-500/20 border border-purple-500/30 flex items-center justify-center font-bold text-purple-400 text-sm group-hover:scale-105 transition">
                          {m.name ? m.name[0] : 'M'}
                        </div>
                        <div>
                          <div className="font-bold text-white text-sm group-hover:text-amber-400 transition">
                            {m.name || m.username}
                          </div>
                          <div className="text-[11px] text-slate-400">@{m.username} • {m.role?.toUpperCase()}</div>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                        View Analytics ➔
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80 text-center">
                      <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                        <div className="text-base font-black text-amber-400">{m.billsGenerated}</div>
                        <div className="text-[9px] uppercase font-bold text-slate-400">Bills Generated</div>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                        <div className="text-base font-black text-emerald-400">{currency}{Number(m.totalCollectedAmount || 0).toFixed(2)}</div>
                        <div className="text-[9px] uppercase font-bold text-slate-400">Settled Revenue</div>
                      </div>
                    </div>

                    {/* Payment methods mini breakdown */}
                    <div className="flex items-center justify-between text-[11px] pt-1 px-1 text-slate-400 border-t border-slate-800/50">
                      <span className="flex items-center gap-1">
                        <QrCode className="w-3 h-3 text-amber-400" />
                        <span>UPI: {currency}{Number(m.upiCollected || 0).toFixed(0)}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Banknote className="w-3 h-3 text-emerald-400" />
                        <span>Cash: {currency}{Number(m.cashCollected || 0).toFixed(0)}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <CreditCard className="w-3 h-3 text-blue-400" />
                        <span>Card: {currency}{Number(m.cardCollected || 0).toFixed(0)}</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Top Selling Dishes Table */}
      <div className="glass-panel p-4 sm:p-6 rounded-2xl border border-slate-800 space-y-4">
        <h3 className="font-bold text-base text-white flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-500" />
          <span>Top Ordered Specialties & Revenue Drivers</span>
        </h3>

        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <table className="w-full text-xs text-left min-w-[500px]">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                <th className="py-2.5 px-3">Dish Name</th>
                <th className="py-2.5 text-center">Unit Price</th>
                <th className="py-2.5 text-center">Quantity Sold</th>
                <th className="py-2.5 text-right px-3">Revenue Generated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {data?.topSellingItems?.map((it: any, idx: number) => (
                <tr key={idx} className="hover:bg-slate-800/30 transition">
                  <td className="py-3 px-3 font-bold text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-400 font-bold flex items-center justify-center text-[10px] border border-amber-500/20">
                      {idx + 1}
                    </span>
                    <span>{it.name}</span>
                  </td>
                  <td className="py-3 text-center text-slate-300">
                    {currency}{it.price}
                  </td>
                  <td className="py-3 text-center font-bold text-emerald-400">
                    {it.totalSold} plates
                  </td>
                  <td className="py-3 text-right font-bold text-white px-3">
                    {currency}{(Number(it.price) * Number(it.totalSold)).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 🔍 MODAL 1: STAFF MEMBER DEEP PERFORMANCE ANALYTICS           */}
      {/* ============================================================== */}
      <Modal
        isOpen={!!selectedStaff}
        onClose={() => {
          setSelectedStaff(null);
          setStaffTelemetryDetails(null);
        }}
        title={selectedStaff ? `${selectedStaff.name || selectedStaff.username} - Staff Telemetry Profile` : ''}
        maxWidth="2xl"
      >
        {selectedStaff && (
          <div className="space-y-5">
            {/* Staff Bio Header */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 text-slate-950 font-black text-lg flex items-center justify-center shadow-lg shadow-amber-500/20">
                  {selectedStaff.name ? selectedStaff.name[0] : 'S'}
                </div>
                <div>
                  <h4 className="text-base font-extrabold text-white">{selectedStaff.name || selectedStaff.username}</h4>
                  <p className="text-xs text-slate-400">@{selectedStaff.username} • Role: <strong className="text-amber-400 uppercase">{selectedStaff.role}</strong></p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Active</span>
              </span>
            </div>

            {/* Role Specific Deep Analytics */}
            {selectedStaffRole === 'chef' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs uppercase font-extrabold text-slate-400 tracking-wider">
                    Kitchen Chef Performance Metrics
                  </h5>
                  <span className="text-[11px] text-amber-400 font-bold">Chef Sanjeev Line Cook Telemetry</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Dishes Ready</span>
                    <div className="text-xl font-black text-emerald-400 mt-0.5">{selectedStaff.itemsPrepared || 0}</div>
                    <span className="text-[10px] text-slate-500">Tickets done</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400">On Fire</span>
                    <div className="text-xl font-black text-amber-400 mt-0.5">{selectedStaff.currentlyCooking || 0}</div>
                    <span className="text-[10px] text-slate-500">Cooking</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Avg Prep Time</span>
                    <div className="text-xl font-black text-blue-400 mt-0.5">~{selectedStaff.avgPrepMinutes || 14} min</div>
                    <span className="text-[10px] text-slate-500">Start to ready</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Recipes Cooked</span>
                    <div className="text-xl font-black text-amber-400 mt-0.5">{selectedStaff.distinctDishesCooked || 0}</div>
                    <span className="text-[10px] text-slate-500">Menu varieties</span>
                  </div>
                </div>

                {/* 7-Day Chef Output Trend Chart */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <BarChart3 className="w-4 h-4 text-rose-400" />
                      <span>7-Day Culinary Output Trend</span>
                    </span>
                    <span className="text-[10px] text-slate-400">Dishes prepared per day</span>
                  </div>
                  <div className="h-44 w-full pt-1">
                    {staffTelemetryDetails?.weeklyTrend && staffTelemetryDetails.weeklyTrend.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={staffTelemetryDetails.weeklyTrend} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 10 }} />
                          <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                          <Tooltip
                            content={({ active, payload, label }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="p-2.5 bg-slate-900 border border-slate-700 rounded-xl shadow-xl text-xs space-y-0.5">
                                    <p className="font-bold text-amber-400">{label}</p>
                                    <p className="text-emerald-400 font-semibold">Prepared: {payload[0]?.value} dishes</p>
                                    {payload[1] && <p className="text-amber-400 font-semibold">Cooking: {payload[1]?.value}</p>}
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Bar dataKey="prepared" name="Dishes Prepared" fill="#10b981" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-slate-500">
                        {staffTelemetryLoading ? 'Loading 7-day trend telemetry...' : 'No historical cooking telemetry'}
                      </div>
                    )}
                  </div>
                </div>

                {/* Top Cooked Dishes by this Chef */}
                {staffTelemetryDetails?.dishesBreakdown && staffTelemetryDetails.dishesBreakdown.length > 0 && (
                  <div className="space-y-2">
                    <h6 className="text-[11px] uppercase font-bold text-slate-400">
                      Dishes Prepared by this Chef
                    </h6>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto pr-1">
                      {staffTelemetryDetails.dishesBreakdown.map((d: any, i: number) => (
                        <div key={i} className="p-2 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between text-xs">
                          <span className="text-slate-200 truncate">{d.name}</span>
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 font-bold ml-1 shrink-0">
                            {d.itemsCount} plates
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {selectedStaffRole === 'waiter' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs uppercase font-extrabold text-slate-400 tracking-wider">
                    Service Boy / Waiter Performance Metrics
                  </h5>
                  <span className="text-[11px] text-blue-400 font-bold">Dining Service Telemetry</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Orders Taken</span>
                    <div className="text-xl font-black text-amber-400 mt-0.5">{selectedStaff.ordersTaken || 0}</div>
                    <span className="text-[10px] text-slate-500">Tables booked</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Dishes Served</span>
                    <div className="text-xl font-black text-emerald-400 mt-0.5">{selectedStaff.itemsDelivered || 0}</div>
                    <span className="text-[10px] text-slate-500">Delivered</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Serving Speed</span>
                    <div className="text-xl font-black text-blue-400 mt-0.5">~{selectedStaff.avgServingMinutes || 4} min</div>
                    <span className="text-[10px] text-slate-500">Kitchen to table</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Order Sales</span>
                    <div className="text-xl font-black text-emerald-400 mt-0.5">{currency}{Number(selectedStaff.totalOrderValue || 0).toFixed(0)}</div>
                    <span className="text-[10px] text-slate-500">Sales volume</span>
                  </div>
                </div>

                {/* 7-Day Waiter Trend Chart */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <BarChart3 className="w-4 h-4 text-blue-400" />
                      <span>7-Day Service & Delivery Trend</span>
                    </span>
                    <span className="text-[10px] text-slate-400">Orders booked vs Dishes served</span>
                  </div>
                  <div className="h-44 w-full pt-1">
                    {staffTelemetryDetails?.weeklyTrend && staffTelemetryDetails.weeklyTrend.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={staffTelemetryDetails.weeklyTrend} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 10 }} />
                          <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                          <Tooltip
                            content={({ active, payload, label }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="p-2.5 bg-slate-900 border border-slate-700 rounded-xl shadow-xl text-xs space-y-0.5">
                                    <p className="font-bold text-amber-400">{label}</p>
                                    <p className="text-amber-400 font-semibold">Orders: {payload[0]?.value}</p>
                                    {payload[1] && <p className="text-emerald-400 font-semibold">Delivered: {payload[1]?.value}</p>}
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Bar dataKey="orders" name="Orders Taken" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="delivered" name="Dishes Delivered" fill="#10b981" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-slate-500">
                        {staffTelemetryLoading ? 'Loading service telemetry...' : 'No historical service telemetry'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {selectedStaffRole === 'manager' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs uppercase font-extrabold text-slate-400 tracking-wider">
                    Manager & Cashier Settlement Metrics
                  </h5>
                  <span className="text-[11px] text-purple-400 font-bold">Revenue & Invoicing Telemetry</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Bills Generated</span>
                    <div className="text-xl font-black text-purple-400 mt-0.5">{selectedStaff.billsGenerated || 0}</div>
                    <span className="text-[10px] text-slate-500">GST Invoices</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Payments Settled</span>
                    <div className="text-xl font-black text-emerald-400 mt-0.5">{selectedStaff.paymentsCollected || 0}</div>
                    <span className="text-[10px] text-slate-500">Settled receipts</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 col-span-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Total Settled Revenue</span>
                    <div className="text-xl font-black text-emerald-400 mt-0.5">{currency}{Number(selectedStaff.totalCollectedAmount || 0).toFixed(2)}</div>
                    <span className="text-[10px] text-slate-500">Deposited to restaurant</span>
                  </div>
                </div>

                {/* Payment Breakdown */}
                <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                  <span className="text-[11px] uppercase font-bold text-slate-400">Settlement Channels</span>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                      <div className="text-amber-400 font-bold">{currency}{Number(selectedStaff.upiCollected || 0).toFixed(0)}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">UPI QR</div>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                      <div className="text-emerald-400 font-bold">{currency}{Number(selectedStaff.cashCollected || 0).toFixed(0)}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Cash</div>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                      <div className="text-blue-400 font-bold">{currency}{Number(selectedStaff.cardCollected || 0).toFixed(0)}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Card POS</div>
                    </div>
                  </div>
                </div>

                {/* 7-Day Settlement Trend Chart */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <BarChart3 className="w-4 h-4 text-purple-400" />
                      <span>7-Day Settlement & Invoice Volume</span>
                    </span>
                    <span className="text-[10px] text-slate-400">Daily revenue collected</span>
                  </div>
                  <div className="h-44 w-full pt-1">
                    {staffTelemetryDetails?.weeklyTrend && staffTelemetryDetails.weeklyTrend.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={staffTelemetryDetails.weeklyTrend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 10 }} />
                          <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                          <Tooltip
                            content={({ active, payload, label }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="p-2.5 bg-slate-900 border border-slate-700 rounded-xl shadow-xl text-xs space-y-0.5">
                                    <p className="font-bold text-purple-400">{label}</p>
                                    <p className="text-purple-400 font-semibold">Bills: {payload[0]?.value}</p>
                                    {payload[1] && <p className="text-emerald-400 font-semibold">Revenue: {currency}{Number(payload[1]?.value || 0).toFixed(2)}</p>}
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Bar dataKey="bills" name="Bills Issued" fill="#a855f7" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="revenue" name="Settled Revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-slate-500">
                        {staffTelemetryLoading ? 'Loading billing telemetry...' : 'No historical billing telemetry'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={() => {
                setSelectedStaff(null);
                setStaffTelemetryDetails(null);
              }}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition"
            >
              Close Profile
            </button>
          </div>
        )}
      </Modal>

      {/* ============================================================== */}
      {/* ➕ MODAL 2: ADD NEW STAFF MEMBER (ADMIN PROVISIONING)         */}
      {/* ============================================================== */}
      <Modal
        isOpen={showAddUserModal}
        onClose={() => setShowAddUserModal(false)}
        title="Provision New Staff / User Account"
        maxWidth="md"
      >
        <form onSubmit={handleCreateStaff} className="space-y-4">
          <p className="text-xs text-slate-400">
            Create an active login account for your Chef, Service Boy/Waiter, Manager, or Admin.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
              Full Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Ramesh Kumar"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
              Username (for Login)
            </label>
            <input
              type="text"
              required
              placeholder="e.g. ramesh_waiter or chef_kiran"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value.toLowerCase().trim())}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
              Password
            </label>
            <input
              type="password"
              required
              placeholder="Enter secure password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
              Assign Staff Role
            </label>
            <select
              value={newRoleId}
              onChange={(e) => setNewRoleId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
            >
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.displayName} ({r.name})
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-xl shadow-amber-500/25 transition"
          >
            Create Staff Account
          </button>
        </form>
      </Modal>
    </div>
  );
};
