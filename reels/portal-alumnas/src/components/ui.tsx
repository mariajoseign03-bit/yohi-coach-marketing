import React from "react";
import { Img, staticFile } from "remotion";
import { portal as P } from "../theme";
import { fonts } from "../fonts";
import { EmojiText } from "./EmojiText";

// Reconstruccion de las pantallas del portal (site/portal.css, training.js, alumnos.html, index.html en la rama
// workers-site). Todo en px "logicos" del portal (pantalla de 412 px); Phone lo escala. Mismos valores del CSS.

export const Camera: React.FC<{ x?: number; y?: number; scale?: number; children: React.ReactNode }> = ({
  x = 0,
  y = 0,
  scale = 1,
  children,
}) => (
  <div style={{ width: 412, transformOrigin: "0 0", transform: `translate(${-x}px, ${-y}px) scale(${scale})` }}>
    {children}
  </div>
);

const T = fonts.texto;
const D = fonts.titulo;

export const Em: React.FC<{ t: string; s?: number }> = ({ t, s = 1.1 }) => <EmojiText text={t} scale={s} />;

export const Chip: React.FC<{ children: React.ReactNode; gold?: boolean }> = ({ children, gold }) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      padding: "6px 12px",
      borderRadius: 999,
      font: `800 12px/1 ${T}`,
      background: gold ? "rgba(242,199,110,.12)" : "rgba(255,79,163,.16)",
      border: `1px solid ${gold ? "rgba(242,199,110,.5)" : "rgba(255,109,180,.45)"}`,
      color: gold ? P.gold : P.accentSoft,
    }}
  >
    {children}
  </span>
);

export const Btn: React.FC<{
  children: React.ReactNode;
  small?: boolean;
  ghost?: boolean;
  glow?: number;
  press?: number;
  style?: React.CSSProperties;
}> = ({ children, small, ghost, glow = 0, press = 1, style }) => (
  <div
    style={{
      position: "relative",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: small ? 44 : 48,
      padding: small ? "0 18px" : "0 26px",
      borderRadius: 999,
      font: `800 ${small ? 12.5 : 14}px/1 ${T}`,
      letterSpacing: ".06em",
      textTransform: "uppercase",
      background: ghost ? "transparent" : P.accent,
      color: ghost ? P.fg : P.onAccent,
      border: ghost ? "1.5px solid rgba(255,214,232,.35)" : "none",
      boxShadow: ghost
        ? "none"
        : `0 10px 30px -8px rgba(255,79,163,.7)${
            glow > 0 ? `, 0 0 ${34 * glow}px ${10 * glow}px rgba(255,79,163,${0.8 * glow})` : ""
          }`,
      transform: `scale(${press})`,
      ...style,
    }}
  >
    {children}
  </div>
);

export const Card: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <section
    style={{
      background: "rgba(25,25,25,.82)",
      border: "1px solid rgba(255,214,232,.12)",
      borderRadius: 24,
      padding: 22,
      ...style,
    }}
  >
    {children}
  </section>
);

export const Wrap: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ width: 412, padding: "24px 16px 80px", color: P.fg, fontFamily: T, lineHeight: 1.55 }}>{children}</div>
);

const InfoBtn: React.FC<{ gold?: boolean }> = ({ gold }) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: 22,
      height: 22,
      borderRadius: "50%",
      background: gold ? "rgba(242,199,110,.15)" : "rgba(255,79,163,.15)",
      border: `1px solid ${gold ? "rgba(242,199,110,.4)" : "rgba(255,109,180,.35)"}`,
      color: gold ? P.gold : P.accentSoft,
      font: `800 11px/1 ${T}`,
      flex: "0 0 auto",
    }}
  >
    i
  </span>
);

const Chevron: React.FC<{ open: number; color?: string }> = ({ open, color }) => (
  <span
    style={{
      marginLeft: "auto",
      flex: "0 0 auto",
      fontSize: 14,
      lineHeight: 1,
      color: color ?? (open > 0.5 ? P.accentSoft : P.muted),
      transform: `rotate(${open * 180}deg)`,
      display: "inline-block",
    }}
  >
    ▾
  </span>
);

