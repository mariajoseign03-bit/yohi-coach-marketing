---
name: diseno-web-premium
description: Diseña y programa páginas web y landing pages modernas, premium y con identidad propia (HTML/CSS/JS en un archivo), con tipografía editorial, paleta con contraste correcto, layout responsive, animaciones con propósito (reveal al scroll, títulos palabra por palabra, floating, marquee, parallax sutil, carruseles, chatbot guiado, formulario con confirmación) y accesibilidad. Úsala cuando pidan una web, landing, sitio, página de servicios, rediseño o mejoras visuales/animaciones de una página. Responde en español.
---

# Diseño web premium

## Flujo obligatorio
1. Lee el brief con `references/01-proceso-y-brief.md` (objetivo único, público, tono, datos reales). Si faltan datos críticos, pregunta una vez y usa placeholders. **Nunca inventes** precios, reseñas, horarios, certificaciones ni cifras.
2. Escribe una "Lectura de diseño" de 2-3 líneas: estilo, paleta, tipografías, nivel de movimiento (diales de `01`).
3. Define tokens en `:root` (color `03`, tipografía `02`, espacio `04`, motion `05`).
4. Parte de `assets/plantilla-base.html` y adapta secciones y componentes (`06`).
5. Aplica motion con la tabla de curvas/duraciones de `05`; incluye siempre `prefers-reduced-motion`.
6. Revisa con `08-checklist-y-antipatrones.md` y `07-accesibilidad-y-performance.md`.
7. Entrega: lectura de diseño → código completo → "Para completar" (placeholders) → máx. 3 mejoras.

## Reglas de oro
- Identidad antes que plantilla; una sola "audacia" por página.
- Contraste de texto ≥ 4.5:1; en botones de color brillante, texto negro.
- Solo `transform`/`opacity` animados; curvas `cubic-bezier(.23,1,.32,1)` (entrada) y `(.77,0,.175,1)` (movimiento); nunca `ease-in` ni `scale(0)` en UI.
- Mobile first (375 px), sin scroll horizontal, objetivos táctiles ≥ 44 px.
- Íconos SVG de línea; emojis solo como parte del copy.
- Un formulario estático no envía datos: conéctalo (Formspree/Apps Script/WhatsApp) o avísalo.

## Presets de marca
Si el proyecto es de YOHI Coach, usa `references/10-preset-marca-yohi.md`.
