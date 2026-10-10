// Pruebas de la API del portal. Ejecutar desde la raíz del repo:
//   node --experimental-sqlite --no-warnings tests/api.test.mjs
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import worker from '../src/worker.js';

const db = new DatabaseSync(':memory:');
for (const f of ['0001_init.sql', '0002_health_consent.sql', '0003_late_cancel.sql', '0004_pdf.sql']) db.exec(fs.readFileSync('./migrations/' + f, 'utf8'));
db.exec('PRAGMA foreign_keys = ON');

function stmt(sql) {
  let args = [];
  const o = {
    bind(...a) { args = a; return o; },
    async first() { return db.prepare(sql).get(...args) || null; },
    async all() { return { results: db.prepare(sql).all(...args) }; },
    async run() { const r = db.prepare(sql).run(...args); return { success: true, meta: { last_row_id: Number(r.lastInsertRowid) } }; },
    _run() { db.prepare(sql).run(...args); },
  };
  return o;
}
const DB = {
  prepare: stmt,
  async batch(list) { db.exec('BEGIN'); try { list.forEach((s) => s._run()); db.exec('COMMIT'); } catch (e) { db.exec('ROLLBACK'); throw e; } return []; },
};
const env = { DB, SETUP_TOKEN: 'codigo-secreto-123', ASSETS: { fetch: () => new Response('asset') } };
const ORIGIN = 'https://yohicoach.cl';
let cookie = '';
async function call(method, path, body, opts = {}) {
  const headers = { 'cf-connecting-ip': opts.ip || '1.1.1.1' };
  if (!(body instanceof FormData)) headers['content-type'] = 'application/json';
  if (method === 'POST') headers.origin = opts.origin ?? ORIGIN;
  if (cookie && !opts.nocookie) headers.cookie = cookie;
  const res = await worker.fetch(new Request(ORIGIN + path, { method, headers, body: body ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined }), env);
  const sc = res.headers.get('set-cookie');
  if (sc && !opts.nocookie) cookie = sc.split(';')[0].includes('=;') || /Max-Age=0/.test(sc) ? '' : sc.split(';')[0];
  const data = await res.json().catch(() => null);
  return { status: res.status, data, sc };
}
let pass = 0, bad = 0;
const t = (name, cond, extra = '') => { cond ? pass++ : bad++; console.log((cond ? 'OK   ' : 'FALLA'), name, cond ? '' : JSON.stringify(extra)); };

