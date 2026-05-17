import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Linking, Alert, Platform } from 'react-native';
import { File as ExpoFile } from 'expo-file-system';
import { loadData, saveData, importJson } from '../lib/storage.js';
import { getTheme } from '../lib/theme.js';
import { normLog, todayStr } from '../lib/util.js';
import { useWatchSync } from '../watch/useWatchSync.js';

const Ctx = createContext(null);

export function AppProvider({ children }) {
  const [data, setData] = useState(null);
  const [ready, setReady] = useState(false);
  const [pendingImportUrl, setPendingImportUrl] = useState(null);

  // Capture file:// URLs from Share Sheet (cold-start and while running)
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    Linking.getInitialURL().then(url => { if (url) setPendingImportUrl(url); });
    const sub = Linking.addEventListener('url', ({ url }) => { if (url) setPendingImportUrl(url); });
    return () => sub.remove();
  }, []);

  // Process pending import once data is loaded
  useEffect(() => {
    if (!pendingImportUrl || !data || !ready) return;
    const url = pendingImportUrl;
    setPendingImportUrl(null);
    (async () => {
      try {
        const text = await new ExpoFile(url).text();
        const { data: next, summary } = importJson(text, data);
        setData(next);
        Alert.alert(
          'Import complete',
          `Added ${summary.newHabits} habit${summary.newHabits !== 1 ? 's' : ''} and ${summary.newLogs} log${summary.newLogs !== 1 ? 's' : ''}.`,
        );
      } catch (e) {
        Alert.alert('Import failed', 'The file could not be read or is not valid Sprout data.');
      }
    })();
  }, [pendingImportUrl, data, ready]);

  useEffect(() => {
    // Load with retry — on first sideload install AsyncStorage container
    // may not be initialised yet; a single retry after 200ms resolves it.
    async function load() {
      let d = await loadData();
      if (!d || !d.habits) {
        await new Promise(r => setTimeout(r, 200));
        d = await loadData();
      }
      setData(d);
      setReady(true);
    }
    load();
  }, []);

  // Persist on every data change, but only once ready
  useEffect(() => { if (data && ready) saveData(data); }, [data]);

  const setPrefs = useCallback(p => setData(d => ({...d, prefs:p})), []);

  const upsertHabit = useCallback(next => setData(d => {
    const exists = d.habits.some(h => h.id === next.id);
    return { ...d, habits: exists ? d.habits.map(h => h.id===next.id ? next : h) : [...d.habits, next] };
  }), []);

  const deleteHabit = useCallback(id => setData(d => ({...d, habits: d.habits.filter(h => h.id!==id)})), []);

  const addLog = useCallback((habitId, log) => {
    const n = normLog(log);
    setData(d => ({...d, habits: d.habits.map(h => h.id===habitId ? {...h, logs:[...h.logs,n]} : h)}));
    return n;
  }, []);

  const updateLog = useCallback((habitId, next) => setData(d => ({
    ...d, habits: d.habits.map(h => h.id===habitId ? {...h, logs: h.logs.map(l => l.id===next.id ? next : l)} : h)
  })), []);

  const deleteLog = useCallback((habitId, logId) => setData(d => ({
    ...d, habits: d.habits.map(h => h.id===habitId ? {...h, logs: h.logs.filter(l => l.id!==logId)} : h)
  })), []);

  // Watch log handler: quick-tap from watch creates a minimal log entry
  const handleWatchLog = useCallback((habitId) => {
    addLog(habitId, { date: todayStr(), tags: [], notes: '' });
  }, [addLog]);

  // Watch undo handler: removes the most recent today-log for the habit
  const handleWatchUndo = useCallback((habitId) => {
    const today = todayStr();
    setData(d => ({
      ...d,
      habits: d.habits.map(h => {
        if (h.id !== habitId) return h;
        const todayLogs = h.logs.filter(l => l.date === today);
        if (!todayLogs.length) return h;
        const last = todayLogs[todayLogs.length - 1];
        return { ...h, logs: h.logs.filter(l => l.id !== last.id) };
      }),
    }));
  }, []);

  // Keep Apple Watch in sync whenever habits change
  useWatchSync(data?.habits ?? [], handleWatchLog, handleWatchUndo);

  const theme = getTheme(data?.prefs);

  return (
    <Ctx.Provider value={{ data, ready, theme, setPrefs, upsertHabit, deleteHabit, addLog, updateLog, deleteLog, setData }}>
      {children}
    </Ctx.Provider>
  );
}

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useApp outside AppProvider');
  return ctx;
}
