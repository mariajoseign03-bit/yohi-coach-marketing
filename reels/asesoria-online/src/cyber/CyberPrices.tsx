import React from "react";
import { AbsoluteFill, Img, interpolate, random, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { clamp, easeIn, easeInOut, easeOut, pop } from "../components/anim";
import { EmojiText } from "../components/EmojiText";
import { fonts } from "../fonts";
import { cyberColors as C } from "./copy";
import { Background, Bolt, Flash, Sfx, Sparkles } from "./CyberTeaser";
import { cyberPrices as P } from "./prices";

/* Linea de tiempo (30 fps). Total 10 s = 300 frames. */
export const PRICES = {
  asesoria: [0, 100],
  personalizado: [100, 210],
  cierre: [210, 300],
  total: 300,
} as const;

type Fila = { plan: string; antes: string; ahora: string; sufijo: string };

/* Fila de precio: plan a la izquierda, precio que "golpea" a la derecha, tachado animado */
const PriceRow: React.FC<{ fila: Fila; at: number }> = ({ fila, at }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = f - at;
  if (local < 0) return null;
  const row = pop(f, fps, at, 13, 0.6);
  const hasOld = !!fila.antes;
  const strike = interpolate(local, [4, 10], [0, 100], { ...clamp, easing: easeOut });
  const slamAt = hasOld ? at + 10 : at + 3;
  const slam = pop(f, fps, slamAt, 8, 0.5);
  const shine = interpolate(f, [slamAt + 4, slamAt + 20], [-30, 130], { ...clamp, easing: easeInOut });
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 20,
        padding: "22px 0",
        borderTop: "2px solid rgba(255,255,255,.12)",
        opacity: interpolate(row, [0, 0.3], [0, 1], clamp),
        translate: `${interpolate(row, [0, 1], [-260, 0])}px 0px`,
      }}
    >
      <div style={{ fontFamily: fonts.texto, fontWeight: 900, fontSize: 48, color: C.blanco, whiteSpace: "nowrap" }}>{fila.plan}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
        {hasOld && (
          <div style={{ position: "relative", fontFamily: fonts.texto, fontWeight: 700, fontSize: 44, color: "#9AA7C7" }}>
            {fila.antes}
            <div style={{ position: "absolute", left: 0, top: "52%", height: 6, width: `${strike}%`, background: C.rosa, borderRadius: 3, boxShadow: `0 0 10px ${C.rosa}` }} />
          </div>
        )}
        <div
          style={{
            position: "relative",
            fontFamily: fonts.titulo,
            fontSize: 116,
            lineHeight: 1,
            color: "transparent",
            backgroundImage: `linear-gradient(105deg, ${C.blanco} ${shine - 18}%, ${C.azulClaro} ${shine}%, ${C.blanco} ${shine + 18}%)`,
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            filter: `drop-shadow(0 0 18px ${C.azul}) drop-shadow(0 0 40px ${C.azul}aa)`,
            scale: String(interpolate(slam, [0, 1], [1.8, 1])),
            opacity: interpolate(slam, [0, 0.2], [0, 1], clamp),
            transformOrigin: "100% 60%",
            whiteSpace: "nowrap",
          }}
        >
          {fila.ahora}
        </div>
        {fila.sufijo && <div style={{ fontFamily: fonts.texto, fontWeight: 800, fontSize: 34, color: C.rosa, opacity: interpolate(slam, [0.5, 1], [0, 1], clamp) }}>{fila.sufijo}</div>}
      </div>
    </div>
  );
};

