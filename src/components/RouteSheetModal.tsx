import React, { useMemo, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { DatabaseState, getDeliveryLogIndex } from '../data/dummyGenerator';
import { DeliveryAgent } from '../types';
import { shareOrDownloadFile } from '../utils/shareFile';
import { X, Printer, Share2, MapPin, User, Phone } from 'lucide-react';

interface RouteSheetModalProps {
  state: DatabaseState;
  agent: DeliveryAgent;
  areaName: string;
  initialDate: string;
  onClose: () => void;
}

export const RouteSheetModal: React.FC<RouteSheetModalProps> = ({ state, agent, areaName, initialDate, onClose }) => {
  const { buildings, wings, flats, papers, subscriptions, deliveryLogs } = state;
  const [date, setDate] = useState(initialDate);
  const deliveryLogIndex = useMemo(() => getDeliveryLogIndex(deliveryLogs), [deliveryLogs]);

  // Every flat in this agent's assigned area, regardless of the drops-tab building filter
  const routeStops = useMemo(() => {
    const areaBuildingIds = buildings.filter(b => b.areaId === agent.assignedAreaId).map(b => b.id);
    const areaWings = wings.filter(w => areaBuildingIds.includes(w.buildingId));

    return areaWings.flatMap(wing => {
      const building = buildings.find(b => b.id === wing.buildingId);
      return flats
        .filter(f => f.wingId === wing.id)
        .map(flat => {
          const flatSubs = subscriptions.filter(s => s.flatId === flat.id && s.active);
          const flatPapers = flatSubs
            .map(sub => {
              const paper = papers.find(p => p.id === sub.paperId);
              if (!paper) return null;
              const log = deliveryLogIndex.get(`${flat.id}|${paper.id}|${date}`);
              return { paper, status: log ? log.status : 'DELIVERED' as const };
            })
            .filter((p): p is NonNullable<typeof p> => p !== null);

          return { flat, building, wing, flatPapers };
        });
    }).sort((a, b) => (a.building?.name || '').localeCompare(b.building?.name || '') || a.flat.flatNumber.localeCompare(b.flat.flatNumber));
  }, [buildings, wings, flats, subscriptions, papers, deliveryLogIndex, agent.assignedAreaId, date]);

  const totalDrops = routeStops.reduce((acc, stop) => acc + stop.flatPapers.filter(p => p.status === 'DELIVERED').length, 0);

  // window.print() is a no-op inside an Android WebView (no PrintManager wired up natively).
  // Prefer the real OS share sheet when available, which lets the agent save/print/send the
  // route sheet via any installed app; keep window.print() only as the desktop-browser fallback.
  const canNativeShare =
    Capacitor.isNativePlatform() || (typeof navigator !== 'undefined' && typeof navigator.share === 'function');

  const handleShareOrPrint = async () => {
    if (!canNativeShare) {
      window.print();
      return;
    }
    const lines = routeStops.map(({ flat, building, wing, flatPapers }, idx) =>
      `${idx + 1}. ${building?.name} ${wing?.name}, Flat ${flat.flatNumber} - ${flat.customerName}\n   ${
        flatPapers.length === 0 ? 'No active papers' : flatPapers.map(p => `${p.paper.name} (${p.status})`).join(', ')
      }`
    );
    const content = [
      `DAILY DELIVERY ROUTE - ${date}`,
      `Agent: ${agent.name} (${agent.phone})`,
      `Area: ${areaName}`,
      `${routeStops.length} stops - ${totalDrops} papers to drop`,
      '',
      ...lines
    ].join('\n');

    await shareOrDownloadFile(content, `Route_Sheet_${agent.name.replace(/ /g, '_')}_${date}.txt`, 'text/plain', `Route Sheet - ${date}`);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl w-full max-w-2xl overflow-hidden border border-slate-100 dark:border-slate-800 print:shadow-none print:border-none print:rounded-none"
        id="route-sheet-print-area"
      >
        <div className="bg-slate-50 dark:bg-slate-850 px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <MapPin className="text-emerald-500" size={16} />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Agent Route Sheet</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 p-1.5 rounded-lg transition-colors cursor-pointer">
            <X size={16} />
          </button>
        </div>

        <div className="p-6 sm:p-8 space-y-5 max-h-[70vh] overflow-y-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-black text-emerald-800 dark:text-emerald-400 uppercase tracking-wider">Daily Delivery Route</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
                <User size={12} /> {agent.name}
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <Phone size={12} /> {agent.phone}
                <span className="text-slate-300 dark:text-slate-700">•</span>
                {areaName}
              </p>
            </div>
            <div className="flex items-center gap-2 print:hidden">
              <label htmlFor="route-sheet-date" className="text-[10px] font-bold text-slate-400 uppercase">Date</label>
              <input
                id="route-sheet-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:text-slate-100"
              />
            </div>
            <p className="hidden print:block text-xs font-bold text-slate-600">{date}</p>
          </div>

          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {routeStops.length} stops • {totalDrops} papers to drop today
          </div>

          <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-850 border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-2.5 px-4">Stop</th>
                  <th className="py-2.5 px-4">Customer</th>
                  <th className="py-2.5 px-4">Papers to Drop</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {routeStops.map(({ flat, building, wing, flatPapers }, idx) => (
                  <tr key={flat.id}>
                    <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200 align-top">
                      {idx + 1}. {building?.name} {wing?.name}, Flat {flat.flatNumber}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400 align-top">
                      {flat.customerName}
                    </td>
                    <td className="py-3 px-4 align-top">
                      <div className="flex flex-col gap-1">
                        {flatPapers.length === 0 && <span className="text-slate-400">No active papers</span>}
                        {flatPapers.map(({ paper, status }) => (
                          <span
                            key={paper.id}
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded w-fit ${
                              status === 'DELIVERED'
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                                : 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 line-through'
                            }`}
                          >
                            {paper.name}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-850 px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end print:hidden">
          <button
            onClick={handleShareOrPrint}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl px-4 py-2 flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            {canNativeShare ? <Share2 size={14} /> : <Printer size={14} />}
            <span>{canNativeShare ? 'Share Route Sheet' : 'Print Route Sheet'}</span>
          </button>
        </div>

        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page { size: A4; margin: 12mm; }
            body { background: white !important; }
            .print\\:hidden, header, nav, footer, button { display: none !important; }
            * { color: black !important; border-color: #ddd !important; }
          }
        `}} />
      </div>
    </div>
  );
};
