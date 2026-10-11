/* Informe de composición corporal con el logo de Yohi Coach. Se arma en el navegador y se guarda como PDF
   desde el diálogo de impresión ("Guardar como PDF"). No envía nada a ningún servidor. */
(function () {
  const fmt = (v, d) => (Math.round(v * 10) / 10).toFixed(d === undefined ? 1 : d).replace('.', ',');
  const MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const longDate = (iso) => { const [y, m, d] = String(iso).split('-').map(Number); return d + ' de ' + MES[m - 1] + ' de ' + y; };
  const el = (tag, attrs, ...kids) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) { if (v !== undefined && v !== null) n.setAttribute(k, v); }
    for (const c of kids.flat()) { if (c !== null && c !== undefined && c !== false) n.append(c.nodeType ? c : document.createTextNode(String(c))); }
    return n;
  };

  function build(o) {
    if (!window.METRICAS) throw new Error('Falta /metricas.js');
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

    const notes = [], C = window.METRICAS, used = [];
    let n = 0;
    for (const [sec, title] of C.secs) {
      const trs = [];
      for (const d of C.list.filter((q) => q.sec === sec)) {
        const b = C.get(cur, d); if (b === null) continue;
        used.push(d);
        const a = prev ? C.get(prev, d) : null, dec = d.dec, unit = d.unit;
        const rg = d.range && cur.extra && cur.extra.ranges ? cur.extra.ranges[d.range] : null;
        let ref = '—';
        if (rg) { ref = b < rg[0] ? 'Bajo el rango' : b > rg[1] ? 'Sobre el rango' : 'Dentro del rango'; ref += ' (' + fmt(rg[0], dec) + '–' + fmt(rg[1], dec) + ' ' + unit + ')'; }
        let chg = null;
        if (prev && a !== null) {
          const dd = Math.round((b - a) * Math.pow(10, dec)) / Math.pow(10, dec);
          const cls = dd === 0 ? 'eq' : (d.good === 0 ? 'neu' : (dd > 0) === (d.good > 0) ? 'up' : 'dn');
          chg = el('span', { class: 'ir-chg ' + cls }, (dd > 0 ? '+' : dd < 0 ? '−' : '') + fmt(Math.abs(dd), dec) + (unit && unit !== '/100' ? ' ' + unit : ''));
          if (d.key === 'muscle_kg' && dd > 0) notes.push('masa muscular +' + fmt(dd) + ' kg');
          if (d.key === 'fat_pct' && dd < 0) notes.push('grasa corporal −' + fmt(Math.abs(dd)) + ' puntos');
        }
        const val = (v) => (v !== null ? fmt(v, dec) + (unit ? (unit === '/100' ? '' : ' ') + unit : '') : '—');
        trs.push(el('tr', {}, el('th', {}, d.label), prev ? el('td', {}, val(a)) : null, el('td', { class: 'ir-cur' }, val(b)), prev ? el('td', {}, chg || '—') : null, el('td', { class: 'ir-ref' }, ref)));
      }
      if (!trs.length) continue;
      n++;
      root.append(el('h2', {}, n + '. ' + title), el('table', {},
        el('thead', {}, el('tr', {}, el('th', {}, 'Dato'), prev ? el('th', {}, 'Anterior') : null, el('th', {}, 'Actual'), prev ? el('th', {}, 'Cambio') : null, el('th', {}, 'Referencia del informe'))),
        el('tbody', {}, trs)));
    }
    if (prev && notes.length) root.insertBefore(el('p', { class: 'ir-sum' }, 'Entre ambos controles: ' + notes.join(' y ') + '. ¡Sigue así!'), root.children[2]);
    if (used.length) {
      root.append(el('h2', { class: 'ir-break' }, 'Qué significa cada dato'),
        el('dl', { class: 'ir-gl' }, ...used.flatMap((d) => [el('dt', {}, d.label), el('dd', {}, d.what)])));
    }
    root.append(el('p', { class: 'ir-disc' }, el('strong', {}, 'Importante: '), C.DISCLAIMER),
      el('p', { class: 'ir-note' }, C.BIA_NOTE + ' Los rangos son los que entrega la app del equipo.'),
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
