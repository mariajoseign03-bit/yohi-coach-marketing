import { Audio } from "@remotion/media";
import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from "remotion";
import { clamp, easeIn, easeOut, pop } from "./anim";
import { Backdrop } from "./components/Backdrop";
import { Layer, Phone } from "./components/Phone";
import { Title } from "./components/Title";
import { copy } from "./copy";
import { fonts } from "./fonts";
import R from "./regiones.json";
import { T, fps } from "./timing";
import { colors, sfxVolume as v } from "./theme";

type Rg = { x: number; y: number; w: number; h: number };
const box = (k: string): [number, number, number, number] => { const r = (R as Record<string, Rg>)[k]; return [r.x, r.y, r.w, r.h]; };

/* ---------- Capas de pantalla: capturas REALES con cámara, acentos y clics ---------- */
const layers: Layer[] = [
  { src: "01-home", from: 80, to: 143, imgH: 932, fadeIn: 0, cam: [[80, 1, 0, 0], [112, 1, 0, 0], [128, 1.7, 177, 0]], taps: [{ at: 128, x: 298, y: 49 }] },
  { src: "02-login-modal", from: 135, to: 160, imgH: 932, cam: [[135, 1.12, 23, 300], [160, 1.12, 23, 300]] },
  { src: "02b-login-correo", from: 152, to: 172, imgH: 932, cam: [[152, 1.12, 23, 300], [172, 1.12, 23, 300]] },
  { src: "03-login-lleno", from: 164, to: 197, imgH: 932, cam: [[164, 1.12, 23, 300], [186, 1.12, 23, 300]], taps: [{ at: 188, x: 215, y: 685 }] },
  { src: "10-inicio", from: 189, to: 222, imgH: 932, cam: [[189, 1, 0, 0], [222, 1, 0, 0]] },

  { src: "11-rutina", from: 214, to: 268, imgH: 932, cam: [[214, 1, 0, 0], [250, 1.25, 0, 70]], hi: [{ box: box("rutina.dia"), from: 236, to: 262, pad: 0 }].slice(0, 0) },
  { src: "11-rutina-abierta", from: 260, to: 314, imgH: 932, cam: [[260, 1.25, 0, 70], [290, 1.3, 0, 420]], hi: [{ box: [17, 487, 396, 330], from: 270, to: 308 }] },

  { src: "13-chat", from: 306, to: 358, imgH: 932, cam: [[306, 1, 0, 0], [345, 1.3, 0, 150]], hi: [{ box: box("chat.whatsapp"), from: 322, to: 354 }] },
  { src: "13-chat-mocca-respuesta", from: 350, to: 410, imgH: 932, cam: [[350, 1, 0, 120], [380, 1, 0, 140]], hi: [{ box: box("chat.respuesta"), from: 362, to: 404 }] },

  // Progreso, notas y ficha: una sola captura larga con scroll suave entre bloques
  {
    src: "12-progreso-largo", from: 402, to: 700, imgH: 4702, tabbar: "tabbar-progreso",
    cam: [[402, 1, 0, 50], [446, 1, 0, 50], [466, 1, 0, 450], [492, 1, 0, 450], [514, 1, 0, 1040], [588, 1, 0, 1040], [612, 1, 0, 1375], [690, 1, 0, 1375]],
    hi: [
      { box: box("progreso.evolucion"), from: 410, to: 450 },
      { box: box("progreso.prs"), from: 468, to: 494 },
      { box: box("progreso.notas"), from: 518, to: 592 },
      { box: box("progreso.ficha"), from: 616, to: 688 },
    ],
  },
  { src: "14-agenda", from: 686, to: 790, imgH: 932, cam: [[686, 1, 0, 60], [740, 1.08, 0, 70]], hi: [{ box: [17, 255, 396, 70], from: 706, to: 780 }] },
];

const sfx = (file: string, at: number, volume: number) => (
  <Sequence from={at} durationInFrames={90} layout="none"><Audio src={staticFile(`sfx/${file}.wav`)} volume={volume} /></Sequence>
);

const FEATURES: Array<{ key: keyof typeof copy.funciones; range: number[]; size: number }> = [
  { key: "rutina", range: T.rutina, size: 96 },
  { key: "mensajes", range: T.mensajes, size: 96 },
  { key: "progreso", range: T.progreso, size: 92 },
  { key: "notas", range: T.notas, size: 96 },
  { key: "ficha", range: T.ficha, size: 96 },
  { key: "agenda", range: T.agenda, size: 96 },
];

