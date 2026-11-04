import React, { useState, useEffect } from 'react';
import { rolesApi, usersApi } from '../api/endpoints';
import {
  ShieldCheck,
  Plus,
  Trash2,
  Edit2,
  Users,
  Save,
  CheckCircle,
  AlertCircle,
  CheckSquare,
  Square,
  Lock,
} from 'lucide-react';
import { Modal } from '../components/Modal';

export const RoleManagementPage: React.FC = () => {
  const [roles, setRoles] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedRole, setSelectedRole] = useState<any | null>(null);
  const [selectedPermIds, setSelectedPermIds] = useState<string[]>([]);

  // Create role modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDisplay, setNewRoleDisplay] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');

  // Edit role modal
  const [showEditRoleModal, setShowEditRoleModal] = useState(false);
  const [editRoleId, setEditRoleId] = useState('');
  const [editRoleDisplay, setEditRoleDisplay] = useState('');
  const [editRoleDesc, setEditRoleDesc] = useState('');

  // Create user modal
  const [showUserModal, setShowUserModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [newUserRoleId, setNewUserRoleId] = useState('');

  // Edit user modal
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [editUserId, setEditUserId] = useState('');
  const [editUserName, setEditUserName] = useState('');
  const [editUserUsername, setEditUserUsername] = useState('');
  const [editUserRoleId, setEditUserRoleId] = useState('');
  const [editUserPassword, setEditUserPassword] = useState('');
  const [editUserActive, setEditUserActive] = useState(true);

  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [rList, pList, uList] = await Promise.all([
        rolesApi.getRoles(),
        rolesApi.getPermissions(),
        usersApi.getUsers(),
      ]);
      setRoles(rList);
      setPermissions(pList);
      setUsers(uList);
      if (rList.length > 0) {
        const found = rList.find((r: any) => r.id === selectedRole?.id);
        if (found) {
          selectRole(found);
        } else {
          selectRole(rList[0]);
        }
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to load roles and users');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectRole = (role: any) => {
    setSelectedRole(role);
    const assignedIds = role.rolePermissions?.map((rp: any) => rp.permissionId) || [];
    setSelectedPermIds(assignedIds);
  };

  const togglePermission = (permId: string) => {
    setSelectedPermIds((prev) =>
      prev.includes(permId) ? prev.filter((id) => id !== permId) : [...prev, permId],
    );
  };

  const handleSavePermissions = async () => {
    if (!selectedRole) return;
    try {
      const updated = await rolesApi.updateRole(selectedRole.id, {
        permissionIds: selectedPermIds,
      });
      setSelectedRole(updated);
      setSuccessMsg(`Permissions saved for role "${selectedRole.displayName}"!`);
      setTimeout(() => setSuccessMsg(null), 3500);
      loadData();
    } catch (e: any) {
      setErrorMsg(e.response?.data?.message || e.message || 'Failed to save permissions');
    }
  };

  // Role CRUD
  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await rolesApi.createRole({
        name: newRoleName,
        displayName: newRoleDisplay,
        description: newRoleDesc,
      });
      setShowCreateModal(false);
      setNewRoleName('');
      setNewRoleDisplay('');
      setNewRoleDesc('');
      setSuccessMsg('Role created successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);
      loadData();
    } catch (e: any) {
      setErrorMsg(e.response?.data?.message || e.message || 'Failed to create role');
    }
  };

  const openEditRole = (role: any) => {
    setEditRoleId(role.id);
    setEditRoleDisplay(role.displayName || role.name);
    setEditRoleDesc(role.description || '');
    setShowEditRoleModal(true);
  };

  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await rolesApi.updateRole(editRoleId, {
        displayName: editRoleDisplay,
        description: editRoleDesc,
      });
      setShowEditRoleModal(false);
      setSuccessMsg(`Role "${editRoleDisplay}" updated!`);
      setTimeout(() => setSuccessMsg(null), 3000);
      loadData();
    } catch (e: any) {
      setErrorMsg(e.response?.data?.message || e.message || 'Failed to update role');
    }
  };

  const handleDeleteRole = async (role: any) => {
    if (role.isSystem) {
      alert(`Cannot delete system-protected role "${role.displayName}".`);
      return;
    }
    if (!confirm(`Are you sure you want to delete role "${role.displayName}"?`)) {
      return;
    }
    try {
      await rolesApi.deleteRole(role.id);
      setSuccessMsg(`Role "${role.displayName}" deleted!`);
      setTimeout(() => setSuccessMsg(null), 3000);
      loadData();
    } catch (e: any) {
      setErrorMsg(e.response?.data?.message || e.message || 'Failed to delete role');
    }
  };

  // User CRUD
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await usersApi.createUser({
        username: newUsername,
        password: newPassword,
        name: newName,
        roleId: newUserRoleId,
      });
      setShowUserModal(false);
      setNewUsername('');
      setNewPassword('');
      setNewName('');
      setSuccessMsg('New staff account created successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);
      loadData();
    } catch (e: any) {
      setErrorMsg(e.response?.data?.message || e.message || 'Failed to create user');
    }
  };

  const openEditUser = (user: any) => {
    setEditUserId(user.id);
    setEditUserName(user.name);
    setEditUserUsername(user.username);
    setEditUserRoleId(user.roleId || user.role?.id);
    setEditUserActive(user.isActive);
    setEditUserPassword('');
    setShowEditUserModal(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        name: editUserName,
        roleId: editUserRoleId,
        isActive: editUserActive,
      };
      if (editUserPassword) {
        payload.password = editUserPassword;
      }
      await usersApi.updateUser(editUserId, payload);
      setShowEditUserModal(false);
      setSuccessMsg(`User "@${editUserUsername}" updated successfully!`);
      setTimeout(() => setSuccessMsg(null), 3000);
      loadData();
    } catch (e: any) {
      setErrorMsg(e.response?.data?.message || e.message || 'Failed to update user');
    }
  };

  const handleDeleteUser = async (user: any) => {
    if (user.username === 'admin') {
      alert('Cannot delete master administrator account.');
      return;
    }
    if (!confirm(`Are you sure you want to delete user account "${user.name}" (@${user.username})?`)) {
      return;
    }
    try {
      await usersApi.deleteUser(user.id);
      setSuccessMsg(`User account "${user.name}" removed!`);
      setTimeout(() => setSuccessMsg(null), 3000);
      loadData();
    } catch (e: any) {
      setErrorMsg(e.response?.data?.message || e.message || 'Failed to delete user');
    }
  };

  // Group permissions by module
  const permsByModule: Record<string, any[]> = {};
  permissions.forEach((p) => {
    if (!permsByModule[p.module]) permsByModule[p.module] = [];
    permsByModule[p.module].push(p);
  });

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-3">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <ShieldCheck className="w-6 h-6" />
            </span>
            <span>Dynamic Role & Permission Management</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Complete CRUD: Edit and Delete custom roles, configure granular permissions, and manage staff accounts
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Role</span>
          </button>
          <button
            onClick={() => {
              if (roles.length > 0) setNewUserRoleId(roles[0].id);
              setShowUserModal(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition"
          >
            <Users className="w-4 h-4" />
            <span>Add User</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-xs font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Main Grid: Roles List (Left) and Permission Matrix (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Roles List */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-white uppercase tracking-wider">
              Restaurant Roles
            </h3>
            <span className="text-xs text-slate-400">{roles.length} Roles</span>
          </div>

          <div className="space-y-2">
            {roles.map((r) => {
              const isSelected = selectedRole?.id === r.id;
              return (
                <div
                  key={r.id}
                  onClick={() => selectRole(r)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition relative group ${
                    isSelected
                      ? 'border-amber-500 bg-amber-500/10 text-white shadow-md shadow-amber-500/10'
                      : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm">{r.displayName}</span>
                    <div className="flex items-center gap-1.5">
                      {r.isSystem ? (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" />
                          <span>System</span>
                        </span>
                      ) : (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditRole(r);
                            }}
                            className="p-1 text-slate-400 hover:text-amber-400 transition"
                            title="Edit Role"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteRole(r);
                            }}
                            className="p-1 text-slate-400 hover:text-rose-400 transition"
                            title="Delete Role"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-1">{r.description || 'System access role'}</p>
                </div>
              );
            })}
          </div>

          {/* Assigned Users in Selected Role */}
          {selectedRole && (
            <div className="pt-4 border-t border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Staff in "{selectedRole.displayName}" ({users.filter((u) => u.role?.id === selectedRole.id).length})
                </h4>
                {!selectedRole.isSystem && (
                  <button
                    onClick={() => openEditRole(selectedRole)}
                    className="text-xs text-amber-400 hover:underline flex items-center gap-1"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>Edit Role</span>
                  </button>
                )}
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {users
                  .filter((u) => u.role?.id === selectedRole.id)
                  .map((u) => (
                    <div
                      key={u.id}
                      className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 text-xs flex justify-between items-center"
                    >
                      <span className="font-semibold text-white">{u.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono">@{u.username}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Permission Checkbox Matrix */}
        <div className="lg:col-span-2 glass-panel p-5 rounded-2xl border border-slate-800 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div>
              <h3 className="font-bold text-lg text-white">
                Permissions for "{selectedRole?.displayName || 'Role'}"
              </h3>
              <p className="text-xs text-slate-400">
                Check or uncheck individual capabilities. Changes apply immediately upon saving.
              </p>
            </div>

            <button
              onClick={handleSavePermissions}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition self-start sm:self-auto"
            >
              <Save className="w-4 h-4" />
              <span>Save Permissions</span>
            </button>
          </div>

          <div className="space-y-6 max-h-[550px] overflow-y-auto pr-2 custom-scrollbar">
            {Object.entries(permsByModule).map(([moduleName, pList]) => (
              <div key={moduleName} className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 border-b border-slate-800/80 pb-1">
                  Module: {moduleName}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {pList.map((p) => {
                    const isChecked = selectedPermIds.includes(p.id);
                    return (
                      <div
                        key={p.id}
                        onClick={() => togglePermission(p.id)}
                        className={`p-3 rounded-xl border cursor-pointer flex items-start gap-3 transition ${
                          isChecked
                            ? 'border-amber-500/40 bg-amber-500/5 text-white'
                            : 'border-slate-800 bg-slate-900/50 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="mt-0.5">
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-amber-500" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-600" />
                          )}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white font-mono">{p.key}</div>
                          <div className="text-[11px] text-slate-400 leading-tight mt-0.5">
                            {p.description}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Staff Accounts Directory with Edit & Delete */}
      <div className="glass-panel p-5 sm:p-6 rounded-3xl border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-base font-extrabold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-500" />
              <span>Staff Accounts & User Provisioning Directory</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Manage credentials, roles, active status, edit profile details, and delete staff accounts
            </p>
          </div>
          <button
            onClick={() => {
              if (roles.length > 0) setNewUserRoleId(roles[0].id);
              setShowUserModal(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add New User</span>
          </button>
        </div>

        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <table className="w-full text-xs text-left min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                <th className="py-2.5 px-3">Staff Name</th>
                <th className="py-2.5 px-3">Username</th>
                <th className="py-2.5 px-3">Role</th>
                <th className="py-2.5 text-center px-3">Status</th>
                <th className="py-2.5 text-right px-3">Account Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-800/30 transition">
                  <td className="py-3 px-3 font-bold text-white flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center font-bold text-xs">
                      {u.name ? u.name[0] : 'U'}
                    </div>
                    <span>{u.name}</span>
                  </td>
                  <td className="py-3 px-3 text-slate-300 font-mono">@{u.username}</td>
                  <td className="py-3 px-3">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-800 border border-slate-700 text-amber-400">
                      {u.role?.displayName || u.role?.name || 'Staff'}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        u.isActive
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {u.isActive ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => openEditUser(u)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold flex items-center gap-1 transition"
                        title="Edit User"
                      >
                        <Edit2 className="w-3 h-3 text-amber-400" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleDeleteUser(u)}
                        disabled={u.username === 'admin'}
                        className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-semibold flex items-center gap-1 transition disabled:opacity-40"
                        title={u.username === 'admin' ? 'Master Admin Protected' : 'Delete User'}
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 1. Create Role Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create New Role">
        <form onSubmit={handleCreateRole} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
              Role Key (identifier)
            </label>
            <input
              type="text"
              required
              placeholder="e.g. sommelier, supervisor"
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
              Display Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Master Sommelier"
              value={newRoleDisplay}
              onChange={(e) => setNewRoleDisplay(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
              Role Description
            </label>
            <input
              type="text"
              placeholder="e.g. Wine cellaring and beverage orders"
              value={newRoleDesc}
              onChange={(e) => setNewRoleDesc(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
            />
          </div>
          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg transition"
          >
            Create Role
          </button>
        </form>
      </Modal>

      {/* 2. Edit Role Modal */}
      <Modal isOpen={showEditRoleModal} onClose={() => setShowEditRoleModal(false)} title="Edit Role">
        <form onSubmit={handleUpdateRole} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
              Display Name
            </label>
            <input
              type="text"
              required
              value={editRoleDisplay}
              onChange={(e) => setEditRoleDisplay(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
              Role Description
            </label>
            <input
              type="text"
              value={editRoleDesc}
              onChange={(e) => setEditRoleDesc(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg transition"
            >
              Update Role
            </button>
            <button
              type="button"
              onClick={() => {
                const r = roles.find((role) => role.id === editRoleId);
                if (r) {
                  setShowEditRoleModal(false);
                  handleDeleteRole(r);
                }
              }}
              className="px-4 py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 font-bold text-xs border border-rose-500/30 transition"
            >
              Delete
            </button>
          </div>
        </form>
      </Modal>

      {/* 3. Add User Modal */}
      <Modal isOpen={showUserModal} onClose={() => setShowUserModal(false)} title="Create Staff Account">
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
              Full Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Rajesh Kumar"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                Username
              </label>
              <input
                type="text"
                required
                placeholder="rajesh_chef"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                Role
              </label>
              <select
                value={newUserRoleId}
                onChange={(e) => setNewUserRoleId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.displayName}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
              Initial Password
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
            />
          </div>
          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg transition"
          >
            Create Staff Account
          </button>
        </form>
      </Modal>

      {/* 4. Edit User Modal */}
      <Modal isOpen={showEditUserModal} onClose={() => setShowEditUserModal(false)} title={`Edit Staff: @${editUserUsername}`}>
        <form onSubmit={handleUpdateUser} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
              Full Name
            </label>
            <input
              type="text"
              required
              value={editUserName}
              onChange={(e) => setEditUserName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                Role
              </label>
              <select
                value={editUserRoleId}
                onChange={(e) => setEditUserRoleId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.displayName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                Account Status
              </label>
              <select
                value={editUserActive ? 'true' : 'false'}
                onChange={(e) => setEditUserActive(e.target.value === 'true')}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
              >
                <option value="true">Active</option>
                <option value="false">Disabled / Suspended</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
              Reset Password (leave empty to keep unchanged)
            </label>
            <input
              type="password"
              placeholder="Enter new password or leave blank"
              value={editUserPassword}
              onChange={(e) => setEditUserPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg transition"
            >
              Update Staff User
            </button>
            <button
              type="button"
              disabled={editUserUsername === 'admin'}
              onClick={() => {
                const u = users.find((usr) => usr.id === editUserId);
                if (u) {
                  setShowEditUserModal(false);
                  handleDeleteUser(u);
                }
              }}
              className="px-4 py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 font-bold text-xs border border-rose-500/30 transition disabled:opacity-40"
            >
              Delete
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
