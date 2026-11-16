import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";
loadFont({ family: "Anton", url: staticFile("fonts/Anton-latin.woff2"), weight: "400" });
for (const weight of ["500", "700", "800", "900"]) loadFont({ family: "Montserrat", url: staticFile("fonts/Montserrat-latin.woff2"), weight });
export const fonts = { titulo: "Anton, Impact, sans-serif", texto: "Montserrat, system-ui, sans-serif" };
