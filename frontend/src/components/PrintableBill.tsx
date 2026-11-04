import React from 'react';
import { useSettings } from '../context/SettingsContext';
import { Printer } from 'lucide-react';

interface PrintableBillProps {
  bill: any;
  onPrint?: () => void;
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

  if (!bill) return null;

  return (
    <div className="space-y-4">
      {/* Action button */}
      <div className="flex justify-end print:hidden">
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-xl text-sm transition shadow-lg shadow-amber-500/20"
        >
          <Printer className="w-4 h-4" />
          Print Receipt (Thermal 80mm)
        </button>
      </div>

      {/* Printable Area */}
      <div className="bg-white text-black p-6 rounded-xl font-mono text-xs max-w-sm mx-auto shadow-xl border border-slate-300 print:shadow-none print:border-none print:m-0 print:p-2">
        {/* Header */}
        <div className="text-center pb-3 border-b border-dashed border-gray-400">
          <h2 className="text-base font-bold uppercase tracking-wider">
            {settings.restaurant_name || 'Royal Feast Palace'}
          </h2>
          <p className="text-[10px] text-gray-600 mt-0.5">
            {settings.address || '123 Royal Grand Road, Hyderabad'}
          </p>
          <p className="text-[10px] text-gray-600">Ph: {settings.contact_number || '+91 9876543210'}</p>
          {settings.gst_number && (
            <p className="text-[10px] font-semibold text-gray-800">GSTIN: {settings.gst_number}</p>
          )}
        </div>

        {/* Invoice Info */}
        <div className="py-2 border-b border-dashed border-gray-400 space-y-0.5 text-[11px]">
          <div className="flex justify-between">
            <span>Bill No: <strong>{bill.billNumber}</strong></span>
            <span>Table: <strong>{bill.table?.tableNumber || bill.order?.table?.tableNumber}</strong></span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Date: {new Date(bill.createdAt).toLocaleDateString()}</span>
            <span>Time: {new Date(bill.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Billed By: {bill.generatedBy?.name || 'Manager'}</span>
            <span>Status: <strong className={bill.status === 'PAID' ? 'text-green-700' : 'text-amber-700'}>{bill.status}</strong></span>
          </div>
        </div>

        {/* Items Table */}
        <div className="py-2 border-b border-dashed border-gray-400">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-300 pb-1 font-bold text-[10px] uppercase">
                <th className="py-1">Item</th>
                <th className="text-center py-1">Qty</th>
                <th className="text-right py-1">Price</th>
                <th className="text-right py-1">Amt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {bill.order?.items?.filter((item: any) => item.status !== 'CANCELLED').map((item: any, idx: number) => (
                <tr key={item.id || idx}>
                  <td className="py-1 pr-1 truncate max-w-[120px]">{item.foodItem?.name || item.name}</td>
                  <td className="text-center py-1">{item.quantity}</td>
                  <td className="text-right py-1">{currency}{Number(item.unitPrice).toFixed(2)}</td>
                  <td className="text-right py-1 font-semibold">{currency}{Number(item.totalPrice).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Calculation Summary */}
        <div className="py-2 border-b border-dashed border-gray-400 space-y-1 text-[11px]">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>{currency}{Number(bill.subtotal).toFixed(2)}</span>
          </div>
          {Number(bill.discountAmount) > 0 && (
            <div className="flex justify-between text-emerald-700">
              <span>Discount:</span>
              <span>-{currency}{Number(bill.discountAmount).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-gray-600">
            <span>GST ({bill.taxPercentage}%):</span>
            <span>{currency}{Number(bill.taxAmount).toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold text-sm pt-1 border-t border-gray-300">
            <span>GRAND TOTAL:</span>
            <span>{currency}{Number(bill.grandTotal).toFixed(2)}</span>
          </div>
        </div>

        {/* Payments list if paid */}
        {bill.payments && bill.payments.length > 0 && (
          <div className="py-2 border-b border-dashed border-gray-400 text-[10px] text-gray-700">
            <div className="font-bold mb-0.5">Payment Details:</div>
            {bill.payments.map((p: any, idx: number) => (
              <div key={idx} className="flex justify-between">
                <span>Method: {p.paymentMethod} {p.transactionReference ? `(${p.transactionReference})` : ''}</span>
                <span>{currency}{Number(p.amount).toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Footer Text */}
        <div className="text-center pt-3 text-[10px] text-gray-500">
          <p className="mt-1 text-[9px] text-gray-400">Official System Generated Tax Invoice</p>
        </div>
      </div>
    </div>
  );
};