// asset passthrough
{ const r = await worker.fetch(new Request(ORIGIN + '/'), env); t('no-API pasa a assets', (await r.text()) === 'asset'); }
// CSRF
{ const r = await call('POST', '/api/signup', {}, { origin: 'https://malo.com' }); t('CSRF: origen ajeno rechazado', r.status === 403, r); }
// setup
let r = await call('POST', '/api/setup', { token: 'mal', name: 'Yohi', email: 'yohi@x.cl', password: 'ClaveSegura123' }); t('setup con código malo = 403', r.status === 403, r);
r = await call('POST', '/api/setup', { token: 'codigo-secreto-123', name: 'Yohi', email: 'yohi@x.cl', password: 'corta1' }); t('setup clave corta rechazada', r.status === 400, r);
r = await call('POST', '/api/setup', { token: 'codigo-secreto-123', name: 'Yohi', email: 'yohi@x.cl', password: 'ClaveSegura123' }); t('setup crea admin', r.status === 200, r);
r = await call('POST', '/api/setup', { token: 'codigo-secreto-123', name: 'Otra', email: 'o@x.cl', password: 'ClaveSegura123' }); t('setup 2da vez = 409', r.status === 409, r);
// signup
r = await call('POST', '/api/signup', { name: 'Camila', email: 'Camila@X.cl', password: 'abc', consent: true }); t('signup clave débil', r.status === 400, r);
r = await call('POST', '/api/signup', { name: 'Camila', email: 'camila@x.cl', password: 'Camila12345', consent: false }); t('signup sin consentimiento', r.status === 400, r);
r = await call('POST', '/api/signup', { name: 'Camila', email: 'Camila@X.cl', password: 'Camila12345', consent: true }); t('signup ok', r.status === 200, r);
const row = db.prepare("SELECT * FROM users WHERE email='camila@x.cl'").get();
t('email normalizado y estado pending', row && row.status === 'pending' && row.role === 'student', row);
t('clave NO guardada en claro', row && !JSON.stringify(row).includes('Camila12345'));
t('consentimiento registrado', row.consent_version === '2026-10-v1' && !!row.consent_at, row);
r = await call('POST', '/api/signup', { name: 'Otra', email: 'camila@x.cl', password: 'Otra123456', consent: true }); t('signup duplicado: misma respuesta, sin crear otra', r.status === 200 && db.prepare("SELECT count(*) c FROM users WHERE email='camila@x.cl'").get().c === 1, r);
// login pendiente
cookie = '';
r = await call('POST', '/api/login', { email: 'camila@x.cl', password: 'Camila12345' }); t('login pendiente = 403 sin cookie', r.status === 403 && !r.sc, r);
r = await call('POST', '/api/login', { email: 'camila@x.cl', password: 'mala' }); t('clave mala = 401', r.status === 401, r);
r = await call('POST', '/api/login', { email: 'noexiste@x.cl', password: 'loquesea12' }); t('usuario inexistente = mismo 401', r.status === 401 && r.data.error === 'Correo o clave incorrectos.', r);
r = await call('GET', '/api/me'); t('/me sin sesión = 401', r.status === 401, r);
r = await call('GET', '/api/admin/pending'); t('admin sin sesión = 403', r.status === 403, r);
// admin
r = await call('POST', '/api/login', { email: ' YOHI@x.cl ', password: 'ClaveSegura123 ' }); t('login tolera espacios al borde (teclado del celular)', r.status === 200, r);
cookie = '';
r = await call('POST', '/api/login', { email: 'yohi@x.cl', password: 'ClaveSegura123' }); t('login admin ok', r.status === 200 && r.data.role === 'admin', r);
t('cookie HttpOnly+Secure+SameSite', /HttpOnly/.test(r.sc) && /Secure/.test(r.sc) && /SameSite=Lax/.test(r.sc), r.sc);
const sess = db.prepare('SELECT token_hash FROM auth_sessions').get();
t('token de sesión guardado solo como hash', sess && sess.token_hash.length === 64 && !cookie.includes(sess.token_hash));
r = await call('GET', '/api/admin/pending'); t('lista pendientes', r.status === 200 && r.data.pending.length === 1, r);
const cid = r.data.pending[0].id;
r = await call('POST', '/api/admin/approve', { userId: cid, modality: 'presencial', sede: 'quilpue', sessions: 12, start: '2026-10-12' }); t('aprobar presencial', r.status === 200 && r.data.end === '2026-11-08', r);
const plan = db.prepare('SELECT * FROM plans WHERE user_id=?').get(cid);
t('plan creado 12 ses. Quilpué hasta 8 nov', plan && plan.sessions_total === 12 && plan.sede === 'quilpue' && plan.end_date === '2026-11-08', plan);
r = await call('POST', '/api/admin/approve', { userId: cid, modality: 'presencial', sede: 'quilpue', sessions: 12, start: '2026-10-12' }); t('no se aprueba dos veces', r.status === 404, r);
r = await call('POST', '/api/signup', { name: 'Valentina', email: 'v@x.cl', password: 'Valentina123', consent: true });
const vid = db.prepare("SELECT id FROM users WHERE email='v@x.cl'").get().id;
r = await call('POST', '/api/admin/approve', { userId: vid, modality: 'online', months: 3, start: '2026-10-12' }); t('aprobar online 3 meses → 11 ene', r.status === 200 && r.data.end === '2027-01-11', r);
r = await call('POST', '/api/admin/approve', { userId: vid, modality: 'presencial', sede: 'mars', sessions: 5, start: '2026-10-12' }); t('validaciones (ya aprobada/sede)', r.status >= 400, r);
r = await call('POST', '/api/signup', { name: 'Rechazada', email: 'r@x.cl', password: 'Rechazada123', consent: true }, { ip: '2.2.2.2' });
const rid = db.prepare("SELECT id FROM users WHERE email='r@x.cl'").get().id;
r = await call('POST', '/api/admin/reject', { userId: rid }); t('rechazar', r.status === 200 && db.prepare('SELECT status FROM users WHERE id=?').get(rid).status === 'rejected', r);
// alumna activa
await call('POST', '/api/logout');
r = await call('GET', '/api/me'); t('logout cierra sesión', r.status === 401, r);
r = await call('POST', '/api/login', { email: 'camila@x.cl', password: 'Camila12345' }); t('login alumna aprobada', r.status === 200 && r.data.role === 'student', r);
r = await call('GET', '/api/me'); t('/me con plan', r.status === 200 && r.data.plan && r.data.plan.sessions_total === 12, r);
r = await call('GET', '/api/admin/pending'); t('alumna NO accede a admin', r.status === 403, r);
r = await call('POST', '/api/admin/approve', { userId: vid, modality: 'online', months: 1, start: '2026-10-12' }); t('alumna NO puede aprobar', r.status === 403, r);

