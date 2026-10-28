// Avisos por correo. Proveedor preferido: Resend (secreto RESEND_API_KEY). Alternativa: Cloudflare Email Service (CF_ACCOUNT_ID + EMAIL_API_TOKEN).
// Si faltan los secretos, todo es un no-op y el portal sigue igual. Opcionales: MAIL_FROM, MAIL_FROM_NAME, SITE_URL.
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export function mailConfig(env) {
  const common = {
    from: (env.MAIL_FROM || 'hola@yohicoach.cl').trim(), fromName: (env.MAIL_FROM_NAME || 'Yohi Coach').trim(),
    site: (env.SITE_URL || 'https://yohicoach.cl').replace(/\/+$/, ''),
  };
  if (env.RESEND_API_KEY && env.RESEND_API_KEY.trim()) return { ...common, provider: 'resend', token: env.RESEND_API_KEY.trim() };
  if (env.CF_ACCOUNT_ID && env.EMAIL_API_TOKEN) return { ...common, provider: 'cloudflare', account: env.CF_ACCOUNT_ID.trim(), token: env.EMAIL_API_TOKEN.trim() };
  return null;
}
export const mailConfigured = (env) => !!mailConfig(env);

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// Cabecera negra con el logo de Yohi (imagen alojada en el sitio; si el correo la bloquea, se ve el texto «Yohi Coach» en rosa).
const logoHeader = (site) => `<div style="background:#111;border-radius:18px 18px 0 0;padding:22px 24px;text-align:center"><img src="${esc(site)}/email-logo.png" width="104" height="104" alt="Yohi Coach" style="display:block;margin:0 auto;border:0;width:104px;height:104px;border-radius:52px;color:#FF6DB4;font:800 14px Arial,Helvetica,sans-serif;letter-spacing:.14em"></div>`;
export function dayText(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return `${DIAS[new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay()]} ${d} de ${MESES[m - 1]}`;
}

// kind: 'confirmed' | 'moved' | 'cancelled' | 'rejected'. Solo lleva nombre de pila, día, hora y sede: nada de datos de salud.
export function bookingEmail({ name, day, time, sedeName, kind, site }) {
  const first = String(name || '').trim().split(/\s+/)[0] || 'hola';
  const when = `${dayText(day)} · ${time}`;
  const moved = kind === 'moved', off = kind === 'cancelled' || kind === 'rejected';
  const subject = kind === 'cancelled' ? `Se canceló tu hora: ${when}` : kind === 'rejected' ? `No pudimos confirmar tu hora: ${when}` : moved ? `Cambió tu hora: ${when}` : `Tu hora está confirmada: ${when}`;
  const lead = kind === 'cancelled' ? 'Yohi canceló esta sesión:' : kind === 'rejected' ? 'Yohi no pudo confirmar esta hora que pediste:' : moved ? 'Yohi cambió el horario de tu sesión. Esta es tu hora nueva:' : 'Yohi confirmó tu sesión. Te esperamos:';
  const tail = off
    ? 'La sesión vuelve a tu plan. Puedes pedir otra hora desde tu agenda.'
    : moved
    ? 'Si esta hora no te acomoda, puedes cancelarla desde tu agenda hasta 24 horas antes y la sesión vuelve a tu plan.'
    : 'Recuerda: puedes cancelar desde tu agenda hasta 24 horas antes y la sesión vuelve a tu plan. Con menos de 24 horas, la sesión se pierde.';
  const link = `${site}/alumnos#agenda`;
  const text = `Hola, ${first}.\n\n${lead}\n\n${when}\n${sedeName}\n\n${tail}\n\n${off ? 'Pedir otra hora' : 'Ver mi agenda'}: ${link}\n\nRecibes este correo porque tienes una hora en tu portal de Yohi Coach.`;
  const html = `<!doctype html><html lang="es"><body style="margin:0;background:#f6f1f4;font-family:Arial,Helvetica,sans-serif;color:#111">
<div style="max-width:520px;margin:0 auto;padding:24px 16px">
${logoHeader(site)}
<div style="background:#fff;border-radius:0 0 18px 18px;padding:26px 24px">
<p style="margin:0 0 14px;font-size:17px">Hola, <b>${esc(first)}</b></p>
<p style="margin:0 0 18px;font-size:15px;line-height:1.5">${esc(lead)}</p>
<div style="border:2px solid #FF4FA3;border-radius:14px;padding:16px 18px;margin:0 0 18px;background:#fff5fa">
<div style="font-size:20px;font-weight:800">${esc(dayText(day).replace(/^./, (c) => c.toUpperCase()))}</div>
<div style="font-size:18px;font-weight:700;margin-top:2px">${esc(time)}</div>
<div style="font-size:14px;color:#555;margin-top:6px">${esc(sedeName)}</div></div>
<p style="margin:0 0 22px;font-size:14px;line-height:1.5;color:#444">${esc(tail)}</p>
<a href="${esc(link)}" style="display:inline-block;background:#FF4FA3;color:#111;text-decoration:none;font-weight:800;font-size:13px;letter-spacing:.06em;text-transform:uppercase;padding:14px 26px;border-radius:999px">${off ? 'Pedir otra hora' : 'Ver mi agenda'}</a>
</div>
<p style="margin:14px 8px 0;font-size:12px;color:#777;line-height:1.5">Recibes este correo porque tienes una hora en tu portal de Yohi Coach.</p>
</div></body></html>`;
  return { subject, text, html };
}

