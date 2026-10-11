-- Días dentro de la rutina semanal y observaciones de la alumna por ejercicio

-- Día al que pertenece cada ejercicio ('Lunes', 'Día 1'…). Vacío = rutina sin días.
ALTER TABLE routine_exercises ADD COLUMN day TEXT NOT NULL DEFAULT '';

-- Observación libre de la alumna sobre un ejercicio en una fecha (una por ejercicio y día).
CREATE TABLE IF NOT EXISTS training_notes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exercise_id INTEGER NOT NULL REFERENCES routine_exercises(id) ON DELETE CASCADE,
  logged_on   TEXT    NOT NULL,
  note        TEXT    NOT NULL,
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, exercise_id, logged_on)
);
CREATE INDEX IF NOT EXISTS idx_tnotes_user ON training_notes(user_id, logged_on);

-- Corrige lo cargado antes de esta migración: el día venía pegado en la nota ("Lunes · -").
UPDATE routine_exercises
   SET day   = trim(substr(notes, 1, instr(notes, ' · ') - 1)),
       notes = CASE WHEN trim(substr(notes, instr(notes, ' · ') + 3)) IN ('-', '–', '') THEN ''
                    ELSE trim(substr(notes, instr(notes, ' · ') + 3)) END
 WHERE instr(notes, ' · ') > 0;

-- Un descanso de menos de 10 s no existe en la práctica: era un "1 min" mal leído.
UPDATE routine_exercises SET rest_sec = rest_sec * 60 WHERE rest_sec > 0 AND rest_sec < 10;
