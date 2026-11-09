import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { UtensilsCrossed, Lock, User, Sparkles, Shield, ChefHat, Smartphone, Receipt, Globe, Store } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { LanguageSelector } from '../components/LanguageSelector';

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('superadmin');
  const [password, setPassword] = useState('superadmin123');
  const [error, setError] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);
  const { login, loading } = useAuth();
  const { restaurantName, logoUrl } = useSettings();
  const { t } = useLanguage();
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
        <div className="text-center mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300 transition mb-4 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-800"
          >
            <span>← Back to AharPOS Website</span>
          </Link>
          <div className="block">
            <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-400 items-center justify-center text-slate-950 font-bold shadow-2xl shadow-amber-500/30 mb-3 animate-pulse-glow">
              <UtensilsCrossed className="w-8 h-8" />
            </div>
          </div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">AharPOS</h2>
          <p className="text-xs text-slate-400 mt-1">Enterprise Multi-Tenant Restaurant Cloud & LAN System</p>
        </div>

        {/* Card */}
        <div className="glass-panel p-8 rounded-3xl border border-slate-800 shadow-2xl space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <h3 className="font-bold text-white text-base">{t('login.title', 'Intranet Staff Login')}</h3>
              <p className="text-[11px] text-slate-400">{t('login.subtitle', 'Sign in to access your station')}</p>
            </div>
            <div className="flex items-center gap-2">
              <LanguageSelector />
            </div>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                {t('login.username', 'Username')}
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
                {t('login.password', 'Password')}
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
              {loading ? 'Authenticating...' : t('login.btn_submit', 'Sign In to Restaurant System')}
            </button>
          </form>

          {/* Super Admin Quick Access & Information */}
          <div className="pt-4 border-t border-slate-800 space-y-3">
            <button
              type="button"
              onClick={() => quickLogin('superadmin', 'superadmin123', '/super-admin')}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-amber-500/20 to-indigo-500/20 hover:from-amber-500/30 hover:to-indigo-500/30 border border-amber-500/30 text-xs font-medium text-amber-200 transition text-left shadow-lg shadow-amber-500/5"
            >
              <div className="flex items-center gap-2.5">
                <Globe className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <div className="font-bold flex items-center gap-1.5 text-white">
                    {t('login.superadmin_quick', 'Super Admin Master Login')} <span className="text-[10px] bg-amber-500 text-slate-950 font-black px-1.5 py-0.2 rounded">HQ</span>
                  </div>
                  <div className="text-[11px] text-slate-400">{t('login.superadmin_sub', 'superadmin / superadmin123 (SaaS Multi-Tenant Cloud HQ)')}</div>
                </div>
              </div>
              <span className="text-xs font-bold text-amber-400">{t('login.one_click', '1-Click Sign In ➔')}</span>
            </button>

            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] text-slate-400 space-y-1">
              <div className="font-bold text-slate-300 flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t('login.staff_notice', 'Restaurant Owners & Staff Login:')}</span>
              </div>
              <p>
                {t('login.staff_notice_desc', 'Use the credentials provided when your restaurant was onboarded via the Super Admin Dashboard.')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
