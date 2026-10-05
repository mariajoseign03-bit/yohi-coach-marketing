import { Audio } from "@remotion/media";
import React from "react";
import { AbsoluteFill, Img, interpolate, random, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { clamp, easeIn, easeInOut, easeOut, pop } from "../components/anim";
import { EmojiText } from "../components/EmojiText";
import { fonts } from "../fonts";
import { cyberColors as C, cyberCopy as T } from "./copy";

/* Linea de tiempo (30 fps). Total 15 s = 450 frames. */
export const CYBER = {
  intro: [0, 80],
  titulo: [80, 170],
  servicios: [170, 260],
  cuenta: [260, 350],
  cierre: [350, 450],
  total: 450,
} as const;

/* ---------------- Fondo: negro + glow azul + grilla en perspectiva + particulas ---------------- */
export const Background: React.FC = () => {
  const f = useCurrentFrame();
  const breathe = (Math.sin(f / 14) + 1) / 2;
  return (
    <AbsoluteFill style={{ background: C.negro, overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 80% 45% at 50% ${40 + breathe * 5}%, ${C.azul}${Math.round(70 + breathe * 50)
            .toString(16)
            .padStart(2, "0")} 0%, transparent 70%),
            radial-gradient(circle at 85% 90%, ${C.rosa}40 0%, transparent 35%),
            radial-gradient(circle at 10% 8%, ${C.azulClaro}33 0%, transparent 30%)`,
        }}
      />
      {/* Grilla cyber en perspectiva */}
      <div style={{ position: "absolute", left: -540, right: -540, bottom: -200, height: 900, perspective: 600, overflow: "hidden" }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            transform: "rotateX(62deg)",
            transformOrigin: "50% 100%",
            backgroundImage: `linear-gradient(${C.azul}88 2px, transparent 2px), linear-gradient(90deg, ${C.azul}88 2px, transparent 2px)`,
            backgroundSize: "120px 120px",
            backgroundPosition: `0px ${(f * 6) % 120}px`,
            maskImage: "linear-gradient(to top, black 30%, transparent 95%)",
            WebkitMaskImage: "linear-gradient(to top, black 30%, transparent 95%)",
          }}
        />
      </div>
      {/* Particulas */}
      {new Array(30).fill(0).map((_, i) => {
        const x = random(`px${i}`) * 1080;
        const speed = 2 + random(`ps${i}`) * 6;
        const y = (((random(`py${i}`) * 1920 - f * speed) % 1920) + 1920) % 1920;
        const s = 3 + random(`pz${i}`) * 6;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: s,
              height: s,
              borderRadius: s,
              background: i % 3 === 0 ? C.rosa : C.azulClaro,
              boxShadow: `0 0 ${s * 3}px ${i % 3 === 0 ? C.rosa : C.azul}`,
              opacity: 0.4 + 0.6 * ((Math.sin(f / 6 + i) + 1) / 2),
            }}
          />
        );
      })}
      {/* Grano */}
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: 0.06, mixBlendMode: "screen" }}>
        <filter id="g">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={f % 10} />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#g)" />
      </svg>
    </AbsoluteFill>
  );
};

/* ---------------- Rayo ---------------- */
export const Bolt: React.FC<{ at: number; x: number; seed: string; color?: string }> = ({ at, x, seed, color = C.azulClaro }) => {
  const f = useCurrentFrame();
  const local = f - at;
  if (local < 0 || local > 7) return null;
  const pts: string[] = [];
  let px = x;
  for (let y = -40; y <= 1960; y += 120) {
    px += (random(`${seed}${y}`) - 0.5) * 180;
    pts.push(`${px},${y}`);
  }
  const o = interpolate(local, [0, 1, 4, 7], [0, 1, 0.6, 0], clamp);
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: o }}>
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth={22} strokeLinejoin="round" opacity={0.35} style={{ filter: "blur(10px)" }} />
      <polyline points={pts.join(" ")} fill="none" stroke={C.blanco} strokeWidth={6} strokeLinejoin="round" />
    </svg>
  );
};

/* Destello de pantalla completa */
export const Flash: React.FC<{ at: number; color?: string; max?: number }> = ({ at, color = C.azulClaro, max = 0.55 }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [at - 1, at, at + 7], [0, max, 0], clamp);
  return <AbsoluteFill style={{ background: color, opacity: o, mixBlendMode: "screen", pointerEvents: "none" }} />;
};

/* ---------------- Etiquetas de descuento cayendo (solo "%", sin precios) ---------------- */
const Tags: React.FC<{ from: number; to: number }> = ({ from, to }) => {
  const f = useCurrentFrame();
  if (f < from || f > to) return null;
  return (
    <>
      {new Array(9).fill(0).map((_, i) => {
        const start = from + i * 6;
        const local = f - start;
        if (local < 0) return null;
        const x = 60 + random(`tx${i}`) * 900;
        const y = interpolate(local, [0, 90], [-200, 2100], { ...clamp, easing: easeIn });
        const rot = (random(`tr${i}`) - 0.5) * 70 + local * (random(`tw${i}`) - 0.5) * 4;
        const pink = i % 2 === 0;
        return (
          <svg key={i} width={150} height={110} viewBox="0 0 150 110" style={{ position: "absolute", left: x, top: y, rotate: `${rot}deg`, filter: `drop-shadow(0 0 16px ${pink ? C.rosa : C.azul})` }}>
            <path d="M8 18 L100 8 L142 55 L100 102 L8 92 Z" fill={pink ? C.rosa : C.azul} stroke={C.blanco} strokeWidth={4} />
            <circle cx={112} cy={55} r={9} fill={C.negro} />
            <text x={52} y={72} textAnchor="middle" fontFamily="Anton, Impact, sans-serif" fontSize={50} fill={C.blanco}>
              %
            </text>
          </svg>
        );
      })}
    </>
  );
};

/* Destellos tipo estrella */
export const Sparkles: React.FC<{ cx: number; cy: number; at: number; n?: number }> = ({ cx, cy, at, n = 10 }) => {
  const f = useCurrentFrame();
  const local = f - at;
  if (local < 0 || local > 30) return null;
  return (
    <>
      {new Array(n).fill(0).map((_, i) => {
        const a = (i / n) * Math.PI * 2 + random(`sa${at}${i}`);
        const d = interpolate(local, [0, 24], [30, 260 + random(`sd${at}${i}`) * 200], { ...clamp, easing: easeOut });
        const o = interpolate(local, [0, 4, 30], [0, 1, 0], clamp);
        const s = 30 + random(`ss${at}${i}`) * 40;
        return (
          <svg key={i} width={s} height={s} viewBox="-50 -50 100 100" style={{ position: "absolute", left: cx + Math.cos(a) * d - s / 2, top: cy + Math.sin(a) * d - s / 2, opacity: o, rotate: `${local * 8}deg` }}>
            <path d="M0,-50 C4,-12 12,-4 50,0 C12,4 4,12 0,50 C-4,12 -12,4 -50,0 C-12,-4 -4,-12 0,-50 Z" fill={i % 2 ? C.rosa : C.blanco} />
          </svg>
        );
      })}
    </>
  );
};

/* ---------------- Yohi Cyber (ilustracion original, sin modificar) ---------------- */
const Yohi: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = pop(f, fps, 6, 10, 0.8);
  const toTitle = interpolate(f, [CYBER.titulo[0], CYBER.titulo[0] + 14], [0, 1], { ...clamp, easing: easeInOut });
  const toServ = interpolate(f, [CYBER.servicios[0], CYBER.servicios[0] + 14], [0, 1], { ...clamp, easing: easeInOut });
  const exit = interpolate(f, [CYBER.cuenta[0] - 8, CYBER.cuenta[0]], [0, 1], { ...clamp, easing: easeIn });
  const back = pop(f, fps, CYBER.cierre[0] + 10, 10, 0.8);
  const inFinal = f >= CYBER.cierre[0];

  // posicion (centro) y ancho por fase
  let cx = 540 + interpolate(enter, [0, 1], [-1300, 0]);
  let cy = 960;
  let w = 1040;
  cy = interpolate(toTitle, [0, 1], [cy, 1230]);
  w = interpolate(toTitle, [0, 1], [w, 820]);
  cx = interpolate(toServ, [0, 1], [cx, 700]);
  cy = interpolate(toServ, [0, 1], [cy, 1330]);
  w = interpolate(toServ, [0, 1], [w, 640]);
  cx += exit * 1100;
  if (inFinal) {
    cx = 540;
    cy = interpolate(back, [0, 1], [2300, 1110]);
    w = 820;
  }
  const rot = inFinal ? interpolate(back, [0, 1], [8, 0]) : interpolate(enter, [0, 1], [-18, 0]) + exit * 20;
  const float = Math.sin(f / 9) * 10;
  const squash = 1 + Math.sin(f / 4.5) * 0.012;
  if (exit >= 1 && !inFinal) return null;
  return (
    <Img
      src={staticFile("yohi_cyber.png")}
      style={{
        position: "absolute",
        width: w,
        left: cx - w / 2,
        top: cy - (w * 1199) / 1312 / 2 + float,
        rotate: `${rot}deg`,
        scale: String(squash),
        filter: `drop-shadow(0 0 30px ${C.rosa}aa) drop-shadow(0 0 60px ${C.azul}88) drop-shadow(0 30px 40px rgba(0,0,0,.7))`,
      }}
    />
  );
};

/* ---------------- Texto grande con glitch de entrada ---------------- */
const BigText: React.FC<{ text: string; at: number; size: number; color?: string; glow?: string; emojiScale?: number }> = ({
  text,
  at,
  size,
  color = C.blanco,
  glow = C.azul,
  emojiScale = 0.85,
}) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(f, fps, at, 9, 0.6);
  const local = f - at;
  const glitch = local >= 0 && local < 8 ? (random(`g${at}${f}`) - 0.5) * 26 : 0;
  const base: React.CSSProperties = {
    fontFamily: fonts.titulo,
    fontSize: size,
    lineHeight: 1,
    textAlign: "center",
    whiteSpace: "nowrap",
  };
  if (local < 0) return null;
  return (
    <div style={{ position: "relative", scale: String(interpolate(p, [0, 1], [2.2, 1])), opacity: interpolate(p, [0, 0.2], [0, 1], clamp) }}>
      {glitch !== 0 && (
        <>
          <div style={{ ...base, position: "absolute", inset: 0, color: C.rosa, translate: `${glitch}px 0px`, opacity: 0.8 }}>
            <EmojiText text={text} scale={emojiScale} />
          </div>
          <div style={{ ...base, position: "absolute", inset: 0, color: C.azulClaro, translate: `${-glitch}px 0px`, opacity: 0.8 }}>
            <EmojiText text={text} scale={emojiScale} />
          </div>
        </>
      )}
      <div style={{ ...base, position: "relative", color, filter: `drop-shadow(0 0 18px ${glow}) drop-shadow(0 6px 0 rgba(0,0,0,.5))` }}>
        <EmojiText text={text} scale={emojiScale} />
      </div>
    </div>
  );
};

/* Tarjeta de servicio (vidrio azul con borde rosado) */
const ServiceCard: React.FC<{ text: string; at: number; fromLeft: boolean }> = ({ text, at, fromLeft }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(f, fps, at, 11, 0.7);
  const shine = interpolate(f, [at + 10, at + 32], [-30, 130], { ...clamp, easing: easeInOut });
  return (
    <div
      style={{
        padding: "34px 48px",
        borderRadius: 40,
        background: `linear-gradient(140deg, ${C.azulProfundo}, ${C.azul})`,
        border: `4px solid ${C.rosa}`,
        boxShadow: `0 0 40px ${C.azul}, 0 0 80px ${C.rosa}55, inset 0 0 30px ${C.azulClaro}55`,
        fontFamily: fonts.titulo,
        fontSize: 118,
        lineHeight: 1,
        color: C.blanco,
        whiteSpace: "nowrap",
        position: "relative",
        overflow: "hidden",
        translate: `${interpolate(p, [0, 1], [fromLeft ? -1200 : 1200, 0])}px 0px`,
        rotate: `${interpolate(p, [0, 1], [fromLeft ? -8 : 8, fromLeft ? -2 : 2])}deg`,
      }}
    >
      {text}
      <div style={{ position: "absolute", inset: 0, background: `linear-gradient(105deg, transparent ${shine - 15}%, rgba(255,255,255,.45) ${shine}%, transparent ${shine + 15}%)` }} />
    </div>
  );
};

/* ---------------- Cuenta regresiva ---------------- */
const Countdown: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const start = CYBER.cuenta[0];
  const idx = Math.min(2, Math.floor((f - start) / 30));
  const local = (f - start) % 30;
  const n = 3 - idx;
  const p = pop(local, fps, 0, 8, 0.5);
  const ring = interpolate(local, [0, 30], [0, 1], clamp);
  const color = n === 2 ? C.rosa : C.azulClaro;
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <svg width={760} height={760} viewBox="0 0 200 200" style={{ position: "absolute", rotate: "-90deg" }}>
        <circle cx={100} cy={100} r={88} fill="none" stroke="#ffffff22" strokeWidth={8} />
        <circle cx={100} cy={100} r={88} fill="none" stroke={color} strokeWidth={8} strokeLinecap="round" strokeDasharray={553} strokeDashoffset={553 * ring} style={{ filter: `drop-shadow(0 0 8px ${color})` }} />
      </svg>
      <div
        style={{
          fontFamily: fonts.titulo,
          fontSize: 560,
          lineHeight: 1,
          color: C.blanco,
          scale: String(interpolate(p, [0, 1], [2.4, 1]) * interpolate(local, [22, 30], [1, 0.85], clamp)),
          opacity: interpolate(local, [0, 2, 24, 30], [0, 1, 1, 0], clamp),
          filter: `drop-shadow(0 0 30px ${color}) drop-shadow(0 0 80px ${color})`,
        }}
      >
        {n}
      </div>
    </AbsoluteFill>
  );
};

/* ---------------- SFX ---------------- */
export const Sfx: React.FC<{ at: number; file: string; volume: number }> = ({ at, file, volume }) => (
  <Sequence from={at} layout="none" name={`SFX ${file}`}>
    <Audio src={staticFile(`sfx/${file}.wav`)} volume={volume} />
  </Sequence>
);

/* ---------------- Composicion ---------------- */
export const CyberTeaser: React.FC = () => {
  const f = useCurrentFrame();
  const [t0, t1] = CYBER.titulo;
  const [s0, s1] = CYBER.servicios;
  const [c0, c1] = CYBER.cuenta;
  const [k0] = CYBER.cierre;

  // sacudida de camara en golpes
  const hits = [10, t0 + 12, c0, c0 + 30, c0 + 60, k0 + 6];
  const shake = hits.reduce((acc, h) => acc + Math.max(0, 1 - Math.abs(f - h - 3) / 6) * (f >= h ? 1 : 0), 0);
  const sx = (random(`sx${f}`) - 0.5) * 30 * shake;
  const sy = (random(`sy${f}`) - 0.5) * 30 * shake;

  const fadeTitle = interpolate(f, [t1 - 8, t1], [1, 0], clamp);
  const fadeServ = interpolate(f, [s1 - 8, s1], [1, 0], clamp);
  const plusP = interpolate(f, [s0 + 22, s0 + 30], [0, 1], { ...clamp, easing: easeOut });

  return (
    <AbsoluteFill>
      <Background />
      <AbsoluteFill style={{ translate: `${sx}px ${sy}px` }}>
        {/* Rayos */}
        <Bolt at={2} x={260} seed="a" />
        <Bolt at={5} x={820} seed="b" color={C.rosa} />
        <Bolt at={t0 + 10} x={180} seed="c" />
        <Bolt at={t0 + 13} x={900} seed="d" color={C.rosa} />
        <Bolt at={c0} x={540} seed="e" />
        <Bolt at={k0 + 4} x={300} seed="f" color={C.rosa} />
        <Bolt at={k0 + 6} x={780} seed="g" />

        <Tags from={10} to={110} />
        <Yohi />
        <Sparkles cx={540} cy={900} at={14} n={12} />

        {/* SE VIENE / EL CYBER */}
        {f >= t0 && f < t1 && (
          <AbsoluteFill style={{ top: 300, alignItems: "center", opacity: fadeTitle, gap: 10 }}>
            <BigText text={T.titulo1} at={t0 + 4} size={190} />
            <BigText text={T.titulo2} at={t0 + 12} size={200} color={C.azulClaro} glow={C.azul} />
          </AbsoluteFill>
        )}

        {/* Servicios */}
        {f >= s0 && f < s1 && (
          <AbsoluteFill style={{ top: 330, alignItems: "center", gap: 26, opacity: fadeServ }}>
            <ServiceCard text={T.servicio1} at={s0 + 4} fromLeft />
            <div style={{ fontFamily: fonts.titulo, fontSize: 130, lineHeight: 1, color: C.rosa, scale: String(plusP), filter: `drop-shadow(0 0 20px ${C.rosa})` }}>+</div>
            <ServiceCard text={T.servicio2} at={s0 + 32} fromLeft={false} />
          </AbsoluteFill>
        )}

        {/* Cuenta regresiva */}
        {f >= c0 && f < c1 && <Countdown />}

        {/* Cierre */}
        {f >= k0 && (
          <AbsoluteFill style={{ top: 290, alignItems: "center", gap: 0 }}>
            <BigText text={T.cierre1} at={k0 + 2} size={210} />
            <BigText text={T.cierre2} at={k0 + 10} size={240} color={C.rosa} glow={C.rosa} emojiScale={0.8} />
            <div
              style={{
                position: "absolute",
                top: 1450 - 290,
                display: "flex",
                alignItems: "center",
                gap: 16,
                fontFamily: fonts.texto,
                fontWeight: 900,
                fontSize: 50,
                color: C.blanco,
                opacity: interpolate(f, [k0 + 30, k0 + 42], [0, 1], clamp),
                translate: `0px ${interpolate(f, [k0 + 30, k0 + 42], [30, 0], { ...clamp, easing: easeOut })}px`,
                padding: "14px 30px 14px 14px",
                borderRadius: 999,
                background: "rgba(5,6,10,.75)",
                border: `3px solid ${C.rosa}`,
              }}
            >
              <Img src={staticFile("logo_yohi.png")} style={{ width: 72, height: 72, borderRadius: 36 }} />
              {T.handle}
            </div>
          </AbsoluteFill>
        )}
        <Sparkles cx={540} cy={560} at={k0 + 12} n={14} />
      </AbsoluteFill>

      {/* Destellos */}
      <Flash at={2} />
      <Flash at={t0 + 12} color={C.azul} max={0.4} />
      <Flash at={c0} max={0.35} />
      <Flash at={c0 + 30} color={C.rosa} max={0.3} />
      <Flash at={c0 + 60} max={0.35} />
      <Flash at={k0 + 6} color={C.rosa} max={0.4} />

      {/* Sonido */}
      <Sfx at={1} file="zap" volume={0.7} />
      <Sfx at={6} file="whoosh" volume={0.6} />
      <Sfx at={12} file="boom" volume={0.9} />
      <Sfx at={20} file="pop1" volume={0.45} />
      <Sfx at={32} file="pop2" volume={0.45} />
      <Sfx at={44} file="pop3" volume={0.45} />
      <Sfx at={16} file="sparkle" volume={0.5} />
      <Sfx at={t0} file="whoosh" volume={0.55} />
      <Sfx at={t0 + 10} file="zap" volume={0.7} />
      <Sfx at={t0 + 12} file="boom" volume={0.85} />
      <Sfx at={s0 + 4} file="whoosh" volume={0.55} />
      <Sfx at={s0 + 24} file="pop4" volume={0.55} />
      <Sfx at={s0 + 32} file="whoosh" volume={0.55} />
      <Sfx at={s0 + 40} file="click" volume={0.5} />
      <Sfx at={c0 - 54} file="riser" volume={0.55} />
      <Sfx at={c0} file="tick" volume={0.8} />
      <Sfx at={c0} file="zap" volume={0.5} />
      <Sfx at={c0 + 30} file="tick" volume={0.8} />
      <Sfx at={c0 + 60} file="tick" volume={0.8} />
      <Sfx at={c0 + 60} file="zap" volume={0.5} />
      <Sfx at={k0 + 4} file="zap" volume={0.6} />
      <Sfx at={k0 + 6} file="boom" volume={0.95} />
      <Sfx at={k0 + 12} file="sparkle" volume={0.5} />
      <Sfx at={k0 + 30} file="shimmer" volume={0.45} />
    </AbsoluteFill>
  );
};
