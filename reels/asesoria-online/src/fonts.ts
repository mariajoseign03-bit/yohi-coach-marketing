import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

// Anton y Montserrat (archivos oficiales de Google Fonts, guardados en public/fonts para que el
// render funcione sin conexion). Montserrat es variable: un solo archivo cubre 500-900.
loadFont({ family: "Anton", url: staticFile("fonts/Anton-latin.woff2"), weight: "400" });
for (const weight of ["500", "700", "800", "900"]) {
  loadFont({ family: "Montserrat", url: staticFile("fonts/Montserrat-latin.woff2"), weight });
}

// Los emojis caen a Noto Color Emoji (fuente del sistema).
const emoji = '"Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji"';

export const fonts = {
  titulo: `Anton, ${emoji}`,
  texto: `Montserrat, ${emoji}`,
};
