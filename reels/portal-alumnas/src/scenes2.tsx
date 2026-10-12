import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { colors } from "./theme";
import { fonts } from "./fonts";
import { copy } from "./copy";
import { clamp, easeInOut, easeOut, pop } from "./components/anim";
import { Subtitle } from "./components/Subtitle";
import { Yohi } from "./components/Yohi";
import { SparkleBurst } from "./components/Sparkle";
import { Tap } from "./components/Tap";
import { EmojiText } from "./components/EmojiText";
import { Card, DayGroup, ExerciseCard, Progress, TimerCard, Wrap } from "./components/ui";
import type { SetVals } from "./components/ui";
import { DemoTag, PhoneEntry, Shell, blink, typed } from "./scenes1";

const ROWS = [
  ["60", "10", "2"],
  ["60", "10", "2"],
  ["65", "8", "1"],
];
const startOf = (r: number, c: number) => 12 + r * 22 + c * 7;

/* ------------------------------------------------------------------ 4. PESOS */
export const ScenePesos: React.FC<{ duration: number }> = ({ duration }) => {
  const f = useCurrentFrame();
  const keys = ["kg", "reps", "rir"] as const;
  let focus: { r: number; c: number } | null = null;
  const rows: SetVals[] = ROWS.map((row, r) => {
    const v: SetVals = { kg: "", reps: "", rir: "", focus: null };
    row.forEach((txt, c) => {
      const st = startOf(r, c);
      v[keys[c]] = typed(txt, f, st, 0.4);
      if (f >= st && f < st + 7) {
        focus = { r, c };
      }
    });
    return v;
  });
  const fc = focus as { r: number; c: number } | null;
  if (fc) rows[fc.r].focus = keys[fc.c];
  // volumen con contador animado (cuenta cuando se completa cada fila de reps)
  const vol = ROWS.reduce((acc, row, r) => {
    const t = startOf(r, 1) + 4;
    return acc + Number(row[0]) * Number(row[1]) * interpolate(f, [t, t + 12], [0, 1], { ...clamp, easing: easeOut });
  }, 0);
  const tapAt = 104;
  const savePress = interpolate(f, [tapAt, tapAt + 4, tapAt + 9], [1, 0.94, 1], clamp);
  const saveGlow = interpolate(f, [tapAt, tapAt + 5, tapAt + 24], [0, 1, 0.15], clamp);
  const saved = interpolate(f, [tapAt + 6, tapAt + 12], [0, 1], clamp);
  const done = f >= tapAt + 6;
  const zo = interpolate(f, [84, 100], [0, 1], { ...clamp, easing: easeInOut });
  const cam = { x: -2 - 10 * zo, y: 130 - 40 * zo, scale: 1.0 - 0.08 * zo };
  return (
    <Shell duration={duration}>
      <Subtitle line={copy.pesos} />
      <PhoneEntry f={f} camera={cam}>
        <Wrap>
          <Card>
            <Progress done={done ? 1 : 0} total={9} />
            <DayGroup name="Día 3" count={done ? "1/3 ejercicios" : "0/3 ejercicios"} open={1}>
              <ExerciseCard
                idx={1}
                name="Hip thrust"
                sets={3}
                reps="8-10"
                rest={90}
                open={1}
                first
                badge={done ? "done" : "none"}
                rows={rows}
                caret={blink(f)}
                saveGlow={saveGlow}
                savePress={savePress}
                saved={saved}
                vol={vol}
                tap={<Tap f={f} at={tapAt} fromX={90} fromY={110} />}
              />
            </DayGroup>
          </Card>
        </Wrap>
      </PhoneEntry>
      <SparkleBurst x={300} y={1010} t={f - (tapAt + 6)} seed="done" radius={150} n={8} />
      <DemoTag />
    </Shell>
  );
};

