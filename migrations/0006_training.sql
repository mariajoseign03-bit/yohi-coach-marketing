-- Rutinas de entrenamiento y registro de sets (training log)

-- Una rutina semanal que Yohi asigna a cada alumna.
-- week_of = lunes de la semana (ej. '2026-10-12').
CREATE TABLE routines (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_of     TEXT    NOT NULL,              -- lunes de la semana
  name        TEXT    NOT NULL DEFAULT '',    -- nombre libre (ej. 'Semana 1 - Tren superior')
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, week_of)
);

-- Cada ejercicio dentro de una rutina, en orden.
CREATE TABLE routine_exercises (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  routine_id  INTEGER NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
  pos         INTEGER NOT NULL DEFAULT 0,     -- orden
  name        TEXT    NOT NULL,               -- 'Press banca'
  sets        INTEGER NOT NULL DEFAULT 3,     -- series de trabajo
  reps        TEXT    NOT NULL DEFAULT '8-12', -- rango de reps
  rest_sec    INTEGER NOT NULL DEFAULT 90,    -- descanso en segundos
  warmup_sets INTEGER NOT NULL DEFAULT 1,     -- series de calentamiento
  notes       TEXT    NOT NULL DEFAULT ''      -- nota libre de Yohi
);

CREATE INDEX idx_rexercises_routine ON routine_exercises(routine_id, pos);

-- Lo que la alumna registra: una fila por serie realizada.
CREATE TABLE training_logs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exercise_id INTEGER NOT NULL REFERENCES routine_exercises(id) ON DELETE CASCADE,
  logged_on   TEXT    NOT NULL,                -- fecha del entrenamiento
  set_type    TEXT    NOT NULL DEFAULT 'work' CHECK (set_type IN ('work','warmup')),
  set_num     INTEGER NOT NULL,                -- número de serie (1, 2, 3…)
  kg          REAL,                            -- peso utilizado
  reps        INTEGER,                         -- reps completadas
  rir         INTEGER,                         -- repeticiones en reserva
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_tlogs_user ON training_logs(user_id, logged_on);
CREATE INDEX idx_tlogs_exercise ON training_logs(exercise_id, logged_on);
