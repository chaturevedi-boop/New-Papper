import React, { useMemo } from 'react';
import { DatabaseState, calculateBill, collectedAmountFor, getExpensesForMonth, sumExpenses } from '../data/dummyGenerator';
import {
  Building2,
  TrendingUp,
  CreditCard,
  AlertCircle,
  Newspaper,
  Wallet
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

interface DashboardStatsProps {
  state: DatabaseState;
  month: number;
  year: number;
}

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export const DashboardStats: React.FC<DashboardStatsProps> = ({ state, month, year }) => {
  const { areas, buildings, flats, papers, subscriptions } = state;

  // Calculate high-level stats for the given month, accounting for payment overrides.
  // Memoized since calculateBill runs once per flat and this component re-renders on
  // any parent state change (tab switches, modal toggles, etc.), not just data changes.
  const { grossPotential, collectedAmount, pendingAmount, paidCount, unpaidCount, netProfit, monthExpenses } = useMemo(() => {
    let grossPotential = 0;
    let collectedAmount = 0;
    let pendingAmount = 0;
    let paidCount = 0;
    let unpaidCount = 0;

    flats.forEach((flat) => {
      const bill = calculateBill(flat, month, year, state);
      grossPotential += bill.grossAmount;
      collectedAmount += collectedAmountFor(bill);
      pendingAmount += bill.balanceDue;
      if (bill.status === 'PAID') paidCount++;
      else unpaidCount++;
    });

    const monthExpenses = sumExpenses(getExpensesForMonth(state, month, year));

    return { grossPotential, collectedAmount, pendingAmount, paidCount, unpaidCount, netProfit: collectedAmount - monthExpenses, monthExpenses };
  }, [flats, month, year, state]);

  const activeSubsCount = subscriptions.filter(s => s.active).length;

  const stats = [
    {
      label: 'Geographic Footprint',
      value: `${areas.length} Areas • ${buildings.length} Bldgs`,
      subText: `${flats.length} Customer Flats`,
      icon: Building2,
      bgColor: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
    },
    {
      label: 'Active Subscriptions',
      value: activeSubsCount.toString(),
      subText: `${papers.length} Newspaper Master Rate sheets`,
      icon: Newspaper,
      bgColor: 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400',
    },
    {
      label: 'Gross Billing Potential',
      value: `₹${grossPotential.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
      subText: 'Total deliverable value',
      icon: TrendingUp,
      bgColor: 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400',
    },
    {
      label: 'Revenue Collected',
      value: `₹${collectedAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
      subText: `${paidCount} flats settled`,
      icon: CreditCard,
      bgColor: 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300',
    },
    {
      label: 'Outstanding Dues',
      value: `₹${pendingAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
      subText: `${unpaidCount} flats pending payment`,
      icon: AlertCircle,
      bgColor: 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400',
    },
    {
      label: 'Net Profit',
      value: `₹${netProfit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
      subText: `After ₹${monthExpenses.toLocaleString('en-IN', { maximumFractionDigits: 0 })} expenses`,
      icon: Wallet,
      bgColor: netProfit >= 0 ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400',
    },
  ];

  // Calculate monthly revenue trends across the last six months (also memoized -
  // this runs calculateBill for every flat across 6 months, ~6x the cost above)
  const chartData = useMemo(() => {
    const lastSixMonths = [];
    for (let i = 5; i >= 0; i--) {
      let m = month - i;
      let y = year;
      while (m <= 0) {
        m += 12;
        y -= 1;
      }
      lastSixMonths.push({ month: m, year: y });
    }

    return lastSixMonths.map(({ month: m, year: y }) => {
      let collected = 0;
      let pending = 0;

      flats.forEach((flat) => {
        const bill = calculateBill(flat, m, y, state);
        collected += collectedAmountFor(bill);
        pending += bill.balanceDue;
      });

      return {
        name: `${MONTH_NAMES[m - 1]} '${y.toString().slice(-2)}`,
        Collected: Math.round(collected),
        Pending: Math.round(pending),
      };
    });
  }, [flats, month, year, state]);

  // Custom polished tooltip matching the elegant UI
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const colVal = payload[0]?.value || 0;
      const pendVal = payload[1]?.value || 0;
      const totalVal = colVal + pendVal;
      return (
        <div className="bg-white dark:bg-slate-900 p-3.5 border border-slate-150 dark:border-slate-800 rounded-xl shadow-lg">
          <p className="text-xs font-extrabold text-slate-800 dark:text-slate-100 mb-2">{label}</p>
          <div className="space-y-1.5">
            <div className="flex items-center gap-4 justify-between text-xs">
              <span className="flex items-center gap-1.5 font-medium text-slate-500 dark:text-slate-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Collected:
              </span>
              <span className="font-bold font-mono text-slate-800 dark:text-slate-100">
                ₹{colVal.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex items-center gap-4 justify-between text-xs">
              <span className="flex items-center gap-1.5 font-medium text-slate-500 dark:text-slate-400">
                <span className="w-2 h-2 rounded-full bg-rose-400" />
                Outstanding:
              </span>
              <span className="font-bold font-mono text-slate-800 dark:text-slate-100">
                ₹{pendVal.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="border-t border-slate-100 dark:border-slate-850 pt-2 mt-2 flex items-center justify-between text-xs font-extrabold text-slate-800 dark:text-slate-100">
              <span>Total Potential:</span>
              <span className="font-mono">
                ₹{totalVal.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* 5 Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div
              key={i}
              className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 shadow-sm flex items-start gap-3.5 transition-all hover:shadow-md active:scale-[0.98]"
              id={`stat-card-${i}`}
            >
              <div className={`p-3 rounded-xl shrink-0 ${stat.bgColor}`}>
                <Icon size={24} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{stat.label}</p>
                <h4 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 mt-1 truncate">{stat.value}</h4>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{stat.subText}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Revenue Trend Chart Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-100 dark:border-slate-800 shadow-sm" id="revenue-trend-chart-card">
        {/* Header with Title and Legend Info */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-xs font-extrabold text-slate-850 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <span className="w-1.5 h-3 bg-emerald-500 rounded-sm inline-block" />
              6-Month Billing & Revenue Cycle
            </h3>
            <p className="text-[11px] text-slate-450 dark:text-slate-500 mt-1">
              Interactive trend graph of collected payments versus pending outstanding balances
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-bold">
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
              <span className="w-2.5 h-2.5 rounded bg-emerald-500" />
              <span>Collected</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
              <span className="w-2.5 h-2.5 rounded bg-rose-400" />
              <span>Outstanding</span>
            </div>
          </div>
        </div>

        {/* Recharts Bar Chart */}
        <div className="h-64 sm:h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 5, left: -25, bottom: 0 }}
              barGap={4}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-800/40" />
              <XAxis 
                dataKey="name" 
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
              />
              <YAxis 
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(148, 163, 184, 0.04)' }} />
              <Bar 
                dataKey="Collected" 
                stackId="a" 
                fill="#10b981" 
                radius={[0, 0, 4, 4]} 
                maxBarSize={36}
              />
              <Bar 
                dataKey="Pending" 
                stackId="a" 
                fill="#fb7185" 
                radius={[4, 4, 0, 0]} 
                maxBarSize={36}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
