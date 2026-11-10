/* Temporizador de Yohi para el portal de admin: flota sobre todas las pestañas, sigue corriendo al cambiar de sección
   (se calcula con la hora real, así no se atrasa si el iPad se duerme) y avisa con sonido y vibración. */
(function () {
  'use strict';
  const KEY = 'yc-admin-timer';
  const PRESETS = [30, 60, 90, 120, 180, 300];
  let total = 90, remaining = 90, endAt = 0, running = false, finished = false, tickId = null, open = false, audio = null;

  const save = () => { try { sessionStorage.setItem(KEY, JSON.stringify({ total, remaining, endAt, running, finished })); } catch {} };
  const load = () => {
    try {
      const s = JSON.parse(sessionStorage.getItem(KEY) || 'null');
      if (!s) return;
      total = s.total || 90; remaining = s.remaining; endAt = s.endAt || 0; running = !!s.running; finished = !!s.finished;
    } catch {}
  };
  const fmt = (s) => { s = Math.max(0, s); const m = Math.floor(s / 60), x = s % 60; return (m < 10 ? '0' : '') + m + ':' + (x < 10 ? '0' : '') + x; };
  const h = (tag, cls, txt) => { const n = document.createElement(tag); if (cls) n.className = cls; if (txt != null) n.textContent = txt; return n; };

  const root = h('div', 'ytimer');
  const panel = h('div', 'ytimer-panel'); panel.hidden = true; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Temporizador');
  const head = h('div', 'ytimer-head');
  const label = h('span', 'ytimer-label', '⏱ TEMPORIZADOR');
  const closeBtn = h('button', 'ytimer-x', '✕'); closeBtn.type = 'button'; closeBtn.setAttribute('aria-label', 'Cerrar temporizador');
  head.append(label, closeBtn);
  const display = h('div', 'ytimer-display', '01:30'); display.setAttribute('role', 'timer');
  const presets = h('div', 'ytimer-presets');
  const minIn = h('input', 'ytimer-in'); minIn.type = 'number'; minIn.min = '0'; minIn.max = '60'; minIn.value = '1'; minIn.setAttribute('aria-label', 'Minutos'); minIn.inputMode = 'numeric';
  const secIn = h('input', 'ytimer-in'); secIn.type = 'number'; secIn.min = '0'; secIn.max = '59'; secIn.value = '30'; secIn.setAttribute('aria-label', 'Segundos'); secIn.inputMode = 'numeric';
  const inputs = h('div', 'ytimer-inputs'); inputs.append(minIn, h('span', 'ytimer-unit', 'min'), h('span', 'ytimer-sep', ':'), secIn, h('span', 'ytimer-unit', 'seg'));
  const startBtn = h('button', 'ytimer-btn start', '▶ Iniciar'); startBtn.type = 'button';
  const pauseBtn = h('button', 'ytimer-btn pause', '⏸ Pausa'); pauseBtn.type = 'button';
  const resetBtn = h('button', 'ytimer-btn reset', '↺'); resetBtn.type = 'button'; resetBtn.setAttribute('aria-label', 'Reiniciar');
  const actions = h('div', 'ytimer-actions'); actions.append(startBtn, pauseBtn, resetBtn);
  panel.append(head, display, presets, inputs, actions);

  // Botón flotante: círculo cuando está quieto, píldora con la cuenta cuando corre o está pausado.
  const pill = h('button', 'ytimer-pill'); pill.type = 'button'; pill.setAttribute('aria-label', 'Abrir temporizador');
  const pillIcon = h('span', 'ytimer-pill-i', '⏱'); const pillTime = h('span', 'ytimer-pill-t', '');
  pill.append(pillIcon, pillTime);
  root.append(panel, pill);

  function beep() {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
      [0, 0.28, 0.56].forEach((d) => {
        const o = audio.createOscillator(), g = audio.createGain();
        o.type = 'sine'; o.frequency.value = 880; o.connect(g); g.connect(audio.destination);
        const t = audio.currentTime + d; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
        o.start(t); o.stop(t + 0.25);
      });
    } catch {}
    try { navigator.vibrate && navigator.vibrate([250, 120, 250, 120, 250]); } catch {}
  }

  function paint() {
    const active = running || (!finished && remaining < total) || finished;
    display.textContent = finished ? '¡Tiempo!' : fmt(remaining);
    display.classList.toggle('done', finished);
    root.classList.toggle('is-running', running);
    root.classList.toggle('is-done', finished);
    pill.classList.toggle('active', active);
    pillTime.textContent = finished ? '¡Tiempo!' : (active ? fmt(remaining) : '');
    pillIcon.textContent = finished ? '🔔' : '⏱';
    startBtn.hidden = running; pauseBtn.hidden = !running;
    startBtn.textContent = (!finished && remaining < total && remaining > 0) ? '▶ Seguir' : '▶ Iniciar';
    resetBtn.hidden = !(running || finished || remaining < total);
    inputs.hidden = running || (remaining < total && !finished);
    presets.hidden = inputs.hidden;
    panel.hidden = !open;
    pill.setAttribute('aria-expanded', String(open));
  }

  function tick() {
    remaining = Math.max(0, Math.round((endAt - Date.now()) / 1000));
    if (remaining <= 0) { stop(); finished = true; remaining = 0; beep(); open = true; }
    save(); paint();
  }
  function stop() { running = false; if (tickId) { clearInterval(tickId); tickId = null; } }
  function start() {
    if (finished || remaining <= 0) { finished = false; remaining = total; }
    endAt = Date.now() + remaining * 1000; running = true; finished = false;
    try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); audio.resume && audio.resume(); } catch {} // el sonido necesita un toque previo
    if (tickId) clearInterval(tickId); tickId = setInterval(tick, 250); save(); paint();
  }
  function reset() { stop(); finished = false; remaining = total; endAt = 0; save(); paint(); }
  function setTotal(sec) {
    total = Math.max(1, Math.min(3600, sec)); remaining = total; finished = false;
    minIn.value = String(Math.floor(total / 60)); secIn.value = String(total % 60);
    save(); paint();
  }

  PRESETS.forEach((s) => {
    const b = h('button', 'ytimer-chip', s < 60 ? s + ' s' : (s % 60 ? Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0') : s / 60 + ' min')); b.type = 'button';
    b.addEventListener('click', () => { if (!running) setTotal(s); });
    presets.append(b);
  });
  // Al escribir a mano no se tocan las casillas (si no, se reescriben mientras Yohi teclea).
  const readInputs = () => {
    if (running) return;
    total = Math.max(1, Math.min(3600, (parseInt(minIn.value, 10) || 0) * 60 + (parseInt(secIn.value, 10) || 0)));
    remaining = total; finished = false; save(); paint();
  };
  minIn.addEventListener('change', readInputs); secIn.addEventListener('change', readInputs);
  startBtn.addEventListener('click', start);
  pauseBtn.addEventListener('click', () => { remaining = Math.max(0, Math.round((endAt - Date.now()) / 1000)); stop(); save(); paint(); });
  resetBtn.addEventListener('click', reset);
  closeBtn.addEventListener('click', () => { open = false; paint(); });
  pill.addEventListener('click', () => { open = !open; paint(); });
  document.addEventListener('visibilitychange', () => { if (running && !document.hidden) tick(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && open) { open = false; paint(); } });

  function init() {
    load();
    if (running) { // venía corriendo antes de recargar la página
      if (Date.now() >= endAt) { running = false; finished = true; remaining = 0; } else { remaining = Math.round((endAt - Date.now()) / 1000); tickId = setInterval(tick, 250); }
    }
    minIn.value = String(Math.floor(total / 60)); secIn.value = String(total % 60);
    document.body.append(root); paint();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
