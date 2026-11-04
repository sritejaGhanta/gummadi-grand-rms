import React, { useState, useEffect, useMemo } from 'react';
import { usersApi, rolesApi, reportsApi } from '../api/endpoints';
import { useSettings } from '../context/SettingsContext';
import { Modal } from '../components/Modal';
import { StaffTelemetryModal } from '../components/StaffTelemetryModal';
import {
  Users,
  Search,
  Filter,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  ShieldCheck,
  Check,
  X,
  ChefHat,
  Receipt,
  Smartphone,
  Lock,
  Calendar,
  Sparkles,
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

export const UsersManagementPage: React.FC = () => {
  const { currency } = useSettings();
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'DISABLED'>('ALL');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);

  // Performance Telemetry Modal
  const [showTelemetryModal, setShowTelemetryModal] = useState(false);
  const [selectedTelemetryUser, setSelectedTelemetryUser] = useState<any | null>(null);
  const [userTelemetryDetails, setUserTelemetryDetails] = useState<any | null>(null);
  const [telemetryLoading, setTelemetryLoading] = useState(false);

  // Form states - Add
  const [addName, setAddName] = useState('');
  const [addUsername, setAddUsername] = useState('');
  const [addPassword, setAddPassword] = useState('');
  const [addRoleId, setAddRoleId] = useState('');

  // Form states - Edit
  const [editName, setEditName] = useState('');
  const [editRoleId, setEditRoleId] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);

  // Alerts
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [uList, rList] = await Promise.all([usersApi.getUsers(), rolesApi.getRoles()]);
      setUsers(uList || []);
      setRoles(rList || []);
      if (rList?.length > 0 && !addRoleId) {
        setAddRoleId(rList[0].id);
      }
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || 'Failed to load staff users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setErrorMsg(null);
      await usersApi.createUser({
        name: addName,
        username: addUsername.toLowerCase().trim(),
        password: addPassword,
        roleId: addRoleId,
      });
      setShowAddModal(false);
      setAddName('');
      setAddUsername('');
      setAddPassword('');
      setSuccessMsg(`Staff account @${addUsername} created successfully!`);
      setTimeout(() => setSuccessMsg(null), 3500);
      loadData();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to create user');
    }
  };

  const openEditModal = (u: any) => {
    setEditingUser(u);
    setEditName(u.name || '');
    setEditRoleId(u.roleId || (u.role ? u.role.id : ''));
    setEditPassword('');
    setEditIsActive(u.isActive ?? true);
    setShowEditModal(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      setErrorMsg(null);
      const payload: any = {
        name: editName,
        roleId: editRoleId,
        isActive: editIsActive,
      };
      if (editPassword.trim()) {
        payload.password = editPassword.trim();
      }
      await usersApi.updateUser(editingUser.id, payload);
      setShowEditModal(false);
      setEditingUser(null);
      setSuccessMsg(`User @${editingUser.username} updated successfully!`);
      setTimeout(() => setSuccessMsg(null), 3500);
      loadData();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to update user');
    }
  };

  const handleDeleteUser = async (u: any) => {
    if (u.username === 'admin') {
      alert('Master admin account cannot be deleted!');
      return;
    }
    if (!window.confirm(`Are you sure you want to permanently delete user @${u.username} (${u.name})?`)) {
      return;
    }
    try {
      setErrorMsg(null);
      await usersApi.deleteUser(u.id);
      setSuccessMsg(`User @${u.username} was permanently deleted.`);
      setTimeout(() => setSuccessMsg(null), 3500);
      loadData();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to delete user');
    }
  };

  const handleToggleStatus = async (u: any) => {
    try {
      await usersApi.toggleStatus(u.id);
      setSuccessMsg(`Status updated for @${u.username}`);
      setTimeout(() => setSuccessMsg(null), 2500);
      loadData();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message);
    }
  };

  const openTelemetry = (u: any) => {
    setSelectedTelemetryUser(u);
    setShowTelemetryModal(true);
  };

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Search by name or username
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = u.name?.toLowerCase().includes(q);
        const matchUser = u.username?.toLowerCase().includes(q);
        if (!matchName && !matchUser) return false;
      }
      // Role filter
      if (selectedRoleFilter !== 'ALL') {
        const roleName = (u.role?.name || '').toLowerCase();
        if (roleName !== selectedRoleFilter.toLowerCase()) return false;
      }
      // Status filter
      if (statusFilter === 'ACTIVE' && !u.isActive) return false;
      if (statusFilter === 'DISABLED' && u.isActive) return false;

      return true;
    });
  }, [users, search, selectedRoleFilter, statusFilter]);

  // Quick stats
  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.isActive).length;
  const chefCount = users.filter((u) => u.role?.name?.toLowerCase() === 'chef').length;
  const waiterCount = users.filter((u) => ['staff', 'waiter'].includes(u.role?.name?.toLowerCase())).length;
  const managerCount = users.filter((u) => u.role?.name?.toLowerCase() === 'manager').length;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-full">
      {/* Toast Alerts */}
      {successMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2 shadow-lg animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-3.5 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-bold flex items-center gap-2 shadow-lg animate-fadeIn">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="glass-panel p-5 sm:p-6 rounded-3xl border border-slate-800 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
            <Users className="w-4 h-4" />
            <span>Staff Administration & Directory</span>
          </span>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white mt-1">
            Users Management & Performance Telemetry
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Provision staff accounts, edit user roles & credentials, and view individual operational flow charts and trend telemetry.
          </p>
        </div>

        <button
          onClick={() => {
            setErrorMsg(null);
            setShowAddModal(true);
          }}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs flex items-center gap-2 transition shadow-lg shadow-amber-500/25 self-start md:self-auto shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add New Staff User</span>
        </button>
      </div>

      {/* Metric Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-[10px] uppercase font-bold text-slate-400">Total Users</span>
          <div className="text-2xl font-black text-white mt-0.5">{totalUsers}</div>
          <span className="text-[10px] text-emerald-400">{activeUsers} Active</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-[10px] uppercase font-bold text-slate-400">Kitchen Chefs</span>
          <div className="text-2xl font-black text-rose-400 mt-0.5">{chefCount}</div>
          <span className="text-[10px] text-slate-500">Culinary cooks</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-[10px] uppercase font-bold text-slate-400">Waiters / Staff</span>
          <div className="text-2xl font-black text-blue-400 mt-0.5">{waiterCount}</div>
          <span className="text-[10px] text-slate-500">Dining service</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-[10px] uppercase font-bold text-slate-400">Managers / Cashiers</span>
          <div className="text-2xl font-black text-purple-400 mt-0.5">{managerCount}</div>
          <span className="text-[10px] text-slate-500">Billing operations</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 col-span-2 sm:col-span-1">
          <span className="text-[10px] uppercase font-bold text-slate-400">Security Mode</span>
          <div className="text-sm font-black text-emerald-400 mt-2 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4" />
            <span>LAN Role RBAC</span>
          </div>
          <span className="text-[10px] text-slate-500">JWT Protected</span>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or @username..."
            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 text-xs"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Role selector */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800">
            <button
              onClick={() => setSelectedRoleFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                selectedRoleFilter === 'ALL'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All Roles
            </button>
            <button
              onClick={() => setSelectedRoleFilter('chef')}
              className={`px-2.5 py-1.5 rounded-lg font-bold transition ${
                selectedRoleFilter === 'chef'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Chefs
            </button>
            <button
              onClick={() => setSelectedRoleFilter('staff')}
              className={`px-2.5 py-1.5 rounded-lg font-bold transition ${
                selectedRoleFilter === 'staff'
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Waiters
            </button>
            <button
              onClick={() => setSelectedRoleFilter('manager')}
              className={`px-2.5 py-1.5 rounded-lg font-bold transition ${
                selectedRoleFilter === 'manager'
                  ? 'bg-purple-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Managers
            </button>
            <button
              onClick={() => setSelectedRoleFilter('admin')}
              className={`px-2.5 py-1.5 rounded-lg font-bold transition ${
                selectedRoleFilter === 'admin'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Admins
            </button>
          </div>

          {/* Status selector */}
          <select
            value={statusFilter}
            onChange={(e: any) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 font-semibold focus:outline-none focus:border-amber-500 cursor-pointer text-xs"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active Only</option>
            <option value="DISABLED">Disabled Only</option>
          </select>
        </div>
      </div>

      {/* Users Directory Table */}
      <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-3.5 px-4">Staff Member</th>
                <th className="py-3.5 px-3">Username</th>
                <th className="py-3.5 px-3">Assigned Role</th>
                <th className="py-3.5 text-center px-3">Account Status</th>
                <th className="py-3.5 text-right px-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500 text-xs">
                    No staff users found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const roleName = (u.role?.name || '').toLowerCase();
                  return (
                    <tr key={u.id} className="hover:bg-slate-800/30 transition group">
                      {/* Name & Avatar */}
                      <td className="py-3.5 px-4 font-bold text-white flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 border ${
                            roleName === 'chef'
                              ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                              : roleName === 'manager'
                              ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                              : roleName === 'staff' || roleName === 'waiter'
                              ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                              : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                          }`}
                        >
                          {u.name ? u.name[0] : 'U'}
                        </div>
                        <div>
                          <div className="font-extrabold text-white text-sm">{u.name}</div>
                          <div className="text-[11px] text-slate-400 font-normal">
                            Joined {new Date(u.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </td>

                      {/* Username */}
                      <td className="py-3.5 px-3 text-slate-300 font-mono font-semibold">
                        @{u.username}
                      </td>

                      {/* Role */}
                      <td className="py-3.5 px-3">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${
                            roleName === 'chef'
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                              : roleName === 'manager'
                              ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                              : roleName === 'staff' || roleName === 'waiter'
                              ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}
                        >
                          {u.role?.displayName || u.role?.name || 'Staff'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3 text-center">
                        <button
                          onClick={() => handleToggleStatus(u)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition flex items-center gap-1 mx-auto ${
                            u.isActive
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20'
                          }`}
                          title="Click to toggle status"
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              u.isActive ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                            }`}
                          ></span>
                          <span>{u.isActive ? 'Active' : 'Disabled'}</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View Telemetry / Flow Charts Button */}
                          <button
                            onClick={() => openTelemetry(u)}
                            className="px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold flex items-center gap-1 transition"
                            title="View Performance Flow Charts & Telemetry"
                          >
                            <BarChart3 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Telemetry</span>
                          </button>

                          {/* Edit User Button */}
                          <button
                            onClick={() => openEditModal(u)}
                            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
                            title="Edit User Details & Password"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete User Button */}
                          {u.username !== 'admin' && (
                            <button
                              onClick={() => handleDeleteUser(u)}
                              className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/30 transition"
                              title="Delete User Account"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 📊 MODAL 1: USER DEEP PERFORMANCE & FLOW CHARTS TELEMETRY      */}
      {/* ============================================================== */}
      <StaffTelemetryModal
        isOpen={showTelemetryModal}
        onClose={() => {
          setShowTelemetryModal(false);
          setSelectedTelemetryUser(null);
        }}
        staffUser={selectedTelemetryUser}
      />

      {/* ============================================================== */}
      {/* ➕ MODAL 2: ADD NEW USER                                       */}
      {/* ============================================================== */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Provision New Staff User" maxWidth="md">
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Full Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Ramesh Kumar"
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Username (for Login)</label>
            <input
              type="text"
              required
              placeholder="e.g. ramesh_waiter"
              value={addUsername}
              onChange={(e) => setAddUsername(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Initial Password</label>
            <input
              type="password"
              required
              placeholder="Enter secure password"
              value={addPassword}
              onChange={(e) => setAddPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Assign Role</label>
            <select
              value={addRoleId}
              onChange={(e) => setAddRoleId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
            >
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.displayName || r.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-xl transition"
          >
            Create Staff Account
          </button>
        </form>
      </Modal>

      {/* ============================================================== */}
      {/* ✏️ MODAL 3: EDIT USER DETAILS & PASSWORD RESET                 */}
      {/* ============================================================== */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title={`Edit User @${editingUser?.username}`} maxWidth="md">
        <form onSubmit={handleUpdateUser} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Full Name</label>
            <input
              type="text"
              required
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Assigned Role</label>
            <select
              value={editRoleId}
              onChange={(e) => setEditRoleId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
            >
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.displayName || r.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
              Reset Password (leave empty to keep current)
            </label>
            <input
              type="password"
              placeholder="Enter new password to reset"
              value={editPassword}
              onChange={(e) => setEditPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700">
            <div>
              <div className="text-xs font-bold text-white">Account Status</div>
              <div className="text-[10px] text-slate-400">Enable or disable login access</div>
            </div>
            <button
              type="button"
              onClick={() => setEditIsActive(!editIsActive)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                editIsActive
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              }`}
            >
              {editIsActive ? 'Active' : 'Disabled'}
            </button>
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-lg transition"
          >
            Save Changes
          </button>
        </form>
      </Modal>
    </div>
  );
};
