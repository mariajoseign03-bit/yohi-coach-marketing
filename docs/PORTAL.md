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
