import { NativeModules, Platform } from 'react-native';

const { SproutCloudBridge } = NativeModules;

function available() {
  return Platform.OS === 'ios' && !!SproutCloudBridge;
}

/** Write JSON string to iCloud Documents. Silently no-ops if iCloud unavailable. */
export async function saveToCloud(json) {
  if (!available()) return;
  try { await SproutCloudBridge.saveToCloud(json); } catch (e) {
    if (__DEV__) console.warn('[Cloud] save:', e);
  }
}

/** Read JSON string from iCloud Documents. Returns null if unavailable or no file. */
export async function loadFromCloud() {
  if (!available()) return null;
  try { return await SproutCloudBridge.loadFromCloud(); } catch { return null; }
}

/** Returns true if iCloud Documents is accessible on this device. */
export async function isCloudAvailable() {
  if (!available()) return false;
  try { return !!(await SproutCloudBridge.isAvailable()); } catch { return false; }
}
