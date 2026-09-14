import {
  Area,
  Building,
  Wing,
  Flat,
  Paper,
  Subscription,
  DeliveryAgent,
  DeliveryLog,
  BillingSummary,
  PaymentRecord,
  PaymentStatus,
  Expense,
  AgentPayout,
  CommissionType
} from '../types';

export interface DatabaseState {
  areas: Area[];
  buildings: Building[];
  wings: Wing[];
  flats: Flat[];
  papers: Paper[];
  subscriptions: Subscription[];
  agents: DeliveryAgent[];
  deliveryLogs: DeliveryLog[];
  // Manual admin overrides of the computed paid/unpaid status, keyed by getPaymentOverrideKey()
  paymentOverrides: Record<string, 'PAID' | 'UNPAID'>;
  // Actual money received per billing period, keyed by getPaymentOverrideKey(). Sums below the
  // net amount resolve to a PARTIAL status rather than the old binary paid/unpaid.
  paymentRecords: Record<string, PaymentRecord[]>;
  // Agent commission settlement per period, keyed by getAgentPayoutKey()
  agentPayouts: Record<string, 'PAID' | 'UNPAID'>;
  expenses: Expense[];
}

// Shared key format so every consumer (App, DashboardStats, BillingEngine) agrees on lookup
export function getPaymentOverrideKey(flatId: string, month: number, year: number): string {
  return `${flatId}_${month}_${year}`;
}

export function getAgentPayoutKey(agentId: string, month: number, year: number): string {
  return `${agentId}_${month}_${year}`;
}

export const EMPTY_DATABASE: DatabaseState = {
  areas: [],
  buildings: [],
  wings: [],
  flats: [],
  papers: [],
  subscriptions: [],
  agents: [],
  deliveryLogs: [],
  paymentOverrides: {},
  paymentRecords: {},
  agentPayouts: {},
  expenses: []
};

// Backfills state loaded from localStorage or an older exported backup so data saved before
// rate history / partial payments / expenses existed keeps working untouched.
export function normalizeDatabaseState(raw: Partial<DatabaseState>): DatabaseState {
  const papers = (raw.papers || []).map(p => ({
    ...p,
    rateHistory:
      p.rateHistory && p.rateHistory.length > 0
        ? [...p.rateHistory].sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom))
        : [{ rate: p.ratePerDay, effectiveFrom: '2000-01-01' }]
  }));

  return {
    ...EMPTY_DATABASE,
    ...raw,
    papers,
    paymentOverrides: raw.paymentOverrides || {},
    paymentRecords: raw.paymentRecords || {},
    agentPayouts: raw.agentPayouts || {},
    expenses: raw.expenses || []
  };
}