const Closing: React.FC = () => {
  const f = useCurrentFrame();
  const vid = pop(f, fps, 6, 14, 0.8);
  const btn = pop(f, fps, 62, 10, 0.6);
  const pulse = 1 + Math.sin(Math.max(0, f - 70) / 5) * 0.025;
  const fade = (a: number) => interpolate(f, [a, a + 10], [0, 1], { ...clamp, easing: easeOut });
  return (
    <AbsoluteFill>
      {/* logo */}
      <div style={{ position: "absolute", top: 262, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: fade(0), transform: `scale(${0.6 + 0.4 * pop(f, fps, 0, 11, 0.7)})` }}>
        <Img src={staticFile("img/logo_yohi.png")} style={{ width: 170, height: 170, filter: `drop-shadow(0 0 26px ${colors.rosa}aa)` }} />
      </div>
      {/* animación de Yohi (tal cual, con el marco neón original) */}
      <div style={{ position: "absolute", top: 452, left: 340, width: 400, height: 690, overflow: "hidden", borderRadius: 34, boxShadow: `0 0 60px ${colors.rosa}88`, opacity: vid, transform: `translateY(${(1 - vid) * 120}px) scale(${0.9 + 0.1 * vid})`, background: "#000" }}>
        <OffthreadVideo src={staticFile("yohi-animacion.mp4")} muted style={{ width: 412, height: 733, objectFit: "cover", marginLeft: -6 }} />
      </div>
      {/* frase */}
      <Sequence from={22} layout="none">
        <Title lines={copy.cierre} dur={999} size={78} top={1166} exit={false} />
      </Sequence>
      {/* botón */}
      <div style={{ position: "absolute", top: 1352, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: btn, transform: `scale(${btn * pulse})` }}>
        <div style={{ padding: "22px 64px", borderRadius: 999, background: colors.rosa, color: colors.negro, fontFamily: fonts.titulo, fontSize: 58, letterSpacing: 2, boxShadow: `0 0 50px ${colors.rosa}cc, 0 10px 30px rgba(0,0,0,.5)` }}>{copy.boton}</div>
      </div>
      {/* redes */}
      <div style={{ position: "absolute", top: 1496, left: 0, right: 0, textAlign: "center", fontFamily: fonts.texto, fontWeight: 800, fontSize: 48, color: colors.blanco, opacity: fade(80), lineHeight: 1.35 }}>
        <div>{copy.instagram}</div>
        <div style={{ color: colors.rosaSuave, fontWeight: 700 }}>{copy.web}</div>
      </div>
    </AbsoluteFill>
  );
};

export const Main: React.FC = () => {
  const f = useCurrentFrame();
  // Celular: entra desde abajo con giro 3D, se mantiene, sale antes del cierre
  const inP = interpolate(f, [T.phoneIn, T.phoneIn + 42], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const outP = interpolate(f, [T.sistema[0] - 10, T.sistema[0] + 12], [0, 1], { ...clamp, easing: easeIn });
  const phoneOp = f < T.phoneIn ? 0 : 1 - outP;
  const tilt = { x: (1 - inP) * 24, y: (1 - inP) * -22 + (f > 260 ? Math.sin(f / 55) * 3 : 0) };

  return (
    <AbsoluteFill style={{ background: colors.negro }}>
      <Backdrop boost={f >= T.cierre[0] || f < T.phoneIn ? 1 : 0} />

      {/* GANCHO */}
      <Sequence from={T.gancho1[0]} durationInFrames={T.gancho1[1]} layout="none"><Title lines={copy.gancho1} dur={T.gancho1[1]} size={128} top={760} /></Sequence>
      <Sequence from={T.gancho2[0]} durationInFrames={T.gancho2[1] - T.gancho2[0] + 2} layout="none"><Title lines={copy.gancho2} dur={T.gancho2[1] - T.gancho2[0] + 2} size={124} top={700} /></Sequence>

      {/* CELULAR (capturas reales) */}
      <Phone layers={layers} tilt={tilt} offsetY={(1 - inP) * 1300 + outP * 500} opacity={phoneOp} scale={1 - outP * 0.12} />

      {/* TÍTULOS DE FUNCIÓN */}
      {FEATURES.map((F) => (
        <Sequence key={F.key} from={F.range[0]} durationInFrames={F.range[1] - F.range[0]} layout="none">
          <Title lines={copy.funciones[F.key]} dur={F.range[1] - F.range[0]} size={F.size} top={262} />
        </Sequence>
      ))}

      {/* "ES UN SISTEMA COMPLETO" */}
      <Sequence from={T.sistema[0]} durationInFrames={T.sistema[1] - T.sistema[0] + 6} layout="none">
        <Title lines={copy.sistema} dur={T.sistema[1] - T.sistema[0] + 6} size={128} top={560} lead={4} />
      </Sequence>

      {/* CIERRE */}
      <Sequence from={T.cierre[0]} layout="none"><Closing /></Sequence>

      {/* SONIDO: efectos suaves (ver LEEME) + pista de música reemplazable */}
      <Audio src={staticFile("audio/MUSICA_AQUI.wav")} volume={(fr) => v.music * interpolate(fr, [0, 20, T.total - 40, T.total], [0, 1, 1, 0], clamp)} />
      {sfx("boom", 0, v.boom)}
      {sfx("pop", 42, v.pop)}
      {sfx("whoosh", 70, v.whoosh)}
      {sfx("click", 128, v.click)}
      {sfx("typing", 150, v.typing)}
      {sfx("click", 188, v.click)}
      {[T.rutina, T.mensajes, T.progreso, T.notas, T.ficha, T.agenda].map((r, i) => <React.Fragment key={i}>{sfx("whoosh", r[0] - 2, v.whoosh * 0.7)}{sfx("pop", r[0] + 8, v.pop * 0.6)}</React.Fragment>)}
      {sfx("tap", 322, v.tap)}
      {sfx("ding", 725, v.ding)}
      {sfx("stamp", T.sistema[0] + 4, v.stamp)}
      {sfx("sparkle", T.cierre[0] + 2, v.sparkle)}
      {sfx("pop", T.cierre[0] + 28, v.pop)}
      {sfx("click", T.cierre[0] + 66, v.click)}
      {sfx("sparkle", T.cierre[0] + 70, v.sparkle)}
    </AbsoluteFill>
  );
};
