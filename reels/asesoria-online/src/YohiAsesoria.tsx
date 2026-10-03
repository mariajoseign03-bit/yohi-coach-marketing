import { Audio } from "@remotion/media";
import React from "react";
import { AbsoluteFill, getStaticFiles, interpolate, Sequence, staticFile, useVideoConfig } from "remotion";
import { Background } from "./components/Background";
import { Phone } from "./components/Phone";
import { Scene1, Scene2, Scene4, Scene5, Scene6, Scene7, Scene8, WhipFlash } from "./scenes/Scenes";
import { sfxVolume as v } from "./theme";
import { app, chat, mostrarPrecio, phone, scenes } from "./timing";

const Sfx: React.FC<{ at: number; file: string; volume: number; name: string }> = ({ at, file, volume, name }) => (
  <Sequence from={at} name={`SFX ${name}`} layout="none">
    <Audio src={staticFile(`sfx/${file}.wav`)} volume={volume} />
  </Sequence>
);

const hasMusic = () => getStaticFiles().some((f) => f.name === "music.mp3");

export const YohiAsesoria: React.FC = () => {
  const { fps, durationInFrames } = useVideoConfig();
  const { s1, s2, s3, s4, s5, s6, s7, s8 } = scenes;

  return (
    <AbsoluteFill>
      <Background />

      {/* ---------- Imagen ---------- */}
      <Sequence name="1 · Gancho" from={s1.from} durationInFrames={s1.duration} premountFor={fps}>
        <Scene1 />
      </Sequence>
      <Sequence name="2 · Asesoría online" from={s2.from} durationInFrames={s2.duration} premountFor={fps}>
        <Scene2 />
      </Sequence>
      <Sequence name="4 · Pills + cuaderno" from={s4.from} durationInFrames={s4.duration} premountFor={fps}>
        <Scene4 />
      </Sequence>
      <Sequence name="Teléfono (2–4)" from={phone.from} durationInFrames={phone.duration} premountFor={fps}>
        <Phone />
      </Sequence>
      <Sequence name="5 · Pizarra" from={s5.from} durationInFrames={s5.duration} premountFor={fps}>
        <Scene5 />
      </Sequence>
      <Sequence name="6 · Seguimiento" from={s6.from} durationInFrames={s6.duration} premountFor={fps}>
        <Scene6 />
      </Sequence>
      {mostrarPrecio && (
        <Sequence name="7 · Precio" from={s7.from} durationInFrames={s7.duration} premountFor={fps}>
          <Scene7 />
        </Sequence>
      )}
      <Sequence name="8 · CTA" from={s8.from} durationInFrames={s8.duration} premountFor={fps}>
        <Scene8 />
      </Sequence>

      {/* Destellos de transicion en cada corte */}
      {[s2.from, s4.from, s5.from, s6.from, ...(mostrarPrecio ? [s7.from] : []), s8.from].map((at) => (
        <Sequence key={at} name="Whip" from={at - 4} durationInFrames={10}>
          <WhipFlash />
        </Sequence>
      ))}

      {/* ---------- Sonido (generado por codigo, sin derechos) ---------- */}
      {/* Escena 1 */}
      <Sfx name="whoosh" at={s1.from} file="whoosh" volume={v.whoosh} />
      <Sfx name="boom" at={s1.from + 12} file="boom" volume={v.boom} />
      {/* Escena 2 */}
      <Sfx name="whoosh" at={s2.from} file="whoosh" volume={v.whoosh} />
      <Sfx name="pop" at={s2.from + 18} file="pop" volume={v.pop} />
      {/* Escena 3: chat */}
      <Sfx name="tap" at={s3.from + chat.msg1Send} file="tap" volume={v.tap} />
      <Sfx name="escribiendo" at={s3.from + chat.yohiTyping[0]} file="typing" volume={v.typing} />
      <Sfx name="ding" at={s3.from + chat.msg2} file="ding" volume={v.ding} />
      <Sfx name="tap" at={s3.from + chat.msg3Send} file="tap" volume={v.tap} />
      {/* Escena 4: app + pills con tono que sube */}
      <Sfx name="whoosh corto" at={s4.from} file="whoosh_short" volume={v.whooshShort} />
      <Sfx name="whoosh corto" at={s4.from + app.registro} file="whoosh_short" volume={v.whooshShort * 0.7} />
      <Sfx name="whoosh corto" at={s4.from + app.foto} file="whoosh_short" volume={v.whooshShort * 0.7} />
      <Sfx name="pop 1" at={s4.from + app.pills[0]} file="pop1" volume={v.pop} />
      <Sfx name="pop 2" at={s4.from + app.pills[1]} file="pop2" volume={v.pop} />
      <Sfx name="pop 3" at={s4.from + app.pills[2]} file="pop3" volume={v.pop} />
      <Sfx name="pop 4" at={s4.from + app.pills[3]} file="pop4" volume={v.pop} />
      {/* Escena 5 */}
      <Sfx name="whoosh" at={s5.from} file="whoosh" volume={v.whoosh} />
      <Sfx name="click" at={s5.from + 20} file="click" volume={v.click} />
      {/* Escena 6 */}
      <Sfx name="shimmer" at={s6.from + 6} file="shimmer" volume={v.shimmer} />
      {/* Escena 7 */}
      {mostrarPrecio && <Sfx name="click" at={s7.from + 2} file="click" volume={v.click} />}
      {mostrarPrecio && <Sfx name="cha-ching" at={s7.from + 10} file="chaching" volume={v.chaching} />}
      {/* Escena 8 */}
      <Sfx name="brillo" at={s8.from + 2} file="sparkle" volume={v.sparkle} />
      <Sfx name="sello" at={s8.from + 26} file="stamp" volume={v.stamp} />
      <Sfx name="brillo" at={s8.from + 52} file="sparkle" volume={v.sparkle * 0.8} />

      {/* Musica opcional: public/music.mp3 al 25% con fade out */}
      {hasMusic() && (
        <Audio
          src={staticFile("music.mp3")}
          volume={(f) =>
            v.music *
            interpolate(f, [0, 15, durationInFrames - 2 * fps, durationInFrames], [0, 1, 1, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })
          }
        />
      )}
    </AbsoluteFill>
  );
};
