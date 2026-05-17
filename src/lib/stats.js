import { todayStr, dateStr, parseDate, shiftDate } from './util.js';

export function todayCountFor(h) {
  const t = todayStr();
  return h.logs.filter((l) => l.date === t).length;
}

export function totalCountFor(h) {
  return h.logs.length;
}

export function streakFor(h) {
  // Consecutive days with at least one log, ending today OR yesterday.
  if (!h.logs.length) return 0;
  const days = new Set(h.logs.map((l) => l.date));
  let count = 0;
  let cursor = todayStr();
  if (!days.has(cursor)) {
    cursor = shiftDate(cursor, -1);
    if (!days.has(cursor)) return 0;
  }
  for (let i = 0; i < 400; i++) {
    if (days.has(cursor)) {
      count++;
      cursor = shiftDate(cursor, -1);
    } else {
      break;
    }
  }
  return count;
}

export function daysSinceLastFor(h) {
  if (!h.logs.length) return null;
  const sorted = [...h.logs].sort((a, b) => (a.date < b.date ? 1 : -1));
  const last = parseDate(sorted[0].date);
  const today = parseDate(todayStr());
  return Math.floor((today - last) / 86400000);
}

export function dailyCountsFor(h, days = 28) {
  const out = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const ds = dateStr(d);
    out.push({ date: ds, count: h.logs.filter((l) => l.date === ds).length });
  }
  return out;
}

export function lastLog(h) {
  if (!h.logs.length) return null;
  return [...h.logs].sort((a, b) => (a.ts < b.ts ? 1 : -1))[0];
}

export function lastLogToday(h) {
  const t = todayStr();
  const today = h.logs.filter((l) => l.date === t);
  if (!today.length) return null;
  return today.sort((a, b) => (a.ts < b.ts ? 1 : -1))[0];
}

// Co-occurrence between habits (across all data)
export function coOccurrenceFor(habit, allHabits) {
  const habitDates = new Set(habit.logs.map((l) => l.date));
  const out = [];
  for (const other of allHabits) {
    if (other.id === habit.id) continue;
    const otherDates = new Set(other.logs.map((l) => l.date));
    let shared = 0;
    for (const d of habitDates) if (otherDates.has(d)) shared++;
    if (shared > 0) out.push({ habit: other, shared });
  }
  return out.sort((a, b) => b.shared - a.shared);
}

// All-pairs co-occurrence for analytics
// ── Time-block correlation engine ─────────────────────────────────────────────
// Splits each day into 4-hour blocks (6 per day). Co-occurrence is measured at
// block level, not day level — habits done at different times of day won't appear
// correlated just because they share a calendar day. High-frequency habits
// naturally fill many blocks, which raises the expected overlap baseline and keeps
// lift honest. Recency-decayed weights (60-day half-life) suppress stale patterns.
//
// Sorting uses |log(lift)| so strong negatives rank equally with strong positives.

// Day-level blocks: "did these habits co-occur on the same day?" — most
// meaningful for detecting vice correlations where timing differs (morning
// exercise vs evening drinking). The hourly chart handles time-of-day analysis.
function _toBlock(ts) {
  return new Date(ts).toISOString().slice(0, 10);
}

function _corrSetup(habits, decayDays = 60) {
  const today = new Date();
  const dateW = new Map();
  for (const h of habits) for (const l of h.logs) {
    if (l.date && !dateW.has(l.date)) {
      const ago = Math.max(0, (today - new Date(l.date + 'T12:00:00')) / 86400000);
      dateW.set(l.date, Math.exp(-ago / decayDays));
    }
  }
  // Universe = union of all block cells across all habits
  const universe = new Map();
  for (const h of habits) for (const l of h.logs) {
    const key = l.ts ? _toBlock(l.ts) : l.date;
    const w   = dateW.get(l.date) || 0;
    if (!universe.has(key) || universe.get(key) < w) universe.set(key, w);
  }
  const totalW = Array.from(universe.values()).reduce((s, w) => s + w, 0);
  return { dateW, totalW };
}

