import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

const { SproutWatchBridge } = NativeModules;
const emitter = SproutWatchBridge
  ? new NativeEventEmitter(SproutWatchBridge)
  : null;

/** Push current habits + watch prefs to the Apple Watch. No-op on Android / simulator. */
export function sendHabitsToWatch(habits, watchPrefs) {
  if (Platform.OS !== 'ios' || !SproutWatchBridge) return;
  try {
    SproutWatchBridge.sendHabits(
      JSON.stringify(habits),
      watchPrefs ? JSON.stringify(watchPrefs) : null,
    );
  } catch (e) {
    if (__DEV__) console.warn('[WatchBridge] sendHabits:', e);
  }
}

/** Subscribe to log events triggered from the watch (habit logged). */
export function onWatchLog(callback) {
  if (!emitter) return () => {};
  const sub = emitter.addListener('WatchLog', ({ id }) => callback(id));
  return () => sub.remove();
}

/** Subscribe to resist events triggered from the watch (habit resisted). */
export function onWatchResist(callback) {
  if (!emitter) return () => {};
  const sub = emitter.addListener('WatchResist', ({ id }) => callback(id));
  return () => sub.remove();
}

/** Subscribe to undo events triggered from the watch (user tapped Undo). */
export function onWatchUndo(callback) {
  if (!emitter) return () => {};
  const sub = emitter.addListener('WatchUndo', ({ id }) => callback(id));
  return () => sub.remove();
}

/** Subscribe to watch reachability changes. */
export function onWatchReachability(callback) {
  if (!emitter) return () => {};
  const sub = emitter.addListener('WatchReachability', ({ reachable }) => callback(reachable));
  return () => sub.remove();
}

/** Subscribe to pref-update events sent from the watch (setting changed on watch). */
export function onWatchPrefUpdate(callback) {
  if (!emitter) return () => {};
  const sub = emitter.addListener('WatchPrefUpdate', ({ key, value }) => callback(key, value));
  return () => sub.remove();
}
