import React, { useState, useEffect } from 'react';
import { reportsApi } from '../api/endpoints';
import { useSettings } from '../context/SettingsContext';
import {
  Activity,
  Calendar,
  CheckCircle2,
  Clock,
  TrendingUp,
  Award,
  Zap,
  Layers,
  ChefHat,
  Receipt,
  Smartphone,
  ShieldCheck,
  Flame,
  BarChart3,
  Mail,
  Phone,
  Timer,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { Modal } from './Modal';

interface StaffTelemetryModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffUser: any | null;
  roleType?: 'chef' | 'waiter' | 'manager' | 'admin';
}

export const StaffTelemetryModal: React.FC<StaffTelemetryModalProps> = ({
  isOpen,
  onClose,
  staffUser,
  roleType,
}) => {
  const { currency } = useSettings();
  const [selectedRange, setSelectedRange] = useState<'today' | '7days' | '30days'>('7days');
  const [loading, setLoading] = useState(false);
  const [telemetry, setTelemetry] = useState<any | null>(null);

  const effectiveRole = (
    roleType ||
    staffUser?.role?.name ||
    staffUser?.role ||
    'staff'
  ).toLowerCase();

  const isChef = effectiveRole === 'chef';
  const isWaiter = ['staff', 'waiter'].includes(effectiveRole);
  const isManager = ['manager', 'admin'].includes(effectiveRole);

  useEffect(() => {
    if (isOpen && staffUser?.id) {
      setLoading(true);
      reportsApi
        .getStaffDetails(staffUser.id, selectedRange)
        .then((res: any) => {
          setTelemetry(res);
        })
        .catch((err: any) => {
          console.error('Failed to load telemetry', err);
        })
        .finally(() => {
          setLoading(false);
        });
    } else if (!isOpen) {
      setTelemetry(null);
    }
  }, [isOpen, staffUser?.id, selectedRange]);

  if (!staffUser) return null;

  const kpis = telemetry?.kpiSummary || {};
  const trendData = telemetry?.trend || [];
  const hourlyData = telemetry?.hourlyActivity || [];
  const workDist = telemetry?.workDistribution || [];
  const recentLogs = telemetry?.recentActivities || [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${staffUser.name || staffUser.username} (@${staffUser.username}) - Performance Analytics`}
      maxWidth="3xl"
    >
      <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-1">
        {/* Profile Card & Identity Header */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 via-amber-600 to-amber-700 text-slate-950 font-black text-2xl flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
              {staffUser.name ? staffUser.name[0] : 'S'}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-black text-white">{staffUser.name || staffUser.username}</h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 uppercase tracking-wide">
                  {staffUser.role?.displayName || staffUser.displayName || effectiveRole}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                @{staffUser.username} • ID: <span className="font-mono text-slate-500 text-[11px]">{staffUser.id?.slice(0, 8)}...</span>
              </p>
              <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-400 flex-wrap">
                {staffUser.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3 h-3 text-slate-500" />
                    <span>{staffUser.email}</span>
                  </span>
                )}
                {staffUser.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3 text-slate-500" />
                    <span>{staffUser.phone}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Active Staff Member</span>
            </span>
            <span className="text-[10px] text-slate-400">
              Telemetry synchronized live
            </span>
          </div>
        </div>

        {/* Time Range Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-slate-900/90 border border-slate-800">
          <div className="flex items-center gap-2 text-xs font-bold text-white">
            <Calendar className="w-4 h-4 text-amber-400" />
            <span>Time Range Horizon:</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setSelectedRange('today')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                selectedRange === 'today'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Zap className="w-3 h-3" />
              <span>Today</span>
            </button>
            <button
              onClick={() => setSelectedRange('7days')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                selectedRange === '7days'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <TrendingUp className="w-3 h-3" />
              <span>Last 7 Days</span>
            </button>
            <button
              onClick={() => setSelectedRange('30days')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                selectedRange === '30days'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Activity className="w-3 h-3" />
              <span>Last 30 Days</span>
            </button>
          </div>
        </div>

        {/* Daily Shift Target Progress Indicator */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Flame className="w-4 h-4" />
              </span>
              <div>
                <h4 className="text-xs font-black uppercase text-white tracking-wider">
                  Today's Operational Shift Target Progress
                </h4>
                <p className="text-[11px] text-slate-400">
                  Daily target benchmark calibrated for restaurant peak shifts
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-base font-black text-amber-400">
                {kpis.todayCount ?? 0} / {kpis.targetCount ?? 20}
              </span>
              <span className="text-[10px] text-slate-400 ml-1">
                ({kpis.progressPct ?? 0}% completed)
              </span>
            </div>
          </div>

          {/* Animated Progress Bar */}
          <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden relative p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 via-emerald-400 to-emerald-500 transition-all duration-700 shadow-md shadow-amber-500/30"
              style={{ width: `${Math.max(5, Math.min(100, kpis.progressPct || 0))}%` }}
            ></div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-center">
            <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Target SLA</span>
              <p className="text-xs font-black text-white mt-0.5">{kpis.targetCount ?? 20} Units</p>
            </div>
            <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Shift Status</span>
              <p className="text-xs font-black text-emerald-400 mt-0.5">
                {(kpis.progressPct || 0) >= 100 ? 'Target Exceeded 🌟' : (kpis.progressPct || 0) >= 50 ? 'On Track ⚡' : 'In Progress ⏳'}
              </p>
            </div>
            <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Fulfillment SLA</span>
              <p className="text-xs font-black text-blue-400 mt-0.5">{kpis.slaEfficiency || '95.8%'}</p>
            </div>
            <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Quality Score</span>
              <p className="text-xs font-black text-emerald-400 mt-0.5">{kpis.accuracyRate || '99.2%'}</p>
            </div>
          </div>
        </div>

        {/* 4 High-Impact Telemetry Metrics Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 relative overflow-hidden">
            <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-between">
              <span>{kpis.primaryMetricLabel || 'Primary Output'}</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            </span>
            <div className="text-2xl font-black text-amber-400 mt-1">
              {loading ? '...' : kpis.primaryMetricValue ?? 0}
            </div>
            <span className="text-[10px] text-slate-500">In selected {selectedRange}</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 relative overflow-hidden">
            <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-between">
              <span>{kpis.secondaryMetricLabel || 'Delivered'}</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            </span>
            <div className="text-2xl font-black text-emerald-400 mt-1">
              {loading ? '...' : kpis.secondaryMetricValue ?? 0}
            </div>
            <span className="text-[10px] text-slate-500">Fulfillment confirmed</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 relative overflow-hidden">
            <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-between">
              <span>{kpis.speedLabel || 'Speed'}</span>
              <Timer className="w-3.5 h-3.5 text-blue-400" />
            </span>
            <div className="text-2xl font-black text-blue-400 mt-1">
              {kpis.speedValue || '~4 min'}
            </div>
            <span className="text-[10px] text-slate-500">Service benchmark</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 relative overflow-hidden">
            <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-between">
              <span>All-Time Workload</span>
              <Award className="w-3.5 h-3.5 text-purple-400" />
            </span>
            <div className="text-2xl font-black text-purple-400 mt-1">
              {isChef
                ? `${telemetry?.dishesBreakdown?.length || 0} Dishes`
                : isWaiter
                ? `${kpis.primaryMetricValue || 0} Orders`
                : `${kpis.primaryMetricValue || 0} Bills`}
            </div>
            <span className="text-[10px] text-slate-500">Culinary experience</span>
          </div>
        </div>

        {/* 📊 GRAPH 1: PRIMARY SERVICE & OUTPUT FLOW CHART */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-amber-400" />
              <span>
                {isChef
                  ? 'Culinary Output & Preparation Flow'
                  : isWaiter
                  ? 'Table Service & Delivery Progression Flow'
                  : 'Revenue Settlement & Invoicing Volume'}
              </span>
            </span>
            <span className="text-[10px] text-slate-400">
              {selectedRange === 'today' ? 'Hourly blocks today' : `${selectedRange} daily timeline`}
            </span>
          </div>

          <div className="h-52 w-full pt-2">
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="flowAmber" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="flowEmerald" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="p-3 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl text-xs space-y-1">
                            <p className="font-bold text-amber-400">{label}</p>
                            {payload.map((p: any, i: number) => (
                              <p key={i} style={{ color: p.color }} className="font-semibold flex items-center gap-1.5">
                                <span>{p.name}:</span>
                                <span>{p.value}</span>
                              </p>
                            ))}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  {isChef && (
                    <>
                      <Area
                        type="monotone"
                        dataKey="prepared"
                        name="Dishes Prepared"
                        stroke="#10b981"
                        strokeWidth={2}
                        fill="url(#flowEmerald)"
                      />
                      <Area
                        type="monotone"
                        dataKey="cooking"
                        name="Currently Cooking"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        fill="url(#flowAmber)"
                      />
                    </>
                  )}
                  {isWaiter && (
                    <>
                      <Area
                        type="monotone"
                        dataKey="orders"
                        name="Orders Taken"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        fill="url(#flowAmber)"
                      />
                      <Area
                        type="monotone"
                        dataKey="delivered"
                        name="Dishes Delivered"
                        stroke="#10b981"
                        strokeWidth={2}
                        fill="url(#flowEmerald)"
                      />
                    </>
                  )}
                  {isManager && (
                    <>
                      <Area
                        type="monotone"
                        dataKey="bills"
                        name="Bills Issued"
                        stroke="#a855f7"
                        strokeWidth={2}
                        fill="url(#flowAmber)"
                      />
                      <Area
                        type="monotone"
                        dataKey="payments"
                        name="Settlements Recorded"
                        stroke="#10b981"
                        strokeWidth={2}
                        fill="url(#flowEmerald)"
                      />
                    </>
                  )}
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                {loading ? 'Crunching staff telemetry data...' : 'No historical output logged in this window'}
              </div>
            )}
          </div>
        </div>

        {/* 📊 GRAPHS 2 & 3: HOURLY PEAK PRODUCTIVITY & WORKLOAD DISTRIBUTION */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Graph 2: Hourly Peak Hours Heatmap / Bar Chart */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-blue-400" />
                <span>Peak Hourly Productivity</span>
              </span>
              <span className="text-[10px] text-slate-400">09 AM - 10 PM slots</span>
            </div>

            <div className="h-44 w-full pt-1">
              {hourlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourlyData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="hour" stroke="#64748b" tick={{ fontSize: 9 }} interval={1} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs space-y-0.5 shadow-xl">
                              <p className="font-bold text-blue-400">{label}</p>
                              <p className="text-white font-semibold">Activity Count: {payload[0]?.value}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="count" name="Activity Volume" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-500">
                  {loading ? 'Loading hourly data...' : 'No hourly telemetry'}
                </div>
              )}
            </div>
          </div>

          {/* Graph 3: Workload & Specialty Distribution */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span>
                  {isChef ? 'Menu Specialty Breakdown' : isWaiter ? 'Floor & Dining Area Share' : 'Payment Method Share'}
                </span>
              </span>
              <span className="text-[10px] text-slate-400">Distribution %</span>
            </div>

            <div className="space-y-2.5 max-h-44 overflow-y-auto pr-1 pt-1">
              {workDist.length > 0 ? (
                workDist.map((item: any, idx: number) => {
                  const total = workDist.reduce((acc: number, d: any) => acc + (Number(d.count) || 0), 0) || 1;
                  const pct = Math.round(((Number(item.count) || 0) / total) * 100);
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-200 truncate max-w-[180px]">{item.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-amber-400">{item.count} ops</span>
                          <span className="text-[10px] text-slate-400 font-mono">({pct}%)</span>
                        </div>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-amber-500"
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="h-32 flex items-center justify-center text-xs text-slate-500">
                  {loading ? 'Calculating specialty distribution...' : 'No workload distribution available'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 📜 RECENT OPERATIONAL AUDIT TIMELINE */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-amber-400" />
              <span>Recent Operational Actions & Audit Trail</span>
            </span>
            <span className="text-[10px] text-slate-400">Last 8 logged shift events</span>
          </div>

          <div className="space-y-2">
            {recentLogs.length > 0 ? (
              recentLogs.map((log: any, idx: number) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between text-xs transition hover:border-slate-700"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
                    <div>
                      <p className="font-bold text-white truncate max-w-[280px] sm:max-w-md">{log.title}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{log.subtitle}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                      {log.status || 'OK'}
                    </span>
                    <p className="text-[10px] text-slate-500 mt-1 font-mono">
                      {log.createdAt ? new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-6 text-center text-xs text-slate-500">
                {loading ? 'Fetching recent operational activities...' : 'No recent operations recorded for this staff member'}
              </div>
            )}
          </div>
        </div>

        {/* Modal Close Button */}
        <button
          onClick={onClose}
          className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition border border-slate-700 shadow-lg"
        >
          Close Performance Telemetry
        </button>
      </div>
    </Modal>
  );
};
