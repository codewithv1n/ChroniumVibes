/**
 * VinVibes — Notifications are required: the background playback service
 * and the lock screen player both run through the media notification.
 */

import { Linking, PermissionsAndroid, Platform } from 'react-native';
import { createStore } from '../core/store';

const PERMISSION = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;

// The runtime permission exists from Android 13 (API 33); older versions allow notifications by default.
const needsPermission = Platform.OS === 'android' && Platform.Version >= 33;

export const systemStore = createStore({ notificationsEnabled: true });

/** Re-read the notification permission without prompting (on start and when returning to the app). */
export async function refreshSystemStatus() {
  if (!needsPermission) return;
  try {
    systemStore.setState({ notificationsEnabled: await PermissionsAndroid.check(PERMISSION) });
  } catch (error) {
    // Keep the last known value.
  }
}

/**
 * Ask for notifications: the system dialog first, then the app's settings
 * page when Android won't show the dialog anymore.
 */
export async function enableNotifications() {
  if (!needsPermission) return;
  try {
    const result = await PermissionsAndroid.request(PERMISSION);
    if (result === PermissionsAndroid.RESULTS.GRANTED) {
      systemStore.setState({ notificationsEnabled: true });
      return;
    }
    // Plain "Don't allow": the dialog can still be shown next time.
    if (result === PermissionsAndroid.RESULTS.DENIED) return;
  } catch (error) {
    // Fall through to settings.
  }
  Linking.openSettings();
}