/* Tarjeta de bloque (asesoria / personalizado) */
const PriceCard: React.FC<{ titulo: string; filas: Fila[]; start: number; end: number; rowGap: number }> = ({ titulo, filas, start, end, rowGap }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (f < start || f >= end) return null;
  const enter = pop(f, fps, start, 12, 0.7);
  const exit = interpolate(f, [end - 8, end], [0, 1], { ...clamp, easing: easeIn });
  const glow = 0.7 + 0.3 * Math.sin(f / 5);
  return (
    <div
      style={{
        position: "absolute",
        left: 50,
        right: 50,
        top: 290,
        padding: "44px 40px 26px",
        borderRadius: 48,
        background: "linear-gradient(160deg, rgba(11,29,107,.92), rgba(5,6,10,.92))",
        border: `4px solid ${C.rosa}`,
        boxShadow: `0 0 ${50 * glow}px ${C.rosa}88, 0 0 ${90 * glow}px ${C.azul}66, inset 0 0 40px ${C.azul}44`,
        translate: `${interpolate(enter, [0, 1], [0, 0]) + exit * -1200}px ${interpolate(enter, [0, 1], [600, 0])}px`,
        rotate: `${interpolate(enter, [0, 1], [6, 0]) + exit * -8}deg`,
        opacity: interpolate(enter, [0, 0.2], [0, 1], clamp),
        filter: exit > 0.02 ? `blur(${exit * 20}px)` : undefined,
      }}
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 24px",
          borderRadius: 999,
          background: C.azul,
          color: C.blanco,
          fontFamily: fonts.texto,
          fontWeight: 900,
          fontSize: 34,
          letterSpacing: "0.14em",
          boxShadow: `0 0 24px ${C.azul}`,
          marginBottom: 22,
        }}
      >
        <EmojiText text="⚡ CYBER" scale={1} />
      </div>
      <div style={{ fontFamily: fonts.titulo, fontSize: 104, lineHeight: 1, color: C.blanco, marginBottom: 24, whiteSpace: "nowrap" }}>
        <EmojiText text={titulo} scale={0.82} />
      </div>
      {filas.map((fila, i) => (
        <PriceRow key={fila.plan} fila={fila} at={start + 16 + i * rowGap} />
      ))}
    </div>
  );
};

/* Yohi oficial (ilustracion sin modificar) */
const Yohi: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const [k0] = PRICES.cierre;
  const peek = pop(f, fps, 6, 12, 0.8);
  const final = pop(f, fps, k0 + 4, 10, 0.8);
  const inFinal = f >= k0;
  const w = inFinal ? 860 : 520;
  const cx = inFinal ? 540 : interpolate(peek, [0, 1], [-400, 250]);
  const cy = inFinal ? interpolate(final, [0, 1], [2300, 1150]) : 1590;
  const float = Math.sin(f / 9) * 10;
  return (
    <Img
      src={staticFile("yohi_cyber.png")}
      style={{
        position: "absolute",
        width: w,
        left: cx - w / 2,
        top: cy - (w * 1199) / 1312 / 2 + float,
        rotate: `${inFinal ? interpolate(final, [0, 1], [10, 0]) : interpolate(peek, [0, 1], [-16, -4])}deg`,
        filter: `drop-shadow(0 0 30px ${C.rosa}aa) drop-shadow(0 0 60px ${C.azul}88) drop-shadow(0 30px 40px rgba(0,0,0,.7))`,
        zIndex: inFinal ? 0 : 2,
      }}
    />
  );
};

