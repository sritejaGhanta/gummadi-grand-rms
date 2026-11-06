import React, { useState, useEffect } from 'react';
import {
  Boxes,
  AlertTriangle,
  Plus,
  RefreshCw,
  Search,
  ArrowUpDown,
  BookOpen,
  History,
  CheckCircle,
  PackageCheck,
  TrendingDown,
  Trash2,
} from 'lucide-react';
import { inventoryApi, menuApi } from '../api/endpoints';

export const InventoryManagementPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'STOCK' | 'RECIPES' | 'LOGS'>('STOCK');
  const [items, setItems] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [foodItems, setFoodItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Adjust stock modal
  const [adjustModalItem, setAdjustModalItem] = useState<any | null>(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustType, setAdjustType] = useState('PURCHASE');
  const [adjustReason, setAdjustReason] = useState('');

  // Add Item modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItem, setNewItem] = useState({
    name: '',
    category: 'Meat & Poultry',
    unit: 'kg',
    currentStock: '',
    minAlertThreshold: '5',
    costPerUnit: '',
  });

  // Recipe Mapping state
  const [selectedFoodItem, setSelectedFoodItem] = useState<string>('');
  const [currentRecipe, setCurrentRecipe] = useState<any[]>([]);
  const [newIngredient, setNewIngredient] = useState({ inventoryItemId: '', quantityRequired: '0.1' });

  const loadData = async () => {
    try {
      setLoading(true);
      const [itemsRes, alertsRes, foodsRes] = await Promise.all([
        inventoryApi.getItems(),
        inventoryApi.getAlerts(),
        menuApi.getItems(undefined, true),
      ]);
      setItems(itemsRes.data?.data || itemsRes.data || []);
      setAlerts(alertsRes.data?.data || alertsRes.data || []);
      setFoodItems(foodsRes.data?.data || foodsRes.data || []);
    } catch (err) {
      console.error('Failed to load inventory', err);
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async () => {
    try {
      const res = await inventoryApi.getLogs();
      setLogs(res.data?.data || res.data || []);
    } catch (err) {
      console.error('Failed to load logs', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeTab === 'LOGS') loadLogs();
  }, [activeTab]);

  // Load recipe when food item selected
  useEffect(() => {
    if (selectedFoodItem) {
      inventoryApi.getRecipe(selectedFoodItem).then((res) => {
        setCurrentRecipe(res.data?.data || res.data || []);
      });
    } else {
      setCurrentRecipe([]);
    }
  }, [selectedFoodItem]);

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustModalItem || !adjustQty) return;
    try {
      await inventoryApi.adjustStock(adjustModalItem.id, {
        quantity: parseFloat(adjustQty),
        changeType: adjustType,
        reason: adjustReason,
      });
      setAdjustModalItem(null);
      setAdjustQty('');
      setAdjustReason('');
      loadData();
    } catch (err) {
      console.error('Failed to adjust stock', err);
    }
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await inventoryApi.createItem({
        ...newItem,
        currentStock: parseFloat(newItem.currentStock) || 0,
        minAlertThreshold: parseFloat(newItem.minAlertThreshold) || 5,
        costPerUnit: parseFloat(newItem.costPerUnit) || 0,
      });
      setShowAddModal(false);
      setNewItem({
        name: '',
        category: 'Meat & Poultry',
        unit: 'kg',
        currentStock: '',
        minAlertThreshold: '5',
        costPerUnit: '',
      });
      loadData();
    } catch (err) {
      console.error('Failed to create item', err);
    }
  };

  const handleAddIngredientToRecipe = async () => {
    if (!selectedFoodItem || !newIngredient.inventoryItemId || !newIngredient.quantityRequired) return;
    const inv = items.find((i) => i.id === newIngredient.inventoryItemId);
    const updated = [
      ...currentRecipe,
      {
        inventoryItemId: newIngredient.inventoryItemId,
        inventoryItem: inv,
        quantityRequired: parseFloat(newIngredient.quantityRequired),
        unit: inv?.unit || 'kg',
      },
    ];
    try {
      await inventoryApi.saveRecipe(
        selectedFoodItem,
        updated.map((r) => ({
          inventoryItemId: r.inventoryItemId,
          quantityRequired: r.quantityRequired,
          unit: r.unit,
        })),
      );
      setCurrentRecipe(updated);
      setNewIngredient({ inventoryItemId: '', quantityRequired: '0.1' });
    } catch (err) {
      console.error('Failed to save recipe ingredient', err);
    }
  };

  const handleRemoveIngredient = async (idx: number) => {
    const updated = currentRecipe.filter((_, i) => i !== idx);
    try {
      await inventoryApi.saveRecipe(
        selectedFoodItem,
        updated.map((r) => ({
          inventoryItemId: r.inventoryItemId,
          quantityRequired: r.quantityRequired,
          unit: r.unit,
        })),
      );
      setCurrentRecipe(updated);
    } catch (err) {
      console.error('Failed to remove ingredient', err);
    }
  };

  const filteredItems = items.filter((it) => {
    const matchesSearch = it.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || it.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ['ALL', 'Meat & Poultry', 'Dairy', 'Grains & Cereals', 'Vegetables', 'Spices & Oils'];

  return (
    <div className="space-y-6 p-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Boxes className="h-7 w-7 text-indigo-400" />
            <h1 className="text-2xl font-bold tracking-tight text-white">Inventory & Raw Materials</h1>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Real-time kitchen ingredient tracking, recipe deduction, and low-stock alerts
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-500 transition"
          >
            <Plus className="h-4 w-4" /> Add Raw Material
          </button>
        </div>
      </div>

      {/* Low Stock Alerts Banner */}
      {alerts.length > 0 && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-amber-200">
                Low Stock Warning: {alerts.length} ingredients below minimum threshold!
              </h4>
              <div className="flex flex-wrap gap-2 mt-2">
                {alerts.map((al) => (
                  <span
                    key={al.id}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/20 px-2.5 py-1 text-xs font-medium text-amber-200 border border-amber-500/30"
                  >
                    {al.name}: <strong className="text-white">{Number(al.currentStock).toFixed(1)} {al.unit}</strong> (Min: {al.minAlertThreshold} {al.unit})
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-800">
        <button
          onClick={() => setActiveTab('STOCK')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition ${
            activeTab === 'STOCK'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Boxes className="h-4 w-4" /> Stock Overview ({items.length})
        </button>
        <button
          onClick={() => setActiveTab('RECIPES')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition ${
            activeTab === 'RECIPES'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <BookOpen className="h-4 w-4" /> Recipe Auto-Deduction
        </button>
        <button
          onClick={() => setActiveTab('LOGS')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition ${
            activeTab === 'LOGS'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <History className="h-4 w-4" /> Stock Adjustment Log
        </button>
      </div>

      {/* Tab 1: Stock Overview */}
      {activeTab === 'STOCK' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search raw material name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-900/80 pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    selectedCategory === cat
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-800/80 text-slate-400 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50 shadow-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3.5">Material Name</th>
                  <th className="px-5 py-3.5">Category</th>
                  <th className="px-5 py-3.5">Current Stock</th>
                  <th className="px-5 py-3.5">Min Alert</th>
                  <th className="px-5 py-3.5">Unit Cost</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {filteredItems.map((it) => {
                  const isLow = Number(it.currentStock) <= Number(it.minAlertThreshold);
                  return (
                    <tr key={it.id} className="hover:bg-slate-800/40 transition">
                      <td className="px-5 py-4 font-semibold text-white">{it.name}</td>
                      <td className="px-5 py-4">
                        <span className="rounded-md bg-slate-800 px-2 py-1 text-[11px] text-slate-400">
                          {it.category}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-mono font-bold text-sm">
                        {Number(it.currentStock).toFixed(2)} <span className="text-xs text-slate-500">{it.unit}</span>
                      </td>
                      <td className="px-5 py-4 font-mono text-slate-400">
                        {Number(it.minAlertThreshold).toFixed(1)} {it.unit}
                      </td>
                      <td className="px-5 py-4 font-mono">₹{Number(it.costPerUnit).toFixed(0)}</td>
                      <td className="px-5 py-4">
                        {isLow ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-red-500/10 px-2.5 py-1 text-[11px] font-semibold text-red-400 border border-red-500/20">
                            <TrendingDown className="h-3 w-3" /> Low Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-400 border border-emerald-500/20">
                            <PackageCheck className="h-3 w-3" /> In Stock
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => setAdjustModalItem(it)}
                          className="rounded-lg bg-slate-800 px-3 py-1.5 font-semibold text-indigo-400 hover:bg-slate-700 hover:text-indigo-300 transition"
                        >
                          + Adjust Stock
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Recipe Auto-Deduction */}
      {activeTab === 'RECIPES' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 space-y-4">
            <h3 className="font-bold text-white text-base">Select Menu Dish</h3>
            <p className="text-xs text-slate-400">
              When a customer orders this dish, its ingredients will automatically deduct from inventory.
            </p>
            <div className="space-y-1.5 max-h-[60vh] overflow-y-auto pr-1">
              {foodItems.map((food) => (
                <button
                  key={food.id}
                  onClick={() => setSelectedFoodItem(food.id)}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                    selectedFoodItem === food.id
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                      : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {food.name} <span className="text-[10px] opacity-70">({food.category?.name || 'Dish'})</span>
                </button>
              ))}
            </div>
          </div>

          <div className="md:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/50 p-5 space-y-5">
            {selectedFoodItem ? (
              <>
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="font-bold text-white text-base">
                    Recipe Ingredients for:{' '}
                    <span className="text-indigo-400">
                      {foodItems.find((f) => f.id === selectedFoodItem)?.name}
                    </span>
                  </h3>
                  <span className="text-xs text-slate-400">{currentRecipe.length} ingredient(s) mapped</span>
                </div>

                {/* Ingredients List */}
                <div className="space-y-2">
                  {currentRecipe.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-500">
                      No ingredients configured for this dish yet. Add ingredients below!
                    </div>
                  ) : (
                    currentRecipe.map((ing, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded-xl bg-slate-950 p-3 border border-slate-800"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-bold text-xs">
                            {idx + 1}
                          </div>
                          <div>
                            <div className="font-semibold text-white text-xs">
                              {ing.inventoryItem?.name || 'Raw Ingredient'}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              Unit: {ing.unit || ing.inventoryItem?.unit}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-xs text-emerald-400">
                            {ing.quantityRequired} {ing.unit} per plate
                          </span>
                          <button
                            onClick={() => handleRemoveIngredient(idx)}
                            className="rounded p-1 text-slate-500 hover:text-red-400 transition"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Ingredient Row */}
                <div className="pt-4 border-t border-slate-800">
                  <h4 className="text-xs font-bold text-slate-300 uppercase mb-3">+ Link Raw Ingredient</h4>
                  <div className="flex flex-wrap items-center gap-3">
                    <select
                      value={newIngredient.inventoryItemId}
                      onChange={(e) => setNewIngredient({ ...newIngredient, inventoryItemId: e.target.value })}
                      className="flex-1 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="">Select Raw Material...</option>
                      {items.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.name} ({i.unit})
                        </option>
                      ))}
                    </select>

                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        step="0.001"
                        placeholder="Quantity per plate (e.g. 0.25)"
                        value={newIngredient.quantityRequired}
                        onChange={(e) => setNewIngredient({ ...newIngredient, quantityRequired: e.target.value })}
                        className="w-36 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none font-mono"
                      />
                    </div>

                    <button
                      onClick={handleAddIngredientToRecipe}
                      className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-500 transition"
                    >
                      Save to Recipe
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="py-20 text-center text-xs text-slate-500">
                👈 Please select a menu dish on the left to view or edit its recipe.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Stock Logs */}
      {activeTab === 'LOGS' && (
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50 shadow-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-5 py-3.5">Time</th>
                <th className="px-5 py-3.5">Ingredient</th>
                <th className="px-5 py-3.5">Action / Type</th>
                <th className="px-5 py-3.5">Change</th>
                <th className="px-5 py-3.5">Previous → New</th>
                <th className="px-5 py-3.5">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {logs.map((lg) => (
                <tr key={lg.id} className="hover:bg-slate-800/40 transition">
                  <td className="px-5 py-3 text-slate-400 font-mono text-[11px]">
                    {new Date(lg.createdAt).toLocaleString('en-IN', { timeStyle: 'short', dateStyle: 'short' })}
                  </td>
                  <td className="px-5 py-3 font-semibold text-white">{lg.inventoryItem?.name || 'Item'}</td>
                  <td className="px-5 py-3">
                    <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-indigo-300">
                      {lg.changeType}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-mono font-bold">
                    {Number(lg.quantity) > 0 ? `+${Number(lg.quantity).toFixed(2)}` : Number(lg.quantity).toFixed(2)}
                  </td>
                  <td className="px-5 py-3 font-mono text-slate-400">
                    {Number(lg.previousStock).toFixed(1)} → {Number(lg.newStock).toFixed(1)}
                  </td>
                  <td className="px-5 py-3 text-slate-400 italic text-[11px]">{lg.reason || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Adjust Stock Modal */}
      {adjustModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">
              Adjust Stock: <span className="text-indigo-400">{adjustModalItem.name}</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Current stock: <strong>{Number(adjustModalItem.currentStock).toFixed(2)} {adjustModalItem.unit}</strong>
            </p>

            <form onSubmit={handleAdjustStock} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Adjustment Type</label>
                <select
                  value={adjustType}
                  onChange={(e) => setAdjustType(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                >
                  <option value="PURCHASE">Stock Purchase / Received (+ Inward)</option>
                  <option value="USAGE">Manual Kitchen Usage (- Outward)</option>
                  <option value="WASTE">Spoilage / Wastage (- Loss)</option>
                  <option value="ADJUSTMENT">Physical Audit Count (Set Exact Value)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Quantity ({adjustModalItem.unit})
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder={`Amount in ${adjustModalItem.unit}`}
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Reason / Invoice Note</label>
                <input
                  type="text"
                  placeholder="e.g. Weekly vendor delivery / Damaged batch"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAdjustModalItem(null)}
                  className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-500 transition"
                >
                  Confirm Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Raw Material Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4">Add New Raw Material</h3>
            <form onSubmit={handleCreateItem} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Item Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kashmiri Chilli Powder"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Category</label>
                  <select
                    value={newItem.category}
                    onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="Meat & Poultry">Meat & Poultry</option>
                    <option value="Dairy">Dairy</option>
                    <option value="Grains & Cereals">Grains & Cereals</option>
                    <option value="Vegetables">Vegetables</option>
                    <option value="Spices & Oils">Spices & Oils</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Unit</label>
                  <select
                    value={newItem.unit}
                    onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="kg">kg (Kilogram)</option>
                    <option value="g">g (Gram)</option>
                    <option value="l">l (Litre)</option>
                    <option value="ml">ml (Millilitre)</option>
                    <option value="pcs">pcs (Pieces)</option>
                    <option value="pack">pack (Packet)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Initial Stock</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0"
                    value={newItem.currentStock}
                    onChange={(e) => setNewItem({ ...newItem, currentStock: e.target.value })}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Min Alert</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="5"
                    value={newItem.minAlertThreshold}
                    onChange={(e) => setNewItem({ ...newItem, minAlertThreshold: e.target.value })}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Cost / Unit (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="₹0"
                    value={newItem.costPerUnit}
                    onChange={(e) => setNewItem({ ...newItem, costPerUnit: e.target.value })}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-500 transition"
                >
                  Add Material
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
