import React, { useState, useMemo } from 'react';
import { DatabaseState, getDeliveryLogIndex } from '../data/dummyGenerator';
import { Flat } from '../types';
import { RouteSheetModal } from './RouteSheetModal';
import {
  Calendar,
  User,
  Phone,
  Building2,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Plane,
  Map
} from 'lucide-react';

interface DeliveryListProps {
  state: DatabaseState;
  onUpdateDeliveryStatus: (flatId: string, paperId: string, date: string, status: 'DELIVERED' | 'SKIPPED') => void;
  onBulkUpdateDeliveryStatus: (flatId: string, paperIds: string[], fromDate: string, toDate: string, status: 'DELIVERED' | 'SKIPPED') => void;
  selectedMonth: number;
  selectedYear: number;
}

export const DeliveryList: React.FC<DeliveryListProps> = ({
  state,
  onUpdateDeliveryStatus,
  onBulkUpdateDeliveryStatus,
  selectedMonth,
  selectedYear
}) => {
  const { areas, buildings, wings, flats, papers, subscriptions, deliveryLogs, agents } = state;
  const deliveryLogIndex = useMemo(() => getDeliveryLogIndex(deliveryLogs), [deliveryLogs]);

  // Selected filters
  const [selectedAreaId, setSelectedAreaId] = useState<string>(areas[0]?.id || '');
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('ALL');
  const [expandedFlatId, setExpandedFlatId] = useState<string | null>(null);
  const [showRouteSheet, setShowRouteSheet] = useState(false);

  // Vacation-mode bulk skip/deliver date range, scoped to whichever flat is currently expanded
  const [vacationFrom, setVacationFrom] = useState('');
  const [vacationTo, setVacationTo] = useState('');

  const handleToggleExpand = (flatId: string) => {
    setExpandedFlatId(prev => (prev === flatId ? null : flatId));
    setVacationFrom('');
    setVacationTo('');
  };

  // Available buildings based on selected area
  const filteredBuildings = useMemo(() => {
    if (!selectedAreaId) return [];
    return buildings.filter(b => b.areaId === selectedAreaId);
  }, [buildings, selectedAreaId]);

  // Handle Area change: reset building selection
  const handleAreaChange = (areaId: string) => {
    setSelectedAreaId(areaId);
    setSelectedBuildingId('ALL');
  };

  // Filter flats by geographic hierarchy
  const filteredFlats = useMemo(() => {
    if (!selectedAreaId) return [];

    // Find wings of the relevant buildings
    let relevantBuildingIds = filteredBuildings.map(b => b.id);
    if (selectedBuildingId !== 'ALL') {
      relevantBuildingIds = [selectedBuildingId];
    }

    const relevantWingIds = wings
      .filter(w => relevantBuildingIds.includes(w.buildingId))
      .map(w => w.id);

    return flats.filter(f => relevantWingIds.includes(f.wingId));
  }, [flats, wings, filteredBuildings, selectedAreaId, selectedBuildingId]);

  // Group flats by Building and Wing for clean presentation
  const groupedData = useMemo(() => {
    const groups: { [key: string]: { wingName: string; buildingName: string; flatsList: Flat[] } } = {};

    filteredFlats.forEach(flat => {
      const wing = wings.find(w => w.id === flat.wingId);
      const building = wing ? buildings.find(b => b.id === wing.buildingId) : null;
      
      if (wing && building) {
        const key = `${building.id}_${wing.id}`;
        if (!groups[key]) {
          groups[key] = {
            wingName: wing.name,
            buildingName: building.name,
            flatsList: []
          };
        }
        groups[key].flatsList.push(flat);
      }
    });

    return Object.entries(groups).sort((a, b) => a[1].buildingName.localeCompare(b[1].buildingName));
  }, [filteredFlats, wings, buildings]);

  // Delivery agent for selected area
  const activeAgent = useMemo(() => {
    return agents.find(a => a.assignedAreaId === selectedAreaId) || null;
  }, [agents, selectedAreaId]);

  // Generate calendar dates for skip editor
  const calendarDays = useMemo(() => {
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const list = [];
    const monthStr = selectedMonth < 10 ? `0${selectedMonth}` : `${selectedMonth}`;
    for (let d = 1; d <= daysInMonth; d++) {
      const dayStr = d < 10 ? `0${d}` : `${d}`;
      list.push(`${selectedYear}-${monthStr}-${dayStr}`);
    }
    return list;
  }, [selectedMonth, selectedYear]);

  // Local calendar date (not UTC) - toISOString() would shift the date in timezones ahead of UTC
  const today = new Date();
  const todayLocalDateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  return (
    <div className="space-y-6" id="delivery-tab-container">
      {/* 4-Tier Filtering Panel */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-lg border border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="text-emerald-400" size={20} />
            <h3 className="text-md font-bold tracking-tight">Cascaded Location Filters (Smart Drops)</h3>
          </div>
          {activeAgent && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 text-xs bg-slate-800 text-slate-300 px-3 py-1.5 rounded-full border border-slate-700">
                <User size={13} className="text-emerald-400" />
                <span>Agent: <strong>{activeAgent.name}</strong> ({activeAgent.phone})</span>
              </div>
              <button
                onClick={() => setShowRouteSheet(true)}
                className="flex items-center gap-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-full transition-colors cursor-pointer"
                title="View & print this agent's delivery route sheet"
              >
                <Map size={13} />
                <span>Route Sheet</span>
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Level 1: Area Filter */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">1. Select Area</label>
            <select
              value={selectedAreaId}
              onChange={(e) => handleAreaChange(e.target.value)}
              className="w-full bg-slate-800 text-white text-sm rounded-xl px-4 py-2.5 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              {areas.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          {/* Level 2: Building Filter */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">2. Select Building (Filtered)</label>
            <select
              value={selectedBuildingId}
              onChange={(e) => setSelectedBuildingId(e.target.value)}
              className="w-full bg-slate-800 text-white text-sm rounded-xl px-4 py-2.5 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="ALL">All Buildings ({filteredBuildings.length})</option>
              {filteredBuildings.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Cascaded Drop List Output */}
      {filteredFlats.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-12 text-center">
          <Building2 size={48} className="mx-auto text-slate-300 dark:text-slate-700 mb-3" />
          <p className="text-slate-500 dark:text-slate-400 font-medium">No flat data matches your active location filters.</p>
          <p className="text-xs text-slate-400 mt-1">Please select a different Area or Building above.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedData.map(([key, group]) => (
            <div key={key} className="space-y-3" id={`group-${key}`}>
              {/* Sticky-like Header showing Level 2 (Building) & Level 3 (Wing) */}
              <div className="bg-emerald-50/70 dark:bg-emerald-950/20 border-l-4 border-emerald-500 px-4 py-2.5 rounded-r-xl flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-400 tracking-wider uppercase">
                  {group.buildingName} ➔ {group.wingName}
                </span>
                <span className="text-xs text-emerald-600 dark:text-emerald-500 font-medium bg-emerald-100/50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                  {group.flatsList.length} Drops
                </span>
              </div>

              {/* Flats Grid */}
              <div className="grid grid-cols-1 gap-3">
                {group.flatsList.map((flat) => {
                  const isExpanded = expandedFlatId === flat.id;
                  
                  // Find subscribed papers
                  const flatSubs = subscriptions.filter(s => s.flatId === flat.id && s.active);
                  const activePapers = papers.filter(p => flatSubs.some(s => s.paperId === p.id));

                  return (
                    <div 
                      key={flat.id} 
                      className="bg-white dark:bg-slate-950 rounded-xl border border-slate-150 dark:border-slate-900 shadow-sm overflow-hidden"
                      id={`flat-row-${flat.id}`}
                    >
                      <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        {/* Flat Details (Level 4 of Hierarchy) */}
                        <div className="flex items-start gap-3">
                          <div className="h-10 w-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-700 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700 text-sm">
                            {flat.flatNumber}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-slate-800 dark:text-slate-100">{flat.customerName}</h4>
                              <span className="text-[10px] tracking-wide font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded uppercase">
                                Yr 2026 Active
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1.5 mt-0.5">
                              <Phone size={11} /> {flat.phoneNumber}
                            </p>
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {activePapers.map(paper => (
                                <span 
                                  key={paper.id} 
                                  className="text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900 px-2 py-0.5 rounded"
                                >
                                  {paper.name} (₹{paper.ratePerDay}/d)
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Ergonomic Quick Delivery Actions */}
                        <div className="flex items-center gap-2 self-end sm:self-center">
                          <button
                            onClick={() => handleToggleExpand(flat.id)}
                            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-lg transition-colors flex items-center gap-1 text-xs"
                            title="View Skip Calendar / Monthly Logs"
                          >
                            <Calendar size={16} className="text-emerald-500" />
                            <span>Logs Calendar</span>
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        </div>
                      </div>

                      {/* Interactive Calendar Skip Editor (Expanded Panel) */}
                      {isExpanded && (
                        <div className="bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-900 p-4 sm:p-5">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 mb-4">
                            <div>
                              <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                Daily Delivery Log Skip Manager
                              </h5>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                Click any date to switch status. Log changes reflect instantly in customer invoice totals.
                              </p>
                            </div>
                            <div className="flex gap-4 text-[11px] font-medium text-slate-500">
                              <span className="flex items-center gap-1">
                                <span className="h-2 w-2 rounded-full bg-emerald-500"></span> Delivered
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="h-2 w-2 rounded-full bg-rose-500"></span> Skipped / Deduction
                              </span>
                            </div>
                          </div>

                          {/* Vacation Mode: bulk-apply a status across a date range for all this flat's papers */}
                          <div className="bg-white dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-xl p-3 mb-4 flex flex-wrap items-end gap-3">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 mr-1">
                              <Plane size={14} className="text-emerald-500" />
                              Vacation Mode
                            </div>
                            <div>
                              <label htmlFor={`vacation-from-${flat.id}`} className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">From</label>
                              <input
                                id={`vacation-from-${flat.id}`}
                                type="date"
                                value={vacationFrom}
                                onChange={(e) => setVacationFrom(e.target.value)}
                                className="text-xs px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:text-slate-100"
                              />
                            </div>
                            <div>
                              <label htmlFor={`vacation-to-${flat.id}`} className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">To</label>
                              <input
                                id={`vacation-to-${flat.id}`}
                                type="date"
                                value={vacationTo}
                                onChange={(e) => setVacationTo(e.target.value)}
                                className="text-xs px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:text-slate-100"
                              />
                            </div>
                            <button
                              disabled={!vacationFrom || !vacationTo || vacationFrom > vacationTo || activePapers.length === 0}
                              onClick={() => onBulkUpdateDeliveryStatus(flat.id, activePapers.map(p => p.id), vacationFrom, vacationTo, 'SKIPPED')}
                              className="text-xs font-bold px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                            >
                              Mark All Skipped
                            </button>
                            <button
                              disabled={!vacationFrom || !vacationTo || vacationFrom > vacationTo || activePapers.length === 0}
                              onClick={() => onBulkUpdateDeliveryStatus(flat.id, activePapers.map(p => p.id), vacationFrom, vacationTo, 'DELIVERED')}
                              className="text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                            >
                              Mark All Delivered
                            </button>
                          </div>

                          {/* Paper selector for log entry */}
                          {activePapers.map(paper => {
                            return (
                              <div key={paper.id} className="space-y-2 mb-4 last:mb-0">
                                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                                  <span>{paper.name}</span>
                                  <span className="text-[10px] text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded">
                                    Rate: ₹{paper.ratePerDay}/day
                                  </span>
                                </div>

                                <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
                                  {calendarDays.map((date) => {
                                    const dayNum = date.split('-')[2];
                                    const log = deliveryLogIndex.get(`${flat.id}|${paper.id}|${date}`);
                                    
                                    // Default status is 'DELIVERED' if no log entry is recorded
                                    const status = log ? log.status : 'DELIVERED';
                                    const isDelivered = status === 'DELIVERED';

                                    return (
                                      <button
                                        key={date}
                                        onClick={() => {
                                          const nextStatus = isDelivered ? 'SKIPPED' : 'DELIVERED';
                                          onUpdateDeliveryStatus(flat.id, paper.id, date, nextStatus);
                                        }}
                                        className={`p-2 rounded-lg text-center transition-all ${
                                          isDelivered
                                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 border border-emerald-100 dark:border-emerald-900'
                                            : 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 hover:bg-rose-100 border border-rose-100 dark:border-rose-900/60'
                                        } flex flex-col items-center justify-center`}
                                        title={`${date}: Click to toggle`}
                                      >
                                        <span className="text-xs font-bold">{parseInt(dayNum)}</span>
                                        <span className="text-[8px] tracking-wider uppercase mt-0.5 font-medium opacity-80">
                                          {isDelivered ? 'Drop' : 'Skip'}
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {showRouteSheet && activeAgent && (
        <RouteSheetModal
          state={state}
          agent={activeAgent}
          areaName={areas.find(a => a.id === selectedAreaId)?.name || ''}
          initialDate={calendarDays.includes(todayLocalDateStr) ? todayLocalDateStr : calendarDays[0]}
          onClose={() => setShowRouteSheet(false)}
        />
      )}
    </div>
  );
};
