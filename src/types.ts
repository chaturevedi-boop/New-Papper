export interface Area {
  id: string;
  name: string;
}

export interface Building {
  id: string;
  areaId: string;
  name: string;
}

export interface Wing {
  id: string;
  buildingId: string;
  name: string;
}

export interface Flat {
  id: string;
  wingId: string;
  flatNumber: string;
  customerName: string;
  phoneNumber: string;
  activeYear: number; // e.g. 2026
  ledgerType?: 'SUBSCRIPTION' | 'BILLING';
  fromDate?: string;
  toDate?: string;
}

export interface RateHistoryEntry {
  rate: number; // ₹ per day
  effectiveFrom: string; // YYYY-MM-DD - applies to this date onwards
}

export interface Paper {
  id: string;
  name: string;
  ratePerDay: number; // ₹ per day - mirrors the latest rateHistory entry, for display/new subs
  // Sorted ascending by effectiveFrom. Bills resolve the rate that applied on each delivered
  // day, so raising a price today never rewrites already-issued invoices.
  rateHistory: RateHistoryEntry[];
}

export interface Subscription {
  id: string;
  flatId: string;
  paperId: string;
  active: boolean;
  status?: 'ACTIVE' | 'PAUSED'; // missing = ACTIVE; PAUSED keeps history without delivering/billing
  fromDate?: string;
  toDate?: string;
}

export type CommissionType = 'PER_PAPER' | 'PERCENTAGE' | 'FIXED_MONTHLY';

export interface DeliveryAgent {
  id: string;
  name: string;
  phone: string;
  assignedAreaId: string;
  commissionType?: CommissionType;
  commissionRate?: number; // ₹/paper, % of collections, or ₹/month depending on commissionType
}

export interface DeliveryLog {
  id: string;
  flatId: string;
  paperId: string;
  date: string; // YYYY-MM-DD
  status: 'DELIVERED' | 'SKIPPED';
}

export interface PaymentRecord {
  id: string;
  amount: number;
  date: string; // YYYY-MM-DD
  note?: string;
}

export type ExpenseCategory = 'AGENT_WAGES' | 'PAPER_PURCHASE' | 'FUEL' | 'MAINTENANCE' | 'OTHER';

export interface Expense {
  id: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  date: string; // YYYY-MM-DD
  agentId?: string;
}

export type PaymentStatus = 'PAID' | 'PARTIAL' | 'UNPAID';

export interface BillingSummary {
  flatId: string;
  customerName: string;
  phoneNumber: string; // Map this from Flat
  flatNumber: string;
  locationPath: string; // Area > Building > Wing > Flat
  month: number; // 1-12
  year: number; // 2026
  subscribedPapers: {
    paperName: string;
    rate: number;
    deliveredDays: number;
    skippedDays: number;
    cost: number;
  }[];
  totalDelivered: number;
  totalSkipped: number;
  grossAmount: number;
  skipDeductions: number;
  netAmount: number;
  amountPaid: number;
  balanceDue: number;
  status: PaymentStatus;
  paid: boolean; // === status === 'PAID'
}

export interface AgentPayout {
  agentId: string;
  agentName: string;
  phone: string;
  areaName: string;
  month: number;
  year: number;
  commissionType: CommissionType;
  commissionRate: number;
  papersDelivered: number;
  stops: number;
  areaCollected: number; // collections in this agent's area for the period
  commissionAmount: number;
  paid: boolean;
}
