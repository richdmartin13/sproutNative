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
  const r = h.logs.filter((l) => l.resist === 'yes').length;
  const p = h.logs.filter((l) => l.resist === 'partial').length;
  const n = h.logs.filter((l) => l.resist === 'no' || !l.resist).length;
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
