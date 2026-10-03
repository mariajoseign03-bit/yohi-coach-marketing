import React from "react";
import { AbsoluteFill, Img, interpolate, random, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Character } from "../components/Character";
import { EmojiText } from "../components/EmojiText";
import { KineticText } from "../components/KineticText";
import { clamp, easeIn, easeInOut, easeOut, pop, smooth, whip } from "../components/anim";
import { copy } from "../copy";
import { fonts } from "../fonts";
import { colors, sizes } from "../theme";
import { app, scenes } from "../timing";

/** Bloque de texto posicionado dentro de la zona segura. */
const TextBlock: React.FC<{ top: number; children: React.ReactNode; style?: React.CSSProperties }> = ({
  top,
  children,
  style,
}) => <div style={{ position: "absolute", top, left: 60, right: 60, ...style }}>{children}</div>;

const Subtitle: React.FC<{ text: string; delay: number; color?: string; size?: number }> = ({
  text,
  delay,
  color = colors.blanco,
  size = sizes.texto,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = smooth(frame, fps, delay, 16);
  return (
    <div
      style={{
        fontFamily: fonts.texto,
        fontWeight: 800,
        fontSize: size,
        color,
        textAlign: "center",
        lineHeight: 1.2,
        textWrap: "balance",
        opacity: p,
        translate: `0px ${interpolate(p, [0, 1], [30, 0])}px`,
        filter: `blur(${interpolate(p, [0, 1], [8, 0])}px)`,
        textShadow: `0 0 24px ${colors.rosa}66`,
      }}
    >
      <EmojiText text={text} />
    </div>
  );
};

/* ---------------- Escena 1: gancho ---------------- */
export const Scene1: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const d = scenes.s1.duration;
  const bounce = pop(frame, fps, 2, 8, 0.8);
  const s = copy.escena1;
  return (
    <AbsoluteFill style={whip(frame, d, 0, 7)}>
      <TextBlock top={270}>
        <KineticText
          text={s.titulo}
          resaltar={s.resaltar}
          delay={4}
          stagger={5}
          fontFamily={fonts.titulo}
          fontSize={sizes.tituloGrande}
        />
        <div style={{ height: 26 }} />
        <Subtitle text={s.subtitulo} delay={22} size={56} />
      </TextBlock>
      <div
        style={{
          position: "absolute",
          left: 540,
          top: 1580,
          translate: `-50% ${interpolate(bounce, [0, 1], [900, 0])}px`,
          scale: String(interpolate(bounce, [0, 1], [0.7, 1])),
          transformOrigin: "50% 100%",
        }}
      >
        <Character src="yohi_duda.png" height={880} style={{ position: "relative", top: -880, left: 0 }} />
      </div>
    </AbsoluteFill>
  );
};

/* ---------------- Escena 2: teléfono + saludo ---------------- */
export const Scene2: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const d = scenes.s2.duration;
  const s = copy.escena2;
  const peek = pop(frame, fps, 16, 12, 0.7);
  const exit = interpolate(frame, [d - 8, d], [0, 1], { ...clamp, easing: easeIn });
  return (
    <AbsoluteFill>
      <TextBlock top={270} style={{ opacity: 1 - exit, translate: `0px ${-exit * 120}px`, filter: `blur(${exit * 14}px)` }}>
        <KineticText
          text={s.titulo}
          resaltar={s.resaltar}
          delay={6}
          stagger={5}
          fontFamily={fonts.titulo}
          fontSize={sizes.titulo + 6}
        />
        <div style={{ height: 22 }} />
        <Subtitle text={s.subtitulo} delay={24} size={68} />
      </TextBlock>
      {/* yohi_saludo asoma al lado del teléfono */}
      <div
        style={{
          position: "absolute",
          left: 690,
          top: 860,
          translate: `${interpolate(peek, [0, 1], [-260, 0]) + exit * 500}px 0px`,
          rotate: `${interpolate(peek, [0, 1], [-14, 4])}deg`,
          opacity: interpolate(peek, [0, 0.3], [0, 1], clamp) * (1 - exit),
          zIndex: 0,
        }}
      >
        <Character src="yohi_saludo.png" height={700} style={{ position: "relative" }} />
      </div>
    </AbsoluteFill>
  );
};

