// Renderiza stills de control (QA) en out/qa/. Uso: node scripts/qa-stills.mjs [frame1 frame2 ...]
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path";

const COMP = "YohiPortalAlumnas";
const frames = process.argv.slice(2).map(Number);
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const browserExecutable = process.env.REMOTION_CHROME ?? (await import("node:fs")).readdirSync("/opt/pw-browsers").filter((d) => d.startsWith("chromium_headless_shell")).map((d) => `/opt/pw-browsers/${d}/chrome-linux/headless_shell`)[0] ?? null;
const composition = await selectComposition({ serveUrl, id: COMP, browserExecutable });
for (const frame of frames) {
  await renderStill({ composition, serveUrl, frame, output: `out/qa/f${String(frame).padStart(4, "0")}.png`, browserExecutable });
  console.log("ok", frame);
}
