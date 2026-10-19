/* Registro de entrenamiento — vista del alumno (training.js)
   Depende de portal.js (el, api, fmtDate, MESES) */

const TRAINING_INFO = {
  rir: { title: 'RIR — Repeticiones en Reserva', text: 'Cuántas reps más podrías haber hecho. RIR 2 = te quedaban 2. RIR 0 = fallo.' },
  reps: { title: 'Repeticiones', text: 'Veces que hiciste el movimiento completo. Si superas el rango con buen RIR, sube peso.' },
  rest: { title: 'Descanso', text: 'Tiempo entre series. Lo define Yohi en tu rutina según el objetivo del ejercicio.' },
  warmup: { title: 'Series de calentamiento', text: 'Series livianas previas para preparar músculos y articulaciones. No cuentan en el progreso.' },
  kg: { title: 'Carga', text: 'Peso que cargaste, en la unidad (kg o lbs) que Yohi eligió para este ejercicio. Registrarlo te muestra si vas progresando semana a semana.' },
  vol: { title: 'Volumen total', text: 'Peso × reps de todas tus series de trabajo. Más volumen = más trabajo. Sirve para comparar semanas.' },
};

function infoButton(key) {
  let open = false;
  const isGold = key === 'warmup';
  const tip = el('div', { class: 'info-tip' + (isGold ? ' gold' : ''), hidden: '' },
    el('strong', {}, TRAINING_INFO[key].title), el('br'), TRAINING_INFO[key].text);
  const btn = el('button', { type: 'button', class: 'info-btn' + (isGold ? ' gold' : ''),
    onclick: (e) => { e.stopPropagation(); open = !open; tip.hidden = !open; }
  }, 'i');
  return el('span', { class: 'info-wrap' }, btn, tip);
}

