import React from "react";
import { AbsoluteFill, interpolate, random, useCurrentFrame, useVideoConfig } from "remotion";
import { colors } from "./theme";
import { fonts } from "./fonts";
import { copy } from "./copy";
import { clamp, easeInOut, easeOut, pop, smooth, whip } from "./components/anim";
import { Subtitle } from "./components/Subtitle";
import { Yohi } from "./components/Yohi";
import { SparkleBurst } from "./components/Sparkle";
import { Phone } from "./components/Phone";
import { Tap } from "./components/Tap";
import {
  Card,
  DayGroup,
  ExerciseCard,
  LoginDialog,
  PlanCard,
  Progress,
  TimerCard,
  TopBar,
  TrainingHead,
  Wrap,
} from "./components/ui";
import { OVERLAP } from "./timing";

export const typed = (text: string, f: number, start: number, cpf = 0.8) =>
  text.slice(0, Math.max(0, Math.min(text.length, Math.floor((f - start) * cpf))));
export const blink = (f: number) => Math.floor(f / 7) % 2 === 0;

/** Envoltura de escena: whip de entrada/salida + punch de zoom al cortar. */
export const Shell: React.FC<{ duration: number; first?: boolean; last?: boolean; children: React.ReactNode }> = ({
  duration,
  first,
  last,
  children,
}) => {
  const f = useCurrentFrame();
  const w = whip(f, duration, first ? 0 : 8, last ? 0 : OVERLAP);
  const punch = first ? 1 : interpolate(f, [0, 10], [1.05, 1], { ...clamp, easing: easeOut });
  return (
    <AbsoluteFill style={{ ...w, scale: String(punch) }}>
      {children}
    </AbsoluteFill>
  );
};

export const DemoTag: React.FC<{ text?: string }> = ({ text = copy.demo }) => (
  <div
    style={{
      position: "absolute",
      left: 0,
      right: 0,
      top: 530,
      textAlign: "center",
      fontFamily: fonts.texto,
      fontWeight: 700,
      fontSize: 24,
      letterSpacing: ".04em",
      color: colors.gris,
    }}
  >
    <span style={{ background: "rgba(17,17,17,.82)", padding: "8px 18px", borderRadius: 999, border: "1px solid rgba(255,255,255,.12)" }}>{text}</span>
  </div>
);

