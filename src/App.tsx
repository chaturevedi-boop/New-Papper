import { useState, useEffect, useRef, type ChangeEvent } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { Area, Building, Wing, Flat, Paper, DeliveryAgent, BillingSummary, Expense, PaymentRecord } from './types';
import {
  generateInitialData,
  normalizeDatabaseState,
  EMPTY_DATABASE,
  DatabaseState,
  calculateBill,
  getPaymentOverrideKey,
  getAgentPayoutKey
} from './data/dummyGenerator';
import { applyCustomerImport, type ImportRow } from './utils/csvImport';
import { useTheme } from './hooks/useTheme';
import { useTrialLicense } from './hooks/useTrialLicense';
import { shareOrDownloadFile } from './utils/shareFile';
import { runAutoBackup } from './utils/autoBackup';
import { completeAuth, hasPendingAuth, NATIVE_REDIRECT_URI } from './utils/googleDrive';
import { DashboardStats } from './components/DashboardStats';
import { DeliveryList } from './components/DeliveryList';
import { BillingEngine } from './components/BillingEngine';
import { ReportsTab } from './components/ReportsTab';
import { DataMasters } from './components/DataMasters';
import { HelpTab } from './components/HelpTab';
import { InvoiceModal } from './components/InvoiceModal';
import { FeedbackModal } from './components/FeedbackModal';
import { LicenseModal } from './components/LicenseModal';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { DriveBackupModal } from './components/DriveBackupModal';
import { BottomNav, type TabType } from './components/BottomNav';
import { SideNav } from './components/SideNav';
import { Newspaper, Calendar, ChevronLeft, ChevronRight, MoreVertical, Search } from 'lucide-react';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const YEAR_OPTIONS = [2024, 2025, 2026, 2027, 2028];

