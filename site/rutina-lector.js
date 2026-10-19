/* Lector de rutinas (PDF, Excel .xlsx, CSV o TXT) que se ejecuta SOLO en el navegador.
   El archivo no se envía a ningún servidor al leerlo. Devuelve { exercises, missingRest, rows }.
   Es una lectura automática: Yohi siempre revisa los datos en el formulario antes de guardar. */
(function () {
  const norm = (s) => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  const clean = (s) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  const DAY_RE = /^(dia\s*\d+|dia\s*[a-e]\b|lunes|martes|miercoles|jueves|viernes|sabado|domingo)\b/;

  // ---------- Excel (.xlsx): un zip con XML, leído sin librerías ----------
  async function unzip(buf) {
    const dv = new DataView(buf), u8 = new Uint8Array(buf), dec = new TextDecoder();
    let eocd = -1;
    for (let i = u8.length - 22; i >= Math.max(0, u8.length - 65557); i--) { if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; } }
    if (eocd < 0) throw new Error('Ese archivo no es un Excel válido.');
    const n = dv.getUint16(eocd + 10, true);
    let p = dv.getUint32(eocd + 16, true);
    const files = {};
    for (let k = 0; k < n; k++) {
      if (dv.getUint32(p, true) !== 0x02014b50) break;
      const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true);
      const nlen = dv.getUint16(p + 28, true), elen = dv.getUint16(p + 30, true), clen = dv.getUint16(p + 32, true);
      const off = dv.getUint32(p + 42, true);
      files[dec.decode(u8.subarray(p + 46, p + 46 + nlen))] = { method, csize, off };
      p += 46 + nlen + elen + clen;
    }
    return {
      names: Object.keys(files),
      async get(name) {
        const f = files[name]; if (!f) return null;
        const start = f.off + 30 + dv.getUint16(f.off + 26, true) + dv.getUint16(f.off + 28, true);
        const data = u8.subarray(start, start + f.csize);
        if (f.method === 0) return dec.decode(data);
        if (typeof DecompressionStream === 'undefined') throw new Error('Este navegador no puede abrir Excel. Sube el PDF o actualiza el navegador.');
        return await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text();
      },
    };
  }
  const unesc = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d)).replace(/&amp;/g, '&');
  const textOf = (xml) => unesc([...xml.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((m) => m[1]).join(''));
  const colIdx = (ref) => { let n = 0; for (const ch of ref.replace(/\d+/g, '')) n = n * 26 + ch.charCodeAt(0) - 64; return n - 1; };

  async function xlsxRows(file) {
    const z = await unzip(await file.arrayBuffer());
    const ssXml = await z.get('xl/sharedStrings.xml');
    const shared = ssXml ? [...ssXml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map((m) => textOf(m[1])) : [];
    const sheets = z.names.filter((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n)).sort((a, b) => parseInt(a.match(/\d+/)[0]) - parseInt(b.match(/\d+/)[0]));
    if (!sheets.length) throw new Error('No encontré hojas en ese Excel.');
    const rows = [];
    for (const name of sheets) {
      const xml = await z.get(name);
      for (const rm of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
        const cells = [];
        for (const cm of rm[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
          const attrs = cm[1], body = cm[2] || '';
          const ref = (attrs.match(/\br="([A-Z]+\d+)"/) || [])[1];
          const t = (attrs.match(/\bt="(\w+)"/) || [])[1];
          let val = '';
          if (t === 's') { const v = body.match(/<v>(\d+)<\/v>/); val = v ? (shared[+v[1]] || '') : ''; }
          else if (t === 'inlineStr') val = textOf(body);
          else { const v = body.match(/<v>([\s\S]*?)<\/v>/); val = v ? unesc(v[1]) : ''; }
          const i = ref ? colIdx(ref) : cells.length;
          while (cells.length < i) cells.push('');
          cells[i] = clean(val);
        }
        if (cells.some(Boolean)) rows.push(cells);
      }
    }
    return rows;
  }

  // ---------- PDF: cada línea separa sus celdas por los espacios grandes ----------
  async function pdfRows(file) {
    const pdfjs = await import('/vendor/pdfjs/pdf.mjs');
    pdfjs.GlobalWorkerOptions.workerSrc = '/vendor/pdfjs/pdf.worker.mjs';
    const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false, disableFontFace: true }).promise;
    const rows = [];
    for (let p = 1; p <= Math.min(doc.numPages, 12); p++) {
      const tc = await (await doc.getPage(p)).getTextContent();
      const items = tc.items.filter((i) => i.str && i.str.trim()).map((i) => ({ s: i.str, x: i.transform[4], y: i.transform[5], w: i.width || 0 }));
      items.sort((a, b) => b.y - a.y || a.x - b.x);
      let line = [], y0 = null;
      const flush = () => {
        if (!line.length) return;
        line.sort((a, b) => a.x - b.x);
        const cells = [], xs = []; let cur = '', start = 0, end = null;
        const commit = () => { const t = clean(cur); if (t) { cells.push(t); xs.push((start + end) / 2); } cur = ''; };
        for (const it of line) {
          if (end !== null && it.x - end > 10) commit();
          if (!cur) start = it.x;
          cur += it.s; end = it.x + it.w;
        }
        commit();
        cells.xs = xs; rows.push(cells); line = [];
      };
      for (const it of items) { if (y0 !== null && Math.abs(it.y - y0) > 3) flush(); if (!line.length) y0 = it.y; line.push(it); }
      flush();
    }
    return rows;
  }

  async function textRows(file) {
    const txt = await file.text();
    return txt.split(/\r?\n/).map((l) => (l.includes(';') || l.includes('\t') ? l.split(/;|\t/) : /,\s*\d/.test(l) && l.split(',').length >= 3 ? l.split(',') : [l])).map((c) => c.map(clean)).filter((c) => c.some(Boolean));
  }

  // ---------- Interpretación de filas ----------
  function restFrom(raw, bare) {
    const t = norm(raw).replace(',', '.').replace(/[′’ʼ´‘]/g, "'").replace(/[″”“]/g, '"');
    let m = t.match(/(\d+)\s*[:'’](\d{2})/); if (m) return +m[1] * 60 + +m[2];
    m = t.match(/(\d+(?:\.\d+)?)\s*(?:min|minutos?|m\b|')/); if (m) return Math.round(parseFloat(m[1]) * 60);
    m = t.match(/(\d+)\s*(?:s\b|seg|segundos?|")/); if (m) return +m[1];
    if (bare) { m = t.match(/^(\d+(?:\.\d+)?)$/); if (m) { const v = parseFloat(m[1]); return Math.round(v <= 10 ? v * 60 : v); } }
    return null;
  }
  const cleanName = (s) => clean(s).replace(/^\s*(?:\d{1,2}\s*[.)\-–]|[•·*\-–])\s*/, '').replace(/[:\-–|]+$/, '').trim();
  const BAD_NAME = /^(ejercicios?|series?|reps?|repeticiones|descanso|pausa|nota|notas|observaciones?|calentamiento|total|semana|dia|rutina|plan|nombre|alumn[ao]|fecha|rir|peso|kg|tempo|carga)\b/;
  const okName = (n) => n.length >= 3 && n.length <= 80 && /[a-záéíóúñ]{3}/i.test(n) && !BAD_NAME.test(norm(n)) && !DAY_RE.test(norm(n));
  const WEEKDAY_RE = /\b(lunes|martes|miercoles|jueves|viernes|sabado|domingo)\b/;
  function normDay(label, idx) {
    const t = norm(label), m = t.match(/\bdia\s*(\d+)/);
    if (m) return 'Día ' + m[1];
    return WEEKDAY_RE.test(t) ? 'Día ' + (idx + 1) : clean(label);
  }
  const noteClean = (t) => (/^[-–—.·\s]*$/.test(t || '') ? '' : clean(t).slice(0, 200));
  const repsClean = (s) => clean(s).replace(/[–—]/g, '-').replace(/\s*-\s*/g, '-').slice(0, 20);

  const HEAD = [['name', /^(ejercicio|ejercicios|movimiento|nombre)/], ['sets', /^(series?|sets?)\b/], ['reps', /^(reps?|repeticiones|rango)/],
    ['rest', /^(desc|pausa|rest)/], ['warm', /^(calent|warm)/], ['notes', /^(nota|notas|obs|indicacion|comentario|cue)/]];
  function headerMap(row) {
    const map = {};
    row.forEach((c, i) => {
      const t = norm(c);
      for (const [k, re] of HEAD) if (map[k] === undefined && re.test(t)) { map[k] = i; if (row.xs) (map.hx = map.hx || {})[k] = row.xs[i]; break; }
    });
    return map.name !== undefined && (map.sets !== undefined || map.reps !== undefined) ? map : null;
  }
  // Cada celda va a la columna del encabezado más cercana (en PDF faltan celdas vacías y los índices se corren).
  function getter(row, map) {
    if (map.hx && row.xs) {
      const got = {};
      row.forEach((c, i) => {
        let best = null, bd = 1e9;
        for (const k in map.hx) { const d = Math.abs(row.xs[i] - map.hx[k]); if (d < bd) { bd = d; best = k; } }
        if (best && bd < 90) got[best] = (got[best] ? got[best] + ' ' : '') + c;
      });
      return (k) => clean(got[k] || '');
    }
    return (k) => (map[k] !== undefined ? clean(row[map[k]] || '') : '');
  }

  function parseRows(rows) {
    const out = []; let map = null, day = '';
    const push = (ex) => { if (okName(ex.name) && out.length < 60) out.push(ex); };
    for (const row of rows) {
      const text = clean(row.join(' '));
      if (!text) continue;
      const hm = headerMap(row);
      if (hm) { map = hm; continue; }
      const nt = norm(text);
      if (DAY_RE.test(nt) && !/\d\s*[x×]\s*\d/.test(nt) && row.filter((c) => /\d/.test(c)).length <= 1) { day = clean(text).slice(0, 30); continue; }

      let ex = null;
      if (map) {
        const g = getter(row, map);
        const name = cleanName(g('name'));
        if (name) {
          let sets = parseInt(g('sets'), 10), reps = repsClean(g('reps'));
          const both = (g('sets') || g('reps')).match(/(\d{1,2})\s*[x×]\s*(\d{1,3}(?:\s*[-–]\s*\d{1,3})?)/i);
          if (both && !(sets > 0 && reps)) { sets = +both[1]; reps = repsClean(both[2]); }
          if (sets > 0 || reps) {
            ex = { name, sets: sets > 0 && sets <= 20 ? sets : 3, reps: reps || '8-12', restSec: g('rest') ? restFrom(g('rest'), true) : null,
              warmupSets: g('warm') ? Math.min(5, parseInt(g('warm'), 10) || 0) : 0, notes: g('notes') };
          }
        }
      }
      if (!ex) {
        const m = text.match(/(\d{1,2})\s*(?:[x×]|series?\s*(?:de|x)?)\s*(\d{1,3}(?:\s*[-–]\s*\d{1,3})?)(?!\d)/i);
        if (m) {
          const name = cleanName(text.slice(0, m.index));
          const rest = text.slice(m.index + m[0].length);
          let r = null;
          const km = norm(text).match(/(?:desc\w*|pausa|rest)\s*:?\s*([\d:'’.,]+\s*(?:min|minutos?|seg|segundos?|s|m)?)/);
          if (km) r = restFrom(km[1], true); else { const um = norm(rest).match(/(\d+(?:[.,]\d+)?\s*(?:min|minutos?|seg|segundos?|s\b)|\d+\s*[:'’]\s*\d{2})/); if (um) r = restFrom(um[1], false); }
          const wm = norm(text).match(/calent\w*\s*:?\s*[x×]?\s*(\d)/);
          ex = { name, sets: Math.min(20, +m[1]) || 3, reps: repsClean(m[2]), restSec: r, warmupSets: wm ? +wm[1] : 0, notes: '' };
        } else if (row.length >= 3) {
          // "Press banca | 3 | 10 | 90s" sin encabezado
          const name = cleanName(row[0]);
          const nums = row.slice(1).map((c) => clean(c)).filter((c) => /^\d{1,3}(?:\s*[-–]\s*\d{1,3})?$/.test(c));
          if (name && /\D/.test(name) && nums.length >= 2 && /^\d{1,2}$/.test(nums[0])) {
            ex = { name, sets: Math.min(20, +nums[0]) || 3, reps: repsClean(nums[1]), restSec: row.slice(1).map((c) => restFrom(c, false)).find((v) => v) || (nums[2] ? restFrom(nums[2], true) : null), warmupSets: 0, notes: '' };
          }
        }
      }
      if (ex) {
        ex.day = day;
        ex.notes = noteClean(ex.notes);
        push(ex);
      }
    }
    // Los días se guardan como "Día 1", "Día 2"… (si el archivo dice Lunes, Martes…, se numeran en orden).
    const labels = [...new Set(out.map((e) => e.day).filter(Boolean))];
    const dayMap = {};
    labels.forEach((l, i) => { dayMap[l] = normDay(l, i); });
    for (const e of out) if (e.day) e.day = dayMap[e.day];
    const missingRest = out.filter((e) => e.restSec == null || !(e.restSec >= 0)).length;
    for (const e of out) {
      if (e.restSec == null || !(e.restSec >= 0)) e.restSec = 90;
      if (e.restSec > 0 && e.restSec < 10) e.restSec *= 60; // un descanso de 1–9 s no existe: era en minutos
      e.restSec = Math.min(600, Math.round(e.restSec));
    }
    return { exercises: out, missingRest, rows: rows.length };
  }

  async function read(file) {
    const n = (file.name || '').toLowerCase();
    let rows;
    if (/\.pdf$/.test(n) || file.type === 'application/pdf') rows = await pdfRows(file);
    else if (/\.xlsx$/.test(n)) rows = await xlsxRows(file);
    else if (/\.xls$/.test(n)) throw new Error('Ese Excel es del formato antiguo (.xls). Ábrelo y guárdalo como .xlsx, o sube el PDF.');
    else if (/\.(csv|txt)$/.test(n)) rows = await textRows(file);
    else throw new Error('Sube un PDF o un Excel (.xlsx).');
    return parseRows(rows);
  }

  const api = { read, parseRows, restFrom, xlsxRows, normDay };
  if (typeof window !== 'undefined') window.RoutineReader = api;
  if (typeof module !== 'undefined') module.exports = api;
})();