// Per-habit block presence map: blockKey → max recency weight for that block
function _hmeta(h, dateW) {
  const blocks = new Map();
  for (const l of h.logs) {
    const key = l.ts ? _toBlock(l.ts) : l.date;
    const w   = dateW.get(l.date) || 0;
    if (!blocks.has(key) || blocks.get(key) < w) blocks.set(key, w);
  }
  const wt = Array.from(blocks.values()).reduce((s, w) => s + w, 0);
  return { blocks, wt };
}

// Shared block count and weighted shared between two habit metas
function _overlap(mA, mB) {
  let shared = 0, wShared = 0;
  for (const [key, wA] of mA.blocks) {
    const wB = mB.blocks.get(key);
    if (wB !== undefined) { shared++; wShared += Math.min(wA, wB); }
  }
  return { shared, wShared };
}

// Block-level lift: (wShared × totalW) / (wA × wB)
// Log-lift is the sort key — symmetric for positives and negatives
function _blockLift(wShared, totalW, wA, wB) {
  const expected = (wA * wB) / totalW;
  return expected > 0 ? wShared / expected : 0;
}

// Correlations for a single focal habit vs all others.
// Sorted by |log(lift)| so strongest signal — positive OR negative — comes first.
// polarity: 'positive' | 'negative'
// rate = shared blocks / focal habit's block count (conditional co-occurrence rate)
export function correlationsFor(habit, allHabits, { minShared = 2, minBlocks = 3 } = {}) {
  const { dateW, totalW } = _corrSetup(allHabits);
  if (!totalW) return [];
  const mA = _hmeta(habit, dateW);
  if (mA.blocks.size < 2) return [];
  const all = [];
  for (const other of allHabits) {
    if (other.id === habit.id) continue;
    const mB = _hmeta(other, dateW);
    if (mB.blocks.size < 2) continue;
    const { shared, wShared } = _overlap(mA, mB);
    const expectedW = (mA.wt * mB.wt) / totalW;
    const lift      = _blockLift(wShared, totalW, mA.wt, mB.wt);
    const logLift   = Math.log(Math.max(0.001, lift));
    const rate      = shared / mA.blocks.size;
    const rateRev   = shared / mB.blocks.size;
    if (shared >= minShared && lift >= 1.2) {
      const direction = rate > rateRev * 1.25 ? 'leads' : rateRev > rate * 1.25 ? 'follows' : 'mutual';
      all.push({ habit: other, shared, lift, logLift, rate, rateReverse: rateRev, direction, polarity: 'positive' });
    } else if (mA.blocks.size >= minBlocks && mB.blocks.size >= minBlocks && expectedW >= 1.5 && lift < 0.75) {
      all.push({ habit: other, shared, lift, logLift, rate, rateReverse: rateRev, direction: 'mutual', polarity: 'negative' });
    }
  }
  return all.sort((a, b) => Math.abs(b.logLift) - Math.abs(a.logLift));
}

