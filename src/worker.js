// Portal de alumnos de Yohi Coach — API sobre Cloudflare Workers + D1.
// Solo atiende /api/*; el resto del sitio lo sirven los archivos estáticos (ASSETS).

const ENC = new TextEncoder();
const PBKDF2_ITER = 100000; // tope que permite Workers para PBKDF2 (se guarda por usuario para poder subirlo luego)
const SESSION_DAYS = 7;
const CONSENT_VERSION = '2026-10-v1'; // sube la versión cuando cambien los términos o la política
const SEDES = ['quilpue', 'vina', 'quillota'];

/* ---------- utilidades ---------- */
const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      ...headers,
    },
  });
}
const fail = (status, error) => json({ ok: false, error }, status);

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function pbkdf2(password, saltB64, iterations) {
  const key = await crypto.subtle.importKey('raw', ENC.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: unb64(saltB64), iterations },
    key,
    256,
  );
  return b64(bits);
}

async function makeHash(password) {
  const salt = b64(crypto.getRandomValues(new Uint8Array(16)));
  const h = await pbkdf2(password, salt, PBKDF2_ITER);
  return { hash: `${PBKDF2_ITER}$${h}`, salt };
}

async function checkPassword(password, storedHash, salt) {
  const [iterStr, h] = String(storedHash).split('$');
  const calc = await pbkdf2(password, salt, parseInt(iterStr, 10) || PBKDF2_ITER);
  return timingSafeEqual(calc, h || '');
}

async function sha256Hex(text) {
  return hex(await crypto.subtle.digest('SHA-256', ENC.encode(text)));
}

function getCookie(req, name) {
  const raw = req.headers.get('cookie') || '';
  for (const part of raw.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return v.join('=');
  }
  return null;
}

function sessionCookie(url, value, maxAge) {
  const secure = url.protocol === 'https:' ? '; Secure' : '';
  return `yohi_session=${value}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${secure}`;
}

function isoNow() {
  return new Date().toISOString();
}

function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function addMonths(dateStr, months) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}

function validDate(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s || '')) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

const normEmail = (e) => String(e || '').trim().toLowerCase();
const validEmail = (e) => e.length <= 120 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);

function validPassword(pw, email) {
  if (typeof pw !== 'string') return 'La clave es obligatoria.';
  if (pw.length < 10) return 'La clave debe tener al menos 10 caracteres.';
  if (pw.length > 200) return 'La clave es demasiado larga.';
  if (pw.toLowerCase() === email) return 'La clave no puede ser igual a tu correo.';
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return 'Usa letras y números en tu clave.';
  return null;
}

/* ---------- límite de intentos (en D1) ---------- */
async function limited(env, key, max, windowSec) {
  const now = Math.floor(Date.now() / 1000);
  const row = await env.DB.prepare('SELECT count, reset_at FROM rate_limits WHERE key = ?').bind(key).first();
  if (!row || row.reset_at <= now) {
    await env.DB.prepare('INSERT OR REPLACE INTO rate_limits (key, count, reset_at) VALUES (?, 1, ?)')
      .bind(key, now + windowSec)
      .run();
    return false;
  }
  if (row.count >= max) return true;
  await env.DB.prepare('UPDATE rate_limits SET count = count + 1 WHERE key = ?').bind(key).run();
  return false;
}

/* ---------- sesión ---------- */
async function currentUser(req, env) {
  const token = getCookie(req, 'yohi_session');
  if (!token || !/^[A-Za-z0-9_-]{40,60}$/.test(token)) return null;
  const th = await sha256Hex(token);
  return env.DB.prepare(
    `SELECT u.id, u.name, u.email, u.role, u.status, u.health_consent_at
       FROM auth_sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ? AND s.expires_at > ? AND u.status = 'active'`,
  )
    .bind(th, isoNow())
    .first();
}

