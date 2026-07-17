import React, { useState, useEffect, useMemo } from 'react';
import { Area, Building, Wing, Flat, Paper, DeliveryAgent, Subscription, DeliveryLog, BillingSummary } from './types';
import { generateInitialData, DatabaseState, calculateBill } from './data/dummyGenerator';
import { DashboardStats } from './components/DashboardStats';
import { DeliveryList } from './components/DeliveryList';
import { BillingEngine } from './components/BillingEngine';
import { DataMasters } from './components/DataMasters';
import { ArchitectHub } from './components/ArchitectHub';
import { InvoiceModal } from './components/InvoiceModal';
import { 
  Building2, 
  Smartphone, 
  Database, 
  Code, 
  Newspaper, 
  Calendar, 
  Users, 
  RefreshCw,
  SlidersHorizontal,
  Layers,
  FileSpreadsheet
} from 'lucide-react';

type TabType = 'drops' | 'billing' | 'masters' | 'architect';

export default function App() {
  const [db, setDb] = useState<DatabaseState>(() => {
    const saved = localStorage.getItem('newspaper_billing_state');
    if (saved) {
      try {
        return JSON.parse(saved);
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

  // Handle Tab Switch with simulated "Background Processing" Global Loader
  const handleTabChange = (tab: TabType) => {
    setIsTabSwitching(true);
    // Standardized background thread processing simulation for ALL tabs
    setTimeout(() => {
      setActiveTab(tab);
      setIsTabSwitching(false);
    }, 600);
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

  // --- Master Data Actions (CRUD) with Relational Integrity ---
  const handleAddArea = (area: Area) => {
    setDb(prev => ({ ...prev, areas: [...prev.areas, area] }));
  };

  const handleAddBuilding = (building: Building) => {
    setDb(prev => ({ ...prev, buildings: [...prev.buildings, building] }));
  };

  const handleAddWing = (wing: Wing) => {
    setDb(prev => ({ ...prev, wings: [...prev.wings, wing] }));
  };

  const handleAddFlat = (flat: Flat, papersChosen: string[]) => {
    setDb(prev => {
      // 1. Add Flat
      const flatsList = [...prev.flats, flat];

      // 2. Add subscriptions
      const subs = [...prev.subscriptions];
      papersChosen.forEach((pId, idx) => {
        subs.push({
          id: `sub_${flat.id}_${idx + 1}`,
          flatId: flat.id,
          paperId: pId,
          active: true
        });
      });

      return { ...prev, flats: flatsList, subscriptions: subs };
    });
  };

  const handleAddPaper = (paper: Paper) => {
    setDb(prev => ({ ...prev, papers: [...prev.papers, paper] }));
  };

  const handleAddAgent = (agent: DeliveryAgent) => {
    setDb(prev => ({ ...prev, agents: [...prev.agents, agent] }));
  };

  // Toggle paid status on the fly
  const handleTogglePaymentStatus = (flatId: string) => {
    // In our simplified database calculation, paid status is seed-based, 
    // but we can simulate the toggle fully by storing override paid status.
    // Let's implement an override key in invoice summaries or let the modal handle it dynamically.
    // To implement payment toggles persistently, we can simulate updating the payment in memory.
    // Let's store a customized 'payments' record inside local state for active flat payments!
    // Since payment overrides are awesome, let's inject custom paid states.
    // We will do this by saving an override paid status array or letting subscriptions/logs represent it.
    // Let's create an intuitive localStorage paid-override index!
    const key = `payment_override_${flatId}_${selectedMonth}_${selectedYear}`;
    const current = localStorage.getItem(key);
    if (current === 'PAID') {
      localStorage.setItem(key, 'UNPAID');
    } else if (current === 'UNPAID') {
      localStorage.setItem(key, 'PAID');
    } else {
      // No current override: find standard calculated paid status, invert it, store override
      const flatObj = db.flats.find(f => f.id === flatId);
      if (flatObj) {
        const standardBill = calculateBill(flatObj, selectedMonth, selectedYear, db);
        localStorage.setItem(key, standardBill.paid ? 'UNPAID' : 'PAID');
      }
    }

    // Trigger state reload to recalculate calculations
    setDb(prev => ({ ...prev }));
    
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
      let { areas, buildings, wings, flats, subscriptions, deliveryLogs, agents } = prev;

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
        prev.papers = prev.papers.filter(p => p.id !== id);
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
        subscriptions,
        deliveryLogs,
        agents
      };
    });
  };

  const getAgentForArea = (areaId: string): DeliveryAgent | null => {
    return db.agents.find(a => a.assignedAreaId === areaId) || null;
  };

  const handleViewInvoice = (summary: BillingSummary) => {
    // Get correct payment state from overrides if exists
    const key = `payment_override_${summary.flatId}_${selectedMonth}_${selectedYear}`;
    const override = localStorage.getItem(key);
    let isPaid = summary.paid;
    if (override === 'PAID') isPaid = true;
    if (override === 'UNPAID') isPaid = false;

    // Retrieve assigned agent details
    const flatObj = db.flats.find(f => f.id === summary.flatId);
    let agentObj: DeliveryAgent | null = null;
    if (flatObj) {
      const wing = db.wings.find(w => w.id === flatObj.wingId);
      const building = wing ? db.buildings.find(b => b.id === wing.buildingId) : null;
      if (building) {
        agentObj = getAgentForArea(building.areaId);
      }
    }

    setSelectedInvoice({ ...summary, paid: isPaid });
  };

  // Compile calculations to inject payments override correctly
  const compiledState = useMemo(() => {
    const nextDb = { ...db };
    nextDb.flats = db.flats.map(flat => {
      // Find override key
      const key = `payment_override_${flat.id}_${selectedMonth}_${selectedYear}`;
      const override = localStorage.getItem(key);
      if (override) {
        // We calculate bill with database data, then inject override paid status
        const standardBill = calculateBill(flat, selectedMonth, selectedYear, db);
        standardBill.paid = override === 'PAID';
      }
      return flat;
    });
    return nextDb;
  }, [db, selectedMonth, selectedYear]);

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

            {/* Reset mock database */}
            <button
              onClick={handleResetDatabase}
              className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer ml-1"
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
            state={compiledState} 
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
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl px-3.5 py-2 border border-slate-200 dark:border-slate-700 cursor-pointer focus:outline-none"
              >
                <option value={6}>June (Complete Logs Seeded)</option>
                <option value={7}>July (Active Month)</option>
              </select>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-bold bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
                Year 2026
              </span>
            </div>
          </div>
        )}

        {/* Dynamic Tab Body Render */}
        <div className="animate-fade-in">
          {activeTab === 'drops' && (
            <DeliveryList 
              state={compiledState}
              onUpdateDeliveryStatus={handleUpdateDeliveryStatus}
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
            />
          )}

          {activeTab === 'billing' && (
            <BillingEngine 
              state={compiledState}
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              onViewInvoice={handleViewInvoice}
              onTogglePaymentStatus={handleTogglePaymentStatus}
            />
          )}

          {activeTab === 'masters' && (
            <DataMasters 
              state={compiledState}
              onAddArea={handleAddArea}
              onAddBuilding={handleAddBuilding}
              onAddWing={handleAddWing}
              onAddFlat={handleAddFlat}
              onAddPaper={handleAddPaper}
              onAddAgent={handleAddAgent}
              onDeleteRecord={handleDeleteRecord}
            />
          )}

          {activeTab === 'architect' && (
            <ArchitectHub />
          )}
        </div>
      </main>

      {/* Global Tab Switching Loader Overlay */}
      {isTabSwitching && (
        <div className="fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-2xl flex flex-col items-center gap-4 border border-slate-800">
            <RefreshCw className="text-emerald-500 animate-spin" size={32} />
            <div className="text-center">
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-tighter">Optimizing Ledgers</h4>
              <p className="text-[10px] text-slate-500 mt-1">Background thread processing active...</p>
            </div>
          </div>
        </div>
      )}

      {/* 3. Invoice Detail Overlay Modal */}
      {selectedInvoice && (
        <InvoiceModal 
          bill={selectedInvoice}
          agent={db.agents.find(a => {
            // Find parent area for agent matching
            const flatObj = db.flats.find(f => f.id === selectedInvoice.flatId);
            if (!flatObj) return false;
            const wing = db.wings.find(w => w.id === flatObj.wingId);
            const building = wing ? db.buildings.find(b => b.id === wing.buildingId) : null;
            return building ? a.assignedAreaId === building.areaId : false;
          }) || null}
          onClose={() => setSelectedInvoice(null)}
          onTogglePaymentStatus={handleTogglePaymentStatus}
        />
      )}
    </div>
  );
}
