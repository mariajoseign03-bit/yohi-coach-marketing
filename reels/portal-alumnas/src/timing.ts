// Tiempos de cada escena en frames (30 fps). Total 26 s.
export const FPS = 30;
export const s = (sec: number) => Math.round(sec * FPS);

export const scenes = {
  hook: { from: s(0), to: s(2.5) },
  login: { from: s(2.5), to: s(6) },
  dias: { from: s(6), to: s(10) },
  pesos: { from: s(10), to: s(14) },
  timer: { from: s(14), to: s(17) },
  nota: { from: s(17), to: s(20) },
  yohi: { from: s(20), to: s(23) },
  cierre: { from: s(23), to: s(26) },
} as const;

export const TOTAL = s(26);
export const OVERLAP = 8; // frames que cada escena se extiende para que el whip se cruce con la siguiente
