import crypto from 'node:crypto';
import webpush from 'web-push';
import { getStore } from '@netlify/blobs';
import { EXERCISE_BY_DAY } from './plan-data.mjs';

export const SITE_URL = 'https://leafy-baklava-130180.netlify.app';
export const WATER_HOURS = [9, 11, 13, 15, 17, 19, 21];
const WINDOW_MIN = 10; // the scheduled job runs every 5 minutes; 10 gives it slack

let vapidReady = false;
export function ensureVapid() {
  if (vapidReady) return;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) throw new Error('VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY must be set in Netlify');
  webpush.setVapidDetails(SITE_URL, pub, priv);
  vapidReady = true;
}

export function store() { return getStore('plan30-subs'); }
export function keyFor(endpoint) { return crypto.createHash('sha256').update(endpoint).digest('hex'); }

const pad = n => String(n).padStart(2, '0');
const toMin = s => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };

// Local calendar date and minute-of-day for the user, from their UTC offset (minutes ahead of UTC).
function localParts(tzOffset, nowMs) {
  const local = new Date(nowMs + tzOffset * 60000);
  return {
    date: `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}`,
    min: local.getUTCHours() * 60 + local.getUTCMinutes()
  };
}

// Plan day number (1..30) for a local date, counting from the start date.
export function dayNumber(start, date) {
  const [y1, m1, d1] = start.split('-').map(Number);
  const [y2, m2, d2] = date.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000) + 1;
}

function isDoneFor(rec, n, kind) {
  const d = rec.done && rec.done[n];
  if (!d) return false;
  if (kind === 'all') return !!(d.lunch && d.dinner && d.ex);
  return !!d[kind];
}

export function remindersFor(rec, n) {
  const t = rec.times || {};
  const list = [
    { k: 'weigh', at: t.weigh || '07:00', title: 'الوزن الصباحي', body: 'سجّل وزنك بعد الحمام وقبل الأكل.' },
    { k: 'lunch', at: t.lunch || '12:00', title: 'وجبة الظهر', body: 'حان وقت وجبة الظهر حسب الخطة.', done: 'lunch' },
    { k: 'ex', at: t.ex || '18:00', title: 'تمرين اليوم', body: EXERCISE_BY_DAY[n - 1] || 'راجع تمرين اليوم في التطبيق.', done: 'ex' },
    { k: 'dinner', at: t.dinner || '19:00', title: 'وجبة المساء', body: 'حان وقت وجبة المساء حسب الخطة.', done: 'dinner' },
    { k: 'log', at: t.log || '21:30', title: 'سجّل إنجاز اليوم', body: 'راجع الوجبات والماء والتمرين والنوم.', done: 'all' }
  ];
  for (const h of WATER_HOURS) {
    list.push({ k: 'water' + h, at: pad(h) + ':00', title: 'اشرب الماء', body: 'كوب ماء الآن (نحو 500 مل).' });
  }
  return list;
}

// Send every reminder that is due now for every subscriber. Each reminder goes out once per local day.
export async function runDue(nowMs = Date.now()) {
  ensureVapid();
  const st = store();
  const { blobs } = await st.list();
  let sent = 0, removed = 0;
  for (const b of blobs) {
    const rec = await st.get(b.key, { type: 'json' });
    if (!rec || !rec.subscription || !rec.start) continue;
    const { date, min } = localParts(rec.tzOffset || 0, nowMs);
    const n = dayNumber(rec.start, date);
    const sentKeys = rec.sent && rec.sent.date === date ? { ...rec.sent.keys } : {};
    let changed = false, dead = false;
    for (const r of remindersFor(rec, n)) {
      const m = toMin(r.at);
      if (min < m || min - m >= WINDOW_MIN || sentKeys[r.k]) continue;
      sentKeys[r.k] = true;
      changed = true;
      if (n < 1 || n > 30) continue;
      if (r.done && isDoneFor(rec, n, r.done)) continue;
      try {
        await webpush.sendNotification(rec.subscription, JSON.stringify({ title: r.title, body: r.body, tag: r.k }), { TTL: 1800 });
        sent++;
      } catch (e) {
        if (e.statusCode === 404 || e.statusCode === 410) { // subscription expired or removed
          await st.delete(b.key);
          removed++;
          dead = true;
          break;
        }
        console.error('push failed', r.k, e.statusCode || e.message);
      }
    }
    if (changed && !dead) {
      rec.sent = { date, keys: sentKeys };
      await st.setJSON(b.key, rec);
    }
  }
  return { subscribers: blobs.length, sent, removed };
}
