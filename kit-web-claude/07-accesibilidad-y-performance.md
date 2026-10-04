# 07 · Accesibilidad y performance

## Accesibilidad (mínimos)
- HTML semántico: `header`, `nav`, `main`, `section` con título, `footer`, `button` para acciones y `a` para navegar.
- Un solo `h1`; jerarquía de títulos sin saltos.
- `alt` descriptivo en imágenes con contenido; `alt=""` en decorativas.
- Foco visible: `:focus-visible{outline:3px solid var(--accent);outline-offset:3px}`.
- Todo usable con teclado (menú, carrusel, chatbot, formulario). `Esc` cierra paneles.
- Labels reales en cada campo; `fieldset` + `legend` en grupos de opciones.
- Mensajes dinámicos con `aria-live="polite"`.
- Áreas táctiles ≥ 44×44 px. Contraste según `03-color`.
- `prefers-reduced-motion` respetado.

## Performance
- Imágenes en **WebP/AVIF**, tamaño real de uso (no subir 4000 px para mostrar 500). Personajes recortados con fondo transparente.
- `loading="lazy"` en todo lo que no está en la primera pantalla; `fetchpriority="high"` en la imagen del hero.
- Declarar `width`/`height` para evitar saltos (CLS).
- Fuentes: `display=swap`, solo los pesos usados, `preconnect`.
- Animar solo `transform`/`opacity`; `will-change` solo en lo que se mueve constantemente.
- Listeners de scroll/pointer con `{passive:true}` y `requestAnimationFrame`.
- Objetivo: página completa < 1.5 MB, LCP < 2.5 s en 4G.

## SEO básico
```html
<title>Marca · Servicio principal</title>
<meta name="description" content="Qué ofreces, para quién, dónde. 140-160 caracteres.">
<meta name="theme-color" content="#0B0B0B">
<meta property="og:title" content="..."><meta property="og:image" content="portada-1200x630.jpg">
```
