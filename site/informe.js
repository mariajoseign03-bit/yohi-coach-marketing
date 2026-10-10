/* Informe de composición corporal con el logo de Yohi Coach. Se arma en el navegador y se guarda como PDF
   desde el diálogo de impresión ("Guardar como PDF"). No envía nada a ningún servidor. */
(function () {
  const fmt = (v, d) => (Math.round(v * 10) / 10).toFixed(d === undefined ? 1 : d).replace('.', ',');
  const MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const longDate = (iso) => { const [y, m, d] = String(iso).split('-').map(Number); return d + ' de ' + MES[m - 1] + ' de ' + y; };
  const x = (m) => (m && m.extra) || {};
  const SECTIONS = [
    ['1. Masa magra y musculatura', [
      ['Masa muscular', 'kg', (m) => m.muscle_kg, 'muscle', 1, 1],
      ['Músculo esquelético', 'kg', (m) => x(m).skeletal_kg, 'skeletal', 1, 1],
      ['Masa ósea', 'kg', (m) => x(m).bone_kg, null, 1, 0],
      ['Cantidad de proteína', 'kg', (m) => x(m).protein_kg, 'protein', 1, 1],
      ['Contenido de agua', 'kg', (m) => x(m).water_kg, 'water', 1, 0]]],
    ['2. Grasa corporal', [
      ['Grasa corporal', 'kg', (m) => x(m).fat_kg, 'fat', 1, -1],
      ['Grasa corporal', '%', (m) => m.fat_pct, null, 1, -1],
      ['Grasa visceral (nivel)', '', (m) => x(m).visceral, null, 0, -1],
      ['Grasa subcutánea', '%', (m) => x(m).subcut_pct, null, 1, -1]]],
    ['3. Peso y metabolismo', [
      ['Peso', 'kg', (m) => m.weight_kg, 'weight', 1, 0],
      ['Peso objetivo sugerido por el equipo', 'kg', (m) => x(m).target_kg, null, 1, 0],
      ['Tasa metabólica basal', 'kcal', (m) => x(m).bmr, null, 0, 0],
      ['IMC', '', (m) => x(m).bmi, null, 1, 0],
      ['Puntaje corporal', '/100', (m) => x(m).score, null, 0, 1]]],
  ];
  const el = (tag, attrs, ...kids) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) { if (v !== undefined && v !== null) n.setAttribute(k, v); }
    for (const c of kids.flat()) { if (c !== null && c !== undefined && c !== false) n.append(c.nodeType ? c : document.createTextNode(String(c))); }
    return n;
  };

  function build(o) {
    const cur = o.cur, prev = o.prev || null;
    const root = el('div', { id: 'yohi-report', 'aria-hidden': 'true' });
    root.append(el('div', { class: 'ir-head' },
      el('img', { src: '/logo-yohi.webp', alt: 'Yohi Coach', width: '84', height: '84' }),
      el('div', {}, el('p', { class: 'ir-kicker' }, 'Yohi Coach · Entrena con propósito'),
        el('h1', {}, 'Informe de composición corporal'),
        el('p', { class: 'ir-sub' }, 'Medición con Body Pro Go (Fitdays)'))));
    root.append(el('div', { class: 'ir-meta' },
      el('div', {}, el('span', {}, 'Participante'), el('strong', {}, o.name || '—')),
      el('div', {}, el('span', {}, prev ? 'Control anterior' : 'Fecha del control'), el('strong', {}, prev ? longDate(prev.measured_on) : longDate(cur.measured_on))),
      prev ? el('div', {}, el('span', {}, 'Control actual'), el('strong', {}, longDate(cur.measured_on))) : null));

    const notes = [];
    for (const [title, rows] of SECTIONS) {
      const trs = [];
      for (const [label, unit, get, rk, dec, good] of rows) {
        const b = get(cur); if (typeof b !== 'number') continue;
        const a = prev ? get(prev) : null;
        const rg = rk && cur.extra && cur.extra.ranges ? cur.extra.ranges[rk] : null;
        let ref = '—';
        if (rg) { ref = b < rg[0] ? 'Bajo el rango' : b > rg[1] ? 'Sobre el rango' : 'Dentro del rango'; ref += ' (' + fmt(rg[0], dec) + '–' + fmt(rg[1], dec) + ' ' + unit + ')'; }
        let chg = null;
        if (prev && typeof a === 'number') {
          const d = Math.round((b - a) * 10) / 10;
          const cls = d === 0 ? 'eq' : (good === 0 ? 'neu' : (d > 0) === (good > 0) ? 'up' : 'dn');
          chg = el('span', { class: 'ir-chg ' + cls }, (d > 0 ? '+' : d < 0 ? '−' : '') + fmt(Math.abs(d), dec) + (unit && unit !== '/100' ? ' ' + unit : ''));
          if (label === 'Masa muscular' && d > 0) notes.push('masa muscular +' + fmt(d) + ' kg');
          if (label === 'Grasa corporal' && unit === '%' && d < 0) notes.push('grasa corporal −' + fmt(Math.abs(d)) + ' puntos');
        }
        const val = (v) => (typeof v === 'number' ? fmt(v, dec) + (unit ? (unit === '/100' ? '' : ' ') + unit : '') : '—');
        trs.push(el('tr', {}, el('th', {}, label + (unit === '%' ? ' (%)' : '')), prev ? el('td', {}, val(a)) : null, el('td', { class: 'ir-cur' }, val(b)), prev ? el('td', {}, chg || '—') : null, el('td', { class: 'ir-ref' }, ref)));
      }
      if (!trs.length) continue;
      root.append(el('h2', {}, title), el('table', {},
        el('thead', {}, el('tr', {}, el('th', {}, 'Parámetro'), prev ? el('th', {}, 'Anterior') : null, el('th', {}, 'Actual'), prev ? el('th', {}, 'Cambio') : null, el('th', {}, 'Referencia del informe'))),
        el('tbody', {}, trs)));
    }
    if (prev && notes.length) root.insertBefore(el('p', { class: 'ir-sum' }, 'Entre ambos controles: ' + notes.join(' y ') + '. ¡Sigue así!'), root.children[2]);
    root.append(el('p', { class: 'ir-note' }, 'Los datos son estimaciones por bioimpedancia, con carácter informativo y referencial: varían con la hidratación, la comida y la hora del día, y se interpretan mirando la tendencia en varios controles. No reemplazan una evaluación médica ni nutricional.'),
      el('div', { class: 'ir-foot' }, el('strong', {}, 'Deja de entrenar por entrenar. Entrena con propósito.'), el('span', {}, 'WhatsApp +56 9 4450 0370 · yohicoach.cl · @yohi.coach')));
    return root;
  }

  window.YohiReport = {
    // cur es obligatorio; prev es opcional. Abre el diálogo para guardar como PDF.
    print(o) {
      const old = document.getElementById('yohi-report'); if (old) old.remove();
      const root = build(o);
      document.body.append(root);
      const prevTitle = document.title;
      document.title = 'Informe Yohi Coach' + (o.name ? ' - ' + o.name : '');
      const img = root.querySelector('img');
      const go = () => { window.print(); };
      const done = () => { document.title = prevTitle; root.remove(); window.removeEventListener('afterprint', done); };
      window.addEventListener('afterprint', done);
      if (img && !img.complete) { img.addEventListener('load', go, { once: true }); img.addEventListener('error', go, { once: true }); } else go();
    },
    build,
  };
})();
