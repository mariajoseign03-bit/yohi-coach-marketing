import React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { clamp, easeOut, keys } from "../anim";
import { colors } from "../theme";

export const SW = 538; // ancho de pantalla en px de video
export const SH = 1166;
export const BEZEL = 14;
export const CSS_W = 430; // ancho CSS de las capturas (viewport móvil)
export const K = SW / CSS_W;

export type Box = [number, number, number, number]; // x, y, w, h en px CSS de la captura
export type Hi = { box: Box; from: number; to: number; pad?: number };
export type Tap = { at: number; x: number; y: number };
export type Layer = {
  src: string; from: number; to: number; imgH: number; // alto de la captura en px CSS
  cam: Array<[number, number, number, number]>; // [frame, escala, x0, y0] (x0,y0: px CSS visibles arriba-izquierda)
  hi?: Hi[]; taps?: Tap[]; tabbar?: string; fadeIn?: number; fadeOut?: number; dim?: boolean;
};

const Ripple: React.FC<{ tap: Tap; f: number; s: number }> = ({ tap, f, s }) => {
  const t = f - tap.at;
  if (t < 0 || t > 20) return null;
  const p = t / 20;
  return (
    <div style={{ position: "absolute", left: tap.x * K - 40, top: tap.y * K - 40, width: 80, height: 80, borderRadius: "50%", border: `${5 / s}px solid ${colors.rosa}`, background: `${colors.rosa}55`, transform: `scale(${(0.4 + p * 1.6) / s})`, opacity: 1 - p, boxShadow: `0 0 30px ${colors.rosa}` }} />
  );
};

const LayerView: React.FC<{ L: Layer; f: number }> = ({ L, f }) => {
  const local = f - L.from;
  const dur = L.to - L.from;
  if (f < L.from - 1 || f > L.to + 1) return null;
  const fin = L.fadeIn ?? 8, fout = L.fadeOut ?? 8;
  const oi = fin ? interpolate(f, [L.from, L.from + fin], [0, 1], clamp) : 1;
  const oo = fout ? interpolate(f, [L.to - fout, L.to], [1, 0], clamp) : 1;
  const opacity = Math.min(oi, oo);
  const scale = keys(f, L.cam.map((c) => [c[0], c[1]] as [number, number]));
  let x0 = keys(f, L.cam.map((c) => [c[0], c[2]] as [number, number]));
  let y0 = keys(f, L.cam.map((c) => [c[0], c[3]] as [number, number]));
  x0 = Math.max(0, Math.min(x0, CSS_W - CSS_W / scale));
  y0 = Math.max(0, Math.min(y0, L.imgH - (SH / K) / scale));
  const push = 1 + (1 - opacity) * 0.04; // micro empuje al entrar/salir
  return (
    <AbsoluteFill style={{ opacity, transform: `scale(${push})` }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: SW, transformOrigin: "0 0", transform: `translate(${-x0 * K * scale}px, ${-y0 * K * scale}px) scale(${scale})` }}>
        <Img src={staticFile(`portal/${L.src}.png`)} style={{ width: SW, display: "block" }} />
        {L.hi?.map((h, i) => {
          const pad = h.pad ?? 6;
          const [x, y, w, hh] = h.box;
          const p = interpolate(f, [h.from, h.from + 10, h.to - 6, h.to], [0, 1, 1, 0], { ...clamp, easing: easeOut });
          if (p <= 0) return null;
          const pulse = 1 + Math.sin((f - h.from) / 4) * 0.012;
          return (
            <div key={i} style={{ position: "absolute", left: (x - pad) * K, top: (y - pad) * K, width: (w + pad * 2) * K, height: (hh + pad * 2) * K, borderRadius: 28 / scale, opacity: p, transform: `scale(${pulse})`, border: `${4 / scale}px solid ${colors.rosa}`, boxShadow: `0 0 ${26 / scale}px ${colors.rosa}, inset 0 0 ${22 / scale}px ${colors.rosa}55, 0 0 0 4000px rgba(0,0,0,${L.dim === false ? 0 : 0.5 * p})` }} />
          );
        })}
        {L.taps?.map((t, i) => <Ripple key={i} tap={t} f={f} s={scale} />)}
      </div>
      {L.tabbar && (
        <Img src={staticFile(`portal/${L.tabbar}.png`)} style={{ position: "absolute", left: 0, bottom: 0, width: SW }} />
      )}
      <span style={{ display: "none" }}>{local + dur}</span>
    </AbsoluteFill>
  );
};

/** Celular con marco, isla y brillo rosa. La pantalla muestra capturas reales con cámara (zoom/scroll). */
export const Phone: React.FC<{ layers: Layer[]; tilt: { x: number; y: number }; offsetY: number; opacity: number; scale: number }> = ({ layers, tilt, offsetY, opacity, scale }) => {
  const f = useCurrentFrame();
  const float = Math.sin(f / 22) * 6;
  const sway = Math.sin(f / 40) * 2.2;
  return (
    <div style={{ position: "absolute", left: (1080 - (SW + BEZEL * 2)) / 2, top: 474, width: SW + BEZEL * 2, height: SH + BEZEL * 2, perspective: 1800, opacity, transform: `translateY(${offsetY + float}px) scale(${scale})` }}>
      <div style={{ position: "absolute", inset: -90, borderRadius: 160, background: `radial-gradient(circle, ${colors.rosa}55 0%, transparent 70%)`, filter: "blur(24px)" }} />
      <div style={{ position: "absolute", inset: 0, borderRadius: 88, background: "#0b0b0c", border: "2px solid #34343a", boxShadow: `0 0 0 2px #1a1a1d, 0 0 70px ${colors.rosa}66, 0 40px 90px rgba(0,0,0,.65)`, transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y + sway}deg)`, transformStyle: "preserve-3d" }}>
        <div style={{ position: "absolute", left: BEZEL, top: BEZEL, width: SW, height: SH, borderRadius: 74, overflow: "hidden", background: "#0a0a0a" }}>
          {layers.map((L, i) => <LayerView key={i} L={L} f={f} />)}
          <div style={{ position: "absolute", left: "50%", top: 12, width: 120, height: 34, marginLeft: -60, borderRadius: 20, background: "#000" }} />
        </div>
        <div style={{ position: "absolute", inset: 0, borderRadius: 88, background: "linear-gradient(115deg, rgba(255,255,255,.14) 0%, transparent 22%, transparent 75%, rgba(255,79,163,.10) 100%)", pointerEvents: "none" }} />
      </div>
    </div>
  );
};
