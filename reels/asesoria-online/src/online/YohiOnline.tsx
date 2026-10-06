import { Audio } from "@remotion/media";
import React from "react";
import { AbsoluteFill, Img, interpolate, random, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { clamp, easeIn, easeInOut, easeOut, pop } from "../components/anim";
import { Background } from "../components/Background";
import { Character } from "../components/Character";
import { EmojiText } from "../components/EmojiText";
import { fonts } from "../fonts";
import { colors, sfxVolume } from "../theme";
import { onlineCopy as T } from "./copy";
import tour from "./tour.json";

/* Linea de tiempo (30 fps). Total 18 s = 540 frames. */
const TYPE_START = 16; // primera letra
const TYPE_STEP = 3; // frames por letra
const ENTER_IN = TYPE_START + T.url.length * TYPE_STEP + 2; // aparece la tecla
const ENTER_PRESS = ENTER_IN + 14; // se presiona
const ZOOM = ENTER_PRESS + 14; // zoom hacia la pantalla
const PHONE_IN = ZOOM + 6; // aparece el telefono con la web
const TOUR_START = PHONE_IN + 16;
const STOP_LEN = 43; // frames por parada (incluye el scroll)
const MOVE = 13; // frames de scroll entre paradas
const FINAL = TOUR_START + STOP_LEN * tour.stops.length - 4;
export const ONLINE = { total: 540 } as const;

/* ---------------- Telefono ---------------- */
const SCREEN_W = 600;
const SCREEN_H = 1270;
const BEZEL = 16;
const STATUS_H = 64;
const BAR_H = 126;
const SCALE = SCREEN_W / tour.width; // px de pantalla por px de captura
const VIEW_H = (SCREEN_H - STATUS_H) / SCALE; // alto visible en px de captura
const MAX_SCROLL = tour.height - VIEW_H;

const arrival = (i: number) => TOUR_START + i * STOP_LEN;

/** Posicion de scroll (px de captura) y velocidad para el desenfoque de movimiento. */
const scrollAt = (f: number): number => {
  const stops = tour.stops.map((s) => Math.min(s.y, MAX_SCROLL));
  const drift = 1.4; // deriva suave mientras se lee cada seccion
  if (f <= arrival(0)) return 0;
  for (let i = 0; i < stops.length; i++) {
    const a = arrival(i);
    const next = arrival(i + 1);
    const moveStart = next - MOVE;
    if (f < moveStart || i === stops.length - 1) return Math.min(stops[i] + (f - a) * drift, MAX_SCROLL);
    if (f < next) {
      const from = stops[i] + (moveStart - a) * drift;
      return interpolate(f, [moveStart, next], [from, stops[i + 1]], { ...clamp, easing: easeInOut });
    }
  }
  return stops[stops.length - 1];
};

const StatusBar: React.FC = () => (
  <div
    style={{
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: STATUS_H,
      background: "#0B0B0B",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "8px 48px 0",
      fontFamily: fonts.texto,
      fontWeight: 800,
      fontSize: 28,
      color: colors.blanco,
      zIndex: 2,
    }}
  >
    <span>9:41</span>
    <svg width="96" height="24" viewBox="0 0 96 24">
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={i * 9} y={16 - i * 4} width={6} height={6 + i * 4} rx={1.5} fill={colors.blanco} />
      ))}
      <rect x={50} y={4} width={38} height={17} rx={5} fill="none" stroke={colors.blanco} strokeWidth={2} opacity={0.7} />
      <rect x={53} y={7} width={26} height={11} rx={2.5} fill={colors.rosa} />
      <rect x={90} y={9} width={3} height={7} rx={1.5} fill={colors.blanco} opacity={0.7} />
    </svg>
  </div>
);

