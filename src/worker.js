import { gcalConfigured, gcalCreate, gcalDelete } from './gcal.js';
import { mailConfigured, mailConfig, bookingEmail, resetEmail, renewalEmail, sendMail } from './mail.js';
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
  const typed = String(b.password || '');
  let okPw = user
    ? await checkPassword(typed, user.pass_hash, user.pass_salt)
    : (await pbkdf2(typed, dummySalt, PBKDF2_ITER), false);
  // Los teclados de celular a veces agregan un espacio al final: se prueba también sin espacios en los bordes.
  if (user && !okPw && typed !== typed.trim()) okPw = await checkPassword(typed.trim(), user.pass_hash, user.pass_salt);
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

/* ---------- renovaciones: el alumno sube el comprobante de su transferencia y Yohi lo revisa ---------- */
const planOf = (env, userId) => env.DB.prepare('SELECT id, modality, sede, sessions_total, start_date, end_date FROM plans WHERE user_id = ? ORDER BY id DESC LIMIT 1').bind(userId).first();
const bankInfo = async (env) => { const r = await env.DB.prepare("SELECT value FROM app_settings WHERE key = 'bank_info'").first(); return r ? r.value : ''; };
const dayDiff = (a, b) => Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 86400000);
const siteOf = (env) => (mailConfig(env) || { site: 'https://yohicoach.cl' }).site;

// Alumno: su plan (con días y sesiones), sus renovaciones y los datos para transferir que dejó Yohi.
async function myRenewals(req, env) {
  const user = await currentUser(req, env);
  if (!user || user.role !== 'student') return fail(401, 'No has iniciado sesión.');
  const today = todayCL(env);
  const plan = (await activePlan(env, user.id, today)) || (await planOf(env, user.id));
  const used = plan && plan.modality === 'presencial' ? await usedSessions(env, plan.id) : null;
  const next = await env.DB.prepare('SELECT modality, sede, sessions_total, start_date, end_date FROM plans WHERE user_id = ? AND start_date > ? ORDER BY id DESC LIMIT 1').bind(user.id, today).first();
  const { results } = await env.DB.prepare('SELECT id, status, note, file_name, reject_reason, created_at, decided_at FROM renewals WHERE user_id = ? ORDER BY id DESC LIMIT 20').bind(user.id).all();
  return json({ ok: true, today, plan: plan ? { ...plan, used } : null, next: next || null, renewals: results, bank: await bankInfo(env) });
}

async function submitRenewal(req, env, ctx) {
  const user = await currentUser(req, env);
  if (!user || user.role !== 'student') return fail(401, 'No has iniciado sesión.');
  if (await limited(env, `renew:${user.id}`, 6, 86400)) return fail(429, 'Enviaste varios comprobantes hoy. Escríbele a Yohi por WhatsApp.');
  if (!(req.headers.get('content-type') || '').includes('multipart/form-data')) return fail(400, 'Solicitud inválida.');
  if (Number(req.headers.get('content-length') || 0) > PDF_MAX + 100000) return fail(413, 'El archivo pesa más de 4 MB.');
  let fd;
  try { fd = await req.formData(); } catch { return fail(400, 'Solicitud inválida.'); }
  const file = fd.get('file');
  const note = String(fd.get('note') || '').trim().slice(0, 300);
  if (!file || typeof file === 'string' || !file.size) return fail(400, 'Adjunta tu comprobante (PDF o imagen).');
  if (file.size > PDF_MAX) return fail(400, 'El archivo pesa más de 4 MB.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = fileKind(bytes);
  if (!kind) return fail(400, 'El comprobante debe ser un PDF, PNG o JPG.');
  const pending = await env.DB.prepare("SELECT id FROM renewals WHERE user_id = ? AND status = 'pending'").bind(user.id).first();
  if (pending) return fail(409, 'Ya tienes un comprobante en revisión. Espera a que Yohi lo revise.');
  const plan = await planOf(env, user.id);
  const name = String(file.name || '').replace(/[^\w.\- ]/g, '_').slice(0, 80) || `comprobante.${kind.ext}`;
  const ins = await env.DB.prepare('INSERT INTO renewals (user_id, plan_id, note, file_name) VALUES (?, ?, ?, ?)').bind(user.id, plan ? plan.id : null, note, name).run();
  const rid = ins.meta && ins.meta.last_row_id;
  try {
    const stmts = [];
    for (let i = 0, seq = 0; i < bytes.length; i += CHUNK, seq++) {
      stmts.push(env.DB.prepare('INSERT INTO renewal_chunks (renewal_id, seq, data) VALUES (?, ?, ?)').bind(rid, seq, bytesToB64(bytes.subarray(i, i + CHUNK))));
    }
    await env.DB.batch(stmts);
  } catch (e) {
    await env.DB.prepare('DELETE FROM renewals WHERE id = ?').bind(rid).run();
    return fail(500, 'No se pudo guardar el archivo. Intenta de nuevo.');
  }
  // Aviso por correo a Yohi (en segundo plano; si el correo no está conectado, no pasa nada).
  if (mailConfigured(env)) {
    const { results: admins } = await env.DB.prepare("SELECT name, email FROM users WHERE role = 'admin' AND status = 'active'").all();
    for (const a of admins) {
      const p = sendMail(env, { to: a.email, ...renewalEmail({ kind: 'new', name: a.name, studentName: user.name, site: siteOf(env) }) });
      if (ctx && ctx.waitUntil) ctx.waitUntil(p);
    }
  }
  return json({ ok: true });
}

async function cancelRenewal(req, env) {
  const user = await currentUser(req, env);
  if (!user || user.role !== 'student') return fail(401, 'No has iniciado sesión.');
  const b = await readBody(req);
  const id = Number(b && b.id);
  if (!Number.isInteger(id)) return fail(400, 'Solicitud inválida.');
  await env.DB.prepare("DELETE FROM renewals WHERE id = ? AND user_id = ? AND status = 'pending'").bind(id, user.id).run();
  return json({ ok: true });
}

// Comprobante (PDF o imagen): solo quien lo subió o Yohi.
async function renewalFile(req, env, url) {
  const user = await currentUser(req, env);
  if (!user) return fail(401, 'No has iniciado sesión.');
  const id = Number(url.searchParams.get('id'));
  if (!Number.isInteger(id)) return fail(400, 'Solicitud inválida.');
  const row = await env.DB.prepare('SELECT user_id FROM renewals WHERE id = ?').bind(id).first();
  if (!row || (row.user_id !== user.id && user.role !== 'admin')) return fail(404, 'No encontrado.');
  const { results } = await env.DB.prepare('SELECT data FROM renewal_chunks WHERE renewal_id = ? ORDER BY seq').bind(id).all();
  const parts = results.map((r) => Uint8Array.from(atob(r.data), (c) => c.charCodeAt(0)));
  const body = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let off = 0;
  for (const p of parts) { body.set(p, off); off += p.length; }
  const kind = fileKind(body) || FILE_KINDS.pdf;
  return new Response(body, {
    headers: {
      'content-type': kind.type,
      'content-disposition': `inline; filename="comprobante-${id}.${kind.ext}"`,
      'cache-control': 'private, no-store',
      'x-content-type-options': 'nosniff',
      'content-security-policy': 'sandbox',
    },
  });
}

// Yohi: todas las renovaciones (pendientes primero) con el plan actual de cada alumno.
async function adminRenewals(req, env) {
  if (!(await requireAdmin(req, env))) return fail(403, 'Sin permiso.');
  const { results } = await env.DB.prepare(
    `SELECT r.id, r.user_id, r.status, r.note, r.file_name, r.reject_reason, r.created_at, r.decided_at, u.name, u.email,
            (SELECT modality FROM plans p WHERE p.user_id = r.user_id ORDER BY p.id DESC LIMIT 1) AS plan_modality,
            (SELECT sede FROM plans p WHERE p.user_id = r.user_id ORDER BY p.id DESC LIMIT 1) AS plan_sede,
            (SELECT sessions_total FROM plans p WHERE p.user_id = r.user_id ORDER BY p.id DESC LIMIT 1) AS plan_sessions,
            (SELECT end_date FROM plans p WHERE p.user_id = r.user_id ORDER BY p.id DESC LIMIT 1) AS plan_end
       FROM renewals r JOIN users u ON u.id = r.user_id
      ORDER BY CASE r.status WHEN 'pending' THEN 0 ELSE 1 END, r.id DESC LIMIT 100`,
  ).all();
  return json({ ok: true, today: todayCL(env), renewals: results, pending: results.filter((r) => r.status === 'pending').length, bank: await bankInfo(env) });
}

// Yohi aprueba (crea el plan nuevo con las mismas condiciones) o rechaza con un motivo.
async function adminDecideRenewal(req, env, ctx) {
  if (!(await requireAdmin(req, env))) return fail(403, 'Sin permiso.');
  const b = await readBody(req);
  if (!b) return fail(400, 'Solicitud inválida.');
  const id = Number(b.id);
  if (!Number.isInteger(id) || !['approve', 'reject'].includes(b.action)) return fail(400, 'Solicitud inválida.');
  const r = await env.DB.prepare('SELECT r.id, r.user_id, r.status, u.name, u.email FROM renewals r JOIN users u ON u.id = r.user_id WHERE r.id = ?').bind(id).first();
  if (!r) return fail(404, 'No se encontró la renovación.');
  if (r.status !== 'pending') return fail(409, 'Esta renovación ya fue revisada.');
  const notify = (info) => {
    if (!mailConfigured(env) || !r.email) return;
    const p = sendMail(env, { to: r.email, ...renewalEmail({ name: r.name, site: siteOf(env), ...info }) });
    if (ctx && ctx.waitUntil) ctx.waitUntil(p);
  };
  if (b.action === 'reject') {
    const reason = String(b.reason || '').trim().slice(0, 200);
    await env.DB.prepare("UPDATE renewals SET status = 'rejected', reject_reason = ?, decided_at = ? WHERE id = ?").bind(reason, isoNow(), id).run();
    notify({ kind: 'rejected', reason });
    return json({ ok: true });
  }
  const cur = await planOf(env, r.user_id);
  if (!cur) return fail(400, 'Este alumno no tiene un plan para renovar. Créalo primero en Planes.');
  const today = todayCL(env);
  // Si el plan sigue vigente, el nuevo parte el día siguiente (no se pierden días ni sesiones); si ya venció, parte hoy.
  const start = cur.end_date >= today ? addDays(cur.end_date, 1) : today;
  let end, sede = null, sessions = null;
  if (cur.modality === 'presencial') { sede = cur.sede; sessions = cur.sessions_total; end = addDays(start, 27); }
  else { const months = dayDiff(cur.start_date, cur.end_date) > 62 ? 3 : 1; end = addDays(addMonths(start, months), -1); }
  const ins = await env.DB.prepare('INSERT INTO plans (user_id, modality, sede, sessions_total, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?)').bind(r.user_id, cur.modality, sede, sessions, start, end).run();
  await env.DB.prepare("UPDATE renewals SET status = 'approved', new_plan_id = ?, decided_at = ? WHERE id = ?").bind(ins.meta && ins.meta.last_row_id, isoNow(), id).run();
  notify({ kind: 'approved', end });
  return json({ ok: true, start, end });
}

async function adminSaveBank(req, env) {
  if (!(await requireAdmin(req, env))) return fail(403, 'Sin permiso.');
  const b = await readBody(req);
  if (!b || typeof b.text !== 'string') return fail(400, 'Solicitud inválida.');
  await env.DB.prepare("INSERT OR REPLACE INTO app_settings (key, value) VALUES ('bank_info', ?)").bind(b.text.trim().slice(0, 600)).run();
  return json({ ok: true });
}

/* ---------- recuperar la clave por correo (código de 6 dígitos) ---------- */
const RESET_MINUTES = 15, RESET_MAX_TRIES = 5;
const resetHash = (userId, code) => sha256Hex(`reset:${userId}:${code}`);

// Misma respuesta exista o no la cuenta (no revela quién está registrado) y el envío va en segundo plano para que el tiempo tampoco lo delate.
async function passwordForgot(req, env, ctx) {
  const ip = req.headers.get('cf-connecting-ip') || 'x';
  const b = await readBody(req);
  if (!b) return fail(400, 'Solicitud inválida.');
  const email = normEmail(b.email);
  if (!validEmail(email)) return fail(400, 'Escribe un correo válido.');
  if (!mailConfigured(env)) return fail(503, 'La recuperación por correo aún no está disponible. Escríbele a Yohi por WhatsApp y te ayuda.');
  if (await limited(env, `forgot:${email}`, 3, 3600) || (await limited(env, `forgotip:${ip}`, 10, 3600))) {
    return fail(429, 'Pediste varios códigos seguidos. Espera un rato e intenta de nuevo.');
  }
  const user = await env.DB.prepare("SELECT id, name, email FROM users WHERE email = ? AND status = 'active'").bind(email).first();
  if (user) {
    const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, '0');
    const expires = new Date(Date.now() + RESET_MINUTES * 60000).toISOString();
    await env.DB.prepare('INSERT OR REPLACE INTO password_resets (user_id, code_hash, expires_at, tries) VALUES (?, ?, ?, 0)')
      .bind(user.id, await resetHash(user.id, code), expires).run();
    const send = sendMail(env, { to: user.email, ...resetEmail({ name: user.name, code, minutes: RESET_MINUTES, site: mailConfig(env).site }) });
    if (ctx && ctx.waitUntil) ctx.waitUntil(send); else await send;
  }
  return json({ ok: true, message: `Si ese correo tiene una cuenta activa, te enviamos un código de 6 dígitos. Vence en ${RESET_MINUTES} minutos.` });
}

