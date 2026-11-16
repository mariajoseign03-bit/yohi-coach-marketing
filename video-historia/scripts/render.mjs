// npm run render            -> recaptura el portal (local, datos demo) y renderiza el video completo
// npm run render -- --skip-capture   -> solo vuelve a renderizar con las capturas existentes
// npm run render -- --branch=otra-rama   -> usa otra rama del repo para leer el código del portal (por defecto workers-site)
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPO = path.resolve(ROOT, "..");
const args = process.argv.slice(2);
const skipCapture = args.includes("--skip-capture");
const branch = (args.find((a) => a.startsWith("--branch=")) || "--branch=workers-site").split("=")[1];
const PORT = 8787, BASE = `http://localhost:${PORT}`;
const run = (cmd, a, o = {}) => { const r = spawnSync(cmd, a, { stdio: "inherit", cwd: ROOT, env: { ...process.env, CI: "1", WRANGLER_SEND_METRICS: "false" }, ...o }); if (r.status !== 0) throw new Error(`${cmd} ${a.join(" ")} falló`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const chrome = fs.existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined;
if (chrome && !process.env.REMOTION_CHROME) process.env.REMOTION_CHROME = chrome;

async function capture() {
  const SRC = path.join(ROOT, ".portal-src"), STATE = path.join(ROOT, ".wrangler-demo");
  console.log(`\n▶ Código del portal: rama ${branch}`);
  spawnSync("git", ["fetch", "origin", branch], { cwd: REPO, stdio: "inherit" });
  if (fs.existsSync(SRC)) spawnSync("git", ["worktree", "remove", "--force", SRC], { cwd: REPO });
  run("git", ["worktree", "add", "--detach", SRC, `origin/${branch}`], { cwd: REPO });
  fs.rmSync(STATE, { recursive: true, force: true });
  const wr = path.join(ROOT, "node_modules/.bin/wrangler");
  // SOLO base local (--local): nunca producción.
  run(wr, ["d1", "migrations", "apply", "yohi-portal", "--local", "--persist-to", STATE], { cwd: SRC, stdio: "ignore" });
  const srv = spawn(wr, ["dev", "--local", "--persist-to", STATE, "--port", String(PORT), "--var", "SETUP_TOKEN:demo-setup-token"], { cwd: SRC, stdio: "ignore", env: { ...process.env, CI: "1" } });
  try {
    for (let i = 0; i < 60; i++) { try { if ((await fetch(BASE + "/")).ok) break; } catch {} await sleep(1000); }
    run("node", ["scripts/seed-demo.mjs", BASE]);
    run("node", ["scripts/capture.mjs", BASE]);
  } finally { srv.kill("SIGTERM"); spawnSync("pkill", ["-f", "workerd"]); }
  fs.cpSync(path.join(ROOT, "capturas"), path.join(ROOT, "public/portal"), { recursive: true });
  fs.copyFileSync(path.join(ROOT, "capturas/regiones.json"), path.join(ROOT, "src/regiones.json"));
}

if (!skipCapture) await capture();
if (!fs.existsSync(path.join(ROOT, "public/audio/MUSICA_AQUI.wav"))) run("python3", ["scripts/make_audio.py"]);
fs.mkdirSync(path.join(ROOT, "out"), { recursive: true });
const NAME = "yohi-portal-historia";
run("npx", ["remotion", "render", "src/index.ts", "YohiPortalHistoria", "out/_raw.mp4", "--codec=h264", "--crf=18", "--pixel-format=yuv420p", "--image-format=png", "--color-space=bt709", "--audio-codec=aac", "--audio-bitrate=320k", "--concurrency=4"]);
// Normaliza el audio a -14 LUFS en 2 pasadas; el video se copia sin recomprimir.
const st = spawnSync("ffmpeg", ["-hide_banner", "-i", "out/_raw.mp4", "-af", "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"], { cwd: ROOT, encoding: "utf8" }).stderr;
const j = JSON.parse(st.slice(st.lastIndexOf("{"), st.lastIndexOf("}") + 1));
run("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-i", "out/_raw.mp4", "-c:v", "copy", "-af", `loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=${j.input_i}:measured_TP=${j.input_tp}:measured_LRA=${j.input_lra}:measured_thresh=${j.input_thresh}:offset=${j.target_offset}:linear=true,aresample=48000`, "-c:a", "aac", "-b:a", "320k", "-ar", "48000", "-movflags", "+faststart", `out/${NAME}.mp4`]);
fs.rmSync(path.join(ROOT, "out/_raw.mp4"));
run("npx", ["remotion", "still", "src/index.ts", "YohiPortalHistoria", `out/${NAME}-portada.png`, "--frame=64", "--image-format=png"]);
console.log(`\n✔ Listo: out/${NAME}.mp4 y out/${NAME}-portada.png`);
