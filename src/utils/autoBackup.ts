import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

const BACKUP_DIR = 'PaperTrackBackups';
const LAST_BACKUP_KEY = 'papertrack_last_auto_backup';
const KEEP_COUNT = 5;

// On Android, Documents is reachable from any file manager, so a user can recover a backup
// even if the app itself is broken or uninstalled. The web build has no such folder, so it
// falls back to the app's own (IndexedDB-backed) storage.
const backupDirectory = () => (Capacitor.isNativePlatform() ? Directory.Documents : Directory.Data);

export interface BackupResult {
  ok: boolean;
  filename?: string;
  error?: string;
}

export function getLastBackupTime(): number | null {
  const raw = localStorage.getItem(LAST_BACKUP_KEY);
  if (!raw) return null;
  const parsed = parseInt(raw, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

export function isBackupStale(staleAfterDays = 7): boolean {
  const last = getLastBackupTime();
  if (last === null) return true;
  return Date.now() - last > staleAfterDays * 86400000;
}

export function formatBackupAge(timestamp: number | null): string {
  if (timestamp === null) return 'Never backed up';

  const minutes = Math.floor((Date.now() - timestamp) / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;

  const days = Math.floor(hours / 24);
  return days === 1 ? 'Yesterday' : `${days} days ago`;
}

async function ensureBackupDir(): Promise<void> {
  try {
    await Filesystem.mkdir({ path: BACKUP_DIR, directory: backupDirectory(), recursive: true });
  } catch {
    // Already exists - the plugin throws rather than no-oping, which is not an error for us
  }
}

// Keeps only the newest KEEP_COUNT backups so the folder doesn't grow without bound.
async function pruneOldBackups(): Promise<void> {
  try {
    const listing = await Filesystem.readdir({ path: BACKUP_DIR, directory: backupDirectory() });
    const backups = listing.files
      .filter(f => f.name.startsWith('papertrack-') && f.name.endsWith('.json'))
      .map(f => f.name)
      .sort(); // timestamped names sort chronologically

    const excess = backups.slice(0, Math.max(0, backups.length - KEEP_COUNT));
    for (const name of excess) {
      await Filesystem.deleteFile({ path: `${BACKUP_DIR}/${name}`, directory: backupDirectory() });
    }
  } catch {
    // A failed prune must never fail the backup itself
  }
}

export async function runAutoBackup(serializedState: string): Promise<BackupResult> {
  const filename = `papertrack-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;

  try {
    await ensureBackupDir();
    await Filesystem.writeFile({
      path: `${BACKUP_DIR}/${filename}`,
      data: serializedState,
      directory: backupDirectory(),
      encoding: Encoding.UTF8,
      recursive: true
    });
    localStorage.setItem(LAST_BACKUP_KEY, String(Date.now()));
    await pruneOldBackups();
    return { ok: true, filename };
  } catch (err) {
    return { ok: false, error: (err as Error)?.message || 'Could not write the backup file.' };
  }
}

export interface StoredBackup {
  name: string;
  path: string;
}

export async function listBackups(): Promise<StoredBackup[]> {
  try {
    const listing = await Filesystem.readdir({ path: BACKUP_DIR, directory: backupDirectory() });
    return listing.files
      .filter(f => f.name.startsWith('papertrack-') && f.name.endsWith('.json'))
      .map(f => ({ name: f.name, path: `${BACKUP_DIR}/${f.name}` }))
      .sort((a, b) => b.name.localeCompare(a.name));
  } catch {
    return [];
  }
}

export async function readBackup(path: string): Promise<string | null> {
  try {
    const file = await Filesystem.readFile({ path, directory: backupDirectory(), encoding: Encoding.UTF8 });
    return typeof file.data === 'string' ? file.data : null;
  } catch {
    return null;
  }
}