async function passwordReset(req, env) {
  const ip = req.headers.get('cf-connecting-ip') || 'x';
  const b = await readBody(req);
  if (!b) return fail(400, 'Solicitud inválida.');
  const email = normEmail(b.email);
  const code = String(b.code || '').replace(/\D/g, '');
  if (!validEmail(email) || code.length !== 6) return fail(400, 'Revisa tu correo y el código de 6 dígitos.');
  if (await limited(env, `reset:${email}:${ip}`, 10, 900) || (await limited(env, `resetip:${ip}`, 40, 900))) {
    return fail(429, 'Demasiados intentos. Espera unos minutos.');
  }
  const pwErr = validPassword(b.password, email);
  if (pwErr) return fail(400, pwErr);
  const bad = () => fail(400, 'El código no es correcto o ya venció. Si hace falta, pide uno nuevo.');
  const user = await env.DB.prepare("SELECT id FROM users WHERE email = ? AND status = 'active'").bind(email).first();
  const row = user ? await env.DB.prepare('SELECT code_hash, expires_at, tries FROM password_resets WHERE user_id = ?').bind(user.id).first() : null;
  if (!user || !row) return bad();
  if (row.expires_at < isoNow()) { await env.DB.prepare('DELETE FROM password_resets WHERE user_id = ?').bind(user.id).run(); return bad(); }
  if (!timingSafeEqual(await resetHash(user.id, code), row.code_hash)) {
    // Con 5 errores el código se anula: hay que pedir otro.
    if (row.tries + 1 >= RESET_MAX_TRIES) await env.DB.prepare('DELETE FROM password_resets WHERE user_id = ?').bind(user.id).run();
    else await env.DB.prepare('UPDATE password_resets SET tries = tries + 1 WHERE user_id = ?').bind(user.id).run();
    return bad();
  }
  const { hash, salt } = await makeHash(b.password);
  await env.DB.batch([
    env.DB.prepare('UPDATE users SET pass_hash = ?, pass_salt = ? WHERE id = ?').bind(hash, salt, user.id),
    env.DB.prepare('DELETE FROM password_resets WHERE user_id = ?').bind(user.id),
    env.DB.prepare('DELETE FROM auth_sessions WHERE user_id = ?').bind(user.id), // cierra sesiones abiertas con la clave anterior
  ]);
  return json({ ok: true, message: 'Listo: tu clave quedó cambiada. Ya puedes ingresar.' });
}

async function logout(req, env, url) {
  const token = getCookie(req, 'yohi_session');
  if (token) await env.DB.prepare('DELETE FROM auth_sessions WHERE token_hash = ?').bind(await sha256Hex(token)).run();
  return json({ ok: true }, 200, { 'set-cookie': sessionCookie(url, '', 0) });
}

async function me(req, env) {
  const user = await currentUser(req, env);
  if (!user) return fail(401, 'No has iniciado sesión.');
  const plan = (await activePlan(env, user.id, todayCL(env))) || (await env.DB.prepare(
    `SELECT modality, sede, sessions_total, start_date, end_date FROM plans
      WHERE user_id = ? ORDER BY id DESC LIMIT 1`,
  )
    .bind(user.id)
    .first());
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
    `SELECT u.id, u.name, u.email, p.id AS plan_id, p.modality, p.sede, p.sessions_total, p.start_date, p.end_date,
            (SELECT MAX(logged_on) FROM training_logs WHERE user_id = u.id) AS last_log
       FROM users u LEFT JOIN plans p ON p.id = (SELECT id FROM plans WHERE user_id = u.id ORDER BY id DESC LIMIT 1)
      WHERE u.role = 'student' AND u.status = 'active' ORDER BY u.name`,
  ).all();
  for (const s of results) s.used = s.modality === 'presencial' ? await usedSessions(env, s.plan_id) : null;
  return json({ ok: true, students: results });
}

