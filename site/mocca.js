/* Mocca: asistente de ayuda del portal. Responde dudas frecuentes con reglas del portal (no es un chat libre). */
(function () {
  const WA = 'https://wa.me/56944500370';
  const QA = [
    { q: 'No puedo pedir una hora', a: 'Revisa que te queden sesiones disponibles y que el día esté abierto. Si no ves horarios, Yohi aún no abre esos días. Las horas en gris ya fueron tomadas o ya pasaron.' },
    { q: 'Quiero cancelar o cambiar una hora', a: 'Puedes cancelar hasta 24 horas antes y la sesión vuelve a tu plan. Con menos de 24 horas, la sesión se pierde. Para cambiarla, cancela y pide otra hora libre.' },
    { q: '¿Qué pasa si no uso mis sesiones?', a: 'Tu plan dura 4 semanas. Las sesiones que no uses antes de la fecha de término se pierden, así que agéndalas con tiempo.' },
    { q: '¿Mi hora está confirmada?', a: 'Cuando pides una hora queda «Por confirmar». Queda asegurada cuando Yohi la confirma. Si ella la rechaza, tu sesión vuelve al plan y puedes elegir otra.' },
    { q: 'Mis mediciones y mis datos', a: 'Tus mediciones son datos de salud: Yohi solo las carga si tú lo autorizas, y las ves solo tú y ella. Puedes retirar la autorización cuando quieras desde la tarjeta Mediciones y se borran. Más detalle en la política de privacidad.' },
    { q: 'Problema con mi clave o mi cuenta', a: 'Escríbele a Yohi por WhatsApp y ella te ayuda a recuperar el acceso.', wa: true },
    { q: 'Tengo una lesión o una duda de salud', a: 'Eso lo ve Yohi contigo directamente. Escríbele antes de tu próxima sesión para contarle. Mocca no puede dar indicaciones de salud.', wa: true },
  ];
  const e = (tag, attrs, ...kids) => { const n = document.createElement(tag); for (const [k, v] of Object.entries(attrs || {})) { if (k === 'class') n.className = v; else if (k.startsWith('on')) n.addEventListener(k.slice(2), v); else n.setAttribute(k, v); } for (const kid of kids.flat()) n.append(kid instanceof Node ? kid : document.createTextNode(kid)); return n; };
  window.initMocca = function (firstName) {
    const body = e('div', { class: 'mc-body', 'aria-live': 'polite' });
    const panel = e('div', { class: 'mc-panel', role: 'dialog', 'aria-label': 'Mocca, asistente de Yohi', hidden: '' });
    const fab = e('button', { class: 'mc-fab', type: 'button', 'aria-label': 'Preguntar a Mocca, la asistente', 'aria-expanded': 'false' }, e('img', { src: '/mocca.webp', alt: '', width: '56', height: '56' }));
    function menu() {
      body.replaceChildren(e('div', { class: 'mc-msg' }, '¡Hola, ' + firstName + '! Soy Mocca. ¿Con qué te ayudo?'),
        ...QA.map((x) => e('button', { class: 'mc-opt', type: 'button', onclick: () => answer(x) }, x.q)));
    }
    function answer(x) {
      const back = e('button', { class: 'mc-opt back', type: 'button', onclick: menu }, 'Otra duda');
      const kids = [e('div', { class: 'mc-me' }, x.q), e('div', { class: 'mc-msg' }, x.a)];
      if (x.wa) kids.push(e('a', { class: 'mc-opt wa', href: WA, target: '_blank', rel: 'noopener' }, 'Escribir a Yohi por WhatsApp'));
      kids.push(back);
      body.replaceChildren(...kids);
      back.focus();
    }
    function open() { panel.hidden = false; fab.setAttribute('aria-expanded', 'true'); menu(); close.focus(); }
    function shut() { panel.hidden = true; fab.setAttribute('aria-expanded', 'false'); fab.focus(); }
    const close = e('button', { class: 'mc-x', type: 'button', 'aria-label': 'Cerrar', onclick: shut }, '×');
    panel.append(e('div', { class: 'mc-head' }, e('img', { src: '/mocca.webp', alt: '', width: '44', height: '44' }), e('div', {}, e('strong', {}, 'Mocca'), e('span', {}, 'Asistente de Yohi Coach')), close), body);
    panel.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') shut(); });
    fab.addEventListener('click', () => (panel.hidden ? open() : shut()));
    document.body.append(panel, fab);
  };
})();
