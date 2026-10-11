/* Catálogo único de los datos del informe Body Pro Go (Fitdays): nombre, unidad, rango posible y qué significa
   en palabras simples. Fuentes en fuentes/composicion-corporal-bioimpedancia.md. */
(function () {
  // src: dónde vive el dato (core = columna propia, extra = JSON). range: clave del rango que trae el informe.
  // good: +1 si subir es buena noticia, -1 si bajar lo es, 0 si depende (se muestra neutro).
  const M = [
    { key: 'weight_kg', src: 'core', sec: 'peso', label: 'Peso', unit: 'kg', dec: 1, range: 'weight', good: 0, min: 25, max: 250,
      what: 'Todo lo que pesas: músculo, grasa, agua, huesos y órganos. Por sí solo no dice de qué está hecho tu cuerpo; por eso miramos el resto de los datos.' },
    { key: 'muscle_kg', src: 'core', sec: 'magra', label: 'Masa muscular', unit: 'kg', dec: 1, range: 'muscle', good: 1, min: 10, max: 120,
      what: 'Estimación de todo tu músculo, incluida el agua que contiene. El entrenamiento de fuerza progresivo ayuda a aumentarla y mantenerla.' },
    { key: 'skeletal_kg', src: 'extra', sec: 'magra', label: 'Músculo esquelético', unit: 'kg', dec: 1, range: 'skeletal', good: 1, min: 5, max: 80,
      what: 'La parte del músculo que está unida a los huesos y que mueves a voluntad: la que trabajas cuando entrenas.' },
    { key: 'lean_kg', src: 'extra', sec: 'magra', label: 'Peso sin grasa', unit: 'kg', dec: 1, good: 0, min: 15, max: 150,
      what: 'Todo lo que no es grasa: músculo, agua, huesos y órganos.' },
    { key: 'protein_kg', src: 'extra', sec: 'magra', label: 'Proteína corporal', unit: 'kg', dec: 1, range: 'protein', good: 1, min: 2, max: 30,
      what: 'Estimación de cuánto de tu cuerpo es proteína (músculos, órganos). La estima la app con sus propias fórmulas; no es la proteína que comes.' },
    { key: 'water_kg', src: 'extra', sec: 'magra', label: 'Agua corporal', unit: 'kg', dec: 1, range: 'water', good: 0, min: 10, max: 90,
      what: 'El agua total de tu cuerpo. Cambia con lo que tomaste, comiste o sudaste, y esos cambios mueven los demás resultados.' },
    { key: 'bone_kg', src: 'extra', sec: 'magra', label: 'Masa ósea', unit: 'kg', dec: 1, good: 0, min: 0.5, max: 8,
      what: 'Estimación del peso de los minerales de tus huesos. La báscula no mide el hueso directamente; para evaluar la salud ósea se usa una densitometría.' },
    { key: 'fat_kg', src: 'extra', sec: 'grasa', label: 'Grasa corporal', unit: 'kg', dec: 1, range: 'fat', good: -1, min: 1, max: 150,
      what: 'Los kilos de grasa de tu cuerpo. La grasa es necesaria (guarda energía y participa en las hormonas); lo útil es ver cómo cambia en el tiempo.' },
    { key: 'fat_pct', src: 'core', sec: 'grasa', label: 'Porcentaje de grasa', unit: '%', dec: 1, good: -1, min: 2, max: 75,
      what: 'Qué parte de tu peso es grasa. Es más útil que el peso solo, porque separa grasa de músculo.' },
    { key: 'visceral', src: 'extra', sec: 'grasa', label: 'Grasa visceral (nivel)', unit: '', dec: 0, good: -1, min: 1, max: 60,
      what: 'Estimación de la grasa que rodea los órganos dentro del abdomen. La app la entrega como un nivel: más alto es más grasa visceral estimada. Cuando es alta se asocia a más riesgo cardiometabólico; medirla con exactitud requiere exámenes de imagen.' },
    { key: 'subcut_pct', src: 'extra', sec: 'grasa', label: 'Grasa subcutánea', unit: '%', dec: 1, good: -1, min: 1, max: 70,
      what: 'La grasa que está bajo la piel, la que se puede pellizcar. Es una estimación de la app.' },
    { key: 'bmr', src: 'extra', sec: 'meta', label: 'Metabolismo basal', unit: 'kcal', dec: 0, good: 0, min: 600, max: 4500,
      what: 'Energía aproximada que tu cuerpo gasta en un día en reposo total, solo para funcionar (respirar, latir, mantener la temperatura). No es lo que debes comer: tu gasto real es mayor porque te mueves y entrenas.' },
    { key: 'bmi', src: 'extra', sec: 'meta', label: 'IMC', unit: '', dec: 1, good: 0, min: 10, max: 70,
      what: 'Peso dividido por la estatura al cuadrado. Sirve para estudios de población, pero no distingue músculo de grasa: una persona con mucho músculo puede tener un IMC alto.' },
    { key: 'whr', src: 'extra', sec: 'meta', label: 'Relación cintura-cadera', unit: '', dec: 2, good: 0, min: 0.5, max: 1.5,
      what: 'Compara tu cintura con tu cadera. Aquí la estima la app; la medición real se hace con huincha.' },
    { key: 'asmi', src: 'extra', sec: 'meta', label: 'ASMI', unit: 'kg/m²', dec: 1, good: 1, min: 3, max: 15,
      what: 'Músculo de brazos y piernas en relación con tu estatura. Se usa sobre todo en personas mayores para detectar pérdida de músculo.' },
    { key: 'score', src: 'extra', sec: 'meta', label: 'Puntaje corporal', unit: '/100', dec: 0, good: 1, min: 0, max: 150,
      what: 'Puntaje propio de la app que resume tu composición. No es una medida médica; como dice el informe, una persona musculosa puede pasar de 100.' },
    { key: 'body_age', src: 'extra', sec: 'meta', label: 'Edad corporal', unit: 'años', dec: 0, good: 0, min: 10, max: 100,
      what: 'Índice propio de la app; no publica cómo lo calcula. Tómalo como dato curioso, no como diagnóstico.' },
    { key: 'target_kg', src: 'extra', sec: 'meta', label: 'Peso objetivo de la app', unit: 'kg', dec: 1, good: 0, min: 25, max: 200,
      what: 'Un peso que la app calcula con su propia fórmula. No es tu meta: tus objetivos se definen en tu plan con Yohi y, en alimentación, con nutricionista.' },
  ];
  const SECS = [['peso', 'Peso'], ['magra', 'Músculo y masa magra'], ['grasa', 'Grasa corporal'], ['meta', 'Otros indicadores']];
  const get = (m, d) => {
    if (!m) return null;
    const v = d.src === 'core' ? m[d.key] : (m.extra || {})[d.key];
    return typeof v === 'number' && Number.isFinite(v) ? v : null;
  };
  const DISCLAIMER = 'Yohi es preparadora física. Este análisis es una ayuda para entender tu medición y no reemplaza una consulta nutricional ni médica.';
  const BIA_NOTE = 'La báscula usa bioimpedancia: estima tu composición con una corriente eléctrica muy suave. Son estimaciones que cambian con la hidratación, la comida, el ejercicio reciente y la hora, y son menos precisas en pesos muy altos o muy bajos. Para comparar, mídete en condiciones parecidas (misma hora, antes de entrenar) y mira la tendencia en varios controles.';
  window.METRICAS = { list: M, secs: SECS, get, byKey: Object.fromEntries(M.map((d) => [d.key, d])), DISCLAIMER, BIA_NOTE };
})();
