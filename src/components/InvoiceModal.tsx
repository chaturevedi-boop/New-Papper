import React, { useState, useMemo } from 'react';
import { Capacitor } from '@capacitor/core';
import { BillingSummary, DeliveryAgent } from '../types';
import { shareTextAndFile, sharePdf } from '../utils/shareFile';
import { generateInvoicePdf } from '../utils/generateInvoicePdf';
import {
  X,
  Printer,
  Share2,
  Smartphone,
  Phone,
  FileText,
  Building,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Eye,
  Download
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
  const [shareFailed, setShareFailed] = useState<boolean>(false);
  const [pdfFailed, setPdfFailed] = useState<boolean>(false);
  const [showPrintPreview, setShowPrintPreview] = useState<boolean>(false);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthName = monthNames[bill.month - 1];

  // Short summary used for WhatsApp / native share text
  const shareSummary = useMemo(() => {
    const cleanLocation = bill.locationPath.replace(/➔/g, '>');
    return `Dear *${bill.customerName}*,\n\nYour newspaper bill statement for *${monthName} ${bill.year}* has been processed.\n\n📍 *Address*: ${cleanLocation}\n📦 *Monthly Drops*: ${bill.totalDelivered} delivered / ${bill.totalSkipped} skips\n💰 *Amount Due*: *₹${bill.netAmount.toFixed(2)}*\n🚦 *Payment Status*: *${bill.paid ? 'PAID' : 'DUE / UNPAID'}*\n\nThank you for choosing Daily News Services!`;
  }, [bill, monthName]);

  const cleanPhone = useMemo(() => {
    const rawPhone = bill.phoneNumber || "";
    return rawPhone.replace(/\+/g, '').replace(/ /g, '');
  }, [bill]);

  // Plain (non target="_blank") link: inside a Capacitor Android WebView, target="_blank"
  // is swallowed silently since the app doesn't implement onCreateWindow for new windows.
  // A normal top-level navigation to an out-of-scope URL is instead handled by Capacitor's
  // default WebViewClient, which launches it as a system Intent (opening WhatsApp directly).
  const whatsAppApiUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(shareSummary)}`;

  const invoiceFileName = `Invoice_INV-${bill.customerName.replace(/ /g, '_')}_${monthName}.txt`;

  const invoiceTextContent = useMemo(() => {
    const divider = '========================================';
    return [
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
  }, [bill, agent, monthName]);

  // On native Android, @capacitor/share opens the real OS share sheet via a native
  // intent chooser - this works regardless of whether the device's WebView itself
  // implements the Web Share API (many don't). On web, the Web Share API is used when
  // available. window.print() and <a download> blobs are silently no-ops inside a WebView.
  const canNativeShare =
    Capacitor.isNativePlatform() || (typeof navigator !== 'undefined' && typeof navigator.share === 'function');

  const handleShareInvoice = async () => {
    setShareFailed(false);
    const result = await shareTextAndFile(shareSummary, invoiceTextContent, invoiceFileName, `Invoice - ${bill.customerName}`);
    if (result === 'failed') {
      setShareFailed(true);
      setTimeout(() => setShareFailed(false), 2500);
    }
  };

  // Generates a real PDF (via jsPDF, pure JS - no native dependency) and saves/shares it.
  const handleDownloadPdf = async () => {
    setPdfFailed(false);
    const { blob, base64 } = generateInvoicePdf(bill, agent, monthName);
    const filename = `Invoice_${bill.customerName.replace(/ /g, '_')}_${monthName}.pdf`;
    const result = await sharePdf(base64, blob, filename, `Invoice - ${bill.customerName}`);
    if (result === 'failed') {
      setPdfFailed(true);
      setTimeout(() => setPdfFailed(false), 2500);
    }
  };

  // Desktop-browser fallback (no Web Share API): keep the original working behavior
  const handlePrint = () => {
    window.print();
  };

  const handleDownloadInvoiceFile = () => {
    const element = document.createElement('a');
    const file = new Blob([invoiceTextContent], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = invoiceFileName;
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
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-semibold">Ph: {bill.phoneNumber}</p>
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

          {/* PRINT FIX: Bulletproof A4 Scaling & Formatting */}
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              @page { size: A4; margin: 0; }
              body {
                background: white !important;
                margin: 0 !important;
                padding: 0 !important;
                -webkit-print-color-adjust: exact;
              }
              #invoice-print-area {
                width: 210mm !important;
                min-height: 297mm !important;
                padding: 15mm !important;
                margin: 0 auto !important;
                box-shadow: none !important;
                border: none !important;
                background: white !important;
              }
              .print\\:hidden, header, nav, footer, button {
                display: none !important;
              }
              * { color: black !important; border-color: #eee !important; }
              .text-emerald-800, .text-emerald-400 { color: #065f46 !important; }
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
            <button
              onClick={() => setShowPrintPreview(true)}
              className="bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white text-xs font-semibold rounded-xl px-4 py-2 flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
            >
              <Eye size={14} />
              <span>Preview & Print</span>
            </button>
            {canNativeShare ? (
              /* Real OS share sheet: covers WhatsApp, Print (via a print service), Save, Email, etc. */
              <button
                onClick={handleShareInvoice}
                className={`text-xs font-semibold rounded-xl px-4 py-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                  shareFailed
                    ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border border-rose-100 dark:border-rose-900/60'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                }`}
              >
                {shareFailed ? <AlertTriangle size={14} /> : <Share2 size={14} />}
                <span>{shareFailed ? 'Share Failed - Try Again' : 'Share Invoice'}</span>
              </button>
            ) : (
              <>
                <button
                  onClick={handlePrint}
                  className="bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white text-xs font-semibold rounded-xl px-4 py-2 flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
                >
                  <Printer size={14} />
                  <span>Print A4 Bill</span>
                </button>
                <button
                  onClick={handleDownloadInvoiceFile}
                  className="bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white text-xs font-semibold rounded-xl px-4 py-2 flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
                >
                  <FileText size={14} />
                  <span>Download Invoice File</span>
                </button>
                <a
                  href={whatsAppApiUrl}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl px-4 py-2 flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                >
                  <Share2 size={14} />
                  <span>Send via WhatsApp</span>
                </a>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-widest rounded-xl px-6 py-2.5 transition-all cursor-pointer shadow-lg flex items-center gap-2"
            >
              <X size={16} />
              <span>Close Invoice</span>
            </button>
          </div>
        </div>
      </div>

      {/* Print Preview: an in-app, always-light A4-styled rendition of the invoice.
          window.print() doesn't work inside the Android WebView, so this lets the user
          actually see the printable page in-app, then export it as a real PDF from here. */}
      {showPrintPreview && (
        <div className="fixed inset-0 z-[60] overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-start sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden my-4">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Eye size={16} className="text-emerald-500" />
                Print Preview
              </span>
              <button
                onClick={() => setShowPrintPreview(false)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* A4 page content - deliberately plain light colors regardless of app theme */}
            <div className="p-6 sm:p-10 space-y-6 max-h-[65vh] overflow-y-auto bg-white text-slate-900">
              <div className="flex items-center justify-between border-b border-slate-200 pb-5">
                <div>
                  <h2 className="text-lg font-black text-emerald-800 uppercase tracking-wider">DAILY NEWS SERVICE</h2>
                  <p className="text-xs text-slate-500 mt-0.5 font-semibold">Premium Newspaper Drops & Accounting</p>
                  <p className="text-xs font-mono text-slate-500 mt-1">INV-{bill.flatId}-{bill.month}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block">Billing Period</span>
                  <span className="text-xs font-bold text-slate-800 bg-slate-100 px-3 py-1 rounded-lg inline-block mt-1">
                    {monthName} {bill.year}
                  </span>
                  <p className={`text-xs font-bold mt-2 ${bill.paid ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {bill.paid ? 'PAID / SETTLED' : 'DUE / UNPAID'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Billed To</p>
                  <h4 className="font-bold text-slate-800 text-sm">{bill.customerName}</h4>
                  <p className="text-xs text-slate-600 mt-1">Flat {bill.flatNumber}, {bill.locationPath.split(' ➔ ').slice(1).join(' > ')}</p>
                  <p className="text-xs text-slate-500 mt-0.5 font-semibold">Ph: {bill.phoneNumber}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Delivery Agent</p>
                  <h4 className="font-bold text-slate-800 text-sm">{agent ? agent.name : 'Rohan Sharma'}</h4>
                  <p className="text-xs text-slate-500 mt-1">Mobile: {agent ? agent.phone : '+91 98765 43210'}</p>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-2.5 px-4">Newspaper</th>
                      <th className="py-2.5 px-4 text-center">Delivered / Skipped</th>
                      <th className="py-2.5 px-4 text-right">Rate</th>
                      <th className="py-2.5 px-4 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {bill.subscribedPapers.map((paper, idx) => (
                      <tr key={idx}>
                        <td className="py-3 px-4 font-bold text-slate-800">{paper.paperName}</td>
                        <td className="py-3 px-4 text-center">
                          <span className="text-emerald-700 font-bold">{paper.deliveredDays}d</span>
                          <span className="text-slate-300 mx-1">/</span>
                          <span className="text-rose-700 font-bold">{paper.skippedDays}s</span>
                        </td>
                        <td className="py-3 px-4 text-right text-slate-500 font-mono">₹{paper.rate.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right font-black text-slate-800 font-mono">₹{paper.cost.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end">
                <div className="w-full sm:w-72 space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>Gross Cost Potential:</span>
                    <span className="font-mono font-semibold">₹{bill.grossAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-rose-700 font-semibold">
                    <span>Skip Deductions (-):</span>
                    <span className="font-mono">₹{bill.skipDeductions.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-slate-300 pt-2 flex justify-between text-sm text-emerald-800 font-bold">
                    <span>Net Payable:</span>
                    <span className="font-mono font-black">₹{bill.netAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <p className="text-[10px] text-slate-500 leading-relaxed border-t border-slate-200 pt-4">
                <strong>Deductions Rule:</strong> Subscription rates are active for Calendar Year 2026. Daily skips have been logged via delivery agent drop list scans and subtracted from your gross balance. Please settle your bill balance by the 10th of this month.
              </p>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex flex-wrap items-center justify-end gap-2">
              <button
                onClick={handleDownloadPdf}
                className={`text-xs font-semibold rounded-xl px-4 py-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                  pdfFailed
                    ? 'bg-rose-50 text-rose-700 border border-rose-100'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                }`}
              >
                {pdfFailed ? <AlertTriangle size={14} /> : <Download size={14} />}
                <span>{pdfFailed ? 'Download Failed - Retry' : 'Download PDF'}</span>
              </button>
              <button
                onClick={() => setShowPrintPreview(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-xl px-4 py-2 transition-colors cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