/* ---------------- Escena 4: pills + cuaderno ---------------- */
const Pill: React.FC<{ text: string; at: number }> = ({ text, at }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, fps, at, 11, 0.6);
  const glowPulse = interpolate(frame - at, [0, 8, 30], [1.8, 1.2, 0.8], clamp);
  return (
    <div
      style={{
        alignSelf: "center",
        padding: "16px 34px",
        borderRadius: 60,
        background: "rgba(17,17,17,0.92)",
        border: `3px solid ${colors.rosa}`,
        boxShadow: `0 0 ${30 * glowPulse}px ${colors.rosa}${glowPulse > 1 ? "cc" : "88"}, inset 0 0 18px ${colors.rosa}33`,
        fontFamily: fonts.texto,
        fontWeight: 800,
        fontSize: 44,
        color: colors.blanco,
        whiteSpace: "nowrap",
        opacity: interpolate(p, [0, 0.3], [0, 1], clamp),
        translate: `${interpolate(p, [0, 1], [-160, 0])}px 0px`,
        scale: String(interpolate(p, [0, 1], [0.7, 1])),
      }}
    >
      <EmojiText text={text} />
    </div>
  );
};

export const Scene4: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const d = scenes.s4.duration;
  const enter = pop(frame, fps, 8, 12, 0.7);
  const exit = interpolate(frame, [d - 10, d], [0, 1], { ...clamp, easing: easeIn });
  return (
    <AbsoluteFill style={{ filter: exit > 0.02 ? `blur(${exit * 24}px)` : undefined, translate: `${-exit * 500}px 0px` }}>
      <div
        style={{
          position: "absolute",
          left: 560,
          top: 300,
          translate: `${interpolate(enter, [0, 1], [600, 0])}px 0px`,
          rotate: `${interpolate(enter, [0, 1], [12, 0])}deg`,
        }}
      >
        <Character src="yohi_cuaderno.png" height={840} style={{ position: "relative" }} />
      </div>
      <div
        style={{
          position: "absolute",
          top: 1196,
          left: 30,
          right: 30,
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        {copy.escena4.pills.map((t, i) => (
          <Pill key={t} text={t} at={app.pills[i]} />
        ))}
      </div>
    </AbsoluteFill>
  );
};

/* ---------------- Escena 5: pizarra ---------------- */
export const Scene5: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const d = scenes.s5.duration;
  const s = copy.escena5;
  const enter = pop(frame, fps, 0, 13, 0.8);
  return (
    <AbsoluteFill style={whip(frame, d, 8, 7)}>
      <TextBlock top={270} style={{ left: 30, right: 30 }}>
        <KineticText
          text={s.titulo}
          resaltar={s.resaltar}
          delay={4}
          stagger={4}
          fontFamily={fonts.titulo}
          fontSize={96}
        />
      </TextBlock>
      <div
        style={{
          position: "absolute",
          left: 540,
          top: 1085,
          translate: "-50% -50%",
          scale: String(interpolate(enter, [0, 1], [1.35, 1])),
          opacity: interpolate(enter, [0, 0.3], [0, 1], clamp),
        }}
      >
        <Character src="yohi_pizarra.png" width={1000} style={{ position: "relative" }} float={5} />
      </div>
    </AbsoluteFill>
  );
};

/* ---------------- Escena 6: escritorio + reloj ---------------- */
const Clock: React.FC = () => {
  const frame = useCurrentFrame();
  const m = frame * 12;
  const h = frame * 1;
  return (
    <svg width="70" height="70" viewBox="0 0 70 70">
      <circle cx="35" cy="35" r="31" fill={colors.negro} stroke={colors.negro} strokeWidth="2" />
      <circle cx="35" cy="35" r="28" fill="none" stroke={colors.rosaSuave} strokeWidth="5" />
      <line x1="35" y1="35" x2="35" y2="18" stroke={colors.blanco} strokeWidth="5" strokeLinecap="round" transform={`rotate(${h} 35 35)`} />
      <line x1="35" y1="35" x2="35" y2="12" stroke={colors.rosa} strokeWidth="4" strokeLinecap="round" transform={`rotate(${m} 35 35)`} />
      <circle cx="35" cy="35" r="4" fill={colors.rosa} />
    </svg>
  );
};

