import React, { useState } from 'react';
import { DatabaseState } from '../data/dummyGenerator';
import { Area, Building, Wing, Flat, Paper, DeliveryAgent, Subscription } from '../types';
import { 
  Plus, 
  MapPin, 
  Building2, 
  Layers, 
  Home, 
  Newspaper, 
  Users, 
  Trash2,
  CheckCircle2
} from 'lucide-react';

interface DataMastersProps {
  state: DatabaseState;
  onAddArea: (area: Area) => void;
  onAddBuilding: (building: Building) => void;
  onAddWing: (wing: Wing) => void;
  onAddFlat: (flat: Flat, papers: string[]) => void;
  onAddPaper: (paper: Paper) => void;
  onAddAgent: (agent: DeliveryAgent) => void;
  onDeleteRecord: (category: 'area' | 'building' | 'wing' | 'flat' | 'paper' | 'agent', id: string) => void;
}

type ActiveSubTab = 'areas' | 'buildings' | 'wings' | 'flats' | 'papers' | 'agents';

export const DataMasters: React.FC<DataMastersProps> = ({
  state,
  onAddArea,
  onAddBuilding,
  onAddWing,
  onAddFlat,
  onAddPaper,
  onAddAgent,
  onDeleteRecord
}) => {
  const { areas, buildings, wings, flats, papers, agents, subscriptions } = state;
  const [activeTab, setActiveTab] = useState<ActiveSubTab>('areas');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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
  const [flatSelectedPapers, setFlatSelectedPapers] = useState<string[]>([]);

  const [paperName, setPaperName] = useState('');
  const [paperRate, setPaperRate] = useState('');

  const [agentName, setAgentName] = useState('');
  const [agentPhone, setAgentPhone] = useState('');
  const [agentAreaId, setAgentAreaId] = useState('');

  const triggerSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // Submit handlers
  const handleAddAreaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!areaName.trim()) return;
    const newArea: Area = {
      id: `area_${Date.now()}`,
      name: areaName.trim()
    };
    onAddArea(newArea);
    setAreaName('');
    triggerSuccess(`Successfully added Area: ${newArea.name}`);
  };

  const handleAddBuildingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!buildingName.trim() || !buildingAreaId) return;
    const newBuilding: Building = {
      id: `b_${Date.now()}`,
      areaId: buildingAreaId,
      name: buildingName.trim()
    };
    onAddBuilding(newBuilding);
    setBuildingName('');
    triggerSuccess(`Successfully added Building: ${newBuilding.name}`);
  };

  const handleAddWingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wingName.trim() || !wingBuildingId) return;
    const newWing: Wing = {
      id: `w_${Date.now()}`,
      buildingId: wingBuildingId,
      name: wingName.trim()
    };
    onAddWing(newWing);
    setWingName('');
    triggerSuccess(`Successfully added Wing: ${newWing.name}`);
  };

  const handleAddFlatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!flatNumber.trim() || !flatCustomerName.trim() || !flatPhone.trim() || !flatWingId || flatSelectedPapers.length === 0) return;
    const newFlat: Flat = {
      id: `f_${Date.now()}`,
      wingId: flatWingId,
      flatNumber: flatNumber.trim(),
      customerName: flatCustomerName.trim(),
      phoneNumber: flatPhone.trim(),
      activeYear: 2026
    };
    onAddFlat(newFlat, flatSelectedPapers);
    setFlatNumber('');
    setFlatCustomerName('');
    setFlatPhone('');
    setFlatSelectedPapers([]);
    triggerSuccess(`Successfully registered Customer: ${newFlat.customerName} (Flat ${newFlat.flatNumber})`);
  };

  const handleAddPaperSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const rateNum = parseFloat(paperRate);
    if (!paperName.trim() || isNaN(rateNum)) return;
    const newPaper: Paper = {
      id: `p_${Date.now()}`,
      name: paperName.trim(),
      ratePerDay: rateNum
    };
    onAddPaper(newPaper);
    setPaperName('');
    setPaperRate('');
    triggerSuccess(`Successfully added Newspaper Rate Card: ${newPaper.name}`);
  };

  const handleAddAgentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentName.trim() || !agentPhone.trim() || !agentAreaId) return;
    const newAgent: DeliveryAgent = {
      id: `a_${Date.now()}`,
      name: agentName.trim(),
      phone: agentPhone.trim(),
      assignedAreaId: agentAreaId
    };
    onAddAgent(newAgent);
    setAgentName('');
    setAgentPhone('');
    triggerSuccess(`Registered Delivery Agent: ${newAgent.name}`);
  };

  const handlePaperCheckbox = (paperId: string) => {
    if (flatSelectedPapers.includes(paperId)) {
      setFlatSelectedPapers(flatSelectedPapers.filter(id => id !== paperId));
    } else {
      setFlatSelectedPapers([...flatSelectedPapers, paperId]);
    }
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
                // Set defaults for selects if empty
                if (tab.key === 'buildings' && !buildingAreaId && areas[0]) setBuildingAreaId(areas[0].id);
                if (tab.key === 'wings' && !wingBuildingId && buildings[0]) setWingBuildingId(buildings[0].id);
                if (tab.key === 'flats' && !flatWingId && wings[0]) setFlatWingId(wings[0].id);
                if (tab.key === 'agents' && !agentAreaId && areas[0]) setAgentAreaId(areas[0].id);
              }}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                isActive 
                  ? 'bg-slate-900 dark:bg-slate-800 text-white shadow-sm' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <span className="flex items-center gap-2">
                <Icon size={14} className={isActive ? 'text-emerald-400' : 'text-slate-400'} />
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
      <div className="lg:col-span-3 space-y-6">
        {successMsg && (
          <div className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 px-4 py-3 rounded-xl border border-emerald-100 dark:border-emerald-900/60 flex items-center gap-2 text-xs font-semibold shadow-sm animate-fade-in">
            <CheckCircle2 size={16} className="text-emerald-500" />
            <span>{successMsg}</span>
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
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">New Area Name</label>
                <input
                  type="text"
                  placeholder="e.g. Highland Boulevard"
                  value={areaName}
                  onChange={(e) => setAreaName(e.target.value)}
                  className="w-full text-xs px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:text-slate-100"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-semibold py-2.5 rounded-xl flex items-center justify-center gap-1 cursor-pointer"
              >
                <Plus size={14} /> Add Area
              </button>
            </form>

            {/* List Areas */}
            <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-850 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase border-b border-slate-100 dark:border-slate-800">
                    <th className="py-2.5 px-4">Area ID</th>
                    <th className="py-2.5 px-4">Area Name</th>
                    <th className="py-2.5 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {areas.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20">
                      <td className="py-2.5 px-4 font-mono text-[10px] text-slate-400">{a.id}</td>
                      <td className="py-2.5 px-4 font-bold text-slate-800 dark:text-slate-200">{a.name}</td>
                      <td className="py-2.5 px-4 text-center">
                        <button
                          onClick={() => onDeleteRecord('area', a.id)}
                          className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 p-1.5 rounded-lg transition-colors cursor-pointer"
                          title="Delete Area (Cascades downstream!)"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Parent Area</label>
                <select
                  value={buildingAreaId}
                  onChange={(e) => setBuildingAreaId(e.target.value)}
                  className="w-full text-xs px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl focus:outline-none dark:text-slate-100 cursor-pointer"
                >
                  {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Building Name</label>
                <input
                  type="text"
                  placeholder="e.g. Apex Tower B"
                  value={buildingName}
                  onChange={(e) => setBuildingName(e.target.value)}
                  className="w-full text-xs px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:text-slate-100"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-semibold py-2.5 rounded-xl flex items-center justify-center gap-1 cursor-pointer"
              >
                <Plus size={14} /> Add Building
              </button>
            </form>

            {/* List Buildings */}
            <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-850 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase border-b border-slate-100 dark:border-slate-800">
                    <th className="py-2.5 px-4">Building ID</th>
                    <th className="py-2.5 px-4">Building Name</th>
                    <th className="py-2.5 px-4">Assigned Area</th>
                    <th className="py-2.5 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {buildings.map((b) => {
                    const area = areas.find(a => a.id === b.areaId);
                    return (
                      <tr key={b.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20">
                        <td className="py-2.5 px-4 font-mono text-[10px] text-slate-400">{b.id}</td>
                        <td className="py-2.5 px-4 font-bold text-slate-800 dark:text-slate-200">{b.name}</td>
                        <td className="py-2.5 px-4 text-slate-500 dark:text-slate-400">{area?.name || 'Unknown Area'}</td>
                        <td className="py-2.5 px-4 text-center">
                          <button
                            onClick={() => onDeleteRecord('building', b.id)}
                            className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 p-1.5 rounded-lg transition-colors cursor-pointer"
                            title="Delete Building"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Parent Building</label>
                <select
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
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Wing Name</label>
                <input
                  type="text"
                  placeholder="e.g. Wing C"
                  value={wingName}
                  onChange={(e) => setWingName(e.target.value)}
                  className="w-full text-xs px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:text-slate-100"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-semibold py-2.5 rounded-xl flex items-center justify-center gap-1 cursor-pointer"
              >
                <Plus size={14} /> Add Wing
              </button>
            </form>

            {/* List Wings */}
            <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-850 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase border-b border-slate-100 dark:border-slate-800">
                    <th className="py-2.5 px-4">Wing ID</th>
                    <th className="py-2.5 px-4">Wing Name</th>
                    <th className="py-2.5 px-4">Assigned Building</th>
                    <th className="py-2.5 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {wings.map((w) => {
                    const building = buildings.find(b => b.id === w.buildingId);
                    return (
                      <tr key={w.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20">
                        <td className="py-2.5 px-4 font-mono text-[10px] text-slate-400">{w.id}</td>
                        <td className="py-2.5 px-4 font-bold text-slate-800 dark:text-slate-200">{w.name}</td>
                        <td className="py-2.5 px-4 text-slate-500 dark:text-slate-400">{building?.name || 'Unknown Building'}</td>
                        <td className="py-2.5 px-4 text-center">
                          <button
                            onClick={() => onDeleteRecord('wing', w.id)}
                            className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 p-1.5 rounded-lg transition-colors cursor-pointer"
                            title="Delete Wing"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Register New Flat Ledger (Year 2026 Active)</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Parent Wing Hierarchy</label>
                  <select
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
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Flat Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 501"
                    value={flatNumber}
                    onChange={(e) => setFlatNumber(e.target.value)}
                    className="w-full text-xs px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Customer Full Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Anand Sharma"
                    value={flatCustomerName}
                    onChange={(e) => setFlatCustomerName(e.target.value)}
                    className="w-full text-xs px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">WhatsApp / Contact Phone</label>
                  <input
                    type="text"
                    placeholder="e.g. +91 98234 56789"
                    value={flatPhone}
                    onChange={(e) => setFlatPhone(e.target.value)}
                    className="w-full text-xs px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:text-slate-100"
                  />
                </div>
              </div>

              {/* Subscriptions Choice */}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">Select Subscribed Newspapers (Select at least one)</label>
                <div className="flex flex-wrap gap-4 bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-150 dark:border-slate-700">
                  {papers.map((p) => {
                    const isChecked = flatSelectedPapers.includes(p.id);
                    return (
                      <label key={p.id} className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handlePaperCheckbox(p.id)}
                          className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                        <span>{p.name} (₹{p.ratePerDay}/d)</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Plus size={14} /> Register Customer Ledger & Subscriptions
              </button>
            </form>

            {/* List Flats */}
            <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden max-h-[350px] overflow-y-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-850 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase border-b border-slate-100 dark:border-slate-800 sticky top-0">
                    <th className="py-2.5 px-4 bg-slate-50 dark:bg-slate-850">Flat</th>
                    <th className="py-2.5 px-4 bg-slate-50 dark:bg-slate-850">Customer Details</th>
                    <th className="py-2.5 px-4 bg-slate-50 dark:bg-slate-850">Wing hierarchy</th>
                    <th className="py-2.5 px-4 bg-slate-50 dark:bg-slate-850">Subscribed Papers</th>
                    <th className="py-2.5 px-4 text-center bg-slate-50 dark:bg-slate-850">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {flats.map((f) => {
                    const wing = wings.find(w => w.id === f.wingId);
                    const b = wing ? buildings.find(bld => bld.id === wing.buildingId) : null;
                    const a = b ? areas.find(ar => ar.id === b.areaId) : null;
                    const subs = subscriptions.filter(s => s.flatId === f.id && s.active);
                    const paperNames = papers.filter(p => subs.some(s => s.paperId === p.id)).map(p => p.name).join(', ');

                    return (
                      <tr key={f.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20">
                        <td className="py-2.5 px-4 font-bold text-slate-800 dark:text-slate-200">{f.flatNumber}</td>
                        <td className="py-2.5 px-4">
                          <div className="font-bold text-slate-800 dark:text-slate-200">{f.customerName}</div>
                          <div className="text-[10px] text-slate-400">{f.phoneNumber}</div>
                        </td>
                        <td className="py-2.5 px-4 text-slate-500 dark:text-slate-400 text-[11px]">
                          {a?.name} {" ➔ "} {b?.name} {" ➔ "} {wing?.name}
                        </td>
                        <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400 text-[11px] font-medium italic">
                          {paperNames || 'No papers'}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <button
                            onClick={() => onDeleteRecord('flat', f.id)}
                            className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 p-1.5 rounded-lg transition-colors cursor-pointer"
                            title="Delete Customer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Newspaper Name</label>
                <input
                  type="text"
                  placeholder="e.g. Financial Times"
                  value={paperName}
                  onChange={(e) => setPaperName(e.target.value)}
                  className="w-full text-xs px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Daily Rate (₹)</label>
                <input
                  type="text"
                  placeholder="e.g. 7.50"
                  value={paperRate}
                  onChange={(e) => setPaperRate(e.target.value)}
                  className="w-full text-xs px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:text-slate-100"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-semibold py-2.5 rounded-xl flex items-center justify-center gap-1 cursor-pointer"
              >
                <Plus size={14} /> Add Newspaper
              </button>
            </form>

            {/* List Papers */}
            <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-850 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase border-b border-slate-100 dark:border-slate-800">
                    <th className="py-2.5 px-4">Newspaper ID</th>
                    <th className="py-2.5 px-4">Newspaper Title</th>
                    <th className="py-2.5 px-4 text-right">Per-Day Rate (INR)</th>
                    <th className="py-2.5 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {papers.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20">
                      <td className="py-2.5 px-4 font-mono text-[10px] text-slate-400">{p.id}</td>
                      <td className="py-2.5 px-4 font-bold text-slate-800 dark:text-slate-200">{p.name}</td>
                      <td className="py-2.5 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">₹{p.ratePerDay.toFixed(2)}</td>
                      <td className="py-2.5 px-4 text-center">
                        <button
                          onClick={() => onDeleteRecord('paper', p.id)}
                          className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 p-1.5 rounded-lg transition-colors cursor-pointer"
                          title="Delete Newspaper"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Agent Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Raju Patil"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  className="w-full text-xs px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">WhatsApp Mobile</label>
                <input
                  type="text"
                  placeholder="e.g. +91 99000 88777"
                  value={agentPhone}
                  onChange={(e) => setAgentPhone(e.target.value)}
                  className="w-full text-xs px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Assigned Area</label>
                <select
                  value={agentAreaId}
                  onChange={(e) => setAgentAreaId(e.target.value)}
                  className="w-full text-xs px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl focus:outline-none dark:text-slate-100 cursor-pointer"
                >
                  {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <button
                type="submit"
                className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-semibold py-2.5 rounded-xl flex items-center justify-center gap-1 cursor-pointer"
              >
                <Plus size={14} /> Register Agent
              </button>
            </form>

            {/* List Agents */}
            <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-850 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase border-b border-slate-100 dark:border-slate-800">
                    <th className="py-2.5 px-4">Agent ID</th>
                    <th className="py-2.5 px-4">Agent Name</th>
                    <th className="py-2.5 px-4">Phone Contact</th>
                    <th className="py-2.5 px-4">Assigned Area Route</th>
                    <th className="py-2.5 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {agents.map((a) => {
                    const area = areas.find(ar => ar.id === a.assignedAreaId);
                    return (
                      <tr key={a.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20">
                        <td className="py-2.5 px-4 font-mono text-[10px] text-slate-400">{a.id}</td>
                        <td className="py-2.5 px-4 font-bold text-slate-800 dark:text-slate-200">{a.name}</td>
                        <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400">{a.phone}</td>
                        <td className="py-2.5 px-4 text-slate-500 dark:text-slate-400 font-semibold">{area?.name || 'Floating Agent'}</td>
                        <td className="py-2.5 px-4 text-center">
                          <button
                            onClick={() => onDeleteRecord('agent', a.id)}
                            className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 p-1.5 rounded-lg transition-colors cursor-pointer"
                            title="Unregister Agent"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
