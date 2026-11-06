import React, { useState, useEffect } from 'react';
import {
  Clock,
  UserCheck,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Play,
  Square,
  Users,
  Timer,
  FileSpreadsheet,
  Plus,
  X,
  Filter,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { attendanceApi, superAdminApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';

export const StaffAttendancePage: React.FC = () => {
  const { user, isSuperAdmin, isAdmin } = useAuth();
  const isManagerOrAdmin = isAdmin || isSuperAdmin || ['manager', 'owner', 'admin'].includes(user?.role?.name?.toLowerCase() || '');

  // Live Digital Clock
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // State
  const [loading, setLoading] = useState(true);
  const [myStatus, setMyStatus] = useState<any>(null);
  const [selectedShift, setSelectedShift] = useState('FULL_DAY');
  const [clockNotes, setClockNotes] = useState('');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Roster & Monthly
  const [activeTab, setActiveTab] = useState<'my_attendance' | 'roster' | 'monthly'>('my_attendance');
  const [todayRoster, setTodayRoster] = useState<any>(null);
  const [monthlyData, setMonthlyData] = useState<any>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  // Manual Mark Modal
  const [showManualModal, setShowManualModal] = useState(false);
  const [allStaff, setAllStaff] = useState<any[]>([]);
  const [manualForm, setManualForm] = useState({
    userId: '',
    date: new Date().toISOString().split('T')[0],
    status: 'PRESENT',
    shift: 'FULL_DAY',
    totalHours: 8,
    notes: 'Approved by Manager',
  });

  useEffect(() => {
    loadAttendanceData();
  }, [selectedMonth]);

  const loadAttendanceData = async () => {
    try {
      setLoading(true);
      // 1. My status
      const myRes = await attendanceApi.getMyStatus();
      setMyStatus(myRes.data || myRes);

      // 2. Today's Roster
      const rosterRes = await attendanceApi.getTodayRoster();
      setTodayRoster(rosterRes.data || rosterRes);

      // 3. Monthly Register
      const monthlyRes = await attendanceApi.getMonthly(selectedMonth);
      setMonthlyData(monthlyRes.data || monthlyRes);

      // 4. Staff list for manual mark (if manager)
      if (isManagerOrAdmin) {
        try {
          const rests = await superAdminApi.getRestaurants();
          const myRest = rests?.find((r: any) => r.id === (user as any)?.restaurantId) || rests?.[0];
          if (myRest) {
            const staff = await superAdminApi.getStaff(myRest.id);
            setAllStaff(Array.isArray(staff) ? staff : []);
          }
        } catch (e) {
          console.warn('Could not load staff list', e);
        }
      }
    } catch (err: any) {
      setActionError(err.response?.data?.message || err.message || 'Failed to load attendance');
    } finally {
      setLoading(false);
    }
  };

  const handleClockIn = async () => {
    try {
      setActionError(null);
      const res = await attendanceApi.clockIn(selectedShift, clockNotes || undefined);
      const data = res.data || res;
      setActionSuccess(data.message || 'Clocked in successfully!');
      setTimeout(() => setActionSuccess(null), 3500);
      loadAttendanceData();
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Clock-in failed');
    }
  };

  const handleClockOut = async () => {
    try {
      setActionError(null);
      const res = await attendanceApi.clockOut(clockNotes || undefined);
      const data = res.data || res;
      setActionSuccess(data.message || 'Clocked out successfully!');
      setTimeout(() => setActionSuccess(null), 3500);
      loadAttendanceData();
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Clock-out failed');
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionError(null);
      await attendanceApi.manualMark(manualForm);
      setActionSuccess('Attendance marked manually!');
      setShowManualModal(false);
      setTimeout(() => setActionSuccess(null), 3000);
      loadAttendanceData();
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Failed to record manual attendance');
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto font-sans text-slate-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-amber-400" />
            <span>Staff Attendance & Shift Management</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time biometric/digital shift clock-in, duty roster, and monthly attendance register.
          </p>
        </div>

        {/* Live Clock Card */}
        <div className="flex items-center gap-3">
          <div className="bg-slate-900 border border-slate-800 px-4 py-2 rounded-2xl flex items-center gap-2.5 shadow-lg">
            <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Live Time</div>
              <div className="text-sm font-black font-mono text-white">{currentTime}</div>
            </div>
          </div>

          {isManagerOrAdmin && (
            <button
              onClick={() => setShowManualModal(true)}
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Mark Attendance</span>
            </button>
          )}
        </div>
      </div>

      {/* Alerts */}
      {actionSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2 shadow-lg animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}
      {actionError && (
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2 shadow-lg animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('my_attendance')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
            activeTab === 'my_attendance'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>My Shift Clock</span>
        </button>

        <button
          onClick={() => setActiveTab('roster')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
            activeTab === 'roster'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Today's Shift Roster ({todayRoster?.activeCount || 0} Active)</span>
        </button>

        <button
          onClick={() => setActiveTab('monthly')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
            activeTab === 'monthly'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Monthly Register</span>
        </button>
      </div>

      {/* TAB 1: MY SHIFT CLOCK IN / OUT */}
      {activeTab === 'my_attendance' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Clock In / Out Action Box */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <Timer className="w-5 h-5 text-amber-400" />
                  <span>Your Duty Status</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Logged in as: <strong className="text-amber-400">{user?.name || user?.username}</strong> ({user?.role?.displayName || user?.role?.name})
                </p>
              </div>

              {/* Status Badge */}
              {myStatus?.isClockedIn ? (
                <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-black tracking-wide flex items-center gap-1.5 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  ON DUTY
                </span>
              ) : myStatus?.isClockedOut ? (
                <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 text-xs font-black tracking-wide">
                  SHIFT COMPLETED
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-xs font-bold">
                  NOT CLOCKED IN
                </span>
              )}
            </div>

            {/* Shift Details if clocked in */}
            {myStatus?.record && (
              <div className="bg-slate-950/70 rounded-2xl p-4 border border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Shift Type:</span>
                  <span className="text-white font-bold">{myStatus.record.shift}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Clock-In Time:</span>
                  <span className="text-emerald-400 font-mono font-bold">
                    {myStatus.record.clockIn ? new Date(myStatus.record.clockIn).toLocaleTimeString() : 'N/A'}
                  </span>
                </div>
                {myStatus.record.clockOut && (
                  <div className="flex justify-between text-slate-400">
                    <span>Clock-Out Time:</span>
                    <span className="text-amber-400 font-mono font-bold">
                      {new Date(myStatus.record.clockOut).toLocaleTimeString()}
                    </span>
                  </div>
                )}
                {myStatus.record.totalHours > 0 && (
                  <div className="flex justify-between text-slate-400 border-t border-slate-800 pt-1.5">
                    <span>Total Worked Hours:</span>
                    <span className="text-amber-400 font-bold text-sm">{myStatus.record.totalHours} hrs</span>
                  </div>
                )}
              </div>
            )}

            {/* Form Controls */}
            {!myStatus?.isClockedOut && (
              <div className="space-y-4">
                {!myStatus?.isClockedIn && (
                  <div>
                    <label className="text-[11px] uppercase font-bold text-slate-400 tracking-wider block mb-1.5">
                      Select Shift
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'MORNING', label: 'Morning (9A - 4P)' },
                        { id: 'EVENING', label: 'Evening (4P - 11P)' },
                        { id: 'FULL_DAY', label: 'Full Day' },
                      ].map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setSelectedShift(s.id)}
                          className={`py-2 px-1 text-center rounded-xl text-xs font-bold border transition ${
                            selectedShift === s.id
                              ? 'bg-amber-500 text-slate-950 border-amber-400 shadow'
                              : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-[11px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                    Work Notes (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Assigned to 1st Floor / Table G-01 to G-04"
                    value={clockNotes}
                    onChange={(e) => setClockNotes(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Big Action Button */}
                {!myStatus?.isClockedIn ? (
                  <button
                    onClick={handleClockIn}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-95 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20 transition"
                  >
                    <Play className="w-5 h-5 fill-slate-950" />
                    <span>Clock In for Today's Shift</span>
                  </button>
                ) : (
                  <button
                    onClick={handleClockOut}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-400 hover:to-amber-400 active:scale-95 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-rose-500/20 transition"
                  >
                    <Square className="w-5 h-5 fill-slate-950" />
                    <span>Clock Out & End Shift</span>
                  </button>
                )}
              </div>
            )}

            {myStatus?.isClockedOut && (
              <div className="text-center py-6 text-slate-400 space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <p className="text-sm font-bold text-white">Shift Ended for Today</p>
                <p className="text-xs">Your work hours have been recorded in the attendance register.</p>
              </div>
            )}
          </div>

          {/* Quick Shift Tips & Restaurant Summary */}
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-3 shadow-xl">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Petpooja-Style Shift Protocol</span>
              </h4>
              <ul className="text-xs text-slate-300 space-y-2 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                  <span><strong>Clock In:</strong> Start duty before 10:30 AM to avoid being marked late.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                  <span><strong>Live Order Sync:</strong> Orders placed during your active clock-in hours are tied to your staff profile.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                  <span><strong>Day Close EOD:</strong> Store Managers can only close daily sales registers after shift reconciliation.</span>
                </li>
              </ul>
            </div>

            {/* Quick Stats Widget */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                <span className="text-[10px] uppercase font-bold text-slate-400">Staff On Duty</span>
                <p className="text-2xl font-black text-emerald-400 mt-1">
                  {todayRoster?.activeCount || 0} / {todayRoster?.totalStaff || 0}
                </p>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                <span className="text-[10px] uppercase font-bold text-slate-400">Completed Shifts</span>
                <p className="text-2xl font-black text-indigo-400 mt-1">
                  {todayRoster?.completedCount || 0}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TODAY'S LIVE ACTIVE FLOOR ROSTER */}
      {activeTab === 'roster' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-400" />
                <span>Today's Active Floor Roster</span>
              </h3>
              <p className="text-xs text-slate-400">
                Live visibility into which staff members are currently clocked in and working on floor/kitchen.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-bold">
                {todayRoster?.activeCount || 0} Active Staff
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-3">Staff Member</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Duty Status</th>
                  <th className="p-3">Shift</th>
                  <th className="p-3">Clock In</th>
                  <th className="p-3">Clock Out</th>
                  <th className="p-3 text-right">Work Hours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {todayRoster?.roster?.map((r: any) => (
                  <tr key={r.userId} className="hover:bg-slate-800/40 transition">
                    <td className="p-3 font-bold text-white flex items-center gap-2">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          r.isClockedIn ? 'bg-emerald-400 animate-pulse' : r.clockOutTime ? 'bg-indigo-400' : 'bg-slate-600'
                        }`}
                      />
                      <span>{r.name}</span>
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-semibold border border-slate-700 text-[11px]">
                        {r.role}
                      </span>
                    </td>
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
                    <td className="p-3 font-mono text-amber-400">
                      {r.clockOutTime ? new Date(r.clockOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
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
      )}

      {/* TAB 3: MONTHLY REGISTER & SUMMARY */}
      {activeTab === 'monthly' && (
        <div className="space-y-4">
          {/* Summary Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <span className="text-[10px] uppercase font-bold text-slate-400">Total Present Days</span>
              <p className="text-2xl font-black text-emerald-400 mt-1">{monthlyData?.summary?.totalPresent || 0}</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <span className="text-[10px] uppercase font-bold text-slate-400">Late Check-Ins</span>
              <p className="text-2xl font-black text-amber-400 mt-1">{monthlyData?.summary?.totalLate || 0}</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <span className="text-[10px] uppercase font-bold text-slate-400">Half Days</span>
              <p className="text-2xl font-black text-rose-400 mt-1">{monthlyData?.summary?.totalHalfDay || 0}</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <span className="text-[10px] uppercase font-bold text-slate-400">Total Staff Hours</span>
              <p className="text-2xl font-black text-sky-400 mt-1">{monthlyData?.summary?.totalHours || 0} hrs</p>
            </div>
          </div>

          {/* Records Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-amber-400" />
                  <span>Monthly Attendance Register</span>
                </h3>
                <p className="text-xs text-slate-400">Complete shift records for all restaurant staff.</p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-3 py-1.5 text-xs rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {monthlyData?.records?.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Calendar className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                <p className="text-sm">No attendance records for {selectedMonth}.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="p-3">Date</th>
                      <th className="p-3">Staff Name</th>
                      <th className="p-3">Role</th>
                      <th className="p-3">Shift</th>
                      <th className="p-3">Clock In</th>
                      <th className="p-3">Clock Out</th>
                      <th className="p-3">Total Hours</th>
                      <th className="p-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-200">
                    {monthlyData?.records?.map((rec: any) => (
                      <tr key={rec.id} className="hover:bg-slate-800/40 transition">
                        <td className="p-3 font-mono font-bold text-white">{rec.date}</td>
                        <td className="p-3 font-bold text-white">{rec.user?.name || rec.user?.username}</td>
                        <td className="p-3 text-slate-400">{rec.user?.role?.displayName || rec.user?.role?.name}</td>
                        <td className="p-3 text-slate-400">{rec.shift}</td>
                        <td className="p-3 font-mono text-emerald-400">
                          {rec.clockIn ? new Date(rec.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                        <td className="p-3 font-mono text-amber-400">
                          {rec.clockOut ? new Date(rec.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                        <td className="p-3 font-bold text-white">{rec.totalHours || 0} hrs</td>
                        <td className="p-3 text-right">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              rec.status === 'PRESENT'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : rec.status === 'LATE'
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : rec.status === 'HALF_DAY'
                                ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {rec.status}
                          </span>
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

      {/* MANUAL MARK MODAL (Manager Only) */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 relative shadow-2xl space-y-4">
            <button
              onClick={() => setShowManualModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-extrabold text-white">Manager Attendance Override</h3>
            </div>
            <p className="text-xs text-slate-400">
              Record or adjust attendance manually for a staff member.
            </p>

            <form onSubmit={handleManualSubmit} className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Select Staff Member *
                </label>
                <select
                  required
                  value={manualForm.userId}
                  onChange={(e) => setManualForm({ ...manualForm, userId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="">Select staff...</option>
                  {allStaff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name || s.username} ({s.role?.displayName || s.role?.name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={manualForm.date}
                    onChange={(e) => setManualForm({ ...manualForm, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Status *</label>
                  <select
                    value={manualForm.status}
                    onChange={(e) => setManualForm({ ...manualForm, status: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="PRESENT">PRESENT</option>
                    <option value="LATE">LATE</option>
                    <option value="HALF_DAY">HALF DAY</option>
                    <option value="ABSENT">ABSENT</option>
                    <option value="ON_LEAVE">ON LEAVE</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Shift</label>
                  <select
                    value={manualForm.shift}
                    onChange={(e) => setManualForm({ ...manualForm, shift: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="FULL_DAY">Full Day</option>
                    <option value="MORNING">Morning Shift</option>
                    <option value="EVENING">Evening Shift</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Work Hours</label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="16"
                    value={manualForm.totalHours}
                    onChange={(e) => setManualForm({ ...manualForm, totalHours: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Notes / Reason</label>
                <input
                  type="text"
                  value={manualForm.notes}
                  onChange={(e) => setManualForm({ ...manualForm, notes: e.target.value })}
                  placeholder="e.g. Biometric device offline, confirmed by store manager"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow"
                >
                  Save Attendance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
