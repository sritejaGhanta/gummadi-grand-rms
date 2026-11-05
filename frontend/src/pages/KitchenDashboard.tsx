import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
  RefreshCw,
  Layers,
  UtensilsCrossed,
  Timer,
  Grid,
  List,
  CheckCheck,
  History,
  X,
  FastForward,
  Bell,
} from 'lucide-react';

export const KitchenDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { lastEvent } = useSocket();
  const [tasks, setTasks] = useState<any[]>([]);

  // Live Kitchen Clock
  const [currentTime, setCurrentTime] = useState<string>(
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  );

  // Audio Alerts (Default Sound always ON)
  const soundEnabled = true;

  // Filter & Search Controls
  const [searchQuery, setSearchQuery] = useState('');
  const [dietaryFilter, setDietaryFilter] = useState<'ALL' | 'VEG' | 'NON_VEG'>('ALL');
  const [selectedFloor, setSelectedFloor] = useState<string>('ALL');
  const [readyViewMode, setReadyViewMode] = useState<'TABLE' | 'STREAM'>('TABLE');
  const [mobileTab, setMobileTab] = useState<'INCOMING' | 'PREPARING' | 'READY'>('INCOMING');

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
  const [incomingAlert, setIncomingAlert] = useState<{ title: string; subtitle: string; time: string } | null>(null);

  // Sound chime using Web Audio API
  const playChime = () => {
    if (!soundEnabled) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const now = ctx.currentTime;
      // High-audibility two-tone KDS chime (E5 -> A5 Ding-Dong)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      const gain2 = ctx.createGain();

      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(587.33, now); // D5
      osc1.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5
      gain1.gain.setValueAtTime(0.45, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.5);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1174.66, now + 0.18); // D6
      gain2.gain.setValueAtTime(0.4, now + 0.18);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.18);
      osc2.stop(now + 0.8);
    } catch (e) {
      console.warn('Audio chime error:', e);
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
        if (user?.role?.name?.toLowerCase() === 'chef') {
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
        const orderInfo = lastEvent.data;
        const tbl = orderInfo?.table?.tableNumber || orderInfo?.tableNumber || 'Takeaway';
        const ordNum = orderInfo?.orderNumber || '';
        const count = orderInfo?.items?.length || 1;
        setIncomingAlert({
          title: `🔥 NEW KOT ORDER: Table ${tbl}`,
          subtitle: `Order #${ordNum} (${count} item${count > 1 ? 's' : ''}) sent to kitchen!`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        });
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

  const handleAcceptAllForTable = async (items: any[]) => {
    try {
      await Promise.all(
        items.map((i) =>
          kitchenApi.acceptItem(i.id, itemChefMap[i.id] || selectedChefId || undefined)
        )
      );
      setActionSuccess('All incoming table items accepted!');
      setTimeout(() => setActionSuccess(null), 2500);
      loadTasks();
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleStartPrepAllForTable = async (items: any[]) => {
    try {
      await Promise.all(
        items.map((i) =>
          kitchenApi.startPreparing(i.id, itemChefMap[i.id] || selectedChefId || undefined)
        )
      );
      setActionSuccess('All table dishes started cooking!');
      setTimeout(() => setActionSuccess(null), 2500);
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
      setActionSuccess('All dishes for table served & cleared.');
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

  // Group pending tasks by table for TABLE GRID VIEW
  const incomingByTable = useMemo(() => {
    const map: Record<
      string,
      {
        tableId: string;
        tableNumber: string;
        floorName: string;
        waiterName: string;
        oldestCreatedAt: string;
        items: any[];
      }
    > = {};

    for (const t of pendingTasks) {
      const tableKey = t.order?.tableId || t.order?.id || 'takeaway';
      if (!map[tableKey]) {
        map[tableKey] = {
          tableId: tableKey,
          tableNumber: t.order?.table?.tableNumber || 'Takeaway',
          floorName: t.order?.table?.floor?.name || 'Main Hall',
          waiterName: t.order?.waiter?.name || 'Assigned Waiter',
          oldestCreatedAt: t.createdAt,
          items: [],
        };
      }
      map[tableKey].items.push(t);
      if (new Date(t.createdAt).getTime() < new Date(map[tableKey].oldestCreatedAt).getTime()) {
        map[tableKey].oldestCreatedAt = t.createdAt;
      }
    }
    return Object.values(map);
  }, [pendingTasks]);

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
      {/* INCOMING KOT BANNER POPUP */}
      {incomingAlert && (
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 text-white shadow-2xl flex items-center justify-between gap-3 animate-pulse shrink-0 border-2 border-white/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0 shadow-inner">
              <Flame className="w-6 h-6 text-yellow-300 animate-bounce" />
            </div>
            <div>
              <h4 className="font-black text-sm tracking-wide text-white">{incomingAlert.title}</h4>
              <p className="text-xs text-amber-100 font-medium">{incomingAlert.subtitle} • {incomingAlert.time}</p>
            </div>
          </div>
          <button
            onClick={() => setIncomingAlert(null)}
            className="px-3 py-1.5 rounded-xl bg-black/40 hover:bg-black/60 text-white font-bold text-xs border border-white/25 transition shadow"
          >
            Acknowledge ✕
          </button>
        </div>
      )}

      {/* Toast Alert */}
      {actionSuccess && (
        <div className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-bold flex items-center gap-2 shadow-xl shrink-0 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* TOP COMMAND BAR */}
      <div className="glass-panel p-2.5 sm:p-4 rounded-2xl border border-slate-800 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-lg">
        {/* Left: Title & Live Clock */}
        <div className="flex items-center justify-between sm:justify-start gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-md">
              <ChefHat className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base lg:text-lg font-black text-white tracking-wide">
                  Kitchen Display System (KDS)
                </h2>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>LIVE</span>
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <span className="font-mono text-amber-400 font-bold flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-500" />
                  {currentTime}
                </span>
                <span className="hidden xs:inline">• Head Line Station</span>
              </div>
            </div>
          </div>

          {/* Quick Refresh on mobile */}
          <button
            onClick={loadTasks}
            className="sm:hidden p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition"
            title="Refresh Orders"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Center: Live Pipeline Status Counters (Desktop) */}
        <div className="hidden lg:flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
            <span className="text-xs font-bold text-rose-400">
              {incomingByTable.length} Tables ({pendingTasks.length} Dishes)
            </span>
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

        {/* Right Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          {/* Test Bell Button */}
          <button
            onClick={() => {
              playChime();
              setActionSuccess('🔔 Bell Sound Tested & Audio Enabled!');
              setTimeout(() => setActionSuccess(null), 3000);
            }}
            className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold text-xs flex items-center gap-1.5 border border-amber-500/30 transition shadow-sm"
            title="Click to test Kitchen Bell Audio"
          >
            <Bell className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Test Bell</span>
          </button>

          {/* Active Chef Selector */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-slate-900 border border-slate-700/80">
            <ChefHat className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <select
              value={selectedChefId}
              onChange={(e) => {
                setSelectedChefId(e.target.value);
                localStorage.setItem('kds_active_chef_id', e.target.value);
              }}
              className="bg-transparent text-[11px] font-bold text-amber-400 focus:outline-none cursor-pointer max-w-[110px] sm:max-w-[140px] truncate"
            >
              {chefs.map((c: any) => (
                <option key={c.id} value={c.id} className="bg-slate-900 text-white font-medium">
                  {c.name} {user?.id === c.id ? '(You)' : ''}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setShowAvailabilityDrawer(true)}
            className="px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-1 shadow-sm transition"
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Stock</span>
          </button>

          <button
            onClick={() => navigate('/kitchen/history')}
            className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 border border-slate-700/80 font-bold text-xs flex items-center gap-1 transition"
          >
            <History className="w-3.5 h-3.5 text-amber-500" />
            <span>History</span>
          </button>

          <button
            onClick={loadTasks}
            className="hidden sm:flex p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition"
            title="Refresh Orders"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* FILTER & SEARCH SUBBAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1 shrink-0 text-xs">
        {/* Left: Dietary Filters & Floor Filter */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="flex items-center p-0.5 rounded-xl bg-slate-900 border border-slate-800">
            <button
              onClick={() => setDietaryFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg font-bold transition text-xs ${
                dietaryFilter === 'ALL'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setDietaryFilter('VEG')}
              className={`px-2.5 py-1 rounded-lg font-bold transition text-xs flex items-center gap-1 ${
                dietaryFilter === 'VEG'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>Veg</span>
            </button>
            <button
              onClick={() => setDietaryFilter('NON_VEG')}
              className={`px-2.5 py-1 rounded-lg font-bold transition text-xs flex items-center gap-1 ${
                dietaryFilter === 'NON_VEG'
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
              <span>Non-Veg</span>
            </button>
          </div>

          {floors.length > 0 && (
            <select
              value={selectedFloor}
              onChange={(e) => setSelectedFloor(e.target.value)}
              className="px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 font-semibold focus:outline-none focus:border-amber-500 cursor-pointer text-xs"
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
          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search dish or table #..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 text-xs"
            />
          </div>

          {/* Toggle for Ready Column View */}
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

      {/* MOBILE STAGE TABS: INCOMING | COOKING | READY (Visible only on mobile/tablet < lg) */}
      <div className="lg:hidden flex items-center p-1 rounded-2xl bg-slate-900 border border-slate-800 shrink-0 gap-1 shadow-md">
        <button
          onClick={() => setMobileTab('INCOMING')}
          className={`flex-1 py-2 px-1.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition ${
            mobileTab === 'INCOMING'
              ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-rose-400"></span>
          <span>1. Incoming ({incomingByTable.length})</span>
        </button>
        <button
          onClick={() => setMobileTab('PREPARING')}
          className={`flex-1 py-2 px-1.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition ${
            mobileTab === 'PREPARING'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Flame className="w-3.5 h-3.5" />
          <span>2. Cooking ({preparingTasks.length})</span>
        </button>
        <button
          onClick={() => setMobileTab('READY')}
          className={`flex-1 py-2 px-1.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition ${
            mobileTab === 'READY'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>3. Ready ({readyTasks.length})</span>
        </button>
      </div>

      {/* RESPONSIVE KDS BOARD:
          DESKTOP (lg): Side-by-side Table Grid + Stacked Right Column
          MOBILE (< lg): 100% Full-Height Active Stage Tab */}
      <div className="flex-1 min-h-0 flex flex-col lg:grid lg:grid-cols-12 gap-3.5 md:gap-4 overflow-hidden">
        {/* ============================================================== */}
        {/* LEFT SECTION (lg:col-span-7 xl:col-span-8): INCOMING ORDERS TABLE GRID */}
        {/* ============================================================== */}
        <div
          className={`lg:col-span-7 xl:col-span-8 h-full min-h-0 flex-col rounded-2xl glass-panel border border-rose-500/20 overflow-hidden bg-slate-900/40 shadow-xl ${
            mobileTab === 'INCOMING' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {/* Fixed Column Header */}
          <div className="shrink-0 px-4 py-3 border-b border-slate-800/80 bg-slate-900/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
              <h3 className="font-black text-sm text-rose-400 tracking-wide uppercase flex items-center gap-2">
                <span>1. Incoming Orders</span>
                <span className="text-[11px] font-bold text-slate-400 normal-case">
                  (Table-Wise Grid)
                </span>
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-500/10 text-rose-400 border border-rose-500/20">
                {incomingByTable.length} Tables • {pendingTasks.length} Dishes
              </span>
            </div>
          </div>

          {/* Scrollable Table Grid Area */}
          <div className="flex-1 min-h-0 overflow-y-auto p-3.5 custom-scrollbar">
            {incomingByTable.length === 0 ? (
              <div className="h-full min-h-[260px] flex flex-col items-center justify-center text-center p-6">
                <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600 mb-3">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <p className="text-sm font-bold text-slate-300">All caught up!</p>
                <p className="text-xs text-slate-500 mt-1">No incoming orders from any table right now.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {incomingByTable.map((group) => {
                  const elapsed = getElapsedMinutes(group.oldestCreatedAt);
                  const isUrgent = elapsed >= 10;
                  return (
                    <div
                      key={group.tableId}
                      className={`rounded-2xl border transition shadow-xl flex flex-col justify-between overflow-hidden ${
                        isUrgent
                          ? 'bg-rose-950/20 border-rose-500/60 shadow-rose-500/10'
                          : 'bg-slate-900/95 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {/* Table Card Header */}
                      <div className="p-3 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 font-black text-xs">
                            {group.tableNumber?.startsWith('Table')
                              ? group.tableNumber
                              : `Table ${group.tableNumber}`}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-400 truncate max-w-[110px]">
                            {group.floorName}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-400 font-medium">
                            {group.waiterName}
                          </span>
                          <span
                            className={`text-[10px] font-mono font-bold flex items-center gap-1 px-2 py-0.5 rounded-lg ${
                              isUrgent
                                ? 'bg-rose-500 text-white animate-pulse'
                                : elapsed >= 5
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            <Timer className="w-3 h-3" />
                            <span>{elapsed}m</span>
                          </span>
                        </div>
                      </div>

                      {/* Items Stream inside this Table */}
                      <div className="p-3 space-y-2.5 flex-1 min-h-0">
                        {group.items.map((t) => (
                          <div
                            key={t.id}
                            className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2 hover:border-slate-700 transition"
                          >
                            {/* Dish & Quantity */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`w-2 h-2 rounded-full shrink-0 ${
                                    t.foodItem?.isVeg ? 'bg-emerald-400' : 'bg-rose-500'
                                  }`}
                                  title={t.foodItem?.isVeg ? 'Vegetarian' : 'Non-Vegetarian'}
                                ></span>
                                <h4 className="text-xs font-black text-white leading-tight">
                                  <span className="text-amber-400 font-black mr-1.5">{t.quantity}x</span>
                                  {t.foodItem?.name}
                                </h4>
                              </div>
                            </div>

                            {/* Special Instructions */}
                            {t.specialInstructions && (
                              <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-medium flex items-start gap-1">
                                <AlertTriangle className="w-3 h-3 shrink-0 text-amber-400 mt-0.5" />
                                <span>{t.specialInstructions}</span>
                              </div>
                            )}

                            {/* Dish Level Actions & Chef Select */}
                            <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-slate-800/60">
                              <select
                                value={itemChefMap[t.id] || selectedChefId}
                                onChange={(e) =>
                                  setItemChefMap((prev) => ({ ...prev, [t.id]: e.target.value }))
                                }
                                className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-amber-400 font-semibold focus:outline-none cursor-pointer max-w-[130px] truncate"
                              >
                                {chefs.map((c: any) => (
                                  <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                                    {c.name}
                                  </option>
                                ))}
                              </select>

                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() =>
                                    handleAccept(t.id, itemChefMap[t.id] || selectedChefId)
                                  }
                                  className="py-1 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[11px] flex items-center gap-1 transition border border-slate-700"
                                >
                                  <Check className="w-3 h-3 text-slate-300" />
                                  <span>Accept</span>
                                </button>
                                <button
                                  onClick={() =>
                                    handleStartPrep(t.id, itemChefMap[t.id] || selectedChefId)
                                  }
                                  className="py-1 px-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-[11px] flex items-center gap-1 transition shadow-sm"
                                >
                                  <Flame className="w-3 h-3" />
                                  <span>Cook</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Table Level Batch Actions */}
                      <div className="p-2.5 border-t border-slate-800 bg-slate-950/70 grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleAcceptAllForTable(group.items)}
                          className="py-1.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[11px] flex items-center justify-center gap-1 transition border border-slate-700"
                        >
                          <Check className="w-3.5 h-3.5 text-slate-300" />
                          <span>Accept All ({group.items.length})</span>
                        </button>
                        <button
                          onClick={() => handleStartPrepAllForTable(group.items)}
                          className="py-1.5 px-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-[11px] flex items-center justify-center gap-1 transition shadow-sm"
                        >
                          <Flame className="w-3.5 h-3.5" />
                          <span>Cook All ({group.items.length})</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ============================================================== */}
        {/* RIGHT SECTION (lg:col-span-5 xl:col-span-4): STACKED UP & DOWN */}
        {/* ============================================================== */}
        <div
          className={`lg:col-span-5 xl:col-span-4 flex-col gap-3.5 h-full min-h-0 overflow-hidden ${
            mobileTab !== 'INCOMING' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {/* ============================================================== */}
          {/* TOP RIGHT (UP): 2. IN PREPARATION                              */}
          {/* ============================================================== */}
          <div
            className={`flex-1 min-h-0 flex-col rounded-2xl glass-panel border border-amber-500/20 overflow-hidden bg-slate-900/40 shadow-xl ${
              mobileTab === 'READY' ? 'hidden lg:flex' : 'flex'
            }`}
          >
            {/* Fixed Header */}
            <div className="shrink-0 px-4 py-2.5 border-b border-slate-800/80 bg-slate-900/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400 animate-pulse" />
                <h3 className="font-black text-sm text-amber-400 tracking-wide uppercase">
                  2. In Preparation
                </h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500/10 text-amber-400 border border-amber-500/20">
                {preparingTasks.length} Cooking
              </span>
            </div>

            {/* Scrollable Item Stream */}
            <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
              {preparingTasks.length === 0 ? (
                <div className="h-full min-h-[140px] flex flex-col items-center justify-center text-center p-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600 mb-1.5">
                    <Flame className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-slate-400">No active cooking tickets</p>
                  <p className="text-[10px] text-slate-600 mt-0.5">Start cooking accepted items from left table grid</p>
                </div>
              ) : (
                preparingTasks.map((t) => {
                  const cookTime = getElapsedMinutes(t.startedAt || t.acceptedAt || t.createdAt);
                  return (
                    <div
                      key={t.id}
                      className="p-3 rounded-2xl bg-slate-900/90 border border-amber-500/30 hover:border-amber-500/50 shadow-md space-y-2 transition"
                    >
                      {/* Top Row: Table & Cooking Duration */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 font-black text-xs">
                            {t.order?.table?.tableNumber || 'Takeaway'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold truncate max-w-[100px]">
                            {t.order?.table?.floor?.name || 'Main Hall'}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 flex items-center gap-1">
                          <Flame className="w-3 h-3 text-amber-500" />
                          <span>Cooking {cookTime}m</span>
                        </span>
                      </div>

                      {/* Dish & Quantity */}
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            t.foodItem?.isVeg ? 'bg-emerald-400' : 'bg-rose-500'
                          }`}
                        ></span>
                        <h4 className="text-xs font-extrabold text-white leading-tight">
                          <span className="text-amber-400 font-black mr-1">{t.quantity}x</span>
                          {t.foodItem?.name}
                        </h4>
                      </div>

                      {/* Chef Info */}
                      <div className="flex items-center justify-between text-[10px] text-slate-400 bg-slate-950/40 px-2 py-1 rounded-lg border border-slate-800">
                        <div className="flex items-center gap-1">
                          <ChefHat className="w-3 h-3 text-amber-400" />
                          <span>Cook: <strong className="text-amber-400 font-bold">{t.chef?.name || 'Chef Sanjeev'}</strong></span>
                        </div>
                        <select
                          value={t.chefId || ''}
                          onChange={(e) => handleReassignChef(t.id, e.target.value)}
                          className="bg-slate-900 border border-slate-700 text-amber-300 text-[10px] rounded px-1.5 py-0.5 font-semibold focus:outline-none cursor-pointer"
                        >
                          {chefs.map((c: any) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Ready Action Button */}
                      <div className="pt-0.5">
                        {t.status === 'ACCEPTED' ? (
                          <button
                            onClick={() => handleStartPrep(t.id)}
                            className="w-full py-1.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 transition shadow-sm"
                          >
                            <Play className="w-3.5 h-3.5" />
                            <span>Start Cooking</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleMarkReady(t.id)}
                            className="w-full py-1.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 transition"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Mark Ready for Pass</span>
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
          {/* BOTTOM RIGHT (DOWN): 3. READY FOR WAITER PICKUP                */}
          {/* ============================================================== */}
          <div
            className={`flex-1 min-h-0 flex-col rounded-2xl glass-panel border border-emerald-500/20 overflow-hidden bg-slate-900/40 shadow-xl ${
              mobileTab === 'PREPARING' ? 'hidden lg:flex' : 'flex'
            }`}
          >
            {/* Fixed Header */}
            <div className="shrink-0 px-4 py-2.5 border-b border-slate-800/80 bg-slate-900/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                <h3 className="font-black text-sm text-emerald-400 tracking-wide uppercase">
                  3. Ready for Waiter Pickup
                </h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {readyTasks.length} Dishes
              </span>
            </div>

            {/* Scrollable Ready Stream */}
            <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
              {readyTasks.length === 0 ? (
                <div className="h-full min-h-[140px] flex flex-col items-center justify-center text-center p-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600 mb-1.5">
                    <CheckCheck className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-slate-400">Pass counter is clear</p>
                  <p className="text-[10px] text-slate-600 mt-0.5">Prepared dishes appear here for waiter pickup</p>
                </div>
              ) : readyViewMode === 'TABLE' ? (
                // GROUPED BY TABLE VIEW
                readyByTable.map((group, gIdx) => (
                  <div
                    key={gIdx}
                    className="p-3 rounded-2xl bg-slate-900/95 border border-emerald-500/30 shadow-md space-y-2.5"
                  >
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-black text-xs">
                          {group.tableNumber?.startsWith('Table')
                            ? group.tableNumber
                            : `Table ${group.tableNumber}`}
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold truncate max-w-[100px]">
                          {group.floorName}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        Waiter: <strong className="text-white">{group.waiterName}</strong>
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {group.items.map((it) => {
                        const waitTime = getElapsedMinutes(it.readyAt || it.updatedAt);
                        return (
                          <div
                            key={it.id}
                            className="p-2 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center gap-1.5 truncate">
                              <span
                                className={`w-2 h-2 rounded-full shrink-0 ${
                                  it.foodItem?.isVeg ? 'bg-emerald-400' : 'bg-rose-500'
                                }`}
                              ></span>
                              <span className="font-extrabold text-white text-[11px] truncate">
                                <span className="text-amber-400 font-black mr-1">{it.quantity}x</span>
                                {it.foodItem?.name}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 ml-2">
                              <span className="text-[9px] font-mono text-slate-400">
                                {waitTime}m on pass
                              </span>
                              <button
                                onClick={() => handleMarkDelivered(it.id)}
                                className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-400 font-bold text-[10px] transition border border-slate-700 flex items-center gap-1"
                              >
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span>Served</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => handleDeliverAllForTable(group.items)}
                      className="w-full py-1.5 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold text-[11px] flex items-center justify-center gap-1.5 transition"
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
                      className="p-3 rounded-2xl bg-slate-900/90 border border-emerald-500/30 hover:border-emerald-500/60 shadow-md space-y-2 transition"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-black text-xs">
                            {t.order?.table?.tableNumber || 'Takeaway'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold truncate max-w-[100px]">
                            {t.order?.table?.floor?.name || 'Main Hall'}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                          {waitTime}m ready
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            t.foodItem?.isVeg ? 'bg-emerald-400' : 'bg-rose-500'
                          }`}
                        ></span>
                        <h4 className="text-xs font-extrabold text-white leading-tight">
                          <span className="text-amber-400 font-black mr-1">{t.quantity}x</span>
                          {t.foodItem?.name}
                        </h4>
                      </div>

                      <div className="pt-0.5">
                        <button
                          onClick={() => handleMarkDelivered(t.id)}
                          className="w-full py-1.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 transition"
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
