import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  UtensilsCrossed,
  ShoppingBag,
  Sparkles,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  Flame,
  Leaf,
  Plus,
  Minus,
  X,
  ChefHat,
  BellRing,
  Phone,
  MapPin,
  Calendar,
  AlertCircle
} from 'lucide-react';
import axios from 'axios';

interface Portion {
  name: string;
  price: number;
  code?: string;
}

interface MenuItem {
  id: string;
  name: string;
  categoryId: string;
  description?: string;
  price: number;
  portions: Portion[];
  imageUrl?: string;
  isVeg: boolean;
  isAvailable: boolean;
}

interface CartItem {
  foodItemId: string;
  name: string;
  portion: string;
  unitPrice: number;
  quantity: number;
  specialInstructions?: string;
  isVeg: boolean;
}

export const QrCustomerMenuPage: React.FC = () => {
  const { slug, tableNumber } = useParams<{ slug: string; tableNumber: string }>();

  const [loading, setLoading] = useState(true);
  const [restaurant, setRestaurant] = useState<any>(null);
  const [table, setTable] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Filters & State
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [vegOnly, setVegOnly] = useState(false);

  // Selected portions per item card: { [foodItemId]: portionName }
  const [selectedPortions, setSelectedPortions] = useState<{ [itemId: string]: string }>({});
  // Special instructions per item: { [foodItemId]: string }
  const [itemInstructions, setItemInstructions] = useState<{ [itemId: string]: string }>({});

  // Cart & Ordering
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [subOrder, setSubOrder] = useState('A');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<any | null>(null);

  // Table Pre-Reservation Modal
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [resForm, setResForm] = useState({
    name: '',
    phone: '',
    guestCount: 4,
    date: new Date().toISOString().split('T')[0],
    time: '19:30',
    advancePaid: 500,
    specialRequests: '',
  });
  const [resSuccess, setResSuccess] = useState<any | null>(null);

  useEffect(() => {
    fetchMenu();
  }, [slug, tableNumber]);

  const fetchMenu = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`/api/public/restaurant/${slug}/qr-menu/${tableNumber}`);
      const data = res.data.data || res.data;
      setRestaurant(data.restaurant);
      setTable(data.table);
      setCategories(data.categories || []);
      setItems(data.items || []);

      // Default portions
      const initialPortions: { [itemId: string]: string } = {};
      (data.items || []).forEach((item: MenuItem) => {
        if (item.portions && item.portions.length > 0) {
          initialPortions[item.id] = item.portions[0].name;
        } else {
          initialPortions[item.id] = 'Full';
        }
      });
      setSelectedPortions(initialPortions);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Could not load menu. Please ask staff for assistance.');
    } finally {
      setLoading(false);
    }
  };

  const getPortionPrice = (item: MenuItem, portionName: string): number => {
    if (item.portions && item.portions.length > 0) {
      const found = item.portions.find((p) => p.name === portionName);
      if (found) return Number(found.price);
    }
    return Number(item.price);
  };

  const addToCart = (item: MenuItem, explicitPortion?: string) => {
    const chosenPortion =
      explicitPortion ||
      selectedPortions[item.id] ||
      (item.portions && item.portions.length > 0 ? item.portions[0].name : 'Full');
    const unitPrice = getPortionPrice(item, chosenPortion);
    const instructions = itemInstructions[item.id] || '';

    setCart((prev) => {
      const existingIdx = prev.findIndex(
        (ci) => ci.foodItemId === item.id && ci.portion === chosenPortion,
      );
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx].quantity += 1;
        return updated;
      } else {
        return [
          ...prev,
          {
            foodItemId: item.id,
            name: item.name,
            portion: chosenPortion,
            unitPrice,
            quantity: 1,
            specialInstructions: instructions,
            isVeg: item.isVeg,
          },
        ];
      }
    });
  };

  const updateCartQty = (idx: number, delta: number) => {
    setCart((prev) => {
      const updated = [...prev];
      updated[idx].quantity += delta;
      if (updated[idx].quantity <= 0) {
        return updated.filter((_, i) => i !== idx);
      }
      return updated;
    });
  };

  const cartSubtotal = cart.reduce((sum, ci) => sum + ci.unitPrice * ci.quantity, 0);
  const cartGst = Number((cartSubtotal * 0.05).toFixed(2));
  const cartTotal = Number((cartSubtotal + cartGst).toFixed(2));

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;
    if (!customerName.trim()) {
      alert('Please enter your name');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        tableNumber: tableNumber?.toUpperCase(),
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim() || undefined,
        subOrder: subOrder || 'A',
        items: cart.map((ci) => ({
          foodItemId: ci.foodItemId,
          quantity: ci.quantity,
          portion: ci.portion,
          unitPrice: ci.unitPrice,
          specialInstructions: ci.specialInstructions,
        })),
      };

      const res = await axios.post(`/api/public/restaurant/${slug}/qr-order`, payload);
      const data = res.data.data || res.data;
      setOrderSuccess(data);
      setCart([]);
      setIsCartOpen(false);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to place order. Please call your waiter.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post(`/api/public/restaurant/${slug}/reservations`, {
        customerName: resForm.name,
        customerPhone: resForm.phone,
        guestCount: Number(resForm.guestCount),
        reservationDate: resForm.date,
        reservationTime: resForm.time,
        advancePaid: Number(resForm.advancePaid),
        specialRequests: resForm.specialRequests,
      });
      const data = res.data.data || res.data;
      setResSuccess(data);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Could not book reservation');
    }
  };

  // Filter items
  const filteredItems = items.filter((item) => {
    if (vegOnly && !item.isVeg) return false;
    if (selectedCategory !== 'ALL' && item.categoryId !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q))
      );
    }
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-100">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold tracking-wide text-amber-400">
          Loading Acrylic Stand Digital Menu...
        </p>
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-100 text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mb-4" />
        <h2 className="text-xl font-bold mb-2">QR Menu Not Found</h2>
        <p className="text-sm text-slate-400 max-w-sm">{error || 'Table not found'}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-28 font-sans selection:bg-amber-500 selection:text-black">
      {/* Top Banner / Restaurant Info */}
      <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 shadow-xl">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center font-black text-slate-950 shadow-md">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-white tracking-tight flex items-center gap-1.5">
                {restaurant.name}
              </h1>
              <p className="text-[11px] text-slate-400 flex items-center gap-2">
                <span>{restaurant.cuisine || 'Fine Dining'}</span>
                <span className="w-1 h-1 rounded-full bg-slate-600" />
                <span className="flex items-center text-amber-400">
                  <MapPin className="w-3 h-3 mr-0.5" />
                  {restaurant.city || 'Hyderabad'}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowReservationModal(true)}
              className="hidden sm:flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 transition"
            >
              <Calendar className="w-3.5 h-3.5" />
              Pre-Book Table
            </button>
            <div className="flex flex-col items-end">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                Acrylic Stand
              </span>
              <span className="px-2.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/40 text-amber-400 text-xs font-extrabold tracking-wide">
                Table {tableNumber?.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Search & Veg/Non-Veg Filter Bar */}
        <div className="max-w-3xl mx-auto px-4 pb-3 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search dishes (e.g. Royyala, Sankati)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-950 border border-slate-800 focus:border-amber-500 text-white placeholder-slate-500 focus:outline-none transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            onClick={() => setVegOnly(!vegOnly)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
              vegOnly
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
            }`}
          >
            <Leaf className="w-3 h-3 text-emerald-400" />
            Pure Veg
          </button>
        </div>

        {/* Horizontal Category Slider */}
        <div className="max-w-3xl mx-auto px-4 pb-2.5 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition ${
              selectedCategory === 'ALL'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            All Items
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition ${
                selectedCategory === cat.id
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </header>

      {/* Main Dishes Grid */}
      <main className="max-w-3xl mx-auto px-4 py-4 space-y-4">
        {orderSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-start gap-3 shadow-lg animate-in fade-in">
            <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-bold text-white">
                Order #{orderSuccess.orderNumber} Sent to Kitchen!
              </h3>
              <p className="text-xs text-emerald-300/90 mt-0.5">
                {orderSuccess.message} Our chef is preparing your food freshly for Table{' '}
                {orderSuccess.tableNumber}.
              </p>
              <div className="mt-2 flex items-center gap-2 text-[11px] font-semibold text-amber-400">
                <ChefHat className="w-3.5 h-3.5" />
                Live KDS Alert: Kitchen preparing
              </div>
            </div>
            <button
              onClick={() => setOrderSuccess(null)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {filteredItems.length === 0 ? (
          <div className="text-center py-12 text-slate-500 space-y-2">
            <UtensilsCrossed className="w-10 h-10 mx-auto text-slate-600" />
            <p className="text-sm">No dishes found matching your selection.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredItems.map((item) => {
              const currentPortion =
                selectedPortions[item.id] || (item.portions?.[0]?.name ?? 'Full');
              const displayPrice = getPortionPrice(item, currentPortion);

              return (
                <div
                  key={item.id}
                  className="bg-slate-900/60 rounded-2xl border border-slate-800/80 p-3.5 flex flex-col justify-between hover:border-slate-700 transition relative overflow-hidden"
                >
                  <div>
                    {/* Top row: Veg badge & Name */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                            item.isVeg
                              ? 'border-emerald-500 text-emerald-500'
                              : 'border-rose-500 text-rose-500'
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              item.isVeg ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}
                          />
                        </span>
                        <h3 className="font-bold text-sm text-white tracking-tight">{item.name}</h3>
                      </div>
                      <span className="text-base font-black text-amber-400 shrink-0">
                        ₹{displayPrice}
                      </span>
                    </div>

                    {item.description && (
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    )}

                    {/* Portion Selector Pills (Full, Half 1/2, Single 1/3, Family Pack) */}
                    {item.portions && item.portions.length > 0 && (
                      <div className="mt-3">
                        <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1.5">
                          Select Portion / Quantity:
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {item.portions.map((p) => {
                            const isSelected = currentPortion === p.name;
                            return (
                              <button
                                key={p.name}
                                type="button"
                                onClick={() =>
                                  setSelectedPortions((prev) => ({
                                    ...prev,
                                    [item.id]: p.name,
                                  }))
                                }
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 border ${
                                  isSelected
                                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                                    : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                                }`}
                              >
                                <span>{p.name}</span>
                                <span className={isSelected ? 'text-slate-900' : 'text-amber-400'}>
                                  ₹{p.price}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Cooking Notes / Special Request */}
                    <div className="mt-2.5">
                      <input
                        type="text"
                        placeholder="Special request (e.g. less spicy)..."
                        value={itemInstructions[item.id] || ''}
                        onChange={(e) =>
                          setItemInstructions((prev) => ({
                            ...prev,
                            [item.id]: e.target.value,
                          }))
                        }
                        className="w-full px-2.5 py-1 text-[11px] rounded-lg bg-slate-950/70 border border-slate-800 text-slate-300 placeholder-slate-600 focus:outline-none focus:border-amber-500/50"
                      />
                    </div>
                  </div>

                  {/* Add to Cart button */}
                  <div className="mt-3.5 pt-2 border-t border-slate-800/60 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      Portion: <strong className="text-white">{currentPortion}</strong>
                    </span>
                    <button
                      onClick={() => addToCart(item, currentPortion)}
                      className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add to Order
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Floating Bottom Cart Bar */}
      {cart.length > 0 && !isCartOpen && (
        <div className="fixed bottom-3 inset-x-4 max-w-xl mx-auto z-40">
          <div className="bg-gradient-to-r from-amber-500 to-amber-600 rounded-2xl p-3 px-4 shadow-2xl flex items-center justify-between text-slate-950">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-950 text-amber-400 flex items-center justify-center font-black text-sm">
                {cart.reduce((sum, ci) => sum + ci.quantity, 0)}
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wider">
                  Table {tableNumber?.toUpperCase()} Order
                </p>
                <p className="text-sm font-extrabold">₹{cartTotal} (incl. GST)</p>
              </div>
            </div>
            <button
              onClick={() => setIsCartOpen(true)}
              className="px-4 py-2 rounded-xl bg-slate-950 text-white font-bold text-xs flex items-center gap-1.5 hover:bg-slate-900 transition shadow"
            >
              <ShoppingBag className="w-4 h-4 text-amber-400" />
              View Cart & Place Order
            </button>
          </div>
        </div>
      )}

      {/* Cart Drawer / Modal */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom">
            {/* Drawer Header */}
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-amber-400" />
                  Your Table {tableNumber?.toUpperCase()} Order
                </h2>
                <p className="text-xs text-slate-400">Direct Contactless Kitchen KOT</p>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {cart.map((ci, idx) => (
                <div
                  key={`${ci.foodItemId}-${ci.portion}-${idx}`}
                  className="bg-slate-950 rounded-xl p-3 border border-slate-800 flex items-center justify-between"
                >
                  <div className="flex-1 pr-3">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          ci.isVeg ? 'bg-emerald-400' : 'bg-rose-400'
                        }`}
                      />
                      <h4 className="text-xs font-bold text-white">{ci.name}</h4>
                    </div>
                    <p className="text-[11px] text-amber-400 font-medium">
                      {ci.portion} • ₹{ci.unitPrice}
                    </p>
                    {ci.specialInstructions && (
                      <p className="text-[10px] text-slate-400 italic mt-0.5">
                        Note: {ci.specialInstructions}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg">
                      <button
                        onClick={() => updateCartQty(idx, -1)}
                        className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-white"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center text-xs font-bold text-white">
                        {ci.quantity}
                      </span>
                      <button
                        onClick={() => updateCartQty(idx, 1)}
                        className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-white"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <span className="text-xs font-extrabold text-white w-14 text-right">
                      ₹{ci.unitPrice * ci.quantity}
                    </span>
                  </div>
                </div>
              ))}

              {/* Diner Contact & Table Sharing Inputs */}
              <form id="orderForm" onSubmit={handlePlaceOrder} className="pt-3 space-y-3 border-t border-slate-800">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      Your Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Suresh Kumar"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full mt-1 px-3 py-1.5 text-xs rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      Mobile Number (WhatsApp Bill)
                    </label>
                    <input
                      type="tel"
                      placeholder="e.g. 98765 43210"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full mt-1 px-3 py-1.5 text-xs rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Table Sharing Guest Group
                  </label>
                  <div className="flex gap-2 mt-1">
                    {['A', 'B', 'C'].map((code) => (
                      <button
                        key={code}
                        type="button"
                        onClick={() => setSubOrder(code)}
                        className={`flex-1 py-1 rounded-lg text-xs font-bold border transition ${
                          subOrder === code
                            ? 'bg-amber-500/20 text-amber-400 border-amber-500'
                            : 'bg-slate-950 text-slate-400 border-slate-800'
                        }`}
                      >
                        Guest {code}
                      </button>
                    ))}
                  </div>
                </div>
              </form>

              {/* Price Breakdown */}
              <div className="bg-slate-950/80 rounded-xl p-3 border border-slate-800 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal</span>
                  <span>₹{cartSubtotal}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>GST (5%)</span>
                  <span>₹{cartGst}</span>
                </div>
                <div className="flex justify-between text-white font-extrabold text-sm pt-1.5 border-t border-slate-800">
                  <span>Total Payable</span>
                  <span className="text-amber-400">₹{cartTotal}</span>
                </div>
              </div>
            </div>

            {/* Submit Bar */}
            <div className="p-4 border-t border-slate-800 bg-slate-900 flex gap-2">
              <button
                type="button"
                onClick={() => setIsCartOpen(false)}
                className="w-1/3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
              >
                + Add More
              </button>
              <button
                type="submit"
                form="orderForm"
                disabled={isSubmitting}
                className="w-2/3 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Sending to Kitchen...</span>
                ) : (
                  <>
                    <ChefHat className="w-4 h-4" />
                    <span>Send Order to Chef (₹{cartTotal})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pre-Booking Reservation Modal */}
      {showReservationModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 relative shadow-2xl">
            <button
              onClick={() => {
                setShowReservationModal(false);
                setResSuccess(null);
              }}
              className="absolute right-4 top-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            {resSuccess ? (
              <div className="text-center py-4 space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                <h3 className="text-base font-bold text-white">Table Pre-Booked Successfully!</h3>
                <p className="text-xs text-slate-300 leading-relaxed">{resSuccess.message}</p>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-400 text-left space-y-1">
                  <p>
                    <strong className="text-white">Customer:</strong> {resSuccess.customerName}
                  </p>
                  <p>
                    <strong className="text-white">Date & Time:</strong> {resSuccess.date} at{' '}
                    {resSuccess.time}
                  </p>
                  <p>
                    <strong className="text-white">Restaurant:</strong> {restaurant.name}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowReservationModal(false);
                    setResSuccess(null);
                  }}
                  className="w-full py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleReservation} className="space-y-3.5">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-amber-400" />
                  <h3 className="text-base font-extrabold text-white">Pre-Book a Table</h3>
                </div>
                <p className="text-xs text-slate-400">
                  Reserve your table at {restaurant.name} ahead of time.
                </p>

                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400">Your Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Varma"
                    value={resForm.name}
                    onChange={(e) => setResForm({ ...resForm, name: e.target.value })}
                    className="w-full mt-1 px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400">Phone *</label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 9876543210"
                      value={resForm.phone}
                      onChange={(e) => setResForm({ ...resForm, phone: e.target.value })}
                      className="w-full mt-1 px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400">
                      Guests Count
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={resForm.guestCount}
                      onChange={(e) => setResForm({ ...resForm, guestCount: Number(e.target.value) })}
                      className="w-full mt-1 px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400">Date *</label>
                    <input
                      type="date"
                      required
                      value={resForm.date}
                      onChange={(e) => setResForm({ ...resForm, date: e.target.value })}
                      className="w-full mt-1 px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400">Time *</label>
                    <input
                      type="time"
                      required
                      value={resForm.time}
                      onChange={(e) => setResForm({ ...resForm, time: e.target.value })}
                      className="w-full mt-1 px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400">
                    Advance Token Payment (₹)
                  </label>
                  <input
                    type="number"
                    value={resForm.advancePaid}
                    onChange={(e) => setResForm({ ...resForm, advancePaid: Number(e.target.value) })}
                    className="w-full mt-1 px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400">
                    Special Requests / Food Preferences
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Birthday celebration, High chair needed"
                    value={resForm.specialRequests}
                    onChange={(e) => setResForm({ ...resForm, specialRequests: e.target.value })}
                    className="w-full mt-1 px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs transition"
                >
                  Confirm Table Reservation
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
