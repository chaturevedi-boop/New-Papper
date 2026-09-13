import React, { useState, useMemo } from 'react';
import { DatabaseState } from '../data/dummyGenerator';
import { Area, Building, Wing, Flat, Paper, DeliveryAgent } from '../types';
import {
  Plus,
  MapPin,
  Building2,
  Layers,
  Home,
  Newspaper,
  Users,
  Trash2,
  CheckCircle2,
  Calendar,
  RefreshCw,
  Pencil,
  Search,
  X
} from 'lucide-react';

interface DataMastersProps {
  state: DatabaseState;
  onAddArea: (area: Area) => void;
  onUpdateArea: (id: string, updates: Partial<Area>) => void;
  onAddBuilding: (building: Building) => void;
  onUpdateBuilding: (id: string, updates: Partial<Building>) => void;
  onAddWing: (wing: Wing) => void;
  onUpdateWing: (id: string, updates: Partial<Wing>) => void;
  onAddFlat: (flat: Flat, paperConfigs: { paperId: string, fromDate?: string, toDate?: string }[]) => void;
  onUpdateFlat: (id: string, updates: Partial<Flat>, paperConfigs: { paperId: string, fromDate?: string, toDate?: string }[]) => void;
  onAddPaper: (paper: Paper) => void;
  onUpdatePaper: (id: string, updates: Partial<Paper>) => void;
  onAddAgent: (agent: DeliveryAgent) => void;
  onUpdateAgent: (id: string, updates: Partial<DeliveryAgent>) => void;
  onDeleteRecord: (category: 'area' | 'building' | 'wing' | 'flat' | 'paper' | 'agent', id: string) => void;
}

type ActiveSubTab = 'areas' | 'buildings' | 'wings' | 'flats' | 'papers' | 'agents';

// Shared edit/delete button pair used by every master-data card list below -
// kept as one component since all six lists (areas/buildings/wings/flats/papers/agents)
// share the identical action pattern.
const RecordActions: React.FC<{ onEdit: () => void; onDelete: () => void; editTitle: string; deleteTitle: string }> = ({
  onEdit, onDelete, editTitle, deleteTitle
}) => (
  <div className="flex items-center gap-1.5 shrink-0">
    <button
      onClick={onEdit}
      title={editTitle}
      className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 rounded-xl transition-colors active:scale-[0.92] cursor-pointer"
    >
      <Pencil size={16} />
    </button>
    <button
      onClick={onDelete}
      title={deleteTitle}
      className="min-w-[44px] min-h-[44px] flex items-center justify-center text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition-colors active:scale-[0.92] cursor-pointer"
    >
      <Trash2 size={16} />
    </button>
  </div>
);

