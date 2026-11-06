import webpush from 'web-push';
import { ensureVapid, store, keyFor, SITE_URL } from '../lib/reminders.mjs';

const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json' } });
const isDate = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
const isTime = s => typeof s === 'string' && /^\d{2}:\d{2}$/.test(s);

function cleanTimes(t) {
  const out = {};
  for (const k of ['weigh', 'lunch', 'ex', 'dinner', 'log']) if (t && isTime(t[k])) out[k] = t[k];
  return out;
}
function cleanDone(d) {
  const out = {};
  if (!d || typeof d !== 'object') return out;
  for (let n = 1; n <= 30; n++) {
    const v = d[n];
    if (v && typeof v === 'object') out[n] = { lunch: !!v.lunch, dinner: !!v.dinner, ex: !!v.ex };
  }
  return out;
}

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
  let body;
  try { body = await req.json(); } catch (e) { return json({ error: 'bad json' }, 400); }

  const sub = body && body.subscription;
  const endpoint = sub && sub.endpoint;
  if (typeof endpoint !== 'string' || endpoint.length > 2000 || !sub.keys) return json({ error: 'bad subscription' }, 400);

  try {
    ensureVapid();
    const st = store();
    const key = keyFor(endpoint);

    if (body.action === 'unsubscribe') {
      await st.delete(key);
      return json({ ok: true });
    }

    if (body.action === 'test') {
      await webpush.sendNotification(sub, JSON.stringify({ title: 'اختبار الإشعارات', body: 'وصلك إشعار من الخادم.', tag: 'test' }), { TTL: 300 });
      return json({ ok: true });
    }

    // subscribe / sync: store the subscription with the user's settings (upsert)
    if (!isDate(body.start)) return json({ error: 'bad start date' }, 400);
    const tz = Number(body.tzOffset);
    const prev = await st.get(key, { type: 'json' });
    const rec = {
      subscription: { endpoint, keys: sub.keys },
      tzOffset: Number.isFinite(tz) ? Math.max(-840, Math.min(840, Math.round(tz))) : 0,
      start: body.start,
      times: cleanTimes(body.times),
      done: cleanDone(body.done),
      sent: prev ? prev.sent : undefined
    };
    await st.setJSON(key, rec);
    return json({ ok: true });
  } catch (e) {
    console.error(e);
    return json({ error: 'server error' }, 500);
  }
};
