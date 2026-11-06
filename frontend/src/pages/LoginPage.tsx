import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { UtensilsCrossed, Lock, User, Sparkles, Shield, ChefHat, Smartphone, Receipt, Globe, Store } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('superadmin');
  const [password, setPassword] = useState('superadmin123');
  const [error, setError] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);
  const { login, loading } = useAuth();
  const { restaurantName, logoUrl } = useSettings();
  const navigate = useNavigate();

  React.useEffect(() => {
    setImgError(false);
  }, [logoUrl]);

  const getDefaultRouteForUser = (userObj: any) => {
    const role = userObj?.role?.name?.toLowerCase();
    if (role === 'superadmin' || userObj?.username === 'superadmin') return '/super-admin';
    if (role === 'owner') return '/owner-dashboard';
    if (role === 'manager') return '/owner-dashboard';
    if (role === 'chef') return '/kitchen';
    if (role === 'admin') return '/admin';
    return '/pos';
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const loggedInUser = await login({ username, password });
      const targetPath = getDefaultRouteForUser(loggedInUser);
      navigate(targetPath);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    }
  };

  const quickLogin = async (u: string, p: string, defaultPath: string) => {
    setUsername(u);
    setPassword(p);
    setError(null);
    try {
      await login({ username: u, password: p });
      navigate(defaultPath);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          {logoUrl && !imgError ? (
            <div className="inline-flex w-16 h-16 rounded-2xl bg-slate-900 border border-slate-700/80 items-center justify-center p-2 shadow-2xl shadow-amber-500/20 mb-4">
              <img
                src={logoUrl}
                alt={restaurantName}
                className="w-full h-full object-contain"
                onError={() => setImgError(true)}
              />
            </div>
          ) : (
            <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-400 items-center justify-center text-slate-950 font-bold shadow-2xl shadow-amber-500/30 mb-4 animate-pulse-glow">
              <UtensilsCrossed className="w-8 h-8" />
            </div>
          )}
          <h2 className="text-3xl font-extrabold text-white tracking-tight">{restaurantName}</h2>
          <p className="text-sm text-slate-400 mt-1">Enterprise Restaurant Management System</p>
        </div>

        {/* Card */}
        <div className="glass-panel p-8 rounded-3xl border border-slate-800 shadow-2xl space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <h3 className="font-bold text-white text-base">Intranet Staff Login</h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              LAN 0-LATENCY
            </span>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Username
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500 transition"
                  placeholder="Enter staff username"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500 transition"
                  placeholder="Enter password"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/25 transition disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Sign In to Restaurant System'}
            </button>
          </form>

          {/* Quick Role Selectors for testing */}
          <div className="pt-4 border-t border-slate-800">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 text-center">
              Instant 1-Click Role Logins (Petpooja SaaS Hierarchy):
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => quickLogin('superadmin', 'superadmin123', '/super-admin')}
                className="col-span-2 flex items-center justify-between p-2.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-indigo-500/20 hover:from-amber-500/30 hover:to-indigo-500/30 border border-amber-500/30 text-xs font-medium text-amber-200 transition text-left"
              >
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-amber-400 shrink-0" />
                  <div>
                    <div className="font-bold flex items-center gap-1.5 text-white">
                      Super Admin <span className="text-[10px] bg-amber-500 text-slate-950 font-black px-1.5 py-0.2 rounded">YOU</span>
                    </div>
                    <div className="text-[10px] text-slate-400">superadmin / superadmin123 (SaaS Multi-Tenant MRR)</div>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => quickLogin('mandiking_owner', 'mandiking123', '/owner-dashboard')}
                className="col-span-2 flex items-center justify-between p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-purple-500/30 text-xs font-medium text-slate-200 transition text-left"
              >
                <div className="flex items-center gap-2">
                  <Store className="w-5 h-5 text-purple-400 shrink-0" />
                  <div>
                    <div className="font-bold text-white flex items-center gap-1.5">
                      Restaurant Owner <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.2 rounded">Mandi King</span>
                    </div>
                    <div className="text-[10px] text-slate-400">mandiking_owner / mandiking123 (Control Room & Staff)</div>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => quickLogin('admin', 'admin123', '/admin')}
                className="flex items-center gap-2 p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-xs font-medium text-slate-200 transition text-left"
              >
                <Shield className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <div className="font-bold">Outlet Admin</div>
                  <div className="text-[10px] text-slate-400">admin123</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => quickLogin('manager', 'manager123', '/owner-dashboard')}
                className="flex items-center gap-2 p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-xs font-medium text-slate-200 transition text-left"
              >
                <Receipt className="w-4 h-4 text-blue-400 shrink-0" />
                <div>
                  <div className="font-bold">Store Manager</div>
                  <div className="text-[10px] text-slate-400">manager123</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => quickLogin('chef', 'chef123', '/kitchen')}
                className="flex items-center gap-2 p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-xs font-medium text-slate-200 transition text-left"
              >
                <ChefHat className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <div className="font-bold">Head Chef</div>
                  <div className="text-[10px] text-slate-400">chef123</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => quickLogin('waiter', 'waiter123', '/pos')}
                className="flex items-center gap-2 p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-xs font-medium text-slate-200 transition text-left"
              >
                <Smartphone className="w-4 h-4 text-purple-400 shrink-0" />
                <div>
                  <div className="font-bold">Waiter (POS)</div>
                  <div className="text-[10px] text-slate-400">waiter123</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