/* ---------- alumnos.html: encabezado y plan ---------- */
export const TopBar: React.FC<{ name?: string }> = ({ name = "Alumna" }) => (
  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 22 }}>
    <div>
      <span style={{ font: `400 15px/1 ${D}`, letterSpacing: ".14em", color: P.muted }}>YOHI COACH · ZONA ALUMNOS</span>
      <p style={{ font: `400 32px/1.25 ${fonts.script}`, color: P.accentText, paddingRight: 8, margin: 0 }}>Hola, {name}</p>
    </div>
    <Btn small ghost>
      Cerrar sesión
    </Btn>
  </div>
);

export const PlanCard: React.FC = () => (
  <Card style={{ marginBottom: 16 }}>
    <p style={{ margin: "0 0 12px" }}>
      <Chip>Asesoría online</Chip>
    </p>
    <div style={{ font: `400 28px/1.1 ${D}`, letterSpacing: ".02em", textTransform: "uppercase", margin: "0 0 6px" }}>Asesoría online</div>
    <p style={{ margin: "0 0 12px", fontSize: 14 }}>
      Del <strong>12 oct 2026</strong> al <strong>12 nov 2026</strong> · <Chip gold>31 días</Chip>
    </p>
  </Card>
);

/* ---------- index.html: ventana "Zona alumnos" ---------- */
export const LoginDialog: React.FC<{
  email: string;
  passLen: number;
  focus: "email" | "pass" | null;
  caret: boolean;
  btnGlow: number;
  btnPress: number;
  children?: React.ReactNode;
}> = ({ email, passLen, focus, caret, btnGlow, btnPress, children }) => {
  const field = (label: string, value: React.ReactNode, active: boolean, ph: string, eye?: boolean) => (
    <div style={{ display: "grid", gap: 6, font: `700 13px/1 ${T}`, color: P.accentSoft }}>
      <span>{label}</span>
      <div
        style={{
          position: "relative",
          minHeight: 48,
          padding: "0 16px",
          borderRadius: 16,
          border: `1.5px solid ${active ? P.accent : "rgba(255,214,232,.18)"}`,
          background: "rgba(255,255,255,.05)",
          boxShadow: active ? "0 0 0 3px rgba(255,79,163,.28)" : "none",
          display: "flex",
          alignItems: "center",
          font: `500 16px/1 ${T}`,
          color: P.fg,
          whiteSpace: "nowrap",
          overflow: "hidden",
        }}
      >
        {value === "" ? <span style={{ color: "rgba(167,167,167,.7)" }}>{ph}</span> : value}
        {active && caret && <span style={{ width: 2, height: 20, background: P.accent, marginLeft: 2 }} />}
        {eye && (
          <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke={P.muted} strokeWidth={2} strokeLinecap="round" style={{ position: "absolute", right: 16 }}>
            <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </div>
    </div>
  );
  return (
    <div
      style={{
        width: 388,
        margin: "0 auto",
        background: "#191919",
        border: "1px solid rgba(255,214,232,.16)",
        borderRadius: 28,
        boxShadow: "0 40px 90px -30px rgba(0,0,0,.9), 0 0 0 1px rgba(255,79,163,.18)",
        padding: "28px 24px 24px",
        position: "relative",
        color: P.fg,
        fontFamily: T,
      }}
    >
      <p style={{ margin: "0 0 4px", font: `800 11px/1 ${T}`, letterSpacing: ".16em", textTransform: "uppercase", color: P.accentText }}>Zona alumnos</p>
      <h2 style={{ margin: "0 44px 6px 0", font: `400 28px/1.05 ${D}`, letterSpacing: ".02em", textTransform: "uppercase" }}>Tu proceso, tu progreso</h2>
      <p style={{ margin: "0 0 18px", fontSize: 14, lineHeight: 1.5, color: P.muted }}>Entra a tu espacio para ver tu plan, tus mediciones y tu avance.</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, padding: 4, marginBottom: 18, borderRadius: 999, background: "rgba(255,255,255,.06)" }}>
        <div style={{ minHeight: 44, borderRadius: 999, background: P.accent, color: P.onAccent, font: `800 14px/1 ${T}`, display: "grid", placeItems: "center" }}>Ingresar</div>
        <div style={{ minHeight: 44, borderRadius: 999, color: P.muted, font: `800 14px/1 ${T}`, display: "grid", placeItems: "center" }}>Crear cuenta</div>
      </div>
      <div style={{ display: "grid", gap: 12 }}>
        {field("Correo", email, focus === "email", "tucorreo@ejemplo.cl")}
        {field("Clave", passLen ? "•".repeat(passLen) : "", focus === "pass", "Tu clave", true)}
        <Btn glow={btnGlow} press={btnPress} style={{ width: "100%", marginTop: 2 }}>
          Ingresar
          {children}
        </Btn>
      </div>
    </div>
  );
};

