// Carga datos DEMO FICTICIOS en el portal que corre en LOCAL (wrangler dev --local).
// Nunca se conecta a producción: se niega a correr si el destino no es localhost.
// Uso: node scripts/seed-demo.mjs [http://localhost:8787]
const BASE = process.argv[2] || 'http://localhost:8787';
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(BASE)) {
  console.error('Seed demo solo corre contra localhost. Destino rechazado:', BASE);
  process.exit(1);
}

export const DEMO = {
  adminEmail: 'yohi.demo@yohicoach.demo',
  adminPass: 'DemoAdmin-2026',
  studentName: 'Alumna Demo',
  studentEmail: 'alumna.demo@yohicoach.demo',
  studentPass: 'DemoAlumna-2026',
  setupToken: 'demo-setup-token',
};

// ---- fechas (zona Chile) ----
const fmt = (d) => d.toISOString().slice(0, 10);
const todayCL = () => {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date());
  return p; // YYYY-MM-DD
};
const add = (iso, n) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return fmt(d); };
const monday = (iso) => { const d = new Date(iso + 'T12:00:00Z'); const wd = (d.getUTCDay() + 6) % 7; return add(iso, -wd); };
const TODAY = todayCL();
const W0 = monday(TODAY); // semana actual
const W1 = add(W0, -7), W2 = add(W0, -14), W3 = add(W0, -21);

let cookie = '';
async function call(method, path, body, ip = '10.0.0.1') {
  const headers = { origin: BASE, 'cf-connecting-ip': ip };
  let payload;
  if (body instanceof FormData) payload = body;
  else if (body !== undefined) { headers['content-type'] = 'application/json'; payload = JSON.stringify(body); }
  if (cookie) headers.cookie = cookie;
  const res = await fetch(BASE + path, { method, headers, body: payload });
  const sc = res.headers.get('set-cookie');
  if (sc) cookie = sc.split(';')[0];
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}
const ok = (r, what) => { if (r.status >= 300) throw new Error(`${what} falló (${r.status}) ${JSON.stringify(r.data)}`); return r; };

// 1) Admin demo (primera vez) o ingreso
let r = await call('POST', '/api/setup', { token: DEMO.setupToken, name: 'Yohi Demo', email: DEMO.adminEmail, password: DEMO.adminPass });
if (r.status === 409) ok(await call('POST', '/api/login', { email: DEMO.adminEmail, password: DEMO.adminPass }), 'login admin');
else ok(r, 'setup');
if (r.status === 200 && !cookie) ok(await call('POST', '/api/login', { email: DEMO.adminEmail, password: DEMO.adminPass }), 'login admin');

// 2) Alumna demo: registro + aprobación con plan presencial
cookie = '';
await call('POST', '/api/signup', { name: DEMO.studentName, email: DEMO.studentEmail, password: DEMO.studentPass, consent: true });
ok(await call('POST', '/api/login', { email: DEMO.adminEmail, password: DEMO.adminPass }), 'login admin');
const pend = ok(await call('GET', '/api/admin/pending'), 'pendientes').data;
const pu = (pend.pending || pend.users || []).find((u) => u.email === DEMO.studentEmail);
const stu = ok(await call('GET', '/api/admin/students'), 'alumnos').data;
let sid = pu && pu.id;
if (sid) ok(await call('POST', '/api/admin/approve', { userId: sid, modality: 'presencial', sede: 'quilpue', sessions: 8, start: W1 }), 'aprobar');
else sid = (stu.students || stu.users || []).find((u) => u.email === DEMO.studentEmail)?.id;
if (!sid) throw new Error('No encontré la alumna demo');
console.log('Alumna demo id', sid, '· semana actual', W0);

