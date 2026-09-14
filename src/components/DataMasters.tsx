import React, { useState, useMemo, useRef } from 'react';
import { DatabaseState } from '../data/dummyGenerator';
import { Area, Building, Wing, Flat, Paper, DeliveryAgent, Expense, ExpenseCategory, CommissionType } from '../types';
import { parseCustomerCsv, buildImportTemplate, type ImportRow, type ImportPreview } from '../utils/csvImport';
import { shareOrDownloadFile } from '../utils/shareFile';
import { useWindowedList } from '../hooks/useWindowedList';
import {
  Plus,
  MapPin,
  Building2,
  Layers,
  Home,
  Newspaper,
  Users,
  Wallet,
  Trash2,
  CheckCircle2,
  Calendar,
  ChevronDown,
  ChevronUp,
  History,
  Pencil,
  Search,
  X,
  Upload,
  Download,
  AlertTriangle,
  FileSpreadsheet
} from 'lucide-react';

interface DataMastersProps {
  state: DatabaseState;
  // These return false (instead of running) when a licensing guard upstream blocks the
  // write - callers use that to skip showing a misleading "Successfully added/updated" toast.
  onAddArea: (area: Area) => boolean;
  onUpdateArea: (id: string, updates: Partial<Area>) => boolean;
  onAddBuilding: (building: Building) => boolean;
  onUpdateBuilding: (id: string, updates: Partial<Building>) => boolean;
  onAddWing: (wing: Wing) => boolean;
  onUpdateWing: (id: string, updates: Partial<Wing>) => boolean;
  onAddFlat: (flat: Flat, paperConfigs: { paperId: string, fromDate?: string, toDate?: string }[]) => boolean;
  onUpdateFlat: (id: string, updates: Partial<Flat>, paperConfigs: { paperId: string, fromDate?: string, toDate?: string }[]) => boolean;
  onImportCustomers: (rows: ImportRow[]) => boolean;
  onAddPaper: (paper: Paper) => boolean;
  onUpdatePaperName: (id: string, name: string) => boolean;
  onUpdatePaperRate: (id: string, newRate: number, effectiveFrom: string) => boolean;
  onAddAgent: (agent: DeliveryAgent) => boolean;
  onUpdateAgent: (id: string, updates: Partial<DeliveryAgent>) => boolean;
  onAddExpense: (expense: Expense) => boolean;
  onUpdateExpense: (id: string, updates: Partial<Expense>) => boolean;
  onDeleteRecord: (category: 'area' | 'building' | 'wing' | 'flat' | 'paper' | 'agent' | 'expense', id: string) => void;
}

type ActiveSubTab = 'areas' | 'buildings' | 'wings' | 'flats' | 'papers' | 'agents' | 'expenses';

// Shared edit/delete button pair used by every master-data card list below -
// kept as one component since all lists share the identical action pattern.
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

const COMMISSION_LABEL: Record<CommissionType, string> = {
  PER_PAPER: '₹ per paper delivered',
  PERCENTAGE: '% of area collections',
  FIXED_MONTHLY: 'Fixed ₹ per month'
};

const EXPENSE_CATEGORIES: ExpenseCategory[] = ['AGENT_WAGES', 'PAPER_PURCHASE', 'FUEL', 'MAINTENANCE', 'OTHER'];
const EXPENSE_CATEGORY_LABEL: Record<ExpenseCategory, string> = {
  AGENT_WAGES: 'Agent Wages',
  PAPER_PURCHASE: 'Paper Purchase',
  FUEL: 'Fuel',
  MAINTENANCE: 'Maintenance',
  OTHER: 'Other'
};