// All-pairs correlations across a habit set.
// Sorted by |log(lift)| — interleaves positives and negatives by signal strength.
// polarity: 'positive' | 'negative'
// direction: 'AB' | 'BA' | 'mutual'
export function significantCorrelations(habits, { minShared = 2, minBlocks = 3 } = {}) {
  const { dateW, totalW } = _corrSetup(habits);
  if (!totalW) return [];
  const metas = habits.map(h => ({ habit: h, ..._hmeta(h, dateW) }));
  const all = [];
  for (let i = 0; i < metas.length; i++) {
    const A = metas[i]; if (A.blocks.size < 2) continue;
    for (let j = i + 1; j < metas.length; j++) {
      const B = metas[j]; if (B.blocks.size < 2) continue;
      const { shared, wShared } = _overlap(A, B);
      const expectedW = (A.wt * B.wt) / totalW;
      const lift      = _blockLift(wShared, totalW, A.wt, B.wt);
      const logLift   = Math.log(Math.max(0.001, lift));
      const rateAB    = shared / A.blocks.size;
      const rateBA    = shared / B.blocks.size;
      if (shared >= minShared && lift >= 1.2) {
        const direction = rateAB > rateBA * 1.25 ? 'AB' : rateBA > rateAB * 1.25 ? 'BA' : 'mutual';
        all.push({ a: A.habit, b: B.habit, shared, lift, logLift, rateAB, rateBA, direction, polarity: 'positive' });
      } else if (A.blocks.size >= minBlocks && B.blocks.size >= minBlocks && expectedW >= 1.5 && lift < 0.75) {
        all.push({ a: A.habit, b: B.habit, shared, lift, logLift, rateAB, rateBA, direction: 'mutual', polarity: 'negative' });
      }
    }
  }
  return all.sort((x, y) => Math.abs(y.logLift) - Math.abs(x.logLift));
}

// Count-based influence detection for stop habits.
// Compares a stop habit's average daily count on "A-present" days vs "A-absent" days.
// Works for high-frequency vices where presence-based lift approaches fail, because
// it measures RATE (how many times per day) not just PRESENCE (did it occur at all).
// Returned direction: 'reduces' means A-days have significantly fewer B occurrences.
//                     'increases' means A-days have significantly more B occurrences.
export function stopInfluences(habits, { minDays = 4, minRatio = 1.35 } = {}) {
  const stopHabits = habits.filter(h => h.type === 'st');
  if (!stopHabits.length) return [];

  const allDates = [...new Set(habits.flatMap(h => h.logs.map(l => l.date)))];
  if (allDates.length < minDays * 2) return [];

  const results = [];

  for (const a of habits) {
    const aDates = new Set(a.logs.map(l => l.date));
    if (aDates.size < minDays) continue;

    const aDaysList = [...aDates];
    const nonADays  = allDates.filter(d => !aDates.has(d));
    if (nonADays.length < minDays) continue;

    for (const b of stopHabits) {
      if (b.id === a.id) continue;

      const rateOnA  = aDaysList.reduce((s, d) => s + b.logs.filter(l => l.date === d).length, 0) / aDaysList.length;
      const rateOffA = nonADays.reduce((s, d)  => s + b.logs.filter(l => l.date === d).length, 0) / nonADays.length;

      // Need b to have non-trivial frequency overall
      const baseline = (rateOnA * aDaysList.length + rateOffA * nonADays.length) / allDates.length;
      if (baseline < 0.05) continue;
      if (rateOffA < 0.02 && rateOnA < 0.02) continue;

      const ratio = rateOnA / Math.max(0.01, rateOffA);

      if (ratio >= minRatio) {
        results.push({ a, b, direction: 'increases', ratio, rateOnA, rateOffA });
      } else if (ratio <= 1 / minRatio) {
        results.push({ a, b, direction: 'reduces', ratio, rateOnA, rateOffA });
      }
    }
  }

  return results.sort((x, y) => Math.abs(Math.log(y.ratio)) - Math.abs(Math.log(x.ratio)));
}

export function allCoOccurrences(habits) {
  const out = [];
  for (let i = 0; i < habits.length; i++) {
    const a = habits[i];
    const aDates = new Set(a.logs.map((l) => l.date));
    for (let j = i + 1; j < habits.length; j++) {
      const b = habits[j];
      const bDates = new Set(b.logs.map((l) => l.date));
      let shared = 0;
      for (const d of aDates) if (bDates.has(d)) shared++;
      if (shared > 0) out.push({ a, b, shared });
    }
  }
  return out.sort((x, y) => y.shared - x.shared);
}