/* ---------- training.js ---------- */
export const TrainingHead: React.FC = () => (
  <>
    <h2 style={{ margin: "0 0 8px", font: `400 22px/1.2 ${D}`, letterSpacing: ".03em", textTransform: "uppercase" }}>Mi rutina</h2>
    <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
      <div style={{ minHeight: 44, padding: "0 14px", borderRadius: 999, background: P.accent, color: P.onAccent, border: `1.5px solid ${P.accent}`, font: `700 13px/1 ${T}`, display: "grid", placeItems: "center" }}>
        12 oct
      </div>
    </div>
    <p style={{ margin: "0 0 6px", color: P.muted }}>
      Semana del <strong>12 oct 2026</strong>
    </p>
  </>
);

export const Progress: React.FC<{ done: number; total: number }> = ({ done, total }) => {
  const pct = total ? (done / total) * 100 : 0;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ font: `800 12px/1 ${T}`, letterSpacing: ".06em", textTransform: "uppercase", color: P.accentSoft }}>Progreso</span>
        <span style={{ font: `800 12px/1 ${T}`, color: P.muted }}>
          {done}/{total} ejercicios
        </span>
      </div>
      <div style={{ height: 8, borderRadius: 999, background: "rgba(255,255,255,.08)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, borderRadius: 999, background: pct === 100 ? P.accent : P.gold }} />
      </div>
    </div>
  );
};

const mmss = (s: number) => `${Math.floor(s / 60) < 10 ? "0" : ""}${Math.floor(s / 60)}:${s % 60 < 10 ? "0" : ""}${s % 60}`;

