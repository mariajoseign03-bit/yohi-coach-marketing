import { Easing, interpolate, spring } from "remotion";

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
export const easeIn = Easing.bezier(0.7, 0, 0.84, 0);
export const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);

/** Spring 0 -> 1 que arranca en `delay`. */
export const pop = (frame: number, fps: number, delay = 0, damping = 12, mass = 0.7) =>
  spring({ frame: frame - delay, fps, config: { damping, mass, stiffness: 160 } });

/** Spring suave sin rebote. */
export const smooth = (frame: number, fps: number, delay = 0, durationInFrames = 18) =>
  spring({ frame: frame - delay, fps, config: { damping: 200 }, durationInFrames });

/**
 * Entrada tipo "whip" desde la derecha y salida hacia la izquierda, con blur de movimiento.
 * Devuelve estilos para envolver una escena completa.
 */
export const whip = (frame: number, duration: number, enter = 8, exit = 7) => {
  const inP = enter > 0 ? interpolate(frame, [0, enter], [1, 0], { ...clamp, easing: easeOut }) : 0;
  const outP = exit > 0 ? interpolate(frame, [duration - exit, duration], [0, 1], { ...clamp, easing: easeIn }) : 0;
  const x = inP * 420 - outP * 520;
  const blur = inP * 28 + outP * 32;
  return {
    translate: `${x}px 0px`,
    filter: blur > 0.3 ? `blur(${blur}px)` : undefined,
    opacity: interpolate(inP + outP, [0, 1], [1, 0.2], clamp),
  } as const;
};

const EMOJI_RE = /\p{Extended_Pictographic}/u;
export const isEmoji = (word: string) => EMOJI_RE.test(word) && !/[A-Za-zÁÉÍÓÚÑáéíóúñ0-9]/.test(word);
