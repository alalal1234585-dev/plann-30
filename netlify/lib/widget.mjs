import { getStore } from '@netlify/blobs';
import { EXERCISE_BY_DAY } from './plan-data.mjs';

const WATER_HOURS = [9, 11, 13, 15, 17, 19, 21];
const CODE_RE = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/;
const pad = n => String(n).padStart(2, '0');
const fmt = m => pad(Math.floor(m / 60)) + ':' + pad(m % 60);

export const isCode = c => typeof c === 'string' && CODE_RE.test(c);
const wstore = () => getStore('plan30-widget');
export async function loadRec(code) { return wstore().get(code, { type: 'json' }); }
export async function saveRec(code, rec) { return wstore().setJSON(code, rec); }

export function localNow(tzOffset, nowMs = Date.now()) {
  const local = new Date(nowMs + tzOffset * 60000);
  return {
    date: `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}`,
    min: local.getUTCHours() * 60 + local.getUTCMinutes()
  };
}

export function dayNumber(start, date) {
  const [y1, m1, d1] = start.split('-').map(Number);
  const [y2, m2, d2] = date.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000) + 1;
}

const shortEx = n => ((EXERCISE_BY_DAY[n - 1] || '').split('|')[0] || '').trim().slice(0, 30);

// What the widget shows now: tasks that are close to their time (or overdue) and not done yet.
export function todayView(rec, tzOffset, nowMs = Date.now()) {
  const { date, min } = localNow(tzOffset, nowMs);
  const n = rec.start ? dayNumber(rec.start, date) : 0;
  const inRange = n >= 1 && n <= 30;
  const d = (rec.days && rec.days[n]) || {};
  const water = Array.from({ length: 6 }, (_, i) => !!(Array.isArray(d.water) && d.water[i]));
  const count = water.filter(Boolean).length;
  const nextWater = WATER_HOURS[Math.min(count, WATER_HOURS.length - 1)] * 60;
  const items = [
    { id: 'lunch', label: 'وجبة الظهر', at: 12 * 60, done: !!d.lunch, window: 120 },
    { id: 'ex', label: 'التمرين: ' + shortEx(n), at: 18 * 60, done: !!d.ex, window: 120 },
    { id: 'dinner', label: 'وجبة المساء', at: 19 * 60, done: !!d.dinner, window: 120 },
    { id: 'water', label: `كوب ماء (${count}/6)`, at: nextWater, done: count >= 6, window: 60 }
  ];
  const doneCount = items.filter(i => i.done).length;
  const tasks = items
    .filter(i => !i.done && min >= i.at - i.window)
    .sort((a, b) => a.at - b.at)
    .slice(0, 4)
    .map(i => ({ id: i.id, label: i.label, at: fmt(i.at) }));
  return {
    day: n,
    summary: inRange ? `اليوم ${n} من 30 · ${doneCount}/4 منجز` : 'الخطة لم تبدأ بعد',
    tasks
  };
}

export function applyMark(rec, n, id) {
  if (!(n >= 1 && n <= 30)) return false;
  rec.days = rec.days || {};
  const d = rec.days[n] || (rec.days[n] = {});
  if (!Array.isArray(d.water)) d.water = [false, false, false, false, false, false];
  if (id === 'water') {
    const i = d.water.findIndex(x => !x);
    if (i >= 0) d.water[i] = true;
    return true;
  }
  if (['lunch', 'ex', 'dinner'].includes(id)) { d[id] = true; return true; }
  return false;
}

export function cleanDays(src) {
  const out = {};
  if (!src || typeof src !== 'object') return out;
  for (let n = 1; n <= 30; n++) {
    const v = src[n];
    if (!v || typeof v !== 'object') continue;
    out[n] = {
      lunch: !!v.lunch, dinner: !!v.dinner, snack: !!v.snack, ex: !!v.ex, sleep: !!v.sleep,
      water: Array.from({ length: 6 }, (_, i) => !!(Array.isArray(v.water) && v.water[i]))
    };
  }
  return out;
}
