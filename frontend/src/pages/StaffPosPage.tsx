import React, { useState, useEffect } from 'react';
import { floorsApi, tablesApi, menuApi, ordersApi } from '../api/endpoints';
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
  const [cart, setCart] = useState<Record<string, { item: any; quantity: number; notes: string }>>({});
  const [activeOrder, setActiveOrder] = useState<any | null>(null);
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [isRequestingBill, setIsRequestingBill] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  const loadTables = async () => {
    if (!selectedFloorId) return;
    try {
      const tList = await tablesApi.getTables(selectedFloorId);
      setTables(tList);
      // If selected table is among them, update it
      if (selectedTable) {
        const fresh = tList.find((t: any) => t.id === selectedTable.id);
        if (fresh) setSelectedTable(fresh);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadActiveOrder = async (tableId: string) => {
    setLoadingOrder(true);
    try {
      const order = await ordersApi.getActiveByTable(tableId);
      setActiveOrder(order || null);
    } catch (e) {
      setActiveOrder(null);
    } finally {
      setLoadingOrder(false);
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
      loadActiveOrder(selectedTable.id);
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
    }
    if (lastEvent.type === 'menu:availability_updated') {
      // Reload items to update Sold Out flags
      menuApi.getItems(undefined, true).then(setMenuItems);
    }
  }, [lastEvent]);

  // Cart operations
  const addToCart = (item: any) => {
    if (item.availability && !item.availability.isAvailable) {
      setErrorMessage(`Cannot order "${item.name}" - Marked Sold Out by Chef!`);
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }
    setCart((prev) => {
      const existing = prev[item.id];
      const qty = existing ? existing.quantity + 1 : 1;
      return {
        ...prev,
        [item.id]: { item, quantity: qty, notes: existing?.notes || '' },
      };
    });
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart((prev) => {
      const existing = prev[itemId];
      if (!existing) return prev;
      const nextQty = existing.quantity + delta;
      if (nextQty <= 0) {
        const copy = { ...prev };
        delete copy[itemId];
        return copy;
      }
      return {
        ...prev,
        [itemId]: { ...existing, quantity: nextQty },
      };
    });
  };

  const updateItemNotes = (itemId: string, notes: string) => {
    setCart((prev) => {
      const existing = prev[itemId];
      if (!existing) return prev;
      return {
        ...prev,
        [itemId]: { ...existing, notes },
      };
    });
  };

  const handleSendOrder = async () => {
    if (!selectedTable) return;
    const items = Object.values(cart).map((c) => ({
      foodItemId: c.item.id,
      quantity: c.quantity,
      specialInstructions: c.notes || undefined,
    }));

    if (items.length === 0) return;

    try {
      setErrorMessage(null);
      await ordersApi.createOrder({
        tableId: selectedTable.id,
        items,
      });
      setCart({});
      setActionSuccess('Order sent to kitchen in real-time!');
      setTimeout(() => setActionSuccess(null), 3500);
      loadActiveOrder(selectedTable.id);
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

  const handleRequestBill = async () => {
    if (!selectedTable || isRequestingBill) return;
    if (selectedTable.status === 'BILLING') {
      setActionSuccess('Bill has already been requested for this table.');
      return;
    }
    setIsRequestingBill(true);
    try {
      await ordersApi.requestBill(selectedTable.id);
      setSelectedTable((prev: any) => (prev ? { ...prev, status: 'BILLING' } : null));
      setActionSuccess('Bill generation requested! Manager notified.');
      setTimeout(() => setActionSuccess(null), 3500);
      loadTables();
    } catch (e: any) {
      setErrorMessage(e.message);
    } finally {
      setIsRequestingBill(false);
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
    (sum, c) => sum + Number(c.item.price) * c.quantity,
    0,
  );

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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mt-3">
            {tables.map((t) => {
              const isSelected = selectedTable?.id === t.id;
              let statusBadge = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
              let statusLabel = 'Available';
              if (t.status === 'OCCUPIED') {
                statusBadge = 'bg-amber-500/20 text-amber-400 border-amber-500/30';
                statusLabel = 'Occupied';
              } else if (t.status === 'BILLING') {
                statusBadge = 'bg-blue-500/20 text-blue-400 border-blue-500/30';
                statusLabel = 'Billing';
              }

              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedTable(t)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/10'
                      : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-lg text-white">{t.tableNumber}</span>
                    <span
                      className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${statusBadge}`}
                    >
                      {statusLabel}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-2">
                    <Users className="w-3.5 h-3.5" />
                    <span>{t.seatingCapacity} Seats</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Menu Ordering Section */}
        {selectedTable && (
          <div className="pt-4 border-t border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Utensils className="w-5 h-5 text-amber-500" />
                  <span>Menu for Table {selectedTable.tableNumber}</span>
                </h3>
                <p className="text-xs text-slate-400">Select dishes to add to table ticket</p>
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
                const inCartQty = cart[item.id]?.quantity || 0;

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
                            {currency}{item.price}
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                          {item.description}
                        </p>
                      )}
                    </div>

                    <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-800/60">
                      <div className="text-[10px] text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{item.preparationTimeMinutes} min</span>
                      </div>
                      {!isSoldOut && (
                        <div className="flex items-center gap-2">
                          {inCartQty > 0 && (
                            <>
                              <button
                                onClick={() => updateQuantity(item.id, -1)}
                                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center transition"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="text-xs font-bold text-amber-400 w-4 text-center">
                                {inCartQty}
                              </span>
                            </>
                          )}
                          <button
                            onClick={() => addToCart(item)}
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
                <h3 className="font-bold text-white text-base">Table {selectedTable.tableNumber}</h3>
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
                    return (
                      <div
                        key={it.id}
                        className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                          isReady
                            ? 'bg-emerald-500/10 border-emerald-500/30'
                            : isDelivered
                            ? 'bg-slate-800/40 border-slate-800 opacity-60'
                            : 'bg-slate-800/60 border-slate-700/60'
                        }`}
                      >
                        <div>
                          <div className="font-semibold text-white">
                            {it.quantity}x {it.foodItem?.name}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Status: <strong className="uppercase text-amber-400">{it.status}</strong>
                          </div>
                        </div>

                        {isReady && (
                          <button
                            onClick={() => handleMarkDelivered(it.id)}
                            className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-[10px] transition shadow-md shadow-emerald-500/20"
                          >
                            Mark Delivered
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Request Bill Button */}
                {selectedTable.status === 'OCCUPIED' && (
                  <button
                    onClick={handleRequestBill}
                    disabled={isRequestingBill}
                    className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-blue-600/20 transition disabled:opacity-50"
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    {isRequestingBill ? 'Requesting...' : 'Request Bill Settlement'}
                  </button>
                )}
                {selectedTable.status === 'BILLING' && (
                  <div className="w-full py-2 px-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 font-semibold text-xs flex items-center justify-center gap-1.5">
                    <Receipt className="w-3.5 h-3.5" />
                    🧾 Bill requested — awaiting manager settlement
                  </div>
                )}
              </div>
            )}

            {/* Current Cart */}
            <div className="pt-3 border-t border-slate-800 flex-1 flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  New Order Ticket
                </h4>

                {Object.keys(cart).length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-4 text-center">
                    Select dishes from the menu to send to the kitchen.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-[550px] overflow-y-auto pr-1">
                    {Object.values(cart).map((c) => (
                      <div
                        key={c.item.id}
                        className="p-2 rounded-xl bg-slate-800/60 border border-slate-700/50 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-white">{c.item.name}</span>
                          <span className="font-bold text-amber-400">
                            {currency}{(c.item.price * c.quantity).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <input
                            type="text"
                            placeholder="Special note (e.g. less spicy)"
                            value={c.notes}
                            onChange={(e) => updateItemNotes(c.item.id, e.target.value)}
                            className="w-3/5 px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-[10px] text-white placeholder-slate-500 focus:outline-none"
                          />
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateQuantity(c.item.id, -1)}
                              className="w-5 h-5 rounded bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center"
                            >
                              <Minus className="w-2.5 h-2.5" />
                            </button>
                            <span className="font-bold text-amber-400">{c.quantity}</span>
                            <button
                              onClick={() => updateQuantity(c.item.id, 1)}
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
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 shadow-xl shadow-amber-500/25 transition"
                  >
                    <Send className="w-4 h-4" />
                    <span>Send Order to Kitchen</span>
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Floating Mobile Cart / Ticket Bar */}
      {mobileViewTab === 'menu' && (Object.keys(cart).length > 0 || (selectedTable && activeOrder)) && (
        <div className="lg:hidden fixed bottom-4 inset-x-4 z-30 p-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-2xl flex items-center justify-between font-bold">
          <div>
            <div className="text-[11px] uppercase tracking-wide opacity-80">
              {selectedTable ? `Table ${selectedTable.tableNumber}` : 'Dining Table'} • {Object.keys(cart).length} New Items
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
    </div>
  );
};
