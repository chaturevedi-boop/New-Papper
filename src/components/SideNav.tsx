import React from 'react';
import type { ThemePreference } from '../hooks/useTheme';
import type { ParsedLicense } from '../utils/licenseKey';
import { getLastBackupTime, formatBackupAge, isBackupStale } from '../utils/autoBackup';
import { Capacitor } from '@capacitor/core';
import { Newspaper, X, Sun, Moon, Monitor, DownloadCloud, UploadCloud, RefreshCw, Eraser, MessageSquarePlus, ShieldCheck, Cloud, AlertTriangle } from 'lucide-react';

interface SideNavProps {
  isOpen: boolean;
  onClose: () => void;
  themePreference: ThemePreference;
  onCycleTheme: () => void;
  onExportBackup: () => void;
  onImportBackupClick: () => void;
  onResetDatabase: () => void;
  onEraseAllData: () => void;
  onShowFeedback: () => void;
  onShowDriveBackup: () => void;
  license: ParsedLicense | null;
  daysRemaining: number;
  onShowLicense: () => void;
  backupTick: number;
}

const DURATION_SHORT_LABEL: Record<ParsedLicense['duration'], string> = {
  '1Y': '1yr', '5Y': '5yr', LT: 'Lifetime'
};

interface UtilityRowProps {
  icon: React.ElementType;
  label: string;
  detail?: string;
  onClick: () => void;
  destructive?: boolean;
}

const UtilityRow: React.FC<UtilityRowProps> = ({ icon: Icon, label, detail, onClick, destructive }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl transition-colors active:scale-[0.98] cursor-pointer ${
      destructive
        ? 'text-rose-400 hover:bg-rose-950/40'
        : 'text-slate-200 hover:bg-slate-800'
    }`}
  >
    <div className={`p-2.5 rounded-xl ${destructive ? 'bg-rose-950/50' : 'bg-slate-800'}`}>
      <Icon size={20} />
    </div>
    <div className="text-left">
      <p className="text-sm font-bold">{label}</p>
      {detail && <p className="text-[11px] text-slate-500 font-medium mt-0.5">{detail}</p>}
    </div>
  </button>
);

const THEME_LABEL: Record<ThemePreference, string> = { light: 'Light', dark: 'Dark', system: 'System' };
const THEME_ICON: Record<ThemePreference, React.ElementType> = { light: Sun, dark: Moon, system: Monitor };

// Secondary/infrequent utility actions live here, opened via the header's 3-dot
// button - kept out of the always-visible BottomNav since these aren't tapped often.
export const SideNav: React.FC<SideNavProps> = ({
  isOpen,
  onClose,
  themePreference,
  onCycleTheme,
  onExportBackup,
  onImportBackupClick,
  onResetDatabase,
  onEraseAllData,
  onShowFeedback,
  onShowDriveBackup,
  license,
  daysRemaining,
  onShowLicense,
  backupTick
}) => {
  const run = (action: () => void) => () => {
    onClose();
    action();
  };

  // Re-reads on every backupTick bump (fired after each auto-backup write) and whenever the
  // drawer opens, since localStorage isn't itself reactive.
  const lastBackup = getLastBackupTime();
  const stale = isBackupStale();
  void backupTick;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-[85vw] max-w-[320px] bg-slate-900 shadow-2xl transition-transform duration-300 ease-out flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-inner border border-emerald-500">
              <Newspaper size={18} />
            </div>
            <div>
              <p className="text-sm font-black text-white uppercase tracking-tight">PaperTrack</p>
              <p className="text-[10px] text-slate-500 font-medium">Settings & Tools</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2.5 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          <UtilityRow
            icon={ShieldCheck}
            label="License"
            detail={license ? `${license.customerName} · ${DURATION_SHORT_LABEL[license.duration]}` : `Trial: ${daysRemaining} day${daysRemaining === 1 ? '' : 's'} left`}
            onClick={run(onShowLicense)}
          />
          <div className="h-px bg-slate-800 my-2 mx-1" />
          <UtilityRow
            icon={THEME_ICON[themePreference]}
            label="Theme"
            detail={THEME_LABEL[themePreference]}
            onClick={run(onCycleTheme)}
          />
          <UtilityRow
            icon={DownloadCloud}
            label="Download Backup"
            detail="Save all data as a JSON file"
            onClick={run(onExportBackup)}
          />
          <UtilityRow
            icon={UploadCloud}
            label="Restore Backup"
            detail="Load data from a JSON file"
            onClick={run(onImportBackupClick)}
          />
          {Capacitor.isNativePlatform() && (
            <div className="mx-4 mt-1 mb-2 flex items-center gap-2 text-[10px] font-semibold text-slate-500">
              {stale ? <AlertTriangle size={12} className="text-amber-400 shrink-0" /> : <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />}
              <span>Auto-backup: {formatBackupAge(lastBackup)}</span>
            </div>
          )}
          <UtilityRow
            icon={Cloud}
            label="Google Drive Backup"
            detail="Sync a copy to your own Drive"
            onClick={run(onShowDriveBackup)}
          />
          <div className="h-px bg-slate-800 my-2 mx-1" />
          <UtilityRow
            icon={RefreshCw}
            label="Reset Demo Data"
            detail="Reload 500+ sample records"
            onClick={run(onResetDatabase)}
          />
          <UtilityRow
            icon={Eraser}
            label="Erase All Data"
            detail="Permanently wipe everything"
            onClick={run(onEraseAllData)}
            destructive
          />
          <div className="h-px bg-slate-800 my-2 mx-1" />
          <UtilityRow
            icon={MessageSquarePlus}
            label="Suggest a Feature / Report a Bug"
            onClick={run(onShowFeedback)}
          />
        </div>
      </div>
    </>
  );
};