const todayStr = () => new Date().toISOString().slice(0, 10);

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
  onImportCustomers,
  onAddPaper,
  onUpdatePaperName,
  onUpdatePaperRate,
  onAddAgent,
  onUpdateAgent,
  onAddExpense,
  onUpdateExpense,
  onDeleteRecord
}) => {
  const { areas, buildings, wings, flats, papers, agents, subscriptions, expenses } = state;
  const [activeTab, setActiveTab] = useState<ActiveSubTab>('areas');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [masterSearch, setMasterSearch] = useState('');

  const triggerSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // Which record (if any) is currently being edited per entity type
  const [editingAreaId, setEditingAreaId] = useState<string | null>(null);
  const [editingBuildingId, setEditingBuildingId] = useState<string | null>(null);
  const [editingWingId, setEditingWingId] = useState<string | null>(null);
  const [editingFlatId, setEditingFlatId] = useState<string | null>(null);
  const [editingPaperRecordId, setEditingPaperRecordId] = useState<string | null>(null);
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);

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
  const [paperEffectiveFrom, setPaperEffectiveFrom] = useState(todayStr());
  const [expandedPaperId, setExpandedPaperId] = useState<string | null>(null);

  const [agentName, setAgentName] = useState('');
  const [agentPhone, setAgentPhone] = useState('');
  const [agentAreaId, setAgentAreaId] = useState('');
  const [agentCommissionType, setAgentCommissionType] = useState<CommissionType>('PER_PAPER');
  const [agentCommissionRate, setAgentCommissionRate] = useState('');

  const [expenseCategory, setExpenseCategory] = useState<ExpenseCategory>('OTHER');
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(todayStr());
  const [expenseAgentId, setExpenseAgentId] = useState('');

  // CSV import
  const [showImportModal, setShowImportModal] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const csvFileInputRef = useRef<HTMLInputElement>(null);

  // --- Submit handlers - all synchronous now (this is local data, there's no backend
  // latency to reflect), so actions apply immediately instead of behind a fake delay. ---

  const handleAddAreaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!areaName.trim()) return;

    let ok: boolean;
    if (editingAreaId) {
      ok = onUpdateArea(editingAreaId, { name: areaName.trim() });
      if (ok) { setEditingAreaId(null); triggerSuccess(`Successfully updated Area: ${areaName.trim()}`); }
    } else {
      const newArea: Area = { id: `area_${Date.now()}`, name: areaName.trim() };
      ok = onAddArea(newArea);
      if (ok) triggerSuccess(`Successfully added Area: ${newArea.name}`);
    }
    if (ok) setAreaName('');
  };

  const startEditArea = (area: Area) => { setEditingAreaId(area.id); setAreaName(area.name); };
  const cancelEditArea = () => { setEditingAreaId(null); setAreaName(''); };

  const handleAddBuildingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!buildingName.trim() || !buildingAreaId) return;

    let ok: boolean;
    if (editingBuildingId) {
      ok = onUpdateBuilding(editingBuildingId, { name: buildingName.trim(), areaId: buildingAreaId });
      if (ok) { setEditingBuildingId(null); triggerSuccess(`Successfully updated Building: ${buildingName.trim()}`); }
    } else {
      const newBuilding: Building = { id: `b_${Date.now()}`, areaId: buildingAreaId, name: buildingName.trim() };
      ok = onAddBuilding(newBuilding);
      if (ok) triggerSuccess(`Successfully added Building: ${newBuilding.name}`);
    }
    if (ok) setBuildingName('');
  };

  const startEditBuilding = (building: Building) => {
    setEditingBuildingId(building.id);
    setBuildingName(building.name);
    setBuildingAreaId(building.areaId);
  };
  const cancelEditBuilding = () => { setEditingBuildingId(null); setBuildingName(''); };

  const handleAddWingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wingName.trim() || !wingBuildingId) return;

    let ok: boolean;
    if (editingWingId) {
      ok = onUpdateWing(editingWingId, { name: wingName.trim(), buildingId: wingBuildingId });
      if (ok) { setEditingWingId(null); triggerSuccess(`Successfully updated Wing: ${wingName.trim()}`); }
    } else {
      const newWing: Wing = { id: `w_${Date.now()}`, buildingId: wingBuildingId, name: wingName.trim() };
      ok = onAddWing(newWing);
      if (ok) triggerSuccess(`Successfully added Wing: ${newWing.name}`);
    }
    if (ok) setWingName('');
  };

  const startEditWing = (wing: Wing) => {
    setEditingWingId(wing.id);
    setWingName(wing.name);
    setWingBuildingId(wing.buildingId);
  };
  const cancelEditWing = () => { setEditingWingId(null); setWingName(''); };

  const handleAddFlatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!flatNumber.trim() || !flatCustomerName.trim() || !flatPhone.trim() || !flatWingId || flatPaperConfigs.length === 0) return;

    const flatUpdates = {
      wingId: flatWingId,
      flatNumber: flatNumber.trim(),
      customerName: flatCustomerName.trim(),
      phoneNumber: flatPhone.trim(),
      ledgerType: ledgerType
    };

    let ok: boolean;
    if (editingFlatId) {
      ok = onUpdateFlat(editingFlatId, flatUpdates, flatPaperConfigs);
      if (ok) { setEditingFlatId(null); triggerSuccess(`Successfully updated Customer: ${flatUpdates.customerName} (Flat ${flatUpdates.flatNumber})`); }
    } else {
      const newFlat: Flat = { id: `f_${Date.now()}`, activeYear: new Date().getFullYear(), ...flatUpdates };
      ok = onAddFlat(newFlat, flatPaperConfigs);
      if (ok) triggerSuccess(`Successfully registered Customer: ${newFlat.customerName} (Flat ${newFlat.flatNumber})`);
    }

    if (ok) {
      setFlatNumber(''); setFlatCustomerName(''); setFlatPhone(''); setFlatPaperConfigs([]);
      setLedgerType('SUBSCRIPTION'); setBillingFromDate(''); setBillingToDate('');
    }
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
    setFlatNumber(''); setFlatCustomerName(''); setFlatPhone(''); setFlatPaperConfigs([]);
    setLedgerType('SUBSCRIPTION');
  };

  const handleConfirmBillingDates = (e: React.FormEvent) => {
    e.preventDefault();
    if (!configuringPaperId) return;

    setFlatPaperConfigs(prev => {
      const existingIdx = prev.findIndex(c => c.paperId === configuringPaperId);
      const next = { paperId: configuringPaperId, fromDate: billingFromDate, toDate: billingToDate };
      if (existingIdx >= 0) { const copy = [...prev]; copy[existingIdx] = next; return copy; }
      return [...prev, next];
    });

    setShowDatePopup(false);
    setConfiguringPaperId(null);
    setBillingFromDate('');
    setBillingToDate('');
  };

  const handleCancelDatePopup = () => {
    setShowDatePopup(false);
    if (configuringPaperId) {
      setFlatPaperConfigs(prev => prev.filter(c => c.paperId !== configuringPaperId || (c.fromDate && c.toDate)));
    }
    setConfiguringPaperId(null);
    setBillingFromDate('');
    setBillingToDate('');
  };

  const handlePaperCheckbox = (paperId: string) => {
    const isConfigured = flatPaperConfigs.some(c => c.paperId === paperId);

    if (isConfigured) {
      setFlatPaperConfigs(flatPaperConfigs.filter(c => c.paperId !== paperId));
    } else if (ledgerType === 'BILLING') {
      setConfiguringPaperId(paperId);
      setShowDatePopup(true);
    } else {
      setFlatPaperConfigs(prev => [...prev, { paperId }]);
    }
  };

  // --- CSV bulk import ---
  const handleDownloadTemplate = async () => {
    await shareOrDownloadFile(buildImportTemplate(), 'PaperTrack_Customer_Import_Template.csv', 'text/csv', 'Customer Import Template');
  };

  const handleImportFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImportPreview(parseCustomerCsv(reader.result as string, state));
    reader.readAsText(file);
  };

  const handleConfirmImport = () => {
    if (!importPreview || importPreview.validRows.length === 0) return;
    const ok = onImportCustomers(importPreview.validRows);
    if (ok) {
      triggerSuccess(`Imported ${importPreview.validRows.length} customer${importPreview.validRows.length === 1 ? '' : 's'}.`);
      setShowImportModal(false);
      setImportPreview(null);
    }
  };

  // --- Papers: rate changes push history instead of overwriting in place ---
  const handleAddPaperSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const rateNum = parseFloat(paperRate);
    if (!paperName.trim() || isNaN(rateNum)) return;

    let ok: boolean;
    if (editingPaperRecordId) {
      const existing = papers.find(p => p.id === editingPaperRecordId);
      ok = onUpdatePaperName(editingPaperRecordId, paperName.trim());
      if (ok && existing && existing.ratePerDay !== rateNum) {
        onUpdatePaperRate(editingPaperRecordId, rateNum, paperEffectiveFrom || todayStr());
      }
      if (ok) { setEditingPaperRecordId(null); triggerSuccess(`Successfully updated Newspaper Rate Card: ${paperName.trim()}`); }
    } else {
      const newPaper: Paper = {
        id: `p_${Date.now()}`,
        name: paperName.trim(),
        ratePerDay: rateNum,
        rateHistory: [{ rate: rateNum, effectiveFrom: '2000-01-01' }]
      };
      ok = onAddPaper(newPaper);
      if (ok) triggerSuccess(`Successfully added Newspaper Rate Card: ${newPaper.name}`);
    }
    if (ok) { setPaperName(''); setPaperRate(''); setPaperEffectiveFrom(todayStr()); }
  };

  const startEditPaper = (paper: Paper) => {
    setEditingPaperRecordId(paper.id);
    setPaperName(paper.name);
    setPaperRate(String(paper.ratePerDay));
    setPaperEffectiveFrom(todayStr());
  };
  const cancelEditPaper = () => { setEditingPaperRecordId(null); setPaperName(''); setPaperRate(''); };

  // --- Agents ---
  const handleAddAgentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentName.trim() || !agentPhone.trim() || !agentAreaId) return;
    const rate = parseFloat(agentCommissionRate);

    const commissionFields = {
      commissionType: agentCommissionType,
      commissionRate: isNaN(rate) ? 0 : rate
    };

    let ok: boolean;
    if (editingAgentId) {
      ok = onUpdateAgent(editingAgentId, { name: agentName.trim(), phone: agentPhone.trim(), assignedAreaId: agentAreaId, ...commissionFields });
      if (ok) { setEditingAgentId(null); triggerSuccess(`Successfully updated Delivery Agent: ${agentName.trim()}`); }
    } else {
      const newAgent: DeliveryAgent = { id: `a_${Date.now()}`, name: agentName.trim(), phone: agentPhone.trim(), assignedAreaId: agentAreaId, ...commissionFields };
      ok = onAddAgent(newAgent);
      if (ok) triggerSuccess(`Registered Delivery Agent: ${newAgent.name}`);
    }
    if (ok) { setAgentName(''); setAgentPhone(''); setAgentCommissionType('PER_PAPER'); setAgentCommissionRate(''); }
  };

  const startEditAgent = (agent: DeliveryAgent) => {
    setEditingAgentId(agent.id);
    setAgentName(agent.name);
    setAgentPhone(agent.phone);
    setAgentAreaId(agent.assignedAreaId);
    setAgentCommissionType(agent.commissionType || 'PER_PAPER');
    setAgentCommissionRate(agent.commissionRate !== undefined ? String(agent.commissionRate) : '');
  };
  const cancelEditAgent = () => { setEditingAgentId(null); setAgentName(''); setAgentPhone(''); };

  // --- Expenses ---
  const handleAddExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(expenseAmount);
    if (!expenseDescription.trim() || isNaN(amount) || amount <= 0 || !expenseDate) return;

    const fields = {
      category: expenseCategory,
      description: expenseDescription.trim(),
      amount,
      date: expenseDate,
      agentId: expenseAgentId || undefined
    };

    let ok: boolean;
    if (editingExpenseId) {
      ok = onUpdateExpense(editingExpenseId, fields);
      if (ok) { setEditingExpenseId(null); triggerSuccess('Successfully updated expense.'); }
    } else {
      ok = onAddExpense({ id: `exp_${Date.now()}`, ...fields });
      if (ok) triggerSuccess('Successfully logged expense.');
    }
    if (ok) { setExpenseDescription(''); setExpenseAmount(''); setExpenseDate(todayStr()); setExpenseAgentId(''); setExpenseCategory('OTHER'); }
  };

  const startEditExpense = (expense: Expense) => {
    setEditingExpenseId(expense.id);
    setExpenseCategory(expense.category);
    setExpenseDescription(expense.description);
    setExpenseAmount(String(expense.amount));
    setExpenseDate(expense.date);
    setExpenseAgentId(expense.agentId || '');
  };
  const cancelEditExpense = () => { setEditingExpenseId(null); setExpenseDescription(''); setExpenseAmount(''); };

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
  const filteredExpensesList = useMemo(() => {
    const sorted = [...expenses].sort((a, b) => b.date.localeCompare(a.date));
    return !q ? sorted : sorted.filter(e => e.description.toLowerCase().includes(q) || EXPENSE_CATEGORY_LABEL[e.category].toLowerCase().includes(q));
  }, [expenses, q]);

  const windowedFlats = useWindowedList(filteredFlatsList, 40);

  const searchPlaceholders: Record<ActiveSubTab, string> = {
    areas: 'Search areas...',
    buildings: 'Search buildings...',
    wings: 'Search wings...',
    flats: 'Search customer name, flat no, or phone...',
    papers: 'Search newspapers...',
    agents: 'Search agents by name or phone...',
    expenses: 'Search expenses...'
  };

  // Tab configurations
  const tabs = [
    { key: 'areas', label: '1. Areas', icon: MapPin, count: areas.length },
    { key: 'buildings', label: '2. Buildings', icon: Building2, count: buildings.length },
    { key: 'wings', label: '3. Wings', icon: Layers, count: wings.length },
    { key: 'flats', label: '4. Customer Flats', icon: Home, count: flats.length },
    { key: 'papers', label: 'Paper Masters', icon: Newspaper, count: papers.length },
    { key: 'agents', label: 'Delivery Agents', icon: Users, count: agents.length },
    { key: 'expenses', label: 'Expenses', icon: Wallet, count: expenses.length },
  ] as const;

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
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-sm overflow-hidden animate-fade-in">
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
                  <button type="button" onClick={cancelEditArea} className="px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer">
                    Cancel
                  </button>
                )}
                <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-semibold py-2.5 rounded-xl flex items-center justify-center gap-1 cursor-pointer">
                  {editingAreaId ? <CheckCircle2 size={14} /> : <Plus size={14} />}
                  {editingAreaId ? 'Update Area' : 'Add Area'}
                </button>
              </div>
            </form>

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
                    <RecordActions onEdit={() => startEditArea(a)} onDelete={() => onDeleteRecord('area', a.id)} editTitle="Edit Area" deleteTitle="Delete Area (Cascades downstream!)" />
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

            <form onSubmit={handleAddBuildingSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
              <div>
                <label htmlFor="building-area" className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Parent Area</label>
                <select id="building-area" value={buildingAreaId} onChange={(e) => setBuildingAreaId(e.target.value)} className="w-full text-xs px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl focus:outline-none dark:text-slate-100 cursor-pointer">
                  {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="building-name" className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Building Name</label>
                <input id="building-name" type="text" placeholder="e.g. Apex Tower B" value={buildingName} onChange={(e) => setBuildingName(e.target.value)} className="w-full text-xs px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:text-slate-100" />
              </div>
              <div className="flex items-center gap-2">
                {editingBuildingId && (
                  <button type="button" onClick={cancelEditBuilding} className="px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer">
                    Cancel
                  </button>
                )}
                <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-semibold py-2.5 rounded-xl flex items-center justify-center gap-1 cursor-pointer">
                  {editingBuildingId ? <CheckCircle2 size={14} /> : <Plus size={14} />}
                  {editingBuildingId ? 'Update Building' : 'Add Building'}
                </button>
              </div>
            </form>

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
                      <RecordActions onEdit={() => startEditBuilding(b)} onDelete={() => onDeleteRecord('building', b.id)} editTitle="Edit Building" deleteTitle="Delete Building" />
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

            <form onSubmit={handleAddWingSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
              <div>
                <label htmlFor="wing-building" className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Parent Building</label>
                <select id="wing-building" value={wingBuildingId} onChange={(e) => setWingBuildingId(e.target.value)} className="w-full text-xs px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl focus:outline-none dark:text-slate-100 cursor-pointer">
                  {buildings.map(b => <option key={b.id} value={b.id}>{b.name} ({areas.find(a => a.id === b.areaId)?.name})</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="wing-name" className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Wing Name</label>
                <input id="wing-name" type="text" placeholder="e.g. Wing C" value={wingName} onChange={(e) => setWingName(e.target.value)} className="w-full text-xs px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:text-slate-100" />
              </div>
              <div className="flex items-center gap-2">
                {editingWingId && (
                  <button type="button" onClick={cancelEditWing} className="px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer">
                    Cancel
                  </button>
                )}
                <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-semibold py-2.5 rounded-xl flex items-center justify-center gap-1 cursor-pointer">
                  {editingWingId ? <CheckCircle2 size={14} /> : <Plus size={14} />}
                  {editingWingId ? 'Update Wing' : 'Add Wing'}
                </button>
              </div>
            </form>

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
                      <RecordActions onEdit={() => startEditWing(w)} onDelete={() => onDeleteRecord('wing', w.id)} editTitle="Edit Wing" deleteTitle="Delete Wing" />
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
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 flex-wrap gap-2">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Home className="text-emerald-500" size={18} /> Customer Flats (Level 4 Hierarchy - Subscription Ledger)
              </h3>
              <button
                onClick={() => setShowImportModal(true)}
                className="text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl px-3.5 py-2 flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Upload size={14} /> Import CSV
              </button>
            </div>

            <form onSubmit={handleAddFlatSubmit} className="space-y-4 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-150 dark:border-slate-800">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                {editingFlatId ? 'Edit Flat Ledger' : 'Register New Flat Ledger'}
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="flat-wing" className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Parent Wing Hierarchy</label>
                  <select id="flat-wing" value={flatWingId} onChange={(e) => setFlatWingId(e.target.value)} className="w-full text-xs px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none dark:text-slate-100 cursor-pointer">
                    {wings.map(w => {
                      const b = buildings.find(bld => bld.id === w.buildingId);
                      const a = b ? areas.find(area => area.id === b.areaId) : null;
                      return <option key={w.id} value={w.id}>{a?.name} ➔ {b?.name} ➔ {w.name}</option>;
                    })}
                  </select>
                </div>

                <div>
                  <label htmlFor="flat-number" className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Flat Number</label>
                  <input id="flat-number" type="text" placeholder="e.g. 501" value={flatNumber} onChange={(e) => setFlatNumber(e.target.value)} className="w-full text-xs px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:text-slate-100" />
                </div>

                <div>
                  <label htmlFor="flat-customer-name" className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Customer Full Name</label>
                  <input id="flat-customer-name" type="text" placeholder="e.g. Anand Sharma" value={flatCustomerName} onChange={(e) => setFlatCustomerName(e.target.value)} className="w-full text-xs px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:text-slate-100" />
                </div>

                <div>
                  <label htmlFor="flat-phone" className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">WhatsApp / Contact Phone</label>
                  <input id="flat-phone" type="text" placeholder="e.g. +91 98234 56789" value={flatPhone} onChange={(e) => setFlatPhone(e.target.value)} className="w-full text-xs px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:text-slate-100" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Registration Ledger Type</label>
                  <div className="flex bg-white dark:bg-slate-800 rounded-xl p-1 border border-slate-200 dark:border-slate-700">
                    <button type="button" onClick={() => setLedgerType('SUBSCRIPTION')} className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${ledgerType === 'SUBSCRIPTION' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-400'}`}>
                      Subscription
                    </button>
                    <button type="button" onClick={() => setLedgerType('BILLING')} className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${ledgerType === 'BILLING' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400'}`}>
                      Billing (Timed)
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">Select Subscribed Newspapers (Select at least one)</label>
                <div className="flex flex-wrap gap-4 bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-150 dark:border-slate-700">
                  {papers.map((p) => {
                    const config = flatPaperConfigs.find(c => c.paperId === p.id);
                    const isChecked = !!config;
                    return (
                      <div key={p.id} className="flex flex-col gap-1">
                        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                          <input type="checkbox" checked={isChecked} onChange={() => handlePaperCheckbox(p.id)} className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer" />
                          <span>{p.name} (₹{p.ratePerDay}/d)</span>
                        </label>
                        {config && config.fromDate && config.toDate && (
                          <div className="ml-6 text-[9px] text-emerald-500 font-bold uppercase">{config.fromDate} to {config.toDate}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {editingFlatId && (
                  <button type="button" onClick={cancelEditFlat} className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer">
                    Cancel
                  </button>
                )}
                <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl flex items-center gap-1 cursor-pointer transition-colors">
                  {editingFlatId ? <CheckCircle2 size={14} /> : <Plus size={14} />}
                  {editingFlatId ? 'Update Customer Ledger & Subscriptions' : 'Register Customer Ledger & Subscriptions'}
                </button>
              </div>
            </form>

            <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden max-h-[420px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              {filteredFlatsList.length === 0 ? (
                <p className="text-center text-xs text-slate-400 py-8">No customer flats found.</p>
              ) : (
                <>
                {windowedFlats.visible.map((f) => {
                  const wing = wings.find(w => w.id === f.wingId);
                  const b = wing ? buildings.find(bld => bld.id === wing.buildingId) : null;
                  const a = b ? areas.find(ar => ar.id === b.areaId) : null;
                  const subs = subscriptions.filter(s => s.flatId === f.id && s.active);
                  const paperNames = papers.filter(p => subs.some(s => s.paperId === p.id)).map(p => p.name).join(', ');

                  return (
                    <div key={f.id} className="flex items-start justify-between gap-3 p-3.5 hover:bg-slate-50/50 dark:hover:bg-slate-950/20">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded text-[11px] font-bold shrink-0">{f.flatNumber}</span>
                          <p className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">{f.customerName}</p>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">{f.phoneNumber}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{a?.name} {" ➔ "} {b?.name} {" ➔ "} {wing?.name}</p>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium italic mt-1">{paperNames || 'No papers'}</p>
                      </div>
                      <RecordActions onEdit={() => startEditFlat(f)} onDelete={() => onDeleteRecord('flat', f.id)} editTitle="Edit Customer" deleteTitle="Delete Customer" />
                    </div>
                  );
                })}
                {windowedFlats.hasMore && (
                  <div ref={windowedFlats.sentinelRef} className="p-3 text-center text-[11px] text-slate-400">Loading {windowedFlats.remaining} more...</div>
                )}
                </>
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

            <form onSubmit={handleAddPaperSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
              <div>
                <label htmlFor="paper-name" className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Newspaper Name</label>
                <input id="paper-name" type="text" placeholder="e.g. Financial Times" value={paperName} onChange={(e) => setPaperName(e.target.value)} className="w-full text-xs px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:text-slate-100" />
              </div>
              <div>
                <label htmlFor="paper-rate" className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Daily Rate (₹)</label>
                <input id="paper-rate" type="text" placeholder="e.g. 7.50" value={paperRate} onChange={(e) => setPaperRate(e.target.value)} className="w-full text-xs px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:text-slate-100" />
              </div>
              {editingPaperRecordId && (
                <div>
                  <label htmlFor="paper-effective-from" className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Rate Effective From</label>
                  <input id="paper-effective-from" type="date" value={paperEffectiveFrom} onChange={(e) => setPaperEffectiveFrom(e.target.value)} className="w-full text-xs px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:text-slate-100" />
                </div>
              )}
              <div className="flex items-center gap-2">
                {editingPaperRecordId && (
                  <button type="button" onClick={cancelEditPaper} className="px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer">
                    Cancel
                  </button>
                )}
                <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-semibold py-2.5 rounded-xl flex items-center justify-center gap-1 cursor-pointer">
                  {editingPaperRecordId ? <CheckCircle2 size={14} /> : <Plus size={14} />}
                  {editingPaperRecordId ? 'Update Newspaper' : 'Add Newspaper'}
                </button>
              </div>
            </form>
            {editingPaperRecordId && (
              <p className="text-[11px] text-slate-400 dark:text-slate-500 -mt-2">
                A changed rate is recorded as a new price effective from the date above - bills already issued before that date are unaffected.
              </p>
            )}

            <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
              {filteredPapersList.length === 0 ? (
                <p className="text-center text-xs text-slate-400 py-8">No newspapers found.</p>
              ) : (
                filteredPapersList.map((p) => {
                  const isExpanded = expandedPaperId === p.id;
                  const history = [...p.rateHistory].sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
                  return (
                    <div key={p.id}>
                      <div className="flex items-center justify-between gap-3 p-3.5 hover:bg-slate-50/50 dark:hover:bg-slate-950/20">
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">{p.name}</p>
                          <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">₹{p.ratePerDay.toFixed(2)} / day</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {history.length > 1 && (
                            <button
                              onClick={() => setExpandedPaperId(isExpanded ? null : p.id)}
                              title="Rate history"
                              className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                            >
                              <History size={16} />
                              {isExpanded ? <ChevronUp size={12} className="ml-0.5" /> : <ChevronDown size={12} className="ml-0.5" />}
                            </button>
                          )}
                          <RecordActions onEdit={() => startEditPaper(p)} onDelete={() => onDeleteRecord('paper', p.id)} editTitle="Edit Newspaper" deleteTitle="Delete Newspaper" />
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="px-3.5 pb-3.5">
                          <div className="bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-100 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                            {history.map((h, idx) => (
                              <div key={idx} className="flex items-center justify-between px-3.5 py-2 text-[11px]">
                                <span className="text-slate-500 dark:text-slate-400">Effective from {h.effectiveFrom === '2000-01-01' ? 'the beginning' : h.effectiveFrom}</span>
                                <span className="font-bold text-slate-700 dark:text-slate-300">₹{h.rate.toFixed(2)}/day</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
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

            <form onSubmit={handleAddAgentSubmit} className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="agent-name" className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Agent Full Name</label>
                  <input id="agent-name" type="text" placeholder="e.g. Raju Patil" value={agentName} onChange={(e) => setAgentName(e.target.value)} className="w-full text-xs px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:text-slate-100" />
                </div>
                <div>
                  <label htmlFor="agent-phone" className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">WhatsApp Mobile</label>
                  <input id="agent-phone" type="text" placeholder="e.g. +91 99000 88777" value={agentPhone} onChange={(e) => setAgentPhone(e.target.value)} className="w-full text-xs px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:text-slate-100" />
                </div>
                <div>
                  <label htmlFor="agent-area" className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Assigned Area</label>
                  <select id="agent-area" value={agentAreaId} onChange={(e) => setAgentAreaId(e.target.value)} className="w-full text-xs px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl focus:outline-none dark:text-slate-100 cursor-pointer">
                    {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                <div>
                  <label htmlFor="agent-commission-type" className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Commission Type</label>
                  <select id="agent-commission-type" value={agentCommissionType} onChange={(e) => setAgentCommissionType(e.target.value as CommissionType)} className="w-full text-xs px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl focus:outline-none dark:text-slate-100 cursor-pointer">
                    {(Object.keys(COMMISSION_LABEL) as CommissionType[]).map(t => <option key={t} value={t}>{COMMISSION_LABEL[t]}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="agent-commission-rate" className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Rate</label>
                  <input id="agent-commission-rate" type="text" placeholder={agentCommissionType === 'PERCENTAGE' ? 'e.g. 12' : 'e.g. 0.75'} value={agentCommissionRate} onChange={(e) => setAgentCommissionRate(e.target.value)} className="w-full text-xs px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:text-slate-100" />
                </div>
                <div className="flex items-center gap-2">
                  {editingAgentId && (
                    <button type="button" onClick={cancelEditAgent} className="px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer">
                      Cancel
                    </button>
                  )}
                  <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-semibold py-2.5 rounded-xl flex items-center justify-center gap-1 cursor-pointer">
                    {editingAgentId ? <CheckCircle2 size={14} /> : <Plus size={14} />}
                    {editingAgentId ? 'Update Agent' : 'Register Agent'}
                  </button>
                </div>
              </div>
            </form>

            <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
              {filteredAgentsList.length === 0 ? (
                <p className="text-center text-xs text-slate-400 py-8">No delivery agents found.</p>
              ) : (
                filteredAgentsList.map((a) => {
                  const area = areas.find(ar => ar.id === a.assignedAreaId);
                  const type = a.commissionType || 'PER_PAPER';
                  const rate = a.commissionRate ?? 0;
                  return (
                    <div key={a.id} className="flex items-center justify-between gap-3 p-3.5 hover:bg-slate-50/50 dark:hover:bg-slate-950/20">
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">{a.name}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{a.phone}</p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold mt-0.5">{area?.name || 'Floating Agent'}</p>
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                          {type === 'PER_PAPER' && `₹${rate}/paper`}
                          {type === 'PERCENTAGE' && `${rate}% of collections`}
                          {type === 'FIXED_MONTHLY' && `₹${rate}/month`}
                        </p>
                      </div>
                      <RecordActions onEdit={() => startEditAgent(a)} onDelete={() => onDeleteRecord('agent', a.id)} editTitle="Edit Agent" deleteTitle="Unregister Agent" />
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* 7. Expenses */}
        {activeTab === 'expenses' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm p-5 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Wallet className="text-emerald-500" size={18} /> Business Expenses
              </h3>
            </div>

            <form onSubmit={handleAddExpenseSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
              <div>
                <label htmlFor="expense-category" className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Category</label>
                <select id="expense-category" value={expenseCategory} onChange={(e) => setExpenseCategory(e.target.value as ExpenseCategory)} className="w-full text-xs px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl focus:outline-none dark:text-slate-100 cursor-pointer">
                  {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{EXPENSE_CATEGORY_LABEL[c]}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="expense-description" className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Description</label>
                <input id="expense-description" type="text" placeholder="e.g. June stock - wholesale vendor" value={expenseDescription} onChange={(e) => setExpenseDescription(e.target.value)} className="w-full text-xs px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:text-slate-100" />
              </div>
              <div>
                <label htmlFor="expense-amount" className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Amount (₹)</label>
                <input id="expense-amount" type="text" placeholder="e.g. 1500" value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value)} className="w-full text-xs px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:text-slate-100" />
              </div>
              <div>
                <label htmlFor="expense-date" className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Date</label>
                <input id="expense-date" type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} className="w-full text-xs px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:text-slate-100" />
              </div>
              {expenseCategory === 'AGENT_WAGES' && (
                <div>
                  <label htmlFor="expense-agent" className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Agent (optional)</label>
                  <select id="expense-agent" value={expenseAgentId} onChange={(e) => setExpenseAgentId(e.target.value)} className="w-full text-xs px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl focus:outline-none dark:text-slate-100 cursor-pointer">
                    <option value="">None</option>
                    {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              )}
              <div className="flex items-center gap-2 md:col-span-2">
                {editingExpenseId && (
                  <button type="button" onClick={cancelEditExpense} className="px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer">
                    Cancel
                  </button>
                )}
                <button type="submit" className="bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-semibold px-5 py-2.5 rounded-xl flex items-center justify-center gap-1 cursor-pointer">
                  {editingExpenseId ? <CheckCircle2 size={14} /> : <Plus size={14} />}
                  {editingExpenseId ? 'Update Expense' : 'Log Expense'}
                </button>
              </div>
            </form>

            <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
              {filteredExpensesList.length === 0 ? (
                <p className="text-center text-xs text-slate-400 py-8">No expenses logged yet.</p>
              ) : (
                filteredExpensesList.map((e) => {
                  const agent = e.agentId ? agents.find(a => a.id === e.agentId) : null;
                  return (
                    <div key={e.id} className="flex items-center justify-between gap-3 p-3.5 hover:bg-slate-50/50 dark:hover:bg-slate-950/20">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded uppercase">{EXPENSE_CATEGORY_LABEL[e.category]}</span>
                          <p className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">{e.description}</p>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">{e.date}{agent ? ` · ${agent.name}` : ''}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-black text-sm text-rose-600 dark:text-rose-400">₹{e.amount.toFixed(2)}</span>
                        <RecordActions onEdit={() => startEditExpense(e)} onDelete={() => onDeleteRecord('expense', e.id)} editTitle="Edit Expense" deleteTitle="Delete Expense" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* CSV Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-fade-in">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between">
              <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight flex items-center gap-2">
                <FileSpreadsheet className="text-emerald-500" size={18} /> Import Customers from CSV
              </h4>
              <button onClick={() => { setShowImportModal(false); setImportPreview(null); }} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 p-2.5 rounded-xl transition-colors cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              {!importPreview ? (
                <>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Columns: <span className="font-mono">Area, Building, Wing, FlatNumber, CustomerName, Phone, Papers</span> (papers
                    separated by <span className="font-mono">;</span>, e.g. "The Times of India;The Hindu"). Areas/Buildings/Wings
                    that don't already exist are created automatically; papers must already exist under Paper Masters.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={handleDownloadTemplate} className="text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl px-4 py-2.5 flex items-center gap-1.5 cursor-pointer transition-colors">
                      <Download size={14} /> Download Template
                    </button>
                    <button onClick={() => csvFileInputRef.current?.click()} className="text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl px-4 py-2.5 flex items-center gap-1.5 cursor-pointer transition-colors">
                      <Upload size={14} /> Choose CSV File
                    </button>
                    <input ref={csvFileInputRef} type="file" accept=".csv,text/csv" onChange={handleImportFileSelected} className="hidden" />
                  </div>
                </>
              ) : importPreview.headerError ? (
                <div className="flex items-start gap-2 text-xs font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/60 rounded-xl px-3.5 py-3">
                  <AlertTriangle size={16} className="shrink-0 mt-0.5" /> {importPreview.headerError}
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2 text-xs font-bold">
                    <span className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 px-3 py-1.5 rounded-full">{importPreview.validRows.length} valid</span>
                    {importPreview.rows.length - importPreview.validRows.length > 0 && (
                      <span className="bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 px-3 py-1.5 rounded-full">{importPreview.rows.length - importPreview.validRows.length} with errors</span>
                    )}
                    {importPreview.newAreas.length > 0 && <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-3 py-1.5 rounded-full">{importPreview.newAreas.length} new area(s)</span>}
                    {importPreview.newBuildings.length > 0 && <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-3 py-1.5 rounded-full">{importPreview.newBuildings.length} new building(s)</span>}
                  </div>
                  <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden max-h-[40vh] overflow-y-auto">
                    <table className="w-full text-left text-[11px]">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-850 border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase sticky top-0">
                          <th className="py-2 px-3">Line</th>
                          <th className="py-2 px-3">Customer</th>
                          <th className="py-2 px-3">Location</th>
                          <th className="py-2 px-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {importPreview.rows.map((row) => (
                          <tr key={row.lineNumber}>
                            <td className="py-2 px-3 text-slate-400">{row.lineNumber}</td>
                            <td className="py-2 px-3 font-semibold text-slate-700 dark:text-slate-300">{row.customerName || '—'} <span className="text-slate-400 font-normal">({row.flatNumber || '—'})</span></td>
                            <td className="py-2 px-3 text-slate-500 dark:text-slate-400">{row.area} ➔ {row.building} ➔ {row.wing}</td>
                            <td className="py-2 px-3">
                              {row.errors.length === 0 ? (
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1"><CheckCircle2 size={12} /> OK</span>
                              ) : (
                                <span className="text-rose-600 dark:text-rose-400 font-semibold">{row.errors.join('; ')}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setImportPreview(null)} className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer">
                      Choose Different File
                    </button>
                    <button
                      onClick={handleConfirmImport}
                      disabled={importPreview.validRows.length === 0}
                      className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <CheckCircle2 size={16} /> Import {importPreview.validRows.length} Customer{importPreview.validRows.length === 1 ? '' : 's'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
