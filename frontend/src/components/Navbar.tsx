import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useSettings } from '../context/SettingsContext';
import { UtensilsCrossed, Bell, LogOut, User, Wifi, WifiOff, Menu, X } from 'lucide-react';
import { useNav } from '../context/NavContext';

export const Navbar: React.FC = () => {
  const { user, isSuperAdmin, logout } = useAuth();
  const { connected, lastEvent } = useSocket();
  const { restaurantName, logoUrl, settings } = useSettings();
  const { isMobileOpen, toggleMobile } = useNav();
  const [showNotifications, setShowNotifications] = useState(false);
  const [imgError, setImgError] = useState(false);

  React.useEffect(() => {
    setImgError(false);
  }, [logoUrl]);

  const saasBrandName = settings?.landing_brand_name || 'AharPOS';

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/95 backdrop-blur-md sticky top-0 z-40 px-3 sm:px-6 flex items-center justify-between">
      {/* Brand & Hamburger */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Mobile Hamburger Button */}
        <button
          onClick={toggleMobile}
          className="p-2 -ml-1 rounded-xl lg:hidden text-slate-300 hover:text-white hover:bg-slate-800 focus:outline-none transition"
          aria-label="Toggle navigation menu"
        >
          {isMobileOpen ? <X className="w-6 h-6 text-amber-400" /> : <Menu className="w-6 h-6" />}
        </button>

        {isSuperAdmin ? (
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/30 shrink-0">
            <span className="text-xl">🔥</span>
          </div>
        ) : logoUrl && !imgError ? (
          <img
            src={logoUrl}
            alt={restaurantName}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl object-contain bg-slate-900 shrink-0 border border-slate-700/80 shadow-lg shadow-amber-500/10 p-0.5"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-amber-500/20 shrink-0">
            <UtensilsCrossed className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        )}
        <div>
          <h1 className="font-bold text-base sm:text-lg leading-tight tracking-tight text-white flex items-center gap-1.5 sm:gap-2">
            <span className={`truncate max-w-[140px] sm:max-w-none ${isSuperAdmin ? 'text-amber-400 font-extrabold tracking-wide text-lg' : ''}`}>
              {isSuperAdmin ? 'AharPOS' : restaurantName}
            </span>
            {isSuperAdmin && (
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wider hidden sm:inline-block">
                Super Admin HQ
              </span>
            )}
          </h1>
          <p className="text-[10px] sm:text-xs text-slate-400 hidden xs:block">
            {isSuperAdmin ? 'Operating System for Fast-Growing Restaurants' : 'Intranet Operating System'}
          </p>
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-4">
        {/* Connection status */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-slate-800/80 border border-slate-700">
          {connected ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-emerald-400 hidden sm:inline">LAN Live</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              <span className="text-rose-400 hidden sm:inline">Offline</span>
            </>
          )}
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition relative"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {lastEvent && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-amber-500 rounded-full animate-ping"></span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 glass-panel rounded-xl shadow-2xl p-4 border border-slate-700/80 z-50 text-sm">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 font-semibold text-slate-200">
                <span>Recent Live Alerts</span>
                <span className="text-xs text-amber-400">WebSocket</span>
              </div>
              <div className="py-3">
                {lastEvent ? (
                  <div className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/50">
                    <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                      {lastEvent.type}
                    </div>
                    <div className="text-xs text-slate-300 mt-1 line-clamp-2">
                      {JSON.stringify(lastEvent.data)}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 text-center py-4">No recent notifications</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* User profile & Logout */}
        {user && (
          <div className="flex items-center gap-3 pl-3 border-l border-slate-800">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-semibold text-white">{user.name}</div>
              <div className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                {user.role?.displayName || user.role?.name}
              </div>
            </div>
            <button
              onClick={() => logout()}
              className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
