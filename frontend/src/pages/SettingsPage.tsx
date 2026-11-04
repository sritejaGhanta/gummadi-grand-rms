import React, { useState, useEffect } from 'react';
import { settingsApi } from '../api/endpoints';
import { useSettings } from '../context/SettingsContext';
import {
  Settings,
  Save,
  CheckCircle,
  Palette,
  Building,
  ReceiptText,
  Image as ImageIcon,
  Sparkles,
  Upload,
  Globe,
  RefreshCw,
  RotateCcw,
  Eye,
  Sliders,
} from 'lucide-react';

const THEME_PRESETS = [
  {
    name: 'Imperial Amber Gold',
    primary: '#f59e0b',
    secondary: '#0f172a',
    badge: 'Classic Luxury',
  },
  {
    name: 'Emerald Jade Palace',
    primary: '#10b981',
    secondary: '#022c22',
    badge: 'Fresh & Organic',
  },
  {
    name: 'Majestic Sapphire',
    primary: '#3b82f6',
    secondary: '#0f172a',
    badge: 'Executive Modern',
  },
  {
    name: 'Royal Amethyst Violet',
    primary: '#8b5cf6',
    secondary: '#1e1136',
    badge: 'Fine Dining & Wine',
  },
  {
    name: 'Ruby Rose Velvet',
    primary: '#f43f5e',
    secondary: '#2e0b16',
    badge: 'Bistro & Lounge',
  },
  {
    name: 'Sunset Coral Ember',
    primary: '#f97316',
    secondary: '#1c1917',
    badge: 'Grill & BBQ',
  },
  {
    name: 'Ocean Cyan Lagoon',
    primary: '#06b6d4',
    secondary: '#082f49',
    badge: 'Coastal & Seafood',
  },
  {
    name: 'Obsidian Platinum',
    primary: '#e2e8f0',
    secondary: '#090d16',
    badge: 'Monochrome Minimal',
  },
];

const QUICK_PRIMARY_SWATCHES = [
  { name: 'Imperial Gold', hex: '#f59e0b' },
  { name: 'Warm Amber', hex: '#d97706' },
  { name: 'Sunset Orange', hex: '#f97316' },
  { name: 'Ruby Crimson', hex: '#ef4444' },
  { name: 'Rose Velvet', hex: '#f43f5e' },
  { name: 'Hot Pink', hex: '#ec4899' },
  { name: 'Amethyst Violet', hex: '#8b5cf6' },
  { name: 'Indigo Night', hex: '#6366f1' },
  { name: 'Sapphire Blue', hex: '#3b82f6' },
  { name: 'Sky Azure', hex: '#0ea5e9' },
  { name: 'Ocean Cyan', hex: '#06b6d4' },
  { name: 'Mint Teal', hex: '#14b8a6' },
  { name: 'Emerald Jade', hex: '#10b981' },
  { name: 'Forest Green', hex: '#16a34a' },
  { name: 'Citrus Lime', hex: '#84cc16' },
  { name: 'Platinum Silver', hex: '#94a3b8' },
];

const QUICK_SECONDARY_SWATCHES = [
  { name: 'Midnight Navy', hex: '#0f172a' },
  { name: 'Deep Forest', hex: '#022c22' },
  { name: 'Royal Violet', hex: '#1e1136' },
  { name: 'Charcoal Noir', hex: '#18181b' },
  { name: 'Pitch Dark', hex: '#020617' },
  { name: 'Rich Bordeaux', hex: '#2e0b16' },
];

