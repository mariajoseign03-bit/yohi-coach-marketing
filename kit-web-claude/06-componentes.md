# 06 · Componentes y microinteracciones

## Navbar
- Sticky; transparente arriba y con `backdrop-filter: blur(14px)` + fondo semitransparente al hacer scroll.
- Logo + 5-6 links + 1 botón CTA destacado. En móvil: hamburguesa (botón ≥ 44 px, `aria-expanded`).
- Links con subrayado que crece desde la izquierda (`transform: scaleX`).

## Botones
| Tipo | Uso | Estilo |
|---|---|---|
| Primario | 1 acción principal | color de marca, texto negro, sombra de color |
| Secundario / ghost | alternativa | borde, fondo transparente |
| Claro | sobre fondos oscuros en tarjetas | blanco, texto negro |
- Texto en MAYÚSCULAS, peso 900, `letter-spacing:.08em`, padding 18×30, `border-radius: 999px`.
- Estados: hover (sube + escala), active (escala .97), focus visible (outline de marca), disabled (opacidad .5).
- El texto dice exactamente lo que pasa: "Quiero mi cupo", no "Enviar".

## Tarjetas
- Usar borde/fondo/sombra solo cuando la tarjeta es un objeto separado.
- Tarjetas hermanas: mismo padding, misma posición de botón, mismas alturas mínimas.
- Variación con intención: alternar fondo oscuro / color / pastel en carruseles.

## Carrusel
- `overflow-x:auto` + `scroll-snap-type:x mandatory` (swipe nativo en celular).
- Flechas visibles + puntos + teclado (← →) + arrastre con mouse.
- Ocultar controles si hay 1 solo ítem.

## Chatbot / asistente guiado (sin IA)
- Botón flotante con avatar + texto ("💬 Pregúntale a ...") y pulso sutil.
- Panel que crece desde la esquina (`transform-origin: bottom right`, 250-450 ms).
- Mensajes con indicador "escribiendo" (3 puntos) de ~600 ms.
- Respuestas rápidas en chips; flujo tipo árbol: pregunta → opciones → recomendación (tarjeta) → derivar a humano.
- Siempre una salida: "Hablar con [persona]".

## Formulario
- Pocos campos; agrupar en 2 columnas en desktop.
- Opciones como chips/radios grandes en vez de selects cuando son ≤ 6.
- Validación al enviar, mensaje claro y foco en el primer error.
- Confirmación animada que diga qué pasa después ("Yohi se pondrá en contacto contigo").
- **Un formulario HTML estático no envía nada por sí solo:** conectar a Formspree / Google Apps Script / Make, o abrir WhatsApp con el mensaje armado (`https://wa.me/NUMERO?text=...`).

## Secciones especiales
- **Marquee** de novedades con rotación leve (-1.5deg).
- **Frase/manifiesto** pantalla completa, líneas que suben con máscara.
- **Medidor/gauge** SVG con `stroke-dashoffset` animado al entrar.
- **Credenciales** como chips/tarjetas con ícono, no como currículum.
- **Reseñas:** estrellas, texto, nombre/iniciales, proceso; espacio para foto. Si no hay reseñas reales: tarjeta "Muy pronto".

## Íconos
- SVG de línea (estilo Lucide/Heroicons), trazo 2 px, color de marca. **No usar emojis como íconos de interfaz.**
- Emojis sí en el copy cuando son parte del tono de la marca.
- Íconos decorativos: `aria-hidden="true"`. Botones solo-ícono: `aria-label`.
