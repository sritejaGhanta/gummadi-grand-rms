import React, { useState } from 'react';
import { Printer, Share2, X, CheckCircle, FileText, Utensils } from 'lucide-react';
import { billingApi } from '../api/endpoints';

interface ThermalReceiptProps {
  bill: any;
  onClose: () => void;
}

export const ThermalReceiptModal: React.FC<ThermalReceiptProps> = ({ bill, onClose }) => {
  const [paperWidth, setPaperWidth] = useState<'58mm' | '80mm'>('80mm');
  const [printType, setPrintType] = useState<'BILL' | 'KOT'>('BILL');
  const [isSendingWa, setIsSendingWa] = useState(false);
  const [waSentSuccess, setWaSentSuccess] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsAppShare = async () => {
    try {
      setIsSendingWa(true);
      const res = await billingApi.getWhatsAppBill(bill.id);
      if (res.data?.data?.waUrl) {
        window.open(res.data.data.waUrl, '_blank');
        setWaSentSuccess(true);
        setTimeout(() => setWaSentSuccess(false), 4000);
      }
    } catch (err) {
      console.error('Failed to get WhatsApp bill', err);
    } finally {
      setIsSendingWa(false);
    }
  };

  const order = bill.order || {};
  const items = order.items || [];
  const restName = 'Gummadi Grand Restaurant';
  const restAddress = 'Plot 42, Hitech City Main Rd, Madhapur, Hyderabad';
  const gstin = '36AABCU9603R1ZX';
  const fssai = '13622011000452';

  const dateFormatted = new Date(bill.createdAt || Date.now()).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[95vh] w-full max-w-lg flex-col rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
        {/* Header Controls */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4 bg-slate-950">
          <div className="flex items-center gap-2">
            <Printer className="h-5 w-5 text-indigo-400" />
            <h3 className="font-bold text-white text-base">Thermal Receipt Print</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Paper Size & Type Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-slate-900/80 px-5 py-3">
          <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-1 text-xs">
            <button
              onClick={() => setPrintType('BILL')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition ${
                printType === 'BILL' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="h-3.5 w-3.5" /> Customer Bill
            </button>
            <button
              onClick={() => setPrintType('KOT')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition ${
                printType === 'KOT' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Utensils className="h-3.5 w-3.5" /> Kitchen KOT
            </button>
          </div>

          <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-1 text-xs">
            <button
              onClick={() => setPaperWidth('58mm')}
              className={`px-2.5 py-1.5 rounded-md font-semibold transition ${
                paperWidth === '58mm' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              58mm (2")
            </button>
            <button
              onClick={() => setPaperWidth('80mm')}
              className={`px-2.5 py-1.5 rounded-md font-semibold transition ${
                paperWidth === '80mm' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              80mm (3")
            </button>
          </div>
        </div>

        {/* Receipt Visual Paper (Simulated Thermal Print Preview) */}
        <div className="flex-1 overflow-y-auto p-4 flex justify-center bg-slate-950">
          <div
            id="thermal-receipt-printable"
            className={`bg-white text-slate-900 font-mono text-[11px] leading-tight p-4 rounded shadow-lg border border-slate-300 transition-all ${
              paperWidth === '58mm' ? 'w-[280px]' : 'w-[360px]'
            }`}
            style={{ fontFamily: "'Courier New', Courier, monospace" }}
          >
            {printType === 'BILL' ? (
              <>
                {/* Header */}
                <div className="text-center pb-2 border-b border-dashed border-slate-400">
                  <div className="text-sm font-bold tracking-tight uppercase">{restName}</div>
                  <div className="text-[10px] text-slate-600 mt-0.5">{restAddress}</div>
                  <div className="text-[10px] text-slate-600">Ph: +91 91234 56789</div>
                  <div className="text-[9px] text-slate-500 mt-1">
                    GSTIN: {gstin} | FSSAI: {fssai}
                  </div>
                  <div className="font-bold text-[11px] mt-1 text-slate-800">*** TAX INVOICE ***</div>
                </div>

                {/* Metadata */}
                <div className="py-2 border-b border-dashed border-slate-400 text-[10px] space-y-0.5">
                  <div className="flex justify-between">
                    <span>Bill: {bill.billNumber}</span>
                    <span className="font-bold">Table: {bill.table?.tableNumber || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Date: {dateFormatted}</span>
                    <span>Staff: {bill.generatedBy?.name || 'Cashier'}</span>
                  </div>
                  {bill.customerName && (
                    <div className="flex justify-between font-medium">
                      <span>Guest: {bill.customerName}</span>
                      <span>{bill.customerPhone}</span>
                    </div>
                  )}
                </div>

                {/* Items Table */}
                <div className="py-2 border-b border-dashed border-slate-400">
                  <div className="flex justify-between font-bold pb-1 text-[10px]">
                    <span className="w-8">Qty</span>
                    <span className="flex-1">Item</span>
                    <span className="w-12 text-right">Price</span>
                    <span className="w-14 text-right">Amount</span>
                  </div>
                  <div className="border-b border-slate-300 mb-1"></div>
                  {items.map((it: any, idx: number) => {
                    if (it.status === 'CANCELLED') return null;
                    return (
                      <div key={idx} className="flex justify-between py-0.5 text-[10px]">
                        <span className="w-8">{it.quantity}x</span>
                        <span className="flex-1 truncate pr-1">{it.foodItem?.name || 'Item'}</span>
                        <span className="w-12 text-right">₹{Number(it.unitPrice).toFixed(0)}</span>
                        <span className="w-14 text-right font-medium">₹{Number(it.totalPrice).toFixed(2)}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Totals */}
                <div className="py-2 border-b border-dashed border-slate-400 space-y-1 text-[10px]">
                  <div className="flex justify-between">
                    <span>Item Total (Subtotal):</span>
                    <span>₹{Number(bill.subtotal).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>CGST (2.5%):</span>
                    <span>₹{(Number(bill.taxAmount) / 2).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>SGST (2.5%):</span>
                    <span>₹{(Number(bill.taxAmount) / 2).toFixed(2)}</span>
                  </div>
                  {Number(bill.discountAmount) > 0 && (
                    <div className="flex justify-between text-emerald-700 font-medium">
                      <span>Discount / Loyalty:</span>
                      <span>-₹{Number(bill.discountAmount).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t border-slate-300 pt-1 flex justify-between font-bold text-sm text-slate-900">
                    <span>GRAND TOTAL:</span>
                    <span>₹{Number(bill.grandTotal).toFixed(2)}</span>
                  </div>
                </div>

                {/* Payment Breakdown */}
                <div className="py-1.5 border-b border-dashed border-slate-400 text-[9px] text-slate-600 space-y-0.5">
                  <div className="flex justify-between">
                    <span>Payment Status:</span>
                    <span className="font-bold text-slate-800">{bill.status}</span>
                  </div>
                  {bill.payments && bill.payments.length > 0 && (
                    <div className="flex justify-between">
                      <span>Paid via:</span>
                      <span>
                        {bill.payments.map((p: any) => `${p.paymentMethod}: ₹${Number(p.amount).toFixed(0)}`).join(', ')}
                      </span>
                    </div>
                  )}
                  {Number(bill.loyaltyPointsEarned) > 0 && (
                    <div className="flex justify-between text-amber-700 font-bold">
                      <span>⭐ Loyalty Points Earned:</span>
                      <span>+{bill.loyaltyPointsEarned} pts</span>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="pt-2 text-center text-[9px] text-slate-500 space-y-1">
                  <div>Thank You! Please Visit Again 🙏</div>
                  <div className="text-[8px] tracking-widest text-slate-400">||||||||||||||||||||||||||||||||</div>
                </div>
              </>
            ) : (
              /* Kitchen KOT Slip */
              <>
                <div className="text-center pb-2 border-b border-dashed border-slate-400">
                  <div className="text-sm font-extrabold uppercase">*** KITCHEN ORDER TICKET ***</div>
                  <div className="font-bold text-xs mt-0.5">KOT #{bill.billNumber?.slice(-6) || '001'}</div>
                </div>

                <div className="py-2 border-b border-dashed border-slate-400 text-[11px] space-y-1">
                  <div className="flex justify-between font-extrabold text-sm">
                    <span>TABLE: {bill.table?.tableNumber}</span>
                    <span>ORDER: {order.orderNumber?.slice(-6)}</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span>Time: {dateFormatted}</span>
                    <span>Waiter: {order.waiter?.name || 'Staff'}</span>
                  </div>
                </div>

                <div className="py-2 border-b border-dashed border-slate-400">
                  <div className="flex justify-between font-bold text-xs pb-1">
                    <span className="w-10">QTY</span>
                    <span className="flex-1">ITEM DESCRIPTION</span>
                  </div>
                  <div className="border-b border-slate-300 mb-1"></div>
                  {items.map((it: any, idx: number) => {
                    if (it.status === 'CANCELLED') return null;
                    return (
                      <div key={idx} className="py-1">
                        <div className="flex justify-between font-bold text-xs">
                          <span className="w-10 text-base">{it.quantity} x</span>
                          <span className="flex-1 text-sm">{it.foodItem?.name}</span>
                        </div>
                        {it.specialInstructions && (
                          <div className="text-[10px] text-red-600 pl-10 italic">
                            Note: {it.specialInstructions}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="pt-3 text-center text-[10px] font-bold text-slate-600">
                  *** END OF KOT ***
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-3 border-t border-slate-800 bg-slate-950 px-5 py-4">
          <button
            onClick={handleWhatsAppShare}
            disabled={isSendingWa}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-500 transition disabled:opacity-50"
          >
            {waSentSuccess ? <CheckCircle className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
            {waSentSuccess ? 'Sent to WhatsApp!' : 'WhatsApp Bill'}
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition"
            >
              Close
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-500 transition"
            >
              <Printer className="h-4 w-4" /> Print Thermal Slip
            </button>
          </div>
        </div>
      </div>

      {/* Media print stylesheet for direct thermal printers */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #thermal-receipt-printable, #thermal-receipt-printable * {
            visibility: visible;
          }
          #thermal-receipt-printable {
            position: absolute;
            left: 0;
            top: 0;
            width: ${paperWidth === '58mm' ? '58mm' : '80mm'} !important;
            margin: 0 !important;
            padding: 4mm !important;
            box-shadow: none !important;
            border: none !important;
          }
        }
      `}</style>
    </div>
  );
};
