// Sincronización opcional con Google Calendar (cuenta de servicio, sin librerías).
// Si faltan GCAL_SA_JSON o GCAL_CALENDAR_ID, todo es un no-op y el portal sigue igual.
const SCOPE = 'https://www.googleapis.com/auth/calendar.events';
const API = 'https://www.googleapis.com/calendar/v3/calendars';

const b64u = (buf) => {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const b64uStr = (str) => b64u(new TextEncoder().encode(str));

export function gcalConfig(env) {
  if (!env.GCAL_SA_JSON || !env.GCAL_CALENDAR_ID) return null;
  try {
    const sa = JSON.parse(env.GCAL_SA_JSON);
    if (!sa.client_email || !sa.private_key) return null;
    return { sa, calendarId: env.GCAL_CALENDAR_ID.trim() };
  } catch { return null; }
}
export const gcalConfigured = (env) => !!gcalConfig(env);

async function signJwt(sa, nowSec) {
  const pem = sa.private_key.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const head = b64uStr(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64uStr(JSON.stringify({ iss: sa.client_email, scope: SCOPE, aud: 'https://oauth2.googleapis.com/token', iat: nowSec, exp: nowSec + 3600 }));
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${head}.${claim}`));
  return `${head}.${claim}.${b64u(sig)}`;
}

let cached = null; // { token, exp }
async function accessToken(cfg) {
  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.exp - 60 > now) return cached.token;
  const jwt = await signJwt(cfg.sa, now);
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: `grant_type=${encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer')}&assertion=${jwt}`,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) throw new Error(`token: ${j.error_description || j.error || r.status}`);
  cached = { token: j.access_token, exp: now + (j.expires_in || 3600) };
  return cached.token;
}

const addHour = (day, time) => {
  const [h, m] = time.split(':').map(Number);
  return `${String(h + 1).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

export function eventBody({ firstName, day, time, sedeName, status }) {
  return {
    summary: `💗 ${firstName} · Entrenamiento`,
    location: sedeName || undefined,
    description: `Reserva del portal Yohi Coach (${status === 'requested' ? 'por confirmar' : 'confirmada'}).`,
    start: { dateTime: `${day}T${time}:00`, timeZone: 'America/Santiago' },
    end: { dateTime: `${day}T${addHour(day, time)}:00`, timeZone: 'America/Santiago' },
    reminders: { useDefault: true },
  };
}

async function call(cfg, method, path, body) {
  const token = await accessToken(cfg);
  const r = await fetch(`${API}/${encodeURIComponent(cfg.calendarId)}/events${path}`, {
    method,
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (r.status === 204) return {};
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const e = new Error(`calendar ${r.status}: ${(j.error && j.error.message) || ''}`);
    e.status = r.status;
    throw e;
  }
  return j;
}

export async function gcalCreate(env, ev) {
  const cfg = gcalConfig(env);
  if (!cfg) return null;
  const j = await call(cfg, 'POST', '', eventBody(ev));
  return j.id || null;
}

export async function gcalDelete(env, eventId) {
  const cfg = gcalConfig(env);
  if (!cfg || !eventId) return;
  try { await call(cfg, 'DELETE', `/${encodeURIComponent(eventId)}`); }
  catch (e) { if (e.status !== 404 && e.status !== 410) throw e; }
}