// Elimina la cuenta de un alumno y todo lo suyo (plan, reservas, rutinas, registros, mediciones). No se puede deshacer.
async function adminDeleteStudent(req, env) {
  if (!(await requireAdmin(req, env))) return fail(403, 'Sin permiso.');
  const b = await readBody(req);
  const userId = Number(b && b.userId);
  if (!Number.isInteger(userId)) return fail(400, 'Alumno inválido.');
  const u = await env.DB.prepare("SELECT id FROM users WHERE id = ? AND role = 'student'").bind(userId).first();
  if (!u) return fail(404, 'No se encontró al alumno.');
  // Quita del Google Calendar las horas que tenía agendadas (si está conectado).
  const { results: bks } = await env.DB.prepare("SELECT id FROM bookings WHERE user_id = ? AND gcal_event_id IS NOT NULL").bind(userId).all();
  for (const k of bks) await gcalRemove(env, k.id);
  await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(userId).run(); // el resto se borra en cascada
  return json({ ok: true });
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
// Horas de un día abierto: las personalizadas por Yohi (JSON) o las de la plantilla de su modo.
function slotsOf(row) {
  if (row && row.slots) { try { const a = JSON.parse(row.slots); if (Array.isArray(a)) return a; } catch {} }
  return (row && SLOTS[row.mode]) || [];
}
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
      WHERE user_id = ? AND start_date <= ? AND end_date >= ? ORDER BY id DESC LIMIT 1`,
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
    "SELECT day, mode, sede, slots FROM open_days WHERE day >= ? AND day <= ? AND mode != 'closed' AND sede = ? ORDER BY day",
  ).bind(today, to, plan.sede).all();
  const { results: taken } = await env.DB.prepare(
    "SELECT day, time FROM bookings WHERE day >= ? AND day <= ? AND status IN ('requested','confirmed')",
  ).bind(today, to).all();
  const takenSet = new Set(taken.map((t) => `${t.day} ${t.time}`));
  const now = nowMs(env);
  const out = days.map((d) => ({
    day: d.day, mode: d.mode,
    slots: slotsOf(d).map((time) => ({ time, free: !takenSet.has(`${d.day} ${time}`) && slotMs(d.day, time) > now })),
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
  const open = await env.DB.prepare('SELECT mode, sede, slots FROM open_days WHERE day = ?').bind(day).first();
  if (!open || open.mode === 'closed' || open.sede !== plan.sede || !slotsOf(open).includes(time)) return fail(400, 'Ese horario no está disponible.');
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

// Google Calendar: nunca debe romper una reserva. Devuelve 'off' | 'ok' | 'error'.
async function gcalAdd(env, id) {
  if (!gcalConfigured(env)) return 'off';
  try {
    const r = await env.DB.prepare(
      `SELECT b.id, b.day, b.time, b.sede, b.status, b.gcal_event_id, u.name FROM bookings b JOIN users u ON u.id = b.user_id WHERE b.id = ?`,
    ).bind(id).first();
    if (!r || r.status !== 'confirmed' || r.gcal_event_id) return 'ok';
    const firstName = String(r.name || 'Alumno').trim().split(/\s+/)[0];
    const evId = await gcalCreate(env, { firstName, day: r.day, time: r.time, sedeName: SEDE_LABEL[r.sede] || r.sede, status: r.status });
    if (evId) await env.DB.prepare('UPDATE bookings SET gcal_event_id = ? WHERE id = ?').bind(evId, id).run();
    return 'ok';
  } catch (e) { console.error('gcal add', e.message); return 'error'; }
}
async function gcalRemove(env, id) {
  if (!gcalConfigured(env)) return 'off';
  try {
    const r = await env.DB.prepare('SELECT gcal_event_id FROM bookings WHERE id = ?').bind(id).first();
    if (r && r.gcal_event_id) {
      await gcalDelete(env, r.gcal_event_id);
      await env.DB.prepare('UPDATE bookings SET gcal_event_id = NULL WHERE id = ?').bind(id).run();
    }
    return 'ok';
  } catch (e) { console.error('gcal remove', e.message); return 'error'; }
}
const SEDE_LABEL = { quilpue: 'Quilpué', vina: 'Viña del Mar', quillota: 'Quillota' };
// Aviso por correo al alumno cuando Yohi confirma o mueve su hora. 'off' | 'ok' | 'error'
async function mailBooking(env, id, kind) {
  if (!mailConfigured(env)) return 'off';
  try {
    const r = await env.DB.prepare('SELECT b.day, b.time, b.sede, u.name, u.email FROM bookings b JOIN users u ON u.id = b.user_id WHERE b.id = ?').bind(id).first();
    if (!r || !r.email) return 'error';
    const msg = bookingEmail({ name: r.name, day: r.day, time: r.time, sedeName: 'Fitnex ' + (SEDE_LABEL[r.sede] || ''), kind, site: mailConfig(env).site });
    return await sendMail(env, { to: r.email, ...msg });
  } catch (e) { console.error('mailBooking', e.message); return 'error'; }
}

async function adminGcalSync(req, env) {
  if (!(await requireAdmin(req, env))) return fail(403, 'Sin permiso.');
  if (!gcalConfigured(env)) return fail(400, 'Google Calendar aún no está configurado.');
  const { results } = await env.DB.prepare("SELECT id FROM bookings WHERE status = 'confirmed' AND gcal_event_id IS NULL AND day >= ?").bind(todayCL(env)).all();
  let ok = 0, errors = 0;
  for (const r of results) { (await gcalAdd(env, r.id)) === 'ok' ? ok++ : errors++; }
  return json({ ok: true, synced: ok, errors });
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
  await gcalRemove(env, id);
  return json({ ok: true, returned: !late });
}

async function adminAgenda(req, env) {
  if (!(await requireAdmin(req, env))) return fail(403, 'Sin permiso.');
  const today = todayCL(env);
  const { results: days } = await env.DB.prepare('SELECT day, mode, sede, slots FROM open_days WHERE day >= ? ORDER BY day').bind(today).all();
  const { results: bookings } = await env.DB.prepare(
    `SELECT b.id, b.day, b.time, b.status, b.sede, u.name FROM bookings b JOIN users u ON u.id = b.user_id
      WHERE b.status IN ('requested','confirmed') AND b.day >= ? ORDER BY b.day, b.time`,
  ).bind(today).all();
  return json({ ok: true, today, days: days.map((d) => ({ day: d.day, mode: d.mode, sede: d.sede, custom: !!d.slots, slots: d.mode === 'closed' ? [] : slotsOf(d) })), bookings, gcal: gcalConfigured(env), mail: mailConfigured(env) });
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
  // Horas personalizadas (opcional). Sin `slots`, el día usa las horas de la plantilla.
  let slotsJson = null;
  if (b.slots !== undefined && b.slots !== null) {
    if (mode === 'closed') return fail(400, 'Un día cerrado no tiene horas.');
    if (!Array.isArray(b.slots) || b.slots.length < 1 || b.slots.length > 16) return fail(400, 'Deja entre 1 y 16 horas.');
    const list = [...new Set(b.slots.map(String))].sort();
    for (const t of list) {
      if (!/^\d\d:\d\d$/.test(t) || t < '06:00' || t > '22:00' || Number(t.slice(3)) > 59) return fail(400, 'Hora inválida: ' + t + '. Usa entre 06:00 y 22:00.');
    }
    const { results: act } = await env.DB.prepare("SELECT time FROM bookings WHERE day = ? AND status IN ('requested','confirmed')").bind(b.day).all();
    const lost = act.filter((x) => !list.includes(x.time));
    if (lost.length) return fail(409, 'La hora ' + lost[0].time + ' ya está pedida. Respóndela o cancélala antes de quitarla.');
    slotsJson = JSON.stringify(list);
  }
  await env.DB.prepare('INSERT INTO open_days (day, mode, sede, slots) VALUES (?, ?, ?, ?) ON CONFLICT(day) DO UPDATE SET mode = excluded.mode, sede = excluded.sede, slots = excluded.slots').bind(b.day, mode, sede, slotsJson).run();
  return json({ ok: true });
}

// Yohi mueve una reserva (pedida o confirmada) a otra hora libre. No gasta sesiones: sigue siendo la misma reserva.
async function adminMoveBooking(env, id, day, time) {
  if (!Number.isInteger(id) || !validDate(day) || !/^\d\d:\d\d$/.test(time)) return fail(400, 'Elige el día y la hora nuevos.');
  const bk = await env.DB.prepare("SELECT id, day, time, sede, status FROM bookings WHERE id = ? AND status IN ('requested','confirmed')").bind(id).first();
  if (!bk) return fail(404, 'La reserva ya no está activa.');
  if (bk.day === day && bk.time === time) return fail(400, 'Esa ya es la hora de la reserva.');
  const open = await env.DB.prepare('SELECT mode, sede, slots FROM open_days WHERE day = ?').bind(day).first();
  if (!open || open.mode === 'closed' || !slotsOf(open).includes(time)) return fail(400, 'Ese día u hora no está abierto. Ábrelo primero en el calendario.');
  if (slotMs(day, time) <= nowMs(env)) return fail(400, 'Esa hora ya pasó.');
  const taken = await env.DB.prepare("SELECT id FROM bookings WHERE day = ? AND time = ? AND status IN ('requested','confirmed') AND id != ?").bind(day, time, id).first();
  if (taken) return fail(409, 'Esa hora ya está tomada.');
  try {
    await env.DB.prepare("UPDATE bookings SET day = ?, time = ?, sede = ? WHERE id = ? AND status IN ('requested','confirmed')").bind(day, time, open.sede, id).run();
  } catch { return fail(409, 'Esa hora acaba de ser tomada. Elige otra.'); }
  // Google Calendar: el evento viejo se borra y se crea uno nuevo en la hora nueva.
  let gcal = 'off';
  let mail = 'off';
  if (bk.status === 'confirmed') { gcal = await gcalRemove(env, id); if (gcal !== 'error') gcal = await gcalAdd(env, id); mail = await mailBooking(env, id, 'moved'); }
  return json({ ok: true, gcal, mail });
}

async function adminBooking(req, env) {
  if (!(await requireAdmin(req, env))) return fail(403, 'Sin permiso.');
  const b = await readBody(req);
  const id = Number(b && b.id);
  if (b && b.action === 'move') return adminMoveBooking(env, id, String(b.day || ''), String(b.time || ''));
  const next = { confirm: 'confirmed', reject: 'rejected', cancel: 'cancelled' }[b && b.action];
  if (!Number.isInteger(id) || !next) return fail(400, 'Solicitud inválida.');
  const from = next === 'confirmed' ? "status = 'requested'" : "status IN ('requested','confirmed')";
  const r = await env.DB.prepare(`UPDATE bookings SET status = ?, decided_at = ? WHERE id = ? AND ${from}`).bind(next, isoNow(), id).run();
  const row = await env.DB.prepare('SELECT status FROM bookings WHERE id = ?').bind(id).first();
  if (!row || row.status !== next) return fail(404, 'La reserva ya no está en ese estado.');
  const gcal = next === 'confirmed' ? await gcalAdd(env, id) : await gcalRemove(env, id);
  const mail = next === 'confirmed' ? await mailBooking(env, id, 'confirmed') : 'off';
  return json({ ok: true, gcal, mail });
}

/* ---------- mediciones (datos de salud: solo con autorización expresa) ---------- */
const num = (v, min, max) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= min && n <= max ? Math.round(n * 10) / 10 : NaN;
};

async function myMeasurements(req, env) {
  const user = await currentUser(req, env);
  if (!user) return fail(401, 'No has iniciado sesión.');
  if (!user.health_consent_at) return json({ ok: true, enabled: false, items: [] });
  const { results } = await env.DB.prepare(
    'SELECT id, measured_on, weight_kg, fat_pct, muscle_kg, (pdf_name IS NOT NULL) AS has_pdf, extra FROM measurements WHERE user_id = ? ORDER BY measured_on, id',
  ).bind(user.id).all();
  return json({ ok: true, enabled: true, items: results.map(withExtra) });
}

// El alumno activa o retira su autorización. Al retirarla se borran sus mediciones.
async function setHealthConsent(req, env) {
  const user = await currentUser(req, env);
  if (!user || user.role !== 'student') return fail(401, 'No has iniciado sesión.');
  const b = await readBody(req);
  if (!b || typeof b.enabled !== 'boolean') return fail(400, 'Solicitud inválida.');
  if (b.enabled) {
    await env.DB.prepare('UPDATE users SET health_consent_at = ? WHERE id = ? AND health_consent_at IS NULL').bind(isoNow(), user.id).run();
  } else {
    await env.DB.batch([
      env.DB.prepare('UPDATE users SET health_consent_at = NULL WHERE id = ?').bind(user.id),
      env.DB.prepare('DELETE FROM measurements WHERE user_id = ?').bind(user.id),
    ]);
  }
  return json({ ok: true });
}

async function adminMeasurements(req, env, url) {
  if (!(await requireAdmin(req, env))) return fail(403, 'Sin permiso.');
  const userId = Number(url.searchParams.get('userId'));
  if (!Number.isInteger(userId)) return fail(400, 'Alumno inválido.');
  const u = await env.DB.prepare("SELECT health_consent_at FROM users WHERE id = ? AND role = 'student'").bind(userId).first();
  if (!u) return fail(404, 'No se encontró el alumno.');
  if (!u.health_consent_at) return json({ ok: true, enabled: false, items: [] });
  const { results } = await env.DB.prepare(
    'SELECT id, measured_on, weight_kg, fat_pct, muscle_kg, (pdf_name IS NOT NULL) AS has_pdf, extra FROM measurements WHERE user_id = ? ORDER BY measured_on DESC, id DESC',
  ).bind(userId).all();
  return json({ ok: true, enabled: true, items: results.map(withExtra) });
}

const EXTRA_KEYS = ['fat_kg', 'water_kg', 'protein_kg', 'bone_kg', 'skeletal_kg', 'lean_kg', 'bmi', 'visceral', 'bmr', 'body_age', 'score', 'subcut_pct', 'whr', 'asmi', 'target_kg'];
const RANGE_KEYS = ['weight', 'muscle', 'fat', 'water', 'protein', 'skeletal'];
// Solo se guardan números conocidos y rangos [mínimo, máximo]; cualquier otra cosa se descarta.
function cleanExtra(raw) {
  let o = raw;
  if (typeof raw === 'string') { if (!raw.trim() || raw.length > 4000) return null; try { o = JSON.parse(raw); } catch { return null; } }
  if (!o || typeof o !== 'object') return null;
  const out = {};
  for (const k of EXTRA_KEYS) {
    const v = Number(o[k]);
    if (o[k] !== null && o[k] !== undefined && o[k] !== '' && Number.isFinite(v) && v >= 0 && v <= 20000) out[k] = Math.round(v * 100) / 100;
  }
  if (o.ranges && typeof o.ranges === 'object') {
    const r = {};
    for (const k of RANGE_KEYS) {
      const a = o.ranges[k];
      if (Array.isArray(a) && a.length === 2 && a.every((x) => Number.isFinite(Number(x)))) {
        const lo = Number(a[0]), hi = Number(a[1]);
        if (lo >= 0 && hi > lo && hi <= 20000) r[k] = [lo, hi];
      }
    }
    if (Object.keys(r).length) out.ranges = r;
  }
  return Object.keys(out).length ? out : null;
}
function withExtra(row) {
  let extra = null;
  try { extra = row.extra ? JSON.parse(row.extra) : null; } catch { extra = null; }
  return { ...row, extra, has_pdf: !!row.has_pdf };
}

const PDF_MAX = 4 * 1024 * 1024; // 4 MB
const CHUNK = 500000; // bytes por trozo (base64 ≈ 667 KB, bajo el límite de la base)
function bytesToB64(u8) {
  let out = '';
  for (let i = 0; i < u8.length; i += 0x8000) out += String.fromCharCode(...u8.subarray(i, i + 0x8000));
  return btoa(out);
}

async function adminAddMeasurement(req, env) {
  if (!(await requireAdmin(req, env))) return fail(403, 'Sin permiso.');
  const ct = req.headers.get('content-type') || '';
  let b, file = null;
  if (ct.includes('multipart/form-data')) {
    if (Number(req.headers.get('content-length') || 0) > PDF_MAX + 100000) return fail(413, 'El archivo pesa más de 4 MB.');
    let fd;
    try { fd = await req.formData(); } catch { return fail(400, 'Solicitud inválida.'); }
    b = Object.fromEntries([...fd.entries()].filter(([, v]) => typeof v === 'string'));
    const f = fd.get('pdf');
    if (f && typeof f !== 'string' && f.size > 0) file = f;
  } else {
    b = await readBody(req);
  }
  if (!b) return fail(400, 'Solicitud inválida.');
  const userId = Number(b.userId);
  if (!Number.isInteger(userId)) return fail(400, 'Alumno inválido.');
  const date = String(b.date || '');
  if (!validDate(date) || date > todayCL(env)) return fail(400, 'Fecha inválida (no puede ser futura).');
  const w = num(b.weight_kg, 20, 300), f = num(b.fat_pct, 2, 70), m = num(b.muscle_kg, 5, 150);
  if ([w, f, m].some(Number.isNaN)) return fail(400, 'Revisa los valores: peso 20–300 kg, grasa 2–70 %, músculo 5–150 kg.');
  const extra = cleanExtra(b.extra);
  if (w === null && f === null && m === null && !file && !extra) return fail(400, 'Ingresa al menos un valor o sube el informe.');
  let bytes = null;
  if (file) {
    if (file.size > PDF_MAX) return fail(400, 'El archivo pesa más de 4 MB.');
    bytes = new Uint8Array(await file.arrayBuffer());
    if (!fileKind(bytes)) return fail(400, 'El archivo debe ser una imagen (JPG o PNG) o un PDF.');
  }
  const u = await env.DB.prepare("SELECT health_consent_at FROM users WHERE id = ? AND role = 'student' AND status = 'active'").bind(userId).first();
  if (!u) return fail(404, 'No se encontró el alumno.');
  if (!u.health_consent_at) return fail(403, 'Este alumno no ha autorizado el registro de datos de salud.');
  const name = file ? String(file.name || 'informe').replace(/[^\w.\- ]/g, '_').slice(0, 80) : null;
  const ins = await env.DB.prepare('INSERT INTO measurements (user_id, measured_on, weight_kg, fat_pct, muscle_kg, pdf_name, extra) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(userId, date, w, f, m, name, extra ? JSON.stringify(extra) : null).run();
  if (bytes) {
    const mid = ins.meta && ins.meta.last_row_id;
    try {
      const stmts = [];
      for (let i = 0, seq = 0; i < bytes.length; i += CHUNK, seq++) {
        stmts.push(env.DB.prepare('INSERT INTO pdf_chunks (measurement_id, seq, data) VALUES (?, ?, ?)').bind(mid, seq, bytesToB64(bytes.subarray(i, i + CHUNK))));
      }
      await env.DB.batch(stmts);
    } catch (e) {
      await env.DB.prepare('DELETE FROM measurements WHERE id = ?').bind(mid).run();
      return fail(500, 'No se pudo guardar el archivo. Intenta de nuevo.');
    }
  }
  return json({ ok: true });
}

// Tipos de archivo aceptados para el informe, reconocidos por sus primeros bytes (no por el nombre).
const FILE_KINDS = { pdf: { type: 'application/pdf', ext: 'pdf' }, jpg: { type: 'image/jpeg', ext: 'jpg' }, png: { type: 'image/png', ext: 'png' } };
function fileKind(b) {
  if (b.length > 4 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46 && b[4] === 0x2d) return FILE_KINDS.pdf;
  if (b.length > 2 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return FILE_KINDS.jpg;
  if (b.length > 7 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return FILE_KINDS.png;
  return null;
}

// Descarga del informe (PDF o imagen): solo la dueña (con su autorización de salud vigente) o Yohi.
async function measurementPdf(req, env, url) {
  const user = await currentUser(req, env);
  if (!user) return fail(401, 'No has iniciado sesión.');
  const id = Number(url.searchParams.get('id'));
  if (!Number.isInteger(id)) return fail(400, 'Solicitud inválida.');
  const row = await env.DB.prepare('SELECT m.user_id, m.measured_on, m.pdf_name, u.health_consent_at FROM measurements m JOIN users u ON u.id = m.user_id WHERE m.id = ?').bind(id).first();
  if (!row || !row.pdf_name) return fail(404, 'No encontrado.');
  const isOwner = row.user_id === user.id && !!row.health_consent_at;
  if (!isOwner && user.role !== 'admin') return fail(404, 'No encontrado.');
  const { results } = await env.DB.prepare('SELECT data FROM pdf_chunks WHERE measurement_id = ? ORDER BY seq').bind(id).all();
  const parts = results.map((r) => Uint8Array.from(atob(r.data), (c) => c.charCodeAt(0)));
  const body = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let off = 0;
  for (const p of parts) { body.set(p, off); off += p.length; }
  const kind = fileKind(body) || FILE_KINDS.pdf;
  return new Response(body, {
    headers: {
      'content-type': kind.type,
      'content-disposition': `inline; filename="bodypro-${row.measured_on}.${kind.ext}"`,
      'cache-control': 'private, no-store',
      'x-content-type-options': 'nosniff',
      'content-security-policy': 'sandbox',
    },
  });
}

async function adminDeleteMeasurement(req, env) {
  if (!(await requireAdmin(req, env))) return fail(403, 'Sin permiso.');
  const b = await readBody(req);
  const id = Number(b && b.id);
  if (!Number.isInteger(id)) return fail(400, 'Solicitud inválida.');
  await env.DB.prepare('DELETE FROM measurements WHERE id = ?').bind(id).run();
  return json({ ok: true });
}

/* ---------- rutinas y registro de entrenamiento ---------- */

// Admin: crear o actualizar la rutina semanal de un alumno.
// Body: { userId, weekOf, name?, exercises: [{ name, sets, reps, restSec, warmupSets, notes, load, unit: 'kg'|'lbs' }] }
async function adminRoutine(req, env) {
  if (!(await requireAdmin(req, env))) return fail(403, 'Sin permiso.');
  const b = await readBody(req);
  if (!b) return fail(400, 'Solicitud inválida.');
  const userId = Number(b.userId);
  if (!Number.isInteger(userId)) return fail(400, 'Alumno inválido.');
  const weekOf = String(b.weekOf || '');
  if (!validDate(weekOf)) return fail(400, 'Fecha de semana inválida.');
  const user = await env.DB.prepare("SELECT id FROM users WHERE id = ? AND role = 'student' AND status = 'active'").bind(userId).first();
  if (!user) return fail(404, 'No se encontró el alumno.');
  const exs = b.exercises;
  if (!Array.isArray(exs) || exs.length === 0 || exs.length > 60) return fail(400, 'Envía entre 1 y 60 ejercicios.');
  for (const ex of exs) {
    if (!ex.name || String(ex.name).trim().length < 2) return fail(400, 'Cada ejercicio necesita un nombre.');
  }
  const name = String(b.name || '').trim().slice(0, 120);

  // Upsert: si ya existe rutina para esa semana, la actualiza. Los ejercicios que siguen (mismo nombre y día)
  // conservan su id, así lo que el alumno ya registró (series y observaciones) no se pierde al corregir la rutina.
  // Rutina diaria: week_of guarda la fecha del día y day_on la marca como diaria (NULL = semanal).
  const dayOn = b.daily ? weekOf : null;
  let routine = await env.DB.prepare('SELECT id, day_on FROM routines WHERE user_id = ? AND week_of = ?').bind(userId, weekOf).first();
  if (routine && (routine.day_on || null) !== dayOn) {
    return fail(409, dayOn
      ? 'Ese lunes ya tiene la rutina semanal. Agrega ese día dentro de la semanal (campo «Día»).'
      : 'Ese día ya tiene una rutina diaria. Elige otro lunes o edita la diaria.');
  }
  if (routine) {
    await env.DB.prepare('UPDATE routines SET name = ? WHERE id = ?').bind(name, routine.id).run();
  } else {
    await env.DB.prepare('INSERT INTO routines (user_id, week_of, name, day_on) VALUES (?, ?, ?, ?)').bind(userId, weekOf, name, dayOn).run();
    routine = await env.DB.prepare('SELECT id FROM routines WHERE user_id = ? AND week_of = ?').bind(userId, weekOf).first();
  }
  const { results: old } = await env.DB.prepare('SELECT id, name, day FROM routine_exercises WHERE routine_id = ?').bind(routine.id).all();
  const keyOf = (n, d) => String(n).trim().toLowerCase() + '|' + String(d || '').trim().toLowerCase();
  // 1) Si el editor manda el id del ejercicio (porque se está editando una rutina existente), se conserva aunque cambie
  //    el nombre del día o del ejercicio: así no se pierden los registros del alumno.
  const oldIds = new Set(old.map((o) => o.id));
  const keep = new Set();
  const assigned = exs.map((ex) => { const w = Number(ex.id); if (Number.isInteger(w) && oldIds.has(w) && !keep.has(w)) { keep.add(w); return w; } return null; });
  // 2) Los demás se emparejan por nombre y día, como antes.
  const pool = new Map();
  for (const o of old) { if (keep.has(o.id)) continue; const k = keyOf(o.name, o.day); if (!pool.has(k)) pool.set(k, []); pool.get(k).push(o.id); }
  const stmts = [];
  exs.forEach((ex, i) => {
    const vals = [
      String(ex.name).trim().slice(0, 120),
      Math.max(1, Math.min(20, Number(ex.sets) || 3)),
      String(ex.reps || '8-12').slice(0, 20),
      Math.max(0, Math.min(600, Number(ex.restSec) || 90)),
      ex.warmupSets == null || ex.warmupSets === '' ? 1 : Math.max(0, Math.min(10, Number(ex.warmupSets) || 0)),
      String(ex.day || '').trim().slice(0, 30),
      String(ex.notes || '').slice(0, 300),
      String(ex.load == null ? '' : ex.load).trim().slice(0, 20),
      ex.unit === 'lbs' ? 'lbs' : 'kg',
    ];
    let id = assigned[i];
    if (id == null) { const ids = pool.get(keyOf(ex.name, ex.day)); if (ids && ids.length) { id = ids.shift(); keep.add(id); } }
    if (id != null) {
      stmts.push(env.DB.prepare('UPDATE routine_exercises SET pos = ?, name = ?, sets = ?, reps = ?, rest_sec = ?, warmup_sets = ?, day = ?, notes = ?, target_load = ?, unit = ? WHERE id = ?').bind(i, ...vals, id));
    } else {
      stmts.push(env.DB.prepare('INSERT INTO routine_exercises (routine_id, pos, name, sets, reps, rest_sec, warmup_sets, day, notes, target_load, unit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(routine.id, i, ...vals));
    }
  });
  for (const o of old) if (!keep.has(o.id)) stmts.push(env.DB.prepare('DELETE FROM routine_exercises WHERE id = ?').bind(o.id));
  await env.DB.batch(stmts);
  return json({ ok: true, routineId: routine.id });
}

// Admin: borrar rutina
async function adminDeleteRoutine(req, env) {
  if (!(await requireAdmin(req, env))) return fail(403, 'Sin permiso.');
  const b = await readBody(req);
  const id = Number(b && b.id);
  if (!Number.isInteger(id)) return fail(400, 'Solicitud inválida.');
  await env.DB.prepare('DELETE FROM routines WHERE id = ?').bind(id).run();
  return json({ ok: true });
}

// Admin: listar rutinas de un alumno
async function adminRoutines(req, env, url) {
  if (!(await requireAdmin(req, env))) return fail(403, 'Sin permiso.');
  const userId = Number(url.searchParams.get('userId'));
  if (!Number.isInteger(userId)) return fail(400, 'Alumno inválido.');
  const { results: routines } = await env.DB.prepare(
    'SELECT id, week_of, name, day_on, created_at FROM routines WHERE user_id = ? ORDER BY week_of DESC LIMIT 20',
  ).bind(userId).all();
  return json({ ok: true, routines });
}

// Admin: ver ejercicios de una rutina
async function adminRoutineDetail(req, env, url) {
  if (!(await requireAdmin(req, env))) return fail(403, 'Sin permiso.');
  const id = Number(url.searchParams.get('id'));
  if (!Number.isInteger(id)) return fail(400, 'Solicitud inválida.');
  const routine = await env.DB.prepare('SELECT id, user_id, week_of, name, day_on FROM routines WHERE id = ?').bind(id).first();
  if (!routine) return fail(404, 'Rutina no encontrada.');
  const { results: exercises } = await env.DB.prepare(
    'SELECT id, pos, name, sets, reps, rest_sec, warmup_sets, day, notes, target_load, unit FROM routine_exercises WHERE routine_id = ? ORDER BY pos',
  ).bind(id).all();
  return json({ ok: true, routine, exercises });
}

// Admin: ver logs de entrenamiento de un alumno (para seguimiento)
async function adminTrainingLogs(req, env, url) {
  if (!(await requireAdmin(req, env))) return fail(403, 'Sin permiso.');
  const userId = Number(url.searchParams.get('userId'));
  if (!Number.isInteger(userId)) return fail(400, 'Alumno inválido.');
  const weekOf = url.searchParams.get('weekOf') || '';
  if (weekOf && !validDate(weekOf)) return fail(400, 'Fecha inválida.');
  let logs;
  if (weekOf) {
    const weekEnd = addDays(weekOf, 6);
    ({ results: logs } = await env.DB.prepare(
      `SELECT tl.id, tl.exercise_id, tl.logged_on, tl.set_type, tl.set_num, tl.kg, tl.reps, tl.rir, re.name AS exercise_name, re.unit AS unit
         FROM training_logs tl JOIN routine_exercises re ON re.id = tl.exercise_id
        WHERE tl.user_id = ? AND tl.logged_on >= ? AND tl.logged_on <= ?
        ORDER BY tl.logged_on, re.pos, tl.set_type DESC, tl.set_num`,
    ).bind(userId, weekOf, weekEnd).all());
  } else {
    ({ results: logs } = await env.DB.prepare(
      `SELECT tl.id, tl.exercise_id, tl.logged_on, tl.set_type, tl.set_num, tl.kg, tl.reps, tl.rir, re.name AS exercise_name, re.unit AS unit
         FROM training_logs tl JOIN routine_exercises re ON re.id = tl.exercise_id
        WHERE tl.user_id = ? ORDER BY tl.logged_on DESC, re.pos, tl.set_type DESC, tl.set_num LIMIT 200`,
    ).bind(userId).all());
  }
  // Observaciones del alumno en el mismo período
  let notes;
  if (weekOf) {
    ({ results: notes } = await env.DB.prepare(
      'SELECT exercise_id, logged_on, note FROM training_notes WHERE user_id = ? AND logged_on >= ? AND logged_on <= ? ORDER BY logged_on',
    ).bind(userId, weekOf, addDays(weekOf, 6)).all());
  } else {
    ({ results: notes } = await env.DB.prepare(
      'SELECT exercise_id, logged_on, note FROM training_notes WHERE user_id = ? ORDER BY logged_on DESC LIMIT 200',
    ).bind(userId).all());
  }
  return json({ ok: true, logs, notes });
}

// Alumno: obtener su rutina de la semana actual (o una semana específica)
async function myRoutine(req, env, url) {
  const user = await currentUser(req, env);
  if (!user) return fail(401, 'No has iniciado sesión.');
  let weekOf = url.searchParams.get('weekOf') || '';
  if (!weekOf) {
    // Calcular el lunes de la semana actual en hora de Chile
    const now = new Date(nowMs(env));
    const parts = tzParts(nowMs(env));
    const d = new Date(parts.day + 'T12:00:00Z');
    const dow = d.getUTCDay(); // 0=dom, 1=lun...
    const diff = dow === 0 ? -6 : 1 - dow;
    d.setUTCDate(d.getUTCDate() + diff);
    weekOf = d.toISOString().slice(0, 10);
  }
  if (!validDate(weekOf)) return fail(400, 'Fecha inválida.');
  let routine = await env.DB.prepare('SELECT id, week_of, name, day_on FROM routines WHERE user_id = ? AND week_of = ?').bind(user.id, weekOf).first();
  // Sin semanal esta semana: si hay una rutina diaria para hoy, mostrar esa.
  if (!routine && !url.searchParams.get('weekOf')) {
    routine = await env.DB.prepare('SELECT id, week_of, name, day_on FROM routines WHERE user_id = ? AND day_on = ?').bind(user.id, todayCL(env)).first();
    if (routine) weekOf = routine.week_of;
  }
  if (!routine) return json({ ok: true, routine: null, exercises: [], logs: [] });
  const { results: exercises } = await env.DB.prepare(
    'SELECT id, pos, name, sets, reps, rest_sec, warmup_sets, day, notes, target_load, unit FROM routine_exercises WHERE routine_id = ? ORDER BY pos',
  ).bind(routine.id).all();
  // También traer los logs del alumno para esta semana
  const weekEnd = addDays(weekOf, 6);
  const { results: logs } = await env.DB.prepare(
    `SELECT id, exercise_id, logged_on, set_type, set_num, kg, reps, rir
       FROM training_logs WHERE user_id = ? AND logged_on >= ? AND logged_on <= ?
      ORDER BY exercise_id, set_type DESC, set_num`,
  ).bind(user.id, weekOf, weekEnd).all();
  const { results: notes } = await env.DB.prepare(
    'SELECT exercise_id, logged_on, note FROM training_notes WHERE user_id = ? AND logged_on >= ? AND logged_on <= ? ORDER BY logged_on',
  ).bind(user.id, weekOf, weekEnd).all();
  return json({ ok: true, routine, exercises, logs, notes });
}

// Alumno: listar semanas disponibles con rutina
async function myRoutineWeeks(req, env) {
  const user = await currentUser(req, env);
  if (!user) return fail(401, 'No has iniciado sesión.');
  const { results } = await env.DB.prepare(
    'SELECT week_of, name, day_on FROM routines WHERE user_id = ? ORDER BY week_of DESC LIMIT 30',
  ).bind(user.id).all();
  return json({ ok: true, weeks: results });
}

// Alumno: registrar un set (o varios sets de un ejercicio a la vez)
// Body: { exerciseId, loggedOn, sets: [{ setType, setNum, kg, reps, rir }] }
// Guarda series/observación de un ejercicio para un alumno (la usan el alumno y Yohi).
async function saveLog(env, userId, b) {
  if (!b) return fail(400, 'Solicitud inválida.');
  const exerciseId = Number(b.exerciseId);
  if (!Number.isInteger(exerciseId)) return fail(400, 'Ejercicio inválido.');
  const loggedOn = String(b.loggedOn || todayCL(env));
  if (!validDate(loggedOn)) return fail(400, 'Fecha inválida.');
  // Verificar que el ejercicio pertenece a una rutina de este alumno
  const ex = await env.DB.prepare(
    `SELECT re.id FROM routine_exercises re JOIN routines r ON r.id = re.routine_id
      WHERE re.id = ? AND r.user_id = ?`,
  ).bind(exerciseId, userId).first();
  if (!ex) return fail(404, 'Ejercicio no encontrado en la rutina.');
  const sets = b.sets == null ? [] : b.sets;
  const note = String(b.note || '').trim().slice(0, 500);
  if (!Array.isArray(sets) || sets.length > 25) return fail(400, 'Envía hasta 25 series.');
  if (sets.length === 0 && b.note === undefined && !b.clearSets) return fail(400, 'Llena al menos una serie o escribe una observación.');
  const stmts = [];
  // Observación del alumno: una por ejercicio y fecha; vacía la borra.
  if (b.note !== undefined) {
    stmts.push(note
      ? env.DB.prepare(`INSERT INTO training_notes (user_id, exercise_id, logged_on, note) VALUES (?, ?, ?, ?)
          ON CONFLICT(user_id, exercise_id, logged_on) DO UPDATE SET note = excluded.note, updated_at = datetime('now')`).bind(userId, exerciseId, loggedOn, note)
      : env.DB.prepare('DELETE FROM training_notes WHERE user_id = ? AND exercise_id = ? AND logged_on = ?').bind(userId, exerciseId, loggedOn));
  }
  // Si vienen series (o se pide limpiar): borrar logs anteriores de este ejercicio en esta fecha y recrear.
  if (sets.length || b.clearSets) stmts.push(
    env.DB.prepare('DELETE FROM training_logs WHERE user_id = ? AND exercise_id = ? AND logged_on = ?').bind(userId, exerciseId, loggedOn));
  for (const s of sets) {
    const setType = s.setType === 'warmup' ? 'warmup' : 'work';
    const setNum = Math.max(1, Math.min(25, Number(s.setNum) || 1));
    const kg = s.kg != null && s.kg !== '' ? Math.max(0, Math.min(999, Number(s.kg) || 0)) : null;
    const reps = s.reps != null && s.reps !== '' ? Math.max(0, Math.min(200, Number(s.reps) || 0)) : null;
    const rir = s.rir != null && s.rir !== '' ? Math.max(0, Math.min(10, Number(s.rir) || 0)) : null;
    stmts.push(env.DB.prepare(
      'INSERT INTO training_logs (user_id, exercise_id, logged_on, set_type, set_num, kg, reps, rir) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    ).bind(userId, exerciseId, loggedOn, setType, setNum, kg, reps, rir));
  }
  await env.DB.batch(stmts);
  return json({ ok: true });
}

async function logSet(req, env) {
  const user = await currentUser(req, env);
  if (!user) return fail(401, 'No has iniciado sesión.');
  const b = await readBody(req);
  if (b) delete b.clearSets; // solo Yohi puede vaciar series
  return saveLog(env, user.id, b);
}

// Yohi registra o corrige pesos en la ficha de un alumno.
async function adminLogSet(req, env) {
  if (!(await requireAdmin(req, env))) return fail(403, 'Sin permiso.');
  const b = await readBody(req);
  const userId = Number(b && b.userId);
  if (!Number.isInteger(userId)) return fail(400, 'Alumno inválido.');
  return saveLog(env, userId, b);
}

// Alumno: ver progreso de un ejercicio a lo largo de las semanas
async function exerciseProgress(req, env, url) {
  const user = await currentUser(req, env);
  if (!user) return fail(401, 'No has iniciado sesión.');
  const exName = url.searchParams.get('name') || '';
  if (!exName) return fail(400, 'Nombre del ejercicio requerido.');
  // Buscar todas las ocurrencias del ejercicio (por nombre) en las rutinas del alumno
  const { results } = await env.DB.prepare(
    `SELECT tl.logged_on, tl.set_num, tl.kg, tl.reps, tl.rir
       FROM training_logs tl
       JOIN routine_exercises re ON re.id = tl.exercise_id
       JOIN routines r ON r.id = re.routine_id
      WHERE r.user_id = ? AND re.name = ? AND tl.set_type = 'work'
      ORDER BY tl.logged_on, tl.set_num
      LIMIT 500`,
  ).bind(user.id, exName).all();
  // Agrupar por fecha y calcular volumen total (kg * reps)
  const byDate = {};
  for (const row of results) {
    if (!byDate[row.logged_on]) byDate[row.logged_on] = { sets: [], totalVol: 0, maxKg: 0 };
    const vol = (row.kg || 0) * (row.reps || 0);
    byDate[row.logged_on].sets.push(row);
    byDate[row.logged_on].totalVol += vol;
    if ((row.kg || 0) > byDate[row.logged_on].maxKg) byDate[row.logged_on].maxKg = row.kg || 0;
  }
  const progress = Object.entries(byDate).map(([date, d]) => ({
    date, totalVol: Math.round(d.totalVol), maxKg: d.maxKg, sets: d.sets.length,
  }));
  return json({ ok: true, exercise: exName, progress });
}

/* ---------- anamnesis (ficha de salud): la completan el alumno y Yohi ---------- */
const ANAM_FIELDS = ['goal', 'experience', 'injuries', 'health_history'];
async function anamState(env, userId) {
  const u = await env.DB.prepare("SELECT anamnesis_consent_at FROM users WHERE id = ? AND role = 'student'").bind(userId).first();
  if (!u) return null;
  if (!u.anamnesis_consent_at) return { ok: true, enabled: false, data: null };
  const row = await env.DB.prepare('SELECT goal, experience, injuries, health_history, updated_by, updated_at FROM anamnesis WHERE user_id = ?').bind(userId).first();
  return { ok: true, enabled: true, data: row || null };
}
async function anamSave(env, userId, b, by) {
  const u = await env.DB.prepare("SELECT anamnesis_consent_at FROM users WHERE id = ? AND role = 'student'").bind(userId).first();
  if (!u) return fail(404, 'No se encontró al alumno.');
  if (!u.anamnesis_consent_at) return fail(403, 'El alumno no ha autorizado su ficha de salud.');
  const v = {};
  for (const k of ANAM_FIELDS) v[k] = String((b && b[k]) || '').trim().slice(0, 800);
  await env.DB.prepare(
    `INSERT INTO anamnesis (user_id, goal, experience, injuries, health_history, updated_by, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(user_id) DO UPDATE SET goal = excluded.goal, experience = excluded.experience, injuries = excluded.injuries,
       health_history = excluded.health_history, updated_by = excluded.updated_by, updated_at = excluded.updated_at`,
  ).bind(userId, v.goal, v.experience, v.injuries, v.health_history, by).run();
  return json({ ok: true });
}
async function myAnamnesis(req, env) {
  const user = await currentUser(req, env);
  if (!user || user.role !== 'student') return fail(401, 'No has iniciado sesión.');
  return json(await anamState(env, user.id));
}
async function saveMyAnamnesis(req, env) {
  const user = await currentUser(req, env);
  if (!user || user.role !== 'student') return fail(401, 'No has iniciado sesión.');
  return anamSave(env, user.id, await readBody(req), 'student');
}
async function setAnamnesisConsent(req, env) {
  const user = await currentUser(req, env);
  if (!user || user.role !== 'student') return fail(401, 'No has iniciado sesión.');
  const b = await readBody(req);
  if (!b || typeof b.enabled !== 'boolean') return fail(400, 'Solicitud inválida.');
  if (b.enabled) {
    await env.DB.prepare('UPDATE users SET anamnesis_consent_at = ? WHERE id = ? AND anamnesis_consent_at IS NULL').bind(isoNow(), user.id).run();
  } else {
    await env.DB.batch([
      env.DB.prepare('UPDATE users SET anamnesis_consent_at = NULL WHERE id = ?').bind(user.id),
      env.DB.prepare('DELETE FROM anamnesis WHERE user_id = ?').bind(user.id),
    ]);
  }
  return json({ ok: true });
}
async function adminAnamnesis(req, env, url) {
  if (!(await requireAdmin(req, env))) return fail(403, 'Sin permiso.');
  const userId = Number(url.searchParams.get('userId'));
  if (!Number.isInteger(userId)) return fail(400, 'Alumno inválido.');
  const st = await anamState(env, userId);
  return st ? json(st) : fail(404, 'No se encontró al alumno.');
}
async function adminSaveAnamnesis(req, env) {
  if (!(await requireAdmin(req, env))) return fail(403, 'Sin permiso.');
  const b = await readBody(req);
  const userId = Number(b && b.userId);
  if (!Number.isInteger(userId)) return fail(400, 'Alumno inválido.');
  return anamSave(env, userId, b, 'coach');
}

/* ---------- notas e hitos de Yohi + progreso de kilos ---------- */
const NOTE_KINDS = ['note', 'milestone'];

// El alumno ve solo lo que Yohi marcó como visible.
async function myNotes(req, env) {
  const user = await currentUser(req, env);
  if (!user) return fail(401, 'No has iniciado sesión.');
  const { results } = await env.DB.prepare(
    'SELECT id, kind, title, body, created_at FROM coach_notes WHERE user_id = ? AND visible = 1 ORDER BY id DESC LIMIT 50',
  ).bind(user.id).all();
  return json({ ok: true, notes: results });
}
async function adminNotes(req, env, url) {
  if (!(await requireAdmin(req, env))) return fail(403, 'Sin permiso.');
  const userId = Number(url.searchParams.get('userId'));
  if (!Number.isInteger(userId)) return fail(400, 'Alumno inválido.');
  const { results } = await env.DB.prepare(
    'SELECT id, kind, title, body, visible, created_at FROM coach_notes WHERE user_id = ? ORDER BY id DESC LIMIT 200',
  ).bind(userId).all();
  return json({ ok: true, notes: results });
}
async function adminAddNote(req, env) {
  if (!(await requireAdmin(req, env))) return fail(403, 'Sin permiso.');
  const b = await readBody(req);
  if (!b) return fail(400, 'Solicitud inválida.');
  const userId = Number(b.userId);
  const kind = NOTE_KINDS.includes(b.kind) ? b.kind : 'note';
  const title = String(b.title || '').trim().slice(0, 120);
  const body = String(b.body || '').trim().slice(0, 1500);
  if (!Number.isInteger(userId)) return fail(400, 'Alumno inválido.');
  if (!title) return fail(400, 'Escribe un título.');
  const u = await env.DB.prepare("SELECT id FROM users WHERE id = ? AND role = 'student'").bind(userId).first();
  if (!u) return fail(404, 'No se encontró al alumno.');
  await env.DB.prepare('INSERT INTO coach_notes (user_id, kind, title, body, visible) VALUES (?, ?, ?, ?, ?)')
    .bind(userId, kind, title, body, b.visible === false ? 0 : 1).run();
  return json({ ok: true });
}
async function adminDeleteNote(req, env) {
  if (!(await requireAdmin(req, env))) return fail(403, 'Sin permiso.');
  const b = await readBody(req);
  const id = Number(b && b.id);
  if (!Number.isInteger(id)) return fail(400, 'Nota inválida.');
  await env.DB.prepare('DELETE FROM coach_notes WHERE id = ?').bind(id).run();
  return json({ ok: true });
}

// Kilos de trabajo por ejercicio: mejor peso de cada semana (para el gráfico) y mejor marca (PR).
async function progressFor(env, userId) {
  const { results } = await env.DB.prepare(
    `SELECT re.name, re.unit, tl.logged_on, tl.kg, tl.reps
       FROM training_logs tl
       JOIN routine_exercises re ON re.id = tl.exercise_id
      WHERE tl.user_id = ? AND tl.set_type = 'work' AND tl.kg IS NOT NULL AND tl.kg > 0
      ORDER BY tl.logged_on LIMIT 3000`,
  ).bind(userId).all();
  const mondayOf = (iso) => { const [y, m, d] = iso.split('-').map(Number); const t = new Date(Date.UTC(y, m - 1, d, 12)); t.setUTCDate(t.getUTCDate() - ((t.getUTCDay() + 6) % 7)); return t.toISOString().slice(0, 10); };
  // Si Yohi cambió la unidad de un ejercicio (kg ↔ lbs), los registros antiguos se convierten a la unidad más reciente.
  const LB = 2.20462;
  const conv = (v, from, to) => (from === to ? v : Math.round((to === 'lbs' ? v * LB : v / LB) * 10) / 10);
  const lastUnit = new Map();
  for (const r of results) lastUnit.set(r.name.trim().toLowerCase(), r.unit === 'lbs' ? 'lbs' : 'kg');
  const by = new Map();
  for (const r of results) {
    const key = r.name.trim().toLowerCase();
    const unit = lastUnit.get(key);
    const kg = conv(r.kg, r.unit === 'lbs' ? 'lbs' : 'kg', unit);
    let e = by.get(key);
    if (!e) { e = { name: r.name.trim(), unit, weeks: new Map(), pr: null, last: '' }; by.set(key, e); }
    const wk = mondayOf(r.logged_on);
    e.weeks.set(wk, Math.max(e.weeks.get(wk) || 0, kg));
    if (!e.pr || kg > e.pr.kg || (kg === e.pr.kg && (r.reps || 0) > (e.pr.reps || 0))) e.pr = { kg, reps: r.reps, date: r.logged_on };
    e.last = r.logged_on;
  }
  const exercises = [...by.values()].sort((a, b) => (a.last < b.last ? 1 : -1)).map((e) => ({
    name: e.name, unit: e.unit, pr: e.pr, last: e.last, weeks: [...e.weeks.entries()].sort().map(([week, kg]) => ({ week, kg })),
  }));
  return { ok: true, exercises };
}
async function myProgress(req, env) {
  const user = await currentUser(req, env);
  if (!user) return fail(401, 'No has iniciado sesión.');
  return json(await progressFor(env, user.id));
}
async function adminProgress(req, env, url) {
  if (!(await requireAdmin(req, env))) return fail(403, 'Sin permiso.');
  const userId = Number(url.searchParams.get('userId'));
  if (!Number.isInteger(userId)) return fail(400, 'Alumno inválido.');
  return json(await progressFor(env, userId));
}

// Yohi corrige el plan de un alumno (cambiar modalidad, sede, sesiones o fechas) o lo renueva con uno nuevo.
async function adminPlan(req, env) {
  if (!(await requireAdmin(req, env))) return fail(403, 'Sin permiso.');
  const b = await readBody(req);
  if (!b) return fail(400, 'Solicitud inválida.');
  const userId = Number(b.userId), modality = b.modality, start = String(b.start || '');
  if (!Number.isInteger(userId)) return fail(400, 'Alumno inválido.');
  if (!['presencial', 'online'].includes(modality)) return fail(400, 'Elige la modalidad.');
  if (!validDate(start)) return fail(400, 'Fecha de inicio inválida.');
  const user = await env.DB.prepare("SELECT id FROM users WHERE id = ? AND role = 'student' AND status = 'active'").bind(userId).first();
  if (!user) return fail(404, 'No se encontró al alumno.');
  let sede = null, sessions = null, end;
  if (modality === 'presencial') {
    sede = b.sede;
    if (!SEDES.includes(sede)) return fail(400, 'Elige la sede.');
    sessions = Number(b.sessions);
    if (!Number.isInteger(sessions) || sessions < 1 || sessions > 40) return fail(400, 'Sesiones entre 1 y 40.');
    end = addDays(start, 27);
  } else {
    const months = Number(b.months || 1);
    if (![1, 3].includes(months)) return fail(400, 'Elige 1 o 3 meses.');
    end = addDays(addMonths(start, months), -1);
  }
  if (b.end) {
    if (!validDate(String(b.end)) || String(b.end) < start) return fail(400, 'La fecha de término no puede ser antes del inicio.');
    end = String(b.end);
  }
  const cur = await env.DB.prepare('SELECT id, modality FROM plans WHERE user_id = ? ORDER BY id DESC LIMIT 1').bind(userId).first();
  if (b.renew === true || !cur) {
    await env.DB.prepare('INSERT INTO plans (user_id, modality, sede, sessions_total, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?)').bind(userId, modality, sede, sessions, start, end).run();
    return json({ ok: true, end, renewed: true });
  }
  const today = todayCL(env);
  const { results: active } = await env.DB.prepare("SELECT id FROM bookings WHERE plan_id = ? AND status IN ('requested','confirmed') AND day >= ?").bind(cur.id, today).all();
  if (modality === 'presencial') {
    const used = await usedSessions(env, cur.id);
    if (sessions < used) return fail(400, `El alumno ya usó ${used} sesiones; no puede quedar con menos.`);
  } else if (active.length && b.cancelBookings !== true) {
    return fail(409, `Tiene ${active.length} hora(s) pedidas o confirmadas. Si pasa a online se cancelan y se devuelven.`);
  }
  const stmts = [env.DB.prepare('UPDATE plans SET modality = ?, sede = ?, sessions_total = ?, start_date = ?, end_date = ? WHERE id = ?').bind(modality, sede, sessions, start, end, cur.id)];
  if (modality === 'online' && active.length) {
    stmts.push(env.DB.prepare("UPDATE bookings SET status = 'cancelled', late_cancel = 0, decided_at = ? WHERE plan_id = ? AND status IN ('requested','confirmed') AND day >= ?").bind(isoNow(), cur.id, today));
  }
  await env.DB.batch(stmts);
  return json({ ok: true, end, cancelled: modality === 'online' ? active.length : 0 });
}

/* ---------- entrada ---------- */
export default {
  async fetch(req, env, ctx) {
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
        case 'GET /api/renewals': return await myRenewals(req, env);
        case 'POST /api/renewals': return await submitRenewal(req, env, ctx);
        case 'POST /api/renewals/cancel': return await cancelRenewal(req, env);
        case 'GET /api/renewals/file': return await renewalFile(req, env, url);
        case 'GET /api/admin/renewals': return await adminRenewals(req, env);
        case 'POST /api/admin/renewals/decide': return await adminDecideRenewal(req, env, ctx);
        case 'POST /api/admin/settings/bank': return await adminSaveBank(req, env);
        case 'POST /api/password/forgot': return await passwordForgot(req, env, ctx);
        case 'POST /api/password/reset': return await passwordReset(req, env);
        case 'GET /api/me': return await me(req, env);
        case 'POST /api/setup': return await setup(req, env);
        case 'GET /api/admin/pending': return await adminPending(req, env);
        case 'GET /api/admin/students': return await adminStudents(req, env);
        case 'POST /api/admin/approve': return await adminApprove(req, env);
        case 'POST /api/admin/reject': return await adminReject(req, env);
        case 'POST /api/admin/student/delete': return await adminDeleteStudent(req, env);
        case 'GET /api/notes': return await myNotes(req, env);
        case 'GET /api/anamnesis': return await myAnamnesis(req, env);
        case 'POST /api/anamnesis': return await saveMyAnamnesis(req, env);
        case 'POST /api/anamnesis/consent': return await setAnamnesisConsent(req, env);
        case 'GET /api/admin/anamnesis': return await adminAnamnesis(req, env, url);
        case 'POST /api/admin/anamnesis': return await adminSaveAnamnesis(req, env);
        case 'GET /api/progress': return await myProgress(req, env);
        case 'GET /api/admin/notes': return await adminNotes(req, env, url);
        case 'POST /api/admin/notes': return await adminAddNote(req, env);
        case 'POST /api/admin/notes/delete': return await adminDeleteNote(req, env);
        case 'GET /api/admin/progress': return await adminProgress(req, env, url);
        case 'GET /api/agenda': return await agenda(req, env);
        case 'POST /api/bookings': return await createBooking(req, env);
        case 'POST /api/bookings/cancel': return await cancelBooking(req, env);
        case 'GET /api/admin/agenda': return await adminAgenda(req, env);
        case 'POST /api/admin/open-day': return await adminOpenDay(req, env);
        case 'POST /api/admin/booking': return await adminBooking(req, env);
        case 'POST /api/admin/gcal-sync': return await adminGcalSync(req, env);
        case 'GET /api/measurements': return await myMeasurements(req, env);
        case 'POST /api/health-consent': return await setHealthConsent(req, env);
        case 'GET /api/measurements/pdf': return await measurementPdf(req, env, url);
        case 'GET /api/admin/measurements': return await adminMeasurements(req, env, url);
        case 'POST /api/admin/measurement': return await adminAddMeasurement(req, env);
        case 'POST /api/admin/measurement/delete': return await adminDeleteMeasurement(req, env);
        case 'POST /api/admin/plan': return await adminPlan(req, env);
        case 'POST /api/admin/routine': return await adminRoutine(req, env);
        case 'POST /api/admin/routine/delete': return await adminDeleteRoutine(req, env);
        case 'GET /api/admin/routines': return await adminRoutines(req, env, url);
        case 'GET /api/admin/routine': return await adminRoutineDetail(req, env, url);
        case 'POST /api/admin/training/log': return await adminLogSet(req, env);
        case 'GET /api/admin/training-logs': return await adminTrainingLogs(req, env, url);
        case 'GET /api/routine': return await myRoutine(req, env, url);
        case 'GET /api/routine/weeks': return await myRoutineWeeks(req, env);
        case 'POST /api/training/log': return await logSet(req, env);
        case 'GET /api/training/progress': return await exerciseProgress(req, env, url);
        default: return fail(404, 'No encontrado.');
      }
    } catch (err) {
      console.error('api error', err && err.message);
      return fail(500, 'Error interno. Intenta de nuevo.');
    }
  },
};
