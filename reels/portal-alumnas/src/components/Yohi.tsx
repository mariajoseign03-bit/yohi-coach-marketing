import React from "react";
import { Img, staticFile } from "remotion";

/** Personaje YOHI (recorte transparente del portal) con halo neon rosa. */
export const Yohi: React.FC<{ height: number; style?: React.CSSProperties; glow?: number }> = ({
  height,
  style,
  glow = 1,
}) => (
  <Img
    src={staticFile("yohi-timer.webp")}
    style={{
      height,
      width: (height * 428) / 520,
      objectFit: "contain",
      filter: `drop-shadow(0 0 ${14 * glow}px rgba(255,79,163,.75)) drop-shadow(0 0 ${40 * glow}px rgba(255,79,163,.35))`,
      ...style,
    }}
  />
);