// ---------- agenda y reservas (hora simulada: miércoles 14 oct 2026, 12:00 Chile) ----------
env.NOW_MS = String(new Date('2026-10-14T12:00:00-03:00').getTime());
const loginAs = async (email, password) => { cookie = ''; return call('POST', '/api/login', { email, password }, { ip: '3.3.3.' + Math.floor(Math.random() * 200) }); };
r = await call('GET', '/api/agenda'); t('agenda alumna sin días abiertos', r.status === 200 && r.data.days.length === 0 && r.data.plan.left === 12, r);
r = await call('POST', '/api/admin/open-day', { day: '2026-10-15', mode: 'pm' }); t('alumna NO abre días', r.status === 403, r);
await loginAs('yohi@x.cl', 'ClaveSegura123');
r = await call('POST', '/api/admin/open-day', { day: '2026-10-15', mode: 'wk' }); t('día de semana no admite horario de finde', r.status === 400, r);
r = await call('POST', '/api/admin/open-day', { day: '2026-10-17', mode: 'am' }); t('sábado no admite mañana/tarde', r.status === 400, r);
r = await call('POST', '/api/admin/open-day', { day: '2026-10-13', mode: 'pm' }); t('no se abre un día pasado', r.status === 400, r);
r = await call('POST', '/api/admin/open-day', { day: '2026-10-15', mode: 'pm' }); t('abrir jueves tarde', r.status === 200, r);
r = await call('POST', '/api/admin/open-day', { day: '2026-10-16', mode: 'am' }); t('abrir viernes mañana', r.status === 200, r);
r = await call('POST', '/api/admin/open-day', { day: '2026-10-17', mode: 'wk' }); t('abrir sábado', r.status === 200, r);
// segunda alumna con 1 sesión
await call('POST', '/api/signup', { name: 'Fran', email: 'fran@x.cl', password: 'Francisca123', consent: true }, { ip: '4.4.4.4' });
const fid = db.prepare("SELECT id FROM users WHERE email='fran@x.cl'").get().id;
await call('POST', '/api/admin/approve', { userId: fid, modality: 'presencial', sede: 'quilpue', sessions: 1, start: '2026-10-12' });
await loginAs('camila@x.cl', 'Camila12345');
r = await call('GET', '/api/agenda'); const dPm = r.data.days.find((d) => d.day === '2026-10-15');
t('agenda muestra tardes 16–19 libres', r.data.days.length === 3 && dPm && dPm.slots.map((x) => x.time).join() === '16:00,17:00,18:00,19:00' && dPm.slots.every((x) => x.free), r.data);
t('sábado 9–12', r.data.days.find((d) => d.day === '2026-10-17').slots.map((x) => x.time).join() === '09:00,10:00,11:00,12:00');
r = await call('POST', '/api/bookings', { day: '2026-10-15', time: '17:30' }); t('hora fuera de franja rechazada', r.status === 400, r);
r = await call('POST', '/api/bookings', { day: '2026-10-18', time: '09:00' }); t('día no abierto rechazado', r.status === 400, r);
r = await call('POST', '/api/bookings', { day: '2026-10-15', time: '17:00' }); t('pedir hora descuenta sesión (11)', r.status === 200 && r.data.left === 11, r);
r = await call('GET', '/api/agenda'); t('mis horas: por confirmar', r.data.mine.length === 1 && r.data.mine[0].status === 'requested' && r.data.plan.left === 11, r.data);
t('hora tomada aparece ocupada', r.data.days.find((d) => d.day === '2026-10-15').slots.find((x) => x.time === '17:00').free === false);
const bid = r.data.mine[0].id;
await loginAs('fran@x.cl', 'Francisca123');
r = await call('POST', '/api/bookings', { day: '2026-10-15', time: '17:00' }); t('misma hora, otra alumna = 409', r.status === 409, r);
r = await call('POST', '/api/bookings/cancel', { id: bid }); t('no se cancela la hora de otra', r.status === 404, r);
r = await call('POST', '/api/bookings', { day: '2026-10-16', time: '08:30' }); t('Fran pide su única sesión', r.status === 200 && r.data.left === 0, r);
r = await call('POST', '/api/bookings', { day: '2026-10-16', time: '09:30' }); t('sin sesiones no puede pedir más', r.status === 400, r);
await loginAs('yohi@x.cl', 'ClaveSegura123');
r = await call('GET', '/api/admin/agenda'); t('panel ve solicitudes con nombre', r.data.bookings.length === 2 && r.data.bookings.some((b) => b.name === 'Camila' && b.status === 'requested'), r.data);
const franB = r.data.bookings.find((b) => b.name === 'Fran').id;
r = await call('POST', '/api/admin/open-day', { day: '2026-10-15', mode: 'am' }); t('no se cambia un día con horas pedidas', r.status === 409, r);
r = await call('POST', '/api/admin/booking', { id: bid, action: 'confirm' }); t('Yohi confirma', r.status === 200 && db.prepare('SELECT status FROM bookings WHERE id=?').get(bid).status === 'confirmed', r);
r = await call('POST', '/api/admin/booking', { id: franB, action: 'reject' }); t('Yohi rechaza', r.status === 200, r);
await loginAs('fran@x.cl', 'Francisca123');
r = await call('GET', '/api/agenda'); t('rechazo devuelve la sesión', r.data.plan.left === 1 && r.data.mine.length === 0, r.data);
await loginAs('camila@x.cl', 'Camila12345');
r = await call('POST', '/api/bookings', { day: '2026-10-17', time: '09:00' }); t('sábado 9:00 pedido', r.status === 200 && r.data.left === 10, r);
const satId = db.prepare("SELECT id FROM bookings WHERE day='2026-10-17'").get().id;
r = await call('POST', '/api/bookings/cancel', { id: bid }); t('cancelar >24 h antes devuelve la sesión', r.status === 200 && r.data.returned === true, r);
r = await call('GET', '/api/agenda'); t('quedan 11 tras devolver', r.data.plan.left === 11, r.data);
env.NOW_MS = String(new Date('2026-10-16T10:00:00-03:00').getTime()); // 23 h antes del sábado 9:00
r = await call('POST', '/api/bookings/cancel', { id: satId }); t('cancelar <24 h pierde la sesión', r.status === 200 && r.data.returned === false, r);
r = await call('GET', '/api/agenda'); t('sesión perdida: queda 11 (1 usada)', r.data.plan.left === 11 && r.data.plan.used === 1, r.data);
r = await call('POST', '/api/bookings', { day: '2026-10-16', time: '09:30' }); t('hora que ya pasó rechazada', r.status === 400, r);
env.NOW_MS = String(new Date('2026-11-20T10:00:00-03:00').getTime());
r = await call('GET', '/api/agenda'); t('plan vencido: sin agenda', r.data.plan === null, r.data);
r = await call('POST', '/api/bookings', { day: '2026-11-21', time: '09:00' }); t('plan vencido no reserva', r.status === 400, r);
delete env.NOW_MS;

