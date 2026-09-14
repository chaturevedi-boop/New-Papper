import React, { useState, useMemo } from 'react';
import { DatabaseState, calculateBill, resolveAgingBucket, AGING_LABEL, type AgingBucket, computeAgentPayout } from '../data/dummyGenerator';
import { BillingSummary } from '../types';
import { shareOrDownloadFile } from '../utils/shareFile';
import { useWindowedList } from '../hooks/useWindowedList';
import {
  FileSpreadsheet,
  Search,
  Download,
  Eye,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Clock,
  CreditCard,
  MessageCircleWarning,
  Wallet,
  X,
  Send,
  Users,
  Receipt
} from 'lucide-react';

interface BillingEngineProps {
  state: DatabaseState;
  selectedMonth: number;
  selectedYear: number;
  onViewInvoice: (summary: BillingSummary) => void;
  onTogglePaymentStatus: (flatId: string) => void;
  onRecordPayment: (flatId: string, amount: number, date: string, note?: string) => void;
  onToggleAgentPayoutStatus: (agentId: string) => void;
}

const STATUS_STYLES: Record<BillingSummary['status'], { badge: string; label: string; pill: string }> = {
  PAID: { badge: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400', label: 'PAID', pill: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/20' },
  PARTIAL: { badge: 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400', label: 'PARTIAL', pill: 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/30' },
  UNPAID: { badge: 'bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400', label: 'UNPAID', pill: 'bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/30' }
};

const AGING_STYLES: Record<AgingBucket, string> = {
  CURRENT: '',
  DUE_30: 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400',
  DUE_60: 'bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400',
  DUE_90_PLUS: 'bg-rose-100 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300'
};

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

type BillingView = 'invoices' | 'payouts';

