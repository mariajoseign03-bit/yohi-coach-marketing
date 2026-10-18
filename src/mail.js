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
export function dayText(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return `${DIAS[new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay()]} ${d} de ${MESES[m - 1]}`;
}

// kind: 'confirmed' | 'moved'. Solo lleva nombre de pila, día, hora y sede: nada de datos de salud.
export function bookingEmail({ name, day, time, sedeName, kind, site }) {
  const first = String(name || '').trim().split(/\s+/)[0] || 'hola';
  const when = `${dayText(day)} · ${time}`;
  const moved = kind === 'moved';
  const subject = moved ? `Cambió tu hora: ${when}` : `Tu hora está confirmada: ${when}`;
  const lead = moved ? 'Yohi cambió el horario de tu sesión. Esta es tu hora nueva:' : 'Yohi confirmó tu sesión. Te esperamos:';
  const tail = moved
    ? 'Si esta hora no te acomoda, puedes cancelarla desde tu agenda hasta 24 horas antes y la sesión vuelve a tu plan.'
    : 'Recuerda: puedes cancelar desde tu agenda hasta 24 horas antes y la sesión vuelve a tu plan. Con menos de 24 horas, la sesión se pierde.';
  const link = `${site}/alumnos#agenda`;
  const text = `Hola, ${first}.\n\n${lead}\n\n${when}\n${sedeName}\n\n${tail}\n\nVer mi agenda: ${link}\n\nRecibes este correo porque tienes una hora en tu portal de Yohi Coach.`;
  const html = `<!doctype html><html lang="es"><body style="margin:0;background:#f6f1f4;font-family:Arial,Helvetica,sans-serif;color:#111">
<div style="max-width:520px;margin:0 auto;padding:24px 16px">
<div style="background:#111;border-radius:18px 18px 0 0;padding:18px 24px"><span style="color:#FF6DB4;font-weight:800;letter-spacing:.14em;font-size:13px">YOHI COACH</span></div>
<div style="background:#fff;border-radius:0 0 18px 18px;padding:26px 24px">
<p style="margin:0 0 14px;font-size:17px">Hola, <b>${esc(first)}</b></p>
<p style="margin:0 0 18px;font-size:15px;line-height:1.5">${esc(lead)}</p>
<div style="border:2px solid #FF4FA3;border-radius:14px;padding:16px 18px;margin:0 0 18px;background:#fff5fa">
<div style="font-size:20px;font-weight:800">${esc(dayText(day).replace(/^./, (c) => c.toUpperCase()))}</div>
<div style="font-size:18px;font-weight:700;margin-top:2px">${esc(time)}</div>
<div style="font-size:14px;color:#555;margin-top:6px">${esc(sedeName)}</div></div>
<p style="margin:0 0 22px;font-size:14px;line-height:1.5;color:#444">${esc(tail)}</p>
<a href="${esc(link)}" style="display:inline-block;background:#FF4FA3;color:#111;text-decoration:none;font-weight:800;font-size:13px;letter-spacing:.06em;text-transform:uppercase;padding:14px 26px;border-radius:999px">Ver mi agenda</a>
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
