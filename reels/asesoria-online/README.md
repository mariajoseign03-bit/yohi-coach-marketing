# Historia · Asesoría online 1:1 (@yohi.coach)

Video para historias de Instagram hecho con Remotion (React + TypeScript).
1080×1920 · 30 fps · 35 s · MP4 H.264 yuv420p CRF 18 · AAC 48 kHz (-14 LUFS).

## Previsualizar

```bash
cd reels/asesoria-online
npm i
npx remotion studio
```

Se abre el navegador con el editor. Elige `YohiAsesoriaOnline` y mueve la línea de tiempo.
Los cambios en el código se ven al instante.

## Editar textos y colores

- **Textos:** `src/copy.ts`. Cambia el texto entre comillas y guarda.
  - `resaltar`: palabras que se pintan en rosa. Deben escribirse igual que en el texto, con su puntuación (ej. `"PLAN?"`).
  - Si un texto queda mucho más largo, revisa en el studio que no choque con la zona segura.
- **Colores, tamaños y volumen de cada sonido:** `src/theme.ts`.
- **Tiempos de cada escena:** `src/timing.ts` (en frames: 30 frames = 1 segundo).

## Exportar

```bash
bash scripts/render.sh
```

Genera `out/yohi-asesoria-online.mp4` y `out/portada.png`.

## Música (opcional)

Pon un archivo `public/music.mp3` (con licencia para uso comercial) y vuelve a exportar:
entra al 25 % y hace fade out al final. Si no existe, el video lleva solo efectos.

## Recursos

- `scripts/prepare_assets.py`: recorta los fondos de las ilustraciones de `marca/` → `public/` (sin alterarlas).
- `scripts/make_sfx.py`: genera los efectos de sonido por código (sin derechos) → `public/sfx/`.
- `scripts/qa-stills.mjs` + `scripts/contact.py`: capturas de control por escena en `out/qa/`.
- Fuentes Anton y Montserrat (Google Fonts, licencia OFL) en `public/fonts/`.