// 3) Rutinas (3 semanas) con registro de pesos creciente
const EX = [
  ['Día 1 · Pierna', 'Sentadilla con barra', 4, '6-8', 120, 60, 2, 8],
  ['Día 1 · Pierna', 'Hip thrust', 4, '8-10', 90, 80, 2, 10],
  ['Día 1 · Pierna', 'Peso muerto rumano', 3, '8-10', 90, 50, 2, 6],
  ['Día 2 · Empuje', 'Press banca con mancuernas', 4, '8-10', 90, 14, 2, 4],
  ['Día 2 · Empuje', 'Press militar', 3, '8-10', 90, 10, 2, 3],
  ['Día 2 · Empuje', 'Remo con barra', 3, '8-12', 75, 30, 3, 4],
];
const weeks = [[W3, 0], [W2, 1], [W1, 2], [W0, 3]];
const routineIds = {};
for (const [w, i] of weeks) {
  ok(await call('POST', '/api/admin/routine', {
    userId: sid, weekOf: w, name: 'Fuerza + glúteo · semana ' + (i + 1),
    exercises: EX.map(([day, name, sets, reps, rest, load, rir]) => ({ day, name, sets, reps, restSec: rest, warmupSets: 1, load, unit: 'kg', rir })),
  }), 'rutina ' + w);
  const list = ok(await call('GET', `/api/admin/routines?userId=${sid}`), 'listar rutinas').data;
  const rid = (list.routines || []).find((x) => x.week_of === w)?.id;
  if (!rid) throw new Error('No encontré la rutina de ' + w + ': ' + JSON.stringify(list).slice(0, 200));
  routineIds[w] = ok(await call('GET', `/api/admin/routine?id=${rid}`), 'leer rutina').data.exercises;
}
// Registro de pesos: sube cada semana
for (const [w, i] of weeks.slice(0, 3)) {
  const exs = routineIds[w];
  const d1 = add(w, 1), d2 = add(w, 3);
  for (const ex of exs) {
    const base = EX.find((e) => e[1] === ex.name);
    const kg = base[7] + (base[5] - base[7]) * 0 + 0; // placeholder (se recalcula abajo)
    const startKg = base[5] + i * (base[1].includes('Press') ? 1 : 2.5);
    const loggedOn = ex.day.startsWith('Día 1') ? d1 : d2;
    ok(await call('POST', '/api/admin/training/log', {
      userId: sid, exerciseId: ex.id, loggedOn,
      sets: Array.from({ length: ex.sets }, (_, k) => ({ setType: 'work', setNum: k + 1, kg: startKg, reps: 8 - (k > 1 ? 1 : 0), rir: 2 })),
    }), 'log ' + ex.name);
  }
}

// 4) Notas e hitos de Yohi (visibles)
for (const n of [
  { kind: 'milestone', title: '¡Nuevo récord en sentadilla!', body: 'Subiste de 60 a 67,5 kg manteniendo la técnica. Seguimos con propósito 💗' },
  { kind: 'note', title: 'Foco de esta semana', body: 'Controla la bajada de 3 segundos en el hip thrust y respeta los descansos.' },
]) ok(await call('POST', '/api/admin/notes', { userId: sid, visible: true, ...n }), 'nota');

// 5) Agenda: Yohi abre días y la alumna pide / Yohi confirma
for (const k of [0, 1, 2, 3]) {
  const day = add(TODAY, k + 1);
  const wd = (new Date(day + 'T12:00:00Z').getUTCDay() + 6) % 7;
  const mode = wd >= 5 ? 'wk' : 'pm';
  await call('POST', '/api/admin/open-day', { day, mode, sede: 'quilpue' });
}

// 6) Sesión de la alumna: ficha de salud + mediciones + reservas
cookie = '';
ok(await call('POST', '/api/login', { email: DEMO.studentEmail, password: DEMO.studentPass }), 'login alumna');
ok(await call('POST', '/api/health-consent', { enabled: true }), 'consent salud');
ok(await call('POST', '/api/anamnesis/consent', { enabled: true }), 'consent anamnesis');
ok(await call('POST', '/api/anamnesis', {
  goal: 'Ganar fuerza en tren inferior y aprender a entrenar con propósito.',
  experience: '1 año en gimnasio, sin plan estructurado.',
  injuries: 'Sin lesiones. Leve molestia lumbar al peso muerto convencional.',
  health_history: 'Sin antecedentes relevantes (dato demo).',
}), 'anamnesis');
const slots = (await call('GET', '/api/agenda')).data;
console.log('agenda keys:', Object.keys(slots || {}));
const days = (slots.days || slots.open_days || []);
console.log('días abiertos:', days.length, JSON.stringify(days[0] || {}).slice(0, 200));
const first = days.find((d) => (d.slots || d.times || []).length);
if (first) {
  const times = first.slots || first.times;
  const t = typeof times[0] === 'string' ? times[0] : (times[0].time || times[0]);
  const rb = await call('POST', '/api/bookings', { day: first.day, time: t });
  console.log('reserva', first.day, t, rb.status);
}

// 7) Mediciones (con autorización) cargadas por Yohi
cookie = '';
ok(await call('POST', '/api/login', { email: DEMO.adminEmail, password: DEMO.adminPass }), 'login admin');
for (const [date, w, f, m] of [[W3, 62.4, 28.1, 24.2], [W2, 62.0, 27.4, 24.6], [W0, 61.6, 26.5, 25.1]]) {
  const fd = new FormData();
  fd.set('userId', String(sid)); fd.set('date', date);
  fd.set('weight_kg', String(w)); fd.set('fat_pct', String(f)); fd.set('muscle_kg', String(m));
  const rm = await call('POST', '/api/admin/measurement', fd);
  if (rm.status >= 300) console.log('medición', date, rm.status, JSON.stringify(rm.data));
}
// Confirmar la reserva pendiente
const ag = (await call('GET', '/api/admin/agenda')).data;
const pending = (ag.bookings || []).find((b) => b.status === 'requested');
if (pending) await call('POST', '/api/admin/booking', { id: pending.id, action: 'confirm' });
console.log('Seed demo listo.');
