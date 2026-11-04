import React, { useState, useEffect } from 'react';
import { menuApi } from '../api/endpoints';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import {
  Utensils,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  AlertCircle,
  Search,
  ToggleLeft,
  ToggleRight,
  Clock,
  Layers,
  Sparkles,
  Lock,
  ShieldAlert,
} from 'lucide-react';
import { Modal } from '../components/Modal';

export const MenuManagementPage: React.FC = () => {
  const { currency } = useSettings();
  const { hasPermission, isAdmin } = useAuth();

  const canManage = isAdmin || hasPermission('menu.manage');
  const canUpdateAvailability = isAdmin || hasPermission('menu.availability.update');
  const canView = isAdmin || hasPermission('menu.view') || canManage || canUpdateAvailability;
  const [categories, setCategories] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<string>('all');
  const [dietFilter, setDietFilter] = useState<'all' | 'veg' | 'non-veg'>('all');
  const [search, setSearch] = useState('');

  // Modals
  const [showItemModal, setShowItemModal] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);
  const [showEditItemModal, setShowEditItemModal] = useState(false);
  const [showEditCatModal, setShowEditCatModal] = useState(false);

  // New Category
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');

  // Edit Category
  const [editCatId, setEditCatId] = useState('');
  const [editCatName, setEditCatName] = useState('');
  const [editCatDesc, setEditCatDesc] = useState('');

  // New Item
  const [itemName, setItemName] = useState('');
  const [itemCatId, setItemCatId] = useState('');
  const [itemPrice, setItemPrice] = useState<number>(250);
  const [itemDesc, setItemDesc] = useState('');
  const [itemIsVeg, setItemIsVeg] = useState(true);
  const [itemPrepTime, setItemPrepTime] = useState(15);

  // Edit Item
  const [editItemId, setEditItemId] = useState('');
  const [editItemName, setEditItemName] = useState('');
  const [editItemCatId, setEditItemCatId] = useState('');
  const [editItemPrice, setEditItemPrice] = useState<number>(250);
  const [editItemDesc, setEditItemDesc] = useState('');
  const [editItemIsVeg, setEditItemIsVeg] = useState(true);
  const [editItemPrepTime, setEditItemPrepTime] = useState(15);

  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [cList, iList] = await Promise.all([menuApi.getCategories(), menuApi.getItems()]);
      setCategories(cList);
      setItems(iList);
      if (cList.length > 0 && !itemCatId) {
        setItemCatId(cList[0].id);
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to load menu data');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Category Actions
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) {
      setErrorMsg('Access Denied: You do not have capability to create categories [menu.manage]');
      return;
    }
    try {
      await menuApi.createCategory({ name: newCatName, description: newCatDesc });
      setShowCatModal(false);
      setNewCatName('');
      setNewCatDesc('');
      setSuccessMsg('Menu category added successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);
      loadData();
    } catch (e: any) {
      setErrorMsg(e.response?.data?.message || e.message || 'Failed to create category');
    }
  };

  const openEditCategory = (cat: any) => {
    if (!canManage) {
      setErrorMsg('Access Denied: You do not have capability to edit categories [menu.manage]');
      return;
    }
    setEditCatId(cat.id);
    setEditCatName(cat.name);
    setEditCatDesc(cat.description || '');
    setShowEditCatModal(true);
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) {
      setErrorMsg('Access Denied: You do not have capability to update categories [menu.manage]');
      return;
    }
    try {
      await menuApi.updateCategory(editCatId, {
        name: editCatName,
        description: editCatDesc,
      });
      setShowEditCatModal(false);
      setSuccessMsg(`Category "${editCatName}" updated!`);
      setTimeout(() => setSuccessMsg(null), 3000);
      loadData();
    } catch (e: any) {
      setErrorMsg(e.response?.data?.message || e.message || 'Failed to update category');
    }
  };

  const handleDeleteCategory = async (cat: any) => {
    if (!canManage) {
      setErrorMsg('Access Denied: You do not have capability to delete categories [menu.manage]');
      return;
    }
    if (!confirm(`Are you sure you want to delete category "${cat.name}"? All associated food items must be reassigned or deleted.`)) {
      return;
    }
    try {
      await menuApi.deleteCategory(cat.id);
      if (selectedCatId === cat.id) setSelectedCatId('all');
      setSuccessMsg(`Category "${cat.name}" deleted!`);
      setTimeout(() => setSuccessMsg(null), 3000);
      loadData();
    } catch (e: any) {
      setErrorMsg(e.response?.data?.message || e.message || 'Failed to delete category');
    }
  };

  // Item Actions
  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) {
      setErrorMsg('Access Denied: You do not have capability to add food items [menu.manage]');
      return;
    }
    try {
      await menuApi.createItem({
        name: itemName,
        categoryId: itemCatId,
        price: itemPrice,
        description: itemDesc,
        isVeg: itemIsVeg,
        preparationTimeMinutes: itemPrepTime,
      });
      setShowItemModal(false);
      setItemName('');
      setItemDesc('');
      setSuccessMsg('Food item added to restaurant menu!');
      setTimeout(() => setSuccessMsg(null), 3000);
      loadData();
    } catch (e: any) {
      setErrorMsg(e.response?.data?.message || e.message || 'Failed to create item');
    }
  };

  const openEditItem = (item: any) => {
    if (!canManage) {
      setErrorMsg('Access Denied: You do not have capability to edit dishes [menu.manage]');
      return;
    }
    setEditItemId(item.id);
    setEditItemName(item.name);
    setEditItemCatId(item.categoryId);
    setEditItemPrice(Number(item.price));
    setEditItemDesc(item.description || '');
    setEditItemIsVeg(item.isVeg ?? true);
    setEditItemPrepTime(item.preparationTimeMinutes || 15);
    setShowEditItemModal(true);
  };

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) {
      setErrorMsg('Access Denied: You do not have capability to update dishes [menu.manage]');
      return;
    }
    try {
      await menuApi.updateItem(editItemId, {
        name: editItemName,
        categoryId: editItemCatId,
        price: editItemPrice,
        description: editItemDesc,
        isVeg: editItemIsVeg,
        preparationTimeMinutes: editItemPrepTime,
      });
      setShowEditItemModal(false);
      setSuccessMsg(`Dish "${editItemName}" updated successfully!`);
      setTimeout(() => setSuccessMsg(null), 3000);
      loadData();
    } catch (e: any) {
      setErrorMsg(e.response?.data?.message || e.message || 'Failed to update item');
    }
  };

  const handleDeleteItem = async (item: any) => {
    if (!canManage) {
      setErrorMsg('Access Denied: You do not have capability to delete dishes [menu.manage]');
      return;
    }
    if (!confirm(`Are you sure you want to delete dish "${item.name}" from the menu?`)) {
      return;
    }
    try {
      await menuApi.deleteItem(item.id);
      setSuccessMsg(`Dish "${item.name}" deleted from menu!`);
      setTimeout(() => setSuccessMsg(null), 3000);
      loadData();
    } catch (e: any) {
      setErrorMsg(e.response?.data?.message || e.message || 'Failed to delete item');
    }
  };

  const handleToggleAvailability = async (item: any) => {
    if (!canUpdateAvailability) {
      setErrorMsg('Access Denied: You do not have capability to update dish availability [menu.availability.update]');
      return;
    }
    const nextVal = !(item.availability?.isAvailable ?? true);
    try {
      await menuApi.setAvailability(item.id, nextVal);
      loadData();
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to toggle status');
    }
  };

  if (!canView) {
    return (
      <div className="p-8 max-w-2xl mx-auto my-12 text-center glass-panel rounded-3xl border border-rose-500/20 space-y-4">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-xl">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-white">Access Restricted: Menu & Pricing</h3>
        <p className="text-sm text-slate-400">
          Your account role does not have the required capabilities (<code className="text-amber-400">menu.view</code> or <code className="text-amber-400">menu.manage</code>).
          Please request an administrator to grant access via Roles & Permissions.
        </p>
      </div>
    );
  }

  const filteredItems = items.filter((i) => {
    const matchesCat = selectedCatId === 'all' || i.categoryId === selectedCatId;
    const matchesSearch = i.name.toLowerCase().includes(search.toLowerCase());
    const matchesDiet =
      dietFilter === 'all' ||
      (dietFilter === 'veg' && i.isVeg === true) ||
      (dietFilter === 'non-veg' && i.isVeg === false);
    return matchesCat && matchesSearch && matchesDiet;
  });

  const activeCategoryObj = categories.find((c) => c.id === selectedCatId);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-3">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Utensils className="w-6 h-6" />
            </span>
            <span>Menu & Pricing Management</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Complete CRUD: Edit and Delete food categories, individual dishes, pricing, and availability
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canManage ? (
            <>
              <button
                onClick={() => setShowCatModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition"
              >
                <Plus className="w-4 h-4" />
                <span>Add Category</span>
              </button>
              <button
                onClick={() => {
                  if (categories.length > 0) setItemCatId(categories[0].id);
                  setShowItemModal(true);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Add Food Item</span>
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-amber-400 text-xs font-bold shadow">
              <Lock className="w-3.5 h-3.5" />
              <span>Read-Only Menu View</span>
            </div>
          )}
        </div>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={() => setErrorMsg(null)}
            className="text-xs font-bold hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Categories & Filter Bar */}
      <div className="flex flex-col gap-3">
        {/* Categories Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
          <button
            onClick={() => setSelectedCatId('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              selectedCatId === 'all'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            All Items ({items.length})
          </button>
          {categories.map((c) => (
            <div key={c.id} className="relative group flex items-center shrink-0">
              <button
                onClick={() => setSelectedCatId(c.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  canManage ? 'pr-7' : 'pr-3.5'
                } ${
                  selectedCatId === c.id
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {c.name}
              </button>
              {/* Category Quick Edit button - only if canManage */}
              {canManage && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openEditCategory(c);
                  }}
                  className={`absolute right-1.5 p-0.5 rounded transition ${
                    selectedCatId === c.id
                      ? 'text-slate-900 hover:text-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Edit Category"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Selected Category Action Bar (If specific category is selected and canManage) */}
        {activeCategoryObj && canManage && (
          <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-bold text-white">Category: {activeCategoryObj.name}</span>
              {activeCategoryObj.description && (
                <span className="text-xs text-slate-400 hidden sm:inline">— {activeCategoryObj.description}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => openEditCategory(activeCategoryObj)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition"
              >
                <Edit2 className="w-3 h-3 text-amber-400" />
                <span>Edit Category</span>
              </button>
              <button
                onClick={() => handleDeleteCategory(activeCategoryObj)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-xs font-semibold text-rose-400 border border-rose-500/20 transition"
              >
                <Trash2 className="w-3 h-3" />
                <span>Delete Category</span>
              </button>
            </div>
          </div>
        )}

        {/* Diet Filter Pills & Search */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
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

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search dishes or ingredients..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>
      </div>

      {/* Items Grid with Edit & Delete Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredItems.map((item) => {
          const isAvail = item.availability?.isAvailable ?? true;
          return (
            <div
              key={item.id}
              className={`glass-panel p-4 rounded-2xl border transition flex flex-col justify-between group ${
                isAvail ? 'border-slate-800 hover:border-slate-700' : 'border-rose-500/30 bg-rose-500/5'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        item.isVeg ? 'bg-emerald-500' : 'bg-rose-500'
                      }`}
                      title={item.isVeg ? 'Vegetarian' : 'Non-Vegetarian'}
                    />
                    <span className="font-bold text-white text-sm">{item.name}</span>
                  </div>
                  <span className="font-bold text-amber-400 text-sm whitespace-nowrap">
                    {currency}{item.price}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-2 line-clamp-2">{item.description || 'Delicious culinary preparation'}</p>
              </div>

              <div className="pt-3 border-t border-slate-800/80 mt-4 space-y-3">
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{item.preparationTimeMinutes || 15} min</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <span
                      className={`text-[10px] font-bold uppercase mr-1 ${
                        isAvail ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {isAvail ? 'Available' : 'Sold Out'}
                    </span>
                    {canUpdateAvailability ? (
                      <button
                        onClick={() => handleToggleAvailability(item)}
                        className="p-1 text-slate-300 hover:text-white transition"
                        title={isAvail ? 'Mark as Sold Out' : 'Mark as Available'}
                      >
                        {isAvail ? (
                          <ToggleRight className="w-6 h-6 text-emerald-400" />
                        ) : (
                          <ToggleLeft className="w-6 h-6 text-rose-400" />
                        )}
                      </button>
                    ) : (
                      <span
                        className="p-1 text-slate-600 flex items-center gap-0.5 cursor-not-allowed"
                        title="Permission required: menu.availability.update"
                      >
                        <Lock className="w-3.5 h-3.5 text-slate-500" />
                      </span>
                    )}
                  </div>
                </div>

                {/* Edit & Delete Action Buttons - only if canManage */}
                {canManage && (
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-800/60">
                    <button
                      onClick={() => openEditItem(item)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700/80 transition"
                      title="Edit Item"
                    >
                      <Edit2 className="w-3 h-3 text-amber-400" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold border border-rose-500/20 transition"
                      title="Delete Item"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Delete</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 1. Add Category Modal */}
      <Modal isOpen={showCatModal} onClose={() => setShowCatModal(false)} title="Add Food Category">
        <form onSubmit={handleCreateCategory} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
              Category Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Sizzlers & Grills"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
              Description (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Hot sizzling platters & tandoor specialties"
              value={newCatDesc}
              onChange={(e) => setNewCatDesc(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
            />
          </div>
          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg transition"
          >
            Create Category
          </button>
        </form>
      </Modal>

      {/* 2. Edit Category Modal */}
      <Modal isOpen={showEditCatModal} onClose={() => setShowEditCatModal(false)} title="Edit Food Category">
        <form onSubmit={handleUpdateCategory} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
              Category Name
            </label>
            <input
              type="text"
              required
              value={editCatName}
              onChange={(e) => setEditCatName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
              Description (Optional)
            </label>
            <input
              type="text"
              value={editCatDesc}
              onChange={(e) => setEditCatDesc(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg transition"
            >
              Save Changes
            </button>
            <button
              type="button"
              onClick={() => {
                const catObj = categories.find((c) => c.id === editCatId);
                if (catObj) {
                  setShowEditCatModal(false);
                  handleDeleteCategory(catObj);
                }
              }}
              className="px-4 py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 font-bold text-xs border border-rose-500/30 transition"
            >
              Delete
            </button>
          </div>
        </form>
      </Modal>

      {/* 3. Add Food Item Modal */}
      <Modal isOpen={showItemModal} onClose={() => setShowItemModal(false)} title="Add Food Item">
        <form onSubmit={handleCreateItem} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
              Dish / Item Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Tandoori Pomfret"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                Category
              </label>
              <select
                value={itemCatId}
                onChange={(e) => setItemCatId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                Price ({currency})
              </label>
              <input
                type="number"
                required
                min={0}
                step={1}
                value={itemPrice}
                onChange={(e) => setItemPrice(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-bold focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                Diet Type
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setItemIsVeg(true)}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition ${
                    itemIsVeg
                      ? 'bg-emerald-600 text-white shadow'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  🟢 Veg
                </button>
                <button
                  type="button"
                  onClick={() => setItemIsVeg(false)}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition ${
                    !itemIsVeg
                      ? 'bg-rose-600 text-white shadow'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  🔴 Non-Veg
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                Prep Time (Minutes)
              </label>
              <input
                type="number"
                min={1}
                value={itemPrepTime}
                onChange={(e) => setItemPrepTime(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
              Description
            </label>
            <textarea
              placeholder="Dish ingredients, spice level, or culinary style..."
              value={itemDesc}
              onChange={(e) => setItemDesc(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500 h-20"
            />
          </div>
          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg transition"
          >
            Create Food Item
          </button>
        </form>
      </Modal>

      {/* 4. Edit Food Item Modal */}
      <Modal isOpen={showEditItemModal} onClose={() => setShowEditItemModal(false)} title="Edit Food Item">
        <form onSubmit={handleUpdateItem} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
              Dish / Item Name
            </label>
            <input
              type="text"
              required
              value={editItemName}
              onChange={(e) => setEditItemName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                Category
              </label>
              <select
                value={editItemCatId}
                onChange={(e) => setEditItemCatId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                Price ({currency})
              </label>
              <input
                type="number"
                required
                min={0}
                step={1}
                value={editItemPrice}
                onChange={(e) => setEditItemPrice(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-bold focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                Diet Type
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditItemIsVeg(true)}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition ${
                    editItemIsVeg
                      ? 'bg-emerald-600 text-white shadow'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  🟢 Veg
                </button>
                <button
                  type="button"
                  onClick={() => setEditItemIsVeg(false)}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition ${
                    !editItemIsVeg
                      ? 'bg-rose-600 text-white shadow'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  🔴 Non-Veg
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                Prep Time (Minutes)
              </label>
              <input
                type="number"
                min={1}
                value={editItemPrepTime}
                onChange={(e) => setEditItemPrepTime(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
              Description
            </label>
            <textarea
              value={editItemDesc}
              onChange={(e) => setEditItemDesc(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500 h-20"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg transition"
            >
              Update Food Item
            </button>
            <button
              type="button"
              onClick={() => {
                const itemObj = items.find((i) => i.id === editItemId);
                if (itemObj) {
                  setShowEditItemModal(false);
                  handleDeleteItem(itemObj);
                }
              }}
              className="px-4 py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 font-bold text-xs border border-rose-500/30 transition"
            >
              Delete
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
