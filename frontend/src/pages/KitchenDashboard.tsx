import React, { useState, useEffect, useMemo, useRef } from 'react';
import { kitchenApi, menuApi, ordersApi } from '../api/endpoints';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import {
  ChefHat,
  Clock,
  CheckCircle2,
  Play,
  Check,
  AlertTriangle,
  ToggleLeft,
  ToggleRight,
  Flame,
  Search,
  Filter,
  Volume2,
  VolumeX,
  RefreshCw,
  Layers,
  UtensilsCrossed,
  Sparkles,
  Timer,
  BellRing,
  Grid,
  List,
  CheckCheck,
  ChevronRight,
  ShieldCheck,
  X,
} from 'lucide-react';

export const KitchenDashboard: React.FC = () => {
  const { user } = useAuth();
  const { lastEvent } = useSocket();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Live Kitchen Clock
  const [currentTime, setCurrentTime] = useState<string>(
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  );

  // Audio Alerts
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Filter & Search Controls
  const [searchQuery, setSearchQuery] = useState('');
  const [dietaryFilter, setDietaryFilter] = useState<'ALL' | 'VEG' | 'NON_VEG'>('ALL');
  const [selectedFloor, setSelectedFloor] = useState<string>('ALL');
  const [readyViewMode, setReadyViewMode] = useState<'TABLE' | 'STREAM'>('TABLE');

  // Sold Out drawer state
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [showAvailabilityDrawer, setShowAvailabilityDrawer] = useState(false);
  const [menuSearch, setMenuSearch] = useState('');
  const [availCategory, setAvailCategory] = useState<string>('ALL');

  // Chefs List & Workstation Assignment
  const [chefs, setChefs] = useState<any[]>([]);
  const [selectedChefId, setSelectedChefId] = useState<string>(
    localStorage.getItem('kds_active_chef_id') || ''
  );
  const [itemChefMap, setItemChefMap] = useState<Record<string, string>>({});

  // Notifications
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Sound chime using Web Audio API
  const playChime = () => {
    if (!soundEnabled) return;
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) {
      // Audio autoplay policy fallback
    }
  };

  // Clock ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(
        new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const loadTasks = async () => {
    try {
      const data = await kitchenApi.getTasks();
      setTasks(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const loadChefs = async () => {
    try {
      const data = await kitchenApi.getChefs();
      setChefs(data || []);
      if (data && data.length > 0) {
        if (user?.role?.name === 'chef') {
          setSelectedChefId(user.id);
        } else if (!selectedChefId || !data.some((c: any) => c.id === selectedChefId)) {
          setSelectedChefId(data[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadMenuItems = async () => {
    try {
      const data = await menuApi.getItems();
      setMenuItems(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadTasks();
    loadMenuItems();
    loadChefs();
  }, []);

  // Listen to WebSocket events
  useEffect(() => {
    if (!lastEvent) return;
    if (
      lastEvent.type === 'kitchen:new_order' ||
      lastEvent.type === 'order:created' ||
      lastEvent.type === 'order:item_status_changed' ||
      lastEvent.type === 'billing:paid'
    ) {
      if (lastEvent.type === 'kitchen:new_order' || lastEvent.type === 'order:created') {
        playChime();
      }
      loadTasks();
    }
    if (lastEvent.type === 'menu:availability_updated') {
      loadMenuItems();
    }
  }, [lastEvent]);

  // Task actions with chef delegation support
  const handleAccept = async (itemId: string, overrideChefId?: string) => {
    try {
      const chefIdToUse = overrideChefId || itemChefMap[itemId] || selectedChefId;
      await kitchenApi.acceptItem(itemId, chefIdToUse || undefined);
      loadTasks();
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleStartPrep = async (itemId: string, overrideChefId?: string) => {
    try {
      const chefIdToUse = overrideChefId || itemChefMap[itemId] || selectedChefId;
      await kitchenApi.startPreparing(itemId, chefIdToUse || undefined);
      loadTasks();
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleMarkReady = async (itemId: string) => {
    try {
      await kitchenApi.markReady(itemId, selectedChefId || undefined);
      setActionSuccess('Dish marked READY! Waiter alerted for pass pickup.');
      setTimeout(() => setActionSuccess(null), 3000);
      loadTasks();
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleReassignChef = async (itemId: string, newChefId: string) => {
    try {
      await kitchenApi.assignChef(itemId, newChefId);
      setActionSuccess('Chef assigned to dish!');
      setTimeout(() => setActionSuccess(null), 2500);
      loadTasks();
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleMarkDelivered = async (itemId: string) => {
    try {
      await ordersApi.markItemDelivered(itemId);
      setActionSuccess('Dish served & cleared from pass counter.');
      setTimeout(() => setActionSuccess(null), 2500);
      loadTasks();
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleDeliverAllForTable = async (items: any[]) => {
    try {
      await Promise.all(items.map((i) => ordersApi.markItemDelivered(i.id)));
      setActionSuccess(`All dishes for table served & cleared.`);
      setTimeout(() => setActionSuccess(null), 2500);
      loadTasks();
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleToggleAvailability = async (item: any) => {
    const nextVal = !(item.availability?.isAvailable ?? true);
    try {
      await menuApi.setAvailability(item.id, nextVal);
      loadMenuItems();
    } catch (e: any) {
      console.error(e);
    }
  };

  // Helper for elapsed time in minutes
  const getElapsedMinutes = (dateStr: string) => {
    if (!dateStr) return 0;
    const diff = Date.now() - new Date(dateStr).getTime();
    return Math.max(0, Math.floor(diff / 60000));
  };

  // Extract unique floors for filter
  const floors = useMemo(() => {
    const set = new Map<string, string>();
    tasks.forEach((t) => {
      if (t.order?.table?.floor) {
        set.set(t.order.table.floor.id, t.order.table.floor.name);
      }
    });
    return Array.from(set.entries()).map(([id, name]) => ({ id, name }));
  }, [tasks]);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchDish = t.foodItem?.name?.toLowerCase().includes(q);
        const matchTable = t.order?.table?.tableNumber?.toLowerCase().includes(q);
        const matchFloor = t.order?.table?.floor?.name?.toLowerCase().includes(q);
        if (!matchDish && !matchTable && !matchFloor) return false;
      }
      // Dietary
      if (dietaryFilter === 'VEG' && !t.foodItem?.isVeg) return false;
      if (dietaryFilter === 'NON_VEG' && t.foodItem?.isVeg) return false;
      // Floor
      if (selectedFloor !== 'ALL' && t.order?.table?.floor?.id !== selectedFloor) return false;

      return true;
    });
  }, [tasks, searchQuery, dietaryFilter, selectedFloor]);

  // Segregate tasks
  const pendingTasks = filteredTasks.filter((t) => t.status === 'PENDING');
  const preparingTasks = filteredTasks.filter((t) => t.status === 'ACCEPTED' || t.status === 'PREPARING');
  const readyTasks = filteredTasks.filter((t) => t.status === 'READY');

  // Group ready items by table for organized pass counter
  const readyByTable = useMemo(() => {
    const map: Record<string, { tableNumber: string; floorName: string; waiterName: string; items: any[] }> = {};
    for (const t of readyTasks) {
      const tableId = t.order?.tableId || t.order?.id || 'unknown';
      if (!map[tableId]) {
        map[tableId] = {
          tableNumber: t.order?.table?.tableNumber || 'Takeaway',
          floorName: t.order?.table?.floor?.name || 'Main Hall',
          waiterName: t.order?.waiter?.name || 'Assigned Waiter',
          items: [],
        };
      }
      map[tableId].items.push(t);
    }
    return Object.values(map);
  }, [readyTasks]);

  // Availability categories
  const availCategories = useMemo(() => {
    const set = new Set<string>();
    menuItems.forEach((i) => {
      if (i.category?.name) set.add(i.category.name);
    });
    return Array.from(set);
  }, [menuItems]);

  const filteredMenuItems = useMemo(() => {
    return menuItems.filter((i) => {
      if (menuSearch && !i.name.toLowerCase().includes(menuSearch.toLowerCase())) return false;
      if (availCategory !== 'ALL' && i.category?.name !== availCategory) return false;
      return true;
    });
  }, [menuItems, menuSearch, availCategory]);

  return (
    <div className="h-[calc(100vh-4.2rem)] flex flex-col p-3 md:p-5 gap-3.5 overflow-hidden bg-slate-950 text-slate-100 select-none">
      {/* Toast Alert */}
      {actionSuccess && (
        <div className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-bold flex items-center gap-2 shadow-xl shrink-0 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* TOP COMMAND BAR */}
      <div className="glass-panel p-3.5 sm:p-4 rounded-2xl border border-slate-800 shrink-0 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        {/* Left: Title & Live Clock */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/10">
            <ChefHat className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-white tracking-wide">
                Kitchen Display System (KDS)
              </h2>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>LIVE</span>
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
              <span className="font-mono text-amber-400 font-bold tracking-wider flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                {currentTime}
              </span>
              <span className="hidden md:inline">• Station: Head Line Kitchen</span>
            </div>
          </div>
        </div>

        {/* Center: Live Pipeline Status Counters */}
        <div className="hidden lg:flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
            <span className="text-xs font-bold text-rose-400">{pendingTasks.length} Incoming</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2">
            <Flame className="w-3.5 h-3.5 text-amber-500 animate-bounce" />
            <span className="text-xs font-bold text-amber-400">{preparingTasks.length} Cooking</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs font-bold text-emerald-400">{readyTasks.length} Ready for Pass</span>
          </div>
        </div>

        {/* Right: Quick Controls & Modals */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Active Chef Workstation Selector (Especially for Admin operating KDS) */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700/80 shadow-inner">
            <ChefHat className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="flex flex-col text-left">
              <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">
                {user?.role?.name === 'admin' || user?.role?.name === 'manager'
                  ? 'Admin Cooking As:'
                  : 'Active Chef:'}
              </span>
              <select
                value={selectedChefId}
                onChange={(e) => {
                  setSelectedChefId(e.target.value);
                  localStorage.setItem('kds_active_chef_id', e.target.value);
                }}
                className="bg-transparent text-xs font-bold text-amber-400 focus:outline-none cursor-pointer pr-1"
              >
                {chefs.map((c: any) => (
                  <option key={c.id} value={c.id} className="bg-slate-900 text-white font-medium">
                    {c.name} {user?.id === c.id ? '(You)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Sound alert toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-xl border text-xs font-semibold transition flex items-center gap-1.5 ${
              soundEnabled
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
                : 'bg-slate-900 text-slate-500 border-slate-800'
            }`}
            title={soundEnabled ? 'Chime sound active' : 'Sound muted'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline">{soundEnabled ? 'Sound ON' : 'Muted'}</span>
          </button>

          {/* Manage Daily Availability Button */}
          <button
            onClick={() => setShowAvailabilityDrawer(true)}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition"
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Manage Stock</span>
          </button>

          {/* Manual Refresh */}
          <button
            onClick={loadTasks}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition"
            title="Refresh Orders"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* FILTER & SEARCH SUBBAR */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 shrink-0 text-xs">
        {/* Left: Dietary Filters & Floor Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center p-0.5 rounded-xl bg-slate-900 border border-slate-800">
            <button
              onClick={() => setDietaryFilter('ALL')}
              className={`px-3 py-1 rounded-lg font-bold transition text-xs ${
                dietaryFilter === 'ALL'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All Items
            </button>
            <button
              onClick={() => setDietaryFilter('VEG')}
              className={`px-3 py-1 rounded-lg font-bold transition text-xs flex items-center gap-1 ${
                dietaryFilter === 'VEG'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Veg</span>
            </button>
            <button
              onClick={() => setDietaryFilter('NON_VEG')}
              className={`px-3 py-1 rounded-lg font-bold transition text-xs flex items-center gap-1 ${
                dietaryFilter === 'NON_VEG'
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              <span>Non-Veg</span>
            </button>
          </div>

          {floors.length > 0 && (
            <select
              value={selectedFloor}
              onChange={(e) => setSelectedFloor(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 font-semibold focus:outline-none focus:border-amber-500 cursor-pointer text-xs"
            >
              <option value="ALL">All Floors</option>
              {floors.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Right: Search box & Column 3 view toggle */}
        <div className="flex items-center gap-2">
          <div className="relative w-44 sm:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search dish or table #..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 text-xs"
            />
          </div>

          {/* Toggle for Column 3 View */}
          <div className="hidden sm:flex items-center p-0.5 rounded-xl bg-slate-900 border border-slate-800" title="Ready Column View">
            <button
              onClick={() => setReadyViewMode('TABLE')}
              className={`p-1.5 rounded-lg transition ${
                readyViewMode === 'TABLE' ? 'bg-amber-500/20 text-amber-400' : 'text-slate-500 hover:text-white'
              }`}
              title="Group by Table"
            >
              <Layers className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setReadyViewMode('STREAM')}
              className={`p-1.5 rounded-lg transition ${
                readyViewMode === 'STREAM' ? 'bg-amber-500/20 text-amber-400' : 'text-slate-500 hover:text-white'
              }`}
              title="Single Ticket Stream"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 3-COLUMN KDS BOARD - BOUNDED FIXED HEIGHT WITH INDEPENDENT INTERNAL SCROLL */}
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-3 gap-3.5 md:gap-4 overflow-hidden">
        {/* ============================================================== */}
        {/* COLUMN 1: INCOMING ORDERS (TO COOK)                            */}
        {/* ============================================================== */}
        <div className="h-full min-h-0 flex flex-col rounded-2xl glass-panel border border-rose-500/20 overflow-hidden bg-slate-900/40">
          {/* Fixed Column Header */}
          <div className="shrink-0 px-4 py-3 border-b border-slate-800/80 bg-slate-900/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
              <h3 className="font-black text-sm text-rose-400 tracking-wide uppercase">
                1. Incoming Orders
              </h3>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-500/10 text-rose-400 border border-rose-500/20">
              {pendingTasks.length}
            </span>
          </div>

          {/* Scrollable Item Stream */}
          <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
            {pendingTasks.length === 0 ? (
              <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-center p-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600 mb-2">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <p className="text-xs font-bold text-slate-400">All caught up!</p>
                <p className="text-[11px] text-slate-600 mt-0.5">No pending incoming tickets</p>
              </div>
            ) : (
              pendingTasks.map((t) => {
                const elapsed = getElapsedMinutes(t.createdAt);
                const isUrgent = elapsed >= 12;
                return (
                  <div
                    key={t.id}
                    className={`p-3.5 rounded-2xl border transition shadow-lg space-y-2.5 ${
                      isUrgent
                        ? 'bg-rose-950/20 border-rose-500/60 shadow-rose-500/5'
                        : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {/* Top Row: Table & Elapsed Time */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 font-black text-xs">
                          {t.order?.table?.tableNumber || 'Takeaway'}
                        </span>
                        <span className="text-[11px] text-slate-400 font-semibold truncate max-w-[120px]">
                          {t.order?.table?.floor?.name || 'Main Hall'}
                        </span>
                      </div>
                      <span
                        className={`text-[11px] font-mono font-bold flex items-center gap-1 px-2 py-0.5 rounded-md ${
                          isUrgent
                            ? 'bg-rose-500 text-white animate-pulse'
                            : elapsed >= 6
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        <Timer className="w-3 h-3" />
                        <span>{elapsed}m ago</span>
                      </span>
                    </div>

                    {/* Dish & Quantity */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                            t.foodItem?.isVeg ? 'bg-emerald-400' : 'bg-rose-500'
                          }`}
                          title={t.foodItem?.isVeg ? 'Vegetarian' : 'Non-Vegetarian'}
                        ></span>
                        <h4 className="text-sm font-extrabold text-white leading-tight">
                          <span className="text-amber-400 font-black mr-1.5">{t.quantity}x</span>
                          {t.foodItem?.name}
                        </h4>
                      </div>
                    </div>

                    {/* Special Instructions Note */}
                    {t.specialInstructions && (
                      <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-start gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400 mt-0.5" />
                        <span className="leading-snug">{t.specialInstructions}</span>
                      </div>
                    )}

                    {/* Chef Selection for this ticket */}
                    <div className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-xl bg-slate-950/70 border border-slate-800">
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                        <ChefHat className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="font-semibold">Assign Chef:</span>
                      </div>
                      <select
                        value={itemChefMap[t.id] || selectedChefId}
                        onChange={(e) => setItemChefMap((prev) => ({ ...prev, [t.id]: e.target.value }))}
                        className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-0.5 text-xs text-amber-400 font-bold focus:outline-none cursor-pointer max-w-[150px] truncate"
                      >
                        {chefs.map((c: any) => (
                          <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80">
                      <button
                        onClick={() => handleAccept(t.id, itemChefMap[t.id] || selectedChefId)}
                        className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition border border-slate-700"
                      >
                        <Check className="w-3.5 h-3.5 text-slate-300" />
                        <span>Accept</span>
                      </button>
                      <button
                        onClick={() => handleStartPrep(t.id, itemChefMap[t.id] || selectedChefId)}
                        className="py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 transition shadow-md shadow-amber-500/20"
                      >
                        <Flame className="w-3.5 h-3.5" />
                        <span>Start Cooking</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ============================================================== */}
        {/* COLUMN 2: IN PREPARATION (ON FIRE)                             */}
        {/* ============================================================== */}
        <div className="h-full min-h-0 flex flex-col rounded-2xl glass-panel border border-amber-500/20 overflow-hidden bg-slate-900/40">
          {/* Fixed Column Header */}
          <div className="shrink-0 px-4 py-3 border-b border-slate-800/80 bg-slate-900/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-400 animate-pulse" />
              <h3 className="font-black text-sm text-amber-400 tracking-wide uppercase">
                2. In Preparation
              </h3>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500/10 text-amber-400 border border-amber-500/20">
              {preparingTasks.length}
            </span>
          </div>

          {/* Scrollable Item Stream */}
          <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
            {preparingTasks.length === 0 ? (
              <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-center p-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600 mb-2">
                  <Flame className="w-6 h-6" />
                </div>
                <p className="text-xs font-bold text-slate-400">No active cooking tickets</p>
                <p className="text-[11px] text-slate-600 mt-0.5">Start cooking accepted items from Column 1</p>
              </div>
            ) : (
              preparingTasks.map((t) => {
                const cookTime = getElapsedMinutes(t.startedAt || t.acceptedAt || t.createdAt);
                return (
                  <div
                    key={t.id}
                    className="p-3.5 rounded-2xl bg-slate-900/90 border border-amber-500/30 hover:border-amber-500/50 shadow-lg space-y-2.5 transition"
                  >
                    {/* Top Row: Table & Cooking Duration */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 font-black text-xs">
                          {t.order?.table?.tableNumber || 'Takeaway'}
                        </span>
                        <span className="text-[11px] text-slate-400 font-semibold truncate max-w-[120px]">
                          {t.order?.table?.floor?.name || 'Main Hall'}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 flex items-center gap-1">
                        <Flame className="w-3 h-3 text-amber-500" />
                        <span>Cooking {cookTime}m</span>
                      </span>
                    </div>

                    {/* Dish & Quantity */}
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                          t.foodItem?.isVeg ? 'bg-emerald-400' : 'bg-rose-500'
                        }`}
                        title={t.foodItem?.isVeg ? 'Vegetarian' : 'Non-Vegetarian'}
                      ></span>
                      <h4 className="text-sm font-extrabold text-white leading-tight">
                        <span className="text-amber-400 font-black mr-1.5">{t.quantity}x</span>
                        {t.foodItem?.name}
                      </h4>
                    </div>

                    {/* Chef Info & Reassign */}
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5 px-1 bg-slate-950/40 p-2 rounded-xl border border-slate-800">
                      <div className="flex items-center gap-1.5">
                        <ChefHat className="w-3.5 h-3.5 text-amber-400" />
                        <span>Cook: <strong className="text-amber-400 font-bold">{t.chef?.name || 'Chef Sanjeev'}</strong></span>
                      </div>
                      <div className="flex items-center gap-1">
                        <select
                          value={t.chefId || ''}
                          onChange={(e) => handleReassignChef(t.id, e.target.value)}
                          className="bg-slate-900 border border-slate-700 text-amber-300 text-[10px] rounded px-1.5 py-0.5 font-semibold focus:outline-none cursor-pointer"
                          title="Reassign Chef"
                        >
                          {chefs.map((c: any) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Special Instructions Note */}
                    {t.specialInstructions && (
                      <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-start gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400 mt-0.5" />
                        <span className="leading-snug">{t.specialInstructions}</span>
                      </div>
                    )}

                    {/* Ready Action Button */}
                    <div className="pt-1 border-t border-slate-800/80">
                      {t.status === 'ACCEPTED' ? (
                        <button
                          onClick={() => handleStartPrep(t.id)}
                          className="w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 transition shadow-md shadow-amber-500/20"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>Start Cooking</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleMarkReady(t.id)}
                          className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Mark Ready for Waiter Pickup</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ============================================================== */}
        {/* COLUMN 3: READY FOR WAITER PICKUP (PASS COUNTER)               */}
        {/* ============================================================== */}
        <div className="h-full min-h-0 flex flex-col rounded-2xl glass-panel border border-emerald-500/20 overflow-hidden bg-slate-900/40">
          {/* Fixed Column Header */}
          <div className="shrink-0 px-4 py-3 border-b border-slate-800/80 bg-slate-900/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
              <h3 className="font-black text-sm text-emerald-400 tracking-wide uppercase">
                3. Ready for Waiter Pickup
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {readyTasks.length} dishes
              </span>
            </div>
          </div>

          {/* Scrollable Item Stream (Never expands page height!) */}
          <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
            {readyTasks.length === 0 ? (
              <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-center p-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600 mb-2">
                  <CheckCheck className="w-6 h-6" />
                </div>
                <p className="text-xs font-bold text-slate-400">Pass counter is clear</p>
                <p className="text-[11px] text-slate-600 mt-0.5">Prepared dishes appear here for waiter pickup</p>
              </div>
            ) : readyViewMode === 'TABLE' ? (
              // GROUPED BY TABLE VIEW: Organizes all dishes by table neatly
              readyByTable.map((group, gIdx) => (
                <div
                  key={gIdx}
                  className="p-3.5 rounded-2xl bg-slate-900/95 border border-emerald-500/30 shadow-lg space-y-3"
                >
                  {/* Table Header */}
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-black text-xs">
                        Table {group.tableNumber}
                      </span>
                      <span className="text-[11px] text-slate-400 font-semibold truncate max-w-[120px]">
                        {group.floorName}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      Waiter: <strong className="text-white">{group.waiterName}</strong>
                    </span>
                  </div>

                  {/* List of dishes for this table */}
                  <div className="space-y-2">
                    {group.items.map((it) => {
                      const waitTime = getElapsedMinutes(it.readyAt || it.updatedAt);
                      return (
                        <div
                          key={it.id}
                          className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs hover:border-slate-700 transition"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 ${
                                it.foodItem?.isVeg ? 'bg-emerald-400' : 'bg-rose-500'
                              }`}
                            ></span>
                            <span className="font-extrabold text-white truncate">
                              <span className="text-amber-400 font-black mr-1">{it.quantity}x</span>
                              {it.foodItem?.name}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            <span className="text-[10px] font-mono text-slate-400">
                              {waitTime}m on pass
                            </span>
                            <button
                              onClick={() => handleMarkDelivered(it.id)}
                              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-400 font-bold text-[10px] transition border border-slate-700 flex items-center gap-1"
                              title="Mark this item delivered"
                            >
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span>Served</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Bulk Deliver All for this table */}
                  <button
                    onClick={() => handleDeliverAllForTable(group.items)}
                    className="w-full py-2 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold text-xs flex items-center justify-center gap-1.5 transition"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Mark All Table Dishes Served ({group.items.length})</span>
                  </button>
                </div>
              ))
            ) : (
              // SINGLE TICKET STREAM VIEW
              readyTasks.map((t) => {
                const waitTime = getElapsedMinutes(t.readyAt || t.updatedAt);
                return (
                  <div
                    key={t.id}
                    className="p-3.5 rounded-2xl bg-slate-900/90 border border-emerald-500/30 hover:border-emerald-500/60 shadow-lg space-y-2.5 transition"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-black text-xs">
                          {t.order?.table?.tableNumber || 'Takeaway'}
                        </span>
                        <span className="text-[11px] text-slate-400 font-semibold truncate max-w-[120px]">
                          {t.order?.table?.floor?.name || 'Main Hall'}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                        {waitTime}m ready
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                          t.foodItem?.isVeg ? 'bg-emerald-400' : 'bg-rose-500'
                        }`}
                      ></span>
                      <h4 className="text-sm font-extrabold text-white leading-tight">
                        <span className="text-amber-400 font-black mr-1.5">{t.quantity}x</span>
                        {t.foodItem?.name}
                      </h4>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                      <span>Cook: <strong className="text-amber-400 font-bold">{t.chef?.name || 'Chef'}</strong> • Waiter: <strong className="text-white">{t.order?.waiter?.name || 'Assigned'}</strong></span>
                      <span className="text-slate-500">Order #{t.order?.orderNumber?.slice(-4) || ''}</span>
                    </div>

                    <div className="pt-1 border-t border-slate-800/80">
                      <button
                        onClick={() => handleMarkDelivered(t.id)}
                        className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 transition"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        <span>Confirm Delivered to Table</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* DAILY FOOD AVAILABILITY SLIDE-OVER DRAWER */}
      {showAvailabilityDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg bg-slate-900 border-l border-slate-800 h-full flex flex-col p-5 space-y-4 shadow-2xl">
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center">
                  <Flame className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">Chef Stock & Availability</h3>
                  <p className="text-[11px] text-slate-400">Toggle Sold Out to immediately stop waiter orders</p>
                </div>
              </div>
              <button
                onClick={() => setShowAvailabilityDrawer(false)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search & Category Filter */}
            <div className="space-y-2.5">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={menuSearch}
                  onChange={(e) => setMenuSearch(e.target.value)}
                  placeholder="Search item name..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                <button
                  onClick={() => setAvailCategory('ALL')}
                  className={`px-3 py-1 rounded-lg font-bold shrink-0 transition ${
                    availCategory === 'ALL'
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-950 text-slate-400 hover:text-white'
                  }`}
                >
                  All ({menuItems.length})
                </button>
                {availCategories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setAvailCategory(cat)}
                    className={`px-3 py-1 rounded-lg font-bold shrink-0 transition ${
                      availCategory === cat
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-950 text-slate-400 hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Items List */}
            <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {filteredMenuItems.map((item) => {
                const isAvailable = item.availability?.isAvailable ?? true;
                return (
                  <div
                    key={item.id}
                    className={`p-3 rounded-2xl border flex items-center justify-between transition ${
                      isAvailable
                        ? 'bg-slate-950/80 border-slate-800/80'
                        : 'bg-rose-500/10 border-rose-500/30'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                          item.isVeg ? 'bg-emerald-400' : 'bg-rose-500'
                        }`}
                      ></span>
                      <div>
                        <h5 className="font-extrabold text-xs text-white leading-tight">{item.name}</h5>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-slate-400">{item.category?.name || 'General'}</span>
                          <span
                            className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded-full ${
                              isAvailable
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}
                          >
                            {isAvailable ? 'In Stock' : 'Sold Out'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleToggleAvailability(item)}
                      className="p-1 rounded-xl text-slate-300 hover:text-white transition"
                      title={isAvailable ? 'Click to mark Sold Out' : 'Click to mark Available'}
                    >
                      {isAvailable ? (
                        <ToggleRight className="w-8 h-8 text-emerald-400 hover:text-emerald-300" />
                      ) : (
                        <ToggleLeft className="w-8 h-8 text-rose-400 hover:text-rose-300" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Drawer Footer */}
            <div className="pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowAvailabilityDrawer(false)}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition"
              >
                Close Stock Panel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
