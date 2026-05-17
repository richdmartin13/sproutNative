import { useEffect, useRef } from 'react';
import { sendHabitsToWatch, onWatchLog, onWatchUndo } from './WatchBridge.js';
import { todayStr } from '../lib/util.js';

/**
 * Keeps the Apple Watch in sync with the current habits state.
 *
 * - Pushes a compact snapshot whenever `habits` changes.
 * - Listens for WatchLog events (user tapped "Log it" on watch)
 *   and calls `onLog(id)` so AppContext can record the tap.
 */
export function useWatchSync(habits, onLog, onUndo) {
  // Push habits whenever the array changes (debounced 400 ms)
  const timer = useRef(null);
  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const today = todayStr();
      const payload = habits.map(h => {
        const todayCount = h.logs.filter(l => l.date === today).length;
        // streak: consecutive days logged up to today
        let streak = 0;
        const sorted = [...new Set(h.logs.map(l => l.date))].sort().reverse();
        let cursor = today;
        for (const d of sorted) {
          if (d === cursor) { streak++; cursor = prevDay(cursor); }
          else break;
        }
        // days since last log (for stop habits)
        const last = sorted[0];
        const daysSince = last
          ? Math.floor((Date.parse(today) - Date.parse(last)) / 86400000)
          : null;

        return {
          id:         h.id,
          name:       h.name,
          type:       h.type,
          category:   h.category || '',
          todayCount,
          streak,
          daysSince:  h.type === 'st' ? daysSince : null,
        };
      });
      sendHabitsToWatch(payload);
    }, 400);
    return () => clearTimeout(timer.current);
  }, [habits]);

  // Listen for watch-initiated logs
  useEffect(() => {
    return onWatchLog(id => onLog(id));
  }, [onLog]);

  // Listen for watch-initiated undos
  useEffect(() => {
    if (!onUndo) return;
    return onWatchUndo(id => onUndo(id));
  }, [onUndo]);
}

function prevDay(dateStr) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}
