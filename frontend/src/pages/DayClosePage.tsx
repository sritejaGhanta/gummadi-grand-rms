import React, { useState, useEffect } from 'react';
import {
  Lock,
  DollarSign,
  CreditCard,
  Smartphone,
  Calendar,
  Printer,
  CheckCircle,
  AlertTriangle,
  History,
  RefreshCw,
  FileSpreadsheet,
} from 'lucide-react';
import { billingApi } from '../api/endpoints';

export const DayClosePage: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [summary, setSummary] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [actualCash, setActualCash] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [closing, setClosing] = useState(false);
  const [closeSuccess, setCloseSuccess] = useState(false);

  const loadSummary = async () => {
    try {
      setLoading(true);
      const [sumRes, histRes] = await Promise.all([
        billingApi.getDaySummary(selectedDate),
        billingApi.getDayCloseHistory(),
      ]);
      const data = sumRes.data?.data || sumRes.data || {};
      setSummary(data);
      if (data.isClosed && data.dayCloseRecord) {
        setActualCash(String(data.dayCloseRecord.actualCashCounted));
        setNotes(data.dayCloseRecord.notes || '');
      } else {
        setActualCash('');
        setNotes('');
      }
      setHistory(histRes.data?.data || histRes.data || []);
    } catch (err) {
      console.error('Failed to load day summary', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, [selectedDate]);

  const handleDayClose = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actualCash) return;
    try {
      setClosing(true);
      await billingApi.recordDayClose({
        date: selectedDate,
        actualCashCounted: parseFloat(actualCash),
        notes,
      });
      setCloseSuccess(true);
      loadSummary();
      setTimeout(() => setCloseSuccess(false), 5000);
    } catch (err) {
      console.error('Failed to close day', err);
    } finally {
      setClosing(false);
    }
  };

  const expectedCash = summary?.expectedCash || 0;
  const countedNum = parseFloat(actualCash) || 0;
  const variance = actualCash !== '' ? Number((countedNum - expectedCash).toFixed(2)) : 0;

  return (
    <div className="space-y-6 p-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Lock className="h-7 w-7 text-indigo-400" />
            <h1 className="text-2xl font-bold tracking-tight text-white">
              End-of-Day (EOD) Cash Reconciliation
            </h1>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Reconcile daily drawer cash, tally UPI/Card payments, and generate official Daily Z-Reports
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-1.5 text-xs text-slate-300">
            <Calendar className="h-4 w-4 text-slate-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-white focus:outline-none"
            />
          </div>

          <button
            onClick={loadSummary}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
          <div className="text-xs text-slate-400 mb-1">Total Sales ({summary?.paidBillsCount || 0} Bills)</div>
          <div className="text-2xl font-mono font-bold text-white">
            ₹{Number(summary?.totalSales || 0).toFixed(2)}
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <div className="flex items-center gap-1 text-xs text-emerald-400 mb-1">
            <DollarSign className="h-3.5 w-3.5" /> Cash Collected
          </div>
          <div className="text-2xl font-mono font-bold text-emerald-300">
            ₹{Number(summary?.totalCash || 0).toFixed(2)}
          </div>
        </div>

        <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-4">
          <div className="flex items-center gap-1 text-xs text-indigo-400 mb-1">
            <Smartphone className="h-3.5 w-3.5" /> UPI Payments
          </div>
          <div className="text-2xl font-mono font-bold text-indigo-300">
            ₹{Number(summary?.totalUpi || 0).toFixed(2)}
          </div>
        </div>

        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
          <div className="flex items-center gap-1 text-xs text-amber-400 mb-1">
            <CreditCard className="h-3.5 w-3.5" /> Card Swipes
          </div>
          <div className="text-2xl font-mono font-bold text-amber-300">
            ₹{Number(summary?.totalCard || 0).toFixed(2)}
          </div>
        </div>
      </div>

      {/* Reconciliation Action Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cashier Count Form */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-bold text-white text-base">Drawer Reconciliation for {selectedDate}</h3>
            {summary?.isClosed ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-400 border border-emerald-500/30">
                <CheckCircle className="h-3.5 w-3.5" /> Day Locked & Closed
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-bold text-amber-300 border border-amber-500/30">
                <Lock className="h-3.5 w-3.5" /> Open (Pending Close)
              </span>
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-xl bg-slate-950 p-4 border border-slate-800 flex justify-between items-center">
              <div>
                <div className="text-xs text-slate-400">System Expected Cash</div>
                <div className="text-xs text-slate-500">Calculated from all paid cash receipts</div>
              </div>
              <div className="text-xl font-mono font-bold text-white">
                ₹{Number(expectedCash).toFixed(2)}
              </div>
            </div>

            <form onSubmit={handleDayClose} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Physical Cash Counted in Drawer (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  disabled={summary?.isClosed}
                  placeholder="Enter physical cash in drawer..."
                  value={actualCash}
                  onChange={(e) => setActualCash(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white focus:border-indigo-500 focus:outline-none font-mono disabled:opacity-60"
                />
              </div>

              {/* Variance Indicator */}
              {actualCash !== '' && (
                <div
                  className={`rounded-xl p-4 border transition ${
                    variance === 0
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : variance < 0
                      ? 'bg-red-500/10 border-red-500/30 text-red-300'
                      : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">Variance (Difference):</span>
                    <span className="text-base font-mono font-bold">
                      {variance === 0
                        ? '₹0.00 (Matched)'
                        : variance < 0
                        ? `-₹${Math.abs(variance).toFixed(2)} (Shortage)`
                        : `+₹${variance.toFixed(2)} (Excess)`}
                    </span>
                  </div>
                  {variance < 0 && (
                    <div className="text-[11px] text-red-400/90 mt-1">
                      ⚠️ Warning: Physical cash is less than system total. Please check cash register or explain in notes.
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Cashier Notes / Shift Remarks</label>
                <textarea
                  rows={2}
                  disabled={summary?.isClosed}
                  placeholder="e.g. ₹50 pet cash kept for tomorrow morning float"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none disabled:opacity-60"
                />
              </div>

              {!summary?.isClosed ? (
                <button
                  type="submit"
                  disabled={closing || actualCash === ''}
                  className="w-full rounded-xl bg-indigo-600 py-3 text-xs font-bold text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-500 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Lock className="h-4 w-4" /> {closing ? 'Closing Day...' : 'Lock & Finalize Day Close'}
                </button>
              ) : (
                <div className="text-center text-xs text-slate-500 py-2">
                  🔒 Day closed on {new Date(summary?.dayCloseRecord?.createdAt).toLocaleString('en-IN')}.
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Printable Daily Z-Report Slip Preview */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 flex flex-col items-center">
          <div className="w-full flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
            <h3 className="font-bold text-white text-base">Daily Z-Report Slip Preview</h3>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition shadow"
            >
              <Printer className="h-3.5 w-3.5" /> Print Z-Report
            </button>
          </div>

          <div
            id="z-report-printable"
            className="w-full max-w-sm rounded bg-white p-5 text-slate-900 font-mono text-[11px] leading-tight shadow-md border border-slate-300"
            style={{ fontFamily: "'Courier New', Courier, monospace" }}
          >
            <div className="text-center pb-2 border-b border-dashed border-slate-400">
              <div className="text-sm font-bold tracking-tight uppercase">Gummadi Grand Restaurant</div>
              <div className="text-[10px] text-slate-600">*** DAILY Z-REPORT (EOD) ***</div>
              <div className="text-[10px] mt-1 font-semibold">Date: {selectedDate}</div>
            </div>

            <div className="py-2 border-b border-dashed border-slate-400 space-y-1 text-[10px]">
              <div className="flex justify-between">
                <span>Total Orders Billed:</span>
                <span className="font-bold">{summary?.paidBillsCount || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Gross Revenue:</span>
                <span>₹{Number(summary?.totalSales || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Discounts Offered:</span>
                <span>-₹{Number(summary?.totalDiscount || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Total GST Collected:</span>
                <span>₹{Number(summary?.totalTax || 0).toFixed(2)}</span>
              </div>
            </div>

            <div className="py-2 border-b border-dashed border-slate-400 space-y-1 text-[10px]">
              <div className="font-bold pb-0.5 text-slate-800">PAYMENT TENDER SUMMARY:</div>
              <div className="flex justify-between">
                <span>Cash:</span>
                <span className="font-bold">₹{Number(summary?.totalCash || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>UPI / QR:</span>
                <span className="font-bold">₹{Number(summary?.totalUpi || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Card (POS):</span>
                <span className="font-bold">₹{Number(summary?.totalCard || 0).toFixed(2)}</span>
              </div>
            </div>

            <div className="py-2 border-b border-dashed border-slate-400 space-y-1 text-[10px]">
              <div className="font-bold pb-0.5 text-slate-800">DRAWER RECONCILIATION:</div>
              <div className="flex justify-between">
                <span>Expected Cash:</span>
                <span>₹{Number(expectedCash).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Actual Counted:</span>
                <span className="font-bold">₹{Number(countedNum).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Variance (Diff):</span>
                <span className={variance < 0 ? 'text-red-600' : 'text-emerald-700'}>
                  {variance >= 0 ? `+₹${variance.toFixed(2)}` : `-₹${Math.abs(variance).toFixed(2)}`}
                </span>
              </div>
            </div>

            <div className="pt-3 text-center text-[9px] text-slate-500">
              <div>Manager Signature: __________________</div>
              <div className="mt-2 text-[8px] tracking-widest text-slate-400">||||||||||||||||||||||||||||||||</div>
            </div>
          </div>
        </div>
      </div>

      {/* Past Day Closings Log */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 space-y-4 shadow-xl">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-indigo-400" />
          <h3 className="font-bold text-white text-base">Past Day Close History</h3>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-5 py-3.5">Date</th>
                <th className="px-5 py-3.5">Closed By</th>
                <th className="px-5 py-3.5">Total Sales</th>
                <th className="px-5 py-3.5">Cash (Expected)</th>
                <th className="px-5 py-3.5">Cash (Counted)</th>
                <th className="px-5 py-3.5">Variance</th>
                <th className="px-5 py-3.5">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-500">
                    No past day closings recorded yet.
                  </td>
                </tr>
              ) : (
                history.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-5 py-3 font-semibold text-white">{h.closeDate}</td>
                    <td className="px-5 py-3">{h.closedBy?.name || 'Manager'}</td>
                    <td className="px-5 py-3 font-mono font-bold text-white">
                      ₹{Number(h.totalSales).toFixed(2)}
                    </td>
                    <td className="px-5 py-3 font-mono">₹{Number(h.expectedCash).toFixed(2)}</td>
                    <td className="px-5 py-3 font-mono font-bold text-emerald-400">
                      ₹{Number(h.actualCashCounted).toFixed(2)}
                    </td>
                    <td className="px-5 py-3 font-mono">
                      <span
                        className={`rounded px-1.5 py-0.5 font-bold ${
                          Number(h.variance) === 0
                            ? 'text-emerald-400'
                            : Number(h.variance) < 0
                            ? 'bg-red-500/10 text-red-400'
                            : 'bg-amber-500/10 text-amber-300'
                        }`}
                      >
                        {Number(h.variance) >= 0 ? `+₹${Number(h.variance).toFixed(2)}` : `-₹${Math.abs(Number(h.variance)).toFixed(2)}`}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-400 italic text-[11px]">{h.notes || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
