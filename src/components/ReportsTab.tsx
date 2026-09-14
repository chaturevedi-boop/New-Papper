import React, { useMemo, useState } from 'react';
import {
  DatabaseState,
  calculateBill,
  computeAgentPayout,
  collectedAmountFor,
  getSubscriptionsByFlatIndex,
  isSubscriptionDeliverable,
  shiftMonth
} from '../data/dummyGenerator';
import { buildCsv } from '../utils/csv';
import { shareOrDownloadFile } from '../utils/shareFile';
import {
  BarChart3,
  Newspaper,
  Users,
  Building2,
  CalendarRange,
  Download,
  TrendingUp,
  RefreshCw
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface ReportsTabProps {
  state: DatabaseState;
  month: number;
  year: number;
}

type ReportSubTab = 'trend' | 'papers' | 'agents' | 'areas' | 'annual';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const SectionCard: React.FC<{ title: string; icon: React.ElementType; action?: React.ReactNode; children: React.ReactNode }> = ({ title, icon: Icon, action, children }) => (
  <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-100 dark:border-slate-800 shadow-sm">
    <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
      <h3 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
        <Icon size={15} className="text-emerald-500" /> {title}
      </h3>
      {action}
    </div>
    {children}
  </div>
);

const ExportButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button
    onClick={onClick}
    className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-bold rounded-lg px-3 py-2 flex items-center gap-1.5 transition-colors active:scale-[0.96] cursor-pointer"
  >
    <Download size={13} /> Export CSV
  </button>
);