export const BillingEngine: React.FC<BillingEngineProps> = ({
  state,
  selectedMonth,
  selectedYear,
  onViewInvoice,
  onTogglePaymentStatus,
  onRecordPayment,
  onToggleAgentPayoutStatus
}) => {
  const { areas, buildings, flats, wings } = state;
  const monthName = monthNames[selectedMonth - 1];

  const [view, setView] = useState<BillingView>('invoices');
  const [areaFilter, setAreaFilter] = useState<string>('ALL');
  const [buildingFilter, setBuildingFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Feature: Admin Mark as Paid confirmation states
  const [confirmingFlatId, setConfirmingFlatId] = useState<string | null>(null);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [exportFailed, setExportFailed] = useState(false);
  const [recordingFlatId, setRecordingFlatId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [paymentNote, setPaymentNote] = useState('');

  const handleToggleClick = (flatId: string) => {
    setConfirmingFlatId(flatId);
  };

  const confirmToggle = () => {
    if (!confirmingFlatId) return;
    onTogglePaymentStatus(confirmingFlatId);
    setConfirmingFlatId(null);
  };

  const openRecordPayment = (bill: BillingSummary) => {
    setRecordingFlatId(bill.flatId);
    setPaymentAmount(bill.balanceDue > 0 ? bill.balanceDue.toFixed(2) : '');
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setPaymentNote('');
  };

  const submitRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(paymentAmount);
    if (!recordingFlatId || isNaN(amount) || amount <= 0) return;
    onRecordPayment(recordingFlatId, amount, paymentDate, paymentNote.trim() || undefined);
    setRecordingFlatId(null);
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

  // Compile billing list based on filters - calculateBill already resolves the manual
  // override / recorded-payments / seeded-fallback chain internally (see resolvePaymentInfo).
  const billingSummaries = useMemo(
    () => flats.map(flat => calculateBill(flat, selectedMonth, selectedYear, state)),
    [flats, selectedMonth, selectedYear, state]
  );

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

  const { visible: visibleSummaries, sentinelRef, hasMore, remaining } = useWindowedList(filteredSummaries, 40);

  // Totals calculations based on filtered entries
  const aggregatedTotals = useMemo(() => {
    let gross = 0, deductions = 0, net = 0, collected = 0, partial = 0, outstanding = 0;

    filteredSummaries.forEach(bill => {
      gross += bill.grossAmount;
      deductions += bill.skipDeductions;
      net += bill.netAmount;
      if (bill.status === 'PAID') collected += bill.netAmount;
      else if (bill.status === 'PARTIAL') { partial += bill.amountPaid; outstanding += bill.balanceDue; }
      else outstanding += bill.netAmount;
    });

    return { gross, deductions, net, collected, partial, outstanding };
  }, [filteredSummaries]);

  // Unpaid/partial customers within the current filters, for the bulk reminder workflow
  const unpaidSummaries = useMemo(() => filteredSummaries.filter(bill => bill.status !== 'PAID'), [filteredSummaries]);

  const buildReminderWhatsAppUrl = (bill: BillingSummary) => {
    const cleanPhone = (bill.phoneNumber || '').replace(/\+/g, '').replace(/ /g, '');
    const message = `Dear *${bill.customerName}*,\n\nThis is a friendly reminder that your newspaper bill for *${monthName} ${selectedYear}* of *₹${bill.balanceDue.toFixed(2)}* is still due.\n\nPlease settle it at your earliest convenience. Thank you!\n\n- PaperTrack`;
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  };

  const buildAgentNotifyUrl = (agentPhone: string, agentName: string, amount: number) => {
    const cleanPhone = agentPhone.replace(/\+/g, '').replace(/ /g, '');
    const message = `Hi *${agentName}*,\n\nYour delivery commission for *${monthName} ${selectedYear}* comes to *₹${amount.toFixed(2)}*.\n\n- PaperTrack`;
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  };

  // Export tables to raw CSV
  const handleExportCSV = async () => {
    let csvContent = 'Invoice Month,Customer Name,Flat Number,Location Address,Subscribed Papers,Delivered Days,Skipped Days,Gross Total (INR),Deductions (INR),Net Bill Amount (INR),Amount Paid (INR),Balance Due (INR),Payment Status\n';

    const csvEscape = (value: string) => `"${value.replace(/"/g, '""')}"`;

    filteredSummaries.forEach((bill) => {
      const papersStr = bill.subscribedPapers.map(p => p.paperName).join(' | ');
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
        bill.amountPaid.toFixed(2),
        bill.balanceDue.toFixed(2),
        bill.status
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

  const recordingBill = recordingFlatId ? filteredSummaries.find(b => b.flatId === recordingFlatId) || billingSummaries.find(b => b.flatId === recordingFlatId) : null;

  return (
    <div className="space-y-6">
      {/* Customer Invoices / Agent Payouts segmented control */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-1.5 shadow-sm flex gap-1.5 w-fit">
        <button
          onClick={() => setView('invoices')}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-colors active:scale-[0.97] cursor-pointer ${view === 'invoices' ? 'bg-slate-900 dark:bg-slate-800 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
        >
          <Receipt size={14} className={view === 'invoices' ? 'text-emerald-400' : ''} /> Customer Invoices
        </button>
        <button
          onClick={() => setView('payouts')}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-colors active:scale-[0.97] cursor-pointer ${view === 'payouts' ? 'bg-slate-900 dark:bg-slate-800 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
        >
          <Users size={14} className={view === 'payouts' ? 'text-emerald-400' : ''} /> Agent Payouts
        </button>
      </div>

      {view === 'invoices' ? (
        <>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
            From fully settled invoices
          </p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-950/10 border border-amber-150 dark:border-amber-950 rounded-xl p-4">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-amber-600 dark:text-amber-400">Partially Collected</p>
          <h4 className="text-xl font-black text-amber-700 dark:text-amber-400 mt-1">₹{aggregatedTotals.partial.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</h4>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 border-t border-amber-150 dark:border-amber-950/60 pt-1.5">
            From part-paid invoices
          </p>
        </div>
        <div className="bg-rose-50 dark:bg-rose-950/10 border border-rose-150 dark:border-rose-950 rounded-xl p-4">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-rose-600 dark:text-rose-400">Outstanding Receivable</p>
          <h4 className="text-xl font-black text-rose-700 dark:text-rose-400 mt-1">₹{aggregatedTotals.outstanding.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</h4>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 border-t border-rose-150 dark:border-rose-950/60 pt-1.5">
            Across unpaid + partial invoices
          </p>
        </div>
      </div>

      {/* Invoice Table Grid */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
            <FileSpreadsheet size={15} className="text-emerald-500" />
            Invoice Records for {monthName} {selectedYear}
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
            <>
            {visibleSummaries.map((bill) => {
              const aging = bill.status !== 'PAID' ? resolveAgingBucket(flats.find(f => f.id === bill.flatId)!, selectedMonth, selectedYear, state) : 'CURRENT';
              const style = STATUS_STYLES[bill.status];
              return (
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
                      {aging !== 'CURRENT' && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${AGING_STYLES[aging]}`}>
                          <Clock size={9} /> {AGING_LABEL[aging]}
                        </span>
                      )}
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
                    {bill.status === 'PARTIAL' && (
                      <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">₹{bill.amountPaid.toFixed(2)} paid · ₹{bill.balanceDue.toFixed(2)} due</p>
                    )}
                    <p className="text-[11px] mt-1 whitespace-nowrap">
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">{bill.totalDelivered}d</span>
                      <span className="text-slate-300 dark:text-slate-700 mx-1">/</span>
                      <span className="text-rose-600 dark:text-rose-400 font-bold">{bill.totalSkipped}s</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-3.5 flex-wrap">
                  <button
                    onClick={() => handleToggleClick(bill.flatId)}
                    className={`flex-1 min-w-[100px] min-h-[44px] rounded-xl text-xs font-bold transition-all active:scale-[0.96] cursor-pointer flex items-center justify-center gap-1.5 ${style.pill}`}
                    title="Click to mark fully Paid/Unpaid"
                  >
                    {bill.status === 'PAID' ? <CheckCircle size={14} /> : bill.status === 'PARTIAL' ? <Wallet size={14} /> : <AlertCircle size={14} />}
                    <span>{style.label}</span>
                  </button>
                  {bill.status !== 'PAID' && (
                    <button
                      onClick={() => openRecordPayment(bill)}
                      className="flex-1 min-w-[100px] min-h-[44px] rounded-xl text-xs font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-950/50 transition-colors active:scale-[0.96] cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <CreditCard size={14} />
                      <span>Record Payment</span>
                    </button>
                  )}
                  <button
                    onClick={() => onViewInvoice(bill)}
                    className="flex-1 min-w-[100px] min-h-[44px] rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-400 transition-colors active:scale-[0.96] cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Eye size={14} />
                    <span>Invoice</span>
                  </button>
                </div>
              </div>
              );
            })}
            {hasMore && (
              <div ref={sentinelRef} className="p-4 text-center text-[11px] text-slate-400 dark:text-slate-500">
                Loading {remaining} more...
              </div>
            )}
            </>
          )}
        </div>
      </div>

      {/* Admin Confirmation Dialog Overlay */}
      {confirmingFlatId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-sm overflow-hidden animate-fade-in">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-950/40 rounded-xl">
                <CreditCard className="text-emerald-600 dark:text-emerald-400" size={20} />
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-tight">Payment Status Update</h4>
            </div>

            <div className="p-5">
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                This marks the invoice fully Paid or Unpaid directly, overriding any recorded partial
                payments for this month. Use "Record Payment" instead to log a specific amount.
              </p>

              <div className="mt-6 flex items-center gap-3">
                <button
                  onClick={() => setConfirmingFlatId(null)}
                  className="flex-1 py-3 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 transition-colors active:scale-[0.96] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmToggle}
                  className="flex-1 py-3 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-500/20 transition-all active:scale-[0.96] cursor-pointer flex items-center justify-center gap-2"
                >
                  <CheckCircle size={14} />
                  <span>Confirm</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {recordingFlatId && recordingBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-sm overflow-hidden animate-fade-in">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-950/40 rounded-xl">
                  <CreditCard className="text-blue-600 dark:text-blue-400" size={20} />
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-tight">Record Payment</h4>
              </div>
              <button onClick={() => setRecordingFlatId(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 p-2.5 rounded-xl transition-colors cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={submitRecordPayment} className="p-5 space-y-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {recordingBill.customerName} · Balance due ₹{recordingBill.balanceDue.toFixed(2)}
              </p>
              <div>
                <label htmlFor="payment-amount" className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Amount (₹)</label>
                <input
                  id="payment-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full text-sm px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-1 focus:ring-emerald-500 outline-none dark:text-slate-100"
                />
              </div>
              <div>
                <label htmlFor="payment-date" className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Date Received</label>
                <input
                  id="payment-date"
                  type="date"
                  required
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full text-sm px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-1 focus:ring-emerald-500 outline-none dark:text-slate-100"
                />
              </div>
              <div>
                <label htmlFor="payment-note" className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Note (optional)</label>
                <input
                  id="payment-note"
                  type="text"
                  placeholder="e.g. Cash, UPI, part payment"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  className="w-full text-sm px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-1 focus:ring-emerald-500 outline-none dark:text-slate-100"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
              >
                <CheckCircle size={16} /> Save Payment
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Payment Reminder Dispatch Modal */}
      {showReminderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden animate-fade-in">
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
                Click "Send" to open a prefilled WhatsApp reminder for each unpaid/partial customer below. Browsers block sending
                all of these at once, so send them one at a time.
              </p>
              {unpaidSummaries.map(bill => (
                <div key={bill.flatId} className="flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 rounded-xl px-3.5 py-2.5">
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{bill.customerName} <span className="text-slate-400 font-medium">• Flat {bill.flatNumber}</span></p>
                    <p className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold">₹{bill.balanceDue.toFixed(2)} due</p>
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
        </>
      ) : (
        <AgentPayoutsView
          state={state}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          monthName={monthName}
          onToggleAgentPayoutStatus={onToggleAgentPayoutStatus}
          buildAgentNotifyUrl={buildAgentNotifyUrl}
        />
      )}
    </div>
  );
};

interface AgentPayoutsViewProps {
  state: DatabaseState;
  selectedMonth: number;
  selectedYear: number;
  monthName: string;
  onToggleAgentPayoutStatus: (agentId: string) => void;
  buildAgentNotifyUrl: (phone: string, name: string, amount: number) => string;
}

const AgentPayoutsView: React.FC<AgentPayoutsViewProps> = ({ state, selectedMonth, selectedYear, monthName, onToggleAgentPayoutStatus, buildAgentNotifyUrl }) => {
  const payouts = useMemo(
    () => state.agents.map(agent => computeAgentPayout(agent, selectedMonth, selectedYear, state)),
    [state, selectedMonth, selectedYear]
  );

  const totalCommission = payouts.reduce((s, p) => s + p.commissionAmount, 0);
  const totalPaid = payouts.filter(p => p.paid).reduce((s, p) => s + p.commissionAmount, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-slate-900 text-white rounded-xl p-4 border border-slate-800">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Total Commission Owed</p>
          <h4 className="text-xl font-black text-emerald-400 mt-1">₹{totalCommission.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</h4>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900 rounded-xl p-4">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-emerald-600 dark:text-emerald-400">Already Paid Out</p>
          <h4 className="text-xl font-black text-emerald-800 dark:text-emerald-300 mt-1">₹{totalPaid.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</h4>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900">
          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
            <Users size={15} className="text-emerald-500" /> Agent Commission - {monthName} {selectedYear}
          </h3>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {payouts.length === 0 ? (
            <p className="text-center text-xs text-slate-400 py-10">No delivery agents registered yet.</p>
          ) : payouts.map((p) => (
            <div key={p.agentId} className="p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm">{p.agentName}</h4>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{p.areaName} · {p.stops} stops · {p.papersDelivered} papers delivered</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    {p.commissionType === 'PER_PAPER' && `₹${p.commissionRate}/paper delivered`}
                    {p.commissionType === 'PERCENTAGE' && `${p.commissionRate}% of ₹${p.areaCollected.toFixed(0)} collected in area`}
                    {p.commissionType === 'FIXED_MONTHLY' && `Fixed ₹${p.commissionRate}/month`}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-black text-slate-800 dark:text-slate-100">₹{p.commissionAmount.toFixed(2)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3.5">
                <button
                  onClick={() => onToggleAgentPayoutStatus(p.agentId)}
                  className={`flex-1 min-h-[44px] rounded-xl text-xs font-bold transition-all active:scale-[0.96] cursor-pointer flex items-center justify-center gap-1.5 ${
                    p.paid
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/20'
                      : 'bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/30'
                  }`}
                >
                  {p.paid ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                  <span>{p.paid ? 'PAID OUT' : 'UNPAID'}</span>
                </button>
                <a
                  href={buildAgentNotifyUrl(p.phone, p.agentName, p.commissionAmount)}
                  className="flex-1 min-h-[44px] rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors active:scale-[0.96] cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Send size={14} /> Notify via WhatsApp
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