export function generateInitialData(): DatabaseState {
  const areas: Area[] = [
    { id: 'area_1', name: 'Skyline Meadows' },
    { id: 'area_2', name: 'Emerald Heights' },
    { id: 'area_3', name: 'Riverview Avenue' },
    { id: 'area_4', name: 'Orchard Garden' },
    { id: 'area_5', name: 'Highland Boulevard' },
  ];

  const buildings: Building[] = [
    { id: 'b_1', areaId: 'area_1', name: 'Sky Tower A' },
    { id: 'b_2', areaId: 'area_1', name: 'Sky Tower B' },
    { id: 'b_3', areaId: 'area_2', name: 'Emerald Crest' },
    { id: 'b_4', areaId: 'area_2', name: 'Jade Pavilion' },
    { id: 'b_5', areaId: 'area_3', name: 'River Plaza' },
    { id: 'b_6', areaId: 'area_3', name: 'Avenue Arcade' },
    { id: 'b_7', areaId: 'area_4', name: 'Orchard Block 1' },
    { id: 'b_8', areaId: 'area_4', name: 'Orchard Block 2' },
    { id: 'b_9', areaId: 'area_5', name: 'Highland Manor' },
    { id: 'b_10', areaId: 'area_5', name: 'Apex Residency' },
  ];

  const wings: Wing[] = [];
  buildings.forEach((b) => {
    // Generate 2 wings for each building
    wings.push({ id: `w_${b.id}_A`, buildingId: b.id, name: 'Wing A' });
    wings.push({ id: `w_${b.id}_B`, buildingId: b.id, name: 'Wing B' });
  });

  const flats: Flat[] = [];
  const firstNames = ['Aarav', 'Vihaan', 'Aditya', 'Sai', 'Arjun', 'Ananya', 'Diya', 'Ira', 'Kiara', 'Kavya', 'Rohan', 'Sneha', 'Meera', 'Pooja', 'Rahul', 'Siddharth', 'Varun', 'Neha', 'Rhea', 'Amit'];
  const lastNames = ['Sharma', 'Patel', 'Verma', 'Gupta', 'Iyer', 'Reddy', 'Kumar', 'Singh', 'Joshi', 'Mehta', 'Nair', 'Rao', 'Choudhury', 'Bose', 'Das', 'Sen', 'Mishra', 'Trivedi', 'Shah', 'Kapoor'];

  let flatCounter = 1;
  wings.forEach((w) => {
    // Generate 8 flats per wing (4 floors, 2 flats per floor e.g. 101, 102, 201, 202, etc.)
    const floors = [1, 2, 3, 4];
    floors.forEach((floor) => {
      [1, 2].forEach((flatNum) => {
        const id = `f_${flatCounter++}`;
        const nameIdx = Math.floor((id.charCodeAt(id.length - 1) + flatCounter) % firstNames.length);
        const surnameIdx = Math.floor((flatCounter * 3) % lastNames.length);
        const customerName = `${firstNames[nameIdx]} ${lastNames[surnameIdx]}`;
        // BUG FIX: valid Indian mobile numbers are 10 digits starting with 6-9 - this
        // used to generate "9" + 8 digits (9 digits total), an invalid number that made
        // WhatsApp's wa.me links fail to resolve to a specific chat for every seeded flat.
        const firstDigit = [6, 7, 8, 9][Math.floor(Math.random() * 4)];
        const restDigits = Math.floor(100000000 + Math.random() * 900000000);
        // Flat f_1 gets a real, tester-controlled number so WhatsApp share/reminder
        // testing has somewhere real to land instead of a randomly generated one.
        const phoneNumber = id === 'f_1' ? '+91 7417170811' : `+91 ${firstDigit}${restDigits}`;

        flats.push({
          id,
          wingId: w.id,
          flatNumber: `${floor}0${flatNum}`,
          customerName,
          phoneNumber,
          activeYear: 2026,
        });
      });
    });
  });

  // Each paper carries a mid-2026 rate revision so the rate-history behaviour is visible in
  // the seeded demo: June bills use the old rate, July onwards uses the revised one.
  const papers: Paper[] = [
    { id: 'p_1', name: 'The Times of India', ratePerDay: 5.5, rateHistory: [{ rate: 5.0, effectiveFrom: '2000-01-01' }, { rate: 5.5, effectiveFrom: '2026-07-01' }] },
    { id: 'p_2', name: 'The Hindu', ratePerDay: 6.0, rateHistory: [{ rate: 5.5, effectiveFrom: '2000-01-01' }, { rate: 6.0, effectiveFrom: '2026-07-01' }] },
    { id: 'p_3', name: 'The Economic Times', ratePerDay: 7.5, rateHistory: [{ rate: 7.0, effectiveFrom: '2000-01-01' }, { rate: 7.5, effectiveFrom: '2026-07-01' }] },
    { id: 'p_4', name: 'The Indian Express', ratePerDay: 5.0, rateHistory: [{ rate: 4.5, effectiveFrom: '2000-01-01' }, { rate: 5.0, effectiveFrom: '2026-07-01' }] },
    { id: 'p_5', name: 'Business Standard', ratePerDay: 8.0, rateHistory: [{ rate: 7.5, effectiveFrom: '2000-01-01' }, { rate: 8.0, effectiveFrom: '2026-07-01' }] },
  ];

  const agents: DeliveryAgent[] = [
    { id: 'a_1', name: 'Suresh Kumar', phone: '+91 98765 43210', assignedAreaId: 'area_1', commissionType: 'PER_PAPER', commissionRate: 0.75 },
    { id: 'a_2', name: 'Ramesh Patel', phone: '+91 98765 43211', assignedAreaId: 'area_2', commissionType: 'PER_PAPER', commissionRate: 0.8 },
    { id: 'a_3', name: 'Karan Singh', phone: '+91 98765 43212', assignedAreaId: 'area_3', commissionType: 'PERCENTAGE', commissionRate: 12 },
    { id: 'a_4', name: 'Deepak Sharma', phone: '+91 98765 43213', assignedAreaId: 'area_4', commissionType: 'FIXED_MONTHLY', commissionRate: 6000 },
    { id: 'a_5', name: 'Vikram Rao', phone: '+91 98765 43214', assignedAreaId: 'area_5', commissionType: 'PER_PAPER', commissionRate: 0.7 },
  ];

  const subscriptions: Subscription[] = [];
  flats.forEach((f, idx) => {
    // 1st paper (everyone gets at least one paper)
    const primaryPaperIdx = idx % papers.length;
    subscriptions.push({
      id: `sub_${f.id}_1`,
      flatId: f.id,
      paperId: papers[primaryPaperIdx].id,
      active: true,
      status: 'ACTIVE',
    });

    // 40% of flats have a second paper (e.g. business paper)
    if (idx % 5 < 2) {
      const secondaryPaperIdx = (primaryPaperIdx + 2) % papers.length;
      subscriptions.push({
        id: `sub_${f.id}_2`,
        flatId: f.id,
        paperId: papers[secondaryPaperIdx].id,
        active: true,
        // A handful of paused second subscriptions so the pause/resume state is visible in the demo
        status: idx % 25 === 0 ? 'PAUSED' : 'ACTIVE',
      });
    }
  });

  // Let's pre-generate Delivery Logs for June 2026 (30 days) and July 1 to 9, 2026 (9 days)
  const deliveryLogs: DeliveryLog[] = [];

  // To avoid performance lagging during generation but still give massive stress-test logs,
  // let's create a solid seed of logs.
  // We want at least 500+ records explicitly requested, let's create a robust set.
  // Let's generate for June (30 days) and July (10 days).
  // Flats = 160. Subscriptions = ~220.
  // 40 days * 220 = ~8,800 records! This is perfect and runs super fast in JS.
  const dateRanges: string[] = [];
  // June 2026
  for (let d = 1; d <= 30; d++) {
    const dayStr = d < 10 ? `0${d}` : `${d}`;
    dateRanges.push(`2026-06-${dayStr}`);
  }
  // July 2026 (1 to 9)
  for (let d = 1; d <= 9; d++) {
    const dayStr = d < 10 ? `0${d}` : `${d}`;
    dateRanges.push(`2026-07-${dayStr}`);
  }

  let logCounter = 1;
  subscriptions.forEach((sub) => {
    const skipSeed = (parseInt(sub.flatId.split('_')[1]) + parseInt(sub.paperId.split('_')[1])) % 10;

    dateRanges.forEach((date) => {
      // Skips occur on certain dates based on the seed to make it realistic
      // Let's say skip is true if date-based math matches skipSeed (e.g. 10% skips)
      const day = parseInt(date.split('-')[2]);
      const isSkip = (day % 15 === skipSeed);

      deliveryLogs.push({
        id: `log_${logCounter++}`,
        flatId: sub.flatId,
        paperId: sub.paperId,
        date,
        status: isSkip ? 'SKIPPED' : 'DELIVERED',
      });
    });
  });

  // A spread of partial payments so the PARTIAL state and the aging report have real data
  const paymentRecords: Record<string, PaymentRecord[]> = {};
  flats.forEach((flat, idx) => {
    if (idx % 7 !== 0) return;
    const key = getPaymentOverrideKey(flat.id, 6, 2026);
    paymentRecords[key] = [
      { id: `pay_${flat.id}_1`, amount: 100, date: '2026-07-05', note: 'Part payment - cash' }
    ];
  });

  const expenses: Expense[] = [
    { id: 'exp_1', category: 'PAPER_PURCHASE', description: 'June stock - wholesale vendor', amount: 18400, date: '2026-06-02' },
    { id: 'exp_2', category: 'AGENT_WAGES', description: 'June wages - Suresh Kumar', amount: 6500, date: '2026-06-30', agentId: 'a_1' },
    { id: 'exp_3', category: 'AGENT_WAGES', description: 'June wages - Ramesh Patel', amount: 6200, date: '2026-06-30', agentId: 'a_2' },
    { id: 'exp_4', category: 'FUEL', description: 'Scooter petrol - June', amount: 2100, date: '2026-06-28' },
    { id: 'exp_5', category: 'MAINTENANCE', description: 'Cycle repair + carrier', amount: 850, date: '2026-06-18' },
    { id: 'exp_6', category: 'PAPER_PURCHASE', description: 'July stock - wholesale vendor', amount: 19200, date: '2026-07-02' },
    { id: 'exp_7', category: 'FUEL', description: 'Scooter petrol - July', amount: 1950, date: '2026-07-08' },
  ];

  return {
    areas,
    buildings,
    wings,
    flats,
    papers,
    subscriptions,
    agents,
    deliveryLogs,
    paymentOverrides: {},
    paymentRecords,
    agentPayouts: {},
    expenses,
  };
}