// Tag frequency
export function tagFrequency(habits, dateFilter = null) {
  const counts = new Map();
  for (const h of habits) {
    for (const l of h.logs) {
      if (dateFilter && l.date !== dateFilter) continue;
      for (const t of l.tags) {
        counts.set(t, (counts.get(t) || 0) + 1);
      }
    }
  }
  return Array.from(counts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
}

// Tag frequency for one habit
export function tagFrequencyForHabit(habit) {
  const counts = new Map();
  for (const l of habit.logs) {
    for (const t of l.tags) {
      counts.set(t, (counts.get(t) || 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
}

export function hourlyBucketsFor(habits, date) {
  // Returns 24 arrays of stacked counts {go, st, ne}
  const out = Array.from({ length: 24 }, () => ({ go: 0, st: 0, ne: 0 }));
  for (const h of habits) {
    for (const l of h.logs) {
      if (l.date !== date) continue;
      const hr = new Date(l.ts).getHours();
      out[hr][h.type]++;
    }
  }
  return out;
}

export function trendsFor(habits, days = 90) {
  const today = new Date();
  const series = habits.map((h) => {
    const points = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const ds = dateStr(d);
      points.push({ date: ds, count: h.logs.filter((l) => l.date === ds).length });
    }
    return { habit: h, points };
  });
  return series;
}

export function moodCounts(habits, dateFilter = null) {
  const c = new Map();
  for (const h of habits) for (const l of h.logs) {
    if (dateFilter && l.date !== dateFilter) continue;
    if (l.mood) c.set(l.mood, (c.get(l.mood) || 0) + 1);
  }
  return c;
}

export function energyCounts(habits, dateFilter = null) {
  const c = new Map();
  for (const h of habits) for (const l of h.logs) {
    if (dateFilter && l.date !== dateFilter) continue;
    if (l.energy) c.set(l.energy, (c.get(l.energy) || 0) + 1);
  }
  return c;
}

export function easeAvgs(habits, dateFilter = null) {
  const o = [];
  for (const h of habits.filter((x) => x.type === 'go')) {
    const logs = h.logs.filter((l) => l.ease > 0 && (!dateFilter || l.date === dateFilter));
    if (!logs.length) continue;
    const avg = logs.reduce((s, l) => s + l.ease, 0) / logs.length;
    o.push({ habit: h, avg });
  }
  return o;
}

export function resistRate(h) {
  if (h.type !== 'st') return null;
  const total = h.logs.length;
  if (!total) return null;
  const r = h.logs.filter((l) => l.resist === 'yes' || l.resist === 'watch').length;
  const p = h.logs.filter((l) => l.resist === 'partial').length;
  const n = h.logs.filter((l) => !l.resist || l.resist === 'no').length;
  return { total, yes: r, partial: p, no: n, rate: (r + p * 0.5) / total };
}

export function topTriggers(h, n = 3) {
  if (h.type !== 'st') return [];
  const m = new Map();
  for (const l of h.logs) {
    const t = (l.trigger || '').trim();
    if (!t) continue;
    m.set(t, (m.get(t) || 0) + 1);
  }
  return Array.from(m.entries())
    .map(([trig, count]) => ({ trig, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}

export function timeOfDayBuckets(habits, dateFilter = null) {
  const b = { Night: 0, Morning: 0, Afternoon: 0, Evening: 0 };
  for (const h of habits) for (const l of h.logs) {
    if (dateFilter && l.date !== dateFilter) continue;
    const hr = new Date(l.ts).getHours();
    if (hr < 6) b.Night++;
    else if (hr < 12) b.Morning++;
    else if (hr < 18) b.Afternoon++;
    else b.Evening++;
  }
  return b;
}

export function dayOfWeekBuckets(habits) {
  const b = [0, 0, 0, 0, 0, 0, 0]; // S M T W T F S
  for (const h of habits) for (const l of h.logs) {
    const d = parseDate(l.date);
    b[d.getDay()]++;
  }
  return b;
}
