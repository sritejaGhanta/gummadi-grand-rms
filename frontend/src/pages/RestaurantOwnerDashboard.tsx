import React, { useState, useEffect } from 'react';
import { superAdminApi, ordersApi, billingApi, reportsApi, attendanceApi } from '../api/endpoints';
import { useSettings } from '../context/SettingsContext';
import {
  Building2,
  Users,
  CreditCard,
  TrendingUp,
  Receipt,
  Plus,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Phone,
  Mail,
  MapPin,
  Lock,
  X,
  ShieldCheck,
  Calendar,
  QrCode,
  ExternalLink,
  Printer,
  BarChart3,
  UserCheck,
  DollarSign,
  PieChart,
} from 'lucide-react';
import axios from 'axios';

export const RestaurantOwnerDashboard: React.FC = () => {
  const { currency, restaurantName } = useSettings();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [restaurant, setRestaurant] = useState<any>(null);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'sales' | 'attendance' | 'staff' | 'subscription' | 'reservations' | 'qr_menu'
  >('overview');
  const [loading, setLoading] = useState(true);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Sales & Attendance
  const [salesData, setSalesData] = useState<any>(null);
  const [ownerRoster, setOwnerRoster] = useState<any>(null);

  // Table Reservations
  const [reservations, setReservations] = useState<any[]>([]);

  // Add Staff Modal
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [staffForm, setStaffForm] = useState({
    name: '',
    username: '',
    password: '',
    roleName: 'staff',
    phone: '',
    email: '',
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const userStr = localStorage.getItem('rms_user');
      const u = userStr ? JSON.parse(userStr) : null;
      setCurrentUser(u);

      const rList = await superAdminApi.getRestaurants();
      // Match restaurant by user.restaurantId or default to first
      let myR = (rList || []).find((r: any) => r.id === u?.restaurantId) || rList?.[0];
      setRestaurant(myR);

      if (myR) {
        const sList = await superAdminApi.getStaff(myR.id);
        setStaffList(Array.isArray(sList) ? sList : []);

        // Load reservations
        try {
          const res = await axios.get(
            `/api/public/restaurant/${myR.slug || 'gummadi-grand'}/reservations`,
          );
          setReservations(res.data.data || res.data || []);
        } catch (resErr) {
          console.warn('Could not load reservations', resErr);
        }

        // Load Sales Metrics & Attendance Roster
        try {
          const sRes = await reportsApi.getAdminDashboard();
          setSalesData(sRes.data || sRes);
        } catch (sErr) {
          console.warn('Could not load sales analytics', sErr);
        }

        try {
          const aRes = await attendanceApi.getTodayRoster(myR.id);
          setOwnerRoster(aRes.data || aRes);
        } catch (aErr) {
          console.warn('Could not load attendance roster', aErr);
        }
      }
    } catch (e: any) {
      setActionError(e.message || 'Failed to load restaurant data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateResStatus = async (id: string, newStatus: string) => {
    try {
      await axios.patch(`/api/public/restaurant/reservations/${id}/status`, { status: newStatus });
      setActionSuccess(`Reservation marked as ${newStatus}`);
      setTimeout(() => setActionSuccess(null), 3000);
      if (restaurant) {
        const res = await axios.get(
          `/api/public/restaurant/${restaurant.slug || 'gummadi-grand'}/reservations`,
        );
        setReservations(res.data.data || res.data || []);
      }
    } catch (err: any) {
      setActionError('Failed to update reservation');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant) return;
    try {
      setActionError(null);
      await superAdminApi.addStaff(restaurant.id, staffForm);
      setActionSuccess(`Staff account "${staffForm.name}" created successfully!`);
      setShowAddStaffModal(false);
      setStaffForm({
        name: '',
        username: '',
        password: '',
        roleName: 'staff',
        phone: '',
        email: '',
      });
      const sList = await superAdminApi.getStaff(restaurant.id);
      setStaffList(Array.isArray(sList) ? sList : []);
      setTimeout(() => setActionSuccess(null), 3500);
    } catch (err: any) {
      setActionError(err.message || 'Failed to create staff member');
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 bg-gradient-to-r from-slate-900 via-indigo-950/30 to-slate-900 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-black text-xl shrink-0">
            {restaurant?.name?.[0] || 'R'}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-white">
                {restaurant?.name || restaurantName}
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {restaurant?.status || 'ACTIVE'}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 flex-wrap">
              <span>{restaurant?.cuisine || 'Multicuisine Fine Dine'}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-500" />
                {restaurant?.city || 'Hyderabad'}
              </span>
              <span>•</span>
              <span className="font-mono text-amber-400">GST: {restaurant?.gstNumber || '36AABCU9603R1ZM'}</span>
            </div>
          </div>
        </div>

        {/* Subscription Status Pill */}
        <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs shrink-0 space-y-1">
          <div className="text-[10px] uppercase font-bold text-slate-400">SaaS Subscription</div>
          <div className="text-sm font-black text-amber-400 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>{restaurant?.planName || 'Enterprise Plan'}</span>
          </div>
          <div className="text-[11px] text-emerald-400">
            {restaurant?.daysLeft > 0 ? `${restaurant.daysLeft} days validity remaining` : 'Lifetime Active'}
          </div>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div className="p-3.5 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
            activeTab === 'overview'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Operational Overview</span>
        </button>
        <button
          onClick={() => setActiveTab('sales')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
            activeTab === 'sales'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Sales Management</span>
        </button>
        <button
          onClick={() => setActiveTab('attendance')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
            activeTab === 'attendance'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Staff Attendance ({ownerRoster?.activeCount || 0} On Duty)</span>
        </button>
        <button
          onClick={() => setActiveTab('staff')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
            activeTab === 'staff'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Staff Team ({staffList.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('subscription')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
            activeTab === 'subscription'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Subscription & Billing</span>
        </button>
        <button
          onClick={() => setActiveTab('reservations')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
            activeTab === 'reservations'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Pre-Bookings ({reservations.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('qr_menu')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
            activeTab === 'qr_menu'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <QrCode className="w-4 h-4" />
          <span>Acrylic QR Stands</span>
        </button>
      </div>

      {/* TAB 1: OPERATIONAL OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Receipt className="w-4 h-4 text-amber-500" />
              <span>Table & POS Operations</span>
            </div>
            <p className="text-xs text-slate-400">
              Your staff members can take orders, share dining tables (Guest A/B), and print thermal receipts from the POS interface.
            </p>
            <div className="pt-2">
              <a
                href="/restaurant/staff-pos"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs shadow hover:bg-amber-400 transition"
              >
                <span>Open Staff POS</span>
              </a>
            </div>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span>Kitchen Display System (KDS)</span>
            </div>
            <p className="text-xs text-slate-400">
              Chefs view incoming KOT orders in real-time with sound alerts and mark items as ready.
            </p>
            <div className="pt-2">
              <a
                href="/restaurant/kitchen"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 text-white font-bold text-xs hover:bg-slate-700 transition"
              >
                <span>Open Kitchen KDS</span>
              </a>
            </div>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              <span>Day-End Cash Reconciliation</span>
            </div>
            <p className="text-xs text-slate-400">
              Prevent cash leaks by matching system sales against counted drawer cash every night.
            </p>
            <div className="pt-2">
              <a
                href="/restaurant/day-close"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 font-bold text-xs hover:bg-indigo-600/50 transition"
              >
                <span>View EOD Z-Reports</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* TAB: SALES MANAGEMENT & ANALYTICS */}
      {activeTab === 'sales' && (
        <div className="space-y-5">
          {/* Revenue KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <span className="text-[10px] uppercase font-bold text-slate-400">Today's Sales</span>
              <p className="text-2xl font-black text-amber-400 mt-1">
                {currency}{salesData?.todayRevenue || '0.00'}
              </p>
              <span className="text-[10px] text-emerald-400 font-semibold">Live POS Revenue</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <span className="text-[10px] uppercase font-bold text-slate-400">7-Day Sales</span>
              <p className="text-2xl font-black text-white mt-1">
                {currency}{salesData?.weeklyRevenue || '0.00'}
              </p>
              <span className="text-[10px] text-slate-400">Weekly Pace</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <span className="text-[10px] uppercase font-bold text-slate-400">Monthly Sales</span>
              <p className="text-2xl font-black text-emerald-400 mt-1">
                {currency}{salesData?.monthlyRevenue || '0.00'}
              </p>
              <span className="text-[10px] text-emerald-400 font-semibold">Month-to-Date</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <span className="text-[10px] uppercase font-bold text-slate-400">Total Orders</span>
              <p className="text-2xl font-black text-indigo-400 mt-1">
                {salesData?.totalOrders || 0}
              </p>
              <span className="text-[10px] text-slate-400">All Dining Tables</span>
            </div>
          </div>

          {/* Payment Modes & Category Distribution */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Payment Method Split */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3">
              <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-amber-400" />
                <span>Payment Mode Breakdown</span>
              </h4>
              <p className="text-xs text-slate-400">Collection channel distribution for this outlet.</p>

              <div className="space-y-3 pt-2">
                <div>
                  <div className="flex justify-between text-xs mb-1 font-semibold">
                    <span className="text-white">UPI (PhonePe / GPay / Paytm)</span>
                    <span className="text-emerald-400 font-bold">65%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: '65%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1 font-semibold">
                    <span className="text-white">Cash Register</span>
                    <span className="text-amber-400 font-bold">25%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: '25%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1 font-semibold">
                    <span className="text-white">Credit / Debit Card POS</span>
                    <span className="text-sky-400 font-bold">10%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full bg-sky-500 rounded-full" style={{ width: '10%' }} />
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-400">Tax Collection (GST 5%):</span>
                <span className="text-white font-bold font-mono">
                  {currency}{Number(((salesData?.todayRevenue || 0) * 0.05).toFixed(2))}
                </span>
              </div>
            </div>

            {/* Top Selling Items */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3">
              <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span>Top Selling Dishes & Yield</span>
              </h4>
              <p className="text-xs text-slate-400">Most ordered delicacies by customers.</p>

              <div className="divide-y divide-slate-800/80 text-xs">
                {salesData?.topSellingItems?.length > 0 ? (
                  salesData.topSellingItems.map((item: any, idx: number) => (
                    <div key={idx} className="py-2.5 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-white">{item.name}</div>
                        <div className="text-[11px] text-slate-400">{currency}{item.price} each</div>
                      </div>
                      <span className="px-2.5 py-1 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold font-mono">
                        {item.totalSold} Orders
                      </span>
                    </div>
                  ))
                ) : (
                  ['Gummadi Special Royyala Biryani', 'Natukodi Pulusu & Ragi Sankati', 'Gongura Mutton Roast'].map((name, idx) => (
                    <div key={idx} className="py-2.5 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-white">{name}</div>
                        <div className="text-[11px] text-slate-400">Specialties</div>
                      </div>
                      <span className="px-2.5 py-1 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold font-mono">
                        Active Menu
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: STAFF ATTENDANCE & SHIFTS */}
      {activeTab === 'attendance' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-amber-400" />
                  <span>Staff Shift Attendance & Floor Roster</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Track who is currently working, shift timings, and daily hours.
                </p>
              </div>

              <a
                href="/restaurant/attendance"
                className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow transition"
              >
                <span>Full Attendance Register</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Quick Live Roster Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-3">Staff Name</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Duty Status</th>
                    <th className="p-3">Shift</th>
                    <th className="p-3">Clock In</th>
                    <th className="p-3 text-right">Work Hours</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {ownerRoster?.roster?.map((r: any) => (
                    <tr key={r.userId} className="hover:bg-slate-800/40 transition">
                      <td className="p-3 font-bold text-white flex items-center gap-2">
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            r.isClockedIn ? 'bg-emerald-400 animate-pulse' : r.clockOutTime ? 'bg-indigo-400' : 'bg-slate-600'
                          }`}
                        />
                        <span>{r.name}</span>
                      </td>
                      <td className="p-3 text-slate-400">{r.role}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            r.isClockedIn
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : r.clockOutTime
                              ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                              : 'bg-slate-800 text-slate-500 border border-slate-700'
                          }`}
                        >
                          {r.isClockedIn ? 'ON DUTY' : r.clockOutTime ? 'SHIFT ENDED' : 'OFFLINE'}
                        </span>
                      </td>
                      <td className="p-3 text-slate-400">{r.shift}</td>
                      <td className="p-3 font-mono text-emerald-400">
                        {r.clockInTime ? new Date(r.clockInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                      <td className="p-3 text-right font-bold text-white">
                        {r.totalHours ? `${r.totalHours} hrs` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: STAFF MANAGEMENT */}
      {activeTab === 'staff' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-500" />
              <span>Restaurant Staff Accounts ({staffList.length})</span>
            </h3>
            <button
              onClick={() => setShowAddStaffModal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow transition"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Staff Member</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {staffList.map((s) => (
              <div
                key={s.id}
                className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-3 shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-white text-sm">{s.name}</h4>
                    <p className="text-xs text-slate-400 font-mono">@{s.username}</p>
                    {s.phone && <p className="text-[11px] text-slate-500 mt-1">{s.phone}</p>}
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
                    {s.role?.displayName || s.role?.name}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Status: <strong className="text-emerald-400">Active</strong></span>
                  <span className="text-slate-500">Access: Store Level</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: SUBSCRIPTION */}
      {activeTab === 'subscription' && (
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4 max-w-2xl">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center font-bold">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Active Plan: {restaurant?.planName || 'Enterprise'}</h3>
              <p className="text-xs text-slate-400">All modules unlocked for this restaurant</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
            <div className="flex justify-between text-slate-300">
              <span>Billing Status:</span>
              <strong className="text-emerald-400 uppercase">Active Subscription</strong>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Supported Outlets:</span>
              <strong className="text-white">Up to 10 Branches</strong>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Staff Accounts:</span>
              <strong className="text-white">Up to 50 Logins</strong>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Next Renewal Date:</span>
              <strong className="text-amber-400">
                {restaurant?.subscriptionEndsAt
                  ? new Date(restaurant.subscriptionEndsAt).toLocaleDateString()
                  : 'Annual Auto-Renewal'}
              </strong>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: PRE-BOOKINGS & RESERVATIONS */}
      {activeTab === 'reservations' && (
        <div className="space-y-4">
          <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-amber-400" />
                  Table Pre-Bookings & Guest Reservations
                </h3>
                <p className="text-xs text-slate-400">
                  Customers can pre-book tables online with advance token payment.
                </p>
              </div>
              <span className="px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold">
                {reservations.length} Bookings
              </span>
            </div>

            {reservations.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Calendar className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                <p className="text-sm">No reservations booked yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/80 text-slate-400 font-semibold border-b border-slate-800 uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="p-3">Customer</th>
                      <th className="p-3">Contact</th>
                      <th className="p-3">Table</th>
                      <th className="p-3">Party Size</th>
                      <th className="p-3">Date & Time</th>
                      <th className="p-3">Advance (₹)</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-200">
                    {reservations.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-900/40 transition">
                        <td className="p-3 font-bold text-white">{r.customerName}</td>
                        <td className="p-3 font-mono text-slate-400">{r.customerPhone}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold">
                            Table {r.table?.tableNumber || 'Assigned'}
                          </span>
                        </td>
                        <td className="p-3">{r.guestCount} Guests</td>
                        <td className="p-3">
                          <span className="font-semibold text-white">{r.reservationDate}</span>{' '}
                          <span className="text-slate-400">at {r.reservationTime}</span>
                        </td>
                        <td className="p-3 font-bold text-emerald-400">₹{r.advancePaid || 0}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              r.status === 'SEATED'
                                ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                                : r.status === 'CANCELLED'
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="p-3 text-right space-x-1.5">
                          {r.status === 'CONFIRMED' && (
                            <>
                              <button
                                onClick={() => handleUpdateResStatus(r.id, 'SEATED')}
                                className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[10px] transition"
                              >
                                Mark Seated
                              </button>
                              <button
                                onClick={() => handleUpdateResStatus(r.id, 'CANCELLED')}
                                className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold text-[10px] transition"
                              >
                                Cancel
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: TABLE ACRYLIC QR STANDS */}
      {activeTab === 'qr_menu' && (
        <div className="space-y-4">
          <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-amber-400" />
                  Table Acrylic Stand QR Generator
                </h3>
                <p className="text-xs text-slate-400">
                  Place these QR stands on each table so customers can browse digital photo menu and order directly from their phones.
                </p>
              </div>
              <button
                onClick={() => window.print()}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print All Acrylic Stands</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {['G-01', 'G-02', 'G-03', 'G-04'].map((tNum) => (
                <div
                  key={tNum}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col items-center text-center space-y-2 hover:border-amber-500/50 transition"
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-black">
                    <QrCode className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-extrabold text-white">Table {tNum}</h4>
                  <p className="text-[11px] text-slate-400">Acrylic Stand QR</p>
                  <div className="pt-2 w-full space-y-1.5">
                    <a
                      href={`/restaurant/qr/${restaurant?.slug || 'gummadi-grand'}/${tNum}`}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full py-1.5 px-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1 transition"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Open Menu</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ADD STAFF MODAL */}
      {showAddStaffModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base">Add New Staff Member</h3>
              <button
                onClick={() => setShowAddStaffModal(false)}
                className="w-7 h-7 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={staffForm.name}
                  onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                  placeholder="e.g. Raju Waiter"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Username (Login ID) *</label>
                <input
                  type="text"
                  required
                  value={staffForm.username}
                  onChange={(e) => setStaffForm({ ...staffForm, username: e.target.value })}
                  placeholder="e.g. raju_waiter"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Role *</label>
                  <select
                    value={staffForm.roleName}
                    onChange={(e) => setStaffForm({ ...staffForm, roleName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  >
                    <option value="staff">Service Staff / Waiter</option>
                    <option value="chef">Kitchen Chef</option>
                    <option value="manager">Restaurant Manager</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Password</label>
                  <input
                    type="password"
                    value={staffForm.password}
                    onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                    placeholder="Default: staff123"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={staffForm.phone}
                  onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                  placeholder="+91 90000 00000"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddStaffModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
