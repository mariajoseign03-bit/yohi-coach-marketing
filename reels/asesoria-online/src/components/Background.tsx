import React from "react";
import { AbsoluteFill, interpolate, random, useCurrentFrame } from "remotion";
import { colors } from "../theme";

const STAR_PATH = "M0,-50 C4,-12 12,-4 50,0 C12,4 4,12 0,50 C-4,12 -12,4 -50,0 C-12,-4 -4,-12 0,-50 Z";

type Star = { x: number; y: number; size: number; depth: number; phase: number; pink: boolean };

const STARS: Star[] = new Array(22).fill(0).map((_, i) => ({
  x: random(`sx${i}`) * 1080,
  y: random(`sy${i}`) * 1920,
  size: 14 + random(`ss${i}`) * 34,
  depth: [0.35, 0.7, 1.2][i % 3],
  phase: random(`sp${i}`) * Math.PI * 2,
  pink: random(`sc${i}`) > 0.45,
}));

/** Fondo negro vivo: glow rosado que respira, estrellas con parallax y grano sutil. */
export const Background: React.FC = () => {
  const frame = useCurrentFrame();
  const breathe = (Math.sin(frame / 22) + 1) / 2; // 0..1
  const breathe2 = (Math.sin(frame / 31 + 1.7) + 1) / 2;

  return (
    <AbsoluteFill style={{ backgroundColor: colors.negro, overflow: "hidden" }}>
      {/* Glow rosado que respira */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 75% 45% at 50% ${42 + breathe * 6}%, ${colors.rosa}${Math.round(
            40 + breathe * 30,
          )
            .toString(16)
            .padStart(2, "0")} 0%, transparent 70%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at ${10 + breathe2 * 8}% 92%, ${colors.rosa}55 0%, transparent 38%),
                       radial-gradient(circle at ${92 - breathe2 * 8}% 8%, ${colors.rosa}44 0%, transparent 34%)`,
        }}
      />
      {/* Viñeta */}
      <AbsoluteFill
        style={{ background: "radial-gradient(ellipse 85% 70% at 50% 50%, transparent 55%, rgba(0,0,0,0.75) 100%)" }}
      />
      {/* Estrellas de 4 puntas con parallax */}
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        {STARS.map((s, i) => {
          const y = (((s.y - frame * 1.6 * s.depth) % 1920) + 1920) % 1920;
          const x = s.x + Math.sin(frame / 40 + s.phase) * 12 * s.depth;
          const tw = 0.35 + 0.65 * ((Math.sin(frame / 9 + s.phase) + 1) / 2);
          const scale = (s.size / 100) * (0.75 + 0.25 * tw) * s.depth;
          return (
            <path
              key={i}
              d={STAR_PATH}
              transform={`translate(${x} ${y}) scale(${scale}) rotate(${frame * 0.4 * s.depth})`}
              fill={s.pink ? colors.rosa : colors.blanco}
              opacity={tw * (s.depth > 1 ? 0.95 : 0.55)}
              style={{ filter: `drop-shadow(0 0 ${8 * s.depth}px ${colors.rosa})` }}
            />
          );
        })}
      </svg>
      {/* Grano */}
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: 0.07, mixBlendMode: "screen" }}>
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={frame % 12} />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>
      {/* Pulso global sutil */}
      <AbsoluteFill
        style={{
          background: colors.rosa,
          opacity: interpolate(breathe, [0, 1], [0, 0.025]),
          mixBlendMode: "screen",
        }}
      />
    </AbsoluteFill>
  );
};