/** Temporizador de descanso (dorado, como en el portal). `bounce` = 0..1 fase del salto de Yohi. */
export const TimerCard: React.FC<{
  remaining: number;
  state: "idle" | "running" | "done";
  bounce?: number;
  startGlow?: number;
  startPress?: number;
  ringPulse?: number;
  children?: React.ReactNode;
}> = ({ remaining, state, bounce = 0, startGlow = 0, startPress = 1, ringPulse = 0, children }) => {
  const running = state === "running";
  const done = state === "done";
  const gold = (a: number) => `rgba(242,199,110,${a})`;
  const unit = (t: string) => <span style={{ font: `600 10px/1 ${T}`, color: P.muted, textTransform: "uppercase" }}>{t}</span>;
  const box = (v: string) => (
    <div style={{ width: 52, minHeight: 36, display: "grid", placeItems: "center", borderRadius: 12, border: `1.5px solid ${gold(0.3)}`, background: gold(0.06), color: P.goldLight, font: `700 15px/1 ${T}` }}>{v}</div>
  );
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, position: "relative" }}>
      <Img
        src={staticFile("yohi-timer.webp")}
        style={{
          height: 128,
          width: (128 * 428) / 520,
          objectFit: "contain",
          flex: "0 0 auto",
          filter: "drop-shadow(0 0 12px rgba(255,79,163,.35))",
          transform: `translateY(${running ? -6 * bounce : 0}px)`,
        }}
      />
      <div
        style={{
          flex: 1,
          minWidth: 0,
          background: gold(0.06),
          border: `2px solid ${done ? P.accent : running ? gold(0.7) : gold(0.35)}`,
          borderRadius: 20,
          padding: 14,
          transform: `scale(${1 + ringPulse * 0.015})`,
          boxShadow: done
            ? "0 0 50px -8px rgba(255,79,163,.4)"
            : running
              ? `0 0 50px -8px ${gold(0.35)}, inset 0 0 30px -15px ${gold(0.08)}`
              : `0 0 30px -10px ${gold(0.2)}, inset 0 0 30px -15px ${gold(0.05)}`,
        }}
      >
        <div style={{ font: `800 10px/1 ${T}`, letterSpacing: ".1em", textTransform: "uppercase", color: P.gold, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
          <Em t="⏱" s={1.1} /> TEMPORIZADOR
        </div>
        <div style={{ font: `400 41px/1 ${D}`, letterSpacing: ".02em", color: P.goldLight, fontVariantNumeric: "tabular-nums", marginBottom: 10, whiteSpace: "nowrap" }}>
          {done ? <span style={{ color: P.accent }}>¡A entrenar!</span> : mmss(remaining)}
        </div>
        {state === "idle" && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
            {box("1")}
            {unit("min")}
            <span style={{ color: P.gold, font: `700 16px/1 ${T}` }}>:</span>
            {box("30")}
            {unit("seg")}
          </div>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          {!done && !running && (
            <div style={{ position: "relative", flex: 1, minHeight: 40, borderRadius: 999, background: P.gold, color: "#0B0B0B", font: `800 12px/1 ${T}`, letterSpacing: ".06em", textTransform: "uppercase", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transform: `scale(${startPress})`, boxShadow: `0 6px 20px -6px ${gold(0.5)}${startGlow > 0 ? `, 0 0 ${30 * startGlow}px ${8 * startGlow}px ${gold(0.7 * startGlow)}` : ""}` }}>
              <svg viewBox="0 0 24 24" width={12} height={12} fill="#0B0B0B"><path d="M6 4l14 8-14 8z" /></svg>
              Iniciar
              {children}
            </div>
          )}
          {running && (
            <div style={{ flex: 1, minHeight: 40, borderRadius: 999, background: gold(0.15), border: `1.5px solid ${gold(0.3)}`, color: P.gold, font: `800 12px/1 ${T}`, letterSpacing: ".06em", textTransform: "uppercase", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <svg viewBox="0 0 24 24" width={12} height={12} fill={P.gold}><path d="M6 4h4v16H6zM14 4h4v16h-4z" /></svg>
              Pausa
            </div>
          )}
          {(running || done) && (
            <div style={{ flex: "0 0 40px", width: 40, minHeight: 40, borderRadius: 999, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", color: P.muted, display: "grid", placeItems: "center" }}>
              <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke={P.muted} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5" /></svg>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/** Bloque "Día N" desplegable (details). `open` 0..1 anima la altura. */
export const DayGroup: React.FC<{ name: string; count: string; allDone?: boolean; open: number; children?: React.ReactNode }> = ({
  name,
  count,
  allDone,
  open,
  children,
}) => (
  <div
    style={{
      border: `1px solid ${open > 0.5 ? "rgba(255,109,180,.35)" : "rgba(255,214,232,.14)"}`,
      borderRadius: 18,
      background: "rgba(255,255,255,.02)",
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px" }}>
      <span style={{ flex: 1, minWidth: 0, font: `400 24px/1.1 ${D}`, letterSpacing: ".02em", textTransform: "uppercase" }}>{name}</span>
      <span
        style={{
          font: `800 11px/1 ${T}`,
          letterSpacing: ".04em",
          color: allDone ? P.green : P.muted,
          background: allDone ? P.greenSoft : undefined,
          padding: "6px 10px",
          borderRadius: 999,
          border: `1px solid ${allDone ? "rgba(74,222,128,.4)" : "rgba(255,214,232,.15)"}`,
          whiteSpace: "nowrap",
        }}
      >
        {count}
      </span>
      <Chevron open={open} />
    </div>
    <div style={{ display: "grid", gridTemplateRows: `${open}fr` }}>
      <div style={{ overflow: "hidden", minHeight: 0, padding: "0 16px" }}>{children}</div>
    </div>
    <div style={{ height: open > 0.01 ? 6 : 0 }} />
  </div>
);

export type SetVals = { kg: string; reps: string; rir: string; focus?: "kg" | "reps" | "rir" | null };

const SetInput: React.FC<{ v: string; active?: boolean; caret?: boolean }> = ({ v, active, caret }) => (
  <div
    style={{
      minHeight: 40,
      padding: "0 4px",
      borderRadius: 12,
      border: `1.5px solid ${active ? P.accent : "rgba(255,214,232,.15)"}`,
      background: "rgba(255,255,255,.04)",
      boxShadow: active ? "0 0 0 3px rgba(255,79,163,.25)" : "none",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      font: `600 14px/1 ${T}`,
      fontVariantNumeric: "tabular-nums",
      color: P.fg,
    }}
  >
    {v === "" ? <span style={{ color: "rgba(167,167,167,.55)" }}>—</span> : v}
    {active && caret && <span style={{ width: 2, height: 17, background: P.accent, marginLeft: 1 }} />}
  </div>
);

const colRow = "36px 1fr 1fr 1fr 1fr";

/** Ejercicio con su tabla de series (training.js buildExercise). */
export const ExerciseCard: React.FC<{
  idx: number;
  name: string;
  sets: number;
  reps: string;
  rest: number;
  open: number;
  enter?: number;
  first?: boolean;
  badge?: "none" | "partial" | "done";
  badgeText?: string;
  rows?: SetVals[];
  caret?: boolean;
  obs?: string;
  obsFocus?: boolean;
  saveGlow?: number;
  savePress?: number;
  saved?: number;
  vol?: number | null;
  metaEmph?: number;
  compact?: boolean;
  tap?: React.ReactNode;
}> = ({
  idx,
  name,
  sets,
  reps,
  rest,
  open,
  enter = 1,
  first,
  badge = "none",
  badgeText,
  rows = [],
  caret = true,
  obs = "",
  obsFocus,
  saveGlow = 0,
  savePress = 1,
  saved = 0,
  vol = null,
  metaEmph = 0,
  compact = false,
  tap,
}) => {
  const bs =
    badge === "done"
      ? { bg: P.greenSoft, bd: "rgba(74,222,128,.5)", c: P.green }
      : badge === "partial"
        ? { bg: "rgba(255,79,163,.12)", bd: P.accent, c: P.accentSoft }
        : { bg: "transparent", bd: "rgba(255,214,232,.2)", c: P.muted };
  const text = badge === "done" ? "✓" : (badgeText ?? String(idx));
  return (
    <div
      style={{
        padding: first ? "2px 0 14px" : "14px 0",
        borderTop: first ? "none" : "1px solid rgba(255,214,232,.1)",
        opacity: enter,
        transform: `translateY(${(1 - enter) * 22}px)`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ flex: "0 0 auto", width: 36, height: 36, borderRadius: "50%", display: "grid", placeItems: "center", font: `800 12px/1 ${T}`, border: `2px solid ${bs.bd}`, background: bs.bg, color: bs.c }}>{text}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", font: `700 15px/1.3 ${T}` }}>{name}</span>
          <span
            style={{
              display: "block",
              fontSize: 12.5 + metaEmph * 8,
              fontWeight: metaEmph > 0.5 ? 800 : 400,
              color: metaEmph > 0.5 ? P.accentSoft : P.muted,
              marginTop: 2,
              whiteSpace: "nowrap",
            }}
          >
            {sets}×{reps} · {rest}s desc
          </span>
          {open < 0.5 && <span style={{ fontSize: 11, color: P.accentText, opacity: 0.7, marginTop: 3, display: "block" }}>Toca para registrar</span>}
        </div>
        <Chevron open={open} />
      </div>
      <div style={{ display: "grid", gridTemplateRows: `${open}fr` }}>
        <div style={{ overflow: "hidden", minHeight: 0 }}>
          <div style={{ display: "grid", gridTemplateColumns: colRow, gap: 4, alignItems: "center", paddingBottom: 8, margin: "14px 0 4px", borderBottom: "1px solid rgba(255,214,232,.08)", font: `800 10px/1 ${T}`, letterSpacing: ".06em", textTransform: "uppercase", color: P.accentSoft, whiteSpace: "nowrap" }}>
            <span>Serie</span>
            <span style={{ display: "flex", alignItems: "center", gap: 3 }}>KG <InfoBtn /></span>
            <span style={{ display: "flex", alignItems: "center", gap: 3 }}>Reps <InfoBtn /></span>
            <span style={{ display: "flex", alignItems: "center", gap: 3 }}>RIR <InfoBtn /></span>
            <span style={{ display: "flex", alignItems: "center", gap: 3, justifyContent: "center" }}>Desc <InfoBtn /></span>
          </div>
          {new Array(sets).fill(0).map((_, i) => {
            const r = rows[i] ?? { kg: "", reps: "", rir: "" };
            return (
              <div key={i} style={{ display: "grid", gridTemplateColumns: colRow, gap: 4, alignItems: "center", padding: "8px 0", borderBottom: "1px solid rgba(255,214,232,.05)" }}>
                <span style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,79,163,.1)", border: "1.5px solid rgba(255,109,180,.3)", display: "grid", placeItems: "center", font: `800 13px/1 ${T}`, color: P.accentSoft, justifySelf: "center" }}>{i + 1}</span>
                <SetInput v={r.kg} active={r.focus === "kg"} caret={caret} />
                <SetInput v={r.reps} active={r.focus === "reps"} caret={caret} />
                <SetInput v={r.rir} active={r.focus === "rir"} caret={caret} />
                <span style={{ textAlign: "center", fontSize: 13, color: P.muted, fontWeight: 600 }}>{rest}s</span>
              </div>
            );
          })}
          {!compact && (<>
          <div style={{ display: "grid", gap: 6, marginTop: 12 }}>
            <span style={{ font: `700 12px/1 ${T}`, color: P.accentSoft }}><Em t="📝" s={1.1} /> Observaciones para Yohi</span>
            <div style={{ minHeight: 64, padding: "10px 12px", borderRadius: 12, border: `1.5px solid ${obsFocus ? P.accent : "rgba(255,214,232,.15)"}`, boxShadow: obsFocus ? "0 0 0 3px rgba(255,79,163,.25)" : "none", background: "rgba(255,255,255,.04)", font: `500 14px/1.4 ${T}`, color: P.fg }}>
              {obs === "" ? <span style={{ color: "rgba(167,167,167,.55)" }}>Cómo te sentiste, molestias, cambios que hiciste…</span> : obs}
              {obsFocus && caret && <span style={{ display: "inline-block", width: 2, height: 16, background: P.accent, marginLeft: 1, verticalAlign: "-3px" }} />}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
            <Btn small glow={saveGlow} press={savePress}>
              Guardar
              {tap}
            </Btn>
            <span style={{ fontSize: 13, fontWeight: 700, color: P.accentSoft, opacity: saved }}>✓ Guardado</span>
          </div>
          <div style={{ marginTop: 8, minHeight: 28 }}>
            {vol !== null && vol > 0 && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 999, font: `800 12px/1 ${T}`, background: "rgba(255,79,163,.12)", border: "1px solid rgba(255,109,180,.35)", color: P.accentSoft }}>
                <InfoBtn /> Vol: <strong style={{ fontVariantNumeric: "tabular-nums" }}>{Math.round(vol)} kg</strong>
              </span>
            )}
          </div>
          </>)}
        </div>
      </div>
    </div>
  );
};
