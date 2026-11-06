import React, { useState, useEffect } from 'react';
import { floorsApi, tablesApi, menuApi, ordersApi, reportsApi } from '../api/endpoints';
import { useSocket } from '../context/SocketContext';
import { useSettings } from '../context/SettingsContext';
import {
  Users,
  Utensils,
  Plus,
  Minus,
  CheckCircle2,
  Clock,
  Send,
  Receipt,
  AlertCircle,
  Flame,
  Search,
  UtensilsCrossed,
  X,
  QrCode,
  ExternalLink,
  Printer,
} from 'lucide-react';

export const StaffPosPage: React.FC = () => {
  const { currency } = useSettings();
  const { lastEvent } = useSocket();

  const [floors, setFloors] = useState<any[]>([]);
  const [selectedFloorId, setSelectedFloorId] = useState<string>('');
  const [tables, setTables] = useState<any[]>([]);
  const [selectedTable, setSelectedTable] = useState<any | null>(null);

  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [dietFilter, setDietFilter] = useState<'all' | 'veg' | 'non-veg'>('all');
  const [mobileViewTab, setMobileViewTab] = useState<'menu' | 'cart'>('menu');
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Cart for new items
  const [cart, setCart] = useState<Record<string, { item: any; quantity: number; notes: string; portion?: string; unitPrice?: number }>>({});
  const [selectedItemPortions, setSelectedItemPortions] = useState<Record<string, string>>({});
  const [showQrStandModal, setShowQrStandModal] = useState(false);
  const [activeOrder, setActiveOrder] = useState<any | null>(null);
  const [subOrders, setSubOrders] = useState<any[]>([]);
  const [currentSubOrder, setCurrentSubOrder] = useState<string>('A');
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [isRequestingBill, setIsRequestingBill] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Table Shift & Merge
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [shiftDestTableId, setShiftDestTableId] = useState('');
  const [mergeSourceTableId, setMergeSourceTableId] = useState('');
  const [isShifting, setIsShifting] = useState(false);
  const [isMerging, setIsMerging] = useState(false);

  // Staff Performance Analytics
  const [staffAnalyticsRange, setStaffAnalyticsRange] = useState<'today' | 'yesterday' | 'week' | 'month' | 'overall'>('today');
  const [staffStats, setStaffStats] = useState<{
    ordersCompleted: number;
    ordersTaken: number;
    dishesServed: number;
    itemsDeliveredCount: number;
    totalSales: number;
    pendingDeliveries: number;
  }>({
    ordersCompleted: 0,
    ordersTaken: 0,
    dishesServed: 0,
    itemsDeliveredCount: 0,
    totalSales: 0,
    pendingDeliveries: 0,
  });
  const [loadingStaffStats, setLoadingStaffStats] = useState(false);

  const loadStaffStats = async (range = staffAnalyticsRange) => {
    try {
      setLoadingStaffStats(true);
      const res: any = await reportsApi.getStaffDashboard(range);
      if (res) {
        setStaffStats(res);
      }
    } catch (e) {
      console.error('Failed to load staff stats:', e);
    } finally {
      setLoadingStaffStats(false);
    }
  };

  useEffect(() => {
    loadStaffStats(staffAnalyticsRange);
  }, [staffAnalyticsRange]);

  // Load floors and categories
  const loadInitialData = async () => {
    try {
      const fList = await floorsApi.getFloors();
      setFloors(fList);
      if (fList.length > 0 && !selectedFloorId) {
        setSelectedFloorId(fList[0].id);
      }
      const cList = await menuApi.getCategories();
      setCategories(cList);
      const mList = await menuApi.getItems(undefined, true);
      setMenuItems(mList);
    } catch (e: any) {
      console.error(e);
    }
  };

  const [activeOrdersByTable, setActiveOrdersByTable] = useState<Record<string, any[]>>({});

  const loadTables = async () => {
    if (!selectedFloorId) return;
    try {
      const [tList, allOrders]: any = await Promise.all([
        tablesApi.getTables(selectedFloorId),
        ordersApi.getOrders('ACTIVE'),
      ]);
      setTables(tList || []);

      const orderList = Array.isArray(allOrders?.data || allOrders) ? (allOrders?.data || allOrders) : [];
      const map: Record<string, any[]> = {};
      for (const ord of orderList) {
        if (ord.tableId) {
          if (!map[ord.tableId]) map[ord.tableId] = [];
          map[ord.tableId].push(ord);
        }
      }
      setActiveOrdersByTable(map);

      // If selected table is among them, update it
      if (selectedTable) {
        const fresh = (tList || []).find((t: any) => t.id === selectedTable.id);
        if (fresh) setSelectedTable(fresh);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadActiveOrder = async (tableId: string, targetSub = 'A') => {
    setLoadingOrder(true);
    try {
      const [allRes, singleRes]: any = await Promise.all([
        ordersApi.getAllActiveByTable(tableId),
        ordersApi.getActiveByTable(tableId, targetSub),
      ]);
      const list = allRes?.data || allRes || [];
      const safeList = Array.isArray(list) ? list : [];
      setSubOrders(safeList);
      const ord = singleRes?.data || singleRes;
      setActiveOrder(ord?.id ? ord : null);
    } catch (e) {
      setActiveOrder(null);
      setSubOrders([]);
    } finally {
      setLoadingOrder(false);
    }
  };

  const handleSelectSubOrder = (sub: string) => {
    setCurrentSubOrder(sub);
    setCart({});
    if (selectedTable) {
      loadActiveOrder(selectedTable.id, sub);
    }
  };

  const handleStartSharedTableSubOrder = () => {
    const existing = subOrders.map((o) => (o.subOrder || 'A').toUpperCase());
    const alphabet = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    let nextLetter = 'B';
    for (const letter of alphabet) {
      if (!existing.includes(letter)) {
        nextLetter = letter;
        break;
      }
    }

    setCurrentSubOrder(nextLetter);
    setActiveOrder(null);
    setCart({});
    setActionSuccess(`Table ${selectedTable?.tableNumber}: Guest ${nextLetter} (Shared Seating) active! Select dishes to add to ticket.`);
    setTimeout(() => setActionSuccess(null), 3500);
  };

  const handleCancelDraftSubOrder = (letter: string) => {
    if (letter === currentSubOrder) {
      const existing = subOrders.map((o) => (o.subOrder || 'A').toUpperCase());
      const fallback = existing[0] || 'A';
      handleSelectSubOrder(fallback);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadTables();
  }, [selectedFloorId]);

  useEffect(() => {
    if (selectedTable) {
      setCurrentSubOrder('A');
      loadActiveOrder(selectedTable.id, 'A');
      setCart({});
    }
  }, [selectedTable?.id]);

  // Handle live WebSocket updates
  useEffect(() => {
    if (!lastEvent) return;
    if (lastEvent.type === 'table:status_updated') {
      loadTables();
    }
    if (
      lastEvent.type === 'order:created' ||
      lastEvent.type === 'order:item_status_changed' ||
      lastEvent.type === 'order:item_ready'
    ) {
      if (selectedTable) {
        loadActiveOrder(selectedTable.id);
      }
      loadTables();
      loadStaffStats(staffAnalyticsRange);
    }
    if (lastEvent.type === 'menu:availability_updated') {
      // Reload items to update Sold Out flags
      menuApi.getItems(undefined, true).then(setMenuItems);
    }
  }, [lastEvent, staffAnalyticsRange]);

  // Cart operations
  const addToCart = (item: any, explicitPortion?: string) => {
    if (item.availability && !item.availability.isAvailable) {
      setErrorMessage(`Cannot order "${item.name}" - Marked Sold Out by Chef!`);
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }
    const chosenPortion =
      explicitPortion ||
      selectedItemPortions[item.id] ||
      (item.portions && item.portions.length > 0 ? item.portions[0].name : 'Full');

    let unitPrice = Number(item.price);
    if (item.portions && Array.isArray(item.portions)) {
      const pMatch = item.portions.find((p: any) => p.name === chosenPortion);
      if (pMatch && pMatch.price) {
        unitPrice = Number(pMatch.price);
      }
    }
    const cartKey = `${item.id}_${chosenPortion}`;

    setCart((prev) => {
      const existing = prev[cartKey];
      const qty = existing ? existing.quantity + 1 : 1;
      return {
        ...prev,
        [cartKey]: {
          item,
          quantity: qty,
          notes: existing?.notes || '',
          portion: chosenPortion,
          unitPrice,
        },
      };
    });
  };

  const updateQuantity = (cartKey: string, delta: number) => {
    setCart((prev) => {
      const existing = prev[cartKey];
      if (!existing) return prev;
      const nextQty = existing.quantity + delta;
      if (nextQty <= 0) {
        const copy = { ...prev };
        delete copy[cartKey];
        return copy;
      }
      return {
        ...prev,
        [cartKey]: { ...existing, quantity: nextQty },
      };
    });
  };

  const updateItemNotes = (cartKey: string, notes: string) => {
    setCart((prev) => {
      const existing = prev[cartKey];
      if (!existing) return prev;
      return {
        ...prev,
        [cartKey]: { ...existing, notes },
      };
    });
  };

  const handleSendOrder = async () => {
    if (!selectedTable) return;
    const items = Object.values(cart).map((c) => ({
      foodItemId: c.item.id,
      quantity: c.quantity,
      portion: c.portion || 'Full',
      unitPrice: c.unitPrice || Number(c.item.price),
      specialInstructions: c.notes || undefined,
    }));

    if (items.length === 0) return;

    try {
      setErrorMessage(null);
      await ordersApi.createOrder({
        tableId: selectedTable.id,
        items,
        subOrder: currentSubOrder,
      });
      setCart({});
      setActionSuccess(`Order for Table ${selectedTable.tableNumber} (Guest ${currentSubOrder}) sent to kitchen!`);
      setTimeout(() => setActionSuccess(null), 3500);
      loadActiveOrder(selectedTable.id, currentSubOrder);
      loadTables();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit order');
    }
  };

  const handleMarkDelivered = async (itemId: string) => {
    try {
      await ordersApi.markItemDelivered(itemId);
      if (selectedTable) loadActiveOrder(selectedTable.id);
    } catch (e: any) {
      setErrorMessage(e.message);
    }
  };

  const handleCancelItem = async (itemId: string, itemName: string) => {
    const reason = window.prompt(`Enter cancellation reason for "${itemName}":`, 'Customer changed mind');
    if (reason === null) return;
    try {
      await ordersApi.cancelItem(itemId, reason);
      setActionSuccess(`"${itemName}" was cancelled. Bill total updated.`);
      setTimeout(() => setActionSuccess(null), 3500);
      if (selectedTable) {
        await loadActiveOrder(selectedTable.id);
        await loadTables();
      }
    } catch (e: any) {
      setErrorMessage(e.response?.data?.message || e.message || 'Failed to cancel item');
    }
  };

  const handleRequestBill = async () => {
    if (!selectedTable || isRequestingBill) return;
    setIsRequestingBill(true);
    try {
      await ordersApi.requestBill(selectedTable.id, {
        orderId: activeOrder?.id,
        subOrder: currentSubOrder,
      });
      setSelectedTable((prev: any) => (prev ? { ...prev, status: 'BILLING' } : null));
      setActionSuccess(`Bill requested for Guest ${currentSubOrder}! Manager notified.`);
      setTimeout(() => setActionSuccess(null), 3500);
      loadTables();
    } catch (e: any) {
      setErrorMessage(e.message);
    } finally {
      setIsRequestingBill(false);
    }
  };

  const handleShiftTable = async () => {
    if (!activeOrder || !shiftDestTableId) return;
    setIsShifting(true);
    try {
      const res = await ordersApi.transferTable(activeOrder.id, shiftDestTableId);
      setActionSuccess(res.data?.message || 'Table shifted successfully!');
      setShowShiftModal(false);
      setShiftDestTableId('');
      setSelectedTable(null);
      setActiveOrder(null);
      loadTables();
      setTimeout(() => setActionSuccess(null), 3500);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || err.message || 'Failed to shift table');
    } finally {
      setIsShifting(false);
    }
  };

  const handleMergeTable = async () => {
    if (!activeOrder || !mergeSourceTableId) return;
    setIsMerging(true);
    try {
      const res = await ordersApi.mergeTable(activeOrder.id, mergeSourceTableId);
      setActionSuccess(res.data?.message || 'Tables merged successfully!');
      setShowMergeModal(false);
      setMergeSourceTableId('');
      loadActiveOrder(selectedTable.id);
      loadTables();
      setTimeout(() => setActionSuccess(null), 3500);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || err.message || 'Failed to merge tables');
    } finally {
      setIsMerging(false);
    }
  };

  const filteredItems = menuItems.filter((item) => {
    const matchesCat = selectedCategory === 'all' || item.categoryId === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDiet =
      dietFilter === 'all' ||
      (dietFilter === 'veg' && item.isVeg === true) ||
      (dietFilter === 'non-veg' && item.isVeg === false);
    return matchesCat && matchesSearch && matchesDiet;
  });

  const cartTotal = Object.values(cart).reduce(
    (sum, c) => sum + Number(c.unitPrice || c.item.price) * c.quantity,
    0,
  );

  const existingSubs = subOrders.map((o) => (o.subOrder || 'A').toUpperCase());
  const allGuestLetters = Array.from(new Set([...existingSubs, currentSubOrder, 'A'])).sort();
  const subOrderMap = subOrders.reduce((acc: any, ord: any) => {
    const k = (ord.subOrder || 'A').toUpperCase();
    acc[k] = ord;
    return acc;
  }, {});

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)] overflow-hidden relative">
      {/* Mobile Screen Switcher Bar (only visible on mobile/tablet < lg) */}
      <div className="lg:hidden flex items-center bg-slate-900 border-b border-slate-800 p-2 gap-2 shrink-0">
        <button
          onClick={() => setMobileViewTab('menu')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            mobileViewTab === 'menu'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'bg-slate-800 text-slate-300'
          }`}
        >
          <Utensils className="w-4 h-4" />
          <span>Floors & Menu</span>
        </button>
        <button
          onClick={() => setMobileViewTab('cart')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            mobileViewTab === 'cart'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'bg-slate-800 text-slate-300'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>
            {selectedTable ? `Table ${selectedTable.tableNumber}` : 'Ticket'}
            {Object.keys(cart).length > 0 && ` (${Object.keys(cart).length})`}
          </span>
        </button>
      </div>

      {/* Center Main: Floor & Menu Section */}
      <div className={`flex-1 flex-col overflow-y-auto p-3 sm:p-6 space-y-6 ${mobileViewTab === 'menu' ? 'flex' : 'hidden lg:flex'}`}>
        {/* STAFF SERVICE & ORDERS PERFORMANCE SUMMARY */}
        <div className="glass-panel p-3.5 sm:p-4 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-md bg-slate-900/60">
          {/* Metrics: Orders Completed & Dishes Served */}
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center font-bold shrink-0">
                <Receipt className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Orders Completed</div>
                <div className="text-sm sm:text-base font-black text-white">
                  {staffStats.ordersCompleted} <span className="text-xs font-normal text-slate-400">/ {staffStats.ordersTaken} booked</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold shrink-0">
                <UtensilsCrossed className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Dishes Served</div>
                <div className="text-sm sm:text-base font-black text-white">
                  {staffStats.dishesServed} <span className="text-xs font-normal text-slate-400">items</span>
                </div>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center font-bold shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Ready in Kitchen</div>
                <div className="text-sm sm:text-base font-black text-white">
                  {staffStats.pendingDeliveries} <span className="text-xs font-normal text-slate-400">to pass</span>
                </div>
              </div>
            </div>
          </div>

          {/* Date Filter Buttons */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 overflow-x-auto max-w-full shrink-0 custom-scrollbar">
            <span className="text-[10px] uppercase font-bold text-slate-400 px-2 flex items-center gap-1 shrink-0 whitespace-nowrap">
              <Clock className="w-3 h-3 text-amber-500" /> Filter:
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
                onClick={() => setStaffAnalyticsRange(tab.id as any)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition shrink-0 whitespace-nowrap ${
                  staffAnalyticsRange === tab.id
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Floor Selection */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span>Restaurant Floors & Tables</span>
            </h2>
            <span className="text-xs text-slate-400">Tap table to view or place order</span>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2">
            {floors.map((floor) => (
              <button
                key={floor.id}
                onClick={() => setSelectedFloorId(floor.id)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  selectedFloorId === floor.id
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {floor.name}
              </button>
            ))}
          </div>

          {/* Tables Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 mt-3">
            {tables.map((t) => {
              const isSelected = selectedTable?.id === t.id;
              const tableOrders = activeOrdersByTable[t.id] || [];
              const isShared = tableOrders.length > 1;
              let statusBadge = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
              let statusLabel = 'Available';
              if (t.status === 'OCCUPIED') {
                statusBadge = 'bg-amber-500/20 text-amber-400 border-amber-500/30';
                statusLabel = isShared ? `Shared (${tableOrders.length})` : 'Occupied';
              } else if (t.status === 'BILLING') {
                statusBadge = 'bg-blue-500/20 text-blue-400 border-blue-500/30';
                statusLabel = 'Billing';
              }

              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedTable(t)}
                  className={`p-3 sm:p-4 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/10'
                      : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1.5 mb-1.5">
                    <span className="font-black text-xs sm:text-sm text-white whitespace-nowrap">{t.tableNumber}</span>
                    <span
                      className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${statusBadge}`}
                    >
                      {statusLabel}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400 mt-2">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />
                      <span>{t.seatingCapacity} Seats</span>
                    </div>
                    {tableOrders.length > 0 && (
                      <span className="text-[10px] font-mono font-bold text-amber-400">
                        {tableOrders.map((o) => `G-${o.subOrder || 'A'}`).join(', ')}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Menu Ordering Section */}
        {selectedTable && (
          <div className="pt-4 border-t border-slate-800 space-y-4">
            {/* Dining Guests & Table Sharing Control Bar */}
            <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-md bg-gradient-to-r from-slate-900 via-indigo-950/20 to-slate-900">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center font-black text-sm shrink-0">
                  {selectedTable.tableNumber?.replace(/\D/g, '') || 'T'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-black text-white text-sm sm:text-base leading-none">
                      {selectedTable.tableNumber}
                    </h4>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-800 text-slate-300 border border-slate-700">
                      {selectedTable.seatingCapacity} Seats
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowQrStandModal(true)}
                      className="px-2 py-0.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 text-[10px] font-bold flex items-center gap-1 transition shadow-sm"
                      title="View Acrylic QR Stand"
                    >
                      <QrCode className="w-3 h-3" />
                      <span>Acrylic QR Stand</span>
                    </button>
                    {subOrders.length > 1 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        🤝 Shared Table ({subOrders.length} Parties)
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-amber-400 font-semibold mt-1 flex items-center gap-1.5 flex-wrap">
                    <span>Taking order for:</span>
                    <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-black text-xs">
                      Guest {currentSubOrder}
                    </span>
                    {subOrderMap[currentSubOrder] ? (
                      <span className="text-[11px] text-slate-400 font-normal">
                        (Active Order • {currency}{subOrderMap[currentSubOrder].totalAmount})
                      </span>
                    ) : (
                      <span className="text-[11px] text-emerald-400 font-normal">
                        (New Party Seated • Select Menu Items)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Guest Tabs & Share Table Button */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] uppercase font-bold text-slate-400 hidden sm:inline mr-1">
                  Parties:
                </span>
                {allGuestLetters.map((letter) => {
                  const order = subOrderMap[letter];
                  const isCurrent = currentSubOrder === letter;
                  const isDraft = !order;

                  return (
                    <div key={letter} className="relative flex items-center">
                      <button
                        onClick={() => handleSelectSubOrder(letter)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                          isCurrent
                            ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 ring-2 ring-amber-400'
                            : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700'
                        }`}
                      >
                        <span>Guest {letter}</span>
                        {order ? (
                          <span
                            className={`text-[10px] font-mono ${
                              isCurrent ? 'text-slate-950 font-black' : 'text-amber-400'
                            }`}
                          >
                            {currency}{order.totalAmount}
                          </span>
                        ) : (
                          <span
                            className={`text-[10px] ${
                              isCurrent ? 'text-slate-950 font-bold' : 'text-emerald-400 font-medium'
                            }`}
                          >
                            (New)
                          </span>
                        )}
                      </button>
                      {isDraft && letter !== 'A' && (
                        <button
                          onClick={() => handleCancelDraftSubOrder(letter)}
                          className="ml-1 text-slate-500 hover:text-rose-400 p-0.5 rounded-full"
                          title="Discard Party"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}

                {/* Share Table Button */}
                <button
                  onClick={handleStartSharedTableSubOrder}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-1 shadow-md shadow-indigo-600/20"
                  title="Seat another guest party at this table (Shared Seating)"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Share Table</span>
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Utensils className="w-5 h-5 text-amber-500" />
                  <span>Dishes for Guest {currentSubOrder} (Table {selectedTable.tableNumber})</span>
                </h3>
                <p className="text-xs text-slate-400">Select dishes to add to Guest {currentSubOrder}'s ticket</p>
              </div>

              {/* Search */}
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search dishes..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Filter Row: Categories + Diet Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Category Filter Pills */}
              <div className="flex gap-2 overflow-x-auto pb-1 max-w-full">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                    selectedCategory === 'all'
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  All Menu
                </button>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCategory(c.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                      selectedCategory === c.id
                        ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                        : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>

              {/* Diet Filter Pills: All | 🟢 Veg | 🔴 Non-Veg */}
              <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900 border border-slate-700/80 shrink-0 self-start sm:self-auto">
                <button
                  onClick={() => setDietFilter('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                    dietFilter === 'all'
                      ? 'bg-amber-500 text-slate-950 shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setDietFilter('veg')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                    dietFilter === 'veg'
                      ? 'bg-emerald-600 text-white shadow'
                      : 'text-slate-400 hover:text-emerald-400'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span>Veg</span>
                </button>
                <button
                  onClick={() => setDietFilter('non-veg')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                    dietFilter === 'non-veg'
                      ? 'bg-rose-600 text-white shadow'
                      : 'text-slate-400 hover:text-rose-400'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                  <span>Non-Veg</span>
                </button>
              </div>
            </div>

            {/* Food Items Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {filteredItems.map((item) => {
                const isSoldOut = item.availability && !item.availability.isAvailable;
                const itemCartEntries = Object.entries(cart).filter(([k]) => k.startsWith(item.id));
                const totalInCartQty = itemCartEntries.reduce((sum, [, c]) => sum + c.quantity, 0);
                const currentPortion = selectedItemPortions[item.id] || (item.portions && item.portions.length > 0 ? item.portions[0].name : 'Full');
                let displayPrice = Number(item.price);
                if (item.portions && Array.isArray(item.portions)) {
                  const pMatch = item.portions.find((p: any) => p.name === currentPortion);
                  if (pMatch && pMatch.price) displayPrice = Number(pMatch.price);
                }

                return (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-2xl border transition flex flex-col justify-between ${
                      isSoldOut
                        ? 'border-slate-800 bg-slate-900/30 opacity-60 cursor-not-allowed'
                        : 'border-slate-800 bg-slate-900/70 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-2.5 h-2.5 rounded-full ${
                              item.isVeg ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}
                            title={item.isVeg ? 'Vegetarian' : 'Non-Vegetarian'}
                          ></span>
                          <span className="font-bold text-sm text-white leading-tight">
                            {item.name}
                          </span>
                        </div>
                        {isSoldOut ? (
                          <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 shrink-0">
                            Sold Out
                          </span>
                        ) : (
                          <span className="font-bold text-amber-400 text-sm shrink-0">
                            {currency}{displayPrice}
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                          {item.description}
                        </p>
                      )}

                      {/* Portion selection buttons */}
                      {item.portions && item.portions.length > 0 && !isSoldOut && (
                        <div className="mt-2.5 flex flex-wrap gap-1">
                          {item.portions.map((p: any) => {
                            const isSel = currentPortion === p.name;
                            return (
                              <button
                                key={p.name}
                                type="button"
                                onClick={() =>
                                  setSelectedItemPortions((prev) => ({ ...prev, [item.id]: p.name }))
                                }
                                className={`px-2 py-0.5 rounded text-[10px] font-bold border transition ${
                                  isSel
                                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                                }`}
                              >
                                {p.name} ₹{p.price}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-800/60">
                      <div className="text-[10px] text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{item.preparationTimeMinutes} min</span>
                      </div>
                      {!isSoldOut && (
                        <div className="flex items-center gap-2">
                          {totalInCartQty > 0 && (
                            <span className="text-xs font-bold text-amber-400 px-2 py-0.5 bg-amber-500/10 rounded-lg border border-amber-500/20">
                              {totalInCartQty} in cart
                            </span>
                          )}
                          <button
                            onClick={() => addToCart(item, currentPortion)}
                            className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1 shadow-md shadow-amber-500/10 transition"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Right Drawer: Table Order Status & Cart */}
      <div className={`w-full lg:w-96 bg-slate-900 border-l border-slate-800 flex-col shrink-0 overflow-y-auto p-4 space-y-4 ${mobileViewTab === 'cart' ? 'flex' : 'hidden lg:flex'}`}>
        {actionSuccess && (
          <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {!selectedTable ? (
          <div className="text-center py-16 text-slate-500 space-y-2">
            <Utensils className="w-10 h-10 mx-auto opacity-30" />
            <p className="text-sm">Select any table from the floor map to take orders or view active status.</p>
          </div>
        ) : (
          <>
            {/* Table Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="font-bold text-white text-base">
                  Table {selectedTable.tableNumber}{' '}
                  <span className="text-xs text-amber-400 font-mono">
                    (Guest {currentSubOrder})
                  </span>
                </h3>
                <p className="text-xs text-slate-400">{selectedTable.floor?.name}</p>
              </div>
              <span
                className={`text-xs uppercase font-bold px-2.5 py-1 rounded-full border ${
                  selectedTable.status === 'AVAILABLE'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : selectedTable.status === 'BILLING'
                    ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                    : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                }`}
              >
                {selectedTable.status}
              </span>
            </div>

            {/* Shared Table / Sub-Orders Switcher */}
            <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400 shrink-0">Party:</span>
              {allGuestLetters.map((letter) => {
                const order = subOrderMap[letter];
                const isCurrent = currentSubOrder === letter;
                const isDraft = !order;

                return (
                  <div key={letter} className="relative flex items-center">
                    <button
                      key={letter}
                      onClick={() => handleSelectSubOrder(letter)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                        isCurrent
                          ? 'bg-amber-500 text-slate-950 shadow-sm ring-1 ring-amber-400'
                          : 'bg-slate-800 text-slate-300 hover:text-white'
                      }`}
                    >
                      <span>Guest {letter}</span>
                      {order ? (
                        <span className="text-[10px] font-mono opacity-80">
                          {currency}{order.totalAmount}
                        </span>
                      ) : (
                        <span className={`text-[10px] ${isCurrent ? 'text-slate-950 font-bold' : 'text-emerald-400'}`}>
                          (New)
                        </span>
                      )}
                    </button>
                    {isDraft && letter !== 'A' && (
                      <button
                        onClick={() => handleCancelDraftSubOrder(letter)}
                        className="ml-0.5 text-slate-500 hover:text-rose-400 p-0.5"
                        title="Discard draft"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}

              {/* Share Table button (add sub-order) */}
              <button
                onClick={handleStartSharedTableSubOrder}
                className="px-2 py-1 rounded-lg bg-indigo-600/30 text-indigo-300 hover:bg-indigo-600/50 border border-indigo-500/30 text-[10px] font-bold transition flex items-center gap-1 ml-auto"
                title="Seat another guest at this table (Shared Seating)"
              >
                <Plus className="w-3 h-3" />
                <span>+ Share Table</span>
              </button>
            </div>

            {/* Active Order in Kitchen */}
            {activeOrder && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300">Active Order: {activeOrder.orderNumber}</span>
                  <span className="text-amber-400 font-semibold">{currency}{activeOrder.totalAmount}</span>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {activeOrder.items?.map((it: any) => {
                    const isReady = it.status === 'READY';
                    const isDelivered = it.status === 'DELIVERED';
                    const isCancelled = it.status === 'CANCELLED';
                    return (
                      <div
                        key={it.id}
                        className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                          isCancelled
                            ? 'bg-rose-950/20 border-rose-500/30 opacity-60'
                            : isReady
                            ? 'bg-emerald-500/10 border-emerald-500/30'
                            : isDelivered
                            ? 'bg-slate-800/40 border-slate-800 opacity-70'
                            : 'bg-slate-800/60 border-slate-700/60'
                        }`}
                      >
                        <div>
                          <div className={`font-semibold text-white ${isCancelled ? 'line-through text-slate-400' : ''}`}>
                            {it.quantity}x {it.foodItem?.name}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Status:{' '}
                            <strong className={`uppercase ${isCancelled ? 'text-rose-400' : 'text-amber-400'}`}>
                              {it.status}
                            </strong>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {isReady && !isCancelled && (
                            <button
                              onClick={() => handleMarkDelivered(it.id)}
                              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-[10px] transition shadow-md shadow-amber-500/20"
                            >
                              Mark Delivered
                            </button>
                          )}
                          {!isDelivered && !isCancelled && (
                            <button
                              onClick={() => handleCancelItem(it.id, it.foodItem?.name || 'Item')}
                              className="px-2 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold rounded-lg text-[10px] transition flex items-center gap-1"
                              title="Cancel item for customer"
                            >
                              <X className="w-3 h-3" />
                              <span>Cancel</span>
                            </button>
                          )}
                          {isCancelled && (
                            <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[9px] font-bold">
                              Cancelled
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Request Bill Button & Table Shift/Merge */}
                <div className="space-y-1.5">
                  <button
                    onClick={handleRequestBill}
                    disabled={isRequestingBill}
                    className="w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20 transition disabled:opacity-50"
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    {isRequestingBill ? 'Requesting...' : `Request Bill for Guest ${currentSubOrder}`}
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowShiftModal(true)}
                      className="flex-1 py-1.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 font-semibold text-xs flex items-center justify-center gap-1 transition"
                    >
                      🔀 Shift Table
                    </button>
                    <button
                      onClick={() => setShowMergeModal(true)}
                      className="flex-1 py-1.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 font-semibold text-xs flex items-center justify-center gap-1 transition"
                    >
                      🔗 Merge Table
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Current Cart */}
            <div className="pt-3 border-t border-slate-800 flex-1 flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  New Order Ticket — Guest {currentSubOrder}
                </h4>

                {Object.keys(cart).length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-4 text-center">
                    Select dishes from the menu to send to the kitchen.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-[550px] overflow-y-auto pr-1">
                    {Object.entries(cart).map(([cartKey, c]) => (
                      <div
                        key={cartKey}
                        className="p-2 rounded-xl bg-slate-800/60 border border-slate-700/50 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-white">{c.item.name}</span>
                            {c.portion && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                                {c.portion}
                              </span>
                            )}
                          </div>
                          <span className="font-bold text-amber-400">
                            {currency}{((c.unitPrice || c.item.price) * c.quantity).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <input
                            type="text"
                            placeholder="Special note (e.g. less spicy)"
                            value={c.notes}
                            onChange={(e) => updateItemNotes(cartKey, e.target.value)}
                            className="w-3/5 px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-[10px] text-white placeholder-slate-500 focus:outline-none"
                          />
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateQuantity(cartKey, -1)}
                              className="w-5 h-5 rounded bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center"
                            >
                              <Minus className="w-2.5 h-2.5" />
                            </button>
                            <span className="font-bold text-amber-400">{c.quantity}</span>
                            <button
                              onClick={() => updateQuantity(cartKey, 1)}
                              className="w-5 h-5 rounded bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center"
                            >
                              <Plus className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {Object.keys(cart).length > 0 && (
                <div className="pt-3 border-t border-slate-800 mt-4 space-y-3">
                  <div className="flex justify-between text-sm font-bold">
                    <span className="text-slate-300">Subtotal:</span>
                    <span className="text-amber-400">{currency}{cartTotal.toFixed(2)}</span>
                  </div>
                  <button
                    onClick={handleSendOrder}
                    className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 shadow-xl shadow-amber-500/25 transition"
                  >
                    <Send className="w-4 h-4" />
                    <span>Send Order for Guest {currentSubOrder} to Kitchen</span>
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Floating Mobile Cart / Ticket Bar */}
      {mobileViewTab === 'menu' && (Object.keys(cart).length > 0 || (selectedTable && activeOrder)) && (
        <div className="lg:hidden fixed bottom-4 inset-x-4 z-30 p-3 rounded-2xl bg-amber-500 text-slate-950 shadow-2xl flex items-center justify-between font-bold">
          <div>
            <div className="text-[11px] uppercase tracking-wide opacity-80">
              {selectedTable ? `Table ${selectedTable.tableNumber} (Guest ${currentSubOrder})` : 'Dining Table'} • {Object.keys(cart).length} New Items
            </div>
            <div className="text-base font-extrabold">{currency}{cartTotal.toFixed(2)}</div>
          </div>
          <button
            onClick={() => setMobileViewTab('cart')}
            className="px-4 py-2 rounded-xl bg-slate-950 text-white text-xs font-bold flex items-center gap-1.5 shadow"
          >
            <span>View Ticket</span>
            <Utensils className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      {/* Shift Table Modal */}
      {showShiftModal && selectedTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">
              Shift Table: <span className="text-indigo-400">Table {selectedTable.tableNumber}</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Select an available table to transfer this active order:
            </p>

            <div className="space-y-3">
              <select
                value={shiftDestTableId}
                onChange={(e) => setShiftDestTableId(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
              >
                <option value="">Select destination table...</option>
                {tables
                  .filter((t) => t.status === 'AVAILABLE' && t.id !== selectedTable.id)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      Table {t.tableNumber} ({t.capacity} seats)
                    </option>
                  ))}
              </select>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowShiftModal(false)}
                  className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!shiftDestTableId || isShifting}
                  onClick={handleShiftTable}
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-500 transition disabled:opacity-50"
                >
                  {isShifting ? 'Shifting...' : 'Confirm Shift'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Merge Table Modal */}
      {showMergeModal && selectedTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">
              Merge Table into: <span className="text-amber-400">Table {selectedTable.tableNumber}</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Select another occupied table to merge into this table:
            </p>

            <div className="space-y-3">
              <select
                value={mergeSourceTableId}
                onChange={(e) => setMergeSourceTableId(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
              >
                <option value="">Select source occupied table...</option>
                {tables
                  .filter((t) => t.status === 'OCCUPIED' && t.id !== selectedTable.id)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      Table {t.tableNumber} (Active Order)
                    </option>
                  ))}
              </select>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMergeModal(false)}
                  className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!mergeSourceTableId || isMerging}
                  onClick={handleMergeTable}
                  className="rounded-xl bg-amber-600 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-amber-500/25 hover:bg-amber-500 transition disabled:opacity-50"
                >
                  {isMerging ? 'Merging...' : 'Confirm Merge'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Acrylic QR Stand Modal for Diners */}
      {showQrStandModal && selectedTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl relative">
            <button
              onClick={() => setShowQrStandModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-3">
              <div className="inline-block px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-black uppercase tracking-widest">
                Acrylic Table Stand
              </div>
              <h3 className="text-xl font-black text-white">Table {selectedTable.tableNumber}</h3>
              <p className="text-xs text-slate-400">
                Contactless Dine-In QR Ordering. Diners scan and order from their phones.
              </p>

              {/* QR Stand Card Mockup */}
              <div className="bg-white p-5 rounded-2xl shadow-xl mx-auto w-48 text-slate-950 flex flex-col items-center border-4 border-amber-500">
                <div className="text-[10px] font-black uppercase tracking-wider text-amber-700">
                  AharPOS Smart Dining
                </div>
                <div className="text-sm font-black mt-0.5">Table {selectedTable.tableNumber}</div>

                {/* QR Symbol Graphic */}
                <div className="my-3 p-2 bg-slate-50 border-2 border-slate-900 rounded-xl">
                  <div className="w-24 h-24 bg-slate-900 rounded-lg flex flex-col items-center justify-center text-white p-1">
                    <QrCode className="w-16 h-16 text-amber-400" />
                    <span className="text-[8px] font-mono tracking-tighter text-slate-300">
                      SCAN TO ORDER
                    </span>
                  </div>
                </div>

                <p className="text-[9px] font-bold text-center text-slate-700 leading-tight">
                  Point camera to browse photo menu & select portions!
                </p>
              </div>

              {/* Quick Actions */}
              <div className="pt-2 space-y-2">
                <a
                  href={`/restaurant/qr/gummadi-grand/${selectedTable.tableNumber}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition shadow"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Customer Digital Menu</span>
                </a>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Acrylic Stand Card</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
