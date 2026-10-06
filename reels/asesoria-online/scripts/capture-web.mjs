// Captura movil (390x844, DPR 2.5) de la web completa, con las animaciones de entrada terminadas.
// Uso: node scripts/capture-web.mjs ../../site/index.html out/web  (requiere Playwright con Chromium)
const pw = (await import(process.env.PLAYWRIGHT_PATH ?? "playwright")).default;
import fs from "node:fs";
import path from "node:path";
const [, , htmlPath, outDir] = process.argv;
const b = await pw.chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2.5, isMobile: true, hasTouch: true });
await p.goto("file://" + path.resolve(htmlPath), { waitUntil: "networkidle" });
await p.evaluate(() => document.fonts.ready);
const H = await p.evaluate(() => document.documentElement.scrollHeight);
for (let y = 0; y <= H; y += 300) { await p.evaluate((y) => scrollTo(0, y), y); await p.waitForTimeout(120); }
await p.evaluate(() => { document.querySelectorAll(".reveal,.anim").forEach((e) => e.classList.add("in")); scrollTo(0, 0); });
await p.waitForTimeout(2500);
// Elementos fijos (nav, botones flotantes): se capturan aparte y se ocultan en la pagina completa
const fixed = await p.evaluate(() => [...document.querySelectorAll("body *")].filter((e) => getComputedStyle(e).position === "fixed" && e.getBoundingClientRect().height > 0)
  .map((e, i) => { e.setAttribute("data-fx", i); const r = e.getBoundingClientRect(); return { i, cls: e.className.toString().slice(0, 40), id: e.id, x: r.x, y: r.y, w: r.width, h: r.height }; }));
console.log(JSON.stringify(fixed));
await p.screenshot({ path: outDir + "/viewport-top.png" });
for (const f of fixed) { try { await p.locator(`[data-fx="${f.i}"]`).screenshot({ path: `${outDir}/fixed-${f.i}.png`, omitBackground: true }); } catch {} }
await p.addStyleTag({ content: "[data-fx]{visibility:hidden!important}" });
const info = await p.evaluate(() => ({ height: document.documentElement.scrollHeight,
  blocks: [...document.querySelectorAll("header.hero, section, footer, section > div > *, section > *")].filter(e=>e.getBoundingClientRect().height>120).map((e) => ({ tag: e.tagName, id: e.id, cls: e.className.toString().slice(0, 30), top: Math.round(e.getBoundingClientRect().top + scrollY), h: Math.round(e.getBoundingClientRect().height), txt: e.innerText.replace(/\s+/g, " ").slice(0, 70) })) }));
fs.writeFileSync(outDir + "/info.json", JSON.stringify({ fixed, ...info }, null, 1));
await p.screenshot({ path: outDir + "/full.png", fullPage: true });
await b.close();
