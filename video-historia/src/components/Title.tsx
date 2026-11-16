import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { Line } from "../copy";
import { clamp, easeIn, easeOut } from "../anim";
import { fonts } from "../fonts";
import { colors } from "../theme";

/** Título en mayúsculas: cada palabra sube con máscara y blur; salida rápida hacia arriba. `dur` en frames. */
export const Title: React.FC<{ lines: Line[]; dur: number; size: number; top?: number; align?: "center" | "left"; exit?: boolean; lead?: number }> = ({
  lines, dur, size, top = 0, align = "center", exit = true, lead = 5,
}) => {
  const f = useCurrentFrame();
  let w = 0;
  const outP = exit ? interpolate(f, [dur - 7, dur], [0, 1], { ...clamp, easing: easeIn }) : 0;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top, display: "flex", flexDirection: "column", alignItems: align === "center" ? "center" : "flex-start", transform: `translateY(${-outP * 70}px)`, opacity: 1 - outP, filter: outP > 0.05 ? `blur(${outP * 14}px)` : undefined }}>
      {lines.map((line, li) => (
        <div key={li} style={{ display: "flex", whiteSpace: "pre", overflow: "hidden", lineHeight: 1.04, paddingBottom: 4 }}>
          {line.map(([txt, pink], wi) => {
            const delay = lead + w++ * 4;
            const p = interpolate(f, [delay, delay + 12], [0, 1], { ...clamp, easing: easeOut });
            return (
              <span key={wi} style={{ display: "inline-block", fontFamily: fonts.titulo, fontSize: size, textTransform: "uppercase", letterSpacing: 1, color: pink ? colors.rosa : colors.blanco, textShadow: pink ? `0 0 34px ${colors.rosa}aa` : "0 6px 24px rgba(0,0,0,.5)", transform: `translateY(${(1 - p) * 110}%)`, opacity: p, filter: p < 1 ? `blur(${(1 - p) * 10}px)` : undefined }}>
                {txt}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};
