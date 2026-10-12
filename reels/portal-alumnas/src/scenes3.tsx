import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, portal as P } from "./theme";
import { fonts } from "./fonts";
import { copy } from "./copy";
import { clamp, easeInOut, pop, smooth } from "./components/anim";
import { Subtitle } from "./components/Subtitle";
import { Yohi } from "./components/Yohi";
import { SparkleBurst } from "./components/Sparkle";
import { Tap } from "./components/Tap";
import { Btn, Em, ExerciseCard } from "./components/ui";
import type { SetVals } from "./components/ui";
import { Shell, blink, typed } from "./scenes1";
import { EmojiText } from "./components/EmojiText";

const T = fonts.texto;
const D = fonts.titulo;
const LW = 560; // ancho logico de cada panel
const SC = 892 / LW;

const Panel: React.FC<{ top: number; height: number; label: string; tone?: "rosa" | "gold"; enter: number; children: React.ReactNode }> = ({
  top,
  height,
  label,
  tone = "rosa",
  enter,
  children,
}) => (
  <div
    style={{
      position: "absolute",
      left: 70,
      top,
      width: 940,
      height,
      borderRadius: 40,
      background: "rgba(14,14,14,.94)",
      border: `2px solid ${tone === "rosa" ? "rgba(255,109,180,.45)" : "rgba(242,199,110,.45)"}`,
      boxShadow: `0 0 60px -10px ${tone === "rosa" ? "rgba(255,79,163,.45)" : "rgba(242,199,110,.35)"}`,
      overflow: "hidden",
      opacity: interpolate(enter, [0, 0.3], [0, 1], clamp),
      transform: `translateY(${(1 - enter) * 120}px) scale(${0.94 + 0.06 * enter})`,
    }}
  >
    <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 60, zIndex: 5, background: "rgba(14,14,14,1)", paddingLeft: 24, paddingTop: 16 }}>
      <span
        style={{
          fontFamily: T,
          fontWeight: 900,
          fontSize: 24,
          letterSpacing: ".14em",
          textTransform: "uppercase",
          color: tone === "rosa" ? colors.rosa : P.gold,
        }}
      >
        {label}
      </span>
    </div>
    <div style={{ position: "absolute", left: 0, right: 0, top: 60, bottom: 0, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 24, top: 6, width: LW, transformOrigin: "0 0", transform: `scale(${SC})`, color: P.fg, fontFamily: T, lineHeight: 1.55 }}>
        {children}
      </div>
    </div>
  </div>
);

const ROWS = [
  ["60", "10", "2"],
  ["60", "10", "2"],
  ["65", "8", "1"],
];
const NOTE = "La última serie me costó. Bajé el peso.";

const EditInput: React.FC<{ v: string; active?: boolean; caret?: boolean }> = ({ v, active, caret }) => (
  <div
    style={{
      minHeight: 40,
      borderRadius: 12,
      border: `1.5px solid ${active ? P.accent : "rgba(255,214,232,.15)"}`,
      boxShadow: active ? "0 0 0 3px rgba(255,79,163,.25)" : "none",
      background: "rgba(255,255,255,.04)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      font: `600 15px/1 ${T}`,
      fontVariantNumeric: "tabular-nums",
    }}
  >
    {v}
    {active && caret && <span style={{ width: 2, height: 17, background: P.accent, marginLeft: 1 }} />}
  </div>
);

