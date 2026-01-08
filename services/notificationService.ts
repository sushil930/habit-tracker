import { isTauri } from '@tauri-apps/api/core';
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';

export async function checkPermission() {
  if (!isTauri()) return false;
  
  let permissionGranted = await isPermissionGranted();
  
  if (!permissionGranted) {
    const permission = await requestPermission();
    permissionGranted = permission === 'granted';
  }
  
  return permissionGranted;
}

export async function sendHabitNotification(title: string, body: string) {
  if (!isTauri()) {
    console.log('Notification (Web):', title, body);
    if ('Notification' in window && window.Notification.permission === 'granted') {
       new Notification(title, { body });
    }
    return;
  }

  const hasPermission = await checkPermission();
  
  if (hasPermission) {
    sendNotification({
      title,
      body,
    });
  }
}
