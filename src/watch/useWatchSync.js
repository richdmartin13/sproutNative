import { useEffect, useRef } from 'react';
import { sendHabitsToWatch, onWatchLog, onWatchUndo, onWatchResist } from './WatchBridge.js';
import { isCatVisible, shiftDate, localHourFromTs } from '../lib/util.js';

/**
 * Keeps the Apple Watch in sync with the current habits state.
 * Filters out archived habits before sending to watch.
 * Passes watch prefs (dismiss delay, haptic, showStats, showGrid, hourlyActivity) with habits.
 */
export function useWatchSync(habits, prefs, themeInfo, onLog, onUndo, onResist) {
  const timer = useRef(null);

  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const today = todayStr();
      const timeGates = prefs?.timeGates;
      const active = habits.filter(h => !h.archived && (!h.category || isCatVisible(h.category, timeGates)));

      const payload = active.map(h => {
        const todayCount = h.logs.filter(l => l.date === today).length;
        let streak = 0;
        const sorted = [...new Set(h.logs.map(l => l.date))].sort().reverse();
        let cursor = today;
        for (const d of sorted) {
          if (d === cursor) { streak++; cursor = prevDay(cursor); }
          else break;
        }
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

      // Hourly activity across all habits for today
      const hourly = Array(24).fill(0);
      for (const h of active) {
        for (const log of h.logs) {
          if (log.date === today && log.ts) {
            const hour = localHourFromTs(log.ts);
            if (hour >= 0 && hour < 24) hourly[hour]++;
          }
        }
      }

      const categories = [...new Set(active.map(h => h.category).filter(Boolean))].sort();

      // Last 7 days of aggregate progress for the weekly widget (index 0 = 6 days ago, 6 = today)
      const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
      const weeklyBars = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        const dateStr = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
        const label   = i === 6 ? 'T' : DAY_LABELS[d.getDay()];
        let done = 0, total = 0;
        for (const h of active) {
          total++;
          const count = h.logs.filter(l => l.date === dateStr).length;
          if (h.type === 'st' ? count === 0 : count > 0) done++;
        }
        return { label, done, total };
      });

      const watchPrefs = {
        dismissDelay:   prefs?.watchDismiss ?? 2,
        haptic:         prefs?.watchHaptic !== false,
        showStats:      prefs?.watchShowStats !== false,
        showGrid:       prefs?.watchShowGrid === true,
        showCategory:   prefs?.watchShowCategory !== false,
        categories,
        hourlyActivity: hourly,
        accentHex:      themeInfo?.accent ?? '#2d6e47',
        isDark:         themeInfo?.isDark ?? true,
        weeklyBars,
      };

      sendHabitsToWatch(payload, watchPrefs);
    }, 400);
    return () => clearTimeout(timer.current);
  }, [habits, prefs?.watchDismiss, prefs?.watchHaptic, prefs?.watchShowStats, prefs?.watchShowGrid, prefs?.watchShowCategory, themeInfo?.accent, themeInfo?.isDark]);

  useEffect(() => { return onWatchLog(id => onLog(id)); }, [onLog]);
  useEffect(() => { if (!onUndo) return; return onWatchUndo(id => onUndo(id)); }, [onUndo]);
  useEffect(() => { if (!onResist) return; return onWatchResist(id => onResist(id)); }, [onResist]);

}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;
}
function p(n) { return String(n).padStart(2, '0'); }
function prevDay(s) {
  return shiftDate(s, -1);
}
