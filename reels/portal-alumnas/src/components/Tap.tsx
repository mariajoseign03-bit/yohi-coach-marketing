import React from "react";
import { interpolate } from "remotion";
import { clamp, easeOut } from "./anim";
import { portal } from "../theme";

/**
 * Dedo/tap dentro de un boton (position:relative). `f` = frame local; `at` = frame del toque.
 * Aparece desde un desplazamiento, toca (anillo + presion) y se retira.
 */
export const Tap: React.FC<{ f: number; at: number; fromX?: number; fromY?: number }> = ({ f, at, fromX = 90, fromY = 130 }) => {
  const approach = interpolate(f, [at - 16, at], [0, 1], { ...clamp, easing: easeOut });
  const press = interpolate(f, [at, at + 4, at + 9], [1, 0.82, 1], clamp);
  const leave = interpolate(f, [at + 14, at + 24], [0, 1], clamp);
  const vis = interpolate(f, [at - 16, at - 10, at + 16, at + 24], [0, 1, 1, 0], clamp);
  if (vis <= 0) return null;
  const x = (1 - approach) * fromX + leave * 40;
  const y = (1 - approach) * fromY + leave * 60;
  const ring = interpolate(f, [at, at + 16], [0, 1], clamp);
  return (
    <div
      style={{
        position: "absolute",
        left: "80%",
        top: "62%",
        width: 0,
        height: 0,
        zIndex: 30,
        pointerEvents: "none",
        opacity: vis,
      }}
    >
      {ring > 0 && ring < 1 && (
        <div
          style={{
            position: "absolute",
            left: -34 * (0.4 + ring),
            top: -34 * (0.4 + ring),
            width: 68 * (0.4 + ring),
            height: 68 * (0.4 + ring),
            borderRadius: "50%",
            border: `3px solid ${portal.accentSoft}`,
            opacity: 1 - ring,
            boxShadow: `0 0 24px ${portal.accent}`,
          }}
        />
      )}
      <div
        style={{
          position: "absolute",
          left: -17 + x,
          top: -17 + y,
          width: 34,
          height: 34,
          borderRadius: "50%",
          background: "rgba(255,255,255,.88)",
          border: `3px solid ${portal.accent}`,
          boxShadow: "0 6px 18px rgba(0,0,0,.5)",
          transform: `scale(${press})`,
        }}
      />
    </div>
  );
};