// Delivery logs are looked up per flat/paper/day inside calculateBill's nested loops.
// A linear .find() over thousands of records there gets called repeatedly (once per
// day, per paper, per flat, per rendered month) and dominates render time. Index them
// into a Map keyed by "flatId|paperId|date" for O(1) lookups. The index is cached in a
// WeakMap keyed by the deliveryLogs array reference, so it's only rebuilt when the logs
// actually change (e.g. after a delivery status edit), not on every calculateBill call.
const deliveryLogIndexCache = new WeakMap<DeliveryLog[], Map<string, DeliveryLog>>();

export function getDeliveryLogIndex(deliveryLogs: DeliveryLog[]): Map<string, DeliveryLog> {
  let index = deliveryLogIndexCache.get(deliveryLogs);
  if (!index) {
    index = new Map();
    for (const log of deliveryLogs) {
      index.set(`${log.flatId}|${log.paperId}|${log.date}`, log);
    }
    deliveryLogIndexCache.set(deliveryLogs, index);
  }
  return index;
}

// Same WeakMap-cached trick for subscriptions: calculateBill runs once per flat (and six
// times over for the dashboard trend), and a .filter() per call makes that
// O(flats x subscriptions). Indexing by flatId makes each lookup O(1).
const subscriptionIndexCache = new WeakMap<Subscription[], Map<string, Subscription[]>>();

