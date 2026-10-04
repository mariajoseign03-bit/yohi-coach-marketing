# 02 · Tipografía

## Principios
- La tipografía es la personalidad. Elige un **display con carácter** (títulos) + un **texto muy legible** (cuerpo). Máximo 2 familias (+1 mono si hay datos/código).
- **Escala fija** y respetada. Recomendado con `clamp()` para que escale con la pantalla.
- Títulos: interlineado 0.9-1.05, `text-wrap: balance`, tracking ajustado si es condensada.
- Cuerpo: 16-18 px mínimo en móvil, interlineado 1.5-1.7, 60-70 caracteres por línea (`max-width: 62ch`).
- Etiquetas/kickers en MAYÚSCULAS: 11-13 px, `letter-spacing: .14-.22em`, peso 800.
- Nunca justificar texto. Nunca centrar párrafos largos.
- Cuidado con tildes en títulos con `overflow:hidden` (efecto palabra por palabra): agregar `padding-top: .16em; margin-top: -.16em`.

## Escala base (tokens)
```css
:root{
  --fs-display: clamp(56px, 10.5vw, 150px); /* hero */
  --fs-h2: clamp(42px, 6.8vw, 96px);
  --fs-h3: clamp(26px, 3.6vw, 46px);
  --fs-lead: clamp(17px, 1.6vw, 21px);
  --fs-body: 17px;
  --fs-small: 14px;
  --fs-label: 12px;
}
h1,h2,h3{ text-wrap: balance; }
p{ text-wrap: pretty; max-width: 62ch; }
```

## Combinaciones probadas (Google Fonts)
| Estilo | Display | Texto | Uso |
|---|---|---|---|
| Fitness editorial / energético | Anton | Montserrat | marcas personales, deporte |
| Deportivo condensado | Barlow Condensed | Barlow | gimnasios, competencias |
| Premium cálido | Fraunces | Inter Tight | bienestar, spa, nutrición |
| Elegante editorial | Playfair Display | Manrope | moda, belleza |
| Moderno geométrico | Sora | DM Sans | tech, startups |
| Salud confiable | Lexend | Source Sans 3 | clínicas, educación en salud |
| Juvenil redondeado | Baloo 2 | Nunito | infantil, comunidad |
| Lujo minimal | Cormorant Garamond | Jost | estética, joyería |

Carga recomendada:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Montserrat:wght@500;700;800;900&display=swap" rel="stylesheet">
```
Siempre con fallback: `font-family: "Anton", Impact, "Arial Narrow", sans-serif;`

## Técnicas tipográficas premium
- **Mezcla de color en el título:** 1-2 palabras clave en el color de marca.
- **Título por líneas** que aparecen con máscara (ver `05-animaciones`).
- **Marca gigante en el footer** (15vw) como cierre memorable.
- **Contraste de tamaños:** kicker 12 px + título 96 px + lead 20 px crea jerarquía inmediata.
- **Números grandes** (01, 02) solo cuando hay secuencia real.