export const DataMasters: React.FC<DataMastersProps> = ({
  state,
  onAddArea,
  onUpdateArea,
  onAddBuilding,
  onUpdateBuilding,
  onAddWing,
  onUpdateWing,
  onAddFlat,
  onUpdateFlat,
  onAddPaper,
  onUpdatePaper,
  onAddAgent,
  onUpdateAgent,
  onDeleteRecord
}) => {
  const { areas, buildings, wings, flats, papers, agents, subscriptions } = state;
  const [activeTab, setActiveTab] = useState<ActiveSubTab>('areas');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [masterSearch, setMasterSearch] = useState('');

  // Which record (if any) is currently being edited per entity type
  const [editingAreaId, setEditingAreaId] = useState<string | null>(null);
  const [editingBuildingId, setEditingBuildingId] = useState<string | null>(null);
  const [editingWingId, setEditingWingId] = useState<string | null>(null);
  const [editingFlatId, setEditingFlatId] = useState<string | null>(null);
  const [editingPaperRecordId, setEditingPaperRecordId] = useState<string | null>(null);
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null);

  // Form states
  const [areaName, setAreaName] = useState('');
  const [buildingName, setBuildingName] = useState('');
  const [buildingAreaId, setBuildingAreaId] = useState('');
  
  const [wingName, setWingName] = useState('');
  const [wingBuildingId, setWingBuildingId] = useState('');

  const [flatNumber, setFlatNumber] = useState('');
  const [flatCustomerName, setFlatCustomerName] = useState('');
  const [flatPhone, setFlatPhone] = useState('');
  const [flatWingId, setFlatWingId] = useState('');
  const [flatPaperConfigs, setFlatPaperConfigs] = useState<{ paperId: string, fromDate?: string, toDate?: string }[]>([]);

  // Dynamic Registration State
  const [ledgerType, setLedgerType] = useState<'SUBSCRIPTION' | 'BILLING'>('SUBSCRIPTION');
  const [configuringPaperId, setConfiguringPaperId] = useState<string | null>(null);
  const [showDatePopup, setShowDatePopup] = useState(false);
  const [billingFromDate, setBillingFromDate] = useState('');
  const [billingToDate, setBillingToDate] = useState('');

  const [paperName, setPaperName] = useState('');
  const [paperRate, setPaperRate] = useState('');

  const [agentName, setAgentName] = useState('');
  const [agentPhone, setAgentPhone] = useState('');
  const [agentAreaId, setAgentAreaId] = useState('');

  const triggerSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // Submit handlers with Simulated Background Thread (Lag Fix)
  const handleAddAreaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!areaName.trim() || isAdding) return;

    setIsAdding(true);
    // Simulate background DB thread
    await new Promise(resolve => setTimeout(resolve, 600));

    if (editingAreaId) {
      onUpdateArea(editingAreaId, { name: areaName.trim() });
      setEditingAreaId(null);
      triggerSuccess(`Successfully updated Area: ${areaName.trim()}`);
    } else {
      const newArea: Area = {
        id: `area_${Date.now()}`,
        name: areaName.trim()
      };
      onAddArea(newArea);
      triggerSuccess(`Successfully added Area: ${newArea.name}`);
    }
    setAreaName('');
    setIsAdding(false);
  };

  const startEditArea = (area: Area) => {
    setEditingAreaId(area.id);
    setAreaName(area.name);
  };

  const cancelEditArea = () => {
    setEditingAreaId(null);
    setAreaName('');
  };

  const handleAddBuildingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buildingName.trim() || !buildingAreaId || isAdding) return;

    setIsAdding(true);
    await new Promise(resolve => setTimeout(resolve, 600));

    if (editingBuildingId) {
      onUpdateBuilding(editingBuildingId, { name: buildingName.trim(), areaId: buildingAreaId });
      setEditingBuildingId(null);
      triggerSuccess(`Successfully updated Building: ${buildingName.trim()}`);
    } else {
      const newBuilding: Building = {
        id: `b_${Date.now()}`,
        areaId: buildingAreaId,
        name: buildingName.trim()
      };
      onAddBuilding(newBuilding);
      triggerSuccess(`Successfully added Building: ${newBuilding.name}`);
    }
    setBuildingName('');
    setIsAdding(false);
  };

  const startEditBuilding = (building: Building) => {
    setEditingBuildingId(building.id);
    setBuildingName(building.name);
    setBuildingAreaId(building.areaId);
  };

  const cancelEditBuilding = () => {
    setEditingBuildingId(null);
    setBuildingName('');
  };

  const handleAddWingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wingName.trim() || !wingBuildingId || isAdding) return;

    setIsAdding(true);
    await new Promise(resolve => setTimeout(resolve, 600));

    if (editingWingId) {
      onUpdateWing(editingWingId, { name: wingName.trim(), buildingId: wingBuildingId });
      setEditingWingId(null);
      triggerSuccess(`Successfully updated Wing: ${wingName.trim()}`);
    } else {
      const newWing: Wing = {
        id: `w_${Date.now()}`,
        buildingId: wingBuildingId,
        name: wingName.trim()
      };
      onAddWing(newWing);
      triggerSuccess(`Successfully added Wing: ${newWing.name}`);
    }
    setWingName('');
    setIsAdding(false);
  };

  const startEditWing = (wing: Wing) => {
    setEditingWingId(wing.id);
    setWingName(wing.name);
    setWingBuildingId(wing.buildingId);
  };

  const cancelEditWing = () => {
    setEditingWingId(null);
    setWingName('');
  };

  const handleAddFlatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!flatNumber.trim() || !flatCustomerName.trim() || !flatPhone.trim() || !flatWingId || flatPaperConfigs.length === 0 || isAdding) return;

    setIsAdding(true);
    await new Promise(resolve => setTimeout(resolve, 800));

    const flatUpdates = {
      wingId: flatWingId,
      flatNumber: flatNumber.trim(),
      customerName: flatCustomerName.trim(),
      phoneNumber: flatPhone.trim(),
      ledgerType: ledgerType
    };

    if (editingFlatId) {
      onUpdateFlat(editingFlatId, flatUpdates, flatPaperConfigs);
      setEditingFlatId(null);
      triggerSuccess(`Successfully updated Customer: ${flatUpdates.customerName} (Flat ${flatUpdates.flatNumber})`);
    } else {
      const newFlat: Flat = {
        id: `f_${Date.now()}`,
        activeYear: 2026,
        ...flatUpdates
      };
      onAddFlat(newFlat, flatPaperConfigs);
      triggerSuccess(`Successfully registered Customer: ${newFlat.customerName} (Flat ${newFlat.flatNumber})`);
    }

    // Reset all form states
    setFlatNumber('');
    setFlatCustomerName('');
    setFlatPhone('');
    setFlatPaperConfigs([]);
    setLedgerType('SUBSCRIPTION');
    setBillingFromDate('');
    setBillingToDate('');
    setIsAdding(false);
  };

  const startEditFlat = (flat: Flat) => {
    setEditingFlatId(flat.id);
    setFlatNumber(flat.flatNumber);
    setFlatCustomerName(flat.customerName);
    setFlatPhone(flat.phoneNumber);
    setFlatWingId(flat.wingId);
    setLedgerType(flat.ledgerType || 'SUBSCRIPTION');
    const currentSubs = subscriptions.filter(s => s.flatId === flat.id && s.active);
    setFlatPaperConfigs(currentSubs.map(s => ({ paperId: s.paperId, fromDate: s.fromDate, toDate: s.toDate })));
  };

  const cancelEditFlat = () => {
    setEditingFlatId(null);
    setFlatNumber('');
    setFlatCustomerName('');
    setFlatPhone('');
    setFlatPaperConfigs([]);
    setLedgerType('SUBSCRIPTION');
  };

  const handleConfirmBillingDates = (e: React.FormEvent) => {
    e.preventDefault();
    if (!configuringPaperId) return;

    // Add or update the paper config with dates
    setFlatPaperConfigs(prev => {
      const existingIdx = prev.findIndex(c => c.paperId === configuringPaperId);
      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx] = { paperId: configuringPaperId, fromDate: billingFromDate, toDate: billingToDate };
        return next;
      }
      return [...prev, { paperId: configuringPaperId, fromDate: billingFromDate, toDate: billingToDate }];
    });

    setShowDatePopup(false);
    setConfiguringPaperId(null);
    setBillingFromDate('');
    setBillingToDate('');
  };

  const handleCancelDatePopup = () => {
    setShowDatePopup(false);
    // If it was a new paper being added, remove it if no dates were set
    if (configuringPaperId) {
      setFlatPaperConfigs(prev => prev.filter(c => c.paperId !== configuringPaperId || (c.fromDate && c.toDate)));
    }
    setConfiguringPaperId(null);
    setBillingFromDate('');
    setBillingToDate('');
  };

  const handleAddPaperSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const rateNum = parseFloat(paperRate);
    if (!paperName.trim() || isNaN(rateNum) || isAdding) return;

    setIsAdding(true);
    await new Promise(resolve => setTimeout(resolve, 500));

    if (editingPaperRecordId) {
      onUpdatePaper(editingPaperRecordId, { name: paperName.trim(), ratePerDay: rateNum });
      setEditingPaperRecordId(null);
      triggerSuccess(`Successfully updated Newspaper Rate Card: ${paperName.trim()}`);
    } else {
      const newPaper: Paper = {
        id: `p_${Date.now()}`,
        name: paperName.trim(),
        ratePerDay: rateNum
      };
      onAddPaper(newPaper);
      triggerSuccess(`Successfully added Newspaper Rate Card: ${newPaper.name}`);
    }
    setPaperName('');
    setPaperRate('');
    setIsAdding(false);
  };

  const startEditPaper = (paper: Paper) => {
    setEditingPaperRecordId(paper.id);
    setPaperName(paper.name);
    setPaperRate(String(paper.ratePerDay));
  };

  const cancelEditPaper = () => {
    setEditingPaperRecordId(null);
    setPaperName('');
    setPaperRate('');
  };

  const handleAddAgentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentName.trim() || !agentPhone.trim() || !agentAreaId || isAdding) return;

    setIsAdding(true);
    await new Promise(resolve => setTimeout(resolve, 600));

    if (editingAgentId) {
      onUpdateAgent(editingAgentId, { name: agentName.trim(), phone: agentPhone.trim(), assignedAreaId: agentAreaId });
      setEditingAgentId(null);
      triggerSuccess(`Successfully updated Delivery Agent: ${agentName.trim()}`);
    } else {
      const newAgent: DeliveryAgent = {
        id: `a_${Date.now()}`,
        name: agentName.trim(),
        phone: agentPhone.trim(),
        assignedAreaId: agentAreaId
      };
      onAddAgent(newAgent);
      triggerSuccess(`Registered Delivery Agent: ${newAgent.name}`);
    }
    setAgentName('');
    setAgentPhone('');
    setIsAdding(false);
  };

  const startEditAgent = (agent: DeliveryAgent) => {
    setEditingAgentId(agent.id);
    setAgentName(agent.name);
    setAgentPhone(agent.phone);
    setAgentAreaId(agent.assignedAreaId);
  };

  const cancelEditAgent = () => {
    setEditingAgentId(null);
    setAgentName('');
    setAgentPhone('');
  };

  const handlePaperCheckbox = (paperId: string) => {
    const isConfigured = flatPaperConfigs.some(c => c.paperId === paperId);

    if (isConfigured) {
      // Remove it
      setFlatPaperConfigs(flatPaperConfigs.filter(c => c.paperId !== paperId));
    } else if (ledgerType === 'BILLING') {
      // Timed billing ledgers require an explicit date range
      setConfiguringPaperId(paperId);
      setShowDatePopup(true);
    } else {
      // Standing subscriptions are active indefinitely - no date range needed
      setFlatPaperConfigs(prev => [...prev, { paperId }]);
    }
  };

  // Search-filtered lists per tab (case-insensitive match on the fields relevant to that tab)
  const q = masterSearch.trim().toLowerCase();
  const filteredAreas = useMemo(() => (!q ? areas : areas.filter(a => a.name.toLowerCase().includes(q))), [areas, q]);
  const filteredBuildingsList = useMemo(() => (!q ? buildings : buildings.filter(b => b.name.toLowerCase().includes(q))), [buildings, q]);
  const filteredWingsList = useMemo(() => (!q ? wings : wings.filter(w => w.name.toLowerCase().includes(q))), [wings, q]);
  const filteredFlatsList = useMemo(() => (!q ? flats : flats.filter(f =>
    f.customerName.toLowerCase().includes(q) || f.flatNumber.toLowerCase().includes(q) || f.phoneNumber.toLowerCase().includes(q)
  )), [flats, q]);
  const filteredPapersList = useMemo(() => (!q ? papers : papers.filter(p => p.name.toLowerCase().includes(q))), [papers, q]);
  const filteredAgentsList = useMemo(() => (!q ? agents : agents.filter(a => a.name.toLowerCase().includes(q) || a.phone.toLowerCase().includes(q))), [agents, q]);

  const searchPlaceholders: Record<ActiveSubTab, string> = {
    areas: 'Search areas...',
    buildings: 'Search buildings...',
    wings: 'Search wings...',
    flats: 'Search customer name, flat no, or phone...',
    papers: 'Search newspapers...',
    agents: 'Search agents by name or phone...'
  };

  // Tab configurations
  const tabs = [
    { key: 'areas', label: '1. Areas', icon: MapPin, count: areas.length },
    { key: 'buildings', label: '2. Buildings', icon: Building2, count: buildings.length },
    { key: 'wings', label: '3. Wings', icon: Layers, count: wings.length },
    { key: 'flats', label: '4. Customer Flats', icon: Home, count: flats.length },
    { key: 'papers', label: 'Paper Masters', icon: Newspaper, count: papers.length },
    { key: 'agents', label: 'Delivery Agents', icon: Users, count: agents.length },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Sub-tab Navigation */}
      <div className="space-y-1 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-3 rounded-2xl shadow-sm h-fit">
        <h4 className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-3 mb-2">Relational Workspace</h4>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key as ActiveSubTab);
                setMasterSearch('');
                // Set defaults for selects if empty
                if (tab.key === 'buildings' && !buildingAreaId && areas[0]) setBuildingAreaId(areas[0].id);
                if (tab.key === 'wings' && !wingBuildingId && buildings[0]) setWingBuildingId(buildings[0].id);
                if (tab.key === 'flats' && !flatWingId && wings[0]) setFlatWingId(wings[0].id);
                if (tab.key === 'agents' && !agentAreaId && areas[0]) setAgentAreaId(areas[0].id);
              }}
              className={`w-full text-left px-3.5 py-3 rounded-xl text-xs font-bold flex items-center justify-between transition-colors active:scale-[0.98] ${
                isActive
                  ? 'bg-slate-900 dark:bg-slate-800 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Icon size={17} className={isActive ? 'text-emerald-400' : 'text-slate-400'} />
                <span>{tab.label}</span>
              </span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                isActive ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
              }`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Workspace Frame */}
      <div className="lg:col-span-3 space-y-6 relative">
        {/* BACKGROUND SAVING OVERLAY (Tester Requirement: Immediate Loading Effect) */}
        {isAdding && (
          <div className="absolute inset-0 z-40 bg-white/60 dark:bg-slate-900/60 backdrop-blur-[2px] rounded-2xl flex items-center justify-center animate-in fade-in duration-200">
            <div className="bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border border-slate-700">
              <RefreshCw className="animate-spin text-emerald-400" size={24} />
              <div className="pr-4">
                <p className="text-sm font-bold uppercase tracking-tight">Persisting Record</p>
                <p className="text-[10px] text-slate-400">Background IO active...</p>
              </div>
            </div>
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 px-4 py-3 rounded-xl border border-emerald-100 dark:border-emerald-900/60 flex items-center gap-2 text-xs font-semibold shadow-sm animate-fade-in">
            <CheckCircle2 size={16} className="text-emerald-500" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Search within the active tab's list */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder={searchPlaceholders[activeTab]}
            value={masterSearch}
            onChange={(e) => setMasterSearch(e.target.value)}
            className="w-full sm:w-80 pl-10 pr-10 py-3 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          {masterSearch && (
            <button
              onClick={() => setMasterSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Shared Date Selection Popup (used by any tab that configures a timed paper schedule) */}
        {showDatePopup && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md">
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-sm overflow-hidden animate-in zoom-in duration-200">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-850">
                <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight flex items-center gap-2">
                  <Calendar className="text-emerald-500" size={18} /> Paper Delivery Schedule
                </h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 uppercase font-bold">
                  Configuring: {papers.find(p => p.id === configuringPaperId)?.name}
                </p>
              </div>

              <form onSubmit={handleConfirmBillingDates} className="p-6 space-y-4">
                <div className="space-y-3">
                  <div>
                    <label htmlFor="billing-from-date" className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Start Date</label>
                    <input
                      id="billing-from-date"
                      type="date"
                      required
                      value={billingFromDate}
                      onChange={(e) => setBillingFromDate(e.target.value)}
                      className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-1 focus:ring-emerald-500 outline-none dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label htmlFor="billing-to-date" className="block text-[10px] font-bold text-slate-400 uppercase mb-1">End Date</label>
                    <input
                      id="billing-to-date"
                      type="date"
                      required
                      value={billingToDate}
                      onChange={(e) => setBillingToDate(e.target.value)}
                      className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-1 focus:ring-emerald-500 outline-none dark:text-slate-100"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleCancelDatePopup}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 size={16} /> Set Schedule
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 1. Areas Master */}
        {activeTab === 'areas' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm p-5 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <MapPin className="text-emerald-500" size={18} /> Area Directory (Level 1 Hierarchy)
              </h3>
            </div>

            {/* Create Area Form */}
            <form onSubmit={handleAddAreaSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
              <div className="md:col-span-2">
                <label htmlFor="area-name" className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">New Area Name</label>
                <input
                  id="area-name"
                  type="text"
                  placeholder="e.g. Highland Boulevard"
                  value={areaName}
                  onChange={(e) => setAreaName(e.target.value)}
                  className="w-full text-xs px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:text-slate-100"
                />
              </div>
              <div className="flex items-center gap-2">
                {editingAreaId && (
                  <button
                    type="button"
                    onClick={cancelEditArea}
                    className="px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isAdding}
                  className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-semibold py-2.5 rounded-xl flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  {isAdding ? <RefreshCw size={14} className="animate-spin" /> : editingAreaId ? <CheckCircle2 size={14} /> : <Plus size={14} />}
                  {isAdding ? 'Processing...' : editingAreaId ? 'Update Area' : 'Add Area'}
                </button>
              </div>
            </form>

            {/* List Areas */}
            <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
              {filteredAreas.length === 0 ? (
                <p className="text-center text-xs text-slate-400 py-8">No areas found.</p>
              ) : (
                filteredAreas.map((a) => (
                  <div key={a.id} className="flex items-center justify-between gap-3 p-3.5 hover:bg-slate-50/50 dark:hover:bg-slate-950/20">
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">{a.name}</p>
                      <p className="font-mono text-[10px] text-slate-400 mt-0.5">{a.id}</p>
                    </div>
                    <RecordActions
                      onEdit={() => startEditArea(a)}
                      onDelete={() => onDeleteRecord('area', a.id)}
                      editTitle="Edit Area"
                      deleteTitle="Delete Area (Cascades downstream!)"
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* 2. Buildings Master */}
        {activeTab === 'buildings' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm p-5 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Building2 className="text-emerald-500" size={18} /> Building Directory (Level 2 Hierarchy)
              </h3>
            </div>

            {/* Create Building Form */}
            <form onSubmit={handleAddBuildingSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
              <div>
                <label htmlFor="building-area" className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Parent Area</label>
                <select
                  id="building-area"
                  value={buildingAreaId}
                  onChange={(e) => setBuildingAreaId(e.target.value)}
                  className="w-full text-xs px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl focus:outline-none dark:text-slate-100 cursor-pointer"
                >
                  {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="building-name" className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Building Name</label>
                <input
                  id="building-name"
                  type="text"
                  placeholder="e.g. Apex Tower B"
                  value={buildingName}
                  onChange={(e) => setBuildingName(e.target.value)}
                  className="w-full text-xs px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:text-slate-100"
                />
              </div>
              <div className="flex items-center gap-2">
                {editingBuildingId && (
                  <button
                    type="button"
                    onClick={cancelEditBuilding}
                    className="px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isAdding}
                  className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-semibold py-2.5 rounded-xl flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  {isAdding ? <RefreshCw size={14} className="animate-spin" /> : editingBuildingId ? <CheckCircle2 size={14} /> : <Plus size={14} />}
                  {isAdding ? 'Processing...' : editingBuildingId ? 'Update Building' : 'Add Building'}
                </button>
              </div>
            </form>

            {/* List Buildings */}
            <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
              {filteredBuildingsList.length === 0 ? (
                <p className="text-center text-xs text-slate-400 py-8">No buildings found.</p>
              ) : (
                filteredBuildingsList.map((b) => {
                  const area = areas.find(a => a.id === b.areaId);
                  return (
                    <div key={b.id} className="flex items-center justify-between gap-3 p-3.5 hover:bg-slate-50/50 dark:hover:bg-slate-950/20">
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">{b.name}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{area?.name || 'Unknown Area'}</p>
                      </div>
                      <RecordActions
                        onEdit={() => startEditBuilding(b)}
                        onDelete={() => onDeleteRecord('building', b.id)}
                        editTitle="Edit Building"
                        deleteTitle="Delete Building"
                      />
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* 3. Wings Master */}
        {activeTab === 'wings' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm p-5 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Layers className="text-emerald-500" size={18} /> Wing Directory (Level 3 Hierarchy)
              </h3>
            </div>

            {/* Create Wing Form */}
            <form onSubmit={handleAddWingSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
              <div>
                <label htmlFor="wing-building" className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Parent Building</label>
                <select
                  id="wing-building"
                  value={wingBuildingId}
                  onChange={(e) => setWingBuildingId(e.target.value)}
                  className="w-full text-xs px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl focus:outline-none dark:text-slate-100 cursor-pointer"
                >
                  {buildings.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({areas.find(a => a.id === b.areaId)?.name})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="wing-name" className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Wing Name</label>
                <input
                  id="wing-name"
                  type="text"
                  placeholder="e.g. Wing C"
                  value={wingName}
                  onChange={(e) => setWingName(e.target.value)}
                  className="w-full text-xs px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:text-slate-100"
                />
              </div>
              <div className="flex items-center gap-2">
                {editingWingId && (
                  <button
                    type="button"
                    onClick={cancelEditWing}
                    className="px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isAdding}
                  className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-semibold py-2.5 rounded-xl flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  {isAdding ? <RefreshCw size={14} className="animate-spin" /> : editingWingId ? <CheckCircle2 size={14} /> : <Plus size={14} />}
                  {isAdding ? 'Processing...' : editingWingId ? 'Update Wing' : 'Add Wing'}
                </button>
              </div>
            </form>

            {/* List Wings */}
            <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
              {filteredWingsList.length === 0 ? (
                <p className="text-center text-xs text-slate-400 py-8">No wings found.</p>
              ) : (
                filteredWingsList.map((w) => {
                  const building = buildings.find(b => b.id === w.buildingId);
                  return (
                    <div key={w.id} className="flex items-center justify-between gap-3 p-3.5 hover:bg-slate-50/50 dark:hover:bg-slate-950/20">
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">{w.name}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{building?.name || 'Unknown Building'}</p>
                      </div>
                      <RecordActions
                        onEdit={() => startEditWing(w)}
                        onDelete={() => onDeleteRecord('wing', w.id)}
                        editTitle="Edit Wing"
                        deleteTitle="Delete Wing"
                      />
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* 4. Customer Flats Master */}
        {activeTab === 'flats' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm p-5 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Home className="text-emerald-500" size={18} /> Customer Flats (Level 4 Hierarchy - Subscription Ledger)
              </h3>
            </div>

            {/* Create Flat Form */}
            <form onSubmit={handleAddFlatSubmit} className="space-y-4 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-150 dark:border-slate-800">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                {editingFlatId ? 'Edit Flat Ledger' : 'Register New Flat Ledger'} (Year 2026 Active)
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="flat-wing" className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Parent Wing Hierarchy</label>
                  <select
                    id="flat-wing"
                    value={flatWingId}
                    onChange={(e) => setFlatWingId(e.target.value)}
                    className="w-full text-xs px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none dark:text-slate-100 cursor-pointer"
                  >
                    {wings.map(w => {
                      const b = buildings.find(bld => bld.id === w.buildingId);
                      const a = b ? areas.find(area => area.id === b.areaId) : null;
                      return (
                        <option key={w.id} value={w.id}>
                          {a?.name} ➔ {b?.name} ➔ {w.name}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label htmlFor="flat-number" className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Flat Number</label>
                  <input
                    id="flat-number"
                    type="text"
                    placeholder="e.g. 501"
                    value={flatNumber}
                    onChange={(e) => setFlatNumber(e.target.value)}
                    className="w-full text-xs px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label htmlFor="flat-customer-name" className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Customer Full Name</label>
                  <input
                    id="flat-customer-name"
                    type="text"
                    placeholder="e.g. Anand Sharma"
                    value={flatCustomerName}
                    onChange={(e) => setFlatCustomerName(e.target.value)}
                    className="w-full text-xs px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label htmlFor="flat-phone" className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">WhatsApp / Contact Phone</label>
                  <input
                    id="flat-phone"
                    type="text"
                    placeholder="e.g. +91 98234 56789"
                    value={flatPhone}
                    onChange={(e) => setFlatPhone(e.target.value)}
                    className="w-full text-xs px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Registration Ledger Type</label>
                  <div className="flex bg-white dark:bg-slate-800 rounded-xl p-1 border border-slate-200 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => setLedgerType('SUBSCRIPTION')}
                      className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                        ledgerType === 'SUBSCRIPTION' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-400'
                      }`}
                    >
                      Subscription
                    </button>
                    <button
                      type="button"
                      onClick={() => setLedgerType('BILLING')}
                      className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                        ledgerType === 'BILLING' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400'
                      }`}
                    >
                      Billing (Timed)
                    </button>
                  </div>
                </div>
              </div>

              {/* Subscriptions Choice */}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">Select Subscribed Newspapers (Select at least one)</label>
                <div className="flex flex-wrap gap-4 bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-150 dark:border-slate-700">
                  {papers.map((p) => {
                    const config = flatPaperConfigs.find(c => c.paperId === p.id);
                    const isChecked = !!config;
                    return (
                      <div key={p.id} className="flex flex-col gap-1">
                        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handlePaperCheckbox(p.id)}
                            className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                          />
                          <span>{p.name} (₹{p.ratePerDay}/d)</span>
                        </label>
                        {config && config.fromDate && config.toDate && (
                          <div className="ml-6 text-[9px] text-emerald-500 font-bold uppercase">
                            {config.fromDate} to {config.toDate}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {editingFlatId && (
                  <button
                    type="button"
                    onClick={cancelEditFlat}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isAdding}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
                >
                  {isAdding ? <RefreshCw size={14} className="animate-spin" /> : editingFlatId ? <CheckCircle2 size={14} /> : <Plus size={14} />}
                  {isAdding ? 'Saving...' : editingFlatId ? 'Update Customer Ledger & Subscriptions' : 'Register Customer Ledger & Subscriptions'}
                </button>
              </div>
            </form>

            {/* List Flats */}
            <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden max-h-[420px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              {filteredFlatsList.length === 0 ? (
                <p className="text-center text-xs text-slate-400 py-8">No customer flats found.</p>
              ) : (
                filteredFlatsList.map((f) => {
                  const wing = wings.find(w => w.id === f.wingId);
                  const b = wing ? buildings.find(bld => bld.id === wing.buildingId) : null;
                  const a = b ? areas.find(ar => ar.id === b.areaId) : null;
                  const subs = subscriptions.filter(s => s.flatId === f.id && s.active);
                  const paperNames = papers.filter(p => subs.some(s => s.paperId === p.id)).map(p => p.name).join(', ');

                  return (
                    <div key={f.id} className="flex items-start justify-between gap-3 p-3.5 hover:bg-slate-50/50 dark:hover:bg-slate-950/20">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded text-[11px] font-bold shrink-0">
                            {f.flatNumber}
                          </span>
                          <p className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">{f.customerName}</p>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">{f.phoneNumber}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                          {a?.name} {" ➔ "} {b?.name} {" ➔ "} {wing?.name}
                        </p>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium italic mt-1">
                          {paperNames || 'No papers'}
                        </p>
                      </div>
                      <RecordActions
                        onEdit={() => startEditFlat(f)}
                        onDelete={() => onDeleteRecord('flat', f.id)}
                        editTitle="Edit Customer"
                        deleteTitle="Delete Customer"
                      />
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* 5. Papers Master */}
        {activeTab === 'papers' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm p-5 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Newspaper className="text-emerald-500" size={18} /> Newspaper Master & Daily Rate Cards
              </h3>
            </div>

            {/* Create Paper Form */}
            <form onSubmit={handleAddPaperSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
              <div>
                <label htmlFor="paper-name" className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Newspaper Name</label>
                <input
                  id="paper-name"
                  type="text"
                  placeholder="e.g. Financial Times"
                  value={paperName}
                  onChange={(e) => setPaperName(e.target.value)}
                  className="w-full text-xs px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:text-slate-100"
                />
              </div>
              <div>
                <label htmlFor="paper-rate" className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Daily Rate (₹)</label>
                <input
                  id="paper-rate"
                  type="text"
                  placeholder="e.g. 7.50"
                  value={paperRate}
                  onChange={(e) => setPaperRate(e.target.value)}
                  className="w-full text-xs px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:text-slate-100"
                />
              </div>
              <div className="flex items-center gap-2">
                {editingPaperRecordId && (
                  <button
                    type="button"
                    onClick={cancelEditPaper}
                    className="px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isAdding}
                  className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-semibold py-2.5 rounded-xl flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  {isAdding ? <RefreshCw size={14} className="animate-spin" /> : editingPaperRecordId ? <CheckCircle2 size={14} /> : <Plus size={14} />}
                  {isAdding ? 'Processing...' : editingPaperRecordId ? 'Update Newspaper' : 'Add Newspaper'}
                </button>
              </div>
            </form>

            {/* List Papers */}
            <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
              {filteredPapersList.length === 0 ? (
                <p className="text-center text-xs text-slate-400 py-8">No newspapers found.</p>
              ) : (
                filteredPapersList.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-3 p-3.5 hover:bg-slate-50/50 dark:hover:bg-slate-950/20">
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">{p.name}</p>
                      <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">₹{p.ratePerDay.toFixed(2)} / day</p>
                    </div>
                    <RecordActions
                      onEdit={() => startEditPaper(p)}
                      onDelete={() => onDeleteRecord('paper', p.id)}
                      editTitle="Edit Newspaper"
                      deleteTitle="Delete Newspaper"
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* 6. Delivery Agents Master */}
        {activeTab === 'agents' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm p-5 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Users className="text-emerald-500" size={18} /> Daily Delivery Agents (Paper Drop Persons)
              </h3>
            </div>

            {/* Create Agent Form */}
            <form onSubmit={handleAddAgentSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
              <div>
                <label htmlFor="agent-name" className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Agent Full Name</label>
                <input
                  id="agent-name"
                  type="text"
                  placeholder="e.g. Raju Patil"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  className="w-full text-xs px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:text-slate-100"
                />
              </div>
              <div>
                <label htmlFor="agent-phone" className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">WhatsApp Mobile</label>
                <input
                  id="agent-phone"
                  type="text"
                  placeholder="e.g. +91 99000 88777"
                  value={agentPhone}
                  onChange={(e) => setAgentPhone(e.target.value)}
                  className="w-full text-xs px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:text-slate-100"
                />
              </div>
              <div>
                <label htmlFor="agent-area" className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Assigned Area</label>
                <select
                  id="agent-area"
                  value={agentAreaId}
                  onChange={(e) => setAgentAreaId(e.target.value)}
                  className="w-full text-xs px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl focus:outline-none dark:text-slate-100 cursor-pointer"
                >
                  {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                {editingAgentId && (
                  <button
                    type="button"
                    onClick={cancelEditAgent}
                    className="px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isAdding}
                  className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-semibold py-2.5 rounded-xl flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  {isAdding ? <RefreshCw size={14} className="animate-spin" /> : editingAgentId ? <CheckCircle2 size={14} /> : <Plus size={14} />}
                  {isAdding ? 'Registering...' : editingAgentId ? 'Update Agent' : 'Register Agent'}
                </button>
              </div>
            </form>

            {/* List Agents */}
            <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
              {filteredAgentsList.length === 0 ? (
                <p className="text-center text-xs text-slate-400 py-8">No delivery agents found.</p>
              ) : (
                filteredAgentsList.map((a) => {
                  const area = areas.find(ar => ar.id === a.assignedAreaId);
                  return (
                    <div key={a.id} className="flex items-center justify-between gap-3 p-3.5 hover:bg-slate-50/50 dark:hover:bg-slate-950/20">
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">{a.name}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{a.phone}</p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold mt-0.5">{area?.name || 'Floating Agent'}</p>
                      </div>
                      <RecordActions
                        onEdit={() => startEditAgent(a)}
                        onDelete={() => onDeleteRecord('agent', a.id)}
                        editTitle="Edit Agent"
                        deleteTitle="Unregister Agent"
                      />
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