async function createSession(env, userId) {
  const raw = crypto.getRandomValues(new Uint8Array(32));
  const token = b64(raw).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const th = await sha256Hex(token);
  const expires = new Date(Date.now() + SESSION_DAYS * 86400000).toISOString();
  await env.DB.prepare('INSERT INTO auth_sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
    .bind(th, userId, expires)
    .run();
  // limpieza oportunista de sesiones vencidas
  await env.DB.prepare('DELETE FROM auth_sessions WHERE expires_at < ?').bind(isoNow()).run();
  return token;
}

async function readBody(req) {
  const ct = req.headers.get('content-type') || '';
  if (!ct.includes('application/json')) return null;
  try {
    const text = await req.text();
    if (text.length > 10000) return null;
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/* ---------- rutas ---------- */
async function signup(req, env, url) {
  const ip = req.headers.get('cf-connecting-ip') || 'x';
  if (await limited(env, `signup:${ip}`, 5, 3600)) return fail(429, 'Demasiados intentos. Prueba de nuevo más tarde.');
  const b = await readBody(req);
  if (!b) return fail(400, 'Solicitud inválida.');
  const name = String(b.name || '').trim().replace(/\s+/g, ' ');
  const email = normEmail(b.email);
  if (name.length < 2 || name.length > 80) return fail(400, 'Escribe tu nombre (2 a 80 caracteres).');
  if (!validEmail(email)) return fail(400, 'Escribe un correo válido.');
  const pwErr = validPassword(b.password, email);
  if (pwErr) return fail(400, pwErr);
  if (b.consent !== true) return fail(400, 'Debes aceptar los términos y la política de privacidad.');

  const exists = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
  if (!exists) {
    const { hash, salt } = await makeHash(b.password);
    await env.DB.prepare(
      `INSERT INTO users (email, name, pass_hash, pass_salt, role, status, consent_version, consent_at, health_consent_at)
       VALUES (?, ?, ?, ?, 'student', 'pending', ?, ?, ?)`,
    )
      .bind(email, name, hash, salt, CONSENT_VERSION, isoNow(), b.healthConsent === true ? isoNow() : null)
      .run();
  }
  // Misma respuesta exista o no el correo: no revela quién tiene cuenta.
  return json({
    ok: true,
    message: 'Solicitud enviada. Yohi revisará tu cuenta y la aprobará pronto.',
  });
}

async function login(req, env, url) {
  const ip = req.headers.get('cf-connecting-ip') || 'x';
  const b = await readBody(req);
  if (!b) return fail(400, 'Solicitud inválida.');
  const email = normEmail(b.email);
  if (await limited(env, `login:${email}:${ip}`, 6, 900) || (await limited(env, `loginip:${ip}`, 30, 900))) {
    return fail(429, 'Demasiados intentos. Espera unos minutos.');
  }
  const user = await env.DB.prepare(
    'SELECT id, name, email, role, status, pass_hash, pass_salt FROM users WHERE email = ?',
  )
    .bind(email)
    .first();

  // Se calcula el hash aunque el usuario no exista, para no revelar cuentas por tiempo de respuesta.
  const dummySalt = 'AAAAAAAAAAAAAAAAAAAAAA==';
  const okPw = user
    ? await checkPassword(String(b.password || ''), user.pass_hash, user.pass_salt)
    : (await pbkdf2(String(b.password || ''), dummySalt, PBKDF2_ITER), false);
  if (!user || !okPw) return fail(401, 'Correo o clave incorrectos.');

  if (user.status === 'pending') return fail(403, 'Tu cuenta está pendiente: Yohi aún no la aprueba.');
  if (user.status === 'rejected') return fail(403, 'Tu solicitud no fue aprobada. Escríbele a Yohi por WhatsApp.');
  if (user.status !== 'active') return fail(403, 'Tu cuenta está desactivada. Escríbele a Yohi por WhatsApp.');

  const token = await createSession(env, user.id);
  return json(
    { ok: true, role: user.role, name: user.name },
    200,
    { 'set-cookie': sessionCookie(url, token, SESSION_DAYS * 86400) },
  );
}

async function logout(req, env, url) {
  const token = getCookie(req, 'yohi_session');
  if (token) await env.DB.prepare('DELETE FROM auth_sessions WHERE token_hash = ?').bind(await sha256Hex(token)).run();
  return json({ ok: true }, 200, { 'set-cookie': sessionCookie(url, '', 0) });
}

async function me(req, env) {
  const user = await currentUser(req, env);
  if (!user) return fail(401, 'No has iniciado sesión.');
  const plan = await env.DB.prepare(
    `SELECT modality, sede, sessions_total, start_date, end_date FROM plans
      WHERE user_id = ? ORDER BY end_date DESC LIMIT 1`,
  )
    .bind(user.id)
    .first();
  return json({
    ok: true,
    user: { name: user.name, email: user.email, role: user.role, healthConsent: !!user.health_consent_at },
    plan: plan || null,
  });
}

// Primer uso: crea la cuenta de Yohi (administradora). Solo funciona si aún no existe ninguna
// y con el código secreto que ella guarda en Cloudflare (variable SETUP_TOKEN).
async function setup(req, env) {
  const ip = req.headers.get('cf-connecting-ip') || 'x';
  if (await limited(env, `setup:${ip}`, 5, 3600)) return fail(429, 'Demasiados intentos.');
  if (!env.SETUP_TOKEN) return fail(404, 'No disponible.');
  const b = await readBody(req);
  if (!b) return fail(400, 'Solicitud inválida.');
  if (!timingSafeEqual(String(b.token || ''), env.SETUP_TOKEN)) return fail(403, 'Código incorrecto.');
  const hasAdmin = await env.DB.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").first();
  if (hasAdmin) return fail(409, 'La cuenta de administradora ya fue creada.');
  const name = String(b.name || '').trim();
  const email = normEmail(b.email);
  if (name.length < 2 || name.length > 80) return fail(400, 'Escribe el nombre.');
  if (!validEmail(email)) return fail(400, 'Escribe un correo válido.');
  const pwErr = validPassword(b.password, email);
  if (pwErr) return fail(400, pwErr);
  const { hash, salt } = await makeHash(b.password);
  await env.DB.prepare(
    `INSERT INTO users (email, name, pass_hash, pass_salt, role, status, consent_version, consent_at)
     VALUES (?, ?, ?, ?, 'admin', 'active', ?, ?)`,
  )
    .bind(email, name, hash, salt, CONSENT_VERSION, isoNow())
    .run();
  return json({ ok: true, message: 'Cuenta de Yohi creada. Ya puedes ingresar.' });
}

async function requireAdmin(req, env) {
  const u = await currentUser(req, env);
  return u && u.role === 'admin' ? u : null;
}

async function adminPending(req, env) {
  if (!(await requireAdmin(req, env))) return fail(403, 'Sin permiso.');
  const { results } = await env.DB.prepare(
    "SELECT id, name, email, created_at FROM users WHERE status = 'pending' AND role = 'student' ORDER BY created_at",
  ).all();
  return json({ ok: true, pending: results });
}

async function adminStudents(req, env) {
  if (!(await requireAdmin(req, env))) return fail(403, 'Sin permiso.');
  const { results } = await env.DB.prepare(
    `SELECT u.id, u.name, u.email, p.modality, p.sede, p.sessions_total, p.start_date, p.end_date
       FROM users u LEFT JOIN plans p ON p.id = (SELECT id FROM plans WHERE user_id = u.id ORDER BY end_date DESC LIMIT 1)
      WHERE u.role = 'student' AND u.status = 'active' ORDER BY u.name`,
  ).all();
  return json({ ok: true, students: results });
}

async function adminApprove(req, env) {
  if (!(await requireAdmin(req, env))) return fail(403, 'Sin permiso.');
  const b = await readBody(req);
  if (!b) return fail(400, 'Solicitud inválida.');
  const userId = Number(b.userId);
  const modality = b.modality;
  const start = String(b.start || '');
  if (!Number.isInteger(userId)) return fail(400, 'Alumno inválido.');
  if (!['presencial', 'online'].includes(modality)) return fail(400, 'Elige la modalidad.');
  if (!validDate(start)) return fail(400, 'Fecha de inicio inválida.');

  let sede = null, sessions = null, end;
  if (modality === 'presencial') {
    sede = b.sede;
    if (!SEDES.includes(sede)) return fail(400, 'Elige la sede.');
    sessions = Number(b.sessions);
    if (!Number.isInteger(sessions) || sessions < 1 || sessions > 40) return fail(400, 'Sesiones entre 1 y 40.');
    end = addDays(start, 27); // 4 semanas
  } else {
    const months = Number(b.months);
    if (![1, 3].includes(months)) return fail(400, 'Elige 1 o 3 meses.');
    end = addDays(addMonths(start, months), -1);
  }

  const user = await env.DB.prepare("SELECT id FROM users WHERE id = ? AND status = 'pending' AND role = 'student'")
    .bind(userId)
    .first();
  if (!user) return fail(404, 'No se encontró una cuenta pendiente.');

  await env.DB.batch([
    env.DB.prepare("UPDATE users SET status = 'active' WHERE id = ?").bind(userId),
    env.DB.prepare(
      'INSERT INTO plans (user_id, modality, sede, sessions_total, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?)',
    ).bind(userId, modality, sede, sessions, start, end),
  ]);
  return json({ ok: true, end });
}

async function adminReject(req, env) {
  if (!(await requireAdmin(req, env))) return fail(403, 'Sin permiso.');
  const b = await readBody(req);
  const userId = Number(b && b.userId);
  if (!Number.isInteger(userId)) return fail(400, 'Alumno inválido.');
  await env.DB.prepare("UPDATE users SET status = 'rejected' WHERE id = ? AND status = 'pending' AND role = 'student'")
    .bind(userId)
    .run();
  return json({ ok: true });
}

/* ---------- agenda y reservas ---------- */
const TZ = 'America/Santiago';
// Horas de inicio (sesiones de 1 hora) dentro de las franjas que definió Yohi.
const SLOTS = {
  am: ['08:30', '09:30'],            // 8:30 a 10:30
  pm: ['16:00', '17:00', '18:00', '19:00'], // 16:00 a 20:00
  wk: ['09:00', '10:00', '11:00', '12:00'], // fines de semana 9:00 a 13:00
};
const nowMs = (env) => (env.NOW_MS ? Number(env.NOW_MS) : Date.now());

function tzParts(ms) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone: TZ, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
      .formatToParts(new Date(ms)).map((x) => [x.type, x.value]),
  );
  return { day: `${p.year}-${p.month}-${p.day}`, min: Number(p.hour) * 60 + Number(p.minute) };
}
const todayCL = (env) => tzParts(nowMs(env)).day;
// Instante (ms UTC) de una fecha y hora locales de Chile.
function slotMs(day, time) {
  const [y, m, d] = day.split('-').map(Number), [h, mi] = time.split(':').map(Number);
  let guess = Date.UTC(y, m - 1, d, h, mi);
  for (let i = 0; i < 3; i++) {
    const p = tzParts(guess);
    const asUtc = Date.UTC(...p.day.split('-').map((v, k) => (k === 1 ? Number(v) - 1 : Number(v))), Math.floor(p.min / 60), p.min % 60);
    guess += Date.UTC(y, m - 1, d, h, mi) - asUtc;
  }
  return guess;
}
const isWeekend = (day) => { const w = new Date(day + 'T12:00:00Z').getUTCDay(); return w === 0 || w === 6; };
const modeOk = (day, mode) => (isWeekend(day) ? mode === 'wk' : mode === 'am' || mode === 'pm');
const USED = "(status IN ('requested','confirmed','done') OR (status = 'cancelled' AND late_cancel = 1))";

async function activePlan(env, userId, today) {
  return env.DB.prepare(
    `SELECT id, modality, sede, sessions_total, start_date, end_date FROM plans
      WHERE user_id = ? AND start_date <= ? AND end_date >= ? ORDER BY end_date DESC LIMIT 1`,
  ).bind(userId, today, today).first();
}
async function usedSessions(env, planId) {
  const r = await env.DB.prepare(`SELECT COUNT(*) AS n FROM bookings WHERE plan_id = ? AND ${USED}`).bind(planId).first();
  return r ? r.n : 0;
}

async function agenda(req, env) {
  const user = await currentUser(req, env);
  if (!user) return fail(401, 'No has iniciado sesión.');
  const today = todayCL(env);
  const plan = await activePlan(env, user.id, today);
  if (!plan || plan.modality !== 'presencial') return json({ ok: true, plan: null, days: [], mine: [] });
  const used = await usedSessions(env, plan.id);
  const to = plan.end_date;
  const { results: days } = await env.DB.prepare(
    "SELECT day, mode, sede FROM open_days WHERE day >= ? AND day <= ? AND mode != 'closed' AND sede = ? ORDER BY day",
  ).bind(today, to, plan.sede).all();
  const { results: taken } = await env.DB.prepare(
    "SELECT day, time FROM bookings WHERE day >= ? AND day <= ? AND status IN ('requested','confirmed')",
  ).bind(today, to).all();
  const takenSet = new Set(taken.map((t) => `${t.day} ${t.time}`));
  const now = nowMs(env);
  const out = days.map((d) => ({
    day: d.day, mode: d.mode,
    slots: (SLOTS[d.mode] || []).map((time) => ({ time, free: !takenSet.has(`${d.day} ${time}`) && slotMs(d.day, time) > now })),
  }));
  const { results: mine } = await env.DB.prepare(
    "SELECT id, day, time, status FROM bookings WHERE user_id = ? AND plan_id = ? AND status IN ('requested','confirmed') AND day >= ? ORDER BY day, time",
  ).bind(user.id, plan.id, today).all();
  return json({ ok: true, plan: { total: plan.sessions_total, used, left: Math.max(0, plan.sessions_total - used), end: plan.end_date }, days: out, mine });
}

async function createBooking(req, env) {
  const user = await currentUser(req, env);
  if (!user || user.role !== 'student') return fail(401, 'No has iniciado sesión.');
  if (await limited(env, `book:${user.id}`, 20, 3600)) return fail(429, 'Demasiados intentos. Espera un momento.');
  const b = await readBody(req);
  if (!b || !validDate(String(b.day || '')) || !/^\d\d:\d\d$/.test(String(b.time || ''))) return fail(400, 'Hora inválida.');
  const { day, time } = b;
  const today = todayCL(env);
  const plan = await activePlan(env, user.id, today);
  if (!plan || plan.modality !== 'presencial') return fail(400, 'Tu plan no tiene agenda de sesiones.');
  if (day < plan.start_date || day > plan.end_date) return fail(400, 'Ese día está fuera de tu plan.');
  const open = await env.DB.prepare('SELECT mode, sede FROM open_days WHERE day = ?').bind(day).first();
  if (!open || open.mode === 'closed' || open.sede !== plan.sede || !(SLOTS[open.mode] || []).includes(time)) return fail(400, 'Ese horario no está disponible.');
  if (slotMs(day, time) <= nowMs(env)) return fail(400, 'Esa hora ya pasó.');
  if ((await usedSessions(env, plan.id)) >= plan.sessions_total) return fail(400, 'Ya usaste todas las sesiones de tu plan.');
  try {
    await env.DB.prepare('INSERT INTO bookings (user_id, plan_id, day, time, sede, status) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(user.id, plan.id, day, time, plan.sede, 'requested').run();
  } catch (e) {
    return fail(409, 'Esa hora acaba de ser tomada. Elige otra.');
  }
  const used = await usedSessions(env, plan.id);
  return json({ ok: true, left: Math.max(0, plan.sessions_total - used) });
}

async function cancelBooking(req, env) {
  const user = await currentUser(req, env);
  if (!user || user.role !== 'student') return fail(401, 'No has iniciado sesión.');
  const b = await readBody(req);
  const id = Number(b && b.id);
  if (!Number.isInteger(id)) return fail(400, 'Reserva inválida.');
  const bk = await env.DB.prepare("SELECT id, day, time, status FROM bookings WHERE id = ? AND user_id = ? AND status IN ('requested','confirmed')").bind(id, user.id).first();
  if (!bk) return fail(404, 'No se encontró la reserva.');
  const ms = slotMs(bk.day, bk.time);
  if (ms <= nowMs(env)) return fail(400, 'Esa hora ya pasó.');
  // Más de 24 h antes: la sesión vuelve al plan. Menos: se pierde.
  const late = ms - nowMs(env) < 24 * 3600 * 1000 ? 1 : 0;
  await env.DB.prepare("UPDATE bookings SET status = 'cancelled', late_cancel = ?, decided_at = ? WHERE id = ?").bind(late, isoNow(), id).run();
  return json({ ok: true, returned: !late });
}

async function adminAgenda(req, env) {
  if (!(await requireAdmin(req, env))) return fail(403, 'Sin permiso.');
  const today = todayCL(env);
  const { results: days } = await env.DB.prepare('SELECT day, mode, sede FROM open_days WHERE day >= ? ORDER BY day').bind(today).all();
  const { results: bookings } = await env.DB.prepare(
    `SELECT b.id, b.day, b.time, b.status, b.sede, u.name FROM bookings b JOIN users u ON u.id = b.user_id
      WHERE b.status IN ('requested','confirmed') AND b.day >= ? ORDER BY b.day, b.time`,
  ).bind(today).all();
  return json({ ok: true, today, days, bookings });
}

async function adminOpenDay(req, env) {
  if (!(await requireAdmin(req, env))) return fail(403, 'Sin permiso.');
  const b = await readBody(req);
  if (!b || !validDate(String(b.day || ''))) return fail(400, 'Fecha inválida.');
  const mode = b.mode, sede = b.sede || 'quilpue';
  if (!['am', 'pm', 'wk', 'closed'].includes(mode)) return fail(400, 'Modo inválido.');
  if (!SEDES.includes(sede)) return fail(400, 'Sede inválida.');
  if (mode !== 'closed' && !modeOk(b.day, mode)) return fail(400, isWeekend(b.day) ? 'Los fines de semana es horario de 9:00 a 13:00.' : 'De lunes a viernes elige mañana o tarde.');
  if (b.day < todayCL(env)) return fail(400, 'Ese día ya pasó.');
  const cur = await env.DB.prepare('SELECT mode FROM open_days WHERE day = ?').bind(b.day).first();
  if (cur && cur.mode !== mode) {
    const n = await env.DB.prepare("SELECT COUNT(*) AS n FROM bookings WHERE day = ? AND status IN ('requested','confirmed')").bind(b.day).first();
    if (n.n > 0) return fail(409, 'Ese día ya tiene horas pedidas. Respóndelas o cancélalas primero.');
  }
  await env.DB.prepare('INSERT INTO open_days (day, mode, sede) VALUES (?, ?, ?) ON CONFLICT(day) DO UPDATE SET mode = excluded.mode, sede = excluded.sede').bind(b.day, mode, sede).run();
  return json({ ok: true });
}

async function adminBooking(req, env) {
  if (!(await requireAdmin(req, env))) return fail(403, 'Sin permiso.');
  const b = await readBody(req);
  const id = Number(b && b.id);
  const next = { confirm: 'confirmed', reject: 'rejected', cancel: 'cancelled' }[b && b.action];
  if (!Number.isInteger(id) || !next) return fail(400, 'Solicitud inválida.');
  const from = next === 'confirmed' ? "status = 'requested'" : "status IN ('requested','confirmed')";
  const r = await env.DB.prepare(`UPDATE bookings SET status = ?, decided_at = ? WHERE id = ? AND ${from}`).bind(next, isoNow(), id).run();
  const row = await env.DB.prepare('SELECT status FROM bookings WHERE id = ?').bind(id).first();
  if (!row || row.status !== next) return fail(404, 'La reserva ya no está en ese estado.');
  return json({ ok: true });
}

/* ---------- entrada ---------- */
export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(req);

    try {
      const route = `${req.method} ${url.pathname}`;
      // Protección CSRF: las escrituras solo desde nuestro propio sitio.
      if (req.method === 'POST') {
        const origin = req.headers.get('origin');
        if (!origin || origin !== url.origin) return fail(403, 'Origen no permitido.');
      }
      switch (route) {
        case 'POST /api/signup': return await signup(req, env, url);
        case 'POST /api/login': return await login(req, env, url);
        case 'POST /api/logout': return await logout(req, env, url);
        case 'GET /api/me': return await me(req, env);
        case 'POST /api/setup': return await setup(req, env);
        case 'GET /api/admin/pending': return await adminPending(req, env);
        case 'GET /api/admin/students': return await adminStudents(req, env);
        case 'POST /api/admin/approve': return await adminApprove(req, env);
        case 'POST /api/admin/reject': return await adminReject(req, env);
        case 'GET /api/agenda': return await agenda(req, env);
        case 'POST /api/bookings': return await createBooking(req, env);
        case 'POST /api/bookings/cancel': return await cancelBooking(req, env);
        case 'GET /api/admin/agenda': return await adminAgenda(req, env);
        case 'POST /api/admin/open-day': return await adminOpenDay(req, env);
        case 'POST /api/admin/booking': return await adminBooking(req, env);
        default: return fail(404, 'No encontrado.');
      }
    } catch (err) {
      console.error('api error', err && err.message);
      return fail(500, 'Error interno. Intenta de nuevo.');
    }
  },
};
