import React, { createContext, useContext, useState, useCallback, useRef, useMemo, useEffect } from 'react';

// icon values must match keys in TutorialCard's ICON_MAP (lucide-react-native names)
export const TUTORIAL_STEPS = {
  home: [
    {
      id: 'welcome',
      icon: 'Home',
      title: 'Your habits',
      body: 'Every habit you track lives here. Tap a card to log it instantly, or long-press for options like edit, archive, and delete.',
      type: 'intro',
    },
    {
      id: 'tap_log',
      icon: 'Zap',
      title: 'Tap to log',
      body: 'Try tapping any habit card below — we will move on automatically once you do.',
      type: 'action',
      action: 'log_habit',
    },
    {
      id: 'filters',
      icon: 'List',
      title: 'Filter and sort',
      body: 'The type chips (Start, Stop, Neutral) filter your list. The list/grid icons in the top-right switch your layout. Category chips appear when you have categorised habits.',
      type: 'info',
    },
    {
      id: 'add',
      icon: 'Plus',
      title: 'Add a habit',
      body: 'Tap the + button in the bottom-right to create a new habit. Set its name, type (Start/Stop/Neutral), category, and daily goal.',
      type: 'info',
    },
    {
      id: 'done',
      icon: 'ArrowRight',
      title: 'All set!',
      body: 'Head to Analytics to see your patterns, and Settings to personalise colors, fields, and more.',
      type: 'finish',
    },
  ],
  insights: [
    {
      id: 'welcome',
      icon: 'BarChart3',
      title: 'Your analytics',
      body: 'Every chart here updates automatically as you log habits. The more you log, the richer the data.',
      type: 'intro',
    },
    {
      id: 'dates',
      icon: 'Clock',
      title: 'Change timeframe',
      body: 'Use the date arrows and range chips (7d, 30d, 90d, All) at the top to zoom in on any period, or tap into a specific day.',
      type: 'info',
    },
    {
      id: 'filter',
      icon: 'List',
      title: 'Filter by type',
      body: 'The Start, Stop, and Neutral chips filter every chart at once. Select one type to focus, or mix and match.',
      type: 'info',
    },
    {
      id: 'scroll',
      icon: 'TrendingUp',
      title: 'Scroll to explore',
      body: 'Below the filters you will find: activity heatmap, hourly breakdown, 30-day trends, spider chart, rankings, correlations, mood and energy patterns, day-of-week chart, tag cloud, and resistance stats.',
      type: 'info',
    },
    {
      id: 'done',
      icon: 'ArrowRight',
      title: 'Keep logging!',
      body: 'Charts deepen with every entry. Come back often to spot patterns.',
      type: 'finish',
    },
  ],
  settings: [
    {
      id: 'welcome',
      icon: 'Settings',
      title: 'Settings',
      body: 'Customise how Sprout looks and behaves. Every change saves automatically.',
      type: 'intro',
    },
    {
      id: 'appearance',
      icon: 'Palette',
      title: 'Appearance',
      body: 'Tap Appearance to pick your accent color, toggle dark mode, and enable Liquid Glass effects on iOS 26.',
      type: 'info',
    },
    {
      id: 'logging',
      icon: 'PenLine',
      title: 'Logging fields',
      body: 'Tap Logging Fields to control what appears when you log a habit. Enable or disable ease, mood, energy, duration, trigger, context, tags, and notes — per habit type.',
      type: 'info',
    },
    {
      id: 'done',
      icon: 'ArrowRight',
      title: 'Done!',
      body: 'You can replay any screen tour anytime from the Guided Tours section below.',
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
