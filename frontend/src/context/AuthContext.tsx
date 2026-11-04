import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/endpoints';

export interface User {
  id: string;
  username: string;
  name: string;
  email?: string;
  role: {
    id: string;
    name: string;
    displayName: string;
  };
  permissions: string[];
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (credentials: { username: string; password: string }) => Promise<User>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  hasPermission: (permissionKey: string) => boolean;
  isAdmin: boolean;
  isManager: boolean;
  isChef: boolean;
  isStaff: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('rms_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('rms_token'));
  const [loading, setLoading] = useState(false);

  const login = async (credentials: { username: string; password: string }): Promise<User> => {
    setLoading(true);
    try {
      const data = await authApi.login(credentials);
      localStorage.setItem('rms_token', data.accessToken);
      localStorage.setItem('rms_user', JSON.stringify(data.user));
      setToken(data.accessToken);
      setUser(data.user);
      return data.user;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (e) {
      // ignore
    } finally {
      localStorage.removeItem('rms_token');
      localStorage.removeItem('rms_user');
      setUser(null);
      setToken(null);
    }
  };

  const refreshProfile = async () => {
    const t = localStorage.getItem('rms_token');
    if (!t) return;
    try {
      const liveUser = await authApi.getProfile();
      if (liveUser) {
        setUser(liveUser);
        localStorage.setItem('rms_user', JSON.stringify(liveUser));
      }
    } catch (e) {
      console.warn('Failed to refresh profile permissions', e);
    }
  };

  useEffect(() => {
    if (token) {
      refreshProfile();
    }
  }, [token]);

  const roleName = user?.role?.name?.toLowerCase() || '';
  const isAdmin = roleName === 'admin';
  const isManager = roleName === 'manager';
  const isChef = roleName === 'chef';
  const isStaff = roleName === 'staff' || roleName === 'waiter';

  const hasPermission = (permissionKey: string): boolean => {
    if (isAdmin) return true;
    return user?.permissions?.includes(permissionKey) || false;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        refreshProfile,
        hasPermission,
        isAdmin,
        isManager,
        isChef,
        isStaff,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
