# Portal de alumnos — cómo está armado y cómo publicarlo

## Piezas
- `src/worker.js`: API (`/api/*`) con registro, ingreso, sesiones, aprobación por Yohi.
- Base de datos D1 `yohi-portal` (binding `DB` en `wrangler.jsonc`). Esquema en `migrations/`.
- Páginas: `site/alumnos.html`, `site/admin.html`, `site/configurar.html`, `site/terminos.html`, `site/privacidad.html`.
- El botón "Alumnos" y su ventana están en `site/index.html`.
- Pruebas: `node --experimental-sqlite --no-warnings tests/api.test.mjs`.

## Seguridad (resumen)
- Claves con PBKDF2-SHA256 (100.000 iteraciones, tope de Workers), sal única por usuario; nunca en claro.
- Sesión: cookie `HttpOnly`, `Secure`, `SameSite=Lax`; en la base solo se guarda el hash del token.
- Las escrituras (`POST`) solo se aceptan si el `Origin` es el propio sitio.
- Límite de intentos de ingreso y de registros por IP.
- Las cuentas nuevas quedan `pending` hasta que Yohi las aprueba.
- Registro del consentimiento (versión y fecha) y consentimiento separado para datos de salud.

## Antes de publicar en producción
1. Completar los campos amarillos de `terminos.html` y `privacidad.html` y pasarlos por revisión legal; luego quitar el aviso de "borrador".
2. En Cloudflare → Workers → `yohi-coach-marketing` → Settings → Variables and Secrets: crear el **secreto** `SETUP_TOKEN` (un código largo y privado).
3. Hacer merge de `portal-alumnos` a `workers-site` (la rama que publica el sitio). El binding de D1 viene en `wrangler.jsonc`.
4. Abrir `/configurar`, crear la cuenta de Yohi con ese código y su propia clave. Después de eso la página queda inutilizable.
5. Probar con una cuenta de prueba: crear cuenta → aprobar desde `/admin` → ingresar.

## Agenda y reservas (v2)
- Migración `0003_late_cancel.sql` (ya aplicada en la base `yohi-portal`).
- Franjas (sesiones de 1 hora): mañana 08:30 y 09:30; tarde 16:00, 17:00, 18:00 y 19:00; fin de semana 09:00 a 12:00.
- Pedir una hora descuenta una sesión. Rechazo o cancelación con más de 24 h la devuelve; con menos de 24 h se pierde.
- Yohi abre días y confirma o rechaza desde `/admin`. Una hora no puede tomarla dos personas (índice único en la base).
- Pendiente: Google Calendar y avisos.

## Mediciones y Mocca (v3)
- Mediciones (peso, % grasa, masa muscular): solo si la alumna autorizó datos de salud. Yohi las carga y borra desde `/admin` (botón Mediciones de cada alumna). La alumna ve tarjetas, gráfico y tabla en `/alumnos`.
- La alumna puede activar o retirar su autorización; al retirarla se borran sus mediciones.
- Mocca (`site/mocca.js`): asistente flotante con preguntas frecuentes y respuestas fijas; las dudas de salud o de clave las deriva a Yohi por WhatsApp. No es un chat libre.
- Pendiente: Google Calendar y avisos.

## Informe PDF de Body Pro Go (v4)
- Migración `0004_pdf.sql` (ya aplicada en `yohi-portal`). El PDF (máx. 4 MB, se verifica que sea PDF de verdad) se guarda en la base en trozos, porque R2 no está activado en la cuenta.
- Lo sube Yohi al cargar una medición (puede ir con valores o sola). Solo lo ve la dueña (con su autorización de salud vigente) y Yohi. Al retirar la autorización se borra junto con las mediciones.
- Si algún día se activa R2 en Cloudflare, se puede mover el almacenamiento allí.

## Plan editable, lectura del PDF y /analiza (v5)
- **Editar plan** (admin): botón "Editar plan" en cada alumna/o. Cambia modalidad (online ⇄ 1:1), sede, sesiones y fechas, o renueva creando un plan nuevo. `POST /api/admin/plan`. El plan vigente es el de mayor id.
- **Lectura del PDF Body Pro Go**: `site/bodypro.js` + PDF.js (`site/vendor/pdfjs`, v4.10.38, Apache-2.0) leen el PDF **en el navegador**; al subirlo en el admin se rellenan los campos y las métricas extra (columna `measurements.extra`, migración `0005`, ya aplicada en producción). Calibrado con una captura de un informe Fitdays en español; si un informe real no se lee bien, ajustar `parse()`.
- **Visuales**: la alumna ve "Tu avance" (comparación con el control anterior) y "Tu último informe" (barras contra el rango del informe).
- **/analiza** (pública): cualquiera sube su PDF, se lee en su dispositivo (no se envía a ningún servidor) y ve sus barras, y un banner "Entrena con Yohi" lleva a WhatsApp. Enlazada desde el pie del inicio.
- Avisar al abogado: informe PDF y métricas extra en la ficha, y herramienta /analiza que procesa en el navegador.
- **Informe con logo** (`site/informe.js`, logo en `site/logo-yohi.webp`): botón "Descargar informe (PDF)" en la zona de la alumna, "Informe con logo (PDF)" en la ficha del admin y en `/analiza`. Compara último control vs. anterior y se guarda con "Guardar como PDF". Usa lenguaje neutro (sin diagnósticos) y no envía nada a servidores.

## Lectura de la imagen de Body Pro Go y análisis explicado (v6)
- Body Pro Go (app Fitdays) entrega **una imagen**; ahora el admin y `/analiza` aceptan imagen (JPG/PNG) o PDF.
- **OCR en el navegador**: `site/ocr-worker.js` + `site/vendor/tesseract/` (tesseract.js-core v7.0.0 LSTM + `spa.traineddata` de tessdata_fast, Apache-2.0, ~5 MB). La imagen se pasa a escala de grises "mínimo de canal" (el naranjo queda oscuro), se separa en 2 columnas y se lee. Probado con un informe real: 18/18 datos correctos. Los valores imposibles se descartan (rangos en `metricas.js`) y Yohi revisa todo antes de guardar (todos los campos son editables).
- Al guardar, la imagen se recodifica a JPEG ≤1600 px **sin metadatos** (ubicación, etc.). El servidor valida el tipo por los primeros bytes (PDF/JPG/PNG) y la sirve con su tipo correcto.
- `site/metricas.js`: catálogo único (nombre, unidad, rango posible, explicación en palabras simples, descargo). Fuentes en `fuentes/composicion-corporal-bioimpedancia.md`.
- La alumna ve "Tu último informe, explicado" (cada dato con barra de rango, cambio vs. anterior y explicación) + el descargo "Yohi es preparadora física…". El informe PDF con logo incluye un glosario y el mismo descargo.
