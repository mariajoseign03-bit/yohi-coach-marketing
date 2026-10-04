# 05 · Animaciones y motion

## Marco de decisión (en orden)
1. **¿Debe animarse?** Solo si orienta, da feedback o crea un momento de marca.
2. **¿Propósito?** entrada · salida · cambio de estado · feedback · ambiente.
3. **Herramienta más barata que funcione:** CSS transition → CSS keyframes → Web Animations API / IntersectionObserver → librería (GSAP, Motion) solo si es imprescindible.
4. **Propiedades:** `transform` y `opacity` (GPU). `filter: blur()` con moderación. Nunca `width/height/top/left`.
5. **Curva y duración** (tabla abajo).
6. **Interrupción y salida:** usar transitions (interrumpibles) para UI; keyframes para loops.
7. **Reduced motion y hover gating** siempre incluidos.

## Tokens
```css
:root{
  --ease-out: cubic-bezier(.23,1,.32,1);      /* entradas, respuestas */
  --ease-in-out: cubic-bezier(.77,0,.175,1);  /* movimiento en pantalla */
  --ease-drawer: cubic-bezier(.32,.72,0,1);   /* paneles tipo iOS */
  --dur-press: 140ms;
  --dur-ui: 220ms;
  --dur-enter: 800ms;
}
```
| Elemento | Duración | Curva |
|---|---|---|
| Botón presionado | 100-160 ms | ease-out |
| Tooltip / popover | 125-200 ms | ease-out |
| Dropdown / menú | 150-250 ms | ease-out |
| Modal / drawer / chatbot | 250-450 ms | ease-drawer |
| Reveal de sección (marketing) | 600-1000 ms | ease-out |
| Marquee / loops | 20-40 s | linear |
| Floating de personaje | 5-7 s | ease-in-out |

**Nunca `ease-in` en UI** (se siente lento). **Nunca `scale(0)`**: parte de `.92-.96` + opacidad 0.

## Recetas listas

### Reveal al hacer scroll
```css
.reveal{opacity:0;transform:translateY(40px);transition:opacity .9s var(--ease-out),transform .9s var(--ease-out)}
.reveal.in{opacity:1;transform:none}
```
```js
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{threshold:.18,rootMargin:'0px 0px -6% 0px'});
document.querySelectorAll('.reveal').forEach(el=>io.observe(el));
```

### Título palabra por palabra (máscara)
```css
.split .w{display:inline-block;overflow:hidden;vertical-align:top;padding-top:.16em;margin-top:-.16em}
.split .w>span{display:inline-block;transform:translateY(105%);transition:transform .9s var(--ease-out)}
.split.in .w>span{transform:none}
```
(El JS que envuelve cada palabra está en `09-plantilla-base.html`.)

### Floating suave
```css
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-14px)}}
.float{animation:float 6s ease-in-out infinite}
```
Varía `animation-delay` negativo en cada elemento para que no floten sincronizados.

### Hover de botón (táctil y rápido)
```css
.btn{transition:transform .35s var(--ease-out),box-shadow .35s var(--ease-out)}
@media (hover:hover){.btn:hover{transform:translateY(-3px) scale(1.04)}}
.btn:active{transform:scale(.97)}
```

### Tarjeta que se eleva
```css
.card{transition:transform .5s var(--ease-out),box-shadow .5s var(--ease-out)}
@media (hover:hover){.card:hover{transform:translateY(-8px);box-shadow:0 30px 60px -30px rgba(255,79,163,.6)}}
```

### Marquee infinito
```css
.marquee-track{display:flex;width:max-content;animation:marquee 26s linear infinite}
@keyframes marquee{to{transform:translateX(-50%)}}
```
El contenido se duplica dos veces para que el loop no tenga salto.

### Parallax sutil con el mouse (solo desktop)
```js
addEventListener('pointermove',e=>{if(e.pointerType!=='mouse')return;const x=e.clientX/innerWidth-.5,y=e.clientY/innerHeight-.5;
  document.querySelectorAll('[data-depth]').forEach(d=>d.style.translate=`${x*d.dataset.depth}px ${y*d.dataset.depth}px`)},{passive:true});
```

### Pulso discreto (botón flotante)
```css
@keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(255,79,163,.45)}60%{box-shadow:0 0 0 14px rgba(255,79,163,0)}}
.fab{animation:pulse 2.6s infinite}
```

### Confirmación de formulario (círculo que se dibuja)
```css
.check circle{stroke-dasharray:290;stroke-dashoffset:290;transition:stroke-dashoffset .8s .4s var(--ease-out)}
.check path{stroke-dasharray:80;stroke-dashoffset:80;transition:stroke-dashoffset .5s 1s var(--ease-out)}
.sent .check circle,.sent .check path{stroke-dashoffset:0}
```

## Accesibilidad del movimiento (obligatorio)
```css
@media (prefers-reduced-motion: reduce){
  *,*::before,*::after{animation:none!important;transition-duration:.01ms!important;transition-delay:0s!important}
  .reveal,.split .w>span{opacity:1!important;transform:none!important}
}
```
- Carruseles automáticos: se detienen al tocar, al pasar el mouse y con reduced motion; siempre con flechas y teclado.
- Nada parpadea más de 3 veces por segundo.

## Video y motion para redes (Remotion)
- Usar `spring()` e `interpolate()` con easing; stagger de 4-6 frames entre elementos.
- Texto quieto ~1 s por cada 3 palabras.
- Zonas seguras de historias: 250 px arriba y 340 px abajo libres de texto.