/** Telefono que entra desde abajo con spring. */
export const PhoneEntry: React.FC<{
  f: number;
  children: React.ReactNode;
  camera?: { x?: number; y?: number; scale?: number };
}> = ({ f, children, camera }) => {
  const { fps } = useVideoConfig();
  const e = smooth(f, fps, 1, 20);
  return (
    <AbsoluteFill style={{ transform: `translateY(${(1 - e) * 340}px) rotate(${(1 - e) * 2.5}deg)`, opacity: interpolate(e, [0, 0.3], [0, 1], clamp) }}>
      <Phone camera={camera}>{children}</Phone>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ 1. HOOK */
const GlitchLine: React.FC<{ text: string; color: string; g: number; seed: string; size: number }> = ({ text, color, g, seed, size }) => {
  const base: React.CSSProperties = {
    fontFamily: fonts.titulo,
    fontSize: size,
    lineHeight: 0.96,
    textTransform: "uppercase",
    letterSpacing: "0.005em",
    whiteSpace: "nowrap",
  };
  const dx = g * (10 + random(`${seed}x`) * 22);
  const band = (k: number) => {
    const a = random(`${seed}ba${k}`) * 70;
    const h = 12 + random(`${seed}bh${k}`) * 22;
    const sh = (random(`${seed}bs${k}`) - 0.5) * 120 * g;
    return { clip: `inset(${a}% 0 ${100 - a - h}% 0)`, sh };
  };
  return (
    <div style={{ position: "relative", ...base, color }}>
      {g > 0.05 && (
        <>
          <div style={{ position: "absolute", inset: 0, color: colors.rosa, transform: `translateX(${-dx}px)`, mixBlendMode: "screen", opacity: 0.9 }}>{text}</div>
          <div style={{ position: "absolute", inset: 0, color: colors.blanco, transform: `translateX(${dx * 0.7}px)`, mixBlendMode: "screen", opacity: 0.55 }}>{text}</div>
          {[0, 1].map((k) => {
            const b = band(k);
            return (
              <div key={k} style={{ position: "absolute", inset: 0, color: colors.rosa, clipPath: b.clip, transform: `translateX(${b.sh}px)` }}>
                {text}
              </div>
            );
          })}
        </>
      )}
      <div style={{ position: "relative", textShadow: color === colors.rosa ? `0 0 40px ${colors.rosa}77` : "0 6px 30px rgba(0,0,0,.6)" }}>{text}</div>
    </div>
  );
};

export const SceneHook: React.FC<{ duration: number }> = ({ duration }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const flick = (fr: number) => (random(`gl${fr}`) > 0.35 ? 1 : 0.25);
  const spike = (a: number, b: number) => (f >= a && f <= b ? flick(f) : 0);
  const g = Math.max(interpolate(f, [0, 22], [1, 0], clamp) * flick(f), spike(38, 42) * 0.8, spike(58, 61) * 0.7);
  const yp = pop(f, fps, 16, 10, 0.8);
  const kick = interpolate(pop(f, fps, 3, 14, 0.6), [0, 1], [0, 1]);
  return (
    <Shell duration={duration} first>
      <div
        style={{
          position: "absolute",
          top: 268,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: kick,
          transform: `translateY(${(1 - kick) * -30}px)`,
        }}
      >
        <span
          style={{
            display: "inline-block",
            fontFamily: fonts.texto,
            fontWeight: 900,
            fontSize: 30,
            letterSpacing: ".16em",
            color: colors.rosaSuave,
            padding: "14px 30px",
            borderRadius: 999,
            border: `2px solid ${colors.rosa}`,
            background: "rgba(17,17,17,.7)",
            boxShadow: `0 0 30px ${colors.rosa}55`,
          }}
        >
          {copy.kicker} 💗
        </span>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 372, textAlign: "center" }}>
        {copy.hook.map((t, i) => {
          const p = pop(f, fps, 2 + i * 3, 11, 0.6);
          return (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "center",
                transform: `scale(${1.5 - 0.5 * p}) translateY(${(1 - p) * 40}px)`,
                opacity: interpolate(p, [0, 0.35], [0, 1], clamp),
              }}
            >
              <GlitchLine text={t} color={i === 3 ? colors.rosa : colors.blanco} g={g} seed={`l${i}f${Math.floor(f / 2)}`} size={184} />
            </div>
          );
        })}
      </div>
      <div
        style={{
          position: "absolute",
          left: 540 - 180,
          top: 1105,
          transform: `scale(${yp}) rotate(${(1 - yp) * -14}deg)`,
          transformOrigin: "50% 100%",
          opacity: interpolate(yp, [0, 0.3], [0, 1], clamp),
        }}
      >
        <Yohi height={436} />
      </div>
      <SparkleBurst x={540} y={1320} t={f - 17} seed="hook" radius={330} n={12} />
    </Shell>
  );
};