const PRESET_LOGOS = [
  {
    label: 'Golden Crown Feast',
    url: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="%231e293b" stroke="%23f59e0b" stroke-width="4"/><path d="M25 65 L25 42 L38 52 L50 32 L62 52 L75 42 L75 65 Z" fill="%23f59e0b"/><circle cx="50" cy="27" r="4" fill="%23fbbf24"/><circle cx="25" cy="37" r="3" fill="%23fbbf24"/><circle cx="75" cy="37" r="3" fill="%23fbbf24"/></svg>',
  },
  {
    label: 'Emerald Palace Chef',
    url: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="%23064e3b" stroke="%2310b981" stroke-width="4"/><path d="M30 68 L70 68 L68 56 L32 56 Z M34 53 C24 51 24 36 38 36 C38 24 62 24 62 36 C76 36 76 51 66 53 Z" fill="%2310b981"/></svg>',
  },
  {
    label: 'Sapphire Royal Shield',
    url: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="%230f172a" stroke="%233b82f6" stroke-width="4"/><path d="M50 20 L75 30 L75 55 C75 70 50 82 50 82 C50 82 25 70 25 55 L25 30 Z" fill="%231e293b" stroke="%233b82f6" stroke-width="3"/><text x="50" y="58" font-size="28" font-family="sans-serif" font-weight="bold" fill="%2360a5fa" text-anchor="middle">R</text></svg>',
  },
  {
    label: 'Violet Luxury Fork',
    url: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="%231e1136" stroke="%238b5cf6" stroke-width="4"/><circle cx="50" cy="50" r="40" fill="none" stroke="%23c084fc" stroke-width="2" stroke-dasharray="4 2"/><path d="M40 32 L40 50 C40 56 46 60 50 60 L50 78 L54 78 L54 60 C58 60 64 56 64 50 L64 32 L60 32 L60 48 L56 48 L56 32 L52 32 L52 48 L48 48 L48 32 Z" fill="%23a855f7"/></svg>',
  },
];

const PRESET_FAVICONS = [
  {
    label: 'Gold Crown SVG',
    url: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>👑</text></svg>',
  },
  {
    label: 'Chef Hat SVG',
    url: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>👨‍🍳</text></svg>',
  },
  {
    label: 'Utensils SVG',
    url: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🍽️</text></svg>',
  },
  {
    label: 'Sparkles Gem SVG',
    url: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>💎</text></svg>',
  },
];

