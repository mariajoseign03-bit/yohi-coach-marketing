// Pruebas de la API del portal. Ejecutar desde la raíz del repo:
//   node --experimental-sqlite --no-warnings tests/api.test.mjs
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import worker from '../src/worker.js';

const db = new DatabaseSync(':memory:');
for (const f of ['0001_init.sql', '0002_health_consent.sql']) db.exec(fs.readFileSync('./migrations/' + f, 'utf8'));
db.exec('PRAGMA foreign_keys = ON');

function stmt(sql) {
  let args = [];
  const o = {
    bind(...a) { args = a; return o; },
    async first() { return db.prepare(sql).get(...args) || null; },
    async all() { return { results: db.prepare(sql).all(...args) }; },
    async run() { db.prepare(sql).run(...args); return { success: true }; },
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
  const headers = { 'content-type': 'application/json', 'cf-connecting-ip': opts.ip || '1.1.1.1' };
  if (method === 'POST') headers.origin = opts.origin ?? ORIGIN;
  if (cookie && !opts.nocookie) headers.cookie = cookie;
  const res = await worker.fetch(new Request(ORIGIN + path, { method, headers, body: body ? JSON.stringify(body) : undefined }), env);
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
