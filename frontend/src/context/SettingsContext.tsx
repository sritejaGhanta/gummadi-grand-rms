import React, { createContext, useContext, useEffect, useState } from 'react';
import { settingsApi } from '../api/endpoints';
import { useSocket } from './SocketContext';

interface SettingsContextType {
  settings: Record<string, string>;
  currency: string;
  restaurantName: string;
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor: string;
  refreshSettings: () => Promise<void>;
  applyBrandingToDom: (data: Record<string, string>) => void;
}

const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return isNaN(r) || isNaN(g) || isNaN(b) ? null : { r, g, b };
  } else if (clean.length === 6) {
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    return isNaN(r) || isNaN(g) || isNaN(b) ? null : { r, g, b };
  }
  return null;
};

const adjustBrightness = (hex: string, percent: number): string => {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const adjust = (val: number) => {
    const next = Math.round(val + (val * percent) / 100);
    return Math.min(255, Math.max(0, next));
  };
  const r = adjust(rgb.r).toString(16).padStart(2, '0');
  const g = adjust(rgb.g).toString(16).padStart(2, '0');
  const b = adjust(rgb.b).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
};

const getContrastColor = (hex: string): string => {
  const rgb = hexToRgb(hex);
  if (!rgb) return '#020617';
  const yiq = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  return yiq >= 140 ? '#020617' : '#ffffff';
};

const SettingsContext = createContext<SettingsContextType>({
  settings: {},
  currency: '₹',
  restaurantName: 'Royal Feast Palace',
  logoUrl: '',
  faviconUrl: '',
  primaryColor: '#f59e0b',
  refreshSettings: async () => {},
  applyBrandingToDom: () => {},
});

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { lastEvent } = useSocket();
  const [settings, setSettings] = useState<Record<string, string>>({
    restaurant_name: 'Royal Feast Palace',
    currency_symbol: '₹',
    primary_color: '#f59e0b',
  });

  const applyBrandingToDom = (data: Record<string, string>) => {
    // 1. Dynamic Favicon
    const isSuperAdminRoute = typeof window !== 'undefined' && window.location.pathname.includes('/super-admin');
    if (!isSuperAdminRoute && data.restaurant_favicon_url) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = data.restaurant_favicon_url;
    } else if (isSuperAdminRoute) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
      if (link) {
        link.href = "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect width=%22100%22 height=%22100%22 rx=%2222%22 fill=%22%23f59e0b%22/><text y=%22.75em%22 x=%2250%25%22 font-size=%2260%22 text-anchor=%22middle%22>🔥</text></svg>";
      }
    }

    // 2. Dynamic Title
    if (isSuperAdminRoute) {
      document.title = 'AharPOS — Super Administrator Master Panel';
    } else if (data.restaurant_name) {
      document.title = `${data.restaurant_name} • AharPOS`;
    } else {
      document.title = 'AharPOS — The Operating System for Restaurants';
    }

    // 3. Dynamic Primary CSS Color Variables
    if (data.primary_color) {
      const hex = data.primary_color.trim();
      document.documentElement.style.setProperty('--theme-primary', hex);
      const rgb = hexToRgb(hex);
      if (rgb) {
        document.documentElement.style.setProperty(
          '--theme-primary-rgb',
          `${rgb.r}, ${rgb.g}, ${rgb.b}`,
        );
        const hoverHex = adjustBrightness(hex, -15);
        document.documentElement.style.setProperty('--theme-primary-hover', hoverHex);
        const contrast = getContrastColor(hex);
        document.documentElement.style.setProperty('--theme-primary-contrast', contrast);
      }
    }

    // 4. Dynamic Secondary / Background CSS Color Variables
    if (data.secondary_color) {
      const secHex = data.secondary_color.trim();
      document.documentElement.style.setProperty('--theme-secondary', secHex);
      const secRgb = hexToRgb(secHex);
      if (secRgb) {
        document.documentElement.style.setProperty(
          '--theme-secondary-rgb',
          `${secRgb.r}, ${secRgb.g}, ${secRgb.b}`,
        );
      }
    }
  };

  const refreshSettings = async () => {
    try {
      const data = await settingsApi.getPublic();
      if (data) {
        setSettings(data);
        applyBrandingToDom(data);
      }
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    refreshSettings();
  }, []);

  // Listen to live socket events for settings changes across all clients
  useEffect(() => {
    if (lastEvent?.type === 'settings:updated' && lastEvent.data) {
      setSettings(lastEvent.data);
      applyBrandingToDom(lastEvent.data);
    }
  }, [lastEvent]);

  return (
    <SettingsContext.Provider
      value={{
        settings,
        currency: settings.currency_symbol || '₹',
        restaurantName: settings.restaurant_name || 'Royal Feast Palace',
        logoUrl: settings.restaurant_logo_url || '',
        faviconUrl: settings.restaurant_favicon_url || '',
        primaryColor: settings.primary_color || '#f59e0b',
        refreshSettings,
        applyBrandingToDom,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);
