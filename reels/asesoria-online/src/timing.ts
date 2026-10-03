// Escena 7 (precio): apagada. Cambia a `true` para volver a mostrarla (el video dura 2,7 s mas).
export const mostrarPrecio = false;

const PRECIO = mostrarPrecio ? 80 : 0;

// Inicio y duracion de cada escena, en frames (30 fps).
// Sin precio: 32,3 s = 970 frames. Con precio: 35 s = 1050 frames.
export const scenes = {
  s1: { from: 0, duration: 100 }, // 0 - 3,3 s   gancho
  s2: { from: 100, duration: 100 }, // 3,3 - 6,7 s teléfono
  s3: { from: 200, duration: 240 }, // 6,7 - 14,7 s chat
  s4: { from: 440, duration: 200 }, // 14,7 - 21,3 s app + pills
  s5: { from: 640, duration: 85 }, // 21,3 - 24,2 s técnica
  s6: { from: 725, duration: 120 }, // 24,2 - 28,2 s seguimiento
  s7: { from: 845, duration: PRECIO }, // precio (apagado)
  s8: { from: 845 + PRECIO, duration: 125 }, // CTA
};

export const totalFrames = scenes.s8.from + scenes.s8.duration;

// Teléfono: vive de la escena 2 a la 4 (frames locales dentro de su secuencia).
export const phone = {
  from: scenes.s2.from,
  duration: scenes.s4.from + scenes.s4.duration - scenes.s2.from,
  chatStart: scenes.s3.from - scenes.s2.from, // 100
  appStart: scenes.s4.from - scenes.s2.from, // 340
};

// Chat (frames locales desde el inicio de la escena 3)
export const chat = {
  msg1Type: [8, 32] as const, // tipea en el campo
  msg1Send: 36,
  yohiTyping: [50, 88] as const,
  msg2: 88,
  msg3Type: [148, 170] as const,
  msg3Send: 174,
};

// App (frames locales desde el inicio de la escena 4)
export const app = {
  registro: 55,
  foto: 110,
  pills: [15, 60, 115, 150],
};
