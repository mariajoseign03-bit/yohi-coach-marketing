/* Lee el texto de una imagen dentro del navegador (Tesseract, WebAssembly). La imagen no sale del dispositivo. */
/* global TesseractCore */
importScripts('/vendor/tesseract/tesseract-core-lstm.js');

let ready = null;
function init() {
  if (!ready) {
    ready = (async () => {
      const M = await TesseractCore({ locateFile: (f) => '/vendor/tesseract/' + f });
      const r = await fetch('/vendor/tesseract/spa.traineddata');
      if (!r.ok) throw new Error('No se pudo cargar el lector.');
      M.FS.writeFile('spa.traineddata', new Uint8Array(await r.arrayBuffer()));
      const api = new M.TessBaseAPI();
      if (api.Init(null, 'spa') !== 0) throw new Error('No se pudo iniciar el lector.');
      api.SetPageSegMode(4); // columnas de texto con líneas de distinto tamaño
      return { M, api };
    })();
    ready.catch(() => { ready = null; });
  }
  return ready;
}

self.onmessage = async (ev) => {
  const { id, images } = ev.data;
  try {
    const { M, api } = await init();
    const texts = [];
    for (const buf of images) {
      M.FS.writeFile('/input', new Uint8Array(buf));
      api.SetImageFile();
      texts.push(api.GetUTF8Text());
    }
    self.postMessage({ id, texts });
  } catch (e) {
    self.postMessage({ id, error: (e && e.message) || 'Error al leer la imagen.' });
  }
};