/** Barra inferior estilo Safari con la direccion. */
const BrowserBar: React.FC<{ progress: number }> = ({ progress }) => (
  <div
    style={{
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      height: BAR_H,
      background: "linear-gradient(180deg, rgba(11,11,11,0) 0%, rgba(11,11,11,0.92) 28%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 2,
    }}
  >
    <div
      style={{
        position: "relative",
        width: SCREEN_W - 70,
        height: 76,
        borderRadius: 38,
        background: "#F4F4F4",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        fontFamily: fonts.texto,
        fontWeight: 700,
        fontSize: 30,
        color: colors.negro,
        overflow: "hidden",
        boxShadow: `0 0 24px ${colors.rosa}55`,
      }}
    >
      <svg width="22" height="26" viewBox="0 0 22 26">
        <rect x="2" y="11" width="18" height="13" rx="3" fill={colors.negro} />
        <path d="M6 11V7a5 5 0 0 1 10 0v4" fill="none" stroke={colors.negro} strokeWidth="2.6" />
      </svg>
      {T.barra}
      {progress > 0 && progress < 1 && (
        <div style={{ position: "absolute", left: 0, bottom: 0, height: 6, width: `${progress * 100}%`, background: colors.rosa }} />
      )}
    </div>
  </div>
);

/** Dedo (circulo) que hace el gesto de deslizar hacia arriba durante cada scroll. */
const Swipe: React.FC<{ f: number }> = ({ f }) => {
  for (let i = 1; i < tour.stops.length; i++) {
    const end = arrival(i);
    const start = end - MOVE - 5;
    if (f >= start && f < end + 3) {
      const p = interpolate(f, [start + 4, end], [0, 1], { ...clamp, easing: easeInOut });
      const o = interpolate(f, [start, start + 4, end - 2, end + 3], [0, 0.9, 0.9, 0], clamp);
      return (
        <div
          style={{
            position: "absolute",
            left: SCREEN_W * 0.62 - 45,
            top: interpolate(p, [0, 1], [SCREEN_H * 0.72, SCREEN_H * 0.32]),
            width: 90,
            height: 90,
            borderRadius: 45,
            background: `${colors.rosaSuave}88`,
            border: `4px solid ${colors.blanco}`,
            boxShadow: `0 0 30px ${colors.rosa}`,
            opacity: o,
            scale: String(interpolate(f, [start, start + 4], [1.4, 1], clamp)),
            zIndex: 3,
          }}
        />
      );
    }
  }
  return null;
};

const Phone: React.FC<{ f: number }> = ({ f }) => {
  const y = scrollAt(f);
  const v = Math.abs(scrollAt(f) - scrollAt(f - 1)) * SCALE; // px de pantalla por frame
  const blur = Math.min(26, v * 0.22);
  const load = interpolate(f, [ENTER_PRESS, PHONE_IN + 12], [0, 1], clamp);
  const pageIn = interpolate(f, [PHONE_IN + 2, PHONE_IN + 12], [0, 1], clamp);
  const visibleTiles = tour.tiles.filter((t) => t.y + t.h > y - 50 && t.y < y + VIEW_H + 50);

  return (
    <div
      style={{
        width: SCREEN_W + BEZEL * 2,
        height: SCREEN_H + BEZEL * 2,
        borderRadius: 86,
        padding: BEZEL,
        background: "linear-gradient(145deg, #2A2A2E, #0A0A0A 45%, #1C1C1E)",
        boxShadow: `0 0 0 3px ${colors.rosa}, 0 0 50px ${colors.rosa}AA, 0 0 140px ${colors.rosa}55, 0 40px 80px rgba(0,0,0,0.7)`,
        position: "relative",
      }}
    >
      <div style={{ position: "relative", width: SCREEN_W, height: SCREEN_H, borderRadius: 70, overflow: "hidden", background: "#0B0B0B" }}>
        <svg width={0} height={0} style={{ position: "absolute" }}>
          <filter id="vblur">
            <feGaussianBlur stdDeviation={`0 ${blur.toFixed(2)}`} />
          </filter>
        </svg>
        <div
          style={{
            position: "absolute",
            left: 0,
            top: STATUS_H,
            width: SCREEN_W,
            height: SCREEN_H - STATUS_H,
            overflow: "hidden",
            opacity: pageIn,
            filter: blur > 0.6 ? "url(#vblur)" : undefined,
          }}
        >
          {visibleTiles.map((t) => (
            <Img
              key={t.src}
              src={staticFile(t.src)}
              style={{ position: "absolute", left: 0, top: (t.y - y) * SCALE, width: SCREEN_W, height: t.h * SCALE }}
            />
          ))}
        </div>
        <StatusBar />
        {/* Isla */}
        <div style={{ position: "absolute", top: 14, left: SCREEN_W / 2 - 75, width: 150, height: 40, borderRadius: 20, background: "#000", zIndex: 3 }} />
        <BrowserBar progress={load} />
        <Swipe f={f} />
      </div>
    </div>
  );
};