// ---------- mediciones (datos de salud) ----------
env.NOW_MS = String(new Date('2026-10-20T12:00:00-03:00').getTime());
await loginAs('yohi@x.cl', 'ClaveSegura123');
r = await call('POST', '/api/admin/measurement', { userId: cid, date: '2026-10-19', weight_kg: 60 }); t('sin autorización de salud NO se cargan mediciones', r.status === 403, r);
r = await call('GET', '/api/admin/measurements?userId=' + cid); t('admin: sin autorización no hay datos', r.data.enabled === false && r.data.items.length === 0, r);
await loginAs('camila@x.cl', 'Camila12345');
r = await call('GET', '/api/measurements'); t('alumna sin autorización: vacío', r.data.enabled === false, r);
r = await call('POST', '/api/health-consent', { enabled: true }); t('alumna autoriza datos de salud', r.status === 200 && !!db.prepare('SELECT health_consent_at h FROM users WHERE id=?').get(cid).h, r);
await loginAs('yohi@x.cl', 'ClaveSegura123');
r = await call('POST', '/api/admin/measurement', { userId: cid, date: '2026-10-21', weight_kg: 60 }); t('fecha futura rechazada', r.status === 400, r);
r = await call('POST', '/api/admin/measurement', { userId: cid, date: '2026-10-19', weight_kg: 5, fat_pct: 25 }); t('peso fuera de rango rechazado', r.status === 400, r);
r = await call('POST', '/api/admin/measurement', { userId: cid, date: '2026-10-19' }); t('sin valores rechazado', r.status === 400, r);
r = await call('POST', '/api/admin/measurement', { userId: cid, date: '2026-10-05', weight_kg: 62.34, fat_pct: 28.1, muscle_kg: 24.5 }); t('carga medición 1', r.status === 200, r);
r = await call('POST', '/api/admin/measurement', { userId: cid, date: '2026-10-19', weight_kg: 61.5, fat_pct: 27.2, muscle_kg: 24.9 }); t('carga medición 2', r.status === 200, r);
r = await call('GET', '/api/admin/measurements?userId=' + cid); t('admin ve 2 mediciones (más nueva primero)', r.data.items.length === 2 && r.data.items[0].measured_on === '2026-10-19' && r.data.items[1].weight_kg === 62.3, r.data);
const mid = r.data.items[0].id;
await loginAs('camila@x.cl', 'Camila12345');
r = await call('GET', '/api/measurements'); t('alumna ve solo las suyas (ordenadas)', r.data.items.length === 2 && r.data.items[0].measured_on === '2026-10-05', r.data);
r = await call('POST', '/api/admin/measurement', { userId: cid, date: '2026-10-19', weight_kg: 50 }); t('alumna NO carga mediciones', r.status === 403, r);
r = await call('POST', '/api/admin/measurement/delete', { id: mid }); t('alumna NO borra mediciones', r.status === 403, r);
await loginAs('fran@x.cl', 'Francisca123');
r = await call('GET', '/api/measurements'); t('otra alumna no ve las de Camila', r.data.items.length === 0, r);
await loginAs('yohi@x.cl', 'ClaveSegura123');
r = await call('POST', '/api/admin/measurement/delete', { id: mid }); t('Yohi borra una medición', r.status === 200 && db.prepare('SELECT count(*) c FROM measurements WHERE user_id=?').get(cid).c === 1, r);
await loginAs('camila@x.cl', 'Camila12345');
r = await call('POST', '/api/health-consent', { enabled: false }); t('retirar autorización borra mediciones', r.status === 200 && db.prepare('SELECT count(*) c FROM measurements WHERE user_id=?').get(cid).c === 0 && db.prepare('SELECT health_consent_at h FROM users WHERE id=?').get(cid).h === null, r);
delete env.NOW_MS;

