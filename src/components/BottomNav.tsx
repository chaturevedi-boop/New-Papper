import React from 'react';
import { Smartphone, FileSpreadsheet, Database, HelpCircle, BarChart3 } from 'lucide-react';

export type TabType = 'drops' | 'billing' | 'reports' | 'masters' | 'help';

interface BottomNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const NAV_ITEMS: { key: TabType; label: string; icon: React.ElementType }[] = [
  { key: 'drops', label: 'Drops', icon: Smartphone },
  { key: 'billing', label: 'Billing', icon: FileSpreadsheet },
  { key: 'reports', label: 'Reports', icon: BarChart3 },
  { key: 'masters', label: 'Ledgers', icon: Database },
  { key: 'help', label: 'Help', icon: HelpCircle },
];

// Fixed bottom bar for the primary sections - always one tap away, the modern
// mobile-nav pattern (Material Design 3 / iOS) for top-level destinations. Secondary,
// infrequent actions live in the SideNav drawer instead, opened from the header.
export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  const activeIndex = NAV_ITEMS.findIndex(i => i.key === activeTab);
  const itemCount = NAV_ITEMS.length;

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 shadow-[0_-2px_12px_rgba(0,0,0,0.06)] pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-7xl mx-auto relative grid h-16" style={{ gridTemplateColumns: `repeat(${itemCount}, minmax(0, 1fr))` }}>
        {/* Animated active indicator - a slim pill that slides beneath the active item */}
        <div
          className="absolute top-1.5 h-1 w-8 rounded-full bg-emerald-500 transition-transform duration-300 ease-out"
          style={{ left: `calc(${(activeIndex * 100) / itemCount}% + 50% / ${itemCount} - 16px)` }}
        />
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onTabChange(item.key)}
              className={`flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors active:scale-[0.96] ${
                isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              <span className={`text-[9.5px] font-bold ${isActive ? '' : 'font-semibold'}`}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
