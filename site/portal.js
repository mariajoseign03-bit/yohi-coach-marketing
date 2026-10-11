/* Utilidades compartidas de las páginas del portal. */
async function api(path, body) {
  const opt = body === undefined
    ? { method: 'GET', credentials: 'same-origin' }
    : { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) };
  try {
    const res = await fetch(path, opt);
    const data = await res.json().catch(() => ({}));
    return { status: res.status, ok: res.ok && data.ok !== false, data };
  } catch {
    return { status: 0, ok: false, data: { error: 'Sin conexión. Revisa tu internet e intenta de nuevo.' } };
  }
}

// Envío de formularios con archivos (FormData).
async function apiForm(path, formData) {
  try {
    const res = await fetch(path, { method: 'POST', credentials: 'same-origin', body: formData });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, ok: res.ok && data.ok !== false, data };
  } catch {
    return { status: 0, ok: false, data: { error: 'Sin conexión. Revisa tu internet e intenta de nuevo.' } };
  }
}

// Crea un elemento con texto seguro (nunca interpreta HTML: los nombres los escriben las alumnas).
function el(tag, attrs, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === 'class') n.className = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v);
  }
  for (const kid of kids.flat()) n.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  return n;
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
function fmtDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MESES[m - 1]} ${y}`;
}
function daysLeft(endIso) {
  const end = new Date(endIso + 'T23:59:59');
  return Math.max(0, Math.ceil((end - new Date()) / 86400000));
}
const SEDE_NOMBRE = { quilpue: 'Fitnex Quilpué', vina: 'Fitnex Viña del Mar', quillota: 'Fitnex Quillota' };

async function logout() {
  await api('/api/logout', {});
  location.href = '/';
}

function sparkles() {
  const pos = [[6, 10, 14, 0], [92, 14, 12, .9], [95, 42, 17, 1.7], [3, 58, 12, 2.3], [90, 74, 13, .4], [8, 88, 15, 1.2]];
  const NS = 'http://www.w3.org/2000/svg';
  for (const [x, y, s, d] of pos) {
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'sp'); svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('aria-hidden', 'true');
    svg.style.cssText = `left:${x}%;top:${y}%;width:${s}px;height:${s}px;animation-delay:${d}s`;
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', 'M12 0c.8 6.4 5.6 11.2 12 12-6.4.8-11.2 5.6-12 12-.8-6.4-5.6-11.2-12-12 6.4-.8 11.2-5.6 12-12z');
    p.setAttribute('fill', 'currentColor');
    svg.append(p); document.body.append(svg);
  }
}

// Gráfico de línea simple (SVG) para las mediciones. items: [{measured_on, ...}] ordenados por fecha.
function lineChart(items, key, unit) {
  const pts = items.filter((i) => i[key] !== null && i[key] !== undefined).map((i) => ({ d: i.measured_on, v: i[key] }));
  const NS = 'http://www.w3.org/2000/svg';
  const W = 320, H = 150, L = 38, R = 14, T = 14, B = 26;
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('role', 'img'); svg.style.cssText = 'width:100%;height:auto;display:block';
  const mk = (tag, attrs) => { const n = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v); svg.append(n); return n; };
  if (!pts.length) return null;
  svg.setAttribute('aria-label', `Evolución de ${key}: ` + pts.map((p) => `${fmtDate(p.d)} ${p.v} ${unit}`).join(', '));
  const vs = pts.map((p) => p.v);
  let lo = Math.min(...vs), hi = Math.max(...vs);
  if (hi - lo < 1) { lo -= 0.5; hi += 0.5; }
  const pad = (hi - lo) * 0.2; lo -= pad; hi += pad;
  const t0 = new Date(pts[0].d).getTime(), t1 = new Date(pts[pts.length - 1].d).getTime();
  const x = (d) => (t1 === t0 ? (L + W - R) / 2 : L + ((new Date(d).getTime() - t0) / (t1 - t0)) * (W - L - R));
  const y = (v) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  for (const g of [lo + pad, (lo + hi) / 2, hi - pad]) {
    mk('line', { x1: L, x2: W - R, y1: y(g), y2: y(g), stroke: 'rgba(255,214,232,.14)', 'stroke-width': 1 });
    const tx = mk('text', { x: L - 6, y: y(g) + 4, 'text-anchor': 'end', fill: '#A7A7A7', 'font-size': 10 }); tx.textContent = (Math.round(g * 10) / 10).toString();
  }
  if (pts.length > 1) mk('polyline', { points: pts.map((p) => `${x(p.d)},${y(p.v)}`).join(' '), fill: 'none', stroke: '#FF6DB4', 'stroke-width': 2.5, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' });
  pts.forEach((p, i) => {
    mk('circle', { cx: x(p.d), cy: y(p.v), r: i === pts.length - 1 ? 5 : 3.5, fill: i === pts.length - 1 ? '#FF4FA3' : '#0B0B0B', stroke: '#FF6DB4', 'stroke-width': 2 });
  });
  const a = mk('text', { x: x(pts[0].d), y: H - 8, 'text-anchor': pts.length > 1 ? 'start' : 'middle', fill: '#A7A7A7', 'font-size': 10 }); a.textContent = fmtDate(pts[0].d);
  if (pts.length > 1) { const b = mk('text', { x: x(pts[pts.length - 1].d), y: H - 8, 'text-anchor': 'end', fill: '#A7A7A7', 'font-size': 10 }); b.textContent = fmtDate(pts[pts.length - 1].d); }
  return svg;
}

const fmtN = (v) => (Math.round(v * 10) / 10).toString().replace('.', ',');
const WA_NUM = '56944500370';

// Barra con la zona "rango del informe" y un marcador con el valor medido.
function rangeBar(label, value, unit, range) {
  const lo = range[0], hi = range[1];
  const min = Math.min(lo, value) * 0.85, max = Math.max(hi, value) * 1.12;
  const pct = (v) => Math.max(0, Math.min(100, ((v - min) / (max - min)) * 100));
  const state = value < lo ? 'Bajo el rango' : value > hi ? 'Sobre el rango' : 'Dentro del rango';
  const track = el('div', { class: 'rb-track', role: 'img', 'aria-label': `${label}: ${fmtN(value)} ${unit}. ${state} del informe (${fmtN(lo)} a ${fmtN(hi)} ${unit}).` },
    el('div', { class: 'rb-zone', style: `left:${pct(lo)}%;width:${pct(hi) - pct(lo)}%` }),
    el('div', { class: 'rb-dot', style: `left:${pct(value)}%` }));
  return el('div', { class: 'rb' },
    el('div', { class: 'rb-head' }, el('span', {}, label), el('strong', {}, fmtN(value) + ' ' + unit)),
    track,
    el('div', { class: 'rb-foot' }, el('span', {}, 'Rango del informe: ' + fmtN(lo) + '–' + fmtN(hi)), el('span', { class: 'rb-state' }, state)));
}

// Comparación "antes → ahora" entre dos controles.
function compareBlock(prev, cur) {
  const defs = [['Peso', 'kg', (x) => x.weight_kg], ['Grasa corporal', '%', (x) => x.fat_pct], ['Masa muscular', 'kg', (x) => x.muscle_kg], ['Puntaje corporal', 'pts', (x) => (x.extra ? x.extra.score : null)]];
  const rows = [], notes = [];
  for (const [label, unit, get] of defs) {
    const a = get(prev), b = get(cur);
    if (typeof a !== 'number' || typeof b !== 'number') continue;
    const d = Math.round((b - a) * 10) / 10;
    const max = Math.max(a, b) || 1;
    const arrow = d > 0 ? '↑' : d < 0 ? '↓' : '=';
    rows.push(el('div', { class: 'cmp' },
      el('div', { class: 'cmp-head' }, el('span', {}, label), el('span', { class: 'chip' + (d === 0 ? '' : ' gold') }, arrow + ' ' + (d > 0 ? '+' : d < 0 ? '−' : '') + fmtN(Math.abs(d)) + ' ' + unit)),
      el('div', { class: 'cmp-bar' }, el('span', { class: 'cmp-l' }, 'Antes'), el('div', { class: 'cmp-t' }, el('i', { class: 'a', style: `width:${Math.max(6, (a / max) * 100)}%` })), el('span', { class: 'cmp-v' }, fmtN(a))),
      el('div', { class: 'cmp-bar' }, el('span', { class: 'cmp-l' }, 'Ahora'), el('div', { class: 'cmp-t' }, el('i', { class: 'b', style: `width:${Math.max(6, (b / max) * 100)}%` })), el('span', { class: 'cmp-v' }, fmtN(b)))));
    if (label === 'Masa muscular' && d > 0) notes.push('Subiste ' + fmtN(d) + ' kg de masa muscular.');
    if (label === 'Grasa corporal' && d < 0) notes.push('Tu porcentaje de grasa bajó ' + fmtN(Math.abs(d)) + ' puntos.');
  }
  if (!rows.length) return null;
  return el('div', { class: 'cmp-wrap' },
    el('h3', { class: 'cmp-title' }, 'Tu avance'),
    el('p', { class: 'muted', style: 'font-size:13px;margin:0 0 12px' }, 'Tu control del ' + fmtDate(cur.measured_on) + ' comparado con el del ' + fmtDate(prev.measured_on) + '.'),
    notes.length ? el('p', { class: 'ok', style: 'margin:0 0 12px' }, '✦ ' + notes.join(' ')) : '',
    ...rows);
}

// Análisis completo en palabras simples (usa METRICAS de /metricas.js). cur y prev: {measured_on, weight_kg, ..., extra}.
function analysisBlock(cur, prev) {
  const C = window.METRICAS; if (!C || !cur) return null;
  const secs = [];
  for (const [sec, title] of C.secs) {
    const items = [];
    for (const d of C.list.filter((x) => x.sec === sec)) {
      const v = C.get(cur, d); if (v === null) continue;
      const rg = d.range && cur.extra && cur.extra.ranges ? cur.extra.ranges[d.range] : null;
      const a = prev ? C.get(prev, d) : null;
      let chip = '';
      if (a !== null) {
        const diff = Math.round((v - a) * Math.pow(10, d.dec)) / Math.pow(10, d.dec);
        const tone = diff === 0 || d.good === 0 ? '' : (diff > 0) === (d.good > 0) ? ' up' : ' dn';
        chip = el('span', { class: 'mx-chg' + tone, title: 'Cambio desde ' + fmtDate(prev.measured_on) }, (diff > 0 ? '+' : diff < 0 ? '−' : '') + fmtN(Math.abs(diff)) + (d.unit && d.unit !== '/100' ? ' ' + d.unit : '') + ' vs. anterior');
      }
      const unit = d.unit === '/100' ? '/100' : d.unit;
      const val = (d.dec === 2 ? v.toFixed(2).replace('.', ',') : fmtN(v)) + (unit ? (unit === '/100' ? '' : ' ') + unit : '');
      const top = rg ? rangeBar(d.label, v, d.unit, rg) : el('div', { class: 'rb-head' }, el('span', {}, d.label), el('strong', {}, val));
      items.push(el('div', { class: 'mx' }, top, chip ? el('div', {}, chip) : '', el('p', { class: 'mx-what' }, d.what)));
    }
    if (items.length) secs.push(el('div', { class: 'mx-sec' }, el('h3', { class: 'cmp-title' }, title), ...items));
  }
  if (!secs.length) return null;
  return el('div', { class: 'mx-wrap' }, ...secs,
    el('p', { class: 'muted', style: 'font-size:12.5px;margin:14px 0 0' }, C.BIA_NOTE),
    disclaimerBox());
}
function disclaimerBox() {
  return el('p', { class: 'disc', role: 'note' }, el('strong', {}, 'Importante: '), window.METRICAS ? window.METRICAS.DISCLAIMER : 'Yohi es preparadora física. Este análisis es una ayuda y no reemplaza una consulta nutricional ni médica.');
}

sparkles();
