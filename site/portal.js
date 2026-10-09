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
sparkles();
