# 04 · Layout y espaciado

## Sistema
```css
:root{
  --max: 1200px;
  --gutter: 16px;            /* mínimo en móvil */
  --space-section: clamp(80px, 12vw, 140px);
  --radius: 28px;            /* tarjetas */
  --radius-pill: 999px;      /* botones, chips */
}
.wrap{ width: min(var(--max), 100% - 2*var(--gutter)); margin-inline: auto; }
section{ padding-block: var(--space-section); }
```
- Escala de espacios: 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 · 128.
- Usa `display:grid` / `flex` con `gap`. Evita márgenes por elemento.
- Todo hijo de grid/flex con texto: `min-width: 0` (evita que empuje y genere scroll horizontal).
- `html{ overflow-x: clip }` como seguro anti-desborde.

## Layouts editoriales (elegir 1 por sección)
| Layout | Cuándo |
|---|---|
| **Split 55/45** (texto + imagen) | Hero, "sobre mí" |
| **Tarjetas grandes 2 columnas** | Elección de servicios |
| **Lista numerada en filas** (número · título · bullets) | Servicios detallados |
| **Carrusel horizontal con snap** | Datos, reseñas, portafolio |
| **Pantalla completa centrada** | Frase/manifiesto |
| **Bento grid** (tarjetas de distintos tamaños) | Beneficios, features |
| **Marquee** (cinta que se mueve) | Separador con energía |

## Ritmo de página ("escenas")
Alterna fondo y densidad para que cada sección se sienta como una escena nueva:
oscuro (hero) → oscuro con tarjetas → **claro** (servicios) → tarjeta oscura dentro de claro → oscuro editorial → **negro puro** (frase) → ...

## Responsive
- Breakpoints de prueba: 375 · 768 · 1024 · 1440.
- En móvil: una columna, imagen después del texto en el hero (el mensaje primero), botones a ancho cómodo, menú hamburguesa.
- Tarjetas: alto mínimo, el contenido define el alto final.
- Imágenes: `max-width:100%`, `width/height` declarados (evita saltos de layout), `loading="lazy"` excepto la del hero (`fetchpriority="high"`).