export const SettingsPage: React.FC = () => {
  const { refreshSettings, applyBrandingToDom } = useSettings();
  const [form, setForm] = useState<Record<string, string>>({
    restaurant_name: 'Royal Feast Palace',
    restaurant_tagline: 'Fine Dining & Continental Cuisine',
    primary_color: '#f59e0b',
    secondary_color: '#0f172a',
    restaurant_logo_url: '',
    restaurant_favicon_url: '',
    currency_symbol: '₹',
    gst_number: '36AAAAA0000A1Z5',
    contact_number: '+91 98765 43210',
    address: 'Road No. 36, Jubilee Hills, Hyderabad, Telangana 500033',
    tax_percentage: '5.0',
    bill_footer_text: 'Thank you for dining with Royal Feast Palace. Please visit us again!',
  });

  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    settingsApi.getAll().then((data) => {
      if (data) {
        setForm((prev) => ({ ...prev, ...data }));
      }
    });
  }, []);

  const handleChange = (key: string, value: string) => {
    setForm((prev) => {
      const updated = { ...prev, [key]: value };
      if (
        key === 'primary_color' ||
        key === 'restaurant_name' ||
        key === 'restaurant_favicon_url'
      ) {
        applyBrandingToDom(updated);
      }
      return updated;
    });
  };

  const handleApplyPresetTheme = (preset: (typeof THEME_PRESETS)[0]) => {
    setForm((prev) => {
      const updated = {
        ...prev,
        primary_color: preset.primary,
        secondary_color: preset.secondary,
      };
      applyBrandingToDom(updated);
      return updated;
    });
  };

  // Support local logo file upload via base64 data url
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          handleChange('restaurant_logo_url', reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Support local favicon upload via base64 data url
  const handleFaviconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          handleChange('restaurant_favicon_url', reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await settingsApi.update(form);
      await refreshSettings();
      setSuccessMsg('Branding, Theme colors, Logo, Favicon, and Global Configuration updated successfully!');
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-white flex items-center gap-3">
          <span className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <Settings className="w-6 h-6" />
          </span>
          <span>Application Branding & Global Configuration</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Customize brand logos, browser favicons, theme color accents, and restaurant billing identity live
        </p>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* 1. Theme Colors & Presets Section */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-2 uppercase tracking-wider text-amber-400">
                <Palette className="w-5 h-5 text-amber-400" />
                <span>Custom Theme Colors & Visual Branding Studio</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Pick any custom brand color, choose luxury presets, and preview live changes instantly
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  handleChange('primary_color', '#f59e0b');
                  handleChange('secondary_color', '#0f172a');
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
                title="Reset to default Imperial Amber"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to Default</span>
              </button>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                Live DOM Preview
              </span>
            </div>
          </div>

          {/* Interactive Live Theme Preview Box */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-amber-400" />
                Live Interactive UI Preview (How it looks across the system)
              </span>
              <span className="text-[11px] font-mono font-normal text-slate-500">
                Primary: <strong style={{ color: form.primary_color || '#f59e0b' }}>{form.primary_color || '#f59e0b'}</strong>
              </span>
            </div>

            <div
              className="p-4 rounded-xl border transition-all duration-300 space-y-3"
              style={{
                backgroundColor: form.secondary_color || '#0f172a',
                borderColor: `${form.primary_color || '#f59e0b'}40`,
                boxShadow: `0 8px 30px -10px ${form.primary_color || '#f59e0b'}30`,
              }}
            >
              {/* Mock Header */}
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <span
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shadow"
                    style={{ backgroundColor: form.primary_color || '#f59e0b', color: '#000' }}
                  >
                    👑
                  </span>
                  <div>
                    <div className="text-xs font-extrabold text-white">
                      {form.restaurant_name || 'Gummadi Grand Restaurant Eluru'}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {form.restaurant_tagline || 'Fine Dining & Luxury Banquet'}
                    </div>
                  </div>
                </div>

                <span
                  className="text-[10px] font-extrabold px-2.5 py-1 rounded-full border shadow-sm"
                  style={{
                    backgroundColor: `${form.primary_color || '#f59e0b'}20`,
                    borderColor: `${form.primary_color || '#f59e0b'}60`,
                    color: form.primary_color || '#f59e0b',
                  }}
                >
                  ● Table T-04 Active
                </span>
              </div>

              {/* Mock Card Content */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="space-y-0.5">
                  <div className="text-[11px] text-slate-400 font-semibold">Sample Order ORD-2026-08</div>
                  <div className="text-base font-black text-white flex items-center gap-1">
                    <span>{form.currency_symbol || '₹'}</span>
                    <span style={{ color: form.primary_color || '#f59e0b' }}>1,850.00</span>
                    <span className="text-[10px] font-normal text-slate-400 ml-1">(3 Items Delivered)</span>
                  </div>
                </div>

                {/* Mock Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-xl text-xs font-extrabold shadow-md transition transform active:scale-95"
                    style={{
                      backgroundColor: form.primary_color || '#f59e0b',
                      color: '#020617',
                    }}
                  >
                    🧾 Generate Bill
                  </button>
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-xl text-xs font-bold border transition"
                    style={{
                      borderColor: `${form.primary_color || '#f59e0b'}80`,
                      color: form.primary_color || '#f59e0b',
                      backgroundColor: `${form.primary_color || '#f59e0b'}10`,
                    }}
                  >
                    🛎️ View KDS
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Color Studio Inputs */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Primary Accent Color Picker */}
            <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-amber-400" />
                  <span>1. Custom Primary Accent Color</span>
                </label>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  {form.primary_color || '#f59e0b'}
                </span>
              </div>

              {/* Native Picker & Hex Input */}
              <div className="flex gap-2.5 items-center">
                <input
                  type="color"
                  value={form.primary_color || '#f59e0b'}
                  onChange={(e) => handleChange('primary_color', e.target.value)}
                  className="w-14 h-11 rounded-xl bg-slate-800 cursor-pointer border border-slate-700 p-1"
                />
                <input
                  type="text"
                  value={form.primary_color || ''}
                  onChange={(e) => handleChange('primary_color', e.target.value)}
                  placeholder="#f59e0b"
                  maxLength={7}
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-mono font-bold uppercase focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* 16 Quick Color Swatches */}
              <div>
                <span className="block text-[11px] font-semibold text-slate-400 mb-2">
                  Popular Vibrant Color Swatches (Click to Apply):
                </span>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                  {QUICK_PRIMARY_SWATCHES.map((swatch) => {
                    const isSelected = (form.primary_color || '').toLowerCase() === swatch.hex.toLowerCase();
                    return (
                      <button
                        key={swatch.hex}
                        type="button"
                        onClick={() => handleChange('primary_color', swatch.hex)}
                        title={`${swatch.name} (${swatch.hex})`}
                        className={`h-8 rounded-xl border flex items-center justify-center transition transform active:scale-90 ${
                          isSelected ? 'ring-2 ring-white scale-110 shadow-lg' : 'hover:scale-105 border-white/10'
                        }`}
                        style={{ backgroundColor: swatch.hex }}
                      >
                        {isSelected && <span className="text-xs text-black font-black">✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Secondary / Background Accent Color Picker */}
            <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-amber-400" />
                  <span>2. Secondary / Mood Background Color</span>
                </label>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  {form.secondary_color || '#0f172a'}
                </span>
              </div>

              {/* Native Picker & Hex Input */}
              <div className="flex gap-2.5 items-center">
                <input
                  type="color"
                  value={form.secondary_color || '#0f172a'}
                  onChange={(e) => handleChange('secondary_color', e.target.value)}
                  className="w-14 h-11 rounded-xl bg-slate-800 cursor-pointer border border-slate-700 p-1"
                />
                <input
                  type="text"
                  value={form.secondary_color || ''}
                  onChange={(e) => handleChange('secondary_color', e.target.value)}
                  placeholder="#0f172a"
                  maxLength={7}
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-mono font-bold uppercase focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* 6 Mood Background Swatches */}
              <div>
                <span className="block text-[11px] font-semibold text-slate-400 mb-2">
                  Atmospheric Dark Tint Swatches (Click to Apply):
                </span>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {QUICK_SECONDARY_SWATCHES.map((swatch) => {
                    const isSelected = (form.secondary_color || '').toLowerCase() === swatch.hex.toLowerCase();
                    return (
                      <button
                        key={swatch.hex}
                        type="button"
                        onClick={() => handleChange('secondary_color', swatch.hex)}
                        title={`${swatch.name} (${swatch.hex})`}
                        className={`h-8 rounded-xl border flex items-center justify-center transition transform active:scale-90 ${
                          isSelected ? 'ring-2 ring-white scale-105 shadow-lg' : 'hover:scale-105 border-white/10'
                        }`}
                        style={{ backgroundColor: swatch.hex }}
                      >
                        {isSelected && <span className="text-xs text-white font-black">✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* 1-Click Curated Theme Presets Grid */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5">
              Or Choose Curated 1-Click Luxury Theme Presets:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
              {THEME_PRESETS.map((preset) => {
                const isActive = (form.primary_color || '').toLowerCase() === preset.primary.toLowerCase();
                return (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => handleApplyPresetTheme(preset)}
                    className={`p-3 rounded-2xl border text-left transition relative flex flex-col justify-between ${
                      isActive
                        ? 'border-white bg-slate-800/90 shadow-xl ring-1 ring-white/50'
                        : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <span
                          className="w-4 h-4 rounded-full border border-white/20 shadow-sm shrink-0"
                          style={{ backgroundColor: preset.primary }}
                        />
                        <span
                          className="w-3 h-3 rounded-full border border-white/20 shrink-0"
                          style={{ backgroundColor: preset.secondary }}
                        />
                      </div>
                      <div className="text-[11px] font-bold text-white line-clamp-1">{preset.name}</div>
                    </div>
                    <span className="text-[8px] font-semibold text-slate-400 mt-2 block">
                      {preset.badge}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 2. Restaurant Logo & Favicon Management */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="font-bold text-sm text-white flex items-center gap-2 uppercase tracking-wider text-amber-400">
              <ImageIcon className="w-4 h-4" />
              <span>Restaurant Logo & Browser Favicon</span>
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
              Live Preview
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Logo Configuration */}
            <div className="space-y-3 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
              <label className="block text-xs font-semibold text-white uppercase tracking-wider">
                Restaurant Logo (Navbar & Bills)
              </label>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0 shadow-lg">
                  {form.restaurant_logo_url ? (
                    <img
                      src={form.restaurant_logo_url}
                      alt="Logo Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Sparkles className="w-6 h-6 text-amber-500" />
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    value={form.restaurant_logo_url || ''}
                    onChange={(e) => handleChange('restaurant_logo_url', e.target.value)}
                    placeholder="Enter Logo Image URL"
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
                  />
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold transition">
                    <Upload className="w-3.5 h-3.5 text-amber-400" />
                    <span>Upload Logo Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Preset Demonstration Logos:
                </p>
                <div className="flex flex-wrap gap-2">
                  {PRESET_LOGOS.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => handleChange('restaurant_logo_url', p.url)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 border border-slate-700 font-medium transition"
                    >
                      {p.label}
                    </button>
                  ))}
                  {form.restaurant_logo_url && (
                    <button
                      type="button"
                      onClick={() => handleChange('restaurant_logo_url', '')}
                      className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-[11px] text-rose-400 border border-rose-500/20 font-medium transition"
                    >
                      Clear Logo
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Favicon Configuration */}
            <div className="space-y-3 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
              <label className="block text-xs font-semibold text-white uppercase tracking-wider">
                Browser Tab Favicon
              </label>
              <div className="flex items-center gap-4">
                {/* Browser Tab Simulator Preview */}
                <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex flex-col items-center justify-center overflow-hidden shrink-0 shadow-lg p-2">
                  {form.restaurant_favicon_url ? (
                    <img
                      src={form.restaurant_favicon_url}
                      alt="Favicon Preview"
                      className="w-7 h-7 object-contain"
                    />
                  ) : (
                    <Globe className="w-6 h-6 text-blue-400" />
                  )}
                  <span className="text-[9px] text-slate-400 mt-1">Tab Icon</span>
                </div>
                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    value={form.restaurant_favicon_url || ''}
                    onChange={(e) => handleChange('restaurant_favicon_url', e.target.value)}
                    placeholder="Enter Favicon URL or SVG Data URI"
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500 font-mono"
                  />
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold transition">
                    <Upload className="w-3.5 h-3.5 text-blue-400" />
                    <span>Upload Favicon</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFaviconUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Preset Favicon Icons:
                </p>
                <div className="flex flex-wrap gap-2">
                  {PRESET_FAVICONS.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => handleChange('restaurant_favicon_url', p.url)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 border border-slate-700 font-medium transition"
                    >
                      {p.label}
                    </button>
                  ))}
                  {form.restaurant_favicon_url && (
                    <button
                      type="button"
                      onClick={() => handleChange('restaurant_favicon_url', '')}
                      className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-[11px] text-rose-400 border border-rose-500/20 font-medium transition"
                    >
                      Reset Favicon
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Restaurant Brand Identity */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
          <h3 className="font-bold text-sm text-white flex items-center gap-2 uppercase tracking-wider text-amber-400">
            <Building className="w-4 h-4" />
            <span>Store Brand Identity & Location</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                Restaurant Brand Name
              </label>
              <input
                type="text"
                value={form.restaurant_name || ''}
                onChange={(e) => handleChange('restaurant_name', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                Tagline / Slogan
              </label>
              <input
                type="text"
                value={form.restaurant_tagline || ''}
                onChange={(e) => handleChange('restaurant_tagline', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                GST / Tax Registration Number
              </label>
              <input
                type="text"
                value={form.gst_number || ''}
                onChange={(e) => handleChange('gst_number', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-mono uppercase focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                Contact Phone
              </label>
              <input
                type="text"
                value={form.contact_number || ''}
                onChange={(e) => handleChange('contact_number', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                Full Physical Restaurant Address
              </label>
              <input
                type="text"
                value={form.address || ''}
                onChange={(e) => handleChange('address', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        {/* 4. Invoice & Tax Settings */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
          <h3 className="font-bold text-sm text-white flex items-center gap-2 uppercase tracking-wider text-amber-400">
            <ReceiptText className="w-4 h-4" />
            <span>Invoice & Thermal Receipt Settings</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                Default GST / Tax Rate (%)
              </label>
              <input
                type="number"
                step="0.1"
                value={form.tax_percentage || '5.0'}
                onChange={(e) => handleChange('tax_percentage', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-bold focus:outline-none focus:border-amber-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                Receipt Footer Greeting
              </label>
              <textarea
                value={form.bill_footer_text || ''}
                onChange={(e) => handleChange('bill_footer_text', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500 h-20"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm flex items-center gap-2 shadow-xl shadow-amber-500/20 transition disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{loading ? 'Saving Settings...' : 'Save Configuration & Apply Theme'}</span>
        </button>
      </form>
    </div>
  );
};
