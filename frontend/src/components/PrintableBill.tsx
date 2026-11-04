import React, { useMemo } from 'react';
import { useSettings } from '../context/SettingsContext';
import { Printer, CheckCircle, Clock } from 'lucide-react';

interface PrintableBillProps {
  bill: any;
  onPrint?: () => void;
}

// Convert number to Indian Currency Words
function numberToWordsINR(amount: number): string {
  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function numToWords(n: number): string {
    if (n === 0) return '';
    if (n < 20) return a[n] + ' ';
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '') + ' ';
    if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred ' + numToWords(n % 100);
    if (n < 100000) return numToWords(Math.floor(n / 1000)) + 'Thousand ' + numToWords(n % 1000);
    if (n < 10000000) return numToWords(Math.floor(n / 100000)) + 'Lakh ' + numToWords(n % 100000);
    return numToWords(Math.floor(n / 10000000)) + 'Crore ' + numToWords(n % 10000000);
  }

  const rounded = Math.round(amount * 100) / 100;
  const rupees = Math.floor(rounded);
  const paise = Math.round((rounded - rupees) * 100);

  let result = 'Rupees ' + (rupees === 0 ? 'Zero ' : numToWords(rupees));
  if (paise > 0) {
    result += 'and ' + numToWords(paise) + 'Paise ';
  }
  return result.trim() + ' Only';
}

