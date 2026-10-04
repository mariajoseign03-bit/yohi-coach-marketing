# 03 · Color y contraste

## Estructura de paleta (máximo 5-6 tokens)
```css
:root{
  --bg:      #0B0B0B; /* fondo principal */
  --surface: #191919; /* tarjetas */
  --fg:      #FFF9FC; /* texto principal */
  --muted:   #A7A7A7; /* texto secundario */
  --accent:  #FF4FA3; /* marca: CTA, palabras clave, bordes activos */
  --accent-soft: #FFD6E8; /* apoyo: fondos suaves, etiquetas */
}
```
- **60-30-10:** 60 % neutro de fondo, 30 % superficies/texto, 10 % acento.
- Neutros con un leve tinte hacia el acento se ven intencionales; el gris puro se ve "por defecto".
- Alterna secciones oscuras y claras para crear "escenas" (ej. servicios en blanco cálido sobre una web negra).

## Contraste (WCAG)
| Uso | Mínimo |
|---|---|
| Texto normal | 4.5 : 1 |
| Títulos grandes (≥ 24 px o ≥ 19 px bold) | 3 : 1 |
| Íconos y bordes de controles | 3 : 1 |

Ejemplos reales:
| Combinación | Ratio | ¿Sirve? |
|---|---|---|
| Blanco sobre #111111 | 18.9 | ✅ todo |
| #FF4FA3 sobre #111111 | 6.2 | ✅ texto y títulos |
| Negro sobre #FF4FA3 | 7.6 | ✅ texto en botones rosa |
| Blanco sobre #FF4FA3 | 3.0 | ⚠️ solo títulos grandes |
| #8C8C8C sobre #111111 | 5.6 | ✅ texto secundario |

Regla práctica: **en botones de color brillante, texto negro**, no blanco.

## Calcular contraste (JS para pegar en consola)
```js
const L=h=>{const c=[0,2,4].map(i=>parseInt(h.slice(i,i+2),16)/255).map(x=>x<=.03928?x/12.92:((x+.055)/1.055)**2.4);return .2126*c[0]+.7152*c[1]+.0722*c[2]};
const ratio=(a,b)=>{const[x,y]=[L(a),L(b)].sort((m,n)=>n-m);return((x+.05)/(y+.05)).toFixed(2)};
ratio("FF4FA3","111111") // "6.20"
```

## Glow, gradientes y profundidad
- Glow de marca: `box-shadow: 0 0 30px rgba(accent,.45)` o `filter: drop-shadow(...)` en PNG recortados.
- Fondos vivos: `radial-gradient` grande y difuso del acento que "respira" (opacidad 0.75 ↔ 1, 6-8 s).
- Sombras: una sola dirección de luz en toda la página; sombras largas y suaves (`0 30px 60px -30px`).
- Evita: gradiente morado→azul genérico, más de 2 colores saturados, sombras duras grises.
