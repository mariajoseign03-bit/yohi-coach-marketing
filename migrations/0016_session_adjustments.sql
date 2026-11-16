-- Ajustes de sesiones: Yohi suma o descuenta sesiones del plan de un alumno y deja una observación (se avisa por correo).
CREATE TABLE session_adjustments (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id    INTEGER REFERENCES plans(id) ON DELETE SET NULL,
  delta      INTEGER NOT NULL,
  note       TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_session_adjustments_user ON session_adjustments(user_id, id);