export function getSubscriptionsByFlatIndex(subscriptions: Subscription[]): Map<string, Subscription[]> {
  let index = subscriptionIndexCache.get(subscriptions);
  if (!index) {
    index = new Map();
    for (const sub of subscriptions) {
      const list = index.get(sub.flatId);
      if (list) list.push(sub);
      else index.set(sub.flatId, [sub]);
    }
    subscriptionIndexCache.set(subscriptions, index);
  }
  return index;
}

export function isSubscriptionDeliverable(sub: Subscription): boolean {
  return sub.active && sub.status !== 'PAUSED';
}

// Resolves the rate that applied on a given date. History is kept sorted ascending, so the
// last entry whose effectiveFrom is on or before the date wins.
export function resolvePaperRate(paper: Paper, dateStr: string): number {
  const history = paper.rateHistory;
  if (!history || history.length === 0) return paper.ratePerDay;

  let rate = history[0].rate;
  for (const entry of history) {
    if (entry.effectiveFrom > dateStr) break;
    rate = entry.rate;
  }
  return rate;
}

export interface PaymentInfo {
  amountPaid: number;
  balanceDue: number;
  status: PaymentStatus;
  paid: boolean;
}

// Single source of truth for "has this bill been settled": a manual override wins, otherwise
// recorded payments decide, and with neither we fall back to the seeded demo status so sample
// data still shows a realistic paid/unpaid mix.
export function resolvePaymentInfo(
  flatId: string,
  month: number,
  year: number,
  netAmount: number,
  state: DatabaseState,
  fallbackPaid: boolean
): PaymentInfo {
  const key = getPaymentOverrideKey(flatId, month, year);
  const override = state.paymentOverrides[key];
  const records = state.paymentRecords[key] || [];
  const amountPaid = records.reduce((sum, r) => sum + r.amount, 0);

  let status: PaymentStatus;
  if (override === 'PAID') status = 'PAID';
  else if (override === 'UNPAID') status = 'UNPAID';
  else if (amountPaid > 0) status = amountPaid >= netAmount ? 'PAID' : 'PARTIAL';
  else status = fallbackPaid ? 'PAID' : 'UNPAID';

  return {
    amountPaid,
    balanceDue: status === 'PAID' ? 0 : Math.max(0, netAmount - amountPaid),
    status,
    paid: status === 'PAID'
  };
}