/* ------------------------------------------------------------------ 2. LOGIN */
export const SceneLogin: React.FC<{ duration: number }> = ({ duration }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const email = typed("alumna.demo@ejemplo.cl", f, 14, 0.75);
  const passLen = Math.max(0, Math.min(11, Math.floor((f - 46) * 0.75)));
  const focus = f < 44 ? "email" : f < 62 ? "pass" : null;
  const tapAt = 70;
  const press = interpolate(f, [tapAt, tapAt + 4, tapAt + 9], [1, 0.95, 1], clamp);
  const glow = interpolate(f, [tapAt, tapAt + 5, tapAt + 22], [0, 1, 0.2], clamp);
  const swap = interpolate(f, [tapAt + 6, tapAt + 20], [0, 1], { ...clamp, easing: easeInOut });
  const home = (d: number) => smooth(f, fps, tapAt + 12 + d, 16);
  return (
    <Shell duration={duration}>
      <Subtitle line={copy.login} />
      <PhoneEntry f={f}>
        <div style={{ position: "relative", width: 412, minHeight: 700 }}>
          {/* ventana de ingreso */}
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 60,
              width: 412,
              opacity: 1 - swap,
              transform: `scale(${1 - swap * 0.06}) translateY(${-swap * 30}px)`,
              display: swap >= 1 ? "none" : "block",
            }}
          >
            <LoginDialog email={email} passLen={passLen} focus={focus} caret={blink(f)} btnGlow={glow} btnPress={press}>
              <Tap f={f} at={tapAt} fromX={110} fromY={170} />
            </LoginDialog>
          </div>
          {/* portal de la alumna */}
          <div style={{ position: "absolute", left: 0, top: 18, opacity: swap }}>
            <Wrap>
              <div style={{ opacity: home(0), transform: `translateY(${(1 - home(0)) * 40}px)` }}>
                <TopBar />
              </div>
              <div style={{ opacity: home(5), transform: `translateY(${(1 - home(5)) * 40}px)` }}>
                <PlanCard />
              </div>
              <div style={{ opacity: home(10), transform: `translateY(${(1 - home(10)) * 40}px)` }}>
                <Card>
                  <TrainingHead />
                </Card>
              </div>
            </Wrap>
          </div>
        </div>
      </PhoneEntry>
      <DemoTag />
    </Shell>
  );
};

/* ------------------------------------------------------------------ 3. DIAS */
export const DAYS = [
  {
    name: "Día 1",
    ex: [
      { n: "Sentadilla", sets: 4, reps: "6-8", rest: 120 },
      { n: "Prensa de piernas", sets: 3, reps: "10-12", rest: 90 },
      { n: "Curl femoral", sets: 3, reps: "12-15", rest: 60 },
    ],
  },
  {
    name: "Día 2",
    ex: [
      { n: "Press banca", sets: 4, reps: "6-8", rest: 120 },
      { n: "Jalón al pecho", sets: 3, reps: "8-10", rest: 90 },
      { n: "Remo con mancuerna", sets: 3, reps: "10-12", rest: 90 },
    ],
  },
  {
    name: "Día 3",
    ex: [
      { n: "Hip thrust", sets: 3, reps: "8-10", rest: 90 },
      { n: "Peso muerto rumano", sets: 3, reps: "8-10", rest: 90 },
      { n: "Abducción en máquina", sets: 3, reps: "12-15", rest: 60 },
    ],
  },
];

export const SceneDias: React.FC<{ duration: number }> = ({ duration }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  // [abre, cierra] de cada dia (acordeon)
  const win = [
    [12, 52],
    [48, 88],
    [84, 999],
  ];
  const openP = (i: number) => {
    const [a, b] = win[i];
    return interpolate(f, [a, a + 14, b, b + 12], [0, 1, 1, i === 2 ? 1 : 0], { ...clamp, easing: easeInOut });
  };
  const cam = interpolate(f, [0, 12], [150, 300], { ...clamp, easing: easeInOut });
  return (
    <Shell duration={duration}>
      <Subtitle line={copy.dias} />
      <PhoneEntry f={f} camera={{ y: cam + (f > 84 ? interpolate(f, [84, 104], [0, 70], { ...clamp, easing: easeInOut }) : 0) }}>
        <Wrap>
          <Card>
            <TrainingHead />
            <Progress done={0} total={9} />
            <TimerCard remaining={90} state="idle" />
            <div style={{ display: "grid", gap: 10 }}>
              {DAYS.map((d, di) => (
                <DayGroup key={d.name} name={d.name} count="0/3 ejercicios" open={openP(di)}>
                  {d.ex.map((e, ei) => {
                    const en = smooth(f, fps, win[di][0] + 6 + ei * 5, 14);
                    return (
                      <ExerciseCard key={e.n} idx={ei + 1} name={e.n} sets={e.sets} reps={e.reps} rest={e.rest} open={0} first={ei === 0} enter={en} metaEmph={en} />
                    );
                  })}
                </DayGroup>
              ))}
            </div>
          </Card>
        </Wrap>
      </PhoneEntry>
      <DemoTag />
    </Shell>
  );
};
