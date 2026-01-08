import type { Habit } from '../types';
import { createBackupPayload, parseBackupJson } from './backupService';

// Browser fallback export
function exportInBrowser(filename: string, jsonText: string) {
  const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(jsonText);
  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', filename);
  linkElement.click();
}

function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && typeof (window as any).__TAURI__ !== 'undefined';
}

const LAST_EXPORT_PATH_KEY = 'habitflow_last_export_path_v1';

export async function exportBackup(habits: Habit[]): Promise<string | void> {
  const filename = `habitflow-backup-${new Date().toISOString().split('T')[0]}.json`;
  const payload = createBackupPayload(habits);
  const jsonText = JSON.stringify(payload, null, 2);

  if (!isTauriRuntime()) {
    exportInBrowser(filename, jsonText);
    return;
  }

  const { save } = await import('@tauri-apps/plugin-dialog');
  const { writeTextFile, mkdir, exists } = await import('@tauri-apps/plugin-fs');
  const { documentDir, join } = await import('@tauri-apps/api/path');

  // If the user already picked a destination before, reuse it.
  try {
    const lastPath = localStorage.getItem(LAST_EXPORT_PATH_KEY);
    if (lastPath) {
      try {
        await writeTextFile(lastPath, jsonText);
        return lastPath;
      } catch (e) {
        console.warn('Failed to write to cached path:', lastPath, e);
        // If the stored location is no longer writable/allowed, fall back to prompting again.
        localStorage.removeItem(LAST_EXPORT_PATH_KEY);
      }
    }
  } catch {
    // If localStorage is unavailable, just prompt.
  }

  const baseDir = await documentDir();
  const backupDir = await join(baseDir, 'HabitFlow');

  const dirExists = await exists(backupDir);
  if (!dirExists) {
    await mkdir(backupDir, { recursive: true });
  }

  const defaultPath = await join(backupDir, filename);
  const selectedPath = await save({
    defaultPath,
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });

  if (!selectedPath) return;

  try {
    await writeTextFile(selectedPath, jsonText);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/not allowed|denied|forbidden/i.test(message)) {
      throw new Error(
        'Cannot write to the selected location due to Tauri file access permissions. Please choose a folder under Documents, Downloads, or Desktop.'
      );
    }
    throw err;
  }

  try {
    localStorage.setItem(LAST_EXPORT_PATH_KEY, selectedPath);
  } catch {
    // ignore
  }

  return selectedPath;
}

export async function importBackup(): Promise<Habit[] | null> {
  if (!isTauriRuntime()) {
    throw new Error('Browser import is handled via file picker.');
  }

  const { open } = await import('@tauri-apps/plugin-dialog');
  const { readTextFile } = await import('@tauri-apps/plugin-fs');
  const { documentDir, join } = await import('@tauri-apps/api/path');

  const baseDir = await documentDir();
  const backupDir = await join(baseDir, 'HabitFlow');

  const selected = await open({
    defaultPath: backupDir,
    multiple: false,
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });

  if (!selected) return null;
  if (Array.isArray(selected)) return null;

  const text = await readTextFile(selected);
  return parseBackupJson(text);
}

const AUTO_BACKUP_KEY = 'habitflow_auto_backup_enabled_v1';
const LAST_AUTO_BACKUP_KEY = 'habitflow_last_auto_backup_iso_v1';

export function isAutoBackupEnabled(): boolean {
  try {
    return localStorage.getItem(AUTO_BACKUP_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setAutoBackupEnabled(enabled: boolean) {
  try {
    localStorage.setItem(AUTO_BACKUP_KEY, enabled ? 'true' : 'false');
  } catch {
    // ignore
  }
}

export async function maybeAutoBackup(habits: Habit[]): Promise<void> {
  if (!isTauriRuntime()) return;
  if (!isAutoBackupEnabled()) return;

  const now = new Date();
  const today = now.toISOString().split('T')[0];

  try {
    const last = localStorage.getItem(LAST_AUTO_BACKUP_KEY);
    if (last && last.startsWith(today)) {
      return; // already backed up today
    }
  } catch {
    // ignore
  }

  const payload = createBackupPayload(habits);
  const jsonText = JSON.stringify(payload, null, 2);

  const { writeTextFile, mkdir, exists } = await import('@tauri-apps/plugin-fs');
  const { appDataDir, join } = await import('@tauri-apps/api/path');

  const baseDir = await appDataDir();
  const backupDir = await join(baseDir, 'HabitFlow', 'Backups');

  const dirExists = await exists(backupDir);
  if (!dirExists) {
    await mkdir(backupDir, { recursive: true });
  }

  const filename = `autobackup-${today}.json`;
  const path = await join(backupDir, filename);
  await writeTextFile(path, jsonText);

  try {
    localStorage.setItem(LAST_AUTO_BACKUP_KEY, now.toISOString());
  } catch {
    // ignore
  }
}