export const Scene6: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const d = scenes.s6.duration;
  const s = copy.escena6;
  const card = pop(frame, fps, 4, 14, 0.8);
  const badge = pop(frame, fps, 30, 10, 0.6);
  const glow = 0.7 + 0.3 * Math.sin(frame / 7);
  return (
    <AbsoluteFill style={whip(frame, d, 8, 7)}>
      <TextBlock top={270}>
        <KineticText
          text={s.titulo}
          resaltar={s.resaltar}
          delay={6}
          stagger={5}
          fontFamily={fonts.titulo}
          fontSize={sizes.titulo}
        />
      </TextBlock>
      <div
        style={{
          position: "absolute",
          left: 60,
          top: 640,
          width: 960,
          height: 640,
          borderRadius: 48,
          overflow: "hidden",
          border: `4px solid ${colors.rosa}`,
          boxShadow: `0 0 ${60 * glow}px ${colors.rosa}aa, 0 0 ${140 * glow}px ${colors.rosa}44, 0 40px 80px rgba(0,0,0,0.7)`,
          opacity: interpolate(card, [0, 0.3], [0, 1], clamp),
          scale: String(interpolate(card, [0, 1], [0.8, 1])),
          rotate: `${interpolate(card, [0, 1], [-4, 0])}deg`,
        }}
      >
        <Img
          src={staticFile("yohi_escritorio.png")}
          style={{
            width: 960,
            height: 640,
            objectFit: "cover",
            scale: String(interpolate(frame, [0, d], [1.04, 1.12])),
          }}
        />
      </div>
      <div
        style={{
          position: "absolute",
          top: 1330,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            padding: "18px 36px 18px 20px",
            borderRadius: 70,
            background: colors.rosa,
            color: colors.negro,
            fontFamily: fonts.texto,
            fontWeight: 900,
            fontSize: 44,
            boxShadow: `0 0 40px ${colors.rosa}`,
            scale: String(interpolate(badge, [0, 1], [0.3, 1])),
            opacity: interpolate(badge, [0, 0.3], [0, 1], clamp),
          }}
        >
          <Clock />
          {s.badge}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ---------------- Escena 7: precio ---------------- */
export const Scene7: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const d = scenes.s7.duration;
  const s = copy.escena7;
  const p = pop(frame, fps, 10, 9, 0.7);
  const per = smooth(frame, fps, 20, 14);
  const sweepPos = interpolate(frame, [26, 50], [-40, 140], { ...clamp, easing: easeInOut });
  const sparks = new Array(10).fill(0).map((_, i) => {
    const a = (i / 10) * Math.PI * 2 + random(`a${i}`) * 0.4;
    const dist = interpolate(frame, [12, 34], [40, 360 + random(`d${i}`) * 120], { ...clamp, easing: easeOut });
    return { x: Math.cos(a) * dist, y: Math.sin(a) * dist * 0.7, o: interpolate(frame, [12, 18, 40], [0, 1, 0], clamp) };
  });
  return (
    <AbsoluteFill style={whip(frame, d, 8, 7)}>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", top: -60 }}>
        {sparks.map((sp, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              width: 18,
              height: 18,
              borderRadius: 9,
              background: i % 2 ? colors.rosa : colors.rosaSuave,
              translate: `${sp.x}px ${sp.y}px`,
              opacity: sp.o,
              boxShadow: `0 0 20px ${colors.rosa}`,
            }}
          />
        ))}
        <div
          style={{
            fontFamily: fonts.titulo,
            fontSize: 250,
            lineHeight: 1,
            color: "transparent",
            backgroundImage: `linear-gradient(105deg, ${colors.blanco} 0%, ${colors.blanco} ${sweepPos - 15}%, ${colors.rosaSuave} ${sweepPos}%, ${colors.blanco} ${sweepPos + 15}%)`,
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            filter: `drop-shadow(0 0 30px ${colors.rosa}) drop-shadow(0 0 70px ${colors.rosa}88)`,
            scale: String(interpolate(p, [0, 1], [2.2, 1])),
            opacity: interpolate(p, [0, 0.25], [0, 1], clamp),
          }}
        >
          {s.precio}
        </div>
        <div
          style={{
            fontFamily: fonts.texto,
            fontWeight: 900,
            fontSize: 90,
            color: colors.rosaTexto,
            marginTop: 10,
            opacity: per,
            translate: `0px ${interpolate(per, [0, 1], [40, 0])}px`,
            textShadow: `0 0 30px ${colors.rosa}`,
          }}
        >
          {s.periodo}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ---------------- Escena 8: CTA ---------------- */
