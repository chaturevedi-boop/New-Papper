import React, { useState, useMemo } from 'react';
import { DatabaseState, calculateBill, getPaymentOverrideKey } from '../data/dummyGenerator';
import { BillingSummary } from '../types';
import { shareOrDownloadFile } from '../utils/shareFile';
import {
  FileSpreadsheet,
  Search,
  Download,
  Eye,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  CreditCard,
  RefreshCw,
  MessageCircleWarning,
  X,
  Send
} from 'lucide-react';

interface BillingEngineProps {
  state: DatabaseState;
  selectedMonth: number;
  selectedYear: number;
  onViewInvoice: (summary: BillingSummary) => void;
  onTogglePaymentStatus: (flatId: string) => void;
}

export const BillingEngine: React.FC<BillingEngineProps> = ({
  state,
  selectedMonth,
  selectedYear,
  onViewInvoice,
  onTogglePaymentStatus
}) => {
  const { areas, buildings, flats, wings } = state;

  const [areaFilter, setAreaFilter] = useState<string>('ALL');
  const [buildingFilter, setBuildingFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Feature: Admin Mark as Paid confirmation states
  const [confirmingFlatId, setConfirmingFlatId] = useState<string | null>(null);
  const [isUpdatingPayment, setIsUpdatingPayment] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [exportFailed, setExportFailed] = useState(false);

  const handleToggleClick = (flatId: string, currentStatus: boolean) => {
    if (currentStatus) {
      // If already paid, toggle back to unpaid directly or ask? Usually admin marks as paid.
      // Let's ask for both to be safe and simulate "Admin workflow"
      setConfirmingFlatId(flatId);
    } else {
      setConfirmingFlatId(flatId);
    }
  };

  const confirmToggle = async () => {
    if (!confirmingFlatId) return;
    setIsUpdatingPayment(true);

    // Simulate background thread update
    await new Promise(resolve => setTimeout(resolve, 800));

    onTogglePaymentStatus(confirmingFlatId);
    setIsUpdatingPayment(false);
    setConfirmingFlatId(null);
  };

  // Dependent buildings list
  const filteredBuildings = useMemo(() => {
    if (areaFilter === 'ALL') return [];
    return buildings.filter(b => b.areaId === areaFilter);
  }, [buildings, areaFilter]);

  // Handle area filter change (reset building)
  const handleAreaChange = (val: string) => {
    setAreaFilter(val);
    setBuildingFilter('ALL');
  };

  // Compile billing list based on filters, applying any payment overrides
  const billingSummaries = useMemo(() => {
    return flats.map(flat => {
      const bill = calculateBill(flat, selectedMonth, selectedYear, state);
      const key = getPaymentOverrideKey(flat.id, selectedMonth, selectedYear);
      const override = state.paymentOverrides[key];
      if (override === 'PAID') bill.paid = true;
      if (override === 'UNPAID') bill.paid = false;
      return bill;
    });
  }, [flats, selectedMonth, selectedYear, state]);

  // Filter summaries
  const filteredSummaries = useMemo(() => {
    return billingSummaries.filter(bill => {
      // Find flat's wing, building, and area
      const flatObj = flats.find(f => f.id === bill.flatId);
      if (!flatObj) return false;

      const wing = wings.find(w => w.id === flatObj.wingId);
      const bld = wing ? buildings.find(b => b.id === wing.buildingId) : null;
      
      const matchArea = areaFilter === 'ALL' || (bld && bld.areaId === areaFilter);
      const matchBuilding = buildingFilter === 'ALL' || (bld && bld.id === buildingFilter);
      
      const matchSearch = bill.customerName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          bill.flatNumber.includes(searchQuery);

      return matchArea && matchBuilding && matchSearch;
    });
  }, [billingSummaries, areaFilter, buildingFilter, searchQuery, flats, wings, buildings]);

  // Totals calculations based on filtered entries
  const aggregatedTotals = useMemo(() => {
    let gross = 0;
    let deductions = 0;
    let net = 0;
    let collected = 0;
    let outstanding = 0;

    filteredSummaries.forEach(bill => {
      gross += bill.grossAmount;
      deductions += bill.skipDeductions;
      net += bill.netAmount;
      if (bill.paid) collected += bill.netAmount;
      else outstanding += bill.netAmount;
    });

    return { gross, deductions, net, collected, outstanding };
  }, [filteredSummaries]);

  // Unpaid customers within the current filters, for the bulk reminder workflow
  const unpaidSummaries = useMemo(() => filteredSummaries.filter(bill => !bill.paid), [filteredSummaries]);

  const buildReminderWhatsAppUrl = (bill: BillingSummary) => {
    const monthName = monthNames[selectedMonth - 1];
    const cleanPhone = (bill.phoneNumber || '').replace(/\+/g, '').replace(/ /g, '');
    const message = `Dear *${bill.customerName}*,\n\nThis is a friendly reminder that your newspaper bill for *${monthName} ${selectedYear}* of *₹${bill.netAmount.toFixed(2)}* is still due.\n\nPlease settle it at your earliest convenience. Thank you!\n\n- PaperTrack`;
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  };

  // Export tables to raw CSV
  const handleExportCSV = async () => {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const monthName = monthNames[selectedMonth - 1];

    let csvContent = 'Invoice Month,Customer Name,Flat Number,Location Address,Subscribed Papers,Delivered Days,Skipped Days,Gross Total (INR),Deductions (INR),Net Bill Amount (INR),Payment Status\n';

    const csvEscape = (value: string) => `"${value.replace(/"/g, '""')}"`;

    filteredSummaries.forEach((bill) => {
      const papersStr = bill.subscribedPapers.map(p => p.paperName).join(' | ');
      const status = bill.paid ? 'PAID' : 'UNPAID';
      const cleanLocation = bill.locationPath.replace(/➔/g, '>');

      const row = [
        csvEscape(`${monthName} ${selectedYear}`),
        csvEscape(bill.customerName),
        csvEscape(bill.flatNumber),
        csvEscape(cleanLocation),
        csvEscape(papersStr),
        bill.totalDelivered,
        bill.totalSkipped,
        bill.grossAmount.toFixed(2),
        bill.skipDeductions.toFixed(2),
        bill.netAmount.toFixed(2),
        status
      ].join(',');

      csvContent += row + '\n';
    });

    const result = await shareOrDownloadFile(
      csvContent,
      `Newspaper_Billing_Report_${monthName}_${selectedYear}.csv`,
      'text/csv',
      `Billing Report - ${monthName} ${selectedYear}`
    );
    if (result === 'failed') {
      setExportFailed(true);
      setTimeout(() => setExportFailed(false), 2500);
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="space-y-6">
      {/* Search & Filters */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Area filter */}
          <div>
            <select
              value={areaFilter}
              onChange={(e) => handleAreaChange(e.target.value)}
              className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl px-3.5 py-3 border border-slate-200 dark:border-slate-700 cursor-pointer focus:outline-none"
            >
              <option value="ALL">All Areas</option>
              {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>

          {/* Building filter */}
          <div>
            <select
              disabled={areaFilter === 'ALL'}
              value={buildingFilter}
              onChange={(e) => setBuildingFilter(e.target.value)}
              className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl px-3.5 py-3 border border-slate-200 dark:border-slate-700 cursor-pointer focus:outline-none disabled:opacity-55"
            >
              <option value="ALL">All Buildings</option>
              {filteredBuildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>

          {/* Text Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search Name or Flat..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 text-xs rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 w-44"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={() => setShowReminderModal(true)}
            disabled={unpaidSummaries.length === 0}
            className="bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-950/50 text-rose-700 dark:text-rose-400 text-xs font-bold rounded-xl px-4 py-3 flex items-center gap-1.5 shadow-sm transition-colors active:scale-[0.96] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <MessageCircleWarning size={16} />
            <span>Send Reminders ({unpaidSummaries.length})</span>
          </button>
          <button
            onClick={handleExportCSV}
            className={`text-xs font-bold rounded-xl px-4 py-3 flex items-center gap-1.5 shadow-sm transition-colors active:scale-[0.96] cursor-pointer ${
              exportFailed
                ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            {exportFailed ? <AlertTriangle size={16} /> : <Download size={16} />}
            <span>{exportFailed ? 'Export Failed' : 'Export CSV Report'}</span>
          </button>
        </div>
      </div>

      {/* Summary Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 text-white rounded-xl p-4 border border-slate-800">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Filtered Net Billing</p>
          <h4 className="text-xl font-black text-emerald-400 mt-1">₹{aggregatedTotals.net.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</h4>
          <div className="flex justify-between text-[10px] text-slate-400 mt-2 border-t border-slate-800 pt-1.5">
            <span>Gross Pot: ₹{aggregatedTotals.gross.toLocaleString('en-IN')}</span>
            <span className="text-rose-400">Deducted: ₹{aggregatedTotals.deductions.toLocaleString('en-IN')}</span>
          </div>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900 rounded-xl p-4">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-emerald-600 dark:text-emerald-400">Realized Collections</p>
          <h4 className="text-xl font-black text-emerald-800 dark:text-emerald-300 mt-1">₹{aggregatedTotals.collected.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</h4>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 border-t border-emerald-100 dark:border-emerald-900/60 pt-1.5">
            From settled invoices
          </p>
        </div>
        <div className="bg-rose-50 dark:bg-rose-950/10 border border-rose-150 dark:border-rose-950 rounded-xl p-4">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-rose-600 dark:text-rose-400">Outstanding Receivable</p>
          <h4 className="text-xl font-black text-rose-700 dark:text-rose-400 mt-1">₹{aggregatedTotals.outstanding.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</h4>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 border-t border-rose-150 dark:border-rose-950/60 pt-1.5">
            From pending invoices
          </p>
        </div>
      </div>

      {/* Invoice Table Grid */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
            <FileSpreadsheet size={15} className="text-emerald-500" />
            Invoice Records for {monthNames[selectedMonth - 1]} {selectedYear}
          </h3>
          <span className="text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2.5 py-1 rounded-lg">
            {filteredSummaries.length} Flats
          </span>
        </div>

        <div className="max-h-[65vh] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
          {filteredSummaries.length === 0 ? (
            <div className="p-10 text-center">
              <FileSpreadsheet size={40} className="mx-auto text-slate-300 dark:text-slate-700 mb-3" />
              <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">No invoices match your filters.</p>
            </div>
          ) : (
            filteredSummaries.map((bill) => (
              <div
                key={bill.flatId}
                className="p-4 sm:p-5 hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-colors active:scale-[0.99]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded text-[11px] font-bold shrink-0">
                        {bill.flatNumber}
                      </span>
                      <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm truncate">{bill.customerName}</h4>
                    </div>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-1" title={bill.locationPath}>
                      {bill.locationPath}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {bill.subscribedPapers.map((p, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded"
                        >
                          {p.paperName}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-black text-slate-800 dark:text-slate-100">₹{bill.netAmount.toFixed(2)}</p>
                    <p className="text-[11px] mt-1 whitespace-nowrap">
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">{bill.totalDelivered}d</span>
                      <span className="text-slate-300 dark:text-slate-700 mx-1">/</span>
                      <span className="text-rose-600 dark:text-rose-400 font-bold">{bill.totalSkipped}s</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-3.5">
                  <button
                    onClick={() => handleToggleClick(bill.flatId, bill.paid)}
                    disabled={isUpdatingPayment && confirmingFlatId === bill.flatId}
                    className={`flex-1 min-h-[44px] rounded-xl text-xs font-bold transition-all active:scale-[0.96] cursor-pointer flex items-center justify-center gap-1.5 ${
                      bill.paid
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/20'
                        : 'bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/30'
                    }`}
                    title="Click to toggle Paid/Unpaid"
                  >
                    {isUpdatingPayment && confirmingFlatId === bill.flatId ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : bill.paid ? (
                      <CheckCircle size={14} />
                    ) : (
                      <AlertCircle size={14} />
                    )}
                    <span>{bill.paid ? 'PAID' : 'UNPAID'}</span>
                  </button>
                  <button
                    onClick={() => onViewInvoice(bill)}
                    className="flex-1 min-h-[44px] rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-400 transition-colors active:scale-[0.96] cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Eye size={14} />
                    <span>Invoice</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Admin Confirmation Dialog Overlay */}
      {confirmingFlatId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-950/40 rounded-xl">
                <CreditCard className="text-emerald-600 dark:text-emerald-400" size={20} />
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-tight">Payment Status Update</h4>
            </div>

            <div className="p-5">
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Are you sure you want to change the status of this invoice? This will instantly update the collection stats for this month.
              </p>

              <div className="mt-6 flex items-center gap-3">
                <button
                  onClick={() => setConfirmingFlatId(null)}
                  disabled={isUpdatingPayment}
                  className="flex-1 py-3 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 transition-colors active:scale-[0.96] cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmToggle}
                  disabled={isUpdatingPayment}
                  className="flex-1 py-3 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-500/20 transition-all active:scale-[0.96] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isUpdatingPayment ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                  <span>{isUpdatingPayment ? 'Updating...' : 'Confirm'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Payment Reminder Dispatch Modal */}
      {showReminderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-100 dark:bg-rose-950/40 rounded-xl">
                  <MessageCircleWarning className="text-rose-600 dark:text-rose-400" size={20} />
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-tight">Bulk Payment Reminders</h4>
              </div>
              <button
                onClick={() => setShowReminderModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 p-2.5 rounded-xl transition-colors active:scale-[0.94] cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Click "Send" to open a prefilled WhatsApp reminder for each unpaid customer below. Browsers block sending
                all of these at once, so send them one at a time.
              </p>
              {unpaidSummaries.map(bill => (
                <div key={bill.flatId} className="flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 rounded-xl px-3.5 py-2.5">
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{bill.customerName} <span className="text-slate-400 font-medium">• Flat {bill.flatNumber}</span></p>
                    <p className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold">₹{bill.netAmount.toFixed(2)} due</p>
                  </div>
                  <a
                    href={buildReminderWhatsAppUrl(bill)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl px-4 py-2.5 flex items-center gap-1.5 shrink-0 transition-colors active:scale-[0.94] cursor-pointer"
                  >
                    <Send size={14} />
                    <span>Send</span>
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
