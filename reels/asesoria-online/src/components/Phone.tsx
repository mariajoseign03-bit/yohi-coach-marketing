import React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { copy } from "../copy";
import { fonts } from "../fonts";
import { colors } from "../theme";
import { app, chat, phone } from "../timing";
import { clamp, easeInOut, easeIn, pop, smooth } from "./anim";
import { EmojiText } from "./EmojiText";

const W = 620;
const H = 1280;
const SCREEN_INSET = 16;

/* ---------- Iconos (dibujados en codigo, sin marcas) ---------- */

const StatusIcons: React.FC = () => (
  <div style={{ position: "absolute", top: 26, left: 44, right: 44, display: "flex", justifyContent: "space-between" }}>
    <svg width="70" height="26" viewBox="0 0 70 26">
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={i * 12} y={18 - i * 5} width={8} height={8 + i * 5} rx={2} fill={colors.blanco} />
      ))}
    </svg>
    <svg width="58" height="26" viewBox="0 0 58 26">
      <rect x={1} y={3} width={48} height={20} rx={6} fill="none" stroke={colors.blanco} strokeWidth={2} opacity={0.8} />
      <rect x={5} y={7} width={34} height={12} rx={3} fill={colors.rosa} />
      <rect x={52} y={9} width={4} height={8} rx={2} fill={colors.blanco} opacity={0.8} />
    </svg>
  </div>
);

const SendIcon: React.FC = () => (
  <svg width="40" height="40" viewBox="0 0 24 24">
    <path d="M3 11.5 20 4l-6.5 17-2.6-7.1L3 11.5Z" fill={colors.negro} />
  </svg>
);

const TabIcon: React.FC<{ kind: number; active: boolean }> = ({ kind, active }) => {
  const c = active ? colors.rosa : colors.gris;
  return (
    <svg width="54" height="54" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2} strokeLinecap="round">
      {kind === 0 && (
        <>
          <rect x="4" y="4" width="16" height="17" rx="3" />
          <path d="M8 2v4M16 2v4M4 10h16" />
        </>
      )}
      {kind === 1 && <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />}
      {kind === 2 && (
        <>
          <rect x="3" y="6" width="18" height="14" rx="3" />
          <circle cx="12" cy="13" r="4" />
          <path d="M8 6l2-3h4l2 3" />
        </>
      )}
    </svg>
  );
};

/* ---------- Chat ---------- */

const Bubble: React.FC<{ from: string; text: string; at: number; frame: number; fps: number }> = ({
  from,
  text,
  at,
  frame,
  fps,
}) => {
  const p = pop(frame, fps, at, 13, 0.6);
  if (frame < at) return null;
  const mine = from === "alumna";
  return (
    <div style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start" }}>
      <div
        style={{
          maxWidth: 500,
          padding: "20px 28px",
          borderRadius: 36,
          borderBottomRightRadius: mine ? 10 : 36,
          borderBottomLeftRadius: mine ? 36 : 10,
          background: mine ? colors.rosa : colors.panel,
          border: mine ? "none" : `2px solid ${colors.rosa}88`,
          color: mine ? colors.negro : colors.blanco,
          fontFamily: fonts.texto,
          fontWeight: 700,
          fontSize: 44,
          lineHeight: 1.2,
          boxShadow: mine ? `0 0 30px ${colors.rosa}66` : `0 0 24px ${colors.rosa}33`,
          transformOrigin: mine ? "100% 100%" : "0% 100%",
          scale: String(interpolate(p, [0, 1], [0.5, 1])),
          translate: `0px ${interpolate(p, [0, 1], [40, 0])}px`,
          opacity: interpolate(p, [0, 0.3], [0, 1], clamp),
        }}
      >
        <EmojiText text={text} />
      </div>
    </div>
  );
};

const TypingBubble: React.FC<{ frame: number; fps: number; from: number; to: number }> = ({ frame, fps, from, to }) => {
  if (frame < from || frame >= to) return null;
  const p = pop(frame, fps, from, 14, 0.5);
  return (
    <div style={{ display: "flex" }}>
      <div
        style={{
          padding: "26px 30px",
          borderRadius: 36,
          borderBottomLeftRadius: 10,
          background: colors.panel,
          border: `2px solid ${colors.rosa}88`,
          display: "flex",
          gap: 12,
          scale: String(interpolate(p, [0, 1], [0.5, 1])),
          transformOrigin: "0% 100%",
        }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: 18,
              height: 18,
              borderRadius: 9,
              background: colors.rosa,
              translate: `0px ${Math.sin((frame - from) / 3 - i * 0.9) * 7}px`,
              opacity: 0.6 + 0.4 * Math.sin((frame - from) / 3 - i * 0.9),
            }}
          />
        ))}
      </div>
    </div>
  );
};

