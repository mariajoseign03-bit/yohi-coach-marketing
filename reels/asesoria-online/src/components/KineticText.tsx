import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { colors } from "../theme";
import { clamp, easeInOut, isEmoji, pop } from "./anim";
import { EmojiText } from "./EmojiText";

type Props = {
  text: string;
  resaltar?: string[];
  delay?: number;
  stagger?: number;
  fontFamily: string;
  fontSize: number;
  fontWeight?: number;
  color?: string;
  lineHeight?: number;
  /** Barrido de luz que recorre el texto despues de entrar. */
  sweep?: boolean;
  style?: React.CSSProperties;
  letterSpacing?: string;
};

/** Tipografia cinetica: palabra por palabra, con rebote, blur y barrido de luz. */
export const KineticText: React.FC<Props> = ({
  text,
  resaltar = [],
  delay = 0,
  stagger = 5,
  fontFamily,
  fontSize,
  fontWeight = 400,
  color = colors.blanco,
  lineHeight = 1.05,
  sweep = true,
  style,
  letterSpacing,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = text.split(" ");
  const sweepStart = delay + words.length * stagger + 6;
  // Cada emoji viaja pegado a la palabra anterior (nunca queda solo en una linea).
  const groups: number[][] = [];
  words.forEach((w, i) => {
    if (isEmoji(w) && groups.length) groups[groups.length - 1].push(i);
    else groups.push([i]);
  });

  return (
    <div
      style={{
        fontFamily,
        fontSize,
        fontWeight,
        lineHeight,
        textAlign: "center",
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        columnGap: fontSize * 0.26,
        letterSpacing,
        ...style,
      }}
    >
      {groups.map((g) => (
        <span
          key={g[0]}
          style={{
            display: "inline-flex",
            whiteSpace: "nowrap",
            columnGap: fontSize * 0.22,
          }}
        >
          {g.map((i) => renderWord(words[i], i))}
        </span>
      ))}
    </div>
  );

  function renderWord(w: string, i: number) {
    const p = pop(frame, fps, delay + i * stagger, 11, 0.6);
    const isHi = resaltar.includes(w);
    const base = isHi ? colors.rosaTexto : color;
    const sweepPos = interpolate(
      frame,
      [sweepStart + i * 2, sweepStart + i * 2 + 22],
      [-60, 160],
      {
        ...clamp,
        easing: easeInOut,
      },
    );
    const wordStyle: React.CSSProperties = {
      display: "inline-block",
      opacity: interpolate(p, [0, 0.4], [0, 1], clamp),
      translate: `0px ${interpolate(p, [0, 1], [fontSize * 0.7, 0])}px`,
      scale: String(interpolate(p, [0, 1], [0.6, 1])),
      filter: `blur(${interpolate(p, [0, 0.8], [10, 0], clamp)}px) drop-shadow(0 0 ${
        isHi ? 8 : 10
      }px ${isHi ? "rgba(0,0,0,0.6)" : "rgba(255,79,163,0.35)"})`,
    };
    if (isEmoji(w) || !sweep) {
      return (
        <span key={i} style={{ ...wordStyle, color: base }}>
          <EmojiText text={w} scale={0.92} />
        </span>
      );
    }
    const shine = isHi ? "#FF8CC4" : colors.rosaSuave;
    return (
      <span
        key={i}
        style={{
          ...wordStyle,
          color: "transparent",
          backgroundImage: `linear-gradient(105deg, ${base} 0%, ${base} ${sweepPos - 18}%, ${shine} ${sweepPos}%, ${base} ${
            sweepPos + 18
          }%, ${base} 100%)`,
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          paddingBottom: fontSize * 0.04,
        }}
      >
        {w}
      </span>
    );
  }
};
