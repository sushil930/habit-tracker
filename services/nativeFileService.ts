import type { Habit } from '../types';
import { createBackupPayload, parseBackupJson } from './backupService';
import { isTauri } from '@tauri-apps/api/core';

// Browser fallback export
function exportInBrowser(filename: string, jsonText: string) {
  const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(jsonText);
  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', filename);
  linkElement.click();
}

const LAST_EXPORT_DIR_KEY = 'habitflow_last_export_dir_v1';

export async function exportBackup(habits: Habit[]): Promise<string | void> {
  const filename = `habitflow-backup-${new Date().toISOString().split('T')[0]}.json`;
  const payload = createBackupPayload(habits);
  const jsonText = JSON.stringify(payload, null, 2);

  if (!isTauri()) {
    exportInBrowser(filename, jsonText);
    return;
  }

  const { save } = await import('@tauri-apps/plugin-dialog');
  const { writeTextFile, mkdir, exists } = await import('@tauri-apps/plugin-fs');
  const { documentDir, join, dirname } = await import('@tauri-apps/api/path');

  // Check if user has previously chosen a directory
  let cachedDir: string | null = null;
  try {
    cachedDir = localStorage.getItem(LAST_EXPORT_DIR_KEY);
  } catch {
    // localStorage unavailable
  }

  // If we have a cached directory, use it directly without prompting
  if (cachedDir) {
    try {
      const dirExists = await exists(cachedDir);
      if (!dirExists) {
        await mkdir(cachedDir, { recursive: true });
      }
      const fullPath = await join(cachedDir, filename);
      await writeTextFile(fullPath, jsonText);
      return fullPath;
    } catch (e) {
      console.warn('Failed to write to cached directory:', cachedDir, e);
      // Clear the cached path and fall through to prompt
      try {
        localStorage.removeItem(LAST_EXPORT_DIR_KEY);
      } catch {}
    }
  }

  // No cached directory or it failed - prompt user
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
        'Cannot write to the selected location due to Tauri file access permissions. Please choose a folder within your User directory (e.g., Documents, Desktop, Downloads).'
      );
    }
    throw err;
  }

  // Save the directory (not the full path) for next time
  try {
    const selectedDir = await dirname(selectedPath);
    localStorage.setItem(LAST_EXPORT_DIR_KEY, selectedDir);
  } catch {
    // ignore
  }

  return selectedPath;
}

export async function importBackup(): Promise<Habit[] | null> {
  if (!isTauri()) {
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
