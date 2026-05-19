import React, { createContext, useContext, useState, useCallback, useRef, useMemo, useEffect } from 'react';

// icon values must match keys in TutorialCard's ICON_MAP (lucide-react-native names)
export const TUTORIAL_STEPS = {
  home: [
    {
      id: 'filters',
      icon: 'List',
      title: 'Your habits',
      body: "Use the type chips to filter by Start (build), Stop (break), or Neutral (track). Category chips appear once you've added categories to habits — time-gated categories only show during their active window. The grid/list toggle switches your view.",
      type: 'intro',
    },
    {
      id: 'new_habit_info',
      icon: 'Plus',
      title: 'Create a habit',
      body: "Give your habit a name and a category — both are required. Then choose its type: Start to build it, Stop to break it, or Neutral to simply track it.",
      type: 'info',
    },
    {
      id: 'open_new_habit',
      icon: 'Plus',
      title: 'Tap + to begin',
      body: "Tap the + button in the bottom-right to create your first habit.",
      type: 'action',
      action: 'open_new_habit',
    },
    {
      id: 'habit_saved',
      icon: 'Zap',
      title: 'Fill in the details',
      body: "Fill in the name, category, and type, then tap Save.",
      type: 'action',
      action: 'habit_saved',
    },
    {
      id: 'tap_it',
      icon: 'Home',
      title: 'Habit created!',
      body: "Your new habit is now in the list. Tap its card to open the tracking screen.",
      type: 'info',
    },
    {
      id: 'log_habit',
      icon: 'Zap',
      title: 'Tap your habit',
      body: "Tap the habit card now to open the tracking screen.",
      type: 'action',
      action: 'log_habit',
    },
    {
      id: 'tap_screen',
      icon: 'Zap',
      title: 'The tracking screen',
      body: "The big number shows today's count — tap the zone to log. Stats at the top show today, your streak (or days-since for stop habits), and all-time total. Use Undo to remove the last tap, Repeat to copy the previous log, or + Details to add notes, tags, mood, and more.",
      type: 'info',
    },
    {
      id: 'done',
      icon: 'ArrowRight',
      title: 'All set!',
      body: "Head to Analytics to see your patterns over time.",
      type: 'finish',
    },
  ],
  insights: [
    {
      id: 'welcome',
      icon: 'BarChart3',
      title: 'Your analytics',
      body: "Charts here update automatically as you log. Switch between All-time and Daily views using the toggle in the filter bar. The more you log, the richer the data.",
      type: 'intro',
    },
    {
      id: 'heatmap',
      icon: 'Clock',
      title: 'Heatmap and hourly',
      body: "The heatmap shows 26 weeks of activity — tap any cell to jump to that day's view. The hourly chart shows which times of day you log, broken down by hour.",
      type: 'info',
    },
    {
      id: 'trends',
      icon: 'TrendingUp',
      title: '30-day trends',
      body: "The trends section shows 30-day rolling activity lines per habit — useful for spotting consistency and momentum over the past month.",
      type: 'info',
    },
    {
      id: 'more',
      icon: 'List',
      title: 'More sections',
      body: "Scroll down to find spider patterns, rankings, correlations, mood and energy breakdown, day-of-week chart, tag cloud, and resistance stats for stop habits.",
      type: 'info',
    },
    {
      id: 'done',
      icon: 'ArrowRight',
      title: 'Keep logging!',
      body: "Charts deepen with every entry. Come back often to spot patterns.",
      type: 'finish',
    },
  ],
  settings: [
    {
      id: 'overview',
      icon: 'Settings',
      title: 'Settings',
      body: "Customize Sprout to fit your life. Tap any row to open its options.",
      type: 'intro',
    },
    {
      id: 'appearance',
      icon: 'Palette',
      title: 'Appearance',
      body: "Pick a color scheme and switch between light, dark, or system-matched themes.",
      type: 'info',
    },
    {
      id: 'layout',
      icon: 'LayoutGrid',
      title: 'Layout & Behavior',
      body: "Set your default view (list or grid), sort order, compact cards, logging shortcuts, and analytics defaults.",
      type: 'info',
    },
    {
      id: 'fields',
      icon: 'PenLine',
      title: 'Logging Fields',
      body: "Choose which fields appear when logging — mood, energy, tags, notes, and more. Drag the grip handles to reorder.",
      type: 'info',
    },
    {
      id: 'timegates',
      icon: 'Clock',
      title: 'Time Gates',
      body: "Schedule when categories appear. Mark a window as Available (only shows then) or Unavailable (hidden then). Stack multiple gates per category for complex schedules.",
      type: 'info',
    },
    {
      id: 'analytics_sections',
      icon: 'BarChart3',
      title: 'Analytics Sections',
      body: "Choose which insights to display and drag them into your preferred order.",
      type: 'info',
    },
    {
      id: 'data',
      icon: 'Database',
      title: 'Data',
      body: "Export your habits and logs as JSON for safekeeping, import from a backup, or clear all data.",
      type: 'info',
    },
    {
      id: 'done',
      icon: 'ArrowRight',
      title: 'Explore away',
      body: "Settings stick instantly — no save button needed. Come back anytime to tune things up.",
      type: 'finish',
    },
  ],
};

const TutorialCtx = createContext(null);

export function TutorialProvider({ children }) {
  const [tut, setTut] = useState({ active: false, screen: null, step: 0 });
  const onEndRef    = useRef(null);
  const prevActiveRef = useRef(false);

  useEffect(() => {
    if (!tut.active && prevActiveRef.current) {
      onEndRef.current?.();
      onEndRef.current = null;
    }
    prevActiveRef.current = tut.active;
  }, [tut.active]);

  const startTutorial = useCallback((screen, onEnd) => {
    onEndRef.current = onEnd ?? null;
    setTut({ active: true, screen, step: 0 });
  }, []);

  const nextStep = useCallback(() => {
    setTut(t => {
      const len = (TUTORIAL_STEPS[t.screen] || []).length;
      if (t.step >= len - 1) return { ...t, active: false };
      return { ...t, step: t.step + 1 };
    });
  }, []);

  const endTutorial = useCallback(() => {
    setTut(t => ({ ...t, active: false }));
  }, []);

  const advanceOnAction = useCallback((action) => {
    setTut(t => {
      if (!t.active) return t;
      const steps = TUTORIAL_STEPS[t.screen] || [];
      const cur = steps[t.step];
      if (!cur || cur.type !== 'action' || cur.action !== action) return t;
      if (t.step >= steps.length - 1) return { ...t, active: false };
      return { ...t, step: t.step + 1 };
    });
  }, []);

  const steps = useMemo(
    () => tut.active && tut.screen ? (TUTORIAL_STEPS[tut.screen] || []) : [],
    [tut.active, tut.screen],
  );

  return (
    <TutorialCtx.Provider value={{
      ...tut, steps,
      currentStep: steps[tut.step] ?? null,
      startTutorial, nextStep, endTutorial, advanceOnAction,
    }}>
      {children}
    </TutorialCtx.Provider>
  );
}

export function useTutorial() {
  return useContext(TutorialCtx);
}
