import { Easing, interpolate, spring } from "remotion";
export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
export const easeIn = Easing.bezier(0.7, 0, 0.84, 0);
export const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);
export const pop = (frame: number, fps: number, delay = 0, damping = 12, mass = 0.7) =>
  spring({ frame: frame - delay, fps, config: { damping, mass, stiffness: 160 } });
/** Interpola entre keyframes [frame, valor] con ease in-out. */
export const keys = (frame: number, ks: Array<[number, number]>) =>
  interpolate(frame, ks.map((k) => k[0]), ks.map((k) => k[1]), { ...clamp, easing: easeInOut });
