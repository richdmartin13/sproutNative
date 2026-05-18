import React, { createContext, useContext, useState, useCallback, useRef, useMemo, useEffect } from 'react';

export const TUTORIAL_STEPS = {
  home: [
    {
      id: 'welcome',
      icon: '🌱',
      title: 'Welcome to Sprout',
      body: 'Your habits live here. Tap a card to log it, long-press for options like edit, archive, or delete.',
      type: 'intro',
    },
    {
      id: 'tap_log',
      icon: '👆',
      title: 'Tap to log',
      body: "Try tapping any habit card below — we'll move on as soon as you do.",
      type: 'action',
      action: 'log_habit',
      hint: 'up',
    },
    {
      id: 'filters',
      icon: '⊞',
      title: 'Filter your view',
      body: 'Use the Start, Stop, and Neutral chips to focus on specific habit types. The list/grid icons change your layout.',
      type: 'info',
      hint: 'up',
    },
    {
      id: 'add',
      icon: '+',
      title: 'Build your list',
      body: 'Tap the + button to create a new habit. Set its name, type, category, and daily goal.',
      type: 'info',
      hint: 'down',
    },
    {
      id: 'done',
      icon: '✓',
      title: "You're all set!",
      body: 'Head to Analytics to see your patterns, and Settings to personalize Sprout.',
      type: 'finish',
    },
  ],
  insights: [
    {
      id: 'overview',
      icon: '📊',
      title: 'Your patterns',
      body: 'Charts and stats update as you log habits. The more you log, the richer your data.',
      type: 'intro',
    },
    {
      id: 'filter',
      icon: '⊞',
      title: 'Filter by type',
      body: 'Use the Start, Stop, and Neutral chips at the top to focus charts on specific habit types.',
      type: 'info',
      hint: 'up',
    },
    {
      id: 'dates',
      icon: '📅',
      title: 'Change timeframe',
      body: 'Switch between 7d, 30d, 90d, and All time to zoom in on different periods.',
      type: 'info',
      hint: 'up',
    },
    {
      id: 'scroll',
      icon: '↕',
      title: 'Scroll to explore',
      body: "Below you'll find heatmaps, hourly activity, trends, mood charts, rankings, correlations, and resistance tracking.",
      type: 'info',
    },
    {
      id: 'done',
      icon: '✓',
      title: 'Keep logging!',
      body: 'Your analytics grow richer with every entry. Come back often.',
      type: 'finish',
    },
  ],
  settings: [
    {
      id: 'overview',
      icon: '⚙',
      title: 'Customize Sprout',
      body: 'Everything here saves automatically. Let\'s walk through the key options.',
      type: 'intro',
    },
    {
      id: 'color',
      icon: '🎨',
      title: 'Pick your color',
      body: 'Choose an accent color — it appears on cards, charts, and the nav bar throughout the app.',
      type: 'info',
      hint: 'up',
    },
    {
      id: 'logging',
      icon: '📝',
      title: 'Logging fields',
      body: 'Control what you track per habit type: ease, mood, energy, tags, trigger, context, notes, and more.',
      type: 'info',
      hint: 'up',
    },
    {
      id: 'done',
      icon: '✓',
      title: 'All set!',
      body: 'Retrigger any screen\'s tour from the Tours section here in Settings.',
      type: 'finish',
    },
  ],
};

const TutorialCtx = createContext(null);

export function TutorialProvider({ children }) {
  const [tut, setTut] = useState({ active: false, screen: null, step: 0 });
  const onEndRef = useRef(null);
  const prevActiveRef = useRef(false);

  // Fire onEnd callback when tutorial goes inactive
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
