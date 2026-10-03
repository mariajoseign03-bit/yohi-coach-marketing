// TODO el texto del video vive aqui. Edita los textos sin tocar las animaciones.
// `resaltar` = palabras que se pintan en rosa (deben escribirse igual que en el texto).
// Si un texto se alarga mucho, revisa la escena en `npx remotion studio`.

export const copy = {
  handle: "@yohi.coach",

  escena1: {
    titulo: "¿ENTRENAS SIN PLAN?",
    resaltar: ["PLAN?"],
    subtitulo: "Deja de entrenar por entrenar.",
  },

  escena2: {
    titulo: "ASESORÍA ONLINE 1:1",
    resaltar: ["1:1"],
    subtitulo: "Tu coach, desde tu celular 📱",
  },

  chat: {
    nombre: "Yohi Coach 💗",
    estado: "en línea · 8:00 a 20:00 hrs",
    escribiendo: "escribiendo...",
    mensajes: [
      { de: "alumna", texto: "Hola Yohi! Quiero la asesoría online 💗" },
      { de: "yohi", texto: "¡Hola! 🙌 Cuéntame tu objetivo y armamos tu plan" },
      { de: "alumna", texto: "Ganar fuerza y masa muscular 💪" },
    ],
  },

  escena4: {
    plan: {
      titulo: "Mi plan · Semana 1",
      dias: [
        { dia: "Lunes", grupos: "Glúteos · Isquiotibiales" },
        { dia: "Martes", grupos: "Espalda · Bíceps" },
        { dia: "Miércoles", grupos: "Cuádriceps" },
        { dia: "Jueves", grupos: "Pecho · Hombros · Tríceps" },
        { dia: "Viernes", grupos: "Glúteos · Core/Abdomen" },
      ],
    },
    registro: {
      titulo: "Registro",
      ejercicio: "Sentadilla",
      datos: ["4 series", "10 reps", "40 kg"],
      progreso: 60, // porcentaje de la barra
    },
    foto: {
      titulo: "Foto de ejecución",
      check: "Técnica revisada ✔",
    },
    pills: [
      "✨ Plan personalizado",
      "📈 Progresión y seguimiento",
      "🎯 Corrección de técnica",
      "💬 Acompañamiento durante el proceso",
    ],
  },

  escena5: {
    titulo: "Corrección de técnica, paso a paso 🎯",
    resaltar: ["paso", "a", "paso"],
  },

  escena6: {
    titulo: "Seguimiento diario con Yohi 💗",
    resaltar: ["Yohi"],
    badge: "Todos los días, 8:00 a 20:00 hrs",
  },

  escena7: {
    precio: "$45.000",
    periodo: "/ mes",
  },

  escena8: {
    cta: "Escríbeme ASESORÍA por DM 👉",
    resaltar: ["ASESORÍA"],
    boton: "QUIERO MI ASESORÍA",
  },
};
