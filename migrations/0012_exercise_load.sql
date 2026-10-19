-- Carga sugerida por ejercicio y unidad de peso (kg o lbs) que elige Yohi. El alumno registra sus pesos en esa unidad.
ALTER TABLE routine_exercises ADD COLUMN target_load TEXT NOT NULL DEFAULT '';
ALTER TABLE routine_exercises ADD COLUMN unit TEXT NOT NULL DEFAULT 'kg';