export const ReportsTab: React.FC<ReportsTabProps> = ({ state, month, year }) => {
  const [subTab, setSubTab] = useState<ReportSubTab>('trend');
  const monthName = MONTH_NAMES[month - 1];

  const SUB_TABS: { key: ReportSubTab; label: string; icon: React.ElementType }[] = [
    { key: 'trend', label: 'Revenue Trend', icon: TrendingUp },
    { key: 'papers', label: 'Paper Sales', icon: Newspaper },
    { key: 'agents', label: 'Agent Performance', icon: Users },
    { key: 'areas', label: 'Area Profitability', icon: Building2 },
    { key: 'annual', label: 'Annual Summary', icon: CalendarRange },
  ];

  // ---- Revenue trend (12 months, fuller than the dashboard's 6-month version) ----
  const trendData = useMemo(() => {
    const months = [];
    for (let i = 11; i >= 0; i--) months.push(shiftMonth(month, year, -i));

    return months.map(({ month: m, year: y }) => {
      let collected = 0;
      let pending = 0;
      state.flats.forEach((flat) => {
        const bill = calculateBill(flat, m, y, state);
        collected += collectedAmountFor(bill);
        pending += bill.balanceDue;
      });
      return { name: `${MONTH_SHORT[m - 1]} '${y.toString().slice(-2)}`, Collected: Math.round(collected), Outstanding: Math.round(pending) };
    });
  }, [state, month, year]);

  // ---- Paper-wise sales ----
  const paperSales = useMemo(() => {
    const subIndex = getSubscriptionsByFlatIndex(state.subscriptions);
    return state.papers.map((paper) => {
      let deliveredDays = 0;
      let revenue = 0;
      let subscriberCount = 0;

      state.flats.forEach((flat) => {
        const subs = subIndex.get(flat.id) || [];
        const sub = subs.find(s => s.paperId === paper.id && isSubscriptionDeliverable(s));
        if (!sub) return;
        subscriberCount++;
        const bill = calculateBill(flat, month, year, state);
        const line = bill.subscribedPapers.find(p => p.paperName === paper.name);
        if (line) { deliveredDays += line.deliveredDays; revenue += line.cost; }
      });

      return { paper, deliveredDays, revenue, subscriberCount };
    }).sort((a, b) => b.revenue - a.revenue);
  }, [state, month, year]);

  const handleExportPaperSales = async () => {
    const csv = buildCsv(
      ['Newspaper', 'Active Subscribers', 'Delivered Days', 'Revenue (INR)'],
      paperSales.map(row => [row.paper.name, row.subscriberCount, row.deliveredDays, row.revenue.toFixed(2)])
    );
    await shareOrDownloadFile(csv, `Paper_Sales_${monthName}_${year}.csv`, 'text/csv', `Paper Sales - ${monthName} ${year}`);
  };

  // ---- Agent performance & commission ----
  const agentReport = useMemo(
    () => state.agents.map(agent => computeAgentPayout(agent, month, year, state)),
    [state, month, year]
  );

  const handleExportAgents = async () => {
    const csv = buildCsv(
      ['Agent', 'Area', 'Stops', 'Papers Delivered', 'Area Collections (INR)', 'Commission (INR)', 'Payout Status'],
      agentReport.map(r => [r.agentName, r.areaName, r.stops, r.papersDelivered, r.areaCollected.toFixed(2), r.commissionAmount.toFixed(2), r.paid ? 'PAID' : 'UNPAID'])
    );
    await shareOrDownloadFile(csv, `Agent_Performance_${monthName}_${year}.csv`, 'text/csv', `Agent Performance - ${monthName} ${year}`);
  };

  // ---- Area / building profitability ----
  const areaReport = useMemo(() => {
    return state.areas.map((area) => {
      const buildings = state.buildings.filter(b => b.areaId === area.id).map((building) => {
        const wingIds = new Set(state.wings.filter(w => w.buildingId === building.id).map(w => w.id));
        const flats = state.flats.filter(f => wingIds.has(f.wingId));
        let gross = 0, net = 0, collected = 0, outstanding = 0;
        flats.forEach((flat) => {
          const bill = calculateBill(flat, month, year, state);
          gross += bill.grossAmount; net += bill.netAmount;
          collected += collectedAmountFor(bill); outstanding += bill.balanceDue;
        });
        return { building, flatCount: flats.length, gross, net, collected, outstanding };
      });

      const totals = buildings.reduce((acc, b) => ({
        gross: acc.gross + b.gross, net: acc.net + b.net,
        collected: acc.collected + b.collected, outstanding: acc.outstanding + b.outstanding,
        flatCount: acc.flatCount + b.flatCount
      }), { gross: 0, net: 0, collected: 0, outstanding: 0, flatCount: 0 });

      return { area, buildings, totals };
    }).sort((a, b) => b.totals.net - a.totals.net);
  }, [state, month, year]);

  const handleExportAreas = async () => {
    const rows: (string | number)[][] = [];
    areaReport.forEach(({ area, buildings, totals }) => {
      buildings.forEach(b => rows.push([area.name, b.building.name, b.flatCount, b.net.toFixed(2), b.collected.toFixed(2), b.outstanding.toFixed(2)]));
      rows.push([area.name, 'AREA TOTAL', totals.flatCount, totals.net.toFixed(2), totals.collected.toFixed(2), totals.outstanding.toFixed(2)]);
    });
    const csv = buildCsv(['Area', 'Building', 'Flats', 'Net Billing (INR)', 'Collected (INR)', 'Outstanding (INR)'], rows);
    await shareOrDownloadFile(csv, `Area_Profitability_${monthName}_${year}.csv`, 'text/csv', `Area Profitability - ${monthName} ${year}`);
  };

  // ---- Annual customer summary - expensive (flats x 12 months), so it's generated on demand ----
  const [annualGenerated, setAnnualGenerated] = useState(false);
  const [annualBusy, setAnnualBusy] = useState(false);

  const annualSummary = useMemo(() => {
    if (!annualGenerated) return [];
    return state.flats.map((flat) => {
      const months = Array.from({ length: 12 }, (_, i) => calculateBill(flat, i + 1, year, state));
      const totalNet = months.reduce((s, b) => s + b.netAmount, 0);
      const totalCollected = months.reduce((s, b) => s + collectedAmountFor(b), 0);
      return { flat, months, totalNet, totalCollected };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [annualGenerated, state, year]);

  const handleGenerateAnnual = () => {
    setAnnualBusy(true);
    // Yield to the browser so the spinner actually paints before the (synchronous) crunch runs
    setTimeout(() => { setAnnualGenerated(true); setAnnualBusy(false); }, 30);
  };

  const handleExportAnnual = async () => {
    const csv = buildCsv(
      ['Customer', 'Flat', ...MONTH_SHORT.map(m => `${m} ${year} (INR)`), `Total Net ${year} (INR)`, `Total Collected ${year} (INR)`],
      annualSummary.map(row => [
        row.flat.customerName, row.flat.flatNumber,
        ...row.months.map(b => b.netAmount.toFixed(2)),
        row.totalNet.toFixed(2), row.totalCollected.toFixed(2)
      ])
    );
    await shareOrDownloadFile(csv, `Annual_Customer_Summary_${year}.csv`, 'text/csv', `Annual Summary ${year}`);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm p-2 flex flex-wrap gap-1.5">
        {SUB_TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setSubTab(key)}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-colors active:scale-[0.97] cursor-pointer ${
              subTab === key ? 'bg-slate-900 dark:bg-slate-800 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
          >
            <Icon size={14} className={subTab === key ? 'text-emerald-400' : ''} /> {label}
          </button>
        ))}
      </div>

      {subTab === 'trend' && (
        <SectionCard title={`12-Month Revenue Trend (through ${monthName} ${year})`} icon={BarChart3}>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData} margin={{ top: 10, right: 5, left: -20, bottom: 0 }} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-800/40" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }} tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                <Tooltip formatter={(v: number) => `₹${v.toLocaleString('en-IN')}`} />
                <Legend wrapperStyle={{ fontSize: 11, fontWeight: 600 }} />
                <Bar dataKey="Collected" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} maxBarSize={28} />
                <Bar dataKey="Outstanding" stackId="a" fill="#fb7185" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      )}

      {subTab === 'papers' && (
        <SectionCard title={`Paper-wise Sales - ${monthName} ${year}`} icon={Newspaper} action={<ExportButton onClick={handleExportPaperSales} />}>
          <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[500px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-850 border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-2.5 px-4">Newspaper</th>
                  <th className="py-2.5 px-4 text-right">Subscribers</th>
                  <th className="py-2.5 px-4 text-right">Delivered Days</th>
                  <th className="py-2.5 px-4 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paperSales.map(({ paper, deliveredDays, revenue, subscriberCount }) => (
                  <tr key={paper.id}>
                    <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">{paper.name}</td>
                    <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">{subscriberCount}</td>
                    <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">{deliveredDays}</td>
                    <td className="py-3 px-4 text-right font-black text-emerald-700 dark:text-emerald-400 font-mono">₹{revenue.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {subTab === 'agents' && (
        <SectionCard title={`Agent Performance & Commission - ${monthName} ${year}`} icon={Users} action={<ExportButton onClick={handleExportAgents} />}>
          <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[600px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-850 border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-2.5 px-4">Agent</th>
                  <th className="py-2.5 px-4">Area</th>
                  <th className="py-2.5 px-4 text-right">Stops</th>
                  <th className="py-2.5 px-4 text-right">Papers Delivered</th>
                  <th className="py-2.5 px-4 text-right">Commission</th>
                  <th className="py-2.5 px-4 text-center">Payout</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {agentReport.map((r) => (
                  <tr key={r.agentId}>
                    <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">{r.agentName}</td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400">{r.areaName}</td>
                    <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">{r.stops}</td>
                    <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">{r.papersDelivered}</td>
                    <td className="py-3 px-4 text-right font-black text-slate-800 dark:text-slate-100 font-mono">₹{r.commissionAmount.toFixed(2)}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.paid ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400'}`}>
                        {r.paid ? 'PAID' : 'UNPAID'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-3">
            Mark payouts as paid from Billing → Agent Payouts.
          </p>
        </SectionCard>
      )}

      {subTab === 'areas' && (
        <SectionCard title={`Area & Building Profitability - ${monthName} ${year}`} icon={Building2} action={<ExportButton onClick={handleExportAreas} />}>
          <div className="space-y-4">
            {areaReport.map(({ area, buildings, totals }) => (
              <div key={area.id} className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden">
                <div className="bg-emerald-50/70 dark:bg-emerald-950/20 border-b border-slate-100 dark:border-slate-800 px-4 py-2.5 flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider">{area.name}</span>
                  <span className="text-xs font-black text-slate-800 dark:text-slate-100 font-mono">₹{totals.net.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                </div>
                <table className="w-full text-left text-xs">
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {buildings.map(b => (
                      <tr key={b.building.id}>
                        <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300 font-semibold">{b.building.name} <span className="text-slate-400 font-normal">({b.flatCount} flats)</span></td>
                        <td className="py-2.5 px-4 text-right text-emerald-600 dark:text-emerald-400 font-mono">₹{b.collected.toFixed(0)} collected</td>
                        <td className="py-2.5 px-4 text-right text-rose-500 dark:text-rose-400 font-mono">₹{b.outstanding.toFixed(0)} due</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {subTab === 'annual' && (
        <SectionCard
          title={`Annual Customer Summary - ${year}`}
          icon={CalendarRange}
          action={annualGenerated ? <ExportButton onClick={handleExportAnnual} /> : undefined}
        >
          {!annualGenerated ? (
            <div className="text-center py-10">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Computes all 12 months for every customer ({state.flats.length} flats) - generated on demand since it's a heavier calculation.
              </p>
              <button
                onClick={handleGenerateAnnual}
                disabled={annualBusy}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl px-5 py-3 inline-flex items-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {annualBusy ? <RefreshCw size={14} className="animate-spin" /> : <CalendarRange size={14} />}
                {annualBusy ? 'Generating...' : 'Generate Annual Summary'}
              </button>
            </div>
          ) : (
            <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-x-auto max-h-[60vh] overflow-y-auto">
              <table className="w-full text-left text-[11px] min-w-[900px]">
                <thead className="sticky top-0 bg-slate-50 dark:bg-slate-850 z-10">
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="py-2.5 px-3 sticky left-0 bg-slate-50 dark:bg-slate-850">Customer</th>
                    {MONTH_SHORT.map(m => <th key={m} className="py-2.5 px-2 text-right">{m}</th>)}
                    <th className="py-2.5 px-3 text-right">Total Net</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {annualSummary.map(({ flat, months, totalNet }) => (
                    <tr key={flat.id}>
                      <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-200 sticky left-0 bg-white dark:bg-slate-900 whitespace-nowrap">
                        {flat.customerName} <span className="text-slate-400 font-normal">({flat.flatNumber})</span>
                      </td>
                      {months.map((bill, idx) => (
                        <td key={idx} className={`py-2 px-2 text-right font-mono ${bill.status === 'PAID' ? 'text-emerald-600 dark:text-emerald-400' : bill.status === 'PARTIAL' ? 'text-amber-600 dark:text-amber-400' : 'text-rose-500 dark:text-rose-400'}`}>
                          {bill.netAmount.toFixed(0)}
                        </td>
                      ))}
                      <td className="py-2 px-3 text-right font-black text-slate-800 dark:text-slate-100 font-mono">₹{totalNet.toFixed(0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      )}
    </div>
  );
};
