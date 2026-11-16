import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { colors } from "../theme";

/** Fondo negro de marca con resplandores rosa que derivan lento y destellos. */
export const Backdrop: React.FC<{ boost?: number }> = ({ boost = 0 }) => {
  const f = useCurrentFrame();
  const a = Math.sin(f / 70) * 90, b = Math.cos(f / 90) * 110;
  return (
    <AbsoluteFill style={{ background: colors.negro, overflow: "hidden" }}>
      <div style={{ position: "absolute", width: 1100, height: 1100, left: -300 + a, top: 120 + b, borderRadius: "50%", background: `radial-gradient(circle, ${colors.rosa}${boost ? "66" : "40"} 0%, transparent 65%)`, filter: "blur(30px)" }} />
      <div style={{ position: "absolute", width: 1000, height: 1000, right: -380 - a, bottom: 60 - b, borderRadius: "50%", background: `radial-gradient(circle, ${colors.rosa}33 0%, transparent 65%)`, filter: "blur(30px)" }} />
      {Array.from({ length: 14 }).map((_, i) => {
        const x = (i * 197) % 1080, y = (i * 331 + f * (0.4 + (i % 3) * 0.25)) % 1920;
        const tw = 0.35 + 0.65 * Math.abs(Math.sin((f + i * 17) / 14));
        return <div key={i} style={{ position: "absolute", left: x, top: y, width: 8, height: 8, background: colors.rosa, opacity: tw * 0.55, transform: "rotate(45deg)", boxShadow: `0 0 18px ${colors.rosa}` }} />;
      })}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55) 100%)" }} />
    </AbsoluteFill>
  );
};
