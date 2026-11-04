import React, { useState, useEffect, useMemo } from 'react';
import { reportsApi, billingApi, ordersApi } from '../api/endpoints';
import { useSocket } from '../context/SocketContext';
import { useSettings } from '../context/SettingsContext';
import { StatCard } from '../components/StatCard';
import { Modal } from '../components/Modal';
import { PrintableBill } from '../components/PrintableBill';
import {
  DollarSign,
  Receipt,
  ShoppingBag,
  Users,
  ChefHat,
  CreditCard,
  Printer,
  CheckCircle,
  AlertCircle,
  QrCode,
  Banknote,
  Search,
  Calendar,
  Filter,
  History,
  FileSpreadsheet,
  Eye,
  RefreshCw,
  Clock,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export const ManagerDashboard: React.FC = () => {
  const { currency } = useSettings();
  const { lastEvent } = useSocket();

  const [mainTab, setMainTab] = useState<'ACTIVE' | 'OLD_BILLS'>('ACTIVE');

  const [metrics, setMetrics] = useState<any>(null);
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [unpaidBills, setUnpaidBills] = useState<any[]>([]);
  const [allBills, setAllBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Settlement & Payment Modal
  const [discountAmount, setDiscountAmount] = useState<number>(0);

  const [activeBill, setActiveBill] = useState<any | null>(null);
  const [showBillModal, setShowBillModal] = useState(false);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI' | 'CARD'>('UPI');
  const [transactionRef, setTransactionRef] = useState('');

  // Old Bills Filter states
  const [billSearch, setBillSearch] = useState('');
  const [billMethodFilter, setBillMethodFilter] = useState<'ALL' | 'CASH' | 'UPI' | 'CARD'>('ALL');
  const [billDateFilter, setBillDateFilter] = useState<string>('ALL'); // 'ALL' | 'TODAY' | 'YESTERDAY' | YYYY-MM-DD
  const [customDate, setCustomDate] = useState<string>('');

  // Old Bills Pagination
  const [billsCurrentPage, setBillsCurrentPage] = useState<number>(1);
  const [billsPageSize, setBillsPageSize] = useState<number>(10);

  // Reset page when filters change
  useEffect(() => {
    setBillsCurrentPage(1);
  }, [billSearch, billMethodFilter, billDateFilter, customDate]);

  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [m, orders, unpBills, fullBills] = await Promise.all([
        reportsApi.getManagerDashboard(),
        ordersApi.getOrders('ACTIVE'),
        billingApi.getBills('UNPAID'),
        billingApi.getBills(), // all bills including paid historical bills
      ]);
      setMetrics(m);
      const sortedOrders = (orders || []).sort((a: any, b: any) => {
        const aReq = a.table?.status === 'BILLING' ? 1 : 0;
        const bReq = b.table?.status === 'BILLING' ? 1 : 0;
        return bReq - aReq;
      });
      setActiveOrders(sortedOrders);
      setUnpaidBills(unpBills || []);
      setAllBills(fullBills || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Listen to WebSocket events
  useEffect(() => {
    if (!lastEvent) return;
    if (
      lastEvent.type === 'billing:requested' ||
      lastEvent.type === 'billing:paid' ||
      lastEvent.type === 'order:created' ||
      lastEvent.type === 'order:item_status_changed'
    ) {
      loadData();
    }
  }, [lastEvent]);

  // Generate Bill action
  const handleGenerateBill = async (orderId: string) => {
    try {
      setActionError(null);
      const bill = await billingApi.generateBill(orderId, discountAmount);
      setActiveBill(bill);
      setShowBillModal(true);
      setActionSuccess(`Bill ${bill.billNumber} generated successfully!`);
      setTimeout(() => setActionSuccess(null), 3000);
      loadData();
    } catch (err: any) {
      setActionError(err.message || 'Failed to generate bill');
    }
  };

  // Open Payment dialog
  const openPayment = (bill: any) => {
    setActiveBill(bill);
    setPaymentAmount(Number(bill.grandTotal));
    setShowPaymentModal(true);
  };

  // Record Payment action
  const handleRecordPayment = async () => {
    if (!activeBill) return;
    try {
      setActionError(null);
      const updated = await billingApi.recordPayment(activeBill.id, {
        amount: paymentAmount,
        paymentMethod,
        transactionReference: transactionRef || undefined,
      });
      setActiveBill(updated);
      setShowPaymentModal(false);
      setActionSuccess(`Payment of ${currency}${paymentAmount} recorded! Table cleared to Available.`);
      setTimeout(() => setActionSuccess(null), 3500);
      loadData();
    } catch (err: any) {
      setActionError(err.message || 'Payment recording failed');
    }
  };

  // Local calendar date helpers
  const formatLocalDate = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = formatLocalDate(new Date());
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = formatLocalDate(yesterdayDate);

  // Filter Old / Settled Bills
  const paidBills = useMemo(() => {
    return allBills.filter((b) => b.status === 'PAID');
  }, [allBills]);

  const filteredOldBills = useMemo(() => {
    return paidBills.filter((bill) => {
      // 1. Search Query
      if (billSearch.trim()) {
        const q = billSearch.toLowerCase();
        const matchNumber = bill.billNumber?.toLowerCase().includes(q);
        const matchTable = bill.table?.tableNumber?.toLowerCase().includes(q);
        const matchCashier = bill.payments?.some((p: any) => p.recordedBy?.name?.toLowerCase().includes(q));
        const matchCustomer = bill.order?.customerName?.toLowerCase().includes(q);
        if (!matchNumber && !matchTable && !matchCashier && !matchCustomer) return false;
      }

      // 2. Payment Method
      if (billMethodFilter !== 'ALL') {
        const hasMethod = bill.payments?.some((p: any) => p.paymentMethod === billMethodFilter);
        if (!hasMethod) return false;
      }

      // 3. Date Filter
      if (billDateFilter === 'TODAY') {
        const billDate = formatLocalDate(new Date(bill.createdAt));
        if (billDate !== todayStr) return false;
      } else if (billDateFilter === 'YESTERDAY') {
        const billDate = formatLocalDate(new Date(bill.createdAt));
        if (billDate !== yesterdayStr) return false;
      } else if (billDateFilter === 'CUSTOM' && customDate) {
        const billDate = formatLocalDate(new Date(bill.createdAt));
        if (billDate !== customDate) return false;
      }

      return true;
    });
  }, [paidBills, billSearch, billMethodFilter, billDateFilter, customDate, todayStr, yesterdayStr]);

  // Aggregate statistics for old bills
  const totalSettledRevenue = filteredOldBills.reduce((acc, b) => acc + (Number(b.grandTotal) || 0), 0);
  const totalTaxCollected = filteredOldBills.reduce((acc, b) => acc + (Number(b.taxAmount) || 0), 0);

  // Paginated Old Bills
  const paginatedOldBills = useMemo(() => {
    const start = (billsCurrentPage - 1) * billsPageSize;
    return filteredOldBills.slice(start, start + billsPageSize);
  }, [filteredOldBills, billsCurrentPage, billsPageSize]);

  const totalBillsPages = Math.ceil(filteredOldBills.length / billsPageSize) || 1;
  const billsStartIndex = (billsCurrentPage - 1) * billsPageSize;

  // Export Old Bills to CSV
  const handleExportBillsCSV = () => {
    const headers = ['Bill Number', 'Date', 'Time', 'Table', 'Grand Total', 'Tax', 'Discount', 'Payment Method', 'Settled By'];
    const rows = filteredOldBills.map((b) => {
      const dt = new Date(b.createdAt);
      const method = b.payments?.[0]?.paymentMethod || 'CASH';
      const cashier = b.payments?.[0]?.recordedBy?.name || b.generatedBy?.name || 'Cashier';
      return [
        `"${b.billNumber}"`,
        `"${formatLocalDate(dt)}"`,
        `"${dt.toLocaleTimeString()}"`,
        `"${b.table?.tableNumber || 'Takeaway'}"`,
        `"${b.grandTotal}"`,
        `"${b.taxAmount}"`,
        `"${b.discountAmount}"`,
        `"${method}"`,
        `"${cashier}"`,
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `restaurant_bills_archive_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-3">
            <span className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Receipt className="w-6 h-6" />
            </span>
            <span>Manager Operations & Cashier Billing</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time table checkout, GST bill generation, payment settlements, and historical bills archive
          </p>
        </div>

        {/* Refresh button */}
        <button
          onClick={loadData}
          disabled={loading}
          className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition self-start sm:self-auto"
          title="Refresh Billing Data"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}
      {actionError && (
        <div className="p-3.5 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Today's Revenue"
          value={`${currency}${metrics?.todayRevenue || '0.00'}`}
          icon={DollarSign}
          color="emerald"
          trend="Real payments collected"
        />
        <StatCard
          title="Today's Orders"
          value={metrics?.todayOrders || 0}
          subtitle={`${metrics?.pendingOrders || 0} currently active`}
          icon={ShoppingBag}
          color="amber"
        />
        <StatCard
          title="Tables Occupancy"
          value={`${metrics?.occupiedTables || 0} / ${metrics?.totalTables || 0}`}
          subtitle={`${metrics?.billingTables || 0} awaiting bill payment`}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Settled Bills Archive"
          value={paidBills.length}
          subtitle={`${unpaidBills.length} awaiting settlement`}
          icon={Receipt}
          color="purple"
        />
      </div>

      {/* MAIN NAVIGATION TABS: Active Operations VS Old Bills Archive */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setMainTab('ACTIVE')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition ${
            mainTab === 'ACTIVE'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Active Checkout & Unpaid Bills ({unpaidBills.length})</span>
        </button>

        <button
          onClick={() => setMainTab('OLD_BILLS')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition ${
            mainTab === 'OLD_BILLS'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Old & Settled Bills Archive ({paidBills.length})</span>
        </button>
      </div>

      {/* TAB 1: ACTIVE SETTLEMENT & CHECKOUT QUEUE */}
      {mainTab === 'ACTIVE' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Active Orders requiring Bill Generation */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="font-bold text-base text-white flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-amber-500" />
                  <span>Active Dine-In Table Orders</span>
                </h3>
                <span className="text-xs text-amber-400 font-bold px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                  {activeOrders.length} Tables
                </span>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
                {activeOrders.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-8 text-center">No active dine-in orders</p>
                ) : (
                  activeOrders.map((ord) => (
                    <div
                      key={ord.id}
                      className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700 transition"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-white text-sm sm:text-base">
                            {ord.table?.tableNumber?.startsWith('Table')
                              ? ord.table.tableNumber
                              : `Table ${ord.table?.tableNumber || 'Takeaway'}`}
                          </span>
                          {ord.table?.status === 'BILLING' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/20 text-blue-400 border border-blue-500/30 animate-pulse">
                              🔔 BILL REQUESTED
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400 font-mono">({ord.orderNumber})</span>
                        </div>
                        <div className="text-xs text-slate-400">
                          {ord.items?.length || 0} items • Waiter: <span className="text-slate-300 font-medium">{ord.waiter?.name || 'Staff'}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/80">
                        <span className="font-black text-amber-400 text-sm sm:text-base">
                          {currency}{ord.totalAmount}
                        </span>
                        <button
                          onClick={() => handleGenerateBill(ord.id)}
                          className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1 shadow-md shadow-amber-500/20 transition shrink-0"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                          <span>Generate Bill</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Unpaid Bills Awaiting Cashier Payment */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="font-bold text-base text-white flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-400" />
                  <span>Unpaid Bills (Cashier Settlement)</span>
                </h3>
                <span className="text-xs text-emerald-400 font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  {unpaidBills.length} Unsettled
                </span>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
                {unpaidBills.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-8 text-center">All bills settled!</p>
                ) : (
                  unpaidBills.map((b) => (
                    <div
                      key={b.id}
                      className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700 transition"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
                            {b.table?.tableNumber?.startsWith('Table')
                              ? b.table.tableNumber
                              : `Table ${b.table?.tableNumber || 'Takeaway'}`}
                          </span>
                          <span className="font-mono text-white text-xs font-bold">{b.billNumber}</span>
                        </div>
                        <div className="text-xs text-slate-400">
                          Grand Total: <strong className="text-emerald-400 font-bold">{currency}{b.grandTotal}</strong> <span className="text-[10px] text-slate-500">(GST {b.taxPercentage}%)</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/80">
                        <button
                          onClick={() => {
                            setActiveBill(b);
                            setShowBillModal(true);
                          }}
                          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                          title="View & Print Bill"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openPayment(b)}
                          className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1 shadow-md shadow-amber-500/20 transition shrink-0"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Collect Payment</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Service Staff & Chef Daily Telemetry Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
            {/* Staff Performance */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-400" />
                <span>Today's Service Staff Performance</span>
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                      <th className="py-2 px-2">Staff Member</th>
                      <th className="py-2 text-center px-2">Orders Taken</th>
                      <th className="py-2 text-center px-2">Dishes Delivered</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {metrics?.staffPerformance?.map((s: any) => (
                      <tr key={s.id} className="hover:bg-slate-800/30 transition">
                        <td className="py-2.5 px-2 font-bold text-white">{s.name || s.username}</td>
                        <td className="py-2.5 px-2 text-center font-semibold text-amber-400">
                          {s.ordersTaken}
                        </td>
                        <td className="py-2.5 px-2 text-center font-semibold text-emerald-400">
                          {s.itemsDelivered}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Chef Performance */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <ChefHat className="w-4 h-4 text-amber-400" />
                <span>Today's Chef Performance</span>
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                      <th className="py-2 px-2">Chef</th>
                      <th className="py-2 text-center px-2">Dishes Prepared</th>
                      <th className="py-2 text-center px-2">Currently Cooking</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {metrics?.chefPerformance?.map((c: any) => (
                      <tr key={c.id} className="hover:bg-slate-800/30 transition">
                        <td className="py-2.5 px-2 font-bold text-white">{c.name || c.username}</td>
                        <td className="py-2.5 px-2 text-center font-semibold text-rose-400">
                          {c.itemsPrepared}
                        </td>
                        <td className="py-2.5 px-2 text-center font-semibold text-amber-400">
                          {c.currentlyCooking}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: HISTORICAL & SETTLED BILLS ARCHIVE (OLD BILLS) */}
      {mainTab === 'OLD_BILLS' && (
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-6 animate-fadeIn">
          {/* Header & Filter Controls */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                  <History className="w-5 h-5 text-amber-500" />
                  <span>Historical Bills & Settled Invoices Archive</span>
                </h3>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {filteredOldBills.length} Bills Found
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Browse past receipts, reprints, view payment methods (CASH/UPI/CARD), and export financial summaries
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleExportBillsCSV}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition"
                title="Download CSV spreadsheet"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Filter Bar: Search, Payment Method, Date Presets */}
          <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between">
            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={billSearch}
                onChange={(e) => setBillSearch(e.target.value)}
                placeholder="Search Bill #, Table, Waiter, Cashier..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Payment Method Filter */}
              <div className="flex items-center p-0.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                {(['ALL', 'UPI', 'CASH', 'CARD'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setBillMethodFilter(m)}
                    className={`px-3 py-1.5 rounded-lg font-bold transition text-xs ${
                      billMethodFilter === m
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>

              {/* Date Presets */}
              <button
                onClick={() => {
                  setBillDateFilter('ALL');
                  setCustomDate('');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                  billDateFilter === 'ALL'
                    ? 'bg-amber-500 text-slate-950 border-amber-500'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                All Time
              </button>
              <button
                onClick={() => {
                  setBillDateFilter('TODAY');
                  setCustomDate('');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                  billDateFilter === 'TODAY'
                    ? 'bg-amber-500 text-slate-950 border-amber-500'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                Today
              </button>
              <button
                onClick={() => {
                  setBillDateFilter('YESTERDAY');
                  setCustomDate('');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                  billDateFilter === 'YESTERDAY'
                    ? 'bg-amber-500 text-slate-950 border-amber-500'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                Yesterday
              </button>

              {/* Custom Date Input */}
              <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => {
                    setCustomDate(e.target.value);
                    setBillDateFilter('CUSTOM');
                  }}
                  className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer text-xs"
                />
              </div>
            </div>
          </div>

          {/* Financial Totals Ribbon for Filtered Bills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Total Filtered Bills</span>
              <div className="text-lg font-black text-white mt-0.5">{filteredOldBills.length}</div>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Total Settled Revenue</span>
              <div className="text-lg font-black text-emerald-400 mt-0.5">
                {currency}{totalSettledRevenue.toFixed(2)}
              </div>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Total GST / Tax</span>
              <div className="text-lg font-black text-amber-400 mt-0.5">
                {currency}{totalTaxCollected.toFixed(2)}
              </div>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Avg Settlement Value</span>
              <div className="text-lg font-black text-purple-400 mt-0.5">
                {currency}
                {filteredOldBills.length > 0
                  ? (totalSettledRevenue / filteredOldBills.length).toFixed(2)
                  : '0.00'}
              </div>
            </div>
          </div>

          {/* Settled Bills Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left min-w-[800px]">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                  <th className="py-2.5 px-3">Bill Number</th>
                  <th className="py-2.5 px-3">Date & Time</th>
                  <th className="py-2.5 px-3">Table & Floor</th>
                  <th className="py-2.5 px-3">Waiter</th>
                  <th className="py-2.5 px-3">Items</th>
                  <th className="py-2.5 px-3">Payment Mode</th>
                  <th className="py-2.5 px-3">Settled By</th>
                  <th className="py-2.5 px-3 text-right">Grand Total</th>
                  <th className="py-2.5 px-3 text-center">Receipt Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredOldBills.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-500 italic">
                      No historical bills found matching your filter criteria.
                    </td>
                  </tr>
                ) : (
                  paginatedOldBills.map((bill) => {
                    const dt = new Date(bill.createdAt);
                    const payment = bill.payments?.[0];
                    const method = payment?.paymentMethod || 'UPI';
                    const cashier = payment?.recordedBy?.name || bill.generatedBy?.name || 'Cashier';
                    const itemsCount = bill.order?.items?.length || 0;

                    return (
                      <tr key={bill.id} className="hover:bg-slate-800/30 transition">
                        <td className="py-3 px-3 font-mono font-bold text-amber-400">
                          {bill.billNumber}
                        </td>
                        <td className="py-3 px-3 text-slate-300 whitespace-nowrap">
                          <div>{formatLocalDate(dt)}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{dt.toLocaleTimeString()}</div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-bold text-white">
                            {bill.table?.tableNumber?.startsWith('Table')
                              ? bill.table.tableNumber
                              : `Table ${bill.table?.tableNumber || 'Takeaway'}`}
                          </span>
                          <span className="text-[10px] text-slate-400 block">{bill.table?.floor?.name || 'Main Hall'}</span>
                        </td>
                        <td className="py-3 px-3 text-slate-300">
                          {bill.order?.waiter?.name || 'Service Staff'}
                        </td>
                        <td className="py-3 px-3 text-slate-300 font-semibold">
                          {itemsCount} items
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase inline-flex items-center gap-1 ${
                              method === 'UPI'
                                ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                : method === 'CASH'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            }`}
                          >
                            {method === 'UPI' && <QrCode className="w-2.5 h-2.5" />}
                            {method === 'CASH' && <Banknote className="w-2.5 h-2.5" />}
                            {method === 'CARD' && <CreditCard className="w-2.5 h-2.5" />}
                            <span>{method}</span>
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-300">
                          {cashier}
                        </td>
                        <td className="py-3 px-3 font-bold text-right text-emerald-400 font-mono text-sm">
                          {currency}{Number(bill.grandTotal).toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => {
                              setActiveBill(bill);
                              setShowBillModal(true);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-semibold inline-flex items-center gap-1 transition"
                            title="View & Reprint Receipt"
                          >
                            <Eye className="w-3.5 h-3.5 text-amber-400" />
                            <span>View Bill</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Historical Bills Pagination Controls */}
          {filteredOldBills.length > 0 && (
            <div className="p-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 bg-slate-900/40 rounded-2xl">
              <div>
                Showing <span className="font-bold text-white">{billsStartIndex + 1}</span> to{' '}
                <span className="font-bold text-white">
                  {Math.min(billsStartIndex + billsPageSize, filteredOldBills.length)}
                </span>{' '}
                of <span className="font-bold text-white">{filteredOldBills.length}</span> historical bills
              </div>

              <div className="flex items-center gap-3">
                {/* Page Size Selector */}
                <div className="flex items-center gap-1.5">
                  <span>Show:</span>
                  <select
                    value={billsPageSize}
                    onChange={(e) => {
                      setBillsPageSize(Number(e.target.value));
                      setBillsCurrentPage(1);
                    }}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-white font-bold text-xs focus:outline-none focus:border-amber-500"
                  >
                    <option value={5}>5 / page</option>
                    <option value={10}>10 / page</option>
                    <option value={20}>20 / page</option>
                    <option value={50}>50 / page</option>
                  </select>
                </div>

                {/* Page Prev/Next Buttons */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setBillsCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={billsCurrentPage === 1}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    title="Previous Page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="px-3 py-1 rounded-lg bg-slate-950 border border-slate-800 font-bold text-xs text-amber-400">
                    {billsCurrentPage} / {totalBillsPages}
                  </div>

                  <button
                    onClick={() => setBillsCurrentPage((p) => Math.min(totalBillsPages, p + 1))}
                    disabled={billsCurrentPage >= totalBillsPages}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    title="Next Page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bill View & Printable Modal */}
      <Modal
        isOpen={showBillModal}
        onClose={() => setShowBillModal(false)}
        title={activeBill?.billNumber || 'Bill'}
      >
        {activeBill && (
          <div className="space-y-4">
            <PrintableBill bill={activeBill} />
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition"
              >
                <Printer className="w-4 h-4" />
                <span>Print Physical Bill</span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Payment Processing Modal */}
      <Modal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title={`Record Settlement - ${activeBill?.billNumber || ''}`}
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center">
            <div className="text-xs text-slate-400 uppercase font-bold">Outstanding Payable</div>
            <div className="text-3xl font-black text-amber-400 mt-1">
              {currency}{paymentAmount}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {activeBill?.table?.tableNumber?.startsWith('Table')
                ? activeBill.table.tableNumber
                : `Table ${activeBill?.table?.tableNumber || 'Takeaway'}`}{' '}
              • Inclusive of GST
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">
              Select Settlement Payment Mode
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['UPI', 'CASH', 'CARD'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPaymentMethod(mode)}
                  className={`p-3 rounded-xl border font-bold text-xs flex flex-col items-center justify-center gap-1.5 transition ${
                    paymentMethod === mode
                      ? 'border-amber-500 bg-amber-500/10 text-white shadow-lg'
                      : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {mode === 'UPI' && <QrCode className="w-5 h-5 text-amber-400" />}
                  {mode === 'CASH' && <Banknote className="w-5 h-5 text-emerald-400" />}
                  {mode === 'CARD' && <CreditCard className="w-5 h-5 text-blue-400" />}
                  <span>{mode}</span>
                </button>
              ))}
            </div>
          </div>

          {paymentMethod === 'UPI' && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                UPI Reference ID / UTR Number
              </label>
              <input
                type="text"
                placeholder="e.g. 329048102948"
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-amber-500"
              />
            </div>
          )}

          <button
            onClick={handleRecordPayment}
            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-sm shadow-xl shadow-amber-500/20 transition flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            <span>Confirm Settlement of {currency}{paymentAmount}</span>
          </button>
        </div>
      </Modal>
    </div>
  );
};
