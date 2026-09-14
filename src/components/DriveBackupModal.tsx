import React, { useEffect, useState } from 'react';
import {
  getClientId,
  setClientId as saveClientId,
  isDriveConnected,
  disconnectDrive,
  beginAuth,
  uploadBackup,
  downloadBackup,
  getBackupInfo,
  DriveError,
  type DriveBackupInfo
} from '../utils/googleDrive';
import {
  X,
  CloudUpload,
  CloudDownload,
  Cloud,
  RefreshCw,
  LogOut,
  AlertTriangle,
  CheckCircle2,
  KeyRound
} from 'lucide-react';

interface DriveBackupModalProps {
  onClose: () => void;
  getSerializedState: () => string;
  onRestore: (json: string) => void;
  connectVersion: number;
}

export const DriveBackupModal: React.FC<DriveBackupModalProps> = ({ onClose, getSerializedState, onRestore, connectVersion }) => {
  const [clientIdInput, setClientIdInput] = useState(getClientId() || '');
  const [connected, setConnected] = useState(isDriveConnected());
  const [busy, setBusy] = useState<'backup' | 'restore' | 'connect' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [remoteInfo, setRemoteInfo] = useState<DriveBackupInfo | null>(null);

  // A completed OAuth round-trip updates localStorage from outside React (App.tsx's deep-link
  // listener) - re-sync local view state whenever that happens.
  useEffect(() => {
    setConnected(isDriveConnected());
  }, [connectVersion]);

  useEffect(() => {
    if (!connected) return;
    getBackupInfo().then(setRemoteInfo).catch(() => setRemoteInfo(null));
  }, [connected]);

  const handleSaveClientId = () => {
    if (!clientIdInput.trim()) return;
    saveClientId(clientIdInput);
    setSuccess('Client ID saved.');
    setTimeout(() => setSuccess(null), 2000);
  };

  const handleConnect = async () => {
    setError(null);
    if (!getClientId()) {
      setError('Save your Client ID first.');
      return;
    }
    setBusy('connect');
    try {
      await beginAuth();
    } catch (err) {
      setError(err instanceof DriveError ? err.message : 'Could not start Google sign-in.');
    } finally {
      setBusy(null);
    }
  };

  const handleBackupNow = async () => {
    setError(null);
    setBusy('backup');
    try {
      await uploadBackup(getSerializedState());
      setRemoteInfo(await getBackupInfo());
      setSuccess('Backed up to Google Drive.');
      setTimeout(() => setSuccess(null), 2500);
    } catch (err) {
      setError(err instanceof DriveError ? err.message : 'Backup failed. Try again.');
    } finally {
      setBusy(null);
    }
  };

  const handleRestore = async () => {
    if (!window.confirm('Restoring from Drive will replace all data currently on this device. Continue?')) return;
    setError(null);
    setBusy('restore');
    try {
      const json = await downloadBackup();
      onRestore(json);
      setSuccess('Restored from Google Drive.');
      setTimeout(() => setSuccess(null), 2500);
    } catch (err) {
      setError(err instanceof DriveError ? err.message : 'Restore failed. Try again.');
    } finally {
      setBusy(null);
    }
  };

  const handleDisconnect = () => {
    disconnectDrive();
    setConnected(false);
    setRemoteInfo(null);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden animate-fade-in">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-100 dark:bg-blue-950/40 rounded-xl">
              <Cloud className="text-blue-600 dark:text-blue-400" size={20} />
            </div>
            <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">Google Drive Backup</h4>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 p-2.5 rounded-xl transition-colors active:scale-[0.94] cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {!connected ? (
            <>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Backs up to a private, hidden folder in your own Google Drive that only PaperTrack
                can see. Needs a one-time OAuth Client ID from your Google Cloud project - see the
                Help tab for setup steps.
              </p>
              <div>
                <label htmlFor="drive-client-id" className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                  <KeyRound size={13} /> OAuth Client ID
                </label>
                <div className="flex gap-2">
                  <input
                    id="drive-client-id"
                    type="text"
                    placeholder="xxxxx.apps.googleusercontent.com"
                    value={clientIdInput}
                    onChange={(e) => setClientIdInput(e.target.value)}
                    className="flex-1 text-xs px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:text-slate-100"
                  />
                  <button
                    onClick={handleSaveClientId}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white cursor-pointer transition-colors"
                  >
                    Save
                  </button>
                </div>
              </div>
              <button
                onClick={handleConnect}
                disabled={busy === 'connect'}
                className="w-full py-3 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {busy === 'connect' ? <RefreshCw size={16} className="animate-spin" /> : <Cloud size={16} />}
                {busy === 'connect' ? 'Opening Google Sign-in...' : 'Connect Google Drive'}
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/60 rounded-xl px-3.5 py-2.5">
                <CheckCircle2 size={15} /> Connected to Google Drive
              </div>
              {remoteInfo && (
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  Last Drive backup: {new Date(remoteInfo.modifiedTime).toLocaleString()}
                </p>
              )}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={handleBackupNow}
                  disabled={busy !== null}
                  className="py-3 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-all active:scale-[0.96] cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {busy === 'backup' ? <RefreshCw size={15} className="animate-spin" /> : <CloudUpload size={15} />}
                  Backup Now
                </button>
                <button
                  onClick={handleRestore}
                  disabled={busy !== null}
                  className="py-3 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-[0.96] cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {busy === 'restore' ? <RefreshCw size={15} className="animate-spin" /> : <CloudDownload size={15} />}
                  Restore
                </button>
              </div>
              <button
                onClick={handleDisconnect}
                className="w-full py-2.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <LogOut size={14} /> Disconnect
              </button>
            </>
          )}

          {error && (
            <div className="flex items-start gap-2 text-xs font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/60 rounded-xl px-3.5 py-2.5">
              <AlertTriangle size={15} className="shrink-0 mt-0.5" /> {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/60 rounded-xl px-3.5 py-2.5">
              <CheckCircle2 size={15} /> {success}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
