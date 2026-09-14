import React, { useEffect, useMemo, useRef, useState } from 'react';
import { DatabaseState } from '../data/dummyGenerator';
import type { TabType } from './BottomNav';
import { Search, X, Home, Newspaper, Users, ArrowRight } from 'lucide-react';

interface GlobalSearchModalProps {
  state: DatabaseState;
  onClose: () => void;
  onNavigateToFlat: (flatId: string) => void;
  onNavigateToTab: (tab: TabType) => void;
}

const RESULT_LIMIT = 25;

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ state, onClose, onNavigateToFlat, onNavigateToTab }) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const q = query.trim().toLowerCase();

  const flatResults = useMemo(() => {
    if (!q) return [];
    return state.flats
      .map((flat) => {
        const wing = state.wings.find(w => w.id === flat.wingId);
        const building = wing ? state.buildings.find(b => b.id === wing.buildingId) : null;
        const area = building ? state.areas.find(a => a.id === building.areaId) : null;
        return { flat, wing, building, area };
      })
      .filter(({ flat, wing, building, area }) =>
        flat.customerName.toLowerCase().includes(q) ||
        flat.flatNumber.toLowerCase().includes(q) ||
        flat.phoneNumber.replace(/\s/g, '').includes(q.replace(/\s/g, '')) ||
        area?.name.toLowerCase().includes(q) ||
        building?.name.toLowerCase().includes(q) ||
        wing?.name.toLowerCase().includes(q)
      )
      .slice(0, RESULT_LIMIT);
  }, [q, state]);

  const paperResults = useMemo(() => (!q ? [] : state.papers.filter(p => p.name.toLowerCase().includes(q)).slice(0, 8)), [q, state.papers]);
  const agentResults = useMemo(
    () => (!q ? [] : state.agents.filter(a => a.name.toLowerCase().includes(q) || a.phone.replace(/\s/g, '').includes(q.replace(/\s/g, ''))).slice(0, 8)),
    [q, state.agents]
  );

  const totalResults = flatResults.length + paperResults.length + agentResults.length;

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center p-4 pt-16 sm:pt-24 bg-slate-950/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <Search size={18} className="text-emerald-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search customers, flats, papers, agents..."
            className="flex-1 bg-transparent text-sm text-slate-800 dark:text-slate-100 focus:outline-none placeholder:text-slate-400"
          />
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-xl transition-colors cursor-pointer shrink-0">
            <X size={16} />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {!q ? (
            <p className="text-center text-xs text-slate-400 dark:text-slate-500 py-10 px-5">
              Start typing a customer name, flat number, phone number, newspaper, or agent.
            </p>
          ) : totalResults === 0 ? (
            <p className="text-center text-xs text-slate-400 dark:text-slate-500 py-10 px-5">No matches for "{query}".</p>
          ) : (
            <div className="py-2">
              {flatResults.length > 0 && (
                <div className="mb-1">
                  <p className="px-5 py-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Customers</p>
                  {flatResults.map(({ flat, wing, building, area }) => (
                    <button
                      key={flat.id}
                      onClick={() => { onNavigateToFlat(flat.id); onClose(); }}
                      className="w-full flex items-center gap-3 px-5 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left cursor-pointer"
                    >
                      <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                        <Home size={14} className="text-slate-500 dark:text-slate-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                          {flat.customerName} <span className="text-slate-400 font-medium">· Flat {flat.flatNumber}</span>
                        </p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{area?.name} ➔ {building?.name} ➔ {wing?.name}</p>
                      </div>
                      <ArrowRight size={13} className="text-slate-300 dark:text-slate-600 shrink-0" />
                    </button>
                  ))}
                </div>
              )}

              {paperResults.length > 0 && (
                <div className="mb-1">
                  <p className="px-5 py-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Newspapers</p>
                  {paperResults.map((paper) => (
                    <button
                      key={paper.id}
                      onClick={() => { onNavigateToTab('masters'); onClose(); }}
                      className="w-full flex items-center gap-3 px-5 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left cursor-pointer"
                    >
                      <div className="h-8 w-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center shrink-0">
                        <Newspaper size={14} className="text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{paper.name}</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500">₹{paper.ratePerDay.toFixed(2)} / day</p>
                      </div>
                      <ArrowRight size={13} className="text-slate-300 dark:text-slate-600 shrink-0" />
                    </button>
                  ))}
                </div>
              )}

              {agentResults.length > 0 && (
                <div>
                  <p className="px-5 py-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Delivery Agents</p>
                  {agentResults.map((agent) => (
                    <button
                      key={agent.id}
                      onClick={() => { onNavigateToTab('masters'); onClose(); }}
                      className="w-full flex items-center gap-3 px-5 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left cursor-pointer"
                    >
                      <div className="h-8 w-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center shrink-0">
                        <Users size={14} className="text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{agent.name}</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500">{agent.phone}</p>
                      </div>
                      <ArrowRight size={13} className="text-slate-300 dark:text-slate-600 shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
