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

export interface Paper {
  id: string;
  name: string;
  ratePerDay: number; // ₹ per day
}

export interface Subscription {
  id: string;
  flatId: string;
  paperId: string;
  active: boolean;
  fromDate?: string;
  toDate?: string;
}

export interface DeliveryAgent {
  id: string;
  name: string;
  phone: string;
  assignedAreaId: string;
}

export interface DeliveryLog {
  id: string;
  flatId: string;
  paperId: string;
  date: string; // YYYY-MM-DD
  status: 'DELIVERED' | 'SKIPPED';
}

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
  paid: boolean;
}
