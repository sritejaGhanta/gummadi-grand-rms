import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { kitchenApi } from '../api/endpoints';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import {
  ChefHat,
  Clock,
  Search,
  CheckCircle2,
  UtensilsCrossed,
  Users,
  Flame,
  ArrowLeft,
  Calendar,
  Sparkles,
  RefreshCw,
  Receipt,
  Check,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export const ChefHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAdmin, isManager } = useAuth();
  const { lastEvent } = useSocket();

  const isChefUser = user?.role?.name?.toLowerCase() === 'chef';

  const [range, setRange] = useState<'today' | 'yesterday' | 'week' | 'month' | 'overall'>('today');
  const [dietary, setDietary] = useState<'ALL' | 'VEG' | 'NON_VEG'>('ALL');
  const [search, setSearch] = useState('');
  const [chefs, setChefs] = useState<any[]>([]);
  const [selectedChefId, setSelectedChefId] = useState<string>(isChefUser ? user?.id || '' : '');

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(7);

  const [historyData, setHistoryData] = useState<{
    range: string;
    rangeLabel: string;
    totalOrdersHandled: number;
    totalDishesPrepared: number;
    totalBatches: number;
    vegCount: number;
    nonVegCount: number;
    avgPrepMinutes: number;
    topDishes: any[];
    items: any[];
  }>({
    range: 'today',
    rangeLabel: 'Today',
    totalOrdersHandled: 0,
    totalDishesPrepared: 0,
    totalBatches: 0,
    vegCount: 0,
    nonVegCount: 0,
    avgPrepMinutes: 0,
    topDishes: [],
    items: [],
  });

  const [loading, setLoading] = useState(false);

  const loadChefs = async () => {
    if (isAdmin || isManager) {
      try {
        const list = await kitchenApi.getChefs();
        setChefs(list || []);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const loadHistory = async () => {
    setLoading(true);
    try {
      const res: any = await kitchenApi.getHistory({
        range,
        dietary: dietary === 'ALL' ? undefined : dietary,
        search: search.trim() || undefined,
        chefId: isChefUser ? user?.id : selectedChefId || undefined,
      });
      if (res) {
        setHistoryData(res);
      }
    } catch (e) {
      console.error('Failed to load kitchen history:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChefs();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    loadHistory();
  }, [range, dietary, selectedChefId]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      loadHistory();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // WebSocket real-time refresh when new dish is prepared
  useEffect(() => {
    if (!lastEvent) return;
    if (
      lastEvent.type === 'order:item_status_changed' ||
      lastEvent.type === 'billing:paid'
    ) {
      loadHistory();
    }
  }, [lastEvent]);

  // Pagination Calculations
  const totalItems = historyData.items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedItems = useMemo(() => {
    return historyData.items.slice(startIndex, startIndex + pageSize);
  }, [historyData.items, startIndex, pageSize]);

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return '--:--';
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="p-3 sm:p-6 space-y-5 max-w-full bg-slate-950 text-slate-100 min-h-screen">
      {/* HEADER BANNER */}
      <div className="glass-panel p-4 sm:p-6 rounded-3xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-start sm:items-center gap-3.5">
          <button
            onClick={() => navigate('/kitchen')}
            className="p-2.5 rounded-2xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 transition shrink-0"
            title="Back to Live KDS"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center shrink-0">
                <ChefHat className="w-4 h-4" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                {isChefUser
                  ? `My Cooking History (${user?.name || 'Chef'})`
                  : 'Chef Preparation History & Cooking Log'}
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {isChefUser
                ? 'Detailed record of food items prepared and completed specifically by you.'
                : 'Detailed audit trail of prepared dishes, cooking durations, table assignments, and kitchen metrics.'}
            </p>
          </div>
        </div>

        {/* Action Controls - Print Button Removed as requested */}
        <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
          <button
            onClick={() => navigate('/kitchen')}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition"
          >
            <Flame className="w-4 h-4" />
            <span>Open Live KDS</span>
          </button>
          <button
            onClick={loadHistory}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition"
            title="Refresh History"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Dishes Prepared */}
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>{isChefUser ? 'Dishes Cooked by Me' : 'Total Dishes Prepared'}</span>
            <UtensilsCrossed className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">
            {historyData.totalDishesPrepared} <span className="text-xs font-semibold text-slate-400">items</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-slate-400 flex-wrap">
            <span className="text-emerald-400 font-bold whitespace-nowrap">🟢 {historyData.vegCount} Veg</span>
            <span className="text-rose-400 font-bold whitespace-nowrap">🔴 {historyData.nonVegCount} Non-Veg</span>
          </div>
        </div>

        {/* Orders Completed */}
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Table Orders Handled</span>
            <Receipt className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">
            {historyData.totalOrdersHandled} <span className="text-xs font-semibold text-slate-400">tickets</span>
          </div>
          <p className="text-[11px] text-slate-400">Across {historyData.totalBatches} cook batches</p>
        </div>

        {/* Average Prep Speed */}
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Avg Cooking Duration</span>
            <Clock className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-400">
            ~{historyData.avgPrepMinutes} <span className="text-xs font-semibold text-slate-400">minutes</span>
          </div>
          <p className="text-[11px] text-slate-400">Ticket accept to pass counter</p>
        </div>

        {/* Selected Period */}
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Active Range</span>
            <Calendar className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-400">
            {historyData.rangeLabel}
          </div>
          <p className="text-[11px] text-slate-400">Filter applied to register below</p>
        </div>
      </div>

      {/* TOP MASTERED DISHES IN THIS PERIOD */}
      {historyData.topDishes && historyData.topDishes.length > 0 && (
        <div className="glass-panel p-4 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              {isChefUser ? 'My Most Prepared Dishes in this Period:' : 'Top Prepared Dishes in this Period:'}
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {historyData.topDishes.map((dish, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700/80 text-xs"
              >
                <span
                  className={`w-2 h-2 rounded-full ${dish.isVeg ? 'bg-emerald-500' : 'bg-rose-500'}`}
                />
                <span className="font-bold text-white">{dish.name}</span>
                <span className="px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-400 font-extrabold text-[10px]">
                  ×{dish.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FILTER & SEARCH TOOLBAR */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-md">
        {/* Left: Date Filter Tabs (Today | Yesterday | This Week | This Month | Overall) */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 overflow-x-auto max-w-full shrink-0 custom-scrollbar">
          <span className="text-[10px] uppercase font-bold text-slate-400 px-2 flex items-center gap-1 shrink-0 whitespace-nowrap">
            <Clock className="w-3 h-3 text-amber-500" /> Date:
          </span>
          {[
            { id: 'today', label: 'Today' },
            { id: 'yesterday', label: 'Yesterday' },
            { id: 'week', label: 'This Week' },
            { id: 'month', label: 'This Month' },
            { id: 'overall', label: 'Overall' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setRange(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 whitespace-nowrap ${
                range === tab.id
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Right: Dietary, Chef Selector (Admin only) & Search */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Dietary Filter */}
          <div className="flex items-center p-0.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold">
            <button
              onClick={() => setDietary('ALL')}
              className={`px-2.5 py-1 rounded-lg transition ${
                dietary === 'ALL' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setDietary('VEG')}
              className={`px-2 py-1 rounded-lg transition flex items-center gap-1 ${
                dietary === 'VEG' ? 'bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30' : 'text-slate-400 hover:text-emerald-400'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              Veg
            </button>
            <button
              onClick={() => setDietary('NON_VEG')}
              className={`px-2 py-1 rounded-lg transition flex items-center gap-1 ${
                dietary === 'NON_VEG' ? 'bg-rose-500/20 text-rose-400 font-bold border border-rose-500/30' : 'text-slate-400 hover:text-rose-400'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
              Non-Veg
            </button>
          </div>

          {/* Chef Selector dropdown - strictly for Admin / Manager only */}
          {!isChefUser && (isAdmin || isManager) && chefs.length > 0 && (
            <select
              value={selectedChefId}
              onChange={(e) => setSelectedChefId(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-500"
            >
              <option value="">All Kitchen Chefs</option>
              {chefs.map((c) => (
                <option key={c.id} value={c.id}>
                  Chef: {c.name || c.username}
                </option>
              ))}
            </select>
          )}

          {/* Search Box */}
          <div className="relative w-full sm:w-56">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search dish, table, order..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>
      </div>

      {/* DETAILED HISTORY LOG TABLE WITH PAGINATION */}
      <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-white">
              Prepared Dishes Audit Register
            </h2>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
              {totalItems} total records
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span>
              Period: <span className="text-amber-400 font-bold">{historyData.rangeLabel}</span>
            </span>
            <div className="flex items-center gap-1.5 pl-3 border-l border-slate-800">
              <span>Show:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-0.5 text-xs text-white focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value={5}>5 / page</option>
                <option value={7}>7 / page</option>
                <option value={10}>10 / page</option>
                <option value={20}>20 / page</option>
              </select>
            </div>
          </div>
        </div>

        {totalItems === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <UtensilsCrossed className="w-12 h-12 text-slate-600 mx-auto" />
            <p className="text-sm font-bold text-slate-300">
              {isChefUser ? 'No dishes prepared by you in this period' : 'No prepared dishes found for this period'}
            </p>
            <p className="text-xs text-slate-500">
              Try selecting a different date range (e.g. "This Week" or "Overall") or clear search filters.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full min-w-[700px] text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/80 text-[11px] uppercase font-bold text-slate-400 tracking-wider">
                    <th className="py-3 px-4">Dish & Category</th>
                    <th className="py-3 px-3">Portions</th>
                    <th className="py-3 px-3">Table & Floor</th>
                    <th className="py-3 px-3">Order #</th>
                    {!isChefUser && <th className="py-3 px-3">Chef</th>}
                    <th className="py-3 px-3">Waiter</th>
                    <th className="py-3 px-3">Prep Speed</th>
                    <th className="py-3 px-3">Timestamps</th>
                    <th className="py-3 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {paginatedItems.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-900/60 transition group"
                    >
                      {/* Dish & Category */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-start gap-2.5">
                          <span
                            className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${
                              item.isVeg ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}
                            title={item.isVeg ? 'Vegetarian' : 'Non-Vegetarian'}
                          />
                          <div>
                            <div className="font-bold text-white text-sm group-hover:text-amber-400 transition">
                              {item.dishName}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {item.categoryName}
                            </div>
                            {item.specialInstructions && (
                              <div className="mt-1 text-[10px] text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 inline-block font-semibold">
                                Note: {item.specialInstructions}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Portions */}
                      <td className="py-3.5 px-3">
                        <span className="px-2 py-1 rounded-lg bg-slate-800 border border-slate-700/80 font-black text-amber-400 text-xs">
                          × {item.quantity}
                        </span>
                      </td>

                      {/* Table & Floor */}
                      <td className="py-3.5 px-3">
                        <div className="font-bold text-white">{item.tableNumber}</div>
                        <div className="text-[11px] text-slate-400">{item.floorName}</div>
                      </td>

                      {/* Order # */}
                      <td className="py-3.5 px-3">
                        <span className="font-mono text-[11px] text-slate-300 bg-slate-900 px-2 py-1 rounded-md border border-slate-800">
                          {item.orderNumber}
                        </span>
                      </td>

                      {/* Chef (shown for Admin / Manager) */}
                      {!isChefUser && (
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-1.5 text-slate-200">
                            <ChefHat className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span className="font-semibold">{item.chefName}</span>
                          </div>
                        </td>
                      )}

                      {/* Waiter */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{item.waiterName}</span>
                        </div>
                      </td>

                      {/* Prep Duration */}
                      <td className="py-3.5 px-3">
                        {item.prepMinutes > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold text-[11px]">
                            <Clock className="w-3 h-3" />
                            {item.prepMinutes} min
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[11px]">Instant</span>
                        )}
                      </td>

                      {/* Timestamps */}
                      <td className="py-3.5 px-3">
                        <div className="space-y-0.5 text-[11px]">
                          <div className="text-slate-300 flex items-center gap-1">
                            <span className="text-slate-500">Ready:</span>
                            <span className="font-bold text-amber-400">{formatTime(item.readyAt)}</span>
                            <span className="text-[10px] text-slate-500">({formatDate(item.readyAt)})</span>
                          </div>
                          {item.deliveredAt && (
                            <div className="text-slate-400 flex items-center gap-1 text-[10px]">
                              <span className="text-slate-500">Served:</span>
                              <span>{formatTime(item.deliveredAt)}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4 text-right">
                        {item.status === 'DELIVERED' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <Check className="w-3 h-3" />
                            SERVED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            <CheckCircle2 className="w-3 h-3" />
                            READY (PASS)
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* PAGINATION CONTROLS */}
            <div className="p-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 bg-slate-900/40">
              <div>
                Showing <span className="font-bold text-white">{startIndex + 1}</span> to{' '}
                <span className="font-bold text-white">{Math.min(startIndex + pageSize, totalItems)}</span> of{' '}
                <span className="font-bold text-white">{totalItems}</span> prepared dishes
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-slate-200 transition flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => {
                    // Only show first, last, and around current page
                    if (pg === 1 || pg === totalPages || (pg >= currentPage - 1 && pg <= currentPage + 1)) {
                      return (
                        <button
                          key={pg}
                          onClick={() => setCurrentPage(pg)}
                          className={`w-7 h-7 rounded-lg text-xs font-bold transition ${
                            currentPage === pg
                              ? 'bg-amber-500 text-slate-950 shadow-sm'
                              : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                          }`}
                        >
                          {pg}
                        </button>
                      );
                    }
                    if (pg === currentPage - 2 || pg === currentPage + 2) {
                      return <span key={pg} className="px-1 text-slate-600">...</span>;
                    }
                    return null;
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages || totalItems === 0}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-slate-200 transition flex items-center gap-1"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
