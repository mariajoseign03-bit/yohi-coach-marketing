import React from "react";
import { Img, staticFile, useCurrentFrame } from "remotion";
import { colors } from "../theme";

type Props = {
  src: string;
  height?: number;
  width?: number;
  style?: React.CSSProperties;
  /** Intensidad del glow rosado (0..1). */
  glow?: number;
  float?: number;
};

/** Ilustracion de YOHI sin alterar: solo glow rosado, sombra y flotacion. */
export const Character: React.FC<Props> = ({ src, height, width, style, glow = 1, float = 8 }) => {
  const frame = useCurrentFrame();
  const y = Math.sin(frame / 18) * float;
  return (
    <Img
      src={staticFile(src)}
      style={{
        height,
        width,
        position: "absolute",
        translate: `0px ${y}px`,
        filter: `drop-shadow(0 0 ${28 * glow}px ${colors.rosa}${glow > 0.5 ? "bb" : "77"}) drop-shadow(0 30px 40px rgba(0,0,0,0.6))`,
        ...style,
      }}
    />
  );
};
