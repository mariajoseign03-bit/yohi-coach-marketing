import React from "react";
import { Img, staticFile } from "remotion";

// Emojis estilo iPhone como imagenes (public/emoji/, del paquete emoji-datasource-apple).
// OJO: las imagenes de Apple no tienen licencia para uso comercial (decision aceptada por la marca).
// Para agregar un emoji nuevo: copia su PNG a public/emoji/ y agrega su codigo aqui.
const FILES: Record<string, string> = {
  "1f497": "1f497", // 💗
  "1f4f1": "1f4f1", // 📱
  "1f64c": "1f64c", // 🙌
  "1f4aa": "1f4aa", // 💪
  "2728": "2728", // ✨
  "1f4c8": "1f4c8", // 📈
  "1f3af": "1f3af", // 🎯
  "1f4ac": "1f4ac", // 💬
  "2714": "2714-fe0f", // ✔
  "1f449": "1f449", // 👉
  "26a1": "26a1", // ⚡
  "1f440": "1f440", // 👀
};

const PICTO = /\p{Extended_Pictographic}/u;
const EMOJI_SPLIT = /(\p{Extended_Pictographic}\uFE0F?(?:\u200D\p{Extended_Pictographic}\uFE0F?)*)/u;

const fileFor = (g: string) => {
  const key = Array.from(g)
    .map((c) => c.codePointAt(0)!.toString(16))
    .filter((h) => h !== "fe0f")
    .join("-");
  return FILES[key];
};

/** Texto con emojis reemplazados por imagenes estilo iPhone. `scale` = tamaño del emoji en em. */
export const EmojiText: React.FC<{ text: string; scale?: number }> = ({ text, scale = 1.05 }) => {
  const parts: React.ReactNode[] = [];
  let buf = "";
  let k = 0;
  for (const segment of text.split(EMOJI_SPLIT).filter(Boolean)) {
    const file = PICTO.test(segment) ? fileFor(segment) : undefined;
    if (file) {
      // La ultima palabra antes del emoji va pegada a el (el emoji nunca queda solo en una linea).
      const m = buf.replace(/\s+$/, "").match(/^([\s\S]*\s)?(\S*)$/);
      const before = m?.[1] ?? "";
      const last = m?.[2] ?? "";
      if (before) parts.push(before);
      buf = "";
      parts.push(
        <span key={k++} style={{ whiteSpace: "nowrap" }}>
          {last ? `${last}\u00A0` : null}
          <Img
            src={staticFile(`emoji/${file}.png`)}
            style={{ height: `${scale}em`, width: `${scale}em`, verticalAlign: "-0.16em", display: "inline-block" }}
          />
        </span>,
      );
    } else {
      buf += segment;
    }
  }
  if (buf) parts.push(buf);
  return <>{parts}</>;
};
