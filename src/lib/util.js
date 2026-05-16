export function uid(prefix = 'x') {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
}

export function pad(n) {
  return String(n).padStart(2, '0');
}

export function todayStr() {
  return dateStr(new Date());
}

export function dateStr(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseDate(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function fmtDate(s) {
  if (!s) return '';
  const d = parseDate(s);
  return `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export function fmtDateLong(s) {
  if (!s) return '';
  const d = parseDate(s);
  return `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export function fmtTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  let h = d.getHours();
  const m = pad(d.getMinutes());
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ap}`;
}

export function shiftDate(s, delta) {
  const d = parseDate(s);
  d.setDate(d.getDate() + delta);
  return dateStr(d);
}

// Tags allow letters, numbers, spaces, hyphens. Comma is the delimiter.
// We normalise: trim, lowercase, collapse inner spaces, max 30 chars.
export function slugTag(s) {
  return s
    .replace(/^#+/, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[^a-z0-9 \-_]/g, '')
    .slice(0, 30)
    .trim();
}

// Parse a comma-separated string into an array of normalised tags.
export function parseTags(str) {
  return str
    .split(',')
    .map(slugTag)
    .filter(Boolean);
}

export function nt(t) {
  if (t === 'go' || t === 'st' || t === 'ne') return t;
  if (t === 'start' || t === 'good') return 'go';
  if (t === 'stop' || t === 'bad') return 'st';
  return 'ne';
}

export function H(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Mood and energy maps
export const MOOD_OPTS = ['good', 'meh', 'low', 'stressed', 'tired', 'fired up'];
export const ENERGY_OPTS = ['high', 'medium', 'low energy'];

export function moodKey(v) {
  if (!v) return '';
  const s = String(v).toLowerCase().trim();
  if (MOOD_OPTS.includes(s)) return s;
  return '';
}

export function energyKey(v) {
  if (!v) return '';
  const s = String(v).toLowerCase().trim();
  if (ENERGY_OPTS.includes(s)) return s;
  if (s === 'low') return 'low energy';
  return '';
}

export function moodDisplay(k) {
  return k ? k : '';
}

export function energyDisplay(k) {
  return k ? k : '';
}

export function normLog(log) {
  return {
    id: log.id || uid('l'),
    date: log.date || todayStr(),
    ts: log.ts || new Date().toISOString(),
    ease: Number(log.ease) || 0,
    mood: moodKey(log.mood),
    energy: energyKey(log.energy),
    duration: Number(log.duration) || 0,
    resist: log.resist || '',
    trigger: log.trigger || '',
    context: log.context || '',
    tags: Array.isArray(log.tags) ? log.tags.map(t => slugTag(String(t))).filter(Boolean) : [],
    notes: log.notes || '',
    withHabits: Array.isArray(log.withHabits) ? log.withHabits : [],
  };
}

export function normHabit(h) {
  return {
    id: h.id || uid('h'),
    name: String(h.name || '').slice(0, 40),
    category: String(h.category || '').slice(0, 30),
    type: nt(h.type),
    created: h.created || todayStr(),
    logs: Array.isArray(h.logs) ? h.logs.map(normLog) : [],
  };
}