/* ---------------- Escena 1: escribir la direccion + Enter ---------------- */
const Typing: React.FC<{ f: number }> = ({ f }) => {
  const { fps } = useVideoConfig();
  const chars = Array.from(T.url);
  const typed = Math.max(0, Math.min(chars.length, Math.floor((f - TYPE_START) / TYPE_STEP) + 1));
  const kick = pop(f, fps, 2, 12, 0.6);
  const bar = pop(f, fps, 6, 14, 0.7);
  const key = pop(f, fps, ENTER_IN, 10, 0.6);
  const press = interpolate(f, [ENTER_PRESS - 2, ENTER_PRESS, ENTER_PRESS + 5], [0, 1, 0], clamp);
  const load = interpolate(f, [ENTER_PRESS, ZOOM + 2], [0, 1], { ...clamp, easing: easeOut });
  const zoom = interpolate(f, [ZOOM, ZOOM + 10], [1, 4], { ...clamp, easing: easeIn });
  const out = interpolate(f, [ZOOM + 4, ZOOM + 10], [1, 0], clamp);
  const ring = interpolate(f, [ENTER_PRESS, ENTER_PRESS + 16], [0, 1], { ...clamp, easing: easeOut });
  const caretOn = typed < chars.length ? true : Math.floor(f / 8) % 2 === 0;
  const pinkFrom = 4; // "yohicoach" en rosa
  const pinkTo = 13;

  return (
    <AbsoluteFill style={{ scale: String(zoom), opacity: out, transformOrigin: "50% 46%" }}>
      <div
        style={{
          position: "absolute",
          top: 520,
          left: 40,
          right: 40,
          textAlign: "center",
          fontFamily: fonts.titulo,
          fontSize: 92,
          color: colors.blanco,
          scale: String(interpolate(kick, [0, 1], [0.6, 1])),
          opacity: interpolate(kick, [0, 0.4], [0, 1], clamp),
        }}
      >
        <EmojiText text={T.kicker} />
      </div>
      {/* Barra de direccion */}
      <div
        style={{
          position: "absolute",
          top: 790,
          left: 50,
          width: 980,
          height: 170,
          borderRadius: 85,
          background: colors.panel,
          border: `5px solid ${colors.rosa}`,
          boxShadow: `0 0 30px ${colors.rosa}, 0 0 90px ${colors.rosa}77, inset 0 0 30px ${colors.rosa}33`,
          display: "flex",
          alignItems: "center",
          padding: "0 50px",
          gap: 26,
          overflow: "hidden",
          scale: String(interpolate(bar, [0, 1], [0.7, 1])),
          opacity: interpolate(bar, [0, 0.4], [0, 1], clamp),
        }}
      >
        <svg width="40" height="48" viewBox="0 0 22 26" style={{ flexShrink: 0 }}>
          <rect x="2" y="11" width="18" height="13" rx="3" fill={colors.gris} />
          <path d="M6 11V7a5 5 0 0 1 10 0v4" fill="none" stroke={colors.gris} strokeWidth="2.6" />
        </svg>
        <div style={{ fontFamily: fonts.texto, fontWeight: 800, fontSize: 76, color: colors.blanco, whiteSpace: "nowrap", display: "flex", alignItems: "center" }}>
          {chars.slice(0, typed).map((c, i) => {
            const at = TYPE_START + i * TYPE_STEP;
            const p = interpolate(f, [at, at + 5], [0, 1], { ...clamp, easing: easeOut });
            const pink = i >= pinkFrom && i < pinkTo;
            return (
              <span
                key={i}
                style={{
                  display: "inline-block",
                  color: pink ? colors.rosa : colors.blanco,
                  textShadow: pink ? `0 0 18px ${colors.rosa}` : undefined,
                  translate: `0px ${interpolate(p, [0, 1], [-26, 0])}px`,
                  scale: String(interpolate(p, [0, 0.5, 1], [1.6, 1.15, 1])),
                }}
              >
                {c}
              </span>
            );
          })}
          <span style={{ width: 6, height: 84, marginLeft: 6, background: colors.rosa, opacity: caretOn ? 1 : 0, boxShadow: `0 0 12px ${colors.rosa}` }} />
        </div>
        <div style={{ position: "absolute", left: 0, bottom: 0, height: 10, width: `${load * 100}%`, background: colors.rosa, boxShadow: `0 0 20px ${colors.rosa}` }} />
      </div>
      {/* Tecla Enter */}
      <div
        style={{
          position: "absolute",
          top: 1100,
          left: 540 - 230,
          width: 460,
          height: 180,
          scale: String(interpolate(key, [0, 1], [0, 1])),
          opacity: f >= ENTER_IN ? 1 : 0,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 44,
            border: `5px solid ${colors.rosa}`,
            opacity: ring > 0 && ring < 1 ? 1 - ring : 0,
            scale: String(1 + ring * 0.7),
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 44,
            background: colors.rosa,
            boxShadow: `0 ${18 - press * 14}px 0 #B8226A, 0 0 ${60 + press * 60}px ${colors.rosa}`,
            translate: `0px ${press * 14}px`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 26,
            fontFamily: fonts.titulo,
            fontSize: 96,
            color: colors.negro,
          }}
        >
          {T.enter}
          <svg width="70" height="62" viewBox="0 0 24 21" fill="none" stroke={colors.negro} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 2v8a4 4 0 0 1-4 4H4" />
            <path d="M9 8l-6 6 6 6" />
          </svg>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ---------------- Etiquetas de cada parada ---------------- */
const Sticker: React.FC<{ f: number; i: number }> = ({ f, i }) => {
  const { fps } = useVideoConfig();
  const a = arrival(i) + 2;
  const end = arrival(i + 1) - MOVE + 2;
  if (f < a - 1 || f > end + 6) return null;
  const p = pop(f, fps, a, 11, 0.6);
  const o = interpolate(f, [end, end + 6], [1, 0], clamp);
  const left = i % 2 === 0;
  const solid = i % 2 === 0;
  return (
    <div
      style={{
        position: "absolute",
        top: left ? 420 : 1240,
        left: left ? 34 : undefined,
        right: left ? undefined : 34,
        maxWidth: 760,
        padding: "22px 36px 18px",
        borderRadius: 30,
        background: solid ? colors.rosa : colors.negro,
        border: `5px solid ${solid ? colors.blanco : colors.rosa}`,
        boxShadow: `0 0 40px ${colors.rosa}, 0 20px 40px rgba(0,0,0,0.6)`,
        rotate: `${left ? -5 : 4}deg`,
        scale: String(interpolate(p, [0, 1], [0.2, 1])),
        translate: `${interpolate(o, [0, 1], [left ? -200 : 200, 0])}px 0px`,
        opacity: Math.min(interpolate(p, [0, 0.3], [0, 1], clamp), o),
        transformOrigin: left ? "0% 50%" : "100% 50%",
      }}
    >
      <div style={{ fontFamily: fonts.texto, fontWeight: 900, fontSize: 30, letterSpacing: 4, color: solid ? colors.negro : colors.rosaTexto, opacity: 0.85 }}>
        {String(i + 1).padStart(2, "0")} / {String(tour.stops.length).padStart(2, "0")}
      </div>
      <div style={{ fontFamily: fonts.titulo, fontSize: 84, lineHeight: 1.05, color: solid ? colors.negro : colors.blanco, whiteSpace: "nowrap" }}>
        <EmojiText text={T.etiquetas[i]} />
      </div>
    </div>
  );
};

/* ---------------- Cierre ---------------- */
const Final: React.FC<{ f: number }> = ({ f }) => {
  const { fps } = useVideoConfig();
  const l = f - FINAL;
  const logo = pop(l, fps, 8, 12, 0.6);
  const t1 = pop(l, fps, 12, 13, 0.8);
  const t2 = pop(l, fps, 26, 10, 0.8);
  const url = pop(l, fps, 42, 13, 0.6);
  // parpadeo de neon al encender
  const flick = [1, 0.2, 1, 0.35, 1, 1, 0.6, 1];
  const neon = l < 26 ? 0 : l - 26 < flick.length ? flick[l - 26] : 1;
  const [neonWord, ...rest] = T.final2.split(" ");
  const neonEmoji = rest.join(" ");
  const burst = interpolate(l, [26, 56], [0, 1], { ...clamp, easing: easeOut });

  return (
    <AbsoluteFill>
      <Img
        src={staticFile("logo_yohi.png")}
        style={{
          position: "absolute",
          top: 300,
          left: 540 - 85,
          width: 170,
          height: 170,
          borderRadius: 85,
          boxShadow: `0 0 0 5px ${colors.rosa}, 0 0 40px ${colors.rosa}`,
          scale: String(logo),
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 520,
          width: 1080,
          textAlign: "center",
          fontFamily: fonts.titulo,
          fontSize: 178,
          lineHeight: 1,
          color: colors.blanco,
          scale: String(interpolate(t1, [0, 1], [2.4, 1])),
          opacity: interpolate(t1, [0, 0.25], [0, 1], clamp),
        }}
      >
        {T.final1}
      </div>
      <div
        style={{
          position: "absolute",
          top: 715,
          width: 1080,
          textAlign: "center",
          fontFamily: fonts.titulo,
          fontSize: 236,
          lineHeight: 1,
          opacity: l >= 26 ? 1 : 0,
          scale: String(interpolate(t2, [0, 1], [0.6, 1])),
        }}
      >
        {/* Tubo de neon: centro rosa claro nitido + brillo rosa; el emoji va sin halo */}
        <span
          style={{
            color: colors.rosa,
            opacity: Math.max(0.2, neon),
            textShadow: `0 0 2px ${colors.rosaSuave}, 0 0 16px ${colors.rosa}, 0 0 40px ${colors.rosa}cc`,
          }}
        >
          {neonWord}
        </span>
        {neonEmoji ? <span style={{ marginLeft: 26 }}><EmojiText text={neonEmoji} scale={0.82} /></span> : null}
      </div>
      {/* Destellos */}
      {new Array(16).fill(0).map((_, i) => {
        const ang = (i / 16) * Math.PI * 2 + random(`a${i}`) * 0.4;
        const dist = 260 + random(`d${i}`) * 300;
        const s = 14 + random(`s${i}`) * 22;
        return (
          <svg
            key={i}
            width={s * 2}
            height={s * 2}
            viewBox="-50 -50 100 100"
            style={{
              position: "absolute",
              left: 540 + Math.cos(ang) * dist * burst - s,
              top: 830 + Math.sin(ang) * dist * 0.75 * burst - s,
              opacity: l < 26 ? 0 : interpolate(burst, [0, 0.2, 1], [0, 1, 0]),
              rotate: `${l * 6}deg`,
            }}
          >
            <path d="M0,-50 C4,-12 12,-4 50,0 C12,4 4,12 0,50 C-4,12 -12,4 -50,0 C-12,-4 -4,-12 0,-50 Z" fill={i % 2 ? colors.blanco : colors.rosa} />
          </svg>
        );
      })}
      <div
        style={{
          position: "absolute",
          top: 1010,
          left: 540 - 380,
          width: 760,
          height: 130,
          borderRadius: 65,
          background: colors.panel,
          border: `4px solid ${colors.rosa}`,
          boxShadow: `0 0 36px ${colors.rosa}88`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: fonts.texto,
          fontWeight: 800,
          fontSize: 60,
          color: colors.blanco,
          scale: String(interpolate(url, [0, 1], [0.5, 1])),
          opacity: interpolate(url, [0, 0.3], [0, 1], clamp),
        }}
      >
        www.<span style={{ color: colors.rosaTexto }}>yohicoach</span>.cl
      </div>
      {l > 48 && (
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 1920, translate: `0px ${interpolate(pop(l, fps, 48, 14, 0.8), [0, 1], [700, 0])}px` }}>
          <Character src="yohi_saludo.png" height={560} style={{ left: 540 - 165, top: 1170 }} />
        </div>
      )}
    </AbsoluteFill>
  );
};