// Devuelve 'off' (sin configurar) | 'ok' | 'error'. Nunca lanza: un correo caído no debe romper la agenda.
export async function sendMail(env, { to, subject, text, html }) {
  const c = mailConfig(env);
  if (!c) return 'off';
  try {
    if (c.provider === 'resend') {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { authorization: `Bearer ${c.token}`, 'content-type': 'application/json' },
        body: JSON.stringify({ from: `${c.fromName} <${c.from}>`, to: [to], subject, text, html }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.id) { console.error('mail resend', res.status, JSON.stringify(data).slice(0, 300)); return 'error'; }
      return 'ok';
    }
    const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(c.account)}/email/sending/send`, {
      method: 'POST',
      headers: { authorization: `Bearer ${c.token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from: { email: c.from, name: c.fromName }, to, subject, text, html }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.success === false) { console.error('mail', res.status, JSON.stringify(data.errors || data).slice(0, 300)); return 'error'; }
    const bounced = data.result && data.result.permanent_bounces && data.result.permanent_bounces.length;
    return bounced ? 'error' : 'ok';
  } catch (e) { console.error('mail', e.message); return 'error'; }
}

// Correo con el código para recuperar la clave. Solo lleva el nombre de pila y el código (nada de enlaces ni datos de salud).
export function resetEmail({ name, code, minutes, site = 'https://yohicoach.cl' }) {
  const first = String(name || '').trim().split(/\s+/)[0] || 'hola';
  const subject = `Tu código para recuperar la clave: ${code}`;
  const text = `Hola, ${first}.\n\nPediste recuperar tu clave del portal de Yohi Coach. Tu código es:\n\n${code}\n\nVence en ${minutes} minutos. Escríbelo en la pantalla donde lo pediste y elige tu clave nueva.\n\nSi no fuiste tú, ignora este correo: tu clave actual sigue funcionando. Nunca compartas este código con nadie, ni siquiera con Yohi.`;
  const html = `<!doctype html><html lang="es"><body style="margin:0;background:#f6f1f4;font-family:Arial,Helvetica,sans-serif;color:#111">
<div style="max-width:520px;margin:0 auto;padding:24px 16px">
${logoHeader(site)}
<div style="background:#fff;border-radius:0 0 18px 18px;padding:26px 24px">
<p style="margin:0 0 14px;font-size:17px">Hola, <b>${esc(first)}</b></p>
<p style="margin:0 0 18px;font-size:15px;line-height:1.5">Pediste recuperar tu clave del portal. Este es tu código:</p>
<div style="border:2px solid #FF4FA3;border-radius:14px;padding:16px 18px;margin:0 0 18px;background:#fff5fa;text-align:center">
<div style="font-size:34px;font-weight:800;letter-spacing:.3em;padding-left:.3em">${esc(code)}</div></div>
<p style="margin:0 0 12px;font-size:14px;line-height:1.5;color:#444">Vence en ${esc(minutes)} minutos. Escríbelo en la pantalla donde lo pediste y elige tu clave nueva.</p>
<p style="margin:0;font-size:13px;line-height:1.5;color:#666">Si no fuiste tú, ignora este correo: tu clave actual sigue funcionando. Nunca compartas este código con nadie, ni siquiera con Yohi.</p>
</div></div></body></html>`;
  return { subject, text, html };
}

