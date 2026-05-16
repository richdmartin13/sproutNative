import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

const { SproutWatchBridge } = NativeModules;
const emitter = SproutWatchBridge
  ? new NativeEventEmitter(SproutWatchBridge)
  : null;

/** Push current habits to the Apple Watch. No-op on Android / simulator. */
export function sendHabitsToWatch(habits) {
  if (Platform.OS !== 'ios' || !SproutWatchBridge) return;
  try {
    SproutWatchBridge.sendHabits(JSON.stringify(habits));
  } catch (e) {
    if (__DEV__) console.warn('[WatchBridge] sendHabits:', e);
  }
}

/**
 * Subscribe to log events triggered from the watch.
 * @param {(id: string) => void} callback - called with the habit id
 * @returns {() => void} unsubscribe function
 */
export function onWatchLog(callback) {
  if (!emitter) return () => {};
  const sub = emitter.addListener('WatchLog', ({ id }) => callback(id));
  return () => sub.remove();
}

/**
 * Subscribe to watch reachability changes.
 * @param {(reachable: boolean) => void} callback
 * @returns {() => void} unsubscribe function
 */
export function onWatchReachability(callback) {
  if (!emitter) return () => {};
  const sub = emitter.addListener('WatchReachability', ({ reachable }) => callback(reachable));
  return () => sub.remove();
}