/* ------------------------------------------------------------------ 5. TEMPORIZADOR */
export const SceneTimer: React.FC<{ duration: number }> = ({ duration }) => {
  const f = useCurrentFrame();
  const tapAt = 22;
  const runStart = 28;
  const runEnd = 76;
  const prog = interpolate(f, [runStart, runEnd - 4], [0, 1], { ...clamp, easing: easeInOut });
  const remaining = Math.max(0, 90 - Math.floor(prog * 90.99));
  const state: "idle" | "running" | "done" = f < runStart ? "idle" : f < runEnd ? "running" : "done";
  const bounce = 0.5 - 0.5 * Math.cos(f * 0.75);
  const startPress = interpolate(f, [tapAt, tapAt + 4, tapAt + 9], [1, 0.93, 1], clamp);
  const startGlow = interpolate(f, [tapAt, tapAt + 5, tapAt + 12], [0, 1, 0], clamp);
  const ring = interpolate(f, [runEnd, runEnd + 5, runEnd + 14], [0, 1, 0], clamp);
  return (
    <Shell duration={duration}>
      <Subtitle line={copy.timer} />
      <PhoneEntry f={f} camera={{ x: 4, y: 20, scale: 1.08 }}>
        <Wrap>
          <Card>
            <Progress done={1} total={9} />
            <TimerCard remaining={remaining} state={state} bounce={bounce} startGlow={startGlow} startPress={startPress} ringPulse={ring}>
              <Tap f={f} at={tapAt} fromX={80} fromY={110} />
            </TimerCard>
            <div style={{ display: "grid", gap: 10 }}>
              {["Día 1", "Día 2", "Día 3"].map((d) => (
                <DayGroup key={d} name={d} count="0/3 ejercicios" open={0} />
              ))}
            </div>
          </Card>
        </Wrap>
      </PhoneEntry>
      <SparkleBurst x={470} y={1120} t={f - runEnd} seed="timer" radius={240} n={12} />
      <DemoTag text="Pantallas con datos demo · cuenta regresiva acelerada" />
    </Shell>
  );
};

/* ------------------------------------------------------------------ 6. OBSERVACION */
const NOTE = "La última serie me costó. Bajé el peso.";

export const SceneNota: React.FC<{ duration: number }> = ({ duration }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const obs = typed(NOTE, f, 10, 0.85);
  const typing = f >= 8 && f < 10 + NOTE.length / 0.85 + 4;
  const tapAt = 62;
  const savePress = interpolate(f, [tapAt, tapAt + 4, tapAt + 9], [1, 0.94, 1], clamp);
  const saveGlow = interpolate(f, [tapAt, tapAt + 5, tapAt + 24], [0, 1, 0.15], clamp);
  const saved = interpolate(f, [tapAt + 5, tapAt + 11], [0, 1], clamp);
  const rows: SetVals[] = ROWS.map((r) => ({ kg: r[0], reps: r[1], rir: r[2] }));
  // la nota viaja hacia Yohi
  const fly = interpolate(f, [tapAt + 12, tapAt + 30], [0, 1], { ...clamp, easing: easeInOut });
  const yp = pop(f, fps, tapAt + 4, 11, 0.7);
  const react = interpolate(f, [tapAt + 30, tapAt + 34, tapAt + 42], [0, 1, 0], clamp);
  const ex = interpolate(fly, [0, 1], [540, 820]);
  const ey = interpolate(fly, [0, 1], [800, 1340]) - Math.sin(fly * Math.PI) * 120;
  const chipScale = interpolate(fly, [0, 1], [1, 0.35]);
  return (
    <Shell duration={duration}>
      <Subtitle line={copy.nota} />
      <PhoneEntry f={f} camera={{ x: 46, y: 395, scale: 1.24 }}>
        <Wrap>
          <Card>
            <DayGroup name="Día 3" count="1/3 ejercicios" allDone open={1}>
              <ExerciseCard
                idx={1}
                name="Hip thrust"
                sets={3}
                reps="8-10"
                rest={90}
                open={1}
                first
                badge="done"
                rows={rows}
                caret={blink(f)}
                obs={obs}
                obsFocus={typing && f < tapAt}
                saveGlow={saveGlow}
                savePress={savePress}
                saved={saved}
                vol={1720}
                tap={<Tap f={f} at={tapAt} fromX={90} fromY={110} />}
              />
            </DayGroup>
          </Card>
        </Wrap>
      </PhoneEntry>
      {/* Yohi recibe la nota */}
      <div style={{ position: "absolute", left: 700, top: 1130, opacity: interpolate(yp, [0, 0.3], [0, 1], clamp), transform: `scale(${yp * (1 + react * 0.08)}) translateY(${-react * 18}px)`, transformOrigin: "50% 100%" }}>
        <Yohi height={410} />
      </div>
      {fly > 0 && fly < 1 && (
        <div
          style={{
            position: "absolute",
            left: ex - 150,
            top: ey - 40,
            width: 300,
            padding: "14px 18px",
            borderRadius: 18,
            background: colors.rosaSuave,
            color: colors.negro,
            fontFamily: fonts.texto,
            fontWeight: 700,
            fontSize: 24,
            lineHeight: 1.25,
            transform: `scale(${chipScale}) rotate(${fly * -8}deg)`,
            boxShadow: `0 0 40px ${colors.rosa}88`,
          }}
        >
          <EmojiText text="📝" scale={1.05} /> {NOTE}
        </div>
      )}
      <SparkleBurst x={880} y={1240} t={f - (tapAt + 30)} seed="nota" radius={170} n={9} />
      <DemoTag />
    </Shell>
  );
};
