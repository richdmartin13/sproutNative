// App-store-safe demo dataset for screenshots and developer testing.
// All habits are wholesome / productivity-focused.
// Patterns baked in:
//   Morning Run  → Screen Time Before Bed  (−75% on run days)
//   Healthy Meal → Skipping Breakfast      (−80% on meal days)
//   Skipping Breakfast → Procrastinating  (+380% on skip days)
//   Morning Run ↔ Meditation              (positive co-occurrence)
//   Reading ↔ Healthy Meal               (positive co-occurrence)

function lcg(seed) {
  let s = (seed | 0) >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) | 0;
    return (s >>> 0) / 4294967295;
  };
}

const TOTAL = 90;

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

// All dates: index 0 = oldest, index TOTAL-1 = today
const ALL_DATES = Array.from({ length: TOTAL }, (_, i) => daysAgo(TOTAL - 1 - i));

function genDateSet(seed, prob) {
  const rng = lcg(seed);
  const s = new Set();
  ALL_DATES.forEach(d => { if (rng() < prob) s.add(d); });
  return s;
}

function genCondDateSet(seed, condSet, baseProb, condProb) {
  const rng = lcg(seed);
  const s = new Set();
  ALL_DATES.forEach(d => { if (rng() < (condSet.has(d) ? condProb : baseProb)) s.add(d); });
  return s;
}

function makeLogs(habitId, dateSet, hourBase, extraFn) {
  const rng = lcg(habitId.split('').reduce((a, c) => a + c.charCodeAt(0), 0) * 997);
  return [...dateSet].sort().map(date => {
    const r1 = rng(), r2 = rng();
    const h = hourBase + Math.floor(r1 * 3);
    const m = Math.floor(r2 * 60);
    return {
      id: `demo_${habitId}_${date}`,
      date,
      ts: `${date}T${String(Math.min(h, 23)).padStart(2, '0')}:${String(m).padStart(2, '0')}:00.000Z`,
      tags: [],
      notes: '',
      ...(extraFn ? extraFn(rng) : {}),
    };
  });
}

// ── Driver date sets ──────────────────────────────────────────────────────────
const runDates  = genDateSet(1001, 0.40);   // ~36 days
const mealDates = genDateSet(1002, 0.63);   // ~57 days
const coffDates = genDateSet(1003, 0.85);   // ~76 days

// Meditation: 70% on run days, 16% otherwise
const medDates = genCondDateSet(1004, runDates, 0.16, 0.70);
// Reading: 55% on meal days, 27% otherwise
const readDates = genCondDateSet(1005, mealDates, 0.27, 0.55);
// Screen Time Before Bed: 12% on run days, 58% otherwise
const screenDates = genCondDateSet(1006, runDates, 0.58, 0.12);
// Skipping Breakfast: 7% on meal days, 42% otherwise
const skipDates = genCondDateSet(1007, mealDates, 0.07, 0.42);
// Procrastinating: 72% on skip-breakfast days, 13% otherwise
const procDates = genCondDateSet(1008, skipDates, 0.13, 0.72);

// ── Mood/energy extras ────────────────────────────────────────────────────────
const MOODS_POS  = ['good', 'fired up', 'good'];
const MOODS_NEU  = ['meh', 'tired', 'meh'];
const MOODS_NEG  = ['tired', 'meh', 'low'];
const ENERGY_HI  = ['high', 'high', 'medium'];
const ENERGY_LO  = ['low energy', 'low energy', 'medium'];

function pickRng(arr, rng) { return arr[Math.floor(rng() * arr.length)]; }

// ── Test habits ───────────────────────────────────────────────────────────────
export const TEST_HABITS = [
  {
    id: 'demo_run',
    name: 'Morning Run',
    type: 'go',
    category: 'Health',
    archived: false,
    logs: makeLogs('run', runDates, 6, rng => ({
      ease: 3 + Math.ceil(rng() * 2),
      mood: pickRng(MOODS_POS, rng),
      energy: pickRng(ENERGY_HI, rng),
      duration: 20 + Math.floor(rng() * 40),
      tags: [pickRng(['outdoor', 'cardio', 'morning', 'outdoor'], rng)],
    })),
  },
  {
    id: 'demo_med',
    name: 'Meditation',
    type: 'go',
    category: 'Wellness',
    archived: false,
    logs: makeLogs('med', medDates, 7, rng => ({
      mood: pickRng(MOODS_POS, rng),
      energy: 'medium',
      duration: 5 + Math.floor(rng() * 20),
      tags: [pickRng(['guided', 'breathing', 'morning', 'guided'], rng)],
    })),
  },
  {
    id: 'demo_meal',
    name: 'Healthy Meal',
    type: 'go',
    category: 'Nutrition',
    archived: false,
    logs: makeLogs('meal', mealDates, 12, rng => ({
      mood: pickRng([...MOODS_POS, 'meh'], rng),
      energy: pickRng(['medium', 'high', 'medium'], rng),
      tags: [pickRng(['lunch', 'dinner', 'home-cooked', 'lunch'], rng)],
    })),
  },
  {
    id: 'demo_read',
    name: 'Reading',
    type: 'go',
    category: 'Learning',
    archived: false,
    logs: makeLogs('read', readDates, 19, rng => ({
      mood: pickRng([...MOODS_POS, 'meh'], rng),
      duration: 15 + Math.floor(rng() * 45),
      tags: [pickRng(['nonfiction', 'fiction', 'evening', 'nonfiction'], rng)],
    })),
  },
  {
    id: 'demo_coff',
    name: 'Morning Coffee',
    type: 'go',
    category: 'Morning',
    archived: false,
    logs: makeLogs('coff', coffDates, 7, rng => ({
      mood: pickRng(['good', 'meh', 'good', 'good'], rng),
      energy: pickRng(['high', 'medium', 'high'], rng),
      tags: [],
    })),
  },
  {
    id: 'demo_screen',
    name: 'Screen Time Before Bed',
    type: 'st',
    category: 'Sleep',
    archived: false,
    logs: makeLogs('screen', screenDates, 22, rng => ({
      resist: rng() < 0.15 ? 'yes' : rng() < 0.25 ? 'partial' : 'no',
      mood: pickRng(MOODS_NEU, rng),
      energy: pickRng(ENERGY_LO, rng),
      trigger: pickRng(['boredom', 'habit', 'boredom', 'tiredness'], rng),
    })),
  },
  {
    id: 'demo_skip',
    name: 'Skipping Breakfast',
    type: 'st',
    category: 'Nutrition',
    archived: false,
    logs: makeLogs('skip', skipDates, 8, rng => ({
      resist: rng() < 0.12 ? 'yes' : rng() < 0.20 ? 'partial' : 'no',
      mood: pickRng(MOODS_NEG, rng),
      energy: 'low energy',
      trigger: pickRng(['rushed', 'not hungry', 'rushed', 'lazy'], rng),
    })),
  },
  {
    id: 'demo_proc',
    name: 'Procrastinating',
    type: 'st',
    category: 'Productivity',
    archived: false,
    logs: makeLogs('proc', procDates, 10, rng => ({
      resist: rng() < 0.20 ? 'yes' : rng() < 0.22 ? 'partial' : 'no',
      mood: pickRng(['stressed', 'meh', 'tired', 'stressed'], rng),
      energy: pickRng(ENERGY_LO, rng),
      trigger: pickRng(['overwhelmed', 'distracted', 'overwhelmed', 'unclear goals'], rng),
    })),
  },
];