// Aviso de renovación. kind: 'approved' | 'rejected' (al alumno) | 'new' (a Yohi). Solo lleva nombre de pila, fechas y la razón que escribe Yohi.
export function renewalEmail({ kind, name, studentName, end, reason, site = 'https://yohicoach.cl' }) {
  const first = String(name || '').trim().split(/\s+/)[0] || 'hola';
  const who = String(studentName || '').trim();
  const cap = (t) => t.replace(/^./, (c) => c.toUpperCase());
  let subject, lead, box, tail, btn, link;
  if (kind === 'approved') {
    subject = `Renovamos tu plan: vigente hasta ${dayText(end)}`;
    lead = 'Recibimos tu transferencia y renovamos tu plan. ¡Seguimos entrenando!';
    box = `Vigente hasta el ${dayText(end)}`;
    tail = 'Puedes ver los detalles de tu plan y pedir tus próximas horas desde tu portal.';
    btn = 'Ver mi plan'; link = `${site}/alumnos#renovar`;
  } else if (kind === 'rejected') {
    subject = 'No pudimos validar tu comprobante';
    lead = 'Revisamos tu comprobante de transferencia y todavía no pudimos validarlo.';
    box = reason ? `Mensaje de Yohi: ${reason}` : 'Yohi te explicará el motivo por WhatsApp.';
    tail = 'Puedes subir otro comprobante desde tu portal o escribirle a Yohi por WhatsApp.';
    btn = 'Ir a Renovar'; link = `${site}/alumnos#renovar`;
  } else {
    subject = `Nueva renovación: ${who || 'un alumno'}`;
    lead = `${who || 'Un alumno'} subió un comprobante de transferencia para renovar su plan.`;
    box = 'Pendiente de revisión';
    tail = 'Revisa el comprobante y aprueba la renovación desde tu panel.';
    btn = 'Abrir Renovaciones'; link = `${site}/admin#renovaciones`;
  }
  const text = `Hola, ${first}.\n\n${lead}\n\n${box}\n\n${tail}\n\n${btn}: ${link}`;
  const html = `<!doctype html><html lang="es"><body style="margin:0;background:#f6f1f4;font-family:Arial,Helvetica,sans-serif;color:#111">
<div style="max-width:520px;margin:0 auto;padding:24px 16px">
${logoHeader(site)}
<div style="background:#fff;border-radius:0 0 18px 18px;padding:26px 24px">
<p style="margin:0 0 14px;font-size:17px">Hola, <b>${esc(first)}</b></p>
<p style="margin:0 0 18px;font-size:15px;line-height:1.5">${esc(lead)}</p>
<div style="border:2px solid #FF4FA3;border-radius:14px;padding:16px 18px;margin:0 0 18px;background:#fff5fa"><div style="font-size:17px;font-weight:800;line-height:1.35">${esc(cap(box))}</div></div>
<p style="margin:0 0 22px;font-size:14px;line-height:1.5;color:#444">${esc(tail)}</p>
<a href="${esc(link)}" style="display:inline-block;background:#FF4FA3;color:#111;text-decoration:none;font-weight:800;font-size:13px;letter-spacing:.06em;text-transform:uppercase;padding:14px 26px;border-radius:999px">${esc(btn)}</a>
</div></div></body></html>`;
  return { subject, text, html };
}
