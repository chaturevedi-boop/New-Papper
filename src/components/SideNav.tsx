import React from 'react';
import type { ThemePreference } from '../hooks/useTheme';
import { Newspaper, X, Sun, Moon, Monitor, DownloadCloud, UploadCloud, RefreshCw, Eraser, MessageSquarePlus } from 'lucide-react';

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
}

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
  onShowFeedback
}) => {
  const run = (action: () => void) => () => {
    onClose();
    action();
  };

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
              <p className="text-sm font-black text-white uppercase tracking-tight">Daily News Service</p>
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