// ---------- PDF de Body Pro Go ----------
env.NOW_MS = String(new Date('2026-10-20T12:00:00-03:00').getTime());
await loginAs('camila@x.cl', 'Camila12345');
await call('POST', '/api/health-consent', { enabled: true });
await loginAs('yohi@x.cl', 'ClaveSegura123');
const mkPdf = (n, head = '%PDF-1.4\n') => { const u = new Uint8Array(n); u.set(new TextEncoder().encode(head)); for (let i = head.length; i < n; i++) u[i] = (i * 7) % 256; return u; };
const formFor = (bytes, name = 'informe.pdf', extra = {}) => { const fd = new FormData(); fd.set('userId', String(cid)); fd.set('date', '2026-10-19'); for (const [k, v] of Object.entries(extra)) fd.set(k, v); if (bytes) fd.set('pdf', new File([bytes], name, { type: 'application/pdf' })); return fd; };
const big = mkPdf(1300000);
r = await call('POST', '/api/admin/measurement', formFor(big, 'Informe Body Pro (1).pdf', { weight_kg: '61.2' })); t('sube PDF de 1,3 MB con valores', r.status === 200, r);
const pm = db.prepare('SELECT * FROM measurements WHERE pdf_name IS NOT NULL').get();
t('PDF guardado en trozos y nombre saneado', pm && db.prepare('SELECT count(*) c FROM pdf_chunks WHERE measurement_id=?').get(pm.id).c === 3 && /^[\w.\- ]+$/.test(pm.pdf_name), pm);
r = await call('POST', '/api/admin/measurement', formFor(mkPdf(5000), 'solo.pdf')); t('PDF sin valores también se acepta', r.status === 200, r);
r = await call('POST', '/api/admin/measurement', formFor(new TextEncoder().encode('esto no es pdf'), 'x.pdf', { weight_kg: '60' })); t('archivo que no es PDF rechazado', r.status === 400, r);
r = await call('POST', '/api/admin/measurement', formFor(mkPdf(4 * 1024 * 1024 + 10), 'grande.pdf')); t('PDF de más de 4 MB rechazado', r.status === 400 || r.status === 413, r);
const res = await worker.fetch(new Request(ORIGIN + '/api/measurements/pdf?id=' + pm.id, { headers: { cookie } }), env);
const got = new Uint8Array(await res.arrayBuffer());
t('Yohi descarga el PDF idéntico', res.status === 200 && res.headers.get('content-type') === 'application/pdf' && got.length === big.length && got.every((v, i) => v === big[i]), res.status);
t('PDF con cabeceras seguras', res.headers.get('x-content-type-options') === 'nosniff' && /no-store/.test(res.headers.get('cache-control')) && res.headers.get('content-security-policy') === 'sandbox');
await loginAs('camila@x.cl', 'Camila12345');
r = await call('GET', '/api/measurements'); t('alumna ve que hay PDF', r.data.items.some((i) => i.has_pdf), r.data);
const own = await worker.fetch(new Request(ORIGIN + '/api/measurements/pdf?id=' + pm.id, { headers: { cookie } }), env);
t('la dueña descarga su PDF', own.status === 200);
await loginAs('fran@x.cl', 'Francisca123');
const other = await worker.fetch(new Request(ORIGIN + '/api/measurements/pdf?id=' + pm.id, { headers: { cookie } }), env);
t('otra alumna NO accede al PDF', other.status === 404);
const anon = await worker.fetch(new Request(ORIGIN + '/api/measurements/pdf?id=' + pm.id), env);
t('sin sesión NO accede al PDF', anon.status === 401);
await loginAs('camila@x.cl', 'Camila12345');
r = await call('POST', '/api/health-consent', { enabled: false });
t('retirar autorización borra también los PDF', db.prepare('SELECT count(*) c FROM pdf_chunks').get().c === 0 && db.prepare('SELECT count(*) c FROM measurements WHERE user_id=?').get(cid).c === 0, r);
delete env.NOW_MS;
// fuerza bruta
cookie = '';
let blocked = false;
for (let i = 0; i < 8; i++) { r = await call('POST', '/api/login', { email: 'camila@x.cl', password: 'mala' + i }, { ip: '9.9.9.9' }); if (r.status === 429) blocked = true; }
t('bloqueo tras varios intentos fallidos', blocked);
// sesión vencida
db.exec("UPDATE auth_sessions SET expires_at='2000-01-01T00:00:00.000Z'");
r = await call('GET', '/api/me'); t('sesión vencida rechazada', r.status === 401, r);
console.log(`\n${pass} ok, ${bad} fallas`);
process.exit(bad ? 1 : 0);