/* ------------------------------------------------------------------ 7. YOHI LO VE TODO */
export const SceneYohi: React.FC<{ duration: number }> = ({ duration }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const eA = smooth(f, fps, 0, 18);
  const eB = smooth(f, fps, 5, 18);
  const rows: SetVals[] = ROWS.map((r) => ({ kg: r[0], reps: r[1], rir: r[2] }));

  // pulso de sincronizacion A -> B
  const pulse = interpolate(f, [16, 34], [0, 1], { ...clamp, easing: easeInOut });
  const arrived = f >= 34;
  const chipIn = interpolate(f, [14, 22, 50, 58], [0, 1, 1, 0], clamp);

  // B: datos del registro llegan
  const line = (d: number) => smooth(f, fps, 34 + d, 14);
  // editor de Yohi
  const edOpen = interpolate(f, [44, 56], [0, 1], { ...clamp, easing: easeInOut });
  const scrollIn = interpolate(f, [44, 56], [0, 1], { ...clamp, easing: easeInOut });
  const scrollOut = interpolate(f, [78, 90], [0, 1], { ...clamp, easing: easeInOut });
  const scrollY = 300 * scrollIn * (1 - scrollOut);
  const newKg = typed("67.5", f, 58, 0.4);
  const typing = f >= 56 && f < 72;
  const kg3 = f < 58 ? "65" : newKg;
  const tapAt = 72;
  const saveGlow = interpolate(f, [tapAt, tapAt + 5, tapAt + 22], [0, 1, 0.15], clamp);
  const savePress = interpolate(f, [tapAt, tapAt + 4, tapAt + 9], [1, 0.94, 1], clamp);
  const saved = f >= tapAt + 6;
  const kgShown = saved ? "67.5" : "65";
  const hl = interpolate(f, [tapAt + 8, tapAt + 14, tapAt + 40], [0, 1, 0.4], clamp);

  return (
    <Shell duration={duration}>
      <Subtitle line={copy.yohi} delay={1} />

      {/* Panel A · alumna */}
      <Panel top={528} height={488} label="Alumna demo" enter={eA}>
        <ExerciseCard idx={1} name="Hip thrust" sets={3} reps="8-10" rest={90} open={1} first badge="done" rows={rows} caret={false} compact />
      </Panel>

      {/* conector */}
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <line x1={540} y1={1018} x2={540} y2={1068} stroke={colors.rosa} strokeWidth={5} strokeDasharray="4 12" strokeLinecap="round" opacity={0.7} />
        <circle cx={540} cy={1018 + pulse * 50} r={interpolate(pulse, [0, 0.5, 1], [6, 14, 8])} fill={colors.rosa} opacity={pulse > 0 && pulse < 1 ? 1 : 0} style={{ filter: `drop-shadow(0 0 14px ${colors.rosa})` }} />
      </svg>
      <div style={{ position: "absolute", left: 0, right: 0, top: 1030, textAlign: "center", opacity: chipIn, transform: `scale(${0.85 + chipIn * 0.15})` }}>
        <span style={{ fontFamily: T, fontWeight: 900, fontSize: 24, letterSpacing: ".12em", textTransform: "uppercase", background: colors.rosa, color: colors.negro, padding: "6px 20px", borderRadius: 999 }}>
          mismo registro
        </span>
      </div>

      {/* Panel B · vista admin de Yohi */}
      <Panel top={1072} height={450} label="Vista de Yohi · admin" tone="gold" enter={eB}>
        <div style={{ transform: `translateY(${-scrollY}px)`, padding: "0 4px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
            <strong style={{ fontSize: 17 }}>Alumna demo</strong>
            <Btn small ghost>
              <Em t="📊" /> &nbsp;Ver registro de la alumna
            </Btn>
          </div>
          <div style={{ border: "1px solid rgba(255,109,180,.35)", borderRadius: 14, background: "rgba(255,255,255,.02)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px" }}>
              <span style={{ flex: 1, font: `400 22px/1.1 ${D}`, textTransform: "uppercase", letterSpacing: ".02em" }}>Día 3</span>
              <span style={{ font: `800 11px/1 ${T}`, color: P.muted, padding: "6px 10px", borderRadius: 999, border: "1px solid rgba(255,214,232,.15)" }}>{arrived ? "1/3 con registro" : "0/3 con registro"}</span>
            </div>
            <div style={{ padding: "0 14px 10px" }}>
              <div style={{ padding: "6px 0", borderBottom: "1px solid rgba(255,214,232,.06)" }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>
                  Hip thrust <span style={{ color: P.muted, fontWeight: 500, fontSize: 13 }}>&nbsp;3×8-10</span>
                </div>
                {!arrived ? (
                  <div style={{ color: P.muted, fontSize: 13 }}>Sin registro</div>
                ) : (
                  <>
                    <div style={{ fontSize: 12, color: P.muted, marginTop: 4, opacity: line(0), transform: `translateY(${(1 - line(0)) * 14}px)` }}>12 oct</div>
                    <div style={{ fontSize: 14, fontVariantNumeric: "tabular-nums", opacity: line(3), transform: `translateY(${(1 - line(3)) * 14}px)` }}>
                      S1: 60 kg × 10 (RIR 2) · S2: 60 kg × 10 (RIR 2) · S3:{" "}
                      <span style={{ color: hl > 0.3 ? colors.rosa : undefined, fontWeight: hl > 0.3 ? 800 : 400 }}>{kgShown} kg</span> × 8 (RIR 1)
                    </div>
                    <p style={{ margin: "4px 0 0", padding: "6px 10px", borderLeft: `3px solid ${P.gold}`, background: "rgba(242,199,110,.07)", borderRadius: "0 10px 10px 0", fontSize: 13, opacity: line(8), transform: `translateY(${(1 - line(8)) * 14}px)` }}>
                      <EmojiText text="📝" scale={1.1} /> {NOTE}
                    </p>
                  </>
                )}
              </div>
              {/* Registrar / corregir pesos */}
              <div style={{ marginTop: 8, borderRadius: 12, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,214,232,.12)", padding: "8px 12px" }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>
                  <EmojiText text="✏️" scale={1.1} /> Registrar / corregir pesos
                </div>
                <div style={{ display: "grid", gridTemplateRows: `${edOpen}fr` }}>
                  <div style={{ overflow: "hidden", minHeight: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "8px 0" }}>
                      <span style={{ fontSize: 13, color: P.muted }}>Fecha</span>
                      <span style={{ padding: "8px 10px", borderRadius: 12, border: "1.5px solid rgba(255,214,232,.15)", background: "rgba(255,255,255,.04)", font: `600 15px/1 ${T}` }}>12-10-2026</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "36px 1fr 1fr 1fr", gap: 6, font: `800 10px/1 ${T}`, letterSpacing: ".06em", textTransform: "uppercase", color: P.accentSoft, paddingBottom: 6 }}>
                      <span>Serie</span>
                      <span>KG</span>
                      <span>Reps</span>
                      <span>RIR</span>
                    </div>
                    {ROWS.map((r, i) => (
                      <div key={i} style={{ display: "grid", gridTemplateColumns: "36px 1fr 1fr 1fr", gap: 6, alignItems: "center", padding: "5px 0" }}>
                        <span style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(255,79,163,.1)", border: "1.5px solid rgba(255,109,180,.3)", display: "grid", placeItems: "center", font: `800 13px/1 ${T}`, color: P.accentSoft }}>{i + 1}</span>
                        <EditInput v={i === 2 ? (saved ? "67.5" : kg3) : r[0]} active={i === 2 && typing} caret={blink(f)} />
                        <EditInput v={r[1]} />
                        <EditInput v={r[2]} />
                      </div>
                    ))}
                    <div style={{ marginTop: 8, marginBottom: 6 }}>
                      <Btn small glow={saveGlow} press={savePress}>
                        Guardar pesos
                        <Tap f={f} at={tapAt} fromX={90} fromY={90} />
                      </Btn>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Panel>
      <SparkleBurst x={540} y={1330} t={f - (tapAt + 6)} seed="adm" radius={200} n={10} />
    </Shell>
  );
};

/* ------------------------------------------------------------------ 8. CIERRE */
export const SceneCierre: React.FC<{ duration: number }> = ({ duration }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const lines = copy.cierre;
  const yp = pop(f, fps, 22, 10, 0.8);
  const ctaP = pop(f, fps, 40, 11, 0.7);
  const breathe = (Math.sin(f / 7) + 1) / 2;
  return (
    <Shell duration={duration} last>
      <div style={{ position: "absolute", left: 0, right: 0, top: 268, textAlign: "center", opacity: smooth(f, fps, 0, 14) }}>
        <span style={{ fontFamily: D, fontSize: 54, letterSpacing: ".12em", color: colors.blanco }}>
          YOHI <span style={{ color: colors.rosa }}>COACH</span> <EmojiText text="💗" scale={0.9} />
        </span>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 360, textAlign: "center" }}>
        {lines.map((l, i) => {
          const p = pop(f, fps, 4 + i * 4, 12, 0.6);
          const pink = i >= 2;
          return (
            <div
              key={i}
              style={{
                fontFamily: D,
                fontSize: 124,
                lineHeight: 0.98,
                textTransform: "uppercase",
                color: pink ? colors.rosa : colors.blanco,
                textShadow: pink ? `0 0 44px ${colors.rosa}77` : "0 6px 30px rgba(0,0,0,.6)",
                opacity: interpolate(p, [0, 0.35], [0, 1], clamp),
                transform: `translateY(${(1 - p) * 60}px) scale(${0.8 + 0.2 * p})`,
              }}
            >
              {l.text}
            </div>
          );
        })}
      </div>
      <div
        style={{
          position: "absolute",
          left: 540 - 227,
          top: 880,
          transform: `scale(${yp}) rotate(${(1 - yp) * 10}deg)`,
          transformOrigin: "50% 100%",
          opacity: interpolate(yp, [0, 0.3], [0, 1], clamp),
        }}
      >
        <Yohi height={520} glow={1.1} />
      </div>
      <SparkleBurst x={540} y={1130} t={f - 24} seed="cierre" radius={380} n={14} />
      <div style={{ position: "absolute", left: 70, right: 70, top: 1408, display: "flex", justifyContent: "center", transform: `scale(${0.7 + 0.3 * ctaP})`, opacity: interpolate(ctaP, [0, 0.3], [0, 1], clamp) }}>
        <div
          style={{
            padding: "26px 44px",
            borderRadius: 999,
            background: colors.rosa,
            color: colors.negro,
            fontFamily: T,
            fontWeight: 900,
            fontSize: 43,
            letterSpacing: ".01em",
            whiteSpace: "nowrap",
            boxShadow: `0 14px 50px -8px ${colors.rosa}cc, 0 0 ${30 + breathe * 34}px ${colors.rosa}88`,
          }}
        >
          {copy.cta}
        </div>
      </div>
    </Shell>
  );
};

