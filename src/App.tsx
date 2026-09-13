import { useState, useEffect, useRef, type ChangeEvent } from 'react';
import { Area, Building, Wing, Flat, Paper, DeliveryAgent, BillingSummary } from './types';
import { generateInitialData, DatabaseState, calculateBill, getPaymentOverrideKey } from './data/dummyGenerator';
import { useTheme } from './hooks/useTheme';
import { shareOrDownloadFile } from './utils/shareFile';
import { DashboardStats } from './components/DashboardStats';
import { DeliveryList } from './components/DeliveryList';
import { BillingEngine } from './components/BillingEngine';
import { DataMasters } from './components/DataMasters';
import { ArchitectHub } from './components/ArchitectHub';
import { InvoiceModal } from './components/InvoiceModal';
import {
  Smartphone,
  Database,
  Code,
  Newspaper,
  Calendar,
  RefreshCw,
  FileSpreadsheet,
  Sun,
  Moon,
  Monitor,
  ChevronLeft,
  ChevronRight,
  DownloadCloud,
  UploadCloud
} from 'lucide-react';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const YEAR_OPTIONS = [2024, 2025, 2026, 2027, 2028];

type TabType = 'drops' | 'billing' | 'masters' | 'architect';

export default function App() {
  const [db, setDb] = useState<DatabaseState>(() => {
    const saved = localStorage.getItem('newspaper_billing_state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Backfill for state saved before paymentOverrides was introduced
        return { paymentOverrides: {}, ...parsed };
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
  const [isTabSwitching, setIsTabSwitching] = useState(false);
  const [themePreference, setThemePreference] = useTheme();
  const backupFileInputRef = useRef<HTMLInputElement>(null);

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

  // Handle Tab Switch with simulated "Background Processing" Global Loader
  const handleTabChange = (tab: TabType) => {
    setIsTabSwitching(true);
    // Standardized background thread processing simulation for ALL tabs (Tester Robustness)
    setTimeout(() => {
      setActiveTab(tab);
      setIsTabSwitching(false);
    }, 1000);
  };

  // Modal displays
  const [selectedInvoice, setSelectedInvoice] = useState<BillingSummary | null>(null);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('newspaper_billing_state', JSON.stringify(db));
  }, [db]);

  // Reset database state with clean dummy seed
  const handleResetDatabase = () => {
    if (window.confirm('Are you sure you want to restore the default database state? This will load over 500+ realistic interconnected log records across Area, Building, Wing, Flat, Subscription, and Daily Drop logs for testing.')) {
      setDb(generateInitialData());
      setSelectedMonth(6);
      setSelectedYear(2026);
    }
  };

  // Share or download the entire current database state as a JSON backup file
  const handleExportBackup = async () => {
    const filename = `daily-news-service-backup-${new Date().toISOString().slice(0, 10)}.json`;
    const result = await shareOrDownloadFile(JSON.stringify(db, null, 2), filename, 'application/json', 'Daily News Service Backup');
    if (result === 'failed') {
      window.alert('Could not export the backup file on this device.');
    }
  };

  const handleImportBackupClick = () => {
    backupFileInputRef.current?.click();
  };

  // Restore database state from a previously exported backup JSON file
  const handleImportBackupFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file later
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        const requiredKeys: (keyof DatabaseState)[] = ['areas', 'buildings', 'wings', 'flats', 'papers', 'subscriptions', 'agents', 'deliveryLogs'];
        const isValid = requiredKeys.every(key => Array.isArray(parsed[key]));
        if (!isValid) {
          window.alert('This file does not look like a valid Daily News Service backup.');
          return;
        }
        if (window.confirm('Restoring this backup will replace all current data. Continue?')) {
          setDb({ paymentOverrides: {}, ...parsed });
        }
      } catch (err) {
        window.alert('Failed to read backup file: it is not valid JSON.');
      }
    };
    reader.readAsText(file);
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
        fromDate: config.fromDate,
        toDate: config.toDate
      }));

      return { ...prev, flats, subscriptions: [...otherSubs, ...newSubs] };
    });
  };

  const handleAddPaper = (paper: Paper) => {
    setDb(prev => ({ ...prev, papers: [...prev.papers, paper] }));
  };

  const handleUpdatePaper = (id: string, updates: Partial<Paper>) => {
    setDb(prev => ({ ...prev, papers: prev.papers.map(p => p.id === id ? { ...p, ...updates } : p) }));
  };

  const handleAddAgent = (agent: DeliveryAgent) => {
    setDb(prev => ({ ...prev, agents: [...prev.agents, agent] }));
  };

  const handleUpdateAgent = (id: string, updates: Partial<DeliveryAgent>) => {
    setDb(prev => ({ ...prev, agents: prev.agents.map(a => a.id === id ? { ...a, ...updates } : a) }));
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

    // If modal is active, update active modal view representation
    if (selectedInvoice && selectedInvoice.flatId === flatId) {
      setSelectedInvoice(prev => {
        if (!prev) return null;
        return { ...prev, paid: !prev.paid };
      });
    }
  };

  // Cascade Deletes representing Room Foreign Key constraints on cascade deletes!
  const handleDeleteRecord = (category: 'area' | 'building' | 'wing' | 'flat' | 'paper' | 'agent', id: string) => {
    if (!window.confirm(`Are you sure you want to delete this ${category}? This operation represents Room's SQLite CASCADE delete constraint and will irreversibly delete all downstream relational child rows.`)) {
      return;
    }

    setDb(prev => {
      let { areas, buildings, wings, flats, papers, subscriptions, deliveryLogs, agents } = prev;

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

      return {
        ...prev,
        areas,
        buildings,
        wings,
        flats,
        papers,
        subscriptions,
        deliveryLogs,
        agents
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
    // Get correct payment state from overrides if exists
    const key = getPaymentOverrideKey(summary.flatId, selectedMonth, selectedYear);
    const override = db.paymentOverrides[key];
    let isPaid = summary.paid;
    if (override === 'PAID') isPaid = true;
    if (override === 'UNPAID') isPaid = false;

    setSelectedInvoice({ ...summary, paid: isPaid });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-200">
      
      {/* 1. Header Navigation Bar */}
      <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 px-4 sm:px-6 py-4 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Logo & Platform details */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white font-extrabold shadow-inner border border-emerald-500">
              <Newspaper size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-md font-black tracking-tight uppercase">Daily News Service</h1>
                <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
                  PRO BUILDER
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Newspaper Delivery & Billing Suite • Year 2026</p>
            </div>
          </div>

          {/* Interactive Navigation Pills & Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => handleTabChange('drops')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'drops' 
                  ? 'bg-emerald-600 text-white shadow-sm' 
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Smartphone size={13} />
              <span>📦 Smart Drops</span>
            </button>

            <button
              onClick={() => handleTabChange('billing')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'billing' 
                  ? 'bg-emerald-600 text-white shadow-sm' 
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <FileSpreadsheet size={13} />
              <span>📊 Billing Engine</span>
            </button>

            <button
              onClick={() => handleTabChange('masters')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'masters' 
                  ? 'bg-emerald-600 text-white shadow-sm' 
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Database size={13} />
              <span>⚙️ Master Ledgers</span>
            </button>

            <button
              onClick={() => handleTabChange('architect')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'architect' 
                  ? 'bg-slate-800 text-emerald-400 border border-slate-700 shadow-sm' 
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Code size={13} />
              <span>📱 Android Architect</span>
            </button>

            {/* Theme preference toggle: cycles Light -> Dark -> System */}
            <button
              onClick={cycleThemePreference}
              className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer ml-1"
              title={`Theme: ${themePreference} (click to change)`}
            >
              {themePreference === 'light' ? <Sun size={14} /> : themePreference === 'dark' ? <Moon size={14} /> : <Monitor size={14} />}
            </button>

            {/* Backup / restore full database as JSON */}
            <button
              onClick={handleExportBackup}
              className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              title="Download a JSON backup of all current data"
            >
              <DownloadCloud size={14} />
            </button>
            <button
              onClick={handleImportBackupClick}
              className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              title="Restore data from a JSON backup file"
            >
              <UploadCloud size={14} />
            </button>
            <input
              ref={backupFileInputRef}
              type="file"
              accept="application/json"
              onChange={handleImportBackupFile}
              className="hidden"
            />

            {/* Reset mock database */}
            <button
              onClick={handleResetDatabase}
              className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              title="Reload & Reset 500+ Dummy Logs database"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* 2. Main Content Frame */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        
        {/* Statistics Bar (Hidden in Developer Tab) */}
        {activeTab !== 'architect' && (
          <DashboardStats 
            state={db} 
            month={selectedMonth} 
            year={selectedYear} 
          />
        )}

        {/* Global Selectors Panel (Hidden in Code Explorer) */}
        {activeTab !== 'architect' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-2">
              <Calendar className="text-emerald-500" size={16} />
              <span className="text-xs font-bold text-slate-850 dark:text-slate-200 uppercase tracking-wider">Accounting Cycle Selector:</span>
            </div>
            
            <div className="flex items-center gap-2.5">
              <button
                onClick={handlePrevMonth}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                title="Previous month"
              >
                <ChevronLeft size={14} />
              </button>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl px-3.5 py-2 border border-slate-200 dark:border-slate-700 cursor-pointer focus:outline-none"
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
                className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl px-3.5 py-2 border border-slate-200 dark:border-slate-700 cursor-pointer focus:outline-none"
              >
                {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <button
                onClick={handleNextMonth}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                title="Next month"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Dynamic Tab Body Render */}
        <div className="animate-fade-in">
          {activeTab === 'drops' && (
            <DeliveryList
              state={db}
              onUpdateDeliveryStatus={handleUpdateDeliveryStatus}
              onBulkUpdateDeliveryStatus={handleBulkUpdateDeliveryStatus}
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
            />
          )}

          {activeTab === 'billing' && (
            <BillingEngine 
              state={db}
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              onViewInvoice={handleViewInvoice}
              onTogglePaymentStatus={handleTogglePaymentStatus}
            />
          )}

          {activeTab === 'masters' && (
            <DataMasters
              state={db}
              onAddArea={handleAddArea}
              onUpdateArea={handleUpdateArea}
              onAddBuilding={handleAddBuilding}
              onUpdateBuilding={handleUpdateBuilding}
              onAddWing={handleAddWing}
              onUpdateWing={handleUpdateWing}
              onAddFlat={handleAddFlat}
              onUpdateFlat={handleUpdateFlat}
              onAddPaper={handleAddPaper}
              onUpdatePaper={handleUpdatePaper}
              onAddAgent={handleAddAgent}
              onUpdateAgent={handleUpdateAgent}
              onDeleteRecord={handleDeleteRecord}
            />
          )}

          {activeTab === 'architect' && (
            <ArchitectHub />
          )}
        </div>
      </main>

      {/* Global Tab Switching Loader Overlay (Tester Optimized - Solid Backdrop) */}
      {isTabSwitching && (
        <div className="fixed inset-0 z-[100] bg-slate-950 flex items-center justify-center animate-in fade-in duration-300">
          <div className="flex flex-col items-center gap-6">
            <div className="relative">
              <RefreshCw className="text-emerald-500 animate-spin" size={48} />
              <div className="absolute inset-0 blur-xl bg-emerald-500/20 rounded-full animate-pulse"></div>
            </div>
            <div className="text-center">
              <h4 className="text-lg font-black text-white uppercase tracking-tighter">Synchronizing Data</h4>
              <p className="text-xs text-slate-400 mt-2 font-medium">Optimizing background thread processing...</p>
            </div>
          </div>
        </div>
      )}

      {/* 3. Invoice Detail Overlay Modal */}
      {selectedInvoice && (
        <InvoiceModal 
          bill={selectedInvoice}
          agent={getAgentForFlat(selectedInvoice.flatId)}
          onClose={() => setSelectedInvoice(null)}
          onTogglePaymentStatus={handleTogglePaymentStatus}
        />
      )}
    </div>
  );
}