// How much money actually came in for a bill - a fully settled bill counts in full, a partial
// one counts only what was recorded.
export function collectedAmountFor(bill: BillingSummary): number {
  return bill.status === 'PAID' ? bill.netAmount : bill.amountPaid;
}

export function calculateBill(
  flat: Flat,
  month: number,
  year: number,
  state: DatabaseState
): BillingSummary {
  const { papers, subscriptions, deliveryLogs, wings, buildings, areas } = state;
  const logIndex = getDeliveryLogIndex(deliveryLogs);
  const subIndex = getSubscriptionsByFlatIndex(subscriptions);

  // Find geographic hierarchy path
  const wing = wings.find((w) => w.id === flat.wingId);
  const building = wing ? buildings.find((b) => b.id === wing.buildingId) : null;
  const area = building ? areas.find((a) => a.id === building.areaId) : null;
  const locationPath = `${area?.name || ''} ➔ ${building?.name || ''} ➔ ${wing?.name || ''} ➔ Flat ${flat.flatNumber}`;

  // Find subscribed papers for this flat (paused ones keep their history but don't bill)
  const flatSubs = (subIndex.get(flat.id) || []).filter(isSubscriptionDeliverable);

  // Get date range for target month
  const daysInMonth = new Date(year, month, 0).getDate();
  const monthStr = month < 10 ? `0${month}` : `${month}`;

  let grossAmount = 0;
  let skipDeductions = 0;

  const subscribedPapersBreakdown = flatSubs.map((sub) => {
    const paper = papers.find(p => p.id === sub.paperId);
    if (!paper) return null;

    let deliveredCount = 0;
    let skippedCount = 0;
    let deliveredCost = 0;
    let skippedCost = 0;
    // Representative rate shown on the invoice line - the rate in effect at the end of the
    // billed period (mid-month revisions still bill correctly day by day below).
    let displayRate = resolvePaperRate(paper, `${year}-${monthStr}-01`);

    for (let day = 1; day <= daysInMonth; day++) {
      const dayStr = day < 10 ? `0${day}` : `${day}`;
      const dateStr = `${year}-${monthStr}-${dayStr}`;

      // Date range check for granular subscription
      if (sub.fromDate && dateStr < sub.fromDate) continue;
      if (sub.toDate && dateStr > sub.toDate) continue;

      const rate = resolvePaperRate(paper, dateStr);
      displayRate = rate;

      const log = logIndex.get(`${flat.id}|${paper.id}|${dateStr}`);

      // Default to delivered if no log is found (assuming default daily delivery)
      if (log && log.status === 'SKIPPED') {
        skippedCount++;
        skippedCost += rate;
      } else {
        deliveredCount++;
        deliveredCost += rate;
      }
    }

    grossAmount += deliveredCost + skippedCost;
    skipDeductions += skippedCost;

    return {
      paperName: paper.name,
      rate: displayRate,
      deliveredDays: deliveredCount,
      skippedDays: skippedCount,
      cost: deliveredCost,
    };
  }).filter((p): p is NonNullable<typeof p> => p !== null);

  const totalDelivered = subscribedPapersBreakdown.reduce((acc, p) => acc + p.deliveredDays, 0);
  const totalSkipped = subscribedPapersBreakdown.reduce((acc, p) => acc + p.skippedDays, 0);
  const netAmount = grossAmount - skipDeductions;

  // Seeded demo fallback: even flat IDs settle, odd ones lag, so sample data isn't uniformly
  // unpaid before any real payment has been recorded against it.
  const flatSeed = parseInt(flat.id.split('_')[1] || '0');
  const fallbackPaid = (flatSeed + month) % 3 !== 0;
  const payment = resolvePaymentInfo(flat.id, month, year, netAmount, state, fallbackPaid);

  return {
    flatId: flat.id,
    customerName: flat.customerName,
    phoneNumber: flat.phoneNumber,
    flatNumber: flat.flatNumber,
    locationPath,
    month,
    year,
    subscribedPapers: subscribedPapersBreakdown,
    totalDelivered,
    totalSkipped,
    grossAmount,
    skipDeductions,
    netAmount,
    amountPaid: payment.amountPaid,
    balanceDue: payment.balanceDue,
    status: payment.status,
    paid: payment.paid,
  };
}

