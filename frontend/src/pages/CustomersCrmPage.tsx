import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Gift,
  Phone,
  Calendar,
  Share2,
  TrendingUp,
  Star,
  RefreshCw,
  Plus,
} from 'lucide-react';
import { billingApi } from '../api/endpoints';

export const CustomersCrmPage: React.FC = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const res = await billingApi.getTopCustomers();
      setCustomers(res.data?.data || res.data || []);
    } catch (err) {
      console.error('Failed to load customers', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const sendWhatsAppOffer = (c: any) => {
    const cleanPhone = (c.phone || '').replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const msg =
      `Namaste ${c.name} Garu! 🙏\n\n` +
      `Thank you for being our valued guest at *Gummadi Grand Restaurant*.\n` +
      `You currently have *${c.loyaltyPoints || 0} Loyalty Points* in your wallet! ⭐\n\n` +
      `Show this message on your next dine-in visit to enjoy a special chef special dessert on the house! 🍨\n` +
      `We look forward to serving you soon!`;

    window.open(`https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm),
  );

  const totalPoints = customers.reduce((acc, c) => acc + Number(c.loyaltyPoints || 0), 0);
  const totalRevenue = customers.reduce((acc, c) => acc + Number(c.totalSpent || 0), 0);

  return (
    <div className="space-y-6 p-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Users className="h-7 w-7 text-indigo-400" />
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Customer CRM & Loyalty Management
            </h1>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Track repeat guests, loyalty points wallet, lifetime spending, and WhatsApp marketing campaigns
          </p>
        </div>

        <button
          onClick={loadCustomers}
          className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
          <div className="text-xs text-slate-400 mb-1">Total Registered Guests</div>
          <div className="text-2xl font-mono font-bold text-white">{customers.length}</div>
        </div>

        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
          <div className="flex items-center gap-1 text-xs text-amber-400 mb-1">
            <Star className="h-3.5 w-3.5" /> Total Active Loyalty Points
          </div>
          <div className="text-2xl font-mono font-bold text-amber-300">{totalPoints} pts</div>
        </div>

        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <div className="flex items-center gap-1 text-xs text-emerald-400 mb-1">
            <TrendingUp className="h-3.5 w-3.5" /> Lifetime CRM Revenue
          </div>
          <div className="text-2xl font-mono font-bold text-emerald-300">
            ₹{totalRevenue.toLocaleString('en-IN')}
          </div>
        </div>

        <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-4">
          <div className="flex items-center gap-1 text-xs text-indigo-400 mb-1">
            <Gift className="h-3.5 w-3.5" /> Repeat Rate
          </div>
          <div className="text-2xl font-mono font-bold text-indigo-300">
            {customers.length > 0
              ? `${Math.round(
                  (customers.filter((c) => Number(c.totalVisits) > 1).length / customers.length) * 100,
                )}%`
              : '0%'}
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by customer name or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-900/80 pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Customers Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50 shadow-xl">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px]">
            <tr>
              <th className="px-5 py-3.5">Guest Name</th>
              <th className="px-5 py-3.5">Mobile Phone</th>
              <th className="px-5 py-3.5">Visits</th>
              <th className="px-5 py-3.5">Loyalty Wallet</th>
              <th className="px-5 py-3.5">Lifetime Spend</th>
              <th className="px-5 py-3.5">Last Visit</th>
              <th className="px-5 py-3.5 text-right">Outreach</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 text-slate-300">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-slate-500">
                  No customers found. Customers are automatically saved upon billing!
                </td>
              </tr>
            ) : (
              filtered.map((c) => (
                <tr key={c.id} className="hover:bg-slate-800/40 transition">
                  <td className="px-5 py-4 font-semibold text-white flex items-center gap-2">
                    {c.name}
                    {Number(c.totalVisits) >= 5 && (
                      <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold text-amber-300 border border-amber-500/30">
                        ⭐ VIP
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 font-mono text-slate-300">{c.phone}</td>
                  <td className="px-5 py-4">
                    <span className="rounded-md bg-slate-800 px-2 py-1 font-bold text-slate-200">
                      {c.totalVisits} visits
                    </span>
                  </td>
                  <td className="px-5 py-4 font-mono font-bold text-amber-400">
                    ⭐ {Number(c.loyaltyPoints).toFixed(0)} pts
                  </td>
                  <td className="px-5 py-4 font-mono font-bold text-emerald-400">
                    ₹{Number(c.totalSpent).toFixed(2)}
                  </td>
                  <td className="px-5 py-4 text-slate-400 text-[11px]">
                    {new Date(c.lastVisit).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={() => sendWhatsAppOffer(c)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600/90 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 transition shadow"
                    >
                      <Share2 className="h-3 w-3" /> WhatsApp Offer
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
