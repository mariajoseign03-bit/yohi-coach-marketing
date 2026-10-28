-- RIR y RPE: Yohi puede dejar un objetivo por ejercicio y el alumno (o Yohi) registra el RPE de cada serie, además del RIR.
ALTER TABLE routine_exercises ADD COLUMN target_rir TEXT NOT NULL DEFAULT '';
ALTER TABLE routine_exercises ADD COLUMN target_rpe TEXT NOT NULL DEFAULT '';
ALTER TABLE training_logs ADD COLUMN rpe REAL;
-- Biseries: un ejercicio marcado así va junto al anterior (misma serie alternada). Varios seguidos forman triserie o circuito.
ALTER TABLE routine_exercises ADD COLUMN superset_prev INTEGER NOT NULL DEFAULT 0;
-- Comentarios de Yohi sobre un ejercicio entrenado (por fecha): el alumno los ve bajo ese ejercicio en su rutina.
CREATE TABLE exercise_comments (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exercise_id INTEGER NOT NULL REFERENCES routine_exercises(id) ON DELETE CASCADE,
  logged_on   TEXT NOT NULL,
  body        TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (exercise_id, logged_on)
);
CREATE INDEX idx_excomments_user ON exercise_comments(user_id, logged_on);
