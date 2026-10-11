/* Lector de informes de composición corporal (Body Pro Go / Fitdays) que se ejecuta SOLO en el navegador.
   Acepta la imagen que entrega la app (PNG/JPG) o un PDF. El archivo no se envía a ningún servidor al leerlo.
   Devuelve { date, core, extra, found }. */
(function () {
  const norm = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const N = '(\\d+(?:[.,]\\d+)?)';
  const num = (s) => parseFloat(String(s).replace(',', '.'));

  async function readLines(file) {
    const pdfjs = await import('/vendor/pdfjs/pdf.mjs');
    pdfjs.GlobalWorkerOptions.workerSrc = '/vendor/pdfjs/pdf.worker.mjs';
    const data = new Uint8Array(await file.arrayBuffer());
    const doc = await pdfjs.getDocument({ data, isEvalSupported: false, disableFontFace: true }).promise;
    const lines = [];
    for (let p = 1; p <= Math.min(doc.numPages, 3); p++) {
      const page = await doc.getPage(p);
      const vp = page.getViewport({ scale: 1 });
      const tc = await page.getTextContent();
      const items = tc.items.filter((i) => i.str && i.str.trim()).map((i) => ({ s: i.str.trim(), x: i.transform[4], y: i.transform[5] }));
      const portrait = vp.width < vp.height * 0.9;
      const cols = portrait ? [items.filter((i) => i.x < vp.width * 0.58), items.filter((i) => i.x >= vp.width * 0.58)] : [items];
      for (const col of cols) {
        col.sort((a, b) => b.y - a.y || a.x - b.x);
        let cur = [], y0 = null;
        const flush = () => { if (cur.length) lines.push(cur.sort((a, b) => a.x - b.x).map((i) => i.s).join(' ')); cur = []; };
        for (const it of col) {
          if (y0 !== null && Math.abs(it.y - y0) > 3) flush();
          if (!cur.length) y0 = it.y;
          cur.push(it);
        }
        flush();
      }
    }
    return lines;
  }

  const isImage = (f) => /^image\//.test(f.type || '') || /\.(png|jpe?g|webp|heic|heif)$/i.test(f.name || '');

  async function loadImage(file) {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.decoding = 'async';
      img.src = url;
      await img.decode();
      return img;
    } finally { setTimeout(() => URL.revokeObjectURL(url), 0); }
  }
  const toBlob = (c, type, q) => new Promise((res) => c.toBlob(res, type, q));

  // Copia en JPEG, achicada y sin metadatos (fecha, ubicación del teléfono, etc.), para guardar en la ficha.
  async function cleanJpeg(file) {
    const img = await loadImage(file);
    const k = Math.min(1, 1600 / img.naturalWidth);
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
    const b = await toBlob(c, 'image/jpeg', 0.88);
    return new File([b], 'informe-bodypro.jpg', { type: 'image/jpeg' });
  }

  let worker = null, seq = 0, lastLines = [];
  const pending = new Map();
  function ocr(images) {
    if (!worker) {
      worker = new Worker('/ocr-worker.js');
      worker.onmessage = (ev) => { const p = pending.get(ev.data.id); if (!p) return; pending.delete(ev.data.id); ev.data.error ? p.reject(new Error(ev.data.error)) : p.resolve(ev.data.texts); };
      worker.onerror = () => { for (const p of pending.values()) p.reject(new Error('No se pudo iniciar el lector de imágenes.')); pending.clear(); worker = null; };
    }
    const id = ++seq;
    return new Promise((resolve, reject) => { pending.set(id, { resolve, reject }); worker.postMessage({ id, images }, images); });
  }

  // Prepara la imagen: ancho parejo, y los colores (naranjo, gris) pasan a texto oscuro sobre blanco.
  async function imageLines(file, split) {
    const img = await loadImage(file);
    const k = 1150 / img.naturalWidth;
    const W = 1150, H = Math.round(img.naturalHeight * k);
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); g.drawImage(img, 0, 0, W, H);
    const d = g.getImageData(0, 0, W, H), px = d.data;
    for (let i = 0; i < px.length; i += 4) { const v = Math.min(px[i], px[i + 1], px[i + 2]); px[i] = px[i + 1] = px[i + 2] = v; }
    g.putImageData(d, 0, 0);
    const parts = split ? [[0, Math.round(W * 0.6)], [Math.round(W * 0.6), W]] : [[0, W]];
    const bufs = [];
    for (const [x0, x1] of parts) {
      const p = document.createElement('canvas'); p.width = x1 - x0; p.height = H;
      p.getContext('2d').drawImage(c, x0, 0, x1 - x0, H, 0, 0, x1 - x0, H);
      bufs.push(await (await toBlob(p, 'image/png')).arrayBuffer());
    }
    const texts = await ocr(bufs);
    lastLines = texts.join('\n').split('\n').map((l) => l.trim()).filter(Boolean);
    return lastLines;
  }

  function parse(rawLines) {
    const lines = rawLines.map(norm);
    const extra = {}, ranges = {}, core = {};
    let date = null;
    const rowRe = (label) => new RegExp('^' + label + '\\s+' + N + '\\s*\\(\\s*' + N + '\\s*[-–]\\s*' + N + '\\s*\\)(?:\\s+' + N + ')?');
    const row = (label) => { for (const l of lines) { const m = l.match(rowRe(label)); if (m) return { v: num(m[1]), lo: num(m[2]), hi: num(m[3]), pct: m[4] ? num(m[4]) : null }; } return null; };
    const one = (re) => { for (const l of lines) { const m = l.match(re); if (m) return num(m[1]); } return null; };
    const put = (obj, k, v) => { if (v !== null && Number.isFinite(v)) obj[k] = v; };

    const peso = row('peso'), grasa = row('grasa corporal'), hueso = row('masa esqueletica'), prot = row('cantidad de proteina');
    const agua = row('contenido de agua'), musc = row('masa muscular'), esq = row('musculo esqueletico');
    if (peso) { put(core, 'weight_kg', peso.v); ranges.weight = [peso.lo, peso.hi]; }
    if (musc) { put(core, 'muscle_kg', musc.v); ranges.muscle = [musc.lo, musc.hi]; }
    if (grasa) { put(extra, 'fat_kg', grasa.v); ranges.fat = [grasa.lo, grasa.hi]; if (grasa.pct) put(core, 'fat_pct', grasa.pct); }
    if (hueso) put(extra, 'bone_kg', hueso.v);
    if (prot) { put(extra, 'protein_kg', prot.v); ranges.protein = [prot.lo, prot.hi]; }
    if (agua) { put(extra, 'water_kg', agua.v); ranges.water = [agua.lo, agua.hi]; }
    if (esq) { put(extra, 'skeletal_kg', esq.v); ranges.skeletal = [esq.lo, esq.hi]; }

    if (core.fat_pct === undefined) { for (const l of lines) { if (/tasa de grasa corporal/.test(l)) { const all = [...l.matchAll(/(\d+(?:[.,]\d+)?)/g)].map((m) => num(m[1])).filter((v) => v >= 2 && v <= 70); if (all.length) { core.fat_pct = all[all.length - 1]; break; } } } }
    for (const l of lines) { const m = l.match(/(\d{1,3})\s*\/\s*100/); if (m) { put(extra, 'score', num(m[1])); break; } }
    if (extra.score === undefined) { for (let i = 0; i < lines.length; i++) { if (/puntuacion corporal/.test(lines[i])) { for (const l of lines.slice(i + 1, i + 3)) { const m = l.match(/^(\d{1,3})\b.*puntos/); if (m && num(m[1]) <= 150) { put(extra, 'score', num(m[1])); break; } } break; } } }
    put(extra, 'target_kg', one(new RegExp('peso objetivo recomendado\\s+' + N + '\\s*kg')));
    put(extra, 'visceral', one(new RegExp('grado de grasa visceral\\s+' + N)));
    put(extra, 'bmr', one(new RegExp('tasa metabolica basal\\s+' + N)));
    put(extra, 'lean_kg', one(new RegExp('peso corporal sin grasa\\s+' + N)));
    put(extra, 'subcut_pct', one(new RegExp('grasa subcutanea\\s+' + N)));
    put(extra, 'asmi', one(new RegExp('^asmi\\s+' + N)));
    put(extra, 'body_age', one(new RegExp('edad corporal\\s+' + N)));
    put(extra, 'whr', one(new RegExp('^whr\\s+' + N)));
    for (let i = 0; i < lines.length - 1; i++) { if (/^imc\b[^\d]*$/.test(lines[i])) { const m = lines[i + 1].match(new RegExp('^' + N)); if (m && num(m[1]) >= 10 && num(m[1]) <= 60) { put(extra, 'bmi', num(m[1])); break; } } }
    const h = one(/alto:\s*(\d+)\s*c[mn]/);
    if (extra.bmi === undefined && h && core.weight_kg) put(extra, 'bmi', Math.round((core.weight_kg / ((h / 100) ** 2)) * 10) / 10);
    for (const l of lines) { const m = l.match(/hora de la prueba:\s*(\d{2})\/(\d{2})\/(\d{4})/); if (m) { date = `${m[3]}-${m[2]}-${m[1]}`; break; } }
    // Descarta lecturas imposibles (por ejemplo un 0,94 leído como 94).
    const cat = window.METRICAS && window.METRICAS.byKey;
    if (cat) for (const obj of [core, extra]) for (const k of Object.keys(obj)) { const d = cat[k]; if (d && (obj[k] < d.min || obj[k] > d.max)) delete obj[k]; }
    for (const k of Object.keys(ranges)) { const [lo, hi] = ranges[k]; if (!(lo >= 0 && hi > lo)) delete ranges[k]; }
    if (Object.keys(ranges).length) extra.ranges = ranges;
    const found = Object.keys(core).length + Object.keys(extra).filter((k) => k !== 'ranges').length;
    return { date, core, extra, found };
  }

  window.BodyPro = {
    // Lee la imagen o el PDF y devuelve los datos encontrados. Lanza un Error con mensaje legible si no se puede leer.
    async read(file) {
      if (!file) throw new Error('Elige un archivo.');
      if (isImage(file)) {
        if (file.size > 15 * 1024 * 1024) throw new Error('La imagen pesa más de 15 MB.');
        let r;
        try {
          r = parse(await imageLines(file, true));
          if (r.found < 4) { const r2 = parse(await imageLines(file, false)); if (r2.found > r.found) r = r2; }
        } catch (e) { throw new Error(e && e.message && /lector/.test(e.message) ? e.message : 'No pude leer esa imagen. Prueba con la captura original del informe.'); }
        if (!r.found) throw new Error('No encontré datos de composición corporal en esa imagen. Usa la captura completa del informe de Body Pro Go, sin recortar.');
        return r;
      }
      if (file.size > 4 * 1024 * 1024) throw new Error('El PDF pesa más de 4 MB.');
      let lines;
      try { lines = await readLines(file); } catch (e) { throw new Error('No pude abrir ese archivo. Sube la imagen del informe o un PDF.'); }
      const r = parse(lines);
      if (!r.found) throw new Error('No encontré datos de composición corporal en ese PDF. Puede ser una imagen escaneada o de otro formato.');
      return r;
    },
    isImage,
    get lastLines() { return lastLines; },
    cleanJpeg,
    parse,
  };
})();