export const PrintableBill: React.FC<PrintableBillProps> = ({ bill, onPrint }) => {
  const { settings, currency } = useSettings();

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  // Group & consolidate identical dishes into clean, single line items
  const aggregatedItems = useMemo(() => {
    if (!bill?.order?.items) return [];

    const map = new Map<
      string,
      {
        key: string;
        name: string;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
        isVeg?: boolean;
        specialInstructions?: string[];
      }
    >();

    for (const item of bill.order.items) {
      if (item.status === 'CANCELLED') continue;

      const foodId = item.foodItemId || item.foodItem?.id || item.name;
      const unitPrice = Number(item.unitPrice || item.foodItem?.price || 0);
      const name = item.foodItem?.name || item.name || 'Dish Item';
      const key = `${foodId}_${unitPrice.toFixed(2)}`;

      if (map.has(key)) {
        const existing = map.get(key)!;
        existing.quantity += Number(item.quantity || 1);
        existing.totalPrice += Number(item.totalPrice || unitPrice * Number(item.quantity || 1));
        if (
          item.specialInstructions &&
          !existing.specialInstructions?.includes(item.specialInstructions)
        ) {
          existing.specialInstructions?.push(item.specialInstructions);
        }
      } else {
        map.set(key, {
          key,
          name,
          quantity: Number(item.quantity || 1),
          unitPrice,
          totalPrice: Number(item.totalPrice || unitPrice * Number(item.quantity || 1)),
          isVeg: item.foodItem?.isVeg,
          specialInstructions: item.specialInstructions ? [item.specialInstructions] : [],
        });
      }
    }

    return Array.from(map.values());
  }, [bill]);

  if (!bill) return null;

  const totalQty = aggregatedItems.reduce((acc, it) => acc + it.quantity, 0);
  const totalItemCount = aggregatedItems.length;

  const subtotal = Number(bill.subtotal || 0);
  const discountAmount = Number(bill.discountAmount || 0);
  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxPercentage = Number(bill.taxPercentage || 5.0);
  const taxAmount = Number(bill.taxAmount || 0);
  const halfTaxRate = (taxPercentage / 2).toFixed(2);
  const halfTaxAmount = (taxAmount / 2).toFixed(2);
  const grandTotal = Number(bill.grandTotal || 0);

  const tableDisplay =
    bill.table?.tableNumber ||
    bill.order?.table?.tableNumber ||
    'Takeaway';
  const floorDisplay =
    bill.table?.floor?.name ||
    bill.order?.table?.floor?.name ||
    '';

  const waiterName =
    bill.order?.waiter?.name ||
    bill.order?.steward?.name ||
    bill.waiter?.name ||
    '';

  const cashierName = bill.generatedBy?.name || 'Vikram Manager';

  return (
    <div className="space-y-4">
      {/* Top Action Header (Hidden during actual printing) */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-2">
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
              bill.status === 'PAID'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
            }`}
          >
            {bill.status === 'PAID' ? 'Paid' : 'Unpaid'}
          </span>
          <span className="text-xs text-slate-400">
            {totalItemCount} Items ({totalQty} Portions)
          </span>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition shadow-lg shadow-emerald-500/20"
        >
          <Printer className="w-4 h-4" />
          <span>Print</span>
        </button>
      </div>

      {/* Printable Area - Standard 80mm Thermal Receipt */}
      <div
        id="printable-bill-receipt"
        className="bg-white text-slate-950 p-5 rounded-2xl font-mono text-xs max-w-[360px] mx-auto shadow-2xl border border-slate-200 select-text"
      >
        {/* Restaurant Header */}
        <div className="text-center pb-2.5 border-b-2 border-dashed border-gray-400">
          <h2 className="text-xl font-black uppercase tracking-wider text-black">
            {settings.restaurant_name || 'GG'}
          </h2>
          <p className="text-[10px] font-bold uppercase tracking-tight text-gray-700 mt-0.5">
            Restaurant & Fine Dining
          </p>
          <p className="text-[10px] text-gray-600 mt-1 leading-snug px-2">
            {settings.address || 'Beside Old Bus Stand, Powerpet, Eluru, Andhra Pradesh 534002'}
          </p>
          <p className="text-[10px] text-gray-600 mt-0.5 font-semibold">
            Phone: {settings.contact_number || '+91 8812 234567'}
          </p>
          {settings.gst_number && (
            <p className="text-[10px] font-bold text-gray-900 mt-0.5 tracking-wider">
              GSTIN: {settings.gst_number}
            </p>
          )}
          <div className="mt-1 pt-1 border-t border-dotted border-gray-300">
            <span className="inline-block px-3 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-gray-100 text-gray-900 border border-gray-300">
              Tax Invoice
            </span>
          </div>
        </div>

        {/* Invoice Metadata */}
        <div className="py-2.5 border-b-2 border-dashed border-gray-400 space-y-1 text-[11px] leading-tight">
          <div className="flex justify-between items-baseline font-bold">
            <span className="text-gray-700">Bill No:</span>
            <span className="font-extrabold text-black tracking-tight">{bill.billNumber}</span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="text-gray-700 font-semibold">Table:</span>
            <span className="font-bold text-black">
              {tableDisplay} {floorDisplay ? `(${floorDisplay})` : ''}
            </span>
          </div>
          <div className="flex justify-between text-gray-700">
            <span>Date: {new Date(bill.createdAt).toLocaleDateString()}</span>
            <span>
              Time:{' '}
              {new Date(bill.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
          <div className="flex justify-between text-gray-700">
            <span>Billed By: {cashierName}</span>
            {waiterName && <span>Steward: {waiterName}</span>}
          </div>
          <div className="flex justify-between items-center pt-0.5 text-[10px]">
            <span className="text-gray-600">Payment Status:</span>
            <span
              className={`font-black uppercase px-1.5 py-0.2 rounded text-[10px] ${
                bill.status === 'PAID'
                  ? 'bg-green-100 text-green-800 border border-green-300'
                  : 'bg-amber-100 text-amber-800 border border-amber-300'
              }`}
            >
              {bill.status}
            </span>
          </div>
        </div>

        {/* Consolidated Items Table */}
        <div className="py-2 border-b-2 border-dashed border-gray-400">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-400 pb-1 font-black text-[10px] uppercase text-gray-800">
                <th className="py-1 w-6">#</th>
                <th className="py-1">Item Description</th>
                <th className="text-center py-1 w-10">Qty</th>
                <th className="text-right py-1 w-14">Rate</th>
                <th className="text-right py-1 w-16">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dotted divide-gray-300 text-[11px]">
              {aggregatedItems.map((item, idx) => (
                <tr key={item.key || idx} className="align-top">
                  <td className="py-1.5 text-gray-500 font-medium">{idx + 1}</td>
                  <td className="py-1.5 pr-1 font-bold text-gray-900 leading-tight">
                    <div>{item.name}</div>
                    {item.specialInstructions && item.specialInstructions.length > 0 && (
                      <div className="text-[9px] text-gray-500 font-normal italic mt-0.5">
                        Note: {item.specialInstructions.join(', ')}
                      </div>
                    )}
                  </td>
                  <td className="text-center py-1.5 font-extrabold text-black">{item.quantity}</td>
                  <td className="text-right py-1.5 text-gray-700 font-medium whitespace-nowrap">
                    {currency}
                    {item.unitPrice.toFixed(2)}
                  </td>
                  <td className="text-right py-1.5 font-black text-black whitespace-nowrap">
                    {currency}
                    {item.totalPrice.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals & Tax Calculation Summary */}
        <div className="py-2.5 border-b-2 border-dashed border-gray-400 space-y-1.5 text-[11px]">
          <div className="flex justify-between text-gray-700">
            <span>
              Total Items: <strong>{totalItemCount}</strong>
            </span>
            <span>
              Total Qty: <strong>{totalQty}</strong>
            </span>
          </div>

          <div className="flex justify-between font-bold pt-1 border-t border-gray-200">
            <span>Subtotal:</span>
            <span>
              {currency}
              {subtotal.toFixed(2)}
            </span>
          </div>

          {discountAmount > 0 && (
            <div className="flex justify-between text-emerald-800 font-semibold">
              <span>Special Discount:</span>
              <span>
                -{currency}
                {discountAmount.toFixed(2)}
              </span>
            </div>
          )}

          {discountAmount > 0 && (
            <div className="flex justify-between text-gray-700">
              <span>Taxable Value:</span>
              <span>
                {currency}
                {taxableAmount.toFixed(2)}
              </span>
            </div>
          )}

          {/* Split GST Breakdown (CGST + SGST) */}
          <div className="space-y-0.5 pt-0.5 text-gray-700 text-[10px]">
            <div className="flex justify-between">
              <span>CGST ({halfTaxRate}%):</span>
              <span>
                {currency}
                {halfTaxAmount}
              </span>
            </div>
            <div className="flex justify-between">
              <span>SGST ({halfTaxRate}%):</span>
              <span>
                {currency}
                {halfTaxAmount}
              </span>
            </div>
          </div>

          {/* Grand Total */}
          <div className="flex justify-between items-baseline font-black text-base pt-2 border-t-2 border-black text-black">
            <span className="tracking-wide">GRAND TOTAL:</span>
            <span className="text-lg tracking-tight">
              {currency}
              {grandTotal.toFixed(2)}
            </span>
          </div>

          {/* Amount in words */}
          <div className="pt-1 text-[10px] text-gray-600 font-semibold italic leading-tight">
            ({numberToWordsINR(grandTotal)})
          </div>
        </div>

        {/* Payments Settlement Info (if Paid) */}
        {bill.payments && bill.payments.length > 0 && (
          <div className="py-2 border-b-2 border-dashed border-gray-400 text-[10px] text-gray-800 space-y-1">
            <div className="font-black uppercase tracking-wider text-gray-900">
              Settlement Details:
            </div>
            {bill.payments.map((p: any, idx: number) => (
              <div key={idx} className="flex justify-between font-semibold">
                <span>
                  Mode: <strong className="text-black">{p.paymentMethod}</strong>
                  {p.transactionReference ? ` (Ref: ${p.transactionReference})` : ''}
                </span>
                <span className="font-bold text-black">
                  {currency}
                  {Number(p.amount).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Footer Greetings */}
        <div className="text-center pt-3 text-[10px] text-gray-600 space-y-1">
          <p className="font-black text-gray-900 tracking-wider uppercase">
            *** Thank You! Visit Again ***
          </p>
          <p className="text-[9px] text-gray-500">
            For Feedback & Reservations: {settings.contact_number || '+91 8812 234567'}
          </p>
        </div>
      </div>
    </div>
  );
};
