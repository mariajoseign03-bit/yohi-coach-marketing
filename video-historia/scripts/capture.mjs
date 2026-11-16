// Capturas reales del portal (local, datos demo). Uso: node scripts/capture.mjs [http://localhost:8787]
// Viewport móvil 430x932 @2.5x => imágenes de ~1075 px de ancho (nítidas dentro del mockup).
import { chromium } from 'playwright';
import fs from 'node:fs';
const BASE = process.argv[2] || 'http://localhost:8787';
if (!/^https?:\/\/(localhost|127\.0\.0\.1)/.test(BASE)) { console.error('Solo localhost.'); process.exit(1); }
const OUT = new URL('../capturas/', import.meta.url).pathname;
fs.mkdirSync(OUT, { recursive: true });
const DEMO = { email: 'alumna.demo@yohicoach.demo', pass: 'DemoAlumna-2026' };
const exe = fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined;
const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
const opts = { viewport: { width: 430, height: 932 }, deviceScaleFactor: 2.5, isMobile: true, hasTouch: true, locale: 'es-CL', timezoneId: 'America/Santiago' };
const hideFixed = (p) => p.addStyleTag({ content: '.tabbar,.mc-fab{visibility:hidden !important}' });
const showFixed = (p) => p.addStyleTag({ content: '.tabbar,.mc-fab{visibility:visible !important}' });
const shot = async (p, name, o = {}) => { await p.waitForTimeout(500); await p.screenshot({ path: OUT + name + '.png', ...o }); console.log('✓', name); };

// ---- 1) Home pública + login por el modal (clics reales) ----
{
  const ctx = await browser.newContext(opts); const p = await ctx.newPage();
  await p.goto(BASE + '/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(6500); // deja terminar la animación de entrada
  await shot(p, '01-home');
  await p.getByRole('button', { name: /Alumnos/ }).or(p.getByText('Alumnos', { exact: true })).first().click();
  await p.waitForTimeout(800);
  await shot(p, '02-login-modal');
  const em = p.locator('input[name=user]'); await em.click(); await em.pressSequentially(DEMO.email, { delay: 15 });
  const pw = p.locator('input[name=pass]').first(); await pw.click(); await pw.pressSequentially(DEMO.pass, { delay: 15 });
  await shot(p, '03-login-lleno');
  await ctx.close();
}

// ---- 2) Portal de la alumna ----
{
  const ctx = await browser.newContext(opts);
  const r = await ctx.request.post(BASE + '/api/login', { data: { email: DEMO.email, password: DEMO.pass }, headers: { origin: BASE } });
  if (!r.ok()) throw new Error('login demo falló: ' + r.status());
  const p = await ctx.newPage();
  await p.goto(BASE + '/alumnos.html', { waitUntil: 'networkidle' });
  await p.waitForTimeout(2000);
  const go = async (t) => { await p.locator(`nav.tabbar a[href="#${t}"]`).click(); await p.waitForTimeout(1000); };
  await shot(p, '10-inicio');
  await p.locator('nav.tabbar').screenshot({ path: OUT + 'tabbar.png' });
  await hideFixed(p); await shot(p, '10-inicio-largo', { fullPage: true }); await showFixed(p);
  await go('rutina');
  await shot(p, '11-rutina');
  await p.locator('.tabpanel:not([hidden]) .ex-head').first().click();
  await p.waitForTimeout(700);
  await shot(p, '11-rutina-abierta');
  await go('progreso');
  await shot(p, '12-progreso');
  await hideFixed(p); await shot(p, '12-progreso-largo', { fullPage: true }); await showFixed(p);
  await go('chat');
  await shot(p, '13-chat');
  await p.locator('.mc-fab').click(); await p.waitForTimeout(800);
  await shot(p, '13-chat-mocca');
  await p.locator('.mc-opt').first().click(); await p.waitForTimeout(600);
  await shot(p, '13-chat-mocca-respuesta');
  await p.locator('.mc-panel button[aria-label], .mc-close').first().click().catch(() => {});
  await go('agenda');
  await shot(p, '14-agenda');
  await hideFixed(p); await shot(p, '14-agenda-largo', { fullPage: true }); await showFixed(p);
  await ctx.close();
}
await browser.close();
