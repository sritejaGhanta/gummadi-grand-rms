import React, { useState, useEffect } from 'react';
import { reportsApi } from '../api/endpoints';
import { useSettings } from '../context/SettingsContext';
import { useSocket } from '../context/SocketContext';
import { Modal } from '../components/Modal';
import { StaffTelemetryModal } from '../components/StaffTelemetryModal';
import {
  ChefHat,
  Users,
  Receipt,
  Calendar,
  RefreshCw,
  Star,
  Activity,
  BarChart3,
  QrCode,
  Banknote,
  CreditCard,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

export const StaffPerformancePage: React.FC = () => {
  const { currency } = useSettings();
  const { lastEvent } = useSocket();

  // Local calendar date helper
  const formatLocalDate = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = formatLocalDate(new Date());
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = formatLocalDate(yesterdayDate);

  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [staffData, setStaffData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [staffTab, setStaffTab] = useState<'all' | 'chefs' | 'waiters' | 'managers'>('all');

  // Modals & Telemetry
  const [selectedStaff, setSelectedStaff] = useState<any | null>(null);
  const [selectedStaffRole, setSelectedStaffRole] = useState<'chef' | 'waiter' | 'manager' | 'admin'>('chef');
  const [staffTelemetryDetails, setStaffTelemetryDetails] = useState<any | null>(null);
  const [staffTelemetryLoading, setStaffTelemetryLoading] = useState(false);

  const fetchStaffPerformance = (dateStr: string) => {
    setLoading(true);
    reportsApi
      .getStaffPerformance(dateStr)
      .then((res) => setStaffData(res))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStaffPerformance(selectedDate);
  }, [selectedDate]);

  // Real-time listener
  useEffect(() => {
    if (!lastEvent) return;
    if (
      lastEvent.type === 'order:created' ||
      lastEvent.type === 'order:item_status_changed' ||
      lastEvent.type === 'billing:paid'
    ) {
      if (selectedDate === todayStr) {
        fetchStaffPerformance(selectedDate);
      }
    }
  }, [lastEvent, selectedDate]);

  const handlePrevDay = () => {
    const parts = selectedDate.split('-').map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    d.setDate(d.getDate() - 1);
    setSelectedDate(formatLocalDate(d));
  };

  const handleNextDay = () => {
    const parts = selectedDate.split('-').map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    d.setDate(d.getDate() + 1);
    setSelectedDate(formatLocalDate(d));
  };

  const openStaffModal = (staff: any, roleType: 'chef' | 'waiter' | 'manager' | 'admin') => {
    setSelectedStaff(staff);
    setSelectedStaffRole(roleType);
  };

  const chefs = staffData?.chefPerformance || [];
  const waiters = staffData?.waiterPerformance || [];
  const managers = staffData?.managerPerformance || [];

  const totalDishesCooked = chefs.reduce((acc: number, c: any) => acc + (Number(c.itemsPrepared) || 0), 0);
  const totalDishesCooking = chefs.reduce((acc: number, c: any) => acc + (Number(c.currentlyCooking) || 0), 0);
  const totalDishesDelivered = waiters.reduce((acc: number, w: any) => acc + (Number(w.itemsDelivered) || 0), 0);
  const totalOrdersTaken = waiters.reduce((acc: number, w: any) => acc + (Number(w.ordersTaken) || 0), 0);
  const totalBillsGenerated = managers.reduce((acc: number, m: any) => acc + (Number(m.billsGenerated) || 0), 0);
  const totalRevenueCollected = managers.reduce((acc: number, m: any) => acc + (Number(m.totalCollectedAmount) || 0), 0);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-full">
      {/* Header Banner */}
      <div className="glass-panel p-5 sm:p-6 rounded-3xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
            <Activity className="w-4 h-4" />
            <span>Operational Staff Analytics</span>
          </span>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white mt-1">
            Staff Daily Performance & Operations
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Real-time telemetry of kitchen chef output, waiter order booking speed, and cashier GST billing settlements.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Date Presets */}
          <button
            onClick={() => setSelectedDate(todayStr)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition border ${
              selectedDate === todayStr
                ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-md shadow-amber-500/20'
                : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-600'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setSelectedDate(yesterdayStr)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition border ${
              selectedDate === yesterdayStr
                ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-md shadow-amber-500/20'
                : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-600'
            }`}
          >
            Yesterday
          </button>

          {/* Date Picker with Prev / Next Day navigation */}
          <div className="flex items-center rounded-xl bg-slate-900 border border-slate-700 overflow-hidden">
            <button
              onClick={handlePrevDay}
              className="px-2.5 py-2 text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Previous Day"
            >
              ◀
            </button>
            <div className="flex items-center gap-2 px-2 py-2 text-xs text-slate-200">
              <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer text-xs"
              />
            </div>
            <button
              onClick={handleNextDay}
              className="px-2.5 py-2 text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Next Day"
            >
              ▶
            </button>
          </div>

          <button
            onClick={() => fetchStaffPerformance(selectedDate)}
            disabled={loading}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            title="Refresh Staff Telemetry"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Daily Summary Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800">
          <span className="text-[10px] uppercase font-bold text-slate-400">Items Prepared</span>
          <div className="text-2xl font-black text-rose-400 mt-0.5">{totalDishesCooked}</div>
          <span className="text-[10px] text-slate-500">By Chef team</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800">
          <span className="text-[10px] uppercase font-bold text-slate-400">Currently Cooking</span>
          <div className="text-2xl font-black text-amber-400 mt-0.5">{totalDishesCooking}</div>
          <span className="text-[10px] text-slate-500">Live on fire</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800">
          <span className="text-[10px] uppercase font-bold text-slate-400">Orders Taken</span>
          <div className="text-2xl font-black text-blue-400 mt-0.5">{totalOrdersTaken}</div>
          <span className="text-[10px] text-slate-500">Service staff</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800">
          <span className="text-[10px] uppercase font-bold text-slate-400">Dishes Served</span>
          <div className="text-2xl font-black text-emerald-400 mt-0.5">{totalDishesDelivered}</div>
          <span className="text-[10px] text-slate-500">Delivered to tables</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800">
          <span className="text-[10px] uppercase font-bold text-slate-400">Bills Generated</span>
          <div className="text-2xl font-black text-purple-400 mt-0.5">{totalBillsGenerated}</div>
          <span className="text-[10px] text-slate-500">By Managers</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800">
          <span className="text-[10px] uppercase font-bold text-slate-400">Revenue Settled</span>
          <div className="text-2xl font-black text-emerald-400 mt-0.5">{currency}{totalRevenueCollected.toFixed(2)}</div>
          <span className="text-[10px] text-slate-500">Deposited today</span>
        </div>
      </div>

      {/* Role Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setStaffTab('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
            staffTab === 'all'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-slate-900 text-slate-400 hover:text-white'
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
              : 'bg-slate-900 text-slate-400 hover:text-white'
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
              : 'bg-slate-900 text-slate-400 hover:text-white'
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
              : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          <Receipt className="w-3.5 h-3.5" />
          <span>Managers & Cashiers ({managers.length})</span>
        </button>
      </div>

      {/* Staff Cards Grid */}
      <div className="space-y-6">
        {/* Chefs */}
        {(staffTab === 'all' || staffTab === 'chefs') && (
          <div className="space-y-3">
            <h4 className="font-extrabold text-sm text-white flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <ChefHat className="w-4 h-4" />
              </span>
              <span>Kitchen Chefs - Cooking & Preparation Telemetry</span>
            </h4>
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
                        <div className="text-[11px] text-slate-400">@{c.username} • CHEF</div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                      View Telemetry ➔
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

        {/* Waiters */}
        {(staffTab === 'all' || staffTab === 'waiters') && (
          <div className="space-y-3">
            <h4 className="font-extrabold text-sm text-white flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Users className="w-4 h-4" />
              </span>
              <span>Service Boys & Waiters - Table Orders & Delivery Speed</span>
            </h4>
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
                        <div className="text-[11px] text-slate-400">@{w.username} • WAITER</div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      View Telemetry ➔
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

        {/* Managers */}
        {(staffTab === 'all' || staffTab === 'managers') && (
          <div className="space-y-3">
            <h4 className="font-extrabold text-sm text-white flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <Receipt className="w-4 h-4" />
              </span>
              <span>Managers & Cashiers - Invoicing & Revenue Settlements</span>
            </h4>
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
                        <div className="text-[11px] text-slate-400">@{m.username} • MANAGER</div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      View Telemetry ➔
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

                  {/* Payment channels */}
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

      {/* Staff Member Telemetry Modal */}
      <StaffTelemetryModal
        isOpen={!!selectedStaff}
        onClose={() => setSelectedStaff(null)}
        staffUser={selectedStaff}
        roleType={selectedStaffRole}
      />
    </div>
  );
};