export const Scene8: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = copy.escena8;
  const STAMP = 26;
  const logo = pop(frame, fps, 2, 12, 0.9);
  const stamp = interpolate(frame, [STAMP - 8, STAMP], [0, 1], { ...clamp, easing: easeIn });
  const settle = pop(frame, fps, STAMP, 9, 0.5);
  const shakeAmt = interpolate(frame, [STAMP, STAMP + 14], [1, 0], clamp);
  const shakeX = (random(`x${frame}`) - 0.5) * 34 * shakeAmt;
  const shakeY = (random(`y${frame}`) - 0.5) * 34 * shakeAmt;
  const glow = 0.7 + 0.3 * Math.sin(frame / 6);
  const btn = pop(frame, fps, 52, 11, 0.6);
  const btnPulse = 1 + 0.045 * Math.sin((frame - 52) / 4.5) * (frame > 64 ? 1 : 0);
  const flash = interpolate(frame, [STAMP, STAMP + 6], [0.22, 0], clamp);

  return (
    <AbsoluteFill style={{ translate: `${shakeX}px ${shakeY}px` }}>
      <AbsoluteFill style={{ ...whip(frame, 200, 8, 0) }}>
        {/* Logo grande con glow pulsante */}
        <div
          style={{
            position: "absolute",
            left: 540,
            top: 600,
            translate: "-50% -50%",
            width: 640,
            height: 640,
            scale: String(interpolate(logo, [0, 1], [0.4, 1])),
            rotate: `${interpolate(logo, [0, 1], [-25, 0])}deg`,
            opacity: interpolate(logo, [0, 0.3], [0, 1], clamp),
          }}
        >
          <Img
            src={staticFile("logo_yohi.png")}
            style={{
              width: 640,
              height: 640,
              filter: `drop-shadow(0 0 ${50 * glow}px ${colors.rosa}) drop-shadow(0 0 ${110 * glow}px ${colors.rosa}77)`,
            }}
          />
          {/* Sello que se estampa */}
          {frame >= STAMP - 8 && (
            <Img
              src={staticFile("sello_certified.png")}
              style={{
                position: "absolute",
                width: 330,
                right: -70,
                bottom: -40,
                rotate: "-14deg",
                scale: String(interpolate(stamp, [0, 1], [3.2, 1]) * interpolate(settle, [0, 1], [0.92, 1])),
                opacity: interpolate(stamp, [0, 0.4], [0, 1], clamp),
                filter: `drop-shadow(0 12px 18px rgba(0,0,0,0.8)) drop-shadow(0 0 22px ${colors.rosa}88)`,
              }}
            />
          )}
        </div>
        <TextBlock top={1000} style={{ left: 150, right: 150 }}>
          <KineticText
            text={s.cta}
            resaltar={s.resaltar}
            delay={36}
            stagger={4}
            fontFamily={fonts.titulo}
            fontSize={96}
          />
          <div style={{ height: 14 }} />
          <Subtitle text={copy.handle} delay={46} size={56} color={colors.rosaSuave} />
        </TextBlock>
        <div style={{ position: "absolute", top: 1380, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
          <div
            style={{
              padding: "30px 64px",
              borderRadius: 80,
              background: `linear-gradient(180deg, #ff6fb5, ${colors.rosa})`,
              color: colors.blanco,
              fontFamily: fonts.titulo,
              fontSize: 76,
              letterSpacing: "0.02em",
              boxShadow: `0 0 ${50 * btnPulse}px ${colors.rosa}, 0 0 ${110 * btnPulse}px ${colors.rosa}66, inset 0 -6px 0 rgba(0,0,0,0.2)`,
              textShadow: "0 3px 0 rgba(0,0,0,0.25)",
              scale: String(interpolate(btn, [0, 1], [0.3, 1]) * btnPulse),
              opacity: interpolate(btn, [0, 0.3], [0, 1], clamp),
            }}
          >
            {s.boton}
          </div>
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{ background: colors.rosaSuave, opacity: flash, mixBlendMode: "screen" }} />
    </AbsoluteFill>
  );
};

/* Destello de transicion (whip) en cada corte */
export const WhipFlash: React.FC = () => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [0, 10], [0, 1], { ...clamp, easing: easeInOut });
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(100deg, transparent ${p * 160 - 60}%, ${colors.rosa}55 ${p * 160 - 30}%, ${colors.rosaSuave}88 ${
          p * 160 - 22
        }%, ${colors.rosa}55 ${p * 160 - 14}%, transparent ${p * 160}%)`,
        filter: "blur(12px)",
        opacity: interpolate(frame, [0, 2, 9, 10], [0, 1, 1, 0], clamp),
      }}
    />
  );
};
