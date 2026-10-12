import React from "react";
import { interpolate, random } from "remotion";
import { colors } from "../theme";
import { clamp, easeOut } from "./anim";

const STAR = "M0,-50 C4,-12 12,-4 50,0 C12,4 4,12 0,50 C-4,12 -12,4 -50,0 C-12,-4 -4,-12 0,-50 Z";

/** Estallido de estrellitas rosa/blancas desde (x,y). `t` = frames desde el inicio del estallido. */
export const SparkleBurst: React.FC<{ x: number; y: number; t: number; seed?: string; radius?: number; n?: number }> = ({
  x,
  y,
  t,
  seed = "b",
  radius = 150,
  n = 9,
}) => {
  if (t < 0 || t > 30) return null;
  const p = interpolate(t, [0, 26], [0, 1], { ...clamp, easing: easeOut });
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {new Array(n).fill(0).map((_, i) => {
        const a = (i / n) * Math.PI * 2 + random(`${seed}a${i}`) * 0.6;
        const r = radius * (0.55 + random(`${seed}r${i}`) * 0.6) * p;
        const size = (0.22 + random(`${seed}s${i}`) * 0.3) * (1 - p * 0.6);
        return (
          <path
            key={i}
            d={STAR}
            transform={`translate(${x + Math.cos(a) * r} ${y + Math.sin(a) * r}) scale(${size}) rotate(${p * 120})`}
            fill={i % 3 === 0 ? colors.blanco : colors.rosa}
            opacity={1 - p * p}
            style={{ filter: `drop-shadow(0 0 8px ${colors.rosa})` }}
          />
        );
      })}
    </svg>
  );
};
