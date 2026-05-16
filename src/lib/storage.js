import AsyncStorage from '@react-native-async-storage/async-storage';
import { normHabit } from './util.js';

export const STORAGE_KEY = 'sprout_v1';

export const DEF_PREFS = {
  dark: true,
  scheme: 'sprout',
  viewMode: 'list',
  showStreak: true,
  compact: false,
  insDay: false,
  repeatLastDefault: false,
  repeatLastMoodEnergy: false,
  autoTagRecentHabits: false,
  sections: {
    spider: true, hourly: true, heatmap: true, trends: true,
    rankings: true, mood: true, time: true, tags: true,
    resist: true, co: true, log: true,
  },
  track: {
    mood: true, energy: true, ease: true, duration: true,
    resist: true, trigger: true, context: true, tags: true, notes: true,
  },
};

function defaultData() {
  return {
    habits: [],
    prefs: { ...DEF_PREFS, sections: { ...DEF_PREFS.sections }, track: { ...DEF_PREFS.track } },
  };
}

function normalize(d) {
  const base = defaultData();
  return {
    habits: Array.isArray(d.habits) ? d.habits.map(normHabit) : [],
    prefs: {
      ...base.prefs,
      ...(d.prefs || {}),
      sections: { ...base.prefs.sections, ...((d.prefs && d.prefs.sections) || {}) },
      track:    { ...base.prefs.track,    ...((d.prefs && d.prefs.track)    || {}) },
    },
  };
}

export async function loadData() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultData();
    return normalize(JSON.parse(raw));
  } catch {
    return defaultData();
  }
}

export async function saveData(data) {
  try { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

// Identical to web: returns a JSON string (not wrapped object)
export function exportJson(data) {
  return JSON.stringify(data, null, 2);
}

// Identical to web: takes a JSON string + current data, returns { data, summary }
export function importJson(text, current) {
  const incoming = normalize(JSON.parse(text));
  const map = new Map(current.habits.map(h => [h.id, h]));
  let newHabits = 0, newLogs = 0;
  for (const h of incoming.habits) {
    if (!map.has(h.id)) {
      map.set(h.id, h); newHabits++; newLogs += h.logs.length;
    } else {
      const existing = map.get(h.id);
      const logIds = new Set(existing.logs.map(l => l.id));
      for (const l of h.logs) {
        if (!logIds.has(l.id)) { existing.logs.push(l); newLogs++; }
      }
    }
  }
  return {
    data: { habits: Array.from(map.values()), prefs: current.prefs },
    summary: { newHabits, newLogs },
  };
}