const ChatScreen: React.FC<{ f: number }> = ({ f }) => {
  const { fps } = useVideoConfig();
  const c = f - phone.chatStart; // frames locales del chat
  const typing = c >= chat.yohiTyping[0] && c < chat.yohiTyping[1];
  const [m1, m2, m3] = copy.chat.mensajes;

  // Texto en el campo de escritura (la alumna escribe en tiempo real)
  let draft = "";
  if (c >= chat.msg1Type[0] && c < chat.msg1Send) {
    const n = Math.round(interpolate(c, chat.msg1Type, [0, m1.texto.length], clamp));
    draft = Array.from(m1.texto).slice(0, n).join("");
  } else if (c >= chat.msg3Type[0] && c < chat.msg3Send) {
    const n = Math.round(interpolate(c, chat.msg3Type, [0, m3.texto.length], clamp));
    draft = Array.from(m3.texto).slice(0, n).join("");
  }
  const sendPress = (at: number) => interpolate(c, [at - 2, at, at + 4], [1, 0.82, 1], clamp);
  const sendScale = c < chat.msg3Type[0] ? sendPress(chat.msg1Send) : sendPress(chat.msg3Send);

  return (
    <AbsoluteFill style={{ background: colors.negroProfundo }}>
      {/* Patron sutil de fondo del chat */}
      <AbsoluteFill
        style={{
          backgroundImage: `radial-gradient(${colors.rosa}22 2px, transparent 2px)`,
          backgroundSize: "44px 44px",
          opacity: 0.6,
        }}
      />
      {/* Header */}
      <div
        style={{
          position: "absolute",
          top: 70,
          left: 0,
          right: 0,
          height: 150,
          display: "flex",
          alignItems: "center",
          gap: 22,
          padding: "0 30px",
          background: `linear-gradient(180deg, ${colors.panel}, ${colors.panel}ee)`,
          borderBottom: `2px solid ${colors.rosa}55`,
        }}
      >
        <div
          style={{
            width: 104,
            height: 104,
            borderRadius: 52,
            flexShrink: 0,
            boxShadow: `0 0 0 4px ${colors.rosa}, 0 0 24px ${colors.rosa}`,
            overflow: "hidden",
          }}
        >
          <Img src={staticFile("logo_yohi.png")} style={{ width: 104, height: 104 }} />
        </div>
        <div style={{ fontFamily: fonts.texto, color: colors.blanco }}>
          <div style={{ fontSize: 42, fontWeight: 800, lineHeight: 1.1 }}><EmojiText text={copy.chat.nombre} /></div>
          <div
            style={{
              fontSize: 28,
              fontWeight: 600,
              marginTop: 6,
              color: typing ? colors.rosaTexto : colors.rosaSuave,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            {!typing && <span style={{ width: 14, height: 14, borderRadius: 7, background: "#3DDC84", display: "inline-block" }} />}
            {typing ? copy.chat.escribiendo : copy.chat.estado}
          </div>
        </div>
      </div>
      {/* Mensajes */}
      <div
        style={{
          position: "absolute",
          top: 250,
          left: 26,
          right: 26,
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        <Bubble from={m1.de} text={m1.texto} at={chat.msg1Send} frame={c} fps={fps} />
        <TypingBubble frame={c} fps={fps} from={chat.yohiTyping[0]} to={chat.yohiTyping[1]} />
        <Bubble from={m2.de} text={m2.texto} at={chat.msg2} frame={c} fps={fps} />
        <Bubble from={m3.de} text={m3.texto} at={chat.msg3Send} frame={c} fps={fps} />
      </div>
      {/* Barra de escritura */}
      <div
        style={{
          position: "absolute",
          bottom: 34,
          left: 22,
          right: 22,
          height: 100,
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <div
          style={{
            flex: 1,
            height: 100,
            borderRadius: 50,
            background: colors.panel,
            border: `2px solid ${draft ? colors.rosa : colors.panelBorde}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            padding: "0 28px",
            overflow: "hidden",
            whiteSpace: "nowrap",
            fontFamily: fonts.texto,
            fontWeight: 600,
            fontSize: 36,
            color: colors.blanco,
          }}
        >
          <span style={{ flexShrink: 0 }}>{draft}</span>
          {draft && (
            <span style={{ width: 4, height: 44, background: colors.rosa, marginLeft: 4, opacity: Math.round(f / 8) % 2 ? 1 : 0.2 }} />
          )}
        </div>
        <div
          style={{
            width: 100,
            height: 100,
            borderRadius: 50,
            background: colors.rosa,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: `0 0 26px ${colors.rosa}`,
            scale: String(sendScale),
          }}
        >
          <SendIcon />
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ---------- App: plan, registro, foto ---------- */

const ScreenTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      fontFamily: fonts.texto,
      fontWeight: 900,
      fontSize: 48,
      color: colors.blanco,
      margin: "0 0 26px",
    }}
  >
    {children}
  </div>
);

const PlanScreen: React.FC<{ a: number }> = ({ a }) => {
  const { fps } = useVideoConfig();
  return (
    <div style={{ padding: "0 30px" }}>
      <ScreenTitle>{copy.escena4.plan.titulo}</ScreenTitle>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {copy.escena4.plan.dias.map((d, i) => {
          const p = pop(a, fps, 6 + i * 5, 14, 0.6);
          return (
            <div
              key={d.dia}
              style={{
                background: colors.panel,
                borderRadius: 28,
                padding: "20px 26px",
                borderLeft: `8px solid ${colors.rosa}`,
                fontFamily: fonts.texto,
                opacity: interpolate(p, [0, 0.4], [0, 1], clamp),
                translate: `${interpolate(p, [0, 1], [80, 0])}px 0px`,
              }}
            >
              <div style={{ color: colors.rosaTexto, fontWeight: 800, fontSize: 44 }}>{d.dia}</div>
              <div style={{ color: colors.blanco, fontWeight: 600, fontSize: 34, marginTop: 4 }}>{d.grupos}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const RegistroScreen: React.FC<{ a: number }> = ({ a }) => {
  const { fps } = useVideoConfig();
  const r = copy.escena4.registro;
  const local = a - app.registro;
  const bar = interpolate(local, [14, 44], [0, r.progreso], { ...clamp, easing: easeInOut });
  return (
    <div style={{ padding: "0 30px", fontFamily: fonts.texto }}>
      <ScreenTitle>{r.titulo}</ScreenTitle>
      <div
        style={{
          background: colors.panel,
          borderRadius: 32,
          padding: "30px 28px",
          border: `2px solid ${colors.rosa}66`,
          boxShadow: `0 0 30px ${colors.rosa}33`,
        }}
      >
        <div style={{ color: colors.blanco, fontWeight: 900, fontSize: 56 }}>{r.ejercicio}</div>
        <div style={{ display: "flex", gap: 14, marginTop: 26 }}>
          {r.datos.map((d, i) => {
            const p = pop(local, fps, 4 + i * 5, 12, 0.6);
            return (
              <div
                key={d}
                style={{
                  flex: 1,
                  background: colors.negro,
                  borderRadius: 22,
                  padding: "22px 4px",
                  textAlign: "center",
                  whiteSpace: "nowrap",
                  color: colors.rosaSuave,
                  fontWeight: 800,
                  fontSize: 34,
                  border: `2px solid ${colors.rosa}`,
                  scale: String(interpolate(p, [0, 1], [0.6, 1])),
                  opacity: interpolate(p, [0, 0.3], [0, 1], clamp),
                }}
              >
                {d}
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 40, display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ flex: 1, height: 30, borderRadius: 15, background: colors.negro, overflow: "hidden" }}>
            <div
              style={{
                width: `${bar}%`,
                height: "100%",
                borderRadius: 15,
                background: `linear-gradient(90deg, ${colors.rosa}, ${colors.rosaSuave})`,
                boxShadow: `0 0 20px ${colors.rosa}`,
              }}
            />
          </div>
          <div style={{ color: colors.blanco, fontWeight: 800, fontSize: 40, width: 100, textAlign: "right" }}>
            {Math.round(bar)}%
          </div>
        </div>
      </div>
    </div>
  );
};

const FotoScreen: React.FC<{ a: number }> = ({ a }) => {
  const { fps } = useVideoConfig();
  const f = copy.escena4.foto;
  const local = a - app.foto;
  const scan = interpolate(local, [6, 34], [0, 100], { ...clamp, easing: easeInOut });
  const check = pop(local, fps, 36, 10, 0.6);
  const PW = 540;
  const PH = 600;
  return (
    <div style={{ padding: "0 30px", fontFamily: fonts.texto }}>
      <ScreenTitle>{f.titulo}</ScreenTitle>
      <div
        style={{
          position: "relative",
          width: PW,
          height: PH,
          borderRadius: 30,
          overflow: "hidden",
          background: colors.rosaSuave,
          border: `3px solid ${colors.rosa}`,
        }}
      >
        {/* Recorte de la ilustracion de la pizarra (figura de la sentadilla), sin alterarla */}
        <Img
          src={staticFile("yohi_pizarra.png")}
          style={{ position: "absolute", width: 1254 * 2.1, left: -695 * 2.1 + PW / 2, top: -462 * 2.1 + PH / 2 }}
        />
        {/* Linea de escaneo */}
        {local < 40 && (
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: `${scan}%`,
              height: 6,
              background: colors.rosa,
              boxShadow: `0 0 30px 10px ${colors.rosa}88`,
            }}
          />
        )}
        {/* Esquinas de visor */}
        {[
          { top: 18, left: 18, r: "0deg" },
          { top: 18, right: 18, r: "90deg" },
          { bottom: 18, right: 18, r: "180deg" },
          { bottom: 18, left: 18, r: "270deg" },
        ].map((p, i) => (
          <svg key={i} width="60" height="60" style={{ position: "absolute", ...p, rotate: p.r }}>
            <path d="M4 56V4h52" fill="none" stroke={colors.rosa} strokeWidth={8} strokeLinecap="round" />
          </svg>
        ))}
      </div>
      <div
        style={{
          marginTop: 26,
          alignSelf: "flex-start",
          display: "inline-flex",
          padding: "18px 30px",
          borderRadius: 40,
          background: colors.rosa,
          color: colors.negro,
          fontWeight: 900,
          fontSize: 40,
          boxShadow: `0 0 34px ${colors.rosa}`,
          scale: String(interpolate(check, [0, 1], [0.3, 1])),
          opacity: interpolate(check, [0, 0.3], [0, 1], clamp),
          transformOrigin: "0% 50%",
        }}
      >
        <span>
          <EmojiText text={f.check} />
        </span>
      </div>
    </div>
  );
};

const AppScreen: React.FC<{ f: number }> = ({ f }) => {
  const a = f - phone.appStart;
  const idx =
    interpolate(a, [app.registro - 2, app.registro + 10], [0, 1], { ...clamp, easing: easeInOut }) +
    interpolate(a, [app.foto - 2, app.foto + 10], [0, 1], { ...clamp, easing: easeInOut });
  const active = Math.round(idx);
  const SW = W - SCREEN_INSET * 2;
  return (
    <AbsoluteFill style={{ background: colors.negroProfundo }}>
      <AbsoluteFill style={{ background: `radial-gradient(circle at 80% 0%, ${colors.rosa}33, transparent 50%)` }} />
      <div
        style={{
          position: "absolute",
          top: 96,
          left: 0,
          width: SW * 3,
          display: "flex",
          translate: `${-idx * SW}px 0px`,
        }}
      >
        <div style={{ width: SW }}>
          <PlanScreen a={a} />
        </div>
        <div style={{ width: SW }}>
          <RegistroScreen a={a} />
        </div>
        <div style={{ width: SW, display: "flex", flexDirection: "column" }}>
          <FotoScreen a={a} />
        </div>
      </div>
      {/* Barra de pestañas */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 120,
          background: colors.panel,
          borderTop: `2px solid ${colors.rosa}44`,
          display: "flex",
          justifyContent: "space-around",
          alignItems: "center",
        }}
      >
        {[0, 1, 2].map((k) => (
          <TabIcon key={k} kind={k} active={k === active} />
        ))}
      </div>
    </AbsoluteFill>
  );
};

/* ---------- Teléfono ---------- */

/** Smartphone generico (sin marcas). `f` = frame local dentro de la secuencia del teléfono. */
export const Phone: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Entrada con spring e inclinacion 3D que se endereza
  const enter = pop(f, fps, 0, 14, 0.9);
  // Estados de posicion: S2 (abajo, chico) -> S3 (centro) -> S4 (izquierda, chico)
  const toChat = smooth(f, fps, phone.chatStart, 16);
  const toApp = smooth(f, fps, phone.appStart, 16);
  const exitP = interpolate(f, [phone.duration - 12, phone.duration], [0, 1], { ...clamp, easing: easeIn });

  const cx = 540 + toApp * (300 - 540) - exitP * 1300;
  const cy = 1260 + toChat * (930 - 1260) + toApp * (740 - 930) + interpolate(enter, [0, 1], [1100, 0]);
  const scale = 0.74 + toChat * (1 - 0.74) + toApp * (0.7 - 1);
  const float = Math.sin(f / 16) * 8;

  const rotY = interpolate(enter, [0, 1], [-32, 0]) + Math.sin(f / 30) * 3 + exitP * 25;
  const rotX = interpolate(enter, [0, 1], [22, 0]);
  const rotZ = interpolate(enter, [0, 1], [-8, 0]);

  const showApp = f >= phone.appStart;
  const appSlide = interpolate(f, [phone.appStart, phone.appStart + 14], [100, 0], { ...clamp, easing: easeInOut });

  // Reflejo de luz que cruza el vidrio
  const glare = (start: number) => interpolate(f, [start, start + 30], [-60, 160], clamp);
  const glarePos = f < 80 ? glare(18) : f < 300 ? glare(110) : glare(phone.appStart + 20);

  return (
    <AbsoluteFill style={{ perspective: 2200 }}>
      <div
        style={{
          position: "absolute",
          left: 540 - W / 2,
          top: 960 - H / 2,
          width: W,
          height: H,
          translate: `${cx - 540}px ${cy - 960 + float}px`,
          scale: String(scale),
          rotate: `${rotZ}deg`,
          transform: `rotateY(${rotY}deg) rotateX(${rotX}deg)`,
          filter: exitP > 0.02 ? `blur(${exitP * 24}px)` : undefined,
          opacity: interpolate(enter, [0, 0.2], [0, 1], clamp),
        }}
      >
        {/* Botones laterales */}
        <div style={{ position: "absolute", right: -7, top: 300, width: 8, height: 140, borderRadius: 4, background: "#2a2a2e" }} />
        <div style={{ position: "absolute", left: -7, top: 260, width: 8, height: 90, borderRadius: 4, background: "#2a2a2e" }} />
        <div style={{ position: "absolute", left: -7, top: 370, width: 8, height: 90, borderRadius: 4, background: "#2a2a2e" }} />
        {/* Cuerpo / bisel */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 92,
            background: "linear-gradient(145deg, #3a3a40 0%, #141416 35%, #0b0b0c 65%, #2c2c31 100%)",
            boxShadow: `0 0 0 3px ${colors.rosa}88, 0 0 70px ${colors.rosa}77, 0 0 140px ${colors.rosa}33, 0 50px 90px rgba(0,0,0,0.75), inset 0 0 0 2px rgba(255,255,255,0.08)`,
          }}
        />
        {/* Pantalla */}
        <div
          style={{
            position: "absolute",
            inset: SCREEN_INSET,
            borderRadius: 78,
            overflow: "hidden",
            background: colors.negroProfundo,
          }}
        >
          <AbsoluteFill style={{ translate: showApp ? `${-100 + appSlide}% 0px` : undefined }}>
            <ChatScreen f={f} />
          </AbsoluteFill>
          {showApp && (
            <AbsoluteFill style={{ translate: `${appSlide}% 0px` }}>
              <AppScreen f={f} />
            </AbsoluteFill>
          )}
          <StatusIcons />
          {/* Isla de camara */}
          <div
            style={{
              position: "absolute",
              top: 22,
              left: "50%",
              marginLeft: -80,
              width: 160,
              height: 42,
              borderRadius: 21,
              background: "#000",
            }}
          />
          {/* Reflejo */}
          <AbsoluteFill
            style={{
              background: `linear-gradient(115deg, transparent ${glarePos - 20}%, rgba(255,255,255,0.16) ${glarePos}%, transparent ${
                glarePos + 14
              }%)`,
              pointerEvents: "none",
            }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};