export default function App() {
  const [db, setDb] = useState<DatabaseState>(() => {
    const saved = localStorage.getItem('newspaper_billing_state');
    if (saved) {
      try {
        return normalizeDatabaseState(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse database state from local storage, generating new data', e);
      }
    }
    return generateInitialData();
  });

  // Billing filter month/year
  const [selectedMonth, setSelectedMonth] = useState<number>(6); // Default to June
  const [selectedYear, setSelectedYear] = useState<number>(2026); // Default to 2026
  const [activeTab, setActiveTab] = useState<TabType>('drops');
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [themePreference, setThemePreference] = useTheme();
  const backupFileInputRef = useRef<HTMLInputElement>(null);

  // 15-day free trial: after it expires (and the app isn't unlocked with a code),
  // every data-mutating action is blocked in favor of showing the license modal -
  // viewing, invoices, sharing, and backups keep working regardless.
  const { daysRemaining, isExpired, license, unlock } = useTrialLicense();
  const [showLicenseModal, setShowLicenseModal] = useState(false);

  // Wraps a mutating handler so it's replaced with the license prompt once the trial
  // expires. Returns whether the action actually ran, so callers that show a "Success"
  // toast (e.g. DataMasters) can skip it when the write was blocked instead of faking it.
  function guard<T extends (...args: any[]) => void>(fn: T): (...args: Parameters<T>) => boolean {
    return (...args: Parameters<T>) => {
      if (isExpired) {
        setShowLicenseModal(true);
        return false;
      }
      fn(...args);
      return true;
    };
  }

  // Step the accounting cycle back/forward one month, rolling the year over at the edges
  const handlePrevMonth = () => {
    setSelectedMonth(prev => {
      if (prev === 1) {
        setSelectedYear(y => y - 1);
        return 12;
      }
      return prev - 1;
    });
  };

  const handleNextMonth = () => {
    setSelectedMonth(prev => {
      if (prev === 12) {
        setSelectedYear(y => y + 1);
        return 1;
      }
      return prev + 1;
    });
  };

  const cycleThemePreference = () => {
    setThemePreference(themePreference === 'light' ? 'dark' : themePreference === 'dark' ? 'system' : 'light');
  };

  // Instant tab switching - no artificial delay. A subtle fade-in on the content
  // itself (see `animate-fade-in` below) is enough transition polish without
  // blocking the user with a spinner on every single tap.
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
  };

  // Modal displays
  const [selectedInvoice, setSelectedInvoice] = useState<BillingSummary | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [showDriveModal, setShowDriveModal] = useState(false);
  const [driveConnectVersion, setDriveConnectVersion] = useState(0);

  // Global search jumps to a flat on the Drops tab - this is what it hands off, and
  // DeliveryList clears it once it's resolved the target's area/building filters.
  const [pendingFocusFlatId, setPendingFocusFlatId] = useState<string | null>(null);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('newspaper_billing_state', JSON.stringify(db));
  }, [db]);

  // Local auto-backup: on native, mirror a debounced snapshot into the device's Documents
  // folder after data settles, independent of the manual "Download Backup" action. Web has
  // no equivalent public folder, so this is a no-op there (see utils/autoBackup.ts).
  const autoBackupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [backupTick, setBackupTick] = useState(0);
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    if (autoBackupTimer.current) clearTimeout(autoBackupTimer.current);
    autoBackupTimer.current = setTimeout(() => {
      runAutoBackup(JSON.stringify(db)).then(() => setBackupTick(t => t + 1));
    }, 4000);
    return () => { if (autoBackupTimer.current) clearTimeout(autoBackupTimer.current); };
  }, [db]);

  // Google Drive OAuth completion: native returns via the custom-scheme deep link registered
  // in AndroidManifest.xml; web returns as a normal redirect back to this same page with a
  // ?code= query param.
  useEffect(() => {
    let removeListener: (() => void) | undefined;

    if (Capacitor.isNativePlatform()) {
      CapacitorApp.addListener('appUrlOpen', ({ url }) => {
        if (!url.startsWith(NATIVE_REDIRECT_URI)) return;
        completeAuth(url)
          .then(() => setDriveConnectVersion(v => v + 1))
          .catch((err) => console.error('Google Drive auth failed', err));
      }).then(handle => { removeListener = () => handle.remove(); });
    } else if (hasPendingAuth() && window.location.search.includes('code=')) {
      completeAuth(window.location.href)
        .then(() => setDriveConnectVersion(v => v + 1))
        .catch((err) => console.error('Google Drive auth failed', err))
        .finally(() => {
          window.history.replaceState({}, '', `${window.location.origin}${window.location.pathname}`);
        });
    }

    return () => removeListener?.();
  }, []);

  // Reset database state with clean dummy seed
  const handleResetDatabase = () => {
    if (window.confirm('Are you sure you want to restore the default database state? This will load over 500+ realistic interconnected log records across Area, Building, Wing, Flat, Subscription, and Daily Drop logs for testing.')) {
      setDb(generateInitialData());
      setSelectedMonth(6);
      setSelectedYear(2026);
    }
  };

  // Permanently wipe all data down to a genuinely empty state (not the demo seed)
  const handleEraseAllData = () => {
    if (window.confirm('Erase ALL data? This permanently deletes every Area, Building, Wing, Flat, Paper, Agent, and delivery log - there is no undo. Consider using "Download Backup" first if you want to keep a copy.')) {
      setDb({ ...EMPTY_DATABASE });
    }
  };

  // Share or download the entire current database state as a JSON backup file
  const handleExportBackup = async () => {
    const filename = `daily-news-service-backup-${new Date().toISOString().slice(0, 10)}.json`;
    const result = await shareOrDownloadFile(JSON.stringify(db, null, 2), filename, 'application/json', 'PaperTrack Backup');
    if (result === 'failed') {
      window.alert('Could not export the backup file on this device.');
    }
  };

  const handleImportBackupClick = () => {
    backupFileInputRef.current?.click();
  };

  // Shared by the file-picker restore and the Google Drive restore
  const restoreFromJson = (jsonText: string): boolean => {
    try {
      const parsed = JSON.parse(jsonText);
      const requiredKeys: (keyof DatabaseState)[] = ['areas', 'buildings', 'wings', 'flats', 'papers', 'subscriptions', 'agents', 'deliveryLogs'];
      const isValid = requiredKeys.every(key => Array.isArray(parsed[key]));
      if (!isValid) {
        window.alert('This file does not look like a valid PaperTrack backup.');
        return false;
      }
      setDb(normalizeDatabaseState(parsed));
      return true;
    } catch {
      window.alert('Failed to read backup file: it is not valid JSON.');
      return false;
    }
  };

  // Restore database state from a previously exported backup JSON file
  const handleImportBackupFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file later
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      try {
        JSON.parse(text); // just to give the "not valid JSON" message from a consistent place
      } catch {
        window.alert('Failed to read backup file: it is not valid JSON.');
        return;
      }
      if (window.confirm('Restoring this backup will replace all current data. Continue?')) {
        restoreFromJson(text);
      }
    };
    reader.readAsText(file);
  };

  // Drive restore already confirms inside DriveBackupModal before calling this
  const handleRestoreFromDrive = (jsonText: string) => {
    restoreFromJson(jsonText);
  };

  // Update Delivery Log state (delivered / skipped toggle)
  const handleUpdateDeliveryStatus = (flatId: string, paperId: string, date: string, status: 'DELIVERED' | 'SKIPPED') => {
    setDb((prev) => {
      // Find and replace log or append new one
      const logs = [...prev.deliveryLogs];
      const existingIdx = logs.findIndex(
        l => l.flatId === flatId && l.paperId === paperId && l.date === date
      );

      if (existingIdx >= 0) {
        logs[existingIdx] = { ...logs[existingIdx], status };
      } else {
        logs.push({
          id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          flatId,
          paperId,
          date,
          status
        });
      }

      return { ...prev, deliveryLogs: logs };
    });
  };

  // Bulk-apply a delivery status across a date range for one flat's papers ("vacation mode")
  const handleBulkUpdateDeliveryStatus = (flatId: string, paperIds: string[], fromDate: string, toDate: string, status: 'DELIVERED' | 'SKIPPED') => {
    setDb((prev) => {
      const logs = [...prev.deliveryLogs];

      // Walk the range in UTC millis (not local Date/toISOString) so the date strings
      // never shift by a day in timezones ahead of UTC (e.g. IST) or behind it.
      const [fy, fm, fd] = fromDate.split('-').map(Number);
      const [ty, tm, td] = toDate.split('-').map(Number);
      const startUtc = Date.UTC(fy, fm - 1, fd);
      const endUtc = Date.UTC(ty, tm - 1, td);

      paperIds.forEach((paperId) => {
        for (let t = startUtc; t <= endUtc; t += 86400000) {
          const date = new Date(t).toISOString().slice(0, 10);
          const existingIdx = logs.findIndex(l => l.flatId === flatId && l.paperId === paperId && l.date === date);
          if (existingIdx >= 0) {
            logs[existingIdx] = { ...logs[existingIdx], status };
          } else {
            logs.push({
              id: `log_${Date.now()}_${paperId}_${date}_${Math.random().toString(36).substr(2, 5)}`,
              flatId,
              paperId,
              date,
              status
            });
          }
        }
      });

      return { ...prev, deliveryLogs: logs };
    });
  };

  // --- Master Data Actions (CRUD) with Relational Integrity ---
  const handleAddArea = (area: Area) => {
    setDb(prev => ({ ...prev, areas: [...prev.areas, area] }));
  };

  const handleUpdateArea = (id: string, updates: Partial<Area>) => {
    setDb(prev => ({ ...prev, areas: prev.areas.map(a => a.id === id ? { ...a, ...updates } : a) }));
  };

  const handleAddBuilding = (building: Building) => {
    setDb(prev => ({ ...prev, buildings: [...prev.buildings, building] }));
  };

  const handleUpdateBuilding = (id: string, updates: Partial<Building>) => {
    setDb(prev => ({ ...prev, buildings: prev.buildings.map(b => b.id === id ? { ...b, ...updates } : b) }));
  };

  const handleAddWing = (wing: Wing) => {
    setDb(prev => ({ ...prev, wings: [...prev.wings, wing] }));
  };

  const handleUpdateWing = (id: string, updates: Partial<Wing>) => {
    setDb(prev => ({ ...prev, wings: prev.wings.map(w => w.id === id ? { ...w, ...updates } : w) }));
  };

  const handleAddFlat = (flat: Flat, configs: { paperId: string, fromDate?: string, toDate?: string }[]) => {
    setDb(prev => {
      // 1. Add Flat
      const flatsList = [...prev.flats, flat];

      // 2. Add subscriptions
      const subs = [...prev.subscriptions];
      configs.forEach((config, idx) => {
        subs.push({
          id: `sub_${flat.id}_${idx + 1}`,
          flatId: flat.id,
          paperId: config.paperId,
          active: true,
          status: 'ACTIVE',
          fromDate: config.fromDate,
          toDate: config.toDate
        });
      });

      return { ...prev, flats: flatsList, subscriptions: subs };
    });
  };

  // Update a flat's own fields and fully replace its paper subscriptions with the given configs
  const handleUpdateFlat = (id: string, updates: Partial<Flat>, configs: { paperId: string, fromDate?: string, toDate?: string }[]) => {
    setDb(prev => {
      const flats = prev.flats.map(f => f.id === id ? { ...f, ...updates } : f);
      const otherSubs = prev.subscriptions.filter(s => s.flatId !== id);
      const newSubs = configs.map((config, idx) => ({
        id: `sub_${id}_${idx + 1}_${Date.now()}`,
        flatId: id,
        paperId: config.paperId,
        active: true,
        status: 'ACTIVE' as const,
        fromDate: config.fromDate,
        toDate: config.toDate
      }));

      return { ...prev, flats, subscriptions: [...otherSubs, ...newSubs] };
    });
  };

  // Bulk-imports customers (and any missing Area/Building/Wing they reference) from a
  // validated CSV, in a single atomic state update.
  const handleImportCustomers = (rows: ImportRow[]) => {
    setDb(prev => applyCustomerImport(rows, prev));
  };

  // Pauses/resumes a subscription without deleting it, so its delivery/billing history is
  // preserved and it can be resumed later exactly where it left off.
  const handleUpdateSubscriptionStatus = (subscriptionId: string, status: 'ACTIVE' | 'PAUSED') => {
    setDb(prev => ({
      ...prev,
      subscriptions: prev.subscriptions.map(s => s.id === subscriptionId ? { ...s, status } : s)
    }));
  };

  const handleAddPaper = (paper: Paper) => {
    setDb(prev => ({ ...prev, papers: [...prev.papers, paper] }));
  };

  // Rate changes don't overwrite the paper's rate in place - they push a new history entry
  // effective from the given date, so bills already issued for earlier dates are unaffected.
  const handleUpdatePaperRate = (id: string, newRate: number, effectiveFrom: string) => {
    setDb(prev => ({
      ...prev,
      papers: prev.papers.map(p => {
        if (p.id !== id) return p;
        const history = [...p.rateHistory.filter(h => h.effectiveFrom !== effectiveFrom), { rate: newRate, effectiveFrom }]
          .sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
        return { ...p, ratePerDay: history[history.length - 1].rate, rateHistory: history };
      })
    }));
  };

  const handleUpdatePaperName = (id: string, name: string) => {
    setDb(prev => ({ ...prev, papers: prev.papers.map(p => p.id === id ? { ...p, name } : p) }));
  };

  const handleAddAgent = (agent: DeliveryAgent) => {
    setDb(prev => ({ ...prev, agents: [...prev.agents, agent] }));
  };

  const handleUpdateAgent = (id: string, updates: Partial<DeliveryAgent>) => {
    setDb(prev => ({ ...prev, agents: prev.agents.map(a => a.id === id ? { ...a, ...updates } : a) }));
  };

  const handleAddExpense = (expense: Expense) => {
    setDb(prev => ({ ...prev, expenses: [...prev.expenses, expense] }));
  };

  const handleUpdateExpense = (id: string, updates: Partial<Expense>) => {
    setDb(prev => ({ ...prev, expenses: prev.expenses.map(e => e.id === id ? { ...e, ...updates } : e) }));
  };

  // Toggle paid status on the fly, persisted inside the database state itself
  const handleTogglePaymentStatus = (flatId: string) => {
    const key = getPaymentOverrideKey(flatId, selectedMonth, selectedYear);

    setDb(prev => {
      const current = prev.paymentOverrides[key];
      let nextStatus: 'PAID' | 'UNPAID';
      if (current === 'PAID') {
        nextStatus = 'UNPAID';
      } else if (current === 'UNPAID') {
        nextStatus = 'PAID';
      } else {
        // No current override: find standard calculated paid status, invert it, store override
        const flatObj = prev.flats.find(f => f.id === flatId);
        const standardBill = flatObj ? calculateBill(flatObj, selectedMonth, selectedYear, prev) : null;
        nextStatus = standardBill?.paid ? 'UNPAID' : 'PAID';
      }

      return {
        ...prev,
        paymentOverrides: { ...prev.paymentOverrides, [key]: nextStatus }
      };
    });
  };

  // Records an actual amount received against a bill. A manual PAID/UNPAID override (set via
  // handleTogglePaymentStatus) takes precedence in resolvePaymentInfo, so clear any override
  // here - once real money is on record, the computed status should drive the bill again.
  const handleRecordPayment = (flatId: string, amount: number, date: string, note?: string) => {
    const key = getPaymentOverrideKey(flatId, selectedMonth, selectedYear);
    const record: PaymentRecord = { id: `pay_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, amount, date, note };

    setDb(prev => {
      const { [key]: _removedOverride, ...restOverrides } = prev.paymentOverrides;
      return {
        ...prev,
        paymentOverrides: restOverrides,
        paymentRecords: { ...prev.paymentRecords, [key]: [...(prev.paymentRecords[key] || []), record] }
      };
    });
  };

  const handleToggleAgentPayoutStatus = (agentId: string) => {
    const key = getAgentPayoutKey(agentId, selectedMonth, selectedYear);
    setDb(prev => ({
      ...prev,
      agentPayouts: { ...prev.agentPayouts, [key]: prev.agentPayouts[key] === 'PAID' ? 'UNPAID' : 'PAID' }
    }));
  };

  // Cascade Deletes representing Room Foreign Key constraints on cascade deletes!
  const handleDeleteRecord = (category: 'area' | 'building' | 'wing' | 'flat' | 'paper' | 'agent' | 'expense', id: string) => {
    if (!window.confirm(`Are you sure you want to delete this ${category}? This operation represents Room's SQLite CASCADE delete constraint and will irreversibly delete all downstream relational child rows.`)) {
      return;
    }

    setDb(prev => {
      let { areas, buildings, wings, flats, papers, subscriptions, deliveryLogs, agents, expenses } = prev;

      if (category === 'area') {
        areas = areas.filter(a => a.id !== id);

        // Find buildings belonging to this area
        const deletedBlds = buildings.filter(b => b.areaId === id);
        const deletedBldIds = deletedBlds.map(b => b.id);
        buildings = buildings.filter(b => b.areaId !== id);

        // Find wings in deleted buildings
        const deletedWings = wings.filter(w => deletedBldIds.includes(w.buildingId));
        const deletedWingIds = deletedWings.map(w => w.id);
        wings = wings.filter(w => !deletedBldIds.includes(w.buildingId));

        // Find flats in deleted wings
        const deletedFlats = flats.filter(f => deletedWingIds.includes(f.wingId));
        const deletedFlatIds = deletedFlats.map(f => f.id);
        flats = flats.filter(f => !deletedWingIds.includes(f.wingId));

        // Clean subscriptions and logs
        subscriptions = subscriptions.filter(s => !deletedFlatIds.includes(s.flatId));
        deliveryLogs = deliveryLogs.filter(l => !deletedFlatIds.includes(l.flatId));

        // Set agents assigned area to empty or filter them
        agents = agents.map(a => a.assignedAreaId === id ? { ...a, assignedAreaId: '' } : a);
      }

      else if (category === 'building') {
        buildings = buildings.filter(b => b.id !== id);

        // Find wings
        const deletedWings = wings.filter(w => w.buildingId === id);
        const deletedWingIds = deletedWings.map(w => w.id);
        wings = wings.filter(w => w.buildingId !== id);

        // Find flats
        const deletedFlats = flats.filter(f => deletedWingIds.includes(f.wingId));
        const deletedFlatIds = deletedFlats.map(f => f.id);
        flats = flats.filter(f => !deletedWingIds.includes(f.wingId));

        // Clean subscriptions and logs
        subscriptions = subscriptions.filter(s => !deletedFlatIds.includes(s.flatId));
        deliveryLogs = deliveryLogs.filter(l => !deletedFlatIds.includes(l.flatId));
      }

      else if (category === 'wing') {
        wings = wings.filter(w => w.id !== id);

        // Find flats
        const deletedFlats = flats.filter(f => f.wingId === id);
        const deletedFlatIds = deletedFlats.map(f => f.id);
        flats = flats.filter(f => f.wingId !== id);

        // Clean subscriptions and logs
        subscriptions = subscriptions.filter(s => !deletedFlatIds.includes(s.flatId));
        deliveryLogs = deliveryLogs.filter(l => !deletedFlatIds.includes(l.flatId));
      }

      else if (category === 'flat') {
        flats = flats.filter(f => f.id !== id);
        subscriptions = subscriptions.filter(s => s.flatId !== id);
        deliveryLogs = deliveryLogs.filter(l => l.flatId !== id);
      }

      else if (category === 'paper') {
        papers = papers.filter(p => p.id !== id);
        subscriptions = subscriptions.filter(s => s.paperId !== id);
        deliveryLogs = deliveryLogs.filter(l => l.paperId !== id);
      }

      else if (category === 'agent') {
        agents = agents.filter(a => a.id !== id);
      }

      else if (category === 'expense') {
        expenses = expenses.filter(e => e.id !== id);
      }

      return {
        ...prev,
        areas,
        buildings,
        wings,
        flats,
        papers,
        subscriptions,
        deliveryLogs,
        agents,
        expenses
      };
    });
  };

  const getAgentForArea = (areaId: string): DeliveryAgent | null => {
    return db.agents.find(a => a.assignedAreaId === areaId) || null;
  };

  // Shared lookup used both when opening an invoice and when rendering the modal's agent details
  const getAgentForFlat = (flatId: string): DeliveryAgent | null => {
    const flatObj = db.flats.find(f => f.id === flatId);
    if (!flatObj) return null;
    const wing = db.wings.find(w => w.id === flatObj.wingId);
    const building = wing ? db.buildings.find(b => b.id === wing.buildingId) : null;
    return building ? getAgentForArea(building.areaId) : null;
  };

  const handleViewInvoice = (summary: BillingSummary) => {
    setSelectedInvoice(summary);
  };

  // Keeps the open invoice modal's figures (status/amountPaid/balanceDue) in sync whenever
  // the underlying db changes - e.g. after toggling paid status or recording a payment while
  // the modal is open, instead of the modal's own stale copy from when it was first opened.
  useEffect(() => {
    if (!selectedInvoice) return;
    const flat = db.flats.find(f => f.id === selectedInvoice.flatId);
    if (!flat) {
      setSelectedInvoice(null);
      return;
    }
    setSelectedInvoice(calculateBill(flat, selectedInvoice.month, selectedInvoice.year, db));
    // Only react to db changes - selectedInvoice itself is only read, never a trigger, to
    // avoid this effect re-running every time it writes selectedInvoice back.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db]);

  // Global search hands off a flat id; DeliveryList resolves and clears it once handled.
  const handleNavigateToFlat = (flatId: string) => {
    setActiveTab('drops');
    setPendingFocusFlatId(flatId);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-200">

      {/* 1. Header: branding + search + single menu trigger for secondary/utility actions.
          Primary navigation lives in the always-visible BottomNav instead. */}
      <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 px-4 sm:px-6 py-3 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white font-extrabold shadow-inner border border-emerald-500">
              <Newspaper size={20} />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-tight uppercase leading-none">PaperTrack</h1>
              <p className="text-[10px] text-slate-400 mt-1 font-medium">Delivery & Billing Suite</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowGlobalSearch(true)}
              className="text-slate-300 hover:text-white p-3 rounded-xl hover:bg-slate-800 transition-colors active:scale-[0.95] cursor-pointer"
              title="Search"
            >
              <Search size={20} />
            </button>
            <button
              onClick={() => setIsNavOpen(true)}
              className="text-slate-300 hover:text-white p-3 rounded-xl hover:bg-slate-800 transition-colors active:scale-[0.95] cursor-pointer"
              title="Menu"
            >
              <MoreVertical size={22} />
            </button>
          </div>
        </div>
      </header>

      <SideNav
        isOpen={isNavOpen}
        onClose={() => setIsNavOpen(false)}
        themePreference={themePreference}
        onCycleTheme={cycleThemePreference}
        onExportBackup={handleExportBackup}
        onImportBackupClick={guard(handleImportBackupClick)}
        onResetDatabase={guard(handleResetDatabase)}
        onEraseAllData={guard(handleEraseAllData)}
        onShowFeedback={() => setShowFeedbackModal(true)}
        onShowDriveBackup={() => setShowDriveModal(true)}
        license={license}
        daysRemaining={daysRemaining}
        onShowLicense={() => setShowLicenseModal(true)}
        backupTick={backupTick}
      />
      <input
        ref={backupFileInputRef}
        type="file"
        accept="application/json"
        onChange={guard(handleImportBackupFile)}
        className="hidden"
      />

      {/* 2. Main Content Frame (bottom padding clears the fixed BottomNav) */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 pb-24">

        {/* Statistics Bar (Hidden in Developer Tab) */}
        {activeTab !== 'help' && (
          <DashboardStats
            state={db}
            month={selectedMonth}
            year={selectedYear}
          />
        )}

        {/* Global Selectors Panel (Hidden in Code Explorer) */}
        {activeTab !== 'help' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-2">
              <Calendar className="text-emerald-500" size={16} />
              <span className="text-xs font-bold text-slate-850 dark:text-slate-200 uppercase tracking-wider">Accounting Cycle Selector:</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevMonth}
                className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors active:scale-[0.95] cursor-pointer"
                title="Previous month"
              >
                <ChevronLeft size={18} />
              </button>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-sm font-bold rounded-xl px-4 py-3 border border-slate-200 dark:border-slate-700 cursor-pointer focus:outline-none"
              >
                {MONTH_NAMES.map((name, idx) => (
                  <option key={name} value={idx + 1}>
                    {name}{selectedYear === 2026 && (idx + 1 === 6 || idx + 1 === 7) ? ' (Logs Seeded)' : ''}
                  </option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-sm font-bold rounded-xl px-4 py-3 border border-slate-200 dark:border-slate-700 cursor-pointer focus:outline-none"
              >
                {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <button
                onClick={handleNextMonth}
                className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors active:scale-[0.95] cursor-pointer"
                title="Next month"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Dynamic Tab Body Render */}
        {/* key={activeTab} remounts this div on every tab switch so animate-fade-in actually
            replays each time, instead of only once on the app's very first render. */}
        <div key={activeTab} className="animate-fade-in">
          {activeTab === 'drops' && (
            <DeliveryList
              state={db}
              onUpdateDeliveryStatus={guard(handleUpdateDeliveryStatus)}
              onBulkUpdateDeliveryStatus={guard(handleBulkUpdateDeliveryStatus)}
              onUpdateSubscriptionStatus={guard(handleUpdateSubscriptionStatus)}
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              pendingFocusFlatId={pendingFocusFlatId}
              onFocusHandled={() => setPendingFocusFlatId(null)}
            />
          )}

          {activeTab === 'billing' && (
            <BillingEngine
              state={db}
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              onViewInvoice={handleViewInvoice}
              onTogglePaymentStatus={guard(handleTogglePaymentStatus)}
              onRecordPayment={guard(handleRecordPayment)}
              onToggleAgentPayoutStatus={guard(handleToggleAgentPayoutStatus)}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsTab state={db} month={selectedMonth} year={selectedYear} />
          )}

          {activeTab === 'masters' && (
            <DataMasters
              state={db}
              onAddArea={guard(handleAddArea)}
              onUpdateArea={guard(handleUpdateArea)}
              onAddBuilding={guard(handleAddBuilding)}
              onUpdateBuilding={guard(handleUpdateBuilding)}
              onAddWing={guard(handleAddWing)}
              onUpdateWing={guard(handleUpdateWing)}
              onAddFlat={guard(handleAddFlat)}
              onUpdateFlat={guard(handleUpdateFlat)}
              onImportCustomers={guard(handleImportCustomers)}
              onAddPaper={guard(handleAddPaper)}
              onUpdatePaperName={guard(handleUpdatePaperName)}
              onUpdatePaperRate={guard(handleUpdatePaperRate)}
              onAddAgent={guard(handleAddAgent)}
              onUpdateAgent={guard(handleUpdateAgent)}
              onAddExpense={guard(handleAddExpense)}
              onUpdateExpense={guard(handleUpdateExpense)}
              onDeleteRecord={guard(handleDeleteRecord)}
            />
          )}

          {activeTab === 'help' && (
            <HelpTab />
          )}
        </div>
      </main>

      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />

      {/* 3. Invoice Detail Overlay Modal */}
      {selectedInvoice && (
        <InvoiceModal
          bill={selectedInvoice}
          agent={getAgentForFlat(selectedInvoice.flatId)}
          onClose={() => setSelectedInvoice(null)}
          onTogglePaymentStatus={guard(handleTogglePaymentStatus)}
          onRecordPayment={guard(handleRecordPayment)}
        />
      )}

      {/* 4. Feedback / Feature Request Modal */}
      {showFeedbackModal && <FeedbackModal onClose={() => setShowFeedbackModal(false)} />}

      {/* 5. Free Trial / License Modal - opened voluntarily from the drawer, or forced
          open automatically whenever a blocked (post-trial) action is attempted */}
      {showLicenseModal && (
        <LicenseModal
          isExpired={isExpired}
          daysRemaining={daysRemaining}
          license={license}
          onUnlock={unlock}
          onClose={() => setShowLicenseModal(false)}
        />
      )}

      {/* 6. Global Search - jump straight to a customer/paper/agent from anywhere */}
      {showGlobalSearch && (
        <GlobalSearchModal
          state={db}
          onClose={() => setShowGlobalSearch(false)}
          onNavigateToFlat={handleNavigateToFlat}
          onNavigateToTab={setActiveTab}
        />
      )}

      {/* 7. Google Drive Backup */}
      {showDriveModal && (
        <DriveBackupModal
          onClose={() => setShowDriveModal(false)}
          getSerializedState={() => JSON.stringify(db)}
          onRestore={handleRestoreFromDrive}
          connectVersion={driveConnectVersion}
        />
      )}
    </div>
  );
}
