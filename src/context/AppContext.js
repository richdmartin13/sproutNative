import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { Linking, Platform, useColorScheme } from 'react-native';
import { File as ExpoFile } from 'expo-file-system';
import { loadData, saveData, importJson } from '../lib/storage.js';
import { getTheme } from '../lib/theme.js';
import { normLog, todayStr } from '../lib/util.js';
import { useWatchSync } from '../watch/useWatchSync.js';
import { onWatchPrefUpdate } from '../watch/WatchBridge.js';
import { TEST_HABITS } from '../lib/testData.js';

const Ctx = createContext(null);

export function AppProvider({ children }) {
  const [data, setData] = useState(null);
  const [ready, setReady] = useState(false);
  const [pendingImportUrl, setPendingImportUrl] = useState(null);
  const [toast, setToast] = useState(null); // { title?, message? }
  const showToast  = useCallback((t) => setToast(typeof t === 'string' ? { message: t } : t), []);
  const clearToast = useCallback(() => setToast(null), []);

  // Ephemeral test dataset — mutable while useTestData is on, discarded when toggled off
  const [testHabitsState, setTestHabitsState] = useState(null);

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
        showToast({
          title: 'Import complete',
          message: `Added ${summary.newHabits} habit${summary.newHabits !== 1 ? 's' : ''} and ${summary.newLogs} log${summary.newLogs !== 1 ? 's' : ''}.`,
        });
      } catch (e) {
        showToast({ title: 'Import failed', message: 'The file could not be read or is not valid Sprout data.' });
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
      // Seed a sample habit on a fresh install so the tutorial has something to demonstrate.
      // The 'seeded' flag prevents re-adding if the user later deletes all habits.
      if (d.habits.length === 0 && !d.prefs?.seeded) {
        d = {
          ...d,
          habits: [{
            id: 'sample_morning_walk',
            name: 'Morning Walk',
            type: 'go',
            category: 'Health',
            goal: 1,
            logs: [],
            createdAt: new Date().toISOString(),
          }],
          prefs: { ...d.prefs, seeded: true },
        };
      }
      setData(d);
      setReady(true);
    }
    load();
  }, []);

  useEffect(() => {
    if (!data || !ready) return;
    saveData(data);
  }, [data]);

  // Sync ephemeral test state when the useTestData toggle changes
  useEffect(() => {
    const on = data?.prefs?.dev?.useTestData;
    if (on && !testHabitsState) {
      // Clone TEST_HABITS so mutations don't affect the frozen export
      setTestHabitsState(JSON.parse(JSON.stringify(TEST_HABITS)));
    } else if (!on && testHabitsState) {
      setTestHabitsState(null);
    }
  }, [data?.prefs?.dev?.useTestData]);

  const setPrefs = useCallback(p => setData(d => ({...d, prefs:p})), []);

  const upsertHabit = useCallback(next => setData(d => {
    const exists = d.habits.some(h => h.id === next.id);
    return { ...d, habits: exists ? d.habits.map(h => h.id===next.id ? next : h) : [...d.habits, next] };
  }), []);

  const deleteHabit  = useCallback(id => setData(d => ({...d, habits: d.habits.filter(h => h.id!==id)})), []);
  const archiveHabit = useCallback(id => setData(d => ({...d, habits: d.habits.map(h => h.id===id ? {...h, archived:true}  : h)})), []);
  const restoreHabit = useCallback(id => setData(d => ({...d, habits: d.habits.map(h => h.id===id ? {...h, archived:false} : h)})), []);

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

  // Watch log handler: routes to ephemeral test state when useTestData is on
  const handleWatchLog = useCallback((habitId) => {
    if (data?.prefs?.dev?.useTestData) {
      const log = {
        id: `test_log_${Date.now()}`,
        date: todayStr(),
        ts: new Date().toISOString(),
        tags: [], notes: '',
      };
      setTestHabitsState(hs => hs
        ? hs.map(h => h.id === habitId ? {...h, logs: [...h.logs, log]} : h)
        : hs
      );
    } else {
      addLog(habitId, { date: todayStr(), tags: [], notes: '' });
    }
  }, [addLog, data?.prefs?.dev?.useTestData]);

  // Watch resist handler
  const handleWatchResist = useCallback((habitId) => {
    if (data?.prefs?.dev?.useTestData) {
      const log = {
        id: `test_log_${Date.now()}`,
        date: todayStr(),
        ts: new Date().toISOString(),
        tags: [], notes: '', resist: 'yes',
      };
      setTestHabitsState(hs => hs
        ? hs.map(h => h.id === habitId ? {...h, logs: [...h.logs, log]} : h)
        : hs
      );
    } else {
      addLog(habitId, { date: todayStr(), tags: [], notes: '', resist: 'yes' });
    }
  }, [addLog, data?.prefs?.dev?.useTestData]);

  // Watch undo handler: removes most recent today-log
  const handleWatchUndo = useCallback((habitId) => {
    if (data?.prefs?.dev?.useTestData) {
      const today = todayStr();
      setTestHabitsState(hs => {
        if (!hs) return hs;
        return hs.map(h => {
          if (h.id !== habitId) return h;
          const todayLogs = h.logs.filter(l => l.date === today);
          if (!todayLogs.length) return h;
          const last = todayLogs[todayLogs.length - 1];
          return { ...h, logs: h.logs.filter(l => l.id !== last.id) };
        });
      });
    } else {
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
    }
  }, [data?.prefs?.dev?.useTestData]);

  const systemColorScheme = useColorScheme();
  const theme = getTheme(data?.prefs, systemColorScheme === 'dark');

  // habits: test dataset when dev.useTestData is on, otherwise real habits
  const habits = useMemo(
    () => data?.prefs?.dev?.useTestData
      ? (testHabitsState ?? TEST_HABITS)
      : (data?.habits ?? []),
    [data?.habits, data?.prefs?.dev?.useTestData, testHabitsState],
  );

  // Keep Apple Watch in sync — must come AFTER theme and habits are defined
  useWatchSync(habits, data?.prefs ?? {}, theme, handleWatchLog, handleWatchUndo, handleWatchResist);

  // Mirror pref changes initiated on the watch back to iPhone storage
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    return onWatchPrefUpdate((key, value) => {
      setData(d => d ? { ...d, prefs: { ...d.prefs, [key]: value } } : d);
    });
  }, []);

  return (
    <Ctx.Provider value={{ data, ready, theme, habits, setPrefs, upsertHabit, deleteHabit, archiveHabit, restoreHabit, addLog, updateLog, deleteLog, setData, toast, showToast, clearToast }}>
      {children}
    </Ctx.Provider>
  );
}

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useApp outside AppProvider');
  return ctx;
}