/* ---------------- SFX ---------------- */
const Sfx: React.FC<{ at: number; file: string; volume: number }> = ({ at, file, volume }) => (
  <Sequence from={at} layout="none" name={`SFX ${file}`}>
    <Audio src={staticFile(`sfx/${file}.wav`)} volume={volume} />
  </Sequence>
);

/* ---------------- Composicion ---------------- */
export const YohiOnline: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Telefono: entra con zoom desde la pantalla, se mueve vivo, sale hacia abajo en el cierre
  const pin = pop(f, fps, PHONE_IN, 14, 0.8);
  const punch = tour.stops.reduce((acc, _, i) => acc + interpolate(f, [arrival(i), arrival(i) + 3, arrival(i) + 12], [0, 0.025, 0], clamp), 0);
  const exit = interpolate(f, [FINAL, FINAL + 14], [0, 1], { ...clamp, easing: easeIn });
  const phoneScale = interpolate(pin, [0, 1], [1.9, 1]) * (1 + punch) * interpolate(exit, [0, 1], [1, 0.7]);
  const flash = interpolate(f, [ZOOM + 4, ZOOM + 8, PHONE_IN + 10], [0, 0.9, 0], clamp);
  const finalFlash = interpolate(f, [FINAL + 24, FINAL + 26, FINAL + 36], [0, 0.55, 0], clamp);

  const typingSfx = Array.from(T.url).map((_, i) => (
    <Sfx key={`t${i}`} at={TYPE_START + i * TYPE_STEP} file={i % 2 ? "tick" : "tap"} volume={0.45} />
  ));
  const tourSfx = tour.stops.map((_, i) => (
    <React.Fragment key={`s${i}`}>
      {i > 0 && <Sfx at={arrival(i) - MOVE} file="whoosh_short" volume={sfxVolume.whooshShort} />}
      <Sfx at={arrival(i) + 2} file={`pop${(i % 4) + 1}`} volume={sfxVolume.pop} />
    </React.Fragment>
  ));

  return (
    <AbsoluteFill style={{ backgroundColor: colors.negro }}>
      <Background />
      {f < PHONE_IN + 4 && <Typing f={f} />}
      {f >= PHONE_IN && f < FINAL + 16 && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          <div
            style={{
              scale: String(phoneScale),
              rotate: `${Math.sin(f / 26) * 1.6}deg`,
              translate: `0px ${interpolate(exit, [0, 1], [0, 1500]) + 10}px`,
              opacity: interpolate(pin, [0, 0.3], [0, 1], clamp),
            }}
          >
            <Phone f={f} />
          </div>
        </AbsoluteFill>
      )}
      {f >= TOUR_START && f < FINAL && tour.stops.map((_, i) => <Sticker key={i} f={f} i={i} />)}
      {f >= FINAL && <Final f={f} />}
      <AbsoluteFill style={{ background: colors.rosa, opacity: flash + finalFlash, mixBlendMode: "screen", pointerEvents: "none" }} />

      {/* Sonido */}
      {typingSfx}
      <Sfx at={ENTER_IN} file="pop" volume={sfxVolume.pop} />
      <Sfx at={ENTER_PRESS} file="click" volume={0.8} />
      <Sfx at={ENTER_PRESS} file="boom" volume={0.6} />
      <Sfx at={ZOOM} file="whoosh" volume={sfxVolume.whoosh} />
      <Sfx at={PHONE_IN + 2} file="shimmer" volume={0.35} />
      {tourSfx}
      <Sfx at={FINAL} file="whoosh" volume={sfxVolume.whoosh} />
      <Sfx at={FINAL + 12} file="boom" volume={sfxVolume.boom} />
      <Sfx at={FINAL + 26} file="stamp" volume={0.8} />
      <Sfx at={FINAL + 26} file="sparkle" volume={sfxVolume.sparkle} />
      <Sfx at={FINAL + 42} file="ding" volume={sfxVolume.ding} />
    </AbsoluteFill>
  );
};
