import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { colors } from "../theme";
import { fonts } from "../fonts";
import { clamp, pop } from "./anim";
import { EmojiText } from "./EmojiText";
import type { Line } from "../copy";

const isEmojiWord = (w: string) => /\p{Extended_Pictographic}/u.test(w);

/** Subtitulo grande (Anton, MAYUSCULAS, 1 palabra clave en rosa). Entra palabra por palabra con spring. */
export const Subtitle: React.FC<{ line: Line; top?: number; delay?: number }> = ({ line, top = 268, delay = 2 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = line.text.split(" ");
  const len = line.text.length;
  const size = len <= 30 ? 100 : len <= 46 ? 88 : 76;
  const rosa = (line.rosa ?? []).map((w) => w.toLowerCase());
  return (
    <div
      style={{
        position: "absolute",
        left: 70,
        right: 70,
        top,
        textAlign: "center",
        fontFamily: fonts.titulo,
        fontSize: size,
        lineHeight: 1.04,
        letterSpacing: "0.01em",
        textTransform: "uppercase",
        color: colors.blanco,
        textShadow: "0 6px 30px rgba(0,0,0,.65)",
      }}
    >
      {words.map((w, i) => {
        const p = pop(frame, fps, delay + i * 2.5, 13, 0.6);
        const clean = w.replace(/[¿?¡!.,—]/g, "").toLowerCase();
        const pink = rosa.includes(clean);
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              marginRight: "0.26em",
              color: pink ? colors.rosa : undefined,
              opacity: interpolate(p, [0, 0.4], [0, 1], clamp),
              transform: `translateY(${(1 - p) * 38}px) scale(${0.85 + p * 0.15})`,
              textShadow: pink ? `0 0 34px ${colors.rosa}88, 0 6px 30px rgba(0,0,0,.6)` : undefined,
            }}
          >
            {isEmojiWord(w) ? <EmojiText text={w} scale={0.95} /> : w}
          </span>
        );
      })}
    </div>
  );
};
