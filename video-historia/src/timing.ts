// Línea de tiempo (frames a 30 fps). Un solo lugar para ajustar ritmo.
export const fps = 30;
export const s = (sec: number) => Math.round(sec * fps);
export const T = {
  gancho1: [0, s(1.4)],
  gancho2: [s(1.4), s(3)],
  phoneIn: s(2.5),
  home: [s(3), s(4.5)],
  login: [s(4.5), s(6.3)],
  portal: [s(6.3), s(7)],
  // funciones: 7 s -> 26 s, 6 bloques
  rutina: [s(7), s(10.2)],
  mensajes: [s(10.2), s(13.4)],
  progreso: [s(13.4), s(16.6)],
  notas: [s(16.6), s(19.8)],
  ficha: [s(19.8), s(23)],
  agenda: [s(23), s(26)],
  sistema: [s(26), s(28.3)],
  cierre: [s(28.3), s(33)],
  total: s(33),
};
