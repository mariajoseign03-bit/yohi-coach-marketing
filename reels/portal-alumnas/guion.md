# Reel · Nueva zona de alumnas (@yohi.coach)

Hecho con **Remotion** (decisión de marca: videos generados desde guion). No usa HyperFrames.
1080×1920 · 30 fps · **26 s** · MP4 H.264 yuv420p CRF 18 · AAC 48 kHz (pista silenciosa).

## Guion final (aprobado con ajustes)

| # | Tiempo | Texto en pantalla | Qué se ve (todo existe en el portal) |
|---|---|---|---|
| 1 | 0–2,5 s | **DEJA DE ENTRENAR POR ENTRENAR.** | Texto gigante con glitch rosa, Yohi entra con pop. Pastilla "NUEVO EN YOHICOACH.CL 💗". |
| 2 | 2,5–6 s | Ahora tu rutina vive en tu celu 📲 | Ventana real "Zona alumnos → Ingresar" (correo y clave demo), tap con glow, entra a "Hola, Alumna". |
| 3 | 6–10 s | Tu rutina por días | "Mi rutina" con Día 1, Día 2 y Día 3 como acordeón; series × reps ampliados en cada ejercicio. |
| 4 | 10–14 s | Anota tus pesos serie a serie | Tabla KG / Reps / RIR escrita en vivo, contador de volumen, "✓ Guardado" y badge verde. |
| 5 | 14–17 s | Con temporizador de descanso | Temporizador dorado (01:30 → ¡A entrenar!) con Yohi rebotando al lado. |
| 6 | 17–20 s | ¿Algo se sintió raro? Déjale una observación 📝 | Se escribe la nota en "Observaciones para Yohi", se guarda y viaja a Yohi. |
| 7 | 20–23 s | Y Yohi lo ve todo — y también puede registrar tus pesos | Pantalla dividida: alumna / vista admin con el mismo registro, la 📝 y "Registrar / corregir pesos". |
| 8 | 23–26 s | **ENTRENA CON PROPÓSITO. PROGRESA DE VERDAD.** + **Pide tu cuenta en yohicoach.cl** | Yohi, wordmark YOHI COACH 💗 y CTA. |

## Ajustes respecto al encargo (por fidelidad al portal)
- **"Temporizador", no "cronómetro".** El portal lo llama TEMPORIZADOR y cuenta hacia atrás desde 01:30.
- **El temporizador es dorado** (#F2C76E), como en `portal.css`. El rosa queda en Yohi y en el glow.
- **Cuenta regresiva acelerada** (90 s en ~1,5 s) para que quepa en 3 s. Lo dice la etiqueta de la escena.
- **Pantallas en #0B0B0B** (fondo real del portal); el fondo del video es #111111.
- **"Sincronizándose" se muestra sin tiempo real.** Yohi ve el registro al abrir "Ver registro de la alumna". El motion muestra que es el mismo dato (etiqueta "mismo registro"), sin decir "en vivo".
- **Cierre sin logo circular.** `logo_yohi.png` tiene ojos grandes sin lentes y Yohi del temporizador tiene lentes; la guía pide no mezclar estilos. Se usa el wordmark "YOHI COACH 💗".
- **Series × reps en grande** es zoom/énfasis del texto real ("4×6-8 · 120s desc"), no un elemento nuevo.
- **CTA "Pide tu cuenta":** coherente con el portal, donde la alumna crea su cuenta y queda pendiente hasta que Yohi la aprueba.

## Datos demo (todo ficticio)
"Alumna demo", correo `alumna.demo@ejemplo.cl`, ejercicios genéricos (Hip thrust, Sentadilla…), pesos 60/60/65 kg, plan 12 oct–12 nov 2026 y la nota "La última serie me costó. Bajé el peso." No hay testimonios, resultados ni cifras reales. Etiqueta "Pantallas con datos demo · Alumna demo" en las escenas 2–6; en la 7 los paneles dicen "Alumna demo".
No se muestran mediciones corporales ni informes del portal. No se usa el sello CERTIFIED.

## Fidelidad: de dónde sale cada pantalla
Código leído de la rama `origin/workers-site` (la rama de trabajo no trae el portal):
- Login: `site/index.html` (`<dialog class="alum">`).
- Encabezado, plan, "Mi rutina", progreso, días, ejercicios, series, temporizador, observaciones: `site/alumnos.html`, `site/training.js`, `site/portal.css`.
- Vista de Yohi: `site/admin.html` ("📊 Ver registro de la alumna", "✏️ Registrar / corregir pesos", "Guardar pesos", notas 📝).
- Personaje: `site/yohi-timer.webp` → `public/yohi-timer.webp`.
- Tipografías del sitio: Anton, Montserrat, Yellowtail (Google Fonts, OFL; guardadas en `public/fonts`).

## Audio
Pista silenciosa `public/audio/pista-silenciosa.wav` (generada con Python, sin derechos de terceros). Sin música ni efectos.
Para agregar sonido, reemplaza ese archivo por un audio con licencia comercial verificable y anota aquí su fuente y licencia.

## Emojis
Imágenes estilo iPhone (`public/emoji/`, paquete `emoji-datasource-apple`). Mismo criterio que los otros reels: no tienen licencia para publicidad pagada, decisión ya aceptada por la marca.

## Copy del post (sin promesas milagro)

**Opción 1 · directa**
> Deja de entrenar por entrenar 💗
> Ahora tu rutina por días, tus pesos serie a serie y tus observaciones para mí viven en tu celu.
> Yo lo veo todo y puedo ayudarte a ajustar tu entrenamiento.
> 👉 Pide tu cuenta en yohicoach.cl

**Opción 2 · spicy**
> Tu libreta de entrenamiento se quedó chica 🔥
> Anota kilos, reps y RIR, usa el temporizador de descanso y cuéntame cómo se sintió cada ejercicio.
> Todo en un solo lugar, con tu rutina al día.
> 💗 Pide tu cuenta en yohicoach.cl

**Opción 3 · educativa**
> ¿Sabes cuánto levantaste la semana pasada? 🧠
> Registrar tus series te deja comparar con datos, no con la memoria. Esa es la idea de la nueva zona de alumnas.
> Rutina, registro y observaciones, conectados conmigo.
> 📲 Pide tu cuenta en yohicoach.cl

**Hashtags (5):** #YohiCoach #EntrenaConPropósito #EntrenamientoDeFuerza #RutinaDeGimnasio #EntrenamientoOnline

Nota: el reel no hace afirmaciones de salud ni de resultados. El portal da herramientas de registro; la evidencia de que llevar registro ayuda a progresar no se cita en el video (no hay fuente registrada en `fuentes/`). La opción 3 lo plantea como idea, no como dato. Si quieres citar un estudio, hay que verificarlo y registrarlo antes.

## Cómo editar y exportar
```bash
cd reels/portal-alumnas
npm i
npm run dev      # Remotion Studio
npm run render   # out/yohi-portal-alumnas.mp4 + out/portada.png
npm run qa       # stills de control en out/qa/
```
- Textos: `src/copy.ts` · tiempos: `src/timing.ts` · colores del portal: `src/theme.ts`.
- Pantallas del portal: `src/components/ui.tsx` (mismos valores que `portal.css`).
- En tu computador puedes dejar que Remotion descargue su propio Chrome; el script usa el local solo si no hay internet.
