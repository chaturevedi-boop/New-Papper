import React, { useState, useMemo } from 'react';
import { BillingSummary, DeliveryAgent } from '../types';
import { 
  X, 
  Printer, 
  Share2, 
  Check, 
  Smartphone, 
  ArrowRight,
  Phone,
  FileText,
  Building,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface InvoiceModalProps {
  bill: BillingSummary;
  agent: DeliveryAgent | null;
  onClose: () => void;
  onTogglePaymentStatus: (flatId: string) => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  bill,
  agent,
  onClose,
  onTogglePaymentStatus
}) => {
  const [showShareSheet, setShowShareSheet] = useState<boolean>(false);
  const [showPdfIntent, setShowPdfIntent] = useState<boolean>(false);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthName = monthNames[bill.month - 1];

  // Prefilled WhatsApp message text with rich formatting
  const prefilledText = useMemo(() => {
    const cleanLocation = bill.locationPath.replace(/➔/g, '>');
    const message = `Dear *${bill.customerName}*,\n\nYour newspaper bill statement for *${monthName} ${bill.year}* has been processed.\n\n📍 *Address*: ${cleanLocation}\n📦 *Monthly Drops*: ${bill.totalDelivered} delivered / ${bill.totalSkipped} skips\n💰 *Amount Due*: *₹${bill.netAmount.toFixed(2)}*\n🚦 *Payment Status*: *${bill.paid ? 'PAID' : 'DUE / UNPAID'}*\n\nThank you for choosing Daily News Services!`;
    return encodeURIComponent(message);
  }, [bill, monthName]);

  const cleanPhone = useMemo(() => {
    // BUG FIX: Using customer's phone number instead of hardcoded vendor number
    const phone = bill.customerName ? bill.phoneNumber : "";
    return phone.replace(/[^0-9]/g, ''); // Standard clean digits for WhatsApp API
  }, [bill]);

  // Click to open WhatsApp Web API Link
  const whatsAppApiUrl = `https://wa.me/${cleanPhone}?text=${prefilledText}`;

  // Custom function to trigger browser printing for the invoice specifically
  const handlePrint = () => {
    // Hide all elements, show invoice, trigger print
    window.print();
  };

  // Download Simulated PDF Invoice File
  const handleDownloadSimulatedPdf = () => {
    const divider = '========================================';
    const content = [
      divider,
      `      DAILY NEWS SERVICE BILL INVOICE      `,
      divider,
      `Statement Period: ${monthName} ${bill.year}`,
      `Invoice ID: INV-${bill.flatId}-${bill.month}`,
      `Payment Status: ${bill.paid ? 'PAID' : 'DUE (UNPAID)'}`,
      divider,
      `BILLED TO:`,
      `Customer: ${bill.customerName}`,
      `Address: ${bill.locationPath}`,
      divider,
      `DELIVERED BY:`,
      `Agent: ${agent ? agent.name : 'Rohan Sharma'}`,
      `Phone: ${agent ? agent.phone : '+91 98765 43210'}`,
      divider,
      `ITEMIZED BILLING BREAKDOWN:`,
      ...bill.subscribedPapers.map(p => 
        `- ${p.paperName}\n  Rate: INR ${p.rate}/day\n  Delivered: ${p.deliveredDays} days | Skipped: ${p.skippedDays} days\n  Paper Net Cost: INR ${p.cost.toFixed(2)}`
      ),
      divider,
      `BILL SUMMARY:`,
      `Gross Potential Cost: INR ${bill.grossAmount.toFixed(2)}`,
      `Skip Deductions (-):  INR ${bill.skipDeductions.toFixed(2)}`,
      `NET BILL PAYABLE:     INR ${bill.netAmount.toFixed(2)}`,
      divider,
      `Generated via Newspaper Delivery & Billing Mobile Architect.`,
      `Year of Service: 2026.`,
      divider
    ].join('\n');

    const element = document.createElement('a');
    const file = new Blob([content], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `Invoice_INV-${bill.customerName.replace(/ /g, '_')}_${monthName}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      {/* Printable Invoice Container */}
      <div 
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl w-full max-w-2xl overflow-hidden border border-slate-100 dark:border-slate-800 animate-fade-in print:shadow-none print:border-none print:rounded-none"
        id="invoice-print-area"
      >
        {/* Modal Controls (Hidden in print) */}
        <div className="bg-slate-50 dark:bg-slate-850 px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <Smartphone className="text-emerald-500" size={16} />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Premium Invoice Statement</span>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 p-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Invoice Main Layout */}
        <div className="p-6 sm:p-8 space-y-6 select-text">
          {/* Header Block */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
            <div>
              <h2 className="text-lg font-black text-emerald-800 dark:text-emerald-400 uppercase tracking-wider">DAILY NEWS SERVICE</h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 font-semibold">Premium Newspaper Drops & Accounting</p>
              <p className="text-xs font-mono text-slate-400 dark:text-slate-500 mt-1">INV-{bill.flatId}-{bill.month}</p>
            </div>
            
            {/* Payment Status Badge */}
            <div className="flex flex-col items-end gap-1">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">Billing Period</span>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg">
                {monthName} {bill.year}
              </span>
              <button
                onClick={() => onTogglePaymentStatus(bill.flatId)}
                className={`mt-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 print:bg-transparent ${
                  bill.paid 
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/60' 
                    : 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border border-rose-100 dark:border-rose-900/60'
                }`}
                title="Click to toggle Paid/Unpaid"
              >
                {bill.paid ? <CheckCircle size={13} /> : <AlertCircle size={13} />}
                <span>{bill.paid ? 'PAID / INVOICE SETTLED' : 'DUE / UNPAID'}</span>
              </button>
            </div>
          </div>

          {/* Billing Meta Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50 dark:bg-slate-950/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80">
            <div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mb-1">Billed To (Customer details):</p>
              <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm">{bill.customerName}</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 flex items-center gap-1">
                <Building size={12} className="text-slate-400" />
                <span>Flat {bill.flatNumber}, {bill.locationPath.split(' ➔ ').slice(1).join(' ➔ ')}</span>
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Ph: {bill.customerName ? '+91 98765 43210' : ''}</p>
            </div>

            <div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mb-1">Assigned Route Agent:</p>
              <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm">{agent ? agent.name : 'Rohan Sharma'}</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                <Phone size={12} className="text-slate-400" />
                <span>Mobile: {agent ? agent.phone : '+91 98765 43210'}</span>
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Delivery Time Window: 5:00 AM - 7:30 AM</p>
            </div>
          </div>

          {/* Itemized Table Breakdown */}
          <div className="space-y-2">
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Itemized newspaper billing ledger:</p>
            
            <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-850 border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="py-2.5 px-4">Newspaper Details</th>
                    <th className="py-2.5 px-4 text-center">Delivered / Skipped</th>
                    <th className="py-2.5 px-4 text-right">Daily Rate</th>
                    <th className="py-2.5 px-4 text-right">Net Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {bill.subscribedPapers.map((paper, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/20 dark:hover:bg-slate-950/10">
                      <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">
                        {paper.paperName}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="font-semibold text-slate-700 dark:text-slate-300">
                          <span className="text-emerald-600 font-bold">{paper.deliveredDays} days</span>
                          <span className="text-slate-300 dark:text-slate-700 mx-1">/</span>
                          <span className="text-rose-600 font-bold">{paper.skippedDays} skips</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right text-slate-500 dark:text-slate-400 font-mono">
                        ₹{paper.rate.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-slate-800 dark:text-slate-100 font-mono">
                        ₹{paper.cost.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Calculations Summary Card */}
          <div className="flex justify-end">
            <div className="w-full sm:w-80 space-y-2 bg-slate-50 dark:bg-slate-950/30 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Gross Paper Cost Potential:</span>
                <span className="font-mono text-slate-800 dark:text-slate-200 font-semibold">₹{bill.grossAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-rose-600 dark:text-rose-400 font-semibold">
                <span>Daily Skip Deductions (-):</span>
                <span className="font-mono">₹{bill.skipDeductions.toFixed(2)}</span>
              </div>
              <div className="border-t border-slate-200 dark:border-slate-800 pt-2 flex justify-between text-sm text-emerald-800 dark:text-emerald-400 font-bold">
                <span>Net Monthly Invoice Payable:</span>
                <span className="font-mono text-emerald-950 dark:text-emerald-300 font-black">₹{bill.netAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* PRINT FIX: A4 Scaling Styles */}
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              @page { size: A4; margin: 0; }
              body { background: white; margin: 0; padding: 0; }
              #invoice-print-area {
                width: 210mm;
                min-height: 297mm;
                padding: 10mm;
                margin: 0 auto;
                box-shadow: none !important;
                border: none !important;
                background: white !important;
              }
              .print\\:hidden { display: none !important; }
            }
          `}} />

          {/* Disclaimers */}
          <div className="text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed border-t border-slate-100 dark:border-slate-800 pt-4">
            <p><strong>Deductions Rule:</strong> Subscription rates are active for Calendar Year 2026. Daily skips have been logged via delivery agent drop list scans and subtracted from your gross balance. Please settle your bill balance by the 10th of this month.</p>
          </div>
        </div>

        {/* Invoice Control Buttons (Hidden in print) */}
        <div className="bg-slate-50 dark:bg-slate-850 px-6 py-5 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
          <div className="flex flex-wrap items-center gap-2">
            {/* Printable Trigger */}
            <button
              onClick={handlePrint}
              className="bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white text-xs font-semibold rounded-xl px-4 py-2 flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
            >
              <Printer size={14} />
              <span>Print A4 Bill</span>
            </button>

            {/* Simulated PDF download */}
            <button
              onClick={handleDownloadSimulatedPdf}
              className="bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white text-xs font-semibold rounded-xl px-4 py-2 flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
            >
              <FileText size={14} />
              <span>Download PDF File</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Share Menu Trigger */}
            <button
              onClick={() => setShowShareSheet(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl px-4 py-2 flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              <Share2 size={14} />
              <span>Dispatch to WhatsApp</span>
            </button>

            {/* BUG FIX: Adding Missing Close Button at bottom */}
            <button
              onClick={onClose}
              className="bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl px-4 py-2 transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Simulated Android Intent Share Sheet Modal */}
      {showShareSheet && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 text-white rounded-3xl w-full max-w-sm overflow-hidden border border-slate-800 animate-fade-in">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Smartphone size={14} className="text-emerald-400" />
                Android System Share Sheet
              </span>
              <button 
                onClick={() => setShowShareSheet(false)}
                className="text-slate-400 hover:text-white bg-slate-800 p-1 rounded-lg"
              >
                <X size={14} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
                <h5 className="text-xs font-bold text-slate-200 uppercase tracking-wide">Target Customer Mobile</h5>
                <p className="text-xs text-emerald-400 font-mono mt-1 font-bold">{cleanPhone}</p>
                <p className="text-[10px] text-slate-500 mt-1">Simulated Android <code>Intent.ACTION_SEND</code> dispatching payload direct to WhatsApp package.</p>
              </div>

              <div className="space-y-2">
                {/* 1. Send Text Summary via API Redirect */}
                <a
                  href={whatsAppApiUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setShowShareSheet(false)}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold p-3 rounded-xl flex items-center justify-between transition-colors shadow-sm cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Share2 size={14} />
                    <span>Send Prefilled Text Message</span>
                  </span>
                  <ArrowRight size={14} />
                </a>

                {/* 2. Simulated PDF share sheet */}
                <button
                  onClick={() => {
                    setShowShareSheet(false);
                    setShowPdfIntent(true);
                  }}
                  className="w-full bg-slate-800 hover:bg-slate-750 text-slate-100 text-xs font-semibold p-3 rounded-xl flex items-center justify-between transition-colors border border-slate-700 cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <FileText size={14} className="text-emerald-400" />
                    <span>Send PDF Document Attachment</span>
                  </span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Simulated PDF Dispatching Screen Overlay */}
      {showPdfIntent && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 text-slate-200 rounded-3xl w-full max-w-sm overflow-hidden border border-slate-800 animate-fade-in p-6 text-center space-y-4">
            <div className="h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle size={28} />
            </div>
            
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white">Android PDF Dispatch Active</h4>
              <p className="text-xs text-slate-400">
                The print-ready A4 document: <code>invoice_{bill.customerName.replace(/ /g, '_')}.pdf</code> is processed from Cache Memory.
              </p>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl text-left border border-slate-850">
              <p className="text-[10px] font-mono text-slate-400">
                <strong>Intent:</strong> ACTION_SEND<br />
                <strong>Type:</strong> application/pdf<br />
                <strong>File URI:</strong> content://com.premium.newspaper.fileprovider/.../invoice.pdf<br />
                <strong>Package:</strong> com.whatsapp (targeted)
              </p>
            </div>

            <p className="text-[11px] text-slate-500">Android social share intents require native device API targets. Browser download sandbox is complete.</p>

            <button
              onClick={() => setShowPdfIntent(false)}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 rounded-xl transition-colors cursor-pointer"
            >
              Close Intent Simulator
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
