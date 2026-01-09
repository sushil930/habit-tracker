import { isTauri } from '@tauri-apps/api/core';
import { disable, enable, isEnabled } from '@tauri-apps/plugin-autostart';

export async function isAutostartEnabled(): Promise<boolean> {
  if (!isTauri()) return false;
  try {
    return await isEnabled();
  } catch {
    return false;
  }
}

export async function setAutostartEnabled(enabled: boolean): Promise<void> {
  if (!isTauri()) return;
  if (enabled) {
    await enable();
  } else {
    await disable();
  }
}