export const CyberPrices: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const [a0, a1] = PRICES.asesoria;
  const [p0, p1] = PRICES.personalizado;
  const [k0] = PRICES.cierre;
  const aGap = 24;
  const pGap = 20;

  const hits = [a0 + 26, a0 + 40, p0 + 19, p0 + 39, p0 + 59, k0 + 8];
  const shake = hits.reduce((acc, h) => acc + Math.max(0, 1 - Math.abs(f - h - 2) / 5) * (f >= h ? 1 : 0), 0);
  const sx = (random(`x${f}`) - 0.5) * 22 * shake;
  const sy = (random(`y${f}`) - 0.5) * 22 * shake;

  const t1 = pop(f, fps, k0 + 10, 9, 0.6);
  const badge = pop(f, fps, k0 + 22, 9, 0.6);
  const pulse = 1 + 0.05 * Math.sin((f - k0) / 3.5) * (f > k0 + 34 ? 1 : 0);

  return (
    <AbsoluteFill>
      <Background />
      <AbsoluteFill style={{ translate: `${sx}px ${sy}px` }}>
        <Bolt at={0} x={240} seed="pa" />
        <Bolt at={2} x={860} seed="pb" color={C.rosa} />
        <Bolt at={p0} x={700} seed="pc" />
        <Bolt at={k0 + 6} x={200} seed="pd" color={C.rosa} />
        <Bolt at={k0 + 8} x={880} seed="pe" />

        <Yohi />
        <PriceCard titulo={P.asesoria.titulo} filas={P.asesoria.filas} start={a0} end={a1} rowGap={aGap} />
        <PriceCard titulo={P.personalizado.titulo} filas={P.personalizado.filas} start={p0} end={p1} rowGap={pGap} />

        {f >= k0 && (
          <AbsoluteFill style={{ top: 300, alignItems: "center", gap: 26 }}>
            <div
              style={{
                fontFamily: fonts.titulo,
                fontSize: 150,
                lineHeight: 1,
                color: C.blanco,
                whiteSpace: "nowrap",
                scale: String(interpolate(t1, [0, 1], [2.2, 1])),
                opacity: interpolate(t1, [0, 0.2], [0, 1], clamp),
                filter: `drop-shadow(0 0 20px ${C.azul})`,
              }}
            >
              PRECIOS <span style={{ color: C.azulClaro }}>CYBER</span> <EmojiText text={P.cierre1.replace(/^PRECIOS CYBER\s*/, "")} scale={0.8} />
            </div>
            <div
              style={{
                padding: "22px 50px",
                borderRadius: 999,
                background: C.rosa,
                color: C.negro,
                fontFamily: fonts.titulo,
                fontSize: 96,
                lineHeight: 1,
                letterSpacing: "0.02em",
                whiteSpace: "nowrap",
                boxShadow: `0 0 ${40 * pulse}px ${C.rosa}, 0 0 ${90 * pulse}px ${C.rosa}77`,
                scale: String(interpolate(badge, [0, 1], [0.2, 1]) * pulse),
                opacity: interpolate(badge, [0, 0.2], [0, 1], clamp),
                rotate: "-2deg",
              }}
            >
              {P.cierre2}
            </div>
          </AbsoluteFill>
        )}
        {f >= k0 && (
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 1480,
              display: "flex",
              justifyContent: "center",
              opacity: interpolate(f, [k0 + 36, k0 + 46], [0, 1], clamp),
              translate: `0px ${interpolate(f, [k0 + 36, k0 + 46], [30, 0], { ...clamp, easing: easeOut })}px`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "12px 30px 12px 12px", borderRadius: 999, background: "rgba(5,6,10,.8)", border: `3px solid ${C.rosa}`, fontFamily: fonts.texto, fontWeight: 900, fontSize: 48, color: C.blanco }}>
              <Img src={staticFile("logo_yohi.png")} style={{ width: 68, height: 68, borderRadius: 34 }} />
              {P.handle}
            </div>
          </div>
        )}
        <Sparkles cx={540} cy={420} at={k0 + 10} n={14} />
        <Sparkles cx={800} cy={600} at={a0 + 42} n={8} />
        <Sparkles cx={800} cy={760} at={p0 + 61} n={8} />
      </AbsoluteFill>

      <Flash at={0} max={0.45} />
      <Flash at={p0} color={C.azul} max={0.35} />
      <Flash at={k0 + 8} color={C.rosa} max={0.4} />

      {/* Sonido */}
      <Sfx at={0} file="zap" volume={0.7} />
      <Sfx at={2} file="whoosh" volume={0.55} />
      <Sfx at={a0 + 16} file="whoosh_short" volume={0.4} />
      <Sfx at={a0 + 20} file="click" volume={0.5} />
      <Sfx at={a0 + 26} file="chaching" volume={0.7} />
      <Sfx at={a0 + 40} file="whoosh_short" volume={0.4} />
      <Sfx at={a0 + 43} file="chaching" volume={0.7} />
      <Sfx at={p0} file="zap" volume={0.6} />
      <Sfx at={p0 + 2} file="whoosh" volume={0.55} />
      <Sfx at={p0 + 19} file="pop2" volume={0.6} />
      <Sfx at={p0 + 39} file="pop3" volume={0.6} />
      <Sfx at={p0 + 59} file="pop4" volume={0.6} />
      <Sfx at={p0 + 60} file="chaching" volume={0.55} />
      <Sfx at={k0 + 6} file="zap" volume={0.6} />
      <Sfx at={k0 + 8} file="boom" volume={0.95} />
      <Sfx at={k0 + 22} file="stamp" volume={0.8} />
      <Sfx at={k0 + 12} file="sparkle" volume={0.5} />
    </AbsoluteFill>
  );
};
