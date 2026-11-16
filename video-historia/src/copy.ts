// TODO el texto en pantalla vive aquí. Edítalo sin tocar las animaciones.
// Cada título: lista de [texto, ¿rosa?] por línea.
export type Line = Array<[string, boolean?]>;
export const copy = {
  gancho1: [[["NO ES SOLO UN"]], [["PERSONALIZADO.", true]]] as Line[],
  gancho2: [[["TIENES TU PROPIO"]], [["PORTAL.", true]]] as Line[],
  funciones: {
    rutina: [[["RUTINA"]], [["CARGADA", true]]] as Line[],
    // OJO: el chat del portal hoy es Mocca + botón de WhatsApp (no mensajería interna). Título honesto:
    mensajes: [[["ESCRÍBELE"]], [["A ", false], ["YOHI", true]]] as Line[],
    progreso: [[["PROGRESO Y"]], [["REGISTRO DE ", false], ["PESOS", true]]] as Line[],
    notas: [[["NOTAS E"]], [["HITOS", true]]] as Line[],
    ficha: [[["FICHA DE"]], [["SALUD", true]]] as Line[],
    agenda: [[["AGENDA DE"]], [["CLASES", true]]] as Line[],
  },
  sistema: [[["NO ES SOLO UN"]], [["ENTRENAMIENTO."]], [["ES UN SISTEMA", false]], [["COMPLETO.", true]]] as Line[],
  cierre: [[["ENTRENA CON "], ["PROPÓSITO.", true]], [["PROGRESA DE "], ["VERDAD.", true]]] as Line[],
  boton: "ESCRÍBEME →",
  instagram: "@yohi.coach",
  web: "yohicoach.cl",
};
