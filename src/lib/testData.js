// App-store-safe demo dataset for screenshots and developer testing.
// Patterns baked in:
//   Morning Run  → Screen Time Before Bed  (−75% on run days)
//   Healthy Meal → Skipping Breakfast      (−80% on meal days)
//   Skipping Breakfast → Procrastinating  (+380% on skip days)
//   Morning Run ↔ Meditation              (positive co-occurrence)
//   Water ↔ Healthy Meal                  (positive co-occurrence)

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

// Single log per day at approx hourBase
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

// Multiple logs per day — count per day determined by countFn(rng) → number
function makeMultiLogs(habitId, dateSet, hourSlots, extraFn) {
  const seed = habitId.split('').reduce((a, c) => a + c.charCodeAt(0), 0) * 1031;
  const rng = lcg(seed);
  const logs = [];
  for (const date of [...dateSet].sort()) {
    const count = hourSlots(rng);
    // spread taps across the day using a predefined set of hour ranges
    const hours = [7, 12, 14, 16, 18, 20, 22];
    for (let i = 0; i < count; i++) {
      const h = hours[i % hours.length] + Math.floor(rng() * 2);
      const m = Math.floor(rng() * 60);
      logs.push({
        id: `demo_${habitId}_${date}_${i}`,
        date,
        ts: `${date}T${String(Math.min(h, 23)).padStart(2, '0')}:${String(m).padStart(2, '0')}:00.000Z`,
        tags: [],
        notes: '',
        ...(extraFn ? extraFn(rng, i) : {}),
      });
    }
  }
  return logs;
}

// ── Driver date sets ──────────────────────────────────────────────────────────
const runDates    = genDateSet(1001, 0.40);   // ~36 days
const mealDates   = genDateSet(1002, 0.80);   // ~72 days (most days have ≥1 meal)
const coffDates   = genDateSet(1003, 0.88);   // ~79 days
const waterDates  = genDateSet(1009, 0.92);   // ~83 days (almost every day)
const stretchDates= genDateSet(1010, 0.55);   // ~50 days
const weightDates = genDateSet(1011, 0.45);   // ~40 days
const moodDates   = genDateSet(1012, 0.70);   // ~63 days

// Meditation: 72% on run days, 14% otherwise
const medDates = genCondDateSet(1004, runDates, 0.14, 0.72);
// Reading: 60% on meal days, 22% otherwise
const readDates = genCondDateSet(1005, mealDates, 0.22, 0.60);
// Screen Time Before Bed: 10% on run days, 55% otherwise
const screenDates = genCondDateSet(1006, runDates, 0.55, 0.10);
// Skipping Breakfast: 5% on meal days, 40% otherwise
const skipDates = genCondDateSet(1007, mealDates, 0.05, 0.40);
// Procrastinating: 70% on skip-breakfast days, 11% otherwise
const procDates = genCondDateSet(1008, skipDates, 0.11, 0.70);

// ── Extras ───────────────────────────────────────────────────────────────────
const MOODS_POS = ['good', 'fired up', 'good'];
const MOODS_NEU = ['meh', 'tired', 'meh'];
const MOODS_NEG = ['tired', 'meh', 'low'];
const ENERGY_HI = ['high', 'high', 'medium'];
const ENERGY_LO = ['low energy', 'low energy', 'medium'];

const MEAL_TAGS  = ['breakfast', 'lunch', 'dinner'];
const WATER_TAGS = ['morning', 'midday', 'afternoon', 'evening', 'night'];
const READ_TAGS  = ['nonfiction', 'fiction', 'evening', 'morning'];

function pickRng(arr, rng) { return arr[Math.floor(rng() * arr.length)]; }

// ── Test habits ───────────────────────────────────────────────────────────────
export const TEST_HABITS = [
  // ── GO ───────────────────────────────────────────────────────────────────
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
    name: 'Eat a Meal',
    type: 'go',
    category: 'Nutrition',
    archived: false,
    // 1–3 taps per day (breakfast + lunch + dinner), spread across the day
    logs: makeMultiLogs('meal', mealDates, rng => 1 + Math.floor(rng() * 3), (rng, i) => ({
      mood: pickRng([...MOODS_POS, 'meh'], rng),
      energy: pickRng(['medium', 'high', 'medium'], rng),
      tags: [MEAL_TAGS[i % 3]],
    })),
  },
  {
    id: 'demo_water',
    name: 'Drink Water',
    type: 'go',
    category: 'Health',
    archived: false,
    // 4–8 taps per day spread across daylight hours
    logs: makeMultiLogs('water', waterDates, rng => 4 + Math.floor(rng() * 5), (rng, i) => ({
      tags: [WATER_TAGS[i % WATER_TAGS.length]],
    })),
  },
  {
    id: 'demo_read',
    name: 'Reading',
    type: 'go',
    category: 'Learning',
    archived: false,
    // 1–2 sessions per day
    logs: makeMultiLogs('read', readDates, rng => 1 + Math.floor(rng() * 2), (rng, i) => ({
      mood: pickRng([...MOODS_POS, 'meh'], rng),
      duration: 15 + Math.floor(rng() * 45),
      tags: [READ_TAGS[i % READ_TAGS.length]],
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

  // ── NEUTRAL ───────────────────────────────────────────────────────────────
  {
    id: 'demo_stretch',
    name: 'Daily Stretch',
    type: 'ne',
    category: 'Wellness',
    archived: false,
    logs: makeLogs('stretch', stretchDates, 8, rng => ({
      duration: 5 + Math.floor(rng() * 20),
      energy: pickRng(['medium', 'high', 'medium', 'low energy'], rng),
      tags: [pickRng(['morning', 'evening', 'desk break', 'morning'], rng)],
    })),
  },
  {
    id: 'demo_weight',
    name: 'Weight Check',
    type: 'ne',
    category: 'Health',
    archived: false,
    logs: makeLogs('weight', weightDates, 7, rng => ({
      notes: '',
      tags: ['morning'],
    })),
  },
  {
    id: 'demo_mood',
    name: 'Mood Check-in',
    type: 'ne',
    category: 'Mindfulness',
    archived: false,
    // 1–2 check-ins per day
    logs: makeMultiLogs('mood', moodDates, rng => 1 + Math.floor(rng() * 2), rng => ({
      mood: pickRng([...MOODS_POS, ...MOODS_NEU, 'energized'], rng),
      energy: pickRng([...ENERGY_HI, ...ENERGY_LO, 'medium'], rng),
      tags: [],
    })),
  },

  // ── STOP ──────────────────────────────────────────────────────────────────
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
