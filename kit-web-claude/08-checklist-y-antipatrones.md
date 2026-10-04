# 08 · Checklist y anti-patrones

## Anti-patrones (NO hacer)
- Plantilla genérica: hero centrado + 3 tarjetas iguales con ícono + testimonios inventados.
- Looks "hechos por IA": crema #F4F1EA + serif + terracota; gradiente morado→azul; todo centrado; `rounded-lg` y sombra igual en todo; Inter/Space Grotesk "por defecto".
- Fotos stock genéricas de gimnasio/oficina.
- Emojis como íconos de interfaz.
- Más de 2 colores saturados. Texto blanco sobre color brillante en tamaño chico.
- Animar todo; `ease-in`; `scale(0)`; animaciones > 1 s en UI; parallax mareante.
- Numeración 01/02/03 cuando no hay secuencia real.
- Exceso de texto: si un párrafo pasa de 3 líneas en móvil, recortar.
- Datos inventados: precios, reseñas, horarios, certificaciones, cifras de resultados.
- Formularios que muestran "¡Enviado!" sin estar conectados a nada.

## Checklist antes de entregar
**Contenido**
- [ ] Se entiende quién es, qué ofrece y cómo contactar en 5 s.
- [ ] CTA principal en hero, mitad y final.
- [ ] Cero datos inventados; placeholders marcados y listados.

**Diseño**
- [ ] Tokens en `:root`; ningún color suelto fuera de tokens.
- [ ] Escala tipográfica respetada; títulos con `text-wrap: balance`; tildes no recortadas.
- [ ] Contraste ≥ 4.5:1 en texto.
- [ ] Tarjetas hermanas alineadas y consistentes.

**Motion**
- [ ] Cada animación tiene propósito; curvas y duraciones de la tabla.
- [ ] `prefers-reduced-motion` probado.
- [ ] Hovers solo con `@media (hover:hover)`.

**Técnico**
- [ ] Sin scroll horizontal en 375 px.
- [ ] Sin errores en consola.
- [ ] Teclado: tab recorre todo, foco visible, Esc cierra.
- [ ] Imágenes optimizadas, lazy, con dimensiones.
- [ ] Formulario conectado (o explicado que falta conectar).
- [ ] Probado en 375 · 768 · 1440.