function trainingSection(container) {
  let currentWeekOf = null;
  let timerCard = null;
  const getTimer = () => timerCard || (timerCard = buildTimer());

  async function render() {
    const r = await api('/api/routine' + (currentWeekOf ? '?weekOf=' + currentWeekOf : ''));
    if (!r.ok) {
      container.replaceChildren(
        el('h2', { style: 'margin-top:0' }, 'Mi rutina'),
        el('p', { class: 'err' }, r.data.error || 'No pudimos cargar tu rutina.'));
      return;
    }

    const { routine, exercises, logs } = r.data;
    // Última observación del alumno por ejercicio (vienen ordenadas por fecha)
    const notesByEx = {};
    for (const n of (r.data.notes || [])) notesByEx[n.exercise_id] = n.note;

    // Encabezado
    const head = el('h2', { style: 'margin-top:0' }, 'Mi rutina');

    if (!routine) {
      container.replaceChildren(head,
        el('p', { class: 'muted' }, 'Yohi aún no ha cargado tu rutina para esta semana o este día. Aparecerá aquí cuando esté lista.'),
        getTimer());
      // Selector de semanas
      renderWeekSelector(container, head);
      return;
    }

    currentWeekOf = routine.week_of;

    // Agrupar logs por exercise_id
    const logsByEx = {};
    for (const log of logs) {
      if (!logsByEx[log.exercise_id]) logsByEx[log.exercise_id] = [];
      logsByEx[log.exercise_id].push(log);
    }

    // Temporizador (el mismo de siempre, para que no se reinicie al repintar)
    const timer = getTimer();

    // Ejercicios, agrupados por día cuando la rutina los tiene
    const exBlock = buildDays(exercises, logsByEx, notesByEx, routine.week_of);

    // Progreso resumen
    const summary = buildSummary(exercises, logsByEx);

    container.replaceChildren(head);
    renderWeekSelector(container, head);
    container.append(
      el('p', { class: 'muted', style: 'margin-bottom:6px' },
        routine.name ? routine.name + ' · ' : '',
        routine.day_on ? 'Rutina del día ' : 'Semana del ', el('strong', {}, fmtDate(routine.week_of))),
      summary,
      timer,
      exBlock);
  }

  // Cada día es un bloque que se despliega; se abre solo el de hoy (si los días tienen nombre de la semana).
  function buildDays(exercises, logsByEx, notesByEx, weekOf) {
    const groups = [];
    for (const ex of exercises) {
      const d = (ex.day || '').trim();
      let g = groups.find((x) => x.day === d);
      if (!g) { g = { day: d, items: [] }; groups.push(g); }
      g.items.push(ex);
    }
    const card = (ex, i) => buildExercise(ex, i, logsByEx[ex.id] || [], weekOf, notesByEx[ex.id] || '');
    if (groups.length === 1 && !groups[0].day) return el('div', { class: 'training-exercises' }, ...exercises.map(card));
    // El alumno ve "Día 1", "Día 2"…, aunque Yohi haya escrito Lunes, Martes…
    const plain = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const dayName = (label, n) => {
      const t = plain(label), m = t.match(/\bdia\s*(\d+)/);
      if (m) return 'Día ' + m[1];
      return /\b(lunes|martes|miercoles|jueves|viernes|sabado|domingo)\b/.test(t) ? 'Día ' + (n + 1) : label;
    };
    let dayN = 0;
    return el('div', { class: 'day-groups' }, ...groups.map((g) => {
      const total = g.items.length;
      const isDone = (ex) => (logsByEx[ex.id] || []).filter((l) => l.set_type === 'work').length >= ex.sets;
      const count = el('span', { class: 'day-count' });
      const det = el('details', { class: 'day-group' },
        el('summary', { class: 'day-sum' }, el('span', { class: 'day-name' }, g.day ? dayName(g.day, dayN++) : 'Otros ejercicios'), count),
        el('div', { class: 'training-exercises' }, ...g.items.map((ex, i) => card(ex, i))));
      const recount = () => {
        const n = det.querySelectorAll('.ex-badge.done').length;
        count.textContent = n + '/' + total + ' ejercicios';
        count.classList.toggle('done', n === total);
      };
      recount();
      det.addEventListener('saved', recount);
      return det;
    }));
  }

  async function renderWeekSelector(container, afterEl) {
    const wr = await api('/api/routine/weeks');
    if (!wr.ok || !wr.data.weeks.length) return;
    const weeks = wr.data.weeks;
    const seg = el('div', { class: 'seg', style: 'margin-bottom:14px' });
    for (const w of weeks.slice(0, 8)) {
      const [, m, d] = w.week_of.split('-').map(Number);
      const label = (w.day_on ? 'Día ' : '') + d + ' ' + MESES[m - 1];
      const btn = el('button', { type: 'button',
        'aria-pressed': String(w.week_of === currentWeekOf),
        onclick: () => { currentWeekOf = w.week_of; render(); }
      }, label);
      seg.append(btn);
    }
    afterEl.after(seg);
  }

  function buildSummary(exercises, logsByEx) {
    let done = 0;
    for (const ex of exercises) {
      const exLogs = logsByEx[ex.id] || [];
      const workSets = exLogs.filter(l => l.set_type === 'work').length;
      if (workSets >= ex.sets) done++;
    }
    const total = exercises.length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    const barColor = pct === 100 ? 'var(--accent)' : 'var(--gold)';
    return el('div', { class: 'training-progress', style: 'margin-bottom:14px' },
      el('div', { style: 'display:flex;justify-content:space-between;align-items:center;margin-bottom:6px' },
        el('span', { style: 'font:800 12px/1 var(--f-text);letter-spacing:.06em;text-transform:uppercase;color:var(--accent-soft)' }, 'Progreso'),
        el('span', { style: 'font:800 12px/1 var(--f-text);color:var(--muted)' }, done + '/' + total + ' ejercicios')),
      el('div', { style: 'height:8px;border-radius:999px;background:rgba(255,255,255,.08);overflow:hidden' },
        el('div', { style: `height:100%;width:${pct}%;border-radius:999px;background:${barColor};transition:width .3s ease` })));
  }

  function buildTimer() {
    let totalSec = 90, remaining = 90, running = false, intervalId = null, touched = false, inView = true;

    const display = el('div', { class: 'timer-display' }, '01:30');
    const minIn = el('input', { type: 'number', class: 'timer-input', value: '1', min: '0', max: '30' });
    const secIn = el('input', { type: 'number', class: 'timer-input', value: '30', min: '0', max: '59' });

    const fmt = (s) => {
      const m = Math.floor(s / 60), ss = s % 60;
      display.textContent = (m < 10 ? '0' : '') + m + ':' + (ss < 10 ? '0' : '') + ss;
      syncPill();
    };

    const readInputs = () => {
      totalSec = Math.max(0, (parseInt(minIn.value) || 0) * 60 + (parseInt(secIn.value) || 0));
      remaining = totalSec;
      fmt(totalSec);
    };
    minIn.addEventListener('change', readInputs);
    secIn.addEventListener('change', readInputs);

    const wrap = el('div', { class: 'timer-wrap' });
    // Mini temporizador: aparece solo cuando el grande queda fuera de pantalla y hay una cuenta en marcha o pausada.
    const pillTime = el('span', { class: 'timer-pill-time' }, '01:30');
    const pillBtn = el('button', { class: 'timer-pill-btn', type: 'button', 'aria-label': 'Pausar o seguir' }, '⏸');
    const pill = el('div', { class: 'timer-pill', hidden: '', role: 'timer' }, el('span', { 'aria-hidden': 'true' }, '⏱'), pillTime, pillBtn);
    function syncPill() {
      const done = touched && !running && remaining <= 0;
      pill.hidden = inView || !touched;
      pill.classList.toggle('done', done);
      pillTime.textContent = done ? '¡A entrenar!' : display.textContent;
      pillBtn.textContent = running ? '⏸' : (done ? '↺' : '▶');
    }
    document.body.append(pill);
    if ('IntersectionObserver' in window) new IntersectionObserver((es) => { inView = es[es.length - 1].isIntersecting; syncPill(); }).observe(wrap);
    const card = el('div', { class: 'timer-card' });
    const mascot = el('img', { class: 'timer-mascot', src: '/yohi-timer.webp', alt: 'Yohi Coach', width: '428', height: '520' });
    const startBtn = el('button', { class: 'timer-btn start', type: 'button' }, '▶  Iniciar');
    const pauseBtn = el('button', { class: 'timer-btn pause', type: 'button', hidden: '' }, '⏸ Pausa');
    const resetBtn = el('button', { class: 'timer-btn reset', type: 'button', hidden: '' }, '↺');
    const inputRow = el('div', { class: 'timer-inputs' },
      minIn, el('span', { class: 'timer-unit' }, 'min'),
      el('span', { class: 'timer-sep' }, ':'),
      secIn, el('span', { class: 'timer-unit' }, 'seg'));
    const actionsRow = el('div', { class: 'timer-actions' }, startBtn, pauseBtn, resetBtn);

    const stop = () => { if (intervalId) { clearInterval(intervalId); intervalId = null; } running = false; };

    const tick = () => {
      remaining--;
      fmt(remaining);
      if (remaining <= 0) {
        stop();
        wrap.classList.remove('running');
        wrap.classList.add('done-ring');
        display.innerHTML = '<span style="color:var(--accent)">¡A entrenar!</span>';
        startBtn.hidden = true; pauseBtn.hidden = true; resetBtn.hidden = false;
        syncPill();
        // Vibrar si el dispositivo lo permite
        try { navigator.vibrate && navigator.vibrate([200, 100, 200]); } catch {}
        setTimeout(() => wrap.classList.remove('done-ring'), 2500);
      }
    };

    startBtn.addEventListener('click', () => {
      if (!running) {
        if (remaining <= 0) { remaining = totalSec; }
        running = true; touched = true;
        wrap.classList.remove('done-ring');
        wrap.classList.add('running');
        inputRow.hidden = true;
        startBtn.hidden = true; pauseBtn.hidden = false; resetBtn.hidden = false;
        intervalId = setInterval(tick, 1000);
      }
    });

    pauseBtn.addEventListener('click', () => {
      stop();
      wrap.classList.remove('running');
      startBtn.hidden = false; pauseBtn.hidden = true;
      startBtn.textContent = '▶  Seguir';
      syncPill();
    });

    resetBtn.addEventListener('click', () => {
      stop();
      remaining = totalSec;
      fmt(remaining);
      wrap.classList.remove('running', 'done-ring');
      inputRow.hidden = false;
      startBtn.hidden = false; pauseBtn.hidden = true; resetBtn.hidden = true;
      startBtn.textContent = '▶  Iniciar';
      touched = false; syncPill();
    });
    pillBtn.addEventListener('click', () => { (running ? pauseBtn : (remaining <= 0 ? resetBtn : startBtn)).click(); });
    pillTime.addEventListener('click', () => {
      if (location.hash !== '#rutina') location.hash = '#rutina';
      setTimeout(() => wrap.scrollIntoView({ block: 'center', behavior: 'smooth' }), 250);
    });

    const body = el('div', { class: 'timer-body' },
      el('div', { class: 'timer-label' }, '⏱', ' TEMPORIZADOR'),
      display, inputRow, actionsRow);

    card.append(body);
    wrap.append(mascot, card);
    return wrap;
  }

  function buildExercise(ex, idx, existingLogs, weekOf, existingNote) {
    const workLogs = existingLogs.filter(l => l.set_type === 'work');
    const warmupLogs = existingLogs.filter(l => l.set_type === 'warmup');
    const isDone = workLogs.length >= ex.sets;
    const badgeClass = isDone ? 'done' : (workLogs.length > 0 ? 'partial' : '');
    const badgeText = isDone ? '✓' : (workLogs.length > 0 ? workLogs.length + '/' + ex.sets : idx + 1);

    const unitTxt = ex.unit === 'lbs' ? 'lbs' : 'kg';
    let expanded = false;
    const body = el('div', { hidden: '' });

    const exDiv = el('div', { class: 'exercise' + (badgeClass ? ' ' + badgeClass : '') });

    const toggle = () => {
      expanded = !expanded;
      body.hidden = !expanded;
      exDiv.classList.toggle('open', expanded);
    };

    // Header
    const badge = el('span', { class: 'ex-badge ' + badgeClass }, badgeText);
    const header = el('div', { class: 'ex-head', onclick: toggle },
      badge,
      el('div', { class: 'ex-info' },
        el('span', { class: 'ex-name' }, ex.name),
        el('span', { class: 'ex-meta' }, ex.sets + '×' + ex.reps + ' · ' + ex.rest_sec + 's desc' + (ex.target_load ? ' · carga ' + ex.target_load + ' ' + unitTxt : ''))),
      el('span', { class: 'ex-tap' }, 'Toca para registrar'));

    // Tabla de series de trabajo
    const tableHead = el('div', { class: 'set-row set-header' },
      el('span', { class: 'set-col num' }, 'Serie'),
      el('span', { class: 'set-col' }, unitTxt.toUpperCase() + ' ', infoButton('kg')),
      el('span', { class: 'set-col' }, 'Reps ', infoButton('reps')),
      el('span', { class: 'set-col' }, 'RIR ', infoButton('rir')),
      el('span', { class: 'set-col rest' }, 'Desc ', infoButton('rest')));

    const setRows = [];
    for (let s = 1; s <= ex.sets; s++) {
      const log = workLogs.find(l => l.set_num === s);
      const kgIn = el('input', { type: 'number', class: 'set-input', placeholder: '—', min: '0', max: '999', step: '0.5', value: log ? log.kg : '' });
      const repsIn = el('input', { type: 'number', class: 'set-input', placeholder: '—', min: '0', max: '200', value: log ? log.reps : '' });
      const rirIn = el('input', { type: 'number', class: 'set-input', placeholder: '—', min: '0', max: '10', value: log != null && log.rir != null ? log.rir : '' });

      setRows.push({ setNum: s, setType: 'work', kgIn, repsIn, rirIn });

      body.append(el('div', { class: 'set-row' },
        el('span', { class: 'set-col num' }, String(s)),
        el('span', { class: 'set-col' }, kgIn),
        el('span', { class: 'set-col' }, repsIn),
        el('span', { class: 'set-col' }, rirIn),
        el('span', { class: 'set-col rest', style: 'text-align:center;font-size:13px;color:var(--muted);font-weight:600' }, ex.rest_sec + 's')));
    }

    // Series de calentamiento
    if (ex.warmup_sets > 0) {
      body.append(el('div', { class: 'warmup-label' }, infoButton('warmup'), ' Calentamiento'));
      for (let s = 1; s <= ex.warmup_sets; s++) {
        const log = warmupLogs.find(l => l.set_num === s);
        const kgIn = el('input', { type: 'number', class: 'set-input', placeholder: '—', min: '0', max: '999', step: '0.5', value: log ? log.kg : '' });
        const repsIn = el('input', { type: 'number', class: 'set-input', placeholder: '—', min: '0', max: '200', value: log ? log.reps : '' });

        setRows.push({ setNum: s, setType: 'warmup', kgIn, repsIn, rirIn: null });

        body.append(el('div', { class: 'set-row warmup' },
          el('span', { class: 'set-col num' }, 'C' + s),
          el('span', { class: 'set-col' }, kgIn),
          el('span', { class: 'set-col' }, repsIn),
          el('span', { class: 'set-col' }),
          el('span', { class: 'set-col rest' })));
      }
    }

    // Nota de Yohi
    if (ex.notes) {
      body.append(el('p', { class: 'ex-note' }, '💬 ', ex.notes));
    }

    // Observaciones del alumno (Yohi las ve en su panel)
    const initialNote = existingNote || '';
    const obsIn = el('textarea', { class: 'ex-obs', maxlength: '500', placeholder: 'Cómo te sentiste, molestias, cambios que hiciste…' });
    obsIn.rows = 2; obsIn.value = initialNote;
    body.append(el('label', { class: 'ex-obs-wrap' }, el('span', { class: 'ex-obs-label' }, '📝 Observaciones para Yohi'), obsIn));

    // Guardar (manual con el botón, o solo mientras escribes: autoguardado)
    const msg = el('p', { class: 'set-msg', role: 'status' });
    const draftKey = 'yc-draft:' + ex.id + ':' + todayLocal();
    const readDraft = () => { try { return JSON.parse(localStorage.getItem(draftKey) || 'null'); } catch { return null; } };
    const writeDraft = (v) => { try { v ? localStorage.setItem(draftKey, JSON.stringify(v)) : localStorage.removeItem(draftKey); } catch {} };
    let lastSaved = '';
    const collect = () => {
      const sets = setRows.map(s => ({
        setType: s.setType, setNum: s.setNum,
        kg: s.kgIn.value !== '' ? Number(s.kgIn.value) : null,
        reps: s.repsIn.value !== '' ? Number(s.repsIn.value) : null,
        rir: s.rirIn && s.rirIn.value !== '' ? Number(s.rirIn.value) : null,
      })).filter(s => s.kg !== null || s.reps !== null);
      return { sets, note: obsIn.value.trim() };
    };
    async function doSave(auto) {
      const { sets: setsData, note: noteVal } = collect();
      const noteChanged = noteVal !== initialNote.trim();
      if (!setsData.length && !noteChanged) {
        if (!auto) { msg.className = 'set-msg err'; msg.textContent = 'Llena al menos una serie o escribe una observación.'; }
        return;
      }
      const sig = JSON.stringify([setsData, noteVal]);
      if (auto && sig === lastSaved) return;
      const payload = { exerciseId: ex.id, loggedOn: todayLocal(), sets: setsData };
      if (noteChanged) payload.note = noteVal;
      if (!auto) saveBtn.disabled = true;
      msg.className = 'set-msg'; msg.textContent = auto ? 'Guardando…' : '';
      const r = await api('/api/training/log', payload);
      saveBtn.disabled = false;
      if (r.ok) {
        lastSaved = sig; writeDraft(null);
        msg.className = 'set-msg ok'; msg.textContent = auto ? '✓ Guardado solo' : '✓ Guardado';
        const worked = setsData.filter(s => s.setType === 'work').length;
        if (worked >= ex.sets) { badge.textContent = '✓'; badge.className = 'ex-badge done'; }
        else if (worked > 0) { badge.textContent = worked + '/' + ex.sets; badge.className = 'ex-badge partial'; }
        exDiv.dispatchEvent(new CustomEvent('saved', { bubbles: true }));
        setTimeout(() => { if (msg.textContent.startsWith('✓')) msg.textContent = ''; }, 2000);
      } else {
        msg.className = 'set-msg err';
        msg.textContent = auto ? 'Sin conexión: tu borrador queda en este dispositivo. Toca Guardar cuando puedas.' : (r.data.error || 'Error al guardar.');
      }
    }
    const saveBtn = el('button', { class: 'btn small', type: 'button', style: 'margin-top:10px', onclick: () => { clearTimeout(timer); doSave(false); } }, 'Guardar');
    // Autoguardado: borrador local al instante y guardado en el servidor ~1,2 s después de dejar de escribir.
    let timer = null;
    body.addEventListener('input', () => {
      writeDraft({ sets: setRows.map(s => [s.setType, s.setNum, s.kgIn.value, s.repsIn.value, s.rirIn ? s.rirIn.value : '']), note: obsIn.value });
      clearTimeout(timer); timer = setTimeout(() => doSave(true), 1200);
    });
    // Si quedó un borrador sin guardar (cerró la pestaña, se fue de la página), se recupera y se guarda.
    const draft = readDraft();
    if (draft && Array.isArray(draft.sets)) {
      let restored = false;
      for (const [type, num, kg, reps, rir] of draft.sets) {
        const row = setRows.find(r => r.setType === type && r.setNum === num);
        if (row && (kg !== '' || reps !== '')) { row.kgIn.value = kg; row.repsIn.value = reps; if (row.rirIn) row.rirIn.value = rir; restored = true; }
      }
      if (typeof draft.note === 'string' && draft.note !== obsIn.value) { obsIn.value = draft.note; restored = true; }
      if (restored) { msg.className = 'set-msg'; msg.textContent = 'Recuperamos lo que estabas anotando…'; timer = setTimeout(() => doSave(true), 800); }
    }
    body.append(el('div', { class: 'set-actions' }, saveBtn, msg));

    // Volumen total
    const volWrap = el('div', { class: 'ex-vol' });
    function updateVol() {
      let vol = 0;
      for (const s of setRows) {
        if (s.setType !== 'work') continue;
        const k = Number(s.kgIn.value) || 0, r = Number(s.repsIn.value) || 0;
        vol += k * r;
      }
      volWrap.replaceChildren(
        vol > 0 ? el('span', { class: 'vol-badge' }, infoButton('vol'), ' Vol: ', el('strong', {}, Math.round(vol) + ' ' + unitTxt)) : '');
    }
    for (const s of setRows) {
      if (s.setType !== 'work') continue;
      s.kgIn.addEventListener('input', updateVol);
      s.repsIn.addEventListener('input', updateVol);
    }
    updateVol();

    body.prepend(tableHead);
    body.append(volWrap);

    exDiv.append(header, body);
    return exDiv;
  }

  function todayLocal() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  render();
}
