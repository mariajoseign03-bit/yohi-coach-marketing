// Renderiza stills de control (QA) de cada escena en out/qa/.
// Uso: node scripts/qa-stills.mjs [frame1 frame2 ...]
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path";

const frames = process.argv.slice(2).map(Number);
const list = frames.length ? frames : [80, 190, 300, 425, 520, 625, 710, 830, 910, 1040];
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const browserExecutable = process.env.REMOTION_CHROME ?? null;
const composition = await selectComposition({ serveUrl, id: "YohiAsesoriaOnline", browserExecutable });
for (const frame of list) {
  await renderStill({ composition, serveUrl, frame, output: `out/qa/f${String(frame).padStart(4, "0")}.png`, browserExecutable });
  console.log("ok", frame);
}