export function getFlatsInArea(areaId: string, state: DatabaseState): Flat[] {
  const buildingIds = new Set(state.buildings.filter(b => b.areaId === areaId).map(b => b.id));
  const wingIds = new Set(state.wings.filter(w => buildingIds.has(w.buildingId)).map(w => w.id));
  return state.flats.filter(f => wingIds.has(f.wingId));
}

export const DEFAULT_COMMISSION_TYPE: CommissionType = 'PER_PAPER';

// Commission owed to an agent for one month, derived from what actually got delivered in their
// assigned area (and, for percentage deals, what was actually collected there).
export function computeAgentPayout(
  agent: DeliveryAgent,
  month: number,
  year: number,
  state: DatabaseState
): AgentPayout {
  const areaFlats = getFlatsInArea(agent.assignedAreaId, state);
  const areaName = state.areas.find(a => a.id === agent.assignedAreaId)?.name || 'Unassigned';

  let papersDelivered = 0;
  let areaCollected = 0;

  areaFlats.forEach((flat) => {
    const bill = calculateBill(flat, month, year, state);
    papersDelivered += bill.totalDelivered;
    areaCollected += collectedAmountFor(bill);
  });

  const commissionType = agent.commissionType || DEFAULT_COMMISSION_TYPE;
  const commissionRate = agent.commissionRate ?? 0;

  let commissionAmount = 0;
  if (commissionType === 'PER_PAPER') commissionAmount = papersDelivered * commissionRate;
  else if (commissionType === 'PERCENTAGE') commissionAmount = (areaCollected * commissionRate) / 100;
  else commissionAmount = commissionRate;

  return {
    agentId: agent.id,
    agentName: agent.name,
    phone: agent.phone,
    areaName,
    month,
    year,
    commissionType,
    commissionRate,
    papersDelivered,
    stops: areaFlats.length,
    areaCollected,
    commissionAmount,
    paid: state.agentPayouts[getAgentPayoutKey(agent.id, month, year)] === 'PAID',
  };
}

export function getExpensesForMonth(state: DatabaseState, month: number, year: number): Expense[] {
  const monthStr = month < 10 ? `0${month}` : `${month}`;
  const prefix = `${year}-${monthStr}`;
  return state.expenses.filter(e => e.date.startsWith(prefix));
}

export function sumExpenses(expenses: Expense[]): number {
  return expenses.reduce((sum, e) => sum + e.amount, 0);
}

// Steps one month back/forward, rolling the year over at the edges.
export function shiftMonth(month: number, year: number, delta: number): { month: number; year: number } {
  const zeroBased = month - 1 + delta;
  return {
    month: ((zeroBased % 12) + 12) % 12 + 1,
    year: year + Math.floor(zeroBased / 12)
  };
}

export type AgingBucket = 'CURRENT' | 'DUE_30' | 'DUE_60' | 'DUE_90_PLUS';

export const AGING_LABEL: Record<AgingBucket, string> = {
  CURRENT: 'Current',
  DUE_30: '30+ days',
  DUE_60: '60+ days',
  DUE_90_PLUS: '90+ days'
};

// How long a customer has been carrying a balance: walks backwards from the selected period
// while each prior month also has an outstanding balance.
export function resolveAgingBucket(
  flat: Flat,
  month: number,
  year: number,
  state: DatabaseState
): AgingBucket {
  let consecutiveUnpaid = 0;

  for (let i = 0; i < 4; i++) {
    const period = shiftMonth(month, year, -i);
    const bill = calculateBill(flat, period.month, period.year, state);
    if (bill.balanceDue <= 0) break;
    consecutiveUnpaid++;
  }

  if (consecutiveUnpaid >= 4) return 'DUE_90_PLUS';
  if (consecutiveUnpaid === 3) return 'DUE_60';
  if (consecutiveUnpaid === 2) return 'DUE_30';
  return 'CURRENT';
}
