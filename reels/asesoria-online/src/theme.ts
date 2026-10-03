// Colores y medidas de marca Yohi Coach.
// Edita aqui para cambiar la identidad sin tocar las animaciones.

export const colors = {
  negro: "#111111",
  rosa: "#FF4FA3", // fondos, botones, bordes y glow
  rosaTexto: "#EC3A8C", // letras rosadas: un tono mas bajo para que se lean nitidas (contraste 5:1 sobre negro)
  rosaSuave: "#FFD6E8",
  blanco: "#FFFFFF",
  gris: "#8C8C8C",
  // Derivados (usados para fondos de UI del telefono)
  negroProfundo: "#0A0A0A",
  panel: "#1C1C1E",
  panelBorde: "#2A2A2E",
};

export const video = {
  width: 1080,
  height: 1920,
  fps: 30,
  durationInFrames: 35 * 30,
};

// Zonas seguras de historias de Instagram: ningun texto dentro de estas franjas.
export const safe = {
  top: 250,
  bottom: 340,
};

export const sizes = {
  tituloGrande: 150, // Anton
  titulo: 110, // Anton (>= 90)
  texto: 52, // Montserrat (>= 44)
  textoChico: 44, // Montserrat minimo
};

// Volumen de cada efecto (0 a 1). La mezcla final se normaliza en scripts/render.sh.
export const sfxVolume = {
  boom: 0.9,
  whoosh: 0.55,
  whooshShort: 0.35,
  pop: 0.6,
  tap: 0.5,
  ding: 0.55,
  typing: 0.6,
  click: 0.55,
  shimmer: 0.5,
  chaching: 0.7,
  stamp: 0.95,
  sparkle: 0.45,
  music: 0.25,
};
