// Textos en pantalla. `rosa` = palabra(s) que se pintan en rosa YOHI (deben escribirse igual que en el texto).
export type Line = { text: string; rosa?: string[] };

export const copy = {
  kicker: "NUEVO EN YOHICOACH.CL",
  hook: ["DEJA DE", "ENTRENAR", "POR", "ENTRENAR."],
  login: { text: "Ahora tu rutina vive en tu celu 📲", rosa: ["celu"] },
  dias: { text: "Tu rutina por días", rosa: ["días"] },
  pesos: { text: "Anota tus pesos serie a serie", rosa: ["pesos"] },
  timer: { text: "Con temporizador de descanso", rosa: ["descanso"] },
  nota: { text: "¿Algo se sintió raro? Déjale una observación 📝", rosa: ["observación"] },
  yohi: { text: "Y Yohi lo ve todo — y también puede registrar tus pesos", rosa: ["Yohi", "registrar"] },
  cierre: [
    { text: "ENTRENA CON", rosa: [] },
    { text: "PROPÓSITO.", rosa: [] },
    { text: "PROGRESA", rosa: ["PROGRESA", "DE", "VERDAD."] },
    { text: "DE VERDAD.", rosa: ["PROGRESA", "DE", "VERDAD."] },
  ] as Line[],
  cta: "Pide tu cuenta en yohicoach.cl",
  demo: "Pantallas con datos demo · Alumna demo",
};
