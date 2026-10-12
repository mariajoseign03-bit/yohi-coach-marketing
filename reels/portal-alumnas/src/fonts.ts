import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

// Las mismas tipografias del sitio y del portal: Anton (titulos), Montserrat (texto) y Yellowtail
// ("Hola, Alumna"). Archivos oficiales de Google Fonts guardados en public/fonts (render sin conexion).
loadFont({ family: "Anton", url: staticFile("fonts/Anton-latin.woff2"), weight: "400" });
for (const weight of ["500", "600", "700", "800", "900"]) {
  loadFont({ family: "Montserrat", url: staticFile("fonts/Montserrat-latin.woff2"), weight });
}
loadFont({ family: "Yellowtail", url: staticFile("fonts/Yellowtail-Regular.ttf"), weight: "400" });

const emoji = '"Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji"';

export const fonts = {
  titulo: `Anton, Impact, ${emoji}`,
  texto: `Montserrat, system-ui, ${emoji}`,
  script: `Yellowtail, cursive`,
};
