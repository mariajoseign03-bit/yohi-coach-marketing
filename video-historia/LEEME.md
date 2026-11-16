# video-historia · Historia vertical del portal de alumnas

Video 1080×1920 · 30 fps · 33 s · Remotion + Playwright + ffmpeg.

## Regenerar cuando la web cambie
```bash
cd video-historia
npm install            # solo la primera vez
npm run render         # recaptura el portal (local, datos DEMO) y renderiza todo
npm run render:rapido  # solo re-renderiza con las capturas existentes (cambios de copy/tiempos)
npm run dev            # Remotion Studio para ajustar a mano
```
`npm run render` hace: (1) toma el código del portal de la rama `workers-site` (configurable: `-- --branch=otra`),
(2) crea una base D1 **local** y le carga una "Alumna Demo" ficticia, (3) levanta el portal en `localhost`,
(4) captura cada pantalla con Playwright (clics reales), (5) renderiza con Remotion, (6) normaliza el audio a −14 LUFS
y (7) deja `out/yohi-portal-historia.mp4` y `out/yohi-portal-historia-portada.png`.

**Seguridad:** el seed y la captura se niegan a correr si el destino no es `localhost`; usan `wrangler --local`.
Nunca tocan la base de producción ni datos de alumnas reales.

## Dónde editar
| Qué | Archivo |
|---|---|
| Textos en pantalla (copy) | `src/copy.ts` |
| Tiempos de cada bloque | `src/timing.ts` |
| Qué captura se ve, zoom, scroll y acentos rosa | `src/Main.tsx` (arreglo `layers`) |
| Colores y zonas seguras (250 px arriba/abajo) | `src/theme.ts` |
| Datos demo del portal | `scripts/seed-demo.mjs` |
| Capturas y coordenadas reales de cada tarjeta | `scripts/capture.mjs` → `capturas/` y `src/regiones.json` |

## Sonido (reemplazar por música sin copyright o audio de Instagram)
- **Música:** `public/audio/MUSICA_AQUI.wav` — es una pista generada de relleno (112 BPM). Guarda tu archivo con ese
  nombre (WAV) o cambia la ruta en `src/Main.tsx`. Volumen en `src/theme.ts` (`sfxVolume.music`). Si publicas con audio de
  Instagram, renderiza igual y silencia/quita la pista al subir.
- **Efectos** (`public/sfx/*.wav`, tomados de tus otras historias), por segundo del video:
  0,0 boom · 1,4 pop (gancho 2) · 2,3 whoosh (entra el celular) · 4,3 clic (botón Alumnos) · 5,0 tecleo (login) ·
  6,3 clic (Ingresar) · 6,9 / 10,1 / 13,3 / 16,5 / 19,7 / 22,9 whoosh+pop (cambio de función) · 10,7 toque (WhatsApp) ·
  24,2 ding (clase confirmada) · 26,1 stamp ("sistema completo") · 28,4 / 29,2 / 30,5 / 30,6 brillos, pop y clic (cierre).

## Notas de verdad (no inventar)
- El "Chat" del portal hoy es **Mocca (respuestas fijas) + botón de WhatsApp**, no mensajería interna. Por eso el título
  de esa escena es "ESCRÍBELE A YOHI". Si se agrega mensajería real, se recaptura y se cambia en `src/copy.ts`.
- Todos los datos mostrados son ficticios ("Alumna Demo"). No se muestran datos reales.
- Animación de Yohi del cierre: `public/yohi-animacion.mp4` (original en `/referencias`), con la marca de agua de
  Dreamina recortada por encuadre y sin audio.
